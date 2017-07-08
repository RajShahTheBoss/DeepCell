(function() {
  var CSON, KeymapManager, bundledKeymaps, fs, path, ref;

  fs = require('fs-plus');

  path = require('path');

  KeymapManager = require('atom-keymap');

  CSON = require('season');

  bundledKeymaps = (ref = require('../package.json')) != null ? ref._atomKeymaps : void 0;

  KeymapManager.prototype.onDidLoadBundledKeymaps = function(callback) {
    return this.emitter.on('did-load-bundled-keymaps', callback);
  };

  KeymapManager.prototype.onDidLoadUserKeymap = function(callback) {
    return this.emitter.on('did-load-user-keymap', callback);
  };

  KeymapManager.prototype.canLoadBundledKeymapsFromMemory = function() {
    return bundledKeymaps != null;
  };

  KeymapManager.prototype.loadBundledKeymaps = function() {
    var keymap, keymapName, keymapPath, keymapsPath, ref1;
    if (bundledKeymaps != null) {
      for (keymapName in bundledKeymaps) {
        keymap = bundledKeymaps[keymapName];
        keymapPath = "core:" + keymapName;
        this.add(keymapPath, keymap, 0, (ref1 = this.devMode) != null ? ref1 : false);
      }
    } else {
      keymapsPath = path.join(this.resourcePath, 'keymaps');
      this.loadKeymap(keymapsPath);
    }
    return this.emitter.emit('did-load-bundled-keymaps');
  };

  KeymapManager.prototype.getUserKeymapPath = function() {
    var userKeymapPath;
    if (this.configDirPath == null) {
      return "";
    }
    if (userKeymapPath = CSON.resolve(path.join(this.configDirPath, 'keymap'))) {
      return userKeymapPath;
    } else {
      return path.join(this.configDirPath, 'keymap.cson');
    }
  };

  KeymapManager.prototype.loadUserKeymap = function() {
    var detail, error, message, stack, userKeymapPath;
    userKeymapPath = this.getUserKeymapPath();
    if (!fs.isFileSync(userKeymapPath)) {
      return;
    }
    try {
      this.loadKeymap(userKeymapPath, {
        watch: true,
        suppressErrors: true,
        priority: 100
      });
    } catch (error1) {
      error = error1;
      if (error.message.indexOf('Unable to watch path') > -1) {
        message = "Unable to watch path: `" + (path.basename(userKeymapPath)) + "`. Make sure you\nhave permission to read `" + userKeymapPath + "`.\n\nOn linux there are currently problems with watch sizes. See\n[this document][watches] for more info.\n[watches]:https://github.com/atom/atom/blob/master/docs/build-instructions/linux.md#typeerror-unable-to-watch-path";
        this.notificationManager.addError(message, {
          dismissable: true
        });
      } else {
        detail = error.path;
        stack = error.stack;
        this.notificationManager.addFatalError(error.message, {
          detail: detail,
          stack: stack,
          dismissable: true
        });
      }
    }
    return this.emitter.emit('did-load-user-keymap');
  };

  KeymapManager.prototype.subscribeToFileReadFailure = function() {
    return this.onDidFailToReadFile((function(_this) {
      return function(error) {
        var detail, message, userKeymapPath;
        userKeymapPath = _this.getUserKeymapPath();
        message = "Failed to load `" + userKeymapPath + "`";
        detail = error.location != null ? error.stack : error.message;
        return _this.notificationManager.addError(message, {
          detail: detail,
          dismissable: true
        });
      };
    })(this));
  };

  module.exports = KeymapManager;

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2tleW1hcC1leHRlbnNpb25zLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsRUFBQSxHQUFLLE9BQUEsQ0FBUSxTQUFSOztFQUNMLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxhQUFBLEdBQWdCLE9BQUEsQ0FBUSxhQUFSOztFQUNoQixJQUFBLEdBQU8sT0FBQSxDQUFRLFFBQVI7O0VBRVAsY0FBQSxtREFBMkMsQ0FBRTs7RUFFN0MsYUFBYSxDQUFBLFNBQUUsQ0FBQSx1QkFBZixHQUF5QyxTQUFDLFFBQUQ7V0FDdkMsSUFBQyxDQUFBLE9BQU8sQ0FBQyxFQUFULENBQVksMEJBQVosRUFBd0MsUUFBeEM7RUFEdUM7O0VBR3pDLGFBQWEsQ0FBQSxTQUFFLENBQUEsbUJBQWYsR0FBcUMsU0FBQyxRQUFEO1dBQ25DLElBQUMsQ0FBQSxPQUFPLENBQUMsRUFBVCxDQUFZLHNCQUFaLEVBQW9DLFFBQXBDO0VBRG1DOztFQUdyQyxhQUFhLENBQUEsU0FBRSxDQUFBLCtCQUFmLEdBQWlELFNBQUE7V0FDL0M7RUFEK0M7O0VBR2pELGFBQWEsQ0FBQSxTQUFFLENBQUEsa0JBQWYsR0FBb0MsU0FBQTtBQUNsQyxRQUFBO0lBQUEsSUFBRyxzQkFBSDtBQUNFLFdBQUEsNEJBQUE7O1FBQ0UsVUFBQSxHQUFhLE9BQUEsR0FBUTtRQUNyQixJQUFDLENBQUEsR0FBRCxDQUFLLFVBQUwsRUFBaUIsTUFBakIsRUFBeUIsQ0FBekIseUNBQXVDLEtBQXZDO0FBRkYsT0FERjtLQUFBLE1BQUE7TUFLRSxXQUFBLEdBQWMsSUFBSSxDQUFDLElBQUwsQ0FBVSxJQUFDLENBQUEsWUFBWCxFQUF5QixTQUF6QjtNQUNkLElBQUMsQ0FBQSxVQUFELENBQVksV0FBWixFQU5GOztXQVFBLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLDBCQUFkO0VBVGtDOztFQVdwQyxhQUFhLENBQUEsU0FBRSxDQUFBLGlCQUFmLEdBQW1DLFNBQUE7QUFDakMsUUFBQTtJQUFBLElBQWlCLDBCQUFqQjtBQUFBLGFBQU8sR0FBUDs7SUFFQSxJQUFHLGNBQUEsR0FBaUIsSUFBSSxDQUFDLE9BQUwsQ0FBYSxJQUFJLENBQUMsSUFBTCxDQUFVLElBQUMsQ0FBQSxhQUFYLEVBQTBCLFFBQTFCLENBQWIsQ0FBcEI7YUFDRSxlQURGO0tBQUEsTUFBQTthQUdFLElBQUksQ0FBQyxJQUFMLENBQVUsSUFBQyxDQUFBLGFBQVgsRUFBMEIsYUFBMUIsRUFIRjs7RUFIaUM7O0VBUW5DLGFBQWEsQ0FBQSxTQUFFLENBQUEsY0FBZixHQUFnQyxTQUFBO0FBQzlCLFFBQUE7SUFBQSxjQUFBLEdBQWlCLElBQUMsQ0FBQSxpQkFBRCxDQUFBO0lBQ2pCLElBQUEsQ0FBYyxFQUFFLENBQUMsVUFBSCxDQUFjLGNBQWQsQ0FBZDtBQUFBLGFBQUE7O0FBRUE7TUFDRSxJQUFDLENBQUEsVUFBRCxDQUFZLGNBQVosRUFBNEI7UUFBQSxLQUFBLEVBQU8sSUFBUDtRQUFhLGNBQUEsRUFBZ0IsSUFBN0I7UUFBbUMsUUFBQSxFQUFVLEdBQTdDO09BQTVCLEVBREY7S0FBQSxjQUFBO01BRU07TUFDSixJQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBZCxDQUFzQixzQkFBdEIsQ0FBQSxHQUFnRCxDQUFDLENBQXBEO1FBQ0UsT0FBQSxHQUFVLHlCQUFBLEdBQ2dCLENBQUMsSUFBSSxDQUFDLFFBQUwsQ0FBYyxjQUFkLENBQUQsQ0FEaEIsR0FDK0MsNkNBRC9DLEdBRW1CLGNBRm5CLEdBRWtDO1FBTTVDLElBQUMsQ0FBQSxtQkFBbUIsQ0FBQyxRQUFyQixDQUE4QixPQUE5QixFQUF1QztVQUFDLFdBQUEsRUFBYSxJQUFkO1NBQXZDLEVBVEY7T0FBQSxNQUFBO1FBV0UsTUFBQSxHQUFTLEtBQUssQ0FBQztRQUNmLEtBQUEsR0FBUSxLQUFLLENBQUM7UUFDZCxJQUFDLENBQUEsbUJBQW1CLENBQUMsYUFBckIsQ0FBbUMsS0FBSyxDQUFDLE9BQXpDLEVBQWtEO1VBQUMsUUFBQSxNQUFEO1VBQVMsT0FBQSxLQUFUO1VBQWdCLFdBQUEsRUFBYSxJQUE3QjtTQUFsRCxFQWJGO09BSEY7O1dBa0JBLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLHNCQUFkO0VBdEI4Qjs7RUF5QmhDLGFBQWEsQ0FBQSxTQUFFLENBQUEsMEJBQWYsR0FBNEMsU0FBQTtXQUMxQyxJQUFDLENBQUEsbUJBQUQsQ0FBcUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEtBQUQ7QUFDbkIsWUFBQTtRQUFBLGNBQUEsR0FBaUIsS0FBQyxDQUFBLGlCQUFELENBQUE7UUFDakIsT0FBQSxHQUFVLGtCQUFBLEdBQW1CLGNBQW5CLEdBQWtDO1FBRTVDLE1BQUEsR0FBWSxzQkFBSCxHQUNQLEtBQUssQ0FBQyxLQURDLEdBR1AsS0FBSyxDQUFDO2VBRVIsS0FBQyxDQUFBLG1CQUFtQixDQUFDLFFBQXJCLENBQThCLE9BQTlCLEVBQXVDO1VBQUMsUUFBQSxNQUFEO1VBQVMsV0FBQSxFQUFhLElBQXRCO1NBQXZDO01BVG1CO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFyQjtFQUQwQzs7RUFZNUMsTUFBTSxDQUFDLE9BQVAsR0FBaUI7QUF4RWpCIiwic291cmNlc0NvbnRlbnQiOlsiZnMgPSByZXF1aXJlICdmcy1wbHVzJ1xucGF0aCA9IHJlcXVpcmUgJ3BhdGgnXG5LZXltYXBNYW5hZ2VyID0gcmVxdWlyZSAnYXRvbS1rZXltYXAnXG5DU09OID0gcmVxdWlyZSAnc2Vhc29uJ1xuXG5idW5kbGVkS2V5bWFwcyA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpPy5fYXRvbUtleW1hcHNcblxuS2V5bWFwTWFuYWdlcjo6b25EaWRMb2FkQnVuZGxlZEtleW1hcHMgPSAoY2FsbGJhY2spIC0+XG4gIEBlbWl0dGVyLm9uICdkaWQtbG9hZC1idW5kbGVkLWtleW1hcHMnLCBjYWxsYmFja1xuXG5LZXltYXBNYW5hZ2VyOjpvbkRpZExvYWRVc2VyS2V5bWFwID0gKGNhbGxiYWNrKSAtPlxuICBAZW1pdHRlci5vbiAnZGlkLWxvYWQtdXNlci1rZXltYXAnLCBjYWxsYmFja1xuXG5LZXltYXBNYW5hZ2VyOjpjYW5Mb2FkQnVuZGxlZEtleW1hcHNGcm9tTWVtb3J5ID0gLT5cbiAgYnVuZGxlZEtleW1hcHM/XG5cbktleW1hcE1hbmFnZXI6OmxvYWRCdW5kbGVkS2V5bWFwcyA9IC0+XG4gIGlmIGJ1bmRsZWRLZXltYXBzP1xuICAgIGZvciBrZXltYXBOYW1lLCBrZXltYXAgb2YgYnVuZGxlZEtleW1hcHNcbiAgICAgIGtleW1hcFBhdGggPSBcImNvcmU6I3trZXltYXBOYW1lfVwiXG4gICAgICBAYWRkKGtleW1hcFBhdGgsIGtleW1hcCwgMCwgQGRldk1vZGUgPyBmYWxzZSlcbiAgZWxzZVxuICAgIGtleW1hcHNQYXRoID0gcGF0aC5qb2luKEByZXNvdXJjZVBhdGgsICdrZXltYXBzJylcbiAgICBAbG9hZEtleW1hcChrZXltYXBzUGF0aClcblxuICBAZW1pdHRlci5lbWl0ICdkaWQtbG9hZC1idW5kbGVkLWtleW1hcHMnXG5cbktleW1hcE1hbmFnZXI6OmdldFVzZXJLZXltYXBQYXRoID0gLT5cbiAgcmV0dXJuIFwiXCIgdW5sZXNzIEBjb25maWdEaXJQYXRoP1xuXG4gIGlmIHVzZXJLZXltYXBQYXRoID0gQ1NPTi5yZXNvbHZlKHBhdGguam9pbihAY29uZmlnRGlyUGF0aCwgJ2tleW1hcCcpKVxuICAgIHVzZXJLZXltYXBQYXRoXG4gIGVsc2VcbiAgICBwYXRoLmpvaW4oQGNvbmZpZ0RpclBhdGgsICdrZXltYXAuY3NvbicpXG5cbktleW1hcE1hbmFnZXI6OmxvYWRVc2VyS2V5bWFwID0gLT5cbiAgdXNlcktleW1hcFBhdGggPSBAZ2V0VXNlcktleW1hcFBhdGgoKVxuICByZXR1cm4gdW5sZXNzIGZzLmlzRmlsZVN5bmModXNlcktleW1hcFBhdGgpXG5cbiAgdHJ5XG4gICAgQGxvYWRLZXltYXAodXNlcktleW1hcFBhdGgsIHdhdGNoOiB0cnVlLCBzdXBwcmVzc0Vycm9yczogdHJ1ZSwgcHJpb3JpdHk6IDEwMClcbiAgY2F0Y2ggZXJyb3JcbiAgICBpZiBlcnJvci5tZXNzYWdlLmluZGV4T2YoJ1VuYWJsZSB0byB3YXRjaCBwYXRoJykgPiAtMVxuICAgICAgbWVzc2FnZSA9IFwiXCJcIlxuICAgICAgICBVbmFibGUgdG8gd2F0Y2ggcGF0aDogYCN7cGF0aC5iYXNlbmFtZSh1c2VyS2V5bWFwUGF0aCl9YC4gTWFrZSBzdXJlIHlvdVxuICAgICAgICBoYXZlIHBlcm1pc3Npb24gdG8gcmVhZCBgI3t1c2VyS2V5bWFwUGF0aH1gLlxuXG4gICAgICAgIE9uIGxpbnV4IHRoZXJlIGFyZSBjdXJyZW50bHkgcHJvYmxlbXMgd2l0aCB3YXRjaCBzaXplcy4gU2VlXG4gICAgICAgIFt0aGlzIGRvY3VtZW50XVt3YXRjaGVzXSBmb3IgbW9yZSBpbmZvLlxuICAgICAgICBbd2F0Y2hlc106aHR0cHM6Ly9naXRodWIuY29tL2F0b20vYXRvbS9ibG9iL21hc3Rlci9kb2NzL2J1aWxkLWluc3RydWN0aW9ucy9saW51eC5tZCN0eXBlZXJyb3ItdW5hYmxlLXRvLXdhdGNoLXBhdGhcbiAgICAgIFwiXCJcIlxuICAgICAgQG5vdGlmaWNhdGlvbk1hbmFnZXIuYWRkRXJyb3IobWVzc2FnZSwge2Rpc21pc3NhYmxlOiB0cnVlfSlcbiAgICBlbHNlXG4gICAgICBkZXRhaWwgPSBlcnJvci5wYXRoXG4gICAgICBzdGFjayA9IGVycm9yLnN0YWNrXG4gICAgICBAbm90aWZpY2F0aW9uTWFuYWdlci5hZGRGYXRhbEVycm9yKGVycm9yLm1lc3NhZ2UsIHtkZXRhaWwsIHN0YWNrLCBkaXNtaXNzYWJsZTogdHJ1ZX0pXG5cbiAgQGVtaXR0ZXIuZW1pdCAnZGlkLWxvYWQtdXNlci1rZXltYXAnXG5cblxuS2V5bWFwTWFuYWdlcjo6c3Vic2NyaWJlVG9GaWxlUmVhZEZhaWx1cmUgPSAtPlxuICBAb25EaWRGYWlsVG9SZWFkRmlsZSAoZXJyb3IpID0+XG4gICAgdXNlcktleW1hcFBhdGggPSBAZ2V0VXNlcktleW1hcFBhdGgoKVxuICAgIG1lc3NhZ2UgPSBcIkZhaWxlZCB0byBsb2FkIGAje3VzZXJLZXltYXBQYXRofWBcIlxuXG4gICAgZGV0YWlsID0gaWYgZXJyb3IubG9jYXRpb24/XG4gICAgICBlcnJvci5zdGFja1xuICAgIGVsc2VcbiAgICAgIGVycm9yLm1lc3NhZ2VcblxuICAgIEBub3RpZmljYXRpb25NYW5hZ2VyLmFkZEVycm9yKG1lc3NhZ2UsIHtkZXRhaWwsIGRpc21pc3NhYmxlOiB0cnVlfSlcblxubW9kdWxlLmV4cG9ydHMgPSBLZXltYXBNYW5hZ2VyXG4iXX0=
