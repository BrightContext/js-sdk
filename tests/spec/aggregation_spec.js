describe("aggregation", function() {
	
	var agg_channel = {
		name: 'agg n detail',
		input_feed: 'i',
		output_feed: 'o'
	};
	
	var active_channel = {
		name: 'active agg',
		input_feed: 'i',
		output_feed: 'o'
	};

	var active_no_agg = {
		name: 'active',
		input_feed: 'i',
		output_feed: 'o'
	};
	
	var active_channel_with_dim = {
		name: 'active with dim',
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
	
	it("should sum, average and count", function() {
		var msg = {n: 100};
		var msg1 = {n: 20};
		var msg_trigger = {n: 0};
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		
		//Time window is 1 minute. Clearing it out.
		waits(60*1000);

		runs(function(){
			p.feed({
				channel: agg_channel.name,
				name: agg_channel.input_feed,
				onopen: inputHandler.onopen,
				onclose: inputHandler.onclose,
				onmsgreceived: inputHandler.onmsgreceived,
				onmsgsent: inputHandler.onmsgsent,
				onerror: inputHandler.onerror
			});
			
			p.feed({
				channel: agg_channel.name,
				name: agg_channel.output_feed,
				onopen: outputHandler.onopen,
				onclose: outputHandler.onclose,
				onmsgreceived: outputHandler.onmsgreceived,
				onmsgsent: outputHandler.onmsgsent,
				onerror: outputHandler.onerror
			});
		});
		
		waitsFor(function() {
			return ((1 == inputHandler.opens) && (1 == outputHandler.opens));
		}, "feed open", BCC_TEST.TIMEOUT);
		
		runs(function() {
			inputHandler.f.send(msg);
			inputHandler.f.send(msg1);
		});
		
		waitsFor(function() {
			return (2 == inputHandler.out_messages.length);
		}, "feed message send", BCC_TEST.TIMEOUT);
		
		waitsFor(function() {
			return (2 == outputHandler.in_messages.length);
		}, "feed message receive", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function(){
			inputHandler.reset();
			outputHandler.reset();
		});
		
		//2 IN messages sent. Wait for 15 secs. Send a trigger message. Get back message with aggs. Check them.
		waits(15*1000);

		runs(function() {
			inputHandler.f.send(msg_trigger);
		});
		
		waitsFor(function() {
			return (1 == inputHandler.out_messages.length);
		}, "feed message send", BCC_TEST.TIMEOUT);
		
		waitsFor(function() {
			return (1 == outputHandler.in_messages.length);
		}, "feed message receive", BCC_TEST.MESSAGE_TIMEOUT);

		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			expect(outputHandler.errors.length).toEqual(0);
			
			expect(outputHandler.in_messages.length).not.toEqual(0);
			expect(outputHandler.in_messages.length).toEqual(1);
			
			for (var i in outputHandler.in_messages){
				var m = outputHandler.in_messages[i];
				expect(m.sum).not.toBeNull();
				expect(m.sum).not.toBeUndefined();
				expect(typeof m.sum).toEqual("number");
				expect(m.sum).toEqual(120);
				
				expect(m.avg).not.toBeNull();
				expect(m.avg).not.toBeUndefined();
				expect(typeof m.avg).toEqual("number");
				expect(m.avg).toEqual(60);
				
				expect(m.count).not.toBeNull();
				expect(m.count).not.toBeUndefined();
				expect(typeof m.count).toEqual("number");
				expect(m.count).toEqual(2);
			}
		});
		
		//Time window is 1 minute. Clearing it out.
		waits(60*1000);
	});
	
	it("should sum, average and count (active users)", function() {
		var msg = {n: 100};
		var msg1 = {n: 20};
		var msg_trigger = {n: 20};
		var inputHandler = new BCC_TEST.Listener();
		var outputHandler = new BCC_TEST.Listener();
		
		//Time window is 1 minute. Clearing it out.
		waits(60*1000);

		runs(function(){
			p.feed({
				channel: active_channel.name,
				name: active_channel.input_feed,
				onopen: inputHandler.onopen,
				onclose: inputHandler.onclose,
				onmsgreceived: inputHandler.onmsgreceived,
				onmsgsent: inputHandler.onmsgsent,
				onerror: inputHandler.onerror
			});
			
			
			p.feed({
				channel: active_channel.name,
				name: active_channel.output_feed,
				onopen: outputHandler.onopen,
				onclose: outputHandler.onclose,
				onmsgreceived: outputHandler.onmsgreceived,
				onmsgsent: outputHandler.onmsgsent,
				onerror: outputHandler.onerror
			});
		});
		
		waitsFor(function() {
			return ((1 == inputHandler.opens) && (1 == outputHandler.opens));
		}, "feed open", BCC_TEST.TIMEOUT);
		
		runs(function() {
			inputHandler.f.send(msg);
		});
		
		runs(function() {
			inputHandler.f.send(msg1);
		});
		
		waitsFor(function() {
			return (2 == inputHandler.out_messages.length);
		}, "feed message send", BCC_TEST.TIMEOUT);
		
		waitsFor(function() {
			return (2 == outputHandler.in_messages.length);
		}, "feed message receive", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function(){
			inputHandler.reset();
			outputHandler.reset();
		});
		
		//2 IN messages sent. Wait for 15 secs. Send a trigger message. Get back message with aggs. Check them.
		waits(15*1000);

		runs(function() {
			inputHandler.f.send(msg_trigger);
			BCC.userActive(false);
		});
		
		waitsFor(function() {
			return (1 == inputHandler.out_messages.length);
		}, "feed message send", BCC_TEST.TIMEOUT);
		
		waitsFor(function() {
			return (1 == outputHandler.in_messages.length);
		}, "feed message receive", BCC_TEST.MESSAGE_TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			expect(outputHandler.errors.length).toEqual(0);
			
			expect(outputHandler.in_messages.length).toEqual(1);
			
			for (var i in outputHandler.in_messages) {
				var m = outputHandler.in_messages[i];
				expect(m.sum).not.toBeNull();
				expect(m.sum).not.toBeUndefined();
				expect(typeof m.sum).toEqual("number");
				expect(m.sum).toEqual(20);
				
				expect(m.avg).not.toBeNull();
				expect(m.avg).not.toBeUndefined();
				expect(typeof m.avg).toEqual("number");
				expect(m.avg).toEqual(20);
				
				expect(m.count).not.toBeNull();
				expect(m.count).not.toBeUndefined();
				expect(typeof m.count).toEqual("number");
				expect(m.count).toEqual(1);
			}
		});
	});
	
	it("should revote after 30 secs", function() {
		var initial_value = 100;
		var updated_value = 110;
		var msg = {n: initial_value};
		var msg1 = {n: updated_value};
		var inputHandler = new BCC_TEST.Listener();
		quantChannelUseCase(active_no_agg, msg, inputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send", BCC_TEST.TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			
			for (var i in inputHandler.out_messages){
				var m = inputHandler.out_messages[i];
				expect(m.n).toEqual(msg.n);
			}
			inputHandler.reset();
		});

		runs(function(){
			inputHandler.f.send(msg1);
		});
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send", BCC_TEST.TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			for (var i in inputHandler.out_messages){
				var m = inputHandler.out_messages[i];
				expect(m.n).toEqual(updated_value - initial_value);
			}
			inputHandler.reset();
		});
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send", BCC_TEST.REVOTE_TIMER);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			for (var i in inputHandler.out_messages){
				var m = inputHandler.out_messages[i];
				expect(m.n).toEqual(updated_value);
			}
		});
	});
	
	it("should revote after 30 secs after dimension change", function() {
		var initial_value = 100;
		var updated_value = 110;
		var male = "M";
		var female = "F";
		var msg = {vote: initial_value, sex: male};
		var msg1 = {vote: updated_value, sex: female};
		var inputHandler = new BCC_TEST.Listener();
		quantChannelUseCase(active_channel_with_dim, msg, inputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send", BCC_TEST.TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			
			for (var i in inputHandler.out_messages){
				var m = inputHandler.out_messages[i];
				expect(m.vote).toEqual(initial_value);
			}
			inputHandler.reset();
		});

		runs(function(){
			inputHandler.f.send(msg1);
		});
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send", BCC_TEST.TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			for (var i in inputHandler.out_messages){
				var m = inputHandler.out_messages[i];
				expect(m.vote).toEqual(updated_value);
			}
			inputHandler.reset();
		});
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send", BCC_TEST.REVOTE_TIMER);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			for (var i in inputHandler.out_messages){
				var m = inputHandler.out_messages[i];
				expect(m.vote).toEqual(updated_value);
			}
		});
	});
	
	var quantChannelUseCase = function(chn, msg, inputHandler){
		p.feed({
			channel: chn.name,
			name: chn.input_feed,
			onopen: inputHandler.onopen,
			onclose: inputHandler.onclose,
			onmsgreceived: inputHandler.onmsgreceived,
			onmsgsent: inputHandler.onmsgsent,
			onerror: inputHandler.onerror
		});
		
		waitsFor(function() {
			return ((1 == inputHandler.opens));
		}, "feed open", BCC_TEST.TIMEOUT);
		
		runs(function() {
			inputHandler.f.send(msg);
		});
	};
});