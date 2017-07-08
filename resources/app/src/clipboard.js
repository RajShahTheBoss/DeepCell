Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

/** @babel */

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _safeClipboard = require('./safe-clipboard');

var _safeClipboard2 = _interopRequireDefault(_safeClipboard);

// Extended: Represents the clipboard used for copying and pasting in Atom.
//
// An instance of this class is always available as the `atom.clipboard` global.
//
// ## Examples
//
// ```coffee
// atom.clipboard.write('hello')
//
// console.log(atom.clipboard.read()) # 'hello'
// ```

var Clipboard = (function () {
  function Clipboard() {
    _classCallCheck(this, Clipboard);

    this.reset();
  }

  _createClass(Clipboard, [{
    key: 'reset',
    value: function reset() {
      this.metadata = null;
      this.signatureForMetadata = null;
    }

    // Creates an `md5` hash of some text.
    //
    // * `text` A {String} to hash.
    //
    // Returns a hashed {String}.
  }, {
    key: 'md5',
    value: function md5(text) {
      return _crypto2['default'].createHash('md5').update(text, 'utf8').digest('hex');
    }

    // Public: Write the given text to the clipboard.
    //
    // The metadata associated with the text is available by calling
    // {::readWithMetadata}.
    //
    // * `text` The {String} to store.
    // * `metadata` (optional) The additional info to associate with the text.
  }, {
    key: 'write',
    value: function write(text, metadata) {
      this.signatureForMetadata = this.md5(text);
      this.metadata = metadata;
      _safeClipboard2['default'].writeText(text);
    }

    // Public: Read the text from the clipboard.
    //
    // Returns a {String}.
  }, {
    key: 'read',
    value: function read() {
      return _safeClipboard2['default'].readText();
    }

    // Public: Read the text from the clipboard and return both the text and the
    // associated metadata.
    //
    // Returns an {Object} with the following keys:
    // * `text` The {String} clipboard text.
    // * `metadata` The metadata stored by an earlier call to {::write}.
  }, {
    key: 'readWithMetadata',
    value: function readWithMetadata() {
      var text = this.read();
      if (this.signatureForMetadata === this.md5(text)) {
        return { text: text, metadata: this.metadata };
      } else {
        return { text: text };
      }
    }
  }]);

  return Clipboard;
})();

