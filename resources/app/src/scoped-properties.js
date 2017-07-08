(function() {
  var CSON, ScopedProperties;

  CSON = require('season');

  module.exports = ScopedProperties = (function() {
    ScopedProperties.load = function(scopedPropertiesPath, config, callback) {
      return CSON.readFile(scopedPropertiesPath, function(error, scopedProperties) {
        if (scopedProperties == null) {
          scopedProperties = {};
        }
        if (error != null) {
          return callback(error);
        } else {
          return callback(null, new ScopedProperties(scopedPropertiesPath, scopedProperties, config));
        }
      });
    };

    function ScopedProperties(path, scopedProperties1, config1) {
      this.path = path;
      this.scopedProperties = scopedProperties1;
      this.config = config1;
    }

    ScopedProperties.prototype.activate = function() {
      var properties, ref, selector;
      ref = this.scopedProperties;
      for (selector in ref) {
        properties = ref[selector];
        this.config.set(null, properties, {
          scopeSelector: selector,
          source: this.path
        });
      }
    };

    ScopedProperties.prototype.deactivate = function() {
      var selector;
      for (selector in this.scopedProperties) {
        this.config.unset(null, {
          scopeSelector: selector,
          source: this.path
        });
      }
    };

    return ScopedProperties;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3Njb3BlZC1wcm9wZXJ0aWVzLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsSUFBQSxHQUFPLE9BQUEsQ0FBUSxRQUFSOztFQUVQLE1BQU0sQ0FBQyxPQUFQLEdBQ007SUFDSixnQkFBQyxDQUFBLElBQUQsR0FBTyxTQUFDLG9CQUFELEVBQXVCLE1BQXZCLEVBQStCLFFBQS9CO2FBQ0wsSUFBSSxDQUFDLFFBQUwsQ0FBYyxvQkFBZCxFQUFvQyxTQUFDLEtBQUQsRUFBUSxnQkFBUjs7VUFBUSxtQkFBaUI7O1FBQzNELElBQUcsYUFBSDtpQkFDRSxRQUFBLENBQVMsS0FBVCxFQURGO1NBQUEsTUFBQTtpQkFHRSxRQUFBLENBQVMsSUFBVCxFQUFtQixJQUFBLGdCQUFBLENBQWlCLG9CQUFqQixFQUF1QyxnQkFBdkMsRUFBeUQsTUFBekQsQ0FBbkIsRUFIRjs7TUFEa0MsQ0FBcEM7SUFESzs7SUFPTSwwQkFBQyxJQUFELEVBQVEsaUJBQVIsRUFBMkIsT0FBM0I7TUFBQyxJQUFDLENBQUEsT0FBRDtNQUFPLElBQUMsQ0FBQSxtQkFBRDtNQUFtQixJQUFDLENBQUEsU0FBRDtJQUEzQjs7K0JBRWIsUUFBQSxHQUFVLFNBQUE7QUFDUixVQUFBO0FBQUE7QUFBQSxXQUFBLGVBQUE7O1FBQ0UsSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUFSLENBQVksSUFBWixFQUFrQixVQUFsQixFQUE4QjtVQUFBLGFBQUEsRUFBZSxRQUFmO1VBQXlCLE1BQUEsRUFBUSxJQUFDLENBQUEsSUFBbEM7U0FBOUI7QUFERjtJQURROzsrQkFLVixVQUFBLEdBQVksU0FBQTtBQUNWLFVBQUE7QUFBQSxXQUFBLGlDQUFBO1FBQ0UsSUFBQyxDQUFBLE1BQU0sQ0FBQyxLQUFSLENBQWMsSUFBZCxFQUFvQjtVQUFBLGFBQUEsRUFBZSxRQUFmO1VBQXlCLE1BQUEsRUFBUSxJQUFDLENBQUEsSUFBbEM7U0FBcEI7QUFERjtJQURVOzs7OztBQWxCZCIsInNvdXJjZXNDb250ZW50IjpbIkNTT04gPSByZXF1aXJlICdzZWFzb24nXG5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIFNjb3BlZFByb3BlcnRpZXNcbiAgQGxvYWQ6IChzY29wZWRQcm9wZXJ0aWVzUGF0aCwgY29uZmlnLCBjYWxsYmFjaykgLT5cbiAgICBDU09OLnJlYWRGaWxlIHNjb3BlZFByb3BlcnRpZXNQYXRoLCAoZXJyb3IsIHNjb3BlZFByb3BlcnRpZXM9e30pIC0+XG4gICAgICBpZiBlcnJvcj9cbiAgICAgICAgY2FsbGJhY2soZXJyb3IpXG4gICAgICBlbHNlXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIG5ldyBTY29wZWRQcm9wZXJ0aWVzKHNjb3BlZFByb3BlcnRpZXNQYXRoLCBzY29wZWRQcm9wZXJ0aWVzLCBjb25maWcpKVxuXG4gIGNvbnN0cnVjdG9yOiAoQHBhdGgsIEBzY29wZWRQcm9wZXJ0aWVzLCBAY29uZmlnKSAtPlxuXG4gIGFjdGl2YXRlOiAtPlxuICAgIGZvciBzZWxlY3RvciwgcHJvcGVydGllcyBvZiBAc2NvcGVkUHJvcGVydGllc1xuICAgICAgQGNvbmZpZy5zZXQobnVsbCwgcHJvcGVydGllcywgc2NvcGVTZWxlY3Rvcjogc2VsZWN0b3IsIHNvdXJjZTogQHBhdGgpXG4gICAgcmV0dXJuXG5cbiAgZGVhY3RpdmF0ZTogLT5cbiAgICBmb3Igc2VsZWN0b3Igb2YgQHNjb3BlZFByb3BlcnRpZXNcbiAgICAgIEBjb25maWcudW5zZXQobnVsbCwgc2NvcGVTZWxlY3Rvcjogc2VsZWN0b3IsIHNvdXJjZTogQHBhdGgpXG4gICAgcmV0dXJuXG4iXX0=
