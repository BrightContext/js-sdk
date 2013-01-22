/** Example Titanium View
 * Copy build/bcc.js and lib/ti-websocket-client into your project's Resources folder
 */
function FirstView() {
	// boilerplate view stuff
	var self = Ti.UI.createView();
	
	// load brightcontext
	var BCC = require('ui/common/bcc');
	
	// inject Titanium polyfills for WebSocket and XMLHttpRequest
	BCC.WebSocket = require('ui/common/ti-websocket-client').WebSocket;
	BCC.XMLHttpRequest = Titanium.Network.createHTTPClient;
	
	// force off Flash and Streaming, they won't work in Titanium apps
	BCC.Env.FORCE_FLASHSOCKETS_OFF = true;
	BCC.Env.FORCE_FLASHGATEWAY_OFF = true;
	BCC.Env.FORCE_STREAMING_OFF = true;
	
	// turn on debug logging
	BCC.setLogLevel(BCC.LogLevel.DEBUG);
	
	// save a handle to use later
	self.BCC = BCC;
	
	// create a clickable label
	var label = Ti.UI.createLabel({
		color:'#000000',
		text: 'touch here',
		height:'auto',
		width:'auto'
	});
	self.add(label);
	
	label.addEventListener('click', function(e) {
		openTestFeed(self.BCC);
	});
	
	return self;
}

/** Opens a feed for an example Thru Channel */
function openTestFeed(BCC) {
	// initialize the context with your API Key
	// you should only call init() once during your apps lifecycle
	// multiple calls to init() will force a shutdown of any existing context
	var ctx = BCC.init('my api key');
	
	// open the project
	var p = ctx.project('my project name');
	
	// sequester a channel and open the data feed
	p.feed({
		channel: 'my thru channel name',
		onopen: function(thru_feed) {

			// once the feed is open, send a test message
			thru_feed.send({ "hello" : "titanium" });
		},
		onmsgreceived: function(thru_feed, message) {
			// all messages are will also echo back
			// see our own message and show it
			alert(message);

			// close the feed since we are done
			// you will probably want to wait until app shutdown to do this
			thru_feed.close();
		},
		onclose: function() {
			// do whatever cleanup here
			alert('closed');
		}
	});

	// at this point, if you wanted to leave the feed open and do stuff, just save a handle to F somewhere on your view
	// visit http://www.brightcontext.com/docs/js for more details
};

module.exports = FirstView;
