(function() {
  var AtomWindow, BrowserWindow, EventEmitter, app, dialog, fs, ipcMain, path, ref, url,
    slice = [].slice;

  ref = require('electron'), BrowserWindow = ref.BrowserWindow, app = ref.app, dialog = ref.dialog, ipcMain = ref.ipcMain;

  path = require('path');

  fs = require('fs');

  url = require('url');

  EventEmitter = require('events').EventEmitter;

  module.exports = AtomWindow = (function() {
    Object.assign(AtomWindow.prototype, EventEmitter.prototype);

    AtomWindow.iconPath = path.resolve(__dirname, '..', '..', 'resources', 'atom.png');

    AtomWindow.includeShellLoadTime = true;

    AtomWindow.prototype.browserWindow = null;

    AtomWindow.prototype.loaded = null;

    AtomWindow.prototype.isSpec = null;

    function AtomWindow(atomApplication, fileRecoveryService, settings) {
      var hasPathToOpen, loadSettings, locationsToOpen, options, parentDirectory, pathToOpen, stat;
      this.atomApplication = atomApplication;
      this.fileRecoveryService = fileRecoveryService;
      if (settings == null) {
        settings = {};
      }
      this.resourcePath = settings.resourcePath, pathToOpen = settings.pathToOpen, locationsToOpen = settings.locationsToOpen, this.isSpec = settings.isSpec, this.headless = settings.headless, this.safeMode = settings.safeMode, this.devMode = settings.devMode;
      if (pathToOpen) {
        if (locationsToOpen == null) {
          locationsToOpen = [
            {
              pathToOpen: pathToOpen
            }
          ];
        }
      }
      if (locationsToOpen == null) {
        locationsToOpen = [];
      }
      this.loadedPromise = new Promise((function(_this) {
        return function(resolveLoadedPromise) {
          _this.resolveLoadedPromise = resolveLoadedPromise;
        };
      })(this));
      this.closedPromise = new Promise((function(_this) {
        return function(resolveClosedPromise) {
          _this.resolveClosedPromise = resolveClosedPromise;
        };
      })(this));
      options = {
        show: false,
        title: 'Atom',
        backgroundColor: "#fff",
        webPreferences: {
          backgroundThrottling: !this.isSpec
        }
      };
      if (process.platform === 'linux') {
        options.icon = this.constructor.iconPath;
      }
      if (this.shouldAddCustomTitleBar()) {
        options.titleBarStyle = 'hidden';
      }
      if (this.shouldAddCustomInsetTitleBar()) {
        options.titleBarStyle = 'hidden-inset';
      }
      if (this.shouldHideTitleBar()) {
        options.frame = false;
      }
      this.browserWindow = new BrowserWindow(options);
      this.handleEvents();
      loadSettings = Object.assign({}, settings);
      loadSettings.appVersion = app.getVersion();
      loadSettings.resourcePath = this.resourcePath;
      if (loadSettings.devMode == null) {
        loadSettings.devMode = false;
      }
      if (loadSettings.safeMode == null) {
        loadSettings.safeMode = false;
      }
      loadSettings.atomHome = process.env.ATOM_HOME;
      if (loadSettings.clearWindowState == null) {
        loadSettings.clearWindowState = false;
      }
      if (loadSettings.initialPaths == null) {
        loadSettings.initialPaths = (function() {
          var i, len, results;
          results = [];
          for (i = 0, len = locationsToOpen.length; i < len; i++) {
            pathToOpen = locationsToOpen[i].pathToOpen;
            if (!(pathToOpen)) {
              continue;
            }
            stat = fs.statSyncNoException(pathToOpen) || null;
            if (stat != null ? stat.isDirectory() : void 0) {
              results.push(pathToOpen);
            } else {
              parentDirectory = path.dirname(pathToOpen);
              if ((stat != null ? stat.isFile() : void 0) || fs.existsSync(parentDirectory)) {
                results.push(parentDirectory);
              } else {
                results.push(pathToOpen);
              }
            }
          }
          return results;
        })();
      }
      loadSettings.initialPaths.sort();
      if (this.constructor.includeShellLoadTime && !this.isSpec) {
        this.constructor.includeShellLoadTime = false;
        if (loadSettings.shellLoadTime == null) {
          loadSettings.shellLoadTime = Date.now() - global.shellStartTime;
        }
      }
      this.representedDirectoryPaths = loadSettings.initialPaths;
      if (loadSettings.env != null) {
        this.env = loadSettings.env;
      }
      this.browserWindow.loadSettingsJSON = JSON.stringify(loadSettings);
      this.browserWindow.on('window:loaded', (function(_this) {
        return function() {
          _this.disableZoom();
          _this.emit('window:loaded');
          return _this.resolveLoadedPromise();
        };
      })(this));
      this.browserWindow.on('window:locations-opened', (function(_this) {
        return function() {
          return _this.emit('window:locations-opened');
        };
      })(this));
      this.browserWindow.on('enter-full-screen', (function(_this) {
        return function() {
          return _this.browserWindow.webContents.send('did-enter-full-screen');
        };
      })(this));
      this.browserWindow.on('leave-full-screen', (function(_this) {
        return function() {
          return _this.browserWindow.webContents.send('did-leave-full-screen');
        };
      })(this));
      this.browserWindow.loadURL(url.format({
        protocol: 'file',
        pathname: this.resourcePath + "/static/index.html",
        slashes: true
      }));
      this.browserWindow.showSaveDialog = this.showSaveDialog.bind(this);
      if (this.isSpec) {
        this.browserWindow.focusOnWebView();
      }
      if (typeof windowDimensions !== "undefined" && windowDimensions !== null) {
        this.browserWindow.temporaryState = {
          windowDimensions: windowDimensions
        };
      }
      hasPathToOpen = !(locationsToOpen.length === 1 && (locationsToOpen[0].pathToOpen == null));
      if (hasPathToOpen && !this.isSpecWindow()) {
        this.openLocations(locationsToOpen);
      }
      this.atomApplication.addWindow(this);
    }

    AtomWindow.prototype.hasProjectPath = function() {
      return this.representedDirectoryPaths.length > 0;
    };

    AtomWindow.prototype.setupContextMenu = function() {
      var ContextMenu;
      ContextMenu = require('./context-menu');
      return this.browserWindow.on('context-menu', (function(_this) {
        return function(menuTemplate) {
          return new ContextMenu(menuTemplate, _this);
        };
      })(this));
    };

    AtomWindow.prototype.containsPaths = function(paths) {
      var i, len, pathToCheck;
      for (i = 0, len = paths.length; i < len; i++) {
        pathToCheck = paths[i];
        if (!this.containsPath(pathToCheck)) {
          return false;
        }
      }
      return true;
    };

    AtomWindow.prototype.containsPath = function(pathToCheck) {
      return this.representedDirectoryPaths.some(function(projectPath) {
        var base;
        if (!projectPath) {
          return false;
        } else if (!pathToCheck) {
          return false;
        } else if (pathToCheck === projectPath) {
          return true;
        } else if (typeof (base = fs.statSyncNoException(pathToCheck)).isDirectory === "function" ? base.isDirectory() : void 0) {
          return false;
        } else if (pathToCheck.indexOf(path.join(projectPath, path.sep)) === 0) {
          return true;
        } else {
          return false;
        }
      });
    };

    AtomWindow.prototype.handleEvents = function() {
      this.browserWindow.on('close', (function(_this) {
        return function(event) {
          if (!(_this.atomApplication.quitting || _this.unloading)) {
            event.preventDefault();
            _this.unloading = true;
            _this.atomApplication.saveState(false);
            return _this.saveState().then(function() {
              return _this.close();
            });
          }
        };
      })(this));
      this.browserWindow.on('closed', (function(_this) {
        return function() {
          _this.fileRecoveryService.didCloseWindow(_this);
          _this.atomApplication.removeWindow(_this);
          return _this.resolveClosedPromise();
        };
      })(this));
      this.browserWindow.on('unresponsive', (function(_this) {
        return function() {
          var chosen;
          if (_this.isSpec) {
            return;
          }
          chosen = dialog.showMessageBox(_this.browserWindow, {
            type: 'warning',
            buttons: ['Close', 'Keep Waiting'],
            message: 'Editor is not responding',
            detail: 'The editor is not responding. Would you like to force close it or just keep waiting?'
          });
          if (chosen === 0) {
            return _this.browserWindow.destroy();
          }
        };
      })(this));
      this.browserWindow.webContents.on('crashed', (function(_this) {
        return function() {
          var chosen;
          if (_this.headless) {
            console.log("Renderer process crashed, exiting");
            _this.atomApplication.exit(100);
            return;
          }
          _this.fileRecoveryService.didCrashWindow(_this);
          chosen = dialog.showMessageBox(_this.browserWindow, {
            type: 'warning',
            buttons: ['Close Window', 'Reload', 'Keep It Open'],
            message: 'The editor has crashed',
            detail: 'Please report this issue to https://github.com/atom/atom'
          });
          switch (chosen) {
            case 0:
              return _this.browserWindow.destroy();
            case 1:
              return _this.browserWindow.reload();
          }
        };
      })(this));
      this.browserWindow.webContents.on('will-navigate', (function(_this) {
        return function(event, url) {
          if (url !== _this.browserWindow.webContents.getURL()) {
            return event.preventDefault();
          }
        };
      })(this));
      this.setupContextMenu();
      if (this.isSpec) {
        return this.browserWindow.on('blur', (function(_this) {
          return function() {
            return _this.browserWindow.focusOnWebView();
          };
        })(this));
      }
    };

    AtomWindow.prototype.didCancelWindowUnload = function() {
      return this.unloading = false;
    };

    AtomWindow.prototype.saveState = function() {
      if (this.isSpecWindow()) {
        return Promise.resolve();
      }
      this.lastSaveStatePromise = new Promise((function(_this) {
        return function(resolve) {
          var callback;
          callback = function(event) {
            if (BrowserWindow.fromWebContents(event.sender) === _this.browserWindow) {
              ipcMain.removeListener('did-save-window-state', callback);
              return resolve();
            }
          };
          ipcMain.on('did-save-window-state', callback);
          return _this.browserWindow.webContents.send('save-window-state');
        };
      })(this));
      return this.lastSaveStatePromise;
    };

    AtomWindow.prototype.openPath = function(pathToOpen, initialLine, initialColumn) {
      return this.openLocations([
        {
          pathToOpen: pathToOpen,
          initialLine: initialLine,
          initialColumn: initialColumn
        }
      ]);
    };

    AtomWindow.prototype.openLocations = function(locationsToOpen) {
      return this.loadedPromise.then((function(_this) {
        return function() {
          return _this.sendMessage('open-locations', locationsToOpen);
        };
      })(this));
    };

    AtomWindow.prototype.replaceEnvironment = function(env) {
      return this.browserWindow.webContents.send('environment', env);
    };

    AtomWindow.prototype.sendMessage = function(message, detail) {
      return this.browserWindow.webContents.send('message', message, detail);
    };

    AtomWindow.prototype.sendCommand = function() {
      var args, command;
      command = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      if (this.isSpecWindow()) {
        if (!this.atomApplication.sendCommandToFirstResponder(command)) {
          switch (command) {
            case 'window:reload':
              return this.reload();
            case 'window:toggle-dev-tools':
              return this.toggleDevTools();
            case 'window:close':
              return this.close();
          }
        }
      } else if (this.isWebViewFocused()) {
        return this.sendCommandToBrowserWindow.apply(this, [command].concat(slice.call(args)));
      } else {
        if (!this.atomApplication.sendCommandToFirstResponder(command)) {
          return this.sendCommandToBrowserWindow.apply(this, [command].concat(slice.call(args)));
        }
      }
    };

    AtomWindow.prototype.sendCommandToBrowserWindow = function() {
      var action, args, command, ref1, ref2;
      command = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      action = ((ref1 = args[0]) != null ? ref1.contextCommand : void 0) ? 'context-command' : 'command';
      return (ref2 = this.browserWindow.webContents).send.apply(ref2, [action, command].concat(slice.call(args)));
    };

    AtomWindow.prototype.getDimensions = function() {
      var height, ref1, ref2, width, x, y;
      ref1 = this.browserWindow.getPosition(), x = ref1[0], y = ref1[1];
      ref2 = this.browserWindow.getSize(), width = ref2[0], height = ref2[1];
      return {
        x: x,
        y: y,
        width: width,
        height: height
      };
    };

    AtomWindow.prototype.shouldAddCustomTitleBar = function() {
      return !this.isSpec && process.platform === 'darwin' && this.atomApplication.config.get('core.titleBar') === 'custom';
    };

    AtomWindow.prototype.shouldAddCustomInsetTitleBar = function() {
      return !this.isSpec && process.platform === 'darwin' && this.atomApplication.config.get('core.titleBar') === 'custom-inset';
    };

    AtomWindow.prototype.shouldHideTitleBar = function() {
      return !this.isSpec && process.platform === 'darwin' && this.atomApplication.config.get('core.titleBar') === 'hidden';
    };

    AtomWindow.prototype.close = function() {
      return this.browserWindow.close();
    };

    AtomWindow.prototype.focus = function() {
      return this.browserWindow.focus();
    };

    AtomWindow.prototype.minimize = function() {
      return this.browserWindow.minimize();
    };

    AtomWindow.prototype.maximize = function() {
      return this.browserWindow.maximize();
    };

    AtomWindow.prototype.unmaximize = function() {
      return this.browserWindow.unmaximize();
    };

    AtomWindow.prototype.restore = function() {
      return this.browserWindow.restore();
    };

    AtomWindow.prototype.setFullScreen = function(fullScreen) {
      return this.browserWindow.setFullScreen(fullScreen);
    };

    AtomWindow.prototype.setAutoHideMenuBar = function(autoHideMenuBar) {
      return this.browserWindow.setAutoHideMenuBar(autoHideMenuBar);
    };

    AtomWindow.prototype.handlesAtomCommands = function() {
      return !this.isSpecWindow() && this.isWebViewFocused();
    };

    AtomWindow.prototype.isFocused = function() {
      return this.browserWindow.isFocused();
    };

    AtomWindow.prototype.isMaximized = function() {
      return this.browserWindow.isMaximized();
    };

    AtomWindow.prototype.isMinimized = function() {
      return this.browserWindow.isMinimized();
    };

    AtomWindow.prototype.isWebViewFocused = function() {
      return this.browserWindow.isWebViewFocused();
    };

    AtomWindow.prototype.isSpecWindow = function() {
      return this.isSpec;
    };

    AtomWindow.prototype.reload = function() {
      this.loadedPromise = new Promise((function(_this) {
        return function(resolveLoadedPromise) {
          _this.resolveLoadedPromise = resolveLoadedPromise;
        };
      })(this));
      this.saveState().then((function(_this) {
        return function() {
          return _this.browserWindow.reload();
        };
      })(this));
      return this.loadedPromise;
    };

    AtomWindow.prototype.showSaveDialog = function(params) {
      params = Object.assign({
        title: 'Save File',
        defaultPath: this.representedDirectoryPaths[0]
      }, params);
      return dialog.showSaveDialog(this.browserWindow, params);
    };

    AtomWindow.prototype.toggleDevTools = function() {
      return this.browserWindow.toggleDevTools();
    };

    AtomWindow.prototype.openDevTools = function() {
      return this.browserWindow.openDevTools();
    };

    AtomWindow.prototype.closeDevTools = function() {
      return this.browserWindow.closeDevTools();
    };

    AtomWindow.prototype.setDocumentEdited = function(documentEdited) {
      return this.browserWindow.setDocumentEdited(documentEdited);
    };

    AtomWindow.prototype.setRepresentedFilename = function(representedFilename) {
      return this.browserWindow.setRepresentedFilename(representedFilename);
    };

    AtomWindow.prototype.setRepresentedDirectoryPaths = function(representedDirectoryPaths) {
      this.representedDirectoryPaths = representedDirectoryPaths;
      this.representedDirectoryPaths.sort();
      return this.atomApplication.saveState();
    };

    AtomWindow.prototype.copy = function() {
      return this.browserWindow.copy();
    };

    AtomWindow.prototype.disableZoom = function() {
      return this.browserWindow.webContents.setZoomLevelLimits(1, 1);
    };

    return AtomWindow;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21haW4tcHJvY2Vzcy9hdG9tLXdpbmRvdy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLGlGQUFBO0lBQUE7O0VBQUEsTUFBd0MsT0FBQSxDQUFRLFVBQVIsQ0FBeEMsRUFBQyxpQ0FBRCxFQUFnQixhQUFoQixFQUFxQixtQkFBckIsRUFBNkI7O0VBQzdCLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxFQUFBLEdBQUssT0FBQSxDQUFRLElBQVI7O0VBQ0wsR0FBQSxHQUFNLE9BQUEsQ0FBUSxLQUFSOztFQUNMLGVBQWdCLE9BQUEsQ0FBUSxRQUFSOztFQUVqQixNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ0osTUFBTSxDQUFDLE1BQVAsQ0FBYyxVQUFDLENBQUEsU0FBZixFQUEwQixZQUFZLENBQUMsU0FBdkM7O0lBRUEsVUFBQyxDQUFBLFFBQUQsR0FBVyxJQUFJLENBQUMsT0FBTCxDQUFhLFNBQWIsRUFBd0IsSUFBeEIsRUFBOEIsSUFBOUIsRUFBb0MsV0FBcEMsRUFBaUQsVUFBakQ7O0lBQ1gsVUFBQyxDQUFBLG9CQUFELEdBQXVCOzt5QkFFdkIsYUFBQSxHQUFlOzt5QkFDZixNQUFBLEdBQVE7O3lCQUNSLE1BQUEsR0FBUTs7SUFFSyxvQkFBQyxlQUFELEVBQW1CLG1CQUFuQixFQUF5QyxRQUF6QztBQUNYLFVBQUE7TUFEWSxJQUFDLENBQUEsa0JBQUQ7TUFBa0IsSUFBQyxDQUFBLHNCQUFEOztRQUFzQixXQUFTOztNQUM1RCxJQUFDLENBQUEsd0JBQUEsWUFBRixFQUFnQixnQ0FBaEIsRUFBNEIsMENBQTVCLEVBQTZDLElBQUMsQ0FBQSxrQkFBQSxNQUE5QyxFQUFzRCxJQUFDLENBQUEsb0JBQUEsUUFBdkQsRUFBaUUsSUFBQyxDQUFBLG9CQUFBLFFBQWxFLEVBQTRFLElBQUMsQ0FBQSxtQkFB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QixjQUFBLEdBQWdCLFNBQUE7YUFBRyxJQUFDLENBQUEsYUFBYSxDQUFDLGNBQWYsQ0FBQTtJQUFIOzt5QkFFaEIsWUFBQSxHQUFjLFNBQUE7YUFBRyxJQUFDLENBQUEsYUFBYSxDQUFDLFlBQWYsQ0FBQTtJQUFIOzt5QkFFZCxhQUFBLEdBQWUsU0FBQTthQUFHLElBQUMsQ0FBQSxhQUFhLENBQUMsYUFBZixDQUFBO0lBQUg7O3lCQUVmLGlCQUFBLEdBQW1CLFNBQUMsY0FBRDthQUFvQixJQUFDLENBQUEsYUFBYSxDQUFDLGlCQUFmLENBQWlDLGNBQWpDO0lBQXBCOzt5QkFFbkIsc0JBQUEsR0FBd0IsU0FBQyxtQkFBRDthQUF5QixJQUFDLENBQUEsYUFBYSxDQUFDLHNCQUFmLENBQXNDLG1CQUF0QztJQUF6Qjs7eUJBRXhCLDRCQUFBLEdBQThCLFNBQUMseUJBQUQ7TUFBQyxJQUFDLENBQUEsNEJBQUQ7TUFDN0IsSUFBQyxDQUFBLHlCQUF5QixDQUFDLElBQTNCLENBQUE7YUFDQSxJQUFDLENBQUEsZUFBZSxDQUFDLFNBQWpCLENBQUE7SUFGNEI7O3lCQUk5QixJQUFBLEdBQU0sU0FBQTthQUFHLElBQUMsQ0FBQSxhQUFhLENBQUMsSUFBZixDQUFBO0lBQUg7O3lCQUVOLFdBQUEsR0FBYSxTQUFBO2FBQ1gsSUFBQyxDQUFBLGFBQWEsQ0FBQyxXQUFXLENBQUMsa0JBQTNCLENBQThDLENBQTlDLEVBQWlELENBQWpEO0lBRFc7Ozs7O0FBNVRmIiwic291cmNlc0NvbnRlbnQiOlsie0Jyb3dzZXJXaW5kb3csIGFwcCwgZGlhbG9nLCBpcGNNYWlufSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xucGF0aCA9IHJlcXVpcmUgJ3BhdGgnXG5mcyA9IHJlcXVpcmUgJ2ZzJ1xudXJsID0gcmVxdWlyZSAndXJsJ1xue0V2ZW50RW1pdHRlcn0gPSByZXF1aXJlICdldmVudHMnXG5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIEF0b21XaW5kb3dcbiAgT2JqZWN0LmFzc2lnbiBAcHJvdG90eXBlLCBFdmVudEVtaXR0ZXIucHJvdG90eXBlXG5cbiAgQGljb25QYXRoOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAncmVzb3VyY2VzJywgJ2F0b20ucG5nJylcbiAgQGluY2x1ZGVTaGVsbExvYWRUaW1lOiB0cnVlXG5cbiAgYnJvd3NlcldpbmRvdzogbnVsbFxuICBsb2FkZWQ6IG51bGxcbiAgaXNTcGVjOiBudWxsXG5cbiAgY29uc3RydWN0b3I6IChAYXRvbUFwcGxpY2F0aW9uLCBAZmlsZVJlY292ZXJ5U2VydmljZSwgc2V0dGluZ3M9e30pIC0+XG4gICAge0ByZXNvdXJjZVBhdGgsIHBhdGhUb09wZW4sIGxvY2F0aW9uc1RvT3BlbiwgQGlzU3BlYywgQGhlYWRsZXNzLCBAc2FmZU1vZGUsIEBkZXZNb2RlfSA9IHNldHRpbmdzXG4gICAgbG9jYXRpb25zVG9PcGVuID89IFt7cGF0aFRvT3Blbn1dIGlmIHBhdGhUb09wZW5cbiAgICBsb2NhdGlvbnNUb09wZW4gPz0gW11cblxuICAgIEBsb2FkZWRQcm9taXNlID0gbmV3IFByb21pc2UoKEByZXNvbHZlTG9hZGVkUHJvbWlzZSkgPT4pXG4gICAgQGNsb3NlZFByb21pc2UgPSBuZXcgUHJvbWlzZSgoQHJlc29sdmVDbG9zZWRQcm9taXNlKSA9PilcblxuICAgIG9wdGlvbnMgPVxuICAgICAgc2hvdzogZmFsc2VcbiAgICAgIHRpdGxlOiAnQXRvbSdcbiAgICAgICMgQWRkIGFuIG9wYXF1ZSBiYWNrZ3JvdW5kQ29sb3IgKGluc3RlYWQgb2Yga2VlcGluZyB0aGUgZGVmYXVsdFxuICAgICAgIyB0cmFuc3BhcmVudCBvbmUpIHRvIHByZXZlbnQgc3VicGl4ZWwgYW50aS1hbGlhc2luZyBmcm9tIGJlaW5nIGRpc2FibGVkLlxuICAgICAgIyBXZSBiZWxpZXZlIHRoaXMgaXMgYSByZWdyZXNzaW9uIGludHJvZHVjZWQgd2l0aCBFbGVjdHJvbiAwLjM3LjMsIGFuZFxuICAgICAgIyB0aHVzIHdlIHNob3VsZCByZW1vdmUgdGhpcyBhcyBzb29uIGFzIGEgZml4IGdldHMgcmVsZWFzZWQuXG4gICAgICBiYWNrZ3JvdW5kQ29sb3I6IFwiI2ZmZlwiXG4gICAgICB3ZWJQcmVmZXJlbmNlczpcbiAgICAgICAgIyBQcmV2ZW50IHNwZWNzIGZyb20gdGhyb3R0bGluZyB3aGVuIHRoZSB3aW5kb3cgaXMgaW4gdGhlIGJhY2tncm91bmQ6XG4gICAgICAgICMgdGhpcyBzaG91bGQgcmVzdWx0IGluIGZhc3RlciBDSSBidWlsZHMsIGFuZCBhbiBpbXByb3ZlbWVudCBpbiB0aGVcbiAgICAgICAgIyBsb2NhbCBkZXZlbG9wbWVudCBleHBlcmllbmNlIHdoZW4gcnVubmluZyBzcGVjcyB0aHJvdWdoIHRoZSBVSSAod2hpY2hcbiAgICAgICAgIyBub3cgd29uJ3QgcGF1c2Ugd2hlbiBlLmcuIG1pbmltaXppbmcgdGhlIHdpbmRvdykuXG4gICAgICAgIGJhY2tncm91bmRUaHJvdHRsaW5nOiBub3QgQGlzU3BlY1xuXG4gICAgIyBEb24ndCBzZXQgaWNvbiBvbiBXaW5kb3dzIHNvIHRoZSBleGUncyBpY28gd2lsbCBiZSB1c2VkIGFzIHdpbmRvdyBhbmRcbiAgICAjIHRhc2tiYXIncyBpY29uLiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2F0b20vYXRvbS9pc3N1ZXMvNDgxMSBmb3IgbW9yZS5cbiAgICBpZiBwcm9jZXNzLnBsYXRmb3JtIGlzICdsaW51eCdcbiAgICAgIG9wdGlvbnMuaWNvbiA9IEBjb25zdHJ1Y3Rvci5pY29uUGF0aFxuXG4gICAgaWYgQHNob3VsZEFkZEN1c3RvbVRpdGxlQmFyKClcbiAgICAgIG9wdGlvbnMudGl0bGVCYXJTdHlsZSA9ICdoaWRkZW4nXG5cbiAgICBpZiBAc2hvdWxkQWRkQ3VzdG9tSW5zZXRUaXRsZUJhcigpXG4gICAgICBvcHRpb25zLnRpdGxlQmFyU3R5bGUgPSAnaGlkZGVuLWluc2V0J1xuXG4gICAgaWYgQHNob3VsZEhpZGVUaXRsZUJhcigpXG4gICAgICBvcHRpb25zLmZyYW1lID0gZmFsc2VcblxuICAgIEBicm93c2VyV2luZG93ID0gbmV3IEJyb3dzZXJXaW5kb3cob3B0aW9ucylcbiAgICBAaGFuZGxlRXZlbnRzKClcblxuICAgIGxvYWRTZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIHNldHRpbmdzKVxuICAgIGxvYWRTZXR0aW5ncy5hcHBWZXJzaW9uID0gYXBwLmdldFZlcnNpb24oKVxuICAgIGxvYWRTZXR0aW5ncy5yZXNvdXJjZVBhdGggPSBAcmVzb3VyY2VQYXRoXG4gICAgbG9hZFNldHRpbmdzLmRldk1vZGUgPz0gZmFsc2VcbiAgICBsb2FkU2V0dGluZ3Muc2FmZU1vZGUgPz0gZmFsc2VcbiAgICBsb2FkU2V0dGluZ3MuYXRvbUhvbWUgPSBwcm9jZXNzLmVudi5BVE9NX0hPTUVcbiAgICBsb2FkU2V0dGluZ3MuY2xlYXJXaW5kb3dTdGF0ZSA/PSBmYWxzZVxuICAgIGxvYWRTZXR0aW5ncy5pbml0aWFsUGF0aHMgPz1cbiAgICAgIGZvciB7cGF0aFRvT3Blbn0gaW4gbG9jYXRpb25zVG9PcGVuIHdoZW4gcGF0aFRvT3BlblxuICAgICAgICBzdGF0ID0gZnMuc3RhdFN5bmNOb0V4Y2VwdGlvbihwYXRoVG9PcGVuKSBvciBudWxsXG4gICAgICAgIGlmIHN0YXQ/LmlzRGlyZWN0b3J5KClcbiAgICAgICAgICBwYXRoVG9PcGVuXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBwYXJlbnREaXJlY3RvcnkgPSBwYXRoLmRpcm5hbWUocGF0aFRvT3BlbilcbiAgICAgICAgICBpZiBzdGF0Py5pc0ZpbGUoKSBvciBmcy5leGlzdHNTeW5jKHBhcmVudERpcmVjdG9yeSlcbiAgICAgICAgICAgIHBhcmVudERpcmVjdG9yeVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHBhdGhUb09wZW5cbiAgICBsb2FkU2V0dGluZ3MuaW5pdGlhbFBhdGhzLnNvcnQoKVxuXG4gICAgIyBPbmx5IHNlbmQgdG8gdGhlIGZpcnN0IG5vbi1zcGVjIHdpbmRvdyBjcmVhdGVkXG4gICAgaWYgQGNvbnN0cnVjdG9yLmluY2x1ZGVTaGVsbExvYWRUaW1lIGFuZCBub3QgQGlzU3BlY1xuICAgICAgQGNvbnN0cnVjdG9yLmluY2x1ZGVTaGVsbExvYWRUaW1lID0gZmFsc2VcbiAgICAgIGxvYWRTZXR0aW5ncy5zaGVsbExvYWRUaW1lID89IERhdGUubm93KCkgLSBnbG9iYWwuc2hlbGxTdGFydFRpbWVcblxuICAgIEByZXByZXNlbnRlZERpcmVjdG9yeVBhdGhzID0gbG9hZFNldHRpbmdzLmluaXRpYWxQYXRoc1xuICAgIEBlbnYgPSBsb2FkU2V0dGluZ3MuZW52IGlmIGxvYWRTZXR0aW5ncy5lbnY/XG5cbiAgICBAYnJvd3NlcldpbmRvdy5sb2FkU2V0dGluZ3NKU09OID0gSlNPTi5zdHJpbmdpZnkobG9hZFNldHRpbmdzKVxuXG4gICAgQGJyb3dzZXJXaW5kb3cub24gJ3dpbmRvdzpsb2FkZWQnLCA9PlxuICAgICAgQGRpc2FibGVab29tKClcbiAgICAgIEBlbWl0ICd3aW5kb3c6bG9hZGVkJ1xuICAgICAgQHJlc29sdmVMb2FkZWRQcm9taXNlKClcblxuICAgIEBicm93c2VyV2luZG93Lm9uICd3aW5kb3c6bG9jYXRpb25zLW9wZW5lZCcsID0+XG4gICAgICBAZW1pdCAnd2luZG93OmxvY2F0aW9ucy1vcGVuZWQnXG5cbiAgICBAYnJvd3NlcldpbmRvdy5vbiAnZW50ZXItZnVsbC1zY3JlZW4nLCA9PlxuICAgICAgQGJyb3dzZXJXaW5kb3cud2ViQ29udGVudHMuc2VuZCgnZGlkLWVudGVyLWZ1bGwtc2NyZWVuJylcblxuICAgIEBicm93c2VyV2luZG93Lm9uICdsZWF2ZS1mdWxsLXNjcmVlbicsID0+XG4gICAgICBAYnJvd3NlcldpbmRvdy53ZWJDb250ZW50cy5zZW5kKCdkaWQtbGVhdmUtZnVsbC1zY3JlZW4nKVxuXG4gICAgQGJyb3dzZXJXaW5kb3cubG9hZFVSTCB1cmwuZm9ybWF0XG4gICAgICBwcm90b2NvbDogJ2ZpbGUnXG4gICAgICBwYXRobmFtZTogXCIje0ByZXNvdXJjZVBhdGh9L3N0YXRpYy9pbmRleC5odG1sXCJcbiAgICAgIHNsYXNoZXM6IHRydWVcblxuICAgIEBicm93c2VyV2luZG93LnNob3dTYXZlRGlhbG9nID0gQHNob3dTYXZlRGlhbG9nLmJpbmQodGhpcylcblxuICAgIEBicm93c2VyV2luZG93LmZvY3VzT25XZWJWaWV3KCkgaWYgQGlzU3BlY1xuICAgIEBicm93c2VyV2luZG93LnRlbXBvcmFyeVN0YXRlID0ge3dpbmRvd0RpbWVuc2lvbnN9IGlmIHdpbmRvd0RpbWVuc2lvbnM/XG5cbiAgICBoYXNQYXRoVG9PcGVuID0gbm90IChsb2NhdGlvbnNUb09wZW4ubGVuZ3RoIGlzIDEgYW5kIG5vdCBsb2NhdGlvbnNUb09wZW5bMF0ucGF0aFRvT3Blbj8pXG4gICAgQG9wZW5Mb2NhdGlvbnMobG9jYXRpb25zVG9PcGVuKSBpZiBoYXNQYXRoVG9PcGVuIGFuZCBub3QgQGlzU3BlY1dpbmRvdygpXG5cbiAgICBAYXRvbUFwcGxpY2F0aW9uLmFkZFdpbmRvdyh0aGlzKVxuXG4gIGhhc1Byb2plY3RQYXRoOiAtPiBAcmVwcmVzZW50ZWREaXJlY3RvcnlQYXRocy5sZW5ndGggPiAwXG5cbiAgc2V0dXBDb250ZXh0TWVudTogLT5cbiAgICBDb250ZXh0TWVudSA9IHJlcXVpcmUgJy4vY29udGV4dC1tZW51J1xuXG4gICAgQGJyb3dzZXJXaW5kb3cub24gJ2NvbnRleHQtbWVudScsIChtZW51VGVtcGxhdGUpID0+XG4gICAgICBuZXcgQ29udGV4dE1lbnUobWVudVRlbXBsYXRlLCB0aGlzKVxuXG4gIGNvbnRhaW5zUGF0aHM6IChwYXRocykgLT5cbiAgICBmb3IgcGF0aFRvQ2hlY2sgaW4gcGF0aHNcbiAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgQGNvbnRhaW5zUGF0aChwYXRoVG9DaGVjaylcbiAgICB0cnVlXG5cbiAgY29udGFpbnNQYXRoOiAocGF0aFRvQ2hlY2spIC0+XG4gICAgQHJlcHJlc2VudGVkRGlyZWN0b3J5UGF0aHMuc29tZSAocHJvamVjdFBhdGgpIC0+XG4gICAgICBpZiBub3QgcHJvamVjdFBhdGhcbiAgICAgICAgZmFsc2VcbiAgICAgIGVsc2UgaWYgbm90IHBhdGhUb0NoZWNrXG4gICAgICAgIGZhbHNlXG4gICAgICBlbHNlIGlmIHBhdGhUb0NoZWNrIGlzIHByb2plY3RQYXRoXG4gICAgICAgIHRydWVcbiAgICAgIGVsc2UgaWYgZnMuc3RhdFN5bmNOb0V4Y2VwdGlvbihwYXRoVG9DaGVjaykuaXNEaXJlY3Rvcnk/KClcbiAgICAgICAgZmFsc2VcbiAgICAgIGVsc2UgaWYgcGF0aFRvQ2hlY2suaW5kZXhPZihwYXRoLmpvaW4ocHJvamVjdFBhdGgsIHBhdGguc2VwKSkgaXMgMFxuICAgICAgICB0cnVlXG4gICAgICBlbHNlXG4gICAgICAgIGZhbHNlXG5cbiAgaGFuZGxlRXZlbnRzOiAtPlxuICAgIEBicm93c2VyV2luZG93Lm9uICdjbG9zZScsIChldmVudCkgPT5cbiAgICAgIHVubGVzcyBAYXRvbUFwcGxpY2F0aW9uLnF1aXR0aW5nIG9yIEB1bmxvYWRpbmdcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgICAgICBAdW5sb2FkaW5nID0gdHJ1ZVxuICAgICAgICBAYXRvbUFwcGxpY2F0aW9uLnNhdmVTdGF0ZShmYWxzZSlcbiAgICAgICAgQHNhdmVTdGF0ZSgpLnRoZW4oPT4gQGNsb3NlKCkpXG5cbiAgICBAYnJvd3NlcldpbmRvdy5vbiAnY2xvc2VkJywgPT5cbiAgICAgIEBmaWxlUmVjb3ZlcnlTZXJ2aWNlLmRpZENsb3NlV2luZG93KHRoaXMpXG4gICAgICBAYXRvbUFwcGxpY2F0aW9uLnJlbW92ZVdpbmRvdyh0aGlzKVxuICAgICAgQHJlc29sdmVDbG9zZWRQcm9taXNlKClcblxuICAgIEBicm93c2VyV2luZG93Lm9uICd1bnJlc3BvbnNpdmUnLCA9PlxuICAgICAgcmV0dXJuIGlmIEBpc1NwZWNcblxuICAgICAgY2hvc2VuID0gZGlhbG9nLnNob3dNZXNzYWdlQm94IEBicm93c2VyV2luZG93LFxuICAgICAgICB0eXBlOiAnd2FybmluZydcbiAgICAgICAgYnV0dG9uczogWydDbG9zZScsICdLZWVwIFdhaXRpbmcnXVxuICAgICAgICBtZXNzYWdlOiAnRWRpdG9yIGlzIG5vdCByZXNwb25kaW5nJ1xuICAgICAgICBkZXRhaWw6ICdUaGUgZWRpdG9yIGlzIG5vdCByZXNwb25kaW5nLiBXb3VsZCB5b3UgbGlrZSB0byBmb3JjZSBjbG9zZSBpdCBvciBqdXN0IGtlZXAgd2FpdGluZz8nXG4gICAgICBAYnJvd3NlcldpbmRvdy5kZXN0cm95KCkgaWYgY2hvc2VuIGlzIDBcblxuICAgIEBicm93c2VyV2luZG93LndlYkNvbnRlbnRzLm9uICdjcmFzaGVkJywgPT5cbiAgICAgIGlmIEBoZWFkbGVzc1xuICAgICAgICBjb25zb2xlLmxvZyBcIlJlbmRlcmVyIHByb2Nlc3MgY3Jhc2hlZCwgZXhpdGluZ1wiXG4gICAgICAgIEBhdG9tQXBwbGljYXRpb24uZXhpdCgxMDApXG4gICAgICAgIHJldHVyblxuXG4gICAgICBAZmlsZVJlY292ZXJ5U2VydmljZS5kaWRDcmFzaFdpbmRvdyh0aGlzKVxuICAgICAgY2hvc2VuID0gZGlhbG9nLnNob3dNZXNzYWdlQm94IEBicm93c2VyV2luZG93LFxuICAgICAgICB0eXBlOiAnd2FybmluZydcbiAgICAgICAgYnV0dG9uczogWydDbG9zZSBXaW5kb3cnLCAnUmVsb2FkJywgJ0tlZXAgSXQgT3BlbiddXG4gICAgICAgIG1lc3NhZ2U6ICdUaGUgZWRpdG9yIGhhcyBjcmFzaGVkJ1xuICAgICAgICBkZXRhaWw6ICdQbGVhc2UgcmVwb3J0IHRoaXMgaXNzdWUgdG8gaHR0cHM6Ly9naXRodWIuY29tL2F0b20vYXRvbSdcbiAgICAgIHN3aXRjaCBjaG9zZW5cbiAgICAgICAgd2hlbiAwIHRoZW4gQGJyb3dzZXJXaW5kb3cuZGVzdHJveSgpXG4gICAgICAgIHdoZW4gMSB0aGVuIEBicm93c2VyV2luZG93LnJlbG9hZCgpXG5cbiAgICBAYnJvd3NlcldpbmRvdy53ZWJDb250ZW50cy5vbiAnd2lsbC1uYXZpZ2F0ZScsIChldmVudCwgdXJsKSA9PlxuICAgICAgdW5sZXNzIHVybCBpcyBAYnJvd3NlcldpbmRvdy53ZWJDb250ZW50cy5nZXRVUkwoKVxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBAc2V0dXBDb250ZXh0TWVudSgpXG5cbiAgICBpZiBAaXNTcGVjXG4gICAgICAjIFNwZWMgd2luZG93J3Mgd2ViIHZpZXcgc2hvdWxkIGFsd2F5cyBoYXZlIGZvY3VzXG4gICAgICBAYnJvd3NlcldpbmRvdy5vbiAnYmx1cicsID0+XG4gICAgICAgIEBicm93c2VyV2luZG93LmZvY3VzT25XZWJWaWV3KClcblxuICBkaWRDYW5jZWxXaW5kb3dVbmxvYWQ6IC0+XG4gICAgQHVubG9hZGluZyA9IGZhbHNlXG5cbiAgc2F2ZVN0YXRlOiAtPlxuICAgIGlmIEBpc1NwZWNXaW5kb3coKVxuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG5cbiAgICBAbGFzdFNhdmVTdGF0ZVByb21pc2UgPSBuZXcgUHJvbWlzZSAocmVzb2x2ZSkgPT5cbiAgICAgIGNhbGxiYWNrID0gKGV2ZW50KSA9PlxuICAgICAgICBpZiBCcm93c2VyV2luZG93LmZyb21XZWJDb250ZW50cyhldmVudC5zZW5kZXIpIGlzIEBicm93c2VyV2luZG93XG4gICAgICAgICAgaXBjTWFpbi5yZW1vdmVMaXN0ZW5lcignZGlkLXNhdmUtd2luZG93LXN0YXRlJywgY2FsbGJhY2spXG4gICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICBpcGNNYWluLm9uKCdkaWQtc2F2ZS13aW5kb3ctc3RhdGUnLCBjYWxsYmFjaylcbiAgICAgIEBicm93c2VyV2luZG93LndlYkNvbnRlbnRzLnNlbmQoJ3NhdmUtd2luZG93LXN0YXRlJylcbiAgICBAbGFzdFNhdmVTdGF0ZVByb21pc2VcblxuICBvcGVuUGF0aDogKHBhdGhUb09wZW4sIGluaXRpYWxMaW5lLCBpbml0aWFsQ29sdW1uKSAtPlxuICAgIEBvcGVuTG9jYXRpb25zKFt7cGF0aFRvT3BlbiwgaW5pdGlhbExpbmUsIGluaXRpYWxDb2x1bW59XSlcblxuICBvcGVuTG9jYXRpb25zOiAobG9jYXRpb25zVG9PcGVuKSAtPlxuICAgIEBsb2FkZWRQcm9taXNlLnRoZW4gPT4gQHNlbmRNZXNzYWdlICdvcGVuLWxvY2F0aW9ucycsIGxvY2F0aW9uc1RvT3BlblxuXG4gIHJlcGxhY2VFbnZpcm9ubWVudDogKGVudikgLT5cbiAgICBAYnJvd3NlcldpbmRvdy53ZWJDb250ZW50cy5zZW5kICdlbnZpcm9ubWVudCcsIGVudlxuXG4gIHNlbmRNZXNzYWdlOiAobWVzc2FnZSwgZGV0YWlsKSAtPlxuICAgIEBicm93c2VyV2luZG93LndlYkNvbnRlbnRzLnNlbmQgJ21lc3NhZ2UnLCBtZXNzYWdlLCBkZXRhaWxcblxuICBzZW5kQ29tbWFuZDogKGNvbW1hbmQsIGFyZ3MuLi4pIC0+XG4gICAgaWYgQGlzU3BlY1dpbmRvdygpXG4gICAgICB1bmxlc3MgQGF0b21BcHBsaWNhdGlvbi5zZW5kQ29tbWFuZFRvRmlyc3RSZXNwb25kZXIoY29tbWFuZClcbiAgICAgICAgc3dpdGNoIGNvbW1hbmRcbiAgICAgICAgICB3aGVuICd3aW5kb3c6cmVsb2FkJyB0aGVuIEByZWxvYWQoKVxuICAgICAgICAgIHdoZW4gJ3dpbmRvdzp0b2dnbGUtZGV2LXRvb2xzJyB0aGVuIEB0b2dnbGVEZXZUb29scygpXG4gICAgICAgICAgd2hlbiAnd2luZG93OmNsb3NlJyB0aGVuIEBjbG9zZSgpXG4gICAgZWxzZSBpZiBAaXNXZWJWaWV3Rm9jdXNlZCgpXG4gICAgICBAc2VuZENvbW1hbmRUb0Jyb3dzZXJXaW5kb3coY29tbWFuZCwgYXJncy4uLilcbiAgICBlbHNlXG4gICAgICB1bmxlc3MgQGF0b21BcHBsaWNhdGlvbi5zZW5kQ29tbWFuZFRvRmlyc3RSZXNwb25kZXIoY29tbWFuZClcbiAgICAgICAgQHNlbmRDb21tYW5kVG9Ccm93c2VyV2luZG93KGNvbW1hbmQsIGFyZ3MuLi4pXG5cbiAgc2VuZENvbW1hbmRUb0Jyb3dzZXJXaW5kb3c6IChjb21tYW5kLCBhcmdzLi4uKSAtPlxuICAgIGFjdGlvbiA9IGlmIGFyZ3NbMF0/LmNvbnRleHRDb21tYW5kIHRoZW4gJ2NvbnRleHQtY29tbWFuZCcgZWxzZSAnY29tbWFuZCdcbiAgICBAYnJvd3NlcldpbmRvdy53ZWJDb250ZW50cy5zZW5kIGFjdGlvbiwgY29tbWFuZCwgYXJncy4uLlxuXG4gIGdldERpbWVuc2lvbnM6IC0+XG4gICAgW3gsIHldID0gQGJyb3dzZXJXaW5kb3cuZ2V0UG9zaXRpb24oKVxuICAgIFt3aWR0aCwgaGVpZ2h0XSA9IEBicm93c2VyV2luZG93LmdldFNpemUoKVxuICAgIHt4LCB5LCB3aWR0aCwgaGVpZ2h0fVxuXG4gIHNob3VsZEFkZEN1c3RvbVRpdGxlQmFyOiAtPlxuICAgIG5vdCBAaXNTcGVjIGFuZFxuICAgIHByb2Nlc3MucGxhdGZvcm0gaXMgJ2RhcndpbicgYW5kXG4gICAgQGF0b21BcHBsaWNhdGlvbi5jb25maWcuZ2V0KCdjb3JlLnRpdGxlQmFyJykgaXMgJ2N1c3RvbSdcblxuICBzaG91bGRBZGRDdXN0b21JbnNldFRpdGxlQmFyOiAtPlxuICAgIG5vdCBAaXNTcGVjIGFuZFxuICAgIHByb2Nlc3MucGxhdGZvcm0gaXMgJ2RhcndpbicgYW5kXG4gICAgQGF0b21BcHBsaWNhdGlvbi5jb25maWcuZ2V0KCdjb3JlLnRpdGxlQmFyJykgaXMgJ2N1c3RvbS1pbnNldCdcblxuICBzaG91bGRIaWRlVGl0bGVCYXI6IC0+XG4gICAgbm90IEBpc1NwZWMgYW5kXG4gICAgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnZGFyd2luJyBhbmRcbiAgICBAYXRvbUFwcGxpY2F0aW9uLmNvbmZpZy5nZXQoJ2NvcmUudGl0bGVCYXInKSBpcyAnaGlkZGVuJ1xuXG4gIGNsb3NlOiAtPiBAYnJvd3NlcldpbmRvdy5jbG9zZSgpXG5cbiAgZm9jdXM6IC0+IEBicm93c2VyV2luZG93LmZvY3VzKClcblxuICBtaW5pbWl6ZTogLT4gQGJyb3dzZXJXaW5kb3cubWluaW1pemUoKVxuXG4gIG1heGltaXplOiAtPiBAYnJvd3NlcldpbmRvdy5tYXhpbWl6ZSgpXG5cbiAgdW5tYXhpbWl6ZTogLT4gQGJyb3dzZXJXaW5kb3cudW5tYXhpbWl6ZSgpXG5cbiAgcmVzdG9yZTogLT4gQGJyb3dzZXJXaW5kb3cucmVzdG9yZSgpXG5cbiAgc2V0RnVsbFNjcmVlbjogKGZ1bGxTY3JlZW4pIC0+IEBicm93c2VyV2luZG93LnNldEZ1bGxTY3JlZW4oZnVsbFNjcmVlbilcblxuICBzZXRBdXRvSGlkZU1lbnVCYXI6IChhdXRvSGlkZU1lbnVCYXIpIC0+IEBicm93c2VyV2luZG93LnNldEF1dG9IaWRlTWVudUJhcihhdXRvSGlkZU1lbnVCYXIpXG5cbiAgaGFuZGxlc0F0b21Db21tYW5kczogLT5cbiAgICBub3QgQGlzU3BlY1dpbmRvdygpIGFuZCBAaXNXZWJWaWV3Rm9jdXNlZCgpXG5cbiAgaXNGb2N1c2VkOiAtPiBAYnJvd3NlcldpbmRvdy5pc0ZvY3VzZWQoKVxuXG4gIGlzTWF4aW1pemVkOiAtPiBAYnJvd3NlcldpbmRvdy5pc01heGltaXplZCgpXG5cbiAgaXNNaW5pbWl6ZWQ6IC0+IEBicm93c2VyV2luZG93LmlzTWluaW1pemVkKClcblxuICBpc1dlYlZpZXdGb2N1c2VkOiAtPiBAYnJvd3NlcldpbmRvdy5pc1dlYlZpZXdGb2N1c2VkKClcblxuICBpc1NwZWNXaW5kb3c6IC0+IEBpc1NwZWNcblxuICByZWxvYWQ6IC0+XG4gICAgQGxvYWRlZFByb21pc2UgPSBuZXcgUHJvbWlzZSgoQHJlc29sdmVMb2FkZWRQcm9taXNlKSA9PilcbiAgICBAc2F2ZVN0YXRlKCkudGhlbiA9PiBAYnJvd3NlcldpbmRvdy5yZWxvYWQoKVxuICAgIEBsb2FkZWRQcm9taXNlXG5cbiAgc2hvd1NhdmVEaWFsb2c6IChwYXJhbXMpIC0+XG4gICAgcGFyYW1zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICB0aXRsZTogJ1NhdmUgRmlsZScsXG4gICAgICBkZWZhdWx0UGF0aDogQHJlcHJlc2VudGVkRGlyZWN0b3J5UGF0aHNbMF1cbiAgICB9LCBwYXJhbXMpXG4gICAgZGlhbG9nLnNob3dTYXZlRGlhbG9nKEBicm93c2VyV2luZG93LCBwYXJhbXMpXG5cbiAgdG9nZ2xlRGV2VG9vbHM6IC0+IEBicm93c2VyV2luZG93LnRvZ2dsZURldlRvb2xzKClcblxuICBvcGVuRGV2VG9vbHM6IC0+IEBicm93c2VyV2luZG93Lm9wZW5EZXZUb29scygpXG5cbiAgY2xvc2VEZXZUb29sczogLT4gQGJyb3dzZXJXaW5kb3cuY2xvc2VEZXZUb29scygpXG5cbiAgc2V0RG9jdW1lbnRFZGl0ZWQ6IChkb2N1bWVudEVkaXRlZCkgLT4gQGJyb3dzZXJXaW5kb3cuc2V0RG9jdW1lbnRFZGl0ZWQoZG9jdW1lbnRFZGl0ZWQpXG5cbiAgc2V0UmVwcmVzZW50ZWRGaWxlbmFtZTogKHJlcHJlc2VudGVkRmlsZW5hbWUpIC0+IEBicm93c2VyV2luZG93LnNldFJlcHJlc2VudGVkRmlsZW5hbWUocmVwcmVzZW50ZWRGaWxlbmFtZSlcblxuICBzZXRSZXByZXNlbnRlZERpcmVjdG9yeVBhdGhzOiAoQHJlcHJlc2VudGVkRGlyZWN0b3J5UGF0aHMpIC0+XG4gICAgQHJlcHJlc2VudGVkRGlyZWN0b3J5UGF0aHMuc29ydCgpXG4gICAgQGF0b21BcHBsaWNhdGlvbi5zYXZlU3RhdGUoKVxuXG4gIGNvcHk6IC0+IEBicm93c2VyV2luZG93LmNvcHkoKVxuXG4gIGRpc2FibGVab29tOiAtPlxuICAgIEBicm93c2VyV2luZG93LndlYkNvbnRlbnRzLnNldFpvb21MZXZlbExpbWl0cygxLCAxKVxuIl19
