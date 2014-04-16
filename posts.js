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

	var parse_posts_html = function(forum_id, thread_id, page_number, html_string){
		var $div = document.createElement("div"),
			$posts_container,
			$posts,
			$post,
			response = {
				forum_id: forum_id,
				thread_id: thread_id,
				page_number:page_number,
				posts:[]},
			i,
			post;

		html_string = html_string.replace(/<!--[\s\S]*?-->/g, '');
		html_string = html_string.replace(/^[\s\S]*?<div id="thread"/g, '<div id="thread"');
		html_string = html_string.replace(/<div class="threadbar bottom">[\s\S]*$/, '');
		html_string = html_string.replace(/<ul class="postbuttons">[\s\S]*?<\/ul>/g, '');
		html_string = html_string.replace(/<dd class="title">[\s\S]*?<\/dd>/g, '');
		
		$div.innerHTML = html_string; // we can't run yarble.utils.remove_external_resources on this because we actually want the external resources (posts containing images, for example), and at least this will start the browser downloading them

		$posts_container = $("#thread", $div)[0];

		$posts = $("table", $posts_container);

		for(i = 0; i < $posts.length; i++){
			$post = $posts[i];
			post = {
				body: $(".postbody", $post)[0].innerHTML,
				postdate: $(".postdate", $post)[0].innerHTML.replace(/<a[\s\S]*?<\/a>/g, ''),
				user: {
					name: $(".author", $post)[0].innerHTML,
					user_id: window.yarble.utils.get_param($(".user_jump", $post)[0].getAttribute("href"), "userid"),
					registered: $(".registered", $post)[0].innerHTML,
				},
			};
			response.posts.push(post);
		}
		console.log(response);
		return response;
	};

	window.yarble.utils.event.on("yarble:page-update:posts", function(forum_id, thread_id, page_number, html_string){
        var posts = parse_posts_html(forum_id, thread_id, page_number, html_string);
        rebind_posts(posts);
        localStorage.setItem(CONSTANTS.posts_cache_key, JSON.stringify(posts));
    });

	var click_button = function(){

	};

	var init = function(){
		$posts = $("#posts")[0];
        $posts.addEventListener("click", click_button, false);
        rebind_posts();
	};

    document.addEventListener("DOMContentLoaded", init);

}());