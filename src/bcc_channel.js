BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

/**
 * @class Holds the metadata about all the feeds on a channel.
 * Use this when you need more information about a channel in order to select the correct feed before calling <code>project.feed(...)</code>
 * An example of when this might be used would be a real-time reporting application that supports graphing any feed output from any channel.
 * In that case, feed names would not necessarily be known, and channel metadata would need to be inspected first before knowing what is available
 * on a channel.
 * When the feed name is known, simply avoid <code>project.channel</code> and use <code>project.feed</code>
 * @constructor
 * @param {object} description The channel metadata containing feed information
 * @description
 * Channel objects should not be created manually, instead they are created using <code>project.channel(...)</code>
 * @see BCC.Project#channel
 * @see BCC.Project#feed
 */
BCC.Channel = function(description) {
    this._md = description;

    this._I = "IN";
    this._O = "OUT";
    this._T = "THRU";

    /** @returns {string} The name of the channel */
    this.name = function() {
        return this._md.channelName;
    };
    
    /** @returns {string} The type of the channel.  <code>UNPROCESSED</code> or <code>PROCESSED</code> */
    this.type = function() {
        return this._md.channelType;
    }

    /** @returns {Array} All the feed metadata inside the channel */
    this.feeds = function() {
        return this._md.feeds;
    };
    
    /**
     * select a feed by name
     * @param {string} n Name of the feed
     * @returns {object} Metadata about a particular feed with the given name
     * @example
     * {
     *   "id" : 23,
     *   "feedType" : "THRU",
     *   "name" : "default",
     *   "filters" : [
     *     "subChannel"
     *   ]
     * }
     */
    this.feed = function(n) {
        return this._filterByName(this.feeds(), n);
    };

    /** @returns {Array} All the metadata about input feeds */
    this.inputs = function() {
        return this._filterByType(this.feeds(), this._I);
    };
    
    /**
     * select an input feed by name
     * @param {string} n Name of the feed
     * @returns {object} Metadata about a particular input feed with the given name
     */
    this.input = function(n) {
        return this._filterByName(this.inputs(), n);
    };

    /** @returns All the metadata about output feeds */
    this.outputs = function() {
        return this._filterByType(this.feeds(), this._O);
    };
    
    /**
     * select an output feed by name
     * @param {string} n Name of the feed
     * @returns {object} Metadata about a particular output feed with the given name
     */
    this.output = function(n) {
        return this._filterByName(this.outputs(), n);
    };

    var areBothArraysTheSame = function(array1, array2) {
          var bothArraysExist = (( !! array1) && ( !! array2));
          if (bothArraysExist) {
              if (array1.length == array2.length) {
                  var ok = array1.every(function(e1) {
                      return array2.some(function(e2) {
                          return (e1 == e2);
                      });
                  });
                  return ok;
              } else {
                  return false;
              }
          } else {
              return false;
          }
    };

    this.validFilter = function(feedInfo, filterObj) {
        if ("undefined" == typeof(filterObj)) {
            var ok = (("undefined" == typeof(feedInfo)) || ("undefined" == typeof(feedInfo.filters)));
            return ok;
        } else {
            if ("object" === typeof(filterObj)) {
                var array1 = [];
                for (var k in filterObj) {
                    array1.push(k);
                }
                var array2 = feedInfo.filters;
                return areBothArraysTheSame(array1,array2);
            } else {
                return false;
            }
        }
    };

    this._filterByType = function(list, ft) {
        return list.filter(function(o) {
            return o.feedType == ft;
        });
    };
    this._filterByName = function(list, n) {
        var r = list.filter(function(o) {
            return (o.name == n);
        });
        return (0 === r.length) ? null: r[0];
    };

    //this._init = function() {
    //};
    //
    //this._init();
};