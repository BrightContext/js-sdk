describe("metrics", function () {
	var metrics;

	beforeEach(function () {
		BCC_TEST.begin(this);

		metrics = new BCC.Util.Metrics();
	});

	afterEach(function () {
		metrics.print();

		BCC_TEST.end(this);
	});
	
	it("should increment values", function () {
		expect(metrics.inc('x')).toEqual(1);
		expect(metrics.get('x')).toEqual(1);
		expect(metrics.inc('x')).toEqual(2);
		expect(metrics.get('x')).toEqual(2);
	});

	it("should decrement values", function() {
		expect(metrics.dec('y')).toEqual(-1);
		expect(metrics.get('y')).toEqual(-1);
		expect(metrics.dec('y')).toEqual(-2);
		expect(metrics.get('y')).toEqual(-2);

		expect(metrics.inc('z')).toEqual(1);
		expect(metrics.get('z')).toEqual(1);
		expect(metrics.dec('z')).toEqual(0);
		expect(metrics.get('z')).toEqual(0);
	});

	it("should support writing specific values", function() {
		expect(metrics.get('something')).toEqual(0);
		expect(metrics.set('something', 5)).toEqual(5);
		expect(metrics.get('something')).toEqual(5);

		expect(metrics.inc('somethingelse')).toEqual(1);
		expect(metrics.get('somethingelse')).toEqual(1);
		expect(metrics.set('somethingelse', 10)).toEqual(10);
		expect(metrics.get('somethingelse')).toEqual(10);
	});

});