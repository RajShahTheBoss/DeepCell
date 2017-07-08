Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _electron = require('electron');

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fsPlus = require('fs-plus');

var _fsPlus2 = _interopRequireDefault(_fsPlus);

'use babel';

var FileRecoveryService = (function () {
  function FileRecoveryService(recoveryDirectory) {
    _classCallCheck(this, FileRecoveryService);

    this.recoveryDirectory = recoveryDirectory;
    this.recoveryFilesByFilePath = new Map();
    this.recoveryFilesByWindow = new WeakMap();
    this.windowsByRecoveryFile = new Map();
  }

  _createClass(FileRecoveryService, [{
    key: 'willSavePath',
    value: function willSavePath(window, path) {
      if (!_fsPlus2['default'].existsSync(path)) return;

      var recoveryPath = _path2['default'].join(this.recoveryDirectory, RecoveryFile.fileNameForPath(path));
      var recoveryFile = this.recoveryFilesByFilePath.get(path) || new RecoveryFile(path, recoveryPath);

      try {
        recoveryFile.retain();
      } catch (err) {
        console.log('Couldn\'t retain ' + recoveryFile.recoveryPath + '. Code: ' + err.code + '. Message: ' + err.message);
        return;
      }

      if (!this.recoveryFilesByWindow.has(window)) {
        this.recoveryFilesByWindow.set(window, new Set());
      }
      if (!this.windowsByRecoveryFile.has(recoveryFile)) {
        this.windowsByRecoveryFile.set(recoveryFile, new Set());
      }

      this.recoveryFilesByWindow.get(window).add(recoveryFile);
      this.windowsByRecoveryFile.get(recoveryFile).add(window);
      this.recoveryFilesByFilePath.set(path, recoveryFile);
    }
  }, {
    key: 'didSavePath',
    value: function didSavePath(window, path) {
      var recoveryFile = this.recoveryFilesByFilePath.get(path);
      if (recoveryFile != null) {
        try {
          recoveryFile.release();
        } catch (err) {
          console.log('Couldn\'t release ' + recoveryFile.recoveryPath + '. Code: ' + err.code + '. Message: ' + err.message);
        }
        if (recoveryFile.isReleased()) this.recoveryFilesByFilePath['delete'](path);
        this.recoveryFilesByWindow.get(window)['delete'](recoveryFile);
        this.windowsByRecoveryFile.get(recoveryFile)['delete'](window);
      }
    }
  }, {
    key: 'didCrashWindow',
    value: function didCrashWindow(window) {
      if (!this.recoveryFilesByWindow.has(window)) return;

      for (var recoveryFile of this.recoveryFilesByWindow.get(window)) {
        try {
          recoveryFile.recoverSync();
        } catch (error) {
          var message = 'A file that Atom was saving could be corrupted';
          var detail = 'Error ' + error.code + '. There was a crash while saving "' + recoveryFile.originalPath + '", so this file might be blank or corrupted.\n' + ('Atom couldn\'t recover it automatically, but a recovery file has been saved at: "' + recoveryFile.recoveryPath + '".');
          console.log(detail);
          _electron.dialog.showMessageBox(window.browserWindow, { type: 'info', buttons: ['OK'], message: message, detail: detail });
        } finally {
          for (var _window of this.windowsByRecoveryFile.get(recoveryFile)) {
            this.recoveryFilesByWindow.get(_window)['delete'](recoveryFile);
          }
          this.windowsByRecoveryFile['delete'](recoveryFile);
          this.recoveryFilesByFilePath['delete'](recoveryFile.originalPath);
        }
      }
    }
  }, {
    key: 'didCloseWindow',
    value: function didCloseWindow(window) {
      if (!this.recoveryFilesByWindow.has(window)) return;

      for (var recoveryFile of this.recoveryFilesByWindow.get(window)) {
        this.windowsByRecoveryFile.get(recoveryFile)['delete'](window);
      }
      this.recoveryFilesByWindow['delete'](window);
    }
  }]);

  return FileRecoveryService;
})();

exports['default'] = FileRecoveryService;

