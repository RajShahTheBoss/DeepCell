(function() {
  var DefaultDirectoryProvider, Disposable, Emitter, GitRepositoryProvider, Model, Project, TextBuffer, _, fs, path, ref,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    slice = [].slice;

  path = require('path');

  _ = require('underscore-plus');

  fs = require('fs-plus');

  ref = require('event-kit'), Emitter = ref.Emitter, Disposable = ref.Disposable;

  TextBuffer = require('text-buffer');

  DefaultDirectoryProvider = require('./default-directory-provider');

  Model = require('./model');

  GitRepositoryProvider = require('./git-repository-provider');

  module.exports = Project = (function(superClass) {
    extend(Project, superClass);


    /*
    Section: Construction and Destruction
     */

    function Project(arg) {
      var config, packageManager;
      this.notificationManager = arg.notificationManager, packageManager = arg.packageManager, config = arg.config, this.applicationDelegate = arg.applicationDelegate;
      this.emitter = new Emitter;
      this.buffers = [];
      this.rootDirectories = [];
      this.repositories = [];
      this.directoryProviders = [];
      this.defaultDirectoryProvider = new DefaultDirectoryProvider();
      this.repositoryPromisesByPath = new Map();
      this.repositoryProviders = [new GitRepositoryProvider(this, config)];
      this.consumeServices(packageManager);
    }

    Project.prototype.destroyed = function() {
      var buffer, j, k, len, len1, ref1, ref2, repository;
      ref1 = this.buffers.slice();
      for (j = 0, len = ref1.length; j < len; j++) {
        buffer = ref1[j];
        buffer.destroy();
      }
      ref2 = this.repositories.slice();
      for (k = 0, len1 = ref2.length; k < len1; k++) {
        repository = ref2[k];
        if (repository != null) {
          repository.destroy();
        }
      }
      this.rootDirectories = [];
      return this.repositories = [];
    };

    Project.prototype.reset = function(packageManager) {
      var buffer, j, len, ref1;
      this.emitter.dispose();
      this.emitter = new Emitter;
      ref1 = this.buffers;
      for (j = 0, len = ref1.length; j < len; j++) {
        buffer = ref1[j];
        if (buffer != null) {
          buffer.destroy();
        }
      }
      this.buffers = [];
      this.setPaths([]);
      return this.consumeServices(packageManager);
    };

    Project.prototype.destroyUnretainedBuffers = function() {
      var buffer, j, len, ref1;
      ref1 = this.getBuffers();
      for (j = 0, len = ref1.length; j < len; j++) {
        buffer = ref1[j];
        if (!buffer.isRetained()) {
          buffer.destroy();
        }
      }
    };


    /*
    Section: Serialization
     */

    Project.prototype.deserialize = function(state) {
      var buffer, j, len, ref1;
      if (state.path != null) {
        state.paths = [state.path];
      }
      this.buffers = _.compact(state.buffers.map(function(bufferState) {
        var error;
        if (fs.isDirectorySync(bufferState.filePath)) {
          return;
        }
        if (bufferState.filePath) {
          try {
            fs.closeSync(fs.openSync(bufferState.filePath, 'r'));
          } catch (error1) {
            error = error1;
            if (error.code !== 'ENOENT') {
              return;
            }
          }
        }
        if (bufferState.shouldDestroyOnFileDelete == null) {
          bufferState.shouldDestroyOnFileDelete = function() {
            return atom.config.get('core.closeDeletedFileTabs');
          };
        }
        return TextBuffer.deserialize(bufferState);
      }));
      ref1 = this.buffers;
      for (j = 0, len = ref1.length; j < len; j++) {
        buffer = ref1[j];
        this.subscribeToBuffer(buffer);
      }
      return this.setPaths(state.paths);
    };

    Project.prototype.serialize = function(options) {
      if (options == null) {
        options = {};
      }
      return {
        deserializer: 'Project',
        paths: this.getPaths(),
        buffers: _.compact(this.buffers.map(function(buffer) {
          var state;
          if (buffer.isRetained()) {
            state = buffer.serialize({
              markerLayers: options.isUnloading === true
            });
            if (!options.isUnloading && state.text.length > 2 * 1024 * 1024) {
              delete state.text;
              delete state.digestWhenLastPersisted;
            }
            return state;
          }
        }))
      };
    };


    /*
    Section: Event Subscription
     */

    Project.prototype.onDidChangePaths = function(callback) {
      return this.emitter.on('did-change-paths', callback);
    };

    Project.prototype.onDidAddBuffer = function(callback) {
      return this.emitter.on('did-add-buffer', callback);
    };

    Project.prototype.observeBuffers = function(callback) {
      var buffer, j, len, ref1;
      ref1 = this.getBuffers();
      for (j = 0, len = ref1.length; j < len; j++) {
        buffer = ref1[j];
        callback(buffer);
      }
      return this.onDidAddBuffer(callback);
    };


    /*
    Section: Accessing the git repository
     */

    Project.prototype.getRepositories = function() {
      return this.repositories;
    };

    Project.prototype.repositoryForDirectory = function(directory) {
      var pathForDirectory, promise, promises;
      pathForDirectory = directory.getRealPathSync();
      promise = this.repositoryPromisesByPath.get(pathForDirectory);
      if (!promise) {
        promises = this.repositoryProviders.map(function(provider) {
          return provider.repositoryForDirectory(directory);
        });
        promise = Promise.all(promises).then((function(_this) {
          return function(repositories) {
            var ref1, repo;
            repo = (ref1 = _.find(repositories, function(repo) {
              return repo != null;
            })) != null ? ref1 : null;
            if (repo == null) {
              _this.repositoryPromisesByPath["delete"](pathForDirectory);
            }
            if (repo != null) {
              if (typeof repo.onDidDestroy === "function") {
                repo.onDidDestroy(function() {
                  return _this.repositoryPromisesByPath["delete"](pathForDirectory);
                });
              }
            }
            return repo;
          };
        })(this));
        this.repositoryPromisesByPath.set(pathForDirectory, promise);
      }
      return promise;
    };


    /*
    Section: Managing Paths
     */

    Project.prototype.getPaths = function() {
      var j, len, ref1, results, rootDirectory;
      ref1 = this.rootDirectories;
      results = [];
      for (j = 0, len = ref1.length; j < len; j++) {
        rootDirectory = ref1[j];
        results.push(rootDirectory.getPath());
      }
      return results;
    };

    Project.prototype.setPaths = function(projectPaths) {
      var j, k, len, len1, projectPath, ref1, repository;
      ref1 = this.repositories;
      for (j = 0, len = ref1.length; j < len; j++) {
        repository = ref1[j];
        if (repository != null) {
          repository.destroy();
        }
      }
      this.rootDirectories = [];
      this.repositories = [];
      for (k = 0, len1 = projectPaths.length; k < len1; k++) {
        projectPath = projectPaths[k];
        this.addPath(projectPath, {
          emitEvent: false
        });
      }
      return this.emitter.emit('did-change-paths', projectPaths);
    };

    Project.prototype.addPath = function(projectPath, options) {
      var directory, existingDirectory, j, k, len, len1, provider, ref1, ref2, repo;
      directory = this.getDirectoryForProjectPath(projectPath);
      if (!directory.existsSync()) {
        return;
      }
      ref1 = this.getDirectories();
      for (j = 0, len = ref1.length; j < len; j++) {
        existingDirectory = ref1[j];
        if (existingDirectory.getPath() === directory.getPath()) {
          return;
        }
      }
      this.rootDirectories.push(directory);
      repo = null;
      ref2 = this.repositoryProviders;
      for (k = 0, len1 = ref2.length; k < len1; k++) {
        provider = ref2[k];
        if (repo = typeof provider.repositoryForDirectorySync === "function" ? provider.repositoryForDirectorySync(directory) : void 0) {
          break;
        }
      }
      this.repositories.push(repo != null ? repo : null);
      if ((options != null ? options.emitEvent : void 0) !== false) {
        return this.emitter.emit('did-change-paths', this.getPaths());
      }
    };

    Project.prototype.getDirectoryForProjectPath = function(projectPath) {
      var directory, j, len, provider, ref1;
      directory = null;
      ref1 = this.directoryProviders;
      for (j = 0, len = ref1.length; j < len; j++) {
        provider = ref1[j];
        if (directory = typeof provider.directoryForURISync === "function" ? provider.directoryForURISync(projectPath) : void 0) {
          break;
        }
      }
      if (directory == null) {
        directory = this.defaultDirectoryProvider.directoryForURISync(projectPath);
      }
      return directory;
    };

    Project.prototype.removePath = function(projectPath) {
      var directory, i, indexToRemove, j, len, ref1, removedDirectory, removedRepository;
      if (indexOf.call(this.getPaths(), projectPath) < 0) {
        projectPath = this.defaultDirectoryProvider.normalizePath(projectPath);
      }
      indexToRemove = null;
      ref1 = this.rootDirectories;
      for (i = j = 0, len = ref1.length; j < len; i = ++j) {
        directory = ref1[i];
        if (directory.getPath() === projectPath) {
          indexToRemove = i;
          break;
        }
      }
      if (indexToRemove != null) {
        removedDirectory = this.rootDirectories.splice(indexToRemove, 1)[0];
        removedRepository = this.repositories.splice(indexToRemove, 1)[0];
        if (indexOf.call(this.repositories, removedRepository) < 0) {
          if (removedRepository != null) {
            removedRepository.destroy();
          }
        }
        this.emitter.emit("did-change-paths", this.getPaths());
        return true;
      } else {
        return false;
      }
    };

    Project.prototype.getDirectories = function() {
      return this.rootDirectories;
    };

    Project.prototype.resolvePath = function(uri) {
      var projectPath;
      if (!uri) {
        return;
      }
      if (uri != null ? uri.match(/[A-Za-z0-9+-.]+:\/\//) : void 0) {
        return uri;
      } else {
        if (fs.isAbsolute(uri)) {
          return this.defaultDirectoryProvider.normalizePath(fs.resolveHome(uri));
        } else if (projectPath = this.getPaths()[0]) {
          return this.defaultDirectoryProvider.normalizePath(fs.resolveHome(path.join(projectPath, uri)));
        } else {
          return void 0;
        }
      }
    };

    Project.prototype.relativize = function(fullPath) {
      return this.relativizePath(fullPath)[1];
    };

    Project.prototype.relativizePath = function(fullPath) {
      var j, len, ref1, relativePath, result, rootDirectory;
      result = [null, fullPath];
      if (fullPath != null) {
        ref1 = this.rootDirectories;
        for (j = 0, len = ref1.length; j < len; j++) {
          rootDirectory = ref1[j];
          relativePath = rootDirectory.relativize(fullPath);
          if ((relativePath != null ? relativePath.length : void 0) < result[1].length) {
            result = [rootDirectory.getPath(), relativePath];
          }
        }
      }
      return result;
    };

    Project.prototype.contains = function(pathToCheck) {
      return this.rootDirectories.some(function(dir) {
        return dir.contains(pathToCheck);
      });
    };


    /*
    Section: Private
     */

    Project.prototype.consumeServices = function(arg) {
      var serviceHub;
      serviceHub = arg.serviceHub;
      serviceHub.consume('atom.directory-provider', '^0.1.0', (function(_this) {
        return function(provider) {
          _this.directoryProviders.unshift(provider);
          return new Disposable(function() {
            return _this.directoryProviders.splice(_this.directoryProviders.indexOf(provider), 1);
          });
        };
      })(this));
      return serviceHub.consume('atom.repository-provider', '^0.1.0', (function(_this) {
        return function(provider) {
          _this.repositoryProviders.unshift(provider);
          if (indexOf.call(_this.repositories, null) >= 0) {
            _this.setPaths(_this.getPaths());
          }
          return new Disposable(function() {
            return _this.repositoryProviders.splice(_this.repositoryProviders.indexOf(provider), 1);
          });
        };
      })(this));
    };

    Project.prototype.getBuffers = function() {
      return this.buffers.slice();
    };

    Project.prototype.isPathModified = function(filePath) {
      var ref1;
      return (ref1 = this.findBufferForPath(this.resolvePath(filePath))) != null ? ref1.isModified() : void 0;
    };

    Project.prototype.findBufferForPath = function(filePath) {
      return _.find(this.buffers, function(buffer) {
        return buffer.getPath() === filePath;
      });
    };

    Project.prototype.findBufferForId = function(id) {
      return _.find(this.buffers, function(buffer) {
        return buffer.getId() === id;
      });
    };

    Project.prototype.bufferForPathSync = function(filePath) {
      var absoluteFilePath, existingBuffer;
      absoluteFilePath = this.resolvePath(filePath);
      if (filePath) {
        existingBuffer = this.findBufferForPath(absoluteFilePath);
      }
      return existingBuffer != null ? existingBuffer : this.buildBufferSync(absoluteFilePath);
    };

    Project.prototype.bufferForIdSync = function(id) {
      var existingBuffer;
      if (id) {
        existingBuffer = this.findBufferForId(id);
      }
      return existingBuffer != null ? existingBuffer : this.buildBufferSync();
    };

    Project.prototype.bufferForPath = function(absoluteFilePath) {
      var existingBuffer;
      if (absoluteFilePath != null) {
        existingBuffer = this.findBufferForPath(absoluteFilePath);
      }
      if (existingBuffer) {
        return Promise.resolve(existingBuffer);
      } else {
        return this.buildBuffer(absoluteFilePath);
      }
    };

    Project.prototype.shouldDestroyBufferOnFileDelete = function() {
      return atom.config.get('core.closeDeletedFileTabs');
    };

    Project.prototype.buildBufferSync = function(absoluteFilePath) {
      var buffer;
      buffer = new TextBuffer({
        filePath: absoluteFilePath,
        shouldDestroyOnFileDelete: this.shouldDestroyBufferOnFileDelete
      });
      this.addBuffer(buffer);
      buffer.loadSync();
      return buffer;
    };

    Project.prototype.buildBuffer = function(absoluteFilePath) {
      var buffer;
      buffer = new TextBuffer({
        filePath: absoluteFilePath,
        shouldDestroyOnFileDelete: this.shouldDestroyBufferOnFileDelete
      });
      this.addBuffer(buffer);
      return buffer.load().then(function(buffer) {
        return buffer;
      })["catch"]((function(_this) {
        return function() {
          return _this.removeBuffer(buffer);
        };
      })(this));
    };

    Project.prototype.addBuffer = function(buffer, options) {
      if (options == null) {
        options = {};
      }
      return this.addBufferAtIndex(buffer, this.buffers.length, options);
    };

    Project.prototype.addBufferAtIndex = function(buffer, index, options) {
      if (options == null) {
        options = {};
      }
      this.buffers.splice(index, 0, buffer);
      this.subscribeToBuffer(buffer);
      this.emitter.emit('did-add-buffer', buffer);
      return buffer;
    };

    Project.prototype.removeBuffer = function(buffer) {
      var index;
      index = this.buffers.indexOf(buffer);
      if (index !== -1) {
        return this.removeBufferAtIndex(index);
      }
    };

    Project.prototype.removeBufferAtIndex = function(index, options) {
      var buffer;
      if (options == null) {
        options = {};
      }
      buffer = this.buffers.splice(index, 1)[0];
      return buffer != null ? buffer.destroy() : void 0;
    };

    Project.prototype.eachBuffer = function() {
      var args, buffer, callback, j, len, ref1, subscriber;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      if (args.length > 1) {
        subscriber = args.shift();
      }
      callback = args.shift();
      ref1 = this.getBuffers();
      for (j = 0, len = ref1.length; j < len; j++) {
        buffer = ref1[j];
        callback(buffer);
      }
      if (subscriber) {
        return subscriber.subscribe(this, 'buffer-created', function(buffer) {
          return callback(buffer);
        });
      } else {
        return this.on('buffer-created', function(buffer) {
          return callback(buffer);
        });
      }
    };

    Project.prototype.subscribeToBuffer = function(buffer) {
      buffer.onWillSave((function(_this) {
        return function(arg) {
          var path;
          path = arg.path;
          return _this.applicationDelegate.emitWillSavePath(path);
        };
      })(this));
      buffer.onDidSave((function(_this) {
        return function(arg) {
          var path;
          path = arg.path;
          return _this.applicationDelegate.emitDidSavePath(path);
        };
      })(this));
      buffer.onDidDestroy((function(_this) {
        return function() {
          return _this.removeBuffer(buffer);
        };
      })(this));
      buffer.onDidChangePath((function(_this) {
        return function() {
          if (!(_this.getPaths().length > 0)) {
            return _this.setPaths([path.dirname(buffer.getPath())]);
          }
        };
      })(this));
      return buffer.onWillThrowWatchError((function(_this) {
        return function(arg) {
          var error, handle;
          error = arg.error, handle = arg.handle;
          handle();
          return _this.notificationManager.addWarning("Unable to read file after file `" + error.eventType + "` event.\nMake sure you have permission to access `" + (buffer.getPath()) + "`.", {
            detail: error.message,
            dismissable: true
          });
        };
      })(this));
    };

    return Project;

  })(Model);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3Byb2plY3QuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSxrSEFBQTtJQUFBOzs7OztFQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFFUCxDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLEVBQUEsR0FBSyxPQUFBLENBQVEsU0FBUjs7RUFDTCxNQUF3QixPQUFBLENBQVEsV0FBUixDQUF4QixFQUFDLHFCQUFELEVBQVU7O0VBQ1YsVUFBQSxHQUFhLE9BQUEsQ0FBUSxhQUFSOztFQUViLHdCQUFBLEdBQTJCLE9BQUEsQ0FBUSw4QkFBUjs7RUFDM0IsS0FBQSxHQUFRLE9BQUEsQ0FBUSxTQUFSOztFQUNSLHFCQUFBLEdBQXdCLE9BQUEsQ0FBUSwyQkFBUjs7RUFLeEIsTUFBTSxDQUFDLE9BQVAsR0FDTTs7OztBQUNKOzs7O0lBSWEsaUJBQUMsR0FBRDtBQUNYLFVBQUE7TUFEYSxJQUFDLENBQUEsMEJBQUEscUJBQXFCLHFDQUFnQixxQkFBUSxJQUFDLENBQUEsMEJBQUE7TUFDNUQsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQUFJO01BQ2YsSUFBQyxDQUFBLE9BQUQsR0FBVztNQUNYLElBQUMsQ0FBQSxlQUFELEdBQW1CO01BQ25CLElBQUMsQ0FBQSxZQUFELEdBQWdCO01BQ2hCLElBQUMsQ0FBQSxrQkFBRCxHQUFzQjtNQUN0QixJQUFDLENBQUEsd0JBQUQsR0FBZ0MsSUFBQSx3QkFBQSxDQUFBO01BQ2hDLElBQUMsQ0FBQSx3QkFBRCxHQUFnQyxJQUFBLEdBQUEsQ0FBQTtNQUNoQyxJQUFDLENBQUEsbUJBQUQsR0FBdUIsQ0FBSyxJQUFBLHFCQUFBLENBQXNCLElBQXRCLEVBQTRCLE1BQTVCLENBQUw7TUFDdkIsSUFBQyxDQUFBLGVBQUQsQ0FBaUIsY0FBakI7SUFUVzs7c0JBV2IsU0FBQSxH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TSxDQUFDLE9BQVAsQ0FBQSxDQUFELENBRlosR0FFOEIsSUFGOUQsRUFJRTtZQUFBLE1BQUEsRUFBUSxLQUFLLENBQUMsT0FBZDtZQUNBLFdBQUEsRUFBYSxJQURiO1dBSkY7UUFGMkI7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTdCO0lBUGlCOzs7O0tBMVpDO0FBZnRCIiwic291cmNlc0NvbnRlbnQiOlsicGF0aCA9IHJlcXVpcmUgJ3BhdGgnXG5cbl8gPSByZXF1aXJlICd1bmRlcnNjb3JlLXBsdXMnXG5mcyA9IHJlcXVpcmUgJ2ZzLXBsdXMnXG57RW1pdHRlciwgRGlzcG9zYWJsZX0gPSByZXF1aXJlICdldmVudC1raXQnXG5UZXh0QnVmZmVyID0gcmVxdWlyZSAndGV4dC1idWZmZXInXG5cbkRlZmF1bHREaXJlY3RvcnlQcm92aWRlciA9IHJlcXVpcmUgJy4vZGVmYXVsdC1kaXJlY3RvcnktcHJvdmlkZXInXG5Nb2RlbCA9IHJlcXVpcmUgJy4vbW9kZWwnXG5HaXRSZXBvc2l0b3J5UHJvdmlkZXIgPSByZXF1aXJlICcuL2dpdC1yZXBvc2l0b3J5LXByb3ZpZGVyJ1xuXG4jIEV4dGVuZGVkOiBSZXByZXNlbnRzIGEgcHJvamVjdCB0aGF0J3Mgb3BlbmVkIGluIEF0b20uXG4jXG4jIEFuIGluc3RhbmNlIG9mIHRoaXMgY2xhc3MgaXMgYWx3YXlzIGF2YWlsYWJsZSBhcyB0aGUgYGF0b20ucHJvamVjdGAgZ2xvYmFsLlxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgUHJvamVjdCBleHRlbmRzIE1vZGVsXG4gICMjI1xuICBTZWN0aW9uOiBDb25zdHJ1Y3Rpb24gYW5kIERlc3RydWN0aW9uXG4gICMjI1xuXG4gIGNvbnN0cnVjdG9yOiAoe0Bub3RpZmljYXRpb25NYW5hZ2VyLCBwYWNrYWdlTWFuYWdlciwgY29uZmlnLCBAYXBwbGljYXRpb25EZWxlZ2F0ZX0pIC0+XG4gICAgQGVtaXR0ZXIgPSBuZXcgRW1pdHRlclxuICAgIEBidWZmZXJzID0gW11cbiAgICBAcm9vdERpcmVjdG9yaWVzID0gW11cbiAgICBAcmVwb3NpdG9yaWVzID0gW11cbiAgICBAZGlyZWN0b3J5UHJvdmlkZXJzID0gW11cbiAgICBAZGVmYXVsdERpcmVjdG9yeVByb3ZpZGVyID0gbmV3IERlZmF1bHREaXJlY3RvcnlQcm92aWRlcigpXG4gICAgQHJlcG9zaXRvcnlQcm9taXNlc0J5UGF0aCA9IG5ldyBNYXAoKVxuICAgIEByZXBvc2l0b3J5UHJvdmlkZXJzID0gW25ldyBHaXRSZXBvc2l0b3J5UHJvdmlkZXIodGhpcywgY29uZmlnKV1cbiAgICBAY29uc3VtZVNlcnZpY2VzKHBhY2thZ2VNYW5hZ2VyKVxuXG4gIGRlc3Ryb3llZDogLT5cbiAgICBidWZmZXIuZGVzdHJveSgpIGZvciBidWZmZXIgaW4gQGJ1ZmZlcnMuc2xpY2UoKVxuICAgIHJlcG9zaXRvcnk/LmRlc3Ryb3koKSBmb3IgcmVwb3NpdG9yeSBpbiBAcmVwb3NpdG9yaWVzLnNsaWNlKClcbiAgICBAcm9vdERpcmVjdG9yaWVzID0gW11cbiAgICBAcmVwb3NpdG9yaWVzID0gW11cblxuICByZXNldDogKHBhY2thZ2VNYW5hZ2VyKSAtPlxuICAgIEBlbWl0dGVyLmRpc3Bvc2UoKVxuICAgIEBlbWl0dGVyID0gbmV3IEVtaXR0ZXJcblxuICAgIGJ1ZmZlcj8uZGVzdHJveSgpIGZvciBidWZmZXIgaW4gQGJ1ZmZlcnNcbiAgICBAYnVmZmVycyA9IFtdXG4gICAgQHNldFBhdGhzKFtdKVxuICAgIEBjb25zdW1lU2VydmljZXMocGFja2FnZU1hbmFnZXIpXG5cbiAgZGVzdHJveVVucmV0YWluZWRCdWZmZXJzOiAtPlxuICAgIGJ1ZmZlci5kZXN0cm95KCkgZm9yIGJ1ZmZlciBpbiBAZ2V0QnVmZmVycygpIHdoZW4gbm90IGJ1ZmZlci5pc1JldGFpbmVkKClcbiAgICByZXR1cm5cblxuICAjIyNcbiAgU2VjdGlvbjogU2VyaWFsaXphdGlvblxuICAjIyNcblxuICBkZXNlcmlhbGl6ZTogKHN0YXRlKSAtPlxuICAgIHN0YXRlLnBhdGhzID0gW3N0YXRlLnBhdGhdIGlmIHN0YXRlLnBhdGg/ICMgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuXG4gICAgQGJ1ZmZlcnMgPSBfLmNvbXBhY3Qgc3RhdGUuYnVmZmVycy5tYXAgKGJ1ZmZlclN0YXRlKSAtPlxuICAgICAgIyBDaGVjayB0aGF0IGJ1ZmZlcidzIGZpbGUgcGF0aCBpcyBhY2Nlc3NpYmxlXG4gICAgICByZXR1cm4gaWYgZnMuaXNEaXJlY3RvcnlTeW5jKGJ1ZmZlclN0YXRlLmZpbGVQYXRoKVxuICAgICAgaWYgYnVmZmVyU3RhdGUuZmlsZVBhdGhcbiAgICAgICAgdHJ5XG4gICAgICAgICAgZnMuY2xvc2VTeW5jKGZzLm9wZW5TeW5jKGJ1ZmZlclN0YXRlLmZpbGVQYXRoLCAncicpKVxuICAgICAgICBjYXRjaCBlcnJvclxuICAgICAgICAgIHJldHVybiB1bmxlc3MgZXJyb3IuY29kZSBpcyAnRU5PRU5UJ1xuICAgICAgdW5sZXNzIGJ1ZmZlclN0YXRlLnNob3VsZERlc3Ryb3lPbkZpbGVEZWxldGU/XG4gICAgICAgIGJ1ZmZlclN0YXRlLnNob3VsZERlc3Ryb3lPbkZpbGVEZWxldGUgPVxuICAgICAgICAgIC0+IGF0b20uY29uZmlnLmdldCgnY29yZS5jbG9zZURlbGV0ZWRGaWxlVGFicycpXG4gICAgICBUZXh0QnVmZmVyLmRlc2VyaWFsaXplKGJ1ZmZlclN0YXRlKVxuXG4gICAgQHN1YnNjcmliZVRvQnVmZmVyKGJ1ZmZlcikgZm9yIGJ1ZmZlciBpbiBAYnVmZmVyc1xuICAgIEBzZXRQYXRocyhzdGF0ZS5wYXRocylcblxuICBzZXJpYWxpemU6IChvcHRpb25zPXt9KSAtPlxuICAgIGRlc2VyaWFsaXplcjogJ1Byb2plY3QnXG4gICAgcGF0aHM6IEBnZXRQYXRocygpXG4gICAgYnVmZmVyczogXy5jb21wYWN0KEBidWZmZXJzLm1hcCAoYnVmZmVyKSAtPlxuICAgICAgaWYgYnVmZmVyLmlzUmV0YWluZWQoKVxuICAgICAgICBzdGF0ZSA9IGJ1ZmZlci5zZXJpYWxpemUoe21hcmtlckxheWVyczogb3B0aW9ucy5pc1VubG9hZGluZyBpcyB0cnVlfSlcbiAgICAgICAgIyBTa2lwIHNhdmluZyBsYXJnZSBidWZmZXIgdGV4dCB1bmxlc3MgdW5sb2FkaW5nIHRvIGF2b2lkIGJsb2NraW5nIG1haW4gdGhyZWFkXG4gICAgICAgIGlmIG5vdCBvcHRpb25zLmlzVW5sb2FkaW5nIGFuZCBzdGF0ZS50ZXh0Lmxlbmd0aCA+IDIgKiAxMDI0ICogMTAyNFxuICAgICAgICAgIGRlbGV0ZSBzdGF0ZS50ZXh0XG4gICAgICAgICAgZGVsZXRlIHN0YXRlLmRpZ2VzdFdoZW5MYXN0UGVyc2lzdGVkXG4gICAgICAgIHN0YXRlXG4gICAgKVxuXG4gICMjI1xuICBTZWN0aW9uOiBFdmVudCBTdWJzY3JpcHRpb25cbiAgIyMjXG5cbiAgIyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiB0aGUgcHJvamVjdCBwYXRocyBjaGFuZ2UuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIHByb2plY3QgcGF0aHMgY2hhbmdlLlxuICAjICAgICogYHByb2plY3RQYXRoc2AgQW4ge0FycmF5fSBvZiB7U3RyaW5nfSBwcm9qZWN0IHBhdGhzLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VQYXRoczogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLXBhdGhzJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIGEgdGV4dCBidWZmZXIgaXMgYWRkZWQgdG8gdGhlXG4gICMgcHJvamVjdC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aGVuIGEgdGV4dCBidWZmZXIgaXMgYWRkZWQuXG4gICMgICAqIGBidWZmZXJgIEEge1RleHRCdWZmZXJ9IGl0ZW0uXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZEFkZEJ1ZmZlcjogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtYWRkLWJ1ZmZlcicsIGNhbGxiYWNrXG5cbiAgIyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2l0aCBhbGwgY3VycmVudCBhbmQgZnV0dXJlIHRleHRcbiAgIyBidWZmZXJzIGluIHRoZSBwcm9qZWN0LlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdpdGggY3VycmVudCBhbmQgZnV0dXJlIHRleHQgYnVmZmVycy5cbiAgIyAgICogYGJ1ZmZlcmAgQSB7VGV4dEJ1ZmZlcn0gaXRlbS5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9ic2VydmVCdWZmZXJzOiAoY2FsbGJhY2spIC0+XG4gICAgY2FsbGJhY2soYnVmZmVyKSBmb3IgYnVmZmVyIGluIEBnZXRCdWZmZXJzKClcbiAgICBAb25EaWRBZGRCdWZmZXIgY2FsbGJhY2tcblxuICAjIyNcbiAgU2VjdGlvbjogQWNjZXNzaW5nIHRoZSBnaXQgcmVwb3NpdG9yeVxuICAjIyNcblxuICAjIFB1YmxpYzogR2V0IGFuIHtBcnJheX0gb2Yge0dpdFJlcG9zaXRvcnl9cyBhc3NvY2lhdGVkIHdpdGggdGhlIHByb2plY3Qnc1xuICAjIGRpcmVjdG9yaWVzLlxuICAjXG4gICMgVGhpcyBtZXRob2Qgd2lsbCBiZSByZW1vdmVkIGluIDIuMCBiZWNhdXNlIGl0IGRvZXMgc3luY2hyb25vdXMgSS9PLlxuICAjIFByZWZlciB0aGUgZm9sbG93aW5nLCB3aGljaCBldmFsdWF0ZXMgdG8gYSB7UHJvbWlzZX0gdGhhdCByZXNvbHZlcyB0byBhblxuICAjIHtBcnJheX0gb2Yge1JlcG9zaXRvcnl9IG9iamVjdHM6XG4gICMgYGBgXG4gICMgUHJvbWlzZS5hbGwoYXRvbS5wcm9qZWN0LmdldERpcmVjdG9yaWVzKCkubWFwKFxuICAjICAgICBhdG9tLnByb2plY3QucmVwb3NpdG9yeUZvckRpcmVjdG9yeS5iaW5kKGF0b20ucHJvamVjdCkpKVxuICAjIGBgYFxuICBnZXRSZXBvc2l0b3JpZXM6IC0+IEByZXBvc2l0b3JpZXNcblxuICAjIFB1YmxpYzogR2V0IHRoZSByZXBvc2l0b3J5IGZvciBhIGdpdmVuIGRpcmVjdG9yeSBhc3luY2hyb25vdXNseS5cbiAgI1xuICAjICogYGRpcmVjdG9yeWAge0RpcmVjdG9yeX0gZm9yIHdoaWNoIHRvIGdldCBhIHtSZXBvc2l0b3J5fS5cbiAgI1xuICAjIFJldHVybnMgYSB7UHJvbWlzZX0gdGhhdCByZXNvbHZlcyB3aXRoIGVpdGhlcjpcbiAgIyAqIHtSZXBvc2l0b3J5fSBpZiBhIHJlcG9zaXRvcnkgY2FuIGJlIGNyZWF0ZWQgZm9yIHRoZSBnaXZlbiBkaXJlY3RvcnlcbiAgIyAqIGBudWxsYCBpZiBubyByZXBvc2l0b3J5IGNhbiBiZSBjcmVhdGVkIGZvciB0aGUgZ2l2ZW4gZGlyZWN0b3J5LlxuICByZXBvc2l0b3J5Rm9yRGlyZWN0b3J5OiAoZGlyZWN0b3J5KSAtPlxuICAgIHBhdGhGb3JEaXJlY3RvcnkgPSBkaXJlY3RvcnkuZ2V0UmVhbFBhdGhTeW5jKClcbiAgICBwcm9taXNlID0gQHJlcG9zaXRvcnlQcm9taXNlc0J5UGF0aC5nZXQocGF0aEZvckRpcmVjdG9yeSlcbiAgICB1bmxlc3MgcHJvbWlzZVxuICAgICAgcHJvbWlzZXMgPSBAcmVwb3NpdG9yeVByb3ZpZGVycy5tYXAgKHByb3ZpZGVyKSAtPlxuICAgICAgICBwcm92aWRlci5yZXBvc2l0b3J5Rm9yRGlyZWN0b3J5KGRpcmVjdG9yeSlcbiAgICAgIHByb21pc2UgPSBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbiAocmVwb3NpdG9yaWVzKSA9PlxuICAgICAgICByZXBvID0gXy5maW5kKHJlcG9zaXRvcmllcywgKHJlcG8pIC0+IHJlcG8/KSA/IG51bGxcblxuICAgICAgICAjIElmIG5vIHJlcG9zaXRvcnkgaXMgZm91bmQsIHJlbW92ZSB0aGUgZW50cnkgaW4gZm9yIHRoZSBkaXJlY3RvcnkgaW5cbiAgICAgICAgIyBAcmVwb3NpdG9yeVByb21pc2VzQnlQYXRoIGluIGNhc2Ugc29tZSBvdGhlciBSZXBvc2l0b3J5UHJvdmlkZXIgaXNcbiAgICAgICAgIyByZWdpc3RlcmVkIGluIHRoZSBmdXR1cmUgdGhhdCBjb3VsZCBzdXBwbHkgYSBSZXBvc2l0b3J5IGZvciB0aGVcbiAgICAgICAgIyBkaXJlY3RvcnkuXG4gICAgICAgIEByZXBvc2l0b3J5UHJvbWlzZXNCeVBhdGguZGVsZXRlKHBhdGhGb3JEaXJlY3RvcnkpIHVubGVzcyByZXBvP1xuICAgICAgICByZXBvPy5vbkRpZERlc3Ryb3k/KD0+IEByZXBvc2l0b3J5UHJvbWlzZXNCeVBhdGguZGVsZXRlKHBhdGhGb3JEaXJlY3RvcnkpKVxuICAgICAgICByZXBvXG4gICAgICBAcmVwb3NpdG9yeVByb21pc2VzQnlQYXRoLnNldChwYXRoRm9yRGlyZWN0b3J5LCBwcm9taXNlKVxuICAgIHByb21pc2VcblxuICAjIyNcbiAgU2VjdGlvbjogTWFuYWdpbmcgUGF0aHNcbiAgIyMjXG5cbiAgIyBQdWJsaWM6IEdldCBhbiB7QXJyYXl9IG9mIHtTdHJpbmd9cyBjb250YWluaW5nIHRoZSBwYXRocyBvZiB0aGUgcHJvamVjdCdzXG4gICMgZGlyZWN0b3JpZXMuXG4gIGdldFBhdGhzOiAtPiByb290RGlyZWN0b3J5LmdldFBhdGgoKSBmb3Igcm9vdERpcmVjdG9yeSBpbiBAcm9vdERpcmVjdG9yaWVzXG5cbiAgIyBQdWJsaWM6IFNldCB0aGUgcGF0aHMgb2YgdGhlIHByb2plY3QncyBkaXJlY3Rvcmllcy5cbiAgI1xuICAjICogYHByb2plY3RQYXRoc2Age0FycmF5fSBvZiB7U3RyaW5nfSBwYXRocy5cbiAgc2V0UGF0aHM6IChwcm9qZWN0UGF0aHMpIC0+XG4gICAgcmVwb3NpdG9yeT8uZGVzdHJveSgpIGZvciByZXBvc2l0b3J5IGluIEByZXBvc2l0b3JpZXNcbiAgICBAcm9vdERpcmVjdG9yaWVzID0gW11cbiAgICBAcmVwb3NpdG9yaWVzID0gW11cblxuICAgIEBhZGRQYXRoKHByb2plY3RQYXRoLCBlbWl0RXZlbnQ6IGZhbHNlKSBmb3IgcHJvamVjdFBhdGggaW4gcHJvamVjdFBhdGhzXG5cbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLXBhdGhzJywgcHJvamVjdFBhdGhzXG5cbiAgIyBQdWJsaWM6IEFkZCBhIHBhdGggdG8gdGhlIHByb2plY3QncyBsaXN0IG9mIHJvb3QgcGF0aHNcbiAgI1xuICAjICogYHByb2plY3RQYXRoYCB7U3RyaW5nfSBUaGUgcGF0aCB0byB0aGUgZGlyZWN0b3J5IHRvIGFkZC5cbiAgYWRkUGF0aDogKHByb2plY3RQYXRoLCBvcHRpb25zKSAtPlxuICAgIGRpcmVjdG9yeSA9IEBnZXREaXJlY3RvcnlGb3JQcm9qZWN0UGF0aChwcm9qZWN0UGF0aClcbiAgICByZXR1cm4gdW5sZXNzIGRpcmVjdG9yeS5leGlzdHNTeW5jKClcbiAgICBmb3IgZXhpc3RpbmdEaXJlY3RvcnkgaW4gQGdldERpcmVjdG9yaWVzKClcbiAgICAgIHJldHVybiBpZiBleGlzdGluZ0RpcmVjdG9yeS5nZXRQYXRoKCkgaXMgZGlyZWN0b3J5LmdldFBhdGgoKVxuXG4gICAgQHJvb3REaXJlY3Rvcmllcy5wdXNoKGRpcmVjdG9yeSlcblxuICAgIHJlcG8gPSBudWxsXG4gICAgZm9yIHByb3ZpZGVyIGluIEByZXBvc2l0b3J5UHJvdmlkZXJzXG4gICAgICBicmVhayBpZiByZXBvID0gcHJvdmlkZXIucmVwb3NpdG9yeUZvckRpcmVjdG9yeVN5bmM/KGRpcmVjdG9yeSlcbiAgICBAcmVwb3NpdG9yaWVzLnB1c2gocmVwbyA/IG51bGwpXG5cbiAgICB1bmxlc3Mgb3B0aW9ucz8uZW1pdEV2ZW50IGlzIGZhbHNlXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLXBhdGhzJywgQGdldFBhdGhzKClcblxuICBnZXREaXJlY3RvcnlGb3JQcm9qZWN0UGF0aDogKHByb2plY3RQYXRoKSAtPlxuICAgIGRpcmVjdG9yeSA9IG51bGxcbiAgICBmb3IgcHJvdmlkZXIgaW4gQGRpcmVjdG9yeVByb3ZpZGVyc1xuICAgICAgYnJlYWsgaWYgZGlyZWN0b3J5ID0gcHJvdmlkZXIuZGlyZWN0b3J5Rm9yVVJJU3luYz8ocHJvamVjdFBhdGgpXG4gICAgZGlyZWN0b3J5ID89IEBkZWZhdWx0RGlyZWN0b3J5UHJvdmlkZXIuZGlyZWN0b3J5Rm9yVVJJU3luYyhwcm9qZWN0UGF0aClcbiAgICBkaXJlY3RvcnlcblxuICAjIFB1YmxpYzogcmVtb3ZlIGEgcGF0aCBmcm9tIHRoZSBwcm9qZWN0J3MgbGlzdCBvZiByb290IHBhdGhzLlxuICAjXG4gICMgKiBgcHJvamVjdFBhdGhgIHtTdHJpbmd9IFRoZSBwYXRoIHRvIHJlbW92ZS5cbiAgcmVtb3ZlUGF0aDogKHByb2plY3RQYXRoKSAtPlxuICAgICMgVGhlIHByb2plY3RQYXRoIG1heSBiZSBhIFVSSSwgaW4gd2hpY2ggY2FzZSBpdCBzaG91bGQgbm90IGJlIG5vcm1hbGl6ZWQuXG4gICAgdW5sZXNzIHByb2plY3RQYXRoIGluIEBnZXRQYXRocygpXG4gICAgICBwcm9qZWN0UGF0aCA9IEBkZWZhdWx0RGlyZWN0b3J5UHJvdmlkZXIubm9ybWFsaXplUGF0aChwcm9qZWN0UGF0aClcblxuICAgIGluZGV4VG9SZW1vdmUgPSBudWxsXG4gICAgZm9yIGRpcmVjdG9yeSwgaSBpbiBAcm9vdERpcmVjdG9yaWVzXG4gICAgICBpZiBkaXJlY3RvcnkuZ2V0UGF0aCgpIGlzIHByb2plY3RQYXRoXG4gICAgICAgIGluZGV4VG9SZW1vdmUgPSBpXG4gICAgICAgIGJyZWFrXG5cbiAgICBpZiBpbmRleFRvUmVtb3ZlP1xuICAgICAgW3JlbW92ZWREaXJlY3RvcnldID0gQHJvb3REaXJlY3Rvcmllcy5zcGxpY2UoaW5kZXhUb1JlbW92ZSwgMSlcbiAgICAgIFtyZW1vdmVkUmVwb3NpdG9yeV0gPSBAcmVwb3NpdG9yaWVzLnNwbGljZShpbmRleFRvUmVtb3ZlLCAxKVxuICAgICAgcmVtb3ZlZFJlcG9zaXRvcnk/LmRlc3Ryb3koKSB1bmxlc3MgcmVtb3ZlZFJlcG9zaXRvcnkgaW4gQHJlcG9zaXRvcmllc1xuICAgICAgQGVtaXR0ZXIuZW1pdCBcImRpZC1jaGFuZ2UtcGF0aHNcIiwgQGdldFBhdGhzKClcbiAgICAgIHRydWVcbiAgICBlbHNlXG4gICAgICBmYWxzZVxuXG4gICMgUHVibGljOiBHZXQgYW4ge0FycmF5fSBvZiB7RGlyZWN0b3J5fXMgYXNzb2NpYXRlZCB3aXRoIHRoaXMgcHJvamVjdC5cbiAgZ2V0RGlyZWN0b3JpZXM6IC0+XG4gICAgQHJvb3REaXJlY3Rvcmllc1xuXG4gIHJlc29sdmVQYXRoOiAodXJpKSAtPlxuICAgIHJldHVybiB1bmxlc3MgdXJpXG5cbiAgICBpZiB1cmk/Lm1hdGNoKC9bQS1aYS16MC05Ky0uXSs6XFwvXFwvLykgIyBsZWF2ZSBwYXRoIGFsb25lIGlmIGl0IGhhcyBhIHNjaGVtZVxuICAgICAgdXJpXG4gICAgZWxzZVxuICAgICAgaWYgZnMuaXNBYnNvbHV0ZSh1cmkpXG4gICAgICAgIEBkZWZhdWx0RGlyZWN0b3J5UHJvdmlkZXIubm9ybWFsaXplUGF0aChmcy5yZXNvbHZlSG9tZSh1cmkpKVxuICAgICAgIyBUT0RPOiB3aGF0IHNob3VsZCB3ZSBkbyBoZXJlIHdoZW4gdGhlcmUgYXJlIG11bHRpcGxlIGRpcmVjdG9yaWVzP1xuICAgICAgZWxzZSBpZiBwcm9qZWN0UGF0aCA9IEBnZXRQYXRocygpWzBdXG4gICAgICAgIEBkZWZhdWx0RGlyZWN0b3J5UHJvdmlkZXIubm9ybWFsaXplUGF0aChmcy5yZXNvbHZlSG9tZShwYXRoLmpvaW4ocHJvamVjdFBhdGgsIHVyaSkpKVxuICAgICAgZWxzZVxuICAgICAgICB1bmRlZmluZWRcblxuICByZWxhdGl2aXplOiAoZnVsbFBhdGgpIC0+XG4gICAgQHJlbGF0aXZpemVQYXRoKGZ1bGxQYXRoKVsxXVxuXG4gICMgUHVibGljOiBHZXQgdGhlIHBhdGggdG8gdGhlIHByb2plY3QgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgdGhlIGdpdmVuIHBhdGgsXG4gICMgYW5kIHRoZSByZWxhdGl2ZSBwYXRoIGZyb20gdGhhdCBwcm9qZWN0IGRpcmVjdG9yeSB0byB0aGUgZ2l2ZW4gcGF0aC5cbiAgI1xuICAjICogYGZ1bGxQYXRoYCB7U3RyaW5nfSBBbiBhYnNvbHV0ZSBwYXRoLlxuICAjXG4gICMgUmV0dXJucyBhbiB7QXJyYXl9IHdpdGggdHdvIGVsZW1lbnRzOlxuICAjICogYHByb2plY3RQYXRoYCBUaGUge1N0cmluZ30gcGF0aCB0byB0aGUgcHJvamVjdCBkaXJlY3RvcnkgdGhhdCBjb250YWlucyB0aGVcbiAgIyAgIGdpdmVuIHBhdGgsIG9yIGBudWxsYCBpZiBub25lIGlzIGZvdW5kLlxuICAjICogYHJlbGF0aXZlUGF0aGAge1N0cmluZ30gVGhlIHJlbGF0aXZlIHBhdGggZnJvbSB0aGUgcHJvamVjdCBkaXJlY3RvcnkgdG9cbiAgIyAgIHRoZSBnaXZlbiBwYXRoLlxuICByZWxhdGl2aXplUGF0aDogKGZ1bGxQYXRoKSAtPlxuICAgIHJlc3VsdCA9IFtudWxsLCBmdWxsUGF0aF1cbiAgICBpZiBmdWxsUGF0aD9cbiAgICAgIGZvciByb290RGlyZWN0b3J5IGluIEByb290RGlyZWN0b3JpZXNcbiAgICAgICAgcmVsYXRpdmVQYXRoID0gcm9vdERpcmVjdG9yeS5yZWxhdGl2aXplKGZ1bGxQYXRoKVxuICAgICAgICBpZiByZWxhdGl2ZVBhdGg/Lmxlbmd0aCA8IHJlc3VsdFsxXS5sZW5ndGhcbiAgICAgICAgICByZXN1bHQgPSBbcm9vdERpcmVjdG9yeS5nZXRQYXRoKCksIHJlbGF0aXZlUGF0aF1cbiAgICByZXN1bHRcblxuICAjIFB1YmxpYzogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBnaXZlbiBwYXRoIChyZWFsIG9yIHN5bWJvbGljKSBpcyBpbnNpZGUgdGhlXG4gICMgcHJvamVjdCdzIGRpcmVjdG9yeS5cbiAgI1xuICAjIFRoaXMgbWV0aG9kIGRvZXMgbm90IGFjdHVhbGx5IGNoZWNrIGlmIHRoZSBwYXRoIGV4aXN0cywgaXQganVzdCBjaGVja3MgdGhlaXJcbiAgIyBsb2NhdGlvbnMgcmVsYXRpdmUgdG8gZWFjaCBvdGhlci5cbiAgI1xuICAjICMjIEV4YW1wbGVzXG4gICNcbiAgIyBCYXNpYyBvcGVyYXRpb25cbiAgI1xuICAjIGBgYGNvZmZlZVxuICAjICMgUHJvamVjdCdzIHJvb3QgZGlyZWN0b3J5IGlzIC9mb28vYmFyXG4gICMgcHJvamVjdC5jb250YWlucygnL2Zvby9iYXIvYmF6JykgICAgICAgICMgPT4gdHJ1ZVxuICAjIHByb2plY3QuY29udGFpbnMoJy91c3IvbGliL2JheicpICAgICAgICAjID0+IGZhbHNlXG4gICMgYGBgXG4gICNcbiAgIyBFeGlzdGVuY2Ugb2YgdGhlIHBhdGggaXMgbm90IHJlcXVpcmVkXG4gICNcbiAgIyBgYGBjb2ZmZWVcbiAgIyAjIFByb2plY3QncyByb290IGRpcmVjdG9yeSBpcyAvZm9vL2JhclxuICAjIGZzLmV4aXN0c1N5bmMoJy9mb28vYmFyL2JheicpICAgICAgICAgICAjID0+IGZhbHNlXG4gICMgcHJvamVjdC5jb250YWlucygnL2Zvby9iYXIvYmF6JykgICAgICAgICMgPT4gdHJ1ZVxuICAjIGBgYFxuICAjXG4gICMgKiBgcGF0aFRvQ2hlY2tgIHtTdHJpbmd9IHBhdGhcbiAgI1xuICAjIFJldHVybnMgd2hldGhlciB0aGUgcGF0aCBpcyBpbnNpZGUgdGhlIHByb2plY3QncyByb290IGRpcmVjdG9yeS5cbiAgY29udGFpbnM6IChwYXRoVG9DaGVjaykgLT5cbiAgICBAcm9vdERpcmVjdG9yaWVzLnNvbWUgKGRpcikgLT4gZGlyLmNvbnRhaW5zKHBhdGhUb0NoZWNrKVxuXG4gICMjI1xuICBTZWN0aW9uOiBQcml2YXRlXG4gICMjI1xuXG4gIGNvbnN1bWVTZXJ2aWNlczogKHtzZXJ2aWNlSHVifSkgLT5cbiAgICBzZXJ2aWNlSHViLmNvbnN1bWUoXG4gICAgICAnYXRvbS5kaXJlY3RvcnktcHJvdmlkZXInLFxuICAgICAgJ14wLjEuMCcsXG4gICAgICAocHJvdmlkZXIpID0+XG4gICAgICAgIEBkaXJlY3RvcnlQcm92aWRlcnMudW5zaGlmdChwcm92aWRlcilcbiAgICAgICAgbmV3IERpc3Bvc2FibGUgPT5cbiAgICAgICAgICBAZGlyZWN0b3J5UHJvdmlkZXJzLnNwbGljZShAZGlyZWN0b3J5UHJvdmlkZXJzLmluZGV4T2YocHJvdmlkZXIpLCAxKVxuICAgIClcblxuICAgIHNlcnZpY2VIdWIuY29uc3VtZShcbiAgICAgICdhdG9tLnJlcG9zaXRvcnktcHJvdmlkZXInLFxuICAgICAgJ14wLjEuMCcsXG4gICAgICAocHJvdmlkZXIpID0+XG4gICAgICAgIEByZXBvc2l0b3J5UHJvdmlkZXJzLnVuc2hpZnQocHJvdmlkZXIpXG4gICAgICAgIEBzZXRQYXRocyhAZ2V0UGF0aHMoKSkgaWYgbnVsbCBpbiBAcmVwb3NpdG9yaWVzXG4gICAgICAgIG5ldyBEaXNwb3NhYmxlID0+XG4gICAgICAgICAgQHJlcG9zaXRvcnlQcm92aWRlcnMuc3BsaWNlKEByZXBvc2l0b3J5UHJvdmlkZXJzLmluZGV4T2YocHJvdmlkZXIpLCAxKVxuICAgIClcblxuICAjIFJldHJpZXZlcyBhbGwgdGhlIHtUZXh0QnVmZmVyfXMgaW4gdGhlIHByb2plY3Q7IHRoYXQgaXMsIHRoZVxuICAjIGJ1ZmZlcnMgZm9yIGFsbCBvcGVuIGZpbGVzLlxuICAjXG4gICMgUmV0dXJucyBhbiB7QXJyYXl9IG9mIHtUZXh0QnVmZmVyfXMuXG4gIGdldEJ1ZmZlcnM6IC0+XG4gICAgQGJ1ZmZlcnMuc2xpY2UoKVxuXG4gICMgSXMgdGhlIGJ1ZmZlciBmb3IgdGhlIGdpdmVuIHBhdGggbW9kaWZpZWQ/XG4gIGlzUGF0aE1vZGlmaWVkOiAoZmlsZVBhdGgpIC0+XG4gICAgQGZpbmRCdWZmZXJGb3JQYXRoKEByZXNvbHZlUGF0aChmaWxlUGF0aCkpPy5pc01vZGlmaWVkKClcblxuICBmaW5kQnVmZmVyRm9yUGF0aDogKGZpbGVQYXRoKSAtPlxuICAgIF8uZmluZCBAYnVmZmVycywgKGJ1ZmZlcikgLT4gYnVmZmVyLmdldFBhdGgoKSBpcyBmaWxlUGF0aFxuXG4gIGZpbmRCdWZmZXJGb3JJZDogKGlkKSAtPlxuICAgIF8uZmluZCBAYnVmZmVycywgKGJ1ZmZlcikgLT4gYnVmZmVyLmdldElkKCkgaXMgaWRcblxuICAjIE9ubHkgdG8gYmUgdXNlZCBpbiBzcGVjc1xuICBidWZmZXJGb3JQYXRoU3luYzogKGZpbGVQYXRoKSAtPlxuICAgIGFic29sdXRlRmlsZVBhdGggPSBAcmVzb2x2ZVBhdGgoZmlsZVBhdGgpXG4gICAgZXhpc3RpbmdCdWZmZXIgPSBAZmluZEJ1ZmZlckZvclBhdGgoYWJzb2x1dGVGaWxlUGF0aCkgaWYgZmlsZVBhdGhcbiAgICBleGlzdGluZ0J1ZmZlciA/IEBidWlsZEJ1ZmZlclN5bmMoYWJzb2x1dGVGaWxlUGF0aClcblxuICAjIE9ubHkgdG8gYmUgdXNlZCB3aGVuIGRlc2VyaWFsaXppbmdcbiAgYnVmZmVyRm9ySWRTeW5jOiAoaWQpIC0+XG4gICAgZXhpc3RpbmdCdWZmZXIgPSBAZmluZEJ1ZmZlckZvcklkKGlkKSBpZiBpZFxuICAgIGV4aXN0aW5nQnVmZmVyID8gQGJ1aWxkQnVmZmVyU3luYygpXG5cbiAgIyBHaXZlbiBhIGZpbGUgcGF0aCwgdGhpcyByZXRyaWV2ZXMgb3IgY3JlYXRlcyBhIG5ldyB7VGV4dEJ1ZmZlcn0uXG4gICNcbiAgIyBJZiB0aGUgYGZpbGVQYXRoYCBhbHJlYWR5IGhhcyBhIGBidWZmZXJgLCB0aGF0IHZhbHVlIGlzIHVzZWQgaW5zdGVhZC4gT3RoZXJ3aXNlLFxuICAjIGB0ZXh0YCBpcyB1c2VkIGFzIHRoZSBjb250ZW50cyBvZiB0aGUgbmV3IGJ1ZmZlci5cbiAgI1xuICAjICogYGZpbGVQYXRoYCBBIHtTdHJpbmd9IHJlcHJlc2VudGluZyBhIHBhdGguIElmIGBudWxsYCwgYW4gXCJVbnRpdGxlZFwiIGJ1ZmZlciBpcyBjcmVhdGVkLlxuICAjXG4gICMgUmV0dXJucyBhIHtQcm9taXNlfSB0aGF0IHJlc29sdmVzIHRvIHRoZSB7VGV4dEJ1ZmZlcn0uXG4gIGJ1ZmZlckZvclBhdGg6IChhYnNvbHV0ZUZpbGVQYXRoKSAtPlxuICAgIGV4aXN0aW5nQnVmZmVyID0gQGZpbmRCdWZmZXJGb3JQYXRoKGFic29sdXRlRmlsZVBhdGgpIGlmIGFic29sdXRlRmlsZVBhdGg/XG4gICAgaWYgZXhpc3RpbmdCdWZmZXJcbiAgICAgIFByb21pc2UucmVzb2x2ZShleGlzdGluZ0J1ZmZlcilcbiAgICBlbHNlXG4gICAgICBAYnVpbGRCdWZmZXIoYWJzb2x1dGVGaWxlUGF0aClcblxuICBzaG91bGREZXN0cm95QnVmZmVyT25GaWxlRGVsZXRlOiAtPlxuICAgIGF0b20uY29uZmlnLmdldCgnY29yZS5jbG9zZURlbGV0ZWRGaWxlVGFicycpXG5cbiAgIyBTdGlsbCBuZWVkZWQgd2hlbiBkZXNlcmlhbGl6aW5nIGEgdG9rZW5pemVkIGJ1ZmZlclxuICBidWlsZEJ1ZmZlclN5bmM6IChhYnNvbHV0ZUZpbGVQYXRoKSAtPlxuICAgIGJ1ZmZlciA9IG5ldyBUZXh0QnVmZmVyKHtcbiAgICAgIGZpbGVQYXRoOiBhYnNvbHV0ZUZpbGVQYXRoXG4gICAgICBzaG91bGREZXN0cm95T25GaWxlRGVsZXRlOiBAc2hvdWxkRGVzdHJveUJ1ZmZlck9uRmlsZURlbGV0ZX0pXG4gICAgQGFkZEJ1ZmZlcihidWZmZXIpXG4gICAgYnVmZmVyLmxvYWRTeW5jKClcbiAgICBidWZmZXJcblxuICAjIEdpdmVuIGEgZmlsZSBwYXRoLCB0aGlzIHNldHMgaXRzIHtUZXh0QnVmZmVyfS5cbiAgI1xuICAjICogYGFic29sdXRlRmlsZVBhdGhgIEEge1N0cmluZ30gcmVwcmVzZW50aW5nIGEgcGF0aC5cbiAgIyAqIGB0ZXh0YCBUaGUge1N0cmluZ30gdGV4dCB0byB1c2UgYXMgYSBidWZmZXIuXG4gICNcbiAgIyBSZXR1cm5zIGEge1Byb21pc2V9IHRoYXQgcmVzb2x2ZXMgdG8gdGhlIHtUZXh0QnVmZmVyfS5cbiAgYnVpbGRCdWZmZXI6IChhYnNvbHV0ZUZpbGVQYXRoKSAtPlxuICAgIGJ1ZmZlciA9IG5ldyBUZXh0QnVmZmVyKHtcbiAgICAgIGZpbGVQYXRoOiBhYnNvbHV0ZUZpbGVQYXRoXG4gICAgICBzaG91bGREZXN0cm95T25GaWxlRGVsZXRlOiBAc2hvdWxkRGVzdHJveUJ1ZmZlck9uRmlsZURlbGV0ZX0pXG4gICAgQGFkZEJ1ZmZlcihidWZmZXIpXG4gICAgYnVmZmVyLmxvYWQoKVxuICAgICAgLnRoZW4oKGJ1ZmZlcikgLT4gYnVmZmVyKVxuICAgICAgLmNhdGNoKD0+IEByZW1vdmVCdWZmZXIoYnVmZmVyKSlcblxuICBhZGRCdWZmZXI6IChidWZmZXIsIG9wdGlvbnM9e30pIC0+XG4gICAgQGFkZEJ1ZmZlckF0SW5kZXgoYnVmZmVyLCBAYnVmZmVycy5sZW5ndGgsIG9wdGlvbnMpXG5cbiAgYWRkQnVmZmVyQXRJbmRleDogKGJ1ZmZlciwgaW5kZXgsIG9wdGlvbnM9e30pIC0+XG4gICAgQGJ1ZmZlcnMuc3BsaWNlKGluZGV4LCAwLCBidWZmZXIpXG4gICAgQHN1YnNjcmliZVRvQnVmZmVyKGJ1ZmZlcilcbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtYWRkLWJ1ZmZlcicsIGJ1ZmZlclxuICAgIGJ1ZmZlclxuXG4gICMgUmVtb3ZlcyBhIHtUZXh0QnVmZmVyfSBhc3NvY2lhdGlvbiBmcm9tIHRoZSBwcm9qZWN0LlxuICAjXG4gICMgUmV0dXJucyB0aGUgcmVtb3ZlZCB7VGV4dEJ1ZmZlcn0uXG4gIHJlbW92ZUJ1ZmZlcjogKGJ1ZmZlcikgLT5cbiAgICBpbmRleCA9IEBidWZmZXJzLmluZGV4T2YoYnVmZmVyKVxuICAgIEByZW1vdmVCdWZmZXJBdEluZGV4KGluZGV4KSB1bmxlc3MgaW5kZXggaXMgLTFcblxuICByZW1vdmVCdWZmZXJBdEluZGV4OiAoaW5kZXgsIG9wdGlvbnM9e30pIC0+XG4gICAgW2J1ZmZlcl0gPSBAYnVmZmVycy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgYnVmZmVyPy5kZXN0cm95KClcblxuICBlYWNoQnVmZmVyOiAoYXJncy4uLikgLT5cbiAgICBzdWJzY3JpYmVyID0gYXJncy5zaGlmdCgpIGlmIGFyZ3MubGVuZ3RoID4gMVxuICAgIGNhbGxiYWNrID0gYXJncy5zaGlmdCgpXG5cbiAgICBjYWxsYmFjayhidWZmZXIpIGZvciBidWZmZXIgaW4gQGdldEJ1ZmZlcnMoKVxuICAgIGlmIHN1YnNjcmliZXJcbiAgICAgIHN1YnNjcmliZXIuc3Vic2NyaWJlIHRoaXMsICdidWZmZXItY3JlYXRlZCcsIChidWZmZXIpIC0+IGNhbGxiYWNrKGJ1ZmZlcilcbiAgICBlbHNlXG4gICAgICBAb24gJ2J1ZmZlci1jcmVhdGVkJywgKGJ1ZmZlcikgLT4gY2FsbGJhY2soYnVmZmVyKVxuXG4gIHN1YnNjcmliZVRvQnVmZmVyOiAoYnVmZmVyKSAtPlxuICAgIGJ1ZmZlci5vbldpbGxTYXZlICh7cGF0aH0pID0+IEBhcHBsaWNhdGlvbkRlbGVnYXRlLmVtaXRXaWxsU2F2ZVBhdGgocGF0aClcbiAgICBidWZmZXIub25EaWRTYXZlICh7cGF0aH0pID0+IEBhcHBsaWNhdGlvbkRlbGVnYXRlLmVtaXREaWRTYXZlUGF0aChwYXRoKVxuICAgIGJ1ZmZlci5vbkRpZERlc3Ryb3kgPT4gQHJlbW92ZUJ1ZmZlcihidWZmZXIpXG4gICAgYnVmZmVyLm9uRGlkQ2hhbmdlUGF0aCA9PlxuICAgICAgdW5sZXNzIEBnZXRQYXRocygpLmxlbmd0aCA+IDBcbiAgICAgICAgQHNldFBhdGhzKFtwYXRoLmRpcm5hbWUoYnVmZmVyLmdldFBhdGgoKSldKVxuICAgIGJ1ZmZlci5vbldpbGxUaHJvd1dhdGNoRXJyb3IgKHtlcnJvciwgaGFuZGxlfSkgPT5cbiAgICAgIGhhbmRsZSgpXG4gICAgICBAbm90aWZpY2F0aW9uTWFuYWdlci5hZGRXYXJuaW5nIFwiXCJcIlxuICAgICAgICBVbmFibGUgdG8gcmVhZCBmaWxlIGFmdGVyIGZpbGUgYCN7ZXJyb3IuZXZlbnRUeXBlfWAgZXZlbnQuXG4gICAgICAgIE1ha2Ugc3VyZSB5b3UgaGF2ZSBwZXJtaXNzaW9uIHRvIGFjY2VzcyBgI3tidWZmZXIuZ2V0UGF0aCgpfWAuXG4gICAgICAgIFwiXCJcIixcbiAgICAgICAgZGV0YWlsOiBlcnJvci5tZXNzYWdlXG4gICAgICAgIGRpc21pc3NhYmxlOiB0cnVlXG4iXX0=
