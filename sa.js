(function(){
	"use strict";

	window.sa = {
		http_base:   "http://forums.somethingawful.com/",
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
			return get_request(
				sa.http_base + scraped.logout_url,
				{action:"logout", ma: ma},
				callback
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
		if(body_params_string) request.send(body_params_string);
		return request;
	};

	var search_for_error_message = function(html_string){
		html_string = html_string.replace(/^[\s\S]*?<body[^>]*?/, '');
		console.log(html_string);
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
				// What you want to do on failure
				alert(this.status + " : " + search_for_error_message(this.responseText));
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
			if(innerText.match(/wildest dreams come true/i)) {
				scraped.logout_url = $result[i].getAttribute("href").substr(1);
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
				$div.innerHTML = remove_external_resources(this.responseText);
				success = ($("#notregistered", $div).length === 0);
				// a common error is that the browser has 3rd party cookies disabled, so when it redirects from account.php to / the cookies set in account.php do not persist to /
				return fn.apply(this, [success]);
			};
		}
	};

}());