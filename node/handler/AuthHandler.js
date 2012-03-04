var db = require('../db/DB').db;
var everyauth = module.exports = require('everyauth');
var CommonCode = require('../utils/common_code');
var settings = require('../utils/Settings');
var randomString = CommonCode.require('/pad_utils').randomString;
var async = require('async');
var authorManager = require('../db/AuthorManager');
var groupManager = require('../db/GroupManager');
var sessionManager = require('../db/SessionManager');
var sessionID;

// TODO diese methode gehört hier nicht hin
authorManager.setAuthor = function(authorID, author, callback) {
	db.set("globalAuthor:" + authorID, author);
	callback(null, author);
}

everyauth.debug = settings.auth.debug;
everyauth.everymodule.moduleTimeout(settings.auth.timeout);
everyauth.everymodule.logoutPath('/logout');
everyauth.everymodule.logoutRedirectPath('/login');

// called on every http request
everyauth.everymodule.findUserById( function (userID, callback) {
	console.log('findUserById');
	authorManager.getAuthor(userID, function(err, author){
		callback(null, author);
	});
});

// twitter OAuth
everyauth.twitter
	.consumerKey(settings.auth.twitter.consumerKey)
	.consumerSecret(settings.auth.twitter.consumerSecret)
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
				authorManager.getAuthor4Token(token, function(err, authorID){
					callback(null, authorID);
				});
			},
			// load author object
			function(authorID, callback) {
				authorManager.getAuthor(authorID, function(err, author){
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

					authorManager.setAuthor(authorID, author, callback);
				}

				callback(null, author);
			},
			// create a group
			function(author, callback) {
				if (!author.groupID) {
					groupManager.createGroup(function(err, group){
						author.groupID = group.groupID
						authorManager.setAuthor(author.id, author, callback);
					});
				} else {
					callback(null, author);
				}
			},
			// create a user session for the group
			function(author, callback) {
				sessionManager.createSession(author.groupID, author.id, (new Date()).getTime() + 3600000, function (err, result) {
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
		groupManager.createGroupPad(data.user.groupID, 'welcome', 'Welcome, ' + data.user.name, function(err, result) {
			var p = '/p/' + result.padID;
			res.cookie('sessionID', sessionID, {
				path: p
			});
			res.redirect(p);
		});
	});

// checks if the user is logged in
everyauth.isLoggedIn = function (req) {
	return Boolean(req.user);
};

// checks if requested url is in allowed paths
everyauth.isAllowedPath = function (url) {
	var isAllowedPath = false;

	// regex paths
	var allowedPaths = [
		'\/favicon.ico',
		'\/login',
		'\/static\/.*',
		'\/minified\/.*'
	];

	allowedPaths.every(function(path){
		if (url.match('^'+path+'$')) {
			isAllowedPath = true;
			return false;
		}

		return true;
	});

	return isAllowedPath;
};

// express middleware to redirect not logged in users
everyauth.loginRedirect = function (req, res, next) {
	console.log('URL:', req.url);
	if (everyauth.isLoggedIn(req)) {
	  console.log('logged in');
	  next();
	  return;
	}
	
	if (!everyauth.isAllowedPath(req.url)) {
		console.log('not allowed path');
		res.redirect('/login', 302);
	  	res.end();
	} else {
		console.log('allowed path');
		next();
	}
}