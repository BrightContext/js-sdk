describe("processed feeds", function() {
	
	var passthrough_channel = {
		name: 'passthrough',
		input_feed: 'i',
		output_feed: 'o'
	};

	var ctx = null;
	var p = null;
	
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
	
	it("should throw error if message is not a valid json", function() {
		var msg = "hello";
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.errors.length);
		}, "feed message send", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(1);
			expect(inputHandler.errors[0]).toEqual("Message contract not honored. Cannot parse message to JSON");
			expect(outputHandler.in_messages.length).toEqual(0);
		});
	});
	
	it("should throw error on wrong field type (string in place of number)", function() {
		var msg = { s: "test string", d: new Date(1343805046698), n: "test", l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.errors.length);
		}, "feed message send", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(1);
			expect(inputHandler.errors[0]).toEqual("Message contract not honored. Fields with errors : n");
			expect(outputHandler.in_messages.length).toEqual(0);
		});
	});

	it("should throw error on wrong field type (object in place of number)", function() {
		var msg = { s: "test string", d: new Date(1343805046698), n: {test: "test"}, l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.errors.length);
		}, "feed message send", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(1);
			expect(inputHandler.errors[0]).toEqual("Message contract not honored. Fields with errors : n");
			expect(outputHandler.in_messages.length).toEqual(0);
		});
	});
	
	it("should not throw error on loose field types (number as string in place of number)", function() {
		var msg = { s: "test", d: new Date(1343805046698), n: "100", l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send" , BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			expect(outputHandler.errors.length).toEqual(0);
			
			for (var i in outputHandler.in_messages){
				var m = outputHandler.in_messages[i];
				expect(m.s).toBe(msg.s);
				
				expect(m.d).not.toBeNull();
				expect(m.d).not.toBeUndefined();
				expect(m.d.getTime()).toEqual(new Date(msg.d).getTime());
				
				expect(m.n).toEqual(msg.n);
			}
		});
	});

	it("should throw error on wrong field type (object in place of string)", function() {
		var msg = { s: {test: "test"}, d: new Date(1343805046698), n: 100, l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.errors.length);
		}, "feed message send", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(1);
			expect(inputHandler.errors[0]).toEqual("Message contract not honored. Fields with errors : s");
			expect(outputHandler.in_messages.length).toEqual(0);
		});
	});

	it("should not throw error on loose field types (number in place of string)", function() {
		var msg = { s: 200.45, d: new Date(1343805046698), n: 100, l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send" , BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			expect(outputHandler.errors.length).toEqual(0);
			
			for (var i in outputHandler.in_messages){
				var m = outputHandler.in_messages[i];
				expect(m.s).toBe(msg.s);
				
				expect(m.d).not.toBeNull();
				expect(m.d).not.toBeUndefined();
				expect(m.d.getTime()).toEqual(new Date(msg.d).getTime());
				
				expect(m.n).toEqual(msg.n);
			}
		});
	});
	
	it("should not throw error on loose field types (boolean in place of string)", function() {
		var msg = { s: true, d: new Date(1343805046698), n: 100, l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send" , BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			expect(outputHandler.errors.length).toEqual(0);
			
			for (var i in outputHandler.in_messages){
				var m = outputHandler.in_messages[i];
				expect(m.s).toBe(msg.s);
				
				expect(m.d).not.toBeNull();
				expect(m.d).not.toBeUndefined();
				expect(m.d.getTime()).toEqual(new Date(msg.d).getTime());
				
				expect(m.n).toEqual(msg.n);
			}
		});
	});

	it("should throw error on wrong field type (string in place of date)", function() {
		var msg = { s: "test string", d: "hello", n: 100, l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.errors.length);
		}, "feed message send", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(1);
			expect(inputHandler.errors[0]).toEqual("Message contract not honored. Fields with errors : d");
			expect(outputHandler.in_messages.length).toEqual(0);
		});
	});

	it("should throw error on wrong field type (string in place of list)", function() {
		var msg = { s: "test string", d: new Date(), n: 100, l: 'sending string intead of list', m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.errors.length);
		}, "feed message send", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(1);
			expect(inputHandler.errors[0]).toEqual("Message contract not honored. Fields with errors : l");
			expect(outputHandler.in_messages.length).toEqual(0);
		});
	});
	
	it("should throw error on wrong field type (string in place of map)", function() {
		var msg = { s: "test string", d: new Date(), n: 100, l: [1,2,3], m: 'string instead of map', b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.errors.length);
		}, "feed message send", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(1);
			expect(inputHandler.errors[0]).toEqual("Message contract not honored. Fields with errors : m");
			expect(outputHandler.in_messages.length).toEqual(0);
		});
	});

	it("should throw error on wrong field type (string in place of boolean)", function() {
		var msg = { s: "test string", d: new Date(), n: 100, l: [1,2,3], m: { "key" : "value"}, b: 'string instead of boolean' };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.errors.length);
		}, "feed message send", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(1);
			expect(inputHandler.errors[0]).toEqual("Message contract not honored. Fields with errors : b");
			expect(outputHandler.in_messages.length).toEqual(0);
		});
	});

	it("should not throw error on loose field types (number in place of date)", function() {
		var msg = { s: "test", d: 1343805046698, n: 100, l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send" , BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			expect(outputHandler.errors.length).toEqual(0);
			
			for (var i in outputHandler.in_messages){
				var m = outputHandler.in_messages[i];
				expect(m.s).toBe(msg.s);
				
				expect(m.d).not.toBeNull();
				expect(m.d).not.toBeUndefined();
				expect(m.d.getTime()).toEqual(new Date(msg.d).getTime());
				
				expect(m.n).toEqual(msg.n);
			}
		});
	});

	it("should throw error on failing min validation", function() {
		var msg = { s: "test string", d: 200, n: -100, l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.errors.length);
		}, "feed message send", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(1);
			expect(inputHandler.errors[0]).toEqual("Message contract not honored. Fields with errors : n");
			expect(outputHandler.in_messages.length).toEqual(0);
		});
	});

	it("should throw error on failing max validation", function() {
		var msg = { s: "test string", d: 200, n: 1500, l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.errors.length);
		}, "feed message send", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(1);
			expect(inputHandler.errors[0]).toEqual("Message contract not honored. Fields with errors : n");
			expect(outputHandler.in_messages.length).toEqual(0);
		});
	});

	it("should throw error on missing field", function() {
		var msg = { s: "test string", d: new Date(1343805046698), l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(true);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.errors.length);
		}, "feed message send", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(1);
			expect(inputHandler.errors[0]).toEqual("Message contract not honored. Message incomplete");
			expect(outputHandler.in_messages.length).toEqual(0);
		});
	});
	
	it("should not throw error on extra fields", function() {
		var msg = { s: "test string", d: new Date(1343805046698), n: 100, extra: "Howdy", l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send" , BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			expect(outputHandler.errors.length).toEqual(0);
			
			for (var i in outputHandler.in_messages){
				var m = outputHandler.in_messages[i];
				expect(m.s).toBe(msg.s);
				
				expect(m.d).not.toBeNull();
				expect(m.d).not.toBeUndefined();
				expect(m.d.getTime()).toEqual(new Date(msg.d).getTime());
				
				expect(m.n).toEqual(msg.n);
			}
		});
	});
	
	it("should not throw type error when validations are set off", function() {
		var msg = { s: 300, d: 1343805046698, n: "test", l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(false);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send" , BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			expect(outputHandler.errors.length).toEqual(0);
			
			for (var i in outputHandler.in_messages){
				var m = outputHandler.in_messages[i];
				expect(m.s).toBe(msg.s);
				
				expect(m.d).not.toBeNull();
				expect(m.d).not.toBeUndefined();
				expect(m.d.getTime()).toEqual(new Date(msg.d).getTime());
				
				expect(m.n).toEqual(msg.n);
			}
		});
	});
	
	it("should not throw min error when validations are set off", function() {
		var msg = { s: "Test", d: new Date(1343805046698), n: -300, l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(false);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send" , BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			expect(outputHandler.errors.length).toEqual(0);
			
			for (var i in outputHandler.in_messages){
				var m = outputHandler.in_messages[i];
				expect(m.s).toBe(msg.s);
				
				expect(m.d).not.toBeNull();
				expect(m.d).not.toBeUndefined();
				expect(m.d.getTime()).toEqual(new Date(msg.d).getTime());
				
				expect(m.n).toEqual(msg.n);
			}
		});
	});
	
	it("should not throw max error when validations are set off", function() {
		var msg = { s: "Test", d: new Date(1343805046698), n: 3000, l: [], m: {}, b: false };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		BCC.fieldMessageValidation(false);
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send" , BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			expect(outputHandler.errors.length).toEqual(0);
			
			for (var i in outputHandler.in_messages){
				var m = outputHandler.in_messages[i];
				expect(m.s).toBe(msg.s);
				
				expect(m.d).not.toBeNull();
				expect(m.d).not.toBeUndefined();
				expect(m.d.getTime()).toEqual(new Date(msg.d).getTime());
				
				expect(m.n).toEqual(msg.n);
			}
		});
	});
	
	it("should pass through values", function() {
		var msg = { s: "test string", d: new Date(1343805046698), n: 100, l: [ 3, 2, 1 ], m: { "test key" : "test value"}, b: true };
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		quantChannelUseCase(passthrough_channel, [msg], inputHandler, outputHandler);
		
		waitsFor(function() {
			return (0 !== outputHandler.in_messages.length);
		}, "feed message receive", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			expect(outputHandler.errors.length).toEqual(0);
			
			expect(outputHandler.in_messages.length).not.toEqual(0);
			
			for (var i in outputHandler.in_messages){
				var m = outputHandler.in_messages[i];
				expect(typeof m.s).toBe("string");
				expect(m.s).toBe(msg.s);
				
				expect(m.d).not.toBeNull();
				expect(m.d).not.toBeUndefined();
				expect(typeof m.d).toBe("object");
				expect(m.d.getTime()).toEqual(new Date(msg.d).getTime());
				
				expect(typeof m.n).toBe("number");
				expect(m.n).toEqual(msg.n);

				expect(m.l).toEqual([ 3, 2, 1]);
				expect(m.m).toEqual({ "test key" : "test value" });
				expect(m.b).toBe(true);
			}
		});

	});

	xit("should filter output", function() {
		var expected_sum_per_5_seconds = 5;

		var filtered_channel = {
			name: 'filtered',
			input_feed: 'i',
			output_feed: 'o',
			output_filter: { t: 'tag', v: expected_sum_per_5_seconds }
		};
		
		var msgs =[
			{t: 'tag', v: 1},
			{t: 'tag', v: 1},
			{t: 'tag', v: 1},
			{t: 'tag', v: 1},
			{t: 'tag', v: 1}
		];

		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();

		quantChannelUseCase(filtered_channel, msgs, inputHandler, outputHandler);

		// wait for 1 broadcasted aggregate
		waitsFor(function(argument) {
			return (1 == outputHandler.in_messages.length);
		}, "output message delivered", BCC_TEST.MESSAGE_TIMEOUT);

		// check and see if all aggregates pass our filter value
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			expect(outputHandler.errors.length).toEqual(0);
			
			expect(outputHandler.in_messages.length).not.toEqual(0);

			for (var i in outputHandler.in_messages) {
				var m = outputHandler.in_messages[i];
				expect(typeof m.v).toBe("number");
				expect(m.v).toEqual(filtered_channel.output_filter.v);
			}
		});

	});
	
	var quantChannelUseCase = function(channelInfo, msgs, inputHandler, outputHandler) {
		
		p.feed({
			channel: channelInfo.name,
			name: channelInfo.input_feed,
			onopen: inputHandler.onopen,
			onclose: inputHandler.onclose,
			onmsgreceived: inputHandler.onmsgreceived,
			onmsgsent: inputHandler.onmsgsent,
			onerror: inputHandler.onerror
		});
		
		p.feed({
			channel: channelInfo.name,
			name: channelInfo.output_feed,
			filter: channelInfo.output_filter,
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
			var timeoutInterval = setInterval(function() {
				if (0 === msgs.length) {
					clearTimeout(timeoutInterval);
				} else {
					inputHandler.f.send(msgs.shift());
				}
			}, 500);	// send two messages per second
		});
	};

});