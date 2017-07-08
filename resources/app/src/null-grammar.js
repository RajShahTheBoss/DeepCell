Object.defineProperty(exports, '__esModule', {
  value: true
});
/** @babel */

var _eventKit = require('event-kit');

exports['default'] = {
  name: 'Null Grammar',
  scopeName: 'text.plain.null-grammar',
  scopeForId: function scopeForId(id) {
    if (id === -1 || id === -2) {
      return this.scopeName;
    } else {
      return null;
    }
  },
  startIdForScope: function startIdForScope(scopeName) {
    if (scopeName === this.scopeName) {
      return -1;
    } else {
      return null;
    }
  },
  endIdForScope: function endIdForScope(scopeName) {
    if (scopeName === this.scopeName) {
      return -2;
    } else {
      return null;
    }
  },
  tokenizeLine: function tokenizeLine(text) {
    return {
      tags: [this.startIdForScope(this.scopeName), text.length, this.endIdForScope(this.scopeName)],
      ruleStack: null
    };
  },
  onDidUpdate: function onDidUpdate(callback) {
    return new _eventKit.Disposable(noop);
  }
};

function noop() {}
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy9udWxsLWdyYW1tYXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7d0JBRXlCLFdBQVc7O3FCQUVyQjtBQUNiLE1BQUksRUFBRSxjQUFjO0FBQ3BCLFdBQVMsRUFBRSx5QkFBeUI7QUFDcEMsWUFBVSxFQUFDLG9CQUFDLEVBQUUsRUFBRTtBQUNkLFFBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRTtBQUMxQixhQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7S0FDdEIsTUFBTTtBQUNMLGFBQU8sSUFBSSxDQUFBO0tBQ1o7R0FDRjtBQUNELGlCQUFlLEVBQUMseUJBQUMsU0FBUyxFQUFFO0FBQzFCLFFBQUksU0FBUyxLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUU7QUFDaEMsYUFBTyxDQUFDLENBQUMsQ0FBQTtLQUNWLE1BQU07QUFDTCxhQUFPLElBQUksQ0FBQTtLQUNaO0dBQ0Y7QUFDRCxlQUFhLEVBQUMsdUJBQUMsU0FBUyxFQUFFO0FBQ3hCLFFBQUksU0FBUyxLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUU7QUFDaEMsYUFBTyxDQUFDLENBQUMsQ0FBQTtLQUNWLE1BQU07QUFDTCxhQUFPLElBQUksQ0FBQTtLQUNaO0dBQ0Y7QUFDRCxjQUFZLEVBQUMsc0JBQUMsSUFBSSxFQUFFO0FBQ2xCLFdBQU87QUFDTCxVQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzdGLGVBQVMsRUFBRSxJQUFJO0tBQ2hCLENBQUE7R0FDRjtBQUNELGFBQVcsRUFBQyxxQkFBQyxRQUFRLEVBQUU7QUFDckIsV0FBTyx5QkFBZSxJQUFJLENBQUMsQ0FBQTtHQUM1QjtDQUNGOztBQUVELFNBQVMsSUFBSSxHQUFJLEVBQUUiLCJmaWxlIjoiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL251bGwtZ3JhbW1hci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKiBAYmFiZWwgKi9cblxuaW1wb3J0IHtEaXNwb3NhYmxlfSBmcm9tICdldmVudC1raXQnXG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgbmFtZTogJ051bGwgR3JhbW1hcicsXG4gIHNjb3BlTmFtZTogJ3RleHQucGxhaW4ubnVsbC1ncmFtbWFyJyxcbiAgc2NvcGVGb3JJZCAoaWQpIHtcbiAgICBpZiAoaWQgPT09IC0xIHx8IGlkID09PSAtMikge1xuICAgICAgcmV0dXJuIHRoaXMuc2NvcGVOYW1lXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuICB9LFxuICBzdGFydElkRm9yU2NvcGUgKHNjb3BlTmFtZSkge1xuICAgIGlmIChzY29wZU5hbWUgPT09IHRoaXMuc2NvcGVOYW1lKSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG4gIH0sXG4gIGVuZElkRm9yU2NvcGUgKHNjb3BlTmFtZSkge1xuICAgIGlmIChzY29wZU5hbWUgPT09IHRoaXMuc2NvcGVOYW1lKSB7XG4gICAgICByZXR1cm4gLTJcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG4gIH0sXG4gIHRva2VuaXplTGluZSAodGV4dCkge1xuICAgIHJldHVybiB7XG4gICAgICB0YWdzOiBbdGhpcy5zdGFydElkRm9yU2NvcGUodGhpcy5zY29wZU5hbWUpLCB0ZXh0Lmxlbmd0aCwgdGhpcy5lbmRJZEZvclNjb3BlKHRoaXMuc2NvcGVOYW1lKV0sXG4gICAgICBydWxlU3RhY2s6IG51bGxcbiAgICB9XG4gIH0sXG4gIG9uRGlkVXBkYXRlIChjYWxsYmFjaykge1xuICAgIHJldHVybiBuZXcgRGlzcG9zYWJsZShub29wKVxuICB9XG59XG5cbmZ1bmN0aW9uIG5vb3AgKCkge31cbiJdfQ==