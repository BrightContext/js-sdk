BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

/**
 * @class The object that handles the sending of messages over a feed   
 * @constructor
 * @param {JSON} feedSettings
 * @private
 */
BCC.FeedHandler = function(feedSettings) {
	this.feedSettings = feedSettings;
	this.lastMsg = null;
	this.cycleHandler = null;
	this.activeUserCycleInprogress = false;

	/**
	 * Returns the feedSettings JSON
	 * @returns {object} feedSettings JSON
	 */
	this.getFeedSettings = function() {
		return this.feedSettings;
	};

	/**
	 * Sends the message over the feed
	 * @param {JSON} msg  
	 * @param {BCC.Feed} feed 
	 * @param {BCC.Connection} conn 
	 * @param {boolean} cycleTriggered Flag that indicates if the method is invoked automatically as part of the active user cycle
	 */
	this.sendMsg = function(msg, feed, conn, cycleTriggered){
		if(!!BCC.ContextInstance.getValidateMessagesFlag() && !this._checkMsgContract(msg)){
			var event = new BCC.Event("onerror", BCC.EventDispatcher.getObjectKey(feed), "Message contract not honored");
			BCC.EventDispatcher.dispatch(event);
			return false;
		}
		
		var state = this._getMsgState(cycleTriggered);

		var command = this._prepareCommand(msg, feed, state);
		if(!!command){
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
	 * @param {JSON} msg  
	 */
	this._checkMsgContract = function(msg){
		var msgJson = ("string" == typeof(msg)) ? JSON.parse(msg) : msg;
		if ("object" != typeof(msgJson)) {
			return false;
		} else {
			for (var index=0; index<this.feedSettings.msgContract.length; index++) {
				var contractKey = this.feedSettings.msgContract[index].fieldName;
				var hasContractKey = Object.prototype.hasOwnProperty.call(msgJson, contractKey);
				if (!hasContractKey) {
					return false;
				}
				var fieldType = this.feedSettings.msgContract[index].fieldType;
				if(fieldType == "N"){
					if(typeof msgJson[contractKey] != "number")
						return false;
					/*if(isNaN(msgJson[contractKey]))
					return false;*/
					var validType = this.feedSettings.msgContract[index].validType;
					if(validType == 1){//Min Max Validation
						var data = parseFloat(msgJson[contractKey]);
						var min = !isNaN(parseFloat(this.feedSettings.msgContract[index].min)) ? parseFloat(this.feedSettings.msgContract[index].min) : null;
						var max = !isNaN(parseFloat(this.feedSettings.msgContract[index].max)) ? parseFloat(this.feedSettings.msgContract[index].max) : null;
						
						if(min != null){
							if(data < min)
								return false;
						}

						if(max != null){
							if(data > max)
								return false;
						}
					}
				} else if(fieldType == "D"){
					var dateVal = msgJson[contractKey];
					if(typeof dateVal != "object")
						return false;
					else if(typeof dateVal == "object" && typeof dateVal.getTime != "function")
						return false;
				} else if(fieldType == "S"){
					if(typeof msgJson[contractKey] != "string")
						return false;
				}
			}
			return true;
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
	 * @param {JSON} msg 
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
		try{
			if (BCC.STATE_UPDATE == state) {
				var activeUserFields = this.feedSettings.activeUserFields;
				for (var k in activeUserFields) {
					var activeUserFieldName = activeUserFields[k];
					var msgHasProp = Object.hasOwnProperty.call(msgJson, activeUserFieldName);
					var lastMsgHasProp = Object.hasOwnProperty.call(this.lastMsg.msg, activeUserFieldName);
					
					if (msgHasProp && lastMsgHasProp) {
						msgJson[activeUserFieldName] = msgJson[activeUserFieldName] - this.lastMsg.msg[activeUserFieldName];
					}
				}
			}
			
			for (var index=0; index<this.feedSettings.msgContract.length; index++) {
				var contractKey = this.feedSettings.msgContract[index].fieldName;
				var hasContractKey = Object.prototype.hasOwnProperty.call(msgJson, contractKey);
				if(hasContractKey){
					var dt = this.feedSettings.msgContract[index].fieldType;
					if(dt == "D"){
						msgJson[contractKey] = msgJson[contractKey].getTime();
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
		
		this.lastMsg = this.lastMsg == null ? new Object() : this.lastMsg;
		this.lastMsg.msg = origMsg;
		this.lastMsg.feed = feed;
		
		var command = new BCC.Command("POST", "/feed/message/create.json", {
			"message" : msgJson
		});
		
		var md = {
			feedKey: feed.getFeedKey()
		};
		if (undefined != state) {
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
				}
			}
			var onmsgevt = new BCC.Event("onmsgsent", BCC.EventDispatcher.getObjectKey(feed), msgJson);
			BCC.EventDispatcher.dispatch(onmsgevt);
		};
		command.onerror = function(err) {
			var onerrorevent = new BCC.Event("onerror", BCC.EventDispatcher.getObjectKey(feed), err);
			BCC.EventDispatcher.dispatch(onerrorevent);
		}
		return command;
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