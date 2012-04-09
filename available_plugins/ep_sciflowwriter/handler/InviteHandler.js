var db = require('ep_etherpad-lite/node/db/DB').db;
var padManager = require('ep_etherpad-lite/node/db/PadManager');
var authorManager = require('ep_etherpad-lite/node/db/AuthorManager');
var authHandler = require('../handler/AuthHandler');

exports.handler = function (req, res, next) {
	db.get("padinvite:" + req.params.id, function(err, invite){
		if (!invite) {
			res.send('invalid id', 500);
			return;
		}

		padManager.addUserToPad(req.user.id, invite.pad, function(){
			authorManager.addPad(req.user.id, invite.type, invite.pad, function(){
				res.redirect('/p/'+invite.pad);
			});
		});
	});
};