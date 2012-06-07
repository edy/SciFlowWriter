var padManager = module.exports = require('ep_etherpad-lite/node/db/PadManager');
var Pad = require('./Pad');
var db = require('ep_etherpad-lite/node/db/DB').db;

// adds an user to the pads access list
padManager.addUserToPad = function (userID, padID, callback) {
	padManager.doesPadExists(padID, function(err, padExists) {
		if (!padExists) {
			callback && callback(null);
			return;
		}

		padManager.getPad(padID, function(err, pad) {
			var padAccess = pad.getData('access');
		
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

			pad.setData('access', padAccess);

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
		padManager.getPad(padID, function(err, pad) {
			var padAccess = pad.getData('access');
			// delete user if he is not the owner
			if (padAccess &&  padAccess.owner !== userID && padAccess.user.indexOf(userID) !== -1) {
				console.log('user', userID, 'removed from pad', padID);
				padAccess.user.splice(padAccess.user.indexOf(userID), 1);
				pad.setData('access', padAccess);
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

		padManager.getPad(padID, function(err, pad) {
			var padAccess = pad.getData('access');
			if (padAccess) {
				callback && callback(padAccess);
			}
		});
	});
};
