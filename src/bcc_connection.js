//-----------------------------------------------------------------
// Copyright 2012 BrightContext Corporation
//
// Licensed under the MIT License defined in the 
// LICENSE file.  You may not use this file except in 
// compliance with the License.
//-----------------------------------------------------------------

BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

/**
 * @class The BCC Connection object that encapsulates Web Sockets, Flash Sockets, Web Streaming and Long Polling
 * @constructor
 * @param {string} apiKey the API key that will be used to create a session
 * @param {int} heartbeat_cycle  Time Duration of the heart beat cycle in Secs
 * @private
 */
BCC.Connection = function(apiKey, heartbeat_cycle) {
	var me = this;

	this.endpoint = null;
	this.heartbeat_cycle = heartbeat_cycle * 1000;
	this.heartbeat_interval_id = null;

	/**
	 * Called by the constructor to initialize the object 
	 * @private
	 */
	this._init = function() {
	};

	this.getMetrics = function () {
		if (!this._metrics) {
			this._metrics = new BCC.Util.Metrics();
		}
		return this._metrics;
	};

	this.resetAttempts = function () {
		this.getMetrics().set('socket_attempts' ,0);
		this.getMetrics().set('flash_attempts', 0);
		this.getMetrics().set('rest_attempts', 0);
	};

	/**
	 * This method returns the session JSON
	 * @returns {JSON} Session
	 * @private
	 */
	this.getSession = function() {
		return this.session;
	};

	/**
	 * Opens the socket/streaming connection
	 */
	this.open = function (completion) {
		me.getMetrics().inc('open');

		if (!me.session || !me.endpoint) {
			var session_create_attempts = me.getMetrics().inc('session_create_attempts');
			if (session_create_attempts > BCC.MAX_SESSION_ATTEMPTS) {
				completion('number of session creates exceeded maximum limit: ' + session_create_attempts);
			} else {
				var s = new BCC.Session(apiKey);
				s.create(function (session_create_error, established_session) {
					if (session_create_error) {
						BCC.Log.error(session_create_error, 'BCC.Connection.open');
						if (session_create_error.match(/api key/i) && session_create_error.match(/invalid/i)) {
							completion(session_create_error);	// invalid api key error, give up
						} else {
							me.open(completion);	// recurse to find a new session
						}
					} else {
						me.session = established_session;
						me.resetAttempts();

						me._connectToNextAvailableEndpoint(0, function (endpoint_connect_error, endpoint) {
							if (endpoint_connect_error) {
								completion(endpoint_connect_error);
							} else {
								me.endpoint = endpoint;
								me._startHeartbeats();

								completion(null, me);
							}
						});
					}
				});
			}
		} else {
			completion(null, me);
		}
	};

	/**
	 * current state of the connection
	 * @returns true if the endpoint is closed or non-existant, false otherwise
	 * @private
	 */
	this.isClosed = function () {
		var closed = ((!me.endpoint) || (me.endpoint.isClosed()));
		return closed;
	};

	/** current state of the connection
	 * @returns true if the session and endpoint are assigned and the endpoint is actively open
	 * @private
	 */
	this.isOpen = function () {
		var open = ((!!me.session) && (!!me.endpoint) && (me.endpoint.isOpen()));
		return open;
	};

	/**
	 * @returns true if the current endpoint uses the preamble functionality to pre-emptively send commands when it was created
	 */
	this.usesPreamble = function () {
		var r = (me.endpoint && (me.endpoint.getName() == 'stream'));
		return r;
	};

	/**
	 * Closes the socket/streaming connection
	 */
	this.close = function(completion) {
		me.getMetrics().inc('close');

		if (me.endpoint) {
			if (!me.endpoint.isClosed()) {
				me.getMetrics().inc('disconnect');
				me._stopHeartbeats();
				
				me.endpoint.disconnect(function (disconnect_error) {
					if (BCC.Util.isFn(completion)) {
						completion(disconnect_error, me);
					}

					if (disconnect_error) {
						me._invoke(me.onerror, disconnect_error);
					} else {
						me._invoke(me.onclose, null);
					}
				});
			} else {
				if (BCC.Util.isFn(completion)) {
					completion(null, me);	// endpoint already closed
				}
			}
		} else {
			if (BCC.Util.isFn(completion)) {
				completion(null, me);	// no endpoint
			}
		}
	};

	/**
	 * Sends the command over the socket connection or makes a REST call
	 * @param {BCC.Command} command
	 */
	this.send = function(command) {
		if (me.endpoint) {
			if (!me.endpoint.isClosed()) {
				me.endpoint.write(command);
			} else {
				me._stopHeartbeats();
				me._invoke(me.onerror, 'endpoint is closed');
			}
		} else {
			me._stopHeartbeats();
			me._invoke(me.onerror, 'no endpoint');
		}
	};

	/**
	 * Sends the heartbeat over the socket
	 * @private
	 */
	this._startHeartbeats = function() {
		if (me.heartbeat_interval_id) {
			BCC.Log.debug('could not start heartbeats, heartbeat_interval_id already scheduled', 'BCC.Connection._startHeartbeats');
		} else {
			BCC.Log.debug('starting heartbeats cycle at ' + me.heartbeat_cycle, 'BCC.Connection._startHeartbeats');
			me.heartbeat_interval_id = setInterval(me._sendHeartbeat, me.heartbeat_cycle);
		}
	};

	this._sendHeartbeat = function() {
		if (me.endpoint) {
			if (!me.endpoint.isClosed()) {
				me.endpoint.heartbeat();
			} else {
				me._stopHeartbeats();
				me._invoke(me.onerror, 'endpoint is closed');
			}
		} else {
			me._stopHeartbeats();
			me._invoke(me.onerror, 'no endpoint');
		}
	};

	/**
	 * Stops the heartbeat
	 * @private
	 */
	this._stopHeartbeats = function() {
		if (me.heartbeat_interval_id) {
			BCC.Log.debug('stopping heartbeats', 'BCC.Connection._stopHeartbeats');
			clearInterval(me.heartbeat_interval_id);
			me.heartbeat_interval_id = null;
		} else {
			BCC.Log.debug('could not stop heartbeats, no heartbeat_interval_id', 'BCC.Connection._stopHeartbeats');
		}
	};

	/** 
	 * Invokes an event handler with a parameter
	 * @private
	 */
	this._invoke = function (fn, param) {
		if (BCC.Util.isFn(fn)) {
			fn(param);
		}
	};

	this._connectToNextAvailableEndpoint = function (delay, completion) {
		var f = function () {
			var socket_attempts, flash_attempts, rest_attempts,
					available_endpoints, endpoint_url, connect_ep;

			available_endpoints = me.session.getEndpoints();

			connect_ep = function (sid, u, ep) {
				ep.setUrl(u);
				ep.setSessionId(sid);

				ep.onclose = function (close_error) {
					BCC.Log.debug('endpoint unexpectedly closed ' + close_error, ep.getName());

					if (me.endpoint) {
						me._invoke(me.onerror, close_error);
					}
				};

				ep.connect(function (endpoint_connect_error, opened_endpoint) {
					if (endpoint_connect_error) {
						BCC.Log.error(endpoint_connect_error, 'BCC.Connection._connectToNextAvailableEndpoint');
						me._connectToNextAvailableEndpoint(delay, completion);
					} else {
						completion(null, opened_endpoint);
					}
				});
			};

			socket_attempts = me.getMetrics().get('socket_attempts');
			if (socket_attempts < available_endpoints.socket.length) {
				me.getMetrics().inc('socket_attempts');
				endpoint_url = available_endpoints.socket[socket_attempts];

				BCC.Env.checkWebSocket(function (websocket_check_error) {
					if (websocket_check_error) {
						me._connectToNextAvailableEndpoint(delay, completion);
					} else {
						connect_ep(
							me.session.getSessionId(),
							me.session.getSocketUrl(endpoint_url),
							new BCC.WebSocketEndpoint()
						);
					}
				});

			} else {

				flash_attempts = me.getMetrics().get('flash_attempts');
				if (flash_attempts < available_endpoints.flash.length) {
					me.getMetrics().inc('flash_attempts');
					endpoint_url = available_endpoints.flash[flash_attempts];

					BCC.Env.checkFlashSocket(function (flashsocket_check_error) {
						if (flashsocket_check_error) {
							me._connectToNextAvailableEndpoint(delay, completion);
						} else {
							connect_ep(
								me.session.getSessionId(),
								me.session.getSocketUrl(endpoint_url),
								new BCC.FlashSocketEndpoint()
							);
						}
					});
				} else {

					rest_attempts = me.getMetrics().get('rest_attempts');
					if (rest_attempts < available_endpoints.rest.length) {
						me.getMetrics().inc('rest_attempts');
						endpoint_url = available_endpoints.rest[rest_attempts];
						
						BCC.Env.checkStreaming(function (streaming_check_error) {
							if (streaming_check_error) {
								completion('no endpoint types supported');
							} else {
								var pending_commands = [];
								if (BCC.Util.isFn(me.onpreamble)) {
									me.onpreamble(pending_commands);
								}

								connect_ep(
									me.session.getSessionId(),
									me.session.getStreamUrl(endpoint_url),
									new BCC.RestStreamEndpoint(pending_commands)
								);
							}
						});

					} else {
						completion('all endpoint connection attempts exhausted');
					}
				}
			}
		};

		setTimeout(f, delay);
	};

	this._reconnect = function (completion) {
		me.getMetrics().inc('reconnect');

		if ((!!me.endpoint) && (me.endpoint.isClosed())) {
			me.endpoint.connect(function (reconnect_error) {
				if (reconnect_error) {
					completion(reconnect_error, me);
				} else {
					me._startHeartbeats();
					completion(null, me);
				}
			});
		} else {
			completion(null, me);	// nothing to do
		}
	};

	this._fallback = function (completion) {
		var fallback_delay = 5000,
				conn_metrics,
				ep_metrics,
				reconnect_attempts,
				reconnect_timeout,
				heartbeat_in,
				heartbeat_out,
				ep_was_stable,
				ep_reconnect_attempts_exceeded,
				socket_attempts,
				flash_attempts,
				rest_attempts,
				available_endpoints,
				exhausted_all_endpoints
		;

		if (me.is_retrying_same_endpoint || me.is_finding_next_available_endpoint) {
			return;	// avoid double fallback event chains
		}

		me.getMetrics().inc('fallback');

		if (!me.endpoint || !me.session) {
			me.session = null;
			me.endpoint = null;

			me.open(function (new_session_error) {
				if (new_session_error) {
					var session_create_attempts = me.getMetrics().get('session_create_attempts');
					if (session_create_attempts < BCC.MAX_SESSION_ATTEMPTS) {
						me._fallback(completion);
					} else {
						completion(new_session_error);	// new sessions exceeded
					}
				} else {
					me.resetAttempts();

					completion(null, me);

					me.reopenFeeds();
				}
			});

		} else {
			if (!me.endpoint.isClosed()) {
				// first close the endpoint and come back
				me.close(function () {
					me._fallback(completion);
				});
			} else {
				conn_metrics = me.getMetrics();
				conn_metrics.print('connection fallback metrics');
				ep_metrics = me.endpoint.getMetrics();
				ep_metrics.print('endpoint fallback metrics');

				heartbeat_in = ep_metrics.get('heartbeat_in');
				heartbeat_out = ep_metrics.get('heartbeat_out');
				ep_was_stable = ((heartbeat_in >= 2) && (heartbeat_out >= 2));

				reconnect_attempts = ep_metrics.inc('reconnect_attempts');
				ep_reconnect_attempts_exceeded = (reconnect_attempts > BCC.MAX_ENDPOINT_ATTEMPTS);

				socket_attempts = conn_metrics.get('socket_attempts');
				flash_attempts = conn_metrics.get('flash_attempts');
				rest_attempts = conn_metrics.get('rest_attempts');
				available_endpoints = me.session.getEndpoints();
				exhausted_all_endpoints = ((socket_attempts > available_endpoints.socket.length) && (flash_attempts > available_endpoints.flash.length) && (rest_attempts > available_endpoints.rest.length));

				if (ep_reconnect_attempts_exceeded || exhausted_all_endpoints) {
          // jump to new session
					me.session = null;
					me.endpoint = null;
					me._fallback(completion);
				} else {
					if (ep_was_stable) {
						// retry the same endpoint
						me.is_retrying_same_endpoint = true;
						reconnect_timeout = reconnect_attempts * fallback_delay;

						setTimeout(function () {
							me.endpoint.connect(function (reconnect_error) {
								me.is_retrying_same_endpoint = false;

								if (reconnect_error) {
									me._fallback(completion);
								} else {
									me._startHeartbeats();
									completion(null, me);	// reconnected to same endpoint
								}
							});
						}, reconnect_timeout);
					} else {
						// degrade connection to next available
						me.is_finding_next_available_endpoint = true;

						me.endpoint = null;
						me._connectToNextAvailableEndpoint(fallback_delay, function (endpoint_connect_error, degradedEndpoint) {
							me.is_finding_next_available_endpoint = false;

							if (endpoint_connect_error) {
								me._fallback(completion);
							} else {
								me.endpoint = degradedEndpoint;
								me._startHeartbeats();

								completion(null, me);	// reconnected to degraded endpoint
							}
						});
					}
				}
			}
		}

	};

	this.reopenFeeds = function () {
		BCC.Log.debug('re-opening all feeds', "BCC.Connection.reopenFeeds");
		BCC._checkContextExists();
		BCC.ContextInstance._reRegisterAllFeeds();
	};

	this._init();

	/**
	 * Single Listener event fired when the connection is opened
	 * @name BCC.Connection#onopen
	 * @event
	 */

	/** 
	 * Single Listener event fired when the connection is closed
	 * @name BCC.Connection#onclose
	 * @event
	 */

	/** 
	 * Single Listener event fired when there is a connection error 
	 * @name BCC.Connection#onerror
	 * @event
	 */
};
