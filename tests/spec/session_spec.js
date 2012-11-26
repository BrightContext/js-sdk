describe("session", function() {
	
	beforeEach(function () {
		BCC_TEST.begin(this);
	});

	afterEach(function () {
		BCC_TEST.end(this);
	});

	it ("should error with an short api key", function() {
		var completion_fired = false,
				session = null
		;

		session = new BCC.Session(BCC_TEST.INVALID_API_KEY_SHORT);
		session.create(function (session_create_error, new_session) {
			expect(session_create_error).not.toBeNull();
			expect(session_create_error).toMatch(/invalid/i);
			expect(session_create_error).toMatch(/api key/i);
			expect(new_session).toBeFalsy();
			completion_fired = true;
		});

		waitsFor(function() {
			return completion_fired;
		}, "session create", BCC_TEST.TIMEOUT);
	});

	it ("should error with an invalid api key", function() {
		var completion_fired = false,
				session = null
		;

		session = new BCC.Session(BCC_TEST.INVALID_API_KEY);
		session.create(function (session_create_error, new_session) {
			expect(session_create_error).not.toBeNull();
			expect(session_create_error).toMatch(/invalid/i);
			expect(session_create_error).toMatch(/api key/i);
			expect(new_session).toBeFalsy();
			completion_fired = true;
		});

		waitsFor(function() {
			return completion_fired;
		}, "session create", BCC_TEST.TIMEOUT);
	});
		
	var createValidSession = function(completion) {
		var completion_fired = false,
				session = null
		;

		session = new BCC.Session(BCC_TEST.VALID_API_KEY);

		expect(session.getSessionCreateUrl()).toMatch(/session\/create.json$/);

		session.create(function (session_create_error, new_session) {
			expect(session_create_error).toBeNull();
			expect(new_session).toBe(session);
			completion_fired = true;
		});

		waitsFor(function () {
			return completion_fired;
		}, "session create", BCC_TEST.TIMEOUT);
		
		runs(function () {
			completion(session);
		});
	};
	
	it ("has a valid session id", function() {
		createValidSession(function(sess) {
			var sid = sess.getSessionId();

			expect(sid).not.toBeNull();
			expect(sid).not.toBeUndefined();
			expect(sid).not.toBe("");
			expect(sid).not.toEqual("");
			expect(sid.length).toEqual(36);
			expect(sid).toMatch(/[a-z,A-Z,0-9]{8}-[a-z,A-Z,0-9]{4}-[a-z,A-Z,0-9]{4}-[a-z,A-Z,0-9]{4}-[a-z,A-Z,0-9]{12}/);
		});
	});
	
	it ("has valid session properties", function() {
		createValidSession(function(sess) {
			var props = sess.getProperties();
			expect(props).not.toBeNull();
			expect(props).not.toBeUndefined();
			expect(props).not.toBe("");
			expect(props).not.toEqual("");

			expect(props.stime).not.toBeNull();
			expect(props.stime).not.toBeUndefined();
			expect(props.stime).not.toBe("");
			expect(props.stime).not.toEqual("");
			expect(isNaN(props.stime)).toBe(false);
			expect(parseInt(props.stime,10)).toBe(props.stime);

			expect(props.endpoints).not.toBeUndefined();

			expect(props.endpoints.socket).not.toBeNull();
			expect(props.endpoints.socket).not.toBeUndefined();
			expect(props.endpoints.socket.length).toBeGreaterThan(0);

			expect(props.endpoints.flash).not.toBeNull();
			expect(props.endpoints.flash).not.toBeUndefined();
			expect(props.endpoints.flash.length).toBeGreaterThan(0);

			expect(props.endpoints.rest).not.toBeNull();
			expect(props.endpoints.rest).not.toBeUndefined();
			expect(props.endpoints.rest.length).toBeGreaterThan(0);
		});
	});
	
	it ("builds a valid websocket url", function() {
		createValidSession(function (s) {
			var wsUrl = s.getSocketUrl(s.getEndpoints().socket[0]);
			expect(wsUrl).not.toBeNull();
			expect(wsUrl).not.toBeUndefined();
			expect(wsUrl).not.toBe("");
			expect(wsUrl).not.toEqual("");
			expect(wsUrl).toMatch(/^ws:\/\//);
			expect(wsUrl).toMatch(/feed\/ws$/);
		});
	});
	
	it ("builds a valid stream url", function() {
		createValidSession(function (s) {
			var streamUrl = s.getStreamUrl(s.getEndpoints().rest[0]);
			expect(streamUrl).not.toBeNull();
			expect(streamUrl).not.toBeUndefined();
			expect(streamUrl).not.toBe("");
			expect(streamUrl).not.toEqual("");
			expect(streamUrl).toMatch(/^http:\/\//);
			expect(streamUrl).toMatch(/stream\/create.json$/);
		});
	});
});