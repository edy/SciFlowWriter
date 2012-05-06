var socket = null;

exports.loadWidgets = function (hook_name, args, cb) {
	socket = args.socket;
	
	$('.widget.references').show();

	// get references
	socket.emit('widget-message', {
		'padID': pad.getPadId(),
		'widget_name': 'ep_widget_references',
		'action': 'getReferences'
	});

	$('#referencesPopup').modal({show: false});

	// load reference
	$('#referencesPopup').on('show', function() {
		
	});
	
	// close references popup
	$('#cancelReference').on('click', function () {
  		$('#referencesPopup').modal('hide');
	});

	// save references
	$('#saveReference').on('click', function () {
  		$('#referencesPopup').modal('hide');

  		// save on the server
  		socket.emit('widget-message', {
			'padID': pad.getPadId(),
			'widget_name': 'ep_widget_references',
			'action': 'setReference',
			'value': {
				type: $('#referenceTypeInput').val(),
				title: $('#referenceTitleInput').val(),
				authors: $('#referenceAuthorsInput').val()
			}
		});

		$('#referenceTypeInput').val('');
		$('#referenceTitleInput').val('');
		$('#referenceAuthorsInput').val('');
	});

	// receive new references
	socket.on("widget-message", function (message) {
		if (message.widget_name !== 'ep_widget_references') return;
		
		if (message.action === 'setReferences') {
			if (message.result.length) {
				$('#references').html('');
				for(var i in message.result) {
					$('<li class="reference" rel="' + message.result[i].id + '">' +
						'<span class="title">' + message.result[i].title + '</span>' +
						'<span class="addCite">&#x2B05;</span><span class="delete">&times;</span></li>').appendTo('#references');
				}
			} else {
				$('#references').html('No references found');
			}
		}
	});

	// delete reference
	$('#references .delete').live('click', function(){
		var id = $(this).parent().attr('rel');
		
		// TODO first ask, then delete
  		socket.emit('widget-message', {
			'padID': pad.getPadId(),
			'widget_name': 'ep_widget_references',
			'action': 'deleteReference',
			'value': {
				'id': id
			}
		});
	});

	$("#references .addCite").live('click', function () {
		var id = $(this).parent().attr('rel');
		var padeditor = require('ep_etherpad-lite/static/js/pad_editor').padeditor;

		return padeditor.ace.callWithAce(function (ace) {
			rep = ace.ace_getRep();
			ace.ace_replaceRange(rep.selStart, rep.selEnd, "[cite]");
			ace.ace_performSelectionChange([rep.selStart[0],rep.selStart[1]-6], rep.selStart, false);
			ace.ace_performDocumentApplyAttributesToRange(rep.selStart, rep.selEnd, [["sciflow-cite", id]]);
		}, "sciflow-cite");
	});

	$('.sciflow-cite').live('click', function(){
		var id = $(this).attr('rel');
		console.log('clicked cite: ', id);
	});

	return cb();
};

exports.aceInitInnerdocbodyHead = function(hook_name, args, cb) {
	args.iframeHTML.push('<link rel="stylesheet" type="text/css" href="/static/plugins/ep_widget_references/static/css/ace.css"/>');
	return cb();
};

exports.aceAttribsToClasses = function(hook_name, args, cb) {
	if (args.key == 'sciflow-cite' && args.value != "") {
		return cb(["sciflow-cite:" + args.value]);
	}
};

exports.aceCreateDomLine = function(hook_name, args, cb) {
	if (args.cls.indexOf('sciflow-cite:') >= 0) {
		var clss = [];
		var argClss = args.cls.split(" ");
		var value;

		// get the value from the classname
		// borrowed from github.com/redhog/ep_embedmedia
		for (var i = 0; i < argClss.length; i++) {
			var cls = argClss[i];
			if (cls.indexOf("sciflow-cite:") != -1) {
				value = cls.substr(cls.indexOf(":")+1);
			} else {
				clss.push(cls);
			}
		}

		return cb([{cls: clss.join(" "), extraOpenTags: '<span class="sciflow-cite" rel="'+value+'">', extraCloseTags: "</span>"}]);
	}

	return cb();
};