var socket = io.connect().of("/widgets");
var padID = pad.getPadId();


exports.loadWidgets = function (hook_name, args, cb) {
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
		$('#metadataTitleInput').val($('#metadataTitle').text());
		$('#metadataSubtitleInput').val($('#metadataSubtitle').text());
		$('#metadataAbstractInput').val($('#metadataAbstract').text());
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
				abstract: $('#metadataAbstractInput').val()
			}
		});
	});

	// receive new metadata
	socket.on("widget-message", function (message) {
		if (message.widget_name !== 'ep_widget_metadata') return;

		if (message.action === 'setMetadata') {
			$('#metadataTitle').text(message.result.title);
			$('#metadataSubtitle').text(message.result.subtitle);
			$('#metadataAbstract').text(message.result.abstract);
		}
	});
};