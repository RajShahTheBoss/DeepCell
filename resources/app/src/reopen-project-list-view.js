Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, 'next'); var callThrow = step.bind(null, 'throw'); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

/** @babel */

var _atomSelectList = require('atom-select-list');

var _atomSelectList2 = _interopRequireDefault(_atomSelectList);

var ReopenProjectListView = (function () {
  function ReopenProjectListView(callback) {
    var _this = this;

    _classCallCheck(this, ReopenProjectListView);

    this.callback = callback;
    this.selectListView = new _atomSelectList2['default']({
      emptyMessage: 'No projects in history.',
      itemsClassList: ['mark-active'],
      items: [],
      filterKeyForItem: function filterKeyForItem(project) {
        return project.name;
      },
      elementForItem: function elementForItem(project) {
        var element = document.createElement('li');
        if (project.name === _this.currentProjectName) {
          element.classList.add('active');
        }
        element.textContent = project.name;
        return element;
      },
      didConfirmSelection: function didConfirmSelection(project) {
        _this.cancel();
        _this.callback(project.value);
      },
      didCancelSelection: function didCancelSelection() {
        _this.cancel();
      }
    });
    this.selectListView.element.classList.add('reopen-project');
  }

  _createClass(ReopenProjectListView, [{
    key: 'dispose',
    value: function dispose() {
      this.cancel();
      return this.selectListView.destroy();
    }
  }, {
    key: 'cancel',
    value: function cancel() {
      if (this.panel != null) {
        this.panel.destroy();
      }
      this.panel = null;
      this.currentProjectName = null;
      if (this.previouslyFocusedElement) {
        this.previouslyFocusedElement.focus();
        this.previouslyFocusedElement = null;
      }
    }
  }, {
    key: 'attach',
    value: function attach() {
      this.previouslyFocusedElement = document.activeElement;
      if (this.panel == null) {
        this.panel = atom.workspace.addModalPanel({ item: this });
      }
      this.selectListView.focus();
      this.selectListView.reset();
    }
  }, {
    key: 'toggle',
    value: _asyncToGenerator(function* () {
      var _this2 = this;

      if (this.panel != null) {
        this.cancel();
      } else {
        this.currentProjectName = atom.project != null ? this.makeName(atom.project.getPaths()) : null;
        var projects = atom.history.getProjects().map(function (p) {
          return { name: _this2.makeName(p.paths), value: p.paths };
        });
        yield this.selectListView.update({ items: projects });
        this.attach();
      }
    })
  }, {
    key: 'makeName',
    value: function makeName(paths) {
      return paths.join(', ');
    }
  }, {
    key: 'element',
    get: function get() {
      return this.selectListView.element;
    }
  }]);

  return ReopenProjectListView;
})();

