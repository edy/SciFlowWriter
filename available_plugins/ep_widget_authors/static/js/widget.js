var $ = require('ep_etherpad-lite/static/js/rjquery').$; // use jQuery
var socket = io.connect().of("/widgets");
var padID = new RegExp(/.*\/p\/([^\/]+)/).exec(document.location.pathname)[1];

// do something here
exports.loadWidgets = function (hook_name, args, cb) {

	var query = {
		'padID': padID,
		'widget_name': 'ep_widget_authors',
		'action': 'get',
		'value': 'padAuthors'
	};

	socket.emit('widget-message', query);

	socket.on("widget-message", function (result) {
		console.log('received widget-message from server:', result);
    });
};
