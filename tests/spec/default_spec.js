describe("Jasmine", function() {
		it("should be sane", function() {
				expect(true).toEqual(true);
		});

		it ("should not have any replacement variables", function() {
			expect(BCC.BASE_URL).not.toMatch(/\$/);
			expect(BCC.STATIC_URL).not.toMatch(/\$/);
		});
});