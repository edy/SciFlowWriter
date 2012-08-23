var socket;

exports.loadWidgets = function (hook_name, args, cb) {
	socket = args.socket;
	
	$('.widget.chat').show();
	chat.show();
};