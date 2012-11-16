describe("push stream", function () {
	beforeEach(function () {
		BCC_TEST.begin(this);
	});

	afterEach(function () {
		BCC_TEST.end(this);
	});
	
	it("should tokenize partial messages", function() {
		var i = 0,
				td = null,
				pd = null,
				data = [],
				expected_objects = [],
				parsed_objects = [],
				obj = null;


		data = BCC_TEST.buildPayload(1000);

		expected_objects.push(JSON.parse(data.join('')));

		var stream = new BCC.StreamTokenizer(function (o) {
			parsed_objects.push(o);
		});

		for (i in data) {
			obj = data[i];
		  stream.appendData(obj);
		}

		var actual_num_parsed = parsed_objects.length;
		var expected_num_parsed = expected_objects.length;
		expect(actual_num_parsed).toEqual(expected_num_parsed);
		
		for (i in parsed_objects) {
			pd = parsed_objects[i];
			td = expected_objects[i];
			expect(pd).toEqual(td);
		}

		expect(0).toEqual(stream.buffer.length);

		if (0 !== stream.buffer.length) {
			BCC.Log.error(stream.buffer, 'jasmine');
		}

	});
	
	it("should handle whitespace", function() {
		var i = 0,
				j = 0,
				td = null,
				pd = null,
				data = [],
				expected_objects = [],
				parsed_objects = [],
				obj = null,
				parsed_obj = null;


		data = BCC_TEST.buildPayload(100);
		obj = data.join('');
		parsed_obj = JSON.parse(obj);

		expected_objects.push(parsed_obj);
		expected_objects.push(parsed_obj);
		expected_objects.push(parsed_obj);
		expected_objects.push(parsed_obj);
		expected_objects.push(parsed_obj);
		expected_objects.push(parsed_obj);

		var stream = new BCC.StreamTokenizer(function (o) {
			parsed_objects.push(o);
		});

		stream.appendData(obj);
		stream.appendData('\n');
		stream.appendData(obj);
		stream.appendData(obj);
		stream.appendData('\n');
		stream.appendData(obj);
		stream.appendData(obj);
		stream.appendData('\n');
		stream.appendData(obj);

		var actual_num_parsed = parsed_objects.length;
		var expected_num_parsed = expected_objects.length;
		expect(actual_num_parsed).toEqual(expected_num_parsed);
		
		for (j in parsed_objects) {
			pd = parsed_objects[j];
			td = expected_objects[j];
			expect(pd).toEqual(td);
		}

		expect(0).toEqual(stream.buffer.length);

		if (0 !== stream.buffer.length) {
			BCC.Log.error(stream.buffer, 'jasmine');
		}
	});
	
	it("should handle nested objects", function() {
		var i = 0,
				j = 0,
				td = null,
				pd = null,
				expected_objects = [],
				parsed_objects = [],
				object_graph = {},
				object_graph_s = null;

		object_graph = {
			r1 : BCC_TEST.buildPayload(10),
			r2 : {
				nested1 : BCC_TEST.buildPayload(10),
				nested2 : BCC_TEST.buildPayload(10),
				nested3 : {
					leaf1 : BCC_TEST.buildPayload(10),
					leaf2 : BCC_TEST.buildPayload(10)
				}
			}
		};

		object_graph_s = JSON.stringify(object_graph);

		expected_objects.push(object_graph);

		var stream = new BCC.StreamTokenizer(function (o) {
			parsed_objects.push(o);
		});

		stream.appendData(object_graph_s);

		var actual_num_parsed = parsed_objects.length;
		var expected_num_parsed = expected_objects.length;
		expect(actual_num_parsed).toEqual(expected_num_parsed);
		
		for (j in parsed_objects) {
			pd = parsed_objects[j];
			td = expected_objects[j];
			expect(pd).toEqual(td);
		}

		expect(0).toEqual(stream.buffer.length);

		if (0 !== stream.buffer.length) {
			BCC.Log.error(stream.buffer, 'jasmine');
		}
	});
});