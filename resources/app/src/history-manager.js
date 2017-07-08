Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, 'next'); var callThrow = step.bind(null, 'throw'); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

/** @babel */

var _eventKit = require('event-kit');

// Extended: History manager for remembering which projects have been opened.
//
// An instance of this class is always available as the `atom.history` global.
//
// The project history is used to enable the 'Reopen Project' menu.

var HistoryManager = (function () {
  function HistoryManager(_ref) {
    var _this = this;

    var project = _ref.project;
    var commands = _ref.commands;
    var stateStore = _ref.stateStore;

    _classCallCheck(this, HistoryManager);

    this.stateStore = stateStore;
    this.emitter = new _eventKit.Emitter();
    this.projects = [];
    this.disposables = new _eventKit.CompositeDisposable();
    this.disposables.add(commands.add('atom-workspace', { 'application:clear-project-history': this.clearProjects.bind(this) }, false));
    this.disposables.add(project.onDidChangePaths(function (projectPaths) {
      return _this.addProject(projectPaths);
    }));
  }

  _createClass(HistoryManager, [{
    key: 'initialize',
    value: function initialize(localStorage) {
      this.localStorage = localStorage;
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.disposables.dispose();
    }

    // Public: Obtain a list of previously opened projects.
    //
    // Returns an {Array} of {HistoryProject} objects, most recent first.
  }, {
    key: 'getProjects',
    value: function getProjects() {
      return this.projects.map(function (p) {
        return new HistoryProject(p.paths, p.lastOpened);
      });
    }

    // Public: Clear all projects from the history.
    //
    // Note: This is not a privacy function - other traces will still exist,
    // e.g. window state.
    //
    // Return a {Promise} that resolves when the history has been successfully
    // cleared.
  }, {
    key: 'clearProjects',
    value: _asyncToGenerator(function* () {
      this.projects = [];
      yield this.saveState();
      this.didChangeProjects();
    })

    // Public: Invoke the given callback when the list of projects changes.
    //
    // * `callback` {Function}
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'onDidChangeProjects',
    value: function onDidChangeProjects(callback) {
      return this.emitter.on('did-change-projects', callback);
    }
  }, {
    key: 'didChangeProjects',
    value: function didChangeProjects(args) {
      this.emitter.emit('did-change-projects', args || { reloaded: false });
    }
  }, {
    key: 'addProject',
    value: _asyncToGenerator(function* (paths, lastOpened) {
      if (paths.length === 0) return;

      var project = this.getProject(paths);
      if (!project) {
        project = new HistoryProject(paths);
        this.projects.push(project);
      }
      project.lastOpened = lastOpened || new Date();
      this.projects.sort(function (a, b) {
        return b.lastOpened - a.lastOpened;
      });

      yield this.saveState();
      this.didChangeProjects();
    })
  }, {
    key: 'removeProject',
    value: _asyncToGenerator(function* (paths) {
      if (paths.length === 0) return;

      var project = this.getProject(paths);
      if (!project) return;

      var index = this.projects.indexOf(project);
      this.projects.splice(index, 1);

      yield this.saveState();
      this.didChangeProjects();
    })
  }, {
    key: 'getProject',
    value: function getProject(paths) {
      for (var i = 0; i < this.projects.length; i++) {
        if (arrayEquivalent(paths, this.projects[i].paths)) {
          return this.projects[i];
        }
      }

      return null;
    }
  }, {
    key: 'loadState',
    value: _asyncToGenerator(function* () {
      var history = yield this.stateStore.load('history-manager');
      if (!history) {
        history = JSON.parse(this.localStorage.getItem('history'));
      }

      if (history && history.projects) {
        this.projects = history.projects.filter(function (p) {
          return Array.isArray(p.paths) && p.paths.length > 0;
        }).map(function (p) {
          return new HistoryProject(p.paths, new Date(p.lastOpened));
        });
        this.didChangeProjects({ reloaded: true });
      } else {
        this.projects = [];
      }
    })
  }, {
    key: 'saveState',
    value: _asyncToGenerator(function* () {
      var projects = this.projects.map(function (p) {
        return { paths: p.paths, lastOpened: p.lastOpened };
      });
      yield this.stateStore.save('history-manager', { projects: projects });
    })
  }]);

  return HistoryManager;
})();

exports.HistoryManager = HistoryManager;

