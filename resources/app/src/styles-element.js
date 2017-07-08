(function() {
  var CompositeDisposable, Emitter, StylesElement, ref,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  ref = require('event-kit'), Emitter = ref.Emitter, CompositeDisposable = ref.CompositeDisposable;

  StylesElement = (function(superClass) {
    extend(StylesElement, superClass);

    function StylesElement() {
      return StylesElement.__super__.constructor.apply(this, arguments);
    }

    StylesElement.prototype.subscriptions = null;

    StylesElement.prototype.context = null;

    StylesElement.prototype.onDidAddStyleElement = function(callback) {
      return this.emitter.on('did-add-style-element', callback);
    };

    StylesElement.prototype.onDidRemoveStyleElement = function(callback) {
      return this.emitter.on('did-remove-style-element', callback);
    };

    StylesElement.prototype.onDidUpdateStyleElement = function(callback) {
      return this.emitter.on('did-update-style-element', callback);
    };

    StylesElement.prototype.createdCallback = function() {
      this.subscriptions = new CompositeDisposable;
      this.emitter = new Emitter;
      return this.styleElementClonesByOriginalElement = new WeakMap;
    };

    StylesElement.prototype.attachedCallback = function() {
      var ref1;
      return this.context = (ref1 = this.getAttribute('context')) != null ? ref1 : void 0;
    };

    StylesElement.prototype.detachedCallback = function() {
      this.subscriptions.dispose();
      return this.subscriptions = new CompositeDisposable;
    };

    StylesElement.prototype.attributeChangedCallback = function(attrName, oldVal, newVal) {
      if (attrName === 'context') {
        return this.contextChanged();
      }
    };

    StylesElement.prototype.initialize = function(styleManager) {
      this.styleManager = styleManager;
      if (this.styleManager == null) {
        throw new Error("Must pass a styleManager parameter when initializing a StylesElement");
      }
      this.subscriptions.add(this.styleManager.observeStyleElements(this.styleElementAdded.bind(this)));
      this.subscriptions.add(this.styleManager.onDidRemoveStyleElement(this.styleElementRemoved.bind(this)));
      return this.subscriptions.add(this.styleManager.onDidUpdateStyleElement(this.styleElementUpdated.bind(this)));
    };

    StylesElement.prototype.contextChanged = function() {
      var child, i, j, len, len1, ref1, ref2, styleElement;
      if (this.subscriptions == null) {
        return;
      }
      ref1 = Array.prototype.slice.call(this.children);
      for (i = 0, len = ref1.length; i < len; i++) {
        child = ref1[i];
        this.styleElementRemoved(child);
      }
      this.context = this.getAttribute('context');
      ref2 = this.styleManager.getStyleElements();
      for (j = 0, len1 = ref2.length; j < len1; j++) {
        styleElement = ref2[j];
        this.styleElementAdded(styleElement);
      }
    };

    StylesElement.prototype.styleElementAdded = function(styleElement) {
      var child, i, insertBefore, len, priority, ref1, styleElementClone;
      if (!this.styleElementMatchesContext(styleElement)) {
        return;
      }
      styleElementClone = styleElement.cloneNode(true);
      styleElementClone.sourcePath = styleElement.sourcePath;
      styleElementClone.context = styleElement.context;
      styleElementClone.priority = styleElement.priority;
      this.styleElementClonesByOriginalElement.set(styleElement, styleElementClone);
      priority = styleElement.priority;
      if (priority != null) {
        ref1 = this.children;
        for (i = 0, len = ref1.length; i < len; i++) {
          child = ref1[i];
          if (child.priority > priority) {
            insertBefore = child;
            break;
          }
        }
      }
      this.insertBefore(styleElementClone, insertBefore);
      return this.emitter.emit('did-add-style-element', styleElementClone);
    };

    StylesElement.prototype.styleElementRemoved = function(styleElement) {
      var ref1, styleElementClone;
      if (!this.styleElementMatchesContext(styleElement)) {
        return;
      }
      styleElementClone = (ref1 = this.styleElementClonesByOriginalElement.get(styleElement)) != null ? ref1 : styleElement;
      styleElementClone.remove();
      return this.emitter.emit('did-remove-style-element', styleElementClone);
    };

    StylesElement.prototype.styleElementUpdated = function(styleElement) {
      var styleElementClone;
      if (!this.styleElementMatchesContext(styleElement)) {
        return;
      }
      styleElementClone = this.styleElementClonesByOriginalElement.get(styleElement);
      styleElementClone.textContent = styleElement.textContent;
      return this.emitter.emit('did-update-style-element', styleElementClone);
    };

    StylesElement.prototype.styleElementMatchesContext = function(styleElement) {
      return (this.context == null) || styleElement.context === this.context;
    };

    return StylesElement;

  })(HTMLElement);

  module.exports = StylesElement = document.registerElement('atom-styles', {
    prototype: StylesElement.prototype
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3N0eWxlcy1lbGVtZW50LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsZ0RBQUE7SUFBQTs7O0VBQUEsTUFBaUMsT0FBQSxDQUFRLFdBQVIsQ0FBakMsRUFBQyxxQkFBRCxFQUFVOztFQUVKOzs7Ozs7OzRCQUNKLGFBQUEsR0FBZTs7NEJBQ2YsT0FBQSxHQUFTOzs0QkFFVCxvQkFBQSxHQUFzQixTQUFDLFFBQUQ7YUFDcEIsSUFBQyxDQUFBLE9BQU8sQ0FBQyxFQUFULENBQVksdUJBQVosRUFBcUMsUUFBckM7SUFEb0I7OzRCQUd0Qix1QkFBQSxHQUF5QixTQUFDLFFBQUQ7YUFDdkIsSUFBQyxDQUFBLE9BQU8sQ0FBQyxFQUFULENBQVksMEJBQVosRUFBd0MsUUFBeEM7SUFEdUI7OzRCQUd6Qix1QkFBQSxHQUF5QixTQUFDLFFBQUQ7YUFDdkIsSUFBQyxDQUFBLE9BQU8sQ0FBQyxFQUFULENBQVksMEJBQVosRUFBd0MsUUFBeEM7SUFEdUI7OzRCQUd6QixlQUFBLEdBQWlCLFNBQUE7TUFDZixJQUFDLENBQUEsYUFBRCxHQUFpQixJQUFJO01BQ3JCLElBQUMsQ0FBQSxPQUFELEdBQVcsSUFBSTthQUNmLElBQUMsQ0FBQSxtQ0FBRCxHQUF1QyxJQUFJO0lBSDVCOzs0QkFLakIsZ0JBQUEsR0FBa0IsU0FBQTtBQUNoQixVQUFBO2FBQUEsSUFBQyxDQUFBLE9BQUQsMERBQXNDO0lBRHRCOzs0QkFHbEIsZ0JBQUEsR0FBa0IsU0FBQTtNQUNoQixJQUFDLENBQUEsYUFBYSxDQUFDLE9BQWYsQ0FBQTthQUNBLElBQUMsQ0FBQSxhQUFELEdBQWlCLElBQUk7SUFGTDs7NEJBSWxCLHdCQUFBLEdBQTBCLFNBQUMsUUFBRCxFQUFXLE1BQVgsRUFBbUIsTUFBbkI7TUFDeEIsSUFBcUIsUUFBQSxLQUFZLFNBQWpDO2VBQUEs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dEIsc0JBQUosSUFBaUIsWUFBWSxDQUFDLE9BQWIsS0FBd0IsSUFBQyxDQUFBO0lBRGhCOzs7O0tBNUVGOztFQStFNUIsTUFBTSxDQUFDLE9BQVAsR0FBaUIsYUFBQSxHQUFnQixRQUFRLENBQUMsZUFBVCxDQUF5QixhQUF6QixFQUF3QztJQUFBLFNBQUEsRUFBVyxhQUFhLENBQUMsU0FBekI7R0FBeEM7QUFqRmpDIiwic291cmNlc0NvbnRlbnQiOlsie0VtaXR0ZXIsIENvbXBvc2l0ZURpc3Bvc2FibGV9ID0gcmVxdWlyZSAnZXZlbnQta2l0J1xuXG5jbGFzcyBTdHlsZXNFbGVtZW50IGV4dGVuZHMgSFRNTEVsZW1lbnRcbiAgc3Vic2NyaXB0aW9uczogbnVsbFxuICBjb250ZXh0OiBudWxsXG5cbiAgb25EaWRBZGRTdHlsZUVsZW1lbnQ6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWFkZC1zdHlsZS1lbGVtZW50JywgY2FsbGJhY2tcblxuICBvbkRpZFJlbW92ZVN0eWxlRWxlbWVudDogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtcmVtb3ZlLXN0eWxlLWVsZW1lbnQnLCBjYWxsYmFja1xuXG4gIG9uRGlkVXBkYXRlU3R5bGVFbGVtZW50OiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC11cGRhdGUtc3R5bGUtZWxlbWVudCcsIGNhbGxiYWNrXG5cbiAgY3JlYXRlZENhbGxiYWNrOiAtPlxuICAgIEBzdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgICBAZW1pdHRlciA9IG5ldyBFbWl0dGVyXG4gICAgQHN0eWxlRWxlbWVudENsb25lc0J5T3JpZ2luYWxFbGVtZW50ID0gbmV3IFdlYWtNYXBcblxuICBhdHRhY2hlZENhbGxiYWNrOiAtPlxuICAgIEBjb250ZXh0ID0gQGdldEF0dHJpYnV0ZSgnY29udGV4dCcpID8gdW5kZWZpbmVkXG5cbiAgZGV0YWNoZWRDYWxsYmFjazogLT5cbiAgICBAc3Vic2NyaXB0aW9ucy5kaXNwb3NlKClcbiAgICBAc3Vic2NyaXB0aW9ucyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlXG5cbiAgYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrOiAoYXR0ck5hbWUsIG9sZFZhbCwgbmV3VmFsKSAtPlxuICAgIEBjb250ZXh0Q2hhbmdlZCgpIGlmIGF0dHJOYW1lIGlzICdjb250ZXh0J1xuXG4gIGluaXRpYWxpemU6IChAc3R5bGVNYW5hZ2VyKSAtPlxuICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgcGFzcyBhIHN0eWxlTWFuYWdlciBwYXJhbWV0ZXIgd2hlbiBpbml0aWFsaXppbmcgYSBTdHlsZXNFbGVtZW50XCIpIHVubGVzcyBAc3R5bGVNYW5hZ2VyP1xuXG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkIEBzdHlsZU1hbmFnZXIub2JzZXJ2ZVN0eWxlRWxlbWVudHMoQHN0eWxlRWxlbWVudEFkZGVkLmJpbmQodGhpcykpXG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkIEBzdHlsZU1hbmFnZXIub25EaWRSZW1vdmVTdHlsZUVsZW1lbnQoQHN0eWxlRWxlbWVudFJlbW92ZWQuYmluZCh0aGlzKSlcbiAgICBAc3Vic2NyaXB0aW9ucy5hZGQgQHN0eWxlTWFuYWdlci5vbkRpZFVwZGF0ZVN0eWxlRWxlbWVudChAc3R5bGVFbGVtZW50VXBkYXRlZC5iaW5kKHRoaXMpKVxuXG4gIGNvbnRleHRDaGFuZ2VkOiAtPlxuICAgIHJldHVybiB1bmxlc3MgQHN1YnNjcmlwdGlvbnM/XG5cbiAgICBAc3R5bGVFbGVtZW50UmVtb3ZlZChjaGlsZCkgZm9yIGNoaWxkIGluIEFycmF5OjpzbGljZS5jYWxsKEBjaGlsZHJlbilcbiAgICBAY29udGV4dCA9IEBnZXRBdHRyaWJ1dGUoJ2NvbnRleHQnKVxuICAgIEBzdHlsZUVsZW1lbnRBZGRlZChzdHlsZUVsZW1lbnQpIGZvciBzdHlsZUVsZW1lbnQgaW4gQHN0eWxlTWFuYWdlci5nZXRTdHlsZUVsZW1lbnRzKClcbiAgICByZXR1cm5cblxuICBzdHlsZUVsZW1lbnRBZGRlZDogKHN0eWxlRWxlbWVudCkgLT5cbiAgICByZXR1cm4gdW5sZXNzIEBzdHlsZUVsZW1lbnRNYXRjaGVzQ29udGV4dChzdHlsZUVsZW1lbnQpXG5cbiAgICBzdHlsZUVsZW1lbnRDbG9uZSA9IHN0eWxlRWxlbWVudC5jbG9uZU5vZGUodHJ1ZSlcbiAgICBzdHlsZUVsZW1lbnRDbG9uZS5zb3VyY2VQYXRoID0gc3R5bGVFbGVtZW50LnNvdXJjZVBhdGhcbiAgICBzdHlsZUVsZW1lbnRDbG9uZS5jb250ZXh0ID0gc3R5bGVFbGVtZW50LmNvbnRleHRcbiAgICBzdHlsZUVsZW1lbnRDbG9uZS5wcmlvcml0eSA9IHN0eWxlRWxlbWVudC5wcmlvcml0eVxuICAgIEBzdHlsZUVsZW1lbnRDbG9uZXNCeU9yaWdpbmFsRWxlbWVudC5zZXQoc3R5bGVFbGVtZW50LCBzdHlsZUVsZW1lbnRDbG9uZSlcblxuICAgIHByaW9yaXR5ID0gc3R5bGVFbGVtZW50LnByaW9yaXR5XG4gICAgaWYgcHJpb3JpdHk/XG4gICAgICBmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG4gICAgICAgIGlmIGNoaWxkLnByaW9yaXR5ID4gcHJpb3JpdHlcbiAgICAgICAgICBpbnNlcnRCZWZvcmUgPSBjaGlsZFxuICAgICAgICAgIGJyZWFrXG5cbiAgICBAaW5zZXJ0QmVmb3JlKHN0eWxlRWxlbWVudENsb25lLCBpbnNlcnRCZWZvcmUpXG4gICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWFkZC1zdHlsZS1lbGVtZW50Jywgc3R5bGVFbGVtZW50Q2xvbmVcblxuICBzdHlsZUVsZW1lbnRSZW1vdmVkOiAoc3R5bGVFbGVtZW50KSAtPlxuICAgIHJldHVybiB1bmxlc3MgQHN0eWxlRWxlbWVudE1hdGNoZXNDb250ZXh0KHN0eWxlRWxlbWVudClcblxuICAgIHN0eWxlRWxlbWVudENsb25lID0gQHN0eWxlRWxlbWVudENsb25lc0J5T3JpZ2luYWxFbGVtZW50LmdldChzdHlsZUVsZW1lbnQpID8gc3R5bGVFbGVtZW50XG4gICAgc3R5bGVFbGVtZW50Q2xvbmUucmVtb3ZlKClcbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtcmVtb3ZlLXN0eWxlLWVsZW1lbnQnLCBzdHlsZUVsZW1lbnRDbG9uZVxuXG4gIHN0eWxlRWxlbWVudFVwZGF0ZWQ6IChzdHlsZUVsZW1lbnQpIC0+XG4gICAgcmV0dXJuIHVubGVzcyBAc3R5bGVFbGVtZW50TWF0Y2hlc0NvbnRleHQoc3R5bGVFbGVtZW50KVxuXG4gICAgc3R5bGVFbGVtZW50Q2xvbmUgPSBAc3R5bGVFbGVtZW50Q2xvbmVzQnlPcmlnaW5hbEVsZW1lbnQuZ2V0KHN0eWxlRWxlbWVudClcbiAgICBzdHlsZUVsZW1lbnRDbG9uZS50ZXh0Q29udGVudCA9IHN0eWxlRWxlbWVudC50ZXh0Q29udGVudFxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC11cGRhdGUtc3R5bGUtZWxlbWVudCcsIHN0eWxlRWxlbWVudENsb25lXG5cbiAgc3R5bGVFbGVtZW50TWF0Y2hlc0NvbnRleHQ6IChzdHlsZUVsZW1lbnQpIC0+XG4gICAgbm90IEBjb250ZXh0PyBvciBzdHlsZUVsZW1lbnQuY29udGV4dCBpcyBAY29udGV4dFxuXG5tb2R1bGUuZXhwb3J0cyA9IFN0eWxlc0VsZW1lbnQgPSBkb2N1bWVudC5yZWdpc3RlckVsZW1lbnQgJ2F0b20tc3R5bGVzJywgcHJvdG90eXBlOiBTdHlsZXNFbGVtZW50LnByb3RvdHlwZVxuIl19
