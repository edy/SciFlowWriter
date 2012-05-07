var Pad = module.exports = require('ep_etherpad-lite/node/db/Pad').Pad;

Pad.prototype.datastore = {};

// get data from datastore
Pad.prototype.getData = function(name, callback) {
	// sync
	if (!callback) {
		return this.datastore[name];
	}
	// async
	callback(this.datastore[name]);
};

// save data to datastore
Pad.prototype.setData = function(name, value) {
	this.datastore[name] = value;
	this.saveToDatabase();
};