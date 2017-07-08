(function() {
  var AtomProtocolHandler, fs, path, protocol;

  protocol = require('electron').protocol;

  fs = require('fs');

  path = require('path');

  module.exports = AtomProtocolHandler = (function() {
    function AtomProtocolHandler(resourcePath, safeMode) {
      this.loadPaths = [];
      if (!safeMode) {
        this.loadPaths.push(path.join(process.env.ATOM_HOME, 'dev', 'packages'));
      }
      this.loadPaths.push(path.join(process.env.ATOM_HOME, 'packages'));
      this.loadPaths.push(path.join(resourcePath, 'node_modules'));
      this.registerAtomProtocol();
    }

    AtomProtocolHandler.prototype.registerAtomProtocol = function() {
      return protocol.registerFileProtocol('atom', (function(_this) {
        return function(request, callback) {
          var assetsPath, base, base1, filePath, i, len, loadPath, ref, relativePath;
          relativePath = path.normalize(request.url.substr(7));
          if (relativePath.indexOf('assets/') === 0) {
            assetsPath = path.join(process.env.ATOM_HOME, relativePath);
            if (typeof (base = fs.statSyncNoException(assetsPath)).isFile === "function" ? base.isFile() : void 0) {
              filePath = assetsPath;
            }
          }
          if (!filePath) {
            ref = _this.loadPaths;
            for (i = 0, len = ref.length; i < len; i++) {
              loadPath = ref[i];
              filePath = path.join(loadPath, relativePath);
              if (typeof (base1 = fs.statSyncNoException(filePath)).isFile === "function" ? base1.isFile() : void 0) {
                break;
              }
            }
          }
          return callback(filePath);
        };
      })(this));
    };

    return AtomProtocolHandler;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21haW4tcHJvY2Vzcy9hdG9tLXByb3RvY29sLWhhbmRsZXIuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQyxXQUFZLE9BQUEsQ0FBUSxVQUFSOztFQUNiLEVBQUEsR0FBSyxPQUFBLENBQVEsSUFBUjs7RUFDTCxJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7O0VBYVAsTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNTLDZCQUFDLFlBQUQsRUFBZSxRQUFmO01BQ1gsSUFBQyxDQUFBLFNBQUQsR0FBYTtNQUViLElBQUEsQ0FBTyxRQUFQO1FBQ0UsSUFBQyxDQUFBLFNBQVMsQ0FBQyxJQUFYLENBQWdCLElBQUksQ0FBQyxJQUFMLENBQVUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUF0QixFQUFpQyxLQUFqQyxFQUF3QyxVQUF4QyxDQUFoQixFQURGOztNQUdBLElBQUMsQ0FBQSxTQUFTLENBQUMsSUFBWCxDQUFnQixJQUFJLENBQUMsSUFBTCxDQUFVLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBdEIsRUFBaUMsVUFBakMsQ0FBaEI7TUFDQSxJQUFDLENBQUEsU0FBUyxDQUFDLElBQVgsQ0FBZ0IsSUFBSSxDQUFDLElBQUwsQ0FBVSxZQUFWLEVBQXdCLGNBQXhCLENBQWhCO01BRUEsSUFBQyxDQUFBLG9CQUFELENBQUE7SUFUVzs7a0NBWWIsb0JBQUEsR0FBc0IsU0FBQTthQUNwQixRQUFRLENBQUMsb0JBQVQsQ0FBOEIsTUFBOUIsRUFBc0MsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLE9BQUQsRUFBVSxRQUFWO0FBQ3BDLGNBQUE7VUFBQSxZQUFBLEdBQWUsSUFBSSxDQUFDLFNBQUwsQ0FBZSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQVosQ0FBbUIsQ0FBbkIsQ0FBZjtVQUVmLElBQUcsWUFBWSxDQUFDLE9BQWIsQ0FBcUIsU0FBckIsQ0FBQSxLQUFtQyxDQUF0QztZQUNFLFVBQUEsR0FBYSxJQUFJLENBQUMsSUFBTCxDQUFVLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBdEIsRUFBaUMsWUFBakM7WUFDYixtRkFBMkQsQ0FBQyxpQkFBNUQ7Y0FBQSxRQUFBLEdBQVcsV0FBWDthQUZGOztVQUlBLElBQUEsQ0FBTyxRQUFQO0FBQ0U7QUFBQSxpQkFBQSxxQ0FBQTs7Y0FDRSxRQUFBLEdBQVcsSUFBSSxDQUFDLElBQUwsQ0FBVSxRQUFWLEVBQW9CLFlBQXBCO2NBQ1gsbUZBQXlDLENBQUMsaUJBQTFDO0FBQUEsc0JBQUE7O0FBRkYsYUFERjs7aUJBS0EsUUFBQSxDQUFTLFFBQVQ7UUFab0M7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXRDO0lBRG9COzs7OztBQTdCeEIiLCJzb3VyY2VzQ29udGVudCI6WyJ7cHJvdG9jb2x9ID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5mcyA9IHJlcXVpcmUgJ2ZzJ1xucGF0aCA9IHJlcXVpcmUgJ3BhdGgnXG5cbiMgSGFuZGxlcyByZXF1ZXN0cyB3aXRoICdhdG9tJyBwcm90b2NvbC5cbiNcbiMgSXQncyBjcmVhdGVkIGJ5IHtBdG9tQXBwbGljYXRpb259IHVwb24gaW5zdGFudGlhdGlvbiBhbmQgaXMgdXNlZCB0byBjcmVhdGUgYVxuIyBjdXN0b20gcmVzb3VyY2UgbG9hZGVyIGZvciAnYXRvbTovLycgVVJMcy5cbiNcbiMgVGhlIGZvbGxvd2luZyBkaXJlY3RvcmllcyBhcmUgc2VhcmNoZWQgaW4gb3JkZXI6XG4jICAgKiB+Ly5hdG9tL2Fzc2V0c1xuIyAgICogfi8uYXRvbS9kZXYvcGFja2FnZXMgKHVubGVzcyBpbiBzYWZlIG1vZGUpXG4jICAgKiB+Ly5hdG9tL3BhY2thZ2VzXG4jICAgKiBSRVNPVVJDRV9QQVRIL25vZGVfbW9kdWxlc1xuI1xubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgQXRvbVByb3RvY29sSGFuZGxlclxuICBjb25zdHJ1Y3RvcjogKHJlc291cmNlUGF0aCwgc2FmZU1vZGUpIC0+XG4gICAgQGxvYWRQYXRocyA9IFtdXG5cbiAgICB1bmxlc3Mgc2FmZU1vZGVcbiAgICAgIEBsb2FkUGF0aHMucHVzaChwYXRoLmpvaW4ocHJvY2Vzcy5lbnYuQVRPTV9IT01FLCAnZGV2JywgJ3BhY2thZ2VzJykpXG5cbiAgICBAbG9hZFBhdGhzLnB1c2gocGF0aC5qb2luKHByb2Nlc3MuZW52LkFUT01fSE9NRSwgJ3BhY2thZ2VzJykpXG4gICAgQGxvYWRQYXRocy5wdXNoKHBhdGguam9pbihyZXNvdXJjZVBhdGgsICdub2RlX21vZHVsZXMnKSlcblxuICAgIEByZWdpc3RlckF0b21Qcm90b2NvbCgpXG5cbiAgIyBDcmVhdGVzIHRoZSAnYXRvbScgY3VzdG9tIHByb3RvY29sIGhhbmRsZXIuXG4gIHJlZ2lzdGVyQXRvbVByb3RvY29sOiAtPlxuICAgIHByb3RvY29sLnJlZ2lzdGVyRmlsZVByb3RvY29sICdhdG9tJywgKHJlcXVlc3QsIGNhbGxiYWNrKSA9PlxuICAgICAgcmVsYXRpdmVQYXRoID0gcGF0aC5ub3JtYWxpemUocmVxdWVzdC51cmwuc3Vic3RyKDcpKVxuXG4gICAgICBpZiByZWxhdGl2ZVBhdGguaW5kZXhPZignYXNzZXRzLycpIGlzIDBcbiAgICAgICAgYXNzZXRzUGF0aCA9IHBhdGguam9pbihwcm9jZXNzLmVudi5BVE9NX0hPTUUsIHJlbGF0aXZlUGF0aClcbiAgICAgICAgZmlsZVBhdGggPSBhc3NldHNQYXRoIGlmIGZzLnN0YXRTeW5jTm9FeGNlcHRpb24oYXNzZXRzUGF0aCkuaXNGaWxlPygpXG5cbiAgICAgIHVubGVzcyBmaWxlUGF0aFxuICAgICAgICBmb3IgbG9hZFBhdGggaW4gQGxvYWRQYXRoc1xuICAgICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKGxvYWRQYXRoLCByZWxhdGl2ZVBhdGgpXG4gICAgICAgICAgYnJlYWsgaWYgZnMuc3RhdFN5bmNOb0V4Y2VwdGlvbihmaWxlUGF0aCkuaXNGaWxlPygpXG5cbiAgICAgIGNhbGxiYWNrKGZpbGVQYXRoKVxuIl19
