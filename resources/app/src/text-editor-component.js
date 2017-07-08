(function() {
  var CompositeDisposable, DOMElementPool, Grim, GutterContainerComponent, InputComponent, LineTopIndex, LinesComponent, LinesYardstick, OffScreenBlockDecorationsComponent, OverlayManager, Point, Range, ScrollbarComponent, ScrollbarCornerComponent, TextEditorComponent, TextEditorPresenter, ipcRenderer, ref, scrollbarStyle,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  scrollbarStyle = require('scrollbar-style');

  ref = require('text-buffer'), Range = ref.Range, Point = ref.Point;

  CompositeDisposable = require('event-kit').CompositeDisposable;

  ipcRenderer = require('electron').ipcRenderer;

  Grim = require('grim');

  TextEditorPresenter = require('./text-editor-presenter');

  GutterContainerComponent = require('./gutter-container-component');

  InputComponent = require('./input-component');

  LinesComponent = require('./lines-component');

  OffScreenBlockDecorationsComponent = require('./off-screen-block-decorations-component');

  ScrollbarComponent = require('./scrollbar-component');

  ScrollbarCornerComponent = require('./scrollbar-corner-component');

  OverlayManager = require('./overlay-manager');

  DOMElementPool = require('./dom-element-pool');

  LinesYardstick = require('./lines-yardstick');

  LineTopIndex = require('line-top-index');

  module.exports = TextEditorComponent = (function() {
    TextEditorComponent.prototype.cursorBlinkPeriod = 800;

    TextEditorComponent.prototype.cursorBlinkResumeDelay = 100;

    TextEditorComponent.prototype.tileSize = 12;

    TextEditorComponent.prototype.pendingScrollTop = null;

    TextEditorComponent.prototype.pendingScrollLeft = null;

    TextEditorComponent.prototype.updateRequested = false;

    TextEditorComponent.prototype.updatesPaused = false;

    TextEditorComponent.prototype.updateRequestedWhilePaused = false;

    TextEditorComponent.prototype.heightAndWidthMeasurementRequested = false;

    TextEditorComponent.prototype.inputEnabled = true;

    TextEditorComponent.prototype.measureScrollbarsWhenShown = true;

    TextEditorComponent.prototype.measureLineHeightAndDefaultCharWidthWhenShown = true;

    TextEditorComponent.prototype.stylingChangeAnimationFrameRequested = false;

    TextEditorComponent.prototype.gutterComponent = null;

    TextEditorComponent.prototype.mounted = true;

    TextEditorComponent.prototype.initialized = false;

    Object.defineProperty(TextEditorComponent.prototype, "domNode", {
      get: function() {
        return this.domNodeValue;
      },
      set: function(domNode) {
        this.assert(domNode != null, "TextEditorComponent::domNode was set to null.");
        return this.domNodeValue = domNode;
      }
    });

    function TextEditorComponent(arg) {
      var hiddenInputElement, lineTopIndex, tileSize;
      this.editor = arg.editor, this.hostElement = arg.hostElement, tileSize = arg.tileSize, this.views = arg.views, this.themes = arg.themes, this.styles = arg.styles, this.assert = arg.assert, hiddenInputElement = arg.hiddenInputElement;
      this.refreshScrollbars = bind(this.refreshScrollbars, this);
      this.sampleFontStyling = bind(this.sampleFontStyling, this);
      this.pollDOM = bind(this.pollDOM, this);
      this.handleStylingChange = bind(this.handleStylingChange, this);
      this.onAllThemesLoaded = bind(this.onAllThemesLoaded, this);
      this.onStylesheetsChanged = bind(this.onStylesheetsChanged, this);
      this.onGutterShiftClick = bind(this.onGutterShiftClick, this);
      this.onGutterMetaClick = bind(this.onGutterMetaClick, this);
      this.onGutterClick = bind(this.onGutterClick, this);
      this.onLineNumberGutterMouseDown = bind(this.onLineNumberGutterMouseDown, this);
      this.onMouseDown = bind(this.onMouseDown, this);
      this.onScrollViewScroll = bind(this.onScrollViewScroll, this);
      this.onMouseWheel = bind(this.onMouseWheel, this);
      this.onHorizontalScroll = bind(this.onHorizontalScroll, this);
      this.onVerticalScroll = bind(this.onVerticalScroll, this);
      this.onTextInput = bind(this.onTextInput, this);
      this.onGrammarChanged = bind(this.onGrammarChanged, this);
      this.requestUpdate = bind(this.requestUpdate, this);
      this.readAfterUpdateSync = bind(this.readAfterUpdateSync, this);
      if (tileSize != null) {
        this.tileSize = tileSize;
      }
      this.disposables = new CompositeDisposable;
      lineTopIndex = new LineTopIndex({
        defaultLineHeight: this.editor.getLineHeightInPixels()
      });
      this.presenter = new TextEditorPresenter({
        model: this.editor,
        tileSize: tileSize,
        cursorBlinkPeriod: this.cursorBlinkPeriod,
        cursorBlinkResumeDelay: this.cursorBlinkResumeDelay,
        stoppedScrollingDelay: 200,
        lineTopIndex: lineTopIndex,
        autoHeight: this.editor.getAutoHeight()
      });
      this.presenter.onDidUpdateState(this.requestUpdate);
      this.domElementPool = new DOMElementPool;
      this.domNode = document.createElement('div');
      this.domNode.classList.add('editor-contents--private');
      this.overlayManager = new OverlayManager(this.presenter, this.domNode, this.views);
      this.scrollViewNode = document.createElement('div');
      this.scrollViewNode.classList.add('scroll-view');
      this.domNode.appendChild(this.scrollViewNode);
      this.hiddenInputComponent = new InputComponent(hiddenInputElement);
      this.scrollViewNode.appendChild(hiddenInputElement);
      hiddenInputElement.getModel = (function(_this) {
        return function() {
          return _this.editor;
        };
      })(this);
      this.linesComponent = new LinesComponent({
        presenter: this.presenter,
        domElementPool: this.domElementPool,
        assert: this.assert,
        grammars: this.grammars,
        views: this.views
      });
      this.scrollViewNode.appendChild(this.linesComponent.getDomNode());
      this.offScreenBlockDecorationsComponent = new OffScreenBlockDecorationsComponent({
        presenter: this.presenter,
        views: this.views
      });
      this.scrollViewNode.appendChild(this.offScreenBlockDecorationsComponent.getDomNode());
      this.linesYardstick = new LinesYardstick(this.editor, this.linesComponent, lineTopIndex);
      this.presenter.setLinesYardstick(this.linesYardstick);
      this.horizontalScrollbarComponent = new ScrollbarComponent({
        orientation: 'horizontal',
        onScroll: this.onHorizontalScroll
      });
      this.scrollViewNode.appendChild(this.horizontalScrollbarComponent.getDomNode());
      this.verticalScrollbarComponent = new ScrollbarComponent({
        orientation: 'vertical',
        onScroll: this.onVerticalScroll
      });
      this.domNode.appendChild(this.verticalScrollbarComponent.getDomNode());
      this.scrollbarCornerComponent = new ScrollbarCornerComponent;
      this.domNode.appendChild(this.scrollbarCornerComponent.getDomNode());
      this.observeEditor();
      this.listenForDOMEvents();
      this.disposables.add(this.styles.onDidAddStyleElement(this.onStylesheetsChanged));
      this.disposables.add(this.styles.onDidUpdateStyleElement(this.onStylesheetsChanged));
      this.disposables.add(this.styles.onDidRemoveStyleElement(this.onStylesheetsChanged));
      if (!this.themes.isInitialLoadComplete()) {
        this.disposables.add(this.themes.onDidChangeActiveThemes(this.onAllThemesLoaded));
      }
      this.disposables.add(scrollbarStyle.onDidChangePreferredScrollbarStyle(this.refreshScrollbars));
      this.disposables.add(this.views.pollDocument(this.pollDOM));
      this.updateSync();
      this.checkForVisibilityChange();
      this.initialized = true;
    }

    TextEditorComponent.prototype.destroy = function() {
      var ref1;
      this.mounted = false;
      this.disposables.dispose();
      this.presenter.destroy();
      if ((ref1 = this.gutterContainerComponent) != null) {
        ref1.destroy();
      }
      this.domElementPool.clear();
      this.verticalScrollbarComponent.destroy();
      this.horizontalScrollbarComponent.destroy();
      this.onVerticalScroll = null;
      return this.onHorizontalScroll = null;
    };

    TextEditorComponent.prototype.getDomNode = function() {
      return this.domNode;
    };

    TextEditorComponent.prototype.updateSync = function() {
      var ref1, ref2, ref3;
      this.updateSyncPreMeasurement();
      if (this.oldState == null) {
        this.oldState = {
          width: null
        };
      }
      this.newState = this.presenter.getPostMeasurementState();
      if ((this.editor.getLastSelection() != null) && !this.editor.getLastSelection().isEmpty()) {
        this.domNode.classList.add('has-selection');
      } else {
        this.domNode.classList.remove('has-selection');
      }
      if (this.newState.focused !== this.oldState.focused) {
        this.domNode.classList.toggle('is-focused', this.newState.focused);
      }
      if (this.editor.isDestroyed()) {
        this.performedInitialMeasurement = false;
      }
      if (this.performedInitialMeasurement) {
        if (this.newState.height !== this.oldState.height) {
          if (this.newState.height != null) {
            this.domNode.style.height = this.newState.height + 'px';
          } else {
            this.domNode.style.height = '';
          }
        }
        if (this.newState.width !== this.oldState.width) {
          if (this.newState.width != null) {
            this.hostElement.style.width = this.newState.width + 'px';
          } else {
            this.hostElement.style.width = '';
          }
          this.oldState.width = this.newState.width;
        }
      }
      if (this.newState.gutters.length) {
        if (this.gutterContainerComponent == null) {
          this.mountGutterContainerComponent();
        }
        this.gutterContainerComponent.updateSync(this.newState);
      } else {
        if ((ref1 = this.gutterContainerComponent) != null) {
          if ((ref2 = ref1.getDomNode()) != null) {
            ref2.remove();
          }
        }
        this.gutterContainerComponent = null;
      }
      this.hiddenInputComponent.updateSync(this.newState);
      this.offScreenBlockDecorationsComponent.updateSync(this.newState);
      this.linesComponent.updateSync(this.newState);
      this.horizontalScrollbarComponent.updateSync(this.newState);
      this.verticalScrollbarComponent.updateSync(this.newState);
      this.scrollbarCornerComponent.updateSync(this.newState);
      if ((ref3 = this.overlayManager) != null) {
        ref3.render(this.newState);
      }
      if (this.clearPoolAfterUpdate) {
        this.domElementPool.clear();
        this.clearPoolAfterUpdate = false;
      }
      if (this.editor.isAlive()) {
        this.updateParentViewFocusedClassIfNeeded();
        return this.updateParentViewMiniClass();
      }
    };

    TextEditorComponent.prototype.updateSyncPreMeasurement = function() {
      return this.linesComponent.updateSync(this.presenter.getPreMeasurementState());
    };

    TextEditorComponent.prototype.readAfterUpdateSync = function() {
      var ref1;
      if ((ref1 = this.overlayManager) != null) {
        ref1.measureOverlays();
      }
      this.linesComponent.measureBlockDecorations();
      return this.offScreenBlockDecorationsComponent.measureBlockDecorations();
    };

    TextEditorComponent.prototype.mountGutterContainerComponent = function() {
      this.gutterContainerComponent = new GutterContainerComponent({
        editor: this.editor,
        onLineNumberGutterMouseDown: this.onLineNumberGutterMouseDown,
        domElementPool: this.domElementPool,
        views: this.views
      });
      return this.domNode.insertBefore(this.gutterContainerComponent.getDomNode(), this.domNode.firstChild);
    };

    TextEditorComponent.prototype.becameVisible = function() {
      this.updatesPaused = true;
      this.invalidateMeasurements();
      if (this.measureScrollbarsWhenShown) {
        this.measureScrollbars();
      }
      this.sampleFontStyling();
      this.sampleBackgroundColors();
      this.measureWindowSize();
      this.measureDimensions();
      if (this.measureLineHeightAndDefaultCharWidthWhenShown) {
        this.measureLineHeightAndDefaultCharWidth();
      }
      this.editor.setVisible(true);
      this.performedInitialMeasurement = true;
      this.updatesPaused = false;
      if (this.canUpdate()) {
        return this.updateSync();
      }
    };

    TextEditorComponent.prototype.requestUpdate = function() {
      if (!this.canUpdate()) {
        return;
      }
      if (this.updatesPaused) {
        this.updateRequestedWhilePaused = true;
        return;
      }
      if (this.hostElement.isUpdatedSynchronously()) {
        return this.updateSync();
      } else if (!this.updateRequested) {
        this.updateRequested = true;
        this.views.updateDocument((function(_this) {
          return function() {
            _this.updateRequested = false;
            if (_this.canUpdate()) {
              return _this.updateSync();
            }
          };
        })(this));
        return this.views.readDocument(this.readAfterUpdateSync);
      }
    };

    TextEditorComponent.prototype.canUpdate = function() {
      return this.mounted && this.editor.isAlive();
    };

    TextEditorComponent.prototype.requestAnimationFrame = function(fn) {
      this.updatesPaused = true;
      return requestAnimationFrame((function(_this) {
        return function() {
          fn();
          _this.updatesPaused = false;
          if (_this.updateRequestedWhilePaused && _this.canUpdate()) {
            _this.updateRequestedWhilePaused = false;
            return _this.requestUpdate();
          }
        };
      })(this));
    };

    TextEditorComponent.prototype.getTopmostDOMNode = function() {
      return this.hostElement;
    };

    TextEditorComponent.prototype.observeEditor = function() {
      return this.disposables.add(this.editor.observeGrammar(this.onGrammarChanged));
    };

    TextEditorComponent.prototype.listenForDOMEvents = function() {
      this.domNode.addEventListener('mousewheel', this.onMouseWheel);
      this.domNode.addEventListener('textInput', this.onTextInput);
      this.scrollViewNode.addEventListener('mousedown', this.onMouseDown);
      this.scrollViewNode.addEventListener('scroll', this.onScrollViewScroll);
      this.detectAccentedCharacterMenu();
      this.listenForIMEEvents();
      if (process.platform === 'linux') {
        return this.trackSelectionClipboard();
      }
    };

    TextEditorComponent.prototype.detectAccentedCharacterMenu = function() {
      var lastKeydown, lastKeydownBeforeKeypress;
      lastKeydown = null;
      lastKeydownBeforeKeypress = null;
      this.domNode.addEventListener('keydown', (function(_this) {
        return function(event) {
          if (lastKeydownBeforeKeypress) {
            if (lastKeydownBeforeKeypress.keyCode === event.keyCode) {
              _this.openedAccentedCharacterMenu = true;
            }
            return lastKeydownBeforeKeypress = null;
          } else {
            return lastKeydown = event;
          }
        };
      })(this));
      this.domNode.addEventListener('keypress', (function(_this) {
        return function() {
          lastKeydownBeforeKeypress = lastKeydown;
          lastKeydown = null;
          return _this.openedAccentedCharacterMenu = false;
        };
      })(this));
      return this.domNode.addEventListener('keyup', function() {
        lastKeydownBeforeKeypress = null;
        return lastKeydown = null;
      });
    };

    TextEditorComponent.prototype.listenForIMEEvents = function() {
      var checkpoint;
      checkpoint = null;
      this.domNode.addEventListener('compositionstart', (function(_this) {
        return function() {
          if (_this.openedAccentedCharacterMenu) {
            _this.editor.selectLeft();
            _this.openedAccentedCharacterMenu = false;
          }
          return checkpoint = _this.editor.createCheckpoint();
        };
      })(this));
      this.domNode.addEventListener('compositionupdate', (function(_this) {
        return function(event) {
          return _this.editor.insertText(event.data, {
            select: true
          });
        };
      })(this));
      return this.domNode.addEventListener('compositionend', (function(_this) {
        return function(event) {
          _this.editor.revertToCheckpoint(checkpoint);
          return event.target.value = '';
        };
      })(this));
    };

    TextEditorComponent.prototype.trackSelectionClipboard = function() {
      var timeoutId, writeSelectedTextToSelectionClipboard;
      timeoutId = null;
      writeSelectedTextToSelectionClipboard = (function(_this) {
        return function() {
          var selectedText;
          if (_this.editor.isDestroyed()) {
            return;
          }
          if (selectedText = _this.editor.getSelectedText()) {
            return ipcRenderer.send('write-text-to-selection-clipboard', selectedText);
          }
        };
      })(this);
      return this.disposables.add(this.editor.onDidChangeSelectionRange(function() {
        clearTimeout(timeoutId);
        return timeoutId = setTimeout(writeSelectedTextToSelectionClipboard);
      }));
    };

    TextEditorComponent.prototype.onGrammarChanged = function() {
      if (this.scopedConfigDisposables != null) {
        this.scopedConfigDisposables.dispose();
        this.disposables.remove(this.scopedConfigDisposables);
      }
      this.scopedConfigDisposables = new CompositeDisposable;
      return this.disposables.add(this.scopedConfigDisposables);
    };

    TextEditorComponent.prototype.focused = function() {
      if (this.mounted) {
        return this.presenter.setFocused(true);
      }
    };

    TextEditorComponent.prototype.blurred = function() {
      if (this.mounted) {
        return this.presenter.setFocused(false);
      }
    };

    TextEditorComponent.prototype.onTextInput = function(event) {
      event.stopPropagation();
      if (event.data !== ' ') {
        event.preventDefault();
      }
      if (!this.isInputEnabled()) {
        return;
      }
      if (this.openedAccentedCharacterMenu) {
        this.editor.selectLeft();
        this.openedAccentedCharacterMenu = false;
      }
      return this.editor.insertText(event.data, {
        groupUndo: true
      });
    };

    TextEditorComponent.prototype.onVerticalScroll = function(scrollTop) {
      var animationFramePending;
      if (this.updateRequested || scrollTop === this.presenter.getScrollTop()) {
        return;
      }
      animationFramePending = this.pendingScrollTop != null;
      this.pendingScrollTop = scrollTop;
      if (!animationFramePending) {
        return this.requestAnimationFrame((function(_this) {
          return function() {
            var pendingScrollTop;
            pendingScrollTop = _this.pendingScrollTop;
            _this.pendingScrollTop = null;
            _this.presenter.setScrollTop(pendingScrollTop);
            return _this.presenter.commitPendingScrollTopPosition();
          };
        })(this));
      }
    };

    TextEditorComponent.prototype.onHorizontalScroll = function(scrollLeft) {
      var animationFramePending;
      if (this.updateRequested || scrollLeft === this.presenter.getScrollLeft()) {
        return;
      }
      animationFramePending = this.pendingScrollLeft != null;
      this.pendingScrollLeft = scrollLeft;
      if (!animationFramePending) {
        return this.requestAnimationFrame((function(_this) {
          return function() {
            _this.presenter.setScrollLeft(_this.pendingScrollLeft);
            _this.presenter.commitPendingScrollLeftPosition();
            return _this.pendingScrollLeft = null;
          };
        })(this));
      }
    };

    TextEditorComponent.prototype.onMouseWheel = function(event) {
      var previousScrollLeft, previousScrollTop, updatedScrollLeft, updatedScrollTop, wheelDeltaX, wheelDeltaY;
      wheelDeltaX = event.wheelDeltaX, wheelDeltaY = event.wheelDeltaY;
      if (Math.abs(wheelDeltaX) > Math.abs(wheelDeltaY)) {
        previousScrollLeft = this.presenter.getScrollLeft();
        updatedScrollLeft = previousScrollLeft - Math.round(wheelDeltaX * this.editor.getScrollSensitivity() / 100);
        if (this.presenter.canScrollLeftTo(updatedScrollLeft)) {
          event.preventDefault();
        }
        return this.presenter.setScrollLeft(updatedScrollLeft);
      } else {
        this.presenter.setMouseWheelScreenRow(this.screenRowForNode(event.target));
        previousScrollTop = this.presenter.getScrollTop();
        updatedScrollTop = previousScrollTop - Math.round(wheelDeltaY * this.editor.getScrollSensitivity() / 100);
        if (this.presenter.canScrollTopTo(updatedScrollTop)) {
          event.preventDefault();
        }
        return this.presenter.setScrollTop(updatedScrollTop);
      }
    };

    TextEditorComponent.prototype.onScrollViewScroll = function() {
      if (this.mounted) {
        this.scrollViewNode.scrollTop = 0;
        return this.scrollViewNode.scrollLeft = 0;
      }
    };

    TextEditorComponent.prototype.onDidChangeScrollTop = function(callback) {
      return this.presenter.onDidChangeScrollTop(callback);
    };

    TextEditorComponent.prototype.onDidChangeScrollLeft = function(callback) {
      return this.presenter.onDidChangeScrollLeft(callback);
    };

    TextEditorComponent.prototype.setScrollLeft = function(scrollLeft) {
      return this.presenter.setScrollLeft(scrollLeft);
    };

    TextEditorComponent.prototype.setScrollRight = function(scrollRight) {
      return this.presenter.setScrollRight(scrollRight);
    };

    TextEditorComponent.prototype.setScrollTop = function(scrollTop) {
      return this.presenter.setScrollTop(scrollTop);
    };

    TextEditorComponent.prototype.setScrollBottom = function(scrollBottom) {
      return this.presenter.setScrollBottom(scrollBottom);
    };

    TextEditorComponent.prototype.getScrollTop = function() {
      return this.presenter.getScrollTop();
    };

    TextEditorComponent.prototype.getScrollLeft = function() {
      return this.presenter.getScrollLeft();
    };

    TextEditorComponent.prototype.getScrollRight = function() {
      return this.presenter.getScrollRight();
    };

    TextEditorComponent.prototype.getScrollBottom = function() {
      return this.presenter.getScrollBottom();
    };

    TextEditorComponent.prototype.getScrollHeight = function() {
      return this.presenter.getScrollHeight();
    };

    TextEditorComponent.prototype.getScrollWidth = function() {
      return this.presenter.getScrollWidth();
    };

    TextEditorComponent.prototype.getMaxScrollTop = function() {
      return this.presenter.getMaxScrollTop();
    };

    TextEditorComponent.prototype.getVerticalScrollbarWidth = function() {
      return this.presenter.getVerticalScrollbarWidth();
    };

    TextEditorComponent.prototype.getHorizontalScrollbarHeight = function() {
      return this.presenter.getHorizontalScrollbarHeight();
    };

    TextEditorComponent.prototype.getVisibleRowRange = function() {
      return this.presenter.getVisibleRowRange();
    };

    TextEditorComponent.prototype.pixelPositionForScreenPosition = function(screenPosition, clip) {
      var pixelPosition;
      if (clip == null) {
        clip = true;
      }
      screenPosition = Point.fromObject(screenPosition);
      if (clip) {
        screenPosition = this.editor.clipScreenPosition(screenPosition);
      }
      if (!this.presenter.isRowRendered(screenPosition.row)) {
        this.presenter.setScreenRowsToMeasure([screenPosition.row]);
      }
      if (this.linesComponent.lineNodeForScreenRow(screenPosition.row) == null) {
        this.updateSyncPreMeasurement();
      }
      pixelPosition = this.linesYardstick.pixelPositionForScreenPosition(screenPosition);
      this.presenter.clearScreenRowsToMeasure();
      return pixelPosition;
    };

    TextEditorComponent.prototype.screenPositionForPixelPosition = function(pixelPosition) {
      var position, row;
      row = this.linesYardstick.measuredRowForPixelPosition(pixelPosition);
      if ((row != null) && !this.presenter.isRowRendered(row)) {
        this.presenter.setScreenRowsToMeasure([row]);
        this.updateSyncPreMeasurement();
      }
      position = this.linesYardstick.screenPositionForPixelPosition(pixelPosition);
      this.presenter.clearScreenRowsToMeasure();
      return position;
    };

    TextEditorComponent.prototype.pixelRectForScreenRange = function(screenRange) {
      var rect, rowsToMeasure;
      rowsToMeasure = [];
      if (!this.presenter.isRowRendered(screenRange.start.row)) {
        rowsToMeasure.push(screenRange.start.row);
      }
      if (!this.presenter.isRowRendered(screenRange.end.row)) {
        rowsToMeasure.push(screenRange.end.row);
      }
      if (rowsToMeasure.length > 0) {
        this.presenter.setScreenRowsToMeasure(rowsToMeasure);
        this.updateSyncPreMeasurement();
      }
      rect = this.presenter.absolutePixelRectForScreenRange(screenRange);
      if (rowsToMeasure.length > 0) {
        this.presenter.clearScreenRowsToMeasure();
      }
      return rect;
    };

    TextEditorComponent.prototype.pixelRangeForScreenRange = function(screenRange, clip) {
      var end, ref1, start;
      if (clip == null) {
        clip = true;
      }
      ref1 = Range.fromObject(screenRange), start = ref1.start, end = ref1.end;
      return {
        start: this.pixelPositionForScreenPosition(start, clip),
        end: this.pixelPositionForScreenPosition(end, clip)
      };
    };

    TextEditorComponent.prototype.pixelPositionForBufferPosition = function(bufferPosition) {
      return this.pixelPositionForScreenPosition(this.editor.screenPositionForBufferPosition(bufferPosition));
    };

    TextEditorComponent.prototype.invalidateBlockDecorationDimensions = function() {
      var ref1;
      return (ref1 = this.presenter).invalidateBlockDecorationDimensions.apply(ref1, arguments);
    };

    TextEditorComponent.prototype.onMouseDown = function(event) {
      var bufferPosition, ctrlKey, cursorAtScreenPosition, detail, metaKey, ref1, ref2, screenPosition, selection, shiftKey;
      if (event.button === 1 && process.platform === 'linux') {
        if (selection = require('./safe-clipboard').readText('selection')) {
          screenPosition = this.screenPositionForMouseEvent(event);
          this.editor.setCursorScreenPosition(screenPosition, {
            autoscroll: false
          });
          this.editor.insertText(selection);
          return;
        }
      }
      if (event.button !== 0) {
        return;
      }
      if ((ref1 = event.target) != null ? ref1.classList.contains('horizontal-scrollbar') : void 0) {
        return;
      }
      detail = event.detail, shiftKey = event.shiftKey, metaKey = event.metaKey, ctrlKey = event.ctrlKey;
      if (ctrlKey && process.platform === 'darwin') {
        return;
      }
      if (this.oldState.focused) {
        event.preventDefault();
      }
      screenPosition = this.screenPositionForMouseEvent(event);
      if ((ref2 = event.target) != null ? ref2.classList.contains('fold-marker') : void 0) {
        bufferPosition = this.editor.bufferPositionForScreenPosition(screenPosition);
        this.editor.destroyFoldsIntersectingBufferRange([bufferPosition, bufferPosition]);
        return;
      }
      switch (detail) {
        case 1:
          if (shiftKey) {
            this.editor.selectToScreenPosition(screenPosition);
          } else if (metaKey || (ctrlKey && process.platform !== 'darwin')) {
            cursorAtScreenPosition = this.editor.getCursorAtScreenPosition(screenPosition);
            if (cursorAtScreenPosition && this.editor.hasMultipleCursors()) {
              cursorAtScreenPosition.destroy();
            } else {
              this.editor.addCursorAtScreenPosition(screenPosition, {
                autoscroll: false
              });
            }
          } else {
            this.editor.setCursorScreenPosition(screenPosition, {
              autoscroll: false
            });
          }
          break;
        case 2:
          this.editor.getLastSelection().selectWord({
            autoscroll: false
          });
          break;
        case 3:
          this.editor.getLastSelection().selectLine(null, {
            autoscroll: false
          });
      }
      return this.handleDragUntilMouseUp((function(_this) {
        return function(screenPosition) {
          return _this.editor.selectToScreenPosition(screenPosition, {
            suppressSelectionMerge: true,
            autoscroll: false
          });
        };
      })(this));
    };

    TextEditorComponent.prototype.onLineNumberGutterMouseDown = function(event) {
      var ctrlKey, metaKey, shiftKey;
      if (event.button !== 0) {
        return;
      }
      shiftKey = event.shiftKey, metaKey = event.metaKey, ctrlKey = event.ctrlKey;
      if (shiftKey) {
        return this.onGutterShiftClick(event);
      } else if (metaKey || (ctrlKey && process.platform !== 'darwin')) {
        return this.onGutterMetaClick(event);
      } else {
        return this.onGutterClick(event);
      }
    };

    TextEditorComponent.prototype.onGutterClick = function(event) {
      var clickedBufferRow, clickedScreenRow, initialScreenRange;
      clickedScreenRow = this.screenPositionForMouseEvent(event).row;
      clickedBufferRow = this.editor.bufferRowForScreenRow(clickedScreenRow);
      initialScreenRange = this.editor.screenRangeForBufferRange([[clickedBufferRow, 0], [clickedBufferRow + 1, 0]]);
      this.editor.setSelectedScreenRange(initialScreenRange, {
        preserveFolds: true,
        autoscroll: false
      });
      return this.handleGutterDrag(initialScreenRange);
    };

    TextEditorComponent.prototype.onGutterMetaClick = function(event) {
      var clickedBufferRow, clickedScreenRow, initialScreenRange;
      clickedScreenRow = this.screenPositionForMouseEvent(event).row;
      clickedBufferRow = this.editor.bufferRowForScreenRow(clickedScreenRow);
      initialScreenRange = this.editor.screenRangeForBufferRange([[clickedBufferRow, 0], [clickedBufferRow + 1, 0]]);
      this.editor.addSelectionForScreenRange(initialScreenRange, {
        autoscroll: false
      });
      return this.handleGutterDrag(initialScreenRange);
    };

    TextEditorComponent.prototype.onGutterShiftClick = function(event) {
      var clickedBufferRow, clickedLineScreenRange, clickedScreenRow, tailScreenPosition;
      tailScreenPosition = this.editor.getLastSelection().getTailScreenPosition();
      clickedScreenRow = this.screenPositionForMouseEvent(event).row;
      clickedBufferRow = this.editor.bufferRowForScreenRow(clickedScreenRow);
      clickedLineScreenRange = this.editor.screenRangeForBufferRange([[clickedBufferRow, 0], [clickedBufferRow + 1, 0]]);
      if (clickedScreenRow < tailScreenPosition.row) {
        this.editor.selectToScreenPosition(clickedLineScreenRange.start, {
          suppressSelectionMerge: true,
          autoscroll: false
        });
      } else {
        this.editor.selectToScreenPosition(clickedLineScreenRange.end, {
          suppressSelectionMerge: true,
          autoscroll: false
        });
      }
      return this.handleGutterDrag(new Range(tailScreenPosition, tailScreenPosition));
    };

    TextEditorComponent.prototype.handleGutterDrag = function(initialRange) {
      return this.handleDragUntilMouseUp((function(_this) {
        return function(screenPosition) {
          var dragRow, endPosition, screenRange, startPosition;
          dragRow = screenPosition.row;
          if (dragRow < initialRange.start.row) {
            startPosition = _this.editor.clipScreenPosition([dragRow, 0], {
              skipSoftWrapIndentation: true
            });
            screenRange = new Range(startPosition, startPosition).union(initialRange);
            return _this.editor.getLastSelection().setScreenRange(screenRange, {
              reversed: true,
              autoscroll: false,
              preserveFolds: true
            });
          } else {
            endPosition = _this.editor.clipScreenPosition([dragRow + 1, 0], {
              clipDirection: 'backward'
            });
            screenRange = new Range(endPosition, endPosition).union(initialRange);
            return _this.editor.getLastSelection().setScreenRange(screenRange, {
              reversed: false,
              autoscroll: false,
              preserveFolds: true
            });
          }
        };
      })(this));
    };

    TextEditorComponent.prototype.onStylesheetsChanged = function(styleElement) {
      if (!this.performedInitialMeasurement) {
        return;
      }
      if (!this.themes.isInitialLoadComplete()) {
        return;
      }
      if (!this.stylingChangeAnimationFrameRequested) {
        this.stylingChangeAnimationFrameRequested = true;
        return requestAnimationFrame((function(_this) {
          return function() {
            _this.stylingChangeAnimationFrameRequested = false;
            if (_this.mounted) {
              if ((styleElement.sheet == null) || _this.containsScrollbarSelector(styleElement.sheet)) {
                _this.refreshScrollbars();
              }
              return _this.handleStylingChange();
            }
          };
        })(this));
      }
    };

    TextEditorComponent.prototype.onAllThemesLoaded = function() {
      this.refreshScrollbars();
      return this.handleStylingChange();
    };

    TextEditorComponent.prototype.handleStylingChange = function() {
      this.sampleFontStyling();
      this.sampleBackgroundColors();
      return this.invalidateMeasurements();
    };

    TextEditorComponent.prototype.handleDragUntilMouseUp = function(dragHandler) {
      var animationLoop, autoscroll, disposables, dragging, lastMousePosition, onMouseMove, onMouseUp, scaleScrollDelta, stopDragging;
      dragging = false;
      lastMousePosition = {};
      animationLoop = (function(_this) {
        return function() {
          return _this.requestAnimationFrame(function() {
            var linesClientRect, screenPosition;
            if (dragging && _this.mounted) {
              linesClientRect = _this.linesComponent.getDomNode().getBoundingClientRect();
              autoscroll(lastMousePosition, linesClientRect);
              screenPosition = _this.screenPositionForMouseEvent(lastMousePosition, linesClientRect);
              dragHandler(screenPosition);
              return animationLoop();
            } else if (!_this.mounted) {
              return stopDragging();
            }
          });
        };
      })(this);
      onMouseMove = function(event) {
        lastMousePosition.clientX = event.clientX;
        lastMousePosition.clientY = event.clientY;
        if (!dragging) {
          dragging = true;
          animationLoop();
        }
        if (event.which === 0) {
          return onMouseUp();
        }
      };
      onMouseUp = (function(_this) {
        return function(event) {
          if (dragging) {
            stopDragging();
            _this.editor.finalizeSelections();
            return _this.editor.mergeIntersectingSelections();
          }
        };
      })(this);
      stopDragging = function() {
        dragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        return disposables.dispose();
      };
      autoscroll = (function(_this) {
        return function(mouseClientPosition) {
          var bottom, left, mouseXDelta, mouseYDelta, ref1, right, top, xDirection, yDirection;
          ref1 = _this.scrollViewNode.getBoundingClientRect(), top = ref1.top, bottom = ref1.bottom, left = ref1.left, right = ref1.right;
          top += 30;
          bottom -= 30;
          left += 30;
          right -= 30;
          if (mouseClientPosition.clientY < top) {
            mouseYDelta = top - mouseClientPosition.clientY;
            yDirection = -1;
          } else if (mouseClientPosition.clientY > bottom) {
            mouseYDelta = mouseClientPosition.clientY - bottom;
            yDirection = 1;
          }
          if (mouseClientPosition.clientX < left) {
            mouseXDelta = left - mouseClientPosition.clientX;
            xDirection = -1;
          } else if (mouseClientPosition.clientX > right) {
            mouseXDelta = mouseClientPosition.clientX - right;
            xDirection = 1;
          }
          if (mouseYDelta != null) {
            _this.presenter.setScrollTop(_this.presenter.getScrollTop() + yDirection * scaleScrollDelta(mouseYDelta));
            _this.presenter.commitPendingScrollTopPosition();
          }
          if (mouseXDelta != null) {
            _this.presenter.setScrollLeft(_this.presenter.getScrollLeft() + xDirection * scaleScrollDelta(mouseXDelta));
            return _this.presenter.commitPendingScrollLeftPosition();
          }
        };
      })(this);
      scaleScrollDelta = function(scrollDelta) {
        return Math.pow(scrollDelta / 2, 3) / 280;
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      disposables = new CompositeDisposable;
      disposables.add(this.editor.getBuffer().onWillChange(onMouseUp));
      return disposables.add(this.editor.onDidDestroy(stopDragging));
    };

    TextEditorComponent.prototype.isVisible = function() {
      this.assert(this.domNode != null, "TextEditorComponent::domNode was null.", (function(_this) {
        return function(error) {
          return error.metadata = {
            initialized: _this.initialized
          };
        };
      })(this));
      return (this.domNode != null) && (this.domNode.offsetHeight > 0 || this.domNode.offsetWidth > 0);
    };

    TextEditorComponent.prototype.pollDOM = function() {
      var ref1;
      if (!this.checkForVisibilityChange()) {
        this.sampleBackgroundColors();
        this.measureWindowSize();
        this.measureDimensions();
        this.sampleFontStyling();
        return (ref1 = this.overlayManager) != null ? ref1.measureOverlays() : void 0;
      }
    };

    TextEditorComponent.prototype.checkForVisibilityChange = function() {
      if (this.isVisible()) {
        if (this.wasVisible) {
          return false;
        } else {
          this.becameVisible();
          return this.wasVisible = true;
        }
      } else {
        return this.wasVisible = false;
      }
    };

    TextEditorComponent.prototype.measureDimensions = function() {
      var bottom, clientWidth, hasExplicitTopAndBottom, hasInlineHeight, paddingLeft, position, ref1, ref2, ref3, top;
      if (this.editor.autoHeight == null) {
        ref1 = getComputedStyle(this.hostElement), position = ref1.position, top = ref1.top, bottom = ref1.bottom;
        hasExplicitTopAndBottom = position === 'absolute' && top !== 'auto' && bottom !== 'auto';
        hasInlineHeight = this.hostElement.style.height.length > 0;
        if (hasInlineHeight || hasExplicitTopAndBottom) {
          if (this.presenter.autoHeight) {
            this.presenter.setAutoHeight(false);
            if (hasExplicitTopAndBottom) {
              Grim.deprecate("Assigning editor " + this.editor.id + "'s height explicitly via `position: 'absolute'` and an assigned `top` and `bottom` implicitly assigns the `autoHeight` property to false on the editor.\nThis behavior is deprecated and will not be supported in the future. Please explicitly assign `autoHeight` on this editor.");
            } else if (hasInlineHeight) {
              Grim.deprecate("Assigning editor " + this.editor.id + "'s height explicitly via an inline style implicitly assigns the `autoHeight` property to false on the editor.\nThis behavior is deprecated and will not be supported in the future. Please explicitly assign `autoHeight` on this editor.");
            }
          }
        } else {
          this.presenter.setAutoHeight(true);
        }
      }
      if (this.presenter.autoHeight) {
        this.presenter.setExplicitHeight(null);
      } else if (this.hostElement.offsetHeight > 0) {
        this.presenter.setExplicitHeight(this.hostElement.offsetHeight);
      }
      clientWidth = this.scrollViewNode.clientWidth;
      paddingLeft = parseInt(getComputedStyle(this.scrollViewNode).paddingLeft);
      clientWidth -= paddingLeft;
      if (clientWidth > 0) {
        this.presenter.setContentFrameWidth(clientWidth);
      }
      this.presenter.setGutterWidth((ref2 = (ref3 = this.gutterContainerComponent) != null ? ref3.getDomNode().offsetWidth : void 0) != null ? ref2 : 0);
      return this.presenter.setBoundingClientRect(this.hostElement.getBoundingClientRect());
    };

    TextEditorComponent.prototype.measureWindowSize = function() {
      if (!this.mounted) {
        return;
      }
      return this.presenter.setWindowSize(window.innerWidth, window.innerHeight);
    };

    TextEditorComponent.prototype.sampleFontStyling = function() {
      var oldFontFamily, oldFontSize, oldLineHeight, ref1;
      oldFontSize = this.fontSize;
      oldFontFamily = this.fontFamily;
      oldLineHeight = this.lineHeight;
      ref1 = getComputedStyle(this.getTopmostDOMNode()), this.fontSize = ref1.fontSize, this.fontFamily = ref1.fontFamily, this.lineHeight = ref1.lineHeight;
      if (this.fontSize !== oldFontSize || this.fontFamily !== oldFontFamily || this.lineHeight !== oldLineHeight) {
        this.clearPoolAfterUpdate = true;
        this.measureLineHeightAndDefaultCharWidth();
        return this.invalidateMeasurements();
      }
    };

    TextEditorComponent.prototype.sampleBackgroundColors = function(suppressUpdate) {
      var backgroundColor, gutterBackgroundColor, lineNumberGutter, ref1;
      backgroundColor = getComputedStyle(this.hostElement).backgroundColor;
      this.presenter.setBackgroundColor(backgroundColor);
      lineNumberGutter = (ref1 = this.gutterContainerComponent) != null ? ref1.getLineNumberGutterComponent() : void 0;
      if (lineNumberGutter) {
        gutterBackgroundColor = getComputedStyle(lineNumberGutter.getDomNode()).backgroundColor;
        return this.presenter.setGutterBackgroundColor(gutterBackgroundColor);
      }
    };

    TextEditorComponent.prototype.measureLineHeightAndDefaultCharWidth = function() {
      if (this.isVisible()) {
        this.measureLineHeightAndDefaultCharWidthWhenShown = false;
        return this.linesComponent.measureLineHeightAndDefaultCharWidth();
      } else {
        return this.measureLineHeightAndDefaultCharWidthWhenShown = true;
      }
    };

    TextEditorComponent.prototype.measureScrollbars = function() {
      var cornerNode, height, originalDisplayValue, width;
      this.measureScrollbarsWhenShown = false;
      cornerNode = this.scrollbarCornerComponent.getDomNode();
      originalDisplayValue = cornerNode.style.display;
      cornerNode.style.display = 'block';
      width = (cornerNode.offsetWidth - cornerNode.clientWidth) || 15;
      height = (cornerNode.offsetHeight - cornerNode.clientHeight) || 15;
      this.presenter.setVerticalScrollbarWidth(width);
      this.presenter.setHorizontalScrollbarHeight(height);
      return cornerNode.style.display = originalDisplayValue;
    };

    TextEditorComponent.prototype.containsScrollbarSelector = function(stylesheet) {
      var i, len, ref1, ref2, rule;
      ref1 = stylesheet.cssRules;
      for (i = 0, len = ref1.length; i < len; i++) {
        rule = ref1[i];
        if (((ref2 = rule.selectorText) != null ? ref2.indexOf('scrollbar') : void 0) > -1) {
          return true;
        }
      }
      return false;
    };

    TextEditorComponent.prototype.refreshScrollbars = function() {
      var cornerNode, horizontalNode, originalCornerDisplayValue, originalHorizontalDisplayValue, originalVerticalDisplayValue, verticalNode;
      if (this.isVisible()) {
        this.measureScrollbarsWhenShown = false;
      } else {
        this.measureScrollbarsWhenShown = true;
        return;
      }
      verticalNode = this.verticalScrollbarComponent.getDomNode();
      horizontalNode = this.horizontalScrollbarComponent.getDomNode();
      cornerNode = this.scrollbarCornerComponent.getDomNode();
      originalVerticalDisplayValue = verticalNode.style.display;
      originalHorizontalDisplayValue = horizontalNode.style.display;
      originalCornerDisplayValue = cornerNode.style.display;
      verticalNode.style.display = 'none';
      horizontalNode.style.display = 'none';
      cornerNode.style.display = 'none';
      cornerNode.offsetWidth;
      this.measureScrollbars();
      verticalNode.style.display = originalVerticalDisplayValue;
      horizontalNode.style.display = originalHorizontalDisplayValue;
      return cornerNode.style.display = originalCornerDisplayValue;
    };

    TextEditorComponent.prototype.consolidateSelections = function(e) {
      if (!this.editor.consolidateSelections()) {
        return e.abortKeyBinding();
      }
    };

    TextEditorComponent.prototype.lineNodeForScreenRow = function(screenRow) {
      return this.linesComponent.lineNodeForScreenRow(screenRow);
    };

    TextEditorComponent.prototype.lineNumberNodeForScreenRow = function(screenRow) {
      var gutterComponent, tileComponent, tileRow;
      tileRow = this.presenter.tileForRow(screenRow);
      gutterComponent = this.gutterContainerComponent.getLineNumberGutterComponent();
      tileComponent = gutterComponent.getComponentForTile(tileRow);
      return tileComponent != null ? tileComponent.lineNumberNodeForScreenRow(screenRow) : void 0;
    };

    TextEditorComponent.prototype.tileNodesForLines = function() {
      return this.linesComponent.getTiles();
    };

    TextEditorComponent.prototype.tileNodesForLineNumbers = function() {
      var gutterComponent;
      gutterComponent = this.gutterContainerComponent.getLineNumberGutterComponent();
      return gutterComponent.getTiles();
    };

    TextEditorComponent.prototype.screenRowForNode = function(node) {
      var ref1, screenRow;
      while (node != null) {
        if (screenRow = (ref1 = node.dataset) != null ? ref1.screenRow : void 0) {
          return parseInt(screenRow);
        }
        node = node.parentElement;
      }
      return null;
    };

    TextEditorComponent.prototype.getFontSize = function() {
      return parseInt(getComputedStyle(this.getTopmostDOMNode()).fontSize);
    };

    TextEditorComponent.prototype.setFontSize = function(fontSize) {
      this.getTopmostDOMNode().style.fontSize = fontSize + 'px';
      this.sampleFontStyling();
      return this.invalidateMeasurements();
    };

    TextEditorComponent.prototype.getFontFamily = function() {
      return getComputedStyle(this.getTopmostDOMNode()).fontFamily;
    };

    TextEditorComponent.prototype.setFontFamily = function(fontFamily) {
      this.getTopmostDOMNode().style.fontFamily = fontFamily;
      this.sampleFontStyling();
      return this.invalidateMeasurements();
    };

    TextEditorComponent.prototype.setLineHeight = function(lineHeight) {
      this.getTopmostDOMNode().style.lineHeight = lineHeight;
      this.sampleFontStyling();
      return this.invalidateMeasurements();
    };

    TextEditorComponent.prototype.invalidateMeasurements = function() {
      this.linesYardstick.invalidateCache();
      return this.presenter.measurementsChanged();
    };

    TextEditorComponent.prototype.screenPositionForMouseEvent = function(event, linesClientRect) {
      var pixelPosition;
      pixelPosition = this.pixelPositionForMouseEvent(event, linesClientRect);
      return this.screenPositionForPixelPosition(pixelPosition);
    };

    TextEditorComponent.prototype.pixelPositionForMouseEvent = function(event, linesClientRect) {
      var bottom, clientX, clientY, left, right, top;
      clientX = event.clientX, clientY = event.clientY;
      if (linesClientRect == null) {
        linesClientRect = this.linesComponent.getDomNode().getBoundingClientRect();
      }
      top = clientY - linesClientRect.top + this.presenter.getRealScrollTop();
      left = clientX - linesClientRect.left + this.presenter.getRealScrollLeft();
      bottom = linesClientRect.top + this.presenter.getRealScrollTop() + linesClientRect.height - clientY;
      right = linesClientRect.left + this.presenter.getRealScrollLeft() + linesClientRect.width - clientX;
      return {
        top: top,
        left: left,
        bottom: bottom,
        right: right
      };
    };

    TextEditorComponent.prototype.getGutterWidth = function() {
      return this.presenter.getGutterWidth();
    };

    TextEditorComponent.prototype.getModel = function() {
      return this.editor;
    };

    TextEditorComponent.prototype.isInputEnabled = function() {
      return this.inputEnabled;
    };

    TextEditorComponent.prototype.setInputEnabled = function(inputEnabled) {
      this.inputEnabled = inputEnabled;
      return this.inputEnabled;
    };

    TextEditorComponent.prototype.setContinuousReflow = function(continuousReflow) {
      return this.presenter.setContinuousReflow(continuousReflow);
    };

    TextEditorComponent.prototype.updateParentViewFocusedClassIfNeeded = function() {
      if (this.oldState.focused !== this.newState.focused) {
        this.hostElement.classList.toggle('is-focused', this.newState.focused);
        return this.oldState.focused = this.newState.focused;
      }
    };

    TextEditorComponent.prototype.updateParentViewMiniClass = function() {
      return this.hostElement.classList.toggle('mini', this.editor.isMini());
    };

    return TextEditorComponent;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3RleHQtZWRpdG9yLWNvbXBvbmVudC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLDZUQUFBO0lBQUE7O0VBQUEsY0FBQSxHQUFpQixPQUFBLENBQVEsaUJBQVI7O0VBQ2pCLE1BQWlCLE9BQUEsQ0FBUSxhQUFSLENBQWpCLEVBQUMsaUJBQUQsRUFBUTs7RUFDUCxzQkFBdUIsT0FBQSxDQUFRLFdBQVI7O0VBQ3ZCLGNBQWUsT0FBQSxDQUFRLFVBQVI7O0VBQ2hCLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFFUCxtQkFBQSxHQUFzQixPQUFBLENBQVEseUJBQVI7O0VBQ3RCLHdCQUFBLEdBQTJCLE9BQUEsQ0FBUSw4QkFBUjs7RUFDM0IsY0FBQSxHQUFpQixPQUFBLENBQVEsbUJBQVI7O0VBQ2pCLGNBQUEsR0FBaUIsT0FBQSxDQUFRLG1CQUFSOztFQUNqQixrQ0FBQSxHQUFxQyxPQUFBLENBQVEsMENBQVI7O0VBQ3JDLGtCQUFBLEdBQXFCLE9BQUEsQ0FBUSx1QkFBUjs7RUFDckIsd0JBQUEsR0FBMkIsT0FBQSxDQUFRLDhCQUFSOztFQUMzQixjQUFBLEdBQWlCLE9BQUEsQ0FBUSxtQkFBUjs7RUFDakIsY0FBQSxHQUFpQixPQUFBLENBQVEsb0JBQVI7O0VBQ2pCLGNBQUEsR0FBaUIsT0FBQSxDQUFRLG1CQUFSOztFQUNqQixZQUFBLEdBQWUsT0FBQSxDQUFRLGdCQUFSOztFQUVmLE1BQU0sQ0FBQyxPQUFQLEdBQ007a0NBQ0osaUJBQUEsR0FBbUI7O2tDQUNuQixzQkFBQSxHQUF3Qjs7a0NBQ3hCLFFBQUEsR0FBVTs7a0NBRVYsZ0JBQUEsR0FBa0I7O2tDQUNsQixpQkFBQSxHQUFtQjs7a0NBQ25CLGVBQUEsR0FBaUI7O2tDQUNqQixhQUFBLEdBQWU7O2tDQUNmLDBCQUFBLEdBQTRCOztrQ0FDNUIs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O1FBQU0sTUFBQSxJQUFOO1FBQVksUUFBQSxNQUFaO1FBQW9CLE9BQUEsS0FBcEI7O0lBVDBCOztrQ0FXNUIsY0FBQSxHQUFnQixTQUFBO2FBQ2QsSUFBQyxDQUFBLFNBQVMsQ0FBQyxjQUFYLENBQUE7SUFEYzs7a0NBR2hCLFFBQUEsR0FBVSxTQUFBO2FBQ1IsSUFBQyxDQUFBO0lBRE87O2tDQUdWLGNBQUEsR0FBZ0IsU0FBQTthQUFHLElBQUMsQ0FBQTtJQUFKOztrQ0FFaEIsZUFBQSxHQUFpQixTQUFDLFlBQUQ7TUFBQyxJQUFDLENBQUEsZUFBRDthQUFrQixJQUFDLENBQUE7SUFBcEI7O2tDQUVqQixtQkFBQSxHQUFxQixTQUFDLGdCQUFEO2FBQ25CLElBQUMsQ0FBQSxTQUFTLENBQUMsbUJBQVgsQ0FBK0IsZ0JBQS9CO0lBRG1COztrQ0FHckIsb0NBQUEsR0FBc0MsU0FBQTtNQUNwQyxJQUFHLElBQUMsQ0FBQSxRQUFRLENBQUMsT0FBVixLQUF1QixJQUFDLENBQUEsUUFBUSxDQUFDLE9BQXBDO1FBQ0UsSUFBQyxDQUFBLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBdkIsQ0FBOEIsWUFBOUIsRUFBNEMsSUFBQyxDQUFBLFFBQVEsQ0FBQyxPQUF0RDtlQUNBLElBQUMsQ0FBQSxRQUFRLENBQUMsT0FBVixHQUFvQixJQUFDLENBQUEsUUFBUSxDQUFDLFFBRmhDOztJQURvQzs7a0NBS3RDLHlCQUFBLEdBQTJCLFNBQUE7YUFDekIsSUFBQyxDQUFBLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBdkIsQ0FBOEIsTUFBOUIsRUFBc0MsSUFBQyxDQUFBLE1BQU0sQ0FBQyxNQUFSLENBQUEsQ0FBdEM7SUFEeUI7Ozs7O0FBOThCN0IiLCJzb3VyY2VzQ29udGVudCI6WyJzY3JvbGxiYXJTdHlsZSA9IHJlcXVpcmUgJ3Njcm9sbGJhci1zdHlsZSdcbntSYW5nZSwgUG9pbnR9ID0gcmVxdWlyZSAndGV4dC1idWZmZXInXG57Q29tcG9zaXRlRGlzcG9zYWJsZX0gPSByZXF1aXJlICdldmVudC1raXQnXG57aXBjUmVuZGVyZXJ9ID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5HcmltID0gcmVxdWlyZSAnZ3JpbSdcblxuVGV4dEVkaXRvclByZXNlbnRlciA9IHJlcXVpcmUgJy4vdGV4dC1lZGl0b3ItcHJlc2VudGVyJ1xuR3V0dGVyQ29udGFpbmVyQ29tcG9uZW50ID0gcmVxdWlyZSAnLi9ndXR0ZXItY29udGFpbmVyLWNvbXBvbmVudCdcbklucHV0Q29tcG9uZW50ID0gcmVxdWlyZSAnLi9pbnB1dC1jb21wb25lbnQnXG5MaW5lc0NvbXBvbmVudCA9IHJlcXVpcmUgJy4vbGluZXMtY29tcG9uZW50J1xuT2ZmU2NyZWVuQmxvY2tEZWNvcmF0aW9uc0NvbXBvbmVudCA9IHJlcXVpcmUgJy4vb2ZmLXNjcmVlbi1ibG9jay1kZWNvcmF0aW9ucy1jb21wb25lbnQnXG5TY3JvbGxiYXJDb21wb25lbnQgPSByZXF1aXJlICcuL3Njcm9sbGJhci1jb21wb25lbnQnXG5TY3JvbGxiYXJDb3JuZXJDb21wb25lbnQgPSByZXF1aXJlICcuL3Njcm9sbGJhci1jb3JuZXItY29tcG9uZW50J1xuT3ZlcmxheU1hbmFnZXIgPSByZXF1aXJlICcuL292ZXJsYXktbWFuYWdlcidcbkRPTUVsZW1lbnRQb29sID0gcmVxdWlyZSAnLi9kb20tZWxlbWVudC1wb29sJ1xuTGluZXNZYXJkc3RpY2sgPSByZXF1aXJlICcuL2xpbmVzLXlhcmRzdGljaydcbkxpbmVUb3BJbmRleCA9IHJlcXVpcmUgJ2xpbmUtdG9wLWluZGV4J1xuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBUZXh0RWRpdG9yQ29tcG9uZW50XG4gIGN1cnNvckJsaW5rUGVyaW9kOiA4MDBcbiAgY3Vyc29yQmxpbmtSZXN1bWVEZWxheTogMTAwXG4gIHRpbGVTaXplOiAxMlxuXG4gIHBlbmRpbmdTY3JvbGxUb3A6IG51bGxcbiAgcGVuZGluZ1Njcm9sbExlZnQ6IG51bGxcbiAgdXBkYXRlUmVxdWVzdGVkOiBmYWxzZVxuICB1cGRhdGVzUGF1c2VkOiBmYWxzZVxuICB1cGRhdGVSZXF1ZXN0ZWRXaGlsZVBhdXNlZDogZmFsc2VcbiAgaGVpZ2h0QW5kV2lkdGhNZWFzdXJlbWVudFJlcXVlc3RlZDogZmFsc2VcbiAgaW5wdXRFbmFibGVkOiB0cnVlXG4gIG1lYXN1cmVTY3JvbGxiYXJzV2hlblNob3duOiB0cnVlXG4gIG1lYXN1cmVMaW5lSGVpZ2h0QW5kRGVmYXVsdENoYXJXaWR0aFdoZW5TaG93bjogdHJ1ZVxuICBzdHlsaW5nQ2hhbmdlQW5pbWF0aW9uRnJhbWVSZXF1ZXN0ZWQ6IGZhbHNlXG4gIGd1dHRlckNvbXBvbmVudDogbnVsbFxuICBtb3VudGVkOiB0cnVlXG4gIGluaXRpYWxpemVkOiBmYWxzZVxuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBAcHJvdG90eXBlLCBcImRvbU5vZGVcIixcbiAgICBnZXQ6IC0+IEBkb21Ob2RlVmFsdWVcbiAgICBzZXQ6IChkb21Ob2RlKSAtPlxuICAgICAgQGFzc2VydCBkb21Ob2RlPywgXCJUZXh0RWRpdG9yQ29tcG9uZW50Ojpkb21Ob2RlIHdhcyBzZXQgdG8gbnVsbC5cIlxuICAgICAgQGRvbU5vZGVWYWx1ZSA9IGRvbU5vZGVcblxuICBjb25zdHJ1Y3RvcjogKHtAZWRpdG9yLCBAaG9zdEVsZW1lbnQsIHRpbGVTaXplLCBAdmlld3MsIEB0aGVtZXMsIEBzdHlsZXMsIEBhc3NlcnQsIGhpZGRlbklucHV0RWxlbWVudH0pIC0+XG4gICAgQHRpbGVTaXplID0gdGlsZVNpemUgaWYgdGlsZVNpemU/XG4gICAgQGRpc3Bvc2FibGVzID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcblxuICAgIGxpbmVUb3BJbmRleCA9IG5ldyBMaW5lVG9wSW5kZXgoe1xuICAgICAgZGVmYXVsdExpbmVIZWlnaHQ6IEBlZGl0b3IuZ2V0TGluZUhlaWdodEluUGl4ZWxzKClcbiAgICB9KVxuICAgIEBwcmVzZW50ZXIgPSBuZXcgVGV4dEVkaXRvclByZXNlbnRlclxuICAgICAgbW9kZWw6IEBlZGl0b3JcbiAgICAgIHRpbGVTaXplOiB0aWxlU2l6ZVxuICAgICAgY3Vyc29yQmxpbmtQZXJpb2Q6IEBjdXJzb3JCbGlua1BlcmlvZFxuICAgICAgY3Vyc29yQmxpbmtSZXN1bWVEZWxheTogQGN1cnNvckJsaW5rUmVzdW1lRGVsYXlcbiAgICAgIHN0b3BwZWRTY3JvbGxpbmdEZWxheTogMjAwXG4gICAgICBsaW5lVG9wSW5kZXg6IGxpbmVUb3BJbmRleFxuICAgICAgYXV0b0hlaWdodDogQGVkaXRvci5nZXRBdXRvSGVpZ2h0KClcblxuICAgIEBwcmVzZW50ZXIub25EaWRVcGRhdGVTdGF0ZShAcmVxdWVzdFVwZGF0ZSlcblxuICAgIEBkb21FbGVtZW50UG9vbCA9IG5ldyBET01FbGVtZW50UG9vbFxuICAgIEBkb21Ob2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICBAZG9tTm9kZS5jbGFzc0xpc3QuYWRkKCdlZGl0b3ItY29udGVudHMtLXByaXZhdGUnKVxuXG4gICAgQG92ZXJsYXlNYW5hZ2VyID0gbmV3IE92ZXJsYXlNYW5hZ2VyKEBwcmVzZW50ZXIsIEBkb21Ob2RlLCBAdmlld3MpXG5cbiAgICBAc2Nyb2xsVmlld05vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgIEBzY3JvbGxWaWV3Tm9kZS5jbGFzc0xpc3QuYWRkKCdzY3JvbGwtdmlldycpXG4gICAgQGRvbU5vZGUuYXBwZW5kQ2hpbGQoQHNjcm9sbFZpZXdOb2RlKVxuXG4gICAgQGhpZGRlbklucHV0Q29tcG9uZW50ID0gbmV3IElucHV0Q29tcG9uZW50KGhpZGRlbklucHV0RWxlbWVudClcbiAgICBAc2Nyb2xsVmlld05vZGUuYXBwZW5kQ2hpbGQoaGlkZGVuSW5wdXRFbGVtZW50KVxuICAgICMgQWRkIGEgZ2V0TW9kZWwgbWV0aG9kIHRvIHRoZSBoaWRkZW4gaW5wdXQgY29tcG9uZW50IHRvIG1ha2UgaXQgZWFzeSB0b1xuICAgICMgYWNjZXNzIHRoZSBlZGl0b3IgaW4gcmVzcG9uc2UgdG8gRE9NIGV2ZW50cyBvciB3aGVuIHVzaW5nXG4gICAgIyBkb2N1bWVudC5hY3RpdmVFbGVtZW50LlxuICAgIGhpZGRlbklucHV0RWxlbWVudC5nZXRNb2RlbCA9ID0+IEBlZGl0b3JcblxuICAgIEBsaW5lc0NvbXBvbmVudCA9IG5ldyBMaW5lc0NvbXBvbmVudCh7QHByZXNlbnRlciwgQGRvbUVsZW1lbnRQb29sLCBAYXNzZXJ0LCBAZ3JhbW1hcnMsIEB2aWV3c30pXG4gICAgQHNjcm9sbFZpZXdOb2RlLmFwcGVuZENoaWxkKEBsaW5lc0NvbXBvbmVudC5nZXREb21Ob2RlKCkpXG5cbiAgICBAb2ZmU2NyZWVuQmxvY2tEZWNvcmF0aW9uc0NvbXBvbmVudCA9IG5ldyBPZmZTY3JlZW5CbG9ja0RlY29yYXRpb25zQ29tcG9uZW50KHtAcHJlc2VudGVyLCBAdmlld3N9KVxuICAgIEBzY3JvbGxWaWV3Tm9kZS5hcHBlbmRDaGlsZChAb2ZmU2NyZWVuQmxvY2tEZWNvcmF0aW9uc0NvbXBvbmVudC5nZXREb21Ob2RlKCkpXG5cbiAgICBAbGluZXNZYXJkc3RpY2sgPSBuZXcgTGluZXNZYXJkc3RpY2soQGVkaXRvciwgQGxpbmVzQ29tcG9uZW50LCBsaW5lVG9wSW5kZXgpXG4gICAgQHByZXNlbnRlci5zZXRMaW5lc1lhcmRzdGljayhAbGluZXNZYXJkc3RpY2spXG5cbiAgICBAaG9yaXpvbnRhbFNjcm9sbGJhckNvbXBvbmVudCA9IG5ldyBTY3JvbGxiYXJDb21wb25lbnQoe29yaWVudGF0aW9uOiAnaG9yaXpvbnRhbCcsIG9uU2Nyb2xsOiBAb25Ib3Jpem9udGFsU2Nyb2xsfSlcbiAgICBAc2Nyb2xsVmlld05vZGUuYXBwZW5kQ2hpbGQoQGhvcml6b250YWxTY3JvbGxiYXJDb21wb25lbnQuZ2V0RG9tTm9kZSgpKVxuXG4gICAgQHZlcnRpY2FsU2Nyb2xsYmFyQ29tcG9uZW50ID0gbmV3IFNjcm9sbGJhckNvbXBvbmVudCh7b3JpZW50YXRpb246ICd2ZXJ0aWNhbCcsIG9uU2Nyb2xsOiBAb25WZXJ0aWNhbFNjcm9sbH0pXG4gICAgQGRvbU5vZGUuYXBwZW5kQ2hpbGQoQHZlcnRpY2FsU2Nyb2xsYmFyQ29tcG9uZW50LmdldERvbU5vZGUoKSlcblxuICAgIEBzY3JvbGxiYXJDb3JuZXJDb21wb25lbnQgPSBuZXcgU2Nyb2xsYmFyQ29ybmVyQ29tcG9uZW50XG4gICAgQGRvbU5vZGUuYXBwZW5kQ2hpbGQoQHNjcm9sbGJhckNvcm5lckNvbXBvbmVudC5nZXREb21Ob2RlKCkpXG5cbiAgICBAb2JzZXJ2ZUVkaXRvcigpXG4gICAgQGxpc3RlbkZvckRPTUV2ZW50cygpXG5cbiAgICBAZGlzcG9zYWJsZXMuYWRkIEBzdHlsZXMub25EaWRBZGRTdHlsZUVsZW1lbnQgQG9uU3R5bGVzaGVldHNDaGFuZ2VkXG4gICAgQGRpc3Bvc2FibGVzLmFkZCBAc3R5bGVzLm9uRGlkVXBkYXRlU3R5bGVFbGVtZW50IEBvblN0eWxlc2hlZXRzQ2hhbmdlZFxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQHN0eWxlcy5vbkRpZFJlbW92ZVN0eWxlRWxlbWVudCBAb25TdHlsZXNoZWV0c0NoYW5nZWRcbiAgICB1bmxlc3MgQHRoZW1lcy5pc0luaXRpYWxMb2FkQ29tcGxldGUoKVxuICAgICAgQGRpc3Bvc2FibGVzLmFkZCBAdGhlbWVzLm9uRGlkQ2hhbmdlQWN0aXZlVGhlbWVzIEBvbkFsbFRoZW1lc0xvYWRlZFxuICAgIEBkaXNwb3NhYmxlcy5hZGQgc2Nyb2xsYmFyU3R5bGUub25EaWRDaGFuZ2VQcmVmZXJyZWRTY3JvbGxiYXJTdHlsZSBAcmVmcmVzaFNjcm9sbGJhcnNcblxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQHZpZXdzLnBvbGxEb2N1bWVudChAcG9sbERPTSlcblxuICAgIEB1cGRhdGVTeW5jKClcbiAgICBAY2hlY2tGb3JWaXNpYmlsaXR5Q2hhbmdlKClcbiAgICBAaW5pdGlhbGl6ZWQgPSB0cnVlXG5cbiAgZGVzdHJveTogLT5cbiAgICBAbW91bnRlZCA9IGZhbHNlXG4gICAgQGRpc3Bvc2FibGVzLmRpc3Bvc2UoKVxuICAgIEBwcmVzZW50ZXIuZGVzdHJveSgpXG4gICAgQGd1dHRlckNvbnRhaW5lckNvbXBvbmVudD8uZGVzdHJveSgpXG4gICAgQGRvbUVsZW1lbnRQb29sLmNsZWFyKClcblxuICAgIEB2ZXJ0aWNhbFNjcm9sbGJhckNvbXBvbmVudC5kZXN0cm95KClcbiAgICBAaG9yaXpvbnRhbFNjcm9sbGJhckNvbXBvbmVudC5kZXN0cm95KClcblxuICAgIEBvblZlcnRpY2FsU2Nyb2xsID0gbnVsbFxuICAgIEBvbkhvcml6b250YWxTY3JvbGwgPSBudWxsXG5cbiAgZ2V0RG9tTm9kZTogLT5cbiAgICBAZG9tTm9kZVxuXG4gIHVwZGF0ZVN5bmM6IC0+XG4gICAgQHVwZGF0ZVN5bmNQcmVNZWFzdXJlbWVudCgpXG5cbiAgICBAb2xkU3RhdGUgPz0ge3dpZHRoOiBudWxsfVxuICAgIEBuZXdTdGF0ZSA9IEBwcmVzZW50ZXIuZ2V0UG9zdE1lYXN1cmVtZW50U3RhdGUoKVxuXG4gICAgaWYgQGVkaXRvci5nZXRMYXN0U2VsZWN0aW9uKCk/IGFuZCBub3QgQGVkaXRvci5nZXRMYXN0U2VsZWN0aW9uKCkuaXNFbXB0eSgpXG4gICAgICBAZG9tTm9kZS5jbGFzc0xpc3QuYWRkKCdoYXMtc2VsZWN0aW9uJylcbiAgICBlbHNlXG4gICAgICBAZG9tTm9kZS5jbGFzc0xpc3QucmVtb3ZlKCdoYXMtc2VsZWN0aW9uJylcblxuICAgIGlmIEBuZXdTdGF0ZS5mb2N1c2VkIGlzbnQgQG9sZFN0YXRlLmZvY3VzZWRcbiAgICAgIEBkb21Ob2RlLmNsYXNzTGlzdC50b2dnbGUoJ2lzLWZvY3VzZWQnLCBAbmV3U3RhdGUuZm9jdXNlZClcblxuICAgIEBwZXJmb3JtZWRJbml0aWFsTWVhc3VyZW1lbnQgPSBmYWxzZSBpZiBAZWRpdG9yLmlzRGVzdHJveWVkKClcblxuICAgIGlmIEBwZXJmb3JtZWRJbml0aWFsTWVhc3VyZW1lbnRcbiAgICAgIGlmIEBuZXdTdGF0ZS5oZWlnaHQgaXNudCBAb2xkU3RhdGUuaGVpZ2h0XG4gICAgICAgIGlmIEBuZXdTdGF0ZS5oZWlnaHQ/XG4gICAgICAgICAgQGRvbU5vZGUuc3R5bGUuaGVpZ2h0ID0gQG5ld1N0YXRlLmhlaWdodCArICdweCdcbiAgICAgICAgZWxzZVxuICAgICAgICAgIEBkb21Ob2RlLnN0eWxlLmhlaWdodCA9ICcnXG5cbiAgICAgIGlmIEBuZXdTdGF0ZS53aWR0aCBpc250IEBvbGRTdGF0ZS53aWR0aFxuICAgICAgICBpZiBAbmV3U3RhdGUud2lkdGg/XG4gICAgICAgICAgQGhvc3RFbGVtZW50LnN0eWxlLndpZHRoID0gQG5ld1N0YXRlLndpZHRoICsgJ3B4J1xuICAgICAgICBlbHNlXG4gICAgICAgICAgQGhvc3RFbGVtZW50LnN0eWxlLndpZHRoID0gJydcbiAgICAgICAgQG9sZFN0YXRlLndpZHRoID0gQG5ld1N0YXRlLndpZHRoXG5cbiAgICBpZiBAbmV3U3RhdGUuZ3V0dGVycy5sZW5ndGhcbiAgICAgIEBtb3VudEd1dHRlckNvbnRhaW5lckNvbXBvbmVudCgpIHVubGVzcyBAZ3V0dGVyQ29udGFpbmVyQ29tcG9uZW50P1xuICAgICAgQGd1dHRlckNvbnRhaW5lckNvbXBvbmVudC51cGRhdGVTeW5jKEBuZXdTdGF0ZSlcbiAgICBlbHNlXG4gICAgICBAZ3V0dGVyQ29udGFpbmVyQ29tcG9uZW50Py5nZXREb21Ob2RlKCk/LnJlbW92ZSgpXG4gICAgICBAZ3V0dGVyQ29udGFpbmVyQ29tcG9uZW50ID0gbnVsbFxuXG4gICAgQGhpZGRlbklucHV0Q29tcG9uZW50LnVwZGF0ZVN5bmMoQG5ld1N0YXRlKVxuICAgIEBvZmZTY3JlZW5CbG9ja0RlY29yYXRpb25zQ29tcG9uZW50LnVwZGF0ZVN5bmMoQG5ld1N0YXRlKVxuICAgIEBsaW5lc0NvbXBvbmVudC51cGRhdGVTeW5jKEBuZXdTdGF0ZSlcbiAgICBAaG9yaXpvbnRhbFNjcm9sbGJhckNvbXBvbmVudC51cGRhdGVTeW5jKEBuZXdTdGF0ZSlcbiAgICBAdmVydGljYWxTY3JvbGxiYXJDb21wb25lbnQudXBkYXRlU3luYyhAbmV3U3RhdGUpXG4gICAgQHNjcm9sbGJhckNvcm5lckNvbXBvbmVudC51cGRhdGVTeW5jKEBuZXdTdGF0ZSlcblxuICAgIEBvdmVybGF5TWFuYWdlcj8ucmVuZGVyKEBuZXdTdGF0ZSlcblxuICAgIGlmIEBjbGVhclBvb2xBZnRlclVwZGF0ZVxuICAgICAgQGRvbUVsZW1lbnRQb29sLmNsZWFyKClcbiAgICAgIEBjbGVhclBvb2xBZnRlclVwZGF0ZSA9IGZhbHNlXG5cbiAgICBpZiBAZWRpdG9yLmlzQWxpdmUoKVxuICAgICAgQHVwZGF0ZVBhcmVudFZpZXdGb2N1c2VkQ2xhc3NJZk5lZWRlZCgpXG4gICAgICBAdXBkYXRlUGFyZW50Vmlld01pbmlDbGFzcygpXG5cbiAgdXBkYXRlU3luY1ByZU1lYXN1cmVtZW50OiAtPlxuICAgIEBsaW5lc0NvbXBvbmVudC51cGRhdGVTeW5jKEBwcmVzZW50ZXIuZ2V0UHJlTWVhc3VyZW1lbnRTdGF0ZSgpKVxuXG4gIHJlYWRBZnRlclVwZGF0ZVN5bmM6ID0+XG4gICAgQG92ZXJsYXlNYW5hZ2VyPy5tZWFzdXJlT3ZlcmxheXMoKVxuICAgIEBsaW5lc0NvbXBvbmVudC5tZWFzdXJlQmxvY2tEZWNvcmF0aW9ucygpXG4gICAgQG9mZlNjcmVlbkJsb2NrRGVjb3JhdGlvbnNDb21wb25lbnQubWVhc3VyZUJsb2NrRGVjb3JhdGlvbnMoKVxuXG4gIG1vdW50R3V0dGVyQ29udGFpbmVyQ29tcG9uZW50OiAtPlxuICAgIEBndXR0ZXJDb250YWluZXJDb21wb25lbnQgPSBuZXcgR3V0dGVyQ29udGFpbmVyQ29tcG9uZW50KHtAZWRpdG9yLCBAb25MaW5lTnVtYmVyR3V0dGVyTW91c2VEb3duLCBAZG9tRWxlbWVudFBvb2wsIEB2aWV3c30pXG4gICAgQGRvbU5vZGUuaW5zZXJ0QmVmb3JlKEBndXR0ZXJDb250YWluZXJDb21wb25lbnQuZ2V0RG9tTm9kZSgpLCBAZG9tTm9kZS5maXJzdENoaWxkKVxuXG4gIGJlY2FtZVZpc2libGU6IC0+XG4gICAgQHVwZGF0ZXNQYXVzZWQgPSB0cnVlXG4gICAgIyBBbHdheXMgaW52YWxpZGF0ZSBMaW5lc1lhcmRzdGljayBtZWFzdXJlbWVudHMgd2hlbiB0aGUgZWRpdG9yIGJlY29tZXNcbiAgICAjIHZpc2libGUgYWdhaW4sIGJlY2F1c2UgY29udGVudCBtaWdodCBoYXZlIGJlZW4gcmVmbG93ZWQgYW5kIG1lYXN1cmVtZW50c1xuICAgICMgY291bGQgYmUgb3V0ZGF0ZWQuXG4gICAgQGludmFsaWRhdGVNZWFzdXJlbWVudHMoKVxuICAgIEBtZWFzdXJlU2Nyb2xsYmFycygpIGlmIEBtZWFzdXJlU2Nyb2xsYmFyc1doZW5TaG93blxuICAgIEBzYW1wbGVGb250U3R5bGluZygpXG4gICAgQHNhbXBsZUJhY2tncm91bmRDb2xvcnMoKVxuICAgIEBtZWFzdXJlV2luZG93U2l6ZSgpXG4gICAgQG1lYXN1cmVEaW1lbnNpb25zKClcbiAgICBAbWVhc3VyZUxpbmVIZWlnaHRBbmREZWZhdWx0Q2hhcldpZHRoKCkgaWYgQG1lYXN1cmVMaW5lSGVpZ2h0QW5kRGVmYXVsdENoYXJXaWR0aFdoZW5TaG93blxuICAgIEBlZGl0b3Iuc2V0VmlzaWJsZSh0cnVlKVxuICAgIEBwZXJmb3JtZWRJbml0aWFsTWVhc3VyZW1lbnQgPSB0cnVlXG4gICAgQHVwZGF0ZXNQYXVzZWQgPSBmYWxzZVxuICAgIEB1cGRhdGVTeW5jKCkgaWYgQGNhblVwZGF0ZSgpXG5cbiAgcmVxdWVzdFVwZGF0ZTogPT5cbiAgICByZXR1cm4gdW5sZXNzIEBjYW5VcGRhdGUoKVxuXG4gICAgaWYgQHVwZGF0ZXNQYXVzZWRcbiAgICAgIEB1cGRhdGVSZXF1ZXN0ZWRXaGlsZVBhdXNlZCA9IHRydWVcbiAgICAgIHJldHVyblxuXG4gICAgaWYgQGhvc3RFbGVtZW50LmlzVXBkYXRlZFN5bmNocm9ub3VzbHkoKVxuICAgICAgQHVwZGF0ZVN5bmMoKVxuICAgIGVsc2UgdW5sZXNzIEB1cGRhdGVSZXF1ZXN0ZWRcbiAgICAgIEB1cGRhdGVSZXF1ZXN0ZWQgPSB0cnVlXG4gICAgICBAdmlld3MudXBkYXRlRG9jdW1lbnQgPT5cbiAgICAgICAgQHVwZGF0ZVJlcXVlc3RlZCA9IGZhbHNlXG4gICAgICAgIEB1cGRhdGVTeW5jKCkgaWYgQGNhblVwZGF0ZSgpXG4gICAgICBAdmlld3MucmVhZERvY3VtZW50KEByZWFkQWZ0ZXJVcGRhdGVTeW5jKVxuXG4gIGNhblVwZGF0ZTogLT5cbiAgICBAbW91bnRlZCBhbmQgQGVkaXRvci5pc0FsaXZlKClcblxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWU6IChmbikgLT5cbiAgICBAdXBkYXRlc1BhdXNlZCA9IHRydWVcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPT5cbiAgICAgIGZuKClcbiAgICAgIEB1cGRhdGVzUGF1c2VkID0gZmFsc2VcbiAgICAgIGlmIEB1cGRhdGVSZXF1ZXN0ZWRXaGlsZVBhdXNlZCBhbmQgQGNhblVwZGF0ZSgpXG4gICAgICAgIEB1cGRhdGVSZXF1ZXN0ZWRXaGlsZVBhdXNlZCA9IGZhbHNlXG4gICAgICAgIEByZXF1ZXN0VXBkYXRlKClcblxuICBnZXRUb3Btb3N0RE9NTm9kZTogLT5cbiAgICBAaG9zdEVsZW1lbnRcblxuICBvYnNlcnZlRWRpdG9yOiAtPlxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQGVkaXRvci5vYnNlcnZlR3JhbW1hcihAb25HcmFtbWFyQ2hhbmdlZClcblxuICBsaXN0ZW5Gb3JET01FdmVudHM6IC0+XG4gICAgQGRvbU5vZGUuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2V3aGVlbCcsIEBvbk1vdXNlV2hlZWxcbiAgICBAZG9tTm9kZS5hZGRFdmVudExpc3RlbmVyICd0ZXh0SW5wdXQnLCBAb25UZXh0SW5wdXRcbiAgICBAc2Nyb2xsVmlld05vZGUuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vkb3duJywgQG9uTW91c2VEb3duXG4gICAgQHNjcm9sbFZpZXdOb2RlLmFkZEV2ZW50TGlzdGVuZXIgJ3Njcm9sbCcsIEBvblNjcm9sbFZpZXdTY3JvbGxcblxuICAgIEBkZXRlY3RBY2NlbnRlZENoYXJhY3Rlck1lbnUoKVxuICAgIEBsaXN0ZW5Gb3JJTUVFdmVudHMoKVxuICAgIEB0cmFja1NlbGVjdGlvbkNsaXBib2FyZCgpIGlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ2xpbnV4J1xuXG4gIGRldGVjdEFjY2VudGVkQ2hhcmFjdGVyTWVudTogLT5cbiAgICAjIFdlIG5lZWQgdG8gZ2V0IGNsZXZlciB0byBkZXRlY3Qgd2hlbiB0aGUgYWNjZW50ZWQgY2hhcmFjdGVyIG1lbnUgaXNcbiAgICAjIG9wZW5lZCBvbiBtYWNPUy4gVXN1YWxseSwgZXZlcnkga2V5ZG93biBldmVudCB0aGF0IGNvdWxkIGNhdXNlIGlucHV0IGlzXG4gICAgIyBmb2xsb3dlZCBieSBhIGNvcnJlc3BvbmRpbmcga2V5cHJlc3MuIEhvd2V2ZXIsIHByZXNzaW5nIGFuZCBob2xkaW5nXG4gICAgIyBsb25nIGVub3VnaCB0byBvcGVuIHRoZSBhY2NlbnRlZCBjaGFyYWN0ZXIgbWVudSBjYXVzZXMgYWRkaXRpb25hbCBrZXlkb3duXG4gICAgIyBldmVudHMgdG8gZmlyZSB0aGF0IGFyZW4ndCBmb2xsb3dlZCBieSB0aGVpciBvd24ga2V5cHJlc3MgYW5kIHRleHRJbnB1dFxuICAgICMgZXZlbnRzLlxuICAgICNcbiAgICAjIFRoZXJlZm9yZSwgd2UgYXNzdW1lIHRoZSBhY2NlbnRlZCBjaGFyYWN0ZXIgbWVudSBoYXMgYmVlbiBkZXBsb3llZCBpZixcbiAgICAjIGJlZm9yZSBvYnNlcnZpbmcgYW55IGtleXVwIGV2ZW50LCB3ZSBvYnNlcnZlIGV2ZW50cyBpbiB0aGUgZm9sbG93aW5nXG4gICAgIyBzZXF1ZW5jZTpcbiAgICAjXG4gICAgIyBrZXlkb3duKGtleUNvZGU6IFgpLCBrZXlwcmVzcywga2V5ZG93bihrZXlDb2RlOiBYKVxuICAgICNcbiAgICAjIFRoZSBrZXlDb2RlIFggbXVzdCBiZSB0aGUgc2FtZSBpbiB0aGUga2V5ZG93biBldmVudHMgdGhhdCBicmFja2V0IHRoZVxuICAgICMga2V5cHJlc3MsIG1lYW5pbmcgd2UncmUgKmhvbGRpbmcqIHRoZSBfc2FtZV8ga2V5IHdlIGludGlhbGx5IHByZXNzZWQuXG4gICAgIyBHb3QgdGhhdD9cbiAgICBsYXN0S2V5ZG93biA9IG51bGxcbiAgICBsYXN0S2V5ZG93bkJlZm9yZUtleXByZXNzID0gbnVsbFxuXG4gICAgQGRvbU5vZGUuYWRkRXZlbnRMaXN0ZW5lciAna2V5ZG93bicsIChldmVudCkgPT5cbiAgICAgIGlmIGxhc3RLZXlkb3duQmVmb3JlS2V5cHJlc3NcbiAgICAgICAgaWYgbGFzdEtleWRvd25CZWZvcmVLZXlwcmVzcy5rZXlDb2RlIGlzIGV2ZW50LmtleUNvZGVcbiAgICAgICAgICBAb3BlbmVkQWNjZW50ZWRDaGFyYWN0ZXJNZW51ID0gdHJ1ZVxuICAgICAgICBsYXN0S2V5ZG93bkJlZm9yZUtleXByZXNzID0gbnVsbFxuICAgICAgZWxzZVxuICAgICAgICBsYXN0S2V5ZG93biA9IGV2ZW50XG5cbiAgICBAZG9tTm9kZS5hZGRFdmVudExpc3RlbmVyICdrZXlwcmVzcycsID0+XG4gICAgICBsYXN0S2V5ZG93bkJlZm9yZUtleXByZXNzID0gbGFzdEtleWRvd25cbiAgICAgIGxhc3RLZXlkb3duID0gbnVsbFxuXG4gICAgICAjIFRoaXMgY2FuY2VscyB0aGUgYWNjZW50ZWQgY2hhcmFjdGVyIGJlaGF2aW9yIGlmIHdlIHR5cGUgYSBrZXkgbm9ybWFsbHlcbiAgICAgICMgd2l0aCB0aGUgbWVudSBvcGVuLlxuICAgICAgQG9wZW5lZEFjY2VudGVkQ2hhcmFjdGVyTWVudSA9IGZhbHNlXG5cbiAgICBAZG9tTm9kZS5hZGRFdmVudExpc3RlbmVyICdrZXl1cCcsIC0+XG4gICAgICBsYXN0S2V5ZG93bkJlZm9yZUtleXByZXNzID0gbnVsbFxuICAgICAgbGFzdEtleWRvd24gPSBudWxsXG5cbiAgbGlzdGVuRm9ySU1FRXZlbnRzOiAtPlxuICAgICMgVGhlIElNRSBjb21wb3NpdGlvbiBldmVudHMgd29yayBsaWtlIHRoaXM6XG4gICAgI1xuICAgICMgVXNlciB0eXBlcyAncycsIGNocm9taXVtIHBvcHMgdXAgdGhlIGNvbXBsZXRpb24gaGVscGVyXG4gICAgIyAgIDEuIGNvbXBvc2l0aW9uc3RhcnQgZmlyZWRcbiAgICAjICAgMi4gY29tcG9zaXRpb251cGRhdGUgZmlyZWQ7IGV2ZW50LmRhdGEgPT0gJ3MnXG4gICAgIyBVc2VyIGhpdHMgYXJyb3cga2V5cyB0byBtb3ZlIGFyb3VuZCBpbiBjb21wbGV0aW9uIGhlbHBlclxuICAgICMgICAzLiBjb21wb3NpdGlvbnVwZGF0ZSBmaXJlZDsgZXZlbnQuZGF0YSA9PSAncycgZm9yIGVhY2ggYXJyeSBrZXkgcHJlc3NcbiAgICAjIFVzZXIgZXNjYXBlIHRvIGNhbmNlbFxuICAgICMgICA0LiBjb21wb3NpdGlvbmVuZCBmaXJlZFxuICAgICMgT1IgVXNlciBjaG9vc2VzIGEgY29tcGxldGlvblxuICAgICMgICA0LiBjb21wb3NpdGlvbmVuZCBmaXJlZFxuICAgICMgICA1LiB0ZXh0SW5wdXQgZmlyZWQ7IGV2ZW50LmRhdGEgPT0gdGhlIGNvbXBsZXRpb24gc3RyaW5nXG5cbiAgICBjaGVja3BvaW50ID0gbnVsbFxuICAgIEBkb21Ob2RlLmFkZEV2ZW50TGlzdGVuZXIgJ2NvbXBvc2l0aW9uc3RhcnQnLCA9PlxuICAgICAgaWYgQG9wZW5lZEFjY2VudGVkQ2hhcmFjdGVyTWVudVxuICAgICAgICBAZWRpdG9yLnNlbGVjdExlZnQoKVxuICAgICAgICBAb3BlbmVkQWNjZW50ZWRDaGFyYWN0ZXJNZW51ID0gZmFsc2VcbiAgICAgIGNoZWNrcG9pbnQgPSBAZWRpdG9yLmNyZWF0ZUNoZWNrcG9pbnQoKVxuICAgIEBkb21Ob2RlLmFkZEV2ZW50TGlzdGVuZXIgJ2NvbXBvc2l0aW9udXBkYXRlJywgKGV2ZW50KSA9PlxuICAgICAgQGVkaXRvci5pbnNlcnRUZXh0KGV2ZW50LmRhdGEsIHNlbGVjdDogdHJ1ZSlcbiAgICBAZG9tTm9kZS5hZGRFdmVudExpc3RlbmVyICdjb21wb3NpdGlvbmVuZCcsIChldmVudCkgPT5cbiAgICAgIEBlZGl0b3IucmV2ZXJ0VG9DaGVja3BvaW50KGNoZWNrcG9pbnQpXG4gICAgICBldmVudC50YXJnZXQudmFsdWUgPSAnJ1xuXG4gICMgTGlzdGVuIGZvciBzZWxlY3Rpb24gY2hhbmdlcyBhbmQgc3RvcmUgdGhlIGN1cnJlbnRseSBzZWxlY3RlZCB0ZXh0XG4gICMgaW4gdGhlIHNlbGVjdGlvbiBjbGlwYm9hcmQuIFRoaXMgaXMgb25seSBhcHBsaWNhYmxlIG9uIExpbnV4LlxuICB0cmFja1NlbGVjdGlvbkNsaXBib2FyZDogLT5cbiAgICB0aW1lb3V0SWQgPSBudWxsXG4gICAgd3JpdGVTZWxlY3RlZFRleHRUb1NlbGVjdGlvbkNsaXBib2FyZCA9ID0+XG4gICAgICByZXR1cm4gaWYgQGVkaXRvci5pc0Rlc3Ryb3llZCgpXG4gICAgICBpZiBzZWxlY3RlZFRleHQgPSBAZWRpdG9yLmdldFNlbGVjdGVkVGV4dCgpXG4gICAgICAgICMgVGhpcyB1c2VzIGlwY1JlbmRlcmVyLnNlbmQgaW5zdGVhZCBvZiBjbGlwYm9hcmQud3JpdGVUZXh0IGJlY2F1c2VcbiAgICAgICAgIyBjbGlwYm9hcmQud3JpdGVUZXh0IGlzIGEgc3luYyBpcGNSZW5kZXJlciBjYWxsIG9uIExpbnV4IGFuZCB0aGF0XG4gICAgICAgICMgd2lsbCBzbG93IGRvd24gc2VsZWN0aW9ucy5cbiAgICAgICAgaXBjUmVuZGVyZXIuc2VuZCgnd3JpdGUtdGV4dC10by1zZWxlY3Rpb24tY2xpcGJvYXJkJywgc2VsZWN0ZWRUZXh0KVxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQGVkaXRvci5vbkRpZENoYW5nZVNlbGVjdGlvblJhbmdlIC0+XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKVxuICAgICAgdGltZW91dElkID0gc2V0VGltZW91dCh3cml0ZVNlbGVjdGVkVGV4dFRvU2VsZWN0aW9uQ2xpcGJvYXJkKVxuXG4gIG9uR3JhbW1hckNoYW5nZWQ6ID0+XG4gICAgaWYgQHNjb3BlZENvbmZpZ0Rpc3Bvc2FibGVzP1xuICAgICAgQHNjb3BlZENvbmZpZ0Rpc3Bvc2FibGVzLmRpc3Bvc2UoKVxuICAgICAgQGRpc3Bvc2FibGVzLnJlbW92ZShAc2NvcGVkQ29uZmlnRGlzcG9zYWJsZXMpXG5cbiAgICBAc2NvcGVkQ29uZmlnRGlzcG9zYWJsZXMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZVxuICAgIEBkaXNwb3NhYmxlcy5hZGQoQHNjb3BlZENvbmZpZ0Rpc3Bvc2FibGVzKVxuXG4gIGZvY3VzZWQ6IC0+XG4gICAgaWYgQG1vdW50ZWRcbiAgICAgIEBwcmVzZW50ZXIuc2V0Rm9jdXNlZCh0cnVlKVxuXG4gIGJsdXJyZWQ6IC0+XG4gICAgaWYgQG1vdW50ZWRcbiAgICAgIEBwcmVzZW50ZXIuc2V0Rm9jdXNlZChmYWxzZSlcblxuICBvblRleHRJbnB1dDogKGV2ZW50KSA9PlxuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG5cbiAgICAjIFdBUk5JTkc6IElmIHdlIGNhbGwgcHJldmVudERlZmF1bHQgb24gdGhlIGlucHV0IG9mIGEgc3BhY2UgY2hhcmFjdGVyLFxuICAgICMgdGhlbiB0aGUgYnJvd3NlciBpbnRlcnByZXRzIHRoZSBzcGFjZWJhciBrZXlwcmVzcyBhcyBhIHBhZ2UtZG93biBjb21tYW5kLFxuICAgICMgY2F1c2luZyBzcGFjZXMgdG8gc2Nyb2xsIGVsZW1lbnRzIGNvbnRhaW5pbmcgZWRpdG9ycy4gVGhpcyBpcyBpbXBvc3NpYmxlXG4gICAgIyB0byB0ZXN0LlxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCkgaWYgZXZlbnQuZGF0YSBpc250ICcgJ1xuXG4gICAgcmV0dXJuIHVubGVzcyBAaXNJbnB1dEVuYWJsZWQoKVxuXG4gICAgIyBXb3JrYXJvdW5kIG9mIHRoZSBhY2NlbnRlZCBjaGFyYWN0ZXIgc3VnZ2VzdGlvbiBmZWF0dXJlIGluIG1hY09TLlxuICAgICMgVGhpcyB3aWxsIG9ubHkgb2NjdXIgd2hlbiB0aGUgdXNlciBpcyBub3QgY29tcG9zaW5nIGluIElNRSBtb2RlLlxuICAgICMgV2hlbiB0aGUgdXNlciBzZWxlY3RzIGEgbW9kaWZpZWQgY2hhcmFjdGVyIGZyb20gdGhlIG1hY09TIG1lbnUsIGB0ZXh0SW5wdXRgXG4gICAgIyB3aWxsIG9jY3VyIHR3aWNlLCBvbmNlIGZvciB0aGUgaW5pdGlhbCBjaGFyYWN0ZXIsIGFuZCBvbmNlIGZvciB0aGVcbiAgICAjIG1vZGlmaWVkIGNoYXJhY3Rlci4gSG93ZXZlciwgb25seSBhIHNpbmdsZSBrZXlwcmVzcyB3aWxsIGhhdmUgZmlyZWQuIElmXG4gICAgIyB0aGlzIGlzIHRoZSBjYXNlLCBzZWxlY3QgYmFja3dhcmQgdG8gcmVwbGFjZSB0aGUgb3JpZ2luYWwgY2hhcmFjdGVyLlxuICAgIGlmIEBvcGVuZWRBY2NlbnRlZENoYXJhY3Rlck1lbnVcbiAgICAgIEBlZGl0b3Iuc2VsZWN0TGVmdCgpXG4gICAgICBAb3BlbmVkQWNjZW50ZWRDaGFyYWN0ZXJNZW51ID0gZmFsc2VcblxuICAgIEBlZGl0b3IuaW5zZXJ0VGV4dChldmVudC5kYXRhLCBncm91cFVuZG86IHRydWUpXG5cbiAgb25WZXJ0aWNhbFNjcm9sbDogKHNjcm9sbFRvcCkgPT5cbiAgICByZXR1cm4gaWYgQHVwZGF0ZVJlcXVlc3RlZCBvciBzY3JvbGxUb3AgaXMgQHByZXNlbnRlci5nZXRTY3JvbGxUb3AoKVxuXG4gICAgYW5pbWF0aW9uRnJhbWVQZW5kaW5nID0gQHBlbmRpbmdTY3JvbGxUb3A/XG4gICAgQHBlbmRpbmdTY3JvbGxUb3AgPSBzY3JvbGxUb3BcbiAgICB1bmxlc3MgYW5pbWF0aW9uRnJhbWVQZW5kaW5nXG4gICAgICBAcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0+XG4gICAgICAgIHBlbmRpbmdTY3JvbGxUb3AgPSBAcGVuZGluZ1Njcm9sbFRvcFxuICAgICAgICBAcGVuZGluZ1Njcm9sbFRvcCA9IG51bGxcbiAgICAgICAgQHByZXNlbnRlci5zZXRTY3JvbGxUb3AocGVuZGluZ1Njcm9sbFRvcClcbiAgICAgICAgQHByZXNlbnRlci5jb21taXRQZW5kaW5nU2Nyb2xsVG9wUG9zaXRpb24oKVxuXG4gIG9uSG9yaXpvbnRhbFNjcm9sbDogKHNjcm9sbExlZnQpID0+XG4gICAgcmV0dXJuIGlmIEB1cGRhdGVSZXF1ZXN0ZWQgb3Igc2Nyb2xsTGVmdCBpcyBAcHJlc2VudGVyLmdldFNjcm9sbExlZnQoKVxuXG4gICAgYW5pbWF0aW9uRnJhbWVQZW5kaW5nID0gQHBlbmRpbmdTY3JvbGxMZWZ0P1xuICAgIEBwZW5kaW5nU2Nyb2xsTGVmdCA9IHNjcm9sbExlZnRcbiAgICB1bmxlc3MgYW5pbWF0aW9uRnJhbWVQZW5kaW5nXG4gICAgICBAcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0+XG4gICAgICAgIEBwcmVzZW50ZXIuc2V0U2Nyb2xsTGVmdChAcGVuZGluZ1Njcm9sbExlZnQpXG4gICAgICAgIEBwcmVzZW50ZXIuY29tbWl0UGVuZGluZ1Njcm9sbExlZnRQb3NpdGlvbigpXG4gICAgICAgIEBwZW5kaW5nU2Nyb2xsTGVmdCA9IG51bGxcblxuICBvbk1vdXNlV2hlZWw6IChldmVudCkgPT5cbiAgICAjIE9ubHkgc2Nyb2xsIGluIG9uZSBkaXJlY3Rpb24gYXQgYSB0aW1lXG4gICAge3doZWVsRGVsdGFYLCB3aGVlbERlbHRhWX0gPSBldmVudFxuXG4gICAgaWYgTWF0aC5hYnMod2hlZWxEZWx0YVgpID4gTWF0aC5hYnMod2hlZWxEZWx0YVkpXG4gICAgICAjIFNjcm9sbGluZyBob3Jpem9udGFsbHlcbiAgICAgIHByZXZpb3VzU2Nyb2xsTGVmdCA9IEBwcmVzZW50ZXIuZ2V0U2Nyb2xsTGVmdCgpXG4gICAgICB1cGRhdGVkU2Nyb2xsTGVmdCA9IHByZXZpb3VzU2Nyb2xsTGVmdCAtIE1hdGgucm91bmQod2hlZWxEZWx0YVggKiBAZWRpdG9yLmdldFNjcm9sbFNlbnNpdGl2aXR5KCkgLyAxMDApXG5cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCkgaWYgQHByZXNlbnRlci5jYW5TY3JvbGxMZWZ0VG8odXBkYXRlZFNjcm9sbExlZnQpXG4gICAgICBAcHJlc2VudGVyLnNldFNjcm9sbExlZnQodXBkYXRlZFNjcm9sbExlZnQpXG4gICAgZWxzZVxuICAgICAgIyBTY3JvbGxpbmcgdmVydGljYWxseVxuICAgICAgQHByZXNlbnRlci5zZXRNb3VzZVdoZWVsU2NyZWVuUm93KEBzY3JlZW5Sb3dGb3JOb2RlKGV2ZW50LnRhcmdldCkpXG4gICAgICBwcmV2aW91c1Njcm9sbFRvcCA9IEBwcmVzZW50ZXIuZ2V0U2Nyb2xsVG9wKClcbiAgICAgIHVwZGF0ZWRTY3JvbGxUb3AgPSBwcmV2aW91c1Njcm9sbFRvcCAtIE1hdGgucm91bmQod2hlZWxEZWx0YVkgKiBAZWRpdG9yLmdldFNjcm9sbFNlbnNpdGl2aXR5KCkgLyAxMDApXG5cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCkgaWYgQHByZXNlbnRlci5jYW5TY3JvbGxUb3BUbyh1cGRhdGVkU2Nyb2xsVG9wKVxuICAgICAgQHByZXNlbnRlci5zZXRTY3JvbGxUb3AodXBkYXRlZFNjcm9sbFRvcClcblxuICBvblNjcm9sbFZpZXdTY3JvbGw6ID0+XG4gICAgaWYgQG1vdW50ZWRcbiAgICAgIEBzY3JvbGxWaWV3Tm9kZS5zY3JvbGxUb3AgPSAwXG4gICAgICBAc2Nyb2xsVmlld05vZGUuc2Nyb2xsTGVmdCA9IDBcblxuICBvbkRpZENoYW5nZVNjcm9sbFRvcDogKGNhbGxiYWNrKSAtPlxuICAgIEBwcmVzZW50ZXIub25EaWRDaGFuZ2VTY3JvbGxUb3AoY2FsbGJhY2spXG5cbiAgb25EaWRDaGFuZ2VTY3JvbGxMZWZ0OiAoY2FsbGJhY2spIC0+XG4gICAgQHByZXNlbnRlci5vbkRpZENoYW5nZVNjcm9sbExlZnQoY2FsbGJhY2spXG5cbiAgc2V0U2Nyb2xsTGVmdDogKHNjcm9sbExlZnQpIC0+XG4gICAgQHByZXNlbnRlci5zZXRTY3JvbGxMZWZ0KHNjcm9sbExlZnQpXG5cbiAgc2V0U2Nyb2xsUmlnaHQ6IChzY3JvbGxSaWdodCkgLT5cbiAgICBAcHJlc2VudGVyLnNldFNjcm9sbFJpZ2h0KHNjcm9sbFJpZ2h0KVxuXG4gIHNldFNjcm9sbFRvcDogKHNjcm9sbFRvcCkgLT5cbiAgICBAcHJlc2VudGVyLnNldFNjcm9sbFRvcChzY3JvbGxUb3ApXG5cbiAgc2V0U2Nyb2xsQm90dG9tOiAoc2Nyb2xsQm90dG9tKSAtPlxuICAgIEBwcmVzZW50ZXIuc2V0U2Nyb2xsQm90dG9tKHNjcm9sbEJvdHRvbSlcblxuICBnZXRTY3JvbGxUb3A6IC0+XG4gICAgQHByZXNlbnRlci5nZXRTY3JvbGxUb3AoKVxuXG4gIGdldFNjcm9sbExlZnQ6IC0+XG4gICAgQHByZXNlbnRlci5nZXRTY3JvbGxMZWZ0KClcblxuICBnZXRTY3JvbGxSaWdodDogLT5cbiAgICBAcHJlc2VudGVyLmdldFNjcm9sbFJpZ2h0KClcblxuICBnZXRTY3JvbGxCb3R0b206IC0+XG4gICAgQHByZXNlbnRlci5nZXRTY3JvbGxCb3R0b20oKVxuXG4gIGdldFNjcm9sbEhlaWdodDogLT5cbiAgICBAcHJlc2VudGVyLmdldFNjcm9sbEhlaWdodCgpXG5cbiAgZ2V0U2Nyb2xsV2lkdGg6IC0+XG4gICAgQHByZXNlbnRlci5nZXRTY3JvbGxXaWR0aCgpXG5cbiAgZ2V0TWF4U2Nyb2xsVG9wOiAtPlxuICAgIEBwcmVzZW50ZXIuZ2V0TWF4U2Nyb2xsVG9wKClcblxuICBnZXRWZXJ0aWNhbFNjcm9sbGJhcldpZHRoOiAtPlxuICAgIEBwcmVzZW50ZXIuZ2V0VmVydGljYWxTY3JvbGxiYXJXaWR0aCgpXG5cbiAgZ2V0SG9yaXpvbnRhbFNjcm9sbGJhckhlaWdodDogLT5cbiAgICBAcHJlc2VudGVyLmdldEhvcml6b250YWxTY3JvbGxiYXJIZWlnaHQoKVxuXG4gIGdldFZpc2libGVSb3dSYW5nZTogLT5cbiAgICBAcHJlc2VudGVyLmdldFZpc2libGVSb3dSYW5nZSgpXG5cbiAgcGl4ZWxQb3NpdGlvbkZvclNjcmVlblBvc2l0aW9uOiAoc2NyZWVuUG9zaXRpb24sIGNsaXA9dHJ1ZSkgLT5cbiAgICBzY3JlZW5Qb3NpdGlvbiA9IFBvaW50LmZyb21PYmplY3Qoc2NyZWVuUG9zaXRpb24pXG4gICAgc2NyZWVuUG9zaXRpb24gPSBAZWRpdG9yLmNsaXBTY3JlZW5Qb3NpdGlvbihzY3JlZW5Qb3NpdGlvbikgaWYgY2xpcFxuXG4gICAgdW5sZXNzIEBwcmVzZW50ZXIuaXNSb3dSZW5kZXJlZChzY3JlZW5Qb3NpdGlvbi5yb3cpXG4gICAgICBAcHJlc2VudGVyLnNldFNjcmVlblJvd3NUb01lYXN1cmUoW3NjcmVlblBvc2l0aW9uLnJvd10pXG5cbiAgICB1bmxlc3MgQGxpbmVzQ29tcG9uZW50LmxpbmVOb2RlRm9yU2NyZWVuUm93KHNjcmVlblBvc2l0aW9uLnJvdyk/XG4gICAgICBAdXBkYXRlU3luY1ByZU1lYXN1cmVtZW50KClcblxuICAgIHBpeGVsUG9zaXRpb24gPSBAbGluZXNZYXJkc3RpY2sucGl4ZWxQb3NpdGlvbkZvclNjcmVlblBvc2l0aW9uKHNjcmVlblBvc2l0aW9uKVxuICAgIEBwcmVzZW50ZXIuY2xlYXJTY3JlZW5Sb3dzVG9NZWFzdXJlKClcbiAgICBwaXhlbFBvc2l0aW9uXG5cbiAgc2NyZWVuUG9zaXRpb25Gb3JQaXhlbFBvc2l0aW9uOiAocGl4ZWxQb3NpdGlvbikgLT5cbiAgICByb3cgPSBAbGluZXNZYXJkc3RpY2subWVhc3VyZWRSb3dGb3JQaXhlbFBvc2l0aW9uKHBpeGVsUG9zaXRpb24pXG4gICAgaWYgcm93PyBhbmQgbm90IEBwcmVzZW50ZXIuaXNSb3dSZW5kZXJlZChyb3cpXG4gICAgICBAcHJlc2VudGVyLnNldFNjcmVlblJvd3NUb01lYXN1cmUoW3Jvd10pXG4gICAgICBAdXBkYXRlU3luY1ByZU1lYXN1cmVtZW50KClcblxuICAgIHBvc2l0aW9uID0gQGxpbmVzWWFyZHN0aWNrLnNjcmVlblBvc2l0aW9uRm9yUGl4ZWxQb3NpdGlvbihwaXhlbFBvc2l0aW9uKVxuICAgIEBwcmVzZW50ZXIuY2xlYXJTY3JlZW5Sb3dzVG9NZWFzdXJlKClcbiAgICBwb3NpdGlvblxuXG4gIHBpeGVsUmVjdEZvclNjcmVlblJhbmdlOiAoc2NyZWVuUmFuZ2UpIC0+XG4gICAgcm93c1RvTWVhc3VyZSA9IFtdXG4gICAgdW5sZXNzIEBwcmVzZW50ZXIuaXNSb3dSZW5kZXJlZChzY3JlZW5SYW5nZS5zdGFydC5yb3cpXG4gICAgICByb3dzVG9NZWFzdXJlLnB1c2goc2NyZWVuUmFuZ2Uuc3RhcnQucm93KVxuICAgIHVubGVzcyBAcHJlc2VudGVyLmlzUm93UmVuZGVyZWQoc2NyZWVuUmFuZ2UuZW5kLnJvdylcbiAgICAgIHJvd3NUb01lYXN1cmUucHVzaChzY3JlZW5SYW5nZS5lbmQucm93KVxuXG4gICAgaWYgcm93c1RvTWVhc3VyZS5sZW5ndGggPiAwXG4gICAgICBAcHJlc2VudGVyLnNldFNjcmVlblJvd3NUb01lYXN1cmUocm93c1RvTWVhc3VyZSlcbiAgICAgIEB1cGRhdGVTeW5jUHJlTWVhc3VyZW1lbnQoKVxuXG4gICAgcmVjdCA9IEBwcmVzZW50ZXIuYWJzb2x1dGVQaXhlbFJlY3RGb3JTY3JlZW5SYW5nZShzY3JlZW5SYW5nZSlcblxuICAgIGlmIHJvd3NUb01lYXN1cmUubGVuZ3RoID4gMFxuICAgICAgQHByZXNlbnRlci5jbGVhclNjcmVlblJvd3NUb01lYXN1cmUoKVxuXG4gICAgcmVjdFxuXG4gIHBpeGVsUmFuZ2VGb3JTY3JlZW5SYW5nZTogKHNjcmVlblJhbmdlLCBjbGlwPXRydWUpIC0+XG4gICAge3N0YXJ0LCBlbmR9ID0gUmFuZ2UuZnJvbU9iamVjdChzY3JlZW5SYW5nZSlcbiAgICB7c3RhcnQ6IEBwaXhlbFBvc2l0aW9uRm9yU2NyZWVuUG9zaXRpb24oc3RhcnQsIGNsaXApLCBlbmQ6IEBwaXhlbFBvc2l0aW9uRm9yU2NyZWVuUG9zaXRpb24oZW5kLCBjbGlwKX1cblxuICBwaXhlbFBvc2l0aW9uRm9yQnVmZmVyUG9zaXRpb246IChidWZmZXJQb3NpdGlvbikgLT5cbiAgICBAcGl4ZWxQb3NpdGlvbkZvclNjcmVlblBvc2l0aW9uKFxuICAgICAgQGVkaXRvci5zY3JlZW5Qb3NpdGlvbkZvckJ1ZmZlclBvc2l0aW9uKGJ1ZmZlclBvc2l0aW9uKVxuICAgIClcblxuICBpbnZhbGlkYXRlQmxvY2tEZWNvcmF0aW9uRGltZW5zaW9uczogLT5cbiAgICBAcHJlc2VudGVyLmludmFsaWRhdGVCbG9ja0RlY29yYXRpb25EaW1lbnNpb25zKGFyZ3VtZW50cy4uLilcblxuICBvbk1vdXNlRG93bjogKGV2ZW50KSA9PlxuICAgICMgSGFuZGxlIG1pZGRsZSBtb3VzZSBidXR0b24gb24gbGludXggcGxhdGZvcm0gb25seSAocGFzdGUgY2xpcGJvYXJkKVxuICAgIGlmIGV2ZW50LmJ1dHRvbiBpcyAxIGFuZCBwcm9jZXNzLnBsYXRmb3JtIGlzICdsaW51eCdcbiAgICAgIGlmIHNlbGVjdGlvbiA9IHJlcXVpcmUoJy4vc2FmZS1jbGlwYm9hcmQnKS5yZWFkVGV4dCgnc2VsZWN0aW9uJylcbiAgICAgICAgc2NyZWVuUG9zaXRpb24gPSBAc2NyZWVuUG9zaXRpb25Gb3JNb3VzZUV2ZW50KGV2ZW50KVxuICAgICAgICBAZWRpdG9yLnNldEN1cnNvclNjcmVlblBvc2l0aW9uKHNjcmVlblBvc2l0aW9uLCBhdXRvc2Nyb2xsOiBmYWxzZSlcbiAgICAgICAgQGVkaXRvci5pbnNlcnRUZXh0KHNlbGVjdGlvbilcbiAgICAgICAgcmV0dXJuXG5cbiAgICAjIEhhbmRsZSBtb3VzZSBkb3duIGV2ZW50cyBmb3IgbGVmdCBtb3VzZSBidXR0b24gb25seVxuICAgICMgKGV4Y2VwdCBtaWRkbGUgbW91c2UgYnV0dG9uIG9uIGxpbnV4IHBsYXRmb3JtLCBzZWUgYWJvdmUpXG4gICAgdW5sZXNzIGV2ZW50LmJ1dHRvbiBpcyAwXG4gICAgICByZXR1cm5cblxuICAgIHJldHVybiBpZiBldmVudC50YXJnZXQ/LmNsYXNzTGlzdC5jb250YWlucygnaG9yaXpvbnRhbC1zY3JvbGxiYXInKVxuXG4gICAge2RldGFpbCwgc2hpZnRLZXksIG1ldGFLZXksIGN0cmxLZXl9ID0gZXZlbnRcblxuICAgICMgQ1RSTCtjbGljayBicmluZ3MgdXAgdGhlIGNvbnRleHQgbWVudSBvbiBtYWNPUywgc28gZG9uJ3QgaGFuZGxlIHRob3NlIGVpdGhlclxuICAgIHJldHVybiBpZiBjdHJsS2V5IGFuZCBwcm9jZXNzLnBsYXRmb3JtIGlzICdkYXJ3aW4nXG5cbiAgICAjIFByZXZlbnQgZm9jdXNvdXQgZXZlbnQgb24gaGlkZGVuIGlucHV0IGlmIGVkaXRvciBpcyBhbHJlYWR5IGZvY3VzZWRcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpIGlmIEBvbGRTdGF0ZS5mb2N1c2VkXG5cbiAgICBzY3JlZW5Qb3NpdGlvbiA9IEBzY3JlZW5Qb3NpdGlvbkZvck1vdXNlRXZlbnQoZXZlbnQpXG5cbiAgICBpZiBldmVudC50YXJnZXQ/LmNsYXNzTGlzdC5jb250YWlucygnZm9sZC1tYXJrZXInKVxuICAgICAgYnVmZmVyUG9zaXRpb24gPSBAZWRpdG9yLmJ1ZmZlclBvc2l0aW9uRm9yU2NyZWVuUG9zaXRpb24oc2NyZWVuUG9zaXRpb24pXG4gICAgICBAZWRpdG9yLmRlc3Ryb3lGb2xkc0ludGVyc2VjdGluZ0J1ZmZlclJhbmdlKFtidWZmZXJQb3NpdGlvbiwgYnVmZmVyUG9zaXRpb25dKVxuICAgICAgcmV0dXJuXG5cbiAgICBzd2l0Y2ggZGV0YWlsXG4gICAgICB3aGVuIDFcbiAgICAgICAgaWYgc2hpZnRLZXlcbiAgICAgICAgICBAZWRpdG9yLnNlbGVjdFRvU2NyZWVuUG9zaXRpb24oc2NyZWVuUG9zaXRpb24pXG4gICAgICAgIGVsc2UgaWYgbWV0YUtleSBvciAoY3RybEtleSBhbmQgcHJvY2Vzcy5wbGF0Zm9ybSBpc250ICdkYXJ3aW4nKVxuICAgICAgICAgIGN1cnNvckF0U2NyZWVuUG9zaXRpb24gPSBAZWRpdG9yLmdldEN1cnNvckF0U2NyZWVuUG9zaXRpb24oc2NyZWVuUG9zaXRpb24pXG4gICAgICAgICAgaWYgY3Vyc29yQXRTY3JlZW5Qb3NpdGlvbiBhbmQgQGVkaXRvci5oYXNNdWx0aXBsZUN1cnNvcnMoKVxuICAgICAgICAgICAgY3Vyc29yQXRTY3JlZW5Qb3NpdGlvbi5kZXN0cm95KClcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBAZWRpdG9yLmFkZEN1cnNvckF0U2NyZWVuUG9zaXRpb24oc2NyZWVuUG9zaXRpb24sIGF1dG9zY3JvbGw6IGZhbHNlKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgQGVkaXRvci5zZXRDdXJzb3JTY3JlZW5Qb3NpdGlvbihzY3JlZW5Qb3NpdGlvbiwgYXV0b3Njcm9sbDogZmFsc2UpXG4gICAgICB3aGVuIDJcbiAgICAgICAgQGVkaXRvci5nZXRMYXN0U2VsZWN0aW9uKCkuc2VsZWN0V29yZChhdXRvc2Nyb2xsOiBmYWxzZSlcbiAgICAgIHdoZW4gM1xuICAgICAgICBAZWRpdG9yLmdldExhc3RTZWxlY3Rpb24oKS5zZWxlY3RMaW5lKG51bGwsIGF1dG9zY3JvbGw6IGZhbHNlKVxuXG4gICAgQGhhbmRsZURyYWdVbnRpbE1vdXNlVXAgKHNjcmVlblBvc2l0aW9uKSA9PlxuICAgICAgQGVkaXRvci5zZWxlY3RUb1NjcmVlblBvc2l0aW9uKHNjcmVlblBvc2l0aW9uLCBzdXBwcmVzc1NlbGVjdGlvbk1lcmdlOiB0cnVlLCBhdXRvc2Nyb2xsOiBmYWxzZSlcblxuICBvbkxpbmVOdW1iZXJHdXR0ZXJNb3VzZURvd246IChldmVudCkgPT5cbiAgICByZXR1cm4gdW5sZXNzIGV2ZW50LmJ1dHRvbiBpcyAwICMgb25seSBoYW5kbGUgdGhlIGxlZnQgbW91c2UgYnV0dG9uXG5cbiAgICB7c2hpZnRLZXksIG1ldGFLZXksIGN0cmxLZXl9ID0gZXZlbnRcblxuICAgIGlmIHNoaWZ0S2V5XG4gICAgICBAb25HdXR0ZXJTaGlmdENsaWNrKGV2ZW50KVxuICAgIGVsc2UgaWYgbWV0YUtleSBvciAoY3RybEtleSBhbmQgcHJvY2Vzcy5wbGF0Zm9ybSBpc250ICdkYXJ3aW4nKVxuICAgICAgQG9uR3V0dGVyTWV0YUNsaWNrKGV2ZW50KVxuICAgIGVsc2VcbiAgICAgIEBvbkd1dHRlckNsaWNrKGV2ZW50KVxuXG4gIG9uR3V0dGVyQ2xpY2s6IChldmVudCkgPT5cbiAgICBjbGlja2VkU2NyZWVuUm93ID0gQHNjcmVlblBvc2l0aW9uRm9yTW91c2VFdmVudChldmVudCkucm93XG4gICAgY2xpY2tlZEJ1ZmZlclJvdyA9IEBlZGl0b3IuYnVmZmVyUm93Rm9yU2NyZWVuUm93KGNsaWNrZWRTY3JlZW5Sb3cpXG4gICAgaW5pdGlhbFNjcmVlblJhbmdlID0gQGVkaXRvci5zY3JlZW5SYW5nZUZvckJ1ZmZlclJhbmdlKFtbY2xpY2tlZEJ1ZmZlclJvdywgMF0sIFtjbGlja2VkQnVmZmVyUm93ICsgMSwgMF1dKVxuICAgIEBlZGl0b3Iuc2V0U2VsZWN0ZWRTY3JlZW5SYW5nZShpbml0aWFsU2NyZWVuUmFuZ2UsIHByZXNlcnZlRm9sZHM6IHRydWUsIGF1dG9zY3JvbGw6IGZhbHNlKVxuICAgIEBoYW5kbGVHdXR0ZXJEcmFnKGluaXRpYWxTY3JlZW5SYW5nZSlcblxuICBvbkd1dHRlck1ldGFDbGljazogKGV2ZW50KSA9PlxuICAgIGNsaWNrZWRTY3JlZW5Sb3cgPSBAc2NyZWVuUG9zaXRpb25Gb3JNb3VzZUV2ZW50KGV2ZW50KS5yb3dcbiAgICBjbGlja2VkQnVmZmVyUm93ID0gQGVkaXRvci5idWZmZXJSb3dGb3JTY3JlZW5Sb3coY2xpY2tlZFNjcmVlblJvdylcbiAgICBpbml0aWFsU2NyZWVuUmFuZ2UgPSBAZWRpdG9yLnNjcmVlblJhbmdlRm9yQnVmZmVyUmFuZ2UoW1tjbGlja2VkQnVmZmVyUm93LCAwXSwgW2NsaWNrZWRCdWZmZXJSb3cgKyAxLCAwXV0pXG4gICAgQGVkaXRvci5hZGRTZWxlY3Rpb25Gb3JTY3JlZW5SYW5nZShpbml0aWFsU2NyZWVuUmFuZ2UsIGF1dG9zY3JvbGw6IGZhbHNlKVxuICAgIEBoYW5kbGVHdXR0ZXJEcmFnKGluaXRpYWxTY3JlZW5SYW5nZSlcblxuICBvbkd1dHRlclNoaWZ0Q2xpY2s6IChldmVudCkgPT5cbiAgICB0YWlsU2NyZWVuUG9zaXRpb24gPSBAZWRpdG9yLmdldExhc3RTZWxlY3Rpb24oKS5nZXRUYWlsU2NyZWVuUG9zaXRpb24oKVxuICAgIGNsaWNrZWRTY3JlZW5Sb3cgPSBAc2NyZWVuUG9zaXRpb25Gb3JNb3VzZUV2ZW50KGV2ZW50KS5yb3dcbiAgICBjbGlja2VkQnVmZmVyUm93ID0gQGVkaXRvci5idWZmZXJSb3dGb3JTY3JlZW5Sb3coY2xpY2tlZFNjcmVlblJvdylcbiAgICBjbGlja2VkTGluZVNjcmVlblJhbmdlID0gQGVkaXRvci5zY3JlZW5SYW5nZUZvckJ1ZmZlclJhbmdlKFtbY2xpY2tlZEJ1ZmZlclJvdywgMF0sIFtjbGlja2VkQnVmZmVyUm93ICsgMSwgMF1dKVxuXG4gICAgaWYgY2xpY2tlZFNjcmVlblJvdyA8IHRhaWxTY3JlZW5Qb3NpdGlvbi5yb3dcbiAgICAgIEBlZGl0b3Iuc2VsZWN0VG9TY3JlZW5Qb3NpdGlvbihjbGlja2VkTGluZVNjcmVlblJhbmdlLnN0YXJ0LCBzdXBwcmVzc1NlbGVjdGlvbk1lcmdlOiB0cnVlLCBhdXRvc2Nyb2xsOiBmYWxzZSlcbiAgICBlbHNlXG4gICAgICBAZWRpdG9yLnNlbGVjdFRvU2NyZWVuUG9zaXRpb24oY2xpY2tlZExpbmVTY3JlZW5SYW5nZS5lbmQsIHN1cHByZXNzU2VsZWN0aW9uTWVyZ2U6IHRydWUsIGF1dG9zY3JvbGw6IGZhbHNlKVxuXG4gICAgQGhhbmRsZUd1dHRlckRyYWcobmV3IFJhbmdlKHRhaWxTY3JlZW5Qb3NpdGlvbiwgdGFpbFNjcmVlblBvc2l0aW9uKSlcblxuICBoYW5kbGVHdXR0ZXJEcmFnOiAoaW5pdGlhbFJhbmdlKSAtPlxuICAgIEBoYW5kbGVEcmFnVW50aWxNb3VzZVVwIChzY3JlZW5Qb3NpdGlvbikgPT5cbiAgICAgIGRyYWdSb3cgPSBzY3JlZW5Qb3NpdGlvbi5yb3dcbiAgICAgIGlmIGRyYWdSb3cgPCBpbml0aWFsUmFuZ2Uuc3RhcnQucm93XG4gICAgICAgIHN0YXJ0UG9zaXRpb24gPSBAZWRpdG9yLmNsaXBTY3JlZW5Qb3NpdGlvbihbZHJhZ1JvdywgMF0sIHNraXBTb2Z0V3JhcEluZGVudGF0aW9uOiB0cnVlKVxuICAgICAgICBzY3JlZW5SYW5nZSA9IG5ldyBSYW5nZShzdGFydFBvc2l0aW9uLCBzdGFydFBvc2l0aW9uKS51bmlvbihpbml0aWFsUmFuZ2UpXG4gICAgICAgIEBlZGl0b3IuZ2V0TGFzdFNlbGVjdGlvbigpLnNldFNjcmVlblJhbmdlKHNjcmVlblJhbmdlLCByZXZlcnNlZDogdHJ1ZSwgYXV0b3Njcm9sbDogZmFsc2UsIHByZXNlcnZlRm9sZHM6IHRydWUpXG4gICAgICBlbHNlXG4gICAgICAgIGVuZFBvc2l0aW9uID0gQGVkaXRvci5jbGlwU2NyZWVuUG9zaXRpb24oW2RyYWdSb3cgKyAxLCAwXSwgY2xpcERpcmVjdGlvbjogJ2JhY2t3YXJkJylcbiAgICAgICAgc2NyZWVuUmFuZ2UgPSBuZXcgUmFuZ2UoZW5kUG9zaXRpb24sIGVuZFBvc2l0aW9uKS51bmlvbihpbml0aWFsUmFuZ2UpXG4gICAgICAgIEBlZGl0b3IuZ2V0TGFzdFNlbGVjdGlvbigpLnNldFNjcmVlblJhbmdlKHNjcmVlblJhbmdlLCByZXZlcnNlZDogZmFsc2UsIGF1dG9zY3JvbGw6IGZhbHNlLCBwcmVzZXJ2ZUZvbGRzOiB0cnVlKVxuXG4gIG9uU3R5bGVzaGVldHNDaGFuZ2VkOiAoc3R5bGVFbGVtZW50KSA9PlxuICAgIHJldHVybiB1bmxlc3MgQHBlcmZvcm1lZEluaXRpYWxNZWFzdXJlbWVudFxuICAgIHJldHVybiB1bmxlc3MgQHRoZW1lcy5pc0luaXRpYWxMb2FkQ29tcGxldGUoKVxuXG4gICAgIyBUaGlzIGRlbGF5IHByZXZlbnRzIHRoZSBzdHlsaW5nIGZyb20gZ29pbmcgaGF5d2lyZSB3aGVuIHN0eWxlc2hlZXRzIGFyZVxuICAgICMgcmVsb2FkZWQgaW4gZGV2IG1vZGUuIEl0IHNlZW1zIGxpa2UgYSB3b3JrYXJvdW5kIGZvciBhIGJyb3dzZXIgYnVnLCBidXRcbiAgICAjIG5vdCB0b3RhbGx5IHN1cmUuXG5cbiAgICB1bmxlc3MgQHN0eWxpbmdDaGFuZ2VBbmltYXRpb25GcmFtZVJlcXVlc3RlZFxuICAgICAgQHN0eWxpbmdDaGFuZ2VBbmltYXRpb25GcmFtZVJlcXVlc3RlZCA9IHRydWVcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9PlxuICAgICAgICBAc3R5bGluZ0NoYW5nZUFuaW1hdGlvbkZyYW1lUmVxdWVzdGVkID0gZmFsc2VcbiAgICAgICAgaWYgQG1vdW50ZWRcbiAgICAgICAgICBAcmVmcmVzaFNjcm9sbGJhcnMoKSBpZiBub3Qgc3R5bGVFbGVtZW50LnNoZWV0PyBvciBAY29udGFpbnNTY3JvbGxiYXJTZWxlY3RvcihzdHlsZUVsZW1lbnQuc2hlZXQpXG4gICAgICAgICAgQGhhbmRsZVN0eWxpbmdDaGFuZ2UoKVxuXG4gIG9uQWxsVGhlbWVzTG9hZGVkOiA9PlxuICAgIEByZWZyZXNoU2Nyb2xsYmFycygpXG4gICAgQGhhbmRsZVN0eWxpbmdDaGFuZ2UoKVxuXG4gIGhhbmRsZVN0eWxpbmdDaGFuZ2U6ID0+XG4gICAgQHNhbXBsZUZvbnRTdHlsaW5nKClcbiAgICBAc2FtcGxlQmFja2dyb3VuZENvbG9ycygpXG4gICAgQGludmFsaWRhdGVNZWFzdXJlbWVudHMoKVxuXG4gIGhhbmRsZURyYWdVbnRpbE1vdXNlVXA6IChkcmFnSGFuZGxlcikgLT5cbiAgICBkcmFnZ2luZyA9IGZhbHNlXG4gICAgbGFzdE1vdXNlUG9zaXRpb24gPSB7fVxuICAgIGFuaW1hdGlvbkxvb3AgPSA9PlxuICAgICAgQHJlcXVlc3RBbmltYXRpb25GcmFtZSA9PlxuICAgICAgICBpZiBkcmFnZ2luZyBhbmQgQG1vdW50ZWRcbiAgICAgICAgICBsaW5lc0NsaWVudFJlY3QgPSBAbGluZXNDb21wb25lbnQuZ2V0RG9tTm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpXG4gICAgICAgICAgYXV0b3Njcm9sbChsYXN0TW91c2VQb3NpdGlvbiwgbGluZXNDbGllbnRSZWN0KVxuICAgICAgICAgIHNjcmVlblBvc2l0aW9uID0gQHNjcmVlblBvc2l0aW9uRm9yTW91c2VFdmVudChsYXN0TW91c2VQb3NpdGlvbiwgbGluZXNDbGllbnRSZWN0KVxuICAgICAgICAgIGRyYWdIYW5kbGVyKHNjcmVlblBvc2l0aW9uKVxuICAgICAgICAgIGFuaW1hdGlvbkxvb3AoKVxuICAgICAgICBlbHNlIGlmIG5vdCBAbW91bnRlZFxuICAgICAgICAgIHN0b3BEcmFnZ2luZygpXG5cbiAgICBvbk1vdXNlTW92ZSA9IChldmVudCkgLT5cbiAgICAgIGxhc3RNb3VzZVBvc2l0aW9uLmNsaWVudFggPSBldmVudC5jbGllbnRYXG4gICAgICBsYXN0TW91c2VQb3NpdGlvbi5jbGllbnRZID0gZXZlbnQuY2xpZW50WVxuXG4gICAgICAjIFN0YXJ0IHRoZSBhbmltYXRpb24gbG9vcCB3aGVuIHRoZSBtb3VzZSBtb3ZlcyBwcmlvciB0byBhIG1vdXNldXAgZXZlbnRcbiAgICAgIHVubGVzcyBkcmFnZ2luZ1xuICAgICAgICBkcmFnZ2luZyA9IHRydWVcbiAgICAgICAgYW5pbWF0aW9uTG9vcCgpXG5cbiAgICAgICMgU3RvcCBkcmFnZ2luZyB3aGVuIGN1cnNvciBlbnRlcnMgZGV2IHRvb2xzIGJlY2F1c2Ugd2UgY2FuJ3QgZGV0ZWN0IG1vdXNldXBcbiAgICAgIG9uTW91c2VVcCgpIGlmIGV2ZW50LndoaWNoIGlzIDBcblxuICAgIG9uTW91c2VVcCA9IChldmVudCkgPT5cbiAgICAgIGlmIGRyYWdnaW5nXG4gICAgICAgIHN0b3BEcmFnZ2luZygpXG4gICAgICAgIEBlZGl0b3IuZmluYWxpemVTZWxlY3Rpb25zKClcbiAgICAgICAgQGVkaXRvci5tZXJnZUludGVyc2VjdGluZ1NlbGVjdGlvbnMoKVxuXG4gICAgc3RvcERyYWdnaW5nID0gLT5cbiAgICAgIGRyYWdnaW5nID0gZmFsc2VcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBvbk1vdXNlTW92ZSlcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgb25Nb3VzZVVwKVxuICAgICAgZGlzcG9zYWJsZXMuZGlzcG9zZSgpXG5cbiAgICBhdXRvc2Nyb2xsID0gKG1vdXNlQ2xpZW50UG9zaXRpb24pID0+XG4gICAgICB7dG9wLCBib3R0b20sIGxlZnQsIHJpZ2h0fSA9IEBzY3JvbGxWaWV3Tm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxuICAgICAgdG9wICs9IDMwXG4gICAgICBib3R0b20gLT0gMzBcbiAgICAgIGxlZnQgKz0gMzBcbiAgICAgIHJpZ2h0IC09IDMwXG5cbiAgICAgIGlmIG1vdXNlQ2xpZW50UG9zaXRpb24uY2xpZW50WSA8IHRvcFxuICAgICAgICBtb3VzZVlEZWx0YSA9IHRvcCAtIG1vdXNlQ2xpZW50UG9zaXRpb24uY2xpZW50WVxuICAgICAgICB5RGlyZWN0aW9uID0gLTFcbiAgICAgIGVsc2UgaWYgbW91c2VDbGllbnRQb3NpdGlvbi5jbGllbnRZID4gYm90dG9tXG4gICAgICAgIG1vdXNlWURlbHRhID0gbW91c2VDbGllbnRQb3NpdGlvbi5jbGllbnRZIC0gYm90dG9tXG4gICAgICAgIHlEaXJlY3Rpb24gPSAxXG5cbiAgICAgIGlmIG1vdXNlQ2xpZW50UG9zaXRpb24uY2xpZW50WCA8IGxlZnRcbiAgICAgICAgbW91c2VYRGVsdGEgPSBsZWZ0IC0gbW91c2VDbGllbnRQb3NpdGlvbi5jbGllbnRYXG4gICAgICAgIHhEaXJlY3Rpb24gPSAtMVxuICAgICAgZWxzZSBpZiBtb3VzZUNsaWVudFBvc2l0aW9uLmNsaWVudFggPiByaWdodFxuICAgICAgICBtb3VzZVhEZWx0YSA9IG1vdXNlQ2xpZW50UG9zaXRpb24uY2xpZW50WCAtIHJpZ2h0XG4gICAgICAgIHhEaXJlY3Rpb24gPSAxXG5cbiAgICAgIGlmIG1vdXNlWURlbHRhP1xuICAgICAgICBAcHJlc2VudGVyLnNldFNjcm9sbFRvcChAcHJlc2VudGVyLmdldFNjcm9sbFRvcCgpICsgeURpcmVjdGlvbiAqIHNjYWxlU2Nyb2xsRGVsdGEobW91c2VZRGVsdGEpKVxuICAgICAgICBAcHJlc2VudGVyLmNvbW1pdFBlbmRpbmdTY3JvbGxUb3BQb3NpdGlvbigpXG5cbiAgICAgIGlmIG1vdXNlWERlbHRhP1xuICAgICAgICBAcHJlc2VudGVyLnNldFNjcm9sbExlZnQoQHByZXNlbnRlci5nZXRTY3JvbGxMZWZ0KCkgKyB4RGlyZWN0aW9uICogc2NhbGVTY3JvbGxEZWx0YShtb3VzZVhEZWx0YSkpXG4gICAgICAgIEBwcmVzZW50ZXIuY29tbWl0UGVuZGluZ1Njcm9sbExlZnRQb3NpdGlvbigpXG5cbiAgICBzY2FsZVNjcm9sbERlbHRhID0gKHNjcm9sbERlbHRhKSAtPlxuICAgICAgTWF0aC5wb3coc2Nyb2xsRGVsdGEgLyAyLCAzKSAvIDI4MFxuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIG9uTW91c2VNb3ZlKVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgb25Nb3VzZVVwKVxuICAgIGRpc3Bvc2FibGVzID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgICBkaXNwb3NhYmxlcy5hZGQoQGVkaXRvci5nZXRCdWZmZXIoKS5vbldpbGxDaGFuZ2Uob25Nb3VzZVVwKSlcbiAgICBkaXNwb3NhYmxlcy5hZGQoQGVkaXRvci5vbkRpZERlc3Ryb3koc3RvcERyYWdnaW5nKSlcblxuICBpc1Zpc2libGU6IC0+XG4gICAgIyBJbnZlc3RpZ2F0aW5nIGFuIGV4Y2VwdGlvbiB0aGF0IG9jY3VycyBoZXJlIGR1ZSB0byA6OmRvbU5vZGUgYmVpbmcgbnVsbC5cbiAgICBAYXNzZXJ0IEBkb21Ob2RlPywgXCJUZXh0RWRpdG9yQ29tcG9uZW50Ojpkb21Ob2RlIHdhcyBudWxsLlwiLCAoZXJyb3IpID0+XG4gICAgICBlcnJvci5tZXRhZGF0YSA9IHtAaW5pdGlhbGl6ZWR9XG5cbiAgICBAZG9tTm9kZT8gYW5kIChAZG9tTm9kZS5vZmZzZXRIZWlnaHQgPiAwIG9yIEBkb21Ob2RlLm9mZnNldFdpZHRoID4gMClcblxuICBwb2xsRE9NOiA9PlxuICAgIHVubGVzcyBAY2hlY2tGb3JWaXNpYmlsaXR5Q2hhbmdlKClcbiAgICAgIEBzYW1wbGVCYWNrZ3JvdW5kQ29sb3JzKClcbiAgICAgIEBtZWFzdXJlV2luZG93U2l6ZSgpXG4gICAgICBAbWVhc3VyZURpbWVuc2lvbnMoKVxuICAgICAgQHNhbXBsZUZvbnRTdHlsaW5nKClcbiAgICAgIEBvdmVybGF5TWFuYWdlcj8ubWVhc3VyZU92ZXJsYXlzKClcblxuICBjaGVja0ZvclZpc2liaWxpdHlDaGFuZ2U6IC0+XG4gICAgaWYgQGlzVmlzaWJsZSgpXG4gICAgICBpZiBAd2FzVmlzaWJsZVxuICAgICAgICBmYWxzZVxuICAgICAgZWxzZVxuICAgICAgICBAYmVjYW1lVmlzaWJsZSgpXG4gICAgICAgIEB3YXNWaXNpYmxlID0gdHJ1ZVxuICAgIGVsc2VcbiAgICAgIEB3YXNWaXNpYmxlID0gZmFsc2VcblxuICAjIE1lYXN1cmUgZXhwbGljaXRseS1zdHlsZWQgaGVpZ2h0IGFuZCB3aWR0aCBhbmQgcmVsYXkgdGhlbSB0byB0aGUgbW9kZWwuIElmXG4gICMgdGhlc2UgdmFsdWVzIGFyZW4ndCBleHBsaWNpdGx5IHN0eWxlZCwgd2UgYXNzdW1lIHRoZSBlZGl0b3IgaXMgdW5jb25zdHJhaW5lZFxuICAjIGFuZCB1c2UgdGhlIHNjcm9sbEhlaWdodCAvIHNjcm9sbFdpZHRoIGFzIGl0cyBoZWlnaHQgYW5kIHdpZHRoIGluXG4gICMgY2FsY3VsYXRpb25zLlxuICBtZWFzdXJlRGltZW5zaW9uczogLT5cbiAgICAjIElmIHdlIGRvbid0IGFzc2lnbiBhdXRvSGVpZ2h0IGV4cGxpY2l0bHksIHdlIHRyeSB0byBhdXRvbWF0aWNhbGx5IGRpc2FibGVcbiAgICAjIGF1dG8taGVpZ2h0IGluIGNlcnRhaW4gY2lyY3Vtc3RhbmNlcy4gVGhpcyBpcyBsZWdhY3kgYmVoYXZpb3IgdGhhdCB3ZVxuICAgICMgd291bGQgcmF0aGVyIG5vdCBpbXBsZW1lbnQsIGJ1dCB3ZSBjYW4ndCByZW1vdmUgaXQgd2l0aG91dCByaXNraW5nXG4gICAgIyBicmVha2FnZSBjdXJyZW50bHkuXG4gICAgdW5sZXNzIEBlZGl0b3IuYXV0b0hlaWdodD9cbiAgICAgIHtwb3NpdGlvbiwgdG9wLCBib3R0b219ID0gZ2V0Q29tcHV0ZWRTdHlsZShAaG9zdEVsZW1lbnQpXG4gICAgICBoYXNFeHBsaWNpdFRvcEFuZEJvdHRvbSA9IChwb3NpdGlvbiBpcyAnYWJzb2x1dGUnIGFuZCB0b3AgaXNudCAnYXV0bycgYW5kIGJvdHRvbSBpc250ICdhdXRvJylcbiAgICAgIGhhc0lubGluZUhlaWdodCA9IEBob3N0RWxlbWVudC5zdHlsZS5oZWlnaHQubGVuZ3RoID4gMFxuXG4gICAgICBpZiBoYXNJbmxpbmVIZWlnaHQgb3IgaGFzRXhwbGljaXRUb3BBbmRCb3R0b21cbiAgICAgICAgaWYgQHByZXNlbnRlci5hdXRvSGVpZ2h0XG4gICAgICAgICAgQHByZXNlbnRlci5zZXRBdXRvSGVpZ2h0KGZhbHNlKVxuICAgICAgICAgIGlmIGhhc0V4cGxpY2l0VG9wQW5kQm90dG9tXG4gICAgICAgICAgICBHcmltLmRlcHJlY2F0ZShcIlwiXCJcbiAgICAgICAgICAgICAgQXNzaWduaW5nIGVkaXRvciAje0BlZGl0b3IuaWR9J3MgaGVpZ2h0IGV4cGxpY2l0bHkgdmlhIGBwb3NpdGlvbjogJ2Fic29sdXRlJ2AgYW5kIGFuIGFzc2lnbmVkIGB0b3BgIGFuZCBgYm90dG9tYCBpbXBsaWNpdGx5IGFzc2lnbnMgdGhlIGBhdXRvSGVpZ2h0YCBwcm9wZXJ0eSB0byBmYWxzZSBvbiB0aGUgZWRpdG9yLlxuICAgICAgICAgICAgICBUaGlzIGJlaGF2aW9yIGlzIGRlcHJlY2F0ZWQgYW5kIHdpbGwgbm90IGJlIHN1cHBvcnRlZCBpbiB0aGUgZnV0dXJlLiBQbGVhc2UgZXhwbGljaXRseSBhc3NpZ24gYGF1dG9IZWlnaHRgIG9uIHRoaXMgZWRpdG9yLlxuICAgICAgICAgICAgXCJcIlwiKVxuICAgICAgICAgIGVsc2UgaWYgaGFzSW5saW5lSGVpZ2h0XG4gICAgICAgICAgICBHcmltLmRlcHJlY2F0ZShcIlwiXCJcbiAgICAgICAgICAgICAgQXNzaWduaW5nIGVkaXRvciAje0BlZGl0b3IuaWR9J3MgaGVpZ2h0IGV4cGxpY2l0bHkgdmlhIGFuIGlubGluZSBzdHlsZSBpbXBsaWNpdGx5IGFzc2lnbnMgdGhlIGBhdXRvSGVpZ2h0YCBwcm9wZXJ0eSB0byBmYWxzZSBvbiB0aGUgZWRpdG9yLlxuICAgICAgICAgICAgICBUaGlzIGJlaGF2aW9yIGlzIGRlcHJlY2F0ZWQgYW5kIHdpbGwgbm90IGJlIHN1cHBvcnRlZCBpbiB0aGUgZnV0dXJlLiBQbGVhc2UgZXhwbGljaXRseSBhc3NpZ24gYGF1dG9IZWlnaHRgIG9uIHRoaXMgZWRpdG9yLlxuICAgICAgICAgICAgXCJcIlwiKVxuICAgICAgZWxzZVxuICAgICAgICBAcHJlc2VudGVyLnNldEF1dG9IZWlnaHQodHJ1ZSlcblxuICAgIGlmIEBwcmVzZW50ZXIuYXV0b0hlaWdodFxuICAgICAgQHByZXNlbnRlci5zZXRFeHBsaWNpdEhlaWdodChudWxsKVxuICAgIGVsc2UgaWYgQGhvc3RFbGVtZW50Lm9mZnNldEhlaWdodCA+IDBcbiAgICAgIEBwcmVzZW50ZXIuc2V0RXhwbGljaXRIZWlnaHQoQGhvc3RFbGVtZW50Lm9mZnNldEhlaWdodClcblxuICAgIGNsaWVudFdpZHRoID0gQHNjcm9sbFZpZXdOb2RlLmNsaWVudFdpZHRoXG4gICAgcGFkZGluZ0xlZnQgPSBwYXJzZUludChnZXRDb21wdXRlZFN0eWxlKEBzY3JvbGxWaWV3Tm9kZSkucGFkZGluZ0xlZnQpXG4gICAgY2xpZW50V2lkdGggLT0gcGFkZGluZ0xlZnRcbiAgICBpZiBjbGllbnRXaWR0aCA+IDBcbiAgICAgIEBwcmVzZW50ZXIuc2V0Q29udGVudEZyYW1lV2lkdGgoY2xpZW50V2lkdGgpXG5cbiAgICBAcHJlc2VudGVyLnNldEd1dHRlcldpZHRoKEBndXR0ZXJDb250YWluZXJDb21wb25lbnQ/LmdldERvbU5vZGUoKS5vZmZzZXRXaWR0aCA/IDApXG4gICAgQHByZXNlbnRlci5zZXRCb3VuZGluZ0NsaWVudFJlY3QoQGhvc3RFbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpKVxuXG4gIG1lYXN1cmVXaW5kb3dTaXplOiAtPlxuICAgIHJldHVybiB1bmxlc3MgQG1vdW50ZWRcblxuICAgICMgRklYTUU6IG9uIFVidW50dSAodmlhIHh2ZmIpIGB3aW5kb3cuaW5uZXJXaWR0aGAgcmVwb3J0cyBhbiBpbmNvcnJlY3QgdmFsdWVcbiAgICAjIHdoZW4gd2luZG93IGdldHMgcmVzaXplZCB0aHJvdWdoIGBhdG9tLnNldFdpbmRvd0RpbWVuc2lvbnMoe3dpZHRoOlxuICAgICMgd2luZG93V2lkdGgsIGhlaWdodDogd2luZG93SGVpZ2h0fSlgLlxuICAgIEBwcmVzZW50ZXIuc2V0V2luZG93U2l6ZSh3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0KVxuXG4gIHNhbXBsZUZvbnRTdHlsaW5nOiA9PlxuICAgIG9sZEZvbnRTaXplID0gQGZvbnRTaXplXG4gICAgb2xkRm9udEZhbWlseSA9IEBmb250RmFtaWx5XG4gICAgb2xkTGluZUhlaWdodCA9IEBsaW5lSGVpZ2h0XG5cbiAgICB7QGZvbnRTaXplLCBAZm9udEZhbWlseSwgQGxpbmVIZWlnaHR9ID0gZ2V0Q29tcHV0ZWRTdHlsZShAZ2V0VG9wbW9zdERPTU5vZGUoKSlcblxuICAgIGlmIEBmb250U2l6ZSBpc250IG9sZEZvbnRTaXplIG9yIEBmb250RmFtaWx5IGlzbnQgb2xkRm9udEZhbWlseSBvciBAbGluZUhlaWdodCBpc250IG9sZExpbmVIZWlnaHRcbiAgICAgIEBjbGVhclBvb2xBZnRlclVwZGF0ZSA9IHRydWVcbiAgICAgIEBtZWFzdXJlTGluZUhlaWdodEFuZERlZmF1bHRDaGFyV2lkdGgoKVxuICAgICAgQGludmFsaWRhdGVNZWFzdXJlbWVudHMoKVxuXG4gIHNhbXBsZUJhY2tncm91bmRDb2xvcnM6IChzdXBwcmVzc1VwZGF0ZSkgLT5cbiAgICB7YmFja2dyb3VuZENvbG9yfSA9IGdldENvbXB1dGVkU3R5bGUoQGhvc3RFbGVtZW50KVxuICAgIEBwcmVzZW50ZXIuc2V0QmFja2dyb3VuZENvbG9yKGJhY2tncm91bmRDb2xvcilcblxuICAgIGxpbmVOdW1iZXJHdXR0ZXIgPSBAZ3V0dGVyQ29udGFpbmVyQ29tcG9uZW50Py5nZXRMaW5lTnVtYmVyR3V0dGVyQ29tcG9uZW50KClcbiAgICBpZiBsaW5lTnVtYmVyR3V0dGVyXG4gICAgICBndXR0ZXJCYWNrZ3JvdW5kQ29sb3IgPSBnZXRDb21wdXRlZFN0eWxlKGxpbmVOdW1iZXJHdXR0ZXIuZ2V0RG9tTm9kZSgpKS5iYWNrZ3JvdW5kQ29sb3JcbiAgICAgIEBwcmVzZW50ZXIuc2V0R3V0dGVyQmFja2dyb3VuZENvbG9yKGd1dHRlckJhY2tncm91bmRDb2xvcilcblxuICBtZWFzdXJlTGluZUhlaWdodEFuZERlZmF1bHRDaGFyV2lkdGg6IC0+XG4gICAgaWYgQGlzVmlzaWJsZSgpXG4gICAgICBAbWVhc3VyZUxpbmVIZWlnaHRBbmREZWZhdWx0Q2hhcldpZHRoV2hlblNob3duID0gZmFsc2VcbiAgICAgIEBsaW5lc0NvbXBvbmVudC5tZWFzdXJlTGluZUhlaWdodEFuZERlZmF1bHRDaGFyV2lkdGgoKVxuICAgIGVsc2VcbiAgICAgIEBtZWFzdXJlTGluZUhlaWdodEFuZERlZmF1bHRDaGFyV2lkdGhXaGVuU2hvd24gPSB0cnVlXG5cbiAgbWVhc3VyZVNjcm9sbGJhcnM6IC0+XG4gICAgQG1lYXN1cmVTY3JvbGxiYXJzV2hlblNob3duID0gZmFsc2VcblxuICAgIGNvcm5lck5vZGUgPSBAc2Nyb2xsYmFyQ29ybmVyQ29tcG9uZW50LmdldERvbU5vZGUoKVxuICAgIG9yaWdpbmFsRGlzcGxheVZhbHVlID0gY29ybmVyTm9kZS5zdHlsZS5kaXNwbGF5XG5cbiAgICBjb3JuZXJOb2RlLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snXG5cbiAgICB3aWR0aCA9IChjb3JuZXJOb2RlLm9mZnNldFdpZHRoIC0gY29ybmVyTm9kZS5jbGllbnRXaWR0aCkgb3IgMTVcbiAgICBoZWlnaHQgPSAoY29ybmVyTm9kZS5vZmZzZXRIZWlnaHQgLSBjb3JuZXJOb2RlLmNsaWVudEhlaWdodCkgb3IgMTVcblxuICAgIEBwcmVzZW50ZXIuc2V0VmVydGljYWxTY3JvbGxiYXJXaWR0aCh3aWR0aClcbiAgICBAcHJlc2VudGVyLnNldEhvcml6b250YWxTY3JvbGxiYXJIZWlnaHQoaGVpZ2h0KVxuXG4gICAgY29ybmVyTm9kZS5zdHlsZS5kaXNwbGF5ID0gb3JpZ2luYWxEaXNwbGF5VmFsdWVcblxuICBjb250YWluc1Njcm9sbGJhclNlbGVjdG9yOiAoc3R5bGVzaGVldCkgLT5cbiAgICBmb3IgcnVsZSBpbiBzdHlsZXNoZWV0LmNzc1J1bGVzXG4gICAgICBpZiBydWxlLnNlbGVjdG9yVGV4dD8uaW5kZXhPZignc2Nyb2xsYmFyJykgPiAtMVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIGZhbHNlXG5cbiAgcmVmcmVzaFNjcm9sbGJhcnM6ID0+XG4gICAgaWYgQGlzVmlzaWJsZSgpXG4gICAgICBAbWVhc3VyZVNjcm9sbGJhcnNXaGVuU2hvd24gPSBmYWxzZVxuICAgIGVsc2VcbiAgICAgIEBtZWFzdXJlU2Nyb2xsYmFyc1doZW5TaG93biA9IHRydWVcbiAgICAgIHJldHVyblxuXG4gICAgdmVydGljYWxOb2RlID0gQHZlcnRpY2FsU2Nyb2xsYmFyQ29tcG9uZW50LmdldERvbU5vZGUoKVxuICAgIGhvcml6b250YWxOb2RlID0gQGhvcml6b250YWxTY3JvbGxiYXJDb21wb25lbnQuZ2V0RG9tTm9kZSgpXG4gICAgY29ybmVyTm9kZSA9IEBzY3JvbGxiYXJDb3JuZXJDb21wb25lbnQuZ2V0RG9tTm9kZSgpXG5cbiAgICBvcmlnaW5hbFZlcnRpY2FsRGlzcGxheVZhbHVlID0gdmVydGljYWxOb2RlLnN0eWxlLmRpc3BsYXlcbiAgICBvcmlnaW5hbEhvcml6b250YWxEaXNwbGF5VmFsdWUgPSBob3Jpem9udGFsTm9kZS5zdHlsZS5kaXNwbGF5XG4gICAgb3JpZ2luYWxDb3JuZXJEaXNwbGF5VmFsdWUgPSBjb3JuZXJOb2RlLnN0eWxlLmRpc3BsYXlcblxuICAgICMgRmlyc3QsIGhpZGUgYWxsIHNjcm9sbGJhcnMgaW4gY2FzZSB0aGV5IGFyZSB2aXNpYmxlIHNvIHRoZXkgdGFrZSBvbiBuZXdcbiAgICAjIHN0eWxlcyB3aGVuIHRoZXkgYXJlIHNob3duIGFnYWluLlxuICAgIHZlcnRpY2FsTm9kZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG4gICAgaG9yaXpvbnRhbE5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICAgIGNvcm5lck5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuXG4gICAgIyBGb3JjZSBhIHJlZmxvd1xuICAgIGNvcm5lck5vZGUub2Zmc2V0V2lkdGhcblxuICAgICMgTm93IG1lYXN1cmUgdGhlIG5ldyBzY3JvbGxiYXIgZGltZW5zaW9uc1xuICAgIEBtZWFzdXJlU2Nyb2xsYmFycygpXG5cbiAgICAjIE5vdyByZXN0b3JlIHRoZSBkaXNwbGF5IHZhbHVlIGZvciBhbGwgc2Nyb2xsYmFycywgc2luY2UgdGhleSB3ZXJlXG4gICAgIyBwcmV2aW91c2x5IGhpZGRlblxuICAgIHZlcnRpY2FsTm9kZS5zdHlsZS5kaXNwbGF5ID0gb3JpZ2luYWxWZXJ0aWNhbERpc3BsYXlWYWx1ZVxuICAgIGhvcml6b250YWxOb2RlLnN0eWxlLmRpc3BsYXkgPSBvcmlnaW5hbEhvcml6b250YWxEaXNwbGF5VmFsdWVcbiAgICBjb3JuZXJOb2RlLnN0eWxlLmRpc3BsYXkgPSBvcmlnaW5hbENvcm5lckRpc3BsYXlWYWx1ZVxuXG4gIGNvbnNvbGlkYXRlU2VsZWN0aW9uczogKGUpIC0+XG4gICAgZS5hYm9ydEtleUJpbmRpbmcoKSB1bmxlc3MgQGVkaXRvci5jb25zb2xpZGF0ZVNlbGVjdGlvbnMoKVxuXG4gIGxpbmVOb2RlRm9yU2NyZWVuUm93OiAoc2NyZWVuUm93KSAtPlxuICAgIEBsaW5lc0NvbXBvbmVudC5saW5lTm9kZUZvclNjcmVlblJvdyhzY3JlZW5Sb3cpXG5cbiAgbGluZU51bWJlck5vZGVGb3JTY3JlZW5Sb3c6IChzY3JlZW5Sb3cpIC0+XG4gICAgdGlsZVJvdyA9IEBwcmVzZW50ZXIudGlsZUZvclJvdyhzY3JlZW5Sb3cpXG4gICAgZ3V0dGVyQ29tcG9uZW50ID0gQGd1dHRlckNvbnRhaW5lckNvbXBvbmVudC5nZXRMaW5lTnVtYmVyR3V0dGVyQ29tcG9uZW50KClcbiAgICB0aWxlQ29tcG9uZW50ID0gZ3V0dGVyQ29tcG9uZW50LmdldENvbXBvbmVudEZvclRpbGUodGlsZVJvdylcblxuICAgIHRpbGVDb21wb25lbnQ/LmxpbmVOdW1iZXJOb2RlRm9yU2NyZWVuUm93KHNjcmVlblJvdylcblxuICB0aWxlTm9kZXNGb3JMaW5lczogLT5cbiAgICBAbGluZXNDb21wb25lbnQuZ2V0VGlsZXMoKVxuXG4gIHRpbGVOb2Rlc0ZvckxpbmVOdW1iZXJzOiAtPlxuICAgIGd1dHRlckNvbXBvbmVudCA9IEBndXR0ZXJDb250YWluZXJDb21wb25lbnQuZ2V0TGluZU51bWJlckd1dHRlckNvbXBvbmVudCgpXG4gICAgZ3V0dGVyQ29tcG9uZW50LmdldFRpbGVzKClcblxuICBzY3JlZW5Sb3dGb3JOb2RlOiAobm9kZSkgLT5cbiAgICB3aGlsZSBub2RlP1xuICAgICAgaWYgc2NyZWVuUm93ID0gbm9kZS5kYXRhc2V0Py5zY3JlZW5Sb3dcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KHNjcmVlblJvdylcbiAgICAgIG5vZGUgPSBub2RlLnBhcmVudEVsZW1lbnRcbiAgICBudWxsXG5cbiAgZ2V0Rm9udFNpemU6IC0+XG4gICAgcGFyc2VJbnQoZ2V0Q29tcHV0ZWRTdHlsZShAZ2V0VG9wbW9zdERPTU5vZGUoKSkuZm9udFNpemUpXG5cbiAgc2V0Rm9udFNpemU6IChmb250U2l6ZSkgLT5cbiAgICBAZ2V0VG9wbW9zdERPTU5vZGUoKS5zdHlsZS5mb250U2l6ZSA9IGZvbnRTaXplICsgJ3B4J1xuICAgIEBzYW1wbGVGb250U3R5bGluZygpXG4gICAgQGludmFsaWRhdGVNZWFzdXJlbWVudHMoKVxuXG4gIGdldEZvbnRGYW1pbHk6IC0+XG4gICAgZ2V0Q29tcHV0ZWRTdHlsZShAZ2V0VG9wbW9zdERPTU5vZGUoKSkuZm9udEZhbWlseVxuXG4gIHNldEZvbnRGYW1pbHk6IChmb250RmFtaWx5KSAtPlxuICAgIEBnZXRUb3Btb3N0RE9NTm9kZSgpLnN0eWxlLmZvbnRGYW1pbHkgPSBmb250RmFtaWx5XG4gICAgQHNhbXBsZUZvbnRTdHlsaW5nKClcbiAgICBAaW52YWxpZGF0ZU1lYXN1cmVtZW50cygpXG5cbiAgc2V0TGluZUhlaWdodDogKGxpbmVIZWlnaHQpIC0+XG4gICAgQGdldFRvcG1vc3RET01Ob2RlKCkuc3R5bGUubGluZUhlaWdodCA9IGxpbmVIZWlnaHRcbiAgICBAc2FtcGxlRm9udFN0eWxpbmcoKVxuICAgIEBpbnZhbGlkYXRlTWVhc3VyZW1lbnRzKClcblxuICBpbnZhbGlkYXRlTWVhc3VyZW1lbnRzOiAtPlxuICAgIEBsaW5lc1lhcmRzdGljay5pbnZhbGlkYXRlQ2FjaGUoKVxuICAgIEBwcmVzZW50ZXIubWVhc3VyZW1lbnRzQ2hhbmdlZCgpXG5cbiAgc2NyZWVuUG9zaXRpb25Gb3JNb3VzZUV2ZW50OiAoZXZlbnQsIGxpbmVzQ2xpZW50UmVjdCkgLT5cbiAgICBwaXhlbFBvc2l0aW9uID0gQHBpeGVsUG9zaXRpb25Gb3JNb3VzZUV2ZW50KGV2ZW50LCBsaW5lc0NsaWVudFJlY3QpXG4gICAgQHNjcmVlblBvc2l0aW9uRm9yUGl4ZWxQb3NpdGlvbihwaXhlbFBvc2l0aW9uKVxuXG4gIHBpeGVsUG9zaXRpb25Gb3JNb3VzZUV2ZW50OiAoZXZlbnQsIGxpbmVzQ2xpZW50UmVjdCkgLT5cbiAgICB7Y2xpZW50WCwgY2xpZW50WX0gPSBldmVudFxuXG4gICAgbGluZXNDbGllbnRSZWN0ID89IEBsaW5lc0NvbXBvbmVudC5nZXREb21Ob2RlKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcbiAgICB0b3AgPSBjbGllbnRZIC0gbGluZXNDbGllbnRSZWN0LnRvcCArIEBwcmVzZW50ZXIuZ2V0UmVhbFNjcm9sbFRvcCgpXG4gICAgbGVmdCA9IGNsaWVudFggLSBsaW5lc0NsaWVudFJlY3QubGVmdCArIEBwcmVzZW50ZXIuZ2V0UmVhbFNjcm9sbExlZnQoKVxuICAgIGJvdHRvbSA9IGxpbmVzQ2xpZW50UmVjdC50b3AgKyBAcHJlc2VudGVyLmdldFJlYWxTY3JvbGxUb3AoKSArIGxpbmVzQ2xpZW50UmVjdC5oZWlnaHQgLSBjbGllbnRZXG4gICAgcmlnaHQgPSBsaW5lc0NsaWVudFJlY3QubGVmdCArIEBwcmVzZW50ZXIuZ2V0UmVhbFNjcm9sbExlZnQoKSArIGxpbmVzQ2xpZW50UmVjdC53aWR0aCAtIGNsaWVudFhcblxuICAgIHt0b3AsIGxlZnQsIGJvdHRvbSwgcmlnaHR9XG5cbiAgZ2V0R3V0dGVyV2lkdGg6IC0+XG4gICAgQHByZXNlbnRlci5nZXRHdXR0ZXJXaWR0aCgpXG5cbiAgZ2V0TW9kZWw6IC0+XG4gICAgQGVkaXRvclxuXG4gIGlzSW5wdXRFbmFibGVkOiAtPiBAaW5wdXRFbmFibGVkXG5cbiAgc2V0SW5wdXRFbmFibGVkOiAoQGlucHV0RW5hYmxlZCkgLT4gQGlucHV0RW5hYmxlZFxuXG4gIHNldENvbnRpbnVvdXNSZWZsb3c6IChjb250aW51b3VzUmVmbG93KSAtPlxuICAgIEBwcmVzZW50ZXIuc2V0Q29udGludW91c1JlZmxvdyhjb250aW51b3VzUmVmbG93KVxuXG4gIHVwZGF0ZVBhcmVudFZpZXdGb2N1c2VkQ2xhc3NJZk5lZWRlZDogLT5cbiAgICBpZiBAb2xkU3RhdGUuZm9jdXNlZCBpc250IEBuZXdTdGF0ZS5mb2N1c2VkXG4gICAgICBAaG9zdEVsZW1lbnQuY2xhc3NMaXN0LnRvZ2dsZSgnaXMtZm9jdXNlZCcsIEBuZXdTdGF0ZS5mb2N1c2VkKVxuICAgICAgQG9sZFN0YXRlLmZvY3VzZWQgPSBAbmV3U3RhdGUuZm9jdXNlZFxuXG4gIHVwZGF0ZVBhcmVudFZpZXdNaW5pQ2xhc3M6IC0+XG4gICAgQGhvc3RFbGVtZW50LmNsYXNzTGlzdC50b2dnbGUoJ21pbmknLCBAZWRpdG9yLmlzTWluaSgpKVxuIl19
