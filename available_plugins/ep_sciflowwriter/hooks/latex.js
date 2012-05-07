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
				db.getSub("pad:" + padID, ["head"], function(err, result) {
					sendViewPdf(result);
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
				db.getSub("pad:" + padID, ["head"], function(err, result) {
					generate(result);
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
		db.getSub("pad:" + req.params.pad, ["head"], function(err, result) {
			res.send({'padID': req.params.pad,'revision': result});
		});
	});
};

function generatePdfLatex(padID, revision, cb) {
	// path => var/pdflatex/padId/rev123
	var exportPath = 'var/pdflatex/' + padID + '/rev' + revision;
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
			db.get('padmetadata:'+padID, function(err, metadata) {
				if (metadata) {
					templateVariables.metadata = metadata;
				}
				
				callback(err, templateVariables);
			});
		},
		// generate latex file
		function(templateVariables, callback) {
			console.log('generate latex file');

			var template = eejs.require('ep_sciflowwriter/latex_templates/basic/template.tex', templateVariables);

			// write export to file
			fs.writeFile(exportPath+'/latex.tex', template, function(err) {
				console.log('write template to file '+exportPath+'/latex.tex', err);
				callback(err, templateVariables);
			});
		},

		// serialize references to bibtex
		function(templateVariables, callback) {
			var bibtex = [];
			db.get('padreferences:'+padID, function(err, references) {
				if (references) {
					references.forEach(function(ref){
						bibtex.push('@' + ref.type + '{' + ref.id + ',');
						bibtex.push(ref.title !== '' ? '    title = {' + ref.title + '},' : '');
						bibtex.push(ref.authors !== '' ? '    author = {' + ref.authors + '},' : '');
						// TODO!!! :-)
						bibtex.push('    year = {2012}');
						bibtex.push('}');
					});

					templateVariables.references = bibtex.join("\n");
				}

				fs.writeFile(exportPath+'/pad.bib', templateVariables.references, encoding='utf8', function(err) {
					callback(err, templateVariables);
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