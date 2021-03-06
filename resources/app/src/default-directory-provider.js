(function() {
  var DefaultDirectoryProvider, Directory, fs, path, url;

  Directory = require('pathwatcher').Directory;

  fs = require('fs-plus');

  path = require('path');

  url = require('url');

  module.exports = DefaultDirectoryProvider = (function() {
    function DefaultDirectoryProvider() {}

    DefaultDirectoryProvider.prototype.directoryForURISync = function(uri) {
      var directory, directoryPath, host, normalizedPath;
      normalizedPath = this.normalizePath(uri);
      host = url.parse(uri).host;
      directoryPath = host ? uri : !fs.isDirectorySync(normalizedPath) && fs.isDirectorySync(path.dirname(normalizedPath)) ? path.dirname(normalizedPath) : normalizedPath;
      directory = new Directory(directoryPath);
      if (host) {
        directory.path = directoryPath;
        if (fs.isCaseInsensitive()) {
          directory.lowerCasePath = directoryPath.toLowerCase();
        }
      }
      return directory;
    };

    DefaultDirectoryProvider.prototype.directoryForURI = function(uri) {
      return Promise.resolve(this.directoryForURISync(uri));
    };

    DefaultDirectoryProvider.prototype.normalizePath = function(uri) {
      var matchData, pathWithNormalizedDiskDriveLetter;
      pathWithNormalizedDiskDriveLetter = process.platform === 'win32' && (matchData = uri.match(/^([a-z]):/)) ? "" + (matchData[1].toUpperCase()) + (uri.slice(1)) : uri;
      return path.normalize(pathWithNormalizedDiskDriveLetter);
    };

    return DefaultDirectoryProvider;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2RlZmF1bHQtZGlyZWN0b3J5LXByb3ZpZGVyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUMsWUFBYSxPQUFBLENBQVEsYUFBUjs7RUFDZCxFQUFBLEdBQUssT0FBQSxDQUFRLFNBQVI7O0VBQ0wsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLEdBQUEsR0FBTSxPQUFBLENBQVEsS0FBUjs7RUFFTixNQUFNLENBQUMsT0FBUCxHQUNNOzs7dUNBVUosbUJBQUEsR0FBcUIsU0FBQyxHQUFEO0FBQ25CLFVBQUE7TUFBQSxjQUFBLEdBQWlCLElBQUMsQ0FBQSxhQUFELENBQWUsR0FBZjtNQUNoQixPQUFRLEdBQUcsQ0FBQyxLQUFKLENBQVUsR0FBVjtNQUNULGFBQUEsR0FBbUIsSUFBSCxHQUNkLEdBRGMsR0FFUixDQUFJLEVBQUUsQ0FBQyxlQUFILENBQW1CLGNBQW5CLENBQUosSUFBMkMsRUFBRSxDQUFDLGVBQUgsQ0FBbUIsSUFBSSxDQUFDLE9BQUwsQ0FBYSxjQUFiLENBQW5CLENBQTlDLEdBQ0gsSUFBSSxDQUFDLE9BQUwsQ0FBYSxjQUFiLENBREcsR0FHSDtNQUdGLFNBQUEsR0FBZ0IsSUFBQSxTQUFBLENBQVUsYUFBVjtNQUNoQixJQUFHLElBQUg7UUFDRSxTQUFTLENBQUMsSUFBVixHQUFpQjtRQUNqQixJQUFHLEVBQUUsQ0FBQyxpQkFBSCxDQUFBLENBQUg7VUFDRSxTQUFTLENBQUMsYUFBVixHQUEwQixhQUFhLENBQUMsV0FBZCxDQUFBLEVBRDVCO1NBRkY7O2FBSUE7SUFoQm1COzt1Q0EwQnJCLGVBQUEsR0FBaUIsU0FBQyxHQUFEO2FBQ2YsT0FBTyxDQUFDLE9BQVIsQ0FBZ0IsSUFBQyxDQUFBLG1CQUFELENBQXFCLEdBQXJCLENBQWhCO0lBRGU7O3VDQVFqQixhQUFBLEdBQWUsU0FBQyxHQUFEO0FBRWIsVUFBQTtNQUFBLGlDQUFBLEdBQ0ssT0FBTyxDQUFDLFFBQVIsS0FBb0IsT0FBcEIsSUFBZ0MsQ0FBQSxTQUFBLEdBQVksR0FBRyxDQUFDLEtBQUosQ0FBVSxXQUFWLENBQVosQ0FBbkMsR0FDRSxFQUFBLEdBQUUsQ0FBQyxTQUFVLENBQUEsQ0FBQSxDQUFFLENBQUMsV0FBYixDQUFBLENBQUQsQ0FBRixHQUErQixDQUFDLEdBQUcsQ0FBQyxLQUFKLENBQVUsQ0FBVixDQUFELENBRGpDLEdBR0U7YUFDSixJQUFJLENBQUMsU0FBTCxDQUFlLGlDQUFmO0lBUGE7Ozs7O0FBbERqQiIsInNvdXJjZXNDb250ZW50IjpbIntEaXJlY3Rvcnl9ID0gcmVxdWlyZSAncGF0aHdhdGNoZXInXG5mcyA9IHJlcXVpcmUgJ2ZzLXBsdXMnXG5wYXRoID0gcmVxdWlyZSAncGF0aCdcbnVybCA9IHJlcXVpcmUgJ3VybCdcblxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgRGVmYXVsdERpcmVjdG9yeVByb3ZpZGVyXG5cbiAgIyBQdWJsaWM6IENyZWF0ZSBhIERpcmVjdG9yeSB0aGF0IGNvcnJlc3BvbmRzIHRvIHRoZSBzcGVjaWZpZWQgVVJJLlxuICAjXG4gICMgKiBgdXJpYCB7U3RyaW5nfSBUaGUgcGF0aCB0byB0aGUgZGlyZWN0b3J5IHRvIGFkZC4gVGhpcyBpcyBndWFyYW50ZWVkIG5vdCB0b1xuICAjIGJlIGNvbnRhaW5lZCBieSBhIHtEaXJlY3Rvcnl9IGluIGBhdG9tLnByb2plY3RgLlxuICAjXG4gICMgUmV0dXJuczpcbiAgIyAqIHtEaXJlY3Rvcnl9IGlmIHRoZSBnaXZlbiBVUkkgaXMgY29tcGF0aWJsZSB3aXRoIHRoaXMgcHJvdmlkZXIuXG4gICMgKiBgbnVsbGAgaWYgdGhlIGdpdmVuIFVSSSBpcyBub3QgY29tcGF0aWJpbGUgd2l0aCB0aGlzIHByb3ZpZGVyLlxuICBkaXJlY3RvcnlGb3JVUklTeW5jOiAodXJpKSAtPlxuICAgIG5vcm1hbGl6ZWRQYXRoID0gQG5vcm1hbGl6ZVBhdGgodXJpKVxuICAgIHtob3N0fSA9IHVybC5wYXJzZSh1cmkpXG4gICAgZGlyZWN0b3J5UGF0aCA9IGlmIGhvc3RcbiAgICAgIHVyaVxuICAgIGVsc2UgaWYgbm90IGZzLmlzRGlyZWN0b3J5U3luYyhub3JtYWxpemVkUGF0aCkgYW5kIGZzLmlzRGlyZWN0b3J5U3luYyhwYXRoLmRpcm5hbWUobm9ybWFsaXplZFBhdGgpKVxuICAgICAgcGF0aC5kaXJuYW1lKG5vcm1hbGl6ZWRQYXRoKVxuICAgIGVsc2VcbiAgICAgIG5vcm1hbGl6ZWRQYXRoXG5cbiAgICAjIFRPRE86IFN0b3Agbm9ybWFsaXppbmcgdGhlIHBhdGggaW4gcGF0aHdhdGNoZXIncyBEaXJlY3RvcnkuXG4gICAgZGlyZWN0b3J5ID0gbmV3IERpcmVjdG9yeShkaXJlY3RvcnlQYXRoKVxuICAgIGlmIGhvc3RcbiAgICAgIGRpcmVjdG9yeS5wYXRoID0gZGlyZWN0b3J5UGF0aFxuICAgICAgaWYgZnMuaXNDYXNlSW5zZW5zaXRpdmUoKVxuICAgICAgICBkaXJlY3RvcnkubG93ZXJDYXNlUGF0aCA9IGRpcmVjdG9yeVBhdGgudG9Mb3dlckNhc2UoKVxuICAgIGRpcmVjdG9yeVxuXG4gICMgUHVibGljOiBDcmVhdGUgYSBEaXJlY3RvcnkgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgc3BlY2lmaWVkIFVSSS5cbiAgI1xuICAjICogYHVyaWAge1N0cmluZ30gVGhlIHBhdGggdG8gdGhlIGRpcmVjdG9yeSB0byBhZGQuIFRoaXMgaXMgZ3VhcmFudGVlZCBub3QgdG9cbiAgIyBiZSBjb250YWluZWQgYnkgYSB7RGlyZWN0b3J5fSBpbiBgYXRvbS5wcm9qZWN0YC5cbiAgI1xuICAjIFJldHVybnMgYSB7UHJvbWlzZX0gdGhhdCByZXNvbHZlcyB0bzpcbiAgIyAqIHtEaXJlY3Rvcnl9IGlmIHRoZSBnaXZlbiBVUkkgaXMgY29tcGF0aWJsZSB3aXRoIHRoaXMgcHJvdmlkZXIuXG4gICMgKiBgbnVsbGAgaWYgdGhlIGdpdmVuIFVSSSBpcyBub3QgY29tcGF0aWJpbGUgd2l0aCB0aGlzIHByb3ZpZGVyLlxuICBkaXJlY3RvcnlGb3JVUkk6ICh1cmkpIC0+XG4gICAgUHJvbWlzZS5yZXNvbHZlKEBkaXJlY3RvcnlGb3JVUklTeW5jKHVyaSkpXG5cbiAgIyBQdWJsaWM6IE5vcm1hbGl6ZXMgcGF0aC5cbiAgI1xuICAjICogYHVyaWAge1N0cmluZ30gVGhlIHBhdGggdGhhdCBzaG91bGQgYmUgbm9ybWFsaXplZC5cbiAgI1xuICAjIFJldHVybnMgYSB7U3RyaW5nfSB3aXRoIG5vcm1hbGl6ZWQgcGF0aC5cbiAgbm9ybWFsaXplUGF0aDogKHVyaSkgLT5cbiAgICAjIE5vcm1hbGl6ZSBkaXNrIGRyaXZlIGxldHRlciBvbiBXaW5kb3dzIHRvIGF2b2lkIG9wZW5pbmcgdHdvIGJ1ZmZlcnMgZm9yIHRoZSBzYW1lIGZpbGVcbiAgICBwYXRoV2l0aE5vcm1hbGl6ZWREaXNrRHJpdmVMZXR0ZXIgPVxuICAgICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnd2luMzInIGFuZCBtYXRjaERhdGEgPSB1cmkubWF0Y2goL14oW2Etel0pOi8pXG4gICAgICAgIFwiI3ttYXRjaERhdGFbMV0udG9VcHBlckNhc2UoKX0je3VyaS5zbGljZSgxKX1cIlxuICAgICAgZWxzZVxuICAgICAgICB1cmlcbiAgICBwYXRoLm5vcm1hbGl6ZShwYXRoV2l0aE5vcm1hbGl6ZWREaXNrRHJpdmVMZXR0ZXIpXG4iXX0=
