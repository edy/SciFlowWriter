var eejs = require('ep_etherpad-lite/node/eejs');
var async = require('ep_etherpad-lite/node_modules/async');
var fs = require('fs');
var path = require('path');
var mkdirp = require('ep_sciflowwriter/node_modules/mkdirp');
var exportLatex = require('../utils/ExportLatex');
var padManager = require('../db/PadManager');
var authorManager = require('../db/AuthorManager');
var db = require('ep_etherpad-lite/node/db/DB').db;
var ERR = require("ep_etherpad-lite/node_modules/async-stacktrace");
var spawn = require("child_process").spawn;

exports.expressCreateServer = function (hook_name, args, cb) {
	args.app.get('/p/:pad/:rev?/export/:type', function(req, res, next) {
		// go to next route if export isn't latex or pdflatex
		if (["latex", "pdflatex", "pdflatexrendered"].indexOf(req.params.type) == -1) {
			next();
			return;
		}

		var padID = req.params.pad;
		var revision = req.params.rev ? req.params.rev : null;

		if(req.params.type === 'latex') {
			exportLatex.getPadLatexDocument(padID, revision, function(err, result) {
				res.contentType('plain/text');
				res.send(result);
			});
		} else if (req.params.type === 'pdflatex') {
			var sendViewPdf = function(revision) {
				res.send(eejs.require("ep_sciflowwriter/templates/view_pdf.html", {
					'pdfUrl': '/p/' + padID + '/' + revision + '/export/pdflatexrendered',
					'revision': revision,
					'padID': padID
				}), { maxAge: 0 });
			};
			// get latest revision number if none given
			if (revision === null) {
				getLatestRevisionNumber(padID, function(err, revision) {
					sendViewPdf(revision);
				});
			} else {
				sendViewPdf(revision);
			}

		} else if (req.params.type === 'pdflatexrendered') {
			var generate = function(revision) {
				generatePdfLatex(padID, revision, function(err, pdfPath) {
					res.contentType('application/pdf');
					// must be inline, because of google chrome
					res.header('Content-Disposition', 'inline; filename=' + padID + '_rev' + revision + '.pdf'); 
					res.sendfile(pdfPath);
				});
			};

			// get latest revision number if none given
			if (revision === null) {
				getLatestRevisionNumber(padID, function(err, revision) {
					generate(revision);
				});
			} else {
				generate(revision);
			}
		} else {
			next();
			return;
		}
	});

	// get the latest revision number of the pad
	args.app.get('/p/:pad/latestrevisionnumber', function(req, res, next) {
		getLatestRevisionNumber(req.params.pad, function(err, result) {
			res.send({'padID': req.params.pad,'revision': result});
		});
	});
};

function getLatestRevisionNumber(padID, callback) {
	db.getSub("pad:" + padID, ["head"], callback);
}

