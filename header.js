(function(){
	"use strict";

	var $marble;

	var	$ = yarble.utils.$,
		init = function(){
			var $marble = $("#marble")[0];
			$marble.classList.add("step1");

			};

	document.addEventListener("DOMContentLoaded", init);

}());
