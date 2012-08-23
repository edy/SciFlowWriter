$(function(){
	$('.sciflow-cite').live('click', function(e) {
		var $$ = parent.parent.$; // use jQuery from the parent context

		var id = $(this).attr('rel');
		var type = $$('#referenceTypeInput').val();

		var id = $(this).attr('rel');
		var type = parent.parent._sfw.references[id].type;
		$$('#referenceIdInput').val(id);
		$$('#referenceTypeInput').val(type);
		$$('#referenceTypeInput').trigger('change');

		$$('#referencesPopup').modal('show');
	});
});