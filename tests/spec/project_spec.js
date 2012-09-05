describe("project", function() {
	var thru_feed_name = 'unprotected thru';
	
	var protected_feed = {
		channel: 'protected thru',
		writekey: 'b9a9b7fa6645a0ea'
	};

	it("should open and close", function() {
		var ctx = BCC.init(BCC_TEST.VALID_API_KEY);
		expect(typeof(ctx)).toBe("object");
	
		var p = ctx.project(BCC_TEST.TEST_PROJECT);
		expect(typeof(p)).toBe("object");
	
		var listener = new BCC_TEST.Listener();
		p.feed({
			channel: thru_feed_name,
			onopen: listener.onopen,
			onclose: listener.onclose,
			onmsgreceived: listener.onmsgreceived,
			onmsgsent: listener.onmsgsent,
			onerror: listener.onerror
		});
	
		waitsFor(function() {
			return (1 == listener.opens);
		}, "feed open", BCC_TEST.TIMEOUT);
	
		runs(function() {
			expect(listener.opens).toEqual(1);
			expect(listener.closes).toEqual(0);
		});
		
		runs(function(){
			listener.f.close();
		});
	
		waitsFor(function() {
			return (1 == listener.closes);
		}, "feed close", BCC_TEST.TIMEOUT);
	
		runs(function() {
			expect(listener.opens).toEqual(1);
			expect(listener.closes).toEqual(1);
		});
	});
	
	it("should support two listeners to the same feed", function() {
		var ctx = BCC.init(BCC_TEST.VALID_API_KEY);
		expect(typeof(ctx)).toBe("object");
	
		var p = ctx.project(BCC_TEST.TEST_PROJECT);
		expect(typeof(p)).toBe("object");
		
		var listener1 = new BCC_TEST.Listener();
		var listener2 = new BCC_TEST.Listener();
		p.feed({
			channel: thru_feed_name,
			onopen: listener1.onopen,
			onclose: listener1.onclose,
			onmsgreceived: listener1.onmsgreceived,
			onmsgsent: listener1.onmsgsent,
			onerror: listener1.onerror
		});
		
		p.feed({
			channel: thru_feed_name,
			onopen: listener2.onopen,
			onclose: listener2.onclose,
			onmsgreceived: listener2.onmsgreceived,
			onmsgsent: listener2.onmsgsent,
			onerror: listener2.onerror
		});
		
	
		waitsFor(function() {
			return (0 !== listener1.opens) && (0 !== listener2.opens);
		}, "feed open", BCC_TEST.TIMEOUT);
	
		runs(function() {
			expect(listener1.opens).toEqual(1);
			expect(listener1.closes).toEqual(0);
			expect(listener2.opens).toEqual(1);
			expect(listener2.closes).toEqual(0);
		});
		
		runs(function(){
			listener1.f.close();
			listener2.f.close();
		});
	
		waitsFor(function() {
			return (
				(0 !== listener1.closes) && (0 !== listener2.closes)
			);
		}, "feed close", BCC_TEST.TIMEOUT);
	
		runs(function() {
			expect(listener1.opens).toEqual(1);
			expect(listener1.closes).toEqual(1);
			expect(listener2.opens).toEqual(1);
			expect(listener2.closes).toEqual(1);
		});
	});

	it("should support both mixed case and all lowercase of writeKey parameter", function() {
		var ctx = BCC.init(BCC_TEST.VALID_API_KEY);
		expect(typeof(ctx)).toBe("object");
		
		var p = ctx.project(BCC_TEST.TEST_PROJECT);
		expect(typeof(p)).toBe("object");
		
		var listener1 = new BCC_TEST.Listener();
		var listener2 = new BCC_TEST.Listener();

		// lowercase
		p.feed({
			channel: protected_feed.channel,
			writekey: protected_feed.writekey,
			onopen: listener1.onopen,
			onclose: listener1.onclose,
			onmsgreceived: listener1.onmsgreceived,
			onmsgsent: listener1.onmsgsent,
			onerror: listener1.onerror
		});

		waitsFor(function(argument) {
			return (0 !== listener1.opens);
		}, 'lowercase feed open', BCC_TEST.TIMEOUT);

		runs(function() {
			expect(listener1.opens).toEqual(1);
			expect(listener1.closes).toEqual(0);
			expect(listener1.errors.length).toEqual(0);

			listener1.f.send({ 'lowercase': 'ok' });
		});

		waitsFor(function(argument) {
			return (0 !== listener1.out_messages.length);
		}, 'lowercase feed send', BCC_TEST.TIMEOUT);

		runs(function() {
			expect(listener1.out_messages.length).toEqual(1);
			expect(listener1.errors.length).toEqual(0);

			listener1.f.close();
		});

		waitsFor(function(argument) {
			return (0 !== listener1.closes);
		}, 'lowercase feed close', BCC_TEST.TIMEOUT);

		runs(function() {
			expect(listener1.opens).toEqual(1);
			expect(listener1.closes).toEqual(1);
			expect(listener1.errors.length).toEqual(0);

			// mixed case
			p.feed({
				channel: protected_feed.channel,
				writeKey: protected_feed.writekey,
				onopen: listener2.onopen,
				onclose: listener2.onclose,
				onmsgreceived: listener2.onmsgreceived,
				onmsgsent: listener2.onmsgsent,
				onerror: listener2.onerror
			});
		});

		waitsFor(function(argument) {
			return (0 !== listener2.opens);
		}, 'mixed case feed open', BCC_TEST.TIMEOUT);

		runs(function() {
			expect(listener2.opens).toEqual(1);
			expect(listener2.closes).toEqual(0);
			expect(listener2.errors.length).toEqual(0);

			listener2.f.send({ 'mixed case' : 'ok' });
		});

		waitsFor(function(argument) {
			return (0 !== listener2.out_messages.length);
		}, 'mixed case feed send', BCC_TEST.TIMEOUT);

		runs(function() {
			expect(listener2.out_messages.length).toEqual(1);
			expect(listener2.errors.length).toEqual(0);

			listener2.f.close();
		});

		waitsFor(function(argument) {
			return (0 !== listener2.closes);
		}, 'mixed case feed close', BCC_TEST.TIMEOUT);

		runs(function() {
			expect(listener2.opens).toEqual(1);
			expect(listener2.closes).toEqual(1);
			expect(listener2.errors.length).toEqual(0);
		});
	});
	
});