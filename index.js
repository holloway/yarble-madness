(function(){
	"use strict";

	if(!window.localStorage) return alert("Yarble Madness needs a browser with localStorage");

	var	$ = yarble.utils.$,
		init = function(){
			var $forms = $("form"),
				$form,
				i,
				do_not_submit = function(event){
					event.preventDefault();
				};

			for(i = 0; i < $forms.length; i++){
				$form = $forms[i];
				$form.addEventListener("submit", do_not_submit);
			}
		};

	document.addEventListener("DOMContentLoaded", init);

}());