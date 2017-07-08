(function() {
  var Module, Range, cache, isAbsolute, isCorePath, loadDependencies, loadExtensions, loadFolderCompatibility, nativeModules, path, registerBuiltins, resolveFilePath, resolveModulePath, satisfies, semver,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Module = require('module');

  path = require('path');

  semver = require('semver');

  Range = (function(superClass) {
    extend(Range, superClass);

    function Range() {
      Range.__super__.constructor.apply(this, arguments);
      this.matchedVersions = new Set();
      this.unmatchedVersions = new Set();
    }

    Range.prototype.test = function(version) {
      var matches;
      if (this.matchedVersions.has(version)) {
        return true;
      }
      if (this.unmatchedVersions.has(version)) {
        return false;
      }
      matches = Range.__super__.test.apply(this, arguments);
      if (matches) {
        this.matchedVersions.add(version);
      } else {
        this.unmatchedVersions.add(version);
      }
      return matches;
    };

    return Range;

  })(semver.Range);

  nativeModules = null;

  cache = {
    builtins: {},
    debug: false,
    dependencies: {},
    extensions: {},
    folders: {},
    ranges: {},
    registered: false,
    resourcePath: null,
    resourcePathWithTrailingSlash: null
  };

  if (process.platform === 'win32') {
    isAbsolute = function(pathToCheck) {
      return pathToCheck && (pathToCheck[1] === ':' || (pathToCheck[0] === '\\' && pathToCheck[1] === '\\'));
    };
  } else {
    isAbsolute = function(pathToCheck) {
      return pathToCheck && pathToCheck[0] === '/';
    };
  }

  isCorePath = function(pathToCheck) {
    return pathToCheck.startsWith(cache.resourcePathWithTrailingSlash);
  };

  loadDependencies = function(modulePath, rootPath, rootMetadata, moduleCache) {
    var childMetadata, childMetadataPath, childPath, error, fs, i, len, mainPath, ref, ref1;
    fs = require('fs-plus');
    ref = fs.listSync(path.join(modulePath, 'node_modules'));
    for (i = 0, len = ref.length; i < len; i++) {
      childPath = ref[i];
      if (path.basename(childPath) === '.bin') {
        continue;
      }
      if (rootPath === modulePath && ((ref1 = rootMetadata.packageDependencies) != null ? ref1.hasOwnProperty(path.basename(childPath)) : void 0)) {
        continue;
      }
      childMetadataPath = path.join(childPath, 'package.json');
      if (!fs.isFileSync(childMetadataPath)) {
        continue;
      }
      childMetadata = JSON.parse(fs.readFileSync(childMetadataPath));
      if (childMetadata != null ? childMetadata.version : void 0) {
        try {
          mainPath = require.resolve(childPath);
        } catch (error1) {
          error = error1;
          mainPath = null;
        }
        if (mainPath) {
          moduleCache.dependencies.push({
            name: childMetadata.name,
            version: childMetadata.version,
            path: path.relative(rootPath, mainPath)
          });
        }
        loadDependencies(childPath, rootPath, rootMetadata, moduleCache);
      }
    }
  };

  loadFolderCompatibility = function(modulePath, rootPath, rootMetadata, moduleCache) {
    var childPath, dependencies, error, extensions, fs, i, len, metadataPath, name, onDirectory, onFile, paths, ref, ref1, ref2, ref3, version;
    fs = require('fs-plus');
    metadataPath = path.join(modulePath, 'package.json');
    if (!fs.isFileSync(metadataPath)) {
      return;
    }
    dependencies = (ref = (ref1 = JSON.parse(fs.readFileSync(metadataPath))) != null ? ref1.dependencies : void 0) != null ? ref : {};
    for (name in dependencies) {
      version = dependencies[name];
      try {
        new Range(version);
      } catch (error1) {
        error = error1;
        delete dependencies[name];
      }
    }
    onDirectory = function(childPath) {
      return path.basename(childPath) !== 'node_modules';
    };
    extensions = ['.js', '.coffee', '.json', '.node'];
    paths = {};
    onFile = function(childPath) {
      var ref2, relativePath;
      if (ref2 = path.extname(childPath), indexOf.call(extensions, ref2) >= 0) {
        relativePath = path.relative(rootPath, path.dirname(childPath));
        return paths[relativePath] = true;
      }
    };
    fs.traverseTreeSync(modulePath, onFile, onDirectory);
    paths = Object.keys(paths);
    if (paths.length > 0 && Object.keys(dependencies).length > 0) {
      moduleCache.folders.push({
        paths: paths,
        dependencies: dependencies
      });
    }
    ref2 = fs.listSync(path.join(modulePath, 'node_modules'));
    for (i = 0, len = ref2.length; i < len; i++) {
      childPath = ref2[i];
      if (path.basename(childPath) === '.bin') {
        continue;
      }
      if (rootPath === modulePath && ((ref3 = rootMetadata.packageDependencies) != null ? ref3.hasOwnProperty(path.basename(childPath)) : void 0)) {
        continue;
      }
      loadFolderCompatibility(childPath, rootPath, rootMetadata, moduleCache);
    }
  };

  loadExtensions = function(modulePath, rootPath, rootMetadata, moduleCache) {
    var extensions, fs, nodeModulesPath, onDirectory, onFile;
    fs = require('fs-plus');
    extensions = ['.js', '.coffee', '.json', '.node'];
    nodeModulesPath = path.join(rootPath, 'node_modules');
    onFile = function(filePath) {
      var base, extension, ref, segments;
      filePath = path.relative(rootPath, filePath);
      segments = filePath.split(path.sep);
      if (indexOf.call(segments, 'test') >= 0) {
        return;
      }
      if (indexOf.call(segments, 'tests') >= 0) {
        return;
      }
      if (indexOf.call(segments, 'spec') >= 0) {
        return;
      }
      if (indexOf.call(segments, 'specs') >= 0) {
        return;
      }
      if (segments.length > 1 && !((ref = segments[0]) === 'exports' || ref === 'lib' || ref === 'node_modules' || ref === 'src' || ref === 'static' || ref === 'vendor')) {
        return;
      }
      extension = path.extname(filePath);
      if (indexOf.call(extensions, extension) >= 0) {
        if ((base = moduleCache.extensions)[extension] == null) {
          base[extension] = [];
        }
        return moduleCache.extensions[extension].push(filePath);
      }
    };
    onDirectory = function(childPath) {
      var packageName, parentPath, ref;
      if (rootMetadata.name === 'atom') {
        parentPath = path.dirname(childPath);
        if (parentPath === nodeModulesPath) {
          packageName = path.basename(childPath);
          if ((ref = rootMetadata.packageDependencies) != null ? ref.hasOwnProperty(packageName) : void 0) {
            return false;
          }
        }
      }
      return true;
    };
    fs.traverseTreeSync(rootPath, onFile, onDirectory);
  };

  satisfies = function(version, rawRange) {
    var parsedRange;
    if (!(parsedRange = cache.ranges[rawRange])) {
      parsedRange = new Range(rawRange);
      cache.ranges[rawRange] = parsedRange;
    }
    return parsedRange.test(version);
  };

  resolveFilePath = function(relativePath, parentModule) {
    var extension, paths, ref, ref1, resolvedPath, resolvedPathWithExtension;
    if (!relativePath) {
      return;
    }
    if (!(parentModule != null ? parentModule.filename : void 0)) {
      return;
    }
    if (!(relativePath[0] === '.' || isAbsolute(relativePath))) {
      return;
    }
    resolvedPath = path.resolve(path.dirname(parentModule.filename), relativePath);
    if (!isCorePath(resolvedPath)) {
      return;
    }
    extension = path.extname(resolvedPath);
    if (extension) {
      if ((ref = cache.extensions[extension]) != null ? ref.has(resolvedPath) : void 0) {
        return resolvedPath;
      }
    } else {
      ref1 = cache.extensions;
      for (extension in ref1) {
        paths = ref1[extension];
        resolvedPathWithExtension = "" + resolvedPath + extension;
        if (paths.has(resolvedPathWithExtension)) {
          return resolvedPathWithExtension;
        }
      }
    }
  };

  resolveModulePath = function(relativePath, parentModule) {
    var builtinPath, candidates, folderPath, range, ref, resolvedPath, version;
    if (!relativePath) {
      return;
    }
    if (!(parentModule != null ? parentModule.filename : void 0)) {
      return;
    }
    if (nativeModules == null) {
      nativeModules = process.binding('natives');
    }
    if (nativeModules.hasOwnProperty(relativePath)) {
      return;
    }
    if (relativePath[0] === '.') {
      return;
    }
    if (isAbsolute(relativePath)) {
      return;
    }
    folderPath = path.dirname(parentModule.filename);
    range = (ref = cache.folders[folderPath]) != null ? ref[relativePath] : void 0;
    if (range == null) {
      if (builtinPath = cache.builtins[relativePath]) {
        return builtinPath;
      } else {
        return;
      }
    }
    candidates = cache.dependencies[relativePath];
    if (candidates == null) {
      return;
    }
    for (version in candidates) {
      resolvedPath = candidates[version];
      if (Module._cache.hasOwnProperty(resolvedPath) || isCorePath(resolvedPath)) {
        if (satisfies(version, range)) {
          return resolvedPath;
        }
      }
    }
  };

  registerBuiltins = function(devMode) {
    var atomJsPath, base, builtin, commonBuiltins, commonRoot, electronAsarRoot, fs, i, j, len, len1, rendererBuiltins, rendererRoot, results;
    if (devMode || !cache.resourcePath.startsWith("" + process.resourcesPath + path.sep)) {
      fs = require('fs-plus');
      atomJsPath = path.join(cache.resourcePath, 'exports', 'atom.js');
      if (fs.isFileSync(atomJsPath)) {
        cache.builtins.atom = atomJsPath;
      }
    }
    if ((base = cache.builtins).atom == null) {
      base.atom = path.join(cache.resourcePath, 'exports', 'atom.js');
    }
    electronAsarRoot = path.join(process.resourcesPath, 'electron.asar');
    commonRoot = path.join(electronAsarRoot, 'common', 'api');
    commonBuiltins = ['callbacks-registry', 'clipboard', 'crash-reporter', 'shell'];
    for (i = 0, len = commonBuiltins.length; i < len; i++) {
      builtin = commonBuiltins[i];
      cache.builtins[builtin] = path.join(commonRoot, builtin + ".js");
    }
    rendererRoot = path.join(electronAsarRoot, 'renderer', 'api');
    rendererBuiltins = ['ipc-renderer', 'remote', 'screen'];
    results = [];
    for (j = 0, len1 = rendererBuiltins.length; j < len1; j++) {
      builtin = rendererBuiltins[j];
      results.push(cache.builtins[builtin] = path.join(rendererRoot, builtin + ".js"));
    }
    return results;
  };

  exports.create = function(modulePath) {
    var fs, metadata, metadataPath, moduleCache;
    fs = require('fs-plus');
    modulePath = fs.realpathSync(modulePath);
    metadataPath = path.join(modulePath, 'package.json');
    metadata = JSON.parse(fs.readFileSync(metadataPath));
    moduleCache = {
      version: 1,
      dependencies: [],
      extensions: {},
      folders: []
    };
    loadDependencies(modulePath, modulePath, metadata, moduleCache);
    loadFolderCompatibility(modulePath, modulePath, metadata, moduleCache);
    loadExtensions(modulePath, modulePath, metadata, moduleCache);
    metadata._atomModuleCache = moduleCache;
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  };

  exports.register = function(arg) {
    var devMode, originalResolveFilename, ref, resourcePath;
    ref = arg != null ? arg : {}, resourcePath = ref.resourcePath, devMode = ref.devMode;
    if (cache.registered) {
      return;
    }
    originalResolveFilename = Module._resolveFilename;
    Module._resolveFilename = function(relativePath, parentModule) {
      var resolvedPath;
      resolvedPath = resolveModulePath(relativePath, parentModule);
      if (resolvedPath == null) {
        resolvedPath = resolveFilePath(relativePath, parentModule);
      }
      return resolvedPath != null ? resolvedPath : originalResolveFilename(relativePath, parentModule);
    };
    cache.registered = true;
    cache.resourcePath = resourcePath;
    cache.resourcePathWithTrailingSlash = "" + resourcePath + path.sep;
    registerBuiltins(devMode);
  };

  exports.add = function(directoryPath, metadata) {
    var base, base1, base2, cacheToAdd, dependency, entry, error, extension, filePath, folderPath, i, j, k, l, len, len1, len2, len3, name1, name2, paths, ref, ref1, ref2, ref3, ref4, ref5;
    if (metadata == null) {
      try {
        metadata = require("" + directoryPath + path.sep + "package.json");
      } catch (error1) {
        error = error1;
        return;
      }
    }
    cacheToAdd = metadata != null ? metadata._atomModuleCache : void 0;
    if (cacheToAdd == null) {
      return;
    }
    ref1 = (ref = cacheToAdd.dependencies) != null ? ref : [];
    for (i = 0, len = ref1.length; i < len; i++) {
      dependency = ref1[i];
      if ((base = cache.dependencies)[name1 = dependency.name] == null) {
        base[name1] = {};
      }
      if ((base1 = cache.dependencies[dependency.name])[name2 = dependency.version] == null) {
        base1[name2] = "" + directoryPath + path.sep + dependency.path;
      }
    }
    ref3 = (ref2 = cacheToAdd.folders) != null ? ref2 : [];
    for (j = 0, len1 = ref3.length; j < len1; j++) {
      entry = ref3[j];
      ref4 = entry.paths;
      for (k = 0, len2 = ref4.length; k < len2; k++) {
        folderPath = ref4[k];
        if (folderPath) {
          cache.folders["" + directoryPath + path.sep + folderPath] = entry.dependencies;
        } else {
          cache.folders[directoryPath] = entry.dependencies;
        }
      }
    }
    ref5 = cacheToAdd.extensions;
    for (extension in ref5) {
      paths = ref5[extension];
      if ((base2 = cache.extensions)[extension] == null) {
        base2[extension] = new Set();
      }
      for (l = 0, len3 = paths.length; l < len3; l++) {
        filePath = paths[l];
        cache.extensions[extension].add("" + directoryPath + path.sep + filePath);
      }
    }
  };

  exports.cache = cache;

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21vZHVsZS1jYWNoZS5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLHFNQUFBO0lBQUE7Ozs7RUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0VBQ1QsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7RUFHSDs7O0lBQ1MsZUFBQTtNQUNYLHdDQUFBLFNBQUE7TUFDQSxJQUFDLENBQUEsZUFBRCxHQUF1QixJQUFBLEdBQUEsQ0FBQTtNQUN2QixJQUFDLENBQUEsaUJBQUQsR0FBeUIsSUFBQSxHQUFBLENBQUE7SUFIZDs7b0JBS2IsSUFBQSxHQUFNLFNBQUMsT0FBRDtBQUNKLFVBQUE7TUFBQSxJQUFlLElBQUMsQ0FBQSxlQUFlLENBQUMsR0FBakIsQ0FBcUIsT0FBckIsQ0FBZjtBQUFBLGVBQU8sS0FBUDs7TUFDQSxJQUFnQixJQUFDLENBQUEsaUJBQWlCLENBQUMsR0FBbkIsQ0FBdUIsT0FBdkIsQ0FBaEI7QUFBQSxlQUFPLE1BQVA7O01BRUEsT0FBQSxHQUFVLGlDQUFBLFNBQUE7TUFDVixJQUFHLE9BQUg7UUFDRSxJQUFDLENBQUEsZUFBZSxDQUFDLEdBQWpCLENBQXFCLE9BQXJCLEVBREY7T0FBQSxNQUFBO1FBR0UsSUFBQyxDQUFBLGlCQUFpQixDQUFDLEdBQW5CLENBQXVCLE9BQXZCLEVBSEY7O2FBSUE7SUFUSTs7OztLQU5ZLE1BQU0sQ0FBQzs7RUFpQjNCLGFBQUEsR0FBZ0I7O0VBRWhCLEtBQUEsR0FDRTtJQUFBLFFBQUEsRUFBVSxFQUFWO0lBQ0EsS0FBQSxFQUFPLEtBRFA7SUFFQSxZQUFBLEVBQWMsRUFGZDtJQUdBLFVBQUEsRUFBWSxFQUhaO0lBSUEsT0FBQSxFQUFTLEVBSlQ7SUFLQSxNQUFBLEVBQVEsRUFMUjtJQU1BLFVBQUEs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QUFXLENBQUEsU0FBQSxDQUFVLENBQUMsR0FBNUIsQ0FBZ0MsRUFBQSxHQUFHLGFBQUgsR0FBbUIsSUFBSSxDQUFDLEdBQXhCLEdBQThCLFFBQTlEO0FBREY7QUFGRjtFQXhCWTs7RUErQmQsT0FBTyxDQUFDLEtBQVIsR0FBZ0I7QUE1UmhCIiwic291cmNlc0NvbnRlbnQiOlsiTW9kdWxlID0gcmVxdWlyZSAnbW9kdWxlJ1xucGF0aCA9IHJlcXVpcmUgJ3BhdGgnXG5zZW12ZXIgPSByZXF1aXJlICdzZW12ZXInXG5cbiMgRXh0ZW5kIHNlbXZlci5SYW5nZSB0byBtZW1vaXplIG1hdGNoZWQgdmVyc2lvbnMgZm9yIHNwZWVkXG5jbGFzcyBSYW5nZSBleHRlbmRzIHNlbXZlci5SYW5nZVxuICBjb25zdHJ1Y3RvcjogLT5cbiAgICBzdXBlclxuICAgIEBtYXRjaGVkVmVyc2lvbnMgPSBuZXcgU2V0KClcbiAgICBAdW5tYXRjaGVkVmVyc2lvbnMgPSBuZXcgU2V0KClcblxuICB0ZXN0OiAodmVyc2lvbikgLT5cbiAgICByZXR1cm4gdHJ1ZSBpZiBAbWF0Y2hlZFZlcnNpb25zLmhhcyh2ZXJzaW9uKVxuICAgIHJldHVybiBmYWxzZSBpZiBAdW5tYXRjaGVkVmVyc2lvbnMuaGFzKHZlcnNpb24pXG5cbiAgICBtYXRjaGVzID0gc3VwZXJcbiAgICBpZiBtYXRjaGVzXG4gICAgICBAbWF0Y2hlZFZlcnNpb25zLmFkZCh2ZXJzaW9uKVxuICAgIGVsc2VcbiAgICAgIEB1bm1hdGNoZWRWZXJzaW9ucy5hZGQodmVyc2lvbilcbiAgICBtYXRjaGVzXG5cbm5hdGl2ZU1vZHVsZXMgPSBudWxsXG5cbmNhY2hlID1cbiAgYnVpbHRpbnM6IHt9XG4gIGRlYnVnOiBmYWxzZVxuICBkZXBlbmRlbmNpZXM6IHt9XG4gIGV4dGVuc2lvbnM6IHt9XG4gIGZvbGRlcnM6IHt9XG4gIHJhbmdlczoge31cbiAgcmVnaXN0ZXJlZDogZmFsc2VcbiAgcmVzb3VyY2VQYXRoOiBudWxsXG4gIHJlc291cmNlUGF0aFdpdGhUcmFpbGluZ1NsYXNoOiBudWxsXG5cbiMgaXNBYnNvbHV0ZSBpcyBpbmxpbmVkIGZyb20gZnMtcGx1cyBzbyB0aGF0IGZzLXBsdXMgaXRzZWxmIGNhbiBiZSByZXF1aXJlZFxuIyBmcm9tIHRoaXMgY2FjaGUuXG5pZiBwcm9jZXNzLnBsYXRmb3JtIGlzICd3aW4zMidcbiAgaXNBYnNvbHV0ZSA9IChwYXRoVG9DaGVjaykgLT5cbiAgICBwYXRoVG9DaGVjayBhbmQgKHBhdGhUb0NoZWNrWzFdIGlzICc6JyBvciAocGF0aFRvQ2hlY2tbMF0gaXMgJ1xcXFwnIGFuZCBwYXRoVG9DaGVja1sxXSBpcyAnXFxcXCcpKVxuZWxzZVxuICBpc0Fic29sdXRlID0gKHBhdGhUb0NoZWNrKSAtPlxuICAgIHBhdGhUb0NoZWNrIGFuZCBwYXRoVG9DaGVja1swXSBpcyAnLydcblxuaXNDb3JlUGF0aCA9IChwYXRoVG9DaGVjaykgLT5cbiAgcGF0aFRvQ2hlY2suc3RhcnRzV2l0aChjYWNoZS5yZXNvdXJjZVBhdGhXaXRoVHJhaWxpbmdTbGFzaClcblxubG9hZERlcGVuZGVuY2llcyA9IChtb2R1bGVQYXRoLCByb290UGF0aCwgcm9vdE1ldGFkYXRhLCBtb2R1bGVDYWNoZSkgLT5cbiAgZnMgPSByZXF1aXJlICdmcy1wbHVzJ1xuXG4gIGZvciBjaGlsZFBhdGggaW4gZnMubGlzdFN5bmMocGF0aC5qb2luKG1vZHVsZVBhdGgsICdub2RlX21vZHVsZXMnKSlcbiAgICBjb250aW51ZSBpZiBwYXRoLmJhc2VuYW1lKGNoaWxkUGF0aCkgaXMgJy5iaW4nXG4gICAgY29udGludWUgaWYgcm9vdFBhdGggaXMgbW9kdWxlUGF0aCBhbmQgcm9vdE1ldGFkYXRhLnBhY2thZ2VEZXBlbmRlbmNpZXM/Lmhhc093blByb3BlcnR5KHBhdGguYmFzZW5hbWUoY2hpbGRQYXRoKSlcblxuICAgIGNoaWxkTWV0YWRhdGFQYXRoID0gcGF0aC5qb2luKGNoaWxkUGF0aCwgJ3BhY2thZ2UuanNvbicpXG4gICAgY29udGludWUgdW5sZXNzIGZzLmlzRmlsZVN5bmMoY2hpbGRNZXRhZGF0YVBhdGgpXG5cbiAgICBjaGlsZE1ldGFkYXRhID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoY2hpbGRNZXRhZGF0YVBhdGgpKVxuICAgIGlmIGNoaWxkTWV0YWRhdGE/LnZlcnNpb25cbiAgICAgIHRyeVxuICAgICAgICBtYWluUGF0aCA9IHJlcXVpcmUucmVzb2x2ZShjaGlsZFBhdGgpXG4gICAgICBjYXRjaCBlcnJvclxuICAgICAgICBtYWluUGF0aCA9IG51bGxcblxuICAgICAgaWYgbWFpblBhdGhcbiAgICAgICAgbW9kdWxlQ2FjaGUuZGVwZW5kZW5jaWVzLnB1c2hcbiAgICAgICAgICBuYW1lOiBjaGlsZE1ldGFkYXRhLm5hbWVcbiAgICAgICAgICB2ZXJzaW9uOiBjaGlsZE1ldGFkYXRhLnZlcnNpb25cbiAgICAgICAgICBwYXRoOiBwYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBtYWluUGF0aClcblxuICAgICAgbG9hZERlcGVuZGVuY2llcyhjaGlsZFBhdGgsIHJvb3RQYXRoLCByb290TWV0YWRhdGEsIG1vZHVsZUNhY2hlKVxuXG4gIHJldHVyblxuXG5sb2FkRm9sZGVyQ29tcGF0aWJpbGl0eSA9IChtb2R1bGVQYXRoLCByb290UGF0aCwgcm9vdE1ldGFkYXRhLCBtb2R1bGVDYWNoZSkgLT5cbiAgZnMgPSByZXF1aXJlICdmcy1wbHVzJ1xuXG4gIG1ldGFkYXRhUGF0aCA9IHBhdGguam9pbihtb2R1bGVQYXRoLCAncGFja2FnZS5qc29uJylcbiAgcmV0dXJuIHVubGVzcyBmcy5pc0ZpbGVTeW5jKG1ldGFkYXRhUGF0aClcblxuICBkZXBlbmRlbmNpZXMgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhtZXRhZGF0YVBhdGgpKT8uZGVwZW5kZW5jaWVzID8ge31cblxuICBmb3IgbmFtZSwgdmVyc2lvbiBvZiBkZXBlbmRlbmNpZXNcbiAgICB0cnlcbiAgICAgIG5ldyBSYW5nZSh2ZXJzaW9uKVxuICAgIGNhdGNoIGVycm9yXG4gICAgICBkZWxldGUgZGVwZW5kZW5jaWVzW25hbWVdXG5cbiAgb25EaXJlY3RvcnkgPSAoY2hpbGRQYXRoKSAtPlxuICAgIHBhdGguYmFzZW5hbWUoY2hpbGRQYXRoKSBpc250ICdub2RlX21vZHVsZXMnXG5cbiAgZXh0ZW5zaW9ucyA9IFsnLmpzJywgJy5jb2ZmZWUnLCAnLmpzb24nLCAnLm5vZGUnXVxuICBwYXRocyA9IHt9XG4gIG9uRmlsZSA9IChjaGlsZFBhdGgpIC0+XG4gICAgaWYgcGF0aC5leHRuYW1lKGNoaWxkUGF0aCkgaW4gZXh0ZW5zaW9uc1xuICAgICAgcmVsYXRpdmVQYXRoID0gcGF0aC5yZWxhdGl2ZShyb290UGF0aCwgcGF0aC5kaXJuYW1lKGNoaWxkUGF0aCkpXG4gICAgICBwYXRoc1tyZWxhdGl2ZVBhdGhdID0gdHJ1ZVxuICBmcy50cmF2ZXJzZVRyZWVTeW5jKG1vZHVsZVBhdGgsIG9uRmlsZSwgb25EaXJlY3RvcnkpXG5cbiAgcGF0aHMgPSBPYmplY3Qua2V5cyhwYXRocylcbiAgaWYgcGF0aHMubGVuZ3RoID4gMCBhbmQgT2JqZWN0LmtleXMoZGVwZW5kZW5jaWVzKS5sZW5ndGggPiAwXG4gICAgbW9kdWxlQ2FjaGUuZm9sZGVycy5wdXNoKHtwYXRocywgZGVwZW5kZW5jaWVzfSlcblxuICBmb3IgY2hpbGRQYXRoIGluIGZzLmxpc3RTeW5jKHBhdGguam9pbihtb2R1bGVQYXRoLCAnbm9kZV9tb2R1bGVzJykpXG4gICAgY29udGludWUgaWYgcGF0aC5iYXNlbmFtZShjaGlsZFBhdGgpIGlzICcuYmluJ1xuICAgIGNvbnRpbnVlIGlmIHJvb3RQYXRoIGlzIG1vZHVsZVBhdGggYW5kIHJvb3RNZXRhZGF0YS5wYWNrYWdlRGVwZW5kZW5jaWVzPy5oYXNPd25Qcm9wZXJ0eShwYXRoLmJhc2VuYW1lKGNoaWxkUGF0aCkpXG5cbiAgICBsb2FkRm9sZGVyQ29tcGF0aWJpbGl0eShjaGlsZFBhdGgsIHJvb3RQYXRoLCByb290TWV0YWRhdGEsIG1vZHVsZUNhY2hlKVxuXG4gIHJldHVyblxuXG5sb2FkRXh0ZW5zaW9ucyA9IChtb2R1bGVQYXRoLCByb290UGF0aCwgcm9vdE1ldGFkYXRhLCBtb2R1bGVDYWNoZSkgLT5cbiAgZnMgPSByZXF1aXJlICdmcy1wbHVzJ1xuICBleHRlbnNpb25zID0gWycuanMnLCAnLmNvZmZlZScsICcuanNvbicsICcubm9kZSddXG4gIG5vZGVNb2R1bGVzUGF0aCA9IHBhdGguam9pbihyb290UGF0aCwgJ25vZGVfbW9kdWxlcycpXG5cbiAgb25GaWxlID0gKGZpbGVQYXRoKSAtPlxuICAgIGZpbGVQYXRoID0gcGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZmlsZVBhdGgpXG4gICAgc2VnbWVudHMgPSBmaWxlUGF0aC5zcGxpdChwYXRoLnNlcClcbiAgICByZXR1cm4gaWYgJ3Rlc3QnIGluIHNlZ21lbnRzXG4gICAgcmV0dXJuIGlmICd0ZXN0cycgaW4gc2VnbWVudHNcbiAgICByZXR1cm4gaWYgJ3NwZWMnIGluIHNlZ21lbnRzXG4gICAgcmV0dXJuIGlmICdzcGVjcycgaW4gc2VnbWVudHNcbiAgICByZXR1cm4gaWYgc2VnbWVudHMubGVuZ3RoID4gMSBhbmQgbm90IChzZWdtZW50c1swXSBpbiBbJ2V4cG9ydHMnLCAnbGliJywgJ25vZGVfbW9kdWxlcycsICdzcmMnLCAnc3RhdGljJywgJ3ZlbmRvciddKVxuXG4gICAgZXh0ZW5zaW9uID0gcGF0aC5leHRuYW1lKGZpbGVQYXRoKVxuICAgIGlmIGV4dGVuc2lvbiBpbiBleHRlbnNpb25zXG4gICAgICBtb2R1bGVDYWNoZS5leHRlbnNpb25zW2V4dGVuc2lvbl0gPz0gW11cbiAgICAgIG1vZHVsZUNhY2hlLmV4dGVuc2lvbnNbZXh0ZW5zaW9uXS5wdXNoKGZpbGVQYXRoKVxuXG4gIG9uRGlyZWN0b3J5ID0gKGNoaWxkUGF0aCkgLT5cbiAgICAjIERvbid0IGluY2x1ZGUgZXh0ZW5zaW9uc8KgZnJvbSBidW5kbGVkIHBhY2thZ2VzXG4gICAgIyBUaGVzZSBhcmUgZ2VuZXJhdGVkIGFuZCBzdG9yZWQgaW4gdGhlIHBhY2thZ2UncyBvd24gbWV0YWRhdGEgY2FjaGVcbiAgICBpZiByb290TWV0YWRhdGEubmFtZSBpcyAnYXRvbSdcbiAgICAgIHBhcmVudFBhdGggPSBwYXRoLmRpcm5hbWUoY2hpbGRQYXRoKVxuICAgICAgaWYgcGFyZW50UGF0aCBpcyBub2RlTW9kdWxlc1BhdGhcbiAgICAgICAgcGFja2FnZU5hbWUgPSBwYXRoLmJhc2VuYW1lKGNoaWxkUGF0aClcbiAgICAgICAgcmV0dXJuIGZhbHNlIGlmIHJvb3RNZXRhZGF0YS5wYWNrYWdlRGVwZW5kZW5jaWVzPy5oYXNPd25Qcm9wZXJ0eShwYWNrYWdlTmFtZSlcblxuICAgIHRydWVcblxuICBmcy50cmF2ZXJzZVRyZWVTeW5jKHJvb3RQYXRoLCBvbkZpbGUsIG9uRGlyZWN0b3J5KVxuXG4gIHJldHVyblxuXG5zYXRpc2ZpZXMgPSAodmVyc2lvbiwgcmF3UmFuZ2UpIC0+XG4gIHVubGVzcyBwYXJzZWRSYW5nZSA9IGNhY2hlLnJhbmdlc1tyYXdSYW5nZV1cbiAgICBwYXJzZWRSYW5nZSA9IG5ldyBSYW5nZShyYXdSYW5nZSlcbiAgICBjYWNoZS5yYW5nZXNbcmF3UmFuZ2VdID0gcGFyc2VkUmFuZ2VcbiAgcGFyc2VkUmFuZ2UudGVzdCh2ZXJzaW9uKVxuXG5yZXNvbHZlRmlsZVBhdGggPSAocmVsYXRpdmVQYXRoLCBwYXJlbnRNb2R1bGUpIC0+XG4gIHJldHVybiB1bmxlc3MgcmVsYXRpdmVQYXRoXG4gIHJldHVybiB1bmxlc3MgcGFyZW50TW9kdWxlPy5maWxlbmFtZVxuICByZXR1cm4gdW5sZXNzIHJlbGF0aXZlUGF0aFswXSBpcyAnLicgb3IgaXNBYnNvbHV0ZShyZWxhdGl2ZVBhdGgpXG5cbiAgcmVzb2x2ZWRQYXRoID0gcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShwYXJlbnRNb2R1bGUuZmlsZW5hbWUpLCByZWxhdGl2ZVBhdGgpXG4gIHJldHVybiB1bmxlc3MgaXNDb3JlUGF0aChyZXNvbHZlZFBhdGgpXG5cbiAgZXh0ZW5zaW9uID0gcGF0aC5leHRuYW1lKHJlc29sdmVkUGF0aClcbiAgaWYgZXh0ZW5zaW9uXG4gICAgcmV0dXJuIHJlc29sdmVkUGF0aCBpZiBjYWNoZS5leHRlbnNpb25zW2V4dGVuc2lvbl0/LmhhcyhyZXNvbHZlZFBhdGgpXG4gIGVsc2VcbiAgICBmb3IgZXh0ZW5zaW9uLCBwYXRocyBvZiBjYWNoZS5leHRlbnNpb25zXG4gICAgICByZXNvbHZlZFBhdGhXaXRoRXh0ZW5zaW9uID0gXCIje3Jlc29sdmVkUGF0aH0je2V4dGVuc2lvbn1cIlxuICAgICAgcmV0dXJuIHJlc29sdmVkUGF0aFdpdGhFeHRlbnNpb24gaWYgcGF0aHMuaGFzKHJlc29sdmVkUGF0aFdpdGhFeHRlbnNpb24pXG5cbiAgcmV0dXJuXG5cbnJlc29sdmVNb2R1bGVQYXRoID0gKHJlbGF0aXZlUGF0aCwgcGFyZW50TW9kdWxlKSAtPlxuICByZXR1cm4gdW5sZXNzIHJlbGF0aXZlUGF0aFxuICByZXR1cm4gdW5sZXNzIHBhcmVudE1vZHVsZT8uZmlsZW5hbWVcblxuICBuYXRpdmVNb2R1bGVzID89IHByb2Nlc3MuYmluZGluZygnbmF0aXZlcycpXG4gIHJldHVybiBpZiBuYXRpdmVNb2R1bGVzLmhhc093blByb3BlcnR5KHJlbGF0aXZlUGF0aClcbiAgcmV0dXJuIGlmIHJlbGF0aXZlUGF0aFswXSBpcyAnLidcbiAgcmV0dXJuIGlmIGlzQWJzb2x1dGUocmVsYXRpdmVQYXRoKVxuXG4gIGZvbGRlclBhdGggPSBwYXRoLmRpcm5hbWUocGFyZW50TW9kdWxlLmZpbGVuYW1lKVxuXG4gIHJhbmdlID0gY2FjaGUuZm9sZGVyc1tmb2xkZXJQYXRoXT9bcmVsYXRpdmVQYXRoXVxuICB1bmxlc3MgcmFuZ2U/XG4gICAgaWYgYnVpbHRpblBhdGggPSBjYWNoZS5idWlsdGluc1tyZWxhdGl2ZVBhdGhdXG4gICAgICByZXR1cm4gYnVpbHRpblBhdGhcbiAgICBlbHNlXG4gICAgICByZXR1cm5cblxuICBjYW5kaWRhdGVzID0gY2FjaGUuZGVwZW5kZW5jaWVzW3JlbGF0aXZlUGF0aF1cbiAgcmV0dXJuIHVubGVzcyBjYW5kaWRhdGVzP1xuXG4gIGZvciB2ZXJzaW9uLCByZXNvbHZlZFBhdGggb2YgY2FuZGlkYXRlc1xuICAgIGlmIE1vZHVsZS5fY2FjaGUuaGFzT3duUHJvcGVydHkocmVzb2x2ZWRQYXRoKSBvciBpc0NvcmVQYXRoKHJlc29sdmVkUGF0aClcbiAgICAgIHJldHVybiByZXNvbHZlZFBhdGggaWYgc2F0aXNmaWVzKHZlcnNpb24sIHJhbmdlKVxuXG4gIHJldHVyblxuXG5yZWdpc3RlckJ1aWx0aW5zID0gKGRldk1vZGUpIC0+XG4gIGlmIGRldk1vZGUgb3Igbm90IGNhY2hlLnJlc291cmNlUGF0aC5zdGFydHNXaXRoKFwiI3twcm9jZXNzLnJlc291cmNlc1BhdGh9I3twYXRoLnNlcH1cIilcbiAgICBmcyA9IHJlcXVpcmUgJ2ZzLXBsdXMnXG4gICAgYXRvbUpzUGF0aCA9IHBhdGguam9pbihjYWNoZS5yZXNvdXJjZVBhdGgsICdleHBvcnRzJywgJ2F0b20uanMnKVxuICAgIGNhY2hlLmJ1aWx0aW5zLmF0b20gPSBhdG9tSnNQYXRoIGlmIGZzLmlzRmlsZVN5bmMoYXRvbUpzUGF0aClcbiAgY2FjaGUuYnVpbHRpbnMuYXRvbSA/PSBwYXRoLmpvaW4oY2FjaGUucmVzb3VyY2VQYXRoLCAnZXhwb3J0cycsICdhdG9tLmpzJylcblxuICBlbGVjdHJvbkFzYXJSb290ID0gcGF0aC5qb2luKHByb2Nlc3MucmVzb3VyY2VzUGF0aCwgJ2VsZWN0cm9uLmFzYXInKVxuXG4gIGNvbW1vblJvb3QgPSBwYXRoLmpvaW4oZWxlY3Ryb25Bc2FyUm9vdCwgJ2NvbW1vbicsICdhcGknKVxuICBjb21tb25CdWlsdGlucyA9IFsnY2FsbGJhY2tzLXJlZ2lzdHJ5JywgJ2NsaXBib2FyZCcsICdjcmFzaC1yZXBvcnRlcicsICdzaGVsbCddXG4gIGZvciBidWlsdGluIGluIGNvbW1vbkJ1aWx0aW5zXG4gICAgY2FjaGUuYnVpbHRpbnNbYnVpbHRpbl0gPSBwYXRoLmpvaW4oY29tbW9uUm9vdCwgXCIje2J1aWx0aW59LmpzXCIpXG5cbiAgcmVuZGVyZXJSb290ID0gcGF0aC5qb2luKGVsZWN0cm9uQXNhclJvb3QsICdyZW5kZXJlcicsICdhcGknKVxuICByZW5kZXJlckJ1aWx0aW5zID0gWydpcGMtcmVuZGVyZXInLCAncmVtb3RlJywgJ3NjcmVlbiddXG4gIGZvciBidWlsdGluIGluIHJlbmRlcmVyQnVpbHRpbnNcbiAgICBjYWNoZS5idWlsdGluc1tidWlsdGluXSA9IHBhdGguam9pbihyZW5kZXJlclJvb3QsIFwiI3tidWlsdGlufS5qc1wiKVxuXG5leHBvcnRzLmNyZWF0ZSA9IChtb2R1bGVQYXRoKSAtPlxuICBmcyA9IHJlcXVpcmUgJ2ZzLXBsdXMnXG5cbiAgbW9kdWxlUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhtb2R1bGVQYXRoKVxuICBtZXRhZGF0YVBhdGggPSBwYXRoLmpvaW4obW9kdWxlUGF0aCwgJ3BhY2thZ2UuanNvbicpXG4gIG1ldGFkYXRhID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMobWV0YWRhdGFQYXRoKSlcblxuICBtb2R1bGVDYWNoZSA9XG4gICAgdmVyc2lvbjogMVxuICAgIGRlcGVuZGVuY2llczogW11cbiAgICBleHRlbnNpb25zOiB7fVxuICAgIGZvbGRlcnM6IFtdXG5cbiAgbG9hZERlcGVuZGVuY2llcyhtb2R1bGVQYXRoLCBtb2R1bGVQYXRoLCBtZXRhZGF0YSwgbW9kdWxlQ2FjaGUpXG4gIGxvYWRGb2xkZXJDb21wYXRpYmlsaXR5KG1vZHVsZVBhdGgsIG1vZHVsZVBhdGgsIG1ldGFkYXRhLCBtb2R1bGVDYWNoZSlcbiAgbG9hZEV4dGVuc2lvbnMobW9kdWxlUGF0aCwgbW9kdWxlUGF0aCwgbWV0YWRhdGEsIG1vZHVsZUNhY2hlKVxuXG4gIG1ldGFkYXRhLl9hdG9tTW9kdWxlQ2FjaGUgPSBtb2R1bGVDYWNoZVxuICBmcy53cml0ZUZpbGVTeW5jKG1ldGFkYXRhUGF0aCwgSlNPTi5zdHJpbmdpZnkobWV0YWRhdGEsIG51bGwsIDIpKVxuXG4gIHJldHVyblxuXG5leHBvcnRzLnJlZ2lzdGVyID0gKHtyZXNvdXJjZVBhdGgsIGRldk1vZGV9PXt9KSAtPlxuICByZXR1cm4gaWYgY2FjaGUucmVnaXN0ZXJlZFxuXG4gIG9yaWdpbmFsUmVzb2x2ZUZpbGVuYW1lID0gTW9kdWxlLl9yZXNvbHZlRmlsZW5hbWVcbiAgTW9kdWxlLl9yZXNvbHZlRmlsZW5hbWUgPSAocmVsYXRpdmVQYXRoLCBwYXJlbnRNb2R1bGUpIC0+XG4gICAgcmVzb2x2ZWRQYXRoID0gcmVzb2x2ZU1vZHVsZVBhdGgocmVsYXRpdmVQYXRoLCBwYXJlbnRNb2R1bGUpXG4gICAgcmVzb2x2ZWRQYXRoID89IHJlc29sdmVGaWxlUGF0aChyZWxhdGl2ZVBhdGgsIHBhcmVudE1vZHVsZSlcbiAgICByZXNvbHZlZFBhdGggPyBvcmlnaW5hbFJlc29sdmVGaWxlbmFtZShyZWxhdGl2ZVBhdGgsIHBhcmVudE1vZHVsZSlcblxuICBjYWNoZS5yZWdpc3RlcmVkID0gdHJ1ZVxuICBjYWNoZS5yZXNvdXJjZVBhdGggPSByZXNvdXJjZVBhdGhcbiAgY2FjaGUucmVzb3VyY2VQYXRoV2l0aFRyYWlsaW5nU2xhc2ggPSBcIiN7cmVzb3VyY2VQYXRofSN7cGF0aC5zZXB9XCJcbiAgcmVnaXN0ZXJCdWlsdGlucyhkZXZNb2RlKVxuXG4gIHJldHVyblxuXG5leHBvcnRzLmFkZCA9IChkaXJlY3RvcnlQYXRoLCBtZXRhZGF0YSkgLT5cbiAgIyBwYXRoLmpvaW4gaXNuJ3QgdXNlZCBpbiB0aGlzIGZ1bmN0aW9uIGZvciBzcGVlZCBzaW5jZSBwYXRoLmpvaW4gY2FsbHNcbiAgIyBwYXRoLm5vcm1hbGl6ZSBhbmQgYWxsIHRoZSBwYXRocyBhcmUgYWxyZWFkeSBub3JtYWxpemVkIGhlcmUuXG5cbiAgdW5sZXNzIG1ldGFkYXRhP1xuICAgIHRyeVxuICAgICAgbWV0YWRhdGEgPSByZXF1aXJlKFwiI3tkaXJlY3RvcnlQYXRofSN7cGF0aC5zZXB9cGFja2FnZS5qc29uXCIpXG4gICAgY2F0Y2ggZXJyb3JcbiAgICAgIHJldHVyblxuXG4gIGNhY2hlVG9BZGQgPSBtZXRhZGF0YT8uX2F0b21Nb2R1bGVDYWNoZVxuICByZXR1cm4gdW5sZXNzIGNhY2hlVG9BZGQ/XG5cbiAgZm9yIGRlcGVuZGVuY3kgaW4gY2FjaGVUb0FkZC5kZXBlbmRlbmNpZXMgPyBbXVxuICAgIGNhY2hlLmRlcGVuZGVuY2llc1tkZXBlbmRlbmN5Lm5hbWVdID89IHt9XG4gICAgY2FjaGUuZGVwZW5kZW5jaWVzW2RlcGVuZGVuY3kubmFtZV1bZGVwZW5kZW5jeS52ZXJzaW9uXSA/PSBcIiN7ZGlyZWN0b3J5UGF0aH0je3BhdGguc2VwfSN7ZGVwZW5kZW5jeS5wYXRofVwiXG5cbiAgZm9yIGVudHJ5IGluIGNhY2hlVG9BZGQuZm9sZGVycyA/IFtdXG4gICAgZm9yIGZvbGRlclBhdGggaW4gZW50cnkucGF0aHNcbiAgICAgIGlmIGZvbGRlclBhdGhcbiAgICAgICAgY2FjaGUuZm9sZGVyc1tcIiN7ZGlyZWN0b3J5UGF0aH0je3BhdGguc2VwfSN7Zm9sZGVyUGF0aH1cIl0gPSBlbnRyeS5kZXBlbmRlbmNpZXNcbiAgICAgIGVsc2VcbiAgICAgICAgY2FjaGUuZm9sZGVyc1tkaXJlY3RvcnlQYXRoXSA9IGVudHJ5LmRlcGVuZGVuY2llc1xuXG4gIGZvciBleHRlbnNpb24sIHBhdGhzIG9mIGNhY2hlVG9BZGQuZXh0ZW5zaW9uc1xuICAgIGNhY2hlLmV4dGVuc2lvbnNbZXh0ZW5zaW9uXSA/PSBuZXcgU2V0KClcbiAgICBmb3IgZmlsZVBhdGggaW4gcGF0aHNcbiAgICAgIGNhY2hlLmV4dGVuc2lvbnNbZXh0ZW5zaW9uXS5hZGQoXCIje2RpcmVjdG9yeVBhdGh9I3twYXRoLnNlcH0je2ZpbGVQYXRofVwiKVxuXG4gIHJldHVyblxuXG5leHBvcnRzLmNhY2hlID0gY2FjaGVcbiJdfQ==
