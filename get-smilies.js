(function(){
	// NOTE: this is a command-line Node.js script for caching the smilies.
	"use strict";

	var request = require('request'),
		crypto = require('crypto'),
		yql = require('yql'),
		fs = require('fs');

	var query = "select * from data.html.cssselect where url='http://forums.somethingawful.com/misc.php?action=showsmilies' and css='.smilie' ";

	yql.exec(query, function(response) {
		var	lis = response.query.results.results.li,
			smilies = {},
			li,
			code,
			url,
			i,
			filename,
			fs_error = function(err){
				if(err) throw err;
			},
			http_response = function(code, filename){
				return function(error, response, body) {
					filename = "./images/smilies/" + filename;
					console.log("Writing ", code, " to ", filename);
					if (!error && response.statusCode == 200) {
						fs.writeFile(filename, body, fs_error);
					}
				};
			};

		console.log("Got " + lis.length + " smilies.");
		for(i = 0; i < lis.length; i++){
			li = lis[i];
			code = li.div.p;
			url = li.img.src;
			filename = crypto.createHash('sha1').update(code).digest("hex") + ".gif";
			smilies[code] = {filename: filename, title: li.img.title};
			request(
				{method: 'GET', url: url, encoding: null}, // 'encoding:null' means that body will be returned as binary, not text
				http_response(code, filename)
			);
		}
		fs.writeFile("smilies-cache.js", "var smiles_cache=" + JSON.stringify(smilies) + ";");
	});
}());