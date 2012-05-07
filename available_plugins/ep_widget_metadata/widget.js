var eejs = require('ep_etherpad-lite/node/eejs');
var padManager = require('ep_sciflowwriter/db/PadManager');
var authorManager = require('ep_sciflowwriter/db/AuthorManager');
var inviteHandler = require('ep_sciflowwriter/handler/InviteHandler');
var async = require('ep_etherpad-lite/node_modules/async');
var randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
var db = require("ep_etherpad-lite/node/db/DB").db;

// add modal to the bottom of the page
exports.eejsBlock_body = function(hook_name, args, cb) {
	args.content = args.content + eejs.require("ep_widget_metadata/templates/modal.html");
	return cb();
};

// load widget
exports.eejsBlock_widgetColumn = function (hook_name, args, cb) {
	args.content = args.content + eejs.require("ep_widget_metadata/templates/widget.html");
	return cb();
};

// load widget style sheet
exports.eejsBlock_styles = function(hook_name, args, cb) {
	args.content = args.content + '<link rel="stylesheet" type="text/css" href="/static/plugins/ep_widget_metadata/static/css/widget.css">';
	return cb();
};

exports.onWidgetMessage = function (hook_name, args, cb) {
	// don't listen for messages from other widgets
	if (args.query.widget_name !== 'ep_widget_metadata') return;

	// listen for 'setMetadata'
	if (args.query.action === 'setMetadata') {
		var metadata = {
			title: args.query.value.title,
			subtitle: args.query.value.subtitle,
			abstract: args.query.value.abstract,
		};

		padManager.getPad(args.query.padID, function(err, pad) {
			pad.setData('metadata', metadata);
		});

		var result = {
			'padID': args.query.padID,
			'widget_name': 'ep_widget_metadata',
			'action': 'setMetadata',
			'result': metadata
		};

		args.socket.emit('widget-message', result);
		args.socket.broadcast.emit('widget-message', result);
		return cb();
	} else if (args.query.action === 'getMetadata') {
		console.log('getMetadata');
		padManager.getPad(args.query.padID, function(err, pad) {
			pad.getData('metadata', function(metadata) {
				if (metadata) {
					var result = {
						'padID': args.query.padID,
						'widget_name': 'ep_widget_metadata',
						'action': 'setMetadata',
						'result': metadata
					};
					args.socket.emit('widget-message', result);
				}
			});
		});

		return cb();
	}
};