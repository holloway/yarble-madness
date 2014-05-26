(function(){
	"use strict";

	var	$ = yarble.utils.$,
        is_touch_device = yarble.utils.is_touch_device,
        CONSTANTS = {pageflip_hashstate: 'yarble:pageflip:hashstate'},
		prevent_default = function(event){
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
			window.swiper = swiper_do_swipe($pages, swiper_do_swipe_effects.flat);
			init_hashstate(swiper);
			init_post();
			var $forms = $("form");
			for(var i = 0; i < $forms.length; i++){	$forms[i].addEventListener("submit", prevent_default); }
			sa.register_network_failure_callback(network_failure);
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
		init_post = function(){
			window.$post = $("#post")[0];
			window.$post.style.display = "block"; // has to be temporarily visible to calculate offsetHeight and such ..is hidden at end of this function
			window.$post._set_mode = function(mode){
				var text;
				switch(mode){
					case "edit-comment":
						text = "Update Comment";
						break;
					case "comment":
						text = "Post Comment";
						break;
					case "thread":
						text = "Post Thread(!)";
						break;
					default:
						alert("Internal error: Unknown mode " + mode);
				}
				window.$post.$submit.innerHTML = text;
			};
			window.$post.show = function(mode, quote_text_group_id, quote_text, submit_callback){
				if(mode) {
					window.$post._set_mode(mode);
					if(quote_text_group_id && quote_text) { // quote_text_group_id is typically a thread_id... when quote_text_group_id is the same as previous we append quote_text, otherwise we overwrite
						if(window.$post.quote_text_group_id && window.$post.quote_text_group_id !== quote_text_group_id){
							window.$post.$textarea.value = "";
						}
						window.$post.$textarea.value += quote_text;
						window.$post.quote_text_group_id = quote_text_group_id;
					} else if(quote_text) {
						window.$post.$textarea.value = quote_text;
					}
				}
				if(submit_callback){
					window.$post.$submit.after_submit_callback = submit_callback;
				}
				window.$post.style.display = "block";
				window.$post.$textarea.style.height = (window.$post.offsetHeight - window.$post.$textarea.height_to_subtract) + "px";
			};
			window.$post.hide = function(){
				window.$post.style.display = "none";
			};
			window.$post.$submit = $(".submit", window.$post)[0];
			window.$post.$submit.after_submit = function(event){
				event.preventDefault();
				if(window.$post.$submit.after_submit_callback) {
					window.$post.hide();
					window.$post.$submit.after_submit_callback(window.$post.$textarea.value);
					return;
				}
				alert("Internal error: No callback registered to $window.post.show()");
			};
			window.$post.$submit.addEventListener("click", window.$post.$submit.after_submit, false);
			window.$post.$textarea = $("textarea", window.$post)[0];
			window.$post.$close = $(".close", window.$post)[0];
			window.$post.$close.addEventListener("click", window.$post.hide, false);
			window.$post.$clear = $(".clear", window.$post)[0];
			window.$post.$clear.click = function(){
				if(confirm("Are you sure you want to clear it?")) window.$post.$textarea.value = "";
			};
			window.$post.$clear.addEventListener("click", window.$post.$clear.click, false);
			window.$post.$textarea.height_to_subtract = window.$post.$close.offsetHeight + window.$post.$submit.offsetHeight;
			window.$post.style.display = "none";
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
		},
		network_failure = function(){
			loading_off();
			alert("Network error. If you're testing in desktop Chrome be sure to start as (e.g.) chrome --disable-web-security");
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