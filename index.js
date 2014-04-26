(function(){
	"use strict";

	
	
	var	$ = yarble.utils.$,
		init = function(){
			if(!window.localStorage) return alert("Yarble Madness needs a browser with localStorage");
			var is_touch_device = 'ontouchstart' in document.documentElement;
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

			$("html")[0].classList.add(is_touch_device ? "touch" : "notouch");
		};

	document.addEventListener(init_event_id, init);

}());