# Bright Context JavaScript SDK

Sign up
[http://www.brightcontext.com](http://www.brightcontext.com)

Documentation
[http://brightcontext.com/docs/js/](http://brightcontext.com/docs/js/)

Questions
[http://www.brightcontext.com/about/contact/](http://www.brightcontext.com/about/contact/)

### Pre-built CDN Hosting

    <!-- minified -->
    <script src="http://static.brightcontext.com/js-sdk/bcc.min.js"></script>
    
    <!-- development -->
    <script src="http://static.brightcontext.com/js-sdk/bcc.js"></script>

### Local Build

Dependencies

- [Node](http://nodejs.org/)
- [NPM](http://npmjs.org/)
- [PhantomJS](http://phantomjs.org/)
- [Grunt](https://github.com/cowboy/grunt)
- [JSDoc3](https://github.com/jsdoc3/jsdoc)

build, concat, minify and test:

    ./make.sh

documentation

    ./makedocs.sh

### CommonJS / Titanium / Node.js

When running in non-browser environments, BrightContext will work, but you need to provide a polyfill for a w3c compatible `WebSocket` and `XMLHttpRequest` implementation.  See the examples directory for an example of how to do this in node.js and titanium.

### License

MIT

