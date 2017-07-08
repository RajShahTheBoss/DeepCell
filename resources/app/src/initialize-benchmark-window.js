Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, 'next'); var callThrow = step.bind(null, 'throw'); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

/** @babel */

var _electron = require('electron');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _ipcHelpers = require('./ipc-helpers');

var _ipcHelpers2 = _interopRequireDefault(_ipcHelpers);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

exports['default'] = _asyncToGenerator(function* () {
  var getWindowLoadSettings = require('./get-window-load-settings');

  var _getWindowLoadSettings = getWindowLoadSettings();

  var test = _getWindowLoadSettings.test;
  var headless = _getWindowLoadSettings.headless;
  var resourcePath = _getWindowLoadSettings.resourcePath;
  var benchmarkPaths = _getWindowLoadSettings.benchmarkPaths;

  try {
    yield* (function* () {
      var Clipboard = require('../src/clipboard');
      var ApplicationDelegate = require('../src/application-delegate');
      var AtomEnvironment = require('../src/atom-environment');
      var TextEditor = require('../src/text-editor');
      require('./electron-shims');

      var exportsPath = _path2['default'].join(resourcePath, 'exports');
      require('module').globalPaths.push(exportsPath); // Add 'exports' to module search path.
      process.env.NODE_PATH = exportsPath; // Set NODE_PATH env variable since tasks may need it.

      document.title = 'Benchmarks';
      // Allow `document.title` to be assigned in benchmarks without actually changing the window title.
      var documentTitle = null;
      Object.defineProperty(document, 'title', {
        get: function get() {
          return documentTitle;
        },
        set: function set(title) {
          documentTitle = title;
        }
      });

      window.addEventListener('keydown', function (event) {
        // Reload: cmd-r / ctrl-r
        if ((event.metaKey || event.ctrlKey) && event.keyCode === 82) {
          _ipcHelpers2['default'].call('window-method', 'reload');
        }

        // Toggle Dev Tools: cmd-alt-i (Mac) / ctrl-shift-i (Linux/Windows)
        if (event.keyCode === 73) {
          var isDarwin = process.platform === 'darwin';
          if (isDarwin && event.metaKey && event.altKey || !isDarwin && event.ctrlKey && event.shiftKey) {
            _ipcHelpers2['default'].call('window-method', 'toggleDevTools');
          }
        }

        // Close: cmd-w / ctrl-w
        if ((event.metaKey || event.ctrlKey) && event.keyCode === 87) {
          _ipcHelpers2['default'].call('window-method', 'close');
        }

        // Copy: cmd-c / ctrl-c
        if ((event.metaKey || event.ctrlKey) && event.keyCode === 67) {
          _ipcHelpers2['default'].call('window-method', 'copy');
        }
      }, true);

      var clipboard = new Clipboard();
      TextEditor.setClipboard(clipboard);

      var applicationDelegate = new ApplicationDelegate();
      var environmentParams = {
        applicationDelegate: applicationDelegate,
        window: window,
        document: document,
        clipboard: clipboard,
        configDirPath: process.env.ATOM_HOME,
        enablePersistence: false
      };
      global.atom = new AtomEnvironment(environmentParams);
      global.atom.initialize(environmentParams);

      // Prevent benchmarks from modifying application menus
      global.atom.menu.sendToBrowserProcess = function () {};

      if (headless) {
        Object.defineProperties(process, {
          stdout: { value: _electron.remote.process.stdout },
          stderr: { value: _electron.remote.process.stderr }
        });

        console.log = function () {
          var formatted = _util2['default'].format.apply(_util2['default'], arguments);
          process.stdout.write(formatted + '\n');
        };
        console.warn = function () {
          var formatted = _util2['default'].format.apply(_util2['default'], arguments);
          process.stderr.write(formatted + '\n');
        };
        console.error = function () {
          var formatted = _util2['default'].format.apply(_util2['default'], arguments);
          process.stderr.write(formatted + '\n');
        };
      } else {
        _electron.remote.getCurrentWindow().show();
      }

      var benchmarkRunner = require('../benchmarks/benchmark-runner');
      var statusCode = yield benchmarkRunner({ test: test, benchmarkPaths: benchmarkPaths });
      if (headless) {
        exitWithStatusCode(statusCode);
      }
    })();
  } catch (error) {
    if (headless) {
      console.error(error.stack || error);
      exitWithStatusCode(1);
    } else {
      _ipcHelpers2['default'].call('window-method', 'openDevTools');
      throw error;
    }
  }
});

