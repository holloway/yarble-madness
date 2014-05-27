(function(){
	"use strict";

	var http_base =  "http://forums.somethingawful.com/";
	var https_base = "https://forums.somethingawful.com/";

	window.sa = {
		login: function(username, password, callback){
			cache.last_username = username;
			return request.post(
				https_base + "account.php",
				undefined,
				{username: username, password: password, action: "login", next: "/"},
				response_filters.login(callback)
			);
		},
		logout: function(callback){
			var ma = cache.logout_ma || localStorage.getItem("yarble:logout:ma");
			if(!ma) callback(false);
			return request.get(
				http_base + 'account.php',
				{action:'logout', ma: ma},
				response_filters.logout(callback)
			);
		},
		forums: function(callback){
			return request.get(
				http_base + 'index.php',
				undefined,
				response_filters.forums(callback)
			);
		},
		forum: function(forum_id, page_number, callback){
			if(page_number === undefined) page_number = 1;
			return request.get(
				http_base + 'forumdisplay.php',
				{forumid: forum_id, pagenumber: page_number},
				response_filters.forum(callback, forum_id, page_number)
			);
		},
		announcement: function(forum_id, use_local_smilies, disable_images, callback){
			if(forum_id === undefined) forum_id = 1; //because forumid typically doesn't matter (but is required)
			if(use_local_smilies === undefined) use_local_smilies = true;
			if(disable_images === undefined) disable_images = false; // NOTE: disable_images also applies to youtube/vimeo/etc videos
			return request.get(
				http_base + 'announcement.php',
				{forumid: forum_id},
				response_filters.announcement(callback, forum_id)
			);
		},
		thread: function(forum_id, thread_id, page_number, use_local_smilies, disable_images, callback){
			if(page_number === undefined) page_number = 1;
			if(use_local_smilies === undefined) use_local_smilies = true;
			if(disable_images === undefined) disable_images = false; // NOTE: disable_images also applies to youtube/vimeo/etc videos
			return request.get(
				http_base + 'showthread.php',
				{threadid: thread_id, pagenumber: page_number},
				response_filters.thread(callback, forum_id, thread_id, page_number, use_local_smilies, disable_images)
			);
		},
		gotopost: function(post_id, callback){
			return request.get(
				http_base + 'showthread.php',
				{goto: "post", postid: post_id},
				response_filters.gotopost(callback, post_id)
			);
		},
		newpost: function(thread_id, callback){
			return request.get(
				http_base + 'showthread.php',
				{goto: "newpost", threadid: thread_id},
				response_filters.newpost(callback, thread_id)
			);
		},
		lastpost: function(thread_id, callback){
			return request.get(
				http_base + 'showthread.php',
				{goto: "lastpost", threadid: thread_id},
				response_filters.lastpost(callback, thread_id)
			);
		},
		quotepost: function(forum_id, thread_id, post_id, callback){
			return request.get(
				http_base + 'newreply.php',
				{action: "newreply", postid: post_id},
				response_filters.quotepost(callback, forum_id, thread_id, post_id)
			);
		},
		editposttext: function(forum_id, thread_id, post_id, callback){
			return request.get(
				http_base + 'editpost.php',
				{action: "editpost", postid: post_id},
				response_filters.editposttext(callback, forum_id, thread_id, post_id)
			);
		},
		newthreadposticon: function(forum_id, callback){
			return request.get(
				http_base + 'newthread.php',
				{action: "newthread", forumid: forum_id},
				response_filters.newthreadposticon(callback, forum_id)
			);
		},
		submitpost: function(forum_id, thread_id, text_content, callback){
			if(!cache.formkey || !cache.formcookie) return alert("Unable to submit post. Was never able to scrape a form.");
			return request.post(
				http_base + 'newreply.php',
				undefined,
				{
					action:      "postreply",
					submit:      "Submit Reply",
					threadid:    thread_id,
					formkey:     cache.formkey,
					form_cookie: cache.formcookie,
					parseurl:    "yes",
					message:     text_content,
				},
				response_filters.submitpost(callback, forum_id, thread_id)
			);
		},
		updatepost: function(forum_id, thread_id, post_id, text_content, callback){
			return request.post(
				http_base + 'editpost.php',
				undefined,
				{
					action:    "updatepost",
					submit:    "Save Changes",
					postid:    post_id,
					parseurl:  "yes",
					message:   text_content,
				},
				response_filters.updatepost(callback, forum_id, thread_id, post_id)
			);
		},
		register_network_failure_callback: function(callback){
			request.register_network_failure_callback(callback);
		},
		submitpoll: function(poll_id, options, callback){
			var form_data = {
				action:    "pollvote",
				pollid:    poll_id
			};
			for(var i = 0; i < options.length; i++){
				form_data[options[i]] = "yes";
			}
			return request.post(
				http_base + 'poll.php',
				undefined,
				form_data,
				response_filters.submitpoll(callback, poll_id)
			);
		},
		pollresults: function(poll_id, callback){
			return request.get(
				http_base + 'poll.php',
				{action: "showresults", pollid: poll_id},
				response_filters.pollresults(callback, poll_id)
			);
		}
	};

	var request = {
		get: function(url, url_params, callback, async){
			if(async === undefined) async = true;
			var params_string = request.serialize_params(url_params);
			if(params_string){
				if(url.indexOf("?") === -1) url += "?";
				url += params_string;
			}
			var req = new window.XMLHttpRequest();
			req.open('GET', url, async);
			req.onreadystatechange = response(callback);
			req.onerror = request.failure;
			req.send();
			return req;
		},
		post: function(url, url_params, body_params, callback, async){
			if(async === undefined) async = true;
			var req = new window.XMLHttpRequest();
			var url_params_string = request.serialize_params(url_params);
			if(url_params_string){
				if(url.indexOf("?") === -1) url += "?";
				url += url_params_string;
			}
			var body_params_string = request.serialize_params(body_params, true);
			req.open('POST', url, async);
			req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			req.onreadystatechange = response(callback);
			req.onerror = request.failure;
			if(body_params_string) {
				req.send(body_params_string);
			} else {
				req.send();
			}
			return req;
		},
		head: function(url, url_params, callback, async){
			if(async === undefined) async = true;
			var params_string = request.serialize_params(url_params);
			if(params_string){
				if(url.indexOf("?") === -1) url += "?";
				url += params_string;
			}
			var req = new window.XMLHttpRequest();
			req.open('HEAD', url, async);
			req.onreadystatechange = response(callback);
			req.send();
			return req;
		},
		serialize_params: function(params, escape_nonstandard_characters_too){
			var params_string = "",
				key,
				uri_escape,
				escape_function,
				escape_nonstandard_characters = function(value){
					value = encodeURIComponent(value);
					value = value.replace(/'/g, "%27");
					value = value.replace(/%20/g, '+');
					return value;
				};

			if(escape_nonstandard_characters_too === undefined) escape_nonstandard_characters_too = false;

			escape_function = escape_nonstandard_characters_too ? escape_nonstandard_characters : encodeURIComponent;

			if(!params) return;
			for(key in params){
				params_string += escape_function(key) + "=" +  escape_function(params[key]) + "&";
			}
			if(params_string.length > 0) params_string = params_string.substr(0, params_string.length - 1);
			return params_string;
		},
		register_network_failure_callback: function(callback){
			if(!request.failure_callbacks) request.failure_callbacks = [];
			request.failure_callbacks.push(callback);
		},
		failure: function(event){
			if(!request.failure_callbacks || request.failure_callbacks.length === 0){
				alert("Network error. If you're testing in desktop Chrome be sure to start as (e.g.) chrome --disable-web-security");
			} else {
				for(var i = 0; i < request.failure_callbacks.length; i++){
					request.failure_callbacks[i](event);
				}
			}
		}
	};

	var response = function(fn){
		if(fn === undefined) {
			console.trace();
			alert("Error: response in sa.js called with non-existant function. See developer console");
		}
		return function(){
			var args = arguments;
			if(this.readyState !== 4) return;
			if(this.status !== 200 && this.status !== 302) {
				console.log("sa.lib.js: Error response", this, this.responseText);
				if(this.status === 0) return;
			}
			response_filters.scrape_useful_stuff(this.responseText);
			return fn.apply(this, args);
		};
	};

	var response_filters = {
		login: function(fn){
			return function(){
				var $div = document.createElement("div"),
					success;
				
				success = !!this.responseText.match(/Log Out/g);
				return fn.apply(this, [success]);
			};
		},
		forums: function(fn){
			return function(){
				var response = sa.response_parse.forums(this.responseText);
				return fn.apply(this, [response]);
			};
		},
		forum: function(fn, forum_id, page_number){
			return function(){
				var response = sa.response_parse.forum(this.responseText);
				return fn.apply(this, [response, forum_id, page_number]);
			};
		},
		thread: function(fn, forum_id, thread_id, page_number, use_local_smilies, disable_images){
			return function(){
				var response = sa.response_parse.thread(this.responseText, use_local_smilies, disable_images);
				return fn.apply(this, [response, forum_id, thread_id, page_number, use_local_smilies, disable_images]);
			};
		},
		announcement: function(fn, forum_id, use_local_smilies, disable_images){
			return function(){
				var html_string = this.responseText;
				html_string = html_string.replace(/<\/tr>	<tr valign="top">/g, "</tr></table><table class=\"post\" id=\"post" + (Math.random() * 10000) + "\"><tr>").replace(/main_full/g, "post" + (Math.random() * 10000)); //because announcements are in a single table, whereas posts aren't. weird.
				var response = sa.response_parse.thread(html_string, use_local_smilies, disable_images);
				response.title = "Announcement";
				if(response.thread.length > 1) response.title += "s";
				return fn.apply(this, [response, forum_id]);
			};
		},
		logout: function(fn){
			return function(){
				var $div = document.createElement("div"),
					$content,
					success = false,
					innerHTML;

				$div.innerHTML = response_filters.remove_external_resources(this.responseText);
				$content = $("#content", $div);
				if($content.length) {
					innerHTML = $("#content", $div)[0].innerHTML;
					success = !!innerHTML.match(/logged out/i) || !!innerHTML.match(/Not cookied/i);
				}
				return fn.apply(this, [success]);
			};
		},
		gotopost: function(fn, post_id){
			return function(){
				var response = sa.response_parse.gotopost(this.responseText);
				return fn.apply(this, [response.forum_id, response.thread_id, post_id, response.page_number]);
			};
		},
		newpost: function(fn, thread_id){
			return function(){
				var response = sa.response_parse.newpost(this.responseText);
				return fn.apply(this, [response.forum_id, response.thread_id, response.new_page_number]);
			};
		},
		lastpost: function(fn, thread_id){
			return function(){
				var response = sa.response_parse.lastpost(this.responseText);
				return fn.apply(this, [response.forum_id, response.thread_id, response.last_page_number]);
			};
		},
		quotepost: function(fn, forum_id, thread_id, post_id){
			return function(){
				var quote_text = this.responseText.replace(/^[\s\S]*?<textarea/g, '')
												.replace(/^[\s\S]*?>/g, '')
												.replace(/<\/textarea>[\s\S]*$/g, '');
				quote_text = unescape_html(quote_text);
				return fn.apply(this, [quote_text, forum_id, thread_id, post_id]);
			};
		},
		editposttext: function(fn, forum_id, thread_id, post_id){
			return function(){
				var edit_text = this.responseText.replace(/^[\s\S]*?<textarea/g, '')
												.replace(/^[\s\S]*?>/g, '')
												.replace(/<\/textarea>[\s\S]*$/g, '');
				edit_text = unescape_html(edit_text);
				return fn.apply(this, [edit_text, forum_id, thread_id, post_id]);
			};
		},
		updatepost: function(fn, forum_id, thread_id, post_id){
			return function(){
				return fn.apply(this, [forum_id, thread_id, post_id]);
			};
		},
		submitpost: function(fn, forum_id, thread_id){
			return function(){
				return fn.apply(this, [forum_id, thread_id]);
			};
		},
		newthreadposticon: function(fn, forum_id){
			return function(){
				var post_icons = [{id:0, text:"No icon"}];

				this.responseText.replace(/<div class="posticon">[\s\S]*?<\/div>/g, function(match){
					var post_icon = {
						id: parseInt(match.replace(/^[\s\S]*?value="/, "").replace(/"[\s\S]*$/g, ""), 10)
					};
					if(window.posticons_cache && window.posticons_cache[post_icon.id]) {
						post_icon.filename = window.posticons_cache[post_icon.id].filename;
					}
					post_icons.push(post_icon);
				});
				return fn.apply(this, [post_icons, forum_id]);
			};
		},
		submitpoll: function(fn, poll_id){
			return function(){
				return fn.apply(this, [poll_id]);
			};
		},
		pollresults: function(fn, poll_id){
			return function(){
				var results = sa.response_parse.pollresults(this.responseText);
				for(var i = 0; i < results.options.length; i++){
					results.options[i].percentage = Math.round((results.options[i].count / results.total) * 10000) / 100;
				}
				return fn.apply(this, [poll_id, results]);
			};
		},
		scrape_useful_stuff: function(html_string){
			var $div = document.createElement("div"),
				innerText,
				$result,
				$input,
				i;

			$div.innerHTML = response_filters.remove_external_resources(html_string);
			$result = $("a", $div);
			for(i = 0; i < $result.length; i++){
				innerText = $result[i].innerText;
				if(innerText.match(/wildest dreams come true/i) || innerText.match(/log out/i)) {
					cache.logout_ma = get_param($result[i].getAttribute("href"), "ma");
					localStorage.setItem("yarble:logout:ma", cache.logout_ma);
				} else if(innerText === cache.last_username){ //FIXME figure out a smarter way of doing this
					cache.member_page_url = $result[i].getAttribute("href").substr(1);
				}
			}
			$result = $("input", $div);
			for(i = 0; i < $result.length; i++){
				$input = $result[i];
				switch($input.getAttribute("name")){
					case "formkey":
						cache.formkey = $input.value;
						break;
					case "form_cookie":
						cache.formcookie = $input.value;
						break;
				}
			}
		},
		remove_external_resources: function(html_string){
			// remove anything in the HTML that would cause the browser
			// to download anything. This is done as a string because
			// if a DOM node (attached or not) has innerHTML set to a
			// string it will start downloading resources that we don't
			// care about, so let's avoid that
			html_string = html_string.replace(/<!--[\s\S]*?-->/g, '');
			html_string = html_string.replace(/<script[\s\S]*?<\/script>/g, '');
			html_string = html_string.replace(/<video[\s\S]*?<\/video>/g, '');
			html_string = html_string.replace(/<audio[\s\S]*?<\/audio>/g, '');
			html_string = html_string.replace(/<link[\s\S]*?>/g, '');
			html_string = html_string.replace(/<img[\s\S]*?>/g, '');
			html_string = html_string.replace(/<object[\s\S]*?<\/object>/g, '');
			html_string = html_string.replace(/<embed[\s\S]*?<\/embed>/g, '');
			html_string = html_string.replace(/<iframe[\s\S]*?>/g, '');
			return html_string;
		},
	};

	window.sa.response_parse = {
		forums: function(html_string){
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

			$div.innerHTML = response_filters.remove_external_resources(html_string);
			$table = $("#forums", $div)[0];
			$rows = $("tr", $table);

			for(i = 0; i < $rows.length; i++){
				$row = $rows[i];
				$links = $("a", $row);
				if($row.classList.contains("section")){
					href = $links[0].getAttribute("href");
					forum_id = get_param(href, "forumid");
					section = {forum_id: forum_id, title: $links[0].innerText, subtitle: $links[0].getAttribute("title"), forums: []};
					forums.sections.push(section);
				} else { //assume that it's a forum
					for(y = 0; y < $links.length; y++){
						$link = $links[y];
						title = $link.innerText;
						if(title.length > 0 && $link.className.length > 0) {
							href = $link.getAttribute("href");
							forum_id = get_param(href, "forumid");
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
		},
		forum: function(html_string){
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
				response = {forum: [], error: false},
				forum_id,
				$new_body,
				$page_widget,
				$page_change_widget;

			html_string = html_string.replace(/<body/g, '<new-body'); //because <body> would be filtered when setting innerHTML (because you can't have two in a page?), but a made-up tag like <new-body> won't be
			$div.innerHTML = response_filters.remove_external_resources(html_string);
			$new_body = $("new-body", $div)[0];
			if(html_string.match(/Specified forum was not found/i) && $new_body.classList.contains("standarderror")) {
				response.error = true;
				response.error_message = $("#content", $div)[0].innerText;
				return response;
			}
			response.forum_id = $new_body.getAttribute("data-forum");
			$page_change_widget = $("div.pages option[selected=selected]", $div);
			if($page_change_widget.length > 0) {
				response.page_number = parseInt($page_change_widget[0].innerText, 10);
			} else {
				response.page_number = 1;
			}
			$page_widget = $(".pages select", $div);
			if($page_widget.length){
				response.last_page_number = parseInt($page_widget[0].options[$page_widget[0].length - 1].value, 10);
			} else {
				response.last_page_number = 1;
			}

			$table = $("#forum", $div)[0];
			$rows = $("tr", $table);
			for(i = 0; i < $rows.length; i++){
				$row = $rows[i];
				$links = $("a", $row);
				thread = {};
				for(y = 0; y < $links.length; y++){
					$link = $links[y];
					if($link.classList.contains("announcement")) {
						forum_id = get_param($link.getAttribute("href"), "forumid");
						thread.announcement = true;
						thread.forum_id = forum_id;
						thread.type = "announcement";
						thread.title = $link.innerText;
					} else if($link.classList.contains("thread_title")) {
						thread_id = get_param($link.getAttribute("href"), "threadid");
						thread.thread_id = thread_id;
						thread.type = "thread";
						thread.title = $link.innerText;
					} else if($link.classList.contains("count")) {
						thread.lastseen = $link.innerText.replace(/\s/g, '');
					} else if($link.parentNode.classList.contains("author")) {
						user_id = get_param($link.getAttribute("href"), "userid");
						thread.user = {user_id: user_id, name: $link.innerText};
					} else if($link.parentNode.classList.contains("icon")){
						thread.posticon = user_id = get_param($link.getAttribute("href"), "posticon");
					}
				}
				if(thread.type){
					response.forum.push(thread);
				}
			}
			return response;
		},
		thread: function(html_string, use_local_smilies, disable_images){
			var $div = document.createElement("div"),
				$thread_container,
				$thread,
				$post,
				$image,
				$new_body,
				attribute,
				attributes,
				content_id,
				$title,
				$page_change_widget,
				$page_widget,
				$lastseen,
				response = {thread:[]},
				i,
				post,
				user_title_images = function(img_html_string){
					var attributes_string = img_html_string.substr(img_html_string.indexOf(" "));
					attributes_string = attributes_string.substr(0, attributes_string.indexOf(">"));
					var attributes = parse_attributes_string(attributes_string);
					var smiley = attributes.title;
					// note: smiles_cache (a global variable) is found in smilies-cache.js and that file is dynamically built from the nodejs script get-smilies.js
					if(window.smiles_cache && window.smiles_cache[smiley] && attributes.src.match(/somethingawful\.com/)){
						return '<img src="images/smilies/' + window.smiles_cache[smiley].filename + '" title="' + escape_html(smiley) + " " + escape_html(window.smiles_cache[smiley].title) + '" class="smiley">';
					}
					return '<img src="' + attributes.src + '" style="width:62.5px;" class="user-title">'; //width is just a default...will be overridden in JavaScript
				},
				process_image = function(match, force_disable_images, force_enable_images){
					if (force_enable_images === undefined) force_enable_images = false;
					var attributes_string = match.substr(match.indexOf(" "));
					attributes_string = attributes_string.substr(0, attributes_string.indexOf(">"));
					attributes = parse_attributes_string(attributes_string);
					if(attributes.src && attributes.src.substr(0, "attachment.php".length) === "attachment.php"){
						attributes.src = http_base + attributes.src;
						match = '<img src="' + attributes.src + '">';
					}
					if(use_local_smilies){
						var smiley = attributes.title;
						// note: smiles_cache (a global variable) is found in smilies-cache.js and that file is dynamically built from the nodejs script get-smilies.js
						if(window.smiles_cache && window.smiles_cache[smiley] && attributes.src.match(/somethingawful\.com/)){
							return '<img src="images/smilies/' + window.smiles_cache[smiley].filename + '" title="' + escape_html(smiley) + '" class="smiley">';
						}
					}
					if(!force_enable_images && disable_images || force_enable_images && force_disable_images === true) {
						attribute = attributes.src;
						if(attributes.class && attributes.class.match(/smiley/)) return match;
						content_id = generated_id_from_url(attribute);
						return '<button data-image-src="' + escape_html(attribute) + '" data-image-id="disabled-image-' + escape_html(content_id) + '" class="disabled-image disabled-image-' + escape_html(content_id) + '">Load image ' + escape_html(attribute) + '</button>';
					}
					return match;
				},
				check_for_nsfw = function(html_string_of_a_post){
					if(!html_string_of_a_post.match(/:nws:/)) return html_string_of_a_post;
					html_string_of_a_post = html_string_of_a_post.replace(/<a[\s\S]*?<\/a>/gi, function(){
						return function(match){
							var attributes_string = match.substr(match.indexOf(" "));
							attributes_string = attributes_string.substr(0, attributes_string.indexOf(">"));
							attributes = parse_attributes_string(attributes_string);
							if(attributes.href){
								var extension = attributes.href.substr(attributes.href.lastIndexOf(".")).toLowerCase();
								switch(extension){
									case ".png":
									case ".gif":
									case ".jpg":
									case ".jpeg":
									case ".jpe":
									case ".bmp": // WHY?!!?!!! YOU FUCKER
										var content_id = generated_id_from_url(attributes.href);
										var inner = match.substr(match.indexOf(">") + 1);
										inner = inner.substr(0, inner.length - "</a>".length);
										// yes I know that guessing filetype by URL is a stupid idea but 1) it works most of the time, and 2) it's not a security risk, and 3) it's a useful feature, so 4) who the fuck cares
										return '<button data-image-src="' + escape_html(attributes.href) + '" data-image-id="disabled-image-' + escape_html(content_id) + '" class="disabled-image disabled-image-' + escape_html(content_id) + '">' + inner + '</button>';
								}
							}
							return match;
						};
					}());
					html_string_of_a_post = html_string_of_a_post.replace(/<img[^>]*?>/gi, function(){
						return function(match){
							return process_image(match, true);
						};
					}());
					return html_string_of_a_post;
				};

			// READ THIS FIRST
			// i know parsing html as a string is stupid, but we need to parse it
			// without attaching to the DOM because event detached DOM nodes
			// download images which we want to prevent (E.g. :nws: images)
			// most things are done in a DOM but some stuff needs to be done before that

			html_string = html_string.replace(/<!--[\s\S]*?-->/g, '');
			html_string = html_string.replace(/<body/g, '<new-body'); //because <body> would be filtered when setting innerHTML (because you can't have two in a page?), but a made-up tag like <new-body> won't be
			html_string = html_string.replace(/<div class="threadbar bottom">[\s\S]*$/, '');
			html_string = html_string.replace(/<ul class="postbuttons">[\s\S]*?<\/ul>/g, function(match){
				return match.replace(/<img[^>]*?>/gi, '');
			});
			html_string = html_string.replace(/<script[\s\S]*?<\/script>/g, '');
			html_string = html_string.replace(/<script[\s\S]*?>/g, '');
			html_string = html_string.replace(/<dd class="title">([\s\S]*?)<\/dd>/g, '<dd class="title"><!-- $1 --></dd>');
			html_string = html_string.replace(/<img[^>]*?>/gi, process_image);
			html_string = html_string.replace(/<td class="postbody">[\s\S]*?<\/td>/g, check_for_nsfw);

			html_string = html_string.replace(/<iframe[\s\S]*?\/iframe>/g, function(match){
				var attributes_string = match.substr(match.indexOf(" "));
				attributes_string = attributes_string.substr(0, attributes_string.indexOf(">"));
				attributes = parse_attributes_string(match);
				var video_url;
				var styles_string = "";
				var thumbnail_url = "";
				var video_id;
				var width, height;
				if(attributes.src.match(/youtube\.com/) || attributes.src.match(/youtube-nocookie\.com/)) {
					video_id = attributes.src.substr(attributes.src.indexOf("/embed/") + "/embed/".length);
					video_id = video_id.substr(0, video_id.indexOf('?'));
					thumbnail_url = 'http://img.youtube.com/vi/' + escape_html(video_id) + '/0.jpg';
					styles_string = 'background-image: url(\'' + thumbnail_url + '\')';
					video_url = 'https://www.youtube.com/watch?v=' + escape_html(video_id);
				}
				content_id = generated_id_from_url(attributes.src);
				if(video_url) { //if it was able to find a video
					if(disable_images){ //also applies to videos
						return '<button data-video-src="' + escape_html(video_url) + '" data-thumbnail-url="' + thumbnail_url + '" data-video-id="disabled-video-' + escape_html(content_id) + '" class="disabled-video disabled-video-' + escape_html(content_id) + '">Load video thumbnail ' + escape_html(video_url) + '</button>';
					} else {
						return '<a class="video-player" target="_blank" href="' + video_url + '" style="' + escape_html(styles_string) + '"><img src="images/video.png" class="video_play_button"></a>';
					}
				}
				return ""; // we don't want iframes that we don't recognise in the page
			});

			html_string = html_string.replace(/<object[\s\S]*?\/object>/g, function(match){
				if(!match.match(/vimeo\.com/)) return ""; // then erase, because we don't want objects that we don't recognise in the page
				var video_id = match.substr(match.indexOf("clip_id=") + "clip_id=".length);
				video_id = video_id.substr(0, video_id.indexOf("&")).replace(/[^0-9]/g, '');
				return '<a class="video-player" target="_blank" href="http://vimeo.com/' + video_id + '"><img src="images/video.png" class="video_play_button"></a>';
			});

			$div.innerHTML = html_string; // we can't run yarble.utils.remove_external_resources on this because we actually want the external resources (thread containing images, for example), and at least this will start the browser downloading them
			$new_body = $("new-body", $div)[0];
			response.forum_id = parseInt($new_body.getAttribute("data-forum"), 10);
			response.thread_id = $new_body.getAttribute("data-thread");
			$page_change_widget = $("div.pages option[selected=selected]", $div);
			if($page_change_widget.length > 0) {
				response.page_number = parseInt($page_change_widget[0].innerText, 10);
			} else {
				response.page_number = 1;
			}

			$page_widget = $(".pages select", $div);
			if($page_widget.length){
				response.last_page_number = parseInt($page_widget[0].options[$page_widget[0].length - 1].value, 10);
			} else {
				response.last_page_number = 1;
			}
			$thread_container = $("#thread", $div)[0];

			$thread = $("table", $thread_container);

			$title = $("#content .breadcrumbs .bclast", $div);

			if($title.length) {
				response.title = $title[0].innerText;
			}

			for(i = 0; i < $thread.length; i++){
				$post = $thread[i];
				var post_id = $post.getAttribute("id");
				if(post_id) {
					post_id = parseInt(post_id.replace(/^post/, ''), 10);
				} else {
					continue; // not a post (perhaps a table header) so ignore and go on to the next one
				}
				if(! $(".postbody", $post)[0]){
					console.log("no body?", $post.innerHTML, $post.parentNode);
				}

				var editable = false;
				var $post_buttons = $(".postbuttons", $post);
				if($post_buttons.length){
					editable = !!$post_buttons[0].innerHTML.match(/editpost\.php/);
				}

				var registered = $(".registered", $post);
				if(registered.length){
					registered = registered[0].innerHTML;
				} else {
					registered = undefined;
				}
				var user_title = $("dd.title", $post);
				if(user_title.length){
					user_title = user_title[0].innerHTML.replace(/^<!--/, '').replace(/-->$/, '').replace(/<br>[\s]*?<br class="pb">/, '');
					user_title = user_title.replace(/<br \/>[\s]*?<br \/>/g, '<br>');
					user_title = user_title.replace(/<img[^>]*?>/gi, user_title_images);
				}
				var user_id = $(".user_jump", $post);
				if(user_id.length){
					user_id = get_param(user_id[0].getAttribute("href"), "userid");
				} else {
					user_id = 0;
				}
				post = {
					id: post_id,
					body: $(".postbody", $post)[0].innerHTML,
					postdate: $(".postdate", $post)[0].innerHTML.replace(/<a[\s\S]*?<\/a>/g, ''),
					user: {
						name: $(".author", $post)[0].innerHTML,
						user_id: user_id,
						registered: registered,
						user_title: user_title
					},
					editable: editable
				};
				$lastseen = $(".lastseen", $post);
				if($lastseen) {
					response.lastseen = parseInt($(".count b", $lastseen[0]), 10);
				}
				response.thread.push(post);
			}

			var $pollform = $('form[action="poll.php"]', $div);
			if($pollform.length > 0) {
				response.poll = {type:"multiple", options:[]};
				response.poll.id = $('input[name="pollid"]', $pollform[0])[0].getAttribute("value");
				var $trs = $("tr", $pollform[0]);
				response.poll.question = $trs[0].innerText;
				for(i = 1; i < $trs.length; i++){
					var $input = $("input", $trs[i]);
					var poll_option_text = $("td", $trs[i])[1].innerHTML;
					if($input.length > 0) {
						response.poll.type = ($input[0].getAttribute("type") === "checkbox") ? "checkbox" : "radio";
						response.poll.options.push({
							id: $input[0].getAttribute("name"),
							text: poll_option_text
						});
					}
				}
			}

			var innerHTML = $div.innerHTML;

			if(innerHTML.match(/action=polledit/i)){
				response["poll-result"] = parseInt(innerHTML.substr(innerHTML.indexOf("pollid=") + "pollid=".length), 10);
			}

			return response;
		},
		pollresults: function(html_string){
			html_string = html_string.replace(/^[\s\S]*?<table/, '<table')
									.replace(/<\/table[\s\S]*?$/, '</table>')
									.replace(/<img[\s\S]*?>/, function(match){
										if(match.match(/images\/polls/)) return "";
										return match;
									});
			var $div = document.createElement("div");
			$div.innerHTML = html_string;
			var $table = $("table", $div)[0];
			var results = {options:[]};
			results.question = $("th", $table)[0].innerText;
			var $rows = $("tr", $table),
				$row,
				$tds,
				count,
				total = 0;
			for(var i = 1; i < $rows.length - 1; i++){
				$row = $rows[i];
				$tds = $("td", $row);
				count = parseInt($tds[2].innerText, 10);
				total += count;
				results.options.push({
					"text": $tds[0].innerHTML,
					"count": count
				});
			}
			results.total = total;
			return results;
		},
		gotopost: function(html_string){
			var $div = document.createElement("div"),
				$body,
				response = {},
				$page_change_widget;
			
			html_string = html_string.replace(/<body/g, '<new-body'); //because <body> won't parse but a <new-body ...> will
			$div.innerHTML = html_string;
			$body = $("new-body", $div)[0];
			response.forum_id = $body.getAttribute("data-forum");
			response.thread_id = $body.getAttribute("data-thread");
			$page_change_widget = $("div.pages option[selected=selected]", $div);
			if($page_change_widget.length > 0) {
				response.page_number = parseInt($page_change_widget[0].innerText, 10);
			} else {
				response.page_number = 1;
				//console.log("unable to parse page number", $div.innerHTML);
			}
			return response;
		},
		newpost: function(html_string){
			var $div = document.createElement("div"),
				$body,
				response = {},
				$page_widget;
			
			html_string = html_string.replace(/<body/g, '<new-body'); //because <body> won't parse but a <new-body ...> will
			$div.innerHTML = html_string;
			$body = $("new-body", $div)[0];
			response.forum_id = $body.getAttribute("data-forum");
			response.thread_id = $body.getAttribute("data-thread");
			$page_widget = $("div.pages option[selected=selected]", $div);
			if($page_widget.length){
				response.new_page_number = parseInt($page_widget[0].innerText, 10);
			} else {
				response.new_page_number = 1;
			}
			return response;
		},
		lastpost: function(html_string){
			var $div = document.createElement("div"),
				$body,
				response = {},
				$page_widget;
			
			html_string = html_string.replace(/<body/g, '<new-body'); //because <body> won't parse but a <new-body ...> will
			$div.innerHTML = html_string;
			$body = $("new-body", $div)[0];
			response.forum_id = $body.getAttribute("data-forum");
			response.thread_id = $body.getAttribute("data-thread");
			$page_widget = $(".pages select", $div);
			if($page_widget.length){
				response.last_page_number = parseInt($page_widget[0].options[$page_widget[0].length - 1].value, 10);
			} else {
				response.last_page_number = 1;
			}
			return response;
		}
	};

	var $ = function(){
		var nodelist_to_array = function(nodelist){
			if(nodelist === null) return [];
			return Array.prototype.slice.call(nodelist);
		};
		return function(selector, scope){
			// very simple node selector
			var nl2a = nodelist_to_array;
			scope = scope || document;
			if(!selector) { console.log("Empty selector"); console.trace(); }
			if(selector.indexOf(" ") >= 0 || selector.indexOf("[") >= 0 || selector.substr(1).indexOf(".") >= 0) return nl2a(scope.querySelectorAll(selector));
			if(selector.substring(0,1) === "#") {
				if(scope.getElementById === undefined) return nl2a(scope.querySelectorAll(selector)); //because only document has getElementById but all elements have querySelectorAll (I think)
				return [scope.getElementById(selector.substring(1))];
			}
			if(selector.substring(0,1) === ".") return nl2a(scope.getElementsByClassName(selector.substring(1)));
			return nl2a(scope.getElementsByTagName(selector));
		};
	}();

	var get_param = function(params_string, key){
        var half = params_string.split(key + '=')[1];
        return half ? decodeURIComponent(half.split('&')[0]) : null;
    };

    var escape_html = function(){
        var _escape_chars = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&apos;",
                '"': "&quot;"
            },
            _escape = function(char){
                return _escape_chars[char];
            };

        return function(str){
            return str.replace(/[&<>"']/g, _escape);
        };
    }();

    var unescape_html = function(){
		var _entities = {
				"amp":  "&",
				"lt":   "<",
				"gt":   ">",
				"apos": "'",
				'quot': '"'
			},
			_escape = function(match, entity){
				if(_entities[entity]) return _entities[entity];
				return "&" + entity + ";";
			};

		return function(str){
			return str.replace(/&(.*?);/g, _escape);
		};
	}();

    var parse_attributes_string = function(attributes_string){
        // although it would be easier to use the browsers DOM
        // to parse the attributes string (e.g. in a detached element)
        // that would make it potentially exploitable
        // eg a string of "<a onload='alert(\'deal with it\')'/>"
        // so we're doing string parsing even though it's a bit weird
        var attributes_regex = /([\-A\-Z:a-zA-Z0-9_]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g, // originally via but tweaked to support xmlns http://ejohn.org/files/htmlparser.js
            attributes = {};

        attributes_string.replace(attributes_regex, function(match, name){
            var value = arguments[2] ? arguments[2] :
                            arguments[3] ? arguments[3] :
                                arguments[4] ? arguments[4] : name;

            attributes[name] = value;
        });
        return attributes;
    };

    var generated_id_from_url = function(url){
		return escape_html(url.replace(/[^a-zA-Z0-9]/g, '_')); //not as unique as a hash, probably has collisions, but in practice a collision would be rare and more importantly would only have minor side-effects (loading more images than you want when on 3g/4g) so it's good enough[tm]
	};

	var cache = {};

}());