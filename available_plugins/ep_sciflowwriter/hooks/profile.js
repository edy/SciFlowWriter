var path = require('path');
var eejs = require('ep_etherpad-lite/node/eejs');
var async = require('ep_etherpad-lite/node_modules/async');
var profileHandler = require('../handler/ProfileHandler');
var authHandler = require('../handler/AuthHandler');
var authorManager = require('../db/AuthorManager');
var padManager = require('../db/PadManager');

exports.expressCreateServer = function (hook_name, args, cb) {

	//serve profile.html under /
	args.app.get('/', function(req, res)
	{	
		if (!authHandler.isLoggedIn(req)) {
			res.send('accedd denied');
			return;
		}

		var user = req.user;
		var profile = {
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.auth.image,
			url: user.auth.url,
			pads: user.pads
		};

		async.parallel({
			my: function(callback) {
				getPadData(user.pads.my, function(err, pads) {
					callback(err, pads);
				});
			},
			other: function(callback) {
				getPadData(user.pads.other, function(err, pads) {
					callback(err, pads);
				});
			}
		}, function(err, results) {
			profile.pads.my = results.my;
			profile.pads.other = results.other;
			res.send(eejs.require("ep_sciflowwriter/templates/profile.html", {'user': profile}), { maxAge: 0 });
		});

		function getPadData(pads, callback) {
			var p = [];

			async.forEach(pads, function(padID, callback){
				padManager.getPad(padID, function(err, pad) {
					var title = padID;
					var metadata = pad.getData('metadata');
					if (metadata) {
						title = metadata.title || padID;
					}
					
					var access = pad.getData('access');

					getAuthorData(access.user, function(err, authors) {
						p.push({padID: padID, title: title, headRevision: pad.head, authors: authors.join(', ')});
						callback(null);
					});
				});
				
			}, function(err) {
				callback(null, p);
			});
		}

		function getAuthorData(authors, callback) {
			var a = [];
			async.forEach(authors, function(authorID, callback){
				authorManager.getAuthor(authorID, function(err, author){
					a.push(author.name);
					callback(null);
				});
			}, function(err) {
				callback(err, a);
			});
		}

	});

	args.app.get('/profile/:action?', profileHandler.handler);
};

exports.socketio = function (hook_name, args, cb) {
	var io = args.io.of("/profile");
	io.on('connection', function (socket) {
		socket.on("update", function (profile) {
			authorManager.getAuthor(profile.id, function(err, author) {
				author.name = profile.name;
				author.email = profile.email;
				author.auth.image = profile.image || author.auth.image;

				authorManager.setAuthor(profile.id, author);
			});
		});
	});
};

