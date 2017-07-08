(function() {
  var TimeReporter, _,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  _ = require('underscore-plus');

  module.exports = TimeReporter = (function(superClass) {
    extend(TimeReporter, superClass);

    function TimeReporter() {
      window.timedSpecs = [];
      window.timedSuites = {};
      window.logLongestSpec = (function(_this) {
        return function() {
          return _this.logLongestSpecs(1);
        };
      })(this);
      window.logLongestSpecs = (function(_this) {
        return function(number) {
          return _this.logLongestSpecs(number);
        };
      })(this);
      window.logLongestSuite = (function(_this) {
        return function() {
          return _this.logLongestSuites(1);
        };
      })(this);
      window.logLongestSuites = (function(_this) {
        return function(number) {
          return _this.logLongestSuites(number);
        };
      })(this);
    }

    TimeReporter.prototype.logLongestSuites = function(number, log) {
      var i, len, ref, suite, suites, time;
      if (number == null) {
        number = 10;
      }
      if (!(window.timedSuites.length > 0)) {
        return;
      }
      if (log == null) {
        log = function(line) {
          return console.log(line);
        };
      }
      log("Longest running suites:");
      suites = _.map(window.timedSuites, function(key, value) {
        return [value, key];
      });
      ref = _.sortBy(suites, function(suite) {
        return -suite[1];
      }).slice(0, number);
      for (i = 0, len = ref.length; i < len; i++) {
        suite = ref[i];
        time = Math.round(suite[1] / 100) / 10;
        log("  " + suite[0] + " (" + time + "s)");
      }
      return void 0;
    };

    TimeReporter.prototype.logLongestSpecs = function(number, log) {
      var i, len, ref, spec, time;
      if (number == null) {
        number = 10;
      }
      if (!(window.timedSpecs.length > 0)) {
        return;
      }
      if (log == null) {
        log = function(line) {
          return console.log(line);
        };
      }
      log("Longest running specs:");
      ref = _.sortBy(window.timedSpecs, function(spec) {
        return -spec.time;
      }).slice(0, number);
      for (i = 0, len = ref.length; i < len; i++) {
        spec = ref[i];
        time = Math.round(spec.time / 100) / 10;
        log(spec.description + " (" + time + "s)");
      }
      return void 0;
    };

    TimeReporter.prototype.reportSpecStarting = function(spec) {
      var reducer, stack, suite;
      stack = [spec.description];
      suite = spec.suite;
      while (suite) {
        stack.unshift(suite.description);
        this.suite = suite.description;
        suite = suite.parentSuite;
      }
      reducer = function(memo, description, index) {
        if (index === 0) {
          return "" + description;
        } else {
          return memo + "\n" + (_.multiplyString('  ', index)) + description;
        }
      };
      this.description = _.reduce(stack, reducer, '');
      return this.time = Date.now();
    };

    TimeReporter.prototype.reportSpecResults = function(spec) {
      var duration;
      if (!((this.time != null) && (this.description != null))) {
        return;
      }
      duration = Date.now() - this.time;
      if (duration > 0) {
        window.timedSpecs.push({
          description: this.description,
          time: duration,
          fullName: spec.getFullName()
        });
        if (window.timedSuites[this.suite]) {
          window.timedSuites[this.suite] += duration;
        } else {
          window.timedSuites[this.suite] = duration;
        }
      }
      this.time = null;
      return this.description = null;
    };

    return TimeReporter;

  })(jasmine.Reporter);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3BlYy90aW1lLXJlcG9ydGVyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsZUFBQTtJQUFBOzs7RUFBQSxDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUVKLE1BQU0sQ0FBQyxPQUFQLEdBQ007OztJQUVTLHNCQUFBO01BQ1gsTUFBTSxDQUFDLFVBQVAsR0FBb0I7TUFDcEIsTUFBTSxDQUFDLFdBQVAsR0FBcUI7TUFFckIsTUFBTSxDQUFDLGNBQVAsR0FBd0IsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO2lCQUFHLEtBQUMsQ0FBQSxlQUFELENBQWlCLENBQWpCO1FBQUg7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO01BQ3hCLE1BQU0sQ0FBQyxlQUFQLEdBQXlCLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxNQUFEO2lCQUFZLEtBQUMsQ0FBQSxlQUFELENBQWlCLE1BQWpCO1FBQVo7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO01BQ3pCLE1BQU0sQ0FBQyxlQUFQLEdBQXlCLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtpQkFBRyxLQUFDLENBQUEsZ0JBQUQsQ0FBa0IsQ0FBbEI7UUFBSDtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUE7TUFDekIsTUFBTSxDQUFDLGdCQUFQLEdBQTBCLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxNQUFEO2lCQUFZLEtBQUMsQ0FBQSxnQkFBRCxDQUFrQixNQUFsQjtRQUFaO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQTtJQVBmOzsyQkFTYixnQkFBQSxHQUFrQixTQUFDLE1BQUQsRUFBWSxHQUFaO0FBQ2hCLFVBQUE7O1FBRGlCLFNBQU87O01BQ3hCLElBQUEsQ0FBQSxDQUFjLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBbkIsR0FBNEIsQ0FBMUMsQ0FBQTtBQUFBLGVBQUE7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Q0FBbkIsR0FBNkIsU0FIL0I7U0FORjs7TUFXQSxJQUFDLENBQUEsSUFBRCxHQUFRO2FBQ1IsSUFBQyxDQUFBLFdBQUQsR0FBZTtJQWpCRTs7OztLQWhETSxPQUFPLENBQUM7QUFIbkMiLCJzb3VyY2VzQ29udGVudCI6WyJfID0gcmVxdWlyZSAndW5kZXJzY29yZS1wbHVzJ1xuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBUaW1lUmVwb3J0ZXIgZXh0ZW5kcyBqYXNtaW5lLlJlcG9ydGVyXG5cbiAgY29uc3RydWN0b3I6IC0+XG4gICAgd2luZG93LnRpbWVkU3BlY3MgPSBbXVxuICAgIHdpbmRvdy50aW1lZFN1aXRlcyA9IHt9XG5cbiAgICB3aW5kb3cubG9nTG9uZ2VzdFNwZWMgPSA9PiBAbG9nTG9uZ2VzdFNwZWNzKDEpXG4gICAgd2luZG93LmxvZ0xvbmdlc3RTcGVjcyA9IChudW1iZXIpID0+IEBsb2dMb25nZXN0U3BlY3MobnVtYmVyKVxuICAgIHdpbmRvdy5sb2dMb25nZXN0U3VpdGUgPSA9PiBAbG9nTG9uZ2VzdFN1aXRlcygxKVxuICAgIHdpbmRvdy5sb2dMb25nZXN0U3VpdGVzID0gKG51bWJlcikgPT4gQGxvZ0xvbmdlc3RTdWl0ZXMobnVtYmVyKVxuXG4gIGxvZ0xvbmdlc3RTdWl0ZXM6IChudW1iZXI9MTAsIGxvZykgLT5cbiAgICByZXR1cm4gdW5sZXNzIHdpbmRvdy50aW1lZFN1aXRlcy5sZW5ndGggPiAwXG5cbiAgICBsb2cgPz0gKGxpbmUpIC0+IGNvbnNvbGUubG9nKGxpbmUpXG4gICAgbG9nIFwiTG9uZ2VzdCBydW5uaW5nIHN1aXRlczpcIlxuICAgIHN1aXRlcyA9IF8ubWFwKHdpbmRvdy50aW1lZFN1aXRlcywgKGtleSwgdmFsdWUpIC0+IFt2YWx1ZSwga2V5XSlcbiAgICBmb3Igc3VpdGUgaW4gXy5zb3J0Qnkoc3VpdGVzLCAoc3VpdGUpIC0+IC1zdWl0ZVsxXSlbMC4uLm51bWJlcl1cbiAgICAgIHRpbWUgPSBNYXRoLnJvdW5kKHN1aXRlWzFdIC8gMTAwKSAvIDEwXG4gICAgICBsb2cgXCIgICN7c3VpdGVbMF19ICgje3RpbWV9cylcIlxuICAgIHVuZGVmaW5lZFxuXG4gIGxvZ0xvbmdlc3RTcGVjczogKG51bWJlcj0xMCwgbG9nKSAtPlxuICAgIHJldHVybiB1bmxlc3Mgd2luZG93LnRpbWVkU3BlY3MubGVuZ3RoID4gMFxuXG4gICAgbG9nID89IChsaW5lKSAtPiBjb25zb2xlLmxvZyhsaW5lKVxuICAgIGxvZyBcIkxvbmdlc3QgcnVubmluZyBzcGVjczpcIlxuICAgIGZvciBzcGVjIGluIF8uc29ydEJ5KHdpbmRvdy50aW1lZFNwZWNzLCAoc3BlYykgLT4gLXNwZWMudGltZSlbMC4uLm51bWJlcl1cbiAgICAgIHRpbWUgPSBNYXRoLnJvdW5kKHNwZWMudGltZSAvIDEwMCkgLyAxMFxuICAgICAgbG9nIFwiI3tzcGVjLmRlc2NyaXB0aW9ufSAoI3t0aW1lfXMpXCJcbiAgICB1bmRlZmluZWRcblxuICByZXBvcnRTcGVjU3RhcnRpbmc6IChzcGVjKSAtPlxuICAgIHN0YWNrID0gW3NwZWMuZGVzY3JpcHRpb25dXG4gICAgc3VpdGUgPSBzcGVjLnN1aXRlXG4gICAgd2hpbGUgc3VpdGVcbiAgICAgIHN0YWNrLnVuc2hpZnQgc3VpdGUuZGVzY3JpcHRpb25cbiAgICAgIEBzdWl0ZSA9IHN1aXRlLmRlc2NyaXB0aW9uXG4gICAgICBzdWl0ZSA9IHN1aXRlLnBhcmVudFN1aXRlXG5cbiAgICByZWR1Y2VyID0gKG1lbW8sIGRlc2NyaXB0aW9uLCBpbmRleCkgLT5cbiAgICAgIGlmIGluZGV4IGlzIDBcbiAgICAgICAgXCIje2Rlc2NyaXB0aW9ufVwiXG4gICAgICBlbHNlXG4gICAgICAgIFwiI3ttZW1vfVxcbiN7Xy5tdWx0aXBseVN0cmluZygnICAnLCBpbmRleCl9I3tkZXNjcmlwdGlvbn1cIlxuICAgIEBkZXNjcmlwdGlvbiA9IF8ucmVkdWNlKHN0YWNrLCByZWR1Y2VyLCAnJylcbiAgICBAdGltZSA9IERhdGUubm93KClcblxuICByZXBvcnRTcGVjUmVzdWx0czogKHNwZWMpIC0+XG4gICAgcmV0dXJuIHVubGVzcyBAdGltZT8gYW5kIEBkZXNjcmlwdGlvbj9cblxuICAgIGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIEB0aW1lXG5cbiAgICBpZiBkdXJhdGlvbiA+IDBcbiAgICAgIHdpbmRvdy50aW1lZFNwZWNzLnB1c2hcbiAgICAgICAgZGVzY3JpcHRpb246IEBkZXNjcmlwdGlvblxuICAgICAgICB0aW1lOiBkdXJhdGlvblxuICAgICAgICBmdWxsTmFtZTogc3BlYy5nZXRGdWxsTmFtZSgpXG5cbiAgICAgIGlmIHdpbmRvdy50aW1lZFN1aXRlc1tAc3VpdGVdXG4gICAgICAgIHdpbmRvdy50aW1lZFN1aXRlc1tAc3VpdGVdICs9IGR1cmF0aW9uXG4gICAgICBlbHNlXG4gICAgICAgIHdpbmRvdy50aW1lZFN1aXRlc1tAc3VpdGVdID0gZHVyYXRpb25cblxuICAgIEB0aW1lID0gbnVsbFxuICAgIEBkZXNjcmlwdGlvbiA9IG51bGxcbiJdfQ==
