(function(){
	"use strict";

	var request = require('request'),
		crypto = require('crypto'),
		yql = require('yql'),
		fs = require('fs'),
		http_response = function(posticon, filename){
			return function(error, response, body) {
				var path = "images/posticons/" + filename;
				if (!error && response.statusCode == 200) {
					fs.writeFile(path, body, fs_error);
					console.log("Successfully saved posticon #" + posticon + " to " + path);
					posticons_cache[posticon] = {filename:filename};
					fs.writeFile("posticons-cache.js", "var posticons_cache=" + JSON.stringify(posticons_cache) + ";"); //keep clobbering the file with the latest results
				}
			};
		},
		fs_error = function(err){
			if(err) throw err;
		};

	var forum_ids = [1,31,268,219];
	var post_icons = new Array(1000);
	var posticons_cache = {};

	for(var i = 0; i < post_icons.length; i++){
		post_icons[i] = {id: i, got:false};
	}

	posticons_cache[0] = {filename:"b6589fc6ab0dc82cf12099d1c2d40ab994e8410c.gif"}; // for some reason it's not downloading this one. looks like an off-by-one error. so i've got two options 1) find this bug, 2) download the image, insert it, hardcode the reference...of those two options i choose life

	for(var forum_id_index = 0; forum_id_index < forum_ids.length; forum_id_index++){
		var forum_id = forum_ids[forum_id_index];
		for(var post_icon_index = 0; post_icon_index < post_icons.length; post_icon_index++){
			var post_icon = post_icons[post_icon_index];
			if(post_icon.got !== false || post_icon.got === true) continue;
			var query = "select * from data.html.cssselect where url='http://forums.somethingawful.com/forumdisplay.php?forumid=" + forum_id + "&posticon=" + post_icon.id + "' and css='.icon a' ";
			yql.exec(query, function(response) {
				var query = response.query;
				if(query.count === 0) return;
				if(!query.results || !query.results.results || !query.results.results.a) return;
				var first_one = query.results.results.a[0];
				if(!first_one) return;
				var href = first_one.href;
				href = href.substr(href.indexOf("?") + 1);
				var posticon = parseInt(href.substr(href.indexOf("posticon=") + "posticon=".length), 10);
				var url = first_one.img.src;
				post_icons[posticon].got = true; //not true yet but if we assume we might not get it then we delay and cause many more requests to the SA servers which we're trying to avoid doing
				var filename = crypto.createHash('sha1').update(posticon.toString()).digest("hex");
				var extension = ".gif";
				if(url.substr(url.lastIndexOf(".")).match(/\.png/)){
					extension = ".png";
				} else if(url.substr(url.lastIndexOf(".")).match(/\.jp/)){
					extension = ".jpeg";
				}
				filename += extension;
				
				request(
					{method: 'GET', url: url, encoding: null}, // 'encoding:null' means that body will be returned as binary, not text
					http_response(posticon, filename)
				);
			});
		}
	}

	
	console.log("Written results to posticons-cache.js. Please wait because I'm still downloading though.")
}());