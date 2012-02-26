var db = require('../db/DB');
var everyauth = module.exports = require('everyauth');

// No timeout
everyauth.everymodule.moduleTimeout(-1);

everyauth.debug = true;

// called on every http request
everyauth.everymodule.findUserById( function (userID, callback) {
	db.db.get("user:" + userID, function (err, user) {
		callback(null, user);
	});
});

var sessionID;
var groupID;

// twitter OAuth
everyauth.twitter
	.consumerKey('QZYOC1GTGOElxST7bIwYLg')
	.consumerSecret('VeVauPHGfJqeGgOhpeiYINyVEeJEygug1aPMZpDhdM')
	.findOrCreateUser( function (sess, accessToken, accessSecret, twitUser) {
		var promise = this.Promise(); // async "return" for everyauth
		var userID = "twitter" + twitUser.id;

		// load user from database
		db.db.get('user:'+userID, function (err, user) {
			
			// user does not exist. create a new database entry
			if(user === undefined) {
				console.log('user does not exist. create a new database entry');

				user = {
					'id' : userID, // Ohne user.id funktionierts nicht
					'user_id' : twitUser.id,
					'name' : twitUser.name,
					'screen_name': twitUser.screen_name,
					'image' : twitUser.profile_image_url,
					'url' : twitUser.url,
					'accessToken' : accessToken,
					'accessSecret' : accessSecret
				};
				
				db.db.set('user:'+userID, user);
			}
			
			require('async').parallel({
				// create author
				author: function(callback) {
					require("../db/AuthorManager").createAuthorWithID(userID, user.name, callback);
				},
				// create group
				group: function(callback) {
					require("../db/GroupManager").createGroup(callback);
				}
			}, function(err, result) {
				groupID = result.group.groupID;
				// Session für den eingeloggten benutzer erstellen
				require('../db/SessionManager').createSession(result.group.groupID, result.author.authorID, (new Date()).getTime() + 360000, function (err, result) {
					sessionID = result.sessionID;
					promise.fulfill(user);
				});
			});
		});

		return promise;
	})
	.sendResponse(function(res, data) {
		// create group pad and redirect user to his new pad
		require("../db/GroupManager").createGroupPad(groupID, 'welcome', 'Welcome, ' + data.user.name, function(err, result) {
			var p = '/p/' + result.padID;
			res.cookie('sessionID', sessionID, {
				path: p
			});
			res.redirect(p);
		});
	});