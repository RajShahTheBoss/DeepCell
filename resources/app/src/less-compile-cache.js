(function() {
  var LessCache, LessCompileCache, path;

  path = require('path');

  LessCache = require('less-cache');

  module.exports = LessCompileCache = (function() {
    function LessCompileCache(arg) {
      var cacheDir, importPaths, importedFilePathsByRelativeImportPath, lessSourcesByRelativeFilePath, resourcePath;
      resourcePath = arg.resourcePath, importPaths = arg.importPaths, lessSourcesByRelativeFilePath = arg.lessSourcesByRelativeFilePath, importedFilePathsByRelativeImportPath = arg.importedFilePathsByRelativeImportPath;
      cacheDir = path.join(process.env.ATOM_HOME, 'compile-cache', 'less');
      this.lessSearchPaths = [path.join(resourcePath, 'static', 'variables'), path.join(resourcePath, 'static')];
      if (importPaths != null) {
        importPaths = importPaths.concat(this.lessSearchPaths);
      } else {
        importPaths = this.lessSearchPaths;
      }
      this.cache = new LessCache({
        importPaths: importPaths,
        resourcePath: resourcePath,
        lessSourcesByRelativeFilePath: lessSourcesByRelativeFilePath,
        importedFilePathsByRelativeImportPath: importedFilePathsByRelativeImportPath,
        cacheDir: cacheDir,
        fallbackDir: path.join(resourcePath, 'less-compile-cache')
      });
    }

    LessCompileCache.prototype.setImportPaths = function(importPaths) {
      if (importPaths == null) {
        importPaths = [];
      }
      return this.cache.setImportPaths(importPaths.concat(this.lessSearchPaths));
    };

    LessCompileCache.prototype.read = function(stylesheetPath) {
      return this.cache.readFileSync(stylesheetPath);
    };

    LessCompileCache.prototype.cssForFile = function(stylesheetPath, lessContent, digest) {
      return this.cache.cssForFile(stylesheetPath, lessContent, digest);
    };

    return LessCompileCache;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2xlc3MtY29tcGlsZS1jYWNoZS5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxTQUFBLEdBQVksT0FBQSxDQUFRLFlBQVI7O0VBR1osTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNTLDBCQUFDLEdBQUQ7QUFDWCxVQUFBO01BRGEsaUNBQWMsK0JBQWEsbUVBQStCO01BQ3ZFLFFBQUEsR0FBVyxJQUFJLENBQUMsSUFBTCxDQUFVLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBdEIsRUFBaUMsZUFBakMsRUFBa0QsTUFBbEQ7TUFFWCxJQUFDLENBQUEsZUFBRCxHQUFtQixDQUNqQixJQUFJLENBQUMsSUFBTCxDQUFVLFlBQVYsRUFBd0IsUUFBeEIsRUFBa0MsV0FBbEMsQ0FEaUIsRUFFakIsSUFBSSxDQUFDLElBQUwsQ0FBVSxZQUFWLEVBQXdCLFFBQXhCLENBRmlCO01BS25CLElBQUcsbUJBQUg7UUFDRSxXQUFBLEdBQWMsV0FBVyxDQUFDLE1BQVosQ0FBbUIsSUFBQyxDQUFBLGVBQXBCLEVBRGhCO09BQUEsTUFBQTtRQUdFLFdBQUEsR0FBYyxJQUFDLENBQUEsZ0JBSGpCOztNQUtBLElBQUMsQ0FBQSxLQUFELEdBQWEsSUFBQSxTQUFBLENBQVU7UUFDckIsYUFBQSxXQURxQjtRQUVyQixjQUFBLFlBRnFCO1FBR3JCLCtCQUFBLDZCQUhxQjtRQUlyQix1Q0FBQSxxQ0FKcUI7UUFLckIsVUFBQSxRQUxxQjtRQU1yQixXQUFBLEVBQWEsSUFBSSxDQUFDLElBQUwsQ0FBVSxZQUFWLEVBQXdCLG9CQUF4QixDQU5RO09BQVY7SUFiRjs7K0JBc0JiLGNBQUEsR0FBZ0IsU0FBQyxXQUFEOztRQUFDLGNBQVk7O2FBQzNCLElBQUMsQ0FBQSxLQUFLLENBQUMsY0FBUCxDQUFzQixXQUFXLENBQUMsTUFBWixDQUFtQixJQUFDLENBQUEsZUFBcEIsQ0FBdEI7SUFEYzs7K0JBR2hCLElBQUEsR0FBTSxTQUFDLGNBQUQ7YUFDSixJQUFDLENBQUEsS0FBSyxDQUFDLFlBQVAsQ0FBb0IsY0FBcEI7SUFESTs7K0JBR04sVUFBQSxHQUFZLFNBQUMsY0FBRCxFQUFpQixXQUFqQixFQUE4QixNQUE5QjthQUNWLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBUCxDQUFrQixjQUFsQixFQUFrQyxXQUFsQyxFQUErQyxNQUEvQztJQURVOzs7OztBQWxDZCIsInNvdXJjZXNDb250ZW50IjpbInBhdGggPSByZXF1aXJlICdwYXRoJ1xuTGVzc0NhY2hlID0gcmVxdWlyZSAnbGVzcy1jYWNoZSdcblxuIyB7TGVzc0NhY2hlfSB3cmFwcGVyIHVzZWQgYnkge1RoZW1lTWFuYWdlcn0gdG8gcmVhZCBzdHlsZXNoZWV0cy5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIExlc3NDb21waWxlQ2FjaGVcbiAgY29uc3RydWN0b3I6ICh7cmVzb3VyY2VQYXRoLCBpbXBvcnRQYXRocywgbGVzc1NvdXJjZXNCeVJlbGF0aXZlRmlsZVBhdGgsIGltcG9ydGVkRmlsZVBhdGhzQnlSZWxhdGl2ZUltcG9ydFBhdGh9KSAtPlxuICAgIGNhY2hlRGlyID0gcGF0aC5qb2luKHByb2Nlc3MuZW52LkFUT01fSE9NRSwgJ2NvbXBpbGUtY2FjaGUnLCAnbGVzcycpXG5cbiAgICBAbGVzc1NlYXJjaFBhdGhzID0gW1xuICAgICAgcGF0aC5qb2luKHJlc291cmNlUGF0aCwgJ3N0YXRpYycsICd2YXJpYWJsZXMnKVxuICAgICAgcGF0aC5qb2luKHJlc291cmNlUGF0aCwgJ3N0YXRpYycpXG4gICAgXVxuXG4gICAgaWYgaW1wb3J0UGF0aHM/XG4gICAgICBpbXBvcnRQYXRocyA9IGltcG9ydFBhdGhzLmNvbmNhdChAbGVzc1NlYXJjaFBhdGhzKVxuICAgIGVsc2VcbiAgICAgIGltcG9ydFBhdGhzID0gQGxlc3NTZWFyY2hQYXRoc1xuXG4gICAgQGNhY2hlID0gbmV3IExlc3NDYWNoZSh7XG4gICAgICBpbXBvcnRQYXRocyxcbiAgICAgIHJlc291cmNlUGF0aCxcbiAgICAgIGxlc3NTb3VyY2VzQnlSZWxhdGl2ZUZpbGVQYXRoLFxuICAgICAgaW1wb3J0ZWRGaWxlUGF0aHNCeVJlbGF0aXZlSW1wb3J0UGF0aCxcbiAgICAgIGNhY2hlRGlyLFxuICAgICAgZmFsbGJhY2tEaXI6IHBhdGguam9pbihyZXNvdXJjZVBhdGgsICdsZXNzLWNvbXBpbGUtY2FjaGUnKVxuICAgIH0pXG5cbiAgc2V0SW1wb3J0UGF0aHM6IChpbXBvcnRQYXRocz1bXSkgLT5cbiAgICBAY2FjaGUuc2V0SW1wb3J0UGF0aHMoaW1wb3J0UGF0aHMuY29uY2F0KEBsZXNzU2VhcmNoUGF0aHMpKVxuXG4gIHJlYWQ6IChzdHlsZXNoZWV0UGF0aCkgLT5cbiAgICBAY2FjaGUucmVhZEZpbGVTeW5jKHN0eWxlc2hlZXRQYXRoKVxuXG4gIGNzc0ZvckZpbGU6IChzdHlsZXNoZWV0UGF0aCwgbGVzc0NvbnRlbnQsIGRpZ2VzdCkgLT5cbiAgICBAY2FjaGUuY3NzRm9yRmlsZShzdHlsZXNoZWV0UGF0aCwgbGVzc0NvbnRlbnQsIGRpZ2VzdClcbiJdfQ==
