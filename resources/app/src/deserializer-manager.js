Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

/** @babel */

var _eventKit = require('event-kit');

// Extended: Manages the deserializers used for serialized state
//
// An instance of this class is always available as the `atom.deserializers`
// global.
//
// ## Examples
//
// ```coffee
// class MyPackageView extends View
//   atom.deserializers.add(this)
//
//   @deserialize: (state) ->
//     new MyPackageView(state)
//
//   constructor: (@state) ->
//
//   serialize: ->
//     @state
// ```

var DeserializerManager = (function () {
  function DeserializerManager(atomEnvironment) {
    _classCallCheck(this, DeserializerManager);

    this.atomEnvironment = atomEnvironment;
    this.deserializers = {};
  }

  // Public: Register the given class(es) as deserializers.
  //
  // * `deserializers` One or more deserializers to register. A deserializer can
  //   be any object with a `.name` property and a `.deserialize()` method. A
  //   common approach is to register a *constructor* as the deserializer for its
  //   instances by adding a `.deserialize()` class method. When your method is
  //   called, it will be passed serialized state as the first argument and the
  //   {Atom} environment object as the second argument, which is useful if you
  //   wish to avoid referencing the `atom` global.

  _createClass(DeserializerManager, [{
    key: 'add',
    value: function add() {
      var _this = this;

      for (var _len = arguments.length, deserializers = Array(_len), _key = 0; _key < _len; _key++) {
        deserializers[_key] = arguments[_key];
      }

      for (var i = 0; i < deserializers.length; i++) {
        var deserializer = deserializers[i];
        this.deserializers[deserializer.name] = deserializer;
      }

      return new _eventKit.Disposable(function () {
        for (var j = 0; j < deserializers.length; j++) {
          var deserializer = deserializers[j];
          delete _this.deserializers[deserializer.name];
        }
      });
    }
  }, {
    key: 'getDeserializerCount',
    value: function getDeserializerCount() {
      return Object.keys(this.deserializers).length;
    }

    // Public: Deserialize the state and params.
    //
    // * `state` The state {Object} to deserialize.
  }, {
    key: 'deserialize',
    value: function deserialize(state) {
      if (state == null) {
        return;
      }

      var deserializer = this.get(state);
      if (deserializer) {
        var stateVersion = typeof state.get === 'function' && state.get('version') || state.version;

        if (deserializer.version != null && deserializer.version !== stateVersion) {
          return;
        }
        return deserializer.deserialize(state, this.atomEnvironment);
      } else {
        return console.warn('No deserializer found for', state);
      }
    }

    // Get the deserializer for the state.
    //
    // * `state` The state {Object} being deserialized.
  }, {
    key: 'get',
    value: function get(state) {
      if (state == null) {
        return;
      }

      var stateDeserializer = typeof state.get === 'function' && state.get('deserializer') || state.deserializer;

      return this.deserializers[stateDeserializer];
    }
  }, {
    key: 'clear',
    value: function clear() {
      this.deserializers = {};
    }
  }]);

  return DeserializerManager;
})();

