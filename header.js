(function(){
	// does the animation title screen
	// TODO: implement 'professional' mode
	
	"use strict";

	var $header,
		$marble,
		$marble_shadow,
		step = 1;

	var	$ = yarble.utils.$,
		init = function(){
			$header = $("body > header")[0];
			$header.addEventListener("click", discard_header);
			if(!yarble.utils.transition_end_event) return discard_header();
			$marble = $("#marble")[0];
			$marble_shadow = $("#marble_shadow")[0];
			$marble.addEventListener(yarble.utils.transition_end_event, next_marble_animation_step, false);
			$marble.classList.add("step1"); //starts animation
		},
		next_marble_animation_step = function(event){
			var className;
			step += 1;
			className = "step" + step;
			$marble.className += " " + className;
			$marble_shadow.className += " " + className;
			if(step === 4) fade_background();
			if(step === 5) show_logo();
		},
		fade_background = function(){
			var $tiles = $("body > header .tile"),
				i;

			for(i = 0; i < $tiles.length; i++){
				$tiles[i].classList.add("fade-out");
			}
		},
		show_logo = function(){
			var $logo = $("body > header .yarble-logo")[0];
			$logo.addEventListener(yarble.utils.transition_end_event, function(){
				setTimeout(fade_header, 500);
			}, false);
			$logo.classList.add("on");
		},
		fade_header = function(){
			if(!$header) return;
			$header.addEventListener(yarble.utils.transition_end_event, discard_header, false);
			$header.classList.add("fade");
		},
		discard_header = function(){
			$header.parentNode.removeChild($header);
			// get rid of some variables, help the garbage collector
			$header = undefined;
			$marble = undefined;
			$marble_shadow = undefined;
			step = undefined;
		};

	document.addEventListener("DOMContentLoaded", init);
}());