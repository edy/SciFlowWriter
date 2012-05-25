var eejs = require('ep_etherpad-lite/node/eejs');

// disable etherpad chat
exports.eejsBlock_body = function(hook_name, args, cb) {
	args.content = args.content.replace(/id\=\"chat/g, 'id="oldchat');
	args.content = args.content.replace(/id\=\"newchat/g, 'id="chat');
	return cb();
};

// load widget
exports.eejsBlock_widgetColumn = function (hook_name, args, cb) {
	args.content = args.content + eejs.require("ep_widget_chat/templates/widget.html");
	return cb();
};

// load widget style sheet
exports.eejsBlock_styles = function(hook_name, args, cb) {
	args.content = args.content + '<link rel="stylesheet" type="text/css" href="/static/plugins/ep_widget_chat/static/css/widget.css">';
	return cb();
};