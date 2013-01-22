//-----------------------------------------------------------------
// Copyright 2012 BrightContext Corporation
//
// Licensed under the MIT License defined in the
// LICENSE file.  You may not use this file except in
// compliance with the License.
//-----------------------------------------------------------------

BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

BCC.Endpoint = function (typename) {
	this._typename = typename;
	this._initialized = false;
	this._description = '';
};

// endpoint base

BCC.Endpoint.prototype.initialize = function () {
	this._metrics = this.getMetrics();
	this._initialized = true;
};

BCC.Endpoint.prototype.getName = function () {
	return this._typename;
};

BCC.Endpoint.prototype.getMetrics = function () {
	if ('object' !== typeof(this._metrics)) {
		this._metrics = new BCC.Util.Metrics();
	}
	return this._metrics;
};

BCC.Endpoint.prototype.getUrl = function () {
	return this._url;
};

BCC.Endpoint.prototype.setUrl = function (url) {
	this._url = url;
	return this._url;
};

BCC.Endpoint.prototype.getSessionId = function () {
	return this._sid;
};

BCC.Endpoint.prototype.setSessionId = function (sid) {
	this._sid = sid;
	return this._sid;
};

BCC.Endpoint.prototype.onopen = function (c) {
	BCC.Log.debug(this.getName() + "::onopen" + c);
};

BCC.Endpoint.prototype.printMetrics = function () {
	this.getMetrics().print(this.getName());
};

BCC.Endpoint.prototype.createEventFromResponse = function(json) {
	var eventData, eventObject;

	if ("object" === typeof(json)) {
		eventData = json;
	} else if ("string" === typeof(json)) {
		if ('' === json) {
			return; // nothing to do
		} else {
			try {
				eventData = JSON.parse(json);
			} catch(ex) {
				BCC.Log.error(ex, "BCC.Endpoint.createEventFromResponse");
				return null;
			}
		}
	}

	eventObject = new BCC.Event(eventData.eventType, eventData.eventKey, eventData.msg);
	return eventObject;
};

BCC.Endpoint.prototype.registerCommandWithDispatcher = function (command) {
	var k = BCC.EventDispatcher.getObjectKey(command);
	BCC.EventDispatcher.register(k, command);
	
	command.addParam({ sid: escape(this._sid) });
	command.addParam({ eventKey: "" + k });
};

BCC.Endpoint.prototype.isHeartbeatResponseEvent = function (event_object) {
	if ('object' !== typeof(event_object)) {
		return false;
	} else {
		if (0 !== parseInt(event_object.getKey(),10)) {
			return false;
		} else {
			var m = event_object.getMessage();
			if ('object' !== typeof(m)) {
				return false;
			} else {
				if ('hb' !== m.message) {
					return false;
				} else {
					return true;
				}
			}
		}		
	}
};

// inheritance

BCC.WebSocketEndpoint = function () { };
BCC.FlashSocketEndpoint = function () { };
BCC.RestStreamEndpoint = function (pending_commands) {
	// array of pending commands to compact into single stream/create
	this.preamble = pending_commands;
};

BCC.WebSocketEndpoint.prototype = new BCC.Endpoint('websocket');
BCC.FlashSocketEndpoint.prototype = new BCC.Endpoint('flashsocket');
BCC.RestStreamEndpoint.prototype = new BCC.Endpoint('stream');

// heartbeats

BCC.WebSocketEndpoint.prototype.heartbeat = function () {
	var s = this.getSocket();
	if (s) {
		this._metrics.inc('heartbeat_out');
		this.getSocket().send(BCC.HEART_BEAT_STRING);
	} else {
		BCC.Log.error('heartbeat failure, no socket', 'BCC.WebSocketEndpoint.heartbeat');
	}
};

BCC.FlashSocketEndpoint.prototype.heartbeat = BCC.WebSocketEndpoint.prototype.heartbeat;

BCC.RestStreamEndpoint.prototype.heartbeat = function () {
	var s = this._stream;

	if (s) {
		this._metrics.inc('heartbeat_out');

		if (BCC.AJAX_IN_PROGRESS === this._stream.status) {
			this._metrics.inc('heartbeat_in');
		} else {
			BCC.Log.error('heartbeat failure : stream status ' + this._stream.status, 'RestStreamEndpoint.heartbeat');
		}
	} else {
		BCC.Log.error('heartbeat failure, no stream', 'BCC.RestStreamEndpoint.heartbeat');
	}
};

