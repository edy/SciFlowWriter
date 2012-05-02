var $ = require('ep_etherpad-lite/static/js/rjquery').$; // use jQuery
var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');
var socket;
// Add widget container to pad after ace inits
exports.postAceInit = function (hook_name, args, cb) {
	socket = io.connect().of("/widgets");
	hooks.callAll('loadWidgets', {'socket': socket});
};