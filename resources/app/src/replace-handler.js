(function() {
  var PathReplacer;

  PathReplacer = require('scandal').PathReplacer;

  module.exports = function(filePaths, regexSource, regexFlags, replacementText) {
    var callback, regex, replacer;
    callback = this.async();
    replacer = new PathReplacer();
    regex = new RegExp(regexSource, regexFlags);
    replacer.on('file-error', function(arg) {
      var code, message, path;
      code = arg.code, path = arg.path, message = arg.message;
      return emit('replace:file-error', {
        code: code,
        path: path,
        message: message
      });
    });
    replacer.on('path-replaced', function(result) {
      return emit('replace:path-replaced', result);
    });
    return replacer.replacePaths(regex, replacementText, filePaths, function() {
      return callback();
    });
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3JlcGxhY2UtaGFuZGxlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFDLGVBQWdCLE9BQUEsQ0FBUSxTQUFSOztFQUVqQixNQUFNLENBQUMsT0FBUCxHQUFpQixTQUFDLFNBQUQsRUFBWSxXQUFaLEVBQXlCLFVBQXpCLEVBQXFDLGVBQXJDO0FBQ2YsUUFBQTtJQUFBLFFBQUEsR0FBVyxJQUFDLENBQUEsS0FBRCxDQUFBO0lBRVgsUUFBQSxHQUFlLElBQUEsWUFBQSxDQUFBO0lBQ2YsS0FBQSxHQUFZLElBQUEsTUFBQSxDQUFPLFdBQVAsRUFBb0IsVUFBcEI7SUFFWixRQUFRLENBQUMsRUFBVCxDQUFZLFlBQVosRUFBMEIsU0FBQyxHQUFEO0FBQ3hCLFVBQUE7TUFEMEIsaUJBQU0saUJBQU07YUFDdEMsSUFBQSxDQUFLLG9CQUFMLEVBQTJCO1FBQUMsTUFBQSxJQUFEO1FBQU8sTUFBQSxJQUFQO1FBQWEsU0FBQSxPQUFiO09BQTNCO0lBRHdCLENBQTFCO0lBR0EsUUFBUSxDQUFDLEVBQVQsQ0FBWSxlQUFaLEVBQTZCLFNBQUMsTUFBRDthQUMzQixJQUFBLENBQUssdUJBQUwsRUFBOEIsTUFBOUI7SUFEMkIsQ0FBN0I7V0FHQSxRQUFRLENBQUMsWUFBVCxDQUFzQixLQUF0QixFQUE2QixlQUE3QixFQUE4QyxTQUE5QyxFQUF5RCxTQUFBO2FBQUcsUUFBQSxDQUFBO0lBQUgsQ0FBekQ7RUFaZTtBQUZqQiIsInNvdXJjZXNDb250ZW50IjpbIntQYXRoUmVwbGFjZXJ9ID0gcmVxdWlyZSAnc2NhbmRhbCdcblxubW9kdWxlLmV4cG9ydHMgPSAoZmlsZVBhdGhzLCByZWdleFNvdXJjZSwgcmVnZXhGbGFncywgcmVwbGFjZW1lbnRUZXh0KSAtPlxuICBjYWxsYmFjayA9IEBhc3luYygpXG5cbiAgcmVwbGFjZXIgPSBuZXcgUGF0aFJlcGxhY2VyKClcbiAgcmVnZXggPSBuZXcgUmVnRXhwKHJlZ2V4U291cmNlLCByZWdleEZsYWdzKVxuXG4gIHJlcGxhY2VyLm9uICdmaWxlLWVycm9yJywgKHtjb2RlLCBwYXRoLCBtZXNzYWdlfSkgLT5cbiAgICBlbWl0KCdyZXBsYWNlOmZpbGUtZXJyb3InLCB7Y29kZSwgcGF0aCwgbWVzc2FnZX0pXG5cbiAgcmVwbGFjZXIub24gJ3BhdGgtcmVwbGFjZWQnLCAocmVzdWx0KSAtPlxuICAgIGVtaXQoJ3JlcGxhY2U6cGF0aC1yZXBsYWNlZCcsIHJlc3VsdClcblxuICByZXBsYWNlci5yZXBsYWNlUGF0aHMocmVnZXgsIHJlcGxhY2VtZW50VGV4dCwgZmlsZVBhdGhzLCAtPiBjYWxsYmFjaygpKVxuIl19
