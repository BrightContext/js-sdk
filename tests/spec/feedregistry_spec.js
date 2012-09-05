describe("feed registry", function() {
		var keys = function(o) {
			var a = [];
			for (var k in o) { a.push(k); }
			return a;
		};
	
		it ("should give accurate key counts", function() {
			var feedMapKeys = null;
			var r = new BCC.FeedRegistry();
			
			expect(r.feedMap).not.toBeNull();
			expect(r.feedMap).not.toBeUndefined();
			
			feedMapKeys = keys(r.feedMap);
			expect(feedMapKeys.length).toEqual(0);
			
			var procId = 0;
			var filters = {};
			var f1 = new BCC.Feed(procId, filters);
			
			expect(f1.feedHandler).toBeNull();
			
			r.registerFeed(f1);

			expect(f1.feedHandler).not.toBeNull();
			expect(f1.feedHandler).not.toBeUndefined();
			expect(typeof(f1.feedHandler)).toBe("object");
			
			expect(keys(r.feedMap).length).toEqual(1);
			
			var f2 = new BCC.Feed(procId, filters);

			expect(f2.settings).toEqual(f1.settings);
			expect(f2.feedHandler).toBeNull();
			
			r.registerFeed(f2);
			
			expect(f2.feedHandler).not.toBeNull();
			expect(f2.feedHandler).not.toBeUndefined();
			expect(typeof(f2.feedHandler)).toBe("object");
			expect(f2.feedHandler).toEqual(f1.feedHandler);	// same settings, same handler
			
			feedMapKeys = keys(r.feedMap);
			expect(feedMapKeys.length).toEqual(1);	// same settings, should still be 1
			
			var feedItem = r.feedMap[feedMapKeys[0]];
			expect(typeof(feedItem)).toBe("object");
			expect(feedItem.getFeedCount()).toEqual(2);
			
			var f3 = new BCC.Feed(procId, {"a":"b"});
			expect(f3.settings).toEqual(f1.settings);
			expect(f3.feedHandler).toBeNull();
			
			r.registerFeed(f3);
			
			expect(f3.feedHandler).not.toBeNull();
			expect(f3.feedHandler).not.toBeUndefined();
			expect(typeof(f3.feedHandler)).toBe("object");
			expect(f3.feedHandler).not.toEqual(f1.feedHandler);	// different handler because of different settings
			
			feedMapKeys = keys(r.feedMap);
			expect(feedMapKeys.length).toEqual(2);	// different settings, should go up
			
			var feedItem1 = r.feedMap[feedMapKeys[0]];
			var feedItem2 = r.feedMap[feedMapKeys[1]];
			expect(typeof(feedItem1)).toBe("object");
			expect(feedItem1.getFeedCount()).toEqual(2);
			expect(typeof(feedItem2)).toBe("object");
			expect(feedItem2.getFeedCount()).toEqual(1);
			
			r.unRegisterFeed(f3);
			expect(feedItem2.getFeedCount()).toEqual(0);

			feedMapKeys = keys(r.feedMap);
			expect(feedMapKeys.length).toEqual(1);
			
			r.unRegisterFeed(f2);
			expect(feedItem2.getFeedCount()).toEqual(0);
			expect(feedItem1.getFeedCount()).toEqual(1);
			
			feedMapKeys = keys(r.feedMap);
			expect(feedMapKeys.length).toEqual(1);
			
			r.unRegisterFeed(f1);
			expect(feedItem2.getFeedCount()).toEqual(0);
			expect(feedItem1.getFeedCount()).toEqual(0);
			
			feedMapKeys = keys(r.feedMap);
			expect(feedMapKeys.length).toEqual(0);
		});
		
		it ("should return right feed objects", function() {
			var r = new BCC.FeedRegistry();
			var procId = 0;
			var filters = null;
			var f1 = new BCC.Feed(procId, filters);
			r.registerFeed(f1);
			expect(r.feedMap["0"].feedObjects[BCC.EventDispatcher.getObjectKey(f1)]).not.toBeNull();
			expect(r.feedMap["0"].feedObjects[BCC.EventDispatcher.getObjectKey(f1)]).not.toBeUndefined();
			expect(typeof r.feedMap["0"].feedObjects[BCC.EventDispatcher.getObjectKey(f1)]).toBe("object");
			expect(r.getAllFeeds().length).toEqual(1);
			expect(r.getAllUniqueFeeds().length).toEqual(1);
			expect(r.getAllFeedsForKey(f1).length).toEqual(1);
			
			var f2 = new BCC.Feed(procId, filters);
			r.registerFeed(f2);
			expect(r.feedMap["0"].feedObjects[BCC.EventDispatcher.getObjectKey(f2)]).not.toBeNull();
			expect(r.feedMap["0"].feedObjects[BCC.EventDispatcher.getObjectKey(f2)]).not.toBeUndefined();
			expect(typeof r.feedMap["0"].feedObjects[BCC.EventDispatcher.getObjectKey(f2)]).toBe("object");
			expect(r.getAllFeeds().length).toEqual(2);
			expect(r.getAllUniqueFeeds().length).toEqual(1);
			expect(r.getAllFeedsForKey(f1).length).toEqual(2);
			expect(r.getAllFeedsForKey(f2).length).toEqual(2);

			var f3 = new BCC.Feed(procId, filters);
			r.registerFeed(f3);
			expect(r.feedMap["0"].feedObjects[BCC.EventDispatcher.getObjectKey(f3)]).not.toBeNull();
			expect(r.feedMap["0"].feedObjects[BCC.EventDispatcher.getObjectKey(f3)]).not.toBeUndefined();
			expect(typeof r.feedMap["0"].feedObjects[BCC.EventDispatcher.getObjectKey(f3)]).toBe("object");
			expect(r.getAllFeeds().length).toEqual(3);
			expect(r.getAllUniqueFeeds().length).toEqual(1);
			expect(r.getAllFeedsForKey(f1).length).toEqual(3);
			expect(r.getAllFeedsForKey(f2).length).toEqual(3);
			expect(r.getAllFeedsForKey(f3).length).toEqual(3);
			
			r.unRegisterFeed(f3);
			expect(r.feedMap["0"].feedObjects[BCC.EventDispatcher.getObjectKey(f3)]).toBeUndefined();
			expect(r.getAllFeeds().length).toEqual(2);
			expect(r.getAllUniqueFeeds().length).toEqual(1);
			expect(r.getAllFeedsForKey(f1).length).toEqual(2);
			expect(r.getAllFeedsForKey(f2).length).toEqual(2);
			

			r.unRegisterFeed(f2);
			expect(r.feedMap["0"].feedObjects[BCC.EventDispatcher.getObjectKey(f2)]).toBeUndefined();
			expect(r.getAllFeeds().length).toEqual(1);
			expect(r.getAllUniqueFeeds().length).toEqual(1);
			expect(r.getAllFeedsForKey(f1).length).toEqual(1);
			
			r.unRegisterFeed(f1);
			expect(r.getAllFeeds()).toBeNull();
			expect(r.getAllUniqueFeeds()).toBeNull();
			expect(r.getAllFeedsForKey(f1)).toBeNull();
		});
});