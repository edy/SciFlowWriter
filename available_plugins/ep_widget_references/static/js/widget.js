var socket = null;
var referenceTypes = {
	article: ['author', 'title', 'yournal', 'year', 'volume', 'number', 'pages', 'month', 'keywords'],
	book: ['title', 'publisher', 'year', 'author', 'editor', 'volume', 'number', 'series', 'address', 'edition', 'month', 'keywords'],
	booklet: ['title', 'author', 'howpublished', 'address', 'month', 'year', 'keywords'],
	commented: ['author', 'title', 'publisher', 'year', 'volumetitle', 'editor', 'keywords'],
	conference: ['author', 'title', 'booktitle', 'year', 'editor', 'volume', 'pages', 'number', 'organization', 'series', 'publisher', 'address', 'month', 'keywords'],
	glossdef: ['word', 'definition', 'sort-word', 'short', 'group', 'keywords'],
	inbook: ['title', 'publisher', 'year', 'editor', 'author', 'chapter', 'number', 'volume', 'type', 'series', 'month', 'address', 'edition', 'pages', 'keywords'],
	incollection: ['author', 'title', 'booktitle', 'year', 'editor', 'volume', 'number', 'series', 'type', 'chapter', 'pages', 'address', 'edition', 'month', 'keywords'],
	inproceedings: ['author', 'title', 'booktitle', 'year', 'editor', 'volume', 'pages', 'number', 'organization', 'series', 'publisher', 'address', 'month', 'month', 'keywords'],
	jurthesis: ['author', 'title', 'school', 'year', 'address', 'month', 'type', 'keywords'],
	manual: ['title', 'author', 'organization', 'address', 'edition', 'month', 'year', 'keywords'],
	masterthesis: ['author', 'title', 'school', 'year', 'address', 'month', 'type', 'keywords'],
	misc: ['title', 'howpublished', 'author', 'month', 'year', 'keywords'],
	periodical: ['author', 'title', 'journal', 'year', 'volume', 'pages', 'keywords'],
	phdthesis: ['author', 'title', 'school', 'year', 'address', 'month', 'type', 'keywords'],
	proceedings: ['title', 'year', 'editor', 'number', 'publisher', 'organization', 'address', 'month', 'volume', 'keywords'],
	techreport: ['author', 'title', 'institution', 'year', 'type', 'number', 'address', 'month', 'keywords'],
	unpublished: ['author', 'note', 'title', 'month', 'year', 'keywords'],
	url: ['urldate', 'author', 'title', 'lastchecked', 'keywords'],
	electronic: ['urldate', 'author', 'title', 'keywords'],
	webpage: ['url', 'lastchecked', 'year', 'month', 'keywords']
};

var ucfirst = function(text) {
	return text.charAt(0).toUpperCase() + text.substr(1);
}

