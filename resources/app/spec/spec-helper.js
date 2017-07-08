(function() {
  var FindParentDir, Grim, TextEditor, TextEditorElement, TokenizedBuffer, _, addCustomMatchers, clipboard, emitObject, ensureNoDeprecatedFunctionCalls, ensureNoDeprecatedStylesheets, fixturePackagesPath, fs, grimDeprecationsSnapshot, jasmineStyle, packageMetadata, path, pathwatcher, specDirectory, specPackageName, specPackagePath, specProjectPath, stylesDeprecationsSnapshot, testPaths, warnIfLeakingPathSubscriptions,
    slice = [].slice;

  require('jasmine-json');

  require('../src/window');

  require('../vendor/jasmine-jquery');

  path = require('path');

  _ = require('underscore-plus');

  fs = require('fs-plus');

  Grim = require('grim');

  pathwatcher = require('pathwatcher');

  FindParentDir = require('find-parent-dir');

  TextEditor = require('../src/text-editor');

  TextEditorElement = require('../src/text-editor-element');

  TokenizedBuffer = require('../src/tokenized-buffer');

  clipboard = require('../src/safe-clipboard');

  jasmineStyle = document.createElement('style');

  jasmineStyle.textContent = atom.themes.loadStylesheet(atom.themes.resolveStylesheet('../static/jasmine'));

  document.head.appendChild(jasmineStyle);

  fixturePackagesPath = path.resolve(__dirname, './fixtures/packages');

  atom.packages.packageDirPaths.unshift(fixturePackagesPath);

  document.querySelector('html').style.overflow = 'auto';

  document.body.style.overflow = 'auto';

  Set.prototype.jasmineToString = function() {
    var first, result;
    result = "Set {";
    first = true;
    this.forEach(function(element) {
      if (!first) {
        result += ", ";
      }
      return result += element.toString();
    });
    first = false;
    return result + "}";
  };

  Set.prototype.isEqual = function(other) {
    var next, values;
    if (other instanceof Set) {
      if (this.size !== other.size) {
        return false;
      }
      values = this.values();
      while (!(next = values.next()).done) {
        if (!other.has(next.value)) {
          return false;
        }
      }
      return true;
    } else {
      return false;
    }
  };

  jasmine.getEnv().addEqualityTester(_.isEqual);

  if (process.env.CI) {
    jasmine.getEnv().defaultTimeoutInterval = 60000;
  } else {
    jasmine.getEnv().defaultTimeoutInterval = 5000;
  }

  testPaths = atom.getLoadSettings().testPaths;

  if (specPackagePath = FindParentDir.sync(testPaths[0], 'package.json')) {
    packageMetadata = require(path.join(specPackagePath, 'package.json'));
    specPackageName = packageMetadata.name;
  }

  if (specDirectory = FindParentDir.sync(testPaths[0], 'fixtures')) {
    specProjectPath = path.join(specDirectory, 'fixtures');
  } else {
    specProjectPath = path.join(__dirname, 'fixtures');
  }

  beforeEach(function() {
    var clipboardContent, resolvePackagePath, spy;
    atom.project.setPaths([specProjectPath]);
    window.resetTimeouts();
    spyOn(_._, "now").andCallFake(function() {
      return window.now;
    });
    spyOn(window, "setTimeout").andCallFake(window.fakeSetTimeout);
    spyOn(window, "clearTimeout").andCallFake(window.fakeClearTimeout);
    spy = spyOn(atom.packages, 'resolvePackagePath').andCallFake(function(packageName) {
      if (specPackageName && packageName === specPackageName) {
        return resolvePackagePath(specPackagePath);
      } else {
        return resolvePackagePath(packageName);
      }
    });
    resolvePackagePath = _.bind(spy.originalValue, atom.packages);
    spyOn(atom.menu, 'sendToBrowserProcess');
    atom.config.set("core.destroyEmptyPanes", false);
    atom.config.set("editor.fontFamily", "Courier");
    atom.config.set("editor.fontSize", 16);
    atom.config.set("editor.autoIndent", false);
    atom.config.set("core.disabledPackages", ["package-that-throws-an-exception", "package-with-broken-package-json", "package-with-broken-keymap"]);
    advanceClock(1000);
    window.setTimeout.reset();
    TextEditorElement.prototype.setUpdatedSynchronously(true);
    spyOn(pathwatcher.File.prototype, "detectResurrectionAfterDelay").andCallFake(function() {
      return this.detectResurrection();
    });
    spyOn(TextEditor.prototype, "shouldPromptToSave").andReturn(false);
    TokenizedBuffer.prototype.chunkSize = 2e308;
    spyOn(TokenizedBuffer.prototype, "tokenizeInBackground").andCallFake(function() {
      return this.tokenizeNextChunk();
    });
    clipboardContent = 'initial clipboard content';
    spyOn(clipboard, 'writeText').andCallFake(function(text) {
      return clipboardContent = text;
    });
    spyOn(clipboard, 'readText').andCallFake(function() {
      return clipboardContent;
    });
    return addCustomMatchers(this);
  });

  afterEach(function() {
    ensureNoDeprecatedFunctionCalls();
    ensureNoDeprecatedStylesheets();
    atom.reset();
    if (!window.debugContent) {
      document.getElementById('jasmine-content').innerHTML = '';
    }
    warnIfLeakingPathSubscriptions();
    return waits(0);
  });

  warnIfLeakingPathSubscriptions = function() {
    var watchedPaths;
    watchedPaths = pathwatcher.getWatchedPaths();
    if (watchedPaths.length > 0) {
      console.error("WARNING: Leaking subscriptions for paths: " + watchedPaths.join(", "));
    }
    return pathwatcher.closeAllWatchers();
  };

  ensureNoDeprecatedFunctionCalls = function() {
    var deprecations, error, originalPrepareStackTrace;
    deprecations = _.clone(Grim.getDeprecations());
    Grim.clearDeprecations();
    if (deprecations.length > 0) {
      originalPrepareStackTrace = Error.prepareStackTrace;
      Error.prepareStackTrace = function(error, stack) {
        var deprecation, functionName, i, j, k, len, len1, len2, location, output, ref, ref1;
        output = [];
        for (i = 0, len = deprecations.length; i < len; i++) {
          deprecation = deprecations[i];
          output.push(deprecation.originName + " is deprecated. " + deprecation.message);
          output.push(_.multiplyString("-", output[output.length - 1].length));
          ref = deprecation.getStacks();
          for (j = 0, len1 = ref.length; j < len1; j++) {
            stack = ref[j];
            for (k = 0, len2 = stack.length; k < len2; k++) {
              ref1 = stack[k], functionName = ref1.functionName, location = ref1.location;
              output.push(functionName + " -- " + location);
            }
          }
          output.push("");
        }
        return output.join("\n");
      };
      error = new Error("Deprecated function(s) " + (deprecations.map(function(arg) {
        var originName;
        originName = arg.originName;
        return originName;
      }).join(', ')) + ") were called.");
      error.stack;
      Error.prepareStackTrace = originalPrepareStackTrace;
      throw error;
    }
  };

  ensureNoDeprecatedStylesheets = function() {
    var deprecation, deprecations, results, sourcePath, title;
    deprecations = _.clone(atom.styles.getDeprecations());
    atom.styles.clearDeprecations();
    results = [];
    for (sourcePath in deprecations) {
      deprecation = deprecations[sourcePath];
      title = sourcePath !== 'undefined' ? "Deprecated stylesheet at '" + sourcePath + "':" : "Deprecated stylesheet:";
      throw new Error(title + "\n" + deprecation.message);
    }
    return results;
  };

  emitObject = jasmine.StringPrettyPrinter.prototype.emitObject;

  jasmine.StringPrettyPrinter.prototype.emitObject = function(obj) {
    if (obj.inspect) {
      return this.append(obj.inspect());
    } else {
      return emitObject.call(this, obj);
    }
  };

  jasmine.unspy = function(object, methodName) {
    if (!object[methodName].hasOwnProperty('originalValue')) {
      throw new Error("Not a spy");
    }
    return object[methodName] = object[methodName].originalValue;
  };

  jasmine.attachToDOM = function(element) {
    var jasmineContent;
    jasmineContent = document.querySelector('#jasmine-content');
    if (!jasmineContent.contains(element)) {
      return jasmineContent.appendChild(element);
    }
  };

  grimDeprecationsSnapshot = null;

  stylesDeprecationsSnapshot = null;

  jasmine.snapshotDeprecations = function() {
    grimDeprecationsSnapshot = _.clone(Grim.deprecations);
    return stylesDeprecationsSnapshot = _.clone(atom.styles.deprecationsBySourcePath);
  };

  jasmine.restoreDeprecationsSnapshot = function() {
    Grim.deprecations = grimDeprecationsSnapshot;
    return atom.styles.deprecationsBySourcePath = stylesDeprecationsSnapshot;
  };

  jasmine.useRealClock = function() {
    jasmine.unspy(window, 'setTimeout');
    jasmine.unspy(window, 'clearTimeout');
    return jasmine.unspy(_._, 'now');
  };

  jasmine.useMockClock = function() {
    spyOn(window, 'setInterval').andCallFake(fakeSetInterval);
    return spyOn(window, 'clearInterval').andCallFake(fakeClearInterval);
  };

  addCustomMatchers = function(spec) {
    return spec.addMatchers({
      toBeInstanceOf: function(expected) {
        var beOrNotBe;
        beOrNotBe = this.isNot ? "not be" : "be";
        this.message = (function(_this) {
          return function() {
            return "Expected " + (jasmine.pp(_this.actual)) + " to " + beOrNotBe + " instance of " + expected.name + " class";
          };
        })(this);
        return this.actual instanceof expected;
      },
      toHaveLength: function(expected) {
        var haveOrNotHave;
        if (this.actual == null) {
          this.message = (function(_this) {
            return function() {
              return "Expected object " + _this.actual + " has no length method";
            };
          })(this);
          return false;
        } else {
          haveOrNotHave = this.isNot ? "not have" : "have";
          this.message = (function(_this) {
            return function() {
              return "Expected object with length " + _this.actual.length + " to " + haveOrNotHave + " length " + expected;
            };
          })(this);
          return this.actual.length === expected;
        }
      },
      toExistOnDisk: function(expected) {
        var toOrNotTo;
        toOrNotTo = this.isNot && "not to" || "to";
        this.message = function() {
          return "Expected path '" + this.actual + "' " + toOrNotTo + " exist.";
        };
        return fs.existsSync(this.actual);
      },
      toHaveFocus: function() {
        var element, toOrNotTo;
        toOrNotTo = this.isNot && "not to" || "to";
        if (!document.hasFocus()) {
          console.error("Specs will fail because the Dev Tools have focus. To fix this close the Dev Tools or click the spec runner.");
        }
        this.message = function() {
          return "Expected element '" + this.actual + "' or its descendants " + toOrNotTo + " have focus.";
        };
        element = this.actual;
        if (element.jquery) {
          element = element.get(0);
        }
        return element === document.activeElement || element.contains(document.activeElement);
      },
      toShow: function() {
        var element, ref, toOrNotTo;
        toOrNotTo = this.isNot && "not to" || "to";
        element = this.actual;
        if (element.jquery) {
          element = element.get(0);
        }
        this.message = function() {
          return "Expected element '" + element + "' or its descendants " + toOrNotTo + " show.";
        };
        return (ref = element.style.display) === 'block' || ref === 'inline-block' || ref === 'static' || ref === 'fixed';
      },
      toEqualPath: function(expected) {
        var actualPath, expectedPath;
        actualPath = path.normalize(this.actual);
        expectedPath = path.normalize(expected);
        this.message = function() {
          return "Expected path '" + actualPath + "' to be equal to '" + expectedPath + "'.";
        };
        return actualPath === expectedPath;
      }
    });
  };

  window.waitsForPromise = function() {
    var args, fn, label, ref, shouldReject, timeout;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    label = null;
    if (args.length > 1) {
      ref = args[0], shouldReject = ref.shouldReject, timeout = ref.timeout, label = ref.label;
    } else {
      shouldReject = false;
    }
    if (label == null) {
      label = 'promise to be resolved or rejected';
    }
    fn = _.last(args);
    return window.waitsFor(label, timeout, function(moveOn) {
      var promise;
      promise = fn();
      if (shouldReject) {
        promise["catch"].call(promise, moveOn);
        return promise.then(function() {
          jasmine.getEnv().currentSpec.fail("Expected promise to be rejected, but it was resolved");
          return moveOn();
        });
      } else {
        promise.then(moveOn);
        return promise["catch"].call(promise, function(error) {
          jasmine.getEnv().currentSpec.fail("Expected promise to be resolved, but it was rejected with: " + (error != null ? error.message : void 0) + " " + (jasmine.pp(error)));
          return moveOn();
        });
      }
    });
  };

  window.resetTimeouts = function() {
    window.now = 0;
    window.timeoutCount = 0;
    window.intervalCount = 0;
    window.timeouts = [];
    return window.intervalTimeouts = {};
  };

  window.fakeSetTimeout = function(callback, ms) {
    var id;
    if (ms == null) {
      ms = 0;
    }
    id = ++window.timeoutCount;
    window.timeouts.push([id, window.now + ms, callback]);
    return id;
  };

  window.fakeClearTimeout = function(idToClear) {
    return window.timeouts = window.timeouts.filter(function(arg) {
      var id;
      id = arg[0];
      return id !== idToClear;
    });
  };

  window.fakeSetInterval = function(callback, ms) {
    var action, id;
    id = ++window.intervalCount;
    action = function() {
      callback();
      return window.intervalTimeouts[id] = window.fakeSetTimeout(action, ms);
    };
    window.intervalTimeouts[id] = window.fakeSetTimeout(action, ms);
    return id;
  };

  window.fakeClearInterval = function(idToClear) {
    return window.fakeClearTimeout(this.intervalTimeouts[idToClear]);
  };

  window.advanceClock = function(delta) {
    var callback, callbacks, i, len, results;
    if (delta == null) {
      delta = 1;
    }
    window.now += delta;
    callbacks = [];
    window.timeouts = window.timeouts.filter(function(arg) {
      var callback, id, strikeTime;
      id = arg[0], strikeTime = arg[1], callback = arg[2];
      if (strikeTime <= window.now) {
        callbacks.push(callback);
        return false;
      } else {
        return true;
      }
    });
    results = [];
    for (i = 0, len = callbacks.length; i < len; i++) {
      callback = callbacks[i];
      results.push(callback());
    }
    return results;
  };

  exports.mockLocalStorage = function() {
    var items;
    items = {};
    spyOn(global.localStorage, 'setItem').andCallFake(function(key, item) {
      items[key] = item.toString();
      return void 0;
    });
    spyOn(global.localStorage, 'getItem').andCallFake(function(key) {
      var ref;
      return (ref = items[key]) != null ? ref : null;
    });
    return spyOn(global.localStorage, 'removeItem').andCallFake(function(key) {
      delete items[key];
      return void 0;
    });
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3BlYy9zcGVjLWhlbHBlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLDhaQUFBO0lBQUE7O0VBQUEsT0FBQSxDQUFRLGNBQVI7O0VBQ0EsT0FBQSxDQUFRLGVBQVI7O0VBQ0EsT0FBQSxDQUFRLDBCQUFSOztFQUNBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLEVBQUEsR0FBSyxPQUFBLENBQVEsU0FBUjs7RUFDTCxJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7O0VBQ1AsV0FBQSxHQUFjLE9BQUEsQ0FBUSxhQUFSOztFQUNkLGFBQUEsR0FBZ0IsT0FBQSxDQUFRLGlCQUFSOztFQUVoQixVQUFBLEdBQWEsT0FBQSxDQUFRLG9CQUFSOztFQUNiLGlCQUFBLEdBQW9CLE9BQUEsQ0FBUSw0QkFBUjs7RUFDcEIsZUFBQSxHQUFrQixPQUFBLENBQVEseUJBQVI7O0VBQ2xCLFNBQUEsR0FBWSxPQUFBLENBQVEsdUJBQVI7O0VBRVosWUFBQSxHQUFlLFFBQVEsQ0FBQyxhQUFULENBQXVCLE9BQXZCOztFQUNmLFlBQVksQ0FBQyxXQUFiLEdBQTJCLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBWixDQUEyQixJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFaLENBQThCLG1CQUE5QixDQUEzQjs7RUFDM0IsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFkLENBQTBCLFlBQTFCOztFQUVBLG1CQUFBLEdBQXNCLElBQUksQ0FBQyxPQUFMLENBQWEsU0FBYixFQUF3QixxQkFBeEI7O0VBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLE9BQTlCLENBQXNDLG1CQUF0Qzs7RUFFQSxRQUFRLENBQUMsYUFBVCxDQUF1QixNQUF2QixDQUE4QixDQUFDLEtBQUssQ0FB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QUFQLEdBQXNCLFNBQUMsS0FBRDtBQUNwQixRQUFBOztNQURxQixRQUFNOztJQUMzQixNQUFNLENBQUMsR0FBUCxJQUFjO0lBQ2QsU0FBQSxHQUFZO0lBRVosTUFBTSxDQUFDLFFBQVAsR0FBa0IsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFoQixDQUF1QixTQUFDLEdBQUQ7QUFDdkMsVUFBQTtNQUR5QyxhQUFJLHFCQUFZO01BQ3pELElBQUcsVUFBQSxJQUFjLE1BQU0sQ0FBQyxHQUF4QjtRQUNFLFNBQVMsQ0FBQyxJQUFWLENBQWUsUUFBZjtlQUNBLE1BRkY7T0FBQSxNQUFBO2VBSUUsS0FKRjs7SUFEdUMsQ0FBdkI7QUFPbEI7U0FBQSwyQ0FBQTs7bUJBQUEsUUFBQSxDQUFBO0FBQUE7O0VBWG9COztFQWF0QixPQUFPLENBQUMsZ0JBQVIsR0FBMkIsU0FBQTtBQUN6QixRQUFBO0lBQUEsS0FBQSxHQUFRO0lBQ1IsS0FBQSxDQUFNLE1BQU0sQ0FBQyxZQUFiLEVBQTJCLFNBQTNCLENBQXFDLENBQUMsV0FBdEMsQ0FBa0QsU0FBQyxHQUFELEVBQU0sSUFBTjtNQUFlLEtBQU0sQ0FBQSxHQUFBLENBQU4sR0FBYSxJQUFJLENBQUMsUUFBTCxDQUFBO2FBQWlCO0lBQTdDLENBQWxEO0lBQ0EsS0FBQSxDQUFNLE1BQU0sQ0FBQyxZQUFiLEVBQTJCLFNBQTNCLENBQXFDLENBQUMsV0FBdEMsQ0FBa0QsU0FBQyxHQUFEO0FBQVMsVUFBQTtnREFBYTtJQUF0QixDQUFsRDtXQUNBLEtBQUEsQ0FBTSxNQUFNLENBQUMsWUFBYixFQUEyQixZQUEzQixDQUF3QyxDQUFDLFdBQXpDLENBQXFELFNBQUMsR0FBRDtNQUFTLE9BQU8sS0FBTSxDQUFBLEdBQUE7YUFBTTtJQUE1QixDQUFyRDtFQUp5QjtBQXRTM0IiLCJzb3VyY2VzQ29udGVudCI6WyJyZXF1aXJlICdqYXNtaW5lLWpzb24nXG5yZXF1aXJlICcuLi9zcmMvd2luZG93J1xucmVxdWlyZSAnLi4vdmVuZG9yL2phc21pbmUtanF1ZXJ5J1xucGF0aCA9IHJlcXVpcmUgJ3BhdGgnXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZS1wbHVzJ1xuZnMgPSByZXF1aXJlICdmcy1wbHVzJ1xuR3JpbSA9IHJlcXVpcmUgJ2dyaW0nXG5wYXRod2F0Y2hlciA9IHJlcXVpcmUgJ3BhdGh3YXRjaGVyJ1xuRmluZFBhcmVudERpciA9IHJlcXVpcmUgJ2ZpbmQtcGFyZW50LWRpcidcblxuVGV4dEVkaXRvciA9IHJlcXVpcmUgJy4uL3NyYy90ZXh0LWVkaXRvcidcblRleHRFZGl0b3JFbGVtZW50ID0gcmVxdWlyZSAnLi4vc3JjL3RleHQtZWRpdG9yLWVsZW1lbnQnXG5Ub2tlbml6ZWRCdWZmZXIgPSByZXF1aXJlICcuLi9zcmMvdG9rZW5pemVkLWJ1ZmZlcidcbmNsaXBib2FyZCA9IHJlcXVpcmUgJy4uL3NyYy9zYWZlLWNsaXBib2FyZCdcblxuamFzbWluZVN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKVxuamFzbWluZVN0eWxlLnRleHRDb250ZW50ID0gYXRvbS50aGVtZXMubG9hZFN0eWxlc2hlZXQoYXRvbS50aGVtZXMucmVzb2x2ZVN0eWxlc2hlZXQoJy4uL3N0YXRpYy9qYXNtaW5lJykpXG5kb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKGphc21pbmVTdHlsZSlcblxuZml4dHVyZVBhY2thZ2VzUGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL2ZpeHR1cmVzL3BhY2thZ2VzJylcbmF0b20ucGFja2FnZXMucGFja2FnZURpclBhdGhzLnVuc2hpZnQoZml4dHVyZVBhY2thZ2VzUGF0aClcblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaHRtbCcpLnN0eWxlLm92ZXJmbG93ID0gJ2F1dG8nXG5kb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93ID0gJ2F1dG8nXG5cblNldC5wcm90b3R5cGUuamFzbWluZVRvU3RyaW5nID0gLT5cbiAgcmVzdWx0ID0gXCJTZXQge1wiXG4gIGZpcnN0ID0gdHJ1ZVxuICBAZm9yRWFjaCAoZWxlbWVudCkgLT5cbiAgICByZXN1bHQgKz0gXCIsIFwiIHVubGVzcyBmaXJzdFxuICAgIHJlc3VsdCArPSBlbGVtZW50LnRvU3RyaW5nKClcbiAgZmlyc3QgPSBmYWxzZVxuICByZXN1bHQgKyBcIn1cIlxuXG5TZXQucHJvdG90eXBlLmlzRXF1YWwgPSAob3RoZXIpIC0+XG4gIGlmIG90aGVyIGluc3RhbmNlb2YgU2V0XG4gICAgcmV0dXJuIGZhbHNlIGlmIEBzaXplIGlzbnQgb3RoZXIuc2l6ZVxuICAgIHZhbHVlcyA9IEB2YWx1ZXMoKVxuICAgIHVudGlsIChuZXh0ID0gdmFsdWVzLm5leHQoKSkuZG9uZVxuICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyBvdGhlci5oYXMobmV4dC52YWx1ZSlcbiAgICB0cnVlXG4gIGVsc2VcbiAgICBmYWxzZVxuXG5qYXNtaW5lLmdldEVudigpLmFkZEVxdWFsaXR5VGVzdGVyKF8uaXNFcXVhbCkgIyBVc2UgdW5kZXJzY29yZSdzIGRlZmluaXRpb24gb2YgZXF1YWxpdHkgZm9yIHRvRXF1YWwgYXNzZXJ0aW9uc1xuXG5pZiBwcm9jZXNzLmVudi5DSVxuICBqYXNtaW5lLmdldEVudigpLmRlZmF1bHRUaW1lb3V0SW50ZXJ2YWwgPSA2MDAwMFxuZWxzZVxuICBqYXNtaW5lLmdldEVudigpLmRlZmF1bHRUaW1lb3V0SW50ZXJ2YWwgPSA1MDAwXG5cbnt0ZXN0UGF0aHN9ID0gYXRvbS5nZXRMb2FkU2V0dGluZ3MoKVxuXG5pZiBzcGVjUGFja2FnZVBhdGggPSBGaW5kUGFyZW50RGlyLnN5bmModGVzdFBhdGhzWzBdLCAncGFja2FnZS5qc29uJylcbiAgcGFja2FnZU1ldGFkYXRhID0gcmVxdWlyZShwYXRoLmpvaW4oc3BlY1BhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJykpXG4gIHNwZWNQYWNrYWdlTmFtZSA9IHBhY2thZ2VNZXRhZGF0YS5uYW1lXG5cbmlmIHNwZWNEaXJlY3RvcnkgPSBGaW5kUGFyZW50RGlyLnN5bmModGVzdFBhdGhzWzBdLCAnZml4dHVyZXMnKVxuICBzcGVjUHJvamVjdFBhdGggPSBwYXRoLmpvaW4oc3BlY0RpcmVjdG9yeSwgJ2ZpeHR1cmVzJylcbmVsc2VcbiAgc3BlY1Byb2plY3RQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJ2ZpeHR1cmVzJylcblxuYmVmb3JlRWFjaCAtPlxuICBhdG9tLnByb2plY3Quc2V0UGF0aHMoW3NwZWNQcm9qZWN0UGF0aF0pXG5cbiAgd2luZG93LnJlc2V0VGltZW91dHMoKVxuICBzcHlPbihfLl8sIFwibm93XCIpLmFuZENhbGxGYWtlIC0+IHdpbmRvdy5ub3dcbiAgc3B5T24od2luZG93LCBcInNldFRpbWVvdXRcIikuYW5kQ2FsbEZha2Ugd2luZG93LmZha2VTZXRUaW1lb3V0XG4gIHNweU9uKHdpbmRvdywgXCJjbGVhclRpbWVvdXRcIikuYW5kQ2FsbEZha2Ugd2luZG93LmZha2VDbGVhclRpbWVvdXRcblxuICBzcHkgPSBzcHlPbihhdG9tLnBhY2thZ2VzLCAncmVzb2x2ZVBhY2thZ2VQYXRoJykuYW5kQ2FsbEZha2UgKHBhY2thZ2VOYW1lKSAtPlxuICAgIGlmIHNwZWNQYWNrYWdlTmFtZSBhbmQgcGFja2FnZU5hbWUgaXMgc3BlY1BhY2thZ2VOYW1lXG4gICAgICByZXNvbHZlUGFja2FnZVBhdGgoc3BlY1BhY2thZ2VQYXRoKVxuICAgIGVsc2VcbiAgICAgIHJlc29sdmVQYWNrYWdlUGF0aChwYWNrYWdlTmFtZSlcbiAgcmVzb2x2ZVBhY2thZ2VQYXRoID0gXy5iaW5kKHNweS5vcmlnaW5hbFZhbHVlLCBhdG9tLnBhY2thZ2VzKVxuXG4gICMgcHJldmVudCBzcGVjcyBmcm9tIG1vZGlmeWluZyBBdG9tJ3MgbWVudXNcbiAgc3B5T24oYXRvbS5tZW51LCAnc2VuZFRvQnJvd3NlclByb2Nlc3MnKVxuXG4gICMgcmVzZXQgY29uZmlnIGJlZm9yZSBlYWNoIHNwZWNcbiAgYXRvbS5jb25maWcuc2V0IFwiY29yZS5kZXN0cm95RW1wdHlQYW5lc1wiLCBmYWxzZVxuICBhdG9tLmNvbmZpZy5zZXQgXCJlZGl0b3IuZm9udEZhbWlseVwiLCBcIkNvdXJpZXJcIlxuICBhdG9tLmNvbmZpZy5zZXQgXCJlZGl0b3IuZm9udFNpemVcIiwgMTZcbiAgYXRvbS5jb25maWcuc2V0IFwiZWRpdG9yLmF1dG9JbmRlbnRcIiwgZmFsc2VcbiAgYXRvbS5jb25maWcuc2V0IFwiY29yZS5kaXNhYmxlZFBhY2thZ2VzXCIsIFtcInBhY2thZ2UtdGhhdC10aHJvd3MtYW4tZXhjZXB0aW9uXCIsXG4gICAgXCJwYWNrYWdlLXdpdGgtYnJva2VuLXBhY2thZ2UtanNvblwiLCBcInBhY2thZ2Utd2l0aC1icm9rZW4ta2V5bWFwXCJdXG4gIGFkdmFuY2VDbG9jaygxMDAwKVxuICB3aW5kb3cuc2V0VGltZW91dC5yZXNldCgpXG5cbiAgIyBtYWtlIGVkaXRvciBkaXNwbGF5IHVwZGF0ZXMgc3luY2hyb25vdXNcbiAgVGV4dEVkaXRvckVsZW1lbnQ6OnNldFVwZGF0ZWRTeW5jaHJvbm91c2x5KHRydWUpXG5cbiAgc3B5T24ocGF0aHdhdGNoZXIuRmlsZS5wcm90b3R5cGUsIFwiZGV0ZWN0UmVzdXJyZWN0aW9uQWZ0ZXJEZWxheVwiKS5hbmRDYWxsRmFrZSAtPiBAZGV0ZWN0UmVzdXJyZWN0aW9uKClcbiAgc3B5T24oVGV4dEVkaXRvci5wcm90b3R5cGUsIFwic2hvdWxkUHJvbXB0VG9TYXZlXCIpLmFuZFJldHVybiBmYWxzZVxuXG4gICMgbWFrZSB0b2tlbml6YXRpb24gc3luY2hyb25vdXNcbiAgVG9rZW5pemVkQnVmZmVyLnByb3RvdHlwZS5jaHVua1NpemUgPSBJbmZpbml0eVxuICBzcHlPbihUb2tlbml6ZWRCdWZmZXIucHJvdG90eXBlLCBcInRva2VuaXplSW5CYWNrZ3JvdW5kXCIpLmFuZENhbGxGYWtlIC0+IEB0b2tlbml6ZU5leHRDaHVuaygpXG5cbiAgY2xpcGJvYXJkQ29udGVudCA9ICdpbml0aWFsIGNsaXBib2FyZCBjb250ZW50J1xuICBzcHlPbihjbGlwYm9hcmQsICd3cml0ZVRleHQnKS5hbmRDYWxsRmFrZSAodGV4dCkgLT4gY2xpcGJvYXJkQ29udGVudCA9IHRleHRcbiAgc3B5T24oY2xpcGJvYXJkLCAncmVhZFRleHQnKS5hbmRDYWxsRmFrZSAtPiBjbGlwYm9hcmRDb250ZW50XG5cbiAgYWRkQ3VzdG9tTWF0Y2hlcnModGhpcylcblxuYWZ0ZXJFYWNoIC0+XG4gIGVuc3VyZU5vRGVwcmVjYXRlZEZ1bmN0aW9uQ2FsbHMoKVxuICBlbnN1cmVOb0RlcHJlY2F0ZWRTdHlsZXNoZWV0cygpXG4gIGF0b20ucmVzZXQoKVxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnamFzbWluZS1jb250ZW50JykuaW5uZXJIVE1MID0gJycgdW5sZXNzIHdpbmRvdy5kZWJ1Z0NvbnRlbnRcbiAgd2FybklmTGVha2luZ1BhdGhTdWJzY3JpcHRpb25zKClcbiAgd2FpdHMoMCkgIyB5aWVsZCB0byB1aSB0aHJlYWQgdG8gbWFrZSBzY3JlZW4gdXBkYXRlIG1vcmUgZnJlcXVlbnRseVxuXG53YXJuSWZMZWFraW5nUGF0aFN1YnNjcmlwdGlvbnMgPSAtPlxuICB3YXRjaGVkUGF0aHMgPSBwYXRod2F0Y2hlci5nZXRXYXRjaGVkUGF0aHMoKVxuICBpZiB3YXRjaGVkUGF0aHMubGVuZ3RoID4gMFxuICAgIGNvbnNvbGUuZXJyb3IoXCJXQVJOSU5HOiBMZWFraW5nIHN1YnNjcmlwdGlvbnMgZm9yIHBhdGhzOiBcIiArIHdhdGNoZWRQYXRocy5qb2luKFwiLCBcIikpXG4gIHBhdGh3YXRjaGVyLmNsb3NlQWxsV2F0Y2hlcnMoKVxuXG5lbnN1cmVOb0RlcHJlY2F0ZWRGdW5jdGlvbkNhbGxzID0gLT5cbiAgZGVwcmVjYXRpb25zID0gXy5jbG9uZShHcmltLmdldERlcHJlY2F0aW9ucygpKVxuICBHcmltLmNsZWFyRGVwcmVjYXRpb25zKClcbiAgaWYgZGVwcmVjYXRpb25zLmxlbmd0aCA+IDBcbiAgICBvcmlnaW5hbFByZXBhcmVTdGFja1RyYWNlID0gRXJyb3IucHJlcGFyZVN0YWNrVHJhY2VcbiAgICBFcnJvci5wcmVwYXJlU3RhY2tUcmFjZSA9IChlcnJvciwgc3RhY2spIC0+XG4gICAgICBvdXRwdXQgPSBbXVxuICAgICAgZm9yIGRlcHJlY2F0aW9uIGluIGRlcHJlY2F0aW9uc1xuICAgICAgICBvdXRwdXQucHVzaCBcIiN7ZGVwcmVjYXRpb24ub3JpZ2luTmFtZX0gaXMgZGVwcmVjYXRlZC4gI3tkZXByZWNhdGlvbi5tZXNzYWdlfVwiXG4gICAgICAgIG91dHB1dC5wdXNoIF8ubXVsdGlwbHlTdHJpbmcoXCItXCIsIG91dHB1dFtvdXRwdXQubGVuZ3RoIC0gMV0ubGVuZ3RoKVxuICAgICAgICBmb3Igc3RhY2sgaW4gZGVwcmVjYXRpb24uZ2V0U3RhY2tzKClcbiAgICAgICAgICBmb3Ige2Z1bmN0aW9uTmFtZSwgbG9jYXRpb259IGluIHN0YWNrXG4gICAgICAgICAgICBvdXRwdXQucHVzaCBcIiN7ZnVuY3Rpb25OYW1lfSAtLSAje2xvY2F0aW9ufVwiXG4gICAgICAgIG91dHB1dC5wdXNoIFwiXCJcbiAgICAgIG91dHB1dC5qb2luKFwiXFxuXCIpXG5cbiAgICBlcnJvciA9IG5ldyBFcnJvcihcIkRlcHJlY2F0ZWQgZnVuY3Rpb24ocykgI3tkZXByZWNhdGlvbnMubWFwKCh7b3JpZ2luTmFtZX0pIC0+IG9yaWdpbk5hbWUpLmpvaW4gJywgJ30pIHdlcmUgY2FsbGVkLlwiKVxuICAgIGVycm9yLnN0YWNrXG4gICAgRXJyb3IucHJlcGFyZVN0YWNrVHJhY2UgPSBvcmlnaW5hbFByZXBhcmVTdGFja1RyYWNlXG4gICAgdGhyb3cgZXJyb3JcblxuZW5zdXJlTm9EZXByZWNhdGVkU3R5bGVzaGVldHMgPSAtPlxuICBkZXByZWNhdGlvbnMgPSBfLmNsb25lKGF0b20uc3R5bGVzLmdldERlcHJlY2F0aW9ucygpKVxuICBhdG9tLnN0eWxlcy5jbGVhckRlcHJlY2F0aW9ucygpXG4gIGZvciBzb3VyY2VQYXRoLCBkZXByZWNhdGlvbiBvZiBkZXByZWNhdGlvbnNcbiAgICB0aXRsZSA9XG4gICAgICBpZiBzb3VyY2VQYXRoIGlzbnQgJ3VuZGVmaW5lZCdcbiAgICAgICAgXCJEZXByZWNhdGVkIHN0eWxlc2hlZXQgYXQgJyN7c291cmNlUGF0aH0nOlwiXG4gICAgICBlbHNlXG4gICAgICAgIFwiRGVwcmVjYXRlZCBzdHlsZXNoZWV0OlwiXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiI3t0aXRsZX1cXG4je2RlcHJlY2F0aW9uLm1lc3NhZ2V9XCIpXG5cbmVtaXRPYmplY3QgPSBqYXNtaW5lLlN0cmluZ1ByZXR0eVByaW50ZXIucHJvdG90eXBlLmVtaXRPYmplY3Rcbmphc21pbmUuU3RyaW5nUHJldHR5UHJpbnRlci5wcm90b3R5cGUuZW1pdE9iamVjdCA9IChvYmopIC0+XG4gIGlmIG9iai5pbnNwZWN0XG4gICAgQGFwcGVuZCBvYmouaW5zcGVjdCgpXG4gIGVsc2VcbiAgICBlbWl0T2JqZWN0LmNhbGwodGhpcywgb2JqKVxuXG5qYXNtaW5lLnVuc3B5ID0gKG9iamVjdCwgbWV0aG9kTmFtZSkgLT5cbiAgdGhyb3cgbmV3IEVycm9yKFwiTm90IGEgc3B5XCIpIHVubGVzcyBvYmplY3RbbWV0aG9kTmFtZV0uaGFzT3duUHJvcGVydHkoJ29yaWdpbmFsVmFsdWUnKVxuICBvYmplY3RbbWV0aG9kTmFtZV0gPSBvYmplY3RbbWV0aG9kTmFtZV0ub3JpZ2luYWxWYWx1ZVxuXG5qYXNtaW5lLmF0dGFjaFRvRE9NID0gKGVsZW1lbnQpIC0+XG4gIGphc21pbmVDb250ZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2phc21pbmUtY29udGVudCcpXG4gIGphc21pbmVDb250ZW50LmFwcGVuZENoaWxkKGVsZW1lbnQpIHVubGVzcyBqYXNtaW5lQ29udGVudC5jb250YWlucyhlbGVtZW50KVxuXG5ncmltRGVwcmVjYXRpb25zU25hcHNob3QgPSBudWxsXG5zdHlsZXNEZXByZWNhdGlvbnNTbmFwc2hvdCA9IG51bGxcbmphc21pbmUuc25hcHNob3REZXByZWNhdGlvbnMgPSAtPlxuICBncmltRGVwcmVjYXRpb25zU25hcHNob3QgPSBfLmNsb25lKEdyaW0uZGVwcmVjYXRpb25zKVxuICBzdHlsZXNEZXByZWNhdGlvbnNTbmFwc2hvdCA9IF8uY2xvbmUoYXRvbS5zdHlsZXMuZGVwcmVjYXRpb25zQnlTb3VyY2VQYXRoKVxuXG5qYXNtaW5lLnJlc3RvcmVEZXByZWNhdGlvbnNTbmFwc2hvdCA9IC0+XG4gIEdyaW0uZGVwcmVjYXRpb25zID0gZ3JpbURlcHJlY2F0aW9uc1NuYXBzaG90XG4gIGF0b20uc3R5bGVzLmRlcHJlY2F0aW9uc0J5U291cmNlUGF0aCA9IHN0eWxlc0RlcHJlY2F0aW9uc1NuYXBzaG90XG5cbmphc21pbmUudXNlUmVhbENsb2NrID0gLT5cbiAgamFzbWluZS51bnNweSh3aW5kb3csICdzZXRUaW1lb3V0JylcbiAgamFzbWluZS51bnNweSh3aW5kb3csICdjbGVhclRpbWVvdXQnKVxuICBqYXNtaW5lLnVuc3B5KF8uXywgJ25vdycpXG5cbiMgVGhlIGNsb2NrIGlzIGhhbGZ3YXkgbW9ja2VkIG5vdyBpbiBhIHNhZCBhbmQgdGVycmlibGUgd2F5Li4uIG9ubHkgc2V0VGltZW91dFxuIyBhbmQgY2xlYXJUaW1lb3V0IGFyZSBpbmNsdWRlZC4gVGhpcyBtZXRob2Qgd2lsbCBhbHNvIGluY2x1ZGUgc2V0SW50ZXJ2YWwuIFdlXG4jIHdvdWxkIGRvIHRoaXMgZXZlcnl3aGVyZSBpZiBkaWRuJ3QgY2F1c2UgdXMgdG8gYnJlYWsgYSBidW5jaCBvZiBwYWNrYWdlIHRlc3RzLlxuamFzbWluZS51c2VNb2NrQ2xvY2sgPSAtPlxuICBzcHlPbih3aW5kb3csICdzZXRJbnRlcnZhbCcpLmFuZENhbGxGYWtlKGZha2VTZXRJbnRlcnZhbClcbiAgc3B5T24od2luZG93LCAnY2xlYXJJbnRlcnZhbCcpLmFuZENhbGxGYWtlKGZha2VDbGVhckludGVydmFsKVxuXG5hZGRDdXN0b21NYXRjaGVycyA9IChzcGVjKSAtPlxuICBzcGVjLmFkZE1hdGNoZXJzXG4gICAgdG9CZUluc3RhbmNlT2Y6IChleHBlY3RlZCkgLT5cbiAgICAgIGJlT3JOb3RCZSA9IGlmIEBpc05vdCB0aGVuIFwibm90IGJlXCIgZWxzZSBcImJlXCJcbiAgICAgIHRoaXMubWVzc2FnZSA9ID0+IFwiRXhwZWN0ZWQgI3tqYXNtaW5lLnBwKEBhY3R1YWwpfSB0byAje2JlT3JOb3RCZX0gaW5zdGFuY2Ugb2YgI3tleHBlY3RlZC5uYW1lfSBjbGFzc1wiXG4gICAgICBAYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWRcblxuICAgIHRvSGF2ZUxlbmd0aDogKGV4cGVjdGVkKSAtPlxuICAgICAgaWYgbm90IEBhY3R1YWw/XG4gICAgICAgIHRoaXMubWVzc2FnZSA9ID0+IFwiRXhwZWN0ZWQgb2JqZWN0ICN7QGFjdHVhbH0gaGFzIG5vIGxlbmd0aCBtZXRob2RcIlxuICAgICAgICBmYWxzZVxuICAgICAgZWxzZVxuICAgICAgICBoYXZlT3JOb3RIYXZlID0gaWYgQGlzTm90IHRoZW4gXCJub3QgaGF2ZVwiIGVsc2UgXCJoYXZlXCJcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gPT4gXCJFeHBlY3RlZCBvYmplY3Qgd2l0aCBsZW5ndGggI3tAYWN0dWFsLmxlbmd0aH0gdG8gI3toYXZlT3JOb3RIYXZlfSBsZW5ndGggI3tleHBlY3RlZH1cIlxuICAgICAgICBAYWN0dWFsLmxlbmd0aCBpcyBleHBlY3RlZFxuXG4gICAgdG9FeGlzdE9uRGlzazogKGV4cGVjdGVkKSAtPlxuICAgICAgdG9Pck5vdFRvID0gdGhpcy5pc05vdCBhbmQgXCJub3QgdG9cIiBvciBcInRvXCJcbiAgICAgIEBtZXNzYWdlID0gLT4gcmV0dXJuIFwiRXhwZWN0ZWQgcGF0aCAnI3tAYWN0dWFsfScgI3t0b09yTm90VG99IGV4aXN0LlwiXG4gICAgICBmcy5leGlzdHNTeW5jKEBhY3R1YWwpXG5cbiAgICB0b0hhdmVGb2N1czogLT5cbiAgICAgIHRvT3JOb3RUbyA9IHRoaXMuaXNOb3QgYW5kIFwibm90IHRvXCIgb3IgXCJ0b1wiXG4gICAgICBpZiBub3QgZG9jdW1lbnQuaGFzRm9jdXMoKVxuICAgICAgICBjb25zb2xlLmVycm9yIFwiU3BlY3Mgd2lsbCBmYWlsIGJlY2F1c2UgdGhlIERldiBUb29scyBoYXZlIGZvY3VzLiBUbyBmaXggdGhpcyBjbG9zZSB0aGUgRGV2IFRvb2xzIG9yIGNsaWNrIHRoZSBzcGVjIHJ1bm5lci5cIlxuXG4gICAgICBAbWVzc2FnZSA9IC0+IHJldHVybiBcIkV4cGVjdGVkIGVsZW1lbnQgJyN7QGFjdHVhbH0nIG9yIGl0cyBkZXNjZW5kYW50cyAje3RvT3JOb3RUb30gaGF2ZSBmb2N1cy5cIlxuICAgICAgZWxlbWVudCA9IEBhY3R1YWxcbiAgICAgIGVsZW1lbnQgPSBlbGVtZW50LmdldCgwKSBpZiBlbGVtZW50LmpxdWVyeVxuICAgICAgZWxlbWVudCBpcyBkb2N1bWVudC5hY3RpdmVFbGVtZW50IG9yIGVsZW1lbnQuY29udGFpbnMoZG9jdW1lbnQuYWN0aXZlRWxlbWVudClcblxuICAgIHRvU2hvdzogLT5cbiAgICAgIHRvT3JOb3RUbyA9IHRoaXMuaXNOb3QgYW5kIFwibm90IHRvXCIgb3IgXCJ0b1wiXG4gICAgICBlbGVtZW50ID0gQGFjdHVhbFxuICAgICAgZWxlbWVudCA9IGVsZW1lbnQuZ2V0KDApIGlmIGVsZW1lbnQuanF1ZXJ5XG4gICAgICBAbWVzc2FnZSA9IC0+IHJldHVybiBcIkV4cGVjdGVkIGVsZW1lbnQgJyN7ZWxlbWVudH0nIG9yIGl0cyBkZXNjZW5kYW50cyAje3RvT3JOb3RUb30gc2hvdy5cIlxuICAgICAgZWxlbWVudC5zdHlsZS5kaXNwbGF5IGluIFsnYmxvY2snLCAnaW5saW5lLWJsb2NrJywgJ3N0YXRpYycsICdmaXhlZCddXG5cbiAgICB0b0VxdWFsUGF0aDogKGV4cGVjdGVkKSAtPlxuICAgICAgYWN0dWFsUGF0aCA9IHBhdGgubm9ybWFsaXplKEBhY3R1YWwpXG4gICAgICBleHBlY3RlZFBhdGggPSBwYXRoLm5vcm1hbGl6ZShleHBlY3RlZClcbiAgICAgIEBtZXNzYWdlID0gLT4gcmV0dXJuIFwiRXhwZWN0ZWQgcGF0aCAnI3thY3R1YWxQYXRofScgdG8gYmUgZXF1YWwgdG8gJyN7ZXhwZWN0ZWRQYXRofScuXCJcbiAgICAgIGFjdHVhbFBhdGggaXMgZXhwZWN0ZWRQYXRoXG5cbndpbmRvdy53YWl0c0ZvclByb21pc2UgPSAoYXJncy4uLikgLT5cbiAgbGFiZWwgPSBudWxsXG4gIGlmIGFyZ3MubGVuZ3RoID4gMVxuICAgIHtzaG91bGRSZWplY3QsIHRpbWVvdXQsIGxhYmVsfSA9IGFyZ3NbMF1cbiAgZWxzZVxuICAgIHNob3VsZFJlamVjdCA9IGZhbHNlXG4gIGxhYmVsID89ICdwcm9taXNlIHRvIGJlIHJlc29sdmVkIG9yIHJlamVjdGVkJ1xuICBmbiA9IF8ubGFzdChhcmdzKVxuXG4gIHdpbmRvdy53YWl0c0ZvciBsYWJlbCwgdGltZW91dCwgKG1vdmVPbikgLT5cbiAgICBwcm9taXNlID0gZm4oKVxuICAgIGlmIHNob3VsZFJlamVjdFxuICAgICAgcHJvbWlzZS5jYXRjaC5jYWxsKHByb21pc2UsIG1vdmVPbilcbiAgICAgIHByb21pc2UudGhlbiAtPlxuICAgICAgICBqYXNtaW5lLmdldEVudigpLmN1cnJlbnRTcGVjLmZhaWwoXCJFeHBlY3RlZCBwcm9taXNlIHRvIGJlIHJlamVjdGVkLCBidXQgaXQgd2FzIHJlc29sdmVkXCIpXG4gICAgICAgIG1vdmVPbigpXG4gICAgZWxzZVxuICAgICAgcHJvbWlzZS50aGVuKG1vdmVPbilcbiAgICAgIHByb21pc2UuY2F0Y2guY2FsbCBwcm9taXNlLCAoZXJyb3IpIC0+XG4gICAgICAgIGphc21pbmUuZ2V0RW52KCkuY3VycmVudFNwZWMuZmFpbChcIkV4cGVjdGVkIHByb21pc2UgdG8gYmUgcmVzb2x2ZWQsIGJ1dCBpdCB3YXMgcmVqZWN0ZWQgd2l0aDogI3tlcnJvcj8ubWVzc2FnZX0gI3tqYXNtaW5lLnBwKGVycm9yKX1cIilcbiAgICAgICAgbW92ZU9uKClcblxud2luZG93LnJlc2V0VGltZW91dHMgPSAtPlxuICB3aW5kb3cubm93ID0gMFxuICB3aW5kb3cudGltZW91dENvdW50ID0gMFxuICB3aW5kb3cuaW50ZXJ2YWxDb3VudCA9IDBcbiAgd2luZG93LnRpbWVvdXRzID0gW11cbiAgd2luZG93LmludGVydmFsVGltZW91dHMgPSB7fVxuXG53aW5kb3cuZmFrZVNldFRpbWVvdXQgPSAoY2FsbGJhY2ssIG1zPTApIC0+XG4gIGlkID0gKyt3aW5kb3cudGltZW91dENvdW50XG4gIHdpbmRvdy50aW1lb3V0cy5wdXNoKFtpZCwgd2luZG93Lm5vdyArIG1zLCBjYWxsYmFja10pXG4gIGlkXG5cbndpbmRvdy5mYWtlQ2xlYXJUaW1lb3V0ID0gKGlkVG9DbGVhcikgLT5cbiAgd2luZG93LnRpbWVvdXRzID0gd2luZG93LnRpbWVvdXRzLmZpbHRlciAoW2lkXSkgLT4gaWQgaXNudCBpZFRvQ2xlYXJcblxud2luZG93LmZha2VTZXRJbnRlcnZhbCA9IChjYWxsYmFjaywgbXMpIC0+XG4gIGlkID0gKyt3aW5kb3cuaW50ZXJ2YWxDb3VudFxuICBhY3Rpb24gPSAtPlxuICAgIGNhbGxiYWNrKClcbiAgICB3aW5kb3cuaW50ZXJ2YWxUaW1lb3V0c1tpZF0gPSB3aW5kb3cuZmFrZVNldFRpbWVvdXQoYWN0aW9uLCBtcylcbiAgd2luZG93LmludGVydmFsVGltZW91dHNbaWRdID0gd2luZG93LmZha2VTZXRUaW1lb3V0KGFjdGlvbiwgbXMpXG4gIGlkXG5cbndpbmRvdy5mYWtlQ2xlYXJJbnRlcnZhbCA9IChpZFRvQ2xlYXIpIC0+XG4gIHdpbmRvdy5mYWtlQ2xlYXJUaW1lb3V0KEBpbnRlcnZhbFRpbWVvdXRzW2lkVG9DbGVhcl0pXG5cbndpbmRvdy5hZHZhbmNlQ2xvY2sgPSAoZGVsdGE9MSkgLT5cbiAgd2luZG93Lm5vdyArPSBkZWx0YVxuICBjYWxsYmFja3MgPSBbXVxuXG4gIHdpbmRvdy50aW1lb3V0cyA9IHdpbmRvdy50aW1lb3V0cy5maWx0ZXIgKFtpZCwgc3RyaWtlVGltZSwgY2FsbGJhY2tdKSAtPlxuICAgIGlmIHN0cmlrZVRpbWUgPD0gd2luZG93Lm5vd1xuICAgICAgY2FsbGJhY2tzLnB1c2goY2FsbGJhY2spXG4gICAgICBmYWxzZVxuICAgIGVsc2VcbiAgICAgIHRydWVcblxuICBjYWxsYmFjaygpIGZvciBjYWxsYmFjayBpbiBjYWxsYmFja3NcblxuZXhwb3J0cy5tb2NrTG9jYWxTdG9yYWdlID0gLT5cbiAgaXRlbXMgPSB7fVxuICBzcHlPbihnbG9iYWwubG9jYWxTdG9yYWdlLCAnc2V0SXRlbScpLmFuZENhbGxGYWtlIChrZXksIGl0ZW0pIC0+IGl0ZW1zW2tleV0gPSBpdGVtLnRvU3RyaW5nKCk7IHVuZGVmaW5lZFxuICBzcHlPbihnbG9iYWwubG9jYWxTdG9yYWdlLCAnZ2V0SXRlbScpLmFuZENhbGxGYWtlIChrZXkpIC0+IGl0ZW1zW2tleV0gPyBudWxsXG4gIHNweU9uKGdsb2JhbC5sb2NhbFN0b3JhZ2UsICdyZW1vdmVJdGVtJykuYW5kQ2FsbEZha2UgKGtleSkgLT4gZGVsZXRlIGl0ZW1zW2tleV07IHVuZGVmaW5lZFxuIl19
