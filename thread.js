(function(){
	"use strict";

    var CONSTANTS = {
            thread_cache_key: "yarble:page:thread:html"
        },
        $ = yarble.utils.$,
        $thread,
        $poll,
        current,
        thread_template,
        poll_vote_template,
        poll_results_template,
        screen_width_buffer_pixels = 50,
        allow_reloads_after_seconds = 10,
        allow_resize_after_seconds = 1;

	var rebind_thread = function(thread, highlight_post_id){
        var thread_template_string,
			i,
			$imgs;

        if(thread === undefined) {
			thread = JSON.parse(localStorage.getItem(CONSTANTS.thread_cache_key));
        } else {
			thread = JSON.parse(JSON.stringify(thread)); // we'll clone it http://stackoverflow.com/a/5344074 so that our modifications (such as copying into .column1 and .column2) don't accidentally leak back to the localStorage copy or any other version
        }
        if(!thread) return;
        current = {};
        current.forum_id = parseInt(thread.forum_id, 10);
        current.thread_id = thread.thread_id;
        current.page_number = thread.page_number;
        current.when = Date.now();
        current.poll = thread.poll;
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
        for(i = 0; i < thread.thread.length; i++){
			if(window.disable_images){
				thread.thread[i].user.user_title = "";
			}
			if(window.cloud2butt){
				thread.thread[i].body = thread.thread[i].body.replace(/>[\s\S]*?</g, function(match){
					return match.replace(/cloud/g, 'butt');
				});
			}
			if(highlight_post_id && highlight_post_id === thread.thread[i].id){
				thread.thread[i].highlight_post_class = "highlight_post";
			}
        }
        $thread.innerHTML = thread_template(thread);
        //post processing
        $imgs = $("img", $thread);
        resize_images_if_necessary($imgs);
		for(i = 0; i < $imgs.length; i++){
			$imgs[i].addEventListener("load", resize_image_if_necessary);
		}
        adjust_page_selection_width();
    };

    var rebind_poll = function(){
		if(!poll_vote_template){
			poll_vote_template = Handlebars.compile($("#poll-vote-template")[0].innerHTML);
			poll_results_template = Handlebars.compile($("#poll-results-template")[0].innerHTML);
		}
		var $scrollable,
			$close,
			$submit;
		if(!current.poll) return false;
		if(!$poll) {
			$poll = $("#poll")[0];
		}
		$poll.innerHTML = poll_vote_template(current.poll);
		update_poll_height();
    };

    var update_poll_height = function(){
		if(!$poll) return;
		$poll = $("#poll")[0];
		var display_before = $poll.style.display;
		if(!display_before) {
			display_before = window.getComputedStyle($poll).display;
		}
		var $scrollable = $(".scrollable", $poll)[0];
		if(!$scrollable) return;
		$poll.style.display = "block";
		var $close = $(".close", $poll)[0];
		var $submit = $(".submit", $poll)[0];
		var height = $poll.offsetHeight;
		if($close) {
			height -= $close.offsetHeight;
		}
		if($submit){
			height -= $submit.offsetHeight;
		}
		$scrollable.style.height = height + "px";
		$poll.style.display = display_before;
    };

    var poll_submit = function(){
		if(!event.target) return;
		var poll_response = function(poll_id){
			sa.pollresults(poll_id, poll_results_callback);
		};
		var node_name = event.target.nodeName.toLowerCase();
		if(node_name === "button" && event.target.classList.contains("submit")){
			var inputs = $("input", $poll),
				poll_id,
				poll_options = [];

			for(var i = 0; i < inputs.length; i++){
				if(inputs[i].getAttribute("id") === "poll_id"){
					poll_id = inputs[i].getAttribute("value");
				} else if(inputs[i].checked) {
					poll_options.push(inputs[i].getAttribute("name"));
				}
			}
			loading_on();
			sa.submitpoll(poll_id, poll_options, poll_response);
		} else if(node_name === "button" && event.target.classList.contains("close")){
			$poll.style.display = "none";
		}
    };

    var poll_results_callback = function(poll_id, results){
		if(!poll_vote_template){
			poll_vote_template = Handlebars.compile($("#poll-vote-template")[0].innerHTML);
			poll_results_template = Handlebars.compile($("#poll-results-template")[0].innerHTML);
		}
		if(!$poll) {
			$poll = $("#poll")[0];
		}
		$poll.innerHTML = poll_results_template(results);
		$poll.style.display = "block";
		update_poll_height();
		loading_off();
    };

    var thread_response = function(response, forum_id, thread_id, page_number, used_local_smilies, disabled_images){
		loading_off();
        rebind_thread(response);
        localStorage.setItem(CONSTANTS.thread_cache_key, JSON.stringify(response));
    };

    var thread_response_at_post_id = function(post_id){
		return function(response, forum_id, thread_id, page_number, used_local_smilies, disabled_images){
			loading_off();
			rebind_thread(response, post_id);
			scroll_to_post(post_id);
			localStorage.setItem(CONSTANTS.thread_cache_key, JSON.stringify(response));
		};
    };

    var scroll_to_post = function(post_id) { // assumed to be in the current page
		var $post = $("#post" + post_id, $thread);
		if($post.length === 1) {
			var from_top = parseInt($post[0].getBoundingClientRect().top, 10);
			if(!window.swiper){
				return setTimeout(function(post_id){
					return function(){
						scroll_to_post(post_id);
					};
				}(post_id), 100);
			} // keep trying until window.swiper is there
			var scroll_y = window.swiper.get_scroll_y();
			if(!isNaN(from_top)) {
				swiper.scroll_to_y(from_top + scroll_y);
			}
		} else {
			console.log("internal error: unable to scroll to post id #" + post_id + ".");
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
		} else if(node_name === "button" && event.target.classList.contains("poll-available")){
			rebind_poll();
			$poll.style.display = "block";
		} else if(node_name === "button" && event.target.classList.contains("poll-result")){
			loading_on();
			var poll_id = event.target.getAttribute("data-poll-id");
			sa.pollresults(poll_id, poll_results_callback);
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
		} else if(node_name === "a"){
			event.preventDefault();
			event.stopPropagation();
			if(event.target.classList.contains("quote_link")){
				var href = event.target.getAttribute("href");
				post_id = yarble.utils.get_param(href, "postid");
				var $post = $("#post" + post_id, $thread);
				if($post.length === 1) {
					scroll_to_post(post_id);
				} else {
					sa.gotopost(post_id, gotopost_response);
				}
			}
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
		if(!event.target) return;
		var target = get_target(event.target),
			nodeName = target.nodeName.toLowerCase();

		if(nodeName === "select"){
			window.location.hash = target.value;
		}
	};

	var get_target = function(target){
        if (target.nodeType === Node.TEXT_NODE) return target.parentNode;
        return target;
    };

	var init = function(){
		window.addEventListener("resize", resize_images_if_necessary);
		window.addEventListener("orientationchange", resize_images_if_necessary);
		window.addEventListener("resize", update_poll_height);
		window.addEventListener("orientationchange", update_poll_height);
		window.addEventListener("hashchange", hash_change, false);
		$thread = $("#thread")[0];
        $thread.addEventListener("click", click_button, false);
        $thread.addEventListener("change", select_change, false);
        rebind_thread();
        $poll = $("#poll")[0];
        $poll.addEventListener("click", poll_submit, false);
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

    var announce_response = function(response){
		$thread.innerHTML = thread_template(response);
    };

    var hash_change = function(){
        var hashstate = window.location.hash.replace(/^#/, '').split("/");
        if(hashstate.length < 2) return;
        if(hashstate[0] !== "thread") return;
        var hashstate_forum_id,
			hashstate_thread_id,
            hashstate_page_number = 1,
            hashstate_post_id;

        if(hashstate[1] === "announcement"){
			hashstate_forum_id = parseInt(hashstate[2], 10);
			sa.announcement(hashstate_forum_id, true, window.disable_images, announce_response);
			return;
        }
        hashstate_forum_id = parseInt(hashstate[1], 10);
		hashstate_thread_id = hashstate[2];
        if(hashstate.length > 3) {
            hashstate_page_number = parseInt(hashstate[3], 10);
        }
        if(hashstate.length > 4) {
            hashstate_post_id = parseInt(hashstate[4], 10);
        }
        if(!current || current.forum_id !== hashstate_forum_id || current.thread_id !== hashstate_thread_id || current.page_number !== hashstate_page_number || current.when > Date.now() - (allow_reloads_after_seconds * 1000)) {
			loading_on();
			if(current && (current.forum_id !== hashstate_forum_id || current.thread_id !== hashstate_thread_id || current.page_number !== hashstate_page_number)) {
				$thread.innerHTML = thread_template({forum_id: hashstate_forum_id});
			}
			if(hashstate_post_id){
				sa.thread(hashstate_forum_id, hashstate_thread_id, hashstate_page_number, true, window.disable_images, thread_response_at_post_id(hashstate_post_id));
			} else {
				sa.thread(hashstate_forum_id, hashstate_thread_id, hashstate_page_number, true, window.disable_images, thread_response);
			}
        }
    };

}());