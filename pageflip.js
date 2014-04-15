(function(){
	"use strict";

    var drag_threshold = 150,
        index = 0,
        $pages,
        drag_start = {},
        drag_distance = {};

    var init = function(){
        $pages = yarble.utils.$("body > div");
        document.addEventListener('keydown',    key_down,    false);
        document.addEventListener('touchstart', touch_start, false);
        document.addEventListener('touchmove',  touch_move,  false);
        document.addEventListener('touchend',   touch_end,   false);
        move_to_page(0);
    };

    document.addEventListener("DOMContentLoaded", init);

    var key_down = function(event){
        var arrow_key_was_used = false;

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
            element.className = 'past';
        });
        $pages.slice(index + 1).map(function(element){
            element.className = 'future';
        });
        return index;
    };

}());