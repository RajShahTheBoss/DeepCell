(function() {
  var DIR_SEP, EventEmitter, PathFilter, PathScanner, fs, path,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  fs = require("fs");

  path = require("path");

  EventEmitter = require("events").EventEmitter;

  PathFilter = require("./path-filter");

  DIR_SEP = path.sep;

  module.exports = PathScanner = (function(superClass) {
    extend(PathScanner, superClass);

    function PathScanner(rootPath, options) {
      this.rootPath = rootPath;
      this.options = options != null ? options : {};
      this.asyncCallsInProgress = 0;
      this.realPathCache = {};
      this.rootPath = path.resolve(this.rootPath);
      this.rootPathLength = this.rootPath.length;
      this.pathFilter = new PathFilter(this.rootPath, this.options);
    }


    /*
    Section: Scanning
     */

    PathScanner.prototype.scan = function() {
      return this.readDir(this.rootPath);
    };

    PathScanner.prototype.readDir = function(filePath) {
      this.asyncCallStarting();
      return fs.readdir(filePath, (function(_this) {
        return function(err, files) {
          var file, fileCount, filename, prefix;
          if (!files) {
            return _this.asyncCallDone();
          }
          fileCount = files.length;
          prefix = filePath + DIR_SEP;
          while (fileCount--) {
            file = files.shift();
            filename = prefix + file;
            _this.processFile(filename);
          }
          return _this.asyncCallDone();
        };
      })(this));
    };

    PathScanner.prototype.relativize = function(filePath) {
      var i, len;
      len = filePath.length;
      i = this.rootPathLength;
      while (i < len) {
        if (filePath[i] !== DIR_SEP) {
          break;
        }
        i++;
      }
      return filePath.slice(i);
    };

    PathScanner.prototype.processFile = function(filePath) {
      var relPath, stat;
      relPath = this.relativize(filePath);
      stat = this.stat(filePath);
      if (!stat) {
        return;
      }
      if (stat.isFile() && this.pathFilter.isFileAccepted(relPath)) {
        return this.emit('path-found', filePath);
      } else if (stat.isDirectory() && this.pathFilter.isDirectoryAccepted(relPath)) {
        return this.readDir(filePath);
      }
    };

    PathScanner.prototype.stat = function(filePath) {
      var e, stat;
      stat = fs.lstatSync(filePath);
      if (this.options.follow && stat.isSymbolicLink()) {
        if (this.isInternalSymlink(filePath)) {
          return null;
        }
        try {
          stat = fs.statSync(filePath);
        } catch (_error) {
          e = _error;
          return null;
        }
      }
      return stat;
    };

    PathScanner.prototype.isInternalSymlink = function(filePath) {
      var error, realPath;
      realPath = null;
      try {
        realPath = fs.realpathSync(filePath, this.realPathCache);
      } catch (_error) {
        error = _error;
      }
      return (realPath != null ? realPath.search(this.rootPath) : void 0) === 0;
    };

    PathScanner.prototype.asyncCallStarting = function() {
      return this.asyncCallsInProgress++;
    };

    PathScanner.prototype.asyncCallDone = function() {
      if (--this.asyncCallsInProgress === 0) {
        return this.emit('finished-scanning', this);
      }
    };

    return PathScanner;

  })(EventEmitter);

}).call(this);
