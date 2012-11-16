//-----------------------------------------------------------------
// Copyright 2012 BrightContext Corporation
//
// Licensed under the MIT License defined in the 
// LICENSE file.  You may not use this file except in 
// compliance with the License.
//-----------------------------------------------------------------

BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

/**
 * @class The main object that holds the connection, active user state, and other settings.
 * Used to open projects.
 * Initialized and created by calling BCC.init
 * @constructor 
 * @param {string} apiKey
 * @see BCC
 * @description Context instances should not be created manually, but instead initialized using BCC.init(apiKey)
 */
BCC.Context = function (apiKey) {
	var me = this;
	
	this._apiKey = apiKey;
	this.conn = null;
	this.feedRegistry = null;

	this.activityFlag = true;	// user active
	this.validateMessagesFlag = true;	// message contract validation
	
	/**
	 * Called by the constructor to initialize the object 
	 * @private
	 */
	this._init = function() {
		this.feedRegistry = new BCC.FeedRegistry();
	};
	
	/**
	 * Switch on validation of messages
	 * @private
	 */
	this.setValidateMessagesOn = function() {
		this.validateMessagesFlag = true;
	};

	/**
	 * Switch off validation of messages
	 * @private
	 */
	this.setValidateMessagesOff = function() {
		this.validateMessagesFlag = false;
	};

	/**
	 * @returns {boolean} true if Feed Message Validation logic will be executed, otherwise false
	 * @private
	 */
	this.getValidateMessagesFlag = function() {
		return this.validateMessagesFlag;
	};

	/**
	 * Sets the user as active
	 * @private
	 */
	this.setUserActive = function() {
		this.activityFlag = true;
	};

	/**
	 * Sets the user as inactive
	 * @private
	 */
	this.setUserInactive = function() {
		this.activityFlag = false;
	};

	/**
	 * Gets the user active state
	 * @private
	 */
	this.isUserActive = function() {
		return this.activityFlag;
	};


	/**
	 * This method sends the command over the connection if the connection is ready
	 * Otherwise the command send is cached in the dependency map
	 *     
	 * @param {BCC.Command} command
	 *
	 * @private
	 */
	this.sendCommand = function(command) {
		me._getConnection(function (connection_open_error) {
			if (connection_open_error) {
				BCC.Log.error('error sending command: ' + connection_open_error + ' :: ' + JSON.stringify(command), 'BCC.Context.sendCommand');
			} else {
				me.conn.send(command);
			}
		});
	};
	
	this._reRegisterAllFeeds = function(){
		var feedsArray = this.feedRegistry.getAllUniqueFeeds();
		if(feedsArray != null){
			for(var index=0; index < feedsArray.length; index++){
				var feed = feedsArray[index];
				feed.reopen(this.conn, this.feedRegistry);
			}
		}
	};

	/**
	 * Retrieves the current server time, useful for client timepoint synchronization.
	 * @param {function} completion The function to execute once the time is retrieved.
	 * Method signature: <code>function(server_time_object, error_object)</code>
	 * @example
	 * var ctx = BCC.init(my_api_key);
	 * ctx.serverTime(function(t,err) {
	 *   if (err) {
	 *     console.error(err); // failed to get server time
	 *   } else {
	 *     console.log(t); // t is a Date instance with the server time
	 *   }
	 * });
	 */
	this.serverTime = function (completion) {
		if ('function' !== typeof(completion)) {
			return;
		}

		cmd = new BCC.Command("GET", "/server/time.json");
		
		cmd.onresponse = function(evt) {
			completion(new Date(evt.stime));
		};
		
		cmd.onerror = function(err) {
			BCC.Log.error("Error getting server time: " + err, "BCC.Context.serverTime");
			var errorEvent = new BCC.Event("onerror", BCC.EventDispatcher.getObjectKey(me), err);
			BCC.EventDispatcher.dispatch(errorEvent);

			completion(null, err);
		};
		
		me.sendCommand(cmd);
	};

	/**
	 * Asks the server to build a new UUID (aka GUID but this is not a Microsoft implementation).
	 * These can be very useful as a user id or to group multiple related messages with each other.
	 * @param {function} completion The function to execute once the time is retrieved.
	 * Method signature: <code>function(uuid_string, error_object)</code>
	 * @example
	 * var ctx = BCC.init(my_api_key);
	 * ctx.sharedUuid(function(uuid,err) {
	 *   if (err) {
	 *     console.error(err); // failed to get server time
	 *   } else {
	 *     console.log(uuid); // uuid is a new unique string created by the server
	 *   }
	 * });
	 */
	this.sharedUuid = function (completion) {
		if ('function' !== typeof(completion)) {
			return;
		}

		cmd = new BCC.Command("GET", "/server/uuid.json");
		
		cmd.onresponse = function(evt) {
			completion(evt.d);
		};
		
		cmd.onerror = function(err) {
			BCC.Log.error("Error getting shared uuid: " + err, "BCC.Context.sharedUuid");
			var errorEvent = new BCC.Event("onerror", BCC.EventDispatcher.getObjectKey(me), err);
			BCC.EventDispatcher.dispatch(errorEvent);

			completion(null, err);
		};
		
		me.sendCommand(cmd);
	};

	/**
	 * Builds a new UUID without contacting the server using minimal calls to Math.random that is RFC4122v4 compliant.
	 * These can be very useful as a user id or to group multiple related messages with each other.
	 * @example
	 * var ctx = BCC.init(my_api_key);
	 * var uuid = ctx.uuid(); // uuid is a new unique string
	 */
	this.uuid = function (completion) {
		// http://www.broofa.com/Tools/Math.uuid.js
		
		var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''),
			uuid = new Array(36),
			rnd=0,
			r,
			uuid_string;

		for (var i = 0; i < 36; i++) {
		  if (i==8 || i==13 ||  i==18 || i==23) {
			uuid[i] = '-';
		  } else if (i==14) {
			uuid[i] = '4';
		  } else {
			if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
			r = rnd & 0xf;
			rnd = rnd >> 4;
			uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
		  }
		}
		uuid_string = uuid.join('');

		if ('function' == typeof(completion)) {
			completion(uuid_string);
		}
		return uuid_string;
	};

	/**
	 * Opens a feed 
	 * @param {BCC.Feed} feed BCC.Feed instance with metadata
	 * @param {function} completion method fired method signature: <code>function(open_error, opened_feed)</code>
	 * @private
	 */
	this.openFeed = function(feed, completion) {
		var loaded_feed = me.feedRegistry.findFeedWithMetadata(feed);

		if (loaded_feed) {
			// feed already opened
			feed.reloadFeedSettings(feed.settings);
			completion(null, feed);
		} else {
			// when the feed needs a connection, fetch one lazily
			feed.onneedsconnection = function (connection_needed_callback) {
				me._getConnection(function (connection_open_error) {
					if (connection_open_error) {
						connection_needed_callback(connection_open_error);
					} else {
						connection_needed_callback(null, me.conn);
					}
				});
			};

			// create the open command which will get a connection later lazily
			var feed_open_cmd = feed.open(function (open_error) {
				if (open_error) {
					completion(open_error);
				} else {
					me.feedRegistry.registerFeed(feed);
					completion(null, feed);
				}
			});
			
			// lazy initialize the preamble portion of the command list
			if (!me._connection_preamble) {
				me._connection_preamble = [];
			}

			// save the pending feed for the command batches
			me._connection_preamble.push(feed_open_cmd);
		}
	};

	/**
	 * Closes a feed
	 * @private
	 */
	this.closeFeed = function(feed) {
		if (this.feedRegistry.getFeedCount(feed) > 1) {
			this._unregisterFeed(feed);
			var closeEvent = new BCC.Event("onclose", BCC.EventDispatcher.getObjectKey(feed), null);
			BCC.EventDispatcher.dispatch(closeEvent);
			
			BCC.EventDispatcher.unregister(feed.id, feed);
			BCC.EventDispatcher.unregister(feed.getSettings().feedKey, feed);
		} else {
			feed._close(this.conn);
		}
	};

	/**
	 * Opens a Project instance containing Channels as configured using the management console.
	 * This will not open the underlying Channel feeds.  Use <code>project.feed(...)</code> to do that.
	 * @returns {BCC.Project} Project object instance that allows access to Channel and Feed data.
	 * @param {string} projectName name of the project defined in the management console
	 * @see BCC.Feed
	 * @see BCC.Project
	 */
	this.project = function(projectName) {
		return new BCC.Project(projectName);
	};

	/**
	 * Unregisters a feed, and if nothing is left in the registry, closes the connection
	 * @private
	 */
	this._unregisterFeed = function(closedFeed) {
		if (this.feedRegistry.feedExists(closedFeed)) {
			this.feedRegistry.unRegisterFeed(closedFeed);
		}
	};

	this._getConnection = function (completion) {
		if (me.conn) {
			if (me.conn.endpoint) {
				if (me.conn.endpoint.isClosed()) {
					// have a connection and endpoint, but it's closed, open it back up
					me.conn._reconnect(function (reconnect_error) {
						if (reconnect_error) {
							completion(reconnect_error);
						} else {
							completion(null, me.conn);
						}
					});
				} else {
					completion(null, me.conn);
				}
			} else {
				// have a connection, but no valid endpoint yet, push this into the queue and wait
				if (!me.completions_awaiting_endpoint) {
					me.completions_awaiting_endpoint = [];
				}
				me.completions_awaiting_endpoint.push(completion);
			}
		} else {
			// don't have a connection, make one
			me._createConnection(function (connection_create_error) {
				completion(connection_create_error);

				if (me.completions_awaiting_endpoint) {
					for (var i in me.completions_awaiting_endpoint) {
					  var fn = me.completions_awaiting_endpoint[i];
					  fn(connection_create_error);
					}
				}
			});
		}
	};

	/**
	 * This method creates a connection object and queues the statement for execution
	 * @private
	 */
	this._createConnection = function(completion) {
		me.conn = new BCC.Connection(me._apiKey, 45);

		me.conn.onerror = function(connection_error) {
			BCC.Log.error("connection error: " + connection_error, 'BCC.Context._createConnection');
			me.conn._fallback(function (fallback_error) {
				if (fallback_error) {
					BCC.Log.error("fallback error: " + fallback_error, 'BCC.Context._createConnection');
					me.forceShutdown();
				}
			});
		};

		// preamble only fired on rest connections
		me.conn.onpreamble = function (preamble) {
			if (me._connection_preamble) {
				// compact multiple feed opens into a single stream open
				while (0 !== me._connection_preamble.length) {
					var cmd = me._connection_preamble.shift();
					preamble.push(cmd);
				}
			}
		};

		me.conn.open(function (connection_open_error) {
			completion(connection_open_error);
		});
	};

	this.forceShutdown = function () {
		if (me.conn) {
			me.conn.close();
		}
		
		if (me.feedRegistry) {
			var registeredFeeds = me.feedRegistry.getAllFeeds();

			if (!!registeredFeeds && registeredFeeds.length > 0){
				for (var index = 0; index < registeredFeeds.length; index++){
					var feedObj = registeredFeeds[index];
					var closeEvent = new BCC.Event("onclose", BCC.EventDispatcher.getObjectKey(feedObj), feedObj);
					BCC.EventDispatcher.dispatch(closeEvent);
				}
			}
		}
	};

	this._init();
};


