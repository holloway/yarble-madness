(function(){
	"use strict";

	window.yarble = window.yarble || {};

	window.yarble.utils = {
        event: {
            bindings: {},
            on: function(name, callback){
                var bindings = window.doctored.event.bindings;
                if(bindings[name] === undefined) bindings[name] = [];
                bindings[name].push(callback);
            },
            off: function(name, callback){
                var bindings = window.doctored.event.bindings,
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
                var bindings = window.doctored.event.bindings,
                    i;
                if(bindings[name] === undefined) return;
                for(i = 0; i < bindings[name].length; i++){
                    setTimeout(bindings[name][i], 0); //go on async stack, don't execute immediately
                }
            }
        },
        $: function(selector, scope){
            // very simple node selector
            scope = scope || document;
            if(!selector) { console.log("Empty selector"); console.trace(); }
            if(selector.indexOf(" ") >= 0 || selector.indexOf("[") >= 0) return scope.querySelectorAll(selector);
            if(selector.substring(0,1) === "#") return scope.getElementById(selector.substring(1));
            if(selector.substring(0,1) === ".") return scope.getElementsByClassName(selector.substring(1));
            return scope.getElementsByTagName(selector);
        }
    };
}());