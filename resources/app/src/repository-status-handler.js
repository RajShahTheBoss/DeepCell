(function() {
  var Git, path;

  Git = require('git-utils');

  path = require('path');

  module.exports = function(repoPath, paths) {
    var absolutePath, branch, filePath, ref, ref1, relativePath, repo, repoStatus, status, statuses, submodulePath, submoduleRepo, submodules, upstream, workingDirectoryPath;
    if (paths == null) {
      paths = [];
    }
    repo = Git.open(repoPath);
    upstream = {};
    statuses = {};
    submodules = {};
    branch = null;
    if (repo != null) {
      workingDirectoryPath = repo.getWorkingDirectory();
      repoStatus = (paths.length > 0 ? repo.getStatusForPaths(paths) : repo.getStatus());
      for (filePath in repoStatus) {
        status = repoStatus[filePath];
        statuses[filePath] = status;
      }
      ref = repo.submodules;
      for (submodulePath in ref) {
        submoduleRepo = ref[submodulePath];
        submodules[submodulePath] = {
          branch: submoduleRepo.getHead(),
          upstream: submoduleRepo.getAheadBehindCount()
        };
        workingDirectoryPath = submoduleRepo.getWorkingDirectory();
        ref1 = submoduleRepo.getStatus();
        for (filePath in ref1) {
          status = ref1[filePath];
          absolutePath = path.join(workingDirectoryPath, filePath);
          relativePath = repo.relativize(absolutePath);
          statuses[relativePath] = status;
        }
      }
      upstream = repo.getAheadBehindCount();
      branch = repo.getHead();
      repo.release();
    }
    return {
      statuses: statuses,
      upstream: upstream,
      branch: branch,
      submodules: submodules
    };
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3JlcG9zaXRvcnktc3RhdHVzLWhhbmRsZXIuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQSxHQUFBLEdBQU0sT0FBQSxDQUFRLFdBQVI7O0VBQ04sSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUVQLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLFNBQUMsUUFBRCxFQUFXLEtBQVg7QUFDZixRQUFBOztNQUQwQixRQUFROztJQUNsQyxJQUFBLEdBQU8sR0FBRyxDQUFDLElBQUosQ0FBUyxRQUFUO0lBRVAsUUFBQSxHQUFXO0lBQ1gsUUFBQSxHQUFXO0lBQ1gsVUFBQSxHQUFhO0lBQ2IsTUFBQSxHQUFTO0lBRVQsSUFBRyxZQUFIO01BRUUsb0JBQUEsR0FBdUIsSUFBSSxDQUFDLG1CQUFMLENBQUE7TUFDdkIsVUFBQSxHQUFhLENBQUksS0FBSyxDQUFDLE1BQU4sR0FBZSxDQUFsQixHQUF5QixJQUFJLENBQUMsaUJBQUwsQ0FBdUIsS0FBdkIsQ0FBekIsR0FBNEQsSUFBSSxDQUFDLFNBQUwsQ0FBQSxDQUE3RDtBQUNiLFdBQUEsc0JBQUE7O1FBQ0UsUUFBUyxDQUFBLFFBQUEsQ0FBVCxHQUFxQjtBQUR2QjtBQUlBO0FBQUEsV0FBQSxvQkFBQTs7UUFDRSxVQUFXLENBQUEsYUFBQSxDQUFYLEdBQ0U7VUFBQSxNQUFBLEVBQVEsYUFBYSxDQUFDLE9BQWQsQ0FBQSxDQUFSO1VBQ0EsUUFBQSxFQUFVLGFBQWEsQ0FBQyxtQkFBZCxDQUFBLENBRFY7O1FBR0Ysb0JBQUEsR0FBdUIsYUFBYSxDQUFDLG1CQUFkLENBQUE7QUFDdkI7QUFBQSxhQUFBLGdCQUFBOztVQUNFLFlBQUEsR0FBZSxJQUFJLENBQUMsSUFBTCxDQUFVLG9CQUFWLEVBQWdDLFFBQWhDO1VBRWYsWUFBQSxHQUFlLElBQUksQ0FBQyxVQUFMLENBQWdCLFlBQWhCO1VBQ2YsUUFBUyxDQUFBLFlBQUEsQ0FBVCxHQUF5QjtBQUozQjtBQU5GO01BWUEsUUFBQSxHQUFXLElBQUksQ0FBQyxtQkFBTCxDQUFBO01BQ1gsTUFBQSxHQUFTLElBQUksQ0FBQyxPQUFMLENBQUE7TUFDVCxJQUFJLENBQUMsT0FBTCxDQUFBLEVBdEJGOztXQXdCQTtNQUFDLFVBQUEsUUFBRDtNQUFXLFVBQUEsUUFBWDtNQUFxQixRQUFBLE1BQXJCO01BQTZCLFlBQUEsVUFBN0I7O0VBaENlO0FBSGpCIiwic291cmNlc0NvbnRlbnQiOlsiR2l0ID0gcmVxdWlyZSAnZ2l0LXV0aWxzJ1xucGF0aCA9IHJlcXVpcmUgJ3BhdGgnXG5cbm1vZHVsZS5leHBvcnRzID0gKHJlcG9QYXRoLCBwYXRocyA9IFtdKSAtPlxuICByZXBvID0gR2l0Lm9wZW4ocmVwb1BhdGgpXG5cbiAgdXBzdHJlYW0gPSB7fVxuICBzdGF0dXNlcyA9IHt9XG4gIHN1Ym1vZHVsZXMgPSB7fVxuICBicmFuY2ggPSBudWxsXG5cbiAgaWYgcmVwbz9cbiAgICAjIFN0YXR1c2VzIGluIG1haW4gcmVwb1xuICAgIHdvcmtpbmdEaXJlY3RvcnlQYXRoID0gcmVwby5nZXRXb3JraW5nRGlyZWN0b3J5KClcbiAgICByZXBvU3RhdHVzID0gKGlmIHBhdGhzLmxlbmd0aCA+IDAgdGhlbiByZXBvLmdldFN0YXR1c0ZvclBhdGhzKHBhdGhzKSBlbHNlIHJlcG8uZ2V0U3RhdHVzKCkpXG4gICAgZm9yIGZpbGVQYXRoLCBzdGF0dXMgb2YgcmVwb1N0YXR1c1xuICAgICAgc3RhdHVzZXNbZmlsZVBhdGhdID0gc3RhdHVzXG5cbiAgICAjIFN0YXR1c2VzIGluIHN1Ym1vZHVsZXNcbiAgICBmb3Igc3VibW9kdWxlUGF0aCwgc3VibW9kdWxlUmVwbyBvZiByZXBvLnN1Ym1vZHVsZXNcbiAgICAgIHN1Ym1vZHVsZXNbc3VibW9kdWxlUGF0aF0gPVxuICAgICAgICBicmFuY2g6IHN1Ym1vZHVsZVJlcG8uZ2V0SGVhZCgpXG4gICAgICAgIHVwc3RyZWFtOiBzdWJtb2R1bGVSZXBvLmdldEFoZWFkQmVoaW5kQ291bnQoKVxuXG4gICAgICB3b3JraW5nRGlyZWN0b3J5UGF0aCA9IHN1Ym1vZHVsZVJlcG8uZ2V0V29ya2luZ0RpcmVjdG9yeSgpXG4gICAgICBmb3IgZmlsZVBhdGgsIHN0YXR1cyBvZiBzdWJtb2R1bGVSZXBvLmdldFN0YXR1cygpXG4gICAgICAgIGFic29sdXRlUGF0aCA9IHBhdGguam9pbih3b3JraW5nRGlyZWN0b3J5UGF0aCwgZmlsZVBhdGgpXG4gICAgICAgICMgTWFrZSBwYXRoIHJlbGF0aXZlIHRvIHBhcmVudCByZXBvc2l0b3J5XG4gICAgICAgIHJlbGF0aXZlUGF0aCA9IHJlcG8ucmVsYXRpdml6ZShhYnNvbHV0ZVBhdGgpXG4gICAgICAgIHN0YXR1c2VzW3JlbGF0aXZlUGF0aF0gPSBzdGF0dXNcblxuICAgIHVwc3RyZWFtID0gcmVwby5nZXRBaGVhZEJlaGluZENvdW50KClcbiAgICBicmFuY2ggPSByZXBvLmdldEhlYWQoKVxuICAgIHJlcG8ucmVsZWFzZSgpXG5cbiAge3N0YXR1c2VzLCB1cHN0cmVhbSwgYnJhbmNoLCBzdWJtb2R1bGVzfVxuIl19
