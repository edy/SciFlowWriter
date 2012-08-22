var db = require('ep_etherpad-lite/node/db/DB').db;
var padManager = require('../db/PadManager');
var authorManager = require('../db/AuthorManager');
var authHandler = require('../handler/AuthHandler');
var randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
var emailjs = require('ep_sciflowwriter/node_modules/emailjs');
var settings = require('ep_etherpad-lite/node/utils/Settings');

exports.handler = function (req, res, next) {
	if(authHandler.isLoggedIn(req)) {
		db.get("padinvite:" + req.params.id, function(err, invite){
	
			if (!invite) {
				res.send('invalid invite id', 500);
				return;
			}

			padManager.addUserToPad(req.user.id, invite.pad, function(){
				authorManager.addPad2(req.user.id, invite.type, invite.pad, function(){
					// remove the invite id since the user has pad access now
					db.remove("padinvite:" + req.params.id);
					res.redirect('/p/'+invite.pad);
				});
			});
		});
	} else {
		res.cookie('redirectafterlogin', '/invite/'+req.params.id, {'path': '/'});
		res.redirect('/login', 302);
	}
};

exports.sendInvite = function (padID, authorID, email, host, callback) {
	padManager.doesPadExists(padID, function(err, value) {
		
		if (!value) {
			callback("Pad '"+ padID +"' does not exist");
			return;
		}

		var inviteID = randomString(16);
		var url = 'http://'+host+'/invite/'+inviteID;

		var inviteObject = {
			pad: padID,
			type: 'other',
			user: authorID,
			timestamp: Date.now()
		};

		db.set("padinvite:" + inviteID, inviteObject);

		var emailServer  = emailjs.server.connect({
			user: settings.email.user, 
			password: settings.email.password, 
			host: settings.email.host, 
			ssl: settings.email.ssl
		});

		emailServer.send({
			text: url, 
			from: settings.email.from, 
			to: email,
			subject: "SciFlowWriter invitation"
		}, function(err, message) {
			if (err) console.error(err);
			//else console.log(message);
		});

		callback(null, url);
	});
};