/**
 * Initializes a new context session.  Currently there can be only one context session with one connection at a time on any given page.  Thus, only plan on calling init once per page load with the proper api key, as any second call to init will dispose of the old context.
 * @param {string} apiKey API Key configured in the management console.
 * @returns {BCC.Context} Newly initialized context instance that can be used to open projects and feeds
 * @see BCC.Context
 */
BCC.init = function (apiKey) {
	BCC.Log.debug('Initializing context with api key ' + apiKey, 'BCC.init');
	if (!!BCC.ContextInstance) {
		BCC.Log.debug('forcing shutdown of previous context instance', 'BCC.init');
		BCC.ContextInstance.forceShutdown();
	}
	BCC.ContextInstance = new BCC.Context(apiKey);
	return BCC.ContextInstance;
};

/**
 * Checks to see if a context has already been initialized
 * @private
 */
BCC._checkContextExists = function() {
	if (!BCC.ContextInstance) {
		throw "Context Not Initialized, use BCC.init";
	}
};

/**
 * <p>The current user active state.  This setting only affects active polling Inputs.</p>
 * <p>When the user is active, messages will continue to be sent on active polling Inputs automatically without the need to call <code>feed.send()</code> continuously.
 * Active polling does not start until the first message is sent.  Active polling will continue until the feed is closed.</p>
 * <p>When the user is inactive, active polling will pause, however, calls to <code>feed.send()</code> will still be passed to the server.
 * Active polling will stay paused on all active polling Inputs until the user is flagged as active again.
 * The SDK does not control active user state, that is up to the app consuming the SDK.
 * However, isUserActive will default to true.
 * In other words, users are assumed to be active when the context is initialized.</p>
 * <p>If no active polling Inputs are used, this flag has no effect.</p>
 * 
 * @param {boolean} isActive <strong>Optional</strong> - true if the user is active, false otherwise.  If left undefined, the value will not be changed.
 *
 * @returns {boolean} true if the user is active, false otherwise
 *
 * @throws Throws an exception if the context has not been initialized with BCC.init()
 */
