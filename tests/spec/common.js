var BCC_TEST = {};

BCC_TEST.VALID_API_KEY = "8b6522e5-d1ed-4bf9-870c-6ab2be742f4d";
BCC_TEST.INVALID_API_KEY = "invalid-api-key";

BCC_TEST.CONN_TYPE_WEB_SOCK = "WEB_SOCKET";
BCC_TEST.CONN_TYPE_XHR_STREAM = "XHR_STREAMING";
BCC_TEST.CONN_TYPE_XHR_LONGPOLL = "XHR_LONG_POLL";
BCC_TEST.CONN_TYPE_FLASH_SOCK = "FLASH_SOCKET";
BCC_TEST.CONN_TYPE_FLASH_LONGPOLL = "FLASH_LONG_POLL";

BCC_TEST.TEST_PROJECT = "js unit tests";
BCC_TEST.THRU_CHANNEL = "unprotected thru";

BCC_TEST.TIMEOUT = 10000;
BCC_TEST.MESSAGE_TIMEOUT = 20000;
BCC_TEST.REVOTE_TIMER = 60000;

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
