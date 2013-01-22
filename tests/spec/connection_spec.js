describe("connection", function() {
	beforeEach(function(){
		BCC_TEST.begin(this);

		BCC.Env.FORCE_WEBSOCKETS_OFF = false;
		BCC.Env.FORCE_FLASHSOCKETS_OFF = false;
		BCC.Env.FORCE_STREAMING_OFF = false;
	});

	afterEach(function(){
		BCC_TEST.end(this);
	});

	var do_open_and_close = function (connection) {
		var fired_open_handler, fired_close_handler;

		connection.open(function (connection_error, opened_connection) {
			expect(connection_error).toBeNull();
			expect(connection).toBe(opened_connection);
			fired_open_handler = true;
		});

		waitsFor(function () {
			return (fired_open_handler);
		}, 'opening connection', BCC_TEST.TIMEOUT);

		runs(function () {
			connection.close(function (close_error, closed_connection) {
				expect(close_error).toBeNull();
				expect(closed_connection).toBe(connection);
				fired_close_handler = true;
			});
		});

		waitsFor(function () {
			return (fired_close_handler);
		}, 'closing connection', BCC_TEST.TIMEOUT);
	};

	it("can open and establish endpoint", function() {
		var connection = new BCC.Connection(BCC_TEST.INSECURE_KEY, 10);

		do_open_and_close(connection);

		runs(function() {
			var m = connection.getMetrics();
			expect(m.get('socket_attempts')).toEqual(1);
			expect(m.get('flash_attempts')).toEqual(0);
			expect(m.get('rest_attempts')).toEqual(0);
		});
	});

	it("can open and establish endpoint securely", function() {
		var connection = new BCC.Connection(BCC_TEST.SECURE_KEY, 10);

		do_open_and_close(connection);

		runs(function() {
			var m = connection.getMetrics();
			expect(m.get('socket_attempts')).toEqual(1);
			expect(m.get('flash_attempts')).toEqual(0);
			expect(m.get('rest_attempts')).toEqual(0);
		});
	});

	it("connects with flash sockets if websockets do not work", function() {
		var connection = new BCC.Connection(BCC_TEST.INSECURE_KEY, 10);

		BCC.Env.FORCE_WEBSOCKETS_OFF = true;
		BCC.Env.FORCE_FLASHSOCKETS_OFF = false;
		BCC.Env.FORCE_STREAMING_OFF = false;


		do_open_and_close(connection);

		runs(function() {
			var m = connection.getMetrics();
			expect(m.get('socket_attempts')).toEqual(2);
			expect(m.get('flash_attempts')).toEqual(1);
			expect(m.get('rest_attempts')).toEqual(0);
		});
	});

	it("connects with flash sockets if websockets do not work securely", function() {
		var connection = new BCC.Connection(BCC_TEST.SECURE_KEY, 10);

		BCC.Env.FORCE_WEBSOCKETS_OFF = true;
		BCC.Env.FORCE_FLASHSOCKETS_OFF = false;
		BCC.Env.FORCE_STREAMING_OFF = false;

		do_open_and_close(connection);

		runs(function() {
			var m = connection.getMetrics();
			expect(m.get('socket_attempts')).toEqual(1);
			expect(m.get('flash_attempts')).toEqual(1);
			expect(m.get('rest_attempts')).toEqual(0);
		});
	});

	it("connects with streaming if websockets and flashsockets do not work", function() {
		var connection = new BCC.Connection(BCC_TEST.INSECURE_KEY, 10);

		BCC.Env.FORCE_WEBSOCKETS_OFF = true;
		BCC.Env.FORCE_FLASHSOCKETS_OFF = true;
		BCC.Env.FORCE_STREAMING_OFF = false;

		do_open_and_close(connection);

		runs(function() {
			var m = connection.getMetrics();
			expect(m.get('socket_attempts')).toEqual(2);
			expect(m.get('flash_attempts')).toEqual(2);
			expect(m.get('rest_attempts')).toEqual(1);
		});
	});

	it("connects with streaming if websockets and flashsockets do not work securely", function() {
		var connection = new BCC.Connection(BCC_TEST.SECURE_KEY, 10);

		BCC.Env.FORCE_WEBSOCKETS_OFF = true;
		BCC.Env.FORCE_FLASHSOCKETS_OFF = true;
		BCC.Env.FORCE_STREAMING_OFF = false;

		do_open_and_close(connection);

		runs(function() {
			var m = connection.getMetrics();
			expect(m.get('socket_attempts')).toEqual(1);
			expect(m.get('flash_attempts')).toEqual(1);
			expect(m.get('rest_attempts')).toEqual(1);
		});
	});

	it("can fallback gracefully", function() {
		var connection, fired_open_handler, fired_fallback_handler, fired_close_handler;

		connection = new BCC.Connection(BCC_TEST.INSECURE_KEY, 10);
		expect(connection).not.toBeNull();
		expect(connection).not.toBeUndefined();
		
		connection.onclose = function () {
			fired_close_handler = true;
		};

		connection.open(function (connection_error, opened_connection) {
			expect(connection_error).toBeNull();
			expect(connection).toBe(opened_connection);
			fired_open_handler = true;
		});

		waitsFor(function(argument) {
			return (fired_open_handler);
		});

		runs(function() {
			var connection_metrics = connection.getMetrics(),
					endpoint_metrics = connection.endpoint.getMetrics()
			;
			
			connection_metrics.print('connection');
			
			// inject artificial heartbeats instead of waiting around
			endpoint_metrics.print('connection.endpoint');
			endpoint_metrics.inc('heartbeat_in',2);
			endpoint_metrics.inc('heartbeat_out',2);

			connection._fallback(function (fallback_error) {
				expect(fallback_error).toBeNull();
				fired_fallback_handler = true;
			});
		});

		waitsFor(function(argument) {
			return (fired_fallback_handler);
		}, 'fallback', BCC.MAX_ENDPOINT_ATTEMPTS * 5000);

		runs(function() {
			var connection_metrics = connection.getMetrics(),
					endpoint_metrics = connection.endpoint.getMetrics()
			;

			connection_metrics.print('connection');
			expect(connection_metrics.get('open')).toEqual(1);
			expect(connection_metrics.get('session_create_attempts')).toEqual(1);
			expect(connection_metrics.get('socket_attempts')).toEqual(1);
			expect(connection_metrics.get('fallback')).toEqual(2);  // once to force close, twice to recurse

			endpoint_metrics.print('connection.endpoint');
			expect(endpoint_metrics.get('reconnect_attempts')).toEqual(1);

			connection.close();
		});

		waitsFor(function () {
			return (fired_close_handler);
		}, 'closing connection');

	});

	it("executes heartbeats properly", function() {
		// note: don't want to use jasmine Clock.useMock() here because it messes with other tests
		// if there is some way to disable it once it's been installed, we can change this

		var time_passed = false,
				hb_interval = 5,
				connection,
				fired_close_handler;

		connection = new BCC.Connection(BCC_TEST.INSECURE_KEY, hb_interval);
		expect(connection).not.toBeNull();
		expect(connection).not.toBeUndefined();

		connection.open(function (connection_error, opened_connection) {
			expect(connection_error).toBeNull();
			expect(connection).toBe(opened_connection);

			var m = connection.endpoint.getMetrics();
			expect(m).not.toBeNull();
			expect(m).not.toBeUndefined();
			expect(m.get('heartbeat_in')).toEqual(0);
			expect(m.get('heartbeat_out')).toEqual(0);

			setTimeout(function () {
				time_passed = true;
			}, hb_interval * 2500);
		});

		waitsFor(function(argument) {
			return (time_passed);
		}, 'heartbeats', hb_interval * 3000);//Changing 2500 to 3000 to give some buffer time

		runs(function() {
			var m = connection.endpoint.getMetrics();
			expect(m).not.toBeNull();
			expect(m).not.toBeUndefined();
			expect(m.get('heartbeat_in')).toEqual(2);
			expect(m.get('heartbeat_out')).toEqual(2);
		});

		runs(function() {
			connection.close(function () {
				fired_close_handler = true;
			});
		});

		waitsFor(function(argument) {
			return (fired_close_handler);
		});
	});
});

