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

	var parse_forums_html = function(html_string){
		var $div = document.createElement("div"),
			$table,
			$rows,
			$row,
			i,
			y,
			forums = {sections: []},
			href,
			$links,
			$link,
			section,
			forum,
			title,
			subtitle,
			forum_id,
			subforum;

		$div.innerHTML = yarble.utils.remove_external_resources(html_string);
		$table = $("#forums", $div)[0];
		$rows = $("tr", $table);

		for(i = 0; i < $rows.length; i++){
			$row = $rows[i];
			$links = $("a", $row);
			if($row.classList.contains("section")){
				href = $links[0].getAttribute("href");
				forum_id = window.yarble.utils.get_param(href, "forumid");
				section = {forum_id: forum_id, title: $links[0].innerText, subtitle: $links[0].getAttribute("title"), forums: []};
				forums.sections.push(section);
			} else { //assume that it's a forum
				for(y = 0; y < $links.length; y++){
					$link = $links[y];
					title = $link.innerText;
					if(title.length > 0 && $link.className.length > 0) {
						href = $link.getAttribute("href");
						forum_id = window.yarble.utils.get_param(href, "forumid");
						if($link.classList.contains("forum")) { //top-level forum
							forum = {forum_id: forum_id, title: title, subtitle: $link.getAttribute("title"), subforums: []};
							section.forums.push(forum);
						} else { //assume subforum
							subforum = {forum_id: forum_id, title: title, subtitle: $link.getAttribute("title")};
							forum.subforums.push(subforum);
						}
					}
				}
			}
		}
		return forums;
	};

	var click_button = function(event){
		var target = event.target;
		if(target.nodeName.toLowerCase() !== "button") target = target.parentNode;
		if(target.nodeName.toLowerCase() !== "button") return;

		var forum_id = parseInt(target.getAttribute("data-forum-id"), 10);
		var request = sa.threads(forum_id, 1, threads_response);
	};

	var threads_response = function(forum_id){
		window.yarble.utils.event.trigger("yarble:page-update:threads", forum_id, this.responseText);
		window.yarble.utils.event.trigger("yarble:change-page-id", "threads/" + forum_id);
	};

	window.yarble.utils.event.on("yarble:page-update:forums", function(html_string){
		var forums = parse_forums_html(html_string);
		localStorage.setItem(CONSTANTS.forums_cache_key, JSON.stringify(forums));
		rebind_forums(forums);
	});

	var init = function(event){
		$forums = $("#forums")[0];
		$forums.addEventListener("click", click_button, false);
		rebind_forums();
	};

	document.addEventListener("DOMContentLoaded", init);
}());