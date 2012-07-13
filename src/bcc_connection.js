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
 * @param {string} sid  SessionID
 * @param {string} wsUrl  Web Socket URL
 * @param {string} streamUrl  Web Streaming URL
 * @param {string} longPollUrl  Long Poll URL
 * @param {string} restUrl  REST API Call URL
 * @param {int} hbCycle  Time Duration of the heart beat cycle in Secs
 * @private
 */
BCC.Connection = function(sid, wsUrl, streamUrl, longPollUrl, restUrl, hbCycle) {
    this.sid = sid;
    this.wsUrl = wsUrl;
    this.streamUrl = streamUrl;
    this.longPollUrl = longPollUrl;
    this.restUrl = restUrl;
    this.hbCycle = hbCycle * 1000;

    this.mode = null;
    this.socket = null;
    this.xhr = null;
    this.socketReady = false;
    this.needsOpening = false;
    this.closeInitiated = false;

    this.streamingSupport = null;
    this.soFar = 0;
    this.tokenizer = null;
    this.hbTimerHandler = null;
    this.ready = false;

    /**
     * Called by the constructor to initialize the object 
     * @private
     */
    this._init = function() {
        this._loadSocket();
    };

    /**
     * Opens the socket/streaming connection
     */
    this.open = function() {
        if (this._socketSupport()) {
            if (this.socketReady)
            this._doSocketOpen();
            else
            this.needsOpening = true;
        } else {
            this._doStreamOpen();
            this.ready = true;
            BCC.Log.info("Connection Opened.", "BCC.Connection.open");
            if (this.onopen != null)
            this.onopen();
        }
    };

    /**
     * Closes the socket/streaming connection
     */
    this.close = function() {
        BCC.Log.info("Attempting to close connection", "BCC.Connection.close");
        if (this._socketSupport()) {
            this._stopHeartbeat();
            this.closeInitiated = true;
            this.socket.close();
        }
        else {
            this._closeStream();
            BCC.Log.info("Connection closed.", "BCC.Connection.close");
            if (this.onclose != null)
            this.onclose();
        }
    };

    /**
     * Sends the command over the socket connection or makes a REST call
     * @param {BCC.Command} command
     */
    this.send = function(command) {
        var k = BCC.EventDispatcher.getObjectKey(command);
   			BCC.EventDispatcher.register(k, command);

        command.addParam({
            sid: escape(this.sid)
        });
        command.addParam({
            eventKey: "" + k
        });
        
        if (this._socketSupport()) {
            var msg = command.getCommandAsMessage();
            BCC.Log.info("Message sent over the socket : " + msg, "BCC.Connection.send");
            this.socket.send(msg);
        } else {
            // turn command into REST call
            var me = this;
            var xhr = new BCC.Ajax();
            xhr.onload = function() {
                var o = JSON.parse(xhr.getResponseText());
                if (typeof(o) == "undefined")
                BCC.Log.error("Unable to evaluate object from payload", "BCC.Connection.onmessage");
                else {
                    var e = me._createEventFromResponse(o);
                    me.onmessage(e);
                }
            };
            var a = command.getCommandAction();
            var p = command.getCommandAsPath();
            var u = BCC.Util.getBccUrl(this.restUrl, p);
            xhr.open(a, u, true);
            xhr.send();
        }
    };

    /**
     * Creates a Stream Tokenizer to consume the Web Streaming Feed
     * @private
     */
    this._createTokenizer = function() {
        this.tokenizer = new BCC.StreamTokenizer();
        var me = this;
        this.tokenizer.setCallback(
        function(data) {
            var e = me._createEventFromResponse(data);
            me.onmessage(e);
        });
    };

    /**
     * Checks if Socket Support is available
     * @returns {boolean}
     * @private
     */
    this._socketSupport = function() {
        if (BCC.FORCE_PUSH_STREAM) {
            return false;
        }

        if (this.mode == BCC.WEBSOCKET || this.mode == BCC.FLASHSOCKET)
        return true;
        else
        return false;
    };

    /**
     * Checks if Web Socket Support is available
     * @private
     * @returns {boolean}
     */
    this._isWebSocket = function() {
        if (BCC.FORCE_PUSH_STREAM) {
            return false;
        }

        //Hardcoded
        //return false;
        if (this.mode != BCC.FLASHSOCKET && (window.WebSocket || window.MozWebSocket))
        return true;
        else
        return false;
    };

    /**
     * Checks if Flash Socket Support is available
     * @private
     * @returns {boolean}
     */
    this._isFlashSocket = function() {
        if (BCC.FORCE_PUSH_STREAM) {
            return false;
        }

        //Hardcoded
        //return false;
        if (this.mode == BCC.FLASHSOCKET)
        return true;
        else if (this.mode == null && swfobject.getFlashPlayerVersion().major >= 10)
        return true;
        else
        return false;
    };

    /**
     * Checks for the socket and web streaming support and loads the librairies (only for Flash Sockets)
     * @private
     */
    this._loadSocket = function() {
        if (this._isWebSocket()) {
            BCC.Log.debug("WebSocket support available", "BCC.Connection.constructor");
            this.mode = BCC.WEBSOCKET;
            this.socketReady = true;
        }
        else if (this._isFlashSocket()) {
            BCC.Log.debug("FlashSocket support available", "BCC.Connection.constructor");
            this.mode = BCC.FLASHSOCKET;
            if (!BCC.Connection.FlashSocketLoaded) {
                this.socket = {};
                // set to non-null while it loads
                this._loadFlashSocket();
            } else {
                this.socketReady = true;
            }
        }
        else {
            // no socket support at all
            BCC.Log.debug("Socket support not available", "BCC.Connection.constructor");
            BCC.Log.debug("Falling back to Web Streaming", "BCC.Connection.constructor");
            this.mode = BCC.STREAMORPOLL;
            // BCC.Ajax will throw an error if it turns out this isn't even supported
            this.socket = null;
            this._createTokenizer();
        }
    };

    /**
     * Injects the FLXHR libraries dynamically
     * @private
     */
    this._loadFlashSocket = function() {
        var flashscript = document.createElement('SCRIPT');
        var headNode = document.getElementsByTagName('HEAD');
        var me = this;

        flashscript.type = 'text/javascript';
        flashscript.src = BCC.FLASH_SOCKET_SWF_PATH;
        flashscript.async = true;

        flashscript.onreadystatechange = function() {
            if (this.readyState == 'loaded' || this.readyState == 'complete') {
                me.socketReady = true;
                BCC.Connection.FlashSocketLoaded = true;
                if (me.needsOpening) me._doSocketOpen();
            }
        };
        if (flashscript.readyState == null) {
            flashscript.onload = function() {
                me.socketReady = true;
                BCC.Connection.FlashSocketLoaded = true;
                if (me.needsOpening) me._doSocketOpen();
            };
            flashscript.onerror = function() {
            	BCC.Log.error("Fatal error. Cannot inject dependancy lib (flashsocket)", "BCC.Connection._loadFlashSocket");
            };
        }
        if (headNode[0] != null) headNode[0].appendChild(flashscript);
    };

    /**
     * Stops the heartbeat
     * @private
     */
    this._stopHeartbeat = function() {
        if (this.hbTimerHandler != null)
        clearTimeout(this.hbTimerHandler);
    };

    /**
     * Sends the heartbeat over the socket
     * @private
     */
    this._sendHeartbeat = function() {
        var me = this;
        if (this.socket != null) {
            this.socket.send(BCC.HEART_BEAT_STRING);
            BCC.Log.info("Heartbeat Sent", "BCC.Connection.sendHeartbeat");
            this.hbTimerHandler = setTimeout(function() {
                me._sendHeartbeat();
            },
            this.hbCycle);
        }
    };

    /**
     * Opens the socket and registers the various event handlers
     * @private
     */
    this._doSocketOpen = function() {
        var WebSocket = window.WebSocket || window.MozWebSocket;
        BCC.Log.info("Socket connect initiated...", "BCC.Connection._doSocketOpen");

        this.socket = new WebSocket(this.wsUrl + "?sid=" + this.sid);
        var me = this;
        this.socket.onopen = function(event) {
            BCC.Log.info("Connection opened.", "BCC.Connection.socket.onopen");
            me.ready = true;
            me._sendHeartbeat();
            if (me.onopen != null)
            me.onopen();
        };
        this.socket.onclose = function(event) {
            if (me.closeInitiated) {
                BCC.Log.info("Connection closed.", "BCC.Connection.socket.onclose");
                me.closeInitiated = false;
                if (me.onclose != null)
                me.onclose();
            } else {
                me._stopHeartbeat();
                BCC.Log.info("Connection Error.", "BCC.Connection.socket.onclose");
                if (me.onerror != null)
                me.onerror();
            }
        };
        this.socket.onmessage = function(event) {
            if (me.onmessage != null) {
                var o = event.data;
                if ("undefined" == typeof(o)) {
                    BCC.Log.error("Unable to evaluate object from payload", "BCC.Connection.socket.onmessage");
                } else {
                    var e = me._createEventFromResponse(o);
                    me.onmessage(e);
                }
            }
        };
    };

    /**
     * Opens the Web Streaming/Long Poll and registers the various event handlers
     * @private
     */
    this._doStreamOpen = function() {
        var me = this;
        var pushEndPoint;
        //Hardcoded to Long Poll
        //this.streamingSupport = false;
        if (this.streamingSupport == null || this.streamingSupport == true)
        pushEndPoint = this.streamUrl;
        else
        pushEndPoint = this.longPollUrl;
        pushEndPoint += "&sid=" + this.sid;
        BCC.Log.info("Streaming to " + pushEndPoint, "_doStreamOpen");
        this.soFar = 0;

        if (this.xhr == null) {
            this.xhr = new BCC.Ajax();
            this.xhr.onload = function() {
                if (me.streamingSupport)
                me._handleOnProgressData(me.xhr);
                else
                me._handleOnLoadData(me.xhr);
                BCC.Log.debug("Reconnecting to Push Stream", "BCC.Connection._doStreamOpen");
                me._doStreamOpen();
            };
            if (this.streamingSupport == null || this.streamingSupport == true) {
                this.xhr.onprogress = function() {
                    if (me.streamingSupport == null) {
                        if (me.xhr.getResponseText() == null) {
                            BCC.Log.debug("Web Streaming not supported", "BCC.Connection._doStreamOpen");
                            BCC.Log.debug("Aborting and restarting as Long Poll", "BCC.Connection._doStreamOpen");
                            me.streamingSupport = false;
                            me._closeStream();
                            me._doStreamOpen();
                        } else {
                            BCC.Log.debug("Web Streaming supported", "BCC.Connection._doStreamOpen");
                            me._handleOnProgressData(me.xhr);
                            me.streamingSupport = true;
                        }
                    } else {
                        me._handleOnProgressData(me.xhr);
                    }
                };
            }
            this.xhr.onerror = function() {
                /*BCC.Log.error("Stream Error : Reconnecting to Push Stream","BCC.Connection._doStreamOpen");
                setTimeout (function(){me._doStreamOpen();}, 2000); //Reconnects after 2 seconds : Failure
                 */
                if (me.onerror != null)
                setTimeout(me.onerror, 0);
            };
        }
        this.xhr.open("POST", pushEndPoint, true);
        this.xhr.send();
    };

    /**
     * Handles the data inconsistency in readystate 3
     * @private
     */
    this._handleOnProgressData = function(xhr) {
        if ( !! !xhr) {
            BCC.Log.error("Cannot process xhr response data for null xhr", "BCC.Connection._handleOnProgressData");
            return;
        }

        var responseText = xhr.getResponseText();
        this.tokenizer.appendData(responseText.substr(this.SoFar));
        this.SoFar = responseText.length;
    };

    /**
     * Handles the data in readystate 4
     * @private
     */
    this._handleOnLoadData = function(xhr) {
        var responseText = xhr.getResponseText();
        this.tokenizer.resetBuffer();
        this.tokenizer.appendData(responseText);
    };

    /**
     * Closes the Web Streaming/Long Poll loop
     * @private
     */
    this._closeStream = function() {
        if (this.xhr != null) {
            this.xhr.abort();
            this.xhr = null;
        }
    };

    /**
     * Creates an event (BCC.Event) from the server response
     * @return {BCC.Event}
     * @private
     */
    this._createEventFromResponse = function(json) {
        BCC.Log.info(JSON.stringify(json), "BCC.Connection._createEventFromResponse");

        var evt = null;

        if ("object" == typeof(json)) {
            evt = json;
        } else if ("string" == typeof(json)) {
            try {
                evt = JSON.parse(json);
            } catch(ex) {
                BCC.Log.error(ex);
            }
        }

        return new BCC.Event(evt.eventType, evt.eventKey, evt.msg);
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
     * Single Listener event fired when the connection receives a message
     * @name BCC.Connection#onmessage
     * @event
     */

    /** 
     * Single Listener event fired when there is a connection error 
     * @name BCC.Connection#onerror
     * @event
     */
};
BCC.Connection.FlashSocketLoaded = false;