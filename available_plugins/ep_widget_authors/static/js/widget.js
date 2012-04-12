var $ = require('ep_etherpad-lite/static/js/rjquery').$; // use jQuery
var w = require('ep_sciflowwriter/static/js/widgetcontainer');

// Load widget
exports.loadWidgets = function (hook_name, args, cb) {
	w.loadWidget('ep_widget_authors');
}
