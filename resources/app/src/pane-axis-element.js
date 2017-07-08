(function() {
  var CompositeDisposable, PaneAxisElement, PaneResizeHandleElement,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  CompositeDisposable = require('event-kit').CompositeDisposable;

  PaneResizeHandleElement = require('./pane-resize-handle-element');

  PaneAxisElement = (function(superClass) {
    extend(PaneAxisElement, superClass);

    function PaneAxisElement() {
      return PaneAxisElement.__super__.constructor.apply(this, arguments);
    }

    PaneAxisElement.prototype.attachedCallback = function() {
      var child, i, index, len, ref, results;
      if (this.subscriptions == null) {
        this.subscriptions = this.subscribeToModel();
      }
      ref = this.model.getChildren();
      results = [];
      for (index = i = 0, len = ref.length; i < len; index = ++i) {
        child = ref[index];
        results.push(this.childAdded({
          child: child,
          index: index
        }));
      }
      return results;
    };

    PaneAxisElement.prototype.detachedCallback = function() {
      var child, i, len, ref, results;
      this.subscriptions.dispose();
      this.subscriptions = null;
      ref = this.model.getChildren();
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        child = ref[i];
        results.push(this.childRemoved({
          child: child
        }));
      }
      return results;
    };

    PaneAxisElement.prototype.initialize = function(model, viewRegistry) {
      var child, i, index, len, ref;
      this.model = model;
      this.viewRegistry = viewRegistry;
      if (this.subscriptions == null) {
        this.subscriptions = this.subscribeToModel();
      }
      ref = this.model.getChildren();
      for (index = i = 0, len = ref.length; i < len; index = ++i) {
        child = ref[index];
        this.childAdded({
          child: child,
          index: index
        });
      }
      switch (this.model.getOrientation()) {
        case 'horizontal':
          this.classList.add('horizontal', 'pane-row');
          break;
        case 'vertical':
          this.classList.add('vertical', 'pane-column');
      }
      return this;
    };

    PaneAxisElement.prototype.subscribeToModel = function() {
      var subscriptions;
      subscriptions = new CompositeDisposable;
      subscriptions.add(this.model.onDidAddChild(this.childAdded.bind(this)));
      subscriptions.add(this.model.onDidRemoveChild(this.childRemoved.bind(this)));
      subscriptions.add(this.model.onDidReplaceChild(this.childReplaced.bind(this)));
      subscriptions.add(this.model.observeFlexScale(this.flexScaleChanged.bind(this)));
      return subscriptions;
    };

    PaneAxisElement.prototype.isPaneResizeHandleElement = function(element) {
      return (element != null ? element.nodeName.toLowerCase() : void 0) === 'atom-pane-resize-handle';
    };

    PaneAxisElement.prototype.childAdded = function(arg) {
      var child, index, nextElement, prevElement, resizeHandle, view;
      child = arg.child, index = arg.index;
      view = this.viewRegistry.getView(child);
      this.insertBefore(view, this.children[index * 2]);
      prevElement = view.previousSibling;
      if ((prevElement != null) && !this.isPaneResizeHandleElement(prevElement)) {
        resizeHandle = document.createElement('atom-pane-resize-handle');
        this.insertBefore(resizeHandle, view);
      }
      nextElement = view.nextSibling;
      if ((nextElement != null) && !this.isPaneResizeHandleElement(nextElement)) {
        resizeHandle = document.createElement('atom-pane-resize-handle');
        return this.insertBefore(resizeHandle, nextElement);
      }
    };

    PaneAxisElement.prototype.childRemoved = function(arg) {
      var child, siblingView, view;
      child = arg.child;
      view = this.viewRegistry.getView(child);
      siblingView = view.previousSibling;
      if ((siblingView != null) && this.isPaneResizeHandleElement(siblingView)) {
        siblingView.remove();
      }
      return view.remove();
    };

    PaneAxisElement.prototype.childReplaced = function(arg) {
      var focusedElement, index, newChild, oldChild;
      index = arg.index, oldChild = arg.oldChild, newChild = arg.newChild;
      if (this.hasFocus()) {
        focusedElement = document.activeElement;
      }
      this.childRemoved({
        child: oldChild,
        index: index
      });
      this.childAdded({
        child: newChild,
        index: index
      });
      if (document.activeElement === document.body) {
        return focusedElement != null ? focusedElement.focus() : void 0;
      }
    };

    PaneAxisElement.prototype.flexScaleChanged = function(flexScale) {
      return this.style.flexGrow = flexScale;
    };

    PaneAxisElement.prototype.hasFocus = function() {
      return this === document.activeElement || this.contains(document.activeElement);
    };

    return PaneAxisElement;

  })(HTMLElement);

  module.exports = PaneAxisElement = document.registerElement('atom-pane-axis', {
    prototype: PaneAxisElement.prototype
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3BhbmUtYXhpcy1lbGVtZW50LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsNkRBQUE7SUFBQTs7O0VBQUMsc0JBQXVCLE9BQUEsQ0FBUSxXQUFSOztFQUN4Qix1QkFBQSxHQUEwQixPQUFBLENBQVEsOEJBQVI7O0VBRXBCOzs7Ozs7OzhCQUNKLGdCQUFBLEdBQWtCLFNBQUE7QUFDaEIsVUFBQTs7UUFBQSxJQUFDLENBQUEsZ0JBQWlCLElBQUMsQ0FBQSxnQkFBRCxDQUFBOztBQUNsQjtBQUFBO1dBQUEscURBQUE7O3FCQUFBLElBQUMsQ0FBQSxVQUFELENBQVk7VUFBQyxPQUFBLEtBQUQ7VUFBUSxPQUFBLEtBQVI7U0FBWjtBQUFBOztJQUZnQjs7OEJBSWxCLGdCQUFBLEdBQWtCLFNBQUE7QUFDaEIsVUFBQTtNQUFBLElBQUMsQ0FBQSxhQUFhLENBQUMsT0FBZixDQUFBO01BQ0EsSUFBQyxDQUFBLGFBQUQsR0FBaUI7QUFDakI7QUFBQTtXQUFBLHFDQUFBOztxQkFBQSxJQUFDLENBQUEsWUFBRCxDQUFjO1VBQUMsT0FBQSxLQUFEO1NBQWQ7QUFBQTs7SUFIZ0I7OzhCQUtsQixVQUFBLEdBQVksU0FBQyxLQUFELEVBQVMsWUFBVDtBQUNWLFVBQUE7TUFEVyxJQUFDLENBQUEsUUFBRDtNQUFRLElBQUMsQ0FBQSxlQUFEOztRQUNuQixJQUFDLENBQUEsZ0JBQWlCLElBQUMsQ0FBQSxnQkFBRCxDQUFBOztBQUNsQjtBQUFBLFdBQUEscURBQUE7O1FBQUEsSUFBQyxDQUFBLFVBQUQsQ0FBWTtVQUFDLE9BQUEsS0FBRDtVQUFRLE9BQUEsS0FBUjtTQUFaO0FBQUE7QUFFQSxjQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsY0FBUCxDQUFBLENBQVA7QUFBQSxhQUNPLFlBRFA7VUFFSSxJQUFDLENBQUEsU0FBUyxDQUFD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QUUsS0FBaEIsQ0FBQSxXQUFBOztJQUphOzs4QkFNZixnQkFBQSxHQUFrQixTQUFDLFNBQUQ7YUFBZSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVAsR0FBa0I7SUFBakM7OzhCQUVsQixRQUFBLEdBQVUsU0FBQTthQUNSLElBQUEsS0FBUSxRQUFRLENBQUMsYUFBakIsSUFBa0MsSUFBQyxDQUFBLFFBQUQsQ0FBVSxRQUFRLENBQUMsYUFBbkI7SUFEMUI7Ozs7S0FoRWtCOztFQW1FOUIsTUFBTSxDQUFDLE9BQVAsR0FBaUIsZUFBQSxHQUFrQixRQUFRLENBQUMsZUFBVCxDQUF5QixnQkFBekIsRUFBMkM7SUFBQSxTQUFBLEVBQVcsZUFBZSxDQUFDLFNBQTNCO0dBQTNDO0FBdEVuQyIsInNvdXJjZXNDb250ZW50IjpbIntDb21wb3NpdGVEaXNwb3NhYmxlfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcblBhbmVSZXNpemVIYW5kbGVFbGVtZW50ID0gcmVxdWlyZSAnLi9wYW5lLXJlc2l6ZS1oYW5kbGUtZWxlbWVudCdcblxuY2xhc3MgUGFuZUF4aXNFbGVtZW50IGV4dGVuZHMgSFRNTEVsZW1lbnRcbiAgYXR0YWNoZWRDYWxsYmFjazogLT5cbiAgICBAc3Vic2NyaXB0aW9ucyA/PSBAc3Vic2NyaWJlVG9Nb2RlbCgpXG4gICAgQGNoaWxkQWRkZWQoe2NoaWxkLCBpbmRleH0pIGZvciBjaGlsZCwgaW5kZXggaW4gQG1vZGVsLmdldENoaWxkcmVuKClcblxuICBkZXRhY2hlZENhbGxiYWNrOiAtPlxuICAgIEBzdWJzY3JpcHRpb25zLmRpc3Bvc2UoKVxuICAgIEBzdWJzY3JpcHRpb25zID0gbnVsbFxuICAgIEBjaGlsZFJlbW92ZWQoe2NoaWxkfSkgZm9yIGNoaWxkIGluIEBtb2RlbC5nZXRDaGlsZHJlbigpXG5cbiAgaW5pdGlhbGl6ZTogKEBtb2RlbCwgQHZpZXdSZWdpc3RyeSkgLT5cbiAgICBAc3Vic2NyaXB0aW9ucyA/PSBAc3Vic2NyaWJlVG9Nb2RlbCgpXG4gICAgQGNoaWxkQWRkZWQoe2NoaWxkLCBpbmRleH0pIGZvciBjaGlsZCwgaW5kZXggaW4gQG1vZGVsLmdldENoaWxkcmVuKClcblxuICAgIHN3aXRjaCBAbW9kZWwuZ2V0T3JpZW50YXRpb24oKVxuICAgICAgd2hlbiAnaG9yaXpvbnRhbCdcbiAgICAgICAgQGNsYXNzTGlzdC5hZGQoJ2hvcml6b250YWwnLCAncGFuZS1yb3cnKVxuICAgICAgd2hlbiAndmVydGljYWwnXG4gICAgICAgIEBjbGFzc0xpc3QuYWRkKCd2ZXJ0aWNhbCcsICdwYW5lLWNvbHVtbicpXG4gICAgdGhpc1xuXG4gIHN1YnNjcmliZVRvTW9kZWw6IC0+XG4gICAgc3Vic2NyaXB0aW9ucyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlXG4gICAgc3Vic2NyaXB0aW9ucy5hZGQgQG1vZGVsLm9uRGlkQWRkQ2hpbGQoQGNoaWxkQWRkZWQuYmluZCh0aGlzKSlcbiAgICBzdWJzY3JpcHRpb25zLmFkZCBAbW9kZWwub25EaWRSZW1vdmVDaGlsZChAY2hpbGRSZW1vdmVkLmJpbmQodGhpcykpXG4gICAgc3Vic2NyaXB0aW9ucy5hZGQgQG1vZGVsLm9uRGlkUmVwbGFjZUNoaWxkKEBjaGlsZFJlcGxhY2VkLmJpbmQodGhpcykpXG4gICAgc3Vic2NyaXB0aW9ucy5hZGQgQG1vZGVsLm9ic2VydmVGbGV4U2NhbGUoQGZsZXhTY2FsZUNoYW5nZWQuYmluZCh0aGlzKSlcbiAgICBzdWJzY3JpcHRpb25zXG5cbiAgaXNQYW5lUmVzaXplSGFuZGxlRWxlbWVudDogKGVsZW1lbnQpIC0+XG4gICAgZWxlbWVudD8ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSBpcyAnYXRvbS1wYW5lLXJlc2l6ZS1oYW5kbGUnXG5cbiAgY2hpbGRBZGRlZDogKHtjaGlsZCwgaW5kZXh9KSAtPlxuICAgIHZpZXcgPSBAdmlld1JlZ2lzdHJ5LmdldFZpZXcoY2hpbGQpXG4gICAgQGluc2VydEJlZm9yZSh2aWV3LCBAY2hpbGRyZW5baW5kZXggKiAyXSlcblxuICAgIHByZXZFbGVtZW50ID0gdmlldy5wcmV2aW91c1NpYmxpbmdcbiAgICAjIGlmIHByZXZpb3VzIGVsZW1lbnQgaXMgbm90IHBhbmUgcmVzaXplIGVsZW1lbnQsIHRoZW4gaW5zZXJ0IG5ldyByZXNpemUgZWxlbWVudFxuICAgIGlmIHByZXZFbGVtZW50PyBhbmQgbm90IEBpc1BhbmVSZXNpemVIYW5kbGVFbGVtZW50KHByZXZFbGVtZW50KVxuICAgICAgcmVzaXplSGFuZGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXRvbS1wYW5lLXJlc2l6ZS1oYW5kbGUnKVxuICAgICAgQGluc2VydEJlZm9yZShyZXNpemVIYW5kbGUsIHZpZXcpXG5cbiAgICBuZXh0RWxlbWVudCA9IHZpZXcubmV4dFNpYmxpbmdcbiAgICAjIGlmIG5leHQgZWxlbWVudCBpc25vdCByZXNpemUgZWxlbWVudCwgdGhlbiBpbnNlcnQgbmV3IHJlc2l6ZSBlbGVtZW50XG4gICAgaWYgbmV4dEVsZW1lbnQ/IGFuZCBub3QgQGlzUGFuZVJlc2l6ZUhhbmRsZUVsZW1lbnQobmV4dEVsZW1lbnQpXG4gICAgICByZXNpemVIYW5kbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhdG9tLXBhbmUtcmVzaXplLWhhbmRsZScpXG4gICAgICBAaW5zZXJ0QmVmb3JlKHJlc2l6ZUhhbmRsZSwgbmV4dEVsZW1lbnQpXG5cbiAgY2hpbGRSZW1vdmVkOiAoe2NoaWxkfSkgLT5cbiAgICB2aWV3ID0gQHZpZXdSZWdpc3RyeS5nZXRWaWV3KGNoaWxkKVxuICAgIHNpYmxpbmdWaWV3ID0gdmlldy5wcmV2aW91c1NpYmxpbmdcbiAgICAjIG1ha2Ugc3VyZSBuZXh0IHNpYmxpbmcgdmlldyBpcyBwYW5lIHJlc2l6ZSB2aWV3XG4gICAgaWYgc2libGluZ1ZpZXc/IGFuZCBAaXNQYW5lUmVzaXplSGFuZGxlRWxlbWVudChzaWJsaW5nVmlldylcbiAgICAgIHNpYmxpbmdWaWV3LnJlbW92ZSgpXG4gICAgdmlldy5yZW1vdmUoKVxuXG4gIGNoaWxkUmVwbGFjZWQ6ICh7aW5kZXgsIG9sZENoaWxkLCBuZXdDaGlsZH0pIC0+XG4gICAgZm9jdXNlZEVsZW1lbnQgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50IGlmIEBoYXNGb2N1cygpXG4gICAgQGNoaWxkUmVtb3ZlZCh7Y2hpbGQ6IG9sZENoaWxkLCBpbmRleH0pXG4gICAgQGNoaWxkQWRkZWQoe2NoaWxkOiBuZXdDaGlsZCwgaW5kZXh9KVxuICAgIGZvY3VzZWRFbGVtZW50Py5mb2N1cygpIGlmIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgaXMgZG9jdW1lbnQuYm9keVxuXG4gIGZsZXhTY2FsZUNoYW5nZWQ6IChmbGV4U2NhbGUpIC0+IEBzdHlsZS5mbGV4R3JvdyA9IGZsZXhTY2FsZVxuXG4gIGhhc0ZvY3VzOiAtPlxuICAgIHRoaXMgaXMgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCBvciBAY29udGFpbnMoZG9jdW1lbnQuYWN0aXZlRWxlbWVudClcblxubW9kdWxlLmV4cG9ydHMgPSBQYW5lQXhpc0VsZW1lbnQgPSBkb2N1bWVudC5yZWdpc3RlckVsZW1lbnQgJ2F0b20tcGFuZS1heGlzJywgcHJvdG90eXBlOiBQYW5lQXhpc0VsZW1lbnQucHJvdG90eXBlXG4iXX0=
