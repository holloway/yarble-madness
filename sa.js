(function(){
	"use strict";

	window.sa = {
		http_base:  "http://forums.somethingawful.com/",
		https_base: "https://forums.somethingawful.com/",
		login: function(username, password, callback){
			cache.last_username = username;
			return post_request(
				sa.https_base + "account.php",
				undefined,
				{username: username, password: password, action: "login", next: "/"},
				response_filters.login(callback)
			);
		},
		logout: function(callback){
			var ma = scraped.logout_ma || localStorage.getItem("yarble:logout:ma");
			if(!ma) callback(false);
			return get_request(
				sa.http_base + "account.php",
				{action:"logout", ma: ma},
				response_filters.logout(callback)
			);
		},
		threads: function(forum_id, page_number, callback){
			if(page_number === undefined) page_number = 1;
			return get_request(
				sa.http_base + 'forumdisplay.php',
				{forumid: forum_id, pagenumber: page_number},
				response_filters.threads(callback, forum_id)
			);
		},
		announcement: function(forum_id, callback){
			if(forum_id === undefined) forum_id = 1; //because forumid typically doesn't matter (but is required)
			return get_request(
				sa.http_base + 'announcement.php',
				{forumid: forum_id},
				callback
			);
		},
		posts: function(forum_id, thread_id, page_number, callback){
			if(page_number === undefined) page_number = 1;
			return get_request(
				sa.http_base + 'showthread.php',
				{threadid: thread_id, pagenumber: page_number},
				response_filters.posts(callback, forum_id, thread_id, page_number)
			);
		}
	};

	var get_request = function(url, url_params, callback, async){
		if(async === undefined) async = true;
		var params_string = serialize_params(url_params);
		if(params_string){
			if(url.indexOf("?") === -1) url += "?";
			url += params_string;
		}
		var request = new window.XMLHttpRequest();
		request.open('GET', url, async);
		request.onreadystatechange = response(callback);
		request.setRequestHeader('Referer', sa.https_base);
		request.send();
		return request;
	};

	var post_request = function(url, url_params, body_params, callback, async){
		if(async === undefined) async = true;
		var request = new window.XMLHttpRequest();
		var url_params_string = serialize_params(url_params);
		if(url_params_string){
			if(url.indexOf("?") === -1) url += "?";
			url += url_params_string;
		}
		var body_params_string = serialize_params(body_params, true);
		request.open('POST', url, async);
		request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		request.onreadystatechange = response(callback);
		request.setRequestHeader('Referer', sa.https_base);
		if(body_params_string) {
			request.send(body_params_string);
		} else {
			request.send();
		}
		return request;
	};

	var search_for_error_message = function(html_string){
		html_string = html_string.replace(/^[\s\S]*?<body[^>]*?/, '');
		return html_string;
	};

	var response = function(fn){
		if(fn === undefined) {
			console.trace();
			alert("Error: response in sa.js called with non-existant function. See console.log");
		}
		return function(){
			var args = arguments;
			if(this.readyState !== 4) return;
			if(this.status !== 200 && this.status !== 302) {
				console.log("sa.js: Error response", this);
				if(this.status !== 0) alert(this.status + " : " + search_for_error_message(this.responseText));
				return;
			}
			scrape_useful_stuff(this.responseText);
			return fn.apply(this, args);
		};
	};

	var scrape_useful_stuff = function(html_string){
		var $div = document.createElement("div"),
			innerText,
			$result,
			i;

		$div.innerHTML = remove_external_resources(html_string);
		$result = $("a", $div);
		for(i = 0; i < $result.length; i++){
			innerText = $result[i].innerText;
			if(innerText.match(/wildest dreams come true/i) || innerText.match(/log out/i)) {
				scraped.logout_ma = window.yarble.utils.get_param($result[i].getAttribute("href"), "ma");
				localStorage.setItem("yarble:logout:ma", scraped.logout_ma);
			} else if(innerText === cache.last_username){ //FIXME figure out a smarter way of doing this
				scraped.member_page_url = $result[i].getAttribute("href").substr(1);
			}
		}
		// TODO: trigger an event with the updated scraped data
	};

	var cache = {};

	var scraped = {};

	var remove_external_resources = yarble.utils.remove_external_resources;

	var $ = yarble.utils.$;

	var serialize_params = function(params, escape_nonstandard_characters_too){
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
		threads: function(fn, forum_id){
			return function(){
				return fn.apply(this, [forum_id]);
			};
		},
		posts: function(fn, forum_id, thread_id, page_number){
			return function(){
				return fn.apply(this, [forum_id, thread_id, page_number]);
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
		}
	};
}());