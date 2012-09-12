var path = require('path');
var eejs = require('ep_etherpad-lite/node/eejs');
var authHandler = require('../handler/AuthHandler');
var DirtyStore = require('../db/DirtyStore');
var express = require('ep_etherpad-lite/node_modules/express');

exports.expressConfigure = function (hook_name, args, cb) {

	// everyauth middleware
	args.app.use(authHandler.middleware());

	// check if user is logged in
	args.app.use(authHandler.loginRedirect);

	// check if user has access to pad
	args.app.get('/p/:pad', authHandler.hasPadAccessMiddleware);

	// serve the login page
	args.app.get('/login', function(req, res) {
		if (authHandler.isLoggedIn(req)) {
			res.send('you are logged in');
		} else {
			var filePath = path.normalize(__dirname + "/../templates/login.html");
			res.send(eejs.require(filePath), { maxAge: 0 });
		}
	});
};