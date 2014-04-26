(function(){
	"use strict";

    var CONSTANTS = {
            posts_cache_key: "yarble:page:posts:html"
        },
        $ = yarble.utils.$,
        $posts,
        $title,
        current,
        posts_template,
        screen_width_buffer_pixels = 50,
        allow_reloads_after_seconds = 10,
        allow_resize_after_seconds = 1;

	var rebind_posts = function(posts){
        var posts_template_string,
			i,
			$imgs;

        if(posts === undefined) {
			posts = JSON.parse(localStorage.getItem(CONSTANTS.posts_cache_key));
        } else {
			posts = JSON.parse(JSON.stringify(posts)); // we'll clone it http://stackoverflow.com/a/5344074 so that our modifications (such as copying into .column1 and .column2) don't accidentally leak back to the localStorage copy or any other version
        }
        if(!posts) return;
        $title.innerText = posts.title;
        current = {};
        current.forum_id = posts.forum_id;
        current.thread_id = posts.thread_id;
        current.page_number = posts.page_number;
        current.when = Date.now();
        if(!posts_template){
            posts_template_string = $("#posts-template")[0].innerHTML;
            posts_template = Handlebars.compile(posts_template_string);
        }
        posts.previous_page_number = posts.page_number - 1;
        if(posts.previous_page_number < 1) posts.previous_page_number = 1;
        posts.next_page_number = posts.page_number + 1;
        if(posts.next_page_number > posts.last_page_number) posts.next_page_number = posts.last_page_number;
        posts.page_number_is_bigger_than_1 = (posts.page_number > 1);
        
        posts.pages = [];
        for(i = 1; i <= posts.last_page_number; i++){
			posts.pages.push({forum_id:posts.forum_id, thread_id:posts.thread_id, page_number:i, same_page: !!(posts.page_number === i), same_page_option_selection: !!(posts.page_number === i) ? 'selected="selected"' : ""});
        }
        $posts.innerHTML = posts_template(posts);
        //post processing
        $imgs = $("img", $posts);
        resize_images_if_necessary($imgs);
		for(i = 0; i < $imgs.length; i++){
			$imgs[i].addEventListener("load", resize_image_if_necessary);
		}
		var hashstate = window.get_hash_state();
        if(hashstate.length === 5) { //then there's a postid in the url that we should scroll to
			scroll_to_post(hashstate[4]);
        } else {
			window.scrollTo(0, 0); // any change should scroll to top
        }
        adjust_page_selection_width();
    };

    var posts_response = function(response, forum_id, thread_id, page_number, used_local_smilies, disabled_images){
        rebind_posts(response);
        localStorage.setItem(CONSTANTS.posts_cache_key, JSON.stringify(response));
    };

    var scroll_to_post = function(post_id) { // assumed to be in the current page
		var $post = $("#post" + post_id, $posts);
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

	window.yarble.utils.event.on("yarble:page-update:posts", posts_response);

	var resize_images_if_necessary = function($imgs){
		if(current.last_resize + (allow_resize_after_seconds * 1000) > Date.now()) return;
		var	$img,
			screen_width = window.innerWidth - screen_width_buffer_pixels;
		if(!$imgs) $imgs = $("img", $posts);
		for(var i = 0; i < $imgs.length; i++){
			$img = $imgs[i];
			if($img.classList.contains("width-set")) continue;
			$img.style.width = "auto";
			if($img.offsetWidth > 0){ //then it's been loaded
				$img.style.maxWidth = $img.offsetWidth + "px";
				$img.classList.add("width-set");
			}
			$img.style.width = "";
		}
	};

	var resize_image_if_necessary = function(){
		resize_images_if_necessary([event.target]);
	};

	var click_button = function(event){
		if(!event.target) return;
		if(event.target.nodeName.toLowerCase() === "button" && event.target.classList.contains("disabled-image")){
			replace_all_occurences_of_image($("." + event.target.getAttribute("data-image-id")));
			event.preventDefault();
		} else if(event.target.nodeName.toLowerCase() === "button" && event.target.classList.contains("disabled-video")){
			replace_all_occurences_of_video($("." + event.target.getAttribute("data-video-id")));
			event.preventDefault();
		} else if(event.target.nodeName.toLowerCase() === "img"){
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
		} else if(event.target.nodeName.toLowerCase() === "a" && event.target.classList.contains("quote_link")){
			var href = event.target.getAttribute("href");
			var post_id = yarble.utils.get_param(href, "postid");
			var $post = $("#post" + post_id, $posts);
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
			window.set_hash_state("posts/" + forum_id + "/" + thread_id + "/" + page_number + "/" + post_id);
		}
	};

	var replace_all_occurences_of_image = function($images){
		for(var i = 0; i < $images.length; i++){
			var $image = $images[i];
			var $replacement_image = document.createElement("img");
			$replacement_image.addEventListener("load", resize_image_if_necessary);
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
		window.set_hash_state(event.target.value);
	};

	var init = function(){
		$posts = $("#posts")[0];
		$title = $("title")[0];
        $posts.addEventListener("click", click_button, false);
        $posts.addEventListener("change", select_change, false);
        rebind_posts();
	};

    document.addEventListener("DOMContentLoaded", init);

    window.addEventListener("resize", resize_images_if_necessary);
    window.addEventListener("orientationchange", resize_images_if_necessary);

    var adjust_page_selection_width = function(event){
		var i;
		var $top_pages = $(".pages", $posts)[0]; //because there are two in a page, one at the top, one at the bottom
		var remaining_width = $top_pages.offsetWidth;
		var $not_selects = $(".not-select", $top_pages);
		for(i = 0; i < $not_selects.length; i++){
			remaining_width -= $not_selects[i].offsetWidth;
		}
		remaining_width -= 4;
		var $selects = $(".pages select", $posts);
		for(i = 0; i < $selects.length; i++){
			$selects[i].style.width = remaining_width + "px";
		}
    };

    window.addEventListener("resize", adjust_page_selection_width);
    window.addEventListener("orientationchange", adjust_page_selection_width);

    var hash_change = function(){
        var hashstate = window.get_hash_state();
        if(hashstate.length < 2) return;
        if(hashstate[0] !== "posts") return;
        var hashstate_forum_id = parseInt(hashstate[1], 10),
			hashstate_thread_id = hashstate[2],
            hashstate_page_number = 1;
        if(hashstate.length > 3) {
            hashstate_page_number = parseInt(hashstate[3], 10);
        }
        if(!current || current.forum_id !== hashstate_forum_id || current.thread_id !== hashstate_thread_id || current.page_number !== hashstate_page_number || current.when > Date.now() - (allow_reloads_after_seconds * 1000)) {
            sa.posts(hashstate_forum_id, hashstate_thread_id, hashstate_page_number, true, window.yarble.disable_images, posts_response);
        }
    };
	
    window.addEventListener("hashchange", hash_change, false);

}());