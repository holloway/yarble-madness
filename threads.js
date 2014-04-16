(function(){
	"use strict";

    var CONSTANTS = {
            forums_cache_key: "yarble:page:threads:html"
        },
        $ = yarble.utils.$,
        $threads,
        threads_template;

    var rebind_threads = function(threads){
        var threads_template_string;

        if(threads === undefined) {
            threads = JSON.parse(localStorage.getItem(CONSTANTS.threads_cache_key));
        }
        if(!threads) return;
        if(!threads_template){
            threads_template_string = $("#threads-template")[0].innerText;
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
                    thread_id = window.yarble.utils.get_param($link.getAttribute("href"), "threadid");
                    thread = {thread_id: thread_id, type: "announcement", title: $link.innerText};
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

    var click_button = function(event){
        if(event.target.nodeName.toLowerCase() !== "button") return;

        console.log(event);
    };

    document.addEventListener("DOMContentLoaded", init);
	
}());