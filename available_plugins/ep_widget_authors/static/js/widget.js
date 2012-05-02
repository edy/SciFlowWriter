var $ = require('ep_etherpad-lite/static/js/rjquery').$; // use jQuery
var socket;

// do something here
exports.loadWidgets = function (hook_name, args, cb) {
	socket = args.socket;
	
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
			alert('Sent invitation link: ' + message.result);
		}
	});

	$('#invitelink').on('click', function(e) {
		var email = prompt('Send invite mail to:', '');

		if (email !== null) {
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
