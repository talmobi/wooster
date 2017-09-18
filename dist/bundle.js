(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.wooster = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
module.exports = function () {
	return /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g;
};

},{}],2:[function(require,module,exports){
'use strict';

var object        = require('es5-ext/object/valid-object')
  , stringifiable = require('es5-ext/object/validate-stringifiable-value')
  , forOf         = require('es6-iterator/for-of');

module.exports = function (text, style) {
	var result = '';
	text = stringifiable(text);
	object(style);
	forOf(text, function (char) { result += style[char] || char; });
	return result;
};

},{"es5-ext/object/valid-object":67,"es5-ext/object/validate-stringifiable-value":69,"es6-iterator/for-of":79}],3:[function(require,module,exports){
'use strict';

var d              = require('d')
  , assign         = require('es5-ext/object/assign')
  , forEach        = require('es5-ext/object/for-each')
  , map            = require('es5-ext/object/map')
  , primitiveSet   = require('es5-ext/object/primitive-set')
  , setPrototypeOf = require('es5-ext/object/set-prototype-of')
  , memoize        = require('memoizee')
  , memoizeMethods = require('memoizee/methods')

  , sgr = require('./lib/sgr')
  , mods = sgr.mods

  , join = Array.prototype.join, defineProperty = Object.defineProperty
  , max = Math.max, min = Math.min
  , variantModes = primitiveSet('_fg', '_bg')
  , xtermMatch, getFn;

// Some use cli-color as: console.log(clc.red('Error!'));
// Which is inefficient as on each call it configures new clc object
// with memoization we reuse once created object
var memoized = memoize(function (scope, mod) {
	return defineProperty(getFn(), '_cliColorData', d(assign({}, scope._cliColorData, mod)));
});

var proto = Object.create(Function.prototype, assign(map(mods, function (mod) {
	return d.gs(function () { return memoized(this, mod); });
}), memoizeMethods({
	// xterm (255) color
	xterm: d(function (code) {
		code = isNaN(code) ? 255 : min(max(code, 0), 255);
		return defineProperty(getFn(), '_cliColorData',
			d(assign({}, this._cliColorData, {
				_fg: [xtermMatch ? xtermMatch[code] : ('38;5;' + code), 39]
			})));
	}),
	bgXterm: d(function (code) {
		code = isNaN(code) ? 255 : min(max(code, 0), 255);
		return defineProperty(getFn(), '_cliColorData',
			d(assign({}, this._cliColorData, {
				_bg: [xtermMatch ? (xtermMatch[code] + 10) : ('48;5;' + code), 49]
			})));
	})
})));

var getEndRe = memoize(function (code) {
	return new RegExp('\x1b\\[' + code + 'm', 'g');
}, { primitive: true });

if (process.platform === 'win32') xtermMatch = require('./lib/xterm-match');

getFn = function () {
	return setPrototypeOf(function self(/*…msg*/) {
		var start = '', end = '', msg = join.call(arguments, ' '), conf = self._cliColorData
		  , hasAnsi = sgr.hasCSI(msg);
		forEach(conf, function (mod, key) {
			end    = sgr(mod[1]) + end;
			start += sgr(mod[0]);
			if (hasAnsi) {
				msg = msg.replace(getEndRe(mod[1]), variantModes[key] ? sgr(mod[0]) : '');
			}
		}, null, true);
		return start + msg + end;
	}, proto);
};

module.exports = Object.defineProperties(getFn(), {
	xtermSupported: d(!xtermMatch),
	_cliColorData: d('', {})
});

},{"./lib/sgr":9,"./lib/xterm-match":11,"d":19,"es5-ext/object/assign":46,"es5-ext/object/for-each":52,"es5-ext/object/map":59,"es5-ext/object/primitive-set":62,"es5-ext/object/set-prototype-of":63,"memoizee":99,"memoizee/methods":106}],4:[function(require,module,exports){
'use strict';

module.exports = '\x07';

},{}],5:[function(require,module,exports){
'use strict';

var from              = require('es5-ext/array/from')
  , iterable          = require('es5-ext/iterable/validate-object')
  , stringifiable     = require('es5-ext/object/validate-stringifiable')
  , repeat            = require('es5-ext/string/#/repeat')
  , getStrippedLength = require('./get-stripped-length');

module.exports = function (rows/*, options*/) {
	var options = Object(arguments[1]), cols = []
	  , colsOptions = options.columns || [];
	return from(iterable(rows), function (row, index) {
		return from(iterable(row), function (str, index) {
			var col = cols[index], strLength;
			if (!col) col = cols[index] = { width: 0 };
			str = stringifiable(str);
			strLength = getStrippedLength(str);
			if (strLength > col.width) col.width = strLength;
			return { str: str, length: strLength };
		});
	}).map(function (row) {
		return row.map(function (item, index) {
			var pad, align = 'left', colOptions = colsOptions && colsOptions[index];
			align = (colOptions && (colOptions.align === 'right')) ? 'right' : 'left';
			pad = repeat.call(' ', cols[index].width - item.length);
			if (align === 'left') return item.str + pad;
			return pad + item.str;
		}).join((options.sep == null) ? ' | ' : options.sep);
	}).join('\n') + '\n';
};

},{"./get-stripped-length":7,"es5-ext/array/from":25,"es5-ext/iterable/validate-object":36,"es5-ext/object/validate-stringifiable":70,"es5-ext/string/#/repeat":74}],6:[function(require,module,exports){
'use strict';

module.exports = {
	screen: '\x1b[2J',
	screenLeft: '\x1b[1J',
	screenRight: '\x1b[J',
	line: '\x1b[2K',
	lineLeft: '\x1b[1K',
	lineRight: '\x1b[K'
};

},{}],7:[function(require,module,exports){
'use strict';
/*
 * get actual length of ANSI-formatted string
 */

var strip = require('./strip');

module.exports = function (str) {
	return strip(str).length;
};

},{"./strip":15}],8:[function(require,module,exports){
'use strict';

var d = require('d');

module.exports = Object.defineProperties(require('./bare'), {
	windowSize: d(require('./window-size')),
	erase: d(require('./erase')),
	move: d(require('./move')),
	beep: d(require('./beep')),
	columns: d(require('./columns')),
	strip: d(require('./strip')),
	getStrippedLength: d(require('./get-stripped-length')),
	slice: d(require('./slice')),
	throbber: d(require('./throbber')),
	reset: d(require('./reset')),
	art: d(require('./art'))
});

},{"./art":2,"./bare":3,"./beep":4,"./columns":5,"./erase":6,"./get-stripped-length":7,"./move":12,"./reset":13,"./slice":14,"./strip":15,"./throbber":16,"./window-size":17,"d":19}],9:[function(require,module,exports){
'use strict';
/* CSI - control sequence introducer */
/* SGR - set graphic rendition */

var assign   = require('es5-ext/object/assign')
  , includes = require('es5-ext/string/#/contains')
  , forOwn   = require('es5-ext/object/for-each')
  , onlyKey  = require('es5-ext/object/first-key')
  , forEachRight = require('es5-ext/array/#/for-each-right')
  , uniq = require('es5-ext/array/#/uniq.js');

var CSI = '\x1b[';

var sgr = function (code) {
	return CSI + code + 'm';
};

sgr.CSI = CSI;

var mods = assign({
	// Style
	bold:      { _bold: [1, 22] },
	italic:    { _italic: [3, 23] },
	underline: { _underline: [4, 24] },
	blink:     { _blink: [5, 25] },
	inverse:   { _inverse: [7, 27] },
	strike:    { _strike: [9, 29] }

	// Color
}, ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
	.reduce(function (obj, color, index) {
		// foreground
		obj[color] = { _fg: [30 + index, 39] };
		obj[color + 'Bright'] = { _fg: [90 + index, 39] };

		// background
		obj['bg' + color[0].toUpperCase() + color.slice(1)] = { _bg: [40 + index, 49] };
		obj['bg' + color[0].toUpperCase() + color.slice(1) + 'Bright'] = { _bg: [100 + index, 49] };

		return obj;
	}, {}));

sgr.mods = mods;

sgr.openers = {};
sgr.closers = {};

forOwn(mods, function (mod) {
	var modPair = mod[onlyKey(mod)];

	sgr.openers[modPair[0]] = modPair;
	sgr.closers[modPair[1]] = modPair;
});

sgr.openStyle = function (mods, code) {
	mods.push(sgr.openers[code]);
};

sgr.closeStyle = function (mods, code) {
	forEachRight.call(mods, function (modPair, index) {
		if (modPair[1] === code) {
			mods.splice(index, 1);
		}
	});
};

/* prepend openers */
sgr.prepend = function (mods) {
	return mods.map(function (modPair, key) {
		return sgr(modPair[0]);
	});
};

/* complete non-closed openers with corresponding closers */
sgr.complete = function (mods, closerCodes) {
	closerCodes.forEach(function (code) {
		sgr.closeStyle(mods, code);
	});

	// mods must be closed from the last opened to first opened
	mods = mods.reverse();

	mods = mods.map(function (modPair, key) {
		return modPair[1];
	});

	// one closer can close many openers (31, 32 -> 39)
	mods = uniq.call(mods);

	return mods.map(sgr);
};

var hasCSI = function (str) {
	return includes.call(str, CSI);
};

sgr.hasCSI = hasCSI;

var extractCode = function (csi) {
	var code = csi.slice(2, -1);
	code = Number(code);
	return code;
};

sgr.extractCode = extractCode;

module.exports = sgr;

},{"es5-ext/array/#/for-each-right":23,"es5-ext/array/#/uniq.js":24,"es5-ext/object/assign":46,"es5-ext/object/first-key":51,"es5-ext/object/for-each":52,"es5-ext/string/#/contains":71}],10:[function(require,module,exports){
'use strict';

module.exports = [
	"000000", "800000", "008000", "808000", "000080", "800080", "008080", "c0c0c0",
	"808080", "ff0000", "00ff00", "ffff00", "0000ff", "ff00ff", "00ffff", "ffffff",

	"000000", "00005f", "000087", "0000af", "0000d7", "0000ff",
	"005f00", "005f5f", "005f87", "005faf", "005fd7", "005fff",
	"008700", "00875f", "008787", "0087af", "0087d7", "0087ff",
	"00af00", "00af5f", "00af87", "00afaf", "00afd7", "00afff",
	"00d700", "00d75f", "00d787", "00d7af", "00d7d7", "00d7ff",
	"00ff00", "00ff5f", "00ff87", "00ffaf", "00ffd7", "00ffff",

	"5f0000", "5f005f", "5f0087", "5f00af", "5f00d7", "5f00ff",
	"5f5f00", "5f5f5f", "5f5f87", "5f5faf", "5f5fd7", "5f5fff",
	"5f8700", "5f875f", "5f8787", "5f87af", "5f87d7", "5f87ff",
	"5faf00", "5faf5f", "5faf87", "5fafaf", "5fafd7", "5fafff",
	"5fd700", "5fd75f", "5fd787", "5fd7af", "5fd7d7", "5fd7ff",
	"5fff00", "5fff5f", "5fff87", "5fffaf", "5fffd7", "5fffff",

	"870000", "87005f", "870087", "8700af", "8700d7", "8700ff",
	"875f00", "875f5f", "875f87", "875faf", "875fd7", "875fff",
	"878700", "87875f", "878787", "8787af", "8787d7", "8787ff",
	"87af00", "87af5f", "87af87", "87afaf", "87afd7", "87afff",
	"87d700", "87d75f", "87d787", "87d7af", "87d7d7", "87d7ff",
	"87ff00", "87ff5f", "87ff87", "87ffaf", "87ffd7", "87ffff",

	"af0000", "af005f", "af0087", "af00af", "af00d7", "af00ff",
	"af5f00", "af5f5f", "af5f87", "af5faf", "af5fd7", "af5fff",
	"af8700", "af875f", "af8787", "af87af", "af87d7", "af87ff",
	"afaf00", "afaf5f", "afaf87", "afafaf", "afafd7", "afafff",
	"afd700", "afd75f", "afd787", "afd7af", "afd7d7", "afd7ff",
	"afff00", "afff5f", "afff87", "afffaf", "afffd7", "afffff",

	"d70000", "d7005f", "d70087", "d700af", "d700d7", "d700ff",
	"d75f00", "d75f5f", "d75f87", "d75faf", "d75fd7", "d75fff",
	"d78700", "d7875f", "d78787", "d787af", "d787d7", "d787ff",
	"d7af00", "d7af5f", "d7af87", "d7afaf", "d7afd7", "d7afff",
	"d7d700", "d7d75f", "d7d787", "d7d7af", "d7d7d7", "d7d7ff",
	"d7ff00", "d7ff5f", "d7ff87", "d7ffaf", "d7ffd7", "d7ffff",

	"ff0000", "ff005f", "ff0087", "ff00af", "ff00d7", "ff00ff",
	"ff5f00", "ff5f5f", "ff5f87", "ff5faf", "ff5fd7", "ff5fff",
	"ff8700", "ff875f", "ff8787", "ff87af", "ff87d7", "ff87ff",
	"ffaf00", "ffaf5f", "ffaf87", "ffafaf", "ffafd7", "ffafff",
	"ffd700", "ffd75f", "ffd787", "ffd7af", "ffd7d7", "ffd7ff",
	"ffff00", "ffff5f", "ffff87", "ffffaf", "ffffd7", "ffffff",

	"080808", "121212", "1c1c1c", "262626", "303030", "3a3a3a",
	"444444", "4e4e4e", "585858", "626262", "6c6c6c", "767676",
	"808080", "8a8a8a", "949494", "9e9e9e", "a8a8a8", "b2b2b2",
	"bcbcbc", "c6c6c6", "d0d0d0", "dadada", "e4e4e4", "eeeeee"
];

},{}],11:[function(require,module,exports){
'use strict';

var push = Array.prototype.push, reduce = Array.prototype.reduce, abs = Math.abs
  , colors, match, result, i;

colors = require('./xterm-colors').map(function (color) {
	return {
		r: parseInt(color.slice(0, 2), 16),
		g: parseInt(color.slice(2, 4), 16),
		b: parseInt(color.slice(4), 16)
	};
});

match = colors.slice(0, 16);

module.exports = result = [];

i = 0;
while (i < 8) {
	result.push(30 + i++);
}
i = 0;
while (i < 8) {
	result.push(90 + i++);
}
push.apply(result, colors.slice(16).map(function (data) {
	var index, diff = Infinity;
	match.every(function (match, i) {
		var ndiff = reduce.call('rgb', function (diff, channel) {
			diff += abs(match[channel] - data[channel]);
			return diff;
		}, 0);
		if (ndiff < diff) {
			index = i;
			diff = ndiff;
		}
		return ndiff;
	});
	return result[index];
}));

},{"./xterm-colors":10}],12:[function(require,module,exports){
'use strict';

var d     = require('d')
  , trunc = require('es5-ext/math/trunc')

  , up, down, right, left
  , abs = Math.abs, floor = Math.floor, max = Math.max;

var getMove = function (control) {
	return function (num) {
		num = isNaN(num) ? 0 : max(floor(num), 0);
		return num ? ('\x1b[' + num + control) : '';
	};
};
module.exports = Object.defineProperties(function (x, y) {
	x = isNaN(x) ? 0 : floor(x);
	y = isNaN(y) ? 0 : floor(y);
	return ((x > 0) ? right(x) : left(-x)) + ((y > 0) ? down(y) : up(-y));
}, {
	up: d(up = getMove('A')),
	down: d(down = getMove('B')),
	right: d(right = getMove('C')),
	left: d(left = getMove('D')),
	to: d(function (x, y) {
		x = isNaN(x) ? 1 : (max(floor(x), 0) + 1);
		y = isNaN(y) ? 1 : (max(floor(y), 0) + 1);
		return '\x1b[' + y + ';' + x + 'H';
	}),
	lines: d(function (n) {
		var dir;
		n = trunc(n) || 0;
		dir = (n >= 0) ? 'E' : 'F';
		n = floor(abs(n));
		return '\x1b[' + n + dir;
	})
});

},{"d":19,"es5-ext/math/trunc":40}],13:[function(require,module,exports){
'use strict';

module.exports = '\x1b[2J\x1b[0;0H';

},{}],14:[function(require,module,exports){
'use strict';

var reAnsi        = require('ansi-regex')
  , stringifiable = require('es5-ext/object/validate-stringifiable-value')
  , length        = require('./get-stripped-length')
  , sgr           = require('./lib/sgr')

  , max = Math.max;

var Token = function Token(token) {
	this.token = token;
};

var tokenize = function (str) {
	var match = reAnsi().exec(str);

	if (!match) {
		return [ str ];
	}

	var index = match.index
	  , head, prehead, tail;

	if (index === 0) {
		head = match[0];
		tail = str.slice(head.length);

		return [ new Token(head) ].concat(tokenize(tail));
	}

	prehead = str.slice(0, index);
	head = match[0];
	tail = str.slice(index + head.length);

	return [ prehead, new Token(head) ].concat(tokenize(tail));
};

var isChunkInSlice = function (chunk, index, begin, end) {
	var endIndex = chunk.length + index;

	if (begin > endIndex) return false;
	if (end < index) return false;
	return true;
};

var sliceSeq = function (seq, begin, end) {
	var sliced = seq.reduce(function (state, chunk) {
		var index = state.index;

		if (!(chunk instanceof Token)) {
			var nextChunk = '';

			if (isChunkInSlice(chunk, index, begin, end)) {
				var relBegin = Math.max(begin - index, 0)
				  , relEnd   = Math.min(end - index, chunk.length);

				nextChunk = chunk.slice(relBegin, relEnd);
			}

			state.seq.push(nextChunk);
			state.index = index + chunk.length;
		} else {
			var code = sgr.extractCode(chunk.token);

			if (index <= begin) {
				if (code in sgr.openers) {
					sgr.openStyle(state.preOpeners, code);
				}
				if (code in sgr.closers) {
					sgr.closeStyle(state.preOpeners, code);
				}
			} else if (index < end) {
				if (code in sgr.openers) {
					sgr.openStyle(state.inOpeners, code);
					state.seq.push(chunk);
				} else if (code in sgr.closers) {
					state.inClosers.push(code);
					state.seq.push(chunk);
				}
			}
		}

		return state;
	}, {
		index: 0,
		seq: [],

		// preOpeners -> [ mod ]
		// preOpeners must be prepended to the slice if they wasn't closed til the end of it
		// preOpeners must be closed if they wasn't closed til the end of the slice
		preOpeners: [],

		// inOpeners  -> [ mod ]
		// inOpeners already in the slice and must not be prepended to the slice
		// inOpeners must be closed if they wasn't closed til the end of the slice
		inOpeners:  [], // opener CSI inside slice

		// inClosers -> [ code ]
		// closer CSIs for determining which pre/in-Openers must be closed
		inClosers:  []
	});

	sliced.seq = [].concat(
		sgr.prepend(sliced.preOpeners),
		sliced.seq,
		sgr.complete([].concat(sliced.preOpeners, sliced.inOpeners), sliced.inClosers)
	);

	return sliced.seq;
};

module.exports = function (str/*, begin, end*/) {
	var seq, begin = Number(arguments[1]), end = Number(arguments[2]), len;

	str = stringifiable(str);
	len = length(str);

	if (isNaN(begin)) {
		begin = 0;
	}
	if (isNaN(end)) {
		end = len;
	}
	if (begin < 0) {
		begin = max(len + begin, 0);
	}
	if (end < 0) {
		end = max(len + end, 0);
	}

	seq = tokenize(str);
	seq = sliceSeq(seq, begin, end);
	return seq.map(function (chunk) {
		if (chunk instanceof Token) {
			return chunk.token;
		}

		return chunk;
	}).join('');
};

},{"./get-stripped-length":7,"./lib/sgr":9,"ansi-regex":1,"es5-ext/object/validate-stringifiable-value":69}],15:[function(require,module,exports){
// Strip ANSI formatting from string

'use strict';

var stringifiable = require('es5-ext/object/validate-stringifiable')
  , r             = require('ansi-regex')();

module.exports = function (str) { return stringifiable(str).replace(r, ''); };

},{"ansi-regex":1,"es5-ext/object/validate-stringifiable":70}],16:[function(require,module,exports){
'use strict';

var compose      = require('es5-ext/function/#/compose')
  , callable     = require('es5-ext/object/valid-callable')
  , d            = require('d')
  , validTimeout = require('timers-ext/valid-timeout')

  , chars = '-\\|/', l = chars.length, ThrobberIterator;

ThrobberIterator = function () {};
Object.defineProperties(ThrobberIterator.prototype, {
	index: d(-1),
	running: d(false),
	next: d(function () {
		var str = this.running ? '\u0008' : '';
		if (!this.running) this.running = true;
		return str + chars[this.index = ((this.index + 1) % l)];
	}),
	reset: d(function () {
		if (!this.running) return '';
		this.index = -1;
		this.running = false;
		return '\u0008';
	})
});

module.exports = exports = function (write, interval/*, format*/) {
	var format = arguments[2], token, iterator = new ThrobberIterator();
	callable(write);
	interval = validTimeout(interval);
	if (format !== undefined) write = compose.call(write, callable(format));
	return {
		start: function () {
			if (token) return;
			token = setInterval(function () { write(iterator.next()); }, interval);
		},
		restart: function () {
			this.stop();
			this.start();
		},
		stop: function () {
			if (!token) return;
			clearInterval(token);
			token = null;
			write(iterator.reset());
		}
	};
};

Object.defineProperty(exports, 'Iterator', d(ThrobberIterator));

},{"d":19,"es5-ext/function/#/compose":30,"es5-ext/object/valid-callable":66,"timers-ext/valid-timeout":115}],17:[function(require,module,exports){
'use strict';

var d = require('d');

Object.defineProperties(exports, {
	width: d.gs('ce', function () { return process.stdout.columns || 0; }),
	height: d.gs('ce', function () { return process.stdout.rows || 0; })
});

},{"d":19}],18:[function(require,module,exports){
'use strict';

var copy             = require('es5-ext/object/copy')
  , normalizeOptions = require('es5-ext/object/normalize-options')
  , ensureCallable   = require('es5-ext/object/valid-callable')
  , map              = require('es5-ext/object/map')
  , callable         = require('es5-ext/object/valid-callable')
  , validValue       = require('es5-ext/object/valid-value')

  , bind = Function.prototype.bind, defineProperty = Object.defineProperty
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , define;

define = function (name, desc, options) {
	var value = validValue(desc) && callable(desc.value), dgs;
	dgs = copy(desc);
	delete dgs.writable;
	delete dgs.value;
	dgs.get = function () {
		if (!options.overwriteDefinition && hasOwnProperty.call(this, name)) return value;
		desc.value = bind.call(value, options.resolveContext ? options.resolveContext(this) : this);
		defineProperty(this, name, desc);
		return this[name];
	};
	return dgs;
};

module.exports = function (props/*, options*/) {
	var options = normalizeOptions(arguments[1]);
	if (options.resolveContext != null) ensureCallable(options.resolveContext);
	return map(props, function (desc, name) { return define(name, desc, options); });
};

},{"es5-ext/object/copy":49,"es5-ext/object/map":59,"es5-ext/object/normalize-options":61,"es5-ext/object/valid-callable":66,"es5-ext/object/valid-value":68}],19:[function(require,module,exports){
'use strict';

var assign        = require('es5-ext/object/assign')
  , normalizeOpts = require('es5-ext/object/normalize-options')
  , isCallable    = require('es5-ext/object/is-callable')
  , contains      = require('es5-ext/string/#/contains')

  , d;

d = module.exports = function (dscr, value/*, options*/) {
	var c, e, w, options, desc;
	if ((arguments.length < 2) || (typeof dscr !== 'string')) {
		options = value;
		value = dscr;
		dscr = null;
	} else {
		options = arguments[2];
	}
	if (dscr == null) {
		c = w = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
		w = contains.call(dscr, 'w');
	}

	desc = { value: value, configurable: c, enumerable: e, writable: w };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

d.gs = function (dscr, get, set/*, options*/) {
	var c, e, options, desc;
	if (typeof dscr !== 'string') {
		options = set;
		set = get;
		get = dscr;
		dscr = null;
	} else {
		options = arguments[3];
	}
	if (get == null) {
		get = undefined;
	} else if (!isCallable(get)) {
		options = get;
		get = set = undefined;
	} else if (set == null) {
		set = undefined;
	} else if (!isCallable(set)) {
		options = set;
		set = undefined;
	}
	if (dscr == null) {
		c = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
	}

	desc = { get: get, set: set, configurable: c, enumerable: e };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

},{"es5-ext/object/assign":46,"es5-ext/object/is-callable":54,"es5-ext/object/normalize-options":61,"es5-ext/string/#/contains":71}],20:[function(require,module,exports){
'use strict';

var map        = require('es5-ext/object/map')
  , isCallable = require('es5-ext/object/is-callable')
  , validValue = require('es5-ext/object/valid-value')
  , contains   = require('es5-ext/string/#/contains')

  , call = Function.prototype.call
  , defineProperty = Object.defineProperty
  , getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor
  , getPrototypeOf = Object.getPrototypeOf
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , cacheDesc = { configurable: false, enumerable: false, writable: false,
		value: null }
  , define;

define = function (name, options) {
	var value, dgs, cacheName, desc, writable = false, resolvable
	  , flat;
	options = Object(validValue(options));
	cacheName = options.cacheName;
	flat = options.flat;
	if (cacheName == null) cacheName = name;
	delete options.cacheName;
	value = options.value;
	resolvable = isCallable(value);
	delete options.value;
	dgs = { configurable: Boolean(options.configurable),
		enumerable: Boolean(options.enumerable) };
	if (name !== cacheName) {
		dgs.get = function () {
			if (hasOwnProperty.call(this, cacheName)) return this[cacheName];
			cacheDesc.value = resolvable ? call.call(value, this, options) : value;
			cacheDesc.writable = writable;
			defineProperty(this, cacheName, cacheDesc);
			cacheDesc.value = null;
			if (desc) defineProperty(this, name, desc);
			return this[cacheName];
		};
	} else if (!flat) {
		dgs.get = function self() {
			var ownDesc;
			if (hasOwnProperty.call(this, name)) {
				ownDesc = getOwnPropertyDescriptor(this, name);
				// It happens in Safari, that getter is still called after property
				// was defined with a value, following workarounds that
				// While in IE11 it may happen that here ownDesc is undefined (go figure)
				if (ownDesc) {
					if (ownDesc.hasOwnProperty('value')) return ownDesc.value;
					if ((typeof ownDesc.get === 'function') && (ownDesc.get !== self)) {
						return ownDesc.get.call(this);
					}
					return value;
				}
			}
			desc.value = resolvable ? call.call(value, this, options) : value;
			defineProperty(this, name, desc);
			desc.value = null;
			return this[name];
		};
	} else {
		dgs.get = function self() {
			var base = this, ownDesc;
			if (hasOwnProperty.call(this, name)) {
				// It happens in Safari, that getter is still called after property
				// was defined with a value, following workarounds that
				ownDesc = getOwnPropertyDescriptor(this, name);
				if (ownDesc.hasOwnProperty('value')) return ownDesc.value;
				if ((typeof ownDesc.get === 'function') && (ownDesc.get !== self)) {
					return ownDesc.get.call(this);
				}
			}
			while (!hasOwnProperty.call(base, name)) base = getPrototypeOf(base);
			desc.value = resolvable ? call.call(value, base, options) : value;
			defineProperty(base, name, desc);
			desc.value = null;
			return base[name];
		};
	}
	dgs.set = function (value) {
		if (hasOwnProperty.call(this, name)) {
			throw new TypeError("Cannot assign to lazy defined '" + name + "' property of " + this);
		}
		dgs.get.call(this);
		this[cacheName] = value;
	};
	if (options.desc) {
		desc = {
			configurable: contains.call(options.desc, 'c'),
			enumerable: contains.call(options.desc, 'e')
		};
		if (cacheName === name) {
			desc.writable = contains.call(options.desc, 'w');
			desc.value = null;
		} else {
			writable = contains.call(options.desc, 'w');
			desc.get = dgs.get;
			desc.set = dgs.set;
		}
		delete options.desc;
	} else if (cacheName === name) {
		desc = {
			configurable: Boolean(options.configurable),
			enumerable: Boolean(options.enumerable),
			writable: Boolean(options.writable),
			value: null
		};
	}
	delete options.configurable;
	delete options.enumerable;
	delete options.writable;
	return dgs;
};

module.exports = function (props) {
	return map(props, function (desc, name) { return define(name, desc); });
};

},{"es5-ext/object/is-callable":54,"es5-ext/object/map":59,"es5-ext/object/valid-value":68,"es5-ext/string/#/contains":71}],21:[function(require,module,exports){
// Inspired by Google Closure:
// http://closure-library.googlecode.com/svn/docs/
// closure_goog_array_array.js.html#goog.array.clear

'use strict';

var value = require('../../object/valid-value');

module.exports = function () {
	value(this).length = 0;
	return this;
};

},{"../../object/valid-value":68}],22:[function(require,module,exports){
'use strict';

var toPosInt = require('../../number/to-pos-integer')
  , value    = require('../../object/valid-value')

  , indexOf = Array.prototype.indexOf
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , abs = Math.abs, floor = Math.floor;

module.exports = function (searchElement/*, fromIndex*/) {
	var i, l, fromIndex, val;
	if (searchElement === searchElement) { //jslint: ignore
		return indexOf.apply(this, arguments);
	}

	l = toPosInt(value(this).length);
	fromIndex = arguments[1];
	if (isNaN(fromIndex)) fromIndex = 0;
	else if (fromIndex >= 0) fromIndex = floor(fromIndex);
	else fromIndex = toPosInt(this.length) - floor(abs(fromIndex));

	for (i = fromIndex; i < l; ++i) {
		if (hasOwnProperty.call(this, i)) {
			val = this[i];
			if (val !== val) return i; //jslint: ignore
		}
	}
	return -1;
};

},{"../../number/to-pos-integer":44,"../../object/valid-value":68}],23:[function(require,module,exports){
'use strict';

var toPosInt = require('../../number/to-pos-integer')
  , callable = require('../../object/valid-callable')
  , value    = require('../../object/valid-value')

  , hasOwnProperty = Object.prototype.hasOwnProperty
  , call = Function.prototype.call;

module.exports = function (cb/*, thisArg*/) {
	var i, self, thisArg;

	self = Object(value(this));
	callable(cb);
	thisArg = arguments[1];

	for (i = (toPosInt(self.length) - 1); i >= 0; --i) {
		if (hasOwnProperty.call(self, i)) call.call(cb, thisArg, self[i], i, self);
	}
};

},{"../../number/to-pos-integer":44,"../../object/valid-callable":66,"../../object/valid-value":68}],24:[function(require,module,exports){
'use strict';

var indexOf = require('./e-index-of')

  , filter = Array.prototype.filter

  , isFirst;

isFirst = function (value, index) {
	return indexOf.call(this, value) === index;
};

module.exports = function () { return filter.call(this, isFirst, this); };

},{"./e-index-of":22}],25:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Array.from
	: require('./shim');

},{"./is-implemented":26,"./shim":27}],26:[function(require,module,exports){
'use strict';

module.exports = function () {
	var from = Array.from, arr, result;
	if (typeof from !== 'function') return false;
	arr = ['raz', 'dwa'];
	result = from(arr);
	return Boolean(result && (result !== arr) && (result[1] === 'dwa'));
};

},{}],27:[function(require,module,exports){
'use strict';

var iteratorSymbol = require('es6-symbol').iterator
  , isArguments    = require('../../function/is-arguments')
  , isFunction     = require('../../function/is-function')
  , toPosInt       = require('../../number/to-pos-integer')
  , callable       = require('../../object/valid-callable')
  , validValue     = require('../../object/valid-value')
  , isString       = require('../../string/is-string')

  , isArray = Array.isArray, call = Function.prototype.call
  , desc = { configurable: true, enumerable: true, writable: true, value: null }
  , defineProperty = Object.defineProperty;

module.exports = function (arrayLike/*, mapFn, thisArg*/) {
	var mapFn = arguments[1], thisArg = arguments[2], Constructor, i, j, arr, l, code, iterator
	  , result, getIterator, value;

	arrayLike = Object(validValue(arrayLike));

	if (mapFn != null) callable(mapFn);
	if (!this || (this === Array) || !isFunction(this)) {
		// Result: Plain array
		if (!mapFn) {
			if (isArguments(arrayLike)) {
				// Source: Arguments
				l = arrayLike.length;
				if (l !== 1) return Array.apply(null, arrayLike);
				arr = new Array(1);
				arr[0] = arrayLike[0];
				return arr;
			}
			if (isArray(arrayLike)) {
				// Source: Array
				arr = new Array(l = arrayLike.length);
				for (i = 0; i < l; ++i) arr[i] = arrayLike[i];
				return arr;
			}
		}
		arr = [];
	} else {
		// Result: Non plain array
		Constructor = this;
	}

	if (!isArray(arrayLike)) {
		if ((getIterator = arrayLike[iteratorSymbol]) !== undefined) {
			// Source: Iterator
			iterator = callable(getIterator).call(arrayLike);
			if (Constructor) arr = new Constructor();
			result = iterator.next();
			i = 0;
			while (!result.done) {
				value = mapFn ? call.call(mapFn, thisArg, result.value, i) : result.value;
				if (!Constructor) {
					arr[i] = value;
				} else {
					desc.value = value;
					defineProperty(arr, i, desc);
				}
				result = iterator.next();
				++i;
			}
			l = i;
		} else if (isString(arrayLike)) {
			// Source: String
			l = arrayLike.length;
			if (Constructor) arr = new Constructor();
			for (i = 0, j = 0; i < l; ++i) {
				value = arrayLike[i];
				if ((i + 1) < l) {
					code = value.charCodeAt(0);
					if ((code >= 0xD800) && (code <= 0xDBFF)) value += arrayLike[++i];
				}
				value = mapFn ? call.call(mapFn, thisArg, value, j) : value;
				if (!Constructor) {
					arr[j] = value;
				} else {
					desc.value = value;
					defineProperty(arr, j, desc);
				}
				++j;
			}
			l = j;
		}
	}
	if (l === undefined) {
		// Source: array or array-like
		l = toPosInt(arrayLike.length);
		if (Constructor) arr = new Constructor(l);
		for (i = 0; i < l; ++i) {
			value = mapFn ? call.call(mapFn, thisArg, arrayLike[i], i) : arrayLike[i];
			if (!Constructor) {
				arr[i] = value;
			} else {
				desc.value = value;
				defineProperty(arr, i, desc);
			}
		}
	}
	if (Constructor) {
		desc.value = null;
		arr.length = l;
	}
	return arr;
};

},{"../../function/is-arguments":32,"../../function/is-function":33,"../../number/to-pos-integer":44,"../../object/valid-callable":66,"../../object/valid-value":68,"../../string/is-string":77,"es6-symbol":85}],28:[function(require,module,exports){
'use strict';

var from = require('./from')

  , isArray = Array.isArray;

module.exports = function (arrayLike) {
	return isArray(arrayLike) ? arrayLike : from(arrayLike);
};

},{"./from":25}],29:[function(require,module,exports){
'use strict';

var assign   = require('../object/assign')
  , isObject = require('../object/is-object')

  , captureStackTrace = Error.captureStackTrace;

exports = module.exports = function (message/*, code, ext*/) {
	var err = new Error(message), code = arguments[1], ext = arguments[2];
	if (ext == null) {
		if (isObject(code)) {
			ext = code;
			code = null;
		}
	}
	if (ext != null) assign(err, ext);
	if (code != null) err.code = code;
	if (captureStackTrace) captureStackTrace(err, exports);
	return err;
};

},{"../object/assign":46,"../object/is-object":55}],30:[function(require,module,exports){
'use strict';

var callable = require('../../object/valid-callable')
  , aFrom    = require('../../array/from')

  , apply = Function.prototype.apply, call = Function.prototype.call
  , callFn = function (arg, fn) { return call.call(fn, this, arg); };

module.exports = function (fn/*, …fnn*/) {
	var fns, first;
	if (!fn) callable(fn);
	fns = [this].concat(aFrom(arguments));
	fns.forEach(callable);
	fns = fns.reverse();
	first = fns[0];
	fns = fns.slice(1);
	return function (arg) {
		return fns.reduce(callFn, apply.call(first, this, arguments));
	};
};

},{"../../array/from":25,"../../object/valid-callable":66}],31:[function(require,module,exports){
'use strict';

var toPosInt = require('../number/to-pos-integer')

  , test = function (a, b) {}, desc, defineProperty
  , generate, mixin;

try {
	Object.defineProperty(test, 'length', { configurable: true, writable: false,
		enumerable: false, value: 1 });
} catch (ignore) {}

if (test.length === 1) {
	// ES6
	desc = { configurable: true, writable: false, enumerable: false };
	defineProperty = Object.defineProperty;
	module.exports = function (fn, length) {
		length = toPosInt(length);
		if (fn.length === length) return fn;
		desc.value = length;
		return defineProperty(fn, 'length', desc);
	};
} else {
	mixin = require('../object/mixin');
	generate = (function () {
		var cache = [];
		return function (l) {
			var args, i = 0;
			if (cache[l]) return cache[l];
			args = [];
			while (l--) args.push('a' + (++i).toString(36));
			return new Function('fn', 'return function (' + args.join(', ') +
				') { return fn.apply(this, arguments); };');
		};
	}());
	module.exports = function (src, length) {
		var target;
		length = toPosInt(length);
		if (src.length === length) return src;
		target = generate(length)(src);
		try { mixin(target, src); } catch (ignore) {}
		return target;
	};
}

},{"../number/to-pos-integer":44,"../object/mixin":60}],32:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString

  , id = toString.call((function () { return arguments; }()));

