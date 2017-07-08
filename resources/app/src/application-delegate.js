(function() {
  var ApplicationDelegate, Disposable, _, getWindowLoadSettings, ipcHelpers, ipcRenderer, ref, remote, shell,
    slice = [].slice;

  _ = require('underscore-plus');

  ref = require('electron'), ipcRenderer = ref.ipcRenderer, remote = ref.remote, shell = ref.shell;

  ipcHelpers = require('./ipc-helpers');

  Disposable = require('event-kit').Disposable;

  getWindowLoadSettings = require('./get-window-load-settings');

  module.exports = ApplicationDelegate = (function() {
    function ApplicationDelegate() {}

    ApplicationDelegate.prototype.getWindowLoadSettings = function() {
      return getWindowLoadSettings();
    };

    ApplicationDelegate.prototype.open = function(params) {
      return ipcRenderer.send('open', params);
    };

    ApplicationDelegate.prototype.pickFolder = function(callback) {
      var responseChannel;
      responseChannel = "atom-pick-folder-response";
      ipcRenderer.on(responseChannel, function(event, path) {
        ipcRenderer.removeAllListeners(responseChannel);
        return callback(path);
      });
      return ipcRenderer.send("pick-folder", responseChannel);
    };

    ApplicationDelegate.prototype.getCurrentWindow = function() {
      return remote.getCurrentWindow();
    };

    ApplicationDelegate.prototype.closeWindow = function() {
      return ipcHelpers.call('window-method', 'close');
    };

    ApplicationDelegate.prototype.getTemporaryWindowState = function() {
      return ipcHelpers.call('get-temporary-window-state').then(function(stateJSON) {
        return JSON.parse(stateJSON);
      });
    };

    ApplicationDelegate.prototype.setTemporaryWindowState = function(state) {
      return ipcHelpers.call('set-temporary-window-state', JSON.stringify(state));
    };

    ApplicationDelegate.prototype.getWindowSize = function() {
      var height, ref1, width;
      ref1 = remote.getCurrentWindow().getSize(), width = ref1[0], height = ref1[1];
      return {
        width: width,
        height: height
      };
    };

    ApplicationDelegate.prototype.setWindowSize = function(width, height) {
      return ipcHelpers.call('set-window-size', width, height);
    };

    ApplicationDelegate.prototype.getWindowPosition = function() {
      var ref1, x, y;
      ref1 = remote.getCurrentWindow().getPosition(), x = ref1[0], y = ref1[1];
      return {
        x: x,
        y: y
      };
    };

    ApplicationDelegate.prototype.setWindowPosition = function(x, y) {
      return ipcHelpers.call('set-window-position', x, y);
    };

    ApplicationDelegate.prototype.centerWindow = function() {
      return ipcHelpers.call('center-window');
    };

    ApplicationDelegate.prototype.focusWindow = function() {
      return ipcHelpers.call('focus-window');
    };

    ApplicationDelegate.prototype.showWindow = function() {
      return ipcHelpers.call('show-window');
    };

    ApplicationDelegate.prototype.hideWindow = function() {
      return ipcHelpers.call('hide-window');
    };

    ApplicationDelegate.prototype.reloadWindow = function() {
      return ipcHelpers.call('window-method', 'reload');
    };

    ApplicationDelegate.prototype.restartApplication = function() {
      return ipcRenderer.send("restart-application");
    };

    ApplicationDelegate.prototype.minimizeWindow = function() {
      return ipcHelpers.call('window-method', 'minimize');
    };

    ApplicationDelegate.prototype.isWindowMaximized = function() {
      return remote.getCurrentWindow().isMaximized();
    };

    ApplicationDelegate.prototype.maximizeWindow = function() {
      return ipcHelpers.call('window-method', 'maximize');
    };

    ApplicationDelegate.prototype.unmaximizeWindow = function() {
      return ipcHelpers.call('window-method', 'unmaximize');
    };

    ApplicationDelegate.prototype.isWindowFullScreen = function() {
      return remote.getCurrentWindow().isFullScreen();
    };

    ApplicationDelegate.prototype.setWindowFullScreen = function(fullScreen) {
      if (fullScreen == null) {
        fullScreen = false;
      }
      return ipcHelpers.call('window-method', 'setFullScreen', fullScreen);
    };

    ApplicationDelegate.prototype.onDidEnterFullScreen = function(callback) {
      return ipcHelpers.on(ipcRenderer, 'did-enter-full-screen', callback);
    };

    ApplicationDelegate.prototype.onDidLeaveFullScreen = function(callback) {
      return ipcHelpers.on(ipcRenderer, 'did-leave-full-screen', callback);
    };

    ApplicationDelegate.prototype.openWindowDevTools = function() {
      return new Promise(process.nextTick).then(function() {
        return ipcHelpers.call('window-method', 'openDevTools');
      });
    };

    ApplicationDelegate.prototype.closeWindowDevTools = function() {
      return new Promise(process.nextTick).then(function() {
        return ipcHelpers.call('window-method', 'closeDevTools');
      });
    };

    ApplicationDelegate.prototype.toggleWindowDevTools = function() {
      return new Promise(process.nextTick).then(function() {
        return ipcHelpers.call('window-method', 'toggleDevTools');
      });
    };

    ApplicationDelegate.prototype.executeJavaScriptInWindowDevTools = function(code) {
      return ipcRenderer.send("execute-javascript-in-dev-tools", code);
    };

    ApplicationDelegate.prototype.setWindowDocumentEdited = function(edited) {
      return ipcHelpers.call('window-method', 'setDocumentEdited', edited);
    };

    ApplicationDelegate.prototype.setRepresentedFilename = function(filename) {
      return ipcHelpers.call('window-method', 'setRepresentedFilename', filename);
    };

    ApplicationDelegate.prototype.addRecentDocument = function(filename) {
      return ipcRenderer.send("add-recent-document", filename);
    };

    ApplicationDelegate.prototype.setRepresentedDirectoryPaths = function(paths) {
      return ipcHelpers.call('window-method', 'setRepresentedDirectoryPaths', paths);
    };

    ApplicationDelegate.prototype.setAutoHideWindowMenuBar = function(autoHide) {
      return ipcHelpers.call('window-method', 'setAutoHideMenuBar', autoHide);
    };

    ApplicationDelegate.prototype.setWindowMenuBarVisibility = function(visible) {
      return remote.getCurrentWindow().setMenuBarVisibility(visible);
    };

    ApplicationDelegate.prototype.getPrimaryDisplayWorkAreaSize = function() {
      return remote.screen.getPrimaryDisplay().workAreaSize;
    };

    ApplicationDelegate.prototype.getUserDefault = function(key, type) {
      return remote.systemPreferences.getUserDefault(key, type);
    };

    ApplicationDelegate.prototype.confirm = function(arg) {
      var buttonLabels, buttons, callback, chosen, detailedMessage, message;
      message = arg.message, detailedMessage = arg.detailedMessage, buttons = arg.buttons;
      if (buttons == null) {
        buttons = {};
      }
      if (_.isArray(buttons)) {
        buttonLabels = buttons;
      } else {
        buttonLabels = Object.keys(buttons);
      }
      chosen = remote.dialog.showMessageBox(remote.getCurrentWindow(), {
        type: 'info',
        message: message,
        detail: detailedMessage,
        buttons: buttonLabels
      });
      if (_.isArray(buttons)) {
        return chosen;
      } else {
        callback = buttons[buttonLabels[chosen]];
        return typeof callback === "function" ? callback() : void 0;
      }
    };

    ApplicationDelegate.prototype.showMessageDialog = function(params) {};

    ApplicationDelegate.prototype.showSaveDialog = function(params) {
      if (typeof params === 'string') {
        params = {
          defaultPath: params
        };
      }
      return this.getCurrentWindow().showSaveDialog(params);
    };

    ApplicationDelegate.prototype.playBeepSound = function() {
      return shell.beep();
    };

    ApplicationDelegate.prototype.onDidOpenLocations = function(callback) {
      var outerCallback;
      outerCallback = function(event, message, detail) {
        if (message === 'open-locations') {
          return callback(detail);
        }
      };
      ipcRenderer.on('message', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('message', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onUpdateAvailable = function(callback) {
      var outerCallback;
      outerCallback = function(event, message, detail) {
        if (message === 'did-begin-downloading-update') {
          return callback(detail);
        }
      };
      ipcRenderer.on('message', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('message', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onDidBeginDownloadingUpdate = function(callback) {
      return this.onUpdateAvailable(callback);
    };

    ApplicationDelegate.prototype.onDidBeginCheckingForUpdate = function(callback) {
      var outerCallback;
      outerCallback = function(event, message, detail) {
        if (message === 'checking-for-update') {
          return callback(detail);
        }
      };
      ipcRenderer.on('message', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('message', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onDidCompleteDownloadingUpdate = function(callback) {
      var outerCallback;
      outerCallback = function(event, message, detail) {
        if (message === 'update-available') {
          return callback(detail);
        }
      };
      ipcRenderer.on('message', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('message', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onUpdateNotAvailable = function(callback) {
      var outerCallback;
      outerCallback = function(event, message, detail) {
        if (message === 'update-not-available') {
          return callback(detail);
        }
      };
      ipcRenderer.on('message', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('message', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onUpdateError = function(callback) {
      var outerCallback;
      outerCallback = function(event, message, detail) {
        if (message === 'update-error') {
          return callback(detail);
        }
      };
      ipcRenderer.on('message', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('message', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onApplicationMenuCommand = function(callback) {
      var outerCallback;
      outerCallback = function() {
        var args, event;
        event = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        return callback.apply(null, args);
      };
      ipcRenderer.on('command', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('command', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onContextMenuCommand = function(callback) {
      var outerCallback;
      outerCallback = function() {
        var args, event;
        event = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        return callback.apply(null, args);
      };
      ipcRenderer.on('context-command', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('context-command', outerCallback);
      });
    };

    ApplicationDelegate.prototype.onSaveWindowStateRequest = function(callback) {
      var outerCallback;
      outerCallback = function(event, message) {
        return callback(event);
      };
      ipcRenderer.on('save-window-state', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('save-window-state', outerCallback);
      });
    };

    ApplicationDelegate.prototype.didSaveWindowState = function() {
      return ipcRenderer.send('did-save-window-state');
    };

    ApplicationDelegate.prototype.didCancelWindowUnload = function() {
      return ipcRenderer.send('did-cancel-window-unload');
    };

    ApplicationDelegate.prototype.onDidChangeHistoryManager = function(callback) {
      var outerCallback;
      outerCallback = function(event, message) {
        return callback(event);
      };
      ipcRenderer.on('did-change-history-manager', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('did-change-history-manager', outerCallback);
      });
    };

    ApplicationDelegate.prototype.didChangeHistoryManager = function() {
      return ipcRenderer.send('did-change-history-manager');
    };

    ApplicationDelegate.prototype.openExternal = function(url) {
      return shell.openExternal(url);
    };

    ApplicationDelegate.prototype.checkForUpdate = function() {
      return ipcRenderer.send('command', 'application:check-for-update');
    };

    ApplicationDelegate.prototype.restartAndInstallUpdate = function() {
      return ipcRenderer.send('command', 'application:install-update');
    };

    ApplicationDelegate.prototype.getAutoUpdateManagerState = function() {
      return ipcRenderer.sendSync('get-auto-update-manager-state');
    };

    ApplicationDelegate.prototype.getAutoUpdateManagerErrorMessage = function() {
      return ipcRenderer.sendSync('get-auto-update-manager-error');
    };

    ApplicationDelegate.prototype.emitWillSavePath = function(path) {
      return ipcRenderer.sendSync('will-save-path', path);
    };

    ApplicationDelegate.prototype.emitDidSavePath = function(path) {
      return ipcRenderer.sendSync('did-save-path', path);
    };

    ApplicationDelegate.prototype.resolveProxy = function(requestId, url) {
      return ipcRenderer.send('resolve-proxy', requestId, url);
    };

    ApplicationDelegate.prototype.onDidResolveProxy = function(callback) {
      var outerCallback;
      outerCallback = function(event, requestId, proxy) {
        return callback(requestId, proxy);
      };
      ipcRenderer.on('did-resolve-proxy', outerCallback);
      return new Disposable(function() {
        return ipcRenderer.removeListener('did-resolve-proxy', outerCallback);
      });
    };

    return ApplicationDelegate;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2FwcGxpY2F0aW9uLWRlbGVnYXRlLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsc0dBQUE7SUFBQTs7RUFBQSxDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLE1BQStCLE9BQUEsQ0FBUSxVQUFSLENBQS9CLEVBQUMsNkJBQUQsRUFBYyxtQkFBZCxFQUFzQjs7RUFDdEIsVUFBQSxHQUFhLE9BQUEsQ0FBUSxlQUFSOztFQUNaLGFBQWMsT0FBQSxDQUFRLFdBQVI7O0VBQ2YscUJBQUEsR0FBd0IsT0FBQSxDQUFRLDRCQUFSOztFQUV4QixNQUFNLENBQUMsT0FBUCxHQUNNOzs7a0NBQ0oscUJBQUEsR0FBdUIsU0FBQTthQUFHLHFCQUFBLENBQUE7SUFBSDs7a0NBRXZCLElBQUEsR0FBTSxTQUFDLE1BQUQ7YUFDSixXQUFXLENBQUMsSUFBWixDQUFpQixNQUFqQixFQUF5QixNQUF6QjtJQURJOztrQ0FHTixVQUFBLEdBQVksU0FBQyxRQUFEO0FBQ1YsVUFBQTtNQUFBLGVBQUEsR0FBa0I7TUFDbEIsV0FBVyxDQUFDLEVBQVosQ0FBZSxlQUFmLEVBQWdDLFNBQUMsS0FBRCxFQUFRLElBQVI7UUFDOUIsV0FBVyxDQUFDLGtCQUFaLENBQStCLGVBQS9CO2VBQ0EsUUFBQSxDQUFTLElBQVQ7TUFGOEIsQ0FBaEM7YUFHQSxXQUFXLENBQUMsSUFBWixDQUFpQixhQUFqQixFQUFnQyxlQUFoQztJQUxVOztrQ0FPWixnQkFBQSxHQUFrQixTQUFBO2FBQ2hCLE1BQU0sQ0FBQyxnQkFBUCxDQUFBO0lBRGdCOztrQ0FHbEIsV0FBQSxHQUFhLFNBQUE7YUFDWCxVQUFVLENBQUMsSUFBWCxDQUFnQixlQUFoQixFQUFpQyxPQUFqQztJQURXOztrQ0FHYix1QkFBQSxHQUF5QixTQUFBO2FBQ3ZCLFVBQVUsQ0FBQyxJQUFY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QURZOztrQ0FHZCxpQkFBQSxHQUFtQixTQUFDLFFBQUQ7QUFDakIsVUFBQTtNQUFBLGFBQUEsR0FBZ0IsU0FBQyxLQUFELEVBQVEsU0FBUixFQUFtQixLQUFuQjtlQUNkLFFBQUEsQ0FBUyxTQUFULEVBQW9CLEtBQXBCO01BRGM7TUFHaEIsV0FBVyxDQUFDLEVBQVosQ0FBZSxtQkFBZixFQUFvQyxhQUFwQzthQUNJLElBQUEsVUFBQSxDQUFXLFNBQUE7ZUFDYixXQUFXLENBQUMsY0FBWixDQUEyQixtQkFBM0IsRUFBZ0QsYUFBaEQ7TUFEYSxDQUFYO0lBTGE7Ozs7O0FBM1JyQiIsInNvdXJjZXNDb250ZW50IjpbIl8gPSByZXF1aXJlICd1bmRlcnNjb3JlLXBsdXMnXG57aXBjUmVuZGVyZXIsIHJlbW90ZSwgc2hlbGx9ID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5pcGNIZWxwZXJzID0gcmVxdWlyZSAnLi9pcGMtaGVscGVycydcbntEaXNwb3NhYmxlfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcbmdldFdpbmRvd0xvYWRTZXR0aW5ncyA9IHJlcXVpcmUgJy4vZ2V0LXdpbmRvdy1sb2FkLXNldHRpbmdzJ1xuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBBcHBsaWNhdGlvbkRlbGVnYXRlXG4gIGdldFdpbmRvd0xvYWRTZXR0aW5nczogLT4gZ2V0V2luZG93TG9hZFNldHRpbmdzKClcblxuICBvcGVuOiAocGFyYW1zKSAtPlxuICAgIGlwY1JlbmRlcmVyLnNlbmQoJ29wZW4nLCBwYXJhbXMpXG5cbiAgcGlja0ZvbGRlcjogKGNhbGxiYWNrKSAtPlxuICAgIHJlc3BvbnNlQ2hhbm5lbCA9IFwiYXRvbS1waWNrLWZvbGRlci1yZXNwb25zZVwiXG4gICAgaXBjUmVuZGVyZXIub24gcmVzcG9uc2VDaGFubmVsLCAoZXZlbnQsIHBhdGgpIC0+XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVBbGxMaXN0ZW5lcnMocmVzcG9uc2VDaGFubmVsKVxuICAgICAgY2FsbGJhY2socGF0aClcbiAgICBpcGNSZW5kZXJlci5zZW5kKFwicGljay1mb2xkZXJcIiwgcmVzcG9uc2VDaGFubmVsKVxuXG4gIGdldEN1cnJlbnRXaW5kb3c6IC0+XG4gICAgcmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKVxuXG4gIGNsb3NlV2luZG93OiAtPlxuICAgIGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICdjbG9zZScpXG5cbiAgZ2V0VGVtcG9yYXJ5V2luZG93U3RhdGU6IC0+XG4gICAgaXBjSGVscGVycy5jYWxsKCdnZXQtdGVtcG9yYXJ5LXdpbmRvdy1zdGF0ZScpLnRoZW4gKHN0YXRlSlNPTikgLT4gSlNPTi5wYXJzZShzdGF0ZUpTT04pXG5cbiAgc2V0VGVtcG9yYXJ5V2luZG93U3RhdGU6IChzdGF0ZSkgLT5cbiAgICBpcGNIZWxwZXJzLmNhbGwoJ3NldC10ZW1wb3Jhcnktd2luZG93LXN0YXRlJywgSlNPTi5zdHJpbmdpZnkoc3RhdGUpKVxuXG4gIGdldFdpbmRvd1NpemU6IC0+XG4gICAgW3dpZHRoLCBoZWlnaHRdID0gcmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKS5nZXRTaXplKClcbiAgICB7d2lkdGgsIGhlaWdodH1cblxuICBzZXRXaW5kb3dTaXplOiAod2lkdGgsIGhlaWdodCkgLT5cbiAgICBpcGNIZWxwZXJzLmNhbGwoJ3NldC13aW5kb3ctc2l6ZScsIHdpZHRoLCBoZWlnaHQpXG5cbiAgZ2V0V2luZG93UG9zaXRpb246IC0+XG4gICAgW3gsIHldID0gcmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKS5nZXRQb3NpdGlvbigpXG4gICAge3gsIHl9XG5cbiAgc2V0V2luZG93UG9zaXRpb246ICh4LCB5KSAtPlxuICAgIGlwY0hlbHBlcnMuY2FsbCgnc2V0LXdpbmRvdy1wb3NpdGlvbicsIHgsIHkpXG5cbiAgY2VudGVyV2luZG93OiAtPlxuICAgIGlwY0hlbHBlcnMuY2FsbCgnY2VudGVyLXdpbmRvdycpXG5cbiAgZm9jdXNXaW5kb3c6IC0+XG4gICAgaXBjSGVscGVycy5jYWxsKCdmb2N1cy13aW5kb3cnKVxuXG4gIHNob3dXaW5kb3c6IC0+XG4gICAgaXBjSGVscGVycy5jYWxsKCdzaG93LXdpbmRvdycpXG5cbiAgaGlkZVdpbmRvdzogLT5cbiAgICBpcGNIZWxwZXJzLmNhbGwoJ2hpZGUtd2luZG93JylcblxuICByZWxvYWRXaW5kb3c6IC0+XG4gICAgaXBjSGVscGVycy5jYWxsKCd3aW5kb3ctbWV0aG9kJywgJ3JlbG9hZCcpXG5cbiAgcmVzdGFydEFwcGxpY2F0aW9uOiAtPlxuICAgIGlwY1JlbmRlcmVyLnNlbmQoXCJyZXN0YXJ0LWFwcGxpY2F0aW9uXCIpXG5cbiAgbWluaW1pemVXaW5kb3c6IC0+XG4gICAgaXBjSGVscGVycy5jYWxsKCd3aW5kb3ctbWV0aG9kJywgJ21pbmltaXplJylcblxuICBpc1dpbmRvd01heGltaXplZDogLT5cbiAgICByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpLmlzTWF4aW1pemVkKClcblxuICBtYXhpbWl6ZVdpbmRvdzogLT5cbiAgICBpcGNIZWxwZXJzLmNhbGwoJ3dpbmRvdy1tZXRob2QnLCAnbWF4aW1pemUnKVxuXG4gIHVubWF4aW1pemVXaW5kb3c6IC0+XG4gICAgaXBjSGVscGVycy5jYWxsKCd3aW5kb3ctbWV0aG9kJywgJ3VubWF4aW1pemUnKVxuXG4gIGlzV2luZG93RnVsbFNjcmVlbjogLT5cbiAgICByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpLmlzRnVsbFNjcmVlbigpXG5cbiAgc2V0V2luZG93RnVsbFNjcmVlbjogKGZ1bGxTY3JlZW49ZmFsc2UpIC0+XG4gICAgaXBjSGVscGVycy5jYWxsKCd3aW5kb3ctbWV0aG9kJywgJ3NldEZ1bGxTY3JlZW4nLCBmdWxsU2NyZWVuKVxuXG4gIG9uRGlkRW50ZXJGdWxsU2NyZWVuOiAoY2FsbGJhY2spIC0+XG4gICAgaXBjSGVscGVycy5vbihpcGNSZW5kZXJlciwgJ2RpZC1lbnRlci1mdWxsLXNjcmVlbicsIGNhbGxiYWNrKVxuXG4gIG9uRGlkTGVhdmVGdWxsU2NyZWVuOiAoY2FsbGJhY2spIC0+XG4gICAgaXBjSGVscGVycy5vbihpcGNSZW5kZXJlciwgJ2RpZC1sZWF2ZS1mdWxsLXNjcmVlbicsIGNhbGxiYWNrKVxuXG4gIG9wZW5XaW5kb3dEZXZUb29sczogLT5cbiAgICAjIERlZmVyIERldlRvb2xzIGludGVyYWN0aW9uIHRvIHRoZSBuZXh0IHRpY2ssIGJlY2F1c2UgdXNpbmcgdGhlbSBkdXJpbmdcbiAgICAjIGV2ZW50IGhhbmRsaW5nIGNhdXNlcyBzb21lIHdyb25nIGlucHV0IGV2ZW50cyB0byBiZSB0cmlnZ2VyZWQgb25cbiAgICAjIGBUZXh0RWRpdG9yQ29tcG9uZW50YCAoUmVmLjogaHR0cHM6Ly9naXRodWIuY29tL2F0b20vYXRvbS9pc3N1ZXMvOTY5NykuXG4gICAgbmV3IFByb21pc2UocHJvY2Vzcy5uZXh0VGljaykudGhlbigtPiBpcGNIZWxwZXJzLmNhbGwoJ3dpbmRvdy1tZXRob2QnLCAnb3BlbkRldlRvb2xzJykpXG5cbiAgY2xvc2VXaW5kb3dEZXZUb29sczogLT5cbiAgICAjIERlZmVyIERldlRvb2xzIGludGVyYWN0aW9uIHRvIHRoZSBuZXh0IHRpY2ssIGJlY2F1c2UgdXNpbmcgdGhlbSBkdXJpbmdcbiAgICAjIGV2ZW50IGhhbmRsaW5nIGNhdXNlcyBzb21lIHdyb25nIGlucHV0IGV2ZW50cyB0byBiZSB0cmlnZ2VyZWQgb25cbiAgICAjIGBUZXh0RWRpdG9yQ29tcG9uZW50YCAoUmVmLjogaHR0cHM6Ly9naXRodWIuY29tL2F0b20vYXRvbS9pc3N1ZXMvOTY5NykuXG4gICAgbmV3IFByb21pc2UocHJvY2Vzcy5uZXh0VGljaykudGhlbigtPiBpcGNIZWxwZXJzLmNhbGwoJ3dpbmRvdy1tZXRob2QnLCAnY2xvc2VEZXZUb29scycpKVxuXG4gIHRvZ2dsZVdpbmRvd0RldlRvb2xzOiAtPlxuICAgICMgRGVmZXIgRGV2VG9vbHMgaW50ZXJhY3Rpb24gdG8gdGhlIG5leHQgdGljaywgYmVjYXVzZSB1c2luZyB0aGVtIGR1cmluZ1xuICAgICMgZXZlbnQgaGFuZGxpbmcgY2F1c2VzIHNvbWUgd3JvbmcgaW5wdXQgZXZlbnRzIHRvIGJlIHRyaWdnZXJlZCBvblxuICAgICMgYFRleHRFZGl0b3JDb21wb25lbnRgIChSZWYuOiBodHRwczovL2dpdGh1Yi5jb20vYXRvbS9hdG9tL2lzc3Vlcy85Njk3KS5cbiAgICBuZXcgUHJvbWlzZShwcm9jZXNzLm5leHRUaWNrKS50aGVuKC0+IGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICd0b2dnbGVEZXZUb29scycpKVxuXG4gIGV4ZWN1dGVKYXZhU2NyaXB0SW5XaW5kb3dEZXZUb29sczogKGNvZGUpIC0+XG4gICAgaXBjUmVuZGVyZXIuc2VuZChcImV4ZWN1dGUtamF2YXNjcmlwdC1pbi1kZXYtdG9vbHNcIiwgY29kZSlcblxuICBzZXRXaW5kb3dEb2N1bWVudEVkaXRlZDogKGVkaXRlZCkgLT5cbiAgICBpcGNIZWxwZXJzLmNhbGwoJ3dpbmRvdy1tZXRob2QnLCAnc2V0RG9jdW1lbnRFZGl0ZWQnLCBlZGl0ZWQpXG5cbiAgc2V0UmVwcmVzZW50ZWRGaWxlbmFtZTogKGZpbGVuYW1lKSAtPlxuICAgIGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICdzZXRSZXByZXNlbnRlZEZpbGVuYW1lJywgZmlsZW5hbWUpXG5cbiAgYWRkUmVjZW50RG9jdW1lbnQ6IChmaWxlbmFtZSkgLT5cbiAgICBpcGNSZW5kZXJlci5zZW5kKFwiYWRkLXJlY2VudC1kb2N1bWVudFwiLCBmaWxlbmFtZSlcblxuICBzZXRSZXByZXNlbnRlZERpcmVjdG9yeVBhdGhzOiAocGF0aHMpIC0+XG4gICAgaXBjSGVscGVycy5jYWxsKCd3aW5kb3ctbWV0aG9kJywgJ3NldFJlcHJlc2VudGVkRGlyZWN0b3J5UGF0aHMnLCBwYXRocylcblxuICBzZXRBdXRvSGlkZVdpbmRvd01lbnVCYXI6IChhdXRvSGlkZSkgLT5cbiAgICBpcGNIZWxwZXJzLmNhbGwoJ3dpbmRvdy1tZXRob2QnLCAnc2V0QXV0b0hpZGVNZW51QmFyJywgYXV0b0hpZGUpXG5cbiAgc2V0V2luZG93TWVudUJhclZpc2liaWxpdHk6ICh2aXNpYmxlKSAtPlxuICAgIHJlbW90ZS5nZXRDdXJyZW50V2luZG93KCkuc2V0TWVudUJhclZpc2liaWxpdHkodmlzaWJsZSlcblxuICBnZXRQcmltYXJ5RGlzcGxheVdvcmtBcmVhU2l6ZTogLT5cbiAgICByZW1vdGUuc2NyZWVuLmdldFByaW1hcnlEaXNwbGF5KCkud29ya0FyZWFTaXplXG5cbiAgZ2V0VXNlckRlZmF1bHQ6IChrZXksIHR5cGUpIC0+XG4gICAgcmVtb3RlLnN5c3RlbVByZWZlcmVuY2VzLmdldFVzZXJEZWZhdWx0KGtleSwgdHlwZSlcblxuICBjb25maXJtOiAoe21lc3NhZ2UsIGRldGFpbGVkTWVzc2FnZSwgYnV0dG9uc30pIC0+XG4gICAgYnV0dG9ucyA/PSB7fVxuICAgIGlmIF8uaXNBcnJheShidXR0b25zKVxuICAgICAgYnV0dG9uTGFiZWxzID0gYnV0dG9uc1xuICAgIGVsc2VcbiAgICAgIGJ1dHRvbkxhYmVscyA9IE9iamVjdC5rZXlzKGJ1dHRvbnMpXG5cbiAgICBjaG9zZW4gPSByZW1vdGUuZGlhbG9nLnNob3dNZXNzYWdlQm94KHJlbW90ZS5nZXRDdXJyZW50V2luZG93KCksIHtcbiAgICAgIHR5cGU6ICdpbmZvJ1xuICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgICAgZGV0YWlsOiBkZXRhaWxlZE1lc3NhZ2VcbiAgICAgIGJ1dHRvbnM6IGJ1dHRvbkxhYmVsc1xuICAgIH0pXG5cbiAgICBpZiBfLmlzQXJyYXkoYnV0dG9ucylcbiAgICAgIGNob3NlblxuICAgIGVsc2VcbiAgICAgIGNhbGxiYWNrID0gYnV0dG9uc1tidXR0b25MYWJlbHNbY2hvc2VuXV1cbiAgICAgIGNhbGxiYWNrPygpXG5cbiAgc2hvd01lc3NhZ2VEaWFsb2c6IChwYXJhbXMpIC0+XG5cbiAgc2hvd1NhdmVEaWFsb2c6IChwYXJhbXMpIC0+XG4gICAgaWYgdHlwZW9mIHBhcmFtcyBpcyAnc3RyaW5nJ1xuICAgICAgcGFyYW1zID0ge2RlZmF1bHRQYXRoOiBwYXJhbXN9XG4gICAgQGdldEN1cnJlbnRXaW5kb3coKS5zaG93U2F2ZURpYWxvZyhwYXJhbXMpXG5cbiAgcGxheUJlZXBTb3VuZDogLT5cbiAgICBzaGVsbC5iZWVwKClcblxuICBvbkRpZE9wZW5Mb2NhdGlvbnM6IChjYWxsYmFjaykgLT5cbiAgICBvdXRlckNhbGxiYWNrID0gKGV2ZW50LCBtZXNzYWdlLCBkZXRhaWwpIC0+XG4gICAgICBjYWxsYmFjayhkZXRhaWwpIGlmIG1lc3NhZ2UgaXMgJ29wZW4tbG9jYXRpb25zJ1xuXG4gICAgaXBjUmVuZGVyZXIub24oJ21lc3NhZ2UnLCBvdXRlckNhbGxiYWNrKVxuICAgIG5ldyBEaXNwb3NhYmxlIC0+XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcignbWVzc2FnZScsIG91dGVyQ2FsbGJhY2spXG5cbiAgb25VcGRhdGVBdmFpbGFibGU6IChjYWxsYmFjaykgLT5cbiAgICBvdXRlckNhbGxiYWNrID0gKGV2ZW50LCBtZXNzYWdlLCBkZXRhaWwpIC0+XG4gICAgICAjIFRPRE86IFllcywgdGhpcyBpcyBzdHJhbmdlIHRoYXQgYG9uVXBkYXRlQXZhaWxhYmxlYCBpcyBsaXN0ZW5pbmcgZm9yXG4gICAgICAjIGBkaWQtYmVnaW4tZG93bmxvYWRpbmctdXBkYXRlYC4gV2UgY3VycmVudGx5IGhhdmUgbm8gbWVjaGFuaXNtIHRvIGtub3dcbiAgICAgICMgaWYgdGhlcmUgaXMgYW4gdXBkYXRlLCBzbyBiZWdpbiBvZiBkb3dubG9hZGluZyBpcyBhIGdvb2QgcHJveHkuXG4gICAgICBjYWxsYmFjayhkZXRhaWwpIGlmIG1lc3NhZ2UgaXMgJ2RpZC1iZWdpbi1kb3dubG9hZGluZy11cGRhdGUnXG5cbiAgICBpcGNSZW5kZXJlci5vbignbWVzc2FnZScsIG91dGVyQ2FsbGJhY2spXG4gICAgbmV3IERpc3Bvc2FibGUgLT5cbiAgICAgIGlwY1JlbmRlcmVyLnJlbW92ZUxpc3RlbmVyKCdtZXNzYWdlJywgb3V0ZXJDYWxsYmFjaylcblxuICBvbkRpZEJlZ2luRG93bmxvYWRpbmdVcGRhdGU6IChjYWxsYmFjaykgLT5cbiAgICBAb25VcGRhdGVBdmFpbGFibGUoY2FsbGJhY2spXG5cbiAgb25EaWRCZWdpbkNoZWNraW5nRm9yVXBkYXRlOiAoY2FsbGJhY2spIC0+XG4gICAgb3V0ZXJDYWxsYmFjayA9IChldmVudCwgbWVzc2FnZSwgZGV0YWlsKSAtPlxuICAgICAgY2FsbGJhY2soZGV0YWlsKSBpZiBtZXNzYWdlIGlzICdjaGVja2luZy1mb3ItdXBkYXRlJ1xuXG4gICAgaXBjUmVuZGVyZXIub24oJ21lc3NhZ2UnLCBvdXRlckNhbGxiYWNrKVxuICAgIG5ldyBEaXNwb3NhYmxlIC0+XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcignbWVzc2FnZScsIG91dGVyQ2FsbGJhY2spXG5cbiAgb25EaWRDb21wbGV0ZURvd25sb2FkaW5nVXBkYXRlOiAoY2FsbGJhY2spIC0+XG4gICAgb3V0ZXJDYWxsYmFjayA9IChldmVudCwgbWVzc2FnZSwgZGV0YWlsKSAtPlxuICAgICAgIyBUT0RPOiBXZSBjb3VsZCByZW5hbWUgdGhpcyBldmVudCB0byBgZGlkLWNvbXBsZXRlLWRvd25sb2FkaW5nLXVwZGF0ZWBcbiAgICAgIGNhbGxiYWNrKGRldGFpbCkgaWYgbWVzc2FnZSBpcyAndXBkYXRlLWF2YWlsYWJsZSdcblxuICAgIGlwY1JlbmRlcmVyLm9uKCdtZXNzYWdlJywgb3V0ZXJDYWxsYmFjaylcbiAgICBuZXcgRGlzcG9zYWJsZSAtPlxuICAgICAgaXBjUmVuZGVyZXIucmVtb3ZlTGlzdGVuZXIoJ21lc3NhZ2UnLCBvdXRlckNhbGxiYWNrKVxuXG4gIG9uVXBkYXRlTm90QXZhaWxhYmxlOiAoY2FsbGJhY2spIC0+XG4gICAgb3V0ZXJDYWxsYmFjayA9IChldmVudCwgbWVzc2FnZSwgZGV0YWlsKSAtPlxuICAgICAgY2FsbGJhY2soZGV0YWlsKSBpZiBtZXNzYWdlIGlzICd1cGRhdGUtbm90LWF2YWlsYWJsZSdcblxuICAgIGlwY1JlbmRlcmVyLm9uKCdtZXNzYWdlJywgb3V0ZXJDYWxsYmFjaylcbiAgICBuZXcgRGlzcG9zYWJsZSAtPlxuICAgICAgaXBjUmVuZGVyZXIucmVtb3ZlTGlzdGVuZXIoJ21lc3NhZ2UnLCBvdXRlckNhbGxiYWNrKVxuXG4gIG9uVXBkYXRlRXJyb3I6IChjYWxsYmFjaykgLT5cbiAgICBvdXRlckNhbGxiYWNrID0gKGV2ZW50LCBtZXNzYWdlLCBkZXRhaWwpIC0+XG4gICAgICBjYWxsYmFjayhkZXRhaWwpIGlmIG1lc3NhZ2UgaXMgJ3VwZGF0ZS1lcnJvcidcblxuICAgIGlwY1JlbmRlcmVyLm9uKCdtZXNzYWdlJywgb3V0ZXJDYWxsYmFjaylcbiAgICBuZXcgRGlzcG9zYWJsZSAtPlxuICAgICAgaXBjUmVuZGVyZXIucmVtb3ZlTGlzdGVuZXIoJ21lc3NhZ2UnLCBvdXRlckNhbGxiYWNrKVxuXG4gIG9uQXBwbGljYXRpb25NZW51Q29tbWFuZDogKGNhbGxiYWNrKSAtPlxuICAgIG91dGVyQ2FsbGJhY2sgPSAoZXZlbnQsIGFyZ3MuLi4pIC0+XG4gICAgICBjYWxsYmFjayhhcmdzLi4uKVxuXG4gICAgaXBjUmVuZGVyZXIub24oJ2NvbW1hbmQnLCBvdXRlckNhbGxiYWNrKVxuICAgIG5ldyBEaXNwb3NhYmxlIC0+XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcignY29tbWFuZCcsIG91dGVyQ2FsbGJhY2spXG5cbiAgb25Db250ZXh0TWVudUNvbW1hbmQ6IChjYWxsYmFjaykgLT5cbiAgICBvdXRlckNhbGxiYWNrID0gKGV2ZW50LCBhcmdzLi4uKSAtPlxuICAgICAgY2FsbGJhY2soYXJncy4uLilcblxuICAgIGlwY1JlbmRlcmVyLm9uKCdjb250ZXh0LWNvbW1hbmQnLCBvdXRlckNhbGxiYWNrKVxuICAgIG5ldyBEaXNwb3NhYmxlIC0+XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcignY29udGV4dC1jb21tYW5kJywgb3V0ZXJDYWxsYmFjaylcblxuICBvblNhdmVXaW5kb3dTdGF0ZVJlcXVlc3Q6IChjYWxsYmFjaykgLT5cbiAgICBvdXRlckNhbGxiYWNrID0gKGV2ZW50LCBtZXNzYWdlKSAtPlxuICAgICAgY2FsbGJhY2soZXZlbnQpXG5cbiAgICBpcGNSZW5kZXJlci5vbignc2F2ZS13aW5kb3ctc3RhdGUnLCBvdXRlckNhbGxiYWNrKVxuICAgIG5ldyBEaXNwb3NhYmxlIC0+XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcignc2F2ZS13aW5kb3ctc3RhdGUnLCBvdXRlckNhbGxiYWNrKVxuXG4gIGRpZFNhdmVXaW5kb3dTdGF0ZTogLT5cbiAgICBpcGNSZW5kZXJlci5zZW5kKCdkaWQtc2F2ZS13aW5kb3ctc3RhdGUnKVxuXG4gIGRpZENhbmNlbFdpbmRvd1VubG9hZDogLT5cbiAgICBpcGNSZW5kZXJlci5zZW5kKCdkaWQtY2FuY2VsLXdpbmRvdy11bmxvYWQnKVxuXG4gIG9uRGlkQ2hhbmdlSGlzdG9yeU1hbmFnZXI6IChjYWxsYmFjaykgLT5cbiAgICBvdXRlckNhbGxiYWNrID0gKGV2ZW50LCBtZXNzYWdlKSAtPlxuICAgICAgY2FsbGJhY2soZXZlbnQpXG5cbiAgICBpcGNSZW5kZXJlci5vbignZGlkLWNoYW5nZS1oaXN0b3J5LW1hbmFnZXInLCBvdXRlckNhbGxiYWNrKVxuICAgIG5ldyBEaXNwb3NhYmxlIC0+XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcignZGlkLWNoYW5nZS1oaXN0b3J5LW1hbmFnZXInLCBvdXRlckNhbGxiYWNrKVxuXG4gIGRpZENoYW5nZUhpc3RvcnlNYW5hZ2VyOiAtPlxuICAgIGlwY1JlbmRlcmVyLnNlbmQoJ2RpZC1jaGFuZ2UtaGlzdG9yeS1tYW5hZ2VyJylcblxuICBvcGVuRXh0ZXJuYWw6ICh1cmwpIC0+XG4gICAgc2hlbGwub3BlbkV4dGVybmFsKHVybClcblxuICBjaGVja0ZvclVwZGF0ZTogLT5cbiAgICBpcGNSZW5kZXJlci5zZW5kKCdjb21tYW5kJywgJ2FwcGxpY2F0aW9uOmNoZWNrLWZvci11cGRhdGUnKVxuXG4gIHJlc3RhcnRBbmRJbnN0YWxsVXBkYXRlOiAtPlxuICAgIGlwY1JlbmRlcmVyLnNlbmQoJ2NvbW1hbmQnLCAnYXBwbGljYXRpb246aW5zdGFsbC11cGRhdGUnKVxuXG4gIGdldEF1dG9VcGRhdGVNYW5hZ2VyU3RhdGU6IC0+XG4gICAgaXBjUmVuZGVyZXIuc2VuZFN5bmMoJ2dldC1hdXRvLXVwZGF0ZS1tYW5hZ2VyLXN0YXRlJylcblxuICBnZXRBdXRvVXBkYXRlTWFuYWdlckVycm9yTWVzc2FnZTogLT5cbiAgICBpcGNSZW5kZXJlci5zZW5kU3luYygnZ2V0LWF1dG8tdXBkYXRlLW1hbmFnZXItZXJyb3InKVxuXG4gIGVtaXRXaWxsU2F2ZVBhdGg6IChwYXRoKSAtPlxuICAgIGlwY1JlbmRlcmVyLnNlbmRTeW5jKCd3aWxsLXNhdmUtcGF0aCcsIHBhdGgpXG5cbiAgZW1pdERpZFNhdmVQYXRoOiAocGF0aCkgLT5cbiAgICBpcGNSZW5kZXJlci5zZW5kU3luYygnZGlkLXNhdmUtcGF0aCcsIHBhdGgpXG5cbiAgcmVzb2x2ZVByb3h5OiAocmVxdWVzdElkLCB1cmwpIC0+XG4gICAgaXBjUmVuZGVyZXIuc2VuZCgncmVzb2x2ZS1wcm94eScsIHJlcXVlc3RJZCwgdXJsKVxuXG4gIG9uRGlkUmVzb2x2ZVByb3h5OiAoY2FsbGJhY2spIC0+XG4gICAgb3V0ZXJDYWxsYmFjayA9IChldmVudCwgcmVxdWVzdElkLCBwcm94eSkgLT5cbiAgICAgIGNhbGxiYWNrKHJlcXVlc3RJZCwgcHJveHkpXG5cbiAgICBpcGNSZW5kZXJlci5vbignZGlkLXJlc29sdmUtcHJveHknLCBvdXRlckNhbGxiYWNrKVxuICAgIG5ldyBEaXNwb3NhYmxlIC0+XG4gICAgICBpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcignZGlkLXJlc29sdmUtcHJveHknLCBvdXRlckNhbGxiYWNrKVxuIl19
