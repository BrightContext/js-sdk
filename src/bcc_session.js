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
	var me = this;

	this.apiKey = apiKey;
	this.session_data = null;

	/**
	 * Called by the constructor to initialize the object
	 * @private
	 */
	this._init = function(){
		if ((!this.apiKey) || (BCC.Util.trim(this.apiKey) === "")) {
			BCC.Log.error("API Key missing.","BCC.Session.constructor");
			return;
		}
	};

	/**
	 * Opens the session
	 */
	this.create = function (completion) {
		if (!me.apiKey || ("string" !== typeof(me.apiKey)) || ('' === BCC.Util.trim(this.apiKey)) || (36 != me.apiKey.length)) {
			completion('invalid api key');
		} else {
			me._injectJsonLibIfNeeded(function (json_inject_error) {
				if (json_inject_error) {
					completion(json_inject_error);
				} else {
					me._establishNewSession(function (establish_error, session_data) {
						if (establish_error) {
							completion(establish_error);
						} else {
							BCC.Log.debug(JSON.stringify(session_data), 'BCC.Session.create');
							me.session_data = session_data;
							completion(null, me);
						}
					});
				}
			});
		}
	};
	
	this._establishNewSession = function (completion) {
		BCC.Util.makeRequest({
			url: me.getSessionCreateUrl(),
			method: 'POST',
			data: 'apiKey=' + apiKey,
			onload: function (response) {
				if (response) {
					completion(null, JSON.parse(response));
				} else {
					completion('invalid session object');
				}
			},
			onerror: function (error) {
				var message = null;
				try {
					if (error) {
						message = JSON.parse(error).error;
					}
				} catch (ex) {
					BCC.Log.debug('could not parse error response', 'BCC.Session._establishNewSession');
				}
				completion(message || 'error establishing session');
			}
		});
	};

	this._injectJsonLibIfNeeded = function(completion) {
		if ('undefined' == typeof(JSON)) {
			BCC.Util.injectScript(BCC.Env.pathToLib(BCC.JSON_LIB_PATH), function (error) {
				completion(error);
			});
		} else {
			completion(null);
		}
	};

	this.hasValidSession = function() {
		var valid = (("undefined" != typeof(this.session_data)) && (null !== this.session_data) && ("undefined" == typeof(this.session_data.error)));
		return valid;
	};

	/**
	 * Adds a property (key value pair) to the session_data JSON and then to the cookie
	 * @param {string} key
	 * @param {string} value
	 */
	this.addProperty = function(key, value) {
		this.session_data[key] = value;
	};

	/**
	 * Returns the session_data JSON
	 * @returns {JSON} session_data
	 */
	this.getProperties = function() {
		return this.session_data;
	};

	/**
	 * Returns the session Id
	 * @returns {string} sid
	 */
	this.getSessionId = function() {
		return this.session_data.sid;
	};

	/**
	 * Get the usable server endpoints for this session
	 * @returns {object} endpoints object
	 * @example
	 * {
	 *  "sid": "fed0cef4-34df-456d-87c1-f7d3e6f28aa0",
   *  "stime": 1351281307094,
   *  "endpoints": {
   *      "flash": [
   *          "ws://...",
   *          "ws://...:8080"
   *      ],
   *      "socket": [
   *          "ws://...",
   *          "ws://...:8080"
   *      ],
   *      "rest": [
   *          "http://..."
   *      ]
   *  },
   *  "ssl": false
	 * }
	 */
	this.getEndpoints = function () {
		return this.session_data.endpoints;
	};

	/**
	 * Get the security flag of the session
	 * @returns true if TLS is available, false otherwise
	 */
	this.isSecure = function () {
		return this.session_data.ssl;
	};

	this.getSessionCreateUrl = function () {
		var prefix, url;
		prefix = (BCC.Env.IS_SECURE) ? BCC.BASE_URL_SECURE : BCC.BASE_URL;
		url = BCC.Util.getBccUrl(prefix, BCC.API_COMMAND_ROOT + '/session/create.json');
		return url;
	};

	/**
	 * Returns the socket url
	 * @returns {string}
	 */
	this.getSocketUrl = function (u) {
		var socketUrl = u.replace(/\/$/,'') + BCC.API_COMMAND_ROOT + "/feed/ws";
		return socketUrl;
	};

	/**
	 * Returns the Web Streaming url
	 * @returns {string}
	 */
	this.getStreamUrl = function (u) {
		var streamUrl = u.replace(/\/$/,'') + BCC.API_COMMAND_ROOT + "/stream/create.json";
		return streamUrl;
	};

	this._init();
};