var socket = null;

var ucfirst = function(text) {
	return text.charAt(0).toUpperCase() + text.substr(1);
}

window._sfw.images = {};

exports.loadWidgets = function (hook_name, args, cb) {
	socket = args.socket;
	
	$('.widget.images').show();

	$('#newImagePopup').modal({show: false});

	// get references
	socket.emit('widget-message', {
		'padID': pad.getPadId(),
		'widget_name': 'ep_widget_images',
		'action': 'getImages'
	});

	// receive new references
	socket.on("widget-message", function (message) {
		if (message.widget_name !== 'ep_widget_images') return;
		
		if (message.action === 'setImages') {
			$('#images').html('');

			for(var i in message.result) {
				// update global data
				window._sfw.images[message.result[i].id] = message.result[i];

				// update list
				$('<li class="image" rel="' + message.result[i].id + '">' +
					'<img src="/p/'+message.padID+'/datastore/images/'+message.result[i].id+'.thumbnail.'+message.result[i].type+'" title="'+message.result[i].caption+'">' +
					'<span class="addGraphic" title="Add graphic">&#x2B05;</span><span class="delete" title="delete">&times;</span></li>').appendTo('#images');
			}
		}
	});

	// closes the new image popup on successful image download
	socket.on("widget-message", function (message) {
		if (message.widget_name !== 'ep_widget_images') return;
		
		if (message.action === 'setImage') {
			console.log('setImage:', message);

			if (message.error) {
				alert(message.error);
			} else {
				$('#newImagePopup').modal('hide');
			}
		}
	});

	// load new image popup
	$('#imagesNew').on('click', function() {
		$('#newImageUrlInput').val('');
		$('#newImageCaptionInput').val('');

		$('#newImagePopup').modal('show');
		return false;
	});
	
	// close new image popup
	$('#cancelNewImage').on('click', function () {
  		$('#newImagePopup').modal('hide');

  		$('#newImageUrlInput').val('');
		$('#newImageCaptionInput').val('');
		return false;
	});

	// save new image
	$('#saveNewImage').on('click', function () {
  		//$('#newImagePopup').modal('hide');

  		var values = {
  			id: '',
  			url: $('#newImageUrlInput').val(),
  			caption: $('#newImageCaptionInput').val()
  		};

  		// save on the server
  		socket.emit('widget-message', {
			'padID': pad.getPadId(),
			'widget_name': 'ep_widget_images',
			'action': 'setImage',
			'value': values
		});
		return false;
	});

	// edit reference
	$('#images .image').live('click', function(){
		var id = $(this).attr('rel');
		var image = window._sfw.images[id];
		$('#imageIdInput').val(id);
		$('#imageCaptionInput').val(image.caption);
		$('#imageUrl').attr('src', '/p/'+pad.getPadId()+'/datastore/images/'+image.filename);

		$('#imagesPopup').modal('show');

		return false;
	});

	// close  image popup
	$('#cancelImage').on('click', function () {
  		$('#imagesPopup').modal('hide');

  		return false;
	});

	// save  image
	$('#saveImage').on('click', function () {
  		$('#imagesPopup').modal('hide');

  		var values = {
  			id: $('#imageIdInput').val(),
  			caption: $('#imageCaptionInput').val()
  		};

  		// save on the server
  		socket.emit('widget-message', {
			'padID': pad.getPadId(),
			'widget_name': 'ep_widget_images',
			'action': 'setImage',
			'value': values
		});

		return false;
	});

	// delete reference
	$('#images .delete').live('click', function(){
		var id = $(this).parent().attr('rel');
		
		// TODO first ask, then delete
  		socket.emit('widget-message', {
			'padID': pad.getPadId(),
			'widget_name': 'ep_widget_images',
			'action': 'deleteImage',
			'value': {
				'id': id
			}
		});
		return false;
	});

	// add image to pad
	$("#images .addGraphic").live('click', function () {
		var id = $(this).parent().attr('rel');
		var padeditor = require('ep_etherpad-lite/static/js/pad_editor').padeditor;

		padeditor.ace.callWithAce(function (ace) {
			rep = ace.ace_getRep();
			ace.ace_replaceRange(rep.selStart, rep.selEnd, ' ');
			ace.ace_performSelectionChange([rep.selStart[0],rep.selStart[1]-1], rep.selStart, false);
			ace.ace_performDocumentApplyAttributesToRange(rep.selStart, rep.selEnd, [["sciflow-graphic", id]]);
		}, "sciflow-graphic");

		return false;
	});

	return cb();
};

exports.aceInitInnerdocbodyHead = function(hook_name, args, cb) {
	args.iframeHTML.push('<script src="/static/plugins/ep_widget_images/static/js/ace.js"></script>');
	args.iframeHTML.push('<link rel="stylesheet" type="text/css" href="/static/plugins/ep_widget_images/static/css/ace.css"/>');
	return cb();
};

exports.aceAttribsToClasses = function(hook_name, args, cb) {
	if (args.key == 'sciflow-graphic' && args.value != "") {
		return cb(["sciflow-graphic:" + args.value]);
	} else if (args.key.indexOf('sciflow-graphic:') >= 0) {
		// we need this line only for pasted images
		// but this is also why the typed in text also becomes an image :-(
		// see also exports.aceCreateDomLine()
		return [args.key];
	}
};

// content collector is used when pasting text too
exports.collectContentPre = function(hook_name, args, cb) {
	
	if (args.cls.indexOf('sciflow-graphic:') >= 0) {
		var regExpMatch;

		// if you find a image-class in the pasted text, keep it
		if (regExpMatch = args.cls.match(/sciflow-graphic:\S+(?:$| )/)) {
			args.cc.doAttrib(args.state, regExpMatch[0]);
		}
	}
};

// borrowed from github.com/redhog/ep_embedmedia
exports.aceCreateDomLine = function(hook_name, args, cb) {
	if (args.cls.indexOf('sciflow-graphic:') >= 0) {
		var clss = [];
		var argClss = args.cls.split(" ");
		var value;

		// get the value from the classname
		for (var i = 0; i < argClss.length; i++) {
			var cls = argClss[i];
			if (cls.indexOf("sciflow-graphic:") != -1) {
				value = cls.substr(cls.indexOf(":")+1);
				
				// if you delete the following line, you won't be able to copy/paste references
				// but if you leave the line, the text you type after a [imag] gets the image-attribute too!
				// see also exports.aceAttribsToClasses()
				// how do i fix this?
				//clss.push(cls);
			} else {
				clss.push(cls);
			}
		}

		// here we don't know the type of the image because
		// the global datastore variable isn't initialized yet
		var url = '/p/'+pad.getPadId()+'/datastore/images/'+value;

		return cb([{
			cls: clss.join(" "),
			extraOpenTags: '<img src="'+url+'" class="sciflow-graphic" rel="'+value+'" /><span class="sciflow-character">',
			extraCloseTags: '</span>'}]);
	}

	return cb();
};