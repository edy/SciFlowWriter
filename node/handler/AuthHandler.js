var db = require('../db/DB').db;
var everyauth = module.exports = require('everyauth');
var CommonCode = require('../utils/common_code');
var settings = require('../utils/Settings');
var randomString = CommonCode.require('/pad_utils').randomString;
var async = require('async');
var authorManager = require('../db/AuthorManager');
var groupManager = require('../db/GroupManager');
var sessionManager = require('../db/SessionManager');
var padManager = require('../db/PadManager');
var sessionID;

// TODO diese methode gehört hier nicht hin
authorManager.setAuthor = function(authorID, author, callback) {
	db.set("globalAuthor:" + authorID, author);
	callback(null, author);
};

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
		
		// load author
		var promise = this.Promise();
		async.waterfall([
			// first get token from twitter id
			function(callback) {
				db.get('twitter2token:'+twitUser.id, function(err, token){
					
					if (!token) {
						token = 't.' + randomString();
						db.set('twitter2token:'+twitUser.id, token);
					}

					// replace token cookie
					reqres.res.cookie('token', token, {path: '/'});

					callback(null, token);
					
				});
			},
			// get author from token
			function(token, callback) {
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
					author.pads = {
						'my' : [],
						'other' : [],
						'review' : []
					};

					authorManager.setAuthor(authorID, author, callback);
				}

				callback(null, author);
			}
		], function(err, result) {
			promise.fulfill(result);
		});

		return promise;
	})
	.sendResponse(function(res, data) {
		if (data.session && data.session.redirectAfterLogin) {
			var redirectAfterLogin = data.session.redirectAfterLogin;
			delete data.session.redirectAfterLogin
			res.redirect(redirectAfterLogin, 302);
		} else {
			res.redirect('/', 302);
		}
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
		'\/minified\/.*',
		'\/invite\/.*'
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
};

// checks if the iser has assess to requested pad id
everyauth.hasPadAccess = function (req, res, next) {
	var padID = req.params.pad;
	var userID = req.user.id;
	
	// does the pad exist?
	padManager.doesPadExists(padID, function(err, padExists) {
		if (! padExists) {
			console.log('pad not found: ', padID);
			res.send('pad not found', 404);
			//res.end();
			return;
		}

		// TODO check access
		db.get('padaccess:'+padID, function(err, padAccess) {
			if (padAccess && padAccess.user.indexOf(userID) !== -1) {
				console.log(userID+', you have access to', padID);
			} else {
				console.log(userID+', you don\'t have access to', padID);
				res.send('no access for you, '+userID, 403);
				return;
			}

			next();
		});
	});	
};

// adds an user to the pads access list
padManager.addUserToPad = function (userID, padID, callback) {
	padManager.doesPadExists(padID, function(err, padExists) {
		if (!padExists) {
			callback && callback(null);
			return;
		}

		db.get('padaccess:'+padID, function(err, padAccess) {
			// create a new access object
			if (!padAccess) {
				padAccess = {
					owner: userID,
					user: [userID],
					reviewer: []
				};

			// alter available pad access object
			} else if (padAccess.user.indexOf(userID) === -1) {
				padAccess.user.push(userID);

			// user has access
			} else {
				console.log('user has already access to pad ', padID);
			}

			db.set('padaccess:'+padID, padAccess);

			callback && callback(null);
		});
	});
};

// removes an user from the pads access list
padManager.removeUserFromPad = function (userID, padID, callback) {
	padManager.doesPadExists(padID, function(err, padExists) {
		if (!padExists) {
			console.log('pad', padID, 'does not exists');
			callback && callback(null);
			return;
		}
		db.get('padaccess:'+padID, function(err, padAccess) {
			// delete user if he is not the owner
			if (padAccess &&  padAccess.owner !== userID && padAccess.user.indexOf(userID) !== -1) {
				console.log('user', userID, 'removed from pad', padID);
				padAccess.user.splice(padAccess.user.indexOf(userID), 1);
				db.set('padaccess:'+padID, padAccess);
			}

			callback && callback(null);
		});
	});
};