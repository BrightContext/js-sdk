//-----------------------------------------------------------------
// Copyright 2012 BrightContext Corporation
//
// Licensed under the MIT License defined in the
// LICENSE file.  You may not use this file except in
// compliance with the License.
//-----------------------------------------------------------------

BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

/**
 * @class
 * <p>Represents a real-time stream of data.</p>
 * <p>For ThruChannels, this represents the default sub-channel, or any dynamic sub-channel created at runtime.</p>
 * <p>For QuantChannels, this represents any configured Input or Output using real-time server processing.</p>
 *
 * @description
 * <p>Feeds should not be created manually, simply call <code>project.feed(...)</code><p>
 *
 * @see BCC.Project#feed
 * @see BCC.Feed#addListener
 */
BCC.Feed = function(metadata, write_key) {

	// --- setup ---

	var me = this;

	this.handler = null;
	this.date_fields = null;
	this.conn = null;

	// meta data to be used for feed/session/create
	// {
	//	"project": project_name,
	//	"channel": channel_name,
	//	"connector": connecor_name,
	//	"filters": filter_object
	// }
	this.metadata = metadata;

	this.settings = {
		feedKey: null,
		filters: {}
	};

	// optional key to use for sending messages
	this.writeKey = (!!write_key) ? write_key : null;

	/**
	 * Called by the constructor to initialize the object
	 * @private
	 */
	this._init = function() {
		me._setState(BCC.Feed.State.CLOSED);
	};

	//
	// --- listener management ---
	//

	/**
	 * Adds a listener to the feed.  Any one feed can have multiple listeners.
	 * All listeners will be dispatched events about the feed in the order they were added as listeners.
	 * Listeners can be removed using <code>removeListener</code>
	 *
	 * @param {object} listenerObj object that has one event handler per event name
	 *
	 * @example
	 * f.addListener({
	 *   'onopen': function(f) {
	 *   },
	 *   'onerror': function(err) {
	 *   },
	 *   // other events ...
	 * });
	 *
	 * @see onopen
	 * @see onclose
	 * @see onmsgreceived
	 * @see onmsgsent
	 * @see onopen
	 * @see onhistory
	 * @see onerror
	 *
	 */
	this.addListener = function(listenerObj) {
		BCC.EventDispatcher.register(BCC.EventDispatcher.getObjectKey(me), listenerObj);
		BCC.EventDispatcher.register(me.getFeedKey(), listenerObj);
	};

	/**
	 * Removes a listener from the object
	 * @param {object} listenerObj the listener that was added using <code>addListener</code>
	 */
	this.removeListener = function(listenerObj) {
		BCC.EventDispatcher.unregister(BCC.EventDispatcher.getObjectKey(me), listenerObj);
		BCC.EventDispatcher.unregister(me.getFeedKey(), listenerObj);
	};

	//
	// --- simple properties ---
	//

	this.getHandler = function () {
		return this.handler;
	};

	/**
	 * Sets the handler to the feed
	 * @param {BCC.handler} fh
	 * @private
	 */
	this.setHandler = function(fh){
		this.handler = fh;
		return this.handler;
	};

	/**
	 * <p>Unlocks a write protected feed.</p>
	 * <p>Write protection is an option that is off by default and must be turned on using the management console.
	 * Once enabled, a write key will be generated by the server.
	 * A write key must be set using this method before calling <code>send</code> if one was not provided when opening the feed using <code>project.feed(...)</code>.
	 * </p>
	 * @param {string} k The value of the write key that was generated using the management console.
	 * @example
	 * // Method A - assigning the write key using project.feed
	 * project.feed({
	 *   channel: 'my protected thru channel',
	 *   writekey: 'my write key',
	 *   onopen: function(protected_feed) {
	 *     protected_feed.send({ fix: 'all the things'});
	 *   }
	 * });
	 *
	 * // Method B - assigning the write key after the feed is already open
	 * my_feed.setWriteKey('my write key');
	 * my_feed.send({ belongings: ['all', 'your', 'base'] });
	 * @see BCC.Project#feed
	 */
	this.setWriteKey = function(k){
		me.write_key = k;
	};
	
	/** @private */
	this._isInState = function(state_name) {
		if ('undefined' == typeof(me.settings)) {
			me.settings = {};
		}
		var is = (me.settings.state == state_name);
		return is;
	};
	
	/**
	 * True if the feed is open, false otherwise
	 * @private
	 */
	this.isOpen = function() {
		return me._isInState(BCC.Feed.State.OPEN);
	};
	
	/**
	 * True if the feed is closed, false otherwise
	 * @private
	 */
	this.isClosed = function() {
		return me._isInState(BCC.Feed.State.CLOSED);
	};
	
	/**
	 * True if the feed encountered an error, false otherwise
	 * @private
	 */
	this.hasError = function() {
		// TODO: probably should leave state alone and instead use a separate error property or array
		return me._isInState(BCC.Feed.State.ERROR);
	};

	/** sets the state of the feed
	 * @private
	 */
	this._setState = function (state_name) {
		if ('undefined' == typeof(me.settings)) {
			me.settings = {};
		}
		me.settings.state = state_name;
	};

	/**
	 * Returns the feed Id
	 * @returns {string}
	 * @private
	 */
	this.getFeedKey = function() {
		return me.settings.feedKey;
	};

	/**
	 * Returns the feed settings
	 * @returns {JSON}
	 * @private
	 */
	this.getSettings = function() { // used by feed registry to get feed settings from one feed so it can reload another
		return me.settings;
	};

	/**
	 * returns a handle to the connection
	 * @private
	 */
	this.getConnection = function () {
		return me.conn;
	};

	/**
	 * sets and returns the connection object to use for actions like open and history
	 * @private
	 */
	this.setConnection = function (c) {
		me.conn = c;
		return me.conn;
	};

	/**
	 * the command object that was used to open the feed
	 * @private
	 */
	this.getOpenCommand = function () {
		return me._createCommand;
	};

	this.shortDescription = function () {
		return JSON.stringify(me.metadata);
	};

	this.hasMetadata = function (md) {
		var serialized_md = JSON.stringify(md).toLowerCase().split('').sort().join();
		var my_serialized_md = JSON.stringify(me.metadata).toLowerCase().split('').sort().join();
		return (serialized_md == my_serialized_md);
	};

	//
	// --- actions ---
	//

	/**
	 * This method reopens the feed over the connection and is used on reconnect.
	 * @private
	 */
	this.reopen = function(connection, fr) {
		if (("undefined" == typeof(connection)) || (null === connection)) {
			BCC.Log.error("Invalid connection object, cannot reopen feeds","BCC.Feed.reopen");
			return;
		}

		this.conn = connection;

		var cmd = me._getFeedSessionCreateCommand(function (feed_open_error, feed_open_response) {
			if (feed_open_error) {
				BCC.Log.error(feed_open_error, "BCC.Feed.reopen");
				me.settings = {};
				me.settings.state = "error";

				var feedsForKey = fr.getAllFeedsForKey(me);
				for(var index = 0; index < feedsForKey.length; index++){
					var feedObj = feedsForKey[index];
					fr.unRegisterFeed(feedObj);
					var errorEvent = new BCC.Event("onclose", BCC.EventDispatcher.getObjectKey(feedObj), feedObj);
					BCC.EventDispatcher.dispatch(errorEvent);
				}
			} else {
				BCC.Log.debug("Feed reopened succesfully.", "BCC.Feed.reopen");
			}
		});
		
		cmd.send(connection);
	};

	this.open = function (completion) {
		var cmd = me._getFeedSessionCreateCommand(function (feed_open_error, feed_open_response) {
			if (feed_open_error) {
				completion(feed_open_error, me);
			} else {

				me.reloadFeedSettings(feed_open_response);

				completion(null, me);

				var k = BCC.EventDispatcher.getObjectKey(me);
				var feed_opened_event = new BCC.Event('onopen', k, me);
				BCC.EventDispatcher.dispatch(feed_opened_event);
			}
		});

		if (me.conn) {
			cmd.send(me.conn);
		} else {
			me.onneedsconnection(function (connection_error, open_connection) {
				if (connection_error) {
					BCC.Log.error(connection_error, 'BCC.Feed.open');
				} else {
					me.conn = open_connection;
					if (!me.conn.usesPreamble()) {
						cmd.send(me.conn);
					}
				}
			});
		}

		return cmd;
	};

	/**
	 * issues the feed/session/create command using the feed description and invokes the callback
	 * @private
	 */
	this._getFeedSessionCreateCommand = function (completion) {
		var cmd = new BCC.Command("POST", "/feed/session/create.json",
		{
			"feedDesc": me.metadata
		});
		
		cmd.onresponse = function(open_response) {
			if (BCC.Util.isFn(completion)) {
				completion(null, open_response);
			}
		};
		
		cmd.onerror = function(error_data) {
			if (BCC.Util.isFn(completion)) {
				completion(error_data);
			}
		};
		
		return cmd;
	};

	/**
	 * <p>Closes the feed. Once a feed is closed, no events will be recieved on it, and no data can be sent to the server on it.</p>
	 * <p>If this is the last feed that was opened, the connection to the server will be closed as well.
	 * Any attempt to open a feed when no connection is open will open the connection to the server automatically.
	 * Thus, if switching between only two feeds, it might make more sense to open one, and then close the other
	 * rather than close one first.  This will avoid unnecessarily closing the connection.</p>
	 */
	this.close = function() {
		BCC._checkContextExists();
		BCC.ContextInstance.closeFeed(this);
	};
	
	/**
	 * Closes the feed with the server
	 * @private
	 */
	this._close = function(connection) {
		var cmd = new BCC.Command("POST", "/feed/session/delete.json", {
			fklist : this.settings.feedKey
		});
		
		cmd.onresponse = function(event) {
			me.settings.state = "closed";
			me.handler = null;
			me.conn = null;
			var closeEvent = new BCC.Event("onclose", BCC.EventDispatcher.getObjectKey(me), me);
			BCC.EventDispatcher.dispatch(closeEvent);
			
			BCC.EventDispatcher.unregister(me.id, me);
			BCC.EventDispatcher.unregister(me.settings.feedKey, me);
			me._cleanUpFeed();
		};
		
		cmd.onerror = function(err) {
			if (!!!!me.settings) {
				me.settings = {};
			}
			me.settings.state = "error";
			BCC.Log.error("Error closing feed: " + err, "BCC.Feed.close");
			var errorEvent = new BCC.Event("onerror", BCC.EventDispatcher.getObjectKey(me), err);
			BCC.EventDispatcher.dispatch(errorEvent);
			
			BCC.EventDispatcher.unregister(me.id, me);
			BCC.EventDispatcher.unregister(me.settings.feedKey, me);
			me._cleanUpFeed();
		};
		
		var cx = ("undefined" == typeof(connection)) ? this.conn : connection;
		cmd.send(cx);
	};
	
	/**
	 * Clean up the connection
	 * @private
	 */
	this._cleanUpFeed = function(){
		BCC._checkContextExists();
		BCC.ContextInstance._unregisterFeed(this);

		if (BCC.ContextInstance.feedRegistry.isEmpty() && !!BCC.ContextInstance.conn) {
			// wait 1 full second before actually shutting down the connection and double check if it's actually empty again
			// there may be something else that comes along and opens a different feed in-between
			setTimeout(function () {
				// Close the connection if the feed registry is now completely empty
				if (BCC.ContextInstance.feedRegistry.isEmpty() && !!BCC.ContextInstance.conn) {
					BCC.ContextInstance.conn.close();
				}
			}, 1000);
		}
	};

	/**
	 * Reloads the feed settings and reregisters the listeners for the new feed id
	 * @param {object} s The settings from the other feed object that was already loaded
	 * @private
	 */
	this.reloadFeedSettings = function(s) {
		BCC.Log.debug('loading feed with settings: ' + JSON.stringify(s), 'BCC.Feed.reloadFeedSettings');
		me.settings = s;
		BCC.EventDispatcher.register(BCC.EventDispatcher.getObjectKey(me), me);
		BCC.EventDispatcher.register(me.settings.feedKey, me);
	};

	/**
	 * <p>Sends a message to the server for processing and broadcasting.
	 * This is an asynchronous operation that may fail.
	 * Any notification of failure is delivered to all listeners using the <code>onerror</code> event handler.</p>
	 * <p>Possible types of failures:</p>
	 * <ul>
	 * <li>If message contract validation is turned on, the fields of the message will be validated client-side before sending to the server.</li>
	 * <li>Messages can only be sent on open feeds.  If a feed has not been opened, or a feed has been closed, no message will be sent.</li>
	 * <li>Attempting to send a message on a write protected feed that has not been unlocked using the correct write key will result in <code>onerror</code> event handler being fired.</li>
	 * </ul>
	 *
	 * @param {object} msg
	 * <p>On QuantChannels, this is the message that should be sent for processing matching the shape of the Input.
	 * In other words, if the Input has three fields: <code>a</code>, <code>b</code> and <code>c</code> this message should have those three fields.
	 * Any attempt to send a message on an Output will have no effect.</p>
	 * <p>On ThruChannels, this may be any valid JSON to be broadcasted to all listeners.</p>
	 *
	 */
	this.send = function(msg) {
		if (!msg) return;
		
		if (this.handler && this.conn) {
			this.handler.sendMsg(msg, this, this.conn);
		} else {
			BCC.Log.error("Feed is closed. Cannot send message over the feed at this time." ,"BCC.Feed.sendMsg");
		}
	};
	
	/**
	 * Retrieves messages that were sent on a feed in the past.
	 * Available only for feeds using ChannelWrite to store channel data.
	 * @param {number} limit <strong>Optional</strong> - Default 10.  The maximum number of historic messages to fetch.
	 * @param {date} ending <strong>Optional</strong> - Date object that represents the most recent date of a historic message that will be returned. Any message that occurred later than this date will be filtered out of the results.
	 * @param {function} completion <strong>Optional</strong> - Extra completion handler for the onhistory event.  This is only needed if you originally opened the feed using project.feed(), but did not provide an onhistory callback handler.  Method signature: <code>function (feed, history) {}</code>
	 * @example
	 * // Method A - using a global event handler
	 * p.feed({
	 *   onopen: function(f) {
	 *     f.history();
	 *   },
	 *   onhistory: function(f, h) {
	 *     console.log(h); // array of 10 most recent messages
	 *   }
	 * });
	 *
	 * // Method B - using the inline history handler
	 * f.history(
	 *   3,	// fetch three messages
	 *   new Date(2012,0,3), // sent on or before Tue Jan 03 2012 00:00:00 local time
	 *   function(f,h) {
	 *     console.log(h);
	 *   }
	 * );
	 */
	this.history = function(limit, ending, completion) {
		var cmd = null,
				cmd_opts = {};

		cmd_opts.feedKey = this.settings.feedKey;
		if (ending) {
			cmd_opts.sinceTS = (new Date(ending)).getTime();
		}
		if (limit) {
			cmd_opts.limit = limit;
		}

		cmd = new BCC.Command("GET", "/feed/message/history.json", cmd_opts);
		
		cmd.onresponse = function(evt) {
			var historyEvent = new BCC.Event("onhistory", BCC.EventDispatcher.getObjectKey(me), evt);
			BCC.EventDispatcher.dispatch(historyEvent);

			if ('function' === typeof(completion)) {
				completion(me, evt);
			}
		};
		
		cmd.onerror = function(err) {
			BCC.Log.error("Error getting feed history: " + err, "BCC.Feed.getHistory");
			var errorEvent = new BCC.Event("onerror", BCC.EventDispatcher.getObjectKey(me), err);
			BCC.EventDispatcher.dispatch(errorEvent);
		};
		
		this.conn.send(cmd);
		return true;
	};

	/**
	 * Retrieves messages that were sent on a feed in the past.
	 * @private
	 */
	this.getHistory = this.history;

	this._init();
	
	/**
	 * Fired when message is pushed down from the server to the client.
	 * @name BCC.Feed#onmsgreceived
	 * @event
	 * @see BCC.Project#feed
	 */

	/**
	 * Fired after a message is successfully sent from the client to the server for processing or broadcasting.
	 * @name BCC.Feed#onmsgsent
	 * @event
	 * @see BCC.Feed#send
	 */
	
	/**
	 * Fired after the feed is opened and is ready for use.
	 * @name BCC.Feed#onopen
	 * @event
	 * @see BCC.Project#feed
	 */
	
	/**
	 * Fired in response to a successful <code>getHistory</code>.
	 * @name BCC.Feed#onhistory
	 * @event
	 * @see BCC.Feed#history
	 */
	
	/**
	 * Fired when the feed is successfully closed.
	 * @name BCC.Feed#onclose
	 * @event
	 * @see BCC.Feed#close
	 */
	
	/**
	 * Fired any time there is an error with any command.
	 * @name BCC.Feed#onerror
	 * @event
	 */
};

BCC.Feed.INPUT_TYPE = "IN";
BCC.Feed.OUTPUT_TYPE = "OUT";
BCC.Feed.UNPROCESSED_TYPE = "THRU";

BCC.Feed.DATE_FIELD = "D";

BCC.Feed.State = {
	OPEN: "open",
	OPENING: "opening",
	CLOSED: "closed",
	ERROR: "error"
};

/** @private */
BCC.Feed.DEFAULT_FEED_NAME = "default";

/** @private */
BCC.Feed.DEFAULT_SUBCHANNEL_FILTER = "subChannel";