// connect

BCC.WebSocketEndpoint.prototype.createSocket = function (url, completion) {
	BCC.Log.debug(url, this.getName());

	var s, socketT;

	if (BCC.Util.isFn(completion)) {
		socketT = (BCC.WebSocket || window.WebSocket || window.MozWebSocket);

		if ('undefined' === typeof(socketT)) {
			completion('no web socket support');
		} else {
			try {
				s = new socketT(url);
				completion(null, s);
				return s;
			} catch (ex) {
				completion(ex);
				return null;
			}
		}
	}
};

BCC.FlashSocketEndpoint.prototype.createSocket = BCC.WebSocketEndpoint.prototype.createSocket;

BCC.WebSocketEndpoint.prototype.getSocket = function () {
	return this._socket;
};

BCC.FlashSocketEndpoint.prototype.getSocket = BCC.WebSocketEndpoint.prototype.getSocket;

BCC.RestStreamEndpoint.prototype.getSocket = function () {
	return this._stream;
};

BCC.WebSocketEndpoint.prototype.wireupNewSocket = function (me, s, completion) {
	var opencount = 0,
			call_completion_count = 0,
			call_completion;

	call_completion = function (error_message) {
		// prevent against double completion handlers firing when we get both an onerror() and onclose() event
		if (1 == ++call_completion_count) {
			if (BCC.Util.isFn(completion)) {
				completion(error_message, me);
			}
		}
	};

	s.onopen = function(open_event) {
		opencount = me._metrics.inc('socket_open_event');
		me._socket = s;
		call_completion(null);
	};

	s.onclose = function(close_event) {
		me._metrics.inc('socket_close_event');
		if (0 === opencount) {
			// sometimes instead of errors, we get a "forced closed" event from the browser
			call_completion('socket closed without open');
		}
		me.connectionClosed(close_event || 'socket closed');
	};

	s.onmessage = function(message_event) {
		if (0 === opencount) {
			// just in case we get a message without an open event, notify things are well
			call_completion(null);
		}
		me._metrics.inc('socket_message_event');
		me.handleInboundData(message_event.data);
	};

	s.onerror = function(error_event) {
		if (0 === opencount) {
			// sometimes instead of errors, we get a "forced closed" event from the browser
			call_completion('socket error without open');
		}

		me._metrics.inc('socket_error_event');
		me.connectionError(error_event || 'unknown socket error');
	};
};

BCC.FlashSocketEndpoint.prototype.wireupNewSocket = BCC.WebSocketEndpoint.prototype.wireupNewSocket;

BCC.WebSocketEndpoint.prototype.connect = function (completion) {
	BCC.Env.flipToNativeWebSocket();

	var me = this;

	if (!me._initialized) {
		me.initialize();
	}

	me._metrics.inc('connect');

	me.createSocket(me.getUrl() + '?sid=' + me.getSessionId(), function (error, s) {
		if (error) {
			completion(error);
		} else {
			me.wireupNewSocket(me, s, completion);
		}
	});
};

BCC.FlashSocketEndpoint.prototype.connect = function (completion) {
	BCC.Env.flipToFlashWebSocket();

	var me = this;

	if (!me._initialized) {
		me.initialize();
	}
	me._metrics.inc('connect');

	me.getSwfObject(function (swf_load_error) {
		if (swf_load_error) {
			completion(swf_load_error);
		} else {

			me.getFlashSocketPolyfill(function (flashsocket_load_error) {
				if (flashsocket_load_error) {
					completion(flashsocket_load_error);
				} else {

					me.createSocket(me.getUrl() + '?sid=' + me.getSessionId(), function (socket_error, flashsocket) {
						if (socket_error) {
							completion(socket_error);
						} else {

							me.wireupNewSocket(me, flashsocket, completion);
						}
					});
				}
			});
		}
	});
};

BCC.FlashSocketEndpoint.prototype.getSwfObject = function (completion) {
	if ('undefined' == typeof(swfobject)) {
		BCC.Util.injectScript(BCC.Env.pathToLib(BCC.SWF_OBJECT_LIB_PATH), function (swf_load_error) {
			if (swf_load_error) {
				completion(swf_load_error);
			} else {
				completion(null, swfobject);
			}
		});
	} else {
		completion(null, swfobject);
	}
};

