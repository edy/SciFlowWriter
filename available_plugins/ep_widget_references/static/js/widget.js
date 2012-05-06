var socket = null;

exports.loadWidgets = function (hook_name, args, cb) {
	socket = args.socket;
	
	$('.widget.references').show();

	// get references
	socket.emit('widget-message', {
		'padID': pad.getPadId(),
		'widget_name': 'ep_widget_references',
		'action': 'getReferences'
	});

	$('#referencesPopup').modal({show: false});

	// load reference
	$('#referencesPopup').on('show', function() {
		
	});
	
	// close references popup
	$('#cancelReference').on('click', function () {
  		$('#referencesPopup').modal('hide');
	});

	// save references
	$('#saveReference').on('click', function () {
  		$('#referencesPopup').modal('hide');

  		// save on the server
  		socket.emit('widget-message', {
			'padID': pad.getPadId(),
			'widget_name': 'ep_widget_references',
			'action': 'setReference',
			'value': {
				type: $('#referenceTypeInput').val(),
				title: $('#referenceTitleInput').val(),
				authors: $('#referenceAuthorsInput').val()
			}
		});

		$('#referenceTypeInput').val('');
		$('#referenceTitleInput').val('');
		$('#referenceAuthorsInput').val('');
	});

	// receive new references
	socket.on("widget-message", function (message) {
		if (message.widget_name !== 'ep_widget_references') return;
		
		if (message.action === 'setReferences') {
			if (message.result.length) {
				$('#references').html('');
				for(var i in message.result) {
					$('<li class="reference" rel="' + message.result[i].id + '"><span class="title">' + message.result[i].title + '</span><span class="delete">&times;</span></li>').appendTo('#references');
				}
			} else {
				$('#references').html('No references found');
			}
		}
	});

	// delete reference
	$('#references .delete').live('click', function(){
		var id = $(this).parent().attr('rel');
		
		// TODO first ask, then delete
  		socket.emit('widget-message', {
			'padID': pad.getPadId(),
			'widget_name': 'ep_widget_references',
			'action': 'deleteReference',
			'value': {
				'id': id
			}
		});
	});

	return cb();
};