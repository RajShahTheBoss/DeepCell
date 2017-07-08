(function() {
  var AutoUpdateManager, CheckingState, DownloadingState, ErrorState, EventEmitter, IdleState, NoUpdateAvailableState, UnsupportedState, UpdateAvailableState, autoUpdater, path,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  autoUpdater = null;

  EventEmitter = require('events').EventEmitter;

  path = require('path');

  IdleState = 'idle';

  CheckingState = 'checking';

  DownloadingState = 'downloading';

  UpdateAvailableState = 'update-available';

  NoUpdateAvailableState = 'no-update-available';

  UnsupportedState = 'unsupported';

  ErrorState = 'error';

  module.exports = AutoUpdateManager = (function() {
    Object.assign(AutoUpdateManager.prototype, EventEmitter.prototype);

    function AutoUpdateManager(version, testMode, config) {
      this.version = version;
      this.testMode = testMode;
      this.config = config;
      this.onUpdateError = bind(this.onUpdateError, this);
      this.onUpdateNotAvailable = bind(this.onUpdateNotAvailable, this);
      this.state = IdleState;
      this.iconPath = path.resolve(__dirname, '..', '..', 'resources', 'atom.png');
    }

    AutoUpdateManager.prototype.initialize = function() {
      var archSuffix;
      if (process.platform === 'win32') {
        archSuffix = process.arch === 'ia32' ? '' : '-' + process.arch;
        this.feedUrl = "https://atom.io/api/updates" + archSuffix + "?version=" + this.version;
        autoUpdater = require('./auto-updater-win32');
      } else {
        this.feedUrl = "https://atom.io/api/updates?version=" + this.version;
        autoUpdater = require('electron').autoUpdater;
      }
      autoUpdater.on('error', (function(_this) {
        return function(event, message) {
          _this.setState(ErrorState, message);
          _this.emitWindowEvent('update-error');
          return console.error("Error Downloading Update: " + message);
        };
      })(this));
      autoUpdater.setFeedURL(this.feedUrl);
      autoUpdater.on('checking-for-update', (function(_this) {
        return function() {
          _this.setState(CheckingState);
          return _this.emitWindowEvent('checking-for-update');
        };
      })(this));
      autoUpdater.on('update-not-available', (function(_this) {
        return function() {
          _this.setState(NoUpdateAvailableState);
          return _this.emitWindowEvent('update-not-available');
        };
      })(this));
      autoUpdater.on('update-available', (function(_this) {
        return function() {
          _this.setState(DownloadingState);
          _this.emitWindowEvent('did-begin-downloading-update');
          return _this.emit('did-begin-download');
        };
      })(this));
      autoUpdater.on('update-downloaded', (function(_this) {
        return function(event, releaseNotes, releaseVersion) {
          _this.releaseVersion = releaseVersion;
          _this.setState(UpdateAvailableState);
          return _this.emitUpdateAvailableEvent();
        };
      })(this));
      this.config.onDidChange('core.automaticallyUpdate', (function(_this) {
        return function(arg) {
          var newValue;
          newValue = arg.newValue;
          if (newValue) {
            return _this.scheduleUpdateCheck();
          } else {
            return _this.cancelScheduledUpdateCheck();
          }
        };
      })(this));
      if (this.config.get('core.automaticallyUpdate')) {
        this.scheduleUpdateCheck();
      }
      switch (process.platform) {
        case 'win32':
          if (!autoUpdater.supportsUpdates()) {
            return this.setState(UnsupportedState);
          }
          break;
        case 'linux':
          return this.setState(UnsupportedState);
      }
    };

    AutoUpdateManager.prototype.emitUpdateAvailableEvent = function() {
      if (this.releaseVersion == null) {
        return;
      }
      this.emitWindowEvent('update-available', {
        releaseVersion: this.releaseVersion
      });
    };

    AutoUpdateManager.prototype.emitWindowEvent = function(eventName, payload) {
      var atomWindow, i, len, ref;
      ref = this.getWindows();
      for (i = 0, len = ref.length; i < len; i++) {
        atomWindow = ref[i];
        atomWindow.sendMessage(eventName, payload);
      }
    };

    AutoUpdateManager.prototype.setState = function(state, errorMessage) {
      if (this.state === state) {
        return;
      }
      this.state = state;
      this.errorMessage = errorMessage;
      return this.emit('state-changed', this.state);
    };

    AutoUpdateManager.prototype.getState = function() {
      return this.state;
    };

    AutoUpdateManager.prototype.getErrorMessage = function() {
      return this.errorMessage;
    };

    AutoUpdateManager.prototype.scheduleUpdateCheck = function() {
      var checkForUpdates, fourHours;
      if (!(/\w{7}/.test(this.version) || this.checkForUpdatesIntervalID)) {
        checkForUpdates = (function(_this) {
          return function() {
            return _this.check({
              hidePopups: true
            });
          };
        })(this);
        fourHours = 1000 * 60 * 60 * 4;
        this.checkForUpdatesIntervalID = setInterval(checkForUpdates, fourHours);
        return checkForUpdates();
      }
    };

    AutoUpdateManager.prototype.cancelScheduledUpdateCheck = function() {
      if (this.checkForUpdatesIntervalID) {
        clearInterval(this.checkForUpdatesIntervalID);
        return this.checkForUpdatesIntervalID = null;
      }
    };

    AutoUpdateManager.prototype.check = function(arg) {
      var hidePopups;
      hidePopups = (arg != null ? arg : {}).hidePopups;
      if (!hidePopups) {
        autoUpdater.once('update-not-available', this.onUpdateNotAvailable);
        autoUpdater.once('error', this.onUpdateError);
      }
      if (!this.testMode) {
        return autoUpdater.checkForUpdates();
      }
    };

    AutoUpdateManager.prototype.install = function() {
      if (!this.testMode) {
        return autoUpdater.quitAndInstall();
      }
    };

    AutoUpdateManager.prototype.onUpdateNotAvailable = function() {
      var dialog;
      autoUpdater.removeListener('error', this.onUpdateError);
      dialog = require('electron').dialog;
      return dialog.showMessageBox({
        type: 'info',
        buttons: ['OK'],
        icon: this.iconPath,
        message: 'No update available.',
        title: 'No Update Available',
        detail: "Version " + this.version + " is the latest version."
      });
    };

    AutoUpdateManager.prototype.onUpdateError = function(event, message) {
      var dialog;
      autoUpdater.removeListener('update-not-available', this.onUpdateNotAvailable);
      dialog = require('electron').dialog;
      return dialog.showMessageBox({
        type: 'warning',
        buttons: ['OK'],
        icon: this.iconPath,
        message: 'There was an error checking for updates.',
        title: 'Update Error',
        detail: message
      });
    };

    AutoUpdateManager.prototype.getWindows = function() {
      return global.atomApplication.windows;
    };

    return AutoUpdateManager;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21haW4tcHJvY2Vzcy9hdXRvLXVwZGF0ZS1tYW5hZ2VyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsMEtBQUE7SUFBQTs7RUFBQSxXQUFBLEdBQWM7O0VBQ2IsZUFBZ0IsT0FBQSxDQUFRLFFBQVI7O0VBQ2pCLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFFUCxTQUFBLEdBQVk7O0VBQ1osYUFBQSxHQUFnQjs7RUFDaEIsZ0JBQUEsR0FBbUI7O0VBQ25CLG9CQUFBLEdBQXVCOztFQUN2QixzQkFBQSxHQUF5Qjs7RUFDekIsZ0JBQUEsR0FBbUI7O0VBQ25CLFVBQUEsR0FBYTs7RUFFYixNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ0osTUFBTSxDQUFDLE1BQVAsQ0FBYyxpQkFBQyxDQUFBLFNBQWYsRUFBMEIsWUFBWSxDQUFDLFNBQXZDOztJQUVhLDJCQUFDLE9BQUQsRUFBVyxRQUFYLEVBQXNCLE1BQXRCO01BQUMsSUFBQyxDQUFBLFVBQUQ7TUFBVSxJQUFDLENBQUEsV0FBRDtNQUFXLElBQUMsQ0FBQSxTQUFEOzs7TUFDakMsSUFBQyxDQUFBLEtBQUQsR0FBUztNQUNULElBQUMsQ0FBQSxRQUFELEdBQVksSUFBSSxDQUFDLE9BQUwsQ0FBYSxTQUFiLEVBQXdCLElBQXhCLEVBQThCLElBQTlCLEVBQW9DLFdBQXBDLEVBQWlELFVBQWpEO0lBRkQ7O2dDQUliLFVBQUEsR0FBWSxTQUFBO0FBQ1YsVUFBQTtNQUFBLElBQUcsT0FBTyxDQUFDLFFBQVIsS0FBb0IsT0FBdkI7UUFDRSxVQUFBLEdBQWdCLE9BQU8sQ0FBQyxJQUFSLEtBQWdCLE1BQW5CLEdBQStCLEVBQS9CLEdBQXVDLEdBQUEsR0FBTSxPQUFPLENBQUM7UUFDbEUsSUFBQyxDQUFBLE9BQUQsR0FBVyw2QkFBQSxHQUE4QixVQUE5QixHQUF5QyxX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QUFBLEVBQVMsMENBSFQ7UUFJQSxLQUFBLEVBQU8sY0FKUDtRQUtBLE1BQUEsRUFBUSxPQUxSO09BREY7SUFIYTs7Z0NBV2YsVUFBQSxHQUFZLFNBQUE7YUFDVixNQUFNLENBQUMsZUFBZSxDQUFDO0lBRGI7Ozs7O0FBM0lkIiwic291cmNlc0NvbnRlbnQiOlsiYXV0b1VwZGF0ZXIgPSBudWxsXG57RXZlbnRFbWl0dGVyfSA9IHJlcXVpcmUgJ2V2ZW50cydcbnBhdGggPSByZXF1aXJlICdwYXRoJ1xuXG5JZGxlU3RhdGUgPSAnaWRsZSdcbkNoZWNraW5nU3RhdGUgPSAnY2hlY2tpbmcnXG5Eb3dubG9hZGluZ1N0YXRlID0gJ2Rvd25sb2FkaW5nJ1xuVXBkYXRlQXZhaWxhYmxlU3RhdGUgPSAndXBkYXRlLWF2YWlsYWJsZSdcbk5vVXBkYXRlQXZhaWxhYmxlU3RhdGUgPSAnbm8tdXBkYXRlLWF2YWlsYWJsZSdcblVuc3VwcG9ydGVkU3RhdGUgPSAndW5zdXBwb3J0ZWQnXG5FcnJvclN0YXRlID0gJ2Vycm9yJ1xuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBBdXRvVXBkYXRlTWFuYWdlclxuICBPYmplY3QuYXNzaWduIEBwcm90b3R5cGUsIEV2ZW50RW1pdHRlci5wcm90b3R5cGVcblxuICBjb25zdHJ1Y3RvcjogKEB2ZXJzaW9uLCBAdGVzdE1vZGUsIEBjb25maWcpIC0+XG4gICAgQHN0YXRlID0gSWRsZVN0YXRlXG4gICAgQGljb25QYXRoID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ3Jlc291cmNlcycsICdhdG9tLnBuZycpXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBpZiBwcm9jZXNzLnBsYXRmb3JtIGlzICd3aW4zMidcbiAgICAgIGFyY2hTdWZmaXggPSBpZiBwcm9jZXNzLmFyY2ggaXMgJ2lhMzInIHRoZW4gJycgZWxzZSAnLScgKyBwcm9jZXNzLmFyY2hcbiAgICAgIEBmZWVkVXJsID0gXCJodHRwczovL2F0b20uaW8vYXBpL3VwZGF0ZXMje2FyY2hTdWZmaXh9P3ZlcnNpb249I3tAdmVyc2lvbn1cIlxuICAgICAgYXV0b1VwZGF0ZXIgPSByZXF1aXJlICcuL2F1dG8tdXBkYXRlci13aW4zMidcbiAgICBlbHNlXG4gICAgICBAZmVlZFVybCA9IFwiaHR0cHM6Ly9hdG9tLmlvL2FwaS91cGRhdGVzP3ZlcnNpb249I3tAdmVyc2lvbn1cIlxuICAgICAge2F1dG9VcGRhdGVyfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuXG4gICAgYXV0b1VwZGF0ZXIub24gJ2Vycm9yJywgKGV2ZW50LCBtZXNzYWdlKSA9PlxuICAgICAgQHNldFN0YXRlKEVycm9yU3RhdGUsIG1lc3NhZ2UpXG4gICAgICBAZW1pdFdpbmRvd0V2ZW50KCd1cGRhdGUtZXJyb3InKVxuICAgICAgY29uc29sZS5lcnJvciBcIkVycm9yIERvd25sb2FkaW5nIFVwZGF0ZTogI3ttZXNzYWdlfVwiXG5cbiAgICBhdXRvVXBkYXRlci5zZXRGZWVkVVJMIEBmZWVkVXJsXG5cbiAgICBhdXRvVXBkYXRlci5vbiAnY2hlY2tpbmctZm9yLXVwZGF0ZScsID0+XG4gICAgICBAc2V0U3RhdGUoQ2hlY2tpbmdTdGF0ZSlcbiAgICAgIEBlbWl0V2luZG93RXZlbnQoJ2NoZWNraW5nLWZvci11cGRhdGUnKVxuXG4gICAgYXV0b1VwZGF0ZXIub24gJ3VwZGF0ZS1ub3QtYXZhaWxhYmxlJywgPT5cbiAgICAgIEBzZXRTdGF0ZShOb1VwZGF0ZUF2YWlsYWJsZVN0YXRlKVxuICAgICAgQGVtaXRXaW5kb3dFdmVudCgndXBkYXRlLW5vdC1hdmFpbGFibGUnKVxuXG4gICAgYXV0b1VwZGF0ZXIub24gJ3VwZGF0ZS1hdmFpbGFibGUnLCA9PlxuICAgICAgQHNldFN0YXRlKERvd25sb2FkaW5nU3RhdGUpXG4gICAgICAjIFdlIHVzZSBzZW5kTWVzc2FnZSB0byBzZW5kIGFuIGV2ZW50IGNhbGxlZCAndXBkYXRlLWF2YWlsYWJsZScgaW4gJ3VwZGF0ZS1kb3dubG9hZGVkJ1xuICAgICAgIyBvbmNlIHRoZSB1cGRhdGUgZG93bmxvYWQgaXMgY29tcGxldGUuIFRoaXMgbWlzbWF0Y2ggYmV0d2VlbiB0aGUgZWxlY3Ryb25cbiAgICAgICMgYXV0b1VwZGF0ZXIgZXZlbnRzIGlzIHVuZm9ydHVuYXRlIGJ1dCBpbiB0aGUgaW50ZXJlc3Qgb2Ygbm90IGNoYW5naW5nIHRoZVxuICAgICAgIyBvbmUgZXhpc3RpbmcgZXZlbnQgaGFuZGxlZCBieSBhcHBsaWNhdGlvbkRlbGVnYXRlXG4gICAgICBAZW1pdFdpbmRvd0V2ZW50KCdkaWQtYmVnaW4tZG93bmxvYWRpbmctdXBkYXRlJylcbiAgICAgIEBlbWl0KCdkaWQtYmVnaW4tZG93bmxvYWQnKVxuXG4gICAgYXV0b1VwZGF0ZXIub24gJ3VwZGF0ZS1kb3dubG9hZGVkJywgKGV2ZW50LCByZWxlYXNlTm90ZXMsIEByZWxlYXNlVmVyc2lvbikgPT5cbiAgICAgIEBzZXRTdGF0ZShVcGRhdGVBdmFpbGFibGVTdGF0ZSlcbiAgICAgIEBlbWl0VXBkYXRlQXZhaWxhYmxlRXZlbnQoKVxuXG4gICAgQGNvbmZpZy5vbkRpZENoYW5nZSAnY29yZS5hdXRvbWF0aWNhbGx5VXBkYXRlJywgKHtuZXdWYWx1ZX0pID0+XG4gICAgICBpZiBuZXdWYWx1ZVxuICAgICAgICBAc2NoZWR1bGVVcGRhdGVDaGVjaygpXG4gICAgICBlbHNlXG4gICAgICAgIEBjYW5jZWxTY2hlZHVsZWRVcGRhdGVDaGVjaygpXG5cbiAgICBAc2NoZWR1bGVVcGRhdGVDaGVjaygpIGlmIEBjb25maWcuZ2V0ICdjb3JlLmF1dG9tYXRpY2FsbHlVcGRhdGUnXG5cbiAgICBzd2l0Y2ggcHJvY2Vzcy5wbGF0Zm9ybVxuICAgICAgd2hlbiAnd2luMzInXG4gICAgICAgIEBzZXRTdGF0ZShVbnN1cHBvcnRlZFN0YXRlKSB1bmxlc3MgYXV0b1VwZGF0ZXIuc3VwcG9ydHNVcGRhdGVzKClcbiAgICAgIHdoZW4gJ2xpbnV4J1xuICAgICAgICBAc2V0U3RhdGUoVW5zdXBwb3J0ZWRTdGF0ZSlcblxuICBlbWl0VXBkYXRlQXZhaWxhYmxlRXZlbnQ6IC0+XG4gICAgcmV0dXJuIHVubGVzcyBAcmVsZWFzZVZlcnNpb24/XG4gICAgQGVtaXRXaW5kb3dFdmVudCgndXBkYXRlLWF2YWlsYWJsZScsIHtAcmVsZWFzZVZlcnNpb259KVxuICAgIHJldHVyblxuXG4gIGVtaXRXaW5kb3dFdmVudDogKGV2ZW50TmFtZSwgcGF5bG9hZCkgLT5cbiAgICBmb3IgYXRvbVdpbmRvdyBpbiBAZ2V0V2luZG93cygpXG4gICAgICBhdG9tV2luZG93LnNlbmRNZXNzYWdlKGV2ZW50TmFtZSwgcGF5bG9hZClcbiAgICByZXR1cm5cblxuICBzZXRTdGF0ZTogKHN0YXRlLCBlcnJvck1lc3NhZ2UpIC0+XG4gICAgcmV0dXJuIGlmIEBzdGF0ZSBpcyBzdGF0ZVxuICAgIEBzdGF0ZSA9IHN0YXRlXG4gICAgQGVycm9yTWVzc2FnZSA9IGVycm9yTWVzc2FnZVxuICAgIEBlbWl0ICdzdGF0ZS1jaGFuZ2VkJywgQHN0YXRlXG5cbiAgZ2V0U3RhdGU6IC0+XG4gICAgQHN0YXRlXG5cbiAgZ2V0RXJyb3JNZXNzYWdlOiAtPlxuICAgIEBlcnJvck1lc3NhZ2VcblxuICBzY2hlZHVsZVVwZGF0ZUNoZWNrOiAtPlxuICAgICMgT25seSBzY2hlZHVsZSB1cGRhdGUgY2hlY2sgcGVyaW9kaWNhbGx5IGlmIHJ1bm5pbmcgaW4gcmVsZWFzZSB2ZXJzaW9uIGFuZFxuICAgICMgYW5kIHRoZXJlIGlzIG5vIGV4aXN0aW5nIHNjaGVkdWxlZCB1cGRhdGUgY2hlY2suXG4gICAgdW5sZXNzIC9cXHd7N30vLnRlc3QoQHZlcnNpb24pIG9yIEBjaGVja0ZvclVwZGF0ZXNJbnRlcnZhbElEXG4gICAgICBjaGVja0ZvclVwZGF0ZXMgPSA9PiBAY2hlY2soaGlkZVBvcHVwczogdHJ1ZSlcbiAgICAgIGZvdXJIb3VycyA9IDEwMDAgKiA2MCAqIDYwICogNFxuICAgICAgQGNoZWNrRm9yVXBkYXRlc0ludGVydmFsSUQgPSBzZXRJbnRlcnZhbChjaGVja0ZvclVwZGF0ZXMsIGZvdXJIb3VycylcbiAgICAgIGNoZWNrRm9yVXBkYXRlcygpXG5cbiAgY2FuY2VsU2NoZWR1bGVkVXBkYXRlQ2hlY2s6IC0+XG4gICAgaWYgQGNoZWNrRm9yVXBkYXRlc0ludGVydmFsSURcbiAgICAgIGNsZWFySW50ZXJ2YWwoQGNoZWNrRm9yVXBkYXRlc0ludGVydmFsSUQpXG4gICAgICBAY2hlY2tGb3JVcGRhdGVzSW50ZXJ2YWxJRCA9IG51bGxcblxuICBjaGVjazogKHtoaWRlUG9wdXBzfT17fSkgLT5cbiAgICB1bmxlc3MgaGlkZVBvcHVwc1xuICAgICAgYXV0b1VwZGF0ZXIub25jZSAndXBkYXRlLW5vdC1hdmFpbGFibGUnLCBAb25VcGRhdGVOb3RBdmFpbGFibGVcbiAgICAgIGF1dG9VcGRhdGVyLm9uY2UgJ2Vycm9yJywgQG9uVXBkYXRlRXJyb3JcblxuICAgIGF1dG9VcGRhdGVyLmNoZWNrRm9yVXBkYXRlcygpIHVubGVzcyBAdGVzdE1vZGVcblxuICBpbnN0YWxsOiAtPlxuICAgIGF1dG9VcGRhdGVyLnF1aXRBbmRJbnN0YWxsKCkgdW5sZXNzIEB0ZXN0TW9kZVxuXG4gIG9uVXBkYXRlTm90QXZhaWxhYmxlOiA9PlxuICAgIGF1dG9VcGRhdGVyLnJlbW92ZUxpc3RlbmVyICdlcnJvcicsIEBvblVwZGF0ZUVycm9yXG4gICAge2RpYWxvZ30gPSByZXF1aXJlICdlbGVjdHJvbidcbiAgICBkaWFsb2cuc2hvd01lc3NhZ2VCb3hcbiAgICAgIHR5cGU6ICdpbmZvJ1xuICAgICAgYnV0dG9uczogWydPSyddXG4gICAgICBpY29uOiBAaWNvblBhdGhcbiAgICAgIG1lc3NhZ2U6ICdObyB1cGRhdGUgYXZhaWxhYmxlLidcbiAgICAgIHRpdGxlOiAnTm8gVXBkYXRlIEF2YWlsYWJsZSdcbiAgICAgIGRldGFpbDogXCJWZXJzaW9uICN7QHZlcnNpb259IGlzIHRoZSBsYXRlc3QgdmVyc2lvbi5cIlxuXG4gIG9uVXBkYXRlRXJyb3I6IChldmVudCwgbWVzc2FnZSkgPT5cbiAgICBhdXRvVXBkYXRlci5yZW1vdmVMaXN0ZW5lciAndXBkYXRlLW5vdC1hdmFpbGFibGUnLCBAb25VcGRhdGVOb3RBdmFpbGFibGVcbiAgICB7ZGlhbG9nfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuICAgIGRpYWxvZy5zaG93TWVzc2FnZUJveFxuICAgICAgdHlwZTogJ3dhcm5pbmcnXG4gICAgICBidXR0b25zOiBbJ09LJ11cbiAgICAgIGljb246IEBpY29uUGF0aFxuICAgICAgbWVzc2FnZTogJ1RoZXJlIHdhcyBhbiBlcnJvciBjaGVja2luZyBmb3IgdXBkYXRlcy4nXG4gICAgICB0aXRsZTogJ1VwZGF0ZSBFcnJvcidcbiAgICAgIGRldGFpbDogbWVzc2FnZVxuXG4gIGdldFdpbmRvd3M6IC0+XG4gICAgZ2xvYmFsLmF0b21BcHBsaWNhdGlvbi53aW5kb3dzXG4iXX0=
