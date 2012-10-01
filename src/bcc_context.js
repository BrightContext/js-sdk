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
BCC.Context = function() {
    this.session = null;
    this.conn = null;
    this._stmtMap = null;
    this.feedRegistry = null;
    this.reconnectAttempts = 0;
    this.activityFlag = true;
    this.validateMessagesFlag = true;
    
    /**
     * Called by the constructor to initialize the object 
     * @private
     */
    this._init = function() {
    
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

    /** Called after initialization once we have an api key
     * @private
     */
    this._initSession = function(apiKey) {
        this._apiKey = apiKey;
        this.session = new BCC.Session(apiKey);
        this._stmtMap = [];
        this.feedRegistry = new BCC.FeedRegistry();
        var me = this;
        this.session.onsync = function() {
            me.reconnectAttempts = 0;
            me.conn = null;
            me._createConnection(function(){me._reRegisterAllFeeds();});
        };
        this.session.open();
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
     * This method sends the command over the connection if the connection is ready
     * Otherwise the command send is cached in the dependency map
     *     
     * @param {BCC.Command} command
     *
     * @private
     */
    this.sendCommand = function(command) {
        var me = this;
        if (this.conn == null) {
            this._runStatement(function() {
                me._createConnection(function() {
                    me.conn.send(command);
                });
            },
            this.session);
        } else {
            this._runStatement(function() {
                me.conn.send(command);
            },
            this.conn);
        }
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
     * Opens a feed that was manually created using <code>var f = new Feed(...)</code>.
     * There is no need to call this method if a feed was opened using <code>project.feed(...)</code>.
     * @param {BCC.Feed} feed
     */
    this.openFeed = function(feed) {
        var me = this;
        var feedSettings = this.feedRegistry.getLoadedFeed(feed);

        if (feedSettings == null) {
            // no existing feed matching the key -- so we need to open it with the server.
            if (this.conn == null) {
                this._runStatement(function() {
                    me._createConnection(function() {
                        feed.open(me.conn, me.feedRegistry);
                    });
                },
                this.session);
            } else {
                this._runStatement(function() {
                    feed.open(me.conn, me.feedRegistry);
                },
                this.conn);
            }
        } else {
            // feed matching the same feeKey already exists... so reload the new feed with existing loaded feedSettings
            feed.reloadFeedSettings(feedSettings);
            feed.conn = this.conn;
            this.feedRegistry.registerFeed(feed);
            var openEvent = new BCC.Event("onopen", BCC.EventDispatcher.getObjectKey(feed), feed);
            BCC.EventDispatcher.dispatch(openEvent);
            // trigger onOpen for all listeners
        }
    };

    /**
     * Closes a feed that was manually created using <code>new Feed(...)</code> and opened using <code>openFeed</code>.
     * Any feed opened using <code>project.feed(...)</code> can be closed simply by
     * calling <code>close()</code> on that opened feed instance.
     * @param {BCC.Feed} feed
     * @see BCC.Feed#close
     */
    this.closeFeed = function(feed) {
        if (this.feedRegistry.getFeedCount(feed) > 1) {
            this._unregisterFeed(feed);
            var closeEvent = new BCC.Event("onclose", BCC.EventDispatcher.getObjectKey(feed), null);
            BCC.EventDispatcher.dispatch(closeEvent);
            
            BCC.EventDispatcher.unregister(feed.id, feed);
            BCC.EventDispatcher.unregister(feed.feedSettings.feedKey, feed);
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

    /**
     * This method accepts a statement and a dependency object. 
     * If the dependency object is ready the statement is executed immediately
     * Otherwise the statement is queued and executed onready of the dependency object    
     *   
     * @private
     * @param {function} stmt The function/statement that gets executed
     * @param {object} waitsFor The dependency object that makes the function/statement wait
     */
    this._runStatement = function(stmt, waitsFor) {
        if (waitsFor.ready) {
            stmt();
        } else {
            var dep = this._getDependencyFromMap(waitsFor);
            if (dep == null) {
                this._stmtMap.push(new BCC.Dependency(stmt, waitsFor));
            } else {
                dep.addStatement(stmt);
            }

            if (waitsFor.onopen == null) {
                var me = this;
                waitsFor.onopen = function() {
                    //Reset reconnectAttempts when connection is established
                    //Check to distinguish BCC.Connection from BCC.Session
                    if (!me._apiKey) {
                        me.reconnectAttempts = 0;
                    }
                    me._dispatchStatements(this);
                };
            }
        }
    };

    /**
     * This method dispatches the queued statements    
     *   
     * @private
     * @param {object} waitsFor The dependency object that is ready  
     */
    this._dispatchStatements = function(waitsFor) {
        var dep = this._getDependencyFromMap(waitsFor);
        for (var index in dep.stmts) {
            dep.stmts[index]();
        }
        dep.stmts.splice(0, dep.stmts.length);
    };

    /**
     * This method returns the dependency and its queued statements from the map
     *   
     * @private
     * @param {object} waitsFor The dependency object  
     */
    this._getDependencyFromMap = function(waitsFor) {
        if (waitsFor.id !== null) {
            for (var index in this._stmtMap) {
                if (this._stmtMap[index].depId == waitsFor.id)
                return this._stmtMap[index];
            }
        }
    };

    /**
     * This method creates a connection object and queues the statement for execution 
     *   
     * @private
     * @param {function} stmt The function/statement that gets executed after the connection is made
     */
    this._createConnection = function(stmt) {
        if (this.conn == null) {
            this.conn = new BCC.Connection(this.session, 45);
            this.conn.onmessage = function(event) {
                //BCC.Log.info("Message received over connection : " + JSON.stringify(event),"BCC.Context.conn.onmessage");
                BCC.EventDispatcher.dispatch(event);
            };

            var me = this;
            this.conn.onerror = function(err) {
                if ("function" == typeof(me.onerror)) {
                    me.onerror(err);
                }

                me._tryToReconnect();
            };
            this.conn.open();
        }

        if (stmt != null) {
            this._runStatement(stmt, this.conn);
        }
    };

    /** Reconnect after 5 secs
     * @private
     */
    this._tryToReconnect = function() {
        var me = this;
        setTimeout(function() {
            ++me.reconnectAttempts;
            if (me.reconnectAttempts <= BCC.MAX_RECONNECTS) {
                BCC.Log.debug("Connection Error : Reconnecting (" + me.reconnectAttempts + ")", "BCC.Context.conn.onerror");
                me.conn.open();
            } else {
                BCC.Log.debug("Reconnects failed. Trying to resync the session with the server", "BCC.Context.conn.onerror");
                me.session.syncWithServer();
            }
        },
        5000);
    };

    this._init();
};

/**
 * BCC.Dependency : The dependancy class that hold the statement queue for a dependency object
 * @constructor 
 * @param {function} stmt
 * @param {object} waitsFor BCC.Connection or BCC.Session 
 * @private
 */

BCC.Dependency = function(stmt, waitsFor) {
    this.stmts = null;
    this.depId = null;

    /**
     * Called by the constructor to initialize the object 
     * @private
     */
    this._init = function() {
        this.stmts = [];
        this.stmts.push(stmt);
        this.depId = this._getObjectId(waitsFor);
    };

    /**
     * Creates and assigns an id for the dependency object
     * @param {object} waitsFor The dependency object
     * @private
     */
    this._getObjectId = function(waitsFor) {
        if (waitsFor.id == null) waitsFor.id = new Date().getTime() + Math.floor(Math.random() * 1000);
        return waitsFor.id;
    };

    /**
     * Adds a statement to the queue
     * @param {function} stmt The statement that gets added to the queue
     */
    this.addStatement = function(stmt) {
        this.stmts.push(stmt);
    };

    this._init();
};

/**
 * Initializes a new context session.  Currently there can be only one context session with one connection at a time on any given page.  Thus, only plan on calling init once per page load with the proper api key, as any second call to init will dispose of the old context.
 * @param {string} apiKey API Key configured in the management console.
 * @returns {BCC.Context} Newly initialized context instance that can be used to open projects and feeds
 * @see BCC.Context
 */
BCC.init = function(apiKey) {
    BCC.Log.debug("Initializing context with api key " + apiKey);
    if (!!BCC.ContextInstance) {
        BCC.Log.debug("BCC.ContextInstance already available. Cleaning up the old instance");
        if(!!BCC.ContextInstance.conn)
             BCC.ContextInstance.conn.close();
        var registeredFeeds = BCC.ContextInstance.feedRegistry.getAllFeeds();
        if(!!registeredFeeds && registeredFeeds.length > 0){
            for(var index = 0; index < registeredFeeds.length; index++){
                var feedObj = registeredFeeds[index];
                var closeEvent = new BCC.Event("onclose", BCC.EventDispatcher.getObjectKey(feedObj), feedObj);
                BCC.EventDispatcher.dispatch(closeEvent);
            }
        }
    }
    BCC.ContextInstance = new BCC.Context();
    BCC.ContextInstance._initSession(apiKey);
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

