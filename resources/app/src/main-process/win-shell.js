var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _winreg = require('winreg');

var _winreg2 = _interopRequireDefault(_winreg);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

'use babel';

var exeName = _path2['default'].basename(process.execPath);
var appPath = '"' + process.execPath + '"';
var fileIconPath = '"' + _path2['default'].join(process.execPath, '..', 'resources', 'cli', 'file.ico') + '"';
var isBeta = appPath.includes(' Beta');
var appName = exeName.replace('atom', isBeta ? 'Atom Beta' : 'Atom').replace('.exe', '');

var ShellOption = (function () {
  function ShellOption(key, parts) {
    _classCallCheck(this, ShellOption);

    this.isRegistered = this.isRegistered.bind(this);
    this.register = this.register.bind(this);
    this.deregister = this.deregister.bind(this);
    this.update = this.update.bind(this);
    this.key = key;
    this.parts = parts;
  }

  _createClass(ShellOption, [{
    key: 'isRegistered',
    value: function isRegistered(callback) {
      var _this = this;

      new _winreg2['default']({ hive: 'HKCU', key: this.key + '\\' + this.parts[0].key }).get(this.parts[0].name, function (err, val) {
        return callback(err == null && val != null && val.value === _this.parts[0].value);
      });
    }
  }, {
    key: 'register',
    value: function register(callback) {
      var _this2 = this;

      var doneCount = this.parts.length;
      this.parts.forEach(function (part) {
        var reg = new _winreg2['default']({ hive: 'HKCU', key: part.key != null ? _this2.key + '\\' + part.key : _this2.key });
        return reg.create(function () {
          return reg.set(part.name, _winreg2['default'].REG_SZ, part.value, function () {
            if (--doneCount === 0) return callback();
          });
        });
      });
    }
  }, {
    key: 'deregister',
    value: function deregister(callback) {
      var _this3 = this;

      this.isRegistered(function (isRegistered) {
        if (isRegistered) {
          new _winreg2['default']({ hive: 'HKCU', key: _this3.key }).destroy(function () {
            return callback(null, true);
          });
        } else {
          callback(null, false);
        }
      });
    }
  }, {
    key: 'update',
    value: function update(callback) {
      var _this4 = this;

      new _winreg2['default']({ hive: 'HKCU', key: this.key + '\\' + this.parts[0].key }).get(this.parts[0].name, function (err, val) {
        if (err != null || val == null) {
          callback(err);
        } else {
          _this4.register(callback);
        }
      });
    }
  }]);

  return ShellOption;
})();

exports.appName = appName;

exports.fileHandler = new ShellOption('\\Software\\Classes\\Applications\\' + exeName, [{ key: 'shell\\open\\command', name: '', value: appPath + ' "%1"' }, { key: 'shell\\open', name: 'FriendlyAppName', value: '' + appName }, { key: 'DefaultIcon', name: '', value: '' + fileIconPath }]);

var contextParts = [{ key: 'command', name: '', value: appPath + ' "%1"' }, { name: '', value: 'Open with ' + appName }, { name: 'Icon', value: '' + appPath }];

