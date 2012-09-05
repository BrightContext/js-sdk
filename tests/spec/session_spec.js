describe("session", function() {
	var hasError = true;
	var callReturned = false;
	
	beforeEach(function(){
		hasError = true;
		callReturned = false;
	});

	it ("should error with an invalid api key", function() {
		var errorObj = null;
		var sess = new BCC.Session(BCC_TEST.INVALID_API_KEY);
		sess.onopen = function(){
			hasError = false;
			callReturned = true;
		};
		sess.onerror = function(e){
			errorObj = e;
			hasError = true;
			callReturned = true;
		};
		sess.open();

		waitsFor(function() {
			return callReturned;
		}, "Session Open timed out", BCC_TEST.TIMEOUT);
		
		runs(function(){
			expect(hasError).toEqual(true);
			expect(errorObj).toBe("Session Open Failed");
			// it would be better if we could test the client header was 400
		});
	});
		
	var openValidSession = function(completion) {
		var sess = new BCC.Session(BCC_TEST.VALID_API_KEY);
		sess.onopen = function(){hasError = false; callReturned = true;};
		sess.onerror = function(){hasError = true; callReturned = true;};
		sess.open();

		waitsFor(function() {
			return callReturned;
		}, "Session Open timed out (5 secs)", BCC_TEST.TIMEOUT);
		
		runs(function(){
			expect(hasError).toEqual(false);
			completion(sess);
		});
	};
	
	it ("has a valid session id", function() {
		openValidSession(function(sess) {
			var sid = sess.getSessId();
			expect(sid).not.toBeNull();
			expect(sid).not.toBeUndefined();
			expect(sid).not.toBe("");
			expect(sid).not.toEqual("");
			expect(sid.length).toEqual(36);
			expect(sid).toMatch(/[a-z,A-Z,0-9]{8}-[a-z,A-Z,0-9]{4}-[a-z,A-Z,0-9]{4}-[a-z,A-Z,0-9]{4}-[a-z,A-Z,0-9]{12}/);
		});
	});
	
	it ("has valid session properties", function() {
		openValidSession(function(sess) {
			var props = sess.getProperties();
			expect(props).not.toBeNull();
			expect(props).not.toBeUndefined();
			expect(props).not.toBe("");
			expect(props).not.toEqual("");

			expect(props.domain).not.toBeNull();
			expect(props.domain).not.toBeUndefined();
			expect(props.domain).not.toBe("");
			expect(props.domain).not.toEqual("");
			expect(props.domain).toMatch(/^http:\/\//);

			expect(props.domain).not.toBeNull();
			expect(props.domain).not.toBeUndefined();
			expect(props.domain).not.toBe("");
			expect(props.domain).not.toEqual("");
			expect(props.domain).toMatch(/^http:\/\//);

			expect(props.stime).not.toBeNull();
			expect(props.stime).not.toBeUndefined();
			expect(props.stime).not.toBe("");
			expect(props.stime).not.toEqual("");
			expect(isNaN(props.stime)).toBe(false);
			expect(parseInt(props.stime,10)).toBe(props.stime);
		});
	});
	
	it ("builds a valid websocket url", function() {
		openValidSession(function(sess) {
			var wsUrl = sess.getSocketUrl();
			expect(wsUrl).not.toBeNull();
			expect(wsUrl).not.toBeUndefined();
			expect(wsUrl).not.toBe("");
			expect(wsUrl).not.toEqual("");
			expect(wsUrl).toMatch(/^ws:\/\//);
		});
	});
	
	it ("builds a valid stream url", function() {
		openValidSession(function(sess) {
			var streamUrl = sess.getStreamUrl();
			expect(streamUrl).not.toBeNull();
			expect(streamUrl).not.toBeUndefined();
			expect(streamUrl).not.toBe("");
			expect(streamUrl).not.toEqual("");
			expect(streamUrl).toMatch(/^http:\/\//);
			expect(streamUrl).toMatch(/m=STREAM$/);
		});
	});
	
	it ("builds a valid rest url", function() {
		openValidSession(function(sess) {
			var restUrl = sess.getRestUrl();
			expect(restUrl).not.toBeNull();
			expect(restUrl).not.toBeUndefined();
			expect(restUrl).not.toBe("");
			expect(restUrl).not.toEqual("");
			expect(restUrl).toMatch(/^http:\/\//);
		});
	});
	
	it ("builds a valid long poll url", function() {
		openValidSession(function(sess) {
			var restUrl = sess.getLongPollUrl();
			expect(restUrl).not.toBeNull();
			expect(restUrl).not.toBeUndefined();
			expect(restUrl).not.toBe("");
			expect(restUrl).not.toEqual("");
			expect(restUrl).toMatch(/^http:\/\//);
			expect(restUrl).toMatch(/m=LONG_POLL$/);
		});
	});
	

});