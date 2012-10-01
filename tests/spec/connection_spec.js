describe("connection", function() {
	var hasError = true;
	var sessCallReturned = false;
	var connOpenCallReturned = false;
	var connCloseCallReturned = false;
	var sess = null;
	var conn = null;
	
	beforeEach(function(){
		hasError = true;
		connOpenCallReturned = false;
		connCloseCallReturned = false;

		sess = new BCC.Session(BCC_TEST.VALID_API_KEY);
		sess.onopen = function(){sessCallReturned = true;};
		sess.onerror = function(){sessCallReturned = true;};
		sess.open();
	});

	afterEach(function(){
		sess = null;
		conn = null;
	});
	
	it ("web socket connection should open and close", function() {
		doTestConnect(BCC_TEST.CONN_TYPE_WEB_SOCK);
	});
	
	it ("web streaming connection  should open and close", function() {
		doTestConnect(BCC_TEST.CONN_TYPE_XHR_STREAM);
	});

	it ("long poll connection should open and close", function() {
		doTestConnect(BCC_TEST.CONN_TYPE_XHR_LONGPOLL);
	});
	
	var doTestConnect = function(type){
		waitsFor(function() {
			if(sessCallReturned && !!sess.getSessId())
				return true;
		}, "Session Open timed out", BCC_TEST.TIMEOUT);
		
		runs(function(){
			conn = new BCC.Connection(sess, 45);
			setConnType(type, conn);
			conn._init();
			conn.onopen = function(){hasError = false; connOpenCallReturned = true;};
			conn.onerror = function(){hasError = true; connOpenCallReturned = true;};
			conn.open();
		});

		waitsFor(function() {
			return connOpenCallReturned;
		}, "Connection Open timed out", BCC_TEST.TIMEOUT);

		runs(function(){
			expect(hasError).toEqual(false);
			conn.onclose = function(){connCloseCallReturned = true; };
			conn.close();
		});

		waitsFor(function() {
			return connCloseCallReturned;
		}, "Connection Close timed out", BCC_TEST.TIMEOUT);

		runs(function(){
			expect(true).toEqual(true);
		});	
	};
	
	var setConnType = function(type, conn){
		switch(type){
		case BCC_TEST.CONN_TYPE_WEB_SOCK:
			break;
		case BCC_TEST.CONN_TYPE_XHR_STREAM:
			conn._isWebSocket = function(){return false;};
			conn._isFlashSocket = function(){return false;};
			break;	
		case BCC_TEST.CONN_TYPE_XHR_LONGPOLL:
			conn._isWebSocket = function(){return false;};
			conn._isFlashSocket = function(){return false;};
			conn.streamingSupport = false;
			break;
		}
	};
});

