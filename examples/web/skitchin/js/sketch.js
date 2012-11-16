var sketch = function(surfaceElement, initialHeight, initialWidth) {
	var me = this;
	
	var paper = Raphael(surfaceElement, initialHeight, initialWidth);
	var surface = $('#'+surfaceElement);
	var toolbox = null;
	var currenttool = null;
	var currentstrokecolor = [0,0,0];
	var eventhandlers = {};
	
	this.EVENTS = {
		DRAW: 'draw'
	};
	
	this.TOOLS = {
		PENCIL: 'pencil',
		LINE: 'line',
		BOX: 'box',
		CIRCLE: 'circle',
		MARKER: 'marker'
	};
	
	this.selectTool = function(t) {
		currenttool = toolbox[t];
	};
	
	this.selectStrokeColor = function(r,g,b) {
		currentstrokecolor = [r,g,b];
	};
	
	this.resize = function(w,h) {
		paper.setSize(w,h);
	};
	
	this.bind = function(eventname, eventhandler) {
		var h = eventhandlers[eventname];
		if (!h) {
			h = [];
		}
		h.push(eventhandler);
		eventhandlers[eventname] = h;
	};
	
	this.draw = function(memento) {
		toolbox[memento.t].thaw(memento);
	};
	
	
	
	var _raiseArtifactDrawnEvent = function(m) {
		var h = eventhandlers[me.EVENTS.DRAW];
		
		if (h) {
			for (var i in h) {
				var f = h[i];
				if ('function' === typeof(f)) {
					f(m);
				}
			}
		}
	};
	
	var _captureEvents = function() {
		surface.bind('mousedown', function(e) {
			if (currenttool) {
				var p = _getPositionFromMouseEvent(e);
				_beginTool(currenttool, p.x, p.y);
			}

			e.preventDefault(); return false;
		});
		surface.bind('mousemove', function(e) {
			if (currenttool) {
				var p = _getPositionFromMouseEvent(e);
				_updateTool(currenttool, p.x, p.y);
			}

			e.preventDefault(); return false;
		});
		surface.bind('mouseup', function(e) {
			if (currenttool) {
				var p = _getPositionFromMouseEvent(e);
				_endTool(currenttool, p.x, p.y);
			}

			e.preventDefault(); return false;
		});
		
		surface.bind('touchstart', function(evt) {
			var e = evt.originalEvent;
			if (e.touches.length > 1) return;
			
			if (currenttool) {
				var p = _getPositionFromTouchEvent(e);
				_beginTool(currenttool, p.x, p.y);
			}
			
			e.preventDefault(); return false;
		});
		surface.bind('touchmove', function(evt) {
			var e = evt.originalEvent;
			if (e.touches.length > 1) return;
			
			if (currenttool) {
				var p = _getPositionFromTouchEvent(e);
				_updateTool(currenttool, p.x, p.y);
			}
		
			e.preventDefault(); return false;
		});
		
		var touchEnd = function(evt) {
			var e = evt.originalEvent;
			
			if (currenttool) {
				var p = _getPositionFromTouchEvent(e);
				_endTool(currenttool, p.x, p.y);
			}
		
			e.preventDefault(); return false;
		};
		surface.bind('touchend', touchEnd);
		surface.bind('touchcancel', touchEnd);
	};
	
	var _beginTool = function(t, x, y) {
		t.begin(x, y);
		t.stroke(currentstrokecolor);
	};
	
	var _updateTool = function(t, x, y) {
		t.act(x, y);
	};
	
	var _endTool = function(t, x, y) {
		t.end(x, y);
		_raiseArtifactDrawnEvent(t.freeze());
	};
	
	var _buildToolbox = function() {
		toolbox = {
			'pencil' : new pencil(),
			'line' : new line(),
			'box' : new box(),
			'circle' : new circle(),
			'marker' : new marker()
		};
	};
	
	var _getPositionFromMouseEvent = function(e) {
		var offset = surface.offset();
		var x = e.pageX - offset.left;
		var y = e.pageY - offset.top;
		var p = {x:x,y:y};
		return p;
	};
	
	var _getPositionFromTouchEvent = function(e) {
		var offset = surface.offset();
		var t = (e.changedTouches.length != 0) ? e.changedTouches[0] : e.touches[0];
		var x = t.pageX - offset.left;
		var y = t.pageY - offset.top;
		var p = {x:x,y:y};
		return p;
	};
	
	var _defaultStrokeFn = function(color, artifact) {
		var e = artifact || this.artifact;
		
		if (e) {
			var r = color[0],
				g = color[1],
				b = color[2];
			
			e.attr('stroke', 'rgb('+r+','+g+','+b+')');
		}
	};
	
	var _defaultEndFn = function(x, y) {
		this.artifact = null;
	};
	
	var pencil = function() {
		this.begin = function(x, y, e) {
			this.p = 'M' + x + ',' + y;
			this.artifact = paper.path(this.p);
		};
		
		this.act = function(x, y, e) {
			if (this.artifact) {
				this.p += 'L' + x + ',' + y;
				this.artifact.attr('path', this.p);
			}
		};
		
		this.freeze = function() {
			var m = {
				t: me.TOOLS.PENCIL,
				d: this.p,
				s: currentstrokecolor
			};
			return m;
		};
		
		this.thaw = function(m) {
			var line = paper.path(m.d);
			this.stroke(m.s, line);
		};
		
		this.end = _defaultEndFn;
		this.stroke = _defaultStrokeFn;
	};
	
	var line = function() {
		this.begin = function(x, y) {
			this.startX = x;
			this.startY = y;
			this.p = 'M' + x + ',' + y;
			this.artifact = paper.path(this.p);
		};
		
		this.act = function(x, y) {
			if (this.artifact) {
				this.artifact.attr('path', this.p + 'L' + x + ',' + y);
				this.endX = x;
				this.endY = y;
			}
		};
		
		this.freeze = function() {
			var m = {
				t: me.TOOLS.LINE,
				d: [this.startX, this.startY, this.endX, this.endY],
				s: currentstrokecolor
			};
			return m;
		};
		
		this.thaw = function(m) {
			var path = 'M' + m.d[0] + ',' + m.d[1] + 'L' + m.d[2] + ',' + m.d[3];
			var line = paper.path(path);
			this.stroke(m.s, line);
		};
		
		this.end = _defaultEndFn;
		this.stroke = _defaultStrokeFn;
	};
	
	var box = function() {
		this.begin = function(x, y) {
			this.startX = x;
			this.startY = y;
			this.artifact = paper.rect(x,y,1,1);
		};
		
		this.act = function(x, y) {
			if (this.artifact) {
				var dx = x - this.startX;
				var dy = y - this.startY;
				
				if (dx > 0) {
					this.artifact.attr('width',dx);
				} else {
					this.artifact.attr('width',Math.abs(dx));
					this.artifact.attr('x', x);
				}
				
				if (dy > 0) {
					this.artifact.attr('height',dy);
				} else {
					this.artifact.attr('height',Math.abs(dy));
					this.artifact.attr('y', y);
				}
				
				this.dimensions = [
					this.artifact.attr('x'),
					this.artifact.attr('y'),
					this.artifact.attr('width'),
					this.artifact.attr('height')
				];
			}
		};
		
		this.freeze = function() {
			var m = {
				t: me.TOOLS.BOX,
				d: this.dimensions,
				s: currentstrokecolor
			};
			return m;
		};
		
		this.thaw = function(m) {
			var rect = paper.rect(m.d[0], m.d[1], m.d[2], m.d[3]);
			this.stroke(m.s, rect);
		};
		
		this.end = _defaultEndFn;
		this.stroke = _defaultStrokeFn;
	};
	
	var circle = function() {
		this.begin = function(x, y) {
			this.startX = x;
			this.startY = y;
			this.artifact = paper.ellipse(x,y,1,1);
		};	
		
		this.act = function(x, y) {
			if (this.artifact) {
				var dx = Math.abs(x - this.startX);
				var dy = Math.abs(y - this.startY);
				this.artifact.attr('rx',dx).attr('ry',dy);
				
				this.dimensions = [
					this.startX,
					this.startY,
					dx,
					dy
				];
			}
		};
		
		this.freeze = function() {
			var m = {
				t: me.TOOLS.CIRCLE,
				d: this.dimensions,
				s: currentstrokecolor
			};
			return m;
		};
		
		this.thaw = function(m) {
			var ellipse = paper.ellipse(m.d[0], m.d[1], m.d[2], m.d[3]);
			this.stroke(m.s, ellipse);
		};
		
		this.end = _defaultEndFn;
		this.stroke = _defaultStrokeFn;
	};
	
	var marker = function() {
		this.begin = function(x, y, e) {
			this.p = 'M' + x + ',' + y;
			this.artifact = paper.path(this.p);
		};
		
		this.act = function(x, y, e) {
			if (this.artifact) {
				this.p += 'L' + x + ',' + y;
				this.artifact.attr('path', this.p);
			}
		};
		
		this.stroke = function(color, artifact) {
			var e = artifact || this.artifact;

			if (e) {
				var r = color[0],
					g = color[1],
					b = color[2];

				e.attr('stroke', 'rgb('+r+','+g+','+b+')');
				e.attr('stroke-width', 20);
				e.attr('stroke-linecap', 'round');
				e.attr('stroke-linejoin', 'round');
			}
		};
		
		this.freeze = function() {
			var m = {
				t: me.TOOLS.MARKER,
				d: this.p,
				s: currentstrokecolor
			};
			return m;
		};
		
		this.thaw = function(m) {
			var line = paper.path(m.d);
			this.stroke(m.s, line);
		};
		
		this.end = _defaultEndFn;
	};
	
	_captureEvents();
	_buildToolbox();
	me.selectTool(me.TOOLS.PENCIL);
};