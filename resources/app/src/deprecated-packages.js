(function() {
  var Range, deprecatedPackages, ranges, ref, ref1, satisfies, semver,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  semver = require('semver');

  deprecatedPackages = (ref = (ref1 = require('../package.json')) != null ? ref1._deprecatedPackages : void 0) != null ? ref : {};

  ranges = {};

  exports.getDeprecatedPackageMetadata = function(name) {
    var metadata;
    metadata = null;
    if (deprecatedPackages.hasOwnProperty(name)) {
      metadata = deprecatedPackages[name];
    }
    if (metadata) {
      Object.freeze(metadata);
    }
    return metadata;
  };

  exports.isDeprecatedPackage = function(name, version) {
    var deprecatedVersionRange;
    if (!deprecatedPackages.hasOwnProperty(name)) {
      return false;
    }
    deprecatedVersionRange = deprecatedPackages[name].version;
    if (!deprecatedVersionRange) {
      return true;
    }
    return semver.valid(version) && satisfies(version, deprecatedVersionRange);
  };

  satisfies = function(version, rawRange) {
    var parsedRange;
    if (!(parsedRange = ranges[rawRange])) {
      parsedRange = new Range(rawRange);
      ranges[rawRange] = parsedRange;
    }
    return parsedRange.test(version);
  };

  Range = (function(superClass) {
    extend(Range, superClass);

    function Range() {
      Range.__super__.constructor.apply(this, arguments);
      this.matchedVersions = new Set();
      this.unmatchedVersions = new Set();
    }

    Range.prototype.test = function(version) {
      var matches;
      if (this.matchedVersions.has(version)) {
        return true;
      }
      if (this.unmatchedVersions.has(version)) {
        return false;
      }
      matches = Range.__super__.test.apply(this, arguments);
      if (matches) {
        this.matchedVersions.add(version);
      } else {
        this.unmatchedVersions.add(version);
      }
      return matches;
    };

    return Range;

  })(semver.Range);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2RlcHJlY2F0ZWQtcGFja2FnZXMuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSwrREFBQTtJQUFBOzs7RUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0VBRVQsa0JBQUEsMkdBQXVFOztFQUN2RSxNQUFBLEdBQVM7O0VBRVQsT0FBTyxDQUFDLDRCQUFSLEdBQXVDLFNBQUMsSUFBRDtBQUNyQyxRQUFBO0lBQUEsUUFBQSxHQUFXO0lBQ1gsSUFBRyxrQkFBa0IsQ0FBQyxjQUFuQixDQUFrQyxJQUFsQyxDQUFIO01BQ0UsUUFBQSxHQUFXLGtCQUFtQixDQUFBLElBQUEsRUFEaEM7O0lBRUEsSUFBMkIsUUFBM0I7TUFBQSxNQUFNLENBQUMsTUFBUCxDQUFjLFFBQWQsRUFBQTs7V0FDQTtFQUxxQzs7RUFPdkMsT0FBTyxDQUFDLG1CQUFSLEdBQThCLFNBQUMsSUFBRCxFQUFPLE9BQVA7QUFDNUIsUUFBQTtJQUFBLElBQUEsQ0FBb0Isa0JBQWtCLENBQUMsY0FBbkIsQ0FBa0MsSUFBbEMsQ0FBcEI7QUFBQSxhQUFPLE1BQVA7O0lBRUEsc0JBQUEsR0FBeUIsa0JBQW1CLENBQUEsSUFBQSxDQUFLLENBQUM7SUFDbEQsSUFBQSxDQUFtQixzQkFBbkI7QUFBQSxhQUFPLEtBQVA7O1dBRUEsTUFBTSxDQUFDLEtBQVAsQ0FBYSxPQUFiLENBQUEsSUFBMEIsU0FBQSxDQUFVLE9BQVYsRUFBbUIsc0JBQW5CO0VBTkU7O0VBUTlCLFNBQUEsR0FBWSxTQUFDLE9BQUQsRUFBVSxRQUFWO0FBQ1YsUUFBQTtJQUFBLElBQUEsQ0FBTyxDQUFBLFdBQUEsR0FBYyxNQUFPLENBQUEsUUFBQSxDQUFyQixDQUFQO01BQ0UsV0FBQSxHQUFrQixJQUFBLEtBQUEsQ0FBTSxRQUFOO01BQ2xCLE1BQU8sQ0FBQSxRQUFBLENBQVAsR0FBbUIsWUFGckI7O1dBR0EsV0FBVyxDQUFDLElBQVosQ0FBaUIsT0FBakI7RUFKVTs7RUFPTjs7O0lBQ1MsZUFBQTtNQUNYLHdDQUFBLFNBQUE7TUFDQSxJQUFDLENBQUEsZUFBRCxHQUF1QixJQUFBLEdBQUEsQ0FBQTtNQUN2QixJQUFDLENBQUEsaUJBQUQsR0FBeUIsSUFBQSxHQUFBLENBQUE7SUFIZDs7b0JBS2IsSUFBQSxHQUFNLFNBQUMsT0FBRDtBQUNKLFVBQUE7TUFBQSxJQUFlLElBQUMsQ0FBQSxlQUFlLENBQUMsR0FBakIsQ0FBcUIsT0FBckIsQ0FBZjtBQUFBLGVBQU8sS0FBUDs7TUFDQSxJQUFnQixJQUFDLENBQUEsaUJBQWlCLENBQUMsR0FBbkIsQ0FBdUIsT0FBdkIsQ0FBaEI7QUFBQSxlQUFPLE1BQVA7O01BRUEsT0FBQSxHQUFVLGlDQUFBLFNBQUE7TUFDVixJQUFHLE9BQUg7UUFDRSxJQUFDLENBQUEsZUFBZSxDQUFDLEdBQWpCLENBQXFCLE9BQXJCLEVBREY7T0FBQSxNQUFBO1FBR0UsSUFBQyxDQUFBLGlCQUFpQixDQUFDLEdBQW5CLENBQXVCLE9BQXZCLEVBSEY7O2FBSUE7SUFUSTs7OztLQU5ZLE1BQU0sQ0FBQztBQTNCM0IiLCJzb3VyY2VzQ29udGVudCI6WyJzZW12ZXIgPSByZXF1aXJlICdzZW12ZXInXG5cbmRlcHJlY2F0ZWRQYWNrYWdlcyA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpPy5fZGVwcmVjYXRlZFBhY2thZ2VzID8ge31cbnJhbmdlcyA9IHt9XG5cbmV4cG9ydHMuZ2V0RGVwcmVjYXRlZFBhY2thZ2VNZXRhZGF0YSA9IChuYW1lKSAtPlxuICBtZXRhZGF0YSA9IG51bGxcbiAgaWYgZGVwcmVjYXRlZFBhY2thZ2VzLmhhc093blByb3BlcnR5KG5hbWUpXG4gICAgbWV0YWRhdGEgPSBkZXByZWNhdGVkUGFja2FnZXNbbmFtZV1cbiAgT2JqZWN0LmZyZWV6ZShtZXRhZGF0YSkgaWYgbWV0YWRhdGFcbiAgbWV0YWRhdGFcblxuZXhwb3J0cy5pc0RlcHJlY2F0ZWRQYWNrYWdlID0gKG5hbWUsIHZlcnNpb24pIC0+XG4gIHJldHVybiBmYWxzZSB1bmxlc3MgZGVwcmVjYXRlZFBhY2thZ2VzLmhhc093blByb3BlcnR5KG5hbWUpXG5cbiAgZGVwcmVjYXRlZFZlcnNpb25SYW5nZSA9IGRlcHJlY2F0ZWRQYWNrYWdlc1tuYW1lXS52ZXJzaW9uXG4gIHJldHVybiB0cnVlIHVubGVzcyBkZXByZWNhdGVkVmVyc2lvblJhbmdlXG5cbiAgc2VtdmVyLnZhbGlkKHZlcnNpb24pIGFuZCBzYXRpc2ZpZXModmVyc2lvbiwgZGVwcmVjYXRlZFZlcnNpb25SYW5nZSlcblxuc2F0aXNmaWVzID0gKHZlcnNpb24sIHJhd1JhbmdlKSAtPlxuICB1bmxlc3MgcGFyc2VkUmFuZ2UgPSByYW5nZXNbcmF3UmFuZ2VdXG4gICAgcGFyc2VkUmFuZ2UgPSBuZXcgUmFuZ2UocmF3UmFuZ2UpXG4gICAgcmFuZ2VzW3Jhd1JhbmdlXSA9IHBhcnNlZFJhbmdlXG4gIHBhcnNlZFJhbmdlLnRlc3QodmVyc2lvbilcblxuIyBFeHRlbmQgc2VtdmVyLlJhbmdlIHRvIG1lbW9pemUgbWF0Y2hlZCB2ZXJzaW9ucyBmb3Igc3BlZWRcbmNsYXNzIFJhbmdlIGV4dGVuZHMgc2VtdmVyLlJhbmdlXG4gIGNvbnN0cnVjdG9yOiAtPlxuICAgIHN1cGVyXG4gICAgQG1hdGNoZWRWZXJzaW9ucyA9IG5ldyBTZXQoKVxuICAgIEB1bm1hdGNoZWRWZXJzaW9ucyA9IG5ldyBTZXQoKVxuXG4gIHRlc3Q6ICh2ZXJzaW9uKSAtPlxuICAgIHJldHVybiB0cnVlIGlmIEBtYXRjaGVkVmVyc2lvbnMuaGFzKHZlcnNpb24pXG4gICAgcmV0dXJuIGZhbHNlIGlmIEB1bm1hdGNoZWRWZXJzaW9ucy5oYXModmVyc2lvbilcblxuICAgIG1hdGNoZXMgPSBzdXBlclxuICAgIGlmIG1hdGNoZXNcbiAgICAgIEBtYXRjaGVkVmVyc2lvbnMuYWRkKHZlcnNpb24pXG4gICAgZWxzZVxuICAgICAgQHVubWF0Y2hlZFZlcnNpb25zLmFkZCh2ZXJzaW9uKVxuICAgIG1hdGNoZXNcbiJdfQ==
