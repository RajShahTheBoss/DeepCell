Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

/** @babel */

var ParsedColor = null;

// Essential: A simple color class returned from {Config::get} when the value
// at the key path is of type 'color'.

var Color = (function () {
  _createClass(Color, null, [{
    key: 'parse',

    // Essential: Parse a {String} or {Object} into a {Color}.
    //
    // * `value` A {String} such as `'white'`, `#ff00ff`, or
    //   `'rgba(255, 15, 60, .75)'` or an {Object} with `red`, `green`, `blue`,
    //   and `alpha` properties.
    //
    // Returns a {Color} or `null` if it cannot be parsed.
    value: function parse(value) {
      switch (typeof value) {
        case 'string':
          break;
        case 'object':
          if (Array.isArray(value)) {
            return null;
          }
          break;
        default:
          return null;
      }

      if (!ParsedColor) {
        ParsedColor = require('color');
      }

      try {
        var parsedColor = new ParsedColor(value);
      } catch (error) {
        return null;
      }

      return new Color(parsedColor.red(), parsedColor.green(), parsedColor.blue(), parsedColor.alpha());
    }
  }]);

  function Color(red, green, blue, alpha) {
    _classCallCheck(this, Color);

    this.red = red;
    this.green = green;
    this.blue = blue;
    this.alpha = alpha;
  }

  _createClass(Color, [{
    key: 'toHexString',

    // Essential: Returns a {String} in the form `'#abcdef'`.
    value: function toHexString() {
      return '#' + numberToHexString(this.red) + numberToHexString(this.green) + numberToHexString(this.blue);
    }

    // Essential: Returns a {String} in the form `'rgba(25, 50, 75, .9)'`.
  }, {
    key: 'toRGBAString',
    value: function toRGBAString() {
      return 'rgba(' + this.red + ', ' + this.green + ', ' + this.blue + ', ' + this.alpha + ')';
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return this.alpha === 1 ? this.toHexString() : this.toRGBAString();
    }
  }, {
    key: 'isEqual',
    value: function isEqual(color) {
      if (this === color) {
        return true;
      }

      if (!(color instanceof Color)) {
        color = Color.parse(color);
      }

      if (color == null) {
        return false;
      }

      return color.red === this.red && color.blue === this.blue && color.green === this.green && color.alpha === this.alpha;
    }
  }, {
    key: 'clone',
    value: function clone() {
      return new Color(this.red, this.green, this.blue, this.alpha);
    }
  }, {
    key: 'red',
    set: function set(red) {
      this._red = parseColor(red);
    },
    get: function get() {
      return this._red;
    }
  }, {
    key: 'green',
    set: function set(green) {
      this._green = parseColor(green);
    },
    get: function get() {
      return this._green;
    }
  }, {
    key: 'blue',
    set: function set(blue) {
      this._blue = parseColor(blue);
    },
    get: function get() {
      return this._blue;
    }
  }, {
    key: 'alpha',
    set: function set(alpha) {
      this._alpha = parseAlpha(alpha);
    },
    get: function get() {
      return this._alpha;
    }
  }]);

  return Color;
})();

exports['default'] = Color;

function parseColor(colorString) {
  var color = parseInt(colorString, 10);
  if (isNaN(color)) {
    return 0;
  } else {
    return Math.min(Math.max(color, 0), 255);
  }
}

function parseAlpha(alphaString) {
  var alpha = parseFloat(alphaString);
  if (isNaN(alpha)) {
    return 1;
  } else {
    return Math.min(Math.max(alpha, 0), 1);
  }
}

