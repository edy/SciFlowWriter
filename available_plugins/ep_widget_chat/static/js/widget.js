var socket;

exports.loadWidgets = function (hook_name, args, cb) {
	socket = args.socket;
	console.error('loading chat');
	$('.widget.chat').show();
	chat.show();
};