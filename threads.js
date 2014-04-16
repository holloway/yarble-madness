(function(){
	"use strict";

    var CONSTANTS = {
            threads_cache_key: "yarble:page:threads:html"
        },
        $ = yarble.utils.$,
        $threads,
        current = {},
        threads_template;

    var rebind_threads = function(threads){
        var threads_template_string;

        if(threads === undefined) {
            threads = JSON.parse(localStorage.getItem(CONSTANTS.threads_cache_key));
        }
        if(!threads) return;
        current.forum_id = threads.forum_id;
        if(!threads_template){
            threads_template_string = $("#threads-template")[0].innerHTML;
            threads_template = Handlebars.compile(threads_template_string);
        }
        $threads.innerHTML = threads_template(threads);
    };

    var parse_threads_html = function(forum_id, html_string){
        var $div = document.createElement("div"),
            $table,
            $rows,
            $row,
            $links,
            $link,
            i,
            y,
            thread,
            thread_id,
            user_id,
            response = {forum_id: forum_id, threads: []};

        $div.innerHTML = yarble.utils.remove_external_resources(html_string);
        $table = $("#forum", $div)[0];
        $rows = $("tr", $table);

        for(i = 0; i < $rows.length; i++){
            $row = $rows[i];
            $links = $("a", $row);
            for(y = 0; y < $links.length; y++){
                $link = $links[y];
                if($link.classList.contains("announcement")) {
                    forum_id = window.yarble.utils.get_param($link.getAttribute("href"), "forumid");
                    thread = {announcement: true, forum_id: forum_id, type: "announcement", title: $link.innerText};
                    response.threads.push(thread);
                } else if($link.classList.contains("thread_title")) {
                    thread_id = window.yarble.utils.get_param($link.getAttribute("href"), "threadid");
                    thread = {thread_id: thread_id, type: "thread", title: $link.innerText};
                    response.threads.push(thread);
                } else if($link.parentNode.classList.contains("author")) {
                    user_id = window.yarble.utils.get_param($link.getAttribute("href"), "userid");
                    thread.user = {user_id: user_id, name: $link.innerText};
                }
            }
        }
        return response;
    };

    window.yarble.utils.event.on("yarble:page-update:threads", function(forum_id, html_string){
        var threads = parse_threads_html(forum_id, html_string);
        rebind_threads(threads);
        localStorage.setItem(CONSTANTS.threads_cache_key, JSON.stringify(threads));
    });

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

        var thread_id = parseInt(target.getAttribute("data-thread-id"), 10);
        sa.posts(current.forum_id, thread_id, 1, posts_response);
    };

    var posts_response = function(forum_id, thread_id, page_number){
        window.yarble.utils.event.trigger("yarble:page-update:posts", forum_id, thread_id, page_number, this.responseText);
        window.yarble.utils.event.trigger("yarble:change-page-id", "posts/" + forum_id + "/" + thread_id + "/" + page_number);
    };

	
}());