module.exports = function (x) { return (toString.call(x) === id); };

},{}],33:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString

  , id = toString.call(require('./noop'));

module.exports = function (f) {
	return (typeof f === "function") && (toString.call(f) === id);
};

},{"./noop":34}],34:[function(require,module,exports){
'use strict';

module.exports = function () {};

},{}],35:[function(require,module,exports){
'use strict';

var iteratorSymbol = require('es6-symbol').iterator
  , isArrayLike    = require('../object/is-array-like');

module.exports = function (x) {
	if (x == null) return false;
	if (typeof x[iteratorSymbol] === 'function') return true;
	return isArrayLike(x);
};

},{"../object/is-array-like":53,"es6-symbol":85}],36:[function(require,module,exports){
'use strict';

var isObject = require('../object/is-object')
  , is       = require('./is');

module.exports = function (x) {
	if (is(x) && isObject(x)) return x;
	throw new TypeError(x + " is not an iterable or array-like object");
};

},{"../object/is-object":55,"./is":35}],37:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Math.sign
	: require('./shim');

},{"./is-implemented":38,"./shim":39}],38:[function(require,module,exports){
'use strict';

module.exports = function () {
	var sign = Math.sign;
	if (typeof sign !== 'function') return false;
	return ((sign(10) === 1) && (sign(-20) === -1));
};

},{}],39:[function(require,module,exports){
'use strict';

module.exports = function (value) {
	value = Number(value);
	if (isNaN(value) || (value === 0)) return value;
	return (value > 0) ? 1 : -1;
};

},{}],40:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Math.trunc
	: require('./shim');

},{"./is-implemented":41,"./shim":42}],41:[function(require,module,exports){
'use strict';

module.exports = function () {
	var trunc = Math.trunc;
	if (typeof trunc !== 'function') return false;
	return (trunc(13.67) === 13) && (trunc(-13.67) === -13);
};

},{}],42:[function(require,module,exports){
'use strict';

var floor = Math.floor;

module.exports = function (x) {
	if (isNaN(x)) return NaN;
	x = Number(x);
	if (x === 0) return x;
	if (x === Infinity) return Infinity;
	if (x === -Infinity) return -Infinity;
	if (x > 0) return floor(x);
	return -floor(-x);
};

},{}],43:[function(require,module,exports){
'use strict';

var sign = require('../math/sign')

  , abs = Math.abs, floor = Math.floor;

module.exports = function (value) {
	if (isNaN(value)) return 0;
	value = Number(value);
	if ((value === 0) || !isFinite(value)) return value;
	return sign(value) * floor(abs(value));
};

},{"../math/sign":37}],44:[function(require,module,exports){
'use strict';

var toInteger = require('./to-integer')

  , max = Math.max;

module.exports = function (value) { return max(0, toInteger(value)); };

},{"./to-integer":43}],45:[function(require,module,exports){
// Internal method, used by iteration functions.
// Calls a function for each key-value pair found in object
// Optionally takes compareFn to iterate object in specific order

'use strict';

var callable = require('./valid-callable')
  , value    = require('./valid-value')

  , bind = Function.prototype.bind, call = Function.prototype.call, keys = Object.keys
  , propertyIsEnumerable = Object.prototype.propertyIsEnumerable;

module.exports = function (method, defVal) {
	return function (obj, cb/*, thisArg, compareFn*/) {
		var list, thisArg = arguments[2], compareFn = arguments[3];
		obj = Object(value(obj));
		callable(cb);

		list = keys(obj);
		if (compareFn) {
			list.sort((typeof compareFn === 'function') ? bind.call(compareFn, obj) : undefined);
		}
		if (typeof method !== 'function') method = list[method];
		return call.call(method, list, function (key, index) {
			if (!propertyIsEnumerable.call(obj, key)) return defVal;
			return call.call(cb, thisArg, obj[key], key, obj, index);
		});
	};
};

},{"./valid-callable":66,"./valid-value":68}],46:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Object.assign
	: require('./shim');

},{"./is-implemented":47,"./shim":48}],47:[function(require,module,exports){
'use strict';

module.exports = function () {
	var assign = Object.assign, obj;
	if (typeof assign !== 'function') return false;
	obj = { foo: 'raz' };
	assign(obj, { bar: 'dwa' }, { trzy: 'trzy' });
	return (obj.foo + obj.bar + obj.trzy) === 'razdwatrzy';
};

},{}],48:[function(require,module,exports){
'use strict';

var keys  = require('../keys')
  , value = require('../valid-value')

  , max = Math.max;

module.exports = function (dest, src/*, …srcn*/) {
	var error, i, l = max(arguments.length, 2), assign;
	dest = Object(value(dest));
	assign = function (key) {
		try { dest[key] = src[key]; } catch (e) {
			if (!error) error = e;
		}
	};
	for (i = 1; i < l; ++i) {
		src = arguments[i];
		keys(src).forEach(assign);
	}
	if (error !== undefined) throw error;
	return dest;
};

},{"../keys":56,"../valid-value":68}],49:[function(require,module,exports){
'use strict';

var aFrom  = require('../array/from')
  , assign = require('./assign')
  , value  = require('./valid-value');

module.exports = function (obj/*, propertyNames, options*/) {
	var copy = Object(value(obj)), propertyNames = arguments[1], options = Object(arguments[2]);
	if (copy !== obj && !propertyNames) return copy;
	var result = {};
	if (propertyNames) {
		aFrom(propertyNames, function (propertyName) {
			if (options.ensure || propertyName in obj) result[propertyName] = obj[propertyName];
		});
	} else {
		assign(result, obj);
	}
	return result;
};

},{"../array/from":25,"./assign":46,"./valid-value":68}],50:[function(require,module,exports){
// Workaround for http://code.google.com/p/v8/issues/detail?id=2804

'use strict';

var create = Object.create, shim;

if (!require('./set-prototype-of/is-implemented')()) {
	shim = require('./set-prototype-of/shim');
}

module.exports = (function () {
	var nullObject, props, desc;
	if (!shim) return create;
	if (shim.level !== 1) return create;

	nullObject = {};
	props = {};
	desc = { configurable: false, enumerable: false, writable: true,
		value: undefined };
	Object.getOwnPropertyNames(Object.prototype).forEach(function (name) {
		if (name === '__proto__') {
			props[name] = { configurable: true, enumerable: false, writable: true,
				value: undefined };
			return;
		}
		props[name] = desc;
	});
	Object.defineProperties(nullObject, props);

	Object.defineProperty(shim, 'nullPolyfill', { configurable: false,
		enumerable: false, writable: false, value: nullObject });

	return function (prototype, props) {
		return create((prototype === null) ? nullObject : prototype, props);
	};
}());

},{"./set-prototype-of/is-implemented":64,"./set-prototype-of/shim":65}],51:[function(require,module,exports){
'use strict';

var value = require('./valid-value')

  , propertyIsEnumerable = Object.prototype.propertyIsEnumerable;

module.exports = function (obj) {
	var i;
	value(obj);
	for (i in obj) {
		if (propertyIsEnumerable.call(obj, i)) return i;
	}
	return null;
};

},{"./valid-value":68}],52:[function(require,module,exports){
'use strict';

module.exports = require('./_iterate')('forEach');

},{"./_iterate":45}],53:[function(require,module,exports){
'use strict';

var isFunction = require('../function/is-function')
  , isObject   = require('./is-object');

module.exports = function (x) {
	return ((x != null) && (typeof x.length === 'number') &&

		// Just checking ((typeof x === 'object') && (typeof x !== 'function'))
		// won't work right for some cases, e.g.:
		// type of instance of NodeList in Safari is a 'function'

		((isObject(x) && !isFunction(x)) || (typeof x === "string"))) || false;
};

},{"../function/is-function":33,"./is-object":55}],54:[function(require,module,exports){
// Deprecated

'use strict';

module.exports = function (obj) { return typeof obj === 'function'; };

},{}],55:[function(require,module,exports){
'use strict';

var map = { 'function': true, object: true };

module.exports = function (x) {
	return ((x != null) && map[typeof x]) || false;
};

},{}],56:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Object.keys
	: require('./shim');

},{"./is-implemented":57,"./shim":58}],57:[function(require,module,exports){
'use strict';

module.exports = function () {
	try {
		Object.keys('primitive');
		return true;
	} catch (e) { return false; }
};

},{}],58:[function(require,module,exports){
'use strict';

var keys = Object.keys;

module.exports = function (object) {
	return keys(object == null ? object : Object(object));
};

},{}],59:[function(require,module,exports){
'use strict';

var callable = require('./valid-callable')
  , forEach  = require('./for-each')

  , call = Function.prototype.call;

module.exports = function (obj, cb/*, thisArg*/) {
	var o = {}, thisArg = arguments[2];
	callable(cb);
	forEach(obj, function (value, key, obj, index) {
		o[key] = call.call(cb, thisArg, value, key, obj, index);
	});
	return o;
};

},{"./for-each":52,"./valid-callable":66}],60:[function(require,module,exports){
'use strict';

var value = require('./valid-value')

  , defineProperty = Object.defineProperty
  , getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor
  , getOwnPropertyNames = Object.getOwnPropertyNames
  , getOwnPropertySymbols = Object.getOwnPropertySymbols;

module.exports = function (target, source) {
	var error, sourceObject = Object(value(source));
	target = Object(value(target));
	getOwnPropertyNames(sourceObject).forEach(function (name) {
		try {
			defineProperty(target, name, getOwnPropertyDescriptor(source, name));
		} catch (e) { error = e; }
	});
	if (typeof getOwnPropertySymbols === 'function') {
		getOwnPropertySymbols(sourceObject).forEach(function (symbol) {
			try {
				defineProperty(target, symbol, getOwnPropertyDescriptor(source, symbol));
			} catch (e) { error = e; }
		});
	}
	if (error !== undefined) throw error;
	return target;
};

},{"./valid-value":68}],61:[function(require,module,exports){
'use strict';

var forEach = Array.prototype.forEach, create = Object.create;

var process = function (src, obj) {
	var key;
	for (key in src) obj[key] = src[key];
};

module.exports = function (options/*, …options*/) {
	var result = create(null);
	forEach.call(arguments, function (options) {
		if (options == null) return;
		process(Object(options), result);
	});
	return result;
};

},{}],62:[function(require,module,exports){
'use strict';

var forEach = Array.prototype.forEach, create = Object.create;

module.exports = function (arg/*, …args*/) {
	var set = create(null);
	forEach.call(arguments, function (name) { set[name] = true; });
	return set;
};

},{}],63:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Object.setPrototypeOf
	: require('./shim');

},{"./is-implemented":64,"./shim":65}],64:[function(require,module,exports){
'use strict';

var create = Object.create, getPrototypeOf = Object.getPrototypeOf
  , x = {};

module.exports = function (/*customCreate*/) {
	var setPrototypeOf = Object.setPrototypeOf
	  , customCreate = arguments[0] || create;
	if (typeof setPrototypeOf !== 'function') return false;
	return getPrototypeOf(setPrototypeOf(customCreate(null), x)) === x;
};

},{}],65:[function(require,module,exports){
// Big thanks to @WebReflection for sorting this out
// https://gist.github.com/WebReflection/5593554

'use strict';

var isObject      = require('../is-object')
  , value         = require('../valid-value')

  , isPrototypeOf = Object.prototype.isPrototypeOf
  , defineProperty = Object.defineProperty
  , nullDesc = { configurable: true, enumerable: false, writable: true,
		value: undefined }
  , validate;

validate = function (obj, prototype) {
	value(obj);
	if ((prototype === null) || isObject(prototype)) return obj;
	throw new TypeError('Prototype must be null or an object');
};

module.exports = (function (status) {
	var fn, set;
	if (!status) return null;
	if (status.level === 2) {
		if (status.set) {
			set = status.set;
			fn = function (obj, prototype) {
				set.call(validate(obj, prototype), prototype);
				return obj;
			};
		} else {
			fn = function (obj, prototype) {
				validate(obj, prototype).__proto__ = prototype;
				return obj;
			};
		}
	} else {
		fn = function self(obj, prototype) {
			var isNullBase;
			validate(obj, prototype);
			isNullBase = isPrototypeOf.call(self.nullPolyfill, obj);
			if (isNullBase) delete self.nullPolyfill.__proto__;
			if (prototype === null) prototype = self.nullPolyfill;
			obj.__proto__ = prototype;
			if (isNullBase) defineProperty(self.nullPolyfill, '__proto__', nullDesc);
			return obj;
		};
	}
	return Object.defineProperty(fn, 'level', { configurable: false,
		enumerable: false, writable: false, value: status.level });
}((function () {
	var x = Object.create(null), y = {}, set
	  , desc = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__');

	if (desc) {
		try {
			set = desc.set; // Opera crashes at this point
			set.call(x, y);
		} catch (ignore) { }
		if (Object.getPrototypeOf(x) === y) return { set: set, level: 2 };
	}

	x.__proto__ = y;
	if (Object.getPrototypeOf(x) === y) return { level: 2 };

	x = {};
	x.__proto__ = y;
	if (Object.getPrototypeOf(x) === y) return { level: 1 };

	return false;
}())));

require('../create');

},{"../create":50,"../is-object":55,"../valid-value":68}],66:[function(require,module,exports){
'use strict';

module.exports = function (fn) {
	if (typeof fn !== 'function') throw new TypeError(fn + " is not a function");
	return fn;
};

},{}],67:[function(require,module,exports){
'use strict';

var isObject = require('./is-object');

module.exports = function (value) {
	if (!isObject(value)) throw new TypeError(value + " is not an Object");
	return value;
};

},{"./is-object":55}],68:[function(require,module,exports){
'use strict';

module.exports = function (value) {
	if (value == null) throw new TypeError("Cannot use null or undefined");
	return value;
};

},{}],69:[function(require,module,exports){
'use strict';

var value         = require('./valid-value')
  , stringifiable = require('./validate-stringifiable');

module.exports = function (x) { return stringifiable(value(x)); };

},{"./valid-value":68,"./validate-stringifiable":70}],70:[function(require,module,exports){
'use strict';

var isCallable = require('./is-callable');

module.exports = function (stringifiable) {
	try {
		if (stringifiable && isCallable(stringifiable.toString)) return stringifiable.toString();
		return String(stringifiable);
	} catch (e) {
		throw new TypeError("Passed argument cannot be stringifed");
	}
};

},{"./is-callable":54}],71:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? String.prototype.contains
	: require('./shim');

},{"./is-implemented":72,"./shim":73}],72:[function(require,module,exports){
'use strict';

var str = 'razdwatrzy';

module.exports = function () {
	if (typeof str.contains !== 'function') return false;
	return ((str.contains('dwa') === true) && (str.contains('foo') === false));
};

},{}],73:[function(require,module,exports){
'use strict';

var indexOf = String.prototype.indexOf;

module.exports = function (searchString/*, position*/) {
	return indexOf.call(this, searchString, arguments[1]) > -1;
};

},{}],74:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? String.prototype.repeat
	: require('./shim');

},{"./is-implemented":75,"./shim":76}],75:[function(require,module,exports){
'use strict';

var str = 'foo';

module.exports = function () {
	if (typeof str.repeat !== 'function') return false;
	return (str.repeat(2) === 'foofoo');
};

},{}],76:[function(require,module,exports){
// Thanks: http://www.2ality.com/2014/01/efficient-string-repeat.html

'use strict';

var value     = require('../../../object/valid-value')
  , toInteger = require('../../../number/to-integer');

module.exports = function (count) {
	var str = String(value(this)), result;
	count = toInteger(count);
	if (count < 0) throw new RangeError("Count must be >= 0");
	if (!isFinite(count)) throw new RangeError("Count must be < ∞");
	result = '';
	if (!count) return result;
	while (true) {
		if (count & 1) result += str;
		count >>>= 1;
		if (count <= 0) break;
		str += str;
	}
	return result;
};

},{"../../../number/to-integer":43,"../../../object/valid-value":68}],77:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString

  , id = toString.call('');

