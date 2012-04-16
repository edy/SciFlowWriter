var db = require('ep_etherpad-lite/node/db/DB').db;
var everyauth = module.exports = require('everyauth');
var settings = require('ep_etherpad-lite/node/utils/Settings');
var randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString
var async = require('ep_etherpad-lite/node_modules/async');
var authorManager = require('ep_etherpad-lite/node/db/AuthorManager');
var groupManager = require('ep_etherpad-lite/node/db/GroupManager');
var sessionManager = require('ep_etherpad-lite/node/db/SessionManager');
var padManager = require('ep_etherpad-lite/node/db/PadManager');
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
					author.email = '';
					author.auth = {
						'user_id' : twitUser.id,
						'type' : 'twitter',
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

// facebook OAuth
everyauth.facebook
	.appId(settings.auth.facebook.appId)
	.appSecret(settings.auth.appSecret)
	.scope('email')
	// TODO wait for everyauth 0.2.33
	//.fields('id,name,email,picture')
	.handleAuthCallbackError( function (req, res) {
		//console.log('handleAuthCallbackError', req.params['error_description']);
		res.send('access denied');
	})
	.findOrCreateUser( function (session, accessToken, accessTokExtra, fbUserMetadata, reqres) {
		console.log('findOrCreateUser');
		
		// load author
		var promise = this.Promise();
		async.waterfall([
			// first get token from twitter id
			function(callback) {
				db.get('facebook2token:'+fbUserMetadata.id, function(err, token){
					
					if (!token) {
						token = 't.' + randomString();
						db.set('facebook2token:'+fbUserMetadata.id, token);
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
					author.name = fbUserMetadata.name;
					author.email = fbUserMetadata.email;
					author.auth = {
						'type' : 'facebook',
						'user_id' : fbUserMetadata.id,
						'screen_name': fbUserMetadata.username,
						'image' : null,
						'url' : fbUserMetadata.link,
						'accessToken' : accessToken,
						'accessTokExtra' : accessTokExtra
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

// mendeley OAuth
everyauth.mendeley
	.consumerKey(settings.auth.mendeley.consumerKey)
	.consumerSecret(settings.auth.mendeley.consumerSecret)
	.handleAuthCallbackError( function (req, res) {
		console.log('handleAuthCallbackError');
		res.send('access denied');
	})
	.findOrCreateUser( function (sess, accessToken, accessSecret, mendeleyUser, reqres) {
		console.log('findOrCreateUser');
		console.error('mendeley: ', mendeleyUser);
		
		// load author
		var promise = this.Promise();
		async.waterfall([
			// first get token from twitter id
			function(callback) {
				db.get('mendeley2token:'+mendeleyUser.main.profile_id, function(err, token){
					
					if (!token) {
						token = 't.' + randomString();
						db.set('mendeley2token:'+mendeleyUser.main.profile_id, token);
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
					author.name = mendeleyUser.main.name;
					author.email = '';
					author.auth = {
						'user_id' : mendeleyUser.main.profile_id,
						'type' : 'mendeley',
						'screen_name': mendeleyUser.main.name,
						'image' : mendeleyUser.main.photo,
						'url' : mendeleyUser.main.url,
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
		'\/robots.txt',
		'\/login',
		'\/static\/.*',
		'\/javascripts\/.*',
		'\/pluginfw\/.*',
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

// get pad authors
padManager.getPadUsers = function(padID, callback) {
	padManager.doesPadExists(padID, function(err, padExists) {
		if (!padExists) {
			console.log('pad', padID, 'does not exists');
			callback && callback(null);
			return;
		}

		db.get('padaccess:'+padID, function(err, padAccess) {
			if (padAccess) {
				callback && callback(padAccess);
			}
		});
	});
};