exports['default'] = ReopenProjectListView;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9yZW9wZW4tcHJvamVjdC1saXN0LXZpZXcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OEJBRTJCLGtCQUFrQjs7OztJQUV4QixxQkFBcUI7QUFDNUIsV0FETyxxQkFBcUIsQ0FDM0IsUUFBUSxFQUFFOzs7MEJBREoscUJBQXFCOztBQUV0QyxRQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQTtBQUN4QixRQUFJLENBQUMsY0FBYyxHQUFHLGdDQUFtQjtBQUN2QyxrQkFBWSxFQUFFLHlCQUF5QjtBQUN2QyxvQkFBYyxFQUFFLENBQUMsYUFBYSxDQUFDO0FBQy9CLFdBQUssRUFBRSxFQUFFO0FBQ1Qsc0JBQWdCLEVBQUUsMEJBQUMsT0FBTztlQUFLLE9BQU8sQ0FBQyxJQUFJO09BQUE7QUFDM0Msb0JBQWMsRUFBRSx3QkFBQyxPQUFPLEVBQUs7QUFDM0IsWUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUMxQyxZQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBSyxrQkFBa0IsRUFBRTtBQUM1QyxpQkFBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7U0FDaEM7QUFDRCxlQUFPLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7QUFDbEMsZUFBTyxPQUFPLENBQUE7T0FDZjtBQUNELHlCQUFtQixFQUFFLDZCQUFDLE9BQU8sRUFBSztBQUNoQyxjQUFLLE1BQU0sRUFBRSxDQUFBO0FBQ2IsY0FBSyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO09BQzdCO0FBQ0Qsd0JBQWtCLEVBQUUsOEJBQU07QUFDeEIsY0FBSyxNQUFNLEVBQUUsQ0FBQTtPQUNkO0tBQ0YsQ0FBQyxDQUFBO0FBQ0YsUUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0dBQzVEOztlQXpCa0IscUJBQXFCOztXQStCaEMsbUJBQUc7QUFDVCxVQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7QUFDYixhQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUE7S0FDckM7OztXQUVNLGtCQUFHO0FBQ1IsVUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksRUFBRTtBQUN0QixZQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO09BQ3JCO0FBQ0QsVUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7QUFDakIsVUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQTtBQUM5QixVQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtBQUNqQyxZQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLENBQUE7QUFDckMsWUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQTtPQUNyQztLQUNGOzs7V0FFTSxrQkFBRztBQUNSLFVBQUksQ0FBQyx3QkFBd0IsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFBO0FBQ3RELFVBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLEVBQUU7QUFDdEIsWUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFBO09BQ3hEO0FBQ0QsVUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtBQUMzQixVQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFBO0tBQzVCOzs7NkJBRVksYUFBRzs7O0FBQ2QsVUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksRUFBRTtBQUN0QixZQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7T0FDZCxNQUFNO0FBQ0wsWUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQTtBQUM5RixZQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUM7aUJBQUssRUFBRSxJQUFJLEVBQUUsT0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFO1NBQUMsQ0FBQyxDQUFBO0FBQ3hHLGNBQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBQyxLQUFLLEVBQUUsUUFBUSxFQUFDLENBQUMsQ0FBQTtBQUNuRCxZQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7T0FDZDtLQUNGOzs7V0FFUSxrQkFBQyxLQUFLLEVBQUU7QUFDZixhQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7S0FDeEI7OztTQTNDVyxlQUFHO0FBQ2IsYUFBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQTtLQUNuQzs7O1NBN0JrQixxQkFBcUI7OztxQkFBckIscUJBQXFCIiwiZmlsZSI6ImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9yZW9wZW4tcHJvamVjdC1saXN0LXZpZXcuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiogQGJhYmVsICovXG5cbmltcG9ydCBTZWxlY3RMaXN0VmlldyBmcm9tICdhdG9tLXNlbGVjdC1saXN0J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZW9wZW5Qcm9qZWN0TGlzdFZpZXcge1xuICBjb25zdHJ1Y3RvciAoY2FsbGJhY2spIHtcbiAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2tcbiAgICB0aGlzLnNlbGVjdExpc3RWaWV3ID0gbmV3IFNlbGVjdExpc3RWaWV3KHtcbiAgICAgIGVtcHR5TWVzc2FnZTogJ05vIHByb2plY3RzIGluIGhpc3RvcnkuJyxcbiAgICAgIGl0ZW1zQ2xhc3NMaXN0OiBbJ21hcmstYWN0aXZlJ10sXG4gICAgICBpdGVtczogW10sXG4gICAgICBmaWx0ZXJLZXlGb3JJdGVtOiAocHJvamVjdCkgPT4gcHJvamVjdC5uYW1lLFxuICAgICAgZWxlbWVudEZvckl0ZW06IChwcm9qZWN0KSA9PiB7XG4gICAgICAgIGxldCBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKVxuICAgICAgICBpZiAocHJvamVjdC5uYW1lID09PSB0aGlzLmN1cnJlbnRQcm9qZWN0TmFtZSkge1xuICAgICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJylcbiAgICAgICAgfVxuICAgICAgICBlbGVtZW50LnRleHRDb250ZW50ID0gcHJvamVjdC5uYW1lXG4gICAgICAgIHJldHVybiBlbGVtZW50XG4gICAgICB9LFxuICAgICAgZGlkQ29uZmlybVNlbGVjdGlvbjogKHByb2plY3QpID0+IHtcbiAgICAgICAgdGhpcy5jYW5jZWwoKVxuICAgICAgICB0aGlzLmNhbGxiYWNrKHByb2plY3QudmFsdWUpXG4gICAgICB9LFxuICAgICAgZGlkQ2FuY2VsU2VsZWN0aW9uOiAoKSA9PiB7XG4gICAgICAgIHRoaXMuY2FuY2VsKClcbiAgICAgIH1cbiAgICB9KVxuICAgIHRoaXMuc2VsZWN0TGlzdFZpZXcuZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdyZW9wZW4tcHJvamVjdCcpXG4gIH1cblxuICBnZXQgZWxlbWVudCAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0TGlzdFZpZXcuZWxlbWVudFxuICB9XG5cbiAgZGlzcG9zZSAoKSB7XG4gICAgdGhpcy5jYW5jZWwoKVxuICAgIHJldHVybiB0aGlzLnNlbGVjdExpc3RWaWV3LmRlc3Ryb3koKVxuICB9XG5cbiAgY2FuY2VsICgpIHtcbiAgICBpZiAodGhpcy5wYW5lbCAhPSBudWxsKSB7XG4gICAgICB0aGlzLnBhbmVsLmRlc3Ryb3koKVxuICAgIH1cbiAgICB0aGlzLnBhbmVsID0gbnVsbFxuICAgIHRoaXMuY3VycmVudFByb2plY3ROYW1lID0gbnVsbFxuICAgIGlmICh0aGlzLnByZXZpb3VzbHlGb2N1c2VkRWxlbWVudCkge1xuICAgICAgdGhpcy5wcmV2aW91c2x5Rm9jdXNlZEVsZW1lbnQuZm9jdXMoKVxuICAgICAgdGhpcy5wcmV2aW91c2x5Rm9jdXNlZEVsZW1lbnQgPSBudWxsXG4gICAgfVxuICB9XG5cbiAgYXR0YWNoICgpIHtcbiAgICB0aGlzLnByZXZpb3VzbHlGb2N1c2VkRWxlbWVudCA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnRcbiAgICBpZiAodGhpcy5wYW5lbCA9PSBudWxsKSB7XG4gICAgICB0aGlzLnBhbmVsID0gYXRvbS53b3Jrc3BhY2UuYWRkTW9kYWxQYW5lbCh7aXRlbTogdGhpc30pXG4gICAgfVxuICAgIHRoaXMuc2VsZWN0TGlzdFZpZXcuZm9jdXMoKVxuICAgIHRoaXMuc2VsZWN0TGlzdFZpZXcucmVzZXQoKVxuICB9XG5cbiAgYXN5bmMgdG9nZ2xlICgpIHtcbiAgICBpZiAodGhpcy5wYW5lbCAhPSBudWxsKSB7XG4gICAgICB0aGlzLmNhbmNlbCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY3VycmVudFByb2plY3ROYW1lID0gYXRvbS5wcm9qZWN0ICE9IG51bGwgPyB0aGlzLm1ha2VOYW1lKGF0b20ucHJvamVjdC5nZXRQYXRocygpKSA6IG51bGxcbiAgICAgIGNvbnN0IHByb2plY3RzID0gYXRvbS5oaXN0b3J5LmdldFByb2plY3RzKCkubWFwKHAgPT4gKHsgbmFtZTogdGhpcy5tYWtlTmFtZShwLnBhdGhzKSwgdmFsdWU6IHAucGF0aHMgfSkpXG4gICAgICBhd2FpdCB0aGlzLnNlbGVjdExpc3RWaWV3LnVwZGF0ZSh7aXRlbXM6IHByb2plY3RzfSlcbiAgICAgIHRoaXMuYXR0YWNoKClcbiAgICB9XG4gIH1cblxuICBtYWtlTmFtZSAocGF0aHMpIHtcbiAgICByZXR1cm4gcGF0aHMuam9pbignLCAnKVxuICB9XG59XG4iXX0=