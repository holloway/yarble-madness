(function(){
	"use strict";

    var CONSTANTS = {
            posts_cache_key: "yarble:page:posts:html"
        },
        $ = yarble.utils.$,
        $posts,
        current = {},
        posts_template;

	var rebind_posts = function(posts){
        var posts_template_string;

        if(posts === undefined) {
            posts = JSON.parse(localStorage.getItem(CONSTANTS.posts_cache_key));
        }
        if(!posts) return;
        current.forum_id = threads.forum_id;
        current.thread_id = threads.thread_id;
        if(!posts_template){
            posts_template_string = $("#posts-template")[0].innerHTML;
            posts_template = Handlebars.compile(posts_template_string);
        }
        $posts.innerHTML = posts_template(posts);
    };

	window.yarble.utils.event.on("yarble:page-update:posts", function(response, forum_id, thread_id, page_number, used_local_smilies, disabled_images){
		console.log("posts", response, forum_id, thread_id, page_number, used_local_smilies, disabled_images);
        rebind_posts(response);
        localStorage.setItem(CONSTANTS.posts_cache_key, JSON.stringify(response));
    });

	var click_button = function(event){
		if(event.target){
			if(event.target.nodeName.toLowerCase() === "button" && event.target.classList.contains("disabled-image")){
				var src = event.target.getAttribute("data-image-src");
				replace_all_occurences_of_image($("." + event.target.getAttribute("data-image-id")), src);
			}
		}
	};

	var replace_all_occurences_of_image = function($images, src){
		for(var i = 0; i < $images.length; i++){
			var $image = $images[i];
			var $img = document.createElement("img");
			$img.setAttribute("src", src);
			$image.parentNode.replaceChild($img, $image);
		}
	};

	var init = function(){
		$posts = $("#posts")[0];
        $posts.addEventListener("click", click_button, false);
        rebind_posts();
	};

    document.addEventListener("DOMContentLoaded", init);

}());