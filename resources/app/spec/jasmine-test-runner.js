(function() {
  var Grim, buildReporter, buildTerminalReporter, disableFocusMethods, fs, ipcRenderer, path, requireSpecs, setSpecDirectory, setSpecField, setSpecType;

  Grim = require('grim');

  fs = require('fs-plus');

  path = require('path');

  ipcRenderer = require('electron').ipcRenderer;

  module.exports = function(arg) {
    var ApplicationDelegate, TimeReporter, applicationDelegate, buildAtomEnvironment, documentTitle, headless, i, jasmineContent, jasmineEnv, key, len, logFile, promise, ref, resolveWithExitCode, testPath, testPaths, value;
    logFile = arg.logFile, headless = arg.headless, testPaths = arg.testPaths, buildAtomEnvironment = arg.buildAtomEnvironment;
    ref = require('../vendor/jasmine');
    for (key in ref) {
      value = ref[key];
      window[key] = value;
    }
    require('jasmine-tagged');
    documentTitle = null;
    Object.defineProperty(document, 'title', {
      get: function() {
        return documentTitle;
      },
      set: function(title) {
        return documentTitle = title;
      }
    });
    ApplicationDelegate = require('../src/application-delegate');
    applicationDelegate = new ApplicationDelegate();
    applicationDelegate.setRepresentedFilename = function() {};
    applicationDelegate.setWindowDocumentEdited = function() {};
    window.atom = buildAtomEnvironment({
      applicationDelegate: applicationDelegate,
      window: window,
      document: document,
      configDirPath: process.env.ATOM_HOME,
      enablePersistence: false
    });
    require('./spec-helper');
    if (process.env.JANKY_SHA1 || process.env.CI) {
      disableFocusMethods();
    }
    for (i = 0, len = testPaths.length; i < len; i++) {
      testPath = testPaths[i];
      requireSpecs(testPath);
    }
    setSpecType('user');
    resolveWithExitCode = null;
    promise = new Promise(function(resolve, reject) {
      return resolveWithExitCode = resolve;
    });
    jasmineEnv = jasmine.getEnv();
    jasmineEnv.addReporter(buildReporter({
      logFile: logFile,
      headless: headless,
      resolveWithExitCode: resolveWithExitCode
    }));
    TimeReporter = require('./time-reporter');
    jasmineEnv.addReporter(new TimeReporter());
    jasmineEnv.setIncludedTags([process.platform]);
    jasmineContent = document.createElement('div');
    jasmineContent.setAttribute('id', 'jasmine-content');
    document.body.appendChild(jasmineContent);
    jasmineEnv.execute();
    return promise;
  };

  disableFocusMethods = function() {
    return ['fdescribe', 'ffdescribe', 'fffdescribe', 'fit', 'ffit', 'fffit'].forEach(function(methodName) {
      var focusMethod;
      focusMethod = window[methodName];
      return window[methodName] = function(description) {
        var error;
        error = new Error('Focused spec is running on CI');
        return focusMethod(description, function() {
          throw error;
        });
      };
    });
  };

  requireSpecs = function(testPath, specType) {
    var i, len, ref, results, testFilePath;
    if (fs.isDirectorySync(testPath)) {
      ref = fs.listTreeSync(testPath);
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        testFilePath = ref[i];
        if (!(/-spec\.(coffee|js)$/.test(testFilePath))) {
          continue;
        }
        require(testFilePath);
        results.push(setSpecDirectory(testPath));
      }
      return results;
    } else {
      require(testPath);
      return setSpecDirectory(path.dirname(testPath));
    }
  };

  setSpecField = function(name, value) {
    var i, index, ref, results, specs;
    specs = jasmine.getEnv().currentRunner().specs();
    if (specs.length === 0) {
      return;
    }
    results = [];
    for (index = i = ref = specs.length - 1; ref <= 0 ? i <= 0 : i >= 0; index = ref <= 0 ? ++i : --i) {
      if (specs[index][name] != null) {
        break;
      }
      results.push(specs[index][name] = value);
    }
    return results;
  };

  setSpecType = function(specType) {
    return setSpecField('specType', specType);
  };

  setSpecDirectory = function(specDirectory) {
    return setSpecField('specDirectory', specDirectory);
  };

  buildReporter = function(arg) {
    var AtomReporter, headless, logFile, reporter, resolveWithExitCode;
    logFile = arg.logFile, headless = arg.headless, resolveWithExitCode = arg.resolveWithExitCode;
    if (headless) {
      return buildTerminalReporter(logFile, resolveWithExitCode);
    } else {
      AtomReporter = require('./atom-reporter');
      return reporter = new AtomReporter();
    }
  };

  buildTerminalReporter = function(logFile, resolveWithExitCode) {
    var TerminalReporter, log, logStream;
    if (logFile != null) {
      logStream = fs.openSync(logFile, 'w');
    }
    log = function(str) {
      if (logStream != null) {
        return fs.writeSync(logStream, str);
      } else {
        return ipcRenderer.send('write-to-stderr', str);
      }
    };
    TerminalReporter = require('jasmine-tagged').TerminalReporter;
    return new TerminalReporter({
      print: function(str) {
        return log(str);
      },
      onComplete: function(runner) {
        if (logStream != null) {
          fs.closeSync(logStream);
        }
        if (Grim.getDeprecationsLength() > 0) {
          Grim.logDeprecations();
          resolveWithExitCode(1);
          return;
        }
        if (runner.results().failedCount > 0) {
          return resolveWithExitCode(1);
        } else {
          return resolveWithExitCode(0);
        }
      }
    });
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3BlYy9qYXNtaW5lLXRlc3QtcnVubmVyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLEVBQUEsR0FBSyxPQUFBLENBQVEsU0FBUjs7RUFDTCxJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7O0VBQ04sY0FBZSxPQUFBLENBQVEsVUFBUjs7RUFFaEIsTUFBTSxDQUFDLE9BQVAsR0FBaUIsU0FBQyxHQUFEO0FBQ2YsUUFBQTtJQURpQix1QkFBUyx5QkFBVSwyQkFBVztBQUMvQztBQUFBLFNBQUEsVUFBQTs7TUFBQSxNQUFPLENBQUEsR0FBQSxDQUFQLEdBQWM7QUFBZDtJQUNBLE9BQUEsQ0FBUSxnQkFBUjtJQUdBLGFBQUEsR0FBZ0I7SUFDaEIsTUFBTSxDQUFDLGNBQVAsQ0FBc0IsUUFBdEIsRUFBZ0MsT0FBaEMsRUFDRTtNQUFBLEdBQUEsRUFBSyxTQUFBO2VBQUc7TUFBSCxDQUFMO01BQ0EsR0FBQSxFQUFLLFNBQUMsS0FBRDtlQUFXLGFBQUEsR0FBZ0I7TUFBM0IsQ0FETDtLQURGO0lBSUEsbUJBQUEsR0FBc0IsT0FBQSxDQUFRLDZCQUFSO0lBQ3RCLG1CQUFBLEdBQTBCLElBQUEsbUJBQUEsQ0FBQTtJQUMxQixtQkFBbUIsQ0FBQyxzQkFBcEIsR0FBNkMsU0FBQSxHQUFBO0lBQzdDLG1CQUFtQixDQUFDLHVCQUFwQixHQUE4QyxTQUFBLEdBQUE7SUFDOUMsTUFBTSxDQUFDLElBQVAsR0FBYyxvQkFBQSxDQUFxQjtNQUNqQyxxQkFBQSxtQkFEaUM7TUFDWixRQUFBLE1BRFk7TUFDSixVQUFBLFFBREk7TUFFakMsYUFBQSxFQUFlLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FGTTtNQUdqQyxpQkFBQSxFQUFtQixLQUhjO0tBQXJCO0lBTWQsT0FBQSxD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aXJlICdmcy1wbHVzJ1xucGF0aCA9IHJlcXVpcmUgJ3BhdGgnXG57aXBjUmVuZGVyZXJ9ID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5cbm1vZHVsZS5leHBvcnRzID0gKHtsb2dGaWxlLCBoZWFkbGVzcywgdGVzdFBhdGhzLCBidWlsZEF0b21FbnZpcm9ubWVudH0pIC0+XG4gIHdpbmRvd1trZXldID0gdmFsdWUgZm9yIGtleSwgdmFsdWUgb2YgcmVxdWlyZSAnLi4vdmVuZG9yL2phc21pbmUnXG4gIHJlcXVpcmUgJ2phc21pbmUtdGFnZ2VkJ1xuXG4gICMgQWxsb3cgZG9jdW1lbnQudGl0bGUgdG8gYmUgYXNzaWduZWQgaW4gc3BlY3Mgd2l0aG91dCBzY3Jld2luZyB1cCBzcGVjIHdpbmRvdyB0aXRsZVxuICBkb2N1bWVudFRpdGxlID0gbnVsbFxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkgZG9jdW1lbnQsICd0aXRsZScsXG4gICAgZ2V0OiAtPiBkb2N1bWVudFRpdGxlXG4gICAgc2V0OiAodGl0bGUpIC0+IGRvY3VtZW50VGl0bGUgPSB0aXRsZVxuXG4gIEFwcGxpY2F0aW9uRGVsZWdhdGUgPSByZXF1aXJlICcuLi9zcmMvYXBwbGljYXRpb24tZGVsZWdhdGUnXG4gIGFwcGxpY2F0aW9uRGVsZWdhdGUgPSBuZXcgQXBwbGljYXRpb25EZWxlZ2F0ZSgpXG4gIGFwcGxpY2F0aW9uRGVsZWdhdGUuc2V0UmVwcmVzZW50ZWRGaWxlbmFtZSA9IC0+XG4gIGFwcGxpY2F0aW9uRGVsZWdhdGUuc2V0V2luZG93RG9jdW1lbnRFZGl0ZWQgPSAtPlxuICB3aW5kb3cuYXRvbSA9IGJ1aWxkQXRvbUVudmlyb25tZW50KHtcbiAgICBhcHBsaWNhdGlvbkRlbGVnYXRlLCB3aW5kb3csIGRvY3VtZW50LFxuICAgIGNvbmZpZ0RpclBhdGg6IHByb2Nlc3MuZW52LkFUT01fSE9NRVxuICAgIGVuYWJsZVBlcnNpc3RlbmNlOiBmYWxzZVxuICB9KVxuXG4gIHJlcXVpcmUgJy4vc3BlYy1oZWxwZXInXG4gIGRpc2FibGVGb2N1c01ldGhvZHMoKSBpZiBwcm9jZXNzLmVudi5KQU5LWV9TSEExIG9yIHByb2Nlc3MuZW52LkNJXG4gIHJlcXVpcmVTcGVjcyh0ZXN0UGF0aCkgZm9yIHRlc3RQYXRoIGluIHRlc3RQYXRoc1xuXG4gIHNldFNwZWNUeXBlKCd1c2VyJylcblxuICByZXNvbHZlV2l0aEV4aXRDb2RlID0gbnVsbFxuICBwcm9taXNlID0gbmV3IFByb21pc2UgKHJlc29sdmUsIHJlamVjdCkgLT4gcmVzb2x2ZVdpdGhFeGl0Q29kZSA9IHJlc29sdmVcbiAgamFzbWluZUVudiA9IGphc21pbmUuZ2V0RW52KClcbiAgamFzbWluZUVudi5hZGRSZXBvcnRlcihidWlsZFJlcG9ydGVyKHtsb2dGaWxlLCBoZWFkbGVzcywgcmVzb2x2ZVdpdGhFeGl0Q29kZX0pKVxuICBUaW1lUmVwb3J0ZXIgPSByZXF1aXJlICcuL3RpbWUtcmVwb3J0ZXInXG4gIGphc21pbmVFbnYuYWRkUmVwb3J0ZXIobmV3IFRpbWVSZXBvcnRlcigpKVxuICBqYXNtaW5lRW52LnNldEluY2x1ZGVkVGFncyhbcHJvY2Vzcy5wbGF0Zm9ybV0pXG5cbiAgamFzbWluZUNvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICBqYXNtaW5lQ29udGVudC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ2phc21pbmUtY29udGVudCcpXG5cbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChqYXNtaW5lQ29udGVudClcblxuICBqYXNtaW5lRW52LmV4ZWN1dGUoKVxuICBwcm9taXNlXG5cbmRpc2FibGVGb2N1c01ldGhvZHMgPSAtPlxuICBbJ2ZkZXNjcmliZScsICdmZmRlc2NyaWJlJywgJ2ZmZmRlc2NyaWJlJywgJ2ZpdCcsICdmZml0JywgJ2ZmZml0J10uZm9yRWFjaCAobWV0aG9kTmFtZSkgLT5cbiAgICBmb2N1c01ldGhvZCA9IHdpbmRvd1ttZXRob2ROYW1lXVxuICAgIHdpbmRvd1ttZXRob2ROYW1lXSA9IChkZXNjcmlwdGlvbikgLT5cbiAgICAgIGVycm9yID0gbmV3IEVycm9yKCdGb2N1c2VkIHNwZWMgaXMgcnVubmluZyBvbiBDSScpXG4gICAgICBmb2N1c01ldGhvZCBkZXNjcmlwdGlvbiwgLT4gdGhyb3cgZXJyb3JcblxucmVxdWlyZVNwZWNzID0gKHRlc3RQYXRoLCBzcGVjVHlwZSkgLT5cbiAgaWYgZnMuaXNEaXJlY3RvcnlTeW5jKHRlc3RQYXRoKVxuICAgIGZvciB0ZXN0RmlsZVBhdGggaW4gZnMubGlzdFRyZWVTeW5jKHRlc3RQYXRoKSB3aGVuIC8tc3BlY1xcLihjb2ZmZWV8anMpJC8udGVzdCB0ZXN0RmlsZVBhdGhcbiAgICAgIHJlcXVpcmUodGVzdEZpbGVQYXRoKVxuICAgICAgIyBTZXQgc3BlYyBkaXJlY3Rvcnkgb24gc3BlYyBmb3Igc2V0dGluZyB1cCB0aGUgcHJvamVjdCBpbiBzcGVjLWhlbHBlclxuICAgICAgc2V0U3BlY0RpcmVjdG9yeSh0ZXN0UGF0aClcbiAgZWxzZVxuICAgIHJlcXVpcmUodGVzdFBhdGgpXG4gICAgc2V0U3BlY0RpcmVjdG9yeShwYXRoLmRpcm5hbWUodGVzdFBhdGgpKVxuXG5zZXRTcGVjRmllbGQgPSAobmFtZSwgdmFsdWUpIC0+XG4gIHNwZWNzID0gamFzbWluZS5nZXRFbnYoKS5jdXJyZW50UnVubmVyKCkuc3BlY3MoKVxuICByZXR1cm4gaWYgc3BlY3MubGVuZ3RoIGlzIDBcbiAgZm9yIGluZGV4IGluIFtzcGVjcy5sZW5ndGgtMS4uMF1cbiAgICBicmVhayBpZiBzcGVjc1tpbmRleF1bbmFtZV0/XG4gICAgc3BlY3NbaW5kZXhdW25hbWVdID0gdmFsdWVcblxuc2V0U3BlY1R5cGUgPSAoc3BlY1R5cGUpIC0+XG4gIHNldFNwZWNGaWVsZCgnc3BlY1R5cGUnLCBzcGVjVHlwZSlcblxuc2V0U3BlY0RpcmVjdG9yeSA9IChzcGVjRGlyZWN0b3J5KSAtPlxuICBzZXRTcGVjRmllbGQoJ3NwZWNEaXJlY3RvcnknLCBzcGVjRGlyZWN0b3J5KVxuXG5idWlsZFJlcG9ydGVyID0gKHtsb2dGaWxlLCBoZWFkbGVzcywgcmVzb2x2ZVdpdGhFeGl0Q29kZX0pIC0+XG4gIGlmIGhlYWRsZXNzXG4gICAgYnVpbGRUZXJtaW5hbFJlcG9ydGVyKGxvZ0ZpbGUsIHJlc29sdmVXaXRoRXhpdENvZGUpXG4gIGVsc2VcbiAgICBBdG9tUmVwb3J0ZXIgPSByZXF1aXJlICcuL2F0b20tcmVwb3J0ZXInXG4gICAgcmVwb3J0ZXIgPSBuZXcgQXRvbVJlcG9ydGVyKClcblxuYnVpbGRUZXJtaW5hbFJlcG9ydGVyID0gKGxvZ0ZpbGUsIHJlc29sdmVXaXRoRXhpdENvZGUpIC0+XG4gIGxvZ1N0cmVhbSA9IGZzLm9wZW5TeW5jKGxvZ0ZpbGUsICd3JykgaWYgbG9nRmlsZT9cbiAgbG9nID0gKHN0cikgLT5cbiAgICBpZiBsb2dTdHJlYW0/XG4gICAgICBmcy53cml0ZVN5bmMobG9nU3RyZWFtLCBzdHIpXG4gICAgZWxzZVxuICAgICAgaXBjUmVuZGVyZXIuc2VuZCAnd3JpdGUtdG8tc3RkZXJyJywgc3RyXG5cbiAge1Rlcm1pbmFsUmVwb3J0ZXJ9ID0gcmVxdWlyZSAnamFzbWluZS10YWdnZWQnXG4gIG5ldyBUZXJtaW5hbFJlcG9ydGVyXG4gICAgcHJpbnQ6IChzdHIpIC0+XG4gICAgICBsb2coc3RyKVxuICAgIG9uQ29tcGxldGU6IChydW5uZXIpIC0+XG4gICAgICBmcy5jbG9zZVN5bmMobG9nU3RyZWFtKSBpZiBsb2dTdHJlYW0/XG4gICAgICBpZiBHcmltLmdldERlcHJlY2F0aW9uc0xlbmd0aCgpID4gMFxuICAgICAgICBHcmltLmxvZ0RlcHJlY2F0aW9ucygpXG4gICAgICAgIHJlc29sdmVXaXRoRXhpdENvZGUoMSlcbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIGlmIHJ1bm5lci5yZXN1bHRzKCkuZmFpbGVkQ291bnQgPiAwXG4gICAgICAgIHJlc29sdmVXaXRoRXhpdENvZGUoMSlcbiAgICAgIGVsc2VcbiAgICAgICAgcmVzb2x2ZVdpdGhFeGl0Q29kZSgwKVxuIl19
