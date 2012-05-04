var eejs = require('ep_etherpad-lite/node/eejs');
var async = require('ep_etherpad-lite/node_modules/async');
var fs = require('fs');
var path = require('path');
var mkdirp = require('ep_sciflowwriter/node_modules/mkdirp');
var exportLatex = require('../utils/ExportLatex.js');
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
			res.send(eejs.require("ep_sciflowwriter/templates/view_pdf.html"), { maxAge: 0 });
		} else if (req.params.type === 'pdflatexrendered') {
			console.log('request: pdflatexrendered');
			generatePdfLatex(padID, revision, function(err, pdfPath) {
				res.contentType('application/pdf');
				res.header('Content-Disposition', 'inline; filename='+padID+'_rev'+((revision !== null) ? 'rev'+revision : 'latest')+'.pdf'); 
				res.sendfile(pdfPath);
			});
		} else {
			next();
			return;
		}
	});
};

function generatePdfLatex(padID, revision, cb) {
	// path => var/pdflatex/padId/rev123
	var exportPath = 'var/pdflatex/' + padID + '/' + ((revision !== null) ? 'rev'+revision : 'latest');
	console.log('exportPath:', exportPath);
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