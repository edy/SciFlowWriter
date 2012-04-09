var db = require('../db/DB').db;
var padManager = require('../db/PadManager');
var authorManager = require('../db/AuthorManager');
var authHandler = require('../handler/AuthHandler');

exports.handler = function (req, res, next) {
	if(authHandler.isLoggedIn(req)) {
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
	} else {
		req.session.redirectAfterLogin = '/invite/'+req.params.id;
		res.redirect('/login', 302);
	}
};