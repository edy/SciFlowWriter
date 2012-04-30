var eejs = require('ep_etherpad-lite/node/eejs');
var padManager = require('ep_sciflowwriter/db/PadManager');
var authorManager = require('ep_sciflowwriter/db/AuthorManager');
var inviteHandler = require('ep_sciflowwriter/handler/InviteHandler');
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
	// don't listen for messages from other widgets
	if (args.query.widget_name !== 'ep_widget_authors') return;

	// listen for 'getPadAuthors'
	if (args.query.action === 'getPadAuthors') {
		// need padID
		if (!args.query.padID) return;

		padManager.getPadUsers(args.query.padID, function(padAccess) {
			var result = {
				'padID': args.query.padID,
				'widget_name': 'ep_widget_authors',
				'action': 'getPadAuthors',
				'result': []
			};
			
			async.forEach(padAccess.user, function(authorID, callback){
				authorManager.getAuthor(authorID, function(err, author) {
					result.result.push(author);	

					callback();
				});
			}, function(err){
				args.socket.emit('widget-message', result);
			});
		});
	} else if (args.query.action === 'inviteUser') {
		if (!args.socket.handshake.session && !args.socket.handshake.session.auth && !args.socket.handshake.session.auth.userId) {
			console.error('ep_widget_authors:onWidgetMessage error: no userId given');
			return;
		};

		//console.error('handshake', args.socket.handshake);

		var host = args.socket.handshake.headers.host;
		var authorID = args.socket.handshake.session.auth.userId;
		var padID = args.query.padID;
		var email = args.query.value.email;

		// need email
		if (!email) {
			cosole.error('no email given');
			return;
		};

		// need padID
		if (!padID) {
			cosole.error('no padID given');
			return;
		};

		inviteHandler.sendInvite(padID, authorID, email, host, function receiveInviteUrl(err, url) {
			if (err) {
				console.error('sendinvite error:', err);
				return;
			}

			var result = {
				'padID': padID,
				'widget_name': 'ep_widget_authors',
				'action': 'inviteUser',
				'result': url
			};
			args.socket.emit('widget-message', result);
		});
	}

	
};