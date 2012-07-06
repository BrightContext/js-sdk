BCC = ("undefined" == typeof(BCC)) ? {}: BCC;

/**
 * @class Parses the incoming feed messages and convers them to JSON
 * @constructor
 * @param {function} cb Callback function that handles individual JSONs
 * @private
 */
BCC.StreamTokenizer = function (cb) {
	this.sanitizerCallback = 0;
	this.bufferPointer = 0;

	/**
	 * Called by the constructor to initialize the object
	 * @private
	 */
	this._init = function(){
		this.resetBuffer();
		this.setCallback(cb);
	};

	/**
	 * Resets the buffer with the last dispatched index
	 * @param {int} statementEndIndex
	 */
	this.resetBuffer = function(statementEndIndex) {
		if (typeof(statementEndIndex) == "number") {
			this.buffer = this.buffer.substring(statementEndIndex);
		} else {
			this.buffer = "";
			this.blockCounter = 0;
		}
	};
	
	/**
	 * Sets the callback function
	 * @param {function} cb Callback function
	 */
	this.setCallback = function(cb) {
		this.callback = cb;
	};

	/**
	 * Sets the sanitizer function
	 * @param {function} s sanitizer function
	 */
	this.setSanitizer = function(s) {
		this.sanitizerCallback = s;
	};

	/**
	 * Appends data to the buffer
	 * @param {string} d
	 */
	this.appendData = function(d) {
		this.buffer += d;
		this.analyzeBufferData();
	};

	/**
	 * Parses and dispatches JSONs from the buffer
	 */
	this.analyzeBufferData = function() {
		var jsonStartIndex = 0;
		var jsonEndIndex = 0;
		for (var i=0; i < this.buffer.length; ++i) {
			var c = this.buffer[i];
			if (c == '{') {
				if (0 == this.blockCounter) {
					jsonStartIndex = i;
				}
				++this.blockCounter;
			} else if (c == '}') {
				--this.blockCounter;
				if (0 == this.blockCounter) {
					jsonEndIndex = i + 1;
					this.handleCompleteMessage(jsonStartIndex, jsonEndIndex);
				} else if (0 > this.blockCounter) {
					BCC.Log.error("Invalid data stream, buffer reset","BCC.StreamTokenizer.analyzeBufferData");
					this.resetBuffer();
				}
			}
		}
		if(jsonEndIndex >0)
			this.resetBuffer(jsonEndIndex);
	};

	/**
	 * Dispatches a JSON to the callback function
	 * @param {int} jsonStartIndex
	 * @param {int} jsonEndIndex
	 */
	this.handleCompleteMessage = function(jsonStartIndex, jsonEndIndex) {
		try {
			var payload = this.buffer.substring(jsonStartIndex, jsonEndIndex);

			if (typeof(this.sanitizerCallback) == 'function') {
				payload = this.sanitizerCallback(payload);
			}

			var o; 
			eval("o="+payload);
			if (typeof(o) == "undefined") {
				BCC.Log.error("Unable to evaluate object from payload","BCC.StreamTokenizer.handleCompleteMessage");
			} else {
				this.callback(o, this);
			}
		} catch (ex) {
			this.resetBuffer();
		}
	};
	
	this._init();
};