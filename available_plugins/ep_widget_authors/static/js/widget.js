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

			if (message.positions) {
				var users = {};
				// check if there are authors without positions
				// and if so, then add them to the position list
				$.each(message.result, function(i, user){
					user.id = user.id.replace('.', '');
					users[user.id] = user;

					if (message.positions.indexOf(user.id) === -1) {
						console.log('user without position found:', user.id);
						message.positions.push(user.id);
					}
				});

				// place authors to specified positions
				$.each(message.positions, function(i, id) {
					var user = users[id];
					$('<li class="clear" id="'+user.id+'"><img src="'+ user.auth.image +'" alt="avatar"><strong>'+ user.name +'</strong><br>'+ user.email +'&nbsp;</li>').appendTo('.widget.authors .widget-content ul');
				});

			} else {
				$.each(message.result, function(i, user) {
					user.id = user.id.replace('.', '');
					$('<li class="clear" id="'+user.id+'"><img src="'+ user.auth.image +'" alt="avatar"><strong>'+ user.name +'</strong><br>'+ user.email +'&nbsp;</li>').appendTo('.widget.authors .widget-content ul');
				});
			}

			$( ".widget.authors .widget-content ul" ).sortable( "option", "disabled", false );
		} else if (message.action === 'inviteUser') {
			console.log('Sent invitation link: ' + message.result);
		}
	});

	$( ".widget.authors .widget-content ul" ).sortable({
		connectWith: '.widget.authors .widget-content ul',
		axis: 'y',
		cursor: 'move',
		placeholder: 'author-placeholder',
		disabled: true,

		// store widget positions after sorting
		stop: function(event, ui) {
			var authorPositions = $( ".widget.authors .widget-content ul" ).sortable('toArray');
			socket.emit('widget-message', {
				'padID': pad.getPadId(),
				'widget_name': 'ep_widget_authors',
				'action': 'setAuthorPositions',
				'value': authorPositions
			});
		},

		// calculate placeholder height
		start: function(e, ui){
			ui.placeholder.height(ui.item.height());
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
