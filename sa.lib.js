(function(){
	"use strict";

	var http_base = "http://forums.somethingawful.com/";
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
				http_base + "account.php",
				{action:"logout", ma: ma},
				response_filters.logout(callback)
			);
		},
		threads: function(forum_id, page_number, callback){
			if(page_number === undefined) page_number = 1;
			return request.get(
				http_base + 'forumdisplay.php',
				{forumid: forum_id, pagenumber: page_number},
				response_filters.threads(callback, forum_id, page_number)
			);
		},
		announcement: function(forum_id, callback){
			if(forum_id === undefined) forum_id = 1; //because forumid typically doesn't matter (but is required)
			return request.get(
				http_base + 'announcement.php',
				{forumid: forum_id},
				response_filters.announcement(callback, forum_id)
			);
		},
		posts: function(forum_id, thread_id, page_number, use_local_smilies, disable_images, callback){
			if(page_number === undefined) page_number = 1;
			if(use_local_smilies === undefined) use_local_smilies = true;
			if(disable_images === undefined) disable_images = false; // NOTE: disable_images also applies to youtube/vimeo/etc videos
			return request.get(
				http_base + 'showthread.php',
				{threadid: thread_id, pagenumber: page_number},
				response_filters.posts(callback, forum_id, thread_id, page_number, use_local_smilies, disable_images)
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
				console.log("sa.js: Error response", this, this.responseText);
				if(this.status !== 0) alert(this.status);
				return;
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
				
				success = this.responseText.match(/Log Out/g);
				return fn.apply(this, [success]);
			};
		},
		threads: function(fn, forum_id, page_number){
			return function(){
				var response = sa.response_parse.threads(this.responseText);
				return fn.apply(this, [response, forum_id, page_number]);
			};
		},
		posts: function(fn, forum_id, thread_id, page_number, use_local_smilies, disable_images){
			return function(){
				var response = sa.response_parse.posts(this.responseText, use_local_smilies, disable_images);
				return fn.apply(this, [response, forum_id, thread_id, page_number, use_local_smilies, disable_images]);
			};
		},
		logout: function(fn){
			return function(){
				var $div = document.createElement("div"),
					$content,
					success = false,
					innerHTML;

				$div.innerHTML = remove_external_resources(this.responseText);
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
		scrape_useful_stuff: function(html_string){
			var $div = document.createElement("div"),
				innerText,
				$result,
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
		threads: function(html_string){
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
				response = {threads: [], error: false},
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
					response.threads.push(thread);
				}
			}
			return response;
		},
		posts: function(html_string, use_local_smilies, disable_images){
			var $div = document.createElement("div"),
				$posts_container,
				$posts,
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
				response = {posts:[]},
				i,
				post,
				process_image = function(match, force_disable_images){
					var attributes_string = match.substr(match.indexOf(" "));
					attributes_string = attributes_string.substr(0, attributes_string.indexOf(">"));
					attributes = parse_attributes_string(attributes_string);
					if(attributes.src && attributes.src.substr(0, "attachment.php".length) === "attachment.php"){
						attributes.src = http_base + attributes.src;
						match = '<img src="' + attributes.src + '">';
					}
					if(use_local_smilies){
						attribute = attributes.title;
						// note: smiles_cache (a global) is found in smilies-cache.js and that file is dynamically built from the nodejs script get-smilies.js
						if(smiles_cache && smiles_cache[attribute] && attributes.src.match(/somethingawful\.com/)){
							return '<img src="images/smilies/' + smiles_cache[attribute].filename + '" title="' + escape_html(attribute) + '" class="smiley">';
						}
					}
					if(disable_images || force_disable_images === true) {
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
			// i know parsing html as a string is stupid, but we need to parse it without attaching to the DOM (to prevent loading :nws: images for example)
			// most things are done in a DOM but some stuff needs to be done before that

			html_string = html_string.replace(/<!--[\s\S]*?-->/g, '');
			html_string = html_string.replace(/<body/g, '<new-body'); //because <body> would be filtered when setting innerHTML (because you can't have two in a page?), but a made-up tag like <new-body> won't be
			html_string = html_string.replace(/<div class="threadbar bottom">[\s\S]*$/, '');
			html_string = html_string.replace(/<ul class="postbuttons">[\s\S]*?<\/ul>/g, '');
			html_string = html_string.replace(/<dd class="title">[\s\S]*?<\/dd>/g, '');
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
				if(!match.match(/vimeo\.com/)) return ""; // we don't want objects that we don't recognise in the page
				var video_id = match.substr(match.indexOf("clip_id=") + "clip_id=".length);
				video_id = video_id.substr(0, video_id.indexOf("&")).replace(/[^0-9]/g, '');
				return '<a class="video-player" target="_blank" href="http://vimeo.com/' + video_id + '"><img src="images/video.png" class="video_play_button"></a>';
			});

			$div.innerHTML = html_string; // we can't run yarble.utils.remove_external_resources on this because we actually want the external resources (posts containing images, for example), and at least this will start the browser downloading them
			$new_body = $("new-body", $div)[0];
			response.forum_id = $new_body.getAttribute("data-forum");
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
			$posts_container = $("#thread", $div)[0];

			$posts = $("table", $posts_container);

			$title = $("#content .breadcrumbs .bclast", $div);

			if($title.length) {
				response.title = $title[0].innerText;
			}

			for(i = 0; i < $posts.length; i++){
				$post = $posts[i];
				if(! $(".postbody", $post)[0]){
					console.log("no body?", $post.innerHTML, $post.parentNode);
				}
				var post_id = $post.getAttribute("id");
				if(post_id) {
					post_id = parseInt(post_id.replace(/^post/, ''), 10);
				} else {
					post_id = undefined;
				}
				post = {
					id: post_id,
					body: $(".postbody", $post)[0].innerHTML,
					postdate: $(".postdate", $post)[0].innerHTML.replace(/<a[\s\S]*?<\/a>/g, ''),
					user: {
						name: $(".author", $post)[0].innerHTML,
						user_id: get_param($(".user_jump", $post)[0].getAttribute("href"), "userid"),
						registered: $(".registered", $post)[0].innerHTML,
					}
				};
				$lastseen = $(".lastseen", $post);
				if($lastseen) {
					response.lastseen = parseInt($(".count b", $lastseen[0]), 10);
				}
				response.posts.push(post);
			}
			return response;
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
				console.log("unable to parse page number", $div.innerHTML);
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
			if(selector.indexOf(" ") >= 0 || selector.indexOf("[") >= 0) return nl2a(scope.querySelectorAll(selector));
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