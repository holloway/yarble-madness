(function(){
	"use strict";

	window.page_turner_init = function($pages){

		if($pages.jquery){ //ensure that $pages is just an array of elements
            $pages = $pages.get();
        } else if($pages instanceof NodeList){
            $pages = Array.prototype.slice.call($pages);
        }

		var _this = {
			index: 0,
			$pages: $pages,
			init: function(){
				_this.move_to_page(_this.index);
                _this.trigger("init");
                document.addEventListener('keydown', _this.keydown, false);
			},
			init_$pages: function(){
				_this.$pages.map(function($page, i){
                    $page.style.display   = "none";
                    $page.style.minHeight = "100%";
                    $page.scroll_y = 0;
                    $page.style.width     = "100%";
                    $page.style.minWidth  = "100%";
                    $page.style.position  = "absolute";
                    
                    if(_this.effect.page_move_end) $page.addEventListener(css.transition_end, _this.effect.page_move_end);
                });
			},
			keydown: function(event){
				switch(event.keyCode){
					case 39:
					case 34:
						_this.move_to_page(_this.index + 1);
						break;
					case 33:
					case 37:
						_this.move_to_page(_this.index - 1);
						break;
				}
				
			},
			onchange: function(callback){
                _this.on("change", callback);
                return _this;
            },
            oninit: function(callback){
                _this.on("init", callback);
                _this.trigger("init", _this.$pages[_this.index], _this.index);
                return _this;
            },
            on: function(event_type, callback){
                if(!_this._on_callbacks) _this._on_callbacks = {};
                if(!_this._on_callbacks[event_type]) _this._on_callbacks[event_type] = [];
                _this._on_callbacks[event_type].push(callback);
            },
            trigger: function(event_type){
                if(!_this._on_callbacks || !_this._on_callbacks[event_type]) return;
                var callback;
                for(var i = 0; i < _this._on_callbacks[event_type].length; i++){
                    callback = _this._on_callbacks[event_type][i];
                    callback.apply(_this, arguments);
                }
            },
            move_to_page: function(i){
				var $pages = _this.$pages,
                    $page_current,
                    $page_before,
                    $page_after,
                    index;

				_this.index = Math.max(Math.min(i, $pages.length - 1), 0); // make sure we're not exceeding the range of $pages
				index = _this.index;
				$pages[index].setAttribute('class', 'current');
			
				$pages.slice(0, index).map(function($page){
					$page.setAttribute('class', 'past');
				});
				
				$pages.slice(index + 1).map(function($page){
					$page.setAttribute('class', 'future');
				});
            }

		};

		_this.init();

		return _this;
	};
}());