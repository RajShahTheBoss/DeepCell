(function() {
  var BufferedProcess, CSON, CompileCache, CompositeDisposable, Emitter, ModuleCache, Package, ScopedProperties, _, async, fs, path, ref,
    slice = [].slice;

  path = require('path');

  _ = require('underscore-plus');

  async = require('async');

  CSON = require('season');

  fs = require('fs-plus');

  ref = require('event-kit'), Emitter = ref.Emitter, CompositeDisposable = ref.CompositeDisposable;

  CompileCache = require('./compile-cache');

  ModuleCache = require('./module-cache');

  ScopedProperties = require('./scoped-properties');

  BufferedProcess = require('./buffered-process');

  module.exports = Package = (function() {
    Package.prototype.keymaps = null;

    Package.prototype.menus = null;

    Package.prototype.stylesheets = null;

    Package.prototype.stylesheetDisposables = null;

    Package.prototype.grammars = null;

    Package.prototype.settings = null;

    Package.prototype.mainModulePath = null;

    Package.prototype.resolvedMainModulePath = false;

    Package.prototype.mainModule = null;

    Package.prototype.mainInitialized = false;

    Package.prototype.mainActivated = false;


    /*
    Section: Construction
     */

    function Package(params) {
      var ref1, ref2, ref3;
      this.path = params.path, this.metadata = params.metadata, this.bundledPackage = params.bundledPackage, this.preloadedPackage = params.preloadedPackage, this.packageManager = params.packageManager, this.config = params.config, this.styleManager = params.styleManager, this.commandRegistry = params.commandRegistry, this.keymapManager = params.keymapManager, this.notificationManager = params.notificationManager, this.grammarRegistry = params.grammarRegistry, this.themeManager = params.themeManager, this.menuManager = params.menuManager, this.contextMenuManager = params.contextMenuManager, this.deserializerManager = params.deserializerManager, this.viewRegistry = params.viewRegistry;
      this.emitter = new Emitter;
      if (this.metadata == null) {
        this.metadata = this.packageManager.loadPackageMetadata(this.path);
      }
      if (this.bundledPackage == null) {
        this.bundledPackage = this.packageManager.isBundledPackagePath(this.path);
      }
      this.name = (ref1 = (ref2 = (ref3 = this.metadata) != null ? ref3.name : void 0) != null ? ref2 : params.name) != null ? ref1 : path.basename(this.path);
      this.reset();
    }


    /*
    Section: Event Subscription
     */

    Package.prototype.onDidDeactivate = function(callback) {
      return this.emitter.on('did-deactivate', callback);
    };


    /*
    Section: Instance Methods
     */

    Package.prototype.enable = function() {
      return this.config.removeAtKeyPath('core.disabledPackages', this.name);
    };

    Package.prototype.disable = function() {
      return this.config.pushAtKeyPath('core.disabledPackages', this.name);
    };

    Package.prototype.isTheme = function() {
      var ref1;
      return ((ref1 = this.metadata) != null ? ref1.theme : void 0) != null;
    };

    Package.prototype.measure = function(key, fn) {
      var startTime, value;
      startTime = Date.now();
      value = fn();
      this[key] = Date.now() - startTime;
      return value;
    };

    Package.prototype.getType = function() {
      return 'atom';
    };

    Package.prototype.getStyleSheetPriority = function() {
      return 0;
    };

    Package.prototype.preload = function() {
      var i, len, ref1, settings;
      this.loadKeymaps();
      this.loadMenus();
      this.registerDeserializerMethods();
      this.activateCoreStartupServices();
      this.configSchemaRegisteredOnLoad = this.registerConfigSchemaFromMetadata();
      this.requireMainModule();
      this.settingsPromise = this.loadSettings();
      this.activationDisposables = new CompositeDisposable;
      this.activateKeymaps();
      this.activateMenus();
      ref1 = this.settings;
      for (i = 0, len = ref1.length; i < len; i++) {
        settings = ref1[i];
        settings.activate();
      }
      return this.settingsActivated = true;
    };

    Package.prototype.finishLoading = function() {
      return this.measure('loadTime', (function(_this) {
        return function() {
          _this.path = path.join(_this.packageManager.resourcePath, _this.path);
          ModuleCache.add(_this.path, _this.metadata);
          _this.loadStylesheets();
          return _this.getMainModulePath();
        };
      })(this));
    };

    Package.prototype.load = function() {
      this.measure('loadTime', (function(_this) {
        return function() {
          var error;
          try {
            ModuleCache.add(_this.path, _this.metadata);
            _this.loadKeymaps();
            _this.loadMenus();
            _this.loadStylesheets();
            _this.registerDeserializerMethods();
            _this.activateCoreStartupServices();
            _this.registerTranspilerConfig();
            _this.configSchemaRegisteredOnLoad = _this.registerConfigSchemaFromMetadata();
            _this.settingsPromise = _this.loadSettings();
            if (_this.shouldRequireMainModuleOnLoad() && (_this.mainModule == null)) {
              return _this.requireMainModule();
            }
          } catch (error1) {
            error = error1;
            return _this.handleError("Failed to load the " + _this.name + " package", error);
          }
        };
      })(this));
      return this;
    };

    Package.prototype.unload = function() {
      return this.unregisterTranspilerConfig();
    };

    Package.prototype.shouldRequireMainModuleOnLoad = function() {
      return !((this.metadata.deserializers != null) || (this.metadata.viewProviders != null) || (this.metadata.configSchema != null) || this.activationShouldBeDeferred() || localStorage.getItem(this.getCanDeferMainModuleRequireStorageKey()) === 'true');
    };

    Package.prototype.reset = function() {
      this.stylesheets = [];
      this.keymaps = [];
      this.menus = [];
      this.grammars = [];
      this.settings = [];
      this.mainInitialized = false;
      return this.mainActivated = false;
    };

    Package.prototype.initializeIfNeeded = function() {
      if (this.mainInitialized) {
        return;
      }
      this.measure('initializeTime', (function(_this) {
        return function() {
          var base, error, ref1;
          try {
            if (_this.mainModule == null) {
              _this.requireMainModule();
            }
            if (typeof (base = _this.mainModule).initialize === "function") {
              base.initialize((ref1 = _this.packageManager.getPackageState(_this.name)) != null ? ref1 : {});
            }
            return _this.mainInitialized = true;
          } catch (error1) {
            error = error1;
            return _this.handleError("Failed to initialize the " + _this.name + " package", error);
          }
        };
      })(this));
    };

    Package.prototype.activate = function() {
      if (this.grammarsPromise == null) {
        this.grammarsPromise = this.loadGrammars();
      }
      if (this.activationPromise == null) {
        this.activationPromise = new Promise((function(_this) {
          return function(resolve, reject) {
            _this.resolveActivationPromise = resolve;
            return _this.measure('activateTime', function() {
              var error;
              try {
                _this.activateResources();
                if (_this.activationShouldBeDeferred()) {
                  return _this.subscribeToDeferredActivation();
                } else {
                  return _this.activateNow();
                }
              } catch (error1) {
                error = error1;
                return _this.handleError("Failed to activate the " + _this.name + " package", error);
              }
            });
          };
        })(this));
      }
      return Promise.all([this.grammarsPromise, this.settingsPromise, this.activationPromise]);
    };

    Package.prototype.activateNow = function() {
      var base, base1, error, ref1, ref2, ref3;
      try {
        if (this.mainModule == null) {
          this.requireMainModule();
        }
        this.configSchemaRegisteredOnActivate = this.registerConfigSchemaFromMainModule();
        this.registerViewProviders();
        this.activateStylesheets();
        if ((this.mainModule != null) && !this.mainActivated) {
          this.initializeIfNeeded();
          if (typeof (base = this.mainModule).activateConfig === "function") {
            base.activateConfig();
          }
          if (typeof (base1 = this.mainModule).activate === "function") {
            base1.activate((ref1 = this.packageManager.getPackageState(this.name)) != null ? ref1 : {});
          }
          this.mainActivated = true;
          this.activateServices();
        }
        if ((ref2 = this.activationCommandSubscriptions) != null) {
          ref2.dispose();
        }
        if ((ref3 = this.activationHookSubscriptions) != null) {
          ref3.dispose();
        }
      } catch (error1) {
        error = error1;
        this.handleError("Failed to activate the " + this.name + " package", error);
      }
      return typeof this.resolveActivationPromise === "function" ? this.resolveActivationPromise() : void 0;
    };

    Package.prototype.registerConfigSchemaFromMetadata = function() {
      var configSchema;
      if (configSchema = this.metadata.configSchema) {
        this.config.setSchema(this.name, {
          type: 'object',
          properties: configSchema
        });
        return true;
      } else {
        return false;
      }
    };

    Package.prototype.registerConfigSchemaFromMainModule = function() {
      if ((this.mainModule != null) && !this.configSchemaRegisteredOnLoad) {
        if ((this.mainModule.config != null) && typeof this.mainModule.config === 'object') {
          this.config.setSchema(this.name, {
            type: 'object',
            properties: this.mainModule.config
          });
          return true;
        }
      }
      return false;
    };

    Package.prototype.activateConfig = function() {
      if (this.configSchemaRegisteredOnLoad) {
        return;
      }
      this.requireMainModule();
      return this.registerConfigSchemaFromMainModule();
    };

    Package.prototype.activateStylesheets = function() {
      var context, i, len, match, priority, ref1, ref2, source, sourcePath;
      if (this.stylesheetsActivated) {
        return;
      }
      this.stylesheetDisposables = new CompositeDisposable;
      priority = this.getStyleSheetPriority();
      ref1 = this.stylesheets;
      for (i = 0, len = ref1.length; i < len; i++) {
        ref2 = ref1[i], sourcePath = ref2[0], source = ref2[1];
        if (match = path.basename(sourcePath).match(/[^.]*\.([^.]*)\./)) {
          context = match[1];
        } else if (this.metadata.theme === 'syntax') {
          context = 'atom-text-editor';
        } else {
          context = void 0;
        }
        this.stylesheetDisposables.add(this.styleManager.addStyleSheet(source, {
          sourcePath: sourcePath,
          priority: priority,
          context: context,
          skipDeprecatedSelectorsTransformation: this.bundledPackage
        }));
      }
      return this.stylesheetsActivated = true;
    };

    Package.prototype.activateResources = function() {
      var grammar, i, j, keymapIsDisabled, len, len1, ref1, ref2, ref3, settings;
      if (this.activationDisposables == null) {
        this.activationDisposables = new CompositeDisposable;
      }
      keymapIsDisabled = _.include((ref1 = this.config.get("core.packagesWithKeymapsDisabled")) != null ? ref1 : [], this.name);
      if (keymapIsDisabled) {
        this.deactivateKeymaps();
      } else if (!this.keymapActivated) {
        this.activateKeymaps();
      }
      if (!this.menusActivated) {
        this.activateMenus();
      }
      if (!this.grammarsActivated) {
        ref2 = this.grammars;
        for (i = 0, len = ref2.length; i < len; i++) {
          grammar = ref2[i];
          grammar.activate();
        }
        this.grammarsActivated = true;
      }
      if (!this.settingsActivated) {
        ref3 = this.settings;
        for (j = 0, len1 = ref3.length; j < len1; j++) {
          settings = ref3[j];
          settings.activate();
        }
        return this.settingsActivated = true;
      }
    };

    Package.prototype.activateKeymaps = function() {
      var i, keymapPath, len, map, ref1, ref2, validateSelectors;
      if (this.keymapActivated) {
        return;
      }
      this.keymapDisposables = new CompositeDisposable();
      validateSelectors = !this.preloadedPackage;
      ref1 = this.keymaps;
      for (i = 0, len = ref1.length; i < len; i++) {
        ref2 = ref1[i], keymapPath = ref2[0], map = ref2[1];
        this.keymapDisposables.add(this.keymapManager.add(keymapPath, map, 0, validateSelectors));
      }
      this.menuManager.update();
      return this.keymapActivated = true;
    };

    Package.prototype.deactivateKeymaps = function() {
      var ref1;
      if (!this.keymapActivated) {
        return;
      }
      if ((ref1 = this.keymapDisposables) != null) {
        ref1.dispose();
      }
      this.menuManager.update();
      return this.keymapActivated = false;
    };

    Package.prototype.hasKeymaps = function() {
      var i, len, map, ref1, ref2;
      ref1 = this.keymaps;
      for (i = 0, len = ref1.length; i < len; i++) {
        ref2 = ref1[i], path = ref2[0], map = ref2[1];
        if (map.length > 0) {
          return true;
        }
      }
      return false;
    };

    Package.prototype.activateMenus = function() {
      var error, i, itemsBySelector, j, len, len1, map, menuPath, ref1, ref2, ref3, ref4, validateSelectors;
      validateSelectors = !this.preloadedPackage;
      ref1 = this.menus;
      for (i = 0, len = ref1.length; i < len; i++) {
        ref2 = ref1[i], menuPath = ref2[0], map = ref2[1];
        if (map['context-menu'] != null) {
          try {
            itemsBySelector = map['context-menu'];
            this.activationDisposables.add(this.contextMenuManager.add(itemsBySelector, validateSelectors));
          } catch (error1) {
            error = error1;
            if (error.code === 'EBADSELECTOR') {
              error.message += " in " + menuPath;
              error.stack += "\n  at " + menuPath + ":1:1";
            }
            throw error;
          }
        }
      }
      ref3 = this.menus;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        ref4 = ref3[j], menuPath = ref4[0], map = ref4[1];
        if (map['menu'] != null) {
          this.activationDisposables.add(this.menuManager.add(map['menu']));
        }
      }
      return this.menusActivated = true;
    };

    Package.prototype.activateServices = function() {
      var methodName, name, ref1, ref2, servicesByVersion, version, versions;
      ref1 = this.metadata.providedServices;
      for (name in ref1) {
        versions = ref1[name].versions;
        servicesByVersion = {};
        for (version in versions) {
          methodName = versions[version];
          if (typeof this.mainModule[methodName] === 'function') {
            servicesByVersion[version] = this.mainModule[methodName]();
          }
        }
        this.activationDisposables.add(this.packageManager.serviceHub.provide(name, servicesByVersion));
      }
      ref2 = this.metadata.consumedServices;
      for (name in ref2) {
        versions = ref2[name].versions;
        for (version in versions) {
          methodName = versions[version];
          if (typeof this.mainModule[methodName] === 'function') {
            this.activationDisposables.add(this.packageManager.serviceHub.consume(name, version, this.mainModule[methodName].bind(this.mainModule)));
          }
        }
      }
    };

    Package.prototype.registerTranspilerConfig = function() {
      if (this.metadata.atomTranspilers) {
        return CompileCache.addTranspilerConfigForPath(this.path, this.name, this.metadata, this.metadata.atomTranspilers);
      }
    };

    Package.prototype.unregisterTranspilerConfig = function() {
      if (this.metadata.atomTranspilers) {
        return CompileCache.removeTranspilerConfigForPath(this.path);
      }
    };

    Package.prototype.loadKeymaps = function() {
      var keymapObject, keymapPath;
      if (this.bundledPackage && (this.packageManager.packagesCache[this.name] != null)) {
        this.keymaps = (function() {
          var ref1, results;
          ref1 = this.packageManager.packagesCache[this.name].keymaps;
          results = [];
          for (keymapPath in ref1) {
            keymapObject = ref1[keymapPath];
            results.push(["core:" + keymapPath, keymapObject]);
          }
          return results;
        }).call(this);
      } else {
        this.keymaps = this.getKeymapPaths().map(function(keymapPath) {
          var ref1;
          return [
            keymapPath, (ref1 = CSON.readFileSync(keymapPath, {
              allowDuplicateKeys: false
            })) != null ? ref1 : {}
          ];
        });
      }
    };

    Package.prototype.loadMenus = function() {
      var menuObject, menuPath;
      if (this.bundledPackage && (this.packageManager.packagesCache[this.name] != null)) {
        this.menus = (function() {
          var ref1, results;
          ref1 = this.packageManager.packagesCache[this.name].menus;
          results = [];
          for (menuPath in ref1) {
            menuObject = ref1[menuPath];
            results.push(["core:" + menuPath, menuObject]);
          }
          return results;
        }).call(this);
      } else {
        this.menus = this.getMenuPaths().map(function(menuPath) {
          var ref1;
          return [menuPath, (ref1 = CSON.readFileSync(menuPath)) != null ? ref1 : {}];
        });
      }
    };

    Package.prototype.getKeymapPaths = function() {
      var keymapsDirPath;
      keymapsDirPath = path.join(this.path, 'keymaps');
      if (this.metadata.keymaps) {
        return this.metadata.keymaps.map(function(name) {
          return fs.resolve(keymapsDirPath, name, ['json', 'cson', '']);
        });
      } else {
        return fs.listSync(keymapsDirPath, ['cson', 'json']);
      }
    };

    Package.prototype.getMenuPaths = function() {
      var menusDirPath;
      menusDirPath = path.join(this.path, 'menus');
      if (this.metadata.menus) {
        return this.metadata.menus.map(function(name) {
          return fs.resolve(menusDirPath, name, ['json', 'cson', '']);
        });
      } else {
        return fs.listSync(menusDirPath, ['cson', 'json']);
      }
    };

    Package.prototype.loadStylesheets = function() {
      return this.stylesheets = this.getStylesheetPaths().map((function(_this) {
        return function(stylesheetPath) {
          return [stylesheetPath, _this.themeManager.loadStylesheet(stylesheetPath, true)];
        };
      })(this));
    };

    Package.prototype.registerDeserializerMethods = function() {
      if (this.metadata.deserializers != null) {
        Object.keys(this.metadata.deserializers).forEach((function(_this) {
          return function(deserializerName) {
            var methodName;
            methodName = _this.metadata.deserializers[deserializerName];
            return _this.deserializerManager.add({
              name: deserializerName,
              deserialize: function(state, atomEnvironment) {
                _this.registerViewProviders();
                _this.requireMainModule();
                _this.initializeIfNeeded();
                return _this.mainModule[methodName](state, atomEnvironment);
              }
            });
          };
        })(this));
      }
    };

    Package.prototype.activateCoreStartupServices = function() {
      var directoryProviderService, methodName, ref1, ref2, servicesByVersion, version;
      if (directoryProviderService = (ref1 = this.metadata.providedServices) != null ? ref1['atom.directory-provider'] : void 0) {
        this.requireMainModule();
        servicesByVersion = {};
        ref2 = directoryProviderService.versions;
        for (version in ref2) {
          methodName = ref2[version];
          if (typeof this.mainModule[methodName] === 'function') {
            servicesByVersion[version] = this.mainModule[methodName]();
          }
        }
        return this.packageManager.serviceHub.provide('atom.directory-provider', servicesByVersion);
      }
    };

    Package.prototype.registerViewProviders = function() {
      if ((this.metadata.viewProviders != null) && !this.registeredViewProviders) {
        this.requireMainModule();
        this.metadata.viewProviders.forEach((function(_this) {
          return function(methodName) {
            return _this.viewRegistry.addViewProvider(function(model) {
              _this.initializeIfNeeded();
              return _this.mainModule[methodName](model);
            });
          };
        })(this));
        return this.registeredViewProviders = true;
      }
    };

    Package.prototype.getStylesheetsPath = function() {
      return path.join(this.path, 'styles');
    };

    Package.prototype.getStylesheetPaths = function() {
      var indexStylesheet, ref1, styleSheetPaths, stylesheetDirPath;
      if (this.bundledPackage && (((ref1 = this.packageManager.packagesCache[this.name]) != null ? ref1.styleSheetPaths : void 0) != null)) {
        styleSheetPaths = this.packageManager.packagesCache[this.name].styleSheetPaths;
        return styleSheetPaths.map((function(_this) {
          return function(styleSheetPath) {
            return path.join(_this.path, styleSheetPath);
          };
        })(this));
      } else {
        stylesheetDirPath = this.getStylesheetsPath();
        if (this.metadata.mainStyleSheet) {
          return [fs.resolve(this.path, this.metadata.mainStyleSheet)];
        } else if (this.metadata.styleSheets) {
          return this.metadata.styleSheets.map(function(name) {
            return fs.resolve(stylesheetDirPath, name, ['css', 'less', '']);
          });
        } else if (indexStylesheet = fs.resolve(this.path, 'index', ['css', 'less'])) {
          return [indexStylesheet];
        } else {
          return fs.listSync(stylesheetDirPath, ['css', 'less']);
        }
      }
    };

    Package.prototype.loadGrammarsSync = function() {
      var error, grammar, grammarPath, grammarPaths, i, len, ref1;
      if (this.grammarsLoaded) {
        return;
      }
      if (this.preloadedPackage && (this.packageManager.packagesCache[this.name] != null)) {
        grammarPaths = this.packageManager.packagesCache[this.name].grammarPaths;
      } else {
        grammarPaths = fs.listSync(path.join(this.path, 'grammars'), ['json', 'cson']);
      }
      for (i = 0, len = grammarPaths.length; i < len; i++) {
        grammarPath = grammarPaths[i];
        if (this.preloadedPackage && (this.packageManager.packagesCache[this.name] != null)) {
          grammarPath = path.resolve(this.packageManager.resourcePath, grammarPath);
        }
        try {
          grammar = this.grammarRegistry.readGrammarSync(grammarPath);
          grammar.packageName = this.name;
          grammar.bundledPackage = this.bundledPackage;
          this.grammars.push(grammar);
          grammar.activate();
        } catch (error1) {
          error = error1;
          console.warn("Failed to load grammar: " + grammarPath, (ref1 = error.stack) != null ? ref1 : error);
        }
      }
      this.grammarsLoaded = true;
      return this.grammarsActivated = true;
    };

    Package.prototype.loadGrammars = function() {
      var loadGrammar;
      if (this.grammarsLoaded) {
        return Promise.resolve();
      }
      loadGrammar = (function(_this) {
        return function(grammarPath, callback) {
          if (_this.preloadedPackage) {
            grammarPath = path.resolve(_this.packageManager.resourcePath, grammarPath);
          }
          return _this.grammarRegistry.readGrammar(grammarPath, function(error, grammar) {
            var detail, stack;
            if (error != null) {
              detail = error.message + " in " + grammarPath;
              stack = error.stack + "\n  at " + grammarPath + ":1:1";
              _this.notificationManager.addFatalError("Failed to load a " + _this.name + " package grammar", {
                stack: stack,
                detail: detail,
                packageName: _this.name,
                dismissable: true
              });
            } else {
              grammar.packageName = _this.name;
              grammar.bundledPackage = _this.bundledPackage;
              _this.grammars.push(grammar);
              if (_this.grammarsActivated) {
                grammar.activate();
              }
            }
            return callback();
          });
        };
      })(this);
      return new Promise((function(_this) {
        return function(resolve) {
          var grammarPaths, grammarsDirPath;
          if (_this.preloadedPackage && (_this.packageManager.packagesCache[_this.name] != null)) {
            grammarPaths = _this.packageManager.packagesCache[_this.name].grammarPaths;
            return async.each(grammarPaths, loadGrammar, function() {
              return resolve();
            });
          } else {
            grammarsDirPath = path.join(_this.path, 'grammars');
            return fs.exists(grammarsDirPath, function(grammarsDirExists) {
              if (!grammarsDirExists) {
                return resolve();
              }
              return fs.list(grammarsDirPath, ['json', 'cson'], function(error, grammarPaths) {
                if (grammarPaths == null) {
                  grammarPaths = [];
                }
                return async.each(grammarPaths, loadGrammar, function() {
                  return resolve();
                });
              });
            });
          }
        };
      })(this));
    };

    Package.prototype.loadSettings = function() {
      var loadSettingsFile;
      this.settings = [];
      loadSettingsFile = (function(_this) {
        return function(settingsPath, callback) {
          return ScopedProperties.load(settingsPath, _this.config, function(error, settings) {
            var detail, stack;
            if (error != null) {
              detail = error.message + " in " + settingsPath;
              stack = error.stack + "\n  at " + settingsPath + ":1:1";
              _this.notificationManager.addFatalError("Failed to load the " + _this.name + " package settings", {
                stack: stack,
                detail: detail,
                packageName: _this.name,
                dismissable: true
              });
            } else {
              _this.settings.push(settings);
              if (_this.settingsActivated) {
                settings.activate();
              }
            }
            return callback();
          });
        };
      })(this);
      return new Promise((function(_this) {
        return function(resolve) {
          var ref1, scopedProperties, settings, settingsDirPath, settingsPath;
          if (_this.preloadedPackage && (_this.packageManager.packagesCache[_this.name] != null)) {
            ref1 = _this.packageManager.packagesCache[_this.name].settings;
            for (settingsPath in ref1) {
              scopedProperties = ref1[settingsPath];
              settings = new ScopedProperties("core:" + settingsPath, scopedProperties != null ? scopedProperties : {}, _this.config);
              _this.settings.push(settings);
              if (_this.settingsActivated) {
                settings.activate();
              }
            }
            return resolve();
          } else {
            settingsDirPath = path.join(_this.path, 'settings');
            return fs.exists(settingsDirPath, function(settingsDirExists) {
              if (!settingsDirExists) {
                return resolve();
              }
              return fs.list(settingsDirPath, ['json', 'cson'], function(error, settingsPaths) {
                if (settingsPaths == null) {
                  settingsPaths = [];
                }
                return async.each(settingsPaths, loadSettingsFile, function() {
                  return resolve();
                });
              });
            });
          }
        };
      })(this));
    };

    Package.prototype.serialize = function() {
      var e, ref1;
      if (this.mainActivated) {
        try {
          return (ref1 = this.mainModule) != null ? typeof ref1.serialize === "function" ? ref1.serialize() : void 0 : void 0;
        } catch (error1) {
          e = error1;
          return console.error("Error serializing package '" + this.name + "'", e.stack);
        }
      }
    };

    Package.prototype.deactivate = function() {
      var e, ref1, ref2, ref3, ref4;
      this.activationPromise = null;
      this.resolveActivationPromise = null;
      if ((ref1 = this.activationCommandSubscriptions) != null) {
        ref1.dispose();
      }
      if ((ref2 = this.activationHookSubscriptions) != null) {
        ref2.dispose();
      }
      this.configSchemaRegisteredOnActivate = false;
      this.deactivateResources();
      this.deactivateKeymaps();
      if (this.mainActivated) {
        try {
          if ((ref3 = this.mainModule) != null) {
            if (typeof ref3.deactivate === "function") {
              ref3.deactivate();
            }
          }
          if ((ref4 = this.mainModule) != null) {
            if (typeof ref4.deactivateConfig === "function") {
              ref4.deactivateConfig();
            }
          }
          this.mainActivated = false;
          this.mainInitialized = false;
        } catch (error1) {
          e = error1;
          console.error("Error deactivating package '" + this.name + "'", e.stack);
        }
      }
      return this.emitter.emit('did-deactivate');
    };

    Package.prototype.deactivateResources = function() {
      var grammar, i, j, len, len1, ref1, ref2, ref3, ref4, ref5, settings;
      ref1 = this.grammars;
      for (i = 0, len = ref1.length; i < len; i++) {
        grammar = ref1[i];
        grammar.deactivate();
      }
      ref2 = this.settings;
      for (j = 0, len1 = ref2.length; j < len1; j++) {
        settings = ref2[j];
        settings.deactivate();
      }
      if ((ref3 = this.stylesheetDisposables) != null) {
        ref3.dispose();
      }
      if ((ref4 = this.activationDisposables) != null) {
        ref4.dispose();
      }
      if ((ref5 = this.keymapDisposables) != null) {
        ref5.dispose();
      }
      this.stylesheetsActivated = false;
      this.grammarsActivated = false;
      this.settingsActivated = false;
      return this.menusActivated = false;
    };

    Package.prototype.reloadStylesheets = function() {
      var error, ref1;
      try {
        this.loadStylesheets();
      } catch (error1) {
        error = error1;
        this.handleError("Failed to reload the " + this.name + " package stylesheets", error);
      }
      if ((ref1 = this.stylesheetDisposables) != null) {
        ref1.dispose();
      }
      this.stylesheetDisposables = new CompositeDisposable;
      this.stylesheetsActivated = false;
      return this.activateStylesheets();
    };

    Package.prototype.requireMainModule = function() {
      var mainModulePath, previousDeserializerCount, previousViewProviderCount;
      if (this.bundledPackage && (this.packageManager.packagesCache[this.name] != null)) {
        if (this.packageManager.packagesCache[this.name].main != null) {
          return this.mainModule = require(this.packageManager.packagesCache[this.name].main);
        }
      } else if (this.mainModuleRequired) {
        return this.mainModule;
      } else if (!this.isCompatible()) {
        console.warn("Failed to require the main module of '" + this.name + "' because it requires one or more incompatible native modules (" + (_.pluck(this.incompatibleModules, 'name').join(', ')) + ").\nRun `apm rebuild` in the package directory and restart Atom to resolve.");
      } else {
        mainModulePath = this.getMainModulePath();
        if (fs.isFileSync(mainModulePath)) {
          this.mainModuleRequired = true;
          previousViewProviderCount = this.viewRegistry.getViewProviderCount();
          previousDeserializerCount = this.deserializerManager.getDeserializerCount();
          this.mainModule = require(mainModulePath);
          if (this.viewRegistry.getViewProviderCount() === previousViewProviderCount && this.deserializerManager.getDeserializerCount() === previousDeserializerCount) {
            return localStorage.setItem(this.getCanDeferMainModuleRequireStorageKey(), 'true');
          }
        }
      }
    };

    Package.prototype.getMainModulePath = function() {
      var mainModulePath;
      if (this.resolvedMainModulePath) {
        return this.mainModulePath;
      }
      this.resolvedMainModulePath = true;
      if (this.bundledPackage && (this.packageManager.packagesCache[this.name] != null)) {
        if (this.packageManager.packagesCache[this.name].main) {
          return this.mainModulePath = path.resolve(this.packageManager.resourcePath, 'static', this.packageManager.packagesCache[this.name].main);
        } else {
          return this.mainModulePath = null;
        }
      } else {
        mainModulePath = this.metadata.main ? path.join(this.path, this.metadata.main) : path.join(this.path, 'index');
        return this.mainModulePath = fs.resolveExtension(mainModulePath, [""].concat(slice.call(CompileCache.supportedExtensions)));
      }
    };

    Package.prototype.activationShouldBeDeferred = function() {
      return this.hasActivationCommands() || this.hasActivationHooks();
    };

    Package.prototype.hasActivationHooks = function() {
      var ref1;
      return ((ref1 = this.getActivationHooks()) != null ? ref1.length : void 0) > 0;
    };

    Package.prototype.hasActivationCommands = function() {
      var commands, ref1, selector;
      ref1 = this.getActivationCommands();
      for (selector in ref1) {
        commands = ref1[selector];
        if (commands.length > 0) {
          return true;
        }
      }
      return false;
    };

    Package.prototype.subscribeToDeferredActivation = function() {
      this.subscribeToActivationCommands();
      return this.subscribeToActivationHooks();
    };

    Package.prototype.subscribeToActivationCommands = function() {
      var command, commands, fn1, i, len, ref1, selector;
      this.activationCommandSubscriptions = new CompositeDisposable;
      ref1 = this.getActivationCommands();
      for (selector in ref1) {
        commands = ref1[selector];
        fn1 = (function(_this) {
          return function(selector, command) {
            var error, metadataPath;
            try {
              _this.activationCommandSubscriptions.add(_this.commandRegistry.add(selector, command, function() {}));
            } catch (error1) {
              error = error1;
              if (error.code === 'EBADSELECTOR') {
                metadataPath = path.join(_this.path, 'package.json');
                error.message += " in " + metadataPath;
                error.stack += "\n  at " + metadataPath + ":1:1";
              }
              throw error;
            }
            return _this.activationCommandSubscriptions.add(_this.commandRegistry.onWillDispatch(function(event) {
              var currentTarget;
              if (event.type !== command) {
                return;
              }
              currentTarget = event.target;
              while (currentTarget) {
                if (currentTarget.webkitMatchesSelector(selector)) {
                  _this.activationCommandSubscriptions.dispose();
                  _this.activateNow();
                  break;
                }
                currentTarget = currentTarget.parentElement;
              }
            }));
          };
        })(this);
        for (i = 0, len = commands.length; i < len; i++) {
          command = commands[i];
          fn1(selector, command);
        }
      }
    };

    Package.prototype.getActivationCommands = function() {
      var base, commands, ref1, ref2, selector;
      if (this.activationCommands != null) {
        return this.activationCommands;
      }
      this.activationCommands = {};
      if (this.metadata.activationCommands != null) {
        ref1 = this.metadata.activationCommands;
        for (selector in ref1) {
          commands = ref1[selector];
          if ((base = this.activationCommands)[selector] == null) {
            base[selector] = [];
          }
          if (_.isString(commands)) {
            this.activationCommands[selector].push(commands);
          } else if (_.isArray(commands)) {
            (ref2 = this.activationCommands[selector]).push.apply(ref2, commands);
          }
        }
      }
      return this.activationCommands;
    };

    Package.prototype.subscribeToActivationHooks = function() {
      var fn1, hook, i, len, ref1;
      this.activationHookSubscriptions = new CompositeDisposable;
      ref1 = this.getActivationHooks();
      fn1 = (function(_this) {
        return function(hook) {
          if ((hook != null) && _.isString(hook) && hook.trim().length > 0) {
            return _this.activationHookSubscriptions.add(_this.packageManager.onDidTriggerActivationHook(hook, function() {
              return _this.activateNow();
            }));
          }
        };
      })(this);
      for (i = 0, len = ref1.length; i < len; i++) {
        hook = ref1[i];
        fn1(hook);
      }
    };

    Package.prototype.getActivationHooks = function() {
      var ref1;
      if ((this.metadata != null) && (this.activationHooks != null)) {
        return this.activationHooks;
      }
      this.activationHooks = [];
      if (this.metadata.activationHooks != null) {
        if (_.isArray(this.metadata.activationHooks)) {
          (ref1 = this.activationHooks).push.apply(ref1, this.metadata.activationHooks);
        } else if (_.isString(this.metadata.activationHooks)) {
          this.activationHooks.push(this.metadata.activationHooks);
        }
      }
      return this.activationHooks = _.uniq(this.activationHooks);
    };

    Package.prototype.isNativeModule = function(modulePath) {
      var error;
      try {
        return fs.listSync(path.join(modulePath, 'build', 'Release'), ['.node']).length > 0;
      } catch (error1) {
        error = error1;
        return false;
      }
    };

    Package.prototype.getNativeModuleDependencyPaths = function() {
      var i, len, nativeModulePath, nativeModulePaths, ref1, ref2, relativeNativeModuleBindingPath, relativeNativeModuleBindingPaths, traversePath;
      nativeModulePaths = [];
      if (this.metadata._atomModuleCache != null) {
        relativeNativeModuleBindingPaths = (ref1 = (ref2 = this.metadata._atomModuleCache.extensions) != null ? ref2['.node'] : void 0) != null ? ref1 : [];
        for (i = 0, len = relativeNativeModuleBindingPaths.length; i < len; i++) {
          relativeNativeModuleBindingPath = relativeNativeModuleBindingPaths[i];
          nativeModulePath = path.join(this.path, relativeNativeModuleBindingPath, '..', '..', '..');
          nativeModulePaths.push(nativeModulePath);
        }
        return nativeModulePaths;
      }
      traversePath = (function(_this) {
        return function(nodeModulesPath) {
          var j, len1, modulePath, ref3;
          try {
            ref3 = fs.listSync(nodeModulesPath);
            for (j = 0, len1 = ref3.length; j < len1; j++) {
              modulePath = ref3[j];
              if (_this.isNativeModule(modulePath)) {
                nativeModulePaths.push(modulePath);
              }
              traversePath(path.join(modulePath, 'node_modules'));
            }
          } catch (error1) {}
        };
      })(this);
      traversePath(path.join(this.path, 'node_modules'));
      return nativeModulePaths;
    };


    /*
    Section: Native Module Compatibility
     */

    Package.prototype.isCompatible = function() {
      if (this.compatible != null) {
        return this.compatible;
      }
      if (this.preloadedPackage) {
        return this.compatible = true;
      } else if (this.getMainModulePath()) {
        this.incompatibleModules = this.getIncompatibleNativeModules();
        return this.compatible = this.incompatibleModules.length === 0 && (this.getBuildFailureOutput() == null);
      } else {
        return this.compatible = true;
      }
    };

    Package.prototype.rebuild = function() {
      return new Promise((function(_this) {
        return function(resolve) {
          return _this.runRebuildProcess(function(result) {
            if (result.code === 0) {
              global.localStorage.removeItem(_this.getBuildFailureOutputStorageKey());
            } else {
              _this.compatible = false;
              global.localStorage.setItem(_this.getBuildFailureOutputStorageKey(), result.stderr);
            }
            global.localStorage.setItem(_this.getIncompatibleNativeModulesStorageKey(), '[]');
            return resolve(result);
          });
        };
      })(this));
    };

    Package.prototype.getBuildFailureOutput = function() {
      return global.localStorage.getItem(this.getBuildFailureOutputStorageKey());
    };

    Package.prototype.runRebuildProcess = function(callback) {
      var stderr, stdout;
      stderr = '';
      stdout = '';
      return new BufferedProcess({
        command: this.packageManager.getApmPath(),
        args: ['rebuild', '--no-color'],
        options: {
          cwd: this.path
        },
        stderr: function(output) {
          return stderr += output;
        },
        stdout: function(output) {
          return stdout += output;
        },
        exit: function(code) {
          return callback({
            code: code,
            stdout: stdout,
            stderr: stderr
          });
        }
      });
    };

    Package.prototype.getBuildFailureOutputStorageKey = function() {
      return "installed-packages:" + this.name + ":" + this.metadata.version + ":build-error";
    };

    Package.prototype.getIncompatibleNativeModulesStorageKey = function() {
      var electronVersion, ref1;
      electronVersion = (ref1 = process.versions['electron']) != null ? ref1 : process.versions['atom-shell'];
      return "installed-packages:" + this.name + ":" + this.metadata.version + ":electron-" + electronVersion + ":incompatible-native-modules";
    };

    Package.prototype.getCanDeferMainModuleRequireStorageKey = function() {
      return "installed-packages:" + this.name + ":" + this.metadata.version + ":can-defer-main-module-require";
    };

    Package.prototype.getIncompatibleNativeModules = function() {
      var arrayAsString, error, i, incompatibleNativeModules, len, nativeModulePath, ref1, version;
      if (!this.packageManager.devMode) {
        try {
          if (arrayAsString = global.localStorage.getItem(this.getIncompatibleNativeModulesStorageKey())) {
            return JSON.parse(arrayAsString);
          }
        } catch (error1) {}
      }
      incompatibleNativeModules = [];
      ref1 = this.getNativeModuleDependencyPaths();
      for (i = 0, len = ref1.length; i < len; i++) {
        nativeModulePath = ref1[i];
        try {
          require(nativeModulePath);
        } catch (error1) {
          error = error1;
          try {
            version = require(nativeModulePath + "/package.json").version;
          } catch (error1) {}
          incompatibleNativeModules.push({
            path: nativeModulePath,
            name: path.basename(nativeModulePath),
            version: version,
            error: error.message
          });
        }
      }
      global.localStorage.setItem(this.getIncompatibleNativeModulesStorageKey(), JSON.stringify(incompatibleNativeModules));
      return incompatibleNativeModules;
    };

    Package.prototype.handleError = function(message, error) {
      var detail, location, ref1, stack;
      if (atom.inSpecMode()) {
        throw error;
      }
      if (error.filename && error.location && (error instanceof SyntaxError)) {
        location = error.filename + ":" + (error.location.first_line + 1) + ":" + (error.location.first_column + 1);
        detail = error.message + " in " + location;
        stack = "SyntaxError: " + error.message + "\n  at " + location;
      } else if (error.less && error.filename && (error.column != null) && (error.line != null)) {
        location = error.filename + ":" + error.line + ":" + error.column;
        detail = error.message + " in " + location;
        stack = "LessError: " + error.message + "\n  at " + location;
      } else {
        detail = error.message;
        stack = (ref1 = error.stack) != null ? ref1 : error;
      }
      return this.notificationManager.addFatalError(message, {
        stack: stack,
        detail: detail,
        packageName: this.name,
        dismissable: true
      });
    };

    return Package;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3BhY2thZ2UuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSxrSUFBQTtJQUFBOztFQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFFUCxDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLEtBQUEsR0FBUSxPQUFBLENBQVEsT0FBUjs7RUFDUixJQUFBLEdBQU8sT0FBQSxDQUFRLFFBQVI7O0VBQ1AsRUFBQSxHQUFLLE9BQUEsQ0FBUSxTQUFSOztFQUNMLE1BQWlDLE9BQUEsQ0FBUSxXQUFSLENBQWpDLEVBQUMscUJBQUQsRUFBVTs7RUFFVixZQUFBLEdBQWUsT0FBQSxDQUFRLGlCQUFSOztFQUNmLFdBQUEsR0FBYyxPQUFBLENBQVEsZ0JBQVI7O0VBQ2QsZ0JBQUEsR0FBbUIsT0FBQSxDQUFRLHFCQUFSOztFQUNuQixlQUFBLEdBQWtCLE9BQUEsQ0FBUSxvQkFBUjs7RUFJbEIsTUFBTSxDQUFDLE9BQVAsR0FDTTtzQkFDSixPQUFBLEdBQVM7O3NCQUNULEtBQUEsR0FBTzs7c0JBQ1AsV0FBQSxHQUFhOztzQkFDYixxQkFBQSxHQUF1Qjs7c0JBQ3ZCLFFBQUEsR0FBVTs7c0JBQ1YsUUFBQSxHQUFVOztzQkFDVixjQUFBLEdBQWdCOztzQkFDaEIsc0JBQUEsR0FBd0I7O3NCQUN4QixVQUFBLEdBQVk7O3NCQUNaLGVBQUEsR0FBaUI7O3NCQUNqQixhQUFBLEdBQWU7OztBQUVmOzs7O0lBSWEsaUJBQUMsTUFBRDtBQUNYLFVBQUE7TUFDRSxJQUFDLENBQUEsY0FBQSxJQURILEVBQ1MsSUFBQyxDQUFBLGtCQUFBLFFBRFYsRUFDb0IsSUFBQyxDQUFBLHdCQUFBLGNBRHJCLEVBQ3FDLElBQUMsQ0FBQSwwQkFBQSxnQkFEdEMsRUFDd0QsSUFBQyxDQUFBLHdCQUFBLGNBRHpELEVBQ3lFLElBQUMsQ0FB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cnNjb3JlLXBsdXMnXG5hc3luYyA9IHJlcXVpcmUgJ2FzeW5jJ1xuQ1NPTiA9IHJlcXVpcmUgJ3NlYXNvbidcbmZzID0gcmVxdWlyZSAnZnMtcGx1cydcbntFbWl0dGVyLCBDb21wb3NpdGVEaXNwb3NhYmxlfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcblxuQ29tcGlsZUNhY2hlID0gcmVxdWlyZSAnLi9jb21waWxlLWNhY2hlJ1xuTW9kdWxlQ2FjaGUgPSByZXF1aXJlICcuL21vZHVsZS1jYWNoZSdcblNjb3BlZFByb3BlcnRpZXMgPSByZXF1aXJlICcuL3Njb3BlZC1wcm9wZXJ0aWVzJ1xuQnVmZmVyZWRQcm9jZXNzID0gcmVxdWlyZSAnLi9idWZmZXJlZC1wcm9jZXNzJ1xuXG4jIEV4dGVuZGVkOiBMb2FkcyBhbmQgYWN0aXZhdGVzIGEgcGFja2FnZSdzIG1haW4gbW9kdWxlIGFuZCByZXNvdXJjZXMgc3VjaCBhc1xuIyBzdHlsZXNoZWV0cywga2V5bWFwcywgZ3JhbW1hciwgZWRpdG9yIHByb3BlcnRpZXMsIGFuZCBtZW51cy5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIFBhY2thZ2VcbiAga2V5bWFwczogbnVsbFxuICBtZW51czogbnVsbFxuICBzdHlsZXNoZWV0czogbnVsbFxuICBzdHlsZXNoZWV0RGlzcG9zYWJsZXM6IG51bGxcbiAgZ3JhbW1hcnM6IG51bGxcbiAgc2V0dGluZ3M6IG51bGxcbiAgbWFpbk1vZHVsZVBhdGg6IG51bGxcbiAgcmVzb2x2ZWRNYWluTW9kdWxlUGF0aDogZmFsc2VcbiAgbWFpbk1vZHVsZTogbnVsbFxuICBtYWluSW5pdGlhbGl6ZWQ6IGZhbHNlXG4gIG1haW5BY3RpdmF0ZWQ6IGZhbHNlXG5cbiAgIyMjXG4gIFNlY3Rpb246IENvbnN0cnVjdGlvblxuICAjIyNcblxuICBjb25zdHJ1Y3RvcjogKHBhcmFtcykgLT5cbiAgICB7XG4gICAgICBAcGF0aCwgQG1ldGFkYXRhLCBAYnVuZGxlZFBhY2thZ2UsIEBwcmVsb2FkZWRQYWNrYWdlLCBAcGFja2FnZU1hbmFnZXIsIEBjb25maWcsIEBzdHlsZU1hbmFnZXIsIEBjb21tYW5kUmVnaXN0cnksXG4gICAgICBAa2V5bWFwTWFuYWdlciwgQG5vdGlmaWNhdGlvbk1hbmFnZXIsIEBncmFtbWFyUmVnaXN0cnksIEB0aGVtZU1hbmFnZXIsXG4gICAgICBAbWVudU1hbmFnZXIsIEBjb250ZXh0TWVudU1hbmFnZXIsIEBkZXNlcmlhbGl6ZXJNYW5hZ2VyLCBAdmlld1JlZ2lzdHJ5XG4gICAgfSA9IHBhcmFtc1xuXG4gICAgQGVtaXR0ZXIgPSBuZXcgRW1pdHRlclxuICAgIEBtZXRhZGF0YSA/PSBAcGFja2FnZU1hbmFnZXIubG9hZFBhY2thZ2VNZXRhZGF0YShAcGF0aClcbiAgICBAYnVuZGxlZFBhY2thZ2UgPz0gQHBhY2thZ2VNYW5hZ2VyLmlzQnVuZGxlZFBhY2thZ2VQYXRoKEBwYXRoKVxuICAgIEBuYW1lID0gQG1ldGFkYXRhPy5uYW1lID8gcGFyYW1zLm5hbWUgPyBwYXRoLmJhc2VuYW1lKEBwYXRoKVxuICAgIEByZXNldCgpXG5cbiAgIyMjXG4gIFNlY3Rpb246IEV2ZW50IFN1YnNjcmlwdGlvblxuICAjIyNcblxuICAjIEVzc2VudGlhbDogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIGFsbCBwYWNrYWdlcyBoYXZlIGJlZW4gYWN0aXZhdGVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkRGVhY3RpdmF0ZTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtZGVhY3RpdmF0ZScsIGNhbGxiYWNrXG5cbiAgIyMjXG4gIFNlY3Rpb246IEluc3RhbmNlIE1ldGhvZHNcbiAgIyMjXG5cbiAgZW5hYmxlOiAtPlxuICAgIEBjb25maWcucmVtb3ZlQXRLZXlQYXRoKCdjb3JlLmRpc2FibGVkUGFja2FnZXMnLCBAbmFtZSlcblxuICBkaXNhYmxlOiAtPlxuICAgIEBjb25maWcucHVzaEF0S2V5UGF0aCgnY29yZS5kaXNhYmxlZFBhY2thZ2VzJywgQG5hbWUpXG5cbiAgaXNUaGVtZTogLT5cbiAgICBAbWV0YWRhdGE/LnRoZW1lP1xuXG4gIG1lYXN1cmU6IChrZXksIGZuKSAtPlxuICAgIHN0YXJ0VGltZSA9IERhdGUubm93KClcbiAgICB2YWx1ZSA9IGZuKClcbiAgICBAW2tleV0gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lXG4gICAgdmFsdWVcblxuICBnZXRUeXBlOiAtPiAnYXRvbSdcblxuICBnZXRTdHlsZVNoZWV0UHJpb3JpdHk6IC0+IDBcblxuICBwcmVsb2FkOiAtPlxuICAgIEBsb2FkS2V5bWFwcygpXG4gICAgQGxvYWRNZW51cygpXG4gICAgQHJlZ2lzdGVyRGVzZXJpYWxpemVyTWV0aG9kcygpXG4gICAgQGFjdGl2YXRlQ29yZVN0YXJ0dXBTZXJ2aWNlcygpXG4gICAgQGNvbmZpZ1NjaGVtYVJlZ2lzdGVyZWRPbkxvYWQgPSBAcmVnaXN0ZXJDb25maWdTY2hlbWFGcm9tTWV0YWRhdGEoKVxuICAgIEByZXF1aXJlTWFpbk1vZHVsZSgpXG4gICAgQHNldHRpbmdzUHJvbWlzZSA9IEBsb2FkU2V0dGluZ3MoKVxuXG4gICAgQGFjdGl2YXRpb25EaXNwb3NhYmxlcyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlXG4gICAgQGFjdGl2YXRlS2V5bWFwcygpXG4gICAgQGFjdGl2YXRlTWVudXMoKVxuICAgIHNldHRpbmdzLmFjdGl2YXRlKCkgZm9yIHNldHRpbmdzIGluIEBzZXR0aW5nc1xuICAgIEBzZXR0aW5nc0FjdGl2YXRlZCA9IHRydWVcblxuICBmaW5pc2hMb2FkaW5nOiAtPlxuICAgIEBtZWFzdXJlICdsb2FkVGltZScsID0+XG4gICAgICBAcGF0aCA9IHBhdGguam9pbihAcGFja2FnZU1hbmFnZXIucmVzb3VyY2VQYXRoLCBAcGF0aClcbiAgICAgIE1vZHVsZUNhY2hlLmFkZChAcGF0aCwgQG1ldGFkYXRhKVxuXG4gICAgICBAbG9hZFN0eWxlc2hlZXRzKClcbiAgICAgICMgVW5mb3J0dW5hdGVseSBzb21lIHBhY2thZ2VzIGFyZSBhY2Nlc3NpbmcgYEBtYWluTW9kdWxlUGF0aGAsIHNvIHdlIG5lZWRcbiAgICAgICMgdG8gY29tcHV0ZSB0aGF0IHZhcmlhYmxlIGVhZ2VybHkgYWxzbyBmb3IgcHJlbG9hZGVkIHBhY2thZ2VzLlxuICAgICAgQGdldE1haW5Nb2R1bGVQYXRoKClcblxuICBsb2FkOiAtPlxuICAgIEBtZWFzdXJlICdsb2FkVGltZScsID0+XG4gICAgICB0cnlcbiAgICAgICAgTW9kdWxlQ2FjaGUuYWRkKEBwYXRoLCBAbWV0YWRhdGEpXG5cbiAgICAgICAgQGxvYWRLZXltYXBzKClcbiAgICAgICAgQGxvYWRNZW51cygpXG4gICAgICAgIEBsb2FkU3R5bGVzaGVldHMoKVxuICAgICAgICBAcmVnaXN0ZXJEZXNlcmlhbGl6ZXJNZXRob2RzKClcbiAgICAgICAgQGFjdGl2YXRlQ29yZVN0YXJ0dXBTZXJ2aWNlcygpXG4gICAgICAgIEByZWdpc3RlclRyYW5zcGlsZXJDb25maWcoKVxuICAgICAgICBAY29uZmlnU2NoZW1hUmVnaXN0ZXJlZE9uTG9hZCA9IEByZWdpc3RlckNvbmZpZ1NjaGVtYUZyb21NZXRhZGF0YSgpXG4gICAgICAgIEBzZXR0aW5nc1Byb21pc2UgPSBAbG9hZFNldHRpbmdzKClcbiAgICAgICAgaWYgQHNob3VsZFJlcXVpcmVNYWluTW9kdWxlT25Mb2FkKCkgYW5kIG5vdCBAbWFpbk1vZHVsZT9cbiAgICAgICAgICBAcmVxdWlyZU1haW5Nb2R1bGUoKVxuICAgICAgY2F0Y2ggZXJyb3JcbiAgICAgICAgQGhhbmRsZUVycm9yKFwiRmFpbGVkIHRvIGxvYWQgdGhlICN7QG5hbWV9IHBhY2thZ2VcIiwgZXJyb3IpXG4gICAgdGhpc1xuXG4gIHVubG9hZDogLT5cbiAgICBAdW5yZWdpc3RlclRyYW5zcGlsZXJDb25maWcoKVxuXG4gIHNob3VsZFJlcXVpcmVNYWluTW9kdWxlT25Mb2FkOiAtPlxuICAgIG5vdCAoXG4gICAgICBAbWV0YWRhdGEuZGVzZXJpYWxpemVycz8gb3JcbiAgICAgIEBtZXRhZGF0YS52aWV3UHJvdmlkZXJzPyBvclxuICAgICAgQG1ldGFkYXRhLmNvbmZpZ1NjaGVtYT8gb3JcbiAgICAgIEBhY3RpdmF0aW9uU2hvdWxkQmVEZWZlcnJlZCgpIG9yXG4gICAgICBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShAZ2V0Q2FuRGVmZXJNYWluTW9kdWxlUmVxdWlyZVN0b3JhZ2VLZXkoKSkgaXMgJ3RydWUnXG4gICAgKVxuXG4gIHJlc2V0OiAtPlxuICAgIEBzdHlsZXNoZWV0cyA9IFtdXG4gICAgQGtleW1hcHMgPSBbXVxuICAgIEBtZW51cyA9IFtdXG4gICAgQGdyYW1tYXJzID0gW11cbiAgICBAc2V0dGluZ3MgPSBbXVxuICAgIEBtYWluSW5pdGlhbGl6ZWQgPSBmYWxzZVxuICAgIEBtYWluQWN0aXZhdGVkID0gZmFsc2VcblxuICBpbml0aWFsaXplSWZOZWVkZWQ6IC0+XG4gICAgcmV0dXJuIGlmIEBtYWluSW5pdGlhbGl6ZWRcbiAgICBAbWVhc3VyZSAnaW5pdGlhbGl6ZVRpbWUnLCA9PlxuICAgICAgdHJ5XG4gICAgICAgICMgVGhlIG1haW4gbW9kdWxlJ3MgYGluaXRpYWxpemUoKWAgbWV0aG9kIGlzIGd1YXJhbnRlZWQgdG8gYmUgY2FsbGVkXG4gICAgICAgICMgYmVmb3JlIGl0cyBgYWN0aXZhdGUoKWAuIFRoaXMgZ2l2ZXMgeW91IGEgY2hhbmNlIHRvIGhhbmRsZSB0aGVcbiAgICAgICAgIyBzZXJpYWxpemVkIHBhY2thZ2Ugc3RhdGUgYmVmb3JlIHRoZSBwYWNrYWdlJ3MgZGVyc2VyaWFsaXplcnMgYW5kIHZpZXdcbiAgICAgICAgIyBwcm92aWRlcnMgYXJlIHVzZWQuXG4gICAgICAgIEByZXF1aXJlTWFpbk1vZHVsZSgpIHVubGVzcyBAbWFpbk1vZHVsZT9cbiAgICAgICAgQG1haW5Nb2R1bGUuaW5pdGlhbGl6ZT8oQHBhY2thZ2VNYW5hZ2VyLmdldFBhY2thZ2VTdGF0ZShAbmFtZSkgPyB7fSlcbiAgICAgICAgQG1haW5Jbml0aWFsaXplZCA9IHRydWVcbiAgICAgIGNhdGNoIGVycm9yXG4gICAgICAgIEBoYW5kbGVFcnJvcihcIkZhaWxlZCB0byBpbml0aWFsaXplIHRoZSAje0BuYW1lfSBwYWNrYWdlXCIsIGVycm9yKVxuICAgIHJldHVyblxuXG4gIGFjdGl2YXRlOiAtPlxuICAgIEBncmFtbWFyc1Byb21pc2UgPz0gQGxvYWRHcmFtbWFycygpXG4gICAgQGFjdGl2YXRpb25Qcm9taXNlID89XG4gICAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSwgcmVqZWN0KSA9PlxuICAgICAgICBAcmVzb2x2ZUFjdGl2YXRpb25Qcm9taXNlID0gcmVzb2x2ZVxuICAgICAgICBAbWVhc3VyZSAnYWN0aXZhdGVUaW1lJywgPT5cbiAgICAgICAgICB0cnlcbiAgICAgICAgICAgIEBhY3RpdmF0ZVJlc291cmNlcygpXG4gICAgICAgICAgICBpZiBAYWN0aXZhdGlvblNob3VsZEJlRGVmZXJyZWQoKVxuICAgICAgICAgICAgICBAc3Vic2NyaWJlVG9EZWZlcnJlZEFjdGl2YXRpb24oKVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBAYWN0aXZhdGVOb3coKVxuICAgICAgICAgIGNhdGNoIGVycm9yXG4gICAgICAgICAgICBAaGFuZGxlRXJyb3IoXCJGYWlsZWQgdG8gYWN0aXZhdGUgdGhlICN7QG5hbWV9IHBhY2thZ2VcIiwgZXJyb3IpXG5cbiAgICBQcm9taXNlLmFsbChbQGdyYW1tYXJzUHJvbWlzZSwgQHNldHRpbmdzUHJvbWlzZSwgQGFjdGl2YXRpb25Qcm9taXNlXSlcblxuICBhY3RpdmF0ZU5vdzogLT5cbiAgICB0cnlcbiAgICAgIEByZXF1aXJlTWFpbk1vZHVsZSgpIHVubGVzcyBAbWFpbk1vZHVsZT9cbiAgICAgIEBjb25maWdTY2hlbWFSZWdpc3RlcmVkT25BY3RpdmF0ZSA9IEByZWdpc3RlckNvbmZpZ1NjaGVtYUZyb21NYWluTW9kdWxlKClcbiAgICAgIEByZWdpc3RlclZpZXdQcm92aWRlcnMoKVxuICAgICAgQGFjdGl2YXRlU3R5bGVzaGVldHMoKVxuICAgICAgaWYgQG1haW5Nb2R1bGU/IGFuZCBub3QgQG1haW5BY3RpdmF0ZWRcbiAgICAgICAgQGluaXRpYWxpemVJZk5lZWRlZCgpXG4gICAgICAgIEBtYWluTW9kdWxlLmFjdGl2YXRlQ29uZmlnPygpXG4gICAgICAgIEBtYWluTW9kdWxlLmFjdGl2YXRlPyhAcGFja2FnZU1hbmFnZXIuZ2V0UGFja2FnZVN0YXRlKEBuYW1lKSA/IHt9KVxuICAgICAgICBAbWFpbkFjdGl2YXRlZCA9IHRydWVcbiAgICAgICAgQGFjdGl2YXRlU2VydmljZXMoKVxuICAgICAgQGFjdGl2YXRpb25Db21tYW5kU3Vic2NyaXB0aW9ucz8uZGlzcG9zZSgpXG4gICAgICBAYWN0aXZhdGlvbkhvb2tTdWJzY3JpcHRpb25zPy5kaXNwb3NlKClcbiAgICBjYXRjaCBlcnJvclxuICAgICAgQGhhbmRsZUVycm9yKFwiRmFpbGVkIHRvIGFjdGl2YXRlIHRoZSAje0BuYW1lfSBwYWNrYWdlXCIsIGVycm9yKVxuXG4gICAgQHJlc29sdmVBY3RpdmF0aW9uUHJvbWlzZT8oKVxuXG4gIHJlZ2lzdGVyQ29uZmlnU2NoZW1hRnJvbU1ldGFkYXRhOiAtPlxuICAgIGlmIGNvbmZpZ1NjaGVtYSA9IEBtZXRhZGF0YS5jb25maWdTY2hlbWFcbiAgICAgIEBjb25maWcuc2V0U2NoZW1hIEBuYW1lLCB7dHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IGNvbmZpZ1NjaGVtYX1cbiAgICAgIHRydWVcbiAgICBlbHNlXG4gICAgICBmYWxzZVxuXG4gIHJlZ2lzdGVyQ29uZmlnU2NoZW1hRnJvbU1haW5Nb2R1bGU6IC0+XG4gICAgaWYgQG1haW5Nb2R1bGU/IGFuZCBub3QgQGNvbmZpZ1NjaGVtYVJlZ2lzdGVyZWRPbkxvYWRcbiAgICAgIGlmIEBtYWluTW9kdWxlLmNvbmZpZz8gYW5kIHR5cGVvZiBAbWFpbk1vZHVsZS5jb25maWcgaXMgJ29iamVjdCdcbiAgICAgICAgQGNvbmZpZy5zZXRTY2hlbWEgQG5hbWUsIHt0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczogQG1haW5Nb2R1bGUuY29uZmlnfVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIGZhbHNlXG5cbiAgIyBUT0RPOiBSZW1vdmUuIFNldHRpbmdzIHZpZXcgY2FsbHMgdGhpcyBtZXRob2QgY3VycmVudGx5LlxuICBhY3RpdmF0ZUNvbmZpZzogLT5cbiAgICByZXR1cm4gaWYgQGNvbmZpZ1NjaGVtYVJlZ2lzdGVyZWRPbkxvYWRcbiAgICBAcmVxdWlyZU1haW5Nb2R1bGUoKVxuICAgIEByZWdpc3RlckNvbmZpZ1NjaGVtYUZyb21NYWluTW9kdWxlKClcblxuICBhY3RpdmF0ZVN0eWxlc2hlZXRzOiAtPlxuICAgIHJldHVybiBpZiBAc3R5bGVzaGVldHNBY3RpdmF0ZWRcblxuICAgIEBzdHlsZXNoZWV0RGlzcG9zYWJsZXMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZVxuXG4gICAgcHJpb3JpdHkgPSBAZ2V0U3R5bGVTaGVldFByaW9yaXR5KClcbiAgICBmb3IgW3NvdXJjZVBhdGgsIHNvdXJjZV0gaW4gQHN0eWxlc2hlZXRzXG4gICAgICBpZiBtYXRjaCA9IHBhdGguYmFzZW5hbWUoc291cmNlUGF0aCkubWF0Y2goL1teLl0qXFwuKFteLl0qKVxcLi8pXG4gICAgICAgIGNvbnRleHQgPSBtYXRjaFsxXVxuICAgICAgZWxzZSBpZiBAbWV0YWRhdGEudGhlbWUgaXMgJ3N5bnRheCdcbiAgICAgICAgY29udGV4dCA9ICdhdG9tLXRleHQtZWRpdG9yJ1xuICAgICAgZWxzZVxuICAgICAgICBjb250ZXh0ID0gdW5kZWZpbmVkXG5cbiAgICAgIEBzdHlsZXNoZWV0RGlzcG9zYWJsZXMuYWRkKFxuICAgICAgICBAc3R5bGVNYW5hZ2VyLmFkZFN0eWxlU2hlZXQoXG4gICAgICAgICAgc291cmNlLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNvdXJjZVBhdGgsXG4gICAgICAgICAgICBwcmlvcml0eSxcbiAgICAgICAgICAgIGNvbnRleHQsXG4gICAgICAgICAgICBza2lwRGVwcmVjYXRlZFNlbGVjdG9yc1RyYW5zZm9ybWF0aW9uOiBAYnVuZGxlZFBhY2thZ2VcbiAgICAgICAgICB9XG4gICAgICAgIClcbiAgICAgIClcbiAgICBAc3R5bGVzaGVldHNBY3RpdmF0ZWQgPSB0cnVlXG5cbiAgYWN0aXZhdGVSZXNvdXJjZXM6IC0+XG4gICAgQGFjdGl2YXRpb25EaXNwb3NhYmxlcyA/PSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZVxuXG4gICAga2V5bWFwSXNEaXNhYmxlZCA9IF8uaW5jbHVkZShAY29uZmlnLmdldChcImNvcmUucGFja2FnZXNXaXRoS2V5bWFwc0Rpc2FibGVkXCIpID8gW10sIEBuYW1lKVxuICAgIGlmIGtleW1hcElzRGlzYWJsZWRcbiAgICAgIEBkZWFjdGl2YXRlS2V5bWFwcygpXG4gICAgZWxzZSB1bmxlc3MgQGtleW1hcEFjdGl2YXRlZFxuICAgICAgQGFjdGl2YXRlS2V5bWFwcygpXG5cbiAgICB1bmxlc3MgQG1lbnVzQWN0aXZhdGVkXG4gICAgICBAYWN0aXZhdGVNZW51cygpXG5cbiAgICB1bmxlc3MgQGdyYW1tYXJzQWN0aXZhdGVkXG4gICAgICBncmFtbWFyLmFjdGl2YXRlKCkgZm9yIGdyYW1tYXIgaW4gQGdyYW1tYXJzXG4gICAgICBAZ3JhbW1hcnNBY3RpdmF0ZWQgPSB0cnVlXG5cbiAgICB1bmxlc3MgQHNldHRpbmdzQWN0aXZhdGVkXG4gICAgICBzZXR0aW5ncy5hY3RpdmF0ZSgpIGZvciBzZXR0aW5ncyBpbiBAc2V0dGluZ3NcbiAgICAgIEBzZXR0aW5nc0FjdGl2YXRlZCA9IHRydWVcblxuICBhY3RpdmF0ZUtleW1hcHM6IC0+XG4gICAgcmV0dXJuIGlmIEBrZXltYXBBY3RpdmF0ZWRcblxuICAgIEBrZXltYXBEaXNwb3NhYmxlcyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKClcblxuICAgIHZhbGlkYXRlU2VsZWN0b3JzID0gbm90IEBwcmVsb2FkZWRQYWNrYWdlXG4gICAgQGtleW1hcERpc3Bvc2FibGVzLmFkZChAa2V5bWFwTWFuYWdlci5hZGQoa2V5bWFwUGF0aCwgbWFwLCAwLCB2YWxpZGF0ZVNlbGVjdG9ycykpIGZvciBba2V5bWFwUGF0aCwgbWFwXSBpbiBAa2V5bWFwc1xuICAgIEBtZW51TWFuYWdlci51cGRhdGUoKVxuXG4gICAgQGtleW1hcEFjdGl2YXRlZCA9IHRydWVcblxuICBkZWFjdGl2YXRlS2V5bWFwczogLT5cbiAgICByZXR1cm4gaWYgbm90IEBrZXltYXBBY3RpdmF0ZWRcblxuICAgIEBrZXltYXBEaXNwb3NhYmxlcz8uZGlzcG9zZSgpXG4gICAgQG1lbnVNYW5hZ2VyLnVwZGF0ZSgpXG5cbiAgICBAa2V5bWFwQWN0aXZhdGVkID0gZmFsc2VcblxuICBoYXNLZXltYXBzOiAtPlxuICAgIGZvciBbcGF0aCwgbWFwXSBpbiBAa2V5bWFwc1xuICAgICAgaWYgbWFwLmxlbmd0aCA+IDBcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICBmYWxzZVxuXG4gIGFjdGl2YXRlTWVudXM6IC0+XG4gICAgdmFsaWRhdGVTZWxlY3RvcnMgPSBub3QgQHByZWxvYWRlZFBhY2thZ2VcbiAgICBmb3IgW21lbnVQYXRoLCBtYXBdIGluIEBtZW51cyB3aGVuIG1hcFsnY29udGV4dC1tZW51J10/XG4gICAgICB0cnlcbiAgICAgICAgaXRlbXNCeVNlbGVjdG9yID0gbWFwWydjb250ZXh0LW1lbnUnXVxuICAgICAgICBAYWN0aXZhdGlvbkRpc3Bvc2FibGVzLmFkZChAY29udGV4dE1lbnVNYW5hZ2VyLmFkZChpdGVtc0J5U2VsZWN0b3IsIHZhbGlkYXRlU2VsZWN0b3JzKSlcbiAgICAgIGNhdGNoIGVycm9yXG4gICAgICAgIGlmIGVycm9yLmNvZGUgaXMgJ0VCQURTRUxFQ1RPUidcbiAgICAgICAgICBlcnJvci5tZXNzYWdlICs9IFwiIGluICN7bWVudVBhdGh9XCJcbiAgICAgICAgICBlcnJvci5zdGFjayArPSBcIlxcbiAgYXQgI3ttZW51UGF0aH06MToxXCJcbiAgICAgICAgdGhyb3cgZXJyb3JcblxuICAgIGZvciBbbWVudVBhdGgsIG1hcF0gaW4gQG1lbnVzIHdoZW4gbWFwWydtZW51J10/XG4gICAgICBAYWN0aXZhdGlvbkRpc3Bvc2FibGVzLmFkZChAbWVudU1hbmFnZXIuYWRkKG1hcFsnbWVudSddKSlcblxuICAgIEBtZW51c0FjdGl2YXRlZCA9IHRydWVcblxuICBhY3RpdmF0ZVNlcnZpY2VzOiAtPlxuICAgIGZvciBuYW1lLCB7dmVyc2lvbnN9IG9mIEBtZXRhZGF0YS5wcm92aWRlZFNlcnZpY2VzXG4gICAgICBzZXJ2aWNlc0J5VmVyc2lvbiA9IHt9XG4gICAgICBmb3IgdmVyc2lvbiwgbWV0aG9kTmFtZSBvZiB2ZXJzaW9uc1xuICAgICAgICBpZiB0eXBlb2YgQG1haW5Nb2R1bGVbbWV0aG9kTmFtZV0gaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICAgIHNlcnZpY2VzQnlWZXJzaW9uW3ZlcnNpb25dID0gQG1haW5Nb2R1bGVbbWV0aG9kTmFtZV0oKVxuICAgICAgQGFjdGl2YXRpb25EaXNwb3NhYmxlcy5hZGQgQHBhY2thZ2VNYW5hZ2VyLnNlcnZpY2VIdWIucHJvdmlkZShuYW1lLCBzZXJ2aWNlc0J5VmVyc2lvbilcblxuICAgIGZvciBuYW1lLCB7dmVyc2lvbnN9IG9mIEBtZXRhZGF0YS5jb25zdW1lZFNlcnZpY2VzXG4gICAgICBmb3IgdmVyc2lvbiwgbWV0aG9kTmFtZSBvZiB2ZXJzaW9uc1xuICAgICAgICBpZiB0eXBlb2YgQG1haW5Nb2R1bGVbbWV0aG9kTmFtZV0gaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICAgIEBhY3RpdmF0aW9uRGlzcG9zYWJsZXMuYWRkIEBwYWNrYWdlTWFuYWdlci5zZXJ2aWNlSHViLmNvbnN1bWUobmFtZSwgdmVyc2lvbiwgQG1haW5Nb2R1bGVbbWV0aG9kTmFtZV0uYmluZChAbWFpbk1vZHVsZSkpXG4gICAgcmV0dXJuXG5cbiAgcmVnaXN0ZXJUcmFuc3BpbGVyQ29uZmlnOiAtPlxuICAgIGlmIEBtZXRhZGF0YS5hdG9tVHJhbnNwaWxlcnNcbiAgICAgIENvbXBpbGVDYWNoZS5hZGRUcmFuc3BpbGVyQ29uZmlnRm9yUGF0aChAcGF0aCwgQG5hbWUsIEBtZXRhZGF0YSwgQG1ldGFkYXRhLmF0b21UcmFuc3BpbGVycylcblxuICB1bnJlZ2lzdGVyVHJhbnNwaWxlckNvbmZpZzogLT5cbiAgICBpZiBAbWV0YWRhdGEuYXRvbVRyYW5zcGlsZXJzXG4gICAgICBDb21waWxlQ2FjaGUucmVtb3ZlVHJhbnNwaWxlckNvbmZpZ0ZvclBhdGgoQHBhdGgpXG5cbiAgbG9hZEtleW1hcHM6IC0+XG4gICAgaWYgQGJ1bmRsZWRQYWNrYWdlIGFuZCBAcGFja2FnZU1hbmFnZXIucGFja2FnZXNDYWNoZVtAbmFtZV0/XG4gICAgICBAa2V5bWFwcyA9IChbXCJjb3JlOiN7a2V5bWFwUGF0aH1cIiwga2V5bWFwT2JqZWN0XSBmb3Iga2V5bWFwUGF0aCwga2V5bWFwT2JqZWN0IG9mIEBwYWNrYWdlTWFuYWdlci5wYWNrYWdlc0NhY2hlW0BuYW1lXS5rZXltYXBzKVxuICAgIGVsc2VcbiAgICAgIEBrZXltYXBzID0gQGdldEtleW1hcFBhdGhzKCkubWFwIChrZXltYXBQYXRoKSAtPiBba2V5bWFwUGF0aCwgQ1NPTi5yZWFkRmlsZVN5bmMoa2V5bWFwUGF0aCwgYWxsb3dEdXBsaWNhdGVLZXlzOiBmYWxzZSkgPyB7fV1cbiAgICByZXR1cm5cblxuICBsb2FkTWVudXM6IC0+XG4gICAgaWYgQGJ1bmRsZWRQYWNrYWdlIGFuZCBAcGFja2FnZU1hbmFnZXIucGFja2FnZXNDYWNoZVtAbmFtZV0/XG4gICAgICBAbWVudXMgPSAoW1wiY29yZToje21lbnVQYXRofVwiLCBtZW51T2JqZWN0XSBmb3IgbWVudVBhdGgsIG1lbnVPYmplY3Qgb2YgQHBhY2thZ2VNYW5hZ2VyLnBhY2thZ2VzQ2FjaGVbQG5hbWVdLm1lbnVzKVxuICAgIGVsc2VcbiAgICAgIEBtZW51cyA9IEBnZXRNZW51UGF0aHMoKS5tYXAgKG1lbnVQYXRoKSAtPiBbbWVudVBhdGgsIENTT04ucmVhZEZpbGVTeW5jKG1lbnVQYXRoKSA/IHt9XVxuICAgIHJldHVyblxuXG4gIGdldEtleW1hcFBhdGhzOiAtPlxuICAgIGtleW1hcHNEaXJQYXRoID0gcGF0aC5qb2luKEBwYXRoLCAna2V5bWFwcycpXG4gICAgaWYgQG1ldGFkYXRhLmtleW1hcHNcbiAgICAgIEBtZXRhZGF0YS5rZXltYXBzLm1hcCAobmFtZSkgLT4gZnMucmVzb2x2ZShrZXltYXBzRGlyUGF0aCwgbmFtZSwgWydqc29uJywgJ2Nzb24nLCAnJ10pXG4gICAgZWxzZVxuICAgICAgZnMubGlzdFN5bmMoa2V5bWFwc0RpclBhdGgsIFsnY3NvbicsICdqc29uJ10pXG5cbiAgZ2V0TWVudVBhdGhzOiAtPlxuICAgIG1lbnVzRGlyUGF0aCA9IHBhdGguam9pbihAcGF0aCwgJ21lbnVzJylcbiAgICBpZiBAbWV0YWRhdGEubWVudXNcbiAgICAgIEBtZXRhZGF0YS5tZW51cy5tYXAgKG5hbWUpIC0+IGZzLnJlc29sdmUobWVudXNEaXJQYXRoLCBuYW1lLCBbJ2pzb24nLCAnY3NvbicsICcnXSlcbiAgICBlbHNlXG4gICAgICBmcy5saXN0U3luYyhtZW51c0RpclBhdGgsIFsnY3NvbicsICdqc29uJ10pXG5cbiAgbG9hZFN0eWxlc2hlZXRzOiAtPlxuICAgIEBzdHlsZXNoZWV0cyA9IEBnZXRTdHlsZXNoZWV0UGF0aHMoKS5tYXAgKHN0eWxlc2hlZXRQYXRoKSA9PlxuICAgICAgW3N0eWxlc2hlZXRQYXRoLCBAdGhlbWVNYW5hZ2VyLmxvYWRTdHlsZXNoZWV0KHN0eWxlc2hlZXRQYXRoLCB0cnVlKV1cblxuICByZWdpc3RlckRlc2VyaWFsaXplck1ldGhvZHM6IC0+XG4gICAgaWYgQG1ldGFkYXRhLmRlc2VyaWFsaXplcnM/XG4gICAgICBPYmplY3Qua2V5cyhAbWV0YWRhdGEuZGVzZXJpYWxpemVycykuZm9yRWFjaCAoZGVzZXJpYWxpemVyTmFtZSkgPT5cbiAgICAgICAgbWV0aG9kTmFtZSA9IEBtZXRhZGF0YS5kZXNlcmlhbGl6ZXJzW2Rlc2VyaWFsaXplck5hbWVdXG4gICAgICAgIEBkZXNlcmlhbGl6ZXJNYW5hZ2VyLmFkZFxuICAgICAgICAgIG5hbWU6IGRlc2VyaWFsaXplck5hbWUsXG4gICAgICAgICAgZGVzZXJpYWxpemU6IChzdGF0ZSwgYXRvbUVudmlyb25tZW50KSA9PlxuICAgICAgICAgICAgQHJlZ2lzdGVyVmlld1Byb3ZpZGVycygpXG4gICAgICAgICAgICBAcmVxdWlyZU1haW5Nb2R1bGUoKVxuICAgICAgICAgICAgQGluaXRpYWxpemVJZk5lZWRlZCgpXG4gICAgICAgICAgICBAbWFpbk1vZHVsZVttZXRob2ROYW1lXShzdGF0ZSwgYXRvbUVudmlyb25tZW50KVxuICAgICAgcmV0dXJuXG5cbiAgYWN0aXZhdGVDb3JlU3RhcnR1cFNlcnZpY2VzOiAtPlxuICAgIGlmIGRpcmVjdG9yeVByb3ZpZGVyU2VydmljZSA9IEBtZXRhZGF0YS5wcm92aWRlZFNlcnZpY2VzP1snYXRvbS5kaXJlY3RvcnktcHJvdmlkZXInXVxuICAgICAgQHJlcXVpcmVNYWluTW9kdWxlKClcbiAgICAgIHNlcnZpY2VzQnlWZXJzaW9uID0ge31cbiAgICAgIGZvciB2ZXJzaW9uLCBtZXRob2ROYW1lIG9mIGRpcmVjdG9yeVByb3ZpZGVyU2VydmljZS52ZXJzaW9uc1xuICAgICAgICBpZiB0eXBlb2YgQG1haW5Nb2R1bGVbbWV0aG9kTmFtZV0gaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICAgIHNlcnZpY2VzQnlWZXJzaW9uW3ZlcnNpb25dID0gQG1haW5Nb2R1bGVbbWV0aG9kTmFtZV0oKVxuICAgICAgQHBhY2thZ2VNYW5hZ2VyLnNlcnZpY2VIdWIucHJvdmlkZSgnYXRvbS5kaXJlY3RvcnktcHJvdmlkZXInLCBzZXJ2aWNlc0J5VmVyc2lvbilcblxuICByZWdpc3RlclZpZXdQcm92aWRlcnM6IC0+XG4gICAgaWYgQG1ldGFkYXRhLnZpZXdQcm92aWRlcnM/IGFuZCBub3QgQHJlZ2lzdGVyZWRWaWV3UHJvdmlkZXJzXG4gICAgICBAcmVxdWlyZU1haW5Nb2R1bGUoKVxuICAgICAgQG1ldGFkYXRhLnZpZXdQcm92aWRlcnMuZm9yRWFjaCAobWV0aG9kTmFtZSkgPT5cbiAgICAgICAgQHZpZXdSZWdpc3RyeS5hZGRWaWV3UHJvdmlkZXIgKG1vZGVsKSA9PlxuICAgICAgICAgIEBpbml0aWFsaXplSWZOZWVkZWQoKVxuICAgICAgICAgIEBtYWluTW9kdWxlW21ldGhvZE5hbWVdKG1vZGVsKVxuICAgICAgQHJlZ2lzdGVyZWRWaWV3UHJvdmlkZXJzID0gdHJ1ZVxuXG4gIGdldFN0eWxlc2hlZXRzUGF0aDogLT5cbiAgICBwYXRoLmpvaW4oQHBhdGgsICdzdHlsZXMnKVxuXG4gIGdldFN0eWxlc2hlZXRQYXRoczogLT5cbiAgICBpZiBAYnVuZGxlZFBhY2thZ2UgYW5kIEBwYWNrYWdlTWFuYWdlci5wYWNrYWdlc0NhY2hlW0BuYW1lXT8uc3R5bGVTaGVldFBhdGhzP1xuICAgICAgc3R5bGVTaGVldFBhdGhzID0gQHBhY2thZ2VNYW5hZ2VyLnBhY2thZ2VzQ2FjaGVbQG5hbWVdLnN0eWxlU2hlZXRQYXRoc1xuICAgICAgc3R5bGVTaGVldFBhdGhzLm1hcCAoc3R5bGVTaGVldFBhdGgpID0+IHBhdGguam9pbihAcGF0aCwgc3R5bGVTaGVldFBhdGgpXG4gICAgZWxzZVxuICAgICAgc3R5bGVzaGVldERpclBhdGggPSBAZ2V0U3R5bGVzaGVldHNQYXRoKClcbiAgICAgIGlmIEBtZXRhZGF0YS5tYWluU3R5bGVTaGVldFxuICAgICAgICBbZnMucmVzb2x2ZShAcGF0aCwgQG1ldGFkYXRhLm1haW5TdHlsZVNoZWV0KV1cbiAgICAgIGVsc2UgaWYgQG1ldGFkYXRhLnN0eWxlU2hlZXRzXG4gICAgICAgIEBtZXRhZGF0YS5zdHlsZVNoZWV0cy5tYXAgKG5hbWUpIC0+IGZzLnJlc29sdmUoc3R5bGVzaGVldERpclBhdGgsIG5hbWUsIFsnY3NzJywgJ2xlc3MnLCAnJ10pXG4gICAgICBlbHNlIGlmIGluZGV4U3R5bGVzaGVldCA9IGZzLnJlc29sdmUoQHBhdGgsICdpbmRleCcsIFsnY3NzJywgJ2xlc3MnXSlcbiAgICAgICAgW2luZGV4U3R5bGVzaGVldF1cbiAgICAgIGVsc2VcbiAgICAgICAgZnMubGlzdFN5bmMoc3R5bGVzaGVldERpclBhdGgsIFsnY3NzJywgJ2xlc3MnXSlcblxuICBsb2FkR3JhbW1hcnNTeW5jOiAtPlxuICAgIHJldHVybiBpZiBAZ3JhbW1hcnNMb2FkZWRcblxuICAgIGlmIEBwcmVsb2FkZWRQYWNrYWdlIGFuZCBAcGFja2FnZU1hbmFnZXIucGFja2FnZXNDYWNoZVtAbmFtZV0/XG4gICAgICBncmFtbWFyUGF0aHMgPSBAcGFja2FnZU1hbmFnZXIucGFja2FnZXNDYWNoZVtAbmFtZV0uZ3JhbW1hclBhdGhzXG4gICAgZWxzZVxuICAgICAgZ3JhbW1hclBhdGhzID0gZnMubGlzdFN5bmMocGF0aC5qb2luKEBwYXRoLCAnZ3JhbW1hcnMnKSwgWydqc29uJywgJ2Nzb24nXSlcblxuICAgIGZvciBncmFtbWFyUGF0aCBpbiBncmFtbWFyUGF0aHNcbiAgICAgIGlmIEBwcmVsb2FkZWRQYWNrYWdlIGFuZCBAcGFja2FnZU1hbmFnZXIucGFja2FnZXNDYWNoZVtAbmFtZV0/XG4gICAgICAgIGdyYW1tYXJQYXRoID0gcGF0aC5yZXNvbHZlKEBwYWNrYWdlTWFuYWdlci5yZXNvdXJjZVBhdGgsIGdyYW1tYXJQYXRoKVxuXG4gICAgICB0cnlcbiAgICAgICAgZ3JhbW1hciA9IEBncmFtbWFyUmVnaXN0cnkucmVhZEdyYW1tYXJTeW5jKGdyYW1tYXJQYXRoKVxuICAgICAgICBncmFtbWFyLnBhY2thZ2VOYW1lID0gQG5hbWVcbiAgICAgICAgZ3JhbW1hci5idW5kbGVkUGFja2FnZSA9IEBidW5kbGVkUGFja2FnZVxuICAgICAgICBAZ3JhbW1hcnMucHVzaChncmFtbWFyKVxuICAgICAgICBncmFtbWFyLmFjdGl2YXRlKClcbiAgICAgIGNhdGNoIGVycm9yXG4gICAgICAgIGNvbnNvbGUud2FybihcIkZhaWxlZCB0byBsb2FkIGdyYW1tYXI6ICN7Z3JhbW1hclBhdGh9XCIsIGVycm9yLnN0YWNrID8gZXJyb3IpXG5cbiAgICBAZ3JhbW1hcnNMb2FkZWQgPSB0cnVlXG4gICAgQGdyYW1tYXJzQWN0aXZhdGVkID0gdHJ1ZVxuXG4gIGxvYWRHcmFtbWFyczogLT5cbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkgaWYgQGdyYW1tYXJzTG9hZGVkXG5cbiAgICBsb2FkR3JhbW1hciA9IChncmFtbWFyUGF0aCwgY2FsbGJhY2spID0+XG4gICAgICBpZiBAcHJlbG9hZGVkUGFja2FnZVxuICAgICAgICBncmFtbWFyUGF0aCA9IHBhdGgucmVzb2x2ZShAcGFja2FnZU1hbmFnZXIucmVzb3VyY2VQYXRoLCBncmFtbWFyUGF0aClcblxuICAgICAgQGdyYW1tYXJSZWdpc3RyeS5yZWFkR3JhbW1hciBncmFtbWFyUGF0aCwgKGVycm9yLCBncmFtbWFyKSA9PlxuICAgICAgICBpZiBlcnJvcj9cbiAgICAgICAgICBkZXRhaWwgPSBcIiN7ZXJyb3IubWVzc2FnZX0gaW4gI3tncmFtbWFyUGF0aH1cIlxuICAgICAgICAgIHN0YWNrID0gXCIje2Vycm9yLnN0YWNrfVxcbiAgYXQgI3tncmFtbWFyUGF0aH06MToxXCJcbiAgICAgICAgICBAbm90aWZpY2F0aW9uTWFuYWdlci5hZGRGYXRhbEVycm9yKFwiRmFpbGVkIHRvIGxvYWQgYSAje0BuYW1lfSBwYWNrYWdlIGdyYW1tYXJcIiwge3N0YWNrLCBkZXRhaWwsIHBhY2thZ2VOYW1lOiBAbmFtZSwgZGlzbWlzc2FibGU6IHRydWV9KVxuICAgICAgICBlbHNlXG4gICAgICAgICAgZ3JhbW1hci5wYWNrYWdlTmFtZSA9IEBuYW1lXG4gICAgICAgICAgZ3JhbW1hci5idW5kbGVkUGFja2FnZSA9IEBidW5kbGVkUGFja2FnZVxuICAgICAgICAgIEBncmFtbWFycy5wdXNoKGdyYW1tYXIpXG4gICAgICAgICAgZ3JhbW1hci5hY3RpdmF0ZSgpIGlmIEBncmFtbWFyc0FjdGl2YXRlZFxuICAgICAgICBjYWxsYmFjaygpXG5cbiAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSkgPT5cbiAgICAgIGlmIEBwcmVsb2FkZWRQYWNrYWdlIGFuZCBAcGFja2FnZU1hbmFnZXIucGFja2FnZXNDYWNoZVtAbmFtZV0/XG4gICAgICAgIGdyYW1tYXJQYXRocyA9IEBwYWNrYWdlTWFuYWdlci5wYWNrYWdlc0NhY2hlW0BuYW1lXS5ncmFtbWFyUGF0aHNcbiAgICAgICAgYXN5bmMuZWFjaCBncmFtbWFyUGF0aHMsIGxvYWRHcmFtbWFyLCAtPiByZXNvbHZlKClcbiAgICAgIGVsc2VcbiAgICAgICAgZ3JhbW1hcnNEaXJQYXRoID0gcGF0aC5qb2luKEBwYXRoLCAnZ3JhbW1hcnMnKVxuICAgICAgICBmcy5leGlzdHMgZ3JhbW1hcnNEaXJQYXRoLCAoZ3JhbW1hcnNEaXJFeGlzdHMpIC0+XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUoKSB1bmxlc3MgZ3JhbW1hcnNEaXJFeGlzdHNcblxuICAgICAgICAgIGZzLmxpc3QgZ3JhbW1hcnNEaXJQYXRoLCBbJ2pzb24nLCAnY3NvbiddLCAoZXJyb3IsIGdyYW1tYXJQYXRocz1bXSkgLT5cbiAgICAgICAgICAgIGFzeW5jLmVhY2ggZ3JhbW1hclBhdGhzLCBsb2FkR3JhbW1hciwgLT4gcmVzb2x2ZSgpXG5cbiAgbG9hZFNldHRpbmdzOiAtPlxuICAgIEBzZXR0aW5ncyA9IFtdXG5cbiAgICBsb2FkU2V0dGluZ3NGaWxlID0gKHNldHRpbmdzUGF0aCwgY2FsbGJhY2spID0+XG4gICAgICBTY29wZWRQcm9wZXJ0aWVzLmxvYWQgc2V0dGluZ3NQYXRoLCBAY29uZmlnLCAoZXJyb3IsIHNldHRpbmdzKSA9PlxuICAgICAgICBpZiBlcnJvcj9cbiAgICAgICAgICBkZXRhaWwgPSBcIiN7ZXJyb3IubWVzc2FnZX0gaW4gI3tzZXR0aW5nc1BhdGh9XCJcbiAgICAgICAgICBzdGFjayA9IFwiI3tlcnJvci5zdGFja31cXG4gIGF0ICN7c2V0dGluZ3NQYXRofToxOjFcIlxuICAgICAgICAgIEBub3RpZmljYXRpb25NYW5hZ2VyLmFkZEZhdGFsRXJyb3IoXCJGYWlsZWQgdG8gbG9hZCB0aGUgI3tAbmFtZX0gcGFja2FnZSBzZXR0aW5nc1wiLCB7c3RhY2ssIGRldGFpbCwgcGFja2FnZU5hbWU6IEBuYW1lLCBkaXNtaXNzYWJsZTogdHJ1ZX0pXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAc2V0dGluZ3MucHVzaChzZXR0aW5ncylcbiAgICAgICAgICBzZXR0aW5ncy5hY3RpdmF0ZSgpIGlmIEBzZXR0aW5nc0FjdGl2YXRlZFxuICAgICAgICBjYWxsYmFjaygpXG5cbiAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSkgPT5cbiAgICAgIGlmIEBwcmVsb2FkZWRQYWNrYWdlIGFuZCBAcGFja2FnZU1hbmFnZXIucGFja2FnZXNDYWNoZVtAbmFtZV0/XG4gICAgICAgIGZvciBzZXR0aW5nc1BhdGgsIHNjb3BlZFByb3BlcnRpZXMgb2YgQHBhY2thZ2VNYW5hZ2VyLnBhY2thZ2VzQ2FjaGVbQG5hbWVdLnNldHRpbmdzXG4gICAgICAgICAgc2V0dGluZ3MgPSBuZXcgU2NvcGVkUHJvcGVydGllcyhcImNvcmU6I3tzZXR0aW5nc1BhdGh9XCIsIHNjb3BlZFByb3BlcnRpZXMgPyB7fSwgQGNvbmZpZylcbiAgICAgICAgICBAc2V0dGluZ3MucHVzaChzZXR0aW5ncylcbiAgICAgICAgICBzZXR0aW5ncy5hY3RpdmF0ZSgpIGlmIEBzZXR0aW5nc0FjdGl2YXRlZFxuICAgICAgICByZXNvbHZlKClcbiAgICAgIGVsc2VcbiAgICAgICAgc2V0dGluZ3NEaXJQYXRoID0gcGF0aC5qb2luKEBwYXRoLCAnc2V0dGluZ3MnKVxuICAgICAgICBmcy5leGlzdHMgc2V0dGluZ3NEaXJQYXRoLCAoc2V0dGluZ3NEaXJFeGlzdHMpIC0+XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUoKSB1bmxlc3Mgc2V0dGluZ3NEaXJFeGlzdHNcblxuICAgICAgICAgIGZzLmxpc3Qgc2V0dGluZ3NEaXJQYXRoLCBbJ2pzb24nLCAnY3NvbiddLCAoZXJyb3IsIHNldHRpbmdzUGF0aHM9W10pIC0+XG4gICAgICAgICAgICBhc3luYy5lYWNoIHNldHRpbmdzUGF0aHMsIGxvYWRTZXR0aW5nc0ZpbGUsIC0+IHJlc29sdmUoKVxuXG4gIHNlcmlhbGl6ZTogLT5cbiAgICBpZiBAbWFpbkFjdGl2YXRlZFxuICAgICAgdHJ5XG4gICAgICAgIEBtYWluTW9kdWxlPy5zZXJpYWxpemU/KClcbiAgICAgIGNhdGNoIGVcbiAgICAgICAgY29uc29sZS5lcnJvciBcIkVycm9yIHNlcmlhbGl6aW5nIHBhY2thZ2UgJyN7QG5hbWV9J1wiLCBlLnN0YWNrXG5cbiAgZGVhY3RpdmF0ZTogLT5cbiAgICBAYWN0aXZhdGlvblByb21pc2UgPSBudWxsXG4gICAgQHJlc29sdmVBY3RpdmF0aW9uUHJvbWlzZSA9IG51bGxcbiAgICBAYWN0aXZhdGlvbkNvbW1hbmRTdWJzY3JpcHRpb25zPy5kaXNwb3NlKClcbiAgICBAYWN0aXZhdGlvbkhvb2tTdWJzY3JpcHRpb25zPy5kaXNwb3NlKClcbiAgICBAY29uZmlnU2NoZW1hUmVnaXN0ZXJlZE9uQWN0aXZhdGUgPSBmYWxzZVxuICAgIEBkZWFjdGl2YXRlUmVzb3VyY2VzKClcbiAgICBAZGVhY3RpdmF0ZUtleW1hcHMoKVxuICAgIGlmIEBtYWluQWN0aXZhdGVkXG4gICAgICB0cnlcbiAgICAgICAgQG1haW5Nb2R1bGU/LmRlYWN0aXZhdGU/KClcbiAgICAgICAgQG1haW5Nb2R1bGU/LmRlYWN0aXZhdGVDb25maWc/KClcbiAgICAgICAgQG1haW5BY3RpdmF0ZWQgPSBmYWxzZVxuICAgICAgICBAbWFpbkluaXRpYWxpemVkID0gZmFsc2VcbiAgICAgIGNhdGNoIGVcbiAgICAgICAgY29uc29sZS5lcnJvciBcIkVycm9yIGRlYWN0aXZhdGluZyBwYWNrYWdlICcje0BuYW1lfSdcIiwgZS5zdGFja1xuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1kZWFjdGl2YXRlJ1xuXG4gIGRlYWN0aXZhdGVSZXNvdXJjZXM6IC0+XG4gICAgZ3JhbW1hci5kZWFjdGl2YXRlKCkgZm9yIGdyYW1tYXIgaW4gQGdyYW1tYXJzXG4gICAgc2V0dGluZ3MuZGVhY3RpdmF0ZSgpIGZvciBzZXR0aW5ncyBpbiBAc2V0dGluZ3NcbiAgICBAc3R5bGVzaGVldERpc3Bvc2FibGVzPy5kaXNwb3NlKClcbiAgICBAYWN0aXZhdGlvbkRpc3Bvc2FibGVzPy5kaXNwb3NlKClcbiAgICBAa2V5bWFwRGlzcG9zYWJsZXM/LmRpc3Bvc2UoKVxuICAgIEBzdHlsZXNoZWV0c0FjdGl2YXRlZCA9IGZhbHNlXG4gICAgQGdyYW1tYXJzQWN0aXZhdGVkID0gZmFsc2VcbiAgICBAc2V0dGluZ3NBY3RpdmF0ZWQgPSBmYWxzZVxuICAgIEBtZW51c0FjdGl2YXRlZCA9IGZhbHNlXG5cbiAgcmVsb2FkU3R5bGVzaGVldHM6IC0+XG4gICAgdHJ5XG4gICAgICBAbG9hZFN0eWxlc2hlZXRzKClcbiAgICBjYXRjaCBlcnJvclxuICAgICAgQGhhbmRsZUVycm9yKFwiRmFpbGVkIHRvIHJlbG9hZCB0aGUgI3tAbmFtZX0gcGFja2FnZSBzdHlsZXNoZWV0c1wiLCBlcnJvcilcblxuICAgIEBzdHlsZXNoZWV0RGlzcG9zYWJsZXM/LmRpc3Bvc2UoKVxuICAgIEBzdHlsZXNoZWV0RGlzcG9zYWJsZXMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZVxuICAgIEBzdHlsZXNoZWV0c0FjdGl2YXRlZCA9IGZhbHNlXG4gICAgQGFjdGl2YXRlU3R5bGVzaGVldHMoKVxuXG4gIHJlcXVpcmVNYWluTW9kdWxlOiAtPlxuICAgIGlmIEBidW5kbGVkUGFja2FnZSBhbmQgQHBhY2thZ2VNYW5hZ2VyLnBhY2thZ2VzQ2FjaGVbQG5hbWVdP1xuICAgICAgaWYgQHBhY2thZ2VNYW5hZ2VyLnBhY2thZ2VzQ2FjaGVbQG5hbWVdLm1haW4/XG4gICAgICAgIEBtYWluTW9kdWxlID0gcmVxdWlyZShAcGFja2FnZU1hbmFnZXIucGFja2FnZXNDYWNoZVtAbmFtZV0ubWFpbilcbiAgICBlbHNlIGlmIEBtYWluTW9kdWxlUmVxdWlyZWRcbiAgICAgIEBtYWluTW9kdWxlXG4gICAgZWxzZSBpZiBub3QgQGlzQ29tcGF0aWJsZSgpXG4gICAgICBjb25zb2xlLndhcm4gXCJcIlwiXG4gICAgICAgIEZhaWxlZCB0byByZXF1aXJlIHRoZSBtYWluIG1vZHVsZSBvZiAnI3tAbmFtZX0nIGJlY2F1c2UgaXQgcmVxdWlyZXMgb25lIG9yIG1vcmUgaW5jb21wYXRpYmxlIG5hdGl2ZSBtb2R1bGVzICgje18ucGx1Y2soQGluY29tcGF0aWJsZU1vZHVsZXMsICduYW1lJykuam9pbignLCAnKX0pLlxuICAgICAgICBSdW4gYGFwbSByZWJ1aWxkYCBpbiB0aGUgcGFja2FnZSBkaXJlY3RvcnkgYW5kIHJlc3RhcnQgQXRvbSB0byByZXNvbHZlLlxuICAgICAgXCJcIlwiXG4gICAgICByZXR1cm5cbiAgICBlbHNlXG4gICAgICBtYWluTW9kdWxlUGF0aCA9IEBnZXRNYWluTW9kdWxlUGF0aCgpXG4gICAgICBpZiBmcy5pc0ZpbGVTeW5jKG1haW5Nb2R1bGVQYXRoKVxuICAgICAgICBAbWFpbk1vZHVsZVJlcXVpcmVkID0gdHJ1ZVxuXG4gICAgICAgIHByZXZpb3VzVmlld1Byb3ZpZGVyQ291bnQgPSBAdmlld1JlZ2lzdHJ5LmdldFZpZXdQcm92aWRlckNvdW50KClcbiAgICAgICAgcHJldmlvdXNEZXNlcmlhbGl6ZXJDb3VudCA9IEBkZXNlcmlhbGl6ZXJNYW5hZ2VyLmdldERlc2VyaWFsaXplckNvdW50KClcbiAgICAgICAgQG1haW5Nb2R1bGUgPSByZXF1aXJlKG1haW5Nb2R1bGVQYXRoKVxuICAgICAgICBpZiAoQHZpZXdSZWdpc3RyeS5nZXRWaWV3UHJvdmlkZXJDb3VudCgpIGlzIHByZXZpb3VzVmlld1Byb3ZpZGVyQ291bnQgYW5kXG4gICAgICAgICAgICBAZGVzZXJpYWxpemVyTWFuYWdlci5nZXREZXNlcmlhbGl6ZXJDb3VudCgpIGlzIHByZXZpb3VzRGVzZXJpYWxpemVyQ291bnQpXG4gICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oQGdldENhbkRlZmVyTWFpbk1vZHVsZVJlcXVpcmVTdG9yYWdlS2V5KCksICd0cnVlJylcblxuICBnZXRNYWluTW9kdWxlUGF0aDogLT5cbiAgICByZXR1cm4gQG1haW5Nb2R1bGVQYXRoIGlmIEByZXNvbHZlZE1haW5Nb2R1bGVQYXRoXG4gICAgQHJlc29sdmVkTWFpbk1vZHVsZVBhdGggPSB0cnVlXG5cbiAgICBpZiBAYnVuZGxlZFBhY2thZ2UgYW5kIEBwYWNrYWdlTWFuYWdlci5wYWNrYWdlc0NhY2hlW0BuYW1lXT9cbiAgICAgIGlmIEBwYWNrYWdlTWFuYWdlci5wYWNrYWdlc0NhY2hlW0BuYW1lXS5tYWluXG4gICAgICAgIEBtYWluTW9kdWxlUGF0aCA9IHBhdGgucmVzb2x2ZShAcGFja2FnZU1hbmFnZXIucmVzb3VyY2VQYXRoLCAnc3RhdGljJywgQHBhY2thZ2VNYW5hZ2VyLnBhY2thZ2VzQ2FjaGVbQG5hbWVdLm1haW4pXG4gICAgICBlbHNlXG4gICAgICAgIEBtYWluTW9kdWxlUGF0aCA9IG51bGxcbiAgICBlbHNlXG4gICAgICBtYWluTW9kdWxlUGF0aCA9XG4gICAgICAgIGlmIEBtZXRhZGF0YS5tYWluXG4gICAgICAgICAgcGF0aC5qb2luKEBwYXRoLCBAbWV0YWRhdGEubWFpbilcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHBhdGguam9pbihAcGF0aCwgJ2luZGV4JylcbiAgICAgIEBtYWluTW9kdWxlUGF0aCA9IGZzLnJlc29sdmVFeHRlbnNpb24obWFpbk1vZHVsZVBhdGgsIFtcIlwiLCBDb21waWxlQ2FjaGUuc3VwcG9ydGVkRXh0ZW5zaW9ucy4uLl0pXG5cbiAgYWN0aXZhdGlvblNob3VsZEJlRGVmZXJyZWQ6IC0+XG4gICAgQGhhc0FjdGl2YXRpb25Db21tYW5kcygpIG9yIEBoYXNBY3RpdmF0aW9uSG9va3MoKVxuXG4gIGhhc0FjdGl2YXRpb25Ib29rczogLT5cbiAgICBAZ2V0QWN0aXZhdGlvbkhvb2tzKCk/Lmxlbmd0aCA+IDBcblxuICBoYXNBY3RpdmF0aW9uQ29tbWFuZHM6IC0+XG4gICAgZm9yIHNlbGVjdG9yLCBjb21tYW5kcyBvZiBAZ2V0QWN0aXZhdGlvbkNvbW1hbmRzKClcbiAgICAgIHJldHVybiB0cnVlIGlmIGNvbW1hbmRzLmxlbmd0aCA+IDBcbiAgICBmYWxzZVxuXG4gIHN1YnNjcmliZVRvRGVmZXJyZWRBY3RpdmF0aW9uOiAtPlxuICAgIEBzdWJzY3JpYmVUb0FjdGl2YXRpb25Db21tYW5kcygpXG4gICAgQHN1YnNjcmliZVRvQWN0aXZhdGlvbkhvb2tzKClcblxuICBzdWJzY3JpYmVUb0FjdGl2YXRpb25Db21tYW5kczogLT5cbiAgICBAYWN0aXZhdGlvbkNvbW1hbmRTdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgICBmb3Igc2VsZWN0b3IsIGNvbW1hbmRzIG9mIEBnZXRBY3RpdmF0aW9uQ29tbWFuZHMoKVxuICAgICAgZm9yIGNvbW1hbmQgaW4gY29tbWFuZHNcbiAgICAgICAgZG8gKHNlbGVjdG9yLCBjb21tYW5kKSA9PlxuICAgICAgICAgICMgQWRkIGR1bW15IGNvbW1hbmQgc28gaXQgYXBwZWFycyBpbiBtZW51LlxuICAgICAgICAgICMgVGhlIHJlYWwgY29tbWFuZCB3aWxsIGJlIHJlZ2lzdGVyZWQgb24gcGFja2FnZSBhY3RpdmF0aW9uXG4gICAgICAgICAgdHJ5XG4gICAgICAgICAgICBAYWN0aXZhdGlvbkNvbW1hbmRTdWJzY3JpcHRpb25zLmFkZCBAY29tbWFuZFJlZ2lzdHJ5LmFkZCBzZWxlY3RvciwgY29tbWFuZCwgLT5cbiAgICAgICAgICBjYXRjaCBlcnJvclxuICAgICAgICAgICAgaWYgZXJyb3IuY29kZSBpcyAnRUJBRFNFTEVDVE9SJ1xuICAgICAgICAgICAgICBtZXRhZGF0YVBhdGggPSBwYXRoLmpvaW4oQHBhdGgsICdwYWNrYWdlLmpzb24nKVxuICAgICAgICAgICAgICBlcnJvci5tZXNzYWdlICs9IFwiIGluICN7bWV0YWRhdGFQYXRofVwiXG4gICAgICAgICAgICAgIGVycm9yLnN0YWNrICs9IFwiXFxuICBhdCAje21ldGFkYXRhUGF0aH06MToxXCJcbiAgICAgICAgICAgIHRocm93IGVycm9yXG5cbiAgICAgICAgICBAYWN0aXZhdGlvbkNvbW1hbmRTdWJzY3JpcHRpb25zLmFkZCBAY29tbWFuZFJlZ2lzdHJ5Lm9uV2lsbERpc3BhdGNoIChldmVudCkgPT5cbiAgICAgICAgICAgIHJldHVybiB1bmxlc3MgZXZlbnQudHlwZSBpcyBjb21tYW5kXG4gICAgICAgICAgICBjdXJyZW50VGFyZ2V0ID0gZXZlbnQudGFyZ2V0XG4gICAgICAgICAgICB3aGlsZSBjdXJyZW50VGFyZ2V0XG4gICAgICAgICAgICAgIGlmIGN1cnJlbnRUYXJnZXQud2Via2l0TWF0Y2hlc1NlbGVjdG9yKHNlbGVjdG9yKVxuICAgICAgICAgICAgICAgIEBhY3RpdmF0aW9uQ29tbWFuZFN1YnNjcmlwdGlvbnMuZGlzcG9zZSgpXG4gICAgICAgICAgICAgICAgQGFjdGl2YXRlTm93KClcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICBjdXJyZW50VGFyZ2V0ID0gY3VycmVudFRhcmdldC5wYXJlbnRFbGVtZW50XG4gICAgICAgICAgICByZXR1cm5cbiAgICByZXR1cm5cblxuICBnZXRBY3RpdmF0aW9uQ29tbWFuZHM6IC0+XG4gICAgcmV0dXJuIEBhY3RpdmF0aW9uQ29tbWFuZHMgaWYgQGFjdGl2YXRpb25Db21tYW5kcz9cblxuICAgIEBhY3RpdmF0aW9uQ29tbWFuZHMgPSB7fVxuXG4gICAgaWYgQG1ldGFkYXRhLmFjdGl2YXRpb25Db21tYW5kcz9cbiAgICAgIGZvciBzZWxlY3RvciwgY29tbWFuZHMgb2YgQG1ldGFkYXRhLmFjdGl2YXRpb25Db21tYW5kc1xuICAgICAgICBAYWN0aXZhdGlvbkNvbW1hbmRzW3NlbGVjdG9yXSA/PSBbXVxuICAgICAgICBpZiBfLmlzU3RyaW5nKGNvbW1hbmRzKVxuICAgICAgICAgIEBhY3RpdmF0aW9uQ29tbWFuZHNbc2VsZWN0b3JdLnB1c2goY29tbWFuZHMpXG4gICAgICAgIGVsc2UgaWYgXy5pc0FycmF5KGNvbW1hbmRzKVxuICAgICAgICAgIEBhY3RpdmF0aW9uQ29tbWFuZHNbc2VsZWN0b3JdLnB1c2goY29tbWFuZHMuLi4pXG5cbiAgICBAYWN0aXZhdGlvbkNvbW1hbmRzXG5cbiAgc3Vic2NyaWJlVG9BY3RpdmF0aW9uSG9va3M6IC0+XG4gICAgQGFjdGl2YXRpb25Ib29rU3Vic2NyaXB0aW9ucyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlXG4gICAgZm9yIGhvb2sgaW4gQGdldEFjdGl2YXRpb25Ib29rcygpXG4gICAgICBkbyAoaG9vaykgPT5cbiAgICAgICAgQGFjdGl2YXRpb25Ib29rU3Vic2NyaXB0aW9ucy5hZGQoQHBhY2thZ2VNYW5hZ2VyLm9uRGlkVHJpZ2dlckFjdGl2YXRpb25Ib29rKGhvb2ssID0+IEBhY3RpdmF0ZU5vdygpKSkgaWYgaG9vaz8gYW5kIF8uaXNTdHJpbmcoaG9vaykgYW5kIGhvb2sudHJpbSgpLmxlbmd0aCA+IDBcblxuICAgIHJldHVyblxuXG4gIGdldEFjdGl2YXRpb25Ib29rczogLT5cbiAgICByZXR1cm4gQGFjdGl2YXRpb25Ib29rcyBpZiBAbWV0YWRhdGE/IGFuZCBAYWN0aXZhdGlvbkhvb2tzP1xuXG4gICAgQGFjdGl2YXRpb25Ib29rcyA9IFtdXG5cbiAgICBpZiBAbWV0YWRhdGEuYWN0aXZhdGlvbkhvb2tzP1xuICAgICAgaWYgXy5pc0FycmF5KEBtZXRhZGF0YS5hY3RpdmF0aW9uSG9va3MpXG4gICAgICAgIEBhY3RpdmF0aW9uSG9va3MucHVzaChAbWV0YWRhdGEuYWN0aXZhdGlvbkhvb2tzLi4uKVxuICAgICAgZWxzZSBpZiBfLmlzU3RyaW5nKEBtZXRhZGF0YS5hY3RpdmF0aW9uSG9va3MpXG4gICAgICAgIEBhY3RpdmF0aW9uSG9va3MucHVzaChAbWV0YWRhdGEuYWN0aXZhdGlvbkhvb2tzKVxuXG4gICAgQGFjdGl2YXRpb25Ib29rcyA9IF8udW5pcShAYWN0aXZhdGlvbkhvb2tzKVxuXG4gICMgRG9lcyB0aGUgZ2l2ZW4gbW9kdWxlIHBhdGggY29udGFpbiBuYXRpdmUgY29kZT9cbiAgaXNOYXRpdmVNb2R1bGU6IChtb2R1bGVQYXRoKSAtPlxuICAgIHRyeVxuICAgICAgZnMubGlzdFN5bmMocGF0aC5qb2luKG1vZHVsZVBhdGgsICdidWlsZCcsICdSZWxlYXNlJyksIFsnLm5vZGUnXSkubGVuZ3RoID4gMFxuICAgIGNhdGNoIGVycm9yXG4gICAgICBmYWxzZVxuXG4gICMgR2V0IGFuIGFycmF5IG9mIGFsbCB0aGUgbmF0aXZlIG1vZHVsZXMgdGhhdCB0aGlzIHBhY2thZ2UgZGVwZW5kcyBvbi5cbiAgI1xuICAjIEZpcnN0IHRyeSB0byBnZXQgdGhpcyBpbmZvcm1hdGlvbiBmcm9tXG4gICMgQG1ldGFkYXRhLl9hdG9tTW9kdWxlQ2FjaGUuZXh0ZW5zaW9ucy4gSWYgQG1ldGFkYXRhLl9hdG9tTW9kdWxlQ2FjaGUgZG9lc24ndFxuICAjIGV4aXN0LCByZWN1cnNlIHRocm91Z2ggYWxsIGRlcGVuZGVuY2llcy5cbiAgZ2V0TmF0aXZlTW9kdWxlRGVwZW5kZW5jeVBhdGhzOiAtPlxuICAgIG5hdGl2ZU1vZHVsZVBhdGhzID0gW11cblxuICAgIGlmIEBtZXRhZGF0YS5fYXRvbU1vZHVsZUNhY2hlP1xuICAgICAgcmVsYXRpdmVOYXRpdmVNb2R1bGVCaW5kaW5nUGF0aHMgPSBAbWV0YWRhdGEuX2F0b21Nb2R1bGVDYWNoZS5leHRlbnNpb25zP1snLm5vZGUnXSA/IFtdXG4gICAgICBmb3IgcmVsYXRpdmVOYXRpdmVNb2R1bGVCaW5kaW5nUGF0aCBpbiByZWxhdGl2ZU5hdGl2ZU1vZHVsZUJpbmRpbmdQYXRoc1xuICAgICAgICBuYXRpdmVNb2R1bGVQYXRoID0gcGF0aC5qb2luKEBwYXRoLCByZWxhdGl2ZU5hdGl2ZU1vZHVsZUJpbmRpbmdQYXRoLCAnLi4nLCAnLi4nLCAnLi4nKVxuICAgICAgICBuYXRpdmVNb2R1bGVQYXRocy5wdXNoKG5hdGl2ZU1vZHVsZVBhdGgpXG4gICAgICByZXR1cm4gbmF0aXZlTW9kdWxlUGF0aHNcblxuICAgIHRyYXZlcnNlUGF0aCA9IChub2RlTW9kdWxlc1BhdGgpID0+XG4gICAgICB0cnlcbiAgICAgICAgZm9yIG1vZHVsZVBhdGggaW4gZnMubGlzdFN5bmMobm9kZU1vZHVsZXNQYXRoKVxuICAgICAgICAgIG5hdGl2ZU1vZHVsZVBhdGhzLnB1c2gobW9kdWxlUGF0aCkgaWYgQGlzTmF0aXZlTW9kdWxlKG1vZHVsZVBhdGgpXG4gICAgICAgICAgdHJhdmVyc2VQYXRoKHBhdGguam9pbihtb2R1bGVQYXRoLCAnbm9kZV9tb2R1bGVzJykpXG4gICAgICByZXR1cm5cblxuICAgIHRyYXZlcnNlUGF0aChwYXRoLmpvaW4oQHBhdGgsICdub2RlX21vZHVsZXMnKSlcbiAgICBuYXRpdmVNb2R1bGVQYXRoc1xuXG4gICMjI1xuICBTZWN0aW9uOiBOYXRpdmUgTW9kdWxlIENvbXBhdGliaWxpdHlcbiAgIyMjXG5cbiAgIyBFeHRlbmRlZDogQXJlIGFsbCBuYXRpdmUgbW9kdWxlcyBkZXBlbmRlZCBvbiBieSB0aGlzIHBhY2thZ2UgY29ycmVjdGx5XG4gICMgY29tcGlsZWQgYWdhaW5zdCB0aGUgY3VycmVudCB2ZXJzaW9uIG9mIEF0b20/XG4gICNcbiAgIyBJbmNvbXBhdGlibGUgcGFja2FnZXMgY2Fubm90IGJlIGFjdGl2YXRlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0sIHRydWUgaWYgY29tcGF0aWJsZSwgZmFsc2UgaWYgaW5jb21wYXRpYmxlLlxuICBpc0NvbXBhdGlibGU6IC0+XG4gICAgcmV0dXJuIEBjb21wYXRpYmxlIGlmIEBjb21wYXRpYmxlP1xuXG4gICAgaWYgQHByZWxvYWRlZFBhY2thZ2VcbiAgICAgICMgUHJlbG9hZGVkIHBhY2thZ2VzIGFyZSBhbHdheXMgY29uc2lkZXJlZCBjb21wYXRpYmxlXG4gICAgICBAY29tcGF0aWJsZSA9IHRydWVcbiAgICBlbHNlIGlmIEBnZXRNYWluTW9kdWxlUGF0aCgpXG4gICAgICBAaW5jb21wYXRpYmxlTW9kdWxlcyA9IEBnZXRJbmNvbXBhdGlibGVOYXRpdmVNb2R1bGVzKClcbiAgICAgIEBjb21wYXRpYmxlID0gQGluY29tcGF0aWJsZU1vZHVsZXMubGVuZ3RoIGlzIDAgYW5kIG5vdCBAZ2V0QnVpbGRGYWlsdXJlT3V0cHV0KCk/XG4gICAgZWxzZVxuICAgICAgQGNvbXBhdGlibGUgPSB0cnVlXG5cbiAgIyBFeHRlbmRlZDogUmVidWlsZCBuYXRpdmUgbW9kdWxlcyBpbiB0aGlzIHBhY2thZ2UncyBkZXBlbmRlbmNpZXMgZm9yIHRoZVxuICAjIGN1cnJlbnQgdmVyc2lvbiBvZiBBdG9tLlxuICAjXG4gICMgUmV0dXJucyBhIHtQcm9taXNlfSB0aGF0IHJlc29sdmVzIHdpdGggYW4gb2JqZWN0IGNvbnRhaW5pbmcgYGNvZGVgLFxuICAjIGBzdGRvdXRgLCBhbmQgYHN0ZGVycmAgcHJvcGVydGllcyBiYXNlZCBvbiB0aGUgcmVzdWx0cyBvZiBydW5uaW5nXG4gICMgYGFwbSByZWJ1aWxkYCBvbiB0aGUgcGFja2FnZS5cbiAgcmVidWlsZDogLT5cbiAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSkgPT5cbiAgICAgIEBydW5SZWJ1aWxkUHJvY2VzcyAocmVzdWx0KSA9PlxuICAgICAgICBpZiByZXN1bHQuY29kZSBpcyAwXG4gICAgICAgICAgZ2xvYmFsLmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKEBnZXRCdWlsZEZhaWx1cmVPdXRwdXRTdG9yYWdlS2V5KCkpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAY29tcGF0aWJsZSA9IGZhbHNlXG4gICAgICAgICAgZ2xvYmFsLmxvY2FsU3RvcmFnZS5zZXRJdGVtKEBnZXRCdWlsZEZhaWx1cmVPdXRwdXRTdG9yYWdlS2V5KCksIHJlc3VsdC5zdGRlcnIpXG4gICAgICAgIGdsb2JhbC5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShAZ2V0SW5jb21wYXRpYmxlTmF0aXZlTW9kdWxlc1N0b3JhZ2VLZXkoKSwgJ1tdJylcbiAgICAgICAgcmVzb2x2ZShyZXN1bHQpXG5cbiAgIyBFeHRlbmRlZDogSWYgYSBwcmV2aW91cyByZWJ1aWxkIGZhaWxlZCwgZ2V0IHRoZSBjb250ZW50cyBvZiBzdGRlcnIuXG4gICNcbiAgIyBSZXR1cm5zIGEge1N0cmluZ30gb3IgbnVsbCBpZiBubyBwcmV2aW91cyBidWlsZCBmYWlsdXJlIG9jY3VycmVkLlxuICBnZXRCdWlsZEZhaWx1cmVPdXRwdXQ6IC0+XG4gICAgZ2xvYmFsLmxvY2FsU3RvcmFnZS5nZXRJdGVtKEBnZXRCdWlsZEZhaWx1cmVPdXRwdXRTdG9yYWdlS2V5KCkpXG5cbiAgcnVuUmVidWlsZFByb2Nlc3M6IChjYWxsYmFjaykgLT5cbiAgICBzdGRlcnIgPSAnJ1xuICAgIHN0ZG91dCA9ICcnXG4gICAgbmV3IEJ1ZmZlcmVkUHJvY2Vzcyh7XG4gICAgICBjb21tYW5kOiBAcGFja2FnZU1hbmFnZXIuZ2V0QXBtUGF0aCgpXG4gICAgICBhcmdzOiBbJ3JlYnVpbGQnLCAnLS1uby1jb2xvciddXG4gICAgICBvcHRpb25zOiB7Y3dkOiBAcGF0aH1cbiAgICAgIHN0ZGVycjogKG91dHB1dCkgLT4gc3RkZXJyICs9IG91dHB1dFxuICAgICAgc3Rkb3V0OiAob3V0cHV0KSAtPiBzdGRvdXQgKz0gb3V0cHV0XG4gICAgICBleGl0OiAoY29kZSkgLT4gY2FsbGJhY2soe2NvZGUsIHN0ZG91dCwgc3RkZXJyfSlcbiAgICB9KVxuXG4gIGdldEJ1aWxkRmFpbHVyZU91dHB1dFN0b3JhZ2VLZXk6IC0+XG4gICAgXCJpbnN0YWxsZWQtcGFja2FnZXM6I3tAbmFtZX06I3tAbWV0YWRhdGEudmVyc2lvbn06YnVpbGQtZXJyb3JcIlxuXG4gIGdldEluY29tcGF0aWJsZU5hdGl2ZU1vZHVsZXNTdG9yYWdlS2V5OiAtPlxuICAgIGVsZWN0cm9uVmVyc2lvbiA9IHByb2Nlc3MudmVyc2lvbnNbJ2VsZWN0cm9uJ10gPyBwcm9jZXNzLnZlcnNpb25zWydhdG9tLXNoZWxsJ11cbiAgICBcImluc3RhbGxlZC1wYWNrYWdlczoje0BuYW1lfToje0BtZXRhZGF0YS52ZXJzaW9ufTplbGVjdHJvbi0je2VsZWN0cm9uVmVyc2lvbn06aW5jb21wYXRpYmxlLW5hdGl2ZS1tb2R1bGVzXCJcblxuICBnZXRDYW5EZWZlck1haW5Nb2R1bGVSZXF1aXJlU3RvcmFnZUtleTogLT5cbiAgICBcImluc3RhbGxlZC1wYWNrYWdlczoje0BuYW1lfToje0BtZXRhZGF0YS52ZXJzaW9ufTpjYW4tZGVmZXItbWFpbi1tb2R1bGUtcmVxdWlyZVwiXG5cbiAgIyBHZXQgdGhlIGluY29tcGF0aWJsZSBuYXRpdmUgbW9kdWxlcyB0aGF0IHRoaXMgcGFja2FnZSBkZXBlbmRzIG9uLlxuICAjIFRoaXMgcmVjdXJzZXMgdGhyb3VnaCBhbGwgZGVwZW5kZW5jaWVzIGFuZCByZXF1aXJlcyBhbGwgbW9kdWxlcyB0aGF0XG4gICMgY29udGFpbiBhIGAubm9kZWAgZmlsZS5cbiAgI1xuICAjIFRoaXMgaW5mb3JtYXRpb24gaXMgY2FjaGVkIGluIGxvY2FsIHN0b3JhZ2Ugb24gYSBwZXIgcGFja2FnZS92ZXJzaW9uIGJhc2lzXG4gICMgdG8gbWluaW1pemUgdGhlIGltcGFjdCBvbiBzdGFydHVwIHRpbWUuXG4gIGdldEluY29tcGF0aWJsZU5hdGl2ZU1vZHVsZXM6IC0+XG4gICAgdW5sZXNzIEBwYWNrYWdlTWFuYWdlci5kZXZNb2RlXG4gICAgICB0cnlcbiAgICAgICAgaWYgYXJyYXlBc1N0cmluZyA9IGdsb2JhbC5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShAZ2V0SW5jb21wYXRpYmxlTmF0aXZlTW9kdWxlc1N0b3JhZ2VLZXkoKSlcbiAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShhcnJheUFzU3RyaW5nKVxuXG4gICAgaW5jb21wYXRpYmxlTmF0aXZlTW9kdWxlcyA9IFtdXG4gICAgZm9yIG5hdGl2ZU1vZHVsZVBhdGggaW4gQGdldE5hdGl2ZU1vZHVsZURlcGVuZGVuY3lQYXRocygpXG4gICAgICB0cnlcbiAgICAgICAgcmVxdWlyZShuYXRpdmVNb2R1bGVQYXRoKVxuICAgICAgY2F0Y2ggZXJyb3JcbiAgICAgICAgdHJ5XG4gICAgICAgICAgdmVyc2lvbiA9IHJlcXVpcmUoXCIje25hdGl2ZU1vZHVsZVBhdGh9L3BhY2thZ2UuanNvblwiKS52ZXJzaW9uXG4gICAgICAgIGluY29tcGF0aWJsZU5hdGl2ZU1vZHVsZXMucHVzaFxuICAgICAgICAgIHBhdGg6IG5hdGl2ZU1vZHVsZVBhdGhcbiAgICAgICAgICBuYW1lOiBwYXRoLmJhc2VuYW1lKG5hdGl2ZU1vZHVsZVBhdGgpXG4gICAgICAgICAgdmVyc2lvbjogdmVyc2lvblxuICAgICAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXG5cbiAgICBnbG9iYWwubG9jYWxTdG9yYWdlLnNldEl0ZW0oQGdldEluY29tcGF0aWJsZU5hdGl2ZU1vZHVsZXNTdG9yYWdlS2V5KCksIEpTT04uc3RyaW5naWZ5KGluY29tcGF0aWJsZU5hdGl2ZU1vZHVsZXMpKVxuICAgIGluY29tcGF0aWJsZU5hdGl2ZU1vZHVsZXNcblxuICBoYW5kbGVFcnJvcjogKG1lc3NhZ2UsIGVycm9yKSAtPlxuICAgIGlmIGF0b20uaW5TcGVjTW9kZSgpXG4gICAgICB0aHJvdyBlcnJvclxuXG4gICAgaWYgZXJyb3IuZmlsZW5hbWUgYW5kIGVycm9yLmxvY2F0aW9uIGFuZCAoZXJyb3IgaW5zdGFuY2VvZiBTeW50YXhFcnJvcilcbiAgICAgIGxvY2F0aW9uID0gXCIje2Vycm9yLmZpbGVuYW1lfToje2Vycm9yLmxvY2F0aW9uLmZpcnN0X2xpbmUgKyAxfToje2Vycm9yLmxvY2F0aW9uLmZpcnN0X2NvbHVtbiArIDF9XCJcbiAgICAgIGRldGFpbCA9IFwiI3tlcnJvci5tZXNzYWdlfSBpbiAje2xvY2F0aW9ufVwiXG4gICAgICBzdGFjayA9IFwiXCJcIlxuICAgICAgICBTeW50YXhFcnJvcjogI3tlcnJvci5tZXNzYWdlfVxuICAgICAgICAgIGF0ICN7bG9jYXRpb259XG4gICAgICBcIlwiXCJcbiAgICBlbHNlIGlmIGVycm9yLmxlc3MgYW5kIGVycm9yLmZpbGVuYW1lIGFuZCBlcnJvci5jb2x1bW4/IGFuZCBlcnJvci5saW5lP1xuICAgICAgIyBMZXNzIGVycm9yc1xuICAgICAgbG9jYXRpb24gPSBcIiN7ZXJyb3IuZmlsZW5hbWV9OiN7ZXJyb3IubGluZX06I3tlcnJvci5jb2x1bW59XCJcbiAgICAgIGRldGFpbCA9IFwiI3tlcnJvci5tZXNzYWdlfSBpbiAje2xvY2F0aW9ufVwiXG4gICAgICBzdGFjayA9IFwiXCJcIlxuICAgICAgICBMZXNzRXJyb3I6ICN7ZXJyb3IubWVzc2FnZX1cbiAgICAgICAgICBhdCAje2xvY2F0aW9ufVxuICAgICAgXCJcIlwiXG4gICAgZWxzZVxuICAgICAgZGV0YWlsID0gZXJyb3IubWVzc2FnZVxuICAgICAgc3RhY2sgPSBlcnJvci5zdGFjayA/IGVycm9yXG5cbiAgICBAbm90aWZpY2F0aW9uTWFuYWdlci5hZGRGYXRhbEVycm9yKG1lc3NhZ2UsIHtzdGFjaywgZGV0YWlsLCBwYWNrYWdlTmFtZTogQG5hbWUsIGRpc21pc3NhYmxlOiB0cnVlfSlcbiJdfQ==
