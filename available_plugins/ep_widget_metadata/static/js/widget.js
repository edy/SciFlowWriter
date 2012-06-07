var socket = null;
window._sfw.metadata = {};

var ucfirst = function(text) {
	return text.charAt(0).toUpperCase() + text.substr(1);
}

exports.loadWidgets = function (hook_name, args, cb) {
	socket = args.socket;
	
	$('.widget.metadata').show();

	// get pad metadata
	socket.emit('widget-message', {
		'padID': pad.getPadId(),
		'widget_name': 'ep_widget_metadata',
		'action': 'getMetadata'
	});

	$('#metadataPopup').modal({show: false});

	// load metadata
	$('#metadataPopup').on('show', function() {
		for(var key in window._sfw.metadata) {
			$('#metadata'+ucfirst(key)+'Input').val(window._sfw.metadata[key]);
		}
	});
	
	// close metadata popup
	$('#cancelMetadata').on('click', function () {
  		$('#metadataPopup').modal('hide');
	});

	// save metadata
	$('#saveMetadata').on('click', function () {
  		$('#metadataPopup').modal('hide');

  		// save on the server
  		socket.emit('widget-message', {
			'padID': pad.getPadId(),
			'widget_name': 'ep_widget_metadata',
			'action': 'setMetadata',
			'value': {
				title: $('#metadataTitleInput').val(),
				subtitle: $('#metadataSubtitleInput').val(),
				abstract: $('#metadataAbstractInput').val(),
				keywords: $('#metadataKeywordsInput').val(),
				template: $('#metadataTemplateInput').val()
			}
		});
	});

	// receive new metadata
	socket.on("widget-message", function (message) {
		if (message.widget_name !== 'ep_widget_metadata') return;

		if (message.action === 'setMetadata') {
			window._sfw.metadata = message.result;
			for(var key in window._sfw.metadata) {
				$('#metadata'+ucfirst(key)).text(window._sfw.metadata[key]);
			}
		}
	});

	return cb();
};