Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

/** @babel */

var _underscorePlus = require('underscore-plus');

var _underscorePlus2 = _interopRequireDefault(_underscorePlus);

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _eventKit = require('event-kit');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

// Extended: A wrapper which provides standard error/output line buffering for
// Node's ChildProcess.
//
// ## Examples
//
// ```js
// {BufferedProcess} = require('atom')
//
// const command = 'ps'
// const args = ['-ef']
// const stdout = (output) => console.log(output)
// const exit = (code) => console.log("ps -ef exited with #{code}")
// const process = new BufferedProcess({command, args, stdout, exit})
// ```

var BufferedProcess = (function () {
  /*
  Section: Construction
  */

  // Public: Runs the given command by spawning a new child process.
  //
  // * `options` An {Object} with the following keys:
  //   * `command` The {String} command to execute.
  //   * `args` The {Array} of arguments to pass to the command (optional).
  //   * `options` {Object} (optional) The options {Object} to pass to Node's
  //     `ChildProcess.spawn` method.
  //   * `stdout` {Function} (optional) The callback that receives a single
  //     argument which contains the standard output from the command. The
  //     callback is called as data is received but it's buffered to ensure only
  //     complete lines are passed until the source stream closes. After the
  //     source stream has closed all remaining data is sent in a final call.
  //     * `data` {String}
  //   * `stderr` {Function} (optional) The callback that receives a single
  //     argument which contains the standard error output from the command. The
  //     callback is called as data is received but it's buffered to ensure only
  //     complete lines are passed until the source stream closes. After the
  //     source stream has closed all remaining data is sent in a final call.
  //     * `data` {String}
  //   * `exit` {Function} (optional) The callback which receives a single
  //     argument containing the exit status.
  //     * `code` {Number}
  //   * `autoStart` {Boolean} (optional) Whether the command will automatically start
  //     when this BufferedProcess is created. Defaults to true.  When set to false you
  //     must call the `start` method to start the process.

  function BufferedProcess() {
    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var command = _ref.command;
    var args = _ref.args;
    var _ref$options = _ref.options;
    var options = _ref$options === undefined ? {} : _ref$options;
    var stdout = _ref.stdout;
    var stderr = _ref.stderr;
    var exit = _ref.exit;
    var _ref$autoStart = _ref.autoStart;
    var autoStart = _ref$autoStart === undefined ? true : _ref$autoStart;

    _classCallCheck(this, BufferedProcess);

    this.emitter = new _eventKit.Emitter();
    this.command = command;
    this.args = args;
    this.options = options;
    this.stdout = stdout;
    this.stderr = stderr;
    this.exit = exit;
    if (autoStart === true) {
      this.start();
    }
    this.killed = false;
  }

  _createClass(BufferedProcess, [{
    key: 'start',
    value: function start() {
      if (this.started === true) return;

      this.started = true;
      // Related to joyent/node#2318
      if (process.platform === 'win32' && this.options.shell === undefined) {
        this.spawnWithEscapedWindowsArgs(this.command, this.args, this.options);
      } else {
        this.spawn(this.command, this.args, this.options);
      }
      this.handleEvents(this.stdout, this.stderr, this.exit);
    }

    // Windows has a bunch of special rules that node still doesn't take care of for you
  }, {
    key: 'spawnWithEscapedWindowsArgs',
    value: function spawnWithEscapedWindowsArgs(command, args, options) {
      var _this = this;

      var cmdArgs = [];
      // Quote all arguments and escapes inner quotes
      if (args) {
        cmdArgs = args.filter(function (arg) {
          return arg != null;
        }).map(function (arg) {
          if (_this.isExplorerCommand(command) && /^\/[a-zA-Z]+,.*$/.test(arg)) {
            // Don't wrap /root,C:\folder style arguments to explorer calls in
            // quotes since they will not be interpreted correctly if they are
            return arg;
          } else {
            // Escape double quotes by putting a backslash in front of them
            return '"' + arg.toString().replace(/"/g, '\\"') + '"';
          }
        });
      }

      // The command itself is quoted if it contains spaces, &, ^, | or # chars
      cmdArgs.unshift(/\s|&|\^|\(|\)|\||#/.test(command) ? '"' + command + '"' : command);

      var cmdOptions = _underscorePlus2['default'].clone(options);
      cmdOptions.windowsVerbatimArguments = true;

      this.spawn(this.getCmdPath(), ['/s', '/d', '/c', '"' + cmdArgs.join(' ') + '"'], cmdOptions);
    }

    /*
    Section: Event Subscription
    */

    // Public: Will call your callback when an error will be raised by the process.
    // Usually this is due to the command not being available or not on the PATH.
    // You can call `handle()` on the object passed to your callback to indicate
    // that you have handled this error.
    //
    // * `callback` {Function} callback
    //   * `errorObject` {Object}
    //     * `error` {Object} the error object
    //     * `handle` {Function} call this to indicate you have handled the error.
    //       The error will not be thrown if this function is called.
    //
    // Returns a {Disposable}
  }, {
    key: 'onWillThrowError',
    value: function onWillThrowError(callback) {
      return this.emitter.on('will-throw-error', callback);
    }

    /*
    Section: Helper Methods
    */

    // Helper method to pass data line by line.
    //
    // * `stream` The Stream to read from.
    // * `onLines` The callback to call with each line of data.
    // * `onDone` The callback to call when the stream has closed.
  }, {
    key: 'bufferStream',
    value: function bufferStream(stream, onLines, onDone) {
      var _this2 = this;

      stream.setEncoding('utf8');
      var buffered = '';

      stream.on('data', function (data) {
        if (_this2.killed) return;

        var bufferedLength = buffered.length;
        buffered += data;
        var lastNewlineIndex = data.lastIndexOf('\n');

        if (lastNewlineIndex !== -1) {
          var lineLength = lastNewlineIndex + bufferedLength + 1;
          onLines(buffered.substring(0, lineLength));
          buffered = buffered.substring(lineLength);
        }
      });

      stream.on('close', function () {
        if (_this2.killed) return;
        if (buffered.length > 0) onLines(buffered);
        onDone();
      });
    }

    // Kill all child processes of the spawned cmd.exe process on Windows.
    //
    // This is required since killing the cmd.exe does not terminate child
    // processes.
  }, {
    key: 'killOnWindows',
    value: function killOnWindows() {
      var _this3 = this;

      if (!this.process) return;

      var parentPid = this.process.pid;
      var cmd = 'wmic';
      var args = ['process', 'where', '(ParentProcessId=' + parentPid + ')', 'get', 'processid'];

      var wmicProcess = undefined;

      try {
        wmicProcess = _child_process2['default'].spawn(cmd, args);
      } catch (spawnError) {
        this.killProcess();
        return;
      }

      wmicProcess.on('error', function () {}); // ignore errors

      var output = '';
      wmicProcess.stdout.on('data', function (data) {
        output += data;
      });
      wmicProcess.stdout.on('close', function () {
        var pidsToKill = output.split(/\s+/).filter(function (pid) {
          return (/^\d+$/.test(pid)
          );
        }).map(function (pid) {
          return parseInt(pid);
        }).filter(function (pid) {
          return pid !== parentPid && pid > 0 && pid < Infinity;
        });

        for (var pid of pidsToKill) {
          try {
            process.kill(pid);
          } catch (error) {}
        }

        _this3.killProcess();
      });
    }
  }, {
    key: 'killProcess',
    value: function killProcess() {
      if (this.process) this.process.kill();
      this.process = null;
    }
  }, {
    key: 'isExplorerCommand',
    value: function isExplorerCommand(command) {
      if (command === 'explorer.exe' || command === 'explorer') {
        return true;
      } else if (process.env.SystemRoot) {
        return command === _path2['default'].join(process.env.SystemRoot, 'explorer.exe') || command === _path2['default'].join(process.env.SystemRoot, 'explorer');
      } else {
        return false;
      }
    }
  }, {
    key: 'getCmdPath',
    value: function getCmdPath() {
      if (process.env.comspec) {
        return process.env.comspec;
      } else if (process.env.SystemRoot) {
        return _path2['default'].join(process.env.SystemRoot, 'System32', 'cmd.exe');
      } else {
        return 'cmd.exe';
      }
    }

    // Public: Terminate the process.
  }, {
    key: 'kill',
    value: function kill() {
      if (this.killed) return;

      this.killed = true;
      if (process.platform === 'win32') {
        this.killOnWindows();
      } else {
        this.killProcess();
      }
    }
  }, {
    key: 'spawn',
    value: function spawn(command, args, options) {
      var _this4 = this;

      try {
        this.process = _child_process2['default'].spawn(command, args, options);
      } catch (spawnError) {
        process.nextTick(function () {
          return _this4.handleError(spawnError);
        });
      }
    }
  }, {
    key: 'handleEvents',
    value: function handleEvents(stdout, stderr, exit) {
      var _this5 = this;

      if (!this.process) return;

      var triggerExitCallback = function triggerExitCallback() {
        if (_this5.killed) return;
        if (stdoutClosed && stderrClosed && processExited && typeof exit === 'function') {
          exit(exitCode);
        }
      };

      var stdoutClosed = true;
      var stderrClosed = true;
      var processExited = true;
      var exitCode = 0;

      if (stdout) {
        stdoutClosed = false;
        this.bufferStream(this.process.stdout, stdout, function () {
          stdoutClosed = true;
          triggerExitCallback();
        });
      }

      if (stderr) {
        stderrClosed = false;
        this.bufferStream(this.process.stderr, stderr, function () {
          stderrClosed = true;
          triggerExitCallback();
        });
      }

      if (exit) {
        processExited = false;
        this.process.on('exit', function (code) {
          exitCode = code;
          processExited = true;
          triggerExitCallback();
        });
      }

      this.process.on('error', function (error) {
        _this5.handleError(error);
      });
    }
  }, {
    key: 'handleError',
    value: function handleError(error) {
      var handled = false;

      var handle = function handle() {
        handled = true;
      };

      this.emitter.emit('will-throw-error', { error: error, handle: handle });

      if (error.code === 'ENOENT' && error.syscall.indexOf('spawn') === 0) {
        error = new Error('Failed to spawn command `' + this.command + '`. Make sure `' + this.command + '` is installed and on your PATH', error.path);
        error.name = 'BufferedProcessError';
      }

      if (!handled) throw error;
    }
  }]);

  return BufferedProcess;
})();

exports['default'] = BufferedProcess;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9idWZmZXJlZC1wcm9jZXNzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs4QkFFYyxpQkFBaUI7Ozs7NkJBQ04sZUFBZTs7Ozt3QkFDbEIsV0FBVzs7b0JBQ2hCLE1BQU07Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFnQkYsZUFBZTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQThCdEIsV0E5Qk8sZUFBZSxHQThCdUQ7cUVBQUosRUFBRTs7UUFBekUsT0FBTyxRQUFQLE9BQU87UUFBRSxJQUFJLFFBQUosSUFBSTs0QkFBRSxPQUFPO1FBQVAsT0FBTyxnQ0FBRyxFQUFFO1FBQUUsTUFBTSxRQUFOLE1BQU07UUFBRSxNQUFNLFFBQU4sTUFBTTtRQUFFLElBQUksUUFBSixJQUFJOzhCQUFFLFNBQVM7UUFBVCxTQUFTLGtDQUFHLElBQUk7OzBCQTlCOUQsZUFBZTs7QUErQmhDLFFBQUksQ0FBQyxPQUFPLEdBQUcsdUJBQWEsQ0FBQTtBQUM1QixRQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtBQUN0QixRQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtBQUNoQixRQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtBQUN0QixRQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtBQUNwQixRQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtBQUNwQixRQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtBQUNoQixRQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUU7QUFDdEIsVUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO0tBQ2I7QUFDRCxRQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtHQUNwQjs7ZUExQ2tCLGVBQWU7O1dBNEM1QixpQkFBRztBQUNQLFVBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLEVBQUUsT0FBTTs7QUFFakMsVUFBSSxDQUFD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bEIsVUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFBOztBQUVuQixVQUFNLE1BQU0sR0FBRyxTQUFULE1BQU0sR0FBUztBQUNuQixlQUFPLEdBQUcsSUFBSSxDQUFBO09BQ2YsQ0FBQTs7QUFFRCxVQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFDLEtBQUssRUFBTCxLQUFLLEVBQUUsTUFBTSxFQUFOLE1BQU0sRUFBQyxDQUFDLENBQUE7O0FBRXRELFVBQUksS0FBSyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQ25FLGFBQUssR0FBRyxJQUFJLEtBQUssK0JBQThCLElBQUksQ0FBQyxPQUFPLHNCQUFtQixJQUFJLENBQUMsT0FBTyxzQ0FBb0MsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3pJLGFBQUssQ0FBQyxJQUFJLEdBQUcsc0JBQXNCLENBQUE7T0FDcEM7O0FBRUQsVUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEtBQUssQ0FBQTtLQUMxQjs7O1NBblNrQixlQUFlOzs7cUJBQWYsZUFBZSIsImZpbGUiOiJmaWxlOi8vL0M6L3Byb2plY3RzL2F0b20vb3V0L2FwcC9zcmMvYnVmZmVyZWQtcHJvY2Vzcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKiBAYmFiZWwgKi9cblxuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZS1wbHVzJ1xuaW1wb3J0IENoaWxkUHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuaW1wb3J0IHtFbWl0dGVyfSBmcm9tICdldmVudC1raXQnXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuXG4vLyBFeHRlbmRlZDogQSB3cmFwcGVyIHdoaWNoIHByb3ZpZGVzIHN0YW5kYXJkIGVycm9yL291dHB1dCBsaW5lIGJ1ZmZlcmluZyBmb3Jcbi8vIE5vZGUncyBDaGlsZFByb2Nlc3MuXG4vL1xuLy8gIyMgRXhhbXBsZXNcbi8vXG4vLyBgYGBqc1xuLy8ge0J1ZmZlcmVkUHJvY2Vzc30gPSByZXF1aXJlKCdhdG9tJylcbi8vXG4vLyBjb25zdCBjb21tYW5kID0gJ3BzJ1xuLy8gY29uc3QgYXJncyA9IFsnLWVmJ11cbi8vIGNvbnN0IHN0ZG91dCA9IChvdXRwdXQpID0+IGNvbnNvbGUubG9nKG91dHB1dClcbi8vIGNvbnN0IGV4aXQgPSAoY29kZSkgPT4gY29uc29sZS5sb2coXCJwcyAtZWYgZXhpdGVkIHdpdGggI3tjb2RlfVwiKVxuLy8gY29uc3QgcHJvY2VzcyA9IG5ldyBCdWZmZXJlZFByb2Nlc3Moe2NvbW1hbmQsIGFyZ3MsIHN0ZG91dCwgZXhpdH0pXG4vLyBgYGBcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEJ1ZmZlcmVkUHJvY2VzcyB7XG4gIC8qXG4gIFNlY3Rpb246IENvbnN0cnVjdGlvblxuICAqL1xuXG4gIC8vIFB1YmxpYzogUnVucyB0aGUgZ2l2ZW4gY29tbWFuZCBieSBzcGF3bmluZyBhIG5ldyBjaGlsZCBwcm9jZXNzLlxuICAvL1xuICAvLyAqIGBvcHRpb25zYCBBbiB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgLy8gICAqIGBjb21tYW5kYCBUaGUge1N0cmluZ30gY29tbWFuZCB0byBleGVjdXRlLlxuICAvLyAgICogYGFyZ3NgIFRoZSB7QXJyYXl9IG9mIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSBjb21tYW5kIChvcHRpb25hbCkuXG4gIC8vICAgKiBgb3B0aW9uc2Age09iamVjdH0gKG9wdGlvbmFsKSBUaGUgb3B0aW9ucyB7T2JqZWN0fSB0byBwYXNzIHRvIE5vZGUnc1xuICAvLyAgICAgYENoaWxkUHJvY2Vzcy5zcGF3bmAgbWV0aG9kLlxuICAvLyAgICogYHN0ZG91dGAge0Z1bmN0aW9ufSAob3B0aW9uYWwpIFRoZSBjYWxsYmFjayB0aGF0IHJlY2VpdmVzIGEgc2luZ2xlXG4gIC8vICAgICBhcmd1bWVudCB3aGljaCBjb250YWlucyB0aGUgc3RhbmRhcmQgb3V0cHV0IGZyb20gdGhlIGNvbW1hbmQuIFRoZVxuICAvLyAgICAgY2FsbGJhY2sgaXMgY2FsbGVkIGFzIGRhdGEgaXMgcmVjZWl2ZWQgYnV0IGl0J3MgYnVmZmVyZWQgdG8gZW5zdXJlIG9ubHlcbiAgLy8gICAgIGNvbXBsZXRlIGxpbmVzIGFyZSBwYXNzZWQgdW50aWwgdGhlIHNvdXJjZSBzdHJlYW0gY2xvc2VzLiBBZnRlciB0aGVcbiAgLy8gICAgIHNvdXJjZSBzdHJlYW0gaGFzIGNsb3NlZCBhbGwgcmVtYWluaW5nIGRhdGEgaXMgc2VudCBpbiBhIGZpbmFsIGNhbGwuXG4gIC8vICAgICAqIGBkYXRhYCB7U3RyaW5nfVxuICAvLyAgICogYHN0ZGVycmAge0Z1bmN0aW9ufSAob3B0aW9uYWwpIFRoZSBjYWxsYmFjayB0aGF0IHJlY2VpdmVzIGEgc2luZ2xlXG4gIC8vICAgICBhcmd1bWVudCB3aGljaCBjb250YWlucyB0aGUgc3RhbmRhcmQgZXJyb3Igb3V0cHV0IGZyb20gdGhlIGNvbW1hbmQuIFRoZVxuICAvLyAgICAgY2FsbGJhY2sgaXMgY2FsbGVkIGFzIGRhdGEgaXMgcmVjZWl2ZWQgYnV0IGl0J3MgYnVmZmVyZWQgdG8gZW5zdXJlIG9ubHlcbiAgLy8gICAgIGNvbXBsZXRlIGxpbmVzIGFyZSBwYXNzZWQgdW50aWwgdGhlIHNvdXJjZSBzdHJlYW0gY2xvc2VzLiBBZnRlciB0aGVcbiAgLy8gICAgIHNvdXJjZSBzdHJlYW0gaGFzIGNsb3NlZCBhbGwgcmVtYWluaW5nIGRhdGEgaXMgc2VudCBpbiBhIGZpbmFsIGNhbGwuXG4gIC8vICAgICAqIGBkYXRhYCB7U3RyaW5nfVxuICAvLyAgICogYGV4aXRgIHtGdW5jdGlvbn0gKG9wdGlvbmFsKSBUaGUgY2FsbGJhY2sgd2hpY2ggcmVjZWl2ZXMgYSBzaW5nbGVcbiAgLy8gICAgIGFyZ3VtZW50IGNvbnRhaW5pbmcgdGhlIGV4aXQgc3RhdHVzLlxuICAvLyAgICAgKiBgY29kZWAge051bWJlcn1cbiAgLy8gICAqIGBhdXRvU3RhcnRgIHtCb29sZWFufSAob3B0aW9uYWwpIFdoZXRoZXIgdGhlIGNvbW1hbmQgd2lsbCBhdXRvbWF0aWNhbGx5IHN0YXJ0XG4gIC8vICAgICB3aGVuIHRoaXMgQnVmZmVyZWRQcm9jZXNzIGlzIGNyZWF0ZWQuIERlZmF1bHRzIHRvIHRydWUuICBXaGVuIHNldCB0byBmYWxzZSB5b3VcbiAgLy8gICAgIG11c3QgY2FsbCB0aGUgYHN0YXJ0YCBtZXRob2QgdG8gc3RhcnQgdGhlIHByb2Nlc3MuXG4gIGNvbnN0cnVjdG9yICh7Y29tbWFuZCwgYXJncywgb3B0aW9ucyA9IHt9LCBzdGRvdXQsIHN0ZGVyciwgZXhpdCwgYXV0b1N0YXJ0ID0gdHJ1ZX0gPSB7fSkge1xuICAgIHRoaXMuZW1pdHRlciA9IG5ldyBFbWl0dGVyKClcbiAgICB0aGlzLmNvbW1hbmQgPSBjb21tYW5kXG4gICAgdGhpcy5hcmdzID0gYXJnc1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnNcbiAgICB0aGlzLnN0ZG91dCA9IHN0ZG91dFxuICAgIHRoaXMuc3RkZXJyID0gc3RkZXJyXG4gICAgdGhpcy5leGl0ID0gZXhpdFxuICAgIGlmIChhdXRvU3RhcnQgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuc3RhcnQoKVxuICAgIH1cbiAgICB0aGlzLmtpbGxlZCA9IGZhbHNlXG4gIH1cblxuICBzdGFydCAoKSB7XG4gICAgaWYgKHRoaXMuc3RhcnRlZCA9PT0gdHJ1ZSkgcmV0dXJuXG5cbiAgICB0aGlzLnN0YXJ0ZWQgPSB0cnVlXG4gICAgLy8gUmVsYXRlZCB0byBqb3llbnQvbm9kZSMyMzE4XG4gICAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicgJiYgdGhpcy5vcHRpb25zLnNoZWxsID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuc3Bhd25XaXRoRXNjYXBlZFdpbmRvd3NBcmdzKHRoaXMuY29tbWFuZCwgdGhpcy5hcmdzLCB0aGlzLm9wdGlvbnMpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3Bhd24odGhpcy5jb21tYW5kLCB0aGlzLmFyZ3MsIHRoaXMub3B0aW9ucylcbiAgICB9XG4gICAgdGhpcy5oYW5kbGVFdmVudHModGhpcy5zdGRvdXQsIHRoaXMuc3RkZXJyLCB0aGlzLmV4aXQpXG4gIH1cblxuICAvLyBXaW5kb3dzIGhhcyBhIGJ1bmNoIG9mIHNwZWNpYWwgcnVsZXMgdGhhdCBub2RlIHN0aWxsIGRvZXNuJ3QgdGFrZSBjYXJlIG9mIGZvciB5b3VcbiAgc3Bhd25XaXRoRXNjYXBlZFdpbmRvd3NBcmdzIChjb21tYW5kLCBhcmdzLCBvcHRpb25zKSB7XG4gICAgbGV0IGNtZEFyZ3MgPSBbXVxuICAgIC8vIFF1b3RlIGFsbCBhcmd1bWVudHMgYW5kIGVzY2FwZXMgaW5uZXIgcXVvdGVzXG4gICAgaWYgKGFyZ3MpIHtcbiAgICAgIGNtZEFyZ3MgPSBhcmdzLmZpbHRlcigoYXJnKSA9PiBhcmcgIT0gbnVsbClcbiAgICAgICAgLm1hcCgoYXJnKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMuaXNFeHBsb3JlckNvbW1hbmQoY29tbWFuZCkgJiYgL15cXC9bYS16QS1aXSssLiokLy50ZXN0KGFyZykpIHtcbiAgICAgICAgICAgIC8vIERvbid0IHdyYXAgL3Jvb3QsQzpcXGZvbGRlciBzdHlsZSBhcmd1bWVudHMgdG8gZXhwbG9yZXIgY2FsbHMgaW5cbiAgICAgICAgICAgIC8vIHF1b3RlcyBzaW5jZSB0aGV5IHdpbGwgbm90IGJlIGludGVycHJldGVkIGNvcnJlY3RseSBpZiB0aGV5IGFyZVxuICAgICAgICAgICAgcmV0dXJuIGFyZ1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBFc2NhcGUgZG91YmxlIHF1b3RlcyBieSBwdXR0aW5nIGEgYmFja3NsYXNoIGluIGZyb250IG9mIHRoZW1cbiAgICAgICAgICAgIHJldHVybiBgXFxcIiR7YXJnLnRvU3RyaW5nKCkucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpfVxcXCJgXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8vIFRoZSBjb21tYW5kIGl0c2VsZiBpcyBxdW90ZWQgaWYgaXQgY29udGFpbnMgc3BhY2VzLCAmLCBeLCB8IG9yICMgY2hhcnNcbiAgICBjbWRBcmdzLnVuc2hpZnQoL1xcc3wmfFxcXnxcXCh8XFwpfFxcfHwjLy50ZXN0KGNvbW1hbmQpID8gYFxcXCIke2NvbW1hbmR9XFxcImAgOiBjb21tYW5kKVxuXG4gICAgY29uc3QgY21kT3B0aW9ucyA9IF8uY2xvbmUob3B0aW9ucylcbiAgICBjbWRPcHRpb25zLndpbmRvd3NWZXJiYXRpbUFyZ3VtZW50cyA9IHRydWVcblxuICAgIHRoaXMuc3Bhd24odGhpcy5nZXRDbWRQYXRoKCksIFsnL3MnLCAnL2QnLCAnL2MnLCBgXFxcIiR7Y21kQXJncy5qb2luKCcgJyl9XFxcImBdLCBjbWRPcHRpb25zKVxuICB9XG5cbiAgLypcbiAgU2VjdGlvbjogRXZlbnQgU3Vic2NyaXB0aW9uXG4gICovXG5cbiAgLy8gUHVibGljOiBXaWxsIGNhbGwgeW91ciBjYWxsYmFjayB3aGVuIGFuIGVycm9yIHdpbGwgYmUgcmFpc2VkIGJ5IHRoZSBwcm9jZXNzLlxuICAvLyBVc3VhbGx5IHRoaXMgaXMgZHVlIHRvIHRoZSBjb21tYW5kIG5vdCBiZWluZyBhdmFpbGFibGUgb3Igbm90IG9uIHRoZSBQQVRILlxuICAvLyBZb3UgY2FuIGNhbGwgYGhhbmRsZSgpYCBvbiB0aGUgb2JqZWN0IHBhc3NlZCB0byB5b3VyIGNhbGxiYWNrIHRvIGluZGljYXRlXG4gIC8vIHRoYXQgeW91IGhhdmUgaGFuZGxlZCB0aGlzIGVycm9yLlxuICAvL1xuICAvLyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSBjYWxsYmFja1xuICAvLyAgICogYGVycm9yT2JqZWN0YCB7T2JqZWN0fVxuICAvLyAgICAgKiBgZXJyb3JgIHtPYmplY3R9IHRoZSBlcnJvciBvYmplY3RcbiAgLy8gICAgICogYGhhbmRsZWAge0Z1bmN0aW9ufSBjYWxsIHRoaXMgdG8gaW5kaWNhdGUgeW91IGhhdmUgaGFuZGxlZCB0aGUgZXJyb3IuXG4gIC8vICAgICAgIFRoZSBlcnJvciB3aWxsIG5vdCBiZSB0aHJvd24gaWYgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQuXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RGlzcG9zYWJsZX1cbiAgb25XaWxsVGhyb3dFcnJvciAoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5lbWl0dGVyLm9uKCd3aWxsLXRocm93LWVycm9yJywgY2FsbGJhY2spXG4gIH1cblxuICAvKlxuICBTZWN0aW9uOiBIZWxwZXIgTWV0aG9kc1xuICAqL1xuXG4gIC8vIEhlbHBlciBtZXRob2QgdG8gcGFzcyBkYXRhIGxpbmUgYnkgbGluZS5cbiAgLy9cbiAgLy8gKiBgc3RyZWFtYCBUaGUgU3RyZWFtIHRvIHJlYWQgZnJvbS5cbiAgLy8gKiBgb25MaW5lc2AgVGhlIGNhbGxiYWNrIHRvIGNhbGwgd2l0aCBlYWNoIGxpbmUgb2YgZGF0YS5cbiAgLy8gKiBgb25Eb25lYCBUaGUgY2FsbGJhY2sgdG8gY2FsbCB3aGVuIHRoZSBzdHJlYW0gaGFzIGNsb3NlZC5cbiAgYnVmZmVyU3RyZWFtIChzdHJlYW0sIG9uTGluZXMsIG9uRG9uZSkge1xuICAgIHN0cmVhbS5zZXRFbmNvZGluZygndXRmOCcpXG4gICAgbGV0IGJ1ZmZlcmVkID0gJydcblxuICAgIHN0cmVhbS5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gICAgICBpZiAodGhpcy5raWxsZWQpIHJldHVyblxuXG4gICAgICBsZXQgYnVmZmVyZWRMZW5ndGggPSBidWZmZXJlZC5sZW5ndGhcbiAgICAgIGJ1ZmZlcmVkICs9IGRhdGFcbiAgICAgIGxldCBsYXN0TmV3bGluZUluZGV4ID0gZGF0YS5sYXN0SW5kZXhPZignXFxuJylcblxuICAgICAgaWYgKGxhc3ROZXdsaW5lSW5kZXggIT09IC0xKSB7XG4gICAgICAgIGxldCBsaW5lTGVuZ3RoID0gbGFzdE5ld2xpbmVJbmRleCArIGJ1ZmZlcmVkTGVuZ3RoICsgMVxuICAgICAgICBvbkxpbmVzKGJ1ZmZlcmVkLnN1YnN0cmluZygwLCBsaW5lTGVuZ3RoKSlcbiAgICAgICAgYnVmZmVyZWQgPSBidWZmZXJlZC5zdWJzdHJpbmcobGluZUxlbmd0aClcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgc3RyZWFtLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgIGlmICh0aGlzLmtpbGxlZCkgcmV0dXJuXG4gICAgICBpZiAoYnVmZmVyZWQubGVuZ3RoID4gMCkgb25MaW5lcyhidWZmZXJlZClcbiAgICAgIG9uRG9uZSgpXG4gICAgfSlcbiAgfVxuXG4gIC8vIEtpbGwgYWxsIGNoaWxkIHByb2Nlc3NlcyBvZiB0aGUgc3Bhd25lZCBjbWQuZXhlIHByb2Nlc3Mgb24gV2luZG93cy5cbiAgLy9cbiAgLy8gVGhpcyBpcyByZXF1aXJlZCBzaW5jZSBraWxsaW5nIHRoZSBjbWQuZXhlIGRvZXMgbm90IHRlcm1pbmF0ZSBjaGlsZFxuICAvLyBwcm9jZXNzZXMuXG4gIGtpbGxPbldpbmRvd3MgKCkge1xuICAgIGlmICghdGhpcy5wcm9jZXNzKSByZXR1cm5cblxuICAgIGNvbnN0IHBhcmVudFBpZCA9IHRoaXMucHJvY2Vzcy5waWRcbiAgICBjb25zdCBjbWQgPSAnd21pYydcbiAgICBjb25zdCBhcmdzID0gW1xuICAgICAgJ3Byb2Nlc3MnLFxuICAgICAgJ3doZXJlJyxcbiAgICAgIGAoUGFyZW50UHJvY2Vzc0lkPSR7cGFyZW50UGlkfSlgLFxuICAgICAgJ2dldCcsXG4gICAgICAncHJvY2Vzc2lkJ1xuICAgIF1cblxuICAgIGxldCB3bWljUHJvY2Vzc1xuXG4gICAgdHJ5IHtcbiAgICAgIHdtaWNQcm9jZXNzID0gQ2hpbGRQcm9jZXNzLnNwYXduKGNtZCwgYXJncylcbiAgICB9IGNhdGNoIChzcGF3bkVycm9yKSB7XG4gICAgICB0aGlzLmtpbGxQcm9jZXNzKClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHdtaWNQcm9jZXNzLm9uKCdlcnJvcicsICgpID0+IHt9KSAvLyBpZ25vcmUgZXJyb3JzXG5cbiAgICBsZXQgb3V0cHV0ID0gJydcbiAgICB3bWljUHJvY2Vzcy5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgb3V0cHV0ICs9IGRhdGFcbiAgICB9KVxuICAgIHdtaWNQcm9jZXNzLnN0ZG91dC5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICBjb25zdCBwaWRzVG9LaWxsID0gb3V0cHV0LnNwbGl0KC9cXHMrLylcbiAgICAgICAgLmZpbHRlcigocGlkKSA9PiAvXlxcZCskLy50ZXN0KHBpZCkpXG4gICAgICAgIC5tYXAoKHBpZCkgPT4gcGFyc2VJbnQocGlkKSlcbiAgICAgICAgLmZpbHRlcigocGlkKSA9PiBwaWQgIT09IHBhcmVudFBpZCAmJiBwaWQgPiAwICYmIHBpZCA8IEluZmluaXR5KVxuXG4gICAgICBmb3IgKGxldCBwaWQgb2YgcGlkc1RvS2lsbCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHByb2Nlc3Mua2lsbChwaWQpXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7fVxuICAgICAgfVxuXG4gICAgICB0aGlzLmtpbGxQcm9jZXNzKClcbiAgICB9KVxuICB9XG5cbiAga2lsbFByb2Nlc3MgKCkge1xuICAgIGlmICh0aGlzLnByb2Nlc3MpIHRoaXMucHJvY2Vzcy5raWxsKClcbiAgICB0aGlzLnByb2Nlc3MgPSBudWxsXG4gIH1cblxuICBpc0V4cGxvcmVyQ29tbWFuZCAoY29tbWFuZCkge1xuICAgIGlmIChjb21tYW5kID09PSAnZXhwbG9yZXIuZXhlJyB8fCBjb21tYW5kID09PSAnZXhwbG9yZXInKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH0gZWxzZSBpZiAocHJvY2Vzcy5lbnYuU3lzdGVtUm9vdCkge1xuICAgICAgcmV0dXJuIGNvbW1hbmQgPT09IHBhdGguam9pbihwcm9jZXNzLmVudi5TeXN0ZW1Sb290LCAnZXhwbG9yZXIuZXhlJykgfHwgY29tbWFuZCA9PT0gcGF0aC5qb2luKHByb2Nlc3MuZW52LlN5c3RlbVJvb3QsICdleHBsb3JlcicpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxuXG4gIGdldENtZFBhdGggKCkge1xuICAgIGlmIChwcm9jZXNzLmVudi5jb21zcGVjKSB7XG4gICAgICByZXR1cm4gcHJvY2Vzcy5lbnYuY29tc3BlY1xuICAgIH0gZWxzZSBpZiAocHJvY2Vzcy5lbnYuU3lzdGVtUm9vdCkge1xuICAgICAgcmV0dXJuIHBhdGguam9pbihwcm9jZXNzLmVudi5TeXN0ZW1Sb290LCAnU3lzdGVtMzInLCAnY21kLmV4ZScpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnY21kLmV4ZSdcbiAgICB9XG4gIH1cblxuICAvLyBQdWJsaWM6IFRlcm1pbmF0ZSB0aGUgcHJvY2Vzcy5cbiAga2lsbCAoKSB7XG4gICAgaWYgKHRoaXMua2lsbGVkKSByZXR1cm5cblxuICAgIHRoaXMua2lsbGVkID0gdHJ1ZVxuICAgIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgICB0aGlzLmtpbGxPbldpbmRvd3MoKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmtpbGxQcm9jZXNzKClcbiAgICB9XG4gIH1cblxuICBzcGF3biAoY29tbWFuZCwgYXJncywgb3B0aW9ucykge1xuICAgIHRyeSB7XG4gICAgICB0aGlzLnByb2Nlc3MgPSBDaGlsZFByb2Nlc3Muc3Bhd24oY29tbWFuZCwgYXJncywgb3B0aW9ucylcbiAgICB9IGNhdGNoIChzcGF3bkVycm9yKSB7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHRoaXMuaGFuZGxlRXJyb3Ioc3Bhd25FcnJvcikpXG4gICAgfVxuICB9XG5cbiAgaGFuZGxlRXZlbnRzIChzdGRvdXQsIHN0ZGVyciwgZXhpdCkge1xuICAgIGlmICghdGhpcy5wcm9jZXNzKSByZXR1cm5cblxuICAgIGNvbnN0IHRyaWdnZXJFeGl0Q2FsbGJhY2sgPSAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5raWxsZWQpIHJldHVyblxuICAgICAgaWYgKHN0ZG91dENsb3NlZCAmJiBzdGRlcnJDbG9zZWQgJiYgcHJvY2Vzc0V4aXRlZCAmJiB0eXBlb2YgZXhpdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBleGl0KGV4aXRDb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBzdGRvdXRDbG9zZWQgPSB0cnVlXG4gICAgbGV0IHN0ZGVyckNsb3NlZCA9IHRydWVcbiAgICBsZXQgcHJvY2Vzc0V4aXRlZCA9IHRydWVcbiAgICBsZXQgZXhpdENvZGUgPSAwXG5cbiAgICBpZiAoc3Rkb3V0KSB7XG4gICAgICBzdGRvdXRDbG9zZWQgPSBmYWxzZVxuICAgICAgdGhpcy5idWZmZXJTdHJlYW0odGhpcy5wcm9jZXNzLnN0ZG91dCwgc3Rkb3V0LCAoKSA9PiB7XG4gICAgICAgIHN0ZG91dENsb3NlZCA9IHRydWVcbiAgICAgICAgdHJpZ2dlckV4aXRDYWxsYmFjaygpXG4gICAgICB9KVxuICAgIH1cblxuICAgIGlmIChzdGRlcnIpIHtcbiAgICAgIHN0ZGVyckNsb3NlZCA9IGZhbHNlXG4gICAgICB0aGlzLmJ1ZmZlclN0cmVhbSh0aGlzLnByb2Nlc3Muc3RkZXJyLCBzdGRlcnIsICgpID0+IHtcbiAgICAgICAgc3RkZXJyQ2xvc2VkID0gdHJ1ZVxuICAgICAgICB0cmlnZ2VyRXhpdENhbGxiYWNrKClcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaWYgKGV4aXQpIHtcbiAgICAgIHByb2Nlc3NFeGl0ZWQgPSBmYWxzZVxuICAgICAgdGhpcy5wcm9jZXNzLm9uKCdleGl0JywgKGNvZGUpID0+IHtcbiAgICAgICAgZXhpdENvZGUgPSBjb2RlXG4gICAgICAgIHByb2Nlc3NFeGl0ZWQgPSB0cnVlXG4gICAgICAgIHRyaWdnZXJFeGl0Q2FsbGJhY2soKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICB0aGlzLnByb2Nlc3Mub24oJ2Vycm9yJywgKGVycm9yKSA9PiB7XG4gICAgICB0aGlzLmhhbmRsZUVycm9yKGVycm9yKVxuICAgIH0pXG4gIH1cblxuICBoYW5kbGVFcnJvciAoZXJyb3IpIHtcbiAgICBsZXQgaGFuZGxlZCA9IGZhbHNlXG5cbiAgICBjb25zdCBoYW5kbGUgPSAoKSA9PiB7XG4gICAgICBoYW5kbGVkID0gdHJ1ZVxuICAgIH1cblxuICAgIHRoaXMuZW1pdHRlci5lbWl0KCd3aWxsLXRocm93LWVycm9yJywge2Vycm9yLCBoYW5kbGV9KVxuXG4gICAgaWYgKGVycm9yLmNvZGUgPT09ICdFTk9FTlQnICYmIGVycm9yLnN5c2NhbGwuaW5kZXhPZignc3Bhd24nKSA9PT0gMCkge1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoYEZhaWxlZCB0byBzcGF3biBjb21tYW5kIFxcYCR7dGhpcy5jb21tYW5kfVxcYC4gTWFrZSBzdXJlIFxcYCR7dGhpcy5jb21tYW5kfVxcYCBpcyBpbnN0YWxsZWQgYW5kIG9uIHlvdXIgUEFUSGAsIGVycm9yLnBhdGgpXG4gICAgICBlcnJvci5uYW1lID0gJ0J1ZmZlcmVkUHJvY2Vzc0Vycm9yJ1xuICAgIH1cblxuICAgIGlmICghaGFuZGxlZCkgdGhyb3cgZXJyb3JcbiAgfVxufVxuIl19