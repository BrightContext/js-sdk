describe("context", function() {
	it("allows adjusting message contract validation on the instance", function() {
		var ctx = new BCC.Context();
		
		ctx.setValidateMessagesOn();
		expect(ctx.validateMessagesFlag).toBe(true);
		
		ctx.setValidateMessagesOff();
		expect(ctx.validateMessagesFlag).toBe(false);
	});
	
	it("allows adjusting message contract validation statically", function() {
		var ctx = BCC.init(BCC_TEST.VALID_API_KEY);
		expect(BCC.ContextInstance.validateMessagesFlag).toBe(true);
		
		BCC.fieldMessageValidation(false);
		expect(BCC.ContextInstance.validateMessagesFlag).toBe(false);
		
		BCC.fieldMessageValidation(true);
		expect(BCC.ContextInstance.validateMessagesFlag).toBe(true);
	});

	it("closes old feeds when init is called twice", function() {
		var thru_feed_name =  'unprotected thru',
				ctx1, ctx2, p1, p2, listener1, listener2;

		listener1 = new BCC_TEST.Listener();
		listener2 = new BCC_TEST.Listener();


		// initialize first context, open a feed
		ctx1 = BCC.init(BCC_TEST.VALID_API_KEY);
		expect(typeof(ctx1)).toBe("object");
		
		p1 = ctx1.project(BCC_TEST.TEST_PROJECT);
		expect(typeof(p1)).toBe("object");
		
		p1.feed({
			channel: thru_feed_name,
			onopen: listener1.onopen,
			onclose: listener1.onclose,
			onmsgreceived: listener1.onmsgreceived,
			onmsgsent: listener1.onmsgsent,
			onerror: listener1.onerror
		});
		
		waitsFor(function() {
			return (1 === listener1.opens);
		}, "feed open", BCC_TEST.TIMEOUT);
		
		runs(function() {
			expect(listener1.opens).toEqual(1);
			expect(listener1.closes).toEqual(0);
		});
		
		runs(function(){
			listener1.f.close();
		});
		
		waitsFor(function() {
			return (1 === listener1.closes);
		}, "feed close", BCC_TEST.TIMEOUT);
		
		runs(function() {
			expect(listener1.opens).toEqual(1);
			expect(listener1.closes).toEqual(1);
		});

		runs(function() {
			// initialize second context, without closing the first feed
			ctx2 = BCC.init(BCC_TEST.VALID_API_KEY);
			expect(typeof(ctx2)).toBe("object");
			
			p2 = ctx2.project(BCC_TEST.TEST_PROJECT);
			expect(typeof(p2)).toBe("object");
			
			p2.feed({
				channel: thru_feed_name,
				onopen: listener2.onopen,
				onclose: listener2.onclose,
				onmsgreceived: listener2.onmsgreceived,
				onmsgsent: listener2.onmsgsent,
				onerror: listener2.onerror
			});
		});
		
		waitsFor(function() {
			return (1 === listener2.opens);
		}, "feed open", BCC_TEST.TIMEOUT);
		
		runs(function() {
			expect(listener1.closes).toEqual(1);
			expect(listener2.opens).toEqual(1);
			expect(listener2.closes).toEqual(0);
		});
		
		runs(function(){
			listener2.f.close();
		});
		
		waitsFor(function() {
			return (1 === listener2.closes);
		}, "feed close", BCC_TEST.TIMEOUT);
		
		runs(function() {
			expect(listener2.opens).toEqual(1);
			expect(listener2.closes).toEqual(1);
		});
	});
	
});