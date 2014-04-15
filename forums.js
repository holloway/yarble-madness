(function(){
	"use strict";

	var CONSTANTS = {
			forums_cache_key: "yarble:page:forums:html"
		},
		$ = yarble.utils.$,
		$forums;

	var rebind_forums = function(html_string){
		if(html_string === undefined) {
			html_string = localStorage.getItem(CONSTANTS.forums_cache_key);
		}
		if(!html_string) return;
		$forums.innerHTML = html_string;
		
	};

	window.yarble.utils.event.on("yarble:page-update:forums", function(html_string){
		html_string = yarble.utils.remove_external_resources(html_string);
		localStorage.setItem(CONSTANTS.forums_cache_key, html_string);
		rebind_forums(html_string);
	});

	var init = function(event){
		$forums = $("#forums")[0];
		rebind_forums();
	};

	document.addEventListener("DOMContentLoaded", init);
}());