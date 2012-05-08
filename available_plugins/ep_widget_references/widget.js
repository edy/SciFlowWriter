var eejs = require('ep_etherpad-lite/node/eejs');
var padManager = require('ep_sciflowwriter/db/PadManager');
var authorManager = require('ep_sciflowwriter/db/AuthorManager');
var inviteHandler = require('ep_sciflowwriter/handler/InviteHandler');
var async = require('ep_etherpad-lite/node_modules/async');
var randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
var db = require("ep_etherpad-lite/node/db/DB").db;

// add modal to the bottom of the page
exports.eejsBlock_body = function(hook_name, args, cb) {
	args.content = args.content + eejs.require("ep_widget_references/templates/modal.html");
	return cb();
};

// load widget
exports.eejsBlock_widgetColumn = function (hook_name, args, cb) {
	args.content = args.content + eejs.require("ep_widget_references/templates/widget.html");
	return cb();
};

// load widget style sheet
exports.eejsBlock_styles = function(hook_name, args, cb) {
	args.content = args.content + '<link rel="stylesheet" type="text/css" href="/static/plugins/ep_widget_references/static/css/widget.css">';
	return cb();
};

exports.onWidgetMessage = function (hook_name, args, cb) {
	// don't listen for messages from other widgets
	if (args.query.widget_name !== 'ep_widget_references') return;

	
	// listen for 'setMetadata'
	if (args.query.action === 'setReference') {
		var reference = {
			id: randomString(16),
			type: args.query.value.type,
			title: args.query.value.title,
			authors: args.query.value.authors
		};

		padManager.getPad(args.query.padID, function(err, pad) {
			pad.getData('references', function(references) {

				if (references) {
					references.push(reference);
				} else {
					references = [reference];
				}

				pad.setData('references', references);

				var result = {
					'padID': args.query.padID,
					'widget_name': 'ep_widget_references',
					'action': 'setReferences',
					'result': references
				};
				args.socket.emit('widget-message', result);
				args.socket.broadcast.to(args.query.padID).emit('widget-message', result);
				return cb();
			});
		});

	} else if (args.query.action === 'getReferences') {
		console.log('getReferences');
		padManager.getPad(args.query.padID, function(err, pad) {
			pad.getData('references', function(references) {
				if (references) {
					var result = {
						'padID': args.query.padID,
						'widget_name': 'ep_widget_references',
						'action': 'setReferences',
						'result': references
					};
					args.socket.emit('widget-message', result);
				}
				
				return cb();
			});
		});
	} else if (args.query.action === 'deleteReference') {
		console.log('deleteReference');
		padManager.getPad(args.query.padID, function(err, pad) {
			pad.getData('references', function(references) {
				if (references) {
					var id = args.query.value.id
					references.every(function(reference, i){
						if (reference.id === id) {
							references.splice(i, 1);
							return false;
						}

						return true;
					});
					
					pad.setData('references', references);
					
					var result = {
						'padID': args.query.padID,
						'widget_name': 'ep_widget_references',
						'action': 'setReferences',
						'result': references
					};
					args.socket.emit('widget-message', result);
					args.socket.broadcast.to(args.query.padID).emit('widget-message', result);
				}
				
				return cb();
			});
		});
	}
	
};