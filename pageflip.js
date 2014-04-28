(function(){
	"use strict";

    var drag_threshold = 150,
        page_id_by_index = {},
        drag_distance = {},
        page_index_by_id = {},
        drag_start = {},
        CONSTANTS = {pageflip_hashstate: 'yarble:pageflip:hashstate'},
        pages_hashstate = {},
        index = 0,
        is_android = navigator.userAgent.match(/Android/i),
        $pages;

    var init = function(){
        window.addEventListener("hashchange", hash_change, false);
        yarble.utils.event.on("yarble:change-page-id", move_to_page_id_event);
        window.addEventListener("beforeunload", beforeunload);
        var hashstate;
        $pages = yarble.utils.$("body > div");
        $pages.map(function(element, i){
            var id = element.getAttribute("id");
            page_index_by_id[id] = i;
            page_id_by_index[i] = id;
        });
        pages_hashstate = localStorage.getItem(CONSTANTS.pageflip_hashstate);
        if(pages_hashstate){
            pages_hashstate = JSON.parse(pages_hashstate);
        } else {
            pages_hashstate = {};
        }
        document.addEventListener('keydown',    key_down,    false);
        document.addEventListener('touchstart', touch_start, false);
        document.addEventListener('touchmove',  touch_move,  false);
        document.addEventListener('touchend',   touch_end,   false);
        hashstate = get_hash_state();
        if(hashstate === undefined){
            move_to_page(0);
        } else {
            index = move_to_page(page_index_by_id[hashstate[0]] ? page_index_by_id[hashstate[0]] : 0);
        }
    };

    var beforeunload = function(){
        localStorage.setItem(CONSTANTS.pageflip_hashstate, JSON.stringify(pages_hashstate));
    };

    document.addEventListener(init_event_id, init);

    var key_down = function(event){
        var arrow_key_was_used = false;

        if(event && event.target) {
            switch(event.target.nodeName.toLowerCase()){
                case "input":
                case "textarea":
                    return;
            }
        }
        switch(event.keyCode){
            case 37:
                index -= 1;
                arrow_key_was_used  = true;
                break;
            case 39:
                index += 1;
                arrow_key_was_used  = true;
                break;
        }
        if(arrow_key_was_used){
            index = move_to_page(index);
            event.preventDefault();
        }
    };

    var touch_start = function(event){
        if(event.touches.length !== 1) return;
        drag_start.x = event.touches[0].clientX;
        drag_start.y = event.touches[0].clientY;
        drag_distance.x = 0;
        drag_distance.y = 0;
    };

    var touch_move = function(event){
        if(event.touches.length !== 1) return;
        drag_distance.x = drag_start.x - event.touches[0].clientX;
        drag_distance.y = drag_start.y - event.touches[0].clientY;

        if(is_android){ // http://uihacker.blogspot.tw/2011/01/android-touchmove-event-bug.html
            event.preventDefault();
        }
    };

    var touch_end = function(event){
        if(Math.abs(drag_distance.x) < drag_threshold || Math.abs(drag_distance.y) > drag_threshold) {
            return;
        }
        if(drag_distance.x < 0) {
            index--;
        } else {
            index++;
        }
        drag_start.x = 0;
        drag_start.y = 0;
        drag_distance.x = 0;
        drag_distance.y = 0;
        event.preventDefault();
        index = move_to_page(index);
    };

    var move_to_page = function(index, hashstate, update_url_hashstate){
        var page_id = page_id_by_index[index];
        if(update_url_hashstate === undefined) {
            update_url_hashstate = true;
        }
        if(hashstate === undefined) {
            hashstate = pages_hashstate[page_id] ? pages_hashstate[page_id] : page_id_by_index[index];
            if(hashstate && hashstate.substr(0, page_id.length + 1) !== page_id + "/") {
                console.log("Resetting pagestate");
                pages_hashstate[page_id] = page_id;
            }
        }
        if(!$pages.length) return index;
        index = Math.max(Math.min(index, $pages.length - 1), 0);
        $pages[index].className = 'current';
        $pages.slice(0, index).map(function(element){
            element.className = 'before';
        });
        $pages.slice(index + 1).map(function(element){
            element.className = 'after';
        });
        if(update_url_hashstate && hashstate){
            set_hash_state(hashstate);
        }
        if(hashstate){
            pages_hashstate[page_id_by_index[index]] = hashstate;
        }
        window.yarble.utils.event.trigger("yarble:page-change:" + page_id_by_index[index]);
        return index;
    };

    var move_to_page_id_event = function(hashstate){
        hashstate = hashstate.replace(/^#/, '');
        var page_id = hashstate.split("/")[0];
        index = move_to_page(page_index_by_id[page_id], hashstate);
    };

    var hash_change = function(){
        // NOTE: only responsible for changing between $pages. Not responsible for restoring any other hashstate.
        var hashstate = get_hash_state();
        if(hashstate[0] === page_id_by_index[index]) {
            pages_hashstate[hashstate[0]] = hashstate.join("/");
            return;
        }
        index = move_to_page(page_index_by_id[hashstate[0]] ? page_index_by_id[hashstate[0]] : 0, hashstate.join("/"), false);
    };

    
    window.set_hash_state = function(hashstate){
        window.location.hash = hashstate;
    };

    window.get_hash_state = function(flattened){
        var hashstate;
        if(window.location.hash === undefined || window.location.hash.length === 0) return undefined;
        hashstate = window.location.hash.replace(/^#/, '');
        if(flattened) return hashstate;
        return hashstate.split("/");
    };

}());