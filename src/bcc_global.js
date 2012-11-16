//-----------------------------------------------------------------
// Copyright 2012 BrightContext Corporation
//
// Licensed under the MIT License defined in the 
// LICENSE file.  You may not use this file except in 
// compliance with the License.
//-----------------------------------------------------------------


/**
 * 
 * The primary namespace used by the BrightContext JavaScript SDK.
 * @namespace
 */
BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

BCC.VERSION = "$buildversionnumber$";
BCC.BASE_URL = "$jsbaseURL$";
BCC.BASE_URL_SECURE = "$jsbaseSecureURL$";
BCC.STATIC_URL = "$jsbaseStaticURL$";
BCC.STATIC_URL_SECURE = "$jsbaseStaticSecureURL$";

BCC.JSON_LIB_PATH = "json2.min.js";															// json parse+stringify polyfill
BCC.FLASH_XHR_SWF_PATH = "flXHR.js";														// cors polyfill
BCC.SWF_OBJECT_LIB_PATH = "swfobject.js";												// cross-browser swfobject
BCC.FLASH_SOCKET_SWF_PATH = "web_socket.min.js";								// flash socket polyfill
BCC.FLASH_SOCKET_SWF_BINARY_PATH = "WebSocketMainInsecure.swf";	// flash binary for polyfill

/** True if the window global is available, otherwise false */
BCC.HAS_WINDOW = ('undefined' !== typeof(window));

BCC.AJAX_INITIALIZING = 0;
BCC.AJAX_READY = 1;
BCC.AJAX_IN_PROGRESS = 2;
BCC.AJAX_DONE = 3;

BCC.SESSION_NAME = "bcc_so";

BCC.MAX_SESSION_ATTEMPTS = 3;
BCC.MAX_ENDPOINT_ATTEMPTS = 3;

/**
 * @namespace BCC.LogLevel
 * @description Constants for system log levels
 * @see BCC#setLogLevel
 * @example
 *   // log only errors and warnings to console
 *   BCC.setLogLevel(BCC.LogLevel.WARN);
 */
BCC.LogLevel = {};
/** No logging */
BCC.LogLevel.NONE = 0;
/** Log errors only */
BCC.LogLevel.ERROR = 1;
/** Log warnings and errors */
BCC.LogLevel.WARN = 2;
/** Log information, warnings, and errors */
BCC.LogLevel.INFO = 3;
/** Log all information */
BCC.LogLevel.DEBUG = 4;

/** Current log level
 * @private
 */
BCC.CURRENT_LOG_LEVEL = BCC.LogLevel.ERROR;

/**
 * Returns the current system log level.
 * @see BCC.LogLevel
 * @private
 */
BCC.getLogLevel = function() {
	return BCC.CURRENT_LOG_LEVEL;
};

/**
 * Sets the log level to DEBUG, INFO, WARN, ERROR, or NONE.
 * @see BCC.LogLevel
 */
BCC.setLogLevel = function(level) {
	BCC.CURRENT_LOG_LEVEL = level;

	if (BCC.HAS_WINDOW) {
		if (BCC.LogLevel.DEBUG == level) {
			window.WEB_SOCKET_DEBUG = true;
		} else {
			window.WEB_SOCKET_DEBUG = false;
		}
	}
};

BCC.STATE_INITIAL = "INITIAL";
BCC.STATE_REVOTE = "REVOTE";
BCC.STATE_UPDATE = "UPDATE";

BCC.HEART_BEAT_STRING = '{ "cmd": "heartbeat" }';

BCC.API_COMMAND_ROOT = "/api/v2";

/**
 * @private
 * @namespace
 */
BCC.Log = {};

/**
 * Global BCC method to log info to the browser console
 * @param {string} msg
 * @param {string} path
 */
BCC.Log.info = function(msg, path) {
	if (BCC.CURRENT_LOG_LEVEL >= BCC.LogLevel.INFO) {
		// write to a console
		if ('undefined' !== typeof(console))
			console.info("BCC Info : " + path + " : " + msg);
	}
};

/**
 * Global BCC method to log debug to the browser console
 * @param {string} msg
 * @param {string} path
 */
BCC.Log.debug = function(msg, path) {
	if (BCC.CURRENT_LOG_LEVEL >= BCC.LogLevel.DEBUG) {
		// write to a console
		if ('undefined' !== typeof(console))
			console.log("BCC Debug : " + path + " : " + msg);
	}
};

