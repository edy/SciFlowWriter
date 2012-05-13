$(function(){
	$('.sciflow-cite').live('click', function(e) {
		var id = $(this).attr('rel');
		var $$ = parent.parent.$; // use jQuery from the parent context

		var ucfirst = function(text) {
			return text.charAt(0).toUpperCase() + text.substr(1);
		}

		$$.each(['type', 'title', 'authors', 'url', 'year', 'month', 'publisher', 'journal'], function(i, value) {
  			$$('#reference' + ucfirst(value) + 'Input').val(parent.parent.sfw.references[id][value]);
  		});

  		$$('#referenceIdInput').val(id);

		$$('#referencesPopup').modal('show');
	});
});