var $ = require('ep_etherpad-lite/static/js/rjquery').$; // use jQuery

// do something here
exports.loadWidgets = function (hook_name, args, cb) {
	w.loadWidget('ep_widget_authors');
}
