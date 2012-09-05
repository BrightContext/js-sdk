//-----------------------------------------------------------------
// Copyright 2012 BrightContext Corporation
//
// Licensed under the MIT License defined in the 
// LICENSE file.  You may not use this file except in 
// compliance with the License.
//-----------------------------------------------------------------

BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

/**
 * @class The object that stores the feed settings to avoid server fetching (if feed is already available)    
 * @constructor
 * @private
 */
BCC.FeedRegistry = function() {
	this.feedMap = null;

	/**
	 * Called by the constructor to initialize the object 
	 * @private
	 */
	this._init = function(){
		this.feedMap = {};
	};

	/**
	 * Returns all the feeds in the registry
	 */
	this.getAllFeeds = function(){
		var feedsArray = [];
		for(var key in this.feedMap){
			var feedObjects = this.feedMap[key].feedObjects;
			for(var objKey in feedObjects){
				feedsArray.push(feedObjects[objKey]);
			}
		}
		return feedsArray.length > 0 ? feedsArray : null; 
	};

	/**
	 * Returns all the unique feeds in the registry
	 */
	this.getAllUniqueFeeds = function(){
		var feedsArray = [];
		for(var key in this.feedMap){
			var feedObjects = this.feedMap[key].feedObjects;
			for(var objKey in feedObjects){
				feedsArray.push(feedObjects[objKey]);
				break;
			}
		}
		return feedsArray.length > 0 ? feedsArray : null;
	};
	
	/**
	 * Returns all the feeds with the same key as the feed in the registry
	 */
	this.getAllFeedsForKey = function(feed){
		var feedsArray = [];
		var fs = feed.getFeedSettings();
		var key = this._generateKey(fs);
		var feedObjects = !!(this.feedMap[key]) ? this.feedMap[key].feedObjects : null;
		if(!!feedObjects){
			for(var objKey in feedObjects){
				feedsArray.push(feedObjects[objKey]);
			}
		}
		return feedsArray.length > 0 ? feedsArray : null;
	};

	/**
	 * Registers a feed. 
	 * If the feed item is not available in the map, a new feed item is created
	 * Otherwise the existing feed count is incremented
	 * @param {BCC.Feed} feed
	 */
	this.registerFeed = function(feed) {
		var fs = feed.getFeedSettings();
		var key = this._generateKey(fs);
		if(this.feedMap[key] == null)
			this.feedMap[key] = new BCC.FeedItem(feed);
		else{
			feed.setFeedHandler(this.feedMap[key].feedHandler);
			this.feedMap[key].addFeed(feed);
		}
	};
	/**
	 * Unregisters a feed. 
	 * If the feed item is available in the map, the feed count is decremented
	 * If the feed count is "0", the feedItem is removed from the map
	 *  
	 * @param {BCC.Feed} feed
	 */
	this.unRegisterFeed = function(feed) {
		var fs = feed.getFeedSettings();
		var key = this._generateKey(fs);
		this.feedMap[key].removeFeed(feed);
		if(this.feedMap[key].getFeedCount() === 0)
			delete this.feedMap[key];
	};

	/**
	 * If the feed item is available in the map, the feed settings is returned
	 * @param {BCC.Feed} feed
	 */
	this.getLoadedFeed = function(feed) { // returns the feedSettings for a feed matching the feedkey of the feed that was passed in
		var fs = feed.getFeedSettings();
		var key = this._generateKey(fs);
		if(this.feedMap != null && this.feedMap[key] != null)
			return this.feedMap[key].feedHandler.getFeedSettings();
	};

	/**
	 * If the feed item is available in the map, the feed handler is returned
	 * @param {BCC.Feed} feed 
	 */
	this.getFeedHandler = function(feed) { // returns the feedSettings for a feed matching the feedkey of the feed that was passed in
		var fs = feed.getFeedSettings();
		var key = this._generateKey(fs);
		if(this.feedMap != null && this.feedMap[key] != null)
			return this.feedMap[key].feedHandler;
	};

	/**
	 * Checks if the feed item is available in the map
	 * @param {BCC.Feed} feed
	 */
	this.feedExists = function(feed) { // checks if there is already a loaded feed matching this feed's feedkey 
		var fs = feed.getFeedSettings();
		var key = this._generateKey(fs);
		return (this.feedMap[key] != null);
	};

	/**
	 * Returns the number of feed items available in the map
	 * @param {BCC.Feed} feed
	 */
	this.getFeedCount = function(feed) {
		var fs = feed.getFeedSettings();
		var key = this._generateKey(fs);
		return this.feedMap[key].getFeedCount;
	};

	/**
	 * Checks if the FeedResistry is empty
	 */
	this.isEmpty = function() {
		var size = 0;
		for (var key in this.feedMap) {
			if (this.feedMap.hasOwnProperty(key)) size++;
		}
		return (size === 0);
	};

	/**
	 * Generate a unique key based on the procId and the filters
	 * @returns {string}
	 * @private
	 */
	this._generateKey = function(fs){
		var keyArray = [];
		var fk = "";
		for(var key in fs.filters){
			keyArray.push(key);
		}
		keyArray.sort();
		for(var index in keyArray){
			fk += keyArray[index] + fs.filters[keyArray[index]];
		}
		fk = fs.procId + fk;
		return fk;
	};

	this._init();
};

/**
 * The object that gets stored in the feedRegistry    
 * @constructor
 * @param {BCC.Feed} feed 
 * @private
 */
BCC.FeedItem = function(feed){
	this.count = 1;
	this.feedHandler = new BCC.FeedHandler(feed.getFeedSettings());
	this.feedObjects = {};
	this.feedObjects[BCC.EventDispatcher.getObjectKey(feed)] = feed;
	feed.setFeedHandler(this.feedHandler);

	/**
	 * Increments the feed count
	 */
	this.addFeed = function(feedObj){
		this.feedObjects[BCC.EventDispatcher.getObjectKey(feedObj)] = feedObj;
		this.count++;		
	};
	/**
	 * Decrements the feed count
	 */
	this.removeFeed = function(feedObj){
		delete this.feedObjects[BCC.EventDispatcher.getObjectKey(feedObj)];
		this.count--;
	};
	/**
	 * Returns the feed count
	 * @returns {int} count
	 */
	this.getFeedCount = function(){
		return this.count;
	};
};