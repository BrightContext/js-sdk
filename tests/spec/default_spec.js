describe("jasmine", function() {
	beforeEach(function () {
		BCC_TEST.begin(this);
	});

	afterEach(function () {
		BCC_TEST.end(this);
	});

	it("should be sane", function() {
		expect(true).toEqual(true);
	});

	it ("should not have any replacement variables", function() {
		expect(BCC.VERSION).not.toMatch(/\$/);
		expect(BCC.BASE_URL).not.toMatch(/\$/);
		expect(BCC.BASE_URL_SECURE).not.toMatch(/\$/);
		expect(BCC.STATIC_URL).not.toMatch(/\$/);
		expect(BCC.STATIC_URL_SECURE).not.toMatch(/\$/);
	});
});