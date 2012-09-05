//-----------------------------------------------------------------
// Copyright 2012 BrightContext Corporation
//
// Licensed under the MIT License defined in the 
// LICENSE file.  You may not use this file except in 
// compliance with the License.
//-----------------------------------------------------------------


BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

/**
 * @class The BCC XHR object that encapsulates XHR, XDomainRequest and FLXHR for cross domain calls
 * @private
 */
BCC.Ajax = function() {
	this.xhr = null;
	this.ajaxReady = false;
	this.needsOpening = false;
	this.needsSending = false;
	this.scriptPath = BCC.FLASH_XHR_SWF_PATH;
	this.status = BCC.AJAX_INITIALIZING;

	/**
	 * Called by the constructor to initialize the object 
	 * @private
	 */
	this._init = function(){
		if (this._isXhrCors()) {
			BCC.Log.debug("XHR CORS Support available","BCC.Ajax.constructor");

			this.xhr = new XMLHttpRequest();
			this._doReady(); 
		}
		else if (this._isXDomainRequest()) {
			BCC.Log.debug("XDR CORS Support available","BCC.Ajax.constructor");

			this.xhr = new XDomainRequest();
			this._doReady();
		}
		else if (swfobject.hasFlashPlayerVersion("9.0.124")) {
			BCC.Log.debug("Flash Gateway Support available","BCC.Ajax.constructor");

			if (!BCC.Ajax.FlashLoaded) {
				var scriptNode = document.createElement('SCRIPT');
				var headNode = document.getElementsByTagName('HEAD');
				var me = this;

				scriptNode.type = 'text/javascript';
				scriptNode.src = this.scriptPath;
				scriptNode.async = true;

				scriptNode.onreadystatechange = function () {
					if (this.readyState == 'loaded' || this.readyState == 'complete') {
						BCC.Ajax.FlashLoaded = true;
						me.xhr = new flensed.flXHR();
						me._doReady();
					}
				};
				if(scriptNode.readyState == null){
					scriptNode.onload = function(){
						BCC.Ajax.FlashLoaded = true;
						me.xhr = new flensed.flXHR();
						me._doReady();
					};
					scriptNode.onerror = function() {
						BCC.Log.error("Fatal error. Cannot inject dependancy lib (flxhr)", "BCC.Ajax._init");
		            };
				}

				if (headNode[0] != null) headNode[0].appendChild(scriptNode);
			}
			else {  // BCC.Ajax.FlashLoaded is true
				this.xhr = new flensed.flXHR();
				this._doReady();
			}
		}
		else {
			BCC.Log.error("Browser config not supported","BCC.Ajax.constructor");
		}
	};

	/**
	 * Equivalent of xhr.open
	 * @param {string} method
	 * @param {string} url
	 * @param {boolean} async
	 * @param {string} uname
	 * @param {string} pswd
	 */
	this.open = function(method,url,async,uname,pswd) {
		this.status = BCC.AJAX_IN_PROGRESS;
		if(!this.ajaxReady){
			this.needsOpening = true;
			this.method = method;
			this.url = url;
			this.async = async;
			this.uname = uname;
			this.pswd = pswd;
		} else{
			this.xhr.open(method, url, async, uname, pswd);
		}
	};

	/**
	 * Equivalent of xhr.send
	 * @param {string} data Post data
	 */
	this.send = function(data){
		//flxhr fix : If the post data is null, the call is made as GET instead of POST.
		if(!this._isXhrCors() && !this._isXDomainRequest() && data == null)
			data = "NA";
		if(this.needsOpening === true){
			this.needsSending = true;
			this.data = data;
		} else {
			this.xhr.send(data);
		}
	};
	/**
	 * Returns the response text of the XHR call
	 * @returns {string} responseText
	 */ 
	this.getResponseText = function() {return this.xhr.responseText;};
	/**
	 * Returns the status of the XHR call
	 * @returns {string} status
	 */
	this.getStatus = function(){return this.status;};
	/**
	 * Aborts the XHR call
	 */
	this.abort = function(){
		if(this.needsOpening === true)
			this.needsOpening = false;
		else
			this.xhr.abort();
		this.status = BCC.AJAX_DONE;
		BCC.Log.debug("Ajax Call aborted","BCC.Ajax.abort");
	};

	/**
	 * Checks if XDR support available
	 * @private
	 * @returns {boolean}
	 */
	this._isXDomainRequest = function(){
		//hardcoded to get Flash Gateway
		//return false;

		if (window.XDomainRequest)
			return true;
		else
			return false;
	};

	/**
	 * Checks if XHR CORS support available
	 * @private
	 * @returns {boolean}
	 */
	this._isXhrCors = function(){
		//hardcoded to get Flash Gateway
		//return false;

		if ("withCredentials" in new XMLHttpRequest())
			return true;
		else
			return false;
	};

	/**
	 * Post ready setup stuff done in this method
	 * @private
	 */
	this._doReady = function() {
		var me = this;
		if(!this._isXDomainRequest()){
			this.xhr.onreadystatechange = function(){
				if (me.xhr.readyState == 3){
					if(me.onprogress != null)
						me.onprogress();
				} else if (me.xhr.readyState == 4 && me.xhr.status == 200){
					me.status = BCC.AJAX_DONE;
					if(me.onload != null)
						me.onload();
				} else if(me.xhr.readyState == 4 && me.xhr.status != 200){
					if(me.onerror != null && me.status != BCC.AJAX_DONE){
						me.status = BCC.AJAX_DONE;
						me.onerror();
					}
				}
			};
			//FLXHR raises onerror
			if(!this._isXhrCors()){
				this.xhr.onerror = function(){
					me.status = BCC.AJAX_DONE; 
					if(me.onerror != null) 
						me.onerror();
				};
			}
		} else {
			this.xhr.onload = function(){
				me.status = BCC.AJAX_DONE; 
				if(me.onload != null) 
					me.onload();
			};
			this.xhr.onprogress = function(){
				if(me.onprogress != null) 
					me.onprogress();
			};
			this.xhr.onerror = function(){
				me.status = BCC.AJAX_DONE; 
				if(me.onerror != null) 
					me.onerror();
			};
			this.xhr.ontimeout = function(){
				me.status = BCC.AJAX_DONE; 
				if(me.onerror != null) me.onerror();
			};
		}
		this.ajaxReady = true;
		if(this.needsOpening) 
			this._doOpen();
		else
			this.status = BCC.AJAX_READY;
	};

	/**
	 * This method is fired when the open/send are called during the initialization
	 * @private
	 */
	this._doOpen = function() {
		this.status = BCC.AJAX_IN_PROGRESS;
		this.xhr.open(this.method, this.url, this.async, this.uname, this.pswd);
		this.needsOpening = false;
		if(this.needsSending === true){
			this.xhr.send(this.data);
			this.needsSending = false;
		}
	};

	this._init();
	/**
	 * Equivalent to the XHR readystate=4 and status=200
	 * @name BCC.Ajax#onload
	 * @event
	 */
	
	 /** 
	 * Equivalent to the XHR readystate=3 and status=200
	 * @name BCC.Ajax#onprogress
	 * @event
	 */
	
	 /** 
	 * Equivalent to the XHR readystate=4 and status!=200
	 * @name BCC.Ajax#onerror
	 * @event
	 */
};

BCC.Ajax.FlashLoaded = false;