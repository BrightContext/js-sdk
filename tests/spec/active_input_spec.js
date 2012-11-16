describe("active inputs", function() {
	
	var active_channel = {
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
	
	it("allows adjusting message contract validation on the instance", function() {
		ctx.setUserActive();
		expect(ctx.activityFlag).toBe(true);
		
		ctx.setUserInactive();
		expect(ctx.activityFlag).toBe(false);
	});
	
	it("allows adjusting message contract validation statically", function() {
		expect(BCC.ContextInstance.activityFlag).toBe(true);
		
		BCC.userActive(false);
		expect(BCC.ContextInstance.activityFlag).toBe(false);
		
		BCC.userActive(true);
		expect(BCC.ContextInstance.activityFlag).toBe(true);
	});
	
	it("should vote up on consecutive messages", function() {
		var initial_value = 100;
		var updated_value = 110;
		var msg = {n: initial_value};
		var msg1 = {n: updated_value};
		var inputHandler = new BCC_TEST.Listener();
		quantChannelUseCase(active_channel, msg, inputHandler);
		
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
		});
	});
	
	it("should vote down on consecutive messages", function() {
		var initial_value = 100;
		var updated_value = 90;
		var msg = {n: initial_value};
		var msg1 = {n: updated_value};
		var inputHandler = new BCC_TEST.Listener();
		quantChannelUseCase(active_channel, msg, inputHandler);
		
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
		});
	});
	
	it("should vote unchanged on consecutive messages", function() {
		var initial_value = 100;
		var updated_value = 100;
		var msg = {n: initial_value};
		var msg1 = {n: updated_value};
		var inputHandler = new BCC_TEST.Listener();
		quantChannelUseCase(active_channel, msg, inputHandler);
		
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
		});
	});
	
	it("should not switch from update to initial on vote change", function() {
		var initial_value = 100;
		var male = "M";
		var female = "F";
		var updated_value = 120;
		var msg = {vote: initial_value, sex: male};
		var msg1 = {vote: updated_value, sex: male};
		var inputHandler = new BCC_TEST.Listener();
		quantChannelUseCase(active_channel_with_dim, msg, inputHandler);
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send", BCC_TEST.TIMEOUT);
		
		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			
			for (var i in inputHandler.out_messages){
				var m = inputHandler.out_messages[i];
				expect(m.vote).toEqual(msg.vote);
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
				expect(m.vote).toEqual(updated_value - initial_value);
			}
		});
	});

	it("should switch from update to initial on dimension change", function() {
		var initial_value = 100;
		var updated_value = 120;
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
				expect(m.vote).toEqual(msg.vote);
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
		});
	});

	it("should queue only one update", function() {
		var initial_value = 100;
		var updated_value1 = 110;
		var updated_value2 = 120;
		var updated_value3 = 150;
		var msg = {n: initial_value};
		var msg1 = {n: updated_value1};
		var msg2 = {n: updated_value2};
		var msg3 = {n: updated_value3};
		
		var inputHandler = new BCC_TEST.Listener();
		quantChannelUseCase(active_channel, msg, inputHandler);
		
		runs(function(){
			inputHandler.f.send(msg1);
			inputHandler.f.send(msg2);
			inputHandler.f.send(msg3);
		});
		
		waitsFor(function() {
			return (0 !== inputHandler.out_messages.length);
		}, "feed message send", BCC_TEST.TIMEOUT);

		waits(BCC_TEST.TIMEOUT);

		runs(function() {
			expect(inputHandler.errors.length).toEqual(0);
			expect(inputHandler.out_messages.length).toEqual(2);
			expect(inputHandler.out_messages[0].n).toEqual(initial_value);
			expect(inputHandler.out_messages[1].n).toEqual(updated_value3 - initial_value);
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