BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

/**
 * @class The Value Object that is used to pass messages in the BCC JS SDK  
 * @constructor
 * @param {string} eventType
 * @param {string} eventKey
 * @param {JSON} msg
 * @private
 */
BCC.Event = function(eventType, eventKey, msg) {
	this.eventType = eventType;
	this.eventKey = eventKey;
	this.msg = msg;
	/**
	 * Returns the eventType
	 * @returns {string}
	 */
	this.getType = function() { return this.eventType; };
	/**
	 * Returns the eventKey
	 * @returns {string}
	 */
	this.getKey = function() { return this.eventKey; };
	/**
	 * Returns the msg
	 * @returns {JSON}
	 */
	this.getMessage = function() { return this.msg; };
};

/**
 * The global Object that registers and dispatches events (BCC.Event) to the BCC event oriented objects
 * @namespace
 * @private
 */
BCC.EventDispatcher = {
		listenerMap : null,
		/**
		 * Called to initialize the global object 
		 * @private
		 */
		_init : function(){
			BCC.EventDispatcher.listenerMap = new Array();
		},
		/**
		 * Assigns and returns an id to the BCC event oriented object
		 * @param {object} object BCC event oriented object
		 * @returns {string} id of the object
		 */
		getObjectKey : function(object) {
			if(object.id == null) //timestamp + random # to give a unique ID
				object.id = new Date().getTime() + Math.floor(Math.random()*1000);
			return object.id;
		},
		/**
		 * Registers a BCC event oriented object to the key
		 * @param {string} key
		 * @param {object} listenerObj BCC event oriented object
		 */
		register : function(key, listenerObj) {
			//Sets the object Id to the listenerObj, if not already set
			BCC.EventDispatcher.getObjectKey(listenerObj);

			for(var index in BCC.EventDispatcher.listenerMap){
				if(key == BCC.EventDispatcher.listenerMap[index].key){
					BCC.EventDispatcher.listenerMap[index].addListener(listenerObj);
					return;
				}
			}
			BCC.EventDispatcher.listenerMap.push(new BCC.Listener(key, listenerObj));
		},
		/**
		 * Unregisters a BCC event oriented object from the key
		 * @param {string} key
		 * @param {object} listenerObj BCC event oriented object
		 */
		unregister : function(key, listenerObj) {
			for(var index in BCC.EventDispatcher.listenerMap){
				if(key == BCC.EventDispatcher.listenerMap[index].key){
					if(BCC.EventDispatcher.listenerMap[index].listeners.length == 1)
						BCC.EventDispatcher.listenerMap.splice(index, 1);
					else
						BCC.EventDispatcher.listenerMap[index].removeListener(listenerObj);
					return;
				}
			}
		},
		/**
		 * Gets the list of listeners from the listenerMap and dispatches the event (BCC.Event)   
		 * @param {BCC.Event} event 
		 */
		dispatch : function(event) {
			var listeners = BCC.EventDispatcher.getListeners(event.eventKey);
			for (var index in listeners) {
				var listener = listeners[index];
				var f = listener[event.eventType];
				if ("function" == typeof(f)) {
					//f(event.msg);
					f.call(listener, event.msg);
				}
				
				if (("onresponse" == event.eventType) || ("onerror" == event.eventType)) {
					if(typeof listener.isCommand == "function" && !!(listener.isCommand())){
						BCC.EventDispatcher.unregister(listener.id, listener);
						BCC.Log.info("Command object unregistered.", "BCC.EventDispatcher.dispatch");
					}
				}
			}
		},
		/**
		 * Returns the list of listeners from the listenerMap for a key   
		 * @param {string} key
		 */
		getListeners : function(key) {
			var listeners = null;
			for(var index in BCC.EventDispatcher.listenerMap){
				if(key == BCC.EventDispatcher.listenerMap[index].key) {
					listeners = BCC.EventDispatcher.listenerMap[index].listeners;
					break;
				}
			}
			return listeners;
		}
};
BCC.EventDispatcher._init();

/**
 * @class The listener object that holds the registered listeners for the key   
 * @constructor
 * @param {string} key
 * @param {object} listenerObj BCC event oriented object
 * @private
 */
BCC.Listener = function(key, listenerObj){
	this.key = null;
	this.listeners = null;

	/**
	 * Called by the constructor to initialize the object 
	 * @private
	 */
	this._init = function(){
		if(key == null || listenerObj ==null){
			BCC.Log.error("Key and Listener are mandatory","BCC.Listener.constructor");
			return;
		}
		this.key = key;
		this.listeners = new Array();
		this.listeners.push(listenerObj);
	};
	/**
	 * Adds a listener
	 * @param {object} listenerObj BCC event oriented object
	 */
	this.addListener = function(listenerObj){
		this.listeners.push(listenerObj);
	};
	/**
	 * Removes a listener
	 * @param {object} listenerObj BCC event oriented object
	 */
	this.removeListener = function(listenerObj){
		for(var index in this.listeners){
			if(listenerObj.id == this.listeners[index].id)
				this.listeners.splice(index, 1);
		}
	};

	this._init();
};