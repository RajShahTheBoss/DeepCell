Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/** @babel */

var _textBuffer = require('text-buffer');

var _textBuffer2 = _interopRequireDefault(_textBuffer);

var _pathwatcher = require('pathwatcher');

var _eventKit = require('event-kit');

var _srcBufferedNodeProcess = require('../src/buffered-node-process');

var _srcBufferedNodeProcess2 = _interopRequireDefault(_srcBufferedNodeProcess);

var _srcBufferedProcess = require('../src/buffered-process');

var _srcBufferedProcess2 = _interopRequireDefault(_srcBufferedProcess);

var _srcGitRepository = require('../src/git-repository');

var _srcGitRepository2 = _interopRequireDefault(_srcGitRepository);

var _srcNotification = require('../src/notification');

var _srcNotification2 = _interopRequireDefault(_srcNotification);

var atomExport = {
  BufferedNodeProcess: _srcBufferedNodeProcess2['default'],
  BufferedProcess: _srcBufferedProcess2['default'],
  GitRepository: _srcGitRepository2['default'],
  Notification: _srcNotification2['default'],
  TextBuffer: _textBuffer2['default'],
  Point: _textBuffer.Point,
  Range: _textBuffer.Range,
  File: _pathwatcher.File,
  Directory: _pathwatcher.Directory,
  Emitter: _eventKit.Emitter,
  Disposable: _eventKit.Disposable,
  CompositeDisposable: _eventKit.CompositeDisposable
};

// Shell integration is required by both Squirrel and Settings-View
if (process.platform === 'win32') {
  Object.defineProperty(atomExport, 'WinShell', {
    enumerable: true,
    get: function get() {
      return require('../src/main-process/win-shell');
    }
  });
}

// The following classes can't be used from a Task handler and should therefore
// only be exported when not running as a child node process
if (process.type === 'renderer') {
  atomExport.Task = require('../src/task');
  atomExport.TextEditor = require('../src/text-editor');
}

exports['default'] = atomExport;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL2V4cG9ydHMvYXRvbS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OzswQkFFdUMsYUFBYTs7OzsyQkFDdEIsYUFBYTs7d0JBQ1ksV0FBVzs7c0NBQ2xDLDhCQUE4Qjs7OztrQ0FDbEMseUJBQXlCOzs7O2dDQUMzQix1QkFBdUI7Ozs7K0JBQ3hCLHFCQUFxQjs7OztBQUU5QyxJQUFNLFVBQVUsR0FBRztBQUNqQixxQkFBbUIscUNBQUE7QUFDbkIsaUJBQWUsaUNBQUE7QUFDZixlQUFhLCtCQUFBO0FBQ2IsY0FBWSw4QkFBQTtBQUNaLFlBQVUseUJBQUE7QUFDVixPQUFLLG1CQUFBO0FBQ0wsT0FBSyxtQkFBQTtBQUNMLE1BQUksbUJBQUE7QUFDSixXQUFTLHdCQUFBO0FBQ1QsU0FBTyxtQkFBQTtBQUNQLFlBQVUsc0JBQUE7QUFDVixxQkFBbUIsK0JBQUE7Q0FDcEIsQ0FBQTs7O0FBR0QsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRTtBQUNoQyxRQUFNLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUU7QUFDNUMsY0FBVSxFQUFFLElBQUk7QUFDaEIsT0FBRyxFQUFDLGVBQUc7QUFDTCxhQUFPLE9BQU8sQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO0tBQ2hEO0dBQ0YsQ0FBQyxDQUFBO0NBQ0g7Ozs7QUFJRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFO0FBQy9CLFlBQVUsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0FBQ3hDLFlBQVUsQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUE7Q0FDdEQ7O3FCQUVjLFVBQVUiLCJmaWxlIjoiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvZXhwb3J0cy9hdG9tLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqIEBiYWJlbCAqL1xuXG5pbXBvcnQgVGV4dEJ1ZmZlciwge1BvaW50LCBSYW5nZX0gZnJvbSAndGV4dC1idWZmZXInXG5pbXBvcnQge0ZpbGUsIERpcmVjdG9yeX0gZnJvbSAncGF0aHdhdGNoZXInXG5pbXBvcnQge0VtaXR0ZXIsIERpc3Bvc2FibGUsIENvbXBvc2l0ZURpc3Bvc2FibGV9IGZyb20gJ2V2ZW50LWtpdCdcbmltcG9ydCBCdWZmZXJlZE5vZGVQcm9jZXNzIGZyb20gJy4uL3NyYy9idWZmZXJlZC1ub2RlLXByb2Nlc3MnXG5pbXBvcnQgQnVmZmVyZWRQcm9jZXNzIGZyb20gJy4uL3NyYy9idWZmZXJlZC1wcm9jZXNzJ1xuaW1wb3J0IEdpdFJlcG9zaXRvcnkgZnJvbSAnLi4vc3JjL2dpdC1yZXBvc2l0b3J5J1xuaW1wb3J0IE5vdGlmaWNhdGlvbiBmcm9tICcuLi9zcmMvbm90aWZpY2F0aW9uJ1xuXG5jb25zdCBhdG9tRXhwb3J0ID0ge1xuICBCdWZmZXJlZE5vZGVQcm9jZXNzLFxuICBCdWZmZXJlZFByb2Nlc3MsXG4gIEdpdFJlcG9zaXRvcnksXG4gIE5vdGlmaWNhdGlvbixcbiAgVGV4dEJ1ZmZlcixcbiAgUG9pbnQsXG4gIFJhbmdlLFxuICBGaWxlLFxuICBEaXJlY3RvcnksXG4gIEVtaXR0ZXIsXG4gIERpc3Bvc2FibGUsXG4gIENvbXBvc2l0ZURpc3Bvc2FibGVcbn1cblxuLy8gU2hlbGwgaW50ZWdyYXRpb24gaXMgcmVxdWlyZWQgYnkgYm90aCBTcXVpcnJlbCBhbmQgU2V0dGluZ3MtVmlld1xuaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGF0b21FeHBvcnQsICdXaW5TaGVsbCcsIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGdldCAoKSB7XG4gICAgICByZXR1cm4gcmVxdWlyZSgnLi4vc3JjL21haW4tcHJvY2Vzcy93aW4tc2hlbGwnKVxuICAgIH1cbiAgfSlcbn1cblxuLy8gVGhlIGZvbGxvd2luZyBjbGFzc2VzIGNhbid0IGJlIHVzZWQgZnJvbSBhIFRhc2sgaGFuZGxlciBhbmQgc2hvdWxkIHRoZXJlZm9yZVxuLy8gb25seSBiZSBleHBvcnRlZCB3aGVuIG5vdCBydW5uaW5nIGFzIGEgY2hpbGQgbm9kZSBwcm9jZXNzXG5pZiAocHJvY2Vzcy50eXBlID09PSAncmVuZGVyZXInKSB7XG4gIGF0b21FeHBvcnQuVGFzayA9IHJlcXVpcmUoJy4uL3NyYy90YXNrJylcbiAgYXRvbUV4cG9ydC5UZXh0RWRpdG9yID0gcmVxdWlyZSgnLi4vc3JjL3RleHQtZWRpdG9yJylcbn1cblxuZXhwb3J0IGRlZmF1bHQgYXRvbUV4cG9ydFxuIl19