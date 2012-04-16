var eejs = require('ep_etherpad-lite/node/eejs');

// load widget
exports.eejsBlock_widgetColumn = function (hook_name, args, cb) {
	args.content = args.content + eejs.require("ep_widget_authors/templates/widget.html");
	return cb();
};

// load widget style sheet
exports.eejsBlock_styles = function(hook_name, args, cb) {
	args.content = args.content + '<link rel="stylesheet" type="text/css" href="/static/plugins/ep_widget_authors/static/css/widget.css">';
	return cb();
};

exports.onWidgetMessage = function (hook_name, args, cb) {
	// if widget_name != ep_widget_authors => abort 
	console.error('received widget-message from widget:', args.query);
	args.socket.emit('widget-message', 'hello widget!');
};