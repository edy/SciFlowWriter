var db = require('ep_etherpad-lite/node/db/DB').db;
var padManager = require('ep_etherpad-lite/node/db/PadManager');
var authorManager = require('ep_etherpad-lite/node/db/AuthorManager');
var randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString

exports.handler = function(req, res) {
	var action = req.params.action;
	
	// set default action
	if (!action) {
		action = 'index'
	}

	// check if given method exists
	if (!(action in ProfileHandler)) {
		res.send('method not found', 404);
		return;
	}

	ProfileHandler[action](req, res);
}

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
			res.send({'error': 'no name'}, 500)
			return;
		}

		// check for invalid pad names
		if (!padManager.isValidPadId(query.name)) {
			res.send({'error': 'invalid pad name'}, 500)
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
						authorManager.addPad(user.id, 'my', padID, function(){});
						// send pad id and uri
						res.send({padID: padID, uri: '/p/'+padID});
					});
				});
			});
		});
	},

	invite: function(req, res) {
		var user = req.user;
		var query = req.query;

		// we need a pad name!
		if (!query || !query.name) {
			res.send({'error': 'need a pad name'}, 500)
			return;
		}

		// we need an email!
		if (!query || !query.email) {
			res.send({'error': 'need an email'}, 500)
			return;
		}

		padManager.doesPadExists(query.name, function(err, value) {
			
			if (!value) {
				res.send({'error': 'pad doesn\'t exist'}, 500);
				return;
			}

			var inviteID = randomString(16);
			var url = 'http://'+req.headers.host+'/invite/'+inviteID;

			var inviteObject = {
				pad: query.name,
				type: 'other',
				user: user.id,
				timestamp: Date.now()
			};

			db.set("padinvite:" + inviteID, inviteObject);

			require('child_process').exec('echo "'+url+'" | mail -s "SciFlowWriter invitation" '+query.email, function (error, stdout, stderr) {});
			
			res.send({'url':url});
		});


	},

	deletepad: function(req, res) {
		res.send('ok')
	}
};

// adds pad to users pad list
authorManager.addPad = function(authorID, type, padID, callback) {
	// get user
	authorManager.getAuthor(authorID, function(err, author){
		// TODO check if pad is on the list

		// and add the pad to his list
		author.pads[type].push(padID);
		db.set("globalAuthor:" + authorID, author);
		callback && callback(null);
	});
};

// removes pad from users pad list
authorManager.removePad = function(authorID, type, padID, callback) {
	// get user
	authorManager.getAuthor(authorID, function(err, author){
		// TODO check if pad is on the list

		// and remove the pad from the ist
		author.pads[type].splice(author.pads[type].indexOf(padID), 1);
		db.set("globalAuthor:" + authorID, author);
		callback && callback(null);
	});
};