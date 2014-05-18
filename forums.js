(function(){
	"use strict";

	var CONSTANTS = {
			forums_cache_key: "yarble:page:forums:html"
		},
		$ = yarble.utils.$,
		$forums,
		forums_template;

	var rebind_forums = function(forums){
		var forums_template_string;

		if(forums === undefined) {
			forums = JSON.parse(localStorage.getItem(CONSTANTS.forums_cache_key));
		} else {
			forums = JSON.parse(JSON.stringify(forums)); // we'll clone it http://stackoverflow.com/a/5344074 so that our modifications (such as copying into .column1 and .column2) don't accidentally leak back to the localStorage copy or any other version
		}
		if(!forums) return;
		if(!forums_template){
			forums_template_string = $("#forums-template")[0].innerHTML;
			forums_template = Handlebars.compile(forums_template_string);
		}
		var half_sections = Math.floor(forums.sections.length / 2);
		forums.column1 = {sections: forums.sections.slice(0, half_sections)};
		forums.column2 = {sections: forums.sections.slice(half_sections)};
		$forums.innerHTML = forums_template(forums);
	};

	var click_button = function(event){
		var target = event.target;
		if(target.nodeName.toLowerCase() !== "button") target = target.parentNode;
		if(target.nodeName.toLowerCase() !== "button") return;
		var forum_id = parseInt(target.getAttribute("data-forum-id"), 10);
		window.location.hash = "forum/" + forum_id + "/1";
	};

	var init = function(event){
		$forums = $("#forums")[0];
		$forums.addEventListener("click", click_button, false);
		rebind_forums();
	};

	document.addEventListener(init_event_id, init);
}());