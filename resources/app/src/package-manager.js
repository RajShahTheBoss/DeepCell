(function() {
  var CSON, Emitter, Package, PackageManager, ServiceHub, ThemePackage, _, fs, getDeprecatedPackageMetadata, isDeprecatedPackage, normalizePackageData, packageJSON, path, ref,
    slice = [].slice,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  path = require('path');

  normalizePackageData = null;

  _ = require('underscore-plus');

  Emitter = require('event-kit').Emitter;

  fs = require('fs-plus');

  CSON = require('season');

  ServiceHub = require('service-hub');

  Package = require('./package');

  ThemePackage = require('./theme-package');

  ref = require('./deprecated-packages'), isDeprecatedPackage = ref.isDeprecatedPackage, getDeprecatedPackageMetadata = ref.getDeprecatedPackageMetadata;

  packageJSON = require('../package.json');

  module.exports = PackageManager = (function() {
    function PackageManager(params) {
      var ref1, ref2;
      this.config = params.config, this.styleManager = params.styleManager, this.notificationManager = params.notificationManager, this.keymapManager = params.keymapManager, this.commandRegistry = params.commandRegistry, this.grammarRegistry = params.grammarRegistry, this.deserializerManager = params.deserializerManager, this.viewRegistry = params.viewRegistry;
      this.emitter = new Emitter;
      this.activationHookEmitter = new Emitter;
      this.packageDirPaths = [];
      this.deferredActivationHooks = [];
      this.triggeredActivationHooks = new Set();
      this.packagesCache = (ref1 = packageJSON._atomPackages) != null ? ref1 : {};
      this.packageDependencies = (ref2 = packageJSON.packageDependencies) != null ? ref2 : {};
      this.initialPackagesLoaded = false;
      this.initialPackagesActivated = false;
      this.preloadedPackages = {};
      this.loadedPackages = {};
      this.activePackages = {};
      this.activatingPackages = {};
      this.packageStates = {};
      this.serviceHub = new ServiceHub;
      this.packageActivators = [];
      this.registerPackageActivator(this, ['atom', 'textmate']);
    }

    PackageManager.prototype.initialize = function(params) {
      var configDirPath, safeMode;
      configDirPath = params.configDirPath, this.devMode = params.devMode, safeMode = params.safeMode, this.resourcePath = params.resourcePath;
      if ((configDirPath != null) && !safeMode) {
        if (this.devMode) {
          this.packageDirPaths.push(path.join(configDirPath, "dev", "packages"));
        }
        return this.packageDirPaths.push(path.join(configDirPath, "packages"));
      }
    };

    PackageManager.prototype.setContextMenuManager = function(contextMenuManager) {
      this.contextMenuManager = contextMenuManager;
    };

    PackageManager.prototype.setMenuManager = function(menuManager) {
      this.menuManager = menuManager;
    };

    PackageManager.prototype.setThemeManager = function(themeManager) {
      this.themeManager = themeManager;
    };

    PackageManager.prototype.reset = function() {
      var ref1, ref2;
      this.serviceHub.clear();
      this.deactivatePackages();
      this.loadedPackages = {};
      this.preloadedPackages = {};
      this.packageStates = {};
      this.packagesCache = (ref1 = packageJSON._atomPackages) != null ? ref1 : {};
      this.packageDependencies = (ref2 = packageJSON.packageDependencies) != null ? ref2 : {};
      return this.triggeredActivationHooks.clear();
    };


    /*
    Section: Event Subscription
     */

    PackageManager.prototype.onDidLoadInitialPackages = function(callback) {
      return this.emitter.on('did-load-initial-packages', callback);
    };

    PackageManager.prototype.onDidActivateInitialPackages = function(callback) {
      return this.emitter.on('did-activate-initial-packages', callback);
    };

    PackageManager.prototype.onDidActivatePackage = function(callback) {
      return this.emitter.on('did-activate-package', callback);
    };

    PackageManager.prototype.onDidDeactivatePackage = function(callback) {
      return this.emitter.on('did-deactivate-package', callback);
    };

    PackageManager.prototype.onDidLoadPackage = function(callback) {
      return this.emitter.on('did-load-package', callback);
    };

    PackageManager.prototype.onDidUnloadPackage = function(callback) {
      return this.emitter.on('did-unload-package', callback);
    };


    /*
    Section: Package system data
     */

    PackageManager.prototype.getApmPath = function() {
      var apmRoot, commandName, configPath;
      configPath = atom.config.get('core.apmPath');
      if (configPath) {
        return configPath;
      }
      if (this.apmPath != null) {
        return this.apmPath;
      }
      commandName = 'apm';
      if (process.platform === 'win32') {
        commandName += '.cmd';
      }
      apmRoot = path.join(process.resourcesPath, 'app', 'apm');
      this.apmPath = path.join(apmRoot, 'bin', commandName);
      if (!fs.isFileSync(this.apmPath)) {
        this.apmPath = path.join(apmRoot, 'node_modules', 'atom-package-manager', 'bin', commandName);
      }
      return this.apmPath;
    };

    PackageManager.prototype.getPackageDirPaths = function() {
      return _.clone(this.packageDirPaths);
    };


    /*
    Section: General package data
     */

    PackageManager.prototype.resolvePackagePath = function(name) {
      var packagePath;
      if (fs.isDirectorySync(name)) {
        return name;
      }
      packagePath = fs.resolve.apply(fs, slice.call(this.packageDirPaths).concat([name]));
      if (fs.isDirectorySync(packagePath)) {
        return packagePath;
      }
      packagePath = path.join(this.resourcePath, 'node_modules', name);
      if (this.hasAtomEngine(packagePath)) {
        return packagePath;
      }
    };

    PackageManager.prototype.isBundledPackage = function(name) {
      return this.getPackageDependencies().hasOwnProperty(name);
    };

    PackageManager.prototype.isDeprecatedPackage = function(name, version) {
      return isDeprecatedPackage(name, version);
    };

    PackageManager.prototype.getDeprecatedPackageMetadata = function(name) {
      return getDeprecatedPackageMetadata(name);
    };


    /*
    Section: Enabling and disabling packages
     */

    PackageManager.prototype.enablePackage = function(name) {
      var pack;
      pack = this.loadPackage(name);
      if (pack != null) {
        pack.enable();
      }
      return pack;
    };

    PackageManager.prototype.disablePackage = function(name) {
      var pack;
      pack = this.loadPackage(name);
      if (!this.isPackageDisabled(name)) {
        if (pack != null) {
          pack.disable();
        }
      }
      return pack;
    };

    PackageManager.prototype.isPackageDisabled = function(name) {
      var ref1;
      return _.include((ref1 = this.config.get('core.disabledPackages')) != null ? ref1 : [], name);
    };


    /*
    Section: Accessing active packages
     */

    PackageManager.prototype.getActivePackages = function() {
      return _.values(this.activePackages);
    };

    PackageManager.prototype.getActivePackage = function(name) {
      return this.activePackages[name];
    };

    PackageManager.prototype.isPackageActive = function(name) {
      return this.getActivePackage(name) != null;
    };

    PackageManager.prototype.hasActivatedInitialPackages = function() {
      return this.initialPackagesActivated;
    };


    /*
    Section: Accessing loaded packages
     */

    PackageManager.prototype.getLoadedPackages = function() {
      return _.values(this.loadedPackages);
    };

    PackageManager.prototype.getLoadedPackagesForTypes = function(types) {
      var i, len, pack, ref1, ref2, results;
      ref1 = this.getLoadedPackages();
      results = [];
      for (i = 0, len = ref1.length; i < len; i++) {
        pack = ref1[i];
        if (ref2 = pack.getType(), indexOf.call(types, ref2) >= 0) {
          results.push(pack);
        }
      }
      return results;
    };

    PackageManager.prototype.getLoadedPackage = function(name) {
      return this.loadedPackages[name];
    };

    PackageManager.prototype.isPackageLoaded = function(name) {
      return this.getLoadedPackage(name) != null;
    };

    PackageManager.prototype.hasLoadedInitialPackages = function() {
      return this.initialPackagesLoaded;
    };


    /*
    Section: Accessing available packages
     */

    PackageManager.prototype.getAvailablePackagePaths = function() {
      return this.getAvailablePackages().map(function(a) {
        return a.path;
      });
    };

    PackageManager.prototype.getAvailablePackageNames = function() {
      return this.getAvailablePackages().map(function(a) {
        return a.name;
      });
    };

    PackageManager.prototype.getAvailablePackageMetadata = function() {
      var i, len, metadata, pack, packages, ref1, ref2, ref3;
      packages = [];
      ref1 = this.getAvailablePackages();
      for (i = 0, len = ref1.length; i < len; i++) {
        pack = ref1[i];
        metadata = (ref2 = (ref3 = this.getLoadedPackage(pack.name)) != null ? ref3.metadata : void 0) != null ? ref2 : this.loadPackageMetadata(pack, true);
        packages.push(metadata);
      }
      return packages;
    };

    PackageManager.prototype.getAvailablePackages = function() {
      var i, j, len, len1, packageDirPath, packageName, packagePath, packages, packagesByName, ref1, ref2;
      packages = [];
      packagesByName = new Set();
      ref1 = this.packageDirPaths;
      for (i = 0, len = ref1.length; i < len; i++) {
        packageDirPath = ref1[i];
        if (fs.isDirectorySync(packageDirPath)) {
          ref2 = fs.readdirSync(packageDirPath);
          for (j = 0, len1 = ref2.length; j < len1; j++) {
            packagePath = ref2[j];
            packagePath = path.join(packageDirPath, packagePath);
            packageName = path.basename(packagePath);
            if (!packageName.startsWith('.') && !packagesByName.has(packageName) && fs.isDirectorySync(packagePath)) {
              packages.push({
                name: packageName,
                path: packagePath,
                isBundled: false
              });
              packagesByName.add(packageName);
            }
          }
        }
      }
      for (packageName in this.packageDependencies) {
        if (!packagesByName.has(packageName)) {
          packages.push({
            name: packageName,
            path: path.join(this.resourcePath, 'node_modules', packageName),
            isBundled: true
          });
        }
      }
      return packages.sort(function(a, b) {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
    };


    /*
    Section: Private
     */

    PackageManager.prototype.getPackageState = function(name) {
      return this.packageStates[name];
    };

    PackageManager.prototype.setPackageState = function(name, state) {
      return this.packageStates[name] = state;
    };

    PackageManager.prototype.getPackageDependencies = function() {
      return this.packageDependencies;
    };

    PackageManager.prototype.hasAtomEngine = function(packagePath) {
      var metadata, ref1;
      metadata = this.loadPackageMetadata(packagePath, true);
      return (metadata != null ? (ref1 = metadata.engines) != null ? ref1.atom : void 0 : void 0) != null;
    };

    PackageManager.prototype.unobserveDisabledPackages = function() {
      var ref1;
      if ((ref1 = this.disabledPackagesSubscription) != null) {
        ref1.dispose();
      }
      return this.disabledPackagesSubscription = null;
    };

    PackageManager.prototype.observeDisabledPackages = function() {
      return this.disabledPackagesSubscription != null ? this.disabledPackagesSubscription : this.disabledPackagesSubscription = this.config.onDidChange('core.disabledPackages', (function(_this) {
        return function(arg) {
          var i, j, len, len1, newValue, oldValue, packageName, packagesToDisable, packagesToEnable;
          newValue = arg.newValue, oldValue = arg.oldValue;
          packagesToEnable = _.difference(oldValue, newValue);
          packagesToDisable = _.difference(newValue, oldValue);
          for (i = 0, len = packagesToDisable.length; i < len; i++) {
            packageName = packagesToDisable[i];
            if (_this.getActivePackage(packageName)) {
              _this.deactivatePackage(packageName);
            }
          }
          for (j = 0, len1 = packagesToEnable.length; j < len1; j++) {
            packageName = packagesToEnable[j];
            _this.activatePackage(packageName);
          }
          return null;
        };
      })(this));
    };

    PackageManager.prototype.unobservePackagesWithKeymapsDisabled = function() {
      var ref1;
      if ((ref1 = this.packagesWithKeymapsDisabledSubscription) != null) {
        ref1.dispose();
      }
      return this.packagesWithKeymapsDisabledSubscription = null;
    };

    PackageManager.prototype.observePackagesWithKeymapsDisabled = function() {
      return this.packagesWithKeymapsDisabledSubscription != null ? this.packagesWithKeymapsDisabledSubscription : this.packagesWithKeymapsDisabledSubscription = this.config.onDidChange('core.packagesWithKeymapsDisabled', (function(_this) {
        return function(arg) {
          var disabledPackageNames, i, j, keymapsToDisable, keymapsToEnable, len, len1, newValue, oldValue, packageName, ref1, ref2;
          newValue = arg.newValue, oldValue = arg.oldValue;
          keymapsToEnable = _.difference(oldValue, newValue);
          keymapsToDisable = _.difference(newValue, oldValue);
          disabledPackageNames = new Set(_this.config.get('core.disabledPackages'));
          for (i = 0, len = keymapsToDisable.length; i < len; i++) {
            packageName = keymapsToDisable[i];
            if (!disabledPackageNames.has(packageName)) {
              if ((ref1 = _this.getLoadedPackage(packageName)) != null) {
                ref1.deactivateKeymaps();
              }
            }
          }
          for (j = 0, len1 = keymapsToEnable.length; j < len1; j++) {
            packageName = keymapsToEnable[j];
            if (!disabledPackageNames.has(packageName)) {
              if ((ref2 = _this.getLoadedPackage(packageName)) != null) {
                ref2.activateKeymaps();
              }
            }
          }
          return null;
        };
      })(this));
    };

    PackageManager.prototype.preloadPackages = function() {
      var pack, packageName, ref1, results;
      ref1 = this.packagesCache;
      results = [];
      for (packageName in ref1) {
        pack = ref1[packageName];
        results.push(this.preloadPackage(packageName, pack));
      }
      return results;
    };

    PackageManager.prototype.preloadPackage = function(packageName, pack) {
      var metadata, options, ref1, ref2;
      metadata = (ref1 = pack.metadata) != null ? ref1 : {};
      if (!(typeof metadata.name === 'string' && metadata.name.length > 0)) {
        metadata.name = packageName;
      }
      if (((ref2 = metadata.repository) != null ? ref2.type : void 0) === 'git' && typeof metadata.repository.url === 'string') {
        metadata.repository.url = metadata.repository.url.replace(/(^git\+)|(\.git$)/g, '');
      }
      options = {
        path: pack.rootDirPath,
        name: packageName,
        preloadedPackage: true,
        bundledPackage: true,
        metadata: metadata,
        packageManager: this,
        config: this.config,
        styleManager: this.styleManager,
        commandRegistry: this.commandRegistry,
        keymapManager: this.keymapManager,
        notificationManager: this.notificationManager,
        grammarRegistry: this.grammarRegistry,
        themeManager: this.themeManager,
        menuManager: this.menuManager,
        contextMenuManager: this.contextMenuManager,
        deserializerManager: this.deserializerManager,
        viewRegistry: this.viewRegistry
      };
      if (metadata.theme) {
        pack = new ThemePackage(options);
      } else {
        pack = new Package(options);
      }
      pack.preload();
      return this.preloadedPackages[packageName] = pack;
    };

    PackageManager.prototype.loadPackages = function() {
      var disabledPackageNames;
      require('../exports/atom');
      disabledPackageNames = new Set(this.config.get('core.disabledPackages'));
      this.config.transact((function(_this) {
        return function() {
          var i, len, pack, ref1;
          ref1 = _this.getAvailablePackages();
          for (i = 0, len = ref1.length; i < len; i++) {
            pack = ref1[i];
            _this.loadAvailablePackage(pack, disabledPackageNames);
          }
        };
      })(this));
      this.initialPackagesLoaded = true;
      return this.emitter.emit('did-load-initial-packages');
    };

    PackageManager.prototype.loadPackage = function(nameOrPath) {
      var name, pack, packagePath;
      if (path.basename(nameOrPath)[0].match(/^\./)) {
        return null;
      } else if (pack = this.getLoadedPackage(nameOrPath)) {
        return pack;
      } else if (packagePath = this.resolvePackagePath(nameOrPath)) {
        name = path.basename(nameOrPath);
        return this.loadAvailablePackage({
          name: name,
          path: packagePath,
          isBundled: this.isBundledPackagePath(packagePath)
        });
      } else {
        console.warn("Could not resolve '" + nameOrPath + "' to a package path");
        return null;
      }
    };

    PackageManager.prototype.loadAvailablePackage = function(availablePackage, disabledPackageNames) {
      var error, loadedPackage, metadata, options, pack, preloadedPackage, ref1;
      preloadedPackage = this.preloadedPackages[availablePackage.name];
      if (disabledPackageNames != null ? disabledPackageNames.has(availablePackage.name) : void 0) {
        if (preloadedPackage != null) {
          preloadedPackage.deactivate();
          return delete preloadedPackage[availablePackage.name];
        }
      } else {
        loadedPackage = this.getLoadedPackage(availablePackage.name);
        if (loadedPackage != null) {
          return loadedPackage;
        } else {
          if (preloadedPackage != null) {
            if (availablePackage.isBundled) {
              preloadedPackage.finishLoading();
              this.loadedPackages[availablePackage.name] = preloadedPackage;
              return preloadedPackage;
            } else {
              preloadedPackage.deactivate();
              delete preloadedPackage[availablePackage.name];
            }
          }
          try {
            metadata = (ref1 = this.loadPackageMetadata(availablePackage)) != null ? ref1 : {};
          } catch (error1) {
            error = error1;
            this.handleMetadataError(error, availablePackage.path);
            return null;
          }
          if (!availablePackage.isBundled) {
            if (this.isDeprecatedPackage(metadata.name, metadata.version)) {
              console.warn("Could not load " + metadata.name + "@" + metadata.version + " because it uses deprecated APIs that have been removed.");
              return null;
            }
          }
          options = {
            path: availablePackage.path,
            name: availablePackage.name,
            metadata: metadata,
            bundledPackage: availablePackage.isBundled,
            packageManager: this,
            config: this.config,
            styleManager: this.styleManager,
            commandRegistry: this.commandRegistry,
            keymapManager: this.keymapManager,
            notificationManager: this.notificationManager,
            grammarRegistry: this.grammarRegistry,
            themeManager: this.themeManager,
            menuManager: this.menuManager,
            contextMenuManager: this.contextMenuManager,
            deserializerManager: this.deserializerManager,
            viewRegistry: this.viewRegistry
          };
          if (metadata.theme) {
            pack = new ThemePackage(options);
          } else {
            pack = new Package(options);
          }
          pack.load();
          this.loadedPackages[pack.name] = pack;
          this.emitter.emit('did-load-package', pack);
          return pack;
        }
      }
    };

    PackageManager.prototype.unloadPackages = function() {
      var i, len, name, ref1;
      ref1 = _.keys(this.loadedPackages);
      for (i = 0, len = ref1.length; i < len; i++) {
        name = ref1[i];
        this.unloadPackage(name);
      }
      return null;
    };

    PackageManager.prototype.unloadPackage = function(name) {
      var pack;
      if (this.isPackageActive(name)) {
        throw new Error("Tried to unload active package '" + name + "'");
      }
      if (pack = this.getLoadedPackage(name)) {
        delete this.loadedPackages[pack.name];
        return this.emitter.emit('did-unload-package', pack);
      } else {
        throw new Error("No loaded package for name '" + name + "'");
      }
    };

    PackageManager.prototype.activate = function() {
      var activator, i, len, packages, promises, ref1, ref2, types;
      promises = [];
      ref1 = this.packageActivators;
      for (i = 0, len = ref1.length; i < len; i++) {
        ref2 = ref1[i], activator = ref2[0], types = ref2[1];
        packages = this.getLoadedPackagesForTypes(types);
        promises = promises.concat(activator.activatePackages(packages));
      }
      return Promise.all(promises).then((function(_this) {
        return function() {
          _this.triggerDeferredActivationHooks();
          _this.initialPackagesActivated = true;
          return _this.emitter.emit('did-activate-initial-packages');
        };
      })(this));
    };

    PackageManager.prototype.registerPackageActivator = function(activator, types) {
      return this.packageActivators.push([activator, types]);
    };

    PackageManager.prototype.activatePackages = function(packages) {
      var promises;
      promises = [];
      this.config.transactAsync((function(_this) {
        return function() {
          var i, len, pack, promise;
          for (i = 0, len = packages.length; i < len; i++) {
            pack = packages[i];
            promise = _this.activatePackage(pack.name);
            if (!pack.activationShouldBeDeferred()) {
              promises.push(promise);
            }
          }
          return Promise.all(promises);
        };
      })(this));
      this.observeDisabledPackages();
      this.observePackagesWithKeymapsDisabled();
      return promises;
    };

    PackageManager.prototype.activatePackage = function(name) {
      var activationPromise, pack;
      if (pack = this.getActivePackage(name)) {
        return Promise.resolve(pack);
      } else if (pack = this.loadPackage(name)) {
        this.activatingPackages[pack.name] = pack;
        activationPromise = pack.activate().then((function(_this) {
          return function() {
            if (_this.activatingPackages[pack.name] != null) {
              delete _this.activatingPackages[pack.name];
              _this.activePackages[pack.name] = pack;
              _this.emitter.emit('did-activate-package', pack);
            }
            return pack;
          };
        })(this));
        if (this.deferredActivationHooks == null) {
          this.triggeredActivationHooks.forEach((function(_this) {
            return function(hook) {
              return _this.activationHookEmitter.emit(hook);
            };
          })(this));
        }
        return activationPromise;
      } else {
        return Promise.reject(new Error("Failed to load package '" + name + "'"));
      }
    };

    PackageManager.prototype.triggerDeferredActivationHooks = function() {
      var hook, i, len, ref1;
      if (this.deferredActivationHooks == null) {
        return;
      }
      ref1 = this.deferredActivationHooks;
      for (i = 0, len = ref1.length; i < len; i++) {
        hook = ref1[i];
        this.activationHookEmitter.emit(hook);
      }
      return this.deferredActivationHooks = null;
    };

    PackageManager.prototype.triggerActivationHook = function(hook) {
      if (!((hook != null) && _.isString(hook) && hook.length > 0)) {
        return new Error("Cannot trigger an empty activation hook");
      }
      this.triggeredActivationHooks.add(hook);
      if (this.deferredActivationHooks != null) {
        return this.deferredActivationHooks.push(hook);
      } else {
        return this.activationHookEmitter.emit(hook);
      }
    };

    PackageManager.prototype.onDidTriggerActivationHook = function(hook, callback) {
      if (!((hook != null) && _.isString(hook) && hook.length > 0)) {
        return;
      }
      return this.activationHookEmitter.on(hook, callback);
    };

    PackageManager.prototype.serialize = function() {
      var i, len, pack, ref1;
      ref1 = this.getActivePackages();
      for (i = 0, len = ref1.length; i < len; i++) {
        pack = ref1[i];
        this.serializePackage(pack);
      }
      return this.packageStates;
    };

    PackageManager.prototype.serializePackage = function(pack) {
      var state;
      if (state = typeof pack.serialize === "function" ? pack.serialize() : void 0) {
        return this.setPackageState(pack.name, state);
      }
    };

    PackageManager.prototype.deactivatePackages = function() {
      this.config.transact((function(_this) {
        return function() {
          var i, len, pack, ref1;
          ref1 = _this.getLoadedPackages();
          for (i = 0, len = ref1.length; i < len; i++) {
            pack = ref1[i];
            _this.deactivatePackage(pack.name, true);
          }
        };
      })(this));
      this.unobserveDisabledPackages();
      return this.unobservePackagesWithKeymapsDisabled();
    };

    PackageManager.prototype.deactivatePackage = function(name, suppressSerialization) {
      var pack;
      pack = this.getLoadedPackage(name);
      if (!suppressSerialization && this.isPackageActive(pack.name)) {
        this.serializePackage(pack);
      }
      pack.deactivate();
      delete this.activePackages[pack.name];
      delete this.activatingPackages[pack.name];
      return this.emitter.emit('did-deactivate-package', pack);
    };

    PackageManager.prototype.handleMetadataError = function(error, packagePath) {
      var detail, message, metadataPath, stack;
      metadataPath = path.join(packagePath, 'package.json');
      detail = error.message + " in " + metadataPath;
      stack = error.stack + "\n  at " + metadataPath + ":1:1";
      message = "Failed to load the " + (path.basename(packagePath)) + " package";
      return this.notificationManager.addError(message, {
        stack: stack,
        detail: detail,
        packageName: path.basename(packagePath),
        dismissable: true
      });
    };

    PackageManager.prototype.uninstallDirectory = function(directory) {
      var dirPromise, symlinkPromise;
      symlinkPromise = new Promise(function(resolve) {
        return fs.isSymbolicLink(directory, function(isSymLink) {
          return resolve(isSymLink);
        });
      });
      dirPromise = new Promise(function(resolve) {
        return fs.isDirectory(directory, function(isDir) {
          return resolve(isDir);
        });
      });
      return Promise.all([symlinkPromise, dirPromise]).then(function(values) {
        var isDir, isSymLink;
        isSymLink = values[0], isDir = values[1];
        if (!isSymLink && isDir) {
          return fs.remove(directory, function() {});
        }
      });
    };

    PackageManager.prototype.reloadActivePackageStyleSheets = function() {
      var i, len, pack, ref1;
      ref1 = this.getActivePackages();
      for (i = 0, len = ref1.length; i < len; i++) {
        pack = ref1[i];
        if (pack.getType() !== 'theme') {
          if (typeof pack.reloadStylesheets === "function") {
            pack.reloadStylesheets();
          }
        }
      }
    };

    PackageManager.prototype.isBundledPackagePath = function(packagePath) {
      if (this.devMode) {
        if (!this.resourcePath.startsWith("" + process.resourcesPath + path.sep)) {
          return false;
        }
      }
      if (this.resourcePathWithTrailingSlash == null) {
        this.resourcePathWithTrailingSlash = "" + this.resourcePath + path.sep;
      }
      return packagePath != null ? packagePath.startsWith(this.resourcePathWithTrailingSlash) : void 0;
    };

    PackageManager.prototype.loadPackageMetadata = function(packagePathOrAvailablePackage, ignoreErrors) {
      var availablePackage, error, isBundled, metadata, metadataPath, packageName, packagePath, ref1, ref2;
      if (ignoreErrors == null) {
        ignoreErrors = false;
      }
      if (typeof packagePathOrAvailablePackage === 'object') {
        availablePackage = packagePathOrAvailablePackage;
        packageName = availablePackage.name;
        packagePath = availablePackage.path;
        isBundled = availablePackage.isBundled;
      } else {
        packagePath = packagePathOrAvailablePackage;
        packageName = path.basename(packagePath);
        isBundled = this.isBundledPackagePath(packagePath);
      }
      if (isBundled) {
        metadata = (ref1 = this.packagesCache[packageName]) != null ? ref1.metadata : void 0;
      }
      if (metadata == null) {
        if (metadataPath = CSON.resolve(path.join(packagePath, 'package'))) {
          try {
            metadata = CSON.readFileSync(metadataPath);
            this.normalizePackageMetadata(metadata);
          } catch (error1) {
            error = error1;
            if (!ignoreErrors) {
              throw error;
            }
          }
        }
      }
      if (metadata == null) {
        metadata = {};
      }
      if (!(typeof metadata.name === 'string' && metadata.name.length > 0)) {
        metadata.name = packageName;
      }
      if (((ref2 = metadata.repository) != null ? ref2.type : void 0) === 'git' && typeof metadata.repository.url === 'string') {
        metadata.repository.url = metadata.repository.url.replace(/(^git\+)|(\.git$)/g, '');
      }
      return metadata;
    };

    PackageManager.prototype.normalizePackageMetadata = function(metadata) {
      if (!(metadata != null ? metadata._id : void 0)) {
        if (normalizePackageData == null) {
          normalizePackageData = require('normalize-package-data');
        }
        return normalizePackageData(metadata);
      }
    };

    return PackageManager;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3BhY2thZ2UtbWFuYWdlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLHdLQUFBO0lBQUE7OztFQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxvQkFBQSxHQUF1Qjs7RUFFdkIsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxpQkFBUjs7RUFDSCxVQUFXLE9BQUEsQ0FBUSxXQUFSOztFQUNaLEVBQUEsR0FBSyxPQUFBLENBQVEsU0FBUjs7RUFDTCxJQUFBLEdBQU8sT0FBQSxDQUFRLFFBQVI7O0VBRVAsVUFBQSxHQUFhLE9BQUEsQ0FBUSxhQUFSOztFQUNiLE9BQUEsR0FBVSxPQUFBLENBQVEsV0FBUjs7RUFDVixZQUFBLEdBQWUsT0FBQSxDQUFRLGlCQUFSOztFQUNmLE1BQXNELE9BQUEsQ0FBUSx1QkFBUixDQUF0RCxFQUFDLDZDQUFELEVBQXNCOztFQUN0QixXQUFBLEdBQWMsT0FBQSxDQUFRLGlCQUFSOztFQWlCZCxNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1Msd0JBQUMsTUFBRDtBQUNYLFVBQUE7TUFDRSxJQUFDLENBQUEsZ0JBQUEsTUFESCxFQUNXLElBQUMsQ0FBQSxzQkFBQSxZQURaLEVBQzBCLElBQUMsQ0FBQSw2QkFBQSxtQkFEM0IsRUFDZ0QsSUFBQyxDQUFBLHVCQUFBLGFBRGpELEVBRUUsSUFBQyxDQUFBLHlCQUFBLGVBRkgsRUFFb0IsSUFBQyxDQUFBLHlCQUFBLGVBRnJCLEVBRXNDLElBQUMsQ0FBQSw2QkFBQSxtQkFGdkMsRUFFNEQsSUFBQyxDQUFBLHNCQUFBO01BRzdELElBQUMsQ0FBQSxPQUFELEdBQVcsSUFBSTtNQUNmLElBQUMsQ0FBQSxxQkFBRCxHQUF5QixJQUFJO01BQzdCLElBQUMsQ0FBQSxlQUFELEdBQW1CO01BQ25CLElBQUMsQ0FBQSx1QkFBRCxHQUEyQjtNQUMz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QUFIO1FBQ0UsUUFBQSwwREFBc0MsQ0FBRSxrQkFEMUM7O01BR0EsSUFBTyxnQkFBUDtRQUNFLElBQUcsWUFBQSxHQUFlLElBQUksQ0FBQyxPQUFMLENBQWEsSUFBSSxDQUFDLElBQUwsQ0FBVSxXQUFWLEVBQXVCLFNBQXZCLENBQWIsQ0FBbEI7QUFDRTtZQUNFLFFBQUEsR0FBVyxJQUFJLENBQUMsWUFBTCxDQUFrQixZQUFsQjtZQUNYLElBQUMsQ0FBQSx3QkFBRCxDQUEwQixRQUExQixFQUZGO1dBQUEsY0FBQTtZQUdNO1lBQ0osSUFBQSxDQUFtQixZQUFuQjtBQUFBLG9CQUFNLE1BQU47YUFKRjtXQURGO1NBREY7OztRQVFBLFdBQVk7O01BQ1osSUFBQSxDQUFBLENBQU8sT0FBTyxRQUFRLENBQUMsSUFBaEIsS0FBd0IsUUFBeEIsSUFBcUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFkLEdBQXVCLENBQW5FLENBQUE7UUFDRSxRQUFRLENBQUMsSUFBVCxHQUFnQixZQURsQjs7TUFHQSxnREFBc0IsQ0FBRSxjQUFyQixLQUE2QixLQUE3QixJQUF1QyxPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBM0IsS0FBa0MsUUFBNUU7UUFDRSxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQXBCLEdBQTBCLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQXhCLENBQWdDLG9CQUFoQyxFQUFzRCxFQUF0RCxFQUQ1Qjs7YUFHQTtJQTdCbUI7OzZCQStCckIsd0JBQUEsR0FBMEIsU0FBQyxRQUFEO01BQ3hCLElBQUEscUJBQU8sUUFBUSxDQUFFLGFBQWpCOztVQUNFLHVCQUF3QixPQUFBLENBQVEsd0JBQVI7O2VBQ3hCLG9CQUFBLENBQXFCLFFBQXJCLEVBRkY7O0lBRHdCOzs7OztBQXhvQjVCIiwic291cmNlc0NvbnRlbnQiOlsicGF0aCA9IHJlcXVpcmUgJ3BhdGgnXG5ub3JtYWxpemVQYWNrYWdlRGF0YSA9IG51bGxcblxuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbntFbWl0dGVyfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcbmZzID0gcmVxdWlyZSAnZnMtcGx1cydcbkNTT04gPSByZXF1aXJlICdzZWFzb24nXG5cblNlcnZpY2VIdWIgPSByZXF1aXJlICdzZXJ2aWNlLWh1YidcblBhY2thZ2UgPSByZXF1aXJlICcuL3BhY2thZ2UnXG5UaGVtZVBhY2thZ2UgPSByZXF1aXJlICcuL3RoZW1lLXBhY2thZ2UnXG57aXNEZXByZWNhdGVkUGFja2FnZSwgZ2V0RGVwcmVjYXRlZFBhY2thZ2VNZXRhZGF0YX0gPSByZXF1aXJlICcuL2RlcHJlY2F0ZWQtcGFja2FnZXMnXG5wYWNrYWdlSlNPTiA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpXG5cbiMgRXh0ZW5kZWQ6IFBhY2thZ2UgbWFuYWdlciBmb3IgY29vcmRpbmF0aW5nIHRoZSBsaWZlY3ljbGUgb2YgQXRvbSBwYWNrYWdlcy5cbiNcbiMgQW4gaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcyBpcyBhbHdheXMgYXZhaWxhYmxlIGFzIHRoZSBgYXRvbS5wYWNrYWdlc2AgZ2xvYmFsLlxuI1xuIyBQYWNrYWdlcyBjYW4gYmUgbG9hZGVkLCBhY3RpdmF0ZWQsIGFuZCBkZWFjdGl2YXRlZCwgYW5kIHVubG9hZGVkOlxuIyAgKiBMb2FkaW5nIGEgcGFja2FnZSByZWFkcyBhbmQgcGFyc2VzIHRoZSBwYWNrYWdlJ3MgbWV0YWRhdGEgYW5kIHJlc291cmNlc1xuIyAgICBzdWNoIGFzIGtleW1hcHMsIG1lbnVzLCBzdHlsZXNoZWV0cywgZXRjLlxuIyAgKiBBY3RpdmF0aW5nIGEgcGFja2FnZSByZWdpc3RlcnMgdGhlIGxvYWRlZCByZXNvdXJjZXMgYW5kIGNhbGxzIGBhY3RpdmF0ZSgpYFxuIyAgICBvbiB0aGUgcGFja2FnZSdzIG1haW4gbW9kdWxlLlxuIyAgKiBEZWFjdGl2YXRpbmcgYSBwYWNrYWdlIHVucmVnaXN0ZXJzIHRoZSBwYWNrYWdlJ3MgcmVzb3VyY2VzICBhbmQgY2FsbHNcbiMgICAgYGRlYWN0aXZhdGUoKWAgb24gdGhlIHBhY2thZ2UncyBtYWluIG1vZHVsZS5cbiMgICogVW5sb2FkaW5nIGEgcGFja2FnZSByZW1vdmVzIGl0IGNvbXBsZXRlbHkgZnJvbSB0aGUgcGFja2FnZSBtYW5hZ2VyLlxuI1xuIyBQYWNrYWdlcyBjYW4gYmUgZW5hYmxlZC9kaXNhYmxlZCB2aWEgdGhlIGBjb3JlLmRpc2FibGVkUGFja2FnZXNgIGNvbmZpZ1xuIyBzZXR0aW5ncyBhbmQgYWxzbyBieSBjYWxsaW5nIGBlbmFibGVQYWNrYWdlKCkvZGlzYWJsZVBhY2thZ2UoKWAuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBQYWNrYWdlTWFuYWdlclxuICBjb25zdHJ1Y3RvcjogKHBhcmFtcykgLT5cbiAgICB7XG4gICAgICBAY29uZmlnLCBAc3R5bGVNYW5hZ2VyLCBAbm90aWZpY2F0aW9uTWFuYWdlciwgQGtleW1hcE1hbmFnZXIsXG4gICAgICBAY29tbWFuZFJlZ2lzdHJ5LCBAZ3JhbW1hclJlZ2lzdHJ5LCBAZGVzZXJpYWxpemVyTWFuYWdlciwgQHZpZXdSZWdpc3RyeVxuICAgIH0gPSBwYXJhbXNcblxuICAgIEBlbWl0dGVyID0gbmV3IEVtaXR0ZXJcbiAgICBAYWN0aXZhdGlvbkhvb2tFbWl0dGVyID0gbmV3IEVtaXR0ZXJcbiAgICBAcGFja2FnZURpclBhdGhzID0gW11cbiAgICBAZGVmZXJyZWRBY3RpdmF0aW9uSG9va3MgPSBbXVxuICAgIEB0cmlnZ2VyZWRBY3RpdmF0aW9uSG9va3MgPSBuZXcgU2V0KClcbiAgICBAcGFja2FnZXNDYWNoZSA9IHBhY2thZ2VKU09OLl9hdG9tUGFja2FnZXMgPyB7fVxuICAgIEBwYWNrYWdlRGVwZW5kZW5jaWVzID0gcGFja2FnZUpTT04ucGFja2FnZURlcGVuZGVuY2llcyA/IHt9XG4gICAgQGluaXRpYWxQYWNrYWdlc0xvYWRlZCA9IGZhbHNlXG4gICAgQGluaXRpYWxQYWNrYWdlc0FjdGl2YXRlZCA9IGZhbHNlXG4gICAgQHByZWxvYWRlZFBhY2thZ2VzID0ge31cbiAgICBAbG9hZGVkUGFja2FnZXMgPSB7fVxuICAgIEBhY3RpdmVQYWNrYWdlcyA9IHt9XG4gICAgQGFjdGl2YXRpbmdQYWNrYWdlcyA9IHt9XG4gICAgQHBhY2thZ2VTdGF0ZXMgPSB7fVxuICAgIEBzZXJ2aWNlSHViID0gbmV3IFNlcnZpY2VIdWJcblxuICAgIEBwYWNrYWdlQWN0aXZhdG9ycyA9IFtdXG4gICAgQHJlZ2lzdGVyUGFja2FnZUFjdGl2YXRvcih0aGlzLCBbJ2F0b20nLCAndGV4dG1hdGUnXSlcblxuICBpbml0aWFsaXplOiAocGFyYW1zKSAtPlxuICAgIHtjb25maWdEaXJQYXRoLCBAZGV2TW9kZSwgc2FmZU1vZGUsIEByZXNvdXJjZVBhdGh9ID0gcGFyYW1zXG4gICAgaWYgY29uZmlnRGlyUGF0aD8gYW5kIG5vdCBzYWZlTW9kZVxuICAgICAgaWYgQGRldk1vZGVcbiAgICAgICAgQHBhY2thZ2VEaXJQYXRocy5wdXNoKHBhdGguam9pbihjb25maWdEaXJQYXRoLCBcImRldlwiLCBcInBhY2thZ2VzXCIpKVxuICAgICAgQHBhY2thZ2VEaXJQYXRocy5wdXNoKHBhdGguam9pbihjb25maWdEaXJQYXRoLCBcInBhY2thZ2VzXCIpKVxuXG4gIHNldENvbnRleHRNZW51TWFuYWdlcjogKEBjb250ZXh0TWVudU1hbmFnZXIpIC0+XG5cbiAgc2V0TWVudU1hbmFnZXI6IChAbWVudU1hbmFnZXIpIC0+XG5cbiAgc2V0VGhlbWVNYW5hZ2VyOiAoQHRoZW1lTWFuYWdlcikgLT5cblxuICByZXNldDogLT5cbiAgICBAc2VydmljZUh1Yi5jbGVhcigpXG4gICAgQGRlYWN0aXZhdGVQYWNrYWdlcygpXG4gICAgQGxvYWRlZFBhY2thZ2VzID0ge31cbiAgICBAcHJlbG9hZGVkUGFja2FnZXMgPSB7fVxuICAgIEBwYWNrYWdlU3RhdGVzID0ge31cbiAgICBAcGFja2FnZXNDYWNoZSA9IHBhY2thZ2VKU09OLl9hdG9tUGFja2FnZXMgPyB7fVxuICAgIEBwYWNrYWdlRGVwZW5kZW5jaWVzID0gcGFja2FnZUpTT04ucGFja2FnZURlcGVuZGVuY2llcyA/IHt9XG4gICAgQHRyaWdnZXJlZEFjdGl2YXRpb25Ib29rcy5jbGVhcigpXG5cbiAgIyMjXG4gIFNlY3Rpb246IEV2ZW50IFN1YnNjcmlwdGlvblxuICAjIyNcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIGFsbCBwYWNrYWdlcyBoYXZlIGJlZW4gbG9hZGVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkTG9hZEluaXRpYWxQYWNrYWdlczogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtbG9hZC1pbml0aWFsLXBhY2thZ2VzJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIGFsbCBwYWNrYWdlcyBoYXZlIGJlZW4gYWN0aXZhdGVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQWN0aXZhdGVJbml0aWFsUGFja2FnZXM6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWFjdGl2YXRlLWluaXRpYWwtcGFja2FnZXMnLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gYSBwYWNrYWdlIGlzIGFjdGl2YXRlZC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCBBIHtGdW5jdGlvbn0gdG8gYmUgaW52b2tlZCB3aGVuIGEgcGFja2FnZSBpcyBhY3RpdmF0ZWQuXG4gICMgICAqIGBwYWNrYWdlYCBUaGUge1BhY2thZ2V9IHRoYXQgd2FzIGFjdGl2YXRlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQWN0aXZhdGVQYWNrYWdlOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1hY3RpdmF0ZS1wYWNrYWdlJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIGEgcGFja2FnZSBpcyBkZWFjdGl2YXRlZC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCBBIHtGdW5jdGlvbn0gdG8gYmUgaW52b2tlZCB3aGVuIGEgcGFja2FnZSBpcyBkZWFjdGl2YXRlZC5cbiAgIyAgICogYHBhY2thZ2VgIFRoZSB7UGFja2FnZX0gdGhhdCB3YXMgZGVhY3RpdmF0ZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZERlYWN0aXZhdGVQYWNrYWdlOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1kZWFjdGl2YXRlLXBhY2thZ2UnLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gYSBwYWNrYWdlIGlzIGxvYWRlZC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCBBIHtGdW5jdGlvbn0gdG8gYmUgaW52b2tlZCB3aGVuIGEgcGFja2FnZSBpcyBsb2FkZWQuXG4gICMgICAqIGBwYWNrYWdlYCBUaGUge1BhY2thZ2V9IHRoYXQgd2FzIGxvYWRlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkTG9hZFBhY2thZ2U6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWxvYWQtcGFja2FnZScsIGNhbGxiYWNrXG5cbiAgIyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiBhIHBhY2thZ2UgaXMgdW5sb2FkZWQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2AgQSB7RnVuY3Rpb259IHRvIGJlIGludm9rZWQgd2hlbiBhIHBhY2thZ2UgaXMgdW5sb2FkZWQuXG4gICMgICAqIGBwYWNrYWdlYCBUaGUge1BhY2thZ2V9IHRoYXQgd2FzIHVubG9hZGVkLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRVbmxvYWRQYWNrYWdlOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC11bmxvYWQtcGFja2FnZScsIGNhbGxiYWNrXG5cbiAgIyMjXG4gIFNlY3Rpb246IFBhY2thZ2Ugc3lzdGVtIGRhdGFcbiAgIyMjXG5cbiAgIyBQdWJsaWM6IEdldCB0aGUgcGF0aCB0byB0aGUgYXBtIGNvbW1hbmQuXG4gICNcbiAgIyBVc2VzIHRoZSB2YWx1ZSBvZiB0aGUgYGNvcmUuYXBtUGF0aGAgY29uZmlnIHNldHRpbmcgaWYgaXQgZXhpc3RzLlxuICAjXG4gICMgUmV0dXJuIGEge1N0cmluZ30gZmlsZSBwYXRoIHRvIGFwbS5cbiAgZ2V0QXBtUGF0aDogLT5cbiAgICBjb25maWdQYXRoID0gYXRvbS5jb25maWcuZ2V0KCdjb3JlLmFwbVBhdGgnKVxuICAgIHJldHVybiBjb25maWdQYXRoIGlmIGNvbmZpZ1BhdGhcbiAgICByZXR1cm4gQGFwbVBhdGggaWYgQGFwbVBhdGg/XG5cbiAgICBjb21tYW5kTmFtZSA9ICdhcG0nXG4gICAgY29tbWFuZE5hbWUgKz0gJy5jbWQnIGlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ3dpbjMyJ1xuICAgIGFwbVJvb3QgPSBwYXRoLmpvaW4ocHJvY2Vzcy5yZXNvdXJjZXNQYXRoLCAnYXBwJywgJ2FwbScpXG4gICAgQGFwbVBhdGggPSBwYXRoLmpvaW4oYXBtUm9vdCwgJ2JpbicsIGNvbW1hbmROYW1lKVxuICAgIHVubGVzcyBmcy5pc0ZpbGVTeW5jKEBhcG1QYXRoKVxuICAgICAgQGFwbVBhdGggPSBwYXRoLmpvaW4oYXBtUm9vdCwgJ25vZGVfbW9kdWxlcycsICdhdG9tLXBhY2thZ2UtbWFuYWdlcicsICdiaW4nLCBjb21tYW5kTmFtZSlcbiAgICBAYXBtUGF0aFxuXG4gICMgUHVibGljOiBHZXQgdGhlIHBhdGhzIGJlaW5nIHVzZWQgdG8gbG9vayBmb3IgcGFja2FnZXMuXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge1N0cmluZ30gZGlyZWN0b3J5IHBhdGhzLlxuICBnZXRQYWNrYWdlRGlyUGF0aHM6IC0+XG4gICAgXy5jbG9uZShAcGFja2FnZURpclBhdGhzKVxuXG4gICMjI1xuICBTZWN0aW9uOiBHZW5lcmFsIHBhY2thZ2UgZGF0YVxuICAjIyNcblxuICAjIFB1YmxpYzogUmVzb2x2ZSB0aGUgZ2l2ZW4gcGFja2FnZSBuYW1lIHRvIGEgcGF0aCBvbiBkaXNrLlxuICAjXG4gICMgKiBgbmFtZWAgLSBUaGUge1N0cmluZ30gcGFja2FnZSBuYW1lLlxuICAjXG4gICMgUmV0dXJuIGEge1N0cmluZ30gZm9sZGVyIHBhdGggb3IgdW5kZWZpbmVkIGlmIGl0IGNvdWxkIG5vdCBiZSByZXNvbHZlZC5cbiAgcmVzb2x2ZVBhY2thZ2VQYXRoOiAobmFtZSkgLT5cbiAgICByZXR1cm4gbmFtZSBpZiBmcy5pc0RpcmVjdG9yeVN5bmMobmFtZSlcblxuICAgIHBhY2thZ2VQYXRoID0gZnMucmVzb2x2ZShAcGFja2FnZURpclBhdGhzLi4uLCBuYW1lKVxuICAgIHJldHVybiBwYWNrYWdlUGF0aCBpZiBmcy5pc0RpcmVjdG9yeVN5bmMocGFja2FnZVBhdGgpXG5cbiAgICBwYWNrYWdlUGF0aCA9IHBhdGguam9pbihAcmVzb3VyY2VQYXRoLCAnbm9kZV9tb2R1bGVzJywgbmFtZSlcbiAgICByZXR1cm4gcGFja2FnZVBhdGggaWYgQGhhc0F0b21FbmdpbmUocGFja2FnZVBhdGgpXG5cbiAgIyBQdWJsaWM6IElzIHRoZSBwYWNrYWdlIHdpdGggdGhlIGdpdmVuIG5hbWUgYnVuZGxlZCB3aXRoIEF0b20/XG4gICNcbiAgIyAqIGBuYW1lYCAtIFRoZSB7U3RyaW5nfSBwYWNrYWdlIG5hbWUuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICBpc0J1bmRsZWRQYWNrYWdlOiAobmFtZSkgLT5cbiAgICBAZ2V0UGFja2FnZURlcGVuZGVuY2llcygpLmhhc093blByb3BlcnR5KG5hbWUpXG5cbiAgaXNEZXByZWNhdGVkUGFja2FnZTogKG5hbWUsIHZlcnNpb24pIC0+XG4gICAgaXNEZXByZWNhdGVkUGFja2FnZShuYW1lLCB2ZXJzaW9uKVxuXG4gIGdldERlcHJlY2F0ZWRQYWNrYWdlTWV0YWRhdGE6IChuYW1lKSAtPlxuICAgIGdldERlcHJlY2F0ZWRQYWNrYWdlTWV0YWRhdGEobmFtZSlcblxuICAjIyNcbiAgU2VjdGlvbjogRW5hYmxpbmcgYW5kIGRpc2FibGluZyBwYWNrYWdlc1xuICAjIyNcblxuICAjIFB1YmxpYzogRW5hYmxlIHRoZSBwYWNrYWdlIHdpdGggdGhlIGdpdmVuIG5hbWUuXG4gICNcbiAgIyAqIGBuYW1lYCAtIFRoZSB7U3RyaW5nfSBwYWNrYWdlIG5hbWUuXG4gICNcbiAgIyBSZXR1cm5zIHRoZSB7UGFja2FnZX0gdGhhdCB3YXMgZW5hYmxlZCBvciBudWxsIGlmIGl0IGlzbid0IGxvYWRlZC5cbiAgZW5hYmxlUGFja2FnZTogKG5hbWUpIC0+XG4gICAgcGFjayA9IEBsb2FkUGFja2FnZShuYW1lKVxuICAgIHBhY2s/LmVuYWJsZSgpXG4gICAgcGFja1xuXG4gICMgUHVibGljOiBEaXNhYmxlIHRoZSBwYWNrYWdlIHdpdGggdGhlIGdpdmVuIG5hbWUuXG4gICNcbiAgIyAqIGBuYW1lYCAtIFRoZSB7U3RyaW5nfSBwYWNrYWdlIG5hbWUuXG4gICNcbiAgIyBSZXR1cm5zIHRoZSB7UGFja2FnZX0gdGhhdCB3YXMgZGlzYWJsZWQgb3IgbnVsbCBpZiBpdCBpc24ndCBsb2FkZWQuXG4gIGRpc2FibGVQYWNrYWdlOiAobmFtZSkgLT5cbiAgICBwYWNrID0gQGxvYWRQYWNrYWdlKG5hbWUpXG5cbiAgICB1bmxlc3MgQGlzUGFja2FnZURpc2FibGVkKG5hbWUpXG4gICAgICBwYWNrPy5kaXNhYmxlKClcblxuICAgIHBhY2tcblxuICAjIFB1YmxpYzogSXMgdGhlIHBhY2thZ2Ugd2l0aCB0aGUgZ2l2ZW4gbmFtZSBkaXNhYmxlZD9cbiAgI1xuICAjICogYG5hbWVgIC0gVGhlIHtTdHJpbmd9IHBhY2thZ2UgbmFtZS5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0uXG4gIGlzUGFja2FnZURpc2FibGVkOiAobmFtZSkgLT5cbiAgICBfLmluY2x1ZGUoQGNvbmZpZy5nZXQoJ2NvcmUuZGlzYWJsZWRQYWNrYWdlcycpID8gW10sIG5hbWUpXG5cbiAgIyMjXG4gIFNlY3Rpb246IEFjY2Vzc2luZyBhY3RpdmUgcGFja2FnZXNcbiAgIyMjXG5cbiAgIyBQdWJsaWM6IEdldCBhbiB7QXJyYXl9IG9mIGFsbCB0aGUgYWN0aXZlIHtQYWNrYWdlfXMuXG4gIGdldEFjdGl2ZVBhY2thZ2VzOiAtPlxuICAgIF8udmFsdWVzKEBhY3RpdmVQYWNrYWdlcylcblxuICAjIFB1YmxpYzogR2V0IHRoZSBhY3RpdmUge1BhY2thZ2V9IHdpdGggdGhlIGdpdmVuIG5hbWUuXG4gICNcbiAgIyAqIGBuYW1lYCAtIFRoZSB7U3RyaW5nfSBwYWNrYWdlIG5hbWUuXG4gICNcbiAgIyBSZXR1cm5zIGEge1BhY2thZ2V9IG9yIHVuZGVmaW5lZC5cbiAgZ2V0QWN0aXZlUGFja2FnZTogKG5hbWUpIC0+XG4gICAgQGFjdGl2ZVBhY2thZ2VzW25hbWVdXG5cbiAgIyBQdWJsaWM6IElzIHRoZSB7UGFja2FnZX0gd2l0aCB0aGUgZ2l2ZW4gbmFtZSBhY3RpdmU/XG4gICNcbiAgIyAqIGBuYW1lYCAtIFRoZSB7U3RyaW5nfSBwYWNrYWdlIG5hbWUuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICBpc1BhY2thZ2VBY3RpdmU6IChuYW1lKSAtPlxuICAgIEBnZXRBY3RpdmVQYWNrYWdlKG5hbWUpP1xuXG4gICMgUHVibGljOiBSZXR1cm5zIGEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciBwYWNrYWdlIGFjdGl2YXRpb24gaGFzIG9jY3VycmVkLlxuICBoYXNBY3RpdmF0ZWRJbml0aWFsUGFja2FnZXM6IC0+IEBpbml0aWFsUGFja2FnZXNBY3RpdmF0ZWRcblxuICAjIyNcbiAgU2VjdGlvbjogQWNjZXNzaW5nIGxvYWRlZCBwYWNrYWdlc1xuICAjIyNcblxuICAjIFB1YmxpYzogR2V0IGFuIHtBcnJheX0gb2YgYWxsIHRoZSBsb2FkZWQge1BhY2thZ2V9c1xuICBnZXRMb2FkZWRQYWNrYWdlczogLT5cbiAgICBfLnZhbHVlcyhAbG9hZGVkUGFja2FnZXMpXG5cbiAgIyBHZXQgcGFja2FnZXMgZm9yIGEgY2VydGFpbiBwYWNrYWdlIHR5cGVcbiAgI1xuICAjICogYHR5cGVzYCBhbiB7QXJyYXl9IG9mIHtTdHJpbmd9cyBsaWtlIFsnYXRvbScsICd0ZXh0bWF0ZSddLlxuICBnZXRMb2FkZWRQYWNrYWdlc0ZvclR5cGVzOiAodHlwZXMpIC0+XG4gICAgcGFjayBmb3IgcGFjayBpbiBAZ2V0TG9hZGVkUGFja2FnZXMoKSB3aGVuIHBhY2suZ2V0VHlwZSgpIGluIHR5cGVzXG5cbiAgIyBQdWJsaWM6IEdldCB0aGUgbG9hZGVkIHtQYWNrYWdlfSB3aXRoIHRoZSBnaXZlbiBuYW1lLlxuICAjXG4gICMgKiBgbmFtZWAgLSBUaGUge1N0cmluZ30gcGFja2FnZSBuYW1lLlxuICAjXG4gICMgUmV0dXJucyBhIHtQYWNrYWdlfSBvciB1bmRlZmluZWQuXG4gIGdldExvYWRlZFBhY2thZ2U6IChuYW1lKSAtPlxuICAgIEBsb2FkZWRQYWNrYWdlc1tuYW1lXVxuXG4gICMgUHVibGljOiBJcyB0aGUgcGFja2FnZSB3aXRoIHRoZSBnaXZlbiBuYW1lIGxvYWRlZD9cbiAgI1xuICAjICogYG5hbWVgIC0gVGhlIHtTdHJpbmd9IHBhY2thZ2UgbmFtZS5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0uXG4gIGlzUGFja2FnZUxvYWRlZDogKG5hbWUpIC0+XG4gICAgQGdldExvYWRlZFBhY2thZ2UobmFtZSk/XG5cbiAgIyBQdWJsaWM6IFJldHVybnMgYSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIHBhY2thZ2UgbG9hZGluZyBoYXMgb2NjdXJyZWQuXG4gIGhhc0xvYWRlZEluaXRpYWxQYWNrYWdlczogLT4gQGluaXRpYWxQYWNrYWdlc0xvYWRlZFxuXG4gICMjI1xuICBTZWN0aW9uOiBBY2Nlc3NpbmcgYXZhaWxhYmxlIHBhY2thZ2VzXG4gICMjI1xuXG4gICMgUHVibGljOiBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge1N0cmluZ31zIG9mIGFsbCB0aGUgYXZhaWxhYmxlIHBhY2thZ2UgcGF0aHMuXG4gIGdldEF2YWlsYWJsZVBhY2thZ2VQYXRoczogLT5cbiAgICBAZ2V0QXZhaWxhYmxlUGFja2FnZXMoKS5tYXAoKGEpIC0+IGEucGF0aClcblxuICAjIFB1YmxpYzogUmV0dXJucyBhbiB7QXJyYXl9IG9mIHtTdHJpbmd9cyBvZiBhbGwgdGhlIGF2YWlsYWJsZSBwYWNrYWdlIG5hbWVzLlxuICBnZXRBdmFpbGFibGVQYWNrYWdlTmFtZXM6IC0+XG4gICAgQGdldEF2YWlsYWJsZVBhY2thZ2VzKCkubWFwKChhKSAtPiBhLm5hbWUpXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgYW4ge0FycmF5fSBvZiB7U3RyaW5nfXMgb2YgYWxsIHRoZSBhdmFpbGFibGUgcGFja2FnZSBtZXRhZGF0YS5cbiAgZ2V0QXZhaWxhYmxlUGFja2FnZU1ldGFkYXRhOiAtPlxuICAgIHBhY2thZ2VzID0gW11cbiAgICBmb3IgcGFjayBpbiBAZ2V0QXZhaWxhYmxlUGFja2FnZXMoKVxuICAgICAgbWV0YWRhdGEgPSBAZ2V0TG9hZGVkUGFja2FnZShwYWNrLm5hbWUpPy5tZXRhZGF0YSA/IEBsb2FkUGFja2FnZU1ldGFkYXRhKHBhY2ssIHRydWUpXG4gICAgICBwYWNrYWdlcy5wdXNoKG1ldGFkYXRhKVxuICAgIHBhY2thZ2VzXG5cbiAgZ2V0QXZhaWxhYmxlUGFja2FnZXM6IC0+XG4gICAgcGFja2FnZXMgPSBbXVxuICAgIHBhY2thZ2VzQnlOYW1lID0gbmV3IFNldCgpXG5cbiAgICBmb3IgcGFja2FnZURpclBhdGggaW4gQHBhY2thZ2VEaXJQYXRoc1xuICAgICAgaWYgZnMuaXNEaXJlY3RvcnlTeW5jKHBhY2thZ2VEaXJQYXRoKVxuICAgICAgICBmb3IgcGFja2FnZVBhdGggaW4gZnMucmVhZGRpclN5bmMocGFja2FnZURpclBhdGgpXG4gICAgICAgICAgcGFja2FnZVBhdGggPSBwYXRoLmpvaW4ocGFja2FnZURpclBhdGgsIHBhY2thZ2VQYXRoKVxuICAgICAgICAgIHBhY2thZ2VOYW1lID0gcGF0aC5iYXNlbmFtZShwYWNrYWdlUGF0aClcbiAgICAgICAgICBpZiBub3QgcGFja2FnZU5hbWUuc3RhcnRzV2l0aCgnLicpIGFuZCBub3QgcGFja2FnZXNCeU5hbWUuaGFzKHBhY2thZ2VOYW1lKSBhbmQgZnMuaXNEaXJlY3RvcnlTeW5jKHBhY2thZ2VQYXRoKVxuICAgICAgICAgICAgcGFja2FnZXMucHVzaCh7XG4gICAgICAgICAgICAgIG5hbWU6IHBhY2thZ2VOYW1lLFxuICAgICAgICAgICAgICBwYXRoOiBwYWNrYWdlUGF0aCxcbiAgICAgICAgICAgICAgaXNCdW5kbGVkOiBmYWxzZVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHBhY2thZ2VzQnlOYW1lLmFkZChwYWNrYWdlTmFtZSlcblxuICAgIGZvciBwYWNrYWdlTmFtZSBvZiBAcGFja2FnZURlcGVuZGVuY2llc1xuICAgICAgdW5sZXNzIHBhY2thZ2VzQnlOYW1lLmhhcyhwYWNrYWdlTmFtZSlcbiAgICAgICAgcGFja2FnZXMucHVzaCh7XG4gICAgICAgICAgbmFtZTogcGFja2FnZU5hbWUsXG4gICAgICAgICAgcGF0aDogcGF0aC5qb2luKEByZXNvdXJjZVBhdGgsICdub2RlX21vZHVsZXMnLCBwYWNrYWdlTmFtZSksXG4gICAgICAgICAgaXNCdW5kbGVkOiB0cnVlXG4gICAgICAgIH0pXG5cbiAgICBwYWNrYWdlcy5zb3J0KChhLCBiKSAtPiBhLm5hbWUudG9Mb3dlckNhc2UoKS5sb2NhbGVDb21wYXJlKGIubmFtZS50b0xvd2VyQ2FzZSgpKSlcblxuICAjIyNcbiAgU2VjdGlvbjogUHJpdmF0ZVxuICAjIyNcblxuICBnZXRQYWNrYWdlU3RhdGU6IChuYW1lKSAtPlxuICAgIEBwYWNrYWdlU3RhdGVzW25hbWVdXG5cbiAgc2V0UGFja2FnZVN0YXRlOiAobmFtZSwgc3RhdGUpIC0+XG4gICAgQHBhY2thZ2VTdGF0ZXNbbmFtZV0gPSBzdGF0ZVxuXG4gIGdldFBhY2thZ2VEZXBlbmRlbmNpZXM6IC0+XG4gICAgQHBhY2thZ2VEZXBlbmRlbmNpZXNcblxuICBoYXNBdG9tRW5naW5lOiAocGFja2FnZVBhdGgpIC0+XG4gICAgbWV0YWRhdGEgPSBAbG9hZFBhY2thZ2VNZXRhZGF0YShwYWNrYWdlUGF0aCwgdHJ1ZSlcbiAgICBtZXRhZGF0YT8uZW5naW5lcz8uYXRvbT9cblxuICB1bm9ic2VydmVEaXNhYmxlZFBhY2thZ2VzOiAtPlxuICAgIEBkaXNhYmxlZFBhY2thZ2VzU3Vic2NyaXB0aW9uPy5kaXNwb3NlKClcbiAgICBAZGlzYWJsZWRQYWNrYWdlc1N1YnNjcmlwdGlvbiA9IG51bGxcblxuICBvYnNlcnZlRGlzYWJsZWRQYWNrYWdlczogLT5cbiAgICBAZGlzYWJsZWRQYWNrYWdlc1N1YnNjcmlwdGlvbiA/PSBAY29uZmlnLm9uRGlkQ2hhbmdlICdjb3JlLmRpc2FibGVkUGFja2FnZXMnLCAoe25ld1ZhbHVlLCBvbGRWYWx1ZX0pID0+XG4gICAgICBwYWNrYWdlc1RvRW5hYmxlID0gXy5kaWZmZXJlbmNlKG9sZFZhbHVlLCBuZXdWYWx1ZSlcbiAgICAgIHBhY2thZ2VzVG9EaXNhYmxlID0gXy5kaWZmZXJlbmNlKG5ld1ZhbHVlLCBvbGRWYWx1ZSlcblxuICAgICAgQGRlYWN0aXZhdGVQYWNrYWdlKHBhY2thZ2VOYW1lKSBmb3IgcGFja2FnZU5hbWUgaW4gcGFja2FnZXNUb0Rpc2FibGUgd2hlbiBAZ2V0QWN0aXZlUGFja2FnZShwYWNrYWdlTmFtZSlcbiAgICAgIEBhY3RpdmF0ZVBhY2thZ2UocGFja2FnZU5hbWUpIGZvciBwYWNrYWdlTmFtZSBpbiBwYWNrYWdlc1RvRW5hYmxlXG4gICAgICBudWxsXG5cbiAgdW5vYnNlcnZlUGFja2FnZXNXaXRoS2V5bWFwc0Rpc2FibGVkOiAtPlxuICAgIEBwYWNrYWdlc1dpdGhLZXltYXBzRGlzYWJsZWRTdWJzY3JpcHRpb24/LmRpc3Bvc2UoKVxuICAgIEBwYWNrYWdlc1dpdGhLZXltYXBzRGlzYWJsZWRTdWJzY3JpcHRpb24gPSBudWxsXG5cbiAgb2JzZXJ2ZVBhY2thZ2VzV2l0aEtleW1hcHNEaXNhYmxlZDogLT5cbiAgICBAcGFja2FnZXNXaXRoS2V5bWFwc0Rpc2FibGVkU3Vic2NyaXB0aW9uID89IEBjb25maWcub25EaWRDaGFuZ2UgJ2NvcmUucGFja2FnZXNXaXRoS2V5bWFwc0Rpc2FibGVkJywgKHtuZXdWYWx1ZSwgb2xkVmFsdWV9KSA9PlxuICAgICAga2V5bWFwc1RvRW5hYmxlID0gXy5kaWZmZXJlbmNlKG9sZFZhbHVlLCBuZXdWYWx1ZSlcbiAgICAgIGtleW1hcHNUb0Rpc2FibGUgPSBfLmRpZmZlcmVuY2UobmV3VmFsdWUsIG9sZFZhbHVlKVxuXG4gICAgICBkaXNhYmxlZFBhY2thZ2VOYW1lcyA9IG5ldyBTZXQoQGNvbmZpZy5nZXQoJ2NvcmUuZGlzYWJsZWRQYWNrYWdlcycpKVxuICAgICAgZm9yIHBhY2thZ2VOYW1lIGluIGtleW1hcHNUb0Rpc2FibGUgd2hlbiBub3QgZGlzYWJsZWRQYWNrYWdlTmFtZXMuaGFzKHBhY2thZ2VOYW1lKVxuICAgICAgICBAZ2V0TG9hZGVkUGFja2FnZShwYWNrYWdlTmFtZSk/LmRlYWN0aXZhdGVLZXltYXBzKClcbiAgICAgIGZvciBwYWNrYWdlTmFtZSBpbiBrZXltYXBzVG9FbmFibGUgd2hlbiBub3QgZGlzYWJsZWRQYWNrYWdlTmFtZXMuaGFzKHBhY2thZ2VOYW1lKVxuICAgICAgICBAZ2V0TG9hZGVkUGFja2FnZShwYWNrYWdlTmFtZSk/LmFjdGl2YXRlS2V5bWFwcygpXG4gICAgICBudWxsXG5cbiAgcHJlbG9hZFBhY2thZ2VzOiAtPlxuICAgIGZvciBwYWNrYWdlTmFtZSwgcGFjayBvZiBAcGFja2FnZXNDYWNoZVxuICAgICAgQHByZWxvYWRQYWNrYWdlKHBhY2thZ2VOYW1lLCBwYWNrKVxuXG4gIHByZWxvYWRQYWNrYWdlOiAocGFja2FnZU5hbWUsIHBhY2spIC0+XG4gICAgbWV0YWRhdGEgPSBwYWNrLm1ldGFkYXRhID8ge31cbiAgICB1bmxlc3MgdHlwZW9mIG1ldGFkYXRhLm5hbWUgaXMgJ3N0cmluZycgYW5kIG1ldGFkYXRhLm5hbWUubGVuZ3RoID4gMFxuICAgICAgbWV0YWRhdGEubmFtZSA9IHBhY2thZ2VOYW1lXG5cbiAgICBpZiBtZXRhZGF0YS5yZXBvc2l0b3J5Py50eXBlIGlzICdnaXQnIGFuZCB0eXBlb2YgbWV0YWRhdGEucmVwb3NpdG9yeS51cmwgaXMgJ3N0cmluZydcbiAgICAgIG1ldGFkYXRhLnJlcG9zaXRvcnkudXJsID0gbWV0YWRhdGEucmVwb3NpdG9yeS51cmwucmVwbGFjZSgvKF5naXRcXCspfChcXC5naXQkKS9nLCAnJylcblxuICAgIG9wdGlvbnMgPSB7XG4gICAgICBwYXRoOiBwYWNrLnJvb3REaXJQYXRoLCBuYW1lOiBwYWNrYWdlTmFtZSwgcHJlbG9hZGVkUGFja2FnZTogdHJ1ZSxcbiAgICAgIGJ1bmRsZWRQYWNrYWdlOiB0cnVlLCBtZXRhZGF0YSwgcGFja2FnZU1hbmFnZXI6IHRoaXMsIEBjb25maWcsXG4gICAgICBAc3R5bGVNYW5hZ2VyLCBAY29tbWFuZFJlZ2lzdHJ5LCBAa2V5bWFwTWFuYWdlcixcbiAgICAgIEBub3RpZmljYXRpb25NYW5hZ2VyLCBAZ3JhbW1hclJlZ2lzdHJ5LCBAdGhlbWVNYW5hZ2VyLCBAbWVudU1hbmFnZXIsXG4gICAgICBAY29udGV4dE1lbnVNYW5hZ2VyLCBAZGVzZXJpYWxpemVyTWFuYWdlciwgQHZpZXdSZWdpc3RyeVxuICAgIH1cbiAgICBpZiBtZXRhZGF0YS50aGVtZVxuICAgICAgcGFjayA9IG5ldyBUaGVtZVBhY2thZ2Uob3B0aW9ucylcbiAgICBlbHNlXG4gICAgICBwYWNrID0gbmV3IFBhY2thZ2Uob3B0aW9ucylcblxuICAgIHBhY2sucHJlbG9hZCgpXG4gICAgQHByZWxvYWRlZFBhY2thZ2VzW3BhY2thZ2VOYW1lXSA9IHBhY2tcblxuICBsb2FkUGFja2FnZXM6IC0+XG4gICAgIyBFbnN1cmUgYXRvbSBleHBvcnRzIGlzIGFscmVhZHkgaW4gdGhlIHJlcXVpcmUgY2FjaGUgc28gdGhlIGxvYWQgdGltZVxuICAgICMgb2YgdGhlIGZpcnN0IHBhY2thZ2UgaXNuJ3Qgc2tld2VkIGJ5IGJlaW5nIHRoZSBmaXJzdCB0byByZXF1aXJlIGF0b21cbiAgICByZXF1aXJlICcuLi9leHBvcnRzL2F0b20nXG5cbiAgICBkaXNhYmxlZFBhY2thZ2VOYW1lcyA9IG5ldyBTZXQoQGNvbmZpZy5nZXQoJ2NvcmUuZGlzYWJsZWRQYWNrYWdlcycpKVxuICAgIEBjb25maWcudHJhbnNhY3QgPT5cbiAgICAgIGZvciBwYWNrIGluIEBnZXRBdmFpbGFibGVQYWNrYWdlcygpXG4gICAgICAgIEBsb2FkQXZhaWxhYmxlUGFja2FnZShwYWNrLCBkaXNhYmxlZFBhY2thZ2VOYW1lcylcbiAgICAgIHJldHVyblxuICAgIEBpbml0aWFsUGFja2FnZXNMb2FkZWQgPSB0cnVlXG4gICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWxvYWQtaW5pdGlhbC1wYWNrYWdlcydcblxuICBsb2FkUGFja2FnZTogKG5hbWVPclBhdGgpIC0+XG4gICAgaWYgcGF0aC5iYXNlbmFtZShuYW1lT3JQYXRoKVswXS5tYXRjaCgvXlxcLi8pICMgcHJpbWFyaWx5IHRvIHNraXAgLmdpdCBmb2xkZXJcbiAgICAgIG51bGxcbiAgICBlbHNlIGlmIHBhY2sgPSBAZ2V0TG9hZGVkUGFja2FnZShuYW1lT3JQYXRoKVxuICAgICAgcGFja1xuICAgIGVsc2UgaWYgcGFja2FnZVBhdGggPSBAcmVzb2x2ZVBhY2thZ2VQYXRoKG5hbWVPclBhdGgpXG4gICAgICBuYW1lID0gcGF0aC5iYXNlbmFtZShuYW1lT3JQYXRoKVxuICAgICAgQGxvYWRBdmFpbGFibGVQYWNrYWdlKHtuYW1lLCBwYXRoOiBwYWNrYWdlUGF0aCwgaXNCdW5kbGVkOiBAaXNCdW5kbGVkUGFja2FnZVBhdGgocGFja2FnZVBhdGgpfSlcbiAgICBlbHNlXG4gICAgICBjb25zb2xlLndhcm4gXCJDb3VsZCBub3QgcmVzb2x2ZSAnI3tuYW1lT3JQYXRofScgdG8gYSBwYWNrYWdlIHBhdGhcIlxuICAgICAgbnVsbFxuXG4gIGxvYWRBdmFpbGFibGVQYWNrYWdlOiAoYXZhaWxhYmxlUGFja2FnZSwgZGlzYWJsZWRQYWNrYWdlTmFtZXMpIC0+XG4gICAgcHJlbG9hZGVkUGFja2FnZSA9IEBwcmVsb2FkZWRQYWNrYWdlc1thdmFpbGFibGVQYWNrYWdlLm5hbWVdXG5cbiAgICBpZiBkaXNhYmxlZFBhY2thZ2VOYW1lcz8uaGFzKGF2YWlsYWJsZVBhY2thZ2UubmFtZSlcbiAgICAgIGlmIHByZWxvYWRlZFBhY2thZ2U/XG4gICAgICAgIHByZWxvYWRlZFBhY2thZ2UuZGVhY3RpdmF0ZSgpXG4gICAgICAgIGRlbGV0ZSBwcmVsb2FkZWRQYWNrYWdlW2F2YWlsYWJsZVBhY2thZ2UubmFtZV1cbiAgICBlbHNlXG4gICAgICBsb2FkZWRQYWNrYWdlID0gQGdldExvYWRlZFBhY2thZ2UoYXZhaWxhYmxlUGFja2FnZS5uYW1lKVxuICAgICAgaWYgbG9hZGVkUGFja2FnZT9cbiAgICAgICAgbG9hZGVkUGFja2FnZVxuICAgICAgZWxzZVxuICAgICAgICBpZiBwcmVsb2FkZWRQYWNrYWdlP1xuICAgICAgICAgIGlmIGF2YWlsYWJsZVBhY2thZ2UuaXNCdW5kbGVkXG4gICAgICAgICAgICBwcmVsb2FkZWRQYWNrYWdlLmZpbmlzaExvYWRpbmcoKVxuICAgICAgICAgICAgQGxvYWRlZFBhY2thZ2VzW2F2YWlsYWJsZVBhY2thZ2UubmFtZV0gPSBwcmVsb2FkZWRQYWNrYWdlXG4gICAgICAgICAgICByZXR1cm4gcHJlbG9hZGVkUGFja2FnZVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHByZWxvYWRlZFBhY2thZ2UuZGVhY3RpdmF0ZSgpXG4gICAgICAgICAgICBkZWxldGUgcHJlbG9hZGVkUGFja2FnZVthdmFpbGFibGVQYWNrYWdlLm5hbWVdXG5cbiAgICAgICAgdHJ5XG4gICAgICAgICAgbWV0YWRhdGEgPSBAbG9hZFBhY2thZ2VNZXRhZGF0YShhdmFpbGFibGVQYWNrYWdlKSA/IHt9XG4gICAgICAgIGNhdGNoIGVycm9yXG4gICAgICAgICAgQGhhbmRsZU1ldGFkYXRhRXJyb3IoZXJyb3IsIGF2YWlsYWJsZVBhY2thZ2UucGF0aClcbiAgICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgICAgIHVubGVzcyBhdmFpbGFibGVQYWNrYWdlLmlzQnVuZGxlZFxuICAgICAgICAgIGlmIEBpc0RlcHJlY2F0ZWRQYWNrYWdlKG1ldGFkYXRhLm5hbWUsIG1ldGFkYXRhLnZlcnNpb24pXG4gICAgICAgICAgICBjb25zb2xlLndhcm4gXCJDb3VsZCBub3QgbG9hZCAje21ldGFkYXRhLm5hbWV9QCN7bWV0YWRhdGEudmVyc2lvbn0gYmVjYXVzZSBpdCB1c2VzIGRlcHJlY2F0ZWQgQVBJcyB0aGF0IGhhdmUgYmVlbiByZW1vdmVkLlwiXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgICAgcGF0aDogYXZhaWxhYmxlUGFja2FnZS5wYXRoLCBuYW1lOiBhdmFpbGFibGVQYWNrYWdlLm5hbWUsIG1ldGFkYXRhLFxuICAgICAgICAgIGJ1bmRsZWRQYWNrYWdlOiBhdmFpbGFibGVQYWNrYWdlLmlzQnVuZGxlZCwgcGFja2FnZU1hbmFnZXI6IHRoaXMsXG4gICAgICAgICAgQGNvbmZpZywgQHN0eWxlTWFuYWdlciwgQGNvbW1hbmRSZWdpc3RyeSwgQGtleW1hcE1hbmFnZXIsXG4gICAgICAgICAgQG5vdGlmaWNhdGlvbk1hbmFnZXIsIEBncmFtbWFyUmVnaXN0cnksIEB0aGVtZU1hbmFnZXIsIEBtZW51TWFuYWdlcixcbiAgICAgICAgICBAY29udGV4dE1lbnVNYW5hZ2VyLCBAZGVzZXJpYWxpemVyTWFuYWdlciwgQHZpZXdSZWdpc3RyeVxuICAgICAgICB9XG4gICAgICAgIGlmIG1ldGFkYXRhLnRoZW1lXG4gICAgICAgICAgcGFjayA9IG5ldyBUaGVtZVBhY2thZ2Uob3B0aW9ucylcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHBhY2sgPSBuZXcgUGFja2FnZShvcHRpb25zKVxuICAgICAgICBwYWNrLmxvYWQoKVxuICAgICAgICBAbG9hZGVkUGFja2FnZXNbcGFjay5uYW1lXSA9IHBhY2tcbiAgICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWxvYWQtcGFja2FnZScsIHBhY2tcbiAgICAgICAgcGFja1xuXG4gIHVubG9hZFBhY2thZ2VzOiAtPlxuICAgIEB1bmxvYWRQYWNrYWdlKG5hbWUpIGZvciBuYW1lIGluIF8ua2V5cyhAbG9hZGVkUGFja2FnZXMpXG4gICAgbnVsbFxuXG4gIHVubG9hZFBhY2thZ2U6IChuYW1lKSAtPlxuICAgIGlmIEBpc1BhY2thZ2VBY3RpdmUobmFtZSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRyaWVkIHRvIHVubG9hZCBhY3RpdmUgcGFja2FnZSAnI3tuYW1lfSdcIilcblxuICAgIGlmIHBhY2sgPSBAZ2V0TG9hZGVkUGFja2FnZShuYW1lKVxuICAgICAgZGVsZXRlIEBsb2FkZWRQYWNrYWdlc1twYWNrLm5hbWVdXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtdW5sb2FkLXBhY2thZ2UnLCBwYWNrXG4gICAgZWxzZVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gbG9hZGVkIHBhY2thZ2UgZm9yIG5hbWUgJyN7bmFtZX0nXCIpXG5cbiAgIyBBY3RpdmF0ZSBhbGwgdGhlIHBhY2thZ2VzIHRoYXQgc2hvdWxkIGJlIGFjdGl2YXRlZC5cbiAgYWN0aXZhdGU6IC0+XG4gICAgcHJvbWlzZXMgPSBbXVxuICAgIGZvciBbYWN0aXZhdG9yLCB0eXBlc10gaW4gQHBhY2thZ2VBY3RpdmF0b3JzXG4gICAgICBwYWNrYWdlcyA9IEBnZXRMb2FkZWRQYWNrYWdlc0ZvclR5cGVzKHR5cGVzKVxuICAgICAgcHJvbWlzZXMgPSBwcm9taXNlcy5jb25jYXQoYWN0aXZhdG9yLmFjdGl2YXRlUGFja2FnZXMocGFja2FnZXMpKVxuICAgIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuID0+XG4gICAgICBAdHJpZ2dlckRlZmVycmVkQWN0aXZhdGlvbkhvb2tzKClcbiAgICAgIEBpbml0aWFsUGFja2FnZXNBY3RpdmF0ZWQgPSB0cnVlXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtYWN0aXZhdGUtaW5pdGlhbC1wYWNrYWdlcydcblxuICAjIGFub3RoZXIgdHlwZSBvZiBwYWNrYWdlIG1hbmFnZXIgY2FuIGhhbmRsZSBvdGhlciBwYWNrYWdlIHR5cGVzLlxuICAjIFNlZSBUaGVtZU1hbmFnZXJcbiAgcmVnaXN0ZXJQYWNrYWdlQWN0aXZhdG9yOiAoYWN0aXZhdG9yLCB0eXBlcykgLT5cbiAgICBAcGFja2FnZUFjdGl2YXRvcnMucHVzaChbYWN0aXZhdG9yLCB0eXBlc10pXG5cbiAgYWN0aXZhdGVQYWNrYWdlczogKHBhY2thZ2VzKSAtPlxuICAgIHByb21pc2VzID0gW11cbiAgICBAY29uZmlnLnRyYW5zYWN0QXN5bmMgPT5cbiAgICAgIGZvciBwYWNrIGluIHBhY2thZ2VzXG4gICAgICAgIHByb21pc2UgPSBAYWN0aXZhdGVQYWNrYWdlKHBhY2submFtZSlcbiAgICAgICAgcHJvbWlzZXMucHVzaChwcm9taXNlKSB1bmxlc3MgcGFjay5hY3RpdmF0aW9uU2hvdWxkQmVEZWZlcnJlZCgpXG4gICAgICBQcm9taXNlLmFsbChwcm9taXNlcylcbiAgICBAb2JzZXJ2ZURpc2FibGVkUGFja2FnZXMoKVxuICAgIEBvYnNlcnZlUGFja2FnZXNXaXRoS2V5bWFwc0Rpc2FibGVkKClcbiAgICBwcm9taXNlc1xuXG4gICMgQWN0aXZhdGUgYSBzaW5nbGUgcGFja2FnZSBieSBuYW1lXG4gIGFjdGl2YXRlUGFja2FnZTogKG5hbWUpIC0+XG4gICAgaWYgcGFjayA9IEBnZXRBY3RpdmVQYWNrYWdlKG5hbWUpXG4gICAgICBQcm9taXNlLnJlc29sdmUocGFjaylcbiAgICBlbHNlIGlmIHBhY2sgPSBAbG9hZFBhY2thZ2UobmFtZSlcbiAgICAgIEBhY3RpdmF0aW5nUGFja2FnZXNbcGFjay5uYW1lXSA9IHBhY2tcbiAgICAgIGFjdGl2YXRpb25Qcm9taXNlID0gcGFjay5hY3RpdmF0ZSgpLnRoZW4gPT5cbiAgICAgICAgaWYgQGFjdGl2YXRpbmdQYWNrYWdlc1twYWNrLm5hbWVdP1xuICAgICAgICAgIGRlbGV0ZSBAYWN0aXZhdGluZ1BhY2thZ2VzW3BhY2submFtZV1cbiAgICAgICAgICBAYWN0aXZlUGFja2FnZXNbcGFjay5uYW1lXSA9IHBhY2tcbiAgICAgICAgICBAZW1pdHRlci5lbWl0ICdkaWQtYWN0aXZhdGUtcGFja2FnZScsIHBhY2tcbiAgICAgICAgcGFja1xuXG4gICAgICB1bmxlc3MgQGRlZmVycmVkQWN0aXZhdGlvbkhvb2tzP1xuICAgICAgICBAdHJpZ2dlcmVkQWN0aXZhdGlvbkhvb2tzLmZvckVhY2goKGhvb2spID0+IEBhY3RpdmF0aW9uSG9va0VtaXR0ZXIuZW1pdChob29rKSlcblxuICAgICAgYWN0aXZhdGlvblByb21pc2VcbiAgICBlbHNlXG4gICAgICBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJGYWlsZWQgdG8gbG9hZCBwYWNrYWdlICcje25hbWV9J1wiKSlcblxuICB0cmlnZ2VyRGVmZXJyZWRBY3RpdmF0aW9uSG9va3M6IC0+XG4gICAgcmV0dXJuIHVubGVzcyBAZGVmZXJyZWRBY3RpdmF0aW9uSG9va3M/XG4gICAgQGFjdGl2YXRpb25Ib29rRW1pdHRlci5lbWl0KGhvb2spIGZvciBob29rIGluIEBkZWZlcnJlZEFjdGl2YXRpb25Ib29rc1xuICAgIEBkZWZlcnJlZEFjdGl2YXRpb25Ib29rcyA9IG51bGxcblxuICB0cmlnZ2VyQWN0aXZhdGlvbkhvb2s6IChob29rKSAtPlxuICAgIHJldHVybiBuZXcgRXJyb3IoXCJDYW5ub3QgdHJpZ2dlciBhbiBlbXB0eSBhY3RpdmF0aW9uIGhvb2tcIikgdW5sZXNzIGhvb2s/IGFuZCBfLmlzU3RyaW5nKGhvb2spIGFuZCBob29rLmxlbmd0aCA+IDBcbiAgICBAdHJpZ2dlcmVkQWN0aXZhdGlvbkhvb2tzLmFkZChob29rKVxuICAgIGlmIEBkZWZlcnJlZEFjdGl2YXRpb25Ib29rcz9cbiAgICAgIEBkZWZlcnJlZEFjdGl2YXRpb25Ib29rcy5wdXNoIGhvb2tcbiAgICBlbHNlXG4gICAgICBAYWN0aXZhdGlvbkhvb2tFbWl0dGVyLmVtaXQoaG9vaylcblxuICBvbkRpZFRyaWdnZXJBY3RpdmF0aW9uSG9vazogKGhvb2ssIGNhbGxiYWNrKSAtPlxuICAgIHJldHVybiB1bmxlc3MgaG9vaz8gYW5kIF8uaXNTdHJpbmcoaG9vaykgYW5kIGhvb2subGVuZ3RoID4gMFxuICAgIEBhY3RpdmF0aW9uSG9va0VtaXR0ZXIub24oaG9vaywgY2FsbGJhY2spXG5cbiAgc2VyaWFsaXplOiAtPlxuICAgIGZvciBwYWNrIGluIEBnZXRBY3RpdmVQYWNrYWdlcygpXG4gICAgICBAc2VyaWFsaXplUGFja2FnZShwYWNrKVxuICAgIEBwYWNrYWdlU3RhdGVzXG5cbiAgc2VyaWFsaXplUGFja2FnZTogKHBhY2spIC0+XG4gICAgQHNldFBhY2thZ2VTdGF0ZShwYWNrLm5hbWUsIHN0YXRlKSBpZiBzdGF0ZSA9IHBhY2suc2VyaWFsaXplPygpXG5cbiAgIyBEZWFjdGl2YXRlIGFsbCBwYWNrYWdlc1xuICBkZWFjdGl2YXRlUGFja2FnZXM6IC0+XG4gICAgQGNvbmZpZy50cmFuc2FjdCA9PlxuICAgICAgQGRlYWN0aXZhdGVQYWNrYWdlKHBhY2submFtZSwgdHJ1ZSkgZm9yIHBhY2sgaW4gQGdldExvYWRlZFBhY2thZ2VzKClcbiAgICAgIHJldHVyblxuICAgIEB1bm9ic2VydmVEaXNhYmxlZFBhY2thZ2VzKClcbiAgICBAdW5vYnNlcnZlUGFja2FnZXNXaXRoS2V5bWFwc0Rpc2FibGVkKClcblxuICAjIERlYWN0aXZhdGUgdGhlIHBhY2thZ2Ugd2l0aCB0aGUgZ2l2ZW4gbmFtZVxuICBkZWFjdGl2YXRlUGFja2FnZTogKG5hbWUsIHN1cHByZXNzU2VyaWFsaXphdGlvbikgLT5cbiAgICBwYWNrID0gQGdldExvYWRlZFBhY2thZ2UobmFtZSlcbiAgICBAc2VyaWFsaXplUGFja2FnZShwYWNrKSBpZiBub3Qgc3VwcHJlc3NTZXJpYWxpemF0aW9uIGFuZCBAaXNQYWNrYWdlQWN0aXZlKHBhY2submFtZSlcbiAgICBwYWNrLmRlYWN0aXZhdGUoKVxuICAgIGRlbGV0ZSBAYWN0aXZlUGFja2FnZXNbcGFjay5uYW1lXVxuICAgIGRlbGV0ZSBAYWN0aXZhdGluZ1BhY2thZ2VzW3BhY2submFtZV1cbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtZGVhY3RpdmF0ZS1wYWNrYWdlJywgcGFja1xuXG4gIGhhbmRsZU1ldGFkYXRhRXJyb3I6IChlcnJvciwgcGFja2FnZVBhdGgpIC0+XG4gICAgbWV0YWRhdGFQYXRoID0gcGF0aC5qb2luKHBhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJylcbiAgICBkZXRhaWwgPSBcIiN7ZXJyb3IubWVzc2FnZX0gaW4gI3ttZXRhZGF0YVBhdGh9XCJcbiAgICBzdGFjayA9IFwiI3tlcnJvci5zdGFja31cXG4gIGF0ICN7bWV0YWRhdGFQYXRofToxOjFcIlxuICAgIG1lc3NhZ2UgPSBcIkZhaWxlZCB0byBsb2FkIHRoZSAje3BhdGguYmFzZW5hbWUocGFja2FnZVBhdGgpfSBwYWNrYWdlXCJcbiAgICBAbm90aWZpY2F0aW9uTWFuYWdlci5hZGRFcnJvcihtZXNzYWdlLCB7c3RhY2ssIGRldGFpbCwgcGFja2FnZU5hbWU6IHBhdGguYmFzZW5hbWUocGFja2FnZVBhdGgpLCBkaXNtaXNzYWJsZTogdHJ1ZX0pXG5cbiAgdW5pbnN0YWxsRGlyZWN0b3J5OiAoZGlyZWN0b3J5KSAtPlxuICAgIHN5bWxpbmtQcm9taXNlID0gbmV3IFByb21pc2UgKHJlc29sdmUpIC0+XG4gICAgICBmcy5pc1N5bWJvbGljTGluayBkaXJlY3RvcnksIChpc1N5bUxpbmspIC0+IHJlc29sdmUoaXNTeW1MaW5rKVxuXG4gICAgZGlyUHJvbWlzZSA9IG5ldyBQcm9taXNlIChyZXNvbHZlKSAtPlxuICAgICAgZnMuaXNEaXJlY3RvcnkgZGlyZWN0b3J5LCAoaXNEaXIpIC0+IHJlc29sdmUoaXNEaXIpXG5cbiAgICBQcm9taXNlLmFsbChbc3ltbGlua1Byb21pc2UsIGRpclByb21pc2VdKS50aGVuICh2YWx1ZXMpIC0+XG4gICAgICBbaXNTeW1MaW5rLCBpc0Rpcl0gPSB2YWx1ZXNcbiAgICAgIGlmIG5vdCBpc1N5bUxpbmsgYW5kIGlzRGlyXG4gICAgICAgIGZzLnJlbW92ZSBkaXJlY3RvcnksIC0+XG5cbiAgcmVsb2FkQWN0aXZlUGFja2FnZVN0eWxlU2hlZXRzOiAtPlxuICAgIGZvciBwYWNrIGluIEBnZXRBY3RpdmVQYWNrYWdlcygpIHdoZW4gcGFjay5nZXRUeXBlKCkgaXNudCAndGhlbWUnXG4gICAgICBwYWNrLnJlbG9hZFN0eWxlc2hlZXRzPygpXG4gICAgcmV0dXJuXG5cbiAgaXNCdW5kbGVkUGFja2FnZVBhdGg6IChwYWNrYWdlUGF0aCkgLT5cbiAgICBpZiBAZGV2TW9kZVxuICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyBAcmVzb3VyY2VQYXRoLnN0YXJ0c1dpdGgoXCIje3Byb2Nlc3MucmVzb3VyY2VzUGF0aH0je3BhdGguc2VwfVwiKVxuXG4gICAgQHJlc291cmNlUGF0aFdpdGhUcmFpbGluZ1NsYXNoID89IFwiI3tAcmVzb3VyY2VQYXRofSN7cGF0aC5zZXB9XCJcbiAgICBwYWNrYWdlUGF0aD8uc3RhcnRzV2l0aChAcmVzb3VyY2VQYXRoV2l0aFRyYWlsaW5nU2xhc2gpXG5cbiAgbG9hZFBhY2thZ2VNZXRhZGF0YTogKHBhY2thZ2VQYXRoT3JBdmFpbGFibGVQYWNrYWdlLCBpZ25vcmVFcnJvcnM9ZmFsc2UpIC0+XG4gICAgaWYgdHlwZW9mIHBhY2thZ2VQYXRoT3JBdmFpbGFibGVQYWNrYWdlIGlzICdvYmplY3QnXG4gICAgICBhdmFpbGFibGVQYWNrYWdlID0gcGFja2FnZVBhdGhPckF2YWlsYWJsZVBhY2thZ2VcbiAgICAgIHBhY2thZ2VOYW1lID0gYXZhaWxhYmxlUGFja2FnZS5uYW1lXG4gICAgICBwYWNrYWdlUGF0aCA9IGF2YWlsYWJsZVBhY2thZ2UucGF0aFxuICAgICAgaXNCdW5kbGVkID0gYXZhaWxhYmxlUGFja2FnZS5pc0J1bmRsZWRcbiAgICBlbHNlXG4gICAgICBwYWNrYWdlUGF0aCA9IHBhY2thZ2VQYXRoT3JBdmFpbGFibGVQYWNrYWdlXG4gICAgICBwYWNrYWdlTmFtZSA9IHBhdGguYmFzZW5hbWUocGFja2FnZVBhdGgpXG4gICAgICBpc0J1bmRsZWQgPSBAaXNCdW5kbGVkUGFja2FnZVBhdGgocGFja2FnZVBhdGgpXG5cbiAgICBpZiBpc0J1bmRsZWRcbiAgICAgIG1ldGFkYXRhID0gQHBhY2thZ2VzQ2FjaGVbcGFja2FnZU5hbWVdPy5tZXRhZGF0YVxuXG4gICAgdW5sZXNzIG1ldGFkYXRhP1xuICAgICAgaWYgbWV0YWRhdGFQYXRoID0gQ1NPTi5yZXNvbHZlKHBhdGguam9pbihwYWNrYWdlUGF0aCwgJ3BhY2thZ2UnKSlcbiAgICAgICAgdHJ5XG4gICAgICAgICAgbWV0YWRhdGEgPSBDU09OLnJlYWRGaWxlU3luYyhtZXRhZGF0YVBhdGgpXG4gICAgICAgICAgQG5vcm1hbGl6ZVBhY2thZ2VNZXRhZGF0YShtZXRhZGF0YSlcbiAgICAgICAgY2F0Y2ggZXJyb3JcbiAgICAgICAgICB0aHJvdyBlcnJvciB1bmxlc3MgaWdub3JlRXJyb3JzXG5cbiAgICBtZXRhZGF0YSA/PSB7fVxuICAgIHVubGVzcyB0eXBlb2YgbWV0YWRhdGEubmFtZSBpcyAnc3RyaW5nJyBhbmQgbWV0YWRhdGEubmFtZS5sZW5ndGggPiAwXG4gICAgICBtZXRhZGF0YS5uYW1lID0gcGFja2FnZU5hbWVcblxuICAgIGlmIG1ldGFkYXRhLnJlcG9zaXRvcnk/LnR5cGUgaXMgJ2dpdCcgYW5kIHR5cGVvZiBtZXRhZGF0YS5yZXBvc2l0b3J5LnVybCBpcyAnc3RyaW5nJ1xuICAgICAgbWV0YWRhdGEucmVwb3NpdG9yeS51cmwgPSBtZXRhZGF0YS5yZXBvc2l0b3J5LnVybC5yZXBsYWNlKC8oXmdpdFxcKyl8KFxcLmdpdCQpL2csICcnKVxuXG4gICAgbWV0YWRhdGFcblxuICBub3JtYWxpemVQYWNrYWdlTWV0YWRhdGE6IChtZXRhZGF0YSkgLT5cbiAgICB1bmxlc3MgbWV0YWRhdGE/Ll9pZFxuICAgICAgbm9ybWFsaXplUGFja2FnZURhdGEgPz0gcmVxdWlyZSAnbm9ybWFsaXplLXBhY2thZ2UtZGF0YSdcbiAgICAgIG5vcm1hbGl6ZVBhY2thZ2VEYXRhKG1ldGFkYXRhKVxuIl19
