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
			user_storage_key:   "yarble:user",
			first_time_key:     "yarble:first-time-user",
			download_on_mobile: "yarble:download-when-on-3g4g",
			cloud2butt:         "yarble:cloud2butt"
		},
		disable_images_on_3g4g_button_state = false,
		$do_mobile_download,
		$cloud2butt,
		connection = navigator.connection || navigator.webkitConnection,
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
			$do_mobile_download = $("#mobiledownload")[0];
			$do_mobile_download.addEventListener("click", toggle_mobile_download, true);
			$cloud2butt = $("#cloud2butt")[0];
			$cloud2butt.addEventListener("click", toggle_cloud2butt, true);
			var cloud2butt_setting = window.localStorage.getItem(CONSTANTS.cloud2butt);
			if(cloud2butt_setting === "true"){
				$cloud2butt.classList.remove("off");
				$cloud2butt.classList.add("on");
				window.cloud2butt = true;
			}
			disable_images_on_3g4g_button_state = window.localStorage.getItem(CONSTANTS.download_on_mobile) ? !!JSON.parse(window.localStorage.getItem(CONSTANTS.download_on_mobile)) : false;
			update_mobile_download();
			if(connection) connection.addEventListener('typechange', update_mobile_download); //Note: 'typechange' is a network connection change https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API
			setTimeout(update_mobile_download, 500);
			change_user();
			if(user) window.location.hash = "forums";
		},
		change_user = function(){
			user = window.localStorage.getItem(CONSTANTS.user_storage_key);
			alert(user);
			$login.style.display =   !!user ? "none" : "block";
			$options.style.display = !user ? "none" : "block";
		};

	var toggle_mobile_download = function(event){
		disable_images_on_3g4g_button_state = !disable_images_on_3g4g_button_state;
		update_mobile_download();
	};

	var update_mobile_download = function(){
		window.disable_images = false;
		if(!disable_images_on_3g4g_button_state){
			if(connection){ // potentially phonegap app
				var connection_type = connection.type;
				if(connection_type === undefined && navigator.network && navigator.network.connection){
					connection_type = navigator.network.connection.type;
				}
				window.disable_images = (connection_type >= 3); // 0 = unknown but connected. 1,2 = ethernet,wifi. 3,4,5,6 = 2g/3g/4g/cell. 7 = none. so >= 3 seems ok to detect cell connections, or lack of connections 
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

	var toggle_cloud2butt = function(){
		if($cloud2butt.classList.contains("on")){
			$cloud2butt.classList.remove("on");
			$cloud2butt.classList.add("off");
			window.localStorage.setItem(CONSTANTS.cloud2butt, false);
			window.cloud2butt = false;
		} else {
			$cloud2butt.classList.remove("off");
			$cloud2butt.classList.add("on");
			window.localStorage.setItem(CONSTANTS.cloud2butt, true);
			window.cloud2butt = true;
		}
	};

    window.yarble.utils.event.on("yarble:page-change:user", change_user);

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
			change_user();
			if(!window.localStorage.getItem(CONSTANTS.first_time_key)){
				window.localStorage.setItem(CONSTANTS.first_time_key, false);
			} else {
				window.location.hash = "forums";
			}
		} else {
			console.log("Can't login. If it's the correct username/password then a common error is that the browser has 3rd-party cookies disabled, so when it redirects from account.php to '/'' the cookies set in 'account.php' do not persist to '/' ");
			$password.value = "";
			$username.focus();
			alert("wrong username/password ya dingus");
		}
	};

	var logout = function(){
		if(confirm("Really logout?")){
			window.localStorage.removeItem(CONSTANTS.user_storage_key);
			sa.logout(logout_response);
		}
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

	document.addEventListener(init_event_id, init);

}());