function generatePdfLatex(padID, revision, cb) {
	// path => var/pdflatex/padId/rev123
	var exportPath = 'var/pads/' + padID + '/pdflatex/rev' + revision;
	console.log('exportPath:', exportPath);

	// first check if pdf is already there
	if(path.existsSync(exportPath+'/latex.pdf')) {
		cb(null, exportPath+'/latex.pdf');
		return;
	}

	async.waterfall([
		// create directories
		function(callback) {
			console.log('create directiries');

			mkdirp(exportPath, function(err){
				callback(err);
			})
		},

		// get latex export
		function(callback) {
			console.log('get latex export');
			exportLatex.getPadLatexDocument(padID, revision, callback);
		},

		// get pad users
		function(latex, callback) {
			console.log('get pad users');
			var templateVariables = {
				'latexExport': latex,
				'users': [],
				'metadata': {},
				'references': '',
				'subtitle': '',
				'abstract': ''
			};

			padManager.getPadUsers(padID, function(padAccess) {
				var users = [];
				
				async.forEach(padAccess.user, function(authorID, callback){
					authorManager.getAuthor(authorID, function(err, author) {
						templateVariables.users.push({
							name: author.name,
							email: author.email || undefined
						});	

						callback();
					});
				}, function(err){
					callback(err, templateVariables);
				});
			});
		},

		// get pad metadata
		function(templateVariables, callback) {
			console.log('get pad metadata');
			padManager.getPad(padID, function(err, pad) {
				pad.getData('metadata', function(metadata) {
					if (metadata) {
						templateVariables.metadata = metadata;
					}
					
					callback(err, templateVariables);
				});
			});
		},

		// generate latex file
		function(templateVariables, callback) {
			console.log('generate latex file');
			var templateName = templateVariables.metadata.template || 'ieee';
			var template = eejs.require('ep_sciflowwriter/latex_templates/' + templateName + '/template.tex', templateVariables);

			// write export to file
			fs.writeFile(exportPath+'/latex.tex', template, function(err) {
				console.log('write template to file '+exportPath+'/latex.tex', err);
				
			});

			// create symlinks
			fs.readdir('node_modules/ep_sciflowwriter/latex_templates/' + templateName, function(err, files) {
				async.forEach(files, function(file, callback) {
					// don't symlink hidden files
					if (file.substring(0,1) === '.') {
						return callback(null);
					}

					var target = exportPath + '/' + file;
					var path = 'node_modules/ep_sciflowwriter/latex_templates/' + templateName + '/' + file;
					fs.symlink(path, target, function(err) {
						callback(null);
					});
				}, function (err) {
					callback(err, templateVariables);
				});
			});
		},

		// serialize references to bibtex
		function(templateVariables, callback) {
			console.log('serialize references to bibtex');
			var bibtex = [];
			padManager.getPad(padID, function(err, pad) {
				pad.getData('references', function(references) {
					if (references) {
						for(var ref in references) {
							bibtex.push('@' + references[ref].type + '{' + references[ref].id + ',');
							bibtex.push(references[ref].title !== '' ? '    title = {' + references[ref].title + '},' : '');
							bibtex.push(references[ref].authors !== '' ? '    author = {' + references[ref].authors + '},' : '');
							bibtex.push(references[ref].url !== '' ? '    url = {' + references[ref].url + '},' : '');
							bibtex.push(references[ref].year !== '' ? '    year = {' + references[ref].year + '},' : '');
							bibtex.push(references[ref].month !== '' ? '    month = {' + references[ref].month + '},' : '');
							bibtex.push(references[ref].publisher !== '' ? '    publisher = {' + references[ref].publisher + '},' : '');
							bibtex.push(references[ref].journal !== '' ? '    journal = {' + references[ref].journal + '},' : '');
							bibtex.push('}');
						};

						templateVariables.references = bibtex.join("\n");
					}

					fs.writeFile(exportPath+'/pad.bib', templateVariables.references, encoding='utf8', function(err) {
						callback(err, templateVariables);
					});
				});
			});
		},

		// generate pdf
		function(templateVariables, callback) {
			console.log('generate pdf file');
			
			var pdflatexParameters = ['-no-file-line-error', '-interaction=batchmode', 'latex.tex'];
			
			async.series([
				// first run
				function(callback) {
					spawn('pdflatex', ['-draftmode'].concat(pdflatexParameters), { cwd : exportPath }).on('exit', function(returnCode) {
						callback(null);
					});
				},

				// bibtex run
				function(callback) {
					spawn('bibtex', ['latex'], { cwd : exportPath }).on('exit', function(returnCode) {
						callback(null);
					});
				},

				// second run
				function(callback) {
					spawn('pdflatex', ['-draftmode'].concat(pdflatexParameters), { cwd : exportPath }).on('exit', function(returnCode) {
						callback(null);
					});
				},

				// last run
				function(callback) {
					spawn('pdflatex', pdflatexParameters, { cwd : exportPath }).on('exit', function(returnCode) {
						callback(null);
					});
				}], function(err) {
					callback(err, exportPath+'/latex.pdf');
			});
			
		}
	], function(err, result) {
		if(err) ERR(err);
		cb(err, result);
	});
	
}