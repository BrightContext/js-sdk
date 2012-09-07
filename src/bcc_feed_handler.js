//-----------------------------------------------------------------
// Copyright 2012 BrightContext Corporation
//
// Licensed under the MIT License defined in the 
// LICENSE file.  You may not use this file except in 
// compliance with the License.
//-----------------------------------------------------------------

BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

/**
 * @class The object that handles the sending of messages over a feed   
 * @constructor
 * @param {object} feedSettings
 * @private
 */
BCC.FeedHandler = function(feedSettings) {
	this.feedSettings = feedSettings;
	this.lastMsg = null;
	this.cycleHandler = null;
	this.activeUserCycleInprogress = false;
	this.msgPending = false;
	this.msgQueue = [];
	/**
	 * Returns the feedSettings JSON
	 * @returns {object} feedSettings JSON
	 */
	this.getFeedSettings = function() {
		return this.feedSettings;
	};

	/**
	 * Sends the message over the feed
	 * @param {object} msg  
	 * @param {BCC.Feed} feed 
	 * @param {BCC.Connection} conn 
	 * @param {boolean} cycleTriggered Flag that indicates if the method is invoked automatically as part of the active user cycle
	 */
	this.sendMsg = function(msg, feed, conn, cycleTriggered){
		if(!!this.msgPending){
			BCC.Log.info("Message queued." ,"BCC.FeedHandler.sendMsg");
			this.msgQueue.push({"msg": msg, "feed" : feed, "conn": conn, "cycleTriggered" : cycleTriggered});
			return false;
		}
		if(!!BCC.ContextInstance.getValidateMessagesFlag()){
			var error = this._checkMsgContract(msg);
			if(!!error){
				var event = new BCC.Event("onerror", BCC.EventDispatcher.getObjectKey(feed), "Message contract not honored. " + error);
				BCC.EventDispatcher.dispatch(event);
				return false;
			}
		}
		
		var state = this._getMsgState(cycleTriggered);

		var command = this._prepareCommand(msg, feed, state);
		state = (!!command && !!command.parameters  && !!command.parameters.metadata) ? command.parameters.metadata.state : state;
		
		if(!!command){
			if(state == BCC.STATE_INITIAL || state == BCC.STATE_REVOTE){
				this.msgPending = true;
			}
			command.send(conn);

			if(state == BCC.STATE_INITIAL && this.feedSettings.activeUserFlag){
				var me = this;
				this.activeUserCycleInprogress = true;
				BCC.Log.info("Active User Cycle (" + this.feedSettings.activeUserCycle + " secs) Started" ,"BCC.FeedHandler.sendMsg");
				this.cycleHandler = setTimeout(function(){
					me._activeUserCycle(conn);
				}, this.feedSettings.activeUserCycle*1000);
			}
		}
		return true;
	};

	/**
	 * Checks if the message adheres to the msgContract of the feed
	 * @private 
	 * @param {object} msg  
	 */
	this._checkMsgContract = function(msg){
        var hasErrors = false;
        var hasNumberErrors = false;
        var msgJson = null;
        try{
             msgJson = ("string" == typeof(msg)) ? JSON.parse(msg) : msg;	
        }
        catch(e){
            hasErrors = true;
        }
        if (!!hasErrors || "object" != typeof(msgJson)) {
			return "Cannot parse message to JSON";
		} else {
			var errorFields = ""; 
			for (var index=0; index<this.feedSettings.msgContract.length; index++) {
				var contractKey = this.feedSettings.msgContract[index].fieldName;
				var hasContractKey = Object.prototype.hasOwnProperty.call(msgJson, contractKey);
				if (!hasContractKey) {
					return "Message incomplete";
				}
				var fieldType = this.feedSettings.msgContract[index].fieldType;
				if(fieldType == "N"){
					hasNumberErrors = false;
					if(isNaN(parseFloat(msgJson[contractKey]))){
						hasNumberErrors = true;
					}
					if(!!!hasNumberErrors){
						var validType = this.feedSettings.msgContract[index].validType;
						if(validType == 1){//Min Max Validation
							var data = parseFloat(msgJson[contractKey]);
							var min = !isNaN(parseFloat(this.feedSettings.msgContract[index].min)) ? parseFloat(this.feedSettings.msgContract[index].min) : null;
							var max = !isNaN(parseFloat(this.feedSettings.msgContract[index].max)) ? parseFloat(this.feedSettings.msgContract[index].max) : null;
							
							if(min != null){
								if(data < min)
									hasNumberErrors = true;
							}

							if(max != null){
								if(data > max)
									hasNumberErrors = true;
									
							}
						}
					}
					if(!!hasNumberErrors){
						errorFields += contractKey + ", ";
					}
				} else if(fieldType == "D"){
					var dateVal = msgJson[contractKey];
					var ts = new Date(dateVal).getTime();
					if(ts === "undefined" || ts === null || isNaN(ts) || ts === 0){
						errorFields += contractKey + ", ";
					} 
				} else if(fieldType == "S"){
					if(typeof (msgJson[contractKey]) == "object")
						errorFields += contractKey + ", ";
				}
			}
			if(!!!errorFields)
				return null;
			else{
				errorFields = errorFields.substring(0, errorFields.length -2);
				return "Fields with errors : " + errorFields;
			}
		}
	};

	/**
	 * Starts the active user cycle timer
	 * @private
	 * @param {BCC.Connection} conn 
	 */
	this._activeUserCycle = function(conn){
		//if (this.lastMsg.ts >= (new Date().getTime() - this.feedSettings.goInactiveTime*1000)){
		if (BCC.ContextInstance.isUserActive() && (this.lastMsg != null && this.lastMsg.feed != null &&  this.lastMsg.feed.conn != null)){
				BCC.Log.info("Active User Cycle In Progress." ,"BCC.FeedHandler._activeUserCycle");
				this.sendMsg(this.lastMsg.msg, this.lastMsg.feed, conn, true);
				var me = this;
				this.cycleHandler = setTimeout(function(){me._activeUserCycle(conn);}, this.feedSettings.activeUserCycle*1000);
		} else {
			this.cycleHandler = null;
			this.activeUserCycleInprogress = false;
			this.lastMsg = null;
			BCC.Log.info("Active User Cycle Expires" ,"BCC.FeedHandler._activeUserCycle");
		}
	};

	/**
	 * Converts the message(JSON) to a command (BCC.Command) 
	 * @private
	 * @param {object} msg 
	 * @param {BCC.Feed} feed
	 * @param {string} state INITIAL/UPDATE/REVOTE
	 */
	this._prepareCommand = function(msg, feed, state) {
		var msgJson = ("string" == typeof(msg)) ? JSON.parse(msg) : msg;
		
		var origMsg = {};
		for (var key in msgJson) {
			origMsg[key] = msgJson[key];
		}
		
		// manipulate the message guts when using active user feed
		try {
			var activeUserFields = this.feedSettings.activeUserFields;
			
			for (var index=0; index<this.feedSettings.msgContract.length; index++) {
				var contractKey = this.feedSettings.msgContract[index].fieldName;
				var hasContractKey = Object.prototype.hasOwnProperty.call(msgJson, contractKey);
				if (hasContractKey) {
					var isActiveField = false;
					for (var i in activeUserFields) {
						if(contractKey == activeUserFields[i]){
							isActiveField = true;
							break;
						}
					}
					if(isActiveField)
						continue;

					// fix dates
					var dt = this.feedSettings.msgContract[index].fieldType;
					if (dt == "D") {
						msgJson[contractKey] = new Date(msgJson[contractKey]).getTime();
					}
					 
					// test for dimension shift
					if (BCC.STATE_UPDATE == state) {
						var oldValue = this.lastMsg.msg[contractKey];
						var newValue = msgJson[contractKey];
						if (oldValue != newValue) {
							clearTimeout(this.cycleHandler);
							state = BCC.STATE_INITIAL;
						}
					}

				}
			}

			// adjust values if we are still doing an update
			if (BCC.STATE_UPDATE == state) {
				for (var k in activeUserFields) {
					var activeUserFieldName = activeUserFields[k];
					var msgHasProp = Object.hasOwnProperty.call(msgJson, activeUserFieldName);
					var lastMsgHasProp = Object.hasOwnProperty.call(this.lastMsg.msg, activeUserFieldName);
					
					if (msgHasProp && lastMsgHasProp) {
						msgJson[activeUserFieldName] = msgJson[activeUserFieldName] - this.lastMsg.msg[activeUserFieldName];
					}
				}
			}
		} catch(e){
			var msgError = new BCC.Event("onerror", BCC.EventDispatcher.getObjectKey(feed), "Message has errors. Not sent.");
			BCC.EventDispatcher.dispatch(msgError);
			return null;	// bail
		}
		
		// test write protection
		if (this.feedSettings.writeKeyFlag) {
			if (!feed.writeKey) {
				var writeKeyError = new BCC.Event("onerror",
				 BCC.EventDispatcher.getObjectKey(feed),
				 "Feed is write protected, but write key was not assigned.  Message cannot be sent.");
				BCC.EventDispatcher.dispatch(writeKeyError);
				return null;	// bail
			}
		}
		
		this.lastMsg = this.lastMsg == null ? {} : this.lastMsg;
		this.lastMsg.msg = origMsg;
		this.lastMsg.feed = feed;
		
		var command = new BCC.Command("POST", "/feed/message/create.json", {
			"message" : msgJson
		});
		
		var md = {
			feedKey: feed.getFeedKey()
		};
		if (undefined !== state) {
			md.state = state;
		}
		if(state == BCC.STATE_UPDATE){
			md.utslot = this.lastMsg.ts;
		}
		if(feed.writeKey != null){
			md.writeKey = feed.writeKey;
		}

		command.addParam({ "metadata" : md });
		
		var me = this;
		command.onresponse = function(err){
			var response = typeof err == "string" ? JSON.parse(err) : err;
			if(response != null && response.tslot != null){
				if(state == BCC.STATE_INITIAL || state == BCC.STATE_REVOTE){
					me.lastMsg.ts = response.tslot;
					me.msgPending = false;
					me._popMsgQueue();
				}
			}
			var onmsgevt = new BCC.Event("onmsgsent", BCC.EventDispatcher.getObjectKey(feed), msgJson);
			BCC.EventDispatcher.dispatch(onmsgevt);
		};
		command.onerror = function(err) {
			var onerrorevent = new BCC.Event("onerror", BCC.EventDispatcher.getObjectKey(feed), err);
			BCC.EventDispatcher.dispatch(onerrorevent);
		};
		return command;
	};
	
	/**
	 * Pops and sends messages from the msgQueue
	 * @private
	 */
	this._popMsgQueue = function(){
		for(var index in this.msgQueue){
			var msgObj = this.msgQueue[index];
			this.sendMsg(msgObj.msg, msgObj.feed, msgObj.conn, msgObj.cycleTriggered);
			BCC.Log.info("Message sent from queue : " + JSON.stringify(msgObj.msg),"BCC.FeedHandler._popMsgQueue");
		}
		this.msgQueue = [];
	};

	/**
	 * Identifies the state of the message  
	 * @private
	 * @param {boolean} cycleTriggered Flag that indicates if the method is invoked automatically as part of the active user cycle
	 * @returns {string} INITIAL/UPDATE/REVOTE
	 */
	this._getMsgState = function(cycleTriggered) {
		if (!this.feedSettings.activeUserFlag) {
			// without an active user flag, no such thing as 'state'
			return undefined;
		} else {
			// otherwise, figure it out based on cycle flags
			if (!this.activeUserCycleInprogress) {
				return BCC.STATE_INITIAL;
			} else {
				if (!!cycleTriggered) {
					return BCC.STATE_REVOTE;
				} else {
					return BCC.STATE_UPDATE;
				}
			}
		}
	};
};