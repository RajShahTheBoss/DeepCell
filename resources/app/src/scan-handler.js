(function() {
  var PathScanner, PathSearcher, async, path, processPaths, ref, search;

  path = require("path");

  async = require("async");

  ref = require('scandal'), PathSearcher = ref.PathSearcher, PathScanner = ref.PathScanner, search = ref.search;

  module.exports = function(rootPaths, regexSource, options, searchOptions) {
    var PATHS_COUNTER_SEARCHED_CHUNK, callback, flags, pathsSearched, regex, searcher;
    if (searchOptions == null) {
      searchOptions = {};
    }
    callback = this.async();
    PATHS_COUNTER_SEARCHED_CHUNK = 50;
    pathsSearched = 0;
    searcher = new PathSearcher(searchOptions);
    searcher.on('file-error', function(arg) {
      var code, message, path;
      code = arg.code, path = arg.path, message = arg.message;
      return emit('scan:file-error', {
        code: code,
        path: path,
        message: message
      });
    });
    searcher.on('results-found', function(result) {
      return emit('scan:result-found', result);
    });
    flags = "g";
    if (options.ignoreCase) {
      flags += "i";
    }
    regex = new RegExp(regexSource, flags);
    return async.each(rootPaths, function(rootPath, next) {
      var options2, scanner;
      options2 = Object.assign({}, options, {
        inclusions: processPaths(rootPath, options.inclusions),
        globalExclusions: processPaths(rootPath, options.globalExclusions)
      });
      scanner = new PathScanner(rootPath, options2);
      scanner.on('path-found', function() {
        pathsSearched++;
        if (pathsSearched % PATHS_COUNTER_SEARCHED_CHUNK === 0) {
          return emit('scan:paths-searched', pathsSearched);
        }
      });
      return search(regex, scanner, searcher, function() {
        emit('scan:paths-searched', pathsSearched);
        return next();
      });
    }, callback);
  };

  processPaths = function(rootPath, paths) {
    var firstSegment, givenPath, i, len, results, rootPathBase, segments;
    if (!((paths != null ? paths.length : void 0) > 0)) {
      return paths;
    }
    rootPathBase = path.basename(rootPath);
    results = [];
    for (i = 0, len = paths.length; i < len; i++) {
      givenPath = paths[i];
      segments = givenPath.split(path.sep);
      firstSegment = segments.shift();
      results.push(givenPath);
      if (firstSegment === rootPathBase) {
        if (segments.length === 0) {
          results.push(path.join("**", "*"));
        } else {
          results.push(path.join.apply(path, segments));
        }
      }
    }
    return results;
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3NjYW4taGFuZGxlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxLQUFBLEdBQVEsT0FBQSxDQUFRLE9BQVI7O0VBQ1IsTUFBc0MsT0FBQSxDQUFRLFNBQVIsQ0FBdEMsRUFBQywrQkFBRCxFQUFlLDZCQUFmLEVBQTRCOztFQUU1QixNQUFNLENBQUMsT0FBUCxHQUFpQixTQUFDLFNBQUQsRUFBWSxXQUFaLEVBQXlCLE9BQXpCLEVBQWtDLGFBQWxDO0FBQ2YsUUFBQTs7TUFEaUQsZ0JBQWM7O0lBQy9ELFFBQUEsR0FBVyxJQUFDLENBQUEsS0FBRCxDQUFBO0lBRVgsNEJBQUEsR0FBK0I7SUFDL0IsYUFBQSxHQUFnQjtJQUVoQixRQUFBLEdBQWUsSUFBQSxZQUFBLENBQWEsYUFBYjtJQUVmLFFBQVEsQ0FBQyxFQUFULENBQVksWUFBWixFQUEwQixTQUFDLEdBQUQ7QUFDeEIsVUFBQTtNQUQwQixpQkFBTSxpQkFBTTthQUN0QyxJQUFBLENBQUssaUJBQUwsRUFBd0I7UUFBQyxNQUFBLElBQUQ7UUFBTyxNQUFBLElBQVA7UUFBYSxTQUFBLE9BQWI7T0FBeEI7SUFEd0IsQ0FBMUI7SUFHQSxRQUFRLENBQUMsRUFBVCxDQUFZLGVBQVosRUFBNkIsU0FBQyxNQUFEO2FBQzNCLElBQUEsQ0FBSyxtQkFBTCxFQUEwQixNQUExQjtJQUQyQixDQUE3QjtJQUdBLEtBQUEsR0FBUTtJQUNSLElBQWdCLE9BQU8sQ0FBQyxVQUF4QjtNQUFBLEtBQUEsSUFBUyxJQUFUOztJQUNBLEtBQUEsR0FBWSxJQUFBLE1BQUEsQ0FBTyxXQUFQLEVBQW9CLEtBQXBCO1dBRVosS0FBSyxDQUFDLElBQU4sQ0FDRSxTQURGLEVBRUUsU0FBQyxRQUFELEVBQVcsSUFBWDtBQUNFLFVBQUE7TUFBQSxRQUFBLEdBQVcsTUFBTSxDQUFDLE1BQVAsQ0FBYyxFQUFkLEVBQWtCLE9BQWxCLEVBQ1Q7UUFBQSxVQUFBLEVBQVksWUFBQSxDQUFhLFFBQWIsRUFBdUIsT0FBTyxDQUFDLFVBQS9CLENBQVo7UUFDQSxnQkFBQSxFQUFrQixZQUFBLENBQWEsUUFBYixFQUF1QixPQUFPLENBQUMsZ0JBQS9CLENBRGxCO09BRFM7TUFJWCxPQUFBLEdBQWMsSUFBQSxXQUFBLENBQVksUUFBWixFQUFzQixRQUF0QjtNQUVkLE9BQU8sQ0FBQyxFQUFSLENBQVcsWUFBWCxFQUF5QixTQUFBO1FBQ3ZCLGFBQUE7UUFDQSxJQUFHLGFBQUEsR0FBZ0IsNEJBQWhCLEtBQWdELENBQW5EO2lCQUNFLElBQUEsQ0FBSyxxQkFBTCxFQUE0QixhQUE1QixFQURGOztNQUZ1QixDQUF6QjthQUtBLE1BQUEsQ0FBTyxLQUFQLEVBQWMsT0FBZCxFQUF1QixRQUF2QixFQUFpQyxTQUFBO1FBQy9CLElBQUEsQ0FBSyxxQkFBTCxFQUE0QixhQUE1QjtlQUNBLElBQUEsQ0FBQTtNQUYrQixDQUFqQztJQVpGLENBRkYsRUFpQkUsUUFqQkY7RUFsQmU7O0VBc0NqQixZQUFBLEdBQWUsU0FBQyxRQUFELEVBQVcsS0FBWDtBQUNiLFFBQUE7SUFBQSxJQUFBLENBQUEsa0JBQW9CLEtBQUssQ0FBRSxnQkFBUCxHQUFnQixDQUFwQyxDQUFBO0FBQUEsYUFBTyxNQUFQOztJQUNBLFlBQUEsR0FBZSxJQUFJLENBQUMsUUFBTCxDQUFjLFFBQWQ7SUFDZixPQUFBLEdBQVU7QUFDVixTQUFBLHVDQUFBOztNQUNFLFFBQUEsR0FBVyxTQUFTLENBQUMsS0FBVixDQUFnQixJQUFJLENBQUMsR0FBckI7TUFDWCxZQUFBLEdBQWUsUUFBUSxDQUFDLEtBQVQsQ0FBQTtNQUNmLE9BQU8sQ0FBQyxJQUFSLENBQWEsU0FBYjtNQUNBLElBQUcsWUFBQSxLQUFnQixZQUFuQjtRQUNFLElBQUcsUUFBUSxDQUFDLE1BQVQsS0FBbUIsQ0FBdEI7VUFDRSxPQUFPLENBQUMsSUFBUixDQUFhLElBQUksQ0FBQyxJQUFMLENBQVUsSUFBVixFQUFnQixHQUFoQixDQUFiLEVBREY7U0FBQSxNQUFBO1VBR0UsT0FBTyxDQUFDLElBQVIsQ0FBYSxJQUFJLENBQUMsSUFBTCxhQUFVLFFBQVYsQ0FBYixFQUhGO1NBREY7O0FBSkY7V0FTQTtFQWJhO0FBMUNmIiwic291cmNlc0NvbnRlbnQiOlsicGF0aCA9IHJlcXVpcmUgXCJwYXRoXCJcbmFzeW5jID0gcmVxdWlyZSBcImFzeW5jXCJcbntQYXRoU2VhcmNoZXIsIFBhdGhTY2FubmVyLCBzZWFyY2h9ID0gcmVxdWlyZSAnc2NhbmRhbCdcblxubW9kdWxlLmV4cG9ydHMgPSAocm9vdFBhdGhzLCByZWdleFNvdXJjZSwgb3B0aW9ucywgc2VhcmNoT3B0aW9ucz17fSkgLT5cbiAgY2FsbGJhY2sgPSBAYXN5bmMoKVxuXG4gIFBBVEhTX0NPVU5URVJfU0VBUkNIRURfQ0hVTksgPSA1MFxuICBwYXRoc1NlYXJjaGVkID0gMFxuXG4gIHNlYXJjaGVyID0gbmV3IFBhdGhTZWFyY2hlcihzZWFyY2hPcHRpb25zKVxuXG4gIHNlYXJjaGVyLm9uICdmaWxlLWVycm9yJywgKHtjb2RlLCBwYXRoLCBtZXNzYWdlfSkgLT5cbiAgICBlbWl0KCdzY2FuOmZpbGUtZXJyb3InLCB7Y29kZSwgcGF0aCwgbWVzc2FnZX0pXG5cbiAgc2VhcmNoZXIub24gJ3Jlc3VsdHMtZm91bmQnLCAocmVzdWx0KSAtPlxuICAgIGVtaXQoJ3NjYW46cmVzdWx0LWZvdW5kJywgcmVzdWx0KVxuXG4gIGZsYWdzID0gXCJnXCJcbiAgZmxhZ3MgKz0gXCJpXCIgaWYgb3B0aW9ucy5pZ25vcmVDYXNlXG4gIHJlZ2V4ID0gbmV3IFJlZ0V4cChyZWdleFNvdXJjZSwgZmxhZ3MpXG5cbiAgYXN5bmMuZWFjaChcbiAgICByb290UGF0aHMsXG4gICAgKHJvb3RQYXRoLCBuZXh0KSAtPlxuICAgICAgb3B0aW9uczIgPSBPYmplY3QuYXNzaWduIHt9LCBvcHRpb25zLFxuICAgICAgICBpbmNsdXNpb25zOiBwcm9jZXNzUGF0aHMocm9vdFBhdGgsIG9wdGlvbnMuaW5jbHVzaW9ucylcbiAgICAgICAgZ2xvYmFsRXhjbHVzaW9uczogcHJvY2Vzc1BhdGhzKHJvb3RQYXRoLCBvcHRpb25zLmdsb2JhbEV4Y2x1c2lvbnMpXG5cbiAgICAgIHNjYW5uZXIgPSBuZXcgUGF0aFNjYW5uZXIocm9vdFBhdGgsIG9wdGlvbnMyKVxuXG4gICAgICBzY2FubmVyLm9uICdwYXRoLWZvdW5kJywgLT5cbiAgICAgICAgcGF0aHNTZWFyY2hlZCsrXG4gICAgICAgIGlmIHBhdGhzU2VhcmNoZWQgJSBQQVRIU19DT1VOVEVSX1NFQVJDSEVEX0NIVU5LIGlzIDBcbiAgICAgICAgICBlbWl0KCdzY2FuOnBhdGhzLXNlYXJjaGVkJywgcGF0aHNTZWFyY2hlZClcblxuICAgICAgc2VhcmNoIHJlZ2V4LCBzY2FubmVyLCBzZWFyY2hlciwgLT5cbiAgICAgICAgZW1pdCgnc2NhbjpwYXRocy1zZWFyY2hlZCcsIHBhdGhzU2VhcmNoZWQpXG4gICAgICAgIG5leHQoKVxuICAgIGNhbGxiYWNrXG4gIClcblxucHJvY2Vzc1BhdGhzID0gKHJvb3RQYXRoLCBwYXRocykgLT5cbiAgcmV0dXJuIHBhdGhzIHVubGVzcyBwYXRocz8ubGVuZ3RoID4gMFxuICByb290UGF0aEJhc2UgPSBwYXRoLmJhc2VuYW1lKHJvb3RQYXRoKVxuICByZXN1bHRzID0gW11cbiAgZm9yIGdpdmVuUGF0aCBpbiBwYXRoc1xuICAgIHNlZ21lbnRzID0gZ2l2ZW5QYXRoLnNwbGl0KHBhdGguc2VwKVxuICAgIGZpcnN0U2VnbWVudCA9IHNlZ21lbnRzLnNoaWZ0KClcbiAgICByZXN1bHRzLnB1c2goZ2l2ZW5QYXRoKVxuICAgIGlmIGZpcnN0U2VnbWVudCBpcyByb290UGF0aEJhc2VcbiAgICAgIGlmIHNlZ21lbnRzLmxlbmd0aCBpcyAwXG4gICAgICAgIHJlc3VsdHMucHVzaChwYXRoLmpvaW4oXCIqKlwiLCBcIipcIikpXG4gICAgICBlbHNlXG4gICAgICAgIHJlc3VsdHMucHVzaChwYXRoLmpvaW4oc2VnbWVudHMuLi4pKVxuICByZXN1bHRzXG4iXX0=
