(function(){
	"use strict";

    document.addEventListener("DOMContentLoaded", function(){
        var $ = yarble.utils.$,
            $body = $("body"),
            $forum = $("#forum"),
            hammer;

        hammer = new Hammer($body).on("drag", function(event) {
            console.log(event)
        });
        
    });
}());