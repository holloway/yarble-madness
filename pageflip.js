(function(){
	"use strict";

    var drag_threshold = 150,
        page_id_by_index = {},
        drag_distance = {},
        page_index_by_id = {},
        drag_start = {},
        index = 0,
        $pages;

    var init = function(){
        var hashstate;
        $pages = yarble.utils.$("body > div");
        $pages.map(function(element, i){
            var id = element.getAttribute("id");
            page_index_by_id[id] = i;
            page_id_by_index[i] = id;
        });
        document.addEventListener('keydown',    key_down,    false);
        document.addEventListener('touchstart', touch_start, false);
        document.addEventListener('touchmove',  touch_move,  false);
        document.addEventListener('touchend',   touch_end,   false);
        hashstate = get_hash_state();
        if(hashstate === undefined){
            move_to_page(0);
        } else {
            move_to_page(page_index_by_id[hashstate[0]]);
        }
    };

    document.addEventListener("DOMContentLoaded", init);

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
            case 33:
                index -= 1;
                arrow_key_was_used  = true;
                break;
            case 39:
            case 34:
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
    };

    var touch_end = function(event){
        if(Math.abs(drag_distance.x) < drag_threshold ||
           Math.abs(drag_distance.y) > drag_threshold) return;
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

    var move_to_page = function(index){
        if(!$pages.length) return index;
        index = Math.max(Math.min(index, $pages.length - 1), 0);
        $pages[index].className = 'current';
        $pages.slice(0, index).map(function(element){
            element.className = 'before';
        });
        $pages.slice(index + 1).map(function(element){
            element.className = 'after';
        });
        set_hash_state(page_id_by_index[index]);
        window.yarble.utils.event.trigger("yarble:page-change:" + page_id_by_index[index]);
        return index;
    };

    var move_to_page_id_event = function(id){
        console.log("move to", id);
        move_to_page(page_index_by_id[id]);
    };

    yarble.utils.event.on("yarble:change-page-id", move_to_page_id_event);

    window.set_hash_state = function(hashstate){
        window.location.hash = hashstate;
    };

    window.get_hash_state = function(){
        if(window.location.hash === undefined || window.location.hash.length === 0) return undefined;
        return window.location.hash.replace(/^#/, '').split("/");
    };

}());