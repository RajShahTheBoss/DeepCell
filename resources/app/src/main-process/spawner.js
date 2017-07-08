(function() {
  var ChildProcess;

  ChildProcess = require('child_process');

  exports.spawn = function(command, args, callback) {
    var error, spawnedProcess, stdout;
    stdout = '';
    try {
      spawnedProcess = ChildProcess.spawn(command, args);
    } catch (error1) {
      error = error1;
      process.nextTick(function() {
        return typeof callback === "function" ? callback(error, stdout) : void 0;
      });
      return;
    }
    spawnedProcess.stdout.on('data', function(data) {
      return stdout += data;
    });
    error = null;
    spawnedProcess.on('error', function(processError) {
      return error != null ? error : error = processError;
    });
    spawnedProcess.on('close', function(code, signal) {
      if (code !== 0) {
        if (error == null) {
          error = new Error("Command failed: " + (signal != null ? signal : code));
        }
      }
      if (error != null) {
        if (error.code == null) {
          error.code = code;
        }
      }
      if (error != null) {
        if (error.stdout == null) {
          error.stdout = stdout;
        }
      }
      return typeof callback === "function" ? callback(error, stdout) : void 0;
    });
    return spawnedProcess.stdin.end();
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21haW4tcHJvY2Vzcy9zcGF3bmVyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsWUFBQSxHQUFlLE9BQUEsQ0FBUSxlQUFSOztFQWNmLE9BQU8sQ0FBQyxLQUFSLEdBQWdCLFNBQUMsT0FBRCxFQUFVLElBQVYsRUFBZ0IsUUFBaEI7QUFDZCxRQUFBO0lBQUEsTUFBQSxHQUFTO0FBRVQ7TUFDRSxjQUFBLEdBQWlCLFlBQVksQ0FBQyxLQUFiLENBQW1CLE9BQW5CLEVBQTRCLElBQTVCLEVBRG5CO0tBQUEsY0FBQTtNQUVNO01BRUosT0FBTyxDQUFDLFFBQVIsQ0FBaUIsU0FBQTtnREFBRyxTQUFVLE9BQU87TUFBcEIsQ0FBakI7QUFDQSxhQUxGOztJQU9BLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBdEIsQ0FBeUIsTUFBekIsRUFBaUMsU0FBQyxJQUFEO2FBQVUsTUFBQSxJQUFVO0lBQXBCLENBQWpDO0lBRUEsS0FBQSxHQUFRO0lBQ1IsY0FBYyxDQUFDLEVBQWYsQ0FBa0IsT0FBbEIsRUFBMkIsU0FBQyxZQUFEOzZCQUFrQixRQUFBLFFBQVM7SUFBM0IsQ0FBM0I7SUFDQSxjQUFjLENBQUMsRUFBZixDQUFrQixPQUFsQixFQUEyQixTQUFDLElBQUQsRUFBTyxNQUFQO01BQ3pCLElBQTBELElBQUEsS0FBVSxDQUFwRTs7VUFBQSxRQUFhLElBQUEsS0FBQSxDQUFNLGtCQUFBLEdBQWtCLGtCQUFDLFNBQVMsSUFBVixDQUF4QjtTQUFiOzs7O1VBQ0EsS0FBSyxDQUFFLE9BQVE7Ozs7O1VBQ2YsS0FBSyxDQUFFLFNBQVU7Ozs4Q0FDakIsU0FBVSxPQUFPO0lBSlEsQ0FBM0I7V0FPQSxjQUFjLENBQUMsS0FBSyxDQUFDLEdBQXJCLENBQUE7RUFyQmM7QUFkaEIiLCJzb3VyY2VzQ29udGVudCI6WyJDaGlsZFByb2Nlc3MgPSByZXF1aXJlICdjaGlsZF9wcm9jZXNzJ1xuXG4jIFNwYXduIGEgY29tbWFuZCBhbmQgaW52b2tlIHRoZSBjYWxsYmFjayB3aGVuIGl0IGNvbXBsZXRlcyB3aXRoIGFuIGVycm9yXG4jIGFuZCB0aGUgb3V0cHV0IGZyb20gc3RhbmRhcmQgb3V0LlxuI1xuIyAqIGBjb21tYW5kYCAgICBUaGUgdW5kZXJseWluZyBPUyBjb21tYW5kIHtTdHJpbmd9IHRvIGV4ZWN1dGUuXG4jICogYGFyZ3NgIChvcHRpb25hbCkgVGhlIHtBcnJheX0gd2l0aCBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHRvIGNvbW1hbmQuXG4jICogYGNhbGxiYWNrYCAob3B0aW9uYWwpIFRoZSB7RnVuY3Rpb259IHRvIGNhbGwgYWZ0ZXIgdGhlIGNvbW1hbmQgaGFzIHJ1bi4gSXQgd2lsbCBiZSBpbnZva2VkIHdpdGggYXJndW1lbnRzOlxuIyAgICogYGVycm9yYCAob3B0aW9uYWwpIEFuIHtFcnJvcn0gb2JqZWN0IHJldHVybmVkIGJ5IHRoZSBjb21tYW5kLCBgbnVsbGAgaWYgbm8gZXJyb3Igd2FzIHRocm93bi5cbiMgICAgICogYGNvZGVgIEVycm9yIGNvZGUgcmV0dXJuZWQgYnkgdGhlIGNvbW1hbmQuXG4jICAgICAqIGBzdGRvdXRgICBUaGUge1N0cmluZ30gb3V0cHV0IHRleHQgZ2VuZXJhdGVkIGJ5IHRoZSBjb21tYW5kLlxuIyAgICogYHN0ZG91dGAgIFRoZSB7U3RyaW5nfSBvdXRwdXQgdGV4dCBnZW5lcmF0ZWQgYnkgdGhlIGNvbW1hbmQuXG4jXG4jIFJldHVybnMgYHVuZGVmaW5lZGAuXG5leHBvcnRzLnNwYXduID0gKGNvbW1hbmQsIGFyZ3MsIGNhbGxiYWNrKSAtPlxuICBzdGRvdXQgPSAnJ1xuXG4gIHRyeVxuICAgIHNwYXduZWRQcm9jZXNzID0gQ2hpbGRQcm9jZXNzLnNwYXduKGNvbW1hbmQsIGFyZ3MpXG4gIGNhdGNoIGVycm9yXG4gICAgIyBTcGF3biBjYW4gdGhyb3cgYW4gZXJyb3JcbiAgICBwcm9jZXNzLm5leHRUaWNrIC0+IGNhbGxiYWNrPyhlcnJvciwgc3Rkb3V0KVxuICAgIHJldHVyblxuXG4gIHNwYXduZWRQcm9jZXNzLnN0ZG91dC5vbiAnZGF0YScsIChkYXRhKSAtPiBzdGRvdXQgKz0gZGF0YVxuXG4gIGVycm9yID0gbnVsbFxuICBzcGF3bmVkUHJvY2Vzcy5vbiAnZXJyb3InLCAocHJvY2Vzc0Vycm9yKSAtPiBlcnJvciA/PSBwcm9jZXNzRXJyb3JcbiAgc3Bhd25lZFByb2Nlc3Mub24gJ2Nsb3NlJywgKGNvZGUsIHNpZ25hbCkgLT5cbiAgICBlcnJvciA/PSBuZXcgRXJyb3IoXCJDb21tYW5kIGZhaWxlZDogI3tzaWduYWwgPyBjb2RlfVwiKSBpZiBjb2RlIGlzbnQgMFxuICAgIGVycm9yPy5jb2RlID89IGNvZGVcbiAgICBlcnJvcj8uc3Rkb3V0ID89IHN0ZG91dFxuICAgIGNhbGxiYWNrPyhlcnJvciwgc3Rkb3V0KVxuICAjIFRoaXMgaXMgbmVjZXNzYXJ5IGlmIHVzaW5nIFBvd2Vyc2hlbGwgMiBvbiBXaW5kb3dzIDcgdG8gZ2V0IHRoZSBldmVudHMgdG8gcmFpc2VcbiAgIyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzkxNTUyODkvY2FsbGluZy1wb3dlcnNoZWxsLWZyb20tbm9kZWpzXG4gIHNwYXduZWRQcm9jZXNzLnN0ZGluLmVuZCgpXG4iXX0=
