(function(){
	"use strict";

	var	$user,
		$login,
		$login_button,
		$options,
		$logout_button,
		user,
		last_login_attempt_username,
		CONSTANTS = {
			user_storage_key: "yarble:user"
		},
		$ = yarble.utils.$,
		init = function(){
			$user = $("#user")[0];
			$login = $("#login")[0];
			$login_button = $("button", $login)[0];
			$login_button.addEventListener("click", login, false);
			$options = $("#options", $user)[0];
			$logout_button = $("button", $options)[0];
			user = window.localStorage.getItem(CONSTANTS.user_storage_key);
			$logout_button.addEventListener("click", logout, true);
			if(!user) {
				yarble.utils.event.trigger("yarble:change-page-id", "user");
			}
		};

	document.addEventListener("DOMContentLoaded", init);

    window.yarble.utils.event.on("yarble:page-change:user", function(){
		if(!$user) init();
		user = window.localStorage.getItem(CONSTANTS.user_storage_key);
		$login.style.display =    user ? "none" : "block";
		$options.style.display = !user ? "none" : "block";
    });

    var login = function(){
		last_login_attempt_username = $("input[name=username]", $login)[0].value;
		sa.login(
			last_login_attempt_username,
			$("input[name=password]", $login)[0].value,
			login_response
		);
    };

    var login_response = function(success){
		if(success) {
			window.localStorage.setItem(CONSTANTS.user_storage_key, last_login_attempt_username);
			window.yarble.utils.event.trigger("yarble:page-update:forums", this.responseText);
			window.yarble.utils.event.trigger("yarble:change-page-id", "forums");
		} else {
			console.log("Can't login. If it's the correct username/password then a common error is that the browser has 3rd-party cookies disabled, so when it redirects from account.php to '/'' the cookies set in 'account.php' do not persist to '/' ");
			alert("wrong username/password ya dingus");
		}
	};

	var logout = function(){
		sa.logout(logout_response);
	};

	var logout_response = function(success){
		if(success){
			user = undefined;
			window.localStorage.removeItem(CONSTANTS.user_storage_key);
			window.yarble.utils.event.trigger("yarble:page-change:user");
			$("input[name=username]", $login)[0].value = "";
			$("input[name=password]", $login)[0].value = "";
		} else {
			alert("Unable to logout. I don't know why. Weird.");
		}
	};

}());

