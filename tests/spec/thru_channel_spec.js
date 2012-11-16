describe("thru channel", function() {
	var ctx = null, p = null;

	var feedOpened = false;
	var messageSent = false;
	var messageReceived = false;
	var message = null;
	
	beforeEach(function(){
		BCC_TEST.begin(this);

		BCC.Env.FORCE_WEBSOCKETS_OFF = false;
		BCC.Env.FORCE_FLASHSOCKETS_OFF = false;
		BCC.Env.FORCE_STREAMING_OFF = false;

		ctx = BCC.init(BCC_TEST.VALID_API_KEY);
		expect(typeof(ctx)).toBe("object");
		
		p = ctx.project(BCC_TEST.TEST_PROJECT);
		expect(typeof(p)).toBe("object");
	});
	
	afterEach(function(){
		BCC_TEST.closeContextAndWait(ctx);

		BCC_TEST.end(this);
	});

	it("can send and receive messages", function() {
		var msg = { msg: { key1: 1, key2: "two" } };
		testThruUseCase(BCC_TEST.THRU_CHANNEL, 'default', undefined, msg);
	});

	it("can send and receive messages with rest", function() {
		BCC.Env.FORCE_WEBSOCKETS_OFF = true;
		BCC.Env.FORCE_FLASHSOCKETS_OFF = true;
		BCC.Env.FORCE_STREAMING_OFF = false;

		var msg = { msg: { key1: 1, key2: "two" } };
		testThruUseCase(BCC_TEST.THRU_CHANNEL, 'default', undefined, msg);
	});

	it("is readonly when write key is not supplied", function() {
		var msg = { msg: { key1: 1, key2: "two" } };

		var thruHandler = new BCC_TEST.Listener();
		p.feed({
			channel: BCC_TEST.THRU_CHANNEL_PROTECTED,
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
			return (1 == thruHandler.errors.length);
		},"send error", BCC_TEST.TIMEOUT);
		
		runs(function(){
			// should fail to send when write key is not provided
			expect(thruHandler.errors.length).toEqual(1);
			expect(thruHandler.out_messages.length).toEqual(0);

			thruHandler.f.close();
		});
		
		waitsFor(function() {
			return (1 == thruHandler.closes);
		}, "feed close", BCC_TEST.TIMEOUT);
		
		runs(function() {
			expect(thruHandler.f.isClosed()).toEqual(true);
		});

	});

	it("is readwrite when write key is supplied", function() {
		var msg = { msg: { key1: 1, key2: "two" } };
		testThruUseCase(BCC_TEST.THRU_CHANNEL_PROTECTED, 'default', BCC_TEST.THRU_CHANNEL_PROTECTED_WRITEKEY, msg);
	});

	var testThruUseCase = function(channel, subchannel, writekey, msg) {
		var thruHandler = new BCC_TEST.Listener();
		p.feed({
			channel: channel,
			name: subchannel,
			writekey: writekey,
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