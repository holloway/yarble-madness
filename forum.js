(function(){
	"use strict";

    var CONSTANTS = {
            forum_cache_key: "yarble:page:forum:html"
        },
        $ = yarble.utils.$,
        $forum,
        current,
        forum,
        forum_template,
        allow_reloads_after_seconds = 10;

    var rebind_forum = function(forum){
        var forum_template_string,
            thread,
            i;

        if(forum === undefined) {
            forum = JSON.parse(localStorage.getItem(CONSTANTS.forum_cache_key));
        } else {
            forum = JSON.parse(JSON.stringify(forum)); // we'll clone it http://stackoverflow.com/a/5344074 so that our modifications (such as copying into .column1 and .column2) don't accidentally leak back to the localStorage copy or any other version
        }
        if(!forum) return;
        current = {};
        current.forum_id = parseInt(forum.forum_id, 10);
        current.page_number = forum.page_number;
        current.when = Date.now();
        forum.pages = [];
        for(i = 1; i <= forum.last_page_number; i++){ //starting at 1 because page counts start from 1 (obv)
            forum.pages.push({forum_id:forum.forum_id, page_number:i, same_page: !!(forum.page_number === i), same_page_option_selection: !!(forum.page_number === i) ? 'selected="selected"' : ""});
        }
        for(i = 0; i < forum.forum.length; i++){
            thread = forum.forum[i];
            if(thread.posticon && posticons_cache[thread.posticon]) {
                thread.has_posticon_url = true;
                thread.posticon_url = "images/posticons/" + posticons_cache[thread.posticon].filename;
            }
            if(window.cloud2butt){
                thread.title = thread.title.replace(/>[\s\S]*?</g, function(match){
                    return match.replace(/cloud/g, 'butt');
                });
            }
        }
        forum.previous_page_number = forum.page_number - 1;
        forum.next_page_number = forum.page_number + 1;
        forum.last_page_number = forum.last_page_number;
        if(forum.previous_page_number < 1) forum.previous_page_number = 1;
        if(forum.next_page_number > forum.last_page_number) forum.next_page_number = forum.last_page_number;

        if(!forum_template){
            forum_template_string = $("#forum-template")[0].innerHTML;
            forum_template = Handlebars.compile(forum_template_string);
        }
        $forum.innerHTML = forum_template(forum);
        adjust_page_selection_width();
    };

    var forum_response = function(forum){
        loading_off();
        rebind_forum(forum);
        localStorage.setItem(CONSTANTS.forum_cache_key, JSON.stringify(forum));
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
        rebind_forum();
    };

    document.addEventListener(init_event_id, init);

    var new_thread_response = function(post_icons, forum_id){
        loading_off();
        window.$post.show("thread", undefined, "", post_icons, function(forum_id){
            return function(text_content, subject, post_icon_id){
                if(subject.length === 0 || text_content.length === 0) return alert("No subject or post");
                console.log("TRYING TO POST THREAD", text_content, post_id);
                sa.submithread(forum_id, subject, text_content, post_icon_id, submitted_thread_response);
            };
        }(forum_id));
    };

    var submitted_thread_response = function(){
        window.$post.hide();
    };

    var click_button = function(event){
        var target = event.target,
            thread_id,
            forum_id;
        if(target.nodeName.toLowerCase() !== "button") target = target.parentNode;
        if(target.nodeName.toLowerCase() !== "button") return;
        
        if(target.classList.contains("firstpost")){
            thread_id = target.getAttribute("data-thread-id");
            window.location.hash = "thread/" + current.forum_id + "/" + thread_id + "/1";
        } else if(target.classList.contains("newpost")) {
            loading_on();
            thread_id = target.getAttribute("data-thread-id");
            sa.newpost(thread_id, newpost_response);
        } else if(target.classList.contains("lastpost")) {
            loading_on();
            thread_id = target.getAttribute("data-thread-id");
            sa.lastpost(thread_id, lastpost_response);
        } else if(target.classList.contains("post-thread")){
            loading_on();
            forum_id = target.getAttribute("data-forum-id");
            if(forum_id){
                return sa.newthreadposticon(forum_id, new_thread_response);
            }
            alert("Internal error: Unable to make new thread without data-forum-id");
        } else if(target.classList.contains("type_announcement")) {
            forum_id = target.getAttribute("data-forum-id");
            window.location.hash = "thread/announcement/" + forum_id;
        }
    };

    var lastpost_response = function(forum_id, thread_id, last_page_number, last_post_id){
        window.location.hash = "thread/" + forum_id + "/" + thread_id + "/" + last_page_number + "/" + last_post_id;
    };

    var newpost_response = function(forum_id, thread_id, new_page_number){
        window.location.hash = "thread/" + forum_id + "/" + thread_id + "/" + new_page_number;
    };

    var hash_change = function(){
        var hashstate = window.location.hash.replace(/^#/, '').split("/");
        if(hashstate.length < 2) return;
        if(hashstate[0] !== "forum") return;
        var hashstate_forum_id = parseInt(hashstate[1], 10),
            hashstate_page_number = 1;
        if(hashstate.length > 2) {
            hashstate_page_number = parseInt(hashstate[2], 10);
        }
        if(!current || current.forum_id !== hashstate_forum_id || current.page_number !== hashstate_page_number || current.when > Date.now() - (allow_reloads_after_seconds * 1000)) {
            loading_on();
            if(current && (current.forum_id !== hashstate_forum_id || current.page_number !== hashstate_page_number)){
                $forum.innerHTML = forum_template({forum_id: hashstate_forum_id});
            }
            sa.forum(hashstate_forum_id, hashstate_page_number, forum_response);
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