/**
 * Global BCC method to log error to the browser console
 * @param {string} msg
 * @param {string} path
 */
BCC.Log.error = function(msg, path) {
	if (BCC.CURRENT_LOG_LEVEL >= BCC.LogLevel.ERROR) {
		// write to a console
		if ('undefined' !== typeof(console))
			console.error("BCC Error : " + path + " : " + msg);
	}
};

BCC.Log.warn = BCC.Log.error;
BCC.Log.log = BCC.Log.debug;

if (BCC.HAS_WINDOW) {
	window.WEB_SOCKET_LOGGER = BCC.Log;	// flash socket global logging override
}

/**
 * @private
 * @namespace
 */
BCC.Util = {};

/**
 * Checks if the value is available in the array
 * @param {string} value
 * @param {Array} array
 * @returns {boolean}
 */
BCC.Util.valueInArray = function(value, array){
	for(var index in array){
		if(array[index] == value) return true;
	}
	return false;
};

/**
 * String Trim
 * @param {string} str
 * @returns {string}
 */
BCC.Util.trim = function(str) {
	return str.replace(/^\s+|\s+$/g, ''); 
};

/**
 * getBccUrl
 * @param {string} str
 * @returns {string}
 */
BCC.Util.getBccUrl = function(restUrl, urlPath) {
	var len = restUrl.length;
	if(restUrl.charAt(len-1) == "/"){
		if(urlPath.charAt(0) == "/"){
			return restUrl.substr(0, len-1) + urlPath; 
		} else {
			return restUrl + urlPath;
		}
	} else {
		if(urlPath.charAt(0) == "/"){
			return restUrl + urlPath; 
		} else {
			return restUrl + "/" + urlPath;
		}
	}
};

BCC.Util.isFn = function (f) {
	return ('function' === typeof(f));
};

BCC.Util.injectScript = function (script_src, completion) {
	var script_element,
			head_element,
			complete;

	complete = function (error) {
		if ('function' === typeof(completion)) {
			completion(error);
		}
	};

	script_element = document.createElement('SCRIPT');
	script_element.type = 'text/javascript';
	script_element.src = script_src;
	script_element.async = true;

	script_element.onreadystatechange = function() {
		if (this.readyState == 'loaded' || this.readyState == 'complete') {
			complete();
		}
	};

	if (script_element.readyState == null) {
    script_element.onload = function() {
			complete();
    };
    script_element.onerror = function(error_object) {
			complete(error_object);
    };
	}

	head_element = document.getElementsByTagName('HEAD');
	if (head_element[0] != null) {
    head_element[0].appendChild(script_element);
	}

	return script_element;
};

/**
 * makes a cross-browser compatible, cross-origin domain friendly http request
 * @example
 * var xhr = BCC.Util.makeRequest({
 *   url: 'http://brightcontext.com/api/v2/...'
 *   method: 'GET',	// default is POST
 *   data: {}, // object to be sent as post data, or undefined
 *   onprogress: function(data) { },
 *   onload: function(response) { },
 *   onerror: function(error) { }
 * });
 */
BCC.Util.makeRequest = function (params) {
	BCC.Log.debug(JSON.stringify(params), 'BCC.Util.makeRequest');

	var method = params.method || "POST",
			xhr = new BCC.Ajax();

	if (BCC.Util.isFn(params.onprogress)) {
	  xhr.onprogress = function () {
			params.onprogress(xhr.getResponseText());
	  };
	}
	
	if (BCC.Util.isFn(params.onload)) {
		xhr.onload = function () {
			params.onload(xhr.getResponseText());
		};
	}
	
	if (BCC.Util.isFn(params.onerror)) {
		xhr.onerror = function () {
			params.onerror(xhr.getResponseText());
		};
	}
	
	xhr.open(method, params.url, true);

	if ('POST' === method) {
		if ('object' === typeof(params.headers)) {
			xhr.setHeaders(params.headers);
		} else {
			xhr.setHeaders({
				'Content-Type' : 'application/x-www-form-urlencoded'
			});
		}
	}

	var payload = params.data;
	if ('object' === typeof(payload)) {
		payload = JSON.stringify(payload);
	}
	xhr.send(payload);
	
	return xhr;
};

