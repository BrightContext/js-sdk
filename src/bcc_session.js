//-----------------------------------------------------------------
// Copyright 2012 BrightContext Corporation
//
// Licensed under the MIT License defined in the 
// LICENSE file.  You may not use this file except in 
// compliance with the License.
//-----------------------------------------------------------------

BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

/**
 * @class The object that holds the user session info
 * @constructor
 * @param {string} apiKey
 * @private
 */
BCC.Session = function(apiKey) {
	this.apiKey = apiKey;
	this.xhr = null;
	this.sessionObj = null; 
	this.sid = null;
	this.ready = false;

	/**
	 * Called by the constructor to initialize the object 
	 * @private
	 */
	this._init = function(){
		if ((this.apiKey == null) || (BCC.Util.trim(this.apiKey) === "")) {
			BCC.Log.error("API Key missing.","BCC.Session.constructor");
			return;
		}
	};

	/**
	 * Opens the session
	 */
	this.open = function(){
		this._injectSWFObjectlib();
	};
	
	this._openSession = function(){
		var me = this;
		var onerror = function(){
			BCC.Log.error(me.xhr.getResponseText(), "BCC.Session._openSession");
			
			if ("function" == typeof(me.onerror)) {
				me.onerror("Session Open Failed");
			}
		};
		var onload = function() {
			try {
				me.sessionObj = JSON.parse(me.xhr.getResponseText());  // response is a sessionObj JSON object
				
				if (me.hasValidSession()) {
					me.sid = me.sessionObj.sid;
					me.ready = true;
					
					if(me.onopen != null) {
						me.onopen();
					}
				} else {
					if (("undefined" != typeof(me.sessionObj)) && ("undefined" != typeof(me.sessionObj.error))) {
						var ex = me.sessionObj.error;
						BCC.Log.error(ex, "BCC.Session._openSession");
						
						if ("function" == typeof(me.onerror)) {
							me.onerror(ex);
						}
					}
				}
			} catch (ex) {
				BCC.Log.error(ex, "BCC.Session._openSession");
				
				if ("function" == typeof(me.onerror)) {
					me.onerror(ex);
				}
			}
		};
		this._loadFromServer(onload, onerror);
	};
	
	this._injectSWFObjectlib = function(){
		if(typeof swfobject == "undefined"){
	        var swfScript = document.createElement('SCRIPT');
	        var headNode = document.getElementsByTagName('HEAD');
	        var me = this;

	        swfScript.type = 'text/javascript';
	        swfScript.src = BCC.SWF_OBJECT_LIB_PATH;
	        swfScript.async = true;

	        swfScript.onreadystatechange = function() {
	            if (this.readyState == 'loaded' || this.readyState == 'complete') {
                     me._injectJSONlib();
	            }
	        };
	        if (swfScript.readyState == null) {
                swfScript.onload = function() {
                     me._injectJSONlib();
	            };
	            swfScript.onerror = function() {
                     BCC.Log.error("Fatal error. Cannot inject dependancy lib (swfobject)", "BCC.Session._injectSWFObjectlib");
	            };
	        }
	        if (headNode[0] != null) headNode[0].appendChild(swfScript);
		} else {
			this._injectJSONlib();
		}
	};

	this._injectJSONlib = function(){
		if(typeof JSON == "undefined"){
	        var jsonScript = document.createElement('SCRIPT');
	        var headNode = document.getElementsByTagName('HEAD');
	        var me = this;

	        jsonScript.type = 'text/javascript';
	        jsonScript.src = BCC.JSON_LIB_PATH;
	        jsonScript.async = true;
	        
	        jsonScript.onreadystatechange = function() {
	            if (this.readyState == 'loaded' || this.readyState == 'complete') {
                     me._openSession();
	            }
	        };
	        if (jsonScript.readyState == null) {
                jsonScript.onload = function() {
                     me._openSession();
	            };
	            jsonScript.onerror = function() {
                     BCC.Log.error("Fatal error. Cannot inject dependancy lib (json2)", "BCC.Session._injectSWFObjectlib");
	            };
	        }
	        if (headNode[0] != null) headNode[0].appendChild(jsonScript);
		} else {
			this._openSession();
		}
	};

	this.hasValidSession = function() {
		var valid = (("undefined" != typeof(this.sessionObj)) &&
					 (null !== this.sessionObj) &&
					 ("undefined" == typeof(this.sessionObj.error)));
		return valid;
	};

	/**
	 * Synchronizes with server to get new Session details 
	 */
	this.syncWithServer = function() {
		var me = this;

		var onload = function() {
			me.sessionObj = JSON.parse(me.xhr.getResponseText());
			if (me.hasValidSession()) {
				me.sid = me.sessionObj.sid;
			
				if(me.onsync != null)
					me.onsync();
			} else {
				setTimeout(function(){
					BCC.Log.debug("Invalid Session. Trying to reconnect...", "BCC.Session.syncWithServer");
					me.syncWithServer();
				}, 5000);
			}
		};
		var onerror = function() {
			setTimeout(function(){
				BCC.Log.debug("Fatal connectivity error. Trying to reconnect...", "BCC.Session.syncWithServer");
				me.syncWithServer();
			}, 5000);
		};

		this._loadFromServer(onload, onerror);
	};
	/**
	 * Adds a property (key value pair) to the sessionObj JSON and then to the cookie
	 * @param {string} key
	 * @param {string} value
	 */
	this.addProperty = function(key, value) {
		this.sessionObj[key] = value;
	};

	/**
	 * Returns the sessionObj JSON
	 * @returns {JSON} sessionObj
	 */
	this.getProperties = function() {
		return this.sessionObj;
	};

	/**
	 * Returns the session Id
	 * @returns {string} sid
	 */
	this.getSessId = function() { 
		return this.sid; 
	};

	/**
	 * For Future Use. 
	 * Returns authed. 
	 * @returns {boolean} authed
	 */
	this.isAuthed = function() { 
		return this.sessionObj.authed; 
	};

	/**
	 * Returns the socket url
	 * @returns {string}
	 */
	this.getSocketUrl = function() {
		var ws = this.sessionObj.domain.replace("http://", "ws://");
		//return ws + "/socket.ws";
		return ws.replace(/\/$/,'') + "/" + BCC.API_COMMAND_ROOT.replace(/^\//,'') + "/feed/ws";
	};

	this.getSocketFallbackUrl = function () {
		var ws = this.sessionObj.domain.replace("http://", "ws://");
		//return ws + "/socket.ws";
		return ws.replace(/\/$/,'') + ":8080/" + BCC.API_COMMAND_ROOT.replace(/^\//,'') + "/feed/ws";
	};

	/**
	 * Returns the REST url
	 * @returns {string}
	 */
	this.getRestUrl = function() { 
		return this.sessionObj.domain; 
	};

	/**
	 * Returns the Web Streaming url
	 * @returns {string}
	 */
	this.getStreamUrl = function() { 
		return this.sessionObj.domain.replace(/\/$/,'') + "/" + BCC.API_COMMAND_ROOT.replace(/^\//,'') + "/stream/create.json?m=STREAM";
	};

	/**
	 * Returns the Long Poll url
	 * @returns {string}
	 */
	this.getLongPollUrl = function() { 
		return this.sessionObj.domain.replace(/\/$/,'') +  "/" + BCC.API_COMMAND_ROOT.replace(/^\//,'') + "/stream/create.json?m=LONG_POLL";
	};

	/**
	 * Loads the sessionObj JSON for the apiKey from the server
	 * @private
	 */
	this._loadFromServer = function(fn_onload, fn_onerror) {
		BCC.Log.info("loading new session from server", "BCC.Session._loadFromServer");
		var me = this;
		if (this.xhr == null) this.xhr = new BCC.Ajax();
		if(typeof fn_onload == "function")
			this.xhr.onload = fn_onload;
		if(typeof fn_onerror == "function")
			this.xhr.onerror = fn_onerror;
		
		this.xhr.open("POST", BCC.BASE_URL.replace(/\/$/,'') + "/" + BCC.API_COMMAND_ROOT.replace(/^\//,'') + "/session/create.json?apiKey=" + this.apiKey, true);
		this.xhr.send(null);
	};

	this._init();
	
	/** 
	 * Fired when the feed is opened and ready
	 * @name BCC.Session#onopen
	 * @event
	 */
	
	/** 
	 * Fired when the syncWithServer call is done and the session params are reloaded
	 * @name BCC.Session#onsync
	 * @event
	 */
};