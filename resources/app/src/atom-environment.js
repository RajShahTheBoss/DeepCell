(function() {
  var AtomEnvironment, AutoUpdateManager, CommandInstaller, CommandRegistry, CompositeDisposable, Config, ConfigSchema, ContextMenuManager, DeserializerManager, Disposable, Dock, Emitter, GrammarRegistry, Gutter, HistoryManager, HistoryProject, KeymapManager, MenuManager, Model, NotificationManager, PackageManager, Pane, PaneAxis, PaneContainer, Panel, PanelContainer, Project, ReopenProjectMenuManager, StateStore, StorageFolder, StyleManager, TextBuffer, TextEditor, TextEditorRegistry, ThemeManager, TitleBar, TooltipManager, ViewRegistry, WindowEventHandler, Workspace, _, crypto, deprecate, fs, ipcRenderer, mapSourcePosition, path, ref, ref1, registerDefaultCommands, updateProcessEnv,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    slice = [].slice,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  crypto = require('crypto');

  path = require('path');

  ipcRenderer = require('electron').ipcRenderer;

  _ = require('underscore-plus');

  deprecate = require('grim').deprecate;

  ref = require('event-kit'), CompositeDisposable = ref.CompositeDisposable, Disposable = ref.Disposable, Emitter = ref.Emitter;

  fs = require('fs-plus');

  mapSourcePosition = require('@atom/source-map-support').mapSourcePosition;

  Model = require('./model');

  WindowEventHandler = require('./window-event-handler');

  StateStore = require('./state-store');

  StorageFolder = require('./storage-folder');

  registerDefaultCommands = require('./register-default-commands');

  updateProcessEnv = require('./update-process-env').updateProcessEnv;

  ConfigSchema = require('./config-schema');

  DeserializerManager = require('./deserializer-manager');

  ViewRegistry = require('./view-registry');

  NotificationManager = require('./notification-manager');

  Config = require('./config');

  KeymapManager = require('./keymap-extensions');

  TooltipManager = require('./tooltip-manager');

  CommandRegistry = require('./command-registry');

  GrammarRegistry = require('./grammar-registry');

  ref1 = require('./history-manager'), HistoryManager = ref1.HistoryManager, HistoryProject = ref1.HistoryProject;

  ReopenProjectMenuManager = require('./reopen-project-menu-manager');

  StyleManager = require('./style-manager');

  PackageManager = require('./package-manager');

  ThemeManager = require('./theme-manager');

  MenuManager = require('./menu-manager');

  ContextMenuManager = require('./context-menu-manager');

  CommandInstaller = require('./command-installer');

  Project = require('./project');

  TitleBar = require('./title-bar');

  Workspace = require('./workspace');

  PanelContainer = require('./panel-container');

  Panel = require('./panel');

  PaneContainer = require('./pane-container');

  PaneAxis = require('./pane-axis');

  Pane = require('./pane');

  Dock = require('./dock');

  Project = require('./project');

  TextEditor = require('./text-editor');

  TextBuffer = require('text-buffer');

  Gutter = require('./gutter');

  TextEditorRegistry = require('./text-editor-registry');

  AutoUpdateManager = require('./auto-update-manager');

  module.exports = AtomEnvironment = (function(superClass) {
    extend(AtomEnvironment, superClass);

    AtomEnvironment.version = 1;

    AtomEnvironment.prototype.lastUncaughtError = null;


    /*
    Section: Properties
     */

    AtomEnvironment.prototype.commands = null;

    AtomEnvironment.prototype.config = null;

    AtomEnvironment.prototype.clipboard = null;

    AtomEnvironment.prototype.contextMenu = null;

    AtomEnvironment.prototype.menu = null;

    AtomEnvironment.prototype.keymaps = null;

    AtomEnvironment.prototype.tooltips = null;

    AtomEnvironment.prototype.notifications = null;

    AtomEnvironment.prototype.project = null;

    AtomEnvironment.prototype.grammars = null;

    AtomEnvironment.prototype.history = null;

    AtomEnvironment.prototype.packages = null;

    AtomEnvironment.prototype.themes = null;

    AtomEnvironment.prototype.styles = null;

    AtomEnvironment.prototype.deserializers = null;

    AtomEnvironment.prototype.views = null;

    AtomEnvironment.prototype.workspace = null;

    AtomEnvironment.prototype.textEditors = null;

    AtomEnvironment.prototype.autoUpdater = null;

    AtomEnvironment.prototype.saveStateDebounceInterval = 1000;


    /*
    Section: Construction and Destruction
     */

    function AtomEnvironment(params) {
      var onlyLoadBaseStyleSheets;
      if (params == null) {
        params = {};
      }
      this.applicationDelegate = params.applicationDelegate, this.clipboard = params.clipboard, this.enablePersistence = params.enablePersistence, onlyLoadBaseStyleSheets = params.onlyLoadBaseStyleSheets, this.updateProcessEnv = params.updateProcessEnv;
      this.nextProxyRequestId = 0;
      this.unloaded = false;
      this.loadTime = null;
      this.emitter = new Emitter;
      this.disposables = new CompositeDisposable;
      this.deserializers = new DeserializerManager(this);
      this.deserializeTimings = {};
      this.views = new ViewRegistry(this);
      this.notifications = new NotificationManager;
      if (this.updateProcessEnv == null) {
        this.updateProcessEnv = updateProcessEnv;
      }
      this.stateStore = new StateStore('AtomEnvironments', 1);
      this.config = new Config({
        notificationManager: this.notifications,
        enablePersistence: this.enablePersistence
      });
      this.config.setSchema(null, {
        type: 'object',
        properties: _.clone(ConfigSchema)
      });
      this.keymaps = new KeymapManager({
        notificationManager: this.notifications
      });
      this.tooltips = new TooltipManager({
        keymapManager: this.keymaps,
        viewRegistry: this.views
      });
      this.commands = new CommandRegistry;
      this.grammars = new GrammarRegistry({
        config: this.config
      });
      this.styles = new StyleManager();
      this.packages = new PackageManager({
        config: this.config,
        styleManager: this.styles,
        commandRegistry: this.commands,
        keymapManager: this.keymaps,
        notificationManager: this.notifications,
        grammarRegistry: this.grammars,
        deserializerManager: this.deserializers,
        viewRegistry: this.views
      });
      this.themes = new ThemeManager({
        packageManager: this.packages,
        config: this.config,
        styleManager: this.styles,
        notificationManager: this.notifications,
        viewRegistry: this.views
      });
      this.menu = new MenuManager({
        keymapManager: this.keymaps,
        packageManager: this.packages
      });
      this.contextMenu = new ContextMenuManager({
        keymapManager: this.keymaps
      });
      this.packages.setMenuManager(this.menu);
      this.packages.setContextMenuManager(this.contextMenu);
      this.packages.setThemeManager(this.themes);
      this.project = new Project({
        notificationManager: this.notifications,
        packageManager: this.packages,
        config: this.config,
        applicationDelegate: this.applicationDelegate
      });
      this.commandInstaller = new CommandInstaller(this.applicationDelegate);
      this.textEditors = new TextEditorRegistry({
        config: this.config,
        grammarRegistry: this.grammars,
        assert: this.assert.bind(this),
        packageManager: this.packages
      });
      this.workspace = new Workspace({
        config: this.config,
        project: this.project,
        packageManager: this.packages,
        grammarRegistry: this.grammars,
        deserializerManager: this.deserializers,
        notificationManager: this.notifications,
        applicationDelegate: this.applicationDelegate,
        viewRegistry: this.views,
        assert: this.assert.bind(this),
        textEditorRegistry: this.textEditors,
        styleManager: this.styles,
        enablePersistence: this.enablePersistence
      });
      this.themes.workspace = this.workspace;
      this.autoUpdater = new AutoUpdateManager({
        applicationDelegate: this.applicationDelegate
      });
      if (this.keymaps.canLoadBundledKeymapsFromMemory()) {
        this.keymaps.loadBundledKeymaps();
      }
      this.registerDefaultCommands();
      this.registerDefaultOpeners();
      this.registerDefaultDeserializers();
      this.windowEventHandler = new WindowEventHandler({
        atomEnvironment: this,
        applicationDelegate: this.applicationDelegate
      });
      this.history = new HistoryManager({
        project: this.project,
        commands: this.commands,
        stateStore: this.stateStore
      });
      this.disposables.add(this.history.onDidChangeProjects((function(_this) {
        return function(e) {
          if (!e.reloaded) {
            return _this.applicationDelegate.didChangeHistoryManager();
          }
        };
      })(this)));
    }

    AtomEnvironment.prototype.initialize = function(params) {
      var clearWindowState, devMode, onlyLoadBaseStyleSheets, ref2, resourcePath, safeMode;
      if (params == null) {
        params = {};
      }
      require('./text-editor-element');
      this.window = params.window, this.document = params.document, this.blobStore = params.blobStore, this.configDirPath = params.configDirPath, onlyLoadBaseStyleSheets = params.onlyLoadBaseStyleSheets;
      ref2 = this.getLoadSettings(), devMode = ref2.devMode, safeMode = ref2.safeMode, resourcePath = ref2.resourcePath, clearWindowState = ref2.clearWindowState;
      if (clearWindowState) {
        this.getStorageFolder().clear();
        this.stateStore.clear();
      }
      this.views.initialize();
      ConfigSchema.projectHome = {
        type: 'string',
        "default": path.join(fs.getHomeDirectory(), 'github'),
        description: 'The directory where projects are assumed to be located. Packages created using the Package Generator will be stored here by default.'
      };
      this.config.initialize({
        configDirPath: this.configDirPath,
        resourcePath: resourcePath,
        projectHomeSchema: ConfigSchema.projectHome
      });
      this.menu.initialize({
        resourcePath: resourcePath
      });
      this.contextMenu.initialize({
        resourcePath: resourcePath,
        devMode: devMode
      });
      this.keymaps.configDirPath = this.configDirPath;
      this.keymaps.resourcePath = resourcePath;
      this.keymaps.devMode = devMode;
      if (!this.keymaps.canLoadBundledKeymapsFromMemory()) {
        this.keymaps.loadBundledKeymaps();
      }
      this.commands.attach(this.window);
      this.styles.initialize({
        configDirPath: this.configDirPath
      });
      this.packages.initialize({
        devMode: devMode,
        configDirPath: this.configDirPath,
        resourcePath: resourcePath,
        safeMode: safeMode
      });
      this.themes.initialize({
        configDirPath: this.configDirPath,
        resourcePath: resourcePath,
        safeMode: safeMode,
        devMode: devMode
      });
      this.commandInstaller.initialize(this.getVersion());
      this.autoUpdater.initialize();
      this.config.load();
      this.themes.loadBaseStylesheets();
      this.initialStyleElements = this.styles.getSnapshot();
      if (onlyLoadBaseStyleSheets) {
        this.themes.initialLoadComplete = true;
      }
      this.setBodyPlatformClass();
      this.stylesElement = this.styles.buildStylesElement();
      this.document.head.appendChild(this.stylesElement);
      this.keymaps.subscribeToFileReadFailure();
      this.installUncaughtErrorHandler();
      this.attachSaveStateListeners();
      this.windowEventHandler.initialize(this.window, this.document);
      this.observeAutoHideMenuBar();
      this.history.initialize(this.window.localStorage);
      return this.disposables.add(this.applicationDelegate.onDidChangeHistoryManager((function(_this) {
        return function() {
          return _this.history.loadState();
        };
      })(this)));
    };

    AtomEnvironment.prototype.preloadPackages = function() {
      return this.packages.preloadPackages();
    };

    AtomEnvironment.prototype.attachSaveStateListeners = function() {
      var saveState;
      saveState = _.debounce(((function(_this) {
        return function() {
          return window.requestIdleCallback(function() {
            if (!_this.unloaded) {
              return _this.saveState({
                isUnloading: false
              });
            }
          });
        };
      })(this)), this.saveStateDebounceInterval);
      this.document.addEventListener('mousedown', saveState, true);
      this.document.addEventListener('keydown', saveState, true);
      return this.disposables.add(new Disposable((function(_this) {
        return function() {
          _this.document.removeEventListener('mousedown', saveState, true);
          return _this.document.removeEventListener('keydown', saveState, true);
        };
      })(this)));
    };

    AtomEnvironment.prototype.registerDefaultDeserializers = function() {
      this.deserializers.add(Workspace);
      this.deserializers.add(PaneContainer);
      this.deserializers.add(PaneAxis);
      this.deserializers.add(Pane);
      this.deserializers.add(Dock);
      this.deserializers.add(Project);
      this.deserializers.add(TextEditor);
      return this.deserializers.add(TextBuffer);
    };

    AtomEnvironment.prototype.registerDefaultCommands = function() {
      return registerDefaultCommands({
        commandRegistry: this.commands,
        config: this.config,
        commandInstaller: this.commandInstaller,
        notificationManager: this.notifications,
        project: this.project,
        clipboard: this.clipboard
      });
    };

    AtomEnvironment.prototype.registerDefaultOpeners = function() {
      return this.workspace.addOpener((function(_this) {
        return function(uri) {
          switch (uri) {
            case 'atom://.atom/stylesheet':
              return _this.workspace.openTextFile(_this.styles.getUserStyleSheetPath());
            case 'atom://.atom/keymap':
              return _this.workspace.openTextFile(_this.keymaps.getUserKeymapPath());
            case 'atom://.atom/config':
              return _this.workspace.openTextFile(_this.config.getUserConfigPath());
            case 'atom://.atom/init-script':
              return _this.workspace.openTextFile(_this.getUserInitScriptPath());
          }
        };
      })(this));
    };

    AtomEnvironment.prototype.registerDefaultTargetForKeymaps = function() {
      return this.keymaps.defaultTarget = this.workspace.getElement();
    };

    AtomEnvironment.prototype.observeAutoHideMenuBar = function() {
      this.disposables.add(this.config.onDidChange('core.autoHideMenuBar', (function(_this) {
        return function(arg1) {
          var newValue;
          newValue = arg1.newValue;
          return _this.setAutoHideMenuBar(newValue);
        };
      })(this)));
      if (this.config.get('core.autoHideMenuBar')) {
        return this.setAutoHideMenuBar(true);
      }
    };

    AtomEnvironment.prototype.reset = function() {
      this.deserializers.clear();
      this.registerDefaultDeserializers();
      this.config.clear();
      this.config.setSchema(null, {
        type: 'object',
        properties: _.clone(ConfigSchema)
      });
      this.keymaps.clear();
      this.keymaps.loadBundledKeymaps();
      this.commands.clear();
      this.registerDefaultCommands();
      this.styles.restoreSnapshot(this.initialStyleElements);
      this.menu.clear();
      this.clipboard.reset();
      this.notifications.clear();
      this.contextMenu.clear();
      this.packages.reset();
      this.workspace.reset(this.packages);
      this.registerDefaultOpeners();
      this.project.reset(this.packages);
      this.workspace.subscribeToEvents();
      this.grammars.clear();
      this.textEditors.clear();
      return this.views.clear();
    };

    AtomEnvironment.prototype.destroy = function() {
      var ref2, ref3;
      if (!this.project) {
        return;
      }
      this.disposables.dispose();
      if ((ref2 = this.workspace) != null) {
        ref2.destroy();
      }
      this.workspace = null;
      this.themes.workspace = null;
      if ((ref3 = this.project) != null) {
        ref3.destroy();
      }
      this.project = null;
      this.commands.clear();
      this.stylesElement.remove();
      this.config.unobserveUserConfig();
      this.autoUpdater.destroy();
      return this.uninstallWindowEventHandler();
    };


    /*
    Section: Event Subscription
     */

    AtomEnvironment.prototype.onDidBeep = function(callback) {
      return this.emitter.on('did-beep', callback);
    };

    AtomEnvironment.prototype.onWillThrowError = function(callback) {
      return this.emitter.on('will-throw-error', callback);
    };

    AtomEnvironment.prototype.onDidThrowError = function(callback) {
      return this.emitter.on('did-throw-error', callback);
    };

    AtomEnvironment.prototype.onDidFailAssertion = function(callback) {
      return this.emitter.on('did-fail-assertion', callback);
    };

    AtomEnvironment.prototype.whenShellEnvironmentLoaded = function(callback) {
      if (this.shellEnvironmentLoaded) {
        callback();
        return new Disposable();
      } else {
        return this.emitter.once('loaded-shell-environment', callback);
      }
    };


    /*
    Section: Atom Details
     */

    AtomEnvironment.prototype.inDevMode = function() {
      return this.devMode != null ? this.devMode : this.devMode = this.getLoadSettings().devMode;
    };

    AtomEnvironment.prototype.inSafeMode = function() {
      return this.safeMode != null ? this.safeMode : this.safeMode = this.getLoadSettings().safeMode;
    };

    AtomEnvironment.prototype.inSpecMode = function() {
      return this.specMode != null ? this.specMode : this.specMode = this.getLoadSettings().isSpec;
    };

    AtomEnvironment.prototype.isFirstLoad = function() {
      return this.firstLoad != null ? this.firstLoad : this.firstLoad = this.getLoadSettings().firstLoad;
    };

    AtomEnvironment.prototype.getVersion = function() {
      return this.appVersion != null ? this.appVersion : this.appVersion = this.getLoadSettings().appVersion;
    };

    AtomEnvironment.prototype.getReleaseChannel = function() {
      var version;
      version = this.getVersion();
      if (version.indexOf('beta') > -1) {
        return 'beta';
      } else if (version.indexOf('dev') > -1) {
        return 'dev';
      } else {
        return 'stable';
      }
    };

    AtomEnvironment.prototype.isReleasedVersion = function() {
      return !/\w{7}/.test(this.getVersion());
    };

    AtomEnvironment.prototype.getWindowLoadTime = function() {
      return this.loadTime;
    };

    AtomEnvironment.prototype.getLoadSettings = function() {
      return this.applicationDelegate.getWindowLoadSettings();
    };


    /*
    Section: Managing The Atom Window
     */

    AtomEnvironment.prototype.open = function(params) {
      return this.applicationDelegate.open(params);
    };

    AtomEnvironment.prototype.pickFolder = function(callback) {
      return this.applicationDelegate.pickFolder(callback);
    };

    AtomEnvironment.prototype.close = function() {
      return this.applicationDelegate.closeWindow();
    };

    AtomEnvironment.prototype.getSize = function() {
      return this.applicationDelegate.getWindowSize();
    };

    AtomEnvironment.prototype.setSize = function(width, height) {
      return this.applicationDelegate.setWindowSize(width, height);
    };

    AtomEnvironment.prototype.getPosition = function() {
      return this.applicationDelegate.getWindowPosition();
    };

    AtomEnvironment.prototype.setPosition = function(x, y) {
      return this.applicationDelegate.setWindowPosition(x, y);
    };

    AtomEnvironment.prototype.getCurrentWindow = function() {
      return this.applicationDelegate.getCurrentWindow();
    };

    AtomEnvironment.prototype.center = function() {
      return this.applicationDelegate.centerWindow();
    };

    AtomEnvironment.prototype.focus = function() {
      this.applicationDelegate.focusWindow();
      return this.window.focus();
    };

    AtomEnvironment.prototype.show = function() {
      return this.applicationDelegate.showWindow();
    };

    AtomEnvironment.prototype.hide = function() {
      return this.applicationDelegate.hideWindow();
    };

    AtomEnvironment.prototype.reload = function() {
      return this.applicationDelegate.reloadWindow();
    };

    AtomEnvironment.prototype.restartApplication = function() {
      return this.applicationDelegate.restartApplication();
    };

    AtomEnvironment.prototype.isMaximized = function() {
      return this.applicationDelegate.isWindowMaximized();
    };

    AtomEnvironment.prototype.maximize = function() {
      return this.applicationDelegate.maximizeWindow();
    };

    AtomEnvironment.prototype.isFullScreen = function() {
      return this.applicationDelegate.isWindowFullScreen();
    };

    AtomEnvironment.prototype.setFullScreen = function(fullScreen) {
      if (fullScreen == null) {
        fullScreen = false;
      }
      return this.applicationDelegate.setWindowFullScreen(fullScreen);
    };

    AtomEnvironment.prototype.toggleFullScreen = function() {
      return this.setFullScreen(!this.isFullScreen());
    };

    AtomEnvironment.prototype.displayWindow = function() {
      return this.restoreWindowDimensions().then((function(_this) {
        return function() {
          var ref2, ref3, steps;
          steps = [_this.restoreWindowBackground(), _this.show(), _this.focus()];
          if ((ref2 = _this.windowDimensions) != null ? ref2.fullScreen : void 0) {
            steps.push(_this.setFullScreen(true));
          }
          if (((ref3 = _this.windowDimensions) != null ? ref3.maximized : void 0) && process.platform !== 'darwin') {
            steps.push(_this.maximize());
          }
          return Promise.all(steps);
        };
      })(this));
    };

    AtomEnvironment.prototype.getWindowDimensions = function() {
      var browserWindow, height, maximized, ref2, ref3, width, x, y;
      browserWindow = this.getCurrentWindow();
      ref2 = browserWindow.getPosition(), x = ref2[0], y = ref2[1];
      ref3 = browserWindow.getSize(), width = ref3[0], height = ref3[1];
      maximized = browserWindow.isMaximized();
      return {
        x: x,
        y: y,
        width: width,
        height: height,
        maximized: maximized
      };
    };

    AtomEnvironment.prototype.setWindowDimensions = function(arg1) {
      var height, steps, width, x, y;
      x = arg1.x, y = arg1.y, width = arg1.width, height = arg1.height;
      steps = [];
      if ((width != null) && (height != null)) {
        steps.push(this.setSize(width, height));
      }
      if ((x != null) && (y != null)) {
        steps.push(this.setPosition(x, y));
      } else {
        steps.push(this.center());
      }
      return Promise.all(steps);
    };

    AtomEnvironment.prototype.isValidDimensions = function(arg1) {
      var height, ref2, width, x, y;
      ref2 = arg1 != null ? arg1 : {}, x = ref2.x, y = ref2.y, width = ref2.width, height = ref2.height;
      return width > 0 && height > 0 && x + width > 0 && y + height > 0;
    };

    AtomEnvironment.prototype.storeWindowDimensions = function() {
      this.windowDimensions = this.getWindowDimensions();
      if (this.isValidDimensions(this.windowDimensions)) {
        return localStorage.setItem("defaultWindowDimensions", JSON.stringify(this.windowDimensions));
      }
    };

    AtomEnvironment.prototype.getDefaultWindowDimensions = function() {
      var dimensions, error, height, ref2, width, windowDimensions;
      windowDimensions = this.getLoadSettings().windowDimensions;
      if (windowDimensions != null) {
        return windowDimensions;
      }
      dimensions = null;
      try {
        dimensions = JSON.parse(localStorage.getItem("defaultWindowDimensions"));
      } catch (error1) {
        error = error1;
        console.warn("Error parsing default window dimensions", error);
        localStorage.removeItem("defaultWindowDimensions");
      }
      if (this.isValidDimensions(dimensions)) {
        return dimensions;
      } else {
        ref2 = this.applicationDelegate.getPrimaryDisplayWorkAreaSize(), width = ref2.width, height = ref2.height;
        return {
          x: 0,
          y: 0,
          width: Math.min(1024, width),
          height: height
        };
      }
    };

    AtomEnvironment.prototype.restoreWindowDimensions = function() {
      if (!((this.windowDimensions != null) && this.isValidDimensions(this.windowDimensions))) {
        this.windowDimensions = this.getDefaultWindowDimensions();
      }
      return this.setWindowDimensions(this.windowDimensions).then((function(_this) {
        return function() {
          return _this.windowDimensions;
        };
      })(this));
    };

    AtomEnvironment.prototype.restoreWindowBackground = function() {
      var backgroundColor;
      if (backgroundColor = window.localStorage.getItem('atom:window-background-color')) {
        this.backgroundStylesheet = document.createElement('style');
        this.backgroundStylesheet.type = 'text/css';
        this.backgroundStylesheet.innerText = 'html, body { background: ' + backgroundColor + ' !important; }';
        return document.head.appendChild(this.backgroundStylesheet);
      }
    };

    AtomEnvironment.prototype.storeWindowBackground = function() {
      var backgroundColor;
      if (this.inSpecMode()) {
        return;
      }
      backgroundColor = this.window.getComputedStyle(this.workspace.getElement())['background-color'];
      return this.window.localStorage.setItem('atom:window-background-color', backgroundColor);
    };

    AtomEnvironment.prototype.startEditorWindow = function() {
      var loadHistoryPromise, loadStatePromise, updateProcessEnvPromise;
      this.unloaded = false;
      updateProcessEnvPromise = this.updateProcessEnv(this.getLoadSettings().env);
      updateProcessEnvPromise.then((function(_this) {
        return function() {
          _this.shellEnvironmentLoaded = true;
          _this.emitter.emit('loaded-shell-environment');
          return _this.packages.triggerActivationHook('core:loaded-shell-environment');
        };
      })(this));
      loadStatePromise = this.loadState().then((function(_this) {
        return function(state) {
          _this.windowDimensions = state != null ? state.windowDimensions : void 0;
          return _this.displayWindow().then(function() {
            var ref2, startTime;
            _this.commandInstaller.installAtomCommand(false, function(error) {
              if (error != null) {
                return console.warn(error.message);
              }
            });
            _this.commandInstaller.installApmCommand(false, function(error) {
              if (error != null) {
                return console.warn(error.message);
              }
            });
            _this.disposables.add(_this.applicationDelegate.onDidOpenLocations(_this.openLocations.bind(_this)));
            _this.disposables.add(_this.applicationDelegate.onApplicationMenuCommand(_this.dispatchApplicationMenuCommand.bind(_this)));
            _this.disposables.add(_this.applicationDelegate.onContextMenuCommand(_this.dispatchContextMenuCommand.bind(_this)));
            _this.disposables.add(_this.applicationDelegate.onSaveWindowStateRequest(function() {
              var callback;
              callback = function() {
                return _this.applicationDelegate.didSaveWindowState();
              };
              return _this.saveState({
                isUnloading: true
              })["catch"](callback).then(callback);
            }));
            _this.listenForUpdates();
            _this.registerDefaultTargetForKeymaps();
            _this.packages.loadPackages();
            startTime = Date.now();
            if (state != null) {
              _this.deserialize(state);
            }
            _this.deserializeTimings.atom = Date.now() - startTime;
            if (process.platform === 'darwin' && _this.config.get('core.titleBar') === 'custom') {
              _this.workspace.addHeaderPanel({
                item: new TitleBar({
                  workspace: _this.workspace,
                  themes: _this.themes,
                  applicationDelegate: _this.applicationDelegate
                })
              });
              _this.document.body.classList.add('custom-title-bar');
            }
            if (process.platform === 'darwin' && _this.config.get('core.titleBar') === 'custom-inset') {
              _this.workspace.addHeaderPanel({
                item: new TitleBar({
                  workspace: _this.workspace,
                  themes: _this.themes,
                  applicationDelegate: _this.applicationDelegate
                })
              });
              _this.document.body.classList.add('custom-inset-title-bar');
            }
            if (process.platform === 'darwin' && _this.config.get('core.titleBar') === 'hidden') {
              _this.document.body.classList.add('hidden-title-bar');
            }
            _this.document.body.appendChild(_this.workspace.getElement());
            if ((ref2 = _this.backgroundStylesheet) != null) {
              ref2.remove();
            }
            _this.watchProjectPaths();
            _this.packages.activate();
            _this.keymaps.loadUserKeymap();
            if (!_this.getLoadSettings().safeMode) {
              _this.requireUserInitScript();
            }
            _this.menu.update();
            return _this.openInitialEmptyEditorIfNecessary();
          });
        };
      })(this));
      loadHistoryPromise = this.history.loadState().then((function(_this) {
        return function() {
          _this.reopenProjectMenuManager = new ReopenProjectMenuManager({
            menu: _this.menu,
            commands: _this.commands,
            history: _this.history,
            config: _this.config,
            open: function(paths) {
              return _this.open({
                pathsToOpen: paths
              });
            }
          });
          return _this.reopenProjectMenuManager.update();
        };
      })(this));
      return Promise.all([loadStatePromise, loadHistoryPromise, updateProcessEnvPromise]);
    };

    AtomEnvironment.prototype.serialize = function(options) {
      return {
        version: this.constructor.version,
        project: this.project.serialize(options),
        workspace: this.workspace.serialize(),
        packageStates: this.packages.serialize(),
        grammars: {
          grammarOverridesByPath: this.grammars.grammarOverridesByPath
        },
        fullScreen: this.isFullScreen(),
        windowDimensions: this.windowDimensions,
        textEditors: this.textEditors.serialize()
      };
    };

    AtomEnvironment.prototype.unloadEditorWindow = function() {
      if (!this.project) {
        return;
      }
      this.storeWindowBackground();
      this.packages.deactivatePackages();
      this.saveBlobStoreSync();
      return this.unloaded = true;
    };

    AtomEnvironment.prototype.saveBlobStoreSync = function() {
      if (this.enablePersistence) {
        return this.blobStore.save();
      }
    };

    AtomEnvironment.prototype.openInitialEmptyEditorIfNecessary = function() {
      var ref2;
      if (!this.config.get('core.openEmptyEditorOnStart')) {
        return;
      }
      if (((ref2 = this.getLoadSettings().initialPaths) != null ? ref2.length : void 0) === 0 && this.workspace.getPaneItems().length === 0) {
        return this.workspace.open(null);
      }
    };

    AtomEnvironment.prototype.installUncaughtErrorHandler = function() {
      this.previousWindowErrorHandler = this.window.onerror;
      return this.window.onerror = (function(_this) {
        return function() {
          var column, eventObject, line, message, openDevTools, originalError, ref2, ref3, source, url;
          _this.lastUncaughtError = Array.prototype.slice.call(arguments);
          ref2 = _this.lastUncaughtError, message = ref2[0], url = ref2[1], line = ref2[2], column = ref2[3], originalError = ref2[4];
          ref3 = mapSourcePosition({
            source: url,
            line: line,
            column: column
          }), line = ref3.line, column = ref3.column, source = ref3.source;
          if (url === '<embedded>') {
            url = source;
          }
          eventObject = {
            message: message,
            url: url,
            line: line,
            column: column,
            originalError: originalError
          };
          openDevTools = true;
          eventObject.preventDefault = function() {
            return openDevTools = false;
          };
          _this.emitter.emit('will-throw-error', eventObject);
          if (openDevTools) {
            _this.openDevTools().then(function() {
              return _this.executeJavaScriptInDevTools('DevToolsAPI.showPanel("console")');
            });
          }
          return _this.emitter.emit('did-throw-error', {
            message: message,
            url: url,
            line: line,
            column: column,
            originalError: originalError
          });
        };
      })(this);
    };

    AtomEnvironment.prototype.uninstallUncaughtErrorHandler = function() {
      return this.window.onerror = this.previousWindowErrorHandler;
    };

    AtomEnvironment.prototype.installWindowEventHandler = function() {
      this.windowEventHandler = new WindowEventHandler({
        atomEnvironment: this,
        applicationDelegate: this.applicationDelegate
      });
      return this.windowEventHandler.initialize(this.window, this.document);
    };

    AtomEnvironment.prototype.uninstallWindowEventHandler = function() {
      var ref2;
      if ((ref2 = this.windowEventHandler) != null) {
        ref2.unsubscribe();
      }
      return this.windowEventHandler = null;
    };


    /*
    Section: Messaging the User
     */

    AtomEnvironment.prototype.beep = function() {
      if (this.config.get('core.audioBeep')) {
        this.applicationDelegate.playBeepSound();
      }
      return this.emitter.emit('did-beep');
    };

    AtomEnvironment.prototype.confirm = function(params) {
      if (params == null) {
        params = {};
      }
      return this.applicationDelegate.confirm(params);
    };


    /*
    Section: Managing the Dev Tools
     */

    AtomEnvironment.prototype.openDevTools = function() {
      return this.applicationDelegate.openWindowDevTools();
    };

    AtomEnvironment.prototype.toggleDevTools = function() {
      return this.applicationDelegate.toggleWindowDevTools();
    };

    AtomEnvironment.prototype.executeJavaScriptInDevTools = function(code) {
      return this.applicationDelegate.executeJavaScriptInWindowDevTools(code);
    };


    /*
    Section: Private
     */

    AtomEnvironment.prototype.assert = function(condition, message, callbackOrMetadata) {
      var error;
      if (condition) {
        return true;
      }
      error = new Error("Assertion failed: " + message);
      Error.captureStackTrace(error, this.assert);
      if (callbackOrMetadata != null) {
        if (typeof callbackOrMetadata === 'function') {
          if (typeof callbackOrMetadata === "function") {
            callbackOrMetadata(error);
          }
        } else {
          error.metadata = callbackOrMetadata;
        }
      }
      this.emitter.emit('did-fail-assertion', error);
      if (!this.isReleasedVersion()) {
        throw error;
      }
      return false;
    };

    AtomEnvironment.prototype.loadThemes = function() {
      return this.themes.load();
    };

    AtomEnvironment.prototype.watchProjectPaths = function() {
      return this.disposables.add(this.project.onDidChangePaths((function(_this) {
        return function() {
          return _this.applicationDelegate.setRepresentedDirectoryPaths(_this.project.getPaths());
        };
      })(this)));
    };

    AtomEnvironment.prototype.setDocumentEdited = function(edited) {
      var base;
      return typeof (base = this.applicationDelegate).setWindowDocumentEdited === "function" ? base.setWindowDocumentEdited(edited) : void 0;
    };

    AtomEnvironment.prototype.setRepresentedFilename = function(filename) {
      var base;
      return typeof (base = this.applicationDelegate).setWindowRepresentedFilename === "function" ? base.setWindowRepresentedFilename(filename) : void 0;
    };

    AtomEnvironment.prototype.addProjectFolder = function() {
      return this.pickFolder((function(_this) {
        return function(selectedPaths) {
          if (selectedPaths == null) {
            selectedPaths = [];
          }
          return _this.addToProject(selectedPaths);
        };
      })(this));
    };

    AtomEnvironment.prototype.addToProject = function(projectPaths) {
      return this.loadState(this.getStateKey(projectPaths)).then((function(_this) {
        return function(state) {
          var folder, i, len, results;
          if (state && _this.project.getPaths().length === 0) {
            return _this.attemptRestoreProjectStateForPaths(state, projectPaths);
          } else {
            results = [];
            for (i = 0, len = projectPaths.length; i < len; i++) {
              folder = projectPaths[i];
              results.push(_this.project.addPath(folder));
            }
            return results;
          }
        };
      })(this));
    };

    AtomEnvironment.prototype.attemptRestoreProjectStateForPaths = function(state, projectPaths, filesToOpen) {
      var btn, center, file, i, len, nouns, selectedPath, windowIsUnused;
      if (filesToOpen == null) {
        filesToOpen = [];
      }
      center = this.workspace.getCenter();
      windowIsUnused = (function(_this) {
        return function() {
          var container, i, item, j, len, len1, ref2, ref3;
          ref2 = _this.workspace.getPaneContainers();
          for (i = 0, len = ref2.length; i < len; i++) {
            container = ref2[i];
            ref3 = container.getPaneItems();
            for (j = 0, len1 = ref3.length; j < len1; j++) {
              item = ref3[j];
              if (item instanceof TextEditor) {
                if (item.getPath() || item.isModified()) {
                  return false;
                }
              } else {
                if (container === center) {
                  return false;
                }
              }
            }
          }
          return true;
        };
      })(this);
      if (windowIsUnused()) {
        this.restoreStateIntoThisEnvironment(state);
        return Promise.all((function() {
          var i, len, results;
          results = [];
          for (i = 0, len = filesToOpen.length; i < len; i++) {
            file = filesToOpen[i];
            results.push(this.workspace.open(file));
          }
          return results;
        }).call(this));
      } else {
        nouns = projectPaths.length === 1 ? 'folder' : 'folders';
        btn = this.confirm({
          message: 'Previous automatically-saved project state detected',
          detailedMessage: ("There is previously saved state for the selected " + nouns + ". ") + ("Would you like to add the " + nouns + " to this window, permanently discarding the saved state, ") + ("or open the " + nouns + " in a new window, restoring the saved state?"),
          buttons: ['Open in new window and recover state', 'Add to this window and discard state']
        });
        if (btn === 0) {
          this.open({
            pathsToOpen: projectPaths.concat(filesToOpen),
            newWindow: true,
            devMode: this.inDevMode(),
            safeMode: this.inSafeMode()
          });
          return Promise.resolve(null);
        } else if (btn === 1) {
          for (i = 0, len = projectPaths.length; i < len; i++) {
            selectedPath = projectPaths[i];
            this.project.addPath(selectedPath);
          }
          return Promise.all((function() {
            var j, len1, results;
            results = [];
            for (j = 0, len1 = filesToOpen.length; j < len1; j++) {
              file = filesToOpen[j];
              results.push(this.workspace.open(file));
            }
            return results;
          }).call(this));
        }
      }
    };

    AtomEnvironment.prototype.restoreStateIntoThisEnvironment = function(state) {
      var i, len, pane, ref2;
      state.fullScreen = this.isFullScreen();
      ref2 = this.workspace.getPanes();
      for (i = 0, len = ref2.length; i < len; i++) {
        pane = ref2[i];
        pane.destroy();
      }
      return this.deserialize(state);
    };

    AtomEnvironment.prototype.showSaveDialog = function(callback) {
      return callback(this.showSaveDialogSync());
    };

    AtomEnvironment.prototype.showSaveDialogSync = function(options) {
      if (options == null) {
        options = {};
      }
      return this.applicationDelegate.showSaveDialog(options);
    };

    AtomEnvironment.prototype.saveState = function(options, storageKey) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var ref2, savePromise, state;
          if (_this.enablePersistence && _this.project) {
            state = _this.serialize(options);
            savePromise = (storageKey != null ? storageKey : storageKey = _this.getStateKey((ref2 = _this.project) != null ? ref2.getPaths() : void 0)) ? _this.stateStore.save(storageKey, state) : _this.applicationDelegate.setTemporaryWindowState(state);
            return savePromise["catch"](reject).then(resolve);
          } else {
            return resolve();
          }
        };
      })(this));
    };

    AtomEnvironment.prototype.loadState = function(stateKey) {
      if (this.enablePersistence) {
        if (stateKey != null ? stateKey : stateKey = this.getStateKey(this.getLoadSettings().initialPaths)) {
          return this.stateStore.load(stateKey).then((function(_this) {
            return function(state) {
              if (state) {
                return state;
              } else {
                return _this.getStorageFolder().load(stateKey);
              }
            };
          })(this));
        } else {
          return this.applicationDelegate.getTemporaryWindowState();
        }
      } else {
        return Promise.resolve(null);
      }
    };

    AtomEnvironment.prototype.deserialize = function(state) {
      var grammarOverridesByPath, ref2, ref3, startTime;
      if (grammarOverridesByPath = (ref2 = state.grammars) != null ? ref2.grammarOverridesByPath : void 0) {
        this.grammars.grammarOverridesByPath = grammarOverridesByPath;
      }
      this.setFullScreen(state.fullScreen);
      this.packages.packageStates = (ref3 = state.packageStates) != null ? ref3 : {};
      startTime = Date.now();
      if (state.project != null) {
        this.project.deserialize(state.project, this.deserializers);
      }
      this.deserializeTimings.project = Date.now() - startTime;
      if (state.textEditors) {
        this.textEditors.deserialize(state.textEditors);
      }
      startTime = Date.now();
      if (state.workspace != null) {
        this.workspace.deserialize(state.workspace, this.deserializers);
      }
      return this.deserializeTimings.workspace = Date.now() - startTime;
    };

    AtomEnvironment.prototype.getStateKey = function(paths) {
      var sha1;
      if ((paths != null ? paths.length : void 0) > 0) {
        sha1 = crypto.createHash('sha1').update(paths.slice().sort().join("\n")).digest('hex');
        return "editor-" + sha1;
      } else {
        return null;
      }
    };

    AtomEnvironment.prototype.getStorageFolder = function() {
      return this.storageFolder != null ? this.storageFolder : this.storageFolder = new StorageFolder(this.getConfigDirPath());
    };

    AtomEnvironment.prototype.getConfigDirPath = function() {
      return this.configDirPath != null ? this.configDirPath : this.configDirPath = process.env.ATOM_HOME;
    };

    AtomEnvironment.prototype.getUserInitScriptPath = function() {
      var initScriptPath;
      initScriptPath = fs.resolve(this.getConfigDirPath(), 'init', ['js', 'coffee']);
      return initScriptPath != null ? initScriptPath : path.join(this.getConfigDirPath(), 'init.coffee');
    };

    AtomEnvironment.prototype.requireUserInitScript = function() {
      var error, userInitScriptPath;
      if (userInitScriptPath = this.getUserInitScriptPath()) {
        try {
          if (fs.isFileSync(userInitScriptPath)) {
            return require(userInitScriptPath);
          }
        } catch (error1) {
          error = error1;
          return this.notifications.addError("Failed to load `" + userInitScriptPath + "`", {
            detail: error.message,
            dismissable: true
          });
        }
      }
    };

    AtomEnvironment.prototype.onUpdateAvailable = function(callback) {
      return this.emitter.on('update-available', callback);
    };

    AtomEnvironment.prototype.updateAvailable = function(details) {
      return this.emitter.emit('update-available', details);
    };

    AtomEnvironment.prototype.listenForUpdates = function() {
      return this.disposables.add(this.autoUpdater.onDidCompleteDownloadingUpdate(this.updateAvailable.bind(this)));
    };

    AtomEnvironment.prototype.setBodyPlatformClass = function() {
      return this.document.body.classList.add("platform-" + process.platform);
    };

    AtomEnvironment.prototype.setAutoHideMenuBar = function(autoHide) {
      this.applicationDelegate.setAutoHideWindowMenuBar(autoHide);
      return this.applicationDelegate.setWindowMenuBarVisibility(!autoHide);
    };

    AtomEnvironment.prototype.dispatchApplicationMenuCommand = function(command, arg) {
      var activeElement;
      activeElement = this.document.activeElement;
      if (activeElement === this.document.body) {
        activeElement = this.workspace.getElement();
      }
      return this.commands.dispatch(activeElement, command, arg);
    };

    AtomEnvironment.prototype.dispatchContextMenuCommand = function() {
      var args, command;
      command = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      return this.commands.dispatch(this.contextMenu.activeElement, command, args);
    };

    AtomEnvironment.prototype.openLocations = function(locations) {
      var fileLocationsToOpen, foldersToAddToProject, forceAddToWindow, i, initialColumn, initialLine, j, len, len1, needsProjectPaths, pathToOpen, promise, promises, pushFolderToOpen, ref2, ref3, ref4, ref5;
      needsProjectPaths = ((ref2 = this.project) != null ? ref2.getPaths().length : void 0) === 0;
      foldersToAddToProject = [];
      fileLocationsToOpen = [];
      pushFolderToOpen = function(folder) {
        if (indexOf.call(foldersToAddToProject, folder) < 0) {
          return foldersToAddToProject.push(folder);
        }
      };
      for (i = 0, len = locations.length; i < len; i++) {
        ref3 = locations[i], pathToOpen = ref3.pathToOpen, initialLine = ref3.initialLine, initialColumn = ref3.initialColumn, forceAddToWindow = ref3.forceAddToWindow;
        if ((pathToOpen != null) && (needsProjectPaths || forceAddToWindow)) {
          if (fs.existsSync(pathToOpen)) {
            pushFolderToOpen(this.project.getDirectoryForProjectPath(pathToOpen).getPath());
          } else if (fs.existsSync(path.dirname(pathToOpen))) {
            pushFolderToOpen(this.project.getDirectoryForProjectPath(path.dirname(pathToOpen)).getPath());
          } else {
            pushFolderToOpen(this.project.getDirectoryForProjectPath(pathToOpen).getPath());
          }
        }
        if (!fs.isDirectorySync(pathToOpen)) {
          fileLocationsToOpen.push({
            pathToOpen: pathToOpen,
            initialLine: initialLine,
            initialColumn: initialColumn
          });
        }
      }
      promise = Promise.resolve(null);
      if (foldersToAddToProject.length > 0) {
        promise = this.loadState(this.getStateKey(foldersToAddToProject)).then((function(_this) {
          return function(state) {
            var files, folder, j, k, len1, len2, location, promises, ref4, ref5;
            if (state && needsProjectPaths) {
              files = (function() {
                var j, len1, results;
                results = [];
                for (j = 0, len1 = fileLocationsToOpen.length; j < len1; j++) {
                  location = fileLocationsToOpen[j];
                  results.push(location.pathToOpen);
                }
                return results;
              })();
              return _this.attemptRestoreProjectStateForPaths(state, foldersToAddToProject, files);
            } else {
              promises = [];
              for (j = 0, len1 = foldersToAddToProject.length; j < len1; j++) {
                folder = foldersToAddToProject[j];
                _this.project.addPath(folder);
              }
              for (k = 0, len2 = fileLocationsToOpen.length; k < len2; k++) {
                ref4 = fileLocationsToOpen[k], pathToOpen = ref4.pathToOpen, initialLine = ref4.initialLine, initialColumn = ref4.initialColumn;
                promises.push((ref5 = _this.workspace) != null ? ref5.open(pathToOpen, {
                  initialLine: initialLine,
                  initialColumn: initialColumn
                }) : void 0);
              }
              return Promise.all(promises);
            }
          };
        })(this));
      } else {
        promises = [];
        for (j = 0, len1 = fileLocationsToOpen.length; j < len1; j++) {
          ref4 = fileLocationsToOpen[j], pathToOpen = ref4.pathToOpen, initialLine = ref4.initialLine, initialColumn = ref4.initialColumn;
          promises.push((ref5 = this.workspace) != null ? ref5.open(pathToOpen, {
            initialLine: initialLine,
            initialColumn: initialColumn
          }) : void 0);
        }
        promise = Promise.all(promises);
      }
      return promise.then(function() {
        return ipcRenderer.send('window-command', 'window:locations-opened');
      });
    };

    AtomEnvironment.prototype.resolveProxy = function(url) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var disposable, requestId;
          requestId = _this.nextProxyRequestId++;
          disposable = _this.applicationDelegate.onDidResolveProxy(function(id, proxy) {
            if (id === requestId) {
              disposable.dispose();
              return resolve(proxy);
            }
          });
          return _this.applicationDelegate.resolveProxy(requestId, url);
        };
      })(this));
    };

    return AtomEnvironment;

  })(Model);

  Promise.prototype.done = function(callback) {
    deprecate("Atom now uses ES6 Promises instead of Q. Call promise.then instead of promise.done");
    return this.then(callback);
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2F0b20tZW52aXJvbm1lbnQuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSw4cUJBQUE7SUFBQTs7Ozs7RUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0VBQ1QsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNOLGNBQWUsT0FBQSxDQUFRLFVBQVI7O0VBRWhCLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBQ0gsWUFBYSxPQUFBLENBQVEsTUFBUjs7RUFDZCxNQUE2QyxPQUFBLENBQVEsV0FBUixDQUE3QyxFQUFDLDZDQUFELEVBQXNCLDJCQUF0QixFQUFrQzs7RUFDbEMsRUFBQSxHQUFLLE9BQUEsQ0FBUSxTQUFSOztFQUNKLG9CQUFxQixPQUFBLENBQVEsMEJBQVI7O0VBQ3RCLEtBQUEsR0FBUSxPQUFBLENBQVEsU0FBUjs7RUFDUixrQkFBQSxHQUFxQixPQUFBLENBQVEsd0JBQVI7O0VBQ3JCLFVBQUEsR0FBYSxPQUFBLENBQVEsZUFBUjs7RUFDYixhQUFBLEdBQWdCLE9BQUEsQ0FBUSxrQkFBUjs7RUFDaEIsdUJBQUEsR0FBMEIsT0FBQSxDQUFRLDZCQUFSOztFQUN6QixtQkFBb0IsT0FBQSxDQUFRLHNCQUFSOztFQUNyQixZQUFBLEdBQWUsT0FBQSxDQUFRLGlCQUFSOztFQUVmLG1CQUFBLEdBQXNCLE9BQUEsQ0FBUSx3QkFBUjs7RUFDdEIsWUFBQSxHQUFlLE9BQUEsQ0FBUSxpQkFBUjs7RUFDZixtQkFBQSxHQUFzQixPQUFBLENBQVEsd0JBQVI7O0VBQ3RCLE1BQUEsR0FBUyxPQUFBLENBQVEsVUFBUjs7RUFDVCxhQUFBLEdBQWdCLE9BQUEsQ0FBUSxxQkFBUjs7RUFDaEIsY0FBQSxHQUFpQixPQUFBLENBQVEsbUJBQVI7O0VBQ2pCLGVBQUEsR0FBa0IsT0FBQSxDQUFRLG9CQUFS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QWI7SUF4Q2E7OzhCQTJDZixZQUFBLEdBQWMsU0FBQyxHQUFEO0FBQ1osYUFBVyxJQUFBLE9BQUEsQ0FBUSxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsT0FBRCxFQUFVLE1BQVY7QUFDakIsY0FBQTtVQUFBLFNBQUEsR0FBWSxLQUFDLENBQUEsa0JBQUQ7VUFDWixVQUFBLEdBQWEsS0FBQyxDQUFBLG1CQUFtQixDQUFDLGlCQUFyQixDQUF1QyxTQUFDLEVBQUQsRUFBSyxLQUFMO1lBQ2xELElBQUcsRUFBQSxLQUFNLFNBQVQ7Y0FDRSxVQUFVLENBQUMsT0FBWCxDQUFBO3FCQUNBLE9BQUEsQ0FBUSxLQUFSLEVBRkY7O1VBRGtELENBQXZDO2lCQUtiLEtBQUMsQ0FBQSxtQkFBbUIsQ0FBQyxZQUFyQixDQUFrQyxTQUFsQyxFQUE2QyxHQUE3QztRQVBpQjtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBUjtJQURDOzs7O0tBOWdDYzs7RUF5aEM5QixPQUFPLENBQUMsU0FBUyxDQUFDLElBQWxCLEdBQXlCLFNBQUMsUUFBRDtJQUN2QixTQUFBLENBQVUsb0ZBQVY7V0FDQSxJQUFDLENBQUEsSUFBRCxDQUFNLFFBQU47RUFGdUI7QUE5a0N6QiIsInNvdXJjZXNDb250ZW50IjpbImNyeXB0byA9IHJlcXVpcmUgJ2NyeXB0bydcbnBhdGggPSByZXF1aXJlICdwYXRoJ1xue2lwY1JlbmRlcmVyfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZS1wbHVzJ1xue2RlcHJlY2F0ZX0gPSByZXF1aXJlICdncmltJ1xue0NvbXBvc2l0ZURpc3Bvc2FibGUsIERpc3Bvc2FibGUsIEVtaXR0ZXJ9ID0gcmVxdWlyZSAnZXZlbnQta2l0J1xuZnMgPSByZXF1aXJlICdmcy1wbHVzJ1xue21hcFNvdXJjZVBvc2l0aW9ufSA9IHJlcXVpcmUgJ0BhdG9tL3NvdXJjZS1tYXAtc3VwcG9ydCdcbk1vZGVsID0gcmVxdWlyZSAnLi9tb2RlbCdcbldpbmRvd0V2ZW50SGFuZGxlciA9IHJlcXVpcmUgJy4vd2luZG93LWV2ZW50LWhhbmRsZXInXG5TdGF0ZVN0b3JlID0gcmVxdWlyZSAnLi9zdGF0ZS1zdG9yZSdcblN0b3JhZ2VGb2xkZXIgPSByZXF1aXJlICcuL3N0b3JhZ2UtZm9sZGVyJ1xucmVnaXN0ZXJEZWZhdWx0Q29tbWFuZHMgPSByZXF1aXJlICcuL3JlZ2lzdGVyLWRlZmF1bHQtY29tbWFuZHMnXG57dXBkYXRlUHJvY2Vzc0Vudn0gPSByZXF1aXJlICcuL3VwZGF0ZS1wcm9jZXNzLWVudidcbkNvbmZpZ1NjaGVtYSA9IHJlcXVpcmUgJy4vY29uZmlnLXNjaGVtYSdcblxuRGVzZXJpYWxpemVyTWFuYWdlciA9IHJlcXVpcmUgJy4vZGVzZXJpYWxpemVyLW1hbmFnZXInXG5WaWV3UmVnaXN0cnkgPSByZXF1aXJlICcuL3ZpZXctcmVnaXN0cnknXG5Ob3RpZmljYXRpb25NYW5hZ2VyID0gcmVxdWlyZSAnLi9ub3RpZmljYXRpb24tbWFuYWdlcidcbkNvbmZpZyA9IHJlcXVpcmUgJy4vY29uZmlnJ1xuS2V5bWFwTWFuYWdlciA9IHJlcXVpcmUgJy4va2V5bWFwLWV4dGVuc2lvbnMnXG5Ub29sdGlwTWFuYWdlciA9IHJlcXVpcmUgJy4vdG9vbHRpcC1tYW5hZ2VyJ1xuQ29tbWFuZFJlZ2lzdHJ5ID0gcmVxdWlyZSAnLi9jb21tYW5kLXJlZ2lzdHJ5J1xuR3JhbW1hclJlZ2lzdHJ5ID0gcmVxdWlyZSAnLi9ncmFtbWFyLXJlZ2lzdHJ5J1xue0hpc3RvcnlNYW5hZ2VyLCBIaXN0b3J5UHJvamVjdH0gPSByZXF1aXJlICcuL2hpc3RvcnktbWFuYWdlcidcblJlb3BlblByb2plY3RNZW51TWFuYWdlciA9IHJlcXVpcmUgJy4vcmVvcGVuLXByb2plY3QtbWVudS1tYW5hZ2VyJ1xuU3R5bGVNYW5hZ2VyID0gcmVxdWlyZSAnLi9zdHlsZS1tYW5hZ2VyJ1xuUGFja2FnZU1hbmFnZXIgPSByZXF1aXJlICcuL3BhY2thZ2UtbWFuYWdlcidcblRoZW1lTWFuYWdlciA9IHJlcXVpcmUgJy4vdGhlbWUtbWFuYWdlcidcbk1lbnVNYW5hZ2VyID0gcmVxdWlyZSAnLi9tZW51LW1hbmFnZXInXG5Db250ZXh0TWVudU1hbmFnZXIgPSByZXF1aXJlICcuL2NvbnRleHQtbWVudS1tYW5hZ2VyJ1xuQ29tbWFuZEluc3RhbGxlciA9IHJlcXVpcmUgJy4vY29tbWFuZC1pbnN0YWxsZXInXG5Qcm9qZWN0ID0gcmVxdWlyZSAnLi9wcm9qZWN0J1xuVGl0bGVCYXIgPSByZXF1aXJlICcuL3RpdGxlLWJhcidcbldvcmtzcGFjZSA9IHJlcXVpcmUgJy4vd29ya3NwYWNlJ1xuUGFuZWxDb250YWluZXIgPSByZXF1aXJlICcuL3BhbmVsLWNvbnRhaW5lcidcblBhbmVsID0gcmVxdWlyZSAnLi9wYW5lbCdcblBhbmVDb250YWluZXIgPSByZXF1aXJlICcuL3BhbmUtY29udGFpbmVyJ1xuUGFuZUF4aXMgPSByZXF1aXJlICcuL3BhbmUtYXhpcydcblBhbmUgPSByZXF1aXJlICcuL3BhbmUnXG5Eb2NrID0gcmVxdWlyZSAnLi9kb2NrJ1xuUHJvamVjdCA9IHJlcXVpcmUgJy4vcHJvamVjdCdcblRleHRFZGl0b3IgPSByZXF1aXJlICcuL3RleHQtZWRpdG9yJ1xuVGV4dEJ1ZmZlciA9IHJlcXVpcmUgJ3RleHQtYnVmZmVyJ1xuR3V0dGVyID0gcmVxdWlyZSAnLi9ndXR0ZXInXG5UZXh0RWRpdG9yUmVnaXN0cnkgPSByZXF1aXJlICcuL3RleHQtZWRpdG9yLXJlZ2lzdHJ5J1xuQXV0b1VwZGF0ZU1hbmFnZXIgPSByZXF1aXJlICcuL2F1dG8tdXBkYXRlLW1hbmFnZXInXG5cbiMgRXNzZW50aWFsOiBBdG9tIGdsb2JhbCBmb3IgZGVhbGluZyB3aXRoIHBhY2thZ2VzLCB0aGVtZXMsIG1lbnVzLCBhbmQgdGhlIHdpbmRvdy5cbiNcbiMgQW4gaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcyBpcyBhbHdheXMgYXZhaWxhYmxlIGFzIHRoZSBgYXRvbWAgZ2xvYmFsLlxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgQXRvbUVudmlyb25tZW50IGV4dGVuZHMgTW9kZWxcbiAgQHZlcnNpb246IDEgICMgSW5jcmVtZW50IHRoaXMgd2hlbiB0aGUgc2VyaWFsaXphdGlvbiBmb3JtYXQgY2hhbmdlc1xuXG4gIGxhc3RVbmNhdWdodEVycm9yOiBudWxsXG5cbiAgIyMjXG4gIFNlY3Rpb246IFByb3BlcnRpZXNcbiAgIyMjXG5cbiAgIyBQdWJsaWM6IEEge0NvbW1hbmRSZWdpc3RyeX0gaW5zdGFuY2VcbiAgY29tbWFuZHM6IG51bGxcblxuICAjIFB1YmxpYzogQSB7Q29uZmlnfSBpbnN0YW5jZVxuICBjb25maWc6IG51bGxcblxuICAjIFB1YmxpYzogQSB7Q2xpcGJvYXJkfSBpbnN0YW5jZVxuICBjbGlwYm9hcmQ6IG51bGxcblxuICAjIFB1YmxpYzogQSB7Q29udGV4dE1lbnVNYW5hZ2VyfSBpbnN0YW5jZVxuICBjb250ZXh0TWVudTogbnVsbFxuXG4gICMgUHVibGljOiBBIHtNZW51TWFuYWdlcn0gaW5zdGFuY2VcbiAgbWVudTogbnVsbFxuXG4gICMgUHVibGljOiBBIHtLZXltYXBNYW5hZ2VyfSBpbnN0YW5jZVxuICBrZXltYXBzOiBudWxsXG5cbiAgIyBQdWJsaWM6IEEge1Rvb2x0aXBNYW5hZ2VyfSBpbnN0YW5jZVxuICB0b29sdGlwczogbnVsbFxuXG4gICMgUHVibGljOiBBIHtOb3RpZmljYXRpb25NYW5hZ2VyfSBpbnN0YW5jZVxuICBub3RpZmljYXRpb25zOiBudWxsXG5cbiAgIyBQdWJsaWM6IEEge1Byb2plY3R9IGluc3RhbmNlXG4gIHByb2plY3Q6IG51bGxcblxuICAjIFB1YmxpYzogQSB7R3JhbW1hclJlZ2lzdHJ5fSBpbnN0YW5jZVxuICBncmFtbWFyczogbnVsbFxuXG4gICMgUHVibGljOiBBIHtIaXN0b3J5TWFuYWdlcn0gaW5zdGFuY2VcbiAgaGlzdG9yeTogbnVsbFxuXG4gICMgUHVibGljOiBBIHtQYWNrYWdlTWFuYWdlcn0gaW5zdGFuY2VcbiAgcGFja2FnZXM6IG51bGxcblxuICAjIFB1YmxpYzogQSB7VGhlbWVNYW5hZ2VyfSBpbnN0YW5jZVxuICB0aGVtZXM6IG51bGxcblxuICAjIFB1YmxpYzogQSB7U3R5bGVNYW5hZ2VyfSBpbnN0YW5jZVxuICBzdHlsZXM6IG51bGxcblxuICAjIFB1YmxpYzogQSB7RGVzZXJpYWxpemVyTWFuYWdlcn0gaW5zdGFuY2VcbiAgZGVzZXJpYWxpemVyczogbnVsbFxuXG4gICMgUHVibGljOiBBIHtWaWV3UmVnaXN0cnl9IGluc3RhbmNlXG4gIHZpZXdzOiBudWxsXG5cbiAgIyBQdWJsaWM6IEEge1dvcmtzcGFjZX0gaW5zdGFuY2VcbiAgd29ya3NwYWNlOiBudWxsXG5cbiAgIyBQdWJsaWM6IEEge1RleHRFZGl0b3JSZWdpc3RyeX0gaW5zdGFuY2VcbiAgdGV4dEVkaXRvcnM6IG51bGxcblxuICAjIFByaXZhdGU6IEFuIHtBdXRvVXBkYXRlTWFuYWdlcn0gaW5zdGFuY2VcbiAgYXV0b1VwZGF0ZXI6IG51bGxcblxuICBzYXZlU3RhdGVEZWJvdW5jZUludGVydmFsOiAxMDAwXG5cbiAgIyMjXG4gIFNlY3Rpb246IENvbnN0cnVjdGlvbiBhbmQgRGVzdHJ1Y3Rpb25cbiAgIyMjXG5cbiAgIyBDYWxsIC5sb2FkT3JDcmVhdGUgaW5zdGVhZFxuICBjb25zdHJ1Y3RvcjogKHBhcmFtcz17fSkgLT5cbiAgICB7QGFwcGxpY2F0aW9uRGVsZWdhdGUsIEBjbGlwYm9hcmQsIEBlbmFibGVQZXJzaXN0ZW5jZSwgb25seUxvYWRCYXNlU3R5bGVTaGVldHMsIEB1cGRhdGVQcm9jZXNzRW52fSA9IHBhcmFtc1xuXG4gICAgQG5leHRQcm94eVJlcXVlc3RJZCA9IDBcbiAgICBAdW5sb2FkZWQgPSBmYWxzZVxuICAgIEBsb2FkVGltZSA9IG51bGxcbiAgICBAZW1pdHRlciA9IG5ldyBFbWl0dGVyXG4gICAgQGRpc3Bvc2FibGVzID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgICBAZGVzZXJpYWxpemVycyA9IG5ldyBEZXNlcmlhbGl6ZXJNYW5hZ2VyKHRoaXMpXG4gICAgQGRlc2VyaWFsaXplVGltaW5ncyA9IHt9XG4gICAgQHZpZXdzID0gbmV3IFZpZXdSZWdpc3RyeSh0aGlzKVxuICAgIEBub3RpZmljYXRpb25zID0gbmV3IE5vdGlmaWNhdGlvbk1hbmFnZXJcbiAgICBAdXBkYXRlUHJvY2Vzc0VudiA/PSB1cGRhdGVQcm9jZXNzRW52ICMgRm9yIHRlc3RpbmdcblxuICAgIEBzdGF0ZVN0b3JlID0gbmV3IFN0YXRlU3RvcmUoJ0F0b21FbnZpcm9ubWVudHMnLCAxKVxuXG4gICAgQGNvbmZpZyA9IG5ldyBDb25maWcoe25vdGlmaWNhdGlvbk1hbmFnZXI6IEBub3RpZmljYXRpb25zLCBAZW5hYmxlUGVyc2lzdGVuY2V9KVxuICAgIEBjb25maWcuc2V0U2NoZW1hIG51bGwsIHt0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczogXy5jbG9uZShDb25maWdTY2hlbWEpfVxuXG4gICAgQGtleW1hcHMgPSBuZXcgS2V5bWFwTWFuYWdlcih7bm90aWZpY2F0aW9uTWFuYWdlcjogQG5vdGlmaWNhdGlvbnN9KVxuICAgIEB0b29sdGlwcyA9IG5ldyBUb29sdGlwTWFuYWdlcihrZXltYXBNYW5hZ2VyOiBAa2V5bWFwcywgdmlld1JlZ2lzdHJ5OiBAdmlld3MpXG4gICAgQGNvbW1hbmRzID0gbmV3IENvbW1hbmRSZWdpc3RyeVxuICAgIEBncmFtbWFycyA9IG5ldyBHcmFtbWFyUmVnaXN0cnkoe0Bjb25maWd9KVxuICAgIEBzdHlsZXMgPSBuZXcgU3R5bGVNYW5hZ2VyKClcbiAgICBAcGFja2FnZXMgPSBuZXcgUGFja2FnZU1hbmFnZXIoe1xuICAgICAgQGNvbmZpZywgc3R5bGVNYW5hZ2VyOiBAc3R5bGVzLFxuICAgICAgY29tbWFuZFJlZ2lzdHJ5OiBAY29tbWFuZHMsIGtleW1hcE1hbmFnZXI6IEBrZXltYXBzLCBub3RpZmljYXRpb25NYW5hZ2VyOiBAbm90aWZpY2F0aW9ucyxcbiAgICAgIGdyYW1tYXJSZWdpc3RyeTogQGdyYW1tYXJzLCBkZXNlcmlhbGl6ZXJNYW5hZ2VyOiBAZGVzZXJpYWxpemVycywgdmlld1JlZ2lzdHJ5OiBAdmlld3NcbiAgICB9KVxuICAgIEB0aGVtZXMgPSBuZXcgVGhlbWVNYW5hZ2VyKHtcbiAgICAgIHBhY2thZ2VNYW5hZ2VyOiBAcGFja2FnZXMsIEBjb25maWcsIHN0eWxlTWFuYWdlcjogQHN0eWxlcyxcbiAgICAgIG5vdGlmaWNhdGlvbk1hbmFnZXI6IEBub3RpZmljYXRpb25zLCB2aWV3UmVnaXN0cnk6IEB2aWV3c1xuICAgIH0pXG4gICAgQG1lbnUgPSBuZXcgTWVudU1hbmFnZXIoe2tleW1hcE1hbmFnZXI6IEBrZXltYXBzLCBwYWNrYWdlTWFuYWdlcjogQHBhY2thZ2VzfSlcbiAgICBAY29udGV4dE1lbnUgPSBuZXcgQ29udGV4dE1lbnVNYW5hZ2VyKHtrZXltYXBNYW5hZ2VyOiBAa2V5bWFwc30pXG4gICAgQHBhY2thZ2VzLnNldE1lbnVNYW5hZ2VyKEBtZW51KVxuICAgIEBwYWNrYWdlcy5zZXRDb250ZXh0TWVudU1hbmFnZXIoQGNvbnRleHRNZW51KVxuICAgIEBwYWNrYWdlcy5zZXRUaGVtZU1hbmFnZXIoQHRoZW1lcylcblxuICAgIEBwcm9qZWN0ID0gbmV3IFByb2plY3Qoe25vdGlmaWNhdGlvbk1hbmFnZXI6IEBub3RpZmljYXRpb25zLCBwYWNrYWdlTWFuYWdlcjogQHBhY2thZ2VzLCBAY29uZmlnLCBAYXBwbGljYXRpb25EZWxlZ2F0ZX0pXG4gICAgQGNvbW1hbmRJbnN0YWxsZXIgPSBuZXcgQ29tbWFuZEluc3RhbGxlcihAYXBwbGljYXRpb25EZWxlZ2F0ZSlcblxuICAgIEB0ZXh0RWRpdG9ycyA9IG5ldyBUZXh0RWRpdG9yUmVnaXN0cnkoe1xuICAgICAgQGNvbmZpZywgZ3JhbW1hclJlZ2lzdHJ5OiBAZ3JhbW1hcnMsIGFzc2VydDogQGFzc2VydC5iaW5kKHRoaXMpLFxuICAgICAgcGFja2FnZU1hbmFnZXI6IEBwYWNrYWdlc1xuICAgIH0pXG5cbiAgICBAd29ya3NwYWNlID0gbmV3IFdvcmtzcGFjZSh7XG4gICAgICBAY29uZmlnLCBAcHJvamVjdCwgcGFja2FnZU1hbmFnZXI6IEBwYWNrYWdlcywgZ3JhbW1hclJlZ2lzdHJ5OiBAZ3JhbW1hcnMsIGRlc2VyaWFsaXplck1hbmFnZXI6IEBkZXNlcmlhbGl6ZXJzLFxuICAgICAgbm90aWZpY2F0aW9uTWFuYWdlcjogQG5vdGlmaWNhdGlvbnMsIEBhcHBsaWNhdGlvbkRlbGVnYXRlLCB2aWV3UmVnaXN0cnk6IEB2aWV3cywgYXNzZXJ0OiBAYXNzZXJ0LmJpbmQodGhpcyksXG4gICAgICB0ZXh0RWRpdG9yUmVnaXN0cnk6IEB0ZXh0RWRpdG9ycywgc3R5bGVNYW5hZ2VyOiBAc3R5bGVzLCBAZW5hYmxlUGVyc2lzdGVuY2VcbiAgICB9KVxuXG4gICAgQHRoZW1lcy53b3Jrc3BhY2UgPSBAd29ya3NwYWNlXG5cbiAgICBAYXV0b1VwZGF0ZXIgPSBuZXcgQXV0b1VwZGF0ZU1hbmFnZXIoe0BhcHBsaWNhdGlvbkRlbGVnYXRlfSlcblxuICAgIGlmIEBrZXltYXBzLmNhbkxvYWRCdW5kbGVkS2V5bWFwc0Zyb21NZW1vcnkoKVxuICAgICAgQGtleW1hcHMubG9hZEJ1bmRsZWRLZXltYXBzKClcblxuICAgIEByZWdpc3RlckRlZmF1bHRDb21tYW5kcygpXG4gICAgQHJlZ2lzdGVyRGVmYXVsdE9wZW5lcnMoKVxuICAgIEByZWdpc3RlckRlZmF1bHREZXNlcmlhbGl6ZXJzKClcblxuICAgIEB3aW5kb3dFdmVudEhhbmRsZXIgPSBuZXcgV2luZG93RXZlbnRIYW5kbGVyKHthdG9tRW52aXJvbm1lbnQ6IHRoaXMsIEBhcHBsaWNhdGlvbkRlbGVnYXRlfSlcblxuICAgIEBoaXN0b3J5ID0gbmV3IEhpc3RvcnlNYW5hZ2VyKHtAcHJvamVjdCwgQGNvbW1hbmRzLCBAc3RhdGVTdG9yZX0pXG4gICAgIyBLZWVwIGluc3RhbmNlcyBvZiBIaXN0b3J5TWFuYWdlciBpbiBzeW5jXG4gICAgQGRpc3Bvc2FibGVzLmFkZCBAaGlzdG9yeS5vbkRpZENoYW5nZVByb2plY3RzIChlKSA9PlxuICAgICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuZGlkQ2hhbmdlSGlzdG9yeU1hbmFnZXIoKSB1bmxlc3MgZS5yZWxvYWRlZFxuXG4gIGluaXRpYWxpemU6IChwYXJhbXM9e30pIC0+XG4gICAgIyBUaGlzIHdpbGwgZm9yY2UgVGV4dEVkaXRvckVsZW1lbnQgdG8gcmVnaXN0ZXIgdGhlIGN1c3RvbSBlbGVtZW50LCBzbyB0aGF0XG4gICAgIyB1c2luZyBgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXRvbS10ZXh0LWVkaXRvcicpYCB3b3JrcyBpZiBpdCdzIGNhbGxlZFxuICAgICMgYmVmb3JlIG9wZW5pbmcgYSBidWZmZXIuXG4gICAgcmVxdWlyZSAnLi90ZXh0LWVkaXRvci1lbGVtZW50J1xuXG4gICAge0B3aW5kb3csIEBkb2N1bWVudCwgQGJsb2JTdG9yZSwgQGNvbmZpZ0RpclBhdGgsIG9ubHlMb2FkQmFzZVN0eWxlU2hlZXRzfSA9IHBhcmFtc1xuICAgIHtkZXZNb2RlLCBzYWZlTW9kZSwgcmVzb3VyY2VQYXRoLCBjbGVhcldpbmRvd1N0YXRlfSA9IEBnZXRMb2FkU2V0dGluZ3MoKVxuXG4gICAgaWYgY2xlYXJXaW5kb3dTdGF0ZVxuICAgICAgQGdldFN0b3JhZ2VGb2xkZXIoKS5jbGVhcigpXG4gICAgICBAc3RhdGVTdG9yZS5jbGVhcigpXG5cbiAgICBAdmlld3MuaW5pdGlhbGl6ZSgpXG5cbiAgICBDb25maWdTY2hlbWEucHJvamVjdEhvbWUgPSB7XG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIGRlZmF1bHQ6IHBhdGguam9pbihmcy5nZXRIb21lRGlyZWN0b3J5KCksICdnaXRodWInKSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGRpcmVjdG9yeSB3aGVyZSBwcm9qZWN0cyBhcmUgYXNzdW1lZCB0byBiZSBsb2NhdGVkLiBQYWNrYWdlcyBjcmVhdGVkIHVzaW5nIHRoZSBQYWNrYWdlIEdlbmVyYXRvciB3aWxsIGJlIHN0b3JlZCBoZXJlIGJ5IGRlZmF1bHQuJ1xuICAgIH1cbiAgICBAY29uZmlnLmluaXRpYWxpemUoe0Bjb25maWdEaXJQYXRoLCByZXNvdXJjZVBhdGgsIHByb2plY3RIb21lU2NoZW1hOiBDb25maWdTY2hlbWEucHJvamVjdEhvbWV9KVxuXG4gICAgQG1lbnUuaW5pdGlhbGl6ZSh7cmVzb3VyY2VQYXRofSlcbiAgICBAY29udGV4dE1lbnUuaW5pdGlhbGl6ZSh7cmVzb3VyY2VQYXRoLCBkZXZNb2RlfSlcblxuICAgIEBrZXltYXBzLmNvbmZpZ0RpclBhdGggPSBAY29uZmlnRGlyUGF0aFxuICAgIEBrZXltYXBzLnJlc291cmNlUGF0aCA9IHJlc291cmNlUGF0aFxuICAgIEBrZXltYXBzLmRldk1vZGUgPSBkZXZNb2RlXG4gICAgdW5sZXNzIEBrZXltYXBzLmNhbkxvYWRCdW5kbGVkS2V5bWFwc0Zyb21NZW1vcnkoKVxuICAgICAgQGtleW1hcHMubG9hZEJ1bmRsZWRLZXltYXBzKClcblxuICAgIEBjb21tYW5kcy5hdHRhY2goQHdpbmRvdylcblxuICAgIEBzdHlsZXMuaW5pdGlhbGl6ZSh7QGNvbmZpZ0RpclBhdGh9KVxuICAgIEBwYWNrYWdlcy5pbml0aWFsaXplKHtkZXZNb2RlLCBAY29uZmlnRGlyUGF0aCwgcmVzb3VyY2VQYXRoLCBzYWZlTW9kZX0pXG4gICAgQHRoZW1lcy5pbml0aWFsaXplKHtAY29uZmlnRGlyUGF0aCwgcmVzb3VyY2VQYXRoLCBzYWZlTW9kZSwgZGV2TW9kZX0pXG5cbiAgICBAY29tbWFuZEluc3RhbGxlci5pbml0aWFsaXplKEBnZXRWZXJzaW9uKCkpXG4gICAgQGF1dG9VcGRhdGVyLmluaXRpYWxpemUoKVxuXG4gICAgQGNvbmZpZy5sb2FkKClcblxuICAgIEB0aGVtZXMubG9hZEJhc2VTdHlsZXNoZWV0cygpXG4gICAgQGluaXRpYWxTdHlsZUVsZW1lbnRzID0gQHN0eWxlcy5nZXRTbmFwc2hvdCgpXG4gICAgQHRoZW1lcy5pbml0aWFsTG9hZENvbXBsZXRlID0gdHJ1ZSBpZiBvbmx5TG9hZEJhc2VTdHlsZVNoZWV0c1xuICAgIEBzZXRCb2R5UGxhdGZvcm1DbGFzcygpXG5cbiAgICBAc3R5bGVzRWxlbWVudCA9IEBzdHlsZXMuYnVpbGRTdHlsZXNFbGVtZW50KClcbiAgICBAZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChAc3R5bGVzRWxlbWVudClcblxuICAgIEBrZXltYXBzLnN1YnNjcmliZVRvRmlsZVJlYWRGYWlsdXJlKClcblxuICAgIEBpbnN0YWxsVW5jYXVnaHRFcnJvckhhbmRsZXIoKVxuICAgIEBhdHRhY2hTYXZlU3RhdGVMaXN0ZW5lcnMoKVxuICAgIEB3aW5kb3dFdmVudEhhbmRsZXIuaW5pdGlhbGl6ZShAd2luZG93LCBAZG9jdW1lbnQpXG5cbiAgICBAb2JzZXJ2ZUF1dG9IaWRlTWVudUJhcigpXG5cbiAgICBAaGlzdG9yeS5pbml0aWFsaXplKEB3aW5kb3cubG9jYWxTdG9yYWdlKVxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQGFwcGxpY2F0aW9uRGVsZWdhdGUub25EaWRDaGFuZ2VIaXN0b3J5TWFuYWdlcig9PiBAaGlzdG9yeS5sb2FkU3RhdGUoKSlcblxuICBwcmVsb2FkUGFja2FnZXM6IC0+XG4gICAgQHBhY2thZ2VzLnByZWxvYWRQYWNrYWdlcygpXG5cbiAgYXR0YWNoU2F2ZVN0YXRlTGlzdGVuZXJzOiAtPlxuICAgIHNhdmVTdGF0ZSA9IF8uZGVib3VuY2UoKD0+XG4gICAgICB3aW5kb3cucmVxdWVzdElkbGVDYWxsYmFjayA9PiBAc2F2ZVN0YXRlKHtpc1VubG9hZGluZzogZmFsc2V9KSB1bmxlc3MgQHVubG9hZGVkXG4gICAgKSwgQHNhdmVTdGF0ZURlYm91bmNlSW50ZXJ2YWwpXG4gICAgQGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHNhdmVTdGF0ZSwgdHJ1ZSlcbiAgICBAZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHNhdmVTdGF0ZSwgdHJ1ZSlcbiAgICBAZGlzcG9zYWJsZXMuYWRkIG5ldyBEaXNwb3NhYmxlID0+XG4gICAgICBAZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgc2F2ZVN0YXRlLCB0cnVlKVxuICAgICAgQGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBzYXZlU3RhdGUsIHRydWUpXG5cbiAgcmVnaXN0ZXJEZWZhdWx0RGVzZXJpYWxpemVyczogLT5cbiAgICBAZGVzZXJpYWxpemVycy5hZGQoV29ya3NwYWNlKVxuICAgIEBkZXNlcmlhbGl6ZXJzLmFkZChQYW5lQ29udGFpbmVyKVxuICAgIEBkZXNlcmlhbGl6ZXJzLmFkZChQYW5lQXhpcylcbiAgICBAZGVzZXJpYWxpemVycy5hZGQoUGFuZSlcbiAgICBAZGVzZXJpYWxpemVycy5hZGQoRG9jaylcbiAgICBAZGVzZXJpYWxpemVycy5hZGQoUHJvamVjdClcbiAgICBAZGVzZXJpYWxpemVycy5hZGQoVGV4dEVkaXRvcilcbiAgICBAZGVzZXJpYWxpemVycy5hZGQoVGV4dEJ1ZmZlcilcblxuICByZWdpc3RlckRlZmF1bHRDb21tYW5kczogLT5cbiAgICByZWdpc3RlckRlZmF1bHRDb21tYW5kcyh7Y29tbWFuZFJlZ2lzdHJ5OiBAY29tbWFuZHMsIEBjb25maWcsIEBjb21tYW5kSW5zdGFsbGVyLCBub3RpZmljYXRpb25NYW5hZ2VyOiBAbm90aWZpY2F0aW9ucywgQHByb2plY3QsIEBjbGlwYm9hcmR9KVxuXG4gIHJlZ2lzdGVyRGVmYXVsdE9wZW5lcnM6IC0+XG4gICAgQHdvcmtzcGFjZS5hZGRPcGVuZXIgKHVyaSkgPT5cbiAgICAgIHN3aXRjaCB1cmlcbiAgICAgICAgd2hlbiAnYXRvbTovLy5hdG9tL3N0eWxlc2hlZXQnXG4gICAgICAgICAgQHdvcmtzcGFjZS5vcGVuVGV4dEZpbGUoQHN0eWxlcy5nZXRVc2VyU3R5bGVTaGVldFBhdGgoKSlcbiAgICAgICAgd2hlbiAnYXRvbTovLy5hdG9tL2tleW1hcCdcbiAgICAgICAgICBAd29ya3NwYWNlLm9wZW5UZXh0RmlsZShAa2V5bWFwcy5nZXRVc2VyS2V5bWFwUGF0aCgpKVxuICAgICAgICB3aGVuICdhdG9tOi8vLmF0b20vY29uZmlnJ1xuICAgICAgICAgIEB3b3Jrc3BhY2Uub3BlblRleHRGaWxlKEBjb25maWcuZ2V0VXNlckNvbmZpZ1BhdGgoKSlcbiAgICAgICAgd2hlbiAnYXRvbTovLy5hdG9tL2luaXQtc2NyaXB0J1xuICAgICAgICAgIEB3b3Jrc3BhY2Uub3BlblRleHRGaWxlKEBnZXRVc2VySW5pdFNjcmlwdFBhdGgoKSlcblxuICByZWdpc3RlckRlZmF1bHRUYXJnZXRGb3JLZXltYXBzOiAtPlxuICAgIEBrZXltYXBzLmRlZmF1bHRUYXJnZXQgPSBAd29ya3NwYWNlLmdldEVsZW1lbnQoKVxuXG4gIG9ic2VydmVBdXRvSGlkZU1lbnVCYXI6IC0+XG4gICAgQGRpc3Bvc2FibGVzLmFkZCBAY29uZmlnLm9uRGlkQ2hhbmdlICdjb3JlLmF1dG9IaWRlTWVudUJhcicsICh7bmV3VmFsdWV9KSA9PlxuICAgICAgQHNldEF1dG9IaWRlTWVudUJhcihuZXdWYWx1ZSlcbiAgICBAc2V0QXV0b0hpZGVNZW51QmFyKHRydWUpIGlmIEBjb25maWcuZ2V0KCdjb3JlLmF1dG9IaWRlTWVudUJhcicpXG5cbiAgcmVzZXQ6IC0+XG4gICAgQGRlc2VyaWFsaXplcnMuY2xlYXIoKVxuICAgIEByZWdpc3RlckRlZmF1bHREZXNlcmlhbGl6ZXJzKClcblxuICAgIEBjb25maWcuY2xlYXIoKVxuICAgIEBjb25maWcuc2V0U2NoZW1hIG51bGwsIHt0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczogXy5jbG9uZShDb25maWdTY2hlbWEpfVxuXG4gICAgQGtleW1hcHMuY2xlYXIoKVxuICAgIEBrZXltYXBzLmxvYWRCdW5kbGVkS2V5bWFwcygpXG5cbiAgICBAY29tbWFuZHMuY2xlYXIoKVxuICAgIEByZWdpc3RlckRlZmF1bHRDb21tYW5kcygpXG5cbiAgICBAc3R5bGVzLnJlc3RvcmVTbmFwc2hvdChAaW5pdGlhbFN0eWxlRWxlbWVudHMpXG5cbiAgICBAbWVudS5jbGVhcigpXG5cbiAgICBAY2xpcGJvYXJkLnJlc2V0KClcblxuICAgIEBub3RpZmljYXRpb25zLmNsZWFyKClcblxuICAgIEBjb250ZXh0TWVudS5jbGVhcigpXG5cbiAgICBAcGFja2FnZXMucmVzZXQoKVxuXG4gICAgQHdvcmtzcGFjZS5yZXNldChAcGFja2FnZXMpXG4gICAgQHJlZ2lzdGVyRGVmYXVsdE9wZW5lcnMoKVxuXG4gICAgQHByb2plY3QucmVzZXQoQHBhY2thZ2VzKVxuXG4gICAgQHdvcmtzcGFjZS5zdWJzY3JpYmVUb0V2ZW50cygpXG5cbiAgICBAZ3JhbW1hcnMuY2xlYXIoKVxuXG4gICAgQHRleHRFZGl0b3JzLmNsZWFyKClcblxuICAgIEB2aWV3cy5jbGVhcigpXG5cbiAgZGVzdHJveTogLT5cbiAgICByZXR1cm4gaWYgbm90IEBwcm9qZWN0XG5cbiAgICBAZGlzcG9zYWJsZXMuZGlzcG9zZSgpXG4gICAgQHdvcmtzcGFjZT8uZGVzdHJveSgpXG4gICAgQHdvcmtzcGFjZSA9IG51bGxcbiAgICBAdGhlbWVzLndvcmtzcGFjZSA9IG51bGxcbiAgICBAcHJvamVjdD8uZGVzdHJveSgpXG4gICAgQHByb2plY3QgPSBudWxsXG4gICAgQGNvbW1hbmRzLmNsZWFyKClcbiAgICBAc3R5bGVzRWxlbWVudC5yZW1vdmUoKVxuICAgIEBjb25maWcudW5vYnNlcnZlVXNlckNvbmZpZygpXG4gICAgQGF1dG9VcGRhdGVyLmRlc3Ryb3koKVxuXG4gICAgQHVuaW5zdGFsbFdpbmRvd0V2ZW50SGFuZGxlcigpXG5cbiAgIyMjXG4gIFNlY3Rpb246IEV2ZW50IFN1YnNjcmlwdGlvblxuICAjIyNcblxuICAjIEV4dGVuZGVkOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW5ldmVyIHs6OmJlZXB9IGlzIGNhbGxlZC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aGVuZXZlciB7OjpiZWVwfSBpcyBjYWxsZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZEJlZXA6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWJlZXAnLCBjYWxsYmFja1xuXG4gICMgRXh0ZW5kZWQ6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiB0aGVyZSBpcyBhbiB1bmhhbmRsZWQgZXJyb3IsIGJ1dFxuICAjIGJlZm9yZSB0aGUgZGV2dG9vbHMgcG9wIG9wZW5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aGVuZXZlciB0aGVyZSBpcyBhbiB1bmhhbmRsZWQgZXJyb3JcbiAgIyAgICogYGV2ZW50YCB7T2JqZWN0fVxuICAjICAgICAqIGBvcmlnaW5hbEVycm9yYCB7T2JqZWN0fSB0aGUgb3JpZ2luYWwgZXJyb3Igb2JqZWN0XG4gICMgICAgICogYG1lc3NhZ2VgIHtTdHJpbmd9IHRoZSBvcmlnaW5hbCBlcnJvciBvYmplY3RcbiAgIyAgICAgKiBgdXJsYCB7U3RyaW5nfSBVcmwgdG8gdGhlIGZpbGUgd2hlcmUgdGhlIGVycm9yIG9yaWdpbmF0ZWQuXG4gICMgICAgICogYGxpbmVgIHtOdW1iZXJ9XG4gICMgICAgICogYGNvbHVtbmAge051bWJlcn1cbiAgIyAgICAgKiBgcHJldmVudERlZmF1bHRgIHtGdW5jdGlvbn0gY2FsbCB0aGlzIHRvIGF2b2lkIHBvcHBpbmcgdXAgdGhlIGRldiB0b29scy5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uV2lsbFRocm93RXJyb3I6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnd2lsbC10aHJvdy1lcnJvcicsIGNhbGxiYWNrXG5cbiAgIyBFeHRlbmRlZDogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuZXZlciB0aGVyZSBpcyBhbiB1bmhhbmRsZWQgZXJyb3IuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2hlbmV2ZXIgdGhlcmUgaXMgYW4gdW5oYW5kbGVkIGVycm9yXG4gICMgICAqIGBldmVudGAge09iamVjdH1cbiAgIyAgICAgKiBgb3JpZ2luYWxFcnJvcmAge09iamVjdH0gdGhlIG9yaWdpbmFsIGVycm9yIG9iamVjdFxuICAjICAgICAqIGBtZXNzYWdlYCB7U3RyaW5nfSB0aGUgb3JpZ2luYWwgZXJyb3Igb2JqZWN0XG4gICMgICAgICogYHVybGAge1N0cmluZ30gVXJsIHRvIHRoZSBmaWxlIHdoZXJlIHRoZSBlcnJvciBvcmlnaW5hdGVkLlxuICAjICAgICAqIGBsaW5lYCB7TnVtYmVyfVxuICAjICAgICAqIGBjb2x1bW5gIHtOdW1iZXJ9XG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZFRocm93RXJyb3I6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLXRocm93LWVycm9yJywgY2FsbGJhY2tcblxuICAjIFRPRE86IE1ha2UgdGhpcyBwYXJ0IG9mIHRoZSBwdWJsaWMgQVBJLiBXZSBzaG91bGQgbWFrZSBvbkRpZFRocm93RXJyb3JcbiAgIyBtYXRjaCB0aGUgaW50ZXJmYWNlIGJ5IG9ubHkgeWllbGRpbmcgYW4gZXhjZXB0aW9uIG9iamVjdCB0byB0aGUgaGFuZGxlclxuICAjIGFuZCBkZXByZWNhdGluZyB0aGUgb2xkIGJlaGF2aW9yLlxuICBvbkRpZEZhaWxBc3NlcnRpb246IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWZhaWwtYXNzZXJ0aW9uJywgY2FsbGJhY2tcblxuICAjIEV4dGVuZGVkOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIGFzIHNvb24gYXMgdGhlIHNoZWxsIGVudmlyb25tZW50IGlzXG4gICMgbG9hZGVkIChvciBpbW1lZGlhdGVseSBpZiBpdCB3YXMgYWxyZWFkeSBsb2FkZWQpLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdoZW5ldmVyIHRoZXJlIGlzIGFuIHVuaGFuZGxlZCBlcnJvclxuICB3aGVuU2hlbGxFbnZpcm9ubWVudExvYWRlZDogKGNhbGxiYWNrKSAtPlxuICAgIGlmIEBzaGVsbEVudmlyb25tZW50TG9hZGVkXG4gICAgICBjYWxsYmFjaygpXG4gICAgICBuZXcgRGlzcG9zYWJsZSgpXG4gICAgZWxzZVxuICAgICAgQGVtaXR0ZXIub25jZSAnbG9hZGVkLXNoZWxsLWVudmlyb25tZW50JywgY2FsbGJhY2tcblxuICAjIyNcbiAgU2VjdGlvbjogQXRvbSBEZXRhaWxzXG4gICMjI1xuXG4gICMgUHVibGljOiBSZXR1cm5zIGEge0Jvb2xlYW59IHRoYXQgaXMgYHRydWVgIGlmIHRoZSBjdXJyZW50IHdpbmRvdyBpcyBpbiBkZXZlbG9wbWVudCBtb2RlLlxuICBpbkRldk1vZGU6IC0+XG4gICAgQGRldk1vZGUgPz0gQGdldExvYWRTZXR0aW5ncygpLmRldk1vZGVcblxuICAjIFB1YmxpYzogUmV0dXJucyBhIHtCb29sZWFufSB0aGF0IGlzIGB0cnVlYCBpZiB0aGUgY3VycmVudCB3aW5kb3cgaXMgaW4gc2FmZSBtb2RlLlxuICBpblNhZmVNb2RlOiAtPlxuICAgIEBzYWZlTW9kZSA/PSBAZ2V0TG9hZFNldHRpbmdzKCkuc2FmZU1vZGVcblxuICAjIFB1YmxpYzogUmV0dXJucyBhIHtCb29sZWFufSB0aGF0IGlzIGB0cnVlYCBpZiB0aGUgY3VycmVudCB3aW5kb3cgaXMgcnVubmluZyBzcGVjcy5cbiAgaW5TcGVjTW9kZTogLT5cbiAgICBAc3BlY01vZGUgPz0gQGdldExvYWRTZXR0aW5ncygpLmlzU3BlY1xuXG4gICMgUmV0dXJucyBhIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdGhpcyB0aGUgZmlyc3QgdGltZSB0aGUgd2luZG93J3MgYmVlblxuICAjIGxvYWRlZC5cbiAgaXNGaXJzdExvYWQ6IC0+XG4gICAgQGZpcnN0TG9hZCA/PSBAZ2V0TG9hZFNldHRpbmdzKCkuZmlyc3RMb2FkXG5cbiAgIyBQdWJsaWM6IEdldCB0aGUgdmVyc2lvbiBvZiB0aGUgQXRvbSBhcHBsaWNhdGlvbi5cbiAgI1xuICAjIFJldHVybnMgdGhlIHZlcnNpb24gdGV4dCB7U3RyaW5nfS5cbiAgZ2V0VmVyc2lvbjogLT5cbiAgICBAYXBwVmVyc2lvbiA/PSBAZ2V0TG9hZFNldHRpbmdzKCkuYXBwVmVyc2lvblxuXG4gICMgUmV0dXJucyB0aGUgcmVsZWFzZSBjaGFubmVsIGFzIGEge1N0cmluZ30uIFdpbGwgcmV0dXJuIG9uZSBvZiBgJ2RldicsICdiZXRhJywgJ3N0YWJsZSdgXG4gIGdldFJlbGVhc2VDaGFubmVsOiAtPlxuICAgIHZlcnNpb24gPSBAZ2V0VmVyc2lvbigpXG4gICAgaWYgdmVyc2lvbi5pbmRleE9mKCdiZXRhJykgPiAtMVxuICAgICAgJ2JldGEnXG4gICAgZWxzZSBpZiB2ZXJzaW9uLmluZGV4T2YoJ2RldicpID4gLTFcbiAgICAgICdkZXYnXG4gICAgZWxzZVxuICAgICAgJ3N0YWJsZSdcblxuICAjIFB1YmxpYzogUmV0dXJucyBhIHtCb29sZWFufSB0aGF0IGlzIGB0cnVlYCBpZiB0aGUgY3VycmVudCB2ZXJzaW9uIGlzIGFuIG9mZmljaWFsIHJlbGVhc2UuXG4gIGlzUmVsZWFzZWRWZXJzaW9uOiAtPlxuICAgIG5vdCAvXFx3ezd9Ly50ZXN0KEBnZXRWZXJzaW9uKCkpICMgQ2hlY2sgaWYgdGhlIHJlbGVhc2UgaXMgYSA3LWNoYXJhY3RlciBTSEEgcHJlZml4XG5cbiAgIyBQdWJsaWM6IEdldCB0aGUgdGltZSB0YWtlbiB0byBjb21wbGV0ZWx5IGxvYWQgdGhlIGN1cnJlbnQgd2luZG93LlxuICAjXG4gICMgVGhpcyB0aW1lIGluY2x1ZGUgdGhpbmdzIGxpa2UgbG9hZGluZyBhbmQgYWN0aXZhdGluZyBwYWNrYWdlcywgY3JlYXRpbmdcbiAgIyBET00gZWxlbWVudHMgZm9yIHRoZSBlZGl0b3IsIGFuZCByZWFkaW5nIHRoZSBjb25maWcuXG4gICNcbiAgIyBSZXR1cm5zIHRoZSB7TnVtYmVyfSBvZiBtaWxsaXNlY29uZHMgdGFrZW4gdG8gbG9hZCB0aGUgd2luZG93IG9yIG51bGxcbiAgIyBpZiB0aGUgd2luZG93IGhhc24ndCBmaW5pc2hlZCBsb2FkaW5nIHlldC5cbiAgZ2V0V2luZG93TG9hZFRpbWU6IC0+XG4gICAgQGxvYWRUaW1lXG5cbiAgIyBQdWJsaWM6IEdldCB0aGUgbG9hZCBzZXR0aW5ncyBmb3IgdGhlIGN1cnJlbnQgd2luZG93LlxuICAjXG4gICMgUmV0dXJucyBhbiB7T2JqZWN0fSBjb250YWluaW5nIGFsbCB0aGUgbG9hZCBzZXR0aW5nIGtleS92YWx1ZSBwYWlycy5cbiAgZ2V0TG9hZFNldHRpbmdzOiAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLmdldFdpbmRvd0xvYWRTZXR0aW5ncygpXG5cbiAgIyMjXG4gIFNlY3Rpb246IE1hbmFnaW5nIFRoZSBBdG9tIFdpbmRvd1xuICAjIyNcblxuICAjIEVzc2VudGlhbDogT3BlbiBhIG5ldyBBdG9tIHdpbmRvdyB1c2luZyB0aGUgZ2l2ZW4gb3B0aW9ucy5cbiAgI1xuICAjIENhbGxpbmcgdGhpcyBtZXRob2Qgd2l0aG91dCBhbiBvcHRpb25zIHBhcmFtZXRlciB3aWxsIG9wZW4gYSBwcm9tcHQgdG8gcGlja1xuICAjIGEgZmlsZS9mb2xkZXIgdG8gb3BlbiBpbiB0aGUgbmV3IHdpbmRvdy5cbiAgI1xuICAjICogYHBhcmFtc2AgQW4ge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGBwYXRoc1RvT3BlbmAgIEFuIHtBcnJheX0gb2Yge1N0cmluZ30gcGF0aHMgdG8gb3Blbi5cbiAgIyAgICogYG5ld1dpbmRvd2AgQSB7Qm9vbGVhbn0sIHRydWUgdG8gYWx3YXlzIG9wZW4gYSBuZXcgd2luZG93IGluc3RlYWQgb2ZcbiAgIyAgICAgcmV1c2luZyBleGlzdGluZyB3aW5kb3dzIGRlcGVuZGluZyBvbiB0aGUgcGF0aHMgdG8gb3Blbi5cbiAgIyAgICogYGRldk1vZGVgIEEge0Jvb2xlYW59LCB0cnVlIHRvIG9wZW4gdGhlIHdpbmRvdyBpbiBkZXZlbG9wbWVudCBtb2RlLlxuICAjICAgICBEZXZlbG9wbWVudCBtb2RlIGxvYWRzIHRoZSBBdG9tIHNvdXJjZSBmcm9tIHRoZSBsb2NhbGx5IGNsb25lZFxuICAjICAgICByZXBvc2l0b3J5IGFuZCBhbHNvIGxvYWRzIGFsbCB0aGUgcGFja2FnZXMgaW4gfi8uYXRvbS9kZXYvcGFja2FnZXNcbiAgIyAgICogYHNhZmVNb2RlYCBBIHtCb29sZWFufSwgdHJ1ZSB0byBvcGVuIHRoZSB3aW5kb3cgaW4gc2FmZSBtb2RlLiBTYWZlXG4gICMgICAgIG1vZGUgcHJldmVudHMgYWxsIHBhY2thZ2VzIGluc3RhbGxlZCB0byB+Ly5hdG9tL3BhY2thZ2VzIGZyb20gbG9hZGluZy5cbiAgb3BlbjogKHBhcmFtcykgLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5vcGVuKHBhcmFtcylcblxuICAjIEV4dGVuZGVkOiBQcm9tcHQgdGhlIHVzZXIgdG8gc2VsZWN0IG9uZSBvciBtb3JlIGZvbGRlcnMuXG4gICNcbiAgIyAqIGBjYWxsYmFja2AgQSB7RnVuY3Rpb259IHRvIGNhbGwgb25jZSB0aGUgdXNlciBoYXMgY29uZmlybWVkIHRoZSBzZWxlY3Rpb24uXG4gICMgICAqIGBwYXRoc2AgQW4ge0FycmF5fSBvZiB7U3RyaW5nfSBwYXRocyB0aGF0IHRoZSB1c2VyIHNlbGVjdGVkLCBvciBgbnVsbGBcbiAgIyAgICAgaWYgdGhlIHVzZXIgZGlzbWlzc2VkIHRoZSBkaWFsb2cuXG4gIHBpY2tGb2xkZXI6IChjYWxsYmFjaykgLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5waWNrRm9sZGVyKGNhbGxiYWNrKVxuXG4gICMgRXNzZW50aWFsOiBDbG9zZSB0aGUgY3VycmVudCB3aW5kb3cuXG4gIGNsb3NlOiAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLmNsb3NlV2luZG93KClcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSBzaXplIG9mIGN1cnJlbnQgd2luZG93LlxuICAjXG4gICMgUmV0dXJucyBhbiB7T2JqZWN0fSBpbiB0aGUgZm9ybWF0IGB7d2lkdGg6IDEwMDAsIGhlaWdodDogNzAwfWBcbiAgZ2V0U2l6ZTogLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5nZXRXaW5kb3dTaXplKClcblxuICAjIEVzc2VudGlhbDogU2V0IHRoZSBzaXplIG9mIGN1cnJlbnQgd2luZG93LlxuICAjXG4gICMgKiBgd2lkdGhgIFRoZSB7TnVtYmVyfSBvZiBwaXhlbHMuXG4gICMgKiBgaGVpZ2h0YCBUaGUge051bWJlcn0gb2YgcGl4ZWxzLlxuICBzZXRTaXplOiAod2lkdGgsIGhlaWdodCkgLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5zZXRXaW5kb3dTaXplKHdpZHRoLCBoZWlnaHQpXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUgcG9zaXRpb24gb2YgY3VycmVudCB3aW5kb3cuXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtPYmplY3R9IGluIHRoZSBmb3JtYXQgYHt4OiAxMCwgeTogMjB9YFxuICBnZXRQb3NpdGlvbjogLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5nZXRXaW5kb3dQb3NpdGlvbigpXG5cbiAgIyBFc3NlbnRpYWw6IFNldCB0aGUgcG9zaXRpb24gb2YgY3VycmVudCB3aW5kb3cuXG4gICNcbiAgIyAqIGB4YCBUaGUge051bWJlcn0gb2YgcGl4ZWxzLlxuICAjICogYHlgIFRoZSB7TnVtYmVyfSBvZiBwaXhlbHMuXG4gIHNldFBvc2l0aW9uOiAoeCwgeSkgLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5zZXRXaW5kb3dQb3NpdGlvbih4LCB5KVxuXG4gICMgRXh0ZW5kZWQ6IEdldCB0aGUgY3VycmVudCB3aW5kb3dcbiAgZ2V0Q3VycmVudFdpbmRvdzogLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5nZXRDdXJyZW50V2luZG93KClcblxuICAjIEV4dGVuZGVkOiBNb3ZlIGN1cnJlbnQgd2luZG93IHRvIHRoZSBjZW50ZXIgb2YgdGhlIHNjcmVlbi5cbiAgY2VudGVyOiAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLmNlbnRlcldpbmRvdygpXG5cbiAgIyBFeHRlbmRlZDogRm9jdXMgdGhlIGN1cnJlbnQgd2luZG93LlxuICBmb2N1czogLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5mb2N1c1dpbmRvdygpXG4gICAgQHdpbmRvdy5mb2N1cygpXG5cbiAgIyBFeHRlbmRlZDogU2hvdyB0aGUgY3VycmVudCB3aW5kb3cuXG4gIHNob3c6IC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuc2hvd1dpbmRvdygpXG5cbiAgIyBFeHRlbmRlZDogSGlkZSB0aGUgY3VycmVudCB3aW5kb3cuXG4gIGhpZGU6IC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuaGlkZVdpbmRvdygpXG5cbiAgIyBFeHRlbmRlZDogUmVsb2FkIHRoZSBjdXJyZW50IHdpbmRvdy5cbiAgcmVsb2FkOiAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLnJlbG9hZFdpbmRvdygpXG5cbiAgIyBFeHRlbmRlZDogUmVsYXVuY2ggdGhlIGVudGlyZSBhcHBsaWNhdGlvbi5cbiAgcmVzdGFydEFwcGxpY2F0aW9uOiAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLnJlc3RhcnRBcHBsaWNhdGlvbigpXG5cbiAgIyBFeHRlbmRlZDogUmV0dXJucyBhIHtCb29sZWFufSB0aGF0IGlzIGB0cnVlYCBpZiB0aGUgY3VycmVudCB3aW5kb3cgaXMgbWF4aW1pemVkLlxuICBpc01heGltaXplZDogLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5pc1dpbmRvd01heGltaXplZCgpXG5cbiAgbWF4aW1pemU6IC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUubWF4aW1pemVXaW5kb3coKVxuXG4gICMgRXh0ZW5kZWQ6IFJldHVybnMgYSB7Qm9vbGVhbn0gdGhhdCBpcyBgdHJ1ZWAgaWYgdGhlIGN1cnJlbnQgd2luZG93IGlzIGluIGZ1bGwgc2NyZWVuIG1vZGUuXG4gIGlzRnVsbFNjcmVlbjogLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5pc1dpbmRvd0Z1bGxTY3JlZW4oKVxuXG4gICMgRXh0ZW5kZWQ6IFNldCB0aGUgZnVsbCBzY3JlZW4gc3RhdGUgb2YgdGhlIGN1cnJlbnQgd2luZG93LlxuICBzZXRGdWxsU2NyZWVuOiAoZnVsbFNjcmVlbj1mYWxzZSkgLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5zZXRXaW5kb3dGdWxsU2NyZWVuKGZ1bGxTY3JlZW4pXG5cbiAgIyBFeHRlbmRlZDogVG9nZ2xlIHRoZSBmdWxsIHNjcmVlbiBzdGF0ZSBvZiB0aGUgY3VycmVudCB3aW5kb3cuXG4gIHRvZ2dsZUZ1bGxTY3JlZW46IC0+XG4gICAgQHNldEZ1bGxTY3JlZW4obm90IEBpc0Z1bGxTY3JlZW4oKSlcblxuICAjIFJlc3RvcmUgdGhlIHdpbmRvdyB0byBpdHMgcHJldmlvdXMgZGltZW5zaW9ucyBhbmQgc2hvdyBpdC5cbiAgI1xuICAjIFJlc3RvcmVzIHRoZSBmdWxsIHNjcmVlbiBhbmQgbWF4aW1pemVkIHN0YXRlIGFmdGVyIHRoZSB3aW5kb3cgaGFzIHJlc2l6ZWQgdG9cbiAgIyBwcmV2ZW50IHJlc2l6ZSBnbGl0Y2hlcy5cbiAgZGlzcGxheVdpbmRvdzogLT5cbiAgICBAcmVzdG9yZVdpbmRvd0RpbWVuc2lvbnMoKS50aGVuID0+XG4gICAgICBzdGVwcyA9IFtcbiAgICAgICAgQHJlc3RvcmVXaW5kb3dCYWNrZ3JvdW5kKCksXG4gICAgICAgIEBzaG93KCksXG4gICAgICAgIEBmb2N1cygpXG4gICAgICBdXG4gICAgICBzdGVwcy5wdXNoKEBzZXRGdWxsU2NyZWVuKHRydWUpKSBpZiBAd2luZG93RGltZW5zaW9ucz8uZnVsbFNjcmVlblxuICAgICAgc3RlcHMucHVzaChAbWF4aW1pemUoKSkgaWYgQHdpbmRvd0RpbWVuc2lvbnM/Lm1heGltaXplZCBhbmQgcHJvY2Vzcy5wbGF0Zm9ybSBpc250ICdkYXJ3aW4nXG4gICAgICBQcm9taXNlLmFsbChzdGVwcylcblxuICAjIEdldCB0aGUgZGltZW5zaW9ucyBvZiB0aGlzIHdpbmRvdy5cbiAgI1xuICAjIFJldHVybnMgYW4ge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGB4YCAgICAgIFRoZSB3aW5kb3cncyB4LXBvc2l0aW9uIHtOdW1iZXJ9LlxuICAjICAgKiBgeWAgICAgICBUaGUgd2luZG93J3MgeS1wb3NpdGlvbiB7TnVtYmVyfS5cbiAgIyAgICogYHdpZHRoYCAgVGhlIHdpbmRvdydzIHdpZHRoIHtOdW1iZXJ9LlxuICAjICAgKiBgaGVpZ2h0YCBUaGUgd2luZG93J3MgaGVpZ2h0IHtOdW1iZXJ9LlxuICBnZXRXaW5kb3dEaW1lbnNpb25zOiAtPlxuICAgIGJyb3dzZXJXaW5kb3cgPSBAZ2V0Q3VycmVudFdpbmRvdygpXG4gICAgW3gsIHldID0gYnJvd3NlcldpbmRvdy5nZXRQb3NpdGlvbigpXG4gICAgW3dpZHRoLCBoZWlnaHRdID0gYnJvd3NlcldpbmRvdy5nZXRTaXplKClcbiAgICBtYXhpbWl6ZWQgPSBicm93c2VyV2luZG93LmlzTWF4aW1pemVkKClcbiAgICB7eCwgeSwgd2lkdGgsIGhlaWdodCwgbWF4aW1pemVkfVxuXG4gICMgU2V0IHRoZSBkaW1lbnNpb25zIG9mIHRoZSB3aW5kb3cuXG4gICNcbiAgIyBUaGUgd2luZG93IHdpbGwgYmUgY2VudGVyZWQgaWYgZWl0aGVyIHRoZSB4IG9yIHkgY29vcmRpbmF0ZSBpcyBub3Qgc2V0XG4gICMgaW4gdGhlIGRpbWVuc2lvbnMgcGFyYW1ldGVyLiBJZiB4IG9yIHkgYXJlIG9taXR0ZWQgdGhlIHdpbmRvdyB3aWxsIGJlXG4gICMgY2VudGVyZWQuIElmIGhlaWdodCBvciB3aWR0aCBhcmUgb21pdHRlZCBvbmx5IHRoZSBwb3NpdGlvbiB3aWxsIGJlIGNoYW5nZWQuXG4gICNcbiAgIyAqIGBkaW1lbnNpb25zYCBBbiB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYHhgIFRoZSBuZXcgeCBjb29yZGluYXRlLlxuICAjICAgKiBgeWAgVGhlIG5ldyB5IGNvb3JkaW5hdGUuXG4gICMgICAqIGB3aWR0aGAgVGhlIG5ldyB3aWR0aC5cbiAgIyAgICogYGhlaWdodGAgVGhlIG5ldyBoZWlnaHQuXG4gIHNldFdpbmRvd0RpbWVuc2lvbnM6ICh7eCwgeSwgd2lkdGgsIGhlaWdodH0pIC0+XG4gICAgc3RlcHMgPSBbXVxuICAgIGlmIHdpZHRoPyBhbmQgaGVpZ2h0P1xuICAgICAgc3RlcHMucHVzaChAc2V0U2l6ZSh3aWR0aCwgaGVpZ2h0KSlcbiAgICBpZiB4PyBhbmQgeT9cbiAgICAgIHN0ZXBzLnB1c2goQHNldFBvc2l0aW9uKHgsIHkpKVxuICAgIGVsc2VcbiAgICAgIHN0ZXBzLnB1c2goQGNlbnRlcigpKVxuICAgIFByb21pc2UuYWxsKHN0ZXBzKVxuXG4gICMgUmV0dXJucyB0cnVlIGlmIHRoZSBkaW1lbnNpb25zIGFyZSB1c2VhYmxlLCBmYWxzZSBpZiB0aGV5IHNob3VsZCBiZSBpZ25vcmVkLlxuICAjIFdvcmsgYXJvdW5kIGZvciBodHRwczovL2dpdGh1Yi5jb20vYXRvbS9hdG9tLXNoZWxsL2lzc3Vlcy80NzNcbiAgaXNWYWxpZERpbWVuc2lvbnM6ICh7eCwgeSwgd2lkdGgsIGhlaWdodH09e30pIC0+XG4gICAgd2lkdGggPiAwIGFuZCBoZWlnaHQgPiAwIGFuZCB4ICsgd2lkdGggPiAwIGFuZCB5ICsgaGVpZ2h0ID4gMFxuXG4gIHN0b3JlV2luZG93RGltZW5zaW9uczogLT5cbiAgICBAd2luZG93RGltZW5zaW9ucyA9IEBnZXRXaW5kb3dEaW1lbnNpb25zKClcbiAgICBpZiBAaXNWYWxpZERpbWVuc2lvbnMoQHdpbmRvd0RpbWVuc2lvbnMpXG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImRlZmF1bHRXaW5kb3dEaW1lbnNpb25zXCIsIEpTT04uc3RyaW5naWZ5KEB3aW5kb3dEaW1lbnNpb25zKSlcblxuICBnZXREZWZhdWx0V2luZG93RGltZW5zaW9uczogLT5cbiAgICB7d2luZG93RGltZW5zaW9uc30gPSBAZ2V0TG9hZFNldHRpbmdzKClcbiAgICByZXR1cm4gd2luZG93RGltZW5zaW9ucyBpZiB3aW5kb3dEaW1lbnNpb25zP1xuXG4gICAgZGltZW5zaW9ucyA9IG51bGxcbiAgICB0cnlcbiAgICAgIGRpbWVuc2lvbnMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiZGVmYXVsdFdpbmRvd0RpbWVuc2lvbnNcIikpXG4gICAgY2F0Y2ggZXJyb3JcbiAgICAgIGNvbnNvbGUud2FybiBcIkVycm9yIHBhcnNpbmcgZGVmYXVsdCB3aW5kb3cgZGltZW5zaW9uc1wiLCBlcnJvclxuICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oXCJkZWZhdWx0V2luZG93RGltZW5zaW9uc1wiKVxuXG4gICAgaWYgQGlzVmFsaWREaW1lbnNpb25zKGRpbWVuc2lvbnMpXG4gICAgICBkaW1lbnNpb25zXG4gICAgZWxzZVxuICAgICAge3dpZHRoLCBoZWlnaHR9ID0gQGFwcGxpY2F0aW9uRGVsZWdhdGUuZ2V0UHJpbWFyeURpc3BsYXlXb3JrQXJlYVNpemUoKVxuICAgICAge3g6IDAsIHk6IDAsIHdpZHRoOiBNYXRoLm1pbigxMDI0LCB3aWR0aCksIGhlaWdodH1cblxuICByZXN0b3JlV2luZG93RGltZW5zaW9uczogLT5cbiAgICB1bmxlc3MgQHdpbmRvd0RpbWVuc2lvbnM/IGFuZCBAaXNWYWxpZERpbWVuc2lvbnMoQHdpbmRvd0RpbWVuc2lvbnMpXG4gICAgICBAd2luZG93RGltZW5zaW9ucyA9IEBnZXREZWZhdWx0V2luZG93RGltZW5zaW9ucygpXG4gICAgQHNldFdpbmRvd0RpbWVuc2lvbnMoQHdpbmRvd0RpbWVuc2lvbnMpLnRoZW4gPT4gQHdpbmRvd0RpbWVuc2lvbnNcblxuICByZXN0b3JlV2luZG93QmFja2dyb3VuZDogLT5cbiAgICBpZiBiYWNrZ3JvdW5kQ29sb3IgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2F0b206d2luZG93LWJhY2tncm91bmQtY29sb3InKVxuICAgICAgQGJhY2tncm91bmRTdHlsZXNoZWV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKVxuICAgICAgQGJhY2tncm91bmRTdHlsZXNoZWV0LnR5cGUgPSAndGV4dC9jc3MnXG4gICAgICBAYmFja2dyb3VuZFN0eWxlc2hlZXQuaW5uZXJUZXh0ID0gJ2h0bWwsIGJvZHkgeyBiYWNrZ3JvdW5kOiAnICsgYmFja2dyb3VuZENvbG9yICsgJyAhaW1wb3J0YW50OyB9J1xuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChAYmFja2dyb3VuZFN0eWxlc2hlZXQpXG5cbiAgc3RvcmVXaW5kb3dCYWNrZ3JvdW5kOiAtPlxuICAgIHJldHVybiBpZiBAaW5TcGVjTW9kZSgpXG5cbiAgICBiYWNrZ3JvdW5kQ29sb3IgPSBAd2luZG93LmdldENvbXB1dGVkU3R5bGUoQHdvcmtzcGFjZS5nZXRFbGVtZW50KCkpWydiYWNrZ3JvdW5kLWNvbG9yJ11cbiAgICBAd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdhdG9tOndpbmRvdy1iYWNrZ3JvdW5kLWNvbG9yJywgYmFja2dyb3VuZENvbG9yKVxuXG4gICMgQ2FsbCB0aGlzIG1ldGhvZCB3aGVuIGVzdGFibGlzaGluZyBhIHJlYWwgYXBwbGljYXRpb24gd2luZG93LlxuICBzdGFydEVkaXRvcldpbmRvdzogLT5cbiAgICBAdW5sb2FkZWQgPSBmYWxzZVxuICAgIHVwZGF0ZVByb2Nlc3NFbnZQcm9taXNlID0gQHVwZGF0ZVByb2Nlc3NFbnYoQGdldExvYWRTZXR0aW5ncygpLmVudilcbiAgICB1cGRhdGVQcm9jZXNzRW52UHJvbWlzZS50aGVuID0+XG4gICAgICBAc2hlbGxFbnZpcm9ubWVudExvYWRlZCA9IHRydWVcbiAgICAgIEBlbWl0dGVyLmVtaXQoJ2xvYWRlZC1zaGVsbC1lbnZpcm9ubWVudCcpXG4gICAgICBAcGFja2FnZXMudHJpZ2dlckFjdGl2YXRpb25Ib29rKCdjb3JlOmxvYWRlZC1zaGVsbC1lbnZpcm9ubWVudCcpXG5cbiAgICBsb2FkU3RhdGVQcm9taXNlID0gQGxvYWRTdGF0ZSgpLnRoZW4gKHN0YXRlKSA9PlxuICAgICAgQHdpbmRvd0RpbWVuc2lvbnMgPSBzdGF0ZT8ud2luZG93RGltZW5zaW9uc1xuICAgICAgQGRpc3BsYXlXaW5kb3coKS50aGVuID0+XG4gICAgICAgIEBjb21tYW5kSW5zdGFsbGVyLmluc3RhbGxBdG9tQ29tbWFuZCBmYWxzZSwgKGVycm9yKSAtPlxuICAgICAgICAgIGNvbnNvbGUud2FybiBlcnJvci5tZXNzYWdlIGlmIGVycm9yP1xuICAgICAgICBAY29tbWFuZEluc3RhbGxlci5pbnN0YWxsQXBtQ29tbWFuZCBmYWxzZSwgKGVycm9yKSAtPlxuICAgICAgICAgIGNvbnNvbGUud2FybiBlcnJvci5tZXNzYWdlIGlmIGVycm9yP1xuXG4gICAgICAgIEBkaXNwb3NhYmxlcy5hZGQoQGFwcGxpY2F0aW9uRGVsZWdhdGUub25EaWRPcGVuTG9jYXRpb25zKEBvcGVuTG9jYXRpb25zLmJpbmQodGhpcykpKVxuICAgICAgICBAZGlzcG9zYWJsZXMuYWRkKEBhcHBsaWNhdGlvbkRlbGVnYXRlLm9uQXBwbGljYXRpb25NZW51Q29tbWFuZChAZGlzcGF0Y2hBcHBsaWNhdGlvbk1lbnVDb21tYW5kLmJpbmQodGhpcykpKVxuICAgICAgICBAZGlzcG9zYWJsZXMuYWRkKEBhcHBsaWNhdGlvbkRlbGVnYXRlLm9uQ29udGV4dE1lbnVDb21tYW5kKEBkaXNwYXRjaENvbnRleHRNZW51Q29tbWFuZC5iaW5kKHRoaXMpKSlcbiAgICAgICAgQGRpc3Bvc2FibGVzLmFkZCBAYXBwbGljYXRpb25EZWxlZ2F0ZS5vblNhdmVXaW5kb3dTdGF0ZVJlcXVlc3QgPT5cbiAgICAgICAgICBjYWxsYmFjayA9ID0+IEBhcHBsaWNhdGlvbkRlbGVnYXRlLmRpZFNhdmVXaW5kb3dTdGF0ZSgpXG4gICAgICAgICAgQHNhdmVTdGF0ZSh7aXNVbmxvYWRpbmc6IHRydWV9KS5jYXRjaChjYWxsYmFjaykudGhlbihjYWxsYmFjaylcblxuICAgICAgICBAbGlzdGVuRm9yVXBkYXRlcygpXG5cbiAgICAgICAgQHJlZ2lzdGVyRGVmYXVsdFRhcmdldEZvcktleW1hcHMoKVxuXG4gICAgICAgIEBwYWNrYWdlcy5sb2FkUGFja2FnZXMoKVxuXG4gICAgICAgIHN0YXJ0VGltZSA9IERhdGUubm93KClcbiAgICAgICAgQGRlc2VyaWFsaXplKHN0YXRlKSBpZiBzdGF0ZT9cbiAgICAgICAgQGRlc2VyaWFsaXplVGltaW5ncy5hdG9tID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZVxuXG4gICAgICAgIGlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ2RhcndpbicgYW5kIEBjb25maWcuZ2V0KCdjb3JlLnRpdGxlQmFyJykgaXMgJ2N1c3RvbSdcbiAgICAgICAgICBAd29ya3NwYWNlLmFkZEhlYWRlclBhbmVsKHtpdGVtOiBuZXcgVGl0bGVCYXIoe0B3b3Jrc3BhY2UsIEB0aGVtZXMsIEBhcHBsaWNhdGlvbkRlbGVnYXRlfSl9KVxuICAgICAgICAgIEBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQoJ2N1c3RvbS10aXRsZS1iYXInKVxuICAgICAgICBpZiBwcm9jZXNzLnBsYXRmb3JtIGlzICdkYXJ3aW4nIGFuZCBAY29uZmlnLmdldCgnY29yZS50aXRsZUJhcicpIGlzICdjdXN0b20taW5zZXQnXG4gICAgICAgICAgQHdvcmtzcGFjZS5hZGRIZWFkZXJQYW5lbCh7aXRlbTogbmV3IFRpdGxlQmFyKHtAd29ya3NwYWNlLCBAdGhlbWVzLCBAYXBwbGljYXRpb25EZWxlZ2F0ZX0pfSlcbiAgICAgICAgICBAZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKCdjdXN0b20taW5zZXQtdGl0bGUtYmFyJylcbiAgICAgICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnZGFyd2luJyBhbmQgQGNvbmZpZy5nZXQoJ2NvcmUudGl0bGVCYXInKSBpcyAnaGlkZGVuJ1xuICAgICAgICAgIEBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbi10aXRsZS1iYXInKVxuXG4gICAgICAgIEBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKEB3b3Jrc3BhY2UuZ2V0RWxlbWVudCgpKVxuICAgICAgICBAYmFja2dyb3VuZFN0eWxlc2hlZXQ/LnJlbW92ZSgpXG5cbiAgICAgICAgQHdhdGNoUHJvamVjdFBhdGhzKClcblxuICAgICAgICBAcGFja2FnZXMuYWN0aXZhdGUoKVxuICAgICAgICBAa2V5bWFwcy5sb2FkVXNlcktleW1hcCgpXG4gICAgICAgIEByZXF1aXJlVXNlckluaXRTY3JpcHQoKSB1bmxlc3MgQGdldExvYWRTZXR0aW5ncygpLnNhZmVNb2RlXG5cbiAgICAgICAgQG1lbnUudXBkYXRlKClcblxuICAgICAgICBAb3BlbkluaXRpYWxFbXB0eUVkaXRvcklmTmVjZXNzYXJ5KClcblxuICAgIGxvYWRIaXN0b3J5UHJvbWlzZSA9IEBoaXN0b3J5LmxvYWRTdGF0ZSgpLnRoZW4gPT5cbiAgICAgIEByZW9wZW5Qcm9qZWN0TWVudU1hbmFnZXIgPSBuZXcgUmVvcGVuUHJvamVjdE1lbnVNYW5hZ2VyKHtcbiAgICAgICAgQG1lbnUsIEBjb21tYW5kcywgQGhpc3RvcnksIEBjb25maWcsXG4gICAgICAgIG9wZW46IChwYXRocykgPT4gQG9wZW4ocGF0aHNUb09wZW46IHBhdGhzKVxuICAgICAgfSlcbiAgICAgIEByZW9wZW5Qcm9qZWN0TWVudU1hbmFnZXIudXBkYXRlKClcblxuICAgIFByb21pc2UuYWxsKFtsb2FkU3RhdGVQcm9taXNlLCBsb2FkSGlzdG9yeVByb21pc2UsIHVwZGF0ZVByb2Nlc3NFbnZQcm9taXNlXSlcblxuICBzZXJpYWxpemU6IChvcHRpb25zKSAtPlxuICAgIHZlcnNpb246IEBjb25zdHJ1Y3Rvci52ZXJzaW9uXG4gICAgcHJvamVjdDogQHByb2plY3Quc2VyaWFsaXplKG9wdGlvbnMpXG4gICAgd29ya3NwYWNlOiBAd29ya3NwYWNlLnNlcmlhbGl6ZSgpXG4gICAgcGFja2FnZVN0YXRlczogQHBhY2thZ2VzLnNlcmlhbGl6ZSgpXG4gICAgZ3JhbW1hcnM6IHtncmFtbWFyT3ZlcnJpZGVzQnlQYXRoOiBAZ3JhbW1hcnMuZ3JhbW1hck92ZXJyaWRlc0J5UGF0aH1cbiAgICBmdWxsU2NyZWVuOiBAaXNGdWxsU2NyZWVuKClcbiAgICB3aW5kb3dEaW1lbnNpb25zOiBAd2luZG93RGltZW5zaW9uc1xuICAgIHRleHRFZGl0b3JzOiBAdGV4dEVkaXRvcnMuc2VyaWFsaXplKClcblxuICB1bmxvYWRFZGl0b3JXaW5kb3c6IC0+XG4gICAgcmV0dXJuIGlmIG5vdCBAcHJvamVjdFxuXG4gICAgQHN0b3JlV2luZG93QmFja2dyb3VuZCgpXG4gICAgQHBhY2thZ2VzLmRlYWN0aXZhdGVQYWNrYWdlcygpXG4gICAgQHNhdmVCbG9iU3RvcmVTeW5jKClcbiAgICBAdW5sb2FkZWQgPSB0cnVlXG5cbiAgc2F2ZUJsb2JTdG9yZVN5bmM6IC0+XG4gICAgaWYgQGVuYWJsZVBlcnNpc3RlbmNlXG4gICAgICBAYmxvYlN0b3JlLnNhdmUoKVxuXG4gIG9wZW5Jbml0aWFsRW1wdHlFZGl0b3JJZk5lY2Vzc2FyeTogLT5cbiAgICByZXR1cm4gdW5sZXNzIEBjb25maWcuZ2V0KCdjb3JlLm9wZW5FbXB0eUVkaXRvck9uU3RhcnQnKVxuICAgIGlmIEBnZXRMb2FkU2V0dGluZ3MoKS5pbml0aWFsUGF0aHM/Lmxlbmd0aCBpcyAwIGFuZCBAd29ya3NwYWNlLmdldFBhbmVJdGVtcygpLmxlbmd0aCBpcyAwXG4gICAgICBAd29ya3NwYWNlLm9wZW4obnVsbClcblxuICBpbnN0YWxsVW5jYXVnaHRFcnJvckhhbmRsZXI6IC0+XG4gICAgQHByZXZpb3VzV2luZG93RXJyb3JIYW5kbGVyID0gQHdpbmRvdy5vbmVycm9yXG4gICAgQHdpbmRvdy5vbmVycm9yID0gPT5cbiAgICAgIEBsYXN0VW5jYXVnaHRFcnJvciA9IEFycmF5OjpzbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgIFttZXNzYWdlLCB1cmwsIGxpbmUsIGNvbHVtbiwgb3JpZ2luYWxFcnJvcl0gPSBAbGFzdFVuY2F1Z2h0RXJyb3JcblxuICAgICAge2xpbmUsIGNvbHVtbiwgc291cmNlfSA9IG1hcFNvdXJjZVBvc2l0aW9uKHtzb3VyY2U6IHVybCwgbGluZSwgY29sdW1ufSlcblxuICAgICAgaWYgdXJsIGlzICc8ZW1iZWRkZWQ+J1xuICAgICAgICB1cmwgPSBzb3VyY2VcblxuICAgICAgZXZlbnRPYmplY3QgPSB7bWVzc2FnZSwgdXJsLCBsaW5lLCBjb2x1bW4sIG9yaWdpbmFsRXJyb3J9XG5cbiAgICAgIG9wZW5EZXZUb29scyA9IHRydWVcbiAgICAgIGV2ZW50T2JqZWN0LnByZXZlbnREZWZhdWx0ID0gLT4gb3BlbkRldlRvb2xzID0gZmFsc2VcblxuICAgICAgQGVtaXR0ZXIuZW1pdCAnd2lsbC10aHJvdy1lcnJvcicsIGV2ZW50T2JqZWN0XG5cbiAgICAgIGlmIG9wZW5EZXZUb29sc1xuICAgICAgICBAb3BlbkRldlRvb2xzKCkudGhlbiA9PiBAZXhlY3V0ZUphdmFTY3JpcHRJbkRldlRvb2xzKCdEZXZUb29sc0FQSS5zaG93UGFuZWwoXCJjb25zb2xlXCIpJylcblxuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLXRocm93LWVycm9yJywge21lc3NhZ2UsIHVybCwgbGluZSwgY29sdW1uLCBvcmlnaW5hbEVycm9yfVxuXG4gIHVuaW5zdGFsbFVuY2F1Z2h0RXJyb3JIYW5kbGVyOiAtPlxuICAgIEB3aW5kb3cub25lcnJvciA9IEBwcmV2aW91c1dpbmRvd0Vycm9ySGFuZGxlclxuXG4gIGluc3RhbGxXaW5kb3dFdmVudEhhbmRsZXI6IC0+XG4gICAgQHdpbmRvd0V2ZW50SGFuZGxlciA9IG5ldyBXaW5kb3dFdmVudEhhbmRsZXIoe2F0b21FbnZpcm9ubWVudDogdGhpcywgQGFwcGxpY2F0aW9uRGVsZWdhdGV9KVxuICAgIEB3aW5kb3dFdmVudEhhbmRsZXIuaW5pdGlhbGl6ZShAd2luZG93LCBAZG9jdW1lbnQpXG5cbiAgdW5pbnN0YWxsV2luZG93RXZlbnRIYW5kbGVyOiAtPlxuICAgIEB3aW5kb3dFdmVudEhhbmRsZXI/LnVuc3Vic2NyaWJlKClcbiAgICBAd2luZG93RXZlbnRIYW5kbGVyID0gbnVsbFxuXG4gICMjI1xuICBTZWN0aW9uOiBNZXNzYWdpbmcgdGhlIFVzZXJcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IFZpc3VhbGx5IGFuZCBhdWRpYmx5IHRyaWdnZXIgYSBiZWVwLlxuICBiZWVwOiAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLnBsYXlCZWVwU291bmQoKSBpZiBAY29uZmlnLmdldCgnY29yZS5hdWRpb0JlZXAnKVxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1iZWVwJ1xuXG4gICMgRXNzZW50aWFsOiBBIGZsZXhpYmxlIHdheSB0byBvcGVuIGEgZGlhbG9nIGFraW4gdG8gYW4gYWxlcnQgZGlhbG9nLlxuICAjXG4gICMgIyMgRXhhbXBsZXNcbiAgI1xuICAjIGBgYGNvZmZlZVxuICAjIGF0b20uY29uZmlybVxuICAjICAgbWVzc2FnZTogJ0hvdyB5b3UgZmVlbGluZz8nXG4gICMgICBkZXRhaWxlZE1lc3NhZ2U6ICdCZSBob25lc3QuJ1xuICAjICAgYnV0dG9uczpcbiAgIyAgICAgR29vZDogLT4gd2luZG93LmFsZXJ0KCdnb29kIHRvIGhlYXInKVxuICAjICAgICBCYWQ6IC0+IHdpbmRvdy5hbGVydCgnYnVtbWVyJylcbiAgIyBgYGBcbiAgI1xuICAjICogYG9wdGlvbnNgIEFuIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgbWVzc2FnZWAgVGhlIHtTdHJpbmd9IG1lc3NhZ2UgdG8gZGlzcGxheS5cbiAgIyAgICogYGRldGFpbGVkTWVzc2FnZWAgKG9wdGlvbmFsKSBUaGUge1N0cmluZ30gZGV0YWlsZWQgbWVzc2FnZSB0byBkaXNwbGF5LlxuICAjICAgKiBgYnV0dG9uc2AgKG9wdGlvbmFsKSBFaXRoZXIgYW4gYXJyYXkgb2Ygc3RyaW5ncyBvciBhbiBvYmplY3Qgd2hlcmUga2V5cyBhcmVcbiAgIyAgICAgYnV0dG9uIG5hbWVzIGFuZCB0aGUgdmFsdWVzIGFyZSBjYWxsYmFja3MgdG8gaW52b2tlIHdoZW4gY2xpY2tlZC5cbiAgI1xuICAjIFJldHVybnMgdGhlIGNob3NlbiBidXR0b24gaW5kZXgge051bWJlcn0gaWYgdGhlIGJ1dHRvbnMgb3B0aW9uIHdhcyBhbiBhcnJheS5cbiAgY29uZmlybTogKHBhcmFtcz17fSkgLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5jb25maXJtKHBhcmFtcylcblxuICAjIyNcbiAgU2VjdGlvbjogTWFuYWdpbmcgdGhlIERldiBUb29sc1xuICAjIyNcblxuICAjIEV4dGVuZGVkOiBPcGVuIHRoZSBkZXYgdG9vbHMgZm9yIHRoZSBjdXJyZW50IHdpbmRvdy5cbiAgI1xuICAjIFJldHVybnMgYSB7UHJvbWlzZX0gdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBEZXZUb29scyBoYXZlIGJlZW4gb3BlbmVkLlxuICBvcGVuRGV2VG9vbHM6IC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUub3BlbldpbmRvd0RldlRvb2xzKClcblxuICAjIEV4dGVuZGVkOiBUb2dnbGUgdGhlIHZpc2liaWxpdHkgb2YgdGhlIGRldiB0b29scyBmb3IgdGhlIGN1cnJlbnQgd2luZG93LlxuICAjXG4gICMgUmV0dXJucyBhIHtQcm9taXNlfSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIERldlRvb2xzIGhhdmUgYmVlbiBvcGVuZWQgb3JcbiAgIyBjbG9zZWQuXG4gIHRvZ2dsZURldlRvb2xzOiAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLnRvZ2dsZVdpbmRvd0RldlRvb2xzKClcblxuICAjIEV4dGVuZGVkOiBFeGVjdXRlIGNvZGUgaW4gZGV2IHRvb2xzLlxuICBleGVjdXRlSmF2YVNjcmlwdEluRGV2VG9vbHM6IChjb2RlKSAtPlxuICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLmV4ZWN1dGVKYXZhU2NyaXB0SW5XaW5kb3dEZXZUb29scyhjb2RlKVxuXG4gICMjI1xuICBTZWN0aW9uOiBQcml2YXRlXG4gICMjI1xuXG4gIGFzc2VydDogKGNvbmRpdGlvbiwgbWVzc2FnZSwgY2FsbGJhY2tPck1ldGFkYXRhKSAtPlxuICAgIHJldHVybiB0cnVlIGlmIGNvbmRpdGlvblxuXG4gICAgZXJyb3IgPSBuZXcgRXJyb3IoXCJBc3NlcnRpb24gZmFpbGVkOiAje21lc3NhZ2V9XCIpXG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UoZXJyb3IsIEBhc3NlcnQpXG5cbiAgICBpZiBjYWxsYmFja09yTWV0YWRhdGE/XG4gICAgICBpZiB0eXBlb2YgY2FsbGJhY2tPck1ldGFkYXRhIGlzICdmdW5jdGlvbidcbiAgICAgICAgY2FsbGJhY2tPck1ldGFkYXRhPyhlcnJvcilcbiAgICAgIGVsc2VcbiAgICAgICAgZXJyb3IubWV0YWRhdGEgPSBjYWxsYmFja09yTWV0YWRhdGFcblxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1mYWlsLWFzc2VydGlvbicsIGVycm9yXG4gICAgdW5sZXNzIEBpc1JlbGVhc2VkVmVyc2lvbigpXG4gICAgICB0aHJvdyBlcnJvclxuXG4gICAgZmFsc2VcblxuICBsb2FkVGhlbWVzOiAtPlxuICAgIEB0aGVtZXMubG9hZCgpXG5cbiAgIyBOb3RpZnkgdGhlIGJyb3dzZXIgcHJvamVjdCBvZiB0aGUgd2luZG93J3MgY3VycmVudCBwcm9qZWN0IHBhdGhcbiAgd2F0Y2hQcm9qZWN0UGF0aHM6IC0+XG4gICAgQGRpc3Bvc2FibGVzLmFkZCBAcHJvamVjdC5vbkRpZENoYW5nZVBhdGhzID0+XG4gICAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5zZXRSZXByZXNlbnRlZERpcmVjdG9yeVBhdGhzKEBwcm9qZWN0LmdldFBhdGhzKCkpXG5cbiAgc2V0RG9jdW1lbnRFZGl0ZWQ6IChlZGl0ZWQpIC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuc2V0V2luZG93RG9jdW1lbnRFZGl0ZWQ/KGVkaXRlZClcblxuICBzZXRSZXByZXNlbnRlZEZpbGVuYW1lOiAoZmlsZW5hbWUpIC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuc2V0V2luZG93UmVwcmVzZW50ZWRGaWxlbmFtZT8oZmlsZW5hbWUpXG5cbiAgYWRkUHJvamVjdEZvbGRlcjogLT5cbiAgICBAcGlja0ZvbGRlciAoc2VsZWN0ZWRQYXRocyA9IFtdKSA9PlxuICAgICAgQGFkZFRvUHJvamVjdChzZWxlY3RlZFBhdGhzKVxuXG4gIGFkZFRvUHJvamVjdDogKHByb2plY3RQYXRocykgLT5cbiAgICBAbG9hZFN0YXRlKEBnZXRTdGF0ZUtleShwcm9qZWN0UGF0aHMpKS50aGVuIChzdGF0ZSkgPT5cbiAgICAgIGlmIHN0YXRlIGFuZCBAcHJvamVjdC5nZXRQYXRocygpLmxlbmd0aCBpcyAwXG4gICAgICAgIEBhdHRlbXB0UmVzdG9yZVByb2plY3RTdGF0ZUZvclBhdGhzKHN0YXRlLCBwcm9qZWN0UGF0aHMpXG4gICAgICBlbHNlXG4gICAgICAgIEBwcm9qZWN0LmFkZFBhdGgoZm9sZGVyKSBmb3IgZm9sZGVyIGluIHByb2plY3RQYXRoc1xuXG4gIGF0dGVtcHRSZXN0b3JlUHJvamVjdFN0YXRlRm9yUGF0aHM6IChzdGF0ZSwgcHJvamVjdFBhdGhzLCBmaWxlc1RvT3BlbiA9IFtdKSAtPlxuICAgIGNlbnRlciA9IEB3b3Jrc3BhY2UuZ2V0Q2VudGVyKClcbiAgICB3aW5kb3dJc1VudXNlZCA9ID0+XG4gICAgICBmb3IgY29udGFpbmVyIGluIEB3b3Jrc3BhY2UuZ2V0UGFuZUNvbnRhaW5lcnMoKVxuICAgICAgICBmb3IgaXRlbSBpbiBjb250YWluZXIuZ2V0UGFuZUl0ZW1zKClcbiAgICAgICAgICBpZiBpdGVtIGluc3RhbmNlb2YgVGV4dEVkaXRvclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlIGlmIGl0ZW0uZ2V0UGF0aCgpIG9yIGl0ZW0uaXNNb2RpZmllZCgpXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlIGlmIGNvbnRhaW5lciBpcyBjZW50ZXJcbiAgICAgIHRydWVcblxuICAgIGlmIHdpbmRvd0lzVW51c2VkKClcbiAgICAgIEByZXN0b3JlU3RhdGVJbnRvVGhpc0Vudmlyb25tZW50KHN0YXRlKVxuICAgICAgUHJvbWlzZS5hbGwgKEB3b3Jrc3BhY2Uub3BlbihmaWxlKSBmb3IgZmlsZSBpbiBmaWxlc1RvT3BlbilcbiAgICBlbHNlXG4gICAgICBub3VucyA9IGlmIHByb2plY3RQYXRocy5sZW5ndGggaXMgMSB0aGVuICdmb2xkZXInIGVsc2UgJ2ZvbGRlcnMnXG4gICAgICBidG4gPSBAY29uZmlybVxuICAgICAgICBtZXNzYWdlOiAnUHJldmlvdXMgYXV0b21hdGljYWxseS1zYXZlZCBwcm9qZWN0IHN0YXRlIGRldGVjdGVkJ1xuICAgICAgICBkZXRhaWxlZE1lc3NhZ2U6IFwiVGhlcmUgaXMgcHJldmlvdXNseSBzYXZlZCBzdGF0ZSBmb3IgdGhlIHNlbGVjdGVkICN7bm91bnN9LiBcIiArXG4gICAgICAgICAgXCJXb3VsZCB5b3UgbGlrZSB0byBhZGQgdGhlICN7bm91bnN9IHRvIHRoaXMgd2luZG93LCBwZXJtYW5lbnRseSBkaXNjYXJkaW5nIHRoZSBzYXZlZCBzdGF0ZSwgXCIgK1xuICAgICAgICAgIFwib3Igb3BlbiB0aGUgI3tub3Vuc30gaW4gYSBuZXcgd2luZG93LCByZXN0b3JpbmcgdGhlIHNhdmVkIHN0YXRlP1wiXG4gICAgICAgIGJ1dHRvbnM6IFtcbiAgICAgICAgICAnT3BlbiBpbiBuZXcgd2luZG93IGFuZCByZWNvdmVyIHN0YXRlJ1xuICAgICAgICAgICdBZGQgdG8gdGhpcyB3aW5kb3cgYW5kIGRpc2NhcmQgc3RhdGUnXG4gICAgICAgIF1cbiAgICAgIGlmIGJ0biBpcyAwXG4gICAgICAgIEBvcGVuXG4gICAgICAgICAgcGF0aHNUb09wZW46IHByb2plY3RQYXRocy5jb25jYXQoZmlsZXNUb09wZW4pXG4gICAgICAgICAgbmV3V2luZG93OiB0cnVlXG4gICAgICAgICAgZGV2TW9kZTogQGluRGV2TW9kZSgpXG4gICAgICAgICAgc2FmZU1vZGU6IEBpblNhZmVNb2RlKClcbiAgICAgICAgUHJvbWlzZS5yZXNvbHZlKG51bGwpXG4gICAgICBlbHNlIGlmIGJ0biBpcyAxXG4gICAgICAgIEBwcm9qZWN0LmFkZFBhdGgoc2VsZWN0ZWRQYXRoKSBmb3Igc2VsZWN0ZWRQYXRoIGluIHByb2plY3RQYXRoc1xuICAgICAgICBQcm9taXNlLmFsbCAoQHdvcmtzcGFjZS5vcGVuKGZpbGUpIGZvciBmaWxlIGluIGZpbGVzVG9PcGVuKVxuXG4gIHJlc3RvcmVTdGF0ZUludG9UaGlzRW52aXJvbm1lbnQ6IChzdGF0ZSkgLT5cbiAgICBzdGF0ZS5mdWxsU2NyZWVuID0gQGlzRnVsbFNjcmVlbigpXG4gICAgcGFuZS5kZXN0cm95KCkgZm9yIHBhbmUgaW4gQHdvcmtzcGFjZS5nZXRQYW5lcygpXG4gICAgQGRlc2VyaWFsaXplKHN0YXRlKVxuXG4gIHNob3dTYXZlRGlhbG9nOiAoY2FsbGJhY2spIC0+XG4gICAgY2FsbGJhY2soQHNob3dTYXZlRGlhbG9nU3luYygpKVxuXG4gIHNob3dTYXZlRGlhbG9nU3luYzogKG9wdGlvbnM9e30pIC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuc2hvd1NhdmVEaWFsb2cob3B0aW9ucylcblxuICBzYXZlU3RhdGU6IChvcHRpb25zLCBzdG9yYWdlS2V5KSAtPlxuICAgIG5ldyBQcm9taXNlIChyZXNvbHZlLCByZWplY3QpID0+XG4gICAgICBpZiBAZW5hYmxlUGVyc2lzdGVuY2UgYW5kIEBwcm9qZWN0XG4gICAgICAgIHN0YXRlID0gQHNlcmlhbGl6ZShvcHRpb25zKVxuICAgICAgICBzYXZlUHJvbWlzZSA9XG4gICAgICAgICAgaWYgc3RvcmFnZUtleSA/PSBAZ2V0U3RhdGVLZXkoQHByb2plY3Q/LmdldFBhdGhzKCkpXG4gICAgICAgICAgICBAc3RhdGVTdG9yZS5zYXZlKHN0b3JhZ2VLZXksIHN0YXRlKVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLnNldFRlbXBvcmFyeVdpbmRvd1N0YXRlKHN0YXRlKVxuICAgICAgICBzYXZlUHJvbWlzZS5jYXRjaChyZWplY3QpLnRoZW4ocmVzb2x2ZSlcbiAgICAgIGVsc2VcbiAgICAgICAgcmVzb2x2ZSgpXG5cbiAgbG9hZFN0YXRlOiAoc3RhdGVLZXkpIC0+XG4gICAgaWYgQGVuYWJsZVBlcnNpc3RlbmNlXG4gICAgICBpZiBzdGF0ZUtleSA/PSBAZ2V0U3RhdGVLZXkoQGdldExvYWRTZXR0aW5ncygpLmluaXRpYWxQYXRocylcbiAgICAgICAgQHN0YXRlU3RvcmUubG9hZChzdGF0ZUtleSkudGhlbiAoc3RhdGUpID0+XG4gICAgICAgICAgaWYgc3RhdGVcbiAgICAgICAgICAgIHN0YXRlXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgIyBUT0RPOiByZW1vdmUgdGhpcyB3aGVuIGV2ZXJ5IHVzZXIgaGFzIG1pZ3JhdGVkIHRvIHRoZSBJbmRleGVkRGIgc3RhdGUgc3RvcmUuXG4gICAgICAgICAgICBAZ2V0U3RvcmFnZUZvbGRlcigpLmxvYWQoc3RhdGVLZXkpXG4gICAgICBlbHNlXG4gICAgICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLmdldFRlbXBvcmFyeVdpbmRvd1N0YXRlKClcbiAgICBlbHNlXG4gICAgICBQcm9taXNlLnJlc29sdmUobnVsbClcblxuICBkZXNlcmlhbGl6ZTogKHN0YXRlKSAtPlxuICAgIGlmIGdyYW1tYXJPdmVycmlkZXNCeVBhdGggPSBzdGF0ZS5ncmFtbWFycz8uZ3JhbW1hck92ZXJyaWRlc0J5UGF0aFxuICAgICAgQGdyYW1tYXJzLmdyYW1tYXJPdmVycmlkZXNCeVBhdGggPSBncmFtbWFyT3ZlcnJpZGVzQnlQYXRoXG5cbiAgICBAc2V0RnVsbFNjcmVlbihzdGF0ZS5mdWxsU2NyZWVuKVxuXG4gICAgQHBhY2thZ2VzLnBhY2thZ2VTdGF0ZXMgPSBzdGF0ZS5wYWNrYWdlU3RhdGVzID8ge31cblxuICAgIHN0YXJ0VGltZSA9IERhdGUubm93KClcbiAgICBAcHJvamVjdC5kZXNlcmlhbGl6ZShzdGF0ZS5wcm9qZWN0LCBAZGVzZXJpYWxpemVycykgaWYgc3RhdGUucHJvamVjdD9cbiAgICBAZGVzZXJpYWxpemVUaW1pbmdzLnByb2plY3QgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lXG5cbiAgICBAdGV4dEVkaXRvcnMuZGVzZXJpYWxpemUoc3RhdGUudGV4dEVkaXRvcnMpIGlmIHN0YXRlLnRleHRFZGl0b3JzXG5cbiAgICBzdGFydFRpbWUgPSBEYXRlLm5vdygpXG4gICAgQHdvcmtzcGFjZS5kZXNlcmlhbGl6ZShzdGF0ZS53b3Jrc3BhY2UsIEBkZXNlcmlhbGl6ZXJzKSBpZiBzdGF0ZS53b3Jrc3BhY2U/XG4gICAgQGRlc2VyaWFsaXplVGltaW5ncy53b3Jrc3BhY2UgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lXG5cbiAgZ2V0U3RhdGVLZXk6IChwYXRocykgLT5cbiAgICBpZiBwYXRocz8ubGVuZ3RoID4gMFxuICAgICAgc2hhMSA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGExJykudXBkYXRlKHBhdGhzLnNsaWNlKCkuc29ydCgpLmpvaW4oXCJcXG5cIikpLmRpZ2VzdCgnaGV4JylcbiAgICAgIFwiZWRpdG9yLSN7c2hhMX1cIlxuICAgIGVsc2VcbiAgICAgIG51bGxcblxuICBnZXRTdG9yYWdlRm9sZGVyOiAtPlxuICAgIEBzdG9yYWdlRm9sZGVyID89IG5ldyBTdG9yYWdlRm9sZGVyKEBnZXRDb25maWdEaXJQYXRoKCkpXG5cbiAgZ2V0Q29uZmlnRGlyUGF0aDogLT5cbiAgICBAY29uZmlnRGlyUGF0aCA/PSBwcm9jZXNzLmVudi5BVE9NX0hPTUVcblxuICBnZXRVc2VySW5pdFNjcmlwdFBhdGg6IC0+XG4gICAgaW5pdFNjcmlwdFBhdGggPSBmcy5yZXNvbHZlKEBnZXRDb25maWdEaXJQYXRoKCksICdpbml0JywgWydqcycsICdjb2ZmZWUnXSlcbiAgICBpbml0U2NyaXB0UGF0aCA/IHBhdGguam9pbihAZ2V0Q29uZmlnRGlyUGF0aCgpLCAnaW5pdC5jb2ZmZWUnKVxuXG4gIHJlcXVpcmVVc2VySW5pdFNjcmlwdDogLT5cbiAgICBpZiB1c2VySW5pdFNjcmlwdFBhdGggPSBAZ2V0VXNlckluaXRTY3JpcHRQYXRoKClcbiAgICAgIHRyeVxuICAgICAgICByZXF1aXJlKHVzZXJJbml0U2NyaXB0UGF0aCkgaWYgZnMuaXNGaWxlU3luYyh1c2VySW5pdFNjcmlwdFBhdGgpXG4gICAgICBjYXRjaCBlcnJvclxuICAgICAgICBAbm90aWZpY2F0aW9ucy5hZGRFcnJvciBcIkZhaWxlZCB0byBsb2FkIGAje3VzZXJJbml0U2NyaXB0UGF0aH1gXCIsXG4gICAgICAgICAgZGV0YWlsOiBlcnJvci5tZXNzYWdlXG4gICAgICAgICAgZGlzbWlzc2FibGU6IHRydWVcblxuICAjIFRPRE86IFdlIHNob3VsZCBkZXByZWNhdGUgdGhlIHVwZGF0ZSBldmVudHMgaGVyZSwgYW5kIHVzZSBgYXRvbS5hdXRvVXBkYXRlcmAgaW5zdGVhZFxuICBvblVwZGF0ZUF2YWlsYWJsZTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICd1cGRhdGUtYXZhaWxhYmxlJywgY2FsbGJhY2tcblxuICB1cGRhdGVBdmFpbGFibGU6IChkZXRhaWxzKSAtPlxuICAgIEBlbWl0dGVyLmVtaXQgJ3VwZGF0ZS1hdmFpbGFibGUnLCBkZXRhaWxzXG5cbiAgbGlzdGVuRm9yVXBkYXRlczogLT5cbiAgICAjIGxpc3RlbiBmb3IgdXBkYXRlcyBhdmFpbGFibGUgbG9jYWxseSAodGhhdCBoYXZlIGJlZW4gc3VjY2Vzc2Z1bGx5IGRvd25sb2FkZWQpXG4gICAgQGRpc3Bvc2FibGVzLmFkZChAYXV0b1VwZGF0ZXIub25EaWRDb21wbGV0ZURvd25sb2FkaW5nVXBkYXRlKEB1cGRhdGVBdmFpbGFibGUuYmluZCh0aGlzKSkpXG5cbiAgc2V0Qm9keVBsYXRmb3JtQ2xhc3M6IC0+XG4gICAgQGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZChcInBsYXRmb3JtLSN7cHJvY2Vzcy5wbGF0Zm9ybX1cIilcblxuICBzZXRBdXRvSGlkZU1lbnVCYXI6IChhdXRvSGlkZSkgLT5cbiAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5zZXRBdXRvSGlkZVdpbmRvd01lbnVCYXIoYXV0b0hpZGUpXG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuc2V0V2luZG93TWVudUJhclZpc2liaWxpdHkobm90IGF1dG9IaWRlKVxuXG4gIGRpc3BhdGNoQXBwbGljYXRpb25NZW51Q29tbWFuZDogKGNvbW1hbmQsIGFyZykgLT5cbiAgICBhY3RpdmVFbGVtZW50ID0gQGRvY3VtZW50LmFjdGl2ZUVsZW1lbnRcbiAgICAjIFVzZSB0aGUgd29ya3NwYWNlIGVsZW1lbnQgaWYgYm9keSBoYXMgZm9jdXNcbiAgICBpZiBhY3RpdmVFbGVtZW50IGlzIEBkb2N1bWVudC5ib2R5XG4gICAgICBhY3RpdmVFbGVtZW50ID0gQHdvcmtzcGFjZS5nZXRFbGVtZW50KClcbiAgICBAY29tbWFuZHMuZGlzcGF0Y2goYWN0aXZlRWxlbWVudCwgY29tbWFuZCwgYXJnKVxuXG4gIGRpc3BhdGNoQ29udGV4dE1lbnVDb21tYW5kOiAoY29tbWFuZCwgYXJncy4uLikgLT5cbiAgICBAY29tbWFuZHMuZGlzcGF0Y2goQGNvbnRleHRNZW51LmFjdGl2ZUVsZW1lbnQsIGNvbW1hbmQsIGFyZ3MpXG5cbiAgb3BlbkxvY2F0aW9uczogKGxvY2F0aW9ucykgLT5cbiAgICBuZWVkc1Byb2plY3RQYXRocyA9IEBwcm9qZWN0Py5nZXRQYXRocygpLmxlbmd0aCBpcyAwXG5cbiAgICBmb2xkZXJzVG9BZGRUb1Byb2plY3QgPSBbXVxuICAgIGZpbGVMb2NhdGlvbnNUb09wZW4gPSBbXVxuXG4gICAgcHVzaEZvbGRlclRvT3BlbiA9IChmb2xkZXIpIC0+XG4gICAgICBpZiBmb2xkZXIgbm90IGluIGZvbGRlcnNUb0FkZFRvUHJvamVjdFxuICAgICAgICBmb2xkZXJzVG9BZGRUb1Byb2plY3QucHVzaChmb2xkZXIpXG5cbiAgICBmb3Ige3BhdGhUb09wZW4sIGluaXRpYWxMaW5lLCBpbml0aWFsQ29sdW1uLCBmb3JjZUFkZFRvV2luZG93fSBpbiBsb2NhdGlvbnNcbiAgICAgIGlmIHBhdGhUb09wZW4/IGFuZCAobmVlZHNQcm9qZWN0UGF0aHMgb3IgZm9yY2VBZGRUb1dpbmRvdylcbiAgICAgICAgaWYgZnMuZXhpc3RzU3luYyhwYXRoVG9PcGVuKVxuICAgICAgICAgIHB1c2hGb2xkZXJUb09wZW4gQHByb2plY3QuZ2V0RGlyZWN0b3J5Rm9yUHJvamVjdFBhdGgocGF0aFRvT3BlbikuZ2V0UGF0aCgpXG4gICAgICAgIGVsc2UgaWYgZnMuZXhpc3RzU3luYyhwYXRoLmRpcm5hbWUocGF0aFRvT3BlbikpXG4gICAgICAgICAgcHVzaEZvbGRlclRvT3BlbiBAcHJvamVjdC5nZXREaXJlY3RvcnlGb3JQcm9qZWN0UGF0aChwYXRoLmRpcm5hbWUocGF0aFRvT3BlbikpLmdldFBhdGgoKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgcHVzaEZvbGRlclRvT3BlbiBAcHJvamVjdC5nZXREaXJlY3RvcnlGb3JQcm9qZWN0UGF0aChwYXRoVG9PcGVuKS5nZXRQYXRoKClcblxuICAgICAgdW5sZXNzIGZzLmlzRGlyZWN0b3J5U3luYyhwYXRoVG9PcGVuKVxuICAgICAgICBmaWxlTG9jYXRpb25zVG9PcGVuLnB1c2goe3BhdGhUb09wZW4sIGluaXRpYWxMaW5lLCBpbml0aWFsQ29sdW1ufSlcblxuICAgIHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUobnVsbClcbiAgICBpZiBmb2xkZXJzVG9BZGRUb1Byb2plY3QubGVuZ3RoID4gMFxuICAgICAgcHJvbWlzZSA9IEBsb2FkU3RhdGUoQGdldFN0YXRlS2V5KGZvbGRlcnNUb0FkZFRvUHJvamVjdCkpLnRoZW4gKHN0YXRlKSA9PlxuICAgICAgICBpZiBzdGF0ZSBhbmQgbmVlZHNQcm9qZWN0UGF0aHMgIyBvbmx5IGxvYWQgc3RhdGUgaWYgdGhpcyBpcyB0aGUgZmlyc3QgcGF0aCBhZGRlZCB0byB0aGUgcHJvamVjdFxuICAgICAgICAgIGZpbGVzID0gKGxvY2F0aW9uLnBhdGhUb09wZW4gZm9yIGxvY2F0aW9uIGluIGZpbGVMb2NhdGlvbnNUb09wZW4pXG4gICAgICAgICAgQGF0dGVtcHRSZXN0b3JlUHJvamVjdFN0YXRlRm9yUGF0aHMoc3RhdGUsIGZvbGRlcnNUb0FkZFRvUHJvamVjdCwgZmlsZXMpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBwcm9taXNlcyA9IFtdXG4gICAgICAgICAgQHByb2plY3QuYWRkUGF0aChmb2xkZXIpIGZvciBmb2xkZXIgaW4gZm9sZGVyc1RvQWRkVG9Qcm9qZWN0XG4gICAgICAgICAgZm9yIHtwYXRoVG9PcGVuLCBpbml0aWFsTGluZSwgaW5pdGlhbENvbHVtbn0gaW4gZmlsZUxvY2F0aW9uc1RvT3BlblxuICAgICAgICAgICAgcHJvbWlzZXMucHVzaCBAd29ya3NwYWNlPy5vcGVuKHBhdGhUb09wZW4sIHtpbml0aWFsTGluZSwgaW5pdGlhbENvbHVtbn0pXG4gICAgICAgICAgUHJvbWlzZS5hbGwocHJvbWlzZXMpXG4gICAgZWxzZVxuICAgICAgcHJvbWlzZXMgPSBbXVxuICAgICAgZm9yIHtwYXRoVG9PcGVuLCBpbml0aWFsTGluZSwgaW5pdGlhbENvbHVtbn0gaW4gZmlsZUxvY2F0aW9uc1RvT3BlblxuICAgICAgICBwcm9taXNlcy5wdXNoIEB3b3Jrc3BhY2U/Lm9wZW4ocGF0aFRvT3Blbiwge2luaXRpYWxMaW5lLCBpbml0aWFsQ29sdW1ufSlcbiAgICAgIHByb21pc2UgPSBQcm9taXNlLmFsbChwcm9taXNlcylcblxuICAgIHByb21pc2UudGhlbiAtPlxuICAgICAgaXBjUmVuZGVyZXIuc2VuZCAnd2luZG93LWNvbW1hbmQnLCAnd2luZG93OmxvY2F0aW9ucy1vcGVuZWQnXG5cbiAgcmVzb2x2ZVByb3h5OiAodXJsKSAtPlxuICAgIHJldHVybiBuZXcgUHJvbWlzZSAocmVzb2x2ZSwgcmVqZWN0KSA9PlxuICAgICAgcmVxdWVzdElkID0gQG5leHRQcm94eVJlcXVlc3RJZCsrXG4gICAgICBkaXNwb3NhYmxlID0gQGFwcGxpY2F0aW9uRGVsZWdhdGUub25EaWRSZXNvbHZlUHJveHkgKGlkLCBwcm94eSkgLT5cbiAgICAgICAgaWYgaWQgaXMgcmVxdWVzdElkXG4gICAgICAgICAgZGlzcG9zYWJsZS5kaXNwb3NlKClcbiAgICAgICAgICByZXNvbHZlKHByb3h5KVxuXG4gICAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5yZXNvbHZlUHJveHkocmVxdWVzdElkLCB1cmwpXG5cbiMgUHJlc2VydmUgdGhpcyBkZXByZWNhdGlvbiB1bnRpbCAyLjAuIFNvcnJ5LiBTaG91bGQgaGF2ZSByZW1vdmVkIFEgc29vbmVyLlxuUHJvbWlzZS5wcm90b3R5cGUuZG9uZSA9IChjYWxsYmFjaykgLT5cbiAgZGVwcmVjYXRlKFwiQXRvbSBub3cgdXNlcyBFUzYgUHJvbWlzZXMgaW5zdGVhZCBvZiBRLiBDYWxsIHByb21pc2UudGhlbiBpbnN0ZWFkIG9mIHByb21pc2UuZG9uZVwiKVxuICBAdGhlbihjYWxsYmFjaylcbiJdfQ==
