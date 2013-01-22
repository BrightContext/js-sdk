describe("endpoint", function () {
	var session,
			endpoint,
			test_socket_url,
			test_stream_url,
			test_endpoint_connect
	;

	test_endpoint_connect = function () {
		var error, socket, metrics, got_disconnect_event;

		endpoint.setSessionId(session.sid);
		expect(endpoint.getSessionId()).toBe(session.sid);

		endpoint.connect(function (e, opened_endpoint) {
			error = e;
			expect(opened_endpoint).toBe(endpoint);
			socket = endpoint.getSocket();
		});

		waitsFor(function(argument) {
			return (error || socket);
		}, 'connect');

		runs(function() {
			expect(error).toBeNull();
			expect(socket).not.toBeNull();
		});

		runs(function() {
			endpoint.heartbeat();
		});

		waitsFor(function(argument) {
			var hbi = endpoint.getMetrics().get('heartbeat_in');
			return (1 == hbi);
		}, 'heartbeat');

		runs(function() {
			endpoint.disconnect(function (e, closed_endpoint) {
				error = e;
				expect(closed_endpoint).toBe(endpoint);
				got_disconnect_event = true;
			});
		});

		waitsFor(function(argument) {
			return (true === got_disconnect_event);
		}, 'disconnect');

		runs(function() {
			expect(error).toBeNull();

			expect(endpoint.isClosed()).toBeTruthy();

			metrics = endpoint.getMetrics();
			expect(metrics.get('connect')).toEqual(1);
			expect(metrics.get('disconnect')).toEqual(1);
			expect(metrics.get('heartbeat_out')).toEqual(1);
			expect(metrics.get('heartbeat_in')).toEqual(1);
			expect(metrics.get('write')).toEqual(0);
		});
	};

	beforeEach(function () {
		BCC_TEST.begin(this);

		endpoint = null;
		session = null;

		BCC.Util.makeRequest({
			url: 'http://pub.bcclabs.com/api/v2/session/create.json',
			method: 'POST',
			data: 'apiKey=' + BCC_TEST.VALID_API_KEY,
			onload: function (response) {
				session = JSON.parse(response);
			}
		});

		waitsFor(function(argument) {
			return (null !== session);
		}, 'session create');

		runs(function() {
			BCC.Log.debug(JSON.stringify(session), 'jasmine');

			test_stream_url = session.endpoints.rest[0] + '/api/v2/stream/create.json';
			test_socket_url = session.endpoints.socket[0] + '/api/feed/ws';
		});
	});

	afterEach(function () {
		endpoint.printMetrics();

		BCC_TEST.end(this);
	});
	
	it("should support websockets", function () {
		endpoint = new BCC.WebSocketEndpoint();
		
		endpoint.setUrl(test_socket_url);
		expect(endpoint.getUrl()).toBe(test_socket_url);
		
		test_endpoint_connect();
	});

	it("should support flash sockets", function() {
		endpoint = new BCC.FlashSocketEndpoint();
		
		endpoint.setUrl(test_socket_url);
		expect(endpoint.getUrl()).toBe(test_socket_url);
		
		test_endpoint_connect();
	});

	it("should support rest streaming", function() {
		endpoint = new BCC.RestStreamEndpoint();

		endpoint.setUrl(test_stream_url);
		expect(endpoint.getUrl()).toBe(test_stream_url);

		test_endpoint_connect();
	});

});