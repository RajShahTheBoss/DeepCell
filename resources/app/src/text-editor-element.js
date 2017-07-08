(function() {
  var CompositeDisposable, Emitter, Grim, TextBuffer, TextEditorComponent, TextEditorElement, ref,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    slice = [].slice;

  Grim = require('grim');

  ref = require('event-kit'), Emitter = ref.Emitter, CompositeDisposable = ref.CompositeDisposable;

  TextBuffer = require('text-buffer');

  TextEditorComponent = require('./text-editor-component');

  TextEditorElement = (function(superClass) {
    extend(TextEditorElement, superClass);

    function TextEditorElement() {
      return TextEditorElement.__super__.constructor.apply(this, arguments);
    }

    TextEditorElement.prototype.model = null;

    TextEditorElement.prototype.componentDescriptor = null;

    TextEditorElement.prototype.component = null;

    TextEditorElement.prototype.attached = false;

    TextEditorElement.prototype.tileSize = null;

    TextEditorElement.prototype.focusOnAttach = false;

    TextEditorElement.prototype.hasTiledRendering = true;

    TextEditorElement.prototype.logicalDisplayBuffer = true;

    TextEditorElement.prototype.lightDOM = true;

    TextEditorElement.prototype.createdCallback = function() {
      this.themes = atom.themes;
      this.workspace = atom.workspace;
      this.assert = atom.assert;
      this.views = atom.views;
      this.styles = atom.styles;
      this.emitter = new Emitter;
      this.subscriptions = new CompositeDisposable;
      this.hiddenInputElement = document.createElement('input');
      this.hiddenInputElement.classList.add('hidden-input');
      this.hiddenInputElement.setAttribute('tabindex', -1);
      this.hiddenInputElement.setAttribute('data-react-skip-selection-restoration', true);
      this.hiddenInputElement.style['-webkit-transform'] = 'translateZ(0)';
      this.hiddenInputElement.addEventListener('paste', function(event) {
        return event.preventDefault();
      });
      this.addEventListener('focus', this.focused.bind(this));
      this.addEventListener('blur', this.blurred.bind(this));
      this.hiddenInputElement.addEventListener('focus', this.focused.bind(this));
      this.hiddenInputElement.addEventListener('blur', this.inputNodeBlurred.bind(this));
      this.classList.add('editor');
      return this.setAttribute('tabindex', -1);
    };

    TextEditorElement.prototype.initializeContent = function(attributes) {
      Object.defineProperty(this, 'shadowRoot', {
        get: (function(_this) {
          return function() {
            Grim.deprecate("The contents of `atom-text-editor` elements are no longer encapsulated\nwithin a shadow DOM boundary. Please, stop using `shadowRoot` and access\nthe editor contents directly instead.");
            return _this;
          };
        })(this)
      });
      this.rootElement = document.createElement('div');
      this.rootElement.classList.add('editor--private');
      return this.appendChild(this.rootElement);
    };

    TextEditorElement.prototype.attachedCallback = function() {
      if (this.getModel() == null) {
        this.buildModel();
      }
      this.assert(this.model.isAlive(), "Attaching a view for a destroyed editor");
      if (this.component == null) {
        this.mountComponent();
      }
      this.listenForComponentEvents();
      this.component.checkForVisibilityChange();
      if (this.hasFocus()) {
        this.focused();
      }
      return this.emitter.emit("did-attach");
    };

    TextEditorElement.prototype.detachedCallback = function() {
      this.unmountComponent();
      this.subscriptions.dispose();
      this.subscriptions = new CompositeDisposable;
      return this.emitter.emit("did-detach");
    };

    TextEditorElement.prototype.listenForComponentEvents = function() {
      this.subscriptions.add(this.component.onDidChangeScrollTop((function(_this) {
        return function() {
          var ref1;
          return (ref1 = _this.emitter).emit.apply(ref1, ["did-change-scroll-top"].concat(slice.call(arguments)));
        };
      })(this)));
      return this.subscriptions.add(this.component.onDidChangeScrollLeft((function(_this) {
        return function() {
          var ref1;
          return (ref1 = _this.emitter).emit.apply(ref1, ["did-change-scroll-left"].concat(slice.call(arguments)));
        };
      })(this)));
    };

    TextEditorElement.prototype.initialize = function(model, arg) {
      this.views = arg.views, this.themes = arg.themes, this.workspace = arg.workspace, this.assert = arg.assert, this.styles = arg.styles;
      if (this.views == null) {
        throw new Error("Must pass a views parameter when initializing TextEditorElements");
      }
      if (this.themes == null) {
        throw new Error("Must pass a themes parameter when initializing TextEditorElements");
      }
      if (this.workspace == null) {
        throw new Error("Must pass a workspace parameter when initializing TextEditorElements");
      }
      if (this.assert == null) {
        throw new Error("Must pass an assert parameter when initializing TextEditorElements");
      }
      if (this.styles == null) {
        throw new Error("Must pass a styles parameter when initializing TextEditorElements");
      }
      this.setModel(model);
      return this;
    };

    TextEditorElement.prototype.setModel = function(model) {
      if (this.model != null) {
        throw new Error("Model already assigned on TextEditorElement");
      }
      if (model.isDestroyed()) {
        return;
      }
      this.model = model;
      this.model.setUpdatedSynchronously(this.isUpdatedSynchronously());
      this.initializeContent();
      this.mountComponent();
      this.addGrammarScopeAttribute();
      if (this.model.isMini()) {
        this.addMiniAttribute();
      }
      this.addEncodingAttribute();
      this.model.onDidChangeGrammar((function(_this) {
        return function() {
          return _this.addGrammarScopeAttribute();
        };
      })(this));
      this.model.onDidChangeEncoding((function(_this) {
        return function() {
          return _this.addEncodingAttribute();
        };
      })(this));
      this.model.onDidDestroy((function(_this) {
        return function() {
          return _this.unmountComponent();
        };
      })(this));
      this.model.onDidChangeMini((function(_this) {
        return function(mini) {
          if (mini) {
            return _this.addMiniAttribute();
          } else {
            return _this.removeMiniAttribute();
          }
        };
      })(this));
      return this.model;
    };

    TextEditorElement.prototype.getModel = function() {
      var ref1;
      return (ref1 = this.model) != null ? ref1 : this.buildModel();
    };

    TextEditorElement.prototype.buildModel = function() {
      return this.setModel(this.workspace.buildTextEditor({
        buffer: new TextBuffer({
          text: this.textContent,
          shouldDestroyOnFileDelete: function() {
            return atom.config.get('core.closeDeletedFileTabs');
          }
        }),
        softWrapped: false,
        tabLength: 2,
        softTabs: true,
        mini: this.hasAttribute('mini'),
        lineNumberGutterVisible: !this.hasAttribute('gutter-hidden'),
        placeholderText: this.getAttribute('placeholder-text')
      }));
    };

    TextEditorElement.prototype.mountComponent = function() {
      this.component = new TextEditorComponent({
        hostElement: this,
        editor: this.model,
        tileSize: this.tileSize,
        views: this.views,
        themes: this.themes,
        styles: this.styles,
        workspace: this.workspace,
        assert: this.assert,
        hiddenInputElement: this.hiddenInputElement
      });
      return this.rootElement.appendChild(this.component.getDomNode());
    };

    TextEditorElement.prototype.unmountComponent = function() {
      if (this.component != null) {
        this.component.destroy();
        this.component.getDomNode().remove();
        return this.component = null;
      }
    };

    TextEditorElement.prototype.focused = function(event) {
      var ref1;
      if ((ref1 = this.component) != null) {
        ref1.focused();
      }
      return this.hiddenInputElement.focus();
    };

    TextEditorElement.prototype.blurred = function(event) {
      var ref1;
      if (event.relatedTarget === this.hiddenInputElement) {
        event.stopImmediatePropagation();
        return;
      }
      return (ref1 = this.component) != null ? ref1.blurred() : void 0;
    };

    TextEditorElement.prototype.inputNodeBlurred = function(event) {
      if (event.relatedTarget !== this) {
        return this.dispatchEvent(new FocusEvent('blur', {
          relatedTarget: event.relatedTarget,
          bubbles: false
        }));
      }
    };

    TextEditorElement.prototype.addGrammarScopeAttribute = function() {
      var ref1, ref2;
      return this.dataset.grammar = (ref1 = this.model.getGrammar()) != null ? (ref2 = ref1.scopeName) != null ? ref2.replace(/\./g, ' ') : void 0 : void 0;
    };

    TextEditorElement.prototype.addMiniAttribute = function() {
      return this.setAttributeNode(document.createAttribute("mini"));
    };

    TextEditorElement.prototype.removeMiniAttribute = function() {
      return this.removeAttribute("mini");
    };

    TextEditorElement.prototype.addEncodingAttribute = function() {
      return this.dataset.encoding = this.model.getEncoding();
    };

    TextEditorElement.prototype.hasFocus = function() {
      return this === document.activeElement || this.contains(document.activeElement);
    };

    TextEditorElement.prototype.setUpdatedSynchronously = function(updatedSynchronously) {
      var ref1;
      this.updatedSynchronously = updatedSynchronously;
      if ((ref1 = this.model) != null) {
        ref1.setUpdatedSynchronously(this.updatedSynchronously);
      }
      return this.updatedSynchronously;
    };

    TextEditorElement.prototype.isUpdatedSynchronously = function() {
      return this.updatedSynchronously;
    };

    TextEditorElement.prototype.setContinuousReflow = function(continuousReflow) {
      var ref1;
      return (ref1 = this.component) != null ? ref1.setContinuousReflow(continuousReflow) : void 0;
    };

    TextEditorElement.prototype.getDefaultCharacterWidth = function() {
      return this.getModel().getDefaultCharWidth();
    };

    TextEditorElement.prototype.getMaxScrollTop = function() {
      var ref1;
      return (ref1 = this.component) != null ? ref1.getMaxScrollTop() : void 0;
    };

    TextEditorElement.prototype.pixelPositionForBufferPosition = function(bufferPosition) {
      return this.component.pixelPositionForBufferPosition(bufferPosition);
    };

    TextEditorElement.prototype.pixelPositionForScreenPosition = function(screenPosition) {
      return this.component.pixelPositionForScreenPosition(screenPosition);
    };

    TextEditorElement.prototype.getFirstVisibleScreenRow = function() {
      return this.getVisibleRowRange()[0];
    };

    TextEditorElement.prototype.getLastVisibleScreenRow = function() {
      return this.getVisibleRowRange()[1];
    };

    TextEditorElement.prototype.onDidAttach = function(callback) {
      return this.emitter.on("did-attach", callback);
    };

    TextEditorElement.prototype.onDidDetach = function(callback) {
      return this.emitter.on("did-detach", callback);
    };

    TextEditorElement.prototype.onDidChangeScrollTop = function(callback) {
      return this.emitter.on("did-change-scroll-top", callback);
    };

    TextEditorElement.prototype.onDidChangeScrollLeft = function(callback) {
      return this.emitter.on("did-change-scroll-left", callback);
    };

    TextEditorElement.prototype.setScrollLeft = function(scrollLeft) {
      return this.component.setScrollLeft(scrollLeft);
    };

    TextEditorElement.prototype.setScrollRight = function(scrollRight) {
      return this.component.setScrollRight(scrollRight);
    };

    TextEditorElement.prototype.setScrollTop = function(scrollTop) {
      return this.component.setScrollTop(scrollTop);
    };

    TextEditorElement.prototype.setScrollBottom = function(scrollBottom) {
      return this.component.setScrollBottom(scrollBottom);
    };

    TextEditorElement.prototype.scrollToTop = function() {
      return this.setScrollTop(0);
    };

    TextEditorElement.prototype.scrollToBottom = function() {
      return this.setScrollBottom(2e308);
    };

    TextEditorElement.prototype.getScrollTop = function() {
      var ref1;
      return ((ref1 = this.component) != null ? ref1.getScrollTop() : void 0) || 0;
    };

    TextEditorElement.prototype.getScrollLeft = function() {
      var ref1;
      return ((ref1 = this.component) != null ? ref1.getScrollLeft() : void 0) || 0;
    };

    TextEditorElement.prototype.getScrollRight = function() {
      var ref1;
      return ((ref1 = this.component) != null ? ref1.getScrollRight() : void 0) || 0;
    };

    TextEditorElement.prototype.getScrollBottom = function() {
      var ref1;
      return ((ref1 = this.component) != null ? ref1.getScrollBottom() : void 0) || 0;
    };

    TextEditorElement.prototype.getScrollHeight = function() {
      var ref1;
      return ((ref1 = this.component) != null ? ref1.getScrollHeight() : void 0) || 0;
    };

    TextEditorElement.prototype.getScrollWidth = function() {
      var ref1;
      return ((ref1 = this.component) != null ? ref1.getScrollWidth() : void 0) || 0;
    };

    TextEditorElement.prototype.getVerticalScrollbarWidth = function() {
      var ref1;
      return ((ref1 = this.component) != null ? ref1.getVerticalScrollbarWidth() : void 0) || 0;
    };

    TextEditorElement.prototype.getHorizontalScrollbarHeight = function() {
      var ref1;
      return ((ref1 = this.component) != null ? ref1.getHorizontalScrollbarHeight() : void 0) || 0;
    };

    TextEditorElement.prototype.getVisibleRowRange = function() {
      var ref1;
      return ((ref1 = this.component) != null ? ref1.getVisibleRowRange() : void 0) || [0, 0];
    };

    TextEditorElement.prototype.intersectsVisibleRowRange = function(startRow, endRow) {
      var ref1, visibleEnd, visibleStart;
      ref1 = this.getVisibleRowRange(), visibleStart = ref1[0], visibleEnd = ref1[1];
      return !(endRow <= visibleStart || visibleEnd <= startRow);
    };

    TextEditorElement.prototype.selectionIntersectsVisibleRowRange = function(selection) {
      var end, ref1, start;
      ref1 = selection.getScreenRange(), start = ref1.start, end = ref1.end;
      return this.intersectsVisibleRowRange(start.row, end.row + 1);
    };

    TextEditorElement.prototype.screenPositionForPixelPosition = function(pixelPosition) {
      return this.component.screenPositionForPixelPosition(pixelPosition);
    };

    TextEditorElement.prototype.pixelRectForScreenRange = function(screenRange) {
      return this.component.pixelRectForScreenRange(screenRange);
    };

    TextEditorElement.prototype.pixelRangeForScreenRange = function(screenRange) {
      return this.component.pixelRangeForScreenRange(screenRange);
    };

    TextEditorElement.prototype.setWidth = function(width) {
      return this.style.width = (this.component.getGutterWidth() + width) + "px";
    };

    TextEditorElement.prototype.getWidth = function() {
      return this.offsetWidth - this.component.getGutterWidth();
    };

    TextEditorElement.prototype.setHeight = function(height) {
      return this.style.height = height + "px";
    };

    TextEditorElement.prototype.getHeight = function() {
      return this.offsetHeight;
    };

    TextEditorElement.prototype.invalidateBlockDecorationDimensions = function() {
      var ref1;
      return (ref1 = this.component).invalidateBlockDecorationDimensions.apply(ref1, arguments);
    };

    return TextEditorElement;

  })(HTMLElement);

  module.exports = TextEditorElement = document.registerElement('atom-text-editor', {
    prototype: TextEditorElement.prototype
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3RleHQtZWRpdG9yLWVsZW1lbnQuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSwyRkFBQTtJQUFBOzs7O0VBQUEsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLE1BQWlDLE9BQUEsQ0FBUSxXQUFSLENBQWpDLEVBQUMscUJBQUQsRUFBVTs7RUFDVixVQUFBLEdBQWEsT0FBQSxDQUFRLGFBQVI7O0VBQ2IsbUJBQUEsR0FBc0IsT0FBQSxDQUFRLHlCQUFSOztFQUVoQjs7Ozs7OztnQ0FDSixLQUFBLEdBQU87O2dDQUNQLG1CQUFBLEdBQXFCOztnQ0FDckIsU0FBQSxHQUFXOztnQ0FDWCxRQUFBLEdBQVU7O2dDQUNWLFFBQUEsR0FBVTs7Z0NBQ1YsYUFBQSxHQUFlOztnQ0FDZixpQkFBQSxHQUFtQjs7Z0NBQ25CLG9CQUFBLEdBQXNCOztnQ0FDdEIsUUFBQSxHQUFVOztnQ0FFVixlQUFBLEdBQWlCLFNBQUE7TUFFZixJQUFDLENBQUEsTUFBRCxHQUFVLElBQUksQ0FBQztNQUNmLElBQUMsQ0FBQSxTQUFELEdBQWEsSUFBSSxDQUFDO01BQ2xCLElBQUMsQ0FBQSxNQUFELEdBQVUsSUFBSSxDQUFDO01BQ2YsSUFBQyxDQUFBLEtBQUQsR0FBUyxJQUFJLENBQUM7TUFDZCxJQUFDLENBQUEsTUFBRCxHQUFVLElBQUksQ0FBQztNQUVmLElBQUMsQ0FBQSxPQUFELEdBQVcsSUFBSTtNQUNmLElBQUMsQ0FBQSxhQUFELEdBQWlCLElBQUk7TUFFckIsSUFBQyxDQUFBLGtCQUFELEdBQXNCLFFBQVEsQ0FBQyxhQUFULENBQXVCLE9BQXZCO01BQ3RCLElBQUMsQ0FBQSxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsR0FBOUIsQ0FBa0MsY0FBbEM7TUFDQSxJQUFDLENBQUEsa0JBQWtCLENBQUMsWUFBcEIsQ0FBaUMsVUFB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Q0FBQSxTQUFTLENBQUMsdUJBQVgsQ0FBbUMsV0FBbkM7SUFEdUI7O2dDQUd6Qix3QkFBQSxHQUEwQixTQUFDLFdBQUQ7YUFDeEIsSUFBQyxDQUFBLFNBQVMsQ0FBQyx3QkFBWCxDQUFvQyxXQUFwQztJQUR3Qjs7Z0NBRzFCLFFBQUEsR0FBVSxTQUFDLEtBQUQ7YUFDUixJQUFDLENBQUEsS0FBSyxDQUFDLEtBQVAsR0FBZSxDQUFDLElBQUMsQ0FBQSxTQUFTLENBQUMsY0FBWCxDQUFBLENBQUEsR0FBOEIsS0FBL0IsQ0FBQSxHQUF3QztJQUQvQzs7Z0NBR1YsUUFBQSxHQUFVLFNBQUE7YUFDUixJQUFDLENBQUEsV0FBRCxHQUFlLElBQUMsQ0FBQSxTQUFTLENBQUMsY0FBWCxDQUFBO0lBRFA7O2dDQUdWLFNBQUEsR0FBVyxTQUFDLE1BQUQ7YUFDVCxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQVAsR0FBZ0IsTUFBQSxHQUFTO0lBRGhCOztnQ0FHWCxTQUFBLEdBQVcsU0FBQTthQUNULElBQUMsQ0FBQTtJQURROztnQ0FTWCxtQ0FBQSxHQUFxQyxTQUFBO0FBQ25DLFVBQUE7YUFBQSxRQUFBLElBQUMsQ0FBQSxTQUFELENBQVUsQ0FBQyxtQ0FBWCxhQUErQyxTQUEvQztJQURtQzs7OztLQWxVUDs7RUFxVWhDLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLGlCQUFBLEdBQW9CLFFBQVEsQ0FBQyxlQUFULENBQXlCLGtCQUF6QixFQUE2QztJQUFBLFNBQUEsRUFBVyxpQkFBaUIsQ0FBQyxTQUE3QjtHQUE3QztBQTFVckMiLCJzb3VyY2VzQ29udGVudCI6WyJHcmltID0gcmVxdWlyZSAnZ3JpbSdcbntFbWl0dGVyLCBDb21wb3NpdGVEaXNwb3NhYmxlfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcblRleHRCdWZmZXIgPSByZXF1aXJlICd0ZXh0LWJ1ZmZlcidcblRleHRFZGl0b3JDb21wb25lbnQgPSByZXF1aXJlICcuL3RleHQtZWRpdG9yLWNvbXBvbmVudCdcblxuY2xhc3MgVGV4dEVkaXRvckVsZW1lbnQgZXh0ZW5kcyBIVE1MRWxlbWVudFxuICBtb2RlbDogbnVsbFxuICBjb21wb25lbnREZXNjcmlwdG9yOiBudWxsXG4gIGNvbXBvbmVudDogbnVsbFxuICBhdHRhY2hlZDogZmFsc2VcbiAgdGlsZVNpemU6IG51bGxcbiAgZm9jdXNPbkF0dGFjaDogZmFsc2VcbiAgaGFzVGlsZWRSZW5kZXJpbmc6IHRydWVcbiAgbG9naWNhbERpc3BsYXlCdWZmZXI6IHRydWVcbiAgbGlnaHRET006IHRydWVcblxuICBjcmVhdGVkQ2FsbGJhY2s6IC0+XG4gICAgIyBVc2UgZ2xvYmFscyB3aGVuIHRoZSBmb2xsb3dpbmcgaW5zdGFuY2UgdmFyaWFibGVzIGFyZW4ndCBzZXQuXG4gICAgQHRoZW1lcyA9IGF0b20udGhlbWVzXG4gICAgQHdvcmtzcGFjZSA9IGF0b20ud29ya3NwYWNlXG4gICAgQGFzc2VydCA9IGF0b20uYXNzZXJ0XG4gICAgQHZpZXdzID0gYXRvbS52aWV3c1xuICAgIEBzdHlsZXMgPSBhdG9tLnN0eWxlc1xuXG4gICAgQGVtaXR0ZXIgPSBuZXcgRW1pdHRlclxuICAgIEBzdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcblxuICAgIEBoaWRkZW5JbnB1dEVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpXG4gICAgQGhpZGRlbklucHV0RWxlbWVudC5jbGFzc0xpc3QuYWRkKCdoaWRkZW4taW5wdXQnKVxuICAgIEBoaWRkZW5JbnB1dEVsZW1lbnQuc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsIC0xKVxuICAgIEBoaWRkZW5JbnB1dEVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLXJlYWN0LXNraXAtc2VsZWN0aW9uLXJlc3RvcmF0aW9uJywgdHJ1ZSlcbiAgICBAaGlkZGVuSW5wdXRFbGVtZW50LnN0eWxlWyctd2Via2l0LXRyYW5zZm9ybSddID0gJ3RyYW5zbGF0ZVooMCknXG4gICAgQGhpZGRlbklucHV0RWxlbWVudC5hZGRFdmVudExpc3RlbmVyICdwYXN0ZScsIChldmVudCkgLT4gZXZlbnQucHJldmVudERlZmF1bHQoKVxuXG4gICAgQGFkZEV2ZW50TGlzdGVuZXIgJ2ZvY3VzJywgQGZvY3VzZWQuYmluZCh0aGlzKVxuICAgIEBhZGRFdmVudExpc3RlbmVyICdibHVyJywgQGJsdXJyZWQuYmluZCh0aGlzKVxuICAgIEBoaWRkZW5JbnB1dEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lciAnZm9jdXMnLCBAZm9jdXNlZC5iaW5kKHRoaXMpXG4gICAgQGhpZGRlbklucHV0RWxlbWVudC5hZGRFdmVudExpc3RlbmVyICdibHVyJywgQGlucHV0Tm9kZUJsdXJyZWQuYmluZCh0aGlzKVxuXG4gICAgQGNsYXNzTGlzdC5hZGQoJ2VkaXRvcicpXG4gICAgQHNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAtMSlcblxuICBpbml0aWFsaXplQ29udGVudDogKGF0dHJpYnV0ZXMpIC0+XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdzaGFkb3dSb290Jywge1xuICAgICAgZ2V0OiA9PlxuICAgICAgICBHcmltLmRlcHJlY2F0ZShcIlwiXCJcbiAgICAgICAgVGhlIGNvbnRlbnRzIG9mIGBhdG9tLXRleHQtZWRpdG9yYCBlbGVtZW50cyBhcmUgbm8gbG9uZ2VyIGVuY2Fwc3VsYXRlZFxuICAgICAgICB3aXRoaW4gYSBzaGFkb3cgRE9NIGJvdW5kYXJ5LiBQbGVhc2UsIHN0b3AgdXNpbmcgYHNoYWRvd1Jvb3RgIGFuZCBhY2Nlc3NcbiAgICAgICAgdGhlIGVkaXRvciBjb250ZW50cyBkaXJlY3RseSBpbnN0ZWFkLlxuICAgICAgICBcIlwiXCIpXG4gICAgICAgIHRoaXNcbiAgICB9KVxuICAgIEByb290RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgQHJvb3RFbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2VkaXRvci0tcHJpdmF0ZScpXG4gICAgQGFwcGVuZENoaWxkKEByb290RWxlbWVudClcblxuICBhdHRhY2hlZENhbGxiYWNrOiAtPlxuICAgIEBidWlsZE1vZGVsKCkgdW5sZXNzIEBnZXRNb2RlbCgpP1xuICAgIEBhc3NlcnQoQG1vZGVsLmlzQWxpdmUoKSwgXCJBdHRhY2hpbmcgYSB2aWV3IGZvciBhIGRlc3Ryb3llZCBlZGl0b3JcIilcbiAgICBAbW91bnRDb21wb25lbnQoKSB1bmxlc3MgQGNvbXBvbmVudD9cbiAgICBAbGlzdGVuRm9yQ29tcG9uZW50RXZlbnRzKClcbiAgICBAY29tcG9uZW50LmNoZWNrRm9yVmlzaWJpbGl0eUNoYW5nZSgpXG4gICAgaWYgQGhhc0ZvY3VzKClcbiAgICAgIEBmb2N1c2VkKClcbiAgICBAZW1pdHRlci5lbWl0KFwiZGlkLWF0dGFjaFwiKVxuXG4gIGRldGFjaGVkQ2FsbGJhY2s6IC0+XG4gICAgQHVubW91bnRDb21wb25lbnQoKVxuICAgIEBzdWJzY3JpcHRpb25zLmRpc3Bvc2UoKVxuICAgIEBzdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgICBAZW1pdHRlci5lbWl0KFwiZGlkLWRldGFjaFwiKVxuXG4gIGxpc3RlbkZvckNvbXBvbmVudEV2ZW50czogLT5cbiAgICBAc3Vic2NyaXB0aW9ucy5hZGQgQGNvbXBvbmVudC5vbkRpZENoYW5nZVNjcm9sbFRvcCA9PlxuICAgICAgQGVtaXR0ZXIuZW1pdChcImRpZC1jaGFuZ2Utc2Nyb2xsLXRvcFwiLCBhcmd1bWVudHMuLi4pXG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkIEBjb21wb25lbnQub25EaWRDaGFuZ2VTY3JvbGxMZWZ0ID0+XG4gICAgICBAZW1pdHRlci5lbWl0KFwiZGlkLWNoYW5nZS1zY3JvbGwtbGVmdFwiLCBhcmd1bWVudHMuLi4pXG5cbiAgaW5pdGlhbGl6ZTogKG1vZGVsLCB7QHZpZXdzLCBAdGhlbWVzLCBAd29ya3NwYWNlLCBAYXNzZXJ0LCBAc3R5bGVzfSkgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IHBhc3MgYSB2aWV3cyBwYXJhbWV0ZXIgd2hlbiBpbml0aWFsaXppbmcgVGV4dEVkaXRvckVsZW1lbnRzXCIpIHVubGVzcyBAdmlld3M/XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwYXNzIGEgdGhlbWVzIHBhcmFtZXRlciB3aGVuIGluaXRpYWxpemluZyBUZXh0RWRpdG9yRWxlbWVudHNcIikgdW5sZXNzIEB0aGVtZXM/XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwYXNzIGEgd29ya3NwYWNlIHBhcmFtZXRlciB3aGVuIGluaXRpYWxpemluZyBUZXh0RWRpdG9yRWxlbWVudHNcIikgdW5sZXNzIEB3b3Jrc3BhY2U/XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwYXNzIGFuIGFzc2VydCBwYXJhbWV0ZXIgd2hlbiBpbml0aWFsaXppbmcgVGV4dEVkaXRvckVsZW1lbnRzXCIpIHVubGVzcyBAYXNzZXJ0P1xuICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgcGFzcyBhIHN0eWxlcyBwYXJhbWV0ZXIgd2hlbiBpbml0aWFsaXppbmcgVGV4dEVkaXRvckVsZW1lbnRzXCIpIHVubGVzcyBAc3R5bGVzP1xuXG4gICAgQHNldE1vZGVsKG1vZGVsKVxuICAgIHRoaXNcblxuICBzZXRNb2RlbDogKG1vZGVsKSAtPlxuICAgIHRocm93IG5ldyBFcnJvcihcIk1vZGVsIGFscmVhZHkgYXNzaWduZWQgb24gVGV4dEVkaXRvckVsZW1lbnRcIikgaWYgQG1vZGVsP1xuICAgIHJldHVybiBpZiBtb2RlbC5pc0Rlc3Ryb3llZCgpXG5cbiAgICBAbW9kZWwgPSBtb2RlbFxuICAgIEBtb2RlbC5zZXRVcGRhdGVkU3luY2hyb25vdXNseShAaXNVcGRhdGVkU3luY2hyb25vdXNseSgpKVxuICAgIEBpbml0aWFsaXplQ29udGVudCgpXG4gICAgQG1vdW50Q29tcG9uZW50KClcbiAgICBAYWRkR3JhbW1hclNjb3BlQXR0cmlidXRlKClcbiAgICBAYWRkTWluaUF0dHJpYnV0ZSgpIGlmIEBtb2RlbC5pc01pbmkoKVxuICAgIEBhZGRFbmNvZGluZ0F0dHJpYnV0ZSgpXG4gICAgQG1vZGVsLm9uRGlkQ2hhbmdlR3JhbW1hciA9PiBAYWRkR3JhbW1hclNjb3BlQXR0cmlidXRlKClcbiAgICBAbW9kZWwub25EaWRDaGFuZ2VFbmNvZGluZyA9PiBAYWRkRW5jb2RpbmdBdHRyaWJ1dGUoKVxuICAgIEBtb2RlbC5vbkRpZERlc3Ryb3kgPT4gQHVubW91bnRDb21wb25lbnQoKVxuICAgIEBtb2RlbC5vbkRpZENoYW5nZU1pbmkgKG1pbmkpID0+IGlmIG1pbmkgdGhlbiBAYWRkTWluaUF0dHJpYnV0ZSgpIGVsc2UgQHJlbW92ZU1pbmlBdHRyaWJ1dGUoKVxuICAgIEBtb2RlbFxuXG4gIGdldE1vZGVsOiAtPlxuICAgIEBtb2RlbCA/IEBidWlsZE1vZGVsKClcblxuICBidWlsZE1vZGVsOiAtPlxuICAgIEBzZXRNb2RlbChAd29ya3NwYWNlLmJ1aWxkVGV4dEVkaXRvcihcbiAgICAgIGJ1ZmZlcjogbmV3IFRleHRCdWZmZXIoe1xuICAgICAgICB0ZXh0OiBAdGV4dENvbnRlbnRcbiAgICAgICAgc2hvdWxkRGVzdHJveU9uRmlsZURlbGV0ZTpcbiAgICAgICAgICAtPiBhdG9tLmNvbmZpZy5nZXQoJ2NvcmUuY2xvc2VEZWxldGVkRmlsZVRhYnMnKX0pXG4gICAgICBzb2Z0V3JhcHBlZDogZmFsc2VcbiAgICAgIHRhYkxlbmd0aDogMlxuICAgICAgc29mdFRhYnM6IHRydWVcbiAgICAgIG1pbmk6IEBoYXNBdHRyaWJ1dGUoJ21pbmknKVxuICAgICAgbGluZU51bWJlckd1dHRlclZpc2libGU6IG5vdCBAaGFzQXR0cmlidXRlKCdndXR0ZXItaGlkZGVuJylcbiAgICAgIHBsYWNlaG9sZGVyVGV4dDogQGdldEF0dHJpYnV0ZSgncGxhY2Vob2xkZXItdGV4dCcpXG4gICAgKSlcblxuICBtb3VudENvbXBvbmVudDogLT5cbiAgICBAY29tcG9uZW50ID0gbmV3IFRleHRFZGl0b3JDb21wb25lbnQoXG4gICAgICBob3N0RWxlbWVudDogdGhpc1xuICAgICAgZWRpdG9yOiBAbW9kZWxcbiAgICAgIHRpbGVTaXplOiBAdGlsZVNpemVcbiAgICAgIHZpZXdzOiBAdmlld3NcbiAgICAgIHRoZW1lczogQHRoZW1lc1xuICAgICAgc3R5bGVzOiBAc3R5bGVzXG4gICAgICB3b3Jrc3BhY2U6IEB3b3Jrc3BhY2VcbiAgICAgIGFzc2VydDogQGFzc2VydCxcbiAgICAgIGhpZGRlbklucHV0RWxlbWVudDogQGhpZGRlbklucHV0RWxlbWVudFxuICAgIClcbiAgICBAcm9vdEVsZW1lbnQuYXBwZW5kQ2hpbGQoQGNvbXBvbmVudC5nZXREb21Ob2RlKCkpXG5cbiAgdW5tb3VudENvbXBvbmVudDogLT5cbiAgICBpZiBAY29tcG9uZW50P1xuICAgICAgQGNvbXBvbmVudC5kZXN0cm95KClcbiAgICAgIEBjb21wb25lbnQuZ2V0RG9tTm9kZSgpLnJlbW92ZSgpXG4gICAgICBAY29tcG9uZW50ID0gbnVsbFxuXG4gIGZvY3VzZWQ6IChldmVudCkgLT5cbiAgICBAY29tcG9uZW50Py5mb2N1c2VkKClcbiAgICBAaGlkZGVuSW5wdXRFbGVtZW50LmZvY3VzKClcblxuICBibHVycmVkOiAoZXZlbnQpIC0+XG4gICAgaWYgZXZlbnQucmVsYXRlZFRhcmdldCBpcyBAaGlkZGVuSW5wdXRFbGVtZW50XG4gICAgICBldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKVxuICAgICAgcmV0dXJuXG4gICAgQGNvbXBvbmVudD8uYmx1cnJlZCgpXG5cbiAgaW5wdXROb2RlQmx1cnJlZDogKGV2ZW50KSAtPlxuICAgIGlmIGV2ZW50LnJlbGF0ZWRUYXJnZXQgaXNudCB0aGlzXG4gICAgICBAZGlzcGF0Y2hFdmVudChuZXcgRm9jdXNFdmVudCgnYmx1cicsIHJlbGF0ZWRUYXJnZXQ6IGV2ZW50LnJlbGF0ZWRUYXJnZXQsIGJ1YmJsZXM6IGZhbHNlKSlcblxuICBhZGRHcmFtbWFyU2NvcGVBdHRyaWJ1dGU6IC0+XG4gICAgQGRhdGFzZXQuZ3JhbW1hciA9IEBtb2RlbC5nZXRHcmFtbWFyKCk/LnNjb3BlTmFtZT8ucmVwbGFjZSgvXFwuL2csICcgJylcblxuICBhZGRNaW5pQXR0cmlidXRlOiAtPlxuICAgIEBzZXRBdHRyaWJ1dGVOb2RlKGRvY3VtZW50LmNyZWF0ZUF0dHJpYnV0ZShcIm1pbmlcIikpXG5cbiAgcmVtb3ZlTWluaUF0dHJpYnV0ZTogLT5cbiAgICBAcmVtb3ZlQXR0cmlidXRlKFwibWluaVwiKVxuXG4gIGFkZEVuY29kaW5nQXR0cmlidXRlOiAtPlxuICAgIEBkYXRhc2V0LmVuY29kaW5nID0gQG1vZGVsLmdldEVuY29kaW5nKClcblxuICBoYXNGb2N1czogLT5cbiAgICB0aGlzIGlzIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgb3IgQGNvbnRhaW5zKGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpXG5cbiAgc2V0VXBkYXRlZFN5bmNocm9ub3VzbHk6IChAdXBkYXRlZFN5bmNocm9ub3VzbHkpIC0+XG4gICAgQG1vZGVsPy5zZXRVcGRhdGVkU3luY2hyb25vdXNseShAdXBkYXRlZFN5bmNocm9ub3VzbHkpXG4gICAgQHVwZGF0ZWRTeW5jaHJvbm91c2x5XG5cbiAgaXNVcGRhdGVkU3luY2hyb25vdXNseTogLT4gQHVwZGF0ZWRTeW5jaHJvbm91c2x5XG5cbiAgIyBFeHRlbmRlZDogQ29udGludW91c2x5IHJlZmxvd3MgbGluZXMgYW5kIGxpbmUgbnVtYmVycy4gKEhhcyBwZXJmb3JtYW5jZSBvdmVyaGVhZClcbiAgI1xuICAjICogYGNvbnRpbnVvdXNSZWZsb3dgIEEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0byBrZWVwIHJlZmxvd2luZyBvciBub3QuXG4gIHNldENvbnRpbnVvdXNSZWZsb3c6IChjb250aW51b3VzUmVmbG93KSAtPlxuICAgIEBjb21wb25lbnQ/LnNldENvbnRpbnVvdXNSZWZsb3coY29udGludW91c1JlZmxvdylcblxuICAjIEV4dGVuZGVkOiBnZXQgdGhlIHdpZHRoIG9mIGEgY2hhcmFjdGVyIG9mIHRleHQgZGlzcGxheWVkIGluIHRoaXMgZWxlbWVudC5cbiAgI1xuICAjIFJldHVybnMgYSB7TnVtYmVyfSBvZiBwaXhlbHMuXG4gIGdldERlZmF1bHRDaGFyYWN0ZXJXaWR0aDogLT5cbiAgICBAZ2V0TW9kZWwoKS5nZXREZWZhdWx0Q2hhcldpZHRoKClcblxuICAjIEV4dGVuZGVkOiBHZXQgdGhlIG1heGltdW0gc2Nyb2xsIHRvcCB0aGF0IGNhbiBiZSBhcHBsaWVkIHRvIHRoaXMgZWxlbWVudC5cbiAgI1xuICAjIFJldHVybnMgYSB7TnVtYmVyfSBvZiBwaXhlbHMuXG4gIGdldE1heFNjcm9sbFRvcDogLT5cbiAgICBAY29tcG9uZW50Py5nZXRNYXhTY3JvbGxUb3AoKVxuXG4gICMgRXh0ZW5kZWQ6IENvbnZlcnRzIGEgYnVmZmVyIHBvc2l0aW9uIHRvIGEgcGl4ZWwgcG9zaXRpb24uXG4gICNcbiAgIyAqIGBidWZmZXJQb3NpdGlvbmAgQW4gb2JqZWN0IHRoYXQgcmVwcmVzZW50cyBhIGJ1ZmZlciBwb3NpdGlvbi4gSXQgY2FuIGJlIGVpdGhlclxuICAjICAgYW4ge09iamVjdH0gKGB7cm93LCBjb2x1bW59YCksIHtBcnJheX0gKGBbcm93LCBjb2x1bW5dYCksIG9yIHtQb2ludH1cbiAgI1xuICAjIFJldHVybnMgYW4ge09iamVjdH0gd2l0aCB0d28gdmFsdWVzOiBgdG9wYCBhbmQgYGxlZnRgLCByZXByZXNlbnRpbmcgdGhlIHBpeGVsIHBvc2l0aW9uLlxuICBwaXhlbFBvc2l0aW9uRm9yQnVmZmVyUG9zaXRpb246IChidWZmZXJQb3NpdGlvbikgLT5cbiAgICBAY29tcG9uZW50LnBpeGVsUG9zaXRpb25Gb3JCdWZmZXJQb3NpdGlvbihidWZmZXJQb3NpdGlvbilcblxuICAjIEV4dGVuZGVkOiBDb252ZXJ0cyBhIHNjcmVlbiBwb3NpdGlvbiB0byBhIHBpeGVsIHBvc2l0aW9uLlxuICAjXG4gICMgKiBgc2NyZWVuUG9zaXRpb25gIEFuIG9iamVjdCB0aGF0IHJlcHJlc2VudHMgYSBzY3JlZW4gcG9zaXRpb24uIEl0IGNhbiBiZSBlaXRoZXJcbiAgIyAgIGFuIHtPYmplY3R9IChge3JvdywgY29sdW1ufWApLCB7QXJyYXl9IChgW3JvdywgY29sdW1uXWApLCBvciB7UG9pbnR9XG4gICNcbiAgIyBSZXR1cm5zIGFuIHtPYmplY3R9IHdpdGggdHdvIHZhbHVlczogYHRvcGAgYW5kIGBsZWZ0YCwgcmVwcmVzZW50aW5nIHRoZSBwaXhlbCBwb3NpdGlvbnMuXG4gIHBpeGVsUG9zaXRpb25Gb3JTY3JlZW5Qb3NpdGlvbjogKHNjcmVlblBvc2l0aW9uKSAtPlxuICAgIEBjb21wb25lbnQucGl4ZWxQb3NpdGlvbkZvclNjcmVlblBvc2l0aW9uKHNjcmVlblBvc2l0aW9uKVxuXG4gICMgRXh0ZW5kZWQ6IFJldHJpZXZlcyB0aGUgbnVtYmVyIG9mIHRoZSByb3cgdGhhdCBpcyB2aXNpYmxlIGFuZCBjdXJyZW50bHkgYXQgdGhlXG4gICMgdG9wIG9mIHRoZSBlZGl0b3IuXG4gICNcbiAgIyBSZXR1cm5zIGEge051bWJlcn0uXG4gIGdldEZpcnN0VmlzaWJsZVNjcmVlblJvdzogLT5cbiAgICBAZ2V0VmlzaWJsZVJvd1JhbmdlKClbMF1cblxuICAjIEV4dGVuZGVkOiBSZXRyaWV2ZXMgdGhlIG51bWJlciBvZiB0aGUgcm93IHRoYXQgaXMgdmlzaWJsZSBhbmQgY3VycmVudGx5IGF0IHRoZVxuICAjIGJvdHRvbSBvZiB0aGUgZWRpdG9yLlxuICAjXG4gICMgUmV0dXJucyBhIHtOdW1iZXJ9LlxuICBnZXRMYXN0VmlzaWJsZVNjcmVlblJvdzogLT5cbiAgICBAZ2V0VmlzaWJsZVJvd1JhbmdlKClbMV1cblxuICAjIEV4dGVuZGVkOiBjYWxsIHRoZSBnaXZlbiBgY2FsbGJhY2tgIHdoZW4gdGhlIGVkaXRvciBpcyBhdHRhY2hlZCB0byB0aGUgRE9NLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgb25EaWRBdHRhY2g6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbihcImRpZC1hdHRhY2hcIiwgY2FsbGJhY2spXG5cbiAgIyBFeHRlbmRlZDogY2FsbCB0aGUgZ2l2ZW4gYGNhbGxiYWNrYCB3aGVuIHRoZSBlZGl0b3IgaXMgZGV0YWNoZWQgZnJvbSB0aGUgRE9NLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgb25EaWREZXRhY2g6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbihcImRpZC1kZXRhY2hcIiwgY2FsbGJhY2spXG5cbiAgb25EaWRDaGFuZ2VTY3JvbGxUb3A6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbihcImRpZC1jaGFuZ2Utc2Nyb2xsLXRvcFwiLCBjYWxsYmFjaylcblxuICBvbkRpZENoYW5nZVNjcm9sbExlZnQ6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbihcImRpZC1jaGFuZ2Utc2Nyb2xsLWxlZnRcIiwgY2FsbGJhY2spXG5cbiAgc2V0U2Nyb2xsTGVmdDogKHNjcm9sbExlZnQpIC0+XG4gICAgQGNvbXBvbmVudC5zZXRTY3JvbGxMZWZ0KHNjcm9sbExlZnQpXG5cbiAgc2V0U2Nyb2xsUmlnaHQ6IChzY3JvbGxSaWdodCkgLT5cbiAgICBAY29tcG9uZW50LnNldFNjcm9sbFJpZ2h0KHNjcm9sbFJpZ2h0KVxuXG4gIHNldFNjcm9sbFRvcDogKHNjcm9sbFRvcCkgLT5cbiAgICBAY29tcG9uZW50LnNldFNjcm9sbFRvcChzY3JvbGxUb3ApXG5cbiAgc2V0U2Nyb2xsQm90dG9tOiAoc2Nyb2xsQm90dG9tKSAtPlxuICAgIEBjb21wb25lbnQuc2V0U2Nyb2xsQm90dG9tKHNjcm9sbEJvdHRvbSlcblxuICAjIEVzc2VudGlhbDogU2Nyb2xscyB0aGUgZWRpdG9yIHRvIHRoZSB0b3BcbiAgc2Nyb2xsVG9Ub3A6IC0+XG4gICAgQHNldFNjcm9sbFRvcCgwKVxuXG4gICMgRXNzZW50aWFsOiBTY3JvbGxzIHRoZSBlZGl0b3IgdG8gdGhlIGJvdHRvbVxuICBzY3JvbGxUb0JvdHRvbTogLT5cbiAgICBAc2V0U2Nyb2xsQm90dG9tKEluZmluaXR5KVxuXG4gIGdldFNjcm9sbFRvcDogLT5cbiAgICBAY29tcG9uZW50Py5nZXRTY3JvbGxUb3AoKSBvciAwXG5cbiAgZ2V0U2Nyb2xsTGVmdDogLT5cbiAgICBAY29tcG9uZW50Py5nZXRTY3JvbGxMZWZ0KCkgb3IgMFxuXG4gIGdldFNjcm9sbFJpZ2h0OiAtPlxuICAgIEBjb21wb25lbnQ/LmdldFNjcm9sbFJpZ2h0KCkgb3IgMFxuXG4gIGdldFNjcm9sbEJvdHRvbTogLT5cbiAgICBAY29tcG9uZW50Py5nZXRTY3JvbGxCb3R0b20oKSBvciAwXG5cbiAgZ2V0U2Nyb2xsSGVpZ2h0OiAtPlxuICAgIEBjb21wb25lbnQ/LmdldFNjcm9sbEhlaWdodCgpIG9yIDBcblxuICBnZXRTY3JvbGxXaWR0aDogLT5cbiAgICBAY29tcG9uZW50Py5nZXRTY3JvbGxXaWR0aCgpIG9yIDBcblxuICBnZXRWZXJ0aWNhbFNjcm9sbGJhcldpZHRoOiAtPlxuICAgIEBjb21wb25lbnQ/LmdldFZlcnRpY2FsU2Nyb2xsYmFyV2lkdGgoKSBvciAwXG5cbiAgZ2V0SG9yaXpvbnRhbFNjcm9sbGJhckhlaWdodDogLT5cbiAgICBAY29tcG9uZW50Py5nZXRIb3Jpem9udGFsU2Nyb2xsYmFySGVpZ2h0KCkgb3IgMFxuXG4gIGdldFZpc2libGVSb3dSYW5nZTogLT5cbiAgICBAY29tcG9uZW50Py5nZXRWaXNpYmxlUm93UmFuZ2UoKSBvciBbMCwgMF1cblxuICBpbnRlcnNlY3RzVmlzaWJsZVJvd1JhbmdlOiAoc3RhcnRSb3csIGVuZFJvdykgLT5cbiAgICBbdmlzaWJsZVN0YXJ0LCB2aXNpYmxlRW5kXSA9IEBnZXRWaXNpYmxlUm93UmFuZ2UoKVxuICAgIG5vdCAoZW5kUm93IDw9IHZpc2libGVTdGFydCBvciB2aXNpYmxlRW5kIDw9IHN0YXJ0Um93KVxuXG4gIHNlbGVjdGlvbkludGVyc2VjdHNWaXNpYmxlUm93UmFuZ2U6IChzZWxlY3Rpb24pIC0+XG4gICAge3N0YXJ0LCBlbmR9ID0gc2VsZWN0aW9uLmdldFNjcmVlblJhbmdlKClcbiAgICBAaW50ZXJzZWN0c1Zpc2libGVSb3dSYW5nZShzdGFydC5yb3csIGVuZC5yb3cgKyAxKVxuXG4gIHNjcmVlblBvc2l0aW9uRm9yUGl4ZWxQb3NpdGlvbjogKHBpeGVsUG9zaXRpb24pIC0+XG4gICAgQGNvbXBvbmVudC5zY3JlZW5Qb3NpdGlvbkZvclBpeGVsUG9zaXRpb24ocGl4ZWxQb3NpdGlvbilcblxuICBwaXhlbFJlY3RGb3JTY3JlZW5SYW5nZTogKHNjcmVlblJhbmdlKSAtPlxuICAgIEBjb21wb25lbnQucGl4ZWxSZWN0Rm9yU2NyZWVuUmFuZ2Uoc2NyZWVuUmFuZ2UpXG5cbiAgcGl4ZWxSYW5nZUZvclNjcmVlblJhbmdlOiAoc2NyZWVuUmFuZ2UpIC0+XG4gICAgQGNvbXBvbmVudC5waXhlbFJhbmdlRm9yU2NyZWVuUmFuZ2Uoc2NyZWVuUmFuZ2UpXG5cbiAgc2V0V2lkdGg6ICh3aWR0aCkgLT5cbiAgICBAc3R5bGUud2lkdGggPSAoQGNvbXBvbmVudC5nZXRHdXR0ZXJXaWR0aCgpICsgd2lkdGgpICsgXCJweFwiXG5cbiAgZ2V0V2lkdGg6IC0+XG4gICAgQG9mZnNldFdpZHRoIC0gQGNvbXBvbmVudC5nZXRHdXR0ZXJXaWR0aCgpXG5cbiAgc2V0SGVpZ2h0OiAoaGVpZ2h0KSAtPlxuICAgIEBzdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyBcInB4XCJcblxuICBnZXRIZWlnaHQ6IC0+XG4gICAgQG9mZnNldEhlaWdodFxuXG4gICMgRXhwZXJpbWVudGFsOiBJbnZhbGlkYXRlIHRoZSBwYXNzZWQgYmxvY2sge0RlY29yYXRpb259IGRpbWVuc2lvbnMsIGZvcmNpbmdcbiAgIyB0aGVtIHRvIGJlIHJlY2FsY3VsYXRlZCBhbmQgdGhlIHN1cnJvdW5kaW5nIGNvbnRlbnQgdG8gYmUgYWRqdXN0ZWQgb24gdGhlXG4gICMgbmV4dCBhbmltYXRpb24gZnJhbWUuXG4gICNcbiAgIyAqIHtibG9ja0RlY29yYXRpb259IEEge0RlY29yYXRpb259IHJlcHJlc2VudGluZyB0aGUgYmxvY2sgZGVjb3JhdGlvbiB5b3VcbiAgIyB3YW50IHRvIHVwZGF0ZSB0aGUgZGltZW5zaW9ucyBvZi5cbiAgaW52YWxpZGF0ZUJsb2NrRGVjb3JhdGlvbkRpbWVuc2lvbnM6IC0+XG4gICAgQGNvbXBvbmVudC5pbnZhbGlkYXRlQmxvY2tEZWNvcmF0aW9uRGltZW5zaW9ucyhhcmd1bWVudHMuLi4pXG5cbm1vZHVsZS5leHBvcnRzID0gVGV4dEVkaXRvckVsZW1lbnQgPSBkb2N1bWVudC5yZWdpc3RlckVsZW1lbnQgJ2F0b20tdGV4dC1lZGl0b3InLCBwcm90b3R5cGU6IFRleHRFZGl0b3JFbGVtZW50LnByb3RvdHlwZVxuIl19
