(function() {
  var CompositeDisposable, PaneElement, path,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  path = require('path');

  CompositeDisposable = require('event-kit').CompositeDisposable;

  PaneElement = (function(superClass) {
    extend(PaneElement, superClass);

    function PaneElement() {
      return PaneElement.__super__.constructor.apply(this, arguments);
    }

    PaneElement.prototype.attached = false;

    PaneElement.prototype.createdCallback = function() {
      this.attached = false;
      this.subscriptions = new CompositeDisposable;
      this.inlineDisplayStyles = new WeakMap;
      this.initializeContent();
      return this.subscribeToDOMEvents();
    };

    PaneElement.prototype.attachedCallback = function() {
      this.attached = true;
      if (this.model.isFocused()) {
        return this.focus();
      }
    };

    PaneElement.prototype.detachedCallback = function() {
      return this.attached = false;
    };

    PaneElement.prototype.initializeContent = function() {
      this.setAttribute('class', 'pane');
      this.setAttribute('tabindex', -1);
      this.appendChild(this.itemViews = document.createElement('div'));
      return this.itemViews.setAttribute('class', 'item-views');
    };

    PaneElement.prototype.subscribeToDOMEvents = function() {
      var handleBlur, handleDragOver, handleDrop, handleFocus;
      handleFocus = (function(_this) {
        return function(event) {
          var view;
          if (!(_this.isActivating || _this.contains(event.relatedTarget))) {
            _this.model.focus();
          }
          if (event.target === _this && (view = _this.getActiveView())) {
            view.focus();
            return event.stopPropagation();
          }
        };
      })(this);
      handleBlur = (function(_this) {
        return function(event) {
          if (!_this.contains(event.relatedTarget)) {
            return _this.model.blur();
          }
        };
      })(this);
      handleDragOver = function(event) {
        event.preventDefault();
        return event.stopPropagation();
      };
      handleDrop = (function(_this) {
        return function(event) {
          var pathsToOpen;
          event.preventDefault();
          event.stopPropagation();
          _this.getModel().activate();
          pathsToOpen = Array.prototype.map.call(event.dataTransfer.files, function(file) {
            return file.path;
          });
          if (pathsToOpen.length > 0) {
            return _this.applicationDelegate.open({
              pathsToOpen: pathsToOpen
            });
          }
        };
      })(this);
      this.addEventListener('focus', handleFocus, true);
      this.addEventListener('blur', handleBlur, true);
      this.addEventListener('dragover', handleDragOver);
      return this.addEventListener('drop', handleDrop);
    };

    PaneElement.prototype.initialize = function(model, arg) {
      this.model = model;
      this.views = arg.views, this.applicationDelegate = arg.applicationDelegate;
      if (this.views == null) {
        throw new Error("Must pass a views parameter when initializing PaneElements");
      }
      if (this.applicationDelegate == null) {
        throw new Error("Must pass an applicationDelegate parameter when initializing PaneElements");
      }
      this.subscriptions.add(this.model.onDidActivate(this.activated.bind(this)));
      this.subscriptions.add(this.model.observeActive(this.activeStatusChanged.bind(this)));
      this.subscriptions.add(this.model.observeActiveItem(this.activeItemChanged.bind(this)));
      this.subscriptions.add(this.model.onDidRemoveItem(this.itemRemoved.bind(this)));
      this.subscriptions.add(this.model.onDidDestroy(this.paneDestroyed.bind(this)));
      this.subscriptions.add(this.model.observeFlexScale(this.flexScaleChanged.bind(this)));
      return this;
    };

    PaneElement.prototype.getModel = function() {
      return this.model;
    };

    PaneElement.prototype.activated = function() {
      this.isActivating = true;
      if (!this.hasFocus()) {
        this.focus();
      }
      return this.isActivating = false;
    };

    PaneElement.prototype.activeStatusChanged = function(active) {
      if (active) {
        return this.classList.add('active');
      } else {
        return this.classList.remove('active');
      }
    };

    PaneElement.prototype.activeItemChanged = function(item) {
      var child, hasFocus, i, itemPath, itemView, len, ref;
      delete this.dataset.activeItemName;
      delete this.dataset.activeItemPath;
      if (item == null) {
        return;
      }
      hasFocus = this.hasFocus();
      itemView = this.views.getView(item);
      if (itemPath = typeof item.getPath === "function" ? item.getPath() : void 0) {
        this.dataset.activeItemName = path.basename(itemPath);
        this.dataset.activeItemPath = itemPath;
      }
      if (!this.itemViews.contains(itemView)) {
        this.itemViews.appendChild(itemView);
      }
      ref = this.itemViews.children;
      for (i = 0, len = ref.length; i < len; i++) {
        child = ref[i];
        if (child === itemView) {
          if (this.attached) {
            this.showItemView(child);
          }
        } else {
          this.hideItemView(child);
        }
      }
      if (hasFocus) {
        return itemView.focus();
      }
    };

    PaneElement.prototype.showItemView = function(itemView) {
      var inlineDisplayStyle;
      inlineDisplayStyle = this.inlineDisplayStyles.get(itemView);
      if (inlineDisplayStyle != null) {
        return itemView.style.display = inlineDisplayStyle;
      } else {
        return itemView.style.display = '';
      }
    };

    PaneElement.prototype.hideItemView = function(itemView) {
      var inlineDisplayStyle;
      inlineDisplayStyle = itemView.style.display;
      if (inlineDisplayStyle !== 'none') {
        if (inlineDisplayStyle != null) {
          this.inlineDisplayStyles.set(itemView, inlineDisplayStyle);
        }
        return itemView.style.display = 'none';
      }
    };

    PaneElement.prototype.itemRemoved = function(arg) {
      var destroyed, index, item, viewToRemove;
      item = arg.item, index = arg.index, destroyed = arg.destroyed;
      if (viewToRemove = this.views.getView(item)) {
        return viewToRemove.remove();
      }
    };

    PaneElement.prototype.paneDestroyed = function() {
      return this.subscriptions.dispose();
    };

    PaneElement.prototype.flexScaleChanged = function(flexScale) {
      return this.style.flexGrow = flexScale;
    };

    PaneElement.prototype.getActiveView = function() {
      return this.views.getView(this.model.getActiveItem());
    };

    PaneElement.prototype.hasFocus = function() {
      return this === document.activeElement || this.contains(document.activeElement);
    };

    return PaneElement;

  })(HTMLElement);

  module.exports = PaneElement = document.registerElement('atom-pane', {
    prototype: PaneElement.prototype
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3BhbmUtZWxlbWVudC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLHNDQUFBO0lBQUE7OztFQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDTixzQkFBdUIsT0FBQSxDQUFRLFdBQVI7O0VBRWxCOzs7Ozs7OzBCQUNKLFFBQUEsR0FBVTs7MEJBRVYsZUFBQSxHQUFpQixTQUFBO01BQ2YsSUFBQyxDQUFBLFFBQUQsR0FBWTtNQUNaLElBQUMsQ0FBQSxhQUFELEdBQWlCLElBQUk7TUFDckIsSUFBQyxDQUFBLG1CQUFELEdBQXVCLElBQUk7TUFFM0IsSUFBQyxDQUFBLGlCQUFELENBQUE7YUFDQSxJQUFDLENBQUEsb0JBQUQsQ0FBQTtJQU5lOzswQkFRakIsZ0JBQUEsR0FBa0IsU0FBQTtNQUNoQixJQUFDLENBQUEsUUFBRCxHQUFZO01BQ1osSUFBWSxJQUFDLENBQUEsS0FBSyxDQUFDLFNBQVAsQ0FBQSxDQUFaO2VBQUEsSUFBQyxDQUFBLEtBQUQsQ0FBQSxFQUFBOztJQUZnQjs7MEJBSWxCLGdCQUFBLEdBQWtCLFNBQUE7YUFDaEIsSUFBQyxDQUFBLFFBQUQsR0FBWTtJQURJOzswQkFHbEIsaUJBQUEsR0FBbUIsU0FBQTtNQUNqQixJQUFDLENBQUEsWUFBRCxDQUFjLE9BQWQsRUFBdUIsTUFBdkI7TUFDQSxJQUFDLENBQUEsWUFBRCxDQUFjLFVBQWQsRUFBMEIsQ0FBQyxDQUEzQjtNQUNBLElBQUMsQ0FBQSxXQUFELENBQWEsSUFBQyxDQUFBLFNBQUQsR0FBYSxRQUFRLENBQUMsYUFBVCxDQUF1QixLQUF2QixDQUExQjthQUNBLElBQUMsQ0FBQSxTQUFTLENBQUMsWUFBWCxDQUF3QixPQUF4QixFQUFpQyxZQUFqQztJQUppQjs7MEJBTW5CLG9CQUFBLEdBQXNCLFNBQUE7QUFDcEIsVUFBQTtNQUFB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QVEsQ0FBQyxLQUFLLENBQUMsT0FBZixHQUF5QixPQUYzQjs7SUFGWTs7MEJBTWQsV0FBQSxHQUFhLFNBQUMsR0FBRDtBQUNYLFVBQUE7TUFEYSxpQkFBTSxtQkFBTztNQUMxQixJQUFHLFlBQUEsR0FBZSxJQUFDLENBQUEsS0FBSyxDQUFDLE9BQVAsQ0FBZSxJQUFmLENBQWxCO2VBQ0UsWUFBWSxDQUFDLE1BQWIsQ0FBQSxFQURGOztJQURXOzswQkFJYixhQUFBLEdBQWUsU0FBQTthQUNiLElBQUMsQ0FBQSxhQUFhLENBQUMsT0FBZixDQUFBO0lBRGE7OzBCQUdmLGdCQUFBLEdBQWtCLFNBQUMsU0FBRDthQUNoQixJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVAsR0FBa0I7SUFERjs7MEJBR2xCLGFBQUEsR0FBZSxTQUFBO2FBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFQLENBQWUsSUFBQyxDQUFBLEtBQUssQ0FBQyxhQUFQLENBQUEsQ0FBZjtJQUFIOzswQkFFZixRQUFBLEdBQVUsU0FBQTthQUNSLElBQUEsS0FBUSxRQUFRLENBQUMsYUFBakIsSUFBa0MsSUFBQyxDQUFBLFFBQUQsQ0FBVSxRQUFRLENBQUMsYUFBbkI7SUFEMUI7Ozs7S0E1SGM7O0VBK0gxQixNQUFNLENBQUMsT0FBUCxHQUFpQixXQUFBLEdBQWMsUUFBUSxDQUFDLGVBQVQsQ0FBeUIsV0FBekIsRUFBc0M7SUFBQSxTQUFBLEVBQVcsV0FBVyxDQUFDLFNBQXZCO0dBQXRDO0FBbEkvQiIsInNvdXJjZXNDb250ZW50IjpbInBhdGggPSByZXF1aXJlICdwYXRoJ1xue0NvbXBvc2l0ZURpc3Bvc2FibGV9ID0gcmVxdWlyZSAnZXZlbnQta2l0J1xuXG5jbGFzcyBQYW5lRWxlbWVudCBleHRlbmRzIEhUTUxFbGVtZW50XG4gIGF0dGFjaGVkOiBmYWxzZVxuXG4gIGNyZWF0ZWRDYWxsYmFjazogLT5cbiAgICBAYXR0YWNoZWQgPSBmYWxzZVxuICAgIEBzdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgICBAaW5saW5lRGlzcGxheVN0eWxlcyA9IG5ldyBXZWFrTWFwXG5cbiAgICBAaW5pdGlhbGl6ZUNvbnRlbnQoKVxuICAgIEBzdWJzY3JpYmVUb0RPTUV2ZW50cygpXG5cbiAgYXR0YWNoZWRDYWxsYmFjazogLT5cbiAgICBAYXR0YWNoZWQgPSB0cnVlXG4gICAgQGZvY3VzKCkgaWYgQG1vZGVsLmlzRm9jdXNlZCgpXG5cbiAgZGV0YWNoZWRDYWxsYmFjazogLT5cbiAgICBAYXR0YWNoZWQgPSBmYWxzZVxuXG4gIGluaXRpYWxpemVDb250ZW50OiAtPlxuICAgIEBzZXRBdHRyaWJ1dGUgJ2NsYXNzJywgJ3BhbmUnXG4gICAgQHNldEF0dHJpYnV0ZSAndGFiaW5kZXgnLCAtMVxuICAgIEBhcHBlbmRDaGlsZCBAaXRlbVZpZXdzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICBAaXRlbVZpZXdzLnNldEF0dHJpYnV0ZSAnY2xhc3MnLCAnaXRlbS12aWV3cydcblxuICBzdWJzY3JpYmVUb0RPTUV2ZW50czogLT5cbiAgICBoYW5kbGVGb2N1cyA9IChldmVudCkgPT5cbiAgICAgIEBtb2RlbC5mb2N1cygpIHVubGVzcyBAaXNBY3RpdmF0aW5nIG9yIEBjb250YWlucyhldmVudC5yZWxhdGVkVGFyZ2V0KVxuICAgICAgaWYgZXZlbnQudGFyZ2V0IGlzIHRoaXMgYW5kIHZpZXcgPSBAZ2V0QWN0aXZlVmlldygpXG4gICAgICAgIHZpZXcuZm9jdXMoKVxuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKVxuXG4gICAgaGFuZGxlQmx1ciA9IChldmVudCkgPT5cbiAgICAgIEBtb2RlbC5ibHVyKCkgdW5sZXNzIEBjb250YWlucyhldmVudC5yZWxhdGVkVGFyZ2V0KVxuXG4gICAgaGFuZGxlRHJhZ092ZXIgPSAoZXZlbnQpIC0+XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKVxuXG4gICAgaGFuZGxlRHJvcCA9IChldmVudCkgPT5cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcbiAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG4gICAgICBAZ2V0TW9kZWwoKS5hY3RpdmF0ZSgpXG4gICAgICBwYXRoc1RvT3BlbiA9IEFycmF5OjptYXAuY2FsbCBldmVudC5kYXRhVHJhbnNmZXIuZmlsZXMsIChmaWxlKSAtPiBmaWxlLnBhdGhcbiAgICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLm9wZW4oe3BhdGhzVG9PcGVufSkgaWYgcGF0aHNUb09wZW4ubGVuZ3RoID4gMFxuXG4gICAgQGFkZEV2ZW50TGlzdGVuZXIgJ2ZvY3VzJywgaGFuZGxlRm9jdXMsIHRydWVcbiAgICBAYWRkRXZlbnRMaXN0ZW5lciAnYmx1cicsIGhhbmRsZUJsdXIsIHRydWVcbiAgICBAYWRkRXZlbnRMaXN0ZW5lciAnZHJhZ292ZXInLCBoYW5kbGVEcmFnT3ZlclxuICAgIEBhZGRFdmVudExpc3RlbmVyICdkcm9wJywgaGFuZGxlRHJvcFxuXG4gIGluaXRpYWxpemU6IChAbW9kZWwsIHtAdmlld3MsIEBhcHBsaWNhdGlvbkRlbGVnYXRlfSkgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IHBhc3MgYSB2aWV3cyBwYXJhbWV0ZXIgd2hlbiBpbml0aWFsaXppbmcgUGFuZUVsZW1lbnRzXCIpIHVubGVzcyBAdmlld3M/XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwYXNzIGFuIGFwcGxpY2F0aW9uRGVsZWdhdGUgcGFyYW1ldGVyIHdoZW4gaW5pdGlhbGl6aW5nIFBhbmVFbGVtZW50c1wiKSB1bmxlc3MgQGFwcGxpY2F0aW9uRGVsZWdhdGU/XG5cbiAgICBAc3Vic2NyaXB0aW9ucy5hZGQgQG1vZGVsLm9uRGlkQWN0aXZhdGUoQGFjdGl2YXRlZC5iaW5kKHRoaXMpKVxuICAgIEBzdWJzY3JpcHRpb25zLmFkZCBAbW9kZWwub2JzZXJ2ZUFjdGl2ZShAYWN0aXZlU3RhdHVzQ2hhbmdlZC5iaW5kKHRoaXMpKVxuICAgIEBzdWJzY3JpcHRpb25zLmFkZCBAbW9kZWwub2JzZXJ2ZUFjdGl2ZUl0ZW0oQGFjdGl2ZUl0ZW1DaGFuZ2VkLmJpbmQodGhpcykpXG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkIEBtb2RlbC5vbkRpZFJlbW92ZUl0ZW0oQGl0ZW1SZW1vdmVkLmJpbmQodGhpcykpXG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkIEBtb2RlbC5vbkRpZERlc3Ryb3koQHBhbmVEZXN0cm95ZWQuYmluZCh0aGlzKSlcbiAgICBAc3Vic2NyaXB0aW9ucy5hZGQgQG1vZGVsLm9ic2VydmVGbGV4U2NhbGUoQGZsZXhTY2FsZUNoYW5nZWQuYmluZCh0aGlzKSlcbiAgICB0aGlzXG5cbiAgZ2V0TW9kZWw6IC0+IEBtb2RlbFxuXG4gIGFjdGl2YXRlZDogLT5cbiAgICBAaXNBY3RpdmF0aW5nID0gdHJ1ZVxuICAgIEBmb2N1cygpIHVubGVzcyBAaGFzRm9jdXMoKSAjIERvbid0IHN0ZWFsIGZvY3VzIGZyb20gY2hpbGRyZW4uXG4gICAgQGlzQWN0aXZhdGluZyA9IGZhbHNlXG5cbiAgYWN0aXZlU3RhdHVzQ2hhbmdlZDogKGFjdGl2ZSkgLT5cbiAgICBpZiBhY3RpdmVcbiAgICAgIEBjbGFzc0xpc3QuYWRkKCdhY3RpdmUnKVxuICAgIGVsc2VcbiAgICAgIEBjbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKVxuXG4gIGFjdGl2ZUl0ZW1DaGFuZ2VkOiAoaXRlbSkgLT5cbiAgICBkZWxldGUgQGRhdGFzZXQuYWN0aXZlSXRlbU5hbWVcbiAgICBkZWxldGUgQGRhdGFzZXQuYWN0aXZlSXRlbVBhdGhcblxuICAgIHJldHVybiB1bmxlc3MgaXRlbT9cblxuICAgIGhhc0ZvY3VzID0gQGhhc0ZvY3VzKClcbiAgICBpdGVtVmlldyA9IEB2aWV3cy5nZXRWaWV3KGl0ZW0pXG5cbiAgICBpZiBpdGVtUGF0aCA9IGl0ZW0uZ2V0UGF0aD8oKVxuICAgICAgQGRhdGFzZXQuYWN0aXZlSXRlbU5hbWUgPSBwYXRoLmJhc2VuYW1lKGl0ZW1QYXRoKVxuICAgICAgQGRhdGFzZXQuYWN0aXZlSXRlbVBhdGggPSBpdGVtUGF0aFxuXG4gICAgdW5sZXNzIEBpdGVtVmlld3MuY29udGFpbnMoaXRlbVZpZXcpXG4gICAgICBAaXRlbVZpZXdzLmFwcGVuZENoaWxkKGl0ZW1WaWV3KVxuXG4gICAgZm9yIGNoaWxkIGluIEBpdGVtVmlld3MuY2hpbGRyZW5cbiAgICAgIGlmIGNoaWxkIGlzIGl0ZW1WaWV3XG4gICAgICAgIEBzaG93SXRlbVZpZXcoY2hpbGQpIGlmIEBhdHRhY2hlZFxuICAgICAgZWxzZVxuICAgICAgICBAaGlkZUl0ZW1WaWV3KGNoaWxkKVxuXG4gICAgaXRlbVZpZXcuZm9jdXMoKSBpZiBoYXNGb2N1c1xuXG4gIHNob3dJdGVtVmlldzogKGl0ZW1WaWV3KSAtPlxuICAgIGlubGluZURpc3BsYXlTdHlsZSA9IEBpbmxpbmVEaXNwbGF5U3R5bGVzLmdldChpdGVtVmlldylcbiAgICBpZiBpbmxpbmVEaXNwbGF5U3R5bGU/XG4gICAgICBpdGVtVmlldy5zdHlsZS5kaXNwbGF5ID0gaW5saW5lRGlzcGxheVN0eWxlXG4gICAgZWxzZVxuICAgICAgaXRlbVZpZXcuc3R5bGUuZGlzcGxheSA9ICcnXG5cbiAgaGlkZUl0ZW1WaWV3OiAoaXRlbVZpZXcpIC0+XG4gICAgaW5saW5lRGlzcGxheVN0eWxlID0gaXRlbVZpZXcuc3R5bGUuZGlzcGxheVxuICAgIHVubGVzcyBpbmxpbmVEaXNwbGF5U3R5bGUgaXMgJ25vbmUnXG4gICAgICBAaW5saW5lRGlzcGxheVN0eWxlcy5zZXQoaXRlbVZpZXcsIGlubGluZURpc3BsYXlTdHlsZSkgaWYgaW5saW5lRGlzcGxheVN0eWxlP1xuICAgICAgaXRlbVZpZXcuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuXG4gIGl0ZW1SZW1vdmVkOiAoe2l0ZW0sIGluZGV4LCBkZXN0cm95ZWR9KSAtPlxuICAgIGlmIHZpZXdUb1JlbW92ZSA9IEB2aWV3cy5nZXRWaWV3KGl0ZW0pXG4gICAgICB2aWV3VG9SZW1vdmUucmVtb3ZlKClcblxuICBwYW5lRGVzdHJveWVkOiAtPlxuICAgIEBzdWJzY3JpcHRpb25zLmRpc3Bvc2UoKVxuXG4gIGZsZXhTY2FsZUNoYW5nZWQ6IChmbGV4U2NhbGUpIC0+XG4gICAgQHN0eWxlLmZsZXhHcm93ID0gZmxleFNjYWxlXG5cbiAgZ2V0QWN0aXZlVmlldzogLT4gQHZpZXdzLmdldFZpZXcoQG1vZGVsLmdldEFjdGl2ZUl0ZW0oKSlcblxuICBoYXNGb2N1czogLT5cbiAgICB0aGlzIGlzIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgb3IgQGNvbnRhaW5zKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpXG5cbm1vZHVsZS5leHBvcnRzID0gUGFuZUVsZW1lbnQgPSBkb2N1bWVudC5yZWdpc3RlckVsZW1lbnQgJ2F0b20tcGFuZScsIHByb3RvdHlwZTogUGFuZUVsZW1lbnQucHJvdG90eXBlXG4iXX0=
