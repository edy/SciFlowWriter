var eejs = require('ep_etherpad-lite/node/eejs');
var padManager = require('ep_etherpad-lite/node/db/PadManager');
var authorManager = require('ep_etherpad-lite/node/db/AuthorManager');
var async = require('ep_etherpad-lite/node_modules/async');

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
	padManager.getPadUsers(args.query.padID, function(padAccess) {
		var users = [];
		
		async.forEach(padAccess.user, function(authorID, callback){
			authorManager.getAuthor(authorID, function(err, author) {
				users.push(author);	

				callback();
			});
		}, function(err){
			args.socket.emit('widget-message', users);
		});
	});
};