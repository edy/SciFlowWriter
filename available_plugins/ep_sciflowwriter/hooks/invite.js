var path = require('path');
var inviteHandler = require('../handler/InviteHandler');

exports.expressCreateServer = function (hook_name, args, cb) {
	args.app.get('/invite/:id', inviteHandler.handler);
};