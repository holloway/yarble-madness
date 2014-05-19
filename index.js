(function(){
	"use strict";

	var	$ = yarble.utils.$,
        is_touch_device = yarble.utils.is_touch_device,
        CONSTANTS = {pageflip_hashstate: 'yarble:pageflip:hashstate'},
		prevent_default = function(){
			event.preventDefault();
		},
		$pages,
		page_index_by_id = {},
		pages_hashstate = {},
		$loading,
		init = function(){
			if(!window.localStorage) return alert("Yarble Madness needs a browser with localStorage");
			$pages = $("section");
			$loading = $("#loading")[0];
			if(css.transition_end) $loading.addEventListener(css.transition_end, loading_transition_end, false);
			var swiper = swiper_do_swipe($pages, swiper_do_swipe_effects.flat);
			init_hashstate(swiper);
			var $forms = $("form");
			for(var i = 0; i < $forms.length; i++){	$forms[i].addEventListener("submit", prevent_default); }
			$("html")[0].classList.add(is_touch_device ? "touch" : "notouch");
		},
		init_hashstate = function(swiper){
			window.addEventListener("beforeunload", beforeunload_hashstate);
			var localStorage_hashstate = localStorage.getItem(CONSTANTS.pageflip_hashstate);
			if(localStorage_hashstate){
				pages_hashstate = JSON.parse(localStorage_hashstate);
            }
            for(var i = 0; i < $pages.length; i++){
				page_index_by_id[$pages[i].id] = i;
            }
            swiper.onchange(swiper_change).oninit(swiper_change);
            window.addEventListener("hashchange", function(swiper){ return function(){hashstate_change(swiper);};}(swiper), false);
		},
		swiper_change = function(event, $page, index){
			var page_id = $page.id,
				hashstate = page_id;
			if(pages_hashstate[page_id]) hashstate = pages_hashstate[page_id];
			if(window.location.hash.replace(/^#/, '') !== hashstate) window.location.hash = hashstate;
        },
		hashstate_change = function(swiper){
			var hashstate =  window.location.hash.replace(/^#/, '').split("/"),
				page_index = page_index_by_id[hashstate[0]],
				scroll_to_top = false;

			if(page_index_by_id[hashstate[0]] !== undefined) { // if it's an actual page Id
				scroll_to_top = (pages_hashstate[hashstate[0]] !== hashstate.join("/"));
				pages_hashstate[hashstate[0]] = hashstate.join("/");
			}
			if(page_index !== undefined) swiper.move_to_page(page_index, scroll_to_top);
		},
		beforeunload_hashstate = function(){
			localStorage.setItem(CONSTANTS.pageflip_hashstate, JSON.stringify(pages_hashstate));
		};

	window.loading_on = function(){
		$loading.style.display = "block";
		$loading.classList.add("visible");
	};

	window.loading_off = function(){
		$loading.style.display = "block";
		$loading.classList.remove("visible");
	};

	var loading_transition_end = function(){
		if(!$loading.classList.contains("visible")){
			$loading.style.display = "none";
		} else {
			$loading.style.display = "block";
		}
	};

	document.addEventListener(init_event_id, init);

}());