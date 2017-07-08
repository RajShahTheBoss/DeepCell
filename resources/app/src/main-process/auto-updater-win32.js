(function() {
  var AutoUpdater, EventEmitter, SquirrelUpdate;

  EventEmitter = require('events').EventEmitter;

  SquirrelUpdate = require('./squirrel-update');

  AutoUpdater = (function() {
    function AutoUpdater() {}

    Object.assign(AutoUpdater.prototype, EventEmitter.prototype);

    AutoUpdater.prototype.setFeedURL = function(updateUrl) {
      this.updateUrl = updateUrl;
    };

    AutoUpdater.prototype.quitAndInstall = function() {
      if (SquirrelUpdate.existsSync()) {
        return SquirrelUpdate.restartAtom(require('electron').app);
      } else {
        return require('electron').autoUpdater.quitAndInstall();
      }
    };

    AutoUpdater.prototype.downloadUpdate = function(callback) {
      return SquirrelUpdate.spawn(['--download', this.updateUrl], function(error, stdout) {
        var json, ref, ref1, update;
        if (error != null) {
          return callback(error);
        }
        try {
          json = stdout.trim().split('\n').pop();
          update = (ref = JSON.parse(json)) != null ? (ref1 = ref.releasesToApply) != null ? typeof ref1.pop === "function" ? ref1.pop() : void 0 : void 0 : void 0;
        } catch (error1) {
          error = error1;
          error.stdout = stdout;
          return callback(error);
        }
        return callback(null, update);
      });
    };

    AutoUpdater.prototype.installUpdate = function(callback) {
      return SquirrelUpdate.spawn(['--update', this.updateUrl], callback);
    };

    AutoUpdater.prototype.supportsUpdates = function() {
      return SquirrelUpdate.existsSync();
    };

    AutoUpdater.prototype.checkForUpdates = function() {
      if (!this.updateUrl) {
        throw new Error('Update URL is not set');
      }
      this.emit('checking-for-update');
      if (!SquirrelUpdate.existsSync()) {
        this.emit('update-not-available');
        return;
      }
      return this.downloadUpdate((function(_this) {
        return function(error, update) {
          if (error != null) {
            _this.emit('update-not-available');
            return;
          }
          if (update == null) {
            _this.emit('update-not-available');
            return;
          }
          _this.emit('update-available');
          return _this.installUpdate(function(error) {
            if (error != null) {
              _this.emit('update-not-available');
              return;
            }
            return _this.emit('update-downloaded', {}, update.releaseNotes, update.version, new Date(), 'https://atom.io', function() {
              return _this.quitAndInstall();
            });
          });
        };
      })(this));
    };

    return AutoUpdater;

  })();

  module.exports = new AutoUpdater();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21haW4tcHJvY2Vzcy9hdXRvLXVwZGF0ZXItd2luMzIuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQyxlQUFnQixPQUFBLENBQVEsUUFBUjs7RUFDakIsY0FBQSxHQUFpQixPQUFBLENBQVEsbUJBQVI7O0VBRVg7OztJQUNKLE1BQU0sQ0FBQyxNQUFQLENBQWMsV0FBQyxDQUFBLFNBQWYsRUFBMEIsWUFBWSxDQUFDLFNBQXZDOzswQkFFQSxVQUFBLEdBQVksU0FBQyxTQUFEO01BQUMsSUFBQyxDQUFBLFlBQUQ7SUFBRDs7MEJBRVosY0FBQSxHQUFnQixTQUFBO01BQ2QsSUFBRyxjQUFjLENBQUMsVUFBZixDQUFBLENBQUg7ZUFDRSxjQUFjLENBQUMsV0FBZixDQUEyQixPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDLEdBQS9DLEVBREY7T0FBQSxNQUFBO2VBR0UsT0FBQSxDQUFRLFVBQVIsQ0FBbUIsQ0FBQyxXQUFXLENBQUMsY0FBaEMsQ0FBQSxFQUhGOztJQURjOzswQkFNaEIsY0FBQSxHQUFnQixTQUFDLFFBQUQ7YUFDZCxjQUFjLENBQUMsS0FBZixDQUFxQixDQUFDLFlBQUQsRUFBZSxJQUFDLENBQUEsU0FBaEIsQ0FBckIsRUFBaUQsU0FBQyxLQUFELEVBQVEsTUFBUjtBQUMvQyxZQUFBO1FBQUEsSUFBMEIsYUFBMUI7QUFBQSxpQkFBTyxRQUFBLENBQVMsS0FBVCxFQUFQOztBQUVBO1VBRUUsSUFBQSxHQUFPLE1BQU0sQ0FBQyxJQUFQLENBQUEsQ0FBYSxDQUFDLEtBQWQsQ0FBb0IsSUFBcEIsQ0FBeUIsQ0FBQyxHQUExQixDQUFBO1VBQ1AsTUFBQSxrSEFBMEMsQ0FBRSxpQ0FIOUM7U0FBQSxjQUFBO1VBSU07VUFDSixLQUFLLENBQUMsTUFBTixHQUFlO0FBQ2YsaUJBQU8sUUFBQSxDQUFTLEtBQVQsRUFOVDs7ZUFRQSxRQUFBLENBQVMsSUFBVCxFQUFlLE1BQWY7TUFYK0MsQ0FBakQ7SUFEYzs7MEJBY2hCLGFBQUEsR0FBZSxTQUFDLFFBQUQ7YUFDYixjQUFjLENBQUMsS0FBZixDQUFxQixDQUFDLFVBQUQsRUFBYSxJQUFDLENBQUEsU0FBZCxDQUFyQixFQUErQyxRQUEvQztJQURhOzswQkFHZixlQUFBLEdBQWlCLFNBQUE7YUFDZixjQUFjLENBQUMsVUFBZixDQUFBO0lBRGU7OzBCQUdqQixlQUFBLEdBQWlCLFNBQUE7TUFDZixJQUFBLENBQWdELElBQUMsQ0FBQSxTQUFqRDtBQUFBLGNBQVUsSUFBQSxLQUFBLENBQU0sdUJBQU4sRUFBVjs7TUFFQSxJQUFDLENBQUEsSUFBRCxDQUFNLHFCQUFOO01BRUEsSUFBQSxDQUFPLGNBQWMsQ0FBQyxVQUFmLENBQUEsQ0FBUDtRQUNFLElBQUMsQ0FBQSxJQUFELENBQU0sc0JBQU47QUFDQSxlQUZGOzthQUlBLElBQUMsQ0FBQSxjQUFELENBQWdCLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxLQUFELEVBQVEsTUFBUjtVQUNkLElBQUcsYUFBSDtZQUNFLEtBQUMsQ0FBQSxJQUFELENBQU0sc0JBQU47QUFDQSxtQkFGRjs7VUFJQSxJQUFPLGNBQVA7WUFDRSxLQUFDLENBQUEsSUFBRCxDQUFNLHNCQUFOO0FBQ0EsbUJBRkY7O1VBSUEsS0FBQyxDQUFBLElBQUQsQ0FBTSxrQkFBTjtpQkFFQSxLQUFDLENBQUEsYUFBRCxDQUFlLFNBQUMsS0FBRDtZQUNiLElBQUcsYUFBSDtjQUNFLEtBQUMsQ0FBQSxJQUFELENBQU0sc0JBQU47QUFDQSxxQkFGRjs7bUJBSUEsS0FBQyxDQUFBLElBQUQsQ0FBTSxtQkFBTixFQUEyQixFQUEzQixFQUErQixNQUFNLENBQUMsWUFBdEMsRUFBb0QsTUFBTSxDQUFDLE9BQTNELEVBQXdFLElBQUEsSUFBQSxDQUFBLENBQXhFLEVBQWdGLGlCQUFoRixFQUFtRyxTQUFBO3FCQUFHLEtBQUMsQ0FBQSxjQUFELENBQUE7WUFBSCxDQUFuRztVQUxhLENBQWY7UUFYYztNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBaEI7SUFUZTs7Ozs7O0VBMkJuQixNQUFNLENBQUMsT0FBUCxHQUFxQixJQUFBLFdBQUEsQ0FBQTtBQTdEckIiLCJzb3VyY2VzQ29udGVudCI6WyJ7RXZlbnRFbWl0dGVyfSA9IHJlcXVpcmUgJ2V2ZW50cydcblNxdWlycmVsVXBkYXRlID0gcmVxdWlyZSAnLi9zcXVpcnJlbC11cGRhdGUnXG5cbmNsYXNzIEF1dG9VcGRhdGVyXG4gIE9iamVjdC5hc3NpZ24gQHByb3RvdHlwZSwgRXZlbnRFbWl0dGVyLnByb3RvdHlwZVxuXG4gIHNldEZlZWRVUkw6IChAdXBkYXRlVXJsKSAtPlxuXG4gIHF1aXRBbmRJbnN0YWxsOiAtPlxuICAgIGlmIFNxdWlycmVsVXBkYXRlLmV4aXN0c1N5bmMoKVxuICAgICAgU3F1aXJyZWxVcGRhdGUucmVzdGFydEF0b20ocmVxdWlyZSgnZWxlY3Ryb24nKS5hcHApXG4gICAgZWxzZVxuICAgICAgcmVxdWlyZSgnZWxlY3Ryb24nKS5hdXRvVXBkYXRlci5xdWl0QW5kSW5zdGFsbCgpXG5cbiAgZG93bmxvYWRVcGRhdGU6IChjYWxsYmFjaykgLT5cbiAgICBTcXVpcnJlbFVwZGF0ZS5zcGF3biBbJy0tZG93bmxvYWQnLCBAdXBkYXRlVXJsXSwgKGVycm9yLCBzdGRvdXQpIC0+XG4gICAgICByZXR1cm4gY2FsbGJhY2soZXJyb3IpIGlmIGVycm9yP1xuXG4gICAgICB0cnlcbiAgICAgICAgIyBMYXN0IGxpbmUgb2Ygb3V0cHV0IGlzIHRoZSBKU09OIGRldGFpbHMgYWJvdXQgdGhlIHJlbGVhc2VzXG4gICAgICAgIGpzb24gPSBzdGRvdXQudHJpbSgpLnNwbGl0KCdcXG4nKS5wb3AoKVxuICAgICAgICB1cGRhdGUgPSBKU09OLnBhcnNlKGpzb24pPy5yZWxlYXNlc1RvQXBwbHk/LnBvcD8oKVxuICAgICAgY2F0Y2ggZXJyb3JcbiAgICAgICAgZXJyb3Iuc3Rkb3V0ID0gc3Rkb3V0XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlcnJvcilcblxuICAgICAgY2FsbGJhY2sobnVsbCwgdXBkYXRlKVxuXG4gIGluc3RhbGxVcGRhdGU6IChjYWxsYmFjaykgLT5cbiAgICBTcXVpcnJlbFVwZGF0ZS5zcGF3bihbJy0tdXBkYXRlJywgQHVwZGF0ZVVybF0sIGNhbGxiYWNrKVxuXG4gIHN1cHBvcnRzVXBkYXRlczogLT5cbiAgICBTcXVpcnJlbFVwZGF0ZS5leGlzdHNTeW5jKClcblxuICBjaGVja0ZvclVwZGF0ZXM6IC0+XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVcGRhdGUgVVJMIGlzIG5vdCBzZXQnKSB1bmxlc3MgQHVwZGF0ZVVybFxuXG4gICAgQGVtaXQgJ2NoZWNraW5nLWZvci11cGRhdGUnXG5cbiAgICB1bmxlc3MgU3F1aXJyZWxVcGRhdGUuZXhpc3RzU3luYygpXG4gICAgICBAZW1pdCAndXBkYXRlLW5vdC1hdmFpbGFibGUnXG4gICAgICByZXR1cm5cblxuICAgIEBkb3dubG9hZFVwZGF0ZSAoZXJyb3IsIHVwZGF0ZSkgPT5cbiAgICAgIGlmIGVycm9yP1xuICAgICAgICBAZW1pdCAndXBkYXRlLW5vdC1hdmFpbGFibGUnXG4gICAgICAgIHJldHVyblxuXG4gICAgICB1bmxlc3MgdXBkYXRlP1xuICAgICAgICBAZW1pdCAndXBkYXRlLW5vdC1hdmFpbGFibGUnXG4gICAgICAgIHJldHVyblxuXG4gICAgICBAZW1pdCAndXBkYXRlLWF2YWlsYWJsZSdcblxuICAgICAgQGluc3RhbGxVcGRhdGUgKGVycm9yKSA9PlxuICAgICAgICBpZiBlcnJvcj9cbiAgICAgICAgICBAZW1pdCAndXBkYXRlLW5vdC1hdmFpbGFibGUnXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgQGVtaXQgJ3VwZGF0ZS1kb3dubG9hZGVkJywge30sIHVwZGF0ZS5yZWxlYXNlTm90ZXMsIHVwZGF0ZS52ZXJzaW9uLCBuZXcgRGF0ZSgpLCAnaHR0cHM6Ly9hdG9tLmlvJywgPT4gQHF1aXRBbmRJbnN0YWxsKClcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQXV0b1VwZGF0ZXIoKVxuIl19
