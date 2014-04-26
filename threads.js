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
        var threads_template_string,
            thread,
            i;

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
        for(i = 1; i <= threads.last_page_number; i++){ //starting at 1 because page counts start from 1 (obv)
            threads.pages.push({forum_id:threads.forum_id, page_number:i, same_page: !!(threads.page_number === i), same_page_option_selection: !!(threads.page_number === i) ? 'selected="selected"' : ""});
        }
        for(i = 0; i < threads.threads.length; i++){
            thread = threads.threads[i];
            if(thread.posticon && posticons_cache[thread.posticon]) {
                thread.has_posticon_url = true;
                thread.posticon_url = "images/posticons/" + posticons_cache[thread.posticon].filename;
            }
        }
        threads.previous_page_number = threads.page_number - 1;
        threads.next_page_number = threads.page_number + 1;
        threads.last_page_number = threads.last_page_number;
        if(threads.previous_page_number < 1) threads.previous_page_number = 1;
        if(threads.next_page_number > threads.last_page_number) threads.next_page_number = threads.last_page_number;

        if(!threads_template){
            threads_template_string = $("#threads-template")[0].innerHTML;
            threads_template = Handlebars.compile(threads_template_string);
        }
        $threads.innerHTML = threads_template(threads);
        adjust_page_selection_width();
        window.scrollTo(0, 0); // any change should scrollTo
    };

    var threads_response = function(threads){
        rebind_threads(threads);
        localStorage.setItem(CONSTANTS.threads_cache_key, JSON.stringify(threads));
    };

    var select_change = function(event){
        window.set_hash_state(event.target.value);
    };

    window.yarble.utils.event.on("yarble:page-update:threads", threads_response);

    var init = function(event){
        $threads = $("#threads")[0];
        $threads.addEventListener("click", click_button, false);
        $threads.addEventListener("change", select_change, false);
        rebind_threads();
    };

    document.addEventListener("DOMContentLoaded", init);

    var click_button = function(event){
        var target = event.target,
            thread_id;
        if(target.nodeName.toLowerCase() !== "button") target = target.parentNode;
        if(target.nodeName.toLowerCase() !== "button") return;

        if(target.classList.contains("firstpost")){
            thread_id = target.getAttribute("data-thread-id");
            sa.posts(current.forum_id, thread_id, 1, true, true, posts_response);
        } else if(target.classList.contains("newpost")) {
            thread_id = target.getAttribute("data-thread-id");
            sa.newpost(thread_id, newpost_response);
        } else if(target.classList.contains("lastpost")) {
            thread_id = target.getAttribute("data-thread-id");
            sa.lastpost(thread_id, lastpost_response);
        }
    };

    var posts_response = function(response, forum_id, thread_id, page_number, used_local_smilies, disabled_images){
        window.yarble.utils.event.trigger("yarble:page-update:posts", response, forum_id, thread_id, page_number, used_local_smilies, disabled_images);
        window.yarble.utils.event.trigger("yarble:change-page-id", "posts/" + forum_id + "/" + thread_id + "/" + page_number);
    };

    var lastpost_response = function(forum_id, thread_id, last_page_number){
        //TODO: replace this with a preload approach like posts_response
        window.set_hash_state("posts/" + forum_id + "/" + thread_id + "/" + last_page_number);
    };

    var newpost_response = function(forum_id, thread_id, new_page_number){
        //TODO: replace this with a preload approach like posts_response
        window.set_hash_state("posts/" + forum_id + "/" + thread_id + "/" + new_page_number);
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

    var adjust_page_selection_width = function(event){
        var i;
        var $top_pages = $(".pages", $threads)[0]; //because there are two in a page, one at the top, one at the bottom
        var remaining_width = $top_pages.offsetWidth;
        var $not_selects = $(".not-select", $top_pages);
        for(i = 0; i < $not_selects.length; i++){
            remaining_width -= $not_selects[i].offsetWidth;
        }
        remaining_width -= 4;
        var $selects = $(".pages select", $threads);
        for(i = 0; i < $selects.length; i++){
            $selects[i].style.width = remaining_width + "px";
        }
    };

    window.addEventListener("resize", adjust_page_selection_width);
    window.addEventListener("orientationchange", adjust_page_selection_width);
    window.addEventListener("hashchange", hash_change, false);

}());