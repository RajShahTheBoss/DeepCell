Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, 'next'); var callThrow = step.bind(null, 'throw'); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

/** @babel */

var _eventKit = require('event-kit');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var ReopenProjectMenuManager = (function () {
  function ReopenProjectMenuManager(_ref) {
    var _this = this;

    var menu = _ref.menu;
    var commands = _ref.commands;
    var history = _ref.history;
    var config = _ref.config;
    var open = _ref.open;

    _classCallCheck(this, ReopenProjectMenuManager);

    this.menuManager = menu;
    this.historyManager = history;
    this.config = config;
    this.open = open;
    this.projects = [];

    this.subscriptions = new _eventKit.CompositeDisposable();
    this.subscriptions.add(history.onDidChangeProjects(this.update.bind(this)), config.onDidChange('core.reopenProjectMenuCount', function (_ref2) {
      var oldValue = _ref2.oldValue;
      var newValue = _ref2.newValue;

      _this.update();
    }), commands.add('atom-workspace', { 'application:reopen-project': this.reopenProjectCommand.bind(this) }));

    this.applyWindowsJumpListRemovals();
  }

  _createClass(ReopenProjectMenuManager, [{
    key: 'reopenProjectCommand',
    value: function reopenProjectCommand(e) {
      if (e.detail != null && e.detail.index != null) {
        this.open(this.projects[e.detail.index].paths);
      } else {
        this.createReopenProjectListView();
      }
    }
  }, {
    key: 'createReopenProjectListView',
    value: function createReopenProjectListView() {
      var _this2 = this;

      if (this.reopenProjectListView == null) {
        var ReopenProjectListView = require('./reopen-project-list-view');
        this.reopenProjectListView = new ReopenProjectListView(function (paths) {
          if (paths != null) {
            _this2.open(paths);
          }
        });
      }
      this.reopenProjectListView.toggle();
    }
  }, {
    key: 'update',
    value: function update() {
      this.disposeProjectMenu();
      this.projects = this.historyManager.getProjects().slice(0, this.config.get('core.reopenProjectMenuCount'));
      var newMenu = ReopenProjectMenuManager.createProjectsMenu(this.projects);
      this.lastProjectMenu = this.menuManager.add([newMenu]);
      this.updateWindowsJumpList();
    }
  }, {
    key: 'applyWindowsJumpListRemovals',

    // Windows users can right-click Atom taskbar and remove project from the jump list.
    // We have to honor that or the group stops working. As we only get a partial list
    // each time we remove them from history entirely.
    value: _asyncToGenerator(function* () {
      if (process.platform !== 'win32') return;
      if (this.app === undefined) {
        this.app = require('remote').app;
      }

      var removed = this.app.getJumpListSettings().removedItems.map(function (i) {
        return i.description;
      });
      if (removed.length === 0) return;
      for (var project of this.historyManager.getProjects()) {
        if (removed.includes(ReopenProjectMenuManager.taskDescription(project.paths))) {
          yield this.historyManager.removeProject(project.paths);
        }
      }
    })
  }, {
    key: 'updateWindowsJumpList',
    value: function updateWindowsJumpList() {
      if (process.platform !== 'win32') return;
      if (this.app === undefined) {
        this.app = require('remote').app;
      }

      this.app.setJumpList([{
        type: 'custom',
        name: 'Recent Projects',
        items: this.projects.map(function (project) {
          return {
            type: 'task',
            title: project.paths.map(ReopenProjectMenuManager.betterBaseName).join(', '),
            description: ReopenProjectMenuManager.taskDescription(project.paths),
            program: process.execPath,
            args: project.paths.map(function (path) {
              return '"' + path + '"';
            }).join(' '),
            iconPath: _path2['default'].join(_path2['default'].dirname(process.execPath), 'resources', 'cli', 'folder.ico'),
            iconIndex: 0
          };
        })
      }, { type: 'recent' }, { items: [{ type: 'task', title: 'New Window', program: process.execPath, args: '--new-window', description: 'Opens a new Atom window' }] }]);
    }
  }, {
    key: 'dispose',
    value: function dispose() {
      this.subscriptions.dispose();
      this.disposeProjectMenu();
      if (this.reopenProjectListView != null) {
        this.reopenProjectListView.dispose();
      }
    }
  }, {
    key: 'disposeProjectMenu',
    value: function disposeProjectMenu() {
      if (this.lastProjectMenu) {
        this.lastProjectMenu.dispose();
        this.lastProjectMenu = null;
      }
    }
  }], [{
    key: 'taskDescription',
    value: function taskDescription(paths) {
      return paths.map(function (path) {
        return ReopenProjectMenuManager.betterBaseName(path) + ' (' + path + ')';
      }).join(' ');
    }
  }, {
    key: 'createProjectsMenu',
    value: function createProjectsMenu(projects) {
      var _this3 = this;

      return {
        label: 'File',
        submenu: [{
          label: 'Reopen Project',
          submenu: projects.map(function (project, index) {
            return {
              label: _this3.createLabel(project),
              command: 'application:reopen-project',
              commandDetail: { index: index }
            };
          })
        }]
      };
    }
  }, {
    key: 'createLabel',
    value: function createLabel(project) {
      return project.paths.length === 1 ? project.paths[0] : project.paths.map(this.betterBaseName).join(', ');
    }
  }, {
    key: 'betterBaseName',
    value: function betterBaseName(directory) {
      // Handles Windows roots better than path.basename which returns '' for 'd:' and 'd:\'
      var match = directory.match(/^([a-z]:)[\\]?$/i);
      return match ? match[1] + '\\' : _path2['default'].basename(directory);
    }
  }]);

  return ReopenProjectMenuManager;
})();

