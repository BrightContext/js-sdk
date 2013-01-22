//-----------------------------------------------------------------
// Copyright 2012 BrightContext Corporation
//
// Licensed under the MIT License defined in the
// LICENSE file.  You may not use this file except in
// compliance with the License.
//-----------------------------------------------------------------

BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

/**
 * @class Represents a single Project in the management console which contains Channels and Feeds.
 * Used to inspect Channel metadata and open Feeds of any type.
 * @constructor
 * @param {string} project_name Name of the project as defined in the management console.
 * @description
 * Project objects should not be created manually, but instead opened using an initialized context.
 * @see BCC
 * @see BCC.Context#project
 * @example
 * var ctx = BCC.init('apikey');
 * var p = ctx.project('project name');
 * p.feed({
 *  // settings obj
 * });
 */
BCC.Project = function(project_name) {
	var me = this;

	this._project_name = project_name;
	this._channelMetadataCache = {};

	/**
	 * Used to open any feed with a single line of code using a settings object.
	 * Fetches channel meta-data if needed, and opens the feed automatically unless otherwise specified.
	 *
	 * @param {object} fd - settings object with the following properties:
	 * <ul>
	 *  <li>channel</li>
	 *  <li>name</li>
	 *  <li>filter</li>
	 *  <li>writekey</li>
	 *  <li>onopen</li>
	 *  <li>onclose</li>
	 *  <li>onmsgreceived</li>
	 *  <li>onmsgsent</li>
	 *  <li>onhistory</li>
	 *  <li>onerror</li>
	 * </ul>
	 *
	 * <p><strong>channel</strong> - <em>string</em> - <strong>Required</strong> - Name of the channel as defined in the management console.</p>
	 * <p><strong>name</strong>  - <em>string</em> - Varies depending on channel type</p>
	 * <p>For QuantChannels: <strong>Required</strong>.  This is the name of the Input or the Output that was created using the management console.</p>
	 * <p>For ThruChannels: <strong>Optional</strong>. This can be any string to describe a sub-channel where any other traffic will be squelched.
	 * For example, if you had a lobby on a ThruChannel, this could be used to create private rooms apart from the main lobby.
	 * If not provided, the default sub-channel used is 'default'.
	 * </p>
	 * <p><strong>filter</strong> - <em>object</em> - Varies depending on feed configuration</p>
	 * <p>This is only required on QuantChannel Outputs when runtime parameter filtering is used.</p>
	 * <p>An object with one string key per filter parameter configured should be provided.
	 * For example, if the feed is an Output feed configured to take <code>lat</code> and <code>long</code> run time parameters,
	 * the object passed here should look like this <code>{ "lat": 37.332136, "long": -122.027829 }</code>.</p>
	 * <p>This is not required for Outputs that are configured to use filtering but take none of the filters as runtime parameters.
	 * This is also not required for Inputs or any other channel types, and should be left undefined unless required.
	 * Providing a filter when one is not required, or providing an improper or incomplete filter definition
	 * on feeds that do require one will fire BCC.Feed.onerror event handlers when attempting to open because the filter provided
	 * does not match what was defined.
	 * </p>
	 * <p><strong>writeKey</strong> - <em>string</em> - Varies depending on feed configuration</p>
	 * Write keys are off by default on feeds and need to be enabled using the management console.
	 * When turned on, this should be set to the write key that is generated.
	 * Using write keys is an easy way to provide public, <em>read-only</em> access to real time feeds
	 * and build a separate app that has <em>read-write</em> access to the same real time feeds.
	 * If a write key is not provided on feeds requiring one, the feeds will still open and provide data, but will not be writable.
	 * Only provide write keys on write key enabled feeds when writing will be done, and keep them out of your code otherwise.</p>
	 *
	 * <p><em>Feed event handlers<em></p>
	 * <p><strong>onopen</strong> - <em>function</em> - <strong>Optional</strong> - BCC.Feed.onopen handler</p>
	 * <p><strong>onclose</strong> - <em>function</em> - <strong>Optional</strong> - BCC.Feed.onclose handler</p>
	 * <p><strong>onmsgreceived</strong> - <em>function</em> - <strong>Optional</strong> - BCC.Feed.onmsgreceived handler</p>
	 * <p><strong>onmsgsent</strong> - <em>function</em> - <strong>Optional</strong> - BCC.Feed.onmsgsent handler</p>
	 * <p><strong>onhistory</strong> - <em>function</em> - <strong>Optional</strong> - BCC.Feed.onhistory handler</p>
	 * <p><strong>onerror</strong> - <em>function</em> - <strong>Optional</strong> - BCC.Feed.onerror handler</p>
	 *
	 * @returns feed object that will be ready in the future, after it has been opened.
	 * Listen for the <code>onopen</code> event to know when the feed returned is ready to use.
	 *
	 * @see BCC.Feed
	 *
	 * @example
	 *
	 * // initialize context and get a handle to the current project
	 * var p = BCC.init('my api key').project('my project name');
	 *
	 * // sequester a channel and open the feed.
	 * // the my_feed here is the same object as feed passed to each event handler
	 * // the feed will not be ready to use until the onopen event has fired
	 * p.feed({
	 *   channel: 'my channel name',
	 *   name: 'name of input or output', // can be left undefined when using a ThruChannel
	 *   filter: { optional filter object }, // one key/value pair for each server filter configured
	 *   writeKey: 'optional write key',	// leave it undefined unless you have one
	 *   onopen: function(feed) {
	 *    // feed ready for use
	 *    // can now do things like feed.send() or feed.history()
	 *   },
	 *   onclose: function(feed) {
	 *    // feed no longer available
	 *   },
	 *   onmsgreceived: function(feed, message) {
	 *    // new message was broadcasted
	 *   },
	 *   onmsgsent: function(feed, message) {
	 *    // message was sent successfully
	 *   },
	 *   onhistory: function(feed, history) {
	 *    // history is an array of feed messages that was requested by feed.history(...)
	 *   },
	 *   onerror: function(error) {
	 *    // error describing what went wrong, might be a string or object
	 *   }
	 * });	// returns same project instance so multiple .feed().feed() can be chained
	 *
	 * // when finished with a data stream call feed.close()
	 *
	 */
	this.feed = function(fd) {
		// bail if no listener was passed in
		if ('object' != typeof(fd)) return null;

		var f, wk, notify_error;

		notify_error = function (error_message) {
			if (fd) {
				if (BCC.Util.isFn(fd.onerror)) {
					fd.onerror(error_message);
				}
			}
		};

		// error on invalid project name
		if ('string' != typeof(me._project_name) || '' === me._project_name) {
			notify_error('invalid project name: ' + me._project_name);
			return;
		}

		// error on invalid channel name
		if ('string' != typeof(fd.channel) || '' === fd.channel) {
			notify_error('invalid channel name');
			return;
		}

		// support for both mixed case and all lowercase write key parameter
		if ("string" === typeof(fd.writeKey)) {
			wk = fd.writeKey;
		} else if ("string" === typeof(fd.writekey)) {
			wk = fd.writekey;
		}

		// make feed
		f = new BCC.Feed({
			project: me._project_name,
			channel: fd.channel,
			connector: fd.name || BCC.Feed.DEFAULT_FEED_NAME,
			filters: fd.filter
		}, wk);

		// event wiring
		
		
		if (BCC.Util.isFn(fd.onerror)) {
			f.onerror = fd.onerror;
		}

		f.onhistory = function(h) {
			if (BCC.Util.isFn(fd.onhistory)) {
				fd.onhistory(f, h);
			}
		};

		f.onmsgreceived = function(msg) {
			if (BCC.Util.isFn(fd.onmsgreceived)) {
				fd.onmsgreceived(f, msg);
			}
		};

		f.onmsgsent = function(msg) {
			if (BCC.Util.isFn(fd.onmsgsent)) {
				fd.onmsgsent(f, msg);
			}
		};

		f.onclose = function(closedFeed) {
			if (BCC.Util.isFn(fd.onclose)) {
				fd.onclose(closedFeed);
			}
		};

		// open
		BCC.ContextInstance.openFeed(f, function (open_error) {
			if (open_error) {
				BCC.Log.error('failed to open feed ' + f.shortDescription() + ' : ' + JSON.stringify(open_error), 'BCC.Project.feed');

				if (BCC.Util.isFn(fd.onerror)) {
					fd.onerror(open_error);
				}
			} else {
				if (BCC.Util.isFn(fd.onopen)) {
					fd.onopen(f);
				}
			}
		});

		return me;
	};

	/**
	 * Retrieve channel metadata
	 * @param {string} channelName Name of the channel as defined in the management console.
	 * @param {function} callback
	 * <p><strong>Optional</strong> Callback fired when complete with the following message signature:
	 * <code>function(channel, error)</code></p>
	 * <p><em>channel</em> is a BCC.Channel object with all the information about the channel as defined by the management console</p>
	 * <p><em>error</em> is null on success, otherwise the error encountered</p>
	 * @see BCC.Channel
	 * @example
	 * var p = BCC.init('my api key').project('my project name');
	 *
	 * p.channel('channel name', function(chan, err) {
	 *   if (!err) {
	 *     // use chan
	 *   }
	 * });
	 */
	this.channel = function(channelName, callback) {
		var cachedMd = me._channelMetadataCache[channelName];
		if ("undefined" !== typeof(cachedMd)) {
			if ("function" == typeof(callback)) {
				callback(cachedMd, null);
			}
		} else {
			if ("string" != typeof(channelName)) return;
			if ("string" != typeof(me._project_name)) return;

			var getChannel = new BCC.Command("GET", "/channel/description.json", {
				name: channelName,
				project: me._project_name
			});

			if ("function" == typeof(callback)) {
				getChannel.onresponse = function(msg) {
					cachedMd = new BCC.Channel(msg);
					me._channelMetadataCache[channelName] = cachedMd;
					callback(cachedMd, null);
				};
				getChannel.onerror = function(err) {
					callback(null, err);
				};
			}

			BCC.ContextInstance.sendCommand(getChannel);
		}
	};

	// this._init = function() {
	// }
	// this._init();
};
