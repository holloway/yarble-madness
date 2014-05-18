(function(){
	"use strict";

    var ua = navigator.userAgent.toString();

	window.yarble = window.yarble || {};

	window.yarble.utils = {
        is_touch_device: 'ontouchstart' in document.documentElement,
        event: {
            bindings: {},
            on: function(name, callback){
                var bindings = window.yarble.utils.event.bindings;

                if(bindings[name] === undefined) bindings[name] = [];
                bindings[name].push(callback);
            },
            off: function(name, callback){
                var bindings = window.yarble.utils.event.bindings,
                    callback_string = callback.toString(),
                    i;

                if(bindings[name] === undefined) return;
                for(i = bindings[name].length; i > 0; i--){
                    if(callback_string == bindings[name][i].toString()){
                        bindings[name].splice(i, 1);
                    }
                }
            },
            trigger: function(name){
                var bindings = window.yarble.utils.event.bindings,
                    i,
                    args = Array.prototype.slice.call(arguments).slice(1),
                    callback = function(fn, args){
                        return function(){
                            return fn.apply(this, args);
                        };
                    };
                    
                if(bindings[name] === undefined) return;
                for(i = 0; i < bindings[name].length; i++){
                    setTimeout( callback(bindings[name][i], args), 0); //go on async stack, don't execute immediately
                }
            }
        },
        nodelist_to_array: function(nodelist){ //node list to array
            if(nodelist === null) return [];
            return Array.prototype.slice.call(nodelist);
        },
        $: function(selector, scope){
            // very simple node selector
            var nl2a = window.yarble.utils.nodelist_to_array;
            scope = scope || document;
            if(!selector) { console.log("Empty selector"); console.trace(); }
            if(selector.indexOf(" ") >= 0 || selector.indexOf("[") >= 0) return nl2a(scope.querySelectorAll(selector));
            if(selector.substring(0,1) === "#") {
                if(scope.getElementById === undefined) return nl2a(scope.querySelectorAll(selector)); //because only document has getElementById but all elements have querySelectorAll (I think)
                return [scope.getElementById(selector.substring(1))];
            }
            if(selector.substring(0,1) === ".") return nl2a(scope.getElementsByClassName(selector.substring(1)));
            return nl2a(scope.getElementsByTagName(selector));
        },
        remove_external_resources: function(html_string){
            // if a DOM node (detached or not) has innerHTML set to an HTML string it will start downloading resources that we don't care about, so let's avoid that
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
        get_param: function(params_string, key){
            var hash_index = params_string.indexOf("#");
            if(hash_index !== -1) params_string = params_string.substr(0, hash_index);
            var half = params_string.split(key + '=')[1];
            return half ? decodeURIComponent(half.split('&')[0]) : null;
        },
        is_ios: ua.match(/(iPad|iPhone|iPod)/g) ? true : false,
        is_android: ua.indexOf("Android") >= 0,
        transition_end_event: function(){
            var element = document.createElement('fakeelement'),
                transitions = {
                'transition':       'transitionend',
                'OTransition':      'otransitionEnd',
                'MozTransition':    'transitionend',
                'WebkitTransition': 'webkitTransitionEnd'
                },
                key;

            for(key in transitions){
                if(element.style[key] !== undefined){
                    return transitions[key];
                }
            }
        }(), //self executing in order to calculate the result once
    };
}());