exports['default'] = ReopenProjectMenuManager;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9yZW9wZW4tcHJvamVjdC1tZW51LW1hbmFnZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7d0JBRWtDLFdBQVc7O29CQUM1QixNQUFNOzs7O0lBRUYsd0JBQXdCO0FBQy9CLFdBRE8sd0JBQXdCLENBQzlCLElBQXVDLEVBQUU7OztRQUF4QyxJQUFJLEdBQUwsSUFBdUMsQ0FBdEMsSUFBSTtRQUFFLFFBQVEsR0FBZixJQUF1QyxDQUFoQyxRQUFRO1FBQUUsT0FBTyxHQUF4QixJQUF1QyxDQUF0QixPQUFPO1FBQUUsTUFBTSxHQUFoQyxJQUF1QyxDQUFiLE1BQU07UUFBRSxJQUFJLEdBQXRDLElBQXVDLENBQUwsSUFBSTs7MEJBRGhDLHdCQUF3Qjs7QUFFekMsUUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7QUFDdkIsUUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUE7QUFDN0IsUUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7QUFDcEIsUUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7QUFDaEIsUUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUE7O0FBRWxCLFFBQUksQ0FBQyxhQUFhLEdBQUcsbUNBQXlCLENBQUE7QUFDOUMsUUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQ3BCLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLDZCQUE2QixFQUFFLFVBQUMsS0FBb0IsRUFBSztVQUF4QixRQUFRLEdBQVQsS0FBb0IsQ0FBbkIsUUFBUTtVQUFFLFFBQVEsR0FBbkIsS0FBb0IsQ0FBVCxRQUFROztBQUNwRSxZQUFLLE1BQU0sRUFBRSxDQUFBO0tBQ2QsQ0FBQyxFQUNGLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVB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QUVxQix3QkFBQyxTQUFTLEVBQUU7O0FBRWhDLFVBQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtBQUNqRCxhQUFPLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLGtCQUFLLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtLQUMxRDs7O1NBNUlrQix3QkFBd0I7OztxQkFBeEIsd0JBQXdCIiwiZmlsZSI6ImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9yZW9wZW4tcHJvamVjdC1tZW51LW1hbmFnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiogQGJhYmVsICovXG5cbmltcG9ydCB7Q29tcG9zaXRlRGlzcG9zYWJsZX0gZnJvbSAnZXZlbnQta2l0J1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVvcGVuUHJvamVjdE1lbnVNYW5hZ2VyIHtcbiAgY29uc3RydWN0b3IgKHttZW51LCBjb21tYW5kcywgaGlzdG9yeSwgY29uZmlnLCBvcGVufSkge1xuICAgIHRoaXMubWVudU1hbmFnZXIgPSBtZW51XG4gICAgdGhpcy5oaXN0b3J5TWFuYWdlciA9IGhpc3RvcnlcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZ1xuICAgIHRoaXMub3BlbiA9IG9wZW5cbiAgICB0aGlzLnByb2plY3RzID0gW11cblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKClcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgaGlzdG9yeS5vbkRpZENoYW5nZVByb2plY3RzKHRoaXMudXBkYXRlLmJpbmQodGhpcykpLFxuICAgICAgY29uZmlnLm9uRGlkQ2hhbmdlKCdjb3JlLnJlb3BlblByb2plY3RNZW51Q291bnQnLCAoe29sZFZhbHVlLCBuZXdWYWx1ZX0pID0+IHtcbiAgICAgICAgdGhpcy51cGRhdGUoKVxuICAgICAgfSksXG4gICAgICBjb21tYW5kcy5hZGQoJ2F0b20td29ya3NwYWNlJywgeyAnYXBwbGljYXRpb246cmVvcGVuLXByb2plY3QnOiB0aGlzLnJlb3BlblByb2plY3RDb21tYW5kLmJpbmQodGhpcykgfSlcbiAgICApXG5cbiAgICB0aGlzLmFwcGx5V2luZG93c0p1bXBMaXN0UmVtb3ZhbHMoKVxuICB9XG5cbiAgcmVvcGVuUHJvamVjdENvbW1hbmQgKGUpIHtcbiAgICBpZiAoZS5kZXRhaWwgIT0gbnVsbCAmJiBlLmRldGFpbC5pbmRleCAhPSBudWxsKSB7XG4gICAgICB0aGlzLm9wZW4odGhpcy5wcm9qZWN0c1tlLmRldGFpbC5pbmRleF0ucGF0aHMpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY3JlYXRlUmVvcGVuUHJvamVjdExpc3RWaWV3KClcbiAgICB9XG4gIH1cblxuICBjcmVhdGVSZW9wZW5Qcm9qZWN0TGlzdFZpZXcgKCkge1xuICAgIGlmICh0aGlzLnJlb3BlblByb2plY3RMaXN0VmlldyA9PSBudWxsKSB7XG4gICAgICBjb25zdCBSZW9wZW5Qcm9qZWN0TGlzdFZpZXcgPSByZXF1aXJlKCcuL3Jlb3Blbi1wcm9qZWN0LWxpc3QtdmlldycpXG4gICAgICB0aGlzLnJlb3BlblByb2plY3RMaXN0VmlldyA9IG5ldyBSZW9wZW5Qcm9qZWN0TGlzdFZpZXcocGF0aHMgPT4ge1xuICAgICAgICBpZiAocGF0aHMgIT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMub3BlbihwYXRocylcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gICAgdGhpcy5yZW9wZW5Qcm9qZWN0TGlzdFZpZXcudG9nZ2xlKClcbiAgfVxuXG4gIHVwZGF0ZSAoKSB7XG4gICAgdGhpcy5kaXNwb3NlUHJvamVjdE1lbnUoKVxuICAgIHRoaXMucHJvamVjdHMgPSB0aGlzLmhpc3RvcnlNYW5hZ2VyLmdldFByb2plY3RzKCkuc2xpY2UoMCwgdGhpcy5jb25maWcuZ2V0KCdjb3JlLnJlb3BlblByb2plY3RNZW51Q291bnQnKSlcbiAgICBjb25zdCBuZXdNZW51ID0gUmVvcGVuUHJvamVjdE1lbnVNYW5hZ2VyLmNyZWF0ZVByb2plY3RzTWVudSh0aGlzLnByb2plY3RzKVxuICAgIHRoaXMubGFzdFByb2plY3RNZW51ID0gdGhpcy5tZW51TWFuYWdlci5hZGQoW25ld01lbnVdKVxuICAgIHRoaXMudXBkYXRlV2luZG93c0p1bXBMaXN0KClcbiAgfVxuXG4gIHN0YXRpYyB0YXNrRGVzY3JpcHRpb24gKHBhdGhzKSB7XG4gICAgcmV0dXJuIHBhdGhzLm1hcChwYXRoID0+IGAke1Jlb3BlblByb2plY3RNZW51TWFuYWdlci5iZXR0ZXJCYXNlTmFtZShwYXRoKX0gKCR7cGF0aH0pYCkuam9pbignICcpXG4gIH1cblxuICAvLyBXaW5kb3dzIHVzZXJzIGNhbiByaWdodC1jbGljayBBdG9tIHRhc2tiYXIgYW5kIHJlbW92ZSBwcm9qZWN0IGZyb20gdGhlIGp1bXAgbGlzdC5cbiAgLy8gV2UgaGF2ZSB0byBob25vciB0aGF0IG9yIHRoZSBncm91cCBzdG9wcyB3b3JraW5nLiBBcyB3ZSBvbmx5IGdldCBhIHBhcnRpYWwgbGlzdFxuICAvLyBlYWNoIHRpbWUgd2UgcmVtb3ZlIHRoZW0gZnJvbSBoaXN0b3J5IGVudGlyZWx5LlxuICBhc3luYyBhcHBseVdpbmRvd3NKdW1wTGlzdFJlbW92YWxzICgpIHtcbiAgICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSAhPT0gJ3dpbjMyJykgcmV0dXJuXG4gICAgaWYgKHRoaXMuYXBwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuYXBwID0gcmVxdWlyZSgncmVtb3RlJykuYXBwXG4gICAgfVxuXG4gICAgY29uc3QgcmVtb3ZlZCA9IHRoaXMuYXBwLmdldEp1bXBMaXN0U2V0dGluZ3MoKS5yZW1vdmVkSXRlbXMubWFwKGkgPT4gaS5kZXNjcmlwdGlvbilcbiAgICBpZiAocmVtb3ZlZC5sZW5ndGggPT09IDApIHJldHVyblxuICAgIGZvciAobGV0IHByb2plY3Qgb2YgdGhpcy5oaXN0b3J5TWFuYWdlci5nZXRQcm9qZWN0cygpKSB7XG4gICAgICBpZiAocmVtb3ZlZC5pbmNsdWRlcyhSZW9wZW5Qcm9qZWN0TWVudU1hbmFnZXIudGFza0Rlc2NyaXB0aW9uKHByb2plY3QucGF0aHMpKSkge1xuICAgICAgICBhd2FpdCB0aGlzLmhpc3RvcnlNYW5hZ2VyLnJlbW92ZVByb2plY3QocHJvamVjdC5wYXRocylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB1cGRhdGVXaW5kb3dzSnVtcExpc3QgKCkge1xuICAgIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSAnd2luMzInKSByZXR1cm5cbiAgICBpZiAodGhpcy5hcHAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5hcHAgPSByZXF1aXJlKCdyZW1vdGUnKS5hcHBcbiAgICB9XG5cbiAgICB0aGlzLmFwcC5zZXRKdW1wTGlzdChbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjdXN0b20nLFxuICAgICAgICBuYW1lOiAnUmVjZW50IFByb2plY3RzJyxcbiAgICAgICAgaXRlbXM6IHRoaXMucHJvamVjdHMubWFwKHByb2plY3QgPT5cbiAgICAgICAgICAoe1xuICAgICAgICAgICAgdHlwZTogJ3Rhc2snLFxuICAgICAgICAgICAgdGl0bGU6IHByb2plY3QucGF0aHMubWFwKFJlb3BlblByb2plY3RNZW51TWFuYWdlci5iZXR0ZXJCYXNlTmFtZSkuam9pbignLCAnKSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBSZW9wZW5Qcm9qZWN0TWVudU1hbmFnZXIudGFza0Rlc2NyaXB0aW9uKHByb2plY3QucGF0aHMpLFxuICAgICAgICAgICAgcHJvZ3JhbTogcHJvY2Vzcy5leGVjUGF0aCxcbiAgICAgICAgICAgIGFyZ3M6IHByb2plY3QucGF0aHMubWFwKHBhdGggPT4gYFwiJHtwYXRofVwiYCkuam9pbignICcpLFxuICAgICAgICAgICAgaWNvblBhdGg6IHBhdGguam9pbihwYXRoLmRpcm5hbWUocHJvY2Vzcy5leGVjUGF0aCksICdyZXNvdXJjZXMnLCAnY2xpJywgJ2ZvbGRlci5pY28nKSxcbiAgICAgICAgICAgIGljb25JbmRleDogMFxuICAgICAgICAgIH0pXG4gICAgICAgIClcbiAgICAgIH0sXG4gICAgICB7IHR5cGU6ICdyZWNlbnQnIH0sXG4gICAgICB7IGl0ZW1zOiBbXG4gICAgICAgICAge3R5cGU6ICd0YXNrJywgdGl0bGU6ICdOZXcgV2luZG93JywgcHJvZ3JhbTogcHJvY2Vzcy5leGVjUGF0aCwgYXJnczogJy0tbmV3LXdpbmRvdycsIGRlc2NyaXB0aW9uOiAnT3BlbnMgYSBuZXcgQXRvbSB3aW5kb3cnfVxuICAgICAgXX1cbiAgICBdKVxuICB9XG5cbiAgZGlzcG9zZSAoKSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmRpc3Bvc2UoKVxuICAgIHRoaXMuZGlzcG9zZVByb2plY3RNZW51KClcbiAgICBpZiAodGhpcy5yZW9wZW5Qcm9qZWN0TGlzdFZpZXcgIT0gbnVsbCkge1xuICAgICAgdGhpcy5yZW9wZW5Qcm9qZWN0TGlzdFZpZXcuZGlzcG9zZSgpXG4gICAgfVxuICB9XG5cbiAgZGlzcG9zZVByb2plY3RNZW51ICgpIHtcbiAgICBpZiAodGhpcy5sYXN0UHJvamVjdE1lbnUpIHtcbiAgICAgIHRoaXMubGFzdFByb2plY3RNZW51LmRpc3Bvc2UoKVxuICAgICAgdGhpcy5sYXN0UHJvamVjdE1lbnUgPSBudWxsXG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGNyZWF0ZVByb2plY3RzTWVudSAocHJvamVjdHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6ICdGaWxlJyxcbiAgICAgIHN1Ym1lbnU6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnUmVvcGVuIFByb2plY3QnLFxuICAgICAgICAgIHN1Ym1lbnU6IHByb2plY3RzLm1hcCgocHJvamVjdCwgaW5kZXgpID0+ICh7XG4gICAgICAgICAgICBsYWJlbDogdGhpcy5jcmVhdGVMYWJlbChwcm9qZWN0KSxcbiAgICAgICAgICAgIGNvbW1hbmQ6ICdhcHBsaWNhdGlvbjpyZW9wZW4tcHJvamVjdCcsXG4gICAgICAgICAgICBjb21tYW5kRGV0YWlsOiB7aW5kZXg6IGluZGV4fVxuICAgICAgICAgIH0pKVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGNyZWF0ZUxhYmVsIChwcm9qZWN0KSB7XG4gICAgcmV0dXJuIHByb2plY3QucGF0aHMubGVuZ3RoID09PSAxXG4gICAgICA/IHByb2plY3QucGF0aHNbMF1cbiAgICAgIDogcHJvamVjdC5wYXRocy5tYXAodGhpcy5iZXR0ZXJCYXNlTmFtZSkuam9pbignLCAnKVxuICB9XG5cbiAgc3RhdGljIGJldHRlckJhc2VOYW1lIChkaXJlY3RvcnkpIHtcbiAgICAvLyBIYW5kbGVzIFdpbmRvd3Mgcm9vdHMgYmV0dGVyIHRoYW4gcGF0aC5iYXNlbmFtZSB3aGljaCByZXR1cm5zICcnIGZvciAnZDonIGFuZCAnZDpcXCdcbiAgICBjb25zdCBtYXRjaCA9IGRpcmVjdG9yeS5tYXRjaCgvXihbYS16XTopW1xcXFxdPyQvaSlcbiAgICByZXR1cm4gbWF0Y2ggPyBtYXRjaFsxXSArICdcXFxcJyA6IHBhdGguYmFzZW5hbWUoZGlyZWN0b3J5KVxuICB9XG59XG4iXX0=