exports['default'] = DeserializerManager;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9kZXNlcmlhbGl6ZXItbWFuYWdlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O3dCQUV5QixXQUFXOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBcUJmLG1CQUFtQjtBQUMxQixXQURPLG1CQUFtQixDQUN6QixlQUFlLEVBQUU7MEJBRFgsbUJBQW1COztBQUVwQyxRQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQTtBQUN0QyxRQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQTtHQUN4Qjs7Ozs7Ozs7Ozs7O2VBSmtCLG1CQUFtQjs7V0FlbEMsZUFBbUI7Ozt3Q0FBZixhQUFhO0FBQWIscUJBQWE7OztBQUNuQixXQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUM3QyxZQUFJLFlBQVksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDbkMsWUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFBO09BQ3JEOztBQUVELGFBQU8seUJBQWUsWUFBTTtBQUMxQixhQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUM3QyxjQUFJLFlBQVksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDbkMsaUJBQU8sTUFBSyxhQUFhLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO1NBQzdDO09BQ0YsQ0FBQyxDQUFBO0tBQ0g7OztXQUVvQixnQ0FBRztBQUN0QixhQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtLQUM5Qzs7Ozs7OztXQUtXLHFCQUFDLEtBQUssRUFBRTtBQUNsQixVQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7QUFDakIsZUFBTTtPQUNQOztBQUVELFVBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDcEMsVUFBSSxZQUFZLEVBQUU7QUFDaEIsWUFBSSxZQUFZLEdBQ2QsQUFBQyxPQUFPLEtBQUssQ0FBQyxHQUFHLEtBQUssVUFBVSxJQUFLLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQ3pELEtBQUssQ0FBQyxPQUFPLEFBQ2QsQ0FBQTs7QUFFRCxZQUFJLEFBQUMsWUFBWSxDQUFDLE9BQU8sSUFBSSxJQUFJLElBQUssWUFBWSxDQUFDLE9BQU8sS0FBSyxZQUFZLEVBQUU7QUFDM0UsaUJBQU07U0FDUDtBQUNELGVBQU8sWUFBWSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO09BQzdELE1BQU07QUFDTCxlQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsMkJBQTJCLEVBQUUsS0FBSyxDQUFDLENBQUE7T0FDeEQ7S0FDRjs7Ozs7OztXQUtHLGFBQUMsS0FBSyxFQUFFO0FBQ1YsVUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO0FBQ2pCLGVBQU07T0FDUDs7QUFFRCxVQUFJLGlCQUFpQixHQUNuQixBQUFDLE9BQU8sS0FBSyxDQUFDLEdBQUcsS0FBSyxVQUFVLElBQUssS0FBSyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFDOUQsS0FBSyxDQUFDLFlBQVksQUFDbkIsQ0FBQTs7QUFFRCxhQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtLQUM3Qzs7O1dBRUssaUJBQUc7QUFDUCxVQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQTtLQUN4Qjs7O1NBM0VrQixtQkFBbUI7OztxQkFBbkIsbUJBQW1CIiwiZmlsZSI6ImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9kZXNlcmlhbGl6ZXItbWFuYWdlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKiBAYmFiZWwgKi9cblxuaW1wb3J0IHtEaXNwb3NhYmxlfSBmcm9tICdldmVudC1raXQnXG5cbi8vIEV4dGVuZGVkOiBNYW5hZ2VzIHRoZSBkZXNlcmlhbGl6ZXJzIHVzZWQgZm9yIHNlcmlhbGl6ZWQgc3RhdGVcbi8vXG4vLyBBbiBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzIGlzIGFsd2F5cyBhdmFpbGFibGUgYXMgdGhlIGBhdG9tLmRlc2VyaWFsaXplcnNgXG4vLyBnbG9iYWwuXG4vL1xuLy8gIyMgRXhhbXBsZXNcbi8vXG4vLyBgYGBjb2ZmZWVcbi8vIGNsYXNzIE15UGFja2FnZVZpZXcgZXh0ZW5kcyBWaWV3XG4vLyAgIGF0b20uZGVzZXJpYWxpemVycy5hZGQodGhpcylcbi8vXG4vLyAgIEBkZXNlcmlhbGl6ZTogKHN0YXRlKSAtPlxuLy8gICAgIG5ldyBNeVBhY2thZ2VWaWV3KHN0YXRlKVxuLy9cbi8vICAgY29uc3RydWN0b3I6IChAc3RhdGUpIC0+XG4vL1xuLy8gICBzZXJpYWxpemU6IC0+XG4vLyAgICAgQHN0YXRlXG4vLyBgYGBcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERlc2VyaWFsaXplck1hbmFnZXIge1xuICBjb25zdHJ1Y3RvciAoYXRvbUVudmlyb25tZW50KSB7XG4gICAgdGhpcy5hdG9tRW52aXJvbm1lbnQgPSBhdG9tRW52aXJvbm1lbnRcbiAgICB0aGlzLmRlc2VyaWFsaXplcnMgPSB7fVxuICB9XG5cbiAgLy8gUHVibGljOiBSZWdpc3RlciB0aGUgZ2l2ZW4gY2xhc3MoZXMpIGFzIGRlc2VyaWFsaXplcnMuXG4gIC8vXG4gIC8vICogYGRlc2VyaWFsaXplcnNgIE9uZSBvciBtb3JlIGRlc2VyaWFsaXplcnMgdG8gcmVnaXN0ZXIuIEEgZGVzZXJpYWxpemVyIGNhblxuICAvLyAgIGJlIGFueSBvYmplY3Qgd2l0aCBhIGAubmFtZWAgcHJvcGVydHkgYW5kIGEgYC5kZXNlcmlhbGl6ZSgpYCBtZXRob2QuIEFcbiAgLy8gICBjb21tb24gYXBwcm9hY2ggaXMgdG8gcmVnaXN0ZXIgYSAqY29uc3RydWN0b3IqIGFzIHRoZSBkZXNlcmlhbGl6ZXIgZm9yIGl0c1xuICAvLyAgIGluc3RhbmNlcyBieSBhZGRpbmcgYSBgLmRlc2VyaWFsaXplKClgIGNsYXNzIG1ldGhvZC4gV2hlbiB5b3VyIG1ldGhvZCBpc1xuICAvLyAgIGNhbGxlZCwgaXQgd2lsbCBiZSBwYXNzZWQgc2VyaWFsaXplZCBzdGF0ZSBhcyB0aGUgZmlyc3QgYXJndW1lbnQgYW5kIHRoZVxuICAvLyAgIHtBdG9tfSBlbnZpcm9ubWVudCBvYmplY3QgYXMgdGhlIHNlY29uZCBhcmd1bWVudCwgd2hpY2ggaXMgdXNlZnVsIGlmIHlvdVxuICAvLyAgIHdpc2ggdG8gYXZvaWQgcmVmZXJlbmNpbmcgdGhlIGBhdG9tYCBnbG9iYWwuXG4gIGFkZCAoLi4uZGVzZXJpYWxpemVycykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGVzZXJpYWxpemVycy5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IGRlc2VyaWFsaXplciA9IGRlc2VyaWFsaXplcnNbaV1cbiAgICAgIHRoaXMuZGVzZXJpYWxpemVyc1tkZXNlcmlhbGl6ZXIubmFtZV0gPSBkZXNlcmlhbGl6ZXJcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IERpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBkZXNlcmlhbGl6ZXJzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGxldCBkZXNlcmlhbGl6ZXIgPSBkZXNlcmlhbGl6ZXJzW2pdXG4gICAgICAgIGRlbGV0ZSB0aGlzLmRlc2VyaWFsaXplcnNbZGVzZXJpYWxpemVyLm5hbWVdXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGdldERlc2VyaWFsaXplckNvdW50ICgpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5kZXNlcmlhbGl6ZXJzKS5sZW5ndGhcbiAgfVxuXG4gIC8vIFB1YmxpYzogRGVzZXJpYWxpemUgdGhlIHN0YXRlIGFuZCBwYXJhbXMuXG4gIC8vXG4gIC8vICogYHN0YXRlYCBUaGUgc3RhdGUge09iamVjdH0gdG8gZGVzZXJpYWxpemUuXG4gIGRlc2VyaWFsaXplIChzdGF0ZSkge1xuICAgIGlmIChzdGF0ZSA9PSBudWxsKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25zdCBkZXNlcmlhbGl6ZXIgPSB0aGlzLmdldChzdGF0ZSlcbiAgICBpZiAoZGVzZXJpYWxpemVyKSB7XG4gICAgICBsZXQgc3RhdGVWZXJzaW9uID0gKFxuICAgICAgICAodHlwZW9mIHN0YXRlLmdldCA9PT0gJ2Z1bmN0aW9uJykgJiYgc3RhdGUuZ2V0KCd2ZXJzaW9uJykgfHxcbiAgICAgICAgc3RhdGUudmVyc2lvblxuICAgICAgKVxuXG4gICAgICBpZiAoKGRlc2VyaWFsaXplci52ZXJzaW9uICE9IG51bGwpICYmIGRlc2VyaWFsaXplci52ZXJzaW9uICE9PSBzdGF0ZVZlcnNpb24pIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICByZXR1cm4gZGVzZXJpYWxpemVyLmRlc2VyaWFsaXplKHN0YXRlLCB0aGlzLmF0b21FbnZpcm9ubWVudClcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGNvbnNvbGUud2FybignTm8gZGVzZXJpYWxpemVyIGZvdW5kIGZvcicsIHN0YXRlKVxuICAgIH1cbiAgfVxuXG4gIC8vIEdldCB0aGUgZGVzZXJpYWxpemVyIGZvciB0aGUgc3RhdGUuXG4gIC8vXG4gIC8vICogYHN0YXRlYCBUaGUgc3RhdGUge09iamVjdH0gYmVpbmcgZGVzZXJpYWxpemVkLlxuICBnZXQgKHN0YXRlKSB7XG4gICAgaWYgKHN0YXRlID09IG51bGwpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGxldCBzdGF0ZURlc2VyaWFsaXplciA9IChcbiAgICAgICh0eXBlb2Ygc3RhdGUuZ2V0ID09PSAnZnVuY3Rpb24nKSAmJiBzdGF0ZS5nZXQoJ2Rlc2VyaWFsaXplcicpIHx8XG4gICAgICBzdGF0ZS5kZXNlcmlhbGl6ZXJcbiAgICApXG5cbiAgICByZXR1cm4gdGhpcy5kZXNlcmlhbGl6ZXJzW3N0YXRlRGVzZXJpYWxpemVyXVxuICB9XG5cbiAgY2xlYXIgKCkge1xuICAgIHRoaXMuZGVzZXJpYWxpemVycyA9IHt9XG4gIH1cbn1cbiJdfQ==