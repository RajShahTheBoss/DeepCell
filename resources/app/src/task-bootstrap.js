(function() {
  var handleEvents, handler, ref, setupDeprecations, setupGlobals, taskPath, userAgent,
    slice = [].slice;

  ref = process.env, userAgent = ref.userAgent, taskPath = ref.taskPath;

  handler = null;

  setupGlobals = function() {
    var console;
    global.attachEvent = function() {};
    console = {
      warn: function() {
        return emit.apply(null, ['task:warn'].concat(slice.call(arguments)));
      },
      log: function() {
        return emit.apply(null, ['task:log'].concat(slice.call(arguments)));
      },
      error: function() {
        return emit.apply(null, ['task:error'].concat(slice.call(arguments)));
      },
      trace: function() {}
    };
    global.__defineGetter__('console', function() {
      return console;
    });
    global.document = {
      createElement: function() {
        return {
          setAttribute: function() {},
          getElementsByTagName: function() {
            return [];
          },
          appendChild: function() {}
        };
      },
      documentElement: {
        insertBefore: function() {},
        removeChild: function() {}
      },
      getElementById: function() {
        return {};
      },
      createComment: function() {
        return {};
      },
      createDocumentFragment: function() {
        return {};
      }
    };
    global.emit = function() {
      var args, event;
      event = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      return process.send({
        event: event,
        args: args
      });
    };
    global.navigator = {
      userAgent: userAgent
    };
    return global.window = global;
  };

  handleEvents = function() {
    process.on('uncaughtException', function(error) {
      return console.error(error.message, error.stack);
    });
    return process.on('message', function(arg) {
      var args, async, event, isAsync, ref1, result;
      ref1 = arg != null ? arg : {}, event = ref1.event, args = ref1.args;
      if (event !== 'start') {
        return;
      }
      isAsync = false;
      async = function() {
        isAsync = true;
        return function(result) {
          return emit('task:completed', result);
        };
      };
      result = handler.bind({
        async: async
      }).apply(null, args);
      if (!isAsync) {
        return emit('task:completed', result);
      }
    });
  };

  setupDeprecations = function() {
    var Grim;
    Grim = require('grim');
    return Grim.on('updated', function() {
      var deprecations;
      deprecations = Grim.getDeprecations().map(function(deprecation) {
        return deprecation.serialize();
      });
      Grim.clearDeprecations();
      return emit('task:deprecations', deprecations);
    });
  };

  setupGlobals();

  handleEvents();

  setupDeprecations();

  handler = require(taskPath);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3Rhc2stYm9vdHN0cmFwLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsZ0ZBQUE7SUFBQTs7RUFBQSxNQUF3QixPQUFPLENBQUMsR0FBaEMsRUFBQyx5QkFBRCxFQUFZOztFQUNaLE9BQUEsR0FBVTs7RUFFVixZQUFBLEdBQWUsU0FBQTtBQUNiLFFBQUE7SUFBQSxNQUFNLENBQUMsV0FBUCxHQUFxQixTQUFBLEdBQUE7SUFDckIsT0FBQSxHQUNFO01BQUEsSUFBQSxFQUFNLFNBQUE7ZUFBRyxJQUFBLGFBQUssQ0FBQSxXQUFhLFNBQUEsV0FBQSxTQUFBLENBQUEsQ0FBbEI7TUFBSCxDQUFOO01BQ0EsR0FBQSxFQUFLLFNBQUE7ZUFBRyxJQUFBLGFBQUssQ0FBQSxVQUFZLFNBQUEsV0FBQSxTQUFBLENBQUEsQ0FBakI7TUFBSCxDQURMO01BRUEsS0FBQSxFQUFPLFNBQUE7ZUFBRyxJQUFBLGFBQUssQ0FBQSxZQUFjLFNBQUEsV0FBQSxTQUFBLENBQUEsQ0FBbkI7TUFBSCxDQUZQO01BR0EsS0FBQSxFQUFPLFNBQUEsR0FBQSxDQUhQOztJQUlGLE1BQU0sQ0FBQyxnQkFBUCxDQUF3QixTQUF4QixFQUFtQyxTQUFBO2FBQUc7SUFBSCxDQUFuQztJQUVBLE1BQU0sQ0FBQyxRQUFQLEdBQ0U7TUFBQSxhQUFBLEVBQWUsU0FBQTtlQUNiO1VBQUEsWUFBQSxFQUFjLFNBQUEsR0FBQSxDQUFkO1VBQ0Esb0JBQUEsRUFBc0IsU0FBQTttQkFBRztVQUFILENBRHRCO1VBRUEsV0FBQSxFQUFhLFNBQUEsR0FBQSxDQUZiOztNQURhLENBQWY7TUFJQSxlQUFBLEVBQ0U7UUFBQSxZQUFBLEVBQWMsU0FBQSxHQUFBLENBQWQ7UUFDQSxXQUFBLEVBQWEsU0FBQSxHQUFBLENBRGI7T0FMRjtNQU9BLGNBQUEsRUFBZ0IsU0FBQTtlQUFHO01BQUgsQ0FQaEI7TUFRQSxhQUFBLEVBQWUsU0FBQTtlQUFHO01BQUgsQ0FSZjtNQVNBLHNCQUFBLEVBQXdCLFNBQUE7ZUFBRztNQUFILENBVHhCOztJQVdGLE1BQU0sQ0FBQyxJQUFQLEdBQWMsU0FBQTtBQUNaLFVBQUE7TUFEYSxzQkFBTzthQUNwQixPQUFPLENBQUMsSUFBUixDQUFhO1FBQUMsT0FBQSxLQUFEO1FBQVEsTUFBQSxJQUFSO09BQWI7SUFEWTtJQUVkLE1BQU0sQ0FBQyxTQUFQLEdBQW1CO01BQUMsV0FBQSxTQUFEOztXQUNuQixNQUFNLENBQUMsTUFBUCxHQUFnQjtFQXhCSDs7RUEwQmYsWUFBQSxHQUFlLFNBQUE7SUFDYixPQUFPLENBQUMsRUFBUixDQUFXLG1CQUFYLEVBQWdDLFNBQUMsS0FBRDthQUM5QixPQUFPLENBQUMsS0FBUixDQUFjLEtBQUssQ0FBQyxPQUFwQixFQUE2QixLQUFLLENBQUMsS0FBbkM7SUFEOEIsQ0FBaEM7V0FFQSxPQUFPLENBQUMsRUFBUixDQUFXLFNBQVgsRUFBc0IsU0FBQyxHQUFEO0FBQ3BCLFVBQUE7MkJBRHFCLE1BQWMsSUFBYixvQkFBTztNQUM3QixJQUFjLEtBQUEsS0FBUyxPQUF2QjtBQUFBLGVBQUE7O01BRUEsT0FBQSxHQUFVO01BQ1YsS0FBQSxHQUFRLFNBQUE7UUFDTixPQUFBLEdBQVU7ZUFDVixTQUFDLE1BQUQ7aUJBQ0UsSUFBQSxDQUFLLGdCQUFMLEVBQXVCLE1BQXZCO1FBREY7TUFGTTtNQUlSLE1BQUEsR0FBUyxPQUFPLENBQUMsSUFBUixDQUFhO1FBQUMsT0FBQSxLQUFEO09BQWIsQ0FBQSxhQUFzQixJQUF0QjtNQUNULElBQUEsQ0FBc0MsT0FBdEM7ZUFBQSxJQUFBLENBQUssZ0JBQUwsRUFBdUIsTUFBdkIsRUFBQTs7SUFUb0IsQ0FBdEI7RUFIYTs7RUFjZixpQkFBQSxHQUFvQixTQUFBO0FBQ2xCLFFBQUE7SUFBQSxJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7V0FDUCxJQUFJLENBQUMsRUFBTCxDQUFRLFNBQVIsRUFBbUIsU0FBQTtBQUNqQixVQUFBO01BQUEsWUFBQSxHQUFlLElBQUksQ0FBQyxlQUFMLENBQUEsQ0FBc0IsQ0FBQyxHQUF2QixDQUEyQixTQUFDLFdBQUQ7ZUFBaUIsV0FBVyxDQUFDLFNBQVosQ0FBQTtNQUFqQixDQUEzQjtNQUNmLElBQUksQ0FBQyxpQkFBTCxDQUFBO2FBQ0EsSUFBQSxDQUFLLG1CQUFMLEVBQTBCLFlBQTFCO0lBSGlCLENBQW5CO0VBRmtCOztFQU9wQixZQUFBLENBQUE7O0VBQ0EsWUFBQSxDQUFBOztFQUNBLGlCQUFBLENBQUE7O0VBQ0EsT0FBQSxHQUFVLE9BQUEsQ0FBUSxRQUFSO0FBckRWIiwic291cmNlc0NvbnRlbnQiOlsie3VzZXJBZ2VudCwgdGFza1BhdGh9ID0gcHJvY2Vzcy5lbnZcbmhhbmRsZXIgPSBudWxsXG5cbnNldHVwR2xvYmFscyA9IC0+XG4gIGdsb2JhbC5hdHRhY2hFdmVudCA9IC0+XG4gIGNvbnNvbGUgPVxuICAgIHdhcm46IC0+IGVtaXQgJ3Rhc2s6d2FybicsIGFyZ3VtZW50cy4uLlxuICAgIGxvZzogLT4gZW1pdCAndGFzazpsb2cnLCBhcmd1bWVudHMuLi5cbiAgICBlcnJvcjogLT4gZW1pdCAndGFzazplcnJvcicsIGFyZ3VtZW50cy4uLlxuICAgIHRyYWNlOiAtPlxuICBnbG9iYWwuX19kZWZpbmVHZXR0ZXJfXyAnY29uc29sZScsIC0+IGNvbnNvbGVcblxuICBnbG9iYWwuZG9jdW1lbnQgPVxuICAgIGNyZWF0ZUVsZW1lbnQ6IC0+XG4gICAgICBzZXRBdHRyaWJ1dGU6IC0+XG4gICAgICBnZXRFbGVtZW50c0J5VGFnTmFtZTogLT4gW11cbiAgICAgIGFwcGVuZENoaWxkOiAtPlxuICAgIGRvY3VtZW50RWxlbWVudDpcbiAgICAgIGluc2VydEJlZm9yZTogLT5cbiAgICAgIHJlbW92ZUNoaWxkOiAtPlxuICAgIGdldEVsZW1lbnRCeUlkOiAtPiB7fVxuICAgIGNyZWF0ZUNvbW1lbnQ6IC0+IHt9XG4gICAgY3JlYXRlRG9jdW1lbnRGcmFnbWVudDogLT4ge31cblxuICBnbG9iYWwuZW1pdCA9IChldmVudCwgYXJncy4uLikgLT5cbiAgICBwcm9jZXNzLnNlbmQoe2V2ZW50LCBhcmdzfSlcbiAgZ2xvYmFsLm5hdmlnYXRvciA9IHt1c2VyQWdlbnR9XG4gIGdsb2JhbC53aW5kb3cgPSBnbG9iYWxcblxuaGFuZGxlRXZlbnRzID0gLT5cbiAgcHJvY2Vzcy5vbiAndW5jYXVnaHRFeGNlcHRpb24nLCAoZXJyb3IpIC0+XG4gICAgY29uc29sZS5lcnJvcihlcnJvci5tZXNzYWdlLCBlcnJvci5zdGFjaylcbiAgcHJvY2Vzcy5vbiAnbWVzc2FnZScsICh7ZXZlbnQsIGFyZ3N9PXt9KSAtPlxuICAgIHJldHVybiB1bmxlc3MgZXZlbnQgaXMgJ3N0YXJ0J1xuXG4gICAgaXNBc3luYyA9IGZhbHNlXG4gICAgYXN5bmMgPSAtPlxuICAgICAgaXNBc3luYyA9IHRydWVcbiAgICAgIChyZXN1bHQpIC0+XG4gICAgICAgIGVtaXQoJ3Rhc2s6Y29tcGxldGVkJywgcmVzdWx0KVxuICAgIHJlc3VsdCA9IGhhbmRsZXIuYmluZCh7YXN5bmN9KShhcmdzLi4uKVxuICAgIGVtaXQoJ3Rhc2s6Y29tcGxldGVkJywgcmVzdWx0KSB1bmxlc3MgaXNBc3luY1xuXG5zZXR1cERlcHJlY2F0aW9ucyA9IC0+XG4gIEdyaW0gPSByZXF1aXJlICdncmltJ1xuICBHcmltLm9uICd1cGRhdGVkJywgLT5cbiAgICBkZXByZWNhdGlvbnMgPSBHcmltLmdldERlcHJlY2F0aW9ucygpLm1hcCAoZGVwcmVjYXRpb24pIC0+IGRlcHJlY2F0aW9uLnNlcmlhbGl6ZSgpXG4gICAgR3JpbS5jbGVhckRlcHJlY2F0aW9ucygpXG4gICAgZW1pdCgndGFzazpkZXByZWNhdGlvbnMnLCBkZXByZWNhdGlvbnMpXG5cbnNldHVwR2xvYmFscygpXG5oYW5kbGVFdmVudHMoKVxuc2V0dXBEZXByZWNhdGlvbnMoKVxuaGFuZGxlciA9IHJlcXVpcmUodGFza1BhdGgpXG4iXX0=
