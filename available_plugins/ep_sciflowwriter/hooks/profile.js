var path = require('path');
var eejs = require('ep_etherpad-lite/node/eejs');
var profileHandler = require('../handler/ProfileHandler');

exports.expressCreateServer = function (hook_name, args, cb) {

	//serve profile.html under /
	args.app.get('/', function(req, res)
	{	
		var filePath = path.normalize(__dirname + "/../templates/profile.html");
		res.send(eejs.require(filePath), { maxAge: 0 });
	});

	args.app.get('/profile/:action?', profileHandler.handler);
};