describe("context", function() {
	var ctx = null;

	beforeEach(function(){
		BCC_TEST.begin(this);

		ctx = BCC.init(BCC_TEST.VALID_API_KEY);
	});

	afterEach(function(){
		BCC_TEST.closeContextAndWait(ctx);

		BCC_TEST.end(this);
	});

	it("allows adjusting message contract validation statically", function() {
		expect(BCC.ContextInstance.validateMessagesFlag).toBe(true);
		
		BCC.fieldMessageValidation(false);
		expect(BCC.ContextInstance.validateMessagesFlag).toBe(false);
		
		BCC.fieldMessageValidation(true);
		expect(BCC.ContextInstance.validateMessagesFlag).toBe(true);
	});

	it("allows adjusting message contract validation on the instance", function() {
		var local_ctx = new BCC.Context();
		
		local_ctx.setValidateMessagesOn();
		expect(local_ctx.validateMessagesFlag).toBe(true);
		
		local_ctx.setValidateMessagesOff();
		expect(local_ctx.validateMessagesFlag).toBe(false);
	});
	
	it("fetches server time", function() {
		var server_time = null,
				command_error = null;

		ctx.serverTime(function (t, err) {
			server_time = t;
			command_error = err;
		});

		waitsFor(function(argument) {
			return (!!server_time || !!command_error);
		}, "server time", BCC_TEST.TIMEOUT);

		runs(function() {
			expect(command_error).toBeUndefined();

			if (command_error) {
				BCC.Log.error(command_error, 'jasmine');
			}
			
			expect(server_time).not.toBeNull();
			expect("object").toBe(typeof(server_time));
			expect("number").toBe(typeof(server_time.getTime()));
		});
	});

	it("generates shared unique ids", function() {
		var uuid1 = null,
				uuid2 = null,
				command_error1 = null,
				command_error2 = null;

		ctx.sharedUuid(function (id, err) {
			uuid1 = id;
			command_error1 = err;
		});
		
		ctx.sharedUuid(function (id, err) {
			uuid2 = id;
			command_error2 = err;
		});
		
		waitsFor(function(argument) {
			return (
				(!!uuid2 || !!command_error2) &&
				(!!uuid1 || !!command_error1)
			);
		}, "uuids", BCC_TEST.TIMEOUT);
		
		runs(function() {
			expect(command_error1).toBeUndefined();
			expect(command_error2).toBeUndefined();

			expect("string").toBe(typeof(uuid1));
			expect(uuid1.length).toEqual(36);
			expect("string").toBe(typeof(uuid2));
			expect(uuid2.length).toEqual(36);
			expect(uuid1).not.toEqual(uuid2);
		});
	});

	it("generates local unique ids", function() {
		var uuid1 = null, uuid1_result = null,
				uuid2 = null, uuid2_result = null,
				command_error1 = null,
				command_error2 = null;

		uuid1_result = ctx.uuid(function (id, err) {
			uuid1 = id;
			command_error1 = err;
		});
		
		uuid2_result = ctx.uuid(function (id, err) {
			uuid2 = id;
			command_error2 = err;
		});
		
		waitsFor(function(argument) {
			return (
				(!!uuid2 || !!command_error2) &&
				(!!uuid1 || !!command_error1)
			);
		}, "uuids", BCC_TEST.TIMEOUT);
		
		runs(function() {
			expect(command_error1).toBeUndefined();
			expect(command_error2).toBeUndefined();

			expect("string").toBe(typeof(uuid1));
			expect(uuid1.length).toEqual(36);
			expect("string").toBe(typeof(uuid2));
			expect(uuid2.length).toEqual(36);
			
			expect(uuid1).not.toEqual(uuid2);
			
			expect(uuid1).toBe(uuid1_result);
			expect(uuid2).toBe(uuid2_result);
		});
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

	it("closes connection when all the feeds are closed", function() {
		var ctx, p, listener1, listener2;

		listener1 = new BCC_TEST.Listener();
		listener2 = new BCC_TEST.Listener();

		// initialize first context, open a feed
		ctx = BCC.init(BCC_TEST.VALID_API_KEY);
		expect(typeof(ctx)).toBe("object");
		
		p = ctx.project(BCC_TEST.TEST_PROJECT);
		expect(typeof(p)).toBe("object");
		
		p.feed({
			channel: 'unprotected thru',
			onopen: listener1.onopen,
			onclose: listener1.onclose,
			onmsgreceived: listener1.onmsgreceived,
			onmsgsent: listener1.onmsgsent,
			onerror: listener1.onerror
		});

		waitsFor(function() {
			return (1 === listener1.opens);
		}, "feed 1 open", BCC_TEST.TIMEOUT);
		
		runs(function() {
			expect(listener1.opens).toEqual(1);
			expect(listener1.closes).toEqual(0);

			expect(ctx).not.toBeUndefined();
			expect(ctx).not.toBeNull();
			expect(ctx.conn).not.toBeUndefined();
			expect(ctx.conn).not.toBeNull();
			expect(ctx.conn.endpoint.isClosed()).toBeFalsy();
		});
		
		runs(function(){
			p.feed({
				channel: 'protected thru',
				onopen: listener2.onopen,
				onclose: listener2.onclose,
				onmsgreceived: listener2.onmsgreceived,
				onmsgsent: listener2.onmsgsent,
				onerror: listener2.onerror
			});
		});

		waitsFor(function() {
			return (1 === listener2.opens);
		}, "feed 1 open", BCC_TEST.TIMEOUT);
		
		runs(function() {
			expect(listener2.opens).toEqual(1);
			expect(listener2.closes).toEqual(0);

			expect(ctx).not.toBeUndefined();
			expect(ctx).not.toBeNull();
			expect(ctx.conn).not.toBeUndefined();
			expect(ctx.conn).not.toBeNull();
			expect(ctx.conn.endpoint.isClosed()).toBeFalsy();
		});

		runs(function() {
			listener1.f.close();
		});

		waitsFor(function() {
			return (1 === listener1.closes);
		}, "feed 1 close", BCC_TEST.TIMEOUT);

		runs(function() {
			expect(listener1.opens).toEqual(1);
			expect(listener1.closes).toEqual(1);
		});

		runs(function() {
			listener2.f.close();
		});

		waitsFor(function() {
			return (1 === listener2.closes);
		}, "feed 2 close", BCC_TEST.TIMEOUT);

		runs(function() {
			expect(listener1.opens).toEqual(1);
			expect(listener1.closes).toEqual(1);
			expect(listener2.opens).toEqual(1);
			expect(listener2.closes).toEqual(1);
		});

		waitsFor(function(argument) {
			return (ctx.conn.isClosed());
		}, 'close settling');

		runs(function() {
			expect(ctx).not.toBeUndefined();
			expect(ctx).not.toBeNull();
			expect(ctx.conn).not.toBeUndefined();
			expect(ctx.conn).not.toBeNull();
			expect(ctx.conn.isClosed()).toBeTruthy();
			expect(ctx.conn.endpoint).not.toBeUndefined();
			expect(ctx.conn.endpoint).not.toBeNull();
			expect(ctx.conn.endpoint.isClosed()).toBeTruthy();
		});
		
	});

	it("reconnects with the same endpoint when feeds are opened, closed, then opened again", function() {
		var ctx, p, listener;

		runs(function() {
			ctx = BCC.init(BCC_TEST.VALID_API_KEY);
			expect(typeof(ctx)).toBe("object");
			
			p = ctx.project(BCC_TEST.TEST_PROJECT);
			expect(typeof(p)).toBe("object");

			listener = new BCC_TEST.Listener();
		});

		runs(function() {
			p.feed({
				channel: 'unprotected thru',
				onopen: listener.onopen,
				onclose: listener.onclose,
				onmsgreceived: listener.onmsgreceived,
				onmsgsent: listener.onmsgsent,
				onerror: listener.onerror
			});
		});

		waitsFor(function(argument) {
			return (0 !== listener.opens);
		}, 'first open');

		runs(function() {
			listener.f.close();
		});

		waitsFor(function(argument) {
			return (ctx.conn.isClosed());
		}, 'close settling');

		runs(function() {
			expect(ctx).not.toBeUndefined();
			expect(ctx).not.toBeNull();
			expect(ctx.conn).not.toBeUndefined();
			expect(ctx.conn).not.toBeNull();
			expect(ctx.conn.isClosed()).toBeTruthy();
			expect(ctx.conn.endpoint).not.toBeUndefined();
			expect(ctx.conn.endpoint).not.toBeNull();
			expect(ctx.conn.endpoint.isClosed()).toBeTruthy();
		});

		runs(function() {
			listener.reset();

			p.feed({
				channel: 'unprotected thru',
				onopen: listener.onopen,
				onclose: listener.onclose,
				onmsgreceived: listener.onmsgreceived,
				onmsgsent: listener.onmsgsent,
				onerror: listener.onerror
			});
		});

		waitsFor(function(argument) {
			return (0 !== listener.opens);
		}, 'second open');

		runs(function() {
			expect(ctx).not.toBeUndefined();
			expect(ctx).not.toBeNull();
			expect(ctx.conn).not.toBeUndefined();
			expect(ctx.conn).not.toBeNull();
			expect(ctx.conn.getMetrics().get('reconnect')).toEqual(1);
			expect(ctx.conn.endpoint).not.toBeUndefined();
			expect(ctx.conn.endpoint).not.toBeNull();
			expect(ctx.conn.endpoint.isClosed()).toBeFalsy();
		});

	});
	
});