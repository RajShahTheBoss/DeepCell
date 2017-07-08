(function() {
  var CommandRegistry, CompositeDisposable, Disposable, Emitter, InlineListener, SelectorBasedListener, SequenceCount, _, calculateSpecificity, ref, ref1, validateSelector,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ref = require('event-kit'), Emitter = ref.Emitter, Disposable = ref.Disposable, CompositeDisposable = ref.CompositeDisposable;

  ref1 = require('clear-cut'), calculateSpecificity = ref1.calculateSpecificity, validateSelector = ref1.validateSelector;

  _ = require('underscore-plus');

  SequenceCount = 0;

  module.exports = CommandRegistry = (function() {
    function CommandRegistry() {
      this.handleCommandEvent = bind(this.handleCommandEvent, this);
      this.rootNode = null;
      this.clear();
    }

    CommandRegistry.prototype.clear = function() {
      this.registeredCommands = {};
      this.selectorBasedListenersByCommandName = {};
      this.inlineListenersByCommandName = {};
      return this.emitter = new Emitter;
    };

    CommandRegistry.prototype.attach = function(rootNode) {
      var command, results;
      this.rootNode = rootNode;
      for (command in this.selectorBasedListenersByCommandName) {
        this.commandRegistered(command);
      }
      results = [];
      for (command in this.inlineListenersByCommandName) {
        results.push(this.commandRegistered(command));
      }
      return results;
    };

    CommandRegistry.prototype.destroy = function() {
      var commandName;
      for (commandName in this.registeredCommands) {
        this.rootNode.removeEventListener(commandName, this.handleCommandEvent, true);
      }
    };

    CommandRegistry.prototype.add = function(target, commandName, callback, throwOnInvalidSelector) {
      var commands, disposable;
      if (throwOnInvalidSelector == null) {
        throwOnInvalidSelector = true;
      }
      if (typeof commandName === 'object') {
        commands = commandName;
        throwOnInvalidSelector = callback;
        disposable = new CompositeDisposable;
        for (commandName in commands) {
          callback = commands[commandName];
          disposable.add(this.add(target, commandName, callback, throwOnInvalidSelector));
        }
        return disposable;
      }
      if (typeof callback !== 'function') {
        throw new Error("Can't register a command with non-function callback.");
      }
      if (typeof target === 'string') {
        if (throwOnInvalidSelector) {
          validateSelector(target);
        }
        return this.addSelectorBasedListener(target, commandName, callback);
      } else {
        return this.addInlineListener(target, commandName, callback);
      }
    };

    CommandRegistry.prototype.addSelectorBasedListener = function(selector, commandName, callback) {
      var base, listener, listenersForCommand;
      if ((base = this.selectorBasedListenersByCommandName)[commandName] == null) {
        base[commandName] = [];
      }
      listenersForCommand = this.selectorBasedListenersByCommandName[commandName];
      listener = new SelectorBasedListener(selector, callback);
      listenersForCommand.push(listener);
      this.commandRegistered(commandName);
      return new Disposable((function(_this) {
        return function() {
          listenersForCommand.splice(listenersForCommand.indexOf(listener), 1);
          if (listenersForCommand.length === 0) {
            return delete _this.selectorBasedListenersByCommandName[commandName];
          }
        };
      })(this));
    };

    CommandRegistry.prototype.addInlineListener = function(element, commandName, callback) {
      var base, listener, listenersForCommand, listenersForElement;
      if ((base = this.inlineListenersByCommandName)[commandName] == null) {
        base[commandName] = new WeakMap;
      }
      listenersForCommand = this.inlineListenersByCommandName[commandName];
      if (!(listenersForElement = listenersForCommand.get(element))) {
        listenersForElement = [];
        listenersForCommand.set(element, listenersForElement);
      }
      listener = new InlineListener(callback);
      listenersForElement.push(listener);
      this.commandRegistered(commandName);
      return new Disposable(function() {
        listenersForElement.splice(listenersForElement.indexOf(listener), 1);
        if (listenersForElement.length === 0) {
          return listenersForCommand["delete"](element);
        }
      });
    };

    CommandRegistry.prototype.findCommands = function(arg) {
      var commandName, commandNames, commands, currentTarget, i, len, listener, listeners, name, ref2, ref3, ref4, target;
      target = arg.target;
      commandNames = new Set;
      commands = [];
      currentTarget = target;
      while (true) {
        ref2 = this.inlineListenersByCommandName;
        for (name in ref2) {
          listeners = ref2[name];
          if (listeners.has(currentTarget) && !commandNames.has(name)) {
            commandNames.add(name);
            commands.push({
              name: name,
              displayName: _.humanizeEventName(name)
            });
          }
        }
        ref3 = this.selectorBasedListenersByCommandName;
        for (commandName in ref3) {
          listeners = ref3[commandName];
          for (i = 0, len = listeners.length; i < len; i++) {
            listener = listeners[i];
            if (typeof currentTarget.webkitMatchesSelector === "function" ? currentTarget.webkitMatchesSelector(listener.selector) : void 0) {
              if (!commandNames.has(commandName)) {
                commandNames.add(commandName);
                commands.push({
                  name: commandName,
                  displayName: _.humanizeEventName(commandName)
                });
              }
            }
          }
        }
        if (currentTarget === window) {
          break;
        }
        currentTarget = (ref4 = currentTarget.parentNode) != null ? ref4 : window;
      }
      return commands;
    };

    CommandRegistry.prototype.dispatch = function(target, commandName, detail) {
      var event;
      event = new CustomEvent(commandName, {
        bubbles: true,
        detail: detail
      });
      Object.defineProperty(event, 'target', {
        value: target
      });
      return this.handleCommandEvent(event);
    };

    CommandRegistry.prototype.onWillDispatch = function(callback) {
      return this.emitter.on('will-dispatch', callback);
    };

    CommandRegistry.prototype.onDidDispatch = function(callback) {
      return this.emitter.on('did-dispatch', callback);
    };

    CommandRegistry.prototype.getSnapshot = function() {
      var commandName, listeners, ref2, snapshot;
      snapshot = {};
      ref2 = this.selectorBasedListenersByCommandName;
      for (commandName in ref2) {
        listeners = ref2[commandName];
        snapshot[commandName] = listeners.slice();
      }
      return snapshot;
    };

    CommandRegistry.prototype.restoreSnapshot = function(snapshot) {
      var commandName, listeners;
      this.selectorBasedListenersByCommandName = {};
      for (commandName in snapshot) {
        listeners = snapshot[commandName];
        this.selectorBasedListenersByCommandName[commandName] = listeners.slice();
      }
    };

    CommandRegistry.prototype.handleCommandEvent = function(event) {
      var currentTarget, dispatchedEvent, i, immediatePropagationStopped, j, key, len, listener, listeners, matched, propagationStopped, ref2, ref3, ref4, ref5, ref6, selectorBasedListeners;
      propagationStopped = false;
      immediatePropagationStopped = false;
      matched = false;
      currentTarget = event.target;
      dispatchedEvent = new CustomEvent(event.type, {
        bubbles: true,
        detail: event.detail
      });
      Object.defineProperty(dispatchedEvent, 'eventPhase', {
        value: Event.BUBBLING_PHASE
      });
      Object.defineProperty(dispatchedEvent, 'currentTarget', {
        get: function() {
          return currentTarget;
        }
      });
      Object.defineProperty(dispatchedEvent, 'target', {
        value: currentTarget
      });
      Object.defineProperty(dispatchedEvent, 'preventDefault', {
        value: function() {
          return event.preventDefault();
        }
      });
      Object.defineProperty(dispatchedEvent, 'stopPropagation', {
        value: function() {
          event.stopPropagation();
          return propagationStopped = true;
        }
      });
      Object.defineProperty(dispatchedEvent, 'stopImmediatePropagation', {
        value: function() {
          event.stopImmediatePropagation();
          propagationStopped = true;
          return immediatePropagationStopped = true;
        }
      });
      Object.defineProperty(dispatchedEvent, 'abortKeyBinding', {
        value: function() {
          return typeof event.abortKeyBinding === "function" ? event.abortKeyBinding() : void 0;
        }
      });
      ref2 = Object.keys(event);
      for (i = 0, len = ref2.length; i < len; i++) {
        key = ref2[i];
        dispatchedEvent[key] = event[key];
      }
      this.emitter.emit('will-dispatch', dispatchedEvent);
      while (true) {
        listeners = (ref3 = (ref4 = this.inlineListenersByCommandName[event.type]) != null ? ref4.get(currentTarget) : void 0) != null ? ref3 : [];
        if (currentTarget.webkitMatchesSelector != null) {
          selectorBasedListeners = ((ref5 = this.selectorBasedListenersByCommandName[event.type]) != null ? ref5 : []).filter(function(listener) {
            return currentTarget.webkitMatchesSelector(listener.selector);
          }).sort(function(a, b) {
            return a.compare(b);
          });
          listeners = selectorBasedListeners.concat(listeners);
        }
        if (listeners.length > 0) {
          matched = true;
        }
        for (j = listeners.length - 1; j >= 0; j += -1) {
          listener = listeners[j];
          if (immediatePropagationStopped) {
            break;
          }
          listener.callback.call(currentTarget, dispatchedEvent);
        }
        if (currentTarget === window) {
          break;
        }
        if (propagationStopped) {
          break;
        }
        currentTarget = (ref6 = currentTarget.parentNode) != null ? ref6 : window;
      }
      this.emitter.emit('did-dispatch', dispatchedEvent);
      return matched;
    };

    CommandRegistry.prototype.commandRegistered = function(commandName) {
      if ((this.rootNode != null) && !this.registeredCommands[commandName]) {
        this.rootNode.addEventListener(commandName, this.handleCommandEvent, true);
        return this.registeredCommands[commandName] = true;
      }
    };

    return CommandRegistry;

  })();

  SelectorBasedListener = (function() {
    function SelectorBasedListener(selector1, callback1) {
      this.selector = selector1;
      this.callback = callback1;
      this.specificity = calculateSpecificity(this.selector);
      this.sequenceNumber = SequenceCount++;
    }

    SelectorBasedListener.prototype.compare = function(other) {
      return this.specificity - other.specificity || this.sequenceNumber - other.sequenceNumber;
    };

    return SelectorBasedListener;

  })();

  InlineListener = (function() {
    function InlineListener(callback1) {
      this.callback = callback1;
    }

    return InlineListener;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2NvbW1hbmQtcmVnaXN0cnkuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSxxS0FBQTtJQUFBOztFQUFBLE1BQTZDLE9BQUEsQ0FBUSxXQUFSLENBQTdDLEVBQUMscUJBQUQsRUFBVSwyQkFBVixFQUFzQjs7RUFDdEIsT0FBMkMsT0FBQSxDQUFRLFdBQVIsQ0FBM0MsRUFBQyxnREFBRCxFQUF1Qjs7RUFDdkIsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxpQkFBUjs7RUFFSixhQUFBLEdBQWdCOztFQXdDaEIsTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNTLHlCQUFBOztNQUNYLElBQUMsQ0FBQSxRQUFELEdBQVk7TUFDWixJQUFDLENBQUEsS0FBRCxDQUFBO0lBRlc7OzhCQUliLEtBQUEsR0FBTyxTQUFBO01BQ0wsSUFBQyxDQUFBLGtCQUFELEdBQXNCO01BQ3RCLElBQUMsQ0FBQSxtQ0FBRCxHQUF1QztNQUN2QyxJQUFDLENBQUEsNEJBQUQsR0FBZ0M7YUFDaEMsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQUFJO0lBSlY7OzhCQU1QLE1BQUEsR0FBUSxTQUFDLFFBQUQ7QUFDTixVQUFBO01BRE8sSUFBQyxDQUFBLFdBQUQ7QUFDUCxXQUFBLG1EQUFBO1FBQUEsSUFBQyxDQUFBLGlCQUFELENBQW1CLE9BQW5CO0FBQUE7QUFDQTtXQUFBLDRDQUFBO3FCQUFBLElBQUMsQ0FBQSxpQkFBRCxDQUFtQixPQUFuQjtBQUFBOztJQUZNOzs4QkFJUixPQUFBLEdBQVMsU0FBQTtBQUNQLFVBQUE7QUFBQSxXQUFBLHNDQUFBO1FBQ0UsSUFBQyxDQUFBLFFBQVEsQ0FBQyxtQkFBVixDQUE4QixXQUE5QixFQUEyQyxJQUFDLENBQUEsa0JBQTVDLEVBQWdFLElBQWhFO0FBREY7SUFETzs7OEJBaUNULEdBQUEsR0FBSyxTQUFDLE1BQUQsRUFB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ZW50IjpbIntFbWl0dGVyLCBEaXNwb3NhYmxlLCBDb21wb3NpdGVEaXNwb3NhYmxlfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcbntjYWxjdWxhdGVTcGVjaWZpY2l0eSwgdmFsaWRhdGVTZWxlY3Rvcn0gPSByZXF1aXJlICdjbGVhci1jdXQnXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZS1wbHVzJ1xuXG5TZXF1ZW5jZUNvdW50ID0gMFxuXG4jIFB1YmxpYzogQXNzb2NpYXRlcyBsaXN0ZW5lciBmdW5jdGlvbnMgd2l0aCBjb21tYW5kcyBpbiBhXG4jIGNvbnRleHQtc2Vuc2l0aXZlIHdheSB1c2luZyBDU1Mgc2VsZWN0b3JzLiBZb3UgY2FuIGFjY2VzcyBhIGdsb2JhbCBpbnN0YW5jZSBvZlxuIyB0aGlzIGNsYXNzIHZpYSBgYXRvbS5jb21tYW5kc2AsIGFuZCBjb21tYW5kcyByZWdpc3RlcmVkIHRoZXJlIHdpbGwgYmVcbiMgcHJlc2VudGVkIGluIHRoZSBjb21tYW5kIHBhbGV0dGUuXG4jXG4jIFRoZSBnbG9iYWwgY29tbWFuZCByZWdpc3RyeSBmYWNpbGl0YXRlcyBhIHN0eWxlIG9mIGV2ZW50IGhhbmRsaW5nIGtub3duIGFzXG4jICpldmVudCBkZWxlZ2F0aW9uKiB0aGF0IHdhcyBwb3B1bGFyaXplZCBieSBqUXVlcnkuIEF0b20gY29tbWFuZHMgYXJlIGV4cHJlc3NlZFxuIyBhcyBjdXN0b20gRE9NIGV2ZW50cyB0aGF0IGNhbiBiZSBpbnZva2VkIG9uIHRoZSBjdXJyZW50bHkgZm9jdXNlZCBlbGVtZW50IHZpYVxuIyBhIGtleSBiaW5kaW5nIG9yIG1hbnVhbGx5IHZpYSB0aGUgY29tbWFuZCBwYWxldHRlLiBSYXRoZXIgdGhhbiBiaW5kaW5nXG4jIGxpc3RlbmVycyBmb3IgY29tbWFuZCBldmVudHMgZGlyZWN0bHkgdG8gRE9NIG5vZGVzLCB5b3UgaW5zdGVhZCByZWdpc3RlclxuIyBjb21tYW5kIGV2ZW50IGxpc3RlbmVycyBnbG9iYWxseSBvbiBgYXRvbS5jb21tYW5kc2AgYW5kIGNvbnN0cmFpbiB0aGVtIHRvXG4jIHNwZWNpZmljIGtpbmRzIG9mIGVsZW1lbnRzIHdpdGggQ1NTIHNlbGVjdG9ycy5cbiNcbiMgQ29tbWFuZCBuYW1lcyBtdXN0IGZvbGxvdyB0aGUgYG5hbWVzcGFjZTphY3Rpb25gIHBhdHRlcm4sIHdoZXJlIGBuYW1lc3BhY2VgXG4jIHdpbGwgdHlwaWNhbGx5IGJlIHRoZSBuYW1lIG9mIHlvdXIgcGFja2FnZSwgYW5kIGBhY3Rpb25gIGRlc2NyaWJlcyB0aGVcbiMgYmVoYXZpb3Igb2YgeW91ciBjb21tYW5kLiBJZiBlaXRoZXIgcGFydCBjb25zaXN0cyBvZiBtdWx0aXBsZSB3b3JkcywgdGhlc2VcbiMgbXVzdCBiZSBzZXBhcmF0ZWQgYnkgaHlwaGVucy4gRS5nLiBgYXdlc29tZS1wYWNrYWdlOnR1cm4taXQtdXAtdG8tZWxldmVuYC5cbiMgQWxsIHdvcmRzIHNob3VsZCBiZSBsb3dlcmNhc2VkLlxuI1xuIyBBcyB0aGUgZXZlbnQgYnViYmxlcyB1cHdhcmQgdGhyb3VnaCB0aGUgRE9NLCBhbGwgcmVnaXN0ZXJlZCBldmVudCBsaXN0ZW5lcnNcbiMgd2l0aCBtYXRjaGluZyBzZWxlY3RvcnMgYXJlIGludm9rZWQgaW4gb3JkZXIgb2Ygc3BlY2lmaWNpdHkuIEluIHRoZSBldmVudCBvZiBhXG4jIHNwZWNpZmljaXR5IHRpZSwgdGhlIG1vc3QgcmVjZW50bHkgcmVnaXN0ZXJlZCBsaXN0ZW5lciBpcyBpbnZva2VkIGZpcnN0LiBUaGlzXG4jIG1pcnJvcnMgdGhlIFwiY2FzY2FkZVwiIHNlbWFudGljcyBvZiBDU1MuIEV2ZW50IGxpc3RlbmVycyBhcmUgaW52b2tlZCBpbiB0aGVcbiMgY29udGV4dCBvZiB0aGUgY3VycmVudCBET00gbm9kZSwgbWVhbmluZyBgdGhpc2AgYWx3YXlzIHBvaW50cyBhdFxuIyBgZXZlbnQuY3VycmVudFRhcmdldGAuIEFzIGlzIG5vcm1hbGx5IHRoZSBjYXNlIHdpdGggRE9NIGV2ZW50cyxcbiMgYHN0b3BQcm9wYWdhdGlvbmAgYW5kIGBzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb25gIGNhbiBiZSB1c2VkIHRvIHRlcm1pbmF0ZSB0aGVcbiMgYnViYmxpbmcgcHJvY2VzcyBhbmQgcHJldmVudCBpbnZvY2F0aW9uIG9mIGFkZGl0aW9uYWwgbGlzdGVuZXJzLlxuI1xuIyAjIyBFeGFtcGxlXG4jXG4jIEhlcmUgaXMgYSBjb21tYW5kIHRoYXQgaW5zZXJ0cyB0aGUgY3VycmVudCBkYXRlIGluIGFuIGVkaXRvcjpcbiNcbiMgYGBgY29mZmVlXG4jIGF0b20uY29tbWFuZHMuYWRkICdhdG9tLXRleHQtZWRpdG9yJyxcbiMgICAndXNlcjppbnNlcnQtZGF0ZSc6IChldmVudCkgLT5cbiMgICAgIGVkaXRvciA9IEBnZXRNb2RlbCgpXG4jICAgICBlZGl0b3IuaW5zZXJ0VGV4dChuZXcgRGF0ZSgpLnRvTG9jYWxlU3RyaW5nKCkpXG4jIGBgYFxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgQ29tbWFuZFJlZ2lzdHJ5XG4gIGNvbnN0cnVjdG9yOiAtPlxuICAgIEByb290Tm9kZSA9IG51bGxcbiAgICBAY2xlYXIoKVxuXG4gIGNsZWFyOiAtPlxuICAgIEByZWdpc3RlcmVkQ29tbWFuZHMgPSB7fVxuICAgIEBzZWxlY3RvckJhc2VkTGlzdGVuZXJzQnlDb21tYW5kTmFtZSA9IHt9XG4gICAgQGlubGluZUxpc3RlbmVyc0J5Q29tbWFuZE5hbWUgPSB7fVxuICAgIEBlbWl0dGVyID0gbmV3IEVtaXR0ZXJcblxuICBhdHRhY2g6IChAcm9vdE5vZGUpIC0+XG4gICAgQGNvbW1hbmRSZWdpc3RlcmVkKGNvbW1hbmQpIGZvciBjb21tYW5kIG9mIEBzZWxlY3RvckJhc2VkTGlzdGVuZXJzQnlDb21tYW5kTmFtZVxuICAgIEBjb21tYW5kUmVnaXN0ZXJlZChjb21tYW5kKSBmb3IgY29tbWFuZCBvZiBAaW5saW5lTGlzdGVuZXJzQnlDb21tYW5kTmFtZVxuXG4gIGRlc3Ryb3k6IC0+XG4gICAgZm9yIGNvbW1hbmROYW1lIG9mIEByZWdpc3RlcmVkQ29tbWFuZHNcbiAgICAgIEByb290Tm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGNvbW1hbmROYW1lLCBAaGFuZGxlQ29tbWFuZEV2ZW50LCB0cnVlKVxuICAgIHJldHVyblxuXG4gICMgUHVibGljOiBBZGQgb25lIG9yIG1vcmUgY29tbWFuZCBsaXN0ZW5lcnMgYXNzb2NpYXRlZCB3aXRoIGEgc2VsZWN0b3IuXG4gICNcbiAgIyAjIyBBcmd1bWVudHM6IFJlZ2lzdGVyaW5nIE9uZSBDb21tYW5kXG4gICNcbiAgIyAqIGB0YXJnZXRgIEEge1N0cmluZ30gY29udGFpbmluZyBhIENTUyBzZWxlY3RvciBvciBhIERPTSBlbGVtZW50LiBJZiB5b3VcbiAgIyAgIHBhc3MgYSBzZWxlY3RvciwgdGhlIGNvbW1hbmQgd2lsbCBiZSBnbG9iYWxseSBhc3NvY2lhdGVkIHdpdGggYWxsIG1hdGNoaW5nXG4gICMgICBlbGVtZW50cy4gVGhlIGAsYCBjb21iaW5hdG9yIGlzIG5vdCBjdXJyZW50bHkgc3VwcG9ydGVkLiBJZiB5b3UgcGFzcyBhXG4gICMgICBET00gZWxlbWVudCwgdGhlIGNvbW1hbmQgd2lsbCBiZSBhc3NvY2lhdGVkIHdpdGgganVzdCB0aGF0IGVsZW1lbnQuXG4gICMgKiBgY29tbWFuZE5hbWVgIEEge1N0cmluZ30gY29udGFpbmluZyB0aGUgbmFtZSBvZiBhIGNvbW1hbmQgeW91IHdhbnQgdG9cbiAgIyAgIGhhbmRsZSBzdWNoIGFzIGB1c2VyOmluc2VydC1kYXRlYC5cbiAgIyAqIGBjYWxsYmFja2AgQSB7RnVuY3Rpb259IHRvIGNhbGwgd2hlbiB0aGUgZ2l2ZW4gY29tbWFuZCBpcyBpbnZva2VkIG9uIGFuXG4gICMgICBlbGVtZW50IG1hdGNoaW5nIHRoZSBzZWxlY3Rvci4gSXQgd2lsbCBiZSBjYWxsZWQgd2l0aCBgdGhpc2AgcmVmZXJlbmNpbmdcbiAgIyAgIHRoZSBtYXRjaGluZyBET00gbm9kZS5cbiAgIyAgICogYGV2ZW50YCBBIHN0YW5kYXJkIERPTSBldmVudCBpbnN0YW5jZS4gQ2FsbCBgc3RvcFByb3BhZ2F0aW9uYCBvclxuICAjICAgICBgc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uYCB0byB0ZXJtaW5hdGUgYnViYmxpbmcgZWFybHkuXG4gICNcbiAgIyAjIyBBcmd1bWVudHM6IFJlZ2lzdGVyaW5nIE11bHRpcGxlIENvbW1hbmRzXG4gICNcbiAgIyAqIGB0YXJnZXRgIEEge1N0cmluZ30gY29udGFpbmluZyBhIENTUyBzZWxlY3RvciBvciBhIERPTSBlbGVtZW50LiBJZiB5b3VcbiAgIyAgIHBhc3MgYSBzZWxlY3RvciwgdGhlIGNvbW1hbmRzIHdpbGwgYmUgZ2xvYmFsbHkgYXNzb2NpYXRlZCB3aXRoIGFsbFxuICAjICAgbWF0Y2hpbmcgZWxlbWVudHMuIFRoZSBgLGAgY29tYmluYXRvciBpcyBub3QgY3VycmVudGx5IHN1cHBvcnRlZC5cbiAgIyAgIElmIHlvdSBwYXNzIGEgRE9NIGVsZW1lbnQsIHRoZSBjb21tYW5kIHdpbGwgYmUgYXNzb2NpYXRlZCB3aXRoIGp1c3QgdGhhdFxuICAjICAgZWxlbWVudC5cbiAgIyAqIGBjb21tYW5kc2AgQW4ge09iamVjdH0gbWFwcGluZyBjb21tYW5kIG5hbWVzIGxpa2UgYHVzZXI6aW5zZXJ0LWRhdGVgIHRvXG4gICMgICBsaXN0ZW5lciB7RnVuY3Rpb259cy5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gcmVtb3ZlIHRoZVxuICAjIGFkZGVkIGNvbW1hbmQgaGFuZGxlcihzKS5cbiAgYWRkOiAodGFyZ2V0LCBjb21tYW5kTmFtZSwgY2FsbGJhY2ssIHRocm93T25JbnZhbGlkU2VsZWN0b3IgPSB0cnVlKSAtPlxuICAgIGlmIHR5cGVvZiBjb21tYW5kTmFtZSBpcyAnb2JqZWN0J1xuICAgICAgY29tbWFuZHMgPSBjb21tYW5kTmFtZVxuICAgICAgdGhyb3dPbkludmFsaWRTZWxlY3RvciA9IGNhbGxiYWNrXG4gICAgICBkaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgICAgIGZvciBjb21tYW5kTmFtZSwgY2FsbGJhY2sgb2YgY29tbWFuZHNcbiAgICAgICAgZGlzcG9zYWJsZS5hZGQgQGFkZCh0YXJnZXQsIGNvbW1hbmROYW1lLCBjYWxsYmFjaywgdGhyb3dPbkludmFsaWRTZWxlY3RvcilcbiAgICAgIHJldHVybiBkaXNwb3NhYmxlXG5cbiAgICBpZiB0eXBlb2YgY2FsbGJhY2sgaXNudCAnZnVuY3Rpb24nXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCByZWdpc3RlciBhIGNvbW1hbmQgd2l0aCBub24tZnVuY3Rpb24gY2FsbGJhY2suXCIpXG5cbiAgICBpZiB0eXBlb2YgdGFyZ2V0IGlzICdzdHJpbmcnXG4gICAgICB2YWxpZGF0ZVNlbGVjdG9yKHRhcmdldCkgaWYgdGhyb3dPbkludmFsaWRTZWxlY3RvclxuICAgICAgQGFkZFNlbGVjdG9yQmFzZWRMaXN0ZW5lcih0YXJnZXQsIGNvbW1hbmROYW1lLCBjYWxsYmFjaylcbiAgICBlbHNlXG4gICAgICBAYWRkSW5saW5lTGlzdGVuZXIodGFyZ2V0LCBjb21tYW5kTmFtZSwgY2FsbGJhY2spXG5cbiAgYWRkU2VsZWN0b3JCYXNlZExpc3RlbmVyOiAoc2VsZWN0b3IsIGNvbW1hbmROYW1lLCBjYWxsYmFjaykgLT5cbiAgICBAc2VsZWN0b3JCYXNlZExpc3RlbmVyc0J5Q29tbWFuZE5hbWVbY29tbWFuZE5hbWVdID89IFtdXG4gICAgbGlzdGVuZXJzRm9yQ29tbWFuZCA9IEBzZWxlY3RvckJhc2VkTGlzdGVuZXJzQnlDb21tYW5kTmFtZVtjb21tYW5kTmFtZV1cbiAgICBsaXN0ZW5lciA9IG5ldyBTZWxlY3RvckJhc2VkTGlzdGVuZXIoc2VsZWN0b3IsIGNhbGxiYWNrKVxuICAgIGxpc3RlbmVyc0ZvckNvbW1hbmQucHVzaChsaXN0ZW5lcilcblxuICAgIEBjb21tYW5kUmVnaXN0ZXJlZChjb21tYW5kTmFtZSlcblxuICAgIG5ldyBEaXNwb3NhYmxlID0+XG4gICAgICBsaXN0ZW5lcnNGb3JDb21tYW5kLnNwbGljZShsaXN0ZW5lcnNGb3JDb21tYW5kLmluZGV4T2YobGlzdGVuZXIpLCAxKVxuICAgICAgZGVsZXRlIEBzZWxlY3RvckJhc2VkTGlzdGVuZXJzQnlDb21tYW5kTmFtZVtjb21tYW5kTmFtZV0gaWYgbGlzdGVuZXJzRm9yQ29tbWFuZC5sZW5ndGggaXMgMFxuXG4gIGFkZElubGluZUxpc3RlbmVyOiAoZWxlbWVudCwgY29tbWFuZE5hbWUsIGNhbGxiYWNrKSAtPlxuICAgIEBpbmxpbmVMaXN0ZW5lcnNCeUNvbW1hbmROYW1lW2NvbW1hbmROYW1lXSA/PSBuZXcgV2Vha01hcFxuXG4gICAgbGlzdGVuZXJzRm9yQ29tbWFuZCA9IEBpbmxpbmVMaXN0ZW5lcnNCeUNvbW1hbmROYW1lW2NvbW1hbmROYW1lXVxuICAgIHVubGVzcyBsaXN0ZW5lcnNGb3JFbGVtZW50ID0gbGlzdGVuZXJzRm9yQ29tbWFuZC5nZXQoZWxlbWVudClcbiAgICAgIGxpc3RlbmVyc0ZvckVsZW1lbnQgPSBbXVxuICAgICAgbGlzdGVuZXJzRm9yQ29tbWFuZC5zZXQoZWxlbWVudCwgbGlzdGVuZXJzRm9yRWxlbWVudClcbiAgICBsaXN0ZW5lciA9IG5ldyBJbmxpbmVMaXN0ZW5lcihjYWxsYmFjaylcbiAgICBsaXN0ZW5lcnNGb3JFbGVtZW50LnB1c2gobGlzdGVuZXIpXG5cbiAgICBAY29tbWFuZFJlZ2lzdGVyZWQoY29tbWFuZE5hbWUpXG5cbiAgICBuZXcgRGlzcG9zYWJsZSAtPlxuICAgICAgbGlzdGVuZXJzRm9yRWxlbWVudC5zcGxpY2UobGlzdGVuZXJzRm9yRWxlbWVudC5pbmRleE9mKGxpc3RlbmVyKSwgMSlcbiAgICAgIGxpc3RlbmVyc0ZvckNvbW1hbmQuZGVsZXRlKGVsZW1lbnQpIGlmIGxpc3RlbmVyc0ZvckVsZW1lbnQubGVuZ3RoIGlzIDBcblxuICAjIFB1YmxpYzogRmluZCBhbGwgcmVnaXN0ZXJlZCBjb21tYW5kcyBtYXRjaGluZyBhIHF1ZXJ5LlxuICAjXG4gICMgKiBgcGFyYW1zYCBBbiB7T2JqZWN0fSBjb250YWluaW5nIG9uZSBvciBtb3JlIG9mIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYHRhcmdldGAgQSBET00gbm9kZSB0aGF0IGlzIHRoZSBoeXBvdGhldGljYWwgdGFyZ2V0IG9mIGEgZ2l2ZW4gY29tbWFuZC5cbiAgI1xuICAjIFJldHVybnMgYW4ge0FycmF5fSBvZiB7T2JqZWN0fXMgY29udGFpbmluZyB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICogYG5hbWVgIFRoZSBuYW1lIG9mIHRoZSBjb21tYW5kLiBGb3IgZXhhbXBsZSwgYHVzZXI6aW5zZXJ0LWRhdGVgLlxuICAjICAqIGBkaXNwbGF5TmFtZWAgVGhlIGRpc3BsYXkgbmFtZSBvZiB0aGUgY29tbWFuZC4gRm9yIGV4YW1wbGUsXG4gICMgICAgYFVzZXI6IEluc2VydCBEYXRlYC5cbiAgZmluZENvbW1hbmRzOiAoe3RhcmdldH0pIC0+XG4gICAgY29tbWFuZE5hbWVzID0gbmV3IFNldFxuICAgIGNvbW1hbmRzID0gW11cbiAgICBjdXJyZW50VGFyZ2V0ID0gdGFyZ2V0XG4gICAgbG9vcFxuICAgICAgZm9yIG5hbWUsIGxpc3RlbmVycyBvZiBAaW5saW5lTGlzdGVuZXJzQnlDb21tYW5kTmFtZVxuICAgICAgICBpZiBsaXN0ZW5lcnMuaGFzKGN1cnJlbnRUYXJnZXQpIGFuZCBub3QgY29tbWFuZE5hbWVzLmhhcyhuYW1lKVxuICAgICAgICAgIGNvbW1hbmROYW1lcy5hZGQobmFtZSlcbiAgICAgICAgICBjb21tYW5kcy5wdXNoKHtuYW1lLCBkaXNwbGF5TmFtZTogXy5odW1hbml6ZUV2ZW50TmFtZShuYW1lKX0pXG5cbiAgICAgIGZvciBjb21tYW5kTmFtZSwgbGlzdGVuZXJzIG9mIEBzZWxlY3RvckJhc2VkTGlzdGVuZXJzQnlDb21tYW5kTmFtZVxuICAgICAgICBmb3IgbGlzdGVuZXIgaW4gbGlzdGVuZXJzXG4gICAgICAgICAgaWYgY3VycmVudFRhcmdldC53ZWJraXRNYXRjaGVzU2VsZWN0b3I/KGxpc3RlbmVyLnNlbGVjdG9yKVxuICAgICAgICAgICAgdW5sZXNzIGNvbW1hbmROYW1lcy5oYXMoY29tbWFuZE5hbWUpXG4gICAgICAgICAgICAgIGNvbW1hbmROYW1lcy5hZGQoY29tbWFuZE5hbWUpXG4gICAgICAgICAgICAgIGNvbW1hbmRzLnB1c2hcbiAgICAgICAgICAgICAgICBuYW1lOiBjb21tYW5kTmFtZVxuICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiBfLmh1bWFuaXplRXZlbnROYW1lKGNvbW1hbmROYW1lKVxuXG4gICAgICBicmVhayBpZiBjdXJyZW50VGFyZ2V0IGlzIHdpbmRvd1xuICAgICAgY3VycmVudFRhcmdldCA9IGN1cnJlbnRUYXJnZXQucGFyZW50Tm9kZSA/IHdpbmRvd1xuXG4gICAgY29tbWFuZHNcblxuICAjIFB1YmxpYzogU2ltdWxhdGUgdGhlIGRpc3BhdGNoIG9mIGEgY29tbWFuZCBvbiBhIERPTSBub2RlLlxuICAjXG4gICMgVGhpcyBjYW4gYmUgdXNlZnVsIGZvciB0ZXN0aW5nIHdoZW4geW91IHdhbnQgdG8gc2ltdWxhdGUgdGhlIGludm9jYXRpb24gb2YgYVxuICAjIGNvbW1hbmQgb24gYSBkZXRhY2hlZCBET00gbm9kZS4gT3RoZXJ3aXNlLCB0aGUgRE9NIG5vZGUgaW4gcXVlc3Rpb24gbmVlZHMgdG9cbiAgIyBiZSBhdHRhY2hlZCB0byB0aGUgZG9jdW1lbnQgc28gdGhlIGV2ZW50IGJ1YmJsZXMgdXAgdG8gdGhlIHJvb3Qgbm9kZSB0byBiZVxuICAjIHByb2Nlc3NlZC5cbiAgI1xuICAjICogYHRhcmdldGAgVGhlIERPTSBub2RlIGF0IHdoaWNoIHRvIHN0YXJ0IGJ1YmJsaW5nIHRoZSBjb21tYW5kIGV2ZW50LlxuICAjICogYGNvbW1hbmROYW1lYCB7U3RyaW5nfSBpbmRpY2F0aW5nIHRoZSBuYW1lIG9mIHRoZSBjb21tYW5kIHRvIGRpc3BhdGNoLlxuICBkaXNwYXRjaDogKHRhcmdldCwgY29tbWFuZE5hbWUsIGRldGFpbCkgLT5cbiAgICBldmVudCA9IG5ldyBDdXN0b21FdmVudChjb21tYW5kTmFtZSwge2J1YmJsZXM6IHRydWUsIGRldGFpbH0pXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV2ZW50LCAndGFyZ2V0JywgdmFsdWU6IHRhcmdldClcbiAgICBAaGFuZGxlQ29tbWFuZEV2ZW50KGV2ZW50KVxuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIGJlZm9yZSBkaXNwYXRjaGluZyBhIGNvbW1hbmQgZXZlbnQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgYmVmb3JlIGRpc3BhdGNoaW5nIGVhY2ggY29tbWFuZFxuICAjICAgKiBgZXZlbnRgIFRoZSBFdmVudCB0aGF0IHdpbGwgYmUgZGlzcGF0Y2hlZFxuICBvbldpbGxEaXNwYXRjaDogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICd3aWxsLWRpc3BhdGNoJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayBhZnRlciBkaXNwYXRjaGluZyBhIGNvbW1hbmQgZXZlbnQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgYWZ0ZXIgZGlzcGF0Y2hpbmcgZWFjaCBjb21tYW5kXG4gICMgICAqIGBldmVudGAgVGhlIEV2ZW50IHRoYXQgd2FzIGRpc3BhdGNoZWRcbiAgb25EaWREaXNwYXRjaDogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtZGlzcGF0Y2gnLCBjYWxsYmFja1xuXG4gIGdldFNuYXBzaG90OiAtPlxuICAgIHNuYXBzaG90ID0ge31cbiAgICBmb3IgY29tbWFuZE5hbWUsIGxpc3RlbmVycyBvZiBAc2VsZWN0b3JCYXNlZExpc3RlbmVyc0J5Q29tbWFuZE5hbWVcbiAgICAgIHNuYXBzaG90W2NvbW1hbmROYW1lXSA9IGxpc3RlbmVycy5zbGljZSgpXG4gICAgc25hcHNob3RcblxuICByZXN0b3JlU25hcHNob3Q6IChzbmFwc2hvdCkgLT5cbiAgICBAc2VsZWN0b3JCYXNlZExpc3RlbmVyc0J5Q29tbWFuZE5hbWUgPSB7fVxuICAgIGZvciBjb21tYW5kTmFtZSwgbGlzdGVuZXJzIG9mIHNuYXBzaG90XG4gICAgICBAc2VsZWN0b3JCYXNlZExpc3RlbmVyc0J5Q29tbWFuZE5hbWVbY29tbWFuZE5hbWVdID0gbGlzdGVuZXJzLnNsaWNlKClcbiAgICByZXR1cm5cblxuICBoYW5kbGVDb21tYW5kRXZlbnQ6IChldmVudCkgPT5cbiAgICBwcm9wYWdhdGlvblN0b3BwZWQgPSBmYWxzZVxuICAgIGltbWVkaWF0ZVByb3BhZ2F0aW9uU3RvcHBlZCA9IGZhbHNlXG4gICAgbWF0Y2hlZCA9IGZhbHNlXG4gICAgY3VycmVudFRhcmdldCA9IGV2ZW50LnRhcmdldFxuXG4gICAgZGlzcGF0Y2hlZEV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KGV2ZW50LnR5cGUsIHtidWJibGVzOiB0cnVlLCBkZXRhaWw6IGV2ZW50LmRldGFpbH0pXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5IGRpc3BhdGNoZWRFdmVudCwgJ2V2ZW50UGhhc2UnLCB2YWx1ZTogRXZlbnQuQlVCQkxJTkdfUEhBU0VcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkgZGlzcGF0Y2hlZEV2ZW50LCAnY3VycmVudFRhcmdldCcsIGdldDogLT4gY3VycmVudFRhcmdldFxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBkaXNwYXRjaGVkRXZlbnQsICd0YXJnZXQnLCB2YWx1ZTogY3VycmVudFRhcmdldFxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBkaXNwYXRjaGVkRXZlbnQsICdwcmV2ZW50RGVmYXVsdCcsIHZhbHVlOiAtPlxuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBkaXNwYXRjaGVkRXZlbnQsICdzdG9wUHJvcGFnYXRpb24nLCB2YWx1ZTogLT5cbiAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG4gICAgICBwcm9wYWdhdGlvblN0b3BwZWQgPSB0cnVlXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5IGRpc3BhdGNoZWRFdmVudCwgJ3N0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbicsIHZhbHVlOiAtPlxuICAgICAgZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKClcbiAgICAgIHByb3BhZ2F0aW9uU3RvcHBlZCA9IHRydWVcbiAgICAgIGltbWVkaWF0ZVByb3BhZ2F0aW9uU3RvcHBlZCA9IHRydWVcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkgZGlzcGF0Y2hlZEV2ZW50LCAnYWJvcnRLZXlCaW5kaW5nJywgdmFsdWU6IC0+XG4gICAgICBldmVudC5hYm9ydEtleUJpbmRpbmc/KClcblxuICAgIGZvciBrZXkgaW4gT2JqZWN0LmtleXMoZXZlbnQpXG4gICAgICBkaXNwYXRjaGVkRXZlbnRba2V5XSA9IGV2ZW50W2tleV1cblxuICAgIEBlbWl0dGVyLmVtaXQgJ3dpbGwtZGlzcGF0Y2gnLCBkaXNwYXRjaGVkRXZlbnRcblxuICAgIGxvb3BcbiAgICAgIGxpc3RlbmVycyA9IEBpbmxpbmVMaXN0ZW5lcnNCeUNvbW1hbmROYW1lW2V2ZW50LnR5cGVdPy5nZXQoY3VycmVudFRhcmdldCkgPyBbXVxuICAgICAgaWYgY3VycmVudFRhcmdldC53ZWJraXRNYXRjaGVzU2VsZWN0b3I/XG4gICAgICAgIHNlbGVjdG9yQmFzZWRMaXN0ZW5lcnMgPVxuICAgICAgICAgIChAc2VsZWN0b3JCYXNlZExpc3RlbmVyc0J5Q29tbWFuZE5hbWVbZXZlbnQudHlwZV0gPyBbXSlcbiAgICAgICAgICAgIC5maWx0ZXIgKGxpc3RlbmVyKSAtPiBjdXJyZW50VGFyZ2V0LndlYmtpdE1hdGNoZXNTZWxlY3RvcihsaXN0ZW5lci5zZWxlY3RvcilcbiAgICAgICAgICAgIC5zb3J0IChhLCBiKSAtPiBhLmNvbXBhcmUoYilcbiAgICAgICAgbGlzdGVuZXJzID0gc2VsZWN0b3JCYXNlZExpc3RlbmVycy5jb25jYXQobGlzdGVuZXJzKVxuXG4gICAgICBtYXRjaGVkID0gdHJ1ZSBpZiBsaXN0ZW5lcnMubGVuZ3RoID4gMFxuXG4gICAgICAjIENhbGwgaW5saW5lIGxpc3RlbmVycyBmaXJzdCBpbiByZXZlcnNlIHJlZ2lzdHJhdGlvbiBvcmRlcixcbiAgICAgICMgYW5kIHNlbGVjdG9yLWJhc2VkIGxpc3RlbmVycyBieSBzcGVjaWZpY2l0eSBhbmQgcmV2ZXJzZVxuICAgICAgIyByZWdpc3RyYXRpb24gb3JkZXIuXG4gICAgICBmb3IgbGlzdGVuZXIgaW4gbGlzdGVuZXJzIGJ5IC0xXG4gICAgICAgIGJyZWFrIGlmIGltbWVkaWF0ZVByb3BhZ2F0aW9uU3RvcHBlZFxuICAgICAgICBsaXN0ZW5lci5jYWxsYmFjay5jYWxsKGN1cnJlbnRUYXJnZXQsIGRpc3BhdGNoZWRFdmVudClcblxuICAgICAgYnJlYWsgaWYgY3VycmVudFRhcmdldCBpcyB3aW5kb3dcbiAgICAgIGJyZWFrIGlmIHByb3BhZ2F0aW9uU3RvcHBlZFxuICAgICAgY3VycmVudFRhcmdldCA9IGN1cnJlbnRUYXJnZXQucGFyZW50Tm9kZSA/IHdpbmRvd1xuXG4gICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWRpc3BhdGNoJywgZGlzcGF0Y2hlZEV2ZW50XG5cbiAgICBtYXRjaGVkXG5cbiAgY29tbWFuZFJlZ2lzdGVyZWQ6IChjb21tYW5kTmFtZSkgLT5cbiAgICBpZiBAcm9vdE5vZGU/IGFuZCBub3QgQHJlZ2lzdGVyZWRDb21tYW5kc1tjb21tYW5kTmFtZV1cbiAgICAgIEByb290Tm9kZS5hZGRFdmVudExpc3RlbmVyKGNvbW1hbmROYW1lLCBAaGFuZGxlQ29tbWFuZEV2ZW50LCB0cnVlKVxuICAgICAgQHJlZ2lzdGVyZWRDb21tYW5kc1tjb21tYW5kTmFtZV0gPSB0cnVlXG5cbmNsYXNzIFNlbGVjdG9yQmFzZWRMaXN0ZW5lclxuICBjb25zdHJ1Y3RvcjogKEBzZWxlY3RvciwgQGNhbGxiYWNrKSAtPlxuICAgIEBzcGVjaWZpY2l0eSA9IGNhbGN1bGF0ZVNwZWNpZmljaXR5KEBzZWxlY3RvcilcbiAgICBAc2VxdWVuY2VOdW1iZXIgPSBTZXF1ZW5jZUNvdW50KytcblxuICBjb21wYXJlOiAob3RoZXIpIC0+XG4gICAgQHNwZWNpZmljaXR5IC0gb3RoZXIuc3BlY2lmaWNpdHkgb3JcbiAgICAgIEBzZXF1ZW5jZU51bWJlciAtIG90aGVyLnNlcXVlbmNlTnVtYmVyXG5cbmNsYXNzIElubGluZUxpc3RlbmVyXG4gIGNvbnN0cnVjdG9yOiAoQGNhbGxiYWNrKSAtPlxuIl19
