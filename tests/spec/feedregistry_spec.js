describe("feed registry", function() {
	beforeEach(function () {
		BCC_TEST.begin(this);
	});

	afterEach(function () {
		BCC_TEST.end(this);
	});
	
	it ("should give accurate key counts", function() {
		var feedMapKeys = null;
		var r = new BCC.FeedRegistry();
		expect(r.isEmpty()).toBeTruthy();

		var metadata1 = {project: 'project 1', channel: 'channel 1', connector: 'default' };
		var metadata2 = {project: 'project 1', channel: 'channel 1', connector: 'sub channel 1' };
		var examplesettings1 = {"activeUserFields":[],"procId":38,"activeUserCycle":null,"state":"open","msgContract":[],"feedType":"THRU","writeKeyFlag":false,"activeUserFlag":false,"netId":1,"filters":{"subChannel":"default"},"procType":9,"goInactiveTime":null,"feedKey":"38~THRU~{\"subChannel\":\"default\"}"};
		var examplesettings2 = {"activeUserFields":[],"procId":38,"activeUserCycle":null,"state":"open","msgContract":[],"feedType":"THRU","writeKeyFlag":false,"activeUserFlag":false,"netId":1,"filters":{"subChannel":"sub channel 1"},"procType":9,"goInactiveTime":null,"feedKey":"38~THRU~{\"subChannel\":\"sub channel 1\"}"};
		
		expect(r.feedMap).not.toBeNull();
		expect(r.feedMap).not.toBeUndefined();
		
		feedMapKeys = BCC_TEST.keys(r.feedMap);
		expect(feedMapKeys.length).toEqual(0);
		
		var f1 = new BCC.Feed(metadata1);
		f1.settings = examplesettings1;	// inject settings as if it were opened by service

		expect(f1.getHandler()).toBeNull();
		
		r.registerFeed(f1);

		expect(f1.getHandler()).not.toBeNull();
		expect(f1.getHandler()).not.toBeUndefined();
		expect(typeof(f1.getHandler())).toBe("object");
		
		expect(BCC_TEST.keys(r.feedMap).length).toEqual(1);
		
		var f2 = new BCC.Feed(metadata2);
		f2.settings = examplesettings1;	// inject settings as if it were opened by service

		expect(f2.settings).toEqual(f1.settings);
		expect(f2.getHandler()).toBeNull();
		
		r.registerFeed(f2);
		
		expect(f2.getHandler()).not.toBeNull();
		expect(f2.getHandler()).not.toBeUndefined();
		expect(typeof(f2.getHandler())).toBe("object");
		expect(f2.getHandler()).toEqual(f1.getHandler());	// same settings, same handler
		
		feedMapKeys = BCC_TEST.keys(r.feedMap);
		expect(feedMapKeys.length).toEqual(1);	// same settings, should still be 1
		
		var feedItem = r.feedMap[feedMapKeys[0]];
		expect(typeof(feedItem)).toBe("object");
		expect(feedItem.getFeedCount()).toEqual(2);
		
		var f3 = new BCC.Feed(metadata2);
		f3.settings = examplesettings2;	// inject settings as if it were opened by service
		
		expect(f3.settings).not.toEqual(f1.settings);
		expect(f3.getHandler()).toBeNull();
		
		r.registerFeed(f3);
		
		expect(f3.getHandler()).not.toBeNull();
		expect(f3.getHandler()).not.toBeUndefined();
		expect(typeof(f3.getHandler())).toBe("object");
		expect(f3.getHandler()).not.toEqual(f1.getHandler());	// different handler because of different settings
		
		feedMapKeys = BCC_TEST.keys(r.feedMap);
		expect(feedMapKeys.length).toEqual(2);	// different settings, should go up
		
		var feedItem1 = r.feedMap[feedMapKeys[0]];
		var feedItem2 = r.feedMap[feedMapKeys[1]];
		expect(typeof(feedItem1)).toBe("object");
		expect(feedItem1.getFeedCount()).toEqual(2);
		expect(typeof(feedItem2)).toBe("object");
		expect(feedItem2.getFeedCount()).toEqual(1);
		
		r.unRegisterFeed(f3);
		expect(feedItem2.getFeedCount()).toEqual(0);

		feedMapKeys = BCC_TEST.keys(r.feedMap);
		expect(feedMapKeys.length).toEqual(1);
		
		r.unRegisterFeed(f2);
		expect(feedItem2.getFeedCount()).toEqual(0);
		expect(feedItem1.getFeedCount()).toEqual(1);
		
		feedMapKeys = BCC_TEST.keys(r.feedMap);
		expect(feedMapKeys.length).toEqual(1);
		
		r.unRegisterFeed(f1);
		expect(feedItem2.getFeedCount()).toEqual(0);
		expect(feedItem1.getFeedCount()).toEqual(0);
		
		feedMapKeys = BCC_TEST.keys(r.feedMap);
		expect(feedMapKeys.length).toEqual(0);

		expect(r.isEmpty()).toBeTruthy();
	});
	
	it ("returns correct feed objects", function() {
		var metadata1 = {project: 'project 1', channel: 'channel 1', connector: 'default' };
		var examplesettings1 = {"activeUserFields":[],"procId":38,"activeUserCycle":null,"state":"open","msgContract":[],"feedType":"THRU","writeKeyFlag":false,"activeUserFlag":false,"netId":1,"filters":{"subChannel":"default"},"procType":9,"goInactiveTime":null,"feedKey":"38~THRU~{\"subChannel\":\"default\"}"};
		var examplefeedmapkey = "38subChanneldefault";

		var r = new BCC.FeedRegistry();
		
		var f1 = new BCC.Feed(metadata1);
		f1.settings = examplesettings1;

		r.registerFeed(f1);

		expect(r.feedMap[examplefeedmapkey].feedObjects[BCC.EventDispatcher.getObjectKey(f1)]).not.toBeNull();
		expect(r.feedMap[examplefeedmapkey].feedObjects[BCC.EventDispatcher.getObjectKey(f1)]).not.toBeUndefined();
		expect(typeof r.feedMap[examplefeedmapkey].feedObjects[BCC.EventDispatcher.getObjectKey(f1)]).toBe("object");
		expect(r.getAllFeeds().length).toEqual(1);
		expect(r.getAllUniqueFeeds().length).toEqual(1);
		expect(r.getAllFeedsForKey(f1).length).toEqual(1);
		
		var f2 = new BCC.Feed(metadata1);
		f2.settings = examplesettings1;

		r.registerFeed(f2);

		expect(r.feedMap[examplefeedmapkey].feedObjects[BCC.EventDispatcher.getObjectKey(f2)]).not.toBeNull();
		expect(r.feedMap[examplefeedmapkey].feedObjects[BCC.EventDispatcher.getObjectKey(f2)]).not.toBeUndefined();
		expect(typeof r.feedMap[examplefeedmapkey].feedObjects[BCC.EventDispatcher.getObjectKey(f2)]).toBe("object");
		expect(r.getAllFeeds().length).toEqual(2);
		expect(r.getAllUniqueFeeds().length).toEqual(1);
		expect(r.getAllFeedsForKey(f1).length).toEqual(2);
		expect(r.getAllFeedsForKey(f2).length).toEqual(2);

		var f3 = new BCC.Feed(metadata1);
		f3.settings = examplesettings1;

		r.registerFeed(f3);

		expect(r.feedMap[examplefeedmapkey].feedObjects[BCC.EventDispatcher.getObjectKey(f3)]).not.toBeNull();
		expect(r.feedMap[examplefeedmapkey].feedObjects[BCC.EventDispatcher.getObjectKey(f3)]).not.toBeUndefined();
		expect(typeof r.feedMap[examplefeedmapkey].feedObjects[BCC.EventDispatcher.getObjectKey(f3)]).toBe("object");
		expect(r.getAllFeeds().length).toEqual(3);
		expect(r.getAllUniqueFeeds().length).toEqual(1);
		expect(r.getAllFeedsForKey(f1).length).toEqual(3);
		expect(r.getAllFeedsForKey(f2).length).toEqual(3);
		expect(r.getAllFeedsForKey(f3).length).toEqual(3);
		
		r.unRegisterFeed(f3);
		expect(r.feedMap[examplefeedmapkey].feedObjects[BCC.EventDispatcher.getObjectKey(f3)]).toBeUndefined();
		expect(r.getAllFeeds().length).toEqual(2);
		expect(r.getAllUniqueFeeds().length).toEqual(1);
		expect(r.getAllFeedsForKey(f1).length).toEqual(2);
		expect(r.getAllFeedsForKey(f2).length).toEqual(2);

		r.unRegisterFeed(f2);
		expect(r.feedMap[examplefeedmapkey].feedObjects[BCC.EventDispatcher.getObjectKey(f2)]).toBeUndefined();
		expect(r.getAllFeeds().length).toEqual(1);
		expect(r.getAllUniqueFeeds().length).toEqual(1);
		expect(r.getAllFeedsForKey(f1).length).toEqual(1);
		
		r.unRegisterFeed(f1);
		expect(r.getAllFeeds()).toBeNull();
		expect(r.getAllUniqueFeeds()).toBeNull();
		expect(r.getAllFeedsForKey(f1)).toBeNull();
	});

	it("can find feeds by metadata", function() {
		var metadata1 = {project: 'project 1', channel: 'channel 1', connector: 'default' };
		var examplesettings1 = {"activeUserFields":[],"procId":38,"activeUserCycle":null,"state":"open","msgContract":[],"feedType":"THRU","writeKeyFlag":false,"activeUserFlag":false,"netId":1,"filters":{"subChannel":"default"},"procType":9,"goInactiveTime":null,"feedKey":"38~THRU~{\"subChannel\":\"default\"}"};
		var examplefeedmapkey = "38subChanneldefault";

		var r = new BCC.FeedRegistry();
		
		var f1 = new BCC.Feed(metadata1);
		f1.settings = examplesettings1;

		r.registerFeed(f1);
		
		var found_feed = r.findFeedWithMetadata(metadata1);

		expect(found_feed).toBe(f1);
	});
});