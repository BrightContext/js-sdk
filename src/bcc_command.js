//-----------------------------------------------------------------
// Copyright 2012 BrightContext Corporation
//
// Licensed under the MIT License defined in the 
// LICENSE file.  You may not use this file except in 
// compliance with the License.
//-----------------------------------------------------------------

BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

/**
 * @class The BCC event oriented Command object. BCC.Command encapsulates XHR, XDomainRequest and FLXHR for cross domain calls
 * @param {string} method		"POST" or "GET"
 * @param {string} cmdString  /path/to/api.json
 * @param {object} parameters  {param1:value1, param2:value2, ..}
 * @private
 */
BCC.Command = function(method, cmdString, parameters) {
	this.action = method;
	this.cmd = cmdString;
	this.parameters = parameters;

	/**
	 * Called by the constructor to initialize the object 
	 * @private
	 */
	this._init = function(){
		if(cmdString == null){
			BCC.Log.error("Command String missing.","BCC.Command.constructor");
			return false;
		}
		return true;
	};

	/**
	 * Adds parameters to the object
	 * @param {object} param  {<param1>:<value1>, <param2>:<value2>, ..}
	 */
	this.addParam = function(param){
		if(this.parameters == null)
			this.parameters = {};
		for(var key in param) {
			this.parameters[key] = param[key];
		}
	};
	
	/*
	 * Check for command objects
	 */
	this.isCommand = function(){
		return true;
	};

	/**
	 * Adds a listener to the object
	 * @param {object} listenerObj BCC event oriented object 
	 */
	this.addListener = function(listenerObj) {
		BCC.EventDispatcher.register(BCC.EventDispatcher.getObjectKey(this), listenerObj);
	};

	/**
	 * Removes a listener from the object
	 * @param {object} listenerObj BCC event oriented object 
	 */
	this.removeListener = function(listenerObj) {
		BCC.EventDispatcher.unregister(BCC.EventDispatcher.getObjectKey(this), listenerObj);
	};

	/**
	 * Returns the command as a JSON String
	 * @returns {string} The JSON string corresponding to the BCC.Command 
	 */
	this.getCommandAsMessage = function() {
		var cmdname = this.action + " " + BCC.API_COMMAND_ROOT + this.cmd;
		
		var cmdJson = {cmd: cmdname};
		if(this.parameters != null)
			cmdJson.params = this.parameters;
		
		return JSON.stringify(cmdJson);
	};

	/**
	 * Returns the command as a URL Path
	 * @returns {string} The path string corresponding to the BCC.Command
	 */
	this.getCommandAsPath = function() {
		var url = this.cmd.substr(this.cmd.indexOf("/"));
		var cmd = url;
		var index = 0;

		var paramstring = JSON.stringify(this.parameters);
		cmd += "?params=" + escape(paramstring);

		return BCC.API_COMMAND_ROOT + cmd;
	};

	/**
	 * Returns the command action
	 * @returns {string} action
	 */
	this.getCommandAction = function() {
		return this.action;
	};

	/**
	 * Sends the command over the connection
	 * @param {BCC.Connection} connection 
	 */
	this.send = function(connection) {
			connection.send(this);
	};

	this._init();
	
	/**
	 * Fired on server response to the command send
	 * @name BCC.Command#onresponse
	 * @event
	 */
};