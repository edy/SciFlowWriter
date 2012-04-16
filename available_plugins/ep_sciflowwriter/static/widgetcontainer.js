var eejs = require('ep_etherpad-lite/node/eejs');

// insert the widget container
exports.eejsBlock_body = function(hook_name, args, cb) {
	args.content = 
		eejs.require("ep_sciflowwriter/templates/header.html") + 
		eejs.require("ep_sciflowwriter/templates/widgetcontainer.html") + 
		args.content;
	return cb();
};

// insert widgets style sheet
exports.eejsBlock_styles = function(hook_name, args, cb) {
	args.content = args.content + '<link rel="stylesheet" type="text/css" href="/static/plugins/ep_sciflowwriter/static/css/widgets.css">';
	return cb();
};

exports.eejsBlock_exportColumn = function(hook_name, args, cb) {
	args.content = args.content + '<a id="exportlatexa" target="_blank" class="exportlink"><div class="exporttype" id="exportlatex">LaTeX file</div></a>';
	return cb();
};