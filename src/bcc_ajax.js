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
	this.status = BCC.AJAX_INITIALIZING;

	/**
	 * Called by the constructor to initialize the object 
	 * @private
	 */
	this._init = function(){
		var me = this;

		if (!BCC.Ajax.xhr_type_handle) {
			BCC.Ajax.xhr_type_handle = (BCC.XMLHttpRequest || window.XDomainRequest || window.XMLHttpRequest);
		}

		if (!BCC.Ajax.xhr_type_handle) {
			BCC.Env.checkFlashGateway(function (flash_gateway_error) {
				if (flash_gateway_error) {
					BCC.Log.error('no XMLHttpRequest object, XDomainRequest or polyfill available, provide one by setting BCC.XMLHttpRequest to a w3c compatible version', 'BCC.Ajax.constructor');
				} else {
					me.initWithFlashGateway(me);
				}
			});
		} else {
			this.xhr = ('undefined' == typeof(BCC.Ajax.xhr_type_handle.prototype)) ? BCC.Ajax.xhr_type_handle() : new BCC.Ajax.xhr_type_handle();
			this._doReady(); 
		}
	};

	this.initWithFlashGateway = function (me) {
		if ('undefined' == typeof(swfobject)) {
			BCC.Util.injectScript(BCC.Env.pathToLib(BCC.SWF_OBJECT_LIB_PATH), function (swf_load_error) {
				if (swf_load_error) {
					BCC.Log.error("Error injecting the SWFObject library","BCC.Ajax.constructor");
				} else {
					me.openWithFlashGateway(me);
				}
			});
		} else {
			me.openWithFlashGateway(me);
		}
	};

	this.openWithFlashGateway = function (me) {
		if (swfobject.hasFlashPlayerVersion("9.0.124")) {
			BCC.Log.debug("Flash Gateway Support available","BCC.Ajax.constructor");
			if (!BCC.Ajax.FlashLoaded) {
				BCC.Util.injectScript(BCC.Env.pathToLib(BCC.FLASH_XHR_SWF_PATH), function (flxhr_inject_error) {
					if(flxhr_inject_error){
						BCC.Log.error("Error injecting the Flash Gateway library","BCC.Ajax.constructor");
					} else {
						BCC.Ajax.FlashLoaded = true;
						me.xhr = new flensed.flXHR();
						me._doReady();
					}
				 });
			} else {  // BCC.Ajax.FlashLoaded is true
				me.xhr = new flensed.flXHR();
				me._doReady();
			}
		} else {
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
		} else {
			try {
				this.xhr.open(method, url, async, uname, pswd);
			} catch(ex) {
				if (BCC.Util.isFn(this.onerror)) {
					this.onerror(ex);
				}
			}
		}
	};

	/**
	 * Equivalent of batch xhr.setRequestHeader calls
	 */
	this.setHeaders = function (headers) {
		if(!this.ajaxReady)
			this.headers = headers;
		else {
			this._setHeaders(headers);
		}
	};
	
	/**
	 * Sets the headers to xhr
		 * @private
		 */
		this._setHeaders = function (headers) {
				for (var k in headers) {
						var v = headers[k];
						try {
							this.xhr.setRequestHeader(k,v);
						} catch (ex) {
							BCC.Log.error('failed to set http header: ' + k + ' => ' + v, 'BCC.Ajax._setHeaders');
						}
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
			try {
				this.xhr.send(data);
			} catch (ex) {
				if (BCC.Util.isFn(this.onerror)) {
					this.onerror(ex);
				}
			}
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
		if (('undefined' !== typeof(window)) && (window.XDomainRequest))
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
		if (('undefined' !== typeof(XMLHttpRequest)) && ("withCredentials" in new XMLHttpRequest()))
			return true;
		else
			return false;
	};

	/** 
	* Checks if Titanium.Network.createHttpClient() is available
	* @private
	* @returns {boolean}
	*/
	this._isOverride = function() {
		if ('undefined' !== typeof(BCC.XMLHttpRequest))
			return true;
		else
			return false;
	};

	/**
	 * Post ready setup stuff done in this method
	 * @private
	 */
	this._doReady = function() {
		var me = this, invoke_callback;

		invoke_callback = function (f) {
			if (BCC.Util.isFn(f)) {
				f();
			}
		};

		if (this._isXDomainRequest()) {
			this.xhr.onload = function(){
				me.status = BCC.AJAX_DONE; 
				invoke_callback(me.onload);
			};

			this.xhr.onprogress = function(){
				invoke_callback(me.onprogress);
			};
			
			this.xhr.onerror = function(){
				me.status = BCC.AJAX_DONE; 
				invoke_callback(me.onerror);
			};

			this.xhr.ontimeout = function(){
				me.status = BCC.AJAX_DONE;
				invoke_callback(me.onerror);
			};
		} else {
			// not XDomainRequest

			this.xhr.onreadystatechange = function() {
				if (me.xhr.readyState == 3) {
					invoke_callback(me.onprogress);
				} else if (me.xhr.readyState == 4 && me.xhr.status == 200) {
					me.status = BCC.AJAX_DONE;
					invoke_callback(me.onload);
				} else if (me.xhr.readyState == 4 && me.xhr.status != 200) {
					if (me.status != BCC.AJAX_DONE) {
						me.status = BCC.AJAX_DONE;
						invoke_callback(me.onerror);
					}
				}
			};

			this.xhr.onprogress = function() {
				invoke_callback(me.onprogress);
			};

			// FLXHR raises onerror
			if(!this._isXhrCors()){
				this.xhr.onerror = function() {
					me.status = BCC.AJAX_DONE; 
					invoke_callback(me.onerror);
				};
			}
		}

		this.ajaxReady = true;
		
		if (this.needsOpening) {
			this._doOpen();
		} else {
			this.status = BCC.AJAX_READY;
		}
	};

	/**
	 * This method is fired when the open/send are called during the initialization
	 * @private
	 */
	this._doOpen = function() {
		this.status = BCC.AJAX_IN_PROGRESS;

		try {
			this.xhr.open(this.method, this.url, this.async, this.uname, this.pswd);
		} catch (ex) {
			if (BCC.Util.isFn(this.onerror)) {
				this.onerror(ex);
			}
		}
		
		this.needsOpening = false;

		if (!!this.headers){
			this._setHeaders(this.headers);
			this.headers = null;
		}

		if (this.needsSending === true) {
			try {
				this.xhr.send(this.data);
				this.needsSending = false;
			} catch (ex) {
				if (BCC.Util.isFn(this.onerror)) {
					this.onerror(ex);
				}
			}
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