window._sfw.references = {};

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
	$('#referencesNew').on('click', function() {
		$('#referenceTypeInput').val('');
		$('#referenceIdInput').val('');
		$('#referenceInputFields').text('');

		$('#referencesPopup').modal('show');
	});
	
	// close references popup
	$('#cancelReference').on('click', function () {
  		$('#referencesPopup').modal('hide');
  		$('#referenceTypeInput').val('');
		$('#referenceIdInput').val('');
		$('#referenceInputFields').text('');
	});

	// save references
	$('#saveReference').on('click', function () {
  		$('#referencesPopup').modal('hide');

  		var type = $('#referenceTypeInput').val();
  		if (type === '') return;

  		var values = {type: type};

  		var id = $('#referenceIdInput').val();
  		if (id !== '') {
  			values.id = id;
  		}

  		$.each(referenceTypes[type], function(t, v) {
  			values[v] = $('#reference' + ucfirst(v) + 'Input').val()
		});

  		// save on the server
  		socket.emit('widget-message', {
			'padID': pad.getPadId(),
			'widget_name': 'ep_widget_references',
			'action': 'setReference',
			'value': values
		});

		$('#referenceTypeInput').val('');
		$('#referenceIdInput').val('');
		$('#referenceInputFields').text('');
	});

	// receive new references
	socket.on("widget-message", function (message) {
		if (message.widget_name !== 'ep_widget_references') return;
		
		if (message.action === 'setReferences') {
			$('#references').html('');

			for(var i in message.result) {
				// update global data
				window._sfw.references[message.result[i].id] = message.result[i];

				// update list
				$('<li class="reference" rel="' + message.result[i].id + '">' +
					'<span class="title">' + message.result[i].title + '</span>' +
					'<span class="addCite">&#x2B05;</span><span class="delete">&times;</span></li>').appendTo('#references');
			}
		}
	});

	// edit reference
	$('#references .title').live('click', function(){
		var id = $(this).parent().attr('rel');
		var type = window._sfw.references[id].type;
		$('#referenceIdInput').val(id);
		$('#referenceTypeInput').val(type);
		$('#referenceTypeInput').trigger('change');

		$('#referencesPopup').modal('show');
	});

	// on type change
	$('#referenceTypeInput').on('change', function(){
		var type = $(this).val();
		if (type === 'none') return;

		var id = $('#referenceIdInput').val();

		$('#referenceInputFields').text('');
		$.each(referenceTypes[type], function(t, v) {
			var value = '';
			if (id !== '' && window._sfw.references[id][v]) {
				value = window._sfw.references[id][v];
			}
			$('<p>'+ucfirst(v)+':<br><input type="text" name="'+v+'" value="'+value+'" id="reference'+ucfirst(v)+'Input" /></p>').appendTo('#referenceInputFields');
		});

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

	// add cite to pad
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

	return cb();
};

exports.aceInitInnerdocbodyHead = function(hook_name, args, cb) {
	args.iframeHTML.push('<script src="/static/plugins/ep_widget_references/static/js/ace.js"></script>');
	args.iframeHTML.push('<link rel="stylesheet" type="text/css" href="/static/plugins/ep_widget_references/static/css/ace.css"/>');
	return cb();
};

exports.aceAttribsToClasses = function(hook_name, args, cb) {
	if (args.key == 'sciflow-cite' && args.value != "") {
		return cb(["sciflow-cite:" + args.value]);
	} else if (args.key.indexOf('sciflow-cite:') >= 0) {
		// we need this line only for pasted cites
		// but this is also why the typed in text also becomes a cite :-(
		// see also exports.aceCreateDomLine()
		return [args.key];
	}
};

// content collector is used when pasting text too
exports.collectContentPre = function(hook_name, args, cb) {
	
	if (args.cls.indexOf('sciflow-cite:') >= 0) {
		var regExpMatch;

		// if you find a cite-class in the pasted text, keep it
		if (regExpMatch = args.cls.match(/sciflow-cite:\S+(?:$| )/)) {
			args.cc.doAttrib(args.state, regExpMatch[0]);
		}
	}
};

// borrowed from github.com/redhog/ep_embedmedia
exports.aceCreateDomLine = function(hook_name, args, cb) {
	if (args.cls.indexOf('sciflow-cite:') >= 0) {
		var clss = [];
		var argClss = args.cls.split(" ");
		var value;

		// get the value from the classname
		for (var i = 0; i < argClss.length; i++) {
			var cls = argClss[i];
			if (cls.indexOf("sciflow-cite:") != -1) {
				value = cls.substr(cls.indexOf(":")+1);
				
				// if you delete the following line, you won't be able to copy/paste references
				// but if you leave the line, the text you type after a [cite] gets the cite-attribute too!
				// see also exports.aceAttribsToClasses()
				// how do i fix this?
				clss.push(cls);
			} else {
				clss.push(cls);
			}
		}

		return cb([{cls: clss.join(" "), extraOpenTags: '<span class="sciflow-cite" rel="'+value+'">', extraCloseTags: "</span>"}]);
	}

	return cb();
};