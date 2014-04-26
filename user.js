(function(){
	"use strict";

	var	$user,
		$username,
		$password,
		$login,
		$login_button,
		$options,
		$logout_button,
		user,
		last_login_attempt_username,
		CONSTANTS = {
			user_storage_key: "yarble:user",
			first_time_key:   "yarble:first-time-user",
			download_on_mobile: "yarble:download-when-on-3g4g"
		},
		disable_images_on_3g4g_button_state = false,
		$do_mobile_download,
		$ = yarble.utils.$,
		init = function(){
			$user = $("#user")[0];
			$username = $("input[name=username]", $login)[0];
			$password = $("input[name=password]", $login)[0];
			$login = $("#login")[0];
			$login_button = $("button", $login)[0];
			$login_button.addEventListener("click", login, false);
			$options = $("#options", $user)[0];
			$logout_button = $("button", $options)[0];
			user = window.localStorage.getItem(CONSTANTS.user_storage_key);
			$logout_button.addEventListener("click", logout, true);
			if(!user) {
				yarble.utils.event.trigger("yarble:change-page-id", "user");
			} else {
				yarble.utils.event.trigger("yarble:change-page-id", "forums");
			}
			$do_mobile_download = $("#mobiledownload")[0];
			$do_mobile_download.addEventListener("click", toggle_mobile_download, true);
			disable_images_on_3g4g_button_state = window.localStorage.getItem(CONSTANTS.download_on_mobile) ? !!JSON.parse(window.localStorage.getItem(CONSTANTS.download_on_mobile)) : false;
			
			update_mobile_download();
		};

	var toggle_mobile_download = function(event){
		disable_images_on_3g4g_button_state = !disable_images_on_3g4g_button_state;
		update_mobile_download();
	};

	var update_mobile_download = function(){
		var yarble = window.yarble || {};
		window.yarble = yarble;
		yarble.disable_images = false;
		if(disable_images_on_3g4g_button_state){
			if(navigator.connection && navigator.connection.type){ // potentially phonegap app
				var states = {};
				alert(navigator.connection.type);
				alert(Connection);
			}
		}
		window.localStorage.setItem(CONSTANTS.download_on_mobile, disable_images_on_3g4g_button_state);
		
		if(disable_images_on_3g4g_button_state){
			$do_mobile_download.classList.add("on");
			$do_mobile_download.classList.remove("off");
		} else {
			$do_mobile_download.classList.add("off");
			$do_mobile_download.classList.remove("on");
		}
	};
	
	document.addEventListener(init_event_id, init);

    window.yarble.utils.event.on("yarble:page-change:user", function(){
		if(!$user) init();
		user = window.localStorage.getItem(CONSTANTS.user_storage_key);
		$login.style.display =    user ? "none" : "block";
		$options.style.display = !user ? "none" : "block";
    });

    var login = function(){
		$("button", $login)[0].classList.add("loading");
		last_login_attempt_username = $username.value;
		sa.login(
			last_login_attempt_username,
			$password.value,
			login_response
		);
    };

    var login_response = function(success){
		$("button", $login)[0].classList.remove("loading");
		if(success) {
			window.localStorage.setItem(CONSTANTS.user_storage_key, last_login_attempt_username);
			window.yarble.utils.event.trigger("yarble:page-update:forums", sa.response_parse.forums(this.responseText));
			if(!window.localStorage.getItem(CONSTANTS.first_time_key)){
				window.localStorage.setItem(CONSTANTS.first_time_key, false);
				window.yarble.utils.event.trigger("yarble:change-page-id", "user");
			} else {
				window.yarble.utils.event.trigger("yarble:change-page-id", "forums");
			}
		} else {
			console.log("Can't login. If it's the correct username/password then a common error is that the browser has 3rd-party cookies disabled, so when it redirects from account.php to '/'' the cookies set in 'account.php' do not persist to '/' ");
			$password.value = "";
			$username.focus();
			alert("wrong username/password ya dingus");
		}
	};

	var logout = function(){
		window.localStorage.removeItem(CONSTANTS.user_storage_key);
		sa.logout(logout_response);
	};

	var logout_response = function(success){
		if(success){
			user = undefined;
			window.yarble.utils.event.trigger("yarble:page-change:user");
			$username.value = "";
			$password.value = "";
			$("input[name=password]", $login)[0].value = "";
		} else {
			alert("Unable to logout. I don't know why. Weird.");
		}
	};

}());

