var path = require('path');
var eejs = require('ep_etherpad-lite/node/eejs');
var profileHandler = require('../handler/ProfileHandler');

exports.expressCreateServer = function (hook_name, args, cb) {

	//serve profile.html under /
	args.app.get('/', function(req, res)
	{	
		var user = req.user || {};
		var profile = {
			id: user.id,
			name: user.name,
			email: user.email || '',
			image: user.auth.image || '',
			url: user.auth.url || '',
			pads: user.pads
		};

		res.send(eejs.require("ep_sciflowwriter/templates/profile.html", {'user': profile}), { maxAge: 0 });
	});

	args.app.get('/profile/:action?', profileHandler.handler);
};