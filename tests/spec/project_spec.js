describe("project", function() {
	var thru_feed_name,
			protected_feed;

	thru_feed_name = 'unprotected thru';
	
	protected_feed = {
		channel: 'protected thru',
		writekey: 'b9a9b7fa6645a0ea'
	};

	beforeEach(function () {
		BCC_TEST.begin(this);
	});

	afterEach(function () {
		BCC_TEST.end(this);
	});

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
			// check message broadcasted OK
			expect(listener1.out_messages.length).toEqual(1);
			expect(listener1.errors.length).toEqual(0);
		});

		runs(function() {
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
			// check message broadcasted OK
			expect(listener2.out_messages.length).toEqual(1);
			expect(listener2.errors.length).toEqual(0);
		});

		// close feeds

		runs(function () {
			listener1.f.close();
		});

		waitsFor(function(argument) {
			return (0 !== listener1.closes);
		}, 'lowercase feed close', BCC_TEST.TIMEOUT);

		runs(function() {
			expect(listener1.opens).toEqual(1);
			expect(listener1.closes).toEqual(1);
			expect(listener1.errors.length).toEqual(0);
		});

		runs(function () {
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

	it("should allow opening multiple feeds without waiting", function() {
		var ctx = BCC.init(BCC_TEST.VALID_API_KEY);
		expect(typeof(ctx)).toBe("object");
		
		var p = ctx.project(BCC_TEST.TEST_PROJECT);
		expect(typeof(p)).toBe("object");
		
		var listener1 = new BCC_TEST.Listener();
		var listener2 = new BCC_TEST.Listener();
		var listener3 = new BCC_TEST.Listener();
		var listener4 = new BCC_TEST.Listener();
		var listener5 = new BCC_TEST.Listener();

		p.feed({
			channel: thru_feed_name,
			name: 'sub channel 1',
			onopen: listener1.onopen,
			onclose: listener1.onclose,
			onmsgreceived: listener1.onmsgreceived,
			onmsgsent: listener1.onmsgsent,
			onerror: listener1.onerror
		});

		p.feed({
			channel: thru_feed_name,
			name: 'sub channel 2',
			onopen: listener2.onopen,
			onclose: listener2.onclose,
			onmsgreceived: listener2.onmsgreceived,
			onmsgsent: listener2.onmsgsent,
			onerror: listener2.onerror
		});

		p.feed({
			channel: thru_feed_name,
			name: 'sub channel 3',
			onopen: listener3.onopen,
			onclose: listener3.onclose,
			onmsgreceived: listener3.onmsgreceived,
			onmsgsent: listener3.onmsgsent,
			onerror: listener3.onerror
		});

		p.feed({
			channel: thru_feed_name,
			name: 'sub channel 4',
			onopen: listener4.onopen,
			onclose: listener4.onclose,
			onmsgreceived: listener4.onmsgreceived,
			onmsgsent: listener4.onmsgsent,
			onerror: listener4.onerror
		});

		p.feed({
			channel: thru_feed_name,
			name: 'sub channel 5',
			onopen: listener5.onopen,
			onclose: listener5.onclose,
			onmsgreceived: listener5.onmsgreceived,
			onmsgsent: listener5.onmsgsent,
			onerror: listener5.onerror
		});


		waitsFor(function(argument) {
		  return ( (0 !== listener1.opens) && (0 !== listener2.opens) && (0 !== listener3.opens) && (0 !== listener4.opens) && (0 !== listener5.opens) );
		}, BCC_TEST.TIMEOUT, 'opening multiple feeds');

		runs(function() {
			expect(listener1.opens).toEqual(1, 'listener 1 opens');
			expect(listener1.closes).toEqual(0, 'listener 1 closes');
			expect(listener1.errors.length).toEqual(0, 'listener 1 errors');
			expect(listener2.opens).toEqual(1, 'listener 2 opens');
			expect(listener2.closes).toEqual(0, 'listener 2 closes');
			expect(listener2.errors.length).toEqual(0, 'listener 2 errors');
			expect(listener3.opens).toEqual(1, 'listener 3 opens');
			expect(listener3.closes).toEqual(0, 'listener 3 closes');
			expect(listener3.errors.length).toEqual(0, 'listener 3 errors');
			expect(listener4.opens).toEqual(1, 'listener 4 opens');
			expect(listener4.closes).toEqual(0, 'listener 4 closes');
			expect(listener4.errors.length).toEqual(0, 'listener 4 errors');
			expect(listener5.opens).toEqual(1, 'listener 5 opens');
			expect(listener5.closes).toEqual(0, 'listener 5 closes');
			expect(listener5.errors.length).toEqual(0, 'listener 5 errors');

		  listener1.f.close();
		  listener2.f.close();
		  listener3.f.close();
		  listener4.f.close();
		  listener5.f.close();
		});

		waitsFor(function(argument) {
		  return ( (0 !== listener1.closes) && (0 !== listener2.closes) && (0 !== listener3.closes) && (0 !== listener4.closes) && (0 !== listener5.closes) );
		}, 'closing multiple feeds');

		runs(function() {
			expect(listener1.opens).toEqual(1, 'listener 1 opens');
			expect(listener1.closes).toEqual(1, 'listener 1 closes');
			expect(listener1.errors.length).toEqual(0, 'listener 1 errors');
			expect(listener2.opens).toEqual(1, 'listener 2 opens');
			expect(listener2.closes).toEqual(1, 'listener 2 closes');
			expect(listener2.errors.length).toEqual(0, 'listener 2 errors');
			expect(listener3.opens).toEqual(1, 'listener 3 opens');
			expect(listener3.closes).toEqual(1, 'listener 3 closes');
			expect(listener3.errors.length).toEqual(0, 'listener 3 errors');
			expect(listener4.opens).toEqual(1, 'listener 4 opens');
			expect(listener4.closes).toEqual(1, 'listener 4 closes');
			expect(listener4.errors.length).toEqual(0, 'listener 4 errors');
			expect(listener5.opens).toEqual(1, 'listener 5 opens');
			expect(listener5.closes).toEqual(1, 'listener 5 closes');
			expect(listener5.errors.length).toEqual(0, 'listener 5 errors');
		});
	});

	it("combines multiple feeds into single stream create", function() {
		BCC.Env.FORCE_WEBSOCKETS_OFF = true;
		BCC.Env.FORCE_FLASHSOCKETS_OFF = true;
		BCC.Env.FORCE_STREAMING_OFF = false;

		var ctx = BCC.init(BCC_TEST.VALID_API_KEY);
		expect(typeof(ctx)).toBe("object");
		
		var p = ctx.project(BCC_TEST.TEST_PROJECT);
		expect(typeof(p)).toBe("object");
		
		var listener1 = new BCC_TEST.Listener();
		var listener2 = new BCC_TEST.Listener();
		var listener3 = new BCC_TEST.Listener();
		var listener4 = new BCC_TEST.Listener();
		var listener5 = new BCC_TEST.Listener();

		p.feed({
			channel: thru_feed_name,
			name: 'sub channel 1',
			onopen: listener1.onopen,
			onclose: listener1.onclose,
			onmsgreceived: listener1.onmsgreceived,
			onmsgsent: listener1.onmsgsent,
			onerror: listener1.onerror
		});

		p.feed({
			channel: thru_feed_name,
			name: 'sub channel 2',
			onopen: listener2.onopen,
			onclose: listener2.onclose,
			onmsgreceived: listener2.onmsgreceived,
			onmsgsent: listener2.onmsgsent,
			onerror: listener2.onerror
		});

		p.feed({
			channel: thru_feed_name,
			name: 'sub channel 3',
			onopen: listener3.onopen,
			onclose: listener3.onclose,
			onmsgreceived: listener3.onmsgreceived,
			onmsgsent: listener3.onmsgsent,
			onerror: listener3.onerror
		});

		p.feed({
			channel: thru_feed_name,
			name: 'sub channel 4',
			onopen: listener4.onopen,
			onclose: listener4.onclose,
			onmsgreceived: listener4.onmsgreceived,
			onmsgsent: listener4.onmsgsent,
			onerror: listener4.onerror
		});

		p.feed({
			channel: thru_feed_name,
			name: 'sub channel 5',
			onopen: listener5.onopen,
			onclose: listener5.onclose,
			onmsgreceived: listener5.onmsgreceived,
			onmsgsent: listener5.onmsgsent,
			onerror: listener5.onerror
		});


		waitsFor(function(argument) {
		  return ( (0 !== listener1.opens) && (0 !== listener2.opens) && (0 !== listener3.opens) && (0 !== listener4.opens) && (0 !== listener5.opens) );
		}, BCC_TEST.TIMEOUT, 'opening multiple feeds');

		runs(function() {
			expect(listener1.opens).toEqual(1, 'listener 1 opens');
			expect(listener1.closes).toEqual(0, 'listener 1 closes');
			expect(listener1.errors.length).toEqual(0, 'listener 1 errors');
			expect(listener2.opens).toEqual(1, 'listener 2 opens');
			expect(listener2.closes).toEqual(0, 'listener 2 closes');
			expect(listener2.errors.length).toEqual(0, 'listener 2 errors');
			expect(listener3.opens).toEqual(1, 'listener 3 opens');
			expect(listener3.closes).toEqual(0, 'listener 3 closes');
			expect(listener3.errors.length).toEqual(0, 'listener 3 errors');
			expect(listener4.opens).toEqual(1, 'listener 4 opens');
			expect(listener4.closes).toEqual(0, 'listener 4 closes');
			expect(listener4.errors.length).toEqual(0, 'listener 4 errors');
			expect(listener5.opens).toEqual(1, 'listener 5 opens');
			expect(listener5.closes).toEqual(0, 'listener 5 closes');
			expect(listener5.errors.length).toEqual(0, 'listener 5 errors');

			var connection_metrics = ctx.conn.getMetrics();
			var endpoint_metrics = ctx.conn.endpoint.getMetrics();
			expect(connection_metrics.get('session_create_attempts')).toEqual(1);
			expect(connection_metrics.get('socket_attempts')).toEqual(2);
			expect(connection_metrics.get('flash_attempts')).toEqual(2);
			expect(connection_metrics.get('rest_attempts')).toEqual(1);
			expect(connection_metrics.get('open')).toEqual(1);
			expect(endpoint_metrics.get('write')).toEqual(0);
			expect(endpoint_metrics.get('preamble_commands')).toEqual(5);

		  listener1.f.close();
		  listener2.f.close();
		  listener3.f.close();
		  listener4.f.close();
		  listener5.f.close();
		});

		waitsFor(function(argument) {
		  return ( (0 !== listener1.closes) && (0 !== listener2.closes) && (0 !== listener3.closes) && (0 !== listener4.closes) && (0 !== listener5.closes) );
		}, 'closing multiple feeds');

		runs(function() {
			expect(listener1.opens).toEqual(1, 'listener 1 opens');
			expect(listener1.closes).toEqual(1, 'listener 1 closes');
			expect(listener1.errors.length).toEqual(0, 'listener 1 errors');
			expect(listener2.opens).toEqual(1, 'listener 2 opens');
			expect(listener2.closes).toEqual(1, 'listener 2 closes');
			expect(listener2.errors.length).toEqual(0, 'listener 2 errors');
			expect(listener3.opens).toEqual(1, 'listener 3 opens');
			expect(listener3.closes).toEqual(1, 'listener 3 closes');
			expect(listener3.errors.length).toEqual(0, 'listener 3 errors');
			expect(listener4.opens).toEqual(1, 'listener 4 opens');
			expect(listener4.closes).toEqual(1, 'listener 4 closes');
			expect(listener4.errors.length).toEqual(0, 'listener 4 errors');
			expect(listener5.opens).toEqual(1, 'listener 5 opens');
			expect(listener5.closes).toEqual(1, 'listener 5 closes');
			expect(listener5.errors.length).toEqual(0, 'listener 5 errors');
		});
	});

});