BCC.FlashSocketEndpoint.prototype.getFlashSocketPolyfill = function (completion) {
	if ('undefined' == typeof(BCC.FlashSocketEndpoint.polyfill_element)) {
		BCC.FlashSocketEndpoint.polyfill_element = BCC.Util.injectScript(BCC.Env.pathToLib(BCC.FLASH_SOCKET_SWF_PATH), function (polyfill_load_error) {
			if (polyfill_load_error) {
				completion(polyfill_load_error);
			} else {
				completion(null, BCC.FlashSocketEndpoint.polyfill_element);
			}
		});
	} else {
		completion(null, BCC.FlashSocketEndpoint.polyfill_element);
	}
};

BCC.RestStreamEndpoint.prototype.connect = function (completion) {
	var me = this;

	if (!me._initialized) {
		me.initialize();
	}
	me._metrics.inc('connect');

	// notify callers when the stream is initialized
	me._on_stream_initialized = completion;

	me.createStream(function (create_error) {
		if (create_error) {
			// notify callers when stream fails to create
			completion(create_error, me);
		}
	});
};

BCC.RestStreamEndpoint.prototype.createStream = function (completion) {
	var me = this,
			buffer = '',
			postbody = '',
			chomp;

	me.getMetrics().set('stream_initialized', 0);

	chomp = function (d) {
		me.handleInboundData(d.substr(buffer.length));	// feed partial data into the tokenizer
		buffer = d;
	};

	me.tokenizer = new BCC.StreamTokenizer();
	me.tokenizer.setCallback(function(data) {
		me.handleInboundObject(data);	// handle complete objects coming out of tokenizer
	});

	postbody = 'sid=' + me.getSessionId();
	if (me.preamble) {
		postbody += '&cmdList=[';
		while (0 !== me.preamble.length) {
			var cmd = me.preamble.shift();
			me.registerCommandWithDispatcher(cmd);
			postbody += cmd.getCommandAsMessage();
			if (0 !== me.preamble.length) {
				postbody += ',';
			}
			me._metrics.inc('preamble_commands');
		}
		postbody += ']';
	}

	me._stream = BCC.Util.makeRequest({
		url: me.getUrl(),
		data: postbody,
		onprogress: function (data) {
			chomp(data);
		},
		onload: function (response) {
			if (buffer.length != response.length) {
				chomp(response);
			}

			if (0 === me._metrics.get('stream_initialized')) {
				completion('stream closed without being initialized');
			}

			me.connectionClosed();
		},
		onerror: function (error) {
			if (me._stream) {
				if (!me._stream.deliberately_closed) {
					if (0 === me._metrics.get('stream_initialized')) {
						completion('stream initialization error');
					} else {
						// recurse to keep stream open, only if that fails, raise error for fallback
						setTimeout(function() {
							me.createStream(function (stream_create_error) {
								if (stream_create_error) {
									me.connectionError('failed to reconnect push stream: ' + stream_create_error);
								}
							});
						}, 0);
					}
				}
			} else {
				BCC.Log.error('stream error event on unknown stream: ' + error, 'BCC.RestStreamEndpoint.createStream');

				if (0 === me._metrics.get('stream_initialized')) {
					completion('stream initialization error');
				}
			}
		}
	});
	
	// autmatically fail in 5 seconds if we don't get stream initialized

	setTimeout(function () {
		if (0 === me._metrics.get('stream_initialized')) {
			me._stream.deliberately_closed = true;
			me._stream.abort();
			completion('stream initialization timeout');
		}
	}, 5000);
};

// disconnect

BCC.WebSocketEndpoint.prototype.disconnect = function (completion) {
	var me = this;

	me._metrics.inc('disconnect');
	BCC.Log.info('closing socket stream', 'WebSocketEndpoint.disconnect');

	if (me.isClosed()) {
		completion(null, me); // nothing to do
	} else {
		me.onclose = completion;
		me.getSocket().close();
	}
};

