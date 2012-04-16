var $ = require('ep_etherpad-lite/static/js/rjquery').$; // use jQuery
var socket = io.connect().of("/widgets");
var padID = new RegExp(/.*\/p\/([^\/]+)/).exec(document.location.pathname)[1];

// do something here
exports.loadWidgets = function (hook_name, args, cb) {

	var query = {
		'padID': padID,
		'widget_name': 'ep_widget_authors',
		'action': 'get',
		'value': 'padAuthors'
	};

	socket.emit('widget-message', query);

	socket.on("widget-message", function (result) {
		for (user in result) {
			$('<li class="clear">
	        <img src="'+ result[user].auth.image +'" alt="avatar">
	        <strong>'+ result[user].name +'</strong><br>
	        '+ result[user].email +'
	        </li>').appendTo('.widget.authors .widget-content ul');
		}
		
    });

    $('#invitelink').on('click', function(e) {
    	var email = prompt('Send invite mail to:', '');

		if (email !== null) {
			$.getJSON('/profile/invite', {'email': email, 'name': padID}, function(data){
				alert('Sent invitation: '+data.url)
			});
		}

		return false;
	});
};
