(function() {
  var StorageFolder, fs, path;

  path = require("path");

  fs = require("fs-plus");

  module.exports = StorageFolder = (function() {
    function StorageFolder(containingPath) {
      if (containingPath != null) {
        this.path = path.join(containingPath, "storage");
      }
    }

    StorageFolder.prototype.clear = function() {
      var error;
      if (this.path == null) {
        return;
      }
      try {
        return fs.removeSync(this.path);
      } catch (error1) {
        error = error1;
        return console.warn("Error deleting " + this.path, error.stack, error);
      }
    };

    StorageFolder.prototype.storeSync = function(name, object) {
      if (this.path == null) {
        return;
      }
      return fs.writeFileSync(this.pathForKey(name), JSON.stringify(object), 'utf8');
    };

    StorageFolder.prototype.load = function(name) {
      var error, statePath, stateString;
      if (this.path == null) {
        return;
      }
      statePath = this.pathForKey(name);
      try {
        stateString = fs.readFileSync(statePath, 'utf8');
      } catch (error1) {
        error = error1;
        if (error.code !== 'ENOENT') {
          console.warn("Error reading state file: " + statePath, error.stack, error);
        }
        return void 0;
      }
      try {
        return JSON.parse(stateString);
      } catch (error1) {
        error = error1;
        return console.warn("Error parsing state file: " + statePath, error.stack, error);
      }
    };

    StorageFolder.prototype.pathForKey = function(name) {
      return path.join(this.getPath(), name);
    };

    StorageFolder.prototype.getPath = function() {
      return this.path;
    };

    return StorageFolder;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3N0b3JhZ2UtZm9sZGVyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLEVBQUEsR0FBSyxPQUFBLENBQVEsU0FBUjs7RUFFTCxNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1MsdUJBQUMsY0FBRDtNQUNYLElBQWdELHNCQUFoRDtRQUFBLElBQUMsQ0FBQSxJQUFELEdBQVEsSUFBSSxDQUFDLElBQUwsQ0FBVSxjQUFWLEVBQTBCLFNBQTFCLEVBQVI7O0lBRFc7OzRCQUdiLEtBQUEsR0FBTyxTQUFBO0FBQ0wsVUFBQTtNQUFBLElBQWMsaUJBQWQ7QUFBQSxlQUFBOztBQUVBO2VBQ0UsRUFBRSxDQUFDLFVBQUgsQ0FBYyxJQUFDLENBQUEsSUFBZixFQURGO09BQUEsY0FBQTtRQUVNO2VBQ0osT0FBTyxDQUFDLElBQVIsQ0FBYSxpQkFBQSxHQUFrQixJQUFDLENBQUEsSUFBaEMsRUFBd0MsS0FBSyxDQUFDLEtBQTlDLEVBQXFELEtBQXJELEVBSEY7O0lBSEs7OzRCQVFQLFNBQUEsR0FBVyxTQUFDLElBQUQsRUFBTyxNQUFQO01BQ1QsSUFBYyxpQkFBZDtBQUFBLGVBQUE7O2FBRUEsRUFBRSxDQUFDLGFBQUgsQ0FBaUIsSUFBQyxDQUFBLFVBQUQsQ0FBWSxJQUFaLENBQWpCLEVBQW9DLElBQUksQ0FBQyxTQUFMLENBQWUsTUFBZixDQUFwQyxFQUE0RCxNQUE1RDtJQUhTOzs0QkFLWCxJQUFBLEdBQU0sU0FBQyxJQUFEO0FBQ0osVUFBQTtNQUFBLElBQWMsaUJBQWQ7QUFBQSxlQUFBOztNQUVBLFNBQUEsR0FBWSxJQUFDLENBQUEsVUFBRCxDQUFZLElBQVo7QUFDWjtRQUNFLFdBQUEsR0FBYyxFQUFFLENBQUMsWUFBSCxDQUFnQixTQUFoQixFQUEyQixNQUEzQixFQURoQjtPQUFBLGNBQUE7UUFFTTtRQUNKLElBQU8sS0FBSyxDQUFDLElBQU4sS0FBYyxRQUFyQjtVQUNFLE9BQU8sQ0FBQyxJQUFSLENBQWEsNEJBQUEsR0FBNkIsU0FBMUMsRUFBdUQsS0FBSyxDQUFDLEtBQTdELEVBQW9FLEtBQXBFLEVBREY7O0FBRUEsZUFBTyxPQUxUOztBQU9BO2VBQ0UsSUFBSSxDQUFDLEtBQUwsQ0FBVyxXQUFYLEVBREY7T0FBQSxjQUFBO1FBRU07ZUFDSixPQUFPLENBQUMsSUFBUixDQUFhLDRCQUFBLEdBQTZCLFNBQTFDLEVBQXVELEtBQUssQ0FBQyxLQUE3RCxFQUFvRSxLQUFwRSxFQUhGOztJQVhJOzs0QkFnQk4sVUFBQSxHQUFZLFNBQUMsSUFBRDthQUFVLElBQUksQ0FBQyxJQUFMLENBQVUsSUFBQyxDQUFBLE9BQUQsQ0FBQSxDQUFWLEVBQXNCLElBQXRCO0lBQVY7OzRCQUNaLE9BQUEsR0FBUyxTQUFBO2FBQUcsSUFBQyxDQUFBO0lBQUo7Ozs7O0FBdENYIiwic291cmNlc0NvbnRlbnQiOlsicGF0aCA9IHJlcXVpcmUgXCJwYXRoXCJcbmZzID0gcmVxdWlyZSBcImZzLXBsdXNcIlxuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBTdG9yYWdlRm9sZGVyXG4gIGNvbnN0cnVjdG9yOiAoY29udGFpbmluZ1BhdGgpIC0+XG4gICAgQHBhdGggPSBwYXRoLmpvaW4oY29udGFpbmluZ1BhdGgsIFwic3RvcmFnZVwiKSBpZiBjb250YWluaW5nUGF0aD9cblxuICBjbGVhcjogLT5cbiAgICByZXR1cm4gdW5sZXNzIEBwYXRoP1xuXG4gICAgdHJ5XG4gICAgICBmcy5yZW1vdmVTeW5jKEBwYXRoKVxuICAgIGNhdGNoIGVycm9yXG4gICAgICBjb25zb2xlLndhcm4gXCJFcnJvciBkZWxldGluZyAje0BwYXRofVwiLCBlcnJvci5zdGFjaywgZXJyb3JcblxuICBzdG9yZVN5bmM6IChuYW1lLCBvYmplY3QpIC0+XG4gICAgcmV0dXJuIHVubGVzcyBAcGF0aD9cblxuICAgIGZzLndyaXRlRmlsZVN5bmMoQHBhdGhGb3JLZXkobmFtZSksIEpTT04uc3RyaW5naWZ5KG9iamVjdCksICd1dGY4JylcblxuICBsb2FkOiAobmFtZSkgLT5cbiAgICByZXR1cm4gdW5sZXNzIEBwYXRoP1xuXG4gICAgc3RhdGVQYXRoID0gQHBhdGhGb3JLZXkobmFtZSlcbiAgICB0cnlcbiAgICAgIHN0YXRlU3RyaW5nID0gZnMucmVhZEZpbGVTeW5jKHN0YXRlUGF0aCwgJ3V0ZjgnKVxuICAgIGNhdGNoIGVycm9yXG4gICAgICB1bmxlc3MgZXJyb3IuY29kZSBpcyAnRU5PRU5UJ1xuICAgICAgICBjb25zb2xlLndhcm4gXCJFcnJvciByZWFkaW5nIHN0YXRlIGZpbGU6ICN7c3RhdGVQYXRofVwiLCBlcnJvci5zdGFjaywgZXJyb3JcbiAgICAgIHJldHVybiB1bmRlZmluZWRcblxuICAgIHRyeVxuICAgICAgSlNPTi5wYXJzZShzdGF0ZVN0cmluZylcbiAgICBjYXRjaCBlcnJvclxuICAgICAgY29uc29sZS53YXJuIFwiRXJyb3IgcGFyc2luZyBzdGF0ZSBmaWxlOiAje3N0YXRlUGF0aH1cIiwgZXJyb3Iuc3RhY2ssIGVycm9yXG5cbiAgcGF0aEZvcktleTogKG5hbWUpIC0+IHBhdGguam9pbihAZ2V0UGF0aCgpLCBuYW1lKVxuICBnZXRQYXRoOiAtPiBAcGF0aFxuIl19
