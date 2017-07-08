(function() {
  var CompositeDisposable, Disposable, WindowEventHandler, listen, ref,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  ref = require('event-kit'), Disposable = ref.Disposable, CompositeDisposable = ref.CompositeDisposable;

  listen = require('./delegated-listener');

  module.exports = WindowEventHandler = (function() {
    function WindowEventHandler(arg) {
      this.atomEnvironment = arg.atomEnvironment, this.applicationDelegate = arg.applicationDelegate;
      this.handleDocumentContextmenu = bind(this.handleDocumentContextmenu, this);
      this.handleLinkClick = bind(this.handleLinkClick, this);
      this.handleWindowToggleMenuBar = bind(this.handleWindowToggleMenuBar, this);
      this.handleWindowToggleDevTools = bind(this.handleWindowToggleDevTools, this);
      this.handleWindowReload = bind(this.handleWindowReload, this);
      this.handleWindowClose = bind(this.handleWindowClose, this);
      this.handleWindowToggleFullScreen = bind(this.handleWindowToggleFullScreen, this);
      this.handleWindowBeforeunload = bind(this.handleWindowBeforeunload, this);
      this.handleLeaveFullScreen = bind(this.handleLeaveFullScreen, this);
      this.handleEnterFullScreen = bind(this.handleEnterFullScreen, this);
      this.handleWindowBlur = bind(this.handleWindowBlur, this);
      this.handleFocusPrevious = bind(this.handleFocusPrevious, this);
      this.handleFocusNext = bind(this.handleFocusNext, this);
      this.handleDocumentKeyEvent = bind(this.handleDocumentKeyEvent, this);
      this.reloadRequested = false;
      this.subscriptions = new CompositeDisposable;
      this.handleNativeKeybindings();
    }

    WindowEventHandler.prototype.initialize = function(window, document) {
      var ref1;
      this.window = window;
      this.document = document;
      this.subscriptions.add(this.atomEnvironment.commands.add(this.window, {
        'window:toggle-full-screen': this.handleWindowToggleFullScreen,
        'window:close': this.handleWindowClose,
        'window:reload': this.handleWindowReload,
        'window:toggle-dev-tools': this.handleWindowToggleDevTools
      }));
      if ((ref1 = process.platform) === 'win32' || ref1 === 'linux') {
        this.subscriptions.add(this.atomEnvironment.commands.add(this.window, {
          'window:toggle-menu-bar': this.handleWindowToggleMenuBar
        }));
      }
      this.subscriptions.add(this.atomEnvironment.commands.add(this.document, {
        'core:focus-next': this.handleFocusNext,
        'core:focus-previous': this.handleFocusPrevious
      }));
      this.addEventListener(this.window, 'beforeunload', this.handleWindowBeforeunload);
      this.addEventListener(this.window, 'focus', this.handleWindowFocus);
      this.addEventListener(this.window, 'blur', this.handleWindowBlur);
      this.addEventListener(this.document, 'keyup', this.handleDocumentKeyEvent);
      this.addEventListener(this.document, 'keydown', this.handleDocumentKeyEvent);
      this.addEventListener(this.document, 'drop', this.handleDocumentDrop);
      this.addEventListener(this.document, 'dragover', this.handleDocumentDragover);
      this.addEventListener(this.document, 'contextmenu', this.handleDocumentContextmenu);
      this.subscriptions.add(listen(this.document, 'click', 'a', this.handleLinkClick));
      this.subscriptions.add(listen(this.document, 'submit', 'form', this.handleFormSubmit));
      this.subscriptions.add(this.applicationDelegate.onDidEnterFullScreen(this.handleEnterFullScreen));
      return this.subscriptions.add(this.applicationDelegate.onDidLeaveFullScreen(this.handleLeaveFullScreen));
    };

    WindowEventHandler.prototype.handleNativeKeybindings = function() {
      var bindCommandToAction;
      bindCommandToAction = (function(_this) {
        return function(command, action) {
          return _this.subscriptions.add(_this.atomEnvironment.commands.add('.native-key-bindings', command, (function(event) {
            return _this.applicationDelegate.getCurrentWindow().webContents[action]();
          }), false));
        };
      })(this);
      bindCommandToAction('core:copy', 'copy');
      bindCommandToAction('core:paste', 'paste');
      bindCommandToAction('core:undo', 'undo');
      bindCommandToAction('core:redo', 'redo');
      bindCommandToAction('core:select-all', 'selectAll');
      return bindCommandToAction('core:cut', 'cut');
    };

    WindowEventHandler.prototype.unsubscribe = function() {
      return this.subscriptions.dispose();
    };

    WindowEventHandler.prototype.on = function(target, eventName, handler) {
      target.on(eventName, handler);
      return this.subscriptions.add(new Disposable(function() {
        return target.removeListener(eventName, handler);
      }));
    };

    WindowEventHandler.prototype.addEventListener = function(target, eventName, handler) {
      target.addEventListener(eventName, handler);
      return this.subscriptions.add(new Disposable(function() {
        return target.removeEventListener(eventName, handler);
      }));
    };

    WindowEventHandler.prototype.handleDocumentKeyEvent = function(event) {
      this.atomEnvironment.keymaps.handleKeyboardEvent(event);
      return event.stopImmediatePropagation();
    };

    WindowEventHandler.prototype.handleDrop = function(event) {
      event.preventDefault();
      return event.stopPropagation();
    };

    WindowEventHandler.prototype.handleDragover = function(event) {
      event.preventDefault();
      event.stopPropagation();
      return event.dataTransfer.dropEffect = 'none';
    };

    WindowEventHandler.prototype.eachTabIndexedElement = function(callback) {
      var element, i, len, ref1;
      ref1 = this.document.querySelectorAll('[tabindex]');
      for (i = 0, len = ref1.length; i < len; i++) {
        element = ref1[i];
        if (element.disabled) {
          continue;
        }
        if (!(element.tabIndex >= 0)) {
          continue;
        }
        callback(element, element.tabIndex);
      }
    };

    WindowEventHandler.prototype.handleFocusNext = function() {
      var focusedTabIndex, lowestElement, lowestTabIndex, nextElement, nextTabIndex, ref1;
      focusedTabIndex = (ref1 = this.document.activeElement.tabIndex) != null ? ref1 : -2e308;
      nextElement = null;
      nextTabIndex = 2e308;
      lowestElement = null;
      lowestTabIndex = 2e308;
      this.eachTabIndexedElement(function(element, tabIndex) {
        if (tabIndex < lowestTabIndex) {
          lowestTabIndex = tabIndex;
          lowestElement = element;
        }
        if ((focusedTabIndex < tabIndex && tabIndex < nextTabIndex)) {
          nextTabIndex = tabIndex;
          return nextElement = element;
        }
      });
      if (nextElement != null) {
        return nextElement.focus();
      } else if (lowestElement != null) {
        return lowestElement.focus();
      }
    };

    WindowEventHandler.prototype.handleFocusPrevious = function() {
      var focusedTabIndex, highestElement, highestTabIndex, previousElement, previousTabIndex, ref1;
      focusedTabIndex = (ref1 = this.document.activeElement.tabIndex) != null ? ref1 : 2e308;
      previousElement = null;
      previousTabIndex = -2e308;
      highestElement = null;
      highestTabIndex = -2e308;
      this.eachTabIndexedElement(function(element, tabIndex) {
        if (tabIndex > highestTabIndex) {
          highestTabIndex = tabIndex;
          highestElement = element;
        }
        if ((focusedTabIndex > tabIndex && tabIndex > previousTabIndex)) {
          previousTabIndex = tabIndex;
          return previousElement = element;
        }
      });
      if (previousElement != null) {
        return previousElement.focus();
      } else if (highestElement != null) {
        return highestElement.focus();
      }
    };

    WindowEventHandler.prototype.handleWindowFocus = function() {
      return this.document.body.classList.remove('is-blurred');
    };

    WindowEventHandler.prototype.handleWindowBlur = function() {
      this.document.body.classList.add('is-blurred');
      return this.atomEnvironment.storeWindowDimensions();
    };

    WindowEventHandler.prototype.handleEnterFullScreen = function() {
      return this.document.body.classList.add("fullscreen");
    };

    WindowEventHandler.prototype.handleLeaveFullScreen = function() {
      return this.document.body.classList.remove("fullscreen");
    };

    WindowEventHandler.prototype.handleWindowBeforeunload = function(event) {
      var confirmed, projectHasPaths, ref1;
      projectHasPaths = this.atomEnvironment.project.getPaths().length > 0;
      confirmed = (ref1 = this.atomEnvironment.workspace) != null ? ref1.confirmClose({
        windowCloseRequested: true,
        projectHasPaths: projectHasPaths
      }) : void 0;
      if (confirmed && !this.reloadRequested && !this.atomEnvironment.inSpecMode() && this.atomEnvironment.getCurrentWindow().isWebViewFocused()) {
        this.atomEnvironment.hide();
      }
      this.reloadRequested = false;
      this.atomEnvironment.storeWindowDimensions();
      if (confirmed) {
        this.atomEnvironment.unloadEditorWindow();
        return this.atomEnvironment.destroy();
      } else {
        this.applicationDelegate.didCancelWindowUnload();
        return event.returnValue = false;
      }
    };

    WindowEventHandler.prototype.handleWindowToggleFullScreen = function() {
      return this.atomEnvironment.toggleFullScreen();
    };

    WindowEventHandler.prototype.handleWindowClose = function() {
      return this.atomEnvironment.close();
    };

    WindowEventHandler.prototype.handleWindowReload = function() {
      this.reloadRequested = true;
      return this.atomEnvironment.reload();
    };

    WindowEventHandler.prototype.handleWindowToggleDevTools = function() {
      return this.atomEnvironment.toggleDevTools();
    };

    WindowEventHandler.prototype.handleWindowToggleMenuBar = function() {
      var detail;
      this.atomEnvironment.config.set('core.autoHideMenuBar', !this.atomEnvironment.config.get('core.autoHideMenuBar'));
      if (this.atomEnvironment.config.get('core.autoHideMenuBar')) {
        detail = "To toggle, press the Alt key or execute the window:toggle-menu-bar command";
        return this.atomEnvironment.notifications.addInfo('Menu bar hidden', {
          detail: detail
        });
      }
    };

    WindowEventHandler.prototype.handleLinkClick = function(event) {
      var ref1, uri;
      event.preventDefault();
      uri = (ref1 = event.currentTarget) != null ? ref1.getAttribute('href') : void 0;
      if (uri && uri[0] !== '#' && /^https?:\/\//.test(uri)) {
        return this.applicationDelegate.openExternal(uri);
      }
    };

    WindowEventHandler.prototype.handleFormSubmit = function(event) {
      return event.preventDefault();
    };

    WindowEventHandler.prototype.handleDocumentContextmenu = function(event) {
      event.preventDefault();
      return this.atomEnvironment.contextMenu.showForEvent(event);
    };

    return WindowEventHandler;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3dpbmRvdy1ldmVudC1oYW5kbGVyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsZ0VBQUE7SUFBQTs7RUFBQSxNQUFvQyxPQUFBLENBQVEsV0FBUixDQUFwQyxFQUFDLDJCQUFELEVBQWE7O0VBQ2IsTUFBQSxHQUFTLE9BQUEsQ0FBUSxzQkFBUjs7RUFHVCxNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1MsNEJBQUMsR0FBRDtNQUFFLElBQUMsQ0FBQSxzQkFBQSxpQkFBaUIsSUFBQyxDQUFBLDBCQUFBOzs7Ozs7Ozs7Ozs7Ozs7TUFDaEMsSUFBQyxDQUFBLGVBQUQsR0FBbUI7TUFDbkIsSUFBQyxDQUFBLGFBQUQsR0FBaUIsSUFBSTtNQUVyQixJQUFDLENBQUEsdUJBQUQsQ0FBQTtJQUpXOztpQ0FNYixVQUFBLEdBQVksU0FBQyxNQUFELEVBQVUsUUFBVjtBQUNWLFVBQUE7TUFEVyxJQUFDLENBQUEsU0FBRDtNQUFTLElBQUMsQ0FBQSxXQUFEO01BQ3BCLElBQUMsQ0FBQSxhQUFhLENBQUMsR0FBZixDQUFtQixJQUFDLENBQUEsZUFBZSxDQUFDLFFBQVEsQ0FBQyxHQUExQixDQUE4QixJQUFDLENBQUEsTUFBL0IsRUFDakI7UUFBQSwyQkFBQSxFQUE2QixJQUFDLENBQUEsNEJBQTlCO1FBQ0EsY0FBQSxFQUFnQixJQUFDLENBQUEsaUJBRGpCO1FBRUEsZUFBQSxFQUFpQixJQUFDLENBQUEsa0JBRmxCO1FBR0EseUJBQUEsRUFBMkIsSUFBQyxDQUFBLDBCQUg1QjtPQURpQixDQUFuQjtNQU1BLFlBQUcsT0FBTyxDQUFDLFNBQVIsS0FBcUIsT0FBckIsSUFBQSxJQUFBLEtBQThCLE9BQWpDO1FBQ0UsSUFBQyxDQUFBLGFBQWEsQ0FBQyxHQUFmLENBQW1CLElBQUMsQ0FBQSxlQUFlLENBQUMsUUFBUSxDQUFDLEdB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LEdBQXhCLENBQTRCLHNCQUE1QixDQUFIO1FBQ0UsTUFBQSxHQUFTO2VBQ1QsSUFBQyxDQUFBLGVBQWUsQ0FBQyxhQUFhLENBQUMsT0FBL0IsQ0FBdUMsaUJBQXZDLEVBQTBEO1VBQUMsUUFBQSxNQUFEO1NBQTFELEVBRkY7O0lBSHlCOztpQ0FPM0IsZUFBQSxHQUFpQixTQUFDLEtBQUQ7QUFDZixVQUFBO01BQUEsS0FBSyxDQUFDLGNBQU4sQ0FBQTtNQUNBLEdBQUEsOENBQXlCLENBQUUsWUFBckIsQ0FBa0MsTUFBbEM7TUFDTixJQUFHLEdBQUEsSUFBUSxHQUFJLENBQUEsQ0FBQSxDQUFKLEtBQVksR0FBcEIsSUFBNEIsY0FBYyxDQUFDLElBQWYsQ0FBb0IsR0FBcEIsQ0FBL0I7ZUFDRSxJQUFDLENBQUEsbUJBQW1CLENBQUMsWUFBckIsQ0FBa0MsR0FBbEMsRUFERjs7SUFIZTs7aUNBTWpCLGdCQUFBLEdBQWtCLFNBQUMsS0FBRDthQUVoQixLQUFLLENBQUMsY0FBTixDQUFBO0lBRmdCOztpQ0FJbEIseUJBQUEsR0FBMkIsU0FBQyxLQUFEO01BQ3pCLEtBQUssQ0FBQyxjQUFOLENBQUE7YUFDQSxJQUFDLENBQUEsZUFBZSxDQUFDLFdBQVcsQ0FBQyxZQUE3QixDQUEwQyxLQUExQztJQUZ5Qjs7Ozs7QUFqTTdCIiwic291cmNlc0NvbnRlbnQiOlsie0Rpc3Bvc2FibGUsIENvbXBvc2l0ZURpc3Bvc2FibGV9ID0gcmVxdWlyZSAnZXZlbnQta2l0J1xubGlzdGVuID0gcmVxdWlyZSAnLi9kZWxlZ2F0ZWQtbGlzdGVuZXInXG5cbiMgSGFuZGxlcyBsb3ctbGV2ZWwgZXZlbnRzIHJlbGF0ZWQgdG8gdGhlIEB3aW5kb3cuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBXaW5kb3dFdmVudEhhbmRsZXJcbiAgY29uc3RydWN0b3I6ICh7QGF0b21FbnZpcm9ubWVudCwgQGFwcGxpY2F0aW9uRGVsZWdhdGV9KSAtPlxuICAgIEByZWxvYWRSZXF1ZXN0ZWQgPSBmYWxzZVxuICAgIEBzdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcblxuICAgIEBoYW5kbGVOYXRpdmVLZXliaW5kaW5ncygpXG5cbiAgaW5pdGlhbGl6ZTogKEB3aW5kb3csIEBkb2N1bWVudCkgLT5cbiAgICBAc3Vic2NyaXB0aW9ucy5hZGQgQGF0b21FbnZpcm9ubWVudC5jb21tYW5kcy5hZGQgQHdpbmRvdyxcbiAgICAgICd3aW5kb3c6dG9nZ2xlLWZ1bGwtc2NyZWVuJzogQGhhbmRsZVdpbmRvd1RvZ2dsZUZ1bGxTY3JlZW5cbiAgICAgICd3aW5kb3c6Y2xvc2UnOiBAaGFuZGxlV2luZG93Q2xvc2VcbiAgICAgICd3aW5kb3c6cmVsb2FkJzogQGhhbmRsZVdpbmRvd1JlbG9hZFxuICAgICAgJ3dpbmRvdzp0b2dnbGUtZGV2LXRvb2xzJzogQGhhbmRsZVdpbmRvd1RvZ2dsZURldlRvb2xzXG5cbiAgICBpZiBwcm9jZXNzLnBsYXRmb3JtIGluIFsnd2luMzInLCAnbGludXgnXVxuICAgICAgQHN1YnNjcmlwdGlvbnMuYWRkIEBhdG9tRW52aXJvbm1lbnQuY29tbWFuZHMuYWRkIEB3aW5kb3csXG4gICAgICAgICd3aW5kb3c6dG9nZ2xlLW1lbnUtYmFyJzogQGhhbmRsZVdpbmRvd1RvZ2dsZU1lbnVCYXJcblxuICAgIEBzdWJzY3JpcHRpb25zLmFkZCBAYXRvbUVudmlyb25tZW50LmNvbW1hbmRzLmFkZCBAZG9jdW1lbnQsXG4gICAgICAnY29yZTpmb2N1cy1uZXh0JzogQGhhbmRsZUZvY3VzTmV4dFxuICAgICAgJ2NvcmU6Zm9jdXMtcHJldmlvdXMnOiBAaGFuZGxlRm9jdXNQcmV2aW91c1xuXG4gICAgQGFkZEV2ZW50TGlzdGVuZXIoQHdpbmRvdywgJ2JlZm9yZXVubG9hZCcsIEBoYW5kbGVXaW5kb3dCZWZvcmV1bmxvYWQpXG4gICAgQGFkZEV2ZW50TGlzdGVuZXIoQHdpbmRvdywgJ2ZvY3VzJywgQGhhbmRsZVdpbmRvd0ZvY3VzKVxuICAgIEBhZGRFdmVudExpc3RlbmVyKEB3aW5kb3csICdibHVyJywgQGhhbmRsZVdpbmRvd0JsdXIpXG5cbiAgICBAYWRkRXZlbnRMaXN0ZW5lcihAZG9jdW1lbnQsICdrZXl1cCcsIEBoYW5kbGVEb2N1bWVudEtleUV2ZW50KVxuICAgIEBhZGRFdmVudExpc3RlbmVyKEBkb2N1bWVudCwgJ2tleWRvd24nLCBAaGFuZGxlRG9jdW1lbnRLZXlFdmVudClcbiAgICBAYWRkRXZlbnRMaXN0ZW5lcihAZG9jdW1lbnQsICdkcm9wJywgQGhhbmRsZURvY3VtZW50RHJvcClcbiAgICBAYWRkRXZlbnRMaXN0ZW5lcihAZG9jdW1lbnQsICdkcmFnb3ZlcicsIEBoYW5kbGVEb2N1bWVudERyYWdvdmVyKVxuICAgIEBhZGRFdmVudExpc3RlbmVyKEBkb2N1bWVudCwgJ2NvbnRleHRtZW51JywgQGhhbmRsZURvY3VtZW50Q29udGV4dG1lbnUpXG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkIGxpc3RlbihAZG9jdW1lbnQsICdjbGljaycsICdhJywgQGhhbmRsZUxpbmtDbGljaylcbiAgICBAc3Vic2NyaXB0aW9ucy5hZGQgbGlzdGVuKEBkb2N1bWVudCwgJ3N1Ym1pdCcsICdmb3JtJywgQGhhbmRsZUZvcm1TdWJtaXQpXG5cbiAgICBAc3Vic2NyaXB0aW9ucy5hZGQoQGFwcGxpY2F0aW9uRGVsZWdhdGUub25EaWRFbnRlckZ1bGxTY3JlZW4oQGhhbmRsZUVudGVyRnVsbFNjcmVlbikpXG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkKEBhcHBsaWNhdGlvbkRlbGVnYXRlLm9uRGlkTGVhdmVGdWxsU2NyZWVuKEBoYW5kbGVMZWF2ZUZ1bGxTY3JlZW4pKVxuXG4gICMgV2lyZSBjb21tYW5kcyB0aGF0IHNob3VsZCBiZSBoYW5kbGVkIGJ5IENocm9taXVtIGZvciBlbGVtZW50cyB3aXRoIHRoZVxuICAjIGAubmF0aXZlLWtleS1iaW5kaW5nc2AgY2xhc3MuXG4gIGhhbmRsZU5hdGl2ZUtleWJpbmRpbmdzOiAtPlxuICAgIGJpbmRDb21tYW5kVG9BY3Rpb24gPSAoY29tbWFuZCwgYWN0aW9uKSA9PlxuICAgICAgQHN1YnNjcmlwdGlvbnMuYWRkIEBhdG9tRW52aXJvbm1lbnQuY29tbWFuZHMuYWRkKFxuICAgICAgICAnLm5hdGl2ZS1rZXktYmluZGluZ3MnLFxuICAgICAgICBjb21tYW5kLFxuICAgICAgICAoKGV2ZW50KSA9PiBAYXBwbGljYXRpb25EZWxlZ2F0ZS5nZXRDdXJyZW50V2luZG93KCkud2ViQ29udGVudHNbYWN0aW9uXSgpKSxcbiAgICAgICAgZmFsc2VcbiAgICAgIClcblxuICAgIGJpbmRDb21tYW5kVG9BY3Rpb24oJ2NvcmU6Y29weScsICdjb3B5JylcbiAgICBiaW5kQ29tbWFuZFRvQWN0aW9uKCdjb3JlOnBhc3RlJywgJ3Bhc3RlJylcbiAgICBiaW5kQ29tbWFuZFRvQWN0aW9uKCdjb3JlOnVuZG8nLCAndW5kbycpXG4gICAgYmluZENvbW1hbmRUb0FjdGlvbignY29yZTpyZWRvJywgJ3JlZG8nKVxuICAgIGJpbmRDb21tYW5kVG9BY3Rpb24oJ2NvcmU6c2VsZWN0LWFsbCcsICdzZWxlY3RBbGwnKVxuICAgIGJpbmRDb21tYW5kVG9BY3Rpb24oJ2NvcmU6Y3V0JywgJ2N1dCcpXG5cbiAgdW5zdWJzY3JpYmU6IC0+XG4gICAgQHN1YnNjcmlwdGlvbnMuZGlzcG9zZSgpXG5cbiAgb246ICh0YXJnZXQsIGV2ZW50TmFtZSwgaGFuZGxlcikgLT5cbiAgICB0YXJnZXQub24oZXZlbnROYW1lLCBoYW5kbGVyKVxuICAgIEBzdWJzY3JpcHRpb25zLmFkZChuZXcgRGlzcG9zYWJsZSAtPlxuICAgICAgdGFyZ2V0LnJlbW92ZUxpc3RlbmVyKGV2ZW50TmFtZSwgaGFuZGxlcilcbiAgICApXG5cbiAgYWRkRXZlbnRMaXN0ZW5lcjogKHRhcmdldCwgZXZlbnROYW1lLCBoYW5kbGVyKSAtPlxuICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgaGFuZGxlcilcbiAgICBAc3Vic2NyaXB0aW9ucy5hZGQobmV3IERpc3Bvc2FibGUoLT4gdGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBoYW5kbGVyKSkpXG5cbiAgaGFuZGxlRG9jdW1lbnRLZXlFdmVudDogKGV2ZW50KSA9PlxuICAgIEBhdG9tRW52aXJvbm1lbnQua2V5bWFwcy5oYW5kbGVLZXlib2FyZEV2ZW50KGV2ZW50KVxuICAgIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpXG5cbiAgaGFuZGxlRHJvcDogKGV2ZW50KSAtPlxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKVxuXG4gIGhhbmRsZURyYWdvdmVyOiAoZXZlbnQpIC0+XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG4gICAgZXZlbnQuZGF0YVRyYW5zZmVyLmRyb3BFZmZlY3QgPSAnbm9uZSdcblxuICBlYWNoVGFiSW5kZXhlZEVsZW1lbnQ6IChjYWxsYmFjaykgLT5cbiAgICBmb3IgZWxlbWVudCBpbiBAZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW3RhYmluZGV4XScpXG4gICAgICBjb250aW51ZSBpZiBlbGVtZW50LmRpc2FibGVkXG4gICAgICBjb250aW51ZSB1bmxlc3MgZWxlbWVudC50YWJJbmRleCA+PSAwXG4gICAgICBjYWxsYmFjayhlbGVtZW50LCBlbGVtZW50LnRhYkluZGV4KVxuICAgIHJldHVyblxuXG4gIGhhbmRsZUZvY3VzTmV4dDogPT5cbiAgICBmb2N1c2VkVGFiSW5kZXggPSBAZG9jdW1lbnQuYWN0aXZlRWxlbWVudC50YWJJbmRleCA/IC1JbmZpbml0eVxuXG4gICAgbmV4dEVsZW1lbnQgPSBudWxsXG4gICAgbmV4dFRhYkluZGV4ID0gSW5maW5pdHlcbiAgICBsb3dlc3RFbGVtZW50ID0gbnVsbFxuICAgIGxvd2VzdFRhYkluZGV4ID0gSW5maW5pdHlcbiAgICBAZWFjaFRhYkluZGV4ZWRFbGVtZW50IChlbGVtZW50LCB0YWJJbmRleCkgLT5cbiAgICAgIGlmIHRhYkluZGV4IDwgbG93ZXN0VGFiSW5kZXhcbiAgICAgICAgbG93ZXN0VGFiSW5kZXggPSB0YWJJbmRleFxuICAgICAgICBsb3dlc3RFbGVtZW50ID0gZWxlbWVudFxuXG4gICAgICBpZiBmb2N1c2VkVGFiSW5kZXggPCB0YWJJbmRleCA8IG5leHRUYWJJbmRleFxuICAgICAgICBuZXh0VGFiSW5kZXggPSB0YWJJbmRleFxuICAgICAgICBuZXh0RWxlbWVudCA9IGVsZW1lbnRcblxuICAgIGlmIG5leHRFbGVtZW50P1xuICAgICAgbmV4dEVsZW1lbnQuZm9jdXMoKVxuICAgIGVsc2UgaWYgbG93ZXN0RWxlbWVudD9cbiAgICAgIGxvd2VzdEVsZW1lbnQuZm9jdXMoKVxuXG4gIGhhbmRsZUZvY3VzUHJldmlvdXM6ID0+XG4gICAgZm9jdXNlZFRhYkluZGV4ID0gQGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQudGFiSW5kZXggPyBJbmZpbml0eVxuXG4gICAgcHJldmlvdXNFbGVtZW50ID0gbnVsbFxuICAgIHByZXZpb3VzVGFiSW5kZXggPSAtSW5maW5pdHlcbiAgICBoaWdoZXN0RWxlbWVudCA9IG51bGxcbiAgICBoaWdoZXN0VGFiSW5kZXggPSAtSW5maW5pdHlcbiAgICBAZWFjaFRhYkluZGV4ZWRFbGVtZW50IChlbGVtZW50LCB0YWJJbmRleCkgLT5cbiAgICAgIGlmIHRhYkluZGV4ID4gaGlnaGVzdFRhYkluZGV4XG4gICAgICAgIGhpZ2hlc3RUYWJJbmRleCA9IHRhYkluZGV4XG4gICAgICAgIGhpZ2hlc3RFbGVtZW50ID0gZWxlbWVudFxuXG4gICAgICBpZiBmb2N1c2VkVGFiSW5kZXggPiB0YWJJbmRleCA+IHByZXZpb3VzVGFiSW5kZXhcbiAgICAgICAgcHJldmlvdXNUYWJJbmRleCA9IHRhYkluZGV4XG4gICAgICAgIHByZXZpb3VzRWxlbWVudCA9IGVsZW1lbnRcblxuICAgIGlmIHByZXZpb3VzRWxlbWVudD9cbiAgICAgIHByZXZpb3VzRWxlbWVudC5mb2N1cygpXG4gICAgZWxzZSBpZiBoaWdoZXN0RWxlbWVudD9cbiAgICAgIGhpZ2hlc3RFbGVtZW50LmZvY3VzKClcblxuICBoYW5kbGVXaW5kb3dGb2N1czogLT5cbiAgICBAZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKCdpcy1ibHVycmVkJylcblxuICBoYW5kbGVXaW5kb3dCbHVyOiA9PlxuICAgIEBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQoJ2lzLWJsdXJyZWQnKVxuICAgIEBhdG9tRW52aXJvbm1lbnQuc3RvcmVXaW5kb3dEaW1lbnNpb25zKClcblxuICBoYW5kbGVFbnRlckZ1bGxTY3JlZW46ID0+XG4gICAgQGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZChcImZ1bGxzY3JlZW5cIilcblxuICBoYW5kbGVMZWF2ZUZ1bGxTY3JlZW46ID0+XG4gICAgQGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcImZ1bGxzY3JlZW5cIilcblxuICBoYW5kbGVXaW5kb3dCZWZvcmV1bmxvYWQ6IChldmVudCkgPT5cbiAgICBwcm9qZWN0SGFzUGF0aHMgPSBAYXRvbUVudmlyb25tZW50LnByb2plY3QuZ2V0UGF0aHMoKS5sZW5ndGggPiAwXG4gICAgY29uZmlybWVkID0gQGF0b21FbnZpcm9ubWVudC53b3Jrc3BhY2U/LmNvbmZpcm1DbG9zZSh3aW5kb3dDbG9zZVJlcXVlc3RlZDogdHJ1ZSwgcHJvamVjdEhhc1BhdGhzOiBwcm9qZWN0SGFzUGF0aHMpXG4gICAgaWYgY29uZmlybWVkIGFuZCBub3QgQHJlbG9hZFJlcXVlc3RlZCBhbmQgbm90IEBhdG9tRW52aXJvbm1lbnQuaW5TcGVjTW9kZSgpIGFuZCBAYXRvbUVudmlyb25tZW50LmdldEN1cnJlbnRXaW5kb3coKS5pc1dlYlZpZXdGb2N1c2VkKClcbiAgICAgIEBhdG9tRW52aXJvbm1lbnQuaGlkZSgpXG4gICAgQHJlbG9hZFJlcXVlc3RlZCA9IGZhbHNlXG5cbiAgICBAYXRvbUVudmlyb25tZW50LnN0b3JlV2luZG93RGltZW5zaW9ucygpXG4gICAgaWYgY29uZmlybWVkXG4gICAgICBAYXRvbUVudmlyb25tZW50LnVubG9hZEVkaXRvcldpbmRvdygpXG4gICAgICBAYXRvbUVudmlyb25tZW50LmRlc3Ryb3koKVxuICAgIGVsc2VcbiAgICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLmRpZENhbmNlbFdpbmRvd1VubG9hZCgpXG4gICAgICBldmVudC5yZXR1cm5WYWx1ZSA9IGZhbHNlXG5cbiAgaGFuZGxlV2luZG93VG9nZ2xlRnVsbFNjcmVlbjogPT5cbiAgICBAYXRvbUVudmlyb25tZW50LnRvZ2dsZUZ1bGxTY3JlZW4oKVxuXG4gIGhhbmRsZVdpbmRvd0Nsb3NlOiA9PlxuICAgIEBhdG9tRW52aXJvbm1lbnQuY2xvc2UoKVxuXG4gIGhhbmRsZVdpbmRvd1JlbG9hZDogPT5cbiAgICBAcmVsb2FkUmVxdWVzdGVkID0gdHJ1ZVxuICAgIEBhdG9tRW52aXJvbm1lbnQucmVsb2FkKClcblxuICBoYW5kbGVXaW5kb3dUb2dnbGVEZXZUb29sczogPT5cbiAgICBAYXRvbUVudmlyb25tZW50LnRvZ2dsZURldlRvb2xzKClcblxuICBoYW5kbGVXaW5kb3dUb2dnbGVNZW51QmFyOiA9PlxuICAgIEBhdG9tRW52aXJvbm1lbnQuY29uZmlnLnNldCgnY29yZS5hdXRvSGlkZU1lbnVCYXInLCBub3QgQGF0b21FbnZpcm9ubWVudC5jb25maWcuZ2V0KCdjb3JlLmF1dG9IaWRlTWVudUJhcicpKVxuXG4gICAgaWYgQGF0b21FbnZpcm9ubWVudC5jb25maWcuZ2V0KCdjb3JlLmF1dG9IaWRlTWVudUJhcicpXG4gICAgICBkZXRhaWwgPSBcIlRvIHRvZ2dsZSwgcHJlc3MgdGhlIEFsdCBrZXkgb3IgZXhlY3V0ZSB0aGUgd2luZG93OnRvZ2dsZS1tZW51LWJhciBjb21tYW5kXCJcbiAgICAgIEBhdG9tRW52aXJvbm1lbnQubm90aWZpY2F0aW9ucy5hZGRJbmZvKCdNZW51IGJhciBoaWRkZW4nLCB7ZGV0YWlsfSlcblxuICBoYW5kbGVMaW5rQ2xpY2s6IChldmVudCkgPT5cbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpXG4gICAgdXJpID0gZXZlbnQuY3VycmVudFRhcmdldD8uZ2V0QXR0cmlidXRlKCdocmVmJylcbiAgICBpZiB1cmkgYW5kIHVyaVswXSBpc250ICcjJyBhbmQgL15odHRwcz86XFwvXFwvLy50ZXN0KHVyaSlcbiAgICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLm9wZW5FeHRlcm5hbCh1cmkpXG5cbiAgaGFuZGxlRm9ybVN1Ym1pdDogKGV2ZW50KSAtPlxuICAgICMgUHJldmVudCBmb3JtIHN1Ym1pdHMgZnJvbSBjaGFuZ2luZyB0aGUgY3VycmVudCB3aW5kb3cncyBVUkxcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgaGFuZGxlRG9jdW1lbnRDb250ZXh0bWVudTogKGV2ZW50KSA9PlxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcbiAgICBAYXRvbUVudmlyb25tZW50LmNvbnRleHRNZW51LnNob3dGb3JFdmVudChldmVudClcbiJdfQ==
