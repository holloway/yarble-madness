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
			window.page_turner = page_turner_init($pages);
			init_hashstate(page_turner);
			init_post();
			var $forms = $("form");
			for(var i = 0; i < $forms.length; i++){	$forms[i].addEventListener("submit", prevent_default); }
			sa.register_network_failure_callback(network_failure);
			$("html")[0].classList.add(is_touch_device ? "touch" : "notouch");
			var detector = document.createElement("detect");
			detector.style.display = "flex";
			if(detector.style.display === "flex") {
				document.body.classList.add("flexbox");
			} else {
				document.body.classList.add("noflexbox");
			}
		},
		init_hashstate = function(page_turner){
			window.addEventListener("beforeunload", beforeunload_hashstate);
			var localStorage_hashstate = localStorage.getItem(CONSTANTS.pageflip_hashstate);
			if(localStorage_hashstate){
				pages_hashstate = JSON.parse(localStorage_hashstate);
            }
            for(var i = 0; i < $pages.length; i++){
				page_index_by_id[$pages[i].id] = i;
            }
            page_turner.onchange(page_turner_change).oninit(page_turner_change);
            window.addEventListener("hashchange", function(page_turner){ return function(){hashstate_change(page_turner);};}(page_turner), false);
		},
		init_post = function(){
			window.$post = $("#post")[0];
			window.$post.style.display = "block"; // has to be temporarily visible to calculate offsetHeight and such ..is hidden at end of this function
			window.$post._set_mode = function(mode){
				var text;
				switch(mode){
					case "edit-comment":
						text = "Update Comment";
						window.$post.$subject.style.display = "none";
						window.$post.$post_icons.style.display = "none";
						window.$post.$post_icon_button.style.display = "none";
						break;
					case "comment":
						text = "Post Comment";
						window.$post.$subject.style.display = "none";
						window.$post.$post_icons.style.display = "none";
						window.$post.$post_icon_button.style.display = "none";
						break;
					case "thread":
						text = "Post Thread";
						window.$post.$subject.style.display = "block";
						window.$post.$post_icon_button.style.display = "";
						break;
					default:
						alert("Internal error: Unknown mode " + mode);
				}
				window.$post.$submit.innerHTML = text;
			};
			
			window.$post.$subject = $(".subject", window.$post)[0];
			window.$post.$post_icons = $("#post_icons", window.$post)[0];
			window.$post.$post_icon_button = $(".post_icon", window.$post)[0];
			window.$post.$post_icon_button.addEventListener("click", function(){
				if(window.$post.$post_icons.style.display === "none"){
					window.$post.$post_icons.style.display = "";
				} else {
					window.$post.$post_icons.style.display = "none";
				}
			});
			window.$post.$post_icons.addEventListener("click", function(event){
				var target = event.target,
					id;
				if(target.nodeName.toLowerCase() !== "img") return;
				window.$post.$post_icon_button.style.backgroundImage = "url('" + target.getAttribute("src") +"')";
				window.$post.$post_icon_button.setAttribute("data-id", target.getAttribute("data-id") );
				window.$post.$post_icon_button.classList.add("has_icon");
				window.$post.$post_icons.style.display = "none";
			});
			window.$post.show = function(mode, quote_text_group_id, quote_text, post_icons, submit_callback){
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
				if(post_icons){
					window.$post.$post_icons.style.display = "none";
					window.$post.$post_icons.innerHTML = "";
					var post_icon,
						$img;
					for(var i = 0; i < post_icons.length; i++){
						post_icon = post_icons[i];
						if(post_icon.filename){
							$img = document.createElement("img");
							$img.setAttribute("src", "images/posticons/" + post_icon.filename);
							if(post_icon.text){
								$img.setAttribute("title", post_icon.text);
							}
							$img.setAttribute("data-id", post_icon.id);
							window.$post.$post_icons.appendChild($img);
						}
					}
				}
				window.$post.style.display = "block";
				window.$post.$textarea.style.height = (window.$post.offsetHeight - window.$post.$textarea.height_to_subtract - window.$post.$subject.offsetHeight) + "px";
			};
			window.$post.hide = function(){
				window.$post.style.display = "none";
			};
			window.$post.$submit = $(".submit", window.$post)[0];
			window.$post.$submit.after_submit = function(event){
				event.preventDefault();
				if(window.$post.$submit.after_submit_callback) {
					if(window.$post.$submit.last_submit_at && window.$post.$submit.last_submit_at > (new Date()).getTime() - 2000){ //don't allow repeated submissions within 2 seconds
						console.log("Preventing duplicate submission with within 2 seconds.");
						return;
					}
					window.$post.hide();
					window.$post.$submit.last_submit_at = (new Date()).getTime();
					window.$post.$submit.after_submit_callback(
						window.$post.$textarea.value,
						window.$post.$subject.value,
						window.$post.$post_icon_button.getAttribute("data-id")
					);
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
		page_turner_change = function(event, $page, $page_id){
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
		if(window.loading_timer) clearTimeout(window.loading_timer);
		window.loading_timer = setTimeout(loading_off, 10000);
	};

	window.loading_off = function(){
		if(window.loading_timer) clearTimeout(window.loading_timer);
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