exports.fileContextMenu = new ShellOption('\\Software\\Classes\\*\\shell\\' + appName, contextParts);
exports.folderContextMenu = new ShellOption('\\Software\\Classes\\Directory\\shell\\' + appName, contextParts);
exports.folderBackgroundContextMenu = new ShellOption('\\Software\\Classes\\Directory\\background\\shell\\' + appName, JSON.parse(JSON.stringify(contextParts).replace('%1', '%V')));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9tYWluLXByb2Nlc3Mvd2luLXNoZWxsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztzQkFFcUIsUUFBUTs7OztvQkFDWixNQUFNOzs7O0FBSHZCLFdBQVcsQ0FBQTs7QUFLWCxJQUFJLE9BQU8sR0FBRyxrQkFBSyxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0FBQzdDLElBQUksT0FBTyxTQUFRLE9BQU8sQ0FBQyxRQUFRLE1BQUksQ0FBQTtBQUN2QyxJQUFJLFlBQVksU0FBUSxrQkFBSyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsTUFBSSxDQUFBO0FBQzdGLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDdEMsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLFdBQVcsR0FBRyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFBOztJQUVsRixXQUFXO0FBQ0gsV0FEUixXQUFXLENBQ0YsR0FBRyxFQUFFLEtBQUssRUFBRTswQkFEckIsV0FBVzs7QUFFYixRQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ2hELFFBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDeEMsUUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUM1QyxRQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxD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QUFFLElBQUksRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFLLE9BQU8sVUFBUyxFQUFDLEVBQ25FLEVBQUMsR0FBRyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxPQUFLLE9BQU8sQUFBRSxFQUFDLEVBQ2xFLEVBQUMsR0FBRyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssT0FBSyxZQUFZLEFBQUUsRUFBQyxDQUN6RCxDQUNGLENBQUE7O0FBRUQsSUFBSSxZQUFZLEdBQUcsQ0FDZixFQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUssT0FBTyxVQUFTLEVBQUMsRUFDdEQsRUFBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssaUJBQWUsT0FBTyxBQUFFLEVBQUMsRUFDekMsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssT0FBSyxPQUFPLEFBQUUsRUFBQyxDQUN0QyxDQUFBOztBQUVELE9BQU8sQ0FBQyxlQUFlLEdBQUcsSUFBSSxXQUFXLHFDQUFtQyxPQUFPLEVBQUksWUFBWSxDQUFDLENBQUE7QUFDcEcsT0FBTyxDQUFDLGlCQUFpQixHQUFHLElBQUksV0FBVyw2Q0FBMkMsT0FBTyxFQUFJLFlBQVksQ0FBQyxDQUFBO0FBQzlHLE9BQU8sQ0FBQywyQkFBMkIsR0FBRyxJQUFJLFdBQVcseURBQXVELE9BQU8sRUFDakgsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FDN0QsQ0FBQSIsImZpbGUiOiJmaWxlOi8vL0M6L3Byb2plY3RzL2F0b20vb3V0L2FwcC9zcmMvbWFpbi1wcm9jZXNzL3dpbi1zaGVsbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2UgYmFiZWwnXG5cbmltcG9ydCBSZWdpc3RyeSBmcm9tICd3aW5yZWcnXG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJ1xuXG5sZXQgZXhlTmFtZSA9IFBhdGguYmFzZW5hbWUocHJvY2Vzcy5leGVjUGF0aClcbmxldCBhcHBQYXRoID0gYFxcXCIke3Byb2Nlc3MuZXhlY1BhdGh9XFxcImBcbmxldCBmaWxlSWNvblBhdGggPSBgXFxcIiR7UGF0aC5qb2luKHByb2Nlc3MuZXhlY1BhdGgsICcuLicsICdyZXNvdXJjZXMnLCAnY2xpJywgJ2ZpbGUuaWNvJyl9XFxcImBcbmxldCBpc0JldGEgPSBhcHBQYXRoLmluY2x1ZGVzKCcgQmV0YScpXG5sZXQgYXBwTmFtZSA9IGV4ZU5hbWUucmVwbGFjZSgnYXRvbScsIGlzQmV0YSA/ICdBdG9tIEJldGEnIDogJ0F0b20nKS5yZXBsYWNlKCcuZXhlJywgJycpXG5cbmNsYXNzIFNoZWxsT3B0aW9uIHtcbiAgY29uc3RydWN0b3IgKGtleSwgcGFydHMpIHtcbiAgICB0aGlzLmlzUmVnaXN0ZXJlZCA9IHRoaXMuaXNSZWdpc3RlcmVkLmJpbmQodGhpcylcbiAgICB0aGlzLnJlZ2lzdGVyID0gdGhpcy5yZWdpc3Rlci5iaW5kKHRoaXMpXG4gICAgdGhpcy5kZXJlZ2lzdGVyID0gdGhpcy5kZXJlZ2lzdGVyLmJpbmQodGhpcylcbiAgICB0aGlzLnVwZGF0ZSA9IHRoaXMudXBkYXRlLmJpbmQodGhpcylcbiAgICB0aGlzLmtleSA9IGtleVxuICAgIHRoaXMucGFydHMgPSBwYXJ0c1xuICB9XG5cbiAgaXNSZWdpc3RlcmVkIChjYWxsYmFjaykge1xuICAgIG5ldyBSZWdpc3RyeSh7aGl2ZTogJ0hLQ1UnLCBrZXk6IGAke3RoaXMua2V5fVxcXFwke3RoaXMucGFydHNbMF0ua2V5fWB9KVxuICAgICAgLmdldCh0aGlzLnBhcnRzWzBdLm5hbWUsIChlcnIsIHZhbCkgPT4gY2FsbGJhY2soKGVyciA9PSBudWxsKSAmJiAodmFsICE9IG51bGwpICYmIHZhbC52YWx1ZSA9PT0gdGhpcy5wYXJ0c1swXS52YWx1ZSkpXG4gIH1cblxuICByZWdpc3RlciAoY2FsbGJhY2spIHtcbiAgICBsZXQgZG9uZUNvdW50ID0gdGhpcy5wYXJ0cy5sZW5ndGhcbiAgICB0aGlzLnBhcnRzLmZvckVhY2gocGFydCA9PiB7XG4gICAgICBsZXQgcmVnID0gbmV3IFJlZ2lzdHJ5KHtoaXZlOiAnSEtDVScsIGtleTogKHBhcnQua2V5ICE9IG51bGwpID8gYCR7dGhpcy5rZXl9XFxcXCR7cGFydC5rZXl9YCA6IHRoaXMua2V5fSlcbiAgICAgIHJldHVybiByZWcuY3JlYXRlKCgpID0+IHJlZy5zZXQocGFydC5uYW1lLCBSZWdpc3RyeS5SRUdfU1osIHBhcnQudmFsdWUsICgpID0+IHsgaWYgKC0tZG9uZUNvdW50ID09PSAwKSByZXR1cm4gY2FsbGJhY2soKSB9KSlcbiAgICB9KVxuICB9XG5cbiAgZGVyZWdpc3RlciAoY2FsbGJhY2spIHtcbiAgICB0aGlzLmlzUmVnaXN0ZXJlZChpc1JlZ2lzdGVyZWQgPT4ge1xuICAgICAgaWYgKGlzUmVnaXN0ZXJlZCkge1xuICAgICAgICBuZXcgUmVnaXN0cnkoe2hpdmU6ICdIS0NVJywga2V5OiB0aGlzLmtleX0pLmRlc3Ryb3koKCkgPT4gY2FsbGJhY2sobnVsbCwgdHJ1ZSkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjayhudWxsLCBmYWxzZSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgdXBkYXRlIChjYWxsYmFjaykge1xuICAgIG5ldyBSZWdpc3RyeSh7aGl2ZTogJ0hLQ1UnLCBrZXk6IGAke3RoaXMua2V5fVxcXFwke3RoaXMucGFydHNbMF0ua2V5fWB9KVxuICAgICAgLmdldCh0aGlzLnBhcnRzWzBdLm5hbWUsIChlcnIsIHZhbCkgPT4ge1xuICAgICAgICBpZiAoKGVyciAhPSBudWxsKSB8fCAodmFsID09IG51bGwpKSB7XG4gICAgICAgICAgY2FsbGJhY2soZXJyKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucmVnaXN0ZXIoY2FsbGJhY2spXG4gICAgICAgIH1cbiAgICAgIH0pXG4gIH1cbn1cblxuZXhwb3J0cy5hcHBOYW1lID0gYXBwTmFtZVxuXG5leHBvcnRzLmZpbGVIYW5kbGVyID0gbmV3IFNoZWxsT3B0aW9uKGBcXFxcU29mdHdhcmVcXFxcQ2xhc3Nlc1xcXFxBcHBsaWNhdGlvbnNcXFxcJHtleGVOYW1lfWAsXG4gIFtcbiAgICB7a2V5OiAnc2hlbGxcXFxcb3BlblxcXFxjb21tYW5kJywgbmFtZTogJycsIHZhbHVlOiBgJHthcHBQYXRofSBcXFwiJTFcXFwiYH0sXG4gICAge2tleTogJ3NoZWxsXFxcXG9wZW4nLCBuYW1lOiAnRnJpZW5kbHlBcHBOYW1lJywgdmFsdWU6IGAke2FwcE5hbWV9YH0sXG4gICAge2tleTogJ0RlZmF1bHRJY29uJywgbmFtZTogJycsIHZhbHVlOiBgJHtmaWxlSWNvblBhdGh9YH1cbiAgXVxuKVxuXG5sZXQgY29udGV4dFBhcnRzID0gW1xuICAgIHtrZXk6ICdjb21tYW5kJywgbmFtZTogJycsIHZhbHVlOiBgJHthcHBQYXRofSBcXFwiJTFcXFwiYH0sXG4gICAge25hbWU6ICcnLCB2YWx1ZTogYE9wZW4gd2l0aCAke2FwcE5hbWV9YH0sXG4gICAge25hbWU6ICdJY29uJywgdmFsdWU6IGAke2FwcFBhdGh9YH1cbl1cblxuZXhwb3J0cy5maWxlQ29udGV4dE1lbnUgPSBuZXcgU2hlbGxPcHRpb24oYFxcXFxTb2Z0d2FyZVxcXFxDbGFzc2VzXFxcXCpcXFxcc2hlbGxcXFxcJHthcHBOYW1lfWAsIGNvbnRleHRQYXJ0cylcbmV4cG9ydHMuZm9sZGVyQ29udGV4dE1lbnUgPSBuZXcgU2hlbGxPcHRpb24oYFxcXFxTb2Z0d2FyZVxcXFxDbGFzc2VzXFxcXERpcmVjdG9yeVxcXFxzaGVsbFxcXFwke2FwcE5hbWV9YCwgY29udGV4dFBhcnRzKVxuZXhwb3J0cy5mb2xkZXJCYWNrZ3JvdW5kQ29udGV4dE1lbnUgPSBuZXcgU2hlbGxPcHRpb24oYFxcXFxTb2Z0d2FyZVxcXFxDbGFzc2VzXFxcXERpcmVjdG9yeVxcXFxiYWNrZ3JvdW5kXFxcXHNoZWxsXFxcXCR7YXBwTmFtZX1gLFxuICBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGNvbnRleHRQYXJ0cykucmVwbGFjZSgnJTEnLCAnJVYnKSlcbilcbiJdfQ==