function exitWithStatusCode(statusCode) {
  _electron.remote.app.emit('will-quit');
  _electron.remote.process.exit(statusCode);
}
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9pbml0aWFsaXplLWJlbmNobWFyay13aW5kb3cuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozt3QkFFcUIsVUFBVTs7b0JBQ2QsTUFBTTs7OzswQkFDQSxlQUFlOzs7O29CQUNyQixNQUFNOzs7O3VDQUVSLGFBQWtCO0FBQy9CLE1BQU0scUJBQXFCLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUE7OytCQUNaLHFCQUFxQixFQUFFOztNQUF2RSxJQUFJLDBCQUFKLElBQUk7TUFBRSxRQUFRLDBCQUFSLFFBQVE7TUFBRSxZQUFZLDBCQUFaLFlBQVk7TUFBRSxjQUFjLDBCQUFkLGNBQWM7O0FBQ25ELE1BQUk7O0FBQ0YsVUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUE7QUFDN0MsVUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtBQUNsRSxVQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQTtBQUMxRCxVQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtBQUNoRCxhQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQTs7QUFFM0IsVUFBTSxXQUFXLEdBQUcsa0JBQUssSUFBSSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQTtBQUN0RCxhQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtBQUMvQyxhQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxXQUFXLENBQUE7O0FBRW5DLGNBQVEsQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFBOztBQUU3QixVQUFJLGFBQWEsR0FBRyxJQUFJLENBQUE7QUFDeEIsWUFBTSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFO0FBQ3ZDLFdBQUcsRUFBQyxlQUFHO0FBQUUsaUJBQU8sYUFBYSxDQUFBO1NBQUU7QUFDL0IsV0FBRyxFQUFDLGFBQUMsS0FBSyxFQUFFO0FBQUUsdUJBQWEsR0FBRyxLQUFLLENBQUE7U0FBRTtPQUN0QyxDQUFDLENBQUE7O0FBRUYsWUFBTSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxVQUFDLEtBQUssRUFBSzs7QUFFNUMsWUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQSxJQUFLLEtBQUssQ0FBQyxPQUFPLEtBQUssRUFBRSxFQUFFO0FBQzVELGtDQUFXLElBQUksQ0FBQyxlQUFlLEVBQUUsUUFBUSxDQUFDLENBQUE7U0FDM0M7OztBQUdELFlBQUksS0FBSyxDQUFDLE9BQU8sS0FBSyxFQUFFLEVBQUU7QUFDeEIsY0FBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUE7QUFDOUMsY0FBSSxBQUFDLFFBQVEsSUFBSSxLQUFLLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQU0sQ0FBQyxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsUUFBUSxBQUFDLEVBQUU7QUFDakcsb0NBQVcsSUFBSSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1dBQ25EO1NBQ0Y7OztBQUdELFlBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUEsSUFBSyxLQUFLLENBQUMsT0FBTyxLQUFLLEVBQUUsRUFBRTtBQUM1RCxrQ0FBVyxJQUFJLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1NBQzFDOzs7QUFHRCxZQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFBLElBQUssS0FBSyxDQUFDLE9BQU8sS0FBSyxFQUFFLEVBQUU7QUFDNUQsa0NBQVcsSUFBSSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtTQUN6QztPQUNGLEVBQUUsSUFBSSxDQUFDLENBQUE7O0FBRVIsVUFBTSxTQUFTLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQTtBQUNqQyxnQkFBVSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQTs7QUFFbEMsVUFBTSxtQkFBbUIsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUE7QUFDckQsVUFBTSxpQkFBaUIsR0FBRztBQUN4QiwyQkFBbUIsRUFBbkIsbUJBQW1CO0FBQ25CLGNBQU0sRUFBTixNQUFNO0FBQ04sZ0JBQVEsRUFBUixRQUFRO0FBQ1IsaUJBQVMsRUFBVCxTQUFTO0FBQ1QscUJBQWEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVM7QUFDcEMseUJBQWlCLEVBQUUsS0FBSztPQUN6QixDQUFBO0FBQ0QsWUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0FBQ3BELFlBQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLENBQUE7OztBQUd6QyxZQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxZQUFZLEVBQUcsQ0FBQTs7QUFFdkQsVUFBSSxRQUFRLEVBQUU7QUFDWixjQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFO0FBQy9CLGdCQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsaUJBQU8sT0FBTyxDQUFDLE1BQU0sRUFBRTtBQUN4QyxnQkFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLGlCQUFPLE9BQU8sQ0FBQyxNQUFNLEVBQUU7U0FDekMsQ0FBQyxDQUFBOztBQUVGLGVBQU8sQ0FBQyxHQUFHLEdBQUcsWUFBbUI7QUFDL0IsY0FBTSxTQUFTLEdBQUcsa0JBQUssTUFBTSxNQUFBLDhCQUFTLENBQUE7QUFDdEMsaUJBQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQTtTQUN2QyxDQUFBO0FBQ0QsZUFBTyxDQUFDLElBQUksR0FBRyxZQUFtQjtBQUNoQyxjQUFNLFNBQVMsR0FBRyxrQkFBSyxNQUFNLE1BQUEsOEJBQVMsQ0FBQTtBQUN0QyxpQkFBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFBO1NBQ3ZDLENBQUE7QUFDRCxlQUFPLENBQUMsS0FBSyxHQUFHLFlBQW1CO0FBQ2pDLGNBQU0sU0FBUyxHQUFHLGtCQUFLLE1BQU0sTUFBQSw4QkFBUyxDQUFBO0FBQ3RDLGlCQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUE7U0FDdkMsQ0FBQTtPQUNGLE1BQU07QUFDTCx5QkFBTyxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFBO09BQ2pDOztBQUVELFVBQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO0FBQ2pFLFVBQU0sVUFBVSxHQUFHLE1BQU0sZUFBZSxDQUFDLEVBQUMsSUFBSSxFQUFKLElBQUksRUFBRSxjQUFjLEVBQWQsY0FBYyxFQUFDLENBQUMsQ0FBQTtBQUNoRSxVQUFJLFFBQVEsRUFBRTtBQUNaLDBCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFBO09BQy9COztHQUNGLENBQUMsT0FBTyxLQUFLLEVBQUU7QUFDZCxRQUFJLFFBQVEsRUFBRTtBQUNaLGFBQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsQ0FBQTtBQUNuQyx3QkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUN0QixNQUFNO0FBQ0wsOEJBQVcsSUFBSSxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQTtBQUNoRCxZQUFNLEtBQUssQ0FBQTtLQUNaO0dBQ0Y7Q0FDRjs7QUFFRCxTQUFTLGtCQUFrQixDQUFFLFVBQVUsRUFBRTtBQUN2QyxtQkFBTyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0FBQzVCLG1CQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7Q0FDaEMiLCJmaWxlIjoiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2luaXRpYWxpemUtYmVuY2htYXJrLXdpbmRvdy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKiBAYmFiZWwgKi9cblxuaW1wb3J0IHtyZW1vdGV9IGZyb20gJ2VsZWN0cm9uJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBpcGNIZWxwZXJzIGZyb20gJy4vaXBjLWhlbHBlcnMnXG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJ1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gIGNvbnN0IGdldFdpbmRvd0xvYWRTZXR0aW5ncyA9IHJlcXVpcmUoJy4vZ2V0LXdpbmRvdy1sb2FkLXNldHRpbmdzJylcbiAgY29uc3Qge3Rlc3QsIGhlYWRsZXNzLCByZXNvdXJjZVBhdGgsIGJlbmNobWFya1BhdGhzfSA9IGdldFdpbmRvd0xvYWRTZXR0aW5ncygpXG4gIHRyeSB7XG4gICAgY29uc3QgQ2xpcGJvYXJkID0gcmVxdWlyZSgnLi4vc3JjL2NsaXBib2FyZCcpXG4gICAgY29uc3QgQXBwbGljYXRpb25EZWxlZ2F0ZSA9IHJlcXVpcmUoJy4uL3NyYy9hcHBsaWNhdGlvbi1kZWxlZ2F0ZScpXG4gICAgY29uc3QgQXRvbUVudmlyb25tZW50ID0gcmVxdWlyZSgnLi4vc3JjL2F0b20tZW52aXJvbm1lbnQnKVxuICAgIGNvbnN0IFRleHRFZGl0b3IgPSByZXF1aXJlKCcuLi9zcmMvdGV4dC1lZGl0b3InKVxuICAgIHJlcXVpcmUoJy4vZWxlY3Ryb24tc2hpbXMnKVxuXG4gICAgY29uc3QgZXhwb3J0c1BhdGggPSBwYXRoLmpvaW4ocmVzb3VyY2VQYXRoLCAnZXhwb3J0cycpXG4gICAgcmVxdWlyZSgnbW9kdWxlJykuZ2xvYmFsUGF0aHMucHVzaChleHBvcnRzUGF0aCkgLy8gQWRkICdleHBvcnRzJyB0byBtb2R1bGUgc2VhcmNoIHBhdGguXG4gICAgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIID0gZXhwb3J0c1BhdGggLy8gU2V0IE5PREVfUEFUSCBlbnYgdmFyaWFibGUgc2luY2UgdGFza3MgbWF5IG5lZWQgaXQuXG5cbiAgICBkb2N1bWVudC50aXRsZSA9ICdCZW5jaG1hcmtzJ1xuICAgIC8vIEFsbG93IGBkb2N1bWVudC50aXRsZWAgdG8gYmUgYXNzaWduZWQgaW4gYmVuY2htYXJrcyB3aXRob3V0IGFjdHVhbGx5IGNoYW5naW5nIHRoZSB3aW5kb3cgdGl0bGUuXG4gICAgbGV0IGRvY3VtZW50VGl0bGUgPSBudWxsXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGRvY3VtZW50LCAndGl0bGUnLCB7XG4gICAgICBnZXQgKCkgeyByZXR1cm4gZG9jdW1lbnRUaXRsZSB9LFxuICAgICAgc2V0ICh0aXRsZSkgeyBkb2N1bWVudFRpdGxlID0gdGl0bGUgfVxuICAgIH0pXG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChldmVudCkgPT4ge1xuICAgICAgLy8gUmVsb2FkOiBjbWQtciAvIGN0cmwtclxuICAgICAgaWYgKChldmVudC5tZXRhS2V5IHx8IGV2ZW50LmN0cmxLZXkpICYmIGV2ZW50LmtleUNvZGUgPT09IDgyKSB7XG4gICAgICAgIGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICdyZWxvYWQnKVxuICAgICAgfVxuXG4gICAgICAvLyBUb2dnbGUgRGV2IFRvb2xzOiBjbWQtYWx0LWkgKE1hYykgLyBjdHJsLXNoaWZ0LWkgKExpbnV4L1dpbmRvd3MpXG4gICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gNzMpIHtcbiAgICAgICAgY29uc3QgaXNEYXJ3aW4gPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnZGFyd2luJ1xuICAgICAgICBpZiAoKGlzRGFyd2luICYmIGV2ZW50Lm1ldGFLZXkgJiYgZXZlbnQuYWx0S2V5KSB8fCAoIWlzRGFyd2luICYmIGV2ZW50LmN0cmxLZXkgJiYgZXZlbnQuc2hpZnRLZXkpKSB7XG4gICAgICAgICAgaXBjSGVscGVycy5jYWxsKCd3aW5kb3ctbWV0aG9kJywgJ3RvZ2dsZURldlRvb2xzJylcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBDbG9zZTogY21kLXcgLyBjdHJsLXdcbiAgICAgIGlmICgoZXZlbnQubWV0YUtleSB8fCBldmVudC5jdHJsS2V5KSAmJiBldmVudC5rZXlDb2RlID09PSA4Nykge1xuICAgICAgICBpcGNIZWxwZXJzLmNhbGwoJ3dpbmRvdy1tZXRob2QnLCAnY2xvc2UnKVxuICAgICAgfVxuXG4gICAgICAvLyBDb3B5OiBjbWQtYyAvIGN0cmwtY1xuICAgICAgaWYgKChldmVudC5tZXRhS2V5IHx8IGV2ZW50LmN0cmxLZXkpICYmIGV2ZW50LmtleUNvZGUgPT09IDY3KSB7XG4gICAgICAgIGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICdjb3B5JylcbiAgICAgIH1cbiAgICB9LCB0cnVlKVxuXG4gICAgY29uc3QgY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZCgpXG4gICAgVGV4dEVkaXRvci5zZXRDbGlwYm9hcmQoY2xpcGJvYXJkKVxuXG4gICAgY29uc3QgYXBwbGljYXRpb25EZWxlZ2F0ZSA9IG5ldyBBcHBsaWNhdGlvbkRlbGVnYXRlKClcbiAgICBjb25zdCBlbnZpcm9ubWVudFBhcmFtcyA9IHtcbiAgICAgIGFwcGxpY2F0aW9uRGVsZWdhdGUsXG4gICAgICB3aW5kb3csXG4gICAgICBkb2N1bWVudCxcbiAgICAgIGNsaXBib2FyZCxcbiAgICAgIGNvbmZpZ0RpclBhdGg6IHByb2Nlc3MuZW52LkFUT01fSE9NRSxcbiAgICAgIGVuYWJsZVBlcnNpc3RlbmNlOiBmYWxzZVxuICAgIH1cbiAgICBnbG9iYWwuYXRvbSA9IG5ldyBBdG9tRW52aXJvbm1lbnQoZW52aXJvbm1lbnRQYXJhbXMpXG4gICAgZ2xvYmFsLmF0b20uaW5pdGlhbGl6ZShlbnZpcm9ubWVudFBhcmFtcylcblxuICAgIC8vIFByZXZlbnQgYmVuY2htYXJrcyBmcm9tIG1vZGlmeWluZyBhcHBsaWNhdGlvbiBtZW51c1xuICAgIGdsb2JhbC5hdG9tLm1lbnUuc2VuZFRvQnJvd3NlclByb2Nlc3MgPSBmdW5jdGlvbiAoKSB7IH1cblxuICAgIGlmIChoZWFkbGVzcykge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMocHJvY2Vzcywge1xuICAgICAgICBzdGRvdXQ6IHsgdmFsdWU6IHJlbW90ZS5wcm9jZXNzLnN0ZG91dCB9LFxuICAgICAgICBzdGRlcnI6IHsgdmFsdWU6IHJlbW90ZS5wcm9jZXNzLnN0ZGVyciB9XG4gICAgICB9KVxuXG4gICAgICBjb25zb2xlLmxvZyA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZCA9IHV0aWwuZm9ybWF0KC4uLmFyZ3MpXG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKGZvcm1hdHRlZCArICdcXG4nKVxuICAgICAgfVxuICAgICAgY29uc29sZS53YXJuID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVkID0gdXRpbC5mb3JtYXQoLi4uYXJncylcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoZm9ybWF0dGVkICsgJ1xcbicpXG4gICAgICB9XG4gICAgICBjb25zb2xlLmVycm9yID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVkID0gdXRpbC5mb3JtYXQoLi4uYXJncylcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoZm9ybWF0dGVkICsgJ1xcbicpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlbW90ZS5nZXRDdXJyZW50V2luZG93KCkuc2hvdygpXG4gICAgfVxuXG4gICAgY29uc3QgYmVuY2htYXJrUnVubmVyID0gcmVxdWlyZSgnLi4vYmVuY2htYXJrcy9iZW5jaG1hcmstcnVubmVyJylcbiAgICBjb25zdCBzdGF0dXNDb2RlID0gYXdhaXQgYmVuY2htYXJrUnVubmVyKHt0ZXN0LCBiZW5jaG1hcmtQYXRoc30pXG4gICAgaWYgKGhlYWRsZXNzKSB7XG4gICAgICBleGl0V2l0aFN0YXR1c0NvZGUoc3RhdHVzQ29kZSlcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGhlYWRsZXNzKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yLnN0YWNrIHx8IGVycm9yKVxuICAgICAgZXhpdFdpdGhTdGF0dXNDb2RlKDEpXG4gICAgfSBlbHNlIHtcbiAgICAgIGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICdvcGVuRGV2VG9vbHMnKVxuICAgICAgdGhyb3cgZXJyb3JcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZXhpdFdpdGhTdGF0dXNDb2RlIChzdGF0dXNDb2RlKSB7XG4gIHJlbW90ZS5hcHAuZW1pdCgnd2lsbC1xdWl0JylcbiAgcmVtb3RlLnByb2Nlc3MuZXhpdChzdGF0dXNDb2RlKVxufVxuIl19