exports['default'] = Clipboard;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9jbGlwYm9hcmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O3NCQUVtQixRQUFROzs7OzZCQUNMLGtCQUFrQjs7Ozs7Ozs7Ozs7Ozs7OztJQWFuQixTQUFTO0FBQ2hCLFdBRE8sU0FBUyxHQUNiOzBCQURJLFNBQVM7O0FBRTFCLFFBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtHQUNiOztlQUhrQixTQUFTOztXQUt0QixpQkFBRztBQUNQLFVBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO0FBQ3BCLFVBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUE7S0FDakM7Ozs7Ozs7OztXQU9HLGFBQUMsSUFBSSxFQUFFO0FBQ1QsYUFBTyxvQkFBTyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7S0FDbkU7Ozs7Ozs7Ozs7O1dBU0ssZUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO0FBQ3JCLFVBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQzFDLFVBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO0FBQ3hCLGlDQUFVLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtLQUMxQjs7Ozs7OztXQUtJLGdCQUFHO0FBQ04sYUFBTywyQkFBVSxRQUFRLEVBQUUsQ0FBQTtLQUM1Qjs7Ozs7Ozs7OztXQVFnQiw0QkFBRztBQUNsQixVQUFJLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7QUFDdEIsVUFBSSxJQUFJLENBQUMsb0JBQW9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUNoRCxlQUFPLEVBQUMsSUFBSSxFQUFKLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBQyxDQUFBO09BQ3ZDLE1BQU07QUFDTCxlQUFPLEVBQUMsSUFBSSxFQUFKLElBQUksRUFBQyxDQUFBO09BQ2Q7S0FDRjs7O1NBcERrQixTQUFTOzs7cUJBQVQsU0FBUyIsImZpbGUiOiJmaWxlOi8vL0M6L3Byb2plY3RzL2F0b20vb3V0L2FwcC9zcmMvY2xpcGJvYXJkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqIEBiYWJlbCAqL1xuXG5pbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0bydcbmltcG9ydCBjbGlwYm9hcmQgZnJvbSAnLi9zYWZlLWNsaXBib2FyZCdcblxuLy8gRXh0ZW5kZWQ6IFJlcHJlc2VudHMgdGhlIGNsaXBib2FyZCB1c2VkIGZvciBjb3B5aW5nIGFuZCBwYXN0aW5nIGluIEF0b20uXG4vL1xuLy8gQW4gaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcyBpcyBhbHdheXMgYXZhaWxhYmxlIGFzIHRoZSBgYXRvbS5jbGlwYm9hcmRgIGdsb2JhbC5cbi8vXG4vLyAjIyBFeGFtcGxlc1xuLy9cbi8vIGBgYGNvZmZlZVxuLy8gYXRvbS5jbGlwYm9hcmQud3JpdGUoJ2hlbGxvJylcbi8vXG4vLyBjb25zb2xlLmxvZyhhdG9tLmNsaXBib2FyZC5yZWFkKCkpICMgJ2hlbGxvJ1xuLy8gYGBgXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDbGlwYm9hcmQge1xuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgdGhpcy5yZXNldCgpXG4gIH1cblxuICByZXNldCAoKSB7XG4gICAgdGhpcy5tZXRhZGF0YSA9IG51bGxcbiAgICB0aGlzLnNpZ25hdHVyZUZvck1ldGFkYXRhID0gbnVsbFxuICB9XG5cbiAgLy8gQ3JlYXRlcyBhbiBgbWQ1YCBoYXNoIG9mIHNvbWUgdGV4dC5cbiAgLy9cbiAgLy8gKiBgdGV4dGAgQSB7U3RyaW5nfSB0byBoYXNoLlxuICAvL1xuICAvLyBSZXR1cm5zIGEgaGFzaGVkIHtTdHJpbmd9LlxuICBtZDUgKHRleHQpIHtcbiAgICByZXR1cm4gY3J5cHRvLmNyZWF0ZUhhc2goJ21kNScpLnVwZGF0ZSh0ZXh0LCAndXRmOCcpLmRpZ2VzdCgnaGV4JylcbiAgfVxuXG4gIC8vIFB1YmxpYzogV3JpdGUgdGhlIGdpdmVuIHRleHQgdG8gdGhlIGNsaXBib2FyZC5cbiAgLy9cbiAgLy8gVGhlIG1ldGFkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgdGV4dCBpcyBhdmFpbGFibGUgYnkgY2FsbGluZ1xuICAvLyB7OjpyZWFkV2l0aE1ldGFkYXRhfS5cbiAgLy9cbiAgLy8gKiBgdGV4dGAgVGhlIHtTdHJpbmd9IHRvIHN0b3JlLlxuICAvLyAqIGBtZXRhZGF0YWAgKG9wdGlvbmFsKSBUaGUgYWRkaXRpb25hbCBpbmZvIHRvIGFzc29jaWF0ZSB3aXRoIHRoZSB0ZXh0LlxuICB3cml0ZSAodGV4dCwgbWV0YWRhdGEpIHtcbiAgICB0aGlzLnNpZ25hdHVyZUZvck1ldGFkYXRhID0gdGhpcy5tZDUodGV4dClcbiAgICB0aGlzLm1ldGFkYXRhID0gbWV0YWRhdGFcbiAgICBjbGlwYm9hcmQud3JpdGVUZXh0KHRleHQpXG4gIH1cblxuICAvLyBQdWJsaWM6IFJlYWQgdGhlIHRleHQgZnJvbSB0aGUgY2xpcGJvYXJkLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge1N0cmluZ30uXG4gIHJlYWQgKCkge1xuICAgIHJldHVybiBjbGlwYm9hcmQucmVhZFRleHQoKVxuICB9XG5cbiAgLy8gUHVibGljOiBSZWFkIHRoZSB0ZXh0IGZyb20gdGhlIGNsaXBib2FyZCBhbmQgcmV0dXJuIGJvdGggdGhlIHRleHQgYW5kIHRoZVxuICAvLyBhc3NvY2lhdGVkIG1ldGFkYXRhLlxuICAvL1xuICAvLyBSZXR1cm5zIGFuIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAvLyAqIGB0ZXh0YCBUaGUge1N0cmluZ30gY2xpcGJvYXJkIHRleHQuXG4gIC8vICogYG1ldGFkYXRhYCBUaGUgbWV0YWRhdGEgc3RvcmVkIGJ5IGFuIGVhcmxpZXIgY2FsbCB0byB7Ojp3cml0ZX0uXG4gIHJlYWRXaXRoTWV0YWRhdGEgKCkge1xuICAgIGxldCB0ZXh0ID0gdGhpcy5yZWFkKClcbiAgICBpZiAodGhpcy5zaWduYXR1cmVGb3JNZXRhZGF0YSA9PT0gdGhpcy5tZDUodGV4dCkpIHtcbiAgICAgIHJldHVybiB7dGV4dCwgbWV0YWRhdGE6IHRoaXMubWV0YWRhdGF9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7dGV4dH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==