var RecoveryFile = (function () {
  _createClass(RecoveryFile, null, [{
    key: 'fileNameForPath',
    value: function fileNameForPath(path) {
      var extension = _path2['default'].extname(path);
      var basename = _path2['default'].basename(path, extension).substring(0, 34);
      var randomSuffix = _crypto2['default'].randomBytes(3).toString('hex');
      return basename + '-' + randomSuffix + extension;
    }
  }]);

  function RecoveryFile(originalPath, recoveryPath) {
    _classCallCheck(this, RecoveryFile);

    this.originalPath = originalPath;
    this.recoveryPath = recoveryPath;
    this.refCount = 0;
  }

  _createClass(RecoveryFile, [{
    key: 'storeSync',
    value: function storeSync() {
      _fsPlus2['default'].copyFileSync(this.originalPath, this.recoveryPath);
    }
  }, {
    key: 'recoverSync',
    value: function recoverSync() {
      _fsPlus2['default'].copyFileSync(this.recoveryPath, this.originalPath);
      this.removeSync();
    }
  }, {
    key: 'removeSync',
    value: function removeSync() {
      _fsPlus2['default'].unlinkSync(this.recoveryPath);
    }
  }, {
    key: 'retain',
    value: function retain() {
      if (this.isReleased()) this.storeSync();
      this.refCount++;
    }
  }, {
    key: 'release',
    value: function release() {
      this.refCount--;
      if (this.isReleased()) this.removeSync();
    }
  }, {
    key: 'isReleased',
    value: function isReleased() {
      return this.refCount === 0;
    }
  }]);

  return RecoveryFile;
})();

