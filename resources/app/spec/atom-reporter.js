(function() {
  var AtomReporter, SpecResultView, SuiteResultView, _, formatStackTrace, grim, ipcHelpers, listen, marked, path, process;

  path = require('path');

  process = require('process');

  _ = require('underscore-plus');

  grim = require('grim');

  marked = require('marked');

  listen = require('../src/delegated-listener');

  ipcHelpers = require('../src/ipc-helpers');

  formatStackTrace = function(spec, message, stackTrace) {
    var errorMatch, firstJasmineLinePattern, i, index, j, jasminePattern, len, len1, line, lines, prefixMatch, ref, ref1, ref2;
    if (message == null) {
      message = '';
    }
    if (!stackTrace) {
      return stackTrace;
    }
    jasminePattern = /^\s*at\s+.*\(?.*[\/\\]jasmine(-[^\/\\]*)?\.js:\d+:\d+\)?\s*$/;
    firstJasmineLinePattern = /^\s*at [\/\\].*[\/\\]jasmine(-[^\/\\]*)?\.js:\d+:\d+\)?\s*$/;
    lines = [];
    ref = stackTrace.split('\n');
    for (i = 0, len = ref.length; i < len; i++) {
      line = ref[i];
      if (!jasminePattern.test(line)) {
        lines.push(line);
      }
      if (firstJasmineLinePattern.test(line)) {
        break;
      }
    }
    errorMatch = (ref1 = lines[0]) != null ? ref1.match(/^Error: (.*)/) : void 0;
    if (message.trim() === (errorMatch != null ? (ref2 = errorMatch[1]) != null ? ref2.trim() : void 0 : void 0)) {
      lines.shift();
    }
    for (index = j = 0, len1 = lines.length; j < len1; index = ++j) {
      line = lines[index];
      prefixMatch = line.match(/at \.<anonymous> \(([^)]+)\)/);
      if (prefixMatch) {
        line = "at " + prefixMatch[1];
      }
      if (process.platform === 'win32') {
        line = line.replace('file:///', '').replace(RegExp("" + path.posix.sep, "g"), path.win32.sep);
      }
      line = line.replace("at " + spec.specDirectory + path.sep, 'at ');
      lines[index] = line.replace("(" + spec.specDirectory + path.sep, '(');
    }
    lines = lines.map(function(line) {
      return line.trim();
    });
    return lines.join('\n').trim();
  };

  module.exports = AtomReporter = (function() {
    function AtomReporter() {
      var element, i, len, ref;
      this.element = document.createElement('div');
      this.element.classList.add('spec-reporter-container');
      this.element.innerHTML = "<div class=\"spec-reporter\">\n  <div class=\"padded pull-right\">\n    <button outlet=\"reloadButton\" class=\"btn btn-small reload-button\">Reload Specs</button>\n  </div>\n  <div outlet=\"coreArea\" class=\"symbol-area\">\n    <div outlet=\"coreHeader\" class=\"symbol-header\"></div>\n    <ul outlet=\"coreSummary\"class=\"symbol-summary list-unstyled\"></ul>\n  </div>\n  <div outlet=\"bundledArea\" class=\"symbol-area\">\n    <div outlet=\"bundledHeader\" class=\"symbol-header\"></div>\n    <ul outlet=\"bundledSummary\"class=\"symbol-summary list-unstyled\"></ul>\n  </div>\n  <div outlet=\"userArea\" class=\"symbol-area\">\n    <div outlet=\"userHeader\" class=\"symbol-header\"></div>\n    <ul outlet=\"userSummary\"class=\"symbol-summary list-unstyled\"></ul>\n  </div>\n  <div outlet=\"status\" class=\"status alert alert-info\">\n    <div outlet=\"time\" class=\"time\"></div>\n    <div outlet=\"specCount\" class=\"spec-count\"></div>\n    <div outlet=\"message\" class=\"message\"></div>\n  </div>\n  <div outlet=\"results\" class=\"results\"></div>\n  <div outlet=\"deprecations\" class=\"status alert alert-warning\" style=\"display: none\">\n    <span outlet=\"deprecationStatus\">0 deprecations</span>\n    <div class=\"deprecation-toggle\"></div>\n  </div>\n  <div outlet=\"deprecationList\" class=\"deprecation-list\"></div>\n</div>";
      ref = this.element.querySelectorAll('[outlet]');
      for (i = 0, len = ref.length; i < len; i++) {
        element = ref[i];
        this[element.getAttribute('outlet')] = element;
      }
    }

    AtomReporter.prototype.startedAt = null;

    AtomReporter.prototype.runningSpecCount = 0;

    AtomReporter.prototype.completeSpecCount = 0;

    AtomReporter.prototype.passedCount = 0;

    AtomReporter.prototype.failedCount = 0;

    AtomReporter.prototype.skippedCount = 0;

    AtomReporter.prototype.totalSpecCount = 0;

    AtomReporter.prototype.deprecationCount = 0;

    AtomReporter.timeoutId = 0;

    AtomReporter.prototype.reportRunnerStarting = function(runner) {
      var specs;
      this.handleEvents();
      this.startedAt = Date.now();
      specs = runner.specs();
      this.totalSpecCount = specs.length;
      this.addSpecs(specs);
      return document.body.appendChild(this.element);
    };

    AtomReporter.prototype.reportRunnerResults = function(runner) {
      this.updateSpecCounts();
      if (this.failedCount === 0) {
        this.status.classList.add('alert-success');
        this.status.classList.remove('alert-info');
      }
      if (this.failedCount === 1) {
        return this.message.textContent = this.failedCount + " failure";
      } else {
        return this.message.textContent = this.failedCount + " failures";
      }
    };

    AtomReporter.prototype.reportSuiteResults = function(suite) {};

    AtomReporter.prototype.reportSpecResults = function(spec) {
      this.completeSpecCount++;
      spec.endedAt = Date.now();
      this.specComplete(spec);
      return this.updateStatusView(spec);
    };

    AtomReporter.prototype.reportSpecStarting = function(spec) {
      return this.specStarted(spec);
    };

    AtomReporter.prototype.handleEvents = function() {
      listen(document, 'click', '.spec-toggle', function(event) {
        var specFailures;
        specFailures = event.currentTarget.parentElement.querySelector('.spec-failures');
        if (specFailures.style.display === 'none') {
          specFailures.style.display = '';
          event.currentTarget.classList.remove('folded');
        } else {
          specFailures.style.display = 'none';
          event.currentTarget.classList.add('folded');
        }
        return event.preventDefault();
      });
      listen(document, 'click', '.deprecation-list', function(event) {
        var deprecationList;
        deprecationList = event.currentTarget.parentElement.querySelector('.deprecation-list');
        if (deprecationList.style.display === 'none') {
          deprecationList.style.display = '';
          event.currentTarget.classList.remove('folded');
        } else {
          deprecationList.style.display = 'none';
          event.currentTarget.classList.add('folded');
        }
        return event.preventDefault();
      });
      listen(document, 'click', '.stack-trace', function(event) {
        return event.currentTarget.classList.toggle('expanded');
      });
      return this.reloadButton.addEventListener('click', function() {
        return ipcHelpers.call('window-method', 'reload');
      });
    };

    AtomReporter.prototype.updateSpecCounts = function() {
      var specCount;
      if (this.skippedCount) {
        specCount = (this.completeSpecCount - this.skippedCount) + "/" + (this.totalSpecCount - this.skippedCount) + " (" + this.skippedCount + " skipped)";
      } else {
        specCount = this.completeSpecCount + "/" + this.totalSpecCount;
      }
      return this.specCount.textContent = specCount;
    };

    AtomReporter.prototype.updateStatusView = function(spec) {
      var rootSuite, time;
      if (this.failedCount > 0) {
        this.status.classList.add('alert-danger');
        this.status.classList.remove('alert-info');
      }
      this.updateSpecCounts();
      rootSuite = spec.suite;
      while (rootSuite.parentSuite) {
        rootSuite = rootSuite.parentSuite;
      }
      this.message.textContent = rootSuite.description;
      time = "" + (Math.round((spec.endedAt - this.startedAt) / 10));
      if (time.length < 3) {
        time = "0" + time;
      }
      return this.time.textContent = time.slice(0, -2) + "." + time.slice(-2) + "s";
    };

    AtomReporter.prototype.specTitle = function(spec) {
      var desc, i, indent, len, parentDescs, s, suiteString;
      parentDescs = [];
      s = spec.suite;
      while (s) {
        parentDescs.unshift(s.description);
        s = s.parentSuite;
      }
      suiteString = "";
      indent = "";
      for (i = 0, len = parentDescs.length; i < len; i++) {
        desc = parentDescs[i];
        suiteString += indent + desc + "\n";
        indent += "  ";
      }
      return suiteString + " " + indent + " it " + spec.description;
    };

    AtomReporter.prototype.addSpecs = function(specs) {
      var bundledPackageSpecs, coreSpecs, i, len, packageFolderName, packageName, spec, specDirectory, symbol, userPackageSpecs;
      coreSpecs = 0;
      bundledPackageSpecs = 0;
      userPackageSpecs = 0;
      for (i = 0, len = specs.length; i < len; i++) {
        spec = specs[i];
        symbol = document.createElement('li');
        symbol.setAttribute('id', "spec-summary-" + spec.id);
        symbol.setAttribute('title', this.specTitle(spec));
        symbol.className = "spec-summary pending";
        switch (spec.specType) {
          case 'core':
            coreSpecs++;
            this.coreSummary.appendChild(symbol);
            break;
          case 'bundled':
            bundledPackageSpecs++;
            this.bundledSummary.appendChild(symbol);
            break;
          case 'user':
            userPackageSpecs++;
            this.userSummary.appendChild(symbol);
        }
      }
      if (coreSpecs > 0) {
        this.coreHeader.textContent = "Core Specs (" + coreSpecs + ")";
      } else {
        this.coreArea.style.display = 'none';
      }
      if (bundledPackageSpecs > 0) {
        this.bundledHeader.textContent = "Bundled Package Specs (" + bundledPackageSpecs + ")";
      } else {
        this.bundledArea.style.display = 'none';
      }
      if (userPackageSpecs > 0) {
        if (coreSpecs === 0 && bundledPackageSpecs === 0) {
          specDirectory = specs[0].specDirectory;
          packageFolderName = path.basename(path.dirname(specDirectory));
          packageName = _.undasherize(_.uncamelcase(packageFolderName));
          return this.userHeader.textContent = packageName + " Specs";
        } else {
          return this.userHeader.textContent = "User Package Specs (" + userPackageSpecs + ")";
        }
      } else {
        return this.userArea.style.display = 'none';
      }
    };

    AtomReporter.prototype.specStarted = function(spec) {
      return this.runningSpecCount++;
    };

    AtomReporter.prototype.specComplete = function(spec) {
      var results, specSummaryElement, specView;
      specSummaryElement = document.getElementById("spec-summary-" + spec.id);
      specSummaryElement.classList.remove('pending');
      results = spec.results();
      if (results.skipped) {
        specSummaryElement.classList.add("skipped");
        return this.skippedCount++;
      } else if (results.passed()) {
        specSummaryElement.classList.add("passed");
        return this.passedCount++;
      } else {
        specSummaryElement.classList.add("failed");
        specView = new SpecResultView(spec);
        specView.attach();
        return this.failedCount++;
      }
    };

    return AtomReporter;

  })();

  SuiteResultView = (function() {
    function SuiteResultView(suite1) {
      this.suite = suite1;
      this.element = document.createElement('div');
      this.element.className = 'suite';
      this.element.setAttribute('id', "suite-view-" + this.suite.id);
      this.description = document.createElement('div');
      this.description.className = 'description';
      this.description.textContent = this.suite.description;
      this.element.appendChild(this.description);
    }

    SuiteResultView.prototype.attach = function() {
      return (this.parentSuiteView() || document.querySelector('.results')).appendChild(this.element);
    };

    SuiteResultView.prototype.parentSuiteView = function() {
      var suiteView, suiteViewElement;
      if (!this.suite.parentSuite) {
        return;
      }
      if (!(suiteViewElement = document.querySelector("#suite-view-" + this.suite.parentSuite.id))) {
        suiteView = new SuiteResultView(this.suite.parentSuite);
        suiteView.attach();
        suiteViewElement = suiteView.element;
      }
      return suiteViewElement;
    };

    return SuiteResultView;

  })();

  SpecResultView = (function() {
    function SpecResultView(spec1) {
      var description, i, len, ref, result, resultElement, stackTrace, traceElement;
      this.spec = spec1;
      this.element = document.createElement('div');
      this.element.className = 'spec';
      this.element.innerHTML = "<div class='spec-toggle'></div>\n<div outlet='description' class='description'></div>\n<div outlet='specFailures' class='spec-failures'></div>";
      this.description = this.element.querySelector('[outlet="description"]');
      this.specFailures = this.element.querySelector('[outlet="specFailures"]');
      this.element.classList.add("spec-view-" + this.spec.id);
      description = this.spec.description;
      if (description.indexOf('it ') !== 0) {
        description = "it " + description;
      }
      this.description.textContent = description;
      ref = this.spec.results().getItems();
      for (i = 0, len = ref.length; i < len; i++) {
        result = ref[i];
        if (!(!result.passed())) {
          continue;
        }
        stackTrace = formatStackTrace(this.spec, result.message, result.trace.stack);
        resultElement = document.createElement('div');
        resultElement.className = 'result-message fail';
        resultElement.textContent = result.message;
        this.specFailures.appendChild(resultElement);
        if (stackTrace) {
          traceElement = document.createElement('pre');
          traceElement.className = 'stack-trace padded';
          traceElement.textContent = stackTrace;
          this.specFailures.appendChild(traceElement);
        }
      }
    }

    SpecResultView.prototype.attach = function() {
      return this.parentSuiteView().appendChild(this.element);
    };

    SpecResultView.prototype.parentSuiteView = function() {
      var suiteView, suiteViewElement;
      if (!(suiteViewElement = document.querySelector("#suite-view-" + this.spec.suite.id))) {
        suiteView = new SuiteResultView(this.spec.suite);
        suiteView.attach();
        suiteViewElement = suiteView.element;
      }
      return suiteViewElement;
    };

    return SpecResultView;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3BlYy9hdG9tLXJlcG9ydGVyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLE9BQUEsR0FBVSxPQUFBLENBQVEsU0FBUjs7RUFDVixDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0VBQ1QsTUFBQSxHQUFTLE9BQUEsQ0FBUSwyQkFBUjs7RUFDVCxVQUFBLEdBQWEsT0FBQSxDQUFRLG9CQUFSOztFQUViLGdCQUFBLEdBQW1CLFNBQUMsSUFBRCxFQUFPLE9BQVAsRUFBbUIsVUFBbkI7QUFDakIsUUFBQTs7TUFEd0IsVUFBUTs7SUFDaEMsSUFBQSxDQUF5QixVQUF6QjtBQUFBLGFBQU8sV0FBUDs7SUFFQSxjQUFBLEdBQWlCO0lBQ2pCLHVCQUFBLEdBQTBCO0lBQzFCLEtBQUEsR0FBUTtBQUNSO0FBQUEsU0FBQSxxQ0FBQTs7TUFDRSxJQUFBLENBQXdCLGNBQWMsQ0FBQyxJQUFmLENBQW9CLElBQXBCLENBQXhCO1FBQUEsS0FBSyxDQUFDLElBQU4sQ0FBVyxJQUFYLEVBQUE7O01BQ0EsSUFBUyx1QkFBdUIsQ0FBQyxJQUF4QixDQUE2QixJQUE3QixDQUFUO0FBQUEsY0FBQTs7QUFGRjtJQUtBLFVBQUEsbUNBQXFCLENBQUUsS0FBVixDQUFnQixjQUFoQjtJQUNiLElBQWlCLE9BQU8sQ0FBQyxJQUFSLENBQUEsQ0FBQSxnRUFBZ0MsQ0FBRSxJQUFoQixDQUFBLG9CQUFuQztNQUFBLEtBQUssQ0FBQyxLQUFOLENBQUEsRUFBQTs7QUFFQSxTQUFBLHlEQUFBOztNQUVFLFdBQUEsR0FBYyxJQUFJLENBQUMsS0FBTCxDQUFXLDhCQUFYO01BQ2Qs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YUFBVCxDQUF1QixLQUF2QjtVQUNmLFlBQVksQ0FBQyxTQUFiLEdBQXlCO1VBQ3pCLFlBQVksQ0FBQyxXQUFiLEdBQTJCO1VBQzNCLElBQUMsQ0FBQSxZQUFZLENBQUMsV0FBZCxDQUEwQixZQUExQixFQUpGOztBQVJGO0lBakJXOzs2QkErQmIsTUFBQSxHQUFRLFNBQUE7YUFDTixJQUFDLENBQUEsZUFBRCxDQUFBLENBQWtCLENBQUMsV0FBbkIsQ0FBK0IsSUFBQyxDQUFBLE9BQWhDO0lBRE07OzZCQUdSLGVBQUEsR0FBaUIsU0FBQTtBQUNmLFVBQUE7TUFBQSxJQUFBLENBQU8sQ0FBQSxnQkFBQSxHQUFtQixRQUFRLENBQUMsYUFBVCxDQUF1QixjQUFBLEdBQWUsSUFBQyxDQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBbEQsQ0FBbkIsQ0FBUDtRQUNFLFNBQUEsR0FBZ0IsSUFBQSxlQUFBLENBQWdCLElBQUMsQ0FBQSxJQUFJLENBQUMsS0FBdEI7UUFDaEIsU0FBUyxDQUFDLE1BQVYsQ0FBQTtRQUNBLGdCQUFBLEdBQW1CLFNBQVMsQ0FBQyxRQUgvQjs7YUFLQTtJQU5lOzs7OztBQTlTbkIiLCJzb3VyY2VzQ29udGVudCI6WyJwYXRoID0gcmVxdWlyZSAncGF0aCdcbnByb2Nlc3MgPSByZXF1aXJlICdwcm9jZXNzJ1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbmdyaW0gPSByZXF1aXJlICdncmltJ1xubWFya2VkID0gcmVxdWlyZSAnbWFya2VkJ1xubGlzdGVuID0gcmVxdWlyZSAnLi4vc3JjL2RlbGVnYXRlZC1saXN0ZW5lcidcbmlwY0hlbHBlcnMgPSByZXF1aXJlICcuLi9zcmMvaXBjLWhlbHBlcnMnXG5cbmZvcm1hdFN0YWNrVHJhY2UgPSAoc3BlYywgbWVzc2FnZT0nJywgc3RhY2tUcmFjZSkgLT5cbiAgcmV0dXJuIHN0YWNrVHJhY2UgdW5sZXNzIHN0YWNrVHJhY2VcblxuICBqYXNtaW5lUGF0dGVybiA9IC9eXFxzKmF0XFxzKy4qXFwoPy4qWy9cXFxcXWphc21pbmUoLVteL1xcXFxdKik/XFwuanM6XFxkKzpcXGQrXFwpP1xccyokL1xuICBmaXJzdEphc21pbmVMaW5lUGF0dGVybiA9IC9eXFxzKmF0IFsvXFxcXF0uKlsvXFxcXF1qYXNtaW5lKC1bXi9cXFxcXSopP1xcLmpzOlxcZCs6XFxkK1xcKT9cXHMqJC9cbiAgbGluZXMgPSBbXVxuICBmb3IgbGluZSBpbiBzdGFja1RyYWNlLnNwbGl0KCdcXG4nKVxuICAgIGxpbmVzLnB1c2gobGluZSkgdW5sZXNzIGphc21pbmVQYXR0ZXJuLnRlc3QobGluZSlcbiAgICBicmVhayBpZiBmaXJzdEphc21pbmVMaW5lUGF0dGVybi50ZXN0KGxpbmUpXG5cbiAgIyBSZW1vdmUgZmlyc3QgbGluZSBvZiBzdGFjayB3aGVuIGl0IGlzIHRoZSBzYW1lIGFzIHRoZSBlcnJvciBtZXNzYWdlXG4gIGVycm9yTWF0Y2ggPSBsaW5lc1swXT8ubWF0Y2goL15FcnJvcjogKC4qKS8pXG4gIGxpbmVzLnNoaWZ0KCkgaWYgbWVzc2FnZS50cmltKCkgaXMgZXJyb3JNYXRjaD9bMV0/LnRyaW0oKVxuXG4gIGZvciBsaW5lLCBpbmRleCBpbiBsaW5lc1xuICAgICMgUmVtb3ZlIHByZWZpeCBvZiBsaW5lcyBtYXRjaGluZzogYXQgLjxhbm9ueW1vdXM+IChwYXRoOjE6MilcbiAgICBwcmVmaXhNYXRjaCA9IGxpbmUubWF0Y2goL2F0IFxcLjxhbm9ueW1vdXM+IFxcKChbXildKylcXCkvKVxuICAgIGxpbmUgPSBcImF0ICN7cHJlZml4TWF0Y2hbMV19XCIgaWYgcHJlZml4TWF0Y2hcblxuICAgICMgUmVsYXRpdml6ZSBsb2NhdGlvbnMgdG8gc3BlYyBkaXJlY3RvcnlcbiAgICBpZiBwcm9jZXNzLnBsYXRmb3JtIGlzICd3aW4zMidcbiAgICAgIGxpbmUgPSBsaW5lLnJlcGxhY2UoJ2ZpbGU6Ly8vJywgJycpLnJlcGxhY2UoLy8vI3twYXRoLnBvc2l4LnNlcH0vLy9nLCBwYXRoLndpbjMyLnNlcClcbiAgICBsaW5lID0gbGluZS5yZXBsYWNlKFwiYXQgI3tzcGVjLnNwZWNEaXJlY3Rvcnl9I3twYXRoLnNlcH1cIiwgJ2F0ICcpXG4gICAgbGluZXNbaW5kZXhdID0gbGluZS5yZXBsYWNlKFwiKCN7c3BlYy5zcGVjRGlyZWN0b3J5fSN7cGF0aC5zZXB9XCIsICcoJykgIyBhdCBzdGVwIChwYXRoOjE6MilcblxuICBsaW5lcyA9IGxpbmVzLm1hcCAobGluZSkgLT4gbGluZS50cmltKClcbiAgbGluZXMuam9pbignXFxuJykudHJpbSgpXG5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIEF0b21SZXBvcnRlclxuXG4gIGNvbnN0cnVjdG9yOiAtPlxuICAgIEBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICBAZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdzcGVjLXJlcG9ydGVyLWNvbnRhaW5lcicpXG4gICAgQGVsZW1lbnQuaW5uZXJIVE1MID0gXCJcIlwiXG4gICAgICA8ZGl2IGNsYXNzPVwic3BlYy1yZXBvcnRlclwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwicGFkZGVkIHB1bGwtcmlnaHRcIj5cbiAgICAgICAgICA8YnV0dG9uIG91dGxldD1cInJlbG9hZEJ1dHRvblwiIGNsYXNzPVwiYnRuIGJ0bi1zbWFsbCByZWxvYWQtYnV0dG9uXCI+UmVsb2FkIFNwZWNzPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IG91dGxldD1cImNvcmVBcmVhXCIgY2xhc3M9XCJzeW1ib2wtYXJlYVwiPlxuICAgICAgICAgIDxkaXYgb3V0bGV0PVwiY29yZUhlYWRlclwiIGNsYXNzPVwic3ltYm9sLWhlYWRlclwiPjwvZGl2PlxuICAgICAgICAgIDx1bCBvdXRsZXQ9XCJjb3JlU3VtbWFyeVwiY2xhc3M9XCJzeW1ib2wtc3VtbWFyeSBsaXN0LXVuc3R5bGVkXCI+PC91bD5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgb3V0bGV0PVwiYnVuZGxlZEFyZWFcIiBjbGFzcz1cInN5bWJvbC1hcmVhXCI+XG4gICAgICAgICAgPGRpdiBvdXRsZXQ9XCJidW5kbGVkSGVhZGVyXCIgY2xhc3M9XCJzeW1ib2wtaGVhZGVyXCI+PC9kaXY+XG4gICAgICAgICAgPHVsIG91dGxldD1cImJ1bmRsZWRTdW1tYXJ5XCJjbGFzcz1cInN5bWJvbC1zdW1tYXJ5IGxpc3QtdW5zdHlsZWRcIj48L3VsPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBvdXRsZXQ9XCJ1c2VyQXJlYVwiIGNsYXNzPVwic3ltYm9sLWFyZWFcIj5cbiAgICAgICAgICA8ZGl2IG91dGxldD1cInVzZXJIZWFkZXJcIiBjbGFzcz1cInN5bWJvbC1oZWFkZXJcIj48L2Rpdj5cbiAgICAgICAgICA8dWwgb3V0bGV0PVwidXNlclN1bW1hcnlcImNsYXNzPVwic3ltYm9sLXN1bW1hcnkgbGlzdC11bnN0eWxlZFwiPjwvdWw+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IG91dGxldD1cInN0YXR1c1wiIGNsYXNzPVwic3RhdHVzIGFsZXJ0IGFsZXJ0LWluZm9cIj5cbiAgICAgICAgICA8ZGl2IG91dGxldD1cInRpbWVcIiBjbGFzcz1cInRpbWVcIj48L2Rpdj5cbiAgICAgICAgICA8ZGl2IG91dGxldD1cInNwZWNDb3VudFwiIGNsYXNzPVwic3BlYy1jb3VudFwiPjwvZGl2PlxuICAgICAgICAgIDxkaXYgb3V0bGV0PVwibWVzc2FnZVwiIGNsYXNzPVwibWVzc2FnZVwiPjwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBvdXRsZXQ9XCJyZXN1bHRzXCIgY2xhc3M9XCJyZXN1bHRzXCI+PC9kaXY+XG4gICAgICAgIDxkaXYgb3V0bGV0PVwiZGVwcmVjYXRpb25zXCIgY2xhc3M9XCJzdGF0dXMgYWxlcnQgYWxlcnQtd2FybmluZ1wiIHN0eWxlPVwiZGlzcGxheTogbm9uZVwiPlxuICAgICAgICAgIDxzcGFuIG91dGxldD1cImRlcHJlY2F0aW9uU3RhdHVzXCI+MCBkZXByZWNhdGlvbnM8L3NwYW4+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImRlcHJlY2F0aW9uLXRvZ2dsZVwiPjwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBvdXRsZXQ9XCJkZXByZWNhdGlvbkxpc3RcIiBjbGFzcz1cImRlcHJlY2F0aW9uLWxpc3RcIj48L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIFwiXCJcIlxuXG4gICAgZm9yIGVsZW1lbnQgaW4gQGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW291dGxldF0nKVxuICAgICAgdGhpc1tlbGVtZW50LmdldEF0dHJpYnV0ZSgnb3V0bGV0JyldID0gZWxlbWVudFxuXG4gIHN0YXJ0ZWRBdDogbnVsbFxuICBydW5uaW5nU3BlY0NvdW50OiAwXG4gIGNvbXBsZXRlU3BlY0NvdW50OiAwXG4gIHBhc3NlZENvdW50OiAwXG4gIGZhaWxlZENvdW50OiAwXG4gIHNraXBwZWRDb3VudDogMFxuICB0b3RhbFNwZWNDb3VudDogMFxuICBkZXByZWNhdGlvbkNvdW50OiAwXG4gIEB0aW1lb3V0SWQ6IDBcblxuICByZXBvcnRSdW5uZXJTdGFydGluZzogKHJ1bm5lcikgLT5cbiAgICBAaGFuZGxlRXZlbnRzKClcbiAgICBAc3RhcnRlZEF0ID0gRGF0ZS5ub3coKVxuICAgIHNwZWNzID0gcnVubmVyLnNwZWNzKClcbiAgICBAdG90YWxTcGVjQ291bnQgPSBzcGVjcy5sZW5ndGhcbiAgICBAYWRkU3BlY3Moc3BlY3MpXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChAZWxlbWVudClcblxuICByZXBvcnRSdW5uZXJSZXN1bHRzOiAocnVubmVyKSAtPlxuICAgIEB1cGRhdGVTcGVjQ291bnRzKClcbiAgICBpZiBAZmFpbGVkQ291bnQgaXMgMFxuICAgICAgQHN0YXR1cy5jbGFzc0xpc3QuYWRkKCdhbGVydC1zdWNjZXNzJylcbiAgICAgIEBzdGF0dXMuY2xhc3NMaXN0LnJlbW92ZSgnYWxlcnQtaW5mbycpXG5cbiAgICBpZiBAZmFpbGVkQ291bnQgaXMgMVxuICAgICAgQG1lc3NhZ2UudGV4dENvbnRlbnQgPSBcIiN7QGZhaWxlZENvdW50fSBmYWlsdXJlXCJcbiAgICBlbHNlXG4gICAgICBAbWVzc2FnZS50ZXh0Q29udGVudCA9IFwiI3tAZmFpbGVkQ291bnR9IGZhaWx1cmVzXCJcblxuICByZXBvcnRTdWl0ZVJlc3VsdHM6IChzdWl0ZSkgLT5cblxuICByZXBvcnRTcGVjUmVzdWx0czogKHNwZWMpIC0+XG4gICAgQGNvbXBsZXRlU3BlY0NvdW50KytcbiAgICBzcGVjLmVuZGVkQXQgPSBEYXRlLm5vdygpXG4gICAgQHNwZWNDb21wbGV0ZShzcGVjKVxuICAgIEB1cGRhdGVTdGF0dXNWaWV3KHNwZWMpXG5cbiAgcmVwb3J0U3BlY1N0YXJ0aW5nOiAoc3BlYykgLT5cbiAgICBAc3BlY1N0YXJ0ZWQoc3BlYylcblxuICBoYW5kbGVFdmVudHM6IC0+XG4gICAgbGlzdGVuIGRvY3VtZW50LCAnY2xpY2snLCAnLnNwZWMtdG9nZ2xlJywgKGV2ZW50KSAtPlxuICAgICAgc3BlY0ZhaWx1cmVzID0gZXZlbnQuY3VycmVudFRhcmdldC5wYXJlbnRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zcGVjLWZhaWx1cmVzJylcblxuICAgICAgaWYgc3BlY0ZhaWx1cmVzLnN0eWxlLmRpc3BsYXkgaXMgJ25vbmUnXG4gICAgICAgIHNwZWNGYWlsdXJlcy5zdHlsZS5kaXNwbGF5ID0gJydcbiAgICAgICAgZXZlbnQuY3VycmVudFRhcmdldC5jbGFzc0xpc3QucmVtb3ZlKCdmb2xkZWQnKVxuICAgICAgZWxzZVxuICAgICAgICBzcGVjRmFpbHVyZXMuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICAgICAgICBldmVudC5jdXJyZW50VGFyZ2V0LmNsYXNzTGlzdC5hZGQoJ2ZvbGRlZCcpXG5cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcblxuICAgIGxpc3RlbiBkb2N1bWVudCwgJ2NsaWNrJywgJy5kZXByZWNhdGlvbi1saXN0JywgKGV2ZW50KSAtPlxuICAgICAgZGVwcmVjYXRpb25MaXN0ID0gZXZlbnQuY3VycmVudFRhcmdldC5wYXJlbnRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5kZXByZWNhdGlvbi1saXN0JylcblxuICAgICAgaWYgZGVwcmVjYXRpb25MaXN0LnN0eWxlLmRpc3BsYXkgaXMgJ25vbmUnXG4gICAgICAgIGRlcHJlY2F0aW9uTGlzdC5zdHlsZS5kaXNwbGF5ID0gJydcbiAgICAgICAgZXZlbnQuY3VycmVudFRhcmdldC5jbGFzc0xpc3QucmVtb3ZlKCdmb2xkZWQnKVxuICAgICAgZWxzZVxuICAgICAgICBkZXByZWNhdGlvbkxpc3Quc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICAgICAgICBldmVudC5jdXJyZW50VGFyZ2V0LmNsYXNzTGlzdC5hZGQoJ2ZvbGRlZCcpXG5cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcblxuICAgIGxpc3RlbiBkb2N1bWVudCwgJ2NsaWNrJywgJy5zdGFjay10cmFjZScsIChldmVudCkgLT5cbiAgICAgIGV2ZW50LmN1cnJlbnRUYXJnZXQuY2xhc3NMaXN0LnRvZ2dsZSgnZXhwYW5kZWQnKVxuXG4gICAgQHJlbG9hZEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIC0+IGlwY0hlbHBlcnMuY2FsbCgnd2luZG93LW1ldGhvZCcsICdyZWxvYWQnKSlcblxuICB1cGRhdGVTcGVjQ291bnRzOiAtPlxuICAgIGlmIEBza2lwcGVkQ291bnRcbiAgICAgIHNwZWNDb3VudCA9IFwiI3tAY29tcGxldGVTcGVjQ291bnQgLSBAc2tpcHBlZENvdW50fS8je0B0b3RhbFNwZWNDb3VudCAtIEBza2lwcGVkQ291bnR9ICgje0Bza2lwcGVkQ291bnR9IHNraXBwZWQpXCJcbiAgICBlbHNlXG4gICAgICBzcGVjQ291bnQgPSBcIiN7QGNvbXBsZXRlU3BlY0NvdW50fS8je0B0b3RhbFNwZWNDb3VudH1cIlxuICAgIEBzcGVjQ291bnQudGV4dENvbnRlbnQgPSBzcGVjQ291bnRcblxuICB1cGRhdGVTdGF0dXNWaWV3OiAoc3BlYykgLT5cbiAgICBpZiBAZmFpbGVkQ291bnQgPiAwXG4gICAgICBAc3RhdHVzLmNsYXNzTGlzdC5hZGQoJ2FsZXJ0LWRhbmdlcicpXG4gICAgICBAc3RhdHVzLmNsYXNzTGlzdC5yZW1vdmUoJ2FsZXJ0LWluZm8nKVxuXG4gICAgQHVwZGF0ZVNwZWNDb3VudHMoKVxuXG4gICAgcm9vdFN1aXRlID0gc3BlYy5zdWl0ZVxuICAgIHJvb3RTdWl0ZSA9IHJvb3RTdWl0ZS5wYXJlbnRTdWl0ZSB3aGlsZSByb290U3VpdGUucGFyZW50U3VpdGVcbiAgICBAbWVzc2FnZS50ZXh0Q29udGVudCA9IHJvb3RTdWl0ZS5kZXNjcmlwdGlvblxuXG4gICAgdGltZSA9IFwiI3tNYXRoLnJvdW5kKChzcGVjLmVuZGVkQXQgLSBAc3RhcnRlZEF0KSAvIDEwKX1cIlxuICAgIHRpbWUgPSBcIjAje3RpbWV9XCIgaWYgdGltZS5sZW5ndGggPCAzXG4gICAgQHRpbWUudGV4dENvbnRlbnQgPSBcIiN7dGltZVswLi4uLTJdfS4je3RpbWVbLTIuLl19c1wiXG5cbiAgc3BlY1RpdGxlOiAoc3BlYykgLT5cbiAgICBwYXJlbnREZXNjcyA9IFtdXG4gICAgcyA9IHNwZWMuc3VpdGVcbiAgICB3aGlsZSBzXG4gICAgICBwYXJlbnREZXNjcy51bnNoaWZ0KHMuZGVzY3JpcHRpb24pXG4gICAgICBzID0gcy5wYXJlbnRTdWl0ZVxuXG4gICAgc3VpdGVTdHJpbmcgPSBcIlwiXG4gICAgaW5kZW50ID0gXCJcIlxuICAgIGZvciBkZXNjIGluIHBhcmVudERlc2NzXG4gICAgICBzdWl0ZVN0cmluZyArPSBpbmRlbnQgKyBkZXNjICsgXCJcXG5cIlxuICAgICAgaW5kZW50ICs9IFwiICBcIlxuXG4gICAgXCIje3N1aXRlU3RyaW5nfSAje2luZGVudH0gaXQgI3tzcGVjLmRlc2NyaXB0aW9ufVwiXG5cbiAgYWRkU3BlY3M6IChzcGVjcykgLT5cbiAgICBjb3JlU3BlY3MgPSAwXG4gICAgYnVuZGxlZFBhY2thZ2VTcGVjcyA9IDBcbiAgICB1c2VyUGFja2FnZVNwZWNzID0gMFxuICAgIGZvciBzcGVjIGluIHNwZWNzXG4gICAgICBzeW1ib2wgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpXG4gICAgICBzeW1ib2wuc2V0QXR0cmlidXRlKCdpZCcsIFwic3BlYy1zdW1tYXJ5LSN7c3BlYy5pZH1cIilcbiAgICAgIHN5bWJvbC5zZXRBdHRyaWJ1dGUoJ3RpdGxlJywgQHNwZWNUaXRsZShzcGVjKSlcbiAgICAgIHN5bWJvbC5jbGFzc05hbWUgPSBcInNwZWMtc3VtbWFyeSBwZW5kaW5nXCJcbiAgICAgIHN3aXRjaCBzcGVjLnNwZWNUeXBlXG4gICAgICAgIHdoZW4gJ2NvcmUnXG4gICAgICAgICAgY29yZVNwZWNzKytcbiAgICAgICAgICBAY29yZVN1bW1hcnkuYXBwZW5kQ2hpbGQgc3ltYm9sXG4gICAgICAgIHdoZW4gJ2J1bmRsZWQnXG4gICAgICAgICAgYnVuZGxlZFBhY2thZ2VTcGVjcysrXG4gICAgICAgICAgQGJ1bmRsZWRTdW1tYXJ5LmFwcGVuZENoaWxkIHN5bWJvbFxuICAgICAgICB3aGVuICd1c2VyJ1xuICAgICAgICAgIHVzZXJQYWNrYWdlU3BlY3MrK1xuICAgICAgICAgIEB1c2VyU3VtbWFyeS5hcHBlbmRDaGlsZCBzeW1ib2xcblxuICAgIGlmIGNvcmVTcGVjcyA+IDBcbiAgICAgIEBjb3JlSGVhZGVyLnRleHRDb250ZW50ID0gXCJDb3JlIFNwZWNzICgje2NvcmVTcGVjc30pXCJcbiAgICBlbHNlXG4gICAgICBAY29yZUFyZWEuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICAgIGlmIGJ1bmRsZWRQYWNrYWdlU3BlY3MgPiAwXG4gICAgICBAYnVuZGxlZEhlYWRlci50ZXh0Q29udGVudCA9IFwiQnVuZGxlZCBQYWNrYWdlIFNwZWNzICgje2J1bmRsZWRQYWNrYWdlU3BlY3N9KVwiXG4gICAgZWxzZVxuICAgICAgQGJ1bmRsZWRBcmVhLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSdcbiAgICBpZiB1c2VyUGFja2FnZVNwZWNzID4gMFxuICAgICAgaWYgY29yZVNwZWNzIGlzIDAgYW5kIGJ1bmRsZWRQYWNrYWdlU3BlY3MgaXMgMFxuICAgICAgICAjIFBhY2thZ2Ugc3BlY3MgYmVpbmcgcnVuLCBzaG93IGEgbW9yZSBkZXNjcmlwdGl2ZSBsYWJlbFxuICAgICAgICB7c3BlY0RpcmVjdG9yeX0gPSBzcGVjc1swXVxuICAgICAgICBwYWNrYWdlRm9sZGVyTmFtZSA9IHBhdGguYmFzZW5hbWUocGF0aC5kaXJuYW1lKHNwZWNEaXJlY3RvcnkpKVxuICAgICAgICBwYWNrYWdlTmFtZSA9IF8udW5kYXNoZXJpemUoXy51bmNhbWVsY2FzZShwYWNrYWdlRm9sZGVyTmFtZSkpXG4gICAgICAgIEB1c2VySGVhZGVyLnRleHRDb250ZW50ID0gXCIje3BhY2thZ2VOYW1lfSBTcGVjc1wiXG4gICAgICBlbHNlXG4gICAgICAgIEB1c2VySGVhZGVyLnRleHRDb250ZW50ID0gXCJVc2VyIFBhY2thZ2UgU3BlY3MgKCN7dXNlclBhY2thZ2VTcGVjc30pXCJcbiAgICBlbHNlXG4gICAgICBAdXNlckFyZWEuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuXG4gIHNwZWNTdGFydGVkOiAoc3BlYykgLT5cbiAgICBAcnVubmluZ1NwZWNDb3VudCsrXG5cbiAgc3BlY0NvbXBsZXRlOiAoc3BlYykgLT5cbiAgICBzcGVjU3VtbWFyeUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNwZWMtc3VtbWFyeS0je3NwZWMuaWR9XCIpXG4gICAgc3BlY1N1bW1hcnlFbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ3BlbmRpbmcnKVxuXG4gICAgcmVzdWx0cyA9IHNwZWMucmVzdWx0cygpXG4gICAgaWYgcmVzdWx0cy5za2lwcGVkXG4gICAgICBzcGVjU3VtbWFyeUVsZW1lbnQuY2xhc3NMaXN0LmFkZChcInNraXBwZWRcIilcbiAgICAgIEBza2lwcGVkQ291bnQrK1xuICAgIGVsc2UgaWYgcmVzdWx0cy5wYXNzZWQoKVxuICAgICAgc3BlY1N1bW1hcnlFbGVtZW50LmNsYXNzTGlzdC5hZGQoXCJwYXNzZWRcIilcbiAgICAgIEBwYXNzZWRDb3VudCsrXG4gICAgZWxzZVxuICAgICAgc3BlY1N1bW1hcnlFbGVtZW50LmNsYXNzTGlzdC5hZGQoXCJmYWlsZWRcIilcblxuICAgICAgc3BlY1ZpZXcgPSBuZXcgU3BlY1Jlc3VsdFZpZXcoc3BlYylcbiAgICAgIHNwZWNWaWV3LmF0dGFjaCgpXG4gICAgICBAZmFpbGVkQ291bnQrK1xuXG5jbGFzcyBTdWl0ZVJlc3VsdFZpZXdcbiAgY29uc3RydWN0b3I6IChAc3VpdGUpIC0+XG4gICAgQGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgIEBlbGVtZW50LmNsYXNzTmFtZSA9ICdzdWl0ZSdcbiAgICBAZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2lkJywgXCJzdWl0ZS12aWV3LSN7QHN1aXRlLmlkfVwiKVxuICAgIEBkZXNjcmlwdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgQGRlc2NyaXB0aW9uLmNsYXNzTmFtZSA9ICdkZXNjcmlwdGlvbidcbiAgICBAZGVzY3JpcHRpb24udGV4dENvbnRlbnQgPSBAc3VpdGUuZGVzY3JpcHRpb25cbiAgICBAZWxlbWVudC5hcHBlbmRDaGlsZChAZGVzY3JpcHRpb24pXG5cbiAgYXR0YWNoOiAtPlxuICAgIChAcGFyZW50U3VpdGVWaWV3KCkgb3IgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnJlc3VsdHMnKSkuYXBwZW5kQ2hpbGQoQGVsZW1lbnQpXG5cbiAgcGFyZW50U3VpdGVWaWV3OiAtPlxuICAgIHJldHVybiB1bmxlc3MgQHN1aXRlLnBhcmVudFN1aXRlXG5cbiAgICB1bmxlc3Mgc3VpdGVWaWV3RWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjc3VpdGUtdmlldy0je0BzdWl0ZS5wYXJlbnRTdWl0ZS5pZH1cIilcbiAgICAgIHN1aXRlVmlldyA9IG5ldyBTdWl0ZVJlc3VsdFZpZXcoQHN1aXRlLnBhcmVudFN1aXRlKVxuICAgICAgc3VpdGVWaWV3LmF0dGFjaCgpXG4gICAgICBzdWl0ZVZpZXdFbGVtZW50ID0gc3VpdGVWaWV3LmVsZW1lbnRcblxuICAgIHN1aXRlVmlld0VsZW1lbnRcblxuY2xhc3MgU3BlY1Jlc3VsdFZpZXdcbiAgY29uc3RydWN0b3I6IChAc3BlYykgLT5cbiAgICBAZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgQGVsZW1lbnQuY2xhc3NOYW1lID0gJ3NwZWMnXG4gICAgQGVsZW1lbnQuaW5uZXJIVE1MID0gXCJcIlwiXG4gICAgICA8ZGl2IGNsYXNzPSdzcGVjLXRvZ2dsZSc+PC9kaXY+XG4gICAgICA8ZGl2IG91dGxldD0nZGVzY3JpcHRpb24nIGNsYXNzPSdkZXNjcmlwdGlvbic+PC9kaXY+XG4gICAgICA8ZGl2IG91dGxldD0nc3BlY0ZhaWx1cmVzJyBjbGFzcz0nc3BlYy1mYWlsdXJlcyc+PC9kaXY+XG4gICAgXCJcIlwiXG4gICAgQGRlc2NyaXB0aW9uID0gQGVsZW1lbnQucXVlcnlTZWxlY3RvcignW291dGxldD1cImRlc2NyaXB0aW9uXCJdJylcbiAgICBAc3BlY0ZhaWx1cmVzID0gQGVsZW1lbnQucXVlcnlTZWxlY3RvcignW291dGxldD1cInNwZWNGYWlsdXJlc1wiXScpXG5cbiAgICBAZWxlbWVudC5jbGFzc0xpc3QuYWRkKFwic3BlYy12aWV3LSN7QHNwZWMuaWR9XCIpXG5cbiAgICBkZXNjcmlwdGlvbiA9IEBzcGVjLmRlc2NyaXB0aW9uXG4gICAgZGVzY3JpcHRpb24gPSBcIml0ICN7ZGVzY3JpcHRpb259XCIgaWYgZGVzY3JpcHRpb24uaW5kZXhPZignaXQgJykgaXNudCAwXG4gICAgQGRlc2NyaXB0aW9uLnRleHRDb250ZW50ID0gZGVzY3JpcHRpb25cblxuICAgIGZvciByZXN1bHQgaW4gQHNwZWMucmVzdWx0cygpLmdldEl0ZW1zKCkgd2hlbiBub3QgcmVzdWx0LnBhc3NlZCgpXG4gICAgICBzdGFja1RyYWNlID0gZm9ybWF0U3RhY2tUcmFjZShAc3BlYywgcmVzdWx0Lm1lc3NhZ2UsIHJlc3VsdC50cmFjZS5zdGFjaylcblxuICAgICAgcmVzdWx0RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgICByZXN1bHRFbGVtZW50LmNsYXNzTmFtZSA9ICdyZXN1bHQtbWVzc2FnZSBmYWlsJ1xuICAgICAgcmVzdWx0RWxlbWVudC50ZXh0Q29udGVudCA9IHJlc3VsdC5tZXNzYWdlXG4gICAgICBAc3BlY0ZhaWx1cmVzLmFwcGVuZENoaWxkKHJlc3VsdEVsZW1lbnQpXG5cbiAgICAgIGlmIHN0YWNrVHJhY2VcbiAgICAgICAgdHJhY2VFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncHJlJylcbiAgICAgICAgdHJhY2VFbGVtZW50LmNsYXNzTmFtZSA9ICdzdGFjay10cmFjZSBwYWRkZWQnXG4gICAgICAgIHRyYWNlRWxlbWVudC50ZXh0Q29udGVudCA9IHN0YWNrVHJhY2VcbiAgICAgICAgQHNwZWNGYWlsdXJlcy5hcHBlbmRDaGlsZCh0cmFjZUVsZW1lbnQpXG5cbiAgYXR0YWNoOiAtPlxuICAgIEBwYXJlbnRTdWl0ZVZpZXcoKS5hcHBlbmRDaGlsZChAZWxlbWVudClcblxuICBwYXJlbnRTdWl0ZVZpZXc6IC0+XG4gICAgdW5sZXNzIHN1aXRlVmlld0VsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3N1aXRlLXZpZXctI3tAc3BlYy5zdWl0ZS5pZH1cIilcbiAgICAgIHN1aXRlVmlldyA9IG5ldyBTdWl0ZVJlc3VsdFZpZXcoQHNwZWMuc3VpdGUpXG4gICAgICBzdWl0ZVZpZXcuYXR0YWNoKClcbiAgICAgIHN1aXRlVmlld0VsZW1lbnQgPSBzdWl0ZVZpZXcuZWxlbWVudFxuXG4gICAgc3VpdGVWaWV3RWxlbWVudFxuIl19
