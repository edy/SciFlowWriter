var eejs = require('ep_etherpad-lite/node/eejs');
var async = require('ep_etherpad-lite/node_modules/async');
var fs = require('fs');
var path = require('path');
var mkdirp = require('ep_sciflowwriter/node_modules/mkdirp');
var exportLatex = require('../utils/ExportLatex');
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

		// generate latex file
		function(latex, callback) {
			console.log('generate export file');
			var templateVariables = {
				latexFilePath: exportPath + '/latex.tex'
			};

			var template = eejs.require('ep_sciflowwriter/latex_templates/basic/template.tex', {
				'latexExport': latex
			});

			// replace < and >
			template = template.replace(/&lt;/g, '<');
			template = template.replace(/&gt;/g, '>');

			// write export to file
			fs.writeFile(templateVariables.latexFilePath, template, function(err) {
				console.log('write template to file '+templateVariables.latexFilePath, err);
				callback(err, templateVariables);
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
					callback(null, exportPath+'/latex.pdf');
			});
			
		}
	], function(err, result) {
		if(err) ERR(err);
		cb(err, result);
	});
	
}