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
 * @param {string} projectName Name of the project as defined in the management console.
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
BCC.Project = function(projectName) {
    var me = this;

    this._projectName = projectName;
    this._channelMetadataCache = {};

    /** @private */
    this.DEFAULT_FEED_NAME = "default";

    /** @private */
    this.DEFAULT_SUBCHANNEL_FILTER = "subChannel";

    /**
     * Used to open any feed with a single line of code using a settings object.
     * Fetches channel meta-data if needed, and opens the feed automatically unless otherwise specified.
     *
     * @param {object} feedDescription - settings object with the following properties:
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
     * @see BCC.Feed
     *
     * @example
     * var p = BCC.init('my api key').project('my project name');
     * 
     * p.feed({
     *   channel: 'my channel name',
     *   name: 'name of input or output, optional and can be left undefined when using Thru',
     *   filter: { optional filter object },
     *   writeKey: 'optional write key',
     *   onopen: function(feed) {
     *    // feed ready
     *   },
     *   onclose: function(feed) {
     *    // feed no longer available
     *   },
     *   onmsgreceived: function(feed, message) {
     *    // new message available
     *   },
     *   onmsgsent: function(feed, message) {
     *    // message was sent successfully
     *   },
     *   onhistory: function(feed, history) {
     *    // history is an array of feed messages that was requested by feed.history(...)
     *   },
     *   onerror: function(error) {
     *    // error object describing what went wrong
     *   }
     * });
     *
     * // when finished with a data stream call feed.close()
     * 
     */
    this.feed = function(feedDescription) {
        if ("object" != typeof(feedDescription)) return;

        if (("undefined" == typeof(feedDescription.channel)) || ("" === feedDescription.channel)) {
            if ("function" == typeof(feedDescription.onerror)) {
                feedDescription.onerror("channel name required");
            }
        }

        if (("undefined" == typeof(feedDescription.name)) || ("" === feedDescription.name)) {
            feedDescription.name = me.DEFAULT_FEED_NAME;
        }

        me.channel(feedDescription.channel,
        function(chan, chanMdError) {
            if (null !== chanMdError) {
                if ("function" == typeof(feedDescription.onerror)) {
                    feedDescription.onerror(chanMdError);
                }
                return;
                // bail on error
            }

            var n = ("UNPROCESSED" == chan.type()) ? me.DEFAULT_FEED_NAME : feedDescription.name;
            var feedInfo = chan.feed(n);
            
            if (null !== feedInfo) {
                var procId = feedInfo.id;

                // with empty string filters on thru feeds, use default sub channel
                if (("undefined" == typeof(feedDescription.filter)) || ("" === feedDescription.filter)) {
                    feedDescription.filter = {};
                    if (feedInfo.feedType == BCC.Feed.UNPROCESSED_TYPE) {
                        if ("string" == typeof(feedDescription.filter)) {
                            feedDescription.filter[me.DEFAULT_SUBCHANNEL_FILTER] = feedDescription.filter;
                        } else if ("string" === typeof(feedDescription.name)) {
                            feedDescription.filter[me.DEFAULT_SUBCHANNEL_FILTER] = feedDescription.name;
                        } else {
                            feedDescription.filter[me.DEFAULT_SUBCHANNEL_FILTER] = me.DEFAULT_FEED_NAME;
                        }
                    }
                }

                var f = null;
                var userFilter = feedDescription.filter;
                if ("string" === typeof(userFilter)) {
                  // when user does pass a filter, if it was passed as a string, parse it in good faith
                  try {
                    userFilter = JSON.parse(userFilter);
                  } catch (parseEx) {
                    BCC.Log.warn(parseEx);
                    
                    if ("function" == typeof(feedDescription.onerror)) {
                      feedDescription.onerror(parseEx);
                    }
                  }
                }

                // validate the filter and create the feed
                if (chan.validFilter(feedInfo, userFilter)) {
                    f = new BCC.Feed(procId, userFilter);
                } else {
                    f = new BCC.Feed(procId);
                }

                // support for both mixed case and all lowercase
                if (f) {
                    if ("string" === typeof(feedDescription.writeKey)) {
                      f.setWriteKey(feedDescription.writeKey);
                    } else if ("string" === typeof(feedDescription.writekey)) {
                      f.setWriteKey(feedDescription.writekey);
                    }
                }

                // event wiring
                if ("function" == typeof(feedDescription.onopen)) {
                  f.onopen = feedDescription.onopen;
                }
                
                if ("function" == typeof(feedDescription.onerror)) {
                  f.onerror = feedDescription.onerror;
                }

                f.onhistory = function(h) {
                    if ("function" == typeof(feedDescription.onhistory)) {
                        feedDescription.onhistory(f, h);
                    }
                };

                f.onmsgreceived = function(msg) {
                    if ("function" == typeof(feedDescription.onmsgreceived)) {
                        feedDescription.onmsgreceived(f, msg);
                    }
                };

                f.onmsgsent = function(msg) {
                    if ("function" == typeof(feedDescription.onmsgsent)) {
                        feedDescription.onmsgsent(f, msg);
                    }
                };

                f.onclose = function(closedFeed) {
                    if ("function" == typeof(feedDescription.onclose)) {
                        feedDescription.onclose(closedFeed);
                    }
                };

                // open
                BCC.ContextInstance.openFeed(f);
            } else {
                if ("function" == typeof(feedDescription.onerror)) {
                    feedDescription.onerror("No feed named '" + feedDescription.name + "' on channel '" + feedDescription.channel + "'");
                }
            }
        });
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
            if ("string" != typeof(me._projectName)) return;

            var getChannel = new BCC.Command("GET", "/channel/description.json", {
                name: channelName,
                project: me._projectName
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