function arrayEquivalent(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

var HistoryProject = (function () {
  function HistoryProject(paths, lastOpened) {
    _classCallCheck(this, HistoryProject);

    this.paths = paths;
    this.lastOpened = lastOpened || new Date();
  }

  _createClass(HistoryProject, [{
    key: 'paths',
    set: function set(paths) {
      this._paths = paths;
    },
    get: function get() {
      return this._paths;
    }
  }, {
    key: 'lastOpened',
    set: function set(lastOpened) {
      this._lastOpened = lastOpened;
    },
    get: function get() {
      return this._lastOpened;
    }
  }]);

  return HistoryProject;
})();

exports.HistoryProject = HistoryProject;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9oaXN0b3J5LW1hbmFnZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O3dCQUUyQyxXQUFXOzs7Ozs7OztJQU96QyxjQUFjO0FBQ2IsV0FERCxjQUFjLENBQ1osSUFBK0IsRUFBRTs7O1FBQWhDLE9BQU8sR0FBUixJQUErQixDQUE5QixPQUFPO1FBQUUsUUFBUSxHQUFsQixJQUErQixDQUFyQixRQUFRO1FBQUUsVUFBVSxHQUE5QixJQUErQixDQUFYLFVBQVU7OzBCQURoQyxjQUFjOztBQUV2QixRQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtBQUM1QixRQUFJLENBQUMsT0FBTyxHQUFHLHVCQUFhLENBQUE7QUFDNUIsUUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFDbEIsUUFBSSxDQUFDLFdBQVcsR0FBRyxtQ0FBeUIsQ0FBQTtBQUM1QyxRQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLEVBQUMsbUNBQW1DLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO0FBQ2pJLFFBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFDLFlBQVk7YUFBSyxNQUFLLFVBQVUsQ0FBQyxZQUFZLENBQUM7S0FBQSxDQUFDLENBQUMsQ0FBQTtHQUNoRzs7ZUFSVSxjQUFjOztXQVVkLG9CQUFDLFlBQVksRUFBRTtBQUN4QixVQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQTtLQUNqQzs7O1dBRU8sbUJBQUc7QUFDVCxVQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO0tBQzNCOzs7Ozs7O1dBS1csdUJBQUc7QUFDYixhQUFPLElBQUksQ0FBQyxRQUFRLENBQUMs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Q0FBQyxFQUFFLEVBQUU7QUFDakMsUUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sS0FBSyxDQUFBO0dBQ2hDO0FBQ0QsU0FBTyxJQUFJLENBQUE7Q0FDWjs7SUFFWSxjQUFjO0FBQ2IsV0FERCxjQUFjLENBQ1osS0FBSyxFQUFFLFVBQVUsRUFBRTswQkFEckIsY0FBYzs7QUFFdkIsUUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7QUFDbEIsUUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLElBQUksSUFBSSxJQUFJLEVBQUUsQ0FBQTtHQUMzQzs7ZUFKVSxjQUFjOztTQU1mLGFBQUMsS0FBSyxFQUFFO0FBQUUsVUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7S0FBRTtTQUMvQixlQUFHO0FBQUUsYUFBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0tBQUU7OztTQUVwQixhQUFDLFVBQVUsRUFBRTtBQUFFLFVBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFBO0tBQUU7U0FDOUMsZUFBRztBQUFFLGFBQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtLQUFFOzs7U0FWbEMsY0FBYyIsImZpbGUiOiJmaWxlOi8vL0M6L3Byb2plY3RzL2F0b20vb3V0L2FwcC9zcmMvaGlzdG9yeS1tYW5hZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqIEBiYWJlbCAqL1xuXG5pbXBvcnQge0VtaXR0ZXIsIENvbXBvc2l0ZURpc3Bvc2FibGV9IGZyb20gJ2V2ZW50LWtpdCdcblxuLy8gRXh0ZW5kZWQ6IEhpc3RvcnkgbWFuYWdlciBmb3IgcmVtZW1iZXJpbmcgd2hpY2ggcHJvamVjdHMgaGF2ZSBiZWVuIG9wZW5lZC5cbi8vXG4vLyBBbiBpbnN0YW5jZSBvZiB0aGlzIGNsYXNzIGlzIGFsd2F5cyBhdmFpbGFibGUgYXMgdGhlIGBhdG9tLmhpc3RvcnlgIGdsb2JhbC5cbi8vXG4vLyBUaGUgcHJvamVjdCBoaXN0b3J5IGlzIHVzZWQgdG8gZW5hYmxlIHRoZSAnUmVvcGVuIFByb2plY3QnIG1lbnUuXG5leHBvcnQgY2xhc3MgSGlzdG9yeU1hbmFnZXIge1xuICBjb25zdHJ1Y3RvciAoe3Byb2plY3QsIGNvbW1hbmRzLCBzdGF0ZVN0b3JlfSkge1xuICAgIHRoaXMuc3RhdGVTdG9yZSA9IHN0YXRlU3RvcmVcbiAgICB0aGlzLmVtaXR0ZXIgPSBuZXcgRW1pdHRlcigpXG4gICAgdGhpcy5wcm9qZWN0cyA9IFtdXG4gICAgdGhpcy5kaXNwb3NhYmxlcyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKClcbiAgICB0aGlzLmRpc3Bvc2FibGVzLmFkZChjb21tYW5kcy5hZGQoJ2F0b20td29ya3NwYWNlJywgeydhcHBsaWNhdGlvbjpjbGVhci1wcm9qZWN0LWhpc3RvcnknOiB0aGlzLmNsZWFyUHJvamVjdHMuYmluZCh0aGlzKX0sIGZhbHNlKSlcbiAgICB0aGlzLmRpc3Bvc2FibGVzLmFkZChwcm9qZWN0Lm9uRGlkQ2hhbmdlUGF0aHMoKHByb2plY3RQYXRocykgPT4gdGhpcy5hZGRQcm9qZWN0KHByb2plY3RQYXRocykpKVxuICB9XG5cbiAgaW5pdGlhbGl6ZSAobG9jYWxTdG9yYWdlKSB7XG4gICAgdGhpcy5sb2NhbFN0b3JhZ2UgPSBsb2NhbFN0b3JhZ2VcbiAgfVxuXG4gIGRlc3Ryb3kgKCkge1xuICAgIHRoaXMuZGlzcG9zYWJsZXMuZGlzcG9zZSgpXG4gIH1cblxuICAvLyBQdWJsaWM6IE9idGFpbiBhIGxpc3Qgb2YgcHJldmlvdXNseSBvcGVuZWQgcHJvamVjdHMuXG4gIC8vXG4gIC8vIFJldHVybnMgYW4ge0FycmF5fSBvZiB7SGlzdG9yeVByb2plY3R9IG9iamVjdHMsIG1vc3QgcmVjZW50IGZpcnN0LlxuICBnZXRQcm9qZWN0cyAoKSB7XG4gICAgcmV0dXJuIHRoaXMucHJvamVjdHMubWFwKHAgPT4gbmV3IEhpc3RvcnlQcm9qZWN0KHAucGF0aHMsIHAubGFzdE9wZW5lZCkpXG4gIH1cblxuICAvLyBQdWJsaWM6IENsZWFyIGFsbCBwcm9qZWN0cyBmcm9tIHRoZSBoaXN0b3J5LlxuICAvL1xuICAvLyBOb3RlOiBUaGlzIGlzIG5vdCBhIHByaXZhY3kgZnVuY3Rpb24gLSBvdGhlciB0cmFjZXMgd2lsbCBzdGlsbCBleGlzdCxcbiAgLy8gZS5nLiB3aW5kb3cgc3RhdGUuXG4gIC8vXG4gIC8vIFJldHVybiBhIHtQcm9taXNlfSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIGhpc3RvcnkgaGFzIGJlZW4gc3VjY2Vzc2Z1bGx5XG4gIC8vIGNsZWFyZWQuXG4gIGFzeW5jIGNsZWFyUHJvamVjdHMgKCkge1xuICAgIHRoaXMucHJvamVjdHMgPSBbXVxuICAgIGF3YWl0IHRoaXMuc2F2ZVN0YXRlKClcbiAgICB0aGlzLmRpZENoYW5nZVByb2plY3RzKClcbiAgfVxuXG4gIC8vIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIHRoZSBsaXN0IG9mIHByb2plY3RzIGNoYW5nZXMuXG4gIC8vXG4gIC8vICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQ2hhbmdlUHJvamVjdHMgKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdHRlci5vbignZGlkLWNoYW5nZS1wcm9qZWN0cycsIGNhbGxiYWNrKVxuICB9XG5cbiAgZGlkQ2hhbmdlUHJvamVjdHMgKGFyZ3MpIHtcbiAgICB0aGlzLmVtaXR0ZXIuZW1pdCgnZGlkLWNoYW5nZS1wcm9qZWN0cycsIGFyZ3MgfHwgeyByZWxvYWRlZDogZmFsc2UgfSlcbiAgfVxuXG4gIGFzeW5jIGFkZFByb2plY3QgKHBhdGhzLCBsYXN0T3BlbmVkKSB7XG4gICAgaWYgKHBhdGhzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgICBsZXQgcHJvamVjdCA9IHRoaXMuZ2V0UHJvamVjdChwYXRocylcbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHByb2plY3QgPSBuZXcgSGlzdG9yeVByb2plY3QocGF0aHMpXG4gICAgICB0aGlzLnByb2plY3RzLnB1c2gocHJvamVjdClcbiAgICB9XG4gICAgcHJvamVjdC5sYXN0T3BlbmVkID0gbGFzdE9wZW5lZCB8fCBuZXcgRGF0ZSgpXG4gICAgdGhpcy5wcm9qZWN0cy5zb3J0KChhLCBiKSA9PiBiLmxhc3RPcGVuZWQgLSBhLmxhc3RPcGVuZWQpXG5cbiAgICBhd2FpdCB0aGlzLnNhdmVTdGF0ZSgpXG4gICAgdGhpcy5kaWRDaGFuZ2VQcm9qZWN0cygpXG4gIH1cblxuICBhc3luYyByZW1vdmVQcm9qZWN0IChwYXRocykge1xuICAgIGlmIChwYXRocy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gICAgbGV0IHByb2plY3QgPSB0aGlzLmdldFByb2plY3QocGF0aHMpXG4gICAgaWYgKCFwcm9qZWN0KSByZXR1cm5cblxuICAgIGxldCBpbmRleCA9IHRoaXMucHJvamVjdHMuaW5kZXhPZihwcm9qZWN0KVxuICAgIHRoaXMucHJvamVjdHMuc3BsaWNlKGluZGV4LCAxKVxuXG4gICAgYXdhaXQgdGhpcy5zYXZlU3RhdGUoKVxuICAgIHRoaXMuZGlkQ2hhbmdlUHJvamVjdHMoKVxuICB9XG5cbiAgZ2V0UHJvamVjdCAocGF0aHMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucHJvamVjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhcnJheUVxdWl2YWxlbnQocGF0aHMsIHRoaXMucHJvamVjdHNbaV0ucGF0aHMpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByb2plY3RzW2ldXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGxcbiAgfVxuXG4gIGFzeW5jIGxvYWRTdGF0ZSAoKSB7XG4gICAgbGV0IGhpc3RvcnkgPSBhd2FpdCB0aGlzLnN0YXRlU3RvcmUubG9hZCgnaGlzdG9yeS1tYW5hZ2VyJylcbiAgICBpZiAoIWhpc3RvcnkpIHtcbiAgICAgIGhpc3RvcnkgPSBKU09OLnBhcnNlKHRoaXMubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2hpc3RvcnknKSlcbiAgICB9XG5cbiAgICBpZiAoaGlzdG9yeSAmJiBoaXN0b3J5LnByb2plY3RzKSB7XG4gICAgICB0aGlzLnByb2plY3RzID0gaGlzdG9yeS5wcm9qZWN0cy5maWx0ZXIocCA9PiBBcnJheS5pc0FycmF5KHAucGF0aHMpICYmIHAucGF0aHMubGVuZ3RoID4gMCkubWFwKHAgPT4gbmV3IEhpc3RvcnlQcm9qZWN0KHAucGF0aHMsIG5ldyBEYXRlKHAubGFzdE9wZW5lZCkpKVxuICAgICAgdGhpcy5kaWRDaGFuZ2VQcm9qZWN0cyh7cmVsb2FkZWQ6IHRydWV9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnByb2plY3RzID0gW11cbiAgICB9XG4gIH1cblxuICBhc3luYyBzYXZlU3RhdGUgKCkge1xuICAgIGNvbnN0IHByb2plY3RzID0gdGhpcy5wcm9qZWN0cy5tYXAocCA9PiAoe3BhdGhzOiBwLnBhdGhzLCBsYXN0T3BlbmVkOiBwLmxhc3RPcGVuZWR9KSlcbiAgICBhd2FpdCB0aGlzLnN0YXRlU3RvcmUuc2F2ZSgnaGlzdG9yeS1tYW5hZ2VyJywge3Byb2plY3RzfSlcbiAgfVxufVxuXG5mdW5jdGlvbiBhcnJheUVxdWl2YWxlbnQgKGEsIGIpIHtcbiAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSByZXR1cm4gZmFsc2VcbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG5leHBvcnQgY2xhc3MgSGlzdG9yeVByb2plY3Qge1xuICBjb25zdHJ1Y3RvciAocGF0aHMsIGxhc3RPcGVuZWQpIHtcbiAgICB0aGlzLnBhdGhzID0gcGF0aHNcbiAgICB0aGlzLmxhc3RPcGVuZWQgPSBsYXN0T3BlbmVkIHx8IG5ldyBEYXRlKClcbiAgfVxuXG4gIHNldCBwYXRocyAocGF0aHMpIHsgdGhpcy5fcGF0aHMgPSBwYXRocyB9XG4gIGdldCBwYXRocyAoKSB7IHJldHVybiB0aGlzLl9wYXRocyB9XG5cbiAgc2V0IGxhc3RPcGVuZWQgKGxhc3RPcGVuZWQpIHsgdGhpcy5fbGFzdE9wZW5lZCA9IGxhc3RPcGVuZWQgfVxuICBnZXQgbGFzdE9wZW5lZCAoKSB7IHJldHVybiB0aGlzLl9sYXN0T3BlbmVkIH1cbn1cbiJdfQ==