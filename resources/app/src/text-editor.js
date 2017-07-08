(function() {
  var CompositeDisposable, Cursor, DecorationManager, Disposable, Emitter, Grim, GutterContainer, LanguageMode, MAX_SCREEN_LINE_LENGTH, Model, Point, Range, Selection, TextBuffer, TextEditor, TextEditorElement, TextMateScopeSelector, TokenizedBuffer, ZERO_WIDTH_NBSP, _, fs, isDoubleWidthCharacter, isHalfWidthCharacter, isKoreanCharacter, isWrapBoundary, path, ref, ref1, ref2,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    slice = [].slice;

  _ = require('underscore-plus');

  path = require('path');

  fs = require('fs-plus');

  Grim = require('grim');

  ref = require('event-kit'), CompositeDisposable = ref.CompositeDisposable, Disposable = ref.Disposable, Emitter = ref.Emitter;

  ref1 = TextBuffer = require('text-buffer'), Point = ref1.Point, Range = ref1.Range;

  LanguageMode = require('./language-mode');

  DecorationManager = require('./decoration-manager');

  TokenizedBuffer = require('./tokenized-buffer');

  Cursor = require('./cursor');

  Model = require('./model');

  Selection = require('./selection');

  TextMateScopeSelector = require('first-mate').ScopeSelector;

  GutterContainer = require('./gutter-container');

  TextEditorElement = require('./text-editor-element');

  ref2 = require('./text-utils'), isDoubleWidthCharacter = ref2.isDoubleWidthCharacter, isHalfWidthCharacter = ref2.isHalfWidthCharacter, isKoreanCharacter = ref2.isKoreanCharacter, isWrapBoundary = ref2.isWrapBoundary;

  ZERO_WIDTH_NBSP = '\ufeff';

  MAX_SCREEN_LINE_LENGTH = 500;

  module.exports = TextEditor = (function(superClass) {
    extend(TextEditor, superClass);

    TextEditor.setClipboard = function(clipboard) {
      return this.clipboard = clipboard;
    };

    TextEditor.prototype.serializationVersion = 1;

    TextEditor.prototype.buffer = null;

    TextEditor.prototype.languageMode = null;

    TextEditor.prototype.cursors = null;

    TextEditor.prototype.showCursorOnSelection = null;

    TextEditor.prototype.selections = null;

    TextEditor.prototype.suppressSelectionMerging = false;

    TextEditor.prototype.selectionFlashDuration = 500;

    TextEditor.prototype.gutterContainer = null;

    TextEditor.prototype.editorElement = null;

    TextEditor.prototype.verticalScrollMargin = 2;

    TextEditor.prototype.horizontalScrollMargin = 6;

    TextEditor.prototype.softWrapped = null;

    TextEditor.prototype.editorWidthInChars = null;

    TextEditor.prototype.lineHeightInPixels = null;

    TextEditor.prototype.defaultCharWidth = null;

    TextEditor.prototype.height = null;

    TextEditor.prototype.width = null;

    TextEditor.prototype.registered = false;

    TextEditor.prototype.atomicSoftTabs = true;

    TextEditor.prototype.invisibles = null;

    TextEditor.prototype.showLineNumbers = true;

    TextEditor.prototype.scrollSensitivity = 40;

    Object.defineProperty(TextEditor.prototype, "element", {
      get: function() {
        return this.getElement();
      }
    });

    Object.defineProperty(TextEditor.prototype, 'displayBuffer', {
      get: function() {
        Grim.deprecate("`TextEditor.prototype.displayBuffer` has always been private, but now\nit is gone. Reading the `displayBuffer` property now returns a reference\nto the containing `TextEditor`, which now provides *some* of the API of\nthe defunct `DisplayBuffer` class.");
        return this;
      }
    });

    TextEditor.deserialize = function(state, atomEnvironment) {
      var disposable, editor, error;
      if (state.version !== this.prototype.serializationVersion && (state.displayBuffer != null)) {
        state.tokenizedBuffer = state.displayBuffer.tokenizedBuffer;
      }
      try {
        state.tokenizedBuffer = TokenizedBuffer.deserialize(state.tokenizedBuffer, atomEnvironment);
        state.tabLength = state.tokenizedBuffer.getTabLength();
      } catch (error1) {
        error = error1;
        if (error.syscall === 'read') {
          return;
        } else {
          throw error;
        }
      }
      state.buffer = state.tokenizedBuffer.buffer;
      state.assert = atomEnvironment.assert.bind(atomEnvironment);
      editor = new this(state);
      if (state.registered) {
        disposable = atomEnvironment.textEditors.add(editor);
        editor.onDidDestroy(function() {
          return disposable.dispose();
        });
      }
      return editor;
    };

    function TextEditor(params) {
      var displayLayerParams, grammar, initialColumn, initialLine, l, len, lineNumberGutterVisible, marker, ref3, ref4, ref5, suppressCursorCreation, tabLength;
      if (params == null) {
        params = {};
      }
      this.doBackgroundWork = bind(this.doBackgroundWork, this);
      if (this.constructor.clipboard == null) {
        throw new Error("Must call TextEditor.setClipboard at least once before creating TextEditor instances");
      }
      TextEditor.__super__.constructor.apply(this, arguments);
      this.softTabs = params.softTabs, this.firstVisibleScreenRow = params.firstVisibleScreenRow, this.firstVisibleScreenColumn = params.firstVisibleScreenColumn, initialLine = params.initialLine, initialColumn = params.initialColumn, tabLength = params.tabLength, this.softWrapped = params.softWrapped, this.decorationManager = params.decorationManager, this.selectionsMarkerLayer = params.selectionsMarkerLayer, this.buffer = params.buffer, suppressCursorCreation = params.suppressCursorCreation, this.mini = params.mini, this.placeholderText = params.placeholderText, lineNumberGutterVisible = params.lineNumberGutterVisible, this.largeFileMode = params.largeFileMode, this.assert = params.assert, grammar = params.grammar, this.showInvisibles = params.showInvisibles, this.autoHeight = params.autoHeight, this.autoWidth = params.autoWidth, this.scrollPastEnd = params.scrollPastEnd, this.editorWidthInChars = params.editorWidthInChars, this.tokenizedBuffer = params.tokenizedBuffer, this.displayLayer = params.displayLayer, this.invisibles = params.invisibles, this.showIndentGuide = params.showIndentGuide, this.softWrapped = params.softWrapped, this.softWrapAtPreferredLineLength = params.softWrapAtPreferredLineLength, this.preferredLineLength = params.preferredLineLength, this.showCursorOnSelection = params.showCursorOnSelection;
      if (this.assert == null) {
        this.assert = function(condition) {
          return condition;
        };
      }
      if (this.firstVisibleScreenRow == null) {
        this.firstVisibleScreenRow = 0;
      }
      if (this.firstVisibleScreenColumn == null) {
        this.firstVisibleScreenColumn = 0;
      }
      this.emitter = new Emitter;
      this.disposables = new CompositeDisposable;
      this.cursors = [];
      this.cursorsByMarkerId = new Map;
      this.selections = [];
      this.hasTerminatedPendingState = false;
      if (this.mini == null) {
        this.mini = false;
      }
      if (this.scrollPastEnd == null) {
        this.scrollPastEnd = false;
      }
      if (this.showInvisibles == null) {
        this.showInvisibles = true;
      }
      if (this.softTabs == null) {
        this.softTabs = true;
      }
      if (tabLength == null) {
        tabLength = 2;
      }
      if (this.autoIndent == null) {
        this.autoIndent = true;
      }
      if (this.autoIndentOnPaste == null) {
        this.autoIndentOnPaste = true;
      }
      if (this.showCursorOnSelection == null) {
        this.showCursorOnSelection = true;
      }
      if (this.undoGroupingInterval == null) {
        this.undoGroupingInterval = 300;
      }
      if (this.nonWordCharacters == null) {
        this.nonWordCharacters = "/\\()\"':,.;<>~!@#$%^&*|+=[]{}`?-…";
      }
      if (this.softWrapped == null) {
        this.softWrapped = false;
      }
      if (this.softWrapAtPreferredLineLength == null) {
        this.softWrapAtPreferredLineLength = false;
      }
      if (this.preferredLineLength == null) {
        this.preferredLineLength = 80;
      }
      if (this.buffer == null) {
        this.buffer = new TextBuffer({
          shouldDestroyOnFileDelete: function() {
            return atom.config.get('core.closeDeletedFileTabs');
          }
        });
      }
      if (this.tokenizedBuffer == null) {
        this.tokenizedBuffer = new TokenizedBuffer({
          grammar: grammar,
          tabLength: tabLength,
          buffer: this.buffer,
          largeFileMode: this.largeFileMode,
          assert: this.assert
        });
      }
      if (this.displayLayer == null) {
        displayLayerParams = {
          invisibles: this.getInvisibles(),
          softWrapColumn: this.getSoftWrapColumn(),
          showIndentGuides: this.doesShowIndentGuide(),
          atomicSoftTabs: (ref3 = params.atomicSoftTabs) != null ? ref3 : true,
          tabLength: tabLength,
          ratioForCharacter: this.ratioForCharacter.bind(this),
          isWrapBoundary: isWrapBoundary,
          foldCharacter: ZERO_WIDTH_NBSP,
          softWrapHangingIndent: (ref4 = params.softWrapHangingIndentLength) != null ? ref4 : 0
        };
        if (this.displayLayer = this.buffer.getDisplayLayer(params.displayLayerId)) {
          this.displayLayer.reset(displayLayerParams);
          this.selectionsMarkerLayer = this.displayLayer.getMarkerLayer(params.selectionsMarkerLayerId);
        } else {
          this.displayLayer = this.buffer.addDisplayLayer(displayLayerParams);
        }
      }
      this.backgroundWorkHandle = requestIdleCallback(this.doBackgroundWork);
      this.disposables.add(new Disposable((function(_this) {
        return function() {
          if (_this.backgroundWorkHandle != null) {
            return cancelIdleCallback(_this.backgroundWorkHandle);
          }
        };
      })(this)));
      this.displayLayer.setTextDecorationLayer(this.tokenizedBuffer);
      this.defaultMarkerLayer = this.displayLayer.addMarkerLayer();
      this.disposables.add(this.defaultMarkerLayer.onDidDestroy((function(_this) {
        return function() {
          return _this.assert(false, "defaultMarkerLayer destroyed at an unexpected time");
        };
      })(this)));
      if (this.selectionsMarkerLayer == null) {
        this.selectionsMarkerLayer = this.addMarkerLayer({
          maintainHistory: true,
          persistent: true
        });
      }
      this.selectionsMarkerLayer.trackDestructionInOnDidCreateMarkerCallbacks = true;
      this.decorationManager = new DecorationManager(this.displayLayer);
      this.decorateMarkerLayer(this.displayLayer.foldsMarkerLayer, {
        type: 'line-number',
        "class": 'folded'
      });
      ref5 = this.selectionsMarkerLayer.getMarkers();
      for (l = 0, len = ref5.length; l < len; l++) {
        marker = ref5[l];
        this.addSelection(marker);
      }
      this.subscribeToBuffer();
      this.subscribeToDisplayLayer();
      if (this.cursors.length === 0 && !suppressCursorCreation) {
        initialLine = Math.max(parseInt(initialLine) || 0, 0);
        initialColumn = Math.max(parseInt(initialColumn) || 0, 0);
        this.addCursorAtBufferPosition([initialLine, initialColumn]);
      }
      this.languageMode = new LanguageMode(this);
      this.gutterContainer = new GutterContainer(this);
      this.lineNumberGutter = this.gutterContainer.addGutter({
        name: 'line-number',
        priority: 0,
        visible: lineNumberGutterVisible
      });
    }

    TextEditor.prototype.doBackgroundWork = function(deadline) {
      var ref3;
      if (this.displayLayer.doBackgroundWork(deadline)) {
        if ((ref3 = this.presenter) != null) {
          ref3.updateVerticalDimensions();
        }
        return this.backgroundWorkHandle = requestIdleCallback(this.doBackgroundWork);
      } else {
        return this.backgroundWorkHandle = null;
      }
    };

    TextEditor.prototype.update = function(params) {
      var cursor, displayLayerParams, l, len, len1, m, param, ref3, ref4, ref5, ref6, ref7, ref8, value;
      displayLayerParams = {};
      ref3 = Object.keys(params);
      for (l = 0, len = ref3.length; l < len; l++) {
        param = ref3[l];
        value = params[param];
        switch (param) {
          case 'autoIndent':
            this.autoIndent = value;
            break;
          case 'autoIndentOnPaste':
            this.autoIndentOnPaste = value;
            break;
          case 'undoGroupingInterval':
            this.undoGroupingInterval = value;
            break;
          case 'nonWordCharacters':
            this.nonWordCharacters = value;
            break;
          case 'scrollSensitivity':
            this.scrollSensitivity = value;
            break;
          case 'encoding':
            this.buffer.setEncoding(value);
            break;
          case 'softTabs':
            if (value !== this.softTabs) {
              this.softTabs = value;
            }
            break;
          case 'atomicSoftTabs':
            if (value !== this.displayLayer.atomicSoftTabs) {
              displayLayerParams.atomicSoftTabs = value;
            }
            break;
          case 'tabLength':
            if ((value != null) && value !== this.tokenizedBuffer.getTabLength()) {
              this.tokenizedBuffer.setTabLength(value);
              displayLayerParams.tabLength = value;
            }
            break;
          case 'softWrapped':
            if (value !== this.softWrapped) {
              this.softWrapped = value;
              displayLayerParams.softWrapColumn = this.getSoftWrapColumn();
              this.emitter.emit('did-change-soft-wrapped', this.isSoftWrapped());
            }
            break;
          case 'softWrapHangingIndentLength':
            if (value !== this.displayLayer.softWrapHangingIndent) {
              displayLayerParams.softWrapHangingIndent = value;
            }
            break;
          case 'softWrapAtPreferredLineLength':
            if (value !== this.softWrapAtPreferredLineLength) {
              this.softWrapAtPreferredLineLength = value;
              displayLayerParams.softWrapColumn = this.getSoftWrapColumn();
            }
            break;
          case 'preferredLineLength':
            if (value !== this.preferredLineLength) {
              this.preferredLineLength = value;
              displayLayerParams.softWrapColumn = this.getSoftWrapColumn();
            }
            break;
          case 'mini':
            if (value !== this.mini) {
              this.mini = value;
              this.emitter.emit('did-change-mini', value);
              displayLayerParams.invisibles = this.getInvisibles();
              displayLayerParams.softWrapColumn = this.getSoftWrapColumn();
              displayLayerParams.showIndentGuides = this.doesShowIndentGuide();
            }
            break;
          case 'placeholderText':
            if (value !== this.placeholderText) {
              this.placeholderText = value;
              this.emitter.emit('did-change-placeholder-text', value);
            }
            break;
          case 'lineNumberGutterVisible':
            if (value !== this.lineNumberGutterVisible) {
              if (value) {
                this.lineNumberGutter.show();
              } else {
                this.lineNumberGutter.hide();
              }
              this.emitter.emit('did-change-line-number-gutter-visible', this.lineNumberGutter.isVisible());
            }
            break;
          case 'showIndentGuide':
            if (value !== this.showIndentGuide) {
              this.showIndentGuide = value;
              displayLayerParams.showIndentGuides = this.doesShowIndentGuide();
            }
            break;
          case 'showLineNumbers':
            if (value !== this.showLineNumbers) {
              this.showLineNumbers = value;
              if ((ref4 = this.presenter) != null) {
                ref4.didChangeShowLineNumbers();
              }
            }
            break;
          case 'showInvisibles':
            if (value !== this.showInvisibles) {
              this.showInvisibles = value;
              displayLayerParams.invisibles = this.getInvisibles();
            }
            break;
          case 'invisibles':
            if (!_.isEqual(value, this.invisibles)) {
              this.invisibles = value;
              displayLayerParams.invisibles = this.getInvisibles();
            }
            break;
          case 'editorWidthInChars':
            if (value > 0 && value !== this.editorWidthInChars) {
              this.editorWidthInChars = value;
              displayLayerParams.softWrapColumn = this.getSoftWrapColumn();
            }
            break;
          case 'width':
            if (value !== this.width) {
              this.width = value;
              displayLayerParams.softWrapColumn = this.getSoftWrapColumn();
            }
            break;
          case 'scrollPastEnd':
            if (value !== this.scrollPastEnd) {
              this.scrollPastEnd = value;
              if ((ref5 = this.presenter) != null) {
                ref5.didChangeScrollPastEnd();
              }
            }
            break;
          case 'autoHeight':
            if (value !== this.autoHeight) {
              this.autoHeight = value;
              if ((ref6 = this.presenter) != null) {
                ref6.setAutoHeight(this.autoHeight);
              }
            }
            break;
          case 'autoWidth':
            if (value !== this.autoWidth) {
              this.autoWidth = value;
              if ((ref7 = this.presenter) != null) {
                ref7.didChangeAutoWidth();
              }
            }
            break;
          case 'showCursorOnSelection':
            if (value !== this.showCursorOnSelection) {
              this.showCursorOnSelection = value;
              ref8 = this.getCursors();
              for (m = 0, len1 = ref8.length; m < len1; m++) {
                cursor = ref8[m];
                cursor.setShowCursorOnSelection(value);
              }
            }
            break;
          default:
            if (param !== 'ref' && param !== 'key') {
              throw new TypeError("Invalid TextEditor parameter: '" + param + "'");
            }
        }
      }
      this.displayLayer.reset(displayLayerParams);
      if (this.editorElement != null) {
        return this.editorElement.views.getNextUpdatePromise();
      } else {
        return Promise.resolve();
      }
    };

    TextEditor.prototype.serialize = function() {
      var tokenizedBufferState;
      tokenizedBufferState = this.tokenizedBuffer.serialize();
      return {
        deserializer: 'TextEditor',
        version: this.serializationVersion,
        displayBuffer: {
          tokenizedBuffer: tokenizedBufferState
        },
        tokenizedBuffer: tokenizedBufferState,
        displayLayerId: this.displayLayer.id,
        selectionsMarkerLayerId: this.selectionsMarkerLayer.id,
        firstVisibleScreenRow: this.getFirstVisibleScreenRow(),
        firstVisibleScreenColumn: this.getFirstVisibleScreenColumn(),
        atomicSoftTabs: this.displayLayer.atomicSoftTabs,
        softWrapHangingIndentLength: this.displayLayer.softWrapHangingIndent,
        id: this.id,
        softTabs: this.softTabs,
        softWrapped: this.softWrapped,
        softWrapAtPreferredLineLength: this.softWrapAtPreferredLineLength,
        preferredLineLength: this.preferredLineLength,
        mini: this.mini,
        editorWidthInChars: this.editorWidthInChars,
        width: this.width,
        largeFileMode: this.largeFileMode,
        registered: this.registered,
        invisibles: this.invisibles,
        showInvisibles: this.showInvisibles,
        showIndentGuide: this.showIndentGuide,
        autoHeight: this.autoHeight,
        autoWidth: this.autoWidth
      };
    };

    TextEditor.prototype.subscribeToBuffer = function() {
      this.buffer.retain();
      this.disposables.add(this.buffer.onDidChangePath((function(_this) {
        return function() {
          _this.emitter.emit('did-change-title', _this.getTitle());
          return _this.emitter.emit('did-change-path', _this.getPath());
        };
      })(this)));
      this.disposables.add(this.buffer.onDidChangeEncoding((function(_this) {
        return function() {
          return _this.emitter.emit('did-change-encoding', _this.getEncoding());
        };
      })(this)));
      this.disposables.add(this.buffer.onDidDestroy((function(_this) {
        return function() {
          return _this.destroy();
        };
      })(this)));
      this.disposables.add(this.buffer.onDidChangeModified((function(_this) {
        return function() {
          if (!_this.hasTerminatedPendingState && _this.buffer.isModified()) {
            return _this.terminatePendingState();
          }
        };
      })(this)));
      return this.preserveCursorPositionOnBufferReload();
    };

    TextEditor.prototype.terminatePendingState = function() {
      if (!this.hasTerminatedPendingState) {
        this.emitter.emit('did-terminate-pending-state');
      }
      return this.hasTerminatedPendingState = true;
    };

    TextEditor.prototype.onDidTerminatePendingState = function(callback) {
      return this.emitter.on('did-terminate-pending-state', callback);
    };

    TextEditor.prototype.subscribeToDisplayLayer = function() {
      this.disposables.add(this.selectionsMarkerLayer.onDidCreateMarker(this.addSelection.bind(this)));
      this.disposables.add(this.tokenizedBuffer.onDidChangeGrammar(this.handleGrammarChange.bind(this)));
      this.disposables.add(this.displayLayer.onDidChangeSync((function(_this) {
        return function(e) {
          _this.mergeIntersectingSelections();
          return _this.emitter.emit('did-change', e);
        };
      })(this)));
      return this.disposables.add(this.displayLayer.onDidReset((function(_this) {
        return function() {
          _this.mergeIntersectingSelections();
          return _this.emitter.emit('did-change', {});
        };
      })(this)));
    };

    TextEditor.prototype.destroyed = function() {
      var l, len, ref3, selection;
      this.disposables.dispose();
      this.displayLayer.destroy();
      this.tokenizedBuffer.destroy();
      ref3 = this.selections.slice();
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        selection.destroy();
      }
      this.buffer.release();
      this.languageMode.destroy();
      this.gutterContainer.destroy();
      this.emitter.emit('did-destroy');
      this.emitter.clear();
      this.editorElement = null;
      return this.presenter = null;
    };


    /*
    Section: Event Subscription
     */

    TextEditor.prototype.onDidChangeTitle = function(callback) {
      return this.emitter.on('did-change-title', callback);
    };

    TextEditor.prototype.onDidChangePath = function(callback) {
      return this.emitter.on('did-change-path', callback);
    };

    TextEditor.prototype.onDidChange = function(callback) {
      return this.emitter.on('did-change', callback);
    };

    TextEditor.prototype.onDidStopChanging = function(callback) {
      return this.getBuffer().onDidStopChanging(callback);
    };

    TextEditor.prototype.onDidChangeCursorPosition = function(callback) {
      return this.emitter.on('did-change-cursor-position', callback);
    };

    TextEditor.prototype.onDidChangeSelectionRange = function(callback) {
      return this.emitter.on('did-change-selection-range', callback);
    };

    TextEditor.prototype.onDidChangeSoftWrapped = function(callback) {
      return this.emitter.on('did-change-soft-wrapped', callback);
    };

    TextEditor.prototype.onDidChangeEncoding = function(callback) {
      return this.emitter.on('did-change-encoding', callback);
    };

    TextEditor.prototype.observeGrammar = function(callback) {
      callback(this.getGrammar());
      return this.onDidChangeGrammar(callback);
    };

    TextEditor.prototype.onDidChangeGrammar = function(callback) {
      return this.emitter.on('did-change-grammar', callback);
    };

    TextEditor.prototype.onDidChangeModified = function(callback) {
      return this.getBuffer().onDidChangeModified(callback);
    };

    TextEditor.prototype.onDidConflict = function(callback) {
      return this.getBuffer().onDidConflict(callback);
    };

    TextEditor.prototype.onWillInsertText = function(callback) {
      return this.emitter.on('will-insert-text', callback);
    };

    TextEditor.prototype.onDidInsertText = function(callback) {
      return this.emitter.on('did-insert-text', callback);
    };

    TextEditor.prototype.onDidSave = function(callback) {
      return this.getBuffer().onDidSave(callback);
    };

    TextEditor.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };

    TextEditor.prototype.observeCursors = function(callback) {
      var cursor, l, len, ref3;
      ref3 = this.getCursors();
      for (l = 0, len = ref3.length; l < len; l++) {
        cursor = ref3[l];
        callback(cursor);
      }
      return this.onDidAddCursor(callback);
    };

    TextEditor.prototype.onDidAddCursor = function(callback) {
      return this.emitter.on('did-add-cursor', callback);
    };

    TextEditor.prototype.onDidRemoveCursor = function(callback) {
      return this.emitter.on('did-remove-cursor', callback);
    };

    TextEditor.prototype.observeSelections = function(callback) {
      var l, len, ref3, selection;
      ref3 = this.getSelections();
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        callback(selection);
      }
      return this.onDidAddSelection(callback);
    };

    TextEditor.prototype.onDidAddSelection = function(callback) {
      return this.emitter.on('did-add-selection', callback);
    };

    TextEditor.prototype.onDidRemoveSelection = function(callback) {
      return this.emitter.on('did-remove-selection', callback);
    };

    TextEditor.prototype.observeDecorations = function(callback) {
      return this.decorationManager.observeDecorations(callback);
    };

    TextEditor.prototype.onDidAddDecoration = function(callback) {
      return this.decorationManager.onDidAddDecoration(callback);
    };

    TextEditor.prototype.onDidRemoveDecoration = function(callback) {
      return this.decorationManager.onDidRemoveDecoration(callback);
    };

    TextEditor.prototype.onDidChangePlaceholderText = function(callback) {
      return this.emitter.on('did-change-placeholder-text', callback);
    };

    TextEditor.prototype.onDidChangeFirstVisibleScreenRow = function(callback, fromView) {
      return this.emitter.on('did-change-first-visible-screen-row', callback);
    };

    TextEditor.prototype.onDidChangeScrollTop = function(callback) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::onDidChangeScrollTop instead.");
      return this.getElement().onDidChangeScrollTop(callback);
    };

    TextEditor.prototype.onDidChangeScrollLeft = function(callback) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::onDidChangeScrollLeft instead.");
      return this.getElement().onDidChangeScrollLeft(callback);
    };

    TextEditor.prototype.onDidRequestAutoscroll = function(callback) {
      return this.emitter.on('did-request-autoscroll', callback);
    };

    TextEditor.prototype.onDidChangeIcon = function(callback) {
      return this.emitter.on('did-change-icon', callback);
    };

    TextEditor.prototype.onDidUpdateDecorations = function(callback) {
      return this.decorationManager.onDidUpdateDecorations(callback);
    };

    TextEditor.prototype.getBuffer = function() {
      return this.buffer;
    };

    TextEditor.prototype.getURI = function() {
      return this.buffer.getUri();
    };

    TextEditor.prototype.copy = function() {
      var displayLayer, selectionsMarkerLayer, softTabs;
      displayLayer = this.displayLayer.copy();
      selectionsMarkerLayer = displayLayer.getMarkerLayer(this.buffer.getMarkerLayer(this.selectionsMarkerLayer.id).copy().id);
      softTabs = this.getSoftTabs();
      return new TextEditor({
        buffer: this.buffer,
        selectionsMarkerLayer: selectionsMarkerLayer,
        softTabs: softTabs,
        suppressCursorCreation: true,
        tabLength: this.tokenizedBuffer.getTabLength(),
        firstVisibleScreenRow: this.firstVisibleScreenRow,
        firstVisibleScreenColumn: this.firstVisibleScreenColumn,
        assert: this.assert,
        displayLayer: displayLayer,
        grammar: this.getGrammar(),
        autoWidth: this.autoWidth,
        autoHeight: this.autoHeight,
        showCursorOnSelection: this.showCursorOnSelection
      });
    };

    TextEditor.prototype.setVisible = function(visible) {
      return this.tokenizedBuffer.setVisible(visible);
    };

    TextEditor.prototype.setMini = function(mini) {
      this.update({
        mini: mini
      });
      return this.mini;
    };

    TextEditor.prototype.isMini = function() {
      return this.mini;
    };

    TextEditor.prototype.setUpdatedSynchronously = function(updatedSynchronously) {
      return this.decorationManager.setUpdatedSynchronously(updatedSynchronously);
    };

    TextEditor.prototype.onDidChangeMini = function(callback) {
      return this.emitter.on('did-change-mini', callback);
    };

    TextEditor.prototype.setLineNumberGutterVisible = function(lineNumberGutterVisible) {
      return this.update({
        lineNumberGutterVisible: lineNumberGutterVisible
      });
    };

    TextEditor.prototype.isLineNumberGutterVisible = function() {
      return this.lineNumberGutter.isVisible();
    };

    TextEditor.prototype.onDidChangeLineNumberGutterVisible = function(callback) {
      return this.emitter.on('did-change-line-number-gutter-visible', callback);
    };

    TextEditor.prototype.observeGutters = function(callback) {
      return this.gutterContainer.observeGutters(callback);
    };

    TextEditor.prototype.onDidAddGutter = function(callback) {
      return this.gutterContainer.onDidAddGutter(callback);
    };

    TextEditor.prototype.onDidRemoveGutter = function(callback) {
      return this.gutterContainer.onDidRemoveGutter(callback);
    };

    TextEditor.prototype.setEditorWidthInChars = function(editorWidthInChars) {
      return this.update({
        editorWidthInChars: editorWidthInChars
      });
    };

    TextEditor.prototype.getEditorWidthInChars = function() {
      if ((this.width != null) && this.defaultCharWidth > 0) {
        return Math.max(0, Math.floor(this.width / this.defaultCharWidth));
      } else {
        return this.editorWidthInChars;
      }
    };


    /*
    Section: File Details
     */

    TextEditor.prototype.getTitle = function() {
      var ref3;
      return (ref3 = this.getFileName()) != null ? ref3 : 'untitled';
    };

    TextEditor.prototype.getLongTitle = function() {
      var allPathSegments, commonBase, directoryPath, fileName, firstSegment, l, len, len1, m, ourPathSegments, pathSegments, ref3, textEditor;
      if (this.getPath()) {
        fileName = this.getFileName();
        allPathSegments = [];
        ref3 = atom.workspace.getTextEditors();
        for (l = 0, len = ref3.length; l < len; l++) {
          textEditor = ref3[l];
          if (textEditor !== this) {
            if (textEditor.getFileName() === fileName) {
              directoryPath = fs.tildify(textEditor.getDirectoryPath());
              allPathSegments.push(directoryPath.split(path.sep));
            }
          }
        }
        if (allPathSegments.length === 0) {
          return fileName;
        }
        ourPathSegments = fs.tildify(this.getDirectoryPath()).split(path.sep);
        allPathSegments.push(ourPathSegments);
        while (true) {
          firstSegment = ourPathSegments[0];
          commonBase = _.all(allPathSegments, function(pathSegments) {
            return pathSegments.length > 1 && pathSegments[0] === firstSegment;
          });
          if (commonBase) {
            for (m = 0, len1 = allPathSegments.length; m < len1; m++) {
              pathSegments = allPathSegments[m];
              pathSegments.shift();
            }
          } else {
            break;
          }
        }
        return fileName + " \u2014 " + (path.join.apply(path, pathSegments));
      } else {
        return 'untitled';
      }
    };

    TextEditor.prototype.getPath = function() {
      return this.buffer.getPath();
    };

    TextEditor.prototype.getFileName = function() {
      var fullPath;
      if (fullPath = this.getPath()) {
        return path.basename(fullPath);
      } else {
        return null;
      }
    };

    TextEditor.prototype.getDirectoryPath = function() {
      var fullPath;
      if (fullPath = this.getPath()) {
        return path.dirname(fullPath);
      } else {
        return null;
      }
    };

    TextEditor.prototype.getEncoding = function() {
      return this.buffer.getEncoding();
    };

    TextEditor.prototype.setEncoding = function(encoding) {
      return this.buffer.setEncoding(encoding);
    };

    TextEditor.prototype.isModified = function() {
      return this.buffer.isModified();
    };

    TextEditor.prototype.isEmpty = function() {
      return this.buffer.isEmpty();
    };


    /*
    Section: File Operations
     */

    TextEditor.prototype.save = function() {
      return this.buffer.save();
    };

    TextEditor.prototype.saveAs = function(filePath) {
      return this.buffer.saveAs(filePath);
    };

    TextEditor.prototype.shouldPromptToSave = function(arg) {
      var projectHasPaths, ref3, windowCloseRequested;
      ref3 = arg != null ? arg : {}, windowCloseRequested = ref3.windowCloseRequested, projectHasPaths = ref3.projectHasPaths;
      if (windowCloseRequested && projectHasPaths && atom.stateStore.isConnected()) {
        return false;
      } else {
        return this.isModified() && !this.buffer.hasMultipleEditors();
      }
    };

    TextEditor.prototype.getSaveDialogOptions = function() {
      return {};
    };


    /*
    Section: Reading Text
     */

    TextEditor.prototype.getText = function() {
      return this.buffer.getText();
    };

    TextEditor.prototype.getTextInBufferRange = function(range) {
      return this.buffer.getTextInRange(range);
    };

    TextEditor.prototype.getLineCount = function() {
      return this.buffer.getLineCount();
    };

    TextEditor.prototype.getScreenLineCount = function() {
      return this.displayLayer.getScreenLineCount();
    };

    TextEditor.prototype.getApproximateScreenLineCount = function() {
      return this.displayLayer.getApproximateScreenLineCount();
    };

    TextEditor.prototype.getLastBufferRow = function() {
      return this.buffer.getLastRow();
    };

    TextEditor.prototype.getLastScreenRow = function() {
      return this.getScreenLineCount() - 1;
    };

    TextEditor.prototype.lineTextForBufferRow = function(bufferRow) {
      return this.buffer.lineForRow(bufferRow);
    };

    TextEditor.prototype.lineTextForScreenRow = function(screenRow) {
      var ref3;
      return (ref3 = this.screenLineForScreenRow(screenRow)) != null ? ref3.lineText : void 0;
    };

    TextEditor.prototype.logScreenLines = function(start, end) {
      var l, line, ref3, ref4, row;
      if (start == null) {
        start = 0;
      }
      if (end == null) {
        end = this.getLastScreenRow();
      }
      for (row = l = ref3 = start, ref4 = end; ref3 <= ref4 ? l <= ref4 : l >= ref4; row = ref3 <= ref4 ? ++l : --l) {
        line = this.lineTextForScreenRow(row);
        console.log(row, this.bufferRowForScreenRow(row), line, line.length);
      }
    };

    TextEditor.prototype.tokensForScreenRow = function(screenRow) {
      var currentTokenScopes, l, len, lineText, lineTextIndex, ref3, tagCode, tagCodes, tokens;
      tokens = [];
      lineTextIndex = 0;
      currentTokenScopes = [];
      ref3 = this.screenLineForScreenRow(screenRow), lineText = ref3.lineText, tagCodes = ref3.tagCodes;
      for (l = 0, len = tagCodes.length; l < len; l++) {
        tagCode = tagCodes[l];
        if (this.displayLayer.isOpenTagCode(tagCode)) {
          currentTokenScopes.push(this.displayLayer.tagForCode(tagCode));
        } else if (this.displayLayer.isCloseTagCode(tagCode)) {
          currentTokenScopes.pop();
        } else {
          tokens.push({
            text: lineText.substr(lineTextIndex, tagCode),
            scopes: currentTokenScopes.slice()
          });
          lineTextIndex += tagCode;
        }
      }
      return tokens;
    };

    TextEditor.prototype.screenLineForScreenRow = function(screenRow) {
      return this.displayLayer.getScreenLines(screenRow, screenRow + 1)[0];
    };

    TextEditor.prototype.bufferRowForScreenRow = function(screenRow) {
      return this.displayLayer.translateScreenPosition(Point(screenRow, 0)).row;
    };

    TextEditor.prototype.bufferRowsForScreenRows = function(startScreenRow, endScreenRow) {
      var l, ref3, ref4, results, screenRow;
      results = [];
      for (screenRow = l = ref3 = startScreenRow, ref4 = endScreenRow; ref3 <= ref4 ? l <= ref4 : l >= ref4; screenRow = ref3 <= ref4 ? ++l : --l) {
        results.push(this.bufferRowForScreenRow(screenRow));
      }
      return results;
    };

    TextEditor.prototype.screenRowForBufferRow = function(row) {
      return this.displayLayer.translateBufferPosition(Point(row, 0)).row;
    };

    TextEditor.prototype.getRightmostScreenPosition = function() {
      return this.displayLayer.getRightmostScreenPosition();
    };

    TextEditor.prototype.getApproximateRightmostScreenPosition = function() {
      return this.displayLayer.getApproximateRightmostScreenPosition();
    };

    TextEditor.prototype.getMaxScreenLineLength = function() {
      return this.getRightmostScreenPosition().column;
    };

    TextEditor.prototype.getLongestScreenRow = function() {
      return this.getRightmostScreenPosition().row;
    };

    TextEditor.prototype.getApproximateLongestScreenRow = function() {
      return this.getApproximateRightmostScreenPosition().row;
    };

    TextEditor.prototype.lineLengthForScreenRow = function(screenRow) {
      return this.displayLayer.lineLengthForScreenRow(screenRow);
    };

    TextEditor.prototype.bufferRangeForBufferRow = function(row, arg) {
      var includeNewline;
      includeNewline = (arg != null ? arg : {}).includeNewline;
      return this.buffer.rangeForRow(row, includeNewline);
    };

    TextEditor.prototype.getTextInRange = function(range) {
      return this.buffer.getTextInRange(range);
    };

    TextEditor.prototype.isBufferRowBlank = function(bufferRow) {
      return this.buffer.isRowBlank(bufferRow);
    };

    TextEditor.prototype.nextNonBlankBufferRow = function(bufferRow) {
      return this.buffer.nextNonBlankRow(bufferRow);
    };

    TextEditor.prototype.getEofBufferPosition = function() {
      return this.buffer.getEndPosition();
    };

    TextEditor.prototype.getCurrentParagraphBufferRange = function() {
      return this.getLastCursor().getCurrentParagraphBufferRange();
    };


    /*
    Section: Mutating Text
     */

    TextEditor.prototype.setText = function(text) {
      return this.buffer.setText(text);
    };

    TextEditor.prototype.setTextInBufferRange = function(range, text, options) {
      return this.getBuffer().setTextInRange(range, text, options);
    };

    TextEditor.prototype.insertText = function(text, options) {
      var groupingInterval;
      if (options == null) {
        options = {};
      }
      if (!this.emitWillInsertTextEvent(text)) {
        return false;
      }
      groupingInterval = options.groupUndo ? this.undoGroupingInterval : 0;
      if (options.autoIndentNewline == null) {
        options.autoIndentNewline = this.shouldAutoIndent();
      }
      if (options.autoDecreaseIndent == null) {
        options.autoDecreaseIndent = this.shouldAutoIndent();
      }
      return this.mutateSelectedText((function(_this) {
        return function(selection) {
          var didInsertEvent, range;
          range = selection.insertText(text, options);
          didInsertEvent = {
            text: text,
            range: range
          };
          _this.emitter.emit('did-insert-text', didInsertEvent);
          return range;
        };
      })(this), groupingInterval);
    };

    TextEditor.prototype.insertNewline = function(options) {
      return this.insertText('\n', options);
    };

    TextEditor.prototype["delete"] = function() {
      return this.mutateSelectedText(function(selection) {
        return selection["delete"]();
      });
    };

    TextEditor.prototype.backspace = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.backspace();
      });
    };

    TextEditor.prototype.mutateSelectedText = function(fn, groupingInterval) {
      if (groupingInterval == null) {
        groupingInterval = 0;
      }
      return this.mergeIntersectingSelections((function(_this) {
        return function() {
          return _this.transact(groupingInterval, function() {
            var index, l, len, ref3, results, selection;
            ref3 = _this.getSelectionsOrderedByBufferPosition();
            results = [];
            for (index = l = 0, len = ref3.length; l < len; index = ++l) {
              selection = ref3[index];
              results.push(fn(selection, index));
            }
            return results;
          });
        };
      })(this));
    };

    TextEditor.prototype.moveLineUp = function() {
      var selections;
      selections = this.getSelectedBufferRanges().sort(function(a, b) {
        return a.compare(b);
      });
      if (selections[0].start.row === 0) {
        return;
      }
      if (selections[selections.length - 1].start.row === this.getLastBufferRow() && this.buffer.getLastLine() === '') {
        return;
      }
      return this.transact((function(_this) {
        return function() {
          var endRow, insertDelta, l, len, len1, lines, linesRange, m, newSelectionRanges, precedingRow, rangeToRefold, rangesToRefold, ref3, selection, selectionsToMove, startRow;
          newSelectionRanges = [];
          while (selections.length > 0) {
            selection = selections.shift();
            selectionsToMove = [selection];
            while (selection.end.row === ((ref3 = selections[0]) != null ? ref3.start.row : void 0)) {
              selectionsToMove.push(selections[0]);
              selection.end.row = selections[0].end.row;
              selections.shift();
            }
            startRow = selection.start.row;
            endRow = selection.end.row;
            if (selection.end.row > selection.start.row && selection.end.column === 0) {
              endRow--;
            }
            startRow = _this.displayLayer.findBoundaryPrecedingBufferRow(startRow);
            endRow = _this.displayLayer.findBoundaryFollowingBufferRow(endRow + 1);
            linesRange = new Range(Point(startRow, 0), Point(endRow, 0));
            precedingRow = _this.displayLayer.findBoundaryPrecedingBufferRow(startRow - 1);
            insertDelta = linesRange.start.row - precedingRow;
            rangesToRefold = _this.displayLayer.destroyFoldsIntersectingBufferRange(linesRange).map(function(range) {
              return range.translate([-insertDelta, 0]);
            });
            lines = _this.buffer.getTextInRange(linesRange);
            if (lines[lines.length - 1] !== '\n') {
              lines += _this.buffer.lineEndingForRow(linesRange.end.row - 2);
            }
            _this.buffer["delete"](linesRange);
            _this.buffer.insert([precedingRow, 0], lines);
            for (l = 0, len = rangesToRefold.length; l < len; l++) {
              rangeToRefold = rangesToRefold[l];
              _this.displayLayer.foldBufferRange(rangeToRefold);
            }
            for (m = 0, len1 = selectionsToMove.length; m < len1; m++) {
              selection = selectionsToMove[m];
              newSelectionRanges.push(selection.translate([-insertDelta, 0]));
            }
          }
          _this.setSelectedBufferRanges(newSelectionRanges, {
            autoscroll: false,
            preserveFolds: true
          });
          if (_this.shouldAutoIndent()) {
            _this.autoIndentSelectedRows();
          }
          return _this.scrollToBufferPosition([newSelectionRanges[0].start.row, 0]);
        };
      })(this));
    };

    TextEditor.prototype.moveLineDown = function() {
      var selections;
      selections = this.getSelectedBufferRanges();
      selections.sort(function(a, b) {
        return a.compare(b);
      });
      selections = selections.reverse();
      return this.transact((function(_this) {
        return function() {
          var endRow, followingRow, insertDelta, l, len, len1, lines, linesRange, m, newSelectionRanges, rangeToRefold, rangesToRefold, ref3, selection, selectionsToMove, startRow;
          _this.consolidateSelections();
          newSelectionRanges = [];
          while (selections.length > 0) {
            selection = selections.shift();
            selectionsToMove = [selection];
            while (selection.start.row === ((ref3 = selections[0]) != null ? ref3.end.row : void 0)) {
              selectionsToMove.push(selections[0]);
              selection.start.row = selections[0].start.row;
              selections.shift();
            }
            startRow = selection.start.row;
            endRow = selection.end.row;
            if (selection.end.row > selection.start.row && selection.end.column === 0) {
              endRow--;
            }
            startRow = _this.displayLayer.findBoundaryPrecedingBufferRow(startRow);
            endRow = _this.displayLayer.findBoundaryFollowingBufferRow(endRow + 1);
            linesRange = new Range(Point(startRow, 0), Point(endRow, 0));
            followingRow = Math.min(_this.buffer.getLineCount(), _this.displayLayer.findBoundaryFollowingBufferRow(endRow + 1));
            insertDelta = followingRow - linesRange.end.row;
            rangesToRefold = _this.displayLayer.destroyFoldsIntersectingBufferRange(linesRange).map(function(range) {
              return range.translate([insertDelta, 0]);
            });
            lines = _this.buffer.getTextInRange(linesRange);
            if (followingRow - 1 === _this.buffer.getLastRow()) {
              lines = "\n" + lines;
            }
            _this.buffer.insert([followingRow, 0], lines);
            _this.buffer["delete"](linesRange);
            for (l = 0, len = rangesToRefold.length; l < len; l++) {
              rangeToRefold = rangesToRefold[l];
              _this.displayLayer.foldBufferRange(rangeToRefold);
            }
            for (m = 0, len1 = selectionsToMove.length; m < len1; m++) {
              selection = selectionsToMove[m];
              newSelectionRanges.push(selection.translate([insertDelta, 0]));
            }
          }
          _this.setSelectedBufferRanges(newSelectionRanges, {
            autoscroll: false,
            preserveFolds: true
          });
          if (_this.shouldAutoIndent()) {
            _this.autoIndentSelectedRows();
          }
          return _this.scrollToBufferPosition([newSelectionRanges[0].start.row - 1, 0]);
        };
      })(this));
    };

    TextEditor.prototype.moveSelectionLeft = function() {
      var noSelectionAtStartOfLine, selections, translatedRanges, translationDelta;
      selections = this.getSelectedBufferRanges();
      noSelectionAtStartOfLine = selections.every(function(selection) {
        return selection.start.column !== 0;
      });
      translationDelta = [0, -1];
      translatedRanges = [];
      if (noSelectionAtStartOfLine) {
        return this.transact((function(_this) {
          return function() {
            var charTextToLeftOfSelection, charToLeftOfSelection, l, len, selection;
            for (l = 0, len = selections.length; l < len; l++) {
              selection = selections[l];
              charToLeftOfSelection = new Range(selection.start.translate(translationDelta), selection.start);
              charTextToLeftOfSelection = _this.buffer.getTextInRange(charToLeftOfSelection);
              _this.buffer.insert(selection.end, charTextToLeftOfSelection);
              _this.buffer["delete"](charToLeftOfSelection);
              translatedRanges.push(selection.translate(translationDelta));
            }
            return _this.setSelectedBufferRanges(translatedRanges);
          };
        })(this));
      }
    };

    TextEditor.prototype.moveSelectionRight = function() {
      var noSelectionAtEndOfLine, selections, translatedRanges, translationDelta;
      selections = this.getSelectedBufferRanges();
      noSelectionAtEndOfLine = selections.every((function(_this) {
        return function(selection) {
          return selection.end.column !== _this.buffer.lineLengthForRow(selection.end.row);
        };
      })(this));
      translationDelta = [0, 1];
      translatedRanges = [];
      if (noSelectionAtEndOfLine) {
        return this.transact((function(_this) {
          return function() {
            var charTextToRightOfSelection, charToRightOfSelection, l, len, selection;
            for (l = 0, len = selections.length; l < len; l++) {
              selection = selections[l];
              charToRightOfSelection = new Range(selection.end, selection.end.translate(translationDelta));
              charTextToRightOfSelection = _this.buffer.getTextInRange(charToRightOfSelection);
              _this.buffer["delete"](charToRightOfSelection);
              _this.buffer.insert(selection.start, charTextToRightOfSelection);
              translatedRanges.push(selection.translate(translationDelta));
            }
            return _this.setSelectedBufferRanges(translatedRanges);
          };
        })(this));
      }
    };

    TextEditor.prototype.duplicateLines = function() {
      return this.transact((function(_this) {
        return function() {
          var endRow, fold, foldRange, i, insertedRowCount, intersectingFolds, j, k, l, len, m, previousSelectionEndRow, previousSelectionRanges, previousSelectionStartRow, ref3, ref4, ref5, ref6, results, selections, start, startRow, textToDuplicate;
          selections = _this.getSelectionsOrderedByBufferPosition();
          previousSelectionRanges = [];
          i = selections.length - 1;
          results = [];
          while (i >= 0) {
            j = i;
            previousSelectionRanges[i] = selections[i].getBufferRange();
            if (selections[i].isEmpty()) {
              start = selections[i].getScreenRange().start;
              selections[i].setScreenRange([[start.row, 0], [start.row + 1, 0]], {
                preserveFolds: true
              });
            }
            ref3 = selections[i].getBufferRowRange(), startRow = ref3[0], endRow = ref3[1];
            endRow++;
            while (i > 0) {
              ref4 = selections[i - 1].getBufferRowRange(), previousSelectionStartRow = ref4[0], previousSelectionEndRow = ref4[1];
              if (previousSelectionEndRow === startRow) {
                startRow = previousSelectionStartRow;
                previousSelectionRanges[i - 1] = selections[i - 1].getBufferRange();
                i--;
              } else {
                break;
              }
            }
            intersectingFolds = _this.displayLayer.foldsIntersectingBufferRange([[startRow, 0], [endRow, 0]]);
            textToDuplicate = _this.getTextInBufferRange([[startRow, 0], [endRow, 0]]);
            if (endRow > _this.getLastBufferRow()) {
              textToDuplicate = '\n' + textToDuplicate;
            }
            _this.buffer.insert([endRow, 0], textToDuplicate);
            insertedRowCount = endRow - startRow;
            for (k = l = ref5 = i, ref6 = j; l <= ref6; k = l += 1) {
              selections[k].setBufferRange(previousSelectionRanges[k].translate([insertedRowCount, 0]));
            }
            for (m = 0, len = intersectingFolds.length; m < len; m++) {
              fold = intersectingFolds[m];
              foldRange = _this.displayLayer.bufferRangeForFold(fold);
              _this.displayLayer.foldBufferRange(foldRange.translate([insertedRowCount, 0]));
            }
            results.push(i--);
          }
          return results;
        };
      })(this));
    };

    TextEditor.prototype.replaceSelectedText = function(options, fn) {
      var selectWordIfEmpty;
      if (options == null) {
        options = {};
      }
      selectWordIfEmpty = options.selectWordIfEmpty;
      return this.mutateSelectedText(function(selection) {
        var range, text;
        selection.getBufferRange();
        if (selectWordIfEmpty && selection.isEmpty()) {
          selection.selectWord();
        }
        text = selection.getText();
        selection.deleteSelectedText();
        range = selection.insertText(fn(text));
        return selection.setBufferRange(range);
      });
    };

    TextEditor.prototype.splitSelectionsIntoLines = function() {
      return this.mergeIntersectingSelections((function(_this) {
        return function() {
          var end, l, len, range, ref3, row, selection, start;
          ref3 = _this.getSelections();
          for (l = 0, len = ref3.length; l < len; l++) {
            selection = ref3[l];
            range = selection.getBufferRange();
            if (range.isSingleLine()) {
              continue;
            }
            start = range.start, end = range.end;
            _this.addSelectionForBufferRange([start, [start.row, 2e308]]);
            row = start.row;
            while (++row < end.row) {
              _this.addSelectionForBufferRange([[row, 0], [row, 2e308]]);
            }
            if (end.column !== 0) {
              _this.addSelectionForBufferRange([[end.row, 0], [end.row, end.column]]);
            }
            selection.destroy();
          }
        };
      })(this));
    };

    TextEditor.prototype.transpose = function() {
      return this.mutateSelectedText(function(selection) {
        var text;
        if (selection.isEmpty()) {
          selection.selectRight();
          text = selection.getText();
          selection["delete"]();
          selection.cursor.moveLeft();
          return selection.insertText(text);
        } else {
          return selection.insertText(selection.getText().split('').reverse().join(''));
        }
      });
    };

    TextEditor.prototype.upperCase = function() {
      return this.replaceSelectedText({
        selectWordIfEmpty: true
      }, function(text) {
        return text.toUpperCase();
      });
    };

    TextEditor.prototype.lowerCase = function() {
      return this.replaceSelectedText({
        selectWordIfEmpty: true
      }, function(text) {
        return text.toLowerCase();
      });
    };

    TextEditor.prototype.toggleLineCommentsInSelection = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.toggleLineComments();
      });
    };

    TextEditor.prototype.joinLines = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.joinLines();
      });
    };

    TextEditor.prototype.insertNewlineBelow = function() {
      return this.transact((function(_this) {
        return function() {
          _this.moveToEndOfLine();
          return _this.insertNewline();
        };
      })(this));
    };

    TextEditor.prototype.insertNewlineAbove = function() {
      return this.transact((function(_this) {
        return function() {
          var bufferRow, indentLevel, onFirstLine;
          bufferRow = _this.getCursorBufferPosition().row;
          indentLevel = _this.indentationForBufferRow(bufferRow);
          onFirstLine = bufferRow === 0;
          _this.moveToBeginningOfLine();
          _this.moveLeft();
          _this.insertNewline();
          if (_this.shouldAutoIndent() && _this.indentationForBufferRow(bufferRow) < indentLevel) {
            _this.setIndentationForBufferRow(bufferRow, indentLevel);
          }
          if (onFirstLine) {
            _this.moveUp();
            return _this.moveToEndOfLine();
          }
        };
      })(this));
    };

    TextEditor.prototype.deleteToBeginningOfWord = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToBeginningOfWord();
      });
    };

    TextEditor.prototype.deleteToPreviousWordBoundary = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToPreviousWordBoundary();
      });
    };

    TextEditor.prototype.deleteToNextWordBoundary = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToNextWordBoundary();
      });
    };

    TextEditor.prototype.deleteToBeginningOfSubword = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToBeginningOfSubword();
      });
    };

    TextEditor.prototype.deleteToEndOfSubword = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToEndOfSubword();
      });
    };

    TextEditor.prototype.deleteToBeginningOfLine = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToBeginningOfLine();
      });
    };

    TextEditor.prototype.deleteToEndOfLine = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToEndOfLine();
      });
    };

    TextEditor.prototype.deleteToEndOfWord = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.deleteToEndOfWord();
      });
    };

    TextEditor.prototype.deleteLine = function() {
      this.mergeSelectionsOnSameRows();
      return this.mutateSelectedText(function(selection) {
        return selection.deleteLine();
      });
    };


    /*
    Section: History
     */

    TextEditor.prototype.undo = function() {
      this.avoidMergingSelections((function(_this) {
        return function() {
          return _this.buffer.undo();
        };
      })(this));
      return this.getLastSelection().autoscroll();
    };

    TextEditor.prototype.redo = function() {
      this.avoidMergingSelections((function(_this) {
        return function() {
          return _this.buffer.redo();
        };
      })(this));
      return this.getLastSelection().autoscroll();
    };

    TextEditor.prototype.transact = function(groupingInterval, fn) {
      return this.buffer.transact(groupingInterval, fn);
    };

    TextEditor.prototype.beginTransaction = function(groupingInterval) {
      Grim.deprecate('Transactions should be performed via TextEditor::transact only');
      return this.buffer.beginTransaction(groupingInterval);
    };

    TextEditor.prototype.commitTransaction = function() {
      Grim.deprecate('Transactions should be performed via TextEditor::transact only');
      return this.buffer.commitTransaction();
    };

    TextEditor.prototype.abortTransaction = function() {
      return this.buffer.abortTransaction();
    };

    TextEditor.prototype.createCheckpoint = function() {
      return this.buffer.createCheckpoint();
    };

    TextEditor.prototype.revertToCheckpoint = function(checkpoint) {
      return this.buffer.revertToCheckpoint(checkpoint);
    };

    TextEditor.prototype.groupChangesSinceCheckpoint = function(checkpoint) {
      return this.buffer.groupChangesSinceCheckpoint(checkpoint);
    };


    /*
    Section: TextEditor Coordinates
     */

    TextEditor.prototype.screenPositionForBufferPosition = function(bufferPosition, options) {
      if ((options != null ? options.clip : void 0) != null) {
        Grim.deprecate("The `clip` parameter has been deprecated and will be removed soon. Please, use `clipDirection` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.clip;
        }
      }
      if ((options != null ? options.wrapAtSoftNewlines : void 0) != null) {
        Grim.deprecate("The `wrapAtSoftNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapAtSoftNewlines ? 'forward' : 'backward';
        }
      }
      if ((options != null ? options.wrapBeyondNewlines : void 0) != null) {
        Grim.deprecate("The `wrapBeyondNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapBeyondNewlines ? 'forward' : 'backward';
        }
      }
      return this.displayLayer.translateBufferPosition(bufferPosition, options);
    };

    TextEditor.prototype.bufferPositionForScreenPosition = function(screenPosition, options) {
      if ((options != null ? options.clip : void 0) != null) {
        Grim.deprecate("The `clip` parameter has been deprecated and will be removed soon. Please, use `clipDirection` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.clip;
        }
      }
      if ((options != null ? options.wrapAtSoftNewlines : void 0) != null) {
        Grim.deprecate("The `wrapAtSoftNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapAtSoftNewlines ? 'forward' : 'backward';
        }
      }
      if ((options != null ? options.wrapBeyondNewlines : void 0) != null) {
        Grim.deprecate("The `wrapBeyondNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapBeyondNewlines ? 'forward' : 'backward';
        }
      }
      return this.displayLayer.translateScreenPosition(screenPosition, options);
    };

    TextEditor.prototype.screenRangeForBufferRange = function(bufferRange, options) {
      var end, start;
      bufferRange = Range.fromObject(bufferRange);
      start = this.screenPositionForBufferPosition(bufferRange.start, options);
      end = this.screenPositionForBufferPosition(bufferRange.end, options);
      return new Range(start, end);
    };

    TextEditor.prototype.bufferRangeForScreenRange = function(screenRange) {
      var end, start;
      screenRange = Range.fromObject(screenRange);
      start = this.bufferPositionForScreenPosition(screenRange.start);
      end = this.bufferPositionForScreenPosition(screenRange.end);
      return new Range(start, end);
    };

    TextEditor.prototype.clipBufferPosition = function(bufferPosition) {
      return this.buffer.clipPosition(bufferPosition);
    };

    TextEditor.prototype.clipBufferRange = function(range) {
      return this.buffer.clipRange(range);
    };

    TextEditor.prototype.clipScreenPosition = function(screenPosition, options) {
      if ((options != null ? options.clip : void 0) != null) {
        Grim.deprecate("The `clip` parameter has been deprecated and will be removed soon. Please, use `clipDirection` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.clip;
        }
      }
      if ((options != null ? options.wrapAtSoftNewlines : void 0) != null) {
        Grim.deprecate("The `wrapAtSoftNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapAtSoftNewlines ? 'forward' : 'backward';
        }
      }
      if ((options != null ? options.wrapBeyondNewlines : void 0) != null) {
        Grim.deprecate("The `wrapBeyondNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapBeyondNewlines ? 'forward' : 'backward';
        }
      }
      return this.displayLayer.clipScreenPosition(screenPosition, options);
    };

    TextEditor.prototype.clipScreenRange = function(screenRange, options) {
      var end, start;
      screenRange = Range.fromObject(screenRange);
      start = this.displayLayer.clipScreenPosition(screenRange.start, options);
      end = this.displayLayer.clipScreenPosition(screenRange.end, options);
      return Range(start, end);
    };


    /*
    Section: Decorations
     */

    TextEditor.prototype.decorateMarker = function(marker, decorationParams) {
      return this.decorationManager.decorateMarker(marker, decorationParams);
    };

    TextEditor.prototype.decorateMarkerLayer = function(markerLayer, decorationParams) {
      return this.decorationManager.decorateMarkerLayer(markerLayer, decorationParams);
    };

    TextEditor.prototype.decorationsForScreenRowRange = function(startScreenRow, endScreenRow) {
      return this.decorationManager.decorationsForScreenRowRange(startScreenRow, endScreenRow);
    };

    TextEditor.prototype.decorationsStateForScreenRowRange = function(startScreenRow, endScreenRow) {
      return this.decorationManager.decorationsStateForScreenRowRange(startScreenRow, endScreenRow);
    };

    TextEditor.prototype.getDecorations = function(propertyFilter) {
      return this.decorationManager.getDecorations(propertyFilter);
    };

    TextEditor.prototype.getLineDecorations = function(propertyFilter) {
      return this.decorationManager.getLineDecorations(propertyFilter);
    };

    TextEditor.prototype.getLineNumberDecorations = function(propertyFilter) {
      return this.decorationManager.getLineNumberDecorations(propertyFilter);
    };

    TextEditor.prototype.getHighlightDecorations = function(propertyFilter) {
      return this.decorationManager.getHighlightDecorations(propertyFilter);
    };

    TextEditor.prototype.getOverlayDecorations = function(propertyFilter) {
      return this.decorationManager.getOverlayDecorations(propertyFilter);
    };

    TextEditor.prototype.decorationForId = function(id) {
      return this.decorationManager.decorationForId(id);
    };

    TextEditor.prototype.decorationsForMarkerId = function(id) {
      return this.decorationManager.decorationsForMarkerId(id);
    };


    /*
    Section: Markers
     */

    TextEditor.prototype.markBufferRange = function(bufferRange, options) {
      return this.defaultMarkerLayer.markBufferRange(bufferRange, options);
    };

    TextEditor.prototype.markScreenRange = function(screenRange, options) {
      return this.defaultMarkerLayer.markScreenRange(screenRange, options);
    };

    TextEditor.prototype.markBufferPosition = function(bufferPosition, options) {
      return this.defaultMarkerLayer.markBufferPosition(bufferPosition, options);
    };

    TextEditor.prototype.markScreenPosition = function(screenPosition, options) {
      return this.defaultMarkerLayer.markScreenPosition(screenPosition, options);
    };

    TextEditor.prototype.findMarkers = function(params) {
      return this.defaultMarkerLayer.findMarkers(params);
    };

    TextEditor.prototype.getMarker = function(id) {
      return this.defaultMarkerLayer.getMarker(id);
    };

    TextEditor.prototype.getMarkers = function() {
      return this.defaultMarkerLayer.getMarkers();
    };

    TextEditor.prototype.getMarkerCount = function() {
      return this.defaultMarkerLayer.getMarkerCount();
    };

    TextEditor.prototype.destroyMarker = function(id) {
      var ref3;
      return (ref3 = this.getMarker(id)) != null ? ref3.destroy() : void 0;
    };

    TextEditor.prototype.addMarkerLayer = function(options) {
      return this.displayLayer.addMarkerLayer(options);
    };

    TextEditor.prototype.getMarkerLayer = function(id) {
      return this.displayLayer.getMarkerLayer(id);
    };

    TextEditor.prototype.getDefaultMarkerLayer = function() {
      return this.defaultMarkerLayer;
    };


    /*
    Section: Cursors
     */

    TextEditor.prototype.getCursorBufferPosition = function() {
      return this.getLastCursor().getBufferPosition();
    };

    TextEditor.prototype.getCursorBufferPositions = function() {
      var cursor, l, len, ref3, results;
      ref3 = this.getCursors();
      results = [];
      for (l = 0, len = ref3.length; l < len; l++) {
        cursor = ref3[l];
        results.push(cursor.getBufferPosition());
      }
      return results;
    };

    TextEditor.prototype.setCursorBufferPosition = function(position, options) {
      return this.moveCursors(function(cursor) {
        return cursor.setBufferPosition(position, options);
      });
    };

    TextEditor.prototype.getCursorAtScreenPosition = function(position) {
      var cursor, l, len, ref3;
      ref3 = this.cursors;
      for (l = 0, len = ref3.length; l < len; l++) {
        cursor = ref3[l];
        if (cursor.getScreenPosition().isEqual(position)) {
          return cursor;
        }
      }
      return void 0;
    };

    TextEditor.prototype.getCursorScreenPosition = function() {
      return this.getLastCursor().getScreenPosition();
    };

    TextEditor.prototype.getCursorScreenPositions = function() {
      var cursor, l, len, ref3, results;
      ref3 = this.getCursors();
      results = [];
      for (l = 0, len = ref3.length; l < len; l++) {
        cursor = ref3[l];
        results.push(cursor.getScreenPosition());
      }
      return results;
    };

    TextEditor.prototype.setCursorScreenPosition = function(position, options) {
      if ((options != null ? options.clip : void 0) != null) {
        Grim.deprecate("The `clip` parameter has been deprecated and will be removed soon. Please, use `clipDirection` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.clip;
        }
      }
      if ((options != null ? options.wrapAtSoftNewlines : void 0) != null) {
        Grim.deprecate("The `wrapAtSoftNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapAtSoftNewlines ? 'forward' : 'backward';
        }
      }
      if ((options != null ? options.wrapBeyondNewlines : void 0) != null) {
        Grim.deprecate("The `wrapBeyondNewlines` parameter has been deprecated and will be removed soon. Please, use `clipDirection: 'forward'` instead.");
        if (options.clipDirection == null) {
          options.clipDirection = options.wrapBeyondNewlines ? 'forward' : 'backward';
        }
      }
      return this.moveCursors(function(cursor) {
        return cursor.setScreenPosition(position, options);
      });
    };

    TextEditor.prototype.addCursorAtBufferPosition = function(bufferPosition, options) {
      this.selectionsMarkerLayer.markBufferPosition(bufferPosition, {
        invalidate: 'never'
      });
      if ((options != null ? options.autoscroll : void 0) !== false) {
        this.getLastSelection().cursor.autoscroll();
      }
      return this.getLastSelection().cursor;
    };

    TextEditor.prototype.addCursorAtScreenPosition = function(screenPosition, options) {
      this.selectionsMarkerLayer.markScreenPosition(screenPosition, {
        invalidate: 'never'
      });
      if ((options != null ? options.autoscroll : void 0) !== false) {
        this.getLastSelection().cursor.autoscroll();
      }
      return this.getLastSelection().cursor;
    };

    TextEditor.prototype.hasMultipleCursors = function() {
      return this.getCursors().length > 1;
    };

    TextEditor.prototype.moveUp = function(lineCount) {
      return this.moveCursors(function(cursor) {
        return cursor.moveUp(lineCount, {
          moveToEndOfSelection: true
        });
      });
    };

    TextEditor.prototype.moveDown = function(lineCount) {
      return this.moveCursors(function(cursor) {
        return cursor.moveDown(lineCount, {
          moveToEndOfSelection: true
        });
      });
    };

    TextEditor.prototype.moveLeft = function(columnCount) {
      return this.moveCursors(function(cursor) {
        return cursor.moveLeft(columnCount, {
          moveToEndOfSelection: true
        });
      });
    };

    TextEditor.prototype.moveRight = function(columnCount) {
      return this.moveCursors(function(cursor) {
        return cursor.moveRight(columnCount, {
          moveToEndOfSelection: true
        });
      });
    };

    TextEditor.prototype.moveToBeginningOfLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfLine();
      });
    };

    TextEditor.prototype.moveToBeginningOfScreenLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfScreenLine();
      });
    };

    TextEditor.prototype.moveToFirstCharacterOfLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToFirstCharacterOfLine();
      });
    };

    TextEditor.prototype.moveToEndOfLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToEndOfLine();
      });
    };

    TextEditor.prototype.moveToEndOfScreenLine = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToEndOfScreenLine();
      });
    };

    TextEditor.prototype.moveToBeginningOfWord = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfWord();
      });
    };

    TextEditor.prototype.moveToEndOfWord = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToEndOfWord();
      });
    };

    TextEditor.prototype.moveToTop = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToTop();
      });
    };

    TextEditor.prototype.moveToBottom = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBottom();
      });
    };

    TextEditor.prototype.moveToBeginningOfNextWord = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfNextWord();
      });
    };

    TextEditor.prototype.moveToPreviousWordBoundary = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToPreviousWordBoundary();
      });
    };

    TextEditor.prototype.moveToNextWordBoundary = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToNextWordBoundary();
      });
    };

    TextEditor.prototype.moveToPreviousSubwordBoundary = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToPreviousSubwordBoundary();
      });
    };

    TextEditor.prototype.moveToNextSubwordBoundary = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToNextSubwordBoundary();
      });
    };

    TextEditor.prototype.moveToBeginningOfNextParagraph = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfNextParagraph();
      });
    };

    TextEditor.prototype.moveToBeginningOfPreviousParagraph = function() {
      return this.moveCursors(function(cursor) {
        return cursor.moveToBeginningOfPreviousParagraph();
      });
    };

    TextEditor.prototype.getLastCursor = function() {
      this.createLastSelectionIfNeeded();
      return _.last(this.cursors);
    };

    TextEditor.prototype.getWordUnderCursor = function(options) {
      return this.getTextInBufferRange(this.getLastCursor().getCurrentWordBufferRange(options));
    };

    TextEditor.prototype.getCursors = function() {
      this.createLastSelectionIfNeeded();
      return this.cursors.slice();
    };

    TextEditor.prototype.getCursorsOrderedByBufferPosition = function() {
      return this.getCursors().sort(function(a, b) {
        return a.compare(b);
      });
    };

    TextEditor.prototype.cursorsForScreenRowRange = function(startScreenRow, endScreenRow) {
      var cursor, cursors, l, len, marker, ref3;
      cursors = [];
      ref3 = this.selectionsMarkerLayer.findMarkers({
        intersectsScreenRowRange: [startScreenRow, endScreenRow]
      });
      for (l = 0, len = ref3.length; l < len; l++) {
        marker = ref3[l];
        if (cursor = this.cursorsByMarkerId.get(marker.id)) {
          cursors.push(cursor);
        }
      }
      return cursors;
    };

    TextEditor.prototype.addCursor = function(marker) {
      var cursor;
      cursor = new Cursor({
        editor: this,
        marker: marker,
        showCursorOnSelection: this.showCursorOnSelection
      });
      this.cursors.push(cursor);
      this.cursorsByMarkerId.set(marker.id, cursor);
      this.decorateMarker(marker, {
        type: 'line-number',
        "class": 'cursor-line'
      });
      this.decorateMarker(marker, {
        type: 'line-number',
        "class": 'cursor-line-no-selection',
        onlyHead: true,
        onlyEmpty: true
      });
      this.decorateMarker(marker, {
        type: 'line',
        "class": 'cursor-line',
        onlyEmpty: true
      });
      return cursor;
    };

    TextEditor.prototype.moveCursors = function(fn) {
      var cursor, l, len, ref3;
      ref3 = this.getCursors();
      for (l = 0, len = ref3.length; l < len; l++) {
        cursor = ref3[l];
        fn(cursor);
      }
      return this.mergeCursors();
    };

    TextEditor.prototype.cursorMoved = function(event) {
      return this.emitter.emit('did-change-cursor-position', event);
    };

    TextEditor.prototype.mergeCursors = function() {
      var cursor, l, len, position, positions, ref3;
      positions = {};
      ref3 = this.getCursors();
      for (l = 0, len = ref3.length; l < len; l++) {
        cursor = ref3[l];
        position = cursor.getBufferPosition().toString();
        if (positions.hasOwnProperty(position)) {
          cursor.destroy();
        } else {
          positions[position] = true;
        }
      }
    };

    TextEditor.prototype.preserveCursorPositionOnBufferReload = function() {
      var cursorPosition;
      cursorPosition = null;
      this.disposables.add(this.buffer.onWillReload((function(_this) {
        return function() {
          return cursorPosition = _this.getCursorBufferPosition();
        };
      })(this)));
      return this.disposables.add(this.buffer.onDidReload((function(_this) {
        return function() {
          if (cursorPosition) {
            _this.setCursorBufferPosition(cursorPosition);
          }
          return cursorPosition = null;
        };
      })(this)));
    };


    /*
    Section: Selections
     */

    TextEditor.prototype.getSelectedText = function() {
      return this.getLastSelection().getText();
    };

    TextEditor.prototype.getSelectedBufferRange = function() {
      return this.getLastSelection().getBufferRange();
    };

    TextEditor.prototype.getSelectedBufferRanges = function() {
      var l, len, ref3, results, selection;
      ref3 = this.getSelections();
      results = [];
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        results.push(selection.getBufferRange());
      }
      return results;
    };

    TextEditor.prototype.setSelectedBufferRange = function(bufferRange, options) {
      return this.setSelectedBufferRanges([bufferRange], options);
    };

    TextEditor.prototype.setSelectedBufferRanges = function(bufferRanges, options) {
      var l, len, ref3, selection, selections;
      if (options == null) {
        options = {};
      }
      if (!bufferRanges.length) {
        throw new Error("Passed an empty array to setSelectedBufferRanges");
      }
      selections = this.getSelections();
      ref3 = selections.slice(bufferRanges.length);
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        selection.destroy();
      }
      return this.mergeIntersectingSelections(options, (function(_this) {
        return function() {
          var bufferRange, i, len1, m;
          for (i = m = 0, len1 = bufferRanges.length; m < len1; i = ++m) {
            bufferRange = bufferRanges[i];
            bufferRange = Range.fromObject(bufferRange);
            if (selections[i]) {
              selections[i].setBufferRange(bufferRange, options);
            } else {
              _this.addSelectionForBufferRange(bufferRange, options);
            }
          }
        };
      })(this));
    };

    TextEditor.prototype.getSelectedScreenRange = function() {
      return this.getLastSelection().getScreenRange();
    };

    TextEditor.prototype.getSelectedScreenRanges = function() {
      var l, len, ref3, results, selection;
      ref3 = this.getSelections();
      results = [];
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        results.push(selection.getScreenRange());
      }
      return results;
    };

    TextEditor.prototype.setSelectedScreenRange = function(screenRange, options) {
      return this.setSelectedBufferRange(this.bufferRangeForScreenRange(screenRange, options), options);
    };

    TextEditor.prototype.setSelectedScreenRanges = function(screenRanges, options) {
      var l, len, ref3, selection, selections;
      if (options == null) {
        options = {};
      }
      if (!screenRanges.length) {
        throw new Error("Passed an empty array to setSelectedScreenRanges");
      }
      selections = this.getSelections();
      ref3 = selections.slice(screenRanges.length);
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        selection.destroy();
      }
      return this.mergeIntersectingSelections(options, (function(_this) {
        return function() {
          var i, len1, m, screenRange;
          for (i = m = 0, len1 = screenRanges.length; m < len1; i = ++m) {
            screenRange = screenRanges[i];
            screenRange = Range.fromObject(screenRange);
            if (selections[i]) {
              selections[i].setScreenRange(screenRange, options);
            } else {
              _this.addSelectionForScreenRange(screenRange, options);
            }
          }
        };
      })(this));
    };

    TextEditor.prototype.addSelectionForBufferRange = function(bufferRange, options) {
      var ref3;
      if (options == null) {
        options = {};
      }
      if (!options.preserveFolds) {
        this.destroyFoldsIntersectingBufferRange(bufferRange);
      }
      this.selectionsMarkerLayer.markBufferRange(bufferRange, {
        invalidate: 'never',
        reversed: (ref3 = options.reversed) != null ? ref3 : false
      });
      if (options.autoscroll !== false) {
        this.getLastSelection().autoscroll();
      }
      return this.getLastSelection();
    };

    TextEditor.prototype.addSelectionForScreenRange = function(screenRange, options) {
      if (options == null) {
        options = {};
      }
      return this.addSelectionForBufferRange(this.bufferRangeForScreenRange(screenRange), options);
    };

    TextEditor.prototype.selectToBufferPosition = function(position) {
      var lastSelection;
      lastSelection = this.getLastSelection();
      lastSelection.selectToBufferPosition(position);
      return this.mergeIntersectingSelections({
        reversed: lastSelection.isReversed()
      });
    };

    TextEditor.prototype.selectToScreenPosition = function(position, options) {
      var lastSelection;
      lastSelection = this.getLastSelection();
      lastSelection.selectToScreenPosition(position, options);
      if (!(options != null ? options.suppressSelectionMerge : void 0)) {
        return this.mergeIntersectingSelections({
          reversed: lastSelection.isReversed()
        });
      }
    };

    TextEditor.prototype.selectUp = function(rowCount) {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectUp(rowCount);
      });
    };

    TextEditor.prototype.selectDown = function(rowCount) {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectDown(rowCount);
      });
    };

    TextEditor.prototype.selectLeft = function(columnCount) {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectLeft(columnCount);
      });
    };

    TextEditor.prototype.selectRight = function(columnCount) {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectRight(columnCount);
      });
    };

    TextEditor.prototype.selectToTop = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToTop();
      });
    };

    TextEditor.prototype.selectToBottom = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToBottom();
      });
    };

    TextEditor.prototype.selectAll = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectAll();
      });
    };

    TextEditor.prototype.selectToBeginningOfLine = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToBeginningOfLine();
      });
    };

    TextEditor.prototype.selectToFirstCharacterOfLine = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToFirstCharacterOfLine();
      });
    };

    TextEditor.prototype.selectToEndOfLine = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToEndOfLine();
      });
    };

    TextEditor.prototype.selectToBeginningOfWord = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToBeginningOfWord();
      });
    };

    TextEditor.prototype.selectToEndOfWord = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToEndOfWord();
      });
    };

    TextEditor.prototype.selectToPreviousSubwordBoundary = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToPreviousSubwordBoundary();
      });
    };

    TextEditor.prototype.selectToNextSubwordBoundary = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToNextSubwordBoundary();
      });
    };

    TextEditor.prototype.selectLinesContainingCursors = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectLine();
      });
    };

    TextEditor.prototype.selectWordsContainingCursors = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectWord();
      });
    };

    TextEditor.prototype.selectToPreviousWordBoundary = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToPreviousWordBoundary();
      });
    };

    TextEditor.prototype.selectToNextWordBoundary = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToNextWordBoundary();
      });
    };

    TextEditor.prototype.selectToBeginningOfNextWord = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToBeginningOfNextWord();
      });
    };

    TextEditor.prototype.selectToBeginningOfNextParagraph = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.selectToBeginningOfNextParagraph();
      });
    };

    TextEditor.prototype.selectToBeginningOfPreviousParagraph = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.selectToBeginningOfPreviousParagraph();
      });
    };

    TextEditor.prototype.selectMarker = function(marker) {
      var range;
      if (marker.isValid()) {
        range = marker.getBufferRange();
        this.setSelectedBufferRange(range);
        return range;
      }
    };

    TextEditor.prototype.getLastSelection = function() {
      this.createLastSelectionIfNeeded();
      return _.last(this.selections);
    };

    TextEditor.prototype.getSelections = function() {
      this.createLastSelectionIfNeeded();
      return this.selections.slice();
    };

    TextEditor.prototype.getSelectionsOrderedByBufferPosition = function() {
      return this.getSelections().sort(function(a, b) {
        return a.compare(b);
      });
    };

    TextEditor.prototype.selectionIntersectsBufferRange = function(bufferRange) {
      return _.any(this.getSelections(), function(selection) {
        return selection.intersectsBufferRange(bufferRange);
      });
    };

    TextEditor.prototype.addSelectionBelow = function() {
      return this.expandSelectionsForward(function(selection) {
        return selection.addSelectionBelow();
      });
    };

    TextEditor.prototype.addSelectionAbove = function() {
      return this.expandSelectionsBackward(function(selection) {
        return selection.addSelectionAbove();
      });
    };

    TextEditor.prototype.expandSelectionsForward = function(fn) {
      return this.mergeIntersectingSelections((function(_this) {
        return function() {
          var l, len, ref3, selection;
          ref3 = _this.getSelections();
          for (l = 0, len = ref3.length; l < len; l++) {
            selection = ref3[l];
            fn(selection);
          }
        };
      })(this));
    };

    TextEditor.prototype.expandSelectionsBackward = function(fn) {
      return this.mergeIntersectingSelections({
        reversed: true
      }, (function(_this) {
        return function() {
          var l, len, ref3, selection;
          ref3 = _this.getSelections();
          for (l = 0, len = ref3.length; l < len; l++) {
            selection = ref3[l];
            fn(selection);
          }
        };
      })(this));
    };

    TextEditor.prototype.finalizeSelections = function() {
      var l, len, ref3, selection;
      ref3 = this.getSelections();
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        selection.finalize();
      }
    };

    TextEditor.prototype.selectionsForScreenRows = function(startRow, endRow) {
      return this.getSelections().filter(function(selection) {
        return selection.intersectsScreenRowRange(startRow, endRow);
      });
    };

    TextEditor.prototype.mergeIntersectingSelections = function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return this.mergeSelections.apply(this, slice.call(args).concat([function(previousSelection, currentSelection) {
        var exclusive;
        exclusive = !currentSelection.isEmpty() && !previousSelection.isEmpty();
        return previousSelection.intersectsWith(currentSelection, exclusive);
      }]));
    };

    TextEditor.prototype.mergeSelectionsOnSameRows = function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return this.mergeSelections.apply(this, slice.call(args).concat([function(previousSelection, currentSelection) {
        var screenRange;
        screenRange = currentSelection.getScreenRange();
        return previousSelection.intersectsScreenRowRange(screenRange.start.row, screenRange.end.row);
      }]));
    };

    TextEditor.prototype.avoidMergingSelections = function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return this.mergeSelections.apply(this, slice.call(args).concat([function() {
        return false;
      }]));
    };

    TextEditor.prototype.mergeSelections = function() {
      var args, fn, head, mergePredicate, options, reducer, ref3, ref4, result, tail;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      mergePredicate = args.pop();
      if (_.isFunction(_.last(args))) {
        fn = args.pop();
      }
      options = (ref3 = args.pop()) != null ? ref3 : {};
      if (this.suppressSelectionMerging) {
        return typeof fn === "function" ? fn() : void 0;
      }
      if (fn != null) {
        this.suppressSelectionMerging = true;
        result = fn();
        this.suppressSelectionMerging = false;
      }
      reducer = function(disjointSelections, selection) {
        var adjacentSelection;
        adjacentSelection = _.last(disjointSelections);
        if (mergePredicate(adjacentSelection, selection)) {
          adjacentSelection.merge(selection, options);
          return disjointSelections;
        } else {
          return disjointSelections.concat([selection]);
        }
      };
      ref4 = this.getSelectionsOrderedByBufferPosition(), head = ref4[0], tail = 2 <= ref4.length ? slice.call(ref4, 1) : [];
      _.reduce(tail, reducer, [head]);
      if (fn != null) {
        return result;
      }
    };

    TextEditor.prototype.addSelection = function(marker, options) {
      var cursor, l, len, ref3, selection, selectionBufferRange;
      if (options == null) {
        options = {};
      }
      cursor = this.addCursor(marker);
      selection = new Selection(Object.assign({
        editor: this,
        marker: marker,
        cursor: cursor
      }, options));
      this.selections.push(selection);
      selectionBufferRange = selection.getBufferRange();
      this.mergeIntersectingSelections({
        preserveFolds: options.preserveFolds
      });
      if (selection.destroyed) {
        ref3 = this.getSelections();
        for (l = 0, len = ref3.length; l < len; l++) {
          selection = ref3[l];
          if (selection.intersectsBufferRange(selectionBufferRange)) {
            return selection;
          }
        }
      } else {
        this.emitter.emit('did-add-cursor', cursor);
        this.emitter.emit('did-add-selection', selection);
        return selection;
      }
    };

    TextEditor.prototype.removeSelection = function(selection) {
      _.remove(this.cursors, selection.cursor);
      _.remove(this.selections, selection);
      this.cursorsByMarkerId["delete"](selection.cursor.marker.id);
      this.emitter.emit('did-remove-cursor', selection.cursor);
      return this.emitter.emit('did-remove-selection', selection);
    };

    TextEditor.prototype.clearSelections = function(options) {
      this.consolidateSelections();
      return this.getLastSelection().clear(options);
    };

    TextEditor.prototype.consolidateSelections = function() {
      var l, len, ref3, selection, selections;
      selections = this.getSelections();
      if (selections.length > 1) {
        ref3 = selections.slice(1, selections.length);
        for (l = 0, len = ref3.length; l < len; l++) {
          selection = ref3[l];
          selection.destroy();
        }
        selections[0].autoscroll({
          center: true
        });
        return true;
      } else {
        return false;
      }
    };

    TextEditor.prototype.selectionRangeChanged = function(event) {
      return this.emitter.emit('did-change-selection-range', event);
    };

    TextEditor.prototype.createLastSelectionIfNeeded = function() {
      if (this.selections.length === 0) {
        return this.addSelectionForBufferRange([[0, 0], [0, 0]], {
          autoscroll: false,
          preserveFolds: true
        });
      }
    };


    /*
    Section: Searching and Replacing
     */

    TextEditor.prototype.scan = function(regex, options, iterator) {
      if (options == null) {
        options = {};
      }
      if (_.isFunction(options)) {
        iterator = options;
        options = {};
      }
      return this.buffer.scan(regex, options, iterator);
    };

    TextEditor.prototype.scanInBufferRange = function(regex, range, iterator) {
      return this.buffer.scanInRange(regex, range, iterator);
    };

    TextEditor.prototype.backwardsScanInBufferRange = function(regex, range, iterator) {
      return this.buffer.backwardsScanInRange(regex, range, iterator);
    };


    /*
    Section: Tab Behavior
     */

    TextEditor.prototype.getSoftTabs = function() {
      return this.softTabs;
    };

    TextEditor.prototype.setSoftTabs = function(softTabs1) {
      this.softTabs = softTabs1;
      return this.update({
        softTabs: this.softTabs
      });
    };

    TextEditor.prototype.hasAtomicSoftTabs = function() {
      return this.displayLayer.atomicSoftTabs;
    };

    TextEditor.prototype.toggleSoftTabs = function() {
      return this.setSoftTabs(!this.getSoftTabs());
    };

    TextEditor.prototype.getTabLength = function() {
      return this.tokenizedBuffer.getTabLength();
    };

    TextEditor.prototype.setTabLength = function(tabLength) {
      return this.update({
        tabLength: tabLength
      });
    };

    TextEditor.prototype.getInvisibles = function() {
      if (!this.mini && this.showInvisibles && (this.invisibles != null)) {
        return this.invisibles;
      } else {
        return {};
      }
    };

    TextEditor.prototype.doesShowIndentGuide = function() {
      return this.showIndentGuide && !this.mini;
    };

    TextEditor.prototype.getSoftWrapHangingIndentLength = function() {
      return this.displayLayer.softWrapHangingIndent;
    };

    TextEditor.prototype.usesSoftTabs = function() {
      var bufferRow, l, line, ref3, ref4;
      for (bufferRow = l = 0, ref3 = this.buffer.getLastRow(); 0 <= ref3 ? l <= ref3 : l >= ref3; bufferRow = 0 <= ref3 ? ++l : --l) {
        if ((ref4 = this.tokenizedBuffer.tokenizedLines[bufferRow]) != null ? ref4.isComment() : void 0) {
          continue;
        }
        line = this.buffer.lineForRow(bufferRow);
        if (line[0] === ' ') {
          return true;
        }
        if (line[0] === '\t') {
          return false;
        }
      }
      return void 0;
    };

    TextEditor.prototype.getTabText = function() {
      return this.buildIndentString(1);
    };

    TextEditor.prototype.normalizeTabsInBufferRange = function(bufferRange) {
      if (!this.getSoftTabs()) {
        return;
      }
      return this.scanInBufferRange(/\t/g, bufferRange, (function(_this) {
        return function(arg) {
          var replace;
          replace = arg.replace;
          return replace(_this.getTabText());
        };
      })(this));
    };


    /*
    Section: Soft Wrap Behavior
     */

    TextEditor.prototype.isSoftWrapped = function() {
      return this.softWrapped;
    };

    TextEditor.prototype.setSoftWrapped = function(softWrapped) {
      this.update({
        softWrapped: softWrapped
      });
      return this.isSoftWrapped();
    };

    TextEditor.prototype.getPreferredLineLength = function() {
      return this.preferredLineLength;
    };

    TextEditor.prototype.toggleSoftWrapped = function() {
      return this.setSoftWrapped(!this.isSoftWrapped());
    };

    TextEditor.prototype.getSoftWrapColumn = function() {
      if (this.isSoftWrapped() && !this.mini) {
        if (this.softWrapAtPreferredLineLength) {
          return Math.min(this.getEditorWidthInChars(), this.preferredLineLength);
        } else {
          return this.getEditorWidthInChars();
        }
      } else {
        return MAX_SCREEN_LINE_LENGTH;
      }
    };


    /*
    Section: Indentation
     */

    TextEditor.prototype.indentationForBufferRow = function(bufferRow) {
      return this.indentLevelForLine(this.lineTextForBufferRow(bufferRow));
    };

    TextEditor.prototype.setIndentationForBufferRow = function(bufferRow, newLevel, arg) {
      var endColumn, newIndentString, preserveLeadingWhitespace;
      preserveLeadingWhitespace = (arg != null ? arg : {}).preserveLeadingWhitespace;
      if (preserveLeadingWhitespace) {
        endColumn = 0;
      } else {
        endColumn = this.lineTextForBufferRow(bufferRow).match(/^\s*/)[0].length;
      }
      newIndentString = this.buildIndentString(newLevel);
      return this.buffer.setTextInRange([[bufferRow, 0], [bufferRow, endColumn]], newIndentString);
    };

    TextEditor.prototype.indentSelectedRows = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.indentSelectedRows();
      });
    };

    TextEditor.prototype.outdentSelectedRows = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.outdentSelectedRows();
      });
    };

    TextEditor.prototype.indentLevelForLine = function(line) {
      return this.tokenizedBuffer.indentLevelForLine(line);
    };

    TextEditor.prototype.autoIndentSelectedRows = function() {
      return this.mutateSelectedText(function(selection) {
        return selection.autoIndentSelectedRows();
      });
    };

    TextEditor.prototype.indent = function(options) {
      if (options == null) {
        options = {};
      }
      if (options.autoIndent == null) {
        options.autoIndent = this.shouldAutoIndent();
      }
      return this.mutateSelectedText(function(selection) {
        return selection.indent(options);
      });
    };

    TextEditor.prototype.buildIndentString = function(level, column) {
      var excessWhitespace, tabStopViolation;
      if (column == null) {
        column = 0;
      }
      if (this.getSoftTabs()) {
        tabStopViolation = column % this.getTabLength();
        return _.multiplyString(" ", Math.floor(level * this.getTabLength()) - tabStopViolation);
      } else {
        excessWhitespace = _.multiplyString(' ', Math.round((level - Math.floor(level)) * this.getTabLength()));
        return _.multiplyString("\t", Math.floor(level)) + excessWhitespace;
      }
    };


    /*
    Section: Grammars
     */

    TextEditor.prototype.getGrammar = function() {
      return this.tokenizedBuffer.grammar;
    };

    TextEditor.prototype.setGrammar = function(grammar) {
      return this.tokenizedBuffer.setGrammar(grammar);
    };

    TextEditor.prototype.reloadGrammar = function() {
      return this.tokenizedBuffer.reloadGrammar();
    };

    TextEditor.prototype.onDidTokenize = function(callback) {
      return this.tokenizedBuffer.onDidTokenize(callback);
    };


    /*
    Section: Managing Syntax Scopes
     */

    TextEditor.prototype.getRootScopeDescriptor = function() {
      return this.tokenizedBuffer.rootScopeDescriptor;
    };

    TextEditor.prototype.scopeDescriptorForBufferPosition = function(bufferPosition) {
      return this.tokenizedBuffer.scopeDescriptorForPosition(bufferPosition);
    };

    TextEditor.prototype.bufferRangeForScopeAtCursor = function(scopeSelector) {
      return this.bufferRangeForScopeAtPosition(scopeSelector, this.getCursorBufferPosition());
    };

    TextEditor.prototype.bufferRangeForScopeAtPosition = function(scopeSelector, position) {
      return this.tokenizedBuffer.bufferRangeForScopeAtPosition(scopeSelector, position);
    };

    TextEditor.prototype.isBufferRowCommented = function(bufferRow) {
      var match;
      if (match = this.lineTextForBufferRow(bufferRow).match(/\S/)) {
        if (this.commentScopeSelector == null) {
          this.commentScopeSelector = new TextMateScopeSelector('comment.*');
        }
        return this.commentScopeSelector.matches(this.scopeDescriptorForBufferPosition([bufferRow, match.index]).scopes);
      }
    };

    TextEditor.prototype.getCursorScope = function() {
      return this.getLastCursor().getScopeDescriptor();
    };

    TextEditor.prototype.tokenForBufferPosition = function(bufferPosition) {
      return this.tokenizedBuffer.tokenForPosition(bufferPosition);
    };


    /*
    Section: Clipboard Operations
     */

    TextEditor.prototype.copySelectedText = function() {
      var l, len, maintainClipboard, previousRange, ref3, selection;
      maintainClipboard = false;
      ref3 = this.getSelectionsOrderedByBufferPosition();
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        if (selection.isEmpty()) {
          previousRange = selection.getBufferRange();
          selection.selectLine();
          selection.copy(maintainClipboard, true);
          selection.setBufferRange(previousRange);
        } else {
          selection.copy(maintainClipboard, false);
        }
        maintainClipboard = true;
      }
    };

    TextEditor.prototype.copyOnlySelectedText = function() {
      var l, len, maintainClipboard, ref3, selection;
      maintainClipboard = false;
      ref3 = this.getSelectionsOrderedByBufferPosition();
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        if (!selection.isEmpty()) {
          selection.copy(maintainClipboard, false);
          maintainClipboard = true;
        }
      }
    };

    TextEditor.prototype.cutSelectedText = function() {
      var maintainClipboard;
      maintainClipboard = false;
      return this.mutateSelectedText(function(selection) {
        if (selection.isEmpty()) {
          selection.selectLine();
          selection.cut(maintainClipboard, true);
        } else {
          selection.cut(maintainClipboard, false);
        }
        return maintainClipboard = true;
      });
    };

    TextEditor.prototype.pasteText = function(options) {
      var clipboardText, metadata, ref3;
      if (options == null) {
        options = {};
      }
      ref3 = this.constructor.clipboard.readWithMetadata(), clipboardText = ref3.text, metadata = ref3.metadata;
      if (!this.emitWillInsertTextEvent(clipboardText)) {
        return false;
      }
      if (metadata == null) {
        metadata = {};
      }
      options.autoIndent = this.shouldAutoIndentOnPaste();
      return this.mutateSelectedText((function(_this) {
        return function(selection, index) {
          var containsNewlines, cursor, didInsertEvent, fullLine, indentBasis, newPosition, oldPosition, range, ref4, ref5, text;
          if (((ref4 = metadata.selections) != null ? ref4.length : void 0) === _this.getSelections().length) {
            ref5 = metadata.selections[index], text = ref5.text, indentBasis = ref5.indentBasis, fullLine = ref5.fullLine;
          } else {
            indentBasis = metadata.indentBasis, fullLine = metadata.fullLine;
            text = clipboardText;
          }
          delete options.indentBasis;
          cursor = selection.cursor;
          if (indentBasis != null) {
            containsNewlines = text.indexOf('\n') !== -1;
            if (containsNewlines || !cursor.hasPrecedingCharactersOnLine()) {
              if (options.indentBasis == null) {
                options.indentBasis = indentBasis;
              }
            }
          }
          range = null;
          if (fullLine && selection.isEmpty()) {
            oldPosition = selection.getBufferRange().start;
            selection.setBufferRange([[oldPosition.row, 0], [oldPosition.row, 0]]);
            range = selection.insertText(text, options);
            newPosition = oldPosition.translate([1, 0]);
            selection.setBufferRange([newPosition, newPosition]);
          } else {
            range = selection.insertText(text, options);
          }
          didInsertEvent = {
            text: text,
            range: range
          };
          return _this.emitter.emit('did-insert-text', didInsertEvent);
        };
      })(this));
    };

    TextEditor.prototype.cutToEndOfLine = function() {
      var maintainClipboard;
      maintainClipboard = false;
      return this.mutateSelectedText(function(selection) {
        selection.cutToEndOfLine(maintainClipboard);
        return maintainClipboard = true;
      });
    };

    TextEditor.prototype.cutToEndOfBufferLine = function() {
      var maintainClipboard;
      maintainClipboard = false;
      return this.mutateSelectedText(function(selection) {
        selection.cutToEndOfBufferLine(maintainClipboard);
        return maintainClipboard = true;
      });
    };


    /*
    Section: Folds
     */

    TextEditor.prototype.foldCurrentRow = function() {
      var bufferRow;
      bufferRow = this.bufferPositionForScreenPosition(this.getCursorScreenPosition()).row;
      return this.foldBufferRow(bufferRow);
    };

    TextEditor.prototype.unfoldCurrentRow = function() {
      var bufferRow;
      bufferRow = this.bufferPositionForScreenPosition(this.getCursorScreenPosition()).row;
      return this.unfoldBufferRow(bufferRow);
    };

    TextEditor.prototype.foldBufferRow = function(bufferRow) {
      return this.languageMode.foldBufferRow(bufferRow);
    };

    TextEditor.prototype.unfoldBufferRow = function(bufferRow) {
      return this.displayLayer.destroyFoldsIntersectingBufferRange(Range(Point(bufferRow, 0), Point(bufferRow, 2e308)));
    };

    TextEditor.prototype.foldSelectedLines = function() {
      var l, len, ref3, selection;
      ref3 = this.getSelections();
      for (l = 0, len = ref3.length; l < len; l++) {
        selection = ref3[l];
        selection.fold();
      }
    };

    TextEditor.prototype.foldAll = function() {
      return this.languageMode.foldAll();
    };

    TextEditor.prototype.unfoldAll = function() {
      this.languageMode.unfoldAll();
      return this.scrollToCursorPosition();
    };

    TextEditor.prototype.foldAllAtIndentLevel = function(level) {
      return this.languageMode.foldAllAtIndentLevel(level);
    };

    TextEditor.prototype.isFoldableAtBufferRow = function(bufferRow) {
      return this.tokenizedBuffer.isFoldableAtRow(bufferRow);
    };

    TextEditor.prototype.isFoldableAtScreenRow = function(screenRow) {
      return this.isFoldableAtBufferRow(this.bufferRowForScreenRow(screenRow));
    };

    TextEditor.prototype.toggleFoldAtBufferRow = function(bufferRow) {
      if (this.isFoldedAtBufferRow(bufferRow)) {
        return this.unfoldBufferRow(bufferRow);
      } else {
        return this.foldBufferRow(bufferRow);
      }
    };

    TextEditor.prototype.isFoldedAtCursorRow = function() {
      return this.isFoldedAtScreenRow(this.getCursorScreenPosition().row);
    };

    TextEditor.prototype.isFoldedAtBufferRow = function(bufferRow) {
      return this.displayLayer.foldsIntersectingBufferRange(Range(Point(bufferRow, 0), Point(bufferRow, 2e308))).length > 0;
    };

    TextEditor.prototype.isFoldedAtScreenRow = function(screenRow) {
      return this.isFoldedAtBufferRow(this.bufferRowForScreenRow(screenRow));
    };

    TextEditor.prototype.foldBufferRowRange = function(startRow, endRow) {
      return this.foldBufferRange(Range(Point(startRow, 2e308), Point(endRow, 2e308)));
    };

    TextEditor.prototype.foldBufferRange = function(range) {
      return this.displayLayer.foldBufferRange(range);
    };

    TextEditor.prototype.destroyFoldsIntersectingBufferRange = function(bufferRange) {
      return this.displayLayer.destroyFoldsIntersectingBufferRange(bufferRange);
    };


    /*
    Section: Gutters
     */

    TextEditor.prototype.addGutter = function(options) {
      return this.gutterContainer.addGutter(options);
    };

    TextEditor.prototype.getGutters = function() {
      return this.gutterContainer.getGutters();
    };

    TextEditor.prototype.gutterWithName = function(name) {
      return this.gutterContainer.gutterWithName(name);
    };


    /*
    Section: Scrolling the TextEditor
     */

    TextEditor.prototype.scrollToCursorPosition = function(options) {
      var ref3;
      return this.getLastCursor().autoscroll({
        center: (ref3 = options != null ? options.center : void 0) != null ? ref3 : true
      });
    };

    TextEditor.prototype.scrollToBufferPosition = function(bufferPosition, options) {
      return this.scrollToScreenPosition(this.screenPositionForBufferPosition(bufferPosition), options);
    };

    TextEditor.prototype.scrollToScreenPosition = function(screenPosition, options) {
      return this.scrollToScreenRange(new Range(screenPosition, screenPosition), options);
    };

    TextEditor.prototype.scrollToTop = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::scrollToTop instead.");
      return this.getElement().scrollToTop();
    };

    TextEditor.prototype.scrollToBottom = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::scrollToTop instead.");
      return this.getElement().scrollToBottom();
    };

    TextEditor.prototype.scrollToScreenRange = function(screenRange, options) {
      var scrollEvent;
      if (options == null) {
        options = {};
      }
      scrollEvent = {
        screenRange: screenRange,
        options: options
      };
      return this.emitter.emit("did-request-autoscroll", scrollEvent);
    };

    TextEditor.prototype.getHorizontalScrollbarHeight = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getHorizontalScrollbarHeight instead.");
      return this.getElement().getHorizontalScrollbarHeight();
    };

    TextEditor.prototype.getVerticalScrollbarWidth = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getVerticalScrollbarWidth instead.");
      return this.getElement().getVerticalScrollbarWidth();
    };

    TextEditor.prototype.pageUp = function() {
      return this.moveUp(this.getRowsPerPage());
    };

    TextEditor.prototype.pageDown = function() {
      return this.moveDown(this.getRowsPerPage());
    };

    TextEditor.prototype.selectPageUp = function() {
      return this.selectUp(this.getRowsPerPage());
    };

    TextEditor.prototype.selectPageDown = function() {
      return this.selectDown(this.getRowsPerPage());
    };

    TextEditor.prototype.getRowsPerPage = function() {
      var ref3;
      return Math.max((ref3 = this.rowsPerPage) != null ? ref3 : 1, 1);
    };

    TextEditor.prototype.setRowsPerPage = function(rowsPerPage) {
      this.rowsPerPage = rowsPerPage;
    };


    /*
    Section: Config
     */

    TextEditor.prototype.setScopedSettingsDelegate = function(scopedSettingsDelegate) {
      this.scopedSettingsDelegate = scopedSettingsDelegate;
    };

    TextEditor.prototype.getScopedSettingsDelegate = function() {
      return this.scopedSettingsDelegate;
    };

    TextEditor.prototype.shouldAutoIndent = function() {
      return this.autoIndent;
    };

    TextEditor.prototype.shouldAutoIndentOnPaste = function() {
      return this.autoIndentOnPaste;
    };

    TextEditor.prototype.getScrollPastEnd = function() {
      return this.scrollPastEnd;
    };

    TextEditor.prototype.getScrollSensitivity = function() {
      return this.scrollSensitivity;
    };

    TextEditor.prototype.getShowCursorOnSelection = function() {
      return this.showCursorOnSelection;
    };

    TextEditor.prototype.doesShowLineNumbers = function() {
      return this.showLineNumbers;
    };

    TextEditor.prototype.getUndoGroupingInterval = function() {
      return this.undoGroupingInterval;
    };

    TextEditor.prototype.getNonWordCharacters = function(scopes) {
      var ref3, ref4;
      return (ref3 = (ref4 = this.scopedSettingsDelegate) != null ? typeof ref4.getNonWordCharacters === "function" ? ref4.getNonWordCharacters(scopes) : void 0 : void 0) != null ? ref3 : this.nonWordCharacters;
    };

    TextEditor.prototype.getCommentStrings = function(scopes) {
      var ref3;
      return (ref3 = this.scopedSettingsDelegate) != null ? typeof ref3.getCommentStrings === "function" ? ref3.getCommentStrings(scopes) : void 0 : void 0;
    };

    TextEditor.prototype.getIncreaseIndentPattern = function(scopes) {
      var ref3;
      return (ref3 = this.scopedSettingsDelegate) != null ? typeof ref3.getIncreaseIndentPattern === "function" ? ref3.getIncreaseIndentPattern(scopes) : void 0 : void 0;
    };

    TextEditor.prototype.getDecreaseIndentPattern = function(scopes) {
      var ref3;
      return (ref3 = this.scopedSettingsDelegate) != null ? typeof ref3.getDecreaseIndentPattern === "function" ? ref3.getDecreaseIndentPattern(scopes) : void 0 : void 0;
    };

    TextEditor.prototype.getDecreaseNextIndentPattern = function(scopes) {
      var ref3;
      return (ref3 = this.scopedSettingsDelegate) != null ? typeof ref3.getDecreaseNextIndentPattern === "function" ? ref3.getDecreaseNextIndentPattern(scopes) : void 0 : void 0;
    };

    TextEditor.prototype.getFoldEndPattern = function(scopes) {
      var ref3;
      return (ref3 = this.scopedSettingsDelegate) != null ? typeof ref3.getFoldEndPattern === "function" ? ref3.getFoldEndPattern(scopes) : void 0 : void 0;
    };


    /*
    Section: Event Handlers
     */

    TextEditor.prototype.handleGrammarChange = function() {
      this.unfoldAll();
      return this.emitter.emit('did-change-grammar', this.getGrammar());
    };


    /*
    Section: TextEditor Rendering
     */

    TextEditor.prototype.getElement = function() {
      return this.editorElement != null ? this.editorElement : this.editorElement = new TextEditorElement().initialize(this, atom);
    };

    TextEditor.prototype.getAllowedLocations = function() {
      return ['center'];
    };

    TextEditor.prototype.getPlaceholderText = function() {
      return this.placeholderText;
    };

    TextEditor.prototype.setPlaceholderText = function(placeholderText) {
      return this.update({
        placeholderText: placeholderText
      });
    };

    TextEditor.prototype.pixelPositionForBufferPosition = function(bufferPosition) {
      Grim.deprecate("This method is deprecated on the model layer. Use `TextEditorElement::pixelPositionForBufferPosition` instead");
      return this.getElement().pixelPositionForBufferPosition(bufferPosition);
    };

    TextEditor.prototype.pixelPositionForScreenPosition = function(screenPosition) {
      Grim.deprecate("This method is deprecated on the model layer. Use `TextEditorElement::pixelPositionForScreenPosition` instead");
      return this.getElement().pixelPositionForScreenPosition(screenPosition);
    };

    TextEditor.prototype.getVerticalScrollMargin = function() {
      var maxScrollMargin;
      maxScrollMargin = Math.floor(((this.height / this.getLineHeightInPixels()) - 1) / 2);
      return Math.min(this.verticalScrollMargin, maxScrollMargin);
    };

    TextEditor.prototype.setVerticalScrollMargin = function(verticalScrollMargin) {
      this.verticalScrollMargin = verticalScrollMargin;
      return this.verticalScrollMargin;
    };

    TextEditor.prototype.getHorizontalScrollMargin = function() {
      return Math.min(this.horizontalScrollMargin, Math.floor(((this.width / this.getDefaultCharWidth()) - 1) / 2));
    };

    TextEditor.prototype.setHorizontalScrollMargin = function(horizontalScrollMargin) {
      this.horizontalScrollMargin = horizontalScrollMargin;
      return this.horizontalScrollMargin;
    };

    TextEditor.prototype.getLineHeightInPixels = function() {
      return this.lineHeightInPixels;
    };

    TextEditor.prototype.setLineHeightInPixels = function(lineHeightInPixels) {
      this.lineHeightInPixels = lineHeightInPixels;
      return this.lineHeightInPixels;
    };

    TextEditor.prototype.getKoreanCharWidth = function() {
      return this.koreanCharWidth;
    };

    TextEditor.prototype.getHalfWidthCharWidth = function() {
      return this.halfWidthCharWidth;
    };

    TextEditor.prototype.getDoubleWidthCharWidth = function() {
      return this.doubleWidthCharWidth;
    };

    TextEditor.prototype.getDefaultCharWidth = function() {
      return this.defaultCharWidth;
    };

    TextEditor.prototype.ratioForCharacter = function(character) {
      if (isKoreanCharacter(character)) {
        return this.getKoreanCharWidth() / this.getDefaultCharWidth();
      } else if (isHalfWidthCharacter(character)) {
        return this.getHalfWidthCharWidth() / this.getDefaultCharWidth();
      } else if (isDoubleWidthCharacter(character)) {
        return this.getDoubleWidthCharWidth() / this.getDefaultCharWidth();
      } else {
        return 1;
      }
    };

    TextEditor.prototype.setDefaultCharWidth = function(defaultCharWidth, doubleWidthCharWidth, halfWidthCharWidth, koreanCharWidth) {
      if (doubleWidthCharWidth == null) {
        doubleWidthCharWidth = defaultCharWidth;
      }
      if (halfWidthCharWidth == null) {
        halfWidthCharWidth = defaultCharWidth;
      }
      if (koreanCharWidth == null) {
        koreanCharWidth = defaultCharWidth;
      }
      if (defaultCharWidth !== this.defaultCharWidth || doubleWidthCharWidth !== this.doubleWidthCharWidth && halfWidthCharWidth !== this.halfWidthCharWidth && koreanCharWidth !== this.koreanCharWidth) {
        this.defaultCharWidth = defaultCharWidth;
        this.doubleWidthCharWidth = doubleWidthCharWidth;
        this.halfWidthCharWidth = halfWidthCharWidth;
        this.koreanCharWidth = koreanCharWidth;
        if (this.isSoftWrapped() && (this.getEditorWidthInChars() != null)) {
          this.displayLayer.reset({});
        }
      }
      return defaultCharWidth;
    };

    TextEditor.prototype.setHeight = function(height, reentrant) {
      if (reentrant == null) {
        reentrant = false;
      }
      if (reentrant) {
        return this.height = height;
      } else {
        Grim.deprecate("This is now a view method. Call TextEditorElement::setHeight instead.");
        return this.getElement().setHeight(height);
      }
    };

    TextEditor.prototype.getHeight = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getHeight instead.");
      return this.height;
    };

    TextEditor.prototype.getAutoHeight = function() {
      var ref3;
      return (ref3 = this.autoHeight) != null ? ref3 : true;
    };

    TextEditor.prototype.getAutoWidth = function() {
      var ref3;
      return (ref3 = this.autoWidth) != null ? ref3 : false;
    };

    TextEditor.prototype.setWidth = function(width, reentrant) {
      if (reentrant == null) {
        reentrant = false;
      }
      if (reentrant) {
        this.update({
          width: width
        });
        return this.width;
      } else {
        Grim.deprecate("This is now a view method. Call TextEditorElement::setWidth instead.");
        return this.getElement().setWidth(width);
      }
    };

    TextEditor.prototype.getWidth = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getWidth instead.");
      return this.width;
    };

    TextEditor.prototype.setFirstVisibleScreenRow = function(screenRow, fromView) {
      var maxScreenRow;
      if (!fromView) {
        maxScreenRow = this.getScreenLineCount() - 1;
        if (!this.scrollPastEnd) {
          if ((this.height != null) && (this.lineHeightInPixels != null)) {
            maxScreenRow -= Math.floor(this.height / this.lineHeightInPixels);
          }
        }
        screenRow = Math.max(Math.min(screenRow, maxScreenRow), 0);
      }
      if (screenRow !== this.firstVisibleScreenRow) {
        this.firstVisibleScreenRow = screenRow;
        if (!fromView) {
          return this.emitter.emit('did-change-first-visible-screen-row', screenRow);
        }
      }
    };

    TextEditor.prototype.getFirstVisibleScreenRow = function() {
      return this.firstVisibleScreenRow;
    };

    TextEditor.prototype.getLastVisibleScreenRow = function() {
      if ((this.height != null) && (this.lineHeightInPixels != null)) {
        return Math.min(this.firstVisibleScreenRow + Math.floor(this.height / this.lineHeightInPixels), this.getScreenLineCount() - 1);
      } else {
        return null;
      }
    };

    TextEditor.prototype.getVisibleRowRange = function() {
      var lastVisibleScreenRow;
      if (lastVisibleScreenRow = this.getLastVisibleScreenRow()) {
        return [this.firstVisibleScreenRow, lastVisibleScreenRow];
      } else {
        return null;
      }
    };

    TextEditor.prototype.setFirstVisibleScreenColumn = function(firstVisibleScreenColumn) {
      this.firstVisibleScreenColumn = firstVisibleScreenColumn;
    };

    TextEditor.prototype.getFirstVisibleScreenColumn = function() {
      return this.firstVisibleScreenColumn;
    };

    TextEditor.prototype.getScrollTop = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getScrollTop instead.");
      return this.getElement().getScrollTop();
    };

    TextEditor.prototype.setScrollTop = function(scrollTop) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::setScrollTop instead.");
      return this.getElement().setScrollTop(scrollTop);
    };

    TextEditor.prototype.getScrollBottom = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getScrollBottom instead.");
      return this.getElement().getScrollBottom();
    };

    TextEditor.prototype.setScrollBottom = function(scrollBottom) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::setScrollBottom instead.");
      return this.getElement().setScrollBottom(scrollBottom);
    };

    TextEditor.prototype.getScrollLeft = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getScrollLeft instead.");
      return this.getElement().getScrollLeft();
    };

    TextEditor.prototype.setScrollLeft = function(scrollLeft) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::setScrollLeft instead.");
      return this.getElement().setScrollLeft(scrollLeft);
    };

    TextEditor.prototype.getScrollRight = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getScrollRight instead.");
      return this.getElement().getScrollRight();
    };

    TextEditor.prototype.setScrollRight = function(scrollRight) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::setScrollRight instead.");
      return this.getElement().setScrollRight(scrollRight);
    };

    TextEditor.prototype.getScrollHeight = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getScrollHeight instead.");
      return this.getElement().getScrollHeight();
    };

    TextEditor.prototype.getScrollWidth = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getScrollWidth instead.");
      return this.getElement().getScrollWidth();
    };

    TextEditor.prototype.getMaxScrollTop = function() {
      Grim.deprecate("This is now a view method. Call TextEditorElement::getMaxScrollTop instead.");
      return this.getElement().getMaxScrollTop();
    };

    TextEditor.prototype.intersectsVisibleRowRange = function(startRow, endRow) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::intersectsVisibleRowRange instead.");
      return this.getElement().intersectsVisibleRowRange(startRow, endRow);
    };

    TextEditor.prototype.selectionIntersectsVisibleRowRange = function(selection) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::selectionIntersectsVisibleRowRange instead.");
      return this.getElement().selectionIntersectsVisibleRowRange(selection);
    };

    TextEditor.prototype.screenPositionForPixelPosition = function(pixelPosition) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::screenPositionForPixelPosition instead.");
      return this.getElement().screenPositionForPixelPosition(pixelPosition);
    };

    TextEditor.prototype.pixelRectForScreenRange = function(screenRange) {
      Grim.deprecate("This is now a view method. Call TextEditorElement::pixelRectForScreenRange instead.");
      return this.getElement().pixelRectForScreenRange(screenRange);
    };


    /*
    Section: Utility
     */

    TextEditor.prototype.inspect = function() {
      return "<TextEditor " + this.id + ">";
    };

    TextEditor.prototype.emitWillInsertTextEvent = function(text) {
      var cancel, result, willInsertEvent;
      result = true;
      cancel = function() {
        return result = false;
      };
      willInsertEvent = {
        cancel: cancel,
        text: text
      };
      this.emitter.emit('will-insert-text', willInsertEvent);
      return result;
    };


    /*
    Section: Language Mode Delegated Methods
     */

    TextEditor.prototype.suggestedIndentForBufferRow = function(bufferRow, options) {
      return this.languageMode.suggestedIndentForBufferRow(bufferRow, options);
    };

    TextEditor.prototype.autoIndentBufferRow = function(bufferRow, options) {
      return this.languageMode.autoIndentBufferRow(bufferRow, options);
    };

    TextEditor.prototype.autoIndentBufferRows = function(startRow, endRow) {
      return this.languageMode.autoIndentBufferRows(startRow, endRow);
    };

    TextEditor.prototype.autoDecreaseIndentForBufferRow = function(bufferRow) {
      return this.languageMode.autoDecreaseIndentForBufferRow(bufferRow);
    };

    TextEditor.prototype.toggleLineCommentForBufferRow = function(row) {
      return this.languageMode.toggleLineCommentsForBufferRow(row);
    };

    TextEditor.prototype.toggleLineCommentsForBufferRows = function(start, end) {
      return this.languageMode.toggleLineCommentsForBufferRows(start, end);
    };

    return TextEditor;

  })(Model);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3RleHQtZWRpdG9yLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsbVhBQUE7SUFBQTs7Ozs7RUFBQSxDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxFQUFBLEdBQUssT0FBQSxDQUFRLFNBQVI7O0VBQ0wsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLE1BQTZDLE9BQUEsQ0FBUSxXQUFSLENBQTdDLEVBQUMsNkNBQUQsRUFBc0IsMkJBQXRCLEVBQWtDOztFQUNsQyxPQUFpQixVQUFBLEdBQWEsT0FBQSxDQUFRLGFBQVIsQ0FBOUIsRUFBQyxrQkFBRCxFQUFROztFQUNSLFlBQUEsR0FBZSxPQUFBLENBQVEsaUJBQVI7O0VBQ2YsaUJBQUEsR0FBb0IsT0FBQSxDQUFRLHNCQUFSOztFQUNwQixlQUFBLEdBQWtCLE9BQUEsQ0FBUSxvQkFBUjs7RUFDbEIsTUFBQSxHQUFTLE9BQUEsQ0FBUSxVQUFSOztFQUNULEtBQUEsR0FBUSxPQUFBLENBQVEsU0FBUjs7RUFDUixTQUFBLEdBQVksT0FBQSxDQUFRLGFBQVI7O0VBQ1oscUJBQUEsR0FBd0IsT0FBQSxDQUFRLFlBQVIsQ0FBcUIsQ0FBQzs7RUFDOUMsZUFBQSxHQUFrQixPQUFBLENBQVEsb0JBQVI7O0VBQ2xCLGlCQUFBLEdBQW9CLE9BQUEsQ0FBUSx1QkFBUjs7RUFDcEIsT0FBb0YsT0FBQSxDQUFRLGNBQVIsQ0FBcEYsRUFBQyxvREFBRCxFQUF5QixnREFBekIsRUFBK0MsMENBQS9DLEVBQWtFOztFQUVsRSxlQUFBLEdBQWtCOztFQUNsQixzQkFBQSxHQUF5Qjs7RUF3Q3pCLE1BQU0sQ0FBQyxPQUFQLEdBQ007OztJQUNKLFVBQUMsQ0FBQSxZQUFELEdBQWUsU0FBQyxTQUFEO2FBQ2Is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RDtJQUF4Qjs7eUJBRTdCLG1CQUFBLEdBQXFCLFNBQUMsU0FBRCxFQUFZLE9BQVo7YUFBd0IsSUFBQyxDQUFBLFlBQVksQ0FBQyxtQkFBZCxDQUFrQyxTQUFsQyxFQUE2QyxPQUE3QztJQUF4Qjs7eUJBRXJCLG9CQUFBLEdBQXNCLFNBQUMsUUFBRCxFQUFXLE1BQVg7YUFBc0IsSUFBQyxDQUFBLFlBQVksQ0FBQyxvQkFBZCxDQUFtQyxRQUFuQyxFQUE2QyxNQUE3QztJQUF0Qjs7eUJBRXRCLDhCQUFBLEdBQWdDLFNBQUMsU0FBRDthQUFlLElBQUMsQ0FBQSxZQUFZLENBQUMsOEJBQWQsQ0FBNkMsU0FBN0M7SUFBZjs7eUJBRWhDLDZCQUFBLEdBQStCLFNBQUMsR0FBRDthQUFTLElBQUMsQ0FBQSxZQUFZLENBQUMsOEJBQWQsQ0FBNkMsR0FBN0M7SUFBVDs7eUJBRS9CLCtCQUFBLEdBQWlDLFNBQUMsS0FBRCxFQUFRLEdBQVI7YUFBZ0IsSUFBQyxDQUFBLFlBQVksQ0FBQywrQkFBZCxDQUE4QyxLQUE5QyxFQUFxRCxHQUFyRDtJQUFoQjs7OztLQTluSFY7QUEzRHpCIiwic291cmNlc0NvbnRlbnQiOlsiXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbnBhdGggPSByZXF1aXJlICdwYXRoJ1xuZnMgPSByZXF1aXJlICdmcy1wbHVzJ1xuR3JpbSA9IHJlcXVpcmUgJ2dyaW0nXG57Q29tcG9zaXRlRGlzcG9zYWJsZSwgRGlzcG9zYWJsZSwgRW1pdHRlcn0gPSByZXF1aXJlICdldmVudC1raXQnXG57UG9pbnQsIFJhbmdlfSA9IFRleHRCdWZmZXIgPSByZXF1aXJlICd0ZXh0LWJ1ZmZlcidcbkxhbmd1YWdlTW9kZSA9IHJlcXVpcmUgJy4vbGFuZ3VhZ2UtbW9kZSdcbkRlY29yYXRpb25NYW5hZ2VyID0gcmVxdWlyZSAnLi9kZWNvcmF0aW9uLW1hbmFnZXInXG5Ub2tlbml6ZWRCdWZmZXIgPSByZXF1aXJlICcuL3Rva2VuaXplZC1idWZmZXInXG5DdXJzb3IgPSByZXF1aXJlICcuL2N1cnNvcidcbk1vZGVsID0gcmVxdWlyZSAnLi9tb2RlbCdcblNlbGVjdGlvbiA9IHJlcXVpcmUgJy4vc2VsZWN0aW9uJ1xuVGV4dE1hdGVTY29wZVNlbGVjdG9yID0gcmVxdWlyZSgnZmlyc3QtbWF0ZScpLlNjb3BlU2VsZWN0b3Jcbkd1dHRlckNvbnRhaW5lciA9IHJlcXVpcmUgJy4vZ3V0dGVyLWNvbnRhaW5lcidcblRleHRFZGl0b3JFbGVtZW50ID0gcmVxdWlyZSAnLi90ZXh0LWVkaXRvci1lbGVtZW50J1xue2lzRG91YmxlV2lkdGhDaGFyYWN0ZXIsIGlzSGFsZldpZHRoQ2hhcmFjdGVyLCBpc0tvcmVhbkNoYXJhY3RlciwgaXNXcmFwQm91bmRhcnl9ID0gcmVxdWlyZSAnLi90ZXh0LXV0aWxzJ1xuXG5aRVJPX1dJRFRIX05CU1AgPSAnXFx1ZmVmZidcbk1BWF9TQ1JFRU5fTElORV9MRU5HVEggPSA1MDBcblxuIyBFc3NlbnRpYWw6IFRoaXMgY2xhc3MgcmVwcmVzZW50cyBhbGwgZXNzZW50aWFsIGVkaXRpbmcgc3RhdGUgZm9yIGEgc2luZ2xlXG4jIHtUZXh0QnVmZmVyfSwgaW5jbHVkaW5nIGN1cnNvciBhbmQgc2VsZWN0aW9uIHBvc2l0aW9ucywgZm9sZHMsIGFuZCBzb2Z0IHdyYXBzLlxuIyBJZiB5b3UncmUgbWFuaXB1bGF0aW5nIHRoZSBzdGF0ZSBvZiBhbiBlZGl0b3IsIHVzZSB0aGlzIGNsYXNzLlxuI1xuIyBBIHNpbmdsZSB7VGV4dEJ1ZmZlcn0gY2FuIGJlbG9uZyB0byBtdWx0aXBsZSBlZGl0b3JzLiBGb3IgZXhhbXBsZSwgaWYgdGhlXG4jIHNhbWUgZmlsZSBpcyBvcGVuIGluIHR3byBkaWZmZXJlbnQgcGFuZXMsIEF0b20gY3JlYXRlcyBhIHNlcGFyYXRlIGVkaXRvciBmb3JcbiMgZWFjaCBwYW5lLiBJZiB0aGUgYnVmZmVyIGlzIG1hbmlwdWxhdGVkIHRoZSBjaGFuZ2VzIGFyZSByZWZsZWN0ZWQgaW4gYm90aFxuIyBlZGl0b3JzLCBidXQgZWFjaCBtYWludGFpbnMgaXRzIG93biBjdXJzb3IgcG9zaXRpb24sIGZvbGRlZCBsaW5lcywgZXRjLlxuI1xuIyAjIyBBY2Nlc3NpbmcgVGV4dEVkaXRvciBJbnN0YW5jZXNcbiNcbiMgVGhlIGVhc2llc3Qgd2F5IHRvIGdldCBob2xkIG9mIGBUZXh0RWRpdG9yYCBvYmplY3RzIGlzIGJ5IHJlZ2lzdGVyaW5nIGEgY2FsbGJhY2tcbiMgd2l0aCBgOjpvYnNlcnZlVGV4dEVkaXRvcnNgIG9uIHRoZSBgYXRvbS53b3Jrc3BhY2VgIGdsb2JhbC4gWW91ciBjYWxsYmFjayB3aWxsXG4jIHRoZW4gYmUgY2FsbGVkIHdpdGggYWxsIGN1cnJlbnQgZWRpdG9yIGluc3RhbmNlcyBhbmQgYWxzbyB3aGVuIGFueSBlZGl0b3IgaXNcbiMgY3JlYXRlZCBpbiB0aGUgZnV0dXJlLlxuI1xuIyBgYGBjb2ZmZWVcbiMgYXRvbS53b3Jrc3BhY2Uub2JzZXJ2ZVRleHRFZGl0b3JzIChlZGl0b3IpIC0+XG4jICAgZWRpdG9yLmluc2VydFRleHQoJ0hlbGxvIFdvcmxkJylcbiMgYGBgXG4jXG4jICMjIEJ1ZmZlciB2cy4gU2NyZWVuIENvb3JkaW5hdGVzXG4jXG4jIEJlY2F1c2UgZWRpdG9ycyBzdXBwb3J0IGZvbGRzIGFuZCBzb2Z0LXdyYXBwaW5nLCB0aGUgbGluZXMgb24gc2NyZWVuIGRvbid0XG4jIGFsd2F5cyBtYXRjaCB0aGUgbGluZXMgaW4gdGhlIGJ1ZmZlci4gRm9yIGV4YW1wbGUsIGEgbG9uZyBsaW5lIHRoYXQgc29mdCB3cmFwc1xuIyB0d2ljZSByZW5kZXJzIGFzIHRocmVlIGxpbmVzIG9uIHNjcmVlbiwgYnV0IG9ubHkgcmVwcmVzZW50cyBvbmUgbGluZSBpbiB0aGVcbiMgYnVmZmVyLiBTaW1pbGFybHksIGlmIHJvd3MgNS0xMCBhcmUgZm9sZGVkLCB0aGVuIHJvdyA2IG9uIHNjcmVlbiBjb3JyZXNwb25kc1xuIyB0byByb3cgMTEgaW4gdGhlIGJ1ZmZlci5cbiNcbiMgWW91ciBjaG9pY2Ugb2YgY29vcmRpbmF0ZXMgc3lzdGVtcyB3aWxsIGRlcGVuZCBvbiB3aGF0IHlvdSdyZSB0cnlpbmcgdG9cbiMgYWNoaWV2ZS4gRm9yIGV4YW1wbGUsIGlmIHlvdSdyZSB3cml0aW5nIGEgY29tbWFuZCB0aGF0IGp1bXBzIHRoZSBjdXJzb3IgdXAgb3JcbiMgZG93biBieSAxMCBsaW5lcywgeW91J2xsIHdhbnQgdG8gdXNlIHNjcmVlbiBjb29yZGluYXRlcyBiZWNhdXNlIHRoZSB1c2VyXG4jIHByb2JhYmx5IHdhbnRzIHRvIHNraXAgbGluZXMgKm9uIHNjcmVlbiouIEhvd2V2ZXIsIGlmIHlvdSdyZSB3cml0aW5nIGEgcGFja2FnZVxuIyB0aGF0IGp1bXBzIGJldHdlZW4gbWV0aG9kIGRlZmluaXRpb25zLCB5b3UnbGwgd2FudCB0byB3b3JrIGluIGJ1ZmZlclxuIyBjb29yZGluYXRlcy5cbiNcbiMgKipXaGVuIGluIGRvdWJ0LCBqdXN0IGRlZmF1bHQgdG8gYnVmZmVyIGNvb3JkaW5hdGVzKiosIHRoZW4gZXhwZXJpbWVudCB3aXRoXG4jIHNvZnQgd3JhcHMgYW5kIGZvbGRzIHRvIGVuc3VyZSB5b3VyIGNvZGUgaW50ZXJhY3RzIHdpdGggdGhlbSBjb3JyZWN0bHkuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBUZXh0RWRpdG9yIGV4dGVuZHMgTW9kZWxcbiAgQHNldENsaXBib2FyZDogKGNsaXBib2FyZCkgLT5cbiAgICBAY2xpcGJvYXJkID0gY2xpcGJvYXJkXG5cbiAgc2VyaWFsaXphdGlvblZlcnNpb246IDFcblxuICBidWZmZXI6IG51bGxcbiAgbGFuZ3VhZ2VNb2RlOiBudWxsXG4gIGN1cnNvcnM6IG51bGxcbiAgc2hvd0N1cnNvck9uU2VsZWN0aW9uOiBudWxsXG4gIHNlbGVjdGlvbnM6IG51bGxcbiAgc3VwcHJlc3NTZWxlY3Rpb25NZXJnaW5nOiBmYWxzZVxuICBzZWxlY3Rpb25GbGFzaER1cmF0aW9uOiA1MDBcbiAgZ3V0dGVyQ29udGFpbmVyOiBudWxsXG4gIGVkaXRvckVsZW1lbnQ6IG51bGxcbiAgdmVydGljYWxTY3JvbGxNYXJnaW46IDJcbiAgaG9yaXpvbnRhbFNjcm9sbE1hcmdpbjogNlxuICBzb2Z0V3JhcHBlZDogbnVsbFxuICBlZGl0b3JXaWR0aEluQ2hhcnM6IG51bGxcbiAgbGluZUhlaWdodEluUGl4ZWxzOiBudWxsXG4gIGRlZmF1bHRDaGFyV2lkdGg6IG51bGxcbiAgaGVpZ2h0OiBudWxsXG4gIHdpZHRoOiBudWxsXG4gIHJlZ2lzdGVyZWQ6IGZhbHNlXG4gIGF0b21pY1NvZnRUYWJzOiB0cnVlXG4gIGludmlzaWJsZXM6IG51bGxcbiAgc2hvd0xpbmVOdW1iZXJzOiB0cnVlXG4gIHNjcm9sbFNlbnNpdGl2aXR5OiA0MFxuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBAcHJvdG90eXBlLCBcImVsZW1lbnRcIixcbiAgICBnZXQ6IC0+IEBnZXRFbGVtZW50KClcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQHByb3RvdHlwZSwgJ2Rpc3BsYXlCdWZmZXInLCBnZXQ6IC0+XG4gICAgR3JpbS5kZXByZWNhdGUoXCJcIlwiXG4gICAgICBgVGV4dEVkaXRvci5wcm90b3R5cGUuZGlzcGxheUJ1ZmZlcmAgaGFzIGFsd2F5cyBiZWVuIHByaXZhdGUsIGJ1dCBub3dcbiAgICAgIGl0IGlzIGdvbmUuIFJlYWRpbmcgdGhlIGBkaXNwbGF5QnVmZmVyYCBwcm9wZXJ0eSBub3cgcmV0dXJucyBhIHJlZmVyZW5jZVxuICAgICAgdG8gdGhlIGNvbnRhaW5pbmcgYFRleHRFZGl0b3JgLCB3aGljaCBub3cgcHJvdmlkZXMgKnNvbWUqIG9mIHRoZSBBUEkgb2ZcbiAgICAgIHRoZSBkZWZ1bmN0IGBEaXNwbGF5QnVmZmVyYCBjbGFzcy5cbiAgICBcIlwiXCIpXG4gICAgdGhpc1xuICApXG5cbiAgQGRlc2VyaWFsaXplOiAoc3RhdGUsIGF0b21FbnZpcm9ubWVudCkgLT5cbiAgICAjIFRPRE86IFJldHVybiBudWxsIG9uIHZlcnNpb24gbWlzbWF0Y2ggd2hlbiAxLjguMCBoYXMgYmVlbiBvdXQgZm9yIGEgd2hpbGVcbiAgICBpZiBzdGF0ZS52ZXJzaW9uIGlzbnQgQHByb3RvdHlwZS5zZXJpYWxpemF0aW9uVmVyc2lvbiBhbmQgc3RhdGUuZGlzcGxheUJ1ZmZlcj9cbiAgICAgIHN0YXRlLnRva2VuaXplZEJ1ZmZlciA9IHN0YXRlLmRpc3BsYXlCdWZmZXIudG9rZW5pemVkQnVmZmVyXG5cbiAgICB0cnlcbiAgICAgIHN0YXRlLnRva2VuaXplZEJ1ZmZlciA9IFRva2VuaXplZEJ1ZmZlci5kZXNlcmlhbGl6ZShzdGF0ZS50b2tlbml6ZWRCdWZmZXIsIGF0b21FbnZpcm9ubWVudClcbiAgICAgIHN0YXRlLnRhYkxlbmd0aCA9IHN0YXRlLnRva2VuaXplZEJ1ZmZlci5nZXRUYWJMZW5ndGgoKVxuICAgIGNhdGNoIGVycm9yXG4gICAgICBpZiBlcnJvci5zeXNjYWxsIGlzICdyZWFkJ1xuICAgICAgICByZXR1cm4gIyBFcnJvciByZWFkaW5nIHRoZSBmaWxlLCBkb24ndCBkZXNlcmlhbGl6ZSBhbiBlZGl0b3IgZm9yIGl0XG4gICAgICBlbHNlXG4gICAgICAgIHRocm93IGVycm9yXG5cbiAgICBzdGF0ZS5idWZmZXIgPSBzdGF0ZS50b2tlbml6ZWRCdWZmZXIuYnVmZmVyXG4gICAgc3RhdGUuYXNzZXJ0ID0gYXRvbUVudmlyb25tZW50LmFzc2VydC5iaW5kKGF0b21FbnZpcm9ubWVudClcbiAgICBlZGl0b3IgPSBuZXcgdGhpcyhzdGF0ZSlcbiAgICBpZiBzdGF0ZS5yZWdpc3RlcmVkXG4gICAgICBkaXNwb3NhYmxlID0gYXRvbUVudmlyb25tZW50LnRleHRFZGl0b3JzLmFkZChlZGl0b3IpXG4gICAgICBlZGl0b3Iub25EaWREZXN0cm95IC0+IGRpc3Bvc2FibGUuZGlzcG9zZSgpXG4gICAgZWRpdG9yXG5cbiAgY29uc3RydWN0b3I6IChwYXJhbXM9e30pIC0+XG4gICAgdW5sZXNzIEBjb25zdHJ1Y3Rvci5jbGlwYm9hcmQ/XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IGNhbGwgVGV4dEVkaXRvci5zZXRDbGlwYm9hcmQgYXQgbGVhc3Qgb25jZSBiZWZvcmUgY3JlYXRpbmcgVGV4dEVkaXRvciBpbnN0YW5jZXNcIilcblxuICAgIHN1cGVyXG5cbiAgICB7XG4gICAgICBAc29mdFRhYnMsIEBmaXJzdFZpc2libGVTY3JlZW5Sb3csIEBmaXJzdFZpc2libGVTY3JlZW5Db2x1bW4sIGluaXRpYWxMaW5lLCBpbml0aWFsQ29sdW1uLCB0YWJMZW5ndGgsXG4gICAgICBAc29mdFdyYXBwZWQsIEBkZWNvcmF0aW9uTWFuYWdlciwgQHNlbGVjdGlvbnNNYXJrZXJMYXllciwgQGJ1ZmZlciwgc3VwcHJlc3NDdXJzb3JDcmVhdGlvbixcbiAgICAgIEBtaW5pLCBAcGxhY2Vob2xkZXJUZXh0LCBsaW5lTnVtYmVyR3V0dGVyVmlzaWJsZSwgQGxhcmdlRmlsZU1vZGUsXG4gICAgICBAYXNzZXJ0LCBncmFtbWFyLCBAc2hvd0ludmlzaWJsZXMsIEBhdXRvSGVpZ2h0LCBAYXV0b1dpZHRoLCBAc2Nyb2xsUGFzdEVuZCwgQGVkaXRvcldpZHRoSW5DaGFycyxcbiAgICAgIEB0b2tlbml6ZWRCdWZmZXIsIEBkaXNwbGF5TGF5ZXIsIEBpbnZpc2libGVzLCBAc2hvd0luZGVudEd1aWRlLFxuICAgICAgQHNvZnRXcmFwcGVkLCBAc29mdFdyYXBBdFByZWZlcnJlZExpbmVMZW5ndGgsIEBwcmVmZXJyZWRMaW5lTGVuZ3RoLFxuICAgICAgQHNob3dDdXJzb3JPblNlbGVjdGlvblxuICAgIH0gPSBwYXJhbXNcblxuICAgIEBhc3NlcnQgPz0gKGNvbmRpdGlvbikgLT4gY29uZGl0aW9uXG4gICAgQGZpcnN0VmlzaWJsZVNjcmVlblJvdyA/PSAwXG4gICAgQGZpcnN0VmlzaWJsZVNjcmVlbkNvbHVtbiA/PSAwXG4gICAgQGVtaXR0ZXIgPSBuZXcgRW1pdHRlclxuICAgIEBkaXNwb3NhYmxlcyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlXG4gICAgQGN1cnNvcnMgPSBbXVxuICAgIEBjdXJzb3JzQnlNYXJrZXJJZCA9IG5ldyBNYXBcbiAgICBAc2VsZWN0aW9ucyA9IFtdXG4gICAgQGhhc1Rlcm1pbmF0ZWRQZW5kaW5nU3RhdGUgPSBmYWxzZVxuXG4gICAgQG1pbmkgPz0gZmFsc2VcbiAgICBAc2Nyb2xsUGFzdEVuZCA/PSBmYWxzZVxuICAgIEBzaG93SW52aXNpYmxlcyA/PSB0cnVlXG4gICAgQHNvZnRUYWJzID89IHRydWVcbiAgICB0YWJMZW5ndGggPz0gMlxuICAgIEBhdXRvSW5kZW50ID89IHRydWVcbiAgICBAYXV0b0luZGVudE9uUGFzdGUgPz0gdHJ1ZVxuICAgIEBzaG93Q3Vyc29yT25TZWxlY3Rpb24gPz0gdHJ1ZVxuICAgIEB1bmRvR3JvdXBpbmdJbnRlcnZhbCA/PSAzMDBcbiAgICBAbm9uV29yZENoYXJhY3RlcnMgPz0gXCIvXFxcXCgpXFxcIic6LC47PD5+IUAjJCVeJip8Kz1bXXt9YD8t4oCmXCJcbiAgICBAc29mdFdyYXBwZWQgPz0gZmFsc2VcbiAgICBAc29mdFdyYXBBdFByZWZlcnJlZExpbmVMZW5ndGggPz0gZmFsc2VcbiAgICBAcHJlZmVycmVkTGluZUxlbmd0aCA/PSA4MFxuXG4gICAgQGJ1ZmZlciA/PSBuZXcgVGV4dEJ1ZmZlcih7c2hvdWxkRGVzdHJveU9uRmlsZURlbGV0ZTogLT5cbiAgICAgIGF0b20uY29uZmlnLmdldCgnY29yZS5jbG9zZURlbGV0ZWRGaWxlVGFicycpfSlcbiAgICBAdG9rZW5pemVkQnVmZmVyID89IG5ldyBUb2tlbml6ZWRCdWZmZXIoe1xuICAgICAgZ3JhbW1hciwgdGFiTGVuZ3RoLCBAYnVmZmVyLCBAbGFyZ2VGaWxlTW9kZSwgQGFzc2VydFxuICAgIH0pXG5cbiAgICB1bmxlc3MgQGRpc3BsYXlMYXllcj9cbiAgICAgIGRpc3BsYXlMYXllclBhcmFtcyA9IHtcbiAgICAgICAgaW52aXNpYmxlczogQGdldEludmlzaWJsZXMoKSxcbiAgICAgICAgc29mdFdyYXBDb2x1bW46IEBnZXRTb2Z0V3JhcENvbHVtbigpLFxuICAgICAgICBzaG93SW5kZW50R3VpZGVzOiBAZG9lc1Nob3dJbmRlbnRHdWlkZSgpLFxuICAgICAgICBhdG9taWNTb2Z0VGFiczogcGFyYW1zLmF0b21pY1NvZnRUYWJzID8gdHJ1ZSxcbiAgICAgICAgdGFiTGVuZ3RoOiB0YWJMZW5ndGgsXG4gICAgICAgIHJhdGlvRm9yQ2hhcmFjdGVyOiBAcmF0aW9Gb3JDaGFyYWN0ZXIuYmluZCh0aGlzKSxcbiAgICAgICAgaXNXcmFwQm91bmRhcnk6IGlzV3JhcEJvdW5kYXJ5LFxuICAgICAgICBmb2xkQ2hhcmFjdGVyOiBaRVJPX1dJRFRIX05CU1AsXG4gICAgICAgIHNvZnRXcmFwSGFuZ2luZ0luZGVudDogcGFyYW1zLnNvZnRXcmFwSGFuZ2luZ0luZGVudExlbmd0aCA/IDBcbiAgICAgIH1cblxuICAgICAgaWYgQGRpc3BsYXlMYXllciA9IEBidWZmZXIuZ2V0RGlzcGxheUxheWVyKHBhcmFtcy5kaXNwbGF5TGF5ZXJJZClcbiAgICAgICAgQGRpc3BsYXlMYXllci5yZXNldChkaXNwbGF5TGF5ZXJQYXJhbXMpXG4gICAgICAgIEBzZWxlY3Rpb25zTWFya2VyTGF5ZXIgPSBAZGlzcGxheUxheWVyLmdldE1hcmtlckxheWVyKHBhcmFtcy5zZWxlY3Rpb25zTWFya2VyTGF5ZXJJZClcbiAgICAgIGVsc2VcbiAgICAgICAgQGRpc3BsYXlMYXllciA9IEBidWZmZXIuYWRkRGlzcGxheUxheWVyKGRpc3BsYXlMYXllclBhcmFtcylcblxuICAgIEBiYWNrZ3JvdW5kV29ya0hhbmRsZSA9IHJlcXVlc3RJZGxlQ2FsbGJhY2soQGRvQmFja2dyb3VuZFdvcmspXG4gICAgQGRpc3Bvc2FibGVzLmFkZCBuZXcgRGlzcG9zYWJsZSA9PlxuICAgICAgY2FuY2VsSWRsZUNhbGxiYWNrKEBiYWNrZ3JvdW5kV29ya0hhbmRsZSkgaWYgQGJhY2tncm91bmRXb3JrSGFuZGxlP1xuXG4gICAgQGRpc3BsYXlMYXllci5zZXRUZXh0RGVjb3JhdGlvbkxheWVyKEB0b2tlbml6ZWRCdWZmZXIpXG4gICAgQGRlZmF1bHRNYXJrZXJMYXllciA9IEBkaXNwbGF5TGF5ZXIuYWRkTWFya2VyTGF5ZXIoKVxuICAgIEBkaXNwb3NhYmxlcy5hZGQoQGRlZmF1bHRNYXJrZXJMYXllci5vbkRpZERlc3Ryb3kgPT5cbiAgICAgIEBhc3NlcnQoZmFsc2UsIFwiZGVmYXVsdE1hcmtlckxheWVyIGRlc3Ryb3llZCBhdCBhbiB1bmV4cGVjdGVkIHRpbWVcIilcbiAgICApXG4gICAgQHNlbGVjdGlvbnNNYXJrZXJMYXllciA/PSBAYWRkTWFya2VyTGF5ZXIobWFpbnRhaW5IaXN0b3J5OiB0cnVlLCBwZXJzaXN0ZW50OiB0cnVlKVxuICAgIEBzZWxlY3Rpb25zTWFya2VyTGF5ZXIudHJhY2tEZXN0cnVjdGlvbkluT25EaWRDcmVhdGVNYXJrZXJDYWxsYmFja3MgPSB0cnVlXG5cbiAgICBAZGVjb3JhdGlvbk1hbmFnZXIgPSBuZXcgRGVjb3JhdGlvbk1hbmFnZXIoQGRpc3BsYXlMYXllcilcbiAgICBAZGVjb3JhdGVNYXJrZXJMYXllcihAZGlzcGxheUxheWVyLmZvbGRzTWFya2VyTGF5ZXIsIHt0eXBlOiAnbGluZS1udW1iZXInLCBjbGFzczogJ2ZvbGRlZCd9KVxuXG4gICAgZm9yIG1hcmtlciBpbiBAc2VsZWN0aW9uc01hcmtlckxheWVyLmdldE1hcmtlcnMoKVxuICAgICAgQGFkZFNlbGVjdGlvbihtYXJrZXIpXG5cbiAgICBAc3Vic2NyaWJlVG9CdWZmZXIoKVxuICAgIEBzdWJzY3JpYmVUb0Rpc3BsYXlMYXllcigpXG5cbiAgICBpZiBAY3Vyc29ycy5sZW5ndGggaXMgMCBhbmQgbm90IHN1cHByZXNzQ3Vyc29yQ3JlYXRpb25cbiAgICAgIGluaXRpYWxMaW5lID0gTWF0aC5tYXgocGFyc2VJbnQoaW5pdGlhbExpbmUpIG9yIDAsIDApXG4gICAgICBpbml0aWFsQ29sdW1uID0gTWF0aC5tYXgocGFyc2VJbnQoaW5pdGlhbENvbHVtbikgb3IgMCwgMClcbiAgICAgIEBhZGRDdXJzb3JBdEJ1ZmZlclBvc2l0aW9uKFtpbml0aWFsTGluZSwgaW5pdGlhbENvbHVtbl0pXG5cbiAgICBAbGFuZ3VhZ2VNb2RlID0gbmV3IExhbmd1YWdlTW9kZSh0aGlzKVxuXG4gICAgQGd1dHRlckNvbnRhaW5lciA9IG5ldyBHdXR0ZXJDb250YWluZXIodGhpcylcbiAgICBAbGluZU51bWJlckd1dHRlciA9IEBndXR0ZXJDb250YWluZXIuYWRkR3V0dGVyXG4gICAgICBuYW1lOiAnbGluZS1udW1iZXInXG4gICAgICBwcmlvcml0eTogMFxuICAgICAgdmlzaWJsZTogbGluZU51bWJlckd1dHRlclZpc2libGVcblxuICBkb0JhY2tncm91bmRXb3JrOiAoZGVhZGxpbmUpID0+XG4gICAgaWYgQGRpc3BsYXlMYXllci5kb0JhY2tncm91bmRXb3JrKGRlYWRsaW5lKVxuICAgICAgQHByZXNlbnRlcj8udXBkYXRlVmVydGljYWxEaW1lbnNpb25zKClcbiAgICAgIEBiYWNrZ3JvdW5kV29ya0hhbmRsZSA9IHJlcXVlc3RJZGxlQ2FsbGJhY2soQGRvQmFja2dyb3VuZFdvcmspXG4gICAgZWxzZVxuICAgICAgQGJhY2tncm91bmRXb3JrSGFuZGxlID0gbnVsbFxuXG4gIHVwZGF0ZTogKHBhcmFtcykgLT5cbiAgICBkaXNwbGF5TGF5ZXJQYXJhbXMgPSB7fVxuXG4gICAgZm9yIHBhcmFtIGluIE9iamVjdC5rZXlzKHBhcmFtcylcbiAgICAgIHZhbHVlID0gcGFyYW1zW3BhcmFtXVxuXG4gICAgICBzd2l0Y2ggcGFyYW1cbiAgICAgICAgd2hlbiAnYXV0b0luZGVudCdcbiAgICAgICAgICBAYXV0b0luZGVudCA9IHZhbHVlXG5cbiAgICAgICAgd2hlbiAnYXV0b0luZGVudE9uUGFzdGUnXG4gICAgICAgICAgQGF1dG9JbmRlbnRPblBhc3RlID0gdmFsdWVcblxuICAgICAgICB3aGVuICd1bmRvR3JvdXBpbmdJbnRlcnZhbCdcbiAgICAgICAgICBAdW5kb0dyb3VwaW5nSW50ZXJ2YWwgPSB2YWx1ZVxuXG4gICAgICAgIHdoZW4gJ25vbldvcmRDaGFyYWN0ZXJzJ1xuICAgICAgICAgIEBub25Xb3JkQ2hhcmFjdGVycyA9IHZhbHVlXG5cbiAgICAgICAgd2hlbiAnc2Nyb2xsU2Vuc2l0aXZpdHknXG4gICAgICAgICAgQHNjcm9sbFNlbnNpdGl2aXR5ID0gdmFsdWVcblxuICAgICAgICB3aGVuICdlbmNvZGluZydcbiAgICAgICAgICBAYnVmZmVyLnNldEVuY29kaW5nKHZhbHVlKVxuXG4gICAgICAgIHdoZW4gJ3NvZnRUYWJzJ1xuICAgICAgICAgIGlmIHZhbHVlIGlzbnQgQHNvZnRUYWJzXG4gICAgICAgICAgICBAc29mdFRhYnMgPSB2YWx1ZVxuXG4gICAgICAgIHdoZW4gJ2F0b21pY1NvZnRUYWJzJ1xuICAgICAgICAgIGlmIHZhbHVlIGlzbnQgQGRpc3BsYXlMYXllci5hdG9taWNTb2Z0VGFic1xuICAgICAgICAgICAgZGlzcGxheUxheWVyUGFyYW1zLmF0b21pY1NvZnRUYWJzID0gdmFsdWVcblxuICAgICAgICB3aGVuICd0YWJMZW5ndGgnXG4gICAgICAgICAgaWYgdmFsdWU/IGFuZCB2YWx1ZSBpc250IEB0b2tlbml6ZWRCdWZmZXIuZ2V0VGFiTGVuZ3RoKClcbiAgICAgICAgICAgIEB0b2tlbml6ZWRCdWZmZXIuc2V0VGFiTGVuZ3RoKHZhbHVlKVxuICAgICAgICAgICAgZGlzcGxheUxheWVyUGFyYW1zLnRhYkxlbmd0aCA9IHZhbHVlXG5cbiAgICAgICAgd2hlbiAnc29mdFdyYXBwZWQnXG4gICAgICAgICAgaWYgdmFsdWUgaXNudCBAc29mdFdyYXBwZWRcbiAgICAgICAgICAgIEBzb2Z0V3JhcHBlZCA9IHZhbHVlXG4gICAgICAgICAgICBkaXNwbGF5TGF5ZXJQYXJhbXMuc29mdFdyYXBDb2x1bW4gPSBAZ2V0U29mdFdyYXBDb2x1bW4oKVxuICAgICAgICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWNoYW5nZS1zb2Z0LXdyYXBwZWQnLCBAaXNTb2Z0V3JhcHBlZCgpXG5cbiAgICAgICAgd2hlbiAnc29mdFdyYXBIYW5naW5nSW5kZW50TGVuZ3RoJ1xuICAgICAgICAgIGlmIHZhbHVlIGlzbnQgQGRpc3BsYXlMYXllci5zb2Z0V3JhcEhhbmdpbmdJbmRlbnRcbiAgICAgICAgICAgIGRpc3BsYXlMYXllclBhcmFtcy5zb2Z0V3JhcEhhbmdpbmdJbmRlbnQgPSB2YWx1ZVxuXG4gICAgICAgIHdoZW4gJ3NvZnRXcmFwQXRQcmVmZXJyZWRMaW5lTGVuZ3RoJ1xuICAgICAgICAgIGlmIHZhbHVlIGlzbnQgQHNvZnRXcmFwQXRQcmVmZXJyZWRMaW5lTGVuZ3RoXG4gICAgICAgICAgICBAc29mdFdyYXBBdFByZWZlcnJlZExpbmVMZW5ndGggPSB2YWx1ZVxuICAgICAgICAgICAgZGlzcGxheUxheWVyUGFyYW1zLnNvZnRXcmFwQ29sdW1uID0gQGdldFNvZnRXcmFwQ29sdW1uKClcblxuICAgICAgICB3aGVuICdwcmVmZXJyZWRMaW5lTGVuZ3RoJ1xuICAgICAgICAgIGlmIHZhbHVlIGlzbnQgQHByZWZlcnJlZExpbmVMZW5ndGhcbiAgICAgICAgICAgIEBwcmVmZXJyZWRMaW5lTGVuZ3RoID0gdmFsdWVcbiAgICAgICAgICAgIGRpc3BsYXlMYXllclBhcmFtcy5zb2Z0V3JhcENvbHVtbiA9IEBnZXRTb2Z0V3JhcENvbHVtbigpXG5cbiAgICAgICAgd2hlbiAnbWluaSdcbiAgICAgICAgICBpZiB2YWx1ZSBpc250IEBtaW5pXG4gICAgICAgICAgICBAbWluaSA9IHZhbHVlXG4gICAgICAgICAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLW1pbmknLCB2YWx1ZVxuICAgICAgICAgICAgZGlzcGxheUxheWVyUGFyYW1zLmludmlzaWJsZXMgPSBAZ2V0SW52aXNpYmxlcygpXG4gICAgICAgICAgICBkaXNwbGF5TGF5ZXJQYXJhbXMuc29mdFdyYXBDb2x1bW4gPSBAZ2V0U29mdFdyYXBDb2x1bW4oKVxuICAgICAgICAgICAgZGlzcGxheUxheWVyUGFyYW1zLnNob3dJbmRlbnRHdWlkZXMgPSBAZG9lc1Nob3dJbmRlbnRHdWlkZSgpXG5cbiAgICAgICAgd2hlbiAncGxhY2Vob2xkZXJUZXh0J1xuICAgICAgICAgIGlmIHZhbHVlIGlzbnQgQHBsYWNlaG9sZGVyVGV4dFxuICAgICAgICAgICAgQHBsYWNlaG9sZGVyVGV4dCA9IHZhbHVlXG4gICAgICAgICAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLXBsYWNlaG9sZGVyLXRleHQnLCB2YWx1ZVxuXG4gICAgICAgIHdoZW4gJ2xpbmVOdW1iZXJHdXR0ZXJWaXNpYmxlJ1xuICAgICAgICAgIGlmIHZhbHVlIGlzbnQgQGxpbmVOdW1iZXJHdXR0ZXJWaXNpYmxlXG4gICAgICAgICAgICBpZiB2YWx1ZVxuICAgICAgICAgICAgICBAbGluZU51bWJlckd1dHRlci5zaG93KClcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgQGxpbmVOdW1iZXJHdXR0ZXIuaGlkZSgpXG4gICAgICAgICAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLWxpbmUtbnVtYmVyLWd1dHRlci12aXNpYmxlJywgQGxpbmVOdW1iZXJHdXR0ZXIuaXNWaXNpYmxlKClcblxuICAgICAgICB3aGVuICdzaG93SW5kZW50R3VpZGUnXG4gICAgICAgICAgaWYgdmFsdWUgaXNudCBAc2hvd0luZGVudEd1aWRlXG4gICAgICAgICAgICBAc2hvd0luZGVudEd1aWRlID0gdmFsdWVcbiAgICAgICAgICAgIGRpc3BsYXlMYXllclBhcmFtcy5zaG93SW5kZW50R3VpZGVzID0gQGRvZXNTaG93SW5kZW50R3VpZGUoKVxuXG4gICAgICAgIHdoZW4gJ3Nob3dMaW5lTnVtYmVycydcbiAgICAgICAgICBpZiB2YWx1ZSBpc250IEBzaG93TGluZU51bWJlcnNcbiAgICAgICAgICAgIEBzaG93TGluZU51bWJlcnMgPSB2YWx1ZVxuICAgICAgICAgICAgQHByZXNlbnRlcj8uZGlkQ2hhbmdlU2hvd0xpbmVOdW1iZXJzKClcblxuICAgICAgICB3aGVuICdzaG93SW52aXNpYmxlcydcbiAgICAgICAgICBpZiB2YWx1ZSBpc250IEBzaG93SW52aXNpYmxlc1xuICAgICAgICAgICAgQHNob3dJbnZpc2libGVzID0gdmFsdWVcbiAgICAgICAgICAgIGRpc3BsYXlMYXllclBhcmFtcy5pbnZpc2libGVzID0gQGdldEludmlzaWJsZXMoKVxuXG4gICAgICAgIHdoZW4gJ2ludmlzaWJsZXMnXG4gICAgICAgICAgaWYgbm90IF8uaXNFcXVhbCh2YWx1ZSwgQGludmlzaWJsZXMpXG4gICAgICAgICAgICBAaW52aXNpYmxlcyA9IHZhbHVlXG4gICAgICAgICAgICBkaXNwbGF5TGF5ZXJQYXJhbXMuaW52aXNpYmxlcyA9IEBnZXRJbnZpc2libGVzKClcblxuICAgICAgICB3aGVuICdlZGl0b3JXaWR0aEluQ2hhcnMnXG4gICAgICAgICAgaWYgdmFsdWUgPiAwIGFuZCB2YWx1ZSBpc250IEBlZGl0b3JXaWR0aEluQ2hhcnNcbiAgICAgICAgICAgIEBlZGl0b3JXaWR0aEluQ2hhcnMgPSB2YWx1ZVxuICAgICAgICAgICAgZGlzcGxheUxheWVyUGFyYW1zLnNvZnRXcmFwQ29sdW1uID0gQGdldFNvZnRXcmFwQ29sdW1uKClcblxuICAgICAgICB3aGVuICd3aWR0aCdcbiAgICAgICAgICBpZiB2YWx1ZSBpc250IEB3aWR0aFxuICAgICAgICAgICAgQHdpZHRoID0gdmFsdWVcbiAgICAgICAgICAgIGRpc3BsYXlMYXllclBhcmFtcy5zb2Z0V3JhcENvbHVtbiA9IEBnZXRTb2Z0V3JhcENvbHVtbigpXG5cbiAgICAgICAgd2hlbiAnc2Nyb2xsUGFzdEVuZCdcbiAgICAgICAgICBpZiB2YWx1ZSBpc250IEBzY3JvbGxQYXN0RW5kXG4gICAgICAgICAgICBAc2Nyb2xsUGFzdEVuZCA9IHZhbHVlXG4gICAgICAgICAgICBAcHJlc2VudGVyPy5kaWRDaGFuZ2VTY3JvbGxQYXN0RW5kKClcblxuICAgICAgICB3aGVuICdhdXRvSGVpZ2h0J1xuICAgICAgICAgIGlmIHZhbHVlIGlzbnQgQGF1dG9IZWlnaHRcbiAgICAgICAgICAgIEBhdXRvSGVpZ2h0ID0gdmFsdWVcbiAgICAgICAgICAgIEBwcmVzZW50ZXI/LnNldEF1dG9IZWlnaHQoQGF1dG9IZWlnaHQpXG5cbiAgICAgICAgd2hlbiAnYXV0b1dpZHRoJ1xuICAgICAgICAgIGlmIHZhbHVlIGlzbnQgQGF1dG9XaWR0aFxuICAgICAgICAgICAgQGF1dG9XaWR0aCA9IHZhbHVlXG4gICAgICAgICAgICBAcHJlc2VudGVyPy5kaWRDaGFuZ2VBdXRvV2lkdGgoKVxuXG4gICAgICAgIHdoZW4gJ3Nob3dDdXJzb3JPblNlbGVjdGlvbidcbiAgICAgICAgICBpZiB2YWx1ZSBpc250IEBzaG93Q3Vyc29yT25TZWxlY3Rpb25cbiAgICAgICAgICAgIEBzaG93Q3Vyc29yT25TZWxlY3Rpb24gPSB2YWx1ZVxuICAgICAgICAgICAgY3Vyc29yLnNldFNob3dDdXJzb3JPblNlbGVjdGlvbih2YWx1ZSkgZm9yIGN1cnNvciBpbiBAZ2V0Q3Vyc29ycygpXG5cbiAgICAgICAgZWxzZVxuICAgICAgICAgIGlmIHBhcmFtIGlzbnQgJ3JlZicgYW5kIHBhcmFtIGlzbnQgJ2tleSdcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIFRleHRFZGl0b3IgcGFyYW1ldGVyOiAnI3twYXJhbX0nXCIpXG5cbiAgICBAZGlzcGxheUxheWVyLnJlc2V0KGRpc3BsYXlMYXllclBhcmFtcylcblxuICAgIGlmIEBlZGl0b3JFbGVtZW50P1xuICAgICAgQGVkaXRvckVsZW1lbnQudmlld3MuZ2V0TmV4dFVwZGF0ZVByb21pc2UoKVxuICAgIGVsc2VcbiAgICAgIFByb21pc2UucmVzb2x2ZSgpXG5cbiAgc2VyaWFsaXplOiAtPlxuICAgIHRva2VuaXplZEJ1ZmZlclN0YXRlID0gQHRva2VuaXplZEJ1ZmZlci5zZXJpYWxpemUoKVxuXG4gICAge1xuICAgICAgZGVzZXJpYWxpemVyOiAnVGV4dEVkaXRvcidcbiAgICAgIHZlcnNpb246IEBzZXJpYWxpemF0aW9uVmVyc2lvblxuXG4gICAgICAjIFRPRE86IFJlbW92ZSB0aGlzIGZvcndhcmQtY29tcGF0aWJsZSBmYWxsYmFjayBvbmNlIDEuOCByZWFjaGVzIHN0YWJsZS5cbiAgICAgIGRpc3BsYXlCdWZmZXI6IHt0b2tlbml6ZWRCdWZmZXI6IHRva2VuaXplZEJ1ZmZlclN0YXRlfVxuXG4gICAgICB0b2tlbml6ZWRCdWZmZXI6IHRva2VuaXplZEJ1ZmZlclN0YXRlXG4gICAgICBkaXNwbGF5TGF5ZXJJZDogQGRpc3BsYXlMYXllci5pZFxuICAgICAgc2VsZWN0aW9uc01hcmtlckxheWVySWQ6IEBzZWxlY3Rpb25zTWFya2VyTGF5ZXIuaWRcblxuICAgICAgZmlyc3RWaXNpYmxlU2NyZWVuUm93OiBAZ2V0Rmlyc3RWaXNpYmxlU2NyZWVuUm93KClcbiAgICAgIGZpcnN0VmlzaWJsZVNjcmVlbkNvbHVtbjogQGdldEZpcnN0VmlzaWJsZVNjcmVlbkNvbHVtbigpXG5cbiAgICAgIGF0b21pY1NvZnRUYWJzOiBAZGlzcGxheUxheWVyLmF0b21pY1NvZnRUYWJzXG4gICAgICBzb2Z0V3JhcEhhbmdpbmdJbmRlbnRMZW5ndGg6IEBkaXNwbGF5TGF5ZXIuc29mdFdyYXBIYW5naW5nSW5kZW50XG5cbiAgICAgIEBpZCwgQHNvZnRUYWJzLCBAc29mdFdyYXBwZWQsIEBzb2Z0V3JhcEF0UHJlZmVycmVkTGluZUxlbmd0aCxcbiAgICAgIEBwcmVmZXJyZWRMaW5lTGVuZ3RoLCBAbWluaSwgQGVkaXRvcldpZHRoSW5DaGFycywgQHdpZHRoLCBAbGFyZ2VGaWxlTW9kZSxcbiAgICAgIEByZWdpc3RlcmVkLCBAaW52aXNpYmxlcywgQHNob3dJbnZpc2libGVzLCBAc2hvd0luZGVudEd1aWRlLCBAYXV0b0hlaWdodCwgQGF1dG9XaWR0aFxuICAgIH1cblxuICBzdWJzY3JpYmVUb0J1ZmZlcjogLT5cbiAgICBAYnVmZmVyLnJldGFpbigpXG4gICAgQGRpc3Bvc2FibGVzLmFkZCBAYnVmZmVyLm9uRGlkQ2hhbmdlUGF0aCA9PlxuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWNoYW5nZS10aXRsZScsIEBnZXRUaXRsZSgpXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLXBhdGgnLCBAZ2V0UGF0aCgpXG4gICAgQGRpc3Bvc2FibGVzLmFkZCBAYnVmZmVyLm9uRGlkQ2hhbmdlRW5jb2RpbmcgPT5cbiAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2UtZW5jb2RpbmcnLCBAZ2V0RW5jb2RpbmcoKVxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQGJ1ZmZlci5vbkRpZERlc3Ryb3kgPT4gQGRlc3Ryb3koKVxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQGJ1ZmZlci5vbkRpZENoYW5nZU1vZGlmaWVkID0+XG4gICAgICBAdGVybWluYXRlUGVuZGluZ1N0YXRlKCkgaWYgbm90IEBoYXNUZXJtaW5hdGVkUGVuZGluZ1N0YXRlIGFuZCBAYnVmZmVyLmlzTW9kaWZpZWQoKVxuXG4gICAgQHByZXNlcnZlQ3Vyc29yUG9zaXRpb25PbkJ1ZmZlclJlbG9hZCgpXG5cbiAgdGVybWluYXRlUGVuZGluZ1N0YXRlOiAtPlxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC10ZXJtaW5hdGUtcGVuZGluZy1zdGF0ZScgaWYgbm90IEBoYXNUZXJtaW5hdGVkUGVuZGluZ1N0YXRlXG4gICAgQGhhc1Rlcm1pbmF0ZWRQZW5kaW5nU3RhdGUgPSB0cnVlXG5cbiAgb25EaWRUZXJtaW5hdGVQZW5kaW5nU3RhdGU6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLXRlcm1pbmF0ZS1wZW5kaW5nLXN0YXRlJywgY2FsbGJhY2tcblxuICBzdWJzY3JpYmVUb0Rpc3BsYXlMYXllcjogLT5cbiAgICBAZGlzcG9zYWJsZXMuYWRkIEBzZWxlY3Rpb25zTWFya2VyTGF5ZXIub25EaWRDcmVhdGVNYXJrZXIgQGFkZFNlbGVjdGlvbi5iaW5kKHRoaXMpXG4gICAgQGRpc3Bvc2FibGVzLmFkZCBAdG9rZW5pemVkQnVmZmVyLm9uRGlkQ2hhbmdlR3JhbW1hciBAaGFuZGxlR3JhbW1hckNoYW5nZS5iaW5kKHRoaXMpXG4gICAgQGRpc3Bvc2FibGVzLmFkZCBAZGlzcGxheUxheWVyLm9uRGlkQ2hhbmdlU3luYyAoZSkgPT5cbiAgICAgIEBtZXJnZUludGVyc2VjdGluZ1NlbGVjdGlvbnMoKVxuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWNoYW5nZScsIGVcbiAgICBAZGlzcG9zYWJsZXMuYWRkIEBkaXNwbGF5TGF5ZXIub25EaWRSZXNldCA9PlxuICAgICAgQG1lcmdlSW50ZXJzZWN0aW5nU2VsZWN0aW9ucygpXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlJywge31cblxuICBkZXN0cm95ZWQ6IC0+XG4gICAgQGRpc3Bvc2FibGVzLmRpc3Bvc2UoKVxuICAgIEBkaXNwbGF5TGF5ZXIuZGVzdHJveSgpXG4gICAgQHRva2VuaXplZEJ1ZmZlci5kZXN0cm95KClcbiAgICBzZWxlY3Rpb24uZGVzdHJveSgpIGZvciBzZWxlY3Rpb24gaW4gQHNlbGVjdGlvbnMuc2xpY2UoKVxuICAgIEBidWZmZXIucmVsZWFzZSgpXG4gICAgQGxhbmd1YWdlTW9kZS5kZXN0cm95KClcbiAgICBAZ3V0dGVyQ29udGFpbmVyLmRlc3Ryb3koKVxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1kZXN0cm95J1xuICAgIEBlbWl0dGVyLmNsZWFyKClcbiAgICBAZWRpdG9yRWxlbWVudCA9IG51bGxcbiAgICBAcHJlc2VudGVyID0gbnVsbFxuXG4gICMjI1xuICBTZWN0aW9uOiBFdmVudCBTdWJzY3JpcHRpb25cbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCB3aGVuIHRoZSBidWZmZXIncyB0aXRsZSBoYXMgY2hhbmdlZC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZVRpdGxlOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UtdGl0bGUnLCBjYWxsYmFja1xuXG4gICMgRXNzZW50aWFsOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiB0aGUgYnVmZmVyJ3MgcGF0aCwgYW5kIHRoZXJlZm9yZSB0aXRsZSwgaGFzIGNoYW5nZWQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VQYXRoOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UtcGF0aCcsIGNhbGxiYWNrXG5cbiAgIyBFc3NlbnRpYWw6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgc3luY2hyb25vdXNseSB3aGVuIHRoZSBjb250ZW50IG9mIHRoZVxuICAjIGJ1ZmZlciBjaGFuZ2VzLlxuICAjXG4gICMgQmVjYXVzZSBvYnNlcnZlcnMgYXJlIGludm9rZWQgc3luY2hyb25vdXNseSwgaXQncyBpbXBvcnRhbnQgbm90IHRvIHBlcmZvcm1cbiAgIyBhbnkgZXhwZW5zaXZlIG9wZXJhdGlvbnMgdmlhIHRoaXMgbWV0aG9kLiBDb25zaWRlciB7OjpvbkRpZFN0b3BDaGFuZ2luZ30gdG9cbiAgIyBkZWxheSBleHBlbnNpdmUgb3BlcmF0aW9ucyB1bnRpbCBhZnRlciBjaGFuZ2VzIHN0b3Agb2NjdXJyaW5nLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQ2hhbmdlOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UnLCBjYWxsYmFja1xuXG4gICMgRXNzZW50aWFsOiBJbnZva2UgYGNhbGxiYWNrYCB3aGVuIHRoZSBidWZmZXIncyBjb250ZW50cyBjaGFuZ2UuIEl0IGlzXG4gICMgZW1pdCBhc3luY2hyb25vdXNseSAzMDBtcyBhZnRlciB0aGUgbGFzdCBidWZmZXIgY2hhbmdlLiBUaGlzIGlzIGEgZ29vZCBwbGFjZVxuICAjIHRvIGhhbmRsZSBjaGFuZ2VzIHRvIHRoZSBidWZmZXIgd2l0aG91dCBjb21wcm9taXNpbmcgdHlwaW5nIHBlcmZvcm1hbmNlLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkU3RvcENoYW5naW5nOiAoY2FsbGJhY2spIC0+XG4gICAgQGdldEJ1ZmZlcigpLm9uRGlkU3RvcENoYW5naW5nKGNhbGxiYWNrKVxuXG4gICMgRXNzZW50aWFsOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiBhIHtDdXJzb3J9IGlzIG1vdmVkLiBJZiB0aGVyZSBhcmVcbiAgIyBtdWx0aXBsZSBjdXJzb3JzLCB5b3VyIGNhbGxiYWNrIHdpbGwgYmUgY2FsbGVkIGZvciBlYWNoIGN1cnNvci5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBldmVudGAge09iamVjdH1cbiAgIyAgICAgKiBgb2xkQnVmZmVyUG9zaXRpb25gIHtQb2ludH1cbiAgIyAgICAgKiBgb2xkU2NyZWVuUG9zaXRpb25gIHtQb2ludH1cbiAgIyAgICAgKiBgbmV3QnVmZmVyUG9zaXRpb25gIHtQb2ludH1cbiAgIyAgICAgKiBgbmV3U2NyZWVuUG9zaXRpb25gIHtQb2ludH1cbiAgIyAgICAgKiBgdGV4dENoYW5nZWRgIHtCb29sZWFufVxuICAjICAgICAqIGBjdXJzb3JgIHtDdXJzb3J9IHRoYXQgdHJpZ2dlcmVkIHRoZSBldmVudFxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VDdXJzb3JQb3NpdGlvbjogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLWN1cnNvci1wb3NpdGlvbicsIGNhbGxiYWNrXG5cbiAgIyBFc3NlbnRpYWw6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCB3aGVuIGEgc2VsZWN0aW9uJ3Mgc2NyZWVuIHJhbmdlIGNoYW5nZXMuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjICAgKiBgZXZlbnRgIHtPYmplY3R9XG4gICMgICAgICogYG9sZEJ1ZmZlclJhbmdlYCB7UmFuZ2V9XG4gICMgICAgICogYG9sZFNjcmVlblJhbmdlYCB7UmFuZ2V9XG4gICMgICAgICogYG5ld0J1ZmZlclJhbmdlYCB7UmFuZ2V9XG4gICMgICAgICogYG5ld1NjcmVlblJhbmdlYCB7UmFuZ2V9XG4gICMgICAgICogYHNlbGVjdGlvbmAge1NlbGVjdGlvbn0gdGhhdCB0cmlnZ2VyZWQgdGhlIGV2ZW50XG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZVNlbGVjdGlvblJhbmdlOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2Utc2VsZWN0aW9uLXJhbmdlJywgY2FsbGJhY2tcblxuICAjIEV4dGVuZGVkOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiBzb2Z0IHdyYXAgd2FzIGVuYWJsZWQgb3IgZGlzYWJsZWQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VTb2Z0V3JhcHBlZDogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLXNvZnQtd3JhcHBlZCcsIGNhbGxiYWNrXG5cbiAgIyBFeHRlbmRlZDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gdGhlIGJ1ZmZlcidzIGVuY29kaW5nIGhhcyBjaGFuZ2VkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQ2hhbmdlRW5jb2Rpbmc6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWNoYW5nZS1lbmNvZGluZycsIGNhbGxiYWNrXG5cbiAgIyBFeHRlbmRlZDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gdGhlIGdyYW1tYXIgdGhhdCBpbnRlcnByZXRzIGFuZFxuICAjIGNvbG9yaXplcyB0aGUgdGV4dCBoYXMgYmVlbiBjaGFuZ2VkLiBJbW1lZGlhdGVseSBjYWxscyB5b3VyIGNhbGxiYWNrIHdpdGhcbiAgIyB0aGUgY3VycmVudCBncmFtbWFyLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGdyYW1tYXJgIHtHcmFtbWFyfVxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb2JzZXJ2ZUdyYW1tYXI6IChjYWxsYmFjaykgLT5cbiAgICBjYWxsYmFjayhAZ2V0R3JhbW1hcigpKVxuICAgIEBvbkRpZENoYW5nZUdyYW1tYXIoY2FsbGJhY2spXG5cbiAgIyBFeHRlbmRlZDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gdGhlIGdyYW1tYXIgdGhhdCBpbnRlcnByZXRzIGFuZFxuICAjIGNvbG9yaXplcyB0aGUgdGV4dCBoYXMgYmVlbiBjaGFuZ2VkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGdyYW1tYXJgIHtHcmFtbWFyfVxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VHcmFtbWFyOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UtZ3JhbW1hcicsIGNhbGxiYWNrXG5cbiAgIyBFeHRlbmRlZDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gdGhlIHJlc3VsdCBvZiB7Ojppc01vZGlmaWVkfSBjaGFuZ2VzLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQ2hhbmdlTW9kaWZpZWQ6IChjYWxsYmFjaykgLT5cbiAgICBAZ2V0QnVmZmVyKCkub25EaWRDaGFuZ2VNb2RpZmllZChjYWxsYmFjaylcblxuICAjIEV4dGVuZGVkOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiB0aGUgYnVmZmVyJ3MgdW5kZXJseWluZyBmaWxlIGNoYW5nZXMgb25cbiAgIyBkaXNrIGF0IGEgbW9tZW50IHdoZW4gdGhlIHJlc3VsdCBvZiB7Ojppc01vZGlmaWVkfSBpcyB0cnVlLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQ29uZmxpY3Q6IChjYWxsYmFjaykgLT5cbiAgICBAZ2V0QnVmZmVyKCkub25EaWRDb25mbGljdChjYWxsYmFjaylcblxuICAjIEV4dGVuZGVkOiBDYWxscyB5b3VyIGBjYWxsYmFja2AgYmVmb3JlIHRleHQgaGFzIGJlZW4gaW5zZXJ0ZWQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjICAgKiBgZXZlbnRgIGV2ZW50IHtPYmplY3R9XG4gICMgICAgICogYHRleHRgIHtTdHJpbmd9IHRleHQgdG8gYmUgaW5zZXJ0ZWRcbiAgIyAgICAgKiBgY2FuY2VsYCB7RnVuY3Rpb259IENhbGwgdG8gcHJldmVudCB0aGUgdGV4dCBmcm9tIGJlaW5nIGluc2VydGVkXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbldpbGxJbnNlcnRUZXh0OiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ3dpbGwtaW5zZXJ0LXRleHQnLCBjYWxsYmFja1xuXG4gICMgRXh0ZW5kZWQ6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCBhZnRlciB0ZXh0IGhhcyBiZWVuIGluc2VydGVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGV2ZW50YCBldmVudCB7T2JqZWN0fVxuICAjICAgICAqIGB0ZXh0YCB7U3RyaW5nfSB0ZXh0IHRvIGJlIGluc2VydGVkXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZEluc2VydFRleHQ6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWluc2VydC10ZXh0JywgY2FsbGJhY2tcblxuICAjIEVzc2VudGlhbDogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayBhZnRlciB0aGUgYnVmZmVyIGlzIHNhdmVkIHRvIGRpc2suXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGJ1ZmZlciBpcyBzYXZlZC5cbiAgIyAgICogYGV2ZW50YCB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICAgKiBgcGF0aGAgVGhlIHBhdGggdG8gd2hpY2ggdGhlIGJ1ZmZlciB3YXMgc2F2ZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZFNhdmU6IChjYWxsYmFjaykgLT5cbiAgICBAZ2V0QnVmZmVyKCkub25EaWRTYXZlKGNhbGxiYWNrKVxuXG4gICMgRXNzZW50aWFsOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gdGhlIGVkaXRvciBpcyBkZXN0cm95ZWQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2hlbiB0aGUgZWRpdG9yIGlzIGRlc3Ryb3llZC5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkRGVzdHJveTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtZGVzdHJveScsIGNhbGxiYWNrXG5cbiAgIyBFeHRlbmRlZDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gYSB7Q3Vyc29yfSBpcyBhZGRlZCB0byB0aGUgZWRpdG9yLlxuICAjIEltbWVkaWF0ZWx5IGNhbGxzIHlvdXIgY2FsbGJhY2sgZm9yIGVhY2ggZXhpc3RpbmcgY3Vyc29yLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGN1cnNvcmAge0N1cnNvcn0gdGhhdCB3YXMgYWRkZWRcbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9ic2VydmVDdXJzb3JzOiAoY2FsbGJhY2spIC0+XG4gICAgY2FsbGJhY2soY3Vyc29yKSBmb3IgY3Vyc29yIGluIEBnZXRDdXJzb3JzKClcbiAgICBAb25EaWRBZGRDdXJzb3IoY2FsbGJhY2spXG5cbiAgIyBFeHRlbmRlZDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gYSB7Q3Vyc29yfSBpcyBhZGRlZCB0byB0aGUgZWRpdG9yLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGN1cnNvcmAge0N1cnNvcn0gdGhhdCB3YXMgYWRkZWRcbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQWRkQ3Vyc29yOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1hZGQtY3Vyc29yJywgY2FsbGJhY2tcblxuICAjIEV4dGVuZGVkOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiBhIHtDdXJzb3J9IGlzIHJlbW92ZWQgZnJvbSB0aGUgZWRpdG9yLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGN1cnNvcmAge0N1cnNvcn0gdGhhdCB3YXMgcmVtb3ZlZFxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRSZW1vdmVDdXJzb3I6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLXJlbW92ZS1jdXJzb3InLCBjYWxsYmFja1xuXG4gICMgRXh0ZW5kZWQ6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCB3aGVuIGEge1NlbGVjdGlvbn0gaXMgYWRkZWQgdG8gdGhlIGVkaXRvci5cbiAgIyBJbW1lZGlhdGVseSBjYWxscyB5b3VyIGNhbGxiYWNrIGZvciBlYWNoIGV4aXN0aW5nIHNlbGVjdGlvbi5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBzZWxlY3Rpb25gIHtTZWxlY3Rpb259IHRoYXQgd2FzIGFkZGVkXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvYnNlcnZlU2VsZWN0aW9uczogKGNhbGxiYWNrKSAtPlxuICAgIGNhbGxiYWNrKHNlbGVjdGlvbikgZm9yIHNlbGVjdGlvbiBpbiBAZ2V0U2VsZWN0aW9ucygpXG4gICAgQG9uRGlkQWRkU2VsZWN0aW9uKGNhbGxiYWNrKVxuXG4gICMgRXh0ZW5kZWQ6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCB3aGVuIGEge1NlbGVjdGlvbn0gaXMgYWRkZWQgdG8gdGhlIGVkaXRvci5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBzZWxlY3Rpb25gIHtTZWxlY3Rpb259IHRoYXQgd2FzIGFkZGVkXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZEFkZFNlbGVjdGlvbjogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtYWRkLXNlbGVjdGlvbicsIGNhbGxiYWNrXG5cbiAgIyBFeHRlbmRlZDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gYSB7U2VsZWN0aW9ufSBpcyByZW1vdmVkIGZyb20gdGhlIGVkaXRvci5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBzZWxlY3Rpb25gIHtTZWxlY3Rpb259IHRoYXQgd2FzIHJlbW92ZWRcbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkUmVtb3ZlU2VsZWN0aW9uOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1yZW1vdmUtc2VsZWN0aW9uJywgY2FsbGJhY2tcblxuICAjIEV4dGVuZGVkOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2l0aCBlYWNoIHtEZWNvcmF0aW9ufSBhZGRlZCB0byB0aGUgZWRpdG9yLlxuICAjIENhbGxzIHlvdXIgYGNhbGxiYWNrYCBpbW1lZGlhdGVseSBmb3IgYW55IGV4aXN0aW5nIGRlY29yYXRpb25zLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGRlY29yYXRpb25gIHtEZWNvcmF0aW9ufVxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb2JzZXJ2ZURlY29yYXRpb25zOiAoY2FsbGJhY2spIC0+XG4gICAgQGRlY29yYXRpb25NYW5hZ2VyLm9ic2VydmVEZWNvcmF0aW9ucyhjYWxsYmFjaylcblxuICAjIEV4dGVuZGVkOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiBhIHtEZWNvcmF0aW9ufSBpcyBhZGRlZCB0byB0aGUgZWRpdG9yLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGRlY29yYXRpb25gIHtEZWNvcmF0aW9ufSB0aGF0IHdhcyBhZGRlZFxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRBZGREZWNvcmF0aW9uOiAoY2FsbGJhY2spIC0+XG4gICAgQGRlY29yYXRpb25NYW5hZ2VyLm9uRGlkQWRkRGVjb3JhdGlvbihjYWxsYmFjaylcblxuICAjIEV4dGVuZGVkOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiBhIHtEZWNvcmF0aW9ufSBpcyByZW1vdmVkIGZyb20gdGhlIGVkaXRvci5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBkZWNvcmF0aW9uYCB7RGVjb3JhdGlvbn0gdGhhdCB3YXMgcmVtb3ZlZFxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRSZW1vdmVEZWNvcmF0aW9uOiAoY2FsbGJhY2spIC0+XG4gICAgQGRlY29yYXRpb25NYW5hZ2VyLm9uRGlkUmVtb3ZlRGVjb3JhdGlvbihjYWxsYmFjaylcblxuICAjIEV4dGVuZGVkOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiB0aGUgcGxhY2Vob2xkZXIgdGV4dCBpcyBjaGFuZ2VkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYHBsYWNlaG9sZGVyVGV4dGAge1N0cmluZ30gbmV3IHRleHRcbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQ2hhbmdlUGxhY2Vob2xkZXJUZXh0OiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UtcGxhY2Vob2xkZXItdGV4dCcsIGNhbGxiYWNrXG5cbiAgb25EaWRDaGFuZ2VGaXJzdFZpc2libGVTY3JlZW5Sb3c6IChjYWxsYmFjaywgZnJvbVZpZXcpIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UtZmlyc3QtdmlzaWJsZS1zY3JlZW4tcm93JywgY2FsbGJhY2tcblxuICBvbkRpZENoYW5nZVNjcm9sbFRvcDogKGNhbGxiYWNrKSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6b25EaWRDaGFuZ2VTY3JvbGxUb3AgaW5zdGVhZC5cIilcblxuICAgIEBnZXRFbGVtZW50KCkub25EaWRDaGFuZ2VTY3JvbGxUb3AoY2FsbGJhY2spXG5cbiAgb25EaWRDaGFuZ2VTY3JvbGxMZWZ0OiAoY2FsbGJhY2spIC0+XG4gICAgR3JpbS5kZXByZWNhdGUoXCJUaGlzIGlzIG5vdyBhIHZpZXcgbWV0aG9kLiBDYWxsIFRleHRFZGl0b3JFbGVtZW50OjpvbkRpZENoYW5nZVNjcm9sbExlZnQgaW5zdGVhZC5cIilcblxuICAgIEBnZXRFbGVtZW50KCkub25EaWRDaGFuZ2VTY3JvbGxMZWZ0KGNhbGxiYWNrKVxuXG4gIG9uRGlkUmVxdWVzdEF1dG9zY3JvbGw6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLXJlcXVlc3QtYXV0b3Njcm9sbCcsIGNhbGxiYWNrXG5cbiAgIyBUT0RPIFJlbW92ZSBvbmNlIHRoZSB0YWJzIHBhY2thZ2Ugbm8gbG9uZ2VyIHVzZXMgLm9uIHN1YnNjcmlwdGlvbnNcbiAgb25EaWRDaGFuZ2VJY29uOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UtaWNvbicsIGNhbGxiYWNrXG5cbiAgb25EaWRVcGRhdGVEZWNvcmF0aW9uczogKGNhbGxiYWNrKSAtPlxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5vbkRpZFVwZGF0ZURlY29yYXRpb25zKGNhbGxiYWNrKVxuXG4gICMgRXNzZW50aWFsOiBSZXRyaWV2ZXMgdGhlIGN1cnJlbnQge1RleHRCdWZmZXJ9LlxuICBnZXRCdWZmZXI6IC0+IEBidWZmZXJcblxuICAjIFJldHJpZXZlcyB0aGUgY3VycmVudCBidWZmZXIncyBVUkkuXG4gIGdldFVSSTogLT4gQGJ1ZmZlci5nZXRVcmkoKVxuXG4gICMgQ3JlYXRlIGFuIHtUZXh0RWRpdG9yfSB3aXRoIGl0cyBpbml0aWFsIHN0YXRlIGJhc2VkIG9uIHRoaXMgb2JqZWN0XG4gIGNvcHk6IC0+XG4gICAgZGlzcGxheUxheWVyID0gQGRpc3BsYXlMYXllci5jb3B5KClcbiAgICBzZWxlY3Rpb25zTWFya2VyTGF5ZXIgPSBkaXNwbGF5TGF5ZXIuZ2V0TWFya2VyTGF5ZXIoQGJ1ZmZlci5nZXRNYXJrZXJMYXllcihAc2VsZWN0aW9uc01hcmtlckxheWVyLmlkKS5jb3B5KCkuaWQpXG4gICAgc29mdFRhYnMgPSBAZ2V0U29mdFRhYnMoKVxuICAgIG5ldyBUZXh0RWRpdG9yKHtcbiAgICAgIEBidWZmZXIsIHNlbGVjdGlvbnNNYXJrZXJMYXllciwgc29mdFRhYnMsXG4gICAgICBzdXBwcmVzc0N1cnNvckNyZWF0aW9uOiB0cnVlLFxuICAgICAgdGFiTGVuZ3RoOiBAdG9rZW5pemVkQnVmZmVyLmdldFRhYkxlbmd0aCgpLFxuICAgICAgQGZpcnN0VmlzaWJsZVNjcmVlblJvdywgQGZpcnN0VmlzaWJsZVNjcmVlbkNvbHVtbixcbiAgICAgIEBhc3NlcnQsIGRpc3BsYXlMYXllciwgZ3JhbW1hcjogQGdldEdyYW1tYXIoKSxcbiAgICAgIEBhdXRvV2lkdGgsIEBhdXRvSGVpZ2h0LCBAc2hvd0N1cnNvck9uU2VsZWN0aW9uXG4gICAgfSlcblxuICAjIENvbnRyb2xzIHZpc2liaWxpdHkgYmFzZWQgb24gdGhlIGdpdmVuIHtCb29sZWFufS5cbiAgc2V0VmlzaWJsZTogKHZpc2libGUpIC0+IEB0b2tlbml6ZWRCdWZmZXIuc2V0VmlzaWJsZSh2aXNpYmxlKVxuXG4gIHNldE1pbmk6IChtaW5pKSAtPlxuICAgIEB1cGRhdGUoe21pbml9KVxuICAgIEBtaW5pXG5cbiAgaXNNaW5pOiAtPiBAbWluaVxuXG4gIHNldFVwZGF0ZWRTeW5jaHJvbm91c2x5OiAodXBkYXRlZFN5bmNocm9ub3VzbHkpIC0+XG4gICAgQGRlY29yYXRpb25NYW5hZ2VyLnNldFVwZGF0ZWRTeW5jaHJvbm91c2x5KHVwZGF0ZWRTeW5jaHJvbm91c2x5KVxuXG4gIG9uRGlkQ2hhbmdlTWluaTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLW1pbmknLCBjYWxsYmFja1xuXG4gIHNldExpbmVOdW1iZXJHdXR0ZXJWaXNpYmxlOiAobGluZU51bWJlckd1dHRlclZpc2libGUpIC0+IEB1cGRhdGUoe2xpbmVOdW1iZXJHdXR0ZXJWaXNpYmxlfSlcblxuICBpc0xpbmVOdW1iZXJHdXR0ZXJWaXNpYmxlOiAtPiBAbGluZU51bWJlckd1dHRlci5pc1Zpc2libGUoKVxuXG4gIG9uRGlkQ2hhbmdlTGluZU51bWJlckd1dHRlclZpc2libGU6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWNoYW5nZS1saW5lLW51bWJlci1ndXR0ZXItdmlzaWJsZScsIGNhbGxiYWNrXG5cbiAgIyBFc3NlbnRpYWw6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCB3aGVuIGEge0d1dHRlcn0gaXMgYWRkZWQgdG8gdGhlIGVkaXRvci5cbiAgIyBJbW1lZGlhdGVseSBjYWxscyB5b3VyIGNhbGxiYWNrIGZvciBlYWNoIGV4aXN0aW5nIGd1dHRlci5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBndXR0ZXJgIHtHdXR0ZXJ9IHRoYXQgY3VycmVudGx5IGV4aXN0cy93YXMgYWRkZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvYnNlcnZlR3V0dGVyczogKGNhbGxiYWNrKSAtPlxuICAgIEBndXR0ZXJDb250YWluZXIub2JzZXJ2ZUd1dHRlcnMgY2FsbGJhY2tcblxuICAjIEVzc2VudGlhbDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gYSB7R3V0dGVyfSBpcyBhZGRlZCB0byB0aGUgZWRpdG9yLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGd1dHRlcmAge0d1dHRlcn0gdGhhdCB3YXMgYWRkZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZEFkZEd1dHRlcjogKGNhbGxiYWNrKSAtPlxuICAgIEBndXR0ZXJDb250YWluZXIub25EaWRBZGRHdXR0ZXIgY2FsbGJhY2tcblxuICAjIEVzc2VudGlhbDogQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gYSB7R3V0dGVyfSBpcyByZW1vdmVkIGZyb20gdGhlIGVkaXRvci5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICMgICAqIGBuYW1lYCBUaGUgbmFtZSBvZiB0aGUge0d1dHRlcn0gdGhhdCB3YXMgcmVtb3ZlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkUmVtb3ZlR3V0dGVyOiAoY2FsbGJhY2spIC0+XG4gICAgQGd1dHRlckNvbnRhaW5lci5vbkRpZFJlbW92ZUd1dHRlciBjYWxsYmFja1xuXG4gICMgU2V0IHRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyB0aGF0IGNhbiBiZSBkaXNwbGF5ZWQgaG9yaXpvbnRhbGx5IGluIHRoZVxuICAjIGVkaXRvci5cbiAgI1xuICAjICogYGVkaXRvcldpZHRoSW5DaGFyc2AgQSB7TnVtYmVyfSByZXByZXNlbnRpbmcgdGhlIHdpZHRoIG9mIHRoZVxuICAjIHtUZXh0RWRpdG9yRWxlbWVudH0gaW4gY2hhcmFjdGVycy5cbiAgc2V0RWRpdG9yV2lkdGhJbkNoYXJzOiAoZWRpdG9yV2lkdGhJbkNoYXJzKSAtPiBAdXBkYXRlKHtlZGl0b3JXaWR0aEluQ2hhcnN9KVxuXG4gICMgUmV0dXJucyB0aGUgZWRpdG9yIHdpZHRoIGluIGNoYXJhY3RlcnMuXG4gIGdldEVkaXRvcldpZHRoSW5DaGFyczogLT5cbiAgICBpZiBAd2lkdGg/IGFuZCBAZGVmYXVsdENoYXJXaWR0aCA+IDBcbiAgICAgIE1hdGgubWF4KDAsIE1hdGguZmxvb3IoQHdpZHRoIC8gQGRlZmF1bHRDaGFyV2lkdGgpKVxuICAgIGVsc2VcbiAgICAgIEBlZGl0b3JXaWR0aEluQ2hhcnNcblxuICAjIyNcbiAgU2VjdGlvbjogRmlsZSBEZXRhaWxzXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBHZXQgdGhlIGVkaXRvcidzIHRpdGxlIGZvciBkaXNwbGF5IGluIG90aGVyIHBhcnRzIG9mIHRoZVxuICAjIFVJIHN1Y2ggYXMgdGhlIHRhYnMuXG4gICNcbiAgIyBJZiB0aGUgZWRpdG9yJ3MgYnVmZmVyIGlzIHNhdmVkLCBpdHMgdGl0bGUgaXMgdGhlIGZpbGUgbmFtZS4gSWYgaXQgaXNcbiAgIyB1bnNhdmVkLCBpdHMgdGl0bGUgaXMgXCJ1bnRpdGxlZFwiLlxuICAjXG4gICMgUmV0dXJucyBhIHtTdHJpbmd9LlxuICBnZXRUaXRsZTogLT5cbiAgICBAZ2V0RmlsZU5hbWUoKSA/ICd1bnRpdGxlZCdcblxuICAjIEVzc2VudGlhbDogR2V0IHVuaXF1ZSB0aXRsZSBmb3IgZGlzcGxheSBpbiBvdGhlciBwYXJ0cyBvZiB0aGUgVUksIHN1Y2ggYXNcbiAgIyB0aGUgd2luZG93IHRpdGxlLlxuICAjXG4gICMgSWYgdGhlIGVkaXRvcidzIGJ1ZmZlciBpcyB1bnNhdmVkLCBpdHMgdGl0bGUgaXMgXCJ1bnRpdGxlZFwiXG4gICMgSWYgdGhlIGVkaXRvcidzIGJ1ZmZlciBpcyBzYXZlZCwgaXRzIHVuaXF1ZSB0aXRsZSBpcyBmb3JtYXR0ZWQgYXMgb25lXG4gICMgb2YgdGhlIGZvbGxvd2luZyxcbiAgIyAqIFwiPGZpbGVuYW1lPlwiIHdoZW4gaXQgaXMgdGhlIG9ubHkgZWRpdGluZyBidWZmZXIgd2l0aCB0aGlzIGZpbGUgbmFtZS5cbiAgIyAqIFwiPGZpbGVuYW1lPiDigJQgPHVuaXF1ZS1kaXItcHJlZml4PlwiIHdoZW4gb3RoZXIgYnVmZmVycyBoYXZlIHRoaXMgZmlsZSBuYW1lLlxuICAjXG4gICMgUmV0dXJucyBhIHtTdHJpbmd9XG4gIGdldExvbmdUaXRsZTogLT5cbiAgICBpZiBAZ2V0UGF0aCgpXG4gICAgICBmaWxlTmFtZSA9IEBnZXRGaWxlTmFtZSgpXG5cbiAgICAgIGFsbFBhdGhTZWdtZW50cyA9IFtdXG4gICAgICBmb3IgdGV4dEVkaXRvciBpbiBhdG9tLndvcmtzcGFjZS5nZXRUZXh0RWRpdG9ycygpIHdoZW4gdGV4dEVkaXRvciBpc250IHRoaXNcbiAgICAgICAgaWYgdGV4dEVkaXRvci5nZXRGaWxlTmFtZSgpIGlzIGZpbGVOYW1lXG4gICAgICAgICAgZGlyZWN0b3J5UGF0aCA9IGZzLnRpbGRpZnkodGV4dEVkaXRvci5nZXREaXJlY3RvcnlQYXRoKCkpXG4gICAgICAgICAgYWxsUGF0aFNlZ21lbnRzLnB1c2goZGlyZWN0b3J5UGF0aC5zcGxpdChwYXRoLnNlcCkpXG5cbiAgICAgIGlmIGFsbFBhdGhTZWdtZW50cy5sZW5ndGggaXMgMFxuICAgICAgICByZXR1cm4gZmlsZU5hbWVcblxuICAgICAgb3VyUGF0aFNlZ21lbnRzID0gZnMudGlsZGlmeShAZ2V0RGlyZWN0b3J5UGF0aCgpKS5zcGxpdChwYXRoLnNlcClcbiAgICAgIGFsbFBhdGhTZWdtZW50cy5wdXNoIG91clBhdGhTZWdtZW50c1xuXG4gICAgICBsb29wXG4gICAgICAgIGZpcnN0U2VnbWVudCA9IG91clBhdGhTZWdtZW50c1swXVxuXG4gICAgICAgIGNvbW1vbkJhc2UgPSBfLmFsbChhbGxQYXRoU2VnbWVudHMsIChwYXRoU2VnbWVudHMpIC0+IHBhdGhTZWdtZW50cy5sZW5ndGggPiAxIGFuZCBwYXRoU2VnbWVudHNbMF0gaXMgZmlyc3RTZWdtZW50KVxuICAgICAgICBpZiBjb21tb25CYXNlXG4gICAgICAgICAgcGF0aFNlZ21lbnRzLnNoaWZ0KCkgZm9yIHBhdGhTZWdtZW50cyBpbiBhbGxQYXRoU2VnbWVudHNcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGJyZWFrXG5cbiAgICAgIFwiI3tmaWxlTmFtZX0gXFx1MjAxNCAje3BhdGguam9pbihwYXRoU2VnbWVudHMuLi4pfVwiXG4gICAgZWxzZVxuICAgICAgJ3VudGl0bGVkJ1xuXG4gICMgRXNzZW50aWFsOiBSZXR1cm5zIHRoZSB7U3RyaW5nfSBwYXRoIG9mIHRoaXMgZWRpdG9yJ3MgdGV4dCBidWZmZXIuXG4gIGdldFBhdGg6IC0+IEBidWZmZXIuZ2V0UGF0aCgpXG5cbiAgZ2V0RmlsZU5hbWU6IC0+XG4gICAgaWYgZnVsbFBhdGggPSBAZ2V0UGF0aCgpXG4gICAgICBwYXRoLmJhc2VuYW1lKGZ1bGxQYXRoKVxuICAgIGVsc2VcbiAgICAgIG51bGxcblxuICBnZXREaXJlY3RvcnlQYXRoOiAtPlxuICAgIGlmIGZ1bGxQYXRoID0gQGdldFBhdGgoKVxuICAgICAgcGF0aC5kaXJuYW1lKGZ1bGxQYXRoKVxuICAgIGVsc2VcbiAgICAgIG51bGxcblxuICAjIEV4dGVuZGVkOiBSZXR1cm5zIHRoZSB7U3RyaW5nfSBjaGFyYWN0ZXIgc2V0IGVuY29kaW5nIG9mIHRoaXMgZWRpdG9yJ3MgdGV4dFxuICAjIGJ1ZmZlci5cbiAgZ2V0RW5jb2Rpbmc6IC0+IEBidWZmZXIuZ2V0RW5jb2RpbmcoKVxuXG4gICMgRXh0ZW5kZWQ6IFNldCB0aGUgY2hhcmFjdGVyIHNldCBlbmNvZGluZyB0byB1c2UgaW4gdGhpcyBlZGl0b3IncyB0ZXh0XG4gICMgYnVmZmVyLlxuICAjXG4gICMgKiBgZW5jb2RpbmdgIFRoZSB7U3RyaW5nfSBjaGFyYWN0ZXIgc2V0IGVuY29kaW5nIG5hbWUgc3VjaCBhcyAndXRmOCdcbiAgc2V0RW5jb2Rpbmc6IChlbmNvZGluZykgLT4gQGJ1ZmZlci5zZXRFbmNvZGluZyhlbmNvZGluZylcblxuICAjIEVzc2VudGlhbDogUmV0dXJucyB7Qm9vbGVhbn0gYHRydWVgIGlmIHRoaXMgZWRpdG9yIGhhcyBiZWVuIG1vZGlmaWVkLlxuICBpc01vZGlmaWVkOiAtPiBAYnVmZmVyLmlzTW9kaWZpZWQoKVxuXG4gICMgRXNzZW50aWFsOiBSZXR1cm5zIHtCb29sZWFufSBgdHJ1ZWAgaWYgdGhpcyBlZGl0b3IgaGFzIG5vIGNvbnRlbnQuXG4gIGlzRW1wdHk6IC0+IEBidWZmZXIuaXNFbXB0eSgpXG5cbiAgIyMjXG4gIFNlY3Rpb246IEZpbGUgT3BlcmF0aW9uc1xuICAjIyNcblxuICAjIEVzc2VudGlhbDogU2F2ZXMgdGhlIGVkaXRvcidzIHRleHQgYnVmZmVyLlxuICAjXG4gICMgU2VlIHtUZXh0QnVmZmVyOjpzYXZlfSBmb3IgbW9yZSBkZXRhaWxzLlxuICBzYXZlOiAtPiBAYnVmZmVyLnNhdmUoKVxuXG4gICMgRXNzZW50aWFsOiBTYXZlcyB0aGUgZWRpdG9yJ3MgdGV4dCBidWZmZXIgYXMgdGhlIGdpdmVuIHBhdGguXG4gICNcbiAgIyBTZWUge1RleHRCdWZmZXI6OnNhdmVBc30gZm9yIG1vcmUgZGV0YWlscy5cbiAgI1xuICAjICogYGZpbGVQYXRoYCBBIHtTdHJpbmd9IHBhdGguXG4gIHNhdmVBczogKGZpbGVQYXRoKSAtPiBAYnVmZmVyLnNhdmVBcyhmaWxlUGF0aClcblxuICAjIERldGVybWluZSB3aGV0aGVyIHRoZSB1c2VyIHNob3VsZCBiZSBwcm9tcHRlZCB0byBzYXZlIGJlZm9yZSBjbG9zaW5nXG4gICMgdGhpcyBlZGl0b3IuXG4gIHNob3VsZFByb21wdFRvU2F2ZTogKHt3aW5kb3dDbG9zZVJlcXVlc3RlZCwgcHJvamVjdEhhc1BhdGhzfT17fSkgLT5cbiAgICBpZiB3aW5kb3dDbG9zZVJlcXVlc3RlZCBhbmQgcHJvamVjdEhhc1BhdGhzIGFuZCBhdG9tLnN0YXRlU3RvcmUuaXNDb25uZWN0ZWQoKVxuICAgICAgZmFsc2VcbiAgICBlbHNlXG4gICAgICBAaXNNb2RpZmllZCgpIGFuZCBub3QgQGJ1ZmZlci5oYXNNdWx0aXBsZUVkaXRvcnMoKVxuXG4gICMgUmV0dXJucyBhbiB7T2JqZWN0fSB0byBjb25maWd1cmUgZGlhbG9nIHNob3duIHdoZW4gdGhpcyBlZGl0b3IgaXMgc2F2ZWRcbiAgIyB2aWEge1BhbmU6OnNhdmVJdGVtQXN9LlxuICBnZXRTYXZlRGlhbG9nT3B0aW9uczogLT4ge31cblxuICAjIyNcbiAgU2VjdGlvbjogUmVhZGluZyBUZXh0XG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBSZXR1cm5zIGEge1N0cmluZ30gcmVwcmVzZW50aW5nIHRoZSBlbnRpcmUgY29udGVudHMgb2YgdGhlIGVkaXRvci5cbiAgZ2V0VGV4dDogLT4gQGJ1ZmZlci5nZXRUZXh0KClcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSB0ZXh0IGluIHRoZSBnaXZlbiB7UmFuZ2V9IGluIGJ1ZmZlciBjb29yZGluYXRlcy5cbiAgI1xuICAjICogYHJhbmdlYCBBIHtSYW5nZX0gb3IgcmFuZ2UtY29tcGF0aWJsZSB7QXJyYXl9LlxuICAjXG4gICMgUmV0dXJucyBhIHtTdHJpbmd9LlxuICBnZXRUZXh0SW5CdWZmZXJSYW5nZTogKHJhbmdlKSAtPlxuICAgIEBidWZmZXIuZ2V0VGV4dEluUmFuZ2UocmFuZ2UpXG5cbiAgIyBFc3NlbnRpYWw6IFJldHVybnMgYSB7TnVtYmVyfSByZXByZXNlbnRpbmcgdGhlIG51bWJlciBvZiBsaW5lcyBpbiB0aGUgYnVmZmVyLlxuICBnZXRMaW5lQ291bnQ6IC0+IEBidWZmZXIuZ2V0TGluZUNvdW50KClcblxuICAjIEVzc2VudGlhbDogUmV0dXJucyBhIHtOdW1iZXJ9IHJlcHJlc2VudGluZyB0aGUgbnVtYmVyIG9mIHNjcmVlbiBsaW5lcyBpbiB0aGVcbiAgIyBlZGl0b3IuIFRoaXMgYWNjb3VudHMgZm9yIGZvbGRzLlxuICBnZXRTY3JlZW5MaW5lQ291bnQ6IC0+IEBkaXNwbGF5TGF5ZXIuZ2V0U2NyZWVuTGluZUNvdW50KClcblxuICBnZXRBcHByb3hpbWF0ZVNjcmVlbkxpbmVDb3VudDogLT4gQGRpc3BsYXlMYXllci5nZXRBcHByb3hpbWF0ZVNjcmVlbkxpbmVDb3VudCgpXG5cbiAgIyBFc3NlbnRpYWw6IFJldHVybnMgYSB7TnVtYmVyfSByZXByZXNlbnRpbmcgdGhlIGxhc3QgemVyby1pbmRleGVkIGJ1ZmZlciByb3dcbiAgIyBudW1iZXIgb2YgdGhlIGVkaXRvci5cbiAgZ2V0TGFzdEJ1ZmZlclJvdzogLT4gQGJ1ZmZlci5nZXRMYXN0Um93KClcblxuICAjIEVzc2VudGlhbDogUmV0dXJucyBhIHtOdW1iZXJ9IHJlcHJlc2VudGluZyB0aGUgbGFzdCB6ZXJvLWluZGV4ZWQgc2NyZWVuIHJvd1xuICAjIG51bWJlciBvZiB0aGUgZWRpdG9yLlxuICBnZXRMYXN0U2NyZWVuUm93OiAtPiBAZ2V0U2NyZWVuTGluZUNvdW50KCkgLSAxXG5cbiAgIyBFc3NlbnRpYWw6IFJldHVybnMgYSB7U3RyaW5nfSByZXByZXNlbnRpbmcgdGhlIGNvbnRlbnRzIG9mIHRoZSBsaW5lIGF0IHRoZVxuICAjIGdpdmVuIGJ1ZmZlciByb3cuXG4gICNcbiAgIyAqIGBidWZmZXJSb3dgIEEge051bWJlcn0gcmVwcmVzZW50aW5nIGEgemVyby1pbmRleGVkIGJ1ZmZlciByb3cuXG4gIGxpbmVUZXh0Rm9yQnVmZmVyUm93OiAoYnVmZmVyUm93KSAtPiBAYnVmZmVyLmxpbmVGb3JSb3coYnVmZmVyUm93KVxuXG4gICMgRXNzZW50aWFsOiBSZXR1cm5zIGEge1N0cmluZ30gcmVwcmVzZW50aW5nIHRoZSBjb250ZW50cyBvZiB0aGUgbGluZSBhdCB0aGVcbiAgIyBnaXZlbiBzY3JlZW4gcm93LlxuICAjXG4gICMgKiBgc2NyZWVuUm93YCBBIHtOdW1iZXJ9IHJlcHJlc2VudGluZyBhIHplcm8taW5kZXhlZCBzY3JlZW4gcm93LlxuICBsaW5lVGV4dEZvclNjcmVlblJvdzogKHNjcmVlblJvdykgLT5cbiAgICBAc2NyZWVuTGluZUZvclNjcmVlblJvdyhzY3JlZW5Sb3cpPy5saW5lVGV4dFxuXG4gIGxvZ1NjcmVlbkxpbmVzOiAoc3RhcnQ9MCwgZW5kPUBnZXRMYXN0U2NyZWVuUm93KCkpIC0+XG4gICAgZm9yIHJvdyBpbiBbc3RhcnQuLmVuZF1cbiAgICAgIGxpbmUgPSBAbGluZVRleHRGb3JTY3JlZW5Sb3cocm93KVxuICAgICAgY29uc29sZS5sb2cgcm93LCBAYnVmZmVyUm93Rm9yU2NyZWVuUm93KHJvdyksIGxpbmUsIGxpbmUubGVuZ3RoXG4gICAgcmV0dXJuXG5cbiAgdG9rZW5zRm9yU2NyZWVuUm93OiAoc2NyZWVuUm93KSAtPlxuICAgIHRva2VucyA9IFtdXG4gICAgbGluZVRleHRJbmRleCA9IDBcbiAgICBjdXJyZW50VG9rZW5TY29wZXMgPSBbXVxuICAgIHtsaW5lVGV4dCwgdGFnQ29kZXN9ID0gQHNjcmVlbkxpbmVGb3JTY3JlZW5Sb3coc2NyZWVuUm93KVxuICAgIGZvciB0YWdDb2RlIGluIHRhZ0NvZGVzXG4gICAgICBpZiBAZGlzcGxheUxheWVyLmlzT3BlblRhZ0NvZGUodGFnQ29kZSlcbiAgICAgICAgY3VycmVudFRva2VuU2NvcGVzLnB1c2goQGRpc3BsYXlMYXllci50YWdGb3JDb2RlKHRhZ0NvZGUpKVxuICAgICAgZWxzZSBpZiBAZGlzcGxheUxheWVyLmlzQ2xvc2VUYWdDb2RlKHRhZ0NvZGUpXG4gICAgICAgIGN1cnJlbnRUb2tlblNjb3Blcy5wb3AoKVxuICAgICAgZWxzZVxuICAgICAgICB0b2tlbnMucHVzaCh7XG4gICAgICAgICAgdGV4dDogbGluZVRleHQuc3Vic3RyKGxpbmVUZXh0SW5kZXgsIHRhZ0NvZGUpXG4gICAgICAgICAgc2NvcGVzOiBjdXJyZW50VG9rZW5TY29wZXMuc2xpY2UoKVxuICAgICAgICB9KVxuICAgICAgICBsaW5lVGV4dEluZGV4ICs9IHRhZ0NvZGVcbiAgICB0b2tlbnNcblxuICBzY3JlZW5MaW5lRm9yU2NyZWVuUm93OiAoc2NyZWVuUm93KSAtPlxuICAgIEBkaXNwbGF5TGF5ZXIuZ2V0U2NyZWVuTGluZXMoc2NyZWVuUm93LCBzY3JlZW5Sb3cgKyAxKVswXVxuXG4gIGJ1ZmZlclJvd0ZvclNjcmVlblJvdzogKHNjcmVlblJvdykgLT5cbiAgICBAZGlzcGxheUxheWVyLnRyYW5zbGF0ZVNjcmVlblBvc2l0aW9uKFBvaW50KHNjcmVlblJvdywgMCkpLnJvd1xuXG4gIGJ1ZmZlclJvd3NGb3JTY3JlZW5Sb3dzOiAoc3RhcnRTY3JlZW5Sb3csIGVuZFNjcmVlblJvdykgLT5cbiAgICBmb3Igc2NyZWVuUm93IGluIFtzdGFydFNjcmVlblJvdy4uZW5kU2NyZWVuUm93XVxuICAgICAgQGJ1ZmZlclJvd0ZvclNjcmVlblJvdyhzY3JlZW5Sb3cpXG5cbiAgc2NyZWVuUm93Rm9yQnVmZmVyUm93OiAocm93KSAtPlxuICAgIEBkaXNwbGF5TGF5ZXIudHJhbnNsYXRlQnVmZmVyUG9zaXRpb24oUG9pbnQocm93LCAwKSkucm93XG5cbiAgZ2V0UmlnaHRtb3N0U2NyZWVuUG9zaXRpb246IC0+IEBkaXNwbGF5TGF5ZXIuZ2V0UmlnaHRtb3N0U2NyZWVuUG9zaXRpb24oKVxuXG4gIGdldEFwcHJveGltYXRlUmlnaHRtb3N0U2NyZWVuUG9zaXRpb246IC0+IEBkaXNwbGF5TGF5ZXIuZ2V0QXBwcm94aW1hdGVSaWdodG1vc3RTY3JlZW5Qb3NpdGlvbigpXG5cbiAgZ2V0TWF4U2NyZWVuTGluZUxlbmd0aDogLT4gQGdldFJpZ2h0bW9zdFNjcmVlblBvc2l0aW9uKCkuY29sdW1uXG5cbiAgZ2V0TG9uZ2VzdFNjcmVlblJvdzogLT4gQGdldFJpZ2h0bW9zdFNjcmVlblBvc2l0aW9uKCkucm93XG5cbiAgZ2V0QXBwcm94aW1hdGVMb25nZXN0U2NyZWVuUm93OiAtPiBAZ2V0QXBwcm94aW1hdGVSaWdodG1vc3RTY3JlZW5Qb3NpdGlvbigpLnJvd1xuXG4gIGxpbmVMZW5ndGhGb3JTY3JlZW5Sb3c6IChzY3JlZW5Sb3cpIC0+IEBkaXNwbGF5TGF5ZXIubGluZUxlbmd0aEZvclNjcmVlblJvdyhzY3JlZW5Sb3cpXG5cbiAgIyBSZXR1cm5zIHRoZSByYW5nZSBmb3IgdGhlIGdpdmVuIGJ1ZmZlciByb3cuXG4gICNcbiAgIyAqIGByb3dgIEEgcm93IHtOdW1iZXJ9LlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgQW4gb3B0aW9ucyBoYXNoIHdpdGggYW4gYGluY2x1ZGVOZXdsaW5lYCBrZXkuXG4gICNcbiAgIyBSZXR1cm5zIGEge1JhbmdlfS5cbiAgYnVmZmVyUmFuZ2VGb3JCdWZmZXJSb3c6IChyb3csIHtpbmNsdWRlTmV3bGluZX09e30pIC0+IEBidWZmZXIucmFuZ2VGb3JSb3cocm93LCBpbmNsdWRlTmV3bGluZSlcblxuICAjIEdldCB0aGUgdGV4dCBpbiB0aGUgZ2l2ZW4ge1JhbmdlfS5cbiAgI1xuICAjIFJldHVybnMgYSB7U3RyaW5nfS5cbiAgZ2V0VGV4dEluUmFuZ2U6IChyYW5nZSkgLT4gQGJ1ZmZlci5nZXRUZXh0SW5SYW5nZShyYW5nZSlcblxuICAjIHtEZWxlZ2F0ZXMgdG86IFRleHRCdWZmZXIuaXNSb3dCbGFua31cbiAgaXNCdWZmZXJSb3dCbGFuazogKGJ1ZmZlclJvdykgLT4gQGJ1ZmZlci5pc1Jvd0JsYW5rKGJ1ZmZlclJvdylcblxuICAjIHtEZWxlZ2F0ZXMgdG86IFRleHRCdWZmZXIubmV4dE5vbkJsYW5rUm93fVxuICBuZXh0Tm9uQmxhbmtCdWZmZXJSb3c6IChidWZmZXJSb3cpIC0+IEBidWZmZXIubmV4dE5vbkJsYW5rUm93KGJ1ZmZlclJvdylcblxuICAjIHtEZWxlZ2F0ZXMgdG86IFRleHRCdWZmZXIuZ2V0RW5kUG9zaXRpb259XG4gIGdldEVvZkJ1ZmZlclBvc2l0aW9uOiAtPiBAYnVmZmVyLmdldEVuZFBvc2l0aW9uKClcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSB7UmFuZ2V9IG9mIHRoZSBwYXJhZ3JhcGggc3Vycm91bmRpbmcgdGhlIG1vc3QgcmVjZW50bHkgYWRkZWRcbiAgIyBjdXJzb3IuXG4gICNcbiAgIyBSZXR1cm5zIGEge1JhbmdlfS5cbiAgZ2V0Q3VycmVudFBhcmFncmFwaEJ1ZmZlclJhbmdlOiAtPlxuICAgIEBnZXRMYXN0Q3Vyc29yKCkuZ2V0Q3VycmVudFBhcmFncmFwaEJ1ZmZlclJhbmdlKClcblxuXG4gICMjI1xuICBTZWN0aW9uOiBNdXRhdGluZyBUZXh0XG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBSZXBsYWNlcyB0aGUgZW50aXJlIGNvbnRlbnRzIG9mIHRoZSBidWZmZXIgd2l0aCB0aGUgZ2l2ZW4ge1N0cmluZ30uXG4gICNcbiAgIyAqIGB0ZXh0YCBBIHtTdHJpbmd9IHRvIHJlcGxhY2Ugd2l0aFxuICBzZXRUZXh0OiAodGV4dCkgLT4gQGJ1ZmZlci5zZXRUZXh0KHRleHQpXG5cbiAgIyBFc3NlbnRpYWw6IFNldCB0aGUgdGV4dCBpbiB0aGUgZ2l2ZW4ge1JhbmdlfSBpbiBidWZmZXIgY29vcmRpbmF0ZXMuXG4gICNcbiAgIyAqIGByYW5nZWAgQSB7UmFuZ2V9IG9yIHJhbmdlLWNvbXBhdGlibGUge0FycmF5fS5cbiAgIyAqIGB0ZXh0YCBBIHtTdHJpbmd9XG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fVxuICAjICAgKiBgbm9ybWFsaXplTGluZUVuZGluZ3NgIChvcHRpb25hbCkge0Jvb2xlYW59IChkZWZhdWx0OiB0cnVlKVxuICAjICAgKiBgdW5kb2AgKG9wdGlvbmFsKSB7U3RyaW5nfSAnc2tpcCcgd2lsbCBza2lwIHRoZSB1bmRvIHN5c3RlbVxuICAjXG4gICMgUmV0dXJucyB0aGUge1JhbmdlfSBvZiB0aGUgbmV3bHktaW5zZXJ0ZWQgdGV4dC5cbiAgc2V0VGV4dEluQnVmZmVyUmFuZ2U6IChyYW5nZSwgdGV4dCwgb3B0aW9ucykgLT4gQGdldEJ1ZmZlcigpLnNldFRleHRJblJhbmdlKHJhbmdlLCB0ZXh0LCBvcHRpb25zKVxuXG4gICMgRXNzZW50aWFsOiBGb3IgZWFjaCBzZWxlY3Rpb24sIHJlcGxhY2UgdGhlIHNlbGVjdGVkIHRleHQgd2l0aCB0aGUgZ2l2ZW4gdGV4dC5cbiAgI1xuICAjICogYHRleHRgIEEge1N0cmluZ30gcmVwcmVzZW50aW5nIHRoZSB0ZXh0IHRvIGluc2VydC5cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIFNlZSB7U2VsZWN0aW9uOjppbnNlcnRUZXh0fS5cbiAgI1xuICAjIFJldHVybnMgYSB7UmFuZ2V9IHdoZW4gdGhlIHRleHQgaGFzIGJlZW4gaW5zZXJ0ZWRcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59IGZhbHNlIHdoZW4gdGhlIHRleHQgaGFzIG5vdCBiZWVuIGluc2VydGVkXG4gIGluc2VydFRleHQ6ICh0ZXh0LCBvcHRpb25zPXt9KSAtPlxuICAgIHJldHVybiBmYWxzZSB1bmxlc3MgQGVtaXRXaWxsSW5zZXJ0VGV4dEV2ZW50KHRleHQpXG5cbiAgICBncm91cGluZ0ludGVydmFsID0gaWYgb3B0aW9ucy5ncm91cFVuZG9cbiAgICAgIEB1bmRvR3JvdXBpbmdJbnRlcnZhbFxuICAgIGVsc2VcbiAgICAgIDBcblxuICAgIG9wdGlvbnMuYXV0b0luZGVudE5ld2xpbmUgPz0gQHNob3VsZEF1dG9JbmRlbnQoKVxuICAgIG9wdGlvbnMuYXV0b0RlY3JlYXNlSW5kZW50ID89IEBzaG91bGRBdXRvSW5kZW50KClcbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0KFxuICAgICAgKHNlbGVjdGlvbikgPT5cbiAgICAgICAgcmFuZ2UgPSBzZWxlY3Rpb24uaW5zZXJ0VGV4dCh0ZXh0LCBvcHRpb25zKVxuICAgICAgICBkaWRJbnNlcnRFdmVudCA9IHt0ZXh0LCByYW5nZX1cbiAgICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWluc2VydC10ZXh0JywgZGlkSW5zZXJ0RXZlbnRcbiAgICAgICAgcmFuZ2VcbiAgICAgICwgZ3JvdXBpbmdJbnRlcnZhbFxuICAgIClcblxuICAjIEVzc2VudGlhbDogRm9yIGVhY2ggc2VsZWN0aW9uLCByZXBsYWNlIHRoZSBzZWxlY3RlZCB0ZXh0IHdpdGggYSBuZXdsaW5lLlxuICBpbnNlcnROZXdsaW5lOiAob3B0aW9ucykgLT5cbiAgICBAaW5zZXJ0VGV4dCgnXFxuJywgb3B0aW9ucylcblxuICAjIEVzc2VudGlhbDogRm9yIGVhY2ggc2VsZWN0aW9uLCBpZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCBkZWxldGUgdGhlIGNoYXJhY3RlclxuICAjIGZvbGxvd2luZyB0aGUgY3Vyc29yLiBPdGhlcndpc2UgZGVsZXRlIHRoZSBzZWxlY3RlZCB0ZXh0LlxuICBkZWxldGU6IC0+XG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uZGVsZXRlKClcblxuICAjIEVzc2VudGlhbDogRm9yIGVhY2ggc2VsZWN0aW9uLCBpZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCBkZWxldGUgdGhlIGNoYXJhY3RlclxuICAjIHByZWNlZGluZyB0aGUgY3Vyc29yLiBPdGhlcndpc2UgZGVsZXRlIHRoZSBzZWxlY3RlZCB0ZXh0LlxuICBiYWNrc3BhY2U6IC0+XG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uYmFja3NwYWNlKClcblxuICAjIEV4dGVuZGVkOiBNdXRhdGUgdGhlIHRleHQgb2YgYWxsIHRoZSBzZWxlY3Rpb25zIGluIGEgc2luZ2xlIHRyYW5zYWN0aW9uLlxuICAjXG4gICMgQWxsIHRoZSBjaGFuZ2VzIG1hZGUgaW5zaWRlIHRoZSBnaXZlbiB7RnVuY3Rpb259IGNhbiBiZSByZXZlcnRlZCB3aXRoIGFcbiAgIyBzaW5nbGUgY2FsbCB0byB7Ojp1bmRvfS5cbiAgI1xuICAjICogYGZuYCBBIHtGdW5jdGlvbn0gdGhhdCB3aWxsIGJlIGNhbGxlZCBvbmNlIGZvciBlYWNoIHtTZWxlY3Rpb259LiBUaGUgZmlyc3RcbiAgIyAgICAgIGFyZ3VtZW50IHdpbGwgYmUgYSB7U2VsZWN0aW9ufSBhbmQgdGhlIHNlY29uZCBhcmd1bWVudCB3aWxsIGJlIHRoZVxuICAjICAgICAge051bWJlcn0gaW5kZXggb2YgdGhhdCBzZWxlY3Rpb24uXG4gIG11dGF0ZVNlbGVjdGVkVGV4dDogKGZuLCBncm91cGluZ0ludGVydmFsPTApIC0+XG4gICAgQG1lcmdlSW50ZXJzZWN0aW5nU2VsZWN0aW9ucyA9PlxuICAgICAgQHRyYW5zYWN0IGdyb3VwaW5nSW50ZXJ2YWwsID0+XG4gICAgICAgIGZuKHNlbGVjdGlvbiwgaW5kZXgpIGZvciBzZWxlY3Rpb24sIGluZGV4IGluIEBnZXRTZWxlY3Rpb25zT3JkZXJlZEJ5QnVmZmVyUG9zaXRpb24oKVxuXG4gICMgTW92ZSBsaW5lcyBpbnRlcnNlY3RpbmcgdGhlIG1vc3QgcmVjZW50IHNlbGVjdGlvbiBvciBtdWx0aXBsZSBzZWxlY3Rpb25zXG4gICMgdXAgYnkgb25lIHJvdyBpbiBzY3JlZW4gY29vcmRpbmF0ZXMuXG4gIG1vdmVMaW5lVXA6IC0+XG4gICAgc2VsZWN0aW9ucyA9IEBnZXRTZWxlY3RlZEJ1ZmZlclJhbmdlcygpLnNvcnQoKGEsIGIpIC0+IGEuY29tcGFyZShiKSlcblxuICAgIGlmIHNlbGVjdGlvbnNbMF0uc3RhcnQucm93IGlzIDBcbiAgICAgIHJldHVyblxuXG4gICAgaWYgc2VsZWN0aW9uc1tzZWxlY3Rpb25zLmxlbmd0aCAtIDFdLnN0YXJ0LnJvdyBpcyBAZ2V0TGFzdEJ1ZmZlclJvdygpIGFuZCBAYnVmZmVyLmdldExhc3RMaW5lKCkgaXMgJydcbiAgICAgIHJldHVyblxuXG4gICAgQHRyYW5zYWN0ID0+XG4gICAgICBuZXdTZWxlY3Rpb25SYW5nZXMgPSBbXVxuXG4gICAgICB3aGlsZSBzZWxlY3Rpb25zLmxlbmd0aCA+IDBcbiAgICAgICAgIyBGaW5kIHNlbGVjdGlvbnMgc3Bhbm5pbmcgYSBjb250aWd1b3VzIHNldCBvZiBsaW5lc1xuICAgICAgICBzZWxlY3Rpb24gPSBzZWxlY3Rpb25zLnNoaWZ0KClcbiAgICAgICAgc2VsZWN0aW9uc1RvTW92ZSA9IFtzZWxlY3Rpb25dXG5cbiAgICAgICAgd2hpbGUgc2VsZWN0aW9uLmVuZC5yb3cgaXMgc2VsZWN0aW9uc1swXT8uc3RhcnQucm93XG4gICAgICAgICAgc2VsZWN0aW9uc1RvTW92ZS5wdXNoKHNlbGVjdGlvbnNbMF0pXG4gICAgICAgICAgc2VsZWN0aW9uLmVuZC5yb3cgPSBzZWxlY3Rpb25zWzBdLmVuZC5yb3dcbiAgICAgICAgICBzZWxlY3Rpb25zLnNoaWZ0KClcblxuICAgICAgICAjIENvbXB1dGUgdGhlIGJ1ZmZlciByYW5nZSBzcGFubmVkIGJ5IGFsbCB0aGVzZSBzZWxlY3Rpb25zLCBleHBhbmRpbmcgaXRcbiAgICAgICAgIyBzbyB0aGF0IGl0IGluY2x1ZGVzIGFueSBmb2xkZWQgcmVnaW9uIHRoYXQgaW50ZXJzZWN0cyB0aGVtLlxuICAgICAgICBzdGFydFJvdyA9IHNlbGVjdGlvbi5zdGFydC5yb3dcbiAgICAgICAgZW5kUm93ID0gc2VsZWN0aW9uLmVuZC5yb3dcbiAgICAgICAgaWYgc2VsZWN0aW9uLmVuZC5yb3cgPiBzZWxlY3Rpb24uc3RhcnQucm93IGFuZCBzZWxlY3Rpb24uZW5kLmNvbHVtbiBpcyAwXG4gICAgICAgICAgIyBEb24ndCBtb3ZlIHRoZSBsYXN0IGxpbmUgb2YgYSBtdWx0aS1saW5lIHNlbGVjdGlvbiBpZiB0aGUgc2VsZWN0aW9uIGVuZHMgYXQgY29sdW1uIDBcbiAgICAgICAgICBlbmRSb3ctLVxuXG4gICAgICAgIHN0YXJ0Um93ID0gQGRpc3BsYXlMYXllci5maW5kQm91bmRhcnlQcmVjZWRpbmdCdWZmZXJSb3coc3RhcnRSb3cpXG4gICAgICAgIGVuZFJvdyA9IEBkaXNwbGF5TGF5ZXIuZmluZEJvdW5kYXJ5Rm9sbG93aW5nQnVmZmVyUm93KGVuZFJvdyArIDEpXG4gICAgICAgIGxpbmVzUmFuZ2UgPSBuZXcgUmFuZ2UoUG9pbnQoc3RhcnRSb3csIDApLCBQb2ludChlbmRSb3csIDApKVxuXG4gICAgICAgICMgSWYgc2VsZWN0ZWQgbGluZSByYW5nZSBpcyBwcmVjZWRlZCBieSBhIGZvbGQsIG9uZSBsaW5lIGFib3ZlIG9uIHNjcmVlblxuICAgICAgICAjIGNvdWxkIGJlIG11bHRpcGxlIGxpbmVzIGluIHRoZSBidWZmZXIuXG4gICAgICAgIHByZWNlZGluZ1JvdyA9IEBkaXNwbGF5TGF5ZXIuZmluZEJvdW5kYXJ5UHJlY2VkaW5nQnVmZmVyUm93KHN0YXJ0Um93IC0gMSlcbiAgICAgICAgaW5zZXJ0RGVsdGEgPSBsaW5lc1JhbmdlLnN0YXJ0LnJvdyAtIHByZWNlZGluZ1Jvd1xuXG4gICAgICAgICMgQW55IGZvbGRzIGluIHRoZSB0ZXh0IHRoYXQgaXMgbW92ZWQgd2lsbCBuZWVkIHRvIGJlIHJlLWNyZWF0ZWQuXG4gICAgICAgICMgSXQgaW5jbHVkZXMgdGhlIGZvbGRzIHRoYXQgd2VyZSBpbnRlcnNlY3Rpbmcgd2l0aCB0aGUgc2VsZWN0aW9uLlxuICAgICAgICByYW5nZXNUb1JlZm9sZCA9IEBkaXNwbGF5TGF5ZXJcbiAgICAgICAgICAuZGVzdHJveUZvbGRzSW50ZXJzZWN0aW5nQnVmZmVyUmFuZ2UobGluZXNSYW5nZSlcbiAgICAgICAgICAubWFwKChyYW5nZSkgLT4gcmFuZ2UudHJhbnNsYXRlKFstaW5zZXJ0RGVsdGEsIDBdKSlcblxuICAgICAgICAjIERlbGV0ZSBsaW5lcyBzcGFubmVkIGJ5IHNlbGVjdGlvbiBhbmQgaW5zZXJ0IHRoZW0gb24gdGhlIHByZWNlZGluZyBidWZmZXIgcm93XG4gICAgICAgIGxpbmVzID0gQGJ1ZmZlci5nZXRUZXh0SW5SYW5nZShsaW5lc1JhbmdlKVxuICAgICAgICBsaW5lcyArPSBAYnVmZmVyLmxpbmVFbmRpbmdGb3JSb3cobGluZXNSYW5nZS5lbmQucm93IC0gMikgdW5sZXNzIGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdIGlzICdcXG4nXG4gICAgICAgIEBidWZmZXIuZGVsZXRlKGxpbmVzUmFuZ2UpXG4gICAgICAgIEBidWZmZXIuaW5zZXJ0KFtwcmVjZWRpbmdSb3csIDBdLCBsaW5lcylcblxuICAgICAgICAjIFJlc3RvcmUgZm9sZHMgdGhhdCBleGlzdGVkIGJlZm9yZSB0aGUgbGluZXMgd2VyZSBtb3ZlZFxuICAgICAgICBmb3IgcmFuZ2VUb1JlZm9sZCBpbiByYW5nZXNUb1JlZm9sZFxuICAgICAgICAgIEBkaXNwbGF5TGF5ZXIuZm9sZEJ1ZmZlclJhbmdlKHJhbmdlVG9SZWZvbGQpXG5cbiAgICAgICAgZm9yIHNlbGVjdGlvbiBpbiBzZWxlY3Rpb25zVG9Nb3ZlXG4gICAgICAgICAgbmV3U2VsZWN0aW9uUmFuZ2VzLnB1c2goc2VsZWN0aW9uLnRyYW5zbGF0ZShbLWluc2VydERlbHRhLCAwXSkpXG5cbiAgICAgIEBzZXRTZWxlY3RlZEJ1ZmZlclJhbmdlcyhuZXdTZWxlY3Rpb25SYW5nZXMsIHthdXRvc2Nyb2xsOiBmYWxzZSwgcHJlc2VydmVGb2xkczogdHJ1ZX0pXG4gICAgICBAYXV0b0luZGVudFNlbGVjdGVkUm93cygpIGlmIEBzaG91bGRBdXRvSW5kZW50KClcbiAgICAgIEBzY3JvbGxUb0J1ZmZlclBvc2l0aW9uKFtuZXdTZWxlY3Rpb25SYW5nZXNbMF0uc3RhcnQucm93LCAwXSlcblxuICAjIE1vdmUgbGluZXMgaW50ZXJzZWN0aW5nIHRoZSBtb3N0IHJlY2VudCBzZWxlY3Rpb24gb3IgbXVpbHRpcGxlIHNlbGVjdGlvbnNcbiAgIyBkb3duIGJ5IG9uZSByb3cgaW4gc2NyZWVuIGNvb3JkaW5hdGVzLlxuICBtb3ZlTGluZURvd246IC0+XG4gICAgc2VsZWN0aW9ucyA9IEBnZXRTZWxlY3RlZEJ1ZmZlclJhbmdlcygpXG4gICAgc2VsZWN0aW9ucy5zb3J0IChhLCBiKSAtPiBhLmNvbXBhcmUoYilcbiAgICBzZWxlY3Rpb25zID0gc2VsZWN0aW9ucy5yZXZlcnNlKClcblxuICAgIEB0cmFuc2FjdCA9PlxuICAgICAgQGNvbnNvbGlkYXRlU2VsZWN0aW9ucygpXG4gICAgICBuZXdTZWxlY3Rpb25SYW5nZXMgPSBbXVxuXG4gICAgICB3aGlsZSBzZWxlY3Rpb25zLmxlbmd0aCA+IDBcbiAgICAgICAgIyBGaW5kIHNlbGVjdGlvbnMgc3Bhbm5pbmcgYSBjb250aWd1b3VzIHNldCBvZiBsaW5lc1xuICAgICAgICBzZWxlY3Rpb24gPSBzZWxlY3Rpb25zLnNoaWZ0KClcbiAgICAgICAgc2VsZWN0aW9uc1RvTW92ZSA9IFtzZWxlY3Rpb25dXG5cbiAgICAgICAgIyBpZiB0aGUgY3VycmVudCBzZWxlY3Rpb24gc3RhcnQgcm93IG1hdGNoZXMgdGhlIG5leHQgc2VsZWN0aW9ucycgZW5kIHJvdyAtIG1ha2UgdGhlbSBvbmUgc2VsZWN0aW9uXG4gICAgICAgIHdoaWxlIHNlbGVjdGlvbi5zdGFydC5yb3cgaXMgc2VsZWN0aW9uc1swXT8uZW5kLnJvd1xuICAgICAgICAgIHNlbGVjdGlvbnNUb01vdmUucHVzaChzZWxlY3Rpb25zWzBdKVxuICAgICAgICAgIHNlbGVjdGlvbi5zdGFydC5yb3cgPSBzZWxlY3Rpb25zWzBdLnN0YXJ0LnJvd1xuICAgICAgICAgIHNlbGVjdGlvbnMuc2hpZnQoKVxuXG4gICAgICAgICMgQ29tcHV0ZSB0aGUgYnVmZmVyIHJhbmdlIHNwYW5uZWQgYnkgYWxsIHRoZXNlIHNlbGVjdGlvbnMsIGV4cGFuZGluZyBpdFxuICAgICAgICAjIHNvIHRoYXQgaXQgaW5jbHVkZXMgYW55IGZvbGRlZCByZWdpb24gdGhhdCBpbnRlcnNlY3RzIHRoZW0uXG4gICAgICAgIHN0YXJ0Um93ID0gc2VsZWN0aW9uLnN0YXJ0LnJvd1xuICAgICAgICBlbmRSb3cgPSBzZWxlY3Rpb24uZW5kLnJvd1xuICAgICAgICBpZiBzZWxlY3Rpb24uZW5kLnJvdyA+IHNlbGVjdGlvbi5zdGFydC5yb3cgYW5kIHNlbGVjdGlvbi5lbmQuY29sdW1uIGlzIDBcbiAgICAgICAgICAjIERvbid0IG1vdmUgdGhlIGxhc3QgbGluZSBvZiBhIG11bHRpLWxpbmUgc2VsZWN0aW9uIGlmIHRoZSBzZWxlY3Rpb24gZW5kcyBhdCBjb2x1bW4gMFxuICAgICAgICAgIGVuZFJvdy0tXG5cbiAgICAgICAgc3RhcnRSb3cgPSBAZGlzcGxheUxheWVyLmZpbmRCb3VuZGFyeVByZWNlZGluZ0J1ZmZlclJvdyhzdGFydFJvdylcbiAgICAgICAgZW5kUm93ID0gQGRpc3BsYXlMYXllci5maW5kQm91bmRhcnlGb2xsb3dpbmdCdWZmZXJSb3coZW5kUm93ICsgMSlcbiAgICAgICAgbGluZXNSYW5nZSA9IG5ldyBSYW5nZShQb2ludChzdGFydFJvdywgMCksIFBvaW50KGVuZFJvdywgMCkpXG5cbiAgICAgICAgIyBJZiBzZWxlY3RlZCBsaW5lIHJhbmdlIGlzIGZvbGxvd2VkIGJ5IGEgZm9sZCwgb25lIGxpbmUgYmVsb3cgb24gc2NyZWVuXG4gICAgICAgICMgY291bGQgYmUgbXVsdGlwbGUgbGluZXMgaW4gdGhlIGJ1ZmZlci4gQnV0IGF0IHRoZSBzYW1lIHRpbWUsIGlmIHRoZVxuICAgICAgICAjIG5leHQgYnVmZmVyIHJvdyBpcyB3cmFwcGVkLCBvbmUgbGluZSBpbiB0aGUgYnVmZmVyIGNhbiByZXByZXNlbnQgbWFueVxuICAgICAgICAjIHNjcmVlbiByb3dzLlxuICAgICAgICBmb2xsb3dpbmdSb3cgPSBNYXRoLm1pbihAYnVmZmVyLmdldExpbmVDb3VudCgpLCBAZGlzcGxheUxheWVyLmZpbmRCb3VuZGFyeUZvbGxvd2luZ0J1ZmZlclJvdyhlbmRSb3cgKyAxKSlcbiAgICAgICAgaW5zZXJ0RGVsdGEgPSBmb2xsb3dpbmdSb3cgLSBsaW5lc1JhbmdlLmVuZC5yb3dcblxuICAgICAgICAjIEFueSBmb2xkcyBpbiB0aGUgdGV4dCB0aGF0IGlzIG1vdmVkIHdpbGwgbmVlZCB0byBiZSByZS1jcmVhdGVkLlxuICAgICAgICAjIEl0IGluY2x1ZGVzIHRoZSBmb2xkcyB0aGF0IHdlcmUgaW50ZXJzZWN0aW5nIHdpdGggdGhlIHNlbGVjdGlvbi5cbiAgICAgICAgcmFuZ2VzVG9SZWZvbGQgPSBAZGlzcGxheUxheWVyXG4gICAgICAgICAgLmRlc3Ryb3lGb2xkc0ludGVyc2VjdGluZ0J1ZmZlclJhbmdlKGxpbmVzUmFuZ2UpXG4gICAgICAgICAgLm1hcCgocmFuZ2UpIC0+IHJhbmdlLnRyYW5zbGF0ZShbaW5zZXJ0RGVsdGEsIDBdKSlcblxuICAgICAgICAjIERlbGV0ZSBsaW5lcyBzcGFubmVkIGJ5IHNlbGVjdGlvbiBhbmQgaW5zZXJ0IHRoZW0gb24gdGhlIGZvbGxvd2luZyBjb3JyZWN0IGJ1ZmZlciByb3dcbiAgICAgICAgbGluZXMgPSBAYnVmZmVyLmdldFRleHRJblJhbmdlKGxpbmVzUmFuZ2UpXG4gICAgICAgIGlmIGZvbGxvd2luZ1JvdyAtIDEgaXMgQGJ1ZmZlci5nZXRMYXN0Um93KClcbiAgICAgICAgICBsaW5lcyA9IFwiXFxuI3tsaW5lc31cIlxuXG4gICAgICAgIEBidWZmZXIuaW5zZXJ0KFtmb2xsb3dpbmdSb3csIDBdLCBsaW5lcylcbiAgICAgICAgQGJ1ZmZlci5kZWxldGUobGluZXNSYW5nZSlcblxuICAgICAgICAjIFJlc3RvcmUgZm9sZHMgdGhhdCBleGlzdGVkIGJlZm9yZSB0aGUgbGluZXMgd2VyZSBtb3ZlZFxuICAgICAgICBmb3IgcmFuZ2VUb1JlZm9sZCBpbiByYW5nZXNUb1JlZm9sZFxuICAgICAgICAgIEBkaXNwbGF5TGF5ZXIuZm9sZEJ1ZmZlclJhbmdlKHJhbmdlVG9SZWZvbGQpXG5cbiAgICAgICAgZm9yIHNlbGVjdGlvbiBpbiBzZWxlY3Rpb25zVG9Nb3ZlXG4gICAgICAgICAgbmV3U2VsZWN0aW9uUmFuZ2VzLnB1c2goc2VsZWN0aW9uLnRyYW5zbGF0ZShbaW5zZXJ0RGVsdGEsIDBdKSlcblxuICAgICAgQHNldFNlbGVjdGVkQnVmZmVyUmFuZ2VzKG5ld1NlbGVjdGlvblJhbmdlcywge2F1dG9zY3JvbGw6IGZhbHNlLCBwcmVzZXJ2ZUZvbGRzOiB0cnVlfSlcbiAgICAgIEBhdXRvSW5kZW50U2VsZWN0ZWRSb3dzKCkgaWYgQHNob3VsZEF1dG9JbmRlbnQoKVxuICAgICAgQHNjcm9sbFRvQnVmZmVyUG9zaXRpb24oW25ld1NlbGVjdGlvblJhbmdlc1swXS5zdGFydC5yb3cgLSAxLCAwXSlcblxuICAjIE1vdmUgYW55IGFjdGl2ZSBzZWxlY3Rpb25zIG9uZSBjb2x1bW4gdG8gdGhlIGxlZnQuXG4gIG1vdmVTZWxlY3Rpb25MZWZ0OiAtPlxuICAgIHNlbGVjdGlvbnMgPSBAZ2V0U2VsZWN0ZWRCdWZmZXJSYW5nZXMoKVxuICAgIG5vU2VsZWN0aW9uQXRTdGFydE9mTGluZSA9IHNlbGVjdGlvbnMuZXZlcnkoKHNlbGVjdGlvbikgLT5cbiAgICAgIHNlbGVjdGlvbi5zdGFydC5jb2x1bW4gaXNudCAwXG4gICAgKVxuXG4gICAgdHJhbnNsYXRpb25EZWx0YSA9IFswLCAtMV1cbiAgICB0cmFuc2xhdGVkUmFuZ2VzID0gW11cblxuICAgIGlmIG5vU2VsZWN0aW9uQXRTdGFydE9mTGluZVxuICAgICAgQHRyYW5zYWN0ID0+XG4gICAgICAgIGZvciBzZWxlY3Rpb24gaW4gc2VsZWN0aW9uc1xuICAgICAgICAgIGNoYXJUb0xlZnRPZlNlbGVjdGlvbiA9IG5ldyBSYW5nZShzZWxlY3Rpb24uc3RhcnQudHJhbnNsYXRlKHRyYW5zbGF0aW9uRGVsdGEpLCBzZWxlY3Rpb24uc3RhcnQpXG4gICAgICAgICAgY2hhclRleHRUb0xlZnRPZlNlbGVjdGlvbiA9IEBidWZmZXIuZ2V0VGV4dEluUmFuZ2UoY2hhclRvTGVmdE9mU2VsZWN0aW9uKVxuXG4gICAgICAgICAgQGJ1ZmZlci5pbnNlcnQoc2VsZWN0aW9uLmVuZCwgY2hhclRleHRUb0xlZnRPZlNlbGVjdGlvbilcbiAgICAgICAgICBAYnVmZmVyLmRlbGV0ZShjaGFyVG9MZWZ0T2ZTZWxlY3Rpb24pXG4gICAgICAgICAgdHJhbnNsYXRlZFJhbmdlcy5wdXNoKHNlbGVjdGlvbi50cmFuc2xhdGUodHJhbnNsYXRpb25EZWx0YSkpXG5cbiAgICAgICAgQHNldFNlbGVjdGVkQnVmZmVyUmFuZ2VzKHRyYW5zbGF0ZWRSYW5nZXMpXG5cbiAgIyBNb3ZlIGFueSBhY3RpdmUgc2VsZWN0aW9ucyBvbmUgY29sdW1uIHRvIHRoZSByaWdodC5cbiAgbW92ZVNlbGVjdGlvblJpZ2h0OiAtPlxuICAgIHNlbGVjdGlvbnMgPSBAZ2V0U2VsZWN0ZWRCdWZmZXJSYW5nZXMoKVxuICAgIG5vU2VsZWN0aW9uQXRFbmRPZkxpbmUgPSBzZWxlY3Rpb25zLmV2ZXJ5KChzZWxlY3Rpb24pID0+XG4gICAgICBzZWxlY3Rpb24uZW5kLmNvbHVtbiBpc250IEBidWZmZXIubGluZUxlbmd0aEZvclJvdyhzZWxlY3Rpb24uZW5kLnJvdylcbiAgICApXG5cbiAgICB0cmFuc2xhdGlvbkRlbHRhID0gWzAsIDFdXG4gICAgdHJhbnNsYXRlZFJhbmdlcyA9IFtdXG5cbiAgICBpZiBub1NlbGVjdGlvbkF0RW5kT2ZMaW5lXG4gICAgICBAdHJhbnNhY3QgPT5cbiAgICAgICAgZm9yIHNlbGVjdGlvbiBpbiBzZWxlY3Rpb25zXG4gICAgICAgICAgY2hhclRvUmlnaHRPZlNlbGVjdGlvbiA9IG5ldyBSYW5nZShzZWxlY3Rpb24uZW5kLCBzZWxlY3Rpb24uZW5kLnRyYW5zbGF0ZSh0cmFuc2xhdGlvbkRlbHRhKSlcbiAgICAgICAgICBjaGFyVGV4dFRvUmlnaHRPZlNlbGVjdGlvbiA9IEBidWZmZXIuZ2V0VGV4dEluUmFuZ2UoY2hhclRvUmlnaHRPZlNlbGVjdGlvbilcblxuICAgICAgICAgIEBidWZmZXIuZGVsZXRlKGNoYXJUb1JpZ2h0T2ZTZWxlY3Rpb24pXG4gICAgICAgICAgQGJ1ZmZlci5pbnNlcnQoc2VsZWN0aW9uLnN0YXJ0LCBjaGFyVGV4dFRvUmlnaHRPZlNlbGVjdGlvbilcbiAgICAgICAgICB0cmFuc2xhdGVkUmFuZ2VzLnB1c2goc2VsZWN0aW9uLnRyYW5zbGF0ZSh0cmFuc2xhdGlvbkRlbHRhKSlcblxuICAgICAgICBAc2V0U2VsZWN0ZWRCdWZmZXJSYW5nZXModHJhbnNsYXRlZFJhbmdlcylcblxuICBkdXBsaWNhdGVMaW5lczogLT5cbiAgICBAdHJhbnNhY3QgPT5cbiAgICAgIHNlbGVjdGlvbnMgPSBAZ2V0U2VsZWN0aW9uc09yZGVyZWRCeUJ1ZmZlclBvc2l0aW9uKClcbiAgICAgIHByZXZpb3VzU2VsZWN0aW9uUmFuZ2VzID0gW11cblxuICAgICAgaSA9IHNlbGVjdGlvbnMubGVuZ3RoIC0gMVxuICAgICAgd2hpbGUgaSA+PSAwXG4gICAgICAgIGogPSBpXG4gICAgICAgIHByZXZpb3VzU2VsZWN0aW9uUmFuZ2VzW2ldID0gc2VsZWN0aW9uc1tpXS5nZXRCdWZmZXJSYW5nZSgpXG4gICAgICAgIGlmIHNlbGVjdGlvbnNbaV0uaXNFbXB0eSgpXG4gICAgICAgICAge3N0YXJ0fSA9IHNlbGVjdGlvbnNbaV0uZ2V0U2NyZWVuUmFuZ2UoKVxuICAgICAgICAgIHNlbGVjdGlvbnNbaV0uc2V0U2NyZWVuUmFuZ2UoW1tzdGFydC5yb3csIDBdLCBbc3RhcnQucm93ICsgMSwgMF1dLCBwcmVzZXJ2ZUZvbGRzOiB0cnVlKVxuICAgICAgICBbc3RhcnRSb3csIGVuZFJvd10gPSBzZWxlY3Rpb25zW2ldLmdldEJ1ZmZlclJvd1JhbmdlKClcbiAgICAgICAgZW5kUm93KytcbiAgICAgICAgd2hpbGUgaSA+IDBcbiAgICAgICAgICBbcHJldmlvdXNTZWxlY3Rpb25TdGFydFJvdywgcHJldmlvdXNTZWxlY3Rpb25FbmRSb3ddID0gc2VsZWN0aW9uc1tpIC0gMV0uZ2V0QnVmZmVyUm93UmFuZ2UoKVxuICAgICAgICAgIGlmIHByZXZpb3VzU2VsZWN0aW9uRW5kUm93IGlzIHN0YXJ0Um93XG4gICAgICAgICAgICBzdGFydFJvdyA9IHByZXZpb3VzU2VsZWN0aW9uU3RhcnRSb3dcbiAgICAgICAgICAgIHByZXZpb3VzU2VsZWN0aW9uUmFuZ2VzW2kgLSAxXSA9IHNlbGVjdGlvbnNbaSAtIDFdLmdldEJ1ZmZlclJhbmdlKClcbiAgICAgICAgICAgIGktLVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgaW50ZXJzZWN0aW5nRm9sZHMgPSBAZGlzcGxheUxheWVyLmZvbGRzSW50ZXJzZWN0aW5nQnVmZmVyUmFuZ2UoW1tzdGFydFJvdywgMF0sIFtlbmRSb3csIDBdXSlcbiAgICAgICAgdGV4dFRvRHVwbGljYXRlID0gQGdldFRleHRJbkJ1ZmZlclJhbmdlKFtbc3RhcnRSb3csIDBdLCBbZW5kUm93LCAwXV0pXG4gICAgICAgIHRleHRUb0R1cGxpY2F0ZSA9ICdcXG4nICsgdGV4dFRvRHVwbGljYXRlIGlmIGVuZFJvdyA+IEBnZXRMYXN0QnVmZmVyUm93KClcbiAgICAgICAgQGJ1ZmZlci5pbnNlcnQoW2VuZFJvdywgMF0sIHRleHRUb0R1cGxpY2F0ZSlcblxuICAgICAgICBpbnNlcnRlZFJvd0NvdW50ID0gZW5kUm93IC0gc3RhcnRSb3dcblxuICAgICAgICBmb3IgayBpbiBbaS4ual0gYnkgMVxuICAgICAgICAgIHNlbGVjdGlvbnNba10uc2V0QnVmZmVyUmFuZ2UocHJldmlvdXNTZWxlY3Rpb25SYW5nZXNba10udHJhbnNsYXRlKFtpbnNlcnRlZFJvd0NvdW50LCAwXSkpXG5cbiAgICAgICAgZm9yIGZvbGQgaW4gaW50ZXJzZWN0aW5nRm9sZHNcbiAgICAgICAgICBmb2xkUmFuZ2UgPSBAZGlzcGxheUxheWVyLmJ1ZmZlclJhbmdlRm9yRm9sZChmb2xkKVxuICAgICAgICAgIEBkaXNwbGF5TGF5ZXIuZm9sZEJ1ZmZlclJhbmdlKGZvbGRSYW5nZS50cmFuc2xhdGUoW2luc2VydGVkUm93Q291bnQsIDBdKSlcblxuICAgICAgICBpLS1cblxuICByZXBsYWNlU2VsZWN0ZWRUZXh0OiAob3B0aW9ucz17fSwgZm4pIC0+XG4gICAge3NlbGVjdFdvcmRJZkVtcHR5fSA9IG9wdGlvbnNcbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+XG4gICAgICBzZWxlY3Rpb24uZ2V0QnVmZmVyUmFuZ2UoKVxuICAgICAgaWYgc2VsZWN0V29yZElmRW1wdHkgYW5kIHNlbGVjdGlvbi5pc0VtcHR5KClcbiAgICAgICAgc2VsZWN0aW9uLnNlbGVjdFdvcmQoKVxuICAgICAgdGV4dCA9IHNlbGVjdGlvbi5nZXRUZXh0KClcbiAgICAgIHNlbGVjdGlvbi5kZWxldGVTZWxlY3RlZFRleHQoKVxuICAgICAgcmFuZ2UgPSBzZWxlY3Rpb24uaW5zZXJ0VGV4dChmbih0ZXh0KSlcbiAgICAgIHNlbGVjdGlvbi5zZXRCdWZmZXJSYW5nZShyYW5nZSlcblxuICAjIFNwbGl0IG11bHRpLWxpbmUgc2VsZWN0aW9ucyBpbnRvIG9uZSBzZWxlY3Rpb24gcGVyIGxpbmUuXG4gICNcbiAgIyBPcGVyYXRlcyBvbiBhbGwgc2VsZWN0aW9ucy4gVGhpcyBtZXRob2QgYnJlYWtzIGFwYXJ0IGFsbCBtdWx0aS1saW5lXG4gICMgc2VsZWN0aW9ucyB0byBjcmVhdGUgbXVsdGlwbGUgc2luZ2xlLWxpbmUgc2VsZWN0aW9ucyB0aGF0IGN1bXVsYXRpdmVseSBjb3ZlclxuICAjIHRoZSBzYW1lIG9yaWdpbmFsIGFyZWEuXG4gIHNwbGl0U2VsZWN0aW9uc0ludG9MaW5lczogLT5cbiAgICBAbWVyZ2VJbnRlcnNlY3RpbmdTZWxlY3Rpb25zID0+XG4gICAgICBmb3Igc2VsZWN0aW9uIGluIEBnZXRTZWxlY3Rpb25zKClcbiAgICAgICAgcmFuZ2UgPSBzZWxlY3Rpb24uZ2V0QnVmZmVyUmFuZ2UoKVxuICAgICAgICBjb250aW51ZSBpZiByYW5nZS5pc1NpbmdsZUxpbmUoKVxuXG4gICAgICAgIHtzdGFydCwgZW5kfSA9IHJhbmdlXG4gICAgICAgIEBhZGRTZWxlY3Rpb25Gb3JCdWZmZXJSYW5nZShbc3RhcnQsIFtzdGFydC5yb3csIEluZmluaXR5XV0pXG4gICAgICAgIHtyb3d9ID0gc3RhcnRcbiAgICAgICAgd2hpbGUgKytyb3cgPCBlbmQucm93XG4gICAgICAgICAgQGFkZFNlbGVjdGlvbkZvckJ1ZmZlclJhbmdlKFtbcm93LCAwXSwgW3JvdywgSW5maW5pdHldXSlcbiAgICAgICAgQGFkZFNlbGVjdGlvbkZvckJ1ZmZlclJhbmdlKFtbZW5kLnJvdywgMF0sIFtlbmQucm93LCBlbmQuY29sdW1uXV0pIHVubGVzcyBlbmQuY29sdW1uIGlzIDBcbiAgICAgICAgc2VsZWN0aW9uLmRlc3Ryb3koKVxuICAgICAgcmV0dXJuXG5cbiAgIyBFeHRlbmRlZDogRm9yIGVhY2ggc2VsZWN0aW9uLCB0cmFuc3Bvc2UgdGhlIHNlbGVjdGVkIHRleHQuXG4gICNcbiAgIyBJZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCB0aGUgY2hhcmFjdGVycyBwcmVjZWRpbmcgYW5kIGZvbGxvd2luZyB0aGUgY3Vyc29yXG4gICMgYXJlIHN3YXBwZWQuIE90aGVyd2lzZSwgdGhlIHNlbGVjdGVkIGNoYXJhY3RlcnMgYXJlIHJldmVyc2VkLlxuICB0cmFuc3Bvc2U6IC0+XG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPlxuICAgICAgaWYgc2VsZWN0aW9uLmlzRW1wdHkoKVxuICAgICAgICBzZWxlY3Rpb24uc2VsZWN0UmlnaHQoKVxuICAgICAgICB0ZXh0ID0gc2VsZWN0aW9uLmdldFRleHQoKVxuICAgICAgICBzZWxlY3Rpb24uZGVsZXRlKClcbiAgICAgICAgc2VsZWN0aW9uLmN1cnNvci5tb3ZlTGVmdCgpXG4gICAgICAgIHNlbGVjdGlvbi5pbnNlcnRUZXh0IHRleHRcbiAgICAgIGVsc2VcbiAgICAgICAgc2VsZWN0aW9uLmluc2VydFRleHQgc2VsZWN0aW9uLmdldFRleHQoKS5zcGxpdCgnJykucmV2ZXJzZSgpLmpvaW4oJycpXG5cbiAgIyBFeHRlbmRlZDogQ29udmVydCB0aGUgc2VsZWN0ZWQgdGV4dCB0byB1cHBlciBjYXNlLlxuICAjXG4gICMgRm9yIGVhY2ggc2VsZWN0aW9uLCBpZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCBjb252ZXJ0cyB0aGUgY29udGFpbmluZyB3b3JkXG4gICMgdG8gdXBwZXIgY2FzZS4gT3RoZXJ3aXNlIGNvbnZlcnQgdGhlIHNlbGVjdGVkIHRleHQgdG8gdXBwZXIgY2FzZS5cbiAgdXBwZXJDYXNlOiAtPlxuICAgIEByZXBsYWNlU2VsZWN0ZWRUZXh0IHNlbGVjdFdvcmRJZkVtcHR5OiB0cnVlLCAodGV4dCkgLT4gdGV4dC50b1VwcGVyQ2FzZSgpXG5cbiAgIyBFeHRlbmRlZDogQ29udmVydCB0aGUgc2VsZWN0ZWQgdGV4dCB0byBsb3dlciBjYXNlLlxuICAjXG4gICMgRm9yIGVhY2ggc2VsZWN0aW9uLCBpZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCBjb252ZXJ0cyB0aGUgY29udGFpbmluZyB3b3JkXG4gICMgdG8gdXBwZXIgY2FzZS4gT3RoZXJ3aXNlIGNvbnZlcnQgdGhlIHNlbGVjdGVkIHRleHQgdG8gdXBwZXIgY2FzZS5cbiAgbG93ZXJDYXNlOiAtPlxuICAgIEByZXBsYWNlU2VsZWN0ZWRUZXh0IHNlbGVjdFdvcmRJZkVtcHR5OiB0cnVlLCAodGV4dCkgLT4gdGV4dC50b0xvd2VyQ2FzZSgpXG5cbiAgIyBFeHRlbmRlZDogVG9nZ2xlIGxpbmUgY29tbWVudHMgZm9yIHJvd3MgaW50ZXJzZWN0aW5nIHNlbGVjdGlvbnMuXG4gICNcbiAgIyBJZiB0aGUgY3VycmVudCBncmFtbWFyIGRvZXNuJ3Qgc3VwcG9ydCBjb21tZW50cywgZG9lcyBub3RoaW5nLlxuICB0b2dnbGVMaW5lQ29tbWVudHNJblNlbGVjdGlvbjogLT5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi50b2dnbGVMaW5lQ29tbWVudHMoKVxuXG4gICMgQ29udmVydCBtdWx0aXBsZSBsaW5lcyB0byBhIHNpbmdsZSBsaW5lLlxuICAjXG4gICMgT3BlcmF0ZXMgb24gYWxsIHNlbGVjdGlvbnMuIElmIHRoZSBzZWxlY3Rpb24gaXMgZW1wdHksIGpvaW5zIHRoZSBjdXJyZW50XG4gICMgbGluZSB3aXRoIHRoZSBuZXh0IGxpbmUuIE90aGVyd2lzZSBpdCBqb2lucyBhbGwgbGluZXMgdGhhdCBpbnRlcnNlY3QgdGhlXG4gICMgc2VsZWN0aW9uLlxuICAjXG4gICMgSm9pbmluZyBhIGxpbmUgbWVhbnMgdGhhdCBtdWx0aXBsZSBsaW5lcyBhcmUgY29udmVydGVkIHRvIGEgc2luZ2xlIGxpbmUgd2l0aFxuICAjIHRoZSBjb250ZW50cyBvZiBlYWNoIG9mIHRoZSBvcmlnaW5hbCBub24tZW1wdHkgbGluZXMgc2VwYXJhdGVkIGJ5IGEgc3BhY2UuXG4gIGpvaW5MaW5lczogLT5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5qb2luTGluZXMoKVxuXG4gICMgRXh0ZW5kZWQ6IEZvciBlYWNoIGN1cnNvciwgaW5zZXJ0IGEgbmV3bGluZSBhdCBiZWdpbm5pbmcgdGhlIGZvbGxvd2luZyBsaW5lLlxuICBpbnNlcnROZXdsaW5lQmVsb3c6IC0+XG4gICAgQHRyYW5zYWN0ID0+XG4gICAgICBAbW92ZVRvRW5kT2ZMaW5lKClcbiAgICAgIEBpbnNlcnROZXdsaW5lKClcblxuICAjIEV4dGVuZGVkOiBGb3IgZWFjaCBjdXJzb3IsIGluc2VydCBhIG5ld2xpbmUgYXQgdGhlIGVuZCBvZiB0aGUgcHJlY2VkaW5nIGxpbmUuXG4gIGluc2VydE5ld2xpbmVBYm92ZTogLT5cbiAgICBAdHJhbnNhY3QgPT5cbiAgICAgIGJ1ZmZlclJvdyA9IEBnZXRDdXJzb3JCdWZmZXJQb3NpdGlvbigpLnJvd1xuICAgICAgaW5kZW50TGV2ZWwgPSBAaW5kZW50YXRpb25Gb3JCdWZmZXJSb3coYnVmZmVyUm93KVxuICAgICAgb25GaXJzdExpbmUgPSBidWZmZXJSb3cgaXMgMFxuXG4gICAgICBAbW92ZVRvQmVnaW5uaW5nT2ZMaW5lKClcbiAgICAgIEBtb3ZlTGVmdCgpXG4gICAgICBAaW5zZXJ0TmV3bGluZSgpXG5cbiAgICAgIGlmIEBzaG91bGRBdXRvSW5kZW50KCkgYW5kIEBpbmRlbnRhdGlvbkZvckJ1ZmZlclJvdyhidWZmZXJSb3cpIDwgaW5kZW50TGV2ZWxcbiAgICAgICAgQHNldEluZGVudGF0aW9uRm9yQnVmZmVyUm93KGJ1ZmZlclJvdywgaW5kZW50TGV2ZWwpXG5cbiAgICAgIGlmIG9uRmlyc3RMaW5lXG4gICAgICAgIEBtb3ZlVXAoKVxuICAgICAgICBAbW92ZVRvRW5kT2ZMaW5lKClcblxuICAjIEV4dGVuZGVkOiBGb3IgZWFjaCBzZWxlY3Rpb24sIGlmIHRoZSBzZWxlY3Rpb24gaXMgZW1wdHksIGRlbGV0ZSBhbGwgY2hhcmFjdGVyc1xuICAjIG9mIHRoZSBjb250YWluaW5nIHdvcmQgdGhhdCBwcmVjZWRlIHRoZSBjdXJzb3IuIE90aGVyd2lzZSBkZWxldGUgdGhlXG4gICMgc2VsZWN0ZWQgdGV4dC5cbiAgZGVsZXRlVG9CZWdpbm5pbmdPZldvcmQ6IC0+XG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uZGVsZXRlVG9CZWdpbm5pbmdPZldvcmQoKVxuXG4gICMgRXh0ZW5kZWQ6IFNpbWlsYXIgdG8gezo6ZGVsZXRlVG9CZWdpbm5pbmdPZldvcmR9LCBidXQgZGVsZXRlcyBvbmx5IGJhY2sgdG8gdGhlXG4gICMgcHJldmlvdXMgd29yZCBib3VuZGFyeS5cbiAgZGVsZXRlVG9QcmV2aW91c1dvcmRCb3VuZGFyeTogLT5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5kZWxldGVUb1ByZXZpb3VzV29yZEJvdW5kYXJ5KClcblxuICAjIEV4dGVuZGVkOiBTaW1pbGFyIHRvIHs6OmRlbGV0ZVRvRW5kT2ZXb3JkfSwgYnV0IGRlbGV0ZXMgb25seSB1cCB0byB0aGVcbiAgIyBuZXh0IHdvcmQgYm91bmRhcnkuXG4gIGRlbGV0ZVRvTmV4dFdvcmRCb3VuZGFyeTogLT5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5kZWxldGVUb05leHRXb3JkQm91bmRhcnkoKVxuXG4gICMgRXh0ZW5kZWQ6IEZvciBlYWNoIHNlbGVjdGlvbiwgaWYgdGhlIHNlbGVjdGlvbiBpcyBlbXB0eSwgZGVsZXRlIGFsbCBjaGFyYWN0ZXJzXG4gICMgb2YgdGhlIGNvbnRhaW5pbmcgc3Vid29yZCBmb2xsb3dpbmcgdGhlIGN1cnNvci4gT3RoZXJ3aXNlIGRlbGV0ZSB0aGUgc2VsZWN0ZWRcbiAgIyB0ZXh0LlxuICBkZWxldGVUb0JlZ2lubmluZ09mU3Vid29yZDogLT5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5kZWxldGVUb0JlZ2lubmluZ09mU3Vid29yZCgpXG5cbiAgIyBFeHRlbmRlZDogRm9yIGVhY2ggc2VsZWN0aW9uLCBpZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCBkZWxldGUgYWxsIGNoYXJhY3RlcnNcbiAgIyBvZiB0aGUgY29udGFpbmluZyBzdWJ3b3JkIGZvbGxvd2luZyB0aGUgY3Vyc29yLiBPdGhlcndpc2UgZGVsZXRlIHRoZSBzZWxlY3RlZFxuICAjIHRleHQuXG4gIGRlbGV0ZVRvRW5kT2ZTdWJ3b3JkOiAtPlxuICAgIEBtdXRhdGVTZWxlY3RlZFRleHQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLmRlbGV0ZVRvRW5kT2ZTdWJ3b3JkKClcblxuICAjIEV4dGVuZGVkOiBGb3IgZWFjaCBzZWxlY3Rpb24sIGlmIHRoZSBzZWxlY3Rpb24gaXMgZW1wdHksIGRlbGV0ZSBhbGwgY2hhcmFjdGVyc1xuICAjIG9mIHRoZSBjb250YWluaW5nIGxpbmUgdGhhdCBwcmVjZWRlIHRoZSBjdXJzb3IuIE90aGVyd2lzZSBkZWxldGUgdGhlXG4gICMgc2VsZWN0ZWQgdGV4dC5cbiAgZGVsZXRlVG9CZWdpbm5pbmdPZkxpbmU6IC0+XG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uZGVsZXRlVG9CZWdpbm5pbmdPZkxpbmUoKVxuXG4gICMgRXh0ZW5kZWQ6IEZvciBlYWNoIHNlbGVjdGlvbiwgaWYgdGhlIHNlbGVjdGlvbiBpcyBub3QgZW1wdHksIGRlbGV0ZXMgdGhlXG4gICMgc2VsZWN0aW9uOyBvdGhlcndpc2UsIGRlbGV0ZXMgYWxsIGNoYXJhY3RlcnMgb2YgdGhlIGNvbnRhaW5pbmcgbGluZVxuICAjIGZvbGxvd2luZyB0aGUgY3Vyc29yLiBJZiB0aGUgY3Vyc29yIGlzIGFscmVhZHkgYXQgdGhlIGVuZCBvZiB0aGUgbGluZSxcbiAgIyBkZWxldGVzIHRoZSBmb2xsb3dpbmcgbmV3bGluZS5cbiAgZGVsZXRlVG9FbmRPZkxpbmU6IC0+XG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uZGVsZXRlVG9FbmRPZkxpbmUoKVxuXG4gICMgRXh0ZW5kZWQ6IEZvciBlYWNoIHNlbGVjdGlvbiwgaWYgdGhlIHNlbGVjdGlvbiBpcyBlbXB0eSwgZGVsZXRlIGFsbCBjaGFyYWN0ZXJzXG4gICMgb2YgdGhlIGNvbnRhaW5pbmcgd29yZCBmb2xsb3dpbmcgdGhlIGN1cnNvci4gT3RoZXJ3aXNlIGRlbGV0ZSB0aGUgc2VsZWN0ZWRcbiAgIyB0ZXh0LlxuICBkZWxldGVUb0VuZE9mV29yZDogLT5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5kZWxldGVUb0VuZE9mV29yZCgpXG5cbiAgIyBFeHRlbmRlZDogRGVsZXRlIGFsbCBsaW5lcyBpbnRlcnNlY3Rpbmcgc2VsZWN0aW9ucy5cbiAgZGVsZXRlTGluZTogLT5cbiAgICBAbWVyZ2VTZWxlY3Rpb25zT25TYW1lUm93cygpXG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uZGVsZXRlTGluZSgpXG5cbiAgIyMjXG4gIFNlY3Rpb246IEhpc3RvcnlcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IFVuZG8gdGhlIGxhc3QgY2hhbmdlLlxuICB1bmRvOiAtPlxuICAgIEBhdm9pZE1lcmdpbmdTZWxlY3Rpb25zID0+IEBidWZmZXIudW5kbygpXG4gICAgQGdldExhc3RTZWxlY3Rpb24oKS5hdXRvc2Nyb2xsKClcblxuICAjIEVzc2VudGlhbDogUmVkbyB0aGUgbGFzdCBjaGFuZ2UuXG4gIHJlZG86IC0+XG4gICAgQGF2b2lkTWVyZ2luZ1NlbGVjdGlvbnMgPT4gQGJ1ZmZlci5yZWRvKClcbiAgICBAZ2V0TGFzdFNlbGVjdGlvbigpLmF1dG9zY3JvbGwoKVxuXG4gICMgRXh0ZW5kZWQ6IEJhdGNoIG11bHRpcGxlIG9wZXJhdGlvbnMgYXMgYSBzaW5nbGUgdW5kby9yZWRvIHN0ZXAuXG4gICNcbiAgIyBBbnkgZ3JvdXAgb2Ygb3BlcmF0aW9ucyB0aGF0IGFyZSBsb2dpY2FsbHkgZ3JvdXBlZCBmcm9tIHRoZSBwZXJzcGVjdGl2ZSBvZlxuICAjIHVuZG9pbmcgYW5kIHJlZG9pbmcgc2hvdWxkIGJlIHBlcmZvcm1lZCBpbiBhIHRyYW5zYWN0aW9uLiBJZiB5b3Ugd2FudCB0b1xuICAjIGFib3J0IHRoZSB0cmFuc2FjdGlvbiwgY2FsbCB7OjphYm9ydFRyYW5zYWN0aW9ufSB0byB0ZXJtaW5hdGUgdGhlIGZ1bmN0aW9uJ3NcbiAgIyBleGVjdXRpb24gYW5kIHJldmVydCBhbnkgY2hhbmdlcyBwZXJmb3JtZWQgdXAgdG8gdGhlIGFib3J0aW9uLlxuICAjXG4gICMgKiBgZ3JvdXBpbmdJbnRlcnZhbGAgKG9wdGlvbmFsKSBUaGUge051bWJlcn0gb2YgbWlsbGlzZWNvbmRzIGZvciB3aGljaCB0aGlzXG4gICMgICB0cmFuc2FjdGlvbiBzaG91bGQgYmUgY29uc2lkZXJlZCAnZ3JvdXBhYmxlJyBhZnRlciBpdCBiZWdpbnMuIElmIGEgdHJhbnNhY3Rpb25cbiAgIyAgIHdpdGggYSBwb3NpdGl2ZSBgZ3JvdXBpbmdJbnRlcnZhbGAgaXMgY29tbWl0dGVkIHdoaWxlIHRoZSBwcmV2aW91cyB0cmFuc2FjdGlvbiBpc1xuICAjICAgc3RpbGwgJ2dyb3VwYWJsZScsIHRoZSB0d28gdHJhbnNhY3Rpb25zIGFyZSBtZXJnZWQgd2l0aCByZXNwZWN0IHRvIHVuZG8gYW5kIHJlZG8uXG4gICMgKiBgZm5gIEEge0Z1bmN0aW9ufSB0byBjYWxsIGluc2lkZSB0aGUgdHJhbnNhY3Rpb24uXG4gIHRyYW5zYWN0OiAoZ3JvdXBpbmdJbnRlcnZhbCwgZm4pIC0+XG4gICAgQGJ1ZmZlci50cmFuc2FjdChncm91cGluZ0ludGVydmFsLCBmbilcblxuICAjIERlcHJlY2F0ZWQ6IFN0YXJ0IGFuIG9wZW4tZW5kZWQgdHJhbnNhY3Rpb24uXG4gIGJlZ2luVHJhbnNhY3Rpb246IChncm91cGluZ0ludGVydmFsKSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKCdUcmFuc2FjdGlvbnMgc2hvdWxkIGJlIHBlcmZvcm1lZCB2aWEgVGV4dEVkaXRvcjo6dHJhbnNhY3Qgb25seScpXG4gICAgQGJ1ZmZlci5iZWdpblRyYW5zYWN0aW9uKGdyb3VwaW5nSW50ZXJ2YWwpXG5cbiAgIyBEZXByZWNhdGVkOiBDb21taXQgYW4gb3Blbi1lbmRlZCB0cmFuc2FjdGlvbiBzdGFydGVkIHdpdGggezo6YmVnaW5UcmFuc2FjdGlvbn0uXG4gIGNvbW1pdFRyYW5zYWN0aW9uOiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKCdUcmFuc2FjdGlvbnMgc2hvdWxkIGJlIHBlcmZvcm1lZCB2aWEgVGV4dEVkaXRvcjo6dHJhbnNhY3Qgb25seScpXG4gICAgQGJ1ZmZlci5jb21taXRUcmFuc2FjdGlvbigpXG5cbiAgIyBFeHRlbmRlZDogQWJvcnQgYW4gb3BlbiB0cmFuc2FjdGlvbiwgdW5kb2luZyBhbnkgb3BlcmF0aW9ucyBwZXJmb3JtZWQgc28gZmFyXG4gICMgd2l0aGluIHRoZSB0cmFuc2FjdGlvbi5cbiAgYWJvcnRUcmFuc2FjdGlvbjogLT4gQGJ1ZmZlci5hYm9ydFRyYW5zYWN0aW9uKClcblxuICAjIEV4dGVuZGVkOiBDcmVhdGUgYSBwb2ludGVyIHRvIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBidWZmZXIgZm9yIHVzZVxuICAjIHdpdGggezo6cmV2ZXJ0VG9DaGVja3BvaW50fSBhbmQgezo6Z3JvdXBDaGFuZ2VzU2luY2VDaGVja3BvaW50fS5cbiAgI1xuICAjIFJldHVybnMgYSBjaGVja3BvaW50IHZhbHVlLlxuICBjcmVhdGVDaGVja3BvaW50OiAtPiBAYnVmZmVyLmNyZWF0ZUNoZWNrcG9pbnQoKVxuXG4gICMgRXh0ZW5kZWQ6IFJldmVydCB0aGUgYnVmZmVyIHRvIHRoZSBzdGF0ZSBpdCB3YXMgaW4gd2hlbiB0aGUgZ2l2ZW5cbiAgIyBjaGVja3BvaW50IHdhcyBjcmVhdGVkLlxuICAjXG4gICMgVGhlIHJlZG8gc3RhY2sgd2lsbCBiZSBlbXB0eSBmb2xsb3dpbmcgdGhpcyBvcGVyYXRpb24sIHNvIGNoYW5nZXMgc2luY2UgdGhlXG4gICMgY2hlY2twb2ludCB3aWxsIGJlIGxvc3QuIElmIHRoZSBnaXZlbiBjaGVja3BvaW50IGlzIG5vIGxvbmdlciBwcmVzZW50IGluIHRoZVxuICAjIHVuZG8gaGlzdG9yeSwgbm8gY2hhbmdlcyB3aWxsIGJlIG1hZGUgdG8gdGhlIGJ1ZmZlciBhbmQgdGhpcyBtZXRob2Qgd2lsbFxuICAjIHJldHVybiBgZmFsc2VgLlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIG9wZXJhdGlvbiBzdWNjZWVkZWQuXG4gIHJldmVydFRvQ2hlY2twb2ludDogKGNoZWNrcG9pbnQpIC0+IEBidWZmZXIucmV2ZXJ0VG9DaGVja3BvaW50KGNoZWNrcG9pbnQpXG5cbiAgIyBFeHRlbmRlZDogR3JvdXAgYWxsIGNoYW5nZXMgc2luY2UgdGhlIGdpdmVuIGNoZWNrcG9pbnQgaW50byBhIHNpbmdsZVxuICAjIHRyYW5zYWN0aW9uIGZvciBwdXJwb3NlcyBvZiB1bmRvL3JlZG8uXG4gICNcbiAgIyBJZiB0aGUgZ2l2ZW4gY2hlY2twb2ludCBpcyBubyBsb25nZXIgcHJlc2VudCBpbiB0aGUgdW5kbyBoaXN0b3J5LCBub1xuICAjIGdyb3VwaW5nIHdpbGwgYmUgcGVyZm9ybWVkIGFuZCB0aGlzIG1ldGhvZCB3aWxsIHJldHVybiBgZmFsc2VgLlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIG9wZXJhdGlvbiBzdWNjZWVkZWQuXG4gIGdyb3VwQ2hhbmdlc1NpbmNlQ2hlY2twb2ludDogKGNoZWNrcG9pbnQpIC0+IEBidWZmZXIuZ3JvdXBDaGFuZ2VzU2luY2VDaGVja3BvaW50KGNoZWNrcG9pbnQpXG5cbiAgIyMjXG4gIFNlY3Rpb246IFRleHRFZGl0b3IgQ29vcmRpbmF0ZXNcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IENvbnZlcnQgYSBwb3NpdGlvbiBpbiBidWZmZXItY29vcmRpbmF0ZXMgdG8gc2NyZWVuLWNvb3JkaW5hdGVzLlxuICAjXG4gICMgVGhlIHBvc2l0aW9uIGlzIGNsaXBwZWQgdmlhIHs6OmNsaXBCdWZmZXJQb3NpdGlvbn0gcHJpb3IgdG8gdGhlIGNvbnZlcnNpb24uXG4gICMgVGhlIHBvc2l0aW9uIGlzIGFsc28gY2xpcHBlZCB2aWEgezo6Y2xpcFNjcmVlblBvc2l0aW9ufSBmb2xsb3dpbmcgdGhlXG4gICMgY29udmVyc2lvbiwgd2hpY2ggb25seSBtYWtlcyBhIGRpZmZlcmVuY2Ugd2hlbiBgb3B0aW9uc2AgYXJlIHN1cHBsaWVkLlxuICAjXG4gICMgKiBgYnVmZmVyUG9zaXRpb25gIEEge1BvaW50fSBvciB7QXJyYXl9IG9mIFtyb3csIGNvbHVtbl0uXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSBBbiBvcHRpb25zIGhhc2ggZm9yIHs6OmNsaXBTY3JlZW5Qb3NpdGlvbn0uXG4gICNcbiAgIyBSZXR1cm5zIGEge1BvaW50fS5cbiAgc2NyZWVuUG9zaXRpb25Gb3JCdWZmZXJQb3NpdGlvbjogKGJ1ZmZlclBvc2l0aW9uLCBvcHRpb25zKSAtPlxuICAgIGlmIG9wdGlvbnM/LmNsaXA/XG4gICAgICBHcmltLmRlcHJlY2F0ZShcIlRoZSBgY2xpcGAgcGFyYW1ldGVyIGhhcyBiZWVuIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBzb29uLiBQbGVhc2UsIHVzZSBgY2xpcERpcmVjdGlvbmAgaW5zdGVhZC5cIilcbiAgICAgIG9wdGlvbnMuY2xpcERpcmVjdGlvbiA/PSBvcHRpb25zLmNsaXBcbiAgICBpZiBvcHRpb25zPy53cmFwQXRTb2Z0TmV3bGluZXM/XG4gICAgICBHcmltLmRlcHJlY2F0ZShcIlRoZSBgd3JhcEF0U29mdE5ld2xpbmVzYCBwYXJhbWV0ZXIgaGFzIGJlZW4gZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIHNvb24uIFBsZWFzZSwgdXNlIGBjbGlwRGlyZWN0aW9uOiAnZm9yd2FyZCdgIGluc3RlYWQuXCIpXG4gICAgICBvcHRpb25zLmNsaXBEaXJlY3Rpb24gPz0gaWYgb3B0aW9ucy53cmFwQXRTb2Z0TmV3bGluZXMgdGhlbiAnZm9yd2FyZCcgZWxzZSAnYmFja3dhcmQnXG4gICAgaWYgb3B0aW9ucz8ud3JhcEJleW9uZE5ld2xpbmVzP1xuICAgICAgR3JpbS5kZXByZWNhdGUoXCJUaGUgYHdyYXBCZXlvbmROZXdsaW5lc2AgcGFyYW1ldGVyIGhhcyBiZWVuIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBzb29uLiBQbGVhc2UsIHVzZSBgY2xpcERpcmVjdGlvbjogJ2ZvcndhcmQnYCBpbnN0ZWFkLlwiKVxuICAgICAgb3B0aW9ucy5jbGlwRGlyZWN0aW9uID89IGlmIG9wdGlvbnMud3JhcEJleW9uZE5ld2xpbmVzIHRoZW4gJ2ZvcndhcmQnIGVsc2UgJ2JhY2t3YXJkJ1xuXG4gICAgQGRpc3BsYXlMYXllci50cmFuc2xhdGVCdWZmZXJQb3NpdGlvbihidWZmZXJQb3NpdGlvbiwgb3B0aW9ucylcblxuICAjIEVzc2VudGlhbDogQ29udmVydCBhIHBvc2l0aW9uIGluIHNjcmVlbi1jb29yZGluYXRlcyB0byBidWZmZXItY29vcmRpbmF0ZXMuXG4gICNcbiAgIyBUaGUgcG9zaXRpb24gaXMgY2xpcHBlZCB2aWEgezo6Y2xpcFNjcmVlblBvc2l0aW9ufSBwcmlvciB0byB0aGUgY29udmVyc2lvbi5cbiAgI1xuICAjICogYGJ1ZmZlclBvc2l0aW9uYCBBIHtQb2ludH0gb3Ige0FycmF5fSBvZiBbcm93LCBjb2x1bW5dLlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgQW4gb3B0aW9ucyBoYXNoIGZvciB7OjpjbGlwU2NyZWVuUG9zaXRpb259LlxuICAjXG4gICMgUmV0dXJucyBhIHtQb2ludH0uXG4gIGJ1ZmZlclBvc2l0aW9uRm9yU2NyZWVuUG9zaXRpb246IChzY3JlZW5Qb3NpdGlvbiwgb3B0aW9ucykgLT5cbiAgICBpZiBvcHRpb25zPy5jbGlwP1xuICAgICAgR3JpbS5kZXByZWNhdGUoXCJUaGUgYGNsaXBgIHBhcmFtZXRlciBoYXMgYmVlbiBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgc29vbi4gUGxlYXNlLCB1c2UgYGNsaXBEaXJlY3Rpb25gIGluc3RlYWQuXCIpXG4gICAgICBvcHRpb25zLmNsaXBEaXJlY3Rpb24gPz0gb3B0aW9ucy5jbGlwXG4gICAgaWYgb3B0aW9ucz8ud3JhcEF0U29mdE5ld2xpbmVzP1xuICAgICAgR3JpbS5kZXByZWNhdGUoXCJUaGUgYHdyYXBBdFNvZnROZXdsaW5lc2AgcGFyYW1ldGVyIGhhcyBiZWVuIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBzb29uLiBQbGVhc2UsIHVzZSBgY2xpcERpcmVjdGlvbjogJ2ZvcndhcmQnYCBpbnN0ZWFkLlwiKVxuICAgICAgb3B0aW9ucy5jbGlwRGlyZWN0aW9uID89IGlmIG9wdGlvbnMud3JhcEF0U29mdE5ld2xpbmVzIHRoZW4gJ2ZvcndhcmQnIGVsc2UgJ2JhY2t3YXJkJ1xuICAgIGlmIG9wdGlvbnM/LndyYXBCZXlvbmROZXdsaW5lcz9cbiAgICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhlIGB3cmFwQmV5b25kTmV3bGluZXNgIHBhcmFtZXRlciBoYXMgYmVlbiBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgc29vbi4gUGxlYXNlLCB1c2UgYGNsaXBEaXJlY3Rpb246ICdmb3J3YXJkJ2AgaW5zdGVhZC5cIilcbiAgICAgIG9wdGlvbnMuY2xpcERpcmVjdGlvbiA/PSBpZiBvcHRpb25zLndyYXBCZXlvbmROZXdsaW5lcyB0aGVuICdmb3J3YXJkJyBlbHNlICdiYWNrd2FyZCdcblxuICAgIEBkaXNwbGF5TGF5ZXIudHJhbnNsYXRlU2NyZWVuUG9zaXRpb24oc2NyZWVuUG9zaXRpb24sIG9wdGlvbnMpXG5cbiAgIyBFc3NlbnRpYWw6IENvbnZlcnQgYSByYW5nZSBpbiBidWZmZXItY29vcmRpbmF0ZXMgdG8gc2NyZWVuLWNvb3JkaW5hdGVzLlxuICAjXG4gICMgKiBgYnVmZmVyUmFuZ2VgIHtSYW5nZX0gaW4gYnVmZmVyIGNvb3JkaW5hdGVzIHRvIHRyYW5zbGF0ZSBpbnRvIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgI1xuICAjIFJldHVybnMgYSB7UmFuZ2V9LlxuICBzY3JlZW5SYW5nZUZvckJ1ZmZlclJhbmdlOiAoYnVmZmVyUmFuZ2UsIG9wdGlvbnMpIC0+XG4gICAgYnVmZmVyUmFuZ2UgPSBSYW5nZS5mcm9tT2JqZWN0KGJ1ZmZlclJhbmdlKVxuICAgIHN0YXJ0ID0gQHNjcmVlblBvc2l0aW9uRm9yQnVmZmVyUG9zaXRpb24oYnVmZmVyUmFuZ2Uuc3RhcnQsIG9wdGlvbnMpXG4gICAgZW5kID0gQHNjcmVlblBvc2l0aW9uRm9yQnVmZmVyUG9zaXRpb24oYnVmZmVyUmFuZ2UuZW5kLCBvcHRpb25zKVxuICAgIG5ldyBSYW5nZShzdGFydCwgZW5kKVxuXG4gICMgRXNzZW50aWFsOiBDb252ZXJ0IGEgcmFuZ2UgaW4gc2NyZWVuLWNvb3JkaW5hdGVzIHRvIGJ1ZmZlci1jb29yZGluYXRlcy5cbiAgI1xuICAjICogYHNjcmVlblJhbmdlYCB7UmFuZ2V9IGluIHNjcmVlbiBjb29yZGluYXRlcyB0byB0cmFuc2xhdGUgaW50byBidWZmZXIgY29vcmRpbmF0ZXMuXG4gICNcbiAgIyBSZXR1cm5zIGEge1JhbmdlfS5cbiAgYnVmZmVyUmFuZ2VGb3JTY3JlZW5SYW5nZTogKHNjcmVlblJhbmdlKSAtPlxuICAgIHNjcmVlblJhbmdlID0gUmFuZ2UuZnJvbU9iamVjdChzY3JlZW5SYW5nZSlcbiAgICBzdGFydCA9IEBidWZmZXJQb3NpdGlvbkZvclNjcmVlblBvc2l0aW9uKHNjcmVlblJhbmdlLnN0YXJ0KVxuICAgIGVuZCA9IEBidWZmZXJQb3NpdGlvbkZvclNjcmVlblBvc2l0aW9uKHNjcmVlblJhbmdlLmVuZClcbiAgICBuZXcgUmFuZ2Uoc3RhcnQsIGVuZClcblxuICAjIEV4dGVuZGVkOiBDbGlwIHRoZSBnaXZlbiB7UG9pbnR9IHRvIGEgdmFsaWQgcG9zaXRpb24gaW4gdGhlIGJ1ZmZlci5cbiAgI1xuICAjIElmIHRoZSBnaXZlbiB7UG9pbnR9IGRlc2NyaWJlcyBhIHBvc2l0aW9uIHRoYXQgaXMgYWN0dWFsbHkgcmVhY2hhYmxlIGJ5IHRoZVxuICAjIGN1cnNvciBiYXNlZCBvbiB0aGUgY3VycmVudCBjb250ZW50cyBvZiB0aGUgYnVmZmVyLCBpdCBpcyByZXR1cm5lZFxuICAjIHVuY2hhbmdlZC4gSWYgdGhlIHtQb2ludH0gZG9lcyBub3QgZGVzY3JpYmUgYSB2YWxpZCBwb3NpdGlvbiwgdGhlIGNsb3Nlc3RcbiAgIyB2YWxpZCBwb3NpdGlvbiBpcyByZXR1cm5lZCBpbnN0ZWFkLlxuICAjXG4gICMgIyMgRXhhbXBsZXNcbiAgI1xuICAjIGBgYGNvZmZlZVxuICAjIGVkaXRvci5jbGlwQnVmZmVyUG9zaXRpb24oWy0xLCAtMV0pICMgLT4gYFswLCAwXWBcbiAgI1xuICAjICMgV2hlbiB0aGUgbGluZSBhdCBidWZmZXIgcm93IDIgaXMgMTAgY2hhcmFjdGVycyBsb25nXG4gICMgZWRpdG9yLmNsaXBCdWZmZXJQb3NpdGlvbihbMiwgSW5maW5pdHldKSAjIC0+IGBbMiwgMTBdYFxuICAjIGBgYFxuICAjXG4gICMgKiBgYnVmZmVyUG9zaXRpb25gIFRoZSB7UG9pbnR9IHJlcHJlc2VudGluZyB0aGUgcG9zaXRpb24gdG8gY2xpcC5cbiAgI1xuICAjIFJldHVybnMgYSB7UG9pbnR9LlxuICBjbGlwQnVmZmVyUG9zaXRpb246IChidWZmZXJQb3NpdGlvbikgLT4gQGJ1ZmZlci5jbGlwUG9zaXRpb24oYnVmZmVyUG9zaXRpb24pXG5cbiAgIyBFeHRlbmRlZDogQ2xpcCB0aGUgc3RhcnQgYW5kIGVuZCBvZiB0aGUgZ2l2ZW4gcmFuZ2UgdG8gdmFsaWQgcG9zaXRpb25zIGluIHRoZVxuICAjIGJ1ZmZlci4gU2VlIHs6OmNsaXBCdWZmZXJQb3NpdGlvbn0gZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICNcbiAgIyAqIGByYW5nZWAgVGhlIHtSYW5nZX0gdG8gY2xpcC5cbiAgI1xuICAjIFJldHVybnMgYSB7UmFuZ2V9LlxuICBjbGlwQnVmZmVyUmFuZ2U6IChyYW5nZSkgLT4gQGJ1ZmZlci5jbGlwUmFuZ2UocmFuZ2UpXG5cbiAgIyBFeHRlbmRlZDogQ2xpcCB0aGUgZ2l2ZW4ge1BvaW50fSB0byBhIHZhbGlkIHBvc2l0aW9uIG9uIHNjcmVlbi5cbiAgI1xuICAjIElmIHRoZSBnaXZlbiB7UG9pbnR9IGRlc2NyaWJlcyBhIHBvc2l0aW9uIHRoYXQgaXMgYWN0dWFsbHkgcmVhY2hhYmxlIGJ5IHRoZVxuICAjIGN1cnNvciBiYXNlZCBvbiB0aGUgY3VycmVudCBjb250ZW50cyBvZiB0aGUgc2NyZWVuLCBpdCBpcyByZXR1cm5lZFxuICAjIHVuY2hhbmdlZC4gSWYgdGhlIHtQb2ludH0gZG9lcyBub3QgZGVzY3JpYmUgYSB2YWxpZCBwb3NpdGlvbiwgdGhlIGNsb3Nlc3RcbiAgIyB2YWxpZCBwb3NpdGlvbiBpcyByZXR1cm5lZCBpbnN0ZWFkLlxuICAjXG4gICMgIyMgRXhhbXBsZXNcbiAgI1xuICAjIGBgYGNvZmZlZVxuICAjIGVkaXRvci5jbGlwU2NyZWVuUG9zaXRpb24oWy0xLCAtMV0pICMgLT4gYFswLCAwXWBcbiAgI1xuICAjICMgV2hlbiB0aGUgbGluZSBhdCBzY3JlZW4gcm93IDIgaXMgMTAgY2hhcmFjdGVycyBsb25nXG4gICMgZWRpdG9yLmNsaXBTY3JlZW5Qb3NpdGlvbihbMiwgSW5maW5pdHldKSAjIC0+IGBbMiwgMTBdYFxuICAjIGBgYFxuICAjXG4gICMgKiBgc2NyZWVuUG9zaXRpb25gIFRoZSB7UG9pbnR9IHJlcHJlc2VudGluZyB0aGUgcG9zaXRpb24gdG8gY2xpcC5cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9XG4gICMgICAqIGBjbGlwRGlyZWN0aW9uYCB7U3RyaW5nfSBJZiBgJ2JhY2t3YXJkJ2AsIHJldHVybnMgdGhlIGZpcnN0IHZhbGlkXG4gICMgICAgIHBvc2l0aW9uIHByZWNlZGluZyBhbiBpbnZhbGlkIHBvc2l0aW9uLiBJZiBgJ2ZvcndhcmQnYCwgcmV0dXJucyB0aGVcbiAgIyAgICAgZmlyc3QgdmFsaWQgcG9zaXRpb24gZm9sbG93aW5nIGFuIGludmFsaWQgcG9zaXRpb24uIElmIGAnY2xvc2VzdCdgLFxuICAjICAgICByZXR1cm5zIHRoZSBmaXJzdCB2YWxpZCBwb3NpdGlvbiBjbG9zZXN0IHRvIGFuIGludmFsaWQgcG9zaXRpb24uXG4gICMgICAgIERlZmF1bHRzIHRvIGAnY2xvc2VzdCdgLlxuICAjXG4gICMgUmV0dXJucyBhIHtQb2ludH0uXG4gIGNsaXBTY3JlZW5Qb3NpdGlvbjogKHNjcmVlblBvc2l0aW9uLCBvcHRpb25zKSAtPlxuICAgIGlmIG9wdGlvbnM/LmNsaXA/XG4gICAgICBHcmltLmRlcHJlY2F0ZShcIlRoZSBgY2xpcGAgcGFyYW1ldGVyIGhhcyBiZWVuIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBzb29uLiBQbGVhc2UsIHVzZSBgY2xpcERpcmVjdGlvbmAgaW5zdGVhZC5cIilcbiAgICAgIG9wdGlvbnMuY2xpcERpcmVjdGlvbiA/PSBvcHRpb25zLmNsaXBcbiAgICBpZiBvcHRpb25zPy53cmFwQXRTb2Z0TmV3bGluZXM/XG4gICAgICBHcmltLmRlcHJlY2F0ZShcIlRoZSBgd3JhcEF0U29mdE5ld2xpbmVzYCBwYXJhbWV0ZXIgaGFzIGJlZW4gZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIHNvb24uIFBsZWFzZSwgdXNlIGBjbGlwRGlyZWN0aW9uOiAnZm9yd2FyZCdgIGluc3RlYWQuXCIpXG4gICAgICBvcHRpb25zLmNsaXBEaXJlY3Rpb24gPz0gaWYgb3B0aW9ucy53cmFwQXRTb2Z0TmV3bGluZXMgdGhlbiAnZm9yd2FyZCcgZWxzZSAnYmFja3dhcmQnXG4gICAgaWYgb3B0aW9ucz8ud3JhcEJleW9uZE5ld2xpbmVzP1xuICAgICAgR3JpbS5kZXByZWNhdGUoXCJUaGUgYHdyYXBCZXlvbmROZXdsaW5lc2AgcGFyYW1ldGVyIGhhcyBiZWVuIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBzb29uLiBQbGVhc2UsIHVzZSBgY2xpcERpcmVjdGlvbjogJ2ZvcndhcmQnYCBpbnN0ZWFkLlwiKVxuICAgICAgb3B0aW9ucy5jbGlwRGlyZWN0aW9uID89IGlmIG9wdGlvbnMud3JhcEJleW9uZE5ld2xpbmVzIHRoZW4gJ2ZvcndhcmQnIGVsc2UgJ2JhY2t3YXJkJ1xuXG4gICAgQGRpc3BsYXlMYXllci5jbGlwU2NyZWVuUG9zaXRpb24oc2NyZWVuUG9zaXRpb24sIG9wdGlvbnMpXG5cbiAgIyBFeHRlbmRlZDogQ2xpcCB0aGUgc3RhcnQgYW5kIGVuZCBvZiB0aGUgZ2l2ZW4gcmFuZ2UgdG8gdmFsaWQgcG9zaXRpb25zIG9uIHNjcmVlbi5cbiAgIyBTZWUgezo6Y2xpcFNjcmVlblBvc2l0aW9ufSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgI1xuICAjICogYHJhbmdlYCBUaGUge1JhbmdlfSB0byBjbGlwLlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgU2VlIHs6OmNsaXBTY3JlZW5Qb3NpdGlvbn0gYG9wdGlvbnNgLlxuICAjXG4gICMgUmV0dXJucyBhIHtSYW5nZX0uXG4gIGNsaXBTY3JlZW5SYW5nZTogKHNjcmVlblJhbmdlLCBvcHRpb25zKSAtPlxuICAgIHNjcmVlblJhbmdlID0gUmFuZ2UuZnJvbU9iamVjdChzY3JlZW5SYW5nZSlcbiAgICBzdGFydCA9IEBkaXNwbGF5TGF5ZXIuY2xpcFNjcmVlblBvc2l0aW9uKHNjcmVlblJhbmdlLnN0YXJ0LCBvcHRpb25zKVxuICAgIGVuZCA9IEBkaXNwbGF5TGF5ZXIuY2xpcFNjcmVlblBvc2l0aW9uKHNjcmVlblJhbmdlLmVuZCwgb3B0aW9ucylcbiAgICBSYW5nZShzdGFydCwgZW5kKVxuXG4gICMjI1xuICBTZWN0aW9uOiBEZWNvcmF0aW9uc1xuICAjIyNcblxuICAjIEVzc2VudGlhbDogQWRkIGEgZGVjb3JhdGlvbiB0aGF0IHRyYWNrcyBhIHtEaXNwbGF5TWFya2VyfS4gV2hlbiB0aGVcbiAgIyBtYXJrZXIgbW92ZXMsIGlzIGludmFsaWRhdGVkLCBvciBpcyBkZXN0cm95ZWQsIHRoZSBkZWNvcmF0aW9uIHdpbGwgYmVcbiAgIyB1cGRhdGVkIHRvIHJlZmxlY3QgdGhlIG1hcmtlcidzIHN0YXRlLlxuICAjXG4gICMgVGhlIGZvbGxvd2luZyBhcmUgdGhlIHN1cHBvcnRlZCBkZWNvcmF0aW9ucyB0eXBlczpcbiAgI1xuICAjICogX19saW5lX186IEFkZHMgeW91ciBDU1MgYGNsYXNzYCB0byB0aGUgbGluZSBub2RlcyB3aXRoaW4gdGhlIHJhbmdlXG4gICMgICAgIG1hcmtlZCBieSB0aGUgbWFya2VyXG4gICMgKiBfX2xpbmUtbnVtYmVyX186IEFkZHMgeW91ciBDU1MgYGNsYXNzYCB0byB0aGUgbGluZSBudW1iZXIgbm9kZXMgd2l0aGluIHRoZVxuICAjICAgICByYW5nZSBtYXJrZWQgYnkgdGhlIG1hcmtlclxuICAjICogX19oaWdobGlnaHRfXzogQWRkcyBhIG5ldyBoaWdobGlnaHQgZGl2IHRvIHRoZSBlZGl0b3Igc3Vycm91bmRpbmcgdGhlXG4gICMgICAgIHJhbmdlIG1hcmtlZCBieSB0aGUgbWFya2VyLiBXaGVuIHRoZSB1c2VyIHNlbGVjdHMgdGV4dCwgdGhlIHNlbGVjdGlvbiBpc1xuICAjICAgICB2aXN1YWxpemVkIHdpdGggYSBoaWdobGlnaHQgZGVjb3JhdGlvbiBpbnRlcm5hbGx5LiBUaGUgc3RydWN0dXJlIG9mIHRoaXNcbiAgIyAgICAgaGlnaGxpZ2h0IHdpbGwgYmVcbiAgIyAgICAgYGBgaHRtbFxuICAjICAgICA8ZGl2IGNsYXNzPVwiaGlnaGxpZ2h0IDx5b3VyLWNsYXNzPlwiPlxuICAjICAgICAgIDwhLS0gV2lsbCBiZSBvbmUgcmVnaW9uIGZvciBlYWNoIHJvdyBpbiB0aGUgcmFuZ2UuIFNwYW5zIDIgbGluZXM/IFRoZXJlIHdpbGwgYmUgMiByZWdpb25zLiAtLT5cbiAgIyAgICAgICA8ZGl2IGNsYXNzPVwicmVnaW9uXCI+PC9kaXY+XG4gICMgICAgIDwvZGl2PlxuICAjICAgICBgYGBcbiAgIyAqIF9fb3ZlcmxheV9fOiBQb3NpdGlvbnMgdGhlIHZpZXcgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBpdGVtIGF0IHRoZSBoZWFkXG4gICMgICAgIG9yIHRhaWwgb2YgdGhlIGdpdmVuIGBEaXNwbGF5TWFya2VyYC5cbiAgIyAqIF9fZ3V0dGVyX186IEEgZGVjb3JhdGlvbiB0aGF0IHRyYWNrcyBhIHtEaXNwbGF5TWFya2VyfSBpbiBhIHtHdXR0ZXJ9LiBHdXR0ZXJcbiAgIyAgICAgZGVjb3JhdGlvbnMgYXJlIGNyZWF0ZWQgYnkgY2FsbGluZyB7R3V0dGVyOjpkZWNvcmF0ZU1hcmtlcn0gb24gdGhlXG4gICMgICAgIGRlc2lyZWQgYEd1dHRlcmAgaW5zdGFuY2UuXG4gICMgKiBfX2Jsb2NrX186IFBvc2l0aW9ucyB0aGUgdmlldyBhc3NvY2lhdGVkIHdpdGggdGhlIGdpdmVuIGl0ZW0gYmVmb3JlIG9yXG4gICMgICAgIGFmdGVyIHRoZSByb3cgb2YgdGhlIGdpdmVuIGBUZXh0RWRpdG9yTWFya2VyYC5cbiAgI1xuICAjICMjIEFyZ3VtZW50c1xuICAjXG4gICMgKiBgbWFya2VyYCBBIHtEaXNwbGF5TWFya2VyfSB5b3Ugd2FudCB0aGlzIGRlY29yYXRpb24gdG8gZm9sbG93LlxuICAjICogYGRlY29yYXRpb25QYXJhbXNgIEFuIHtPYmplY3R9IHJlcHJlc2VudGluZyB0aGUgZGVjb3JhdGlvbiBlLmcuXG4gICMgICBge3R5cGU6ICdsaW5lLW51bWJlcicsIGNsYXNzOiAnbGludGVyLWVycm9yJ31gXG4gICMgICAqIGB0eXBlYCBUaGVyZSBhcmUgc2V2ZXJhbCBzdXBwb3J0ZWQgZGVjb3JhdGlvbiB0eXBlcy4gVGhlIGJlaGF2aW9yIG9mIHRoZVxuICAjICAgICB0eXBlcyBhcmUgYXMgZm9sbG93czpcbiAgIyAgICAgKiBgbGluZWAgQWRkcyB0aGUgZ2l2ZW4gYGNsYXNzYCB0byB0aGUgbGluZXMgb3ZlcmxhcHBpbmcgdGhlIHJvd3NcbiAgIyAgICAgICAgc3Bhbm5lZCBieSB0aGUgYERpc3BsYXlNYXJrZXJgLlxuICAjICAgICAqIGBsaW5lLW51bWJlcmAgQWRkcyB0aGUgZ2l2ZW4gYGNsYXNzYCB0byB0aGUgbGluZSBudW1iZXJzIG92ZXJsYXBwaW5nXG4gICMgICAgICAgdGhlIHJvd3Mgc3Bhbm5lZCBieSB0aGUgYERpc3BsYXlNYXJrZXJgLlxuICAjICAgICAqIGBoaWdobGlnaHRgIENyZWF0ZXMgYSBgLmhpZ2hsaWdodGAgZGl2IHdpdGggdGhlIG5lc3RlZCBjbGFzcyB3aXRoIHVwXG4gICMgICAgICAgdG8gMyBuZXN0ZWQgcmVnaW9ucyB0aGF0IGZpbGwgdGhlIGFyZWEgc3Bhbm5lZCBieSB0aGUgYERpc3BsYXlNYXJrZXJgLlxuICAjICAgICAqIGBvdmVybGF5YCBQb3NpdGlvbnMgdGhlIHZpZXcgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBpdGVtIGF0IHRoZVxuICAjICAgICAgIGhlYWQgb3IgdGFpbCBvZiB0aGUgZ2l2ZW4gYERpc3BsYXlNYXJrZXJgLCBkZXBlbmRpbmcgb24gdGhlIGBwb3NpdGlvbmBcbiAgIyAgICAgICBwcm9wZXJ0eS5cbiAgIyAgICAgKiBgZ3V0dGVyYCBUcmFja3MgYSB7RGlzcGxheU1hcmtlcn0gaW4gYSB7R3V0dGVyfS4gQ3JlYXRlZCBieSBjYWxsaW5nXG4gICMgICAgICAge0d1dHRlcjo6ZGVjb3JhdGVNYXJrZXJ9IG9uIHRoZSBkZXNpcmVkIGBHdXR0ZXJgIGluc3RhbmNlLlxuICAjICAgICAqIGBibG9ja2AgUG9zaXRpb25zIHRoZSB2aWV3IGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4gaXRlbSBiZWZvcmUgb3JcbiAgIyAgICAgICBhZnRlciB0aGUgcm93IG9mIHRoZSBnaXZlbiBgVGV4dEVkaXRvck1hcmtlcmAsIGRlcGVuZGluZyBvbiB0aGUgYHBvc2l0aW9uYFxuICAjICAgICAgIHByb3BlcnR5LlxuICAjICAgKiBgY2xhc3NgIFRoaXMgQ1NTIGNsYXNzIHdpbGwgYmUgYXBwbGllZCB0byB0aGUgZGVjb3JhdGVkIGxpbmUgbnVtYmVyLFxuICAjICAgICBsaW5lLCBoaWdobGlnaHQsIG9yIG92ZXJsYXkuXG4gICMgICAqIGBpdGVtYCAob3B0aW9uYWwpIEFuIHtIVE1MRWxlbWVudH0gb3IgYSBtb2RlbCB7T2JqZWN0fSB3aXRoIGFcbiAgIyAgICAgY29ycmVzcG9uZGluZyB2aWV3IHJlZ2lzdGVyZWQuIE9ubHkgYXBwbGljYWJsZSB0byB0aGUgYGd1dHRlcmAsXG4gICMgICAgIGBvdmVybGF5YCBhbmQgYGJsb2NrYCB0eXBlcy5cbiAgIyAgICogYG9ubHlIZWFkYCAob3B0aW9uYWwpIElmIGB0cnVlYCwgdGhlIGRlY29yYXRpb24gd2lsbCBvbmx5IGJlIGFwcGxpZWQgdG9cbiAgIyAgICAgdGhlIGhlYWQgb2YgdGhlIGBEaXNwbGF5TWFya2VyYC4gT25seSBhcHBsaWNhYmxlIHRvIHRoZSBgbGluZWAgYW5kXG4gICMgICAgIGBsaW5lLW51bWJlcmAgdHlwZXMuXG4gICMgICAqIGBvbmx5RW1wdHlgIChvcHRpb25hbCkgSWYgYHRydWVgLCB0aGUgZGVjb3JhdGlvbiB3aWxsIG9ubHkgYmUgYXBwbGllZCBpZlxuICAjICAgICB0aGUgYXNzb2NpYXRlZCBgRGlzcGxheU1hcmtlcmAgaXMgZW1wdHkuIE9ubHkgYXBwbGljYWJsZSB0byB0aGUgYGd1dHRlcmAsXG4gICMgICAgIGBsaW5lYCwgYW5kIGBsaW5lLW51bWJlcmAgdHlwZXMuXG4gICMgICAqIGBvbmx5Tm9uRW1wdHlgIChvcHRpb25hbCkgSWYgYHRydWVgLCB0aGUgZGVjb3JhdGlvbiB3aWxsIG9ubHkgYmUgYXBwbGllZFxuICAjICAgICBpZiB0aGUgYXNzb2NpYXRlZCBgRGlzcGxheU1hcmtlcmAgaXMgbm9uLWVtcHR5LiBPbmx5IGFwcGxpY2FibGUgdG8gdGhlXG4gICMgICAgIGBndXR0ZXJgLCBgbGluZWAsIGFuZCBgbGluZS1udW1iZXJgIHR5cGVzLlxuICAjICAgKiBgcG9zaXRpb25gIChvcHRpb25hbCkgT25seSBhcHBsaWNhYmxlIHRvIGRlY29yYXRpb25zIG9mIHR5cGUgYG92ZXJsYXlgIGFuZCBgYmxvY2tgLlxuICAjICAgICBDb250cm9scyB3aGVyZSB0aGUgdmlldyBpcyBwb3NpdGlvbmVkIHJlbGF0aXZlIHRvIHRoZSBgVGV4dEVkaXRvck1hcmtlcmAuXG4gICMgICAgIFZhbHVlcyBjYW4gYmUgYCdoZWFkJ2AgKHRoZSBkZWZhdWx0KSBvciBgJ3RhaWwnYCBmb3Igb3ZlcmxheSBkZWNvcmF0aW9ucywgYW5kXG4gICMgICAgIGAnYmVmb3JlJ2AgKHRoZSBkZWZhdWx0KSBvciBgJ2FmdGVyJ2AgZm9yIGJsb2NrIGRlY29yYXRpb25zLlxuICAjICAgKiBgYXZvaWRPdmVyZmxvd2AgKG9wdGlvbmFsKSBPbmx5IGFwcGxpY2FibGUgdG8gZGVjb3JhdGlvbnMgb2YgdHlwZVxuICAjICAgICAgYG92ZXJsYXlgLiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIGRlY29yYXRpb24gYWRqdXN0cyBpdHMgaG9yaXpvbnRhbCBvclxuICAjICAgICAgdmVydGljYWwgcG9zaXRpb24gdG8gcmVtYWluIGZ1bGx5IHZpc2libGUgd2hlbiBpdCB3b3VsZCBvdGhlcndpc2VcbiAgIyAgICAgIG92ZXJmbG93IHRoZSBlZGl0b3IuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgI1xuICAjIFJldHVybnMgYSB7RGVjb3JhdGlvbn0gb2JqZWN0XG4gIGRlY29yYXRlTWFya2VyOiAobWFya2VyLCBkZWNvcmF0aW9uUGFyYW1zKSAtPlxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5kZWNvcmF0ZU1hcmtlcihtYXJrZXIsIGRlY29yYXRpb25QYXJhbXMpXG5cbiAgIyBFc3NlbnRpYWw6IEFkZCBhIGRlY29yYXRpb24gdG8gZXZlcnkgbWFya2VyIGluIHRoZSBnaXZlbiBtYXJrZXIgbGF5ZXIuIENhblxuICAjIGJlIHVzZWQgdG8gZGVjb3JhdGUgYSBsYXJnZSBudW1iZXIgb2YgbWFya2VycyB3aXRob3V0IGhhdmluZyB0byBjcmVhdGUgYW5kXG4gICMgbWFuYWdlIG1hbnkgaW5kaXZpZHVhbCBkZWNvcmF0aW9ucy5cbiAgI1xuICAjICogYG1hcmtlckxheWVyYCBBIHtEaXNwbGF5TWFya2VyTGF5ZXJ9IG9yIHtNYXJrZXJMYXllcn0gdG8gZGVjb3JhdGUuXG4gICMgKiBgZGVjb3JhdGlvblBhcmFtc2AgVGhlIHNhbWUgcGFyYW1ldGVycyB0aGF0IGFyZSBwYXNzZWQgdG9cbiAgIyAgIHtUZXh0RWRpdG9yOjpkZWNvcmF0ZU1hcmtlcn0sIGV4Y2VwdCB0aGUgYHR5cGVgIGNhbm5vdCBiZSBgb3ZlcmxheWAgb3IgYGd1dHRlcmAuXG4gICNcbiAgIyBSZXR1cm5zIGEge0xheWVyRGVjb3JhdGlvbn0uXG4gIGRlY29yYXRlTWFya2VyTGF5ZXI6IChtYXJrZXJMYXllciwgZGVjb3JhdGlvblBhcmFtcykgLT5cbiAgICBAZGVjb3JhdGlvbk1hbmFnZXIuZGVjb3JhdGVNYXJrZXJMYXllcihtYXJrZXJMYXllciwgZGVjb3JhdGlvblBhcmFtcylcblxuICAjIERlcHJlY2F0ZWQ6IEdldCBhbGwgdGhlIGRlY29yYXRpb25zIHdpdGhpbiBhIHNjcmVlbiByb3cgcmFuZ2Ugb24gdGhlIGRlZmF1bHRcbiAgIyBsYXllci5cbiAgI1xuICAjICogYHN0YXJ0U2NyZWVuUm93YCB0aGUge051bWJlcn0gYmVnaW5uaW5nIHNjcmVlbiByb3dcbiAgIyAqIGBlbmRTY3JlZW5Sb3dgIHRoZSB7TnVtYmVyfSBlbmQgc2NyZWVuIHJvdyAoaW5jbHVzaXZlKVxuICAjXG4gICMgUmV0dXJucyBhbiB7T2JqZWN0fSBvZiBkZWNvcmF0aW9ucyBpbiB0aGUgZm9ybVxuICAjICBgezE6IFt7aWQ6IDEwLCB0eXBlOiAnbGluZS1udW1iZXInLCBjbGFzczogJ3NvbWVjbGFzcyd9XSwgMjogLi4ufWBcbiAgIyAgIHdoZXJlIHRoZSBrZXlzIGFyZSB7RGlzcGxheU1hcmtlcn0gSURzLCBhbmQgdGhlIHZhbHVlcyBhcmUgYW4gYXJyYXkgb2YgZGVjb3JhdGlvblxuICAjICAgcGFyYW1zIG9iamVjdHMgYXR0YWNoZWQgdG8gdGhlIG1hcmtlci5cbiAgIyBSZXR1cm5zIGFuIGVtcHR5IG9iamVjdCB3aGVuIG5vIGRlY29yYXRpb25zIGFyZSBmb3VuZFxuICBkZWNvcmF0aW9uc0ZvclNjcmVlblJvd1JhbmdlOiAoc3RhcnRTY3JlZW5Sb3csIGVuZFNjcmVlblJvdykgLT5cbiAgICBAZGVjb3JhdGlvbk1hbmFnZXIuZGVjb3JhdGlvbnNGb3JTY3JlZW5Sb3dSYW5nZShzdGFydFNjcmVlblJvdywgZW5kU2NyZWVuUm93KVxuXG4gIGRlY29yYXRpb25zU3RhdGVGb3JTY3JlZW5Sb3dSYW5nZTogKHN0YXJ0U2NyZWVuUm93LCBlbmRTY3JlZW5Sb3cpIC0+XG4gICAgQGRlY29yYXRpb25NYW5hZ2VyLmRlY29yYXRpb25zU3RhdGVGb3JTY3JlZW5Sb3dSYW5nZShzdGFydFNjcmVlblJvdywgZW5kU2NyZWVuUm93KVxuXG4gICMgRXh0ZW5kZWQ6IEdldCBhbGwgZGVjb3JhdGlvbnMuXG4gICNcbiAgIyAqIGBwcm9wZXJ0eUZpbHRlcmAgKG9wdGlvbmFsKSBBbiB7T2JqZWN0fSBjb250YWluaW5nIGtleSB2YWx1ZSBwYWlycyB0aGF0XG4gICMgICB0aGUgcmV0dXJuZWQgZGVjb3JhdGlvbnMnIHByb3BlcnRpZXMgbXVzdCBtYXRjaC5cbiAgI1xuICAjIFJldHVybnMgYW4ge0FycmF5fSBvZiB7RGVjb3JhdGlvbn1zLlxuICBnZXREZWNvcmF0aW9uczogKHByb3BlcnR5RmlsdGVyKSAtPlxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5nZXREZWNvcmF0aW9ucyhwcm9wZXJ0eUZpbHRlcilcblxuICAjIEV4dGVuZGVkOiBHZXQgYWxsIGRlY29yYXRpb25zIG9mIHR5cGUgJ2xpbmUnLlxuICAjXG4gICMgKiBgcHJvcGVydHlGaWx0ZXJgIChvcHRpb25hbCkgQW4ge09iamVjdH0gY29udGFpbmluZyBrZXkgdmFsdWUgcGFpcnMgdGhhdFxuICAjICAgdGhlIHJldHVybmVkIGRlY29yYXRpb25zJyBwcm9wZXJ0aWVzIG11c3QgbWF0Y2guXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge0RlY29yYXRpb259cy5cbiAgZ2V0TGluZURlY29yYXRpb25zOiAocHJvcGVydHlGaWx0ZXIpIC0+XG4gICAgQGRlY29yYXRpb25NYW5hZ2VyLmdldExpbmVEZWNvcmF0aW9ucyhwcm9wZXJ0eUZpbHRlcilcblxuICAjIEV4dGVuZGVkOiBHZXQgYWxsIGRlY29yYXRpb25zIG9mIHR5cGUgJ2xpbmUtbnVtYmVyJy5cbiAgI1xuICAjICogYHByb3BlcnR5RmlsdGVyYCAob3B0aW9uYWwpIEFuIHtPYmplY3R9IGNvbnRhaW5pbmcga2V5IHZhbHVlIHBhaXJzIHRoYXRcbiAgIyAgIHRoZSByZXR1cm5lZCBkZWNvcmF0aW9ucycgcHJvcGVydGllcyBtdXN0IG1hdGNoLlxuICAjXG4gICMgUmV0dXJucyBhbiB7QXJyYXl9IG9mIHtEZWNvcmF0aW9ufXMuXG4gIGdldExpbmVOdW1iZXJEZWNvcmF0aW9uczogKHByb3BlcnR5RmlsdGVyKSAtPlxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5nZXRMaW5lTnVtYmVyRGVjb3JhdGlvbnMocHJvcGVydHlGaWx0ZXIpXG5cbiAgIyBFeHRlbmRlZDogR2V0IGFsbCBkZWNvcmF0aW9ucyBvZiB0eXBlICdoaWdobGlnaHQnLlxuICAjXG4gICMgKiBgcHJvcGVydHlGaWx0ZXJgIChvcHRpb25hbCkgQW4ge09iamVjdH0gY29udGFpbmluZyBrZXkgdmFsdWUgcGFpcnMgdGhhdFxuICAjICAgdGhlIHJldHVybmVkIGRlY29yYXRpb25zJyBwcm9wZXJ0aWVzIG11c3QgbWF0Y2guXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge0RlY29yYXRpb259cy5cbiAgZ2V0SGlnaGxpZ2h0RGVjb3JhdGlvbnM6IChwcm9wZXJ0eUZpbHRlcikgLT5cbiAgICBAZGVjb3JhdGlvbk1hbmFnZXIuZ2V0SGlnaGxpZ2h0RGVjb3JhdGlvbnMocHJvcGVydHlGaWx0ZXIpXG5cbiAgIyBFeHRlbmRlZDogR2V0IGFsbCBkZWNvcmF0aW9ucyBvZiB0eXBlICdvdmVybGF5Jy5cbiAgI1xuICAjICogYHByb3BlcnR5RmlsdGVyYCAob3B0aW9uYWwpIEFuIHtPYmplY3R9IGNvbnRhaW5pbmcga2V5IHZhbHVlIHBhaXJzIHRoYXRcbiAgIyAgIHRoZSByZXR1cm5lZCBkZWNvcmF0aW9ucycgcHJvcGVydGllcyBtdXN0IG1hdGNoLlxuICAjXG4gICMgUmV0dXJucyBhbiB7QXJyYXl9IG9mIHtEZWNvcmF0aW9ufXMuXG4gIGdldE92ZXJsYXlEZWNvcmF0aW9uczogKHByb3BlcnR5RmlsdGVyKSAtPlxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5nZXRPdmVybGF5RGVjb3JhdGlvbnMocHJvcGVydHlGaWx0ZXIpXG5cbiAgZGVjb3JhdGlvbkZvcklkOiAoaWQpIC0+XG4gICAgQGRlY29yYXRpb25NYW5hZ2VyLmRlY29yYXRpb25Gb3JJZChpZClcblxuICBkZWNvcmF0aW9uc0Zvck1hcmtlcklkOiAoaWQpIC0+XG4gICAgQGRlY29yYXRpb25NYW5hZ2VyLmRlY29yYXRpb25zRm9yTWFya2VySWQoaWQpXG5cbiAgIyMjXG4gIFNlY3Rpb246IE1hcmtlcnNcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IENyZWF0ZSBhIG1hcmtlciBvbiB0aGUgZGVmYXVsdCBtYXJrZXIgbGF5ZXIgd2l0aCB0aGUgZ2l2ZW4gcmFuZ2VcbiAgIyBpbiBidWZmZXIgY29vcmRpbmF0ZXMuIFRoaXMgbWFya2VyIHdpbGwgbWFpbnRhaW4gaXRzIGxvZ2ljYWwgbG9jYXRpb24gYXMgdGhlXG4gICMgYnVmZmVyIGlzIGNoYW5nZWQsIHNvIGlmIHlvdSBtYXJrIGEgcGFydGljdWxhciB3b3JkLCB0aGUgbWFya2VyIHdpbGwgcmVtYWluXG4gICMgb3ZlciB0aGF0IHdvcmQgZXZlbiBpZiB0aGUgd29yZCdzIGxvY2F0aW9uIGluIHRoZSBidWZmZXIgY2hhbmdlcy5cbiAgI1xuICAjICogYHJhbmdlYCBBIHtSYW5nZX0gb3IgcmFuZ2UtY29tcGF0aWJsZSB7QXJyYXl9XG4gICMgKiBgcHJvcGVydGllc2AgQSBoYXNoIG9mIGtleS12YWx1ZSBwYWlycyB0byBhc3NvY2lhdGUgd2l0aCB0aGUgbWFya2VyLiBUaGVyZVxuICAjICAgYXJlIGFsc28gcmVzZXJ2ZWQgcHJvcGVydHkgbmFtZXMgdGhhdCBoYXZlIG1hcmtlci1zcGVjaWZpYyBtZWFuaW5nLlxuICAjICAgKiBgbWFpbnRhaW5IaXN0b3J5YCAob3B0aW9uYWwpIHtCb29sZWFufSBXaGV0aGVyIHRvIHN0b3JlIHRoaXMgbWFya2VyJ3NcbiAgIyAgICAgcmFuZ2UgYmVmb3JlIGFuZCBhZnRlciBlYWNoIGNoYW5nZSBpbiB0aGUgdW5kbyBoaXN0b3J5LiBUaGlzIGFsbG93cyB0aGVcbiAgIyAgICAgbWFya2VyJ3MgcG9zaXRpb24gdG8gYmUgcmVzdG9yZWQgbW9yZSBhY2N1cmF0ZWx5IGZvciBjZXJ0YWluIHVuZG8vcmVkb1xuICAjICAgICBvcGVyYXRpb25zLCBidXQgdXNlcyBtb3JlIHRpbWUgYW5kIG1lbW9yeS4gKGRlZmF1bHQ6IGZhbHNlKVxuICAjICAgKiBgcmV2ZXJzZWRgIChvcHRpb25hbCkge0Jvb2xlYW59IENyZWF0ZXMgdGhlIG1hcmtlciBpbiBhIHJldmVyc2VkXG4gICMgICAgIG9yaWVudGF0aW9uLiAoZGVmYXVsdDogZmFsc2UpXG4gICMgICAqIGBpbnZhbGlkYXRlYCAob3B0aW9uYWwpIHtTdHJpbmd9IERldGVybWluZXMgdGhlIHJ1bGVzIGJ5IHdoaWNoIGNoYW5nZXNcbiAgIyAgICAgdG8gdGhlIGJ1ZmZlciAqaW52YWxpZGF0ZSogdGhlIG1hcmtlci4gKGRlZmF1bHQ6ICdvdmVybGFwJykgSXQgY2FuIGJlXG4gICMgICAgIGFueSBvZiB0aGUgZm9sbG93aW5nIHN0cmF0ZWdpZXMsIGluIG9yZGVyIG9mIGZyYWdpbGl0eTpcbiAgIyAgICAgKiBfX25ldmVyX186IFRoZSBtYXJrZXIgaXMgbmV2ZXIgbWFya2VkIGFzIGludmFsaWQuIFRoaXMgaXMgYSBnb29kIGNob2ljZSBmb3JcbiAgIyAgICAgICBtYXJrZXJzIHJlcHJlc2VudGluZyBzZWxlY3Rpb25zIGluIGFuIGVkaXRvci5cbiAgIyAgICAgKiBfX3N1cnJvdW5kX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgY2hhbmdlcyB0aGF0IGNvbXBsZXRlbHkgc3Vycm91bmQgaXQuXG4gICMgICAgICogX19vdmVybGFwX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgY2hhbmdlcyB0aGF0IHN1cnJvdW5kIHRoZVxuICAjICAgICAgIHN0YXJ0IG9yIGVuZCBvZiB0aGUgbWFya2VyLiBUaGlzIGlzIHRoZSBkZWZhdWx0LlxuICAjICAgICAqIF9faW5zaWRlX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgY2hhbmdlcyB0aGF0IGV4dGVuZCBpbnRvIHRoZVxuICAjICAgICAgIGluc2lkZSBvZiB0aGUgbWFya2VyLiBDaGFuZ2VzIHRoYXQgZW5kIGF0IHRoZSBtYXJrZXIncyBzdGFydCBvclxuICAjICAgICAgIHN0YXJ0IGF0IHRoZSBtYXJrZXIncyBlbmQgZG8gbm90IGludmFsaWRhdGUgdGhlIG1hcmtlci5cbiAgIyAgICAgKiBfX3RvdWNoX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgYSBjaGFuZ2UgdGhhdCB0b3VjaGVzIHRoZSBtYXJrZWRcbiAgIyAgICAgICByZWdpb24gaW4gYW55IHdheSwgaW5jbHVkaW5nIGNoYW5nZXMgdGhhdCBlbmQgYXQgdGhlIG1hcmtlcidzXG4gICMgICAgICAgc3RhcnQgb3Igc3RhcnQgYXQgdGhlIG1hcmtlcidzIGVuZC4gVGhpcyBpcyB0aGUgbW9zdCBmcmFnaWxlIHN0cmF0ZWd5LlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwbGF5TWFya2VyfS5cbiAgbWFya0J1ZmZlclJhbmdlOiAoYnVmZmVyUmFuZ2UsIG9wdGlvbnMpIC0+XG4gICAgQGRlZmF1bHRNYXJrZXJMYXllci5tYXJrQnVmZmVyUmFuZ2UoYnVmZmVyUmFuZ2UsIG9wdGlvbnMpXG5cbiAgIyBFc3NlbnRpYWw6IENyZWF0ZSBhIG1hcmtlciBvbiB0aGUgZGVmYXVsdCBtYXJrZXIgbGF5ZXIgd2l0aCB0aGUgZ2l2ZW4gcmFuZ2VcbiAgIyBpbiBzY3JlZW4gY29vcmRpbmF0ZXMuIFRoaXMgbWFya2VyIHdpbGwgbWFpbnRhaW4gaXRzIGxvZ2ljYWwgbG9jYXRpb24gYXMgdGhlXG4gICMgYnVmZmVyIGlzIGNoYW5nZWQsIHNvIGlmIHlvdSBtYXJrIGEgcGFydGljdWxhciB3b3JkLCB0aGUgbWFya2VyIHdpbGwgcmVtYWluXG4gICMgb3ZlciB0aGF0IHdvcmQgZXZlbiBpZiB0aGUgd29yZCdzIGxvY2F0aW9uIGluIHRoZSBidWZmZXIgY2hhbmdlcy5cbiAgI1xuICAjICogYHJhbmdlYCBBIHtSYW5nZX0gb3IgcmFuZ2UtY29tcGF0aWJsZSB7QXJyYXl9XG4gICMgKiBgcHJvcGVydGllc2AgQSBoYXNoIG9mIGtleS12YWx1ZSBwYWlycyB0byBhc3NvY2lhdGUgd2l0aCB0aGUgbWFya2VyLiBUaGVyZVxuICAjICAgYXJlIGFsc28gcmVzZXJ2ZWQgcHJvcGVydHkgbmFtZXMgdGhhdCBoYXZlIG1hcmtlci1zcGVjaWZpYyBtZWFuaW5nLlxuICAjICAgKiBgbWFpbnRhaW5IaXN0b3J5YCAob3B0aW9uYWwpIHtCb29sZWFufSBXaGV0aGVyIHRvIHN0b3JlIHRoaXMgbWFya2VyJ3NcbiAgIyAgICAgcmFuZ2UgYmVmb3JlIGFuZCBhZnRlciBlYWNoIGNoYW5nZSBpbiB0aGUgdW5kbyBoaXN0b3J5LiBUaGlzIGFsbG93cyB0aGVcbiAgIyAgICAgbWFya2VyJ3MgcG9zaXRpb24gdG8gYmUgcmVzdG9yZWQgbW9yZSBhY2N1cmF0ZWx5IGZvciBjZXJ0YWluIHVuZG8vcmVkb1xuICAjICAgICBvcGVyYXRpb25zLCBidXQgdXNlcyBtb3JlIHRpbWUgYW5kIG1lbW9yeS4gKGRlZmF1bHQ6IGZhbHNlKVxuICAjICAgKiBgcmV2ZXJzZWRgIChvcHRpb25hbCkge0Jvb2xlYW59IENyZWF0ZXMgdGhlIG1hcmtlciBpbiBhIHJldmVyc2VkXG4gICMgICAgIG9yaWVudGF0aW9uLiAoZGVmYXVsdDogZmFsc2UpXG4gICMgICAqIGBpbnZhbGlkYXRlYCAob3B0aW9uYWwpIHtTdHJpbmd9IERldGVybWluZXMgdGhlIHJ1bGVzIGJ5IHdoaWNoIGNoYW5nZXNcbiAgIyAgICAgdG8gdGhlIGJ1ZmZlciAqaW52YWxpZGF0ZSogdGhlIG1hcmtlci4gKGRlZmF1bHQ6ICdvdmVybGFwJykgSXQgY2FuIGJlXG4gICMgICAgIGFueSBvZiB0aGUgZm9sbG93aW5nIHN0cmF0ZWdpZXMsIGluIG9yZGVyIG9mIGZyYWdpbGl0eTpcbiAgIyAgICAgKiBfX25ldmVyX186IFRoZSBtYXJrZXIgaXMgbmV2ZXIgbWFya2VkIGFzIGludmFsaWQuIFRoaXMgaXMgYSBnb29kIGNob2ljZSBmb3JcbiAgIyAgICAgICBtYXJrZXJzIHJlcHJlc2VudGluZyBzZWxlY3Rpb25zIGluIGFuIGVkaXRvci5cbiAgIyAgICAgKiBfX3N1cnJvdW5kX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgY2hhbmdlcyB0aGF0IGNvbXBsZXRlbHkgc3Vycm91bmQgaXQuXG4gICMgICAgICogX19vdmVybGFwX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgY2hhbmdlcyB0aGF0IHN1cnJvdW5kIHRoZVxuICAjICAgICAgIHN0YXJ0IG9yIGVuZCBvZiB0aGUgbWFya2VyLiBUaGlzIGlzIHRoZSBkZWZhdWx0LlxuICAjICAgICAqIF9faW5zaWRlX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgY2hhbmdlcyB0aGF0IGV4dGVuZCBpbnRvIHRoZVxuICAjICAgICAgIGluc2lkZSBvZiB0aGUgbWFya2VyLiBDaGFuZ2VzIHRoYXQgZW5kIGF0IHRoZSBtYXJrZXIncyBzdGFydCBvclxuICAjICAgICAgIHN0YXJ0IGF0IHRoZSBtYXJrZXIncyBlbmQgZG8gbm90IGludmFsaWRhdGUgdGhlIG1hcmtlci5cbiAgIyAgICAgKiBfX3RvdWNoX186IFRoZSBtYXJrZXIgaXMgaW52YWxpZGF0ZWQgYnkgYSBjaGFuZ2UgdGhhdCB0b3VjaGVzIHRoZSBtYXJrZWRcbiAgIyAgICAgICByZWdpb24gaW4gYW55IHdheSwgaW5jbHVkaW5nIGNoYW5nZXMgdGhhdCBlbmQgYXQgdGhlIG1hcmtlcidzXG4gICMgICAgICAgc3RhcnQgb3Igc3RhcnQgYXQgdGhlIG1hcmtlcidzIGVuZC4gVGhpcyBpcyB0aGUgbW9zdCBmcmFnaWxlIHN0cmF0ZWd5LlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwbGF5TWFya2VyfS5cbiAgbWFya1NjcmVlblJhbmdlOiAoc2NyZWVuUmFuZ2UsIG9wdGlvbnMpIC0+XG4gICAgQGRlZmF1bHRNYXJrZXJMYXllci5tYXJrU2NyZWVuUmFuZ2Uoc2NyZWVuUmFuZ2UsIG9wdGlvbnMpXG5cbiAgIyBFc3NlbnRpYWw6IENyZWF0ZSBhIG1hcmtlciBvbiB0aGUgZGVmYXVsdCBtYXJrZXIgbGF5ZXIgd2l0aCB0aGUgZ2l2ZW4gYnVmZmVyXG4gICMgcG9zaXRpb24gYW5kIG5vIHRhaWwuIFRvIGdyb3VwIG11bHRpcGxlIG1hcmtlcnMgdG9nZXRoZXIgaW4gdGhlaXIgb3duXG4gICMgcHJpdmF0ZSBsYXllciwgc2VlIHs6OmFkZE1hcmtlckxheWVyfS5cbiAgI1xuICAjICogYGJ1ZmZlclBvc2l0aW9uYCBBIHtQb2ludH0gb3IgcG9pbnQtY29tcGF0aWJsZSB7QXJyYXl9XG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSBBbiB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYGludmFsaWRhdGVgIChvcHRpb25hbCkge1N0cmluZ30gRGV0ZXJtaW5lcyB0aGUgcnVsZXMgYnkgd2hpY2ggY2hhbmdlc1xuICAjICAgICB0byB0aGUgYnVmZmVyICppbnZhbGlkYXRlKiB0aGUgbWFya2VyLiAoZGVmYXVsdDogJ292ZXJsYXAnKSBJdCBjYW4gYmVcbiAgIyAgICAgYW55IG9mIHRoZSBmb2xsb3dpbmcgc3RyYXRlZ2llcywgaW4gb3JkZXIgb2YgZnJhZ2lsaXR5OlxuICAjICAgICAqIF9fbmV2ZXJfXzogVGhlIG1hcmtlciBpcyBuZXZlciBtYXJrZWQgYXMgaW52YWxpZC4gVGhpcyBpcyBhIGdvb2QgY2hvaWNlIGZvclxuICAjICAgICAgIG1hcmtlcnMgcmVwcmVzZW50aW5nIHNlbGVjdGlvbnMgaW4gYW4gZWRpdG9yLlxuICAjICAgICAqIF9fc3Vycm91bmRfXzogVGhlIG1hcmtlciBpcyBpbnZhbGlkYXRlZCBieSBjaGFuZ2VzIHRoYXQgY29tcGxldGVseSBzdXJyb3VuZCBpdC5cbiAgIyAgICAgKiBfX292ZXJsYXBfXzogVGhlIG1hcmtlciBpcyBpbnZhbGlkYXRlZCBieSBjaGFuZ2VzIHRoYXQgc3Vycm91bmQgdGhlXG4gICMgICAgICAgc3RhcnQgb3IgZW5kIG9mIHRoZSBtYXJrZXIuIFRoaXMgaXMgdGhlIGRlZmF1bHQuXG4gICMgICAgICogX19pbnNpZGVfXzogVGhlIG1hcmtlciBpcyBpbnZhbGlkYXRlZCBieSBjaGFuZ2VzIHRoYXQgZXh0ZW5kIGludG8gdGhlXG4gICMgICAgICAgaW5zaWRlIG9mIHRoZSBtYXJrZXIuIENoYW5nZXMgdGhhdCBlbmQgYXQgdGhlIG1hcmtlcidzIHN0YXJ0IG9yXG4gICMgICAgICAgc3RhcnQgYXQgdGhlIG1hcmtlcidzIGVuZCBkbyBub3QgaW52YWxpZGF0ZSB0aGUgbWFya2VyLlxuICAjICAgICAqIF9fdG91Y2hfXzogVGhlIG1hcmtlciBpcyBpbnZhbGlkYXRlZCBieSBhIGNoYW5nZSB0aGF0IHRvdWNoZXMgdGhlIG1hcmtlZFxuICAjICAgICAgIHJlZ2lvbiBpbiBhbnkgd2F5LCBpbmNsdWRpbmcgY2hhbmdlcyB0aGF0IGVuZCBhdCB0aGUgbWFya2VyJ3NcbiAgIyAgICAgICBzdGFydCBvciBzdGFydCBhdCB0aGUgbWFya2VyJ3MgZW5kLiBUaGlzIGlzIHRoZSBtb3N0IGZyYWdpbGUgc3RyYXRlZ3kuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3BsYXlNYXJrZXJ9LlxuICBtYXJrQnVmZmVyUG9zaXRpb246IChidWZmZXJQb3NpdGlvbiwgb3B0aW9ucykgLT5cbiAgICBAZGVmYXVsdE1hcmtlckxheWVyLm1hcmtCdWZmZXJQb3NpdGlvbihidWZmZXJQb3NpdGlvbiwgb3B0aW9ucylcblxuICAjIEVzc2VudGlhbDogQ3JlYXRlIGEgbWFya2VyIG9uIHRoZSBkZWZhdWx0IG1hcmtlciBsYXllciB3aXRoIHRoZSBnaXZlbiBzY3JlZW5cbiAgIyBwb3NpdGlvbiBhbmQgbm8gdGFpbC4gVG8gZ3JvdXAgbXVsdGlwbGUgbWFya2VycyB0b2dldGhlciBpbiB0aGVpciBvd25cbiAgIyBwcml2YXRlIGxheWVyLCBzZWUgezo6YWRkTWFya2VyTGF5ZXJ9LlxuICAjXG4gICMgKiBgc2NyZWVuUG9zaXRpb25gIEEge1BvaW50fSBvciBwb2ludC1jb21wYXRpYmxlIHtBcnJheX1cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIEFuIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgaW52YWxpZGF0ZWAgKG9wdGlvbmFsKSB7U3RyaW5nfSBEZXRlcm1pbmVzIHRoZSBydWxlcyBieSB3aGljaCBjaGFuZ2VzXG4gICMgICAgIHRvIHRoZSBidWZmZXIgKmludmFsaWRhdGUqIHRoZSBtYXJrZXIuIChkZWZhdWx0OiAnb3ZlcmxhcCcpIEl0IGNhbiBiZVxuICAjICAgICBhbnkgb2YgdGhlIGZvbGxvd2luZyBzdHJhdGVnaWVzLCBpbiBvcmRlciBvZiBmcmFnaWxpdHk6XG4gICMgICAgICogX19uZXZlcl9fOiBUaGUgbWFya2VyIGlzIG5ldmVyIG1hcmtlZCBhcyBpbnZhbGlkLiBUaGlzIGlzIGEgZ29vZCBjaG9pY2UgZm9yXG4gICMgICAgICAgbWFya2VycyByZXByZXNlbnRpbmcgc2VsZWN0aW9ucyBpbiBhbiBlZGl0b3IuXG4gICMgICAgICogX19zdXJyb3VuZF9fOiBUaGUgbWFya2VyIGlzIGludmFsaWRhdGVkIGJ5IGNoYW5nZXMgdGhhdCBjb21wbGV0ZWx5IHN1cnJvdW5kIGl0LlxuICAjICAgICAqIF9fb3ZlcmxhcF9fOiBUaGUgbWFya2VyIGlzIGludmFsaWRhdGVkIGJ5IGNoYW5nZXMgdGhhdCBzdXJyb3VuZCB0aGVcbiAgIyAgICAgICBzdGFydCBvciBlbmQgb2YgdGhlIG1hcmtlci4gVGhpcyBpcyB0aGUgZGVmYXVsdC5cbiAgIyAgICAgKiBfX2luc2lkZV9fOiBUaGUgbWFya2VyIGlzIGludmFsaWRhdGVkIGJ5IGNoYW5nZXMgdGhhdCBleHRlbmQgaW50byB0aGVcbiAgIyAgICAgICBpbnNpZGUgb2YgdGhlIG1hcmtlci4gQ2hhbmdlcyB0aGF0IGVuZCBhdCB0aGUgbWFya2VyJ3Mgc3RhcnQgb3JcbiAgIyAgICAgICBzdGFydCBhdCB0aGUgbWFya2VyJ3MgZW5kIGRvIG5vdCBpbnZhbGlkYXRlIHRoZSBtYXJrZXIuXG4gICMgICAgICogX190b3VjaF9fOiBUaGUgbWFya2VyIGlzIGludmFsaWRhdGVkIGJ5IGEgY2hhbmdlIHRoYXQgdG91Y2hlcyB0aGUgbWFya2VkXG4gICMgICAgICAgcmVnaW9uIGluIGFueSB3YXksIGluY2x1ZGluZyBjaGFuZ2VzIHRoYXQgZW5kIGF0IHRoZSBtYXJrZXInc1xuICAjICAgICAgIHN0YXJ0IG9yIHN0YXJ0IGF0IHRoZSBtYXJrZXIncyBlbmQuIFRoaXMgaXMgdGhlIG1vc3QgZnJhZ2lsZSBzdHJhdGVneS5cbiAgIyAgICogYGNsaXBEaXJlY3Rpb25gIHtTdHJpbmd9IElmIGAnYmFja3dhcmQnYCwgcmV0dXJucyB0aGUgZmlyc3QgdmFsaWRcbiAgIyAgICAgcG9zaXRpb24gcHJlY2VkaW5nIGFuIGludmFsaWQgcG9zaXRpb24uIElmIGAnZm9yd2FyZCdgLCByZXR1cm5zIHRoZVxuICAjICAgICBmaXJzdCB2YWxpZCBwb3NpdGlvbiBmb2xsb3dpbmcgYW4gaW52YWxpZCBwb3NpdGlvbi4gSWYgYCdjbG9zZXN0J2AsXG4gICMgICAgIHJldHVybnMgdGhlIGZpcnN0IHZhbGlkIHBvc2l0aW9uIGNsb3Nlc3QgdG8gYW4gaW52YWxpZCBwb3NpdGlvbi5cbiAgIyAgICAgRGVmYXVsdHMgdG8gYCdjbG9zZXN0J2AuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3BsYXlNYXJrZXJ9LlxuICBtYXJrU2NyZWVuUG9zaXRpb246IChzY3JlZW5Qb3NpdGlvbiwgb3B0aW9ucykgLT5cbiAgICBAZGVmYXVsdE1hcmtlckxheWVyLm1hcmtTY3JlZW5Qb3NpdGlvbihzY3JlZW5Qb3NpdGlvbiwgb3B0aW9ucylcblxuICAjIEVzc2VudGlhbDogRmluZCBhbGwge0Rpc3BsYXlNYXJrZXJ9cyBvbiB0aGUgZGVmYXVsdCBtYXJrZXIgbGF5ZXIgdGhhdFxuICAjIG1hdGNoIHRoZSBnaXZlbiBwcm9wZXJ0aWVzLlxuICAjXG4gICMgVGhpcyBtZXRob2QgZmluZHMgbWFya2VycyBiYXNlZCBvbiB0aGUgZ2l2ZW4gcHJvcGVydGllcy4gTWFya2VycyBjYW4gYmVcbiAgIyBhc3NvY2lhdGVkIHdpdGggY3VzdG9tIHByb3BlcnRpZXMgdGhhdCB3aWxsIGJlIGNvbXBhcmVkIHdpdGggYmFzaWMgZXF1YWxpdHkuXG4gICMgSW4gYWRkaXRpb24sIHRoZXJlIGFyZSBzZXZlcmFsIHNwZWNpYWwgcHJvcGVydGllcyB0aGF0IHdpbGwgYmUgY29tcGFyZWRcbiAgIyB3aXRoIHRoZSByYW5nZSBvZiB0aGUgbWFya2VycyByYXRoZXIgdGhhbiB0aGVpciBwcm9wZXJ0aWVzLlxuICAjXG4gICMgKiBgcHJvcGVydGllc2AgQW4ge09iamVjdH0gY29udGFpbmluZyBwcm9wZXJ0aWVzIHRoYXQgZWFjaCByZXR1cm5lZCBtYXJrZXJcbiAgIyAgIG11c3Qgc2F0aXNmeS4gTWFya2VycyBjYW4gYmUgYXNzb2NpYXRlZCB3aXRoIGN1c3RvbSBwcm9wZXJ0aWVzLCB3aGljaCBhcmVcbiAgIyAgIGNvbXBhcmVkIHdpdGggYmFzaWMgZXF1YWxpdHkuIEluIGFkZGl0aW9uLCBzZXZlcmFsIHJlc2VydmVkIHByb3BlcnRpZXNcbiAgIyAgIGNhbiBiZSB1c2VkIHRvIGZpbHRlciBtYXJrZXJzIGJhc2VkIG9uIHRoZWlyIGN1cnJlbnQgcmFuZ2U6XG4gICMgICAqIGBzdGFydEJ1ZmZlclJvd2AgT25seSBpbmNsdWRlIG1hcmtlcnMgc3RhcnRpbmcgYXQgdGhpcyByb3cgaW4gYnVmZmVyXG4gICMgICAgICAgY29vcmRpbmF0ZXMuXG4gICMgICAqIGBlbmRCdWZmZXJSb3dgIE9ubHkgaW5jbHVkZSBtYXJrZXJzIGVuZGluZyBhdCB0aGlzIHJvdyBpbiBidWZmZXJcbiAgIyAgICAgICBjb29yZGluYXRlcy5cbiAgIyAgICogYGNvbnRhaW5zQnVmZmVyUmFuZ2VgIE9ubHkgaW5jbHVkZSBtYXJrZXJzIGNvbnRhaW5pbmcgdGhpcyB7UmFuZ2V9IG9yXG4gICMgICAgICAgaW4gcmFuZ2UtY29tcGF0aWJsZSB7QXJyYXl9IGluIGJ1ZmZlciBjb29yZGluYXRlcy5cbiAgIyAgICogYGNvbnRhaW5zQnVmZmVyUG9zaXRpb25gIE9ubHkgaW5jbHVkZSBtYXJrZXJzIGNvbnRhaW5pbmcgdGhpcyB7UG9pbnR9XG4gICMgICAgICAgb3Ige0FycmF5fSBvZiBgW3JvdywgY29sdW1uXWAgaW4gYnVmZmVyIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgUmV0dXJucyBhbiB7QXJyYXl9IG9mIHtEaXNwbGF5TWFya2VyfXNcbiAgZmluZE1hcmtlcnM6IChwYXJhbXMpIC0+XG4gICAgQGRlZmF1bHRNYXJrZXJMYXllci5maW5kTWFya2VycyhwYXJhbXMpXG5cbiAgIyBFeHRlbmRlZDogR2V0IHRoZSB7RGlzcGxheU1hcmtlcn0gb24gdGhlIGRlZmF1bHQgbGF5ZXIgZm9yIHRoZSBnaXZlblxuICAjIG1hcmtlciBpZC5cbiAgI1xuICAjICogYGlkYCB7TnVtYmVyfSBpZCBvZiB0aGUgbWFya2VyXG4gIGdldE1hcmtlcjogKGlkKSAtPlxuICAgIEBkZWZhdWx0TWFya2VyTGF5ZXIuZ2V0TWFya2VyKGlkKVxuXG4gICMgRXh0ZW5kZWQ6IEdldCBhbGwge0Rpc3BsYXlNYXJrZXJ9cyBvbiB0aGUgZGVmYXVsdCBtYXJrZXIgbGF5ZXIuIENvbnNpZGVyXG4gICMgdXNpbmcgezo6ZmluZE1hcmtlcnN9XG4gIGdldE1hcmtlcnM6IC0+XG4gICAgQGRlZmF1bHRNYXJrZXJMYXllci5nZXRNYXJrZXJzKClcblxuICAjIEV4dGVuZGVkOiBHZXQgdGhlIG51bWJlciBvZiBtYXJrZXJzIGluIHRoZSBkZWZhdWx0IG1hcmtlciBsYXllci5cbiAgI1xuICAjIFJldHVybnMgYSB7TnVtYmVyfS5cbiAgZ2V0TWFya2VyQ291bnQ6IC0+XG4gICAgQGRlZmF1bHRNYXJrZXJMYXllci5nZXRNYXJrZXJDb3VudCgpXG5cbiAgZGVzdHJveU1hcmtlcjogKGlkKSAtPlxuICAgIEBnZXRNYXJrZXIoaWQpPy5kZXN0cm95KClcblxuICAjIEVzc2VudGlhbDogQ3JlYXRlIGEgbWFya2VyIGxheWVyIHRvIGdyb3VwIHJlbGF0ZWQgbWFya2Vycy5cbiAgI1xuICAjICogYG9wdGlvbnNgIEFuIHtPYmplY3R9IGNvbnRhaW5pbmcgdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgbWFpbnRhaW5IaXN0b3J5YCBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgbWFya2VyIHN0YXRlIHNob3VsZCBiZVxuICAjICAgICByZXN0b3JlZCBvbiB1bmRvL3JlZG8uIERlZmF1bHRzIHRvIGBmYWxzZWAuXG4gICMgICAqIGBwZXJzaXN0ZW50YCBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgb3Igbm90IHRoaXMgbWFya2VyIGxheWVyXG4gICMgICAgIHNob3VsZCBiZSBzZXJpYWxpemVkIGFuZCBkZXNlcmlhbGl6ZWQgYWxvbmcgd2l0aCB0aGUgcmVzdCBvZiB0aGVcbiAgIyAgICAgYnVmZmVyLiBEZWZhdWx0cyB0byBgZmFsc2VgLiBJZiBgdHJ1ZWAsIHRoZSBtYXJrZXIgbGF5ZXIncyBpZCB3aWxsIGJlXG4gICMgICAgIG1haW50YWluZWQgYWNyb3NzIHRoZSBzZXJpYWxpemF0aW9uIGJvdW5kYXJ5LCBhbGxvd2luZyB5b3UgdG8gcmV0cmlldmVcbiAgIyAgICAgaXQgdmlhIHs6OmdldE1hcmtlckxheWVyfS5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcGxheU1hcmtlckxheWVyfS5cbiAgYWRkTWFya2VyTGF5ZXI6IChvcHRpb25zKSAtPlxuICAgIEBkaXNwbGF5TGF5ZXIuYWRkTWFya2VyTGF5ZXIob3B0aW9ucylcblxuICAjIEVzc2VudGlhbDogR2V0IGEge0Rpc3BsYXlNYXJrZXJMYXllcn0gYnkgaWQuXG4gICNcbiAgIyAqIGBpZGAgVGhlIGlkIG9mIHRoZSBtYXJrZXIgbGF5ZXIgdG8gcmV0cmlldmUuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3BsYXlNYXJrZXJMYXllcn0gb3IgYHVuZGVmaW5lZGAgaWYgbm8gbGF5ZXIgZXhpc3RzIHdpdGggdGhlXG4gICMgZ2l2ZW4gaWQuXG4gIGdldE1hcmtlckxheWVyOiAoaWQpIC0+XG4gICAgQGRpc3BsYXlMYXllci5nZXRNYXJrZXJMYXllcihpZClcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSBkZWZhdWx0IHtEaXNwbGF5TWFya2VyTGF5ZXJ9LlxuICAjXG4gICMgQWxsIG1hcmtlciBBUElzIG5vdCB0aWVkIHRvIGFuIGV4cGxpY2l0IGxheWVyIGludGVyYWN0IHdpdGggdGhpcyBkZWZhdWx0XG4gICMgbGF5ZXIuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3BsYXlNYXJrZXJMYXllcn0uXG4gIGdldERlZmF1bHRNYXJrZXJMYXllcjogLT5cbiAgICBAZGVmYXVsdE1hcmtlckxheWVyXG5cbiAgIyMjXG4gIFNlY3Rpb246IEN1cnNvcnNcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUgcG9zaXRpb24gb2YgdGhlIG1vc3QgcmVjZW50bHkgYWRkZWQgY3Vyc29yIGluIGJ1ZmZlclxuICAjIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgUmV0dXJucyBhIHtQb2ludH1cbiAgZ2V0Q3Vyc29yQnVmZmVyUG9zaXRpb246IC0+XG4gICAgQGdldExhc3RDdXJzb3IoKS5nZXRCdWZmZXJQb3NpdGlvbigpXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUgcG9zaXRpb24gb2YgYWxsIHRoZSBjdXJzb3IgcG9zaXRpb25zIGluIGJ1ZmZlciBjb29yZGluYXRlcy5cbiAgI1xuICAjIFJldHVybnMge0FycmF5fSBvZiB7UG9pbnR9cyBpbiB0aGUgb3JkZXIgdGhleSB3ZXJlIGFkZGVkXG4gIGdldEN1cnNvckJ1ZmZlclBvc2l0aW9uczogLT5cbiAgICBjdXJzb3IuZ2V0QnVmZmVyUG9zaXRpb24oKSBmb3IgY3Vyc29yIGluIEBnZXRDdXJzb3JzKClcblxuICAjIEVzc2VudGlhbDogTW92ZSB0aGUgY3Vyc29yIHRvIHRoZSBnaXZlbiBwb3NpdGlvbiBpbiBidWZmZXIgY29vcmRpbmF0ZXMuXG4gICNcbiAgIyBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgY3Vyc29ycywgdGhleSB3aWxsIGJlIGNvbnNvbGlkYXRlZCB0byBhIHNpbmdsZSBjdXJzb3IuXG4gICNcbiAgIyAqIGBwb3NpdGlvbmAgQSB7UG9pbnR9IG9yIHtBcnJheX0gb2YgYFtyb3csIGNvbHVtbl1gXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSBBbiB7T2JqZWN0fSBjb250YWluaW5nIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYGF1dG9zY3JvbGxgIERldGVybWluZXMgd2hldGhlciB0aGUgZWRpdG9yIHNjcm9sbHMgdG8gdGhlIG5ldyBjdXJzb3Inc1xuICAjICAgICBwb3NpdGlvbi4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgc2V0Q3Vyc29yQnVmZmVyUG9zaXRpb246IChwb3NpdGlvbiwgb3B0aW9ucykgLT5cbiAgICBAbW92ZUN1cnNvcnMgKGN1cnNvcikgLT4gY3Vyc29yLnNldEJ1ZmZlclBvc2l0aW9uKHBvc2l0aW9uLCBvcHRpb25zKVxuXG4gICMgRXNzZW50aWFsOiBHZXQgYSB7Q3Vyc29yfSBhdCBnaXZlbiBzY3JlZW4gY29vcmRpbmF0ZXMge1BvaW50fVxuICAjXG4gICMgKiBgcG9zaXRpb25gIEEge1BvaW50fSBvciB7QXJyYXl9IG9mIGBbcm93LCBjb2x1bW5dYFxuICAjXG4gICMgUmV0dXJucyB0aGUgZmlyc3QgbWF0Y2hlZCB7Q3Vyc29yfSBvciB1bmRlZmluZWRcbiAgZ2V0Q3Vyc29yQXRTY3JlZW5Qb3NpdGlvbjogKHBvc2l0aW9uKSAtPlxuICAgIGZvciBjdXJzb3IgaW4gQGN1cnNvcnNcbiAgICAgIHJldHVybiBjdXJzb3IgaWYgY3Vyc29yLmdldFNjcmVlblBvc2l0aW9uKCkuaXNFcXVhbChwb3NpdGlvbilcbiAgICB1bmRlZmluZWRcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSBwb3NpdGlvbiBvZiB0aGUgbW9zdCByZWNlbnRseSBhZGRlZCBjdXJzb3IgaW4gc2NyZWVuXG4gICMgY29vcmRpbmF0ZXMuXG4gICNcbiAgIyBSZXR1cm5zIGEge1BvaW50fS5cbiAgZ2V0Q3Vyc29yU2NyZWVuUG9zaXRpb246IC0+XG4gICAgQGdldExhc3RDdXJzb3IoKS5nZXRTY3JlZW5Qb3NpdGlvbigpXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUgcG9zaXRpb24gb2YgYWxsIHRoZSBjdXJzb3IgcG9zaXRpb25zIGluIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgI1xuICAjIFJldHVybnMge0FycmF5fSBvZiB7UG9pbnR9cyBpbiB0aGUgb3JkZXIgdGhlIGN1cnNvcnMgd2VyZSBhZGRlZFxuICBnZXRDdXJzb3JTY3JlZW5Qb3NpdGlvbnM6IC0+XG4gICAgY3Vyc29yLmdldFNjcmVlblBvc2l0aW9uKCkgZm9yIGN1cnNvciBpbiBAZ2V0Q3Vyc29ycygpXG5cbiAgIyBFc3NlbnRpYWw6IE1vdmUgdGhlIGN1cnNvciB0byB0aGUgZ2l2ZW4gcG9zaXRpb24gaW4gc2NyZWVuIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgSWYgdGhlcmUgYXJlIG11bHRpcGxlIGN1cnNvcnMsIHRoZXkgd2lsbCBiZSBjb25zb2xpZGF0ZWQgdG8gYSBzaW5nbGUgY3Vyc29yLlxuICAjXG4gICMgKiBgcG9zaXRpb25gIEEge1BvaW50fSBvciB7QXJyYXl9IG9mIGBbcm93LCBjb2x1bW5dYFxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgQW4ge09iamVjdH0gY29tYmluaW5nIG9wdGlvbnMgZm9yIHs6OmNsaXBTY3JlZW5Qb3NpdGlvbn0gd2l0aDpcbiAgIyAgICogYGF1dG9zY3JvbGxgIERldGVybWluZXMgd2hldGhlciB0aGUgZWRpdG9yIHNjcm9sbHMgdG8gdGhlIG5ldyBjdXJzb3Inc1xuICAjICAgICBwb3NpdGlvbi4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgc2V0Q3Vyc29yU2NyZWVuUG9zaXRpb246IChwb3NpdGlvbiwgb3B0aW9ucykgLT5cbiAgICBpZiBvcHRpb25zPy5jbGlwP1xuICAgICAgR3JpbS5kZXByZWNhdGUoXCJUaGUgYGNsaXBgIHBhcmFtZXRlciBoYXMgYmVlbiBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgc29vbi4gUGxlYXNlLCB1c2UgYGNsaXBEaXJlY3Rpb25gIGluc3RlYWQuXCIpXG4gICAgICBvcHRpb25zLmNsaXBEaXJlY3Rpb24gPz0gb3B0aW9ucy5jbGlwXG4gICAgaWYgb3B0aW9ucz8ud3JhcEF0U29mdE5ld2xpbmVzP1xuICAgICAgR3JpbS5kZXByZWNhdGUoXCJUaGUgYHdyYXBBdFNvZnROZXdsaW5lc2AgcGFyYW1ldGVyIGhhcyBiZWVuIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBzb29uLiBQbGVhc2UsIHVzZSBgY2xpcERpcmVjdGlvbjogJ2ZvcndhcmQnYCBpbnN0ZWFkLlwiKVxuICAgICAgb3B0aW9ucy5jbGlwRGlyZWN0aW9uID89IGlmIG9wdGlvbnMud3JhcEF0U29mdE5ld2xpbmVzIHRoZW4gJ2ZvcndhcmQnIGVsc2UgJ2JhY2t3YXJkJ1xuICAgIGlmIG9wdGlvbnM/LndyYXBCZXlvbmROZXdsaW5lcz9cbiAgICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhlIGB3cmFwQmV5b25kTmV3bGluZXNgIHBhcmFtZXRlciBoYXMgYmVlbiBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgc29vbi4gUGxlYXNlLCB1c2UgYGNsaXBEaXJlY3Rpb246ICdmb3J3YXJkJ2AgaW5zdGVhZC5cIilcbiAgICAgIG9wdGlvbnMuY2xpcERpcmVjdGlvbiA/PSBpZiBvcHRpb25zLndyYXBCZXlvbmROZXdsaW5lcyB0aGVuICdmb3J3YXJkJyBlbHNlICdiYWNrd2FyZCdcblxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3Iuc2V0U2NyZWVuUG9zaXRpb24ocG9zaXRpb24sIG9wdGlvbnMpXG5cbiAgIyBFc3NlbnRpYWw6IEFkZCBhIGN1cnNvciBhdCB0aGUgZ2l2ZW4gcG9zaXRpb24gaW4gYnVmZmVyIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgKiBgYnVmZmVyUG9zaXRpb25gIEEge1BvaW50fSBvciB7QXJyYXl9IG9mIGBbcm93LCBjb2x1bW5dYFxuICAjXG4gICMgUmV0dXJucyBhIHtDdXJzb3J9LlxuICBhZGRDdXJzb3JBdEJ1ZmZlclBvc2l0aW9uOiAoYnVmZmVyUG9zaXRpb24sIG9wdGlvbnMpIC0+XG4gICAgQHNlbGVjdGlvbnNNYXJrZXJMYXllci5tYXJrQnVmZmVyUG9zaXRpb24oYnVmZmVyUG9zaXRpb24sIHtpbnZhbGlkYXRlOiAnbmV2ZXInfSlcbiAgICBAZ2V0TGFzdFNlbGVjdGlvbigpLmN1cnNvci5hdXRvc2Nyb2xsKCkgdW5sZXNzIG9wdGlvbnM/LmF1dG9zY3JvbGwgaXMgZmFsc2VcbiAgICBAZ2V0TGFzdFNlbGVjdGlvbigpLmN1cnNvclxuXG4gICMgRXNzZW50aWFsOiBBZGQgYSBjdXJzb3IgYXQgdGhlIHBvc2l0aW9uIGluIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgI1xuICAjICogYHNjcmVlblBvc2l0aW9uYCBBIHtQb2ludH0gb3Ige0FycmF5fSBvZiBgW3JvdywgY29sdW1uXWBcbiAgI1xuICAjIFJldHVybnMgYSB7Q3Vyc29yfS5cbiAgYWRkQ3Vyc29yQXRTY3JlZW5Qb3NpdGlvbjogKHNjcmVlblBvc2l0aW9uLCBvcHRpb25zKSAtPlxuICAgIEBzZWxlY3Rpb25zTWFya2VyTGF5ZXIubWFya1NjcmVlblBvc2l0aW9uKHNjcmVlblBvc2l0aW9uLCB7aW52YWxpZGF0ZTogJ25ldmVyJ30pXG4gICAgQGdldExhc3RTZWxlY3Rpb24oKS5jdXJzb3IuYXV0b3Njcm9sbCgpIHVubGVzcyBvcHRpb25zPy5hdXRvc2Nyb2xsIGlzIGZhbHNlXG4gICAgQGdldExhc3RTZWxlY3Rpb24oKS5jdXJzb3JcblxuICAjIEVzc2VudGlhbDogUmV0dXJucyB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIG9yIG5vdCB0aGVyZSBhcmUgbXVsdGlwbGUgY3Vyc29ycy5cbiAgaGFzTXVsdGlwbGVDdXJzb3JzOiAtPlxuICAgIEBnZXRDdXJzb3JzKCkubGVuZ3RoID4gMVxuXG4gICMgRXNzZW50aWFsOiBNb3ZlIGV2ZXJ5IGN1cnNvciB1cCBvbmUgcm93IGluIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgI1xuICAjICogYGxpbmVDb3VudGAgKG9wdGlvbmFsKSB7TnVtYmVyfSBudW1iZXIgb2YgbGluZXMgdG8gbW92ZVxuICBtb3ZlVXA6IChsaW5lQ291bnQpIC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVXAobGluZUNvdW50LCBtb3ZlVG9FbmRPZlNlbGVjdGlvbjogdHJ1ZSlcblxuICAjIEVzc2VudGlhbDogTW92ZSBldmVyeSBjdXJzb3IgZG93biBvbmUgcm93IGluIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgI1xuICAjICogYGxpbmVDb3VudGAgKG9wdGlvbmFsKSB7TnVtYmVyfSBudW1iZXIgb2YgbGluZXMgdG8gbW92ZVxuICBtb3ZlRG93bjogKGxpbmVDb3VudCkgLT5cbiAgICBAbW92ZUN1cnNvcnMgKGN1cnNvcikgLT4gY3Vyc29yLm1vdmVEb3duKGxpbmVDb3VudCwgbW92ZVRvRW5kT2ZTZWxlY3Rpb246IHRydWUpXG5cbiAgIyBFc3NlbnRpYWw6IE1vdmUgZXZlcnkgY3Vyc29yIGxlZnQgb25lIGNvbHVtbi5cbiAgI1xuICAjICogYGNvbHVtbkNvdW50YCAob3B0aW9uYWwpIHtOdW1iZXJ9IG51bWJlciBvZiBjb2x1bW5zIHRvIG1vdmUgKGRlZmF1bHQ6IDEpXG4gIG1vdmVMZWZ0OiAoY29sdW1uQ291bnQpIC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlTGVmdChjb2x1bW5Db3VudCwgbW92ZVRvRW5kT2ZTZWxlY3Rpb246IHRydWUpXG5cbiAgIyBFc3NlbnRpYWw6IE1vdmUgZXZlcnkgY3Vyc29yIHJpZ2h0IG9uZSBjb2x1bW4uXG4gICNcbiAgIyAqIGBjb2x1bW5Db3VudGAgKG9wdGlvbmFsKSB7TnVtYmVyfSBudW1iZXIgb2YgY29sdW1ucyB0byBtb3ZlIChkZWZhdWx0OiAxKVxuICBtb3ZlUmlnaHQ6IChjb2x1bW5Db3VudCkgLT5cbiAgICBAbW92ZUN1cnNvcnMgKGN1cnNvcikgLT4gY3Vyc29yLm1vdmVSaWdodChjb2x1bW5Db3VudCwgbW92ZVRvRW5kT2ZTZWxlY3Rpb246IHRydWUpXG5cbiAgIyBFc3NlbnRpYWw6IE1vdmUgZXZlcnkgY3Vyc29yIHRvIHRoZSBiZWdpbm5pbmcgb2YgaXRzIGxpbmUgaW4gYnVmZmVyIGNvb3JkaW5hdGVzLlxuICBtb3ZlVG9CZWdpbm5pbmdPZkxpbmU6IC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVG9CZWdpbm5pbmdPZkxpbmUoKVxuXG4gICMgRXNzZW50aWFsOiBNb3ZlIGV2ZXJ5IGN1cnNvciB0byB0aGUgYmVnaW5uaW5nIG9mIGl0cyBsaW5lIGluIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgbW92ZVRvQmVnaW5uaW5nT2ZTY3JlZW5MaW5lOiAtPlxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3IubW92ZVRvQmVnaW5uaW5nT2ZTY3JlZW5MaW5lKClcblxuICAjIEVzc2VudGlhbDogTW92ZSBldmVyeSBjdXJzb3IgdG8gdGhlIGZpcnN0IG5vbi13aGl0ZXNwYWNlIGNoYXJhY3RlciBvZiBpdHMgbGluZS5cbiAgbW92ZVRvRmlyc3RDaGFyYWN0ZXJPZkxpbmU6IC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVG9GaXJzdENoYXJhY3Rlck9mTGluZSgpXG5cbiAgIyBFc3NlbnRpYWw6IE1vdmUgZXZlcnkgY3Vyc29yIHRvIHRoZSBlbmQgb2YgaXRzIGxpbmUgaW4gYnVmZmVyIGNvb3JkaW5hdGVzLlxuICBtb3ZlVG9FbmRPZkxpbmU6IC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVG9FbmRPZkxpbmUoKVxuXG4gICMgRXNzZW50aWFsOiBNb3ZlIGV2ZXJ5IGN1cnNvciB0byB0aGUgZW5kIG9mIGl0cyBsaW5lIGluIHNjcmVlbiBjb29yZGluYXRlcy5cbiAgbW92ZVRvRW5kT2ZTY3JlZW5MaW5lOiAtPlxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3IubW92ZVRvRW5kT2ZTY3JlZW5MaW5lKClcblxuICAjIEVzc2VudGlhbDogTW92ZSBldmVyeSBjdXJzb3IgdG8gdGhlIGJlZ2lubmluZyBvZiBpdHMgc3Vycm91bmRpbmcgd29yZC5cbiAgbW92ZVRvQmVnaW5uaW5nT2ZXb3JkOiAtPlxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3IubW92ZVRvQmVnaW5uaW5nT2ZXb3JkKClcblxuICAjIEVzc2VudGlhbDogTW92ZSBldmVyeSBjdXJzb3IgdG8gdGhlIGVuZCBvZiBpdHMgc3Vycm91bmRpbmcgd29yZC5cbiAgbW92ZVRvRW5kT2ZXb3JkOiAtPlxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3IubW92ZVRvRW5kT2ZXb3JkKClcblxuICAjIEN1cnNvciBFeHRlbmRlZFxuXG4gICMgRXh0ZW5kZWQ6IE1vdmUgZXZlcnkgY3Vyc29yIHRvIHRoZSB0b3Agb2YgdGhlIGJ1ZmZlci5cbiAgI1xuICAjIElmIHRoZXJlIGFyZSBtdWx0aXBsZSBjdXJzb3JzLCB0aGV5IHdpbGwgYmUgbWVyZ2VkIGludG8gYSBzaW5nbGUgY3Vyc29yLlxuICBtb3ZlVG9Ub3A6IC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVG9Ub3AoKVxuXG4gICMgRXh0ZW5kZWQ6IE1vdmUgZXZlcnkgY3Vyc29yIHRvIHRoZSBib3R0b20gb2YgdGhlIGJ1ZmZlci5cbiAgI1xuICAjIElmIHRoZXJlIGFyZSBtdWx0aXBsZSBjdXJzb3JzLCB0aGV5IHdpbGwgYmUgbWVyZ2VkIGludG8gYSBzaW5nbGUgY3Vyc29yLlxuICBtb3ZlVG9Cb3R0b206IC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVG9Cb3R0b20oKVxuXG4gICMgRXh0ZW5kZWQ6IE1vdmUgZXZlcnkgY3Vyc29yIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIG5leHQgd29yZC5cbiAgbW92ZVRvQmVnaW5uaW5nT2ZOZXh0V29yZDogLT5cbiAgICBAbW92ZUN1cnNvcnMgKGN1cnNvcikgLT4gY3Vyc29yLm1vdmVUb0JlZ2lubmluZ09mTmV4dFdvcmQoKVxuXG4gICMgRXh0ZW5kZWQ6IE1vdmUgZXZlcnkgY3Vyc29yIHRvIHRoZSBwcmV2aW91cyB3b3JkIGJvdW5kYXJ5LlxuICBtb3ZlVG9QcmV2aW91c1dvcmRCb3VuZGFyeTogLT5cbiAgICBAbW92ZUN1cnNvcnMgKGN1cnNvcikgLT4gY3Vyc29yLm1vdmVUb1ByZXZpb3VzV29yZEJvdW5kYXJ5KClcblxuICAjIEV4dGVuZGVkOiBNb3ZlIGV2ZXJ5IGN1cnNvciB0byB0aGUgbmV4dCB3b3JkIGJvdW5kYXJ5LlxuICBtb3ZlVG9OZXh0V29yZEJvdW5kYXJ5OiAtPlxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3IubW92ZVRvTmV4dFdvcmRCb3VuZGFyeSgpXG5cbiAgIyBFeHRlbmRlZDogTW92ZSBldmVyeSBjdXJzb3IgdG8gdGhlIHByZXZpb3VzIHN1YndvcmQgYm91bmRhcnkuXG4gIG1vdmVUb1ByZXZpb3VzU3Vid29yZEJvdW5kYXJ5OiAtPlxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3IubW92ZVRvUHJldmlvdXNTdWJ3b3JkQm91bmRhcnkoKVxuXG4gICMgRXh0ZW5kZWQ6IE1vdmUgZXZlcnkgY3Vyc29yIHRvIHRoZSBuZXh0IHN1YndvcmQgYm91bmRhcnkuXG4gIG1vdmVUb05leHRTdWJ3b3JkQm91bmRhcnk6IC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVG9OZXh0U3Vid29yZEJvdW5kYXJ5KClcblxuICAjIEV4dGVuZGVkOiBNb3ZlIGV2ZXJ5IGN1cnNvciB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBuZXh0IHBhcmFncmFwaC5cbiAgbW92ZVRvQmVnaW5uaW5nT2ZOZXh0UGFyYWdyYXBoOiAtPlxuICAgIEBtb3ZlQ3Vyc29ycyAoY3Vyc29yKSAtPiBjdXJzb3IubW92ZVRvQmVnaW5uaW5nT2ZOZXh0UGFyYWdyYXBoKClcblxuICAjIEV4dGVuZGVkOiBNb3ZlIGV2ZXJ5IGN1cnNvciB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBwcmV2aW91cyBwYXJhZ3JhcGguXG4gIG1vdmVUb0JlZ2lubmluZ09mUHJldmlvdXNQYXJhZ3JhcGg6IC0+XG4gICAgQG1vdmVDdXJzb3JzIChjdXJzb3IpIC0+IGN1cnNvci5tb3ZlVG9CZWdpbm5pbmdPZlByZXZpb3VzUGFyYWdyYXBoKClcblxuICAjIEV4dGVuZGVkOiBSZXR1cm5zIHRoZSBtb3N0IHJlY2VudGx5IGFkZGVkIHtDdXJzb3J9XG4gIGdldExhc3RDdXJzb3I6IC0+XG4gICAgQGNyZWF0ZUxhc3RTZWxlY3Rpb25JZk5lZWRlZCgpXG4gICAgXy5sYXN0KEBjdXJzb3JzKVxuXG4gICMgRXh0ZW5kZWQ6IFJldHVybnMgdGhlIHdvcmQgc3Vycm91bmRpbmcgdGhlIG1vc3QgcmVjZW50bHkgYWRkZWQgY3Vyc29yLlxuICAjXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSBTZWUge0N1cnNvcjo6Z2V0QmVnaW5uaW5nT2ZDdXJyZW50V29yZEJ1ZmZlclBvc2l0aW9ufS5cbiAgZ2V0V29yZFVuZGVyQ3Vyc29yOiAob3B0aW9ucykgLT5cbiAgICBAZ2V0VGV4dEluQnVmZmVyUmFuZ2UoQGdldExhc3RDdXJzb3IoKS5nZXRDdXJyZW50V29yZEJ1ZmZlclJhbmdlKG9wdGlvbnMpKVxuXG4gICMgRXh0ZW5kZWQ6IEdldCBhbiBBcnJheSBvZiBhbGwge0N1cnNvcn1zLlxuICBnZXRDdXJzb3JzOiAtPlxuICAgIEBjcmVhdGVMYXN0U2VsZWN0aW9uSWZOZWVkZWQoKVxuICAgIEBjdXJzb3JzLnNsaWNlKClcblxuICAjIEV4dGVuZGVkOiBHZXQgYWxsIHtDdXJzb3JzfXMsIG9yZGVyZWQgYnkgdGhlaXIgcG9zaXRpb24gaW4gdGhlIGJ1ZmZlclxuICAjIGluc3RlYWQgb2YgdGhlIG9yZGVyIGluIHdoaWNoIHRoZXkgd2VyZSBhZGRlZC5cbiAgI1xuICAjIFJldHVybnMgYW4ge0FycmF5fSBvZiB7U2VsZWN0aW9ufXMuXG4gIGdldEN1cnNvcnNPcmRlcmVkQnlCdWZmZXJQb3NpdGlvbjogLT5cbiAgICBAZ2V0Q3Vyc29ycygpLnNvcnQgKGEsIGIpIC0+IGEuY29tcGFyZShiKVxuXG4gIGN1cnNvcnNGb3JTY3JlZW5Sb3dSYW5nZTogKHN0YXJ0U2NyZWVuUm93LCBlbmRTY3JlZW5Sb3cpIC0+XG4gICAgY3Vyc29ycyA9IFtdXG4gICAgZm9yIG1hcmtlciBpbiBAc2VsZWN0aW9uc01hcmtlckxheWVyLmZpbmRNYXJrZXJzKGludGVyc2VjdHNTY3JlZW5Sb3dSYW5nZTogW3N0YXJ0U2NyZWVuUm93LCBlbmRTY3JlZW5Sb3ddKVxuICAgICAgaWYgY3Vyc29yID0gQGN1cnNvcnNCeU1hcmtlcklkLmdldChtYXJrZXIuaWQpXG4gICAgICAgIGN1cnNvcnMucHVzaChjdXJzb3IpXG4gICAgY3Vyc29yc1xuXG4gICMgQWRkIGEgY3Vyc29yIGJhc2VkIG9uIHRoZSBnaXZlbiB7RGlzcGxheU1hcmtlcn0uXG4gIGFkZEN1cnNvcjogKG1hcmtlcikgLT5cbiAgICBjdXJzb3IgPSBuZXcgQ3Vyc29yKGVkaXRvcjogdGhpcywgbWFya2VyOiBtYXJrZXIsIHNob3dDdXJzb3JPblNlbGVjdGlvbjogQHNob3dDdXJzb3JPblNlbGVjdGlvbilcbiAgICBAY3Vyc29ycy5wdXNoKGN1cnNvcilcbiAgICBAY3Vyc29yc0J5TWFya2VySWQuc2V0KG1hcmtlci5pZCwgY3Vyc29yKVxuICAgIEBkZWNvcmF0ZU1hcmtlcihtYXJrZXIsIHR5cGU6ICdsaW5lLW51bWJlcicsIGNsYXNzOiAnY3Vyc29yLWxpbmUnKVxuICAgIEBkZWNvcmF0ZU1hcmtlcihtYXJrZXIsIHR5cGU6ICdsaW5lLW51bWJlcicsIGNsYXNzOiAnY3Vyc29yLWxpbmUtbm8tc2VsZWN0aW9uJywgb25seUhlYWQ6IHRydWUsIG9ubHlFbXB0eTogdHJ1ZSlcbiAgICBAZGVjb3JhdGVNYXJrZXIobWFya2VyLCB0eXBlOiAnbGluZScsIGNsYXNzOiAnY3Vyc29yLWxpbmUnLCBvbmx5RW1wdHk6IHRydWUpXG4gICAgY3Vyc29yXG5cbiAgbW92ZUN1cnNvcnM6IChmbikgLT5cbiAgICBmbihjdXJzb3IpIGZvciBjdXJzb3IgaW4gQGdldEN1cnNvcnMoKVxuICAgIEBtZXJnZUN1cnNvcnMoKVxuXG4gIGN1cnNvck1vdmVkOiAoZXZlbnQpIC0+XG4gICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWNoYW5nZS1jdXJzb3ItcG9zaXRpb24nLCBldmVudFxuXG4gICMgTWVyZ2UgY3Vyc29ycyB0aGF0IGhhdmUgdGhlIHNhbWUgc2NyZWVuIHBvc2l0aW9uXG4gIG1lcmdlQ3Vyc29yczogLT5cbiAgICBwb3NpdGlvbnMgPSB7fVxuICAgIGZvciBjdXJzb3IgaW4gQGdldEN1cnNvcnMoKVxuICAgICAgcG9zaXRpb24gPSBjdXJzb3IuZ2V0QnVmZmVyUG9zaXRpb24oKS50b1N0cmluZygpXG4gICAgICBpZiBwb3NpdGlvbnMuaGFzT3duUHJvcGVydHkocG9zaXRpb24pXG4gICAgICAgIGN1cnNvci5kZXN0cm95KClcbiAgICAgIGVsc2VcbiAgICAgICAgcG9zaXRpb25zW3Bvc2l0aW9uXSA9IHRydWVcbiAgICByZXR1cm5cblxuICBwcmVzZXJ2ZUN1cnNvclBvc2l0aW9uT25CdWZmZXJSZWxvYWQ6IC0+XG4gICAgY3Vyc29yUG9zaXRpb24gPSBudWxsXG4gICAgQGRpc3Bvc2FibGVzLmFkZCBAYnVmZmVyLm9uV2lsbFJlbG9hZCA9PlxuICAgICAgY3Vyc29yUG9zaXRpb24gPSBAZ2V0Q3Vyc29yQnVmZmVyUG9zaXRpb24oKVxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQGJ1ZmZlci5vbkRpZFJlbG9hZCA9PlxuICAgICAgQHNldEN1cnNvckJ1ZmZlclBvc2l0aW9uKGN1cnNvclBvc2l0aW9uKSBpZiBjdXJzb3JQb3NpdGlvblxuICAgICAgY3Vyc29yUG9zaXRpb24gPSBudWxsXG5cbiAgIyMjXG4gIFNlY3Rpb246IFNlbGVjdGlvbnNcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUgc2VsZWN0ZWQgdGV4dCBvZiB0aGUgbW9zdCByZWNlbnRseSBhZGRlZCBzZWxlY3Rpb24uXG4gICNcbiAgIyBSZXR1cm5zIGEge1N0cmluZ30uXG4gIGdldFNlbGVjdGVkVGV4dDogLT5cbiAgICBAZ2V0TGFzdFNlbGVjdGlvbigpLmdldFRleHQoKVxuXG4gICMgRXNzZW50aWFsOiBHZXQgdGhlIHtSYW5nZX0gb2YgdGhlIG1vc3QgcmVjZW50bHkgYWRkZWQgc2VsZWN0aW9uIGluIGJ1ZmZlclxuICAjIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgUmV0dXJucyBhIHtSYW5nZX0uXG4gIGdldFNlbGVjdGVkQnVmZmVyUmFuZ2U6IC0+XG4gICAgQGdldExhc3RTZWxlY3Rpb24oKS5nZXRCdWZmZXJSYW5nZSgpXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUge1JhbmdlfXMgb2YgYWxsIHNlbGVjdGlvbnMgaW4gYnVmZmVyIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgVGhlIHJhbmdlcyBhcmUgc29ydGVkIGJ5IHdoZW4gdGhlIHNlbGVjdGlvbnMgd2VyZSBhZGRlZC4gTW9zdCByZWNlbnQgYXQgdGhlIGVuZC5cbiAgI1xuICAjIFJldHVybnMgYW4ge0FycmF5fSBvZiB7UmFuZ2V9cy5cbiAgZ2V0U2VsZWN0ZWRCdWZmZXJSYW5nZXM6IC0+XG4gICAgc2VsZWN0aW9uLmdldEJ1ZmZlclJhbmdlKCkgZm9yIHNlbGVjdGlvbiBpbiBAZ2V0U2VsZWN0aW9ucygpXG5cbiAgIyBFc3NlbnRpYWw6IFNldCB0aGUgc2VsZWN0ZWQgcmFuZ2UgaW4gYnVmZmVyIGNvb3JkaW5hdGVzLiBJZiB0aGVyZSBhcmUgbXVsdGlwbGVcbiAgIyBzZWxlY3Rpb25zLCB0aGV5IGFyZSByZWR1Y2VkIHRvIGEgc2luZ2xlIHNlbGVjdGlvbiB3aXRoIHRoZSBnaXZlbiByYW5nZS5cbiAgI1xuICAjICogYGJ1ZmZlclJhbmdlYCBBIHtSYW5nZX0gb3IgcmFuZ2UtY29tcGF0aWJsZSB7QXJyYXl9LlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgQW4gb3B0aW9ucyB7T2JqZWN0fTpcbiAgIyAgICogYHJldmVyc2VkYCBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gY3JlYXRlIHRoZSBzZWxlY3Rpb24gaW4gYVxuICAjICAgICByZXZlcnNlZCBvcmllbnRhdGlvbi5cbiAgIyAgICogYHByZXNlcnZlRm9sZHNgIEEge0Jvb2xlYW59LCB3aGljaCBpZiBgdHJ1ZWAgcHJlc2VydmVzIHRoZSBmb2xkIHNldHRpbmdzIGFmdGVyIHRoZVxuICAjICAgICBzZWxlY3Rpb24gaXMgc2V0LlxuICBzZXRTZWxlY3RlZEJ1ZmZlclJhbmdlOiAoYnVmZmVyUmFuZ2UsIG9wdGlvbnMpIC0+XG4gICAgQHNldFNlbGVjdGVkQnVmZmVyUmFuZ2VzKFtidWZmZXJSYW5nZV0sIG9wdGlvbnMpXG5cbiAgIyBFc3NlbnRpYWw6IFNldCB0aGUgc2VsZWN0ZWQgcmFuZ2VzIGluIGJ1ZmZlciBjb29yZGluYXRlcy4gSWYgdGhlcmUgYXJlIG11bHRpcGxlXG4gICMgc2VsZWN0aW9ucywgdGhleSBhcmUgcmVwbGFjZWQgYnkgbmV3IHNlbGVjdGlvbnMgd2l0aCB0aGUgZ2l2ZW4gcmFuZ2VzLlxuICAjXG4gICMgKiBgYnVmZmVyUmFuZ2VzYCBBbiB7QXJyYXl9IG9mIHtSYW5nZX1zIG9yIHJhbmdlLWNvbXBhdGlibGUge0FycmF5fXMuXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSBBbiBvcHRpb25zIHtPYmplY3R9OlxuICAjICAgKiBgcmV2ZXJzZWRgIEEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0byBjcmVhdGUgdGhlIHNlbGVjdGlvbiBpbiBhXG4gICMgICAgIHJldmVyc2VkIG9yaWVudGF0aW9uLlxuICAjICAgKiBgcHJlc2VydmVGb2xkc2AgQSB7Qm9vbGVhbn0sIHdoaWNoIGlmIGB0cnVlYCBwcmVzZXJ2ZXMgdGhlIGZvbGQgc2V0dGluZ3MgYWZ0ZXIgdGhlXG4gICMgICAgIHNlbGVjdGlvbiBpcyBzZXQuXG4gIHNldFNlbGVjdGVkQnVmZmVyUmFuZ2VzOiAoYnVmZmVyUmFuZ2VzLCBvcHRpb25zPXt9KSAtPlxuICAgIHRocm93IG5ldyBFcnJvcihcIlBhc3NlZCBhbiBlbXB0eSBhcnJheSB0byBzZXRTZWxlY3RlZEJ1ZmZlclJhbmdlc1wiKSB1bmxlc3MgYnVmZmVyUmFuZ2VzLmxlbmd0aFxuXG4gICAgc2VsZWN0aW9ucyA9IEBnZXRTZWxlY3Rpb25zKClcbiAgICBzZWxlY3Rpb24uZGVzdHJveSgpIGZvciBzZWxlY3Rpb24gaW4gc2VsZWN0aW9uc1tidWZmZXJSYW5nZXMubGVuZ3RoLi4uXVxuXG4gICAgQG1lcmdlSW50ZXJzZWN0aW5nU2VsZWN0aW9ucyBvcHRpb25zLCA9PlxuICAgICAgZm9yIGJ1ZmZlclJhbmdlLCBpIGluIGJ1ZmZlclJhbmdlc1xuICAgICAgICBidWZmZXJSYW5nZSA9IFJhbmdlLmZyb21PYmplY3QoYnVmZmVyUmFuZ2UpXG4gICAgICAgIGlmIHNlbGVjdGlvbnNbaV1cbiAgICAgICAgICBzZWxlY3Rpb25zW2ldLnNldEJ1ZmZlclJhbmdlKGJ1ZmZlclJhbmdlLCBvcHRpb25zKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgQGFkZFNlbGVjdGlvbkZvckJ1ZmZlclJhbmdlKGJ1ZmZlclJhbmdlLCBvcHRpb25zKVxuICAgICAgcmV0dXJuXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUge1JhbmdlfSBvZiB0aGUgbW9zdCByZWNlbnRseSBhZGRlZCBzZWxlY3Rpb24gaW4gc2NyZWVuXG4gICMgY29vcmRpbmF0ZXMuXG4gICNcbiAgIyBSZXR1cm5zIGEge1JhbmdlfS5cbiAgZ2V0U2VsZWN0ZWRTY3JlZW5SYW5nZTogLT5cbiAgICBAZ2V0TGFzdFNlbGVjdGlvbigpLmdldFNjcmVlblJhbmdlKClcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSB7UmFuZ2V9cyBvZiBhbGwgc2VsZWN0aW9ucyBpbiBzY3JlZW4gY29vcmRpbmF0ZXMuXG4gICNcbiAgIyBUaGUgcmFuZ2VzIGFyZSBzb3J0ZWQgYnkgd2hlbiB0aGUgc2VsZWN0aW9ucyB3ZXJlIGFkZGVkLiBNb3N0IHJlY2VudCBhdCB0aGUgZW5kLlxuICAjXG4gICMgUmV0dXJucyBhbiB7QXJyYXl9IG9mIHtSYW5nZX1zLlxuICBnZXRTZWxlY3RlZFNjcmVlblJhbmdlczogLT5cbiAgICBzZWxlY3Rpb24uZ2V0U2NyZWVuUmFuZ2UoKSBmb3Igc2VsZWN0aW9uIGluIEBnZXRTZWxlY3Rpb25zKClcblxuICAjIEVzc2VudGlhbDogU2V0IHRoZSBzZWxlY3RlZCByYW5nZSBpbiBzY3JlZW4gY29vcmRpbmF0ZXMuIElmIHRoZXJlIGFyZSBtdWx0aXBsZVxuICAjIHNlbGVjdGlvbnMsIHRoZXkgYXJlIHJlZHVjZWQgdG8gYSBzaW5nbGUgc2VsZWN0aW9uIHdpdGggdGhlIGdpdmVuIHJhbmdlLlxuICAjXG4gICMgKiBgc2NyZWVuUmFuZ2VgIEEge1JhbmdlfSBvciByYW5nZS1jb21wYXRpYmxlIHtBcnJheX0uXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSBBbiBvcHRpb25zIHtPYmplY3R9OlxuICAjICAgKiBgcmV2ZXJzZWRgIEEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0byBjcmVhdGUgdGhlIHNlbGVjdGlvbiBpbiBhXG4gICMgICAgIHJldmVyc2VkIG9yaWVudGF0aW9uLlxuICBzZXRTZWxlY3RlZFNjcmVlblJhbmdlOiAoc2NyZWVuUmFuZ2UsIG9wdGlvbnMpIC0+XG4gICAgQHNldFNlbGVjdGVkQnVmZmVyUmFuZ2UoQGJ1ZmZlclJhbmdlRm9yU2NyZWVuUmFuZ2Uoc2NyZWVuUmFuZ2UsIG9wdGlvbnMpLCBvcHRpb25zKVxuXG4gICMgRXNzZW50aWFsOiBTZXQgdGhlIHNlbGVjdGVkIHJhbmdlcyBpbiBzY3JlZW4gY29vcmRpbmF0ZXMuIElmIHRoZXJlIGFyZSBtdWx0aXBsZVxuICAjIHNlbGVjdGlvbnMsIHRoZXkgYXJlIHJlcGxhY2VkIGJ5IG5ldyBzZWxlY3Rpb25zIHdpdGggdGhlIGdpdmVuIHJhbmdlcy5cbiAgI1xuICAjICogYHNjcmVlblJhbmdlc2AgQW4ge0FycmF5fSBvZiB7UmFuZ2V9cyBvciByYW5nZS1jb21wYXRpYmxlIHtBcnJheX1zLlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgQW4gb3B0aW9ucyB7T2JqZWN0fTpcbiAgIyAgICogYHJldmVyc2VkYCBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gY3JlYXRlIHRoZSBzZWxlY3Rpb24gaW4gYVxuICAjICAgICByZXZlcnNlZCBvcmllbnRhdGlvbi5cbiAgc2V0U2VsZWN0ZWRTY3JlZW5SYW5nZXM6IChzY3JlZW5SYW5nZXMsIG9wdGlvbnM9e30pIC0+XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiUGFzc2VkIGFuIGVtcHR5IGFycmF5IHRvIHNldFNlbGVjdGVkU2NyZWVuUmFuZ2VzXCIpIHVubGVzcyBzY3JlZW5SYW5nZXMubGVuZ3RoXG5cbiAgICBzZWxlY3Rpb25zID0gQGdldFNlbGVjdGlvbnMoKVxuICAgIHNlbGVjdGlvbi5kZXN0cm95KCkgZm9yIHNlbGVjdGlvbiBpbiBzZWxlY3Rpb25zW3NjcmVlblJhbmdlcy5sZW5ndGguLi5dXG5cbiAgICBAbWVyZ2VJbnRlcnNlY3RpbmdTZWxlY3Rpb25zIG9wdGlvbnMsID0+XG4gICAgICBmb3Igc2NyZWVuUmFuZ2UsIGkgaW4gc2NyZWVuUmFuZ2VzXG4gICAgICAgIHNjcmVlblJhbmdlID0gUmFuZ2UuZnJvbU9iamVjdChzY3JlZW5SYW5nZSlcbiAgICAgICAgaWYgc2VsZWN0aW9uc1tpXVxuICAgICAgICAgIHNlbGVjdGlvbnNbaV0uc2V0U2NyZWVuUmFuZ2Uoc2NyZWVuUmFuZ2UsIG9wdGlvbnMpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAYWRkU2VsZWN0aW9uRm9yU2NyZWVuUmFuZ2Uoc2NyZWVuUmFuZ2UsIG9wdGlvbnMpXG4gICAgICByZXR1cm5cblxuICAjIEVzc2VudGlhbDogQWRkIGEgc2VsZWN0aW9uIGZvciB0aGUgZ2l2ZW4gcmFuZ2UgaW4gYnVmZmVyIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgKiBgYnVmZmVyUmFuZ2VgIEEge1JhbmdlfVxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgQW4gb3B0aW9ucyB7T2JqZWN0fTpcbiAgIyAgICogYHJldmVyc2VkYCBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gY3JlYXRlIHRoZSBzZWxlY3Rpb24gaW4gYVxuICAjICAgICByZXZlcnNlZCBvcmllbnRhdGlvbi5cbiAgIyAgICogYHByZXNlcnZlRm9sZHNgIEEge0Jvb2xlYW59LCB3aGljaCBpZiBgdHJ1ZWAgcHJlc2VydmVzIHRoZSBmb2xkIHNldHRpbmdzIGFmdGVyIHRoZVxuICAjICAgICBzZWxlY3Rpb24gaXMgc2V0LlxuICAjXG4gICMgUmV0dXJucyB0aGUgYWRkZWQge1NlbGVjdGlvbn0uXG4gIGFkZFNlbGVjdGlvbkZvckJ1ZmZlclJhbmdlOiAoYnVmZmVyUmFuZ2UsIG9wdGlvbnM9e30pIC0+XG4gICAgdW5sZXNzIG9wdGlvbnMucHJlc2VydmVGb2xkc1xuICAgICAgQGRlc3Ryb3lGb2xkc0ludGVyc2VjdGluZ0J1ZmZlclJhbmdlKGJ1ZmZlclJhbmdlKVxuICAgIEBzZWxlY3Rpb25zTWFya2VyTGF5ZXIubWFya0J1ZmZlclJhbmdlKGJ1ZmZlclJhbmdlLCB7aW52YWxpZGF0ZTogJ25ldmVyJywgcmV2ZXJzZWQ6IG9wdGlvbnMucmV2ZXJzZWQgPyBmYWxzZX0pXG4gICAgQGdldExhc3RTZWxlY3Rpb24oKS5hdXRvc2Nyb2xsKCkgdW5sZXNzIG9wdGlvbnMuYXV0b3Njcm9sbCBpcyBmYWxzZVxuICAgIEBnZXRMYXN0U2VsZWN0aW9uKClcblxuICAjIEVzc2VudGlhbDogQWRkIGEgc2VsZWN0aW9uIGZvciB0aGUgZ2l2ZW4gcmFuZ2UgaW4gc2NyZWVuIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgKiBgc2NyZWVuUmFuZ2VgIEEge1JhbmdlfVxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgQW4gb3B0aW9ucyB7T2JqZWN0fTpcbiAgIyAgICogYHJldmVyc2VkYCBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gY3JlYXRlIHRoZSBzZWxlY3Rpb24gaW4gYVxuICAjICAgICByZXZlcnNlZCBvcmllbnRhdGlvbi5cbiAgIyAgICogYHByZXNlcnZlRm9sZHNgIEEge0Jvb2xlYW59LCB3aGljaCBpZiBgdHJ1ZWAgcHJlc2VydmVzIHRoZSBmb2xkIHNldHRpbmdzIGFmdGVyIHRoZVxuICAjICAgICBzZWxlY3Rpb24gaXMgc2V0LlxuICAjIFJldHVybnMgdGhlIGFkZGVkIHtTZWxlY3Rpb259LlxuICBhZGRTZWxlY3Rpb25Gb3JTY3JlZW5SYW5nZTogKHNjcmVlblJhbmdlLCBvcHRpb25zPXt9KSAtPlxuICAgIEBhZGRTZWxlY3Rpb25Gb3JCdWZmZXJSYW5nZShAYnVmZmVyUmFuZ2VGb3JTY3JlZW5SYW5nZShzY3JlZW5SYW5nZSksIG9wdGlvbnMpXG5cbiAgIyBFc3NlbnRpYWw6IFNlbGVjdCBmcm9tIHRoZSBjdXJyZW50IGN1cnNvciBwb3NpdGlvbiB0byB0aGUgZ2l2ZW4gcG9zaXRpb24gaW5cbiAgIyBidWZmZXIgY29vcmRpbmF0ZXMuXG4gICNcbiAgIyBUaGlzIG1ldGhvZCBtYXkgbWVyZ2Ugc2VsZWN0aW9ucyB0aGF0IGVuZCB1cCBpbnRlc2VjdGluZy5cbiAgI1xuICAjICogYHBvc2l0aW9uYCBBbiBpbnN0YW5jZSBvZiB7UG9pbnR9LCB3aXRoIGEgZ2l2ZW4gYHJvd2AgYW5kIGBjb2x1bW5gLlxuICBzZWxlY3RUb0J1ZmZlclBvc2l0aW9uOiAocG9zaXRpb24pIC0+XG4gICAgbGFzdFNlbGVjdGlvbiA9IEBnZXRMYXN0U2VsZWN0aW9uKClcbiAgICBsYXN0U2VsZWN0aW9uLnNlbGVjdFRvQnVmZmVyUG9zaXRpb24ocG9zaXRpb24pXG4gICAgQG1lcmdlSW50ZXJzZWN0aW5nU2VsZWN0aW9ucyhyZXZlcnNlZDogbGFzdFNlbGVjdGlvbi5pc1JldmVyc2VkKCkpXG5cbiAgIyBFc3NlbnRpYWw6IFNlbGVjdCBmcm9tIHRoZSBjdXJyZW50IGN1cnNvciBwb3NpdGlvbiB0byB0aGUgZ2l2ZW4gcG9zaXRpb24gaW5cbiAgIyBzY3JlZW4gY29vcmRpbmF0ZXMuXG4gICNcbiAgIyBUaGlzIG1ldGhvZCBtYXkgbWVyZ2Ugc2VsZWN0aW9ucyB0aGF0IGVuZCB1cCBpbnRlc2VjdGluZy5cbiAgI1xuICAjICogYHBvc2l0aW9uYCBBbiBpbnN0YW5jZSBvZiB7UG9pbnR9LCB3aXRoIGEgZ2l2ZW4gYHJvd2AgYW5kIGBjb2x1bW5gLlxuICBzZWxlY3RUb1NjcmVlblBvc2l0aW9uOiAocG9zaXRpb24sIG9wdGlvbnMpIC0+XG4gICAgbGFzdFNlbGVjdGlvbiA9IEBnZXRMYXN0U2VsZWN0aW9uKClcbiAgICBsYXN0U2VsZWN0aW9uLnNlbGVjdFRvU2NyZWVuUG9zaXRpb24ocG9zaXRpb24sIG9wdGlvbnMpXG4gICAgdW5sZXNzIG9wdGlvbnM/LnN1cHByZXNzU2VsZWN0aW9uTWVyZ2VcbiAgICAgIEBtZXJnZUludGVyc2VjdGluZ1NlbGVjdGlvbnMocmV2ZXJzZWQ6IGxhc3RTZWxlY3Rpb24uaXNSZXZlcnNlZCgpKVxuXG4gICMgRXNzZW50aWFsOiBNb3ZlIHRoZSBjdXJzb3Igb2YgZWFjaCBzZWxlY3Rpb24gb25lIGNoYXJhY3RlciB1cHdhcmQgd2hpbGVcbiAgIyBwcmVzZXJ2aW5nIHRoZSBzZWxlY3Rpb24ncyB0YWlsIHBvc2l0aW9uLlxuICAjXG4gICMgKiBgcm93Q291bnRgIChvcHRpb25hbCkge051bWJlcn0gbnVtYmVyIG9mIHJvd3MgdG8gc2VsZWN0IChkZWZhdWx0OiAxKVxuICAjXG4gICMgVGhpcyBtZXRob2QgbWF5IG1lcmdlIHNlbGVjdGlvbnMgdGhhdCBlbmQgdXAgaW50ZXNlY3RpbmcuXG4gIHNlbGVjdFVwOiAocm93Q291bnQpIC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNCYWNrd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uc2VsZWN0VXAocm93Q291bnQpXG5cbiAgIyBFc3NlbnRpYWw6IE1vdmUgdGhlIGN1cnNvciBvZiBlYWNoIHNlbGVjdGlvbiBvbmUgY2hhcmFjdGVyIGRvd253YXJkIHdoaWxlXG4gICMgcHJlc2VydmluZyB0aGUgc2VsZWN0aW9uJ3MgdGFpbCBwb3NpdGlvbi5cbiAgI1xuICAjICogYHJvd0NvdW50YCAob3B0aW9uYWwpIHtOdW1iZXJ9IG51bWJlciBvZiByb3dzIHRvIHNlbGVjdCAoZGVmYXVsdDogMSlcbiAgI1xuICAjIFRoaXMgbWV0aG9kIG1heSBtZXJnZSBzZWxlY3Rpb25zIHRoYXQgZW5kIHVwIGludGVzZWN0aW5nLlxuICBzZWxlY3REb3duOiAocm93Q291bnQpIC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNGb3J3YXJkIChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5zZWxlY3REb3duKHJvd0NvdW50KVxuXG4gICMgRXNzZW50aWFsOiBNb3ZlIHRoZSBjdXJzb3Igb2YgZWFjaCBzZWxlY3Rpb24gb25lIGNoYXJhY3RlciBsZWZ0d2FyZCB3aGlsZVxuICAjIHByZXNlcnZpbmcgdGhlIHNlbGVjdGlvbidzIHRhaWwgcG9zaXRpb24uXG4gICNcbiAgIyAqIGBjb2x1bW5Db3VudGAgKG9wdGlvbmFsKSB7TnVtYmVyfSBudW1iZXIgb2YgY29sdW1ucyB0byBzZWxlY3QgKGRlZmF1bHQ6IDEpXG4gICNcbiAgIyBUaGlzIG1ldGhvZCBtYXkgbWVyZ2Ugc2VsZWN0aW9ucyB0aGF0IGVuZCB1cCBpbnRlc2VjdGluZy5cbiAgc2VsZWN0TGVmdDogKGNvbHVtbkNvdW50KSAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zQmFja3dhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdExlZnQoY29sdW1uQ291bnQpXG5cbiAgIyBFc3NlbnRpYWw6IE1vdmUgdGhlIGN1cnNvciBvZiBlYWNoIHNlbGVjdGlvbiBvbmUgY2hhcmFjdGVyIHJpZ2h0d2FyZCB3aGlsZVxuICAjIHByZXNlcnZpbmcgdGhlIHNlbGVjdGlvbidzIHRhaWwgcG9zaXRpb24uXG4gICNcbiAgIyAqIGBjb2x1bW5Db3VudGAgKG9wdGlvbmFsKSB7TnVtYmVyfSBudW1iZXIgb2YgY29sdW1ucyB0byBzZWxlY3QgKGRlZmF1bHQ6IDEpXG4gICNcbiAgIyBUaGlzIG1ldGhvZCBtYXkgbWVyZ2Ugc2VsZWN0aW9ucyB0aGF0IGVuZCB1cCBpbnRlc2VjdGluZy5cbiAgc2VsZWN0UmlnaHQ6IChjb2x1bW5Db3VudCkgLT5cbiAgICBAZXhwYW5kU2VsZWN0aW9uc0ZvcndhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFJpZ2h0KGNvbHVtbkNvdW50KVxuXG4gICMgRXNzZW50aWFsOiBTZWxlY3QgZnJvbSB0aGUgdG9wIG9mIHRoZSBidWZmZXIgdG8gdGhlIGVuZCBvZiB0aGUgbGFzdCBzZWxlY3Rpb25cbiAgIyBpbiB0aGUgYnVmZmVyLlxuICAjXG4gICMgVGhpcyBtZXRob2QgbWVyZ2VzIG11bHRpcGxlIHNlbGVjdGlvbnMgaW50byBhIHNpbmdsZSBzZWxlY3Rpb24uXG4gIHNlbGVjdFRvVG9wOiAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zQmFja3dhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFRvVG9wKClcblxuICAjIEVzc2VudGlhbDogU2VsZWN0cyBmcm9tIHRoZSB0b3Agb2YgdGhlIGZpcnN0IHNlbGVjdGlvbiBpbiB0aGUgYnVmZmVyIHRvIHRoZSBlbmRcbiAgIyBvZiB0aGUgYnVmZmVyLlxuICAjXG4gICMgVGhpcyBtZXRob2QgbWVyZ2VzIG11bHRpcGxlIHNlbGVjdGlvbnMgaW50byBhIHNpbmdsZSBzZWxlY3Rpb24uXG4gIHNlbGVjdFRvQm90dG9tOiAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zRm9yd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uc2VsZWN0VG9Cb3R0b20oKVxuXG4gICMgRXNzZW50aWFsOiBTZWxlY3QgYWxsIHRleHQgaW4gdGhlIGJ1ZmZlci5cbiAgI1xuICAjIFRoaXMgbWV0aG9kIG1lcmdlcyBtdWx0aXBsZSBzZWxlY3Rpb25zIGludG8gYSBzaW5nbGUgc2VsZWN0aW9uLlxuICBzZWxlY3RBbGw6IC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNGb3J3YXJkIChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5zZWxlY3RBbGwoKVxuXG4gICMgRXNzZW50aWFsOiBNb3ZlIHRoZSBjdXJzb3Igb2YgZWFjaCBzZWxlY3Rpb24gdG8gdGhlIGJlZ2lubmluZyBvZiBpdHMgbGluZVxuICAjIHdoaWxlIHByZXNlcnZpbmcgdGhlIHNlbGVjdGlvbidzIHRhaWwgcG9zaXRpb24uXG4gICNcbiAgIyBUaGlzIG1ldGhvZCBtYXkgbWVyZ2Ugc2VsZWN0aW9ucyB0aGF0IGVuZCB1cCBpbnRlc2VjdGluZy5cbiAgc2VsZWN0VG9CZWdpbm5pbmdPZkxpbmU6IC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNCYWNrd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uc2VsZWN0VG9CZWdpbm5pbmdPZkxpbmUoKVxuXG4gICMgRXNzZW50aWFsOiBNb3ZlIHRoZSBjdXJzb3Igb2YgZWFjaCBzZWxlY3Rpb24gdG8gdGhlIGZpcnN0IG5vbi13aGl0ZXNwYWNlXG4gICMgY2hhcmFjdGVyIG9mIGl0cyBsaW5lIHdoaWxlIHByZXNlcnZpbmcgdGhlIHNlbGVjdGlvbidzIHRhaWwgcG9zaXRpb24uIElmIHRoZVxuICAjIGN1cnNvciBpcyBhbHJlYWR5IG9uIHRoZSBmaXJzdCBjaGFyYWN0ZXIgb2YgdGhlIGxpbmUsIG1vdmUgaXQgdG8gdGhlXG4gICMgYmVnaW5uaW5nIG9mIHRoZSBsaW5lLlxuICAjXG4gICMgVGhpcyBtZXRob2QgbWF5IG1lcmdlIHNlbGVjdGlvbnMgdGhhdCBlbmQgdXAgaW50ZXJzZWN0aW5nLlxuICBzZWxlY3RUb0ZpcnN0Q2hhcmFjdGVyT2ZMaW5lOiAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zQmFja3dhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFRvRmlyc3RDaGFyYWN0ZXJPZkxpbmUoKVxuXG4gICMgRXNzZW50aWFsOiBNb3ZlIHRoZSBjdXJzb3Igb2YgZWFjaCBzZWxlY3Rpb24gdG8gdGhlIGVuZCBvZiBpdHMgbGluZSB3aGlsZVxuICAjIHByZXNlcnZpbmcgdGhlIHNlbGVjdGlvbidzIHRhaWwgcG9zaXRpb24uXG4gICNcbiAgIyBUaGlzIG1ldGhvZCBtYXkgbWVyZ2Ugc2VsZWN0aW9ucyB0aGF0IGVuZCB1cCBpbnRlcnNlY3RpbmcuXG4gIHNlbGVjdFRvRW5kT2ZMaW5lOiAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zRm9yd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uc2VsZWN0VG9FbmRPZkxpbmUoKVxuXG4gICMgRXNzZW50aWFsOiBFeHBhbmQgc2VsZWN0aW9ucyB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZWlyIGNvbnRhaW5pbmcgd29yZC5cbiAgI1xuICAjIE9wZXJhdGVzIG9uIGFsbCBzZWxlY3Rpb25zLiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlXG4gICMgY29udGFpbmluZyB3b3JkIHdoaWxlIHByZXNlcnZpbmcgdGhlIHNlbGVjdGlvbidzIHRhaWwgcG9zaXRpb24uXG4gIHNlbGVjdFRvQmVnaW5uaW5nT2ZXb3JkOiAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zQmFja3dhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFRvQmVnaW5uaW5nT2ZXb3JkKClcblxuICAjIEVzc2VudGlhbDogRXhwYW5kIHNlbGVjdGlvbnMgdG8gdGhlIGVuZCBvZiB0aGVpciBjb250YWluaW5nIHdvcmQuXG4gICNcbiAgIyBPcGVyYXRlcyBvbiBhbGwgc2VsZWN0aW9ucy4gTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgZW5kIG9mIHRoZSBjb250YWluaW5nXG4gICMgd29yZCB3aGlsZSBwcmVzZXJ2aW5nIHRoZSBzZWxlY3Rpb24ncyB0YWlsIHBvc2l0aW9uLlxuICBzZWxlY3RUb0VuZE9mV29yZDogLT5cbiAgICBAZXhwYW5kU2VsZWN0aW9uc0ZvcndhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFRvRW5kT2ZXb3JkKClcblxuICAjIEV4dGVuZGVkOiBGb3IgZWFjaCBzZWxlY3Rpb24sIG1vdmUgaXRzIGN1cnNvciB0byB0aGUgcHJlY2VkaW5nIHN1YndvcmRcbiAgIyBib3VuZGFyeSB3aGlsZSBtYWludGFpbmluZyB0aGUgc2VsZWN0aW9uJ3MgdGFpbCBwb3NpdGlvbi5cbiAgI1xuICAjIFRoaXMgbWV0aG9kIG1heSBtZXJnZSBzZWxlY3Rpb25zIHRoYXQgZW5kIHVwIGludGVyc2VjdGluZy5cbiAgc2VsZWN0VG9QcmV2aW91c1N1YndvcmRCb3VuZGFyeTogLT5cbiAgICBAZXhwYW5kU2VsZWN0aW9uc0JhY2t3YXJkIChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5zZWxlY3RUb1ByZXZpb3VzU3Vid29yZEJvdW5kYXJ5KClcblxuICAjIEV4dGVuZGVkOiBGb3IgZWFjaCBzZWxlY3Rpb24sIG1vdmUgaXRzIGN1cnNvciB0byB0aGUgbmV4dCBzdWJ3b3JkIGJvdW5kYXJ5XG4gICMgd2hpbGUgbWFpbnRhaW5pbmcgdGhlIHNlbGVjdGlvbidzIHRhaWwgcG9zaXRpb24uXG4gICNcbiAgIyBUaGlzIG1ldGhvZCBtYXkgbWVyZ2Ugc2VsZWN0aW9ucyB0aGF0IGVuZCB1cCBpbnRlcnNlY3RpbmcuXG4gIHNlbGVjdFRvTmV4dFN1YndvcmRCb3VuZGFyeTogLT5cbiAgICBAZXhwYW5kU2VsZWN0aW9uc0ZvcndhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFRvTmV4dFN1YndvcmRCb3VuZGFyeSgpXG5cbiAgIyBFc3NlbnRpYWw6IEZvciBlYWNoIGN1cnNvciwgc2VsZWN0IHRoZSBjb250YWluaW5nIGxpbmUuXG4gICNcbiAgIyBUaGlzIG1ldGhvZCBtZXJnZXMgc2VsZWN0aW9ucyBvbiBzdWNjZXNzaXZlIGxpbmVzLlxuICBzZWxlY3RMaW5lc0NvbnRhaW5pbmdDdXJzb3JzOiAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zRm9yd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uc2VsZWN0TGluZSgpXG5cbiAgIyBFc3NlbnRpYWw6IFNlbGVjdCB0aGUgd29yZCBzdXJyb3VuZGluZyBlYWNoIGN1cnNvci5cbiAgc2VsZWN0V29yZHNDb250YWluaW5nQ3Vyc29yczogLT5cbiAgICBAZXhwYW5kU2VsZWN0aW9uc0ZvcndhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFdvcmQoKVxuXG4gICMgU2VsZWN0aW9uIEV4dGVuZGVkXG5cbiAgIyBFeHRlbmRlZDogRm9yIGVhY2ggc2VsZWN0aW9uLCBtb3ZlIGl0cyBjdXJzb3IgdG8gdGhlIHByZWNlZGluZyB3b3JkIGJvdW5kYXJ5XG4gICMgd2hpbGUgbWFpbnRhaW5pbmcgdGhlIHNlbGVjdGlvbidzIHRhaWwgcG9zaXRpb24uXG4gICNcbiAgIyBUaGlzIG1ldGhvZCBtYXkgbWVyZ2Ugc2VsZWN0aW9ucyB0aGF0IGVuZCB1cCBpbnRlcnNlY3RpbmcuXG4gIHNlbGVjdFRvUHJldmlvdXNXb3JkQm91bmRhcnk6IC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNCYWNrd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uc2VsZWN0VG9QcmV2aW91c1dvcmRCb3VuZGFyeSgpXG5cbiAgIyBFeHRlbmRlZDogRm9yIGVhY2ggc2VsZWN0aW9uLCBtb3ZlIGl0cyBjdXJzb3IgdG8gdGhlIG5leHQgd29yZCBib3VuZGFyeSB3aGlsZVxuICAjIG1haW50YWluaW5nIHRoZSBzZWxlY3Rpb24ncyB0YWlsIHBvc2l0aW9uLlxuICAjXG4gICMgVGhpcyBtZXRob2QgbWF5IG1lcmdlIHNlbGVjdGlvbnMgdGhhdCBlbmQgdXAgaW50ZXJzZWN0aW5nLlxuICBzZWxlY3RUb05leHRXb3JkQm91bmRhcnk6IC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNGb3J3YXJkIChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5zZWxlY3RUb05leHRXb3JkQm91bmRhcnkoKVxuXG4gICMgRXh0ZW5kZWQ6IEV4cGFuZCBzZWxlY3Rpb25zIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIG5leHQgd29yZC5cbiAgI1xuICAjIE9wZXJhdGVzIG9uIGFsbCBzZWxlY3Rpb25zLiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIG5leHRcbiAgIyB3b3JkIHdoaWxlIHByZXNlcnZpbmcgdGhlIHNlbGVjdGlvbidzIHRhaWwgcG9zaXRpb24uXG4gIHNlbGVjdFRvQmVnaW5uaW5nT2ZOZXh0V29yZDogLT5cbiAgICBAZXhwYW5kU2VsZWN0aW9uc0ZvcndhcmQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLnNlbGVjdFRvQmVnaW5uaW5nT2ZOZXh0V29yZCgpXG5cbiAgIyBFeHRlbmRlZDogRXhwYW5kIHNlbGVjdGlvbnMgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgbmV4dCBwYXJhZ3JhcGguXG4gICNcbiAgIyBPcGVyYXRlcyBvbiBhbGwgc2VsZWN0aW9ucy4gTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBuZXh0XG4gICMgcGFyYWdyYXBoIHdoaWxlIHByZXNlcnZpbmcgdGhlIHNlbGVjdGlvbidzIHRhaWwgcG9zaXRpb24uXG4gIHNlbGVjdFRvQmVnaW5uaW5nT2ZOZXh0UGFyYWdyYXBoOiAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zRm9yd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uc2VsZWN0VG9CZWdpbm5pbmdPZk5leHRQYXJhZ3JhcGgoKVxuXG4gICMgRXh0ZW5kZWQ6IEV4cGFuZCBzZWxlY3Rpb25zIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIG5leHQgcGFyYWdyYXBoLlxuICAjXG4gICMgT3BlcmF0ZXMgb24gYWxsIHNlbGVjdGlvbnMuIE1vdmVzIHRoZSBjdXJzb3IgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgbmV4dFxuICAjIHBhcmFncmFwaCB3aGlsZSBwcmVzZXJ2aW5nIHRoZSBzZWxlY3Rpb24ncyB0YWlsIHBvc2l0aW9uLlxuICBzZWxlY3RUb0JlZ2lubmluZ09mUHJldmlvdXNQYXJhZ3JhcGg6IC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNCYWNrd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uc2VsZWN0VG9CZWdpbm5pbmdPZlByZXZpb3VzUGFyYWdyYXBoKClcblxuICAjIEV4dGVuZGVkOiBTZWxlY3QgdGhlIHJhbmdlIG9mIHRoZSBnaXZlbiBtYXJrZXIgaWYgaXQgaXMgdmFsaWQuXG4gICNcbiAgIyAqIGBtYXJrZXJgIEEge0Rpc3BsYXlNYXJrZXJ9XG4gICNcbiAgIyBSZXR1cm5zIHRoZSBzZWxlY3RlZCB7UmFuZ2V9IG9yIGB1bmRlZmluZWRgIGlmIHRoZSBtYXJrZXIgaXMgaW52YWxpZC5cbiAgc2VsZWN0TWFya2VyOiAobWFya2VyKSAtPlxuICAgIGlmIG1hcmtlci5pc1ZhbGlkKClcbiAgICAgIHJhbmdlID0gbWFya2VyLmdldEJ1ZmZlclJhbmdlKClcbiAgICAgIEBzZXRTZWxlY3RlZEJ1ZmZlclJhbmdlKHJhbmdlKVxuICAgICAgcmFuZ2VcblxuICAjIEV4dGVuZGVkOiBHZXQgdGhlIG1vc3QgcmVjZW50bHkgYWRkZWQge1NlbGVjdGlvbn0uXG4gICNcbiAgIyBSZXR1cm5zIGEge1NlbGVjdGlvbn0uXG4gIGdldExhc3RTZWxlY3Rpb246IC0+XG4gICAgQGNyZWF0ZUxhc3RTZWxlY3Rpb25JZk5lZWRlZCgpXG4gICAgXy5sYXN0KEBzZWxlY3Rpb25zKVxuXG4gICMgRXh0ZW5kZWQ6IEdldCBjdXJyZW50IHtTZWxlY3Rpb259cy5cbiAgI1xuICAjIFJldHVybnM6IEFuIHtBcnJheX0gb2Yge1NlbGVjdGlvbn1zLlxuICBnZXRTZWxlY3Rpb25zOiAtPlxuICAgIEBjcmVhdGVMYXN0U2VsZWN0aW9uSWZOZWVkZWQoKVxuICAgIEBzZWxlY3Rpb25zLnNsaWNlKClcblxuICAjIEV4dGVuZGVkOiBHZXQgYWxsIHtTZWxlY3Rpb259cywgb3JkZXJlZCBieSB0aGVpciBwb3NpdGlvbiBpbiB0aGUgYnVmZmVyXG4gICMgaW5zdGVhZCBvZiB0aGUgb3JkZXIgaW4gd2hpY2ggdGhleSB3ZXJlIGFkZGVkLlxuICAjXG4gICMgUmV0dXJucyBhbiB7QXJyYXl9IG9mIHtTZWxlY3Rpb259cy5cbiAgZ2V0U2VsZWN0aW9uc09yZGVyZWRCeUJ1ZmZlclBvc2l0aW9uOiAtPlxuICAgIEBnZXRTZWxlY3Rpb25zKCkuc29ydCAoYSwgYikgLT4gYS5jb21wYXJlKGIpXG5cbiAgIyBFeHRlbmRlZDogRGV0ZXJtaW5lIGlmIGEgZ2l2ZW4gcmFuZ2UgaW4gYnVmZmVyIGNvb3JkaW5hdGVzIGludGVyc2VjdHMgYVxuICAjIHNlbGVjdGlvbi5cbiAgI1xuICAjICogYGJ1ZmZlclJhbmdlYCBBIHtSYW5nZX0gb3IgcmFuZ2UtY29tcGF0aWJsZSB7QXJyYXl9LlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufS5cbiAgc2VsZWN0aW9uSW50ZXJzZWN0c0J1ZmZlclJhbmdlOiAoYnVmZmVyUmFuZ2UpIC0+XG4gICAgXy5hbnkgQGdldFNlbGVjdGlvbnMoKSwgKHNlbGVjdGlvbikgLT5cbiAgICAgIHNlbGVjdGlvbi5pbnRlcnNlY3RzQnVmZmVyUmFuZ2UoYnVmZmVyUmFuZ2UpXG5cbiAgIyBTZWxlY3Rpb25zIFByaXZhdGVcblxuICAjIEFkZCBhIHNpbWlsYXJseS1zaGFwZWQgc2VsZWN0aW9uIHRvIHRoZSBuZXh0IGVsaWdpYmxlIGxpbmUgYmVsb3dcbiAgIyBlYWNoIHNlbGVjdGlvbi5cbiAgI1xuICAjIE9wZXJhdGVzIG9uIGFsbCBzZWxlY3Rpb25zLiBJZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCBhZGRzIGFuIGVtcHR5XG4gICMgc2VsZWN0aW9uIHRvIHRoZSBuZXh0IGZvbGxvd2luZyBub24tZW1wdHkgbGluZSBhcyBjbG9zZSB0byB0aGUgY3VycmVudFxuICAjIHNlbGVjdGlvbidzIGNvbHVtbiBhcyBwb3NzaWJsZS4gSWYgdGhlIHNlbGVjdGlvbiBpcyBub24tZW1wdHksIGFkZHMgYVxuICAjIHNlbGVjdGlvbiB0byB0aGUgbmV4dCBsaW5lIHRoYXQgaXMgbG9uZyBlbm91Z2ggZm9yIGEgbm9uLWVtcHR5IHNlbGVjdGlvblxuICAjIHN0YXJ0aW5nIGF0IHRoZSBzYW1lIGNvbHVtbiBhcyB0aGUgY3VycmVudCBzZWxlY3Rpb24gdG8gYmUgYWRkZWQgdG8gaXQuXG4gIGFkZFNlbGVjdGlvbkJlbG93OiAtPlxuICAgIEBleHBhbmRTZWxlY3Rpb25zRm9yd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uYWRkU2VsZWN0aW9uQmVsb3coKVxuXG4gICMgQWRkIGEgc2ltaWxhcmx5LXNoYXBlZCBzZWxlY3Rpb24gdG8gdGhlIG5leHQgZWxpZ2libGUgbGluZSBhYm92ZVxuICAjIGVhY2ggc2VsZWN0aW9uLlxuICAjXG4gICMgT3BlcmF0ZXMgb24gYWxsIHNlbGVjdGlvbnMuIElmIHRoZSBzZWxlY3Rpb24gaXMgZW1wdHksIGFkZHMgYW4gZW1wdHlcbiAgIyBzZWxlY3Rpb24gdG8gdGhlIG5leHQgcHJlY2VkaW5nIG5vbi1lbXB0eSBsaW5lIGFzIGNsb3NlIHRvIHRoZSBjdXJyZW50XG4gICMgc2VsZWN0aW9uJ3MgY29sdW1uIGFzIHBvc3NpYmxlLiBJZiB0aGUgc2VsZWN0aW9uIGlzIG5vbi1lbXB0eSwgYWRkcyBhXG4gICMgc2VsZWN0aW9uIHRvIHRoZSBuZXh0IGxpbmUgdGhhdCBpcyBsb25nIGVub3VnaCBmb3IgYSBub24tZW1wdHkgc2VsZWN0aW9uXG4gICMgc3RhcnRpbmcgYXQgdGhlIHNhbWUgY29sdW1uIGFzIHRoZSBjdXJyZW50IHNlbGVjdGlvbiB0byBiZSBhZGRlZCB0byBpdC5cbiAgYWRkU2VsZWN0aW9uQWJvdmU6IC0+XG4gICAgQGV4cGFuZFNlbGVjdGlvbnNCYWNrd2FyZCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uYWRkU2VsZWN0aW9uQWJvdmUoKVxuXG4gICMgQ2FsbHMgdGhlIGdpdmVuIGZ1bmN0aW9uIHdpdGggZWFjaCBzZWxlY3Rpb24sIHRoZW4gbWVyZ2VzIHNlbGVjdGlvbnNcbiAgZXhwYW5kU2VsZWN0aW9uc0ZvcndhcmQ6IChmbikgLT5cbiAgICBAbWVyZ2VJbnRlcnNlY3RpbmdTZWxlY3Rpb25zID0+XG4gICAgICBmbihzZWxlY3Rpb24pIGZvciBzZWxlY3Rpb24gaW4gQGdldFNlbGVjdGlvbnMoKVxuICAgICAgcmV0dXJuXG5cbiAgIyBDYWxscyB0aGUgZ2l2ZW4gZnVuY3Rpb24gd2l0aCBlYWNoIHNlbGVjdGlvbiwgdGhlbiBtZXJnZXMgc2VsZWN0aW9ucyBpbiB0aGVcbiAgIyByZXZlcnNlZCBvcmllbnRhdGlvblxuICBleHBhbmRTZWxlY3Rpb25zQmFja3dhcmQ6IChmbikgLT5cbiAgICBAbWVyZ2VJbnRlcnNlY3RpbmdTZWxlY3Rpb25zIHJldmVyc2VkOiB0cnVlLCA9PlxuICAgICAgZm4oc2VsZWN0aW9uKSBmb3Igc2VsZWN0aW9uIGluIEBnZXRTZWxlY3Rpb25zKClcbiAgICAgIHJldHVyblxuXG4gIGZpbmFsaXplU2VsZWN0aW9uczogLT5cbiAgICBzZWxlY3Rpb24uZmluYWxpemUoKSBmb3Igc2VsZWN0aW9uIGluIEBnZXRTZWxlY3Rpb25zKClcbiAgICByZXR1cm5cblxuICBzZWxlY3Rpb25zRm9yU2NyZWVuUm93czogKHN0YXJ0Um93LCBlbmRSb3cpIC0+XG4gICAgQGdldFNlbGVjdGlvbnMoKS5maWx0ZXIgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLmludGVyc2VjdHNTY3JlZW5Sb3dSYW5nZShzdGFydFJvdywgZW5kUm93KVxuXG4gICMgTWVyZ2VzIGludGVyc2VjdGluZyBzZWxlY3Rpb25zLiBJZiBwYXNzZWQgYSBmdW5jdGlvbiwgaXQgZXhlY3V0ZXNcbiAgIyB0aGUgZnVuY3Rpb24gd2l0aCBtZXJnaW5nIHN1cHByZXNzZWQsIHRoZW4gbWVyZ2VzIGludGVyc2VjdGluZyBzZWxlY3Rpb25zXG4gICMgYWZ0ZXJ3YXJkLlxuICBtZXJnZUludGVyc2VjdGluZ1NlbGVjdGlvbnM6IChhcmdzLi4uKSAtPlxuICAgIEBtZXJnZVNlbGVjdGlvbnMgYXJncy4uLiwgKHByZXZpb3VzU2VsZWN0aW9uLCBjdXJyZW50U2VsZWN0aW9uKSAtPlxuICAgICAgZXhjbHVzaXZlID0gbm90IGN1cnJlbnRTZWxlY3Rpb24uaXNFbXB0eSgpIGFuZCBub3QgcHJldmlvdXNTZWxlY3Rpb24uaXNFbXB0eSgpXG5cbiAgICAgIHByZXZpb3VzU2VsZWN0aW9uLmludGVyc2VjdHNXaXRoKGN1cnJlbnRTZWxlY3Rpb24sIGV4Y2x1c2l2ZSlcblxuICBtZXJnZVNlbGVjdGlvbnNPblNhbWVSb3dzOiAoYXJncy4uLikgLT5cbiAgICBAbWVyZ2VTZWxlY3Rpb25zIGFyZ3MuLi4sIChwcmV2aW91c1NlbGVjdGlvbiwgY3VycmVudFNlbGVjdGlvbikgLT5cbiAgICAgIHNjcmVlblJhbmdlID0gY3VycmVudFNlbGVjdGlvbi5nZXRTY3JlZW5SYW5nZSgpXG5cbiAgICAgIHByZXZpb3VzU2VsZWN0aW9uLmludGVyc2VjdHNTY3JlZW5Sb3dSYW5nZShzY3JlZW5SYW5nZS5zdGFydC5yb3csIHNjcmVlblJhbmdlLmVuZC5yb3cpXG5cbiAgYXZvaWRNZXJnaW5nU2VsZWN0aW9uczogKGFyZ3MuLi4pIC0+XG4gICAgQG1lcmdlU2VsZWN0aW9ucyBhcmdzLi4uLCAtPiBmYWxzZVxuXG4gIG1lcmdlU2VsZWN0aW9uczogKGFyZ3MuLi4pIC0+XG4gICAgbWVyZ2VQcmVkaWNhdGUgPSBhcmdzLnBvcCgpXG4gICAgZm4gPSBhcmdzLnBvcCgpIGlmIF8uaXNGdW5jdGlvbihfLmxhc3QoYXJncykpXG4gICAgb3B0aW9ucyA9IGFyZ3MucG9wKCkgPyB7fVxuXG4gICAgcmV0dXJuIGZuPygpIGlmIEBzdXBwcmVzc1NlbGVjdGlvbk1lcmdpbmdcblxuICAgIGlmIGZuP1xuICAgICAgQHN1cHByZXNzU2VsZWN0aW9uTWVyZ2luZyA9IHRydWVcbiAgICAgIHJlc3VsdCA9IGZuKClcbiAgICAgIEBzdXBwcmVzc1NlbGVjdGlvbk1lcmdpbmcgPSBmYWxzZVxuXG4gICAgcmVkdWNlciA9IChkaXNqb2ludFNlbGVjdGlvbnMsIHNlbGVjdGlvbikgLT5cbiAgICAgIGFkamFjZW50U2VsZWN0aW9uID0gXy5sYXN0KGRpc2pvaW50U2VsZWN0aW9ucylcbiAgICAgIGlmIG1lcmdlUHJlZGljYXRlKGFkamFjZW50U2VsZWN0aW9uLCBzZWxlY3Rpb24pXG4gICAgICAgIGFkamFjZW50U2VsZWN0aW9uLm1lcmdlKHNlbGVjdGlvbiwgb3B0aW9ucylcbiAgICAgICAgZGlzam9pbnRTZWxlY3Rpb25zXG4gICAgICBlbHNlXG4gICAgICAgIGRpc2pvaW50U2VsZWN0aW9ucy5jb25jYXQoW3NlbGVjdGlvbl0pXG5cbiAgICBbaGVhZCwgdGFpbC4uLl0gPSBAZ2V0U2VsZWN0aW9uc09yZGVyZWRCeUJ1ZmZlclBvc2l0aW9uKClcbiAgICBfLnJlZHVjZSh0YWlsLCByZWR1Y2VyLCBbaGVhZF0pXG4gICAgcmV0dXJuIHJlc3VsdCBpZiBmbj9cblxuICAjIEFkZCBhIHtTZWxlY3Rpb259IGJhc2VkIG9uIHRoZSBnaXZlbiB7RGlzcGxheU1hcmtlcn0uXG4gICNcbiAgIyAqIGBtYXJrZXJgIFRoZSB7RGlzcGxheU1hcmtlcn0gdG8gaGlnaGxpZ2h0XG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSBBbiB7T2JqZWN0fSB0aGF0IHBlcnRhaW5zIHRvIHRoZSB7U2VsZWN0aW9ufSBjb25zdHJ1Y3Rvci5cbiAgI1xuICAjIFJldHVybnMgdGhlIG5ldyB7U2VsZWN0aW9ufS5cbiAgYWRkU2VsZWN0aW9uOiAobWFya2VyLCBvcHRpb25zPXt9KSAtPlxuICAgIGN1cnNvciA9IEBhZGRDdXJzb3IobWFya2VyKVxuICAgIHNlbGVjdGlvbiA9IG5ldyBTZWxlY3Rpb24oT2JqZWN0LmFzc2lnbih7ZWRpdG9yOiB0aGlzLCBtYXJrZXIsIGN1cnNvcn0sIG9wdGlvbnMpKVxuICAgIEBzZWxlY3Rpb25zLnB1c2goc2VsZWN0aW9uKVxuICAgIHNlbGVjdGlvbkJ1ZmZlclJhbmdlID0gc2VsZWN0aW9uLmdldEJ1ZmZlclJhbmdlKClcbiAgICBAbWVyZ2VJbnRlcnNlY3RpbmdTZWxlY3Rpb25zKHByZXNlcnZlRm9sZHM6IG9wdGlvbnMucHJlc2VydmVGb2xkcylcblxuICAgIGlmIHNlbGVjdGlvbi5kZXN0cm95ZWRcbiAgICAgIGZvciBzZWxlY3Rpb24gaW4gQGdldFNlbGVjdGlvbnMoKVxuICAgICAgICBpZiBzZWxlY3Rpb24uaW50ZXJzZWN0c0J1ZmZlclJhbmdlKHNlbGVjdGlvbkJ1ZmZlclJhbmdlKVxuICAgICAgICAgIHJldHVybiBzZWxlY3Rpb25cbiAgICBlbHNlXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtYWRkLWN1cnNvcicsIGN1cnNvclxuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWFkZC1zZWxlY3Rpb24nLCBzZWxlY3Rpb25cbiAgICAgIHNlbGVjdGlvblxuXG4gICMgUmVtb3ZlIHRoZSBnaXZlbiBzZWxlY3Rpb24uXG4gIHJlbW92ZVNlbGVjdGlvbjogKHNlbGVjdGlvbikgLT5cbiAgICBfLnJlbW92ZShAY3Vyc29ycywgc2VsZWN0aW9uLmN1cnNvcilcbiAgICBfLnJlbW92ZShAc2VsZWN0aW9ucywgc2VsZWN0aW9uKVxuICAgIEBjdXJzb3JzQnlNYXJrZXJJZC5kZWxldGUoc2VsZWN0aW9uLmN1cnNvci5tYXJrZXIuaWQpXG4gICAgQGVtaXR0ZXIuZW1pdCAnZGlkLXJlbW92ZS1jdXJzb3InLCBzZWxlY3Rpb24uY3Vyc29yXG4gICAgQGVtaXR0ZXIuZW1pdCAnZGlkLXJlbW92ZS1zZWxlY3Rpb24nLCBzZWxlY3Rpb25cblxuICAjIFJlZHVjZSBvbmUgb3IgbW9yZSBzZWxlY3Rpb25zIHRvIGEgc2luZ2xlIGVtcHR5IHNlbGVjdGlvbiBiYXNlZCBvbiB0aGUgbW9zdFxuICAjIHJlY2VudGx5IGFkZGVkIGN1cnNvci5cbiAgY2xlYXJTZWxlY3Rpb25zOiAob3B0aW9ucykgLT5cbiAgICBAY29uc29saWRhdGVTZWxlY3Rpb25zKClcbiAgICBAZ2V0TGFzdFNlbGVjdGlvbigpLmNsZWFyKG9wdGlvbnMpXG5cbiAgIyBSZWR1Y2UgbXVsdGlwbGUgc2VsZWN0aW9ucyB0byB0aGUgbGVhc3QgcmVjZW50bHkgYWRkZWQgc2VsZWN0aW9uLlxuICBjb25zb2xpZGF0ZVNlbGVjdGlvbnM6IC0+XG4gICAgc2VsZWN0aW9ucyA9IEBnZXRTZWxlY3Rpb25zKClcbiAgICBpZiBzZWxlY3Rpb25zLmxlbmd0aCA+IDFcbiAgICAgIHNlbGVjdGlvbi5kZXN0cm95KCkgZm9yIHNlbGVjdGlvbiBpbiBzZWxlY3Rpb25zWzEuLi4oc2VsZWN0aW9ucy5sZW5ndGgpXVxuICAgICAgc2VsZWN0aW9uc1swXS5hdXRvc2Nyb2xsKGNlbnRlcjogdHJ1ZSlcbiAgICAgIHRydWVcbiAgICBlbHNlXG4gICAgICBmYWxzZVxuXG4gICMgQ2FsbGVkIGJ5IHRoZSBzZWxlY3Rpb25cbiAgc2VsZWN0aW9uUmFuZ2VDaGFuZ2VkOiAoZXZlbnQpIC0+XG4gICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWNoYW5nZS1zZWxlY3Rpb24tcmFuZ2UnLCBldmVudFxuXG4gIGNyZWF0ZUxhc3RTZWxlY3Rpb25JZk5lZWRlZDogLT5cbiAgICBpZiBAc2VsZWN0aW9ucy5sZW5ndGggaXMgMFxuICAgICAgQGFkZFNlbGVjdGlvbkZvckJ1ZmZlclJhbmdlKFtbMCwgMF0sIFswLCAwXV0sIGF1dG9zY3JvbGw6IGZhbHNlLCBwcmVzZXJ2ZUZvbGRzOiB0cnVlKVxuXG4gICMjI1xuICBTZWN0aW9uOiBTZWFyY2hpbmcgYW5kIFJlcGxhY2luZ1xuICAjIyNcblxuICAjIEVzc2VudGlhbDogU2NhbiByZWd1bGFyIGV4cHJlc3Npb24gbWF0Y2hlcyBpbiB0aGUgZW50aXJlIGJ1ZmZlciwgY2FsbGluZyB0aGVcbiAgIyBnaXZlbiBpdGVyYXRvciBmdW5jdGlvbiBvbiBlYWNoIG1hdGNoLlxuICAjXG4gICMgYDo6c2NhbmAgZnVuY3Rpb25zIGFzIHRoZSByZXBsYWNlIG1ldGhvZCBhcyB3ZWxsIHZpYSB0aGUgYHJlcGxhY2VgXG4gICNcbiAgIyBJZiB5b3UncmUgcHJvZ3JhbW1hdGljYWxseSBtb2RpZnlpbmcgdGhlIHJlc3VsdHMsIHlvdSBtYXkgd2FudCB0byB0cnlcbiAgIyB7OjpiYWNrd2FyZHNTY2FuSW5CdWZmZXJSYW5nZX0gdG8gYXZvaWQgdHJpcHBpbmcgb3ZlciB5b3VyIG93biBjaGFuZ2VzLlxuICAjXG4gICMgKiBgcmVnZXhgIEEge1JlZ0V4cH0gdG8gc2VhcmNoIGZvci5cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9XG4gICMgICAqIGBsZWFkaW5nQ29udGV4dExpbmVDb3VudGAge051bWJlcn0gZGVmYXVsdCBgMGA7IFRoZSBudW1iZXIgb2YgbGluZXNcbiAgIyAgICAgIGJlZm9yZSB0aGUgbWF0Y2hlZCBsaW5lIHRvIGluY2x1ZGUgaW4gdGhlIHJlc3VsdHMgb2JqZWN0LlxuICAjICAgKiBgdHJhaWxpbmdDb250ZXh0TGluZUNvdW50YCB7TnVtYmVyfSBkZWZhdWx0IGAwYDsgVGhlIG51bWJlciBvZiBsaW5lc1xuICAjICAgICAgYWZ0ZXIgdGhlIG1hdGNoZWQgbGluZSB0byBpbmNsdWRlIGluIHRoZSByZXN1bHRzIG9iamVjdC5cbiAgIyAqIGBpdGVyYXRvcmAgQSB7RnVuY3Rpb259IHRoYXQncyBjYWxsZWQgb24gZWFjaCBtYXRjaFxuICAjICAgKiBgb2JqZWN0YCB7T2JqZWN0fVxuICAjICAgICAqIGBtYXRjaGAgVGhlIGN1cnJlbnQgcmVndWxhciBleHByZXNzaW9uIG1hdGNoLlxuICAjICAgICAqIGBtYXRjaFRleHRgIEEge1N0cmluZ30gd2l0aCB0aGUgdGV4dCBvZiB0aGUgbWF0Y2guXG4gICMgICAgICogYHJhbmdlYCBUaGUge1JhbmdlfSBvZiB0aGUgbWF0Y2guXG4gICMgICAgICogYHN0b3BgIENhbGwgdGhpcyB7RnVuY3Rpb259IHRvIHRlcm1pbmF0ZSB0aGUgc2Nhbi5cbiAgIyAgICAgKiBgcmVwbGFjZWAgQ2FsbCB0aGlzIHtGdW5jdGlvbn0gd2l0aCBhIHtTdHJpbmd9IHRvIHJlcGxhY2UgdGhlIG1hdGNoLlxuICBzY2FuOiAocmVnZXgsIG9wdGlvbnM9e30sIGl0ZXJhdG9yKSAtPlxuICAgIGlmIF8uaXNGdW5jdGlvbihvcHRpb25zKVxuICAgICAgaXRlcmF0b3IgPSBvcHRpb25zXG4gICAgICBvcHRpb25zID0ge31cblxuICAgIEBidWZmZXIuc2NhbihyZWdleCwgb3B0aW9ucywgaXRlcmF0b3IpXG5cbiAgIyBFc3NlbnRpYWw6IFNjYW4gcmVndWxhciBleHByZXNzaW9uIG1hdGNoZXMgaW4gYSBnaXZlbiByYW5nZSwgY2FsbGluZyB0aGUgZ2l2ZW5cbiAgIyBpdGVyYXRvciBmdW5jdGlvbiBvbiBlYWNoIG1hdGNoLlxuICAjXG4gICMgKiBgcmVnZXhgIEEge1JlZ0V4cH0gdG8gc2VhcmNoIGZvci5cbiAgIyAqIGByYW5nZWAgQSB7UmFuZ2V9IGluIHdoaWNoIHRvIHNlYXJjaC5cbiAgIyAqIGBpdGVyYXRvcmAgQSB7RnVuY3Rpb259IHRoYXQncyBjYWxsZWQgb24gZWFjaCBtYXRjaCB3aXRoIGFuIHtPYmplY3R9XG4gICMgICBjb250YWluaW5nIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYG1hdGNoYCBUaGUgY3VycmVudCByZWd1bGFyIGV4cHJlc3Npb24gbWF0Y2guXG4gICMgICAqIGBtYXRjaFRleHRgIEEge1N0cmluZ30gd2l0aCB0aGUgdGV4dCBvZiB0aGUgbWF0Y2guXG4gICMgICAqIGByYW5nZWAgVGhlIHtSYW5nZX0gb2YgdGhlIG1hdGNoLlxuICAjICAgKiBgc3RvcGAgQ2FsbCB0aGlzIHtGdW5jdGlvbn0gdG8gdGVybWluYXRlIHRoZSBzY2FuLlxuICAjICAgKiBgcmVwbGFjZWAgQ2FsbCB0aGlzIHtGdW5jdGlvbn0gd2l0aCBhIHtTdHJpbmd9IHRvIHJlcGxhY2UgdGhlIG1hdGNoLlxuICBzY2FuSW5CdWZmZXJSYW5nZTogKHJlZ2V4LCByYW5nZSwgaXRlcmF0b3IpIC0+IEBidWZmZXIuc2NhbkluUmFuZ2UocmVnZXgsIHJhbmdlLCBpdGVyYXRvcilcblxuICAjIEVzc2VudGlhbDogU2NhbiByZWd1bGFyIGV4cHJlc3Npb24gbWF0Y2hlcyBpbiBhIGdpdmVuIHJhbmdlIGluIHJldmVyc2Ugb3JkZXIsXG4gICMgY2FsbGluZyB0aGUgZ2l2ZW4gaXRlcmF0b3IgZnVuY3Rpb24gb24gZWFjaCBtYXRjaC5cbiAgI1xuICAjICogYHJlZ2V4YCBBIHtSZWdFeHB9IHRvIHNlYXJjaCBmb3IuXG4gICMgKiBgcmFuZ2VgIEEge1JhbmdlfSBpbiB3aGljaCB0byBzZWFyY2guXG4gICMgKiBgaXRlcmF0b3JgIEEge0Z1bmN0aW9ufSB0aGF0J3MgY2FsbGVkIG9uIGVhY2ggbWF0Y2ggd2l0aCBhbiB7T2JqZWN0fVxuICAjICAgY29udGFpbmluZyB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGBtYXRjaGAgVGhlIGN1cnJlbnQgcmVndWxhciBleHByZXNzaW9uIG1hdGNoLlxuICAjICAgKiBgbWF0Y2hUZXh0YCBBIHtTdHJpbmd9IHdpdGggdGhlIHRleHQgb2YgdGhlIG1hdGNoLlxuICAjICAgKiBgcmFuZ2VgIFRoZSB7UmFuZ2V9IG9mIHRoZSBtYXRjaC5cbiAgIyAgICogYHN0b3BgIENhbGwgdGhpcyB7RnVuY3Rpb259IHRvIHRlcm1pbmF0ZSB0aGUgc2Nhbi5cbiAgIyAgICogYHJlcGxhY2VgIENhbGwgdGhpcyB7RnVuY3Rpb259IHdpdGggYSB7U3RyaW5nfSB0byByZXBsYWNlIHRoZSBtYXRjaC5cbiAgYmFja3dhcmRzU2NhbkluQnVmZmVyUmFuZ2U6IChyZWdleCwgcmFuZ2UsIGl0ZXJhdG9yKSAtPiBAYnVmZmVyLmJhY2t3YXJkc1NjYW5JblJhbmdlKHJlZ2V4LCByYW5nZSwgaXRlcmF0b3IpXG5cbiAgIyMjXG4gIFNlY3Rpb246IFRhYiBCZWhhdmlvclxuICAjIyNcblxuICAjIEVzc2VudGlhbDogUmV0dXJucyBhIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgc29mdFRhYnMgYXJlIGVuYWJsZWQgZm9yIHRoaXNcbiAgIyBlZGl0b3IuXG4gIGdldFNvZnRUYWJzOiAtPiBAc29mdFRhYnNcblxuICAjIEVzc2VudGlhbDogRW5hYmxlIG9yIGRpc2FibGUgc29mdCB0YWJzIGZvciB0aGlzIGVkaXRvci5cbiAgI1xuICAjICogYHNvZnRUYWJzYCBBIHtCb29sZWFufVxuICBzZXRTb2Z0VGFiczogKEBzb2Z0VGFicykgLT4gQHVwZGF0ZSh7QHNvZnRUYWJzfSlcblxuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIGF0b21pYyBzb2Z0IHRhYnMgYXJlIGVuYWJsZWQgZm9yIHRoaXMgZWRpdG9yLlxuICBoYXNBdG9taWNTb2Z0VGFiczogLT4gQGRpc3BsYXlMYXllci5hdG9taWNTb2Z0VGFic1xuXG4gICMgRXNzZW50aWFsOiBUb2dnbGUgc29mdCB0YWJzIGZvciB0aGlzIGVkaXRvclxuICB0b2dnbGVTb2Z0VGFiczogLT4gQHNldFNvZnRUYWJzKG5vdCBAZ2V0U29mdFRhYnMoKSlcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSBvbi1zY3JlZW4gbGVuZ3RoIG9mIHRhYiBjaGFyYWN0ZXJzLlxuICAjXG4gICMgUmV0dXJucyBhIHtOdW1iZXJ9LlxuICBnZXRUYWJMZW5ndGg6IC0+IEB0b2tlbml6ZWRCdWZmZXIuZ2V0VGFiTGVuZ3RoKClcblxuICAjIEVzc2VudGlhbDogU2V0IHRoZSBvbi1zY3JlZW4gbGVuZ3RoIG9mIHRhYiBjaGFyYWN0ZXJzLiBTZXR0aW5nIHRoaXMgdG8gYVxuICAjIHtOdW1iZXJ9IFRoaXMgd2lsbCBvdmVycmlkZSB0aGUgYGVkaXRvci50YWJMZW5ndGhgIHNldHRpbmcuXG4gICNcbiAgIyAqIGB0YWJMZW5ndGhgIHtOdW1iZXJ9IGxlbmd0aCBvZiBhIHNpbmdsZSB0YWIuIFNldHRpbmcgdG8gYG51bGxgIHdpbGxcbiAgIyAgIGZhbGxiYWNrIHRvIHVzaW5nIHRoZSBgZWRpdG9yLnRhYkxlbmd0aGAgY29uZmlnIHNldHRpbmdcbiAgc2V0VGFiTGVuZ3RoOiAodGFiTGVuZ3RoKSAtPiBAdXBkYXRlKHt0YWJMZW5ndGh9KVxuXG4gICMgUmV0dXJucyBhbiB7T2JqZWN0fSByZXByZXNlbnRpbmcgdGhlIGN1cnJlbnQgaW52aXNpYmxlIGNoYXJhY3RlclxuICAjIHN1YnN0aXR1dGlvbnMgZm9yIHRoaXMgZWRpdG9yLiBTZWUgezo6c2V0SW52aXNpYmxlc30uXG4gIGdldEludmlzaWJsZXM6IC0+XG4gICAgaWYgbm90IEBtaW5pIGFuZCBAc2hvd0ludmlzaWJsZXMgYW5kIEBpbnZpc2libGVzP1xuICAgICAgQGludmlzaWJsZXNcbiAgICBlbHNlXG4gICAgICB7fVxuXG4gIGRvZXNTaG93SW5kZW50R3VpZGU6IC0+IEBzaG93SW5kZW50R3VpZGUgYW5kIG5vdCBAbWluaVxuXG4gIGdldFNvZnRXcmFwSGFuZ2luZ0luZGVudExlbmd0aDogLT4gQGRpc3BsYXlMYXllci5zb2Z0V3JhcEhhbmdpbmdJbmRlbnRcblxuICAjIEV4dGVuZGVkOiBEZXRlcm1pbmUgaWYgdGhlIGJ1ZmZlciB1c2VzIGhhcmQgb3Igc29mdCB0YWJzLlxuICAjXG4gICMgUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGZpcnN0IG5vbi1jb21tZW50IGxpbmUgd2l0aCBsZWFkaW5nIHdoaXRlc3BhY2Ugc3RhcnRzXG4gICMgd2l0aCBhIHNwYWNlIGNoYXJhY3Rlci4gUmV0dXJucyBgZmFsc2VgIGlmIGl0IHN0YXJ0cyB3aXRoIGEgaGFyZCB0YWIgKGBcXHRgKS5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0gb3IgdW5kZWZpbmVkIGlmIG5vIG5vbi1jb21tZW50IGxpbmVzIGhhZCBsZWFkaW5nXG4gICMgd2hpdGVzcGFjZS5cbiAgdXNlc1NvZnRUYWJzOiAtPlxuICAgIGZvciBidWZmZXJSb3cgaW4gWzAuLkBidWZmZXIuZ2V0TGFzdFJvdygpXVxuICAgICAgY29udGludWUgaWYgQHRva2VuaXplZEJ1ZmZlci50b2tlbml6ZWRMaW5lc1tidWZmZXJSb3ddPy5pc0NvbW1lbnQoKVxuXG4gICAgICBsaW5lID0gQGJ1ZmZlci5saW5lRm9yUm93KGJ1ZmZlclJvdylcbiAgICAgIHJldHVybiB0cnVlICBpZiBsaW5lWzBdIGlzICcgJ1xuICAgICAgcmV0dXJuIGZhbHNlIGlmIGxpbmVbMF0gaXMgJ1xcdCdcblxuICAgIHVuZGVmaW5lZFxuXG4gICMgRXh0ZW5kZWQ6IEdldCB0aGUgdGV4dCByZXByZXNlbnRpbmcgYSBzaW5nbGUgbGV2ZWwgb2YgaW5kZW50LlxuICAjXG4gICMgSWYgc29mdCB0YWJzIGFyZSBlbmFibGVkLCB0aGUgdGV4dCBpcyBjb21wb3NlZCBvZiBOIHNwYWNlcywgd2hlcmUgTiBpcyB0aGVcbiAgIyB0YWIgbGVuZ3RoLiBPdGhlcndpc2UgdGhlIHRleHQgaXMgYSB0YWIgY2hhcmFjdGVyIChgXFx0YCkuXG4gICNcbiAgIyBSZXR1cm5zIGEge1N0cmluZ30uXG4gIGdldFRhYlRleHQ6IC0+IEBidWlsZEluZGVudFN0cmluZygxKVxuXG4gICMgSWYgc29mdCB0YWJzIGFyZSBlbmFibGVkLCBjb252ZXJ0IGFsbCBoYXJkIHRhYnMgdG8gc29mdCB0YWJzIGluIHRoZSBnaXZlblxuICAjIHtSYW5nZX0uXG4gIG5vcm1hbGl6ZVRhYnNJbkJ1ZmZlclJhbmdlOiAoYnVmZmVyUmFuZ2UpIC0+XG4gICAgcmV0dXJuIHVubGVzcyBAZ2V0U29mdFRhYnMoKVxuICAgIEBzY2FuSW5CdWZmZXJSYW5nZSAvXFx0L2csIGJ1ZmZlclJhbmdlLCAoe3JlcGxhY2V9KSA9PiByZXBsYWNlKEBnZXRUYWJUZXh0KCkpXG5cbiAgIyMjXG4gIFNlY3Rpb246IFNvZnQgV3JhcCBCZWhhdmlvclxuICAjIyNcblxuICAjIEVzc2VudGlhbDogRGV0ZXJtaW5lIHdoZXRoZXIgbGluZXMgaW4gdGhpcyBlZGl0b3IgYXJlIHNvZnQtd3JhcHBlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0uXG4gIGlzU29mdFdyYXBwZWQ6IC0+IEBzb2Z0V3JhcHBlZFxuXG4gICMgRXNzZW50aWFsOiBFbmFibGUgb3IgZGlzYWJsZSBzb2Z0IHdyYXBwaW5nIGZvciB0aGlzIGVkaXRvci5cbiAgI1xuICAjICogYHNvZnRXcmFwcGVkYCBBIHtCb29sZWFufVxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufS5cbiAgc2V0U29mdFdyYXBwZWQ6IChzb2Z0V3JhcHBlZCkgLT5cbiAgICBAdXBkYXRlKHtzb2Z0V3JhcHBlZH0pXG4gICAgQGlzU29mdFdyYXBwZWQoKVxuXG4gIGdldFByZWZlcnJlZExpbmVMZW5ndGg6IC0+IEBwcmVmZXJyZWRMaW5lTGVuZ3RoXG5cbiAgIyBFc3NlbnRpYWw6IFRvZ2dsZSBzb2Z0IHdyYXBwaW5nIGZvciB0aGlzIGVkaXRvclxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufS5cbiAgdG9nZ2xlU29mdFdyYXBwZWQ6IC0+IEBzZXRTb2Z0V3JhcHBlZChub3QgQGlzU29mdFdyYXBwZWQoKSlcblxuICAjIEVzc2VudGlhbDogR2V0cyB0aGUgY29sdW1uIGF0IHdoaWNoIGNvbHVtbiB3aWxsIHNvZnQgd3JhcFxuICBnZXRTb2Z0V3JhcENvbHVtbjogLT5cbiAgICBpZiBAaXNTb2Z0V3JhcHBlZCgpIGFuZCBub3QgQG1pbmlcbiAgICAgIGlmIEBzb2Z0V3JhcEF0UHJlZmVycmVkTGluZUxlbmd0aFxuICAgICAgICBNYXRoLm1pbihAZ2V0RWRpdG9yV2lkdGhJbkNoYXJzKCksIEBwcmVmZXJyZWRMaW5lTGVuZ3RoKVxuICAgICAgZWxzZVxuICAgICAgICBAZ2V0RWRpdG9yV2lkdGhJbkNoYXJzKClcbiAgICBlbHNlXG4gICAgICBNQVhfU0NSRUVOX0xJTkVfTEVOR1RIXG5cbiAgIyMjXG4gIFNlY3Rpb246IEluZGVudGF0aW9uXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBHZXQgdGhlIGluZGVudGF0aW9uIGxldmVsIG9mIHRoZSBnaXZlbiBidWZmZXIgcm93LlxuICAjXG4gICMgRGV0ZXJtaW5lcyBob3cgZGVlcGx5IHRoZSBnaXZlbiByb3cgaXMgaW5kZW50ZWQgYmFzZWQgb24gdGhlIHNvZnQgdGFicyBhbmRcbiAgIyB0YWIgbGVuZ3RoIHNldHRpbmdzIG9mIHRoaXMgZWRpdG9yLiBOb3RlIHRoYXQgaWYgc29mdCB0YWJzIGFyZSBlbmFibGVkIGFuZFxuICAjIHRoZSB0YWIgbGVuZ3RoIGlzIDIsIGEgcm93IHdpdGggNCBsZWFkaW5nIHNwYWNlcyB3b3VsZCBoYXZlIGFuIGluZGVudGF0aW9uXG4gICMgbGV2ZWwgb2YgMi5cbiAgI1xuICAjICogYGJ1ZmZlclJvd2AgQSB7TnVtYmVyfSBpbmRpY2F0aW5nIHRoZSBidWZmZXIgcm93LlxuICAjXG4gICMgUmV0dXJucyBhIHtOdW1iZXJ9LlxuICBpbmRlbnRhdGlvbkZvckJ1ZmZlclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICBAaW5kZW50TGV2ZWxGb3JMaW5lKEBsaW5lVGV4dEZvckJ1ZmZlclJvdyhidWZmZXJSb3cpKVxuXG4gICMgRXNzZW50aWFsOiBTZXQgdGhlIGluZGVudGF0aW9uIGxldmVsIGZvciB0aGUgZ2l2ZW4gYnVmZmVyIHJvdy5cbiAgI1xuICAjIEluc2VydHMgb3IgcmVtb3ZlcyBoYXJkIHRhYnMgb3Igc3BhY2VzIGJhc2VkIG9uIHRoZSBzb2Z0IHRhYnMgYW5kIHRhYiBsZW5ndGhcbiAgIyBzZXR0aW5ncyBvZiB0aGlzIGVkaXRvciBpbiBvcmRlciB0byBicmluZyBpdCB0byB0aGUgZ2l2ZW4gaW5kZW50YXRpb24gbGV2ZWwuXG4gICMgTm90ZSB0aGF0IGlmIHNvZnQgdGFicyBhcmUgZW5hYmxlZCBhbmQgdGhlIHRhYiBsZW5ndGggaXMgMiwgYSByb3cgd2l0aCA0XG4gICMgbGVhZGluZyBzcGFjZXMgd291bGQgaGF2ZSBhbiBpbmRlbnRhdGlvbiBsZXZlbCBvZiAyLlxuICAjXG4gICMgKiBgYnVmZmVyUm93YCBBIHtOdW1iZXJ9IGluZGljYXRpbmcgdGhlIGJ1ZmZlciByb3cuXG4gICMgKiBgbmV3TGV2ZWxgIEEge051bWJlcn0gaW5kaWNhdGluZyB0aGUgbmV3IGluZGVudGF0aW9uIGxldmVsLlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkgQW4ge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGBwcmVzZXJ2ZUxlYWRpbmdXaGl0ZXNwYWNlYCBgdHJ1ZWAgdG8gcHJlc2VydmUgYW55IHdoaXRlc3BhY2UgYWxyZWFkeSBhdFxuICAjICAgICAgdGhlIGJlZ2lubmluZyBvZiB0aGUgbGluZSAoZGVmYXVsdDogZmFsc2UpLlxuICBzZXRJbmRlbnRhdGlvbkZvckJ1ZmZlclJvdzogKGJ1ZmZlclJvdywgbmV3TGV2ZWwsIHtwcmVzZXJ2ZUxlYWRpbmdXaGl0ZXNwYWNlfT17fSkgLT5cbiAgICBpZiBwcmVzZXJ2ZUxlYWRpbmdXaGl0ZXNwYWNlXG4gICAgICBlbmRDb2x1bW4gPSAwXG4gICAgZWxzZVxuICAgICAgZW5kQ29sdW1uID0gQGxpbmVUZXh0Rm9yQnVmZmVyUm93KGJ1ZmZlclJvdykubWF0Y2goL15cXHMqLylbMF0ubGVuZ3RoXG4gICAgbmV3SW5kZW50U3RyaW5nID0gQGJ1aWxkSW5kZW50U3RyaW5nKG5ld0xldmVsKVxuICAgIEBidWZmZXIuc2V0VGV4dEluUmFuZ2UoW1tidWZmZXJSb3csIDBdLCBbYnVmZmVyUm93LCBlbmRDb2x1bW5dXSwgbmV3SW5kZW50U3RyaW5nKVxuXG4gICMgRXh0ZW5kZWQ6IEluZGVudCByb3dzIGludGVyc2VjdGluZyBzZWxlY3Rpb25zIGJ5IG9uZSBsZXZlbC5cbiAgaW5kZW50U2VsZWN0ZWRSb3dzOiAtPlxuICAgIEBtdXRhdGVTZWxlY3RlZFRleHQgKHNlbGVjdGlvbikgLT4gc2VsZWN0aW9uLmluZGVudFNlbGVjdGVkUm93cygpXG5cbiAgIyBFeHRlbmRlZDogT3V0ZGVudCByb3dzIGludGVyc2VjdGluZyBzZWxlY3Rpb25zIGJ5IG9uZSBsZXZlbC5cbiAgb3V0ZGVudFNlbGVjdGVkUm93czogLT5cbiAgICBAbXV0YXRlU2VsZWN0ZWRUZXh0IChzZWxlY3Rpb24pIC0+IHNlbGVjdGlvbi5vdXRkZW50U2VsZWN0ZWRSb3dzKClcblxuICAjIEV4dGVuZGVkOiBHZXQgdGhlIGluZGVudGF0aW9uIGxldmVsIG9mIHRoZSBnaXZlbiBsaW5lIG9mIHRleHQuXG4gICNcbiAgIyBEZXRlcm1pbmVzIGhvdyBkZWVwbHkgdGhlIGdpdmVuIGxpbmUgaXMgaW5kZW50ZWQgYmFzZWQgb24gdGhlIHNvZnQgdGFicyBhbmRcbiAgIyB0YWIgbGVuZ3RoIHNldHRpbmdzIG9mIHRoaXMgZWRpdG9yLiBOb3RlIHRoYXQgaWYgc29mdCB0YWJzIGFyZSBlbmFibGVkIGFuZFxuICAjIHRoZSB0YWIgbGVuZ3RoIGlzIDIsIGEgcm93IHdpdGggNCBsZWFkaW5nIHNwYWNlcyB3b3VsZCBoYXZlIGFuIGluZGVudGF0aW9uXG4gICMgbGV2ZWwgb2YgMi5cbiAgI1xuICAjICogYGxpbmVgIEEge1N0cmluZ30gcmVwcmVzZW50aW5nIGEgbGluZSBvZiB0ZXh0LlxuICAjXG4gICMgUmV0dXJucyBhIHtOdW1iZXJ9LlxuICBpbmRlbnRMZXZlbEZvckxpbmU6IChsaW5lKSAtPlxuICAgIEB0b2tlbml6ZWRCdWZmZXIuaW5kZW50TGV2ZWxGb3JMaW5lKGxpbmUpXG5cbiAgIyBFeHRlbmRlZDogSW5kZW50IHJvd3MgaW50ZXJzZWN0aW5nIHNlbGVjdGlvbnMgYmFzZWQgb24gdGhlIGdyYW1tYXIncyBzdWdnZXN0ZWRcbiAgIyBpbmRlbnQgbGV2ZWwuXG4gIGF1dG9JbmRlbnRTZWxlY3RlZFJvd3M6IC0+XG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uYXV0b0luZGVudFNlbGVjdGVkUm93cygpXG5cbiAgIyBJbmRlbnQgYWxsIGxpbmVzIGludGVyc2VjdGluZyBzZWxlY3Rpb25zLiBTZWUge1NlbGVjdGlvbjo6aW5kZW50fSBmb3IgbW9yZVxuICAjIGluZm9ybWF0aW9uLlxuICBpbmRlbnQ6IChvcHRpb25zPXt9KSAtPlxuICAgIG9wdGlvbnMuYXV0b0luZGVudCA/PSBAc2hvdWxkQXV0b0luZGVudCgpXG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPiBzZWxlY3Rpb24uaW5kZW50KG9wdGlvbnMpXG5cbiAgIyBDb25zdHJ1Y3RzIHRoZSBzdHJpbmcgdXNlZCBmb3IgaW5kZW50cy5cbiAgYnVpbGRJbmRlbnRTdHJpbmc6IChsZXZlbCwgY29sdW1uPTApIC0+XG4gICAgaWYgQGdldFNvZnRUYWJzKClcbiAgICAgIHRhYlN0b3BWaW9sYXRpb24gPSBjb2x1bW4gJSBAZ2V0VGFiTGVuZ3RoKClcbiAgICAgIF8ubXVsdGlwbHlTdHJpbmcoXCIgXCIsIE1hdGguZmxvb3IobGV2ZWwgKiBAZ2V0VGFiTGVuZ3RoKCkpIC0gdGFiU3RvcFZpb2xhdGlvbilcbiAgICBlbHNlXG4gICAgICBleGNlc3NXaGl0ZXNwYWNlID0gXy5tdWx0aXBseVN0cmluZygnICcsIE1hdGgucm91bmQoKGxldmVsIC0gTWF0aC5mbG9vcihsZXZlbCkpICogQGdldFRhYkxlbmd0aCgpKSlcbiAgICAgIF8ubXVsdGlwbHlTdHJpbmcoXCJcXHRcIiwgTWF0aC5mbG9vcihsZXZlbCkpICsgZXhjZXNzV2hpdGVzcGFjZVxuXG4gICMjI1xuICBTZWN0aW9uOiBHcmFtbWFyc1xuICAjIyNcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSBjdXJyZW50IHtHcmFtbWFyfSBvZiB0aGlzIGVkaXRvci5cbiAgZ2V0R3JhbW1hcjogLT5cbiAgICBAdG9rZW5pemVkQnVmZmVyLmdyYW1tYXJcblxuICAjIEVzc2VudGlhbDogU2V0IHRoZSBjdXJyZW50IHtHcmFtbWFyfSBvZiB0aGlzIGVkaXRvci5cbiAgI1xuICAjIEFzc2lnbmluZyBhIGdyYW1tYXIgd2lsbCBjYXVzZSB0aGUgZWRpdG9yIHRvIHJlLXRva2VuaXplIGJhc2VkIG9uIHRoZSBuZXdcbiAgIyBncmFtbWFyLlxuICAjXG4gICMgKiBgZ3JhbW1hcmAge0dyYW1tYXJ9XG4gIHNldEdyYW1tYXI6IChncmFtbWFyKSAtPlxuICAgIEB0b2tlbml6ZWRCdWZmZXIuc2V0R3JhbW1hcihncmFtbWFyKVxuXG4gICMgUmVsb2FkIHRoZSBncmFtbWFyIGJhc2VkIG9uIHRoZSBmaWxlIG5hbWUuXG4gIHJlbG9hZEdyYW1tYXI6IC0+XG4gICAgQHRva2VuaXplZEJ1ZmZlci5yZWxvYWRHcmFtbWFyKClcblxuICAjIEV4cGVyaW1lbnRhbDogR2V0IGEgbm90aWZpY2F0aW9uIHdoZW4gYXN5bmMgdG9rZW5pemF0aW9uIGlzIGNvbXBsZXRlZC5cbiAgb25EaWRUb2tlbml6ZTogKGNhbGxiYWNrKSAtPlxuICAgIEB0b2tlbml6ZWRCdWZmZXIub25EaWRUb2tlbml6ZShjYWxsYmFjaylcblxuICAjIyNcbiAgU2VjdGlvbjogTWFuYWdpbmcgU3ludGF4IFNjb3Blc1xuICAjIyNcblxuICAjIEVzc2VudGlhbDogUmV0dXJucyBhIHtTY29wZURlc2NyaXB0b3J9IHRoYXQgaW5jbHVkZXMgdGhpcyBlZGl0b3IncyBsYW5ndWFnZS5cbiAgIyBlLmcuIGBbJy5zb3VyY2UucnVieSddYCwgb3IgYFsnLnNvdXJjZS5jb2ZmZWUnXWAuIFlvdSBjYW4gdXNlIHRoaXMgd2l0aFxuICAjIHtDb25maWc6OmdldH0gdG8gZ2V0IGxhbmd1YWdlIHNwZWNpZmljIGNvbmZpZyB2YWx1ZXMuXG4gIGdldFJvb3RTY29wZURlc2NyaXB0b3I6IC0+XG4gICAgQHRva2VuaXplZEJ1ZmZlci5yb290U2NvcGVEZXNjcmlwdG9yXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUgc3ludGFjdGljIHNjb3BlRGVzY3JpcHRvciBmb3IgdGhlIGdpdmVuIHBvc2l0aW9uIGluIGJ1ZmZlclxuICAjIGNvb3JkaW5hdGVzLiBVc2VmdWwgd2l0aCB7Q29uZmlnOjpnZXR9LlxuICAjXG4gICMgRm9yIGV4YW1wbGUsIGlmIGNhbGxlZCB3aXRoIGEgcG9zaXRpb24gaW5zaWRlIHRoZSBwYXJhbWV0ZXIgbGlzdCBvZiBhblxuICAjIGFub255bW91cyBDb2ZmZWVTY3JpcHQgZnVuY3Rpb24sIHRoZSBtZXRob2QgcmV0dXJucyB0aGUgZm9sbG93aW5nIGFycmF5OlxuICAjIGBbXCJzb3VyY2UuY29mZmVlXCIsIFwibWV0YS5pbmxpbmUuZnVuY3Rpb24uY29mZmVlXCIsIFwidmFyaWFibGUucGFyYW1ldGVyLmZ1bmN0aW9uLmNvZmZlZVwiXWBcbiAgI1xuICAjICogYGJ1ZmZlclBvc2l0aW9uYCBBIHtQb2ludH0gb3Ige0FycmF5fSBvZiBbcm93LCBjb2x1bW5dLlxuICAjXG4gICMgUmV0dXJucyBhIHtTY29wZURlc2NyaXB0b3J9LlxuICBzY29wZURlc2NyaXB0b3JGb3JCdWZmZXJQb3NpdGlvbjogKGJ1ZmZlclBvc2l0aW9uKSAtPlxuICAgIEB0b2tlbml6ZWRCdWZmZXIuc2NvcGVEZXNjcmlwdG9yRm9yUG9zaXRpb24oYnVmZmVyUG9zaXRpb24pXG5cbiAgIyBFeHRlbmRlZDogR2V0IHRoZSByYW5nZSBpbiBidWZmZXIgY29vcmRpbmF0ZXMgb2YgYWxsIHRva2VucyBzdXJyb3VuZGluZyB0aGVcbiAgIyBjdXJzb3IgdGhhdCBtYXRjaCB0aGUgZ2l2ZW4gc2NvcGUgc2VsZWN0b3IuXG4gICNcbiAgIyBGb3IgZXhhbXBsZSwgaWYgeW91IHdhbnRlZCB0byBmaW5kIHRoZSBzdHJpbmcgc3Vycm91bmRpbmcgdGhlIGN1cnNvciwgeW91XG4gICMgY291bGQgY2FsbCBgZWRpdG9yLmJ1ZmZlclJhbmdlRm9yU2NvcGVBdEN1cnNvcihcIi5zdHJpbmcucXVvdGVkXCIpYC5cbiAgI1xuICAjICogYHNjb3BlU2VsZWN0b3JgIHtTdHJpbmd9IHNlbGVjdG9yLiBlLmcuIGAnLnNvdXJjZS5ydWJ5J2BcbiAgI1xuICAjIFJldHVybnMgYSB7UmFuZ2V9LlxuICBidWZmZXJSYW5nZUZvclNjb3BlQXRDdXJzb3I6IChzY29wZVNlbGVjdG9yKSAtPlxuICAgIEBidWZmZXJSYW5nZUZvclNjb3BlQXRQb3NpdGlvbihzY29wZVNlbGVjdG9yLCBAZ2V0Q3Vyc29yQnVmZmVyUG9zaXRpb24oKSlcblxuICBidWZmZXJSYW5nZUZvclNjb3BlQXRQb3NpdGlvbjogKHNjb3BlU2VsZWN0b3IsIHBvc2l0aW9uKSAtPlxuICAgIEB0b2tlbml6ZWRCdWZmZXIuYnVmZmVyUmFuZ2VGb3JTY29wZUF0UG9zaXRpb24oc2NvcGVTZWxlY3RvciwgcG9zaXRpb24pXG5cbiAgIyBFeHRlbmRlZDogRGV0ZXJtaW5lIGlmIHRoZSBnaXZlbiByb3cgaXMgZW50aXJlbHkgYSBjb21tZW50XG4gIGlzQnVmZmVyUm93Q29tbWVudGVkOiAoYnVmZmVyUm93KSAtPlxuICAgIGlmIG1hdGNoID0gQGxpbmVUZXh0Rm9yQnVmZmVyUm93KGJ1ZmZlclJvdykubWF0Y2goL1xcUy8pXG4gICAgICBAY29tbWVudFNjb3BlU2VsZWN0b3IgPz0gbmV3IFRleHRNYXRlU2NvcGVTZWxlY3RvcignY29tbWVudC4qJylcbiAgICAgIEBjb21tZW50U2NvcGVTZWxlY3Rvci5tYXRjaGVzKEBzY29wZURlc2NyaXB0b3JGb3JCdWZmZXJQb3NpdGlvbihbYnVmZmVyUm93LCBtYXRjaC5pbmRleF0pLnNjb3BlcylcblxuICAjIEdldCB0aGUgc2NvcGUgZGVzY3JpcHRvciBhdCB0aGUgY3Vyc29yLlxuICBnZXRDdXJzb3JTY29wZTogLT5cbiAgICBAZ2V0TGFzdEN1cnNvcigpLmdldFNjb3BlRGVzY3JpcHRvcigpXG5cbiAgdG9rZW5Gb3JCdWZmZXJQb3NpdGlvbjogKGJ1ZmZlclBvc2l0aW9uKSAtPlxuICAgIEB0b2tlbml6ZWRCdWZmZXIudG9rZW5Gb3JQb3NpdGlvbihidWZmZXJQb3NpdGlvbilcblxuICAjIyNcbiAgU2VjdGlvbjogQ2xpcGJvYXJkIE9wZXJhdGlvbnNcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IEZvciBlYWNoIHNlbGVjdGlvbiwgY29weSB0aGUgc2VsZWN0ZWQgdGV4dC5cbiAgY29weVNlbGVjdGVkVGV4dDogLT5cbiAgICBtYWludGFpbkNsaXBib2FyZCA9IGZhbHNlXG4gICAgZm9yIHNlbGVjdGlvbiBpbiBAZ2V0U2VsZWN0aW9uc09yZGVyZWRCeUJ1ZmZlclBvc2l0aW9uKClcbiAgICAgIGlmIHNlbGVjdGlvbi5pc0VtcHR5KClcbiAgICAgICAgcHJldmlvdXNSYW5nZSA9IHNlbGVjdGlvbi5nZXRCdWZmZXJSYW5nZSgpXG4gICAgICAgIHNlbGVjdGlvbi5zZWxlY3RMaW5lKClcbiAgICAgICAgc2VsZWN0aW9uLmNvcHkobWFpbnRhaW5DbGlwYm9hcmQsIHRydWUpXG4gICAgICAgIHNlbGVjdGlvbi5zZXRCdWZmZXJSYW5nZShwcmV2aW91c1JhbmdlKVxuICAgICAgZWxzZVxuICAgICAgICBzZWxlY3Rpb24uY29weShtYWludGFpbkNsaXBib2FyZCwgZmFsc2UpXG4gICAgICBtYWludGFpbkNsaXBib2FyZCA9IHRydWVcbiAgICByZXR1cm5cblxuICAjIFByaXZhdGU6IEZvciBlYWNoIHNlbGVjdGlvbiwgb25seSBjb3B5IGhpZ2hsaWdodGVkIHRleHQuXG4gIGNvcHlPbmx5U2VsZWN0ZWRUZXh0OiAtPlxuICAgIG1haW50YWluQ2xpcGJvYXJkID0gZmFsc2VcbiAgICBmb3Igc2VsZWN0aW9uIGluIEBnZXRTZWxlY3Rpb25zT3JkZXJlZEJ5QnVmZmVyUG9zaXRpb24oKVxuICAgICAgaWYgbm90IHNlbGVjdGlvbi5pc0VtcHR5KClcbiAgICAgICAgc2VsZWN0aW9uLmNvcHkobWFpbnRhaW5DbGlwYm9hcmQsIGZhbHNlKVxuICAgICAgICBtYWludGFpbkNsaXBib2FyZCA9IHRydWVcbiAgICByZXR1cm5cblxuICAjIEVzc2VudGlhbDogRm9yIGVhY2ggc2VsZWN0aW9uLCBjdXQgdGhlIHNlbGVjdGVkIHRleHQuXG4gIGN1dFNlbGVjdGVkVGV4dDogLT5cbiAgICBtYWludGFpbkNsaXBib2FyZCA9IGZhbHNlXG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPlxuICAgICAgaWYgc2VsZWN0aW9uLmlzRW1wdHkoKVxuICAgICAgICBzZWxlY3Rpb24uc2VsZWN0TGluZSgpXG4gICAgICAgIHNlbGVjdGlvbi5jdXQobWFpbnRhaW5DbGlwYm9hcmQsIHRydWUpXG4gICAgICBlbHNlXG4gICAgICAgIHNlbGVjdGlvbi5jdXQobWFpbnRhaW5DbGlwYm9hcmQsIGZhbHNlKVxuICAgICAgbWFpbnRhaW5DbGlwYm9hcmQgPSB0cnVlXG5cbiAgIyBFc3NlbnRpYWw6IEZvciBlYWNoIHNlbGVjdGlvbiwgcmVwbGFjZSB0aGUgc2VsZWN0ZWQgdGV4dCB3aXRoIHRoZSBjb250ZW50cyBvZlxuICAjIHRoZSBjbGlwYm9hcmQuXG4gICNcbiAgIyBJZiB0aGUgY2xpcGJvYXJkIGNvbnRhaW5zIHRoZSBzYW1lIG51bWJlciBvZiBzZWxlY3Rpb25zIGFzIHRoZSBjdXJyZW50XG4gICMgZWRpdG9yLCBlYWNoIHNlbGVjdGlvbiB3aWxsIGJlIHJlcGxhY2VkIHdpdGggdGhlIGNvbnRlbnQgb2YgdGhlXG4gICMgY29ycmVzcG9uZGluZyBjbGlwYm9hcmQgc2VsZWN0aW9uIHRleHQuXG4gICNcbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIFNlZSB7U2VsZWN0aW9uOjppbnNlcnRUZXh0fS5cbiAgcGFzdGVUZXh0OiAob3B0aW9ucz17fSkgLT5cbiAgICB7dGV4dDogY2xpcGJvYXJkVGV4dCwgbWV0YWRhdGF9ID0gQGNvbnN0cnVjdG9yLmNsaXBib2FyZC5yZWFkV2l0aE1ldGFkYXRhKClcbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIEBlbWl0V2lsbEluc2VydFRleHRFdmVudChjbGlwYm9hcmRUZXh0KVxuXG4gICAgbWV0YWRhdGEgPz0ge31cbiAgICBvcHRpb25zLmF1dG9JbmRlbnQgPSBAc2hvdWxkQXV0b0luZGVudE9uUGFzdGUoKVxuXG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uLCBpbmRleCkgPT5cbiAgICAgIGlmIG1ldGFkYXRhLnNlbGVjdGlvbnM/Lmxlbmd0aCBpcyBAZ2V0U2VsZWN0aW9ucygpLmxlbmd0aFxuICAgICAgICB7dGV4dCwgaW5kZW50QmFzaXMsIGZ1bGxMaW5lfSA9IG1ldGFkYXRhLnNlbGVjdGlvbnNbaW5kZXhdXG4gICAgICBlbHNlXG4gICAgICAgIHtpbmRlbnRCYXNpcywgZnVsbExpbmV9ID0gbWV0YWRhdGFcbiAgICAgICAgdGV4dCA9IGNsaXBib2FyZFRleHRcblxuICAgICAgZGVsZXRlIG9wdGlvbnMuaW5kZW50QmFzaXNcbiAgICAgIHtjdXJzb3J9ID0gc2VsZWN0aW9uXG4gICAgICBpZiBpbmRlbnRCYXNpcz9cbiAgICAgICAgY29udGFpbnNOZXdsaW5lcyA9IHRleHQuaW5kZXhPZignXFxuJykgaXNudCAtMVxuICAgICAgICBpZiBjb250YWluc05ld2xpbmVzIG9yIG5vdCBjdXJzb3IuaGFzUHJlY2VkaW5nQ2hhcmFjdGVyc09uTGluZSgpXG4gICAgICAgICAgb3B0aW9ucy5pbmRlbnRCYXNpcyA/PSBpbmRlbnRCYXNpc1xuXG4gICAgICByYW5nZSA9IG51bGxcbiAgICAgIGlmIGZ1bGxMaW5lIGFuZCBzZWxlY3Rpb24uaXNFbXB0eSgpXG4gICAgICAgIG9sZFBvc2l0aW9uID0gc2VsZWN0aW9uLmdldEJ1ZmZlclJhbmdlKCkuc3RhcnRcbiAgICAgICAgc2VsZWN0aW9uLnNldEJ1ZmZlclJhbmdlKFtbb2xkUG9zaXRpb24ucm93LCAwXSwgW29sZFBvc2l0aW9uLnJvdywgMF1dKVxuICAgICAgICByYW5nZSA9IHNlbGVjdGlvbi5pbnNlcnRUZXh0KHRleHQsIG9wdGlvbnMpXG4gICAgICAgIG5ld1Bvc2l0aW9uID0gb2xkUG9zaXRpb24udHJhbnNsYXRlKFsxLCAwXSlcbiAgICAgICAgc2VsZWN0aW9uLnNldEJ1ZmZlclJhbmdlKFtuZXdQb3NpdGlvbiwgbmV3UG9zaXRpb25dKVxuICAgICAgZWxzZVxuICAgICAgICByYW5nZSA9IHNlbGVjdGlvbi5pbnNlcnRUZXh0KHRleHQsIG9wdGlvbnMpXG5cbiAgICAgIGRpZEluc2VydEV2ZW50ID0ge3RleHQsIHJhbmdlfVxuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWluc2VydC10ZXh0JywgZGlkSW5zZXJ0RXZlbnRcblxuICAjIEVzc2VudGlhbDogRm9yIGVhY2ggc2VsZWN0aW9uLCBpZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCBjdXQgYWxsIGNoYXJhY3RlcnNcbiAgIyBvZiB0aGUgY29udGFpbmluZyBzY3JlZW4gbGluZSBmb2xsb3dpbmcgdGhlIGN1cnNvci4gT3RoZXJ3aXNlIGN1dCB0aGUgc2VsZWN0ZWRcbiAgIyB0ZXh0LlxuICBjdXRUb0VuZE9mTGluZTogLT5cbiAgICBtYWludGFpbkNsaXBib2FyZCA9IGZhbHNlXG4gICAgQG11dGF0ZVNlbGVjdGVkVGV4dCAoc2VsZWN0aW9uKSAtPlxuICAgICAgc2VsZWN0aW9uLmN1dFRvRW5kT2ZMaW5lKG1haW50YWluQ2xpcGJvYXJkKVxuICAgICAgbWFpbnRhaW5DbGlwYm9hcmQgPSB0cnVlXG5cbiAgIyBFc3NlbnRpYWw6IEZvciBlYWNoIHNlbGVjdGlvbiwgaWYgdGhlIHNlbGVjdGlvbiBpcyBlbXB0eSwgY3V0IGFsbCBjaGFyYWN0ZXJzXG4gICMgb2YgdGhlIGNvbnRhaW5pbmcgYnVmZmVyIGxpbmUgZm9sbG93aW5nIHRoZSBjdXJzb3IuIE90aGVyd2lzZSBjdXQgdGhlXG4gICMgc2VsZWN0ZWQgdGV4dC5cbiAgY3V0VG9FbmRPZkJ1ZmZlckxpbmU6IC0+XG4gICAgbWFpbnRhaW5DbGlwYm9hcmQgPSBmYWxzZVxuICAgIEBtdXRhdGVTZWxlY3RlZFRleHQgKHNlbGVjdGlvbikgLT5cbiAgICAgIHNlbGVjdGlvbi5jdXRUb0VuZE9mQnVmZmVyTGluZShtYWludGFpbkNsaXBib2FyZClcbiAgICAgIG1haW50YWluQ2xpcGJvYXJkID0gdHJ1ZVxuXG4gICMjI1xuICBTZWN0aW9uOiBGb2xkc1xuICAjIyNcblxuICAjIEVzc2VudGlhbDogRm9sZCB0aGUgbW9zdCByZWNlbnQgY3Vyc29yJ3Mgcm93IGJhc2VkIG9uIGl0cyBpbmRlbnRhdGlvbiBsZXZlbC5cbiAgI1xuICAjIFRoZSBmb2xkIHdpbGwgZXh0ZW5kIGZyb20gdGhlIG5lYXJlc3QgcHJlY2VkaW5nIGxpbmUgd2l0aCBhIGxvd2VyXG4gICMgaW5kZW50YXRpb24gbGV2ZWwgdXAgdG8gdGhlIG5lYXJlc3QgZm9sbG93aW5nIHJvdyB3aXRoIGEgbG93ZXIgaW5kZW50YXRpb25cbiAgIyBsZXZlbC5cbiAgZm9sZEN1cnJlbnRSb3c6IC0+XG4gICAgYnVmZmVyUm93ID0gQGJ1ZmZlclBvc2l0aW9uRm9yU2NyZWVuUG9zaXRpb24oQGdldEN1cnNvclNjcmVlblBvc2l0aW9uKCkpLnJvd1xuICAgIEBmb2xkQnVmZmVyUm93KGJ1ZmZlclJvdylcblxuICAjIEVzc2VudGlhbDogVW5mb2xkIHRoZSBtb3N0IHJlY2VudCBjdXJzb3IncyByb3cgYnkgb25lIGxldmVsLlxuICB1bmZvbGRDdXJyZW50Um93OiAtPlxuICAgIGJ1ZmZlclJvdyA9IEBidWZmZXJQb3NpdGlvbkZvclNjcmVlblBvc2l0aW9uKEBnZXRDdXJzb3JTY3JlZW5Qb3NpdGlvbigpKS5yb3dcbiAgICBAdW5mb2xkQnVmZmVyUm93KGJ1ZmZlclJvdylcblxuICAjIEVzc2VudGlhbDogRm9sZCB0aGUgZ2l2ZW4gcm93IGluIGJ1ZmZlciBjb29yZGluYXRlcyBiYXNlZCBvbiBpdHMgaW5kZW50YXRpb25cbiAgIyBsZXZlbC5cbiAgI1xuICAjIElmIHRoZSBnaXZlbiByb3cgaXMgZm9sZGFibGUsIHRoZSBmb2xkIHdpbGwgYmVnaW4gdGhlcmUuIE90aGVyd2lzZSwgaXQgd2lsbFxuICAjIGJlZ2luIGF0IHRoZSBmaXJzdCBmb2xkYWJsZSByb3cgcHJlY2VkaW5nIHRoZSBnaXZlbiByb3cuXG4gICNcbiAgIyAqIGBidWZmZXJSb3dgIEEge051bWJlcn0uXG4gIGZvbGRCdWZmZXJSb3c6IChidWZmZXJSb3cpIC0+XG4gICAgQGxhbmd1YWdlTW9kZS5mb2xkQnVmZmVyUm93KGJ1ZmZlclJvdylcblxuICAjIEVzc2VudGlhbDogVW5mb2xkIGFsbCBmb2xkcyBjb250YWluaW5nIHRoZSBnaXZlbiByb3cgaW4gYnVmZmVyIGNvb3JkaW5hdGVzLlxuICAjXG4gICMgKiBgYnVmZmVyUm93YCBBIHtOdW1iZXJ9XG4gIHVuZm9sZEJ1ZmZlclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICBAZGlzcGxheUxheWVyLmRlc3Ryb3lGb2xkc0ludGVyc2VjdGluZ0J1ZmZlclJhbmdlKFJhbmdlKFBvaW50KGJ1ZmZlclJvdywgMCksIFBvaW50KGJ1ZmZlclJvdywgSW5maW5pdHkpKSlcblxuICAjIEV4dGVuZGVkOiBGb3IgZWFjaCBzZWxlY3Rpb24sIGZvbGQgdGhlIHJvd3MgaXQgaW50ZXJzZWN0cy5cbiAgZm9sZFNlbGVjdGVkTGluZXM6IC0+XG4gICAgc2VsZWN0aW9uLmZvbGQoKSBmb3Igc2VsZWN0aW9uIGluIEBnZXRTZWxlY3Rpb25zKClcbiAgICByZXR1cm5cblxuICAjIEV4dGVuZGVkOiBGb2xkIGFsbCBmb2xkYWJsZSBsaW5lcy5cbiAgZm9sZEFsbDogLT5cbiAgICBAbGFuZ3VhZ2VNb2RlLmZvbGRBbGwoKVxuXG4gICMgRXh0ZW5kZWQ6IFVuZm9sZCBhbGwgZXhpc3RpbmcgZm9sZHMuXG4gIHVuZm9sZEFsbDogLT5cbiAgICBAbGFuZ3VhZ2VNb2RlLnVuZm9sZEFsbCgpXG4gICAgQHNjcm9sbFRvQ3Vyc29yUG9zaXRpb24oKVxuXG4gICMgRXh0ZW5kZWQ6IEZvbGQgYWxsIGZvbGRhYmxlIGxpbmVzIGF0IHRoZSBnaXZlbiBpbmRlbnQgbGV2ZWwuXG4gICNcbiAgIyAqIGBsZXZlbGAgQSB7TnVtYmVyfS5cbiAgZm9sZEFsbEF0SW5kZW50TGV2ZWw6IChsZXZlbCkgLT5cbiAgICBAbGFuZ3VhZ2VNb2RlLmZvbGRBbGxBdEluZGVudExldmVsKGxldmVsKVxuXG4gICMgRXh0ZW5kZWQ6IERldGVybWluZSB3aGV0aGVyIHRoZSBnaXZlbiByb3cgaW4gYnVmZmVyIGNvb3JkaW5hdGVzIGlzIGZvbGRhYmxlLlxuICAjXG4gICMgQSAqZm9sZGFibGUqIHJvdyBpcyBhIHJvdyB0aGF0ICpzdGFydHMqIGEgcm93IHJhbmdlIHRoYXQgY2FuIGJlIGZvbGRlZC5cbiAgI1xuICAjICogYGJ1ZmZlclJvd2AgQSB7TnVtYmVyfVxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufS5cbiAgaXNGb2xkYWJsZUF0QnVmZmVyUm93OiAoYnVmZmVyUm93KSAtPlxuICAgIEB0b2tlbml6ZWRCdWZmZXIuaXNGb2xkYWJsZUF0Um93KGJ1ZmZlclJvdylcblxuICAjIEV4dGVuZGVkOiBEZXRlcm1pbmUgd2hldGhlciB0aGUgZ2l2ZW4gcm93IGluIHNjcmVlbiBjb29yZGluYXRlcyBpcyBmb2xkYWJsZS5cbiAgI1xuICAjIEEgKmZvbGRhYmxlKiByb3cgaXMgYSByb3cgdGhhdCAqc3RhcnRzKiBhIHJvdyByYW5nZSB0aGF0IGNhbiBiZSBmb2xkZWQuXG4gICNcbiAgIyAqIGBidWZmZXJSb3dgIEEge051bWJlcn1cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0uXG4gIGlzRm9sZGFibGVBdFNjcmVlblJvdzogKHNjcmVlblJvdykgLT5cbiAgICBAaXNGb2xkYWJsZUF0QnVmZmVyUm93KEBidWZmZXJSb3dGb3JTY3JlZW5Sb3coc2NyZWVuUm93KSlcblxuICAjIEV4dGVuZGVkOiBGb2xkIHRoZSBnaXZlbiBidWZmZXIgcm93IGlmIGl0IGlzbid0IGN1cnJlbnRseSBmb2xkZWQsIGFuZCB1bmZvbGRcbiAgIyBpdCBvdGhlcndpc2UuXG4gIHRvZ2dsZUZvbGRBdEJ1ZmZlclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICBpZiBAaXNGb2xkZWRBdEJ1ZmZlclJvdyhidWZmZXJSb3cpXG4gICAgICBAdW5mb2xkQnVmZmVyUm93KGJ1ZmZlclJvdylcbiAgICBlbHNlXG4gICAgICBAZm9sZEJ1ZmZlclJvdyhidWZmZXJSb3cpXG5cbiAgIyBFeHRlbmRlZDogRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIG1vc3QgcmVjZW50bHkgYWRkZWQgY3Vyc29yJ3Mgcm93IGlzIGZvbGRlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0uXG4gIGlzRm9sZGVkQXRDdXJzb3JSb3c6IC0+XG4gICAgQGlzRm9sZGVkQXRTY3JlZW5Sb3coQGdldEN1cnNvclNjcmVlblBvc2l0aW9uKCkucm93KVxuXG4gICMgRXh0ZW5kZWQ6IERldGVybWluZSB3aGV0aGVyIHRoZSBnaXZlbiByb3cgaW4gYnVmZmVyIGNvb3JkaW5hdGVzIGlzIGZvbGRlZC5cbiAgI1xuICAjICogYGJ1ZmZlclJvd2AgQSB7TnVtYmVyfVxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufS5cbiAgaXNGb2xkZWRBdEJ1ZmZlclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICBAZGlzcGxheUxheWVyLmZvbGRzSW50ZXJzZWN0aW5nQnVmZmVyUmFuZ2UoUmFuZ2UoUG9pbnQoYnVmZmVyUm93LCAwKSwgUG9pbnQoYnVmZmVyUm93LCBJbmZpbml0eSkpKS5sZW5ndGggPiAwXG5cbiAgIyBFeHRlbmRlZDogRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGdpdmVuIHJvdyBpbiBzY3JlZW4gY29vcmRpbmF0ZXMgaXMgZm9sZGVkLlxuICAjXG4gICMgKiBgc2NyZWVuUm93YCBBIHtOdW1iZXJ9XG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICBpc0ZvbGRlZEF0U2NyZWVuUm93OiAoc2NyZWVuUm93KSAtPlxuICAgIEBpc0ZvbGRlZEF0QnVmZmVyUm93KEBidWZmZXJSb3dGb3JTY3JlZW5Sb3coc2NyZWVuUm93KSlcblxuICAjIENyZWF0ZXMgYSBuZXcgZm9sZCBiZXR3ZWVuIHR3byByb3cgbnVtYmVycy5cbiAgI1xuICAjIHN0YXJ0Um93IC0gVGhlIHJvdyB7TnVtYmVyfSB0byBzdGFydCBmb2xkaW5nIGF0XG4gICMgZW5kUm93IC0gVGhlIHJvdyB7TnVtYmVyfSB0byBlbmQgdGhlIGZvbGRcbiAgI1xuICAjIFJldHVybnMgdGhlIG5ldyB7Rm9sZH0uXG4gIGZvbGRCdWZmZXJSb3dSYW5nZTogKHN0YXJ0Um93LCBlbmRSb3cpIC0+XG4gICAgQGZvbGRCdWZmZXJSYW5nZShSYW5nZShQb2ludChzdGFydFJvdywgSW5maW5pdHkpLCBQb2ludChlbmRSb3csIEluZmluaXR5KSkpXG5cbiAgZm9sZEJ1ZmZlclJhbmdlOiAocmFuZ2UpIC0+XG4gICAgQGRpc3BsYXlMYXllci5mb2xkQnVmZmVyUmFuZ2UocmFuZ2UpXG5cbiAgIyBSZW1vdmUgYW55IHtGb2xkfXMgZm91bmQgdGhhdCBpbnRlcnNlY3QgdGhlIGdpdmVuIGJ1ZmZlciByYW5nZS5cbiAgZGVzdHJveUZvbGRzSW50ZXJzZWN0aW5nQnVmZmVyUmFuZ2U6IChidWZmZXJSYW5nZSkgLT5cbiAgICBAZGlzcGxheUxheWVyLmRlc3Ryb3lGb2xkc0ludGVyc2VjdGluZ0J1ZmZlclJhbmdlKGJ1ZmZlclJhbmdlKVxuXG4gICMjI1xuICBTZWN0aW9uOiBHdXR0ZXJzXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBBZGQgYSBjdXN0b20ge0d1dHRlcn0uXG4gICNcbiAgIyAqIGBvcHRpb25zYCBBbiB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOlxuICAjICAgKiBgbmFtZWAgKHJlcXVpcmVkKSBBIHVuaXF1ZSB7U3RyaW5nfSB0byBpZGVudGlmeSB0aGlzIGd1dHRlci5cbiAgIyAgICogYHByaW9yaXR5YCAob3B0aW9uYWwpIEEge051bWJlcn0gdGhhdCBkZXRlcm1pbmVzIHN0YWNraW5nIG9yZGVyIGJldHdlZW5cbiAgIyAgICAgICBndXR0ZXJzLiBMb3dlciBwcmlvcml0eSBpdGVtcyBhcmUgZm9yY2VkIGNsb3NlciB0byB0aGUgZWRnZXMgb2YgdGhlXG4gICMgICAgICAgd2luZG93LiAoZGVmYXVsdDogLTEwMClcbiAgIyAgICogYHZpc2libGVgIChvcHRpb25hbCkge0Jvb2xlYW59IHNwZWNpZnlpbmcgd2hldGhlciB0aGUgZ3V0dGVyIGlzIHZpc2libGVcbiAgIyAgICAgICBpbml0aWFsbHkgYWZ0ZXIgYmVpbmcgY3JlYXRlZC4gKGRlZmF1bHQ6IHRydWUpXG4gICNcbiAgIyBSZXR1cm5zIHRoZSBuZXdseS1jcmVhdGVkIHtHdXR0ZXJ9LlxuICBhZGRHdXR0ZXI6IChvcHRpb25zKSAtPlxuICAgIEBndXR0ZXJDb250YWluZXIuYWRkR3V0dGVyKG9wdGlvbnMpXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGlzIGVkaXRvcidzIGd1dHRlcnMuXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2Yge0d1dHRlcn1zLlxuICBnZXRHdXR0ZXJzOiAtPlxuICAgIEBndXR0ZXJDb250YWluZXIuZ2V0R3V0dGVycygpXG5cbiAgIyBFc3NlbnRpYWw6IEdldCB0aGUgZ3V0dGVyIHdpdGggdGhlIGdpdmVuIG5hbWUuXG4gICNcbiAgIyBSZXR1cm5zIGEge0d1dHRlcn0sIG9yIGBudWxsYCBpZiBubyBndXR0ZXIgZXhpc3RzIGZvciB0aGUgZ2l2ZW4gbmFtZS5cbiAgZ3V0dGVyV2l0aE5hbWU6IChuYW1lKSAtPlxuICAgIEBndXR0ZXJDb250YWluZXIuZ3V0dGVyV2l0aE5hbWUobmFtZSlcblxuICAjIyNcbiAgU2VjdGlvbjogU2Nyb2xsaW5nIHRoZSBUZXh0RWRpdG9yXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBTY3JvbGwgdGhlIGVkaXRvciB0byByZXZlYWwgdGhlIG1vc3QgcmVjZW50bHkgYWRkZWQgY3Vyc29yIGlmIGl0IGlzXG4gICMgb2ZmLXNjcmVlbi5cbiAgI1xuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkge09iamVjdH1cbiAgIyAgICogYGNlbnRlcmAgQ2VudGVyIHRoZSBlZGl0b3IgYXJvdW5kIHRoZSBjdXJzb3IgaWYgcG9zc2libGUuIChkZWZhdWx0OiB0cnVlKVxuICBzY3JvbGxUb0N1cnNvclBvc2l0aW9uOiAob3B0aW9ucykgLT5cbiAgICBAZ2V0TGFzdEN1cnNvcigpLmF1dG9zY3JvbGwoY2VudGVyOiBvcHRpb25zPy5jZW50ZXIgPyB0cnVlKVxuXG4gICMgRXNzZW50aWFsOiBTY3JvbGxzIHRoZSBlZGl0b3IgdG8gdGhlIGdpdmVuIGJ1ZmZlciBwb3NpdGlvbi5cbiAgI1xuICAjICogYGJ1ZmZlclBvc2l0aW9uYCBBbiBvYmplY3QgdGhhdCByZXByZXNlbnRzIGEgYnVmZmVyIHBvc2l0aW9uLiBJdCBjYW4gYmUgZWl0aGVyXG4gICMgICBhbiB7T2JqZWN0fSAoYHtyb3csIGNvbHVtbn1gKSwge0FycmF5fSAoYFtyb3csIGNvbHVtbl1gKSwgb3Ige1BvaW50fVxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkge09iamVjdH1cbiAgIyAgICogYGNlbnRlcmAgQ2VudGVyIHRoZSBlZGl0b3IgYXJvdW5kIHRoZSBwb3NpdGlvbiBpZiBwb3NzaWJsZS4gKGRlZmF1bHQ6IGZhbHNlKVxuICBzY3JvbGxUb0J1ZmZlclBvc2l0aW9uOiAoYnVmZmVyUG9zaXRpb24sIG9wdGlvbnMpIC0+XG4gICAgQHNjcm9sbFRvU2NyZWVuUG9zaXRpb24oQHNjcmVlblBvc2l0aW9uRm9yQnVmZmVyUG9zaXRpb24oYnVmZmVyUG9zaXRpb24pLCBvcHRpb25zKVxuXG4gICMgRXNzZW50aWFsOiBTY3JvbGxzIHRoZSBlZGl0b3IgdG8gdGhlIGdpdmVuIHNjcmVlbiBwb3NpdGlvbi5cbiAgI1xuICAjICogYHNjcmVlblBvc2l0aW9uYCBBbiBvYmplY3QgdGhhdCByZXByZXNlbnRzIGEgc2NyZWVuIHBvc2l0aW9uLiBJdCBjYW4gYmUgZWl0aGVyXG4gICMgICAgYW4ge09iamVjdH0gKGB7cm93LCBjb2x1bW59YCksIHtBcnJheX0gKGBbcm93LCBjb2x1bW5dYCksIG9yIHtQb2ludH1cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9XG4gICMgICAqIGBjZW50ZXJgIENlbnRlciB0aGUgZWRpdG9yIGFyb3VuZCB0aGUgcG9zaXRpb24gaWYgcG9zc2libGUuIChkZWZhdWx0OiBmYWxzZSlcbiAgc2Nyb2xsVG9TY3JlZW5Qb3NpdGlvbjogKHNjcmVlblBvc2l0aW9uLCBvcHRpb25zKSAtPlxuICAgIEBzY3JvbGxUb1NjcmVlblJhbmdlKG5ldyBSYW5nZShzY3JlZW5Qb3NpdGlvbiwgc2NyZWVuUG9zaXRpb24pLCBvcHRpb25zKVxuXG4gIHNjcm9sbFRvVG9wOiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6c2Nyb2xsVG9Ub3AgaW5zdGVhZC5cIilcblxuICAgIEBnZXRFbGVtZW50KCkuc2Nyb2xsVG9Ub3AoKVxuXG4gIHNjcm9sbFRvQm90dG9tOiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6c2Nyb2xsVG9Ub3AgaW5zdGVhZC5cIilcblxuICAgIEBnZXRFbGVtZW50KCkuc2Nyb2xsVG9Cb3R0b20oKVxuXG4gIHNjcm9sbFRvU2NyZWVuUmFuZ2U6IChzY3JlZW5SYW5nZSwgb3B0aW9ucyA9IHt9KSAtPlxuICAgIHNjcm9sbEV2ZW50ID0ge3NjcmVlblJhbmdlLCBvcHRpb25zfVxuICAgIEBlbWl0dGVyLmVtaXQgXCJkaWQtcmVxdWVzdC1hdXRvc2Nyb2xsXCIsIHNjcm9sbEV2ZW50XG5cbiAgZ2V0SG9yaXpvbnRhbFNjcm9sbGJhckhlaWdodDogLT5cbiAgICBHcmltLmRlcHJlY2F0ZShcIlRoaXMgaXMgbm93IGEgdmlldyBtZXRob2QuIENhbGwgVGV4dEVkaXRvckVsZW1lbnQ6OmdldEhvcml6b250YWxTY3JvbGxiYXJIZWlnaHQgaW5zdGVhZC5cIilcblxuICAgIEBnZXRFbGVtZW50KCkuZ2V0SG9yaXpvbnRhbFNjcm9sbGJhckhlaWdodCgpXG5cbiAgZ2V0VmVydGljYWxTY3JvbGxiYXJXaWR0aDogLT5cbiAgICBHcmltLmRlcHJlY2F0ZShcIlRoaXMgaXMgbm93IGEgdmlldyBtZXRob2QuIENhbGwgVGV4dEVkaXRvckVsZW1lbnQ6OmdldFZlcnRpY2FsU2Nyb2xsYmFyV2lkdGggaW5zdGVhZC5cIilcblxuICAgIEBnZXRFbGVtZW50KCkuZ2V0VmVydGljYWxTY3JvbGxiYXJXaWR0aCgpXG5cbiAgcGFnZVVwOiAtPlxuICAgIEBtb3ZlVXAoQGdldFJvd3NQZXJQYWdlKCkpXG5cbiAgcGFnZURvd246IC0+XG4gICAgQG1vdmVEb3duKEBnZXRSb3dzUGVyUGFnZSgpKVxuXG4gIHNlbGVjdFBhZ2VVcDogLT5cbiAgICBAc2VsZWN0VXAoQGdldFJvd3NQZXJQYWdlKCkpXG5cbiAgc2VsZWN0UGFnZURvd246IC0+XG4gICAgQHNlbGVjdERvd24oQGdldFJvd3NQZXJQYWdlKCkpXG5cbiAgIyBSZXR1cm5zIHRoZSBudW1iZXIgb2Ygcm93cyBwZXIgcGFnZVxuICBnZXRSb3dzUGVyUGFnZTogLT5cbiAgICBNYXRoLm1heChAcm93c1BlclBhZ2UgPyAxLCAxKVxuXG4gIHNldFJvd3NQZXJQYWdlOiAoQHJvd3NQZXJQYWdlKSAtPlxuXG4gICMjI1xuICBTZWN0aW9uOiBDb25maWdcbiAgIyMjXG5cbiAgIyBFeHBlcmltZW50YWw6IFN1cHBseSBhbiBvYmplY3QgdGhhdCB3aWxsIHByb3ZpZGUgdGhlIGVkaXRvciB3aXRoIHNldHRpbmdzXG4gICMgZm9yIHNwZWNpZmljIHN5bnRhY3RpYyBzY29wZXMuIFNlZSB0aGUgYFNjb3BlZFNldHRpbmdzRGVsZWdhdGVgIGluXG4gICMgYHRleHQtZWRpdG9yLXJlZ2lzdHJ5LmpzYCBmb3IgYW4gZXhhbXBsZSBpbXBsZW1lbnRhdGlvbi5cbiAgc2V0U2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZTogKEBzY29wZWRTZXR0aW5nc0RlbGVnYXRlKSAtPlxuXG4gICMgRXhwZXJpbWVudGFsOiBSZXRyaWV2ZSB0aGUge09iamVjdH0gdGhhdCBwcm92aWRlcyB0aGUgZWRpdG9yIHdpdGggc2V0dGluZ3NcbiAgIyBmb3Igc3BlY2lmaWMgc3ludGFjdGljIHNjb3Blcy5cbiAgZ2V0U2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZTogLT4gQHNjb3BlZFNldHRpbmdzRGVsZWdhdGVcblxuICAjIEV4cGVyaW1lbnRhbDogSXMgYXV0by1pbmRlbnRhdGlvbiBlbmFibGVkIGZvciB0aGlzIGVkaXRvcj9cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0uXG4gIHNob3VsZEF1dG9JbmRlbnQ6IC0+IEBhdXRvSW5kZW50XG5cbiAgIyBFeHBlcmltZW50YWw6IElzIGF1dG8taW5kZW50YXRpb24gb24gcGFzdGUgZW5hYmxlZCBmb3IgdGhpcyBlZGl0b3I/XG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICBzaG91bGRBdXRvSW5kZW50T25QYXN0ZTogLT4gQGF1dG9JbmRlbnRPblBhc3RlXG5cbiAgIyBFeHBlcmltZW50YWw6IERvZXMgdGhpcyBlZGl0b3IgYWxsb3cgc2Nyb2xsaW5nIHBhc3QgdGhlIGxhc3QgbGluZT9cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0uXG4gIGdldFNjcm9sbFBhc3RFbmQ6IC0+IEBzY3JvbGxQYXN0RW5kXG5cbiAgIyBFeHBlcmltZW50YWw6IEhvdyBmYXN0IGRvZXMgdGhlIGVkaXRvciBzY3JvbGwgaW4gcmVzcG9uc2UgdG8gbW91c2Ugd2hlZWxcbiAgIyBtb3ZlbWVudHM/XG4gICNcbiAgIyBSZXR1cm5zIGEgcG9zaXRpdmUge051bWJlcn0uXG4gIGdldFNjcm9sbFNlbnNpdGl2aXR5OiAtPiBAc2Nyb2xsU2Vuc2l0aXZpdHlcblxuICAjIEV4cGVyaW1lbnRhbDogRG9lcyB0aGlzIGVkaXRvciBzaG93IGN1cnNvcnMgd2hpbGUgdGhlcmUgaXMgYSBzZWxlY3Rpb24/XG4gICNcbiAgIyBSZXR1cm5zIGEgcG9zaXRpdmUge0Jvb2xlYW59LlxuICBnZXRTaG93Q3Vyc29yT25TZWxlY3Rpb246IC0+IEBzaG93Q3Vyc29yT25TZWxlY3Rpb25cblxuICAjIEV4cGVyaW1lbnRhbDogQXJlIGxpbmUgbnVtYmVycyBlbmFibGVkIGZvciB0aGlzIGVkaXRvcj9cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn1cbiAgZG9lc1Nob3dMaW5lTnVtYmVyczogLT4gQHNob3dMaW5lTnVtYmVyc1xuXG4gICMgRXhwZXJpbWVudGFsOiBHZXQgdGhlIHRpbWUgaW50ZXJ2YWwgd2l0aGluIHdoaWNoIHRleHQgZWRpdGluZyBvcGVyYXRpb25zXG4gICMgYXJlIGdyb3VwZWQgdG9nZXRoZXIgaW4gdGhlIGVkaXRvcidzIHVuZG8gaGlzdG9yeS5cbiAgI1xuICAjIFJldHVybnMgdGhlIHRpbWUgaW50ZXJ2YWwge051bWJlcn0gaW4gbWlsbGlzZWNvbmRzLlxuICBnZXRVbmRvR3JvdXBpbmdJbnRlcnZhbDogLT4gQHVuZG9Hcm91cGluZ0ludGVydmFsXG5cbiAgIyBFeHBlcmltZW50YWw6IEdldCB0aGUgY2hhcmFjdGVycyB0aGF0IGFyZSAqbm90KiBjb25zaWRlcmVkIHBhcnQgb2Ygd29yZHMsXG4gICMgZm9yIHRoZSBwdXJwb3NlIG9mIHdvcmQtYmFzZWQgY3Vyc29yIG1vdmVtZW50cy5cbiAgI1xuICAjIFJldHVybnMgYSB7U3RyaW5nfSBjb250YWluaW5nIHRoZSBub24td29yZCBjaGFyYWN0ZXJzLlxuICBnZXROb25Xb3JkQ2hhcmFjdGVyczogKHNjb3BlcykgLT5cbiAgICBAc2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZT8uZ2V0Tm9uV29yZENoYXJhY3RlcnM/KHNjb3BlcykgPyBAbm9uV29yZENoYXJhY3RlcnNcblxuICBnZXRDb21tZW50U3RyaW5nczogKHNjb3BlcykgLT5cbiAgICBAc2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZT8uZ2V0Q29tbWVudFN0cmluZ3M/KHNjb3BlcylcblxuICBnZXRJbmNyZWFzZUluZGVudFBhdHRlcm46IChzY29wZXMpIC0+XG4gICAgQHNjb3BlZFNldHRpbmdzRGVsZWdhdGU/LmdldEluY3JlYXNlSW5kZW50UGF0dGVybj8oc2NvcGVzKVxuXG4gIGdldERlY3JlYXNlSW5kZW50UGF0dGVybjogKHNjb3BlcykgLT5cbiAgICBAc2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZT8uZ2V0RGVjcmVhc2VJbmRlbnRQYXR0ZXJuPyhzY29wZXMpXG5cbiAgZ2V0RGVjcmVhc2VOZXh0SW5kZW50UGF0dGVybjogKHNjb3BlcykgLT5cbiAgICBAc2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZT8uZ2V0RGVjcmVhc2VOZXh0SW5kZW50UGF0dGVybj8oc2NvcGVzKVxuXG4gIGdldEZvbGRFbmRQYXR0ZXJuOiAoc2NvcGVzKSAtPlxuICAgIEBzY29wZWRTZXR0aW5nc0RlbGVnYXRlPy5nZXRGb2xkRW5kUGF0dGVybj8oc2NvcGVzKVxuXG4gICMjI1xuICBTZWN0aW9uOiBFdmVudCBIYW5kbGVyc1xuICAjIyNcblxuICBoYW5kbGVHcmFtbWFyQ2hhbmdlOiAtPlxuICAgIEB1bmZvbGRBbGwoKVxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2UtZ3JhbW1hcicsIEBnZXRHcmFtbWFyKClcblxuICAjIyNcbiAgU2VjdGlvbjogVGV4dEVkaXRvciBSZW5kZXJpbmdcbiAgIyMjXG5cbiAgIyBHZXQgdGhlIEVsZW1lbnQgZm9yIHRoZSBlZGl0b3IuXG4gIGdldEVsZW1lbnQ6IC0+XG4gICAgQGVkaXRvckVsZW1lbnQgPz0gbmV3IFRleHRFZGl0b3JFbGVtZW50KCkuaW5pdGlhbGl6ZSh0aGlzLCBhdG9tKVxuXG4gIGdldEFsbG93ZWRMb2NhdGlvbnM6IC0+XG4gICAgWydjZW50ZXInXVxuXG4gICMgRXNzZW50aWFsOiBSZXRyaWV2ZXMgdGhlIGdyZXllZCBvdXQgcGxhY2Vob2xkZXIgb2YgYSBtaW5pIGVkaXRvci5cbiAgI1xuICAjIFJldHVybnMgYSB7U3RyaW5nfS5cbiAgZ2V0UGxhY2Vob2xkZXJUZXh0OiAtPiBAcGxhY2Vob2xkZXJUZXh0XG5cbiAgIyBFc3NlbnRpYWw6IFNldCB0aGUgZ3JleWVkIG91dCBwbGFjZWhvbGRlciBvZiBhIG1pbmkgZWRpdG9yLiBQbGFjZWhvbGRlciB0ZXh0XG4gICMgd2lsbCBiZSBkaXNwbGF5ZWQgd2hlbiB0aGUgZWRpdG9yIGhhcyBubyBjb250ZW50LlxuICAjXG4gICMgKiBgcGxhY2Vob2xkZXJUZXh0YCB7U3RyaW5nfSB0ZXh0IHRoYXQgaXMgZGlzcGxheWVkIHdoZW4gdGhlIGVkaXRvciBoYXMgbm8gY29udGVudC5cbiAgc2V0UGxhY2Vob2xkZXJUZXh0OiAocGxhY2Vob2xkZXJUZXh0KSAtPiBAdXBkYXRlKHtwbGFjZWhvbGRlclRleHR9KVxuXG4gIHBpeGVsUG9zaXRpb25Gb3JCdWZmZXJQb3NpdGlvbjogKGJ1ZmZlclBvc2l0aW9uKSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBtZXRob2QgaXMgZGVwcmVjYXRlZCBvbiB0aGUgbW9kZWwgbGF5ZXIuIFVzZSBgVGV4dEVkaXRvckVsZW1lbnQ6OnBpeGVsUG9zaXRpb25Gb3JCdWZmZXJQb3NpdGlvbmAgaW5zdGVhZFwiKVxuICAgIEBnZXRFbGVtZW50KCkucGl4ZWxQb3NpdGlvbkZvckJ1ZmZlclBvc2l0aW9uKGJ1ZmZlclBvc2l0aW9uKVxuXG4gIHBpeGVsUG9zaXRpb25Gb3JTY3JlZW5Qb3NpdGlvbjogKHNjcmVlblBvc2l0aW9uKSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBtZXRob2QgaXMgZGVwcmVjYXRlZCBvbiB0aGUgbW9kZWwgbGF5ZXIuIFVzZSBgVGV4dEVkaXRvckVsZW1lbnQ6OnBpeGVsUG9zaXRpb25Gb3JTY3JlZW5Qb3NpdGlvbmAgaW5zdGVhZFwiKVxuICAgIEBnZXRFbGVtZW50KCkucGl4ZWxQb3NpdGlvbkZvclNjcmVlblBvc2l0aW9uKHNjcmVlblBvc2l0aW9uKVxuXG4gIGdldFZlcnRpY2FsU2Nyb2xsTWFyZ2luOiAtPlxuICAgIG1heFNjcm9sbE1hcmdpbiA9IE1hdGguZmxvb3IoKChAaGVpZ2h0IC8gQGdldExpbmVIZWlnaHRJblBpeGVscygpKSAtIDEpIC8gMilcbiAgICBNYXRoLm1pbihAdmVydGljYWxTY3JvbGxNYXJnaW4sIG1heFNjcm9sbE1hcmdpbilcblxuICBzZXRWZXJ0aWNhbFNjcm9sbE1hcmdpbjogKEB2ZXJ0aWNhbFNjcm9sbE1hcmdpbikgLT4gQHZlcnRpY2FsU2Nyb2xsTWFyZ2luXG5cbiAgZ2V0SG9yaXpvbnRhbFNjcm9sbE1hcmdpbjogLT4gTWF0aC5taW4oQGhvcml6b250YWxTY3JvbGxNYXJnaW4sIE1hdGguZmxvb3IoKChAd2lkdGggLyBAZ2V0RGVmYXVsdENoYXJXaWR0aCgpKSAtIDEpIC8gMikpXG4gIHNldEhvcml6b250YWxTY3JvbGxNYXJnaW46IChAaG9yaXpvbnRhbFNjcm9sbE1hcmdpbikgLT4gQGhvcml6b250YWxTY3JvbGxNYXJnaW5cblxuICBnZXRMaW5lSGVpZ2h0SW5QaXhlbHM6IC0+IEBsaW5lSGVpZ2h0SW5QaXhlbHNcbiAgc2V0TGluZUhlaWdodEluUGl4ZWxzOiAoQGxpbmVIZWlnaHRJblBpeGVscykgLT4gQGxpbmVIZWlnaHRJblBpeGVsc1xuXG4gIGdldEtvcmVhbkNoYXJXaWR0aDogLT4gQGtvcmVhbkNoYXJXaWR0aFxuICBnZXRIYWxmV2lkdGhDaGFyV2lkdGg6IC0+IEBoYWxmV2lkdGhDaGFyV2lkdGhcbiAgZ2V0RG91YmxlV2lkdGhDaGFyV2lkdGg6IC0+IEBkb3VibGVXaWR0aENoYXJXaWR0aFxuICBnZXREZWZhdWx0Q2hhcldpZHRoOiAtPiBAZGVmYXVsdENoYXJXaWR0aFxuXG4gIHJhdGlvRm9yQ2hhcmFjdGVyOiAoY2hhcmFjdGVyKSAtPlxuICAgIGlmIGlzS29yZWFuQ2hhcmFjdGVyKGNoYXJhY3RlcilcbiAgICAgIEBnZXRLb3JlYW5DaGFyV2lkdGgoKSAvIEBnZXREZWZhdWx0Q2hhcldpZHRoKClcbiAgICBlbHNlIGlmIGlzSGFsZldpZHRoQ2hhcmFjdGVyKGNoYXJhY3RlcilcbiAgICAgIEBnZXRIYWxmV2lkdGhDaGFyV2lkdGgoKSAvIEBnZXREZWZhdWx0Q2hhcldpZHRoKClcbiAgICBlbHNlIGlmIGlzRG91YmxlV2lkdGhDaGFyYWN0ZXIoY2hhcmFjdGVyKVxuICAgICAgQGdldERvdWJsZVdpZHRoQ2hhcldpZHRoKCkgLyBAZ2V0RGVmYXVsdENoYXJXaWR0aCgpXG4gICAgZWxzZVxuICAgICAgMVxuXG4gIHNldERlZmF1bHRDaGFyV2lkdGg6IChkZWZhdWx0Q2hhcldpZHRoLCBkb3VibGVXaWR0aENoYXJXaWR0aCwgaGFsZldpZHRoQ2hhcldpZHRoLCBrb3JlYW5DaGFyV2lkdGgpIC0+XG4gICAgZG91YmxlV2lkdGhDaGFyV2lkdGggPz0gZGVmYXVsdENoYXJXaWR0aFxuICAgIGhhbGZXaWR0aENoYXJXaWR0aCA/PSBkZWZhdWx0Q2hhcldpZHRoXG4gICAga29yZWFuQ2hhcldpZHRoID89IGRlZmF1bHRDaGFyV2lkdGhcbiAgICBpZiBkZWZhdWx0Q2hhcldpZHRoIGlzbnQgQGRlZmF1bHRDaGFyV2lkdGggb3IgZG91YmxlV2lkdGhDaGFyV2lkdGggaXNudCBAZG91YmxlV2lkdGhDaGFyV2lkdGggYW5kIGhhbGZXaWR0aENoYXJXaWR0aCBpc250IEBoYWxmV2lkdGhDaGFyV2lkdGggYW5kIGtvcmVhbkNoYXJXaWR0aCBpc250IEBrb3JlYW5DaGFyV2lkdGhcbiAgICAgIEBkZWZhdWx0Q2hhcldpZHRoID0gZGVmYXVsdENoYXJXaWR0aFxuICAgICAgQGRvdWJsZVdpZHRoQ2hhcldpZHRoID0gZG91YmxlV2lkdGhDaGFyV2lkdGhcbiAgICAgIEBoYWxmV2lkdGhDaGFyV2lkdGggPSBoYWxmV2lkdGhDaGFyV2lkdGhcbiAgICAgIEBrb3JlYW5DaGFyV2lkdGggPSBrb3JlYW5DaGFyV2lkdGhcbiAgICAgIEBkaXNwbGF5TGF5ZXIucmVzZXQoe30pIGlmIEBpc1NvZnRXcmFwcGVkKCkgYW5kIEBnZXRFZGl0b3JXaWR0aEluQ2hhcnMoKT9cbiAgICBkZWZhdWx0Q2hhcldpZHRoXG5cbiAgc2V0SGVpZ2h0OiAoaGVpZ2h0LCByZWVudHJhbnQ9ZmFsc2UpIC0+XG4gICAgaWYgcmVlbnRyYW50XG4gICAgICBAaGVpZ2h0ID0gaGVpZ2h0XG4gICAgZWxzZVxuICAgICAgR3JpbS5kZXByZWNhdGUoXCJUaGlzIGlzIG5vdyBhIHZpZXcgbWV0aG9kLiBDYWxsIFRleHRFZGl0b3JFbGVtZW50OjpzZXRIZWlnaHQgaW5zdGVhZC5cIilcbiAgICAgIEBnZXRFbGVtZW50KCkuc2V0SGVpZ2h0KGhlaWdodClcblxuICBnZXRIZWlnaHQ6IC0+XG4gICAgR3JpbS5kZXByZWNhdGUoXCJUaGlzIGlzIG5vdyBhIHZpZXcgbWV0aG9kLiBDYWxsIFRleHRFZGl0b3JFbGVtZW50OjpnZXRIZWlnaHQgaW5zdGVhZC5cIilcbiAgICBAaGVpZ2h0XG5cbiAgZ2V0QXV0b0hlaWdodDogLT4gQGF1dG9IZWlnaHQgPyB0cnVlXG5cbiAgZ2V0QXV0b1dpZHRoOiAtPiBAYXV0b1dpZHRoID8gZmFsc2VcblxuICBzZXRXaWR0aDogKHdpZHRoLCByZWVudHJhbnQ9ZmFsc2UpIC0+XG4gICAgaWYgcmVlbnRyYW50XG4gICAgICBAdXBkYXRlKHt3aWR0aH0pXG4gICAgICBAd2lkdGhcbiAgICBlbHNlXG4gICAgICBHcmltLmRlcHJlY2F0ZShcIlRoaXMgaXMgbm93IGEgdmlldyBtZXRob2QuIENhbGwgVGV4dEVkaXRvckVsZW1lbnQ6OnNldFdpZHRoIGluc3RlYWQuXCIpXG4gICAgICBAZ2V0RWxlbWVudCgpLnNldFdpZHRoKHdpZHRoKVxuXG4gIGdldFdpZHRoOiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6Z2V0V2lkdGggaW5zdGVhZC5cIilcbiAgICBAd2lkdGhcblxuICAjIEV4cGVyaW1lbnRhbDogU2Nyb2xsIHRoZSBlZGl0b3Igc3VjaCB0aGF0IHRoZSBnaXZlbiBzY3JlZW4gcm93IGlzIGF0IHRoZVxuICAjIHRvcCBvZiB0aGUgdmlzaWJsZSBhcmVhLlxuICBzZXRGaXJzdFZpc2libGVTY3JlZW5Sb3c6IChzY3JlZW5Sb3csIGZyb21WaWV3KSAtPlxuICAgIHVubGVzcyBmcm9tVmlld1xuICAgICAgbWF4U2NyZWVuUm93ID0gQGdldFNjcmVlbkxpbmVDb3VudCgpIC0gMVxuICAgICAgdW5sZXNzIEBzY3JvbGxQYXN0RW5kXG4gICAgICAgIGlmIEBoZWlnaHQ/IGFuZCBAbGluZUhlaWdodEluUGl4ZWxzP1xuICAgICAgICAgIG1heFNjcmVlblJvdyAtPSBNYXRoLmZsb29yKEBoZWlnaHQgLyBAbGluZUhlaWdodEluUGl4ZWxzKVxuICAgICAgc2NyZWVuUm93ID0gTWF0aC5tYXgoTWF0aC5taW4oc2NyZWVuUm93LCBtYXhTY3JlZW5Sb3cpLCAwKVxuXG4gICAgdW5sZXNzIHNjcmVlblJvdyBpcyBAZmlyc3RWaXNpYmxlU2NyZWVuUm93XG4gICAgICBAZmlyc3RWaXNpYmxlU2NyZWVuUm93ID0gc2NyZWVuUm93XG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLWZpcnN0LXZpc2libGUtc2NyZWVuLXJvdycsIHNjcmVlblJvdyB1bmxlc3MgZnJvbVZpZXdcblxuICBnZXRGaXJzdFZpc2libGVTY3JlZW5Sb3c6IC0+IEBmaXJzdFZpc2libGVTY3JlZW5Sb3dcblxuICBnZXRMYXN0VmlzaWJsZVNjcmVlblJvdzogLT5cbiAgICBpZiBAaGVpZ2h0PyBhbmQgQGxpbmVIZWlnaHRJblBpeGVscz9cbiAgICAgIE1hdGgubWluKEBmaXJzdFZpc2libGVTY3JlZW5Sb3cgKyBNYXRoLmZsb29yKEBoZWlnaHQgLyBAbGluZUhlaWdodEluUGl4ZWxzKSwgQGdldFNjcmVlbkxpbmVDb3VudCgpIC0gMSlcbiAgICBlbHNlXG4gICAgICBudWxsXG5cbiAgZ2V0VmlzaWJsZVJvd1JhbmdlOiAtPlxuICAgIGlmIGxhc3RWaXNpYmxlU2NyZWVuUm93ID0gQGdldExhc3RWaXNpYmxlU2NyZWVuUm93KClcbiAgICAgIFtAZmlyc3RWaXNpYmxlU2NyZWVuUm93LCBsYXN0VmlzaWJsZVNjcmVlblJvd11cbiAgICBlbHNlXG4gICAgICBudWxsXG5cbiAgc2V0Rmlyc3RWaXNpYmxlU2NyZWVuQ29sdW1uOiAoQGZpcnN0VmlzaWJsZVNjcmVlbkNvbHVtbikgLT5cbiAgZ2V0Rmlyc3RWaXNpYmxlU2NyZWVuQ29sdW1uOiAtPiBAZmlyc3RWaXNpYmxlU2NyZWVuQ29sdW1uXG5cbiAgZ2V0U2Nyb2xsVG9wOiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6Z2V0U2Nyb2xsVG9wIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLmdldFNjcm9sbFRvcCgpXG5cbiAgc2V0U2Nyb2xsVG9wOiAoc2Nyb2xsVG9wKSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6c2V0U2Nyb2xsVG9wIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLnNldFNjcm9sbFRvcChzY3JvbGxUb3ApXG5cbiAgZ2V0U2Nyb2xsQm90dG9tOiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6Z2V0U2Nyb2xsQm90dG9tIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLmdldFNjcm9sbEJvdHRvbSgpXG5cbiAgc2V0U2Nyb2xsQm90dG9tOiAoc2Nyb2xsQm90dG9tKSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6c2V0U2Nyb2xsQm90dG9tIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLnNldFNjcm9sbEJvdHRvbShzY3JvbGxCb3R0b20pXG5cbiAgZ2V0U2Nyb2xsTGVmdDogLT5cbiAgICBHcmltLmRlcHJlY2F0ZShcIlRoaXMgaXMgbm93IGEgdmlldyBtZXRob2QuIENhbGwgVGV4dEVkaXRvckVsZW1lbnQ6OmdldFNjcm9sbExlZnQgaW5zdGVhZC5cIilcblxuICAgIEBnZXRFbGVtZW50KCkuZ2V0U2Nyb2xsTGVmdCgpXG5cbiAgc2V0U2Nyb2xsTGVmdDogKHNjcm9sbExlZnQpIC0+XG4gICAgR3JpbS5kZXByZWNhdGUoXCJUaGlzIGlzIG5vdyBhIHZpZXcgbWV0aG9kLiBDYWxsIFRleHRFZGl0b3JFbGVtZW50OjpzZXRTY3JvbGxMZWZ0IGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLnNldFNjcm9sbExlZnQoc2Nyb2xsTGVmdClcblxuICBnZXRTY3JvbGxSaWdodDogLT5cbiAgICBHcmltLmRlcHJlY2F0ZShcIlRoaXMgaXMgbm93IGEgdmlldyBtZXRob2QuIENhbGwgVGV4dEVkaXRvckVsZW1lbnQ6OmdldFNjcm9sbFJpZ2h0IGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLmdldFNjcm9sbFJpZ2h0KClcblxuICBzZXRTY3JvbGxSaWdodDogKHNjcm9sbFJpZ2h0KSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6c2V0U2Nyb2xsUmlnaHQgaW5zdGVhZC5cIilcblxuICAgIEBnZXRFbGVtZW50KCkuc2V0U2Nyb2xsUmlnaHQoc2Nyb2xsUmlnaHQpXG5cbiAgZ2V0U2Nyb2xsSGVpZ2h0OiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6Z2V0U2Nyb2xsSGVpZ2h0IGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLmdldFNjcm9sbEhlaWdodCgpXG5cbiAgZ2V0U2Nyb2xsV2lkdGg6IC0+XG4gICAgR3JpbS5kZXByZWNhdGUoXCJUaGlzIGlzIG5vdyBhIHZpZXcgbWV0aG9kLiBDYWxsIFRleHRFZGl0b3JFbGVtZW50OjpnZXRTY3JvbGxXaWR0aCBpbnN0ZWFkLlwiKVxuXG4gICAgQGdldEVsZW1lbnQoKS5nZXRTY3JvbGxXaWR0aCgpXG5cbiAgZ2V0TWF4U2Nyb2xsVG9wOiAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6Z2V0TWF4U2Nyb2xsVG9wIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLmdldE1heFNjcm9sbFRvcCgpXG5cbiAgaW50ZXJzZWN0c1Zpc2libGVSb3dSYW5nZTogKHN0YXJ0Um93LCBlbmRSb3cpIC0+XG4gICAgR3JpbS5kZXByZWNhdGUoXCJUaGlzIGlzIG5vdyBhIHZpZXcgbWV0aG9kLiBDYWxsIFRleHRFZGl0b3JFbGVtZW50OjppbnRlcnNlY3RzVmlzaWJsZVJvd1JhbmdlIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLmludGVyc2VjdHNWaXNpYmxlUm93UmFuZ2Uoc3RhcnRSb3csIGVuZFJvdylcblxuICBzZWxlY3Rpb25JbnRlcnNlY3RzVmlzaWJsZVJvd1JhbmdlOiAoc2VsZWN0aW9uKSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6c2VsZWN0aW9uSW50ZXJzZWN0c1Zpc2libGVSb3dSYW5nZSBpbnN0ZWFkLlwiKVxuXG4gICAgQGdldEVsZW1lbnQoKS5zZWxlY3Rpb25JbnRlcnNlY3RzVmlzaWJsZVJvd1JhbmdlKHNlbGVjdGlvbilcblxuICBzY3JlZW5Qb3NpdGlvbkZvclBpeGVsUG9zaXRpb246IChwaXhlbFBvc2l0aW9uKSAtPlxuICAgIEdyaW0uZGVwcmVjYXRlKFwiVGhpcyBpcyBub3cgYSB2aWV3IG1ldGhvZC4gQ2FsbCBUZXh0RWRpdG9yRWxlbWVudDo6c2NyZWVuUG9zaXRpb25Gb3JQaXhlbFBvc2l0aW9uIGluc3RlYWQuXCIpXG5cbiAgICBAZ2V0RWxlbWVudCgpLnNjcmVlblBvc2l0aW9uRm9yUGl4ZWxQb3NpdGlvbihwaXhlbFBvc2l0aW9uKVxuXG4gIHBpeGVsUmVjdEZvclNjcmVlblJhbmdlOiAoc2NyZWVuUmFuZ2UpIC0+XG4gICAgR3JpbS5kZXByZWNhdGUoXCJUaGlzIGlzIG5vdyBhIHZpZXcgbWV0aG9kLiBDYWxsIFRleHRFZGl0b3JFbGVtZW50OjpwaXhlbFJlY3RGb3JTY3JlZW5SYW5nZSBpbnN0ZWFkLlwiKVxuXG4gICAgQGdldEVsZW1lbnQoKS5waXhlbFJlY3RGb3JTY3JlZW5SYW5nZShzY3JlZW5SYW5nZSlcblxuICAjIyNcbiAgU2VjdGlvbjogVXRpbGl0eVxuICAjIyNcblxuICBpbnNwZWN0OiAtPlxuICAgIFwiPFRleHRFZGl0b3IgI3tAaWR9PlwiXG5cbiAgZW1pdFdpbGxJbnNlcnRUZXh0RXZlbnQ6ICh0ZXh0KSAtPlxuICAgIHJlc3VsdCA9IHRydWVcbiAgICBjYW5jZWwgPSAtPiByZXN1bHQgPSBmYWxzZVxuICAgIHdpbGxJbnNlcnRFdmVudCA9IHtjYW5jZWwsIHRleHR9XG4gICAgQGVtaXR0ZXIuZW1pdCAnd2lsbC1pbnNlcnQtdGV4dCcsIHdpbGxJbnNlcnRFdmVudFxuICAgIHJlc3VsdFxuXG4gICMjI1xuICBTZWN0aW9uOiBMYW5ndWFnZSBNb2RlIERlbGVnYXRlZCBNZXRob2RzXG4gICMjI1xuXG4gIHN1Z2dlc3RlZEluZGVudEZvckJ1ZmZlclJvdzogKGJ1ZmZlclJvdywgb3B0aW9ucykgLT4gQGxhbmd1YWdlTW9kZS5zdWdnZXN0ZWRJbmRlbnRGb3JCdWZmZXJSb3coYnVmZmVyUm93LCBvcHRpb25zKVxuXG4gIGF1dG9JbmRlbnRCdWZmZXJSb3c6IChidWZmZXJSb3csIG9wdGlvbnMpIC0+IEBsYW5ndWFnZU1vZGUuYXV0b0luZGVudEJ1ZmZlclJvdyhidWZmZXJSb3csIG9wdGlvbnMpXG5cbiAgYXV0b0luZGVudEJ1ZmZlclJvd3M6IChzdGFydFJvdywgZW5kUm93KSAtPiBAbGFuZ3VhZ2VNb2RlLmF1dG9JbmRlbnRCdWZmZXJSb3dzKHN0YXJ0Um93LCBlbmRSb3cpXG5cbiAgYXV0b0RlY3JlYXNlSW5kZW50Rm9yQnVmZmVyUm93OiAoYnVmZmVyUm93KSAtPiBAbGFuZ3VhZ2VNb2RlLmF1dG9EZWNyZWFzZUluZGVudEZvckJ1ZmZlclJvdyhidWZmZXJSb3cpXG5cbiAgdG9nZ2xlTGluZUNvbW1lbnRGb3JCdWZmZXJSb3c6IChyb3cpIC0+IEBsYW5ndWFnZU1vZGUudG9nZ2xlTGluZUNvbW1lbnRzRm9yQnVmZmVyUm93KHJvdylcblxuICB0b2dnbGVMaW5lQ29tbWVudHNGb3JCdWZmZXJSb3dzOiAoc3RhcnQsIGVuZCkgLT4gQGxhbmd1YWdlTW9kZS50b2dnbGVMaW5lQ29tbWVudHNGb3JCdWZmZXJSb3dzKHN0YXJ0LCBlbmQpXG4iXX0=