module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9tYWluLXByb2Nlc3MvZmlsZS1yZWNvdmVyeS1zZXJ2aWNlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7d0JBRXFCLFVBQVU7O3NCQUNaLFFBQVE7Ozs7b0JBQ1YsTUFBTTs7OztzQkFDUixTQUFTOzs7O0FBTHhCLFdBQVcsQ0FBQTs7SUFPVSxtQkFBbUI7QUFDMUIsV0FETyxtQkFBbUIsQ0FDekIsaUJBQWlCLEVBQUU7MEJBRGIsbUJBQW1COztBQUVwQyxRQUFJLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUE7QUFDMUMsUUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7QUFDeEMsUUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksT0FBTyxFQUFFLENBQUE7QUFDMUMsUUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7R0FDdkM7O2VBTmtCLG1CQUFtQjs7V0FRekIsc0JBQUMsTUFBTSxFQUFFLElBQUksRUFBRTtBQUMxQixVQUFJLENBQUMsb0JBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU07O0FBRWhDLFVBQU0sWUFBWSxHQUFHLGtCQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0FBQzFGLFVBQU0sWUFBWSxHQUNoQixJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQTs7QUFFaEYsVUFBSTtBQUNGLG9CQUFZLENBQUMsTUFBTSxFQUFFLENBQUE7T0FDdEIsQ0FBQyxPQUFPLEdBQUcsRUFBRTtBQUNaLGVBQU8sQ0FBQyxHQUFHLHVCQUFvQixZQUFZLENBQUMsWUFBWSxnQkFBVyxHQUFHLENBQUMsSUFBSSxt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UUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUE7R0FDbEI7O2VBWkcsWUFBWTs7V0FjTixxQkFBRztBQUNYLDBCQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtLQUN0RDs7O1dBRVcsdUJBQUc7QUFDYiwwQkFBRyxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDckQsVUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO0tBQ2xCOzs7V0FFVSxzQkFBRztBQUNaLDBCQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7S0FDakM7OztXQUVNLGtCQUFHO0FBQ1IsVUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO0FBQ3ZDLFVBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtLQUNoQjs7O1dBRU8sbUJBQUc7QUFDVCxVQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7QUFDZixVQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7S0FDekM7OztXQUVVLHNCQUFHO0FBQ1osYUFBTyxJQUFJLENBQUMsUUFBUSxLQUFLLENBQUMsQ0FBQTtLQUMzQjs7O1NBdkNHLFlBQVkiLCJmaWxlIjoiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21haW4tcHJvY2Vzcy9maWxlLXJlY292ZXJ5LXNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIGJhYmVsJ1xuXG5pbXBvcnQge2RpYWxvZ30gZnJvbSAnZWxlY3Ryb24nXG5pbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0bydcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgZnMgZnJvbSAnZnMtcGx1cydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRmlsZVJlY292ZXJ5U2VydmljZSB7XG4gIGNvbnN0cnVjdG9yIChyZWNvdmVyeURpcmVjdG9yeSkge1xuICAgIHRoaXMucmVjb3ZlcnlEaXJlY3RvcnkgPSByZWNvdmVyeURpcmVjdG9yeVxuICAgIHRoaXMucmVjb3ZlcnlGaWxlc0J5RmlsZVBhdGggPSBuZXcgTWFwKClcbiAgICB0aGlzLnJlY292ZXJ5RmlsZXNCeVdpbmRvdyA9IG5ldyBXZWFrTWFwKClcbiAgICB0aGlzLndpbmRvd3NCeVJlY292ZXJ5RmlsZSA9IG5ldyBNYXAoKVxuICB9XG5cbiAgd2lsbFNhdmVQYXRoICh3aW5kb3csIHBhdGgpIHtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMocGF0aCkpIHJldHVyblxuXG4gICAgY29uc3QgcmVjb3ZlcnlQYXRoID0gUGF0aC5qb2luKHRoaXMucmVjb3ZlcnlEaXJlY3RvcnksIFJlY292ZXJ5RmlsZS5maWxlTmFtZUZvclBhdGgocGF0aCkpXG4gICAgY29uc3QgcmVjb3ZlcnlGaWxlID1cbiAgICAgIHRoaXMucmVjb3ZlcnlGaWxlc0J5RmlsZVBhdGguZ2V0KHBhdGgpIHx8IG5ldyBSZWNvdmVyeUZpbGUocGF0aCwgcmVjb3ZlcnlQYXRoKVxuXG4gICAgdHJ5IHtcbiAgICAgIHJlY292ZXJ5RmlsZS5yZXRhaW4oKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5sb2coYENvdWxkbid0IHJldGFpbiAke3JlY292ZXJ5RmlsZS5yZWNvdmVyeVBhdGh9LiBDb2RlOiAke2Vyci5jb2RlfS4gTWVzc2FnZTogJHtlcnIubWVzc2FnZX1gKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnJlY292ZXJ5RmlsZXNCeVdpbmRvdy5oYXMod2luZG93KSkge1xuICAgICAgdGhpcy5yZWNvdmVyeUZpbGVzQnlXaW5kb3cuc2V0KHdpbmRvdywgbmV3IFNldCgpKVxuICAgIH1cbiAgICBpZiAoIXRoaXMud2luZG93c0J5UmVjb3ZlcnlGaWxlLmhhcyhyZWNvdmVyeUZpbGUpKSB7XG4gICAgICB0aGlzLndpbmRvd3NCeVJlY292ZXJ5RmlsZS5zZXQocmVjb3ZlcnlGaWxlLCBuZXcgU2V0KCkpXG4gICAgfVxuXG4gICAgdGhpcy5yZWNvdmVyeUZpbGVzQnlXaW5kb3cuZ2V0KHdpbmRvdykuYWRkKHJlY292ZXJ5RmlsZSlcbiAgICB0aGlzLndpbmRvd3NCeVJlY292ZXJ5RmlsZS5nZXQocmVjb3ZlcnlGaWxlKS5hZGQod2luZG93KVxuICAgIHRoaXMucmVjb3ZlcnlGaWxlc0J5RmlsZVBhdGguc2V0KHBhdGgsIHJlY292ZXJ5RmlsZSlcbiAgfVxuXG4gIGRpZFNhdmVQYXRoICh3aW5kb3csIHBhdGgpIHtcbiAgICBjb25zdCByZWNvdmVyeUZpbGUgPSB0aGlzLnJlY292ZXJ5RmlsZXNCeUZpbGVQYXRoLmdldChwYXRoKVxuICAgIGlmIChyZWNvdmVyeUZpbGUgIT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVjb3ZlcnlGaWxlLnJlbGVhc2UoKVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBDb3VsZG4ndCByZWxlYXNlICR7cmVjb3ZlcnlGaWxlLnJlY292ZXJ5UGF0aH0uIENvZGU6ICR7ZXJyLmNvZGV9LiBNZXNzYWdlOiAke2Vyci5tZXNzYWdlfWApXG4gICAgICB9XG4gICAgICBpZiAocmVjb3ZlcnlGaWxlLmlzUmVsZWFzZWQoKSkgdGhpcy5yZWNvdmVyeUZpbGVzQnlGaWxlUGF0aC5kZWxldGUocGF0aClcbiAgICAgIHRoaXMucmVjb3ZlcnlGaWxlc0J5V2luZG93LmdldCh3aW5kb3cpLmRlbGV0ZShyZWNvdmVyeUZpbGUpXG4gICAgICB0aGlzLndpbmRvd3NCeVJlY292ZXJ5RmlsZS5nZXQocmVjb3ZlcnlGaWxlKS5kZWxldGUod2luZG93KVxuICAgIH1cbiAgfVxuXG4gIGRpZENyYXNoV2luZG93ICh3aW5kb3cpIHtcbiAgICBpZiAoIXRoaXMucmVjb3ZlcnlGaWxlc0J5V2luZG93Lmhhcyh3aW5kb3cpKSByZXR1cm5cblxuICAgIGZvciAoY29uc3QgcmVjb3ZlcnlGaWxlIG9mIHRoaXMucmVjb3ZlcnlGaWxlc0J5V2luZG93LmdldCh3aW5kb3cpKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZWNvdmVyeUZpbGUucmVjb3ZlclN5bmMoKVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9ICdBIGZpbGUgdGhhdCBBdG9tIHdhcyBzYXZpbmcgY291bGQgYmUgY29ycnVwdGVkJ1xuICAgICAgICBjb25zdCBkZXRhaWwgPVxuICAgICAgICAgIGBFcnJvciAke2Vycm9yLmNvZGV9LiBUaGVyZSB3YXMgYSBjcmFzaCB3aGlsZSBzYXZpbmcgXCIke3JlY292ZXJ5RmlsZS5vcmlnaW5hbFBhdGh9XCIsIHNvIHRoaXMgZmlsZSBtaWdodCBiZSBibGFuayBvciBjb3JydXB0ZWQuXFxuYCArXG4gICAgICAgICAgYEF0b20gY291bGRuJ3QgcmVjb3ZlciBpdCBhdXRvbWF0aWNhbGx5LCBidXQgYSByZWNvdmVyeSBmaWxlIGhhcyBiZWVuIHNhdmVkIGF0OiBcIiR7cmVjb3ZlcnlGaWxlLnJlY292ZXJ5UGF0aH1cIi5gXG4gICAgICAgIGNvbnNvbGUubG9nKGRldGFpbClcbiAgICAgICAgZGlhbG9nLnNob3dNZXNzYWdlQm94KHdpbmRvdy5icm93c2VyV2luZG93LCB7dHlwZTogJ2luZm8nLCBidXR0b25zOiBbJ09LJ10sIG1lc3NhZ2UsIGRldGFpbH0pXG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBmb3IgKGxldCB3aW5kb3cgb2YgdGhpcy53aW5kb3dzQnlSZWNvdmVyeUZpbGUuZ2V0KHJlY292ZXJ5RmlsZSkpIHtcbiAgICAgICAgICB0aGlzLnJlY292ZXJ5RmlsZXNCeVdpbmRvdy5nZXQod2luZG93KS5kZWxldGUocmVjb3ZlcnlGaWxlKVxuICAgICAgICB9XG4gICAgICAgIHRoaXMud2luZG93c0J5UmVjb3ZlcnlGaWxlLmRlbGV0ZShyZWNvdmVyeUZpbGUpXG4gICAgICAgIHRoaXMucmVjb3ZlcnlGaWxlc0J5RmlsZVBhdGguZGVsZXRlKHJlY292ZXJ5RmlsZS5vcmlnaW5hbFBhdGgpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZGlkQ2xvc2VXaW5kb3cgKHdpbmRvdykge1xuICAgIGlmICghdGhpcy5yZWNvdmVyeUZpbGVzQnlXaW5kb3cuaGFzKHdpbmRvdykpIHJldHVyblxuXG4gICAgZm9yIChsZXQgcmVjb3ZlcnlGaWxlIG9mIHRoaXMucmVjb3ZlcnlGaWxlc0J5V2luZG93LmdldCh3aW5kb3cpKSB7XG4gICAgICB0aGlzLndpbmRvd3NCeVJlY292ZXJ5RmlsZS5nZXQocmVjb3ZlcnlGaWxlKS5kZWxldGUod2luZG93KVxuICAgIH1cbiAgICB0aGlzLnJlY292ZXJ5RmlsZXNCeVdpbmRvdy5kZWxldGUod2luZG93KVxuICB9XG59XG5cbmNsYXNzIFJlY292ZXJ5RmlsZSB7XG4gIHN0YXRpYyBmaWxlTmFtZUZvclBhdGggKHBhdGgpIHtcbiAgICBjb25zdCBleHRlbnNpb24gPSBQYXRoLmV4dG5hbWUocGF0aClcbiAgICBjb25zdCBiYXNlbmFtZSA9IFBhdGguYmFzZW5hbWUocGF0aCwgZXh0ZW5zaW9uKS5zdWJzdHJpbmcoMCwgMzQpXG4gICAgY29uc3QgcmFuZG9tU3VmZml4ID0gY3J5cHRvLnJhbmRvbUJ5dGVzKDMpLnRvU3RyaW5nKCdoZXgnKVxuICAgIHJldHVybiBgJHtiYXNlbmFtZX0tJHtyYW5kb21TdWZmaXh9JHtleHRlbnNpb259YFxuICB9XG5cbiAgY29uc3RydWN0b3IgKG9yaWdpbmFsUGF0aCwgcmVjb3ZlcnlQYXRoKSB7XG4gICAgdGhpcy5vcmlnaW5hbFBhdGggPSBvcmlnaW5hbFBhdGhcbiAgICB0aGlzLnJlY292ZXJ5UGF0aCA9IHJlY292ZXJ5UGF0aFxuICAgIHRoaXMucmVmQ291bnQgPSAwXG4gIH1cblxuICBzdG9yZVN5bmMgKCkge1xuICAgIGZzLmNvcHlGaWxlU3luYyh0aGlzLm9yaWdpbmFsUGF0aCwgdGhpcy5yZWNvdmVyeVBhdGgpXG4gIH1cblxuICByZWNvdmVyU3luYyAoKSB7XG4gICAgZnMuY29weUZpbGVTeW5jKHRoaXMucmVjb3ZlcnlQYXRoLCB0aGlzLm9yaWdpbmFsUGF0aClcbiAgICB0aGlzLnJlbW92ZVN5bmMoKVxuICB9XG5cbiAgcmVtb3ZlU3luYyAoKSB7XG4gICAgZnMudW5saW5rU3luYyh0aGlzLnJlY292ZXJ5UGF0aClcbiAgfVxuXG4gIHJldGFpbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNSZWxlYXNlZCgpKSB0aGlzLnN0b3JlU3luYygpXG4gICAgdGhpcy5yZWZDb3VudCsrXG4gIH1cblxuICByZWxlYXNlICgpIHtcbiAgICB0aGlzLnJlZkNvdW50LS1cbiAgICBpZiAodGhpcy5pc1JlbGVhc2VkKCkpIHRoaXMucmVtb3ZlU3luYygpXG4gIH1cblxuICBpc1JlbGVhc2VkICgpIHtcbiAgICByZXR1cm4gdGhpcy5yZWZDb3VudCA9PT0gMFxuICB9XG59XG4iXX0=