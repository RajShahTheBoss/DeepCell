(function() {
  var CSON, Color, Config, Emitter, ScopeDescriptor, ScopedPropertyStore, _, async, deleteValueAtKeyPath, fs, getValueAtKeyPath, isPlainObject, path, pathWatcher, pushKeyPath, ref, setValueAtKeyPath, sortObject, splitKeyPath, withoutEmptyObjects,
    slice = [].slice;

  _ = require('underscore-plus');

  fs = require('fs-plus');

  Emitter = require('event-kit').Emitter;

  CSON = require('season');

  path = require('path');

  async = require('async');

  pathWatcher = require('pathwatcher');

  ref = require('key-path-helpers'), getValueAtKeyPath = ref.getValueAtKeyPath, setValueAtKeyPath = ref.setValueAtKeyPath, deleteValueAtKeyPath = ref.deleteValueAtKeyPath, pushKeyPath = ref.pushKeyPath, splitKeyPath = ref.splitKeyPath;

  Color = require('./color');

  ScopedPropertyStore = require('scoped-property-store');

  ScopeDescriptor = require('./scope-descriptor');

  module.exports = Config = (function() {
    Config.schemaEnforcers = {};

    Config.addSchemaEnforcer = function(typeName, enforcerFunction) {
      var base;
      if ((base = this.schemaEnforcers)[typeName] == null) {
        base[typeName] = [];
      }
      return this.schemaEnforcers[typeName].push(enforcerFunction);
    };

    Config.addSchemaEnforcers = function(filters) {
      var enforcerFunction, functions, name, typeName;
      for (typeName in filters) {
        functions = filters[typeName];
        for (name in functions) {
          enforcerFunction = functions[name];
          this.addSchemaEnforcer(typeName, enforcerFunction);
        }
      }
    };

    Config.executeSchemaEnforcers = function(keyPath, value, schema) {
      var e, enforcer, enforcerFunctions, error, j, k, len, len1, type, types;
      error = null;
      types = schema.type;
      if (!Array.isArray(types)) {
        types = [types];
      }
      for (j = 0, len = types.length; j < len; j++) {
        type = types[j];
        try {
          enforcerFunctions = this.schemaEnforcers[type].concat(this.schemaEnforcers['*']);
          for (k = 0, len1 = enforcerFunctions.length; k < len1; k++) {
            enforcer = enforcerFunctions[k];
            value = enforcer.call(this, keyPath, value, schema);
          }
          error = null;
          break;
        } catch (error1) {
          e = error1;
          error = e;
        }
      }
      if (error != null) {
        throw error;
      }
      return value;
    };

    function Config(arg) {
      var ref1;
      ref1 = arg != null ? arg : {}, this.notificationManager = ref1.notificationManager, this.enablePersistence = ref1.enablePersistence;
      this.clear();
    }

    Config.prototype.initialize = function(arg) {
      var projectHomeSchema;
      this.configDirPath = arg.configDirPath, this.resourcePath = arg.resourcePath, projectHomeSchema = arg.projectHomeSchema;
      if (this.enablePersistence != null) {
        this.configFilePath = fs.resolve(this.configDirPath, 'config', ['json', 'cson']);
        if (this.configFilePath == null) {
          this.configFilePath = path.join(this.configDirPath, 'config.cson');
        }
      }
      this.schema.properties.core.properties.projectHome = projectHomeSchema;
      return this.defaultSettings.core.projectHome = projectHomeSchema["default"];
    };

    Config.prototype.clear = function() {
      var debouncedSave, save;
      this.emitter = new Emitter;
      this.schema = {
        type: 'object',
        properties: {}
      };
      this.defaultSettings = {};
      this.settings = {};
      this.scopedSettingsStore = new ScopedPropertyStore;
      this.configFileHasErrors = false;
      this.transactDepth = 0;
      this.savePending = false;
      this.requestLoad = _.debounce(this.loadUserConfig, 100);
      this.requestSave = (function(_this) {
        return function() {
          _this.savePending = true;
          return debouncedSave.call(_this);
        };
      })(this);
      save = (function(_this) {
        return function() {
          _this.savePending = false;
          return _this.save();
        };
      })(this);
      return debouncedSave = _.debounce(save, 100);
    };

    Config.prototype.shouldNotAccessFileSystem = function() {
      return !this.enablePersistence;
    };


    /*
    Section: Config Subscription
     */

    Config.prototype.observe = function() {
      var callback, keyPath, options, scopeDescriptor;
      if (arguments.length === 2) {
        keyPath = arguments[0], callback = arguments[1];
      } else if (arguments.length === 3 && (_.isString(arguments[0]) && _.isObject(arguments[1]))) {
        keyPath = arguments[0], options = arguments[1], callback = arguments[2];
        scopeDescriptor = options.scope;
      } else {
        console.error('An unsupported form of Config::observe is being used. See https://atom.io/docs/api/latest/Config for details');
        return;
      }
      if (scopeDescriptor != null) {
        return this.observeScopedKeyPath(scopeDescriptor, keyPath, callback);
      } else {
        return this.observeKeyPath(keyPath, options != null ? options : {}, callback);
      }
    };

    Config.prototype.onDidChange = function() {
      var callback, keyPath, options, scopeDescriptor;
      if (arguments.length === 1) {
        callback = arguments[0];
      } else if (arguments.length === 2) {
        keyPath = arguments[0], callback = arguments[1];
      } else {
        keyPath = arguments[0], options = arguments[1], callback = arguments[2];
        scopeDescriptor = options.scope;
      }
      if (scopeDescriptor != null) {
        return this.onDidChangeScopedKeyPath(scopeDescriptor, keyPath, callback);
      } else {
        return this.onDidChangeKeyPath(keyPath, callback);
      }
    };


    /*
    Section: Managing Settings
     */

    Config.prototype.get = function() {
      var keyPath, options, scope, value;
      if (arguments.length > 1) {
        if (typeof arguments[0] === 'string' || (arguments[0] == null)) {
          keyPath = arguments[0], options = arguments[1];
          scope = options.scope;
        }
      } else {
        keyPath = arguments[0];
      }
      if (scope != null) {
        value = this.getRawScopedValue(scope, keyPath, options);
        return value != null ? value : this.getRawValue(keyPath, options);
      } else {
        return this.getRawValue(keyPath, options);
      }
    };

    Config.prototype.getAll = function(keyPath, options) {
      var globalValue, result, scope, scopeDescriptor;
      if (options != null) {
        scope = options.scope;
      }
      result = [];
      if (scope != null) {
        scopeDescriptor = ScopeDescriptor.fromObject(scope);
        result = result.concat(this.scopedSettingsStore.getAll(scopeDescriptor.getScopeChain(), keyPath, options));
      }
      if (globalValue = this.getRawValue(keyPath, options)) {
        result.push({
          scopeSelector: '*',
          value: globalValue
        });
      }
      return result;
    };

    Config.prototype.set = function() {
      var e, keyPath, options, ref1, scopeSelector, shouldSave, source, value;
      keyPath = arguments[0], value = arguments[1], options = arguments[2];
      scopeSelector = options != null ? options.scopeSelector : void 0;
      source = options != null ? options.source : void 0;
      shouldSave = (ref1 = options != null ? options.save : void 0) != null ? ref1 : true;
      if (source && !scopeSelector) {
        throw new Error("::set with a 'source' and no 'sourceSelector' is not yet implemented!");
      }
      if (source == null) {
        source = this.getUserConfigPath();
      }
      if (value !== void 0) {
        try {
          value = this.makeValueConformToSchema(keyPath, value);
        } catch (error1) {
          e = error1;
          return false;
        }
      }
      if (scopeSelector != null) {
        this.setRawScopedValue(keyPath, value, source, scopeSelector);
      } else {
        this.setRawValue(keyPath, value);
      }
      if (source === this.getUserConfigPath() && shouldSave && !this.configFileHasErrors) {
        this.requestSave();
      }
      return true;
    };

    Config.prototype.unset = function(keyPath, options) {
      var ref1, scopeSelector, settings, source;
      ref1 = options != null ? options : {}, scopeSelector = ref1.scopeSelector, source = ref1.source;
      if (source == null) {
        source = this.getUserConfigPath();
      }
      if (scopeSelector != null) {
        if (keyPath != null) {
          settings = this.scopedSettingsStore.propertiesForSourceAndSelector(source, scopeSelector);
          if (getValueAtKeyPath(settings, keyPath) != null) {
            this.scopedSettingsStore.removePropertiesForSourceAndSelector(source, scopeSelector);
            setValueAtKeyPath(settings, keyPath, void 0);
            settings = withoutEmptyObjects(settings);
            if (settings != null) {
              this.set(null, settings, {
                scopeSelector: scopeSelector,
                source: source,
                priority: this.priorityForSource(source)
              });
            }
            return this.requestSave();
          }
        } else {
          this.scopedSettingsStore.removePropertiesForSourceAndSelector(source, scopeSelector);
          return this.emitChangeEvent();
        }
      } else {
        for (scopeSelector in this.scopedSettingsStore.propertiesForSource(source)) {
          this.unset(keyPath, {
            scopeSelector: scopeSelector,
            source: source
          });
        }
        if ((keyPath != null) && source === this.getUserConfigPath()) {
          return this.set(keyPath, getValueAtKeyPath(this.defaultSettings, keyPath));
        }
      }
    };

    Config.prototype.getSources = function() {
      return _.uniq(_.pluck(this.scopedSettingsStore.propertySets, 'source')).sort();
    };

    Config.prototype.getSchema = function(keyPath) {
      var childSchema, j, key, keys, len, ref1, schema;
      keys = splitKeyPath(keyPath);
      schema = this.schema;
      for (j = 0, len = keys.length; j < len; j++) {
        key = keys[j];
        if (schema.type === 'object') {
          childSchema = (ref1 = schema.properties) != null ? ref1[key] : void 0;
          if (childSchema == null) {
            if (isPlainObject(schema.additionalProperties)) {
              childSchema = schema.additionalProperties;
            } else if (schema.additionalProperties === false) {
              return null;
            } else {
              return {
                type: 'any'
              };
            }
          }
        } else {
          return null;
        }
        schema = childSchema;
      }
      return schema;
    };

    Config.prototype.getUserConfigPath = function() {
      return this.configFilePath;
    };

    Config.prototype.transact = function(callback) {
      this.beginTransaction();
      try {
        return callback();
      } finally {
        this.endTransaction();
      }
    };


    /*
    Section: Internal methods used by core
     */

    Config.prototype.transactAsync = function(callback) {
      var endTransaction, error, result;
      this.beginTransaction();
      try {
        endTransaction = (function(_this) {
          return function(fn) {
            return function() {
              var args;
              args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
              _this.endTransaction();
              return fn.apply(null, args);
            };
          };
        })(this);
        result = callback();
        return new Promise(function(resolve, reject) {
          return result.then(endTransaction(resolve))["catch"](endTransaction(reject));
        });
      } catch (error1) {
        error = error1;
        this.endTransaction();
        return Promise.reject(error);
      }
    };

    Config.prototype.beginTransaction = function() {
      return this.transactDepth++;
    };

    Config.prototype.endTransaction = function() {
      this.transactDepth--;
      return this.emitChangeEvent();
    };

    Config.prototype.pushAtKeyPath = function(keyPath, value) {
      var arrayValue, ref1, result;
      arrayValue = (ref1 = this.get(keyPath)) != null ? ref1 : [];
      result = arrayValue.push(value);
      this.set(keyPath, arrayValue);
      return result;
    };

    Config.prototype.unshiftAtKeyPath = function(keyPath, value) {
      var arrayValue, ref1, result;
      arrayValue = (ref1 = this.get(keyPath)) != null ? ref1 : [];
      result = arrayValue.unshift(value);
      this.set(keyPath, arrayValue);
      return result;
    };

    Config.prototype.removeAtKeyPath = function(keyPath, value) {
      var arrayValue, ref1, result;
      arrayValue = (ref1 = this.get(keyPath)) != null ? ref1 : [];
      result = _.remove(arrayValue, value);
      this.set(keyPath, arrayValue);
      return result;
    };

    Config.prototype.setSchema = function(keyPath, schema) {
      var j, key, len, properties, ref1, rootSchema;
      if (!isPlainObject(schema)) {
        throw new Error("Error loading schema for " + keyPath + ": schemas can only be objects!");
      }
      if (!typeof (schema.type != null)) {
        throw new Error("Error loading schema for " + keyPath + ": schema objects must have a type attribute");
      }
      rootSchema = this.schema;
      if (keyPath) {
        ref1 = splitKeyPath(keyPath);
        for (j = 0, len = ref1.length; j < len; j++) {
          key = ref1[j];
          rootSchema.type = 'object';
          if (rootSchema.properties == null) {
            rootSchema.properties = {};
          }
          properties = rootSchema.properties;
          if (properties[key] == null) {
            properties[key] = {};
          }
          rootSchema = properties[key];
        }
      }
      Object.assign(rootSchema, schema);
      return this.transact((function(_this) {
        return function() {
          _this.setDefaults(keyPath, _this.extractDefaultsFromSchema(schema));
          _this.setScopedDefaultsFromSchema(keyPath, schema);
          return _this.resetSettingsForSchemaChange();
        };
      })(this));
    };

    Config.prototype.load = function() {
      this.initializeConfigDirectory();
      this.loadUserConfig();
      return this.observeUserConfig();
    };


    /*
    Section: Private methods managing the user's config file
     */

    Config.prototype.initializeConfigDirectory = function(done) {
      var onConfigDirFile, queue, templateConfigDirPath;
      if (fs.existsSync(this.configDirPath) || this.shouldNotAccessFileSystem()) {
        return;
      }
      fs.makeTreeSync(this.configDirPath);
      queue = async.queue(function(arg, callback) {
        var destinationPath, sourcePath;
        sourcePath = arg.sourcePath, destinationPath = arg.destinationPath;
        return fs.copy(sourcePath, destinationPath, callback);
      });
      queue.drain = done;
      templateConfigDirPath = fs.resolve(this.resourcePath, 'dot-atom');
      onConfigDirFile = (function(_this) {
        return function(sourcePath) {
          var destinationPath, relativePath;
          relativePath = sourcePath.substring(templateConfigDirPath.length + 1);
          destinationPath = path.join(_this.configDirPath, relativePath);
          return queue.push({
            sourcePath: sourcePath,
            destinationPath: destinationPath
          });
        };
      })(this);
      return fs.traverseTree(templateConfigDirPath, onConfigDirFile, (function(path) {
        return true;
      }), (function() {}));
    };

    Config.prototype.loadUserConfig = function() {
      var detail, error, message, userConfig;
      if (this.shouldNotAccessFileSystem()) {
        return;
      }
      try {
        if (!fs.existsSync(this.configFilePath)) {
          fs.makeTreeSync(path.dirname(this.configFilePath));
          CSON.writeFileSync(this.configFilePath, {});
        }
      } catch (error1) {
        error = error1;
        this.configFileHasErrors = true;
        this.notifyFailure("Failed to initialize `" + (path.basename(this.configFilePath)) + "`", error.stack);
        return;
      }
      try {
        if (!this.savePending) {
          userConfig = CSON.readFileSync(this.configFilePath);
          this.resetUserSettings(userConfig);
          return this.configFileHasErrors = false;
        }
      } catch (error1) {
        error = error1;
        this.configFileHasErrors = true;
        message = "Failed to load `" + (path.basename(this.configFilePath)) + "`";
        detail = error.location != null ? error.stack : error.message;
        return this.notifyFailure(message, detail);
      }
    };

    Config.prototype.observeUserConfig = function() {
      var error;
      if (this.shouldNotAccessFileSystem()) {
        return;
      }
      try {
        return this.watchSubscription != null ? this.watchSubscription : this.watchSubscription = pathWatcher.watch(this.configFilePath, (function(_this) {
          return function(eventType) {
            if (eventType === 'change' && (_this.watchSubscription != null)) {
              return _this.requestLoad();
            }
          };
        })(this));
      } catch (error1) {
        error = error1;
        return this.notifyFailure("Unable to watch path: `" + (path.basename(this.configFilePath)) + "`. Make sure you have permissions to\n`" + this.configFilePath + "`. On linux there are currently problems with watch\nsizes. See [this document][watches] for more info.\n[watches]:https://github.com/atom/atom/blob/master/docs/build-instructions/linux.md#typeerror-unable-to-watch-path");
      }
    };

    Config.prototype.unobserveUserConfig = function() {
      var ref1;
      if ((ref1 = this.watchSubscription) != null) {
        ref1.close();
      }
      return this.watchSubscription = null;
    };

    Config.prototype.notifyFailure = function(errorMessage, detail) {
      var ref1;
      return (ref1 = this.notificationManager) != null ? ref1.addError(errorMessage, {
        detail: detail,
        dismissable: true
      }) : void 0;
    };

    Config.prototype.save = function() {
      var allSettings, detail, error, message;
      if (this.shouldNotAccessFileSystem()) {
        return;
      }
      allSettings = {
        '*': this.settings
      };
      allSettings = Object.assign(allSettings, this.scopedSettingsStore.propertiesForSource(this.getUserConfigPath()));
      allSettings = sortObject(allSettings);
      try {
        return CSON.writeFileSync(this.configFilePath, allSettings);
      } catch (error1) {
        error = error1;
        message = "Failed to save `" + (path.basename(this.configFilePath)) + "`";
        detail = error.message;
        return this.notifyFailure(message, detail);
      }
    };


    /*
    Section: Private methods managing global settings
     */

    Config.prototype.resetUserSettings = function(newSettings) {
      var scopedSettings;
      if (!isPlainObject(newSettings)) {
        this.settings = {};
        this.emitChangeEvent();
        return;
      }
      if (newSettings.global != null) {
        newSettings['*'] = newSettings.global;
        delete newSettings.global;
      }
      if (newSettings['*'] != null) {
        scopedSettings = newSettings;
        newSettings = newSettings['*'];
        delete scopedSettings['*'];
        this.resetUserScopedSettings(scopedSettings);
      }
      return this.transact((function(_this) {
        return function() {
          var key, value;
          _this.settings = {};
          for (key in newSettings) {
            value = newSettings[key];
            _this.set(key, value, {
              save: false
            });
          }
        };
      })(this));
    };

    Config.prototype.getRawValue = function(keyPath, options) {
      var defaultValue, ref1, ref2, value;
      if (!((options != null ? (ref1 = options.excludeSources) != null ? ref1.indexOf(this.getUserConfigPath()) : void 0 : void 0) >= 0)) {
        value = getValueAtKeyPath(this.settings, keyPath);
      }
      if (!((options != null ? (ref2 = options.sources) != null ? ref2.length : void 0 : void 0) > 0)) {
        defaultValue = getValueAtKeyPath(this.defaultSettings, keyPath);
      }
      if (value != null) {
        value = this.deepClone(value);
        if (isPlainObject(value) && isPlainObject(defaultValue)) {
          this.deepDefaults(value, defaultValue);
        }
      } else {
        value = this.deepClone(defaultValue);
      }
      return value;
    };

    Config.prototype.setRawValue = function(keyPath, value) {
      var defaultValue;
      defaultValue = getValueAtKeyPath(this.defaultSettings, keyPath);
      if (_.isEqual(defaultValue, value)) {
        if (keyPath != null) {
          deleteValueAtKeyPath(this.settings, keyPath);
        } else {
          this.settings = null;
        }
      } else {
        if (keyPath != null) {
          setValueAtKeyPath(this.settings, keyPath, value);
        } else {
          this.settings = value;
        }
      }
      return this.emitChangeEvent();
    };

    Config.prototype.observeKeyPath = function(keyPath, options, callback) {
      callback(this.get(keyPath));
      return this.onDidChangeKeyPath(keyPath, function(event) {
        return callback(event.newValue);
      });
    };

    Config.prototype.onDidChangeKeyPath = function(keyPath, callback) {
      var oldValue;
      oldValue = this.get(keyPath);
      return this.emitter.on('did-change', (function(_this) {
        return function() {
          var event, newValue;
          newValue = _this.get(keyPath);
          if (!_.isEqual(oldValue, newValue)) {
            event = {
              oldValue: oldValue,
              newValue: newValue
            };
            oldValue = newValue;
            return callback(event);
          }
        };
      })(this));
    };

    Config.prototype.isSubKeyPath = function(keyPath, subKeyPath) {
      var pathSubTokens, pathTokens;
      if (!((keyPath != null) && (subKeyPath != null))) {
        return false;
      }
      pathSubTokens = splitKeyPath(subKeyPath);
      pathTokens = splitKeyPath(keyPath).slice(0, pathSubTokens.length);
      return _.isEqual(pathTokens, pathSubTokens);
    };

    Config.prototype.setRawDefault = function(keyPath, value) {
      setValueAtKeyPath(this.defaultSettings, keyPath, value);
      return this.emitChangeEvent();
    };

    Config.prototype.setDefaults = function(keyPath, defaults) {
      var e, keys;
      if ((defaults != null) && isPlainObject(defaults)) {
        keys = splitKeyPath(keyPath);
        this.transact((function(_this) {
          return function() {
            var childValue, key, results;
            results = [];
            for (key in defaults) {
              childValue = defaults[key];
              if (!defaults.hasOwnProperty(key)) {
                continue;
              }
              results.push(_this.setDefaults(keys.concat([key]).join('.'), childValue));
            }
            return results;
          };
        })(this));
      } else {
        try {
          defaults = this.makeValueConformToSchema(keyPath, defaults);
          this.setRawDefault(keyPath, defaults);
        } catch (error1) {
          e = error1;
          console.warn("'" + keyPath + "' could not set the default. Attempted default: " + (JSON.stringify(defaults)) + "; Schema: " + (JSON.stringify(this.getSchema(keyPath))));
        }
      }
    };

    Config.prototype.deepClone = function(object) {
      if (object instanceof Color) {
        return object.clone();
      } else if (_.isArray(object)) {
        return object.map((function(_this) {
          return function(value) {
            return _this.deepClone(value);
          };
        })(this));
      } else if (isPlainObject(object)) {
        return _.mapObject(object, (function(_this) {
          return function(key, value) {
            return [key, _this.deepClone(value)];
          };
        })(this));
      } else {
        return object;
      }
    };

    Config.prototype.deepDefaults = function(target) {
      var i, j, key, len, object, ref1, result;
      result = target;
      i = 0;
      while (++i < arguments.length) {
        object = arguments[i];
        if (isPlainObject(result) && isPlainObject(object)) {
          ref1 = Object.keys(object);
          for (j = 0, len = ref1.length; j < len; j++) {
            key = ref1[j];
            result[key] = this.deepDefaults(result[key], object[key]);
          }
        } else {
          if (result == null) {
            result = this.deepClone(object);
          }
        }
      }
      return result;
    };

    Config.prototype.setScopedDefaultsFromSchema = function(keyPath, schema) {
      var childValue, key, keys, ref1, ref2, scope, scopeSchema, scopedDefaults;
      if ((schema.scopes != null) && isPlainObject(schema.scopes)) {
        scopedDefaults = {};
        ref1 = schema.scopes;
        for (scope in ref1) {
          scopeSchema = ref1[scope];
          if (!scopeSchema.hasOwnProperty('default')) {
            continue;
          }
          scopedDefaults[scope] = {};
          setValueAtKeyPath(scopedDefaults[scope], keyPath, scopeSchema["default"]);
        }
        this.scopedSettingsStore.addProperties('schema-default', scopedDefaults);
      }
      if (schema.type === 'object' && (schema.properties != null) && isPlainObject(schema.properties)) {
        keys = splitKeyPath(keyPath);
        ref2 = schema.properties;
        for (key in ref2) {
          childValue = ref2[key];
          if (!schema.properties.hasOwnProperty(key)) {
            continue;
          }
          this.setScopedDefaultsFromSchema(keys.concat([key]).join('.'), childValue);
        }
      }
    };

    Config.prototype.extractDefaultsFromSchema = function(schema) {
      var defaults, key, properties, value;
      if (schema["default"] != null) {
        return schema["default"];
      } else if (schema.type === 'object' && (schema.properties != null) && isPlainObject(schema.properties)) {
        defaults = {};
        properties = schema.properties || {};
        for (key in properties) {
          value = properties[key];
          defaults[key] = this.extractDefaultsFromSchema(value);
        }
        return defaults;
      }
    };

    Config.prototype.makeValueConformToSchema = function(keyPath, value, options) {
      var e, schema;
      if (options != null ? options.suppressException : void 0) {
        try {
          return this.makeValueConformToSchema(keyPath, value);
        } catch (error1) {
          e = error1;
          return void 0;
        }
      } else {
        if ((schema = this.getSchema(keyPath)) == null) {
          if (schema === false) {
            throw new Error("Illegal key path " + keyPath);
          }
        }
        return this.constructor.executeSchemaEnforcers(keyPath, value, schema);
      }
    };

    Config.prototype.resetSettingsForSchemaChange = function(source) {
      if (source == null) {
        source = this.getUserConfigPath();
      }
      return this.transact((function(_this) {
        return function() {
          var scopeSelector, selectorsAndSettings, settings;
          _this.settings = _this.makeValueConformToSchema(null, _this.settings, {
            suppressException: true
          });
          selectorsAndSettings = _this.scopedSettingsStore.propertiesForSource(source);
          _this.scopedSettingsStore.removePropertiesForSource(source);
          for (scopeSelector in selectorsAndSettings) {
            settings = selectorsAndSettings[scopeSelector];
            settings = _this.makeValueConformToSchema(null, settings, {
              suppressException: true
            });
            _this.setRawScopedValue(null, settings, source, scopeSelector);
          }
        };
      })(this));
    };


    /*
    Section: Private Scoped Settings
     */

    Config.prototype.priorityForSource = function(source) {
      if (source === this.getUserConfigPath()) {
        return 1000;
      } else {
        return 0;
      }
    };

    Config.prototype.emitChangeEvent = function() {
      if (!(this.transactDepth > 0)) {
        return this.emitter.emit('did-change');
      }
    };

    Config.prototype.resetUserScopedSettings = function(newScopedSettings) {
      var priority, scopeSelector, settings, source, validatedSettings;
      source = this.getUserConfigPath();
      priority = this.priorityForSource(source);
      this.scopedSettingsStore.removePropertiesForSource(source);
      for (scopeSelector in newScopedSettings) {
        settings = newScopedSettings[scopeSelector];
        settings = this.makeValueConformToSchema(null, settings, {
          suppressException: true
        });
        validatedSettings = {};
        validatedSettings[scopeSelector] = withoutEmptyObjects(settings);
        if (validatedSettings[scopeSelector] != null) {
          this.scopedSettingsStore.addProperties(source, validatedSettings, {
            priority: priority
          });
        }
      }
      return this.emitChangeEvent();
    };

    Config.prototype.setRawScopedValue = function(keyPath, value, source, selector, options) {
      var newValue, settingsBySelector;
      if (keyPath != null) {
        newValue = {};
        setValueAtKeyPath(newValue, keyPath, value);
        value = newValue;
      }
      settingsBySelector = {};
      settingsBySelector[selector] = value;
      this.scopedSettingsStore.addProperties(source, settingsBySelector, {
        priority: this.priorityForSource(source)
      });
      return this.emitChangeEvent();
    };

    Config.prototype.getRawScopedValue = function(scopeDescriptor, keyPath, options) {
      scopeDescriptor = ScopeDescriptor.fromObject(scopeDescriptor);
      return this.scopedSettingsStore.getPropertyValue(scopeDescriptor.getScopeChain(), keyPath, options);
    };

    Config.prototype.observeScopedKeyPath = function(scope, keyPath, callback) {
      callback(this.get(keyPath, {
        scope: scope
      }));
      return this.onDidChangeScopedKeyPath(scope, keyPath, function(event) {
        return callback(event.newValue);
      });
    };

    Config.prototype.onDidChangeScopedKeyPath = function(scope, keyPath, callback) {
      var oldValue;
      oldValue = this.get(keyPath, {
        scope: scope
      });
      return this.emitter.on('did-change', (function(_this) {
        return function() {
          var event, newValue;
          newValue = _this.get(keyPath, {
            scope: scope
          });
          if (!_.isEqual(oldValue, newValue)) {
            event = {
              oldValue: oldValue,
              newValue: newValue
            };
            oldValue = newValue;
            return callback(event);
          }
        };
      })(this));
    };

    return Config;

  })();

  Config.addSchemaEnforcers({
    'any': {
      coerce: function(keyPath, value, schema) {
        return value;
      }
    },
    'integer': {
      coerce: function(keyPath, value, schema) {
        value = parseInt(value);
        if (isNaN(value) || !isFinite(value)) {
          throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " cannot be coerced into an int");
        }
        return value;
      }
    },
    'number': {
      coerce: function(keyPath, value, schema) {
        value = parseFloat(value);
        if (isNaN(value) || !isFinite(value)) {
          throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " cannot be coerced into a number");
        }
        return value;
      }
    },
    'boolean': {
      coerce: function(keyPath, value, schema) {
        switch (typeof value) {
          case 'string':
            if (value.toLowerCase() === 'true') {
              return true;
            } else if (value.toLowerCase() === 'false') {
              return false;
            } else {
              throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " must be a boolean or the string 'true' or 'false'");
            }
            break;
          case 'boolean':
            return value;
          default:
            throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " must be a boolean or the string 'true' or 'false'");
        }
      }
    },
    'string': {
      validate: function(keyPath, value, schema) {
        if (typeof value !== 'string') {
          throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " must be a string");
        }
        return value;
      },
      validateMaximumLength: function(keyPath, value, schema) {
        if (typeof schema.maximumLength === 'number' && value.length > schema.maximumLength) {
          return value.slice(0, schema.maximumLength);
        } else {
          return value;
        }
      }
    },
    'null': {
      coerce: function(keyPath, value, schema) {
        if (value !== (void 0) && value !== null) {
          throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " must be null");
        }
        return value;
      }
    },
    'object': {
      coerce: function(keyPath, value, schema) {
        var allowsAdditionalProperties, childSchema, defaultChildSchema, error, newValue, prop, propValue, ref1;
        if (!isPlainObject(value)) {
          throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " must be an object");
        }
        if (schema.properties == null) {
          return value;
        }
        defaultChildSchema = null;
        allowsAdditionalProperties = true;
        if (isPlainObject(schema.additionalProperties)) {
          defaultChildSchema = schema.additionalProperties;
        }
        if (schema.additionalProperties === false) {
          allowsAdditionalProperties = false;
        }
        newValue = {};
        for (prop in value) {
          propValue = value[prop];
          childSchema = (ref1 = schema.properties[prop]) != null ? ref1 : defaultChildSchema;
          if (childSchema != null) {
            try {
              newValue[prop] = this.executeSchemaEnforcers(pushKeyPath(keyPath, prop), propValue, childSchema);
            } catch (error1) {
              error = error1;
              console.warn("Error setting item in object: " + error.message);
            }
          } else if (allowsAdditionalProperties) {
            newValue[prop] = propValue;
          } else {
            console.warn("Illegal object key: " + keyPath + "." + prop);
          }
        }
        return newValue;
      }
    },
    'array': {
      coerce: function(keyPath, value, schema) {
        var error, item, itemSchema, j, len, newValue;
        if (!Array.isArray(value)) {
          throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " must be an array");
        }
        itemSchema = schema.items;
        if (itemSchema != null) {
          newValue = [];
          for (j = 0, len = value.length; j < len; j++) {
            item = value[j];
            try {
              newValue.push(this.executeSchemaEnforcers(keyPath, item, itemSchema));
            } catch (error1) {
              error = error1;
              console.warn("Error setting item in array: " + error.message);
            }
          }
          return newValue;
        } else {
          return value;
        }
      }
    },
    'color': {
      coerce: function(keyPath, value, schema) {
        var color;
        color = Color.parse(value);
        if (color == null) {
          throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " cannot be coerced into a color");
        }
        return color;
      }
    },
    '*': {
      coerceMinimumAndMaximum: function(keyPath, value, schema) {
        if (typeof value !== 'number') {
          return value;
        }
        if ((schema.minimum != null) && typeof schema.minimum === 'number') {
          value = Math.max(value, schema.minimum);
        }
        if ((schema.maximum != null) && typeof schema.maximum === 'number') {
          value = Math.min(value, schema.maximum);
        }
        return value;
      },
      validateEnum: function(keyPath, value, schema) {
        var j, len, possibleValue, possibleValues;
        possibleValues = schema["enum"];
        if (Array.isArray(possibleValues)) {
          possibleValues = possibleValues.map(function(value) {
            if (value.hasOwnProperty('value')) {
              return value.value;
            } else {
              return value;
            }
          });
        }
        if (!((possibleValues != null) && Array.isArray(possibleValues) && possibleValues.length)) {
          return value;
        }
        for (j = 0, len = possibleValues.length; j < len; j++) {
          possibleValue = possibleValues[j];
          if (_.isEqual(possibleValue, value)) {
            return value;
          }
        }
        throw new Error("Validation failed at " + keyPath + ", " + (JSON.stringify(value)) + " is not one of " + (JSON.stringify(possibleValues)));
      }
    }
  });

  isPlainObject = function(value) {
    return _.isObject(value) && !_.isArray(value) && !_.isFunction(value) && !_.isString(value) && !(value instanceof Color);
  };

  sortObject = function(value) {
    var j, key, len, ref1, result;
    if (!isPlainObject(value)) {
      return value;
    }
    result = {};
    ref1 = Object.keys(value).sort();
    for (j = 0, len = ref1.length; j < len; j++) {
      key = ref1[j];
      result[key] = sortObject(value[key]);
    }
    return result;
  };

  withoutEmptyObjects = function(object) {
    var key, newValue, resultObject, value;
    resultObject = void 0;
    if (isPlainObject(object)) {
      for (key in object) {
        value = object[key];
        newValue = withoutEmptyObjects(value);
        if (newValue != null) {
          if (resultObject == null) {
            resultObject = {};
          }
          resultObject[key] = newValue;
        }
      }
    } else {
      resultObject = object;
    }
    return resultObject;
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2NvbmZpZy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLCtPQUFBO0lBQUE7O0VBQUEsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxpQkFBUjs7RUFDSixFQUFBLEdBQUssT0FBQSxDQUFRLFNBQVI7O0VBQ0osVUFBVyxPQUFBLENBQVEsV0FBUjs7RUFDWixJQUFBLEdBQU8sT0FBQSxDQUFRLFFBQVI7O0VBQ1AsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLEtBQUEsR0FBUSxPQUFBLENBQVEsT0FBUjs7RUFDUixXQUFBLEdBQWMsT0FBQSxDQUFRLGFBQVI7O0VBQ2QsTUFHSSxPQUFBLENBQVEsa0JBQVIsQ0FISixFQUNFLHlDQURGLEVBQ3FCLHlDQURyQixFQUN3QywrQ0FEeEMsRUFFRSw2QkFGRixFQUVlOztFQUdmLEtBQUEsR0FBUSxPQUFBLENBQVEsU0FBUjs7RUFDUixtQkFBQSxHQUFzQixPQUFBLENBQVEsdUJBQVI7O0VBQ3RCLGVBQUEsR0FBa0IsT0FBQSxDQUFRLG9CQUFSOztFQWlXbEIsTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNKLE1BQUMsQ0FBQSxlQUFELEdBQW1COztJQUVuQixNQUFDLENBQUEsaUJBQUQsR0FBb0IsU0FBQyxRQUFELEVBQVcsZ0JBQVg7QUFDbEIsVUFBQTs7WUFBaUIsQ0FBQSxRQUFBLElBQWE7O2FBQzlCLElBQUMsQ0FBQSxlQUFnQixDQUFBLFFBQUEsQ0FBUyxDQUFDLElBQTNCLENBQWdDLGdCQUFoQztJQUZrQjs7SUFJcEIsTUFBQyxDQUFBLGtCQUFELEdBQXFCLFNBQUMsT0FBRDtBQUNuQixVQUFBO0FBQUEsV0FBQSxtQkFBQTs7QUFDRSxhQUFBLGlCQUFBOztVQUNFLElBQUMsQ0FBQSxpQkFBRCxDQUFtQixRQUFuQixFQUE2QixnQkFBN0I7QUFERjtBQURGO0lBRG1C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QUFmLENBQUQsQ0FBbkMsR0FBMEQsaUJBQTFELEdBQTBFLENBQUMsSUFBSSxDQUFDLFNBQUwsQ0FBZSxjQUFmLENBQUQsQ0FBaEY7TUFiRSxDQVJkO0tBcEdGO0dBREY7O0VBNEhBLGFBQUEsR0FBZ0IsU0FBQyxLQUFEO1dBQ2QsQ0FBQyxDQUFDLFFBQUYsQ0FBVyxLQUFYLENBQUEsSUFBc0IsQ0FBSSxDQUFDLENBQUMsT0FBRixDQUFVLEtBQVYsQ0FBMUIsSUFBK0MsQ0FBSSxDQUFDLENBQUMsVUFBRixDQUFhLEtBQWIsQ0FBbkQsSUFBMkUsQ0FBSSxDQUFDLENBQUMsUUFBRixDQUFXLEtBQVgsQ0FBL0UsSUFBcUcsQ0FBSSxDQUFDLEtBQUEsWUFBaUIsS0FBbEI7RUFEM0Y7O0VBR2hCLFVBQUEsR0FBYSxTQUFDLEtBQUQ7QUFDWCxRQUFBO0lBQUEsSUFBQSxDQUFvQixhQUFBLENBQWMsS0FBZCxDQUFwQjtBQUFBLGFBQU8sTUFBUDs7SUFDQSxNQUFBLEdBQVM7QUFDVDtBQUFBLFNBQUEsc0NBQUE7O01BQ0UsTUFBTyxDQUFBLEdBQUEsQ0FBUCxHQUFjLFVBQUEsQ0FBVyxLQUFNLENBQUEsR0FBQSxDQUFqQjtBQURoQjtXQUVBO0VBTFc7O0VBT2IsbUJBQUEsR0FBc0IsU0FBQyxNQUFEO0FBQ3BCLFFBQUE7SUFBQSxZQUFBLEdBQWU7SUFDZixJQUFHLGFBQUEsQ0FBYyxNQUFkLENBQUg7QUFDRSxXQUFBLGFBQUE7O1FBQ0UsUUFBQSxHQUFXLG1CQUFBLENBQW9CLEtBQXBCO1FBQ1gsSUFBRyxnQkFBSDs7WUFDRSxlQUFnQjs7VUFDaEIsWUFBYSxDQUFBLEdBQUEsQ0FBYixHQUFvQixTQUZ0Qjs7QUFGRixPQURGO0tBQUEsTUFBQTtNQU9FLFlBQUEsR0FBZSxPQVBqQjs7V0FRQTtFQVZvQjtBQWh3Q3RCIiwic291cmNlc0NvbnRlbnQiOlsiXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbmZzID0gcmVxdWlyZSAnZnMtcGx1cydcbntFbWl0dGVyfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcbkNTT04gPSByZXF1aXJlICdzZWFzb24nXG5wYXRoID0gcmVxdWlyZSAncGF0aCdcbmFzeW5jID0gcmVxdWlyZSAnYXN5bmMnXG5wYXRoV2F0Y2hlciA9IHJlcXVpcmUgJ3BhdGh3YXRjaGVyJ1xue1xuICBnZXRWYWx1ZUF0S2V5UGF0aCwgc2V0VmFsdWVBdEtleVBhdGgsIGRlbGV0ZVZhbHVlQXRLZXlQYXRoLFxuICBwdXNoS2V5UGF0aCwgc3BsaXRLZXlQYXRoLFxufSA9IHJlcXVpcmUgJ2tleS1wYXRoLWhlbHBlcnMnXG5cbkNvbG9yID0gcmVxdWlyZSAnLi9jb2xvcidcblNjb3BlZFByb3BlcnR5U3RvcmUgPSByZXF1aXJlICdzY29wZWQtcHJvcGVydHktc3RvcmUnXG5TY29wZURlc2NyaXB0b3IgPSByZXF1aXJlICcuL3Njb3BlLWRlc2NyaXB0b3InXG5cbiMgRXNzZW50aWFsOiBVc2VkIHRvIGFjY2VzcyBhbGwgb2YgQXRvbSdzIGNvbmZpZ3VyYXRpb24gZGV0YWlscy5cbiNcbiMgQW4gaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcyBpcyBhbHdheXMgYXZhaWxhYmxlIGFzIHRoZSBgYXRvbS5jb25maWdgIGdsb2JhbC5cbiNcbiMgIyMgR2V0dGluZyBhbmQgc2V0dGluZyBjb25maWcgc2V0dGluZ3MuXG4jXG4jIGBgYGNvZmZlZVxuIyAjIE5vdGUgdGhhdCB3aXRoIG5vIHZhbHVlIHNldCwgOjpnZXQgcmV0dXJucyB0aGUgc2V0dGluZydzIGRlZmF1bHQgdmFsdWUuXG4jIGF0b20uY29uZmlnLmdldCgnbXktcGFja2FnZS5teUtleScpICMgLT4gJ2RlZmF1bHRWYWx1ZSdcbiNcbiMgYXRvbS5jb25maWcuc2V0KCdteS1wYWNrYWdlLm15S2V5JywgJ3ZhbHVlJylcbiMgYXRvbS5jb25maWcuZ2V0KCdteS1wYWNrYWdlLm15S2V5JykgIyAtPiAndmFsdWUnXG4jIGBgYFxuI1xuIyBZb3UgbWF5IHdhbnQgdG8gd2F0Y2ggZm9yIGNoYW5nZXMuIFVzZSB7OjpvYnNlcnZlfSB0byBjYXRjaCBjaGFuZ2VzIHRvIHRoZSBzZXR0aW5nLlxuI1xuIyBgYGBjb2ZmZWVcbiMgYXRvbS5jb25maWcuc2V0KCdteS1wYWNrYWdlLm15S2V5JywgJ3ZhbHVlJylcbiMgYXRvbS5jb25maWcub2JzZXJ2ZSAnbXktcGFja2FnZS5teUtleScsIChuZXdWYWx1ZSkgLT5cbiMgICAjIGBvYnNlcnZlYCBjYWxscyBpbW1lZGlhdGVseSBhbmQgZXZlcnkgdGltZSB0aGUgdmFsdWUgaXMgY2hhbmdlZFxuIyAgIGNvbnNvbGUubG9nICdNeSBjb25maWd1cmF0aW9uIGNoYW5nZWQ6JywgbmV3VmFsdWVcbiMgYGBgXG4jXG4jIElmIHlvdSB3YW50IGEgbm90aWZpY2F0aW9uIG9ubHkgd2hlbiB0aGUgdmFsdWUgY2hhbmdlcywgdXNlIHs6Om9uRGlkQ2hhbmdlfS5cbiNcbiMgYGBgY29mZmVlXG4jIGF0b20uY29uZmlnLm9uRGlkQ2hhbmdlICdteS1wYWNrYWdlLm15S2V5JywgKHtuZXdWYWx1ZSwgb2xkVmFsdWV9KSAtPlxuIyAgIGNvbnNvbGUubG9nICdNeSBjb25maWd1cmF0aW9uIGNoYW5nZWQ6JywgbmV3VmFsdWUsIG9sZFZhbHVlXG4jIGBgYFxuI1xuIyAjIyMgVmFsdWUgQ29lcmNpb25cbiNcbiMgQ29uZmlnIHNldHRpbmdzIGVhY2ggaGF2ZSBhIHR5cGUgc3BlY2lmaWVkIGJ5IHdheSBvZiBhXG4jIFtzY2hlbWFdKGpzb24tc2NoZW1hLm9yZykuIEZvciBleGFtcGxlIHdlIG1pZ2h0IGFuIGludGVnZXIgc2V0dGluZyB0aGF0IG9ubHlcbiMgYWxsb3dzIGludGVnZXJzIGdyZWF0ZXIgdGhhbiBgMGA6XG4jXG4jIGBgYGNvZmZlZVxuIyAjIFdoZW4gbm8gdmFsdWUgaGFzIGJlZW4gc2V0LCBgOjpnZXRgIHJldHVybnMgdGhlIHNldHRpbmcncyBkZWZhdWx0IHZhbHVlXG4jIGF0b20uY29uZmlnLmdldCgnbXktcGFja2FnZS5hbkludCcpICMgLT4gMTJcbiNcbiMgIyBUaGUgc3RyaW5nIHdpbGwgYmUgY29lcmNlZCB0byB0aGUgaW50ZWdlciAxMjNcbiMgYXRvbS5jb25maWcuc2V0KCdteS1wYWNrYWdlLmFuSW50JywgJzEyMycpXG4jIGF0b20uY29uZmlnLmdldCgnbXktcGFja2FnZS5hbkludCcpICMgLT4gMTIzXG4jXG4jICMgVGhlIHN0cmluZyB3aWxsIGJlIGNvZXJjZWQgdG8gYW4gaW50ZWdlciwgYnV0IGl0IG11c3QgYmUgZ3JlYXRlciB0aGFuIDAsIHNvIGlzIHNldCB0byAxXG4jIGF0b20uY29uZmlnLnNldCgnbXktcGFja2FnZS5hbkludCcsICctMjAnKVxuIyBhdG9tLmNvbmZpZy5nZXQoJ215LXBhY2thZ2UuYW5JbnQnKSAjIC0+IDFcbiMgYGBgXG4jXG4jICMjIERlZmluaW5nIHNldHRpbmdzIGZvciB5b3VyIHBhY2thZ2VcbiNcbiMgRGVmaW5lIGEgc2NoZW1hIHVuZGVyIGEgYGNvbmZpZ2Aga2V5IGluIHlvdXIgcGFja2FnZSBtYWluLlxuI1xuIyBgYGBjb2ZmZWVcbiMgbW9kdWxlLmV4cG9ydHMgPVxuIyAgICMgWW91ciBjb25maWcgc2NoZW1hXG4jICAgY29uZmlnOlxuIyAgICAgc29tZUludDpcbiMgICAgICAgdHlwZTogJ2ludGVnZXInXG4jICAgICAgIGRlZmF1bHQ6IDIzXG4jICAgICAgIG1pbmltdW06IDFcbiNcbiMgICBhY3RpdmF0ZTogKHN0YXRlKSAtPiAjIC4uLlxuIyAgICMgLi4uXG4jIGBgYFxuI1xuIyBTZWUgW3BhY2thZ2UgZG9jc10oaHR0cDovL2ZsaWdodC1tYW51YWwuYXRvbS5pby9oYWNraW5nLWF0b20vc2VjdGlvbnMvcGFja2FnZS13b3JkLWNvdW50LykgZm9yXG4jIG1vcmUgaW5mby5cbiNcbiMgIyMgQ29uZmlnIFNjaGVtYXNcbiNcbiMgV2UgdXNlIFtqc29uIHNjaGVtYV0oaHR0cDovL2pzb24tc2NoZW1hLm9yZykgd2hpY2ggYWxsb3dzIHlvdSB0byBkZWZpbmUgeW91ciB2YWx1ZSdzXG4jIGRlZmF1bHQsIHRoZSB0eXBlIGl0IHNob3VsZCBiZSwgZXRjLiBBIHNpbXBsZSBleGFtcGxlOlxuI1xuIyBgYGBjb2ZmZWVcbiMgIyBXZSB3YW50IHRvIHByb3ZpZGUgYW4gYGVuYWJsZVRoaW5nYCwgYW5kIGEgYHRoaW5nVm9sdW1lYFxuIyBjb25maWc6XG4jICAgZW5hYmxlVGhpbmc6XG4jICAgICB0eXBlOiAnYm9vbGVhbidcbiMgICAgIGRlZmF1bHQ6IGZhbHNlXG4jICAgdGhpbmdWb2x1bWU6XG4jICAgICB0eXBlOiAnaW50ZWdlcidcbiMgICAgIGRlZmF1bHQ6IDVcbiMgICAgIG1pbmltdW06IDFcbiMgICAgIG1heGltdW06IDExXG4jIGBgYFxuI1xuIyBUaGUgdHlwZSBrZXl3b3JkIGFsbG93cyBmb3IgdHlwZSBjb2VyY2lvbiBhbmQgdmFsaWRhdGlvbi4gSWYgYSBgdGhpbmdWb2x1bWVgIGlzXG4jIHNldCB0byBhIHN0cmluZyBgJzEwJ2AsIGl0IHdpbGwgYmUgY29lcmNlZCBpbnRvIGFuIGludGVnZXIuXG4jXG4jIGBgYGNvZmZlZVxuIyBhdG9tLmNvbmZpZy5zZXQoJ215LXBhY2thZ2UudGhpbmdWb2x1bWUnLCAnMTAnKVxuIyBhdG9tLmNvbmZpZy5nZXQoJ215LXBhY2thZ2UudGhpbmdWb2x1bWUnKSAjIC0+IDEwXG4jXG4jICMgSXQgcmVzcGVjdHMgdGhlIG1pbiAvIG1heFxuIyBhdG9tLmNvbmZpZy5zZXQoJ215LXBhY2thZ2UudGhpbmdWb2x1bWUnLCAnNDAwJylcbiMgYXRvbS5jb25maWcuZ2V0KCdteS1wYWNrYWdlLnRoaW5nVm9sdW1lJykgIyAtPiAxMVxuI1xuIyAjIElmIGl0IGNhbm5vdCBiZSBjb2VyY2VkLCB0aGUgdmFsdWUgd2lsbCBub3QgYmUgc2V0XG4jIGF0b20uY29uZmlnLnNldCgnbXktcGFja2FnZS50aGluZ1ZvbHVtZScsICdjYXRzJylcbiMgYXRvbS5jb25maWcuZ2V0KCdteS1wYWNrYWdlLnRoaW5nVm9sdW1lJykgIyAtPiAxMVxuIyBgYGBcbiNcbiMgIyMjIFN1cHBvcnRlZCBUeXBlc1xuI1xuIyBUaGUgYHR5cGVgIGtleXdvcmQgY2FuIGJlIGEgc3RyaW5nIHdpdGggYW55IG9uZSBvZiB0aGUgZm9sbG93aW5nLiBZb3UgY2FuIGFsc29cbiMgY2hhaW4gdGhlbSBieSBzcGVjaWZ5aW5nIG11bHRpcGxlIGluIGFuIGFuIGFycmF5LiBGb3IgZXhhbXBsZVxuI1xuIyBgYGBjb2ZmZWVcbiMgY29uZmlnOlxuIyAgIHNvbWVTZXR0aW5nOlxuIyAgICAgdHlwZTogWydib29sZWFuJywgJ2ludGVnZXInXVxuIyAgICAgZGVmYXVsdDogNVxuI1xuIyAjIFRoZW5cbiMgYXRvbS5jb25maWcuc2V0KCdteS1wYWNrYWdlLnNvbWVTZXR0aW5nJywgJ3RydWUnKVxuIyBhdG9tLmNvbmZpZy5nZXQoJ215LXBhY2thZ2Uuc29tZVNldHRpbmcnKSAjIC0+IHRydWVcbiNcbiMgYXRvbS5jb25maWcuc2V0KCdteS1wYWNrYWdlLnNvbWVTZXR0aW5nJywgJzEyJylcbiMgYXRvbS5jb25maWcuZ2V0KCdteS1wYWNrYWdlLnNvbWVTZXR0aW5nJykgIyAtPiAxMlxuIyBgYGBcbiNcbiMgIyMjIyBzdHJpbmdcbiNcbiMgVmFsdWVzIG11c3QgYmUgYSBzdHJpbmcuXG4jXG4jIGBgYGNvZmZlZVxuIyBjb25maWc6XG4jICAgc29tZVNldHRpbmc6XG4jICAgICB0eXBlOiAnc3RyaW5nJ1xuIyAgICAgZGVmYXVsdDogJ2hlbGxvJ1xuIyBgYGBcbiNcbiMgIyMjIyBpbnRlZ2VyXG4jXG4jIFZhbHVlcyB3aWxsIGJlIGNvZXJjZWQgaW50byBpbnRlZ2VyLiBTdXBwb3J0cyB0aGUgKG9wdGlvbmFsKSBgbWluaW11bWAgYW5kXG4jIGBtYXhpbXVtYCBrZXlzLlxuI1xuIyAgIGBgYGNvZmZlZVxuIyAgIGNvbmZpZzpcbiMgICAgIHNvbWVTZXR0aW5nOlxuIyAgICAgICB0eXBlOiAnaW50ZWdlcidcbiMgICAgICAgZGVmYXVsdDogNVxuIyAgICAgICBtaW5pbXVtOiAxXG4jICAgICAgIG1heGltdW06IDExXG4jICAgYGBgXG4jXG4jICMjIyMgbnVtYmVyXG4jXG4jIFZhbHVlcyB3aWxsIGJlIGNvZXJjZWQgaW50byBhIG51bWJlciwgaW5jbHVkaW5nIHJlYWwgbnVtYmVycy4gU3VwcG9ydHMgdGhlXG4jIChvcHRpb25hbCkgYG1pbmltdW1gIGFuZCBgbWF4aW11bWAga2V5cy5cbiNcbiMgYGBgY29mZmVlXG4jIGNvbmZpZzpcbiMgICBzb21lU2V0dGluZzpcbiMgICAgIHR5cGU6ICdudW1iZXInXG4jICAgICBkZWZhdWx0OiA1LjNcbiMgICAgIG1pbmltdW06IDEuNVxuIyAgICAgbWF4aW11bTogMTEuNVxuIyBgYGBcbiNcbiMgIyMjIyBib29sZWFuXG4jXG4jIFZhbHVlcyB3aWxsIGJlIGNvZXJjZWQgaW50byBhIEJvb2xlYW4uIGAndHJ1ZSdgIGFuZCBgJ2ZhbHNlJ2Agd2lsbCBiZSBjb2VyY2VkIGludG9cbiMgYSBib29sZWFuLiBOdW1iZXJzLCBhcnJheXMsIG9iamVjdHMsIGFuZCBhbnl0aGluZyBlbHNlIHdpbGwgbm90IGJlIGNvZXJjZWQuXG4jXG4jIGBgYGNvZmZlZVxuIyBjb25maWc6XG4jICAgc29tZVNldHRpbmc6XG4jICAgICB0eXBlOiAnYm9vbGVhbidcbiMgICAgIGRlZmF1bHQ6IGZhbHNlXG4jIGBgYFxuI1xuIyAjIyMjIGFycmF5XG4jXG4jIFZhbHVlIG11c3QgYmUgYW4gQXJyYXkuIFRoZSB0eXBlcyBvZiB0aGUgdmFsdWVzIGNhbiBiZSBzcGVjaWZpZWQgYnkgYVxuIyBzdWJzY2hlbWEgaW4gdGhlIGBpdGVtc2Aga2V5LlxuI1xuIyBgYGBjb2ZmZWVcbiMgY29uZmlnOlxuIyAgIHNvbWVTZXR0aW5nOlxuIyAgICAgdHlwZTogJ2FycmF5J1xuIyAgICAgZGVmYXVsdDogWzEsIDIsIDNdXG4jICAgICBpdGVtczpcbiMgICAgICAgdHlwZTogJ2ludGVnZXInXG4jICAgICAgIG1pbmltdW06IDEuNVxuIyAgICAgICBtYXhpbXVtOiAxMS41XG4jIGBgYFxuI1xuIyAjIyMjIGNvbG9yXG4jXG4jIFZhbHVlcyB3aWxsIGJlIGNvZXJjZWQgaW50byBhIHtDb2xvcn0gd2l0aCBgcmVkYCwgYGdyZWVuYCwgYGJsdWVgLCBhbmQgYGFscGhhYFxuIyBwcm9wZXJ0aWVzIHRoYXQgYWxsIGhhdmUgbnVtZXJpYyB2YWx1ZXMuIGByZWRgLCBgZ3JlZW5gLCBgYmx1ZWAgd2lsbCBiZSBpblxuIyB0aGUgcmFuZ2UgMCB0byAyNTUgYW5kIGB2YWx1ZWAgd2lsbCBiZSBpbiB0aGUgcmFuZ2UgMCB0byAxLiBWYWx1ZXMgY2FuIGJlIGFueVxuIyB2YWxpZCBDU1MgY29sb3IgZm9ybWF0IHN1Y2ggYXMgYCNhYmNgLCBgI2FiY2RlZmAsIGB3aGl0ZWAsXG4jIGByZ2IoNTAsIDEwMCwgMTUwKWAsIGFuZCBgcmdiYSgyNSwgNzUsIDEyNSwgLjc1KWAuXG4jXG4jIGBgYGNvZmZlZVxuIyBjb25maWc6XG4jICAgc29tZVNldHRpbmc6XG4jICAgICB0eXBlOiAnY29sb3InXG4jICAgICBkZWZhdWx0OiAnd2hpdGUnXG4jIGBgYFxuI1xuIyAjIyMjIG9iamVjdCAvIEdyb3VwaW5nIG90aGVyIHR5cGVzXG4jXG4jIEEgY29uZmlnIHNldHRpbmcgd2l0aCB0aGUgdHlwZSBgb2JqZWN0YCBhbGxvd3MgZ3JvdXBpbmcgYSBzZXQgb2YgY29uZmlnXG4jIHNldHRpbmdzLiBUaGUgZ3JvdXAgd2lsbCBiZSB2aXN1YWx5IHNlcGFyYXRlZCBhbmQgaGFzIGl0cyBvd24gZ3JvdXAgaGVhZGxpbmUuXG4jIFRoZSBzdWIgb3B0aW9ucyBtdXN0IGJlIGxpc3RlZCB1bmRlciBhIGBwcm9wZXJ0aWVzYCBrZXkuXG4jXG4jIGBgYGNvZmZlZVxuIyBjb25maWc6XG4jICAgc29tZVNldHRpbmc6XG4jICAgICB0eXBlOiAnb2JqZWN0J1xuIyAgICAgcHJvcGVydGllczpcbiMgICAgICAgbXlDaGlsZEludE9wdGlvbjpcbiMgICAgICAgICB0eXBlOiAnaW50ZWdlcidcbiMgICAgICAgICBtaW5pbXVtOiAxLjVcbiMgICAgICAgICBtYXhpbXVtOiAxMS41XG4jIGBgYFxuI1xuIyAjIyMgT3RoZXIgU3VwcG9ydGVkIEtleXNcbiNcbiMgIyMjIyBlbnVtXG4jXG4jIEFsbCB0eXBlcyBzdXBwb3J0IGFuIGBlbnVtYCBrZXksIHdoaWNoIGxldHMgeW91IHNwZWNpZnkgYWxsIHRoZSB2YWx1ZXMgdGhlXG4jIHNldHRpbmcgY2FuIHRha2UuIGBlbnVtYCBtYXkgYmUgYW4gYXJyYXkgb2YgYWxsb3dlZCB2YWx1ZXMgKG9mIHRoZSBzcGVjaWZpZWRcbiMgdHlwZSksIG9yIGFuIGFycmF5IG9mIG9iamVjdHMgd2l0aCBgdmFsdWVgIGFuZCBgZGVzY3JpcHRpb25gIHByb3BlcnRpZXMsIHdoZXJlXG4jIHRoZSBgdmFsdWVgIGlzIGFuIGFsbG93ZWQgdmFsdWUsIGFuZCB0aGUgYGRlc2NyaXB0aW9uYCBpcyBhIGRlc2NyaXB0aXZlIHN0cmluZ1xuIyB1c2VkIGluIHRoZSBzZXR0aW5ncyB2aWV3LlxuI1xuIyBJbiB0aGlzIGV4YW1wbGUsIHRoZSBzZXR0aW5nIG11c3QgYmUgb25lIG9mIHRoZSA0IGludGVnZXJzOlxuI1xuIyBgYGBjb2ZmZWVcbiMgY29uZmlnOlxuIyAgIHNvbWVTZXR0aW5nOlxuIyAgICAgdHlwZTogJ2ludGVnZXInXG4jICAgICBkZWZhdWx0OiA0XG4jICAgICBlbnVtOiBbMiwgNCwgNiwgOF1cbiMgYGBgXG4jXG4jIEluIHRoaXMgZXhhbXBsZSwgdGhlIHNldHRpbmcgbXVzdCBiZSBlaXRoZXIgJ2Zvbycgb3IgJ2JhcicsIHdoaWNoIGFyZVxuIyBwcmVzZW50ZWQgdXNpbmcgdGhlIHByb3ZpZGVkIGRlc2NyaXB0aW9ucyBpbiB0aGUgc2V0dGluZ3MgcGFuZTpcbiNcbiMgYGBgY29mZmVlXG4jIGNvbmZpZzpcbiMgICBzb21lU2V0dGluZzpcbiMgICAgIHR5cGU6ICdzdHJpbmcnXG4jICAgICBkZWZhdWx0OiAnZm9vJ1xuIyAgICAgZW51bTogW1xuIyAgICAgICB7dmFsdWU6ICdmb28nLCBkZXNjcmlwdGlvbjogJ0ZvbyBtb2RlLiBZb3Ugd2FudCB0aGlzLid9XG4jICAgICAgIHt2YWx1ZTogJ2JhcicsIGRlc2NyaXB0aW9uOiAnQmFyIG1vZGUuIE5vYm9keSB3YW50cyB0aGF0ISd9XG4jICAgICBdXG4jIGBgYFxuI1xuIyBVc2FnZTpcbiNcbiMgYGBgY29mZmVlXG4jIGF0b20uY29uZmlnLnNldCgnbXktcGFja2FnZS5zb21lU2V0dGluZycsICcyJylcbiMgYXRvbS5jb25maWcuZ2V0KCdteS1wYWNrYWdlLnNvbWVTZXR0aW5nJykgIyAtPiAyXG4jXG4jICMgd2lsbCBub3Qgc2V0IHZhbHVlcyBvdXRzaWRlIG9mIHRoZSBlbnVtIHZhbHVlc1xuIyBhdG9tLmNvbmZpZy5zZXQoJ215LXBhY2thZ2Uuc29tZVNldHRpbmcnLCAnMycpXG4jIGF0b20uY29uZmlnLmdldCgnbXktcGFja2FnZS5zb21lU2V0dGluZycpICMgLT4gMlxuI1xuIyAjIElmIGl0IGNhbm5vdCBiZSBjb2VyY2VkLCB0aGUgdmFsdWUgd2lsbCBub3QgYmUgc2V0XG4jIGF0b20uY29uZmlnLnNldCgnbXktcGFja2FnZS5zb21lU2V0dGluZycsICc0JylcbiMgYXRvbS5jb25maWcuZ2V0KCdteS1wYWNrYWdlLnNvbWVTZXR0aW5nJykgIyAtPiA0XG4jIGBgYFxuI1xuIyAjIyMjIHRpdGxlIGFuZCBkZXNjcmlwdGlvblxuI1xuIyBUaGUgc2V0dGluZ3MgdmlldyB3aWxsIHVzZSB0aGUgYHRpdGxlYCBhbmQgYGRlc2NyaXB0aW9uYCBrZXlzIHRvIGRpc3BsYXkgeW91clxuIyBjb25maWcgc2V0dGluZyBpbiBhIHJlYWRhYmxlIHdheS4gQnkgZGVmYXVsdCB0aGUgc2V0dGluZ3MgdmlldyBodW1hbml6ZXMgeW91clxuIyBjb25maWcga2V5LCBzbyBgc29tZVNldHRpbmdgIGJlY29tZXMgYFNvbWUgU2V0dGluZ2AuIEluIHNvbWUgY2FzZXMsIHRoaXMgaXNcbiMgY29uZnVzaW5nIGZvciB1c2VycywgYW5kIGEgbW9yZSBkZXNjcmlwdGl2ZSB0aXRsZSBpcyB1c2VmdWwuXG4jXG4jIERlc2NyaXB0aW9ucyB3aWxsIGJlIGRpc3BsYXllZCBiZWxvdyB0aGUgdGl0bGUgaW4gdGhlIHNldHRpbmdzIHZpZXcuXG4jXG4jIEZvciBhIGdyb3VwIG9mIGNvbmZpZyBzZXR0aW5ncyB0aGUgaHVtYW5pemVkIGtleSBvciB0aGUgdGl0bGUgYW5kIHRoZVxuIyBkZXNjcmlwdGlvbiBhcmUgdXNlZCBmb3IgdGhlIGdyb3VwIGhlYWRsaW5lLlxuI1xuIyBgYGBjb2ZmZWVcbiMgY29uZmlnOlxuIyAgIHNvbWVTZXR0aW5nOlxuIyAgICAgdGl0bGU6ICdTZXR0aW5nIE1hZ25pdHVkZSdcbiMgICAgIGRlc2NyaXB0aW9uOiAnVGhpcyB3aWxsIGFmZmVjdCB0aGUgYmxhaCBhbmQgdGhlIG90aGVyIGJsYWgnXG4jICAgICB0eXBlOiAnaW50ZWdlcidcbiMgICAgIGRlZmF1bHQ6IDRcbiMgYGBgXG4jXG4jIF9fTm90ZV9fOiBZb3Ugc2hvdWxkIHN0cml2ZSB0byBiZSBzbyBjbGVhciBpbiB5b3VyIG5hbWluZyBvZiB0aGUgc2V0dGluZyB0aGF0XG4jIHlvdSBkbyBub3QgbmVlZCB0byBzcGVjaWZ5IGEgdGl0bGUgb3IgZGVzY3JpcHRpb24hXG4jXG4jIERlc2NyaXB0aW9ucyBhbGxvdyBhIHN1YnNldCBvZlxuIyBbTWFya2Rvd24gZm9ybWF0dGluZ10oaHR0cHM6Ly9oZWxwLmdpdGh1Yi5jb20vYXJ0aWNsZXMvZ2l0aHViLWZsYXZvcmVkLW1hcmtkb3duLykuXG4jIFNwZWNpZmljYWxseSwgeW91IG1heSB1c2UgdGhlIGZvbGxvd2luZyBpbiBjb25maWd1cmF0aW9uIHNldHRpbmcgZGVzY3JpcHRpb25zOlxuI1xuIyAqICoqYm9sZCoqIC0gYCoqYm9sZCoqYFxuIyAqICppdGFsaWNzKiAtIGAqaXRhbGljcypgXG4jICogW2xpbmtzXShodHRwczovL2F0b20uaW8pIC0gYFtsaW5rc10oaHR0cHM6Ly9hdG9tLmlvKWBcbiMgKiBgY29kZSBzcGFuc2AgLSBgXFxgY29kZSBzcGFuc1xcYGBcbiMgKiBsaW5lIGJyZWFrcyAtIGBsaW5lIGJyZWFrczxici8+YFxuIyAqIH5+c3RyaWtldGhyb3VnaH5+IC0gYH5+c3RyaWtldGhyb3VnaH5+YFxuI1xuIyAjIyMjIG9yZGVyXG4jXG4jIFRoZSBzZXR0aW5ncyB2aWV3IG9yZGVycyB5b3VyIHNldHRpbmdzIGFscGhhYmV0aWNhbGx5LiBZb3UgY2FuIG92ZXJyaWRlIHRoaXNcbiMgb3JkZXJpbmcgd2l0aCB0aGUgb3JkZXIga2V5LlxuI1xuIyBgYGBjb2ZmZWVcbiMgY29uZmlnOlxuIyAgIHpTZXR0aW5nOlxuIyAgICAgdHlwZTogJ2ludGVnZXInXG4jICAgICBkZWZhdWx0OiA0XG4jICAgICBvcmRlcjogMVxuIyAgIGFTZXR0aW5nOlxuIyAgICAgdHlwZTogJ2ludGVnZXInXG4jICAgICBkZWZhdWx0OiA0XG4jICAgICBvcmRlcjogMlxuIyBgYGBcbiNcbiMgIyMgTWFuaXB1bGF0aW5nIHZhbHVlcyBvdXRzaWRlIHlvdXIgY29uZmlndXJhdGlvbiBzY2hlbWFcbiNcbiMgSXQgaXMgcG9zc2libGUgdG8gbWFuaXB1bGF0ZShgZ2V0YCwgYHNldGAsIGBvYnNlcnZlYCBldGMpIHZhbHVlcyB0aGF0IGRvIG5vdFxuIyBhcHBlYXIgaW4geW91ciBjb25maWd1cmF0aW9uIHNjaGVtYS4gRm9yIGV4YW1wbGUsIGlmIHRoZSBjb25maWcgc2NoZW1hIG9mIHRoZVxuIyBwYWNrYWdlICdzb21lLXBhY2thZ2UnIGlzXG4jXG4jIGBgYGNvZmZlZVxuIyBjb25maWc6XG4jIHNvbWVTZXR0aW5nOlxuIyAgIHR5cGU6ICdib29sZWFuJ1xuIyAgIGRlZmF1bHQ6IGZhbHNlXG4jIGBgYFxuI1xuIyBZb3UgY2FuIHN0aWxsIGRvIHRoZSBmb2xsb3dpbmdcbiNcbiMgYGBgY29mZmVlXG4jIGxldCBvdGhlclNldHRpbmcgID0gYXRvbS5jb25maWcuZ2V0KCdzb21lLXBhY2thZ2Uub3RoZXJTZXR0aW5nJylcbiMgYXRvbS5jb25maWcuc2V0KCdzb21lLXBhY2thZ2Uuc3RpbGxBbm90aGVyU2V0dGluZycsIG90aGVyU2V0dGluZyAqIDUpXG4jIGBgYFxuI1xuIyBJbiBvdGhlciB3b3JkcywgaWYgYSBmdW5jdGlvbiBhc2tzIGZvciBhIGBrZXktcGF0aGAsIHRoYXQgcGF0aCBkb2Vzbid0IGhhdmUgdG9cbiMgYmUgZGVzY3JpYmVkIGluIHRoZSBjb25maWcgc2NoZW1hIGZvciB0aGUgcGFja2FnZSBvciBhbnkgcGFja2FnZS4gSG93ZXZlciwgYXNcbiMgaGlnaGxpZ2h0ZWQgaW4gdGhlIGJlc3QgcHJhY3RpY2VzIHNlY3Rpb24sIHlvdSBhcmUgYWR2aXNlZCBhZ2FpbnN0IGRvaW5nIHRoZVxuIyBhYm92ZS5cbiNcbiMgIyMgQmVzdCBwcmFjdGljZXNcbiNcbiMgKiBEb24ndCBkZXBlbmQgb24gKG9yIHdyaXRlIHRvKSBjb25maWd1cmF0aW9uIGtleXMgb3V0c2lkZSBvZiB5b3VyIGtleXBhdGguXG4jXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBDb25maWdcbiAgQHNjaGVtYUVuZm9yY2VycyA9IHt9XG5cbiAgQGFkZFNjaGVtYUVuZm9yY2VyOiAodHlwZU5hbWUsIGVuZm9yY2VyRnVuY3Rpb24pIC0+XG4gICAgQHNjaGVtYUVuZm9yY2Vyc1t0eXBlTmFtZV0gPz0gW11cbiAgICBAc2NoZW1hRW5mb3JjZXJzW3R5cGVOYW1lXS5wdXNoKGVuZm9yY2VyRnVuY3Rpb24pXG5cbiAgQGFkZFNjaGVtYUVuZm9yY2VyczogKGZpbHRlcnMpIC0+XG4gICAgZm9yIHR5cGVOYW1lLCBmdW5jdGlvbnMgb2YgZmlsdGVyc1xuICAgICAgZm9yIG5hbWUsIGVuZm9yY2VyRnVuY3Rpb24gb2YgZnVuY3Rpb25zXG4gICAgICAgIEBhZGRTY2hlbWFFbmZvcmNlcih0eXBlTmFtZSwgZW5mb3JjZXJGdW5jdGlvbilcbiAgICByZXR1cm5cblxuICBAZXhlY3V0ZVNjaGVtYUVuZm9yY2VyczogKGtleVBhdGgsIHZhbHVlLCBzY2hlbWEpIC0+XG4gICAgZXJyb3IgPSBudWxsXG4gICAgdHlwZXMgPSBzY2hlbWEudHlwZVxuICAgIHR5cGVzID0gW3R5cGVzXSB1bmxlc3MgQXJyYXkuaXNBcnJheSh0eXBlcylcbiAgICBmb3IgdHlwZSBpbiB0eXBlc1xuICAgICAgdHJ5XG4gICAgICAgIGVuZm9yY2VyRnVuY3Rpb25zID0gQHNjaGVtYUVuZm9yY2Vyc1t0eXBlXS5jb25jYXQoQHNjaGVtYUVuZm9yY2Vyc1snKiddKVxuICAgICAgICBmb3IgZW5mb3JjZXIgaW4gZW5mb3JjZXJGdW5jdGlvbnNcbiAgICAgICAgICAjIEF0IHNvbWUgcG9pbnQgaW4gb25lJ3MgbGlmZSwgb25lIG11c3QgY2FsbCB1cG9uIGFuIGVuZm9yY2VyLlxuICAgICAgICAgIHZhbHVlID0gZW5mb3JjZXIuY2FsbCh0aGlzLCBrZXlQYXRoLCB2YWx1ZSwgc2NoZW1hKVxuICAgICAgICBlcnJvciA9IG51bGxcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhdGNoIGVcbiAgICAgICAgZXJyb3IgPSBlXG5cbiAgICB0aHJvdyBlcnJvciBpZiBlcnJvcj9cbiAgICB2YWx1ZVxuXG4gICMgQ3JlYXRlZCBkdXJpbmcgaW5pdGlhbGl6YXRpb24sIGF2YWlsYWJsZSBhcyBgYXRvbS5jb25maWdgXG4gIGNvbnN0cnVjdG9yOiAoe0Bub3RpZmljYXRpb25NYW5hZ2VyLCBAZW5hYmxlUGVyc2lzdGVuY2V9PXt9KSAtPlxuICAgIEBjbGVhcigpXG5cbiAgaW5pdGlhbGl6ZTogKHtAY29uZmlnRGlyUGF0aCwgQHJlc291cmNlUGF0aCwgcHJvamVjdEhvbWVTY2hlbWF9KSAtPlxuICAgIGlmIEBlbmFibGVQZXJzaXN0ZW5jZT9cbiAgICAgIEBjb25maWdGaWxlUGF0aCA9IGZzLnJlc29sdmUoQGNvbmZpZ0RpclBhdGgsICdjb25maWcnLCBbJ2pzb24nLCAnY3NvbiddKVxuICAgICAgQGNvbmZpZ0ZpbGVQYXRoID89IHBhdGguam9pbihAY29uZmlnRGlyUGF0aCwgJ2NvbmZpZy5jc29uJylcblxuICAgIEBzY2hlbWEucHJvcGVydGllcy5jb3JlLnByb3BlcnRpZXMucHJvamVjdEhvbWUgPSBwcm9qZWN0SG9tZVNjaGVtYVxuICAgIEBkZWZhdWx0U2V0dGluZ3MuY29yZS5wcm9qZWN0SG9tZSA9IHByb2plY3RIb21lU2NoZW1hLmRlZmF1bHRcblxuICBjbGVhcjogLT5cbiAgICBAZW1pdHRlciA9IG5ldyBFbWl0dGVyXG4gICAgQHNjaGVtYSA9XG4gICAgICB0eXBlOiAnb2JqZWN0J1xuICAgICAgcHJvcGVydGllczoge31cbiAgICBAZGVmYXVsdFNldHRpbmdzID0ge31cbiAgICBAc2V0dGluZ3MgPSB7fVxuICAgIEBzY29wZWRTZXR0aW5nc1N0b3JlID0gbmV3IFNjb3BlZFByb3BlcnR5U3RvcmVcbiAgICBAY29uZmlnRmlsZUhhc0Vycm9ycyA9IGZhbHNlXG4gICAgQHRyYW5zYWN0RGVwdGggPSAwXG4gICAgQHNhdmVQZW5kaW5nID0gZmFsc2VcbiAgICBAcmVxdWVzdExvYWQgPSBfLmRlYm91bmNlKEBsb2FkVXNlckNvbmZpZywgMTAwKVxuICAgIEByZXF1ZXN0U2F2ZSA9ID0+XG4gICAgICBAc2F2ZVBlbmRpbmcgPSB0cnVlXG4gICAgICBkZWJvdW5jZWRTYXZlLmNhbGwodGhpcylcbiAgICBzYXZlID0gPT5cbiAgICAgIEBzYXZlUGVuZGluZyA9IGZhbHNlXG4gICAgICBAc2F2ZSgpXG4gICAgZGVib3VuY2VkU2F2ZSA9IF8uZGVib3VuY2Uoc2F2ZSwgMTAwKVxuXG4gIHNob3VsZE5vdEFjY2Vzc0ZpbGVTeXN0ZW06IC0+IG5vdCBAZW5hYmxlUGVyc2lzdGVuY2VcblxuICAjIyNcbiAgU2VjdGlvbjogQ29uZmlnIFN1YnNjcmlwdGlvblxuICAjIyNcblxuICAjIEVzc2VudGlhbDogQWRkIGEgbGlzdGVuZXIgZm9yIGNoYW5nZXMgdG8gYSBnaXZlbiBrZXkgcGF0aC4gVGhpcyBpcyBkaWZmZXJlbnRcbiAgIyB0aGFuIHs6Om9uRGlkQ2hhbmdlfSBpbiB0aGF0IGl0IHdpbGwgaW1tZWRpYXRlbHkgY2FsbCB5b3VyIGNhbGxiYWNrIHdpdGggdGhlXG4gICMgY3VycmVudCB2YWx1ZSBvZiB0aGUgY29uZmlnIGVudHJ5LlxuICAjXG4gICMgIyMjIEV4YW1wbGVzXG4gICNcbiAgIyBZb3UgbWlnaHQgd2FudCB0byBiZSBub3RpZmllZCB3aGVuIHRoZSB0aGVtZXMgY2hhbmdlLiBXZSdsbCB3YXRjaFxuICAjIGBjb3JlLnRoZW1lc2AgZm9yIGNoYW5nZXNcbiAgI1xuICAjIGBgYGNvZmZlZVxuICAjIGF0b20uY29uZmlnLm9ic2VydmUgJ2NvcmUudGhlbWVzJywgKHZhbHVlKSAtPlxuICAjICAgIyBkbyBzdHVmZiB3aXRoIHZhbHVlXG4gICMgYGBgXG4gICNcbiAgIyAqIGBrZXlQYXRoYCB7U3RyaW5nfSBuYW1lIG9mIHRoZSBrZXkgdG8gb2JzZXJ2ZVxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkge09iamVjdH1cbiAgIyAgICogYHNjb3BlYCAob3B0aW9uYWwpIHtTY29wZURlc2NyaXB0b3J9IGRlc2NyaWJpbmcgYSBwYXRoIGZyb21cbiAgIyAgICAgdGhlIHJvb3Qgb2YgdGhlIHN5bnRheCB0cmVlIHRvIGEgdG9rZW4uIEdldCBvbmUgYnkgY2FsbGluZ1xuICAjICAgICB7ZWRpdG9yLmdldExhc3RDdXJzb3IoKS5nZXRTY29wZURlc2NyaXB0b3IoKX0uIFNlZSB7OjpnZXR9IGZvciBleGFtcGxlcy5cbiAgIyAgICAgU2VlIFt0aGUgc2NvcGVzIGRvY3NdKGh0dHA6Ly9mbGlnaHQtbWFudWFsLmF0b20uaW8vYmVoaW5kLWF0b20vc2VjdGlvbnMvc2NvcGVkLXNldHRpbmdzLXNjb3Blcy1hbmQtc2NvcGUtZGVzY3JpcHRvcnMvKVxuICAjICAgICBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBjYWxsIHdoZW4gdGhlIHZhbHVlIG9mIHRoZSBrZXkgY2hhbmdlcy5cbiAgIyAgICogYHZhbHVlYCB0aGUgbmV3IHZhbHVlIG9mIHRoZSBrZXlcbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXMgb24gd2hpY2ggeW91IGNhbiBjYWxsXG4gICMgYC5kaXNwb3NlKClgIHRvIHVuc3Vic2NyaWJlLlxuICBvYnNlcnZlOiAtPlxuICAgIGlmIGFyZ3VtZW50cy5sZW5ndGggaXMgMlxuICAgICAgW2tleVBhdGgsIGNhbGxiYWNrXSA9IGFyZ3VtZW50c1xuICAgIGVsc2UgaWYgYXJndW1lbnRzLmxlbmd0aCBpcyAzIGFuZCAoXy5pc1N0cmluZyhhcmd1bWVudHNbMF0pIGFuZCBfLmlzT2JqZWN0KGFyZ3VtZW50c1sxXSkpXG4gICAgICBba2V5UGF0aCwgb3B0aW9ucywgY2FsbGJhY2tdID0gYXJndW1lbnRzXG4gICAgICBzY29wZURlc2NyaXB0b3IgPSBvcHRpb25zLnNjb3BlXG4gICAgZWxzZVxuICAgICAgY29uc29sZS5lcnJvciAnQW4gdW5zdXBwb3J0ZWQgZm9ybSBvZiBDb25maWc6Om9ic2VydmUgaXMgYmVpbmcgdXNlZC4gU2VlIGh0dHBzOi8vYXRvbS5pby9kb2NzL2FwaS9sYXRlc3QvQ29uZmlnIGZvciBkZXRhaWxzJ1xuICAgICAgcmV0dXJuXG5cbiAgICBpZiBzY29wZURlc2NyaXB0b3I/XG4gICAgICBAb2JzZXJ2ZVNjb3BlZEtleVBhdGgoc2NvcGVEZXNjcmlwdG9yLCBrZXlQYXRoLCBjYWxsYmFjaylcbiAgICBlbHNlXG4gICAgICBAb2JzZXJ2ZUtleVBhdGgoa2V5UGF0aCwgb3B0aW9ucyA/IHt9LCBjYWxsYmFjaylcblxuICAjIEVzc2VudGlhbDogQWRkIGEgbGlzdGVuZXIgZm9yIGNoYW5nZXMgdG8gYSBnaXZlbiBrZXkgcGF0aC4gSWYgYGtleVBhdGhgIGlzXG4gICMgbm90IHNwZWNpZmllZCwgeW91ciBjYWxsYmFjayB3aWxsIGJlIGNhbGxlZCBvbiBjaGFuZ2VzIHRvIGFueSBrZXkuXG4gICNcbiAgIyAqIGBrZXlQYXRoYCAob3B0aW9uYWwpIHtTdHJpbmd9IG5hbWUgb2YgdGhlIGtleSB0byBvYnNlcnZlLiBNdXN0IGJlXG4gICMgICBzcGVjaWZpZWQgaWYgYHNjb3BlRGVzY3JpcHRvcmAgaXMgc3BlY2lmaWVkLlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkge09iamVjdH1cbiAgIyAgICogYHNjb3BlYCAob3B0aW9uYWwpIHtTY29wZURlc2NyaXB0b3J9IGRlc2NyaWJpbmcgYSBwYXRoIGZyb21cbiAgIyAgICAgdGhlIHJvb3Qgb2YgdGhlIHN5bnRheCB0cmVlIHRvIGEgdG9rZW4uIEdldCBvbmUgYnkgY2FsbGluZ1xuICAjICAgICB7ZWRpdG9yLmdldExhc3RDdXJzb3IoKS5nZXRTY29wZURlc2NyaXB0b3IoKX0uIFNlZSB7OjpnZXR9IGZvciBleGFtcGxlcy5cbiAgIyAgICAgU2VlIFt0aGUgc2NvcGVzIGRvY3NdKGh0dHA6Ly9mbGlnaHQtbWFudWFsLmF0b20uaW8vYmVoaW5kLWF0b20vc2VjdGlvbnMvc2NvcGVkLXNldHRpbmdzLXNjb3Blcy1hbmQtc2NvcGUtZGVzY3JpcHRvcnMvKVxuICAjICAgICBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBjYWxsIHdoZW4gdGhlIHZhbHVlIG9mIHRoZSBrZXkgY2hhbmdlcy5cbiAgIyAgICogYGV2ZW50YCB7T2JqZWN0fVxuICAjICAgICAqIGBuZXdWYWx1ZWAgdGhlIG5ldyB2YWx1ZSBvZiB0aGUga2V5XG4gICMgICAgICogYG9sZFZhbHVlYCB0aGUgcHJpb3IgdmFsdWUgb2YgdGhlIGtleS5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXMgb24gd2hpY2ggeW91IGNhbiBjYWxsXG4gICMgYC5kaXNwb3NlKClgIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZTogLT5cbiAgICBpZiBhcmd1bWVudHMubGVuZ3RoIGlzIDFcbiAgICAgIFtjYWxsYmFja10gPSBhcmd1bWVudHNcbiAgICBlbHNlIGlmIGFyZ3VtZW50cy5sZW5ndGggaXMgMlxuICAgICAgW2tleVBhdGgsIGNhbGxiYWNrXSA9IGFyZ3VtZW50c1xuICAgIGVsc2VcbiAgICAgIFtrZXlQYXRoLCBvcHRpb25zLCBjYWxsYmFja10gPSBhcmd1bWVudHNcbiAgICAgIHNjb3BlRGVzY3JpcHRvciA9IG9wdGlvbnMuc2NvcGVcblxuICAgIGlmIHNjb3BlRGVzY3JpcHRvcj9cbiAgICAgIEBvbkRpZENoYW5nZVNjb3BlZEtleVBhdGgoc2NvcGVEZXNjcmlwdG9yLCBrZXlQYXRoLCBjYWxsYmFjaylcbiAgICBlbHNlXG4gICAgICBAb25EaWRDaGFuZ2VLZXlQYXRoKGtleVBhdGgsIGNhbGxiYWNrKVxuXG4gICMjI1xuICBTZWN0aW9uOiBNYW5hZ2luZyBTZXR0aW5nc1xuICAjIyNcblxuICAjIEVzc2VudGlhbDogUmV0cmlldmVzIHRoZSBzZXR0aW5nIGZvciB0aGUgZ2l2ZW4ga2V5LlxuICAjXG4gICMgIyMjIEV4YW1wbGVzXG4gICNcbiAgIyBZb3UgbWlnaHQgd2FudCB0byBrbm93IHdoYXQgdGhlbWVzIGFyZSBlbmFibGVkLCBzbyBjaGVjayBgY29yZS50aGVtZXNgXG4gICNcbiAgIyBgYGBjb2ZmZWVcbiAgIyBhdG9tLmNvbmZpZy5nZXQoJ2NvcmUudGhlbWVzJylcbiAgIyBgYGBcbiAgI1xuICAjIFdpdGggc2NvcGUgZGVzY3JpcHRvcnMgeW91IGNhbiBnZXQgc2V0dGluZ3Mgd2l0aGluIGEgc3BlY2lmaWMgZWRpdG9yXG4gICMgc2NvcGUuIEZvciBleGFtcGxlLCB5b3UgbWlnaHQgd2FudCB0byBrbm93IGBlZGl0b3IudGFiTGVuZ3RoYCBmb3IgcnVieVxuICAjIGZpbGVzLlxuICAjXG4gICMgYGBgY29mZmVlXG4gICMgYXRvbS5jb25maWcuZ2V0KCdlZGl0b3IudGFiTGVuZ3RoJywgc2NvcGU6IFsnc291cmNlLnJ1YnknXSkgIyA9PiAyXG4gICMgYGBgXG4gICNcbiAgIyBUaGlzIHNldHRpbmcgaW4gcnVieSBmaWxlcyBtaWdodCBiZSBkaWZmZXJlbnQgdGhhbiB0aGUgZ2xvYmFsIHRhYkxlbmd0aCBzZXR0aW5nXG4gICNcbiAgIyBgYGBjb2ZmZWVcbiAgIyBhdG9tLmNvbmZpZy5nZXQoJ2VkaXRvci50YWJMZW5ndGgnKSAjID0+IDRcbiAgIyBhdG9tLmNvbmZpZy5nZXQoJ2VkaXRvci50YWJMZW5ndGgnLCBzY29wZTogWydzb3VyY2UucnVieSddKSAjID0+IDJcbiAgIyBgYGBcbiAgI1xuICAjIFlvdSBjYW4gZ2V0IHRoZSBsYW5ndWFnZSBzY29wZSBkZXNjcmlwdG9yIHZpYVxuICAjIHtUZXh0RWRpdG9yOjpnZXRSb290U2NvcGVEZXNjcmlwdG9yfS4gVGhpcyB3aWxsIGdldCB0aGUgc2V0dGluZyBzcGVjaWZpY2FsbHlcbiAgIyBmb3IgdGhlIGVkaXRvcidzIGxhbmd1YWdlLlxuICAjXG4gICMgYGBgY29mZmVlXG4gICMgYXRvbS5jb25maWcuZ2V0KCdlZGl0b3IudGFiTGVuZ3RoJywgc2NvcGU6IEBlZGl0b3IuZ2V0Um9vdFNjb3BlRGVzY3JpcHRvcigpKSAjID0+IDJcbiAgIyBgYGBcbiAgI1xuICAjIEFkZGl0aW9uYWxseSwgeW91IGNhbiBnZXQgdGhlIHNldHRpbmcgYXQgdGhlIHNwZWNpZmljIGN1cnNvciBwb3NpdGlvbi5cbiAgI1xuICAjIGBgYGNvZmZlZVxuICAjIHNjb3BlRGVzY3JpcHRvciA9IEBlZGl0b3IuZ2V0TGFzdEN1cnNvcigpLmdldFNjb3BlRGVzY3JpcHRvcigpXG4gICMgYXRvbS5jb25maWcuZ2V0KCdlZGl0b3IudGFiTGVuZ3RoJywgc2NvcGU6IHNjb3BlRGVzY3JpcHRvcikgIyA9PiAyXG4gICMgYGBgXG4gICNcbiAgIyAqIGBrZXlQYXRoYCBUaGUge1N0cmluZ30gbmFtZSBvZiB0aGUga2V5IHRvIHJldHJpZXZlLlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkge09iamVjdH1cbiAgIyAgICogYHNvdXJjZXNgIChvcHRpb25hbCkge0FycmF5fSBvZiB7U3RyaW5nfSBzb3VyY2UgbmFtZXMuIElmIHByb3ZpZGVkLCBvbmx5XG4gICMgICAgIHZhbHVlcyB0aGF0IHdlcmUgYXNzb2NpYXRlZCB3aXRoIHRoZXNlIHNvdXJjZXMgZHVyaW5nIHs6OnNldH0gd2lsbCBiZSB1c2VkLlxuICAjICAgKiBgZXhjbHVkZVNvdXJjZXNgIChvcHRpb25hbCkge0FycmF5fSBvZiB7U3RyaW5nfSBzb3VyY2UgbmFtZXMuIElmIHByb3ZpZGVkLFxuICAjICAgICB2YWx1ZXMgdGhhdCAgd2VyZSBhc3NvY2lhdGVkIHdpdGggdGhlc2Ugc291cmNlcyBkdXJpbmcgezo6c2V0fSB3aWxsIG5vdFxuICAjICAgICBiZSB1c2VkLlxuICAjICAgKiBgc2NvcGVgIChvcHRpb25hbCkge1Njb3BlRGVzY3JpcHRvcn0gZGVzY3JpYmluZyBhIHBhdGggZnJvbVxuICAjICAgICB0aGUgcm9vdCBvZiB0aGUgc3ludGF4IHRyZWUgdG8gYSB0b2tlbi4gR2V0IG9uZSBieSBjYWxsaW5nXG4gICMgICAgIHtlZGl0b3IuZ2V0TGFzdEN1cnNvcigpLmdldFNjb3BlRGVzY3JpcHRvcigpfVxuICAjICAgICBTZWUgW3RoZSBzY29wZXMgZG9jc10oaHR0cDovL2ZsaWdodC1tYW51YWwuYXRvbS5pby9iZWhpbmQtYXRvbS9zZWN0aW9ucy9zY29wZWQtc2V0dGluZ3Mtc2NvcGVzLWFuZC1zY29wZS1kZXNjcmlwdG9ycy8pXG4gICMgICAgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAjXG4gICMgUmV0dXJucyB0aGUgdmFsdWUgZnJvbSBBdG9tJ3MgZGVmYXVsdCBzZXR0aW5ncywgdGhlIHVzZXIncyBjb25maWd1cmF0aW9uXG4gICMgZmlsZSBpbiB0aGUgdHlwZSBzcGVjaWZpZWQgYnkgdGhlIGNvbmZpZ3VyYXRpb24gc2NoZW1hLlxuICBnZXQ6IC0+XG4gICAgaWYgYXJndW1lbnRzLmxlbmd0aCA+IDFcbiAgICAgIGlmIHR5cGVvZiBhcmd1bWVudHNbMF0gaXMgJ3N0cmluZycgb3Igbm90IGFyZ3VtZW50c1swXT9cbiAgICAgICAgW2tleVBhdGgsIG9wdGlvbnNdID0gYXJndW1lbnRzXG4gICAgICAgIHtzY29wZX0gPSBvcHRpb25zXG4gICAgZWxzZVxuICAgICAgW2tleVBhdGhdID0gYXJndW1lbnRzXG5cbiAgICBpZiBzY29wZT9cbiAgICAgIHZhbHVlID0gQGdldFJhd1Njb3BlZFZhbHVlKHNjb3BlLCBrZXlQYXRoLCBvcHRpb25zKVxuICAgICAgdmFsdWUgPyBAZ2V0UmF3VmFsdWUoa2V5UGF0aCwgb3B0aW9ucylcbiAgICBlbHNlXG4gICAgICBAZ2V0UmF3VmFsdWUoa2V5UGF0aCwgb3B0aW9ucylcblxuICAjIEV4dGVuZGVkOiBHZXQgYWxsIG9mIHRoZSB2YWx1ZXMgZm9yIHRoZSBnaXZlbiBrZXktcGF0aCwgYWxvbmcgd2l0aCB0aGVpclxuICAjIGFzc29jaWF0ZWQgc2NvcGUgc2VsZWN0b3IuXG4gICNcbiAgIyAqIGBrZXlQYXRoYCBUaGUge1N0cmluZ30gbmFtZSBvZiB0aGUga2V5IHRvIHJldHJpZXZlXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSBzZWUgdGhlIGBvcHRpb25zYCBhcmd1bWVudCB0byB7OjpnZXR9XG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge09iamVjdH1zIHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAqIGBzY29wZURlc2NyaXB0b3JgIFRoZSB7U2NvcGVEZXNjcmlwdG9yfSB3aXRoIHdoaWNoIHRoZSB2YWx1ZSBpcyBhc3NvY2lhdGVkXG4gICMgICogYHZhbHVlYCBUaGUgdmFsdWUgZm9yIHRoZSBrZXktcGF0aFxuICBnZXRBbGw6IChrZXlQYXRoLCBvcHRpb25zKSAtPlxuICAgIHtzY29wZX0gPSBvcHRpb25zIGlmIG9wdGlvbnM/XG4gICAgcmVzdWx0ID0gW11cblxuICAgIGlmIHNjb3BlP1xuICAgICAgc2NvcGVEZXNjcmlwdG9yID0gU2NvcGVEZXNjcmlwdG9yLmZyb21PYmplY3Qoc2NvcGUpXG4gICAgICByZXN1bHQgPSByZXN1bHQuY29uY2F0IEBzY29wZWRTZXR0aW5nc1N0b3JlLmdldEFsbChzY29wZURlc2NyaXB0b3IuZ2V0U2NvcGVDaGFpbigpLCBrZXlQYXRoLCBvcHRpb25zKVxuXG4gICAgaWYgZ2xvYmFsVmFsdWUgPSBAZ2V0UmF3VmFsdWUoa2V5UGF0aCwgb3B0aW9ucylcbiAgICAgIHJlc3VsdC5wdXNoKHNjb3BlU2VsZWN0b3I6ICcqJywgdmFsdWU6IGdsb2JhbFZhbHVlKVxuXG4gICAgcmVzdWx0XG5cbiAgIyBFc3NlbnRpYWw6IFNldHMgdGhlIHZhbHVlIGZvciBhIGNvbmZpZ3VyYXRpb24gc2V0dGluZy5cbiAgI1xuICAjIFRoaXMgdmFsdWUgaXMgc3RvcmVkIGluIEF0b20ncyBpbnRlcm5hbCBjb25maWd1cmF0aW9uIGZpbGUuXG4gICNcbiAgIyAjIyMgRXhhbXBsZXNcbiAgI1xuICAjIFlvdSBtaWdodCB3YW50IHRvIGNoYW5nZSB0aGUgdGhlbWVzIHByb2dyYW1tYXRpY2FsbHk6XG4gICNcbiAgIyBgYGBjb2ZmZWVcbiAgIyBhdG9tLmNvbmZpZy5zZXQoJ2NvcmUudGhlbWVzJywgWydhdG9tLWxpZ2h0LXVpJywgJ2F0b20tbGlnaHQtc3ludGF4J10pXG4gICMgYGBgXG4gICNcbiAgIyBZb3UgY2FuIGFsc28gc2V0IHNjb3BlZCBzZXR0aW5ncy4gRm9yIGV4YW1wbGUsIHlvdSBtaWdodCB3YW50IGNoYW5nZSB0aGVcbiAgIyBgZWRpdG9yLnRhYkxlbmd0aGAgb25seSBmb3IgcnVieSBmaWxlcy5cbiAgI1xuICAjIGBgYGNvZmZlZVxuICAjIGF0b20uY29uZmlnLmdldCgnZWRpdG9yLnRhYkxlbmd0aCcpICMgPT4gNFxuICAjIGF0b20uY29uZmlnLmdldCgnZWRpdG9yLnRhYkxlbmd0aCcsIHNjb3BlOiBbJ3NvdXJjZS5ydWJ5J10pICMgPT4gNFxuICAjIGF0b20uY29uZmlnLmdldCgnZWRpdG9yLnRhYkxlbmd0aCcsIHNjb3BlOiBbJ3NvdXJjZS5qcyddKSAjID0+IDRcbiAgI1xuICAjICMgU2V0IHJ1YnkgdG8gMlxuICAjIGF0b20uY29uZmlnLnNldCgnZWRpdG9yLnRhYkxlbmd0aCcsIDIsIHNjb3BlU2VsZWN0b3I6ICcuc291cmNlLnJ1YnknKSAjID0+IHRydWVcbiAgI1xuICAjICMgTm90aWNlIGl0J3Mgb25seSBzZXQgdG8gMiBpbiB0aGUgY2FzZSBvZiBydWJ5XG4gICMgYXRvbS5jb25maWcuZ2V0KCdlZGl0b3IudGFiTGVuZ3RoJykgIyA9PiA0XG4gICMgYXRvbS5jb25maWcuZ2V0KCdlZGl0b3IudGFiTGVuZ3RoJywgc2NvcGU6IFsnc291cmNlLnJ1YnknXSkgIyA9PiAyXG4gICMgYXRvbS5jb25maWcuZ2V0KCdlZGl0b3IudGFiTGVuZ3RoJywgc2NvcGU6IFsnc291cmNlLmpzJ10pICMgPT4gNFxuICAjIGBgYFxuICAjXG4gICMgKiBga2V5UGF0aGAgVGhlIHtTdHJpbmd9IG5hbWUgb2YgdGhlIGtleS5cbiAgIyAqIGB2YWx1ZWAgVGhlIHZhbHVlIG9mIHRoZSBzZXR0aW5nLiBQYXNzaW5nIGB1bmRlZmluZWRgIHdpbGwgcmV2ZXJ0IHRoZVxuICAjICAgc2V0dGluZyB0byB0aGUgZGVmYXVsdCB2YWx1ZS5cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9XG4gICMgICAqIGBzY29wZVNlbGVjdG9yYCAob3B0aW9uYWwpIHtTdHJpbmd9LiBlZy4gJy5zb3VyY2UucnVieSdcbiAgIyAgICAgU2VlIFt0aGUgc2NvcGVzIGRvY3NdKGh0dHA6Ly9mbGlnaHQtbWFudWFsLmF0b20uaW8vYmVoaW5kLWF0b20vc2VjdGlvbnMvc2NvcGVkLXNldHRpbmdzLXNjb3Blcy1hbmQtc2NvcGUtZGVzY3JpcHRvcnMvKVxuICAjICAgICBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgIyAgICogYHNvdXJjZWAgKG9wdGlvbmFsKSB7U3RyaW5nfSBUaGUgbmFtZSBvZiBhIGZpbGUgd2l0aCB3aGljaCB0aGUgc2V0dGluZ1xuICAjICAgICBpcyBhc3NvY2lhdGVkLiBEZWZhdWx0cyB0byB0aGUgdXNlcidzIGNvbmZpZyBmaWxlLlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufVxuICAjICogYHRydWVgIGlmIHRoZSB2YWx1ZSB3YXMgc2V0LlxuICAjICogYGZhbHNlYCBpZiB0aGUgdmFsdWUgd2FzIG5vdCBhYmxlIHRvIGJlIGNvZXJjZWQgdG8gdGhlIHR5cGUgc3BlY2lmaWVkIGluIHRoZSBzZXR0aW5nJ3Mgc2NoZW1hLlxuICBzZXQ6IC0+XG4gICAgW2tleVBhdGgsIHZhbHVlLCBvcHRpb25zXSA9IGFyZ3VtZW50c1xuICAgIHNjb3BlU2VsZWN0b3IgPSBvcHRpb25zPy5zY29wZVNlbGVjdG9yXG4gICAgc291cmNlID0gb3B0aW9ucz8uc291cmNlXG4gICAgc2hvdWxkU2F2ZSA9IG9wdGlvbnM/LnNhdmUgPyB0cnVlXG5cbiAgICBpZiBzb3VyY2UgYW5kIG5vdCBzY29wZVNlbGVjdG9yXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCI6OnNldCB3aXRoIGEgJ3NvdXJjZScgYW5kIG5vICdzb3VyY2VTZWxlY3RvcicgaXMgbm90IHlldCBpbXBsZW1lbnRlZCFcIilcblxuICAgIHNvdXJjZSA/PSBAZ2V0VXNlckNvbmZpZ1BhdGgoKVxuXG4gICAgdW5sZXNzIHZhbHVlIGlzIHVuZGVmaW5lZFxuICAgICAgdHJ5XG4gICAgICAgIHZhbHVlID0gQG1ha2VWYWx1ZUNvbmZvcm1Ub1NjaGVtYShrZXlQYXRoLCB2YWx1ZSlcbiAgICAgIGNhdGNoIGVcbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBpZiBzY29wZVNlbGVjdG9yP1xuICAgICAgQHNldFJhd1Njb3BlZFZhbHVlKGtleVBhdGgsIHZhbHVlLCBzb3VyY2UsIHNjb3BlU2VsZWN0b3IpXG4gICAgZWxzZVxuICAgICAgQHNldFJhd1ZhbHVlKGtleVBhdGgsIHZhbHVlKVxuXG4gICAgQHJlcXVlc3RTYXZlKCkgaWYgc291cmNlIGlzIEBnZXRVc2VyQ29uZmlnUGF0aCgpIGFuZCBzaG91bGRTYXZlIGFuZCBub3QgQGNvbmZpZ0ZpbGVIYXNFcnJvcnNcbiAgICB0cnVlXG5cbiAgIyBFc3NlbnRpYWw6IFJlc3RvcmUgdGhlIHNldHRpbmcgYXQgYGtleVBhdGhgIHRvIGl0cyBkZWZhdWx0IHZhbHVlLlxuICAjXG4gICMgKiBga2V5UGF0aGAgVGhlIHtTdHJpbmd9IG5hbWUgb2YgdGhlIGtleS5cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9XG4gICMgICAqIGBzY29wZVNlbGVjdG9yYCAob3B0aW9uYWwpIHtTdHJpbmd9LiBTZWUgezo6c2V0fVxuICAjICAgKiBgc291cmNlYCAob3B0aW9uYWwpIHtTdHJpbmd9LiBTZWUgezo6c2V0fVxuICB1bnNldDogKGtleVBhdGgsIG9wdGlvbnMpIC0+XG4gICAge3Njb3BlU2VsZWN0b3IsIHNvdXJjZX0gPSBvcHRpb25zID8ge31cbiAgICBzb3VyY2UgPz0gQGdldFVzZXJDb25maWdQYXRoKClcblxuICAgIGlmIHNjb3BlU2VsZWN0b3I/XG4gICAgICBpZiBrZXlQYXRoP1xuICAgICAgICBzZXR0aW5ncyA9IEBzY29wZWRTZXR0aW5nc1N0b3JlLnByb3BlcnRpZXNGb3JTb3VyY2VBbmRTZWxlY3Rvcihzb3VyY2UsIHNjb3BlU2VsZWN0b3IpXG4gICAgICAgIGlmIGdldFZhbHVlQXRLZXlQYXRoKHNldHRpbmdzLCBrZXlQYXRoKT9cbiAgICAgICAgICBAc2NvcGVkU2V0dGluZ3NTdG9yZS5yZW1vdmVQcm9wZXJ0aWVzRm9yU291cmNlQW5kU2VsZWN0b3Ioc291cmNlLCBzY29wZVNlbGVjdG9yKVxuICAgICAgICAgIHNldFZhbHVlQXRLZXlQYXRoKHNldHRpbmdzLCBrZXlQYXRoLCB1bmRlZmluZWQpXG4gICAgICAgICAgc2V0dGluZ3MgPSB3aXRob3V0RW1wdHlPYmplY3RzKHNldHRpbmdzKVxuICAgICAgICAgIEBzZXQobnVsbCwgc2V0dGluZ3MsIHtzY29wZVNlbGVjdG9yLCBzb3VyY2UsIHByaW9yaXR5OiBAcHJpb3JpdHlGb3JTb3VyY2Uoc291cmNlKX0pIGlmIHNldHRpbmdzP1xuICAgICAgICAgIEByZXF1ZXN0U2F2ZSgpXG4gICAgICBlbHNlXG4gICAgICAgIEBzY29wZWRTZXR0aW5nc1N0b3JlLnJlbW92ZVByb3BlcnRpZXNGb3JTb3VyY2VBbmRTZWxlY3Rvcihzb3VyY2UsIHNjb3BlU2VsZWN0b3IpXG4gICAgICAgIEBlbWl0Q2hhbmdlRXZlbnQoKVxuICAgIGVsc2VcbiAgICAgIGZvciBzY29wZVNlbGVjdG9yIG9mIEBzY29wZWRTZXR0aW5nc1N0b3JlLnByb3BlcnRpZXNGb3JTb3VyY2Uoc291cmNlKVxuICAgICAgICBAdW5zZXQoa2V5UGF0aCwge3Njb3BlU2VsZWN0b3IsIHNvdXJjZX0pXG4gICAgICBpZiBrZXlQYXRoPyBhbmQgc291cmNlIGlzIEBnZXRVc2VyQ29uZmlnUGF0aCgpXG4gICAgICAgIEBzZXQoa2V5UGF0aCwgZ2V0VmFsdWVBdEtleVBhdGgoQGRlZmF1bHRTZXR0aW5ncywga2V5UGF0aCkpXG5cbiAgIyBFeHRlbmRlZDogR2V0IGFuIHtBcnJheX0gb2YgYWxsIG9mIHRoZSBgc291cmNlYCB7U3RyaW5nfXMgd2l0aCB3aGljaFxuICAjIHNldHRpbmdzIGhhdmUgYmVlbiBhZGRlZCB2aWEgezo6c2V0fS5cbiAgZ2V0U291cmNlczogLT5cbiAgICBfLnVuaXEoXy5wbHVjayhAc2NvcGVkU2V0dGluZ3NTdG9yZS5wcm9wZXJ0eVNldHMsICdzb3VyY2UnKSkuc29ydCgpXG5cbiAgIyBFeHRlbmRlZDogUmV0cmlldmUgdGhlIHNjaGVtYSBmb3IgYSBzcGVjaWZpYyBrZXkgcGF0aC4gVGhlIHNjaGVtYSB3aWxsIHRlbGxcbiAgIyB5b3Ugd2hhdCB0eXBlIHRoZSBrZXlQYXRoIGV4cGVjdHMsIGFuZCBvdGhlciBtZXRhZGF0YSBhYm91dCB0aGUgY29uZmlnXG4gICMgb3B0aW9uLlxuICAjXG4gICMgKiBga2V5UGF0aGAgVGhlIHtTdHJpbmd9IG5hbWUgb2YgdGhlIGtleS5cbiAgI1xuICAjIFJldHVybnMgYW4ge09iamVjdH0gZWcuIGB7dHlwZTogJ2ludGVnZXInLCBkZWZhdWx0OiAyMywgbWluaW11bTogMX1gLlxuICAjIFJldHVybnMgYG51bGxgIHdoZW4gdGhlIGtleVBhdGggaGFzIG5vIHNjaGVtYSBzcGVjaWZpZWQsIGJ1dCBpcyBhY2Nlc3NpYmxlXG4gICMgZnJvbSB0aGUgcm9vdCBzY2hlbWEuXG4gIGdldFNjaGVtYTogKGtleVBhdGgpIC0+XG4gICAga2V5cyA9IHNwbGl0S2V5UGF0aChrZXlQYXRoKVxuICAgIHNjaGVtYSA9IEBzY2hlbWFcbiAgICBmb3Iga2V5IGluIGtleXNcbiAgICAgIGlmIHNjaGVtYS50eXBlIGlzICdvYmplY3QnXG4gICAgICAgIGNoaWxkU2NoZW1hID0gc2NoZW1hLnByb3BlcnRpZXM/W2tleV1cbiAgICAgICAgdW5sZXNzIGNoaWxkU2NoZW1hP1xuICAgICAgICAgIGlmIGlzUGxhaW5PYmplY3Qoc2NoZW1hLmFkZGl0aW9uYWxQcm9wZXJ0aWVzKVxuICAgICAgICAgICAgY2hpbGRTY2hlbWEgPSBzY2hlbWEuYWRkaXRpb25hbFByb3BlcnRpZXNcbiAgICAgICAgICBlbHNlIGlmIHNjaGVtYS5hZGRpdGlvbmFsUHJvcGVydGllcyBpcyBmYWxzZVxuICAgICAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4ge3R5cGU6ICdhbnknfVxuICAgICAgZWxzZVxuICAgICAgICByZXR1cm4gbnVsbFxuICAgICAgc2NoZW1hID0gY2hpbGRTY2hlbWFcbiAgICBzY2hlbWFcblxuICAjIEV4dGVuZGVkOiBHZXQgdGhlIHtTdHJpbmd9IHBhdGggdG8gdGhlIGNvbmZpZyBmaWxlIGJlaW5nIHVzZWQuXG4gIGdldFVzZXJDb25maWdQYXRoOiAtPlxuICAgIEBjb25maWdGaWxlUGF0aFxuXG4gICMgRXh0ZW5kZWQ6IFN1cHByZXNzIGNhbGxzIHRvIGhhbmRsZXIgZnVuY3Rpb25zIHJlZ2lzdGVyZWQgd2l0aCB7OjpvbkRpZENoYW5nZX1cbiAgIyBhbmQgezo6b2JzZXJ2ZX0gZm9yIHRoZSBkdXJhdGlvbiBvZiBgY2FsbGJhY2tgLiBBZnRlciBgY2FsbGJhY2tgIGV4ZWN1dGVzLFxuICAjIGhhbmRsZXJzIHdpbGwgYmUgY2FsbGVkIG9uY2UgaWYgdGhlIHZhbHVlIGZvciB0aGVpciBrZXktcGF0aCBoYXMgY2hhbmdlZC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGV4ZWN1dGUgd2hpbGUgc3VwcHJlc3NpbmcgY2FsbHMgdG8gaGFuZGxlcnMuXG4gIHRyYW5zYWN0OiAoY2FsbGJhY2spIC0+XG4gICAgQGJlZ2luVHJhbnNhY3Rpb24oKVxuICAgIHRyeVxuICAgICAgY2FsbGJhY2soKVxuICAgIGZpbmFsbHlcbiAgICAgIEBlbmRUcmFuc2FjdGlvbigpXG5cbiAgIyMjXG4gIFNlY3Rpb246IEludGVybmFsIG1ldGhvZHMgdXNlZCBieSBjb3JlXG4gICMjI1xuXG4gICMgUHJpdmF0ZTogU3VwcHJlc3MgY2FsbHMgdG8gaGFuZGxlciBmdW5jdGlvbnMgcmVnaXN0ZXJlZCB3aXRoIHs6Om9uRGlkQ2hhbmdlfVxuICAjIGFuZCB7OjpvYnNlcnZlfSBmb3IgdGhlIGR1cmF0aW9uIG9mIHRoZSB7UHJvbWlzZX0gcmV0dXJuZWQgYnkgYGNhbGxiYWNrYC5cbiAgIyBBZnRlciB0aGUge1Byb21pc2V9IGlzIGVpdGhlciByZXNvbHZlZCBvciByZWplY3RlZCwgaGFuZGxlcnMgd2lsbCBiZSBjYWxsZWRcbiAgIyBvbmNlIGlmIHRoZSB2YWx1ZSBmb3IgdGhlaXIga2V5LXBhdGggaGFzIGNoYW5nZWQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0aGF0IHJldHVybnMgYSB7UHJvbWlzZX0sIHdoaWNoIHdpbGwgYmUgZXhlY3V0ZWRcbiAgIyAgIHdoaWxlIHN1cHByZXNzaW5nIGNhbGxzIHRvIGhhbmRsZXJzLlxuICAjXG4gICMgUmV0dXJucyBhIHtQcm9taXNlfSB0aGF0IGlzIGVpdGhlciByZXNvbHZlZCBvciByZWplY3RlZCBhY2NvcmRpbmcgdG8gdGhlXG4gICMgYHtQcm9taXNlfWAgcmV0dXJuZWQgYnkgYGNhbGxiYWNrYC4gSWYgYGNhbGxiYWNrYCB0aHJvd3MgYW4gZXJyb3IsIGFcbiAgIyByZWplY3RlZCB7UHJvbWlzZX0gd2lsbCBiZSByZXR1cm5lZCBpbnN0ZWFkLlxuICB0cmFuc2FjdEFzeW5jOiAoY2FsbGJhY2spIC0+XG4gICAgQGJlZ2luVHJhbnNhY3Rpb24oKVxuICAgIHRyeVxuICAgICAgZW5kVHJhbnNhY3Rpb24gPSAoZm4pID0+IChhcmdzLi4uKSA9PlxuICAgICAgICBAZW5kVHJhbnNhY3Rpb24oKVxuICAgICAgICBmbihhcmdzLi4uKVxuICAgICAgcmVzdWx0ID0gY2FsbGJhY2soKVxuICAgICAgbmV3IFByb21pc2UgKHJlc29sdmUsIHJlamVjdCkgLT5cbiAgICAgICAgcmVzdWx0LnRoZW4oZW5kVHJhbnNhY3Rpb24ocmVzb2x2ZSkpLmNhdGNoKGVuZFRyYW5zYWN0aW9uKHJlamVjdCkpXG4gICAgY2F0Y2ggZXJyb3JcbiAgICAgIEBlbmRUcmFuc2FjdGlvbigpXG4gICAgICBQcm9taXNlLnJlamVjdChlcnJvcilcblxuICBiZWdpblRyYW5zYWN0aW9uOiAtPlxuICAgIEB0cmFuc2FjdERlcHRoKytcblxuICBlbmRUcmFuc2FjdGlvbjogLT5cbiAgICBAdHJhbnNhY3REZXB0aC0tXG4gICAgQGVtaXRDaGFuZ2VFdmVudCgpXG5cbiAgcHVzaEF0S2V5UGF0aDogKGtleVBhdGgsIHZhbHVlKSAtPlxuICAgIGFycmF5VmFsdWUgPSBAZ2V0KGtleVBhdGgpID8gW11cbiAgICByZXN1bHQgPSBhcnJheVZhbHVlLnB1c2godmFsdWUpXG4gICAgQHNldChrZXlQYXRoLCBhcnJheVZhbHVlKVxuICAgIHJlc3VsdFxuXG4gIHVuc2hpZnRBdEtleVBhdGg6IChrZXlQYXRoLCB2YWx1ZSkgLT5cbiAgICBhcnJheVZhbHVlID0gQGdldChrZXlQYXRoKSA/IFtdXG4gICAgcmVzdWx0ID0gYXJyYXlWYWx1ZS51bnNoaWZ0KHZhbHVlKVxuICAgIEBzZXQoa2V5UGF0aCwgYXJyYXlWYWx1ZSlcbiAgICByZXN1bHRcblxuICByZW1vdmVBdEtleVBhdGg6IChrZXlQYXRoLCB2YWx1ZSkgLT5cbiAgICBhcnJheVZhbHVlID0gQGdldChrZXlQYXRoKSA/IFtdXG4gICAgcmVzdWx0ID0gXy5yZW1vdmUoYXJyYXlWYWx1ZSwgdmFsdWUpXG4gICAgQHNldChrZXlQYXRoLCBhcnJheVZhbHVlKVxuICAgIHJlc3VsdFxuXG4gIHNldFNjaGVtYTogKGtleVBhdGgsIHNjaGVtYSkgLT5cbiAgICB1bmxlc3MgaXNQbGFpbk9iamVjdChzY2hlbWEpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciBsb2FkaW5nIHNjaGVtYSBmb3IgI3trZXlQYXRofTogc2NoZW1hcyBjYW4gb25seSBiZSBvYmplY3RzIVwiKVxuXG4gICAgdW5sZXNzIHR5cGVvZiBzY2hlbWEudHlwZT9cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yIGxvYWRpbmcgc2NoZW1hIGZvciAje2tleVBhdGh9OiBzY2hlbWEgb2JqZWN0cyBtdXN0IGhhdmUgYSB0eXBlIGF0dHJpYnV0ZVwiKVxuXG4gICAgcm9vdFNjaGVtYSA9IEBzY2hlbWFcbiAgICBpZiBrZXlQYXRoXG4gICAgICBmb3Iga2V5IGluIHNwbGl0S2V5UGF0aChrZXlQYXRoKVxuICAgICAgICByb290U2NoZW1hLnR5cGUgPSAnb2JqZWN0J1xuICAgICAgICByb290U2NoZW1hLnByb3BlcnRpZXMgPz0ge31cbiAgICAgICAgcHJvcGVydGllcyA9IHJvb3RTY2hlbWEucHJvcGVydGllc1xuICAgICAgICBwcm9wZXJ0aWVzW2tleV0gPz0ge31cbiAgICAgICAgcm9vdFNjaGVtYSA9IHByb3BlcnRpZXNba2V5XVxuXG4gICAgT2JqZWN0LmFzc2lnbiByb290U2NoZW1hLCBzY2hlbWFcbiAgICBAdHJhbnNhY3QgPT5cbiAgICAgIEBzZXREZWZhdWx0cyhrZXlQYXRoLCBAZXh0cmFjdERlZmF1bHRzRnJvbVNjaGVtYShzY2hlbWEpKVxuICAgICAgQHNldFNjb3BlZERlZmF1bHRzRnJvbVNjaGVtYShrZXlQYXRoLCBzY2hlbWEpXG4gICAgICBAcmVzZXRTZXR0aW5nc0ZvclNjaGVtYUNoYW5nZSgpXG5cbiAgbG9hZDogLT5cbiAgICBAaW5pdGlhbGl6ZUNvbmZpZ0RpcmVjdG9yeSgpXG4gICAgQGxvYWRVc2VyQ29uZmlnKClcbiAgICBAb2JzZXJ2ZVVzZXJDb25maWcoKVxuXG4gICMjI1xuICBTZWN0aW9uOiBQcml2YXRlIG1ldGhvZHMgbWFuYWdpbmcgdGhlIHVzZXIncyBjb25maWcgZmlsZVxuICAjIyNcblxuICBpbml0aWFsaXplQ29uZmlnRGlyZWN0b3J5OiAoZG9uZSkgLT5cbiAgICByZXR1cm4gaWYgZnMuZXhpc3RzU3luYyhAY29uZmlnRGlyUGF0aCkgb3IgQHNob3VsZE5vdEFjY2Vzc0ZpbGVTeXN0ZW0oKVxuXG4gICAgZnMubWFrZVRyZWVTeW5jKEBjb25maWdEaXJQYXRoKVxuXG4gICAgcXVldWUgPSBhc3luYy5xdWV1ZSAoe3NvdXJjZVBhdGgsIGRlc3RpbmF0aW9uUGF0aH0sIGNhbGxiYWNrKSAtPlxuICAgICAgZnMuY29weShzb3VyY2VQYXRoLCBkZXN0aW5hdGlvblBhdGgsIGNhbGxiYWNrKVxuICAgIHF1ZXVlLmRyYWluID0gZG9uZVxuXG4gICAgdGVtcGxhdGVDb25maWdEaXJQYXRoID0gZnMucmVzb2x2ZShAcmVzb3VyY2VQYXRoLCAnZG90LWF0b20nKVxuICAgIG9uQ29uZmlnRGlyRmlsZSA9IChzb3VyY2VQYXRoKSA9PlxuICAgICAgcmVsYXRpdmVQYXRoID0gc291cmNlUGF0aC5zdWJzdHJpbmcodGVtcGxhdGVDb25maWdEaXJQYXRoLmxlbmd0aCArIDEpXG4gICAgICBkZXN0aW5hdGlvblBhdGggPSBwYXRoLmpvaW4oQGNvbmZpZ0RpclBhdGgsIHJlbGF0aXZlUGF0aClcbiAgICAgIHF1ZXVlLnB1c2goe3NvdXJjZVBhdGgsIGRlc3RpbmF0aW9uUGF0aH0pXG4gICAgZnMudHJhdmVyc2VUcmVlKHRlbXBsYXRlQ29uZmlnRGlyUGF0aCwgb25Db25maWdEaXJGaWxlLCAoKHBhdGgpIC0+IHRydWUpLCAoLT4pKVxuXG4gIGxvYWRVc2VyQ29uZmlnOiAtPlxuICAgIHJldHVybiBpZiBAc2hvdWxkTm90QWNjZXNzRmlsZVN5c3RlbSgpXG5cbiAgICB0cnlcbiAgICAgIHVubGVzcyBmcy5leGlzdHNTeW5jKEBjb25maWdGaWxlUGF0aClcbiAgICAgICAgZnMubWFrZVRyZWVTeW5jKHBhdGguZGlybmFtZShAY29uZmlnRmlsZVBhdGgpKVxuICAgICAgICBDU09OLndyaXRlRmlsZVN5bmMoQGNvbmZpZ0ZpbGVQYXRoLCB7fSlcbiAgICBjYXRjaCBlcnJvclxuICAgICAgQGNvbmZpZ0ZpbGVIYXNFcnJvcnMgPSB0cnVlXG4gICAgICBAbm90aWZ5RmFpbHVyZShcIkZhaWxlZCB0byBpbml0aWFsaXplIGAje3BhdGguYmFzZW5hbWUoQGNvbmZpZ0ZpbGVQYXRoKX1gXCIsIGVycm9yLnN0YWNrKVxuICAgICAgcmV0dXJuXG5cbiAgICB0cnlcbiAgICAgIHVubGVzcyBAc2F2ZVBlbmRpbmdcbiAgICAgICAgdXNlckNvbmZpZyA9IENTT04ucmVhZEZpbGVTeW5jKEBjb25maWdGaWxlUGF0aClcbiAgICAgICAgQHJlc2V0VXNlclNldHRpbmdzKHVzZXJDb25maWcpXG4gICAgICAgIEBjb25maWdGaWxlSGFzRXJyb3JzID0gZmFsc2VcbiAgICBjYXRjaCBlcnJvclxuICAgICAgQGNvbmZpZ0ZpbGVIYXNFcnJvcnMgPSB0cnVlXG4gICAgICBtZXNzYWdlID0gXCJGYWlsZWQgdG8gbG9hZCBgI3twYXRoLmJhc2VuYW1lKEBjb25maWdGaWxlUGF0aCl9YFwiXG5cbiAgICAgIGRldGFpbCA9IGlmIGVycm9yLmxvY2F0aW9uP1xuICAgICAgICAjIHN0YWNrIGlzIHRoZSBvdXRwdXQgZnJvbSBDU09OIGluIHRoaXMgY2FzZVxuICAgICAgICBlcnJvci5zdGFja1xuICAgICAgZWxzZVxuICAgICAgICAjIG1lc3NhZ2Ugd2lsbCBiZSBFQUNDRVMgcGVybWlzc2lvbiBkZW5pZWQsIGV0IGFsXG4gICAgICAgIGVycm9yLm1lc3NhZ2VcblxuICAgICAgQG5vdGlmeUZhaWx1cmUobWVzc2FnZSwgZGV0YWlsKVxuXG4gIG9ic2VydmVVc2VyQ29uZmlnOiAtPlxuICAgIHJldHVybiBpZiBAc2hvdWxkTm90QWNjZXNzRmlsZVN5c3RlbSgpXG5cbiAgICB0cnlcbiAgICAgIEB3YXRjaFN1YnNjcmlwdGlvbiA/PSBwYXRoV2F0Y2hlci53YXRjaCBAY29uZmlnRmlsZVBhdGgsIChldmVudFR5cGUpID0+XG4gICAgICAgIEByZXF1ZXN0TG9hZCgpIGlmIGV2ZW50VHlwZSBpcyAnY2hhbmdlJyBhbmQgQHdhdGNoU3Vic2NyaXB0aW9uP1xuICAgIGNhdGNoIGVycm9yXG4gICAgICBAbm90aWZ5RmFpbHVyZSBcIlwiXCJcbiAgICAgICAgVW5hYmxlIHRvIHdhdGNoIHBhdGg6IGAje3BhdGguYmFzZW5hbWUoQGNvbmZpZ0ZpbGVQYXRoKX1gLiBNYWtlIHN1cmUgeW91IGhhdmUgcGVybWlzc2lvbnMgdG9cbiAgICAgICAgYCN7QGNvbmZpZ0ZpbGVQYXRofWAuIE9uIGxpbnV4IHRoZXJlIGFyZSBjdXJyZW50bHkgcHJvYmxlbXMgd2l0aCB3YXRjaFxuICAgICAgICBzaXplcy4gU2VlIFt0aGlzIGRvY3VtZW50XVt3YXRjaGVzXSBmb3IgbW9yZSBpbmZvLlxuICAgICAgICBbd2F0Y2hlc106aHR0cHM6Ly9naXRodWIuY29tL2F0b20vYXRvbS9ibG9iL21hc3Rlci9kb2NzL2J1aWxkLWluc3RydWN0aW9ucy9saW51eC5tZCN0eXBlZXJyb3ItdW5hYmxlLXRvLXdhdGNoLXBhdGhcbiAgICAgIFwiXCJcIlxuXG4gIHVub2JzZXJ2ZVVzZXJDb25maWc6IC0+XG4gICAgQHdhdGNoU3Vic2NyaXB0aW9uPy5jbG9zZSgpXG4gICAgQHdhdGNoU3Vic2NyaXB0aW9uID0gbnVsbFxuXG4gIG5vdGlmeUZhaWx1cmU6IChlcnJvck1lc3NhZ2UsIGRldGFpbCkgLT5cbiAgICBAbm90aWZpY2F0aW9uTWFuYWdlcj8uYWRkRXJyb3IoZXJyb3JNZXNzYWdlLCB7ZGV0YWlsLCBkaXNtaXNzYWJsZTogdHJ1ZX0pXG5cbiAgc2F2ZTogLT5cbiAgICByZXR1cm4gaWYgQHNob3VsZE5vdEFjY2Vzc0ZpbGVTeXN0ZW0oKVxuXG4gICAgYWxsU2V0dGluZ3MgPSB7JyonOiBAc2V0dGluZ3N9XG4gICAgYWxsU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduIGFsbFNldHRpbmdzLCBAc2NvcGVkU2V0dGluZ3NTdG9yZS5wcm9wZXJ0aWVzRm9yU291cmNlKEBnZXRVc2VyQ29uZmlnUGF0aCgpKVxuICAgIGFsbFNldHRpbmdzID0gc29ydE9iamVjdChhbGxTZXR0aW5ncylcbiAgICB0cnlcbiAgICAgIENTT04ud3JpdGVGaWxlU3luYyhAY29uZmlnRmlsZVBhdGgsIGFsbFNldHRpbmdzKVxuICAgIGNhdGNoIGVycm9yXG4gICAgICBtZXNzYWdlID0gXCJGYWlsZWQgdG8gc2F2ZSBgI3twYXRoLmJhc2VuYW1lKEBjb25maWdGaWxlUGF0aCl9YFwiXG4gICAgICBkZXRhaWwgPSBlcnJvci5tZXNzYWdlXG4gICAgICBAbm90aWZ5RmFpbHVyZShtZXNzYWdlLCBkZXRhaWwpXG5cbiAgIyMjXG4gIFNlY3Rpb246IFByaXZhdGUgbWV0aG9kcyBtYW5hZ2luZyBnbG9iYWwgc2V0dGluZ3NcbiAgIyMjXG5cbiAgcmVzZXRVc2VyU2V0dGluZ3M6IChuZXdTZXR0aW5ncykgLT5cbiAgICB1bmxlc3MgaXNQbGFpbk9iamVjdChuZXdTZXR0aW5ncylcbiAgICAgIEBzZXR0aW5ncyA9IHt9XG4gICAgICBAZW1pdENoYW5nZUV2ZW50KClcbiAgICAgIHJldHVyblxuXG4gICAgaWYgbmV3U2V0dGluZ3MuZ2xvYmFsP1xuICAgICAgbmV3U2V0dGluZ3NbJyonXSA9IG5ld1NldHRpbmdzLmdsb2JhbFxuICAgICAgZGVsZXRlIG5ld1NldHRpbmdzLmdsb2JhbFxuXG4gICAgaWYgbmV3U2V0dGluZ3NbJyonXT9cbiAgICAgIHNjb3BlZFNldHRpbmdzID0gbmV3U2V0dGluZ3NcbiAgICAgIG5ld1NldHRpbmdzID0gbmV3U2V0dGluZ3NbJyonXVxuICAgICAgZGVsZXRlIHNjb3BlZFNldHRpbmdzWycqJ11cbiAgICAgIEByZXNldFVzZXJTY29wZWRTZXR0aW5ncyhzY29wZWRTZXR0aW5ncylcblxuICAgIEB0cmFuc2FjdCA9PlxuICAgICAgQHNldHRpbmdzID0ge31cbiAgICAgIEBzZXQoa2V5LCB2YWx1ZSwgc2F2ZTogZmFsc2UpIGZvciBrZXksIHZhbHVlIG9mIG5ld1NldHRpbmdzXG4gICAgICByZXR1cm5cblxuICBnZXRSYXdWYWx1ZTogKGtleVBhdGgsIG9wdGlvbnMpIC0+XG4gICAgdW5sZXNzIG9wdGlvbnM/LmV4Y2x1ZGVTb3VyY2VzPy5pbmRleE9mKEBnZXRVc2VyQ29uZmlnUGF0aCgpKSA+PSAwXG4gICAgICB2YWx1ZSA9IGdldFZhbHVlQXRLZXlQYXRoKEBzZXR0aW5ncywga2V5UGF0aClcbiAgICB1bmxlc3Mgb3B0aW9ucz8uc291cmNlcz8ubGVuZ3RoID4gMFxuICAgICAgZGVmYXVsdFZhbHVlID0gZ2V0VmFsdWVBdEtleVBhdGgoQGRlZmF1bHRTZXR0aW5ncywga2V5UGF0aClcblxuICAgIGlmIHZhbHVlP1xuICAgICAgdmFsdWUgPSBAZGVlcENsb25lKHZhbHVlKVxuICAgICAgQGRlZXBEZWZhdWx0cyh2YWx1ZSwgZGVmYXVsdFZhbHVlKSBpZiBpc1BsYWluT2JqZWN0KHZhbHVlKSBhbmQgaXNQbGFpbk9iamVjdChkZWZhdWx0VmFsdWUpXG4gICAgZWxzZVxuICAgICAgdmFsdWUgPSBAZGVlcENsb25lKGRlZmF1bHRWYWx1ZSlcblxuICAgIHZhbHVlXG5cbiAgc2V0UmF3VmFsdWU6IChrZXlQYXRoLCB2YWx1ZSkgLT5cbiAgICBkZWZhdWx0VmFsdWUgPSBnZXRWYWx1ZUF0S2V5UGF0aChAZGVmYXVsdFNldHRpbmdzLCBrZXlQYXRoKVxuICAgIGlmIF8uaXNFcXVhbChkZWZhdWx0VmFsdWUsIHZhbHVlKVxuICAgICAgaWYga2V5UGF0aD9cbiAgICAgICAgZGVsZXRlVmFsdWVBdEtleVBhdGgoQHNldHRpbmdzLCBrZXlQYXRoKVxuICAgICAgZWxzZVxuICAgICAgICBAc2V0dGluZ3MgPSBudWxsXG4gICAgZWxzZVxuICAgICAgaWYga2V5UGF0aD9cbiAgICAgICAgc2V0VmFsdWVBdEtleVBhdGgoQHNldHRpbmdzLCBrZXlQYXRoLCB2YWx1ZSlcbiAgICAgIGVsc2VcbiAgICAgICAgQHNldHRpbmdzID0gdmFsdWVcbiAgICBAZW1pdENoYW5nZUV2ZW50KClcblxuICBvYnNlcnZlS2V5UGF0aDogKGtleVBhdGgsIG9wdGlvbnMsIGNhbGxiYWNrKSAtPlxuICAgIGNhbGxiYWNrKEBnZXQoa2V5UGF0aCkpXG4gICAgQG9uRGlkQ2hhbmdlS2V5UGF0aCBrZXlQYXRoLCAoZXZlbnQpIC0+IGNhbGxiYWNrKGV2ZW50Lm5ld1ZhbHVlKVxuXG4gIG9uRGlkQ2hhbmdlS2V5UGF0aDogKGtleVBhdGgsIGNhbGxiYWNrKSAtPlxuICAgIG9sZFZhbHVlID0gQGdldChrZXlQYXRoKVxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlJywgPT5cbiAgICAgIG5ld1ZhbHVlID0gQGdldChrZXlQYXRoKVxuICAgICAgdW5sZXNzIF8uaXNFcXVhbChvbGRWYWx1ZSwgbmV3VmFsdWUpXG4gICAgICAgIGV2ZW50ID0ge29sZFZhbHVlLCBuZXdWYWx1ZX1cbiAgICAgICAgb2xkVmFsdWUgPSBuZXdWYWx1ZVxuICAgICAgICBjYWxsYmFjayhldmVudClcblxuICBpc1N1YktleVBhdGg6IChrZXlQYXRoLCBzdWJLZXlQYXRoKSAtPlxuICAgIHJldHVybiBmYWxzZSB1bmxlc3Mga2V5UGF0aD8gYW5kIHN1YktleVBhdGg/XG4gICAgcGF0aFN1YlRva2VucyA9IHNwbGl0S2V5UGF0aChzdWJLZXlQYXRoKVxuICAgIHBhdGhUb2tlbnMgPSBzcGxpdEtleVBhdGgoa2V5UGF0aCkuc2xpY2UoMCwgcGF0aFN1YlRva2Vucy5sZW5ndGgpXG4gICAgXy5pc0VxdWFsKHBhdGhUb2tlbnMsIHBhdGhTdWJUb2tlbnMpXG5cbiAgc2V0UmF3RGVmYXVsdDogKGtleVBhdGgsIHZhbHVlKSAtPlxuICAgIHNldFZhbHVlQXRLZXlQYXRoKEBkZWZhdWx0U2V0dGluZ3MsIGtleVBhdGgsIHZhbHVlKVxuICAgIEBlbWl0Q2hhbmdlRXZlbnQoKVxuXG4gIHNldERlZmF1bHRzOiAoa2V5UGF0aCwgZGVmYXVsdHMpIC0+XG4gICAgaWYgZGVmYXVsdHM/IGFuZCBpc1BsYWluT2JqZWN0KGRlZmF1bHRzKVxuICAgICAga2V5cyA9IHNwbGl0S2V5UGF0aChrZXlQYXRoKVxuICAgICAgQHRyYW5zYWN0ID0+XG4gICAgICAgIGZvciBrZXksIGNoaWxkVmFsdWUgb2YgZGVmYXVsdHNcbiAgICAgICAgICBjb250aW51ZSB1bmxlc3MgZGVmYXVsdHMuaGFzT3duUHJvcGVydHkoa2V5KVxuICAgICAgICAgIEBzZXREZWZhdWx0cyhrZXlzLmNvbmNhdChba2V5XSkuam9pbignLicpLCBjaGlsZFZhbHVlKVxuICAgIGVsc2VcbiAgICAgIHRyeVxuICAgICAgICBkZWZhdWx0cyA9IEBtYWtlVmFsdWVDb25mb3JtVG9TY2hlbWEoa2V5UGF0aCwgZGVmYXVsdHMpXG4gICAgICAgIEBzZXRSYXdEZWZhdWx0KGtleVBhdGgsIGRlZmF1bHRzKVxuICAgICAgY2F0Y2ggZVxuICAgICAgICBjb25zb2xlLndhcm4oXCInI3trZXlQYXRofScgY291bGQgbm90IHNldCB0aGUgZGVmYXVsdC4gQXR0ZW1wdGVkIGRlZmF1bHQ6ICN7SlNPTi5zdHJpbmdpZnkoZGVmYXVsdHMpfTsgU2NoZW1hOiAje0pTT04uc3RyaW5naWZ5KEBnZXRTY2hlbWEoa2V5UGF0aCkpfVwiKVxuICAgIHJldHVyblxuXG4gIGRlZXBDbG9uZTogKG9iamVjdCkgLT5cbiAgICBpZiBvYmplY3QgaW5zdGFuY2VvZiBDb2xvclxuICAgICAgb2JqZWN0LmNsb25lKClcbiAgICBlbHNlIGlmIF8uaXNBcnJheShvYmplY3QpXG4gICAgICBvYmplY3QubWFwICh2YWx1ZSkgPT4gQGRlZXBDbG9uZSh2YWx1ZSlcbiAgICBlbHNlIGlmIGlzUGxhaW5PYmplY3Qob2JqZWN0KVxuICAgICAgXy5tYXBPYmplY3Qgb2JqZWN0LCAoa2V5LCB2YWx1ZSkgPT4gW2tleSwgQGRlZXBDbG9uZSh2YWx1ZSldXG4gICAgZWxzZVxuICAgICAgb2JqZWN0XG5cbiAgZGVlcERlZmF1bHRzOiAodGFyZ2V0KSAtPlxuICAgIHJlc3VsdCA9IHRhcmdldFxuICAgIGkgPSAwXG4gICAgd2hpbGUgKytpIDwgYXJndW1lbnRzLmxlbmd0aFxuICAgICAgb2JqZWN0ID0gYXJndW1lbnRzW2ldXG4gICAgICBpZiBpc1BsYWluT2JqZWN0KHJlc3VsdCkgYW5kIGlzUGxhaW5PYmplY3Qob2JqZWN0KVxuICAgICAgICBmb3Iga2V5IGluIE9iamVjdC5rZXlzKG9iamVjdClcbiAgICAgICAgICByZXN1bHRba2V5XSA9IEBkZWVwRGVmYXVsdHMocmVzdWx0W2tleV0sIG9iamVjdFtrZXldKVxuICAgICAgZWxzZVxuICAgICAgICBpZiBub3QgcmVzdWx0P1xuICAgICAgICAgIHJlc3VsdCA9IEBkZWVwQ2xvbmUob2JqZWN0KVxuICAgIHJlc3VsdFxuXG4gICMgYHNjaGVtYWAgd2lsbCBsb29rIHNvbWV0aGluZyBsaWtlIHRoaXNcbiAgI1xuICAjIGBgYGNvZmZlZVxuICAjIHR5cGU6ICdzdHJpbmcnXG4gICMgZGVmYXVsdDogJ29rJ1xuICAjIHNjb3BlczpcbiAgIyAgICcuc291cmNlLmpzJzpcbiAgIyAgICAgZGVmYXVsdDogJ29tZydcbiAgIyBgYGBcbiAgc2V0U2NvcGVkRGVmYXVsdHNGcm9tU2NoZW1hOiAoa2V5UGF0aCwgc2NoZW1hKSAtPlxuICAgIGlmIHNjaGVtYS5zY29wZXM/IGFuZCBpc1BsYWluT2JqZWN0KHNjaGVtYS5zY29wZXMpXG4gICAgICBzY29wZWREZWZhdWx0cyA9IHt9XG4gICAgICBmb3Igc2NvcGUsIHNjb3BlU2NoZW1hIG9mIHNjaGVtYS5zY29wZXNcbiAgICAgICAgY29udGludWUgdW5sZXNzIHNjb3BlU2NoZW1hLmhhc093blByb3BlcnR5KCdkZWZhdWx0JylcbiAgICAgICAgc2NvcGVkRGVmYXVsdHNbc2NvcGVdID0ge31cbiAgICAgICAgc2V0VmFsdWVBdEtleVBhdGgoc2NvcGVkRGVmYXVsdHNbc2NvcGVdLCBrZXlQYXRoLCBzY29wZVNjaGVtYS5kZWZhdWx0KVxuICAgICAgQHNjb3BlZFNldHRpbmdzU3RvcmUuYWRkUHJvcGVydGllcygnc2NoZW1hLWRlZmF1bHQnLCBzY29wZWREZWZhdWx0cylcblxuICAgIGlmIHNjaGVtYS50eXBlIGlzICdvYmplY3QnIGFuZCBzY2hlbWEucHJvcGVydGllcz8gYW5kIGlzUGxhaW5PYmplY3Qoc2NoZW1hLnByb3BlcnRpZXMpXG4gICAgICBrZXlzID0gc3BsaXRLZXlQYXRoKGtleVBhdGgpXG4gICAgICBmb3Iga2V5LCBjaGlsZFZhbHVlIG9mIHNjaGVtYS5wcm9wZXJ0aWVzXG4gICAgICAgIGNvbnRpbnVlIHVubGVzcyBzY2hlbWEucHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eShrZXkpXG4gICAgICAgIEBzZXRTY29wZWREZWZhdWx0c0Zyb21TY2hlbWEoa2V5cy5jb25jYXQoW2tleV0pLmpvaW4oJy4nKSwgY2hpbGRWYWx1ZSlcblxuICAgIHJldHVyblxuXG4gIGV4dHJhY3REZWZhdWx0c0Zyb21TY2hlbWE6IChzY2hlbWEpIC0+XG4gICAgaWYgc2NoZW1hLmRlZmF1bHQ/XG4gICAgICBzY2hlbWEuZGVmYXVsdFxuICAgIGVsc2UgaWYgc2NoZW1hLnR5cGUgaXMgJ29iamVjdCcgYW5kIHNjaGVtYS5wcm9wZXJ0aWVzPyBhbmQgaXNQbGFpbk9iamVjdChzY2hlbWEucHJvcGVydGllcylcbiAgICAgIGRlZmF1bHRzID0ge31cbiAgICAgIHByb3BlcnRpZXMgPSBzY2hlbWEucHJvcGVydGllcyBvciB7fVxuICAgICAgZGVmYXVsdHNba2V5XSA9IEBleHRyYWN0RGVmYXVsdHNGcm9tU2NoZW1hKHZhbHVlKSBmb3Iga2V5LCB2YWx1ZSBvZiBwcm9wZXJ0aWVzXG4gICAgICBkZWZhdWx0c1xuXG4gIG1ha2VWYWx1ZUNvbmZvcm1Ub1NjaGVtYTogKGtleVBhdGgsIHZhbHVlLCBvcHRpb25zKSAtPlxuICAgIGlmIG9wdGlvbnM/LnN1cHByZXNzRXhjZXB0aW9uXG4gICAgICB0cnlcbiAgICAgICAgQG1ha2VWYWx1ZUNvbmZvcm1Ub1NjaGVtYShrZXlQYXRoLCB2YWx1ZSlcbiAgICAgIGNhdGNoIGVcbiAgICAgICAgdW5kZWZpbmVkXG4gICAgZWxzZVxuICAgICAgdW5sZXNzIChzY2hlbWEgPSBAZ2V0U2NoZW1hKGtleVBhdGgpKT9cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSWxsZWdhbCBrZXkgcGF0aCAje2tleVBhdGh9XCIpIGlmIHNjaGVtYSBpcyBmYWxzZVxuICAgICAgQGNvbnN0cnVjdG9yLmV4ZWN1dGVTY2hlbWFFbmZvcmNlcnMoa2V5UGF0aCwgdmFsdWUsIHNjaGVtYSlcblxuICAjIFdoZW4gdGhlIHNjaGVtYSBpcyBjaGFuZ2VkIC8gYWRkZWQsIHRoZXJlIG1heSBiZSB2YWx1ZXMgc2V0IGluIHRoZSBjb25maWdcbiAgIyB0aGF0IGRvIG5vdCBjb25mb3JtIHRvIHRoZSBzY2hlbWEuIFRoaXMgd2lsbCByZXNldCBtYWtlIHRoZW0gY29uZm9ybS5cbiAgcmVzZXRTZXR0aW5nc0ZvclNjaGVtYUNoYW5nZTogKHNvdXJjZT1AZ2V0VXNlckNvbmZpZ1BhdGgoKSkgLT5cbiAgICBAdHJhbnNhY3QgPT5cbiAgICAgIEBzZXR0aW5ncyA9IEBtYWtlVmFsdWVDb25mb3JtVG9TY2hlbWEobnVsbCwgQHNldHRpbmdzLCBzdXBwcmVzc0V4Y2VwdGlvbjogdHJ1ZSlcbiAgICAgIHNlbGVjdG9yc0FuZFNldHRpbmdzID0gQHNjb3BlZFNldHRpbmdzU3RvcmUucHJvcGVydGllc0ZvclNvdXJjZShzb3VyY2UpXG4gICAgICBAc2NvcGVkU2V0dGluZ3NTdG9yZS5yZW1vdmVQcm9wZXJ0aWVzRm9yU291cmNlKHNvdXJjZSlcbiAgICAgIGZvciBzY29wZVNlbGVjdG9yLCBzZXR0aW5ncyBvZiBzZWxlY3RvcnNBbmRTZXR0aW5nc1xuICAgICAgICBzZXR0aW5ncyA9IEBtYWtlVmFsdWVDb25mb3JtVG9TY2hlbWEobnVsbCwgc2V0dGluZ3MsIHN1cHByZXNzRXhjZXB0aW9uOiB0cnVlKVxuICAgICAgICBAc2V0UmF3U2NvcGVkVmFsdWUobnVsbCwgc2V0dGluZ3MsIHNvdXJjZSwgc2NvcGVTZWxlY3RvcilcbiAgICAgIHJldHVyblxuXG4gICMjI1xuICBTZWN0aW9uOiBQcml2YXRlIFNjb3BlZCBTZXR0aW5nc1xuICAjIyNcblxuICBwcmlvcml0eUZvclNvdXJjZTogKHNvdXJjZSkgLT5cbiAgICBpZiBzb3VyY2UgaXMgQGdldFVzZXJDb25maWdQYXRoKClcbiAgICAgIDEwMDBcbiAgICBlbHNlXG4gICAgICAwXG5cbiAgZW1pdENoYW5nZUV2ZW50OiAtPlxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2UnIHVubGVzcyBAdHJhbnNhY3REZXB0aCA+IDBcblxuICByZXNldFVzZXJTY29wZWRTZXR0aW5nczogKG5ld1Njb3BlZFNldHRpbmdzKSAtPlxuICAgIHNvdXJjZSA9IEBnZXRVc2VyQ29uZmlnUGF0aCgpXG4gICAgcHJpb3JpdHkgPSBAcHJpb3JpdHlGb3JTb3VyY2Uoc291cmNlKVxuICAgIEBzY29wZWRTZXR0aW5nc1N0b3JlLnJlbW92ZVByb3BlcnRpZXNGb3JTb3VyY2Uoc291cmNlKVxuXG4gICAgZm9yIHNjb3BlU2VsZWN0b3IsIHNldHRpbmdzIG9mIG5ld1Njb3BlZFNldHRpbmdzXG4gICAgICBzZXR0aW5ncyA9IEBtYWtlVmFsdWVDb25mb3JtVG9TY2hlbWEobnVsbCwgc2V0dGluZ3MsIHN1cHByZXNzRXhjZXB0aW9uOiB0cnVlKVxuICAgICAgdmFsaWRhdGVkU2V0dGluZ3MgPSB7fVxuICAgICAgdmFsaWRhdGVkU2V0dGluZ3Nbc2NvcGVTZWxlY3Rvcl0gPSB3aXRob3V0RW1wdHlPYmplY3RzKHNldHRpbmdzKVxuICAgICAgQHNjb3BlZFNldHRpbmdzU3RvcmUuYWRkUHJvcGVydGllcyhzb3VyY2UsIHZhbGlkYXRlZFNldHRpbmdzLCB7cHJpb3JpdHl9KSBpZiB2YWxpZGF0ZWRTZXR0aW5nc1tzY29wZVNlbGVjdG9yXT9cblxuICAgIEBlbWl0Q2hhbmdlRXZlbnQoKVxuXG4gIHNldFJhd1Njb3BlZFZhbHVlOiAoa2V5UGF0aCwgdmFsdWUsIHNvdXJjZSwgc2VsZWN0b3IsIG9wdGlvbnMpIC0+XG4gICAgaWYga2V5UGF0aD9cbiAgICAgIG5ld1ZhbHVlID0ge31cbiAgICAgIHNldFZhbHVlQXRLZXlQYXRoKG5ld1ZhbHVlLCBrZXlQYXRoLCB2YWx1ZSlcbiAgICAgIHZhbHVlID0gbmV3VmFsdWVcblxuICAgIHNldHRpbmdzQnlTZWxlY3RvciA9IHt9XG4gICAgc2V0dGluZ3NCeVNlbGVjdG9yW3NlbGVjdG9yXSA9IHZhbHVlXG4gICAgQHNjb3BlZFNldHRpbmdzU3RvcmUuYWRkUHJvcGVydGllcyhzb3VyY2UsIHNldHRpbmdzQnlTZWxlY3RvciwgcHJpb3JpdHk6IEBwcmlvcml0eUZvclNvdXJjZShzb3VyY2UpKVxuICAgIEBlbWl0Q2hhbmdlRXZlbnQoKVxuXG4gIGdldFJhd1Njb3BlZFZhbHVlOiAoc2NvcGVEZXNjcmlwdG9yLCBrZXlQYXRoLCBvcHRpb25zKSAtPlxuICAgIHNjb3BlRGVzY3JpcHRvciA9IFNjb3BlRGVzY3JpcHRvci5mcm9tT2JqZWN0KHNjb3BlRGVzY3JpcHRvcilcbiAgICBAc2NvcGVkU2V0dGluZ3NTdG9yZS5nZXRQcm9wZXJ0eVZhbHVlKHNjb3BlRGVzY3JpcHRvci5nZXRTY29wZUNoYWluKCksIGtleVBhdGgsIG9wdGlvbnMpXG5cbiAgb2JzZXJ2ZVNjb3BlZEtleVBhdGg6IChzY29wZSwga2V5UGF0aCwgY2FsbGJhY2spIC0+XG4gICAgY2FsbGJhY2soQGdldChrZXlQYXRoLCB7c2NvcGV9KSlcbiAgICBAb25EaWRDaGFuZ2VTY29wZWRLZXlQYXRoIHNjb3BlLCBrZXlQYXRoLCAoZXZlbnQpIC0+IGNhbGxiYWNrKGV2ZW50Lm5ld1ZhbHVlKVxuXG4gIG9uRGlkQ2hhbmdlU2NvcGVkS2V5UGF0aDogKHNjb3BlLCBrZXlQYXRoLCBjYWxsYmFjaykgLT5cbiAgICBvbGRWYWx1ZSA9IEBnZXQoa2V5UGF0aCwge3Njb3BlfSlcbiAgICBAZW1pdHRlci5vbiAnZGlkLWNoYW5nZScsID0+XG4gICAgICBuZXdWYWx1ZSA9IEBnZXQoa2V5UGF0aCwge3Njb3BlfSlcbiAgICAgIHVubGVzcyBfLmlzRXF1YWwob2xkVmFsdWUsIG5ld1ZhbHVlKVxuICAgICAgICBldmVudCA9IHtvbGRWYWx1ZSwgbmV3VmFsdWV9XG4gICAgICAgIG9sZFZhbHVlID0gbmV3VmFsdWVcbiAgICAgICAgY2FsbGJhY2soZXZlbnQpXG5cbiMgQmFzZSBzY2hlbWEgZW5mb3JjZXJzLiBUaGVzZSB3aWxsIGNvZXJjZSByYXcgaW5wdXQgaW50byB0aGUgc3BlY2lmaWVkIHR5cGUsXG4jIGFuZCB3aWxsIHRocm93IGFuIGVycm9yIHdoZW4gdGhlIHZhbHVlIGNhbm5vdCBiZSBjb2VyY2VkLiBUaHJvd2luZyB0aGUgZXJyb3JcbiMgd2lsbCBpbmRpY2F0ZSB0aGF0IHRoZSB2YWx1ZSBzaG91bGQgbm90IGJlIHNldC5cbiNcbiMgRW5mb3JjZXJzIGFyZSBydW4gZnJvbSBtb3N0IHNwZWNpZmljIHRvIGxlYXN0LiBGb3IgYSBzY2hlbWEgd2l0aCB0eXBlXG4jIGBpbnRlZ2VyYCwgYWxsIHRoZSBlbmZvcmNlcnMgZm9yIHRoZSBgaW50ZWdlcmAgdHlwZSB3aWxsIGJlIHJ1biBmaXJzdCwgaW5cbiMgb3JkZXIgb2Ygc3BlY2lmaWNhdGlvbi4gVGhlbiB0aGUgYCpgIGVuZm9yY2VycyB3aWxsIGJlIHJ1biwgaW4gb3JkZXIgb2ZcbiMgc3BlY2lmaWNhdGlvbi5cbkNvbmZpZy5hZGRTY2hlbWFFbmZvcmNlcnNcbiAgJ2FueSc6XG4gICAgY29lcmNlOiAoa2V5UGF0aCwgdmFsdWUsIHNjaGVtYSkgLT5cbiAgICAgIHZhbHVlXG5cbiAgJ2ludGVnZXInOlxuICAgIGNvZXJjZTogKGtleVBhdGgsIHZhbHVlLCBzY2hlbWEpIC0+XG4gICAgICB2YWx1ZSA9IHBhcnNlSW50KHZhbHVlKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmFsaWRhdGlvbiBmYWlsZWQgYXQgI3trZXlQYXRofSwgI3tKU09OLnN0cmluZ2lmeSh2YWx1ZSl9IGNhbm5vdCBiZSBjb2VyY2VkIGludG8gYW4gaW50XCIpIGlmIGlzTmFOKHZhbHVlKSBvciBub3QgaXNGaW5pdGUodmFsdWUpXG4gICAgICB2YWx1ZVxuXG4gICdudW1iZXInOlxuICAgIGNvZXJjZTogKGtleVBhdGgsIHZhbHVlLCBzY2hlbWEpIC0+XG4gICAgICB2YWx1ZSA9IHBhcnNlRmxvYXQodmFsdWUpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJWYWxpZGF0aW9uIGZhaWxlZCBhdCAje2tleVBhdGh9LCAje0pTT04uc3RyaW5naWZ5KHZhbHVlKX0gY2Fubm90IGJlIGNvZXJjZWQgaW50byBhIG51bWJlclwiKSBpZiBpc05hTih2YWx1ZSkgb3Igbm90IGlzRmluaXRlKHZhbHVlKVxuICAgICAgdmFsdWVcblxuICAnYm9vbGVhbic6XG4gICAgY29lcmNlOiAoa2V5UGF0aCwgdmFsdWUsIHNjaGVtYSkgLT5cbiAgICAgIHN3aXRjaCB0eXBlb2YgdmFsdWVcbiAgICAgICAgd2hlbiAnc3RyaW5nJ1xuICAgICAgICAgIGlmIHZhbHVlLnRvTG93ZXJDYXNlKCkgaXMgJ3RydWUnXG4gICAgICAgICAgICB0cnVlXG4gICAgICAgICAgZWxzZSBpZiB2YWx1ZS50b0xvd2VyQ2FzZSgpIGlzICdmYWxzZSdcbiAgICAgICAgICAgIGZhbHNlXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmFsaWRhdGlvbiBmYWlsZWQgYXQgI3trZXlQYXRofSwgI3tKU09OLnN0cmluZ2lmeSh2YWx1ZSl9IG11c3QgYmUgYSBib29sZWFuIG9yIHRoZSBzdHJpbmcgJ3RydWUnIG9yICdmYWxzZSdcIilcbiAgICAgICAgd2hlbiAnYm9vbGVhbidcbiAgICAgICAgICB2YWx1ZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmFsaWRhdGlvbiBmYWlsZWQgYXQgI3trZXlQYXRofSwgI3tKU09OLnN0cmluZ2lmeSh2YWx1ZSl9IG11c3QgYmUgYSBib29sZWFuIG9yIHRoZSBzdHJpbmcgJ3RydWUnIG9yICdmYWxzZSdcIilcblxuICAnc3RyaW5nJzpcbiAgICB2YWxpZGF0ZTogKGtleVBhdGgsIHZhbHVlLCBzY2hlbWEpIC0+XG4gICAgICB1bmxlc3MgdHlwZW9mIHZhbHVlIGlzICdzdHJpbmcnXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZhbGlkYXRpb24gZmFpbGVkIGF0ICN7a2V5UGF0aH0sICN7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSBtdXN0IGJlIGEgc3RyaW5nXCIpXG4gICAgICB2YWx1ZVxuXG4gICAgdmFsaWRhdGVNYXhpbXVtTGVuZ3RoOiAoa2V5UGF0aCwgdmFsdWUsIHNjaGVtYSkgLT5cbiAgICAgIGlmIHR5cGVvZiBzY2hlbWEubWF4aW11bUxlbmd0aCBpcyAnbnVtYmVyJyBhbmQgdmFsdWUubGVuZ3RoID4gc2NoZW1hLm1heGltdW1MZW5ndGhcbiAgICAgICAgdmFsdWUuc2xpY2UoMCwgc2NoZW1hLm1heGltdW1MZW5ndGgpXG4gICAgICBlbHNlXG4gICAgICAgIHZhbHVlXG5cbiAgJ251bGwnOlxuICAgICMgbnVsbCBzb3J0IG9mIGlzbnQgc3VwcG9ydGVkLiBJdCB3aWxsIGp1c3QgdW5zZXQgaW4gdGhpcyBjYXNlXG4gICAgY29lcmNlOiAoa2V5UGF0aCwgdmFsdWUsIHNjaGVtYSkgLT5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlZhbGlkYXRpb24gZmFpbGVkIGF0ICN7a2V5UGF0aH0sICN7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSBtdXN0IGJlIG51bGxcIikgdW5sZXNzIHZhbHVlIGluIFt1bmRlZmluZWQsIG51bGxdXG4gICAgICB2YWx1ZVxuXG4gICdvYmplY3QnOlxuICAgIGNvZXJjZTogKGtleVBhdGgsIHZhbHVlLCBzY2hlbWEpIC0+XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJWYWxpZGF0aW9uIGZhaWxlZCBhdCAje2tleVBhdGh9LCAje0pTT04uc3RyaW5naWZ5KHZhbHVlKX0gbXVzdCBiZSBhbiBvYmplY3RcIikgdW5sZXNzIGlzUGxhaW5PYmplY3QodmFsdWUpXG4gICAgICByZXR1cm4gdmFsdWUgdW5sZXNzIHNjaGVtYS5wcm9wZXJ0aWVzP1xuXG4gICAgICBkZWZhdWx0Q2hpbGRTY2hlbWEgPSBudWxsXG4gICAgICBhbGxvd3NBZGRpdGlvbmFsUHJvcGVydGllcyA9IHRydWVcbiAgICAgIGlmIGlzUGxhaW5PYmplY3Qoc2NoZW1hLmFkZGl0aW9uYWxQcm9wZXJ0aWVzKVxuICAgICAgICBkZWZhdWx0Q2hpbGRTY2hlbWEgPSBzY2hlbWEuYWRkaXRpb25hbFByb3BlcnRpZXNcbiAgICAgIGlmIHNjaGVtYS5hZGRpdGlvbmFsUHJvcGVydGllcyBpcyBmYWxzZVxuICAgICAgICBhbGxvd3NBZGRpdGlvbmFsUHJvcGVydGllcyA9IGZhbHNlXG5cbiAgICAgIG5ld1ZhbHVlID0ge31cbiAgICAgIGZvciBwcm9wLCBwcm9wVmFsdWUgb2YgdmFsdWVcbiAgICAgICAgY2hpbGRTY2hlbWEgPSBzY2hlbWEucHJvcGVydGllc1twcm9wXSA/IGRlZmF1bHRDaGlsZFNjaGVtYVxuICAgICAgICBpZiBjaGlsZFNjaGVtYT9cbiAgICAgICAgICB0cnlcbiAgICAgICAgICAgIG5ld1ZhbHVlW3Byb3BdID0gQGV4ZWN1dGVTY2hlbWFFbmZvcmNlcnMocHVzaEtleVBhdGgoa2V5UGF0aCwgcHJvcCksIHByb3BWYWx1ZSwgY2hpbGRTY2hlbWEpXG4gICAgICAgICAgY2F0Y2ggZXJyb3JcbiAgICAgICAgICAgIGNvbnNvbGUud2FybiBcIkVycm9yIHNldHRpbmcgaXRlbSBpbiBvYmplY3Q6ICN7ZXJyb3IubWVzc2FnZX1cIlxuICAgICAgICBlbHNlIGlmIGFsbG93c0FkZGl0aW9uYWxQcm9wZXJ0aWVzXG4gICAgICAgICAgIyBKdXN0IHBhc3MgdGhyb3VnaCB1bi1zY2hlbWEnZCB2YWx1ZXNcbiAgICAgICAgICBuZXdWYWx1ZVtwcm9wXSA9IHByb3BWYWx1ZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgY29uc29sZS53YXJuIFwiSWxsZWdhbCBvYmplY3Qga2V5OiAje2tleVBhdGh9LiN7cHJvcH1cIlxuXG4gICAgICBuZXdWYWx1ZVxuXG4gICdhcnJheSc6XG4gICAgY29lcmNlOiAoa2V5UGF0aCwgdmFsdWUsIHNjaGVtYSkgLT5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlZhbGlkYXRpb24gZmFpbGVkIGF0ICN7a2V5UGF0aH0sICN7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSBtdXN0IGJlIGFuIGFycmF5XCIpIHVubGVzcyBBcnJheS5pc0FycmF5KHZhbHVlKVxuICAgICAgaXRlbVNjaGVtYSA9IHNjaGVtYS5pdGVtc1xuICAgICAgaWYgaXRlbVNjaGVtYT9cbiAgICAgICAgbmV3VmFsdWUgPSBbXVxuICAgICAgICBmb3IgaXRlbSBpbiB2YWx1ZVxuICAgICAgICAgIHRyeVxuICAgICAgICAgICAgbmV3VmFsdWUucHVzaCBAZXhlY3V0ZVNjaGVtYUVuZm9yY2VycyhrZXlQYXRoLCBpdGVtLCBpdGVtU2NoZW1hKVxuICAgICAgICAgIGNhdGNoIGVycm9yXG4gICAgICAgICAgICBjb25zb2xlLndhcm4gXCJFcnJvciBzZXR0aW5nIGl0ZW0gaW4gYXJyYXk6ICN7ZXJyb3IubWVzc2FnZX1cIlxuICAgICAgICBuZXdWYWx1ZVxuICAgICAgZWxzZVxuICAgICAgICB2YWx1ZVxuXG4gICdjb2xvcic6XG4gICAgY29lcmNlOiAoa2V5UGF0aCwgdmFsdWUsIHNjaGVtYSkgLT5cbiAgICAgIGNvbG9yID0gQ29sb3IucGFyc2UodmFsdWUpXG4gICAgICB1bmxlc3MgY29sb3I/XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZhbGlkYXRpb24gZmFpbGVkIGF0ICN7a2V5UGF0aH0sICN7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSBjYW5ub3QgYmUgY29lcmNlZCBpbnRvIGEgY29sb3JcIilcbiAgICAgIGNvbG9yXG5cbiAgJyonOlxuICAgIGNvZXJjZU1pbmltdW1BbmRNYXhpbXVtOiAoa2V5UGF0aCwgdmFsdWUsIHNjaGVtYSkgLT5cbiAgICAgIHJldHVybiB2YWx1ZSB1bmxlc3MgdHlwZW9mIHZhbHVlIGlzICdudW1iZXInXG4gICAgICBpZiBzY2hlbWEubWluaW11bT8gYW5kIHR5cGVvZiBzY2hlbWEubWluaW11bSBpcyAnbnVtYmVyJ1xuICAgICAgICB2YWx1ZSA9IE1hdGgubWF4KHZhbHVlLCBzY2hlbWEubWluaW11bSlcbiAgICAgIGlmIHNjaGVtYS5tYXhpbXVtPyBhbmQgdHlwZW9mIHNjaGVtYS5tYXhpbXVtIGlzICdudW1iZXInXG4gICAgICAgIHZhbHVlID0gTWF0aC5taW4odmFsdWUsIHNjaGVtYS5tYXhpbXVtKVxuICAgICAgdmFsdWVcblxuICAgIHZhbGlkYXRlRW51bTogKGtleVBhdGgsIHZhbHVlLCBzY2hlbWEpIC0+XG4gICAgICBwb3NzaWJsZVZhbHVlcyA9IHNjaGVtYS5lbnVtXG5cbiAgICAgIGlmIEFycmF5LmlzQXJyYXkocG9zc2libGVWYWx1ZXMpXG4gICAgICAgIHBvc3NpYmxlVmFsdWVzID0gcG9zc2libGVWYWx1ZXMubWFwICh2YWx1ZSkgLT5cbiAgICAgICAgICBpZiB2YWx1ZS5oYXNPd25Qcm9wZXJ0eSgndmFsdWUnKSB0aGVuIHZhbHVlLnZhbHVlIGVsc2UgdmFsdWVcblxuICAgICAgcmV0dXJuIHZhbHVlIHVubGVzcyBwb3NzaWJsZVZhbHVlcz8gYW5kIEFycmF5LmlzQXJyYXkocG9zc2libGVWYWx1ZXMpIGFuZCBwb3NzaWJsZVZhbHVlcy5sZW5ndGhcblxuICAgICAgZm9yIHBvc3NpYmxlVmFsdWUgaW4gcG9zc2libGVWYWx1ZXNcbiAgICAgICAgIyBVc2luZyBgaXNFcXVhbGAgZm9yIHBvc3NpYmlsaXR5IG9mIHBsYWNpbmcgZW51bXMgb24gYXJyYXkgYW5kIG9iamVjdCBzY2hlbWFzXG4gICAgICAgIHJldHVybiB2YWx1ZSBpZiBfLmlzRXF1YWwocG9zc2libGVWYWx1ZSwgdmFsdWUpXG5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlZhbGlkYXRpb24gZmFpbGVkIGF0ICN7a2V5UGF0aH0sICN7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSBpcyBub3Qgb25lIG9mICN7SlNPTi5zdHJpbmdpZnkocG9zc2libGVWYWx1ZXMpfVwiKVxuXG5pc1BsYWluT2JqZWN0ID0gKHZhbHVlKSAtPlxuICBfLmlzT2JqZWN0KHZhbHVlKSBhbmQgbm90IF8uaXNBcnJheSh2YWx1ZSkgYW5kIG5vdCBfLmlzRnVuY3Rpb24odmFsdWUpIGFuZCBub3QgXy5pc1N0cmluZyh2YWx1ZSkgYW5kIG5vdCAodmFsdWUgaW5zdGFuY2VvZiBDb2xvcilcblxuc29ydE9iamVjdCA9ICh2YWx1ZSkgLT5cbiAgcmV0dXJuIHZhbHVlIHVubGVzcyBpc1BsYWluT2JqZWN0KHZhbHVlKVxuICByZXN1bHQgPSB7fVxuICBmb3Iga2V5IGluIE9iamVjdC5rZXlzKHZhbHVlKS5zb3J0KClcbiAgICByZXN1bHRba2V5XSA9IHNvcnRPYmplY3QodmFsdWVba2V5XSlcbiAgcmVzdWx0XG5cbndpdGhvdXRFbXB0eU9iamVjdHMgPSAob2JqZWN0KSAtPlxuICByZXN1bHRPYmplY3QgPSB1bmRlZmluZWRcbiAgaWYgaXNQbGFpbk9iamVjdChvYmplY3QpXG4gICAgZm9yIGtleSwgdmFsdWUgb2Ygb2JqZWN0XG4gICAgICBuZXdWYWx1ZSA9IHdpdGhvdXRFbXB0eU9iamVjdHModmFsdWUpXG4gICAgICBpZiBuZXdWYWx1ZT9cbiAgICAgICAgcmVzdWx0T2JqZWN0ID89IHt9XG4gICAgICAgIHJlc3VsdE9iamVjdFtrZXldID0gbmV3VmFsdWVcbiAgZWxzZVxuICAgIHJlc3VsdE9iamVjdCA9IG9iamVjdFxuICByZXN1bHRPYmplY3RcbiJdfQ==