BCC.FlashSocketEndpoint.prototype.disconnect = function (completion) {
	var me = this,
			close_check_count = 0,
			close_check_limit = 5,
			close_check_interval = 1000,
			close_check_interval_id = null,
			too_many_checks = false,
			timeout_error = null
	;

	me._metrics.inc('disconnect');

	var s = me.getSocket();

	if (!s || me.isClosed()) {
		completion(null, me); // nothing to do
	} else {
		BCC.Log.info('closing flash stream', 'FlashSocketEndpoint.disconnect');

		s.close();

		// flash sockets do not always close down properly, so we enter a watch loop
		close_check_interval_id = setInterval(function () {
			++close_check_count;
			too_many_checks = (close_check_count >= close_check_limit);

			if (me.isClosed() || too_many_checks) {
				clearInterval(close_check_interval_id);
				close_check_interval_id = null;

				timeout_error = (too_many_checks) ? 'close timed out' : null;

				if (timeout_error) {
					me._socket.onopen = null;
					me._socket.onclose = null;
					me._socket.onmessage = null;
					me._socket.onerror = null;
					me._socket = null;
				}

				completion(timeout_error, me);
			} else {
				BCC.Log.error('flash socket slow closing', 'BCC.FlashSocketEndpoint.disconnect');
				s.close();	// try sending the close command again
			}
		}, close_check_interval);
	}

};

BCC.RestStreamEndpoint.prototype.disconnect = function (completion) {
	var me = this;

	me._metrics.inc('disconnect');
	BCC.Log.info('closing rest stream', 'RestStreamEndpoint.disconnect');

	me._stream.deliberately_closed = true;
	me._stream.abort();

	if (BCC.Util.isFn(completion)) {
		completion(null, me);
	}
};

// read

BCC.WebSocketEndpoint.prototype.handleInboundData = function (data) {
	BCC.Log.debug(data, this.getName());

	try {
		var event_object = this.createEventFromResponse(data);
		if (this.isHeartbeatResponseEvent(event_object)) {
			this._metrics.inc('heartbeat_in');
		} else {
			BCC.EventDispatcher.dispatch(event_object);
		}
	} catch (ex) {
		BCC.Log.error(ex, 'BCC.WebSocketEndpoint.handleInboundData');
	}
};

BCC.FlashSocketEndpoint.prototype.handleInboundData = BCC.WebSocketEndpoint.prototype.handleInboundData;

BCC.RestStreamEndpoint.prototype.handleInboundData = function (data) {
	this.tokenizer.appendData(data);
};

BCC.RestStreamEndpoint.prototype.handleInboundObject = function (o) {
	if ('string' === typeof(o.streaminitialized)) {
		this._metrics.inc('stream_initialized');

		BCC.Log.debug('stream initialized', 'BCC.RestStreamEndpoint.handleInboundObject');

		if (BCC.Util.isFn(this._on_stream_initialized)) {
			this._on_stream_initialized(null, this);
		}
	} else {
		BCC.Log.debug(JSON.stringify(o), this.getName());
		var event_object = this.createEventFromResponse(o);
		BCC.EventDispatcher.dispatch(event_object);
	}
};

// write

BCC.WebSocketEndpoint.prototype.write = function (command) {
	this._metrics.inc('write');
	this.registerCommandWithDispatcher(command);

	var msg = command.getCommandAsMessage();
	BCC.Log.debug(msg, this.getName());

	this.getSocket().send(msg);
};

BCC.FlashSocketEndpoint.prototype.write = BCC.WebSocketEndpoint.prototype.write;

BCC.RestStreamEndpoint.prototype.write = function (command) {
	var me = this,
			xhr, url, base, method, postbody;

	me.registerCommandWithDispatcher(command);

	base = BCC.Env.baseActionPath(me.getUrl());
	method = command.getCommandAction();

	if ('GET' == method) {
		url = BCC.Util.getBccUrl(base, command.getCommandUrl() + '?' + command.getCommandParametersAsEscapedString());
	} else {
		url = BCC.Util.getBccUrl(base, command.getCommandUrl());
		postbody = command.getCommandParametersAsEscapedString();
	}

	xhr = BCC.Util.makeRequest({
		url: url,
		method: method,
		data: postbody,
		onload: function (response) {
			me.handleInboundObject(response);
		},
		onerror: function (error) {
			BCC.Log.error(url + ' error: ' + error, 'RestStreamEndpoint.write');

			me.handleInboundObject(error || {
				eventType: 'onerror',
				eventKey: command.parameters.eventKey,
				msg: { error: "error processing request: " + url }
			});
		}
	});
};