module.exports = function (x) {
	return (typeof x === 'string') || (x && (typeof x === 'object') &&
		((x instanceof String) || (toString.call(x) === id))) || false;
};

},{}],78:[function(require,module,exports){
'use strict';

var setPrototypeOf = require('es5-ext/object/set-prototype-of')
  , contains       = require('es5-ext/string/#/contains')
  , d              = require('d')
  , Iterator       = require('./')

  , defineProperty = Object.defineProperty
  , ArrayIterator;

ArrayIterator = module.exports = function (arr, kind) {
	if (!(this instanceof ArrayIterator)) return new ArrayIterator(arr, kind);
	Iterator.call(this, arr);
	if (!kind) kind = 'value';
	else if (contains.call(kind, 'key+value')) kind = 'key+value';
	else if (contains.call(kind, 'key')) kind = 'key';
	else kind = 'value';
	defineProperty(this, '__kind__', d('', kind));
};
if (setPrototypeOf) setPrototypeOf(ArrayIterator, Iterator);

ArrayIterator.prototype = Object.create(Iterator.prototype, {
	constructor: d(ArrayIterator),
	_resolve: d(function (i) {
		if (this.__kind__ === 'value') return this.__list__[i];
		if (this.__kind__ === 'key+value') return [i, this.__list__[i]];
		return i;
	}),
	toString: d(function () { return '[object Array Iterator]'; })
});

},{"./":81,"d":19,"es5-ext/object/set-prototype-of":63,"es5-ext/string/#/contains":71}],79:[function(require,module,exports){
'use strict';

var isArguments = require('es5-ext/function/is-arguments')
  , callable    = require('es5-ext/object/valid-callable')
  , isString    = require('es5-ext/string/is-string')
  , get         = require('./get')

  , isArray = Array.isArray, call = Function.prototype.call
  , some = Array.prototype.some;

module.exports = function (iterable, cb/*, thisArg*/) {
	var mode, thisArg = arguments[2], result, doBreak, broken, i, l, char, code;
	if (isArray(iterable) || isArguments(iterable)) mode = 'array';
	else if (isString(iterable)) mode = 'string';
	else iterable = get(iterable);

	callable(cb);
	doBreak = function () { broken = true; };
	if (mode === 'array') {
		some.call(iterable, function (value) {
			call.call(cb, thisArg, value, doBreak);
			if (broken) return true;
		});
		return;
	}
	if (mode === 'string') {
		l = iterable.length;
		for (i = 0; i < l; ++i) {
			char = iterable[i];
			if ((i + 1) < l) {
				code = char.charCodeAt(0);
				if ((code >= 0xD800) && (code <= 0xDBFF)) char += iterable[++i];
			}
			call.call(cb, thisArg, char, doBreak);
			if (broken) break;
		}
		return;
	}
	result = iterable.next();

	while (!result.done) {
		call.call(cb, thisArg, result.value, doBreak);
		if (broken) return;
		result = iterable.next();
	}
};

},{"./get":80,"es5-ext/function/is-arguments":32,"es5-ext/object/valid-callable":66,"es5-ext/string/is-string":77}],80:[function(require,module,exports){
'use strict';

var isArguments    = require('es5-ext/function/is-arguments')
  , isString       = require('es5-ext/string/is-string')
  , ArrayIterator  = require('./array')
  , StringIterator = require('./string')
  , iterable       = require('./valid-iterable')
  , iteratorSymbol = require('es6-symbol').iterator;

module.exports = function (obj) {
	if (typeof iterable(obj)[iteratorSymbol] === 'function') return obj[iteratorSymbol]();
	if (isArguments(obj)) return new ArrayIterator(obj);
	if (isString(obj)) return new StringIterator(obj);
	return new ArrayIterator(obj);
};

},{"./array":78,"./string":83,"./valid-iterable":84,"es5-ext/function/is-arguments":32,"es5-ext/string/is-string":77,"es6-symbol":85}],81:[function(require,module,exports){
'use strict';

var clear    = require('es5-ext/array/#/clear')
  , assign   = require('es5-ext/object/assign')
  , callable = require('es5-ext/object/valid-callable')
  , value    = require('es5-ext/object/valid-value')
  , d        = require('d')
  , autoBind = require('d/auto-bind')
  , Symbol   = require('es6-symbol')

  , defineProperty = Object.defineProperty
  , defineProperties = Object.defineProperties
  , Iterator;

module.exports = Iterator = function (list, context) {
	if (!(this instanceof Iterator)) return new Iterator(list, context);
	defineProperties(this, {
		__list__: d('w', value(list)),
		__context__: d('w', context),
		__nextIndex__: d('w', 0)
	});
	if (!context) return;
	callable(context.on);
	context.on('_add', this._onAdd);
	context.on('_delete', this._onDelete);
	context.on('_clear', this._onClear);
};

defineProperties(Iterator.prototype, assign({
	constructor: d(Iterator),
	_next: d(function () {
		var i;
		if (!this.__list__) return;
		if (this.__redo__) {
			i = this.__redo__.shift();
			if (i !== undefined) return i;
		}
		if (this.__nextIndex__ < this.__list__.length) return this.__nextIndex__++;
		this._unBind();
	}),
	next: d(function () { return this._createResult(this._next()); }),
	_createResult: d(function (i) {
		if (i === undefined) return { done: true, value: undefined };
		return { done: false, value: this._resolve(i) };
	}),
	_resolve: d(function (i) { return this.__list__[i]; }),
	_unBind: d(function () {
		this.__list__ = null;
		delete this.__redo__;
		if (!this.__context__) return;
		this.__context__.off('_add', this._onAdd);
		this.__context__.off('_delete', this._onDelete);
		this.__context__.off('_clear', this._onClear);
		this.__context__ = null;
	}),
	toString: d(function () { return '[object Iterator]'; })
}, autoBind({
	_onAdd: d(function (index) {
		if (index >= this.__nextIndex__) return;
		++this.__nextIndex__;
		if (!this.__redo__) {
			defineProperty(this, '__redo__', d('c', [index]));
			return;
		}
		this.__redo__.forEach(function (redo, i) {
			if (redo >= index) this.__redo__[i] = ++redo;
		}, this);
		this.__redo__.push(index);
	}),
	_onDelete: d(function (index) {
		var i;
		if (index >= this.__nextIndex__) return;
		--this.__nextIndex__;
		if (!this.__redo__) return;
		i = this.__redo__.indexOf(index);
		if (i !== -1) this.__redo__.splice(i, 1);
		this.__redo__.forEach(function (redo, i) {
			if (redo > index) this.__redo__[i] = --redo;
		}, this);
	}),
	_onClear: d(function () {
		if (this.__redo__) clear.call(this.__redo__);
		this.__nextIndex__ = 0;
	})
})));

defineProperty(Iterator.prototype, Symbol.iterator, d(function () {
	return this;
}));
defineProperty(Iterator.prototype, Symbol.toStringTag, d('', 'Iterator'));

},{"d":19,"d/auto-bind":18,"es5-ext/array/#/clear":21,"es5-ext/object/assign":46,"es5-ext/object/valid-callable":66,"es5-ext/object/valid-value":68,"es6-symbol":85}],82:[function(require,module,exports){
'use strict';

var isArguments    = require('es5-ext/function/is-arguments')
  , isString       = require('es5-ext/string/is-string')
  , iteratorSymbol = require('es6-symbol').iterator

  , isArray = Array.isArray;

module.exports = function (value) {
	if (value == null) return false;
	if (isArray(value)) return true;
	if (isString(value)) return true;
	if (isArguments(value)) return true;
	return (typeof value[iteratorSymbol] === 'function');
};

},{"es5-ext/function/is-arguments":32,"es5-ext/string/is-string":77,"es6-symbol":85}],83:[function(require,module,exports){
// Thanks @mathiasbynens
// http://mathiasbynens.be/notes/javascript-unicode#iterating-over-symbols

'use strict';

var setPrototypeOf = require('es5-ext/object/set-prototype-of')
  , d              = require('d')
  , Iterator       = require('./')

  , defineProperty = Object.defineProperty
  , StringIterator;

StringIterator = module.exports = function (str) {
	if (!(this instanceof StringIterator)) return new StringIterator(str);
	str = String(str);
	Iterator.call(this, str);
	defineProperty(this, '__length__', d('', str.length));

};
if (setPrototypeOf) setPrototypeOf(StringIterator, Iterator);

StringIterator.prototype = Object.create(Iterator.prototype, {
	constructor: d(StringIterator),
	_next: d(function () {
		if (!this.__list__) return;
		if (this.__nextIndex__ < this.__length__) return this.__nextIndex__++;
		this._unBind();
	}),
	_resolve: d(function (i) {
		var char = this.__list__[i], code;
		if (this.__nextIndex__ === this.__length__) return char;
		code = char.charCodeAt(0);
		if ((code >= 0xD800) && (code <= 0xDBFF)) return char + this.__list__[this.__nextIndex__++];
		return char;
	}),
	toString: d(function () { return '[object String Iterator]'; })
});

},{"./":81,"d":19,"es5-ext/object/set-prototype-of":63}],84:[function(require,module,exports){
'use strict';

var isIterable = require('./is-iterable');

module.exports = function (value) {
	if (!isIterable(value)) throw new TypeError(value + " is not iterable");
	return value;
};

},{"./is-iterable":82}],85:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')() ? Symbol : require('./polyfill');

},{"./is-implemented":86,"./polyfill":88}],86:[function(require,module,exports){
'use strict';

var validTypes = { object: true, symbol: true };

module.exports = function () {
	var symbol;
	if (typeof Symbol !== 'function') return false;
	symbol = Symbol('test symbol');
	try { String(symbol); } catch (e) { return false; }

	// Return 'true' also for polyfills
	if (!validTypes[typeof Symbol.iterator]) return false;
	if (!validTypes[typeof Symbol.toPrimitive]) return false;
	if (!validTypes[typeof Symbol.toStringTag]) return false;

	return true;
};

},{}],87:[function(require,module,exports){
'use strict';

module.exports = function (x) {
	if (!x) return false;
	if (typeof x === 'symbol') return true;
	if (!x.constructor) return false;
	if (x.constructor.name !== 'Symbol') return false;
	return (x[x.constructor.toStringTag] === 'Symbol');
};

},{}],88:[function(require,module,exports){
// ES2015 Symbol polyfill for environments that do not (or partially) support it

'use strict';

var d              = require('d')
  , validateSymbol = require('./validate-symbol')

  , create = Object.create, defineProperties = Object.defineProperties
  , defineProperty = Object.defineProperty, objPrototype = Object.prototype
  , NativeSymbol, SymbolPolyfill, HiddenSymbol, globalSymbols = create(null)
  , isNativeSafe;

if (typeof Symbol === 'function') {
	NativeSymbol = Symbol;
	try {
		String(NativeSymbol());
		isNativeSafe = true;
	} catch (ignore) {}
}

var generateName = (function () {
	var created = create(null);
	return function (desc) {
		var postfix = 0, name, ie11BugWorkaround;
		while (created[desc + (postfix || '')]) ++postfix;
		desc += (postfix || '');
		created[desc] = true;
		name = '@@' + desc;
		defineProperty(objPrototype, name, d.gs(null, function (value) {
			// For IE11 issue see:
			// https://connect.microsoft.com/IE/feedbackdetail/view/1928508/
			//    ie11-broken-getters-on-dom-objects
			// https://github.com/medikoo/es6-symbol/issues/12
			if (ie11BugWorkaround) return;
			ie11BugWorkaround = true;
			defineProperty(this, name, d(value));
			ie11BugWorkaround = false;
		}));
		return name;
	};
}());

// Internal constructor (not one exposed) for creating Symbol instances.
// This one is used to ensure that `someSymbol instanceof Symbol` always return false
HiddenSymbol = function Symbol(description) {
	if (this instanceof HiddenSymbol) throw new TypeError('Symbol is not a constructor');
	return SymbolPolyfill(description);
};

// Exposed `Symbol` constructor
// (returns instances of HiddenSymbol)
module.exports = SymbolPolyfill = function Symbol(description) {
	var symbol;
	if (this instanceof Symbol) throw new TypeError('Symbol is not a constructor');
	if (isNativeSafe) return NativeSymbol(description);
	symbol = create(HiddenSymbol.prototype);
	description = (description === undefined ? '' : String(description));
	return defineProperties(symbol, {
		__description__: d('', description),
		__name__: d('', generateName(description))
	});
};
defineProperties(SymbolPolyfill, {
	for: d(function (key) {
		if (globalSymbols[key]) return globalSymbols[key];
		return (globalSymbols[key] = SymbolPolyfill(String(key)));
	}),
	keyFor: d(function (s) {
		var key;
		validateSymbol(s);
		for (key in globalSymbols) if (globalSymbols[key] === s) return key;
	}),

	// To ensure proper interoperability with other native functions (e.g. Array.from)
	// fallback to eventual native implementation of given symbol
	hasInstance: d('', (NativeSymbol && NativeSymbol.hasInstance) || SymbolPolyfill('hasInstance')),
	isConcatSpreadable: d('', (NativeSymbol && NativeSymbol.isConcatSpreadable) ||
		SymbolPolyfill('isConcatSpreadable')),
	iterator: d('', (NativeSymbol && NativeSymbol.iterator) || SymbolPolyfill('iterator')),
	match: d('', (NativeSymbol && NativeSymbol.match) || SymbolPolyfill('match')),
	replace: d('', (NativeSymbol && NativeSymbol.replace) || SymbolPolyfill('replace')),
	search: d('', (NativeSymbol && NativeSymbol.search) || SymbolPolyfill('search')),
	species: d('', (NativeSymbol && NativeSymbol.species) || SymbolPolyfill('species')),
	split: d('', (NativeSymbol && NativeSymbol.split) || SymbolPolyfill('split')),
	toPrimitive: d('', (NativeSymbol && NativeSymbol.toPrimitive) || SymbolPolyfill('toPrimitive')),
	toStringTag: d('', (NativeSymbol && NativeSymbol.toStringTag) || SymbolPolyfill('toStringTag')),
	unscopables: d('', (NativeSymbol && NativeSymbol.unscopables) || SymbolPolyfill('unscopables'))
});

// Internal tweaks for real symbol producer
defineProperties(HiddenSymbol.prototype, {
	constructor: d(SymbolPolyfill),
	toString: d('', function () { return this.__name__; })
});

// Proper implementation of methods exposed on Symbol.prototype
// They won't be accessible on produced symbol instances as they derive from HiddenSymbol.prototype
defineProperties(SymbolPolyfill.prototype, {
	toString: d(function () { return 'Symbol (' + validateSymbol(this).__description__ + ')'; }),
	valueOf: d(function () { return validateSymbol(this); })
});
defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toPrimitive, d('', function () {
	var symbol = validateSymbol(this);
	if (typeof symbol === 'symbol') return symbol;
	return symbol.toString();
}));
defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toStringTag, d('c', 'Symbol'));

