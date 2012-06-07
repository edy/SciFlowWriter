$(function(){
	$('.sciflow-graphic').live('click', function(e) {
		var id = $(this).attr('rel');
		var $$ = parent.parent.$; // use jQuery from the parent context

		if (parent.parent._sfw.images[id]) {
			var image = parent.parent._sfw.images[id];
			// load image data into modal window
			
			$$('#imageUrl').attr('src', '/p/'+parent.parent.pad.getPadId()+'/datastore/images/'+image.filename);
			$$('#imageCaptionInput').val(image.caption);
	  		$$('#imageIdInput').val(id);
			
			$$('#imagesPopup').modal('show');
		} else {
			alert('Image not found');
		}
	});
});