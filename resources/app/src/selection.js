(function() {
  var Emitter, Model, NonWhitespaceRegExp, Point, Range, Selection, pick, ref,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  ref = require('text-buffer'), Point = ref.Point, Range = ref.Range;

  pick = require('underscore-plus').pick;

  Emitter = require('event-kit').Emitter;

  Model = require('./model');

  NonWhitespaceRegExp = /\S/;

  module.exports = Selection = (function(superClass) {
    extend(Selection, superClass);

    Selection.prototype.cursor = null;

    Selection.prototype.marker = null;

    Selection.prototype.editor = null;

    Selection.prototype.initialScreenRange = null;

    Selection.prototype.wordwise = false;

    function Selection(arg) {
      var id;
      this.cursor = arg.cursor, this.marker = arg.marker, this.editor = arg.editor, id = arg.id;
      this.emitter = new Emitter;
      this.assignId(id);
      this.cursor.selection = this;
      this.decoration = this.editor.decorateMarker(this.marker, {
        type: 'highlight',
        "class": 'selection'
      });
      this.marker.onDidChange((function(_this) {
        return function(e) {
          return _this.markerDidChange(e);
        };
      })(this));
      this.marker.onDidDestroy((function(_this) {
        return function() {
          return _this.markerDidDestroy();
        };
      })(this));
    }

    Selection.prototype.destroy = function() {
      return this.marker.destroy();
    };

    Selection.prototype.isLastSelection = function() {
      return this === this.editor.getLastSelection();
    };


    /*
    Section: Event Subscription
     */

    Selection.prototype.onDidChangeRange = function(callback) {
      return this.emitter.on('did-change-range', callback);
    };

    Selection.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };


    /*
    Section: Managing the selection range
     */

    Selection.prototype.getScreenRange = function() {
      return this.marker.getScreenRange();
    };

    Selection.prototype.setScreenRange = function(screenRange, options) {
      return this.setBufferRange(this.editor.bufferRangeForScreenRange(screenRange), options);
    };

    Selection.prototype.getBufferRange = function() {
      return this.marker.getBufferRange();
    };

    Selection.prototype.setBufferRange = function(bufferRange, options) {
      if (options == null) {
        options = {};
      }
      bufferRange = Range.fromObject(bufferRange);
      if (options.reversed == null) {
        options.reversed = this.isReversed();
      }
      if (!options.preserveFolds) {
        this.editor.destroyFoldsIntersectingBufferRange(bufferRange);
      }
      return this.modifySelection((function(_this) {
        return function() {
          var needsFlash, ref1;
          needsFlash = options.flash;
          if (options.flash != null) {
            delete options.flash;
          }
          _this.marker.setBufferRange(bufferRange, options);
          if ((ref1 = options != null ? options.autoscroll : void 0) != null ? ref1 : _this.isLastSelection()) {
            _this.autoscroll();
          }
          if (needsFlash) {
            return _this.decoration.flash('flash', _this.editor.selectionFlashDuration);
          }
        };
      })(this));
    };

    Selection.prototype.getBufferRowRange = function() {
      var end, range, start;
      range = this.getBufferRange();
      start = range.start.row;
      end = range.end.row;
      if (range.end.column === 0) {
        end = Math.max(start, end - 1);
      }
      return [start, end];
    };

    Selection.prototype.getTailScreenPosition = function() {
      return this.marker.getTailScreenPosition();
    };

    Selection.prototype.getTailBufferPosition = function() {
      return this.marker.getTailBufferPosition();
    };

    Selection.prototype.getHeadScreenPosition = function() {
      return this.marker.getHeadScreenPosition();
    };

    Selection.prototype.getHeadBufferPosition = function() {
      return this.marker.getHeadBufferPosition();
    };


    /*
    Section: Info about the selection
     */

    Selection.prototype.isEmpty = function() {
      return this.getBufferRange().isEmpty();
    };

    Selection.prototype.isReversed = function() {
      return this.marker.isReversed();
    };

    Selection.prototype.isSingleScreenLine = function() {
      return this.getScreenRange().isSingleLine();
    };

    Selection.prototype.getText = function() {
      return this.editor.buffer.getTextInRange(this.getBufferRange());
    };

    Selection.prototype.intersectsBufferRange = function(bufferRange) {
      return this.getBufferRange().intersectsWith(bufferRange);
    };

    Selection.prototype.intersectsScreenRowRange = function(startRow, endRow) {
      return this.getScreenRange().intersectsRowRange(startRow, endRow);
    };

    Selection.prototype.intersectsScreenRow = function(screenRow) {
      return this.getScreenRange().intersectsRow(screenRow);
    };

    Selection.prototype.intersectsWith = function(otherSelection, exclusive) {
      return this.getBufferRange().intersectsWith(otherSelection.getBufferRange(), exclusive);
    };


    /*
    Section: Modifying the selected range
     */

    Selection.prototype.clear = function(options) {
      var ref1;
      this.goalScreenRange = null;
      if (!this.retainSelection) {
        this.marker.clearTail();
      }
      if ((ref1 = options != null ? options.autoscroll : void 0) != null ? ref1 : this.isLastSelection()) {
        this.autoscroll();
      }
      return this.finalize();
    };

    Selection.prototype.selectToScreenPosition = function(position, options) {
      position = Point.fromObject(position);
      return this.modifySelection((function(_this) {
        return function() {
          if (_this.initialScreenRange) {
            if (position.isLessThan(_this.initialScreenRange.start)) {
              _this.marker.setScreenRange([position, _this.initialScreenRange.end], {
                reversed: true
              });
            } else {
              _this.marker.setScreenRange([_this.initialScreenRange.start, position], {
                reversed: false
              });
            }
          } else {
            _this.cursor.setScreenPosition(position, options);
          }
          if (_this.linewise) {
            return _this.expandOverLine(options);
          } else if (_this.wordwise) {
            return _this.expandOverWord(options);
          }
        };
      })(this));
    };

    Selection.prototype.selectToBufferPosition = function(position) {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.setBufferPosition(position);
        };
      })(this));
    };

    Selection.prototype.selectRight = function(columnCount) {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveRight(columnCount);
        };
      })(this));
    };

    Selection.prototype.selectLeft = function(columnCount) {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveLeft(columnCount);
        };
      })(this));
    };

    Selection.prototype.selectUp = function(rowCount) {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveUp(rowCount);
        };
      })(this));
    };

    Selection.prototype.selectDown = function(rowCount) {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveDown(rowCount);
        };
      })(this));
    };

    Selection.prototype.selectToTop = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToTop();
        };
      })(this));
    };

    Selection.prototype.selectToBottom = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToBottom();
        };
      })(this));
    };

    Selection.prototype.selectAll = function() {
      return this.setBufferRange(this.editor.buffer.getRange(), {
        autoscroll: false
      });
    };

    Selection.prototype.selectToBeginningOfLine = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToBeginningOfLine();
        };
      })(this));
    };

    Selection.prototype.selectToFirstCharacterOfLine = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToFirstCharacterOfLine();
        };
      })(this));
    };

    Selection.prototype.selectToEndOfLine = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToEndOfScreenLine();
        };
      })(this));
    };

    Selection.prototype.selectToEndOfBufferLine = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToEndOfLine();
        };
      })(this));
    };

    Selection.prototype.selectToBeginningOfWord = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToBeginningOfWord();
        };
      })(this));
    };

    Selection.prototype.selectToEndOfWord = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToEndOfWord();
        };
      })(this));
    };

    Selection.prototype.selectToBeginningOfNextWord = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToBeginningOfNextWord();
        };
      })(this));
    };

    Selection.prototype.selectToPreviousWordBoundary = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToPreviousWordBoundary();
        };
      })(this));
    };

    Selection.prototype.selectToNextWordBoundary = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToNextWordBoundary();
        };
      })(this));
    };

    Selection.prototype.selectToPreviousSubwordBoundary = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToPreviousSubwordBoundary();
        };
      })(this));
    };

    Selection.prototype.selectToNextSubwordBoundary = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToNextSubwordBoundary();
        };
      })(this));
    };

    Selection.prototype.selectToBeginningOfNextParagraph = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToBeginningOfNextParagraph();
        };
      })(this));
    };

    Selection.prototype.selectToBeginningOfPreviousParagraph = function() {
      return this.modifySelection((function(_this) {
        return function() {
          return _this.cursor.moveToBeginningOfPreviousParagraph();
        };
      })(this));
    };

    Selection.prototype.selectWord = function(options) {
      if (options == null) {
        options = {};
      }
      if (this.cursor.isSurroundedByWhitespace()) {
        options.wordRegex = /[\t ]*/;
      }
      if (this.cursor.isBetweenWordAndNonWord()) {
        options.includeNonWordCharacters = false;
      }
      this.setBufferRange(this.cursor.getCurrentWordBufferRange(options), options);
      this.wordwise = true;
      return this.initialScreenRange = this.getScreenRange();
    };

    Selection.prototype.expandOverWord = function(options) {
      var ref1;
      this.setBufferRange(this.getBufferRange().union(this.cursor.getCurrentWordBufferRange()), {
        autoscroll: false
      });
      if ((ref1 = options != null ? options.autoscroll : void 0) != null ? ref1 : true) {
        return this.cursor.autoscroll();
      }
    };

    Selection.prototype.selectLine = function(row, options) {
      var endRange, startRange;
      if (row != null) {
        this.setBufferRange(this.editor.bufferRangeForBufferRow(row, {
          includeNewline: true
        }), options);
      } else {
        startRange = this.editor.bufferRangeForBufferRow(this.marker.getStartBufferPosition().row);
        endRange = this.editor.bufferRangeForBufferRow(this.marker.getEndBufferPosition().row, {
          includeNewline: true
        });
        this.setBufferRange(startRange.union(endRange), options);
      }
      this.linewise = true;
      this.wordwise = false;
      return this.initialScreenRange = this.getScreenRange();
    };

    Selection.prototype.expandOverLine = function(options) {
      var range, ref1;
      range = this.getBufferRange().union(this.cursor.getCurrentLineBufferRange({
        includeNewline: true
      }));
      this.setBufferRange(range, {
        autoscroll: false
      });
      if ((ref1 = options != null ? options.autoscroll : void 0) != null ? ref1 : true) {
        return this.cursor.autoscroll();
      }
    };


    /*
    Section: Modifying the selected text
     */

    Selection.prototype.insertText = function(text, options) {
      var autoIndentFirstLine, desiredIndentLevel, firstInsertedLine, firstLine, indentAdjustment, newBufferRange, oldBufferRange, precedingText, ref1, remainingLines, textIsAutoIndentable, wasReversed;
      if (options == null) {
        options = {};
      }
      oldBufferRange = this.getBufferRange();
      wasReversed = this.isReversed();
      this.clear(options);
      autoIndentFirstLine = false;
      precedingText = this.editor.getTextInRange([[oldBufferRange.start.row, 0], oldBufferRange.start]);
      remainingLines = text.split('\n');
      firstInsertedLine = remainingLines.shift();
      if (options.indentBasis != null) {
        indentAdjustment = this.editor.indentLevelForLine(precedingText) - options.indentBasis;
        this.adjustIndent(remainingLines, indentAdjustment);
      }
      textIsAutoIndentable = text === '\n' || text === '\r\n' || NonWhitespaceRegExp.test(text);
      if (options.autoIndent && textIsAutoIndentable && !NonWhitespaceRegExp.test(precedingText) && remainingLines.length > 0) {
        autoIndentFirstLine = true;
        firstLine = precedingText + firstInsertedLine;
        desiredIndentLevel = this.editor.languageMode.suggestedIndentForLineAtBufferRow(oldBufferRange.start.row, firstLine);
        indentAdjustment = desiredIndentLevel - this.editor.indentLevelForLine(firstLine);
        this.adjustIndent(remainingLines, indentAdjustment);
      }
      text = firstInsertedLine;
      if (remainingLines.length > 0) {
        text += '\n' + remainingLines.join('\n');
      }
      newBufferRange = this.editor.buffer.setTextInRange(oldBufferRange, text, pick(options, 'undo', 'normalizeLineEndings'));
      if (options.select) {
        this.setBufferRange(newBufferRange, {
          reversed: wasReversed
        });
      } else {
        if (wasReversed) {
          this.cursor.setBufferPosition(newBufferRange.end);
        }
      }
      if (autoIndentFirstLine) {
        this.editor.setIndentationForBufferRow(oldBufferRange.start.row, desiredIndentLevel);
      }
      if (options.autoIndentNewline && text === '\n') {
        this.editor.autoIndentBufferRow(newBufferRange.end.row, {
          preserveLeadingWhitespace: true,
          skipBlankLines: false
        });
      } else if (options.autoDecreaseIndent && NonWhitespaceRegExp.test(text)) {
        this.editor.autoDecreaseIndentForBufferRow(newBufferRange.start.row);
      }
      if ((ref1 = options.autoscroll) != null ? ref1 : this.isLastSelection()) {
        this.autoscroll();
      }
      return newBufferRange;
    };

    Selection.prototype.backspace = function() {
      if (this.isEmpty()) {
        this.selectLeft();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype.deleteToPreviousWordBoundary = function() {
      if (this.isEmpty()) {
        this.selectToPreviousWordBoundary();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype.deleteToNextWordBoundary = function() {
      if (this.isEmpty()) {
        this.selectToNextWordBoundary();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype.deleteToBeginningOfWord = function() {
      if (this.isEmpty()) {
        this.selectToBeginningOfWord();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype.deleteToBeginningOfLine = function() {
      if (this.isEmpty() && this.cursor.isAtBeginningOfLine()) {
        this.selectLeft();
      } else {
        this.selectToBeginningOfLine();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype["delete"] = function() {
      if (this.isEmpty()) {
        this.selectRight();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype.deleteToEndOfLine = function() {
      if (this.isEmpty() && this.cursor.isAtEndOfLine()) {
        return this["delete"]();
      }
      if (this.isEmpty()) {
        this.selectToEndOfLine();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype.deleteToEndOfWord = function() {
      if (this.isEmpty()) {
        this.selectToEndOfWord();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype.deleteToBeginningOfSubword = function() {
      if (this.isEmpty()) {
        this.selectToPreviousSubwordBoundary();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype.deleteToEndOfSubword = function() {
      if (this.isEmpty()) {
        this.selectToNextSubwordBoundary();
      }
      return this.deleteSelectedText();
    };

    Selection.prototype.deleteSelectedText = function() {
      var bufferRange, ref1;
      bufferRange = this.getBufferRange();
      if (!bufferRange.isEmpty()) {
        this.editor.buffer["delete"](bufferRange);
      }
      return (ref1 = this.cursor) != null ? ref1.setBufferPosition(bufferRange.start) : void 0;
    };

    Selection.prototype.deleteLine = function() {
      var end, range, start;
      if (this.isEmpty()) {
        start = this.cursor.getScreenRow();
        range = this.editor.bufferRowsForScreenRows(start, start + 1);
        if (range[1] > range[0]) {
          return this.editor.buffer.deleteRows(range[0], range[1] - 1);
        } else {
          return this.editor.buffer.deleteRow(range[0]);
        }
      } else {
        range = this.getBufferRange();
        start = range.start.row;
        end = range.end.row;
        if (end !== this.editor.buffer.getLastRow() && range.end.column === 0) {
          end--;
        }
        return this.editor.buffer.deleteRows(start, end);
      }
    };

    Selection.prototype.joinLines = function() {
      var currentRow, insertSpace, j, joinMarker, newSelectedRange, nextRow, ref1, rowCount, scanRange, selectedRange, trailingWhitespaceRange;
      selectedRange = this.getBufferRange();
      if (selectedRange.isEmpty()) {
        if (selectedRange.start.row === this.editor.buffer.getLastRow()) {
          return;
        }
      } else {
        joinMarker = this.editor.markBufferRange(selectedRange, {
          invalidate: 'never'
        });
      }
      rowCount = Math.max(1, selectedRange.getRowCount() - 1);
      for (j = 0, ref1 = rowCount; 0 <= ref1 ? j < ref1 : j > ref1; 0 <= ref1 ? j++ : j--) {
        this.cursor.setBufferPosition([selectedRange.start.row]);
        this.cursor.moveToEndOfLine();
        scanRange = this.cursor.getCurrentLineBufferRange();
        trailingWhitespaceRange = null;
        this.editor.scanInBufferRange(/[ \t]+$/, scanRange, function(arg) {
          var range;
          range = arg.range;
          return trailingWhitespaceRange = range;
        });
        if (trailingWhitespaceRange != null) {
          this.setBufferRange(trailingWhitespaceRange);
          this.deleteSelectedText();
        }
        currentRow = selectedRange.start.row;
        nextRow = currentRow + 1;
        insertSpace = nextRow <= this.editor.buffer.getLastRow() && this.editor.buffer.lineLengthForRow(nextRow) > 0 && this.editor.buffer.lineLengthForRow(currentRow) > 0;
        if (insertSpace) {
          this.insertText(' ');
        }
        this.cursor.moveToEndOfLine();
        this.modifySelection((function(_this) {
          return function() {
            _this.cursor.moveRight();
            return _this.cursor.moveToFirstCharacterOfLine();
          };
        })(this));
        this.deleteSelectedText();
        if (insertSpace) {
          this.cursor.moveLeft();
        }
      }
      if (joinMarker != null) {
        newSelectedRange = joinMarker.getBufferRange();
        this.setBufferRange(newSelectedRange);
        return joinMarker.destroy();
      }
    };

    Selection.prototype.outdentSelectedRows = function() {
      var buffer, end, j, leadingTabRegex, matchLength, ref1, ref2, ref3, ref4, row, start;
      ref1 = this.getBufferRowRange(), start = ref1[0], end = ref1[1];
      buffer = this.editor.buffer;
      leadingTabRegex = new RegExp("^( {1," + (this.editor.getTabLength()) + "}|\t)");
      for (row = j = ref2 = start, ref3 = end; ref2 <= ref3 ? j <= ref3 : j >= ref3; row = ref2 <= ref3 ? ++j : --j) {
        if (matchLength = (ref4 = buffer.lineForRow(row).match(leadingTabRegex)) != null ? ref4[0].length : void 0) {
          buffer["delete"]([[row, 0], [row, matchLength]]);
        }
      }
    };

    Selection.prototype.autoIndentSelectedRows = function() {
      var end, ref1, start;
      ref1 = this.getBufferRowRange(), start = ref1[0], end = ref1[1];
      return this.editor.autoIndentBufferRows(start, end);
    };

    Selection.prototype.toggleLineComments = function() {
      var ref1;
      return (ref1 = this.editor).toggleLineCommentsForBufferRows.apply(ref1, this.getBufferRowRange());
    };

    Selection.prototype.cutToEndOfLine = function(maintainClipboard) {
      if (this.isEmpty()) {
        this.selectToEndOfLine();
      }
      return this.cut(maintainClipboard);
    };

    Selection.prototype.cutToEndOfBufferLine = function(maintainClipboard) {
      if (this.isEmpty()) {
        this.selectToEndOfBufferLine();
      }
      return this.cut(maintainClipboard);
    };

    Selection.prototype.cut = function(maintainClipboard, fullLine) {
      if (maintainClipboard == null) {
        maintainClipboard = false;
      }
      if (fullLine == null) {
        fullLine = false;
      }
      this.copy(maintainClipboard, fullLine);
      return this["delete"]();
    };

    Selection.prototype.copy = function(maintainClipboard, fullLine) {
      var clipboardText, end, metadata, precedingText, ref1, ref2, selectionText, start, startLevel;
      if (maintainClipboard == null) {
        maintainClipboard = false;
      }
      if (fullLine == null) {
        fullLine = false;
      }
      if (this.isEmpty()) {
        return;
      }
      ref1 = this.getBufferRange(), start = ref1.start, end = ref1.end;
      selectionText = this.editor.getTextInRange([start, end]);
      precedingText = this.editor.getTextInRange([[start.row, 0], start]);
      startLevel = this.editor.indentLevelForLine(precedingText);
      if (maintainClipboard) {
        ref2 = this.editor.constructor.clipboard.readWithMetadata(), clipboardText = ref2.text, metadata = ref2.metadata;
        if (metadata == null) {
          metadata = {};
        }
        if (metadata.selections == null) {
          metadata.selections = [
            {
              text: clipboardText,
              indentBasis: metadata.indentBasis,
              fullLine: metadata.fullLine
            }
          ];
        }
        metadata.selections.push({
          text: selectionText,
          indentBasis: startLevel,
          fullLine: fullLine
        });
        return this.editor.constructor.clipboard.write([clipboardText, selectionText].join("\n"), metadata);
      } else {
        return this.editor.constructor.clipboard.write(selectionText, {
          indentBasis: startLevel,
          fullLine: fullLine
        });
      }
    };

    Selection.prototype.fold = function() {
      var range;
      range = this.getBufferRange();
      if (!range.isEmpty()) {
        this.editor.foldBufferRange(range);
        return this.cursor.setBufferPosition(range.end);
      }
    };

    Selection.prototype.adjustIndent = function(lines, indentAdjustment) {
      var currentIndentLevel, i, indentLevel, j, len, line;
      for (i = j = 0, len = lines.length; j < len; i = ++j) {
        line = lines[i];
        if (indentAdjustment === 0 || line === '') {
          continue;
        } else if (indentAdjustment > 0) {
          lines[i] = this.editor.buildIndentString(indentAdjustment) + line;
        } else {
          currentIndentLevel = this.editor.indentLevelForLine(lines[i]);
          indentLevel = Math.max(0, currentIndentLevel + indentAdjustment);
          lines[i] = line.replace(/^[\t ]+/, this.editor.buildIndentString(indentLevel));
        }
      }
    };

    Selection.prototype.indent = function(arg) {
      var autoIndent, delta, desiredIndent, row;
      autoIndent = (arg != null ? arg : {}).autoIndent;
      row = this.cursor.getBufferPosition().row;
      if (this.isEmpty()) {
        this.cursor.skipLeadingWhitespace();
        desiredIndent = this.editor.suggestedIndentForBufferRow(row);
        delta = desiredIndent - this.cursor.getIndentLevel();
        if (autoIndent && delta > 0) {
          if (!this.editor.getSoftTabs()) {
            delta = Math.max(delta, 1);
          }
          return this.insertText(this.editor.buildIndentString(delta));
        } else {
          return this.insertText(this.editor.buildIndentString(1, this.cursor.getBufferColumn()));
        }
      } else {
        return this.indentSelectedRows();
      }
    };

    Selection.prototype.indentSelectedRows = function() {
      var end, j, ref1, ref2, ref3, row, start;
      ref1 = this.getBufferRowRange(), start = ref1[0], end = ref1[1];
      for (row = j = ref2 = start, ref3 = end; ref2 <= ref3 ? j <= ref3 : j >= ref3; row = ref2 <= ref3 ? ++j : --j) {
        if (this.editor.buffer.lineLengthForRow(row) !== 0) {
          this.editor.buffer.insert([row, 0], this.editor.getTabText());
        }
      }
    };


    /*
    Section: Managing multiple selections
     */

    Selection.prototype.addSelectionBelow = function() {
      var clippedRange, j, nextRow, range, ref1, ref2, row, selection;
      range = this.getGoalScreenRange().copy();
      nextRow = range.end.row + 1;
      for (row = j = ref1 = nextRow, ref2 = this.editor.getLastScreenRow(); ref1 <= ref2 ? j <= ref2 : j >= ref2; row = ref1 <= ref2 ? ++j : --j) {
        range.start.row = row;
        range.end.row = row;
        clippedRange = this.editor.clipScreenRange(range, {
          skipSoftWrapIndentation: true
        });
        if (range.isEmpty()) {
          if (range.end.column > 0 && clippedRange.end.column === 0) {
            continue;
          }
        } else {
          if (clippedRange.isEmpty()) {
            continue;
          }
        }
        selection = this.editor.addSelectionForScreenRange(clippedRange);
        selection.setGoalScreenRange(range);
        break;
      }
    };

    Selection.prototype.addSelectionAbove = function() {
      var clippedRange, j, previousRow, range, ref1, row, selection;
      range = this.getGoalScreenRange().copy();
      previousRow = range.end.row - 1;
      for (row = j = ref1 = previousRow; ref1 <= 0 ? j <= 0 : j >= 0; row = ref1 <= 0 ? ++j : --j) {
        range.start.row = row;
        range.end.row = row;
        clippedRange = this.editor.clipScreenRange(range, {
          skipSoftWrapIndentation: true
        });
        if (range.isEmpty()) {
          if (range.end.column > 0 && clippedRange.end.column === 0) {
            continue;
          }
        } else {
          if (clippedRange.isEmpty()) {
            continue;
          }
        }
        selection = this.editor.addSelectionForScreenRange(clippedRange);
        selection.setGoalScreenRange(range);
        break;
      }
    };

    Selection.prototype.merge = function(otherSelection, options) {
      var myGoalScreenRange, otherGoalScreenRange;
      myGoalScreenRange = this.getGoalScreenRange();
      otherGoalScreenRange = otherSelection.getGoalScreenRange();
      if ((myGoalScreenRange != null) && (otherGoalScreenRange != null)) {
        options.goalScreenRange = myGoalScreenRange.union(otherGoalScreenRange);
      } else {
        options.goalScreenRange = myGoalScreenRange != null ? myGoalScreenRange : otherGoalScreenRange;
      }
      this.setBufferRange(this.getBufferRange().union(otherSelection.getBufferRange()), Object.assign({
        autoscroll: false
      }, options));
      return otherSelection.destroy();
    };


    /*
    Section: Comparing to other selections
     */

    Selection.prototype.compare = function(otherSelection) {
      return this.marker.compare(otherSelection.marker);
    };


    /*
    Section: Private Utilities
     */

    Selection.prototype.setGoalScreenRange = function(range) {
      return this.goalScreenRange = Range.fromObject(range);
    };

    Selection.prototype.getGoalScreenRange = function() {
      var ref1;
      return (ref1 = this.goalScreenRange) != null ? ref1 : this.getScreenRange();
    };

    Selection.prototype.markerDidChange = function(e) {
      var cursorMovedEvent, newHeadBufferPosition, newHeadScreenPosition, oldHeadBufferPosition, oldHeadScreenPosition, oldTailBufferPosition, oldTailScreenPosition, textChanged;
      oldHeadBufferPosition = e.oldHeadBufferPosition, oldTailBufferPosition = e.oldTailBufferPosition, newHeadBufferPosition = e.newHeadBufferPosition;
      oldHeadScreenPosition = e.oldHeadScreenPosition, oldTailScreenPosition = e.oldTailScreenPosition, newHeadScreenPosition = e.newHeadScreenPosition;
      textChanged = e.textChanged;
      this.cursor.updateVisibility();
      if (!oldHeadScreenPosition.isEqual(newHeadScreenPosition)) {
        this.cursor.goalColumn = null;
        cursorMovedEvent = {
          oldBufferPosition: oldHeadBufferPosition,
          oldScreenPosition: oldHeadScreenPosition,
          newBufferPosition: newHeadBufferPosition,
          newScreenPosition: newHeadScreenPosition,
          textChanged: textChanged,
          cursor: this.cursor
        };
        this.cursor.emitter.emit('did-change-position', cursorMovedEvent);
        this.editor.cursorMoved(cursorMovedEvent);
      }
      this.emitter.emit('did-change-range');
      return this.editor.selectionRangeChanged({
        oldBufferRange: new Range(oldHeadBufferPosition, oldTailBufferPosition),
        oldScreenRange: new Range(oldHeadScreenPosition, oldTailScreenPosition),
        newBufferRange: this.getBufferRange(),
        newScreenRange: this.getScreenRange(),
        selection: this
      });
    };

    Selection.prototype.markerDidDestroy = function() {
      if (this.editor.isDestroyed()) {
        return;
      }
      this.destroyed = true;
      this.cursor.destroyed = true;
      this.editor.removeSelection(this);
      this.cursor.emitter.emit('did-destroy');
      this.emitter.emit('did-destroy');
      this.cursor.emitter.dispose();
      return this.emitter.dispose();
    };

    Selection.prototype.finalize = function() {
      var ref1;
      if (!((ref1 = this.initialScreenRange) != null ? ref1.isEqual(this.getScreenRange()) : void 0)) {
        this.initialScreenRange = null;
      }
      if (this.isEmpty()) {
        this.wordwise = false;
        return this.linewise = false;
      }
    };

    Selection.prototype.autoscroll = function(options) {
      if (this.marker.hasTail()) {
        return this.editor.scrollToScreenRange(this.getScreenRange(), Object.assign({
          reversed: this.isReversed()
        }, options));
      } else {
        return this.cursor.autoscroll(options);
      }
    };

    Selection.prototype.clearAutoscroll = function() {};

    Selection.prototype.modifySelection = function(fn) {
      this.retainSelection = true;
      this.plantTail();
      fn();
      return this.retainSelection = false;
    };

    Selection.prototype.plantTail = function() {
      return this.marker.plantTail();
    };

    return Selection;

  })(Model);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3NlbGVjdGlvbi5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLHVFQUFBO0lBQUE7OztFQUFBLE1BQWlCLE9BQUEsQ0FBUSxhQUFSLENBQWpCLEVBQUMsaUJBQUQsRUFBUTs7RUFDUCxPQUFRLE9BQUEsQ0FBUSxpQkFBUjs7RUFDUixVQUFXLE9BQUEsQ0FBUSxXQUFSOztFQUNaLEtBQUEsR0FBUSxPQUFBLENBQVEsU0FBUjs7RUFFUixtQkFBQSxHQUFzQjs7RUFHdEIsTUFBTSxDQUFDLE9BQVAsR0FDTTs7O3dCQUNKLE1BQUEsR0FBUTs7d0JBQ1IsTUFBQSxHQUFROzt3QkFDUixNQUFBLEdBQVE7O3dCQUNSLGtCQUFBLEdBQW9COzt3QkFDcEIsUUFBQSxHQUFVOztJQUVHLG1CQUFDLEdBQUQ7QUFDWCxVQUFBO01BRGEsSUFBQyxDQUFBLGFBQUEsUUFBUSxJQUFDLENBQUEsYUFBQSxRQUFRLElBQUMsQ0FBQSxhQUFBLFFBQVE7TUFDeEMsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQUFJO01BRWYsSUFBQyxDQUFBLFFBQUQsQ0FBVSxFQUFWO01BQ0EsSUFBQyxDQUFBLE1BQU0sQ0FBQyxTQUFSLEdBQW9CO01BQ3BCLElBQUMsQ0FBQSxVQUFELEdBQWMsSUFBQyxDQUFBLE1BQU0sQ0FBQyxjQUFSLENBQXVCLElBQUMsQ0FBQSxNQUF4QixFQUFnQztRQUFBLElBQUEsRUFBTSxXQUFOO1FBQW1CLENBQUEsS0FBQSxDQUFBLEVBQU8sV0FBMUI7T0FBaEM7TUFFZCxJQUFDLENBQUEsTUFBTSxDQUFDLFdBQVIsQ0FBb0IsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLENBQUQ7aUJBQU8sS0FBQyxDQUFBLGVBQUQsQ0FBaUIsQ0FBakI7UUFBUDtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBcEI7TUFDQSxJQUFDLENBQUEs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QTRCLElBQUMsQ0FBQSxjQUFELENBQUEsQ0FBNUIsRUFBK0MsTUFBTSxDQUFDLE1BQVAsQ0FBYztVQUFDLFFBQUEsRUFBVSxJQUFDLENBQUEsVUFBRCxDQUFBLENBQVg7U0FBZCxFQUF5QyxPQUF6QyxDQUEvQyxFQURGO09BQUEsTUFBQTtlQUdFLElBQUMsQ0FBQSxNQUFNLENBQUMsVUFBUixDQUFtQixPQUFuQixFQUhGOztJQURVOzt3QkFNWixlQUFBLEdBQWlCLFNBQUEsR0FBQTs7d0JBRWpCLGVBQUEsR0FBaUIsU0FBQyxFQUFEO01BQ2YsSUFBQyxDQUFBLGVBQUQsR0FBbUI7TUFDbkIsSUFBQyxDQUFBLFNBQUQsQ0FBQTtNQUNBLEVBQUEsQ0FBQTthQUNBLElBQUMsQ0FBQSxlQUFELEdBQW1CO0lBSko7O3dCQVdqQixTQUFBLEdBQVcsU0FBQTthQUNULElBQUMsQ0FBQSxNQUFNLENBQUMsU0FBUixDQUFBO0lBRFM7Ozs7S0F6ekJXO0FBVHhCIiwic291cmNlc0NvbnRlbnQiOlsie1BvaW50LCBSYW5nZX0gPSByZXF1aXJlICd0ZXh0LWJ1ZmZlcidcbntwaWNrfSA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbntFbWl0dGVyfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcbk1vZGVsID0gcmVxdWlyZSAnLi9tb2RlbCdcblxuTm9uV2hpdGVzcGFjZVJlZ0V4cCA9IC9cXFMvXG5cbiMgRXh0ZW5kZWQ6IFJlcHJlc2VudHMgYSBzZWxlY3Rpb24gaW4gdGhlIHtUZXh0RWRpdG9yfS5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIFNlbGVjdGlvbiBleHRlbmRzIE1vZGVsXG4gIGN1cnNvcjogbnVsbFxuICBtYXJrZXI6IG51bGxcbiAgZWRpdG9yOiBudWxsXG4gIGluaXRpYWxTY3JlZW5SYW5nZTogbnVsbFxuICB3b3Jkd2lzZTogZmFsc2VcblxuICBjb25zdHJ1Y3RvcjogKHtAY3Vyc29yLCBAbWFya2VyLCBAZWRpdG9yLCBpZH0pIC0+XG4gICAgQGVtaXR0ZXIgPSBuZXcgRW1pdHRlclxuXG4gICAgQGFzc2lnbklkKGlkKVxuICAgIEBjdXJzb3Iuc2VsZWN0aW9uID0gdGhpc1xuICAgIEBkZWNvcmF0aW9uID0gQGVkaXRvci5kZWNvcmF0ZU1hcmtlcihAbWFya2VyLCB0eXBlOiAnaGlnaGxpZ2h0JywgY2xhc3M6ICdzZWxlY3Rpb24nKVxuXG4gICAgQG1hcmtlci5vbkRpZENoYW5nZSAoZSkgPT4gQG1hcmtlckRpZENoYW5nZShlKVxuICAgIEBtYXJrZXIub25EaWREZXN0cm95ID0+IEBtYXJrZXJEaWREZXN0cm95KClcblxuICBkZXN0cm95OiAtPlxuICAgIEBtYXJrZXIuZGVzdHJveSgpXG5cbiAgaXNMYXN0U2VsZWN0aW9uOiAtPlxuICAgIHRoaXMgaXMgQGVkaXRvci5nZXRMYXN0U2VsZWN0aW9uKClcblxuICAjIyNcbiAgU2VjdGlvbjogRXZlbnQgU3Vic2NyaXB0aW9uXG4gICMjI1xuXG4gICMgRXh0ZW5kZWQ6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCB3aGVuIHRoZSBzZWxlY3Rpb24gd2FzIG1vdmVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGV2ZW50YCB7T2JqZWN0fVxuICAjICAgICAqIGBvbGRCdWZmZXJSYW5nZWAge1JhbmdlfVxuICAjICAgICAqIGBvbGRTY3JlZW5SYW5nZWAge1JhbmdlfVxuICAjICAgICAqIGBuZXdCdWZmZXJSYW5nZWAge1JhbmdlfVxuICAjICAgICAqIGBuZXdTY3JlZW5SYW5nZWAge1JhbmdlfVxuICAjICAgICAqIGBzZWxlY3Rpb25gIHtTZWxlY3Rpb259IHRoYXQgdHJpZ2dlcmVkIHRoZSBldmVudFxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VSYW5nZTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLXJhbmdlJywgY2FsbGJhY2tcblxuICAjIEV4dGVuZGVkOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiB0aGUgc2VsZWN0aW9uIHdhcyBkZXN0cm95ZWRcbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZERlc3Ryb3k6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWRlc3Ryb3knLCBjYWxsYmFja1xuXG4gICMjI1xuICBTZWN0aW9uOiBNYW5hZ2luZyB0aGUgc2VsZWN0aW9uIHJhbmdlXG4gICMjI1xuXG4gICMgUHVibGljOiBSZXR1cm5zIHRoZSBzY3JlZW4ge1JhbmdlfSBmb3IgdGhlIHNlbGVjdGlvbi5cbiAgZ2V0U2NyZWVuUmFuZ2U6IC0+XG4gICAgQG1hcmtlci5nZXRTY3JlZW5SYW5nZSgpXG5cbiAgIyBQdWJsaWM6IE1vZGlmaWVzIHRoZSBzY3JlZW4gcmFuZ2UgZm9yIHRoZSBzZWxlY3Rpb24uXG4gICNcbiAgIyAqIGBzY3JlZW5SYW5nZWAgVGhlIG5ldyB7UmFuZ2V9IHRvIHVzZS5cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9IG9wdGlvbnMgbWF0Y2hpbmcgdGhvc2UgZm91bmQgaW4gezo6c2V0QnVmZmVyUmFuZ2V9LlxuICBzZXRTY3JlZW5SYW5nZTogKHNjcmVlblJhbmdlLCBvcHRpb25zKSAtPlxuICAgIEBzZXRCdWZmZXJSYW5nZShAZWRpdG9yLmJ1ZmZlclJhbmdlRm9yU2NyZWVuUmFuZ2Uoc2NyZWVuUmFuZ2UpLCBvcHRpb25zKVxuXG4gICMgUHVibGljOiBSZXR1cm5zIHRoZSBidWZmZXIge1JhbmdlfSBmb3IgdGhlIHNlbGVjdGlvbi5cbiAgZ2V0QnVmZmVyUmFuZ2U6IC0+XG4gICAgQG1hcmtlci5nZXRCdWZmZXJSYW5nZSgpXG5cbiAgIyBQdWJsaWM6IE1vZGlmaWVzIHRoZSBidWZmZXIge1JhbmdlfSBmb3IgdGhlIHNlbGVjdGlvbi5cbiAgI1xuICAjICogYGJ1ZmZlclJhbmdlYCBUaGUgbmV3IHtSYW5nZX0gdG8gc2VsZWN0LlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkge09iamVjdH0gd2l0aCB0aGUga2V5czpcbiAgIyAgICogYHByZXNlcnZlRm9sZHNgIGlmIGB0cnVlYCwgdGhlIGZvbGQgc2V0dGluZ3MgYXJlIHByZXNlcnZlZCBhZnRlciB0aGVcbiAgIyAgICAgc2VsZWN0aW9uIG1vdmVzLlxuICAjICAgKiBgYXV0b3Njcm9sbGAge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0byBhdXRvc2Nyb2xsIHRvIHRoZSBuZXdcbiAgIyAgICAgcmFuZ2UuIERlZmF1bHRzIHRvIGB0cnVlYCBpZiB0aGlzIGlzIHRoZSBtb3N0IHJlY2VudGx5IGFkZGVkIHNlbGVjdGlvbixcbiAgIyAgICAgYGZhbHNlYCBvdGhlcndpc2UuXG4gIHNldEJ1ZmZlclJhbmdlOiAoYnVmZmVyUmFuZ2UsIG9wdGlvbnM9e30pIC0+XG4gICAgYnVmZmVyUmFuZ2UgPSBSYW5nZS5mcm9tT2JqZWN0KGJ1ZmZlclJhbmdlKVxuICAgIG9wdGlvbnMucmV2ZXJzZWQgPz0gQGlzUmV2ZXJzZWQoKVxuICAgIEBlZGl0b3IuZGVzdHJveUZvbGRzSW50ZXJzZWN0aW5nQnVmZmVyUmFuZ2UoYnVmZmVyUmFuZ2UpIHVubGVzcyBvcHRpb25zLnByZXNlcnZlRm9sZHNcbiAgICBAbW9kaWZ5U2VsZWN0aW9uID0+XG4gICAgICBuZWVkc0ZsYXNoID0gb3B0aW9ucy5mbGFzaFxuICAgICAgZGVsZXRlIG9wdGlvbnMuZmxhc2ggaWYgb3B0aW9ucy5mbGFzaD9cbiAgICAgIEBtYXJrZXIuc2V0QnVmZmVyUmFuZ2UoYnVmZmVyUmFuZ2UsIG9wdGlvbnMpXG4gICAgICBAYXV0b3Njcm9sbCgpIGlmIG9wdGlvbnM/LmF1dG9zY3JvbGwgPyBAaXNMYXN0U2VsZWN0aW9uKClcbiAgICAgIEBkZWNvcmF0aW9uLmZsYXNoKCdmbGFzaCcsIEBlZGl0b3Iuc2VsZWN0aW9uRmxhc2hEdXJhdGlvbikgaWYgbmVlZHNGbGFzaFxuXG4gICMgUHVibGljOiBSZXR1cm5zIHRoZSBzdGFydGluZyBhbmQgZW5kaW5nIGJ1ZmZlciByb3dzIHRoZSBzZWxlY3Rpb24gaXNcbiAgIyBoaWdobGlnaHRpbmcuXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2YgdHdvIHtOdW1iZXJ9czogdGhlIHN0YXJ0aW5nIHJvdywgYW5kIHRoZSBlbmRpbmcgcm93LlxuICBnZXRCdWZmZXJSb3dSYW5nZTogLT5cbiAgICByYW5nZSA9IEBnZXRCdWZmZXJSYW5nZSgpXG4gICAgc3RhcnQgPSByYW5nZS5zdGFydC5yb3dcbiAgICBlbmQgPSByYW5nZS5lbmQucm93XG4gICAgZW5kID0gTWF0aC5tYXgoc3RhcnQsIGVuZCAtIDEpIGlmIHJhbmdlLmVuZC5jb2x1bW4gaXMgMFxuICAgIFtzdGFydCwgZW5kXVxuXG4gIGdldFRhaWxTY3JlZW5Qb3NpdGlvbjogLT5cbiAgICBAbWFya2VyLmdldFRhaWxTY3JlZW5Qb3NpdGlvbigpXG5cbiAgZ2V0VGFpbEJ1ZmZlclBvc2l0aW9uOiAtPlxuICAgIEBtYXJrZXIuZ2V0VGFpbEJ1ZmZlclBvc2l0aW9uKClcblxuICBnZXRIZWFkU2NyZWVuUG9zaXRpb246IC0+XG4gICAgQG1hcmtlci5nZXRIZWFkU2NyZWVuUG9zaXRpb24oKVxuXG4gIGdldEhlYWRCdWZmZXJQb3NpdGlvbjogLT5cbiAgICBAbWFya2VyLmdldEhlYWRCdWZmZXJQb3NpdGlvbigpXG5cbiAgIyMjXG4gIFNlY3Rpb246IEluZm8gYWJvdXQgdGhlIHNlbGVjdGlvblxuICAjIyNcblxuICAjIFB1YmxpYzogRGV0ZXJtaW5lcyBpZiB0aGUgc2VsZWN0aW9uIGNvbnRhaW5zIGFueXRoaW5nLlxuICBpc0VtcHR5OiAtPlxuICAgIEBnZXRCdWZmZXJSYW5nZSgpLmlzRW1wdHkoKVxuXG4gICMgUHVibGljOiBEZXRlcm1pbmVzIGlmIHRoZSBlbmRpbmcgcG9zaXRpb24gb2YgYSBtYXJrZXIgaXMgZ3JlYXRlciB0aGFuIHRoZVxuICAjIHN0YXJ0aW5nIHBvc2l0aW9uLlxuICAjXG4gICMgVGhpcyBjYW4gaGFwcGVuIHdoZW4sIGZvciBleGFtcGxlLCB5b3UgaGlnaGxpZ2h0IHRleHQgXCJ1cFwiIGluIGEge1RleHRCdWZmZXJ9LlxuICBpc1JldmVyc2VkOiAtPlxuICAgIEBtYXJrZXIuaXNSZXZlcnNlZCgpXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgd2hldGhlciB0aGUgc2VsZWN0aW9uIGlzIGEgc2luZ2xlIGxpbmUgb3Igbm90LlxuICBpc1NpbmdsZVNjcmVlbkxpbmU6IC0+XG4gICAgQGdldFNjcmVlblJhbmdlKCkuaXNTaW5nbGVMaW5lKClcblxuICAjIFB1YmxpYzogUmV0dXJucyB0aGUgdGV4dCBpbiB0aGUgc2VsZWN0aW9uLlxuICBnZXRUZXh0OiAtPlxuICAgIEBlZGl0b3IuYnVmZmVyLmdldFRleHRJblJhbmdlKEBnZXRCdWZmZXJSYW5nZSgpKVxuXG4gICMgUHVibGljOiBJZGVudGlmaWVzIGlmIGEgc2VsZWN0aW9uIGludGVyc2VjdHMgd2l0aCBhIGdpdmVuIGJ1ZmZlciByYW5nZS5cbiAgI1xuICAjICogYGJ1ZmZlclJhbmdlYCBBIHtSYW5nZX0gdG8gY2hlY2sgYWdhaW5zdC5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn1cbiAgaW50ZXJzZWN0c0J1ZmZlclJhbmdlOiAoYnVmZmVyUmFuZ2UpIC0+XG4gICAgQGdldEJ1ZmZlclJhbmdlKCkuaW50ZXJzZWN0c1dpdGgoYnVmZmVyUmFuZ2UpXG5cbiAgaW50ZXJzZWN0c1NjcmVlblJvd1JhbmdlOiAoc3RhcnRSb3csIGVuZFJvdykgLT5cbiAgICBAZ2V0U2NyZWVuUmFuZ2UoKS5pbnRlcnNlY3RzUm93UmFuZ2Uoc3RhcnRSb3csIGVuZFJvdylcblxuICBpbnRlcnNlY3RzU2NyZWVuUm93OiAoc2NyZWVuUm93KSAtPlxuICAgIEBnZXRTY3JlZW5SYW5nZSgpLmludGVyc2VjdHNSb3coc2NyZWVuUm93KVxuXG4gICMgUHVibGljOiBJZGVudGlmaWVzIGlmIGEgc2VsZWN0aW9uIGludGVyc2VjdHMgd2l0aCBhbm90aGVyIHNlbGVjdGlvbi5cbiAgI1xuICAjICogYG90aGVyU2VsZWN0aW9uYCBBIHtTZWxlY3Rpb259IHRvIGNoZWNrIGFnYWluc3QuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59XG4gIGludGVyc2VjdHNXaXRoOiAob3RoZXJTZWxlY3Rpb24sIGV4Y2x1c2l2ZSkgLT5cbiAgICBAZ2V0QnVmZmVyUmFuZ2UoKS5pbnRlcnNlY3RzV2l0aChvdGhlclNlbGVjdGlvbi5nZXRCdWZmZXJSYW5nZSgpLCBleGNsdXNpdmUpXG5cbiAgIyMjXG4gIFNlY3Rpb246IE1vZGlmeWluZyB0aGUgc2VsZWN0ZWQgcmFuZ2VcbiAgIyMjXG5cbiAgIyBQdWJsaWM6IENsZWFycyB0aGUgc2VsZWN0aW9uLCBtb3ZpbmcgdGhlIG1hcmtlciB0byB0aGUgaGVhZC5cbiAgI1xuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGBhdXRvc2Nyb2xsYCB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGF1dG9zY3JvbGwgdG8gdGhlIG5ld1xuICAjICAgICByYW5nZS4gRGVmYXVsdHMgdG8gYHRydWVgIGlmIHRoaXMgaXMgdGhlIG1vc3QgcmVjZW50bHkgYWRkZWQgc2VsZWN0aW9uLFxuICAjICAgICBgZmFsc2VgIG90aGVyd2lzZS5cbiAgY2xlYXI6IChvcHRpb25zKSAtPlxuICAgIEBnb2FsU2NyZWVuUmFuZ2UgPSBudWxsXG4gICAgQG1hcmtlci5jbGVhclRhaWwoKSB1bmxlc3MgQHJldGFpblNlbGVjdGlvblxuICAgIEBhdXRvc2Nyb2xsKCkgaWYgb3B0aW9ucz8uYXV0b3Njcm9sbCA/IEBpc0xhc3RTZWxlY3Rpb24oKVxuICAgIEBmaW5hbGl6ZSgpXG5cbiAgIyBQdWJsaWM6IFNlbGVjdHMgdGhlIHRleHQgZnJvbSB0aGUgY3VycmVudCBjdXJzb3IgcG9zaXRpb24gdG8gYSBnaXZlbiBzY3JlZW5cbiAgIyBwb3NpdGlvbi5cbiAgI1xuICAjICogYHBvc2l0aW9uYCBBbiBpbnN0YW5jZSBvZiB7UG9pbnR9LCB3aXRoIGEgZ2l2ZW4gYHJvd2AgYW5kIGBjb2x1bW5gLlxuICBzZWxlY3RUb1NjcmVlblBvc2l0aW9uOiAocG9zaXRpb24sIG9wdGlvbnMpIC0+XG4gICAgcG9zaXRpb24gPSBQb2ludC5mcm9tT2JqZWN0KHBvc2l0aW9uKVxuXG4gICAgQG1vZGlmeVNlbGVjdGlvbiA9PlxuICAgICAgaWYgQGluaXRpYWxTY3JlZW5SYW5nZVxuICAgICAgICBpZiBwb3NpdGlvbi5pc0xlc3NUaGFuKEBpbml0aWFsU2NyZWVuUmFuZ2Uuc3RhcnQpXG4gICAgICAgICAgQG1hcmtlci5zZXRTY3JlZW5SYW5nZShbcG9zaXRpb24sIEBpbml0aWFsU2NyZWVuUmFuZ2UuZW5kXSwgcmV2ZXJzZWQ6IHRydWUpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAbWFya2VyLnNldFNjcmVlblJhbmdlKFtAaW5pdGlhbFNjcmVlblJhbmdlLnN0YXJ0LCBwb3NpdGlvbl0sIHJldmVyc2VkOiBmYWxzZSlcbiAgICAgIGVsc2VcbiAgICAgICAgQGN1cnNvci5zZXRTY3JlZW5Qb3NpdGlvbihwb3NpdGlvbiwgb3B0aW9ucylcblxuICAgICAgaWYgQGxpbmV3aXNlXG4gICAgICAgIEBleHBhbmRPdmVyTGluZShvcHRpb25zKVxuICAgICAgZWxzZSBpZiBAd29yZHdpc2VcbiAgICAgICAgQGV4cGFuZE92ZXJXb3JkKG9wdGlvbnMpXG5cbiAgIyBQdWJsaWM6IFNlbGVjdHMgdGhlIHRleHQgZnJvbSB0aGUgY3VycmVudCBjdXJzb3IgcG9zaXRpb24gdG8gYSBnaXZlbiBidWZmZXJcbiAgIyBwb3NpdGlvbi5cbiAgI1xuICAjICogYHBvc2l0aW9uYCBBbiBpbnN0YW5jZSBvZiB7UG9pbnR9LCB3aXRoIGEgZ2l2ZW4gYHJvd2AgYW5kIGBjb2x1bW5gLlxuICBzZWxlY3RUb0J1ZmZlclBvc2l0aW9uOiAocG9zaXRpb24pIC0+XG4gICAgQG1vZGlmeVNlbGVjdGlvbiA9PiBAY3Vyc29yLnNldEJ1ZmZlclBvc2l0aW9uKHBvc2l0aW9uKVxuXG4gICMgUHVibGljOiBTZWxlY3RzIHRoZSB0ZXh0IG9uZSBwb3NpdGlvbiByaWdodCBvZiB0aGUgY3Vyc29yLlxuICAjXG4gICMgKiBgY29sdW1uQ291bnRgIChvcHRpb25hbCkge051bWJlcn0gbnVtYmVyIG9mIGNvbHVtbnMgdG8gc2VsZWN0IChkZWZhdWx0OiAxKVxuICBzZWxlY3RSaWdodDogKGNvbHVtbkNvdW50KSAtPlxuICAgIEBtb2RpZnlTZWxlY3Rpb24gPT4gQGN1cnNvci5tb3ZlUmlnaHQoY29sdW1uQ291bnQpXG5cbiAgIyBQdWJsaWM6IFNlbGVjdHMgdGhlIHRleHQgb25lIHBvc2l0aW9uIGxlZnQgb2YgdGhlIGN1cnNvci5cbiAgI1xuICAjICogYGNvbHVtbkNvdW50YCAob3B0aW9uYWwpIHtOdW1iZXJ9IG51bWJlciBvZiBjb2x1bW5zIHRvIHNlbGVjdCAoZGVmYXVsdDogMSlcbiAgc2VsZWN0TGVmdDogKGNvbHVtbkNvdW50KSAtPlxuICAgIEBtb2RpZnlTZWxlY3Rpb24gPT4gQGN1cnNvci5tb3ZlTGVmdChjb2x1bW5Db3VudClcblxuICAjIFB1YmxpYzogU2VsZWN0cyBhbGwgdGhlIHRleHQgb25lIHBvc2l0aW9uIGFib3ZlIHRoZSBjdXJzb3IuXG4gICNcbiAgIyAqIGByb3dDb3VudGAgKG9wdGlvbmFsKSB7TnVtYmVyfSBudW1iZXIgb2Ygcm93cyB0byBzZWxlY3QgKGRlZmF1bHQ6IDEpXG4gIHNlbGVjdFVwOiAocm93Q291bnQpIC0+XG4gICAgQG1vZGlmeVNlbGVjdGlvbiA9PiBAY3Vyc29yLm1vdmVVcChyb3dDb3VudClcblxuICAjIFB1YmxpYzogU2VsZWN0cyBhbGwgdGhlIHRleHQgb25lIHBvc2l0aW9uIGJlbG93IHRoZSBjdXJzb3IuXG4gICNcbiAgIyAqIGByb3dDb3VudGAgKG9wdGlvbmFsKSB7TnVtYmVyfSBudW1iZXIgb2Ygcm93cyB0byBzZWxlY3QgKGRlZmF1bHQ6IDEpXG4gIHNlbGVjdERvd246IChyb3dDb3VudCkgLT5cbiAgICBAbW9kaWZ5U2VsZWN0aW9uID0+IEBjdXJzb3IubW92ZURvd24ocm93Q291bnQpXG5cbiAgIyBQdWJsaWM6IFNlbGVjdHMgYWxsIHRoZSB0ZXh0IGZyb20gdGhlIGN1cnJlbnQgY3Vyc29yIHBvc2l0aW9uIHRvIHRoZSB0b3Agb2ZcbiAgIyB0aGUgYnVmZmVyLlxuICBzZWxlY3RUb1RvcDogLT5cbiAgICBAbW9kaWZ5U2VsZWN0aW9uID0+IEBjdXJzb3IubW92ZVRvVG9wKClcblxuICAjIFB1YmxpYzogU2VsZWN0cyBhbGwgdGhlIHRleHQgZnJvbSB0aGUgY3VycmVudCBjdXJzb3IgcG9zaXRpb24gdG8gdGhlIGJvdHRvbVxuICAjIG9mIHRoZSBidWZmZXIuXG4gIHNlbGVjdFRvQm90dG9tOiAtPlxuICAgIEBtb2RpZnlTZWxlY3Rpb24gPT4gQGN1cnNvci5tb3ZlVG9Cb3R0b20oKVxuXG4gICMgUHVibGljOiBTZWxlY3RzIGFsbCB0aGUgdGV4dCBpbiB0aGUgYnVmZmVyLlxuICBzZWxlY3RBbGw6IC0+XG4gICAgQHNldEJ1ZmZlclJhbmdlKEBlZGl0b3IuYnVmZmVyLmdldFJhbmdlKCksIGF1dG9zY3JvbGw6IGZhbHNlKVxuXG4gICMgUHVibGljOiBTZWxlY3RzIGFsbCB0aGUgdGV4dCBmcm9tIHRoZSBjdXJyZW50IGN1cnNvciBwb3NpdGlvbiB0byB0aGVcbiAgIyBiZWdpbm5pbmcgb2YgdGhlIGxpbmUuXG4gIHNlbGVjdFRvQmVnaW5uaW5nT2ZMaW5lOiAtPlxuICAgIEBtb2RpZnlTZWxlY3Rpb24gPT4gQGN1cnNvci5tb3ZlVG9CZWdpbm5pbmdPZkxpbmUoKVxuXG4gICMgUHVibGljOiBTZWxlY3RzIGFsbCB0aGUgdGV4dCBmcm9tIHRoZSBjdXJyZW50IGN1cnNvciBwb3NpdGlvbiB0byB0aGUgZmlyc3RcbiAgIyBjaGFyYWN0ZXIgb2YgdGhlIGxpbmUuXG4gIHNlbGVjdFRvRmlyc3RDaGFyYWN0ZXJPZkxpbmU6IC0+XG4gICAgQG1vZGlmeVNlbGVjdGlvbiA9PiBAY3Vyc29yLm1vdmVUb0ZpcnN0Q2hhcmFjdGVyT2ZMaW5lKClcblxuICAjIFB1YmxpYzogU2VsZWN0cyBhbGwgdGhlIHRleHQgZnJvbSB0aGUgY3VycmVudCBjdXJzb3IgcG9zaXRpb24gdG8gdGhlIGVuZCBvZlxuICAjIHRoZSBzY3JlZW4gbGluZS5cbiAgc2VsZWN0VG9FbmRPZkxpbmU6IC0+XG4gICAgQG1vZGlmeVNlbGVjdGlvbiA9PiBAY3Vyc29yLm1vdmVUb0VuZE9mU2NyZWVuTGluZSgpXG5cbiAgIyBQdWJsaWM6IFNlbGVjdHMgYWxsIHRoZSB0ZXh0IGZyb20gdGhlIGN1cnJlbnQgY3Vyc29yIHBvc2l0aW9uIHRvIHRoZSBlbmQgb2ZcbiAgIyB0aGUgYnVmZmVyIGxpbmUuXG4gIHNlbGVjdFRvRW5kT2ZCdWZmZXJMaW5lOiAtPlxuICAgIEBtb2RpZnlTZWxlY3Rpb24gPT4gQGN1cnNvci5tb3ZlVG9FbmRPZkxpbmUoKVxuXG4gICMgUHVibGljOiBTZWxlY3RzIGFsbCB0aGUgdGV4dCBmcm9tIHRoZSBjdXJyZW50IGN1cnNvciBwb3NpdGlvbiB0byB0aGVcbiAgIyBiZWdpbm5pbmcgb2YgdGhlIHdvcmQuXG4gIHNlbGVjdFRvQmVnaW5uaW5nT2ZXb3JkOiAtPlxuICAgIEBtb2RpZnlTZWxlY3Rpb24gPT4gQGN1cnNvci5tb3ZlVG9CZWdpbm5pbmdPZldvcmQoKVxuXG4gICMgUHVibGljOiBTZWxlY3RzIGFsbCB0aGUgdGV4dCBmcm9tIHRoZSBjdXJyZW50IGN1cnNvciBwb3NpdGlvbiB0byB0aGUgZW5kIG9mXG4gICMgdGhlIHdvcmQuXG4gIHNlbGVjdFRvRW5kT2ZXb3JkOiAtPlxuICAgIEBtb2RpZnlTZWxlY3Rpb24gPT4gQGN1cnNvci5tb3ZlVG9FbmRPZldvcmQoKVxuXG4gICMgUHVibGljOiBTZWxlY3RzIGFsbCB0aGUgdGV4dCBmcm9tIHRoZSBjdXJyZW50IGN1cnNvciBwb3NpdGlvbiB0byB0aGVcbiAgIyBiZWdpbm5pbmcgb2YgdGhlIG5leHQgd29yZC5cbiAgc2VsZWN0VG9CZWdpbm5pbmdPZk5leHRXb3JkOiAtPlxuICAgIEBtb2RpZnlTZWxlY3Rpb24gPT4gQGN1cnNvci5tb3ZlVG9CZWdpbm5pbmdPZk5leHRXb3JkKClcblxuICAjIFB1YmxpYzogU2VsZWN0cyB0ZXh0IHRvIHRoZSBwcmV2aW91cyB3b3JkIGJvdW5kYXJ5LlxuICBzZWxlY3RUb1ByZXZpb3VzV29yZEJvdW5kYXJ5OiAtPlxuICAgIEBtb2RpZnlTZWxlY3Rpb24gPT4gQGN1cnNvci5tb3ZlVG9QcmV2aW91c1dvcmRCb3VuZGFyeSgpXG5cbiAgIyBQdWJsaWM6IFNlbGVjdHMgdGV4dCB0byB0aGUgbmV4dCB3b3JkIGJvdW5kYXJ5LlxuICBzZWxlY3RUb05leHRXb3JkQm91bmRhcnk6IC0+XG4gICAgQG1vZGlmeVNlbGVjdGlvbiA9PiBAY3Vyc29yLm1vdmVUb05leHRXb3JkQm91bmRhcnkoKVxuXG4gICMgUHVibGljOiBTZWxlY3RzIHRleHQgdG8gdGhlIHByZXZpb3VzIHN1YndvcmQgYm91bmRhcnkuXG4gIHNlbGVjdFRvUHJldmlvdXNTdWJ3b3JkQm91bmRhcnk6IC0+XG4gICAgQG1vZGlmeVNlbGVjdGlvbiA9PiBAY3Vyc29yLm1vdmVUb1ByZXZpb3VzU3Vid29yZEJvdW5kYXJ5KClcblxuICAjIFB1YmxpYzogU2VsZWN0cyB0ZXh0IHRvIHRoZSBuZXh0IHN1YndvcmQgYm91bmRhcnkuXG4gIHNlbGVjdFRvTmV4dFN1YndvcmRCb3VuZGFyeTogLT5cbiAgICBAbW9kaWZ5U2VsZWN0aW9uID0+IEBjdXJzb3IubW92ZVRvTmV4dFN1YndvcmRCb3VuZGFyeSgpXG5cbiAgIyBQdWJsaWM6IFNlbGVjdHMgYWxsIHRoZSB0ZXh0IGZyb20gdGhlIGN1cnJlbnQgY3Vyc29yIHBvc2l0aW9uIHRvIHRoZVxuICAjIGJlZ2lubmluZyBvZiB0aGUgbmV4dCBwYXJhZ3JhcGguXG4gIHNlbGVjdFRvQmVnaW5uaW5nT2ZOZXh0UGFyYWdyYXBoOiAtPlxuICAgIEBtb2RpZnlTZWxlY3Rpb24gPT4gQGN1cnNvci5tb3ZlVG9CZWdpbm5pbmdPZk5leHRQYXJhZ3JhcGgoKVxuXG4gICMgUHVibGljOiBTZWxlY3RzIGFsbCB0aGUgdGV4dCBmcm9tIHRoZSBjdXJyZW50IGN1cnNvciBwb3NpdGlvbiB0byB0aGVcbiAgIyBiZWdpbm5pbmcgb2YgdGhlIHByZXZpb3VzIHBhcmFncmFwaC5cbiAgc2VsZWN0VG9CZWdpbm5pbmdPZlByZXZpb3VzUGFyYWdyYXBoOiAtPlxuICAgIEBtb2RpZnlTZWxlY3Rpb24gPT4gQGN1cnNvci5tb3ZlVG9CZWdpbm5pbmdPZlByZXZpb3VzUGFyYWdyYXBoKClcblxuICAjIFB1YmxpYzogTW9kaWZpZXMgdGhlIHNlbGVjdGlvbiB0byBlbmNvbXBhc3MgdGhlIGN1cnJlbnQgd29yZC5cbiAgI1xuICAjIFJldHVybnMgYSB7UmFuZ2V9LlxuICBzZWxlY3RXb3JkOiAob3B0aW9ucz17fSkgLT5cbiAgICBvcHRpb25zLndvcmRSZWdleCA9IC9bXFx0IF0qLyBpZiBAY3Vyc29yLmlzU3Vycm91bmRlZEJ5V2hpdGVzcGFjZSgpXG4gICAgaWYgQGN1cnNvci5pc0JldHdlZW5Xb3JkQW5kTm9uV29yZCgpXG4gICAgICBvcHRpb25zLmluY2x1ZGVOb25Xb3JkQ2hhcmFjdGVycyA9IGZhbHNlXG5cbiAgICBAc2V0QnVmZmVyUmFuZ2UoQGN1cnNvci5nZXRDdXJyZW50V29yZEJ1ZmZlclJhbmdlKG9wdGlvbnMpLCBvcHRpb25zKVxuICAgIEB3b3Jkd2lzZSA9IHRydWVcbiAgICBAaW5pdGlhbFNjcmVlblJhbmdlID0gQGdldFNjcmVlblJhbmdlKClcblxuICAjIFB1YmxpYzogRXhwYW5kcyB0aGUgbmV3ZXN0IHNlbGVjdGlvbiB0byBpbmNsdWRlIHRoZSBlbnRpcmUgd29yZCBvbiB3aGljaFxuICAjIHRoZSBjdXJzb3JzIHJlc3RzLlxuICBleHBhbmRPdmVyV29yZDogKG9wdGlvbnMpIC0+XG4gICAgQHNldEJ1ZmZlclJhbmdlKEBnZXRCdWZmZXJSYW5nZSgpLnVuaW9uKEBjdXJzb3IuZ2V0Q3VycmVudFdvcmRCdWZmZXJSYW5nZSgpKSwgYXV0b3Njcm9sbDogZmFsc2UpXG4gICAgQGN1cnNvci5hdXRvc2Nyb2xsKCkgaWYgb3B0aW9ucz8uYXV0b3Njcm9sbCA/IHRydWVcblxuICAjIFB1YmxpYzogU2VsZWN0cyBhbiBlbnRpcmUgbGluZSBpbiB0aGUgYnVmZmVyLlxuICAjXG4gICMgKiBgcm93YCBUaGUgbGluZSB7TnVtYmVyfSB0byBzZWxlY3QgKGRlZmF1bHQ6IHRoZSByb3cgb2YgdGhlIGN1cnNvcikuXG4gIHNlbGVjdExpbmU6IChyb3csIG9wdGlvbnMpIC0+XG4gICAgaWYgcm93P1xuICAgICAgQHNldEJ1ZmZlclJhbmdlKEBlZGl0b3IuYnVmZmVyUmFuZ2VGb3JCdWZmZXJSb3cocm93LCBpbmNsdWRlTmV3bGluZTogdHJ1ZSksIG9wdGlvbnMpXG4gICAgZWxzZVxuICAgICAgc3RhcnRSYW5nZSA9IEBlZGl0b3IuYnVmZmVyUmFuZ2VGb3JCdWZmZXJSb3coQG1hcmtlci5nZXRTdGFydEJ1ZmZlclBvc2l0aW9uKCkucm93KVxuICAgICAgZW5kUmFuZ2UgPSBAZWRpdG9yLmJ1ZmZlclJhbmdlRm9yQnVmZmVyUm93KEBtYXJrZXIuZ2V0RW5kQnVmZmVyUG9zaXRpb24oKS5yb3csIGluY2x1ZGVOZXdsaW5lOiB0cnVlKVxuICAgICAgQHNldEJ1ZmZlclJhbmdlKHN0YXJ0UmFuZ2UudW5pb24oZW5kUmFuZ2UpLCBvcHRpb25zKVxuXG4gICAgQGxpbmV3aXNlID0gdHJ1ZVxuICAgIEB3b3Jkd2lzZSA9IGZhbHNlXG4gICAgQGluaXRpYWxTY3JlZW5SYW5nZSA9IEBnZXRTY3JlZW5SYW5nZSgpXG5cbiAgIyBQdWJsaWM6IEV4cGFuZHMgdGhlIG5ld2VzdCBzZWxlY3Rpb24gdG8gaW5jbHVkZSB0aGUgZW50aXJlIGxpbmUgb24gd2hpY2hcbiAgIyB0aGUgY3Vyc29yIGN1cnJlbnRseSByZXN0cy5cbiAgI1xuICAjIEl0IGFsc28gaW5jbHVkZXMgdGhlIG5ld2xpbmUgY2hhcmFjdGVyLlxuICBleHBhbmRPdmVyTGluZTogKG9wdGlvbnMpIC0+XG4gICAgcmFuZ2UgPSBAZ2V0QnVmZmVyUmFuZ2UoKS51bmlvbihAY3Vyc29yLmdldEN1cnJlbnRMaW5lQnVmZmVyUmFuZ2UoaW5jbHVkZU5ld2xpbmU6IHRydWUpKVxuICAgIEBzZXRCdWZmZXJSYW5nZShyYW5nZSwgYXV0b3Njcm9sbDogZmFsc2UpXG4gICAgQGN1cnNvci5hdXRvc2Nyb2xsKCkgaWYgb3B0aW9ucz8uYXV0b3Njcm9sbCA/IHRydWVcblxuICAjIyNcbiAgU2VjdGlvbjogTW9kaWZ5aW5nIHRoZSBzZWxlY3RlZCB0ZXh0XG4gICMjI1xuXG4gICMgUHVibGljOiBSZXBsYWNlcyB0ZXh0IGF0IHRoZSBjdXJyZW50IHNlbGVjdGlvbi5cbiAgI1xuICAjICogYHRleHRgIEEge1N0cmluZ30gcmVwcmVzZW50aW5nIHRoZSB0ZXh0IHRvIGFkZFxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkge09iamVjdH0gd2l0aCBrZXlzOlxuICAjICAgKiBgc2VsZWN0YCBpZiBgdHJ1ZWAsIHNlbGVjdHMgdGhlIG5ld2x5IGFkZGVkIHRleHQuXG4gICMgICAqIGBhdXRvSW5kZW50YCBpZiBgdHJ1ZWAsIGluZGVudHMgYWxsIGluc2VydGVkIHRleHQgYXBwcm9wcmlhdGVseS5cbiAgIyAgICogYGF1dG9JbmRlbnROZXdsaW5lYCBpZiBgdHJ1ZWAsIGluZGVudCBuZXdsaW5lIGFwcHJvcHJpYXRlbHkuXG4gICMgICAqIGBhdXRvRGVjcmVhc2VJbmRlbnRgIGlmIGB0cnVlYCwgZGVjcmVhc2VzIGluZGVudCBsZXZlbCBhcHByb3ByaWF0ZWx5XG4gICMgICAgIChmb3IgZXhhbXBsZSwgd2hlbiBhIGNsb3NpbmcgYnJhY2tldCBpcyBpbnNlcnRlZCkuXG4gICMgICAqIGBub3JtYWxpemVMaW5lRW5kaW5nc2AgKG9wdGlvbmFsKSB7Qm9vbGVhbn0gKGRlZmF1bHQ6IHRydWUpXG4gICMgICAqIGB1bmRvYCBpZiBgc2tpcGAsIHNraXBzIHRoZSB1bmRvIHN0YWNrIGZvciB0aGlzIG9wZXJhdGlvbi5cbiAgaW5zZXJ0VGV4dDogKHRleHQsIG9wdGlvbnM9e30pIC0+XG4gICAgb2xkQnVmZmVyUmFuZ2UgPSBAZ2V0QnVmZmVyUmFuZ2UoKVxuICAgIHdhc1JldmVyc2VkID0gQGlzUmV2ZXJzZWQoKVxuICAgIEBjbGVhcihvcHRpb25zKVxuXG4gICAgYXV0b0luZGVudEZpcnN0TGluZSA9IGZhbHNlXG4gICAgcHJlY2VkaW5nVGV4dCA9IEBlZGl0b3IuZ2V0VGV4dEluUmFuZ2UoW1tvbGRCdWZmZXJSYW5nZS5zdGFydC5yb3csIDBdLCBvbGRCdWZmZXJSYW5nZS5zdGFydF0pXG4gICAgcmVtYWluaW5nTGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKVxuICAgIGZpcnN0SW5zZXJ0ZWRMaW5lID0gcmVtYWluaW5nTGluZXMuc2hpZnQoKVxuXG4gICAgaWYgb3B0aW9ucy5pbmRlbnRCYXNpcz9cbiAgICAgIGluZGVudEFkanVzdG1lbnQgPSBAZWRpdG9yLmluZGVudExldmVsRm9yTGluZShwcmVjZWRpbmdUZXh0KSAtIG9wdGlvbnMuaW5kZW50QmFzaXNcbiAgICAgIEBhZGp1c3RJbmRlbnQocmVtYWluaW5nTGluZXMsIGluZGVudEFkanVzdG1lbnQpXG5cbiAgICB0ZXh0SXNBdXRvSW5kZW50YWJsZSA9IHRleHQgaXMgJ1xcbicgb3IgdGV4dCBpcyAnXFxyXFxuJyBvciBOb25XaGl0ZXNwYWNlUmVnRXhwLnRlc3QodGV4dClcbiAgICBpZiBvcHRpb25zLmF1dG9JbmRlbnQgYW5kIHRleHRJc0F1dG9JbmRlbnRhYmxlIGFuZCBub3QgTm9uV2hpdGVzcGFjZVJlZ0V4cC50ZXN0KHByZWNlZGluZ1RleHQpIGFuZCByZW1haW5pbmdMaW5lcy5sZW5ndGggPiAwXG4gICAgICBhdXRvSW5kZW50Rmlyc3RMaW5lID0gdHJ1ZVxuICAgICAgZmlyc3RMaW5lID0gcHJlY2VkaW5nVGV4dCArIGZpcnN0SW5zZXJ0ZWRMaW5lXG4gICAgICBkZXNpcmVkSW5kZW50TGV2ZWwgPSBAZWRpdG9yLmxhbmd1YWdlTW9kZS5zdWdnZXN0ZWRJbmRlbnRGb3JMaW5lQXRCdWZmZXJSb3cob2xkQnVmZmVyUmFuZ2Uuc3RhcnQucm93LCBmaXJzdExpbmUpXG4gICAgICBpbmRlbnRBZGp1c3RtZW50ID0gZGVzaXJlZEluZGVudExldmVsIC0gQGVkaXRvci5pbmRlbnRMZXZlbEZvckxpbmUoZmlyc3RMaW5lKVxuICAgICAgQGFkanVzdEluZGVudChyZW1haW5pbmdMaW5lcywgaW5kZW50QWRqdXN0bWVudClcblxuICAgIHRleHQgPSBmaXJzdEluc2VydGVkTGluZVxuICAgIHRleHQgKz0gJ1xcbicgKyByZW1haW5pbmdMaW5lcy5qb2luKCdcXG4nKSBpZiByZW1haW5pbmdMaW5lcy5sZW5ndGggPiAwXG5cbiAgICBuZXdCdWZmZXJSYW5nZSA9IEBlZGl0b3IuYnVmZmVyLnNldFRleHRJblJhbmdlKG9sZEJ1ZmZlclJhbmdlLCB0ZXh0LCBwaWNrKG9wdGlvbnMsICd1bmRvJywgJ25vcm1hbGl6ZUxpbmVFbmRpbmdzJykpXG5cbiAgICBpZiBvcHRpb25zLnNlbGVjdFxuICAgICAgQHNldEJ1ZmZlclJhbmdlKG5ld0J1ZmZlclJhbmdlLCByZXZlcnNlZDogd2FzUmV2ZXJzZWQpXG4gICAgZWxzZVxuICAgICAgQGN1cnNvci5zZXRCdWZmZXJQb3NpdGlvbihuZXdCdWZmZXJSYW5nZS5lbmQpIGlmIHdhc1JldmVyc2VkXG5cbiAgICBpZiBhdXRvSW5kZW50Rmlyc3RMaW5lXG4gICAgICBAZWRpdG9yLnNldEluZGVudGF0aW9uRm9yQnVmZmVyUm93KG9sZEJ1ZmZlclJhbmdlLnN0YXJ0LnJvdywgZGVzaXJlZEluZGVudExldmVsKVxuXG4gICAgaWYgb3B0aW9ucy5hdXRvSW5kZW50TmV3bGluZSBhbmQgdGV4dCBpcyAnXFxuJ1xuICAgICAgQGVkaXRvci5hdXRvSW5kZW50QnVmZmVyUm93KG5ld0J1ZmZlclJhbmdlLmVuZC5yb3csIHByZXNlcnZlTGVhZGluZ1doaXRlc3BhY2U6IHRydWUsIHNraXBCbGFua0xpbmVzOiBmYWxzZSlcbiAgICBlbHNlIGlmIG9wdGlvbnMuYXV0b0RlY3JlYXNlSW5kZW50IGFuZCBOb25XaGl0ZXNwYWNlUmVnRXhwLnRlc3QodGV4dClcbiAgICAgIEBlZGl0b3IuYXV0b0RlY3JlYXNlSW5kZW50Rm9yQnVmZmVyUm93KG5ld0J1ZmZlclJhbmdlLnN0YXJ0LnJvdylcblxuICAgIEBhdXRvc2Nyb2xsKCkgaWYgb3B0aW9ucy5hdXRvc2Nyb2xsID8gQGlzTGFzdFNlbGVjdGlvbigpXG5cbiAgICBuZXdCdWZmZXJSYW5nZVxuXG4gICMgUHVibGljOiBSZW1vdmVzIHRoZSBmaXJzdCBjaGFyYWN0ZXIgYmVmb3JlIHRoZSBzZWxlY3Rpb24gaWYgdGhlIHNlbGVjdGlvblxuICAjIGlzIGVtcHR5IG90aGVyd2lzZSBpdCBkZWxldGVzIHRoZSBzZWxlY3Rpb24uXG4gIGJhY2tzcGFjZTogLT5cbiAgICBAc2VsZWN0TGVmdCgpIGlmIEBpc0VtcHR5KClcbiAgICBAZGVsZXRlU2VsZWN0ZWRUZXh0KClcblxuICAjIFB1YmxpYzogUmVtb3ZlcyB0aGUgc2VsZWN0aW9uIG9yLCBpZiBub3RoaW5nIGlzIHNlbGVjdGVkLCB0aGVuIGFsbFxuICAjIGNoYXJhY3RlcnMgZnJvbSB0aGUgc3RhcnQgb2YgdGhlIHNlbGVjdGlvbiBiYWNrIHRvIHRoZSBwcmV2aW91cyB3b3JkXG4gICMgYm91bmRhcnkuXG4gIGRlbGV0ZVRvUHJldmlvdXNXb3JkQm91bmRhcnk6IC0+XG4gICAgQHNlbGVjdFRvUHJldmlvdXNXb3JkQm91bmRhcnkoKSBpZiBAaXNFbXB0eSgpXG4gICAgQGRlbGV0ZVNlbGVjdGVkVGV4dCgpXG5cbiAgIyBQdWJsaWM6IFJlbW92ZXMgdGhlIHNlbGVjdGlvbiBvciwgaWYgbm90aGluZyBpcyBzZWxlY3RlZCwgdGhlbiBhbGxcbiAgIyBjaGFyYWN0ZXJzIGZyb20gdGhlIHN0YXJ0IG9mIHRoZSBzZWxlY3Rpb24gdXAgdG8gdGhlIG5leHQgd29yZFxuICAjIGJvdW5kYXJ5LlxuICBkZWxldGVUb05leHRXb3JkQm91bmRhcnk6IC0+XG4gICAgQHNlbGVjdFRvTmV4dFdvcmRCb3VuZGFyeSgpIGlmIEBpc0VtcHR5KClcbiAgICBAZGVsZXRlU2VsZWN0ZWRUZXh0KClcblxuICAjIFB1YmxpYzogUmVtb3ZlcyBmcm9tIHRoZSBzdGFydCBvZiB0aGUgc2VsZWN0aW9uIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlXG4gICMgY3VycmVudCB3b3JkIGlmIHRoZSBzZWxlY3Rpb24gaXMgZW1wdHkgb3RoZXJ3aXNlIGl0IGRlbGV0ZXMgdGhlIHNlbGVjdGlvbi5cbiAgZGVsZXRlVG9CZWdpbm5pbmdPZldvcmQ6IC0+XG4gICAgQHNlbGVjdFRvQmVnaW5uaW5nT2ZXb3JkKCkgaWYgQGlzRW1wdHkoKVxuICAgIEBkZWxldGVTZWxlY3RlZFRleHQoKVxuXG4gICMgUHVibGljOiBSZW1vdmVzIGZyb20gdGhlIGJlZ2lubmluZyBvZiB0aGUgbGluZSB3aGljaCB0aGUgc2VsZWN0aW9uIGJlZ2lucyBvblxuICAjIGFsbCB0aGUgd2F5IHRocm91Z2ggdG8gdGhlIGVuZCBvZiB0aGUgc2VsZWN0aW9uLlxuICBkZWxldGVUb0JlZ2lubmluZ09mTGluZTogLT5cbiAgICBpZiBAaXNFbXB0eSgpIGFuZCBAY3Vyc29yLmlzQXRCZWdpbm5pbmdPZkxpbmUoKVxuICAgICAgQHNlbGVjdExlZnQoKVxuICAgIGVsc2VcbiAgICAgIEBzZWxlY3RUb0JlZ2lubmluZ09mTGluZSgpXG4gICAgQGRlbGV0ZVNlbGVjdGVkVGV4dCgpXG5cbiAgIyBQdWJsaWM6IFJlbW92ZXMgdGhlIHNlbGVjdGlvbiBvciB0aGUgbmV4dCBjaGFyYWN0ZXIgYWZ0ZXIgdGhlIHN0YXJ0IG9mIHRoZVxuICAjIHNlbGVjdGlvbiBpZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LlxuICBkZWxldGU6IC0+XG4gICAgQHNlbGVjdFJpZ2h0KCkgaWYgQGlzRW1wdHkoKVxuICAgIEBkZWxldGVTZWxlY3RlZFRleHQoKVxuXG4gICMgUHVibGljOiBJZiB0aGUgc2VsZWN0aW9uIGlzIGVtcHR5LCByZW1vdmVzIGFsbCB0ZXh0IGZyb20gdGhlIGN1cnNvciB0byB0aGVcbiAgIyBlbmQgb2YgdGhlIGxpbmUuIElmIHRoZSBjdXJzb3IgaXMgYWxyZWFkeSBhdCB0aGUgZW5kIG9mIHRoZSBsaW5lLCBpdFxuICAjIHJlbW92ZXMgdGhlIGZvbGxvd2luZyBuZXdsaW5lLiBJZiB0aGUgc2VsZWN0aW9uIGlzbid0IGVtcHR5LCBvbmx5IGRlbGV0ZXNcbiAgIyB0aGUgY29udGVudHMgb2YgdGhlIHNlbGVjdGlvbi5cbiAgZGVsZXRlVG9FbmRPZkxpbmU6IC0+XG4gICAgcmV0dXJuIEBkZWxldGUoKSBpZiBAaXNFbXB0eSgpIGFuZCBAY3Vyc29yLmlzQXRFbmRPZkxpbmUoKVxuICAgIEBzZWxlY3RUb0VuZE9mTGluZSgpIGlmIEBpc0VtcHR5KClcbiAgICBAZGVsZXRlU2VsZWN0ZWRUZXh0KClcblxuICAjIFB1YmxpYzogUmVtb3ZlcyB0aGUgc2VsZWN0aW9uIG9yIGFsbCBjaGFyYWN0ZXJzIGZyb20gdGhlIHN0YXJ0IG9mIHRoZVxuICAjIHNlbGVjdGlvbiB0byB0aGUgZW5kIG9mIHRoZSBjdXJyZW50IHdvcmQgaWYgbm90aGluZyBpcyBzZWxlY3RlZC5cbiAgZGVsZXRlVG9FbmRPZldvcmQ6IC0+XG4gICAgQHNlbGVjdFRvRW5kT2ZXb3JkKCkgaWYgQGlzRW1wdHkoKVxuICAgIEBkZWxldGVTZWxlY3RlZFRleHQoKVxuXG4gICMgUHVibGljOiBSZW1vdmVzIHRoZSBzZWxlY3Rpb24gb3IgYWxsIGNoYXJhY3RlcnMgZnJvbSB0aGUgc3RhcnQgb2YgdGhlXG4gICMgc2VsZWN0aW9uIHRvIHRoZSBlbmQgb2YgdGhlIGN1cnJlbnQgd29yZCBpZiBub3RoaW5nIGlzIHNlbGVjdGVkLlxuICBkZWxldGVUb0JlZ2lubmluZ09mU3Vid29yZDogLT5cbiAgICBAc2VsZWN0VG9QcmV2aW91c1N1YndvcmRCb3VuZGFyeSgpIGlmIEBpc0VtcHR5KClcbiAgICBAZGVsZXRlU2VsZWN0ZWRUZXh0KClcblxuICAjIFB1YmxpYzogUmVtb3ZlcyB0aGUgc2VsZWN0aW9uIG9yIGFsbCBjaGFyYWN0ZXJzIGZyb20gdGhlIHN0YXJ0IG9mIHRoZVxuICAjIHNlbGVjdGlvbiB0byB0aGUgZW5kIG9mIHRoZSBjdXJyZW50IHdvcmQgaWYgbm90aGluZyBpcyBzZWxlY3RlZC5cbiAgZGVsZXRlVG9FbmRPZlN1YndvcmQ6IC0+XG4gICAgQHNlbGVjdFRvTmV4dFN1YndvcmRCb3VuZGFyeSgpIGlmIEBpc0VtcHR5KClcbiAgICBAZGVsZXRlU2VsZWN0ZWRUZXh0KClcblxuICAjIFB1YmxpYzogUmVtb3ZlcyBvbmx5IHRoZSBzZWxlY3RlZCB0ZXh0LlxuICBkZWxldGVTZWxlY3RlZFRleHQ6IC0+XG4gICAgYnVmZmVyUmFuZ2UgPSBAZ2V0QnVmZmVyUmFuZ2UoKVxuICAgIEBlZGl0b3IuYnVmZmVyLmRlbGV0ZShidWZmZXJSYW5nZSkgdW5sZXNzIGJ1ZmZlclJhbmdlLmlzRW1wdHkoKVxuICAgIEBjdXJzb3I/LnNldEJ1ZmZlclBvc2l0aW9uKGJ1ZmZlclJhbmdlLnN0YXJ0KVxuXG4gICMgUHVibGljOiBSZW1vdmVzIHRoZSBsaW5lIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHNlbGVjdGlvbiBpZiB0aGUgc2VsZWN0aW9uXG4gICMgaXMgZW1wdHkgdW5sZXNzIHRoZSBzZWxlY3Rpb24gc3BhbnMgbXVsdGlwbGUgbGluZXMgaW4gd2hpY2ggY2FzZSBhbGwgbGluZXNcbiAgIyBhcmUgcmVtb3ZlZC5cbiAgZGVsZXRlTGluZTogLT5cbiAgICBpZiBAaXNFbXB0eSgpXG4gICAgICBzdGFydCA9IEBjdXJzb3IuZ2V0U2NyZWVuUm93KClcbiAgICAgIHJhbmdlID0gQGVkaXRvci5idWZmZXJSb3dzRm9yU2NyZWVuUm93cyhzdGFydCwgc3RhcnQgKyAxKVxuICAgICAgaWYgcmFuZ2VbMV0gPiByYW5nZVswXVxuICAgICAgICBAZWRpdG9yLmJ1ZmZlci5kZWxldGVSb3dzKHJhbmdlWzBdLCByYW5nZVsxXSAtIDEpXG4gICAgICBlbHNlXG4gICAgICAgIEBlZGl0b3IuYnVmZmVyLmRlbGV0ZVJvdyhyYW5nZVswXSlcbiAgICBlbHNlXG4gICAgICByYW5nZSA9IEBnZXRCdWZmZXJSYW5nZSgpXG4gICAgICBzdGFydCA9IHJhbmdlLnN0YXJ0LnJvd1xuICAgICAgZW5kID0gcmFuZ2UuZW5kLnJvd1xuICAgICAgaWYgZW5kIGlzbnQgQGVkaXRvci5idWZmZXIuZ2V0TGFzdFJvdygpIGFuZCByYW5nZS5lbmQuY29sdW1uIGlzIDBcbiAgICAgICAgZW5kLS1cbiAgICAgIEBlZGl0b3IuYnVmZmVyLmRlbGV0ZVJvd3Moc3RhcnQsIGVuZClcblxuICAjIFB1YmxpYzogSm9pbnMgdGhlIGN1cnJlbnQgbGluZSB3aXRoIHRoZSBvbmUgYmVsb3cgaXQuIExpbmVzIHdpbGxcbiAgIyBiZSBzZXBhcmF0ZWQgYnkgYSBzaW5nbGUgc3BhY2UuXG4gICNcbiAgIyBJZiB0aGVyZSBzZWxlY3Rpb24gc3BhbnMgbW9yZSB0aGFuIG9uZSBsaW5lLCBhbGwgdGhlIGxpbmVzIGFyZSBqb2luZWQgdG9nZXRoZXIuXG4gIGpvaW5MaW5lczogLT5cbiAgICBzZWxlY3RlZFJhbmdlID0gQGdldEJ1ZmZlclJhbmdlKClcbiAgICBpZiBzZWxlY3RlZFJhbmdlLmlzRW1wdHkoKVxuICAgICAgcmV0dXJuIGlmIHNlbGVjdGVkUmFuZ2Uuc3RhcnQucm93IGlzIEBlZGl0b3IuYnVmZmVyLmdldExhc3RSb3coKVxuICAgIGVsc2VcbiAgICAgIGpvaW5NYXJrZXIgPSBAZWRpdG9yLm1hcmtCdWZmZXJSYW5nZShzZWxlY3RlZFJhbmdlLCBpbnZhbGlkYXRlOiAnbmV2ZXInKVxuXG4gICAgcm93Q291bnQgPSBNYXRoLm1heCgxLCBzZWxlY3RlZFJhbmdlLmdldFJvd0NvdW50KCkgLSAxKVxuICAgIGZvciBbMC4uLnJvd0NvdW50XVxuICAgICAgQGN1cnNvci5zZXRCdWZmZXJQb3NpdGlvbihbc2VsZWN0ZWRSYW5nZS5zdGFydC5yb3ddKVxuICAgICAgQGN1cnNvci5tb3ZlVG9FbmRPZkxpbmUoKVxuXG4gICAgICAjIFJlbW92ZSB0cmFpbGluZyB3aGl0ZXNwYWNlIGZyb20gdGhlIGN1cnJlbnQgbGluZVxuICAgICAgc2NhblJhbmdlID0gQGN1cnNvci5nZXRDdXJyZW50TGluZUJ1ZmZlclJhbmdlKClcbiAgICAgIHRyYWlsaW5nV2hpdGVzcGFjZVJhbmdlID0gbnVsbFxuICAgICAgQGVkaXRvci5zY2FuSW5CdWZmZXJSYW5nZSAvWyBcXHRdKyQvLCBzY2FuUmFuZ2UsICh7cmFuZ2V9KSAtPlxuICAgICAgICB0cmFpbGluZ1doaXRlc3BhY2VSYW5nZSA9IHJhbmdlXG4gICAgICBpZiB0cmFpbGluZ1doaXRlc3BhY2VSYW5nZT9cbiAgICAgICAgQHNldEJ1ZmZlclJhbmdlKHRyYWlsaW5nV2hpdGVzcGFjZVJhbmdlKVxuICAgICAgICBAZGVsZXRlU2VsZWN0ZWRUZXh0KClcblxuICAgICAgY3VycmVudFJvdyA9IHNlbGVjdGVkUmFuZ2Uuc3RhcnQucm93XG4gICAgICBuZXh0Um93ID0gY3VycmVudFJvdyArIDFcbiAgICAgIGluc2VydFNwYWNlID0gbmV4dFJvdyA8PSBAZWRpdG9yLmJ1ZmZlci5nZXRMYXN0Um93KCkgYW5kXG4gICAgICAgICAgICAgICAgICAgIEBlZGl0b3IuYnVmZmVyLmxpbmVMZW5ndGhGb3JSb3cobmV4dFJvdykgPiAwIGFuZFxuICAgICAgICAgICAgICAgICAgICBAZWRpdG9yLmJ1ZmZlci5saW5lTGVuZ3RoRm9yUm93KGN1cnJlbnRSb3cpID4gMFxuICAgICAgQGluc2VydFRleHQoJyAnKSBpZiBpbnNlcnRTcGFjZVxuXG4gICAgICBAY3Vyc29yLm1vdmVUb0VuZE9mTGluZSgpXG5cbiAgICAgICMgUmVtb3ZlIGxlYWRpbmcgd2hpdGVzcGFjZSBmcm9tIHRoZSBsaW5lIGJlbG93XG4gICAgICBAbW9kaWZ5U2VsZWN0aW9uID0+XG4gICAgICAgIEBjdXJzb3IubW92ZVJpZ2h0KClcbiAgICAgICAgQGN1cnNvci5tb3ZlVG9GaXJzdENoYXJhY3Rlck9mTGluZSgpXG4gICAgICBAZGVsZXRlU2VsZWN0ZWRUZXh0KClcblxuICAgICAgQGN1cnNvci5tb3ZlTGVmdCgpIGlmIGluc2VydFNwYWNlXG5cbiAgICBpZiBqb2luTWFya2VyP1xuICAgICAgbmV3U2VsZWN0ZWRSYW5nZSA9IGpvaW5NYXJrZXIuZ2V0QnVmZmVyUmFuZ2UoKVxuICAgICAgQHNldEJ1ZmZlclJhbmdlKG5ld1NlbGVjdGVkUmFuZ2UpXG4gICAgICBqb2luTWFya2VyLmRlc3Ryb3koKVxuXG4gICMgUHVibGljOiBSZW1vdmVzIG9uZSBsZXZlbCBvZiBpbmRlbnQgZnJvbSB0aGUgY3VycmVudGx5IHNlbGVjdGVkIHJvd3MuXG4gIG91dGRlbnRTZWxlY3RlZFJvd3M6IC0+XG4gICAgW3N0YXJ0LCBlbmRdID0gQGdldEJ1ZmZlclJvd1JhbmdlKClcbiAgICBidWZmZXIgPSBAZWRpdG9yLmJ1ZmZlclxuICAgIGxlYWRpbmdUYWJSZWdleCA9IG5ldyBSZWdFeHAoXCJeKCB7MSwje0BlZGl0b3IuZ2V0VGFiTGVuZ3RoKCl9fXxcXHQpXCIpXG4gICAgZm9yIHJvdyBpbiBbc3RhcnQuLmVuZF1cbiAgICAgIGlmIG1hdGNoTGVuZ3RoID0gYnVmZmVyLmxpbmVGb3JSb3cocm93KS5tYXRjaChsZWFkaW5nVGFiUmVnZXgpP1swXS5sZW5ndGhcbiAgICAgICAgYnVmZmVyLmRlbGV0ZSBbW3JvdywgMF0sIFtyb3csIG1hdGNoTGVuZ3RoXV1cbiAgICByZXR1cm5cblxuICAjIFB1YmxpYzogU2V0cyB0aGUgaW5kZW50YXRpb24gbGV2ZWwgb2YgYWxsIHNlbGVjdGVkIHJvd3MgdG8gdmFsdWVzIHN1Z2dlc3RlZFxuICAjIGJ5IHRoZSByZWxldmFudCBncmFtbWFycy5cbiAgYXV0b0luZGVudFNlbGVjdGVkUm93czogLT5cbiAgICBbc3RhcnQsIGVuZF0gPSBAZ2V0QnVmZmVyUm93UmFuZ2UoKVxuICAgIEBlZGl0b3IuYXV0b0luZGVudEJ1ZmZlclJvd3Moc3RhcnQsIGVuZClcblxuICAjIFB1YmxpYzogV3JhcHMgdGhlIHNlbGVjdGVkIGxpbmVzIGluIGNvbW1lbnRzIGlmIHRoZXkgYXJlbid0IGN1cnJlbnRseSBwYXJ0XG4gICMgb2YgYSBjb21tZW50LlxuICAjXG4gICMgUmVtb3ZlcyB0aGUgY29tbWVudCBpZiB0aGV5IGFyZSBjdXJyZW50bHkgd3JhcHBlZCBpbiBhIGNvbW1lbnQuXG4gIHRvZ2dsZUxpbmVDb21tZW50czogLT5cbiAgICBAZWRpdG9yLnRvZ2dsZUxpbmVDb21tZW50c0ZvckJ1ZmZlclJvd3MoQGdldEJ1ZmZlclJvd1JhbmdlKCkuLi4pXG5cbiAgIyBQdWJsaWM6IEN1dHMgdGhlIHNlbGVjdGlvbiB1bnRpbCB0aGUgZW5kIG9mIHRoZSBzY3JlZW4gbGluZS5cbiAgY3V0VG9FbmRPZkxpbmU6IChtYWludGFpbkNsaXBib2FyZCkgLT5cbiAgICBAc2VsZWN0VG9FbmRPZkxpbmUoKSBpZiBAaXNFbXB0eSgpXG4gICAgQGN1dChtYWludGFpbkNsaXBib2FyZClcblxuICAjIFB1YmxpYzogQ3V0cyB0aGUgc2VsZWN0aW9uIHVudGlsIHRoZSBlbmQgb2YgdGhlIGJ1ZmZlciBsaW5lLlxuICBjdXRUb0VuZE9mQnVmZmVyTGluZTogKG1haW50YWluQ2xpcGJvYXJkKSAtPlxuICAgIEBzZWxlY3RUb0VuZE9mQnVmZmVyTGluZSgpIGlmIEBpc0VtcHR5KClcbiAgICBAY3V0KG1haW50YWluQ2xpcGJvYXJkKVxuXG4gICMgUHVibGljOiBDb3BpZXMgdGhlIHNlbGVjdGlvbiB0byB0aGUgY2xpcGJvYXJkIGFuZCB0aGVuIGRlbGV0ZXMgaXQuXG4gICNcbiAgIyAqIGBtYWludGFpbkNsaXBib2FyZGAge0Jvb2xlYW59IChkZWZhdWx0OiBmYWxzZSkgU2VlIHs6OmNvcHl9XG4gICMgKiBgZnVsbExpbmVgIHtCb29sZWFufSAoZGVmYXVsdDogZmFsc2UpIFNlZSB7Ojpjb3B5fVxuICBjdXQ6IChtYWludGFpbkNsaXBib2FyZD1mYWxzZSwgZnVsbExpbmU9ZmFsc2UpIC0+XG4gICAgQGNvcHkobWFpbnRhaW5DbGlwYm9hcmQsIGZ1bGxMaW5lKVxuICAgIEBkZWxldGUoKVxuXG4gICMgUHVibGljOiBDb3BpZXMgdGhlIGN1cnJlbnQgc2VsZWN0aW9uIHRvIHRoZSBjbGlwYm9hcmQuXG4gICNcbiAgIyAqIGBtYWludGFpbkNsaXBib2FyZGAge0Jvb2xlYW59IGlmIGB0cnVlYCwgYSBzcGVjaWZpYyBtZXRhZGF0YSBwcm9wZXJ0eVxuICAjICAgaXMgY3JlYXRlZCB0byBzdG9yZSBlYWNoIGNvbnRlbnQgY29waWVkIHRvIHRoZSBjbGlwYm9hcmQuIFRoZSBjbGlwYm9hcmRcbiAgIyAgIGB0ZXh0YCBzdGlsbCBjb250YWlucyB0aGUgY29uY2F0ZW5hdGlvbiBvZiB0aGUgY2xpcGJvYXJkIHdpdGggdGhlXG4gICMgICBjdXJyZW50IHNlbGVjdGlvbi4gKGRlZmF1bHQ6IGZhbHNlKVxuICAjICogYGZ1bGxMaW5lYCB7Qm9vbGVhbn0gaWYgYHRydWVgLCB0aGUgY29waWVkIHRleHQgd2lsbCBhbHdheXMgYmUgcGFzdGVkXG4gICMgICBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBsaW5lIGNvbnRhaW5pbmcgdGhlIGN1cnNvciwgcmVnYXJkbGVzcyBvZiB0aGVcbiAgIyAgIGN1cnNvcidzIGhvcml6b250YWwgcG9zaXRpb24uIChkZWZhdWx0OiBmYWxzZSlcbiAgY29weTogKG1haW50YWluQ2xpcGJvYXJkPWZhbHNlLCBmdWxsTGluZT1mYWxzZSkgLT5cbiAgICByZXR1cm4gaWYgQGlzRW1wdHkoKVxuICAgIHtzdGFydCwgZW5kfSA9IEBnZXRCdWZmZXJSYW5nZSgpXG4gICAgc2VsZWN0aW9uVGV4dCA9IEBlZGl0b3IuZ2V0VGV4dEluUmFuZ2UoW3N0YXJ0LCBlbmRdKVxuICAgIHByZWNlZGluZ1RleHQgPSBAZWRpdG9yLmdldFRleHRJblJhbmdlKFtbc3RhcnQucm93LCAwXSwgc3RhcnRdKVxuICAgIHN0YXJ0TGV2ZWwgPSBAZWRpdG9yLmluZGVudExldmVsRm9yTGluZShwcmVjZWRpbmdUZXh0KVxuXG4gICAgaWYgbWFpbnRhaW5DbGlwYm9hcmRcbiAgICAgIHt0ZXh0OiBjbGlwYm9hcmRUZXh0LCBtZXRhZGF0YX0gPSBAZWRpdG9yLmNvbnN0cnVjdG9yLmNsaXBib2FyZC5yZWFkV2l0aE1ldGFkYXRhKClcbiAgICAgIG1ldGFkYXRhID89IHt9XG4gICAgICB1bmxlc3MgbWV0YWRhdGEuc2VsZWN0aW9ucz9cbiAgICAgICAgbWV0YWRhdGEuc2VsZWN0aW9ucyA9IFt7XG4gICAgICAgICAgdGV4dDogY2xpcGJvYXJkVGV4dCxcbiAgICAgICAgICBpbmRlbnRCYXNpczogbWV0YWRhdGEuaW5kZW50QmFzaXMsXG4gICAgICAgICAgZnVsbExpbmU6IG1ldGFkYXRhLmZ1bGxMaW5lLFxuICAgICAgICB9XVxuICAgICAgbWV0YWRhdGEuc2VsZWN0aW9ucy5wdXNoKHtcbiAgICAgICAgdGV4dDogc2VsZWN0aW9uVGV4dCxcbiAgICAgICAgaW5kZW50QmFzaXM6IHN0YXJ0TGV2ZWwsXG4gICAgICAgIGZ1bGxMaW5lOiBmdWxsTGluZVxuICAgICAgfSlcbiAgICAgIEBlZGl0b3IuY29uc3RydWN0b3IuY2xpcGJvYXJkLndyaXRlKFtjbGlwYm9hcmRUZXh0LCBzZWxlY3Rpb25UZXh0XS5qb2luKFwiXFxuXCIpLCBtZXRhZGF0YSlcbiAgICBlbHNlXG4gICAgICBAZWRpdG9yLmNvbnN0cnVjdG9yLmNsaXBib2FyZC53cml0ZShzZWxlY3Rpb25UZXh0LCB7XG4gICAgICAgIGluZGVudEJhc2lzOiBzdGFydExldmVsLFxuICAgICAgICBmdWxsTGluZTogZnVsbExpbmVcbiAgICAgIH0pXG5cbiAgIyBQdWJsaWM6IENyZWF0ZXMgYSBmb2xkIGNvbnRhaW5pbmcgdGhlIGN1cnJlbnQgc2VsZWN0aW9uLlxuICBmb2xkOiAtPlxuICAgIHJhbmdlID0gQGdldEJ1ZmZlclJhbmdlKClcbiAgICB1bmxlc3MgcmFuZ2UuaXNFbXB0eSgpXG4gICAgICBAZWRpdG9yLmZvbGRCdWZmZXJSYW5nZShyYW5nZSlcbiAgICAgIEBjdXJzb3Iuc2V0QnVmZmVyUG9zaXRpb24ocmFuZ2UuZW5kKVxuXG4gICMgUHJpdmF0ZTogSW5jcmVhc2UgdGhlIGluZGVudGF0aW9uIGxldmVsIG9mIHRoZSBnaXZlbiB0ZXh0IGJ5IGdpdmVuIG51bWJlclxuICAjIG9mIGxldmVscy4gTGVhdmVzIHRoZSBmaXJzdCBsaW5lIHVuY2hhbmdlZC5cbiAgYWRqdXN0SW5kZW50OiAobGluZXMsIGluZGVudEFkanVzdG1lbnQpIC0+XG4gICAgZm9yIGxpbmUsIGkgaW4gbGluZXNcbiAgICAgIGlmIGluZGVudEFkanVzdG1lbnQgaXMgMCBvciBsaW5lIGlzICcnXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICBlbHNlIGlmIGluZGVudEFkanVzdG1lbnQgPiAwXG4gICAgICAgIGxpbmVzW2ldID0gQGVkaXRvci5idWlsZEluZGVudFN0cmluZyhpbmRlbnRBZGp1c3RtZW50KSArIGxpbmVcbiAgICAgIGVsc2VcbiAgICAgICAgY3VycmVudEluZGVudExldmVsID0gQGVkaXRvci5pbmRlbnRMZXZlbEZvckxpbmUobGluZXNbaV0pXG4gICAgICAgIGluZGVudExldmVsID0gTWF0aC5tYXgoMCwgY3VycmVudEluZGVudExldmVsICsgaW5kZW50QWRqdXN0bWVudClcbiAgICAgICAgbGluZXNbaV0gPSBsaW5lLnJlcGxhY2UoL15bXFx0IF0rLywgQGVkaXRvci5idWlsZEluZGVudFN0cmluZyhpbmRlbnRMZXZlbCkpXG4gICAgcmV0dXJuXG5cbiAgIyBJbmRlbnQgdGhlIGN1cnJlbnQgbGluZShzKS5cbiAgI1xuICAjIElmIHRoZSBzZWxlY3Rpb24gaXMgZW1wdHksIGluZGVudHMgdGhlIGN1cnJlbnQgbGluZSBpZiB0aGUgY3Vyc29yIHByZWNlZGVzXG4gICMgbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVycywgYW5kIG90aGVyd2lzZSBpbnNlcnRzIGEgdGFiLiBJZiB0aGUgc2VsZWN0aW9uIGlzXG4gICMgbm9uIGVtcHR5LCBjYWxscyB7OjppbmRlbnRTZWxlY3RlZFJvd3N9LlxuICAjXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSB3aXRoIHRoZSBrZXlzOlxuICAjICAgKiBgYXV0b0luZGVudGAgSWYgYHRydWVgLCB0aGUgbGluZSBpcyBpbmRlbnRlZCB0byBhbiBhdXRvbWF0aWNhbGx5LWluZmVycmVkXG4gICMgICAgIGxldmVsLiBPdGhlcndpc2UsIHtUZXh0RWRpdG9yOjpnZXRUYWJUZXh0fSBpcyBpbnNlcnRlZC5cbiAgaW5kZW50OiAoe2F1dG9JbmRlbnR9PXt9KSAtPlxuICAgIHtyb3d9ID0gQGN1cnNvci5nZXRCdWZmZXJQb3NpdGlvbigpXG5cbiAgICBpZiBAaXNFbXB0eSgpXG4gICAgICBAY3Vyc29yLnNraXBMZWFkaW5nV2hpdGVzcGFjZSgpXG4gICAgICBkZXNpcmVkSW5kZW50ID0gQGVkaXRvci5zdWdnZXN0ZWRJbmRlbnRGb3JCdWZmZXJSb3cocm93KVxuICAgICAgZGVsdGEgPSBkZXNpcmVkSW5kZW50IC0gQGN1cnNvci5nZXRJbmRlbnRMZXZlbCgpXG5cbiAgICAgIGlmIGF1dG9JbmRlbnQgYW5kIGRlbHRhID4gMFxuICAgICAgICBkZWx0YSA9IE1hdGgubWF4KGRlbHRhLCAxKSB1bmxlc3MgQGVkaXRvci5nZXRTb2Z0VGFicygpXG4gICAgICAgIEBpbnNlcnRUZXh0KEBlZGl0b3IuYnVpbGRJbmRlbnRTdHJpbmcoZGVsdGEpKVxuICAgICAgZWxzZVxuICAgICAgICBAaW5zZXJ0VGV4dChAZWRpdG9yLmJ1aWxkSW5kZW50U3RyaW5nKDEsIEBjdXJzb3IuZ2V0QnVmZmVyQ29sdW1uKCkpKVxuICAgIGVsc2VcbiAgICAgIEBpbmRlbnRTZWxlY3RlZFJvd3MoKVxuXG4gICMgUHVibGljOiBJZiB0aGUgc2VsZWN0aW9uIHNwYW5zIG11bHRpcGxlIHJvd3MsIGluZGVudCBhbGwgb2YgdGhlbS5cbiAgaW5kZW50U2VsZWN0ZWRSb3dzOiAtPlxuICAgIFtzdGFydCwgZW5kXSA9IEBnZXRCdWZmZXJSb3dSYW5nZSgpXG4gICAgZm9yIHJvdyBpbiBbc3RhcnQuLmVuZF1cbiAgICAgIEBlZGl0b3IuYnVmZmVyLmluc2VydChbcm93LCAwXSwgQGVkaXRvci5nZXRUYWJUZXh0KCkpIHVubGVzcyBAZWRpdG9yLmJ1ZmZlci5saW5lTGVuZ3RoRm9yUm93KHJvdykgaXMgMFxuICAgIHJldHVyblxuXG4gICMjI1xuICBTZWN0aW9uOiBNYW5hZ2luZyBtdWx0aXBsZSBzZWxlY3Rpb25zXG4gICMjI1xuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgc2VsZWN0aW9uIGRvd24gb25lIHJvdy5cbiAgYWRkU2VsZWN0aW9uQmVsb3c6IC0+XG4gICAgcmFuZ2UgPSBAZ2V0R29hbFNjcmVlblJhbmdlKCkuY29weSgpXG4gICAgbmV4dFJvdyA9IHJhbmdlLmVuZC5yb3cgKyAxXG5cbiAgICBmb3Igcm93IGluIFtuZXh0Um93Li5AZWRpdG9yLmdldExhc3RTY3JlZW5Sb3coKV1cbiAgICAgIHJhbmdlLnN0YXJ0LnJvdyA9IHJvd1xuICAgICAgcmFuZ2UuZW5kLnJvdyA9IHJvd1xuICAgICAgY2xpcHBlZFJhbmdlID0gQGVkaXRvci5jbGlwU2NyZWVuUmFuZ2UocmFuZ2UsIHNraXBTb2Z0V3JhcEluZGVudGF0aW9uOiB0cnVlKVxuXG4gICAgICBpZiByYW5nZS5pc0VtcHR5KClcbiAgICAgICAgY29udGludWUgaWYgcmFuZ2UuZW5kLmNvbHVtbiA+IDAgYW5kIGNsaXBwZWRSYW5nZS5lbmQuY29sdW1uIGlzIDBcbiAgICAgIGVsc2VcbiAgICAgICAgY29udGludWUgaWYgY2xpcHBlZFJhbmdlLmlzRW1wdHkoKVxuXG4gICAgICBzZWxlY3Rpb24gPSBAZWRpdG9yLmFkZFNlbGVjdGlvbkZvclNjcmVlblJhbmdlKGNsaXBwZWRSYW5nZSlcbiAgICAgIHNlbGVjdGlvbi5zZXRHb2FsU2NyZWVuUmFuZ2UocmFuZ2UpXG4gICAgICBicmVha1xuXG4gICAgcmV0dXJuXG5cbiAgIyBQdWJsaWM6IE1vdmVzIHRoZSBzZWxlY3Rpb24gdXAgb25lIHJvdy5cbiAgYWRkU2VsZWN0aW9uQWJvdmU6IC0+XG4gICAgcmFuZ2UgPSBAZ2V0R29hbFNjcmVlblJhbmdlKCkuY29weSgpXG4gICAgcHJldmlvdXNSb3cgPSByYW5nZS5lbmQucm93IC0gMVxuXG4gICAgZm9yIHJvdyBpbiBbcHJldmlvdXNSb3cuLjBdXG4gICAgICByYW5nZS5zdGFydC5yb3cgPSByb3dcbiAgICAgIHJhbmdlLmVuZC5yb3cgPSByb3dcbiAgICAgIGNsaXBwZWRSYW5nZSA9IEBlZGl0b3IuY2xpcFNjcmVlblJhbmdlKHJhbmdlLCBza2lwU29mdFdyYXBJbmRlbnRhdGlvbjogdHJ1ZSlcblxuICAgICAgaWYgcmFuZ2UuaXNFbXB0eSgpXG4gICAgICAgIGNvbnRpbnVlIGlmIHJhbmdlLmVuZC5jb2x1bW4gPiAwIGFuZCBjbGlwcGVkUmFuZ2UuZW5kLmNvbHVtbiBpcyAwXG4gICAgICBlbHNlXG4gICAgICAgIGNvbnRpbnVlIGlmIGNsaXBwZWRSYW5nZS5pc0VtcHR5KClcblxuICAgICAgc2VsZWN0aW9uID0gQGVkaXRvci5hZGRTZWxlY3Rpb25Gb3JTY3JlZW5SYW5nZShjbGlwcGVkUmFuZ2UpXG4gICAgICBzZWxlY3Rpb24uc2V0R29hbFNjcmVlblJhbmdlKHJhbmdlKVxuICAgICAgYnJlYWtcblxuICAgIHJldHVyblxuXG4gICMgUHVibGljOiBDb21iaW5lcyB0aGUgZ2l2ZW4gc2VsZWN0aW9uIGludG8gdGhpcyBzZWxlY3Rpb24gYW5kIHRoZW4gZGVzdHJveXNcbiAgIyB0aGUgZ2l2ZW4gc2VsZWN0aW9uLlxuICAjXG4gICMgKiBgb3RoZXJTZWxlY3Rpb25gIEEge1NlbGVjdGlvbn0gdG8gbWVyZ2Ugd2l0aC5cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9IG9wdGlvbnMgbWF0Y2hpbmcgdGhvc2UgZm91bmQgaW4gezo6c2V0QnVmZmVyUmFuZ2V9LlxuICBtZXJnZTogKG90aGVyU2VsZWN0aW9uLCBvcHRpb25zKSAtPlxuICAgIG15R29hbFNjcmVlblJhbmdlID0gQGdldEdvYWxTY3JlZW5SYW5nZSgpXG4gICAgb3RoZXJHb2FsU2NyZWVuUmFuZ2UgPSBvdGhlclNlbGVjdGlvbi5nZXRHb2FsU2NyZWVuUmFuZ2UoKVxuXG4gICAgaWYgbXlHb2FsU2NyZWVuUmFuZ2U/IGFuZCBvdGhlckdvYWxTY3JlZW5SYW5nZT9cbiAgICAgIG9wdGlvbnMuZ29hbFNjcmVlblJhbmdlID0gbXlHb2FsU2NyZWVuUmFuZ2UudW5pb24ob3RoZXJHb2FsU2NyZWVuUmFuZ2UpXG4gICAgZWxzZVxuICAgICAgb3B0aW9ucy5nb2FsU2NyZWVuUmFuZ2UgPSBteUdvYWxTY3JlZW5SYW5nZSA/IG90aGVyR29hbFNjcmVlblJhbmdlXG5cbiAgICBAc2V0QnVmZmVyUmFuZ2UoQGdldEJ1ZmZlclJhbmdlKCkudW5pb24ob3RoZXJTZWxlY3Rpb24uZ2V0QnVmZmVyUmFuZ2UoKSksIE9iamVjdC5hc3NpZ24oYXV0b3Njcm9sbDogZmFsc2UsIG9wdGlvbnMpKVxuICAgIG90aGVyU2VsZWN0aW9uLmRlc3Ryb3koKVxuXG4gICMjI1xuICBTZWN0aW9uOiBDb21wYXJpbmcgdG8gb3RoZXIgc2VsZWN0aW9uc1xuICAjIyNcblxuICAjIFB1YmxpYzogQ29tcGFyZSB0aGlzIHNlbGVjdGlvbidzIGJ1ZmZlciByYW5nZSB0byBhbm90aGVyIHNlbGVjdGlvbidzIGJ1ZmZlclxuICAjIHJhbmdlLlxuICAjXG4gICMgU2VlIHtSYW5nZTo6Y29tcGFyZX0gZm9yIG1vcmUgZGV0YWlscy5cbiAgI1xuICAjICogYG90aGVyU2VsZWN0aW9uYCBBIHtTZWxlY3Rpb259IHRvIGNvbXBhcmUgYWdhaW5zdFxuICBjb21wYXJlOiAob3RoZXJTZWxlY3Rpb24pIC0+XG4gICAgQG1hcmtlci5jb21wYXJlKG90aGVyU2VsZWN0aW9uLm1hcmtlcilcblxuICAjIyNcbiAgU2VjdGlvbjogUHJpdmF0ZSBVdGlsaXRpZXNcbiAgIyMjXG5cbiAgc2V0R29hbFNjcmVlblJhbmdlOiAocmFuZ2UpIC0+XG4gICAgQGdvYWxTY3JlZW5SYW5nZSA9IFJhbmdlLmZyb21PYmplY3QocmFuZ2UpXG5cbiAgZ2V0R29hbFNjcmVlblJhbmdlOiAtPlxuICAgIEBnb2FsU2NyZWVuUmFuZ2UgPyBAZ2V0U2NyZWVuUmFuZ2UoKVxuXG4gIG1hcmtlckRpZENoYW5nZTogKGUpIC0+XG4gICAge29sZEhlYWRCdWZmZXJQb3NpdGlvbiwgb2xkVGFpbEJ1ZmZlclBvc2l0aW9uLCBuZXdIZWFkQnVmZmVyUG9zaXRpb259ID0gZVxuICAgIHtvbGRIZWFkU2NyZWVuUG9zaXRpb24sIG9sZFRhaWxTY3JlZW5Qb3NpdGlvbiwgbmV3SGVhZFNjcmVlblBvc2l0aW9ufSA9IGVcbiAgICB7dGV4dENoYW5nZWR9ID0gZVxuXG4gICAgQGN1cnNvci51cGRhdGVWaXNpYmlsaXR5KClcblxuICAgIHVubGVzcyBvbGRIZWFkU2NyZWVuUG9zaXRpb24uaXNFcXVhbChuZXdIZWFkU2NyZWVuUG9zaXRpb24pXG4gICAgICBAY3Vyc29yLmdvYWxDb2x1bW4gPSBudWxsXG4gICAgICBjdXJzb3JNb3ZlZEV2ZW50ID0ge1xuICAgICAgICBvbGRCdWZmZXJQb3NpdGlvbjogb2xkSGVhZEJ1ZmZlclBvc2l0aW9uXG4gICAgICAgIG9sZFNjcmVlblBvc2l0aW9uOiBvbGRIZWFkU2NyZWVuUG9zaXRpb25cbiAgICAgICAgbmV3QnVmZmVyUG9zaXRpb246IG5ld0hlYWRCdWZmZXJQb3NpdGlvblxuICAgICAgICBuZXdTY3JlZW5Qb3NpdGlvbjogbmV3SGVhZFNjcmVlblBvc2l0aW9uXG4gICAgICAgIHRleHRDaGFuZ2VkOiB0ZXh0Q2hhbmdlZFxuICAgICAgICBjdXJzb3I6IEBjdXJzb3JcbiAgICAgIH1cbiAgICAgIEBjdXJzb3IuZW1pdHRlci5lbWl0KCdkaWQtY2hhbmdlLXBvc2l0aW9uJywgY3Vyc29yTW92ZWRFdmVudClcbiAgICAgIEBlZGl0b3IuY3Vyc29yTW92ZWQoY3Vyc29yTW92ZWRFdmVudClcblxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2UtcmFuZ2UnXG4gICAgQGVkaXRvci5zZWxlY3Rpb25SYW5nZUNoYW5nZWQoXG4gICAgICBvbGRCdWZmZXJSYW5nZTogbmV3IFJhbmdlKG9sZEhlYWRCdWZmZXJQb3NpdGlvbiwgb2xkVGFpbEJ1ZmZlclBvc2l0aW9uKVxuICAgICAgb2xkU2NyZWVuUmFuZ2U6IG5ldyBSYW5nZShvbGRIZWFkU2NyZWVuUG9zaXRpb24sIG9sZFRhaWxTY3JlZW5Qb3NpdGlvbilcbiAgICAgIG5ld0J1ZmZlclJhbmdlOiBAZ2V0QnVmZmVyUmFuZ2UoKVxuICAgICAgbmV3U2NyZWVuUmFuZ2U6IEBnZXRTY3JlZW5SYW5nZSgpXG4gICAgICBzZWxlY3Rpb246IHRoaXNcbiAgICApXG5cbiAgbWFya2VyRGlkRGVzdHJveTogLT5cbiAgICByZXR1cm4gaWYgQGVkaXRvci5pc0Rlc3Ryb3llZCgpXG5cbiAgICBAZGVzdHJveWVkID0gdHJ1ZVxuICAgIEBjdXJzb3IuZGVzdHJveWVkID0gdHJ1ZVxuXG4gICAgQGVkaXRvci5yZW1vdmVTZWxlY3Rpb24odGhpcylcblxuICAgIEBjdXJzb3IuZW1pdHRlci5lbWl0ICdkaWQtZGVzdHJveSdcbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtZGVzdHJveSdcblxuICAgIEBjdXJzb3IuZW1pdHRlci5kaXNwb3NlKClcbiAgICBAZW1pdHRlci5kaXNwb3NlKClcblxuICBmaW5hbGl6ZTogLT5cbiAgICBAaW5pdGlhbFNjcmVlblJhbmdlID0gbnVsbCB1bmxlc3MgQGluaXRpYWxTY3JlZW5SYW5nZT8uaXNFcXVhbChAZ2V0U2NyZWVuUmFuZ2UoKSlcbiAgICBpZiBAaXNFbXB0eSgpXG4gICAgICBAd29yZHdpc2UgPSBmYWxzZVxuICAgICAgQGxpbmV3aXNlID0gZmFsc2VcblxuICBhdXRvc2Nyb2xsOiAob3B0aW9ucykgLT5cbiAgICBpZiBAbWFya2VyLmhhc1RhaWwoKVxuICAgICAgQGVkaXRvci5zY3JvbGxUb1NjcmVlblJhbmdlKEBnZXRTY3JlZW5SYW5nZSgpLCBPYmplY3QuYXNzaWduKHtyZXZlcnNlZDogQGlzUmV2ZXJzZWQoKX0sIG9wdGlvbnMpKVxuICAgIGVsc2VcbiAgICAgIEBjdXJzb3IuYXV0b3Njcm9sbChvcHRpb25zKVxuXG4gIGNsZWFyQXV0b3Njcm9sbDogLT5cblxuICBtb2RpZnlTZWxlY3Rpb246IChmbikgLT5cbiAgICBAcmV0YWluU2VsZWN0aW9uID0gdHJ1ZVxuICAgIEBwbGFudFRhaWwoKVxuICAgIGZuKClcbiAgICBAcmV0YWluU2VsZWN0aW9uID0gZmFsc2VcblxuICAjIFNldHMgdGhlIG1hcmtlcidzIHRhaWwgdG8gdGhlIHNhbWUgcG9zaXRpb24gYXMgdGhlIG1hcmtlcidzIGhlYWQuXG4gICNcbiAgIyBUaGlzIG9ubHkgd29ya3MgaWYgdGhlcmUgaXNuJ3QgYWxyZWFkeSBhIHRhaWwgcG9zaXRpb24uXG4gICNcbiAgIyBSZXR1cm5zIGEge1BvaW50fSByZXByZXNlbnRpbmcgdGhlIG5ldyB0YWlsIHBvc2l0aW9uLlxuICBwbGFudFRhaWw6IC0+XG4gICAgQG1hcmtlci5wbGFudFRhaWwoKVxuIl19
