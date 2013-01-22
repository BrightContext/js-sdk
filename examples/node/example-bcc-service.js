
// load up brightcontext
var BCC = require('../../build/bcc.js');

// inject node.js polyfills for WebSocket and XMLHttpRequest
BCC.WebSocket = require('ws');
BCC.XMLHttpRequest = require('w3c-xmlhttprequest').XMLHttpRequest;

// force off Flash and Streaming, they won't work in node apps
BCC.Env.FORCE_FLASHSOCKETS_OFF = true;
BCC.Env.FORCE_FLASHGATEWAY_OFF = true;
BCC.Env.FORCE_STREAMING_OFF = true;

// turn on debug logging
BCC.setLogLevel(BCC.LogLevel.DEBUG);

// initialize the context with your API Key
// you should only call init() once during your apps lifecycle
// multiple calls to init() will force a shutdown of any existing context
var ctx = BCC.init(process.env.bccapikey);

// open the project
var p = ctx.project(process.env.bccprojectname);

// sequester a channel and open the data feed
p.feed({
	channel: process.env.bccthruchannelname,
	onopen: function(thru_feed) {

		// once the feed is open, send a test message
		thru_feed.send({ "hello" : "node" });
	},
	onmsgreceived: function(thru_feed, message) {
		// all messages are will also echo back
		// see our own message and show it
		console.log(message);

		// close the feed since we are done
		// you will probably want to wait until app shutdown to do this
		thru_feed.close();
	},
	onclose: function() {
		// do whatever cleanup here
		console.log('closed');
	}
});

// at this point, if you wanted to leave the feed open and do stuff, just save a handle to F somewhere
// visit http://www.brightcontext.com/docs/js for more details


