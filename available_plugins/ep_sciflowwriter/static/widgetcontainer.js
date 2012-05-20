var eejs = require('ep_etherpad-lite/node/eejs');
var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');
var authHandler = require('ep_sciflowwriter/handler/AuthHandler');

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
	args.content = args.content + '<link rel="stylesheet" type="text/css" href="/static/plugins/ep_sciflowwriter/static/css/bootstrap.css">';
	args.content = args.content + '<link rel="stylesheet" type="text/css" href="/static/plugins/ep_sciflowwriter/static/css/widgets.css">';
	return cb();
};

exports.eejsBlock_scripts = function(hook_name, args, cb) {
	args.content = args.content + '<script src="/static/plugins/ep_sciflowwriter/static/js/bootstrap-modal.js"></script>';
	return cb();
};

exports.eejsBlock_exportColumn = function(hook_name, args, cb) {
	args.content = args.content +
	'<a id="exportlatexa" target="_blank" class="exportlink"><div class="exporttype" id="exportlatex">LaTeX file</div></a>' +
	'<a id="exportpdflatexa" target="_blank" class="exportlink"><div class="exporttype" id="exportpdflatex">PDFLaTeX file</div></a>';
	return cb();
};

exports.socketio = function (hook_name, args, cb) {
	var io = args.io;
	
	// does the user has access to pad widgets?
	io.of("/widgets").authorization(function (handshake, callback) {
		var padID;
		var userID;

		// the browser must send a referer
		if (!handshake.headers.referer || handshake.headers.referer === null || handshake.headers.referer === '') {
			return callback('Your browser seems to block referers. Sorry, no access for you!', false);
		}
		
		// user must be logged in
		if (!handshake.session || !handshake.session.auth || !handshake.session.auth.userId) {
			console.warn('user is not logged in');
			return callback('User is not logged in', false);
		}

		userID = handshake.session.auth.userId;
		padID = new RegExp(/.*\/p\/([^\/]+)/).exec(handshake.headers.referer)[1];
		
		// check if user has access to pad
		// if not, bye bye
		authHandler.hasPadAccess(padID, userID, function(err, hasAccess) {
			handshake.padID = padID; // save the padID for later use
			callback(null, hasAccess);
		});
	}).on('connection', function (socket) {
		socket.join(socket.handshake.padID);
		socket.on("widget-message", function (query) {
			console.log('query:', query);
			// 
			/*
				query muss enthalten:
					* padID
					* widget name
					* action (welche infos werden benötigt? was soll passieren?)
					  * get, set
					* value (was will man haben? was soll gespeichert werden?)
			*/
			hooks.callAll('onWidgetMessage', {'socket': socket, 'query': query});
		});
	});
};
