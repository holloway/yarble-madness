(function(){
	"use strict";

    var CONSTANTS = {
            thread_cache_key: "yarble:page:thread:html"
        },
        $ = yarble.utils.$,
        $thread,
        $title,
        current,
        thread_template,
        screen_width_buffer_pixels = 50,
        allow_reloads_after_seconds = 10,
        allow_resize_after_seconds = 1;

	var rebind_thread = function(thread){
        var thread_template_string,
			i,
			$imgs;

        if(thread === undefined) {
			thread = JSON.parse(localStorage.getItem(CONSTANTS.thread_cache_key));
        } else {
			thread = JSON.parse(JSON.stringify(thread)); // we'll clone it http://stackoverflow.com/a/5344074 so that our modifications (such as copying into .column1 and .column2) don't accidentally leak back to the localStorage copy or any other version
        }
        if(!thread) return;
        $title.innerText = thread.title;
        current = {};
        current.forum_id = parseInt(thread.forum_id, 10);
        current.thread_id = thread.thread_id;
        current.page_number = thread.page_number;
        current.when = Date.now();
        if(!thread_template){
            thread_template_string = $("#thread-template")[0].innerHTML;
            thread_template = Handlebars.compile(thread_template_string);
        }
        thread.previous_page_number = thread.page_number - 1;
        if(thread.previous_page_number < 1) thread.previous_page_number = 1;
        thread.next_page_number = thread.page_number + 1;
        if(thread.next_page_number > thread.last_page_number) thread.next_page_number = thread.last_page_number;
        thread.page_number_is_bigger_than_1 = (thread.page_number > 1);
        
        thread.pages = [];
        for(i = 1; i <= thread.last_page_number; i++){ // i = 1 because page numbers start counting at 1
			thread.pages.push({forum_id:thread.forum_id, thread_id:thread.thread_id, page_number:i, same_page: !!(thread.page_number === i), same_page_option_selection: !!(thread.page_number === i) ? 'selected="selected"' : ""});
        }
        if(window.disable_images){
			for(i = 0; i < thread.thread.length; i++){
				thread.thread[i].user.user_title = "";
			}
		}
        $thread.innerHTML = thread_template(thread);
        //post processing
        $imgs = $("img", $thread);
        resize_images_if_necessary($imgs);
		for(i = 0; i < $imgs.length; i++){
			$imgs[i].addEventListener("load", resize_image_if_necessary);
		}
		//var hashstate = window.get_hash_state();
        //if(hashstate && hashstate.length === 5) { //then there's a postid in the url that we should scroll to
		//	scroll_to_post(hashstate[4]);
        //}
        adjust_page_selection_width();
    };

    var thread_response = function(response, forum_id, thread_id, page_number, used_local_smilies, disabled_images){
		loading_off();
        rebind_thread(response);
        localStorage.setItem(CONSTANTS.thread_cache_key, JSON.stringify(response));
    };

    var scroll_to_post = function(post_id) { // assumed to be in the current page
		var $post = $("#post" + post_id, $thread);
		if($post.length === 1) {
			var from_top = window.scrollY + parseInt($post[0].getBoundingClientRect().top, 10);
			if(!isNaN(from_top)) {
				window.scrollTo(0, from_top);
			} else {
				window.scrollTo(0, 0);
			}
		} else {
			window.scrollTo(0, 0);
		}
	};

	var resize_images_if_necessary = function($imgs){
		if(!current) return;
		if(current.last_resize + (allow_resize_after_seconds * 1000) > Date.now()) return;
		var	$img,
			screen_width = window.innerWidth - screen_width_buffer_pixels;
		if(!$imgs) $imgs = $("img", $thread);
		for(var i = 0; i < $imgs.length; i++){
			$img = $imgs[i];
			if($img.classList.contains("width-set")) continue;
			$img.style.width = "auto";
			if($img.offsetWidth > 6){ //then it's been loaded...6px because offsetWidth can include borders which means the image could still not be loaded but register a width of greater-than zero. So 6px is just an arbitrary choice bigger than someone might choose for a border (e.g. 3px each horizontal side)
				if($img.classList.contains("user-title")){
					var shrink_user_profile_images_by = (window.devicePixelRatio && window.devicePixelRatio > 1) ? window.devicePixelRatio : 2;
					$img.style.maxWidth = ($img.offsetWidth / shrink_user_profile_images_by) + "px";
				} else {
					$img.style.maxWidth = $img.offsetWidth + "px";
				}
				$img.classList.add("width-set");
			}
			$img.style.width = "";
		}
	};

	var resize_image_if_necessary = function(){
		resize_images_if_necessary([event.target]);
	};

	var quote_post_response = function(quote_text, forum_id, thread_id, post_id){
		loading_off();
		window.$post.show("comment", "thread:" + thread_id, quote_text, function(forum_id, thread_id){
			return function(text_content){
				if(text_content.length === 0) return;
				sa.submitpost(forum_id, thread_id, text_content, successful_post);
			};
		}(forum_id, thread_id));
	};

	var successful_post = function(forum_id, thread_id){
		sa.lastpost(thread_id, lastpost_response);
	};

	var lastpost_response = function(forum_id, thread_id, last_page_number){
        window.location.hash = "thread/" + forum_id + "/" + thread_id + "/" + last_page_number;
    };

    var edit_post_response = function(text_content, forum_id, thread_id, post_id){
		loading_off();
		window.$post.show("edit-comment", undefined, text_content, function(forum_id, thread_id, post_id){
			return function(text_content){
				if(text_content.length === 0) return;
				console.log("TRYING TO UPDATE CONTENT", text_content, post_id);
				sa.updatepost(forum_id, thread_id, post_id, text_content, successful_edit);
			};
		}(forum_id, thread_id, post_id));
	};

	var successful_edit = function(forum_id, thread_id, post_id){
		sa.gotopost(post_id, editpost_response);
	};

	var editpost_response = function(forum_id, thread_id, post_id, page_number){
		window.location.hash = "thread/" + forum_id + "/" + thread_id + "/" + page_number + "/" + post_id;
	};

	var click_button = function(event){
		if(!event.target) return;
		var forum_id,
			thread_id,
			post_id;

		var node_name = event.target.nodeName.toLowerCase();
		if(node_name === "button" && event.target.classList.contains("disabled-image")){
			replace_all_occurences_of_image($("." + event.target.getAttribute("data-image-id")));
			event.preventDefault();
		} else if(node_name === "button" && event.target.classList.contains("disabled-video")){
			replace_all_occurences_of_video($("." + event.target.getAttribute("data-video-id")));
			event.preventDefault();
		} else if(node_name === "button" && event.target.classList.contains("quote")){
			forum_id = event.target.getAttribute("data-forum-id");
			thread_id = event.target.getAttribute("data-thread-id");
			post_id = event.target.getAttribute("data-post-id");
			if(forum_id && post_id && thread_id){
				loading_on();
				return sa.quotepost(forum_id, thread_id, post_id, quote_post_response);
			}
			alert("Internal error: Unable to quote post without data-thread-id and data-post-id attributes");
		} else if(node_name === "button" && event.target.classList.contains("edit")){
			forum_id = event.target.getAttribute("data-forum-id");
			thread_id = event.target.getAttribute("data-thread-id");
			post_id = event.target.getAttribute("data-post-id");
			if(forum_id && post_id && thread_id){
				loading_on();
				return sa.editposttext(forum_id, thread_id, post_id, edit_post_response);
			}
			alert("Internal error: Unable to quote post without data-thread-id and data-post-id attributes");
		} else if(node_name === "img"){
			if(event.target.classList.contains("timg")){
				event.target.classList.remove("timg");
				event.target.classList.add("img");
			} else if(event.target.classList.contains("img")){
				event.target.classList.remove("img");
				event.target.classList.add("timg");
			}
		} else if(event.target.classList.contains("bbc-spoiler") && !event.target.classList.contains("on")){
			event.target.classList.add("on");
			resize_images_if_necessary($("img", event.target));
		} else if(node_name === "a" && event.target.classList.contains("quote_link")){
			var href = event.target.getAttribute("href");
			post_id = yarble.utils.get_param(href, "postid");
			var $post = $("#post" + post_id, $thread);
			if($post.length === 1) {
				scroll_to_post(post_id);
			} else {
				sa.gotopost(post_id, gotopost_response);
			}
			event.preventDefault();
		}
	};

	var gotopost_response = function(forum_id, thread_id, post_id, page_number){
		if(current.forum_id === forum_id && current.thread_id === thread_id && current.page_number === page_number) {
			scroll_to_post(post_id);
		} else {
			window.location.hash = "thread/" + forum_id + "/" + thread_id + "/" + page_number + "/" + post_id;
		}
	};

	var replace_all_occurences_of_image = function($images){
		for(var i = 0; i < $images.length; i++){
			var $image = $images[i];
			var $replacement_image = document.createElement("img");
			$replacement_image.addEventListener("load", resize_image_if_necessary);
			$replacement_image.classList.add("img");
			$replacement_image.setAttribute("src", $image.getAttribute("data-image-src")); //although each image should have the same @data-image-src attribute we don't cache the lookup incase they are different due to hash collisions
			$image.parentNode.replaceChild($replacement_image, $image);
		}
	};

	var replace_all_occurences_of_video = function($videos){
		for(var i = 0; i < $videos.length; i++){
			var $video = $videos[i];
			var $link_to_video = document.createElement("a");
			$link_to_video.classList.add("video-player");
			$link_to_video.setAttribute("href", $video.getAttribute("data-video-src"));
			if($video.getAttribute("data-thumbnail-url").length){
				$link_to_video.setAttribute("style", "background-image: url('" + $video.getAttribute("data-thumbnail-url") + "')");
			}
			var $video_placeholder = document.createElement("img");
			$video_placeholder.setAttribute("src", "images/video.png");
			$video_placeholder.classList.add("video_play_button");
			$link_to_video.appendChild($video_placeholder);
			$video.parentNode.replaceChild($link_to_video, $video);
		}
	};

	var select_change = function(event){
		window.location.hash = event.target.value;
	};

	var init = function(){
		window.addEventListener("resize", resize_images_if_necessary);
		window.addEventListener("orientationchange", resize_images_if_necessary);
		window.addEventListener("hashchange", hash_change, false);
		$thread = $("#thread")[0];
		$title = $("title")[0];
        $thread.addEventListener("click", click_button, false);
        $thread.addEventListener("change", select_change, false);
        rebind_thread();
	};

    document.addEventListener(init_event_id, init);
   
    var adjust_page_selection_width = function(event){
		var i;
		var $top_pages = $(".pages", $thread)[0]; //because there are two in a page, one at the top, one at the bottom
		var remaining_width = $top_pages.offsetWidth;
		var $not_selects = $(".not-select", $top_pages);
		for(i = 0; i < $not_selects.length; i++){
			remaining_width -= $not_selects[i].offsetWidth;
		}
		remaining_width -= 4;
		var $selects = $(".pages select", $thread);
		for(i = 0; i < $selects.length; i++){
			$selects[i].style.width = remaining_width + "px";
		}
    };

    var hash_change = function(){
        var hashstate = window.location.hash.replace(/^#/, '').split("/");
        if(hashstate.length < 2) return;
        if(hashstate[0] !== "thread") return;
        var hashstate_forum_id = parseInt(hashstate[1], 10),
			hashstate_thread_id = hashstate[2],
            hashstate_page_number = 1;
        if(hashstate.length > 3) {
            hashstate_page_number = parseInt(hashstate[3], 10);
        }
        if(!current || current.forum_id !== hashstate_forum_id || current.thread_id !== hashstate_thread_id || current.page_number !== hashstate_page_number || current.when > Date.now() - (allow_reloads_after_seconds * 1000)) {
			loading_on();
			if(current && (current.forum_id !== hashstate_forum_id || current.thread_id !== hashstate_thread_id || current.page_number !== hashstate_page_number)) {
				$thread.innerHTML = thread_template({forum_id: hashstate_forum_id});
			}
            sa.thread(hashstate_forum_id, hashstate_thread_id, hashstate_page_number, true, window.yarble.disable_images, thread_response);
        }
    };

}());