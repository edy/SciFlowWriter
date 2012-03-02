var db = require('../db/DB').db;
var everyauth = module.exports = require('everyauth');
var CommonCode = require('../utils/common_code');
var randomString = CommonCode.require('/pad_utils').randomString;
var async = require('async');

// No timeout
everyauth.everymodule.moduleTimeout(-1);

everyauth.debug = true;

// called on every http request
everyauth.everymodule.findUserById( function (userID, callback) {
	console.log('findUserById');
	require("../db/AuthorManager").getAuthor(userID, function(err, author){
		callback(null, author);
	});
});

everyauth.everymodule.logoutPath('/logout');
everyauth.everymodule.logoutRedirectPath('/login');

var sessionID;
var groupID;

// twitter OAuth
everyauth.twitter
	.consumerKey('QZYOC1GTGOElxST7bIwYLg')
	.consumerSecret('VeVauPHGfJqeGgOhpeiYINyVEeJEygug1aPMZpDhdM')
	.handleAuthCallbackError( function (req, res) {
		console.log('handleAuthCallbackError');
		res.send('access denied');
	})
	.findOrCreateUser( function (sess, accessToken, accessSecret, twitUser, reqres) {
		console.log('findOrCreateUser');
		
		var token;

		if (reqres.req.cookies && reqres.req.cookies.token) {
			token = reqres.req.cookies.token;
		}

		// create new token if it not exists
		if (!token) {
			token = 't.' + randomString();
			reqres.res.cookie('token', token, {path: '/'});
		}

		// load author
		var promise = this.Promise();
		async.waterfall([
			// first get author from token
			function(callback) {
				require("../db/AuthorManager").getAuthor4Token(token, function(err, author){
					callback(null, author);
				});
			},
			// load author object
			function(authorID, callback) {
				require("../db/AuthorManager").getAuthor(authorID, function(err, author){
					callback(null, authorID, author);
				});
			},
			// generate auth object if necessary
			function(authorID, author, callback) {
				if (!author.id) {
					author.id = authorID;
					author.name = twitUser.name;
					author.auth = {
						'user_id' : twitUser.id,
						'screen_name': twitUser.screen_name,
						'image' : twitUser.profile_image_url,
						'url' : twitUser.url,
						'accessToken' : accessToken,
						'accessSecret' : accessSecret
					};

					db.set("globalAuthor:" + authorID, author);
				}

				callback(null, author);
			},
			// create a group
			function(author, callback) {
				require("../db/GroupManager").createGroup(function(err, group){
					groupID = group.groupID;
					callback(null, author, groupID);
				});
			},
			// create a user session for the group
			function(author, groupID, callback) {
				require('../db/SessionManager').createSession(groupID, author.id, (new Date()).getTime() + 3600000, function (err, result) {
					sessionID = result.sessionID;
					callback(null, author);
				});
			}
		], function(err, result) {
			promise.fulfill(result);
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