Object.defineProperty(exports, '__esModule', {
  value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/** @babel */

var _bufferedProcess = require('./buffered-process');

var _bufferedProcess2 = _interopRequireDefault(_bufferedProcess);

// Extended: Like {BufferedProcess}, but accepts a Node script as the command
// to run.
//
// This is necessary on Windows since it doesn't support shebang `#!` lines.
//
// ## Examples
//
// ```js
//   const {BufferedNodeProcess} = require('atom')
// ```

var BufferedNodeProcess = (function (_BufferedProcess) {
  _inherits(BufferedNodeProcess, _BufferedProcess);

  // Public: Runs the given Node script by spawning a new child process.
  //
  // * `options` An {Object} with the following keys:
  //   * `command` The {String} path to the JavaScript script to execute.
  //   * `args` The {Array} of arguments to pass to the script (optional).
  //   * `options` The options {Object} to pass to Node's `ChildProcess.spawn`
  //               method (optional).
  //   * `stdout` The callback {Function} that receives a single argument which
  //              contains the standard output from the command. The callback is
  //              called as data is received but it's buffered to ensure only
  //              complete lines are passed until the source stream closes. After
  //              the source stream has closed all remaining data is sent in a
  //              final call (optional).
  //   * `stderr` The callback {Function} that receives a single argument which
  //              contains the standard error output from the command. The
  //              callback is called as data is received but it's buffered to
  //              ensure only complete lines are passed until the source stream
  //              closes. After the source stream has closed all remaining data
  //              is sent in a final call (optional).
  //   * `exit` The callback {Function} which receives a single argument
  //            containing the exit status (optional).

  function BufferedNodeProcess(_ref) {
    var command = _ref.command;
    var args = _ref.args;
    var _ref$options = _ref.options;
    var options = _ref$options === undefined ? {} : _ref$options;
    var stdout = _ref.stdout;
    var stderr = _ref.stderr;
    var exit = _ref.exit;

    _classCallCheck(this, BufferedNodeProcess);

    options.env = options.env || Object.create(process.env);
    options.env.ELECTRON_RUN_AS_NODE = 1;
    options.env.ELECTRON_NO_ATTACH_CONSOLE = 1;

    args = args ? args.slice() : [];
    args.unshift(command);
    args.unshift('--no-deprecation');

    _get(Object.getPrototypeOf(BufferedNodeProcess.prototype), 'constructor', this).call(this, {
      command: process.execPath,
      args: args,
      options: options,
      stdout: stdout,
      stderr: stderr,
      exit: exit
    });
  }

  return BufferedNodeProcess;
})(_bufferedProcess2['default']);

exports['default'] = BufferedNodeProcess;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9idWZmZXJlZC1ub2RlLXByb2Nlc3MuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7K0JBRTRCLG9CQUFvQjs7Ozs7Ozs7Ozs7Ozs7O0lBWTNCLG1CQUFtQjtZQUFuQixtQkFBbUI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXVCMUIsV0F2Qk8sbUJBQW1CLENBdUJ6QixJQUFtRCxFQUFFO1FBQXBELE9BQU8sR0FBUixJQUFtRCxDQUFsRCxPQUFPO1FBQUUsSUFBSSxHQUFkLElBQW1ELENBQXpDLElBQUk7dUJBQWQsSUFBbUQsQ0FBbkMsT0FBTztRQUFQLE9BQU8sZ0NBQUcsRUFBRTtRQUFFLE1BQU0sR0FBcEMsSUFBbUQsQ0FBckIsTUFBTTtRQUFFLE1BQU0sR0FBNUMsSUFBbUQsQ0FBYixNQUFNO1FBQUUsSUFBSSxHQUFsRCxJQUFtRCxDQUFMLElBQUk7OzBCQXZCNUMsbUJBQW1COztBQXdCcEMsV0FBTyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBQ3ZELFdBQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEdBQUcsQ0FBQyxDQUFBO0FBQ3BDLFdBQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEdBQUcsQ0FBQyxDQUFBOztBQUUxQyxRQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUE7QUFDL0IsUUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUNyQixRQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUE7O0FBRWhDLCtCQWhDaUIsbUJBQW1CLDZDQWdDOUI7QUFDSixhQUFPLEVBQUUsT0FBTyxDQUFDLFFBQVE7QUFDekIsVUFBSSxFQUFKLElBQUk7QUFDSixhQUFPLEVBQVAsT0FBTztBQUNQLFlBQU0sRUFBTixNQUFNO0FBQ04sWUFBTSxFQUFOLE1BQU07QUFDTixVQUFJLEVBQUosSUFBSTtLQUNMLEVBQUM7R0FDSDs7U0F4Q2tCLG1CQUFtQjs7O3FCQUFuQixtQkFBbUIiLCJmaWxlIjoiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2J1ZmZlcmVkLW5vZGUtcHJvY2Vzcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKiBAYmFiZWwgKi9cblxuaW1wb3J0IEJ1ZmZlcmVkUHJvY2VzcyBmcm9tICcuL2J1ZmZlcmVkLXByb2Nlc3MnXG5cbi8vIEV4dGVuZGVkOiBMaWtlIHtCdWZmZXJlZFByb2Nlc3N9LCBidXQgYWNjZXB0cyBhIE5vZGUgc2NyaXB0IGFzIHRoZSBjb21tYW5kXG4vLyB0byBydW4uXG4vL1xuLy8gVGhpcyBpcyBuZWNlc3Nhcnkgb24gV2luZG93cyBzaW5jZSBpdCBkb2Vzbid0IHN1cHBvcnQgc2hlYmFuZyBgIyFgIGxpbmVzLlxuLy9cbi8vICMjIEV4YW1wbGVzXG4vL1xuLy8gYGBganNcbi8vICAgY29uc3Qge0J1ZmZlcmVkTm9kZVByb2Nlc3N9ID0gcmVxdWlyZSgnYXRvbScpXG4vLyBgYGBcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEJ1ZmZlcmVkTm9kZVByb2Nlc3MgZXh0ZW5kcyBCdWZmZXJlZFByb2Nlc3Mge1xuXG4gIC8vIFB1YmxpYzogUnVucyB0aGUgZ2l2ZW4gTm9kZSBzY3JpcHQgYnkgc3Bhd25pbmcgYSBuZXcgY2hpbGQgcHJvY2Vzcy5cbiAgLy9cbiAgLy8gKiBgb3B0aW9uc2AgQW4ge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gIC8vICAgKiBgY29tbWFuZGAgVGhlIHtTdHJpbmd9IHBhdGggdG8gdGhlIEphdmFTY3JpcHQgc2NyaXB0IHRvIGV4ZWN1dGUuXG4gIC8vICAgKiBgYXJnc2AgVGhlIHtBcnJheX0gb2YgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIHNjcmlwdCAob3B0aW9uYWwpLlxuICAvLyAgICogYG9wdGlvbnNgIFRoZSBvcHRpb25zIHtPYmplY3R9IHRvIHBhc3MgdG8gTm9kZSdzIGBDaGlsZFByb2Nlc3Muc3Bhd25gXG4gIC8vICAgICAgICAgICAgICAgbWV0aG9kIChvcHRpb25hbCkuXG4gIC8vICAgKiBgc3Rkb3V0YCBUaGUgY2FsbGJhY2sge0Z1bmN0aW9ufSB0aGF0IHJlY2VpdmVzIGEgc2luZ2xlIGFyZ3VtZW50IHdoaWNoXG4gIC8vICAgICAgICAgICAgICBjb250YWlucyB0aGUgc3RhbmRhcmQgb3V0cHV0IGZyb20gdGhlIGNvbW1hbmQuIFRoZSBjYWxsYmFjayBpc1xuICAvLyAgICAgICAgICAgICAgY2FsbGVkIGFzIGRhdGEgaXMgcmVjZWl2ZWQgYnV0IGl0J3MgYnVmZmVyZWQgdG8gZW5zdXJlIG9ubHlcbiAgLy8gICAgICAgICAgICAgIGNvbXBsZXRlIGxpbmVzIGFyZSBwYXNzZWQgdW50aWwgdGhlIHNvdXJjZSBzdHJlYW0gY2xvc2VzLiBBZnRlclxuICAvLyAgICAgICAgICAgICAgdGhlIHNvdXJjZSBzdHJlYW0gaGFzIGNsb3NlZCBhbGwgcmVtYWluaW5nIGRhdGEgaXMgc2VudCBpbiBhXG4gIC8vICAgICAgICAgICAgICBmaW5hbCBjYWxsIChvcHRpb25hbCkuXG4gIC8vICAgKiBgc3RkZXJyYCBUaGUgY2FsbGJhY2sge0Z1bmN0aW9ufSB0aGF0IHJlY2VpdmVzIGEgc2luZ2xlIGFyZ3VtZW50IHdoaWNoXG4gIC8vICAgICAgICAgICAgICBjb250YWlucyB0aGUgc3RhbmRhcmQgZXJyb3Igb3V0cHV0IGZyb20gdGhlIGNvbW1hbmQuIFRoZVxuICAvLyAgICAgICAgICAgICAgY2FsbGJhY2sgaXMgY2FsbGVkIGFzIGRhdGEgaXMgcmVjZWl2ZWQgYnV0IGl0J3MgYnVmZmVyZWQgdG9cbiAgLy8gICAgICAgICAgICAgIGVuc3VyZSBvbmx5IGNvbXBsZXRlIGxpbmVzIGFyZSBwYXNzZWQgdW50aWwgdGhlIHNvdXJjZSBzdHJlYW1cbiAgLy8gICAgICAgICAgICAgIGNsb3Nlcy4gQWZ0ZXIgdGhlIHNvdXJjZSBzdHJlYW0gaGFzIGNsb3NlZCBhbGwgcmVtYWluaW5nIGRhdGFcbiAgLy8gICAgICAgICAgICAgIGlzIHNlbnQgaW4gYSBmaW5hbCBjYWxsIChvcHRpb25hbCkuXG4gIC8vICAgKiBgZXhpdGAgVGhlIGNhbGxiYWNrIHtGdW5jdGlvbn0gd2hpY2ggcmVjZWl2ZXMgYSBzaW5nbGUgYXJndW1lbnRcbiAgLy8gICAgICAgICAgICBjb250YWluaW5nIHRoZSBleGl0IHN0YXR1cyAob3B0aW9uYWwpLlxuICBjb25zdHJ1Y3RvciAoe2NvbW1hbmQsIGFyZ3MsIG9wdGlvbnMgPSB7fSwgc3Rkb3V0LCBzdGRlcnIsIGV4aXR9KSB7XG4gICAgb3B0aW9ucy5lbnYgPSBvcHRpb25zLmVudiB8fCBPYmplY3QuY3JlYXRlKHByb2Nlc3MuZW52KVxuICAgIG9wdGlvbnMuZW52LkVMRUNUUk9OX1JVTl9BU19OT0RFID0gMVxuICAgIG9wdGlvbnMuZW52LkVMRUNUUk9OX05PX0FUVEFDSF9DT05TT0xFID0gMVxuXG4gICAgYXJncyA9IGFyZ3MgPyBhcmdzLnNsaWNlKCkgOiBbXVxuICAgIGFyZ3MudW5zaGlmdChjb21tYW5kKVxuICAgIGFyZ3MudW5zaGlmdCgnLS1uby1kZXByZWNhdGlvbicpXG5cbiAgICBzdXBlcih7XG4gICAgICBjb21tYW5kOiBwcm9jZXNzLmV4ZWNQYXRoLFxuICAgICAgYXJncyxcbiAgICAgIG9wdGlvbnMsXG4gICAgICBzdGRvdXQsXG4gICAgICBzdGRlcnIsXG4gICAgICBleGl0XG4gICAgfSlcbiAgfVxufVxuIl19