(function(){
	"use strict";

    var CONSTANTS = {
            threads_cache_key: "yarble:page:threads:html"
        },
        $ = yarble.utils.$,
        $threads,
        current,
        threads,
        threads_template,
        allow_reloads_after_seconds = 10;

    var rebind_threads = function(threads){
        var threads_template_string;

        if(threads === undefined) {
            threads = JSON.parse(localStorage.getItem(CONSTANTS.threads_cache_key));
        } else {
            threads = JSON.parse(JSON.stringify(threads)); // we'll clone it http://stackoverflow.com/a/5344074 so that our modifications (such as copying into .column1 and .column2) don't accidentally leak back to the localStorage copy or any other version
        }
        if(!threads) return;
        current = {};
        current.forum_id = threads.forum_id;
        current.page_number = threads.page_number;
        current.when = Date.now();
        threads.pages = [];
        for(var i = 1; i < threads.last_page_number; i++){
            threads.pages.push({forum_id:threads.forum_id, page_number:i, same_page: !!(threads.page_number === i)});
        }
        if(!threads_template){
            threads_template_string = $("#threads-template")[0].innerHTML;
            threads_template = Handlebars.compile(threads_template_string);
        }
        $threads.innerHTML = threads_template(threads);
    };

    var threads_response = function(threads){
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
        if(!current || current.forum_id !== hashstate_forum_id || current.page_number !== hashstate_page_number || current.when > Date.now() - (allow_reloads_after_seconds * 1000)) {
            sa.threads(hashstate_forum_id, hashstate_page_number, threads_response);
        }
    };

    window.addEventListener("hashchange", hash_change, false);

}());