// Proper implementaton of toPrimitive and toStringTag for returned symbol instances
defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toStringTag,
	d('c', SymbolPolyfill.prototype[SymbolPolyfill.toStringTag]));

// Note: It's important to define `toPrimitive` as last one, as some implementations
// implement `toPrimitive` natively without implementing `toStringTag` (or other specified symbols)
// And that may invoke error in definition flow:
// See: https://github.com/medikoo/es6-symbol/issues/13#issuecomment-164146149
defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toPrimitive,
	d('c', SymbolPolyfill.prototype[SymbolPolyfill.toPrimitive]));

},{"./validate-symbol":89,"d":19}],89:[function(require,module,exports){
'use strict';

var isSymbol = require('./is-symbol');

module.exports = function (value) {
	if (!isSymbol(value)) throw new TypeError(value + " is not a symbol");
	return value;
};

},{"./is-symbol":87}],90:[function(require,module,exports){
'use strict';

var d        = require('d')
  , callable = require('es5-ext/object/valid-callable')

  , apply = Function.prototype.apply, call = Function.prototype.call
  , create = Object.create, defineProperty = Object.defineProperty
  , defineProperties = Object.defineProperties
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , descriptor = { configurable: true, enumerable: false, writable: true }

  , on, once, off, emit, methods, descriptors, base;

on = function (type, listener) {
	var data;

	callable(listener);

	if (!hasOwnProperty.call(this, '__ee__')) {
		data = descriptor.value = create(null);
		defineProperty(this, '__ee__', descriptor);
		descriptor.value = null;
	} else {
		data = this.__ee__;
	}
	if (!data[type]) data[type] = listener;
	else if (typeof data[type] === 'object') data[type].push(listener);
	else data[type] = [data[type], listener];

	return this;
};

once = function (type, listener) {
	var once, self;

	callable(listener);
	self = this;
	on.call(this, type, once = function () {
		off.call(self, type, once);
		apply.call(listener, this, arguments);
	});

	once.__eeOnceListener__ = listener;
	return this;
};

off = function (type, listener) {
	var data, listeners, candidate, i;

	callable(listener);

	if (!hasOwnProperty.call(this, '__ee__')) return this;
	data = this.__ee__;
	if (!data[type]) return this;
	listeners = data[type];

	if (typeof listeners === 'object') {
		for (i = 0; (candidate = listeners[i]); ++i) {
			if ((candidate === listener) ||
					(candidate.__eeOnceListener__ === listener)) {
				if (listeners.length === 2) data[type] = listeners[i ? 0 : 1];
				else listeners.splice(i, 1);
			}
		}
	} else {
		if ((listeners === listener) ||
				(listeners.__eeOnceListener__ === listener)) {
			delete data[type];
		}
	}

	return this;
};

emit = function (type) {
	var i, l, listener, listeners, args;

	if (!hasOwnProperty.call(this, '__ee__')) return;
	listeners = this.__ee__[type];
	if (!listeners) return;

	if (typeof listeners === 'object') {
		l = arguments.length;
		args = new Array(l - 1);
		for (i = 1; i < l; ++i) args[i - 1] = arguments[i];

		listeners = listeners.slice();
		for (i = 0; (listener = listeners[i]); ++i) {
			apply.call(listener, this, args);
		}
	} else {
		switch (arguments.length) {
		case 1:
			call.call(listeners, this);
			break;
		case 2:
			call.call(listeners, this, arguments[1]);
			break;
		case 3:
			call.call(listeners, this, arguments[1], arguments[2]);
			break;
		default:
			l = arguments.length;
			args = new Array(l - 1);
			for (i = 1; i < l; ++i) {
				args[i - 1] = arguments[i];
			}
			apply.call(listeners, this, args);
		}
	}
};

methods = {
	on: on,
	once: once,
	off: off,
	emit: emit
};

descriptors = {
	on: d(on),
	once: d(once),
	off: d(off),
	emit: d(emit)
};

base = defineProperties({}, descriptors);

module.exports = exports = function (o) {
	return (o == null) ? create(base) : defineProperties(Object(o), descriptors);
};
exports.methods = methods;

},{"d":19,"es5-ext/object/valid-callable":66}],91:[function(require,module,exports){
module.exports = isPromise;

function isPromise(obj) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

},{}],92:[function(require,module,exports){
'use strict';

var toPosInt = require('es5-ext/number/to-pos-integer')

  , create = Object.create, hasOwnProperty = Object.prototype.hasOwnProperty;

module.exports = function (limit) {
	var size = 0, base = 1, queue = create(null), map = create(null), index = 0, del;
	limit = toPosInt(limit);
	return {
		hit: function (id) {
			var oldIndex = map[id], nuIndex = ++index;
			queue[nuIndex] = id;
			map[id] = nuIndex;
			if (!oldIndex) {
				++size;
				if (size <= limit) return;
				id = queue[base];
				del(id);
				return id;
			}
			delete queue[oldIndex];
			if (base !== oldIndex) return;
			while (!hasOwnProperty.call(queue, ++base)) continue; //jslint: skip
		},
		delete: del = function (id) {
			var oldIndex = map[id];
			if (!oldIndex) return;
			delete queue[oldIndex];
			delete map[id];
			--size;
			if (base !== oldIndex) return;
			if (!size) {
				index = 0;
				base = 1;
				return;
			}
			while (!hasOwnProperty.call(queue, ++base)) continue; //jslint: skip
		},
		clear: function () {
			size = 0;
			base = 1;
			queue = create(null);
			map = create(null);
			index = 0;
		}
	};
};

},{"es5-ext/number/to-pos-integer":44}],93:[function(require,module,exports){
// Support for asynchronous functions

'use strict';

var aFrom        = require('es5-ext/array/from')
  , objectMap    = require('es5-ext/object/map')
  , mixin        = require('es5-ext/object/mixin')
  , defineLength = require('es5-ext/function/_define-length')
  , nextTick     = require('next-tick')

  , slice = Array.prototype.slice
  , apply = Function.prototype.apply, create = Object.create
  , hasOwnProperty = Object.prototype.hasOwnProperty;

require('../lib/registered-extensions').async = function (tbi, conf) {
	var waiting = create(null), cache = create(null)
	  , base = conf.memoized, original = conf.original
	  , currentCallback, currentContext, currentArgs;

	// Initial
	conf.memoized = defineLength(function (arg) {
		var args = arguments, last = args[args.length - 1];
		if (typeof last === 'function') {
			currentCallback = last;
			args = slice.call(args, 0, -1);
		}
		return base.apply(currentContext = this, currentArgs = args);
	}, base);
	try { mixin(conf.memoized, base); } catch (ignore) {}

	// From cache (sync)
	conf.on('get', function (id) {
		var cb, context, args;
		if (!currentCallback) return;

		// Unresolved
		if (waiting[id]) {
			if (typeof waiting[id] === 'function') waiting[id] = [waiting[id], currentCallback];
			else waiting[id].push(currentCallback);
			currentCallback = null;
			return;
		}

		// Resolved, assure next tick invocation
		cb = currentCallback;
		context = currentContext;
		args = currentArgs;
		currentCallback = currentContext = currentArgs = null;
		nextTick(function () {
			var data;
			if (hasOwnProperty.call(cache, id)) {
				data = cache[id];
				conf.emit('getasync', id, args, context);
				apply.call(cb, data.context, data.args);
			} else {
				// Purged in a meantime, we shouldn't rely on cached value, recall
				currentCallback = cb;
				currentContext = context;
				currentArgs = args;
				base.apply(context, args);
			}
		});
	});

	// Not from cache
	conf.original = function () {
		var args, cb, origCb, result;
		if (!currentCallback) return apply.call(original, this, arguments);
		args = aFrom(arguments);
		cb = function self(err) {
			var cb, args, id = self.id;
			if (id == null) {
				// Shouldn't happen, means async callback was called sync way
				nextTick(apply.bind(self, this, arguments));
				return;
			}
			delete self.id;
			cb = waiting[id];
			delete waiting[id];
			if (!cb) {
				// Already processed,
				// outcome of race condition: asyncFn(1, cb), asyncFn.clear(), asyncFn(1, cb)
				return;
			}
			args = aFrom(arguments);
			if (conf.has(id)) {
				if (err) {
					conf.delete(id);
				} else {
					cache[id] = { context: this, args: args };
					conf.emit('setasync', id, (typeof cb === 'function') ? 1 : cb.length);
				}
			}
			if (typeof cb === 'function') {
				result = apply.call(cb, this, args);
			} else {
				cb.forEach(function (cb) { result = apply.call(cb, this, args); }, this);
			}
			return result;
		};
		origCb = currentCallback;
		currentCallback = currentContext = currentArgs = null;
		args.push(cb);
		result = apply.call(original, this, args);
		cb.cb = origCb;
		currentCallback = cb;
		return result;
	};

	// After not from cache call
	conf.on('set', function (id) {
		if (!currentCallback) {
			conf.delete(id);
			return;
		}
		if (waiting[id]) {
			// Race condition: asyncFn(1, cb), asyncFn.clear(), asyncFn(1, cb)
			if (typeof waiting[id] === 'function') waiting[id] = [waiting[id], currentCallback.cb];
			else waiting[id].push(currentCallback.cb);
		} else {
			waiting[id] = currentCallback.cb;
		}
		delete currentCallback.cb;
		currentCallback.id = id;
		currentCallback = null;
	});

	// On delete
	conf.on('delete', function (id) {
		var result;
		// If false, we don't have value yet, so we assume that intention is not
		// to memoize this call. After value is obtained we don't cache it but
		// gracefully pass to callback
		if (hasOwnProperty.call(waiting, id)) return;
		if (!cache[id]) return;
		result = cache[id];
		delete cache[id];
		conf.emit('deleteasync', id, slice.call(result.args, 1));
	});

	// On clear
	conf.on('clear', function () {
		var oldCache = cache;
		cache = create(null);
		conf.emit('clearasync', objectMap(oldCache, function (data) {
			return slice.call(data.args, 1);
		}));
	});
};

},{"../lib/registered-extensions":102,"es5-ext/array/from":25,"es5-ext/function/_define-length":31,"es5-ext/object/map":59,"es5-ext/object/mixin":60,"next-tick":113}],94:[function(require,module,exports){
// Call dispose callback on each cache purge

'use strict';

var callable   = require('es5-ext/object/valid-callable')
  , forEach    = require('es5-ext/object/for-each')
  , extensions = require('../lib/registered-extensions')

  , apply = Function.prototype.apply;

extensions.dispose = function (dispose, conf, options) {
	var del;
	callable(dispose);
	if ((options.async && extensions.async) || (options.promise && extensions.promise)) {
		conf.on('deleteasync', del = function (id, resultArray) {
			apply.call(dispose, null, resultArray);
		});
		conf.on('clearasync', function (cache) {
			forEach(cache, function (result, id) { del(id, result); });
		});
		return;
	}
	conf.on('delete', del = function (id, result) { dispose(result); });
	conf.on('clear', function (cache) {
		forEach(cache, function (result, id) { del(id, result); });
	});
};

},{"../lib/registered-extensions":102,"es5-ext/object/for-each":52,"es5-ext/object/valid-callable":66}],95:[function(require,module,exports){
// Timeout cached values

'use strict';

var aFrom      = require('es5-ext/array/from')
  , forEach    = require('es5-ext/object/for-each')
  , nextTick   = require('next-tick')
  , isPromise  = require('is-promise')
  , timeout    = require('timers-ext/valid-timeout')
  , extensions = require('../lib/registered-extensions')

  , noop = Function.prototype
  , max = Math.max, min = Math.min, create = Object.create;

extensions.maxAge = function (maxAge, conf, options) {
	var timeouts, postfix, preFetchAge, preFetchTimeouts;

	maxAge = timeout(maxAge);
	if (!maxAge) return;

	timeouts = create(null);
	postfix = ((options.async && extensions.async) || (options.promise && extensions.promise))
		? 'async' : '';
	conf.on('set' + postfix, function (id) {
		timeouts[id] = setTimeout(function () { conf.delete(id); }, maxAge);
		if (!preFetchTimeouts) return;
		if (preFetchTimeouts[id]) {
			if (preFetchTimeouts[id] !== 'nextTick') clearTimeout(preFetchTimeouts[id]);
		}
		preFetchTimeouts[id] = setTimeout(function () {
			delete preFetchTimeouts[id];
		}, preFetchAge);
	});
	conf.on('delete' + postfix, function (id) {
		clearTimeout(timeouts[id]);
		delete timeouts[id];
		if (!preFetchTimeouts) return;
		if (preFetchTimeouts[id] !== 'nextTick') clearTimeout(preFetchTimeouts[id]);
		delete preFetchTimeouts[id];
	});

	if (options.preFetch) {
		if ((options.preFetch === true) || isNaN(options.preFetch)) {
			preFetchAge = 0.333;
		} else {
			preFetchAge = max(min(Number(options.preFetch), 1), 0);
		}
		if (preFetchAge) {
			preFetchTimeouts = {};
			preFetchAge = (1 - preFetchAge) * maxAge;
			conf.on('get' + postfix, function (id, args, context) {
				if (!preFetchTimeouts[id]) {
					preFetchTimeouts[id] = 'nextTick';
					nextTick(function () {
						var result;
						if (preFetchTimeouts[id] !== 'nextTick') return;
						delete preFetchTimeouts[id];
						conf.delete(id);
						if (options.async) {
							args = aFrom(args);
							args.push(noop);
						}
						result = conf.memoized.apply(context, args);
						if (options.promise) {
							// Supress eventual error warnings
							if (isPromise(result)) {
								if (typeof result.done === 'function') result.done(noop, noop);
								else result.then(noop, noop);
							}
						}
					});
				}
			});
		}
	}

	conf.on('clear' + postfix, function () {
		forEach(timeouts, function (id) { clearTimeout(id); });
		timeouts = {};
		if (preFetchTimeouts) {
			forEach(preFetchTimeouts, function (id) {
				if (id !== 'nextTick') clearTimeout(id);
			});
			preFetchTimeouts = {};
		}
	});
};

},{"../lib/registered-extensions":102,"es5-ext/array/from":25,"es5-ext/object/for-each":52,"is-promise":91,"next-tick":113,"timers-ext/valid-timeout":115}],96:[function(require,module,exports){
// Limit cache size, LRU (least recently used) algorithm.

'use strict';

var toPosInteger = require('es5-ext/number/to-pos-integer')
  , lruQueue     = require('lru-queue')
  , extensions   = require('../lib/registered-extensions');

extensions.max = function (max, conf, options) {
	var postfix, queue, hit;

	max = toPosInteger(max);
	if (!max) return;

	queue = lruQueue(max);
	postfix = ((options.async && extensions.async) || (options.promise && extensions.promise))
		? 'async' : '';

	conf.on('set' + postfix, hit = function (id) {
		id = queue.hit(id);
		if (id === undefined) return;
		conf.delete(id);
	});
	conf.on('get' + postfix, hit);
	conf.on('delete' + postfix, queue.delete);
	conf.on('clear' + postfix, queue.clear);
};

},{"../lib/registered-extensions":102,"es5-ext/number/to-pos-integer":44,"lru-queue":92}],97:[function(require,module,exports){
// Support for functions returning promise

'use strict';

var objectMap = require('es5-ext/object/map')
  , isPromise = require('is-promise')
  , nextTick  = require('next-tick')

  , create = Object.create, hasOwnProperty = Object.prototype.hasOwnProperty;

require('../lib/registered-extensions').promise = function (mode, conf) {
	var waiting = create(null), cache = create(null), promises = create(null);

	// After not from cache call
	conf.on('set', function (id, ignore, promise) {
		var isFailed = false;

		if (!isPromise(promise)) {
			// Non promise result
			cache[id] = promise;
			conf.emit('setasync', id, 1);
			return;
		}
		waiting[id] = 1;
		promises[id] = promise;
		var onSuccess = function (result) {
			var count = waiting[id];
			if (isFailed) {
				throw new Error("Memoizee error: Promise resolved with both failure and success," +
					" this can be result of unordered done & finally resolution.\n" +
					"Instead of `promise: true` consider configuring memoization via `promise: 'then'` or " +
					"`promise: 'done'");
			}
			if (!count) return; // deleted from cache before resolved
			delete waiting[id];
			cache[id] = result;
			conf.emit('setasync', id, count);
		};
		var onFailure = function () {
			isFailed = true;
			if (!waiting[id]) return; // deleted from cache (or succeed in case of finally)
			delete waiting[id];
			delete promises[id];
			conf.delete(id);
		};

		if ((mode !== 'then') && (typeof promise.done === 'function')) {
			// Optimal promise resolution
			if ((mode !== 'done') && (typeof promise.finally === 'function')) {
				// Use 'finally' to not register error handling (still proper behavior is subject to
				// used implementation, if library throws unconditionally even on handled errors
				// switch to 'then' mode)
				promise.done(onSuccess);
				promise.finally(onFailure);
			} else {
				// With no `finally` side effect is that it mutes any eventual
				// "Unhandled error" events on returned promise
				promise.done(onSuccess, onFailure);
			}
		} else {
			// With no `done` it's best we can do.
			// Side effect is that it mutes any eventual "Unhandled error" events on returned promise
			promise.then(function (result) {
				nextTick(onSuccess.bind(this, result));
			}, function () {
				nextTick(onFailure);
			});
		}
	});

	// From cache (sync)
	conf.on('get', function (id, args, context) {
		var promise;
		if (waiting[id]) {
			++waiting[id]; // Still waiting
			return;
		}
		promise = promises[id];
		var emit = function () { conf.emit('getasync', id, args, context); };
		if (isPromise(promise)) {
			if (typeof promise.done === 'function') promise.done(emit);
			else promise.then(function () { nextTick(emit); });
		} else {
			emit();
		}
	});

	// On delete
	conf.on('delete', function (id) {
		delete promises[id];
		if (waiting[id]) {
			delete waiting[id];
			return; // Not yet resolved
		}
		if (!hasOwnProperty.call(cache, id)) return;
		var result = cache[id];
		delete cache[id];
		conf.emit('deleteasync', id, [result]);
	});

	// On clear
	conf.on('clear', function () {
		var oldCache = cache;
		cache = create(null);
		waiting = create(null);
		promises = create(null);
		conf.emit('clearasync', objectMap(oldCache, function (data) { return [data]; }));
	});
};

},{"../lib/registered-extensions":102,"es5-ext/object/map":59,"is-promise":91,"next-tick":113}],98:[function(require,module,exports){
// Reference counter, useful for garbage collector like functionality

'use strict';

var d          = require('d')
  , extensions = require('../lib/registered-extensions')

  , create = Object.create, defineProperties = Object.defineProperties;

extensions.refCounter = function (ignore, conf, options) {
	var cache, postfix;

	cache = create(null);
	postfix = ((options.async && extensions.async) || (options.promise && extensions.promise))
		? 'async' : '';

	conf.on('set' + postfix, function (id, length) { cache[id] = length || 1; });
	conf.on('get' + postfix, function (id) { ++cache[id]; });
	conf.on('delete' + postfix, function (id) { delete cache[id]; });
	conf.on('clear' + postfix, function () { cache = {}; });

	defineProperties(conf.memoized, {
		deleteRef: d(function () {
			var id = conf.get(arguments);
			if (id === null) return null;
			if (!cache[id]) return null;
			if (!--cache[id]) {
				conf.delete(id);
				return true;
			}
			return false;
		}),
		getRefCount: d(function () {
			var id = conf.get(arguments);
			if (id === null) return 0;
			if (!cache[id]) return 0;
			return cache[id];
		})
	});
};

},{"../lib/registered-extensions":102,"d":19}],99:[function(require,module,exports){
'use strict';

var normalizeOpts = require('es5-ext/object/normalize-options')
  , resolveLength = require('./lib/resolve-length')
  , plain         = require('./plain');

module.exports = function (fn/*, options*/) {
	var options = normalizeOpts(arguments[1]), length;

	if (!options.normalizer) {
		length = options.length = resolveLength(options.length, fn.length, options.async);
		if (length !== 0) {
			if (options.primitive) {
				if (length === false) {
					options.normalizer = require('./normalizers/primitive');
				} else if (length > 1) {
					options.normalizer = require('./normalizers/get-primitive-fixed')(length);
				}
			} else {
				if (length === false) options.normalizer = require('./normalizers/get')();
				else if (length === 1) options.normalizer = require('./normalizers/get-1')();
				else options.normalizer = require('./normalizers/get-fixed')(length);
			}
		}
	}

	// Assure extensions
	if (options.async) require('./ext/async');
	if (options.promise) require('./ext/promise');
	if (options.dispose) require('./ext/dispose');
	if (options.maxAge) require('./ext/max-age');
	if (options.max) require('./ext/max');
	if (options.refCounter) require('./ext/ref-counter');

	return plain(fn, options);
};

},{"./ext/async":93,"./ext/dispose":94,"./ext/max":96,"./ext/max-age":95,"./ext/promise":97,"./ext/ref-counter":98,"./lib/resolve-length":103,"./normalizers/get":110,"./normalizers/get-1":107,"./normalizers/get-fixed":108,"./normalizers/get-primitive-fixed":109,"./normalizers/primitive":111,"./plain":112,"es5-ext/object/normalize-options":61}],100:[function(require,module,exports){
'use strict';

var customError      = require('es5-ext/error/custom')
  , defineLength     = require('es5-ext/function/_define-length')
  , d                = require('d')
  , ee               = require('event-emitter').methods
  , resolveResolve   = require('./resolve-resolve')
  , resolveNormalize = require('./resolve-normalize')

  , apply = Function.prototype.apply, call = Function.prototype.call
  , create = Object.create, hasOwnProperty = Object.prototype.hasOwnProperty
  , defineProperties = Object.defineProperties
  , on = ee.on, emit = ee.emit;

module.exports = function (original, length, options) {
	var cache = create(null), conf, memLength, get, set, del, clear, extDel,
		extGet, extHas, normalizer, getListeners, setListeners, deleteListeners, memoized, resolve;
	if (length !== false) memLength = length;
	else if (isNaN(original.length)) memLength = 1;
	else memLength = original.length;

	if (options.normalizer) {
		normalizer = resolveNormalize(options.normalizer);
		get = normalizer.get;
		set = normalizer.set;
		del = normalizer.delete;
		clear = normalizer.clear;
	}
	if (options.resolvers != null) resolve = resolveResolve(options.resolvers);

	if (get) {
		memoized = defineLength(function (arg) {
			var id, result, args = arguments;
			if (resolve) args = resolve(args);
			id = get(args);
			if (id !== null) {
				if (hasOwnProperty.call(cache, id)) {
					if (getListeners) conf.emit('get', id, args, this);
					return cache[id];
				}
			}
			if (args.length === 1) result = call.call(original, this, args[0]);
			else result = apply.call(original, this, args);
			if (id === null) {
				id = get(args);
				if (id !== null) throw customError("Circular invocation", 'CIRCULAR_INVOCATION');
				id = set(args);
			} else if (hasOwnProperty.call(cache, id)) {
				throw customError("Circular invocation", 'CIRCULAR_INVOCATION');
			}
			cache[id] = result;
			if (setListeners) conf.emit('set', id, null, result);
			return result;
		}, memLength);
	} else if (length === 0) {
		memoized = function () {
			var result;
			if (hasOwnProperty.call(cache, 'data')) {
				if (getListeners) conf.emit('get', 'data', arguments, this);
				return cache.data;
			}
			if (!arguments.length) result = call.call(original, this);
			else result = apply.call(original, this, arguments);
			if (hasOwnProperty.call(cache, 'data')) {
				throw customError("Circular invocation", 'CIRCULAR_INVOCATION');
			}
			cache.data = result;
			if (setListeners) conf.emit('set', 'data', null, result);
			return result;
		};
	} else {
		memoized = function (arg) {
			var result, args = arguments, id;
			if (resolve) args = resolve(arguments);
			id = String(args[0]);
			if (hasOwnProperty.call(cache, id)) {
				if (getListeners) conf.emit('get', id, args, this);
				return cache[id];
			}
			if (args.length === 1) result = call.call(original, this, args[0]);
			else result = apply.call(original, this, args);
			if (hasOwnProperty.call(cache, id)) {
				throw customError("Circular invocation", 'CIRCULAR_INVOCATION');
			}
			cache[id] = result;
			if (setListeners) conf.emit('set', id, null, result);
			return result;
		};
	}
	conf = {
		original: original,
		memoized: memoized,
		get: function (args) {
			if (resolve) args = resolve(args);
			if (get) return get(args);
			return String(args[0]);
		},
		has: function (id) { return hasOwnProperty.call(cache, id); },
		delete: function (id) {
			var result;
			if (!hasOwnProperty.call(cache, id)) return;
			if (del) del(id);
			result = cache[id];
			delete cache[id];
			if (deleteListeners) conf.emit('delete', id, result);
		},
		clear: function () {
			var oldCache = cache;
			if (clear) clear();
			cache = create(null);
			conf.emit('clear', oldCache);
		},
		on: function (type, listener) {
			if (type === 'get') getListeners = true;
			else if (type === 'set') setListeners = true;
			else if (type === 'delete') deleteListeners = true;
			return on.call(this, type, listener);
		},
		emit: emit,
		updateEnv: function () { original = conf.original; }
	};
	if (get) {
		extDel = defineLength(function (arg) {
			var id, args = arguments;
			if (resolve) args = resolve(args);
			id = get(args);
			if (id === null) return;
			conf.delete(id);
		}, memLength);
	} else if (length === 0) {
		extDel = function () { return conf.delete('data'); };
	} else {
		extDel = function (arg) {
			if (resolve) arg = resolve(arguments)[0];
			return conf.delete(arg);
		};
	}
	extGet = defineLength(function () {
		var id, args = arguments;
		if (resolve) args = resolve(args);
		id = get(args);
		return cache[id];
	});
	extHas = defineLength(function () {
		var id, args = arguments;
		if (resolve) args = resolve(args);
		id = get(args);
		if (id === null) return false;
		return conf.has(id);
	});
	defineProperties(memoized, {
		__memoized__: d(true),
		delete: d(extDel),
		clear: d(conf.clear),
		_get: d(extGet),
		_has: d(extHas)
	});
	return conf;
};

},{"./resolve-normalize":104,"./resolve-resolve":105,"d":19,"es5-ext/error/custom":29,"es5-ext/function/_define-length":31,"event-emitter":90}],101:[function(require,module,exports){
'use strict';

var forEach       = require('es5-ext/object/for-each')
  , normalizeOpts = require('es5-ext/object/normalize-options')
  , callable      = require('es5-ext/object/valid-callable')
  , lazy          = require('d/lazy')
  , resolveLength = require('./resolve-length')
  , extensions    = require('./registered-extensions');

module.exports = function (memoize) {
	return function (props) {
		forEach(props, function (desc, name) {
			var fn = callable(desc.value), length;
			desc.value = function (options) {
				if (options.getNormalizer) {
					options = normalizeOpts(options);
					if (length === undefined) {
						length = resolveLength(options.length, fn.length, options.async && extensions.async);
					}
					options.normalizer = options.getNormalizer(length);
					delete options.getNormalizer;
				}
				return memoize(fn.bind(this), options);
			};
		});
		return lazy(props);
	};
};

},{"./registered-extensions":102,"./resolve-length":103,"d/lazy":20,"es5-ext/object/for-each":52,"es5-ext/object/normalize-options":61,"es5-ext/object/valid-callable":66}],102:[function(require,module,exports){
'use strict';

},{}],103:[function(require,module,exports){
'use strict';

var toPosInt = require('es5-ext/number/to-pos-integer');

module.exports = function (optsLength, fnLength, isAsync) {
	var length;
	if (isNaN(optsLength)) {
		length = fnLength;
		if (!(length >= 0)) return 1;
		if (isAsync && length) return length - 1;
		return length;
	}
	if (optsLength === false) return false;
	return toPosInt(optsLength);
};

},{"es5-ext/number/to-pos-integer":44}],104:[function(require,module,exports){
'use strict';

var callable = require('es5-ext/object/valid-callable');

module.exports = function (userNormalizer) {
	var normalizer;
	if (typeof userNormalizer === 'function') return { set: userNormalizer, get: userNormalizer };
	normalizer = { get: callable(userNormalizer.get) };
	if (userNormalizer.set !== undefined) {
		normalizer.set = callable(userNormalizer.set);
		if (userNormalizer.delete) normalizer.delete = callable(userNormalizer.delete);
		if (userNormalizer.clear) normalizer.clear = callable(userNormalizer.clear);
		return normalizer;
	}
	normalizer.set = normalizer.get;
	return normalizer;
};

},{"es5-ext/object/valid-callable":66}],105:[function(require,module,exports){
'use strict';

var toArray  = require('es5-ext/array/to-array')
  , callable = require('es5-ext/object/valid-callable')

  , slice = Array.prototype.slice
  , resolveArgs;

resolveArgs = function (args) {
	return this.map(function (r, i) {
		return r ? r(args[i]) : args[i];
	}).concat(slice.call(args, this.length));
};

module.exports = function (resolvers) {
	resolvers = toArray(resolvers);
	resolvers.forEach(function (r) {
		if (r != null) callable(r);
	});
	return resolveArgs.bind(resolvers);
};

},{"es5-ext/array/to-array":28,"es5-ext/object/valid-callable":66}],106:[function(require,module,exports){
'use strict';

module.exports = require('./lib/methods')(require('./'));

},{"./":99,"./lib/methods":101}],107:[function(require,module,exports){
'use strict';

var indexOf = require('es5-ext/array/#/e-index-of');

module.exports = function () {
	var lastId = 0, argsMap = [], cache = [];
	return {
		get: function (args) {
			var index = indexOf.call(argsMap, args[0]);
			return (index === -1) ? null : cache[index];
		},
		set: function (args) {
			argsMap.push(args[0]);
			cache.push(++lastId);
			return lastId;
		},
		delete: function (id) {
			var index = indexOf.call(cache, id);
			if (index !== -1) {
				argsMap.splice(index, 1);
				cache.splice(index, 1);
			}
		},
		clear: function () {
			argsMap = [];
			cache = [];
		}
	};
};

},{"es5-ext/array/#/e-index-of":22}],108:[function(require,module,exports){
'use strict';

var indexOf = require('es5-ext/array/#/e-index-of')
  , create = Object.create;

module.exports = function (length) {
	var lastId = 0, map = [[], []], cache = create(null);
	return {
		get: function (args) {
			var index = 0, set = map, i;
			while (index < (length - 1)) {
				i = indexOf.call(set[0], args[index]);
				if (i === -1) return null;
				set = set[1][i];
				++index;
			}
			i = indexOf.call(set[0], args[index]);
			if (i === -1) return null;
			return set[1][i] || null;
		},
		set: function (args) {
			var index = 0, set = map, i;
			while (index < (length - 1)) {
				i = indexOf.call(set[0], args[index]);
				if (i === -1) {
					i = set[0].push(args[index]) - 1;
					set[1].push([[], []]);
				}
				set = set[1][i];
				++index;
			}
			i = indexOf.call(set[0], args[index]);
			if (i === -1) {
				i = set[0].push(args[index]) - 1;
			}
			set[1][i] = ++lastId;
			cache[lastId] = args;
			return lastId;
		},
		delete: function (id) {
			var index = 0, set = map, i, path = [], args = cache[id];
			while (index < (length - 1)) {
				i = indexOf.call(set[0], args[index]);
				if (i === -1) {
					return;
				}
				path.push(set, i);
				set = set[1][i];
				++index;
			}
			i = indexOf.call(set[0], args[index]);
			if (i === -1) {
				return;
			}
			id = set[1][i];
			set[0].splice(i, 1);
			set[1].splice(i, 1);
			while (!set[0].length && path.length) {
				i = path.pop();
				set = path.pop();
				set[0].splice(i, 1);
				set[1].splice(i, 1);
			}
			delete cache[id];
		},
		clear: function () {
			map = [[], []];
			cache = create(null);
		}
	};
};

},{"es5-ext/array/#/e-index-of":22}],109:[function(require,module,exports){
'use strict';

module.exports = function (length) {
	if (!length) {
		return function () { return ''; };
	}
	return function (args) {
		var id = String(args[0]), i = 0, l = length;
		while (--l) { id += '\u0001' + args[++i]; }
		return id;
	};
};

},{}],110:[function(require,module,exports){
'use strict';

var indexOf = require('es5-ext/array/#/e-index-of')
  , create = Object.create;

module.exports = function () {
	var lastId = 0, map = [], cache = create(null);
	return {
		get: function (args) {
			var index = 0, set = map, i, length = args.length;
			if (length === 0) return set[length] || null;
			if ((set = set[length])) {
				while (index < (length - 1)) {
					i = indexOf.call(set[0], args[index]);
					if (i === -1) return null;
					set = set[1][i];
					++index;
				}
				i = indexOf.call(set[0], args[index]);
				if (i === -1) return null;
				return set[1][i] || null;
			}
			return null;
		},
		set: function (args) {
			var index = 0, set = map, i, length = args.length;
			if (length === 0) {
				set[length] = ++lastId;
			} else {
				if (!set[length]) {
					set[length] = [[], []];
				}
				set = set[length];
				while (index < (length - 1)) {
					i = indexOf.call(set[0], args[index]);
					if (i === -1) {
						i = set[0].push(args[index]) - 1;
						set[1].push([[], []]);
					}
					set = set[1][i];
					++index;
				}
				i = indexOf.call(set[0], args[index]);
				if (i === -1) {
					i = set[0].push(args[index]) - 1;
				}
				set[1][i] = ++lastId;
			}
			cache[lastId] = args;
			return lastId;
		},
		delete: function (id) {
			var index = 0, set = map, i, args = cache[id], length = args.length
			  , path = [];
			if (length === 0) {
				delete set[length];
			} else if ((set = set[length])) {
				while (index < (length - 1)) {
					i = indexOf.call(set[0], args[index]);
					if (i === -1) {
						return;
					}
					path.push(set, i);
					set = set[1][i];
					++index;
				}
				i = indexOf.call(set[0], args[index]);
				if (i === -1) {
					return;
				}
				id = set[1][i];
				set[0].splice(i, 1);
				set[1].splice(i, 1);
				while (!set[0].length && path.length) {
					i = path.pop();
					set = path.pop();
					set[0].splice(i, 1);
					set[1].splice(i, 1);
				}
			}
			delete cache[id];
		},
		clear: function () {
			map = [];
			cache = create(null);
		}
	};
};

},{"es5-ext/array/#/e-index-of":22}],111:[function(require,module,exports){
'use strict';

module.exports = function (args) {
	var id, i, length = args.length;
	if (!length) return '\u0002';
	id = String(args[i = 0]);
	while (--length) id += '\u0001' + args[++i];
	return id;
};

},{}],112:[function(require,module,exports){
'use strict';

var callable      = require('es5-ext/object/valid-callable')
  , forEach       = require('es5-ext/object/for-each')
  , extensions    = require('./lib/registered-extensions')
  , configure     = require('./lib/configure-map')
  , resolveLength = require('./lib/resolve-length')

  , hasOwnProperty = Object.prototype.hasOwnProperty;

module.exports = function self(fn/*, options */) {
	var options, length, conf;

	callable(fn);
	options = Object(arguments[1]);

	if (options.async && options.promise) {
		throw new Error("Options 'async' and 'promise' cannot be used together");
	}

	// Do not memoize already memoized function
	if (hasOwnProperty.call(fn, '__memoized__') && !options.force) return fn;

	// Resolve length;
	length = resolveLength(options.length, fn.length, options.async && extensions.async);

	// Configure cache map
	conf = configure(fn, length, options);

	// Bind eventual extensions
	forEach(extensions, function (fn, name) {
		if (options[name]) fn(options[name], conf, options);
	});

	if (self.__profiler__) self.__profiler__(conf);

	conf.updateEnv();
	return conf.memoized;
};

},{"./lib/configure-map":100,"./lib/registered-extensions":102,"./lib/resolve-length":103,"es5-ext/object/for-each":52,"es5-ext/object/valid-callable":66}],113:[function(require,module,exports){
'use strict';

var callable, byObserver;

callable = function (fn) {
	if (typeof fn !== 'function') throw new TypeError(fn + " is not a function");
	return fn;
};

byObserver = function (Observer) {
	var node = document.createTextNode(''), queue, currentQueue, i = 0;
	new Observer(function () {
		var callback;
		if (!queue) {
			if (!currentQueue) return;
			queue = currentQueue;
		} else if (currentQueue) {
			queue = currentQueue.concat(queue);
		}
		currentQueue = queue;
		queue = null;
		if (typeof currentQueue === 'function') {
			callback = currentQueue;
			currentQueue = null;
			callback();
			return;
		}
		node.data = (i = ++i % 2); // Invoke other batch, to handle leftover callbacks in case of crash
		while (currentQueue) {
			callback = currentQueue.shift();
			if (!currentQueue.length) currentQueue = null;
			callback();
		}
	}).observe(node, { characterData: true });
	return function (fn) {
		callable(fn);
		if (queue) {
			if (typeof queue === 'function') queue = [queue, fn];
			else queue.push(fn);
			return;
		}
		queue = fn;
		node.data = (i = ++i % 2);
	};
};

module.exports = (function () {
	// Node.js
	if ((typeof process === 'object') && process && (typeof process.nextTick === 'function')) {
		return process.nextTick;
	}

	// MutationObserver
	if ((typeof document === 'object') && document) {
		if (typeof MutationObserver === 'function') return byObserver(MutationObserver);
		if (typeof WebKitMutationObserver === 'function') return byObserver(WebKitMutationObserver);
	}

	// W3C Draft
	// http://dvcs.w3.org/hg/webperf/raw-file/tip/specs/setImmediate/Overview.html
	if (typeof setImmediate === 'function') {
		return function (cb) { setImmediate(callable(cb)); };
	}

	// Wide available standard
	if ((typeof setTimeout === 'function') || (typeof setTimeout === 'object')) {
		return function (cb) { setTimeout(callable(cb), 0); };
	}

	return null;
}());

},{}],114:[function(require,module,exports){
'use strict';

module.exports = 2147483647;

},{}],115:[function(require,module,exports){
'use strict';

var toPosInt   = require('es5-ext/number/to-pos-integer')
  , maxTimeout = require('./max-timeout');

module.exports = function (value) {
	value = toPosInt(value);
	if (value > maxTimeout) throw new TypeError(value + " exceeds maximum possible timeout");
	return value;
};

},{"./max-timeout":114,"es5-ext/number/to-pos-integer":44}],116:[function(require,module,exports){
'use strict';

var clc = require('cli-color');

function colorify(text, color) {
  if (clc && color) {
    return clc[color](text);
  } else {
    return text;
  }
}

module.exports = colorify;

},{"cli-color":8}],117:[function(require,module,exports){
'use strict';

// only works in NodeJS
// find error sources in text by url and context weight

var fs, path;
var isNode = false;
try {
  var _require = require;
  fs = _require('fs');
  path = _require('path');
  isNode = true;
} catch (err) {
  isNode = false;
}

function debug(msg) {
  // console.log( msg )
}

var removeContextFromText = require('./remove-context-from-text.js');

function parsePosition(pos) {
  // log('  line positioning string detected: ' + pos)
  var split = pos.split(/\D+/).filter(function (s) {
    return s;
  });
  debug('  parsed positioning string: ' + split.toString());
  return {
    lineno: /\d+/.exec(split[0])[0],
    colno: /\d+/.exec(split[1])[0]
  };
}

function findError(text) {
  var _rawText = text;
  text = removeContextFromText(text);

  var _lines = text.split('\n');

  debug(' === cwd directories === ');
  var cwdDirs = [];
  if (process && process.version && fs) {
    cwdDirs = fs.readdirSync(process.cwd()).filter(function (path) {
      return fs.lstatSync(path).isDirectory();
    });
  }
  debug(cwdDirs);
  debug(' === ');

  debug(' === urls === ');
  var match;
  var urls = [];
  var seekBuffer = text;
  var rePath = /[\S]*\.[a-zA-Z]+/g;
  var rePosition = /[(]?\s{0,5}\d+\s{0,5}?\D{1,20}\s{0,5}?\d+\s{0,5}[)]?/g;

  while (match = rePath.exec(text)) {
    var weight = 0;
    var indexOf = text.length - seekBuffer.length + seekBuffer.indexOf(match[0]);
    var lineNumber = text.substring(0, indexOf).split('\n').length - 1;
    var line = _lines[lineNumber];
    seekBuffer = text.substring(indexOf + match[0].length);

    if (line.toLowerCase().indexOf('node_modules') !== -1) weight -= 1.5;
    if (line.toLowerCase().indexOf('npm') !== -1) weight -= 0.1;
    if (line.toLowerCase().indexOf('Npm') !== -1) weight -= 0.25;
    if (line.toLowerCase().indexOf('NPM') !== -1) weight -= 0.75;

    if (line.toLowerCase().indexOf('error') !== -1) weight += 1;
    if (line.toLowerCase().indexOf('fail') !== -1) weight += 0.49;
    if (line.indexOf('Error') !== -1) weight += 0.50;

    // if current line has position information increase weight
    if (rePosition.test(line.toLowerCase())) {
      weight += 0.50;
    }

    // if prev line contains 'error' increase weight a little bit
    var prevLine = _lines[lineNumber - 1];
    if (typeof prevLine === 'string') {
      if (prevLine.toLowerCase().indexOf('error') !== -1) weight += 0.50;

      if (rePosition.test(prevLine.toLowerCase())) {
        weight += 0.05;
      }
    }

    // if next line contains 'error' increase weight a tiny bit
    var nextLine = _lines[lineNumber + 1];
    if (typeof nextLine === 'string') {
      if (nextLine.toLowerCase().indexOf('error') !== -1) weight += 0.25;

      if (rePosition.test(nextLine.toLowerCase())) {
        weight += 0.35;
      }
    }

    debug(' url found: ' + match[0] + ', weight: ' + weight);
    debug('  line: ' + line);

    urls.push({
      weight: weight,
      line: line,
      lineNumber: lineNumber,
      match: match[0]
    });

    // for convenience check up one dir level
    urls.push({
      weight: weight - 0.1,
      line: line,
      lineNumber: lineNumber,
      match: '../' + match[0]
    });

    // for convenience check up two dir levels
    urls.push({
      weight: weight - 0.15,
      line: line,
      lineNumber: lineNumber,
      match: '../../' + match[0]
    });

    // for convenience check down one dir level
    cwdDirs.forEach(function (dir) {
      urls.push({
        weight: weight - 0.20,
        line: line,
        lineNumber: lineNumber,
        match: dir + '/' + match[0]
      });
    });
  }

  debug('sorting urls by weight');
  urls = urls.sort(function (a, b) {
    return b.weight - a.weight;
  });

  var bestUrl;
  var bestResolvedPath;
  for (var i = 0; i < urls.length; i++) {
    var url = urls[i];
    var resolvedPath = path.resolve(url.match);
    var exists = fs.existsSync(resolvedPath);
    if (exists) {
      bestResolvedPath = resolvedPath;
      bestUrl = url;
      debug(' >> deciding line: ' + url.line);
      break;
    }
  }

  // if (!urls[0]) return console.log('no errors detected')
  if (!bestUrl) {
    debug('no url matches');
    return false;
  }

  if (bestUrl.weight <= 0) {
    debug(' >>>>> url match weight at or below 0 -- consider as no error found');
    return false;
  }

  debug('   > most likely source URL: ' + bestUrl.match);

  debug(' === positions === ');
  var matches = [];
  var rePosition = /[(]?\s{0,5}\d+\s{0,5}?\D{1,20}\s{0,5}?\d+\s{0,5}[)]?/g;
  // match = rePosition.exec(text)
  seekBuffer = text;
  while (match = rePosition.exec(text)) {
    var weight = 0;

    var indexOf = text.length - seekBuffer.length + seekBuffer.indexOf(match[0]);
    var lineNumber = text.substring(0, indexOf).split('\n').length - 1;
    var line = _lines[lineNumber];
    var words = line.split(/\s+/);
    // console.debug(words)
    // console.debug(match[0])
    var word = words.filter(function (w) {
      return w.indexOf(match[0]) !== -1;
    })[0];
    seekBuffer = text.substring(indexOf + match[0].length);

    debug(' position word boundary: ' + word + ', match: ' + match[0]);
    // if matched word boundary contains '/' (path seperators) decrease weight
    // this avoids parsing path names as error positions (in case a path name happens to match)
    if (word && word.indexOf('/') !== -1) weight -= 1;

    // avoid parsing lines with node_modules in them (most likely stack traces..)
    if (line.toLowerCase().indexOf('node_modules') !== -1) weight -= 1;
    if (line.toLowerCase().indexOf('npm') !== -1) weight -= 0.5;

    // if current line contains 'error' increase weight
    if (line.toLowerCase().indexOf('error') !== -1) weight += 1;
    if (line.toLowerCase().indexOf('fail') !== -1) weight += 1;
    if (line.indexOf('Error') !== -1) weight += 1;

    // decrease weight if match has letters in them
    if (line.toLowerCase().match(/[a-z]/)) weight -= 0.1;

    // if prev line contains 'error' increase weight a little bit
    var prevLine = _lines[lineNumber - 1];
    if (typeof prevLine === 'string') {
      if (prevLine.toLowerCase().indexOf('error') !== -1) weight += 0.50;
    }

    // if next line contains 'error' increase weight a tiny bit
    var nextLine = _lines[lineNumber + 1];
    if (typeof nextLine === 'string') {
      if (nextLine.toLowerCase().indexOf('error') !== -1) weight += 0.25;
    }

    if (line.indexOf(bestUrl.match) !== -1) weight++;

    debug(' position found: ' + match[0] + ', weight: ' + weight);
    debug('  line: ' + line);

    matches.push({
      line: line,
      weight: weight,
      lineNumber: lineNumber,
      match: match[0]
    });
  }

  // if (!matches.length > 0) return console.log('no errors detected')
  if (matches.length < 1) {
    debug('no positional matches, trying special cases');

    // special case positional matching.
    // for vanilla browserify prints only url and line number,
    // and a context snippet with column indicated by a ^ marker
    // so in order to know which column the error it, we need to
    // check how far the ^ character is to the right...  (:
    // it's stupid but it works.

    if (bestUrl) {
      try {
        var line = _lines.slice(bestUrl.lineNumber - 1).filter(function (l) {
          return l.indexOf('^') >= 0;
        })[0];

        var lineNumber = bestUrl.line.split(':')[1].replace(/\D/g, '');
        var column = line.indexOf('^');

        matches.push({
          line: line,
          weight: 999,
          lineNumber: lineNumber,
          match: '(' + lineNumber + ':' + column + ')'
        });

        debug('special case positioning found: ' + matches[0].match);
      } catch (err) {
        debug('no special case positioning found.');
      }
    }
  }

  if (matches.length < 1) {
    debug('still no positional matches, even after checking special cases');
    return false;
  }

  // sort positions
  debug('sorting positions');
  var r = matches.sort(function (a, b) {
    return b.weight - a.weight;
  });

  if (r[0].weight <= 0) {
    debug(' >>>>> pos match weight at or below 0 -- consider as no error found');
    return false;
  }

  var bestMatch = r[0].match;
  debug('pos bestMatch: ' + bestMatch);

  var _likelyErrorDescription;
  _lines.forEach(function (line) {
    if (line.indexOf('Error') >= 0) _likelyErrorDescription = line;
  });

  if (!_likelyErrorDescription) {
    _lines.forEach(function (line) {
      if (line.toLowerCase().indexOf('unexpected') >= 0) _likelyErrorDescription = line;
      if (line.toLowerCase().indexOf('failed') >= 0) _likelyErrorDescription = line;
    });
  }

  if (!_likelyErrorDescription) {
    _likelyErrorDescription = '[ Unknown Error ]';
  }

  debug('   > most likely error description: ' + _likelyErrorDescription);

  var pos = parsePosition(bestMatch);
  return {
    message: _likelyErrorDescription,
    url: bestUrl,
    path: bestResolvedPath,
    lineno: pos.lineno,
    colno: pos.colno
  };
}

module.exports = findError;

},{"./remove-context-from-text.js":120}],118:[function(require,module,exports){
'use strict';

var prettifyText = require('./prettify-text.js');

var colorify = require('./colorify.js');

function parseContext(opts) {
  // var url = opts.url
  // var message = opts.message

  var text = opts.text;
  var rawLines = text.split('\n');
  var lines = rawLines.slice();

  // prettify context lines
  if (opts.prettify) {
    var buffer = lines.join('\n');
    var path = opts.url || opts.path || opts.filename || opts.filepath;
    var p = prettifyText(buffer, path);
    lines = p.split('\n');
  }

  var colno = opts.colno;
  var lineno = opts.lineno;

  var i = Math.max(0, lineno - 6); // first line
  var j = Math.min(lines.length - 1, i + 4 + 2 + 2); // last line

  var minLeftPadding = String(j).trim().length;

  var parsedLines = [];
  for (; i < j; i++) {
    var head = String(i + 1).trim(); // line number column
    var body = lines[i]; // line text content

    // currently parsing target line
    var onTargetLine = i === lineno - 1;

    // left pad
    while (head.length < minLeftPadding) {
      head = ' ' + head;
    } // target line
    if (onTargetLine) {
      if (opts.prettify) {
        head = colorify(head, 'whiteBright');
      }

      // prepend > arrow

      if (opts.prettify) {
        head = colorify('> ', 'redBright') + head;
      } else {
        head = '> ' + head;
      }
    } else {
      // context line
      if (opts.prettify) {
        head = colorify(head, 'blackBright');
      }
      // prepend two spaces ( to stay aligned with the targeted line '> ' )
      head = '  ' + head;
    }

    // separate line number and line content
    var line = head + ' | ' + body;
    parsedLines.push(line);

    // draw an arrow pointing upward to column location
    if (onTargetLine) {
      var offset = ''; // ^ pointer offset
      for (var x = 0; x < colno; x++) {
        offset += ' ';
      }
      var _head = String(j).trim().split(/./).join(' ') + '   | ';

      if (opts.prettify) {
        parsedLines.push(_head + offset + colorify('^', 'redBright'));
      } else {
        parsedLines.push(_head + offset + '^');
      }
    }
  }

  return parsedLines;
}

module.exports = parseContext;

},{"./colorify.js":116,"./prettify-text.js":119}],119:[function(require,module,exports){
'use strict';

var colorify = require('./colorify.js');

// https://github.com/chalk/ansi-regex
var ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g;

function stripAnsi(str) {
  return str.replace(ansiRegex, '');
}

function prettifyText(text, filename) {
  var parseToken = parseCodeToken;

  var split = filename.split('.');
  var suffix = split[split.length - 1];

  if (testToken(suffix, ['less/i', 'styl/i', 'sass/i', 'scss/i', 'css/i'])) {
    // assume css syntax
    parseToken = parseStyleToken;
  }

  text = stripAnsi(text);

  var penColor = 'whiteBright';
  var mode = 'normal';

  var prettyLines = [];
  var lines = text.split('\n');

  lines.forEach(function (line) {
    var output = '';
    var tokenBuffer = '';

    var i, c;
    // loop through all characters in the thext
    for (i = 0; i < line.length; i++) {
      c = line[i];

      switch (mode) {
        case 'normal':
          switch (c) {
            case "'":
            case '"':
              // finish current token ( if any )
              output += parseToken(tokenBuffer, penColor);
              tokenBuffer = ''; // reset token buffer

              // switch modes
              mode = 'quotes';
              penColor = 'green';
              tokenBuffer += c;
              break;

            case '{':
            case '}':
            // TODO unsure to include braces?
            case '<':
            case '>':
            // TODO unsure to include braces?
            case '+':
            case '-':
            case '*':
            case '%':
            case '=':
            case ';':
            case ':':
            case '.':
            case ',':
            case '?':
            case '!':
              // finish current token
              output += parseToken(tokenBuffer, penColor);
              tokenBuffer = ''; // reset token buffer

              // colorize character
              output += parseToken(c, 'yellow');
              break;

            case '/':
              if (i + 1 < line.length) {
                var nextCharacter = line[i + 1];
                switch (nextCharacter) {
                  case '/':
                    // finish current token
                    output += parseToken(tokenBuffer, penColor);
                    tokenBuffer = ''; // reset token buffer

                    // add comment
                    output += colorify(line.slice(i), 'blackBright');
                    i = line.length; // end of line
                    break;

                  case '*':
                    // finish current token
                    output += parseToken(tokenBuffer, penColor);
                    tokenBuffer = ''; // reset token buffer

                    // enter new mode ( lasts until cancelled )
                    mode = 'commentstar';
                    penColor = 'blackBright';

                    tokenBuffer += c;
                    break;

                  default:
                    // finish current token
                    output += parseToken(tokenBuffer, penColor);
                    tokenBuffer = ''; // reset token buffer
                    output += parseToken(c, 'yellow');
                }
              } else {
                // finish current token
                output += parseToken(tokenBuffer, penColor);
                tokenBuffer = ''; // reset token buffer

                output += parseToken(c, 'yellow');
              }
              break;

            case '(':
            case ')':
              // TODO unsure to include parens?
              // finish current token
              output += parseToken(tokenBuffer, penColor);
              tokenBuffer = ''; // reset token buffer

              // colorize character
              output += parseToken(c, 'white');
              break;

            case ' ':
              tokenBuffer += c;
              // finish current token
              output += parseToken(tokenBuffer, penColor);
              tokenBuffer = ''; // reset token buffer
              break;

            default:
              tokenBuffer += c;
          }
          break;

        case 'quotes':
          switch (c) {
            case "'":
            case '"':
              tokenBuffer += c;
              // finish current token
              output += parseToken(tokenBuffer, penColor);
              tokenBuffer = ''; // reset token buffer

              // enter new mode
              mode = 'normal';
              penColor = 'whiteBright';
              break;

            default:
              tokenBuffer += c;
          }
          break;

        case 'commentstar':
          switch (c) {
            case '*':
              if (i + 1 < line.length) {
                var nextCharacter = line[i + 1];
                if (nextCharacter === '/') {
                  tokenBuffer += c;
                  tokenBuffer += nextC;
                  i += 1;

                  // finish current token
                  output += parseToken(tokenBuffer, 'blackBright');
                  tokenBuffer = ''; // reset token buffer

                  // enter new mode
                  mode = 'normal';
                  penColor = 'whiteBright';
                  break;
                }
              }

            default:
              buffer += c;
          }
          break;

        default:
          throw new Error('prettify-text.js error');
      }
    }

    // finish current token
    output += parseToken(tokenBuffer, penColor);
    tokenBuffer = ''; // reset token buffer

    prettyLines.push(output);
  });

  if (prettyLines.length !== lines.length) {
    throw new Error('prettyfying resulted in different number of output lines');
  }

  return prettyLines.join('\n');
}

function parseCodeToken(token, penColor) {
  if (testToken(token, ['function', 'atob', 'btoa', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'document'], 'ts')) {
    return colorify(token, 'cyan');
  }

  if (testToken(token, ['return', 'var', 'new', 'do', 'void', 'if', 'else', 'break', 'catch', 'instanceof', 'with', 'throw', 'case', 'default', 'try', 'this', 'switch', 'continue', 'typeof', 'delete', 'let', 'yield', 'const', 'export', 'super', 'debugger', 'as', 'async', 'await', 'static', 'import', 'from', 'arguments', 'window'], 'ts')) {
    return colorify(token, 'redBright');
  }

  if (testToken(token, ['true', 'false', 'null', 'undefined'], 'ts')) {
    return colorify(token, 'magentaBright');
  }

  if (testToken(token, ['Date', 'Object', 'Function', 'Number', 'Math', 'String', 'RegExp', 'Array', 'Boolean'], 'ts')) {
    return colorify(token, 'yellow');
  }

  return colorify(token, penColor);
}

function parseStyleToken(token, penColor) {
  if (testToken(token, ['align-content', 'align-items', 'align-self', 'all', 'animation', 'animation-delay', 'animation-direction', 'animation-duration', 'animation-fill-mode', 'animation-iteration-count', 'animation-name', 'animation-play-state', 'animation-timing-function', 'backface-visibility', 'background', 'background-attachment', 'background-blend-mode', 'background-clip', 'background-color', 'background-image', 'background-origin', 'background-position', 'background-repeat', 'background-size', 'border', 'border-bottom', 'border-bottom-color', 'border-bottom-left-radius', 'border-bottom-right-radius', 'border-bottom-style', 'border-bottom-width', 'border-collapse', 'border-color', 'border-image', 'border-image-outset', 'border-image-repeat', 'border-image-slice', 'border-image-source', 'border-image-width', 'border-left', 'border-left-color', 'border-left-style', 'border-left-width', 'border-radius', 'border-right', 'border-right-color', 'border-right-style', 'border-right-width', 'border-spacing', 'border-style', 'border-top', 'border-top-color', 'border-top-left-radius', 'border-top-right-radius', 'border-top-style', 'border-top-width', 'border-width', 'bottom', 'box-shadow', 'box-sizing', 'caption-side', 'clear', 'clip', 'color', 'column-count', 'column-fill', 'column-gap', 'column-rule', 'column-rule-color', 'column-rule-style', 'column-rule-width', 'column-span', 'column-width', 'columns', 'content', 'counter-increment', 'counter-reset', 'cursor', 'direction', 'display', 'empty-cells', 'filter', 'flex', 'flex-basis', 'flex-direction', 'flex-flow', 'flex-grow', 'flex-shrink', 'flex-wrap', 'float', 'font', '@font-face', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'hanging-punctuation', 'height', 'justify-content', '@keyframes', 'left', 'letter-spacing', 'line-height', 'list-style', 'list-style-image', 'list-style-position', 'list-style-type', 'margin', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top', 'max-height', 'max-width', '@media', 'min-height', 'min-width', 'nav-down', 'nav-index', 'nav-left', 'nav-right', 'nav-up', 'opacity', 'order', 'outline', 'outline-color', 'outline-offset', 'outline-style', 'outline-width', 'overflow', 'overflow-x', 'overflow-y', 'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top', 'page-break-after', 'page-break-before', 'page-break-inside', 'perspective', 'perspective-origin', 'position', 'quotes', 'resize', 'right', 'tab-size', 'table-layout', 'text-align', 'text-align-last', 'text-decoration', 'text-decoration-color', 'text-decoration-line', 'text-decoration-style', 'text-indent', 'text-justify', 'text-overflow', 'text-shadow', 'text-transform', 'top', 'transform', 'transform-origin', 'transform-style', 'transition', 'transition-delay', 'transition-duration', 'transition-property', 'transition-timing-function', 'unicode-bidi', 'user-select', 'vertical-align', 'visibility', 'white-space', 'width', 'word-break', 'word-spacing', 'word-wrap', 'z-index'])) {
    return colorify(token, 'cyan');
  }

  if (testToken(token, ['html', 'head', 'meta', 'link', 'title', 'base', 'body', 'style', 'nav', 'header', 'footer', 'main', 'aside', 'article', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hgroup', 'div', 'p', 'pre', 'blockquote', 'hr', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'span', 'a', 'em', 'strong', 'b', 'i', 'u', 's', 'mark', 'small', 'del', 'ins', 'sup', 'sub', 'dfn', 'code', 'var', 'samp', 'kbd', 'q', 'cite', 'ruby', 'rt', 'rp', 'br', 'wbr', 'bdo', 'bdi', 'table', 'caption', 'tr', 'td', 'th', 'thead', 'tfoot', 'tbody', 'colgroup', 'col', 'img', 'figure', 'figcaption', 'map', 'area', 'video', 'audio', 'source', 'track', 'script', 'noscript', 'object', 'param', 'embed', 'iframe', 'canvas', 'abbr', 'address', 'meter', 'progress', 'time', 'form', 'button', 'input', 'textarea', 'select', 'option', 'optgroup', 'label', 'fieldset', 'legend', 'keygen', 'command', 'datalist', 'menu', 'output', 'details', 'summary'], 'ts')) {
    return colorify(token, 'redBright');
  }

  if (testToken(token, ['sans-serif', 'monospace', 'Times', 'serif', 'Arial', 'Helvetica', 'Impact', 'Charcoal', 'Tahoma', 'Geneva', 'Trebuchet', 'Verdana', 'table-caption', 'table-column', 'table-column-group', 'line-through', 'bidi-override', 'inline-block', 'inline', 'open-quote', 'close-quote', 'normal', 'smaller', 'super', 'sub', 'separate', 'table-row-group', 'table-footer-group', 'table-header-group', 'table-cell', 'table-row', 'middle', 'inherit', 'block', 'default', 'inset', 'disc', 'decimal', 'absolute', 'none', 'hidden', 'bold', 'italic', 'underline', 'auto', 'center', 'pre', '0'], 's')) {
    return colorify(token, 'magentaBright');
  }

  if (token.trim()[0] === '.') {
    return colorify(token, 'greenBright');
  }

  if (token.trim()[0] === '#') {
    return colorify(token, 'yellowBright');
  }

  return colorify(token, penColor);
}

function testToken(str, tests, globalModifiers) {
  if (typeof tests === 'string') tests = [tests];

  var i, test, t, split, r, s, j;

  loop: for (i = 0; i < tests.length; i++) {
    test = tests[i];
    s = str;

    split = test.split('/');
    t = split[0];
    r = split[1] || '';
    if (globalModifiers) r += globalModifiers;

    for (j = 0; j < r.length; j++) {
      var c = r[j];
      switch (c) {
        case 'i':
          t = t.toLowerCase();
          s = s.toLowerCase();
          break;
        case 't':
          t = t.trim();
          s = s.trim();
          break;
        case 's':
          // clamp to same size
          // same length/size
          if (s.length !== t.length) continue loop;
          break;
      }
    }

    if (s.indexOf(t) >= 0) return true;
  }

  return false;
}

module.exports = prettifyText;

},{"./colorify.js":116}],120:[function(require,module,exports){
'use strict';

// attempt to strip code context lines from text
function removeContextFromText(text) {
  var lines = text.split('\n').map(function (line) {
    return {
      text: line
    };
  });

  lines.forEach(function (line) {
    var text = line.text;
    var head = text.substring(0, 10);
    var match;

    var reLineNumber = /\s{0,5}\d+\s{1,2}[|:]?\s{0,5}/;
    var match = reLineNumber.exec(head); // match against head of string
    if (match && match[0]) {
      line.possibleSnippet = true;
      // debug('possibleSnippet found: ' + text)
    }
  });

  for (var i = 0; i < lines.length; i++) {
    var prevLine = lines[i - 1] || undefined;
    var currentLine = lines[i];
    var nextLine = lines[i + 1] || undefined;

    if (currentLine.possibleSnippet) {
      if (prevLine && prevLine.possibleSnippet) {
        lines[i].detectedSnippet = true;
      }
      if (nextLine && nextLine.possibleSnippet) {
        lines[i].detectedSnippet = true;
      }
    }
  }

  // lines.forEach(function (line) {
  //   if (line.detectedSnippet) debug('detectedSnippet: ' + line.text)
  // })

  return lines.filter(function (line) {
    return !line.detectedSnippet;
  }).map(function (line) {
    return line.text;
  }).join('\n');
}

module.exports = removeContextFromText;

},{}],121:[function(require,module,exports){
'use strict';

// shorten urls in error description
// (path/to/file -> p/t/file)
function shortenUrls(url, length) {
  length = length || 3;

  var words = url.split(/\s+/);
  words = words.map(function (word) {
    if (word.indexOf('.') >= 0 || word.indexOf('/') >= 0) {
      // word = transformToRelativePaths( word )
      var split = word.split('/');
      var lastFileName = split.pop();
      var result = '';
      split.forEach(function (fileName) {
        if (fileName) {
          var i,
              len = length;
          if (length > fileName.length) len = fileName.length;
          for (i = 0; i < len; i++) {
            result += fileName[i];
          }
          result += '/';
        }
      });
      result += lastFileName;
      return result;
      // return clc.magenta(result)
    } else {
      return word;
    }
  });

  return words.join(' ');
  // log(
  //   ' ' + clc.redBright( words.join(' ') )
  // )
}

module.exports = shortenUrls;

},{}],122:[function(require,module,exports){
'use strict';

// only works in NodeJS

var fs, path;
var isNode = false;
try {
  var _require = require;
  fs = _require('fs');
  path = _require('path');
  isNode = true;
} catch (err) {
  isNode = false;
}

var colorify = require('./colorify.js');

function debug(msg) {
  console.log(msg);
}

function transformToRelativePaths(text, transformPath) {
  if (isNode) {
    if (!transformPath) {
      transformPath = function transformPath(path) {
        return path;
      };
    }

    var match;
    var urls = [];
    var rePath = /[\S]*\.[a-zA-Z]+/g;

    while (match = rePath.exec(text)) {
      urls.push({
        match: match[0],
        absolutePath: path.resolve(match[0])
      });
    }

    urls = urls.filter(function (url) {
      // filter out non-file paths
      try {
        return fs.existsSync(url.absolutePath);
        return true;
      } catch (err) {
        return false;
      }
    });

    urls.forEach(function (url) {
      debug('trans match: ' + url.match);
      // replace matches path with a transformed path.relative path
      // var relativePath = './' + path.relative(__dirname, url.absolutePath)
      var relativePath = './' + path.relative(process.cwd(), url.absolutePath);
      debug('trans relpath: ' + relativePath);
      text = text.split(url.match)
      // .join( colorify( ' ' + relativePath, 'cyan' ).trim() )
      .join(transformPath(' ' + relativePath));
    });

    // debug(urls)

    return text.split(/\s+/).join(' ');
  } else {
    throw new Error(' NOT IN NODE JS ================== ');
    return text;
  }
}

module.exports = transformToRelativePaths;

},{"./colorify.js":116}],123:[function(require,module,exports){
'use strict';

var fs, path;
var isNode = false;

try {
  var _require = require;
  fs = _require('fs');
  path = _require('path');
  isNode = true;
} catch (err) {
  isNode = false;
}

var colorify = require('./colorify.js');

// console.log( ' == isNode: ' + isNode + ' == ' )

function debug(msg) {
  console.log(msg);
}

// https://github.com/chalk/ansi-regex
var ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g;

function stripAnsi(str) {
  return str.replace(ansiRegex, '');
}

var parseContext = require('./parse-context.js');
var findError = require('./find-error.js');
var transformToRelativePaths = require('./transform-to-relative-paths.js');
var shortenUrls = require('./shorten-urls.js');

function _api(text, callback) {
  if (!isNode) {
    throw new Error('This function cannot be run in the Browser.');
  }

  var opts = {
    prettify: true,
    relative: true,
    shorten: true
  };

  var raw = text;
  var returnValue = raw;

  text = stripAnsi(text);

  debug(' === text === ');
  debug(text);
  debug(' === ==== === ');

  var error = findError(text);

  if (error) {
    debug('match: ' + error.url.match);
    debug('resolved match: ' + path.resolve(error.url.match));
    debug('path: ' + error.path);
    debug('pos: ' + error.lineno + ':' + error.colno);
    var filepath = error.path || path.resolve(error.url.match);

    var lines = parseContext({
      filename: filepath,
      prettify: opts.prettify,
      text: fs.readFileSync(filepath, { encoding: 'utf8' }),
      lineno: error.lineno,
      colno: error.colno
    });

    var context = lines.join('\n');

    var description = error.message || '[ Unknown Error ]';

    // highlight "error" words
    if (opts.prettify) {
      var lineLength = 0;
      var output = ' ';
      var words = description.split(/\s+/);

      words.forEach(function (word) {
        var raw = word;
        var rawLow = raw.toLowerCase();
        if (rawLow.indexOf('error') !== -1) {
          word = colorify(raw, 'red');
        }

        if (rawLow.indexOf('/') !== -1 || rawLow.indexOf('.') !== -1) {
          if (opts.relative) {
            word = transformToRelativePaths(raw, function (path) {
              if (opts.prettify) {
                return colorify(path, 'magentaBright');
              } else {
                return path;
              }
            });
          }

          if (opts.shorten) {
            word = shortenUrls(word);
          }
        }

        output += word.trim();

        lineLength += raw.length;
        if (lineLength > 70) {
          lineLength = 0;
          output += '\n ';
        }

        output += ' ';
      });

      description = ' ' + output.trim();
    }

    if (opts.prettify) {
      var output = [colorify('>> wooster output <<', 'blackBright'), description, '', ' @ ' + transformToRelativePaths(filepath, function (path) {
        return colorify(path, 'magentaBright');
      }) + ' ' + colorify(error.lineno, 'redBright') + ':' + colorify(error.colno, 'redBright')].join('\n');
    } else {}

    output += '\n' + context;

    debug(output);
    returnValue = output;
  } else {
    returnValue = raw;
  }

  if (typeof callback === 'function') {
    callback(returnValue);
  }

  return returnValue;
}

module.exports = _api;

},{"./colorify.js":116,"./find-error.js":117,"./parse-context.js":118,"./shorten-urls.js":121,"./transform-to-relative-paths.js":122}]},{},[123])(123)
});