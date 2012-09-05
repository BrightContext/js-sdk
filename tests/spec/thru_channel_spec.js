describe("thru channel", function() {
	var feedOpened = false;
	var messageSent = false;
	var messageReceived = false;
	var message = null;
	
	beforeEach(function(){
		ctx = BCC.init(BCC_TEST.VALID_API_KEY);
		expect(typeof(ctx)).toBe("object");
		
		p = ctx.project(BCC_TEST.TEST_PROJECT);
		expect(typeof(p)).toBe("object");
	});
	
	afterEach(function(){
		var allFeeds = ctx.feedRegistry.getAllFeeds();
		for (var i in allFeeds) {
			var f = allFeeds[i];
			ctx.closeFeed(f);
		}
		
		waitsFor(function() {
			return (null == ctx.conn);
		}, BCC_TEST.TIMEOUT);
	});

	it("feed open", function() {
		var thruHandler = new BCC_TEST.Listener();
		p.feed({
			channel: BCC_TEST.THRU_CHANNEL,
			onopen: thruHandler.onopen,
			onclose: thruHandler.onclose,
			onmsgreceived: thruHandler.onmsgreceived,
			onmsgsent: thruHandler.onmsgsent,
			onerror: thruHandler.onerror
		});
		
		waitsFor(function() {
			return (1 == thruHandler.opens);
		},"feed open", BCC_TEST.TIMEOUT);
	
		runs(function() {
			expect(thruHandler.f).not.toBeNull();
			expect(thruHandler.f).not.toBeUndefined();
			expect(typeof thruHandler.f).toBe("object");
			expect(thruHandler.f.isOpen()).toEqual(true);
			thruHandler.f.close();
		});
	
		waitsFor(function() {
			return (1 == thruHandler.closes);
		}, "feed close", BCC_TEST.TIMEOUT);
	
		runs(function() {
			expect(thruHandler.f.isClosed()).toEqual(true);
		});

	});
	
	it("string message over thru feed", function() {
		var msg = {msg:"Hello"};
		testThruUseCase(msg);
	});

	it("array message over thru feed", function() {
		var msg = {msg: [1,2,3]};
		testThruUseCase(msg);
	});

	it("json message over thru feed", function() {
		var json = {key1: "value1", key2: "value2"};
		var msg = {msg: json};
		testThruUseCase(msg);
	});

	var testThruUseCase = function(msg){
		var thruHandler = new BCC_TEST.Listener();
		p.feed({
			channel: BCC_TEST.THRU_CHANNEL,
			onopen: thruHandler.onopen,
			onclose: thruHandler.onclose,
			onmsgreceived: thruHandler.onmsgreceived,
			onmsgsent: thruHandler.onmsgsent,
			onerror: thruHandler.onerror
		});
		
		waitsFor(function() {
			return (1 == thruHandler.opens);
		},"feed open", BCC_TEST.TIMEOUT);
	
		runs(function() {
			expect(thruHandler.f).not.toBeNull();
			expect(thruHandler.f).not.toBeUndefined();
			expect(typeof thruHandler.f).toBe("object");
			expect(thruHandler.f.isOpen()).toEqual(true);
			thruHandler.f.send(msg);
		});
	
		waitsFor(function() {
			return (1 == thruHandler.out_messages.length);
		},"feed message sent", BCC_TEST.TIMEOUT);
		
		runs(function(){
			var message = thruHandler.out_messages[0];
			expect(message).not.toBeNull();
			expect(message.msg).not.toBeNull();
			expect(message).not.toBeUndefined();
			expect(message.msg).not.toBeUndefined();
			expect(message.msg).toEqual(msg.msg);
		});
		
		waitsFor(function() {
			return (1 == thruHandler.in_messages.length);
		},"feed message received", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function(){
			var message = thruHandler.in_messages[0];
			expect(message).not.toBeNull();
			expect(message.msg).not.toBeNull();
			expect(message).not.toBeUndefined();
			expect(message.msg).not.toBeUndefined();
			expect(message.msg).toEqual(msg.msg);
			thruHandler.f.close();
		});
		
		waitsFor(function() {
			return (1 == thruHandler.closes);
		}, "feed close", BCC_TEST.TIMEOUT);
	
		runs(function() {
			expect(thruHandler.f.isClosed()).toEqual(true);
		});
	};
});