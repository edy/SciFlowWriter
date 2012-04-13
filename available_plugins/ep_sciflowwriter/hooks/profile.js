var path = require('path');
var eejs = require('ep_etherpad-lite/node/eejs');
var profileHandler = require('../handler/ProfileHandler');

exports.expressCreateServer = function (hook_name, args, cb) {

	//serve profile.html under /
	args.app.get('/', function(req, res)
	{	
		res.send(eejs.require("ep_sciflowwriter/templates/profile.html"), { maxAge: 0 });
	});

	args.app.get('/profile/:action?', profileHandler.handler);
};