// error handling and fallback logic

BCC.WebSocketEndpoint.prototype.isOpen = function () {
	var isOpen = false;

	if ('undefined' !== typeof(WebSocket)) {
		isOpen = (this._socket && (WebSocket.OPEN == this._socket.readyState));
	} else {
		isOpen = (this._socket && (1 == this._socket.readyState));
	}

	return isOpen;
};

BCC.FlashSocketEndpoint.prototype.isOpen = BCC.WebSocketEndpoint.prototype.isOpen;

BCC.WebSocketEndpoint.prototype.isClosed = function () {
	var isClosed = false;
	
	if (!this._socket) {
		isClosed = true;
	} else {
		if ('undefined' !== typeof(WebSocket)) {
			isClosed = (WebSocket.CLOSED == this._socket.readyState);
		} else {
			isClosed = (3 == this._socket.readyState);
		}
	}
	
	return isClosed;
};

BCC.FlashSocketEndpoint.prototype.isClosed = BCC.WebSocketEndpoint.prototype.isClosed;

BCC.RestStreamEndpoint.prototype.isOpen = function () {
	var isOpen = (this._stream && (BCC.AJAX_IN_PROGRESS == this._stream.status));
	return isOpen;
};

BCC.RestStreamEndpoint.prototype.isClosed = function () {
	var isClosed = (!this._stream || (BCC.AJAX_DONE == this._stream.status));
	return isClosed;
};

BCC.WebSocketEndpoint.prototype.connectionClosed = function (close_event) {
	BCC.Log.info(JSON.stringify(close_event), 'BCC.WebSocketEndpoint.connectionClosed');

	if (BCC.Util.isFn(this.onclose)) {
		this.onclose(null, this);
	} else {
		BCC.Log.debug('no onclose handler for ' + JSON.stringify(close_event), 'BCC.WebSocketEndpoint.connectionClosed');
	}
};

BCC.FlashSocketEndpoint.prototype.connectionClosed = function (close_event) {
	var me = this;
	
	BCC.Log.info(JSON.stringify(close_event), 'BCC.FlashSocketEndpoint.connectionClosed');
	
	if (BCC.Util.isFn(me.onclose)) {
		me.onclose(null, this);
	} else {
		BCC.Log.debug('no onclose handler for ' + JSON.stringify(close_event), 'BCC.FlashSocketEndpoint.connectionClosed');
	}
};

BCC.RestStreamEndpoint.prototype.connectionClosed = function (close_event) {
	BCC.Log.info(JSON.stringify(close_event), 'BCC.RestStreamEndpoint.connectionClosed');
	
	if (BCC.Util.isFn(this.onclose)) {
		this.onclose(null, this);
	} else {
		BCC.Log.debug('no onclose handler for ' + JSON.stringify(close_event), 'BCC.RestStreamEndpoint.connectionClosed');
	}
};

BCC.WebSocketEndpoint.prototype.connectionError = function (error_event) {
	BCC.Log.error(error_event, 'BCC.WebSocketEndpoint.connectionError');

	if (BCC.Util.isFn(this.onclose)) {
		this.onclose(error_event, this);
	} else {
		BCC.Log.debug('no onclose handler for ' + error_event, 'BCC.WebSocketEndpoint.connectionError');
	}
};

BCC.FlashSocketEndpoint.prototype.connectionError = function (error_event) {
	BCC.Log.error(error_event, 'BCC.FlashSocketEndpoint.connectionError');

	if (BCC.Util.isFn(this.onclose)) {
		this.onclose(error_event, this);
	} else {
		BCC.Log.debug('no onclose handler for ' + error_event, 'BCC.FlashSocketEndpoint.connectionError');
	}
};

BCC.RestStreamEndpoint.prototype.connectionError = function (error_event) {
	BCC.Log.error(error_event, 'BCC.RestStreamEndpoint.connectionError');

	if (BCC.Util.isFn(this.onclose)) {
		this.onclose(error_event, this);
	} else {
		BCC.Log.debug('no onclose handler for ' + error_event, 'BCC.RestStreamEndpoint.connectionError');
	}
};