BCC.Util.Metrics = function () {
	var _m = {};

	this.inc = function (k, v) {
		var value = (v) ? v : 1;

		if ('undefined' === typeof(_m[k])) {
			_m[k] = value;
		} else {
			_m[k] = _m[k] + value;
		}

		return _m[k];
	};

	this.dec = function (k) {
		return this.inc(k, -1);
	};

	this.set = function (k, v) {
		_m[k] = v;
		return _m[k];
	};

	this.get = function (k) {
		if ('undefined' == typeof(_m[k])) {
			_m[k] = 0;
		}
		return _m[k];
	};

	this.print = function (prefix) {
		BCC.Log.debug(JSON.stringify(_m), prefix);
	};
};

/**
 * Single place to hold browser checks for various capabilities
 * @private
 */
BCC.Env = {};

BCC.Env.IS_SECURE = ((BCC.HAS_WINDOW) && (!!window.location.href.match(/^https/)));
BCC.Env.FORCE_WEBSOCKETS_OFF = false;
BCC.Env.FORCE_FLASHSOCKETS_OFF = false;
BCC.Env.FORCE_STREAMING_OFF = false;
BCC.Env.FORCE_FLASHGATEWAY_OFF = false;

BCC.Env.checkWebSocket = function (completion) {
	if (BCC.Env.FORCE_WEBSOCKETS_OFF) {
		completion('websockets forced off');
	} else {

		if (!BCC.WebSocket) {
			if ('undefined' !== typeof(window)) {
				BCC.WebSocket = (window.WebSocket || window.MozWebSocket);
			}
		}

		var ok = (!!BCC.WebSocket);
		completion(ok ? null : 'websocket not supported');
	}
};

BCC.Env.checkFlashSocket = function (completion) {
	if (BCC.Env.FORCE_FLASHSOCKETS_OFF) {
		completion('flashsockets forced off');
	} else {

		if ('undefined' == typeof(swfobject)) {
			BCC.Util.injectScript(BCC.Env.pathToLib(BCC.SWF_OBJECT_LIB_PATH), function (swf_load_error) {
				if (swf_load_error) {
					completion(swf_load_error);
				} else {
					var ok = (swfobject.getFlashPlayerVersion().major >= 10);
					if (!ok) {
						completion('flash version too old');
					} else {
						completion(null, swfobject);
					}
				}
			});
		} else {
			completion(null, swfobject);
		}

	}
};

BCC.Env.checkStreaming = function (completion) {
	if (BCC.Env.FORCE_STREAMING_OFF) {
		completion('streaming forced off');
	} else {
		completion(null);
	}
};

BCC.Env.checkFlashGateway = function (completion) {
	if (BCC.Env.FORCE_FLASHGATEWAY_OFF) {
		completion('flash gateway backup forced off');
	} else {
		completion(null);
	}
};

BCC.Env.pathToLib = function (filename) {
	var prefix, path;
	prefix = (BCC.Env.IS_SECURE) ? BCC.STATIC_URL_SECURE : BCC.STATIC_URL;
	path = prefix + '/lib/' + filename;
	return path;
};

BCC.Env.baseActionPath = function (url) {
	var m = url.match(/https?:\/\/.*?\//);
	if (1 == m.length) {
		return m[0];
	} else {
		return null;
	}
};


BCC.Env.flipToNativeWebSocket = function () {
	if (BCC.HAS_WINDOW) {
		window.WEB_SOCKET_FORCE_FLASH = false;

		if (window.WebSocket) {
			if (window.WebSocket.__flash) {
				window.FlashWebSocket = window.WebSocket;
				window.WebSocket = BCC.WebSocket;
			}
		}
	}
};

BCC.Env.flipToFlashWebSocket = function () {
	if (BCC.HAS_WINDOW) {
		window.WEB_SOCKET_FORCE_FLASH = true;
		window.WEB_SOCKET_SUPPRESS_CROSS_DOMAIN_SWF_ERROR = true;
		window.WEB_SOCKET_SWF_LOCATION = BCC.Env.pathToLib(BCC.FLASH_SOCKET_SWF_BINARY_PATH);

		if (window.FlashWebSocket) {
			window.WebSocket = window.FlashWebSocket;
		}
	}
};

// exports
if (('undefined' !== typeof(module)) && ('undefined' !== typeof(module.exports))) {
	module.exports = BCC;
}
