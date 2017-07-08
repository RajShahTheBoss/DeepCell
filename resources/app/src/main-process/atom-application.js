(function() {
  var ApplicationMenu, AtomApplication, AtomProtocolHandler, AtomWindow, AutoUpdateManager, BrowserWindow, CompositeDisposable, Config, ConfigSchema, Disposable, EventEmitter, FileRecoveryService, FindParentDir, LocationSuffixRegExp, Menu, Resolve, StorageFolder, _, app, dialog, fs, ipcHelpers, ipcMain, net, os, path, ref, ref1, screen, shell, url,
    slice = [].slice;

  AtomWindow = require('./atom-window');

  ApplicationMenu = require('./application-menu');

  AtomProtocolHandler = require('./atom-protocol-handler');

  AutoUpdateManager = require('./auto-update-manager');

  StorageFolder = require('../storage-folder');

  Config = require('../config');

  FileRecoveryService = require('./file-recovery-service');

  ipcHelpers = require('../ipc-helpers');

  ref = require('electron'), BrowserWindow = ref.BrowserWindow, Menu = ref.Menu, app = ref.app, dialog = ref.dialog, ipcMain = ref.ipcMain, shell = ref.shell, screen = ref.screen;

  ref1 = require('event-kit'), CompositeDisposable = ref1.CompositeDisposable, Disposable = ref1.Disposable;

  fs = require('fs-plus');

  path = require('path');

  os = require('os');

  net = require('net');

  url = require('url');

  EventEmitter = require('events').EventEmitter;

  _ = require('underscore-plus');

  FindParentDir = null;

  Resolve = null;

  ConfigSchema = require('../config-schema');

  LocationSuffixRegExp = /(:\d+)(:\d+)?$/;

  module.exports = AtomApplication = (function() {
    Object.assign(AtomApplication.prototype, EventEmitter.prototype);

    AtomApplication.open = function(options) {
      var client, userNameSafe;
      if (options.socketPath == null) {
        if (process.platform === 'win32') {
          userNameSafe = new Buffer(process.env.USERNAME).toString('base64');
          options.socketPath = "\\\\.\\pipe\\atom-" + options.version + "-" + userNameSafe + "-" + process.arch + "-sock";
        } else {
          options.socketPath = path.join(os.tmpdir(), "atom-" + options.version + "-" + process.env.USER + ".sock");
        }
      }
      if ((process.platform !== 'win32' && !fs.existsSync(options.socketPath)) || options.test || options.benchmark || options.benchmarkTest) {
        new AtomApplication(options).initialize(options);
        return;
      }
      client = net.connect({
        path: options.socketPath
      }, function() {
        return client.write(JSON.stringify(options), function() {
          client.end();
          return app.quit();
        });
      });
      return client.on('error', function() {
        return new AtomApplication(options).initialize(options);
      });
    };

    AtomApplication.prototype.windows = null;

    AtomApplication.prototype.applicationMenu = null;

    AtomApplication.prototype.atomProtocolHandler = null;

    AtomApplication.prototype.resourcePath = null;

    AtomApplication.prototype.version = null;

    AtomApplication.prototype.quitting = false;

    AtomApplication.prototype.exit = function(status) {
      return app.exit(status);
    };

    function AtomApplication(options) {
      this.resourcePath = options.resourcePath, this.devResourcePath = options.devResourcePath, this.version = options.version, this.devMode = options.devMode, this.safeMode = options.safeMode, this.socketPath = options.socketPath, this.logFile = options.logFile, this.userDataDir = options.userDataDir;
      if (options.test || options.benchmark || options.benchmarkTest) {
        this.socketPath = null;
      }
      this.pidsToOpenWindows = {};
      this.windows = [];
      this.config = new Config({
        enablePersistence: true
      });
      this.config.setSchema(null, {
        type: 'object',
        properties: _.clone(ConfigSchema)
      });
      ConfigSchema.projectHome = {
        type: 'string',
        "default": path.join(fs.getHomeDirectory(), 'github'),
        description: 'The directory where projects are assumed to be located. Packages created using the Package Generator will be stored here by default.'
      };
      this.config.initialize({
        configDirPath: process.env.ATOM_HOME,
        resourcePath: this.resourcePath,
        projectHomeSchema: ConfigSchema.projectHome
      });
      this.config.load();
      this.fileRecoveryService = new FileRecoveryService(path.join(process.env.ATOM_HOME, "recovery"));
      this.storageFolder = new StorageFolder(process.env.ATOM_HOME);
      this.autoUpdateManager = new AutoUpdateManager(this.version, options.test || options.benchmark || options.benchmarkTest, this.config);
      this.disposable = new CompositeDisposable;
      this.handleEvents();
    }

    AtomApplication.prototype.initialize = function(options) {
      global.atomApplication = this;
      if (process.platform === 'darwin' && this.config.get('core.useCustomTitleBar')) {
        this.config.unset('core.useCustomTitleBar');
        this.config.set('core.titleBar', 'custom');
      }
      this.config.onDidChange('core.titleBar', this.promptForRestart.bind(this));
      process.nextTick((function(_this) {
        return function() {
          return _this.autoUpdateManager.initialize();
        };
      })(this));
      this.applicationMenu = new ApplicationMenu(this.version, this.autoUpdateManager);
      this.atomProtocolHandler = new AtomProtocolHandler(this.resourcePath, this.safeMode);
      this.listenForArgumentsFromNewProcess();
      this.setupDockMenu();
      return this.launch(options);
    };

    AtomApplication.prototype.destroy = function() {
      var windowsClosePromises;
      windowsClosePromises = this.windows.map(function(window) {
        window.close();
        return window.closedPromise;
      });
      return Promise.all(windowsClosePromises).then((function(_this) {
        return function() {
          return _this.disposable.dispose();
        };
      })(this));
    };

    AtomApplication.prototype.launch = function(options) {
      var ref2, ref3;
      if (((ref2 = options.pathsToOpen) != null ? ref2.length : void 0) > 0 || ((ref3 = options.urlsToOpen) != null ? ref3.length : void 0) > 0 || options.test || options.benchmark || options.benchmarkTest) {
        if (this.config.get('core.restorePreviousWindowsOnStart') === 'always') {
          this.loadState(_.deepClone(options));
        }
        return this.openWithOptions(options);
      } else {
        return this.loadState(options) || this.openPath(options);
      }
    };

    AtomApplication.prototype.openWithOptions = function(options) {
      var addToLastWindow, benchmark, benchmarkTest, clearWindowState, devMode, env, executedFrom, i, initialPaths, len, logFile, newWindow, pathsToOpen, pidToKillWhenClosed, profileStartup, results, safeMode, test, timeout, urlToOpen, urlsToOpen;
      initialPaths = options.initialPaths, pathsToOpen = options.pathsToOpen, executedFrom = options.executedFrom, urlsToOpen = options.urlsToOpen, benchmark = options.benchmark, benchmarkTest = options.benchmarkTest, test = options.test, pidToKillWhenClosed = options.pidToKillWhenClosed, devMode = options.devMode, safeMode = options.safeMode, newWindow = options.newWindow, logFile = options.logFile, profileStartup = options.profileStartup, timeout = options.timeout, clearWindowState = options.clearWindowState, addToLastWindow = options.addToLastWindow, env = options.env;
      app.focus();
      if (test) {
        return this.runTests({
          headless: true,
          devMode: devMode,
          resourcePath: this.resourcePath,
          executedFrom: executedFrom,
          pathsToOpen: pathsToOpen,
          logFile: logFile,
          timeout: timeout,
          env: env
        });
      } else if (benchmark || benchmarkTest) {
        return this.runBenchmarks({
          headless: true,
          test: benchmarkTest,
          resourcePath: this.resourcePath,
          executedFrom: executedFrom,
          pathsToOpen: pathsToOpen,
          timeout: timeout,
          env: env
        });
      } else if (pathsToOpen.length > 0) {
        return this.openPaths({
          initialPaths: initialPaths,
          pathsToOpen: pathsToOpen,
          executedFrom: executedFrom,
          pidToKillWhenClosed: pidToKillWhenClosed,
          newWindow: newWindow,
          devMode: devMode,
          safeMode: safeMode,
          profileStartup: profileStartup,
          clearWindowState: clearWindowState,
          addToLastWindow: addToLastWindow,
          env: env
        });
      } else if (urlsToOpen.length > 0) {
        results = [];
        for (i = 0, len = urlsToOpen.length; i < len; i++) {
          urlToOpen = urlsToOpen[i];
          results.push(this.openUrl({
            urlToOpen: urlToOpen,
            devMode: devMode,
            safeMode: safeMode,
            env: env
          }));
        }
        return results;
      } else {
        return this.openPath({
          initialPaths: initialPaths,
          pidToKillWhenClosed: pidToKillWhenClosed,
          newWindow: newWindow,
          devMode: devMode,
          safeMode: safeMode,
          profileStartup: profileStartup,
          clearWindowState: clearWindowState,
          addToLastWindow: addToLastWindow,
          env: env
        });
      }
    };

    AtomApplication.prototype.removeWindow = function(window) {
      var ref2, ref3;
      this.windows.splice(this.windows.indexOf(window), 1);
      if (this.windows.length === 0) {
        if ((ref2 = this.applicationMenu) != null) {
          ref2.enableWindowSpecificItems(false);
        }
        if ((ref3 = process.platform) === 'win32' || ref3 === 'linux') {
          app.quit();
          return;
        }
      }
      if (!window.isSpec) {
        return this.saveState(true);
      }
    };

    AtomApplication.prototype.addWindow = function(window) {
      var blurHandler, focusHandler, ref2;
      this.windows.push(window);
      if ((ref2 = this.applicationMenu) != null) {
        ref2.addWindow(window.browserWindow);
      }
      window.once('window:loaded', (function(_this) {
        return function() {
          var ref3;
          return (ref3 = _this.autoUpdateManager) != null ? ref3.emitUpdateAvailableEvent(window) : void 0;
        };
      })(this));
      if (!window.isSpec) {
        focusHandler = (function(_this) {
          return function() {
            return _this.lastFocusedWindow = window;
          };
        })(this);
        blurHandler = (function(_this) {
          return function() {
            return _this.saveState(false);
          };
        })(this);
        window.browserWindow.on('focus', focusHandler);
        window.browserWindow.on('blur', blurHandler);
        window.browserWindow.once('closed', (function(_this) {
          return function() {
            if (window === _this.lastFocusedWindow) {
              _this.lastFocusedWindow = null;
            }
            window.browserWindow.removeListener('focus', focusHandler);
            return window.browserWindow.removeListener('blur', blurHandler);
          };
        })(this));
        return window.browserWindow.webContents.once('did-finish-load', (function(_this) {
          return function() {
            return _this.saveState(false);
          };
        })(this));
      }
    };

    AtomApplication.prototype.listenForArgumentsFromNewProcess = function() {
      var server;
      if (this.socketPath == null) {
        return;
      }
      this.deleteSocketFile();
      server = net.createServer((function(_this) {
        return function(connection) {
          var data;
          data = '';
          connection.on('data', function(chunk) {
            return data = data + chunk;
          });
          return connection.on('end', function() {
            var options;
            options = JSON.parse(data);
            return _this.openWithOptions(options);
          });
        };
      })(this));
      server.listen(this.socketPath);
      return server.on('error', function(error) {
        return console.error('Application server failed', error);
      });
    };

    AtomApplication.prototype.deleteSocketFile = function() {
      var error;
      if (process.platform === 'win32' || (this.socketPath == null)) {
        return;
      }
      if (fs.existsSync(this.socketPath)) {
        try {
          return fs.unlinkSync(this.socketPath);
        } catch (error1) {
          error = error1;
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }
    };

    AtomApplication.prototype.handleEvents = function() {
      var clipboard, getLoadSettings;
      getLoadSettings = (function(_this) {
        return function() {
          var ref2, ref3;
          return {
            devMode: (ref2 = _this.focusedWindow()) != null ? ref2.devMode : void 0,
            safeMode: (ref3 = _this.focusedWindow()) != null ? ref3.safeMode : void 0
          };
        };
      })(this);
      this.on('application:quit', function() {
        return app.quit();
      });
      this.on('application:new-window', function() {
        return this.openPath(getLoadSettings());
      });
      this.on('application:new-file', function() {
        var ref2;
        return ((ref2 = this.focusedWindow()) != null ? ref2 : this).openPath();
      });
      this.on('application:open-dev', function() {
        return this.promptForPathToOpen('all', {
          devMode: true
        });
      });
      this.on('application:open-safe', function() {
        return this.promptForPathToOpen('all', {
          safeMode: true
        });
      });
      this.on('application:inspect', function(arg) {
        var atomWindow, x, y;
        x = arg.x, y = arg.y, atomWindow = arg.atomWindow;
        if (atomWindow == null) {
          atomWindow = this.focusedWindow();
        }
        return atomWindow != null ? atomWindow.browserWindow.inspectElement(x, y) : void 0;
      });
      this.on('application:open-documentation', function() {
        return shell.openExternal('http://flight-manual.atom.io/');
      });
      this.on('application:open-discussions', function() {
        return shell.openExternal('https://discuss.atom.io');
      });
      this.on('application:open-faq', function() {
        return shell.openExternal('https://atom.io/faq');
      });
      this.on('application:open-terms-of-use', function() {
        return shell.openExternal('https://atom.io/terms');
      });
      this.on('application:report-issue', function() {
        return shell.openExternal('https://github.com/atom/atom/blob/master/CONTRIBUTING.md#submitting-issues');
      });
      this.on('application:search-issues', function() {
        return shell.openExternal('https://github.com/issues?q=+is%3Aissue+user%3Aatom');
      });
      this.on('application:install-update', (function(_this) {
        return function() {
          _this.quitting = true;
          return _this.autoUpdateManager.install();
        };
      })(this));
      this.on('application:check-for-update', (function(_this) {
        return function() {
          return _this.autoUpdateManager.check();
        };
      })(this));
      if (process.platform === 'darwin') {
        this.on('application:bring-all-windows-to-front', function() {
          return Menu.sendActionToFirstResponder('arrangeInFront:');
        });
        this.on('application:hide', function() {
          return Menu.sendActionToFirstResponder('hide:');
        });
        this.on('application:hide-other-applications', function() {
          return Menu.sendActionToFirstResponder('hideOtherApplications:');
        });
        this.on('application:minimize', function() {
          return Menu.sendActionToFirstResponder('performMiniaturize:');
        });
        this.on('application:unhide-all-applications', function() {
          return Menu.sendActionToFirstResponder('unhideAllApplications:');
        });
        this.on('application:zoom', function() {
          return Menu.sendActionToFirstResponder('zoom:');
        });
      } else {
        this.on('application:minimize', function() {
          var ref2;
          return (ref2 = this.focusedWindow()) != null ? ref2.minimize() : void 0;
        });
        this.on('application:zoom', function() {
          var ref2;
          return (ref2 = this.focusedWindow()) != null ? ref2.maximize() : void 0;
        });
      }
      this.openPathOnEvent('application:about', 'atom://about');
      this.openPathOnEvent('application:show-settings', 'atom://config');
      this.openPathOnEvent('application:open-your-config', 'atom://.atom/config');
      this.openPathOnEvent('application:open-your-init-script', 'atom://.atom/init-script');
      this.openPathOnEvent('application:open-your-keymap', 'atom://.atom/keymap');
      this.openPathOnEvent('application:open-your-snippets', 'atom://.atom/snippets');
      this.openPathOnEvent('application:open-your-stylesheet', 'atom://.atom/stylesheet');
      this.openPathOnEvent('application:open-license', path.join(process.resourcesPath, 'LICENSE.md'));
      this.disposable.add(ipcHelpers.on(app, 'before-quit', (function(_this) {
        return function(event) {
          if (!_this.quitting) {
            event.preventDefault();
            _this.quitting = true;
            return Promise.all(_this.windows.map(function(window) {
              return window.saveState();
            })).then(function() {
              return app.quit();
            });
          }
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(app, 'will-quit', (function(_this) {
        return function() {
          _this.killAllProcesses();
          return _this.deleteSocketFile();
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(app, 'open-file', (function(_this) {
        return function(event, pathToOpen) {
          event.preventDefault();
          return _this.openPath({
            pathToOpen: pathToOpen
          });
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(app, 'open-url', (function(_this) {
        return function(event, urlToOpen) {
          event.preventDefault();
          return _this.openUrl({
            urlToOpen: urlToOpen,
            devMode: _this.devMode,
            safeMode: _this.safeMode
          });
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(app, 'activate', (function(_this) {
        return function(event, hasVisibleWindows) {
          if (!hasVisibleWindows) {
            if (event != null) {
              event.preventDefault();
            }
            return _this.emit('application:new-window');
          }
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'restart-application', (function(_this) {
        return function() {
          return _this.restart();
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'resolve-proxy', function(event, requestId, url) {
        return event.sender.session.resolveProxy(url, function(proxy) {
          if (!event.sender.isDestroyed()) {
            return event.sender.send('did-resolve-proxy', requestId, proxy);
          }
        });
      }));
      this.disposable.add(ipcHelpers.on(ipcMain, 'did-change-history-manager', (function(_this) {
        return function(event) {
          var atomWindow, i, len, ref2, results, webContents;
          ref2 = _this.windows;
          results = [];
          for (i = 0, len = ref2.length; i < len; i++) {
            atomWindow = ref2[i];
            webContents = atomWindow.browserWindow.webContents;
            if (webContents !== event.sender) {
              results.push(webContents.send('did-change-history-manager'));
            } else {
              results.push(void 0);
            }
          }
          return results;
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'open', (function(_this) {
        return function(event, options) {
          var ref2, window;
          window = _this.atomWindowForEvent(event);
          if (options != null) {
            if (typeof options.pathsToOpen === 'string') {
              options.pathsToOpen = [options.pathsToOpen];
            }
            if (((ref2 = options.pathsToOpen) != null ? ref2.length : void 0) > 0) {
              options.window = window;
              return _this.openPaths(options);
            } else {
              return new AtomWindow(_this, _this.fileRecoveryService, options);
            }
          } else {
            return _this.promptForPathToOpen('all', {
              window: window
            });
          }
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'update-application-menu', (function(_this) {
        return function(event, template, keystrokesByCommand) {
          var ref2, win;
          win = BrowserWindow.fromWebContents(event.sender);
          return (ref2 = _this.applicationMenu) != null ? ref2.update(win, template, keystrokesByCommand) : void 0;
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'run-package-specs', (function(_this) {
        return function(event, packageSpecPath) {
          return _this.runTests({
            resourcePath: _this.devResourcePath,
            pathsToOpen: [packageSpecPath],
            headless: false
          });
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'run-benchmarks', (function(_this) {
        return function(event, benchmarksPath) {
          return _this.runBenchmarks({
            resourcePath: _this.devResourcePath,
            pathsToOpen: [benchmarksPath],
            headless: false,
            test: false
          });
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'command', (function(_this) {
        return function(event, command) {
          return _this.emit(command);
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'open-command', (function(_this) {
        return function() {
          var args, command, defaultPath, event;
          event = arguments[0], command = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
          if (args.length > 0) {
            defaultPath = args[0];
          }
          switch (command) {
            case 'application:open':
              return _this.promptForPathToOpen('all', getLoadSettings(), defaultPath);
            case 'application:open-file':
              return _this.promptForPathToOpen('file', getLoadSettings(), defaultPath);
            case 'application:open-folder':
              return _this.promptForPathToOpen('folder', getLoadSettings(), defaultPath);
            default:
              return console.log("Invalid open-command received: " + command);
          }
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'window-command', function() {
        var args, command, event, win;
        event = arguments[0], command = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
        win = BrowserWindow.fromWebContents(event.sender);
        return win.emit.apply(win, [command].concat(slice.call(args)));
      }));
      this.disposable.add(ipcHelpers.respondTo('window-method', (function(_this) {
        return function() {
          var args, browserWindow, method, ref2;
          browserWindow = arguments[0], method = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
          return (ref2 = _this.atomWindowForBrowserWindow(browserWindow)) != null ? ref2[method].apply(ref2, args) : void 0;
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'pick-folder', (function(_this) {
        return function(event, responseChannel) {
          return _this.promptForPath("folder", function(selectedPaths) {
            return event.sender.send(responseChannel, selectedPaths);
          });
        };
      })(this)));
      this.disposable.add(ipcHelpers.respondTo('set-window-size', function(win, width, height) {
        return win.setSize(width, height);
      }));
      this.disposable.add(ipcHelpers.respondTo('set-window-position', function(win, x, y) {
        return win.setPosition(x, y);
      }));
      this.disposable.add(ipcHelpers.respondTo('center-window', function(win) {
        return win.center();
      }));
      this.disposable.add(ipcHelpers.respondTo('focus-window', function(win) {
        return win.focus();
      }));
      this.disposable.add(ipcHelpers.respondTo('show-window', function(win) {
        return win.show();
      }));
      this.disposable.add(ipcHelpers.respondTo('hide-window', function(win) {
        return win.hide();
      }));
      this.disposable.add(ipcHelpers.respondTo('get-temporary-window-state', function(win) {
        return win.temporaryState;
      }));
      this.disposable.add(ipcHelpers.respondTo('set-temporary-window-state', function(win, state) {
        return win.temporaryState = state;
      }));
      this.disposable.add(ipcHelpers.on(ipcMain, 'did-cancel-window-unload', (function(_this) {
        return function() {
          var i, len, ref2, results, window;
          _this.quitting = false;
          ref2 = _this.windows;
          results = [];
          for (i = 0, len = ref2.length; i < len; i++) {
            window = ref2[i];
            results.push(window.didCancelWindowUnload());
          }
          return results;
        };
      })(this)));
      clipboard = require('../safe-clipboard');
      this.disposable.add(ipcHelpers.on(ipcMain, 'write-text-to-selection-clipboard', function(event, selectedText) {
        return clipboard.writeText(selectedText, 'selection');
      }));
      this.disposable.add(ipcHelpers.on(ipcMain, 'write-to-stdout', function(event, output) {
        return process.stdout.write(output);
      }));
      this.disposable.add(ipcHelpers.on(ipcMain, 'write-to-stderr', function(event, output) {
        return process.stderr.write(output);
      }));
      this.disposable.add(ipcHelpers.on(ipcMain, 'add-recent-document', function(event, filename) {
        return app.addRecentDocument(filename);
      }));
      this.disposable.add(ipcHelpers.on(ipcMain, 'execute-javascript-in-dev-tools', function(event, code) {
        var ref2;
        return (ref2 = event.sender.devToolsWebContents) != null ? ref2.executeJavaScript(code) : void 0;
      }));
      this.disposable.add(ipcHelpers.on(ipcMain, 'get-auto-update-manager-state', (function(_this) {
        return function(event) {
          return event.returnValue = _this.autoUpdateManager.getState();
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'get-auto-update-manager-error', (function(_this) {
        return function(event) {
          return event.returnValue = _this.autoUpdateManager.getErrorMessage();
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'will-save-path', (function(_this) {
        return function(event, path) {
          _this.fileRecoveryService.willSavePath(_this.atomWindowForEvent(event), path);
          return event.returnValue = true;
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'did-save-path', (function(_this) {
        return function(event, path) {
          _this.fileRecoveryService.didSavePath(_this.atomWindowForEvent(event), path);
          return event.returnValue = true;
        };
      })(this)));
      this.disposable.add(ipcHelpers.on(ipcMain, 'did-change-paths', (function(_this) {
        return function() {
          return _this.saveState(false);
        };
      })(this)));
      return this.disposable.add(this.disableZoomOnDisplayChange());
    };

    AtomApplication.prototype.setupDockMenu = function() {
      var dockMenu;
      if (process.platform === 'darwin') {
        dockMenu = Menu.buildFromTemplate([
          {
            label: 'New Window',
            click: (function(_this) {
              return function() {
                return _this.emit('application:new-window');
              };
            })(this)
          }
        ]);
        return app.dock.setMenu(dockMenu);
      }
    };

    AtomApplication.prototype.sendCommand = function() {
      var args, command, focusedWindow;
      command = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      if (!this.emit.apply(this, [command].concat(slice.call(args)))) {
        focusedWindow = this.focusedWindow();
        if (focusedWindow != null) {
          return focusedWindow.sendCommand.apply(focusedWindow, [command].concat(slice.call(args)));
        } else {
          return this.sendCommandToFirstResponder(command);
        }
      }
    };

    AtomApplication.prototype.sendCommandToWindow = function() {
      var args, atomWindow, command;
      command = arguments[0], atomWindow = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
      if (!this.emit.apply(this, [command].concat(slice.call(args)))) {
        if (atomWindow != null) {
          return atomWindow.sendCommand.apply(atomWindow, [command].concat(slice.call(args)));
        } else {
          return this.sendCommandToFirstResponder(command);
        }
      }
    };

    AtomApplication.prototype.sendCommandToFirstResponder = function(command) {
      if (process.platform !== 'darwin') {
        return false;
      }
      switch (command) {
        case 'core:undo':
          Menu.sendActionToFirstResponder('undo:');
          break;
        case 'core:redo':
          Menu.sendActionToFirstResponder('redo:');
          break;
        case 'core:copy':
          Menu.sendActionToFirstResponder('copy:');
          break;
        case 'core:cut':
          Menu.sendActionToFirstResponder('cut:');
          break;
        case 'core:paste':
          Menu.sendActionToFirstResponder('paste:');
          break;
        case 'core:select-all':
          Menu.sendActionToFirstResponder('selectAll:');
          break;
        default:
          return false;
      }
      return true;
    };

    AtomApplication.prototype.openPathOnEvent = function(eventName, pathToOpen) {
      return this.on(eventName, function() {
        var window;
        if (window = this.focusedWindow()) {
          return window.openPath(pathToOpen);
        } else {
          return this.openPath({
            pathToOpen: pathToOpen
          });
        }
      });
    };

    AtomApplication.prototype.windowForPaths = function(pathsToOpen, devMode) {
      return _.find(this.windows, function(atomWindow) {
        return atomWindow.devMode === devMode && atomWindow.containsPaths(pathsToOpen);
      });
    };

    AtomApplication.prototype.atomWindowForEvent = function(arg) {
      var sender;
      sender = arg.sender;
      return this.atomWindowForBrowserWindow(BrowserWindow.fromWebContents(sender));
    };

    AtomApplication.prototype.atomWindowForBrowserWindow = function(browserWindow) {
      return this.windows.find(function(atomWindow) {
        return atomWindow.browserWindow === browserWindow;
      });
    };

    AtomApplication.prototype.focusedWindow = function() {
      return _.find(this.windows, function(atomWindow) {
        return atomWindow.isFocused();
      });
    };

    AtomApplication.prototype.getWindowOffsetForCurrentPlatform = function() {
      var offsetByPlatform, ref2;
      offsetByPlatform = {
        darwin: 22,
        win32: 26
      };
      return (ref2 = offsetByPlatform[process.platform]) != null ? ref2 : 0;
    };

    AtomApplication.prototype.getDimensionsForNewWindow = function() {
      var dimensions, offset, ref2, ref3, ref4, ref5;
      if ((ref2 = (ref3 = this.focusedWindow()) != null ? ref3 : this.lastFocusedWindow) != null ? ref2.isMaximized() : void 0) {
        return;
      }
      dimensions = (ref4 = (ref5 = this.focusedWindow()) != null ? ref5 : this.lastFocusedWindow) != null ? ref4.getDimensions() : void 0;
      offset = this.getWindowOffsetForCurrentPlatform();
      if ((dimensions != null) && (offset != null)) {
        dimensions.x += offset;
        dimensions.y += offset;
      }
      return dimensions;
    };

    AtomApplication.prototype.openPath = function(arg) {
      var addToLastWindow, clearWindowState, devMode, env, initialPaths, newWindow, pathToOpen, pidToKillWhenClosed, profileStartup, ref2, safeMode, window;
      ref2 = arg != null ? arg : {}, initialPaths = ref2.initialPaths, pathToOpen = ref2.pathToOpen, pidToKillWhenClosed = ref2.pidToKillWhenClosed, newWindow = ref2.newWindow, devMode = ref2.devMode, safeMode = ref2.safeMode, profileStartup = ref2.profileStartup, window = ref2.window, clearWindowState = ref2.clearWindowState, addToLastWindow = ref2.addToLastWindow, env = ref2.env;
      return this.openPaths({
        initialPaths: initialPaths,
        pathsToOpen: [pathToOpen],
        pidToKillWhenClosed: pidToKillWhenClosed,
        newWindow: newWindow,
        devMode: devMode,
        safeMode: safeMode,
        profileStartup: profileStartup,
        window: window,
        clearWindowState: clearWindowState,
        addToLastWindow: addToLastWindow,
        env: env
      });
    };

    AtomApplication.prototype.openPaths = function(arg) {
      var addToLastWindow, clearWindowState, currentWindow, devMode, env, executedFrom, existingWindow, initialPaths, locationToOpen, locationsToOpen, newWindow, openedWindow, pathToOpen, pathsToOpen, pidToKillWhenClosed, profileStartup, ref2, resourcePath, safeMode, stats, window, windowDimensions, windowInitializationScript;
      ref2 = arg != null ? arg : {}, initialPaths = ref2.initialPaths, pathsToOpen = ref2.pathsToOpen, executedFrom = ref2.executedFrom, pidToKillWhenClosed = ref2.pidToKillWhenClosed, newWindow = ref2.newWindow, devMode = ref2.devMode, safeMode = ref2.safeMode, windowDimensions = ref2.windowDimensions, profileStartup = ref2.profileStartup, window = ref2.window, clearWindowState = ref2.clearWindowState, addToLastWindow = ref2.addToLastWindow, env = ref2.env;
      if ((pathsToOpen == null) || pathsToOpen.length === 0) {
        return;
      }
      if (env == null) {
        env = process.env;
      }
      devMode = Boolean(devMode);
      safeMode = Boolean(safeMode);
      clearWindowState = Boolean(clearWindowState);
      locationsToOpen = (function() {
        var i, len, results;
        results = [];
        for (i = 0, len = pathsToOpen.length; i < len; i++) {
          pathToOpen = pathsToOpen[i];
          results.push(this.locationForPathToOpen(pathToOpen, executedFrom, addToLastWindow));
        }
        return results;
      }).call(this);
      pathsToOpen = (function() {
        var i, len, results;
        results = [];
        for (i = 0, len = locationsToOpen.length; i < len; i++) {
          locationToOpen = locationsToOpen[i];
          results.push(locationToOpen.pathToOpen);
        }
        return results;
      })();
      if (!(pidToKillWhenClosed || newWindow)) {
        existingWindow = this.windowForPaths(pathsToOpen, devMode);
        stats = (function() {
          var i, len, results;
          results = [];
          for (i = 0, len = pathsToOpen.length; i < len; i++) {
            pathToOpen = pathsToOpen[i];
            results.push(fs.statSyncNoException(pathToOpen));
          }
          return results;
        })();
        if (existingWindow == null) {
          if (currentWindow = window != null ? window : this.lastFocusedWindow) {
            if (addToLastWindow || currentWindow.devMode === devMode && (stats.every(function(stat) {
              return typeof stat.isFile === "function" ? stat.isFile() : void 0;
            }) || stats.some(function(stat) {
              return (typeof stat.isDirectory === "function" ? stat.isDirectory() : void 0) && !currentWindow.hasProjectPath();
            }))) {
              existingWindow = currentWindow;
            }
          }
        }
      }
      if (existingWindow != null) {
        openedWindow = existingWindow;
        openedWindow.openLocations(locationsToOpen);
        if (openedWindow.isMinimized()) {
          openedWindow.restore();
        } else {
          openedWindow.focus();
        }
        openedWindow.replaceEnvironment(env);
      } else {
        if (devMode) {
          try {
            windowInitializationScript = require.resolve(path.join(this.devResourcePath, 'src', 'initialize-application-window'));
            resourcePath = this.devResourcePath;
          } catch (error1) {}
        }
        if (windowInitializationScript == null) {
          windowInitializationScript = require.resolve('../initialize-application-window');
        }
        if (resourcePath == null) {
          resourcePath = this.resourcePath;
        }
        if (windowDimensions == null) {
          windowDimensions = this.getDimensionsForNewWindow();
        }
        openedWindow = new AtomWindow(this, this.fileRecoveryService, {
          initialPaths: initialPaths,
          locationsToOpen: locationsToOpen,
          windowInitializationScript: windowInitializationScript,
          resourcePath: resourcePath,
          devMode: devMode,
          safeMode: safeMode,
          windowDimensions: windowDimensions,
          profileStartup: profileStartup,
          clearWindowState: clearWindowState,
          env: env
        });
        openedWindow.focus();
        this.lastFocusedWindow = openedWindow;
      }
      if (pidToKillWhenClosed != null) {
        this.pidsToOpenWindows[pidToKillWhenClosed] = openedWindow;
      }
      openedWindow.browserWindow.once('closed', (function(_this) {
        return function() {
          return _this.killProcessForWindow(openedWindow);
        };
      })(this));
      return openedWindow;
    };

    AtomApplication.prototype.killAllProcesses = function() {
      var pid;
      for (pid in this.pidsToOpenWindows) {
        this.killProcess(pid);
      }
    };

    AtomApplication.prototype.killProcessForWindow = function(openedWindow) {
      var pid, ref2, trackedWindow;
      ref2 = this.pidsToOpenWindows;
      for (pid in ref2) {
        trackedWindow = ref2[pid];
        if (trackedWindow === openedWindow) {
          this.killProcess(pid);
        }
      }
    };

    AtomApplication.prototype.killProcess = function(pid) {
      var error, parsedPid, ref2;
      try {
        parsedPid = parseInt(pid);
        if (isFinite(parsedPid)) {
          process.kill(parsedPid);
        }
      } catch (error1) {
        error = error1;
        if (error.code !== 'ESRCH') {
          console.log("Killing process " + pid + " failed: " + ((ref2 = error.code) != null ? ref2 : error.message));
        }
      }
      return delete this.pidsToOpenWindows[pid];
    };

    AtomApplication.prototype.saveState = function(allowEmpty) {
      var i, len, ref2, states, window;
      if (allowEmpty == null) {
        allowEmpty = false;
      }
      if (this.quitting) {
        return;
      }
      states = [];
      ref2 = this.windows;
      for (i = 0, len = ref2.length; i < len; i++) {
        window = ref2[i];
        if (!window.isSpec) {
          states.push({
            initialPaths: window.representedDirectoryPaths
          });
        }
      }
      if (states.length > 0 || allowEmpty) {
        this.storageFolder.storeSync('application.json', states);
        return this.emit('application:did-save-state');
      }
    };

    AtomApplication.prototype.loadState = function(options) {
      var i, len, ref2, ref3, results, state, states;
      if (((ref2 = this.config.get('core.restorePreviousWindowsOnStart')) === 'yes' || ref2 === 'always') && ((ref3 = (states = this.storageFolder.load('application.json'))) != null ? ref3.length : void 0) > 0) {
        results = [];
        for (i = 0, len = states.length; i < len; i++) {
          state = states[i];
          results.push(this.openWithOptions(Object.assign(options, {
            initialPaths: state.initialPaths,
            pathsToOpen: state.initialPaths.filter(function(directoryPath) {
              return fs.isDirectorySync(directoryPath);
            }),
            urlsToOpen: [],
            devMode: this.devMode,
            safeMode: this.safeMode
          })));
        }
        return results;
      } else {
        return null;
      }
    };

    AtomApplication.prototype.openUrl = function(arg) {
      var PackageManager, devMode, env, pack, packageName, packagePath, safeMode, urlToOpen, windowDimensions, windowInitializationScript;
      urlToOpen = arg.urlToOpen, devMode = arg.devMode, safeMode = arg.safeMode, env = arg.env;
      if (this.packages == null) {
        PackageManager = require('../package-manager');
        this.packages = new PackageManager({});
        this.packages.initialize({
          configDirPath: process.env.ATOM_HOME,
          devMode: devMode,
          resourcePath: this.resourcePath
        });
      }
      packageName = url.parse(urlToOpen).host;
      pack = _.find(this.packages.getAvailablePackageMetadata(), function(arg1) {
        var name;
        name = arg1.name;
        return name === packageName;
      });
      if (pack != null) {
        if (pack.urlMain) {
          packagePath = this.packages.resolvePackagePath(packageName);
          windowInitializationScript = path.resolve(packagePath, pack.urlMain);
          windowDimensions = this.getDimensionsForNewWindow();
          return new AtomWindow(this, this.fileRecoveryService, {
            windowInitializationScript: windowInitializationScript,
            resourcePath: this.resourcePath,
            devMode: devMode,
            safeMode: safeMode,
            urlToOpen: urlToOpen,
            windowDimensions: windowDimensions,
            env: env
          });
        } else {
          return console.log("Package '" + pack.name + "' does not have a url main: " + urlToOpen);
        }
      } else {
        return console.log("Opening unknown url: " + urlToOpen);
      }
    };

    AtomApplication.prototype.runTests = function(arg) {
      var devMode, env, error, executedFrom, headless, i, isSpec, legacyTestRunnerPath, len, logFile, pathToOpen, pathsToOpen, resourcePath, safeMode, testPaths, testRunnerPath, timeout, timeoutHandler, timeoutInSeconds, windowInitializationScript;
      headless = arg.headless, resourcePath = arg.resourcePath, executedFrom = arg.executedFrom, pathsToOpen = arg.pathsToOpen, logFile = arg.logFile, safeMode = arg.safeMode, timeout = arg.timeout, env = arg.env;
      if (resourcePath !== this.resourcePath && !fs.existsSync(resourcePath)) {
        resourcePath = this.resourcePath;
      }
      timeoutInSeconds = Number.parseFloat(timeout);
      if (!Number.isNaN(timeoutInSeconds)) {
        timeoutHandler = function() {
          console.log("The test suite has timed out because it has been running for more than " + timeoutInSeconds + " seconds.");
          return process.exit(124);
        };
        setTimeout(timeoutHandler, timeoutInSeconds * 1000);
      }
      try {
        windowInitializationScript = require.resolve(path.resolve(this.devResourcePath, 'src', 'initialize-test-window'));
      } catch (error1) {
        error = error1;
        windowInitializationScript = require.resolve(path.resolve(__dirname, '..', '..', 'src', 'initialize-test-window'));
      }
      testPaths = [];
      if (pathsToOpen != null) {
        for (i = 0, len = pathsToOpen.length; i < len; i++) {
          pathToOpen = pathsToOpen[i];
          testPaths.push(path.resolve(executedFrom, fs.normalize(pathToOpen)));
        }
      }
      if (testPaths.length === 0) {
        process.stderr.write('Error: Specify at least one test path\n\n');
        process.exit(1);
      }
      legacyTestRunnerPath = this.resolveLegacyTestRunnerPath();
      testRunnerPath = this.resolveTestRunnerPath(testPaths[0]);
      devMode = true;
      isSpec = true;
      if (safeMode == null) {
        safeMode = false;
      }
      return new AtomWindow(this, this.fileRecoveryService, {
        windowInitializationScript: windowInitializationScript,
        resourcePath: resourcePath,
        headless: headless,
        isSpec: isSpec,
        devMode: devMode,
        testRunnerPath: testRunnerPath,
        legacyTestRunnerPath: legacyTestRunnerPath,
        testPaths: testPaths,
        logFile: logFile,
        safeMode: safeMode,
        env: env
      });
    };

    AtomApplication.prototype.runBenchmarks = function(arg) {
      var benchmarkPaths, devMode, env, error, executedFrom, headless, i, isSpec, len, pathToOpen, pathsToOpen, resourcePath, safeMode, test, windowInitializationScript;
      headless = arg.headless, test = arg.test, resourcePath = arg.resourcePath, executedFrom = arg.executedFrom, pathsToOpen = arg.pathsToOpen, env = arg.env;
      if (resourcePath !== this.resourcePath && !fs.existsSync(resourcePath)) {
        resourcePath = this.resourcePath;
      }
      try {
        windowInitializationScript = require.resolve(path.resolve(this.devResourcePath, 'src', 'initialize-benchmark-window'));
      } catch (error1) {
        error = error1;
        windowInitializationScript = require.resolve(path.resolve(__dirname, '..', '..', 'src', 'initialize-benchmark-window'));
      }
      benchmarkPaths = [];
      if (pathsToOpen != null) {
        for (i = 0, len = pathsToOpen.length; i < len; i++) {
          pathToOpen = pathsToOpen[i];
          benchmarkPaths.push(path.resolve(executedFrom, fs.normalize(pathToOpen)));
        }
      }
      if (benchmarkPaths.length === 0) {
        process.stderr.write('Error: Specify at least one benchmark path.\n\n');
        process.exit(1);
      }
      devMode = true;
      isSpec = true;
      safeMode = false;
      return new AtomWindow(this, this.fileRecoveryService, {
        windowInitializationScript: windowInitializationScript,
        resourcePath: resourcePath,
        headless: headless,
        test: test,
        isSpec: isSpec,
        devMode: devMode,
        benchmarkPaths: benchmarkPaths,
        safeMode: safeMode,
        env: env
      });
    };

    AtomApplication.prototype.resolveTestRunnerPath = function(testPath) {
      var packageMetadata, packageRoot, testRunnerPath;
      if (FindParentDir == null) {
        FindParentDir = require('find-parent-dir');
      }
      if (packageRoot = FindParentDir.sync(testPath, 'package.json')) {
        packageMetadata = require(path.join(packageRoot, 'package.json'));
        if (packageMetadata.atomTestRunner) {
          if (Resolve == null) {
            Resolve = require('resolve');
          }
          if (testRunnerPath = Resolve.sync(packageMetadata.atomTestRunner, {
            basedir: packageRoot,
            extensions: Object.keys(require.extensions)
          })) {
            return testRunnerPath;
          } else {
            process.stderr.write("Error: Could not resolve test runner path '" + packageMetadata.atomTestRunner + "'");
            process.exit(1);
          }
        }
      }
      return this.resolveLegacyTestRunnerPath();
    };

    AtomApplication.prototype.resolveLegacyTestRunnerPath = function() {
      var error;
      try {
        return require.resolve(path.resolve(this.devResourcePath, 'spec', 'jasmine-test-runner'));
      } catch (error1) {
        error = error1;
        return require.resolve(path.resolve(__dirname, '..', '..', 'spec', 'jasmine-test-runner'));
      }
    };

    AtomApplication.prototype.locationForPathToOpen = function(pathToOpen, executedFrom, forceAddToWindow) {
      var initialColumn, initialLine, match;
      if (executedFrom == null) {
        executedFrom = '';
      }
      if (!pathToOpen) {
        return {
          pathToOpen: pathToOpen
        };
      }
      pathToOpen = pathToOpen.replace(/[:\s]+$/, '');
      match = pathToOpen.match(LocationSuffixRegExp);
      if (match != null) {
        pathToOpen = pathToOpen.slice(0, -match[0].length);
        if (match[1]) {
          initialLine = Math.max(0, parseInt(match[1].slice(1)) - 1);
        }
        if (match[2]) {
          initialColumn = Math.max(0, parseInt(match[2].slice(1)) - 1);
        }
      } else {
        initialLine = initialColumn = null;
      }
      if (url.parse(pathToOpen).protocol == null) {
        pathToOpen = path.resolve(executedFrom, fs.normalize(pathToOpen));
      }
      return {
        pathToOpen: pathToOpen,
        initialLine: initialLine,
        initialColumn: initialColumn,
        forceAddToWindow: forceAddToWindow
      };
    };

    AtomApplication.prototype.promptForPathToOpen = function(type, arg, path) {
      var devMode, safeMode, window;
      devMode = arg.devMode, safeMode = arg.safeMode, window = arg.window;
      if (path == null) {
        path = null;
      }
      return this.promptForPath(type, ((function(_this) {
        return function(pathsToOpen) {
          return _this.openPaths({
            pathsToOpen: pathsToOpen,
            devMode: devMode,
            safeMode: safeMode,
            window: window
          });
        };
      })(this)), path);
    };

    AtomApplication.prototype.promptForPath = function(type, callback, path) {
      var openOptions, parentWindow, properties;
      properties = (function() {
        switch (type) {
          case 'file':
            return ['openFile'];
          case 'folder':
            return ['openDirectory'];
          case 'all':
            return ['openFile', 'openDirectory'];
          default:
            throw new Error(type + " is an invalid type for promptForPath");
        }
      })();
      parentWindow = process.platform === 'darwin' ? null : BrowserWindow.getFocusedWindow();
      openOptions = {
        properties: properties.concat(['multiSelections', 'createDirectory']),
        title: (function() {
          switch (type) {
            case 'file':
              return 'Open File';
            case 'folder':
              return 'Open Folder';
            default:
              return 'Open';
          }
        })()
      };
      if (path != null) {
        openOptions.defaultPath = path;
      }
      return dialog.showOpenDialog(parentWindow, openOptions, callback);
    };

    AtomApplication.prototype.promptForRestart = function() {
      var chosen;
      chosen = dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
        type: 'warning',
        title: 'Restart required',
        message: "You will need to restart Atom for this change to take effect.",
        buttons: ['Restart Atom', 'Cancel']
      });
      if (chosen === 0) {
        return this.restart();
      }
    };

    AtomApplication.prototype.restart = function() {
      var args;
      args = [];
      if (this.safeMode) {
        args.push("--safe");
      }
      if (this.logFile != null) {
        args.push("--log-file=" + this.logFile);
      }
      if (this.socketPath != null) {
        args.push("--socket-path=" + this.socketPath);
      }
      if (this.userDataDir != null) {
        args.push("--user-data-dir=" + this.userDataDir);
      }
      if (this.devMode) {
        args.push('--dev');
        args.push("--resource-path=" + this.resourcePath);
      }
      app.relaunch({
        args: args
      });
      return app.quit();
    };

    AtomApplication.prototype.disableZoomOnDisplayChange = function() {
      var outerCallback;
      outerCallback = (function(_this) {
        return function() {
          var i, len, ref2, results, window;
          ref2 = _this.windows;
          results = [];
          for (i = 0, len = ref2.length; i < len; i++) {
            window = ref2[i];
            results.push(window.disableZoom());
          }
          return results;
        };
      })(this);
      screen.on('display-added', outerCallback);
      screen.on('display-removed', outerCallback);
      return new Disposable(function() {
        screen.removeListener('display-added', outerCallback);
        return screen.removeListener('display-removed', outerCallback);
      });
    };

    return AtomApplication;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21haW4tcHJvY2Vzcy9hdG9tLWFwcGxpY2F0aW9uLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsdVZBQUE7SUFBQTs7RUFBQSxVQUFBLEdBQWEsT0FBQSxDQUFRLGVBQVI7O0VBQ2IsZUFBQSxHQUFrQixPQUFBLENBQVEsb0JBQVI7O0VBQ2xCLG1CQUFBLEdBQXNCLE9BQUEsQ0FBUSx5QkFBUjs7RUFDdEIsaUJBQUEsR0FBb0IsT0FBQSxDQUFRLHVCQUFSOztFQUNwQixhQUFBLEdBQWdCLE9BQUEsQ0FBUSxtQkFBUjs7RUFDaEIsTUFBQSxHQUFTLE9BQUEsQ0FBUSxXQUFSOztFQUNULG1CQUFBLEdBQXNCLE9BQUEsQ0FBUSx5QkFBUjs7RUFDdEIsVUFBQSxHQUFhLE9BQUEsQ0FBUSxnQkFBUjs7RUFDYixNQUE2RCxPQUFBLENBQVEsVUFBUixDQUE3RCxFQUFDLGlDQUFELEVBQWdCLGVBQWhCLEVBQXNCLGFBQXRCLEVBQTJCLG1CQUEzQixFQUFtQyxxQkFBbkMsRUFBNEMsaUJBQTVDLEVBQW1EOztFQUNuRCxPQUFvQyxPQUFBLENBQVEsV0FBUixDQUFwQyxFQUFDLDhDQUFELEVBQXNCOztFQUN0QixFQUFBLEdBQUssT0FBQSxDQUFRLFNBQVI7O0VBQ0wsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLEVBQUEsR0FBSyxPQUFBLENBQVEsSUFBUjs7RUFDTCxHQUFBLEdBQU0sT0FBQSxDQUFRLEtBQVI7O0VBQ04sR0FBQSxHQUFNLE9BQUEsQ0FBUSxLQUFSOztFQUNMLGVBQWdCLE9BQUEsQ0FBUSxRQUFSOztFQUNqQixDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLGFBQUEsR0FBZ0I7O0VBQ2hCLE9BQUEsR0FBVTs7RUFDVixZQUFBLEdBQWUsT0FBQSxDQUFRLGtCQUFSOztFQUVmLG9CQUFB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ZUFBVixFQUEyQixhQUEzQjtNQUNBLE1BQU0sQ0FBQyxFQUFQLENBQVUsaUJBQVYsRUFBNkIsYUFBN0I7YUFDSSxJQUFBLFVBQUEsQ0FBVyxTQUFBO1FBQ2IsTUFBTSxDQUFDLGNBQVAsQ0FBc0IsZUFBdEIsRUFBdUMsYUFBdkM7ZUFDQSxNQUFNLENBQUMsY0FBUCxDQUFzQixpQkFBdEIsRUFBeUMsYUFBekM7TUFGYSxDQUFYO0lBVnNCOzs7OztBQXAwQjlCIiwic291cmNlc0NvbnRlbnQiOlsiQXRvbVdpbmRvdyA9IHJlcXVpcmUgJy4vYXRvbS13aW5kb3cnXG5BcHBsaWNhdGlvbk1lbnUgPSByZXF1aXJlICcuL2FwcGxpY2F0aW9uLW1lbnUnXG5BdG9tUHJvdG9jb2xIYW5kbGVyID0gcmVxdWlyZSAnLi9hdG9tLXByb3RvY29sLWhhbmRsZXInXG5BdXRvVXBkYXRlTWFuYWdlciA9IHJlcXVpcmUgJy4vYXV0by11cGRhdGUtbWFuYWdlcidcblN0b3JhZ2VGb2xkZXIgPSByZXF1aXJlICcuLi9zdG9yYWdlLWZvbGRlcidcbkNvbmZpZyA9IHJlcXVpcmUgJy4uL2NvbmZpZydcbkZpbGVSZWNvdmVyeVNlcnZpY2UgPSByZXF1aXJlICcuL2ZpbGUtcmVjb3Zlcnktc2VydmljZSdcbmlwY0hlbHBlcnMgPSByZXF1aXJlICcuLi9pcGMtaGVscGVycydcbntCcm93c2VyV2luZG93LCBNZW51LCBhcHAsIGRpYWxvZywgaXBjTWFpbiwgc2hlbGwsIHNjcmVlbn0gPSByZXF1aXJlICdlbGVjdHJvbidcbntDb21wb3NpdGVEaXNwb3NhYmxlLCBEaXNwb3NhYmxlfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcbmZzID0gcmVxdWlyZSAnZnMtcGx1cydcbnBhdGggPSByZXF1aXJlICdwYXRoJ1xub3MgPSByZXF1aXJlICdvcydcbm5ldCA9IHJlcXVpcmUgJ25ldCdcbnVybCA9IHJlcXVpcmUgJ3VybCdcbntFdmVudEVtaXR0ZXJ9ID0gcmVxdWlyZSAnZXZlbnRzJ1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbkZpbmRQYXJlbnREaXIgPSBudWxsXG5SZXNvbHZlID0gbnVsbFxuQ29uZmlnU2NoZW1hID0gcmVxdWlyZSAnLi4vY29uZmlnLXNjaGVtYSdcblxuTG9jYXRpb25TdWZmaXhSZWdFeHAgPSAvKDpcXGQrKSg6XFxkKyk/JC9cblxuIyBUaGUgYXBwbGljYXRpb24ncyBzaW5nbGV0b24gY2xhc3MuXG4jXG4jIEl0J3MgdGhlIGVudHJ5IHBvaW50IGludG8gdGhlIEF0b20gYXBwbGljYXRpb24gYW5kIG1haW50YWlucyB0aGUgZ2xvYmFsIHN0YXRlXG4jIG9mIHRoZSBhcHBsaWNhdGlvbi5cbiNcbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIEF0b21BcHBsaWNhdGlvblxuICBPYmplY3QuYXNzaWduIEBwcm90b3R5cGUsIEV2ZW50RW1pdHRlci5wcm90b3R5cGVcblxuICAjIFB1YmxpYzogVGhlIGVudHJ5IHBvaW50IGludG8gdGhlIEF0b20gYXBwbGljYXRpb24uXG4gIEBvcGVuOiAob3B0aW9ucykgLT5cbiAgICB1bmxlc3Mgb3B0aW9ucy5zb2NrZXRQYXRoP1xuICAgICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnd2luMzInXG4gICAgICAgIHVzZXJOYW1lU2FmZSA9IG5ldyBCdWZmZXIocHJvY2Vzcy5lbnYuVVNFUk5BTUUpLnRvU3RyaW5nKCdiYXNlNjQnKVxuICAgICAgICBvcHRpb25zLnNvY2tldFBhdGggPSBcIlxcXFxcXFxcLlxcXFxwaXBlXFxcXGF0b20tI3tvcHRpb25zLnZlcnNpb259LSN7dXNlck5hbWVTYWZlfS0je3Byb2Nlc3MuYXJjaH0tc29ja1wiXG4gICAgICBlbHNlXG4gICAgICAgIG9wdGlvbnMuc29ja2V0UGF0aCA9IHBhdGguam9pbihvcy50bXBkaXIoKSwgXCJhdG9tLSN7b3B0aW9ucy52ZXJzaW9ufS0je3Byb2Nlc3MuZW52LlVTRVJ9LnNvY2tcIilcblxuICAgICMgRklYTUU6IFNvbWV0aW1lcyB3aGVuIHNvY2tldFBhdGggZG9lc24ndCBleGlzdCwgbmV0LmNvbm5lY3Qgd291bGQgc3RyYW5nZWx5XG4gICAgIyB0YWtlIGEgZmV3IHNlY29uZHMgdG8gdHJpZ2dlciAnZXJyb3InIGV2ZW50LCBpdCBjb3VsZCBiZSBhIGJ1ZyBvZiBub2RlXG4gICAgIyBvciBhdG9tLXNoZWxsLCBiZWZvcmUgaXQncyBmaXhlZCB3ZSBjaGVjayB0aGUgZXhpc3RlbmNlIG9mIHNvY2tldFBhdGggdG9cbiAgICAjIHNwZWVkdXAgc3RhcnR1cC5cbiAgICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSBpc250ICd3aW4zMicgYW5kIG5vdCBmcy5leGlzdHNTeW5jIG9wdGlvbnMuc29ja2V0UGF0aCkgb3Igb3B0aW9ucy50ZXN0IG9yIG9wdGlvbnMuYmVuY2htYXJrIG9yIG9wdGlvbnMuYmVuY2htYXJrVGVzdFxuICAgICAgbmV3IEF0b21BcHBsaWNhdGlvbihvcHRpb25zKS5pbml0aWFsaXplKG9wdGlvbnMpXG4gICAgICByZXR1cm5cblxuICAgIGNsaWVudCA9IG5ldC5jb25uZWN0IHtwYXRoOiBvcHRpb25zLnNvY2tldFBhdGh9LCAtPlxuICAgICAgY2xpZW50LndyaXRlIEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpLCAtPlxuICAgICAgICBjbGllbnQuZW5kKClcbiAgICAgICAgYXBwLnF1aXQoKVxuXG4gICAgY2xpZW50Lm9uICdlcnJvcicsIC0+IG5ldyBBdG9tQXBwbGljYXRpb24ob3B0aW9ucykuaW5pdGlhbGl6ZShvcHRpb25zKVxuXG4gIHdpbmRvd3M6IG51bGxcbiAgYXBwbGljYXRpb25NZW51OiBudWxsXG4gIGF0b21Qcm90b2NvbEhhbmRsZXI6IG51bGxcbiAgcmVzb3VyY2VQYXRoOiBudWxsXG4gIHZlcnNpb246IG51bGxcbiAgcXVpdHRpbmc6IGZhbHNlXG5cbiAgZXhpdDogKHN0YXR1cykgLT4gYXBwLmV4aXQoc3RhdHVzKVxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICB7QHJlc291cmNlUGF0aCwgQGRldlJlc291cmNlUGF0aCwgQHZlcnNpb24sIEBkZXZNb2RlLCBAc2FmZU1vZGUsIEBzb2NrZXRQYXRoLCBAbG9nRmlsZSwgQHVzZXJEYXRhRGlyfSA9IG9wdGlvbnNcbiAgICBAc29ja2V0UGF0aCA9IG51bGwgaWYgb3B0aW9ucy50ZXN0IG9yIG9wdGlvbnMuYmVuY2htYXJrIG9yIG9wdGlvbnMuYmVuY2htYXJrVGVzdFxuICAgIEBwaWRzVG9PcGVuV2luZG93cyA9IHt9XG4gICAgQHdpbmRvd3MgPSBbXVxuXG4gICAgQGNvbmZpZyA9IG5ldyBDb25maWcoe2VuYWJsZVBlcnNpc3RlbmNlOiB0cnVlfSlcbiAgICBAY29uZmlnLnNldFNjaGVtYSBudWxsLCB7dHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IF8uY2xvbmUoQ29uZmlnU2NoZW1hKX1cbiAgICBDb25maWdTY2hlbWEucHJvamVjdEhvbWUgPSB7XG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIGRlZmF1bHQ6IHBhdGguam9pbihmcy5nZXRIb21lRGlyZWN0b3J5KCksICdnaXRodWInKSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGRpcmVjdG9yeSB3aGVyZSBwcm9qZWN0cyBhcmUgYXNzdW1lZCB0byBiZSBsb2NhdGVkLiBQYWNrYWdlcyBjcmVhdGVkIHVzaW5nIHRoZSBQYWNrYWdlIEdlbmVyYXRvciB3aWxsIGJlIHN0b3JlZCBoZXJlIGJ5IGRlZmF1bHQuJ1xuICAgIH1cbiAgICBAY29uZmlnLmluaXRpYWxpemUoe2NvbmZpZ0RpclBhdGg6IHByb2Nlc3MuZW52LkFUT01fSE9NRSwgQHJlc291cmNlUGF0aCwgcHJvamVjdEhvbWVTY2hlbWE6IENvbmZpZ1NjaGVtYS5wcm9qZWN0SG9tZX0pXG4gICAgQGNvbmZpZy5sb2FkKClcbiAgICBAZmlsZVJlY292ZXJ5U2VydmljZSA9IG5ldyBGaWxlUmVjb3ZlcnlTZXJ2aWNlKHBhdGguam9pbihwcm9jZXNzLmVudi5BVE9NX0hPTUUsIFwicmVjb3ZlcnlcIikpXG4gICAgQHN0b3JhZ2VGb2xkZXIgPSBuZXcgU3RvcmFnZUZvbGRlcihwcm9jZXNzLmVudi5BVE9NX0hPTUUpXG4gICAgQGF1dG9VcGRhdGVNYW5hZ2VyID0gbmV3IEF1dG9VcGRhdGVNYW5hZ2VyKFxuICAgICAgQHZlcnNpb24sXG4gICAgICBvcHRpb25zLnRlc3Qgb3Igb3B0aW9ucy5iZW5jaG1hcmsgb3Igb3B0aW9ucy5iZW5jaG1hcmtUZXN0LFxuICAgICAgQGNvbmZpZ1xuICAgIClcblxuICAgIEBkaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgICBAaGFuZGxlRXZlbnRzKClcblxuICAjIFRoaXMgc3R1ZmYgd2FzIHByZXZpb3VzbHkgZG9uZSBpbiB0aGUgY29uc3RydWN0b3IsIGJ1dCB3ZSB3YW50IHRvIGJlIGFibGUgdG8gY29uc3RydWN0IHRoaXMgb2JqZWN0XG4gICMgZm9yIHRlc3RpbmcgcHVycG9zZXMgd2l0aG91dCBib290aW5nIHVwIHRoZSB3b3JsZC4gQXMgeW91IGFkZCB0ZXN0cywgZmVlbCBmcmVlIHRvIG1vdmUgaW5zdGFudGlhdGlvblxuICAjIG9mIHRoZXNlIHZhcmlvdXMgc3ViLW9iamVjdHMgaW50byB0aGUgY29uc3RydWN0b3IsIGJ1dCB5b3UnbGwgbmVlZCB0byByZW1vdmUgdGhlIHNpZGUtZWZmZWN0cyB0aGV5XG4gICMgcGVyZm9ybSBkdXJpbmcgdGhlaXIgY29uc3RydWN0aW9uLCBhZGRpbmcgYW4gaW5pdGlhbGl6ZSBtZXRob2QgdGhhdCB5b3UgY2FsbCBoZXJlLlxuICBpbml0aWFsaXplOiAob3B0aW9ucykgLT5cbiAgICBnbG9iYWwuYXRvbUFwcGxpY2F0aW9uID0gdGhpc1xuXG4gICAgIyBERVBSRUNBVEVEOiBUaGlzIGNhbiBiZSByZW1vdmVkIGF0IHNvbWUgcG9pbnQgKGFkZGVkIGluIDEuMTMpXG4gICAgIyBJdCBjb252ZXJ0cyBgdXNlQ3VzdG9tVGl0bGVCYXI6IHRydWVgIHRvIGB0aXRsZUJhcjogXCJjdXN0b21cImBcbiAgICBpZiBwcm9jZXNzLnBsYXRmb3JtIGlzICdkYXJ3aW4nIGFuZCBAY29uZmlnLmdldCgnY29yZS51c2VDdXN0b21UaXRsZUJhcicpXG4gICAgICBAY29uZmlnLnVuc2V0KCdjb3JlLnVzZUN1c3RvbVRpdGxlQmFyJylcbiAgICAgIEBjb25maWcuc2V0KCdjb3JlLnRpdGxlQmFyJywgJ2N1c3RvbScpXG5cbiAgICBAY29uZmlnLm9uRGlkQ2hhbmdlICdjb3JlLnRpdGxlQmFyJywgQHByb21wdEZvclJlc3RhcnQuYmluZCh0aGlzKVxuXG4gICAgcHJvY2Vzcy5uZXh0VGljayA9PiBAYXV0b1VwZGF0ZU1hbmFnZXIuaW5pdGlhbGl6ZSgpXG4gICAgQGFwcGxpY2F0aW9uTWVudSA9IG5ldyBBcHBsaWNhdGlvbk1lbnUoQHZlcnNpb24sIEBhdXRvVXBkYXRlTWFuYWdlcilcbiAgICBAYXRvbVByb3RvY29sSGFuZGxlciA9IG5ldyBBdG9tUHJvdG9jb2xIYW5kbGVyKEByZXNvdXJjZVBhdGgsIEBzYWZlTW9kZSlcblxuICAgIEBsaXN0ZW5Gb3JBcmd1bWVudHNGcm9tTmV3UHJvY2VzcygpXG4gICAgQHNldHVwRG9ja01lbnUoKVxuXG4gICAgQGxhdW5jaChvcHRpb25zKVxuXG4gIGRlc3Ryb3k6IC0+XG4gICAgd2luZG93c0Nsb3NlUHJvbWlzZXMgPSBAd2luZG93cy5tYXAgKHdpbmRvdykgLT5cbiAgICAgIHdpbmRvdy5jbG9zZSgpXG4gICAgICB3aW5kb3cuY2xvc2VkUHJvbWlzZVxuICAgIFByb21pc2UuYWxsKHdpbmRvd3NDbG9zZVByb21pc2VzKS50aGVuKD0+IEBkaXNwb3NhYmxlLmRpc3Bvc2UoKSlcblxuICBsYXVuY2g6IChvcHRpb25zKSAtPlxuICAgIGlmIG9wdGlvbnMucGF0aHNUb09wZW4/Lmxlbmd0aCA+IDAgb3Igb3B0aW9ucy51cmxzVG9PcGVuPy5sZW5ndGggPiAwIG9yIG9wdGlvbnMudGVzdCBvciBvcHRpb25zLmJlbmNobWFyayBvciBvcHRpb25zLmJlbmNobWFya1Rlc3RcbiAgICAgIGlmIEBjb25maWcuZ2V0KCdjb3JlLnJlc3RvcmVQcmV2aW91c1dpbmRvd3NPblN0YXJ0JykgaXMgJ2Fsd2F5cydcbiAgICAgICAgQGxvYWRTdGF0ZShfLmRlZXBDbG9uZShvcHRpb25zKSlcbiAgICAgIEBvcGVuV2l0aE9wdGlvbnMob3B0aW9ucylcbiAgICBlbHNlXG4gICAgICBAbG9hZFN0YXRlKG9wdGlvbnMpIG9yIEBvcGVuUGF0aChvcHRpb25zKVxuXG4gIG9wZW5XaXRoT3B0aW9uczogKG9wdGlvbnMpIC0+XG4gICAge1xuICAgICAgaW5pdGlhbFBhdGhzLCBwYXRoc1RvT3BlbiwgZXhlY3V0ZWRGcm9tLCB1cmxzVG9PcGVuLCBiZW5jaG1hcmssXG4gICAgICBiZW5jaG1hcmtUZXN0LCB0ZXN0LCBwaWRUb0tpbGxXaGVuQ2xvc2VkLCBkZXZNb2RlLCBzYWZlTW9kZSwgbmV3V2luZG93LFxuICAgICAgbG9nRmlsZSwgcHJvZmlsZVN0YXJ0dXAsIHRpbWVvdXQsIGNsZWFyV2luZG93U3RhdGUsIGFkZFRvTGFzdFdpbmRvdywgZW52XG4gICAgfSA9IG9wdGlvbnNcblxuICAgIGFwcC5mb2N1cygpXG5cbiAgICBpZiB0ZXN0XG4gICAgICBAcnVuVGVzdHMoe1xuICAgICAgICBoZWFkbGVzczogdHJ1ZSwgZGV2TW9kZSwgQHJlc291cmNlUGF0aCwgZXhlY3V0ZWRGcm9tLCBwYXRoc1RvT3BlbixcbiAgICAgICAgbG9nRmlsZSwgdGltZW91dCwgZW52XG4gICAgICB9KVxuICAgIGVsc2UgaWYgYmVuY2htYXJrIG9yIGJlbmNobWFya1Rlc3RcbiAgICAgIEBydW5CZW5jaG1hcmtzKHtoZWFkbGVzczogdHJ1ZSwgdGVzdDogYmVuY2htYXJrVGVzdCwgQHJlc291cmNlUGF0aCwgZXhlY3V0ZWRGcm9tLCBwYXRoc1RvT3BlbiwgdGltZW91dCwgZW52fSlcbiAgICBlbHNlIGlmIHBhdGhzVG9PcGVuLmxlbmd0aCA+IDBcbiAgICAgIEBvcGVuUGF0aHMoe1xuICAgICAgICBpbml0aWFsUGF0aHMsIHBhdGhzVG9PcGVuLCBleGVjdXRlZEZyb20sIHBpZFRvS2lsbFdoZW5DbG9zZWQsIG5ld1dpbmRvdyxcbiAgICAgICAgZGV2TW9kZSwgc2FmZU1vZGUsIHByb2ZpbGVTdGFydHVwLCBjbGVhcldpbmRvd1N0YXRlLCBhZGRUb0xhc3RXaW5kb3csIGVudlxuICAgICAgfSlcbiAgICBlbHNlIGlmIHVybHNUb09wZW4ubGVuZ3RoID4gMFxuICAgICAgZm9yIHVybFRvT3BlbiBpbiB1cmxzVG9PcGVuXG4gICAgICAgIEBvcGVuVXJsKHt1cmxUb09wZW4sIGRldk1vZGUsIHNhZmVNb2RlLCBlbnZ9KVxuICAgIGVsc2VcbiAgICAgICMgQWx3YXlzIG9wZW4gYSBlZGl0b3Igd2luZG93IGlmIHRoaXMgaXMgdGhlIGZpcnN0IGluc3RhbmNlIG9mIEF0b20uXG4gICAgICBAb3BlblBhdGgoe1xuICAgICAgICBpbml0aWFsUGF0aHMsIHBpZFRvS2lsbFdoZW5DbG9zZWQsIG5ld1dpbmRvdywgZGV2TW9kZSwgc2FmZU1vZGUsIHByb2ZpbGVTdGFydHVwLFxuICAgICAgICBjbGVhcldpbmRvd1N0YXRlLCBhZGRUb0xhc3RXaW5kb3csIGVudlxuICAgICAgfSlcblxuICAjIFB1YmxpYzogUmVtb3ZlcyB0aGUge0F0b21XaW5kb3d9IGZyb20gdGhlIGdsb2JhbCB3aW5kb3cgbGlzdC5cbiAgcmVtb3ZlV2luZG93OiAod2luZG93KSAtPlxuICAgIEB3aW5kb3dzLnNwbGljZShAd2luZG93cy5pbmRleE9mKHdpbmRvdyksIDEpXG4gICAgaWYgQHdpbmRvd3MubGVuZ3RoIGlzIDBcbiAgICAgIEBhcHBsaWNhdGlvbk1lbnU/LmVuYWJsZVdpbmRvd1NwZWNpZmljSXRlbXMoZmFsc2UpXG4gICAgICBpZiBwcm9jZXNzLnBsYXRmb3JtIGluIFsnd2luMzInLCAnbGludXgnXVxuICAgICAgICBhcHAucXVpdCgpXG4gICAgICAgIHJldHVyblxuICAgIEBzYXZlU3RhdGUodHJ1ZSkgdW5sZXNzIHdpbmRvdy5pc1NwZWNcblxuICAjIFB1YmxpYzogQWRkcyB0aGUge0F0b21XaW5kb3d9IHRvIHRoZSBnbG9iYWwgd2luZG93IGxpc3QuXG4gIGFkZFdpbmRvdzogKHdpbmRvdykgLT5cbiAgICBAd2luZG93cy5wdXNoIHdpbmRvd1xuICAgIEBhcHBsaWNhdGlvbk1lbnU/LmFkZFdpbmRvdyh3aW5kb3cuYnJvd3NlcldpbmRvdylcbiAgICB3aW5kb3cub25jZSAnd2luZG93OmxvYWRlZCcsID0+XG4gICAgICBAYXV0b1VwZGF0ZU1hbmFnZXI/LmVtaXRVcGRhdGVBdmFpbGFibGVFdmVudCh3aW5kb3cpXG5cbiAgICB1bmxlc3Mgd2luZG93LmlzU3BlY1xuICAgICAgZm9jdXNIYW5kbGVyID0gPT4gQGxhc3RGb2N1c2VkV2luZG93ID0gd2luZG93XG4gICAgICBibHVySGFuZGxlciA9ID0+IEBzYXZlU3RhdGUoZmFsc2UpXG4gICAgICB3aW5kb3cuYnJvd3NlcldpbmRvdy5vbiAnZm9jdXMnLCBmb2N1c0hhbmRsZXJcbiAgICAgIHdpbmRvdy5icm93c2VyV2luZG93Lm9uICdibHVyJywgYmx1ckhhbmRsZXJcbiAgICAgIHdpbmRvdy5icm93c2VyV2luZG93Lm9uY2UgJ2Nsb3NlZCcsID0+XG4gICAgICAgIEBsYXN0Rm9jdXNlZFdpbmRvdyA9IG51bGwgaWYgd2luZG93IGlzIEBsYXN0Rm9jdXNlZFdpbmRvd1xuICAgICAgICB3aW5kb3cuYnJvd3NlcldpbmRvdy5yZW1vdmVMaXN0ZW5lciAnZm9jdXMnLCBmb2N1c0hhbmRsZXJcbiAgICAgICAgd2luZG93LmJyb3dzZXJXaW5kb3cucmVtb3ZlTGlzdGVuZXIgJ2JsdXInLCBibHVySGFuZGxlclxuICAgICAgd2luZG93LmJyb3dzZXJXaW5kb3cud2ViQ29udGVudHMub25jZSAnZGlkLWZpbmlzaC1sb2FkJywgPT4gQHNhdmVTdGF0ZShmYWxzZSlcblxuICAjIENyZWF0ZXMgc2VydmVyIHRvIGxpc3RlbiBmb3IgYWRkaXRpb25hbCBhdG9tIGFwcGxpY2F0aW9uIGxhdW5jaGVzLlxuICAjXG4gICMgWW91IGNhbiBydW4gdGhlIGF0b20gY29tbWFuZCBtdWx0aXBsZSB0aW1lcywgYnV0IGFmdGVyIHRoZSBmaXJzdCBsYXVuY2hcbiAgIyB0aGUgb3RoZXIgbGF1bmNoZXMgd2lsbCBqdXN0IHBhc3MgdGhlaXIgaW5mb3JtYXRpb24gdG8gdGhpcyBzZXJ2ZXIgYW5kIHRoZW5cbiAgIyBjbG9zZSBpbW1lZGlhdGVseS5cbiAgbGlzdGVuRm9yQXJndW1lbnRzRnJvbU5ld1Byb2Nlc3M6IC0+XG4gICAgcmV0dXJuIHVubGVzcyBAc29ja2V0UGF0aD9cbiAgICBAZGVsZXRlU29ja2V0RmlsZSgpXG4gICAgc2VydmVyID0gbmV0LmNyZWF0ZVNlcnZlciAoY29ubmVjdGlvbikgPT5cbiAgICAgIGRhdGEgPSAnJ1xuICAgICAgY29ubmVjdGlvbi5vbiAnZGF0YScsIChjaHVuaykgLT5cbiAgICAgICAgZGF0YSA9IGRhdGEgKyBjaHVua1xuXG4gICAgICBjb25uZWN0aW9uLm9uICdlbmQnLCA9PlxuICAgICAgICBvcHRpb25zID0gSlNPTi5wYXJzZShkYXRhKVxuICAgICAgICBAb3BlbldpdGhPcHRpb25zKG9wdGlvbnMpXG5cbiAgICBzZXJ2ZXIubGlzdGVuIEBzb2NrZXRQYXRoXG4gICAgc2VydmVyLm9uICdlcnJvcicsIChlcnJvcikgLT4gY29uc29sZS5lcnJvciAnQXBwbGljYXRpb24gc2VydmVyIGZhaWxlZCcsIGVycm9yXG5cbiAgZGVsZXRlU29ja2V0RmlsZTogLT5cbiAgICByZXR1cm4gaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnd2luMzInIG9yIG5vdCBAc29ja2V0UGF0aD9cblxuICAgIGlmIGZzLmV4aXN0c1N5bmMoQHNvY2tldFBhdGgpXG4gICAgICB0cnlcbiAgICAgICAgZnMudW5saW5rU3luYyhAc29ja2V0UGF0aClcbiAgICAgIGNhdGNoIGVycm9yXG4gICAgICAgICMgSWdub3JlIEVOT0VOVCBlcnJvcnMgaW4gY2FzZSB0aGUgZmlsZSB3YXMgZGVsZXRlZCBiZXR3ZWVuIHRoZSBleGlzdHNcbiAgICAgICAgIyBjaGVjayBhbmQgdGhlIGNhbGwgdG8gdW5saW5rIHN5bmMuIFRoaXMgb2NjdXJyZWQgb2NjYXNpb25hbGx5IG9uIENJXG4gICAgICAgICMgd2hpY2ggaXMgd2h5IHRoaXMgY2hlY2sgaXMgaGVyZS5cbiAgICAgICAgdGhyb3cgZXJyb3IgdW5sZXNzIGVycm9yLmNvZGUgaXMgJ0VOT0VOVCdcblxuICAjIFJlZ2lzdGVycyBiYXNpYyBhcHBsaWNhdGlvbiBjb21tYW5kcywgbm9uLWlkZW1wb3RlbnQuXG4gIGhhbmRsZUV2ZW50czogLT5cbiAgICBnZXRMb2FkU2V0dGluZ3MgPSA9PlxuICAgICAgZGV2TW9kZTogQGZvY3VzZWRXaW5kb3coKT8uZGV2TW9kZVxuICAgICAgc2FmZU1vZGU6IEBmb2N1c2VkV2luZG93KCk/LnNhZmVNb2RlXG5cbiAgICBAb24gJ2FwcGxpY2F0aW9uOnF1aXQnLCAtPiBhcHAucXVpdCgpXG4gICAgQG9uICdhcHBsaWNhdGlvbjpuZXctd2luZG93JywgLT4gQG9wZW5QYXRoKGdldExvYWRTZXR0aW5ncygpKVxuICAgIEBvbiAnYXBwbGljYXRpb246bmV3LWZpbGUnLCAtPiAoQGZvY3VzZWRXaW5kb3coKSA/IHRoaXMpLm9wZW5QYXRoKClcbiAgICBAb24gJ2FwcGxpY2F0aW9uOm9wZW4tZGV2JywgLT4gQHByb21wdEZvclBhdGhUb09wZW4oJ2FsbCcsIGRldk1vZGU6IHRydWUpXG4gICAgQG9uICdhcHBsaWNhdGlvbjpvcGVuLXNhZmUnLCAtPiBAcHJvbXB0Rm9yUGF0aFRvT3BlbignYWxsJywgc2FmZU1vZGU6IHRydWUpXG4gICAgQG9uICdhcHBsaWNhdGlvbjppbnNwZWN0JywgKHt4LCB5LCBhdG9tV2luZG93fSkgLT5cbiAgICAgIGF0b21XaW5kb3cgPz0gQGZvY3VzZWRXaW5kb3coKVxuICAgICAgYXRvbVdpbmRvdz8uYnJvd3NlcldpbmRvdy5pbnNwZWN0RWxlbWVudCh4LCB5KVxuXG4gICAgQG9uICdhcHBsaWNhdGlvbjpvcGVuLWRvY3VtZW50YXRpb24nLCAtPiBzaGVsbC5vcGVuRXh0ZXJuYWwoJ2h0dHA6Ly9mbGlnaHQtbWFudWFsLmF0b20uaW8vJylcbiAgICBAb24gJ2FwcGxpY2F0aW9uOm9wZW4tZGlzY3Vzc2lvbnMnLCAtPiBzaGVsbC5vcGVuRXh0ZXJuYWwoJ2h0dHBzOi8vZGlzY3Vzcy5hdG9tLmlvJylcbiAgICBAb24gJ2FwcGxpY2F0aW9uOm9wZW4tZmFxJywgLT4gc2hlbGwub3BlbkV4dGVybmFsKCdodHRwczovL2F0b20uaW8vZmFxJylcbiAgICBAb24gJ2FwcGxpY2F0aW9uOm9wZW4tdGVybXMtb2YtdXNlJywgLT4gc2hlbGwub3BlbkV4dGVybmFsKCdodHRwczovL2F0b20uaW8vdGVybXMnKVxuICAgIEBvbiAnYXBwbGljYXRpb246cmVwb3J0LWlzc3VlJywgLT4gc2hlbGwub3BlbkV4dGVybmFsKCdodHRwczovL2dpdGh1Yi5jb20vYXRvbS9hdG9tL2Jsb2IvbWFzdGVyL0NPTlRSSUJVVElORy5tZCNzdWJtaXR0aW5nLWlzc3VlcycpXG4gICAgQG9uICdhcHBsaWNhdGlvbjpzZWFyY2gtaXNzdWVzJywgLT4gc2hlbGwub3BlbkV4dGVybmFsKCdodHRwczovL2dpdGh1Yi5jb20vaXNzdWVzP3E9K2lzJTNBaXNzdWUrdXNlciUzQWF0b20nKVxuXG4gICAgQG9uICdhcHBsaWNhdGlvbjppbnN0YWxsLXVwZGF0ZScsID0+XG4gICAgICBAcXVpdHRpbmcgPSB0cnVlXG4gICAgICBAYXV0b1VwZGF0ZU1hbmFnZXIuaW5zdGFsbCgpXG5cbiAgICBAb24gJ2FwcGxpY2F0aW9uOmNoZWNrLWZvci11cGRhdGUnLCA9PiBAYXV0b1VwZGF0ZU1hbmFnZXIuY2hlY2soKVxuXG4gICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnZGFyd2luJ1xuICAgICAgQG9uICdhcHBsaWNhdGlvbjpicmluZy1hbGwtd2luZG93cy10by1mcm9udCcsIC0+IE1lbnUuc2VuZEFjdGlvblRvRmlyc3RSZXNwb25kZXIoJ2FycmFuZ2VJbkZyb250OicpXG4gICAgICBAb24gJ2FwcGxpY2F0aW9uOmhpZGUnLCAtPiBNZW51LnNlbmRBY3Rpb25Ub0ZpcnN0UmVzcG9uZGVyKCdoaWRlOicpXG4gICAgICBAb24gJ2FwcGxpY2F0aW9uOmhpZGUtb3RoZXItYXBwbGljYXRpb25zJywgLT4gTWVudS5zZW5kQWN0aW9uVG9GaXJzdFJlc3BvbmRlcignaGlkZU90aGVyQXBwbGljYXRpb25zOicpXG4gICAgICBAb24gJ2FwcGxpY2F0aW9uOm1pbmltaXplJywgLT4gTWVudS5zZW5kQWN0aW9uVG9GaXJzdFJlc3BvbmRlcigncGVyZm9ybU1pbmlhdHVyaXplOicpXG4gICAgICBAb24gJ2FwcGxpY2F0aW9uOnVuaGlkZS1hbGwtYXBwbGljYXRpb25zJywgLT4gTWVudS5zZW5kQWN0aW9uVG9GaXJzdFJlc3BvbmRlcigndW5oaWRlQWxsQXBwbGljYXRpb25zOicpXG4gICAgICBAb24gJ2FwcGxpY2F0aW9uOnpvb20nLCAtPiBNZW51LnNlbmRBY3Rpb25Ub0ZpcnN0UmVzcG9uZGVyKCd6b29tOicpXG4gICAgZWxzZVxuICAgICAgQG9uICdhcHBsaWNhdGlvbjptaW5pbWl6ZScsIC0+IEBmb2N1c2VkV2luZG93KCk/Lm1pbmltaXplKClcbiAgICAgIEBvbiAnYXBwbGljYXRpb246em9vbScsIC0+IEBmb2N1c2VkV2luZG93KCk/Lm1heGltaXplKClcblxuICAgIEBvcGVuUGF0aE9uRXZlbnQoJ2FwcGxpY2F0aW9uOmFib3V0JywgJ2F0b206Ly9hYm91dCcpXG4gICAgQG9wZW5QYXRoT25FdmVudCgnYXBwbGljYXRpb246c2hvdy1zZXR0aW5ncycsICdhdG9tOi8vY29uZmlnJylcbiAgICBAb3BlblBhdGhPbkV2ZW50KCdhcHBsaWNhdGlvbjpvcGVuLXlvdXItY29uZmlnJywgJ2F0b206Ly8uYXRvbS9jb25maWcnKVxuICAgIEBvcGVuUGF0aE9uRXZlbnQoJ2FwcGxpY2F0aW9uOm9wZW4teW91ci1pbml0LXNjcmlwdCcsICdhdG9tOi8vLmF0b20vaW5pdC1zY3JpcHQnKVxuICAgIEBvcGVuUGF0aE9uRXZlbnQoJ2FwcGxpY2F0aW9uOm9wZW4teW91ci1rZXltYXAnLCAnYXRvbTovLy5hdG9tL2tleW1hcCcpXG4gICAgQG9wZW5QYXRoT25FdmVudCgnYXBwbGljYXRpb246b3Blbi15b3VyLXNuaXBwZXRzJywgJ2F0b206Ly8uYXRvbS9zbmlwcGV0cycpXG4gICAgQG9wZW5QYXRoT25FdmVudCgnYXBwbGljYXRpb246b3Blbi15b3VyLXN0eWxlc2hlZXQnLCAnYXRvbTovLy5hdG9tL3N0eWxlc2hlZXQnKVxuICAgIEBvcGVuUGF0aE9uRXZlbnQoJ2FwcGxpY2F0aW9uOm9wZW4tbGljZW5zZScsIHBhdGguam9pbihwcm9jZXNzLnJlc291cmNlc1BhdGgsICdMSUNFTlNFLm1kJykpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBhcHAsICdiZWZvcmUtcXVpdCcsIChldmVudCkgPT5cbiAgICAgIHVubGVzcyBAcXVpdHRpbmdcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgICAgICBAcXVpdHRpbmcgPSB0cnVlXG4gICAgICAgIFByb21pc2UuYWxsKEB3aW5kb3dzLm1hcCgod2luZG93KSAtPiB3aW5kb3cuc2F2ZVN0YXRlKCkpKS50aGVuKC0+IGFwcC5xdWl0KCkpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBhcHAsICd3aWxsLXF1aXQnLCA9PlxuICAgICAgQGtpbGxBbGxQcm9jZXNzZXMoKVxuICAgICAgQGRlbGV0ZVNvY2tldEZpbGUoKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gYXBwLCAnb3Blbi1maWxlJywgKGV2ZW50LCBwYXRoVG9PcGVuKSA9PlxuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgICAgQG9wZW5QYXRoKHtwYXRoVG9PcGVufSlcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGFwcCwgJ29wZW4tdXJsJywgKGV2ZW50LCB1cmxUb09wZW4pID0+XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBAb3BlblVybCh7dXJsVG9PcGVuLCBAZGV2TW9kZSwgQHNhZmVNb2RlfSlcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGFwcCwgJ2FjdGl2YXRlJywgKGV2ZW50LCBoYXNWaXNpYmxlV2luZG93cykgPT5cbiAgICAgIHVubGVzcyBoYXNWaXNpYmxlV2luZG93c1xuICAgICAgICBldmVudD8ucHJldmVudERlZmF1bHQoKVxuICAgICAgICBAZW1pdCgnYXBwbGljYXRpb246bmV3LXdpbmRvdycpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBpcGNNYWluLCAncmVzdGFydC1hcHBsaWNhdGlvbicsID0+XG4gICAgICBAcmVzdGFydCgpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBpcGNNYWluLCAncmVzb2x2ZS1wcm94eScsIChldmVudCwgcmVxdWVzdElkLCB1cmwpIC0+XG4gICAgICBldmVudC5zZW5kZXIuc2Vzc2lvbi5yZXNvbHZlUHJveHkgdXJsLCAocHJveHkpIC0+XG4gICAgICAgIHVubGVzcyBldmVudC5zZW5kZXIuaXNEZXN0cm95ZWQoKVxuICAgICAgICAgIGV2ZW50LnNlbmRlci5zZW5kKCdkaWQtcmVzb2x2ZS1wcm94eScsIHJlcXVlc3RJZCwgcHJveHkpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBpcGNNYWluLCAnZGlkLWNoYW5nZS1oaXN0b3J5LW1hbmFnZXInLCAoZXZlbnQpID0+XG4gICAgICBmb3IgYXRvbVdpbmRvdyBpbiBAd2luZG93c1xuICAgICAgICB3ZWJDb250ZW50cyA9IGF0b21XaW5kb3cuYnJvd3NlcldpbmRvdy53ZWJDb250ZW50c1xuICAgICAgICBpZiB3ZWJDb250ZW50cyBpc250IGV2ZW50LnNlbmRlclxuICAgICAgICAgIHdlYkNvbnRlbnRzLnNlbmQoJ2RpZC1jaGFuZ2UtaGlzdG9yeS1tYW5hZ2VyJylcblxuICAgICMgQSByZXF1ZXN0IGZyb20gdGhlIGFzc29jaWF0ZWQgcmVuZGVyIHByb2Nlc3MgdG8gb3BlbiBhIG5ldyByZW5kZXIgcHJvY2Vzcy5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBpcGNNYWluLCAnb3BlbicsIChldmVudCwgb3B0aW9ucykgPT5cbiAgICAgIHdpbmRvdyA9IEBhdG9tV2luZG93Rm9yRXZlbnQoZXZlbnQpXG4gICAgICBpZiBvcHRpb25zP1xuICAgICAgICBpZiB0eXBlb2Ygb3B0aW9ucy5wYXRoc1RvT3BlbiBpcyAnc3RyaW5nJ1xuICAgICAgICAgIG9wdGlvbnMucGF0aHNUb09wZW4gPSBbb3B0aW9ucy5wYXRoc1RvT3Blbl1cbiAgICAgICAgaWYgb3B0aW9ucy5wYXRoc1RvT3Blbj8ubGVuZ3RoID4gMFxuICAgICAgICAgIG9wdGlvbnMud2luZG93ID0gd2luZG93XG4gICAgICAgICAgQG9wZW5QYXRocyhvcHRpb25zKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgbmV3IEF0b21XaW5kb3codGhpcywgQGZpbGVSZWNvdmVyeVNlcnZpY2UsIG9wdGlvbnMpXG4gICAgICBlbHNlXG4gICAgICAgIEBwcm9tcHRGb3JQYXRoVG9PcGVuKCdhbGwnLCB7d2luZG93fSlcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGlwY01haW4sICd1cGRhdGUtYXBwbGljYXRpb24tbWVudScsIChldmVudCwgdGVtcGxhdGUsIGtleXN0cm9rZXNCeUNvbW1hbmQpID0+XG4gICAgICB3aW4gPSBCcm93c2VyV2luZG93LmZyb21XZWJDb250ZW50cyhldmVudC5zZW5kZXIpXG4gICAgICBAYXBwbGljYXRpb25NZW51Py51cGRhdGUod2luLCB0ZW1wbGF0ZSwga2V5c3Ryb2tlc0J5Q29tbWFuZClcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGlwY01haW4sICdydW4tcGFja2FnZS1zcGVjcycsIChldmVudCwgcGFja2FnZVNwZWNQYXRoKSA9PlxuICAgICAgQHJ1blRlc3RzKHtyZXNvdXJjZVBhdGg6IEBkZXZSZXNvdXJjZVBhdGgsIHBhdGhzVG9PcGVuOiBbcGFja2FnZVNwZWNQYXRoXSwgaGVhZGxlc3M6IGZhbHNlfSlcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGlwY01haW4sICdydW4tYmVuY2htYXJrcycsIChldmVudCwgYmVuY2htYXJrc1BhdGgpID0+XG4gICAgICBAcnVuQmVuY2htYXJrcyh7cmVzb3VyY2VQYXRoOiBAZGV2UmVzb3VyY2VQYXRoLCBwYXRoc1RvT3BlbjogW2JlbmNobWFya3NQYXRoXSwgaGVhZGxlc3M6IGZhbHNlLCB0ZXN0OiBmYWxzZX0pXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBpcGNNYWluLCAnY29tbWFuZCcsIChldmVudCwgY29tbWFuZCkgPT5cbiAgICAgIEBlbWl0KGNvbW1hbmQpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBpcGNNYWluLCAnb3Blbi1jb21tYW5kJywgKGV2ZW50LCBjb21tYW5kLCBhcmdzLi4uKSA9PlxuICAgICAgZGVmYXVsdFBhdGggPSBhcmdzWzBdIGlmIGFyZ3MubGVuZ3RoID4gMFxuICAgICAgc3dpdGNoIGNvbW1hbmRcbiAgICAgICAgd2hlbiAnYXBwbGljYXRpb246b3BlbicgdGhlbiBAcHJvbXB0Rm9yUGF0aFRvT3BlbignYWxsJywgZ2V0TG9hZFNldHRpbmdzKCksIGRlZmF1bHRQYXRoKVxuICAgICAgICB3aGVuICdhcHBsaWNhdGlvbjpvcGVuLWZpbGUnIHRoZW4gQHByb21wdEZvclBhdGhUb09wZW4oJ2ZpbGUnLCBnZXRMb2FkU2V0dGluZ3MoKSwgZGVmYXVsdFBhdGgpXG4gICAgICAgIHdoZW4gJ2FwcGxpY2F0aW9uOm9wZW4tZm9sZGVyJyB0aGVuIEBwcm9tcHRGb3JQYXRoVG9PcGVuKCdmb2xkZXInLCBnZXRMb2FkU2V0dGluZ3MoKSwgZGVmYXVsdFBhdGgpXG4gICAgICAgIGVsc2UgY29uc29sZS5sb2cgXCJJbnZhbGlkIG9wZW4tY29tbWFuZCByZWNlaXZlZDogXCIgKyBjb21tYW5kXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBpcGNNYWluLCAnd2luZG93LWNvbW1hbmQnLCAoZXZlbnQsIGNvbW1hbmQsIGFyZ3MuLi4pIC0+XG4gICAgICB3aW4gPSBCcm93c2VyV2luZG93LmZyb21XZWJDb250ZW50cyhldmVudC5zZW5kZXIpXG4gICAgICB3aW4uZW1pdChjb21tYW5kLCBhcmdzLi4uKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMucmVzcG9uZFRvICd3aW5kb3ctbWV0aG9kJywgKGJyb3dzZXJXaW5kb3csIG1ldGhvZCwgYXJncy4uLikgPT5cbiAgICAgIEBhdG9tV2luZG93Rm9yQnJvd3NlcldpbmRvdyhicm93c2VyV2luZG93KT9bbWV0aG9kXShhcmdzLi4uKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ3BpY2stZm9sZGVyJywgKGV2ZW50LCByZXNwb25zZUNoYW5uZWwpID0+XG4gICAgICBAcHJvbXB0Rm9yUGF0aCBcImZvbGRlclwiLCAoc2VsZWN0ZWRQYXRocykgLT5cbiAgICAgICAgZXZlbnQuc2VuZGVyLnNlbmQocmVzcG9uc2VDaGFubmVsLCBzZWxlY3RlZFBhdGhzKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMucmVzcG9uZFRvICdzZXQtd2luZG93LXNpemUnLCAod2luLCB3aWR0aCwgaGVpZ2h0KSAtPlxuICAgICAgd2luLnNldFNpemUod2lkdGgsIGhlaWdodClcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLnJlc3BvbmRUbyAnc2V0LXdpbmRvdy1wb3NpdGlvbicsICh3aW4sIHgsIHkpIC0+XG4gICAgICB3aW4uc2V0UG9zaXRpb24oeCwgeSlcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLnJlc3BvbmRUbyAnY2VudGVyLXdpbmRvdycsICh3aW4pIC0+XG4gICAgICB3aW4uY2VudGVyKClcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLnJlc3BvbmRUbyAnZm9jdXMtd2luZG93JywgKHdpbikgLT5cbiAgICAgIHdpbi5mb2N1cygpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5yZXNwb25kVG8gJ3Nob3ctd2luZG93JywgKHdpbikgLT5cbiAgICAgIHdpbi5zaG93KClcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLnJlc3BvbmRUbyAnaGlkZS13aW5kb3cnLCAod2luKSAtPlxuICAgICAgd2luLmhpZGUoKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMucmVzcG9uZFRvICdnZXQtdGVtcG9yYXJ5LXdpbmRvdy1zdGF0ZScsICh3aW4pIC0+XG4gICAgICB3aW4udGVtcG9yYXJ5U3RhdGVcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLnJlc3BvbmRUbyAnc2V0LXRlbXBvcmFyeS13aW5kb3ctc3RhdGUnLCAod2luLCBzdGF0ZSkgLT5cbiAgICAgIHdpbi50ZW1wb3JhcnlTdGF0ZSA9IHN0YXRlXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBpcGNNYWluLCAnZGlkLWNhbmNlbC13aW5kb3ctdW5sb2FkJywgPT5cbiAgICAgIEBxdWl0dGluZyA9IGZhbHNlXG4gICAgICBmb3Igd2luZG93IGluIEB3aW5kb3dzXG4gICAgICAgIHdpbmRvdy5kaWRDYW5jZWxXaW5kb3dVbmxvYWQoKVxuXG4gICAgY2xpcGJvYXJkID0gcmVxdWlyZSAnLi4vc2FmZS1jbGlwYm9hcmQnXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ3dyaXRlLXRleHQtdG8tc2VsZWN0aW9uLWNsaXBib2FyZCcsIChldmVudCwgc2VsZWN0ZWRUZXh0KSAtPlxuICAgICAgY2xpcGJvYXJkLndyaXRlVGV4dChzZWxlY3RlZFRleHQsICdzZWxlY3Rpb24nKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ3dyaXRlLXRvLXN0ZG91dCcsIChldmVudCwgb3V0cHV0KSAtPlxuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUob3V0cHV0KVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ3dyaXRlLXRvLXN0ZGVycicsIChldmVudCwgb3V0cHV0KSAtPlxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUob3V0cHV0KVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ2FkZC1yZWNlbnQtZG9jdW1lbnQnLCAoZXZlbnQsIGZpbGVuYW1lKSAtPlxuICAgICAgYXBwLmFkZFJlY2VudERvY3VtZW50KGZpbGVuYW1lKVxuXG4gICAgQGRpc3Bvc2FibGUuYWRkIGlwY0hlbHBlcnMub24gaXBjTWFpbiwgJ2V4ZWN1dGUtamF2YXNjcmlwdC1pbi1kZXYtdG9vbHMnLCAoZXZlbnQsIGNvZGUpIC0+XG4gICAgICBldmVudC5zZW5kZXIuZGV2VG9vbHNXZWJDb250ZW50cz8uZXhlY3V0ZUphdmFTY3JpcHQoY29kZSlcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGlwY01haW4sICdnZXQtYXV0by11cGRhdGUtbWFuYWdlci1zdGF0ZScsIChldmVudCkgPT5cbiAgICAgIGV2ZW50LnJldHVyblZhbHVlID0gQGF1dG9VcGRhdGVNYW5hZ2VyLmdldFN0YXRlKClcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGlwY01haW4sICdnZXQtYXV0by11cGRhdGUtbWFuYWdlci1lcnJvcicsIChldmVudCkgPT5cbiAgICAgIGV2ZW50LnJldHVyblZhbHVlID0gQGF1dG9VcGRhdGVNYW5hZ2VyLmdldEVycm9yTWVzc2FnZSgpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQgaXBjSGVscGVycy5vbiBpcGNNYWluLCAnd2lsbC1zYXZlLXBhdGgnLCAoZXZlbnQsIHBhdGgpID0+XG4gICAgICBAZmlsZVJlY292ZXJ5U2VydmljZS53aWxsU2F2ZVBhdGgoQGF0b21XaW5kb3dGb3JFdmVudChldmVudCksIHBhdGgpXG4gICAgICBldmVudC5yZXR1cm5WYWx1ZSA9IHRydWVcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGlwY01haW4sICdkaWQtc2F2ZS1wYXRoJywgKGV2ZW50LCBwYXRoKSA9PlxuICAgICAgQGZpbGVSZWNvdmVyeVNlcnZpY2UuZGlkU2F2ZVBhdGgoQGF0b21XaW5kb3dGb3JFdmVudChldmVudCksIHBhdGgpXG4gICAgICBldmVudC5yZXR1cm5WYWx1ZSA9IHRydWVcblxuICAgIEBkaXNwb3NhYmxlLmFkZCBpcGNIZWxwZXJzLm9uIGlwY01haW4sICdkaWQtY2hhbmdlLXBhdGhzJywgPT5cbiAgICAgIEBzYXZlU3RhdGUoZmFsc2UpXG5cbiAgICBAZGlzcG9zYWJsZS5hZGQoQGRpc2FibGVab29tT25EaXNwbGF5Q2hhbmdlKCkpXG5cbiAgc2V0dXBEb2NrTWVudTogLT5cbiAgICBpZiBwcm9jZXNzLnBsYXRmb3JtIGlzICdkYXJ3aW4nXG4gICAgICBkb2NrTWVudSA9IE1lbnUuYnVpbGRGcm9tVGVtcGxhdGUgW1xuICAgICAgICB7bGFiZWw6ICdOZXcgV2luZG93JywgIGNsaWNrOiA9PiBAZW1pdCgnYXBwbGljYXRpb246bmV3LXdpbmRvdycpfVxuICAgICAgXVxuICAgICAgYXBwLmRvY2suc2V0TWVudSBkb2NrTWVudVxuXG4gICMgUHVibGljOiBFeGVjdXRlcyB0aGUgZ2l2ZW4gY29tbWFuZC5cbiAgI1xuICAjIElmIGl0IGlzbid0IGhhbmRsZWQgZ2xvYmFsbHksIGRlbGVnYXRlIHRvIHRoZSBjdXJyZW50bHkgZm9jdXNlZCB3aW5kb3cuXG4gICNcbiAgIyBjb21tYW5kIC0gVGhlIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGNvbW1hbmQuXG4gICMgYXJncyAtIFRoZSBvcHRpb25hbCBhcmd1bWVudHMgdG8gcGFzcyBhbG9uZy5cbiAgc2VuZENvbW1hbmQ6IChjb21tYW5kLCBhcmdzLi4uKSAtPlxuICAgIHVubGVzcyBAZW1pdChjb21tYW5kLCBhcmdzLi4uKVxuICAgICAgZm9jdXNlZFdpbmRvdyA9IEBmb2N1c2VkV2luZG93KClcbiAgICAgIGlmIGZvY3VzZWRXaW5kb3c/XG4gICAgICAgIGZvY3VzZWRXaW5kb3cuc2VuZENvbW1hbmQoY29tbWFuZCwgYXJncy4uLilcbiAgICAgIGVsc2VcbiAgICAgICAgQHNlbmRDb21tYW5kVG9GaXJzdFJlc3BvbmRlcihjb21tYW5kKVxuXG4gICMgUHVibGljOiBFeGVjdXRlcyB0aGUgZ2l2ZW4gY29tbWFuZCBvbiB0aGUgZ2l2ZW4gd2luZG93LlxuICAjXG4gICMgY29tbWFuZCAtIFRoZSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBjb21tYW5kLlxuICAjIGF0b21XaW5kb3cgLSBUaGUge0F0b21XaW5kb3d9IHRvIHNlbmQgdGhlIGNvbW1hbmQgdG8uXG4gICMgYXJncyAtIFRoZSBvcHRpb25hbCBhcmd1bWVudHMgdG8gcGFzcyBhbG9uZy5cbiAgc2VuZENvbW1hbmRUb1dpbmRvdzogKGNvbW1hbmQsIGF0b21XaW5kb3csIGFyZ3MuLi4pIC0+XG4gICAgdW5sZXNzIEBlbWl0KGNvbW1hbmQsIGFyZ3MuLi4pXG4gICAgICBpZiBhdG9tV2luZG93P1xuICAgICAgICBhdG9tV2luZG93LnNlbmRDb21tYW5kKGNvbW1hbmQsIGFyZ3MuLi4pXG4gICAgICBlbHNlXG4gICAgICAgIEBzZW5kQ29tbWFuZFRvRmlyc3RSZXNwb25kZXIoY29tbWFuZClcblxuICAjIFRyYW5zbGF0ZXMgdGhlIGNvbW1hbmQgaW50byBtYWNPUyBhY3Rpb24gYW5kIHNlbmRzIGl0IHRvIGFwcGxpY2F0aW9uJ3MgZmlyc3RcbiAgIyByZXNwb25kZXIuXG4gIHNlbmRDb21tYW5kVG9GaXJzdFJlc3BvbmRlcjogKGNvbW1hbmQpIC0+XG4gICAgcmV0dXJuIGZhbHNlIHVubGVzcyBwcm9jZXNzLnBsYXRmb3JtIGlzICdkYXJ3aW4nXG5cbiAgICBzd2l0Y2ggY29tbWFuZFxuICAgICAgd2hlbiAnY29yZTp1bmRvJyB0aGVuIE1lbnUuc2VuZEFjdGlvblRvRmlyc3RSZXNwb25kZXIoJ3VuZG86JylcbiAgICAgIHdoZW4gJ2NvcmU6cmVkbycgdGhlbiBNZW51LnNlbmRBY3Rpb25Ub0ZpcnN0UmVzcG9uZGVyKCdyZWRvOicpXG4gICAgICB3aGVuICdjb3JlOmNvcHknIHRoZW4gTWVudS5zZW5kQWN0aW9uVG9GaXJzdFJlc3BvbmRlcignY29weTonKVxuICAgICAgd2hlbiAnY29yZTpjdXQnIHRoZW4gTWVudS5zZW5kQWN0aW9uVG9GaXJzdFJlc3BvbmRlcignY3V0OicpXG4gICAgICB3aGVuICdjb3JlOnBhc3RlJyB0aGVuIE1lbnUuc2VuZEFjdGlvblRvRmlyc3RSZXNwb25kZXIoJ3Bhc3RlOicpXG4gICAgICB3aGVuICdjb3JlOnNlbGVjdC1hbGwnIHRoZW4gTWVudS5zZW5kQWN0aW9uVG9GaXJzdFJlc3BvbmRlcignc2VsZWN0QWxsOicpXG4gICAgICBlbHNlIHJldHVybiBmYWxzZVxuICAgIHRydWVcblxuICAjIFB1YmxpYzogT3BlbiB0aGUgZ2l2ZW4gcGF0aCBpbiB0aGUgZm9jdXNlZCB3aW5kb3cgd2hlbiB0aGUgZXZlbnQgaXNcbiAgIyB0cmlnZ2VyZWQuXG4gICNcbiAgIyBBIG5ldyB3aW5kb3cgd2lsbCBiZSBjcmVhdGVkIGlmIHRoZXJlIGlzIG5vIGN1cnJlbnRseSBmb2N1c2VkIHdpbmRvdy5cbiAgI1xuICAjIGV2ZW50TmFtZSAtIFRoZSBldmVudCB0byBsaXN0ZW4gZm9yLlxuICAjIHBhdGhUb09wZW4gLSBUaGUgcGF0aCB0byBvcGVuIHdoZW4gdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgb3BlblBhdGhPbkV2ZW50OiAoZXZlbnROYW1lLCBwYXRoVG9PcGVuKSAtPlxuICAgIEBvbiBldmVudE5hbWUsIC0+XG4gICAgICBpZiB3aW5kb3cgPSBAZm9jdXNlZFdpbmRvdygpXG4gICAgICAgIHdpbmRvdy5vcGVuUGF0aChwYXRoVG9PcGVuKVxuICAgICAgZWxzZVxuICAgICAgICBAb3BlblBhdGgoe3BhdGhUb09wZW59KVxuXG4gICMgUmV0dXJucyB0aGUge0F0b21XaW5kb3d9IGZvciB0aGUgZ2l2ZW4gcGF0aHMuXG4gIHdpbmRvd0ZvclBhdGhzOiAocGF0aHNUb09wZW4sIGRldk1vZGUpIC0+XG4gICAgXy5maW5kIEB3aW5kb3dzLCAoYXRvbVdpbmRvdykgLT5cbiAgICAgIGF0b21XaW5kb3cuZGV2TW9kZSBpcyBkZXZNb2RlIGFuZCBhdG9tV2luZG93LmNvbnRhaW5zUGF0aHMocGF0aHNUb09wZW4pXG5cbiAgIyBSZXR1cm5zIHRoZSB7QXRvbVdpbmRvd30gZm9yIHRoZSBnaXZlbiBpcGNNYWluIGV2ZW50LlxuICBhdG9tV2luZG93Rm9yRXZlbnQ6ICh7c2VuZGVyfSkgLT5cbiAgICBAYXRvbVdpbmRvd0ZvckJyb3dzZXJXaW5kb3coQnJvd3NlcldpbmRvdy5mcm9tV2ViQ29udGVudHMoc2VuZGVyKSlcblxuICBhdG9tV2luZG93Rm9yQnJvd3NlcldpbmRvdzogKGJyb3dzZXJXaW5kb3cpIC0+XG4gICAgQHdpbmRvd3MuZmluZCgoYXRvbVdpbmRvdykgLT4gYXRvbVdpbmRvdy5icm93c2VyV2luZG93IGlzIGJyb3dzZXJXaW5kb3cpXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdGhlIGN1cnJlbnRseSBmb2N1c2VkIHtBdG9tV2luZG93fSBvciB1bmRlZmluZWQgaWYgbm9uZS5cbiAgZm9jdXNlZFdpbmRvdzogLT5cbiAgICBfLmZpbmQgQHdpbmRvd3MsIChhdG9tV2luZG93KSAtPiBhdG9tV2luZG93LmlzRm9jdXNlZCgpXG5cbiAgIyBHZXQgdGhlIHBsYXRmb3JtLXNwZWNpZmljIHdpbmRvdyBvZmZzZXQgZm9yIG5ldyB3aW5kb3dzLlxuICBnZXRXaW5kb3dPZmZzZXRGb3JDdXJyZW50UGxhdGZvcm06IC0+XG4gICAgb2Zmc2V0QnlQbGF0Zm9ybSA9XG4gICAgICBkYXJ3aW46IDIyXG4gICAgICB3aW4zMjogMjZcbiAgICBvZmZzZXRCeVBsYXRmb3JtW3Byb2Nlc3MucGxhdGZvcm1dID8gMFxuXG4gICMgR2V0IHRoZSBkaW1lbnNpb25zIGZvciBvcGVuaW5nIGEgbmV3IHdpbmRvdyBieSBjYXNjYWRpbmcgYXMgYXBwcm9wcmlhdGUgdG9cbiAgIyB0aGUgcGxhdGZvcm0uXG4gIGdldERpbWVuc2lvbnNGb3JOZXdXaW5kb3c6IC0+XG4gICAgcmV0dXJuIGlmIChAZm9jdXNlZFdpbmRvdygpID8gQGxhc3RGb2N1c2VkV2luZG93KT8uaXNNYXhpbWl6ZWQoKVxuICAgIGRpbWVuc2lvbnMgPSAoQGZvY3VzZWRXaW5kb3coKSA/IEBsYXN0Rm9jdXNlZFdpbmRvdyk/LmdldERpbWVuc2lvbnMoKVxuICAgIG9mZnNldCA9IEBnZXRXaW5kb3dPZmZzZXRGb3JDdXJyZW50UGxhdGZvcm0oKVxuICAgIGlmIGRpbWVuc2lvbnM/IGFuZCBvZmZzZXQ/XG4gICAgICBkaW1lbnNpb25zLnggKz0gb2Zmc2V0XG4gICAgICBkaW1lbnNpb25zLnkgKz0gb2Zmc2V0XG4gICAgZGltZW5zaW9uc1xuXG4gICMgUHVibGljOiBPcGVucyBhIHNpbmdsZSBwYXRoLCBpbiBhbiBleGlzdGluZyB3aW5kb3cgaWYgcG9zc2libGUuXG4gICNcbiAgIyBvcHRpb25zIC1cbiAgIyAgIDpwYXRoVG9PcGVuIC0gVGhlIGZpbGUgcGF0aCB0byBvcGVuXG4gICMgICA6cGlkVG9LaWxsV2hlbkNsb3NlZCAtIFRoZSBpbnRlZ2VyIG9mIHRoZSBwaWQgdG8ga2lsbFxuICAjICAgOm5ld1dpbmRvdyAtIEJvb2xlYW4gb2Ygd2hldGhlciB0aGlzIHNob3VsZCBiZSBvcGVuZWQgaW4gYSBuZXcgd2luZG93LlxuICAjICAgOmRldk1vZGUgLSBCb29sZWFuIHRvIGNvbnRyb2wgdGhlIG9wZW5lZCB3aW5kb3cncyBkZXYgbW9kZS5cbiAgIyAgIDpzYWZlTW9kZSAtIEJvb2xlYW4gdG8gY29udHJvbCB0aGUgb3BlbmVkIHdpbmRvdydzIHNhZmUgbW9kZS5cbiAgIyAgIDpwcm9maWxlU3RhcnR1cCAtIEJvb2xlYW4gdG8gY29udHJvbCBjcmVhdGluZyBhIHByb2ZpbGUgb2YgdGhlIHN0YXJ0dXAgdGltZS5cbiAgIyAgIDp3aW5kb3cgLSB7QXRvbVdpbmRvd30gdG8gb3BlbiBmaWxlIHBhdGhzIGluLlxuICAjICAgOmFkZFRvTGFzdFdpbmRvdyAtIEJvb2xlYW4gb2Ygd2hldGhlciB0aGlzIHNob3VsZCBiZSBvcGVuZWQgaW4gbGFzdCBmb2N1c2VkIHdpbmRvdy5cbiAgb3BlblBhdGg6ICh7aW5pdGlhbFBhdGhzLCBwYXRoVG9PcGVuLCBwaWRUb0tpbGxXaGVuQ2xvc2VkLCBuZXdXaW5kb3csIGRldk1vZGUsIHNhZmVNb2RlLCBwcm9maWxlU3RhcnR1cCwgd2luZG93LCBjbGVhcldpbmRvd1N0YXRlLCBhZGRUb0xhc3RXaW5kb3csIGVudn0gPSB7fSkgLT5cbiAgICBAb3BlblBhdGhzKHtpbml0aWFsUGF0aHMsIHBhdGhzVG9PcGVuOiBbcGF0aFRvT3Blbl0sIHBpZFRvS2lsbFdoZW5DbG9zZWQsIG5ld1dpbmRvdywgZGV2TW9kZSwgc2FmZU1vZGUsIHByb2ZpbGVTdGFydHVwLCB3aW5kb3csIGNsZWFyV2luZG93U3RhdGUsIGFkZFRvTGFzdFdpbmRvdywgZW52fSlcblxuICAjIFB1YmxpYzogT3BlbnMgbXVsdGlwbGUgcGF0aHMsIGluIGV4aXN0aW5nIHdpbmRvd3MgaWYgcG9zc2libGUuXG4gICNcbiAgIyBvcHRpb25zIC1cbiAgIyAgIDpwYXRoc1RvT3BlbiAtIFRoZSBhcnJheSBvZiBmaWxlIHBhdGhzIHRvIG9wZW5cbiAgIyAgIDpwaWRUb0tpbGxXaGVuQ2xvc2VkIC0gVGhlIGludGVnZXIgb2YgdGhlIHBpZCB0byBraWxsXG4gICMgICA6bmV3V2luZG93IC0gQm9vbGVhbiBvZiB3aGV0aGVyIHRoaXMgc2hvdWxkIGJlIG9wZW5lZCBpbiBhIG5ldyB3aW5kb3cuXG4gICMgICA6ZGV2TW9kZSAtIEJvb2xlYW4gdG8gY29udHJvbCB0aGUgb3BlbmVkIHdpbmRvdydzIGRldiBtb2RlLlxuICAjICAgOnNhZmVNb2RlIC0gQm9vbGVhbiB0byBjb250cm9sIHRoZSBvcGVuZWQgd2luZG93J3Mgc2FmZSBtb2RlLlxuICAjICAgOndpbmRvd0RpbWVuc2lvbnMgLSBPYmplY3Qgd2l0aCBoZWlnaHQgYW5kIHdpZHRoIGtleXMuXG4gICMgICA6d2luZG93IC0ge0F0b21XaW5kb3d9IHRvIG9wZW4gZmlsZSBwYXRocyBpbi5cbiAgIyAgIDphZGRUb0xhc3RXaW5kb3cgLSBCb29sZWFuIG9mIHdoZXRoZXIgdGhpcyBzaG91bGQgYmUgb3BlbmVkIGluIGxhc3QgZm9jdXNlZCB3aW5kb3cuXG4gIG9wZW5QYXRoczogKHtpbml0aWFsUGF0aHMsIHBhdGhzVG9PcGVuLCBleGVjdXRlZEZyb20sIHBpZFRvS2lsbFdoZW5DbG9zZWQsIG5ld1dpbmRvdywgZGV2TW9kZSwgc2FmZU1vZGUsIHdpbmRvd0RpbWVuc2lvbnMsIHByb2ZpbGVTdGFydHVwLCB3aW5kb3csIGNsZWFyV2luZG93U3RhdGUsIGFkZFRvTGFzdFdpbmRvdywgZW52fT17fSkgLT5cbiAgICBpZiBub3QgcGF0aHNUb09wZW4/IG9yIHBhdGhzVG9PcGVuLmxlbmd0aCBpcyAwXG4gICAgICByZXR1cm5cbiAgICBlbnYgPSBwcm9jZXNzLmVudiB1bmxlc3MgZW52P1xuICAgIGRldk1vZGUgPSBCb29sZWFuKGRldk1vZGUpXG4gICAgc2FmZU1vZGUgPSBCb29sZWFuKHNhZmVNb2RlKVxuICAgIGNsZWFyV2luZG93U3RhdGUgPSBCb29sZWFuKGNsZWFyV2luZG93U3RhdGUpXG4gICAgbG9jYXRpb25zVG9PcGVuID0gKEBsb2NhdGlvbkZvclBhdGhUb09wZW4ocGF0aFRvT3BlbiwgZXhlY3V0ZWRGcm9tLCBhZGRUb0xhc3RXaW5kb3cpIGZvciBwYXRoVG9PcGVuIGluIHBhdGhzVG9PcGVuKVxuICAgIHBhdGhzVG9PcGVuID0gKGxvY2F0aW9uVG9PcGVuLnBhdGhUb09wZW4gZm9yIGxvY2F0aW9uVG9PcGVuIGluIGxvY2F0aW9uc1RvT3BlbilcblxuICAgIHVubGVzcyBwaWRUb0tpbGxXaGVuQ2xvc2VkIG9yIG5ld1dpbmRvd1xuICAgICAgZXhpc3RpbmdXaW5kb3cgPSBAd2luZG93Rm9yUGF0aHMocGF0aHNUb09wZW4sIGRldk1vZGUpXG4gICAgICBzdGF0cyA9IChmcy5zdGF0U3luY05vRXhjZXB0aW9uKHBhdGhUb09wZW4pIGZvciBwYXRoVG9PcGVuIGluIHBhdGhzVG9PcGVuKVxuICAgICAgdW5sZXNzIGV4aXN0aW5nV2luZG93P1xuICAgICAgICBpZiBjdXJyZW50V2luZG93ID0gd2luZG93ID8gQGxhc3RGb2N1c2VkV2luZG93XG4gICAgICAgICAgZXhpc3RpbmdXaW5kb3cgPSBjdXJyZW50V2luZG93IGlmIChcbiAgICAgICAgICAgIGFkZFRvTGFzdFdpbmRvdyBvclxuICAgICAgICAgICAgY3VycmVudFdpbmRvdy5kZXZNb2RlIGlzIGRldk1vZGUgYW5kXG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgIHN0YXRzLmV2ZXJ5KChzdGF0KSAtPiBzdGF0LmlzRmlsZT8oKSkgb3JcbiAgICAgICAgICAgICAgc3RhdHMuc29tZSgoc3RhdCkgLT4gc3RhdC5pc0RpcmVjdG9yeT8oKSBhbmQgbm90IGN1cnJlbnRXaW5kb3cuaGFzUHJvamVjdFBhdGgoKSlcbiAgICAgICAgICAgIClcbiAgICAgICAgICApXG5cbiAgICBpZiBleGlzdGluZ1dpbmRvdz9cbiAgICAgIG9wZW5lZFdpbmRvdyA9IGV4aXN0aW5nV2luZG93XG4gICAgICBvcGVuZWRXaW5kb3cub3BlbkxvY2F0aW9ucyhsb2NhdGlvbnNUb09wZW4pXG4gICAgICBpZiBvcGVuZWRXaW5kb3cuaXNNaW5pbWl6ZWQoKVxuICAgICAgICBvcGVuZWRXaW5kb3cucmVzdG9yZSgpXG4gICAgICBlbHNlXG4gICAgICAgIG9wZW5lZFdpbmRvdy5mb2N1cygpXG4gICAgICBvcGVuZWRXaW5kb3cucmVwbGFjZUVudmlyb25tZW50KGVudilcbiAgICBlbHNlXG4gICAgICBpZiBkZXZNb2RlXG4gICAgICAgIHRyeVxuICAgICAgICAgIHdpbmRvd0luaXRpYWxpemF0aW9uU2NyaXB0ID0gcmVxdWlyZS5yZXNvbHZlKHBhdGguam9pbihAZGV2UmVzb3VyY2VQYXRoLCAnc3JjJywgJ2luaXRpYWxpemUtYXBwbGljYXRpb24td2luZG93JykpXG4gICAgICAgICAgcmVzb3VyY2VQYXRoID0gQGRldlJlc291cmNlUGF0aFxuXG4gICAgICB3aW5kb3dJbml0aWFsaXphdGlvblNjcmlwdCA/PSByZXF1aXJlLnJlc29sdmUoJy4uL2luaXRpYWxpemUtYXBwbGljYXRpb24td2luZG93JylcbiAgICAgIHJlc291cmNlUGF0aCA/PSBAcmVzb3VyY2VQYXRoXG4gICAgICB3aW5kb3dEaW1lbnNpb25zID89IEBnZXREaW1lbnNpb25zRm9yTmV3V2luZG93KClcbiAgICAgIG9wZW5lZFdpbmRvdyA9IG5ldyBBdG9tV2luZG93KHRoaXMsIEBmaWxlUmVjb3ZlcnlTZXJ2aWNlLCB7aW5pdGlhbFBhdGhzLCBsb2NhdGlvbnNUb09wZW4sIHdpbmRvd0luaXRpYWxpemF0aW9uU2NyaXB0LCByZXNvdXJjZVBhdGgsIGRldk1vZGUsIHNhZmVNb2RlLCB3aW5kb3dEaW1lbnNpb25zLCBwcm9maWxlU3RhcnR1cCwgY2xlYXJXaW5kb3dTdGF0ZSwgZW52fSlcbiAgICAgIG9wZW5lZFdpbmRvdy5mb2N1cygpXG4gICAgICBAbGFzdEZvY3VzZWRXaW5kb3cgPSBvcGVuZWRXaW5kb3dcblxuICAgIGlmIHBpZFRvS2lsbFdoZW5DbG9zZWQ/XG4gICAgICBAcGlkc1RvT3BlbldpbmRvd3NbcGlkVG9LaWxsV2hlbkNsb3NlZF0gPSBvcGVuZWRXaW5kb3dcblxuICAgIG9wZW5lZFdpbmRvdy5icm93c2VyV2luZG93Lm9uY2UgJ2Nsb3NlZCcsID0+XG4gICAgICBAa2lsbFByb2Nlc3NGb3JXaW5kb3cob3BlbmVkV2luZG93KVxuXG4gICAgb3BlbmVkV2luZG93XG5cbiAgIyBLaWxsIGFsbCBwcm9jZXNzZXMgYXNzb2NpYXRlZCB3aXRoIG9wZW5lZCB3aW5kb3dzLlxuICBraWxsQWxsUHJvY2Vzc2VzOiAtPlxuICAgIEBraWxsUHJvY2VzcyhwaWQpIGZvciBwaWQgb2YgQHBpZHNUb09wZW5XaW5kb3dzXG4gICAgcmV0dXJuXG5cbiAgIyBLaWxsIHByb2Nlc3MgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBvcGVuZWQgd2luZG93LlxuICBraWxsUHJvY2Vzc0ZvcldpbmRvdzogKG9wZW5lZFdpbmRvdykgLT5cbiAgICBmb3IgcGlkLCB0cmFja2VkV2luZG93IG9mIEBwaWRzVG9PcGVuV2luZG93c1xuICAgICAgQGtpbGxQcm9jZXNzKHBpZCkgaWYgdHJhY2tlZFdpbmRvdyBpcyBvcGVuZWRXaW5kb3dcbiAgICByZXR1cm5cblxuICAjIEtpbGwgdGhlIHByb2Nlc3Mgd2l0aCB0aGUgZ2l2ZW4gcGlkLlxuICBraWxsUHJvY2VzczogKHBpZCkgLT5cbiAgICB0cnlcbiAgICAgIHBhcnNlZFBpZCA9IHBhcnNlSW50KHBpZClcbiAgICAgIHByb2Nlc3Mua2lsbChwYXJzZWRQaWQpIGlmIGlzRmluaXRlKHBhcnNlZFBpZClcbiAgICBjYXRjaCBlcnJvclxuICAgICAgaWYgZXJyb3IuY29kZSBpc250ICdFU1JDSCdcbiAgICAgICAgY29uc29sZS5sb2coXCJLaWxsaW5nIHByb2Nlc3MgI3twaWR9IGZhaWxlZDogI3tlcnJvci5jb2RlID8gZXJyb3IubWVzc2FnZX1cIilcbiAgICBkZWxldGUgQHBpZHNUb09wZW5XaW5kb3dzW3BpZF1cblxuICBzYXZlU3RhdGU6IChhbGxvd0VtcHR5PWZhbHNlKSAtPlxuICAgIHJldHVybiBpZiBAcXVpdHRpbmdcbiAgICBzdGF0ZXMgPSBbXVxuICAgIGZvciB3aW5kb3cgaW4gQHdpbmRvd3NcbiAgICAgIHVubGVzcyB3aW5kb3cuaXNTcGVjXG4gICAgICAgIHN0YXRlcy5wdXNoKHtpbml0aWFsUGF0aHM6IHdpbmRvdy5yZXByZXNlbnRlZERpcmVjdG9yeVBhdGhzfSlcbiAgICBpZiBzdGF0ZXMubGVuZ3RoID4gMCBvciBhbGxvd0VtcHR5XG4gICAgICBAc3RvcmFnZUZvbGRlci5zdG9yZVN5bmMoJ2FwcGxpY2F0aW9uLmpzb24nLCBzdGF0ZXMpXG4gICAgICBAZW1pdCgnYXBwbGljYXRpb246ZGlkLXNhdmUtc3RhdGUnKVxuXG4gIGxvYWRTdGF0ZTogKG9wdGlvbnMpIC0+XG4gICAgaWYgKEBjb25maWcuZ2V0KCdjb3JlLnJlc3RvcmVQcmV2aW91c1dpbmRvd3NPblN0YXJ0JykgaW4gWyd5ZXMnLCAnYWx3YXlzJ10pIGFuZCAoc3RhdGVzID0gQHN0b3JhZ2VGb2xkZXIubG9hZCgnYXBwbGljYXRpb24uanNvbicpKT8ubGVuZ3RoID4gMFxuICAgICAgZm9yIHN0YXRlIGluIHN0YXRlc1xuICAgICAgICBAb3BlbldpdGhPcHRpb25zKE9iamVjdC5hc3NpZ24ob3B0aW9ucywge1xuICAgICAgICAgIGluaXRpYWxQYXRoczogc3RhdGUuaW5pdGlhbFBhdGhzXG4gICAgICAgICAgcGF0aHNUb09wZW46IHN0YXRlLmluaXRpYWxQYXRocy5maWx0ZXIgKGRpcmVjdG9yeVBhdGgpIC0+IGZzLmlzRGlyZWN0b3J5U3luYyhkaXJlY3RvcnlQYXRoKVxuICAgICAgICAgIHVybHNUb09wZW46IFtdXG4gICAgICAgICAgZGV2TW9kZTogQGRldk1vZGVcbiAgICAgICAgICBzYWZlTW9kZTogQHNhZmVNb2RlXG4gICAgICAgIH0pKVxuICAgIGVsc2VcbiAgICAgIG51bGxcblxuICAjIE9wZW4gYW4gYXRvbTovLyB1cmwuXG4gICNcbiAgIyBUaGUgaG9zdCBvZiB0aGUgVVJMIGJlaW5nIG9wZW5lZCBpcyBhc3N1bWVkIHRvIGJlIHRoZSBwYWNrYWdlIG5hbWVcbiAgIyByZXNwb25zaWJsZSBmb3Igb3BlbmluZyB0aGUgVVJMLiAgQSBuZXcgd2luZG93IHdpbGwgYmUgY3JlYXRlZCB3aXRoXG4gICMgdGhhdCBwYWNrYWdlJ3MgYHVybE1haW5gIGFzIHRoZSBib290c3RyYXAgc2NyaXB0LlxuICAjXG4gICMgb3B0aW9ucyAtXG4gICMgICA6dXJsVG9PcGVuIC0gVGhlIGF0b206Ly8gdXJsIHRvIG9wZW4uXG4gICMgICA6ZGV2TW9kZSAtIEJvb2xlYW4gdG8gY29udHJvbCB0aGUgb3BlbmVkIHdpbmRvdydzIGRldiBtb2RlLlxuICAjICAgOnNhZmVNb2RlIC0gQm9vbGVhbiB0byBjb250cm9sIHRoZSBvcGVuZWQgd2luZG93J3Mgc2FmZSBtb2RlLlxuICBvcGVuVXJsOiAoe3VybFRvT3BlbiwgZGV2TW9kZSwgc2FmZU1vZGUsIGVudn0pIC0+XG4gICAgdW5sZXNzIEBwYWNrYWdlcz9cbiAgICAgIFBhY2thZ2VNYW5hZ2VyID0gcmVxdWlyZSAnLi4vcGFja2FnZS1tYW5hZ2VyJ1xuICAgICAgQHBhY2thZ2VzID0gbmV3IFBhY2thZ2VNYW5hZ2VyKHt9KVxuICAgICAgQHBhY2thZ2VzLmluaXRpYWxpemVcbiAgICAgICAgY29uZmlnRGlyUGF0aDogcHJvY2Vzcy5lbnYuQVRPTV9IT01FXG4gICAgICAgIGRldk1vZGU6IGRldk1vZGVcbiAgICAgICAgcmVzb3VyY2VQYXRoOiBAcmVzb3VyY2VQYXRoXG5cbiAgICBwYWNrYWdlTmFtZSA9IHVybC5wYXJzZSh1cmxUb09wZW4pLmhvc3RcbiAgICBwYWNrID0gXy5maW5kIEBwYWNrYWdlcy5nZXRBdmFpbGFibGVQYWNrYWdlTWV0YWRhdGEoKSwgKHtuYW1lfSkgLT4gbmFtZSBpcyBwYWNrYWdlTmFtZVxuICAgIGlmIHBhY2s/XG4gICAgICBpZiBwYWNrLnVybE1haW5cbiAgICAgICAgcGFja2FnZVBhdGggPSBAcGFja2FnZXMucmVzb2x2ZVBhY2thZ2VQYXRoKHBhY2thZ2VOYW1lKVxuICAgICAgICB3aW5kb3dJbml0aWFsaXphdGlvblNjcmlwdCA9IHBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgcGFjay51cmxNYWluKVxuICAgICAgICB3aW5kb3dEaW1lbnNpb25zID0gQGdldERpbWVuc2lvbnNGb3JOZXdXaW5kb3coKVxuICAgICAgICBuZXcgQXRvbVdpbmRvdyh0aGlzLCBAZmlsZVJlY292ZXJ5U2VydmljZSwge3dpbmRvd0luaXRpYWxpemF0aW9uU2NyaXB0LCBAcmVzb3VyY2VQYXRoLCBkZXZNb2RlLCBzYWZlTW9kZSwgdXJsVG9PcGVuLCB3aW5kb3dEaW1lbnNpb25zLCBlbnZ9KVxuICAgICAgZWxzZVxuICAgICAgICBjb25zb2xlLmxvZyBcIlBhY2thZ2UgJyN7cGFjay5uYW1lfScgZG9lcyBub3QgaGF2ZSBhIHVybCBtYWluOiAje3VybFRvT3Blbn1cIlxuICAgIGVsc2VcbiAgICAgIGNvbnNvbGUubG9nIFwiT3BlbmluZyB1bmtub3duIHVybDogI3t1cmxUb09wZW59XCJcblxuICAjIE9wZW5zIHVwIGEgbmV3IHtBdG9tV2luZG93fSB0byBydW4gc3BlY3Mgd2l0aGluLlxuICAjXG4gICMgb3B0aW9ucyAtXG4gICMgICA6aGVhZGxlc3MgLSBBIEJvb2xlYW4gdGhhdCwgaWYgdHJ1ZSwgd2lsbCBjbG9zZSB0aGUgd2luZG93IHVwb25cbiAgIyAgICAgICAgICAgICAgICAgICBjb21wbGV0aW9uLlxuICAjICAgOnJlc291cmNlUGF0aCAtIFRoZSBwYXRoIHRvIGluY2x1ZGUgc3BlY3MgZnJvbS5cbiAgIyAgIDpzcGVjUGF0aCAtIFRoZSBkaXJlY3RvcnkgdG8gbG9hZCBzcGVjcyBmcm9tLlxuICAjICAgOnNhZmVNb2RlIC0gQSBCb29sZWFuIHRoYXQsIGlmIHRydWUsIHdvbid0IHJ1biBzcGVjcyBmcm9tIH4vLmF0b20vcGFja2FnZXNcbiAgIyAgICAgICAgICAgICAgIGFuZCB+Ly5hdG9tL2Rldi9wYWNrYWdlcywgZGVmYXVsdHMgdG8gZmFsc2UuXG4gIHJ1blRlc3RzOiAoe2hlYWRsZXNzLCByZXNvdXJjZVBhdGgsIGV4ZWN1dGVkRnJvbSwgcGF0aHNUb09wZW4sIGxvZ0ZpbGUsIHNhZmVNb2RlLCB0aW1lb3V0LCBlbnZ9KSAtPlxuICAgIGlmIHJlc291cmNlUGF0aCBpc250IEByZXNvdXJjZVBhdGggYW5kIG5vdCBmcy5leGlzdHNTeW5jKHJlc291cmNlUGF0aClcbiAgICAgIHJlc291cmNlUGF0aCA9IEByZXNvdXJjZVBhdGhcblxuICAgIHRpbWVvdXRJblNlY29uZHMgPSBOdW1iZXIucGFyc2VGbG9hdCh0aW1lb3V0KVxuICAgIHVubGVzcyBOdW1iZXIuaXNOYU4odGltZW91dEluU2Vjb25kcylcbiAgICAgIHRpbWVvdXRIYW5kbGVyID0gLT5cbiAgICAgICAgY29uc29sZS5sb2cgXCJUaGUgdGVzdCBzdWl0ZSBoYXMgdGltZWQgb3V0IGJlY2F1c2UgaXQgaGFzIGJlZW4gcnVubmluZyBmb3IgbW9yZSB0aGFuICN7dGltZW91dEluU2Vjb25kc30gc2Vjb25kcy5cIlxuICAgICAgICBwcm9jZXNzLmV4aXQoMTI0KSAjIFVzZSB0aGUgc2FtZSBleGl0IGNvZGUgYXMgdGhlIFVOSVggdGltZW91dCB1dGlsLlxuICAgICAgc2V0VGltZW91dCh0aW1lb3V0SGFuZGxlciwgdGltZW91dEluU2Vjb25kcyAqIDEwMDApXG5cbiAgICB0cnlcbiAgICAgIHdpbmRvd0luaXRpYWxpemF0aW9uU2NyaXB0ID0gcmVxdWlyZS5yZXNvbHZlKHBhdGgucmVzb2x2ZShAZGV2UmVzb3VyY2VQYXRoLCAnc3JjJywgJ2luaXRpYWxpemUtdGVzdC13aW5kb3cnKSlcbiAgICBjYXRjaCBlcnJvclxuICAgICAgd2luZG93SW5pdGlhbGl6YXRpb25TY3JpcHQgPSByZXF1aXJlLnJlc29sdmUocGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ3NyYycsICdpbml0aWFsaXplLXRlc3Qtd2luZG93JykpXG5cbiAgICB0ZXN0UGF0aHMgPSBbXVxuICAgIGlmIHBhdGhzVG9PcGVuP1xuICAgICAgZm9yIHBhdGhUb09wZW4gaW4gcGF0aHNUb09wZW5cbiAgICAgICAgdGVzdFBhdGhzLnB1c2gocGF0aC5yZXNvbHZlKGV4ZWN1dGVkRnJvbSwgZnMubm9ybWFsaXplKHBhdGhUb09wZW4pKSlcblxuICAgIGlmIHRlc3RQYXRocy5sZW5ndGggaXMgMFxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUgJ0Vycm9yOiBTcGVjaWZ5IGF0IGxlYXN0IG9uZSB0ZXN0IHBhdGhcXG5cXG4nXG4gICAgICBwcm9jZXNzLmV4aXQoMSlcblxuICAgIGxlZ2FjeVRlc3RSdW5uZXJQYXRoID0gQHJlc29sdmVMZWdhY3lUZXN0UnVubmVyUGF0aCgpXG4gICAgdGVzdFJ1bm5lclBhdGggPSBAcmVzb2x2ZVRlc3RSdW5uZXJQYXRoKHRlc3RQYXRoc1swXSlcbiAgICBkZXZNb2RlID0gdHJ1ZVxuICAgIGlzU3BlYyA9IHRydWVcbiAgICBzYWZlTW9kZSA/PSBmYWxzZVxuICAgIG5ldyBBdG9tV2luZG93KHRoaXMsIEBmaWxlUmVjb3ZlcnlTZXJ2aWNlLCB7d2luZG93SW5pdGlhbGl6YXRpb25TY3JpcHQsIHJlc291cmNlUGF0aCwgaGVhZGxlc3MsIGlzU3BlYywgZGV2TW9kZSwgdGVzdFJ1bm5lclBhdGgsIGxlZ2FjeVRlc3RSdW5uZXJQYXRoLCB0ZXN0UGF0aHMsIGxvZ0ZpbGUsIHNhZmVNb2RlLCBlbnZ9KVxuXG4gIHJ1bkJlbmNobWFya3M6ICh7aGVhZGxlc3MsIHRlc3QsIHJlc291cmNlUGF0aCwgZXhlY3V0ZWRGcm9tLCBwYXRoc1RvT3BlbiwgZW52fSkgLT5cbiAgICBpZiByZXNvdXJjZVBhdGggaXNudCBAcmVzb3VyY2VQYXRoIGFuZCBub3QgZnMuZXhpc3RzU3luYyhyZXNvdXJjZVBhdGgpXG4gICAgICByZXNvdXJjZVBhdGggPSBAcmVzb3VyY2VQYXRoXG5cbiAgICB0cnlcbiAgICAgIHdpbmRvd0luaXRpYWxpemF0aW9uU2NyaXB0ID0gcmVxdWlyZS5yZXNvbHZlKHBhdGgucmVzb2x2ZShAZGV2UmVzb3VyY2VQYXRoLCAnc3JjJywgJ2luaXRpYWxpemUtYmVuY2htYXJrLXdpbmRvdycpKVxuICAgIGNhdGNoIGVycm9yXG4gICAgICB3aW5kb3dJbml0aWFsaXphdGlvblNjcmlwdCA9IHJlcXVpcmUucmVzb2x2ZShwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAnc3JjJywgJ2luaXRpYWxpemUtYmVuY2htYXJrLXdpbmRvdycpKVxuXG4gICAgYmVuY2htYXJrUGF0aHMgPSBbXVxuICAgIGlmIHBhdGhzVG9PcGVuP1xuICAgICAgZm9yIHBhdGhUb09wZW4gaW4gcGF0aHNUb09wZW5cbiAgICAgICAgYmVuY2htYXJrUGF0aHMucHVzaChwYXRoLnJlc29sdmUoZXhlY3V0ZWRGcm9tLCBmcy5ub3JtYWxpemUocGF0aFRvT3BlbikpKVxuXG4gICAgaWYgYmVuY2htYXJrUGF0aHMubGVuZ3RoIGlzIDBcbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlICdFcnJvcjogU3BlY2lmeSBhdCBsZWFzdCBvbmUgYmVuY2htYXJrIHBhdGguXFxuXFxuJ1xuICAgICAgcHJvY2Vzcy5leGl0KDEpXG5cbiAgICBkZXZNb2RlID0gdHJ1ZVxuICAgIGlzU3BlYyA9IHRydWVcbiAgICBzYWZlTW9kZSA9IGZhbHNlXG4gICAgbmV3IEF0b21XaW5kb3codGhpcywgQGZpbGVSZWNvdmVyeVNlcnZpY2UsIHt3aW5kb3dJbml0aWFsaXphdGlvblNjcmlwdCwgcmVzb3VyY2VQYXRoLCBoZWFkbGVzcywgdGVzdCwgaXNTcGVjLCBkZXZNb2RlLCBiZW5jaG1hcmtQYXRocywgc2FmZU1vZGUsIGVudn0pXG5cbiAgcmVzb2x2ZVRlc3RSdW5uZXJQYXRoOiAodGVzdFBhdGgpIC0+XG4gICAgRmluZFBhcmVudERpciA/PSByZXF1aXJlICdmaW5kLXBhcmVudC1kaXInXG5cbiAgICBpZiBwYWNrYWdlUm9vdCA9IEZpbmRQYXJlbnREaXIuc3luYyh0ZXN0UGF0aCwgJ3BhY2thZ2UuanNvbicpXG4gICAgICBwYWNrYWdlTWV0YWRhdGEgPSByZXF1aXJlKHBhdGguam9pbihwYWNrYWdlUm9vdCwgJ3BhY2thZ2UuanNvbicpKVxuICAgICAgaWYgcGFja2FnZU1ldGFkYXRhLmF0b21UZXN0UnVubmVyXG4gICAgICAgIFJlc29sdmUgPz0gcmVxdWlyZSgncmVzb2x2ZScpXG4gICAgICAgIGlmIHRlc3RSdW5uZXJQYXRoID0gUmVzb2x2ZS5zeW5jKHBhY2thZ2VNZXRhZGF0YS5hdG9tVGVzdFJ1bm5lciwgYmFzZWRpcjogcGFja2FnZVJvb3QsIGV4dGVuc2lvbnM6IE9iamVjdC5rZXlzKHJlcXVpcmUuZXh0ZW5zaW9ucykpXG4gICAgICAgICAgcmV0dXJuIHRlc3RSdW5uZXJQYXRoXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZSBcIkVycm9yOiBDb3VsZCBub3QgcmVzb2x2ZSB0ZXN0IHJ1bm5lciBwYXRoICcje3BhY2thZ2VNZXRhZGF0YS5hdG9tVGVzdFJ1bm5lcn0nXCJcbiAgICAgICAgICBwcm9jZXNzLmV4aXQoMSlcblxuICAgIEByZXNvbHZlTGVnYWN5VGVzdFJ1bm5lclBhdGgoKVxuXG4gIHJlc29sdmVMZWdhY3lUZXN0UnVubmVyUGF0aDogLT5cbiAgICB0cnlcbiAgICAgIHJlcXVpcmUucmVzb2x2ZShwYXRoLnJlc29sdmUoQGRldlJlc291cmNlUGF0aCwgJ3NwZWMnLCAnamFzbWluZS10ZXN0LXJ1bm5lcicpKVxuICAgIGNhdGNoIGVycm9yXG4gICAgICByZXF1aXJlLnJlc29sdmUocGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ3NwZWMnLCAnamFzbWluZS10ZXN0LXJ1bm5lcicpKVxuXG4gIGxvY2F0aW9uRm9yUGF0aFRvT3BlbjogKHBhdGhUb09wZW4sIGV4ZWN1dGVkRnJvbT0nJywgZm9yY2VBZGRUb1dpbmRvdykgLT5cbiAgICByZXR1cm4ge3BhdGhUb09wZW59IHVubGVzcyBwYXRoVG9PcGVuXG5cbiAgICBwYXRoVG9PcGVuID0gcGF0aFRvT3Blbi5yZXBsYWNlKC9bOlxcc10rJC8sICcnKVxuICAgIG1hdGNoID0gcGF0aFRvT3Blbi5tYXRjaChMb2NhdGlvblN1ZmZpeFJlZ0V4cClcblxuICAgIGlmIG1hdGNoP1xuICAgICAgcGF0aFRvT3BlbiA9IHBhdGhUb09wZW4uc2xpY2UoMCwgLW1hdGNoWzBdLmxlbmd0aClcbiAgICAgIGluaXRpYWxMaW5lID0gTWF0aC5tYXgoMCwgcGFyc2VJbnQobWF0Y2hbMV0uc2xpY2UoMSkpIC0gMSkgaWYgbWF0Y2hbMV1cbiAgICAgIGluaXRpYWxDb2x1bW4gPSBNYXRoLm1heCgwLCBwYXJzZUludChtYXRjaFsyXS5zbGljZSgxKSkgLSAxKSBpZiBtYXRjaFsyXVxuICAgIGVsc2VcbiAgICAgIGluaXRpYWxMaW5lID0gaW5pdGlhbENvbHVtbiA9IG51bGxcblxuICAgIHVubGVzcyB1cmwucGFyc2UocGF0aFRvT3BlbikucHJvdG9jb2w/XG4gICAgICBwYXRoVG9PcGVuID0gcGF0aC5yZXNvbHZlKGV4ZWN1dGVkRnJvbSwgZnMubm9ybWFsaXplKHBhdGhUb09wZW4pKVxuXG4gICAge3BhdGhUb09wZW4sIGluaXRpYWxMaW5lLCBpbml0aWFsQ29sdW1uLCBmb3JjZUFkZFRvV2luZG93fVxuXG4gICMgT3BlbnMgYSBuYXRpdmUgZGlhbG9nIHRvIHByb21wdCB0aGUgdXNlciBmb3IgYSBwYXRoLlxuICAjXG4gICMgT25jZSBwYXRocyBhcmUgc2VsZWN0ZWQsIHRoZXkncmUgb3BlbmVkIGluIGEgbmV3IG9yIGV4aXN0aW5nIHtBdG9tV2luZG93fXMuXG4gICNcbiAgIyBvcHRpb25zIC1cbiAgIyAgIDp0eXBlIC0gQSBTdHJpbmcgd2hpY2ggc3BlY2lmaWVzIHRoZSB0eXBlIG9mIHRoZSBkaWFsb2csIGNvdWxkIGJlICdmaWxlJyxcbiAgIyAgICAgICAgICAgJ2ZvbGRlcicgb3IgJ2FsbCcuIFRoZSAnYWxsJyBpcyBvbmx5IGF2YWlsYWJsZSBvbiBtYWNPUy5cbiAgIyAgIDpkZXZNb2RlIC0gQSBCb29sZWFuIHdoaWNoIGNvbnRyb2xzIHdoZXRoZXIgYW55IG5ld2x5IG9wZW5lZCB3aW5kb3dzXG4gICMgICAgICAgICAgICAgIHNob3VsZCBiZSBpbiBkZXYgbW9kZSBvciBub3QuXG4gICMgICA6c2FmZU1vZGUgLSBBIEJvb2xlYW4gd2hpY2ggY29udHJvbHMgd2hldGhlciBhbnkgbmV3bHkgb3BlbmVkIHdpbmRvd3NcbiAgIyAgICAgICAgICAgICAgIHNob3VsZCBiZSBpbiBzYWZlIG1vZGUgb3Igbm90LlxuICAjICAgOndpbmRvdyAtIEFuIHtBdG9tV2luZG93fSB0byB1c2UgZm9yIG9wZW5pbmcgYSBzZWxlY3RlZCBmaWxlIHBhdGguXG4gICMgICA6cGF0aCAtIEFuIG9wdGlvbmFsIFN0cmluZyB3aGljaCBjb250cm9scyB0aGUgZGVmYXVsdCBwYXRoIHRvIHdoaWNoIHRoZVxuICAjICAgICAgICAgICBmaWxlIGRpYWxvZyBvcGVucy5cbiAgcHJvbXB0Rm9yUGF0aFRvT3BlbjogKHR5cGUsIHtkZXZNb2RlLCBzYWZlTW9kZSwgd2luZG93fSwgcGF0aD1udWxsKSAtPlxuICAgIEBwcm9tcHRGb3JQYXRoIHR5cGUsICgocGF0aHNUb09wZW4pID0+XG4gICAgICBAb3BlblBhdGhzKHtwYXRoc1RvT3BlbiwgZGV2TW9kZSwgc2FmZU1vZGUsIHdpbmRvd30pKSwgcGF0aFxuXG4gIHByb21wdEZvclBhdGg6ICh0eXBlLCBjYWxsYmFjaywgcGF0aCkgLT5cbiAgICBwcm9wZXJ0aWVzID1cbiAgICAgIHN3aXRjaCB0eXBlXG4gICAgICAgIHdoZW4gJ2ZpbGUnIHRoZW4gWydvcGVuRmlsZSddXG4gICAgICAgIHdoZW4gJ2ZvbGRlcicgdGhlbiBbJ29wZW5EaXJlY3RvcnknXVxuICAgICAgICB3aGVuICdhbGwnIHRoZW4gWydvcGVuRmlsZScsICdvcGVuRGlyZWN0b3J5J11cbiAgICAgICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoXCIje3R5cGV9IGlzIGFuIGludmFsaWQgdHlwZSBmb3IgcHJvbXB0Rm9yUGF0aFwiKVxuXG4gICAgIyBTaG93IHRoZSBvcGVuIGRpYWxvZyBhcyBjaGlsZCB3aW5kb3cgb24gV2luZG93cyBhbmQgTGludXgsIGFuZCBhc1xuICAgICMgaW5kZXBlbmRlbnQgZGlhbG9nIG9uIG1hY09TLiBUaGlzIG1hdGNoZXMgbW9zdCBuYXRpdmUgYXBwcy5cbiAgICBwYXJlbnRXaW5kb3cgPVxuICAgICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnZGFyd2luJ1xuICAgICAgICBudWxsXG4gICAgICBlbHNlXG4gICAgICAgIEJyb3dzZXJXaW5kb3cuZ2V0Rm9jdXNlZFdpbmRvdygpXG5cbiAgICBvcGVuT3B0aW9ucyA9XG4gICAgICBwcm9wZXJ0aWVzOiBwcm9wZXJ0aWVzLmNvbmNhdChbJ211bHRpU2VsZWN0aW9ucycsICdjcmVhdGVEaXJlY3RvcnknXSlcbiAgICAgIHRpdGxlOiBzd2l0Y2ggdHlwZVxuICAgICAgICB3aGVuICdmaWxlJyB0aGVuICdPcGVuIEZpbGUnXG4gICAgICAgIHdoZW4gJ2ZvbGRlcicgdGhlbiAnT3BlbiBGb2xkZXInXG4gICAgICAgIGVsc2UgJ09wZW4nXG5cbiAgICAjIEZpbGUgZGlhbG9nIGRlZmF1bHRzIHRvIHByb2plY3QgZGlyZWN0b3J5IG9mIGN1cnJlbnRseSBhY3RpdmUgZWRpdG9yXG4gICAgaWYgcGF0aD9cbiAgICAgIG9wZW5PcHRpb25zLmRlZmF1bHRQYXRoID0gcGF0aFxuXG4gICAgZGlhbG9nLnNob3dPcGVuRGlhbG9nKHBhcmVudFdpbmRvdywgb3Blbk9wdGlvbnMsIGNhbGxiYWNrKVxuXG4gIHByb21wdEZvclJlc3RhcnQ6IC0+XG4gICAgY2hvc2VuID0gZGlhbG9nLnNob3dNZXNzYWdlQm94IEJyb3dzZXJXaW5kb3cuZ2V0Rm9jdXNlZFdpbmRvdygpLFxuICAgICAgdHlwZTogJ3dhcm5pbmcnXG4gICAgICB0aXRsZTogJ1Jlc3RhcnQgcmVxdWlyZWQnXG4gICAgICBtZXNzYWdlOiBcIllvdSB3aWxsIG5lZWQgdG8gcmVzdGFydCBBdG9tIGZvciB0aGlzIGNoYW5nZSB0byB0YWtlIGVmZmVjdC5cIlxuICAgICAgYnV0dG9uczogWydSZXN0YXJ0IEF0b20nLCAnQ2FuY2VsJ11cbiAgICBpZiBjaG9zZW4gaXMgMFxuICAgICAgQHJlc3RhcnQoKVxuXG4gIHJlc3RhcnQ6IC0+XG4gICAgYXJncyA9IFtdXG4gICAgYXJncy5wdXNoKFwiLS1zYWZlXCIpIGlmIEBzYWZlTW9kZVxuICAgIGFyZ3MucHVzaChcIi0tbG9nLWZpbGU9I3tAbG9nRmlsZX1cIikgaWYgQGxvZ0ZpbGU/XG4gICAgYXJncy5wdXNoKFwiLS1zb2NrZXQtcGF0aD0je0Bzb2NrZXRQYXRofVwiKSBpZiBAc29ja2V0UGF0aD9cbiAgICBhcmdzLnB1c2goXCItLXVzZXItZGF0YS1kaXI9I3tAdXNlckRhdGFEaXJ9XCIpIGlmIEB1c2VyRGF0YURpcj9cbiAgICBpZiBAZGV2TW9kZVxuICAgICAgYXJncy5wdXNoKCctLWRldicpXG4gICAgICBhcmdzLnB1c2goXCItLXJlc291cmNlLXBhdGg9I3tAcmVzb3VyY2VQYXRofVwiKVxuICAgIGFwcC5yZWxhdW5jaCh7YXJnc30pXG4gICAgYXBwLnF1aXQoKVxuXG4gIGRpc2FibGVab29tT25EaXNwbGF5Q2hhbmdlOiAtPlxuICAgIG91dGVyQ2FsbGJhY2sgPSA9PlxuICAgICAgZm9yIHdpbmRvdyBpbiBAd2luZG93c1xuICAgICAgICB3aW5kb3cuZGlzYWJsZVpvb20oKVxuXG4gICAgIyBTZXQgdGhlIGxpbWl0cyBldmVyeSB0aW1lIGEgZGlzcGxheSBpcyBhZGRlZCBvciByZW1vdmVkLCBvdGhlcndpc2UgdGhlXG4gICAgIyBjb25maWd1cmF0aW9uIGdldHMgcmVzZXQgdG8gdGhlIGRlZmF1bHQsIHdoaWNoIGFsbG93cyB6b29taW5nIHRoZVxuICAgICMgd2ViZnJhbWUuXG4gICAgc2NyZWVuLm9uKCdkaXNwbGF5LWFkZGVkJywgb3V0ZXJDYWxsYmFjaylcbiAgICBzY3JlZW4ub24oJ2Rpc3BsYXktcmVtb3ZlZCcsIG91dGVyQ2FsbGJhY2spXG4gICAgbmV3IERpc3Bvc2FibGUgLT5cbiAgICAgIHNjcmVlbi5yZW1vdmVMaXN0ZW5lcignZGlzcGxheS1hZGRlZCcsIG91dGVyQ2FsbGJhY2spXG4gICAgICBzY3JlZW4ucmVtb3ZlTGlzdGVuZXIoJ2Rpc3BsYXktcmVtb3ZlZCcsIG91dGVyQ2FsbGJhY2spXG4iXX0=
