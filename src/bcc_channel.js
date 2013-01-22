//-----------------------------------------------------------------
// Copyright 2012 BrightContext Corporation
//
// Licensed under the MIT License defined in the
// LICENSE file.  You may not use this file except in
// compliance with the License.
//-----------------------------------------------------------------

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
    };

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
                  /*var ok = array1.every(function(e1) {
                      return array2.some(function(e2) {
                          return (e1 == e2);
                      });
                  });
                  return ok;*/
                  var ok = checkArrayElements(array1, array2);
                  return ok;
              } else {
                  return false;
              }
          } else {
              return false;
          }
    };
    
    var checkArrayElements = function(array1, array2){
       for(var index1 = 0; index1 < array1.length; index1++){
            var itemFound = false;
            var ele1 = array1[index1];
            for(var index2 = 0; index2 < array2.length; index2++){
                var ele2 = array2[index2];
                if(ele1 == ele2){
                    itemFound = true;
                    break;
                }
            }
            if(!itemFound)
                 return false;
        }
        return true;
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
        var arr = [];
        for(var index in list){
            if(list[index].feedType == ft)
                 arr.push(list[index]);
        }
        return (0 === arr.length) ? null: arr;
    };
    this._filterByName = function(list, n) {
        var f = null;
        for(var index in list){
            if(list[index].name == n){
                f = list[index];
                break;
            }
        }
        return f;
    };

    //this._init = function() {
    //};
    //
    //this._init();
};