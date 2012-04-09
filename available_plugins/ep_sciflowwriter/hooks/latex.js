var path = require('path');
var exportLatex = require("../utils/ExportLatex.js");

exports.expressCreateServer = function (hook_name, args, cb) {
	args.app.get('/p/:pad/:rev?/export/:type', function(req, res, next) {
		// go to next route if export isn't latex or pdflatex
		if (["latex", "pdflatex"].indexOf(req.params.type) == -1) {
			next();
			return;
		}

		exportLatex.getPadLatexDocument(req.params.pad, null, function(err, result) {
			res.send(result);
		});
	});
};