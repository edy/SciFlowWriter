var eejs = require('ep_etherpad-lite/node/eejs');
var padManager = require('ep_sciflowwriter/db/PadManager');
var authorManager = require('ep_sciflowwriter/db/AuthorManager');
var inviteHandler = require('ep_sciflowwriter/handler/InviteHandler');
var async = require('ep_etherpad-lite/node_modules/async');
var randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
var db = require("ep_etherpad-lite/node/db/DB").db;
var http = require('ep_sciflowwriter/node_modules/http-get');
var mkdirp = require('ep_sciflowwriter/node_modules/mkdirp');
var spawn = require("child_process").spawn;
var fs = require('fs');
var path = require('path');

// add modal to the bottom of the page
exports.eejsBlock_body = function(hook_name, args, cb) {
	args.content = args.content +
		eejs.require("ep_widget_images/templates/modal.html") +
		eejs.require("ep_widget_images/templates/addimagemodal.html");
	return cb();
};

// load widget
exports.eejsBlock_widgetColumn = function (hook_name, args, cb) {
	args.content = args.content + eejs.require("ep_widget_images/templates/widget.html");
	return cb();
};

// load widget style sheet
exports.eejsBlock_styles = function(hook_name, args, cb) {
	args.content = args.content + '<link rel="stylesheet" type="text/css" href="/static/plugins/ep_widget_images/static/css/widget.css">';
	return cb();
};

exports.expressCreateServer = function (hook_name, args, cb) {
	args.app.get('/p/:pad/datastore/images/:id', function(req, res, next) {
		var imagePath = 'var/pads/' + req.params.pad + '/images/' + req.params.id;
		var ext = path.extname(imagePath);

		// because sometimes we dont know the extension of a file, we must guess it
		if (ext === '') {
			if (path.existsSync(imagePath+'.jpeg')) {
				imagePath = imagePath + '.jpeg';
			} else if (path.existsSync(imagePath+'.png')) {
				imagePath = imagePath + '.png';
			}
		}
		
		console.error('bild: ', imagePath);
		res.sendfile(imagePath); 
	});
};

exports.onWidgetMessage = function (hook_name, args, cb) {
	// don't listen for messages from other widgets
	if (args.query.widget_name !== 'ep_widget_images') return;



	// listen for 'setMetadata'
	if (args.query.action === 'setImage') {
		var image = args.query.value;
		image.id = (typeof args.query.value.id === 'string' && args.query.value.id !== '') ? args.query.value.id : randomString(16);

		padManager.getPad(args.query.padID, function(err, pad) {
			pad.getData('images', function(images) {

				if (!images) {
					images = {};
				}

				// if it's a new image, download it
				if ( ! images[image.id]) {
					images[image.id] = image;
					
					saveImage(args.query.padID, image, function(err, result) {
						var result = {
							'padID': args.query.padID,
							'widget_name': 'ep_widget_images',
							'action': 'setImage',
							'error': err,
							'result': result
						};

						args.socket.emit('widget-message', result);

						if (!err) {
							pad.setData('images', images);
							sendResponse(null, images);
						}
					});

				} else {
					images[image.id].caption = image.caption;
					pad.setData('images', images);

					sendResponse(null, images);
				}

				function sendResponse(err, resultValue) {
					var result = {
						'padID': args.query.padID,
						'widget_name': 'ep_widget_images',
						'action': 'setImages',
						'result': resultValue
					};
					args.socket.emit('widget-message', result);
					args.socket.broadcast.to(args.query.padID).emit('widget-message', result);
				}
				
				return cb();
			});
		});

	} else if (args.query.action === 'getImages') {
		padManager.getPad(args.query.padID, function(err, pad) {
			pad.getData('images', function(images) {
				if (images) {
					var result = {
						'padID': args.query.padID,
						'widget_name': 'ep_widget_images',
						'action': 'setImages',
						'result': images
					};
					args.socket.emit('widget-message', result);
				}
				
				return cb();
			});
		});
	} else if (args.query.action === 'deleteImage') {
		padManager.getPad(args.query.padID, function(err, pad) {
			pad.getData('images', function(images) {
				if (images) {
					if (images[args.query.value.id]) {
						delete images[args.query.value.id];
						pad.setData('images', images);
					}
					
					var result = {
						'padID': args.query.padID,
						'widget_name': 'ep_widget_images',
						'action': 'setImages',
						'result': images
					};
					args.socket.emit('widget-message', result);
					args.socket.broadcast.to(args.query.padID).emit('widget-message', result);
				}
				
				return cb();
			});
		});
	}
	
};

function saveImage(padID, image, callback) {
	var imagePath = 'var/pads/' + padID + '/images/' ;
	
	async.waterfall([
		// first create a directory for the image
		function (callback){
			console.log('mkdirp');
			mkdirp(imagePath, function(err) {
				callback(err);
			});
		},
		// download the file
		function (callback) {
			console.log('download');
			http.get({url: image.url}, imagePath+image.id+'.jpg', function (err, result) {
				if (err) {
					callback('Error downloading file');
				} else {
					callback(null);
				}
			});
		},
		// check file type
		// must be jpg, png or gif
		// if file type is gif, then convert to png
		function (callback) {
			console.log('identify');
			var filetypes = ['png', 'jpg', 'gif', 'jpeg'];

			// http://www.imagemagick.org/script/escape.php
			var identify = spawn('identify', ['-format', '%m', image.id+'.jpg'], {cwd: imagePath});
			identify.stdout.on('data', function(data){
				var type = data.toString().replace(/[\r\n]/, '').toLowerCase();

				// check if the donloaded file has the allowed file type
				if (filetypes.indexOf(type) !== -1) {
					image.type = type;
					image.filename = image.id+'.'+type;

					// rename the file to its real extension
					fs.rename(imagePath+image.id+'.jpg', imagePath+image.filename, function (err) {
						callback(null);
					});
				} else {
					// remove downloaded file
					fs.unlink(imagePath+image.id+'.jpg');

					callback('File format is not an image: '+type);
				}
				
			});
		},
		// if the image is a gif file, convert it to png
		function (callback) {
			console.log('gif to png');
			if (image.type === 'gif') {
				var identify = spawn('convert', [image.filename, image.id + '.png'], {cwd: imagePath});
				identify.on('exit', function() {
					fs.unlink(imagePath+image.filename);

					image.type = 'png';
					image.filename = image.id+'.png';
					callback(null);
				});
			} else {
				callback(null);
			}
		},
		// create thumbnail
		function(callback) {
			console.log('convert', image.filename);
			spawn('convert', [
				imagePath+image.filename,
				'-resize',
				'^85x85',
				'-gravity',
				'Center',
				'-crop',
				'85x85+0+0',
				'-quality',
				'90',
				imagePath+image.id+'.thumbnail.'+image.type])
			.on('exit', function(returnCode) {
				callback(null);
			});
		}], function(err) {

		if (err) {
			callback(err, 'error');
		} else {
			callback(null, 'ok');
		}

	});
}
