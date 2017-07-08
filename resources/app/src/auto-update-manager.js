Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _eventKit = require('event-kit');

'use babel';

var AutoUpdateManager = (function () {
  function AutoUpdateManager(_ref) {
    var applicationDelegate = _ref.applicationDelegate;

    _classCallCheck(this, AutoUpdateManager);

    this.applicationDelegate = applicationDelegate;
    this.subscriptions = new _eventKit.CompositeDisposable();
    this.emitter = new _eventKit.Emitter();
  }

  _createClass(AutoUpdateManager, [{
    key: 'initialize',
    value: function initialize() {
      var _this = this;

      this.subscriptions.add(this.applicationDelegate.onDidBeginCheckingForUpdate(function () {
        _this.emitter.emit('did-begin-checking-for-update');
      }), this.applicationDelegate.onDidBeginDownloadingUpdate(function () {
        _this.emitter.emit('did-begin-downloading-update');
      }), this.applicationDelegate.onDidCompleteDownloadingUpdate(function (details) {
        _this.emitter.emit('did-complete-downloading-update', details);
      }), this.applicationDelegate.onUpdateNotAvailable(function () {
        _this.emitter.emit('update-not-available');
      }), this.applicationDelegate.onUpdateError(function () {
        _this.emitter.emit('update-error');
      }));
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.subscriptions.dispose();
      this.emitter.dispose();
    }
  }, {
    key: 'checkForUpdate',
    value: function checkForUpdate() {
      this.applicationDelegate.checkForUpdate();
    }
  }, {
    key: 'restartAndInstallUpdate',
    value: function restartAndInstallUpdate() {
      this.applicationDelegate.restartAndInstallUpdate();
    }
  }, {
    key: 'getState',
    value: function getState() {
      return this.applicationDelegate.getAutoUpdateManagerState();
    }
  }, {
    key: 'getErrorMessage',
    value: function getErrorMessage() {
      return this.applicationDelegate.getAutoUpdateManagerErrorMessage();
    }
  }, {
    key: 'platformSupportsUpdates',
    value: function platformSupportsUpdates() {
      return atom.getReleaseChannel() !== 'dev' && this.getState() !== 'unsupported';
    }
  }, {
    key: 'onDidBeginCheckingForUpdate',
    value: function onDidBeginCheckingForUpdate(callback) {
      return this.emitter.on('did-begin-checking-for-update', callback);
    }
  }, {
    key: 'onDidBeginDownloadingUpdate',
    value: function onDidBeginDownloadingUpdate(callback) {
      return this.emitter.on('did-begin-downloading-update', callback);
    }
  }, {
    key: 'onDidCompleteDownloadingUpdate',
    value: function onDidCompleteDownloadingUpdate(callback) {
      return this.emitter.on('did-complete-downloading-update', callback);
    }

    // TODO: When https://github.com/atom/electron/issues/4587 is closed, we can
    // add an update-available event.
    // onUpdateAvailable (callback) {
    //   return this.emitter.on('update-available', callback)
    // }

  }, {
    key: 'onUpdateNotAvailable',
    value: function onUpdateNotAvailable(callback) {
      return this.emitter.on('update-not-available', callback);
    }
  }, {
    key: 'onUpdateError',
    value: function onUpdateError(callback) {
      return this.emitter.on('update-error', callback);
    }
  }, {
    key: 'getPlatform',
    value: function getPlatform() {
      return process.platform;
    }
  }]);

  return AutoUpdateManager;
})();

