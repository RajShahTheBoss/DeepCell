(function() {
  var fs, path;

  path = require('path');

  fs = require('fs-plus');

  module.exports = {
    isWindows: function() {
      return !!process.platform.match(/^win/);
    },
    generateEvilFiles: function() {
      var evilFilesPath, filename, filenames, i, len, results;
      evilFilesPath = path.join(__dirname, 'fixtures', 'evil-files');
      if (fs.existsSync(evilFilesPath)) {
        fs.removeSync(evilFilesPath);
      }
      fs.mkdirSync(evilFilesPath);
      if (this.isWindows()) {
        filenames = ["a_file_with_utf8.txt", "file with spaces.txt", "utfa\u0306.md"];
      } else {
        filenames = ["a_file_with_utf8.txt", "file with spaces.txt", "goddam\nnewlines", "quote\".txt", "utfa\u0306.md"];
      }
      results = [];
      for (i = 0, len = filenames.length; i < len; i++) {
        filename = filenames[i];
        results.push(fs.writeFileSync(path.join(evilFilesPath, filename), 'evil file!', {
          flag: 'w'
        }));
      }
      return results;
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3BlYy9zcGVjLWhlbHBlci1wbGF0Zm9ybS5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxFQUFBLEdBQUssT0FBQSxDQUFRLFNBQVI7O0VBR0wsTUFBTSxDQUFDLE9BQVAsR0FFRTtJQUFBLFNBQUEsRUFBVyxTQUFBO2FBQ1QsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBakIsQ0FBdUIsTUFBdkI7SUFETyxDQUFYO0lBT0EsaUJBQUEsRUFBbUIsU0FBQTtBQUNqQixVQUFBO01BQUEsYUFBQSxHQUFnQixJQUFJLENBQUMsSUFBTCxDQUFVLFNBQVYsRUFBcUIsVUFBckIsRUFBaUMsWUFBakM7TUFDaEIsSUFBZ0MsRUFBRSxDQUFDLFVBQUgsQ0FBYyxhQUFkLENBQWhDO1FBQUEsRUFBRSxDQUFDLFVBQUgsQ0FBYyxhQUFkLEVBQUE7O01BQ0EsRUFBRSxDQUFDLFNBQUgsQ0FBYSxhQUFiO01BRUEsSUFBRyxJQUFDLENBQUEsU0FBRCxDQUFBLENBQUg7UUFDRSxTQUFBLEdBQVksQ0FDVixzQkFEVSxFQUVWLHNCQUZVLEVBR1YsZUFIVSxFQURkO09BQUEsTUFBQTtRQU9FLFNBQUEsR0FBWSxDQUNWLHNCQURVLEVBRVYsc0JBRlUsRUFHVixrQkFIVSxFQUlWLGFBSlUsRUFLVixlQUxVLEVBUGQ7O0FBZUE7V0FBQSwyQ0FBQTs7cUJBQ0UsRUFBRSxDQUFDLGFBQUgsQ0FBaUIsSUFBSSxDQUFDLElBQUwsQ0FBVSxhQUFWLEVBQXlCLFFBQXpCLENBQWpCLEVBQXFELFlBQXJELEVBQW1FO1VBQUEsSUFBQSxFQUFNLEdBQU47U0FBbkU7QUFERjs7SUFwQmlCLENBUG5COztBQU5GIiwic291cmNlc0NvbnRlbnQiOlsicGF0aCA9IHJlcXVpcmUgJ3BhdGgnXG5mcyA9IHJlcXVpcmUgJ2ZzLXBsdXMnXG5cbiMjIFBsYXRmb3JtIHNwZWNpZmljIGhlbHBlcnNcbm1vZHVsZS5leHBvcnRzID1cbiAgIyBQdWJsaWM6IFJldHVybnMgdHJ1ZSBpZiBiZWluZyBydW4gZnJvbSB3aXRoaW4gV2luZG93c1xuICBpc1dpbmRvd3M6IC0+XG4gICAgISFwcm9jZXNzLnBsYXRmb3JtLm1hdGNoIC9ed2luL1xuXG4gICMgUHVibGljOiBTb21lIGZpbGVzIGNhbiBub3QgZXhpc3Qgb24gV2luZG93cyBmaWxlc3lzdGVtcywgc28gd2UgaGF2ZSB0b1xuICAjIHNlbGVjdGl2ZWx5IGdlbmVyYXRlIG91ciBmaXh0dXJlcy5cbiAgI1xuICAjIFJldHVybnMgbm90aGluZy5cbiAgZ2VuZXJhdGVFdmlsRmlsZXM6IC0+XG4gICAgZXZpbEZpbGVzUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICdmaXh0dXJlcycsICdldmlsLWZpbGVzJylcbiAgICBmcy5yZW1vdmVTeW5jKGV2aWxGaWxlc1BhdGgpIGlmIGZzLmV4aXN0c1N5bmMoZXZpbEZpbGVzUGF0aClcbiAgICBmcy5ta2RpclN5bmMoZXZpbEZpbGVzUGF0aClcblxuICAgIGlmIEBpc1dpbmRvd3MoKVxuICAgICAgZmlsZW5hbWVzID0gW1xuICAgICAgICBcImFfZmlsZV93aXRoX3V0ZjgudHh0XCJcbiAgICAgICAgXCJmaWxlIHdpdGggc3BhY2VzLnR4dFwiXG4gICAgICAgIFwidXRmYVxcdTAzMDYubWRcIlxuICAgICAgXVxuICAgIGVsc2VcbiAgICAgIGZpbGVuYW1lcyA9IFtcbiAgICAgICAgXCJhX2ZpbGVfd2l0aF91dGY4LnR4dFwiXG4gICAgICAgIFwiZmlsZSB3aXRoIHNwYWNlcy50eHRcIlxuICAgICAgICBcImdvZGRhbVxcbm5ld2xpbmVzXCJcbiAgICAgICAgXCJxdW90ZVxcXCIudHh0XCJcbiAgICAgICAgXCJ1dGZhXFx1MDMwNi5tZFwiXG4gICAgICBdXG5cbiAgICBmb3IgZmlsZW5hbWUgaW4gZmlsZW5hbWVzXG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihldmlsRmlsZXNQYXRoLCBmaWxlbmFtZSksICdldmlsIGZpbGUhJywgZmxhZzogJ3cnKVxuIl19
