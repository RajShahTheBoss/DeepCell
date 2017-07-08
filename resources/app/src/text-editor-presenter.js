(function() {
  var CompositeDisposable, Decoration, Emitter, Point, Range, TextEditorPresenter, _, ref, ref1;

  ref = require('event-kit'), CompositeDisposable = ref.CompositeDisposable, Emitter = ref.Emitter;

  ref1 = require('text-buffer'), Point = ref1.Point, Range = ref1.Range;

  _ = require('underscore-plus');

  Decoration = require('./decoration');

  module.exports = TextEditorPresenter = (function() {
    TextEditorPresenter.prototype.toggleCursorBlinkHandle = null;

    TextEditorPresenter.prototype.startBlinkingCursorsAfterDelay = null;

    TextEditorPresenter.prototype.stoppedScrollingTimeoutId = null;

    TextEditorPresenter.prototype.mouseWheelScreenRow = null;

    TextEditorPresenter.prototype.overlayDimensions = null;

    TextEditorPresenter.prototype.minimumReflowInterval = 200;

    function TextEditorPresenter(params) {
      this.model = params.model, this.lineTopIndex = params.lineTopIndex;
      this.model.presenter = this;
      this.cursorBlinkPeriod = params.cursorBlinkPeriod, this.cursorBlinkResumeDelay = params.cursorBlinkResumeDelay, this.stoppedScrollingDelay = params.stoppedScrollingDelay, this.tileSize = params.tileSize, this.autoHeight = params.autoHeight;
      this.contentFrameWidth = params.contentFrameWidth;
      this.displayLayer = this.model.displayLayer;
      this.gutterWidth = 0;
      if (this.tileSize == null) {
        this.tileSize = 6;
      }
      this.realScrollTop = this.scrollTop;
      this.realScrollLeft = this.scrollLeft;
      this.disposables = new CompositeDisposable;
      this.emitter = new Emitter;
      this.linesByScreenRow = new Map;
      this.visibleHighlights = {};
      this.characterWidthsByScope = {};
      this.lineDecorationsByScreenRow = {};
      this.lineNumberDecorationsByScreenRow = {};
      this.customGutterDecorationsByGutterName = {};
      this.overlayDimensions = {};
      this.observedBlockDecorations = new Set();
      this.invalidatedDimensionsByBlockDecoration = new Set();
      this.invalidateAllBlockDecorationsDimensions = false;
      this.precedingBlockDecorationsByScreenRowAndId = {};
      this.followingBlockDecorationsByScreenRowAndId = {};
      this.screenRowsToMeasure = [];
      this.flashCountsByDecorationId = {};
      this.transferMeasurementsToModel();
      this.transferMeasurementsFromModel();
      this.observeModel();
      this.buildState();
      this.invalidateState();
      if (this.focused) {
        this.startBlinkingCursors();
      }
      if (this.continuousReflow) {
        this.startReflowing();
      }
      this.updating = false;
    }

    TextEditorPresenter.prototype.setLinesYardstick = function(linesYardstick) {
      this.linesYardstick = linesYardstick;
    };

    TextEditorPresenter.prototype.getLinesYardstick = function() {
      return this.linesYardstick;
    };

    TextEditorPresenter.prototype.destroy = function() {
      this.disposables.dispose();
      if (this.stoppedScrollingTimeoutId != null) {
        clearTimeout(this.stoppedScrollingTimeoutId);
      }
      if (this.reflowingInterval != null) {
        clearInterval(this.reflowingInterval);
      }
      return this.stopBlinkingCursors();
    };

    TextEditorPresenter.prototype.onDidUpdateState = function(callback) {
      return this.emitter.on('did-update-state', callback);
    };

    TextEditorPresenter.prototype.emitDidUpdateState = function() {
      if (this.isBatching()) {
        return this.emitter.emit("did-update-state");
      }
    };

    TextEditorPresenter.prototype.transferMeasurementsToModel = function() {
      if (this.lineHeight != null) {
        this.model.setLineHeightInPixels(this.lineHeight);
      }
      if (this.baseCharacterWidth != null) {
        return this.model.setDefaultCharWidth(this.baseCharacterWidth);
      }
    };

    TextEditorPresenter.prototype.transferMeasurementsFromModel = function() {
      return this.editorWidthInChars = this.model.getEditorWidthInChars();
    };

    TextEditorPresenter.prototype.isBatching = function() {
      return this.updating === false;
    };

    TextEditorPresenter.prototype.getPreMeasurementState = function() {
      this.updating = true;
      this.updateVerticalDimensions();
      this.updateScrollbarDimensions();
      this.commitPendingLogicalScrollTopPosition();
      this.commitPendingScrollTopPosition();
      this.updateStartRow();
      this.updateEndRow();
      this.updateCommonGutterState();
      this.updateReflowState();
      this.updateLines();
      if (this.shouldUpdateDecorations) {
        this.fetchDecorations();
        this.updateLineDecorations();
        this.updateBlockDecorations();
      }
      this.updateTilesState();
      this.updating = false;
      return this.state;
    };

    TextEditorPresenter.prototype.getPostMeasurementState = function() {
      this.updating = true;
      this.updateHorizontalDimensions();
      this.commitPendingLogicalScrollLeftPosition();
      this.commitPendingScrollLeftPosition();
      this.clearPendingScrollPosition();
      this.updateRowsPerPage();
      this.updateLines();
      this.updateVerticalScrollState();
      this.updateHorizontalScrollState();
      this.updateScrollbarsState();
      this.updateHiddenInputState();
      this.updateContentState();
      this.updateFocusedState();
      this.updateHeightState();
      this.updateWidthState();
      if (this.shouldUpdateDecorations) {
        this.updateHighlightDecorations();
      }
      this.updateTilesState();
      this.updateCursorsState();
      this.updateOverlaysState();
      this.updateLineNumberGutterState();
      this.updateGutterOrderState();
      this.updateCustomGutterDecorationState();
      this.updating = false;
      this.resetTrackedUpdates();
      return this.state;
    };

    TextEditorPresenter.prototype.resetTrackedUpdates = function() {
      return this.shouldUpdateDecorations = false;
    };

    TextEditorPresenter.prototype.invalidateState = function() {
      return this.shouldUpdateDecorations = true;
    };

    TextEditorPresenter.prototype.observeModel = function() {
      var cursor, decoration, i, j, len, len1, ref2, ref3;
      this.disposables.add(this.model.displayLayer.onDidReset((function(_this) {
        return function() {
          _this.spliceBlockDecorationsInRange(0, 2e308, 2e308);
          _this.shouldUpdateDecorations = true;
          return _this.emitDidUpdateState();
        };
      })(this)));
      this.disposables.add(this.model.displayLayer.onDidChangeSync((function(_this) {
        return function(changes) {
          var change, endRow, i, len, startRow;
          for (i = 0, len = changes.length; i < len; i++) {
            change = changes[i];
            startRow = change.start.row;
            endRow = startRow + change.oldExtent.row;
            _this.spliceBlockDecorationsInRange(startRow, endRow, change.newExtent.row - change.oldExtent.row);
          }
          _this.shouldUpdateDecorations = true;
          return _this.emitDidUpdateState();
        };
      })(this)));
      this.disposables.add(this.model.onDidUpdateDecorations((function(_this) {
        return function() {
          _this.shouldUpdateDecorations = true;
          return _this.emitDidUpdateState();
        };
      })(this)));
      this.disposables.add(this.model.onDidAddDecoration(this.didAddBlockDecoration.bind(this)));
      ref2 = this.model.getDecorations({
        type: 'block'
      });
      for (i = 0, len = ref2.length; i < len; i++) {
        decoration = ref2[i];
        this.didAddBlockDecoration(decoration);
      }
      this.disposables.add(this.model.onDidChangeGrammar(this.didChangeGrammar.bind(this)));
      this.disposables.add(this.model.onDidChangePlaceholderText(this.emitDidUpdateState.bind(this)));
      this.disposables.add(this.model.onDidChangeMini((function(_this) {
        return function() {
          _this.shouldUpdateDecorations = true;
          return _this.emitDidUpdateState();
        };
      })(this)));
      this.disposables.add(this.model.onDidChangeLineNumberGutterVisible(this.emitDidUpdateState.bind(this)));
      this.disposables.add(this.model.onDidAddCursor(this.didAddCursor.bind(this)));
      this.disposables.add(this.model.onDidRequestAutoscroll(this.requestAutoscroll.bind(this)));
      this.disposables.add(this.model.onDidChangeFirstVisibleScreenRow(this.didChangeFirstVisibleScreenRow.bind(this)));
      ref3 = this.model.getCursors();
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        cursor = ref3[j];
        this.observeCursor(cursor);
      }
      this.disposables.add(this.model.onDidAddGutter(this.didAddGutter.bind(this)));
    };

    TextEditorPresenter.prototype.didChangeScrollPastEnd = function() {
      this.updateScrollHeight();
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.didChangeShowLineNumbers = function() {
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.didChangeGrammar = function() {
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.buildState = function() {
      this.state = {
        horizontalScrollbar: {},
        verticalScrollbar: {},
        hiddenInput: {},
        content: {
          scrollingVertically: false,
          cursorsVisible: false,
          tiles: {},
          highlights: {},
          overlays: {},
          cursors: {},
          offScreenBlockDecorations: {}
        },
        gutters: []
      };
      this.sharedGutterStyles = {};
      this.customGutterDecorations = {};
      return this.lineNumberGutter = {
        tiles: {}
      };
    };

    TextEditorPresenter.prototype.setContinuousReflow = function(continuousReflow) {
      this.continuousReflow = continuousReflow;
      if (this.continuousReflow) {
        return this.startReflowing();
      } else {
        return this.stopReflowing();
      }
    };

    TextEditorPresenter.prototype.updateReflowState = function() {
      this.state.content.continuousReflow = this.continuousReflow;
      return this.lineNumberGutter.continuousReflow = this.continuousReflow;
    };

    TextEditorPresenter.prototype.startReflowing = function() {
      return this.reflowingInterval = setInterval(this.emitDidUpdateState.bind(this), this.minimumReflowInterval);
    };

    TextEditorPresenter.prototype.stopReflowing = function() {
      clearInterval(this.reflowingInterval);
      return this.reflowingInterval = null;
    };

    TextEditorPresenter.prototype.updateFocusedState = function() {
      return this.state.focused = this.focused;
    };

    TextEditorPresenter.prototype.updateHeightState = function() {
      if (this.autoHeight) {
        return this.state.height = this.contentHeight;
      } else {
        return this.state.height = null;
      }
    };

    TextEditorPresenter.prototype.updateWidthState = function() {
      if (this.model.getAutoWidth()) {
        return this.state.width = this.state.content.width + this.gutterWidth;
      } else {
        return this.state.width = null;
      }
    };

    TextEditorPresenter.prototype.updateVerticalScrollState = function() {
      this.state.content.scrollHeight = this.scrollHeight;
      this.sharedGutterStyles.scrollHeight = this.scrollHeight;
      this.state.verticalScrollbar.scrollHeight = this.scrollHeight;
      this.state.content.scrollTop = this.scrollTop;
      this.sharedGutterStyles.scrollTop = this.scrollTop;
      return this.state.verticalScrollbar.scrollTop = this.scrollTop;
    };

    TextEditorPresenter.prototype.updateHorizontalScrollState = function() {
      this.state.content.scrollWidth = this.scrollWidth;
      this.state.horizontalScrollbar.scrollWidth = this.scrollWidth;
      this.state.content.scrollLeft = this.scrollLeft;
      return this.state.horizontalScrollbar.scrollLeft = this.scrollLeft;
    };

    TextEditorPresenter.prototype.updateScrollbarsState = function() {
      this.state.horizontalScrollbar.visible = this.horizontalScrollbarHeight > 0;
      this.state.horizontalScrollbar.height = this.measuredHorizontalScrollbarHeight;
      this.state.horizontalScrollbar.right = this.verticalScrollbarWidth;
      this.state.verticalScrollbar.visible = this.verticalScrollbarWidth > 0;
      this.state.verticalScrollbar.width = this.measuredVerticalScrollbarWidth;
      return this.state.verticalScrollbar.bottom = this.horizontalScrollbarHeight;
    };

    TextEditorPresenter.prototype.updateHiddenInputState = function() {
      var height, lastCursor, left, ref2, top, width;
      if (!(lastCursor = this.model.getLastCursor())) {
        return;
      }
      ref2 = this.pixelRectForScreenRange(lastCursor.getScreenRange()), top = ref2.top, left = ref2.left, height = ref2.height, width = ref2.width;
      if (this.focused) {
        this.state.hiddenInput.top = Math.max(Math.min(top, this.clientHeight - height), 0);
        this.state.hiddenInput.left = Math.max(Math.min(left, this.clientWidth - width), 0);
      } else {
        this.state.hiddenInput.top = 0;
        this.state.hiddenInput.left = 0;
      }
      this.state.hiddenInput.height = height;
      return this.state.hiddenInput.width = Math.max(width, 2);
    };

    TextEditorPresenter.prototype.updateContentState = function() {
      var contentFrameWidth, contentWidth, ref2, ref3, ref4, verticalScrollbarWidth;
      if (this.boundingClientRect != null) {
        this.sharedGutterStyles.maxHeight = this.boundingClientRect.height;
        this.state.content.maxHeight = this.boundingClientRect.height;
      }
      verticalScrollbarWidth = (ref2 = this.verticalScrollbarWidth) != null ? ref2 : 0;
      contentFrameWidth = (ref3 = this.contentFrameWidth) != null ? ref3 : 0;
      contentWidth = (ref4 = this.contentWidth) != null ? ref4 : 0;
      if (this.model.getAutoWidth()) {
        this.state.content.width = contentWidth + verticalScrollbarWidth;
      } else {
        this.state.content.width = Math.max(contentWidth + verticalScrollbarWidth, contentFrameWidth);
      }
      this.state.content.scrollWidth = this.scrollWidth;
      this.state.content.scrollLeft = this.scrollLeft;
      this.state.content.backgroundColor = this.model.isMini() ? null : this.backgroundColor;
      return this.state.content.placeholderText = this.model.isEmpty() ? this.model.getPlaceholderText() : null;
    };

    TextEditorPresenter.prototype.tileForRow = function(row) {
      return row - (row % this.tileSize);
    };

    TextEditorPresenter.prototype.getStartTileRow = function() {
      var ref2;
      return this.tileForRow((ref2 = this.startRow) != null ? ref2 : 0);
    };

    TextEditorPresenter.prototype.getEndTileRow = function() {
      var ref2;
      return this.tileForRow((ref2 = this.endRow) != null ? ref2 : 0);
    };

    TextEditorPresenter.prototype.getScreenRowsToRender = function() {
      var endRow, i, longestScreenRow, results, screenRows, startRow;
      startRow = this.getStartTileRow();
      endRow = this.getEndTileRow() + this.tileSize;
      screenRows = (function() {
        results = [];
        for (var i = startRow; startRow <= endRow ? i < endRow : i > endRow; startRow <= endRow ? i++ : i--){ results.push(i); }
        return results;
      }).apply(this);
      longestScreenRow = this.model.getApproximateLongestScreenRow();
      if (longestScreenRow != null) {
        screenRows.push(longestScreenRow);
      }
      if (this.screenRowsToMeasure != null) {
        screenRows.push.apply(screenRows, this.screenRowsToMeasure);
      }
      screenRows = screenRows.filter(function(row) {
        return row >= 0;
      });
      screenRows.sort(function(a, b) {
        return a - b;
      });
      return _.uniq(screenRows, true);
    };

    TextEditorPresenter.prototype.getScreenRangesToRender = function() {
      var endRow, i, len, row, screenRanges, screenRows, startRow;
      screenRows = this.getScreenRowsToRender();
      screenRows.push(2e308);
      startRow = screenRows[0];
      endRow = startRow - 1;
      screenRanges = [];
      for (i = 0, len = screenRows.length; i < len; i++) {
        row = screenRows[i];
        if (row === endRow + 1) {
          endRow++;
        } else {
          screenRanges.push([startRow, endRow]);
          startRow = endRow = row;
        }
      }
      return screenRanges;
    };

    TextEditorPresenter.prototype.setScreenRowsToMeasure = function(screenRows) {
      if ((screenRows == null) || screenRows.length === 0) {
        return;
      }
      this.screenRowsToMeasure = screenRows;
      return this.shouldUpdateDecorations = true;
    };

    TextEditorPresenter.prototype.clearScreenRowsToMeasure = function() {
      return this.screenRowsToMeasure = [];
    };

    TextEditorPresenter.prototype.updateTilesState = function() {
      var base, base1, bottom, currentScreenRow, endRow, gutterTile, height, i, id, mouseWheelTileId, ref2, ref3, ref4, ref5, results, rowsWithinTile, screenRowIndex, screenRows, startRow, tile, tileEndRow, tileStartRow, top, visibleTiles, zIndex;
      if (!((this.startRow != null) && (this.endRow != null) && (this.lineHeight != null))) {
        return;
      }
      screenRows = this.getScreenRowsToRender();
      visibleTiles = {};
      startRow = screenRows[0];
      endRow = screenRows[screenRows.length - 1];
      screenRowIndex = screenRows.length - 1;
      zIndex = 0;
      for (tileStartRow = i = ref2 = this.tileForRow(endRow), ref3 = this.tileForRow(startRow), ref4 = -this.tileSize; ref4 > 0 ? i <= ref3 : i >= ref3; tileStartRow = i += ref4) {
        tileEndRow = tileStartRow + this.tileSize;
        rowsWithinTile = [];
        while (screenRowIndex >= 0) {
          currentScreenRow = screenRows[screenRowIndex];
          if (currentScreenRow < tileStartRow) {
            break;
          }
          rowsWithinTile.push(currentScreenRow);
          screenRowIndex--;
        }
        if (rowsWithinTile.length === 0) {
          continue;
        }
        top = Math.round(this.lineTopIndex.pixelPositionBeforeBlocksForRow(tileStartRow));
        bottom = Math.round(this.lineTopIndex.pixelPositionBeforeBlocksForRow(tileEndRow));
        height = bottom - top;
        tile = (base = this.state.content.tiles)[tileStartRow] != null ? base[tileStartRow] : base[tileStartRow] = {};
        tile.top = top - this.scrollTop;
        tile.left = -this.scrollLeft;
        tile.height = height;
        tile.display = "block";
        tile.zIndex = zIndex;
        if (tile.highlights == null) {
          tile.highlights = {};
        }
        gutterTile = (base1 = this.lineNumberGutter.tiles)[tileStartRow] != null ? base1[tileStartRow] : base1[tileStartRow] = {};
        gutterTile.top = top - this.scrollTop;
        gutterTile.height = height;
        gutterTile.display = "block";
        gutterTile.zIndex = zIndex;
        this.updateLinesState(tile, rowsWithinTile);
        this.updateLineNumbersState(gutterTile, rowsWithinTile);
        visibleTiles[tileStartRow] = true;
        zIndex++;
      }
      if (this.mouseWheelScreenRow != null) {
        mouseWheelTileId = this.tileForRow(this.mouseWheelScreenRow);
      }
      ref5 = this.state.content.tiles;
      results = [];
      for (id in ref5) {
        tile = ref5[id];
        if (visibleTiles.hasOwnProperty(id)) {
          continue;
        }
        if (Number(id) === mouseWheelTileId) {
          this.state.content.tiles[id].display = "none";
          results.push(this.lineNumberGutter.tiles[id].display = "none");
        } else {
          delete this.state.content.tiles[id];
          results.push(delete this.lineNumberGutter.tiles[id]);
        }
      }
      return results;
    };

    TextEditorPresenter.prototype.updateLinesState = function(tileState, screenRows) {
      var followingBlockDecorations, i, id, len, line, lineState, precedingBlockDecorations, ref2, ref3, ref4, screenRow, visibleLineIds;
      if (tileState.lines == null) {
        tileState.lines = {};
      }
      visibleLineIds = {};
      for (i = 0, len = screenRows.length; i < len; i++) {
        screenRow = screenRows[i];
        line = this.linesByScreenRow.get(screenRow);
        if (line == null) {
          continue;
        }
        visibleLineIds[line.id] = true;
        precedingBlockDecorations = (ref2 = this.precedingBlockDecorationsByScreenRowAndId[screenRow]) != null ? ref2 : {};
        followingBlockDecorations = (ref3 = this.followingBlockDecorationsByScreenRowAndId[screenRow]) != null ? ref3 : {};
        if (tileState.lines.hasOwnProperty(line.id)) {
          lineState = tileState.lines[line.id];
          lineState.screenRow = screenRow;
          lineState.decorationClasses = this.lineDecorationClassesForRow(screenRow);
          lineState.precedingBlockDecorations = precedingBlockDecorations;
          lineState.followingBlockDecorations = followingBlockDecorations;
        } else {
          tileState.lines[line.id] = {
            screenRow: screenRow,
            lineText: line.lineText,
            tagCodes: line.tagCodes,
            decorationClasses: this.lineDecorationClassesForRow(screenRow),
            precedingBlockDecorations: precedingBlockDecorations,
            followingBlockDecorations: followingBlockDecorations
          };
        }
      }
      ref4 = tileState.lines;
      for (id in ref4) {
        line = ref4[id];
        if (!visibleLineIds.hasOwnProperty(id)) {
          delete tileState.lines[id];
        }
      }
    };

    TextEditorPresenter.prototype.updateCursorsState = function() {
      var cursor, i, len, pixelRect, ref2;
      if (!((this.startRow != null) && (this.endRow != null) && this.hasPixelRectRequirements() && (this.baseCharacterWidth != null))) {
        return;
      }
      this.state.content.cursors = {};
      ref2 = this.model.cursorsForScreenRowRange(this.startRow, this.endRow - 1);
      for (i = 0, len = ref2.length; i < len; i++) {
        cursor = ref2[i];
        if (!(cursor.isVisible())) {
          continue;
        }
        pixelRect = this.pixelRectForScreenRange(cursor.getScreenRange());
        if (pixelRect.width === 0) {
          pixelRect.width = Math.round(this.baseCharacterWidth);
        }
        this.state.content.cursors[cursor.id] = pixelRect;
      }
    };

    TextEditorPresenter.prototype.updateOverlaysState = function() {
      var avoidOverflow, base, contentMargin, decoration, i, id, item, itemHeight, itemWidth, klass, left, leftDiff, len, name, overlayDimensions, overlayState, pixelPosition, position, ref2, ref3, rightDiff, screenPosition, top, visibleDecorationIds;
      if (!this.hasOverlayPositionRequirements()) {
        return;
      }
      visibleDecorationIds = {};
      ref2 = this.model.getOverlayDecorations();
      for (i = 0, len = ref2.length; i < len; i++) {
        decoration = ref2[i];
        if (!decoration.getMarker().isValid()) {
          continue;
        }
        ref3 = decoration.getProperties(), item = ref3.item, position = ref3.position, klass = ref3["class"], avoidOverflow = ref3.avoidOverflow;
        if (position === 'tail') {
          screenPosition = decoration.getMarker().getTailScreenPosition();
        } else {
          screenPosition = decoration.getMarker().getHeadScreenPosition();
        }
        pixelPosition = this.pixelPositionForScreenPosition(screenPosition);
        top = this.boundingClientRect.top + pixelPosition.top + this.lineHeight;
        left = this.boundingClientRect.left + pixelPosition.left + this.gutterWidth;
        if (overlayDimensions = this.overlayDimensions[decoration.id]) {
          itemWidth = overlayDimensions.itemWidth, itemHeight = overlayDimensions.itemHeight, contentMargin = overlayDimensions.contentMargin;
          if (avoidOverflow !== false) {
            rightDiff = left + itemWidth + contentMargin - this.windowWidth;
            if (rightDiff > 0) {
              left -= rightDiff;
            }
            leftDiff = left + contentMargin;
            if (leftDiff < 0) {
              left -= leftDiff;
            }
            if (top + itemHeight > this.windowHeight && top - (itemHeight + this.lineHeight) >= 0) {
              top -= itemHeight + this.lineHeight;
            }
          }
        }
        pixelPosition.top = top;
        pixelPosition.left = left;
        overlayState = (base = this.state.content.overlays)[name = decoration.id] != null ? base[name] : base[name] = {
          item: item
        };
        overlayState.pixelPosition = pixelPosition;
        if (klass != null) {
          overlayState["class"] = klass;
        }
        visibleDecorationIds[decoration.id] = true;
      }
      for (id in this.state.content.overlays) {
        if (!visibleDecorationIds[id]) {
          delete this.state.content.overlays[id];
        }
      }
      for (id in this.overlayDimensions) {
        if (!visibleDecorationIds[id]) {
          delete this.overlayDimensions[id];
        }
      }
    };

    TextEditorPresenter.prototype.updateLineNumberGutterState = function() {
      return this.lineNumberGutter.maxLineNumberDigits = Math.max(2, this.model.getLineCount().toString().length);
    };

    TextEditorPresenter.prototype.updateCommonGutterState = function() {
      return this.sharedGutterStyles.backgroundColor = this.gutterBackgroundColor !== "rgba(0, 0, 0, 0)" ? this.gutterBackgroundColor : this.backgroundColor;
    };

    TextEditorPresenter.prototype.didAddGutter = function(gutter) {
      var gutterDisposables;
      gutterDisposables = new CompositeDisposable;
      gutterDisposables.add(gutter.onDidChangeVisible((function(_this) {
        return function() {
          return _this.emitDidUpdateState();
        };
      })(this)));
      gutterDisposables.add(gutter.onDidDestroy((function(_this) {
        return function() {
          _this.disposables.remove(gutterDisposables);
          gutterDisposables.dispose();
          return _this.emitDidUpdateState();
        };
      })(this)));
      this.disposables.add(gutterDisposables);
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.updateGutterOrderState = function() {
      var base, content, gutter, i, isVisible, len, name, ref2, results;
      this.state.gutters = [];
      if (this.model.isMini()) {
        return;
      }
      ref2 = this.model.getGutters();
      results = [];
      for (i = 0, len = ref2.length; i < len; i++) {
        gutter = ref2[i];
        isVisible = this.gutterIsVisible(gutter);
        if (gutter.name === 'line-number') {
          content = this.lineNumberGutter;
        } else {
          if ((base = this.customGutterDecorations)[name = gutter.name] == null) {
            base[name] = {};
          }
          content = this.customGutterDecorations[gutter.name];
        }
        results.push(this.state.gutters.push({
          gutter: gutter,
          visible: isVisible,
          styles: this.sharedGutterStyles,
          content: content
        }));
      }
      return results;
    };

    TextEditorPresenter.prototype.updateCustomGutterDecorationState = function() {
      var bottom, decorationId, gutter, gutterDecorations, gutterName, i, len, properties, ref2, results, screenRange, top;
      if (!((this.startRow != null) && (this.endRow != null) && (this.lineHeight != null))) {
        return;
      }
      if (this.model.isMini()) {
        this.clearAllCustomGutterDecorations();
      }
      ref2 = this.model.getGutters();
      results = [];
      for (i = 0, len = ref2.length; i < len; i++) {
        gutter = ref2[i];
        gutterName = gutter.name;
        gutterDecorations = this.customGutterDecorations[gutterName];
        if (gutterDecorations) {
          this.clearDecorationsForCustomGutterName(gutterName);
        } else {
          this.customGutterDecorations[gutterName] = {};
        }
        if (!this.gutterIsVisible(gutter)) {
          continue;
        }
        results.push((function() {
          var ref3, ref4, results1;
          ref3 = this.customGutterDecorationsByGutterName[gutterName];
          results1 = [];
          for (decorationId in ref3) {
            ref4 = ref3[decorationId], properties = ref4.properties, screenRange = ref4.screenRange;
            top = this.lineTopIndex.pixelPositionAfterBlocksForRow(screenRange.start.row);
            bottom = this.lineTopIndex.pixelPositionBeforeBlocksForRow(screenRange.end.row + 1);
            results1.push(this.customGutterDecorations[gutterName][decorationId] = {
              top: top,
              height: bottom - top,
              item: properties.item,
              "class": properties["class"]
            });
          }
          return results1;
        }).call(this));
      }
      return results;
    };

    TextEditorPresenter.prototype.clearAllCustomGutterDecorations = function() {
      var allGutterNames, gutterName, i, len, results;
      allGutterNames = Object.keys(this.customGutterDecorations);
      results = [];
      for (i = 0, len = allGutterNames.length; i < len; i++) {
        gutterName = allGutterNames[i];
        results.push(this.clearDecorationsForCustomGutterName(gutterName));
      }
      return results;
    };

    TextEditorPresenter.prototype.clearDecorationsForCustomGutterName = function(gutterName) {
      var allDecorationIds, decorationId, gutterDecorations, i, len, results;
      gutterDecorations = this.customGutterDecorations[gutterName];
      if (gutterDecorations) {
        allDecorationIds = Object.keys(gutterDecorations);
        results = [];
        for (i = 0, len = allDecorationIds.length; i < len; i++) {
          decorationId = allDecorationIds[i];
          results.push(delete gutterDecorations[decorationId]);
        }
        return results;
      }
    };

    TextEditorPresenter.prototype.gutterIsVisible = function(gutterModel) {
      var isVisible;
      isVisible = gutterModel.isVisible();
      if (gutterModel.name === 'line-number') {
        isVisible = isVisible && this.model.doesShowLineNumbers();
      }
      return isVisible;
    };

    TextEditorPresenter.prototype.updateLineNumbersState = function(tileState, screenRows) {
      var blockDecorationsAfterPreviousScreenRowHeight, blockDecorationsBeforeCurrentScreenRowHeight, blockDecorationsHeight, bufferColumn, bufferRow, decorationClasses, foldable, i, id, len, line, lineId, ref2, screenRow, softWrapped, visibleLineNumberIds;
      if (tileState.lineNumbers == null) {
        tileState.lineNumbers = {};
      }
      visibleLineNumberIds = {};
      for (i = 0, len = screenRows.length; i < len; i++) {
        screenRow = screenRows[i];
        if (!(this.isRowRendered(screenRow))) {
          continue;
        }
        line = this.linesByScreenRow.get(screenRow);
        if (line == null) {
          continue;
        }
        lineId = line.id;
        ref2 = this.displayLayer.translateScreenPosition(Point(screenRow, 0)), bufferRow = ref2.row, bufferColumn = ref2.column;
        softWrapped = bufferColumn !== 0;
        foldable = !softWrapped && this.model.isFoldableAtBufferRow(bufferRow);
        decorationClasses = this.lineNumberDecorationClassesForRow(screenRow);
        blockDecorationsBeforeCurrentScreenRowHeight = this.lineTopIndex.pixelPositionAfterBlocksForRow(screenRow) - this.lineTopIndex.pixelPositionBeforeBlocksForRow(screenRow);
        blockDecorationsHeight = blockDecorationsBeforeCurrentScreenRowHeight;
        if (screenRow % this.tileSize !== 0) {
          blockDecorationsAfterPreviousScreenRowHeight = this.lineTopIndex.pixelPositionBeforeBlocksForRow(screenRow) - this.lineHeight - this.lineTopIndex.pixelPositionAfterBlocksForRow(screenRow - 1);
          blockDecorationsHeight += blockDecorationsAfterPreviousScreenRowHeight;
        }
        tileState.lineNumbers[lineId] = {
          screenRow: screenRow,
          bufferRow: bufferRow,
          softWrapped: softWrapped,
          decorationClasses: decorationClasses,
          foldable: foldable,
          blockDecorationsHeight: blockDecorationsHeight
        };
        visibleLineNumberIds[lineId] = true;
      }
      for (id in tileState.lineNumbers) {
        if (!visibleLineNumberIds[id]) {
          delete tileState.lineNumbers[id];
        }
      }
    };

    TextEditorPresenter.prototype.updateStartRow = function() {
      if (!((this.scrollTop != null) && (this.lineHeight != null))) {
        return;
      }
      this.startRow = Math.max(0, this.lineTopIndex.rowForPixelPosition(this.scrollTop));
      return atom.assert(Number.isFinite(this.startRow), 'Invalid start row', (function(_this) {
        return function(error) {
          var ref2, ref3, ref4, ref5, ref6;
          return error.metadata = {
            startRow: (ref2 = _this.startRow) != null ? ref2.toString() : void 0,
            scrollTop: (ref3 = _this.scrollTop) != null ? ref3.toString() : void 0,
            scrollHeight: (ref4 = _this.scrollHeight) != null ? ref4.toString() : void 0,
            clientHeight: (ref5 = _this.clientHeight) != null ? ref5.toString() : void 0,
            lineHeight: (ref6 = _this.lineHeight) != null ? ref6.toString() : void 0
          };
        };
      })(this));
    };

    TextEditorPresenter.prototype.updateEndRow = function() {
      if (!((this.scrollTop != null) && (this.lineHeight != null) && (this.height != null))) {
        return;
      }
      return this.endRow = Math.min(this.model.getApproximateScreenLineCount(), this.lineTopIndex.rowForPixelPosition(this.scrollTop + this.height + this.lineHeight - 1) + 1);
    };

    TextEditorPresenter.prototype.updateRowsPerPage = function() {
      var rowsPerPage;
      rowsPerPage = Math.floor(this.getClientHeight() / this.lineHeight);
      if (rowsPerPage !== this.rowsPerPage) {
        this.rowsPerPage = rowsPerPage;
        return this.model.setRowsPerPage(this.rowsPerPage);
      }
    };

    TextEditorPresenter.prototype.updateScrollWidth = function() {
      var scrollWidth;
      if (!((this.contentWidth != null) && (this.clientWidth != null))) {
        return;
      }
      scrollWidth = Math.max(this.contentWidth, this.clientWidth);
      if (this.scrollWidth !== scrollWidth) {
        this.scrollWidth = scrollWidth;
        return this.updateScrollLeft(this.scrollLeft);
      }
    };

    TextEditorPresenter.prototype.updateScrollHeight = function() {
      var contentHeight, extraScrollHeight, scrollHeight;
      if (!((this.contentHeight != null) && (this.clientHeight != null))) {
        return;
      }
      contentHeight = this.contentHeight;
      if (this.model.getScrollPastEnd()) {
        extraScrollHeight = this.clientHeight - (this.lineHeight * 3);
        if (extraScrollHeight > 0) {
          contentHeight += extraScrollHeight;
        }
      }
      scrollHeight = Math.max(contentHeight, this.height);
      if (this.scrollHeight !== scrollHeight) {
        this.scrollHeight = scrollHeight;
        return this.updateScrollTop(this.scrollTop);
      }
    };

    TextEditorPresenter.prototype.updateVerticalDimensions = function() {
      var oldContentHeight;
      if (this.lineHeight != null) {
        oldContentHeight = this.contentHeight;
        this.contentHeight = Math.round(this.lineTopIndex.pixelPositionAfterBlocksForRow(this.model.getApproximateScreenLineCount()));
      }
      if (this.contentHeight !== oldContentHeight) {
        this.updateHeight();
        this.updateScrollbarDimensions();
        return this.updateScrollHeight();
      }
    };

    TextEditorPresenter.prototype.updateHorizontalDimensions = function() {
      var oldContentWidth, rightmostPosition;
      if (this.baseCharacterWidth != null) {
        oldContentWidth = this.contentWidth;
        rightmostPosition = this.model.getApproximateRightmostScreenPosition();
        this.contentWidth = this.pixelPositionForScreenPosition(rightmostPosition).left;
        this.contentWidth += this.scrollLeft;
        if (!this.model.isSoftWrapped()) {
          this.contentWidth += 1;
        }
      }
      if (this.contentWidth !== oldContentWidth) {
        this.updateScrollbarDimensions();
        this.updateClientWidth();
        return this.updateScrollWidth();
      }
    };

    TextEditorPresenter.prototype.updateClientHeight = function() {
      var clientHeight;
      if (!((this.height != null) && (this.horizontalScrollbarHeight != null))) {
        return;
      }
      clientHeight = this.height - this.horizontalScrollbarHeight;
      this.model.setHeight(clientHeight, true);
      if (this.clientHeight !== clientHeight) {
        this.clientHeight = clientHeight;
        this.updateScrollHeight();
        return this.updateScrollTop(this.scrollTop);
      }
    };

    TextEditorPresenter.prototype.updateClientWidth = function() {
      var clientWidth;
      if (!((this.contentFrameWidth != null) && (this.verticalScrollbarWidth != null))) {
        return;
      }
      if (this.model.getAutoWidth()) {
        clientWidth = this.contentWidth;
      } else {
        clientWidth = this.contentFrameWidth - this.verticalScrollbarWidth;
      }
      if (!this.editorWidthInChars) {
        this.model.setWidth(clientWidth, true);
      }
      if (this.clientWidth !== clientWidth) {
        this.clientWidth = clientWidth;
        this.updateScrollWidth();
        return this.updateScrollLeft(this.scrollLeft);
      }
    };

    TextEditorPresenter.prototype.updateScrollTop = function(scrollTop) {
      scrollTop = this.constrainScrollTop(scrollTop);
      if (scrollTop !== this.realScrollTop && !Number.isNaN(scrollTop)) {
        this.realScrollTop = scrollTop;
        this.scrollTop = Math.round(scrollTop);
        this.model.setFirstVisibleScreenRow(Math.round(this.scrollTop / this.lineHeight), true);
        this.updateStartRow();
        this.updateEndRow();
        this.didStartScrolling();
        return this.emitter.emit('did-change-scroll-top', this.scrollTop);
      }
    };

    TextEditorPresenter.prototype.constrainScrollTop = function(scrollTop) {
      if (!((scrollTop != null) && (this.scrollHeight != null) && (this.clientHeight != null))) {
        return scrollTop;
      }
      return Math.max(0, Math.min(scrollTop, this.scrollHeight - this.clientHeight));
    };

    TextEditorPresenter.prototype.updateScrollLeft = function(scrollLeft) {
      scrollLeft = this.constrainScrollLeft(scrollLeft);
      if (scrollLeft !== this.realScrollLeft && !Number.isNaN(scrollLeft)) {
        this.realScrollLeft = scrollLeft;
        this.scrollLeft = Math.round(scrollLeft);
        this.model.setFirstVisibleScreenColumn(Math.round(this.scrollLeft / this.baseCharacterWidth));
        return this.emitter.emit('did-change-scroll-left', this.scrollLeft);
      }
    };

    TextEditorPresenter.prototype.constrainScrollLeft = function(scrollLeft) {
      if (!((scrollLeft != null) && (this.scrollWidth != null) && (this.clientWidth != null))) {
        return scrollLeft;
      }
      return Math.max(0, Math.min(scrollLeft, this.scrollWidth - this.clientWidth));
    };

    TextEditorPresenter.prototype.updateScrollbarDimensions = function() {
      var clientHeightWithHorizontalScrollbar, clientHeightWithoutHorizontalScrollbar, clientWidthWithVerticalScrollbar, clientWidthWithoutVerticalScrollbar, horizontalScrollbarHeight, horizontalScrollbarVisible, verticalScrollbarVisible, verticalScrollbarWidth;
      if (!((this.contentFrameWidth != null) && (this.height != null))) {
        return;
      }
      if (!((this.measuredVerticalScrollbarWidth != null) && (this.measuredHorizontalScrollbarHeight != null))) {
        return;
      }
      if (!((this.contentWidth != null) && (this.contentHeight != null))) {
        return;
      }
      if (this.model.getAutoWidth()) {
        clientWidthWithVerticalScrollbar = this.contentWidth + this.measuredVerticalScrollbarWidth;
      } else {
        clientWidthWithVerticalScrollbar = this.contentFrameWidth;
      }
      clientWidthWithoutVerticalScrollbar = clientWidthWithVerticalScrollbar - this.measuredVerticalScrollbarWidth;
      clientHeightWithHorizontalScrollbar = this.height;
      clientHeightWithoutHorizontalScrollbar = clientHeightWithHorizontalScrollbar - this.measuredHorizontalScrollbarHeight;
      horizontalScrollbarVisible = !this.model.isMini() && (this.contentWidth > clientWidthWithVerticalScrollbar || this.contentWidth > clientWidthWithoutVerticalScrollbar && this.contentHeight > clientHeightWithHorizontalScrollbar);
      verticalScrollbarVisible = !this.model.isMini() && (this.contentHeight > clientHeightWithHorizontalScrollbar || this.contentHeight > clientHeightWithoutHorizontalScrollbar && this.contentWidth > clientWidthWithVerticalScrollbar);
      horizontalScrollbarHeight = horizontalScrollbarVisible ? this.measuredHorizontalScrollbarHeight : 0;
      verticalScrollbarWidth = verticalScrollbarVisible ? this.measuredVerticalScrollbarWidth : 0;
      if (this.horizontalScrollbarHeight !== horizontalScrollbarHeight) {
        this.horizontalScrollbarHeight = horizontalScrollbarHeight;
        this.updateClientHeight();
      }
      if (this.verticalScrollbarWidth !== verticalScrollbarWidth) {
        this.verticalScrollbarWidth = verticalScrollbarWidth;
        return this.updateClientWidth();
      }
    };

    TextEditorPresenter.prototype.lineDecorationClassesForRow = function(row) {
      var decorationClasses, id, properties, ref2;
      if (this.model.isMini()) {
        return null;
      }
      decorationClasses = null;
      ref2 = this.lineDecorationsByScreenRow[row];
      for (id in ref2) {
        properties = ref2[id];
        if (decorationClasses == null) {
          decorationClasses = [];
        }
        decorationClasses.push(properties["class"]);
      }
      return decorationClasses;
    };

    TextEditorPresenter.prototype.lineNumberDecorationClassesForRow = function(row) {
      var decorationClasses, id, properties, ref2;
      if (this.model.isMini()) {
        return null;
      }
      decorationClasses = null;
      ref2 = this.lineNumberDecorationsByScreenRow[row];
      for (id in ref2) {
        properties = ref2[id];
        if (decorationClasses == null) {
          decorationClasses = [];
        }
        decorationClasses.push(properties["class"]);
      }
      return decorationClasses;
    };

    TextEditorPresenter.prototype.getCursorBlinkPeriod = function() {
      return this.cursorBlinkPeriod;
    };

    TextEditorPresenter.prototype.getCursorBlinkResumeDelay = function() {
      return this.cursorBlinkResumeDelay;
    };

    TextEditorPresenter.prototype.setFocused = function(focused) {
      if (this.focused !== focused) {
        this.focused = focused;
        if (this.focused) {
          this.startBlinkingCursors();
        } else {
          this.stopBlinkingCursors(false);
        }
        return this.emitDidUpdateState();
      }
    };

    TextEditorPresenter.prototype.setScrollTop = function(scrollTop) {
      if (scrollTop == null) {
        return;
      }
      this.pendingScrollLogicalPosition = null;
      this.pendingScrollTop = scrollTop;
      this.shouldUpdateDecorations = true;
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.getScrollTop = function() {
      return this.scrollTop;
    };

    TextEditorPresenter.prototype.getRealScrollTop = function() {
      var ref2;
      return (ref2 = this.realScrollTop) != null ? ref2 : this.scrollTop;
    };

    TextEditorPresenter.prototype.didStartScrolling = function() {
      if (this.stoppedScrollingTimeoutId != null) {
        clearTimeout(this.stoppedScrollingTimeoutId);
        this.stoppedScrollingTimeoutId = null;
      }
      return this.stoppedScrollingTimeoutId = setTimeout(this.didStopScrolling.bind(this), this.stoppedScrollingDelay);
    };

    TextEditorPresenter.prototype.didStopScrolling = function() {
      if (this.mouseWheelScreenRow != null) {
        this.mouseWheelScreenRow = null;
        this.shouldUpdateDecorations = true;
      }
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.setScrollLeft = function(scrollLeft) {
      if (scrollLeft == null) {
        return;
      }
      this.pendingScrollLogicalPosition = null;
      this.pendingScrollLeft = scrollLeft;
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.getScrollLeft = function() {
      return this.scrollLeft;
    };

    TextEditorPresenter.prototype.getRealScrollLeft = function() {
      var ref2;
      return (ref2 = this.realScrollLeft) != null ? ref2 : this.scrollLeft;
    };

    TextEditorPresenter.prototype.getClientHeight = function() {
      if (this.clientHeight) {
        return this.clientHeight;
      } else {
        return this.explicitHeight - this.horizontalScrollbarHeight;
      }
    };

    TextEditorPresenter.prototype.getClientWidth = function() {
      if (this.clientWidth) {
        return this.clientWidth;
      } else {
        return this.contentFrameWidth - this.verticalScrollbarWidth;
      }
    };

    TextEditorPresenter.prototype.getScrollBottom = function() {
      return this.getScrollTop() + this.getClientHeight();
    };

    TextEditorPresenter.prototype.setScrollBottom = function(scrollBottom) {
      this.setScrollTop(scrollBottom - this.getClientHeight());
      return this.getScrollBottom();
    };

    TextEditorPresenter.prototype.getScrollRight = function() {
      return this.getScrollLeft() + this.getClientWidth();
    };

    TextEditorPresenter.prototype.setScrollRight = function(scrollRight) {
      this.setScrollLeft(scrollRight - this.getClientWidth());
      return this.getScrollRight();
    };

    TextEditorPresenter.prototype.getScrollHeight = function() {
      return this.scrollHeight;
    };

    TextEditorPresenter.prototype.getScrollWidth = function() {
      return this.scrollWidth;
    };

    TextEditorPresenter.prototype.getMaxScrollTop = function() {
      var clientHeight, scrollHeight;
      scrollHeight = this.getScrollHeight();
      clientHeight = this.getClientHeight();
      if (!((scrollHeight != null) && (clientHeight != null))) {
        return 0;
      }
      return scrollHeight - clientHeight;
    };

    TextEditorPresenter.prototype.setHorizontalScrollbarHeight = function(horizontalScrollbarHeight) {
      if (this.measuredHorizontalScrollbarHeight !== horizontalScrollbarHeight) {
        this.measuredHorizontalScrollbarHeight = horizontalScrollbarHeight;
        return this.emitDidUpdateState();
      }
    };

    TextEditorPresenter.prototype.setVerticalScrollbarWidth = function(verticalScrollbarWidth) {
      if (this.measuredVerticalScrollbarWidth !== verticalScrollbarWidth) {
        this.measuredVerticalScrollbarWidth = verticalScrollbarWidth;
        return this.emitDidUpdateState();
      }
    };

    TextEditorPresenter.prototype.setAutoHeight = function(autoHeight) {
      if (this.autoHeight !== autoHeight) {
        this.autoHeight = autoHeight;
        return this.emitDidUpdateState();
      }
    };

    TextEditorPresenter.prototype.setExplicitHeight = function(explicitHeight) {
      if (this.explicitHeight !== explicitHeight) {
        this.explicitHeight = explicitHeight;
        this.updateHeight();
        this.shouldUpdateDecorations = true;
        return this.emitDidUpdateState();
      }
    };

    TextEditorPresenter.prototype.updateHeight = function() {
      var height, ref2;
      height = (ref2 = this.explicitHeight) != null ? ref2 : this.contentHeight;
      if (this.height !== height) {
        this.height = height;
        this.updateScrollbarDimensions();
        this.updateClientHeight();
        this.updateScrollHeight();
        return this.updateEndRow();
      }
    };

    TextEditorPresenter.prototype.didChangeAutoWidth = function() {
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.setContentFrameWidth = function(contentFrameWidth) {
      if (this.contentFrameWidth !== contentFrameWidth || (this.editorWidthInChars != null)) {
        this.contentFrameWidth = contentFrameWidth;
        this.editorWidthInChars = null;
        this.updateScrollbarDimensions();
        this.updateClientWidth();
        this.invalidateAllBlockDecorationsDimensions = true;
        this.shouldUpdateDecorations = true;
        return this.emitDidUpdateState();
      }
    };

    TextEditorPresenter.prototype.setBoundingClientRect = function(boundingClientRect) {
      if (!this.clientRectsEqual(this.boundingClientRect, boundingClientRect)) {
        this.boundingClientRect = boundingClientRect;
        this.invalidateAllBlockDecorationsDimensions = true;
        this.shouldUpdateDecorations = true;
        return this.emitDidUpdateState();
      }
    };

    TextEditorPresenter.prototype.clientRectsEqual = function(clientRectA, clientRectB) {
      return (clientRectA != null) && (clientRectB != null) && clientRectA.top === clientRectB.top && clientRectA.left === clientRectB.left && clientRectA.width === clientRectB.width && clientRectA.height === clientRectB.height;
    };

    TextEditorPresenter.prototype.setWindowSize = function(width, height) {
      if (this.windowWidth !== width || this.windowHeight !== height) {
        this.windowWidth = width;
        this.windowHeight = height;
        this.invalidateAllBlockDecorationsDimensions = true;
        this.shouldUpdateDecorations = true;
        return this.emitDidUpdateState();
      }
    };

    TextEditorPresenter.prototype.setBackgroundColor = function(backgroundColor) {
      if (this.backgroundColor !== backgroundColor) {
        this.backgroundColor = backgroundColor;
        return this.emitDidUpdateState();
      }
    };

    TextEditorPresenter.prototype.setGutterBackgroundColor = function(gutterBackgroundColor) {
      if (this.gutterBackgroundColor !== gutterBackgroundColor) {
        this.gutterBackgroundColor = gutterBackgroundColor;
        return this.emitDidUpdateState();
      }
    };

    TextEditorPresenter.prototype.setGutterWidth = function(gutterWidth) {
      if (this.gutterWidth !== gutterWidth) {
        this.gutterWidth = gutterWidth;
        return this.updateOverlaysState();
      }
    };

    TextEditorPresenter.prototype.getGutterWidth = function() {
      return this.gutterWidth;
    };

    TextEditorPresenter.prototype.setLineHeight = function(lineHeight) {
      if (this.lineHeight !== lineHeight) {
        this.lineHeight = lineHeight;
        this.model.setLineHeightInPixels(this.lineHeight);
        this.lineTopIndex.setDefaultLineHeight(this.lineHeight);
        this.restoreScrollTopIfNeeded();
        this.model.setLineHeightInPixels(lineHeight);
        this.shouldUpdateDecorations = true;
        return this.emitDidUpdateState();
      }
    };

    TextEditorPresenter.prototype.setMouseWheelScreenRow = function(screenRow) {
      if (this.mouseWheelScreenRow !== screenRow) {
        this.mouseWheelScreenRow = screenRow;
        return this.didStartScrolling();
      }
    };

    TextEditorPresenter.prototype.setBaseCharacterWidth = function(baseCharacterWidth, doubleWidthCharWidth, halfWidthCharWidth, koreanCharWidth) {
      if (!(this.baseCharacterWidth === baseCharacterWidth && this.doubleWidthCharWidth === doubleWidthCharWidth && this.halfWidthCharWidth === halfWidthCharWidth && koreanCharWidth === this.koreanCharWidth)) {
        this.baseCharacterWidth = baseCharacterWidth;
        this.doubleWidthCharWidth = doubleWidthCharWidth;
        this.halfWidthCharWidth = halfWidthCharWidth;
        this.koreanCharWidth = koreanCharWidth;
        this.model.setDefaultCharWidth(baseCharacterWidth, doubleWidthCharWidth, halfWidthCharWidth, koreanCharWidth);
        this.restoreScrollLeftIfNeeded();
        return this.measurementsChanged();
      }
    };

    TextEditorPresenter.prototype.measurementsChanged = function() {
      this.invalidateAllBlockDecorationsDimensions = true;
      this.shouldUpdateDecorations = true;
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.hasPixelPositionRequirements = function() {
      return (this.lineHeight != null) && (this.baseCharacterWidth != null);
    };

    TextEditorPresenter.prototype.pixelPositionForScreenPosition = function(screenPosition) {
      var position;
      position = this.linesYardstick.pixelPositionForScreenPosition(screenPosition);
      position.top -= this.getScrollTop();
      position.left -= this.getScrollLeft();
      position.top = Math.round(position.top);
      position.left = Math.round(position.left);
      return position;
    };

    TextEditorPresenter.prototype.hasPixelRectRequirements = function() {
      return this.hasPixelPositionRequirements() && (this.scrollWidth != null);
    };

    TextEditorPresenter.prototype.hasOverlayPositionRequirements = function() {
      return this.hasPixelRectRequirements() && (this.boundingClientRect != null) && this.windowWidth && this.windowHeight;
    };

    TextEditorPresenter.prototype.absolutePixelRectForScreenRange = function(screenRange) {
      var height, left, lineHeight, ref2, top, width;
      lineHeight = this.model.getLineHeightInPixels();
      if (screenRange.end.row > screenRange.start.row) {
        top = this.linesYardstick.pixelPositionForScreenPosition(screenRange.start).top;
        left = 0;
        height = (screenRange.end.row - screenRange.start.row + 1) * lineHeight;
        width = this.getScrollWidth();
      } else {
        ref2 = this.linesYardstick.pixelPositionForScreenPosition(screenRange.start), top = ref2.top, left = ref2.left;
        height = lineHeight;
        width = this.linesYardstick.pixelPositionForScreenPosition(screenRange.end).left - left;
      }
      return {
        top: top,
        left: left,
        width: width,
        height: height
      };
    };

    TextEditorPresenter.prototype.pixelRectForScreenRange = function(screenRange) {
      var rect;
      rect = this.absolutePixelRectForScreenRange(screenRange);
      rect.top -= this.getScrollTop();
      rect.left -= this.getScrollLeft();
      rect.top = Math.round(rect.top);
      rect.left = Math.round(rect.left);
      rect.width = Math.round(rect.width);
      rect.height = Math.round(rect.height);
      return rect;
    };

    TextEditorPresenter.prototype.updateLines = function() {
      var endRow, i, index, len, line, ref2, ref3, results, startRow;
      this.linesByScreenRow.clear();
      ref2 = this.getScreenRangesToRender();
      results = [];
      for (i = 0, len = ref2.length; i < len; i++) {
        ref3 = ref2[i], startRow = ref3[0], endRow = ref3[1];
        results.push((function() {
          var j, len1, ref4, results1;
          ref4 = this.displayLayer.getScreenLines(startRow, endRow + 1);
          results1 = [];
          for (index = j = 0, len1 = ref4.length; j < len1; index = ++j) {
            line = ref4[index];
            results1.push(this.linesByScreenRow.set(startRow + index, line));
          }
          return results1;
        }).call(this));
      }
      return results;
    };

    TextEditorPresenter.prototype.lineIdForScreenRow = function(screenRow) {
      var ref2;
      return (ref2 = this.linesByScreenRow.get(screenRow)) != null ? ref2.id : void 0;
    };

    TextEditorPresenter.prototype.fetchDecorations = function() {
      var ref2, ref3;
      if (!(((0 <= (ref3 = this.startRow) && ref3 <= (ref2 = this.endRow)) && ref2 <= 2e308))) {
        return;
      }
      return this.decorations = this.model.decorationsStateForScreenRowRange(this.startRow, this.endRow - 1);
    };

    TextEditorPresenter.prototype.updateBlockDecorations = function() {
      var base, base1, blockDecoration, blockDecorations, decoration, decorations, i, id, j, len, len1, markerId, ref2, ref3, ref4, ref5, ref6, ref7, screenRow, visibleDecorationsById, visibleDecorationsByScreenRowAndId;
      if (this.invalidateAllBlockDecorationsDimensions) {
        ref2 = this.model.getDecorations({
          type: 'block'
        });
        for (i = 0, len = ref2.length; i < len; i++) {
          decoration = ref2[i];
          this.invalidatedDimensionsByBlockDecoration.add(decoration);
        }
        this.invalidateAllBlockDecorationsDimensions = false;
      }
      visibleDecorationsById = {};
      visibleDecorationsByScreenRowAndId = {};
      ref3 = this.model.decorationsForScreenRowRange(this.getStartTileRow(), this.getEndTileRow() + this.tileSize - 1);
      for (markerId in ref3) {
        decorations = ref3[markerId];
        for (j = 0, len1 = decorations.length; j < len1; j++) {
          decoration = decorations[j];
          if (!(decoration.isType('block'))) {
            continue;
          }
          screenRow = decoration.getMarker().getHeadScreenPosition().row;
          if (decoration.getProperties().position === "after") {
            if ((base = this.followingBlockDecorationsByScreenRowAndId)[screenRow] == null) {
              base[screenRow] = {};
            }
            this.followingBlockDecorationsByScreenRowAndId[screenRow][decoration.id] = {
              screenRow: screenRow,
              decoration: decoration
            };
          } else {
            if ((base1 = this.precedingBlockDecorationsByScreenRowAndId)[screenRow] == null) {
              base1[screenRow] = {};
            }
            this.precedingBlockDecorationsByScreenRowAndId[screenRow][decoration.id] = {
              screenRow: screenRow,
              decoration: decoration
            };
          }
          visibleDecorationsById[decoration.id] = true;
          if (visibleDecorationsByScreenRowAndId[screenRow] == null) {
            visibleDecorationsByScreenRowAndId[screenRow] = {};
          }
          visibleDecorationsByScreenRowAndId[screenRow][decoration.id] = true;
        }
      }
      ref4 = this.precedingBlockDecorationsByScreenRowAndId;
      for (screenRow in ref4) {
        blockDecorations = ref4[screenRow];
        if (Number(screenRow) !== this.mouseWheelScreenRow) {
          for (id in blockDecorations) {
            blockDecoration = blockDecorations[id];
            if (!((ref5 = visibleDecorationsByScreenRowAndId[screenRow]) != null ? ref5[id] : void 0)) {
              delete this.precedingBlockDecorationsByScreenRowAndId[screenRow][id];
            }
          }
        }
      }
      ref6 = this.followingBlockDecorationsByScreenRowAndId;
      for (screenRow in ref6) {
        blockDecorations = ref6[screenRow];
        if (Number(screenRow) !== this.mouseWheelScreenRow) {
          for (id in blockDecorations) {
            blockDecoration = blockDecorations[id];
            if (!((ref7 = visibleDecorationsByScreenRowAndId[screenRow]) != null ? ref7[id] : void 0)) {
              delete this.followingBlockDecorationsByScreenRowAndId[screenRow][id];
            }
          }
        }
      }
      this.state.content.offScreenBlockDecorations = {};
      return this.invalidatedDimensionsByBlockDecoration.forEach((function(_this) {
        return function(decoration) {
          if (!visibleDecorationsById[decoration.id]) {
            return _this.state.content.offScreenBlockDecorations[decoration.id] = decoration;
          }
        };
      })(this));
    };

    TextEditorPresenter.prototype.updateLineDecorations = function() {
      var base, bufferRange, decorationId, decorationState, name, properties, rangeIsReversed, ref2, screenRange;
      this.lineDecorationsByScreenRow = {};
      this.lineNumberDecorationsByScreenRow = {};
      this.customGutterDecorationsByGutterName = {};
      ref2 = this.decorations;
      for (decorationId in ref2) {
        decorationState = ref2[decorationId];
        properties = decorationState.properties, bufferRange = decorationState.bufferRange, screenRange = decorationState.screenRange, rangeIsReversed = decorationState.rangeIsReversed;
        if (Decoration.isType(properties, 'line') || Decoration.isType(properties, 'line-number')) {
          this.addToLineDecorationCaches(decorationId, properties, bufferRange, screenRange, rangeIsReversed);
        } else if (Decoration.isType(properties, 'gutter') && (properties.gutterName != null)) {
          if ((base = this.customGutterDecorationsByGutterName)[name = properties.gutterName] == null) {
            base[name] = {};
          }
          this.customGutterDecorationsByGutterName[properties.gutterName][decorationId] = decorationState;
        }
      }
    };

    TextEditorPresenter.prototype.updateHighlightDecorations = function() {
      var decorationId, id, properties, ref2, ref3, ref4, ref5, screenRange, tileId, tileState;
      this.visibleHighlights = {};
      ref2 = this.decorations;
      for (decorationId in ref2) {
        ref3 = ref2[decorationId], properties = ref3.properties, screenRange = ref3.screenRange;
        if (Decoration.isType(properties, 'highlight')) {
          this.updateHighlightState(decorationId, properties, screenRange);
        }
      }
      ref4 = this.state.content.tiles;
      for (tileId in ref4) {
        tileState = ref4[tileId];
        for (id in tileState.highlights) {
          if (((ref5 = this.visibleHighlights[tileId]) != null ? ref5[id] : void 0) == null) {
            delete tileState.highlights[id];
          }
        }
      }
    };

    TextEditorPresenter.prototype.addToLineDecorationCaches = function(decorationId, properties, bufferRange, screenRange, rangeIsReversed) {
      var base, base1, base2, endRow, headScreenPosition, i, omitLastRow, ref2, ref3, row, screenRow, startRow;
      if (screenRange.isEmpty()) {
        if (properties.onlyNonEmpty) {
          return;
        }
      } else {
        if (properties.onlyEmpty) {
          return;
        }
        omitLastRow = screenRange.end.column === 0;
      }
      if (rangeIsReversed) {
        headScreenPosition = screenRange.start;
      } else {
        headScreenPosition = screenRange.end;
      }
      if (properties["class"] === 'folded' && Decoration.isType(properties, 'line-number')) {
        screenRow = this.model.screenRowForBufferRow(bufferRange.start.row);
        if ((base = this.lineNumberDecorationsByScreenRow)[screenRow] == null) {
          base[screenRow] = {};
        }
        this.lineNumberDecorationsByScreenRow[screenRow][decorationId] = properties;
      } else {
        startRow = Math.max(screenRange.start.row, this.getStartTileRow());
        endRow = Math.min(screenRange.end.row, this.getEndTileRow() + this.tileSize);
        for (row = i = ref2 = startRow, ref3 = endRow; i <= ref3; row = i += 1) {
          if (properties.onlyHead && row !== headScreenPosition.row) {
            continue;
          }
          if (omitLastRow && row === screenRange.end.row) {
            continue;
          }
          if (Decoration.isType(properties, 'line')) {
            if ((base1 = this.lineDecorationsByScreenRow)[row] == null) {
              base1[row] = {};
            }
            this.lineDecorationsByScreenRow[row][decorationId] = properties;
          }
          if (Decoration.isType(properties, 'line-number')) {
            if ((base2 = this.lineNumberDecorationsByScreenRow)[row] == null) {
              base2[row] = {};
            }
            this.lineNumberDecorationsByScreenRow[row][decorationId] = properties;
          }
        }
      }
    };

    TextEditorPresenter.prototype.intersectRangeWithTile = function(range, tileStartRow) {
      var intersectingEndRow, intersectingRange, intersectingStartRow;
      intersectingStartRow = Math.max(tileStartRow, range.start.row);
      intersectingEndRow = Math.min(tileStartRow + this.tileSize - 1, range.end.row);
      intersectingRange = new Range(new Point(intersectingStartRow, 0), new Point(intersectingEndRow, 2e308));
      if (intersectingStartRow === range.start.row) {
        intersectingRange.start.column = range.start.column;
      }
      if (intersectingEndRow === range.end.row) {
        intersectingRange.end.column = range.end.column;
      }
      return intersectingRange;
    };

    TextEditorPresenter.prototype.updateHighlightState = function(decorationId, properties, screenRange) {
      var base, base1, base2, endTile, highlightState, i, j, len, needsFlash, rangeWithinTile, ref2, ref3, ref4, ref5, region, startTile, tileStartRow, tileState;
      if (!((this.startRow != null) && (this.endRow != null) && (this.lineHeight != null) && this.hasPixelPositionRequirements())) {
        return;
      }
      this.constrainRangeToVisibleRowRange(screenRange);
      if (screenRange.isEmpty()) {
        return;
      }
      startTile = this.tileForRow(screenRange.start.row);
      endTile = this.tileForRow(screenRange.end.row);
      needsFlash = (properties.flashCount != null) && this.flashCountsByDecorationId[decorationId] !== properties.flashCount;
      if (needsFlash) {
        this.flashCountsByDecorationId[decorationId] = properties.flashCount;
      }
      for (tileStartRow = i = ref2 = startTile, ref3 = endTile, ref4 = this.tileSize; ref4 > 0 ? i <= ref3 : i >= ref3; tileStartRow = i += ref4) {
        rangeWithinTile = this.intersectRangeWithTile(screenRange, tileStartRow);
        if (rangeWithinTile.isEmpty()) {
          continue;
        }
        tileState = (base = this.state.content.tiles)[tileStartRow] != null ? base[tileStartRow] : base[tileStartRow] = {
          highlights: {}
        };
        highlightState = (base1 = tileState.highlights)[decorationId] != null ? base1[decorationId] : base1[decorationId] = {};
        highlightState.needsFlash = needsFlash;
        highlightState.flashCount = properties.flashCount;
        highlightState.flashClass = properties.flashClass;
        highlightState.flashDuration = properties.flashDuration;
        highlightState["class"] = properties["class"];
        highlightState.deprecatedRegionClass = properties.deprecatedRegionClass;
        highlightState.regions = this.buildHighlightRegions(rangeWithinTile);
        ref5 = highlightState.regions;
        for (j = 0, len = ref5.length; j < len; j++) {
          region = ref5[j];
          this.repositionRegionWithinTile(region, tileStartRow);
        }
        if ((base2 = this.visibleHighlights)[tileStartRow] == null) {
          base2[tileStartRow] = {};
        }
        this.visibleHighlights[tileStartRow][decorationId] = true;
      }
      return true;
    };

    TextEditorPresenter.prototype.constrainRangeToVisibleRowRange = function(screenRange) {
      if (screenRange.start.row < this.startRow) {
        screenRange.start.row = this.startRow;
        screenRange.start.column = 0;
      }
      if (screenRange.end.row < this.startRow) {
        screenRange.end.row = this.startRow;
        screenRange.end.column = 0;
      }
      if (screenRange.start.row >= this.endRow) {
        screenRange.start.row = this.endRow;
        screenRange.start.column = 0;
      }
      if (screenRange.end.row >= this.endRow) {
        screenRange.end.row = this.endRow;
        return screenRange.end.column = 0;
      }
    };

    TextEditorPresenter.prototype.repositionRegionWithinTile = function(region, tileStartRow) {
      return region.top += this.scrollTop - this.lineTopIndex.pixelPositionBeforeBlocksForRow(tileStartRow);
    };

    TextEditorPresenter.prototype.buildHighlightRegions = function(screenRange) {
      var endPixelPosition, lineHeightInPixels, region, regions, spannedRows, startPixelPosition;
      lineHeightInPixels = this.lineHeight;
      startPixelPosition = this.pixelPositionForScreenPosition(screenRange.start);
      endPixelPosition = this.pixelPositionForScreenPosition(screenRange.end);
      startPixelPosition.left += this.scrollLeft;
      endPixelPosition.left += this.scrollLeft;
      spannedRows = screenRange.end.row - screenRange.start.row + 1;
      regions = [];
      if (spannedRows === 1) {
        region = {
          top: startPixelPosition.top,
          height: lineHeightInPixels,
          left: startPixelPosition.left
        };
        if (screenRange.end.column === 2e308) {
          region.right = 0;
        } else {
          region.width = endPixelPosition.left - startPixelPosition.left;
        }
        regions.push(region);
      } else {
        regions.push({
          top: startPixelPosition.top,
          left: startPixelPosition.left,
          height: lineHeightInPixels,
          right: 0
        });
        if (spannedRows > 2) {
          regions.push({
            top: startPixelPosition.top + lineHeightInPixels,
            height: endPixelPosition.top - startPixelPosition.top - lineHeightInPixels,
            left: 0,
            right: 0
          });
        }
        if (screenRange.end.column > 0) {
          region = {
            top: endPixelPosition.top,
            height: lineHeightInPixels,
            left: 0
          };
          if (screenRange.end.column === 2e308) {
            region.right = 0;
          } else {
            region.width = endPixelPosition.left;
          }
          regions.push(region);
        }
      }
      return regions;
    };

    TextEditorPresenter.prototype.setOverlayDimensions = function(decorationId, itemWidth, itemHeight, contentMargin) {
      var base, dimensionsAreEqual, overlayState;
      if ((base = this.overlayDimensions)[decorationId] == null) {
        base[decorationId] = {};
      }
      overlayState = this.overlayDimensions[decorationId];
      dimensionsAreEqual = overlayState.itemWidth === itemWidth && overlayState.itemHeight === itemHeight && overlayState.contentMargin === contentMargin;
      if (!dimensionsAreEqual) {
        overlayState.itemWidth = itemWidth;
        overlayState.itemHeight = itemHeight;
        overlayState.contentMargin = contentMargin;
        return this.emitDidUpdateState();
      }
    };

    TextEditorPresenter.prototype.setBlockDecorationDimensions = function(decoration, width, height) {
      if (!this.observedBlockDecorations.has(decoration)) {
        return;
      }
      this.lineTopIndex.resizeBlock(decoration.id, height);
      this.invalidatedDimensionsByBlockDecoration["delete"](decoration);
      this.shouldUpdateDecorations = true;
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.invalidateBlockDecorationDimensions = function(decoration) {
      this.invalidatedDimensionsByBlockDecoration.add(decoration);
      this.shouldUpdateDecorations = true;
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.spliceBlockDecorationsInRange = function(start, end, screenDelta) {
      var invalidatedBlockDecorationIds, newExtent, oldExtent;
      if (screenDelta === 0) {
        return;
      }
      oldExtent = end - start;
      newExtent = end - start + screenDelta;
      invalidatedBlockDecorationIds = this.lineTopIndex.splice(start, oldExtent, newExtent);
      return invalidatedBlockDecorationIds.forEach((function(_this) {
        return function(id) {
          var decoration, newScreenPosition;
          decoration = _this.model.decorationForId(id);
          newScreenPosition = decoration.getMarker().getHeadScreenPosition();
          _this.lineTopIndex.moveBlock(id, newScreenPosition.row);
          return _this.invalidatedDimensionsByBlockDecoration.add(decoration);
        };
      })(this));
    };

    TextEditorPresenter.prototype.didAddBlockDecoration = function(decoration) {
      var didDestroyDisposable, didMoveDisposable, isAfter;
      if (!decoration.isType('block') || this.observedBlockDecorations.has(decoration)) {
        return;
      }
      didMoveDisposable = decoration.getMarker().bufferMarker.onDidChange((function(_this) {
        return function(markerEvent) {
          return _this.didMoveBlockDecoration(decoration, markerEvent);
        };
      })(this));
      didDestroyDisposable = decoration.onDidDestroy((function(_this) {
        return function() {
          _this.disposables.remove(didMoveDisposable);
          _this.disposables.remove(didDestroyDisposable);
          didMoveDisposable.dispose();
          didDestroyDisposable.dispose();
          return _this.didDestroyBlockDecoration(decoration);
        };
      })(this));
      isAfter = decoration.getProperties().position === "after";
      this.lineTopIndex.insertBlock(decoration.id, decoration.getMarker().getHeadScreenPosition().row, 0, isAfter);
      this.observedBlockDecorations.add(decoration);
      this.invalidateBlockDecorationDimensions(decoration);
      this.disposables.add(didMoveDisposable);
      this.disposables.add(didDestroyDisposable);
      this.shouldUpdateDecorations = true;
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.didMoveBlockDecoration = function(decoration, markerEvent) {
      if (markerEvent.textChanged) {
        return;
      }
      this.lineTopIndex.moveBlock(decoration.id, decoration.getMarker().getHeadScreenPosition().row);
      this.shouldUpdateDecorations = true;
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.didDestroyBlockDecoration = function(decoration) {
      if (!this.observedBlockDecorations.has(decoration)) {
        return;
      }
      this.lineTopIndex.removeBlock(decoration.id);
      this.observedBlockDecorations["delete"](decoration);
      this.invalidatedDimensionsByBlockDecoration["delete"](decoration);
      this.shouldUpdateDecorations = true;
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.observeCursor = function(cursor) {
      var didChangePositionDisposable, didChangeVisibilityDisposable, didDestroyDisposable;
      didChangePositionDisposable = cursor.onDidChangePosition((function(_this) {
        return function() {
          _this.pauseCursorBlinking();
          return _this.emitDidUpdateState();
        };
      })(this));
      didChangeVisibilityDisposable = cursor.onDidChangeVisibility((function(_this) {
        return function() {
          return _this.emitDidUpdateState();
        };
      })(this));
      didDestroyDisposable = cursor.onDidDestroy((function(_this) {
        return function() {
          _this.disposables.remove(didChangePositionDisposable);
          _this.disposables.remove(didChangeVisibilityDisposable);
          _this.disposables.remove(didDestroyDisposable);
          return _this.emitDidUpdateState();
        };
      })(this));
      this.disposables.add(didChangePositionDisposable);
      this.disposables.add(didChangeVisibilityDisposable);
      return this.disposables.add(didDestroyDisposable);
    };

    TextEditorPresenter.prototype.didAddCursor = function(cursor) {
      this.observeCursor(cursor);
      this.pauseCursorBlinking();
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.startBlinkingCursors = function() {
      if (!this.isCursorBlinking()) {
        this.state.content.cursorsVisible = true;
        return this.toggleCursorBlinkHandle = setInterval(this.toggleCursorBlink.bind(this), this.getCursorBlinkPeriod() / 2);
      }
    };

    TextEditorPresenter.prototype.isCursorBlinking = function() {
      return this.toggleCursorBlinkHandle != null;
    };

    TextEditorPresenter.prototype.stopBlinkingCursors = function(visible) {
      if (this.isCursorBlinking()) {
        this.state.content.cursorsVisible = visible;
        clearInterval(this.toggleCursorBlinkHandle);
        return this.toggleCursorBlinkHandle = null;
      }
    };

    TextEditorPresenter.prototype.toggleCursorBlink = function() {
      this.state.content.cursorsVisible = !this.state.content.cursorsVisible;
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.pauseCursorBlinking = function() {
      this.stopBlinkingCursors(true);
      if (this.startBlinkingCursorsAfterDelay == null) {
        this.startBlinkingCursorsAfterDelay = _.debounce(this.startBlinkingCursors, this.getCursorBlinkResumeDelay());
      }
      this.startBlinkingCursorsAfterDelay();
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.requestAutoscroll = function(position) {
      this.pendingScrollLogicalPosition = position;
      this.pendingScrollTop = null;
      this.pendingScrollLeft = null;
      this.shouldUpdateDecorations = true;
      return this.emitDidUpdateState();
    };

    TextEditorPresenter.prototype.didChangeFirstVisibleScreenRow = function(screenRow) {
      return this.setScrollTop(this.lineTopIndex.pixelPositionAfterBlocksForRow(screenRow));
    };

    TextEditorPresenter.prototype.getVerticalScrollMarginInPixels = function() {
      return Math.round(this.model.getVerticalScrollMargin() * this.lineHeight);
    };

    TextEditorPresenter.prototype.getHorizontalScrollMarginInPixels = function() {
      return Math.round(this.model.getHorizontalScrollMargin() * this.baseCharacterWidth);
    };

    TextEditorPresenter.prototype.getVerticalScrollbarWidth = function() {
      return this.verticalScrollbarWidth;
    };

    TextEditorPresenter.prototype.getHorizontalScrollbarHeight = function() {
      return this.horizontalScrollbarHeight;
    };

    TextEditorPresenter.prototype.commitPendingLogicalScrollTopPosition = function() {
      var bottom, desiredScrollBottom, desiredScrollCenter, desiredScrollTop, options, ref2, ref3, screenRange, top, verticalScrollMarginInPixels;
      if (this.pendingScrollLogicalPosition == null) {
        return;
      }
      ref2 = this.pendingScrollLogicalPosition, screenRange = ref2.screenRange, options = ref2.options;
      verticalScrollMarginInPixels = this.getVerticalScrollMarginInPixels();
      top = this.lineTopIndex.pixelPositionAfterBlocksForRow(screenRange.start.row);
      bottom = this.lineTopIndex.pixelPositionAfterBlocksForRow(screenRange.end.row) + this.lineHeight;
      if (options != null ? options.center : void 0) {
        desiredScrollCenter = (top + bottom) / 2;
        if (!((this.getScrollTop() < desiredScrollCenter && desiredScrollCenter < this.getScrollBottom()))) {
          desiredScrollTop = desiredScrollCenter - this.getClientHeight() / 2;
          desiredScrollBottom = desiredScrollCenter + this.getClientHeight() / 2;
        }
      } else {
        desiredScrollTop = top - verticalScrollMarginInPixels;
        desiredScrollBottom = bottom + verticalScrollMarginInPixels;
      }
      if ((ref3 = options != null ? options.reversed : void 0) != null ? ref3 : true) {
        if (desiredScrollBottom > this.getScrollBottom()) {
          this.updateScrollTop(desiredScrollBottom - this.getClientHeight());
        }
        if (desiredScrollTop < this.getScrollTop()) {
          return this.updateScrollTop(desiredScrollTop);
        }
      } else {
        if (desiredScrollTop < this.getScrollTop()) {
          this.updateScrollTop(desiredScrollTop);
        }
        if (desiredScrollBottom > this.getScrollBottom()) {
          return this.updateScrollTop(desiredScrollBottom - this.getClientHeight());
        }
      }
    };

    TextEditorPresenter.prototype.commitPendingLogicalScrollLeftPosition = function() {
      var desiredScrollLeft, desiredScrollRight, horizontalScrollMarginInPixels, left, options, ref2, ref3, right, screenRange;
      if (this.pendingScrollLogicalPosition == null) {
        return;
      }
      ref2 = this.pendingScrollLogicalPosition, screenRange = ref2.screenRange, options = ref2.options;
      horizontalScrollMarginInPixels = this.getHorizontalScrollMarginInPixels();
      left = this.pixelRectForScreenRange(new Range(screenRange.start, screenRange.start)).left;
      right = this.pixelRectForScreenRange(new Range(screenRange.end, screenRange.end)).left;
      left += this.scrollLeft;
      right += this.scrollLeft;
      desiredScrollLeft = left - horizontalScrollMarginInPixels;
      desiredScrollRight = right + horizontalScrollMarginInPixels;
      if ((ref3 = options != null ? options.reversed : void 0) != null ? ref3 : true) {
        if (desiredScrollRight > this.getScrollRight()) {
          this.updateScrollLeft(desiredScrollRight - this.getClientWidth());
        }
        if (desiredScrollLeft < this.getScrollLeft()) {
          return this.updateScrollLeft(desiredScrollLeft);
        }
      } else {
        if (desiredScrollLeft < this.getScrollLeft()) {
          this.updateScrollLeft(desiredScrollLeft);
        }
        if (desiredScrollRight > this.getScrollRight()) {
          return this.updateScrollLeft(desiredScrollRight - this.getClientWidth());
        }
      }
    };

    TextEditorPresenter.prototype.commitPendingScrollLeftPosition = function() {
      if (this.pendingScrollLeft != null) {
        this.updateScrollLeft(this.pendingScrollLeft);
        return this.pendingScrollLeft = null;
      }
    };

    TextEditorPresenter.prototype.commitPendingScrollTopPosition = function() {
      if (this.pendingScrollTop != null) {
        this.updateScrollTop(this.pendingScrollTop);
        return this.pendingScrollTop = null;
      }
    };

    TextEditorPresenter.prototype.clearPendingScrollPosition = function() {
      this.pendingScrollLogicalPosition = null;
      this.pendingScrollTop = null;
      return this.pendingScrollLeft = null;
    };

    TextEditorPresenter.prototype.canScrollLeftTo = function(scrollLeft) {
      return this.scrollLeft !== this.constrainScrollLeft(scrollLeft);
    };

    TextEditorPresenter.prototype.canScrollTopTo = function(scrollTop) {
      return this.scrollTop !== this.constrainScrollTop(scrollTop);
    };

    TextEditorPresenter.prototype.restoreScrollTopIfNeeded = function() {
      if (this.scrollTop == null) {
        return this.updateScrollTop(this.lineTopIndex.pixelPositionAfterBlocksForRow(this.model.getFirstVisibleScreenRow()));
      }
    };

    TextEditorPresenter.prototype.restoreScrollLeftIfNeeded = function() {
      if (this.scrollLeft == null) {
        return this.updateScrollLeft(this.model.getFirstVisibleScreenColumn() * this.baseCharacterWidth);
      }
    };

    TextEditorPresenter.prototype.onDidChangeScrollTop = function(callback) {
      return this.emitter.on('did-change-scroll-top', callback);
    };

    TextEditorPresenter.prototype.onDidChangeScrollLeft = function(callback) {
      return this.emitter.on('did-change-scroll-left', callback);
    };

    TextEditorPresenter.prototype.getVisibleRowRange = function() {
      return [this.startRow, this.endRow];
    };

    TextEditorPresenter.prototype.isRowRendered = function(row) {
      return (this.getStartTileRow() <= row && row < this.getEndTileRow() + this.tileSize);
    };

    TextEditorPresenter.prototype.isOpenTagCode = function(tagCode) {
      return this.displayLayer.isOpenTagCode(tagCode);
    };

    TextEditorPresenter.prototype.isCloseTagCode = function(tagCode) {
      return this.displayLayer.isCloseTagCode(tagCode);
    };

    TextEditorPresenter.prototype.tagForCode = function(tagCode) {
      return this.displayLayer.tagForCode(tagCode);
    };

    return TextEditorPresenter;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3RleHQtZWRpdG9yLXByZXNlbnRlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFBLE1BQWlDLE9BQUEsQ0FBUSxXQUFSLENBQWpDLEVBQUMsNkNBQUQsRUFBc0I7O0VBQ3RCLE9BQWlCLE9BQUEsQ0FBUSxhQUFSLENBQWpCLEVBQUMsa0JBQUQsRUFBUTs7RUFDUixDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLFVBQUEsR0FBYSxPQUFBLENBQVEsY0FBUjs7RUFFYixNQUFNLENBQUMsT0FBUCxHQUNNO2tDQUNKLHVCQUFBLEdBQXlCOztrQ0FDekIsOEJBQUEsR0FBZ0M7O2tDQUNoQyx5QkFBQSxHQUEyQjs7a0NBQzNCLG1CQUFBLEdBQXFCOztrQ0FDckIsaUJBQUEsR0FBbUI7O2tDQUNuQixxQkFBQSxHQUF1Qjs7SUFFViw2QkFBQyxNQUFEO01BQ1YsSUFBQyxDQUFBLGVBQUEsS0FBRixFQUFTLElBQUMsQ0FBQSxzQkFBQTtNQUNWLElBQUMsQ0FBQSxLQUFLLENBQUMsU0FBUCxHQUFtQjtNQUNsQixJQUFDLENBQUEsMkJBQUEsaUJBQUYsRUFBcUIsSUFBQyxDQUFBLGdDQUFBLHNCQUF0QixFQUE4QyxJQUFDLENBQUEsK0JBQUEscUJBQS9DLEVBQXNFLElBQUMsQ0FBQSxrQkFBQSxRQUF2RSxFQUFpRixJQUFDLENBQUEsb0JBQUE7TUFDakYsSUFBQyxDQUFBLG9CQUFxQixPQUFyQjtNQUNELElBQUMsQ0FBQSxlQUFnQixJQUFDLENBQUEsTUFBakI7TUFFRixJQUFDLENBQUEsV0FBRCxHQUFlOztRQUNmLElBQUMsQ0FBQSxXQUFZOztNQUNiLElBQUMsQ0FBQSxhQUFELEdBQWlCLElBQUMsQ0FBQTtNQUNsQixJQUFDLENBQUEsY0FBRCxHQUFrQixJQUFDLENBQUE7TUFDbkIsSUFBQyxDQUFB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QUdoQixVQUFBLEdBQVksU0FBQyxPQUFEO2FBQ1YsSUFBQyxDQUFBLFlBQVksQ0FBQyxVQUFkLENBQXlCLE9BQXpCO0lBRFU7Ozs7O0FBeGhEZCIsInNvdXJjZXNDb250ZW50IjpbIntDb21wb3NpdGVEaXNwb3NhYmxlLCBFbWl0dGVyfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcbntQb2ludCwgUmFuZ2V9ID0gcmVxdWlyZSAndGV4dC1idWZmZXInXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZS1wbHVzJ1xuRGVjb3JhdGlvbiA9IHJlcXVpcmUgJy4vZGVjb3JhdGlvbidcblxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgVGV4dEVkaXRvclByZXNlbnRlclxuICB0b2dnbGVDdXJzb3JCbGlua0hhbmRsZTogbnVsbFxuICBzdGFydEJsaW5raW5nQ3Vyc29yc0FmdGVyRGVsYXk6IG51bGxcbiAgc3RvcHBlZFNjcm9sbGluZ1RpbWVvdXRJZDogbnVsbFxuICBtb3VzZVdoZWVsU2NyZWVuUm93OiBudWxsXG4gIG92ZXJsYXlEaW1lbnNpb25zOiBudWxsXG4gIG1pbmltdW1SZWZsb3dJbnRlcnZhbDogMjAwXG5cbiAgY29uc3RydWN0b3I6IChwYXJhbXMpIC0+XG4gICAge0Btb2RlbCwgQGxpbmVUb3BJbmRleH0gPSBwYXJhbXNcbiAgICBAbW9kZWwucHJlc2VudGVyID0gdGhpc1xuICAgIHtAY3Vyc29yQmxpbmtQZXJpb2QsIEBjdXJzb3JCbGlua1Jlc3VtZURlbGF5LCBAc3RvcHBlZFNjcm9sbGluZ0RlbGF5LCBAdGlsZVNpemUsIEBhdXRvSGVpZ2h0fSA9IHBhcmFtc1xuICAgIHtAY29udGVudEZyYW1lV2lkdGh9ID0gcGFyYW1zXG4gICAge0BkaXNwbGF5TGF5ZXJ9ID0gQG1vZGVsXG5cbiAgICBAZ3V0dGVyV2lkdGggPSAwXG4gICAgQHRpbGVTaXplID89IDZcbiAgICBAcmVhbFNjcm9sbFRvcCA9IEBzY3JvbGxUb3BcbiAgICBAcmVhbFNjcm9sbExlZnQgPSBAc2Nyb2xsTGVmdFxuICAgIEBkaXNwb3NhYmxlcyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlXG4gICAgQGVtaXR0ZXIgPSBuZXcgRW1pdHRlclxuICAgIEBsaW5lc0J5U2NyZWVuUm93ID0gbmV3IE1hcFxuICAgIEB2aXNpYmxlSGlnaGxpZ2h0cyA9IHt9XG4gICAgQGNoYXJhY3RlcldpZHRoc0J5U2NvcGUgPSB7fVxuICAgIEBsaW5lRGVjb3JhdGlvbnNCeVNjcmVlblJvdyA9IHt9XG4gICAgQGxpbmVOdW1iZXJEZWNvcmF0aW9uc0J5U2NyZWVuUm93ID0ge31cbiAgICBAY3VzdG9tR3V0dGVyRGVjb3JhdGlvbnNCeUd1dHRlck5hbWUgPSB7fVxuICAgIEBvdmVybGF5RGltZW5zaW9ucyA9IHt9XG4gICAgQG9ic2VydmVkQmxvY2tEZWNvcmF0aW9ucyA9IG5ldyBTZXQoKVxuICAgIEBpbnZhbGlkYXRlZERpbWVuc2lvbnNCeUJsb2NrRGVjb3JhdGlvbiA9IG5ldyBTZXQoKVxuICAgIEBpbnZhbGlkYXRlQWxsQmxvY2tEZWNvcmF0aW9uc0RpbWVuc2lvbnMgPSBmYWxzZVxuICAgIEBwcmVjZWRpbmdCbG9ja0RlY29yYXRpb25zQnlTY3JlZW5Sb3dBbmRJZCA9IHt9XG4gICAgQGZvbGxvd2luZ0Jsb2NrRGVjb3JhdGlvbnNCeVNjcmVlblJvd0FuZElkID0ge31cbiAgICBAc2NyZWVuUm93c1RvTWVhc3VyZSA9IFtdXG4gICAgQGZsYXNoQ291bnRzQnlEZWNvcmF0aW9uSWQgPSB7fVxuICAgIEB0cmFuc2Zlck1lYXN1cmVtZW50c1RvTW9kZWwoKVxuICAgIEB0cmFuc2Zlck1lYXN1cmVtZW50c0Zyb21Nb2RlbCgpXG4gICAgQG9ic2VydmVNb2RlbCgpXG4gICAgQGJ1aWxkU3RhdGUoKVxuICAgIEBpbnZhbGlkYXRlU3RhdGUoKVxuICAgIEBzdGFydEJsaW5raW5nQ3Vyc29ycygpIGlmIEBmb2N1c2VkXG4gICAgQHN0YXJ0UmVmbG93aW5nKCkgaWYgQGNvbnRpbnVvdXNSZWZsb3dcbiAgICBAdXBkYXRpbmcgPSBmYWxzZVxuXG4gIHNldExpbmVzWWFyZHN0aWNrOiAoQGxpbmVzWWFyZHN0aWNrKSAtPlxuXG4gIGdldExpbmVzWWFyZHN0aWNrOiAtPiBAbGluZXNZYXJkc3RpY2tcblxuICBkZXN0cm95OiAtPlxuICAgIEBkaXNwb3NhYmxlcy5kaXNwb3NlKClcbiAgICBjbGVhclRpbWVvdXQoQHN0b3BwZWRTY3JvbGxpbmdUaW1lb3V0SWQpIGlmIEBzdG9wcGVkU2Nyb2xsaW5nVGltZW91dElkP1xuICAgIGNsZWFySW50ZXJ2YWwoQHJlZmxvd2luZ0ludGVydmFsKSBpZiBAcmVmbG93aW5nSW50ZXJ2YWw/XG4gICAgQHN0b3BCbGlua2luZ0N1cnNvcnMoKVxuXG4gICMgQ2FsbHMgeW91ciBgY2FsbGJhY2tgIHdoZW4gc29tZSBjaGFuZ2VzIGluIHRoZSBtb2RlbCBvY2N1cnJlZCBhbmQgdGhlIGN1cnJlbnQgc3RhdGUgaGFzIGJlZW4gdXBkYXRlZC5cbiAgb25EaWRVcGRhdGVTdGF0ZTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtdXBkYXRlLXN0YXRlJywgY2FsbGJhY2tcblxuICBlbWl0RGlkVXBkYXRlU3RhdGU6IC0+XG4gICAgQGVtaXR0ZXIuZW1pdCBcImRpZC11cGRhdGUtc3RhdGVcIiBpZiBAaXNCYXRjaGluZygpXG5cbiAgdHJhbnNmZXJNZWFzdXJlbWVudHNUb01vZGVsOiAtPlxuICAgIEBtb2RlbC5zZXRMaW5lSGVpZ2h0SW5QaXhlbHMoQGxpbmVIZWlnaHQpIGlmIEBsaW5lSGVpZ2h0P1xuICAgIEBtb2RlbC5zZXREZWZhdWx0Q2hhcldpZHRoKEBiYXNlQ2hhcmFjdGVyV2lkdGgpIGlmIEBiYXNlQ2hhcmFjdGVyV2lkdGg/XG5cbiAgdHJhbnNmZXJNZWFzdXJlbWVudHNGcm9tTW9kZWw6IC0+XG4gICAgQGVkaXRvcldpZHRoSW5DaGFycyA9IEBtb2RlbC5nZXRFZGl0b3JXaWR0aEluQ2hhcnMoKVxuXG4gICMgUHJpdmF0ZTogRGV0ZXJtaW5lcyB3aGV0aGVyIHtUZXh0RWRpdG9yUHJlc2VudGVyfSBpcyBjdXJyZW50bHkgYmF0Y2hpbmcgY2hhbmdlcy5cbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LCBgdHJ1ZWAgaWYgaXMgY29sbGVjdGluZyBjaGFuZ2VzLCBgZmFsc2VgIGlmIGlzIGFwcGx5aW5nIHRoZW0uXG4gIGlzQmF0Y2hpbmc6IC0+XG4gICAgQHVwZGF0aW5nIGlzIGZhbHNlXG5cbiAgZ2V0UHJlTWVhc3VyZW1lbnRTdGF0ZTogLT5cbiAgICBAdXBkYXRpbmcgPSB0cnVlXG5cbiAgICBAdXBkYXRlVmVydGljYWxEaW1lbnNpb25zKClcbiAgICBAdXBkYXRlU2Nyb2xsYmFyRGltZW5zaW9ucygpXG5cbiAgICBAY29tbWl0UGVuZGluZ0xvZ2ljYWxTY3JvbGxUb3BQb3NpdGlvbigpXG4gICAgQGNvbW1pdFBlbmRpbmdTY3JvbGxUb3BQb3NpdGlvbigpXG5cbiAgICBAdXBkYXRlU3RhcnRSb3coKVxuICAgIEB1cGRhdGVFbmRSb3coKVxuICAgIEB1cGRhdGVDb21tb25HdXR0ZXJTdGF0ZSgpXG4gICAgQHVwZGF0ZVJlZmxvd1N0YXRlKClcblxuICAgIEB1cGRhdGVMaW5lcygpXG5cbiAgICBpZiBAc2hvdWxkVXBkYXRlRGVjb3JhdGlvbnNcbiAgICAgIEBmZXRjaERlY29yYXRpb25zKClcbiAgICAgIEB1cGRhdGVMaW5lRGVjb3JhdGlvbnMoKVxuICAgICAgQHVwZGF0ZUJsb2NrRGVjb3JhdGlvbnMoKVxuXG4gICAgQHVwZGF0ZVRpbGVzU3RhdGUoKVxuXG4gICAgQHVwZGF0aW5nID0gZmFsc2VcbiAgICBAc3RhdGVcblxuICBnZXRQb3N0TWVhc3VyZW1lbnRTdGF0ZTogLT5cbiAgICBAdXBkYXRpbmcgPSB0cnVlXG5cbiAgICBAdXBkYXRlSG9yaXpvbnRhbERpbWVuc2lvbnMoKVxuICAgIEBjb21taXRQZW5kaW5nTG9naWNhbFNjcm9sbExlZnRQb3NpdGlvbigpXG4gICAgQGNvbW1pdFBlbmRpbmdTY3JvbGxMZWZ0UG9zaXRpb24oKVxuICAgIEBjbGVhclBlbmRpbmdTY3JvbGxQb3NpdGlvbigpXG4gICAgQHVwZGF0ZVJvd3NQZXJQYWdlKClcblxuICAgIEB1cGRhdGVMaW5lcygpXG5cbiAgICBAdXBkYXRlVmVydGljYWxTY3JvbGxTdGF0ZSgpXG4gICAgQHVwZGF0ZUhvcml6b250YWxTY3JvbGxTdGF0ZSgpXG4gICAgQHVwZGF0ZVNjcm9sbGJhcnNTdGF0ZSgpXG4gICAgQHVwZGF0ZUhpZGRlbklucHV0U3RhdGUoKVxuICAgIEB1cGRhdGVDb250ZW50U3RhdGUoKVxuICAgIEB1cGRhdGVGb2N1c2VkU3RhdGUoKVxuICAgIEB1cGRhdGVIZWlnaHRTdGF0ZSgpXG4gICAgQHVwZGF0ZVdpZHRoU3RhdGUoKVxuICAgIEB1cGRhdGVIaWdobGlnaHREZWNvcmF0aW9ucygpIGlmIEBzaG91bGRVcGRhdGVEZWNvcmF0aW9uc1xuICAgIEB1cGRhdGVUaWxlc1N0YXRlKClcbiAgICBAdXBkYXRlQ3Vyc29yc1N0YXRlKClcbiAgICBAdXBkYXRlT3ZlcmxheXNTdGF0ZSgpXG4gICAgQHVwZGF0ZUxpbmVOdW1iZXJHdXR0ZXJTdGF0ZSgpXG4gICAgQHVwZGF0ZUd1dHRlck9yZGVyU3RhdGUoKVxuICAgIEB1cGRhdGVDdXN0b21HdXR0ZXJEZWNvcmF0aW9uU3RhdGUoKVxuICAgIEB1cGRhdGluZyA9IGZhbHNlXG5cbiAgICBAcmVzZXRUcmFja2VkVXBkYXRlcygpXG4gICAgQHN0YXRlXG5cbiAgcmVzZXRUcmFja2VkVXBkYXRlczogLT5cbiAgICBAc2hvdWxkVXBkYXRlRGVjb3JhdGlvbnMgPSBmYWxzZVxuXG4gIGludmFsaWRhdGVTdGF0ZTogLT5cbiAgICBAc2hvdWxkVXBkYXRlRGVjb3JhdGlvbnMgPSB0cnVlXG5cbiAgb2JzZXJ2ZU1vZGVsOiAtPlxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQG1vZGVsLmRpc3BsYXlMYXllci5vbkRpZFJlc2V0ID0+XG4gICAgICBAc3BsaWNlQmxvY2tEZWNvcmF0aW9uc0luUmFuZ2UoMCwgSW5maW5pdHksIEluZmluaXR5KVxuICAgICAgQHNob3VsZFVwZGF0ZURlY29yYXRpb25zID0gdHJ1ZVxuICAgICAgQGVtaXREaWRVcGRhdGVTdGF0ZSgpXG5cbiAgICBAZGlzcG9zYWJsZXMuYWRkIEBtb2RlbC5kaXNwbGF5TGF5ZXIub25EaWRDaGFuZ2VTeW5jIChjaGFuZ2VzKSA9PlxuICAgICAgZm9yIGNoYW5nZSBpbiBjaGFuZ2VzXG4gICAgICAgIHN0YXJ0Um93ID0gY2hhbmdlLnN0YXJ0LnJvd1xuICAgICAgICBlbmRSb3cgPSBzdGFydFJvdyArIGNoYW5nZS5vbGRFeHRlbnQucm93XG4gICAgICAgIEBzcGxpY2VCbG9ja0RlY29yYXRpb25zSW5SYW5nZShzdGFydFJvdywgZW5kUm93LCBjaGFuZ2UubmV3RXh0ZW50LnJvdyAtIGNoYW5nZS5vbGRFeHRlbnQucm93KVxuICAgICAgQHNob3VsZFVwZGF0ZURlY29yYXRpb25zID0gdHJ1ZVxuICAgICAgQGVtaXREaWRVcGRhdGVTdGF0ZSgpXG5cbiAgICBAZGlzcG9zYWJsZXMuYWRkIEBtb2RlbC5vbkRpZFVwZGF0ZURlY29yYXRpb25zID0+XG4gICAgICBAc2hvdWxkVXBkYXRlRGVjb3JhdGlvbnMgPSB0cnVlXG4gICAgICBAZW1pdERpZFVwZGF0ZVN0YXRlKClcblxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQG1vZGVsLm9uRGlkQWRkRGVjb3JhdGlvbihAZGlkQWRkQmxvY2tEZWNvcmF0aW9uLmJpbmQodGhpcykpXG5cbiAgICBmb3IgZGVjb3JhdGlvbiBpbiBAbW9kZWwuZ2V0RGVjb3JhdGlvbnMoe3R5cGU6ICdibG9jayd9KVxuICAgICAgdGhpcy5kaWRBZGRCbG9ja0RlY29yYXRpb24oZGVjb3JhdGlvbilcblxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQG1vZGVsLm9uRGlkQ2hhbmdlR3JhbW1hcihAZGlkQ2hhbmdlR3JhbW1hci5iaW5kKHRoaXMpKVxuICAgIEBkaXNwb3NhYmxlcy5hZGQgQG1vZGVsLm9uRGlkQ2hhbmdlUGxhY2Vob2xkZXJUZXh0KEBlbWl0RGlkVXBkYXRlU3RhdGUuYmluZCh0aGlzKSlcbiAgICBAZGlzcG9zYWJsZXMuYWRkIEBtb2RlbC5vbkRpZENoYW5nZU1pbmkgPT5cbiAgICAgIEBzaG91bGRVcGRhdGVEZWNvcmF0aW9ucyA9IHRydWVcbiAgICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gICAgQGRpc3Bvc2FibGVzLmFkZCBAbW9kZWwub25EaWRDaGFuZ2VMaW5lTnVtYmVyR3V0dGVyVmlzaWJsZShAZW1pdERpZFVwZGF0ZVN0YXRlLmJpbmQodGhpcykpXG5cbiAgICBAZGlzcG9zYWJsZXMuYWRkIEBtb2RlbC5vbkRpZEFkZEN1cnNvcihAZGlkQWRkQ3Vyc29yLmJpbmQodGhpcykpXG4gICAgQGRpc3Bvc2FibGVzLmFkZCBAbW9kZWwub25EaWRSZXF1ZXN0QXV0b3Njcm9sbChAcmVxdWVzdEF1dG9zY3JvbGwuYmluZCh0aGlzKSlcbiAgICBAZGlzcG9zYWJsZXMuYWRkIEBtb2RlbC5vbkRpZENoYW5nZUZpcnN0VmlzaWJsZVNjcmVlblJvdyhAZGlkQ2hhbmdlRmlyc3RWaXNpYmxlU2NyZWVuUm93LmJpbmQodGhpcykpXG4gICAgQG9ic2VydmVDdXJzb3IoY3Vyc29yKSBmb3IgY3Vyc29yIGluIEBtb2RlbC5nZXRDdXJzb3JzKClcbiAgICBAZGlzcG9zYWJsZXMuYWRkIEBtb2RlbC5vbkRpZEFkZEd1dHRlcihAZGlkQWRkR3V0dGVyLmJpbmQodGhpcykpXG4gICAgcmV0dXJuXG5cbiAgZGlkQ2hhbmdlU2Nyb2xsUGFzdEVuZDogLT5cbiAgICBAdXBkYXRlU2Nyb2xsSGVpZ2h0KClcbiAgICBAZW1pdERpZFVwZGF0ZVN0YXRlKClcblxuICBkaWRDaGFuZ2VTaG93TGluZU51bWJlcnM6IC0+XG4gICAgQGVtaXREaWRVcGRhdGVTdGF0ZSgpXG5cbiAgZGlkQ2hhbmdlR3JhbW1hcjogLT5cbiAgICBAZW1pdERpZFVwZGF0ZVN0YXRlKClcblxuICBidWlsZFN0YXRlOiAtPlxuICAgIEBzdGF0ZSA9XG4gICAgICBob3Jpem9udGFsU2Nyb2xsYmFyOiB7fVxuICAgICAgdmVydGljYWxTY3JvbGxiYXI6IHt9XG4gICAgICBoaWRkZW5JbnB1dDoge31cbiAgICAgIGNvbnRlbnQ6XG4gICAgICAgIHNjcm9sbGluZ1ZlcnRpY2FsbHk6IGZhbHNlXG4gICAgICAgIGN1cnNvcnNWaXNpYmxlOiBmYWxzZVxuICAgICAgICB0aWxlczoge31cbiAgICAgICAgaGlnaGxpZ2h0czoge31cbiAgICAgICAgb3ZlcmxheXM6IHt9XG4gICAgICAgIGN1cnNvcnM6IHt9XG4gICAgICAgIG9mZlNjcmVlbkJsb2NrRGVjb3JhdGlvbnM6IHt9XG4gICAgICBndXR0ZXJzOiBbXVxuICAgICMgU2hhcmVkIHN0YXRlIHRoYXQgaXMgY29waWVkIGludG8gYGBAc3RhdGUuZ3V0dGVyc2AuXG4gICAgQHNoYXJlZEd1dHRlclN0eWxlcyA9IHt9XG4gICAgQGN1c3RvbUd1dHRlckRlY29yYXRpb25zID0ge31cbiAgICBAbGluZU51bWJlckd1dHRlciA9XG4gICAgICB0aWxlczoge31cblxuICBzZXRDb250aW51b3VzUmVmbG93OiAoQGNvbnRpbnVvdXNSZWZsb3cpIC0+XG4gICAgaWYgQGNvbnRpbnVvdXNSZWZsb3dcbiAgICAgIEBzdGFydFJlZmxvd2luZygpXG4gICAgZWxzZVxuICAgICAgQHN0b3BSZWZsb3dpbmcoKVxuXG4gIHVwZGF0ZVJlZmxvd1N0YXRlOiAtPlxuICAgIEBzdGF0ZS5jb250ZW50LmNvbnRpbnVvdXNSZWZsb3cgPSBAY29udGludW91c1JlZmxvd1xuICAgIEBsaW5lTnVtYmVyR3V0dGVyLmNvbnRpbnVvdXNSZWZsb3cgPSBAY29udGludW91c1JlZmxvd1xuXG4gIHN0YXJ0UmVmbG93aW5nOiAtPlxuICAgIEByZWZsb3dpbmdJbnRlcnZhbCA9IHNldEludGVydmFsKEBlbWl0RGlkVXBkYXRlU3RhdGUuYmluZCh0aGlzKSwgQG1pbmltdW1SZWZsb3dJbnRlcnZhbClcblxuICBzdG9wUmVmbG93aW5nOiAtPlxuICAgIGNsZWFySW50ZXJ2YWwoQHJlZmxvd2luZ0ludGVydmFsKVxuICAgIEByZWZsb3dpbmdJbnRlcnZhbCA9IG51bGxcblxuICB1cGRhdGVGb2N1c2VkU3RhdGU6IC0+XG4gICAgQHN0YXRlLmZvY3VzZWQgPSBAZm9jdXNlZFxuXG4gIHVwZGF0ZUhlaWdodFN0YXRlOiAtPlxuICAgIGlmIEBhdXRvSGVpZ2h0XG4gICAgICBAc3RhdGUuaGVpZ2h0ID0gQGNvbnRlbnRIZWlnaHRcbiAgICBlbHNlXG4gICAgICBAc3RhdGUuaGVpZ2h0ID0gbnVsbFxuXG4gIHVwZGF0ZVdpZHRoU3RhdGU6IC0+XG4gICAgaWYgQG1vZGVsLmdldEF1dG9XaWR0aCgpXG4gICAgICBAc3RhdGUud2lkdGggPSBAc3RhdGUuY29udGVudC53aWR0aCArIEBndXR0ZXJXaWR0aFxuICAgIGVsc2VcbiAgICAgIEBzdGF0ZS53aWR0aCA9IG51bGxcblxuICB1cGRhdGVWZXJ0aWNhbFNjcm9sbFN0YXRlOiAtPlxuICAgIEBzdGF0ZS5jb250ZW50LnNjcm9sbEhlaWdodCA9IEBzY3JvbGxIZWlnaHRcbiAgICBAc2hhcmVkR3V0dGVyU3R5bGVzLnNjcm9sbEhlaWdodCA9IEBzY3JvbGxIZWlnaHRcbiAgICBAc3RhdGUudmVydGljYWxTY3JvbGxiYXIuc2Nyb2xsSGVpZ2h0ID0gQHNjcm9sbEhlaWdodFxuXG4gICAgQHN0YXRlLmNvbnRlbnQuc2Nyb2xsVG9wID0gQHNjcm9sbFRvcFxuICAgIEBzaGFyZWRHdXR0ZXJTdHlsZXMuc2Nyb2xsVG9wID0gQHNjcm9sbFRvcFxuICAgIEBzdGF0ZS52ZXJ0aWNhbFNjcm9sbGJhci5zY3JvbGxUb3AgPSBAc2Nyb2xsVG9wXG5cbiAgdXBkYXRlSG9yaXpvbnRhbFNjcm9sbFN0YXRlOiAtPlxuICAgIEBzdGF0ZS5jb250ZW50LnNjcm9sbFdpZHRoID0gQHNjcm9sbFdpZHRoXG4gICAgQHN0YXRlLmhvcml6b250YWxTY3JvbGxiYXIuc2Nyb2xsV2lkdGggPSBAc2Nyb2xsV2lkdGhcblxuICAgIEBzdGF0ZS5jb250ZW50LnNjcm9sbExlZnQgPSBAc2Nyb2xsTGVmdFxuICAgIEBzdGF0ZS5ob3Jpem9udGFsU2Nyb2xsYmFyLnNjcm9sbExlZnQgPSBAc2Nyb2xsTGVmdFxuXG4gIHVwZGF0ZVNjcm9sbGJhcnNTdGF0ZTogLT5cbiAgICBAc3RhdGUuaG9yaXpvbnRhbFNjcm9sbGJhci52aXNpYmxlID0gQGhvcml6b250YWxTY3JvbGxiYXJIZWlnaHQgPiAwXG4gICAgQHN0YXRlLmhvcml6b250YWxTY3JvbGxiYXIuaGVpZ2h0ID0gQG1lYXN1cmVkSG9yaXpvbnRhbFNjcm9sbGJhckhlaWdodFxuICAgIEBzdGF0ZS5ob3Jpem9udGFsU2Nyb2xsYmFyLnJpZ2h0ID0gQHZlcnRpY2FsU2Nyb2xsYmFyV2lkdGhcblxuICAgIEBzdGF0ZS52ZXJ0aWNhbFNjcm9sbGJhci52aXNpYmxlID0gQHZlcnRpY2FsU2Nyb2xsYmFyV2lkdGggPiAwXG4gICAgQHN0YXRlLnZlcnRpY2FsU2Nyb2xsYmFyLndpZHRoID0gQG1lYXN1cmVkVmVydGljYWxTY3JvbGxiYXJXaWR0aFxuICAgIEBzdGF0ZS52ZXJ0aWNhbFNjcm9sbGJhci5ib3R0b20gPSBAaG9yaXpvbnRhbFNjcm9sbGJhckhlaWdodFxuXG4gIHVwZGF0ZUhpZGRlbklucHV0U3RhdGU6IC0+XG4gICAgcmV0dXJuIHVubGVzcyBsYXN0Q3Vyc29yID0gQG1vZGVsLmdldExhc3RDdXJzb3IoKVxuXG4gICAge3RvcCwgbGVmdCwgaGVpZ2h0LCB3aWR0aH0gPSBAcGl4ZWxSZWN0Rm9yU2NyZWVuUmFuZ2UobGFzdEN1cnNvci5nZXRTY3JlZW5SYW5nZSgpKVxuXG4gICAgaWYgQGZvY3VzZWRcbiAgICAgIEBzdGF0ZS5oaWRkZW5JbnB1dC50b3AgPSBNYXRoLm1heChNYXRoLm1pbih0b3AsIEBjbGllbnRIZWlnaHQgLSBoZWlnaHQpLCAwKVxuICAgICAgQHN0YXRlLmhpZGRlbklucHV0LmxlZnQgPSBNYXRoLm1heChNYXRoLm1pbihsZWZ0LCBAY2xpZW50V2lkdGggLSB3aWR0aCksIDApXG4gICAgZWxzZVxuICAgICAgQHN0YXRlLmhpZGRlbklucHV0LnRvcCA9IDBcbiAgICAgIEBzdGF0ZS5oaWRkZW5JbnB1dC5sZWZ0ID0gMFxuXG4gICAgQHN0YXRlLmhpZGRlbklucHV0LmhlaWdodCA9IGhlaWdodFxuICAgIEBzdGF0ZS5oaWRkZW5JbnB1dC53aWR0aCA9IE1hdGgubWF4KHdpZHRoLCAyKVxuXG4gIHVwZGF0ZUNvbnRlbnRTdGF0ZTogLT5cbiAgICBpZiBAYm91bmRpbmdDbGllbnRSZWN0P1xuICAgICAgQHNoYXJlZEd1dHRlclN0eWxlcy5tYXhIZWlnaHQgPSBAYm91bmRpbmdDbGllbnRSZWN0LmhlaWdodFxuICAgICAgQHN0YXRlLmNvbnRlbnQubWF4SGVpZ2h0ID0gQGJvdW5kaW5nQ2xpZW50UmVjdC5oZWlnaHRcblxuICAgIHZlcnRpY2FsU2Nyb2xsYmFyV2lkdGggPSBAdmVydGljYWxTY3JvbGxiYXJXaWR0aCA/IDBcbiAgICBjb250ZW50RnJhbWVXaWR0aCA9IEBjb250ZW50RnJhbWVXaWR0aCA/IDBcbiAgICBjb250ZW50V2lkdGggPSBAY29udGVudFdpZHRoID8gMFxuICAgIGlmIEBtb2RlbC5nZXRBdXRvV2lkdGgoKVxuICAgICAgQHN0YXRlLmNvbnRlbnQud2lkdGggPSBjb250ZW50V2lkdGggKyB2ZXJ0aWNhbFNjcm9sbGJhcldpZHRoXG4gICAgZWxzZVxuICAgICAgQHN0YXRlLmNvbnRlbnQud2lkdGggPSBNYXRoLm1heChjb250ZW50V2lkdGggKyB2ZXJ0aWNhbFNjcm9sbGJhcldpZHRoLCBjb250ZW50RnJhbWVXaWR0aClcbiAgICBAc3RhdGUuY29udGVudC5zY3JvbGxXaWR0aCA9IEBzY3JvbGxXaWR0aFxuICAgIEBzdGF0ZS5jb250ZW50LnNjcm9sbExlZnQgPSBAc2Nyb2xsTGVmdFxuICAgIEBzdGF0ZS5jb250ZW50LmJhY2tncm91bmRDb2xvciA9IGlmIEBtb2RlbC5pc01pbmkoKSB0aGVuIG51bGwgZWxzZSBAYmFja2dyb3VuZENvbG9yXG4gICAgQHN0YXRlLmNvbnRlbnQucGxhY2Vob2xkZXJUZXh0ID0gaWYgQG1vZGVsLmlzRW1wdHkoKSB0aGVuIEBtb2RlbC5nZXRQbGFjZWhvbGRlclRleHQoKSBlbHNlIG51bGxcblxuICB0aWxlRm9yUm93OiAocm93KSAtPlxuICAgIHJvdyAtIChyb3cgJSBAdGlsZVNpemUpXG5cbiAgZ2V0U3RhcnRUaWxlUm93OiAtPlxuICAgIEB0aWxlRm9yUm93KEBzdGFydFJvdyA/IDApXG5cbiAgZ2V0RW5kVGlsZVJvdzogLT5cbiAgICBAdGlsZUZvclJvdyhAZW5kUm93ID8gMClcblxuICBnZXRTY3JlZW5Sb3dzVG9SZW5kZXI6IC0+XG4gICAgc3RhcnRSb3cgPSBAZ2V0U3RhcnRUaWxlUm93KClcbiAgICBlbmRSb3cgPSBAZ2V0RW5kVGlsZVJvdygpICsgQHRpbGVTaXplXG5cbiAgICBzY3JlZW5Sb3dzID0gW3N0YXJ0Um93Li4uZW5kUm93XVxuICAgIGxvbmdlc3RTY3JlZW5Sb3cgPSBAbW9kZWwuZ2V0QXBwcm94aW1hdGVMb25nZXN0U2NyZWVuUm93KClcbiAgICBpZiBsb25nZXN0U2NyZWVuUm93P1xuICAgICAgc2NyZWVuUm93cy5wdXNoKGxvbmdlc3RTY3JlZW5Sb3cpXG4gICAgaWYgQHNjcmVlblJvd3NUb01lYXN1cmU/XG4gICAgICBzY3JlZW5Sb3dzLnB1c2goQHNjcmVlblJvd3NUb01lYXN1cmUuLi4pXG5cbiAgICBzY3JlZW5Sb3dzID0gc2NyZWVuUm93cy5maWx0ZXIgKHJvdykgLT4gcm93ID49IDBcbiAgICBzY3JlZW5Sb3dzLnNvcnQgKGEsIGIpIC0+IGEgLSBiXG4gICAgXy51bmlxKHNjcmVlblJvd3MsIHRydWUpXG5cbiAgZ2V0U2NyZWVuUmFuZ2VzVG9SZW5kZXI6IC0+XG4gICAgc2NyZWVuUm93cyA9IEBnZXRTY3JlZW5Sb3dzVG9SZW5kZXIoKVxuICAgIHNjcmVlblJvd3MucHVzaChJbmZpbml0eSkgIyBtYWtlcyB0aGUgbG9vcCBiZWxvdyBpbmNsdXNpdmVcblxuICAgIHN0YXJ0Um93ID0gc2NyZWVuUm93c1swXVxuICAgIGVuZFJvdyA9IHN0YXJ0Um93IC0gMVxuICAgIHNjcmVlblJhbmdlcyA9IFtdXG4gICAgZm9yIHJvdyBpbiBzY3JlZW5Sb3dzXG4gICAgICBpZiByb3cgaXMgZW5kUm93ICsgMVxuICAgICAgICBlbmRSb3crK1xuICAgICAgZWxzZVxuICAgICAgICBzY3JlZW5SYW5nZXMucHVzaChbc3RhcnRSb3csIGVuZFJvd10pXG4gICAgICAgIHN0YXJ0Um93ID0gZW5kUm93ID0gcm93XG5cbiAgICBzY3JlZW5SYW5nZXNcblxuICBzZXRTY3JlZW5Sb3dzVG9NZWFzdXJlOiAoc2NyZWVuUm93cykgLT5cbiAgICByZXR1cm4gaWYgbm90IHNjcmVlblJvd3M/IG9yIHNjcmVlblJvd3MubGVuZ3RoIGlzIDBcblxuICAgIEBzY3JlZW5Sb3dzVG9NZWFzdXJlID0gc2NyZWVuUm93c1xuICAgIEBzaG91bGRVcGRhdGVEZWNvcmF0aW9ucyA9IHRydWVcblxuICBjbGVhclNjcmVlblJvd3NUb01lYXN1cmU6IC0+XG4gICAgQHNjcmVlblJvd3NUb01lYXN1cmUgPSBbXVxuXG4gIHVwZGF0ZVRpbGVzU3RhdGU6IC0+XG4gICAgcmV0dXJuIHVubGVzcyBAc3RhcnRSb3c/IGFuZCBAZW5kUm93PyBhbmQgQGxpbmVIZWlnaHQ/XG5cbiAgICBzY3JlZW5Sb3dzID0gQGdldFNjcmVlblJvd3NUb1JlbmRlcigpXG4gICAgdmlzaWJsZVRpbGVzID0ge31cbiAgICBzdGFydFJvdyA9IHNjcmVlblJvd3NbMF1cbiAgICBlbmRSb3cgPSBzY3JlZW5Sb3dzW3NjcmVlblJvd3MubGVuZ3RoIC0gMV1cbiAgICBzY3JlZW5Sb3dJbmRleCA9IHNjcmVlblJvd3MubGVuZ3RoIC0gMVxuICAgIHpJbmRleCA9IDBcblxuICAgIGZvciB0aWxlU3RhcnRSb3cgaW4gW0B0aWxlRm9yUm93KGVuZFJvdykuLkB0aWxlRm9yUm93KHN0YXJ0Um93KV0gYnkgLUB0aWxlU2l6ZVxuICAgICAgdGlsZUVuZFJvdyA9IHRpbGVTdGFydFJvdyArIEB0aWxlU2l6ZVxuICAgICAgcm93c1dpdGhpblRpbGUgPSBbXVxuXG4gICAgICB3aGlsZSBzY3JlZW5Sb3dJbmRleCA+PSAwXG4gICAgICAgIGN1cnJlbnRTY3JlZW5Sb3cgPSBzY3JlZW5Sb3dzW3NjcmVlblJvd0luZGV4XVxuICAgICAgICBicmVhayBpZiBjdXJyZW50U2NyZWVuUm93IDwgdGlsZVN0YXJ0Um93XG4gICAgICAgIHJvd3NXaXRoaW5UaWxlLnB1c2goY3VycmVudFNjcmVlblJvdylcbiAgICAgICAgc2NyZWVuUm93SW5kZXgtLVxuXG4gICAgICBjb250aW51ZSBpZiByb3dzV2l0aGluVGlsZS5sZW5ndGggaXMgMFxuXG4gICAgICB0b3AgPSBNYXRoLnJvdW5kKEBsaW5lVG9wSW5kZXgucGl4ZWxQb3NpdGlvbkJlZm9yZUJsb2Nrc0ZvclJvdyh0aWxlU3RhcnRSb3cpKVxuICAgICAgYm90dG9tID0gTWF0aC5yb3VuZChAbGluZVRvcEluZGV4LnBpeGVsUG9zaXRpb25CZWZvcmVCbG9ja3NGb3JSb3codGlsZUVuZFJvdykpXG4gICAgICBoZWlnaHQgPSBib3R0b20gLSB0b3BcblxuICAgICAgdGlsZSA9IEBzdGF0ZS5jb250ZW50LnRpbGVzW3RpbGVTdGFydFJvd10gPz0ge31cbiAgICAgIHRpbGUudG9wID0gdG9wIC0gQHNjcm9sbFRvcFxuICAgICAgdGlsZS5sZWZ0ID0gLUBzY3JvbGxMZWZ0XG4gICAgICB0aWxlLmhlaWdodCA9IGhlaWdodFxuICAgICAgdGlsZS5kaXNwbGF5ID0gXCJibG9ja1wiXG4gICAgICB0aWxlLnpJbmRleCA9IHpJbmRleFxuICAgICAgdGlsZS5oaWdobGlnaHRzID89IHt9XG5cbiAgICAgIGd1dHRlclRpbGUgPSBAbGluZU51bWJlckd1dHRlci50aWxlc1t0aWxlU3RhcnRSb3ddID89IHt9XG4gICAgICBndXR0ZXJUaWxlLnRvcCA9IHRvcCAtIEBzY3JvbGxUb3BcbiAgICAgIGd1dHRlclRpbGUuaGVpZ2h0ID0gaGVpZ2h0XG4gICAgICBndXR0ZXJUaWxlLmRpc3BsYXkgPSBcImJsb2NrXCJcbiAgICAgIGd1dHRlclRpbGUuekluZGV4ID0gekluZGV4XG5cbiAgICAgIEB1cGRhdGVMaW5lc1N0YXRlKHRpbGUsIHJvd3NXaXRoaW5UaWxlKVxuICAgICAgQHVwZGF0ZUxpbmVOdW1iZXJzU3RhdGUoZ3V0dGVyVGlsZSwgcm93c1dpdGhpblRpbGUpXG5cbiAgICAgIHZpc2libGVUaWxlc1t0aWxlU3RhcnRSb3ddID0gdHJ1ZVxuICAgICAgekluZGV4KytcblxuICAgIG1vdXNlV2hlZWxUaWxlSWQgPSBAdGlsZUZvclJvdyhAbW91c2VXaGVlbFNjcmVlblJvdykgaWYgQG1vdXNlV2hlZWxTY3JlZW5Sb3c/XG5cbiAgICBmb3IgaWQsIHRpbGUgb2YgQHN0YXRlLmNvbnRlbnQudGlsZXNcbiAgICAgIGNvbnRpbnVlIGlmIHZpc2libGVUaWxlcy5oYXNPd25Qcm9wZXJ0eShpZClcblxuICAgICAgaWYgTnVtYmVyKGlkKSBpcyBtb3VzZVdoZWVsVGlsZUlkXG4gICAgICAgIEBzdGF0ZS5jb250ZW50LnRpbGVzW2lkXS5kaXNwbGF5ID0gXCJub25lXCJcbiAgICAgICAgQGxpbmVOdW1iZXJHdXR0ZXIudGlsZXNbaWRdLmRpc3BsYXkgPSBcIm5vbmVcIlxuICAgICAgZWxzZVxuICAgICAgICBkZWxldGUgQHN0YXRlLmNvbnRlbnQudGlsZXNbaWRdXG4gICAgICAgIGRlbGV0ZSBAbGluZU51bWJlckd1dHRlci50aWxlc1tpZF1cblxuICB1cGRhdGVMaW5lc1N0YXRlOiAodGlsZVN0YXRlLCBzY3JlZW5Sb3dzKSAtPlxuICAgIHRpbGVTdGF0ZS5saW5lcyA/PSB7fVxuICAgIHZpc2libGVMaW5lSWRzID0ge31cbiAgICBmb3Igc2NyZWVuUm93IGluIHNjcmVlblJvd3NcbiAgICAgIGxpbmUgPSBAbGluZXNCeVNjcmVlblJvdy5nZXQoc2NyZWVuUm93KVxuICAgICAgY29udGludWUgdW5sZXNzIGxpbmU/XG5cbiAgICAgIHZpc2libGVMaW5lSWRzW2xpbmUuaWRdID0gdHJ1ZVxuICAgICAgcHJlY2VkaW5nQmxvY2tEZWNvcmF0aW9ucyA9IEBwcmVjZWRpbmdCbG9ja0RlY29yYXRpb25zQnlTY3JlZW5Sb3dBbmRJZFtzY3JlZW5Sb3ddID8ge31cbiAgICAgIGZvbGxvd2luZ0Jsb2NrRGVjb3JhdGlvbnMgPSBAZm9sbG93aW5nQmxvY2tEZWNvcmF0aW9uc0J5U2NyZWVuUm93QW5kSWRbc2NyZWVuUm93XSA/IHt9XG4gICAgICBpZiB0aWxlU3RhdGUubGluZXMuaGFzT3duUHJvcGVydHkobGluZS5pZClcbiAgICAgICAgbGluZVN0YXRlID0gdGlsZVN0YXRlLmxpbmVzW2xpbmUuaWRdXG4gICAgICAgIGxpbmVTdGF0ZS5zY3JlZW5Sb3cgPSBzY3JlZW5Sb3dcbiAgICAgICAgbGluZVN0YXRlLmRlY29yYXRpb25DbGFzc2VzID0gQGxpbmVEZWNvcmF0aW9uQ2xhc3Nlc0ZvclJvdyhzY3JlZW5Sb3cpXG4gICAgICAgIGxpbmVTdGF0ZS5wcmVjZWRpbmdCbG9ja0RlY29yYXRpb25zID0gcHJlY2VkaW5nQmxvY2tEZWNvcmF0aW9uc1xuICAgICAgICBsaW5lU3RhdGUuZm9sbG93aW5nQmxvY2tEZWNvcmF0aW9ucyA9IGZvbGxvd2luZ0Jsb2NrRGVjb3JhdGlvbnNcbiAgICAgIGVsc2VcbiAgICAgICAgdGlsZVN0YXRlLmxpbmVzW2xpbmUuaWRdID1cbiAgICAgICAgICBzY3JlZW5Sb3c6IHNjcmVlblJvd1xuICAgICAgICAgIGxpbmVUZXh0OiBsaW5lLmxpbmVUZXh0XG4gICAgICAgICAgdGFnQ29kZXM6IGxpbmUudGFnQ29kZXNcbiAgICAgICAgICBkZWNvcmF0aW9uQ2xhc3NlczogQGxpbmVEZWNvcmF0aW9uQ2xhc3Nlc0ZvclJvdyhzY3JlZW5Sb3cpXG4gICAgICAgICAgcHJlY2VkaW5nQmxvY2tEZWNvcmF0aW9uczogcHJlY2VkaW5nQmxvY2tEZWNvcmF0aW9uc1xuICAgICAgICAgIGZvbGxvd2luZ0Jsb2NrRGVjb3JhdGlvbnM6IGZvbGxvd2luZ0Jsb2NrRGVjb3JhdGlvbnNcblxuICAgIGZvciBpZCwgbGluZSBvZiB0aWxlU3RhdGUubGluZXNcbiAgICAgIGRlbGV0ZSB0aWxlU3RhdGUubGluZXNbaWRdIHVubGVzcyB2aXNpYmxlTGluZUlkcy5oYXNPd25Qcm9wZXJ0eShpZClcbiAgICByZXR1cm5cblxuICB1cGRhdGVDdXJzb3JzU3RhdGU6IC0+XG4gICAgcmV0dXJuIHVubGVzcyBAc3RhcnRSb3c/IGFuZCBAZW5kUm93PyBhbmQgQGhhc1BpeGVsUmVjdFJlcXVpcmVtZW50cygpIGFuZCBAYmFzZUNoYXJhY3RlcldpZHRoP1xuXG4gICAgQHN0YXRlLmNvbnRlbnQuY3Vyc29ycyA9IHt9XG4gICAgZm9yIGN1cnNvciBpbiBAbW9kZWwuY3Vyc29yc0ZvclNjcmVlblJvd1JhbmdlKEBzdGFydFJvdywgQGVuZFJvdyAtIDEpIHdoZW4gY3Vyc29yLmlzVmlzaWJsZSgpXG4gICAgICBwaXhlbFJlY3QgPSBAcGl4ZWxSZWN0Rm9yU2NyZWVuUmFuZ2UoY3Vyc29yLmdldFNjcmVlblJhbmdlKCkpXG4gICAgICBwaXhlbFJlY3Qud2lkdGggPSBNYXRoLnJvdW5kKEBiYXNlQ2hhcmFjdGVyV2lkdGgpIGlmIHBpeGVsUmVjdC53aWR0aCBpcyAwXG4gICAgICBAc3RhdGUuY29udGVudC5jdXJzb3JzW2N1cnNvci5pZF0gPSBwaXhlbFJlY3RcbiAgICByZXR1cm5cblxuICB1cGRhdGVPdmVybGF5c1N0YXRlOiAtPlxuICAgIHJldHVybiB1bmxlc3MgQGhhc092ZXJsYXlQb3NpdGlvblJlcXVpcmVtZW50cygpXG5cbiAgICB2aXNpYmxlRGVjb3JhdGlvbklkcyA9IHt9XG5cbiAgICBmb3IgZGVjb3JhdGlvbiBpbiBAbW9kZWwuZ2V0T3ZlcmxheURlY29yYXRpb25zKClcbiAgICAgIGNvbnRpbnVlIHVubGVzcyBkZWNvcmF0aW9uLmdldE1hcmtlcigpLmlzVmFsaWQoKVxuXG4gICAgICB7aXRlbSwgcG9zaXRpb24sIGNsYXNzOiBrbGFzcywgYXZvaWRPdmVyZmxvd30gPSBkZWNvcmF0aW9uLmdldFByb3BlcnRpZXMoKVxuICAgICAgaWYgcG9zaXRpb24gaXMgJ3RhaWwnXG4gICAgICAgIHNjcmVlblBvc2l0aW9uID0gZGVjb3JhdGlvbi5nZXRNYXJrZXIoKS5nZXRUYWlsU2NyZWVuUG9zaXRpb24oKVxuICAgICAgZWxzZVxuICAgICAgICBzY3JlZW5Qb3NpdGlvbiA9IGRlY29yYXRpb24uZ2V0TWFya2VyKCkuZ2V0SGVhZFNjcmVlblBvc2l0aW9uKClcblxuICAgICAgcGl4ZWxQb3NpdGlvbiA9IEBwaXhlbFBvc2l0aW9uRm9yU2NyZWVuUG9zaXRpb24oc2NyZWVuUG9zaXRpb24pXG5cbiAgICAgICMgRml4ZWQgcG9zaXRpb25pbmcuXG4gICAgICB0b3AgPSBAYm91bmRpbmdDbGllbnRSZWN0LnRvcCArIHBpeGVsUG9zaXRpb24udG9wICsgQGxpbmVIZWlnaHRcbiAgICAgIGxlZnQgPSBAYm91bmRpbmdDbGllbnRSZWN0LmxlZnQgKyBwaXhlbFBvc2l0aW9uLmxlZnQgKyBAZ3V0dGVyV2lkdGhcblxuICAgICAgaWYgb3ZlcmxheURpbWVuc2lvbnMgPSBAb3ZlcmxheURpbWVuc2lvbnNbZGVjb3JhdGlvbi5pZF1cbiAgICAgICAge2l0ZW1XaWR0aCwgaXRlbUhlaWdodCwgY29udGVudE1hcmdpbn0gPSBvdmVybGF5RGltZW5zaW9uc1xuXG4gICAgICAgIGlmIGF2b2lkT3ZlcmZsb3cgaXNudCBmYWxzZVxuICAgICAgICAgIHJpZ2h0RGlmZiA9IGxlZnQgKyBpdGVtV2lkdGggKyBjb250ZW50TWFyZ2luIC0gQHdpbmRvd1dpZHRoXG4gICAgICAgICAgbGVmdCAtPSByaWdodERpZmYgaWYgcmlnaHREaWZmID4gMFxuXG4gICAgICAgICAgbGVmdERpZmYgPSBsZWZ0ICsgY29udGVudE1hcmdpblxuICAgICAgICAgIGxlZnQgLT0gbGVmdERpZmYgaWYgbGVmdERpZmYgPCAwXG5cbiAgICAgICAgICBpZiB0b3AgKyBpdGVtSGVpZ2h0ID4gQHdpbmRvd0hlaWdodCBhbmRcbiAgICAgICAgICAgICB0b3AgLSAoaXRlbUhlaWdodCArIEBsaW5lSGVpZ2h0KSA+PSAwXG4gICAgICAgICAgICB0b3AgLT0gaXRlbUhlaWdodCArIEBsaW5lSGVpZ2h0XG5cbiAgICAgIHBpeGVsUG9zaXRpb24udG9wID0gdG9wXG4gICAgICBwaXhlbFBvc2l0aW9uLmxlZnQgPSBsZWZ0XG5cbiAgICAgIG92ZXJsYXlTdGF0ZSA9IEBzdGF0ZS5jb250ZW50Lm92ZXJsYXlzW2RlY29yYXRpb24uaWRdID89IHtpdGVtfVxuICAgICAgb3ZlcmxheVN0YXRlLnBpeGVsUG9zaXRpb24gPSBwaXhlbFBvc2l0aW9uXG4gICAgICBvdmVybGF5U3RhdGUuY2xhc3MgPSBrbGFzcyBpZiBrbGFzcz9cbiAgICAgIHZpc2libGVEZWNvcmF0aW9uSWRzW2RlY29yYXRpb24uaWRdID0gdHJ1ZVxuXG4gICAgZm9yIGlkIG9mIEBzdGF0ZS5jb250ZW50Lm92ZXJsYXlzXG4gICAgICBkZWxldGUgQHN0YXRlLmNvbnRlbnQub3ZlcmxheXNbaWRdIHVubGVzcyB2aXNpYmxlRGVjb3JhdGlvbklkc1tpZF1cblxuICAgIGZvciBpZCBvZiBAb3ZlcmxheURpbWVuc2lvbnNcbiAgICAgIGRlbGV0ZSBAb3ZlcmxheURpbWVuc2lvbnNbaWRdIHVubGVzcyB2aXNpYmxlRGVjb3JhdGlvbklkc1tpZF1cblxuICAgIHJldHVyblxuXG4gIHVwZGF0ZUxpbmVOdW1iZXJHdXR0ZXJTdGF0ZTogLT5cbiAgICBAbGluZU51bWJlckd1dHRlci5tYXhMaW5lTnVtYmVyRGlnaXRzID0gTWF0aC5tYXgoXG4gICAgICAyLFxuICAgICAgQG1vZGVsLmdldExpbmVDb3VudCgpLnRvU3RyaW5nKCkubGVuZ3RoXG4gICAgKVxuXG4gIHVwZGF0ZUNvbW1vbkd1dHRlclN0YXRlOiAtPlxuICAgIEBzaGFyZWRHdXR0ZXJTdHlsZXMuYmFja2dyb3VuZENvbG9yID0gaWYgQGd1dHRlckJhY2tncm91bmRDb2xvciBpc250IFwicmdiYSgwLCAwLCAwLCAwKVwiXG4gICAgICBAZ3V0dGVyQmFja2dyb3VuZENvbG9yXG4gICAgZWxzZVxuICAgICAgQGJhY2tncm91bmRDb2xvclxuXG4gIGRpZEFkZEd1dHRlcjogKGd1dHRlcikgLT5cbiAgICBndXR0ZXJEaXNwb3NhYmxlcyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlXG4gICAgZ3V0dGVyRGlzcG9zYWJsZXMuYWRkIGd1dHRlci5vbkRpZENoYW5nZVZpc2libGUgPT4gQGVtaXREaWRVcGRhdGVTdGF0ZSgpXG4gICAgZ3V0dGVyRGlzcG9zYWJsZXMuYWRkIGd1dHRlci5vbkRpZERlc3Ryb3kgPT5cbiAgICAgIEBkaXNwb3NhYmxlcy5yZW1vdmUoZ3V0dGVyRGlzcG9zYWJsZXMpXG4gICAgICBndXR0ZXJEaXNwb3NhYmxlcy5kaXNwb3NlKClcbiAgICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuICAgICAgIyBJdCBpcyBub3QgbmVjZXNzYXJ5IHRvIEB1cGRhdGVDdXN0b21HdXR0ZXJEZWNvcmF0aW9uU3RhdGUgaGVyZS5cbiAgICAgICMgVGhlIGRlc3Ryb3llZCBndXR0ZXIgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIGxpc3Qgb2YgZ3V0dGVycyBpbiBAc3RhdGUsXG4gICAgICAjIGFuZCB0aHVzIHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET00uXG4gICAgQGRpc3Bvc2FibGVzLmFkZChndXR0ZXJEaXNwb3NhYmxlcylcbiAgICBAZW1pdERpZFVwZGF0ZVN0YXRlKClcblxuICB1cGRhdGVHdXR0ZXJPcmRlclN0YXRlOiAtPlxuICAgIEBzdGF0ZS5ndXR0ZXJzID0gW11cbiAgICBpZiBAbW9kZWwuaXNNaW5pKClcbiAgICAgIHJldHVyblxuICAgIGZvciBndXR0ZXIgaW4gQG1vZGVsLmdldEd1dHRlcnMoKVxuICAgICAgaXNWaXNpYmxlID0gQGd1dHRlcklzVmlzaWJsZShndXR0ZXIpXG4gICAgICBpZiBndXR0ZXIubmFtZSBpcyAnbGluZS1udW1iZXInXG4gICAgICAgIGNvbnRlbnQgPSBAbGluZU51bWJlckd1dHRlclxuICAgICAgZWxzZVxuICAgICAgICBAY3VzdG9tR3V0dGVyRGVjb3JhdGlvbnNbZ3V0dGVyLm5hbWVdID89IHt9XG4gICAgICAgIGNvbnRlbnQgPSBAY3VzdG9tR3V0dGVyRGVjb3JhdGlvbnNbZ3V0dGVyLm5hbWVdXG4gICAgICBAc3RhdGUuZ3V0dGVycy5wdXNoKHtcbiAgICAgICAgZ3V0dGVyLFxuICAgICAgICB2aXNpYmxlOiBpc1Zpc2libGUsXG4gICAgICAgIHN0eWxlczogQHNoYXJlZEd1dHRlclN0eWxlcyxcbiAgICAgICAgY29udGVudCxcbiAgICAgIH0pXG5cbiAgIyBVcGRhdGVzIHRoZSBkZWNvcmF0aW9uIHN0YXRlIGZvciB0aGUgZ3V0dGVyIHdpdGggdGhlIGdpdmVuIGd1dHRlck5hbWUuXG4gICMgQGN1c3RvbUd1dHRlckRlY29yYXRpb25zIGlzIGFuIHtPYmplY3R9LCB3aXRoIHRoZSBmb3JtOlxuICAjICAgKiBndXR0ZXJOYW1lIDoge1xuICAjICAgICBkZWNvcmF0aW9uLmlkIDoge1xuICAjICAgICAgIHRvcDogIyBvZiBwaXhlbHMgZnJvbSB0b3BcbiAgIyAgICAgICBoZWlnaHQ6ICMgb2YgcGl4ZWxzIGhlaWdodCBvZiB0aGlzIGRlY29yYXRpb25cbiAgIyAgICAgICBpdGVtIChvcHRpb25hbCk6IEhUTUxFbGVtZW50XG4gICMgICAgICAgY2xhc3MgKG9wdGlvbmFsKToge1N0cmluZ30gY2xhc3NcbiAgIyAgICAgfVxuICAjICAgfVxuICB1cGRhdGVDdXN0b21HdXR0ZXJEZWNvcmF0aW9uU3RhdGU6IC0+XG4gICAgcmV0dXJuIHVubGVzcyBAc3RhcnRSb3c/IGFuZCBAZW5kUm93PyBhbmQgQGxpbmVIZWlnaHQ/XG5cbiAgICBpZiBAbW9kZWwuaXNNaW5pKClcbiAgICAgICMgTWluaSBlZGl0b3JzIGhhdmUgbm8gZ3V0dGVyIGRlY29yYXRpb25zLlxuICAgICAgIyBXZSBjbGVhciBpbnN0ZWFkIG9mIHJlYXNzaWduaW5nIHRvIHByZXNlcnZlIHRoZSByZWZlcmVuY2UuXG4gICAgICBAY2xlYXJBbGxDdXN0b21HdXR0ZXJEZWNvcmF0aW9ucygpXG5cbiAgICBmb3IgZ3V0dGVyIGluIEBtb2RlbC5nZXRHdXR0ZXJzKClcbiAgICAgIGd1dHRlck5hbWUgPSBndXR0ZXIubmFtZVxuICAgICAgZ3V0dGVyRGVjb3JhdGlvbnMgPSBAY3VzdG9tR3V0dGVyRGVjb3JhdGlvbnNbZ3V0dGVyTmFtZV1cbiAgICAgIGlmIGd1dHRlckRlY29yYXRpb25zXG4gICAgICAgICMgQ2xlYXIgdGhlIGd1dHRlciBkZWNvcmF0aW9uczsgdGhleSBhcmUgcmVidWlsdC5cbiAgICAgICAgIyBXZSBjbGVhciBpbnN0ZWFkIG9mIHJlYXNzaWduaW5nIHRvIHByZXNlcnZlIHRoZSByZWZlcmVuY2UuXG4gICAgICAgIEBjbGVhckRlY29yYXRpb25zRm9yQ3VzdG9tR3V0dGVyTmFtZShndXR0ZXJOYW1lKVxuICAgICAgZWxzZVxuICAgICAgICBAY3VzdG9tR3V0dGVyRGVjb3JhdGlvbnNbZ3V0dGVyTmFtZV0gPSB7fVxuXG4gICAgICBjb250aW51ZSB1bmxlc3MgQGd1dHRlcklzVmlzaWJsZShndXR0ZXIpXG4gICAgICBmb3IgZGVjb3JhdGlvbklkLCB7cHJvcGVydGllcywgc2NyZWVuUmFuZ2V9IG9mIEBjdXN0b21HdXR0ZXJEZWNvcmF0aW9uc0J5R3V0dGVyTmFtZVtndXR0ZXJOYW1lXVxuICAgICAgICB0b3AgPSBAbGluZVRvcEluZGV4LnBpeGVsUG9zaXRpb25BZnRlckJsb2Nrc0ZvclJvdyhzY3JlZW5SYW5nZS5zdGFydC5yb3cpXG4gICAgICAgIGJvdHRvbSA9IEBsaW5lVG9wSW5kZXgucGl4ZWxQb3NpdGlvbkJlZm9yZUJsb2Nrc0ZvclJvdyhzY3JlZW5SYW5nZS5lbmQucm93ICsgMSlcbiAgICAgICAgQGN1c3RvbUd1dHRlckRlY29yYXRpb25zW2d1dHRlck5hbWVdW2RlY29yYXRpb25JZF0gPVxuICAgICAgICAgIHRvcDogdG9wXG4gICAgICAgICAgaGVpZ2h0OiBib3R0b20gLSB0b3BcbiAgICAgICAgICBpdGVtOiBwcm9wZXJ0aWVzLml0ZW1cbiAgICAgICAgICBjbGFzczogcHJvcGVydGllcy5jbGFzc1xuXG4gIGNsZWFyQWxsQ3VzdG9tR3V0dGVyRGVjb3JhdGlvbnM6IC0+XG4gICAgYWxsR3V0dGVyTmFtZXMgPSBPYmplY3Qua2V5cyhAY3VzdG9tR3V0dGVyRGVjb3JhdGlvbnMpXG4gICAgZm9yIGd1dHRlck5hbWUgaW4gYWxsR3V0dGVyTmFtZXNcbiAgICAgIEBjbGVhckRlY29yYXRpb25zRm9yQ3VzdG9tR3V0dGVyTmFtZShndXR0ZXJOYW1lKVxuXG4gIGNsZWFyRGVjb3JhdGlvbnNGb3JDdXN0b21HdXR0ZXJOYW1lOiAoZ3V0dGVyTmFtZSkgLT5cbiAgICBndXR0ZXJEZWNvcmF0aW9ucyA9IEBjdXN0b21HdXR0ZXJEZWNvcmF0aW9uc1tndXR0ZXJOYW1lXVxuICAgIGlmIGd1dHRlckRlY29yYXRpb25zXG4gICAgICBhbGxEZWNvcmF0aW9uSWRzID0gT2JqZWN0LmtleXMoZ3V0dGVyRGVjb3JhdGlvbnMpXG4gICAgICBmb3IgZGVjb3JhdGlvbklkIGluIGFsbERlY29yYXRpb25JZHNcbiAgICAgICAgZGVsZXRlIGd1dHRlckRlY29yYXRpb25zW2RlY29yYXRpb25JZF1cblxuICBndXR0ZXJJc1Zpc2libGU6IChndXR0ZXJNb2RlbCkgLT5cbiAgICBpc1Zpc2libGUgPSBndXR0ZXJNb2RlbC5pc1Zpc2libGUoKVxuICAgIGlmIGd1dHRlck1vZGVsLm5hbWUgaXMgJ2xpbmUtbnVtYmVyJ1xuICAgICAgaXNWaXNpYmxlID0gaXNWaXNpYmxlIGFuZCBAbW9kZWwuZG9lc1Nob3dMaW5lTnVtYmVycygpXG4gICAgaXNWaXNpYmxlXG5cbiAgdXBkYXRlTGluZU51bWJlcnNTdGF0ZTogKHRpbGVTdGF0ZSwgc2NyZWVuUm93cykgLT5cbiAgICB0aWxlU3RhdGUubGluZU51bWJlcnMgPz0ge31cbiAgICB2aXNpYmxlTGluZU51bWJlcklkcyA9IHt9XG5cbiAgICBmb3Igc2NyZWVuUm93IGluIHNjcmVlblJvd3Mgd2hlbiBAaXNSb3dSZW5kZXJlZChzY3JlZW5Sb3cpXG4gICAgICBsaW5lID0gQGxpbmVzQnlTY3JlZW5Sb3cuZ2V0KHNjcmVlblJvdylcbiAgICAgIGNvbnRpbnVlIHVubGVzcyBsaW5lP1xuICAgICAgbGluZUlkID0gbGluZS5pZFxuICAgICAge3JvdzogYnVmZmVyUm93LCBjb2x1bW46IGJ1ZmZlckNvbHVtbn0gPSBAZGlzcGxheUxheWVyLnRyYW5zbGF0ZVNjcmVlblBvc2l0aW9uKFBvaW50KHNjcmVlblJvdywgMCkpXG4gICAgICBzb2Z0V3JhcHBlZCA9IGJ1ZmZlckNvbHVtbiBpc250IDBcbiAgICAgIGZvbGRhYmxlID0gbm90IHNvZnRXcmFwcGVkIGFuZCBAbW9kZWwuaXNGb2xkYWJsZUF0QnVmZmVyUm93KGJ1ZmZlclJvdylcbiAgICAgIGRlY29yYXRpb25DbGFzc2VzID0gQGxpbmVOdW1iZXJEZWNvcmF0aW9uQ2xhc3Nlc0ZvclJvdyhzY3JlZW5Sb3cpXG4gICAgICBibG9ja0RlY29yYXRpb25zQmVmb3JlQ3VycmVudFNjcmVlblJvd0hlaWdodCA9IEBsaW5lVG9wSW5kZXgucGl4ZWxQb3NpdGlvbkFmdGVyQmxvY2tzRm9yUm93KHNjcmVlblJvdykgLSBAbGluZVRvcEluZGV4LnBpeGVsUG9zaXRpb25CZWZvcmVCbG9ja3NGb3JSb3coc2NyZWVuUm93KVxuICAgICAgYmxvY2tEZWNvcmF0aW9uc0hlaWdodCA9IGJsb2NrRGVjb3JhdGlvbnNCZWZvcmVDdXJyZW50U2NyZWVuUm93SGVpZ2h0XG4gICAgICBpZiBzY3JlZW5Sb3cgJSBAdGlsZVNpemUgaXNudCAwXG4gICAgICAgIGJsb2NrRGVjb3JhdGlvbnNBZnRlclByZXZpb3VzU2NyZWVuUm93SGVpZ2h0ID0gQGxpbmVUb3BJbmRleC5waXhlbFBvc2l0aW9uQmVmb3JlQmxvY2tzRm9yUm93KHNjcmVlblJvdykgLSBAbGluZUhlaWdodCAtIEBsaW5lVG9wSW5kZXgucGl4ZWxQb3NpdGlvbkFmdGVyQmxvY2tzRm9yUm93KHNjcmVlblJvdyAtIDEpXG4gICAgICAgIGJsb2NrRGVjb3JhdGlvbnNIZWlnaHQgKz0gYmxvY2tEZWNvcmF0aW9uc0FmdGVyUHJldmlvdXNTY3JlZW5Sb3dIZWlnaHRcblxuICAgICAgdGlsZVN0YXRlLmxpbmVOdW1iZXJzW2xpbmVJZF0gPSB7c2NyZWVuUm93LCBidWZmZXJSb3csIHNvZnRXcmFwcGVkLCBkZWNvcmF0aW9uQ2xhc3NlcywgZm9sZGFibGUsIGJsb2NrRGVjb3JhdGlvbnNIZWlnaHR9XG4gICAgICB2aXNpYmxlTGluZU51bWJlcklkc1tsaW5lSWRdID0gdHJ1ZVxuXG4gICAgZm9yIGlkIG9mIHRpbGVTdGF0ZS5saW5lTnVtYmVyc1xuICAgICAgZGVsZXRlIHRpbGVTdGF0ZS5saW5lTnVtYmVyc1tpZF0gdW5sZXNzIHZpc2libGVMaW5lTnVtYmVySWRzW2lkXVxuXG4gICAgcmV0dXJuXG5cbiAgdXBkYXRlU3RhcnRSb3c6IC0+XG4gICAgcmV0dXJuIHVubGVzcyBAc2Nyb2xsVG9wPyBhbmQgQGxpbmVIZWlnaHQ/XG5cbiAgICBAc3RhcnRSb3cgPSBNYXRoLm1heCgwLCBAbGluZVRvcEluZGV4LnJvd0ZvclBpeGVsUG9zaXRpb24oQHNjcm9sbFRvcCkpXG4gICAgYXRvbS5hc3NlcnQoXG4gICAgICBOdW1iZXIuaXNGaW5pdGUoQHN0YXJ0Um93KSxcbiAgICAgICdJbnZhbGlkIHN0YXJ0IHJvdycsXG4gICAgICAoZXJyb3IpID0+XG4gICAgICAgIGVycm9yLm1ldGFkYXRhID0ge1xuICAgICAgICAgIHN0YXJ0Um93OiBAc3RhcnRSb3c/LnRvU3RyaW5nKCksXG4gICAgICAgICAgc2Nyb2xsVG9wOiBAc2Nyb2xsVG9wPy50b1N0cmluZygpLFxuICAgICAgICAgIHNjcm9sbEhlaWdodDogQHNjcm9sbEhlaWdodD8udG9TdHJpbmcoKSxcbiAgICAgICAgICBjbGllbnRIZWlnaHQ6IEBjbGllbnRIZWlnaHQ/LnRvU3RyaW5nKCksXG4gICAgICAgICAgbGluZUhlaWdodDogQGxpbmVIZWlnaHQ/LnRvU3RyaW5nKClcbiAgICAgICAgfVxuICAgIClcblxuICB1cGRhdGVFbmRSb3c6IC0+XG4gICAgcmV0dXJuIHVubGVzcyBAc2Nyb2xsVG9wPyBhbmQgQGxpbmVIZWlnaHQ/IGFuZCBAaGVpZ2h0P1xuXG4gICAgQGVuZFJvdyA9IE1hdGgubWluKFxuICAgICAgQG1vZGVsLmdldEFwcHJveGltYXRlU2NyZWVuTGluZUNvdW50KCksXG4gICAgICBAbGluZVRvcEluZGV4LnJvd0ZvclBpeGVsUG9zaXRpb24oQHNjcm9sbFRvcCArIEBoZWlnaHQgKyBAbGluZUhlaWdodCAtIDEpICsgMVxuICAgIClcblxuICB1cGRhdGVSb3dzUGVyUGFnZTogLT5cbiAgICByb3dzUGVyUGFnZSA9IE1hdGguZmxvb3IoQGdldENsaWVudEhlaWdodCgpIC8gQGxpbmVIZWlnaHQpXG4gICAgaWYgcm93c1BlclBhZ2UgaXNudCBAcm93c1BlclBhZ2VcbiAgICAgIEByb3dzUGVyUGFnZSA9IHJvd3NQZXJQYWdlXG4gICAgICBAbW9kZWwuc2V0Um93c1BlclBhZ2UoQHJvd3NQZXJQYWdlKVxuXG4gIHVwZGF0ZVNjcm9sbFdpZHRoOiAtPlxuICAgIHJldHVybiB1bmxlc3MgQGNvbnRlbnRXaWR0aD8gYW5kIEBjbGllbnRXaWR0aD9cblxuICAgIHNjcm9sbFdpZHRoID0gTWF0aC5tYXgoQGNvbnRlbnRXaWR0aCwgQGNsaWVudFdpZHRoKVxuICAgIHVubGVzcyBAc2Nyb2xsV2lkdGggaXMgc2Nyb2xsV2lkdGhcbiAgICAgIEBzY3JvbGxXaWR0aCA9IHNjcm9sbFdpZHRoXG4gICAgICBAdXBkYXRlU2Nyb2xsTGVmdChAc2Nyb2xsTGVmdClcblxuICB1cGRhdGVTY3JvbGxIZWlnaHQ6IC0+XG4gICAgcmV0dXJuIHVubGVzcyBAY29udGVudEhlaWdodD8gYW5kIEBjbGllbnRIZWlnaHQ/XG5cbiAgICBjb250ZW50SGVpZ2h0ID0gQGNvbnRlbnRIZWlnaHRcbiAgICBpZiBAbW9kZWwuZ2V0U2Nyb2xsUGFzdEVuZCgpXG4gICAgICBleHRyYVNjcm9sbEhlaWdodCA9IEBjbGllbnRIZWlnaHQgLSAoQGxpbmVIZWlnaHQgKiAzKVxuICAgICAgY29udGVudEhlaWdodCArPSBleHRyYVNjcm9sbEhlaWdodCBpZiBleHRyYVNjcm9sbEhlaWdodCA+IDBcbiAgICBzY3JvbGxIZWlnaHQgPSBNYXRoLm1heChjb250ZW50SGVpZ2h0LCBAaGVpZ2h0KVxuXG4gICAgdW5sZXNzIEBzY3JvbGxIZWlnaHQgaXMgc2Nyb2xsSGVpZ2h0XG4gICAgICBAc2Nyb2xsSGVpZ2h0ID0gc2Nyb2xsSGVpZ2h0XG4gICAgICBAdXBkYXRlU2Nyb2xsVG9wKEBzY3JvbGxUb3ApXG5cbiAgdXBkYXRlVmVydGljYWxEaW1lbnNpb25zOiAtPlxuICAgIGlmIEBsaW5lSGVpZ2h0P1xuICAgICAgb2xkQ29udGVudEhlaWdodCA9IEBjb250ZW50SGVpZ2h0XG4gICAgICBAY29udGVudEhlaWdodCA9IE1hdGgucm91bmQoQGxpbmVUb3BJbmRleC5waXhlbFBvc2l0aW9uQWZ0ZXJCbG9ja3NGb3JSb3coQG1vZGVsLmdldEFwcHJveGltYXRlU2NyZWVuTGluZUNvdW50KCkpKVxuXG4gICAgaWYgQGNvbnRlbnRIZWlnaHQgaXNudCBvbGRDb250ZW50SGVpZ2h0XG4gICAgICBAdXBkYXRlSGVpZ2h0KClcbiAgICAgIEB1cGRhdGVTY3JvbGxiYXJEaW1lbnNpb25zKClcbiAgICAgIEB1cGRhdGVTY3JvbGxIZWlnaHQoKVxuXG4gIHVwZGF0ZUhvcml6b250YWxEaW1lbnNpb25zOiAtPlxuICAgIGlmIEBiYXNlQ2hhcmFjdGVyV2lkdGg/XG4gICAgICBvbGRDb250ZW50V2lkdGggPSBAY29udGVudFdpZHRoXG4gICAgICByaWdodG1vc3RQb3NpdGlvbiA9IEBtb2RlbC5nZXRBcHByb3hpbWF0ZVJpZ2h0bW9zdFNjcmVlblBvc2l0aW9uKClcbiAgICAgIEBjb250ZW50V2lkdGggPSBAcGl4ZWxQb3NpdGlvbkZvclNjcmVlblBvc2l0aW9uKHJpZ2h0bW9zdFBvc2l0aW9uKS5sZWZ0XG4gICAgICBAY29udGVudFdpZHRoICs9IEBzY3JvbGxMZWZ0XG4gICAgICBAY29udGVudFdpZHRoICs9IDEgdW5sZXNzIEBtb2RlbC5pc1NvZnRXcmFwcGVkKCkgIyBhY2NvdW50IGZvciBjdXJzb3Igd2lkdGhcblxuICAgIGlmIEBjb250ZW50V2lkdGggaXNudCBvbGRDb250ZW50V2lkdGhcbiAgICAgIEB1cGRhdGVTY3JvbGxiYXJEaW1lbnNpb25zKClcbiAgICAgIEB1cGRhdGVDbGllbnRXaWR0aCgpXG4gICAgICBAdXBkYXRlU2Nyb2xsV2lkdGgoKVxuXG4gIHVwZGF0ZUNsaWVudEhlaWdodDogLT5cbiAgICByZXR1cm4gdW5sZXNzIEBoZWlnaHQ/IGFuZCBAaG9yaXpvbnRhbFNjcm9sbGJhckhlaWdodD9cblxuICAgIGNsaWVudEhlaWdodCA9IEBoZWlnaHQgLSBAaG9yaXpvbnRhbFNjcm9sbGJhckhlaWdodFxuICAgIEBtb2RlbC5zZXRIZWlnaHQoY2xpZW50SGVpZ2h0LCB0cnVlKVxuXG4gICAgdW5sZXNzIEBjbGllbnRIZWlnaHQgaXMgY2xpZW50SGVpZ2h0XG4gICAgICBAY2xpZW50SGVpZ2h0ID0gY2xpZW50SGVpZ2h0XG4gICAgICBAdXBkYXRlU2Nyb2xsSGVpZ2h0KClcbiAgICAgIEB1cGRhdGVTY3JvbGxUb3AoQHNjcm9sbFRvcClcblxuICB1cGRhdGVDbGllbnRXaWR0aDogLT5cbiAgICByZXR1cm4gdW5sZXNzIEBjb250ZW50RnJhbWVXaWR0aD8gYW5kIEB2ZXJ0aWNhbFNjcm9sbGJhcldpZHRoP1xuXG4gICAgaWYgQG1vZGVsLmdldEF1dG9XaWR0aCgpXG4gICAgICBjbGllbnRXaWR0aCA9IEBjb250ZW50V2lkdGhcbiAgICBlbHNlXG4gICAgICBjbGllbnRXaWR0aCA9IEBjb250ZW50RnJhbWVXaWR0aCAtIEB2ZXJ0aWNhbFNjcm9sbGJhcldpZHRoXG5cbiAgICBAbW9kZWwuc2V0V2lkdGgoY2xpZW50V2lkdGgsIHRydWUpIHVubGVzcyBAZWRpdG9yV2lkdGhJbkNoYXJzXG5cbiAgICB1bmxlc3MgQGNsaWVudFdpZHRoIGlzIGNsaWVudFdpZHRoXG4gICAgICBAY2xpZW50V2lkdGggPSBjbGllbnRXaWR0aFxuICAgICAgQHVwZGF0ZVNjcm9sbFdpZHRoKClcbiAgICAgIEB1cGRhdGVTY3JvbGxMZWZ0KEBzY3JvbGxMZWZ0KVxuXG4gIHVwZGF0ZVNjcm9sbFRvcDogKHNjcm9sbFRvcCkgLT5cbiAgICBzY3JvbGxUb3AgPSBAY29uc3RyYWluU2Nyb2xsVG9wKHNjcm9sbFRvcClcbiAgICBpZiBzY3JvbGxUb3AgaXNudCBAcmVhbFNjcm9sbFRvcCBhbmQgbm90IE51bWJlci5pc05hTihzY3JvbGxUb3ApXG4gICAgICBAcmVhbFNjcm9sbFRvcCA9IHNjcm9sbFRvcFxuICAgICAgQHNjcm9sbFRvcCA9IE1hdGgucm91bmQoc2Nyb2xsVG9wKVxuICAgICAgQG1vZGVsLnNldEZpcnN0VmlzaWJsZVNjcmVlblJvdyhNYXRoLnJvdW5kKEBzY3JvbGxUb3AgLyBAbGluZUhlaWdodCksIHRydWUpXG5cbiAgICAgIEB1cGRhdGVTdGFydFJvdygpXG4gICAgICBAdXBkYXRlRW5kUm93KClcbiAgICAgIEBkaWRTdGFydFNjcm9sbGluZygpXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLXNjcm9sbC10b3AnLCBAc2Nyb2xsVG9wXG5cbiAgY29uc3RyYWluU2Nyb2xsVG9wOiAoc2Nyb2xsVG9wKSAtPlxuICAgIHJldHVybiBzY3JvbGxUb3AgdW5sZXNzIHNjcm9sbFRvcD8gYW5kIEBzY3JvbGxIZWlnaHQ/IGFuZCBAY2xpZW50SGVpZ2h0P1xuICAgIE1hdGgubWF4KDAsIE1hdGgubWluKHNjcm9sbFRvcCwgQHNjcm9sbEhlaWdodCAtIEBjbGllbnRIZWlnaHQpKVxuXG4gIHVwZGF0ZVNjcm9sbExlZnQ6IChzY3JvbGxMZWZ0KSAtPlxuICAgIHNjcm9sbExlZnQgPSBAY29uc3RyYWluU2Nyb2xsTGVmdChzY3JvbGxMZWZ0KVxuICAgIGlmIHNjcm9sbExlZnQgaXNudCBAcmVhbFNjcm9sbExlZnQgYW5kIG5vdCBOdW1iZXIuaXNOYU4oc2Nyb2xsTGVmdClcbiAgICAgIEByZWFsU2Nyb2xsTGVmdCA9IHNjcm9sbExlZnRcbiAgICAgIEBzY3JvbGxMZWZ0ID0gTWF0aC5yb3VuZChzY3JvbGxMZWZ0KVxuICAgICAgQG1vZGVsLnNldEZpcnN0VmlzaWJsZVNjcmVlbkNvbHVtbihNYXRoLnJvdW5kKEBzY3JvbGxMZWZ0IC8gQGJhc2VDaGFyYWN0ZXJXaWR0aCkpXG5cbiAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2Utc2Nyb2xsLWxlZnQnLCBAc2Nyb2xsTGVmdFxuXG4gIGNvbnN0cmFpblNjcm9sbExlZnQ6IChzY3JvbGxMZWZ0KSAtPlxuICAgIHJldHVybiBzY3JvbGxMZWZ0IHVubGVzcyBzY3JvbGxMZWZ0PyBhbmQgQHNjcm9sbFdpZHRoPyBhbmQgQGNsaWVudFdpZHRoP1xuICAgIE1hdGgubWF4KDAsIE1hdGgubWluKHNjcm9sbExlZnQsIEBzY3JvbGxXaWR0aCAtIEBjbGllbnRXaWR0aCkpXG5cbiAgdXBkYXRlU2Nyb2xsYmFyRGltZW5zaW9uczogLT5cbiAgICByZXR1cm4gdW5sZXNzIEBjb250ZW50RnJhbWVXaWR0aD8gYW5kIEBoZWlnaHQ/XG4gICAgcmV0dXJuIHVubGVzcyBAbWVhc3VyZWRWZXJ0aWNhbFNjcm9sbGJhcldpZHRoPyBhbmQgQG1lYXN1cmVkSG9yaXpvbnRhbFNjcm9sbGJhckhlaWdodD9cbiAgICByZXR1cm4gdW5sZXNzIEBjb250ZW50V2lkdGg/IGFuZCBAY29udGVudEhlaWdodD9cblxuICAgIGlmIEBtb2RlbC5nZXRBdXRvV2lkdGgoKVxuICAgICAgY2xpZW50V2lkdGhXaXRoVmVydGljYWxTY3JvbGxiYXIgPSBAY29udGVudFdpZHRoICsgQG1lYXN1cmVkVmVydGljYWxTY3JvbGxiYXJXaWR0aFxuICAgIGVsc2VcbiAgICAgIGNsaWVudFdpZHRoV2l0aFZlcnRpY2FsU2Nyb2xsYmFyID0gQGNvbnRlbnRGcmFtZVdpZHRoXG4gICAgY2xpZW50V2lkdGhXaXRob3V0VmVydGljYWxTY3JvbGxiYXIgPSBjbGllbnRXaWR0aFdpdGhWZXJ0aWNhbFNjcm9sbGJhciAtIEBtZWFzdXJlZFZlcnRpY2FsU2Nyb2xsYmFyV2lkdGhcbiAgICBjbGllbnRIZWlnaHRXaXRoSG9yaXpvbnRhbFNjcm9sbGJhciA9IEBoZWlnaHRcbiAgICBjbGllbnRIZWlnaHRXaXRob3V0SG9yaXpvbnRhbFNjcm9sbGJhciA9IGNsaWVudEhlaWdodFdpdGhIb3Jpem9udGFsU2Nyb2xsYmFyIC0gQG1lYXN1cmVkSG9yaXpvbnRhbFNjcm9sbGJhckhlaWdodFxuXG4gICAgaG9yaXpvbnRhbFNjcm9sbGJhclZpc2libGUgPVxuICAgICAgbm90IEBtb2RlbC5pc01pbmkoKSBhbmRcbiAgICAgICAgKEBjb250ZW50V2lkdGggPiBjbGllbnRXaWR0aFdpdGhWZXJ0aWNhbFNjcm9sbGJhciBvclxuICAgICAgICAgQGNvbnRlbnRXaWR0aCA+IGNsaWVudFdpZHRoV2l0aG91dFZlcnRpY2FsU2Nyb2xsYmFyIGFuZCBAY29udGVudEhlaWdodCA+IGNsaWVudEhlaWdodFdpdGhIb3Jpem9udGFsU2Nyb2xsYmFyKVxuXG4gICAgdmVydGljYWxTY3JvbGxiYXJWaXNpYmxlID1cbiAgICAgIG5vdCBAbW9kZWwuaXNNaW5pKCkgYW5kXG4gICAgICAgIChAY29udGVudEhlaWdodCA+IGNsaWVudEhlaWdodFdpdGhIb3Jpem9udGFsU2Nyb2xsYmFyIG9yXG4gICAgICAgICBAY29udGVudEhlaWdodCA+IGNsaWVudEhlaWdodFdpdGhvdXRIb3Jpem9udGFsU2Nyb2xsYmFyIGFuZCBAY29udGVudFdpZHRoID4gY2xpZW50V2lkdGhXaXRoVmVydGljYWxTY3JvbGxiYXIpXG5cbiAgICBob3Jpem9udGFsU2Nyb2xsYmFySGVpZ2h0ID1cbiAgICAgIGlmIGhvcml6b250YWxTY3JvbGxiYXJWaXNpYmxlXG4gICAgICAgIEBtZWFzdXJlZEhvcml6b250YWxTY3JvbGxiYXJIZWlnaHRcbiAgICAgIGVsc2VcbiAgICAgICAgMFxuXG4gICAgdmVydGljYWxTY3JvbGxiYXJXaWR0aCA9XG4gICAgICBpZiB2ZXJ0aWNhbFNjcm9sbGJhclZpc2libGVcbiAgICAgICAgQG1lYXN1cmVkVmVydGljYWxTY3JvbGxiYXJXaWR0aFxuICAgICAgZWxzZVxuICAgICAgICAwXG5cbiAgICB1bmxlc3MgQGhvcml6b250YWxTY3JvbGxiYXJIZWlnaHQgaXMgaG9yaXpvbnRhbFNjcm9sbGJhckhlaWdodFxuICAgICAgQGhvcml6b250YWxTY3JvbGxiYXJIZWlnaHQgPSBob3Jpem9udGFsU2Nyb2xsYmFySGVpZ2h0XG4gICAgICBAdXBkYXRlQ2xpZW50SGVpZ2h0KClcblxuICAgIHVubGVzcyBAdmVydGljYWxTY3JvbGxiYXJXaWR0aCBpcyB2ZXJ0aWNhbFNjcm9sbGJhcldpZHRoXG4gICAgICBAdmVydGljYWxTY3JvbGxiYXJXaWR0aCA9IHZlcnRpY2FsU2Nyb2xsYmFyV2lkdGhcbiAgICAgIEB1cGRhdGVDbGllbnRXaWR0aCgpXG5cbiAgbGluZURlY29yYXRpb25DbGFzc2VzRm9yUm93OiAocm93KSAtPlxuICAgIHJldHVybiBudWxsIGlmIEBtb2RlbC5pc01pbmkoKVxuXG4gICAgZGVjb3JhdGlvbkNsYXNzZXMgPSBudWxsXG4gICAgZm9yIGlkLCBwcm9wZXJ0aWVzIG9mIEBsaW5lRGVjb3JhdGlvbnNCeVNjcmVlblJvd1tyb3ddXG4gICAgICBkZWNvcmF0aW9uQ2xhc3NlcyA/PSBbXVxuICAgICAgZGVjb3JhdGlvbkNsYXNzZXMucHVzaChwcm9wZXJ0aWVzLmNsYXNzKVxuICAgIGRlY29yYXRpb25DbGFzc2VzXG5cbiAgbGluZU51bWJlckRlY29yYXRpb25DbGFzc2VzRm9yUm93OiAocm93KSAtPlxuICAgIHJldHVybiBudWxsIGlmIEBtb2RlbC5pc01pbmkoKVxuXG4gICAgZGVjb3JhdGlvbkNsYXNzZXMgPSBudWxsXG4gICAgZm9yIGlkLCBwcm9wZXJ0aWVzIG9mIEBsaW5lTnVtYmVyRGVjb3JhdGlvbnNCeVNjcmVlblJvd1tyb3ddXG4gICAgICBkZWNvcmF0aW9uQ2xhc3NlcyA/PSBbXVxuICAgICAgZGVjb3JhdGlvbkNsYXNzZXMucHVzaChwcm9wZXJ0aWVzLmNsYXNzKVxuICAgIGRlY29yYXRpb25DbGFzc2VzXG5cbiAgZ2V0Q3Vyc29yQmxpbmtQZXJpb2Q6IC0+IEBjdXJzb3JCbGlua1BlcmlvZFxuXG4gIGdldEN1cnNvckJsaW5rUmVzdW1lRGVsYXk6IC0+IEBjdXJzb3JCbGlua1Jlc3VtZURlbGF5XG5cbiAgc2V0Rm9jdXNlZDogKGZvY3VzZWQpIC0+XG4gICAgdW5sZXNzIEBmb2N1c2VkIGlzIGZvY3VzZWRcbiAgICAgIEBmb2N1c2VkID0gZm9jdXNlZFxuICAgICAgaWYgQGZvY3VzZWRcbiAgICAgICAgQHN0YXJ0QmxpbmtpbmdDdXJzb3JzKClcbiAgICAgIGVsc2VcbiAgICAgICAgQHN0b3BCbGlua2luZ0N1cnNvcnMoZmFsc2UpXG4gICAgICBAZW1pdERpZFVwZGF0ZVN0YXRlKClcblxuICBzZXRTY3JvbGxUb3A6IChzY3JvbGxUb3ApIC0+XG4gICAgcmV0dXJuIHVubGVzcyBzY3JvbGxUb3A/XG5cbiAgICBAcGVuZGluZ1Njcm9sbExvZ2ljYWxQb3NpdGlvbiA9IG51bGxcbiAgICBAcGVuZGluZ1Njcm9sbFRvcCA9IHNjcm9sbFRvcFxuXG4gICAgQHNob3VsZFVwZGF0ZURlY29yYXRpb25zID0gdHJ1ZVxuICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIGdldFNjcm9sbFRvcDogLT5cbiAgICBAc2Nyb2xsVG9wXG5cbiAgZ2V0UmVhbFNjcm9sbFRvcDogLT5cbiAgICBAcmVhbFNjcm9sbFRvcCA/IEBzY3JvbGxUb3BcblxuICBkaWRTdGFydFNjcm9sbGluZzogLT5cbiAgICBpZiBAc3RvcHBlZFNjcm9sbGluZ1RpbWVvdXRJZD9cbiAgICAgIGNsZWFyVGltZW91dChAc3RvcHBlZFNjcm9sbGluZ1RpbWVvdXRJZClcbiAgICAgIEBzdG9wcGVkU2Nyb2xsaW5nVGltZW91dElkID0gbnVsbFxuICAgIEBzdG9wcGVkU2Nyb2xsaW5nVGltZW91dElkID0gc2V0VGltZW91dChAZGlkU3RvcFNjcm9sbGluZy5iaW5kKHRoaXMpLCBAc3RvcHBlZFNjcm9sbGluZ0RlbGF5KVxuXG4gIGRpZFN0b3BTY3JvbGxpbmc6IC0+XG4gICAgaWYgQG1vdXNlV2hlZWxTY3JlZW5Sb3c/XG4gICAgICBAbW91c2VXaGVlbFNjcmVlblJvdyA9IG51bGxcbiAgICAgIEBzaG91bGRVcGRhdGVEZWNvcmF0aW9ucyA9IHRydWVcblxuICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIHNldFNjcm9sbExlZnQ6IChzY3JvbGxMZWZ0KSAtPlxuICAgIHJldHVybiB1bmxlc3Mgc2Nyb2xsTGVmdD9cblxuICAgIEBwZW5kaW5nU2Nyb2xsTG9naWNhbFBvc2l0aW9uID0gbnVsbFxuICAgIEBwZW5kaW5nU2Nyb2xsTGVmdCA9IHNjcm9sbExlZnRcblxuICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIGdldFNjcm9sbExlZnQ6IC0+XG4gICAgQHNjcm9sbExlZnRcblxuICBnZXRSZWFsU2Nyb2xsTGVmdDogLT5cbiAgICBAcmVhbFNjcm9sbExlZnQgPyBAc2Nyb2xsTGVmdFxuXG4gIGdldENsaWVudEhlaWdodDogLT5cbiAgICBpZiBAY2xpZW50SGVpZ2h0XG4gICAgICBAY2xpZW50SGVpZ2h0XG4gICAgZWxzZVxuICAgICAgQGV4cGxpY2l0SGVpZ2h0IC0gQGhvcml6b250YWxTY3JvbGxiYXJIZWlnaHRcblxuICBnZXRDbGllbnRXaWR0aDogLT5cbiAgICBpZiBAY2xpZW50V2lkdGhcbiAgICAgIEBjbGllbnRXaWR0aFxuICAgIGVsc2VcbiAgICAgIEBjb250ZW50RnJhbWVXaWR0aCAtIEB2ZXJ0aWNhbFNjcm9sbGJhcldpZHRoXG5cbiAgZ2V0U2Nyb2xsQm90dG9tOiAtPiBAZ2V0U2Nyb2xsVG9wKCkgKyBAZ2V0Q2xpZW50SGVpZ2h0KClcbiAgc2V0U2Nyb2xsQm90dG9tOiAoc2Nyb2xsQm90dG9tKSAtPlxuICAgIEBzZXRTY3JvbGxUb3Aoc2Nyb2xsQm90dG9tIC0gQGdldENsaWVudEhlaWdodCgpKVxuICAgIEBnZXRTY3JvbGxCb3R0b20oKVxuXG4gIGdldFNjcm9sbFJpZ2h0OiAtPiBAZ2V0U2Nyb2xsTGVmdCgpICsgQGdldENsaWVudFdpZHRoKClcbiAgc2V0U2Nyb2xsUmlnaHQ6IChzY3JvbGxSaWdodCkgLT5cbiAgICBAc2V0U2Nyb2xsTGVmdChzY3JvbGxSaWdodCAtIEBnZXRDbGllbnRXaWR0aCgpKVxuICAgIEBnZXRTY3JvbGxSaWdodCgpXG5cbiAgZ2V0U2Nyb2xsSGVpZ2h0OiAtPlxuICAgIEBzY3JvbGxIZWlnaHRcblxuICBnZXRTY3JvbGxXaWR0aDogLT5cbiAgICBAc2Nyb2xsV2lkdGhcblxuICBnZXRNYXhTY3JvbGxUb3A6IC0+XG4gICAgc2Nyb2xsSGVpZ2h0ID0gQGdldFNjcm9sbEhlaWdodCgpXG4gICAgY2xpZW50SGVpZ2h0ID0gQGdldENsaWVudEhlaWdodCgpXG4gICAgcmV0dXJuIDAgdW5sZXNzIHNjcm9sbEhlaWdodD8gYW5kIGNsaWVudEhlaWdodD9cblxuICAgIHNjcm9sbEhlaWdodCAtIGNsaWVudEhlaWdodFxuXG4gIHNldEhvcml6b250YWxTY3JvbGxiYXJIZWlnaHQ6IChob3Jpem9udGFsU2Nyb2xsYmFySGVpZ2h0KSAtPlxuICAgIHVubGVzcyBAbWVhc3VyZWRIb3Jpem9udGFsU2Nyb2xsYmFySGVpZ2h0IGlzIGhvcml6b250YWxTY3JvbGxiYXJIZWlnaHRcbiAgICAgIEBtZWFzdXJlZEhvcml6b250YWxTY3JvbGxiYXJIZWlnaHQgPSBob3Jpem9udGFsU2Nyb2xsYmFySGVpZ2h0XG4gICAgICBAZW1pdERpZFVwZGF0ZVN0YXRlKClcblxuICBzZXRWZXJ0aWNhbFNjcm9sbGJhcldpZHRoOiAodmVydGljYWxTY3JvbGxiYXJXaWR0aCkgLT5cbiAgICB1bmxlc3MgQG1lYXN1cmVkVmVydGljYWxTY3JvbGxiYXJXaWR0aCBpcyB2ZXJ0aWNhbFNjcm9sbGJhcldpZHRoXG4gICAgICBAbWVhc3VyZWRWZXJ0aWNhbFNjcm9sbGJhcldpZHRoID0gdmVydGljYWxTY3JvbGxiYXJXaWR0aFxuICAgICAgQGVtaXREaWRVcGRhdGVTdGF0ZSgpXG5cbiAgc2V0QXV0b0hlaWdodDogKGF1dG9IZWlnaHQpIC0+XG4gICAgdW5sZXNzIEBhdXRvSGVpZ2h0IGlzIGF1dG9IZWlnaHRcbiAgICAgIEBhdXRvSGVpZ2h0ID0gYXV0b0hlaWdodFxuICAgICAgQGVtaXREaWRVcGRhdGVTdGF0ZSgpXG5cbiAgc2V0RXhwbGljaXRIZWlnaHQ6IChleHBsaWNpdEhlaWdodCkgLT5cbiAgICB1bmxlc3MgQGV4cGxpY2l0SGVpZ2h0IGlzIGV4cGxpY2l0SGVpZ2h0XG4gICAgICBAZXhwbGljaXRIZWlnaHQgPSBleHBsaWNpdEhlaWdodFxuICAgICAgQHVwZGF0ZUhlaWdodCgpXG4gICAgICBAc2hvdWxkVXBkYXRlRGVjb3JhdGlvbnMgPSB0cnVlXG4gICAgICBAZW1pdERpZFVwZGF0ZVN0YXRlKClcblxuICB1cGRhdGVIZWlnaHQ6IC0+XG4gICAgaGVpZ2h0ID0gQGV4cGxpY2l0SGVpZ2h0ID8gQGNvbnRlbnRIZWlnaHRcbiAgICB1bmxlc3MgQGhlaWdodCBpcyBoZWlnaHRcbiAgICAgIEBoZWlnaHQgPSBoZWlnaHRcbiAgICAgIEB1cGRhdGVTY3JvbGxiYXJEaW1lbnNpb25zKClcbiAgICAgIEB1cGRhdGVDbGllbnRIZWlnaHQoKVxuICAgICAgQHVwZGF0ZVNjcm9sbEhlaWdodCgpXG4gICAgICBAdXBkYXRlRW5kUm93KClcblxuICBkaWRDaGFuZ2VBdXRvV2lkdGg6IC0+XG4gICAgQGVtaXREaWRVcGRhdGVTdGF0ZSgpXG5cbiAgc2V0Q29udGVudEZyYW1lV2lkdGg6IChjb250ZW50RnJhbWVXaWR0aCkgLT5cbiAgICBpZiBAY29udGVudEZyYW1lV2lkdGggaXNudCBjb250ZW50RnJhbWVXaWR0aCBvciBAZWRpdG9yV2lkdGhJbkNoYXJzP1xuICAgICAgQGNvbnRlbnRGcmFtZVdpZHRoID0gY29udGVudEZyYW1lV2lkdGhcbiAgICAgIEBlZGl0b3JXaWR0aEluQ2hhcnMgPSBudWxsXG4gICAgICBAdXBkYXRlU2Nyb2xsYmFyRGltZW5zaW9ucygpXG4gICAgICBAdXBkYXRlQ2xpZW50V2lkdGgoKVxuICAgICAgQGludmFsaWRhdGVBbGxCbG9ja0RlY29yYXRpb25zRGltZW5zaW9ucyA9IHRydWVcbiAgICAgIEBzaG91bGRVcGRhdGVEZWNvcmF0aW9ucyA9IHRydWVcbiAgICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIHNldEJvdW5kaW5nQ2xpZW50UmVjdDogKGJvdW5kaW5nQ2xpZW50UmVjdCkgLT5cbiAgICB1bmxlc3MgQGNsaWVudFJlY3RzRXF1YWwoQGJvdW5kaW5nQ2xpZW50UmVjdCwgYm91bmRpbmdDbGllbnRSZWN0KVxuICAgICAgQGJvdW5kaW5nQ2xpZW50UmVjdCA9IGJvdW5kaW5nQ2xpZW50UmVjdFxuICAgICAgQGludmFsaWRhdGVBbGxCbG9ja0RlY29yYXRpb25zRGltZW5zaW9ucyA9IHRydWVcbiAgICAgIEBzaG91bGRVcGRhdGVEZWNvcmF0aW9ucyA9IHRydWVcbiAgICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIGNsaWVudFJlY3RzRXF1YWw6IChjbGllbnRSZWN0QSwgY2xpZW50UmVjdEIpIC0+XG4gICAgY2xpZW50UmVjdEE/IGFuZCBjbGllbnRSZWN0Qj8gYW5kXG4gICAgICBjbGllbnRSZWN0QS50b3AgaXMgY2xpZW50UmVjdEIudG9wIGFuZFxuICAgICAgY2xpZW50UmVjdEEubGVmdCBpcyBjbGllbnRSZWN0Qi5sZWZ0IGFuZFxuICAgICAgY2xpZW50UmVjdEEud2lkdGggaXMgY2xpZW50UmVjdEIud2lkdGggYW5kXG4gICAgICBjbGllbnRSZWN0QS5oZWlnaHQgaXMgY2xpZW50UmVjdEIuaGVpZ2h0XG5cbiAgc2V0V2luZG93U2l6ZTogKHdpZHRoLCBoZWlnaHQpIC0+XG4gICAgaWYgQHdpbmRvd1dpZHRoIGlzbnQgd2lkdGggb3IgQHdpbmRvd0hlaWdodCBpc250IGhlaWdodFxuICAgICAgQHdpbmRvd1dpZHRoID0gd2lkdGhcbiAgICAgIEB3aW5kb3dIZWlnaHQgPSBoZWlnaHRcbiAgICAgIEBpbnZhbGlkYXRlQWxsQmxvY2tEZWNvcmF0aW9uc0RpbWVuc2lvbnMgPSB0cnVlXG4gICAgICBAc2hvdWxkVXBkYXRlRGVjb3JhdGlvbnMgPSB0cnVlXG5cbiAgICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIHNldEJhY2tncm91bmRDb2xvcjogKGJhY2tncm91bmRDb2xvcikgLT5cbiAgICB1bmxlc3MgQGJhY2tncm91bmRDb2xvciBpcyBiYWNrZ3JvdW5kQ29sb3JcbiAgICAgIEBiYWNrZ3JvdW5kQ29sb3IgPSBiYWNrZ3JvdW5kQ29sb3JcbiAgICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIHNldEd1dHRlckJhY2tncm91bmRDb2xvcjogKGd1dHRlckJhY2tncm91bmRDb2xvcikgLT5cbiAgICB1bmxlc3MgQGd1dHRlckJhY2tncm91bmRDb2xvciBpcyBndXR0ZXJCYWNrZ3JvdW5kQ29sb3JcbiAgICAgIEBndXR0ZXJCYWNrZ3JvdW5kQ29sb3IgPSBndXR0ZXJCYWNrZ3JvdW5kQ29sb3JcbiAgICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIHNldEd1dHRlcldpZHRoOiAoZ3V0dGVyV2lkdGgpIC0+XG4gICAgaWYgQGd1dHRlcldpZHRoIGlzbnQgZ3V0dGVyV2lkdGhcbiAgICAgIEBndXR0ZXJXaWR0aCA9IGd1dHRlcldpZHRoXG4gICAgICBAdXBkYXRlT3ZlcmxheXNTdGF0ZSgpXG5cbiAgZ2V0R3V0dGVyV2lkdGg6IC0+XG4gICAgQGd1dHRlcldpZHRoXG5cbiAgc2V0TGluZUhlaWdodDogKGxpbmVIZWlnaHQpIC0+XG4gICAgdW5sZXNzIEBsaW5lSGVpZ2h0IGlzIGxpbmVIZWlnaHRcbiAgICAgIEBsaW5lSGVpZ2h0ID0gbGluZUhlaWdodFxuICAgICAgQG1vZGVsLnNldExpbmVIZWlnaHRJblBpeGVscyhAbGluZUhlaWdodClcbiAgICAgIEBsaW5lVG9wSW5kZXguc2V0RGVmYXVsdExpbmVIZWlnaHQoQGxpbmVIZWlnaHQpXG4gICAgICBAcmVzdG9yZVNjcm9sbFRvcElmTmVlZGVkKClcbiAgICAgIEBtb2RlbC5zZXRMaW5lSGVpZ2h0SW5QaXhlbHMobGluZUhlaWdodClcbiAgICAgIEBzaG91bGRVcGRhdGVEZWNvcmF0aW9ucyA9IHRydWVcbiAgICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIHNldE1vdXNlV2hlZWxTY3JlZW5Sb3c6IChzY3JlZW5Sb3cpIC0+XG4gICAgaWYgQG1vdXNlV2hlZWxTY3JlZW5Sb3cgaXNudCBzY3JlZW5Sb3dcbiAgICAgIEBtb3VzZVdoZWVsU2NyZWVuUm93ID0gc2NyZWVuUm93XG4gICAgICBAZGlkU3RhcnRTY3JvbGxpbmcoKVxuXG4gIHNldEJhc2VDaGFyYWN0ZXJXaWR0aDogKGJhc2VDaGFyYWN0ZXJXaWR0aCwgZG91YmxlV2lkdGhDaGFyV2lkdGgsIGhhbGZXaWR0aENoYXJXaWR0aCwga29yZWFuQ2hhcldpZHRoKSAtPlxuICAgIHVubGVzcyBAYmFzZUNoYXJhY3RlcldpZHRoIGlzIGJhc2VDaGFyYWN0ZXJXaWR0aCBhbmQgQGRvdWJsZVdpZHRoQ2hhcldpZHRoIGlzIGRvdWJsZVdpZHRoQ2hhcldpZHRoIGFuZCBAaGFsZldpZHRoQ2hhcldpZHRoIGlzIGhhbGZXaWR0aENoYXJXaWR0aCBhbmQga29yZWFuQ2hhcldpZHRoIGlzIEBrb3JlYW5DaGFyV2lkdGhcbiAgICAgIEBiYXNlQ2hhcmFjdGVyV2lkdGggPSBiYXNlQ2hhcmFjdGVyV2lkdGhcbiAgICAgIEBkb3VibGVXaWR0aENoYXJXaWR0aCA9IGRvdWJsZVdpZHRoQ2hhcldpZHRoXG4gICAgICBAaGFsZldpZHRoQ2hhcldpZHRoID0gaGFsZldpZHRoQ2hhcldpZHRoXG4gICAgICBAa29yZWFuQ2hhcldpZHRoID0ga29yZWFuQ2hhcldpZHRoXG4gICAgICBAbW9kZWwuc2V0RGVmYXVsdENoYXJXaWR0aChiYXNlQ2hhcmFjdGVyV2lkdGgsIGRvdWJsZVdpZHRoQ2hhcldpZHRoLCBoYWxmV2lkdGhDaGFyV2lkdGgsIGtvcmVhbkNoYXJXaWR0aClcbiAgICAgIEByZXN0b3JlU2Nyb2xsTGVmdElmTmVlZGVkKClcbiAgICAgIEBtZWFzdXJlbWVudHNDaGFuZ2VkKClcblxuICBtZWFzdXJlbWVudHNDaGFuZ2VkOiAtPlxuICAgIEBpbnZhbGlkYXRlQWxsQmxvY2tEZWNvcmF0aW9uc0RpbWVuc2lvbnMgPSB0cnVlXG4gICAgQHNob3VsZFVwZGF0ZURlY29yYXRpb25zID0gdHJ1ZVxuICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIGhhc1BpeGVsUG9zaXRpb25SZXF1aXJlbWVudHM6IC0+XG4gICAgQGxpbmVIZWlnaHQ/IGFuZCBAYmFzZUNoYXJhY3RlcldpZHRoP1xuXG4gIHBpeGVsUG9zaXRpb25Gb3JTY3JlZW5Qb3NpdGlvbjogKHNjcmVlblBvc2l0aW9uKSAtPlxuICAgIHBvc2l0aW9uID0gQGxpbmVzWWFyZHN0aWNrLnBpeGVsUG9zaXRpb25Gb3JTY3JlZW5Qb3NpdGlvbihzY3JlZW5Qb3NpdGlvbilcbiAgICBwb3NpdGlvbi50b3AgLT0gQGdldFNjcm9sbFRvcCgpXG4gICAgcG9zaXRpb24ubGVmdCAtPSBAZ2V0U2Nyb2xsTGVmdCgpXG5cbiAgICBwb3NpdGlvbi50b3AgPSBNYXRoLnJvdW5kKHBvc2l0aW9uLnRvcClcbiAgICBwb3NpdGlvbi5sZWZ0ID0gTWF0aC5yb3VuZChwb3NpdGlvbi5sZWZ0KVxuXG4gICAgcG9zaXRpb25cblxuICBoYXNQaXhlbFJlY3RSZXF1aXJlbWVudHM6IC0+XG4gICAgQGhhc1BpeGVsUG9zaXRpb25SZXF1aXJlbWVudHMoKSBhbmQgQHNjcm9sbFdpZHRoP1xuXG4gIGhhc092ZXJsYXlQb3NpdGlvblJlcXVpcmVtZW50czogLT5cbiAgICBAaGFzUGl4ZWxSZWN0UmVxdWlyZW1lbnRzKCkgYW5kIEBib3VuZGluZ0NsaWVudFJlY3Q/IGFuZCBAd2luZG93V2lkdGggYW5kIEB3aW5kb3dIZWlnaHRcblxuICBhYnNvbHV0ZVBpeGVsUmVjdEZvclNjcmVlblJhbmdlOiAoc2NyZWVuUmFuZ2UpIC0+XG4gICAgbGluZUhlaWdodCA9IEBtb2RlbC5nZXRMaW5lSGVpZ2h0SW5QaXhlbHMoKVxuXG4gICAgaWYgc2NyZWVuUmFuZ2UuZW5kLnJvdyA+IHNjcmVlblJhbmdlLnN0YXJ0LnJvd1xuICAgICAgdG9wID0gQGxpbmVzWWFyZHN0aWNrLnBpeGVsUG9zaXRpb25Gb3JTY3JlZW5Qb3NpdGlvbihzY3JlZW5SYW5nZS5zdGFydCkudG9wXG4gICAgICBsZWZ0ID0gMFxuICAgICAgaGVpZ2h0ID0gKHNjcmVlblJhbmdlLmVuZC5yb3cgLSBzY3JlZW5SYW5nZS5zdGFydC5yb3cgKyAxKSAqIGxpbmVIZWlnaHRcbiAgICAgIHdpZHRoID0gQGdldFNjcm9sbFdpZHRoKClcbiAgICBlbHNlXG4gICAgICB7dG9wLCBsZWZ0fSA9IEBsaW5lc1lhcmRzdGljay5waXhlbFBvc2l0aW9uRm9yU2NyZWVuUG9zaXRpb24oc2NyZWVuUmFuZ2Uuc3RhcnQpXG4gICAgICBoZWlnaHQgPSBsaW5lSGVpZ2h0XG4gICAgICB3aWR0aCA9IEBsaW5lc1lhcmRzdGljay5waXhlbFBvc2l0aW9uRm9yU2NyZWVuUG9zaXRpb24oc2NyZWVuUmFuZ2UuZW5kKS5sZWZ0IC0gbGVmdFxuXG4gICAge3RvcCwgbGVmdCwgd2lkdGgsIGhlaWdodH1cblxuICBwaXhlbFJlY3RGb3JTY3JlZW5SYW5nZTogKHNjcmVlblJhbmdlKSAtPlxuICAgIHJlY3QgPSBAYWJzb2x1dGVQaXhlbFJlY3RGb3JTY3JlZW5SYW5nZShzY3JlZW5SYW5nZSlcbiAgICByZWN0LnRvcCAtPSBAZ2V0U2Nyb2xsVG9wKClcbiAgICByZWN0LmxlZnQgLT0gQGdldFNjcm9sbExlZnQoKVxuICAgIHJlY3QudG9wID0gTWF0aC5yb3VuZChyZWN0LnRvcClcbiAgICByZWN0LmxlZnQgPSBNYXRoLnJvdW5kKHJlY3QubGVmdClcbiAgICByZWN0LndpZHRoID0gTWF0aC5yb3VuZChyZWN0LndpZHRoKVxuICAgIHJlY3QuaGVpZ2h0ID0gTWF0aC5yb3VuZChyZWN0LmhlaWdodClcbiAgICByZWN0XG5cbiAgdXBkYXRlTGluZXM6IC0+XG4gICAgQGxpbmVzQnlTY3JlZW5Sb3cuY2xlYXIoKVxuXG4gICAgZm9yIFtzdGFydFJvdywgZW5kUm93XSBpbiBAZ2V0U2NyZWVuUmFuZ2VzVG9SZW5kZXIoKVxuICAgICAgZm9yIGxpbmUsIGluZGV4IGluIEBkaXNwbGF5TGF5ZXIuZ2V0U2NyZWVuTGluZXMoc3RhcnRSb3csIGVuZFJvdyArIDEpXG4gICAgICAgIEBsaW5lc0J5U2NyZWVuUm93LnNldChzdGFydFJvdyArIGluZGV4LCBsaW5lKVxuXG4gIGxpbmVJZEZvclNjcmVlblJvdzogKHNjcmVlblJvdykgLT5cbiAgICBAbGluZXNCeVNjcmVlblJvdy5nZXQoc2NyZWVuUm93KT8uaWRcblxuICBmZXRjaERlY29yYXRpb25zOiAtPlxuICAgIHJldHVybiB1bmxlc3MgMCA8PSBAc3RhcnRSb3cgPD0gQGVuZFJvdyA8PSBJbmZpbml0eVxuICAgIEBkZWNvcmF0aW9ucyA9IEBtb2RlbC5kZWNvcmF0aW9uc1N0YXRlRm9yU2NyZWVuUm93UmFuZ2UoQHN0YXJ0Um93LCBAZW5kUm93IC0gMSlcblxuICB1cGRhdGVCbG9ja0RlY29yYXRpb25zOiAtPlxuICAgIGlmIEBpbnZhbGlkYXRlQWxsQmxvY2tEZWNvcmF0aW9uc0RpbWVuc2lvbnNcbiAgICAgIGZvciBkZWNvcmF0aW9uIGluIEBtb2RlbC5nZXREZWNvcmF0aW9ucyh0eXBlOiAnYmxvY2snKVxuICAgICAgICBAaW52YWxpZGF0ZWREaW1lbnNpb25zQnlCbG9ja0RlY29yYXRpb24uYWRkKGRlY29yYXRpb24pXG4gICAgICBAaW52YWxpZGF0ZUFsbEJsb2NrRGVjb3JhdGlvbnNEaW1lbnNpb25zID0gZmFsc2VcblxuICAgIHZpc2libGVEZWNvcmF0aW9uc0J5SWQgPSB7fVxuICAgIHZpc2libGVEZWNvcmF0aW9uc0J5U2NyZWVuUm93QW5kSWQgPSB7fVxuICAgIGZvciBtYXJrZXJJZCwgZGVjb3JhdGlvbnMgb2YgQG1vZGVsLmRlY29yYXRpb25zRm9yU2NyZWVuUm93UmFuZ2UoQGdldFN0YXJ0VGlsZVJvdygpLCBAZ2V0RW5kVGlsZVJvdygpICsgQHRpbGVTaXplIC0gMSlcbiAgICAgIGZvciBkZWNvcmF0aW9uIGluIGRlY29yYXRpb25zIHdoZW4gZGVjb3JhdGlvbi5pc1R5cGUoJ2Jsb2NrJylcbiAgICAgICAgc2NyZWVuUm93ID0gZGVjb3JhdGlvbi5nZXRNYXJrZXIoKS5nZXRIZWFkU2NyZWVuUG9zaXRpb24oKS5yb3dcbiAgICAgICAgaWYgZGVjb3JhdGlvbi5nZXRQcm9wZXJ0aWVzKCkucG9zaXRpb24gaXMgXCJhZnRlclwiXG4gICAgICAgICAgQGZvbGxvd2luZ0Jsb2NrRGVjb3JhdGlvbnNCeVNjcmVlblJvd0FuZElkW3NjcmVlblJvd10gPz0ge31cbiAgICAgICAgICBAZm9sbG93aW5nQmxvY2tEZWNvcmF0aW9uc0J5U2NyZWVuUm93QW5kSWRbc2NyZWVuUm93XVtkZWNvcmF0aW9uLmlkXSA9IHtzY3JlZW5Sb3csIGRlY29yYXRpb259XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAcHJlY2VkaW5nQmxvY2tEZWNvcmF0aW9uc0J5U2NyZWVuUm93QW5kSWRbc2NyZWVuUm93XSA/PSB7fVxuICAgICAgICAgIEBwcmVjZWRpbmdCbG9ja0RlY29yYXRpb25zQnlTY3JlZW5Sb3dBbmRJZFtzY3JlZW5Sb3ddW2RlY29yYXRpb24uaWRdID0ge3NjcmVlblJvdywgZGVjb3JhdGlvbn1cbiAgICAgICAgdmlzaWJsZURlY29yYXRpb25zQnlJZFtkZWNvcmF0aW9uLmlkXSA9IHRydWVcbiAgICAgICAgdmlzaWJsZURlY29yYXRpb25zQnlTY3JlZW5Sb3dBbmRJZFtzY3JlZW5Sb3ddID89IHt9XG4gICAgICAgIHZpc2libGVEZWNvcmF0aW9uc0J5U2NyZWVuUm93QW5kSWRbc2NyZWVuUm93XVtkZWNvcmF0aW9uLmlkXSA9IHRydWVcblxuICAgIGZvciBzY3JlZW5Sb3csIGJsb2NrRGVjb3JhdGlvbnMgb2YgQHByZWNlZGluZ0Jsb2NrRGVjb3JhdGlvbnNCeVNjcmVlblJvd0FuZElkXG4gICAgICBpZiBOdW1iZXIoc2NyZWVuUm93KSBpc250IEBtb3VzZVdoZWVsU2NyZWVuUm93XG4gICAgICAgIGZvciBpZCwgYmxvY2tEZWNvcmF0aW9uIG9mIGJsb2NrRGVjb3JhdGlvbnNcbiAgICAgICAgICB1bmxlc3MgdmlzaWJsZURlY29yYXRpb25zQnlTY3JlZW5Sb3dBbmRJZFtzY3JlZW5Sb3ddP1tpZF1cbiAgICAgICAgICAgIGRlbGV0ZSBAcHJlY2VkaW5nQmxvY2tEZWNvcmF0aW9uc0J5U2NyZWVuUm93QW5kSWRbc2NyZWVuUm93XVtpZF1cblxuICAgIGZvciBzY3JlZW5Sb3csIGJsb2NrRGVjb3JhdGlvbnMgb2YgQGZvbGxvd2luZ0Jsb2NrRGVjb3JhdGlvbnNCeVNjcmVlblJvd0FuZElkXG4gICAgICBpZiBOdW1iZXIoc2NyZWVuUm93KSBpc250IEBtb3VzZVdoZWVsU2NyZWVuUm93XG4gICAgICAgIGZvciBpZCwgYmxvY2tEZWNvcmF0aW9uIG9mIGJsb2NrRGVjb3JhdGlvbnNcbiAgICAgICAgICB1bmxlc3MgdmlzaWJsZURlY29yYXRpb25zQnlTY3JlZW5Sb3dBbmRJZFtzY3JlZW5Sb3ddP1tpZF1cbiAgICAgICAgICAgIGRlbGV0ZSBAZm9sbG93aW5nQmxvY2tEZWNvcmF0aW9uc0J5U2NyZWVuUm93QW5kSWRbc2NyZWVuUm93XVtpZF1cblxuICAgIEBzdGF0ZS5jb250ZW50Lm9mZlNjcmVlbkJsb2NrRGVjb3JhdGlvbnMgPSB7fVxuICAgIEBpbnZhbGlkYXRlZERpbWVuc2lvbnNCeUJsb2NrRGVjb3JhdGlvbi5mb3JFYWNoIChkZWNvcmF0aW9uKSA9PlxuICAgICAgdW5sZXNzIHZpc2libGVEZWNvcmF0aW9uc0J5SWRbZGVjb3JhdGlvbi5pZF1cbiAgICAgICAgQHN0YXRlLmNvbnRlbnQub2ZmU2NyZWVuQmxvY2tEZWNvcmF0aW9uc1tkZWNvcmF0aW9uLmlkXSA9IGRlY29yYXRpb25cblxuICB1cGRhdGVMaW5lRGVjb3JhdGlvbnM6IC0+XG4gICAgQGxpbmVEZWNvcmF0aW9uc0J5U2NyZWVuUm93ID0ge31cbiAgICBAbGluZU51bWJlckRlY29yYXRpb25zQnlTY3JlZW5Sb3cgPSB7fVxuICAgIEBjdXN0b21HdXR0ZXJEZWNvcmF0aW9uc0J5R3V0dGVyTmFtZSA9IHt9XG5cbiAgICBmb3IgZGVjb3JhdGlvbklkLCBkZWNvcmF0aW9uU3RhdGUgb2YgQGRlY29yYXRpb25zXG4gICAgICB7cHJvcGVydGllcywgYnVmZmVyUmFuZ2UsIHNjcmVlblJhbmdlLCByYW5nZUlzUmV2ZXJzZWR9ID0gZGVjb3JhdGlvblN0YXRlXG4gICAgICBpZiBEZWNvcmF0aW9uLmlzVHlwZShwcm9wZXJ0aWVzLCAnbGluZScpIG9yIERlY29yYXRpb24uaXNUeXBlKHByb3BlcnRpZXMsICdsaW5lLW51bWJlcicpXG4gICAgICAgIEBhZGRUb0xpbmVEZWNvcmF0aW9uQ2FjaGVzKGRlY29yYXRpb25JZCwgcHJvcGVydGllcywgYnVmZmVyUmFuZ2UsIHNjcmVlblJhbmdlLCByYW5nZUlzUmV2ZXJzZWQpXG5cbiAgICAgIGVsc2UgaWYgRGVjb3JhdGlvbi5pc1R5cGUocHJvcGVydGllcywgJ2d1dHRlcicpIGFuZCBwcm9wZXJ0aWVzLmd1dHRlck5hbWU/XG4gICAgICAgIEBjdXN0b21HdXR0ZXJEZWNvcmF0aW9uc0J5R3V0dGVyTmFtZVtwcm9wZXJ0aWVzLmd1dHRlck5hbWVdID89IHt9XG4gICAgICAgIEBjdXN0b21HdXR0ZXJEZWNvcmF0aW9uc0J5R3V0dGVyTmFtZVtwcm9wZXJ0aWVzLmd1dHRlck5hbWVdW2RlY29yYXRpb25JZF0gPSBkZWNvcmF0aW9uU3RhdGVcblxuICAgIHJldHVyblxuXG4gIHVwZGF0ZUhpZ2hsaWdodERlY29yYXRpb25zOiAtPlxuICAgIEB2aXNpYmxlSGlnaGxpZ2h0cyA9IHt9XG5cbiAgICBmb3IgZGVjb3JhdGlvbklkLCB7cHJvcGVydGllcywgc2NyZWVuUmFuZ2V9IG9mIEBkZWNvcmF0aW9uc1xuICAgICAgaWYgRGVjb3JhdGlvbi5pc1R5cGUocHJvcGVydGllcywgJ2hpZ2hsaWdodCcpXG4gICAgICAgIEB1cGRhdGVIaWdobGlnaHRTdGF0ZShkZWNvcmF0aW9uSWQsIHByb3BlcnRpZXMsIHNjcmVlblJhbmdlKVxuXG4gICAgZm9yIHRpbGVJZCwgdGlsZVN0YXRlIG9mIEBzdGF0ZS5jb250ZW50LnRpbGVzXG4gICAgICBmb3IgaWQgb2YgdGlsZVN0YXRlLmhpZ2hsaWdodHNcbiAgICAgICAgZGVsZXRlIHRpbGVTdGF0ZS5oaWdobGlnaHRzW2lkXSB1bmxlc3MgQHZpc2libGVIaWdobGlnaHRzW3RpbGVJZF0/W2lkXT9cblxuICAgIHJldHVyblxuXG4gIGFkZFRvTGluZURlY29yYXRpb25DYWNoZXM6IChkZWNvcmF0aW9uSWQsIHByb3BlcnRpZXMsIGJ1ZmZlclJhbmdlLCBzY3JlZW5SYW5nZSwgcmFuZ2VJc1JldmVyc2VkKSAtPlxuICAgIGlmIHNjcmVlblJhbmdlLmlzRW1wdHkoKVxuICAgICAgcmV0dXJuIGlmIHByb3BlcnRpZXMub25seU5vbkVtcHR5XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIGlmIHByb3BlcnRpZXMub25seUVtcHR5XG4gICAgICBvbWl0TGFzdFJvdyA9IHNjcmVlblJhbmdlLmVuZC5jb2x1bW4gaXMgMFxuXG4gICAgaWYgcmFuZ2VJc1JldmVyc2VkXG4gICAgICBoZWFkU2NyZWVuUG9zaXRpb24gPSBzY3JlZW5SYW5nZS5zdGFydFxuICAgIGVsc2VcbiAgICAgIGhlYWRTY3JlZW5Qb3NpdGlvbiA9IHNjcmVlblJhbmdlLmVuZFxuXG4gICAgaWYgcHJvcGVydGllcy5jbGFzcyBpcyAnZm9sZGVkJyBhbmQgRGVjb3JhdGlvbi5pc1R5cGUocHJvcGVydGllcywgJ2xpbmUtbnVtYmVyJylcbiAgICAgIHNjcmVlblJvdyA9IEBtb2RlbC5zY3JlZW5Sb3dGb3JCdWZmZXJSb3coYnVmZmVyUmFuZ2Uuc3RhcnQucm93KVxuICAgICAgQGxpbmVOdW1iZXJEZWNvcmF0aW9uc0J5U2NyZWVuUm93W3NjcmVlblJvd10gPz0ge31cbiAgICAgIEBsaW5lTnVtYmVyRGVjb3JhdGlvbnNCeVNjcmVlblJvd1tzY3JlZW5Sb3ddW2RlY29yYXRpb25JZF0gPSBwcm9wZXJ0aWVzXG4gICAgZWxzZVxuICAgICAgc3RhcnRSb3cgPSBNYXRoLm1heChzY3JlZW5SYW5nZS5zdGFydC5yb3csIEBnZXRTdGFydFRpbGVSb3coKSlcbiAgICAgIGVuZFJvdyA9IE1hdGgubWluKHNjcmVlblJhbmdlLmVuZC5yb3csIEBnZXRFbmRUaWxlUm93KCkgKyBAdGlsZVNpemUpXG4gICAgICBmb3Igcm93IGluIFtzdGFydFJvdy4uZW5kUm93XSBieSAxXG4gICAgICAgIGNvbnRpbnVlIGlmIHByb3BlcnRpZXMub25seUhlYWQgYW5kIHJvdyBpc250IGhlYWRTY3JlZW5Qb3NpdGlvbi5yb3dcbiAgICAgICAgY29udGludWUgaWYgb21pdExhc3RSb3cgYW5kIHJvdyBpcyBzY3JlZW5SYW5nZS5lbmQucm93XG5cbiAgICAgICAgaWYgRGVjb3JhdGlvbi5pc1R5cGUocHJvcGVydGllcywgJ2xpbmUnKVxuICAgICAgICAgIEBsaW5lRGVjb3JhdGlvbnNCeVNjcmVlblJvd1tyb3ddID89IHt9XG4gICAgICAgICAgQGxpbmVEZWNvcmF0aW9uc0J5U2NyZWVuUm93W3Jvd11bZGVjb3JhdGlvbklkXSA9IHByb3BlcnRpZXNcblxuICAgICAgICBpZiBEZWNvcmF0aW9uLmlzVHlwZShwcm9wZXJ0aWVzLCAnbGluZS1udW1iZXInKVxuICAgICAgICAgIEBsaW5lTnVtYmVyRGVjb3JhdGlvbnNCeVNjcmVlblJvd1tyb3ddID89IHt9XG4gICAgICAgICAgQGxpbmVOdW1iZXJEZWNvcmF0aW9uc0J5U2NyZWVuUm93W3Jvd11bZGVjb3JhdGlvbklkXSA9IHByb3BlcnRpZXNcblxuICAgIHJldHVyblxuXG4gIGludGVyc2VjdFJhbmdlV2l0aFRpbGU6IChyYW5nZSwgdGlsZVN0YXJ0Um93KSAtPlxuICAgIGludGVyc2VjdGluZ1N0YXJ0Um93ID0gTWF0aC5tYXgodGlsZVN0YXJ0Um93LCByYW5nZS5zdGFydC5yb3cpXG4gICAgaW50ZXJzZWN0aW5nRW5kUm93ID0gTWF0aC5taW4odGlsZVN0YXJ0Um93ICsgQHRpbGVTaXplIC0gMSwgcmFuZ2UuZW5kLnJvdylcbiAgICBpbnRlcnNlY3RpbmdSYW5nZSA9IG5ldyBSYW5nZShcbiAgICAgIG5ldyBQb2ludChpbnRlcnNlY3RpbmdTdGFydFJvdywgMCksXG4gICAgICBuZXcgUG9pbnQoaW50ZXJzZWN0aW5nRW5kUm93LCBJbmZpbml0eSlcbiAgICApXG5cbiAgICBpZiBpbnRlcnNlY3RpbmdTdGFydFJvdyBpcyByYW5nZS5zdGFydC5yb3dcbiAgICAgIGludGVyc2VjdGluZ1JhbmdlLnN0YXJ0LmNvbHVtbiA9IHJhbmdlLnN0YXJ0LmNvbHVtblxuXG4gICAgaWYgaW50ZXJzZWN0aW5nRW5kUm93IGlzIHJhbmdlLmVuZC5yb3dcbiAgICAgIGludGVyc2VjdGluZ1JhbmdlLmVuZC5jb2x1bW4gPSByYW5nZS5lbmQuY29sdW1uXG5cbiAgICBpbnRlcnNlY3RpbmdSYW5nZVxuXG4gIHVwZGF0ZUhpZ2hsaWdodFN0YXRlOiAoZGVjb3JhdGlvbklkLCBwcm9wZXJ0aWVzLCBzY3JlZW5SYW5nZSkgLT5cbiAgICByZXR1cm4gdW5sZXNzIEBzdGFydFJvdz8gYW5kIEBlbmRSb3c/IGFuZCBAbGluZUhlaWdodD8gYW5kIEBoYXNQaXhlbFBvc2l0aW9uUmVxdWlyZW1lbnRzKClcblxuICAgIEBjb25zdHJhaW5SYW5nZVRvVmlzaWJsZVJvd1JhbmdlKHNjcmVlblJhbmdlKVxuXG4gICAgcmV0dXJuIGlmIHNjcmVlblJhbmdlLmlzRW1wdHkoKVxuXG4gICAgc3RhcnRUaWxlID0gQHRpbGVGb3JSb3coc2NyZWVuUmFuZ2Uuc3RhcnQucm93KVxuICAgIGVuZFRpbGUgPSBAdGlsZUZvclJvdyhzY3JlZW5SYW5nZS5lbmQucm93KVxuICAgIG5lZWRzRmxhc2ggPSBwcm9wZXJ0aWVzLmZsYXNoQ291bnQ/IGFuZCBAZmxhc2hDb3VudHNCeURlY29yYXRpb25JZFtkZWNvcmF0aW9uSWRdIGlzbnQgcHJvcGVydGllcy5mbGFzaENvdW50XG4gICAgaWYgbmVlZHNGbGFzaFxuICAgICAgQGZsYXNoQ291bnRzQnlEZWNvcmF0aW9uSWRbZGVjb3JhdGlvbklkXSA9IHByb3BlcnRpZXMuZmxhc2hDb3VudFxuXG4gICAgZm9yIHRpbGVTdGFydFJvdyBpbiBbc3RhcnRUaWxlLi5lbmRUaWxlXSBieSBAdGlsZVNpemVcbiAgICAgIHJhbmdlV2l0aGluVGlsZSA9IEBpbnRlcnNlY3RSYW5nZVdpdGhUaWxlKHNjcmVlblJhbmdlLCB0aWxlU3RhcnRSb3cpXG5cbiAgICAgIGNvbnRpbnVlIGlmIHJhbmdlV2l0aGluVGlsZS5pc0VtcHR5KClcblxuICAgICAgdGlsZVN0YXRlID0gQHN0YXRlLmNvbnRlbnQudGlsZXNbdGlsZVN0YXJ0Um93XSA/PSB7aGlnaGxpZ2h0czoge319XG4gICAgICBoaWdobGlnaHRTdGF0ZSA9IHRpbGVTdGF0ZS5oaWdobGlnaHRzW2RlY29yYXRpb25JZF0gPz0ge31cblxuICAgICAgaGlnaGxpZ2h0U3RhdGUubmVlZHNGbGFzaCA9IG5lZWRzRmxhc2hcbiAgICAgIGhpZ2hsaWdodFN0YXRlLmZsYXNoQ291bnQgPSBwcm9wZXJ0aWVzLmZsYXNoQ291bnRcbiAgICAgIGhpZ2hsaWdodFN0YXRlLmZsYXNoQ2xhc3MgPSBwcm9wZXJ0aWVzLmZsYXNoQ2xhc3NcbiAgICAgIGhpZ2hsaWdodFN0YXRlLmZsYXNoRHVyYXRpb24gPSBwcm9wZXJ0aWVzLmZsYXNoRHVyYXRpb25cbiAgICAgIGhpZ2hsaWdodFN0YXRlLmNsYXNzID0gcHJvcGVydGllcy5jbGFzc1xuICAgICAgaGlnaGxpZ2h0U3RhdGUuZGVwcmVjYXRlZFJlZ2lvbkNsYXNzID0gcHJvcGVydGllcy5kZXByZWNhdGVkUmVnaW9uQ2xhc3NcbiAgICAgIGhpZ2hsaWdodFN0YXRlLnJlZ2lvbnMgPSBAYnVpbGRIaWdobGlnaHRSZWdpb25zKHJhbmdlV2l0aGluVGlsZSlcblxuICAgICAgZm9yIHJlZ2lvbiBpbiBoaWdobGlnaHRTdGF0ZS5yZWdpb25zXG4gICAgICAgIEByZXBvc2l0aW9uUmVnaW9uV2l0aGluVGlsZShyZWdpb24sIHRpbGVTdGFydFJvdylcblxuICAgICAgQHZpc2libGVIaWdobGlnaHRzW3RpbGVTdGFydFJvd10gPz0ge31cbiAgICAgIEB2aXNpYmxlSGlnaGxpZ2h0c1t0aWxlU3RhcnRSb3ddW2RlY29yYXRpb25JZF0gPSB0cnVlXG5cbiAgICB0cnVlXG5cbiAgY29uc3RyYWluUmFuZ2VUb1Zpc2libGVSb3dSYW5nZTogKHNjcmVlblJhbmdlKSAtPlxuICAgIGlmIHNjcmVlblJhbmdlLnN0YXJ0LnJvdyA8IEBzdGFydFJvd1xuICAgICAgc2NyZWVuUmFuZ2Uuc3RhcnQucm93ID0gQHN0YXJ0Um93XG4gICAgICBzY3JlZW5SYW5nZS5zdGFydC5jb2x1bW4gPSAwXG5cbiAgICBpZiBzY3JlZW5SYW5nZS5lbmQucm93IDwgQHN0YXJ0Um93XG4gICAgICBzY3JlZW5SYW5nZS5lbmQucm93ID0gQHN0YXJ0Um93XG4gICAgICBzY3JlZW5SYW5nZS5lbmQuY29sdW1uID0gMFxuXG4gICAgaWYgc2NyZWVuUmFuZ2Uuc3RhcnQucm93ID49IEBlbmRSb3dcbiAgICAgIHNjcmVlblJhbmdlLnN0YXJ0LnJvdyA9IEBlbmRSb3dcbiAgICAgIHNjcmVlblJhbmdlLnN0YXJ0LmNvbHVtbiA9IDBcblxuICAgIGlmIHNjcmVlblJhbmdlLmVuZC5yb3cgPj0gQGVuZFJvd1xuICAgICAgc2NyZWVuUmFuZ2UuZW5kLnJvdyA9IEBlbmRSb3dcbiAgICAgIHNjcmVlblJhbmdlLmVuZC5jb2x1bW4gPSAwXG5cbiAgcmVwb3NpdGlvblJlZ2lvbldpdGhpblRpbGU6IChyZWdpb24sIHRpbGVTdGFydFJvdykgLT5cbiAgICByZWdpb24udG9wICs9IEBzY3JvbGxUb3AgLSBAbGluZVRvcEluZGV4LnBpeGVsUG9zaXRpb25CZWZvcmVCbG9ja3NGb3JSb3codGlsZVN0YXJ0Um93KVxuXG4gIGJ1aWxkSGlnaGxpZ2h0UmVnaW9uczogKHNjcmVlblJhbmdlKSAtPlxuICAgIGxpbmVIZWlnaHRJblBpeGVscyA9IEBsaW5lSGVpZ2h0XG4gICAgc3RhcnRQaXhlbFBvc2l0aW9uID0gQHBpeGVsUG9zaXRpb25Gb3JTY3JlZW5Qb3NpdGlvbihzY3JlZW5SYW5nZS5zdGFydClcbiAgICBlbmRQaXhlbFBvc2l0aW9uID0gQHBpeGVsUG9zaXRpb25Gb3JTY3JlZW5Qb3NpdGlvbihzY3JlZW5SYW5nZS5lbmQpXG4gICAgc3RhcnRQaXhlbFBvc2l0aW9uLmxlZnQgKz0gQHNjcm9sbExlZnRcbiAgICBlbmRQaXhlbFBvc2l0aW9uLmxlZnQgKz0gQHNjcm9sbExlZnRcbiAgICBzcGFubmVkUm93cyA9IHNjcmVlblJhbmdlLmVuZC5yb3cgLSBzY3JlZW5SYW5nZS5zdGFydC5yb3cgKyAxXG5cbiAgICByZWdpb25zID0gW11cblxuICAgIGlmIHNwYW5uZWRSb3dzIGlzIDFcbiAgICAgIHJlZ2lvbiA9XG4gICAgICAgIHRvcDogc3RhcnRQaXhlbFBvc2l0aW9uLnRvcFxuICAgICAgICBoZWlnaHQ6IGxpbmVIZWlnaHRJblBpeGVsc1xuICAgICAgICBsZWZ0OiBzdGFydFBpeGVsUG9zaXRpb24ubGVmdFxuXG4gICAgICBpZiBzY3JlZW5SYW5nZS5lbmQuY29sdW1uIGlzIEluZmluaXR5XG4gICAgICAgIHJlZ2lvbi5yaWdodCA9IDBcbiAgICAgIGVsc2VcbiAgICAgICAgcmVnaW9uLndpZHRoID0gZW5kUGl4ZWxQb3NpdGlvbi5sZWZ0IC0gc3RhcnRQaXhlbFBvc2l0aW9uLmxlZnRcblxuICAgICAgcmVnaW9ucy5wdXNoKHJlZ2lvbilcbiAgICBlbHNlXG4gICAgICAjIEZpcnN0IHJvdywgZXh0ZW5kaW5nIGZyb20gc2VsZWN0aW9uIHN0YXJ0IHRvIHRoZSByaWdodCBzaWRlIG9mIHNjcmVlblxuICAgICAgcmVnaW9ucy5wdXNoKFxuICAgICAgICB0b3A6IHN0YXJ0UGl4ZWxQb3NpdGlvbi50b3BcbiAgICAgICAgbGVmdDogc3RhcnRQaXhlbFBvc2l0aW9uLmxlZnRcbiAgICAgICAgaGVpZ2h0OiBsaW5lSGVpZ2h0SW5QaXhlbHNcbiAgICAgICAgcmlnaHQ6IDBcbiAgICAgIClcblxuICAgICAgIyBNaWRkbGUgcm93cywgZXh0ZW5kaW5nIGZyb20gbGVmdCBzaWRlIHRvIHJpZ2h0IHNpZGUgb2Ygc2NyZWVuXG4gICAgICBpZiBzcGFubmVkUm93cyA+IDJcbiAgICAgICAgcmVnaW9ucy5wdXNoKFxuICAgICAgICAgIHRvcDogc3RhcnRQaXhlbFBvc2l0aW9uLnRvcCArIGxpbmVIZWlnaHRJblBpeGVsc1xuICAgICAgICAgIGhlaWdodDogZW5kUGl4ZWxQb3NpdGlvbi50b3AgLSBzdGFydFBpeGVsUG9zaXRpb24udG9wIC0gbGluZUhlaWdodEluUGl4ZWxzXG4gICAgICAgICAgbGVmdDogMFxuICAgICAgICAgIHJpZ2h0OiAwXG4gICAgICAgIClcblxuICAgICAgIyBMYXN0IHJvdywgZXh0ZW5kaW5nIGZyb20gbGVmdCBzaWRlIG9mIHNjcmVlbiB0byBzZWxlY3Rpb24gZW5kXG4gICAgICBpZiBzY3JlZW5SYW5nZS5lbmQuY29sdW1uID4gMFxuICAgICAgICByZWdpb24gPVxuICAgICAgICAgIHRvcDogZW5kUGl4ZWxQb3NpdGlvbi50b3BcbiAgICAgICAgICBoZWlnaHQ6IGxpbmVIZWlnaHRJblBpeGVsc1xuICAgICAgICAgIGxlZnQ6IDBcblxuICAgICAgICBpZiBzY3JlZW5SYW5nZS5lbmQuY29sdW1uIGlzIEluZmluaXR5XG4gICAgICAgICAgcmVnaW9uLnJpZ2h0ID0gMFxuICAgICAgICBlbHNlXG4gICAgICAgICAgcmVnaW9uLndpZHRoID0gZW5kUGl4ZWxQb3NpdGlvbi5sZWZ0XG5cbiAgICAgICAgcmVnaW9ucy5wdXNoKHJlZ2lvbilcblxuICAgIHJlZ2lvbnNcblxuICBzZXRPdmVybGF5RGltZW5zaW9uczogKGRlY29yYXRpb25JZCwgaXRlbVdpZHRoLCBpdGVtSGVpZ2h0LCBjb250ZW50TWFyZ2luKSAtPlxuICAgIEBvdmVybGF5RGltZW5zaW9uc1tkZWNvcmF0aW9uSWRdID89IHt9XG4gICAgb3ZlcmxheVN0YXRlID0gQG92ZXJsYXlEaW1lbnNpb25zW2RlY29yYXRpb25JZF1cbiAgICBkaW1lbnNpb25zQXJlRXF1YWwgPSBvdmVybGF5U3RhdGUuaXRlbVdpZHRoIGlzIGl0ZW1XaWR0aCBhbmRcbiAgICAgIG92ZXJsYXlTdGF0ZS5pdGVtSGVpZ2h0IGlzIGl0ZW1IZWlnaHQgYW5kXG4gICAgICBvdmVybGF5U3RhdGUuY29udGVudE1hcmdpbiBpcyBjb250ZW50TWFyZ2luXG4gICAgdW5sZXNzIGRpbWVuc2lvbnNBcmVFcXVhbFxuICAgICAgb3ZlcmxheVN0YXRlLml0ZW1XaWR0aCA9IGl0ZW1XaWR0aFxuICAgICAgb3ZlcmxheVN0YXRlLml0ZW1IZWlnaHQgPSBpdGVtSGVpZ2h0XG4gICAgICBvdmVybGF5U3RhdGUuY29udGVudE1hcmdpbiA9IGNvbnRlbnRNYXJnaW5cblxuICAgICAgQGVtaXREaWRVcGRhdGVTdGF0ZSgpXG5cbiAgc2V0QmxvY2tEZWNvcmF0aW9uRGltZW5zaW9uczogKGRlY29yYXRpb24sIHdpZHRoLCBoZWlnaHQpIC0+XG4gICAgcmV0dXJuIHVubGVzcyBAb2JzZXJ2ZWRCbG9ja0RlY29yYXRpb25zLmhhcyhkZWNvcmF0aW9uKVxuXG4gICAgQGxpbmVUb3BJbmRleC5yZXNpemVCbG9jayhkZWNvcmF0aW9uLmlkLCBoZWlnaHQpXG5cbiAgICBAaW52YWxpZGF0ZWREaW1lbnNpb25zQnlCbG9ja0RlY29yYXRpb24uZGVsZXRlKGRlY29yYXRpb24pXG4gICAgQHNob3VsZFVwZGF0ZURlY29yYXRpb25zID0gdHJ1ZVxuICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIGludmFsaWRhdGVCbG9ja0RlY29yYXRpb25EaW1lbnNpb25zOiAoZGVjb3JhdGlvbikgLT5cbiAgICBAaW52YWxpZGF0ZWREaW1lbnNpb25zQnlCbG9ja0RlY29yYXRpb24uYWRkKGRlY29yYXRpb24pXG4gICAgQHNob3VsZFVwZGF0ZURlY29yYXRpb25zID0gdHJ1ZVxuICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIHNwbGljZUJsb2NrRGVjb3JhdGlvbnNJblJhbmdlOiAoc3RhcnQsIGVuZCwgc2NyZWVuRGVsdGEpIC0+XG4gICAgcmV0dXJuIGlmIHNjcmVlbkRlbHRhIGlzIDBcblxuICAgIG9sZEV4dGVudCA9IGVuZCAtIHN0YXJ0XG4gICAgbmV3RXh0ZW50ID0gZW5kIC0gc3RhcnQgKyBzY3JlZW5EZWx0YVxuICAgIGludmFsaWRhdGVkQmxvY2tEZWNvcmF0aW9uSWRzID0gQGxpbmVUb3BJbmRleC5zcGxpY2Uoc3RhcnQsIG9sZEV4dGVudCwgbmV3RXh0ZW50KVxuICAgIGludmFsaWRhdGVkQmxvY2tEZWNvcmF0aW9uSWRzLmZvckVhY2ggKGlkKSA9PlxuICAgICAgZGVjb3JhdGlvbiA9IEBtb2RlbC5kZWNvcmF0aW9uRm9ySWQoaWQpXG4gICAgICBuZXdTY3JlZW5Qb3NpdGlvbiA9IGRlY29yYXRpb24uZ2V0TWFya2VyKCkuZ2V0SGVhZFNjcmVlblBvc2l0aW9uKClcbiAgICAgIEBsaW5lVG9wSW5kZXgubW92ZUJsb2NrKGlkLCBuZXdTY3JlZW5Qb3NpdGlvbi5yb3cpXG4gICAgICBAaW52YWxpZGF0ZWREaW1lbnNpb25zQnlCbG9ja0RlY29yYXRpb24uYWRkKGRlY29yYXRpb24pXG5cbiAgZGlkQWRkQmxvY2tEZWNvcmF0aW9uOiAoZGVjb3JhdGlvbikgLT5cbiAgICByZXR1cm4gaWYgbm90IGRlY29yYXRpb24uaXNUeXBlKCdibG9jaycpIG9yIEBvYnNlcnZlZEJsb2NrRGVjb3JhdGlvbnMuaGFzKGRlY29yYXRpb24pXG5cbiAgICBkaWRNb3ZlRGlzcG9zYWJsZSA9IGRlY29yYXRpb24uZ2V0TWFya2VyKCkuYnVmZmVyTWFya2VyLm9uRGlkQ2hhbmdlIChtYXJrZXJFdmVudCkgPT5cbiAgICAgIEBkaWRNb3ZlQmxvY2tEZWNvcmF0aW9uKGRlY29yYXRpb24sIG1hcmtlckV2ZW50KVxuXG4gICAgZGlkRGVzdHJveURpc3Bvc2FibGUgPSBkZWNvcmF0aW9uLm9uRGlkRGVzdHJveSA9PlxuICAgICAgQGRpc3Bvc2FibGVzLnJlbW92ZShkaWRNb3ZlRGlzcG9zYWJsZSlcbiAgICAgIEBkaXNwb3NhYmxlcy5yZW1vdmUoZGlkRGVzdHJveURpc3Bvc2FibGUpXG4gICAgICBkaWRNb3ZlRGlzcG9zYWJsZS5kaXNwb3NlKClcbiAgICAgIGRpZERlc3Ryb3lEaXNwb3NhYmxlLmRpc3Bvc2UoKVxuICAgICAgQGRpZERlc3Ryb3lCbG9ja0RlY29yYXRpb24oZGVjb3JhdGlvbilcblxuICAgIGlzQWZ0ZXIgPSBkZWNvcmF0aW9uLmdldFByb3BlcnRpZXMoKS5wb3NpdGlvbiBpcyBcImFmdGVyXCJcbiAgICBAbGluZVRvcEluZGV4Lmluc2VydEJsb2NrKGRlY29yYXRpb24uaWQsIGRlY29yYXRpb24uZ2V0TWFya2VyKCkuZ2V0SGVhZFNjcmVlblBvc2l0aW9uKCkucm93LCAwLCBpc0FmdGVyKVxuXG4gICAgQG9ic2VydmVkQmxvY2tEZWNvcmF0aW9ucy5hZGQoZGVjb3JhdGlvbilcbiAgICBAaW52YWxpZGF0ZUJsb2NrRGVjb3JhdGlvbkRpbWVuc2lvbnMoZGVjb3JhdGlvbilcbiAgICBAZGlzcG9zYWJsZXMuYWRkKGRpZE1vdmVEaXNwb3NhYmxlKVxuICAgIEBkaXNwb3NhYmxlcy5hZGQoZGlkRGVzdHJveURpc3Bvc2FibGUpXG4gICAgQHNob3VsZFVwZGF0ZURlY29yYXRpb25zID0gdHJ1ZVxuICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIGRpZE1vdmVCbG9ja0RlY29yYXRpb246IChkZWNvcmF0aW9uLCBtYXJrZXJFdmVudCkgLT5cbiAgICAjIERvbid0IG1vdmUgYmxvY2tzIGFmdGVyIGEgdGV4dCBjaGFuZ2UsIGJlY2F1c2Ugd2UgYWxyZWFkeSBzcGxpY2Ugb24gYnVmZmVyXG4gICAgIyBjaGFuZ2UuXG4gICAgcmV0dXJuIGlmIG1hcmtlckV2ZW50LnRleHRDaGFuZ2VkXG5cbiAgICBAbGluZVRvcEluZGV4Lm1vdmVCbG9jayhkZWNvcmF0aW9uLmlkLCBkZWNvcmF0aW9uLmdldE1hcmtlcigpLmdldEhlYWRTY3JlZW5Qb3NpdGlvbigpLnJvdylcbiAgICBAc2hvdWxkVXBkYXRlRGVjb3JhdGlvbnMgPSB0cnVlXG4gICAgQGVtaXREaWRVcGRhdGVTdGF0ZSgpXG5cbiAgZGlkRGVzdHJveUJsb2NrRGVjb3JhdGlvbjogKGRlY29yYXRpb24pIC0+XG4gICAgcmV0dXJuIHVubGVzcyBAb2JzZXJ2ZWRCbG9ja0RlY29yYXRpb25zLmhhcyhkZWNvcmF0aW9uKVxuXG4gICAgQGxpbmVUb3BJbmRleC5yZW1vdmVCbG9jayhkZWNvcmF0aW9uLmlkKVxuICAgIEBvYnNlcnZlZEJsb2NrRGVjb3JhdGlvbnMuZGVsZXRlKGRlY29yYXRpb24pXG4gICAgQGludmFsaWRhdGVkRGltZW5zaW9uc0J5QmxvY2tEZWNvcmF0aW9uLmRlbGV0ZShkZWNvcmF0aW9uKVxuICAgIEBzaG91bGRVcGRhdGVEZWNvcmF0aW9ucyA9IHRydWVcbiAgICBAZW1pdERpZFVwZGF0ZVN0YXRlKClcblxuICBvYnNlcnZlQ3Vyc29yOiAoY3Vyc29yKSAtPlxuICAgIGRpZENoYW5nZVBvc2l0aW9uRGlzcG9zYWJsZSA9IGN1cnNvci5vbkRpZENoYW5nZVBvc2l0aW9uID0+XG4gICAgICBAcGF1c2VDdXJzb3JCbGlua2luZygpXG5cbiAgICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gICAgZGlkQ2hhbmdlVmlzaWJpbGl0eURpc3Bvc2FibGUgPSBjdXJzb3Iub25EaWRDaGFuZ2VWaXNpYmlsaXR5ID0+XG5cbiAgICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gICAgZGlkRGVzdHJveURpc3Bvc2FibGUgPSBjdXJzb3Iub25EaWREZXN0cm95ID0+XG4gICAgICBAZGlzcG9zYWJsZXMucmVtb3ZlKGRpZENoYW5nZVBvc2l0aW9uRGlzcG9zYWJsZSlcbiAgICAgIEBkaXNwb3NhYmxlcy5yZW1vdmUoZGlkQ2hhbmdlVmlzaWJpbGl0eURpc3Bvc2FibGUpXG4gICAgICBAZGlzcG9zYWJsZXMucmVtb3ZlKGRpZERlc3Ryb3lEaXNwb3NhYmxlKVxuXG4gICAgICBAZW1pdERpZFVwZGF0ZVN0YXRlKClcblxuICAgIEBkaXNwb3NhYmxlcy5hZGQoZGlkQ2hhbmdlUG9zaXRpb25EaXNwb3NhYmxlKVxuICAgIEBkaXNwb3NhYmxlcy5hZGQoZGlkQ2hhbmdlVmlzaWJpbGl0eURpc3Bvc2FibGUpXG4gICAgQGRpc3Bvc2FibGVzLmFkZChkaWREZXN0cm95RGlzcG9zYWJsZSlcblxuICBkaWRBZGRDdXJzb3I6IChjdXJzb3IpIC0+XG4gICAgQG9ic2VydmVDdXJzb3IoY3Vyc29yKVxuICAgIEBwYXVzZUN1cnNvckJsaW5raW5nKClcblxuICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIHN0YXJ0QmxpbmtpbmdDdXJzb3JzOiAtPlxuICAgIHVubGVzcyBAaXNDdXJzb3JCbGlua2luZygpXG4gICAgICBAc3RhdGUuY29udGVudC5jdXJzb3JzVmlzaWJsZSA9IHRydWVcbiAgICAgIEB0b2dnbGVDdXJzb3JCbGlua0hhbmRsZSA9IHNldEludGVydmFsKEB0b2dnbGVDdXJzb3JCbGluay5iaW5kKHRoaXMpLCBAZ2V0Q3Vyc29yQmxpbmtQZXJpb2QoKSAvIDIpXG5cbiAgaXNDdXJzb3JCbGlua2luZzogLT5cbiAgICBAdG9nZ2xlQ3Vyc29yQmxpbmtIYW5kbGU/XG5cbiAgc3RvcEJsaW5raW5nQ3Vyc29yczogKHZpc2libGUpIC0+XG4gICAgaWYgQGlzQ3Vyc29yQmxpbmtpbmcoKVxuICAgICAgQHN0YXRlLmNvbnRlbnQuY3Vyc29yc1Zpc2libGUgPSB2aXNpYmxlXG4gICAgICBjbGVhckludGVydmFsKEB0b2dnbGVDdXJzb3JCbGlua0hhbmRsZSlcbiAgICAgIEB0b2dnbGVDdXJzb3JCbGlua0hhbmRsZSA9IG51bGxcblxuICB0b2dnbGVDdXJzb3JCbGluazogLT5cbiAgICBAc3RhdGUuY29udGVudC5jdXJzb3JzVmlzaWJsZSA9IG5vdCBAc3RhdGUuY29udGVudC5jdXJzb3JzVmlzaWJsZVxuICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIHBhdXNlQ3Vyc29yQmxpbmtpbmc6IC0+XG4gICAgQHN0b3BCbGlua2luZ0N1cnNvcnModHJ1ZSlcbiAgICBAc3RhcnRCbGlua2luZ0N1cnNvcnNBZnRlckRlbGF5ID89IF8uZGVib3VuY2UoQHN0YXJ0QmxpbmtpbmdDdXJzb3JzLCBAZ2V0Q3Vyc29yQmxpbmtSZXN1bWVEZWxheSgpKVxuICAgIEBzdGFydEJsaW5raW5nQ3Vyc29yc0FmdGVyRGVsYXkoKVxuICAgIEBlbWl0RGlkVXBkYXRlU3RhdGUoKVxuXG4gIHJlcXVlc3RBdXRvc2Nyb2xsOiAocG9zaXRpb24pIC0+XG4gICAgQHBlbmRpbmdTY3JvbGxMb2dpY2FsUG9zaXRpb24gPSBwb3NpdGlvblxuICAgIEBwZW5kaW5nU2Nyb2xsVG9wID0gbnVsbFxuICAgIEBwZW5kaW5nU2Nyb2xsTGVmdCA9IG51bGxcbiAgICBAc2hvdWxkVXBkYXRlRGVjb3JhdGlvbnMgPSB0cnVlXG4gICAgQGVtaXREaWRVcGRhdGVTdGF0ZSgpXG5cbiAgZGlkQ2hhbmdlRmlyc3RWaXNpYmxlU2NyZWVuUm93OiAoc2NyZWVuUm93KSAtPlxuICAgIEBzZXRTY3JvbGxUb3AoQGxpbmVUb3BJbmRleC5waXhlbFBvc2l0aW9uQWZ0ZXJCbG9ja3NGb3JSb3coc2NyZWVuUm93KSlcblxuICBnZXRWZXJ0aWNhbFNjcm9sbE1hcmdpbkluUGl4ZWxzOiAtPlxuICAgIE1hdGgucm91bmQoQG1vZGVsLmdldFZlcnRpY2FsU2Nyb2xsTWFyZ2luKCkgKiBAbGluZUhlaWdodClcblxuICBnZXRIb3Jpem9udGFsU2Nyb2xsTWFyZ2luSW5QaXhlbHM6IC0+XG4gICAgTWF0aC5yb3VuZChAbW9kZWwuZ2V0SG9yaXpvbnRhbFNjcm9sbE1hcmdpbigpICogQGJhc2VDaGFyYWN0ZXJXaWR0aClcblxuICBnZXRWZXJ0aWNhbFNjcm9sbGJhcldpZHRoOiAtPlxuICAgIEB2ZXJ0aWNhbFNjcm9sbGJhcldpZHRoXG5cbiAgZ2V0SG9yaXpvbnRhbFNjcm9sbGJhckhlaWdodDogLT5cbiAgICBAaG9yaXpvbnRhbFNjcm9sbGJhckhlaWdodFxuXG4gIGNvbW1pdFBlbmRpbmdMb2dpY2FsU2Nyb2xsVG9wUG9zaXRpb246IC0+XG4gICAgcmV0dXJuIHVubGVzcyBAcGVuZGluZ1Njcm9sbExvZ2ljYWxQb3NpdGlvbj9cblxuICAgIHtzY3JlZW5SYW5nZSwgb3B0aW9uc30gPSBAcGVuZGluZ1Njcm9sbExvZ2ljYWxQb3NpdGlvblxuXG4gICAgdmVydGljYWxTY3JvbGxNYXJnaW5JblBpeGVscyA9IEBnZXRWZXJ0aWNhbFNjcm9sbE1hcmdpbkluUGl4ZWxzKClcblxuICAgIHRvcCA9IEBsaW5lVG9wSW5kZXgucGl4ZWxQb3NpdGlvbkFmdGVyQmxvY2tzRm9yUm93KHNjcmVlblJhbmdlLnN0YXJ0LnJvdylcbiAgICBib3R0b20gPSBAbGluZVRvcEluZGV4LnBpeGVsUG9zaXRpb25BZnRlckJsb2Nrc0ZvclJvdyhzY3JlZW5SYW5nZS5lbmQucm93KSArIEBsaW5lSGVpZ2h0XG5cbiAgICBpZiBvcHRpb25zPy5jZW50ZXJcbiAgICAgIGRlc2lyZWRTY3JvbGxDZW50ZXIgPSAodG9wICsgYm90dG9tKSAvIDJcbiAgICAgIHVubGVzcyBAZ2V0U2Nyb2xsVG9wKCkgPCBkZXNpcmVkU2Nyb2xsQ2VudGVyIDwgQGdldFNjcm9sbEJvdHRvbSgpXG4gICAgICAgIGRlc2lyZWRTY3JvbGxUb3AgPSBkZXNpcmVkU2Nyb2xsQ2VudGVyIC0gQGdldENsaWVudEhlaWdodCgpIC8gMlxuICAgICAgICBkZXNpcmVkU2Nyb2xsQm90dG9tID0gZGVzaXJlZFNjcm9sbENlbnRlciArIEBnZXRDbGllbnRIZWlnaHQoKSAvIDJcbiAgICBlbHNlXG4gICAgICBkZXNpcmVkU2Nyb2xsVG9wID0gdG9wIC0gdmVydGljYWxTY3JvbGxNYXJnaW5JblBpeGVsc1xuICAgICAgZGVzaXJlZFNjcm9sbEJvdHRvbSA9IGJvdHRvbSArIHZlcnRpY2FsU2Nyb2xsTWFyZ2luSW5QaXhlbHNcblxuICAgIGlmIG9wdGlvbnM/LnJldmVyc2VkID8gdHJ1ZVxuICAgICAgaWYgZGVzaXJlZFNjcm9sbEJvdHRvbSA+IEBnZXRTY3JvbGxCb3R0b20oKVxuICAgICAgICBAdXBkYXRlU2Nyb2xsVG9wKGRlc2lyZWRTY3JvbGxCb3R0b20gLSBAZ2V0Q2xpZW50SGVpZ2h0KCkpXG4gICAgICBpZiBkZXNpcmVkU2Nyb2xsVG9wIDwgQGdldFNjcm9sbFRvcCgpXG4gICAgICAgIEB1cGRhdGVTY3JvbGxUb3AoZGVzaXJlZFNjcm9sbFRvcClcbiAgICBlbHNlXG4gICAgICBpZiBkZXNpcmVkU2Nyb2xsVG9wIDwgQGdldFNjcm9sbFRvcCgpXG4gICAgICAgIEB1cGRhdGVTY3JvbGxUb3AoZGVzaXJlZFNjcm9sbFRvcClcbiAgICAgIGlmIGRlc2lyZWRTY3JvbGxCb3R0b20gPiBAZ2V0U2Nyb2xsQm90dG9tKClcbiAgICAgICAgQHVwZGF0ZVNjcm9sbFRvcChkZXNpcmVkU2Nyb2xsQm90dG9tIC0gQGdldENsaWVudEhlaWdodCgpKVxuXG4gIGNvbW1pdFBlbmRpbmdMb2dpY2FsU2Nyb2xsTGVmdFBvc2l0aW9uOiAtPlxuICAgIHJldHVybiB1bmxlc3MgQHBlbmRpbmdTY3JvbGxMb2dpY2FsUG9zaXRpb24/XG5cbiAgICB7c2NyZWVuUmFuZ2UsIG9wdGlvbnN9ID0gQHBlbmRpbmdTY3JvbGxMb2dpY2FsUG9zaXRpb25cblxuICAgIGhvcml6b250YWxTY3JvbGxNYXJnaW5JblBpeGVscyA9IEBnZXRIb3Jpem9udGFsU2Nyb2xsTWFyZ2luSW5QaXhlbHMoKVxuXG4gICAge2xlZnR9ID0gQHBpeGVsUmVjdEZvclNjcmVlblJhbmdlKG5ldyBSYW5nZShzY3JlZW5SYW5nZS5zdGFydCwgc2NyZWVuUmFuZ2Uuc3RhcnQpKVxuICAgIHtsZWZ0OiByaWdodH0gPSBAcGl4ZWxSZWN0Rm9yU2NyZWVuUmFuZ2UobmV3IFJhbmdlKHNjcmVlblJhbmdlLmVuZCwgc2NyZWVuUmFuZ2UuZW5kKSlcblxuICAgIGxlZnQgKz0gQHNjcm9sbExlZnRcbiAgICByaWdodCArPSBAc2Nyb2xsTGVmdFxuXG4gICAgZGVzaXJlZFNjcm9sbExlZnQgPSBsZWZ0IC0gaG9yaXpvbnRhbFNjcm9sbE1hcmdpbkluUGl4ZWxzXG4gICAgZGVzaXJlZFNjcm9sbFJpZ2h0ID0gcmlnaHQgKyBob3Jpem9udGFsU2Nyb2xsTWFyZ2luSW5QaXhlbHNcblxuICAgIGlmIG9wdGlvbnM/LnJldmVyc2VkID8gdHJ1ZVxuICAgICAgaWYgZGVzaXJlZFNjcm9sbFJpZ2h0ID4gQGdldFNjcm9sbFJpZ2h0KClcbiAgICAgICAgQHVwZGF0ZVNjcm9sbExlZnQoZGVzaXJlZFNjcm9sbFJpZ2h0IC0gQGdldENsaWVudFdpZHRoKCkpXG4gICAgICBpZiBkZXNpcmVkU2Nyb2xsTGVmdCA8IEBnZXRTY3JvbGxMZWZ0KClcbiAgICAgICAgQHVwZGF0ZVNjcm9sbExlZnQoZGVzaXJlZFNjcm9sbExlZnQpXG4gICAgZWxzZVxuICAgICAgaWYgZGVzaXJlZFNjcm9sbExlZnQgPCBAZ2V0U2Nyb2xsTGVmdCgpXG4gICAgICAgIEB1cGRhdGVTY3JvbGxMZWZ0KGRlc2lyZWRTY3JvbGxMZWZ0KVxuICAgICAgaWYgZGVzaXJlZFNjcm9sbFJpZ2h0ID4gQGdldFNjcm9sbFJpZ2h0KClcbiAgICAgICAgQHVwZGF0ZVNjcm9sbExlZnQoZGVzaXJlZFNjcm9sbFJpZ2h0IC0gQGdldENsaWVudFdpZHRoKCkpXG5cbiAgY29tbWl0UGVuZGluZ1Njcm9sbExlZnRQb3NpdGlvbjogLT5cbiAgICBpZiBAcGVuZGluZ1Njcm9sbExlZnQ/XG4gICAgICBAdXBkYXRlU2Nyb2xsTGVmdChAcGVuZGluZ1Njcm9sbExlZnQpXG4gICAgICBAcGVuZGluZ1Njcm9sbExlZnQgPSBudWxsXG5cbiAgY29tbWl0UGVuZGluZ1Njcm9sbFRvcFBvc2l0aW9uOiAtPlxuICAgIGlmIEBwZW5kaW5nU2Nyb2xsVG9wP1xuICAgICAgQHVwZGF0ZVNjcm9sbFRvcChAcGVuZGluZ1Njcm9sbFRvcClcbiAgICAgIEBwZW5kaW5nU2Nyb2xsVG9wID0gbnVsbFxuXG4gIGNsZWFyUGVuZGluZ1Njcm9sbFBvc2l0aW9uOiAtPlxuICAgIEBwZW5kaW5nU2Nyb2xsTG9naWNhbFBvc2l0aW9uID0gbnVsbFxuICAgIEBwZW5kaW5nU2Nyb2xsVG9wID0gbnVsbFxuICAgIEBwZW5kaW5nU2Nyb2xsTGVmdCA9IG51bGxcblxuICBjYW5TY3JvbGxMZWZ0VG86IChzY3JvbGxMZWZ0KSAtPlxuICAgIEBzY3JvbGxMZWZ0IGlzbnQgQGNvbnN0cmFpblNjcm9sbExlZnQoc2Nyb2xsTGVmdClcblxuICBjYW5TY3JvbGxUb3BUbzogKHNjcm9sbFRvcCkgLT5cbiAgICBAc2Nyb2xsVG9wIGlzbnQgQGNvbnN0cmFpblNjcm9sbFRvcChzY3JvbGxUb3ApXG5cbiAgcmVzdG9yZVNjcm9sbFRvcElmTmVlZGVkOiAtPlxuICAgIHVubGVzcyBAc2Nyb2xsVG9wP1xuICAgICAgQHVwZGF0ZVNjcm9sbFRvcChAbGluZVRvcEluZGV4LnBpeGVsUG9zaXRpb25BZnRlckJsb2Nrc0ZvclJvdyhAbW9kZWwuZ2V0Rmlyc3RWaXNpYmxlU2NyZWVuUm93KCkpKVxuXG4gIHJlc3RvcmVTY3JvbGxMZWZ0SWZOZWVkZWQ6IC0+XG4gICAgdW5sZXNzIEBzY3JvbGxMZWZ0P1xuICAgICAgQHVwZGF0ZVNjcm9sbExlZnQoQG1vZGVsLmdldEZpcnN0VmlzaWJsZVNjcmVlbkNvbHVtbigpICogQGJhc2VDaGFyYWN0ZXJXaWR0aClcblxuICBvbkRpZENoYW5nZVNjcm9sbFRvcDogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLXNjcm9sbC10b3AnLCBjYWxsYmFja1xuXG4gIG9uRGlkQ2hhbmdlU2Nyb2xsTGVmdDogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLXNjcm9sbC1sZWZ0JywgY2FsbGJhY2tcblxuICBnZXRWaXNpYmxlUm93UmFuZ2U6IC0+XG4gICAgW0BzdGFydFJvdywgQGVuZFJvd11cblxuICBpc1Jvd1JlbmRlcmVkOiAocm93KSAtPlxuICAgIEBnZXRTdGFydFRpbGVSb3coKSA8PSByb3cgPCBAZ2V0RW5kVGlsZVJvdygpICsgQHRpbGVTaXplXG5cbiAgaXNPcGVuVGFnQ29kZTogKHRhZ0NvZGUpIC0+XG4gICAgQGRpc3BsYXlMYXllci5pc09wZW5UYWdDb2RlKHRhZ0NvZGUpXG5cbiAgaXNDbG9zZVRhZ0NvZGU6ICh0YWdDb2RlKSAtPlxuICAgIEBkaXNwbGF5TGF5ZXIuaXNDbG9zZVRhZ0NvZGUodGFnQ29kZSlcblxuICB0YWdGb3JDb2RlOiAodGFnQ29kZSkgLT5cbiAgICBAZGlzcGxheUxheWVyLnRhZ0ZvckNvZGUodGFnQ29kZSlcbiJdfQ==