BCC.userActive = function(isActive) {
	BCC._checkContextExists();
	
	if ("undefined" !== typeof(isActive)) {
		if (isActive) {
			BCC.ContextInstance.setUserActive();
		} else {
			BCC.ContextInstance.setUserInactive();
		}
	}

	return BCC.ContextInstance.isUserActive();
};

/**
 * <p>Gets and Sets the current state of channel feed message validation.</p>
 *
 * <p>When message validation on, every message passed to the system will be compared to the known server information about
 * a channel and validated before handing it off to the server.  Each message will be tested and validated
 * that every field that is expected by the server is present, and that each field is of the correct data type.
 * Use this when you have dynamic messages and you need to be notified with error handlers when messages do not conform.</p>
 *
 * <p>When message validation is off, any message will be sent to the server without checking the fields before sending.
 * If any message is improperly shaped, the server will quietly throw out the message and not process it.
 * Use this when you have a high volume of very concrete message structures that are not dynamic and want a small
 * performance boost.</p>
 *
 * @param {boolean} shouldValidate <strong>Optional</strong> - Flag indicating if validation should be on or off.  If left undefined, the value will not be changed.
 *
 * @returns {boolean} Flag indicating the current state of message validation
 * 
 * @throws Throws an exception if the context has not been initialized with BCC.init()
 */
BCC.fieldMessageValidation = function(shouldValidate) {
	BCC._checkContextExists();
	
	if ("undefined" !== typeof(shouldValidate)) {
		if (shouldValidate) {
			BCC.ContextInstance.setValidateMessagesOn();
		} else {
			BCC.ContextInstance.setValidateMessagesOff();
		}
	}
	
	return BCC.ContextInstance.getValidateMessagesFlag();
};

BCC.ContextInstance = null;
