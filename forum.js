(function(){
	"use strict";

    var CONSTANTS = {
            threads_cache_key: "yarble:page:threads:html"
        },
        $ = yarble.utils.$,
        $forum,
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
        $forum.innerHTML = threads_template(threads);
        adjust_page_selection_width();
    };

    var threads_response = function(threads){
        rebind_threads(threads);
        localStorage.setItem(CONSTANTS.threads_cache_key, JSON.stringify(threads));
    };

    var select_change = function(event){
        window.set_hash_state(event.target.value);
    };

    var init = function(event){
        window.addEventListener("resize", adjust_page_selection_width);
        window.addEventListener("orientationchange", adjust_page_selection_width);
        window.addEventListener("hashchange", hash_change, false);
        $forum = $("#forum")[0];
        $forum.addEventListener("click", click_button, false);
        $forum.addEventListener("change", select_change, false);
        rebind_threads();
    };

    document.addEventListener(init_event_id, init);

    var click_button = function(event){
        var target = event.target,
            thread_id;
        if(target.nodeName.toLowerCase() !== "button") target = target.parentNode;
        if(target.nodeName.toLowerCase() !== "button") return;

        if(target.classList.contains("firstpost")){
            thread_id = target.getAttribute("data-thread-id");
            window.location.hash = "thread/" + current.forum_id + "/" + thread_id + "/1";
        } else if(target.classList.contains("newpost")) {
            thread_id = target.getAttribute("data-thread-id");
            sa.newpost(thread_id, newpost_response);
        } else if(target.classList.contains("lastpost")) {
            thread_id = target.getAttribute("data-thread-id");
            sa.lastpost(thread_id, lastpost_response);
        }
    };

    var posts_response = function(response, forum_id, thread_id, page_number, used_local_smilies, disabled_images){
        
    };

    var lastpost_response = function(forum_id, thread_id, last_page_number){
        window.location.hash = "thread/" + forum_id + "/" + thread_id + "/" + last_page_number;
    };

    var newpost_response = function(forum_id, thread_id, new_page_number){
        window.set_hash_state("posts/" + forum_id + "/" + thread_id + "/" + new_page_number);
    };

    var hash_change = function(){
        var hashstate = window.location.hash.replace(/^#/, '').split("/");
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
        var $top_pages = $(".pages", $forum)[0]; //because there are two in a page, one at the top, one at the bottom
        if(!$top_pages) return;
        var remaining_width = $top_pages.offsetWidth;
        var $not_selects = $(".not-select", $top_pages);
        for(i = 0; i < $not_selects.length; i++){
            remaining_width -= $not_selects[i].offsetWidth;
        }
        remaining_width -= 4;
        var $selects = $(".pages select", $forum);
        for(i = 0; i < $selects.length; i++){
            $selects[i].style.width = remaining_width + "px";
        }
    };    

}());