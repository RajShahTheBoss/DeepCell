(function() {
  var Package, ThemePackage, path,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  path = require('path');

  Package = require('./package');

  module.exports = ThemePackage = (function(superClass) {
    extend(ThemePackage, superClass);

    function ThemePackage() {
      return ThemePackage.__super__.constructor.apply(this, arguments);
    }

    ThemePackage.prototype.getType = function() {
      return 'theme';
    };

    ThemePackage.prototype.getStyleSheetPriority = function() {
      return 1;
    };

    ThemePackage.prototype.enable = function() {
      return this.config.unshiftAtKeyPath('core.themes', this.name);
    };

    ThemePackage.prototype.disable = function() {
      return this.config.removeAtKeyPath('core.themes', this.name);
    };

    ThemePackage.prototype.preload = function() {
      this.loadTime = 0;
      return this.configSchemaRegisteredOnLoad = this.registerConfigSchemaFromMetadata();
    };

    ThemePackage.prototype.finishLoading = function() {
      return this.path = path.join(this.packageManager.resourcePath, this.path);
    };

    ThemePackage.prototype.load = function() {
      this.loadTime = 0;
      this.configSchemaRegisteredOnLoad = this.registerConfigSchemaFromMetadata();
      return this;
    };

    ThemePackage.prototype.activate = function() {
      return this.activationPromise != null ? this.activationPromise : this.activationPromise = new Promise((function(_this) {
        return function(resolve, reject) {
          _this.resolveActivationPromise = resolve;
          _this.rejectActivationPromise = reject;
          return _this.measure('activateTime', function() {
            var error;
            try {
              _this.loadStylesheets();
              return _this.activateNow();
            } catch (error1) {
              error = error1;
              return _this.handleError("Failed to activate the " + _this.name + " theme", error);
            }
          });
        };
      })(this));
    };

    return ThemePackage;

  })(Package);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3RoZW1lLXBhY2thZ2UuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSwyQkFBQTtJQUFBOzs7RUFBQSxJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7O0VBQ1AsT0FBQSxHQUFVLE9BQUEsQ0FBUSxXQUFSOztFQUVWLE1BQU0sQ0FBQyxPQUFQLEdBQ007Ozs7Ozs7MkJBQ0osT0FBQSxHQUFTLFNBQUE7YUFBRztJQUFIOzsyQkFFVCxxQkFBQSxHQUF1QixTQUFBO2FBQUc7SUFBSDs7MkJBRXZCLE1BQUEsR0FBUSxTQUFBO2FBQ04sSUFBQyxDQUFBLE1BQU0sQ0FBQyxnQkFBUixDQUF5QixhQUF6QixFQUF3QyxJQUFDLENBQUEsSUFBekM7SUFETTs7MkJBR1IsT0FBQSxHQUFTLFNBQUE7YUFDUCxJQUFDLENBQUEsTUFBTSxDQUFDLGVBQVIsQ0FBd0IsYUFBeEIsRUFBdUMsSUFBQyxDQUFBLElBQXhDO0lBRE87OzJCQUdULE9BQUEsR0FBUyxTQUFBO01BQ1AsSUFBQyxDQUFBLFFBQUQsR0FBWTthQUNaLElBQUMsQ0FBQSw0QkFBRCxHQUFnQyxJQUFDLENBQUEsZ0NBQUQsQ0FBQTtJQUZ6Qjs7MkJBSVQsYUFBQSxHQUFlLFNBQUE7YUFDYixJQUFDLENBQUEsSUFBRCxHQUFRLElBQUksQ0FBQyxJQUFMLENBQVUsSUFBQyxDQUFBLGNBQWMsQ0FBQyxZQUExQixFQUF3QyxJQUFDLENBQUEsSUFBekM7SUFESzs7MkJBR2YsSUFBQSxHQUFNLFNBQUE7TUFDSixJQUFDLENBQUEsUUFBRCxHQUFZO01BQ1osSUFBQyxDQUFBLDRCQUFELEdBQWdDLElBQUMsQ0FBQSxnQ0FBRCxDQUFBO2FBQ2hDO0lBSEk7OzJCQUtOLFFBQUEsR0FBVSxTQUFBOzhDQUNSLElBQUMsQ0FBQSxvQkFBRCxJQUFDLENBQUEsb0JBQXlCLElBQUEsT0FBQSxDQUFRLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxPQUFELEVBQVUsTUFBVjtVQUNoQyxLQUFDLENBQUEsd0JBQUQsR0FBNEI7VUFDNUIsS0FBQyxDQUFBLHVCQUFELEdBQTJCO2lCQUMzQixLQUFDLENBQUEsT0FBRCxDQUFTLGNBQVQsRUFBeUIsU0FBQTtBQUN2QixnQkFBQTtBQUFBO2NBQ0UsS0FBQyxDQUFBLGVBQUQsQ0FBQTtxQkFDQSxLQUFDLENBQUEsV0FBRCxDQUFBLEVBRkY7YUFBQSxjQUFBO2NBR007cUJBQ0osS0FBQyxDQUFBLFdBQUQsQ0FBYSx5QkFBQSxHQUEwQixLQUFDLENBQUEsSUFBM0IsR0FBZ0MsUUFBN0MsRUFBc0QsS0FBdEQsRUFKRjs7VUFEdUIsQ0FBekI7UUFIZ0M7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVI7SUFEbEI7Ozs7S0F2QmU7QUFKM0IiLCJzb3VyY2VzQ29udGVudCI6WyJwYXRoID0gcmVxdWlyZSAncGF0aCdcblBhY2thZ2UgPSByZXF1aXJlICcuL3BhY2thZ2UnXG5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIFRoZW1lUGFja2FnZSBleHRlbmRzIFBhY2thZ2VcbiAgZ2V0VHlwZTogLT4gJ3RoZW1lJ1xuXG4gIGdldFN0eWxlU2hlZXRQcmlvcml0eTogLT4gMVxuXG4gIGVuYWJsZTogLT5cbiAgICBAY29uZmlnLnVuc2hpZnRBdEtleVBhdGgoJ2NvcmUudGhlbWVzJywgQG5hbWUpXG5cbiAgZGlzYWJsZTogLT5cbiAgICBAY29uZmlnLnJlbW92ZUF0S2V5UGF0aCgnY29yZS50aGVtZXMnLCBAbmFtZSlcblxuICBwcmVsb2FkOiAtPlxuICAgIEBsb2FkVGltZSA9IDBcbiAgICBAY29uZmlnU2NoZW1hUmVnaXN0ZXJlZE9uTG9hZCA9IEByZWdpc3RlckNvbmZpZ1NjaGVtYUZyb21NZXRhZGF0YSgpXG5cbiAgZmluaXNoTG9hZGluZzogLT5cbiAgICBAcGF0aCA9IHBhdGguam9pbihAcGFja2FnZU1hbmFnZXIucmVzb3VyY2VQYXRoLCBAcGF0aClcblxuICBsb2FkOiAtPlxuICAgIEBsb2FkVGltZSA9IDBcbiAgICBAY29uZmlnU2NoZW1hUmVnaXN0ZXJlZE9uTG9hZCA9IEByZWdpc3RlckNvbmZpZ1NjaGVtYUZyb21NZXRhZGF0YSgpXG4gICAgdGhpc1xuXG4gIGFjdGl2YXRlOiAtPlxuICAgIEBhY3RpdmF0aW9uUHJvbWlzZSA/PSBuZXcgUHJvbWlzZSAocmVzb2x2ZSwgcmVqZWN0KSA9PlxuICAgICAgQHJlc29sdmVBY3RpdmF0aW9uUHJvbWlzZSA9IHJlc29sdmVcbiAgICAgIEByZWplY3RBY3RpdmF0aW9uUHJvbWlzZSA9IHJlamVjdFxuICAgICAgQG1lYXN1cmUgJ2FjdGl2YXRlVGltZScsID0+XG4gICAgICAgIHRyeVxuICAgICAgICAgIEBsb2FkU3R5bGVzaGVldHMoKVxuICAgICAgICAgIEBhY3RpdmF0ZU5vdygpXG4gICAgICAgIGNhdGNoIGVycm9yXG4gICAgICAgICAgQGhhbmRsZUVycm9yKFwiRmFpbGVkIHRvIGFjdGl2YXRlIHRoZSAje0BuYW1lfSB0aGVtZVwiLCBlcnJvcilcbiJdfQ==
