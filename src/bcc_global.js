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

BCC.BASE_URL = "$jsbaseURL$";
BCC.STATIC_URL = "$jsbaseStaticURL$";

BCC.FLASH_XHR_SWF_PATH = BCC.STATIC_URL + "/lib/flXHR.js";
BCC.FLASH_SOCKET_SWF_PATH = BCC.STATIC_URL + "/lib/web_socket.js";
BCC.SWF_OBJECT_LIB_PATH = BCC.STATIC_URL + "/lib/swfobject.js";
BCC.JSON_LIB_PATH = BCC.STATIC_URL + "/lib/json2.js";

BCC.AJAX_INITIALIZING = 0;
BCC.AJAX_READY = 1;
BCC.AJAX_IN_PROGRESS = 2;
BCC.AJAX_DONE = 3;

BCC.WEBSOCKET = 1;
BCC.FLASHSOCKET = 2;
BCC.STREAMORPOLL = 3;
BCC.FORCE_PUSH_STREAM = false;

BCC.MAX_RECONNECTS = 3;

BCC.SESSION_NAME = "bcc_so";

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
BCC.CURRENT_LOG_LEVEL = BCC.LogLevel.INFO;

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
};

BCC.STATE_INITIAL = "INITIAL";
BCC.STATE_REVOTE = "REVOTE";
BCC.STATE_UPDATE = "UPDATE";

BCC.HEART_BEAT_STRING = '{ "cmd": "heartbeat" }';

BCC.API_COMMAND_ROOT = "/api";

function htmlEscape(str) {
	return String(str)
	.replace(/&/g, '&amp;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#39;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;');
}

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
		if(!!window.console)
			console.log("BCC Info : " + path + " : " + msg);
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
		if(!!window.console)
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
		if(!!window.console)
			console.log("BCC Error : " + path + " : " + msg);
	}
};

//Web Socket JS Globals
WEB_SOCKET_SWF_LOCATION = BCC.STATIC_URL + "/lib/WebSocketMainInsecure.swf";
WEB_SOCKET_DEBUG = true;

/**
 * @private
 * @namespace
 */
BCC.Util = {};

/**
 * BCC Util method to store cookie
 * @param {string} name
 * @param {JSON} sessObj 
 */
BCC.Util.setCookie = function(name, sessObj){
	var sessStr = JSON.stringify(sessObj);
	var expiresHours = 2;
	var date = new Date();
	date.setTime(date.getTime()+(expiresHours*60*60*1000));
	var cookieExpiry = date.toGMTString();
	var cookieString = name + "=" + escape(sessStr) +  "; expires=" + cookieExpiry + " ;path=/; ";
	document.cookie = cookieString;
};

/**
 * BCC Util method to retrieve cookie
 * @param {string} cookieName
 * @returns {JSON} 
 */
BCC.Util.getCookie = function(cookieName){
	var i,x,y,ARRcookies=document.cookie.split(";");
	for (i=0;i<ARRcookies.length;i++){
		x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
		y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
		x=x.replace(/^\s+|\s+$/g,"");
		if (x==cookieName){
			return ("undefined" !== typeof(y)) ? JSON.parse(unescape(y)) : null;
		}
	}
	return null;
};

/**
 * For Future Use
 * @param {JSON} sessObj
 * @returns {string}
 */
BCC.Util.urlSerialize = function(sessObj){

};

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
 * getBccRestUrl
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