var $ = require('ep_etherpad-lite/static/js/rjquery').$; // use jQuery
var socket = io.connect().of("/widgets");
var padID = new RegExp(/.*\/p\/([^\/]+)/).exec(document.location.pathname)[1];

// do something here
exports.loadWidgets = function (hook_name, args, cb) {

	// show authors widget
	$('.widget.authors').show();
	
	// ask server for pad authors
	socket.emit('widget-message', {
		'padID': padID,
		'widget_name': 'ep_widget_authors',
		'action': 'getPadAuthors'
	});

	// listen for pad authors message and display these authors
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
			/*$.getJSON('/profile/invite', {'email': email, 'name': padID}, function(data){
				alert('Sent invitation: '+data.url);
			});*/
			socket.emit('widget-message', {
				'padID': padID,
				'widget_name': 'ep_widget_authors',
				'action': 'inviteUser',
				'value': {'email': email}
			});
		}

		return false;
	});
};
