var padManager = require('../db/PadManager');

exports.handler = function(req, res) {
	var action = req.params.action;
	
	if (!action) {
		action = 'index'
	}

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
			image: user.auth.image,
			url: user.auth.url,
			pads: []
		};

		res.send(profile);
	},

	newpad: function(req, res) {
		var user = req.user;
		var query = req.query;

		if (!query || !query.name) {
			res.send({'error': 'no name'}, 500)
			return;
		}

		if (!padManager.isValidPadId(query.name)) {
			res.send({'error': 'invalid pad name'}, 500)
			return;
		}

		padManager.sanitizePadId(query.name, function(padID) {
			padManager.doesPadExists(padID, function(err, value) {
				
				if (value) {
					res.send({'error': 'pad already exists'}, 500);
					return;
				}

				padManager.getPad(padID, function(err, pad) {
					padManager.addUserToPad(user.id, padID, function(){
						res.send({padID: padID, uri: '/p/'+padID});
					});
				});
			});
		});
	},

	deletepad: function(req, res) {
		res.send('ok')
	},
}
