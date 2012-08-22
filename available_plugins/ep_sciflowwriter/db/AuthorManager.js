var authorManager = module.exports = require('ep_etherpad-lite/node/db/AuthorManager');
var db = require('ep_etherpad-lite/node/db/DB').db;

// adds pad to users pad list
authorManager.addPad2 = function(authorID, type, padID, callback) {
	// get user
	authorManager.getAuthor(authorID, function(err, author){
		// check if pad is on the list
		if (author.pads[type].indexOf(padID) === -1) {
			// and add the pad to his list
			author.pads[type].push(padID);
			db.set("globalAuthor:" + authorID, author);
		}

		callback && callback(null);
	});
};

// removes pad from users pad list
authorManager.removePad2 = function(authorID, type, padID, callback) {
	// get user
	authorManager.getAuthor(authorID, function(err, author){
		// TODO check if pad is on the list
		if (author.pads[type].indexOf(padID) !== -1) {
			// and remove the pad from the ist
			author.pads[type].splice(author.pads[type].indexOf(padID), 1);
			db.set("globalAuthor:" + authorID, author);
		}
		callback && callback(null);
	});
};

authorManager.setAuthor = function(authorID, author, callback) {
	db.set("globalAuthor:" + authorID, author, callback);
};