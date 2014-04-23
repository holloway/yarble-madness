(function(){
	"use strict";

    var CONSTANTS = {
            posts_cache_key: "yarble:page:posts:html"
        },
        $ = yarble.utils.$,
        $posts,
        current,
        posts_template,
        allow_reloads_after_seconds = 10;

	var rebind_posts = function(posts){
        var posts_template_string,
			i;

        if(posts === undefined) {
			posts = JSON.parse(localStorage.getItem(CONSTANTS.posts_cache_key));
        } else {
			posts = JSON.parse(JSON.stringify(posts)); // we'll clone it http://stackoverflow.com/a/5344074 so that our modifications (such as copying into .column1 and .column2) don't accidentally leak back to the localStorage copy or any other version
        }
        if(!posts) return;
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
			posts.pages.push({forum_id:posts.forum_id, thread_id:posts.thread_id, page_number:i, same_page: !!(posts.page_number === i)});
        }
        console.log("what", posts)

        $posts.innerHTML = posts_template(posts);
    };

    var posts_response = function(response, forum_id, thread_id, page_number, used_local_smilies, disabled_images){
        rebind_posts(response);
		// yes this will cache the previous settings
        localStorage.setItem(CONSTANTS.posts_cache_key, JSON.stringify(response));
    };

	window.yarble.utils.event.on("yarble:page-update:posts", posts_response);

	var click_button = function(event){
		if(!event.target) return;
		if(event.target.nodeName.toLowerCase() === "button" && event.target.classList.contains("disabled-image")){
			replace_all_occurences_of_image($("." + event.target.getAttribute("data-image-id")));
			event.preventDefault();
		} else if(event.target.nodeName.toLowerCase() === "button" && event.target.classList.contains("disabled-video")){
			replace_all_occurences_of_video($("." + event.target.getAttribute("data-video-id")));
			event.preventDefault();
		} else if(event.target.nodeName.toLowerCase() === "img" && event.target.classList.contains("timg")){
			event.target.classList.remove("timg");
			event.target.classList.add("timg-expanded");
		} else if(event.target.nodeName.toLowerCase() === "img" && event.target.classList.contains("timg-expanded")){
			event.target.classList.remove("timg-expanded");
			event.target.classList.add("timg");
		} else if(event.target.classList.contains("bbc-spoiler") && !event.target.classList.contains("on")){
			event.target.classList.add("on");
		}
	};

	var replace_all_occurences_of_image = function($images){
		for(var i = 0; i < $images.length; i++){
			var $image = $images[i];
			var $replacement_image = document.createElement("img");
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
			$link_to_video.style.width = $video.getAttribute("data-width") + "px";
			$link_to_video.style.height = $video.getAttribute("data-height") + "px";
			var $video_placeholder = document.createElement("img");
			$video_placeholder.setAttribute("src", "images/video.png");
			$link_to_video.appendChild($video_placeholder);
			$video.parentNode.replaceChild($link_to_video, $video);
		}
	};

	var init = function(){
		$posts = $("#posts")[0];
        $posts.addEventListener("click", click_button, false);
        rebind_posts();
	};

    document.addEventListener("DOMContentLoaded", init);

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