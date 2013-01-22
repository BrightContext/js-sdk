describe("history", function() {
	
	beforeEach(function(){
		BCC_TEST.begin(this);

		ctx = BCC.init(BCC_TEST.VALID_API_KEY);
		expect(typeof(ctx)).toBe("object");
		
		p = ctx.project(BCC_TEST.TEST_PROJECT);
		expect(typeof(p)).toBe("object");
	});
	
	afterEach(function(){
		BCC_TEST.closeContextAndWait(ctx);

		BCC_TEST.end(this);
	});
	
	it("should support optional parameters", function() {
		var expected_default_limit = 10;

		var captured_history = null;

		p.feed({
			channel: 'thru history',
			onopen: function (f) {
				f.getHistory();
			},
			onhistory: function (f, history) {
				captured_history = history;
			}
		});

		waitsFor(function(argument) {
			return (null !== captured_history);
		}, "history", BCC_TEST.TIMEOUT);

		runs(function() {
			expect(captured_history.length).toEqual(expected_default_limit);
		});

	});

	it("should support explicit limit", function() {
		var expected_limit = 1;

		var captured_history = null;

		p.feed({
			channel: BCC_TEST.THRU_CHANNEL,
			onopen: function (f) {
				f.getHistory(expected_limit);
			},
			onhistory: function (f, history) {
				captured_history = history;
			}
		});

		waitsFor(function(argument) {
			return (null !== captured_history);
		}, "history", BCC_TEST.TIMEOUT);

		runs(function() {
			expect(captured_history.length).toEqual(expected_limit);
		});

	});

	it("should support explicit completion handler", function() {
		var expected_limit = 1,
				testId = Math.random(),
				captured_history = null,
				sent_ts = null,
				received_ts = null,
				history_ts = null;

		var now = function () {
			return (new Date()).getTime();
		};

		p.feed({
			channel: BCC_TEST.THRU_CHANNEL,
			onopen: function (f) {
				f.send({ 'historytestid' : testId });
			},
			onmsgsent: function (f, m) {
				sent_ts = now();
			},
			onmsgreceived: function (f, m) {
				received_ts = now();
				f.getHistory(1, received_ts, function (x,y) {
					history_ts = now();
					captured_history = y;
				});
			}
		});

		waitsFor(function(argument) {
			return (null !== captured_history);
		}, "history", BCC_TEST.TIMEOUT);

		runs(function() {
			expect(received_ts - sent_ts).toBeLessThan(1000);
			expect(history_ts - sent_ts).toBeLessThan(1000);
			expect(captured_history.length).toEqual(1);
			expect(captured_history[0].message.historytestid).toEqual(testId);
		});
		
	});

	it("should return out history", function(){
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		
		quantChannelUseCase(inputHandler, outputHandler);
		
		waitsFor(function() {
			return (5 == outputHandler.in_messages.length);
		},"feed message received", BCC_TEST.MESSAGE_TIMEOUT);

		runs(function(){
			outputHandler.f.getHistory(3);
		});
		
		waitsFor(function() {
			return (1 == outputHandler.history_messages.length);
		},"feed history", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function(){
			expect(outputHandler.history_messages).not.toBeNull();
			expect(outputHandler.history_messages).not.toBeUndefined();
			expect(outputHandler.history_messages.length).toBe(1);
			
			var history = outputHandler.history_messages[0];
			
			expect(history).not.toBeNull();
			expect(history).not.toBeUndefined();
			expect(history.length).not.toBe(0);
			expect(history.length).toBe(3);
			
			expect(history[0].message).not.toBeNull();
			expect(history[0].message).not.toBeUndefined();
			expect(typeof history[0].message).toBe("object");
			expect(history[0].ts).not.toBeNull();
			expect(history[0].ts).not.toBeUndefined();
			expect(typeof history[0].ts).toBe("number");
			expect(history[0].message.s).not.toBeNull();
			expect(history[0].message.s).not.toBeUndefined();

			expect(history[1].message).not.toBeNull();
			expect(history[1].message).not.toBeUndefined();
			expect(typeof history[1].message).toBe("object");
			expect(history[1].ts).not.toBeNull();
			expect(history[1].ts).not.toBeUndefined();
			expect(typeof history[1].ts).toBe("number");
			expect(history[1].message.s).not.toBeNull();
			expect(history[1].message.s).not.toBeUndefined();

			expect(history[2].message).not.toBeNull();
			expect(history[2].message).not.toBeUndefined();
			expect(typeof history[2].message).toBe("object");
			expect(history[2].ts).not.toBeNull();
			expect(history[2].ts).not.toBeUndefined();
			expect(typeof history[2].ts).toBe("number");
			expect(history[2].message.s).not.toBeNull();
			expect(history[2].message.s).not.toBeUndefined();

			expect(history[0].message.s).toBe("msg5");
			expect(history[1].message.s).toBe("msg4");
			expect(history[2].message.s).toBe("msg3");
		});

	});

	it("should return thru history", function(){
		var thruHandler = new BCC_TEST.Listener();

		var num_messages_to_send = 10,
				test_id = Math.random();
		testThruUseCase(num_messages_to_send, thruHandler, test_id);
		
		// wait for local echo
		waitsFor(function() {
			return (num_messages_to_send == thruHandler.in_messages.length);
		},"feed message received", BCC_TEST.MESSAGE_TIMEOUT);

		// fetch history
		runs(function(){
			thruHandler.f.getHistory(num_messages_to_send);
		});
		waitsFor(function() {
			return (0 !== thruHandler.history_messages.length);
		},"feed history", BCC_TEST.MESSAGE_TIMEOUT);
		
		// test assumptions
		runs(function(){
			expect(thruHandler.history_messages).not.toBeNull();
			expect(thruHandler.history_messages).not.toBeUndefined();
			expect(thruHandler.history_messages.length).toBe(1);
			
			var history = thruHandler.history_messages[0];
			expect(history).not.toBeNull();
			expect(history).not.toBeUndefined();
			expect(history.length).not.toBe(0);
			expect(history.length).toBe(num_messages_to_send);
			
			for (var k = num_messages_to_send-1; k != -1; --k) {
				var msg = history[k].message;
				expect(msg).not.toBeNull();
				expect(msg).not.toBeUndefined();
				expect(typeof msg).toBe("object");
				expect(msg.m).toMatch(/message.[0-9]/);
				expect(msg.test_id).toEqual(test_id);

				var ts = history[k].ts;
				expect(ts).not.toBeNull();
				expect(ts).not.toBeUndefined();
				
				expect(typeof ts).toBe("number");
				
				var now = new Date();
				var ts_as_date = new Date(ts);
				expect(ts_as_date.getFullYear()).toEqual(now.getFullYear());
				expect(ts_as_date.getDay()).toEqual(now.getDay());
				expect(ts_as_date.getMonth()).toEqual(now.getMonth());
				expect(ts_as_date.getHours()).toEqual(now.getHours());
				expect(ts_as_date.getMinutes()).toEqual(now.getMinutes());
			}
		});
	});
	
	var testThruUseCase = function(num_messages_to_send, thruHandler, test_id){
		var messages_to_send = [];
		for (var i = 0; i!= num_messages_to_send; ++i) {
			var o = {
				m : "message " + i,
				test_id : test_id
			};
			messages_to_send.push(o);
		}

		p.feed({
			channel: 'thru history',
			onhistory : thruHandler.onhistory,
			onopen: thruHandler.onopen,
			onclose: thruHandler.onclose,
			onmsgreceived: thruHandler.onmsgreceived,
			onmsgsent: thruHandler.onmsgsent,
			onerror: thruHandler.onerror
		});
		
		waitsFor(function() {
			return (1 == thruHandler.opens);
		},"feed open", BCC_TEST.TIMEOUT);
	
		runs(function() {
			expect(thruHandler.f).not.toBeNull();
			expect(thruHandler.f).not.toBeUndefined();
			expect(typeof thruHandler.f).toBe("object");
			expect(thruHandler.f.isOpen()).toEqual(true);
		});

		var numSent = 0;
		var sendNext = function () {
			numSent = thruHandler.out_messages.length;
			var m = messages_to_send.pop();
			thruHandler.f.send(m);
		};

		var messageSent = function() {
			return (thruHandler.out_messages.length > numSent);
		};

		for (var j = 0; j!= num_messages_to_send; ++j) {
			runs(sendNext);
			waitsFor(messageSent);
		}
	};
	
	var quantChannelUseCase = function(inputHandler, outputHandler){
		var msg1 = {s: "msg1", n: 1, d: new Date()};
		var msg2 = {s: "msg2", n: 2, d: new Date()};
		var msg3 = {s: "msg3", n: 3, d: new Date()};
		var msg4 = {s: "msg4", n: 4, d: new Date()};
		var msg5 = {s: "msg5", n: 5, d: new Date()};

		var passthrough_channel = {
			name: 'quant history',
			input_feed: 'i',
			output_feed: 'o'
		};
		
		p.feed({
			channel: passthrough_channel.name,
			name: passthrough_channel.input_feed,
			onhistory : inputHandler.onhistory,
			onopen: inputHandler.onopen,
			onclose: inputHandler.onclose,
			onmsgreceived: inputHandler.onmsgreceived,
			onmsgsent: inputHandler.onmsgsent,
			onerror: inputHandler.onerror
		});
		
		p.feed({
			channel: passthrough_channel.name,
			name: passthrough_channel.output_feed,
			onhistory : outputHandler.onhistory,
			onopen: outputHandler.onopen,
			onclose: outputHandler.onclose,
			onmsgreceived: outputHandler.onmsgreceived,
			onmsgsent: outputHandler.onmsgsent,
			onerror: outputHandler.onerror
		});
		
		waitsFor(function() {
			return ((1 == inputHandler.opens) && (1 == outputHandler.opens));
		}, "feed open", BCC_TEST.TIMEOUT);
		
		runs(function() {
			inputHandler.f.send(msg1);
		});
		
		waits(2000);
		
		runs(function(){
			inputHandler.f.send(msg2);
		});

		waits(2000);
		
		runs(function(){
			inputHandler.f.send(msg3);
		});
		waits(2000);
		
		runs(function(){
			inputHandler.f.send(msg4);
		});
		waits(2000);
		
		runs(function(){
			inputHandler.f.send(msg5);
		});
	};
});