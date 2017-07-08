(function() {
  var CompositeDisposable, Emitter, File, LessCompileCache, ThemeManager, _, fs, path, ref;

  path = require('path');

  _ = require('underscore-plus');

  ref = require('event-kit'), Emitter = ref.Emitter, CompositeDisposable = ref.CompositeDisposable;

  File = require('pathwatcher').File;

  fs = require('fs-plus');

  LessCompileCache = require('./less-compile-cache');

  module.exports = ThemeManager = (function() {
    function ThemeManager(arg) {
      this.packageManager = arg.packageManager, this.config = arg.config, this.styleManager = arg.styleManager, this.notificationManager = arg.notificationManager, this.viewRegistry = arg.viewRegistry;
      this.emitter = new Emitter;
      this.styleSheetDisposablesBySourcePath = {};
      this.lessCache = null;
      this.initialLoadComplete = false;
      this.packageManager.registerPackageActivator(this, ['theme']);
      this.packageManager.onDidActivateInitialPackages((function(_this) {
        return function() {
          return _this.onDidChangeActiveThemes(function() {
            return _this.packageManager.reloadActivePackageStyleSheets();
          });
        };
      })(this));
    }

    ThemeManager.prototype.initialize = function(arg) {
      var devMode;
      this.resourcePath = arg.resourcePath, this.configDirPath = arg.configDirPath, this.safeMode = arg.safeMode, devMode = arg.devMode;
      this.lessSourcesByRelativeFilePath = null;
      if (devMode || typeof snapshotAuxiliaryData === 'undefined') {
        this.lessSourcesByRelativeFilePath = {};
        return this.importedFilePathsByRelativeImportPath = {};
      } else {
        this.lessSourcesByRelativeFilePath = snapshotAuxiliaryData.lessSourcesByRelativeFilePath;
        return this.importedFilePathsByRelativeImportPath = snapshotAuxiliaryData.importedFilePathsByRelativeImportPath;
      }
    };


    /*
    Section: Event Subscription
     */

    ThemeManager.prototype.onDidChangeActiveThemes = function(callback) {
      return this.emitter.on('did-change-active-themes', callback);
    };


    /*
    Section: Accessing Available Themes
     */

    ThemeManager.prototype.getAvailableNames = function() {
      return this.getLoadedNames();
    };


    /*
    Section: Accessing Loaded Themes
     */

    ThemeManager.prototype.getLoadedThemeNames = function() {
      var i, len, ref1, results, theme;
      ref1 = this.getLoadedThemes();
      results = [];
      for (i = 0, len = ref1.length; i < len; i++) {
        theme = ref1[i];
        results.push(theme.name);
      }
      return results;
    };

    ThemeManager.prototype.getLoadedThemes = function() {
      var i, len, pack, ref1, results;
      ref1 = this.packageManager.getLoadedPackages();
      results = [];
      for (i = 0, len = ref1.length; i < len; i++) {
        pack = ref1[i];
        if (pack.isTheme()) {
          results.push(pack);
        }
      }
      return results;
    };


    /*
    Section: Accessing Active Themes
     */

    ThemeManager.prototype.getActiveThemeNames = function() {
      var i, len, ref1, results, theme;
      ref1 = this.getActiveThemes();
      results = [];
      for (i = 0, len = ref1.length; i < len; i++) {
        theme = ref1[i];
        results.push(theme.name);
      }
      return results;
    };

    ThemeManager.prototype.getActiveThemes = function() {
      var i, len, pack, ref1, results;
      ref1 = this.packageManager.getActivePackages();
      results = [];
      for (i = 0, len = ref1.length; i < len; i++) {
        pack = ref1[i];
        if (pack.isTheme()) {
          results.push(pack);
        }
      }
      return results;
    };

    ThemeManager.prototype.activatePackages = function() {
      return this.activateThemes();
    };


    /*
    Section: Managing Enabled Themes
     */

    ThemeManager.prototype.warnForNonExistentThemes = function() {
      var i, len, ref1, results, themeName, themeNames;
      themeNames = (ref1 = this.config.get('core.themes')) != null ? ref1 : [];
      if (!_.isArray(themeNames)) {
        themeNames = [themeNames];
      }
      results = [];
      for (i = 0, len = themeNames.length; i < len; i++) {
        themeName = themeNames[i];
        if (!(themeName && typeof themeName === 'string' && this.packageManager.resolvePackagePath(themeName))) {
          results.push(console.warn("Enabled theme '" + themeName + "' is not installed."));
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    ThemeManager.prototype.getEnabledThemeNames = function() {
      var builtInThemeNames, ref1, themeNames;
      themeNames = (ref1 = this.config.get('core.themes')) != null ? ref1 : [];
      if (!_.isArray(themeNames)) {
        themeNames = [themeNames];
      }
      themeNames = themeNames.filter((function(_this) {
        return function(themeName) {
          if (themeName && typeof themeName === 'string') {
            if (_this.packageManager.resolvePackagePath(themeName)) {
              return true;
            }
          }
          return false;
        };
      })(this));
      if (themeNames.length < 2) {
        builtInThemeNames = ['atom-dark-syntax', 'atom-dark-ui', 'atom-light-syntax', 'atom-light-ui', 'base16-tomorrow-dark-theme', 'base16-tomorrow-light-theme', 'solarized-dark-syntax', 'solarized-light-syntax'];
        themeNames = _.intersection(themeNames, builtInThemeNames);
        if (themeNames.length === 0) {
          themeNames = ['atom-dark-syntax', 'atom-dark-ui'];
        } else if (themeNames.length === 1) {
          if (_.endsWith(themeNames[0], '-ui')) {
            themeNames.unshift('atom-dark-syntax');
          } else {
            themeNames.push('atom-dark-ui');
          }
        }
      }
      return themeNames.reverse();
    };


    /*
    Section: Private
     */

    ThemeManager.prototype.requireStylesheet = function(stylesheetPath, priority, skipDeprecatedSelectorsTransformation) {
      var content, fullPath;
      if (fullPath = this.resolveStylesheet(stylesheetPath)) {
        content = this.loadStylesheet(fullPath);
        return this.applyStylesheet(fullPath, content, priority, skipDeprecatedSelectorsTransformation);
      } else {
        throw new Error("Could not find a file at path '" + stylesheetPath + "'");
      }
    };

    ThemeManager.prototype.unwatchUserStylesheet = function() {
      var ref1, ref2;
      if ((ref1 = this.userStylsheetSubscriptions) != null) {
        ref1.dispose();
      }
      this.userStylsheetSubscriptions = null;
      this.userStylesheetFile = null;
      if ((ref2 = this.userStyleSheetDisposable) != null) {
        ref2.dispose();
      }
      return this.userStyleSheetDisposable = null;
    };

    ThemeManager.prototype.loadUserStylesheet = function() {
      var error, message, reloadStylesheet, userStylesheetContents, userStylesheetPath;
      this.unwatchUserStylesheet();
      userStylesheetPath = this.styleManager.getUserStyleSheetPath();
      if (!fs.isFileSync(userStylesheetPath)) {
        return;
      }
      try {
        this.userStylesheetFile = new File(userStylesheetPath);
        this.userStylsheetSubscriptions = new CompositeDisposable();
        reloadStylesheet = (function(_this) {
          return function() {
            return _this.loadUserStylesheet();
          };
        })(this);
        this.userStylsheetSubscriptions.add(this.userStylesheetFile.onDidChange(reloadStylesheet));
        this.userStylsheetSubscriptions.add(this.userStylesheetFile.onDidRename(reloadStylesheet));
        this.userStylsheetSubscriptions.add(this.userStylesheetFile.onDidDelete(reloadStylesheet));
      } catch (error1) {
        error = error1;
        message = "Unable to watch path: `" + (path.basename(userStylesheetPath)) + "`. Make sure\nyou have permissions to `" + userStylesheetPath + "`.\n\nOn linux there are currently problems with watch sizes. See\n[this document][watches] for more info.\n[watches]:https://github.com/atom/atom/blob/master/docs/build-instructions/linux.md#typeerror-unable-to-watch-path";
        this.notificationManager.addError(message, {
          dismissable: true
        });
      }
      try {
        userStylesheetContents = this.loadStylesheet(userStylesheetPath, true);
      } catch (error1) {
        return;
      }
      return this.userStyleSheetDisposable = this.styleManager.addStyleSheet(userStylesheetContents, {
        sourcePath: userStylesheetPath,
        priority: 2
      });
    };

    ThemeManager.prototype.loadBaseStylesheets = function() {
      return this.reloadBaseStylesheets();
    };

    ThemeManager.prototype.reloadBaseStylesheets = function() {
      return this.requireStylesheet('../static/atom', -2, true);
    };

    ThemeManager.prototype.stylesheetElementForId = function(id) {
      var escapedId;
      escapedId = id.replace(/\\/g, '\\\\');
      return document.head.querySelector("atom-styles style[source-path=\"" + escapedId + "\"]");
    };

    ThemeManager.prototype.resolveStylesheet = function(stylesheetPath) {
      if (path.extname(stylesheetPath).length > 0) {
        return fs.resolveOnLoadPath(stylesheetPath);
      } else {
        return fs.resolveOnLoadPath(stylesheetPath, ['css', 'less']);
      }
    };

    ThemeManager.prototype.loadStylesheet = function(stylesheetPath, importFallbackVariables) {
      if (path.extname(stylesheetPath) === '.less') {
        return this.loadLessStylesheet(stylesheetPath, importFallbackVariables);
      } else {
        return fs.readFileSync(stylesheetPath, 'utf8');
      }
    };

    ThemeManager.prototype.loadLessStylesheet = function(lessStylesheetPath, importFallbackVariables) {
      var baseVarImports, content, detail, digest, error, lessSource, message, relativeFilePath;
      if (importFallbackVariables == null) {
        importFallbackVariables = false;
      }
      if (this.lessCache == null) {
        this.lessCache = new LessCompileCache({
          resourcePath: this.resourcePath,
          lessSourcesByRelativeFilePath: this.lessSourcesByRelativeFilePath,
          importedFilePathsByRelativeImportPath: this.importedFilePathsByRelativeImportPath,
          importPaths: this.getImportPaths()
        });
      }
      try {
        if (importFallbackVariables) {
          baseVarImports = "@import \"variables/ui-variables\";\n@import \"variables/syntax-variables\";";
          relativeFilePath = path.relative(this.resourcePath, lessStylesheetPath);
          lessSource = this.lessSourcesByRelativeFilePath[relativeFilePath];
          if (lessSource != null) {
            content = lessSource.content;
            digest = lessSource.digest;
          } else {
            content = baseVarImports + '\n' + fs.readFileSync(lessStylesheetPath, 'utf8');
            digest = null;
          }
          return this.lessCache.cssForFile(lessStylesheetPath, content, digest);
        } else {
          return this.lessCache.read(lessStylesheetPath);
        }
      } catch (error1) {
        error = error1;
        error.less = true;
        if (error.line != null) {
          if (importFallbackVariables) {
            error.line -= 2;
          }
          message = "Error compiling Less stylesheet: `" + lessStylesheetPath + "`";
          detail = "Line number: " + error.line + "\n" + error.message;
        } else {
          message = "Error loading Less stylesheet: `" + lessStylesheetPath + "`";
          detail = error.message;
        }
        this.notificationManager.addError(message, {
          detail: detail,
          dismissable: true
        });
        throw error;
      }
    };

    ThemeManager.prototype.removeStylesheet = function(stylesheetPath) {
      var ref1;
      return (ref1 = this.styleSheetDisposablesBySourcePath[stylesheetPath]) != null ? ref1.dispose() : void 0;
    };

    ThemeManager.prototype.applyStylesheet = function(path, text, priority, skipDeprecatedSelectorsTransformation) {
      return this.styleSheetDisposablesBySourcePath[path] = this.styleManager.addStyleSheet(text, {
        priority: priority,
        skipDeprecatedSelectorsTransformation: skipDeprecatedSelectorsTransformation,
        sourcePath: path
      });
    };

    ThemeManager.prototype.activateThemes = function() {
      return new Promise((function(_this) {
        return function(resolve) {
          return _this.config.observe('core.themes', function() {
            var i, len, promises, ref1, themeName;
            _this.deactivateThemes();
            _this.warnForNonExistentThemes();
            _this.refreshLessCache();
            promises = [];
            ref1 = _this.getEnabledThemeNames();
            for (i = 0, len = ref1.length; i < len; i++) {
              themeName = ref1[i];
              if (_this.packageManager.resolvePackagePath(themeName)) {
                promises.push(_this.packageManager.activatePackage(themeName));
              } else {
                console.warn("Failed to activate theme '" + themeName + "' because it isn't installed.");
              }
            }
            return Promise.all(promises).then(function() {
              _this.addActiveThemeClasses();
              _this.refreshLessCache();
              _this.loadUserStylesheet();
              _this.reloadBaseStylesheets();
              _this.initialLoadComplete = true;
              _this.emitter.emit('did-change-active-themes');
              return resolve();
            });
          });
        };
      })(this));
    };

    ThemeManager.prototype.deactivateThemes = function() {
      var i, len, pack, ref1;
      this.removeActiveThemeClasses();
      this.unwatchUserStylesheet();
      ref1 = this.getActiveThemes();
      for (i = 0, len = ref1.length; i < len; i++) {
        pack = ref1[i];
        this.packageManager.deactivatePackage(pack.name);
      }
      return null;
    };

    ThemeManager.prototype.isInitialLoadComplete = function() {
      return this.initialLoadComplete;
    };

    ThemeManager.prototype.addActiveThemeClasses = function() {
      var i, len, pack, ref1, workspaceElement;
      if (workspaceElement = this.viewRegistry.getView(this.workspace)) {
        ref1 = this.getActiveThemes();
        for (i = 0, len = ref1.length; i < len; i++) {
          pack = ref1[i];
          workspaceElement.classList.add("theme-" + pack.name);
        }
      }
    };

    ThemeManager.prototype.removeActiveThemeClasses = function() {
      var i, len, pack, ref1, workspaceElement;
      workspaceElement = this.viewRegistry.getView(this.workspace);
      ref1 = this.getActiveThemes();
      for (i = 0, len = ref1.length; i < len; i++) {
        pack = ref1[i];
        workspaceElement.classList.remove("theme-" + pack.name);
      }
    };

    ThemeManager.prototype.refreshLessCache = function() {
      var ref1;
      return (ref1 = this.lessCache) != null ? ref1.setImportPaths(this.getImportPaths()) : void 0;
    };

    ThemeManager.prototype.getImportPaths = function() {
      var activeThemes, deprecatedPath, i, len, ref1, theme, themeName, themePath, themePaths;
      activeThemes = this.getActiveThemes();
      if (activeThemes.length > 0) {
        themePaths = (function() {
          var i, len, results;
          results = [];
          for (i = 0, len = activeThemes.length; i < len; i++) {
            theme = activeThemes[i];
            if (theme) {
              results.push(theme.getStylesheetsPath());
            }
          }
          return results;
        })();
      } else {
        themePaths = [];
        ref1 = this.getEnabledThemeNames();
        for (i = 0, len = ref1.length; i < len; i++) {
          themeName = ref1[i];
          if (themePath = this.packageManager.resolvePackagePath(themeName)) {
            deprecatedPath = path.join(themePath, 'stylesheets');
            if (fs.isDirectorySync(deprecatedPath)) {
              themePaths.push(deprecatedPath);
            } else {
              themePaths.push(path.join(themePath, 'styles'));
            }
          }
        }
      }
      return themePaths.filter(function(themePath) {
        return fs.isDirectorySync(themePath);
      });
    };

    return ThemeManager;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3RoZW1lLW1hbmFnZXIuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQSxJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7O0VBQ1AsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxpQkFBUjs7RUFDSixNQUFpQyxPQUFBLENBQVEsV0FBUixDQUFqQyxFQUFDLHFCQUFELEVBQVU7O0VBQ1QsT0FBUSxPQUFBLENBQVEsYUFBUjs7RUFDVCxFQUFBLEdBQUssT0FBQSxDQUFRLFNBQVI7O0VBQ0wsZ0JBQUEsR0FBbUIsT0FBQSxDQUFRLHNCQUFSOztFQUtuQixNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1Msc0JBQUMsR0FBRDtNQUFFLElBQUMsQ0FBQSxxQkFBQSxnQkFBZ0IsSUFBQyxDQUFBLGFBQUEsUUFBUSxJQUFDLENBQUEsbUJBQUEsY0FBYyxJQUFDLENBQUEsMEJBQUEscUJBQXFCLElBQUMsQ0FBQSxtQkFBQTtNQUM3RSxJQUFDLENBQUEsT0FBRCxHQUFXLElBQUk7TUFDZixJQUFDLENBQUEsaUNBQUQsR0FBcUM7TUFDckMsSUFBQyxDQUFBLFNBQUQsR0FBYTtNQUNiLElBQUMsQ0FBQSxtQkFBRCxHQUF1QjtNQUN2QixJQUFDLENBQUEsY0FBYyxDQUFDLHdCQUFoQixDQUF5QyxJQUF6QyxFQUErQyxDQUFDLE9BQUQsQ0FBL0M7TUFDQSxJQUFDLENBQUEsY0FBYyxDQUFDLDRCQUFoQixDQUE2QyxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUE7aUJBQzNDLEtBQUMsQ0FBQSx1QkFBRCxDQUF5QixTQUFBO21CQUFHLEtBQUMsQ0FBQSxjQUFjLENBQUMsOEJBQWhCLENBQUE7VUFBSCxDQUF6QjtRQUQyQztNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBN0M7SUFOVzs7MkJBU2IsVUFBQSxHQUFZLFNBQUMsR0FBRDtBQUNW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QSxzQ0FBQTs7UUFDRSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsTUFBM0IsQ0FBa0MsUUFBQSxHQUFTLElBQUksQ0FBQyxJQUFoRDtBQURGO0lBRndCOzsyQkFNMUIsZ0JBQUEsR0FBa0IsU0FBQTtBQUNoQixVQUFBO21EQUFVLENBQUUsY0FBWixDQUEyQixJQUFDLENBQUEsY0FBRCxDQUFBLENBQTNCO0lBRGdCOzsyQkFHbEIsY0FBQSxHQUFnQixTQUFBO0FBQ2QsVUFBQTtNQUFBLFlBQUEsR0FBZSxJQUFDLENBQUEsZUFBRCxDQUFBO01BQ2YsSUFBRyxZQUFZLENBQUMsTUFBYixHQUFzQixDQUF6QjtRQUNFLFVBQUE7O0FBQWM7ZUFBQSw4Q0FBQTs7Z0JBQTBEOzJCQUExRCxLQUFLLENBQUMsa0JBQU4sQ0FBQTs7QUFBQTs7YUFEaEI7T0FBQSxNQUFBO1FBR0UsVUFBQSxHQUFhO0FBQ2I7QUFBQSxhQUFBLHNDQUFBOztVQUNFLElBQUcsU0FBQSxHQUFZLElBQUMsQ0FBQSxjQUFjLENBQUMsa0JBQWhCLENBQW1DLFNBQW5DLENBQWY7WUFDRSxjQUFBLEdBQWlCLElBQUksQ0FBQyxJQUFMLENBQVUsU0FBVixFQUFxQixhQUFyQjtZQUNqQixJQUFHLEVBQUUsQ0FBQyxlQUFILENBQW1CLGNBQW5CLENBQUg7Y0FDRSxVQUFVLENBQUMsSUFBWCxDQUFnQixjQUFoQixFQURGO2FBQUEsTUFBQTtjQUdFLFVBQVUsQ0FBQyxJQUFYLENBQWdCLElBQUksQ0FBQyxJQUFMLENBQVUsU0FBVixFQUFxQixRQUFyQixDQUFoQixFQUhGO2FBRkY7O0FBREYsU0FKRjs7YUFZQSxVQUFVLENBQUMsTUFBWCxDQUFrQixTQUFDLFNBQUQ7ZUFBZSxFQUFFLENBQUMsZUFBSCxDQUFtQixTQUFuQjtNQUFmLENBQWxCO0lBZGM7Ozs7O0FBclRsQiIsInNvdXJjZXNDb250ZW50IjpbInBhdGggPSByZXF1aXJlICdwYXRoJ1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbntFbWl0dGVyLCBDb21wb3NpdGVEaXNwb3NhYmxlfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcbntGaWxlfSA9IHJlcXVpcmUgJ3BhdGh3YXRjaGVyJ1xuZnMgPSByZXF1aXJlICdmcy1wbHVzJ1xuTGVzc0NvbXBpbGVDYWNoZSA9IHJlcXVpcmUgJy4vbGVzcy1jb21waWxlLWNhY2hlJ1xuXG4jIEV4dGVuZGVkOiBIYW5kbGVzIGxvYWRpbmcgYW5kIGFjdGl2YXRpbmcgYXZhaWxhYmxlIHRoZW1lcy5cbiNcbiMgQW4gaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcyBpcyBhbHdheXMgYXZhaWxhYmxlIGFzIHRoZSBgYXRvbS50aGVtZXNgIGdsb2JhbC5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIFRoZW1lTWFuYWdlclxuICBjb25zdHJ1Y3RvcjogKHtAcGFja2FnZU1hbmFnZXIsIEBjb25maWcsIEBzdHlsZU1hbmFnZXIsIEBub3RpZmljYXRpb25NYW5hZ2VyLCBAdmlld1JlZ2lzdHJ5fSkgLT5cbiAgICBAZW1pdHRlciA9IG5ldyBFbWl0dGVyXG4gICAgQHN0eWxlU2hlZXREaXNwb3NhYmxlc0J5U291cmNlUGF0aCA9IHt9XG4gICAgQGxlc3NDYWNoZSA9IG51bGxcbiAgICBAaW5pdGlhbExvYWRDb21wbGV0ZSA9IGZhbHNlXG4gICAgQHBhY2thZ2VNYW5hZ2VyLnJlZ2lzdGVyUGFja2FnZUFjdGl2YXRvcih0aGlzLCBbJ3RoZW1lJ10pXG4gICAgQHBhY2thZ2VNYW5hZ2VyLm9uRGlkQWN0aXZhdGVJbml0aWFsUGFja2FnZXMgPT5cbiAgICAgIEBvbkRpZENoYW5nZUFjdGl2ZVRoZW1lcyA9PiBAcGFja2FnZU1hbmFnZXIucmVsb2FkQWN0aXZlUGFja2FnZVN0eWxlU2hlZXRzKClcblxuICBpbml0aWFsaXplOiAoe0ByZXNvdXJjZVBhdGgsIEBjb25maWdEaXJQYXRoLCBAc2FmZU1vZGUsIGRldk1vZGV9KSAtPlxuICAgIEBsZXNzU291cmNlc0J5UmVsYXRpdmVGaWxlUGF0aCA9IG51bGxcbiAgICBpZiBkZXZNb2RlIG9yIHR5cGVvZiBzbmFwc2hvdEF1eGlsaWFyeURhdGEgaXMgJ3VuZGVmaW5lZCdcbiAgICAgIEBsZXNzU291cmNlc0J5UmVsYXRpdmVGaWxlUGF0aCA9IHt9XG4gICAgICBAaW1wb3J0ZWRGaWxlUGF0aHNCeVJlbGF0aXZlSW1wb3J0UGF0aCA9IHt9XG4gICAgZWxzZVxuICAgICAgQGxlc3NTb3VyY2VzQnlSZWxhdGl2ZUZpbGVQYXRoID0gc25hcHNob3RBdXhpbGlhcnlEYXRhLmxlc3NTb3VyY2VzQnlSZWxhdGl2ZUZpbGVQYXRoXG4gICAgICBAaW1wb3J0ZWRGaWxlUGF0aHNCeVJlbGF0aXZlSW1wb3J0UGF0aCA9IHNuYXBzaG90QXV4aWxpYXJ5RGF0YS5pbXBvcnRlZEZpbGVQYXRoc0J5UmVsYXRpdmVJbXBvcnRQYXRoXG5cbiAgIyMjXG4gIFNlY3Rpb246IEV2ZW50IFN1YnNjcmlwdGlvblxuICAjIyNcblxuICAjIEVzc2VudGlhbDogSW52b2tlIGBjYWxsYmFja2Agd2hlbiBzdHlsZSBzaGVldCBjaGFuZ2VzIGFzc29jaWF0ZWQgd2l0aFxuICAjIHVwZGF0aW5nIHRoZSBsaXN0IG9mIGFjdGl2ZSB0aGVtZXMgaGF2ZSBjb21wbGV0ZWQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICBvbkRpZENoYW5nZUFjdGl2ZVRoZW1lczogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLWFjdGl2ZS10aGVtZXMnLCBjYWxsYmFja1xuXG4gICMjI1xuICBTZWN0aW9uOiBBY2Nlc3NpbmcgQXZhaWxhYmxlIFRoZW1lc1xuICAjIyNcblxuICBnZXRBdmFpbGFibGVOYW1lczogLT5cbiAgICAjIFRPRE86IE1heWJlIHNob3VsZCBjaGFuZ2UgdG8gbGlzdCBhbGwgdGhlIGF2YWlsYWJsZSB0aGVtZXMgb3V0IHRoZXJlP1xuICAgIEBnZXRMb2FkZWROYW1lcygpXG5cbiAgIyMjXG4gIFNlY3Rpb246IEFjY2Vzc2luZyBMb2FkZWQgVGhlbWVzXG4gICMjI1xuXG4gICMgUHVibGljOiBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge1N0cmluZ31zIG9mIGFsbCB0aGUgbG9hZGVkIHRoZW1lIG5hbWVzLlxuICBnZXRMb2FkZWRUaGVtZU5hbWVzOiAtPlxuICAgIHRoZW1lLm5hbWUgZm9yIHRoZW1lIGluIEBnZXRMb2FkZWRUaGVtZXMoKVxuXG4gICMgUHVibGljOiBSZXR1cm5zIGFuIHtBcnJheX0gb2YgYWxsIHRoZSBsb2FkZWQgdGhlbWVzLlxuICBnZXRMb2FkZWRUaGVtZXM6IC0+XG4gICAgcGFjayBmb3IgcGFjayBpbiBAcGFja2FnZU1hbmFnZXIuZ2V0TG9hZGVkUGFja2FnZXMoKSB3aGVuIHBhY2suaXNUaGVtZSgpXG5cbiAgIyMjXG4gIFNlY3Rpb246IEFjY2Vzc2luZyBBY3RpdmUgVGhlbWVzXG4gICMjI1xuXG4gICMgUHVibGljOiBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge1N0cmluZ31zIGFsbCB0aGUgYWN0aXZlIHRoZW1lIG5hbWVzLlxuICBnZXRBY3RpdmVUaGVtZU5hbWVzOiAtPlxuICAgIHRoZW1lLm5hbWUgZm9yIHRoZW1lIGluIEBnZXRBY3RpdmVUaGVtZXMoKVxuXG4gICMgUHVibGljOiBSZXR1cm5zIGFuIHtBcnJheX0gb2YgYWxsIHRoZSBhY3RpdmUgdGhlbWVzLlxuICBnZXRBY3RpdmVUaGVtZXM6IC0+XG4gICAgcGFjayBmb3IgcGFjayBpbiBAcGFja2FnZU1hbmFnZXIuZ2V0QWN0aXZlUGFja2FnZXMoKSB3aGVuIHBhY2suaXNUaGVtZSgpXG5cbiAgYWN0aXZhdGVQYWNrYWdlczogLT4gQGFjdGl2YXRlVGhlbWVzKClcblxuICAjIyNcbiAgU2VjdGlvbjogTWFuYWdpbmcgRW5hYmxlZCBUaGVtZXNcbiAgIyMjXG5cbiAgd2FybkZvck5vbkV4aXN0ZW50VGhlbWVzOiAtPlxuICAgIHRoZW1lTmFtZXMgPSBAY29uZmlnLmdldCgnY29yZS50aGVtZXMnKSA/IFtdXG4gICAgdGhlbWVOYW1lcyA9IFt0aGVtZU5hbWVzXSB1bmxlc3MgXy5pc0FycmF5KHRoZW1lTmFtZXMpXG4gICAgZm9yIHRoZW1lTmFtZSBpbiB0aGVtZU5hbWVzXG4gICAgICB1bmxlc3MgdGhlbWVOYW1lIGFuZCB0eXBlb2YgdGhlbWVOYW1lIGlzICdzdHJpbmcnIGFuZCBAcGFja2FnZU1hbmFnZXIucmVzb2x2ZVBhY2thZ2VQYXRoKHRoZW1lTmFtZSlcbiAgICAgICAgY29uc29sZS53YXJuKFwiRW5hYmxlZCB0aGVtZSAnI3t0aGVtZU5hbWV9JyBpcyBub3QgaW5zdGFsbGVkLlwiKVxuXG4gICMgUHVibGljOiBHZXQgdGhlIGVuYWJsZWQgdGhlbWUgbmFtZXMgZnJvbSB0aGUgY29uZmlnLlxuICAjXG4gICMgUmV0dXJucyBhbiBhcnJheSBvZiB0aGVtZSBuYW1lcyBpbiB0aGUgb3JkZXIgdGhhdCB0aGV5IHNob3VsZCBiZSBhY3RpdmF0ZWQuXG4gIGdldEVuYWJsZWRUaGVtZU5hbWVzOiAtPlxuICAgIHRoZW1lTmFtZXMgPSBAY29uZmlnLmdldCgnY29yZS50aGVtZXMnKSA/IFtdXG4gICAgdGhlbWVOYW1lcyA9IFt0aGVtZU5hbWVzXSB1bmxlc3MgXy5pc0FycmF5KHRoZW1lTmFtZXMpXG4gICAgdGhlbWVOYW1lcyA9IHRoZW1lTmFtZXMuZmlsdGVyICh0aGVtZU5hbWUpID0+XG4gICAgICBpZiB0aGVtZU5hbWUgYW5kIHR5cGVvZiB0aGVtZU5hbWUgaXMgJ3N0cmluZydcbiAgICAgICAgcmV0dXJuIHRydWUgaWYgQHBhY2thZ2VNYW5hZ2VyLnJlc29sdmVQYWNrYWdlUGF0aCh0aGVtZU5hbWUpXG4gICAgICBmYWxzZVxuXG4gICAgIyBVc2UgYSBidWlsdC1pbiBzeW50YXggYW5kIFVJIHRoZW1lIGFueSB0aW1lIHRoZSBjb25maWd1cmVkIHRoZW1lcyBhcmUgbm90XG4gICAgIyBhdmFpbGFibGUuXG4gICAgaWYgdGhlbWVOYW1lcy5sZW5ndGggPCAyXG4gICAgICBidWlsdEluVGhlbWVOYW1lcyA9IFtcbiAgICAgICAgJ2F0b20tZGFyay1zeW50YXgnXG4gICAgICAgICdhdG9tLWRhcmstdWknXG4gICAgICAgICdhdG9tLWxpZ2h0LXN5bnRheCdcbiAgICAgICAgJ2F0b20tbGlnaHQtdWknXG4gICAgICAgICdiYXNlMTYtdG9tb3Jyb3ctZGFyay10aGVtZSdcbiAgICAgICAgJ2Jhc2UxNi10b21vcnJvdy1saWdodC10aGVtZSdcbiAgICAgICAgJ3NvbGFyaXplZC1kYXJrLXN5bnRheCdcbiAgICAgICAgJ3NvbGFyaXplZC1saWdodC1zeW50YXgnXG4gICAgICBdXG4gICAgICB0aGVtZU5hbWVzID0gXy5pbnRlcnNlY3Rpb24odGhlbWVOYW1lcywgYnVpbHRJblRoZW1lTmFtZXMpXG4gICAgICBpZiB0aGVtZU5hbWVzLmxlbmd0aCBpcyAwXG4gICAgICAgIHRoZW1lTmFtZXMgPSBbJ2F0b20tZGFyay1zeW50YXgnLCAnYXRvbS1kYXJrLXVpJ11cbiAgICAgIGVsc2UgaWYgdGhlbWVOYW1lcy5sZW5ndGggaXMgMVxuICAgICAgICBpZiBfLmVuZHNXaXRoKHRoZW1lTmFtZXNbMF0sICctdWknKVxuICAgICAgICAgIHRoZW1lTmFtZXMudW5zaGlmdCgnYXRvbS1kYXJrLXN5bnRheCcpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICB0aGVtZU5hbWVzLnB1c2goJ2F0b20tZGFyay11aScpXG5cbiAgICAjIFJldmVyc2Ugc28gdGhlIGZpcnN0ICh0b3ApIHRoZW1lIGlzIGxvYWRlZCBhZnRlciB0aGUgb3RoZXJzLiBXZSB3YW50XG4gICAgIyB0aGUgZmlyc3QvdG9wIHRoZW1lIHRvIG92ZXJyaWRlIGxhdGVyIHRoZW1lcyBpbiB0aGUgc3RhY2suXG4gICAgdGhlbWVOYW1lcy5yZXZlcnNlKClcblxuICAjIyNcbiAgU2VjdGlvbjogUHJpdmF0ZVxuICAjIyNcblxuICAjIFJlc29sdmUgYW5kIGFwcGx5IHRoZSBzdHlsZXNoZWV0IHNwZWNpZmllZCBieSB0aGUgcGF0aC5cbiAgI1xuICAjIFRoaXMgc3VwcG9ydHMgYm90aCBDU1MgYW5kIExlc3Mgc3R5bHNoZWV0cy5cbiAgI1xuICAjICogYHN0eWxlc2hlZXRQYXRoYCBBIHtTdHJpbmd9IHBhdGggdG8gdGhlIHN0eWxlc2hlZXQgdGhhdCBjYW4gYmUgYW4gYWJzb2x1dGVcbiAgIyAgIHBhdGggb3IgYSByZWxhdGl2ZSBwYXRoIHRoYXQgd2lsbCBiZSByZXNvbHZlZCBhZ2FpbnN0IHRoZSBsb2FkIHBhdGguXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHJlbW92ZSB0aGVcbiAgIyByZXF1aXJlZCBzdHlsZXNoZWV0LlxuICByZXF1aXJlU3R5bGVzaGVldDogKHN0eWxlc2hlZXRQYXRoLCBwcmlvcml0eSwgc2tpcERlcHJlY2F0ZWRTZWxlY3RvcnNUcmFuc2Zvcm1hdGlvbikgLT5cbiAgICBpZiBmdWxsUGF0aCA9IEByZXNvbHZlU3R5bGVzaGVldChzdHlsZXNoZWV0UGF0aClcbiAgICAgIGNvbnRlbnQgPSBAbG9hZFN0eWxlc2hlZXQoZnVsbFBhdGgpXG4gICAgICBAYXBwbHlTdHlsZXNoZWV0KGZ1bGxQYXRoLCBjb250ZW50LCBwcmlvcml0eSwgc2tpcERlcHJlY2F0ZWRTZWxlY3RvcnNUcmFuc2Zvcm1hdGlvbilcbiAgICBlbHNlXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgZmluZCBhIGZpbGUgYXQgcGF0aCAnI3tzdHlsZXNoZWV0UGF0aH0nXCIpXG5cbiAgdW53YXRjaFVzZXJTdHlsZXNoZWV0OiAtPlxuICAgIEB1c2VyU3R5bHNoZWV0U3Vic2NyaXB0aW9ucz8uZGlzcG9zZSgpXG4gICAgQHVzZXJTdHlsc2hlZXRTdWJzY3JpcHRpb25zID0gbnVsbFxuICAgIEB1c2VyU3R5bGVzaGVldEZpbGUgPSBudWxsXG4gICAgQHVzZXJTdHlsZVNoZWV0RGlzcG9zYWJsZT8uZGlzcG9zZSgpXG4gICAgQHVzZXJTdHlsZVNoZWV0RGlzcG9zYWJsZSA9IG51bGxcblxuICBsb2FkVXNlclN0eWxlc2hlZXQ6IC0+XG4gICAgQHVud2F0Y2hVc2VyU3R5bGVzaGVldCgpXG5cbiAgICB1c2VyU3R5bGVzaGVldFBhdGggPSBAc3R5bGVNYW5hZ2VyLmdldFVzZXJTdHlsZVNoZWV0UGF0aCgpXG4gICAgcmV0dXJuIHVubGVzcyBmcy5pc0ZpbGVTeW5jKHVzZXJTdHlsZXNoZWV0UGF0aClcblxuICAgIHRyeVxuICAgICAgQHVzZXJTdHlsZXNoZWV0RmlsZSA9IG5ldyBGaWxlKHVzZXJTdHlsZXNoZWV0UGF0aClcbiAgICAgIEB1c2VyU3R5bHNoZWV0U3Vic2NyaXB0aW9ucyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKClcbiAgICAgIHJlbG9hZFN0eWxlc2hlZXQgPSA9PiBAbG9hZFVzZXJTdHlsZXNoZWV0KClcbiAgICAgIEB1c2VyU3R5bHNoZWV0U3Vic2NyaXB0aW9ucy5hZGQoQHVzZXJTdHlsZXNoZWV0RmlsZS5vbkRpZENoYW5nZShyZWxvYWRTdHlsZXNoZWV0KSlcbiAgICAgIEB1c2VyU3R5bHNoZWV0U3Vic2NyaXB0aW9ucy5hZGQoQHVzZXJTdHlsZXNoZWV0RmlsZS5vbkRpZFJlbmFtZShyZWxvYWRTdHlsZXNoZWV0KSlcbiAgICAgIEB1c2VyU3R5bHNoZWV0U3Vic2NyaXB0aW9ucy5hZGQoQHVzZXJTdHlsZXNoZWV0RmlsZS5vbkRpZERlbGV0ZShyZWxvYWRTdHlsZXNoZWV0KSlcbiAgICBjYXRjaCBlcnJvclxuICAgICAgbWVzc2FnZSA9IFwiXCJcIlxuICAgICAgICBVbmFibGUgdG8gd2F0Y2ggcGF0aDogYCN7cGF0aC5iYXNlbmFtZSh1c2VyU3R5bGVzaGVldFBhdGgpfWAuIE1ha2Ugc3VyZVxuICAgICAgICB5b3UgaGF2ZSBwZXJtaXNzaW9ucyB0byBgI3t1c2VyU3R5bGVzaGVldFBhdGh9YC5cblxuICAgICAgICBPbiBsaW51eCB0aGVyZSBhcmUgY3VycmVudGx5IHByb2JsZW1zIHdpdGggd2F0Y2ggc2l6ZXMuIFNlZVxuICAgICAgICBbdGhpcyBkb2N1bWVudF1bd2F0Y2hlc10gZm9yIG1vcmUgaW5mby5cbiAgICAgICAgW3dhdGNoZXNdOmh0dHBzOi8vZ2l0aHViLmNvbS9hdG9tL2F0b20vYmxvYi9tYXN0ZXIvZG9jcy9idWlsZC1pbnN0cnVjdGlvbnMvbGludXgubWQjdHlwZWVycm9yLXVuYWJsZS10by13YXRjaC1wYXRoXG4gICAgICBcIlwiXCJcbiAgICAgIEBub3RpZmljYXRpb25NYW5hZ2VyLmFkZEVycm9yKG1lc3NhZ2UsIGRpc21pc3NhYmxlOiB0cnVlKVxuXG4gICAgdHJ5XG4gICAgICB1c2VyU3R5bGVzaGVldENvbnRlbnRzID0gQGxvYWRTdHlsZXNoZWV0KHVzZXJTdHlsZXNoZWV0UGF0aCwgdHJ1ZSlcbiAgICBjYXRjaFxuICAgICAgcmV0dXJuXG5cbiAgICBAdXNlclN0eWxlU2hlZXREaXNwb3NhYmxlID0gQHN0eWxlTWFuYWdlci5hZGRTdHlsZVNoZWV0KHVzZXJTdHlsZXNoZWV0Q29udGVudHMsIHNvdXJjZVBhdGg6IHVzZXJTdHlsZXNoZWV0UGF0aCwgcHJpb3JpdHk6IDIpXG5cbiAgbG9hZEJhc2VTdHlsZXNoZWV0czogLT5cbiAgICBAcmVsb2FkQmFzZVN0eWxlc2hlZXRzKClcblxuICByZWxvYWRCYXNlU3R5bGVzaGVldHM6IC0+XG4gICAgQHJlcXVpcmVTdHlsZXNoZWV0KCcuLi9zdGF0aWMvYXRvbScsIC0yLCB0cnVlKVxuXG4gIHN0eWxlc2hlZXRFbGVtZW50Rm9ySWQ6IChpZCkgLT5cbiAgICBlc2NhcGVkSWQgPSBpZC5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpXG4gICAgZG9jdW1lbnQuaGVhZC5xdWVyeVNlbGVjdG9yKFwiYXRvbS1zdHlsZXMgc3R5bGVbc291cmNlLXBhdGg9XFxcIiN7ZXNjYXBlZElkfVxcXCJdXCIpXG5cbiAgcmVzb2x2ZVN0eWxlc2hlZXQ6IChzdHlsZXNoZWV0UGF0aCkgLT5cbiAgICBpZiBwYXRoLmV4dG5hbWUoc3R5bGVzaGVldFBhdGgpLmxlbmd0aCA+IDBcbiAgICAgIGZzLnJlc29sdmVPbkxvYWRQYXRoKHN0eWxlc2hlZXRQYXRoKVxuICAgIGVsc2VcbiAgICAgIGZzLnJlc29sdmVPbkxvYWRQYXRoKHN0eWxlc2hlZXRQYXRoLCBbJ2NzcycsICdsZXNzJ10pXG5cbiAgbG9hZFN0eWxlc2hlZXQ6IChzdHlsZXNoZWV0UGF0aCwgaW1wb3J0RmFsbGJhY2tWYXJpYWJsZXMpIC0+XG4gICAgaWYgcGF0aC5leHRuYW1lKHN0eWxlc2hlZXRQYXRoKSBpcyAnLmxlc3MnXG4gICAgICBAbG9hZExlc3NTdHlsZXNoZWV0KHN0eWxlc2hlZXRQYXRoLCBpbXBvcnRGYWxsYmFja1ZhcmlhYmxlcylcbiAgICBlbHNlXG4gICAgICBmcy5yZWFkRmlsZVN5bmMoc3R5bGVzaGVldFBhdGgsICd1dGY4JylcblxuICBsb2FkTGVzc1N0eWxlc2hlZXQ6IChsZXNzU3R5bGVzaGVldFBhdGgsIGltcG9ydEZhbGxiYWNrVmFyaWFibGVzPWZhbHNlKSAtPlxuICAgIEBsZXNzQ2FjaGUgPz0gbmV3IExlc3NDb21waWxlQ2FjaGUoe1xuICAgICAgQHJlc291cmNlUGF0aCxcbiAgICAgIEBsZXNzU291cmNlc0J5UmVsYXRpdmVGaWxlUGF0aCxcbiAgICAgIEBpbXBvcnRlZEZpbGVQYXRoc0J5UmVsYXRpdmVJbXBvcnRQYXRoLFxuICAgICAgaW1wb3J0UGF0aHM6IEBnZXRJbXBvcnRQYXRocygpXG4gICAgfSlcblxuICAgIHRyeVxuICAgICAgaWYgaW1wb3J0RmFsbGJhY2tWYXJpYWJsZXNcbiAgICAgICAgYmFzZVZhckltcG9ydHMgPSBcIlwiXCJcbiAgICAgICAgQGltcG9ydCBcInZhcmlhYmxlcy91aS12YXJpYWJsZXNcIjtcbiAgICAgICAgQGltcG9ydCBcInZhcmlhYmxlcy9zeW50YXgtdmFyaWFibGVzXCI7XG4gICAgICAgIFwiXCJcIlxuICAgICAgICByZWxhdGl2ZUZpbGVQYXRoID0gcGF0aC5yZWxhdGl2ZShAcmVzb3VyY2VQYXRoLCBsZXNzU3R5bGVzaGVldFBhdGgpXG4gICAgICAgIGxlc3NTb3VyY2UgPSBAbGVzc1NvdXJjZXNCeVJlbGF0aXZlRmlsZVBhdGhbcmVsYXRpdmVGaWxlUGF0aF1cbiAgICAgICAgaWYgbGVzc1NvdXJjZT9cbiAgICAgICAgICBjb250ZW50ID0gbGVzc1NvdXJjZS5jb250ZW50XG4gICAgICAgICAgZGlnZXN0ID0gbGVzc1NvdXJjZS5kaWdlc3RcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNvbnRlbnQgPSBiYXNlVmFySW1wb3J0cyArICdcXG4nICsgZnMucmVhZEZpbGVTeW5jKGxlc3NTdHlsZXNoZWV0UGF0aCwgJ3V0ZjgnKVxuICAgICAgICAgIGRpZ2VzdCA9IG51bGxcblxuICAgICAgICBAbGVzc0NhY2hlLmNzc0ZvckZpbGUobGVzc1N0eWxlc2hlZXRQYXRoLCBjb250ZW50LCBkaWdlc3QpXG4gICAgICBlbHNlXG4gICAgICAgIEBsZXNzQ2FjaGUucmVhZChsZXNzU3R5bGVzaGVldFBhdGgpXG4gICAgY2F0Y2ggZXJyb3JcbiAgICAgIGVycm9yLmxlc3MgPSB0cnVlXG4gICAgICBpZiBlcnJvci5saW5lP1xuICAgICAgICAjIEFkanVzdCBsaW5lIG51bWJlcnMgZm9yIGltcG9ydCBmYWxsYmFja3NcbiAgICAgICAgZXJyb3IubGluZSAtPSAyIGlmIGltcG9ydEZhbGxiYWNrVmFyaWFibGVzXG5cbiAgICAgICAgbWVzc2FnZSA9IFwiRXJyb3IgY29tcGlsaW5nIExlc3Mgc3R5bGVzaGVldDogYCN7bGVzc1N0eWxlc2hlZXRQYXRofWBcIlxuICAgICAgICBkZXRhaWwgPSBcIlwiXCJcbiAgICAgICAgICBMaW5lIG51bWJlcjogI3tlcnJvci5saW5lfVxuICAgICAgICAgICN7ZXJyb3IubWVzc2FnZX1cbiAgICAgICAgXCJcIlwiXG4gICAgICBlbHNlXG4gICAgICAgIG1lc3NhZ2UgPSBcIkVycm9yIGxvYWRpbmcgTGVzcyBzdHlsZXNoZWV0OiBgI3tsZXNzU3R5bGVzaGVldFBhdGh9YFwiXG4gICAgICAgIGRldGFpbCA9IGVycm9yLm1lc3NhZ2VcblxuICAgICAgQG5vdGlmaWNhdGlvbk1hbmFnZXIuYWRkRXJyb3IobWVzc2FnZSwge2RldGFpbCwgZGlzbWlzc2FibGU6IHRydWV9KVxuICAgICAgdGhyb3cgZXJyb3JcblxuICByZW1vdmVTdHlsZXNoZWV0OiAoc3R5bGVzaGVldFBhdGgpIC0+XG4gICAgQHN0eWxlU2hlZXREaXNwb3NhYmxlc0J5U291cmNlUGF0aFtzdHlsZXNoZWV0UGF0aF0/LmRpc3Bvc2UoKVxuXG4gIGFwcGx5U3R5bGVzaGVldDogKHBhdGgsIHRleHQsIHByaW9yaXR5LCBza2lwRGVwcmVjYXRlZFNlbGVjdG9yc1RyYW5zZm9ybWF0aW9uKSAtPlxuICAgIEBzdHlsZVNoZWV0RGlzcG9zYWJsZXNCeVNvdXJjZVBhdGhbcGF0aF0gPSBAc3R5bGVNYW5hZ2VyLmFkZFN0eWxlU2hlZXQoXG4gICAgICB0ZXh0LFxuICAgICAge1xuICAgICAgICBwcmlvcml0eSxcbiAgICAgICAgc2tpcERlcHJlY2F0ZWRTZWxlY3RvcnNUcmFuc2Zvcm1hdGlvbixcbiAgICAgICAgc291cmNlUGF0aDogcGF0aFxuICAgICAgfVxuICAgIClcblxuICBhY3RpdmF0ZVRoZW1lczogLT5cbiAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSkgPT5cbiAgICAgICMgQGNvbmZpZy5vYnNlcnZlIHJ1bnMgdGhlIGNhbGxiYWNrIG9uY2UsIHRoZW4gb24gc3Vic2VxdWVudCBjaGFuZ2VzLlxuICAgICAgQGNvbmZpZy5vYnNlcnZlICdjb3JlLnRoZW1lcycsID0+XG4gICAgICAgIEBkZWFjdGl2YXRlVGhlbWVzKClcblxuICAgICAgICBAd2FybkZvck5vbkV4aXN0ZW50VGhlbWVzKClcblxuICAgICAgICBAcmVmcmVzaExlc3NDYWNoZSgpICMgVXBkYXRlIGNhY2hlIGZvciBwYWNrYWdlcyBpbiBjb3JlLnRoZW1lcyBjb25maWdcblxuICAgICAgICBwcm9taXNlcyA9IFtdXG4gICAgICAgIGZvciB0aGVtZU5hbWUgaW4gQGdldEVuYWJsZWRUaGVtZU5hbWVzKClcbiAgICAgICAgICBpZiBAcGFja2FnZU1hbmFnZXIucmVzb2x2ZVBhY2thZ2VQYXRoKHRoZW1lTmFtZSlcbiAgICAgICAgICAgIHByb21pc2VzLnB1c2goQHBhY2thZ2VNYW5hZ2VyLmFjdGl2YXRlUGFja2FnZSh0aGVtZU5hbWUpKVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkZhaWxlZCB0byBhY3RpdmF0ZSB0aGVtZSAnI3t0aGVtZU5hbWV9JyBiZWNhdXNlIGl0IGlzbid0IGluc3RhbGxlZC5cIilcblxuICAgICAgICBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbiA9PlxuICAgICAgICAgIEBhZGRBY3RpdmVUaGVtZUNsYXNzZXMoKVxuICAgICAgICAgIEByZWZyZXNoTGVzc0NhY2hlKCkgIyBVcGRhdGUgY2FjaGUgYWdhaW4gbm93IHRoYXQgQGdldEFjdGl2ZVRoZW1lcygpIGlzIHBvcHVsYXRlZFxuICAgICAgICAgIEBsb2FkVXNlclN0eWxlc2hlZXQoKVxuICAgICAgICAgIEByZWxvYWRCYXNlU3R5bGVzaGVldHMoKVxuICAgICAgICAgIEBpbml0aWFsTG9hZENvbXBsZXRlID0gdHJ1ZVxuICAgICAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2UtYWN0aXZlLXRoZW1lcydcbiAgICAgICAgICByZXNvbHZlKClcblxuICBkZWFjdGl2YXRlVGhlbWVzOiAtPlxuICAgIEByZW1vdmVBY3RpdmVUaGVtZUNsYXNzZXMoKVxuICAgIEB1bndhdGNoVXNlclN0eWxlc2hlZXQoKVxuICAgIEBwYWNrYWdlTWFuYWdlci5kZWFjdGl2YXRlUGFja2FnZShwYWNrLm5hbWUpIGZvciBwYWNrIGluIEBnZXRBY3RpdmVUaGVtZXMoKVxuICAgIG51bGxcblxuICBpc0luaXRpYWxMb2FkQ29tcGxldGU6IC0+IEBpbml0aWFsTG9hZENvbXBsZXRlXG5cbiAgYWRkQWN0aXZlVGhlbWVDbGFzc2VzOiAtPlxuICAgIGlmIHdvcmtzcGFjZUVsZW1lbnQgPSBAdmlld1JlZ2lzdHJ5LmdldFZpZXcoQHdvcmtzcGFjZSlcbiAgICAgIGZvciBwYWNrIGluIEBnZXRBY3RpdmVUaGVtZXMoKVxuICAgICAgICB3b3Jrc3BhY2VFbGVtZW50LmNsYXNzTGlzdC5hZGQoXCJ0aGVtZS0je3BhY2submFtZX1cIilcbiAgICAgIHJldHVyblxuXG4gIHJlbW92ZUFjdGl2ZVRoZW1lQ2xhc3NlczogLT5cbiAgICB3b3Jrc3BhY2VFbGVtZW50ID0gQHZpZXdSZWdpc3RyeS5nZXRWaWV3KEB3b3Jrc3BhY2UpXG4gICAgZm9yIHBhY2sgaW4gQGdldEFjdGl2ZVRoZW1lcygpXG4gICAgICB3b3Jrc3BhY2VFbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoXCJ0aGVtZS0je3BhY2submFtZX1cIilcbiAgICByZXR1cm5cblxuICByZWZyZXNoTGVzc0NhY2hlOiAtPlxuICAgIEBsZXNzQ2FjaGU/LnNldEltcG9ydFBhdGhzKEBnZXRJbXBvcnRQYXRocygpKVxuXG4gIGdldEltcG9ydFBhdGhzOiAtPlxuICAgIGFjdGl2ZVRoZW1lcyA9IEBnZXRBY3RpdmVUaGVtZXMoKVxuICAgIGlmIGFjdGl2ZVRoZW1lcy5sZW5ndGggPiAwXG4gICAgICB0aGVtZVBhdGhzID0gKHRoZW1lLmdldFN0eWxlc2hlZXRzUGF0aCgpIGZvciB0aGVtZSBpbiBhY3RpdmVUaGVtZXMgd2hlbiB0aGVtZSlcbiAgICBlbHNlXG4gICAgICB0aGVtZVBhdGhzID0gW11cbiAgICAgIGZvciB0aGVtZU5hbWUgaW4gQGdldEVuYWJsZWRUaGVtZU5hbWVzKClcbiAgICAgICAgaWYgdGhlbWVQYXRoID0gQHBhY2thZ2VNYW5hZ2VyLnJlc29sdmVQYWNrYWdlUGF0aCh0aGVtZU5hbWUpXG4gICAgICAgICAgZGVwcmVjYXRlZFBhdGggPSBwYXRoLmpvaW4odGhlbWVQYXRoLCAnc3R5bGVzaGVldHMnKVxuICAgICAgICAgIGlmIGZzLmlzRGlyZWN0b3J5U3luYyhkZXByZWNhdGVkUGF0aClcbiAgICAgICAgICAgIHRoZW1lUGF0aHMucHVzaChkZXByZWNhdGVkUGF0aClcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICB0aGVtZVBhdGhzLnB1c2gocGF0aC5qb2luKHRoZW1lUGF0aCwgJ3N0eWxlcycpKVxuXG4gICAgdGhlbWVQYXRocy5maWx0ZXIgKHRoZW1lUGF0aCkgLT4gZnMuaXNEaXJlY3RvcnlTeW5jKHRoZW1lUGF0aClcbiJdfQ==