function numberToHexString(number) {
  var hex = number.toString(16);
  if (number < 16) {
    return '0' + hex;
  } else {
    return hex;
  }
}
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9jb2xvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBRUEsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFBOzs7OztJQUlELEtBQUs7ZUFBTCxLQUFLOzs7Ozs7Ozs7O1dBUVgsZUFBQyxLQUFLLEVBQUU7QUFDbkIsY0FBUSxPQUFPLEtBQUs7QUFDbEIsYUFBSyxRQUFRO0FBQ1gsZ0JBQUs7QUFBQSxBQUNQLGFBQUssUUFBUTtBQUNYLGNBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtBQUFFLG1CQUFPLElBQUksQ0FBQTtXQUFFO0FBQ3pDLGdCQUFLO0FBQUEsQUFDUDtBQUNFLGlCQUFPLElBQUksQ0FBQTtBQUFBLE9BQ2Q7O0FBRUQsVUFBSSxDQUFDLFdBQVcsRUFBRTtBQUNoQixtQkFBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtPQUMvQjs7QUFFRCxVQUFJO0FBQ0YsWUFBSSxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7T0FDekMsQ0FBQyxPQUFPLEtBQUssRUFBRTtBQUNkLGVBQU8sSUFBSSxDQUFBO09BQ1o7O0FBRUQsYUFBTyxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsV0FBVyxDQUFDLEtBQUssRUFBRSxFQUFFLFdBQVcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtLQUNsRzs7O0FBRVcsV0FoQ08sS0FBSyxDQWdDWCxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7MEJBaENuQixLQUFLOztBQWlDdEIsUUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUE7QUFDZCxRQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtBQUNsQixRQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtBQUNoQixRQUFJ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QUFXLENBQUMsQ0FBQTtBQUNyQyxNQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtBQUNoQixXQUFPLENBQUMsQ0FBQTtHQUNULE1BQU07QUFDTCxXQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7R0FDdkM7Q0FDRjs7QUFFRCxTQUFTLGlCQUFpQixDQUFFLE1BQU0sRUFBRTtBQUNsQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0FBQy9CLE1BQUksTUFBTSxHQUFHLEVBQUUsRUFBRTtBQUNmLGlCQUFXLEdBQUcsQ0FBRTtHQUNqQixNQUFNO0FBQ0wsV0FBTyxHQUFHLENBQUE7R0FDWDtDQUNGIiwiZmlsZSI6ImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9jb2xvci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKiBAYmFiZWwgKi9cblxubGV0IFBhcnNlZENvbG9yID0gbnVsbFxuXG4vLyBFc3NlbnRpYWw6IEEgc2ltcGxlIGNvbG9yIGNsYXNzIHJldHVybmVkIGZyb20ge0NvbmZpZzo6Z2V0fSB3aGVuIHRoZSB2YWx1ZVxuLy8gYXQgdGhlIGtleSBwYXRoIGlzIG9mIHR5cGUgJ2NvbG9yJy5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbG9yIHtcbiAgLy8gRXNzZW50aWFsOiBQYXJzZSBhIHtTdHJpbmd9IG9yIHtPYmplY3R9IGludG8gYSB7Q29sb3J9LlxuICAvL1xuICAvLyAqIGB2YWx1ZWAgQSB7U3RyaW5nfSBzdWNoIGFzIGAnd2hpdGUnYCwgYCNmZjAwZmZgLCBvclxuICAvLyAgIGAncmdiYSgyNTUsIDE1LCA2MCwgLjc1KSdgIG9yIGFuIHtPYmplY3R9IHdpdGggYHJlZGAsIGBncmVlbmAsIGBibHVlYCxcbiAgLy8gICBhbmQgYGFscGhhYCBwcm9wZXJ0aWVzLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge0NvbG9yfSBvciBgbnVsbGAgaWYgaXQgY2Fubm90IGJlIHBhcnNlZC5cbiAgc3RhdGljIHBhcnNlICh2YWx1ZSkge1xuICAgIHN3aXRjaCAodHlwZW9mIHZhbHVlKSB7XG4gICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7IHJldHVybiBudWxsIH1cbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgaWYgKCFQYXJzZWRDb2xvcikge1xuICAgICAgUGFyc2VkQ29sb3IgPSByZXF1aXJlKCdjb2xvcicpXG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHZhciBwYXJzZWRDb2xvciA9IG5ldyBQYXJzZWRDb2xvcih2YWx1ZSlcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IENvbG9yKHBhcnNlZENvbG9yLnJlZCgpLCBwYXJzZWRDb2xvci5ncmVlbigpLCBwYXJzZWRDb2xvci5ibHVlKCksIHBhcnNlZENvbG9yLmFscGhhKCkpXG4gIH1cblxuICBjb25zdHJ1Y3RvciAocmVkLCBncmVlbiwgYmx1ZSwgYWxwaGEpIHtcbiAgICB0aGlzLnJlZCA9IHJlZFxuICAgIHRoaXMuZ3JlZW4gPSBncmVlblxuICAgIHRoaXMuYmx1ZSA9IGJsdWVcbiAgICB0aGlzLmFscGhhID0gYWxwaGFcbiAgfVxuXG4gIHNldCByZWQgKHJlZCkge1xuICAgIHRoaXMuX3JlZCA9IHBhcnNlQ29sb3IocmVkKVxuICB9XG5cbiAgc2V0IGdyZWVuIChncmVlbikge1xuICAgIHRoaXMuX2dyZWVuID0gcGFyc2VDb2xvcihncmVlbilcbiAgfVxuXG4gIHNldCBibHVlIChibHVlKSB7XG4gICAgdGhpcy5fYmx1ZSA9IHBhcnNlQ29sb3IoYmx1ZSlcbiAgfVxuXG4gIHNldCBhbHBoYSAoYWxwaGEpIHtcbiAgICB0aGlzLl9hbHBoYSA9IHBhcnNlQWxwaGEoYWxwaGEpXG4gIH1cblxuICBnZXQgcmVkICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcmVkXG4gIH1cblxuICBnZXQgZ3JlZW4gKCkge1xuICAgIHJldHVybiB0aGlzLl9ncmVlblxuICB9XG5cbiAgZ2V0IGJsdWUgKCkge1xuICAgIHJldHVybiB0aGlzLl9ibHVlXG4gIH1cblxuICBnZXQgYWxwaGEgKCkge1xuICAgIHJldHVybiB0aGlzLl9hbHBoYVxuICB9XG5cbiAgLy8gRXNzZW50aWFsOiBSZXR1cm5zIGEge1N0cmluZ30gaW4gdGhlIGZvcm0gYCcjYWJjZGVmJ2AuXG4gIHRvSGV4U3RyaW5nICgpIHtcbiAgICByZXR1cm4gYCMke251bWJlclRvSGV4U3RyaW5nKHRoaXMucmVkKX0ke251bWJlclRvSGV4U3RyaW5nKHRoaXMuZ3JlZW4pfSR7bnVtYmVyVG9IZXhTdHJpbmcodGhpcy5ibHVlKX1gXG4gIH1cblxuICAvLyBFc3NlbnRpYWw6IFJldHVybnMgYSB7U3RyaW5nfSBpbiB0aGUgZm9ybSBgJ3JnYmEoMjUsIDUwLCA3NSwgLjkpJ2AuXG4gIHRvUkdCQVN0cmluZyAoKSB7XG4gICAgcmV0dXJuIGByZ2JhKCR7dGhpcy5yZWR9LCAke3RoaXMuZ3JlZW59LCAke3RoaXMuYmx1ZX0sICR7dGhpcy5hbHBoYX0pYFxuICB9XG5cbiAgdG9KU09OICgpIHtcbiAgICByZXR1cm4gdGhpcy5hbHBoYSA9PT0gMSA/IHRoaXMudG9IZXhTdHJpbmcoKSA6IHRoaXMudG9SR0JBU3RyaW5nKClcbiAgfVxuXG4gIGlzRXF1YWwgKGNvbG9yKSB7XG4gICAgaWYgKHRoaXMgPT09IGNvbG9yKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cblxuICAgIGlmICghKGNvbG9yIGluc3RhbmNlb2YgQ29sb3IpKSB7XG4gICAgICBjb2xvciA9IENvbG9yLnBhcnNlKGNvbG9yKVxuICAgIH1cblxuICAgIGlmIChjb2xvciA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICByZXR1cm4gY29sb3IucmVkID09PSB0aGlzLnJlZCAmJiBjb2xvci5ibHVlID09PSB0aGlzLmJsdWUgJiYgY29sb3IuZ3JlZW4gPT09IHRoaXMuZ3JlZW4gJiYgY29sb3IuYWxwaGEgPT09IHRoaXMuYWxwaGFcbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICByZXR1cm4gbmV3IENvbG9yKHRoaXMucmVkLCB0aGlzLmdyZWVuLCB0aGlzLmJsdWUsIHRoaXMuYWxwaGEpXG4gIH1cbn1cblxuZnVuY3Rpb24gcGFyc2VDb2xvciAoY29sb3JTdHJpbmcpIHtcbiAgY29uc3QgY29sb3IgPSBwYXJzZUludChjb2xvclN0cmluZywgMTApXG4gIGlmIChpc05hTihjb2xvcikpIHtcbiAgICByZXR1cm4gMFxuICB9IGVsc2Uge1xuICAgIHJldHVybiBNYXRoLm1pbihNYXRoLm1heChjb2xvciwgMCksIDI1NSlcbiAgfVxufVxuXG5mdW5jdGlvbiBwYXJzZUFscGhhIChhbHBoYVN0cmluZykge1xuICBjb25zdCBhbHBoYSA9IHBhcnNlRmxvYXQoYWxwaGFTdHJpbmcpXG4gIGlmIChpc05hTihhbHBoYSkpIHtcbiAgICByZXR1cm4gMVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBNYXRoLm1pbihNYXRoLm1heChhbHBoYSwgMCksIDEpXG4gIH1cbn1cblxuZnVuY3Rpb24gbnVtYmVyVG9IZXhTdHJpbmcgKG51bWJlcikge1xuICBjb25zdCBoZXggPSBudW1iZXIudG9TdHJpbmcoMTYpXG4gIGlmIChudW1iZXIgPCAxNikge1xuICAgIHJldHVybiBgMCR7aGV4fWBcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gaGV4XG4gIH1cbn1cbiJdfQ==