var $ = require('ep_etherpad-lite/static/js/rjquery').$; // use jQuery
var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');

// Add widget container to pad after ace inits
exports.postAceInit = function (hook_name, args, cb) {
	$.ajax({
	    url: "/static/plugins/ep_sciflowwriter/static/widgetcontainer.html",
	    success: function (data) {
	    	$('body').append(data);

	    	// start loading widgets
	    	hooks.callAll('loadWidgets', {});
	    },
	    dataType: 'html'
	});

  	$('<link rel="stylesheet" type="text/css" href="/static/plugins/ep_sciflowwriter/static/css/widgets.css">').appendTo("head");
};

exports.loadWidget = function loadCss(widget_name) {
	$.ajax({
	    url: "/static/plugins/" + widget_name + "/static/widget.html",
	    success: function (data) { $('#widgetcontainerbox .widget-column').append(data); },
	    dataType: 'html'
	});
	$('<link rel="stylesheet" type="text/css" href="/static/plugins/' + widget_name + '/static/css/widget.css">').appendTo("head");	
};
