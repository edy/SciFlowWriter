var socket;

// do something here
exports.loadWidgets = function (hook_name, args, cb) {
	socket = args.socket;
	
	$('#inviteUserPopup').modal({show: false});

	// show authors widget
	$('.widget.authors').show();
	
	// ask server for pad authors
	socket.emit('widget-message', {
		'padID': pad.getPadId(),
		'widget_name': 'ep_widget_authors',
		'action': 'getPadAuthors'
	});

	// listen for pad authors message and display them
	socket.on("widget-message", function (message) {
		if (message.widget_name !== 'ep_widget_authors') return;

		if (message.action === 'getPadAuthors') {
			$.each(message.result, function(i, user) {
				$('<li class="clear"><img src="'+ user.auth.image +'" alt="avatar"><strong>'+ user.name +'</strong><br>'+ user.email +'</li>').appendTo('.widget.authors .widget-content ul');
			});
		} else if (message.action === 'inviteUser') {
			console.log('Sent invitation link: ' + message.result);
		}
	});

	$('#invitelink').on('click', function(e) {
		$('#inviteEmail').val('');
		$('#inviteUserPopup').modal('show');

		return false;
	});

	$('#cancelInvite').on('click', function(e) {
		$('#inviteUserPopup').modal('hide');
		return false;
	});

	$('#saveInvite').on('click', function(e) {
		$('#inviteUserPopup').modal('hide');
		var email = $('#inviteEmail').val();

		if (email !== '') {
			socket.emit('widget-message', {
				'padID': pad.getPadId(),
				'widget_name': 'ep_widget_authors',
				'action': 'inviteUser',
				'value': {'email': email}
			});
		}
		return false;
	});

	return cb();
};
