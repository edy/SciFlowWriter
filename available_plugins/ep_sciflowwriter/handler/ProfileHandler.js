var db = require('ep_etherpad-lite/node/db/DB').db;
var padManager = require('../db/PadManager');
var authorManager = require('../db/AuthorManager');
var randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;

exports.handler = function(req, res) {
	var action = req.params.action;
	
	// set default action
	if (!action) {
		action = 'index';
	}

	// check if given method exists
	if (!(action in ProfileHandler)) {
		res.send('method not found', 404);
		return;
	}

	ProfileHandler[action](req, res);
};

var ProfileHandler = {
	index: function(req, res) {
		
		var user = req.user;
		var profile = {
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.auth.image,
			url: user.auth.url,
			pads: user.pads
		};

		res.send(profile);
	},

	newpad: function(req, res) {
		var user = req.user;
		var query = req.query;

		// we need a pad name!
		if (!query || !query.name) {
			res.send({'error': 'no name'}, 500);
			return;
		}

		// check for invalid pad names
		if (!padManager.isValidPadId(query.name)) {
			res.send({'error': 'invalid pad name'}, 500);
			return;
		}

		// first we need to sanitize the pad name
		padManager.sanitizePadId(query.name, function(padID) {
			padManager.doesPadExists(padID, function(err, value) {
				// pad already exists
				if (value) {
					res.send({'error': 'pad already exists'}, 500);
					return;
				}

				// create the pad
				padManager.getPad(padID, function(err, pad) {
					// add user to the pad access list
					padManager.addUserToPad(user.id, padID, function(){
						// add the pad to users list too
						authorManager.addPad2(user.id, 'my', padID, function(){});
						// send pad id and uri
						res.send({padID: padID, uri: '/p/'+padID});
					});
				});
			});
		});
	},

	deletepad: function(req, res) {
		res.send('ok');
	}
};
