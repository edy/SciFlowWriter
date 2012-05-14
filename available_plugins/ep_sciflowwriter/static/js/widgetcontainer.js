var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');
var socket;

// set global variable for widget data
// we need this for editing widget data without reloading from server
window._sfw = {};

// Add widget container to pad after ace inits
exports.postAceInit = function (hook_name, args, cb) {
	socket = io.connect().of("/widgets");
	hooks.callAll('loadWidgets', {'socket': socket});

	// latex & pdflatex export
	var pad_root_path = new RegExp(/.*\/p\/[^\/]+/).exec(document.location.pathname)
	var pad_root_url = document.location.href.replace(document.location.pathname, pad_root_path)
	$("#exportlatexa").attr("href", pad_root_path + "/export/latex");
	$("#exportpdflatexa").attr("href", pad_root_path + "/export/pdflatex");
};