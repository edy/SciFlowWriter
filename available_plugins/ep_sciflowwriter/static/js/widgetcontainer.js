var hooks = require('ep_etherpad-lite/static/js/pluginfw/hooks');
var socket;

// set global variable for widget data
// we need this for editing widget data without reloading from server
window._sfw = {};

// Add widget container to pad after ace inits
exports.postAceInit = function (hook_name, args, cb) {
	var widgetPositions;
	socket = io.connect().of("/widgets");

	// first get widget positions
	socket.emit('widget-positions', 'get');

	// then sort widgets
	socket.on('widget-positions', function(positions){
		widgetPositions = positions;

		if (widgetPositions) {
			var widgets = $(".widget-column").children();
			$(".widget-column").html('');

			// check if there are widgets which don't have positions
			// and if so, then add them to the position list
			widgets.each(function(i, widget){
				if (widgetPositions.indexOf(widget.id) === -1) {
					console.log('widget without position found:', widget.id);
					widgetPositions.push(widget.id);
				}
			});

			// place widgets to specified positions
			$.each(widgetPositions, function(i, id) {
				$(".widget-column").append( widgets.filter('#'+id));
			});
		}

		$( ".widget-column" ).sortable({
			connectWith: '.widget-column',
			axis: 'y',
			handle: '.widget-header',
			cursor: 'move',
			placeholder: 'widget-placeholder',

			// store widget positions after sorting
			stop: function(event, ui) {
				widgetPositions = $( ".widget-column" ).sortable('toArray');
				socket.emit('widget-positions', widgetPositions);
			},
			// calculate placeholder height
			start: function(e, ui){
				ui.placeholder.height(ui.item.height());
			}

		});

		hooks.callAll('loadWidgets', {'socket': socket});
	});

	// latex & pdflatex export
	var pad_root_path = new RegExp(/.*\/p\/[^\/]+/).exec(document.location.pathname)
	var pad_root_url = document.location.href.replace(document.location.pathname, pad_root_path)
	$("#exportlatexa").attr("href", pad_root_path + "/export/latex");
	$("#exportpdflatexa").attr("href", pad_root_path + "/export/pdflatex");
};