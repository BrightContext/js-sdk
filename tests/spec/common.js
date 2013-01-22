var BCC_TEST = {};

BCC_TEST.INSECURE_KEY = "ca714a27-44a6-4939-89d6-93f7a8d22548";
BCC_TEST.SECURE_KEY = "8f2fbe21-6521-4fe2-94c9-e88ac14197fb";

BCC_TEST.VALID_API_KEY = BCC_TEST.INSECURE_KEY;
BCC_TEST.INVALID_API_KEY_SHORT = "invalid-api-key";
BCC_TEST.INVALID_API_KEY = "00000000-0000-0000-0000-000000000000";

BCC_TEST.CONN_TYPE_WEB_SOCK = "WEB_SOCKET";
BCC_TEST.CONN_TYPE_XHR_STREAM = "XHR_STREAMING";
BCC_TEST.CONN_TYPE_XHR_LONGPOLL = "XHR_LONG_POLL";
BCC_TEST.CONN_TYPE_FLASH_SOCK = "FLASH_SOCKET";
BCC_TEST.CONN_TYPE_FLASH_LONGPOLL = "FLASH_LONG_POLL";

BCC_TEST.TEST_PROJECT = "js unit tests";
BCC_TEST.THRU_CHANNEL = "unprotected thru";
BCC_TEST.THRU_CHANNEL_PROTECTED = "protected thru";
BCC_TEST.THRU_CHANNEL_PROTECTED_WRITEKEY = 'b9a9b7fa6645a0ea';

BCC_TEST.TIMEOUT = 30000;
BCC_TEST.MESSAGE_TIMEOUT = 30000;
BCC_TEST.REVOTE_TIMER = 60000;

BCC_TEST.begin = function (t) {
	BCC.Log.debug("BEGIN", "TEST " + t.suite.description + " " + t.description);
};

BCC_TEST.end = function (t) {
	BCC.Log.debug("END", "TEST " + t.suite.description + " " + t.description);
};

BCC_TEST.Listener = function() {
	this.opens = 0;
	this.closes = 0;
	this.f = null;
	this.in_messages = [];
	this.out_messages = [];
	this.history_messages = [];
	this.errors = [];
	
	var listener = this;
	
	this.reset = function() {
		this.opens = 0;
		this.closes = 0;
		this.in_messages = [];
		this.history_messages = [];
		this.out_messages = [];
		this.errors = [];
	};
	
	this.onhistory = function(feed, message) {
		listener.history_messages.push(message);
	};
	
	this.onopen = function(feed) {
		listener.f = feed;
		listener.opens++;
	};
	
	this.onclose = function(feed) {
		listener.closes++;
	};
	
	this.onmsgreceived = function(feed, message) {
		listener.in_messages.push(message);
	};
	
	this.onmsgsent = function(feed, message) {
		listener.out_messages.push(message);
	};
	
	this.onerror = function(error) {
		listener.errors.push(error);
	};
};

BCC_TEST.buildPayload = function (payload_size) {
	var data = [];
	data.push("{ \"d\": \"");
	for (i = 0; i!=payload_size; ++i) {
		data.push('x');
	}
	data.push("\" }");
	return data;
};


BCC_TEST.keys = function(o) {
	var a = [];
	for (var k in o) { a.push(k); }
	return a;
};


BCC_TEST.closeContextAndWait = function (ctx) {
	var done = false;

	if (!ctx) {
		return;
	}
	
	runs(function() {
		ctx.forceShutdown();
	});

	waitsFor(function() {
		return ((!ctx.conn) || (!ctx.conn.endpoint) || (ctx.conn.endpoint.isClosed()));
	}, 'endpoint closing', BCC_TEST.TIMEOUT);
};
