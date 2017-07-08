(function() {
  var CompositeDisposable, Disposable, Emitter, GitRepository, GitUtils, Task, _, fs, join, path, ref;

  join = require('path').join;

  _ = require('underscore-plus');

  ref = require('event-kit'), Emitter = ref.Emitter, Disposable = ref.Disposable, CompositeDisposable = ref.CompositeDisposable;

  fs = require('fs-plus');

  path = require('path');

  GitUtils = require('git-utils');

  Task = require('./task');

  module.exports = GitRepository = (function() {
    GitRepository.exists = function(path) {
      var git;
      if (git = this.open(path)) {
        git.destroy();
        return true;
      } else {
        return false;
      }
    };


    /*
    Section: Construction and Destruction
     */

    GitRepository.open = function(path, options) {
      if (!path) {
        return null;
      }
      try {
        return new GitRepository(path, options);
      } catch (error) {
        return null;
      }
    };

    function GitRepository(path, options) {
      var onWindowFocus, ref1, refreshOnWindowFocus, submodulePath, submoduleRepo;
      if (options == null) {
        options = {};
      }
      this.emitter = new Emitter;
      this.subscriptions = new CompositeDisposable;
      this.repo = GitUtils.open(path);
      if (this.repo == null) {
        throw new Error("No Git repository found searching path: " + path);
      }
      this.statuses = {};
      this.upstream = {
        ahead: 0,
        behind: 0
      };
      ref1 = this.repo.submodules;
      for (submodulePath in ref1) {
        submoduleRepo = ref1[submodulePath];
        submoduleRepo.upstream = {
          ahead: 0,
          behind: 0
        };
      }
      this.project = options.project, this.config = options.config, refreshOnWindowFocus = options.refreshOnWindowFocus;
      if (refreshOnWindowFocus == null) {
        refreshOnWindowFocus = true;
      }
      if (refreshOnWindowFocus) {
        onWindowFocus = (function(_this) {
          return function() {
            _this.refreshIndex();
            return _this.refreshStatus();
          };
        })(this);
        window.addEventListener('focus', onWindowFocus);
        this.subscriptions.add(new Disposable(function() {
          return window.removeEventListener('focus', onWindowFocus);
        }));
      }
      if (this.project != null) {
        this.project.getBuffers().forEach((function(_this) {
          return function(buffer) {
            return _this.subscribeToBuffer(buffer);
          };
        })(this));
        this.subscriptions.add(this.project.onDidAddBuffer((function(_this) {
          return function(buffer) {
            return _this.subscribeToBuffer(buffer);
          };
        })(this)));
      }
    }

    GitRepository.prototype.destroy = function() {
      if (this.emitter != null) {
        this.emitter.emit('did-destroy');
        this.emitter.dispose();
        this.emitter = null;
      }
      if (this.statusTask != null) {
        this.statusTask.terminate();
        this.statusTask = null;
      }
      if (this.repo != null) {
        this.repo.release();
        this.repo = null;
      }
      if (this.subscriptions != null) {
        this.subscriptions.dispose();
        return this.subscriptions = null;
      }
    };

    GitRepository.prototype.isDestroyed = function() {
      return this.repo == null;
    };

    GitRepository.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };


    /*
    Section: Event Subscription
     */

    GitRepository.prototype.onDidChangeStatus = function(callback) {
      return this.emitter.on('did-change-status', callback);
    };

    GitRepository.prototype.onDidChangeStatuses = function(callback) {
      return this.emitter.on('did-change-statuses', callback);
    };


    /*
    Section: Repository Details
     */

    GitRepository.prototype.getType = function() {
      return 'git';
    };

    GitRepository.prototype.getPath = function() {
      return this.path != null ? this.path : this.path = fs.absolute(this.getRepo().getPath());
    };

    GitRepository.prototype.getWorkingDirectory = function() {
      return this.getRepo().getWorkingDirectory();
    };

    GitRepository.prototype.isProjectAtRoot = function() {
      var ref1;
      return this.projectAtRoot != null ? this.projectAtRoot : this.projectAtRoot = ((ref1 = this.project) != null ? ref1.relativize(this.getWorkingDirectory()) : void 0) === '';
    };

    GitRepository.prototype.relativize = function(path) {
      return this.getRepo().relativize(path);
    };

    GitRepository.prototype.hasBranch = function(branch) {
      return this.getReferenceTarget("refs/heads/" + branch) != null;
    };

    GitRepository.prototype.getShortHead = function(path) {
      return this.getRepo(path).getShortHead();
    };

    GitRepository.prototype.isSubmodule = function(path) {
      var repo;
      if (!path) {
        return false;
      }
      repo = this.getRepo(path);
      if (repo.isSubmodule(repo.relativize(path))) {
        return true;
      } else {
        return repo !== this.getRepo() && repo.relativize(join(path, 'dir')) === 'dir';
      }
    };

    GitRepository.prototype.getAheadBehindCount = function(reference, path) {
      return this.getRepo(path).getAheadBehindCount(reference);
    };

    GitRepository.prototype.getCachedUpstreamAheadBehindCount = function(path) {
      var ref1;
      return (ref1 = this.getRepo(path).upstream) != null ? ref1 : this.upstream;
    };

    GitRepository.prototype.getConfigValue = function(key, path) {
      return this.getRepo(path).getConfigValue(key);
    };

    GitRepository.prototype.getOriginURL = function(path) {
      return this.getConfigValue('remote.origin.url', path);
    };

    GitRepository.prototype.getUpstreamBranch = function(path) {
      return this.getRepo(path).getUpstreamBranch();
    };

    GitRepository.prototype.getReferences = function(path) {
      return this.getRepo(path).getReferences();
    };

    GitRepository.prototype.getReferenceTarget = function(reference, path) {
      return this.getRepo(path).getReferenceTarget(reference);
    };


    /*
    Section: Reading Status
     */

    GitRepository.prototype.isPathModified = function(path) {
      return this.isStatusModified(this.getPathStatus(path));
    };

    GitRepository.prototype.isPathNew = function(path) {
      return this.isStatusNew(this.getPathStatus(path));
    };

    GitRepository.prototype.isPathIgnored = function(path) {
      return this.getRepo().isIgnored(this.relativize(path));
    };

    GitRepository.prototype.getDirectoryStatus = function(directoryPath) {
      var directoryStatus, ref1, status, statusPath;
      directoryPath = (this.relativize(directoryPath)) + "/";
      directoryStatus = 0;
      ref1 = this.statuses;
      for (statusPath in ref1) {
        status = ref1[statusPath];
        if (statusPath.indexOf(directoryPath) === 0) {
          directoryStatus |= status;
        }
      }
      return directoryStatus;
    };

    GitRepository.prototype.getPathStatus = function(path) {
      var currentPathStatus, pathStatus, ref1, ref2, relativePath, repo;
      repo = this.getRepo(path);
      relativePath = this.relativize(path);
      currentPathStatus = (ref1 = this.statuses[relativePath]) != null ? ref1 : 0;
      pathStatus = (ref2 = repo.getStatus(repo.relativize(path))) != null ? ref2 : 0;
      if (repo.isStatusIgnored(pathStatus)) {
        pathStatus = 0;
      }
      if (pathStatus > 0) {
        this.statuses[relativePath] = pathStatus;
      } else {
        delete this.statuses[relativePath];
      }
      if (currentPathStatus !== pathStatus) {
        this.emitter.emit('did-change-status', {
          path: path,
          pathStatus: pathStatus
        });
      }
      return pathStatus;
    };

    GitRepository.prototype.getCachedPathStatus = function(path) {
      return this.statuses[this.relativize(path)];
    };

    GitRepository.prototype.isStatusModified = function(status) {
      return this.getRepo().isStatusModified(status);
    };

    GitRepository.prototype.isStatusNew = function(status) {
      return this.getRepo().isStatusNew(status);
    };


    /*
    Section: Retrieving Diffs
     */

    GitRepository.prototype.getDiffStats = function(path) {
      var repo;
      repo = this.getRepo(path);
      return repo.getDiffStats(repo.relativize(path));
    };

    GitRepository.prototype.getLineDiffs = function(path, text) {
      var options, repo;
      options = {
        ignoreEolWhitespace: process.platform === 'win32'
      };
      repo = this.getRepo(path);
      return repo.getLineDiffs(repo.relativize(path), text, options);
    };


    /*
    Section: Checking Out
     */

    GitRepository.prototype.checkoutHead = function(path) {
      var headCheckedOut, repo;
      repo = this.getRepo(path);
      headCheckedOut = repo.checkoutHead(repo.relativize(path));
      if (headCheckedOut) {
        this.getPathStatus(path);
      }
      return headCheckedOut;
    };

    GitRepository.prototype.checkoutReference = function(reference, create) {
      return this.getRepo().checkoutReference(reference, create);
    };


    /*
    Section: Private
     */

    GitRepository.prototype.subscribeToBuffer = function(buffer) {
      var bufferSubscriptions, getBufferPathStatus;
      getBufferPathStatus = (function(_this) {
        return function() {
          var bufferPath;
          if (bufferPath = buffer.getPath()) {
            return _this.getPathStatus(bufferPath);
          }
        };
      })(this);
      bufferSubscriptions = new CompositeDisposable;
      bufferSubscriptions.add(buffer.onDidSave(getBufferPathStatus));
      bufferSubscriptions.add(buffer.onDidReload(getBufferPathStatus));
      bufferSubscriptions.add(buffer.onDidChangePath(getBufferPathStatus));
      bufferSubscriptions.add(buffer.onDidDestroy((function(_this) {
        return function() {
          bufferSubscriptions.dispose();
          return _this.subscriptions.remove(bufferSubscriptions);
        };
      })(this)));
      this.subscriptions.add(bufferSubscriptions);
    };

    GitRepository.prototype.checkoutHeadForEditor = function(editor) {
      var filePath;
      if (filePath = editor.getPath()) {
        if (editor.buffer.isModified()) {
          editor.buffer.reload();
        }
        return this.checkoutHead(filePath);
      }
    };

    GitRepository.prototype.getRepo = function(path) {
      var ref1;
      if (this.repo != null) {
        return (ref1 = this.repo.submoduleForPath(path)) != null ? ref1 : this.repo;
      } else {
        throw new Error("Repository has been destroyed");
      }
    };

    GitRepository.prototype.refreshIndex = function() {
      return this.getRepo().refreshIndex();
    };

    GitRepository.prototype.refreshStatus = function() {
      var ref1, ref2, relativeProjectPaths;
      if (this.handlerPath == null) {
        this.handlerPath = require.resolve('./repository-status-handler');
      }
      relativeProjectPaths = (ref1 = this.project) != null ? ref1.getPaths().map((function(_this) {
        return function(projectPath) {
          return _this.relativize(projectPath);
        };
      })(this)).filter(function(projectPath) {
        return projectPath.length > 0 && !path.isAbsolute(projectPath);
      }) : void 0;
      if ((ref2 = this.statusTask) != null) {
        ref2.terminate();
      }
      return new Promise((function(_this) {
        return function(resolve) {
          return _this.statusTask = Task.once(_this.handlerPath, _this.getPath(), relativeProjectPaths, function(arg) {
            var branch, ref3, ref4, ref5, statuses, statusesUnchanged, submodulePath, submoduleRepo, submodules, upstream;
            statuses = arg.statuses, upstream = arg.upstream, branch = arg.branch, submodules = arg.submodules;
            statusesUnchanged = _.isEqual(statuses, _this.statuses) && _.isEqual(upstream, _this.upstream) && _.isEqual(branch, _this.branch) && _.isEqual(submodules, _this.submodules);
            _this.statuses = statuses;
            _this.upstream = upstream;
            _this.branch = branch;
            _this.submodules = submodules;
            ref3 = _this.getRepo().submodules;
            for (submodulePath in ref3) {
              submoduleRepo = ref3[submodulePath];
              submoduleRepo.upstream = (ref4 = (ref5 = submodules[submodulePath]) != null ? ref5.upstream : void 0) != null ? ref4 : {
                ahead: 0,
                behind: 0
              };
            }
            if (!statusesUnchanged) {
              _this.emitter.emit('did-change-statuses');
            }
            return resolve();
          });
        };
      })(this));
    };

    return GitRepository;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2dpdC1yZXBvc2l0b3J5LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUMsT0FBUSxPQUFBLENBQVEsTUFBUjs7RUFFVCxDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLE1BQTZDLE9BQUEsQ0FBUSxXQUFSLENBQTdDLEVBQUMscUJBQUQsRUFBVSwyQkFBVixFQUFzQjs7RUFDdEIsRUFBQSxHQUFLLE9BQUEsQ0FBUSxTQUFSOztFQUNMLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxRQUFBLEdBQVcsT0FBQSxDQUFRLFdBQVI7O0VBRVgsSUFBQSxHQUFPLE9BQUEsQ0FBUSxRQUFSOztFQWtDUCxNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ0osYUFBQyxDQUFBLE1BQUQsR0FBUyxTQUFDLElBQUQ7QUFDUCxVQUFBO01BQUEsSUFBRyxHQUFBLEdBQU0sSUFBQyxDQUFBLElBQUQsQ0FBTSxJQUFOLENBQVQ7UUFDRSxHQUFHLENBQUMsT0FBSixDQUFBO2VBQ0EsS0FGRjtPQUFBLE1BQUE7ZUFJRSxNQUpGOztJQURPOzs7QUFPVDs7OztJQVlBLGFBQUMsQ0FBQSxJQUFELEdBQU8sU0FBQyxJQUFELEVBQU8sT0FBUDtNQUNMLElBQUEsQ0FBbUIsSUFBbkI7QUFBQSxlQUFPLEtBQVA7O0FBQ0E7ZUFDTSxJQUFBLGFBQUEsQ0FBYyxJQUFkLEVBQW9CLE9BQXBCLEVBRE47T0FBQSxhQUFBO2VBR0UsS0FIRjs7SUFGSzs7SUFPTSx1QkFBQyxJQUFELEVBQU8sT0FBUDtBQUNYLFVBQUE7O1FBRGtCLFVBQVE7O01BQzFCLElBQUMsQ0FBQSxPQUFELEdBQVcsSUFBSTtNQUNmLElBQUMsQ0FBQSxhQUFELEdBQWlCLElBQUk7TUFFckIsSUFBQyxDQUFBLElBQUQsR0FBUSxRQUFRLENBQUMsSUFBVCxDQUFj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VTtZQUNWLEtBQUMsQ0FBQSxVQUFELEdBQWM7QUFFZDtBQUFBLGlCQUFBLHFCQUFBOztjQUNFLGFBQWEsQ0FBQyxRQUFkLGlHQUErRDtnQkFBQyxLQUFBLEVBQU8sQ0FBUjtnQkFBVyxNQUFBLEVBQVEsQ0FBbkI7O0FBRGpFO1lBR0EsSUFBQSxDQUFPLGlCQUFQO2NBQ0UsS0FBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULENBQWMscUJBQWQsRUFERjs7bUJBRUEsT0FBQSxDQUFBO1VBaEJzRSxDQUExRDtRQURKO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFSO0lBUlM7Ozs7O0FBcGRqQiIsInNvdXJjZXNDb250ZW50IjpbIntqb2lufSA9IHJlcXVpcmUgJ3BhdGgnXG5cbl8gPSByZXF1aXJlICd1bmRlcnNjb3JlLXBsdXMnXG57RW1pdHRlciwgRGlzcG9zYWJsZSwgQ29tcG9zaXRlRGlzcG9zYWJsZX0gPSByZXF1aXJlICdldmVudC1raXQnXG5mcyA9IHJlcXVpcmUgJ2ZzLXBsdXMnXG5wYXRoID0gcmVxdWlyZSAncGF0aCdcbkdpdFV0aWxzID0gcmVxdWlyZSAnZ2l0LXV0aWxzJ1xuXG5UYXNrID0gcmVxdWlyZSAnLi90YXNrJ1xuXG4jIEV4dGVuZGVkOiBSZXByZXNlbnRzIHRoZSB1bmRlcmx5aW5nIGdpdCBvcGVyYXRpb25zIHBlcmZvcm1lZCBieSBBdG9tLlxuI1xuIyBUaGlzIGNsYXNzIHNob3VsZG4ndCBiZSBpbnN0YW50aWF0ZWQgZGlyZWN0bHkgYnV0IGluc3RlYWQgYnkgYWNjZXNzaW5nIHRoZVxuIyBgYXRvbS5wcm9qZWN0YCBnbG9iYWwgYW5kIGNhbGxpbmcgYGdldFJlcG9zaXRvcmllcygpYC4gTm90ZSB0aGF0IHRoaXMgd2lsbFxuIyBvbmx5IGJlIGF2YWlsYWJsZSB3aGVuIHRoZSBwcm9qZWN0IGlzIGJhY2tlZCBieSBhIEdpdCByZXBvc2l0b3J5LlxuI1xuIyBUaGlzIGNsYXNzIGhhbmRsZXMgc3VibW9kdWxlcyBhdXRvbWF0aWNhbGx5IGJ5IHRha2luZyBhIGBwYXRoYCBhcmd1bWVudCB0byBtYW55XG4jIG9mIHRoZSBtZXRob2RzLiAgVGhpcyBgcGF0aGAgYXJndW1lbnQgd2lsbCBkZXRlcm1pbmUgd2hpY2ggdW5kZXJseWluZ1xuIyByZXBvc2l0b3J5IGlzIHVzZWQuXG4jXG4jIEZvciBhIHJlcG9zaXRvcnkgd2l0aCBzdWJtb2R1bGVzIHRoaXMgd291bGQgaGF2ZSB0aGUgZm9sbG93aW5nIG91dGNvbWU6XG4jXG4jIGBgYGNvZmZlZVxuIyByZXBvID0gYXRvbS5wcm9qZWN0LmdldFJlcG9zaXRvcmllcygpWzBdXG4jIHJlcG8uZ2V0U2hvcnRIZWFkKCkgIyAnbWFzdGVyJ1xuIyByZXBvLmdldFNob3J0SGVhZCgndmVuZG9yL3BhdGgvdG8vYS9zdWJtb2R1bGUnKSAjICdkZWFkMTIzNCdcbiMgYGBgXG4jXG4jICMjIEV4YW1wbGVzXG4jXG4jICMjIyBMb2dnaW5nIHRoZSBVUkwgb2YgdGhlIG9yaWdpbiByZW1vdGVcbiNcbiMgYGBgY29mZmVlXG4jIGdpdCA9IGF0b20ucHJvamVjdC5nZXRSZXBvc2l0b3JpZXMoKVswXVxuIyBjb25zb2xlLmxvZyBnaXQuZ2V0T3JpZ2luVVJMKClcbiMgYGBgXG4jXG4jICMjIyBSZXF1aXJpbmcgaW4gcGFja2FnZXNcbiNcbiMgYGBgY29mZmVlXG4jIHtHaXRSZXBvc2l0b3J5fSA9IHJlcXVpcmUgJ2F0b20nXG4jIGBgYFxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgR2l0UmVwb3NpdG9yeVxuICBAZXhpc3RzOiAocGF0aCkgLT5cbiAgICBpZiBnaXQgPSBAb3BlbihwYXRoKVxuICAgICAgZ2l0LmRlc3Ryb3koKVxuICAgICAgdHJ1ZVxuICAgIGVsc2VcbiAgICAgIGZhbHNlXG5cbiAgIyMjXG4gIFNlY3Rpb246IENvbnN0cnVjdGlvbiBhbmQgRGVzdHJ1Y3Rpb25cbiAgIyMjXG5cbiAgIyBQdWJsaWM6IENyZWF0ZXMgYSBuZXcgR2l0UmVwb3NpdG9yeSBpbnN0YW5jZS5cbiAgI1xuICAjICogYHBhdGhgIFRoZSB7U3RyaW5nfSBwYXRoIHRvIHRoZSBHaXQgcmVwb3NpdG9yeSB0byBvcGVuLlxuICAjICogYG9wdGlvbnNgIEFuIG9wdGlvbmFsIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgcmVmcmVzaE9uV2luZG93Rm9jdXNgIEEge0Jvb2xlYW59LCBgdHJ1ZWAgdG8gcmVmcmVzaCB0aGUgaW5kZXggYW5kXG4gICMgICAgIHN0YXR1c2VzIHdoZW4gdGhlIHdpbmRvdyBpcyBmb2N1c2VkLlxuICAjXG4gICMgUmV0dXJucyBhIHtHaXRSZXBvc2l0b3J5fSBpbnN0YW5jZSBvciBgbnVsbGAgaWYgdGhlIHJlcG9zaXRvcnkgY291bGQgbm90IGJlIG9wZW5lZC5cbiAgQG9wZW46IChwYXRoLCBvcHRpb25zKSAtPlxuICAgIHJldHVybiBudWxsIHVubGVzcyBwYXRoXG4gICAgdHJ5XG4gICAgICBuZXcgR2l0UmVwb3NpdG9yeShwYXRoLCBvcHRpb25zKVxuICAgIGNhdGNoXG4gICAgICBudWxsXG5cbiAgY29uc3RydWN0b3I6IChwYXRoLCBvcHRpb25zPXt9KSAtPlxuICAgIEBlbWl0dGVyID0gbmV3IEVtaXR0ZXJcbiAgICBAc3Vic2NyaXB0aW9ucyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlXG5cbiAgICBAcmVwbyA9IEdpdFV0aWxzLm9wZW4ocGF0aClcbiAgICB1bmxlc3MgQHJlcG8/XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBHaXQgcmVwb3NpdG9yeSBmb3VuZCBzZWFyY2hpbmcgcGF0aDogI3twYXRofVwiKVxuXG4gICAgQHN0YXR1c2VzID0ge31cbiAgICBAdXBzdHJlYW0gPSB7YWhlYWQ6IDAsIGJlaGluZDogMH1cbiAgICBmb3Igc3VibW9kdWxlUGF0aCwgc3VibW9kdWxlUmVwbyBvZiBAcmVwby5zdWJtb2R1bGVzXG4gICAgICBzdWJtb2R1bGVSZXBvLnVwc3RyZWFtID0ge2FoZWFkOiAwLCBiZWhpbmQ6IDB9XG5cbiAgICB7QHByb2plY3QsIEBjb25maWcsIHJlZnJlc2hPbldpbmRvd0ZvY3VzfSA9IG9wdGlvbnNcblxuICAgIHJlZnJlc2hPbldpbmRvd0ZvY3VzID89IHRydWVcbiAgICBpZiByZWZyZXNoT25XaW5kb3dGb2N1c1xuICAgICAgb25XaW5kb3dGb2N1cyA9ID0+XG4gICAgICAgIEByZWZyZXNoSW5kZXgoKVxuICAgICAgICBAcmVmcmVzaFN0YXR1cygpXG5cbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICdmb2N1cycsIG9uV2luZG93Rm9jdXNcbiAgICAgIEBzdWJzY3JpcHRpb25zLmFkZCBuZXcgRGlzcG9zYWJsZSgtPiB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lciAnZm9jdXMnLCBvbldpbmRvd0ZvY3VzKVxuXG4gICAgaWYgQHByb2plY3Q/XG4gICAgICBAcHJvamVjdC5nZXRCdWZmZXJzKCkuZm9yRWFjaCAoYnVmZmVyKSA9PiBAc3Vic2NyaWJlVG9CdWZmZXIoYnVmZmVyKVxuICAgICAgQHN1YnNjcmlwdGlvbnMuYWRkIEBwcm9qZWN0Lm9uRGlkQWRkQnVmZmVyIChidWZmZXIpID0+IEBzdWJzY3JpYmVUb0J1ZmZlcihidWZmZXIpXG5cbiAgIyBQdWJsaWM6IERlc3Ryb3kgdGhpcyB7R2l0UmVwb3NpdG9yeX0gb2JqZWN0LlxuICAjXG4gICMgVGhpcyBkZXN0cm95cyBhbnkgdGFza3MgYW5kIHN1YnNjcmlwdGlvbnMgYW5kIHJlbGVhc2VzIHRoZSB1bmRlcmx5aW5nXG4gICMgbGliZ2l0MiByZXBvc2l0b3J5IGhhbmRsZS4gVGhpcyBtZXRob2QgaXMgaWRlbXBvdGVudC5cbiAgZGVzdHJveTogLT5cbiAgICBpZiBAZW1pdHRlcj9cbiAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1kZXN0cm95J1xuICAgICAgQGVtaXR0ZXIuZGlzcG9zZSgpXG4gICAgICBAZW1pdHRlciA9IG51bGxcblxuICAgIGlmIEBzdGF0dXNUYXNrP1xuICAgICAgQHN0YXR1c1Rhc2sudGVybWluYXRlKClcbiAgICAgIEBzdGF0dXNUYXNrID0gbnVsbFxuXG4gICAgaWYgQHJlcG8/XG4gICAgICBAcmVwby5yZWxlYXNlKClcbiAgICAgIEByZXBvID0gbnVsbFxuXG4gICAgaWYgQHN1YnNjcmlwdGlvbnM/XG4gICAgICBAc3Vic2NyaXB0aW9ucy5kaXNwb3NlKClcbiAgICAgIEBzdWJzY3JpcHRpb25zID0gbnVsbFxuXG4gICMgUHVibGljOiBSZXR1cm5zIGEge0Jvb2xlYW59IGluZGljYXRpbmcgaWYgdGhpcyByZXBvc2l0b3J5IGhhcyBiZWVuIGRlc3Ryb3llZC5cbiAgaXNEZXN0cm95ZWQ6IC0+XG4gICAgbm90IEByZXBvP1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gdGhpcyBHaXRSZXBvc2l0b3J5J3MgZGVzdHJveSgpIG1ldGhvZFxuICAjIGlzIGludm9rZWQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWREZXN0cm95OiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1kZXN0cm95JywgY2FsbGJhY2tcblxuICAjIyNcbiAgU2VjdGlvbjogRXZlbnQgU3Vic2NyaXB0aW9uXG4gICMjI1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gYSBzcGVjaWZpYyBmaWxlJ3Mgc3RhdHVzIGhhc1xuICAjIGNoYW5nZWQuIFdoZW4gYSBmaWxlIGlzIHVwZGF0ZWQsIHJlbG9hZGVkLCBldGMsIGFuZCB0aGUgc3RhdHVzIGNoYW5nZXMsIHRoaXNcbiAgIyB3aWxsIGJlIGZpcmVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGV2ZW50YCB7T2JqZWN0fVxuICAjICAgICAqIGBwYXRoYCB7U3RyaW5nfSB0aGUgb2xkIHBhcmFtZXRlcnMgdGhlIGRlY29yYXRpb24gdXNlZCB0byBoYXZlXG4gICMgICAgICogYHBhdGhTdGF0dXNgIHtOdW1iZXJ9IHJlcHJlc2VudGluZyB0aGUgc3RhdHVzLiBUaGlzIHZhbHVlIGNhbiBiZSBwYXNzZWQgdG9cbiAgIyAgICAgICB7Ojppc1N0YXR1c01vZGlmaWVkfSBvciB7Ojppc1N0YXR1c05ld30gdG8gZ2V0IG1vcmUgaW5mb3JtYXRpb24uXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZVN0YXR1czogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLXN0YXR1cycsIGNhbGxiYWNrXG5cbiAgIyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiBhIG11bHRpcGxlIGZpbGVzJyBzdGF0dXNlcyBoYXZlXG4gICMgY2hhbmdlZC4gRm9yIGV4YW1wbGUsIG9uIHdpbmRvdyBmb2N1cywgdGhlIHN0YXR1cyBvZiBhbGwgdGhlIHBhdGhzIGluIHRoZVxuICAjIHJlcG8gaXMgY2hlY2tlZC4gSWYgYW55IG9mIHRoZW0gaGF2ZSBjaGFuZ2VkLCB0aGlzIHdpbGwgYmUgZmlyZWQuIENhbGxcbiAgIyB7OjpnZXRQYXRoU3RhdHVzKHBhdGgpfSB0byBnZXQgdGhlIHN0YXR1cyBmb3IgeW91ciBwYXRoIG9mIGNob2ljZS5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZVN0YXR1c2VzOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2Utc3RhdHVzZXMnLCBjYWxsYmFja1xuXG4gICMjI1xuICBTZWN0aW9uOiBSZXBvc2l0b3J5IERldGFpbHNcbiAgIyMjXG5cbiAgIyBQdWJsaWM6IEEge1N0cmluZ30gaW5kaWNhdGluZyB0aGUgdHlwZSBvZiB2ZXJzaW9uIGNvbnRyb2wgc3lzdGVtIHVzZWQgYnlcbiAgIyB0aGlzIHJlcG9zaXRvcnkuXG4gICNcbiAgIyBSZXR1cm5zIGBcImdpdFwiYC5cbiAgZ2V0VHlwZTogLT4gJ2dpdCdcblxuICAjIFB1YmxpYzogUmV0dXJucyB0aGUge1N0cmluZ30gcGF0aCBvZiB0aGUgcmVwb3NpdG9yeS5cbiAgZ2V0UGF0aDogLT5cbiAgICBAcGF0aCA/PSBmcy5hYnNvbHV0ZShAZ2V0UmVwbygpLmdldFBhdGgoKSlcblxuICAjIFB1YmxpYzogUmV0dXJucyB0aGUge1N0cmluZ30gd29ya2luZyBkaXJlY3RvcnkgcGF0aCBvZiB0aGUgcmVwb3NpdG9yeS5cbiAgZ2V0V29ya2luZ0RpcmVjdG9yeTogLT4gQGdldFJlcG8oKS5nZXRXb3JraW5nRGlyZWN0b3J5KClcblxuICAjIFB1YmxpYzogUmV0dXJucyB0cnVlIGlmIGF0IHRoZSByb290LCBmYWxzZSBpZiBpbiBhIHN1YmZvbGRlciBvZiB0aGVcbiAgIyByZXBvc2l0b3J5LlxuICBpc1Byb2plY3RBdFJvb3Q6IC0+XG4gICAgQHByb2plY3RBdFJvb3QgPz0gQHByb2plY3Q/LnJlbGF0aXZpemUoQGdldFdvcmtpbmdEaXJlY3RvcnkoKSkgaXMgJydcblxuICAjIFB1YmxpYzogTWFrZXMgYSBwYXRoIHJlbGF0aXZlIHRvIHRoZSByZXBvc2l0b3J5J3Mgd29ya2luZyBkaXJlY3RvcnkuXG4gIHJlbGF0aXZpemU6IChwYXRoKSAtPiBAZ2V0UmVwbygpLnJlbGF0aXZpemUocGF0aClcblxuICAjIFB1YmxpYzogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBicmFuY2ggZXhpc3RzLlxuICBoYXNCcmFuY2g6IChicmFuY2gpIC0+IEBnZXRSZWZlcmVuY2VUYXJnZXQoXCJyZWZzL2hlYWRzLyN7YnJhbmNofVwiKT9cblxuICAjIFB1YmxpYzogUmV0cmlldmVzIGEgc2hvcnRlbmVkIHZlcnNpb24gb2YgdGhlIEhFQUQgcmVmZXJlbmNlIHZhbHVlLlxuICAjXG4gICMgVGhpcyByZW1vdmVzIHRoZSBsZWFkaW5nIHNlZ21lbnRzIG9mIGByZWZzL2hlYWRzYCwgYHJlZnMvdGFnc2AsIG9yXG4gICMgYHJlZnMvcmVtb3Rlc2AuICBJdCBhbHNvIHNob3J0ZW5zIHRoZSBTSEEtMSBvZiBhIGRldGFjaGVkIGBIRUFEYCB0byA3XG4gICMgY2hhcmFjdGVycy5cbiAgI1xuICAjICogYHBhdGhgIEFuIG9wdGlvbmFsIHtTdHJpbmd9IHBhdGggaW4gdGhlIHJlcG9zaXRvcnkgdG8gZ2V0IHRoaXMgaW5mb3JtYXRpb25cbiAgIyAgIGZvciwgb25seSBuZWVkZWQgaWYgdGhlIHJlcG9zaXRvcnkgY29udGFpbnMgc3VibW9kdWxlcy5cbiAgI1xuICAjIFJldHVybnMgYSB7U3RyaW5nfS5cbiAgZ2V0U2hvcnRIZWFkOiAocGF0aCkgLT4gQGdldFJlcG8ocGF0aCkuZ2V0U2hvcnRIZWFkKClcblxuICAjIFB1YmxpYzogSXMgdGhlIGdpdmVuIHBhdGggYSBzdWJtb2R1bGUgaW4gdGhlIHJlcG9zaXRvcnk/XG4gICNcbiAgIyAqIGBwYXRoYCBUaGUge1N0cmluZ30gcGF0aCB0byBjaGVjay5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0uXG4gIGlzU3VibW9kdWxlOiAocGF0aCkgLT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIHBhdGhcblxuICAgIHJlcG8gPSBAZ2V0UmVwbyhwYXRoKVxuICAgIGlmIHJlcG8uaXNTdWJtb2R1bGUocmVwby5yZWxhdGl2aXplKHBhdGgpKVxuICAgICAgdHJ1ZVxuICAgIGVsc2VcbiAgICAgICMgQ2hlY2sgaWYgdGhlIHBhdGggaXMgYSB3b3JraW5nIGRpcmVjdG9yeSBpbiBhIHJlcG8gdGhhdCBpc24ndCB0aGUgcm9vdC5cbiAgICAgIHJlcG8gaXNudCBAZ2V0UmVwbygpIGFuZCByZXBvLnJlbGF0aXZpemUoam9pbihwYXRoLCAnZGlyJykpIGlzICdkaXInXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdGhlIG51bWJlciBvZiBjb21taXRzIGJlaGluZCB0aGUgY3VycmVudCBicmFuY2ggaXMgZnJvbSB0aGVcbiAgIyBpdHMgdXBzdHJlYW0gcmVtb3RlIGJyYW5jaC5cbiAgI1xuICAjICogYHJlZmVyZW5jZWAgVGhlIHtTdHJpbmd9IGJyYW5jaCByZWZlcmVuY2UgbmFtZS5cbiAgIyAqIGBwYXRoYCAgICAgIFRoZSB7U3RyaW5nfSBwYXRoIGluIHRoZSByZXBvc2l0b3J5IHRvIGdldCB0aGlzIGluZm9ybWF0aW9uIGZvcixcbiAgIyAgIG9ubHkgbmVlZGVkIGlmIHRoZSByZXBvc2l0b3J5IGNvbnRhaW5zIHN1Ym1vZHVsZXMuXG4gIGdldEFoZWFkQmVoaW5kQ291bnQ6IChyZWZlcmVuY2UsIHBhdGgpIC0+XG4gICAgQGdldFJlcG8ocGF0aCkuZ2V0QWhlYWRCZWhpbmRDb3VudChyZWZlcmVuY2UpXG5cbiAgIyBQdWJsaWM6IEdldCB0aGUgY2FjaGVkIGFoZWFkL2JlaGluZCBjb21taXQgY291bnRzIGZvciB0aGUgY3VycmVudCBicmFuY2gnc1xuICAjIHVwc3RyZWFtIGJyYW5jaC5cbiAgI1xuICAjICogYHBhdGhgIEFuIG9wdGlvbmFsIHtTdHJpbmd9IHBhdGggaW4gdGhlIHJlcG9zaXRvcnkgdG8gZ2V0IHRoaXMgaW5mb3JtYXRpb25cbiAgIyAgIGZvciwgb25seSBuZWVkZWQgaWYgdGhlIHJlcG9zaXRvcnkgaGFzIHN1Ym1vZHVsZXMuXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgYWhlYWRgICBUaGUge051bWJlcn0gb2YgY29tbWl0cyBhaGVhZC5cbiAgIyAgICogYGJlaGluZGAgVGhlIHtOdW1iZXJ9IG9mIGNvbW1pdHMgYmVoaW5kLlxuICBnZXRDYWNoZWRVcHN0cmVhbUFoZWFkQmVoaW5kQ291bnQ6IChwYXRoKSAtPlxuICAgIEBnZXRSZXBvKHBhdGgpLnVwc3RyZWFtID8gQHVwc3RyZWFtXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdGhlIGdpdCBjb25maWd1cmF0aW9uIHZhbHVlIHNwZWNpZmllZCBieSB0aGUga2V5LlxuICAjXG4gICMgKiBga2V5YCAgVGhlIHtTdHJpbmd9IGtleSBmb3IgdGhlIGNvbmZpZ3VyYXRpb24gdG8gbG9va3VwLlxuICAjICogYHBhdGhgIEFuIG9wdGlvbmFsIHtTdHJpbmd9IHBhdGggaW4gdGhlIHJlcG9zaXRvcnkgdG8gZ2V0IHRoaXMgaW5mb3JtYXRpb25cbiAgIyAgIGZvciwgb25seSBuZWVkZWQgaWYgdGhlIHJlcG9zaXRvcnkgaGFzIHN1Ym1vZHVsZXMuXG4gIGdldENvbmZpZ1ZhbHVlOiAoa2V5LCBwYXRoKSAtPiBAZ2V0UmVwbyhwYXRoKS5nZXRDb25maWdWYWx1ZShrZXkpXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdGhlIG9yaWdpbiB1cmwgb2YgdGhlIHJlcG9zaXRvcnkuXG4gICNcbiAgIyAqIGBwYXRoYCAob3B0aW9uYWwpIHtTdHJpbmd9IHBhdGggaW4gdGhlIHJlcG9zaXRvcnkgdG8gZ2V0IHRoaXMgaW5mb3JtYXRpb25cbiAgIyAgIGZvciwgb25seSBuZWVkZWQgaWYgdGhlIHJlcG9zaXRvcnkgaGFzIHN1Ym1vZHVsZXMuXG4gIGdldE9yaWdpblVSTDogKHBhdGgpIC0+IEBnZXRDb25maWdWYWx1ZSgncmVtb3RlLm9yaWdpbi51cmwnLCBwYXRoKVxuXG4gICMgUHVibGljOiBSZXR1cm5zIHRoZSB1cHN0cmVhbSBicmFuY2ggZm9yIHRoZSBjdXJyZW50IEhFQUQsIG9yIG51bGwgaWYgdGhlcmVcbiAgIyBpcyBubyB1cHN0cmVhbSBicmFuY2ggZm9yIHRoZSBjdXJyZW50IEhFQUQuXG4gICNcbiAgIyAqIGBwYXRoYCBBbiBvcHRpb25hbCB7U3RyaW5nfSBwYXRoIGluIHRoZSByZXBvIHRvIGdldCB0aGlzIGluZm9ybWF0aW9uIGZvcixcbiAgIyAgIG9ubHkgbmVlZGVkIGlmIHRoZSByZXBvc2l0b3J5IGNvbnRhaW5zIHN1Ym1vZHVsZXMuXG4gICNcbiAgIyBSZXR1cm5zIGEge1N0cmluZ30gYnJhbmNoIG5hbWUgc3VjaCBhcyBgcmVmcy9yZW1vdGVzL29yaWdpbi9tYXN0ZXJgLlxuICBnZXRVcHN0cmVhbUJyYW5jaDogKHBhdGgpIC0+IEBnZXRSZXBvKHBhdGgpLmdldFVwc3RyZWFtQnJhbmNoKClcblxuICAjIFB1YmxpYzogR2V0cyBhbGwgdGhlIGxvY2FsIGFuZCByZW1vdGUgcmVmZXJlbmNlcy5cbiAgI1xuICAjICogYHBhdGhgIEFuIG9wdGlvbmFsIHtTdHJpbmd9IHBhdGggaW4gdGhlIHJlcG9zaXRvcnkgdG8gZ2V0IHRoaXMgaW5mb3JtYXRpb25cbiAgIyAgIGZvciwgb25seSBuZWVkZWQgaWYgdGhlIHJlcG9zaXRvcnkgaGFzIHN1Ym1vZHVsZXMuXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAqIGBoZWFkc2AgICBBbiB7QXJyYXl9IG9mIGhlYWQgcmVmZXJlbmNlIG5hbWVzLlxuICAjICAqIGByZW1vdGVzYCBBbiB7QXJyYXl9IG9mIHJlbW90ZSByZWZlcmVuY2UgbmFtZXMuXG4gICMgICogYHRhZ3NgICAgIEFuIHtBcnJheX0gb2YgdGFnIHJlZmVyZW5jZSBuYW1lcy5cbiAgZ2V0UmVmZXJlbmNlczogKHBhdGgpIC0+IEBnZXRSZXBvKHBhdGgpLmdldFJlZmVyZW5jZXMoKVxuXG4gICMgUHVibGljOiBSZXR1cm5zIHRoZSBjdXJyZW50IHtTdHJpbmd9IFNIQSBmb3IgdGhlIGdpdmVuIHJlZmVyZW5jZS5cbiAgI1xuICAjICogYHJlZmVyZW5jZWAgVGhlIHtTdHJpbmd9IHJlZmVyZW5jZSB0byBnZXQgdGhlIHRhcmdldCBvZi5cbiAgIyAqIGBwYXRoYCBBbiBvcHRpb25hbCB7U3RyaW5nfSBwYXRoIGluIHRoZSByZXBvIHRvIGdldCB0aGUgcmVmZXJlbmNlIHRhcmdldFxuICAjICAgZm9yLiBPbmx5IG5lZWRlZCBpZiB0aGUgcmVwb3NpdG9yeSBjb250YWlucyBzdWJtb2R1bGVzLlxuICBnZXRSZWZlcmVuY2VUYXJnZXQ6IChyZWZlcmVuY2UsIHBhdGgpIC0+XG4gICAgQGdldFJlcG8ocGF0aCkuZ2V0UmVmZXJlbmNlVGFyZ2V0KHJlZmVyZW5jZSlcblxuICAjIyNcbiAgU2VjdGlvbjogUmVhZGluZyBTdGF0dXNcbiAgIyMjXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gcGF0aCBpcyBtb2RpZmllZC5cbiAgI1xuICAjICogYHBhdGhgIFRoZSB7U3RyaW5nfSBwYXRoIHRvIGNoZWNrLlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufSB0aGF0J3MgdHJ1ZSBpZiB0aGUgYHBhdGhgIGlzIG1vZGlmaWVkLlxuICBpc1BhdGhNb2RpZmllZDogKHBhdGgpIC0+IEBpc1N0YXR1c01vZGlmaWVkKEBnZXRQYXRoU3RhdHVzKHBhdGgpKVxuXG4gICMgUHVibGljOiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHBhdGggaXMgbmV3LlxuICAjXG4gICMgKiBgcGF0aGAgVGhlIHtTdHJpbmd9IHBhdGggdG8gY2hlY2suXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59IHRoYXQncyB0cnVlIGlmIHRoZSBgcGF0aGAgaXMgbmV3LlxuICBpc1BhdGhOZXc6IChwYXRoKSAtPiBAaXNTdGF0dXNOZXcoQGdldFBhdGhTdGF0dXMocGF0aCkpXG5cbiAgIyBQdWJsaWM6IElzIHRoZSBnaXZlbiBwYXRoIGlnbm9yZWQ/XG4gICNcbiAgIyAqIGBwYXRoYCBUaGUge1N0cmluZ30gcGF0aCB0byBjaGVjay5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0gdGhhdCdzIHRydWUgaWYgdGhlIGBwYXRoYCBpcyBpZ25vcmVkLlxuICBpc1BhdGhJZ25vcmVkOiAocGF0aCkgLT4gQGdldFJlcG8oKS5pc0lnbm9yZWQoQHJlbGF0aXZpemUocGF0aCkpXG5cbiAgIyBQdWJsaWM6IEdldCB0aGUgc3RhdHVzIG9mIGEgZGlyZWN0b3J5IGluIHRoZSByZXBvc2l0b3J5J3Mgd29ya2luZyBkaXJlY3RvcnkuXG4gICNcbiAgIyAqIGBwYXRoYCBUaGUge1N0cmluZ30gcGF0aCB0byBjaGVjay5cbiAgI1xuICAjIFJldHVybnMgYSB7TnVtYmVyfSByZXByZXNlbnRpbmcgdGhlIHN0YXR1cy4gVGhpcyB2YWx1ZSBjYW4gYmUgcGFzc2VkIHRvXG4gICMgezo6aXNTdGF0dXNNb2RpZmllZH0gb3Igezo6aXNTdGF0dXNOZXd9IHRvIGdldCBtb3JlIGluZm9ybWF0aW9uLlxuICBnZXREaXJlY3RvcnlTdGF0dXM6IChkaXJlY3RvcnlQYXRoKSAgLT5cbiAgICBkaXJlY3RvcnlQYXRoID0gXCIje0ByZWxhdGl2aXplKGRpcmVjdG9yeVBhdGgpfS9cIlxuICAgIGRpcmVjdG9yeVN0YXR1cyA9IDBcbiAgICBmb3Igc3RhdHVzUGF0aCwgc3RhdHVzIG9mIEBzdGF0dXNlc1xuICAgICAgZGlyZWN0b3J5U3RhdHVzIHw9IHN0YXR1cyBpZiBzdGF0dXNQYXRoLmluZGV4T2YoZGlyZWN0b3J5UGF0aCkgaXMgMFxuICAgIGRpcmVjdG9yeVN0YXR1c1xuXG4gICMgUHVibGljOiBHZXQgdGhlIHN0YXR1cyBvZiBhIHNpbmdsZSBwYXRoIGluIHRoZSByZXBvc2l0b3J5LlxuICAjXG4gICMgKiBgcGF0aGAgQSB7U3RyaW5nfSByZXBvc2l0b3J5LXJlbGF0aXZlIHBhdGguXG4gICNcbiAgIyBSZXR1cm5zIGEge051bWJlcn0gcmVwcmVzZW50aW5nIHRoZSBzdGF0dXMuIFRoaXMgdmFsdWUgY2FuIGJlIHBhc3NlZCB0b1xuICAjIHs6OmlzU3RhdHVzTW9kaWZpZWR9IG9yIHs6OmlzU3RhdHVzTmV3fSB0byBnZXQgbW9yZSBpbmZvcm1hdGlvbi5cbiAgZ2V0UGF0aFN0YXR1czogKHBhdGgpIC0+XG4gICAgcmVwbyA9IEBnZXRSZXBvKHBhdGgpXG4gICAgcmVsYXRpdmVQYXRoID0gQHJlbGF0aXZpemUocGF0aClcbiAgICBjdXJyZW50UGF0aFN0YXR1cyA9IEBzdGF0dXNlc1tyZWxhdGl2ZVBhdGhdID8gMFxuICAgIHBhdGhTdGF0dXMgPSByZXBvLmdldFN0YXR1cyhyZXBvLnJlbGF0aXZpemUocGF0aCkpID8gMFxuICAgIHBhdGhTdGF0dXMgPSAwIGlmIHJlcG8uaXNTdGF0dXNJZ25vcmVkKHBhdGhTdGF0dXMpXG4gICAgaWYgcGF0aFN0YXR1cyA+IDBcbiAgICAgIEBzdGF0dXNlc1tyZWxhdGl2ZVBhdGhdID0gcGF0aFN0YXR1c1xuICAgIGVsc2VcbiAgICAgIGRlbGV0ZSBAc3RhdHVzZXNbcmVsYXRpdmVQYXRoXVxuICAgIGlmIGN1cnJlbnRQYXRoU3RhdHVzIGlzbnQgcGF0aFN0YXR1c1xuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWNoYW5nZS1zdGF0dXMnLCB7cGF0aCwgcGF0aFN0YXR1c31cblxuICAgIHBhdGhTdGF0dXNcblxuICAjIFB1YmxpYzogR2V0IHRoZSBjYWNoZWQgc3RhdHVzIGZvciB0aGUgZ2l2ZW4gcGF0aC5cbiAgI1xuICAjICogYHBhdGhgIEEge1N0cmluZ30gcGF0aCBpbiB0aGUgcmVwb3NpdG9yeSwgcmVsYXRpdmUgb3IgYWJzb2x1dGUuXG4gICNcbiAgIyBSZXR1cm5zIGEgc3RhdHVzIHtOdW1iZXJ9IG9yIG51bGwgaWYgdGhlIHBhdGggaXMgbm90IGluIHRoZSBjYWNoZS5cbiAgZ2V0Q2FjaGVkUGF0aFN0YXR1czogKHBhdGgpIC0+XG4gICAgQHN0YXR1c2VzW0ByZWxhdGl2aXplKHBhdGgpXVxuXG4gICMgUHVibGljOiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHN0YXR1cyBpbmRpY2F0ZXMgbW9kaWZpY2F0aW9uLlxuICAjXG4gICMgKiBgc3RhdHVzYCBBIHtOdW1iZXJ9IHJlcHJlc2VudGluZyB0aGUgc3RhdHVzLlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufSB0aGF0J3MgdHJ1ZSBpZiB0aGUgYHN0YXR1c2AgaW5kaWNhdGVzIG1vZGlmaWNhdGlvbi5cbiAgaXNTdGF0dXNNb2RpZmllZDogKHN0YXR1cykgLT4gQGdldFJlcG8oKS5pc1N0YXR1c01vZGlmaWVkKHN0YXR1cylcblxuICAjIFB1YmxpYzogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBzdGF0dXMgaW5kaWNhdGVzIGEgbmV3IHBhdGguXG4gICNcbiAgIyAqIGBzdGF0dXNgIEEge051bWJlcn0gcmVwcmVzZW50aW5nIHRoZSBzdGF0dXMuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59IHRoYXQncyB0cnVlIGlmIHRoZSBgc3RhdHVzYCBpbmRpY2F0ZXMgYSBuZXcgcGF0aC5cbiAgaXNTdGF0dXNOZXc6IChzdGF0dXMpIC0+IEBnZXRSZXBvKCkuaXNTdGF0dXNOZXcoc3RhdHVzKVxuXG4gICMjI1xuICBTZWN0aW9uOiBSZXRyaWV2aW5nIERpZmZzXG4gICMjI1xuXG4gICMgUHVibGljOiBSZXRyaWV2ZXMgdGhlIG51bWJlciBvZiBsaW5lcyBhZGRlZCBhbmQgcmVtb3ZlZCB0byBhIHBhdGguXG4gICNcbiAgIyBUaGlzIGNvbXBhcmVzIHRoZSB3b3JraW5nIGRpcmVjdG9yeSBjb250ZW50cyBvZiB0aGUgcGF0aCB0byB0aGUgYEhFQURgXG4gICMgdmVyc2lvbi5cbiAgI1xuICAjICogYHBhdGhgIFRoZSB7U3RyaW5nfSBwYXRoIHRvIGNoZWNrLlxuICAjXG4gICMgUmV0dXJucyBhbiB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYGFkZGVkYCBUaGUge051bWJlcn0gb2YgYWRkZWQgbGluZXMuXG4gICMgICAqIGBkZWxldGVkYCBUaGUge051bWJlcn0gb2YgZGVsZXRlZCBsaW5lcy5cbiAgZ2V0RGlmZlN0YXRzOiAocGF0aCkgLT5cbiAgICByZXBvID0gQGdldFJlcG8ocGF0aClcbiAgICByZXBvLmdldERpZmZTdGF0cyhyZXBvLnJlbGF0aXZpemUocGF0aCkpXG5cbiAgIyBQdWJsaWM6IFJldHJpZXZlcyB0aGUgbGluZSBkaWZmcyBjb21wYXJpbmcgdGhlIGBIRUFEYCB2ZXJzaW9uIG9mIHRoZSBnaXZlblxuICAjIHBhdGggYW5kIHRoZSBnaXZlbiB0ZXh0LlxuICAjXG4gICMgKiBgcGF0aGAgVGhlIHtTdHJpbmd9IHBhdGggcmVsYXRpdmUgdG8gdGhlIHJlcG9zaXRvcnkuXG4gICMgKiBgdGV4dGAgVGhlIHtTdHJpbmd9IHRvIGNvbXBhcmUgYWdhaW5zdCB0aGUgYEhFQURgIGNvbnRlbnRzXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2YgaHVuayB7T2JqZWN0fXMgd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGBvbGRTdGFydGAgVGhlIGxpbmUge051bWJlcn0gb2YgdGhlIG9sZCBodW5rLlxuICAjICAgKiBgbmV3U3RhcnRgIFRoZSBsaW5lIHtOdW1iZXJ9IG9mIHRoZSBuZXcgaHVuay5cbiAgIyAgICogYG9sZExpbmVzYCBUaGUge051bWJlcn0gb2YgbGluZXMgaW4gdGhlIG9sZCBodW5rLlxuICAjICAgKiBgbmV3TGluZXNgIFRoZSB7TnVtYmVyfSBvZiBsaW5lcyBpbiB0aGUgbmV3IGh1bmtcbiAgZ2V0TGluZURpZmZzOiAocGF0aCwgdGV4dCkgLT5cbiAgICAjIElnbm9yZSBlb2wgb2YgbGluZSBkaWZmZXJlbmNlcyBvbiB3aW5kb3dzIHNvIHRoYXQgZmlsZXMgY2hlY2tlZCBpbiBhc1xuICAgICMgTEYgZG9uJ3QgcmVwb3J0IGV2ZXJ5IGxpbmUgbW9kaWZpZWQgd2hlbiB0aGUgdGV4dCBjb250YWlucyBDUkxGIGVuZGluZ3MuXG4gICAgb3B0aW9ucyA9IGlnbm9yZUVvbFdoaXRlc3BhY2U6IHByb2Nlc3MucGxhdGZvcm0gaXMgJ3dpbjMyJ1xuICAgIHJlcG8gPSBAZ2V0UmVwbyhwYXRoKVxuICAgIHJlcG8uZ2V0TGluZURpZmZzKHJlcG8ucmVsYXRpdml6ZShwYXRoKSwgdGV4dCwgb3B0aW9ucylcblxuICAjIyNcbiAgU2VjdGlvbjogQ2hlY2tpbmcgT3V0XG4gICMjI1xuXG4gICMgUHVibGljOiBSZXN0b3JlIHRoZSBjb250ZW50cyBvZiBhIHBhdGggaW4gdGhlIHdvcmtpbmcgZGlyZWN0b3J5IGFuZCBpbmRleFxuICAjIHRvIHRoZSB2ZXJzaW9uIGF0IGBIRUFEYC5cbiAgI1xuICAjIFRoaXMgaXMgZXNzZW50aWFsbHkgdGhlIHNhbWUgYXMgcnVubmluZzpcbiAgI1xuICAjIGBgYHNoXG4gICMgICBnaXQgcmVzZXQgSEVBRCAtLSA8cGF0aD5cbiAgIyAgIGdpdCBjaGVja291dCBIRUFEIC0tIDxwYXRoPlxuICAjIGBgYFxuICAjXG4gICMgKiBgcGF0aGAgVGhlIHtTdHJpbmd9IHBhdGggdG8gY2hlY2tvdXQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59IHRoYXQncyB0cnVlIGlmIHRoZSBtZXRob2Qgd2FzIHN1Y2Nlc3NmdWwuXG4gIGNoZWNrb3V0SGVhZDogKHBhdGgpIC0+XG4gICAgcmVwbyA9IEBnZXRSZXBvKHBhdGgpXG4gICAgaGVhZENoZWNrZWRPdXQgPSByZXBvLmNoZWNrb3V0SGVhZChyZXBvLnJlbGF0aXZpemUocGF0aCkpXG4gICAgQGdldFBhdGhTdGF0dXMocGF0aCkgaWYgaGVhZENoZWNrZWRPdXRcbiAgICBoZWFkQ2hlY2tlZE91dFxuXG4gICMgUHVibGljOiBDaGVja3Mgb3V0IGEgYnJhbmNoIGluIHlvdXIgcmVwb3NpdG9yeS5cbiAgI1xuICAjICogYHJlZmVyZW5jZWAgVGhlIHtTdHJpbmd9IHJlZmVyZW5jZSB0byBjaGVja291dC5cbiAgIyAqIGBjcmVhdGVgICAgIEEge0Jvb2xlYW59IHZhbHVlIHdoaWNoLCBpZiB0cnVlIGNyZWF0ZXMgdGhlIG5ldyByZWZlcmVuY2UgaWZcbiAgIyAgIGl0IGRvZXNuJ3QgZXhpc3QuXG4gICNcbiAgIyBSZXR1cm5zIGEgQm9vbGVhbiB0aGF0J3MgdHJ1ZSBpZiB0aGUgbWV0aG9kIHdhcyBzdWNjZXNzZnVsLlxuICBjaGVja291dFJlZmVyZW5jZTogKHJlZmVyZW5jZSwgY3JlYXRlKSAtPlxuICAgIEBnZXRSZXBvKCkuY2hlY2tvdXRSZWZlcmVuY2UocmVmZXJlbmNlLCBjcmVhdGUpXG5cbiAgIyMjXG4gIFNlY3Rpb246IFByaXZhdGVcbiAgIyMjXG5cbiAgIyBTdWJzY3JpYmVzIHRvIGJ1ZmZlciBldmVudHMuXG4gIHN1YnNjcmliZVRvQnVmZmVyOiAoYnVmZmVyKSAtPlxuICAgIGdldEJ1ZmZlclBhdGhTdGF0dXMgPSA9PlxuICAgICAgaWYgYnVmZmVyUGF0aCA9IGJ1ZmZlci5nZXRQYXRoKClcbiAgICAgICAgQGdldFBhdGhTdGF0dXMoYnVmZmVyUGF0aClcblxuICAgIGJ1ZmZlclN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZVxuICAgIGJ1ZmZlclN1YnNjcmlwdGlvbnMuYWRkIGJ1ZmZlci5vbkRpZFNhdmUoZ2V0QnVmZmVyUGF0aFN0YXR1cylcbiAgICBidWZmZXJTdWJzY3JpcHRpb25zLmFkZCBidWZmZXIub25EaWRSZWxvYWQoZ2V0QnVmZmVyUGF0aFN0YXR1cylcbiAgICBidWZmZXJTdWJzY3JpcHRpb25zLmFkZCBidWZmZXIub25EaWRDaGFuZ2VQYXRoKGdldEJ1ZmZlclBhdGhTdGF0dXMpXG4gICAgYnVmZmVyU3Vic2NyaXB0aW9ucy5hZGQgYnVmZmVyLm9uRGlkRGVzdHJveSA9PlxuICAgICAgYnVmZmVyU3Vic2NyaXB0aW9ucy5kaXNwb3NlKClcbiAgICAgIEBzdWJzY3JpcHRpb25zLnJlbW92ZShidWZmZXJTdWJzY3JpcHRpb25zKVxuICAgIEBzdWJzY3JpcHRpb25zLmFkZChidWZmZXJTdWJzY3JpcHRpb25zKVxuICAgIHJldHVyblxuXG4gICMgU3Vic2NyaWJlcyB0byBlZGl0b3IgdmlldyBldmVudC5cbiAgY2hlY2tvdXRIZWFkRm9yRWRpdG9yOiAoZWRpdG9yKSAtPlxuICAgIGlmIGZpbGVQYXRoID0gZWRpdG9yLmdldFBhdGgoKVxuICAgICAgZWRpdG9yLmJ1ZmZlci5yZWxvYWQoKSBpZiBlZGl0b3IuYnVmZmVyLmlzTW9kaWZpZWQoKVxuICAgICAgQGNoZWNrb3V0SGVhZChmaWxlUGF0aClcblxuICAjIFJldHVybnMgdGhlIGNvcnJlc3BvbmRpbmcge1JlcG9zaXRvcnl9XG4gIGdldFJlcG86IChwYXRoKSAtPlxuICAgIGlmIEByZXBvP1xuICAgICAgQHJlcG8uc3VibW9kdWxlRm9yUGF0aChwYXRoKSA/IEByZXBvXG4gICAgZWxzZVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUmVwb3NpdG9yeSBoYXMgYmVlbiBkZXN0cm95ZWRcIilcblxuICAjIFJlcmVhZCB0aGUgaW5kZXggdG8gdXBkYXRlIGFueSB2YWx1ZXMgdGhhdCBoYXZlIGNoYW5nZWQgc2luY2UgdGhlXG4gICMgbGFzdCB0aW1lIHRoZSBpbmRleCB3YXMgcmVhZC5cbiAgcmVmcmVzaEluZGV4OiAtPiBAZ2V0UmVwbygpLnJlZnJlc2hJbmRleCgpXG5cbiAgIyBSZWZyZXNoZXMgdGhlIGN1cnJlbnQgZ2l0IHN0YXR1cyBpbiBhbiBvdXRzaWRlIHByb2Nlc3MgYW5kIGFzeW5jaHJvbm91c2x5XG4gICMgdXBkYXRlcyB0aGUgcmVsZXZhbnQgcHJvcGVydGllcy5cbiAgcmVmcmVzaFN0YXR1czogLT5cbiAgICBAaGFuZGxlclBhdGggPz0gcmVxdWlyZS5yZXNvbHZlKCcuL3JlcG9zaXRvcnktc3RhdHVzLWhhbmRsZXInKVxuXG4gICAgcmVsYXRpdmVQcm9qZWN0UGF0aHMgPSBAcHJvamVjdD8uZ2V0UGF0aHMoKVxuICAgICAgLm1hcCAocHJvamVjdFBhdGgpID0+IEByZWxhdGl2aXplKHByb2plY3RQYXRoKVxuICAgICAgLmZpbHRlciAocHJvamVjdFBhdGgpIC0+IHByb2plY3RQYXRoLmxlbmd0aCA+IDAgYW5kIG5vdCBwYXRoLmlzQWJzb2x1dGUocHJvamVjdFBhdGgpXG5cbiAgICBAc3RhdHVzVGFzaz8udGVybWluYXRlKClcbiAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSkgPT5cbiAgICAgIEBzdGF0dXNUYXNrID0gVGFzay5vbmNlIEBoYW5kbGVyUGF0aCwgQGdldFBhdGgoKSwgcmVsYXRpdmVQcm9qZWN0UGF0aHMsICh7c3RhdHVzZXMsIHVwc3RyZWFtLCBicmFuY2gsIHN1Ym1vZHVsZXN9KSA9PlxuICAgICAgICBzdGF0dXNlc1VuY2hhbmdlZCA9IF8uaXNFcXVhbChzdGF0dXNlcywgQHN0YXR1c2VzKSBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmlzRXF1YWwodXBzdHJlYW0sIEB1cHN0cmVhbSkgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5pc0VxdWFsKGJyYW5jaCwgQGJyYW5jaCkgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5pc0VxdWFsKHN1Ym1vZHVsZXMsIEBzdWJtb2R1bGVzKVxuXG4gICAgICAgIEBzdGF0dXNlcyA9IHN0YXR1c2VzXG4gICAgICAgIEB1cHN0cmVhbSA9IHVwc3RyZWFtXG4gICAgICAgIEBicmFuY2ggPSBicmFuY2hcbiAgICAgICAgQHN1Ym1vZHVsZXMgPSBzdWJtb2R1bGVzXG5cbiAgICAgICAgZm9yIHN1Ym1vZHVsZVBhdGgsIHN1Ym1vZHVsZVJlcG8gb2YgQGdldFJlcG8oKS5zdWJtb2R1bGVzXG4gICAgICAgICAgc3VibW9kdWxlUmVwby51cHN0cmVhbSA9IHN1Ym1vZHVsZXNbc3VibW9kdWxlUGF0aF0/LnVwc3RyZWFtID8ge2FoZWFkOiAwLCBiZWhpbmQ6IDB9XG5cbiAgICAgICAgdW5sZXNzIHN0YXR1c2VzVW5jaGFuZ2VkXG4gICAgICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWNoYW5nZS1zdGF0dXNlcydcbiAgICAgICAgcmVzb2x2ZSgpXG4iXX0=