exports['default'] = AutoUpdateManager;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9hdXRvLXVwZGF0ZS1tYW5hZ2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O3dCQUUyQyxXQUFXOztBQUZ0RCxXQUFXLENBQUE7O0lBSVUsaUJBQWlCO0FBQ3hCLFdBRE8saUJBQWlCLENBQ3ZCLElBQXFCLEVBQUU7UUFBdEIsbUJBQW1CLEdBQXBCLElBQXFCLENBQXBCLG1CQUFtQjs7MEJBRGQsaUJBQWlCOztBQUVsQyxRQUFJLENBQUMsbUJBQW1CLEdBQUcsbUJBQW1CLENBQUE7QUFDOUMsUUFBSSxDQUFDLGFBQWEsR0FBRyxtQ0FBeUIsQ0FBQTtBQUM5QyxRQUFJLENBQUMsT0FBTyxHQUFHLHVCQUFhLENBQUE7R0FDN0I7O2VBTGtCLGlCQUFpQjs7V0FPekIsc0JBQUc7OztBQUNaLFVBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUNwQixJQUFJLENBQUMsbUJBQW1CLENBQUMsMkJBQTJCLENBQUMsWUFBTTtBQUN6RCxjQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsQ0FBQTtPQUNuRCxDQUFDLEVBQ0YsSUFBSSxDQUFDLG1CQUFtQixDQUFDLDJCQUEyQixDQUFDLFlBQU07QUFDekQsY0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUE7T0FDbEQsQ0FBQyxFQUNGLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyw4QkFBOEIsQ0FBQyxVQUFDLE9BQU8sRUFBSztBQUNuRSxjQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEVBQUUsT0FBTyxDQUFDLENBQUE7T0FDOUQsQ0FBQyxFQUNGLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQyxZQUFNO0FBQ2xELGNBQUssT0FBTyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO09BQzFDLENBQUMsRUFDRixJQUFJLENBQUMsbUJBQW1CLENBQUMsYUFBYSxDQUFDLFlBQU07QUFDM0MsY0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO09BQ2xDLENBQUMsQ0FDSCxDQUFBO0tBQ0Y7OztXQUVPLG1CQUFHO0FBQ1QsVUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtBQUM1QixVQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO0tBQ3ZCOzs7V0FFYywwQkFBRztBQUNoQixVQUFJLENBQUMsbUJBQW1CLENBQUMsY0FBYyxFQUFFLENBQUE7S0FDMUM7OztXQUV1QixtQ0FBRztBQUN6QixVQUFJLENBQUMsbUJBQW1CLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtLQUNuRDs7O1dBRVEsb0JBQUc7QUFDVixhQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyx5QkFBeUIsRUFBRSxDQUFBO0tBQzVEOzs7V0FFZSwyQkFBRztBQUNqQixhQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQ0FBZ0MsRUFBRSxDQUFBO0tBQ25FOzs7V0FFdUIsbUNBQUc7QUFDekIsYUFBTyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLGFBQWEsQ0FBQTtLQUMvRTs7O1dBRTJCLHFDQUFDLFFBQVEsRUFBRTtBQUNyQyxhQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLCtCQUErQixFQUFFLFFBQVEsQ0FBQyxDQUFBO0tBQ2xFOzs7V0FFMkIscUNBQUMsUUFBUSxFQUFFO0FBQ3JDLGFBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsOEJBQThCLEVBQUUsUUFBUSxDQUFDLENBQUE7S0FDakU7OztXQUU4Qix3Q0FBQyxRQUFRLEVBQUU7QUFDeEMsYUFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxpQ0FBaUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtLQUNwRTs7Ozs7Ozs7OztXQVFvQiw4QkFBQyxRQUFRLEVBQUU7QUFDOUIsYUFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxzQkFBc0IsRUFBRSxRQUFRLENBQUMsQ0FBQTtLQUN6RDs7O1dBRWEsdUJBQUMsUUFBUSxFQUFFO0FBQ3ZCLGFBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0tBQ2pEOzs7V0FFVyx1QkFBRztBQUNiLGFBQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQTtLQUN4Qjs7O1NBaEZrQixpQkFBaUI7OztxQkFBakIsaUJBQWlCIiwiZmlsZSI6ImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9hdXRvLXVwZGF0ZS1tYW5hZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBiYWJlbCdcblxuaW1wb3J0IHtFbWl0dGVyLCBDb21wb3NpdGVEaXNwb3NhYmxlfSBmcm9tICdldmVudC1raXQnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEF1dG9VcGRhdGVNYW5hZ2VyIHtcbiAgY29uc3RydWN0b3IgKHthcHBsaWNhdGlvbkRlbGVnYXRlfSkge1xuICAgIHRoaXMuYXBwbGljYXRpb25EZWxlZ2F0ZSA9IGFwcGxpY2F0aW9uRGVsZWdhdGVcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpXG4gICAgdGhpcy5lbWl0dGVyID0gbmV3IEVtaXR0ZXIoKVxuICB9XG5cbiAgaW5pdGlhbGl6ZSAoKSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChcbiAgICAgIHRoaXMuYXBwbGljYXRpb25EZWxlZ2F0ZS5vbkRpZEJlZ2luQ2hlY2tpbmdGb3JVcGRhdGUoKCkgPT4ge1xuICAgICAgICB0aGlzLmVtaXR0ZXIuZW1pdCgnZGlkLWJlZ2luLWNoZWNraW5nLWZvci11cGRhdGUnKVxuICAgICAgfSksXG4gICAgICB0aGlzLmFwcGxpY2F0aW9uRGVsZWdhdGUub25EaWRCZWdpbkRvd25sb2FkaW5nVXBkYXRlKCgpID0+IHtcbiAgICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ2RpZC1iZWdpbi1kb3dubG9hZGluZy11cGRhdGUnKVxuICAgICAgfSksXG4gICAgICB0aGlzLmFwcGxpY2F0aW9uRGVsZWdhdGUub25EaWRDb21wbGV0ZURvd25sb2FkaW5nVXBkYXRlKChkZXRhaWxzKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdHRlci5lbWl0KCdkaWQtY29tcGxldGUtZG93bmxvYWRpbmctdXBkYXRlJywgZGV0YWlscylcbiAgICAgIH0pLFxuICAgICAgdGhpcy5hcHBsaWNhdGlvbkRlbGVnYXRlLm9uVXBkYXRlTm90QXZhaWxhYmxlKCgpID0+IHtcbiAgICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ3VwZGF0ZS1ub3QtYXZhaWxhYmxlJylcbiAgICAgIH0pLFxuICAgICAgdGhpcy5hcHBsaWNhdGlvbkRlbGVnYXRlLm9uVXBkYXRlRXJyb3IoKCkgPT4ge1xuICAgICAgICB0aGlzLmVtaXR0ZXIuZW1pdCgndXBkYXRlLWVycm9yJylcbiAgICAgIH0pXG4gICAgKVxuICB9XG5cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmRpc3Bvc2UoKVxuICAgIHRoaXMuZW1pdHRlci5kaXNwb3NlKClcbiAgfVxuXG4gIGNoZWNrRm9yVXBkYXRlICgpIHtcbiAgICB0aGlzLmFwcGxpY2F0aW9uRGVsZWdhdGUuY2hlY2tGb3JVcGRhdGUoKVxuICB9XG5cbiAgcmVzdGFydEFuZEluc3RhbGxVcGRhdGUgKCkge1xuICAgIHRoaXMuYXBwbGljYXRpb25EZWxlZ2F0ZS5yZXN0YXJ0QW5kSW5zdGFsbFVwZGF0ZSgpXG4gIH1cblxuICBnZXRTdGF0ZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuYXBwbGljYXRpb25EZWxlZ2F0ZS5nZXRBdXRvVXBkYXRlTWFuYWdlclN0YXRlKClcbiAgfVxuXG4gIGdldEVycm9yTWVzc2FnZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuYXBwbGljYXRpb25EZWxlZ2F0ZS5nZXRBdXRvVXBkYXRlTWFuYWdlckVycm9yTWVzc2FnZSgpXG4gIH1cblxuICBwbGF0Zm9ybVN1cHBvcnRzVXBkYXRlcyAoKSB7XG4gICAgcmV0dXJuIGF0b20uZ2V0UmVsZWFzZUNoYW5uZWwoKSAhPT0gJ2RldicgJiYgdGhpcy5nZXRTdGF0ZSgpICE9PSAndW5zdXBwb3J0ZWQnXG4gIH1cblxuICBvbkRpZEJlZ2luQ2hlY2tpbmdGb3JVcGRhdGUgKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdHRlci5vbignZGlkLWJlZ2luLWNoZWNraW5nLWZvci11cGRhdGUnLCBjYWxsYmFjaylcbiAgfVxuXG4gIG9uRGlkQmVnaW5Eb3dubG9hZGluZ1VwZGF0ZSAoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5lbWl0dGVyLm9uKCdkaWQtYmVnaW4tZG93bmxvYWRpbmctdXBkYXRlJywgY2FsbGJhY2spXG4gIH1cblxuICBvbkRpZENvbXBsZXRlRG93bmxvYWRpbmdVcGRhdGUgKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdHRlci5vbignZGlkLWNvbXBsZXRlLWRvd25sb2FkaW5nLXVwZGF0ZScsIGNhbGxiYWNrKVxuICB9XG5cbiAgLy8gVE9ETzogV2hlbiBodHRwczovL2dpdGh1Yi5jb20vYXRvbS9lbGVjdHJvbi9pc3N1ZXMvNDU4NyBpcyBjbG9zZWQsIHdlIGNhblxuICAvLyBhZGQgYW4gdXBkYXRlLWF2YWlsYWJsZSBldmVudC5cbiAgLy8gb25VcGRhdGVBdmFpbGFibGUgKGNhbGxiYWNrKSB7XG4gIC8vICAgcmV0dXJuIHRoaXMuZW1pdHRlci5vbigndXBkYXRlLWF2YWlsYWJsZScsIGNhbGxiYWNrKVxuICAvLyB9XG5cbiAgb25VcGRhdGVOb3RBdmFpbGFibGUgKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdHRlci5vbigndXBkYXRlLW5vdC1hdmFpbGFibGUnLCBjYWxsYmFjaylcbiAgfVxuXG4gIG9uVXBkYXRlRXJyb3IgKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdHRlci5vbigndXBkYXRlLWVycm9yJywgY2FsbGJhY2spXG4gIH1cblxuICBnZXRQbGF0Zm9ybSAoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MucGxhdGZvcm1cbiAgfVxufVxuIl19