(function(){
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
			http_response = function(code, filename){
				return function(error, response, body) {
					filename = "smilies/" + filename;
					console.log("Writing ", code, " to ", filename);
					if (!error && response.statusCode == 200) {
						fs.writeFile(filename, body);
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
		fs.writeFile("smilies.json", JSON.stringify(smilies));
	});
}());