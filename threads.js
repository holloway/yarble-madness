(function(){
	"use strict";

    var CONSTANTS = {
            threads_cache_key: "yarble:page:threads:html"
        },
        $ = yarble.utils.$,
        $threads,
        current = {},
        threads,
        threads_template;

    var rebind_threads = function(threads){
        var threads_template_string;

        if(threads === undefined) {
            threads = JSON.parse(localStorage.getItem(CONSTANTS.threads_cache_key));
        }
        if(!threads) return;
        current.forum_id = threads.forum_id;
        current.page_number = threads.page_number;
        if(!threads_template){
            threads_template_string = $("#threads-template")[0].innerHTML;
            threads_template = Handlebars.compile(threads_template_string);
        }
        $threads.innerHTML = threads_template(threads);
    };

    var threads_response = function(threads){
        console.log("threads", threads);
        rebind_threads(threads);
        localStorage.setItem(CONSTANTS.threads_cache_key, JSON.stringify(threads));
    };

    window.yarble.utils.event.on("yarble:page-update:threads", threads_response);

    var init = function(event){
        $threads = $("#threads")[0];
        $threads.addEventListener("click", click_button, false);
        rebind_threads();
    };

    document.addEventListener("DOMContentLoaded", init);

    var click_button = function(event){
        var target = event.target;
        if(target.nodeName.toLowerCase() !== "button") target = target.parentNode;
        if(target.nodeName.toLowerCase() !== "button") return;

        var thread_id = target.getAttribute("data-thread-id");
        sa.posts(current.forum_id, thread_id, 1, true, true, posts_response);
    };

    var posts_response = function(response, forum_id, thread_id, page_number, used_local_smilies, disabled_images){
        window.yarble.utils.event.trigger("yarble:page-update:posts", response, forum_id, thread_id, page_number, used_local_smilies, disabled_images);
        window.yarble.utils.event.trigger("yarble:change-page-id", "posts/" + forum_id + "/" + thread_id + "/" + page_number);
    };

    var hash_change = function(){
        var hashstate = window.get_hash_state();
        if(hashstate.length < 2) return;
        if(hashstate[0] !== "threads") return;
        var hashstate_forum_id = hashstate[1],
            hashstate_page_number = 1;
        if(hashstate.length > 2) {
            hashstate_page_number = hashstate[2];
        }

        if(!current || current.forum_id !== hashstate_forum_id || current.page_number !== hashstate_page_number) {
            console.log("reload threads")
            sa.threads(hashstate_forum_id, hashstate_page_number, threads_response);
        } else {
            console.log("don't reload threads");
        }
    };

    window.addEventListener("hashchange", hash_change, false);

}());