(function(){
	// NOTE: this is a command-line Node.js script for caching the posticons.
	"use strict";

	var request = require('request'),
		crypto = require('crypto'),
		yql = require('yql'),
		fs = require('fs'),
		vm = require('vm'),
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
		},
		includeInThisContext = function(path) {
			var code = fs.readFileSync(path);
			vm.runInThisContext(code, path);
		}.bind(this);

	includeInThisContext(__dirname + "/posticons-cache.js");

	var forum_ids = [154]; // , 
	var post_icons = new Array(1);

	for(var i = 0; i < post_icons.length; i++){
		post_icons[i] = {id: 469, got:false};
	}

	for(var forum_id_index = 0; forum_id_index < forum_ids.length; forum_id_index++){
		var forum_id = forum_ids[forum_id_index];
		for(var post_icon_index = 0; post_icon_index < post_icons.length; post_icon_index++){
			var post_icon = post_icons[post_icon_index];
			if(posticons_cache[post_icon.id]) continue;
			if(post_icon.got !== false || post_icon.got === true) continue;
			console.log("attempting to get ", forum_id, post_icon.id);
			var query = "select * from data.html.cssselect where url='http://forums.somethingawful.com/forumdisplay.php?forumid=" + forum_id + "&posticon=" + post_icon.id + "' and css='.icon a' ";
			console.log(query);
			yql.exec(query, function(response) {
				var query = response.query;
				console.log("response", response);
				
				if(query.count === 0) return;
				if(!query.results || !query.results.results || !query.results.results.a) return;
				var first_one = query.results.results.a[0] || query.results.results.a;
				console.log("REsult! first one", query.results.results, first_one);
				if(!first_one) return;
				var href = first_one.href;
				href = href.substr(href.indexOf("?") + 1);
				var posticon = parseInt(href.substr(href.indexOf("posticon=") + "posticon=".length), 10);
				console.log("found posticon ", posticon);
				var url = first_one.img.src;
				if(url.indexOf("#") !== -1) url = url.substr(0, url.indexOf("#"));
				post_icons[posticon].got = true;
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