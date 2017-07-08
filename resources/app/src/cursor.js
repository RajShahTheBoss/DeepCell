(function() {
  var Cursor, Emitter, EmptyLineRegExp, Model, Point, Range, _, ref,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  ref = require('text-buffer'), Point = ref.Point, Range = ref.Range;

  Emitter = require('event-kit').Emitter;

  _ = require('underscore-plus');

  Model = require('./model');

  EmptyLineRegExp = /(\r\n[\t ]*\r\n)|(\n[\t ]*\n)/g;

  module.exports = Cursor = (function(superClass) {
    extend(Cursor, superClass);

    Cursor.prototype.showCursorOnSelection = null;

    Cursor.prototype.screenPosition = null;

    Cursor.prototype.bufferPosition = null;

    Cursor.prototype.goalColumn = null;

    Cursor.prototype.visible = true;

    function Cursor(arg) {
      var id;
      this.editor = arg.editor, this.marker = arg.marker, this.showCursorOnSelection = arg.showCursorOnSelection, id = arg.id;
      this.emitter = new Emitter;
      if (this.showCursorOnSelection == null) {
        this.showCursorOnSelection = true;
      }
      this.assignId(id);
      this.updateVisibility();
    }

    Cursor.prototype.destroy = function() {
      return this.marker.destroy();
    };


    /*
    Section: Event Subscription
     */

    Cursor.prototype.onDidChangePosition = function(callback) {
      return this.emitter.on('did-change-position', callback);
    };

    Cursor.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };

    Cursor.prototype.onDidChangeVisibility = function(callback) {
      return this.emitter.on('did-change-visibility', callback);
    };


    /*
    Section: Managing Cursor Position
     */

    Cursor.prototype.setScreenPosition = function(screenPosition, options) {
      if (options == null) {
        options = {};
      }
      return this.changePosition(options, (function(_this) {
        return function() {
          return _this.marker.setHeadScreenPosition(screenPosition, options);
        };
      })(this));
    };

    Cursor.prototype.getScreenPosition = function() {
      return this.marker.getHeadScreenPosition();
    };

    Cursor.prototype.setBufferPosition = function(bufferPosition, options) {
      if (options == null) {
        options = {};
      }
      return this.changePosition(options, (function(_this) {
        return function() {
          return _this.marker.setHeadBufferPosition(bufferPosition, options);
        };
      })(this));
    };

    Cursor.prototype.getBufferPosition = function() {
      return this.marker.getHeadBufferPosition();
    };

    Cursor.prototype.getScreenRow = function() {
      return this.getScreenPosition().row;
    };

    Cursor.prototype.getScreenColumn = function() {
      return this.getScreenPosition().column;
    };

    Cursor.prototype.getBufferRow = function() {
      return this.getBufferPosition().row;
    };

    Cursor.prototype.getBufferColumn = function() {
      return this.getBufferPosition().column;
    };

    Cursor.prototype.getCurrentBufferLine = function() {
      return this.editor.lineTextForBufferRow(this.getBufferRow());
    };

    Cursor.prototype.isAtBeginningOfLine = function() {
      return this.getBufferPosition().column === 0;
    };

    Cursor.prototype.isAtEndOfLine = function() {
      return this.getBufferPosition().isEqual(this.getCurrentLineBufferRange().end);
    };


    /*
    Section: Cursor Position Details
     */

    Cursor.prototype.getMarker = function() {
      return this.marker;
    };

    Cursor.prototype.isSurroundedByWhitespace = function() {
      var column, range, ref1, row;
      ref1 = this.getBufferPosition(), row = ref1.row, column = ref1.column;
      range = [[row, column - 1], [row, column + 1]];
      return /^\s+$/.test(this.editor.getTextInBufferRange(range));
    };

    Cursor.prototype.isBetweenWordAndNonWord = function() {
      var after, before, column, nonWordCharacters, range, ref1, ref2, row;
      if (this.isAtBeginningOfLine() || this.isAtEndOfLine()) {
        return false;
      }
      ref1 = this.getBufferPosition(), row = ref1.row, column = ref1.column;
      range = [[row, column - 1], [row, column + 1]];
      ref2 = this.editor.getTextInBufferRange(range), before = ref2[0], after = ref2[1];
      if (/\s/.test(before) || /\s/.test(after)) {
        return false;
      }
      nonWordCharacters = this.getNonWordCharacters();
      return nonWordCharacters.includes(before) !== nonWordCharacters.includes(after);
    };

    Cursor.prototype.isInsideWord = function(options) {
      var column, range, ref1, ref2, row;
      ref1 = this.getBufferPosition(), row = ref1.row, column = ref1.column;
      range = [[row, column], [row, 2e308]];
      return this.editor.getTextInBufferRange(range).search((ref2 = options != null ? options.wordRegex : void 0) != null ? ref2 : this.wordRegExp()) === 0;
    };

    Cursor.prototype.getIndentLevel = function() {
      if (this.editor.getSoftTabs()) {
        return this.getBufferColumn() / this.editor.getTabLength();
      } else {
        return this.getBufferColumn();
      }
    };

    Cursor.prototype.getScopeDescriptor = function() {
      return this.editor.scopeDescriptorForBufferPosition(this.getBufferPosition());
    };

    Cursor.prototype.hasPrecedingCharactersOnLine = function() {
      var bufferPosition, firstCharacterColumn, line;
      bufferPosition = this.getBufferPosition();
      line = this.editor.lineTextForBufferRow(bufferPosition.row);
      firstCharacterColumn = line.search(/\S/);
      if (firstCharacterColumn === -1) {
        return false;
      } else {
        return bufferPosition.column > firstCharacterColumn;
      }
    };

    Cursor.prototype.isLastCursor = function() {
      return this === this.editor.getLastCursor();
    };


    /*
    Section: Moving the Cursor
     */

    Cursor.prototype.moveUp = function(rowCount, arg) {
      var column, moveToEndOfSelection, range, ref1, ref2, row;
      if (rowCount == null) {
        rowCount = 1;
      }
      moveToEndOfSelection = (arg != null ? arg : {}).moveToEndOfSelection;
      range = this.marker.getScreenRange();
      if (moveToEndOfSelection && !range.isEmpty()) {
        ref1 = range.start, row = ref1.row, column = ref1.column;
      } else {
        ref2 = this.getScreenPosition(), row = ref2.row, column = ref2.column;
      }
      if (this.goalColumn != null) {
        column = this.goalColumn;
      }
      this.setScreenPosition({
        row: row - rowCount,
        column: column
      }, {
        skipSoftWrapIndentation: true
      });
      return this.goalColumn = column;
    };

    Cursor.prototype.moveDown = function(rowCount, arg) {
      var column, moveToEndOfSelection, range, ref1, ref2, row;
      if (rowCount == null) {
        rowCount = 1;
      }
      moveToEndOfSelection = (arg != null ? arg : {}).moveToEndOfSelection;
      range = this.marker.getScreenRange();
      if (moveToEndOfSelection && !range.isEmpty()) {
        ref1 = range.end, row = ref1.row, column = ref1.column;
      } else {
        ref2 = this.getScreenPosition(), row = ref2.row, column = ref2.column;
      }
      if (this.goalColumn != null) {
        column = this.goalColumn;
      }
      this.setScreenPosition({
        row: row + rowCount,
        column: column
      }, {
        skipSoftWrapIndentation: true
      });
      return this.goalColumn = column;
    };

    Cursor.prototype.moveLeft = function(columnCount, arg) {
      var column, moveToEndOfSelection, range, ref1, row;
      if (columnCount == null) {
        columnCount = 1;
      }
      moveToEndOfSelection = (arg != null ? arg : {}).moveToEndOfSelection;
      range = this.marker.getScreenRange();
      if (moveToEndOfSelection && !range.isEmpty()) {
        return this.setScreenPosition(range.start);
      } else {
        ref1 = this.getScreenPosition(), row = ref1.row, column = ref1.column;
        while (columnCount > column && row > 0) {
          columnCount -= column;
          column = this.editor.lineLengthForScreenRow(--row);
          columnCount--;
        }
        column = column - columnCount;
        return this.setScreenPosition({
          row: row,
          column: column
        }, {
          clipDirection: 'backward'
        });
      }
    };

    Cursor.prototype.moveRight = function(columnCount, arg) {
      var column, columnsRemainingInLine, maxLines, moveToEndOfSelection, range, ref1, row, rowLength;
      if (columnCount == null) {
        columnCount = 1;
      }
      moveToEndOfSelection = (arg != null ? arg : {}).moveToEndOfSelection;
      range = this.marker.getScreenRange();
      if (moveToEndOfSelection && !range.isEmpty()) {
        return this.setScreenPosition(range.end);
      } else {
        ref1 = this.getScreenPosition(), row = ref1.row, column = ref1.column;
        maxLines = this.editor.getScreenLineCount();
        rowLength = this.editor.lineLengthForScreenRow(row);
        columnsRemainingInLine = rowLength - column;
        while (columnCount > columnsRemainingInLine && row < maxLines - 1) {
          columnCount -= columnsRemainingInLine;
          columnCount--;
          column = 0;
          rowLength = this.editor.lineLengthForScreenRow(++row);
          columnsRemainingInLine = rowLength;
        }
        column = column + columnCount;
        return this.setScreenPosition({
          row: row,
          column: column
        }, {
          clipDirection: 'forward'
        });
      }
    };

    Cursor.prototype.moveToTop = function() {
      return this.setBufferPosition([0, 0]);
    };

    Cursor.prototype.moveToBottom = function() {
      return this.setBufferPosition(this.editor.getEofBufferPosition());
    };

    Cursor.prototype.moveToBeginningOfScreenLine = function() {
      return this.setScreenPosition([this.getScreenRow(), 0]);
    };

    Cursor.prototype.moveToBeginningOfLine = function() {
      return this.setBufferPosition([this.getBufferRow(), 0]);
    };

    Cursor.prototype.moveToFirstCharacterOfLine = function() {
      var firstCharacterColumn, screenLineBufferRange, screenLineEnd, screenLineStart, screenRow, targetBufferColumn;
      screenRow = this.getScreenRow();
      screenLineStart = this.editor.clipScreenPosition([screenRow, 0], {
        skipSoftWrapIndentation: true
      });
      screenLineEnd = [screenRow, 2e308];
      screenLineBufferRange = this.editor.bufferRangeForScreenRange([screenLineStart, screenLineEnd]);
      firstCharacterColumn = null;
      this.editor.scanInBufferRange(/\S/, screenLineBufferRange, function(arg) {
        var range, stop;
        range = arg.range, stop = arg.stop;
        firstCharacterColumn = range.start.column;
        return stop();
      });
      if ((firstCharacterColumn != null) && firstCharacterColumn !== this.getBufferColumn()) {
        targetBufferColumn = firstCharacterColumn;
      } else {
        targetBufferColumn = screenLineBufferRange.start.column;
      }
      return this.setBufferPosition([screenLineBufferRange.start.row, targetBufferColumn]);
    };

    Cursor.prototype.moveToEndOfScreenLine = function() {
      return this.setScreenPosition([this.getScreenRow(), 2e308]);
    };

    Cursor.prototype.moveToEndOfLine = function() {
      return this.setBufferPosition([this.getBufferRow(), 2e308]);
    };

    Cursor.prototype.moveToBeginningOfWord = function() {
      return this.setBufferPosition(this.getBeginningOfCurrentWordBufferPosition());
    };

    Cursor.prototype.moveToEndOfWord = function() {
      var position;
      if (position = this.getEndOfCurrentWordBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToBeginningOfNextWord = function() {
      var position;
      if (position = this.getBeginningOfNextWordBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToPreviousWordBoundary = function() {
      var position;
      if (position = this.getPreviousWordBoundaryBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToNextWordBoundary = function() {
      var position;
      if (position = this.getNextWordBoundaryBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToPreviousSubwordBoundary = function() {
      var options, position;
      options = {
        wordRegex: this.subwordRegExp({
          backwards: true
        })
      };
      if (position = this.getPreviousWordBoundaryBufferPosition(options)) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToNextSubwordBoundary = function() {
      var options, position;
      options = {
        wordRegex: this.subwordRegExp()
      };
      if (position = this.getNextWordBoundaryBufferPosition(options)) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.skipLeadingWhitespace = function() {
      var endOfLeadingWhitespace, position, scanRange;
      position = this.getBufferPosition();
      scanRange = this.getCurrentLineBufferRange();
      endOfLeadingWhitespace = null;
      this.editor.scanInBufferRange(/^[ \t]*/, scanRange, function(arg) {
        var range;
        range = arg.range;
        return endOfLeadingWhitespace = range.end;
      });
      if (endOfLeadingWhitespace.isGreaterThan(position)) {
        return this.setBufferPosition(endOfLeadingWhitespace);
      }
    };

    Cursor.prototype.moveToBeginningOfNextParagraph = function() {
      var position;
      if (position = this.getBeginningOfNextParagraphBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };

    Cursor.prototype.moveToBeginningOfPreviousParagraph = function() {
      var position;
      if (position = this.getBeginningOfPreviousParagraphBufferPosition()) {
        return this.setBufferPosition(position);
      }
    };


    /*
    Section: Local Positions and Ranges
     */

    Cursor.prototype.getPreviousWordBoundaryBufferPosition = function(options) {
      var beginningOfWordPosition, currentBufferPosition, previousNonBlankRow, ref1, scanRange;
      if (options == null) {
        options = {};
      }
      currentBufferPosition = this.getBufferPosition();
      previousNonBlankRow = this.editor.buffer.previousNonBlankRow(currentBufferPosition.row);
      scanRange = [[previousNonBlankRow != null ? previousNonBlankRow : 0, 0], currentBufferPosition];
      beginningOfWordPosition = null;
      this.editor.backwardsScanInBufferRange((ref1 = options.wordRegex) != null ? ref1 : this.wordRegExp(), scanRange, function(arg) {
        var range, stop;
        range = arg.range, stop = arg.stop;
        if (range.start.row < currentBufferPosition.row && currentBufferPosition.column > 0) {
          beginningOfWordPosition = new Point(currentBufferPosition.row, 0);
        } else if (range.end.isLessThan(currentBufferPosition)) {
          beginningOfWordPosition = range.end;
        } else {
          beginningOfWordPosition = range.start;
        }
        if (!(beginningOfWordPosition != null ? beginningOfWordPosition.isEqual(currentBufferPosition) : void 0)) {
          return stop();
        }
      });
      return beginningOfWordPosition || currentBufferPosition;
    };

    Cursor.prototype.getNextWordBoundaryBufferPosition = function(options) {
      var currentBufferPosition, endOfWordPosition, ref1, scanRange;
      if (options == null) {
        options = {};
      }
      currentBufferPosition = this.getBufferPosition();
      scanRange = [currentBufferPosition, this.editor.getEofBufferPosition()];
      endOfWordPosition = null;
      this.editor.scanInBufferRange((ref1 = options.wordRegex) != null ? ref1 : this.wordRegExp(), scanRange, function(arg) {
        var range, stop;
        range = arg.range, stop = arg.stop;
        if (range.start.row > currentBufferPosition.row) {
          endOfWordPosition = new Point(range.start.row, 0);
        } else if (range.start.isGreaterThan(currentBufferPosition)) {
          endOfWordPosition = range.start;
        } else {
          endOfWordPosition = range.end;
        }
        if (!(endOfWordPosition != null ? endOfWordPosition.isEqual(currentBufferPosition) : void 0)) {
          return stop();
        }
      });
      return endOfWordPosition || currentBufferPosition;
    };

    Cursor.prototype.getBeginningOfCurrentWordBufferPosition = function(options) {
      var allowPrevious, beginningOfWordPosition, currentBufferPosition, previousNonBlankRow, ref1, ref2, ref3, scanRange;
      if (options == null) {
        options = {};
      }
      allowPrevious = (ref1 = options.allowPrevious) != null ? ref1 : true;
      currentBufferPosition = this.getBufferPosition();
      previousNonBlankRow = (ref2 = this.editor.buffer.previousNonBlankRow(currentBufferPosition.row)) != null ? ref2 : 0;
      scanRange = [[previousNonBlankRow, 0], currentBufferPosition];
      beginningOfWordPosition = null;
      this.editor.backwardsScanInBufferRange((ref3 = options.wordRegex) != null ? ref3 : this.wordRegExp(options), scanRange, function(arg) {
        var matchText, range, stop;
        range = arg.range, matchText = arg.matchText, stop = arg.stop;
        if (matchText === '' && range.start.column !== 0) {
          return;
        }
        if (range.start.isLessThan(currentBufferPosition)) {
          if (range.end.isGreaterThanOrEqual(currentBufferPosition) || allowPrevious) {
            beginningOfWordPosition = range.start;
          }
          return stop();
        }
      });
      if (beginningOfWordPosition != null) {
        return beginningOfWordPosition;
      } else if (allowPrevious) {
        return new Point(0, 0);
      } else {
        return currentBufferPosition;
      }
    };

    Cursor.prototype.getEndOfCurrentWordBufferPosition = function(options) {
      var allowNext, currentBufferPosition, endOfWordPosition, ref1, ref2, scanRange;
      if (options == null) {
        options = {};
      }
      allowNext = (ref1 = options.allowNext) != null ? ref1 : true;
      currentBufferPosition = this.getBufferPosition();
      scanRange = [currentBufferPosition, this.editor.getEofBufferPosition()];
      endOfWordPosition = null;
      this.editor.scanInBufferRange((ref2 = options.wordRegex) != null ? ref2 : this.wordRegExp(options), scanRange, function(arg) {
        var matchText, range, stop;
        range = arg.range, matchText = arg.matchText, stop = arg.stop;
        if (matchText === '' && range.start.column !== 0) {
          return;
        }
        if (range.end.isGreaterThan(currentBufferPosition)) {
          if (allowNext || range.start.isLessThanOrEqual(currentBufferPosition)) {
            endOfWordPosition = range.end;
          }
          return stop();
        }
      });
      return endOfWordPosition != null ? endOfWordPosition : currentBufferPosition;
    };

    Cursor.prototype.getBeginningOfNextWordBufferPosition = function(options) {
      var beginningOfNextWordPosition, currentBufferPosition, ref1, scanRange, start;
      if (options == null) {
        options = {};
      }
      currentBufferPosition = this.getBufferPosition();
      start = this.isInsideWord(options) ? this.getEndOfCurrentWordBufferPosition(options) : currentBufferPosition;
      scanRange = [start, this.editor.getEofBufferPosition()];
      beginningOfNextWordPosition = null;
      this.editor.scanInBufferRange((ref1 = options.wordRegex) != null ? ref1 : this.wordRegExp(), scanRange, function(arg) {
        var range, stop;
        range = arg.range, stop = arg.stop;
        beginningOfNextWordPosition = range.start;
        return stop();
      });
      return beginningOfNextWordPosition || currentBufferPosition;
    };

    Cursor.prototype.getCurrentWordBufferRange = function(options) {
      var endOptions, startOptions;
      if (options == null) {
        options = {};
      }
      startOptions = Object.assign(_.clone(options), {
        allowPrevious: false
      });
      endOptions = Object.assign(_.clone(options), {
        allowNext: false
      });
      return new Range(this.getBeginningOfCurrentWordBufferPosition(startOptions), this.getEndOfCurrentWordBufferPosition(endOptions));
    };

    Cursor.prototype.getCurrentLineBufferRange = function(options) {
      return this.editor.bufferRangeForBufferRow(this.getBufferRow(), options);
    };

    Cursor.prototype.getCurrentParagraphBufferRange = function() {
      return this.editor.languageMode.rowRangeForParagraphAtBufferRow(this.getBufferRow());
    };

    Cursor.prototype.getCurrentWordPrefix = function() {
      return this.editor.getTextInBufferRange([this.getBeginningOfCurrentWordBufferPosition(), this.getBufferPosition()]);
    };


    /*
    Section: Visibility
     */

    Cursor.prototype.setVisible = function(visible) {
      if (this.visible !== visible) {
        this.visible = visible;
        return this.emitter.emit('did-change-visibility', this.visible);
      }
    };

    Cursor.prototype.isVisible = function() {
      return this.visible;
    };

    Cursor.prototype.updateVisibility = function() {
      if (this.showCursorOnSelection) {
        return this.setVisible(true);
      } else {
        return this.setVisible(this.marker.getBufferRange().isEmpty());
      }
    };


    /*
    Section: Comparing to another cursor
     */

    Cursor.prototype.compare = function(otherCursor) {
      return this.getBufferPosition().compare(otherCursor.getBufferPosition());
    };


    /*
    Section: Utilities
     */

    Cursor.prototype.clearAutoscroll = function() {};

    Cursor.prototype.clearSelection = function(options) {
      var ref1;
      return (ref1 = this.selection) != null ? ref1.clear(options) : void 0;
    };

    Cursor.prototype.wordRegExp = function(options) {
      var nonWordCharacters, ref1, source;
      nonWordCharacters = _.escapeRegExp(this.getNonWordCharacters());
      source = "^[\t ]*$|[^\\s" + nonWordCharacters + "]+";
      if ((ref1 = options != null ? options.includeNonWordCharacters : void 0) != null ? ref1 : true) {
        source += "|" + ("[" + nonWordCharacters + "]+");
      }
      return new RegExp(source, "g");
    };

    Cursor.prototype.subwordRegExp = function(options) {
      var lowercaseLetters, nonWordCharacters, segments, snakeCamelSegment, uppercaseLetters;
      if (options == null) {
        options = {};
      }
      nonWordCharacters = this.getNonWordCharacters();
      lowercaseLetters = 'a-z\\u00DF-\\u00F6\\u00F8-\\u00FF';
      uppercaseLetters = 'A-Z\\u00C0-\\u00D6\\u00D8-\\u00DE';
      snakeCamelSegment = "[" + uppercaseLetters + "]?[" + lowercaseLetters + "]+";
      segments = ["^[\t ]+", "[\t ]+$", "[" + uppercaseLetters + "]+(?![" + lowercaseLetters + "])", "\\d+"];
      if (options.backwards) {
        segments.push(snakeCamelSegment + "_*");
        segments.push("[" + (_.escapeRegExp(nonWordCharacters)) + "]+\\s*");
      } else {
        segments.push("_*" + snakeCamelSegment);
        segments.push("\\s*[" + (_.escapeRegExp(nonWordCharacters)) + "]+");
      }
      segments.push("_+");
      return new RegExp(segments.join("|"), "g");
    };


    /*
    Section: Private
     */

    Cursor.prototype.setShowCursorOnSelection = function(value) {
      if (value !== this.showCursorOnSelection) {
        this.showCursorOnSelection = value;
        return this.updateVisibility();
      }
    };

    Cursor.prototype.getNonWordCharacters = function() {
      return this.editor.getNonWordCharacters(this.getScopeDescriptor().getScopesArray());
    };

    Cursor.prototype.changePosition = function(options, fn) {
      var ref1;
      this.clearSelection({
        autoscroll: false
      });
      fn();
      if ((ref1 = options.autoscroll) != null ? ref1 : this.isLastCursor()) {
        return this.autoscroll();
      }
    };

    Cursor.prototype.getScreenRange = function() {
      var column, ref1, row;
      ref1 = this.getScreenPosition(), row = ref1.row, column = ref1.column;
      return new Range(new Point(row, column), new Point(row, column + 1));
    };

    Cursor.prototype.autoscroll = function(options) {
      return this.editor.scrollToScreenRange(this.getScreenRange(), options);
    };

    Cursor.prototype.getBeginningOfNextParagraphBufferPosition = function() {
      var column, eof, position, row, scanRange, start;
      start = this.getBufferPosition();
      eof = this.editor.getEofBufferPosition();
      scanRange = [start, eof];
      row = eof.row, column = eof.column;
      position = new Point(row, column - 1);
      this.editor.scanInBufferRange(EmptyLineRegExp, scanRange, function(arg) {
        var range, stop;
        range = arg.range, stop = arg.stop;
        position = range.start.traverse(Point(1, 0));
        if (!position.isEqual(start)) {
          return stop();
        }
      });
      return position;
    };

    Cursor.prototype.getBeginningOfPreviousParagraphBufferPosition = function() {
      var column, position, row, scanRange, start;
      start = this.getBufferPosition();
      row = start.row, column = start.column;
      scanRange = [[row - 1, column], [0, 0]];
      position = new Point(0, 0);
      this.editor.backwardsScanInBufferRange(EmptyLineRegExp, scanRange, function(arg) {
        var range, stop;
        range = arg.range, stop = arg.stop;
        position = range.start.traverse(Point(1, 0));
        if (!position.isEqual(start)) {
          return stop();
        }
      });
      return position;
    };

    return Cursor;

  })(Model);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2N1cnNvci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLDZEQUFBO0lBQUE7OztFQUFBLE1BQWlCLE9BQUEsQ0FBUSxhQUFSLENBQWpCLEVBQUMsaUJBQUQsRUFBUTs7RUFDUCxVQUFXLE9BQUEsQ0FBUSxXQUFSOztFQUNaLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBQ0osS0FBQSxHQUFRLE9BQUEsQ0FBUSxTQUFSOztFQUVSLGVBQUEsR0FBa0I7O0VBT2xCLE1BQU0sQ0FBQyxPQUFQLEdBQ007OztxQkFDSixxQkFBQSxHQUF1Qjs7cUJBQ3ZCLGNBQUEsR0FBZ0I7O3FCQUNoQixjQUFBLEdBQWdCOztxQkFDaEIsVUFBQSxHQUFZOztxQkFDWixPQUFBLEdBQVM7O0lBR0ksZ0JBQUMsR0FBRDtBQUNYLFVBQUE7TUFEYSxJQUFDLENBQUEsYUFBQSxRQUFRLElBQUMsQ0FBQSxhQUFBLFFBQVEsSUFBQyxDQUFBLDRCQUFBLHVCQUF1QjtNQUN2RCxJQUFDLENBQUEsT0FBRCxHQUFXLElBQUk7O1FBRWYsSUFBQyxDQUFBLHdCQUF5Qjs7TUFFMUIsSUFBQyxDQUFBLFFBQUQsQ0FBVSxFQUFWO01BQ0EsSUFBQyxDQUFBLGdCQUFELENBQUE7SUFOVzs7cUJBUWIsT0FBQSxHQUFTLFNBQUE7YUFDUCxJQUFDLENBQUEsTUFBTSxDQUFDLE9BQVIsQ0FBQTtJQURPOzs7QUFHVDs7OztxQkFnQkEsbUJBQUEsR0FBcUIsU0FBQyxRQUFEO2FBQ25CLElBQUMsQ0FBQSxPQUFPLENBQUMsRUFBVCxDQUFZLHFCQUFaLEVBQW1DLFFBQW5DO0lBRG1COztxQkFRckIsWUFBQSxHQUFjLFNBQUMsUUFBRDthQUNaLElBQUMsQ0FBQSxPQUFPLENBQUMsRUFBVCxDQUFZLGFBQVosRUFBMkIsUUFBM0I7SUFEWTs7cUJBU2QscUJBQUEs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S0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFaLENBQXFCLEtBQUEsQ0FBTSxDQUFOLEVBQVMsQ0FBVCxDQUFyQjtRQUNYLElBQUEsQ0FBYyxRQUFRLENBQUMsT0FBVCxDQUFpQixLQUFqQixDQUFkO2lCQUFBLElBQUEsQ0FBQSxFQUFBOztNQUY2RCxDQUEvRDthQUdBO0lBVDZDOzs7O0tBanFCNUI7QUFickIiLCJzb3VyY2VzQ29udGVudCI6WyJ7UG9pbnQsIFJhbmdlfSA9IHJlcXVpcmUgJ3RleHQtYnVmZmVyJ1xue0VtaXR0ZXJ9ID0gcmVxdWlyZSAnZXZlbnQta2l0J1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbk1vZGVsID0gcmVxdWlyZSAnLi9tb2RlbCdcblxuRW1wdHlMaW5lUmVnRXhwID0gLyhcXHJcXG5bXFx0IF0qXFxyXFxuKXwoXFxuW1xcdCBdKlxcbikvZ1xuXG4jIEV4dGVuZGVkOiBUaGUgYEN1cnNvcmAgY2xhc3MgcmVwcmVzZW50cyB0aGUgbGl0dGxlIGJsaW5raW5nIGxpbmUgaWRlbnRpZnlpbmdcbiMgd2hlcmUgdGV4dCBjYW4gYmUgaW5zZXJ0ZWQuXG4jXG4jIEN1cnNvcnMgYmVsb25nIHRvIHtUZXh0RWRpdG9yfXMgYW5kIGhhdmUgc29tZSBtZXRhZGF0YSBhdHRhY2hlZCBpbiB0aGUgZm9ybVxuIyBvZiBhIHtEaXNwbGF5TWFya2VyfS5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIEN1cnNvciBleHRlbmRzIE1vZGVsXG4gIHNob3dDdXJzb3JPblNlbGVjdGlvbjogbnVsbFxuICBzY3JlZW5Qb3NpdGlvbjogbnVsbFxuICBidWZmZXJQb3NpdGlvbjogbnVsbFxuICBnb2FsQ29sdW1uOiBudWxsXG4gIHZpc2libGU6IHRydWVcblxuICAjIEluc3RhbnRpYXRlZCBieSBhIHtUZXh0RWRpdG9yfVxuICBjb25zdHJ1Y3RvcjogKHtAZWRpdG9yLCBAbWFya2VyLCBAc2hvd0N1cnNvck9uU2VsZWN0aW9uLCBpZH0pIC0+XG4gICAgQGVtaXR0ZXIgPSBuZXcgRW1pdHRlclxuXG4gICAgQHNob3dDdXJzb3JPblNlbGVjdGlvbiA/PSB0cnVlXG5cbiAgICBAYXNzaWduSWQoaWQpXG4gICAgQHVwZGF0ZVZpc2liaWxpdHkoKVxuXG4gIGRlc3Ryb3k6IC0+XG4gICAgQG1hcmtlci5kZXN0cm95KClcblxuICAjIyNcbiAgU2VjdGlvbjogRXZlbnQgU3Vic2NyaXB0aW9uXG4gICMjI1xuXG4gICMgUHVibGljOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiB0aGUgY3Vyc29yIGhhcyBiZWVuIG1vdmVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGV2ZW50YCB7T2JqZWN0fVxuICAjICAgICAqIGBvbGRCdWZmZXJQb3NpdGlvbmAge1BvaW50fVxuICAjICAgICAqIGBvbGRTY3JlZW5Qb3NpdGlvbmAge1BvaW50fVxuICAjICAgICAqIGBuZXdCdWZmZXJQb3NpdGlvbmAge1BvaW50fVxuICAjICAgICAqIGBuZXdTY3JlZW5Qb3NpdGlvbmAge1BvaW50fVxuICAjICAgICAqIGB0ZXh0Q2hhbmdlZGAge0Jvb2xlYW59XG4gICMgICAgICogYEN1cnNvcmAge0N1cnNvcn0gdGhhdCB0cmlnZ2VyZWQgdGhlIGV2ZW50XG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZVBvc2l0aW9uOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UtcG9zaXRpb24nLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiB0aGUgY3Vyc29yIGlzIGRlc3Ryb3llZFxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkRGVzdHJveTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtZGVzdHJveScsIGNhbGxiYWNrXG5cbiAgIyBQdWJsaWM6IENhbGxzIHlvdXIgYGNhbGxiYWNrYCB3aGVuIHRoZSBjdXJzb3IncyB2aXNpYmlsaXR5IGhhcyBjaGFuZ2VkXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjICAgKiBgdmlzaWJpbGl0eWAge0Jvb2xlYW59XG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZVZpc2liaWxpdHk6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWNoYW5nZS12aXNpYmlsaXR5JywgY2FsbGJhY2tcblxuICAjIyNcbiAgU2VjdGlvbjogTWFuYWdpbmcgQ3Vyc29yIFBvc2l0aW9uXG4gICMjI1xuXG4gICMgUHVibGljOiBNb3ZlcyBhIGN1cnNvciB0byBhIGdpdmVuIHNjcmVlbiBwb3NpdGlvbi5cbiAgI1xuICAjICogYHNjcmVlblBvc2l0aW9uYCB7QXJyYXl9IG9mIHR3byBudW1iZXJzOiB0aGUgc2NyZWVuIHJvdywgYW5kIHRoZSBzY3JlZW4gY29sdW1uLlxuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGBhdXRvc2Nyb2xsYCBBIEJvb2xlYW4gd2hpY2gsIGlmIGB0cnVlYCwgc2Nyb2xscyB0aGUge1RleHRFZGl0b3J9IHRvIHdoZXJldmVyXG4gICMgICAgIHRoZSBjdXJzb3IgbW92ZXMgdG8uXG4gIHNldFNjcmVlblBvc2l0aW9uOiAoc2NyZWVuUG9zaXRpb24sIG9wdGlvbnM9e30pIC0+XG4gICAgQGNoYW5nZVBvc2l0aW9uIG9wdGlvbnMsID0+XG4gICAgICBAbWFya2VyLnNldEhlYWRTY3JlZW5Qb3NpdGlvbihzY3JlZW5Qb3NpdGlvbiwgb3B0aW9ucylcblxuICAjIFB1YmxpYzogUmV0dXJucyB0aGUgc2NyZWVuIHBvc2l0aW9uIG9mIHRoZSBjdXJzb3IgYXMgYSB7UG9pbnR9LlxuICBnZXRTY3JlZW5Qb3NpdGlvbjogLT5cbiAgICBAbWFya2VyLmdldEhlYWRTY3JlZW5Qb3NpdGlvbigpXG5cbiAgIyBQdWJsaWM6IE1vdmVzIGEgY3Vyc29yIHRvIGEgZ2l2ZW4gYnVmZmVyIHBvc2l0aW9uLlxuICAjXG4gICMgKiBgYnVmZmVyUG9zaXRpb25gIHtBcnJheX0gb2YgdHdvIG51bWJlcnM6IHRoZSBidWZmZXIgcm93LCBhbmQgdGhlIGJ1ZmZlciBjb2x1bW4uXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYGF1dG9zY3JvbGxgIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gYXV0b3Njcm9sbCB0byB0aGUgbmV3XG4gICMgICAgIHBvc2l0aW9uLiBEZWZhdWx0cyB0byBgdHJ1ZWAgaWYgdGhpcyBpcyB0aGUgbW9zdCByZWNlbnRseSBhZGRlZCBjdXJzb3IsXG4gICMgICAgIGBmYWxzZWAgb3RoZXJ3aXNlLlxuICBzZXRCdWZmZXJQb3NpdGlvbjogKGJ1ZmZlclBvc2l0aW9uLCBvcHRpb25zPXt9KSAtPlxuICAgIEBjaGFuZ2VQb3NpdGlvbiBvcHRpb25zLCA9PlxuICAgICAgQG1hcmtlci5zZXRIZWFkQnVmZmVyUG9zaXRpb24oYnVmZmVyUG9zaXRpb24sIG9wdGlvbnMpXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdGhlIGN1cnJlbnQgYnVmZmVyIHBvc2l0aW9uIGFzIGFuIEFycmF5LlxuICBnZXRCdWZmZXJQb3NpdGlvbjogLT5cbiAgICBAbWFya2VyLmdldEhlYWRCdWZmZXJQb3NpdGlvbigpXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdGhlIGN1cnNvcidzIGN1cnJlbnQgc2NyZWVuIHJvdy5cbiAgZ2V0U2NyZWVuUm93OiAtPlxuICAgIEBnZXRTY3JlZW5Qb3NpdGlvbigpLnJvd1xuXG4gICMgUHVibGljOiBSZXR1cm5zIHRoZSBjdXJzb3IncyBjdXJyZW50IHNjcmVlbiBjb2x1bW4uXG4gIGdldFNjcmVlbkNvbHVtbjogLT5cbiAgICBAZ2V0U2NyZWVuUG9zaXRpb24oKS5jb2x1bW5cblxuICAjIFB1YmxpYzogUmV0cmlldmVzIHRoZSBjdXJzb3IncyBjdXJyZW50IGJ1ZmZlciByb3cuXG4gIGdldEJ1ZmZlclJvdzogLT5cbiAgICBAZ2V0QnVmZmVyUG9zaXRpb24oKS5yb3dcblxuICAjIFB1YmxpYzogUmV0dXJucyB0aGUgY3Vyc29yJ3MgY3VycmVudCBidWZmZXIgY29sdW1uLlxuICBnZXRCdWZmZXJDb2x1bW46IC0+XG4gICAgQGdldEJ1ZmZlclBvc2l0aW9uKCkuY29sdW1uXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdGhlIGN1cnNvcidzIGN1cnJlbnQgYnVmZmVyIHJvdyBvZiB0ZXh0IGV4Y2x1ZGluZyBpdHMgbGluZVxuICAjIGVuZGluZy5cbiAgZ2V0Q3VycmVudEJ1ZmZlckxpbmU6IC0+XG4gICAgQGVkaXRvci5saW5lVGV4dEZvckJ1ZmZlclJvdyhAZ2V0QnVmZmVyUm93KCkpXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgd2hldGhlciB0aGUgY3Vyc29yIGlzIGF0IHRoZSBzdGFydCBvZiBhIGxpbmUuXG4gIGlzQXRCZWdpbm5pbmdPZkxpbmU6IC0+XG4gICAgQGdldEJ1ZmZlclBvc2l0aW9uKCkuY29sdW1uIGlzIDBcblxuICAjIFB1YmxpYzogUmV0dXJucyB3aGV0aGVyIHRoZSBjdXJzb3IgaXMgb24gdGhlIGxpbmUgcmV0dXJuIGNoYXJhY3Rlci5cbiAgaXNBdEVuZE9mTGluZTogLT5cbiAgICBAZ2V0QnVmZmVyUG9zaXRpb24oKS5pc0VxdWFsKEBnZXRDdXJyZW50TGluZUJ1ZmZlclJhbmdlKCkuZW5kKVxuXG4gICMjI1xuICBTZWN0aW9uOiBDdXJzb3IgUG9zaXRpb24gRGV0YWlsc1xuICAjIyNcblxuICAjIFB1YmxpYzogUmV0dXJucyB0aGUgdW5kZXJseWluZyB7RGlzcGxheU1hcmtlcn0gZm9yIHRoZSBjdXJzb3IuXG4gICMgVXNlZnVsIHdpdGggb3ZlcmxheSB7RGVjb3JhdGlvbn1zLlxuICBnZXRNYXJrZXI6IC0+IEBtYXJrZXJcblxuICAjIFB1YmxpYzogSWRlbnRpZmllcyBpZiB0aGUgY3Vyc29yIGlzIHN1cnJvdW5kZWQgYnkgd2hpdGVzcGFjZS5cbiAgI1xuICAjIFwiU3Vycm91bmRlZFwiIGhlcmUgbWVhbnMgdGhhdCB0aGUgY2hhcmFjdGVyIGRpcmVjdGx5IGJlZm9yZSBhbmQgYWZ0ZXIgdGhlXG4gICMgY3Vyc29yIGFyZSBib3RoIHdoaXRlc3BhY2UuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICBpc1N1cnJvdW5kZWRCeVdoaXRlc3BhY2U6IC0+XG4gICAge3JvdywgY29sdW1ufSA9IEBnZXRCdWZmZXJQb3NpdGlvbigpXG4gICAgcmFuZ2UgPSBbW3JvdywgY29sdW1uIC0gMV0sIFtyb3csIGNvbHVtbiArIDFdXVxuICAgIC9eXFxzKyQvLnRlc3QgQGVkaXRvci5nZXRUZXh0SW5CdWZmZXJSYW5nZShyYW5nZSlcblxuICAjIFB1YmxpYzogUmV0dXJucyB3aGV0aGVyIHRoZSBjdXJzb3IgaXMgY3VycmVudGx5IGJldHdlZW4gYSB3b3JkIGFuZCBub24td29yZFxuICAjIGNoYXJhY3Rlci4gVGhlIG5vbi13b3JkIGNoYXJhY3RlcnMgYXJlIGRlZmluZWQgYnkgdGhlXG4gICMgYGVkaXRvci5ub25Xb3JkQ2hhcmFjdGVyc2AgY29uZmlnIHZhbHVlLlxuICAjXG4gICMgVGhpcyBtZXRob2QgcmV0dXJucyBmYWxzZSBpZiB0aGUgY2hhcmFjdGVyIGJlZm9yZSBvciBhZnRlciB0aGUgY3Vyc29yIGlzXG4gICMgd2hpdGVzcGFjZS5cbiAgI1xuICAjIFJldHVybnMgYSBCb29sZWFuLlxuICBpc0JldHdlZW5Xb3JkQW5kTm9uV29yZDogLT5cbiAgICByZXR1cm4gZmFsc2UgaWYgQGlzQXRCZWdpbm5pbmdPZkxpbmUoKSBvciBAaXNBdEVuZE9mTGluZSgpXG5cbiAgICB7cm93LCBjb2x1bW59ID0gQGdldEJ1ZmZlclBvc2l0aW9uKClcbiAgICByYW5nZSA9IFtbcm93LCBjb2x1bW4gLSAxXSwgW3JvdywgY29sdW1uICsgMV1dXG4gICAgW2JlZm9yZSwgYWZ0ZXJdID0gQGVkaXRvci5nZXRUZXh0SW5CdWZmZXJSYW5nZShyYW5nZSlcbiAgICByZXR1cm4gZmFsc2UgaWYgL1xccy8udGVzdChiZWZvcmUpIG9yIC9cXHMvLnRlc3QoYWZ0ZXIpXG5cbiAgICBub25Xb3JkQ2hhcmFjdGVycyA9IEBnZXROb25Xb3JkQ2hhcmFjdGVycygpXG4gICAgbm9uV29yZENoYXJhY3RlcnMuaW5jbHVkZXMoYmVmb3JlKSBpc250IG5vbldvcmRDaGFyYWN0ZXJzLmluY2x1ZGVzKGFmdGVyKVxuXG4gICMgUHVibGljOiBSZXR1cm5zIHdoZXRoZXIgdGhpcyBjdXJzb3IgaXMgYmV0d2VlbiBhIHdvcmQncyBzdGFydCBhbmQgZW5kLlxuICAjXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fVxuICAjICAgKiBgd29yZFJlZ2V4YCBBIHtSZWdFeHB9IGluZGljYXRpbmcgd2hhdCBjb25zdGl0dXRlcyBhIFwid29yZFwiXG4gICMgICAgIChkZWZhdWx0OiB7Ojp3b3JkUmVnRXhwfSkuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59XG4gIGlzSW5zaWRlV29yZDogKG9wdGlvbnMpIC0+XG4gICAge3JvdywgY29sdW1ufSA9IEBnZXRCdWZmZXJQb3NpdGlvbigpXG4gICAgcmFuZ2UgPSBbW3JvdywgY29sdW1uXSwgW3JvdywgSW5maW5pdHldXVxuICAgIEBlZGl0b3IuZ2V0VGV4dEluQnVmZmVyUmFuZ2UocmFuZ2UpLnNlYXJjaChvcHRpb25zPy53b3JkUmVnZXggPyBAd29yZFJlZ0V4cCgpKSBpcyAwXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdGhlIGluZGVudGF0aW9uIGxldmVsIG9mIHRoZSBjdXJyZW50IGxpbmUuXG4gIGdldEluZGVudExldmVsOiAtPlxuICAgIGlmIEBlZGl0b3IuZ2V0U29mdFRhYnMoKVxuICAgICAgQGdldEJ1ZmZlckNvbHVtbigpIC8gQGVkaXRvci5nZXRUYWJMZW5ndGgoKVxuICAgIGVsc2VcbiAgICAgIEBnZXRCdWZmZXJDb2x1bW4oKVxuXG4gICMgUHVibGljOiBSZXRyaWV2ZXMgdGhlIHNjb3BlIGRlc2NyaXB0b3IgZm9yIHRoZSBjdXJzb3IncyBjdXJyZW50IHBvc2l0aW9uLlxuICAjXG4gICMgUmV0dXJucyBhIHtTY29wZURlc2NyaXB0b3J9XG4gIGdldFNjb3BlRGVzY3JpcHRvcjogLT5cbiAgICBAZWRpdG9yLnNjb3BlRGVzY3JpcHRvckZvckJ1ZmZlclBvc2l0aW9uKEBnZXRCdWZmZXJQb3NpdGlvbigpKVxuXG4gICMgUHVibGljOiBSZXR1cm5zIHRydWUgaWYgdGhpcyBjdXJzb3IgaGFzIG5vIG5vbi13aGl0ZXNwYWNlIGNoYXJhY3RlcnMgYmVmb3JlXG4gICMgaXRzIGN1cnJlbnQgcG9zaXRpb24uXG4gIGhhc1ByZWNlZGluZ0NoYXJhY3RlcnNPbkxpbmU6IC0+XG4gICAgYnVmZmVyUG9zaXRpb24gPSBAZ2V0QnVmZmVyUG9zaXRpb24oKVxuICAgIGxpbmUgPSBAZWRpdG9yLmxpbmVUZXh0Rm9yQnVmZmVyUm93KGJ1ZmZlclBvc2l0aW9uLnJvdylcbiAgICBmaXJzdENoYXJhY3RlckNvbHVtbiA9IGxpbmUuc2VhcmNoKC9cXFMvKVxuXG4gICAgaWYgZmlyc3RDaGFyYWN0ZXJDb2x1bW4gaXMgLTFcbiAgICAgIGZhbHNlXG4gICAgZWxzZVxuICAgICAgYnVmZmVyUG9zaXRpb24uY29sdW1uID4gZmlyc3RDaGFyYWN0ZXJDb2x1bW5cblxuICAjIFB1YmxpYzogSWRlbnRpZmllcyBpZiB0aGlzIGN1cnNvciBpcyB0aGUgbGFzdCBpbiB0aGUge1RleHRFZGl0b3J9LlxuICAjXG4gICMgXCJMYXN0XCIgaXMgZGVmaW5lZCBhcyB0aGUgbW9zdCByZWNlbnRseSBhZGRlZCBjdXJzb3IuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICBpc0xhc3RDdXJzb3I6IC0+XG4gICAgdGhpcyBpcyBAZWRpdG9yLmdldExhc3RDdXJzb3IoKVxuXG4gICMjI1xuICBTZWN0aW9uOiBNb3ZpbmcgdGhlIEN1cnNvclxuICAjIyNcblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciB1cCBvbmUgc2NyZWVuIHJvdy5cbiAgI1xuICAjICogYHJvd0NvdW50YCAob3B0aW9uYWwpIHtOdW1iZXJ9IG51bWJlciBvZiByb3dzIHRvIG1vdmUgKGRlZmF1bHQ6IDEpXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYG1vdmVUb0VuZE9mU2VsZWN0aW9uYCBpZiB0cnVlLCBtb3ZlIHRvIHRoZSBsZWZ0IG9mIHRoZSBzZWxlY3Rpb24gaWYgYVxuICAjICAgICBzZWxlY3Rpb24gZXhpc3RzLlxuICBtb3ZlVXA6IChyb3dDb3VudD0xLCB7bW92ZVRvRW5kT2ZTZWxlY3Rpb259PXt9KSAtPlxuICAgIHJhbmdlID0gQG1hcmtlci5nZXRTY3JlZW5SYW5nZSgpXG4gICAgaWYgbW92ZVRvRW5kT2ZTZWxlY3Rpb24gYW5kIG5vdCByYW5nZS5pc0VtcHR5KClcbiAgICAgIHtyb3csIGNvbHVtbn0gPSByYW5nZS5zdGFydFxuICAgIGVsc2VcbiAgICAgIHtyb3csIGNvbHVtbn0gPSBAZ2V0U2NyZWVuUG9zaXRpb24oKVxuXG4gICAgY29sdW1uID0gQGdvYWxDb2x1bW4gaWYgQGdvYWxDb2x1bW4/XG4gICAgQHNldFNjcmVlblBvc2l0aW9uKHtyb3c6IHJvdyAtIHJvd0NvdW50LCBjb2x1bW46IGNvbHVtbn0sIHNraXBTb2Z0V3JhcEluZGVudGF0aW9uOiB0cnVlKVxuICAgIEBnb2FsQ29sdW1uID0gY29sdW1uXG5cbiAgIyBQdWJsaWM6IE1vdmVzIHRoZSBjdXJzb3IgZG93biBvbmUgc2NyZWVuIHJvdy5cbiAgI1xuICAjICogYHJvd0NvdW50YCAob3B0aW9uYWwpIHtOdW1iZXJ9IG51bWJlciBvZiByb3dzIHRvIG1vdmUgKGRlZmF1bHQ6IDEpXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYG1vdmVUb0VuZE9mU2VsZWN0aW9uYCBpZiB0cnVlLCBtb3ZlIHRvIHRoZSBsZWZ0IG9mIHRoZSBzZWxlY3Rpb24gaWYgYVxuICAjICAgICBzZWxlY3Rpb24gZXhpc3RzLlxuICBtb3ZlRG93bjogKHJvd0NvdW50PTEsIHttb3ZlVG9FbmRPZlNlbGVjdGlvbn09e30pIC0+XG4gICAgcmFuZ2UgPSBAbWFya2VyLmdldFNjcmVlblJhbmdlKClcbiAgICBpZiBtb3ZlVG9FbmRPZlNlbGVjdGlvbiBhbmQgbm90IHJhbmdlLmlzRW1wdHkoKVxuICAgICAge3JvdywgY29sdW1ufSA9IHJhbmdlLmVuZFxuICAgIGVsc2VcbiAgICAgIHtyb3csIGNvbHVtbn0gPSBAZ2V0U2NyZWVuUG9zaXRpb24oKVxuXG4gICAgY29sdW1uID0gQGdvYWxDb2x1bW4gaWYgQGdvYWxDb2x1bW4/XG4gICAgQHNldFNjcmVlblBvc2l0aW9uKHtyb3c6IHJvdyArIHJvd0NvdW50LCBjb2x1bW46IGNvbHVtbn0sIHNraXBTb2Z0V3JhcEluZGVudGF0aW9uOiB0cnVlKVxuICAgIEBnb2FsQ29sdW1uID0gY29sdW1uXG5cbiAgIyBQdWJsaWM6IE1vdmVzIHRoZSBjdXJzb3IgbGVmdCBvbmUgc2NyZWVuIGNvbHVtbi5cbiAgI1xuICAjICogYGNvbHVtbkNvdW50YCAob3B0aW9uYWwpIHtOdW1iZXJ9IG51bWJlciBvZiBjb2x1bW5zIHRvIG1vdmUgKGRlZmF1bHQ6IDEpXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYG1vdmVUb0VuZE9mU2VsZWN0aW9uYCBpZiB0cnVlLCBtb3ZlIHRvIHRoZSBsZWZ0IG9mIHRoZSBzZWxlY3Rpb24gaWYgYVxuICAjICAgICBzZWxlY3Rpb24gZXhpc3RzLlxuICBtb3ZlTGVmdDogKGNvbHVtbkNvdW50PTEsIHttb3ZlVG9FbmRPZlNlbGVjdGlvbn09e30pIC0+XG4gICAgcmFuZ2UgPSBAbWFya2VyLmdldFNjcmVlblJhbmdlKClcbiAgICBpZiBtb3ZlVG9FbmRPZlNlbGVjdGlvbiBhbmQgbm90IHJhbmdlLmlzRW1wdHkoKVxuICAgICAgQHNldFNjcmVlblBvc2l0aW9uKHJhbmdlLnN0YXJ0KVxuICAgIGVsc2VcbiAgICAgIHtyb3csIGNvbHVtbn0gPSBAZ2V0U2NyZWVuUG9zaXRpb24oKVxuXG4gICAgICB3aGlsZSBjb2x1bW5Db3VudCA+IGNvbHVtbiBhbmQgcm93ID4gMFxuICAgICAgICBjb2x1bW5Db3VudCAtPSBjb2x1bW5cbiAgICAgICAgY29sdW1uID0gQGVkaXRvci5saW5lTGVuZ3RoRm9yU2NyZWVuUm93KC0tcm93KVxuICAgICAgICBjb2x1bW5Db3VudC0tICMgc3VidHJhY3QgMSBmb3IgdGhlIHJvdyBtb3ZlXG5cbiAgICAgIGNvbHVtbiA9IGNvbHVtbiAtIGNvbHVtbkNvdW50XG4gICAgICBAc2V0U2NyZWVuUG9zaXRpb24oe3JvdywgY29sdW1ufSwgY2xpcERpcmVjdGlvbjogJ2JhY2t3YXJkJylcblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciByaWdodCBvbmUgc2NyZWVuIGNvbHVtbi5cbiAgI1xuICAjICogYGNvbHVtbkNvdW50YCAob3B0aW9uYWwpIHtOdW1iZXJ9IG51bWJlciBvZiBjb2x1bW5zIHRvIG1vdmUgKGRlZmF1bHQ6IDEpXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYG1vdmVUb0VuZE9mU2VsZWN0aW9uYCBpZiB0cnVlLCBtb3ZlIHRvIHRoZSByaWdodCBvZiB0aGUgc2VsZWN0aW9uIGlmIGFcbiAgIyAgICAgc2VsZWN0aW9uIGV4aXN0cy5cbiAgbW92ZVJpZ2h0OiAoY29sdW1uQ291bnQ9MSwge21vdmVUb0VuZE9mU2VsZWN0aW9ufT17fSkgLT5cbiAgICByYW5nZSA9IEBtYXJrZXIuZ2V0U2NyZWVuUmFuZ2UoKVxuICAgIGlmIG1vdmVUb0VuZE9mU2VsZWN0aW9uIGFuZCBub3QgcmFuZ2UuaXNFbXB0eSgpXG4gICAgICBAc2V0U2NyZWVuUG9zaXRpb24ocmFuZ2UuZW5kKVxuICAgIGVsc2VcbiAgICAgIHtyb3csIGNvbHVtbn0gPSBAZ2V0U2NyZWVuUG9zaXRpb24oKVxuICAgICAgbWF4TGluZXMgPSBAZWRpdG9yLmdldFNjcmVlbkxpbmVDb3VudCgpXG4gICAgICByb3dMZW5ndGggPSBAZWRpdG9yLmxpbmVMZW5ndGhGb3JTY3JlZW5Sb3cocm93KVxuICAgICAgY29sdW1uc1JlbWFpbmluZ0luTGluZSA9IHJvd0xlbmd0aCAtIGNvbHVtblxuXG4gICAgICB3aGlsZSBjb2x1bW5Db3VudCA+IGNvbHVtbnNSZW1haW5pbmdJbkxpbmUgYW5kIHJvdyA8IG1heExpbmVzIC0gMVxuICAgICAgICBjb2x1bW5Db3VudCAtPSBjb2x1bW5zUmVtYWluaW5nSW5MaW5lXG4gICAgICAgIGNvbHVtbkNvdW50LS0gIyBzdWJ0cmFjdCAxIGZvciB0aGUgcm93IG1vdmVcblxuICAgICAgICBjb2x1bW4gPSAwXG4gICAgICAgIHJvd0xlbmd0aCA9IEBlZGl0b3IubGluZUxlbmd0aEZvclNjcmVlblJvdygrK3JvdylcbiAgICAgICAgY29sdW1uc1JlbWFpbmluZ0luTGluZSA9IHJvd0xlbmd0aFxuXG4gICAgICBjb2x1bW4gPSBjb2x1bW4gKyBjb2x1bW5Db3VudFxuICAgICAgQHNldFNjcmVlblBvc2l0aW9uKHtyb3csIGNvbHVtbn0sIGNsaXBEaXJlY3Rpb246ICdmb3J3YXJkJylcblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgdG9wIG9mIHRoZSBidWZmZXIuXG4gIG1vdmVUb1RvcDogLT5cbiAgICBAc2V0QnVmZmVyUG9zaXRpb24oWzAsIDBdKVxuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSBib3R0b20gb2YgdGhlIGJ1ZmZlci5cbiAgbW92ZVRvQm90dG9tOiAtPlxuICAgIEBzZXRCdWZmZXJQb3NpdGlvbihAZWRpdG9yLmdldEVvZkJ1ZmZlclBvc2l0aW9uKCkpXG5cbiAgIyBQdWJsaWM6IE1vdmVzIHRoZSBjdXJzb3IgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgbGluZS5cbiAgbW92ZVRvQmVnaW5uaW5nT2ZTY3JlZW5MaW5lOiAtPlxuICAgIEBzZXRTY3JlZW5Qb3NpdGlvbihbQGdldFNjcmVlblJvdygpLCAwXSlcblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBidWZmZXIgbGluZS5cbiAgbW92ZVRvQmVnaW5uaW5nT2ZMaW5lOiAtPlxuICAgIEBzZXRCdWZmZXJQb3NpdGlvbihbQGdldEJ1ZmZlclJvdygpLCAwXSlcblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBmaXJzdCBjaGFyYWN0ZXIgaW4gdGhlXG4gICMgbGluZS5cbiAgbW92ZVRvRmlyc3RDaGFyYWN0ZXJPZkxpbmU6IC0+XG4gICAgc2NyZWVuUm93ID0gQGdldFNjcmVlblJvdygpXG4gICAgc2NyZWVuTGluZVN0YXJ0ID0gQGVkaXRvci5jbGlwU2NyZWVuUG9zaXRpb24oW3NjcmVlblJvdywgMF0sIHNraXBTb2Z0V3JhcEluZGVudGF0aW9uOiB0cnVlKVxuICAgIHNjcmVlbkxpbmVFbmQgPSBbc2NyZWVuUm93LCBJbmZpbml0eV1cbiAgICBzY3JlZW5MaW5lQnVmZmVyUmFuZ2UgPSBAZWRpdG9yLmJ1ZmZlclJhbmdlRm9yU2NyZWVuUmFuZ2UoW3NjcmVlbkxpbmVTdGFydCwgc2NyZWVuTGluZUVuZF0pXG5cbiAgICBmaXJzdENoYXJhY3RlckNvbHVtbiA9IG51bGxcbiAgICBAZWRpdG9yLnNjYW5JbkJ1ZmZlclJhbmdlIC9cXFMvLCBzY3JlZW5MaW5lQnVmZmVyUmFuZ2UsICh7cmFuZ2UsIHN0b3B9KSAtPlxuICAgICAgZmlyc3RDaGFyYWN0ZXJDb2x1bW4gPSByYW5nZS5zdGFydC5jb2x1bW5cbiAgICAgIHN0b3AoKVxuXG4gICAgaWYgZmlyc3RDaGFyYWN0ZXJDb2x1bW4/IGFuZCBmaXJzdENoYXJhY3RlckNvbHVtbiBpc250IEBnZXRCdWZmZXJDb2x1bW4oKVxuICAgICAgdGFyZ2V0QnVmZmVyQ29sdW1uID0gZmlyc3RDaGFyYWN0ZXJDb2x1bW5cbiAgICBlbHNlXG4gICAgICB0YXJnZXRCdWZmZXJDb2x1bW4gPSBzY3JlZW5MaW5lQnVmZmVyUmFuZ2Uuc3RhcnQuY29sdW1uXG5cbiAgICBAc2V0QnVmZmVyUG9zaXRpb24oW3NjcmVlbkxpbmVCdWZmZXJSYW5nZS5zdGFydC5yb3csIHRhcmdldEJ1ZmZlckNvbHVtbl0pXG5cbiAgIyBQdWJsaWM6IE1vdmVzIHRoZSBjdXJzb3IgdG8gdGhlIGVuZCBvZiB0aGUgbGluZS5cbiAgbW92ZVRvRW5kT2ZTY3JlZW5MaW5lOiAtPlxuICAgIEBzZXRTY3JlZW5Qb3NpdGlvbihbQGdldFNjcmVlblJvdygpLCBJbmZpbml0eV0pXG5cbiAgIyBQdWJsaWM6IE1vdmVzIHRoZSBjdXJzb3IgdG8gdGhlIGVuZCBvZiB0aGUgYnVmZmVyIGxpbmUuXG4gIG1vdmVUb0VuZE9mTGluZTogLT5cbiAgICBAc2V0QnVmZmVyUG9zaXRpb24oW0BnZXRCdWZmZXJSb3coKSwgSW5maW5pdHldKVxuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHdvcmQuXG4gIG1vdmVUb0JlZ2lubmluZ09mV29yZDogLT5cbiAgICBAc2V0QnVmZmVyUG9zaXRpb24oQGdldEJlZ2lubmluZ09mQ3VycmVudFdvcmRCdWZmZXJQb3NpdGlvbigpKVxuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSBlbmQgb2YgdGhlIHdvcmQuXG4gIG1vdmVUb0VuZE9mV29yZDogLT5cbiAgICBpZiBwb3NpdGlvbiA9IEBnZXRFbmRPZkN1cnJlbnRXb3JkQnVmZmVyUG9zaXRpb24oKVxuICAgICAgQHNldEJ1ZmZlclBvc2l0aW9uKHBvc2l0aW9uKVxuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIG5leHQgd29yZC5cbiAgbW92ZVRvQmVnaW5uaW5nT2ZOZXh0V29yZDogLT5cbiAgICBpZiBwb3NpdGlvbiA9IEBnZXRCZWdpbm5pbmdPZk5leHRXb3JkQnVmZmVyUG9zaXRpb24oKVxuICAgICAgQHNldEJ1ZmZlclBvc2l0aW9uKHBvc2l0aW9uKVxuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSBwcmV2aW91cyB3b3JkIGJvdW5kYXJ5LlxuICBtb3ZlVG9QcmV2aW91c1dvcmRCb3VuZGFyeTogLT5cbiAgICBpZiBwb3NpdGlvbiA9IEBnZXRQcmV2aW91c1dvcmRCb3VuZGFyeUJ1ZmZlclBvc2l0aW9uKClcbiAgICAgIEBzZXRCdWZmZXJQb3NpdGlvbihwb3NpdGlvbilcblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgbmV4dCB3b3JkIGJvdW5kYXJ5LlxuICBtb3ZlVG9OZXh0V29yZEJvdW5kYXJ5OiAtPlxuICAgIGlmIHBvc2l0aW9uID0gQGdldE5leHRXb3JkQm91bmRhcnlCdWZmZXJQb3NpdGlvbigpXG4gICAgICBAc2V0QnVmZmVyUG9zaXRpb24ocG9zaXRpb24pXG5cbiAgIyBQdWJsaWM6IE1vdmVzIHRoZSBjdXJzb3IgdG8gdGhlIHByZXZpb3VzIHN1YndvcmQgYm91bmRhcnkuXG4gIG1vdmVUb1ByZXZpb3VzU3Vid29yZEJvdW5kYXJ5OiAtPlxuICAgIG9wdGlvbnMgPSB7d29yZFJlZ2V4OiBAc3Vid29yZFJlZ0V4cChiYWNrd2FyZHM6IHRydWUpfVxuICAgIGlmIHBvc2l0aW9uID0gQGdldFByZXZpb3VzV29yZEJvdW5kYXJ5QnVmZmVyUG9zaXRpb24ob3B0aW9ucylcbiAgICAgIEBzZXRCdWZmZXJQb3NpdGlvbihwb3NpdGlvbilcblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgbmV4dCBzdWJ3b3JkIGJvdW5kYXJ5LlxuICBtb3ZlVG9OZXh0U3Vid29yZEJvdW5kYXJ5OiAtPlxuICAgIG9wdGlvbnMgPSB7d29yZFJlZ2V4OiBAc3Vid29yZFJlZ0V4cCgpfVxuICAgIGlmIHBvc2l0aW9uID0gQGdldE5leHRXb3JkQm91bmRhcnlCdWZmZXJQb3NpdGlvbihvcHRpb25zKVxuICAgICAgQHNldEJ1ZmZlclBvc2l0aW9uKHBvc2l0aW9uKVxuXG4gICMgUHVibGljOiBNb3ZlcyB0aGUgY3Vyc29yIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGJ1ZmZlciBsaW5lLCBza2lwcGluZyBhbGxcbiAgIyB3aGl0ZXNwYWNlLlxuICBza2lwTGVhZGluZ1doaXRlc3BhY2U6IC0+XG4gICAgcG9zaXRpb24gPSBAZ2V0QnVmZmVyUG9zaXRpb24oKVxuICAgIHNjYW5SYW5nZSA9IEBnZXRDdXJyZW50TGluZUJ1ZmZlclJhbmdlKClcbiAgICBlbmRPZkxlYWRpbmdXaGl0ZXNwYWNlID0gbnVsbFxuICAgIEBlZGl0b3Iuc2NhbkluQnVmZmVyUmFuZ2UgL15bIFxcdF0qLywgc2NhblJhbmdlLCAoe3JhbmdlfSkgLT5cbiAgICAgIGVuZE9mTGVhZGluZ1doaXRlc3BhY2UgPSByYW5nZS5lbmRcblxuICAgIEBzZXRCdWZmZXJQb3NpdGlvbihlbmRPZkxlYWRpbmdXaGl0ZXNwYWNlKSBpZiBlbmRPZkxlYWRpbmdXaGl0ZXNwYWNlLmlzR3JlYXRlclRoYW4ocG9zaXRpb24pXG5cbiAgIyBQdWJsaWM6IE1vdmVzIHRoZSBjdXJzb3IgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgbmV4dCBwYXJhZ3JhcGhcbiAgbW92ZVRvQmVnaW5uaW5nT2ZOZXh0UGFyYWdyYXBoOiAtPlxuICAgIGlmIHBvc2l0aW9uID0gQGdldEJlZ2lubmluZ09mTmV4dFBhcmFncmFwaEJ1ZmZlclBvc2l0aW9uKClcbiAgICAgIEBzZXRCdWZmZXJQb3NpdGlvbihwb3NpdGlvbilcblxuICAjIFB1YmxpYzogTW92ZXMgdGhlIGN1cnNvciB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBwcmV2aW91cyBwYXJhZ3JhcGhcbiAgbW92ZVRvQmVnaW5uaW5nT2ZQcmV2aW91c1BhcmFncmFwaDogLT5cbiAgICBpZiBwb3NpdGlvbiA9IEBnZXRCZWdpbm5pbmdPZlByZXZpb3VzUGFyYWdyYXBoQnVmZmVyUG9zaXRpb24oKVxuICAgICAgQHNldEJ1ZmZlclBvc2l0aW9uKHBvc2l0aW9uKVxuXG4gICMjI1xuICBTZWN0aW9uOiBMb2NhbCBQb3NpdGlvbnMgYW5kIFJhbmdlc1xuICAjIyNcblxuICAjIFB1YmxpYzogUmV0dXJucyBidWZmZXIgcG9zaXRpb24gb2YgcHJldmlvdXMgd29yZCBib3VuZGFyeS4gSXQgbWlnaHQgYmUgb25cbiAgIyB0aGUgY3VycmVudCB3b3JkLCBvciB0aGUgcHJldmlvdXMgd29yZC5cbiAgI1xuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGB3b3JkUmVnZXhgIEEge1JlZ0V4cH0gaW5kaWNhdGluZyB3aGF0IGNvbnN0aXR1dGVzIGEgXCJ3b3JkXCJcbiAgIyAgICAgIChkZWZhdWx0OiB7Ojp3b3JkUmVnRXhwfSlcbiAgZ2V0UHJldmlvdXNXb3JkQm91bmRhcnlCdWZmZXJQb3NpdGlvbjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICBjdXJyZW50QnVmZmVyUG9zaXRpb24gPSBAZ2V0QnVmZmVyUG9zaXRpb24oKVxuICAgIHByZXZpb3VzTm9uQmxhbmtSb3cgPSBAZWRpdG9yLmJ1ZmZlci5wcmV2aW91c05vbkJsYW5rUm93KGN1cnJlbnRCdWZmZXJQb3NpdGlvbi5yb3cpXG4gICAgc2NhblJhbmdlID0gW1twcmV2aW91c05vbkJsYW5rUm93ID8gMCwgMF0sIGN1cnJlbnRCdWZmZXJQb3NpdGlvbl1cblxuICAgIGJlZ2lubmluZ09mV29yZFBvc2l0aW9uID0gbnVsbFxuICAgIEBlZGl0b3IuYmFja3dhcmRzU2NhbkluQnVmZmVyUmFuZ2UgKG9wdGlvbnMud29yZFJlZ2V4ID8gQHdvcmRSZWdFeHAoKSksIHNjYW5SYW5nZSwgKHtyYW5nZSwgc3RvcH0pIC0+XG4gICAgICBpZiByYW5nZS5zdGFydC5yb3cgPCBjdXJyZW50QnVmZmVyUG9zaXRpb24ucm93IGFuZCBjdXJyZW50QnVmZmVyUG9zaXRpb24uY29sdW1uID4gMFxuICAgICAgICAjIGZvcmNlIGl0IHRvIHN0b3AgYXQgdGhlIGJlZ2lubmluZyBvZiBlYWNoIGxpbmVcbiAgICAgICAgYmVnaW5uaW5nT2ZXb3JkUG9zaXRpb24gPSBuZXcgUG9pbnQoY3VycmVudEJ1ZmZlclBvc2l0aW9uLnJvdywgMClcbiAgICAgIGVsc2UgaWYgcmFuZ2UuZW5kLmlzTGVzc1RoYW4oY3VycmVudEJ1ZmZlclBvc2l0aW9uKVxuICAgICAgICBiZWdpbm5pbmdPZldvcmRQb3NpdGlvbiA9IHJhbmdlLmVuZFxuICAgICAgZWxzZVxuICAgICAgICBiZWdpbm5pbmdPZldvcmRQb3NpdGlvbiA9IHJhbmdlLnN0YXJ0XG5cbiAgICAgIGlmIG5vdCBiZWdpbm5pbmdPZldvcmRQb3NpdGlvbj8uaXNFcXVhbChjdXJyZW50QnVmZmVyUG9zaXRpb24pXG4gICAgICAgIHN0b3AoKVxuXG4gICAgYmVnaW5uaW5nT2ZXb3JkUG9zaXRpb24gb3IgY3VycmVudEJ1ZmZlclBvc2l0aW9uXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgYnVmZmVyIHBvc2l0aW9uIG9mIHRoZSBuZXh0IHdvcmQgYm91bmRhcnkuIEl0IG1pZ2h0IGJlIG9uXG4gICMgdGhlIGN1cnJlbnQgd29yZCwgb3IgdGhlIHByZXZpb3VzIHdvcmQuXG4gICNcbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgd29yZFJlZ2V4YCBBIHtSZWdFeHB9IGluZGljYXRpbmcgd2hhdCBjb25zdGl0dXRlcyBhIFwid29yZFwiXG4gICMgICAgICAoZGVmYXVsdDogezo6d29yZFJlZ0V4cH0pXG4gIGdldE5leHRXb3JkQm91bmRhcnlCdWZmZXJQb3NpdGlvbjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICBjdXJyZW50QnVmZmVyUG9zaXRpb24gPSBAZ2V0QnVmZmVyUG9zaXRpb24oKVxuICAgIHNjYW5SYW5nZSA9IFtjdXJyZW50QnVmZmVyUG9zaXRpb24sIEBlZGl0b3IuZ2V0RW9mQnVmZmVyUG9zaXRpb24oKV1cblxuICAgIGVuZE9mV29yZFBvc2l0aW9uID0gbnVsbFxuICAgIEBlZGl0b3Iuc2NhbkluQnVmZmVyUmFuZ2UgKG9wdGlvbnMud29yZFJlZ2V4ID8gQHdvcmRSZWdFeHAoKSksIHNjYW5SYW5nZSwgKHtyYW5nZSwgc3RvcH0pIC0+XG4gICAgICBpZiByYW5nZS5zdGFydC5yb3cgPiBjdXJyZW50QnVmZmVyUG9zaXRpb24ucm93XG4gICAgICAgICMgZm9yY2UgaXQgdG8gc3RvcCBhdCB0aGUgYmVnaW5uaW5nIG9mIGVhY2ggbGluZVxuICAgICAgICBlbmRPZldvcmRQb3NpdGlvbiA9IG5ldyBQb2ludChyYW5nZS5zdGFydC5yb3csIDApXG4gICAgICBlbHNlIGlmIHJhbmdlLnN0YXJ0LmlzR3JlYXRlclRoYW4oY3VycmVudEJ1ZmZlclBvc2l0aW9uKVxuICAgICAgICBlbmRPZldvcmRQb3NpdGlvbiA9IHJhbmdlLnN0YXJ0XG4gICAgICBlbHNlXG4gICAgICAgIGVuZE9mV29yZFBvc2l0aW9uID0gcmFuZ2UuZW5kXG5cbiAgICAgIGlmIG5vdCBlbmRPZldvcmRQb3NpdGlvbj8uaXNFcXVhbChjdXJyZW50QnVmZmVyUG9zaXRpb24pXG4gICAgICAgIHN0b3AoKVxuXG4gICAgZW5kT2ZXb3JkUG9zaXRpb24gb3IgY3VycmVudEJ1ZmZlclBvc2l0aW9uXG5cbiAgIyBQdWJsaWM6IFJldHJpZXZlcyB0aGUgYnVmZmVyIHBvc2l0aW9uIG9mIHdoZXJlIHRoZSBjdXJyZW50IHdvcmQgc3RhcnRzLlxuICAjXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSBBbiB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYHdvcmRSZWdleGAgQSB7UmVnRXhwfSBpbmRpY2F0aW5nIHdoYXQgY29uc3RpdHV0ZXMgYSBcIndvcmRcIlxuICAjICAgICAoZGVmYXVsdDogezo6d29yZFJlZ0V4cH0pLlxuICAjICAgKiBgaW5jbHVkZU5vbldvcmRDaGFyYWN0ZXJzYCBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gaW5jbHVkZVxuICAjICAgICBub24td29yZCBjaGFyYWN0ZXJzIGluIHRoZSBkZWZhdWx0IHdvcmQgcmVnZXguXG4gICMgICAgIEhhcyBubyBlZmZlY3QgaWYgd29yZFJlZ2V4IGlzIHNldC5cbiAgIyAgICogYGFsbG93UHJldmlvdXNgIEEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0aGUgYmVnaW5uaW5nIG9mIHRoZVxuICAjICAgICBwcmV2aW91cyB3b3JkIGNhbiBiZSByZXR1cm5lZC5cbiAgI1xuICAjIFJldHVybnMgYSB7UmFuZ2V9LlxuICBnZXRCZWdpbm5pbmdPZkN1cnJlbnRXb3JkQnVmZmVyUG9zaXRpb246IChvcHRpb25zID0ge30pIC0+XG4gICAgYWxsb3dQcmV2aW91cyA9IG9wdGlvbnMuYWxsb3dQcmV2aW91cyA/IHRydWVcbiAgICBjdXJyZW50QnVmZmVyUG9zaXRpb24gPSBAZ2V0QnVmZmVyUG9zaXRpb24oKVxuICAgIHByZXZpb3VzTm9uQmxhbmtSb3cgPSBAZWRpdG9yLmJ1ZmZlci5wcmV2aW91c05vbkJsYW5rUm93KGN1cnJlbnRCdWZmZXJQb3NpdGlvbi5yb3cpID8gMFxuICAgIHNjYW5SYW5nZSA9IFtbcHJldmlvdXNOb25CbGFua1JvdywgMF0sIGN1cnJlbnRCdWZmZXJQb3NpdGlvbl1cblxuICAgIGJlZ2lubmluZ09mV29yZFBvc2l0aW9uID0gbnVsbFxuICAgIEBlZGl0b3IuYmFja3dhcmRzU2NhbkluQnVmZmVyUmFuZ2UgKG9wdGlvbnMud29yZFJlZ2V4ID8gQHdvcmRSZWdFeHAob3B0aW9ucykpLCBzY2FuUmFuZ2UsICh7cmFuZ2UsIG1hdGNoVGV4dCwgc3RvcH0pIC0+XG4gICAgICAjIElnbm9yZSAnZW1wdHkgbGluZScgbWF0Y2hlcyBiZXR3ZWVuICdcXHInIGFuZCAnXFxuJ1xuICAgICAgcmV0dXJuIGlmIG1hdGNoVGV4dCBpcyAnJyBhbmQgcmFuZ2Uuc3RhcnQuY29sdW1uIGlzbnQgMFxuXG4gICAgICBpZiByYW5nZS5zdGFydC5pc0xlc3NUaGFuKGN1cnJlbnRCdWZmZXJQb3NpdGlvbilcbiAgICAgICAgaWYgcmFuZ2UuZW5kLmlzR3JlYXRlclRoYW5PckVxdWFsKGN1cnJlbnRCdWZmZXJQb3NpdGlvbikgb3IgYWxsb3dQcmV2aW91c1xuICAgICAgICAgIGJlZ2lubmluZ09mV29yZFBvc2l0aW9uID0gcmFuZ2Uuc3RhcnRcbiAgICAgICAgc3RvcCgpXG5cbiAgICBpZiBiZWdpbm5pbmdPZldvcmRQb3NpdGlvbj9cbiAgICAgIGJlZ2lubmluZ09mV29yZFBvc2l0aW9uXG4gICAgZWxzZSBpZiBhbGxvd1ByZXZpb3VzXG4gICAgICBuZXcgUG9pbnQoMCwgMClcbiAgICBlbHNlXG4gICAgICBjdXJyZW50QnVmZmVyUG9zaXRpb25cblxuICAjIFB1YmxpYzogUmV0cmlldmVzIHRoZSBidWZmZXIgcG9zaXRpb24gb2Ygd2hlcmUgdGhlIGN1cnJlbnQgd29yZCBlbmRzLlxuICAjXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYHdvcmRSZWdleGAgQSB7UmVnRXhwfSBpbmRpY2F0aW5nIHdoYXQgY29uc3RpdHV0ZXMgYSBcIndvcmRcIlxuICAjICAgICAgKGRlZmF1bHQ6IHs6OndvcmRSZWdFeHB9KVxuICAjICAgKiBgaW5jbHVkZU5vbldvcmRDaGFyYWN0ZXJzYCBBIEJvb2xlYW4gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGVcbiAgIyAgICAgbm9uLXdvcmQgY2hhcmFjdGVycyBpbiB0aGUgZGVmYXVsdCB3b3JkIHJlZ2V4LiBIYXMgbm8gZWZmZWN0IGlmXG4gICMgICAgIHdvcmRSZWdleCBpcyBzZXQuXG4gICNcbiAgIyBSZXR1cm5zIGEge1JhbmdlfS5cbiAgZ2V0RW5kT2ZDdXJyZW50V29yZEJ1ZmZlclBvc2l0aW9uOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgIGFsbG93TmV4dCA9IG9wdGlvbnMuYWxsb3dOZXh0ID8gdHJ1ZVxuICAgIGN1cnJlbnRCdWZmZXJQb3NpdGlvbiA9IEBnZXRCdWZmZXJQb3NpdGlvbigpXG4gICAgc2NhblJhbmdlID0gW2N1cnJlbnRCdWZmZXJQb3NpdGlvbiwgQGVkaXRvci5nZXRFb2ZCdWZmZXJQb3NpdGlvbigpXVxuXG4gICAgZW5kT2ZXb3JkUG9zaXRpb24gPSBudWxsXG4gICAgQGVkaXRvci5zY2FuSW5CdWZmZXJSYW5nZSAob3B0aW9ucy53b3JkUmVnZXggPyBAd29yZFJlZ0V4cChvcHRpb25zKSksIHNjYW5SYW5nZSwgKHtyYW5nZSwgbWF0Y2hUZXh0LCBzdG9wfSkgLT5cbiAgICAgICMgSWdub3JlICdlbXB0eSBsaW5lJyBtYXRjaGVzIGJldHdlZW4gJ1xccicgYW5kICdcXG4nXG4gICAgICByZXR1cm4gaWYgbWF0Y2hUZXh0IGlzICcnIGFuZCByYW5nZS5zdGFydC5jb2x1bW4gaXNudCAwXG5cbiAgICAgIGlmIHJhbmdlLmVuZC5pc0dyZWF0ZXJUaGFuKGN1cnJlbnRCdWZmZXJQb3NpdGlvbilcbiAgICAgICAgaWYgYWxsb3dOZXh0IG9yIHJhbmdlLnN0YXJ0LmlzTGVzc1RoYW5PckVxdWFsKGN1cnJlbnRCdWZmZXJQb3NpdGlvbilcbiAgICAgICAgICBlbmRPZldvcmRQb3NpdGlvbiA9IHJhbmdlLmVuZFxuICAgICAgICBzdG9wKClcblxuICAgIGVuZE9mV29yZFBvc2l0aW9uID8gY3VycmVudEJ1ZmZlclBvc2l0aW9uXG5cbiAgIyBQdWJsaWM6IFJldHJpZXZlcyB0aGUgYnVmZmVyIHBvc2l0aW9uIG9mIHdoZXJlIHRoZSBuZXh0IHdvcmQgc3RhcnRzLlxuICAjXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fVxuICAjICAgKiBgd29yZFJlZ2V4YCBBIHtSZWdFeHB9IGluZGljYXRpbmcgd2hhdCBjb25zdGl0dXRlcyBhIFwid29yZFwiXG4gICMgICAgIChkZWZhdWx0OiB7Ojp3b3JkUmVnRXhwfSkuXG4gICNcbiAgIyBSZXR1cm5zIGEge1JhbmdlfVxuICBnZXRCZWdpbm5pbmdPZk5leHRXb3JkQnVmZmVyUG9zaXRpb246IChvcHRpb25zID0ge30pIC0+XG4gICAgY3VycmVudEJ1ZmZlclBvc2l0aW9uID0gQGdldEJ1ZmZlclBvc2l0aW9uKClcbiAgICBzdGFydCA9IGlmIEBpc0luc2lkZVdvcmQob3B0aW9ucykgdGhlbiBAZ2V0RW5kT2ZDdXJyZW50V29yZEJ1ZmZlclBvc2l0aW9uKG9wdGlvbnMpIGVsc2UgY3VycmVudEJ1ZmZlclBvc2l0aW9uXG4gICAgc2NhblJhbmdlID0gW3N0YXJ0LCBAZWRpdG9yLmdldEVvZkJ1ZmZlclBvc2l0aW9uKCldXG5cbiAgICBiZWdpbm5pbmdPZk5leHRXb3JkUG9zaXRpb24gPSBudWxsXG4gICAgQGVkaXRvci5zY2FuSW5CdWZmZXJSYW5nZSAob3B0aW9ucy53b3JkUmVnZXggPyBAd29yZFJlZ0V4cCgpKSwgc2NhblJhbmdlLCAoe3JhbmdlLCBzdG9wfSkgLT5cbiAgICAgIGJlZ2lubmluZ09mTmV4dFdvcmRQb3NpdGlvbiA9IHJhbmdlLnN0YXJ0XG4gICAgICBzdG9wKClcblxuICAgIGJlZ2lubmluZ09mTmV4dFdvcmRQb3NpdGlvbiBvciBjdXJyZW50QnVmZmVyUG9zaXRpb25cblxuICAjIFB1YmxpYzogUmV0dXJucyB0aGUgYnVmZmVyIFJhbmdlIG9jY3VwaWVkIGJ5IHRoZSB3b3JkIGxvY2F0ZWQgdW5kZXIgdGhlIGN1cnNvci5cbiAgI1xuICAjICogYG9wdGlvbnNgIChvcHRpb25hbCkge09iamVjdH1cbiAgIyAgICogYHdvcmRSZWdleGAgQSB7UmVnRXhwfSBpbmRpY2F0aW5nIHdoYXQgY29uc3RpdHV0ZXMgYSBcIndvcmRcIlxuICAjICAgICAoZGVmYXVsdDogezo6d29yZFJlZ0V4cH0pLlxuICBnZXRDdXJyZW50V29yZEJ1ZmZlclJhbmdlOiAob3B0aW9ucz17fSkgLT5cbiAgICBzdGFydE9wdGlvbnMgPSBPYmplY3QuYXNzaWduKF8uY2xvbmUob3B0aW9ucyksIGFsbG93UHJldmlvdXM6IGZhbHNlKVxuICAgIGVuZE9wdGlvbnMgPSBPYmplY3QuYXNzaWduKF8uY2xvbmUob3B0aW9ucyksIGFsbG93TmV4dDogZmFsc2UpXG4gICAgbmV3IFJhbmdlKEBnZXRCZWdpbm5pbmdPZkN1cnJlbnRXb3JkQnVmZmVyUG9zaXRpb24oc3RhcnRPcHRpb25zKSwgQGdldEVuZE9mQ3VycmVudFdvcmRCdWZmZXJQb3NpdGlvbihlbmRPcHRpb25zKSlcblxuICAjIFB1YmxpYzogUmV0dXJucyB0aGUgYnVmZmVyIFJhbmdlIGZvciB0aGUgY3VycmVudCBsaW5lLlxuICAjXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fVxuICAjICAgKiBgaW5jbHVkZU5ld2xpbmVgIEEge0Jvb2xlYW59IHdoaWNoIGNvbnRyb2xzIHdoZXRoZXIgdGhlIFJhbmdlIHNob3VsZFxuICAjICAgICBpbmNsdWRlIHRoZSBuZXdsaW5lLlxuICBnZXRDdXJyZW50TGluZUJ1ZmZlclJhbmdlOiAob3B0aW9ucykgLT5cbiAgICBAZWRpdG9yLmJ1ZmZlclJhbmdlRm9yQnVmZmVyUm93KEBnZXRCdWZmZXJSb3coKSwgb3B0aW9ucylcblxuICAjIFB1YmxpYzogUmV0cmlldmVzIHRoZSByYW5nZSBmb3IgdGhlIGN1cnJlbnQgcGFyYWdyYXBoLlxuICAjXG4gICMgQSBwYXJhZ3JhcGggaXMgZGVmaW5lZCBhcyBhIGJsb2NrIG9mIHRleHQgc3Vycm91bmRlZCBieSBlbXB0eSBsaW5lcyBvciBjb21tZW50cy5cbiAgI1xuICAjIFJldHVybnMgYSB7UmFuZ2V9LlxuICBnZXRDdXJyZW50UGFyYWdyYXBoQnVmZmVyUmFuZ2U6IC0+XG4gICAgQGVkaXRvci5sYW5ndWFnZU1vZGUucm93UmFuZ2VGb3JQYXJhZ3JhcGhBdEJ1ZmZlclJvdyhAZ2V0QnVmZmVyUm93KCkpXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdGhlIGNoYXJhY3RlcnMgcHJlY2VkaW5nIHRoZSBjdXJzb3IgaW4gdGhlIGN1cnJlbnQgd29yZC5cbiAgZ2V0Q3VycmVudFdvcmRQcmVmaXg6IC0+XG4gICAgQGVkaXRvci5nZXRUZXh0SW5CdWZmZXJSYW5nZShbQGdldEJlZ2lubmluZ09mQ3VycmVudFdvcmRCdWZmZXJQb3NpdGlvbigpLCBAZ2V0QnVmZmVyUG9zaXRpb24oKV0pXG5cbiAgIyMjXG4gIFNlY3Rpb246IFZpc2liaWxpdHlcbiAgIyMjXG5cbiAgIyBQdWJsaWM6IFNldHMgd2hldGhlciB0aGUgY3Vyc29yIGlzIHZpc2libGUuXG4gIHNldFZpc2libGU6ICh2aXNpYmxlKSAtPlxuICAgIGlmIEB2aXNpYmxlIGlzbnQgdmlzaWJsZVxuICAgICAgQHZpc2libGUgPSB2aXNpYmxlXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLXZpc2liaWxpdHknLCBAdmlzaWJsZVxuXG4gICMgUHVibGljOiBSZXR1cm5zIHRoZSB2aXNpYmlsaXR5IG9mIHRoZSBjdXJzb3IuXG4gIGlzVmlzaWJsZTogLT4gQHZpc2libGVcblxuICB1cGRhdGVWaXNpYmlsaXR5OiAtPlxuICAgIGlmIEBzaG93Q3Vyc29yT25TZWxlY3Rpb25cbiAgICAgIEBzZXRWaXNpYmxlKHRydWUpXG4gICAgZWxzZVxuICAgICAgQHNldFZpc2libGUoQG1hcmtlci5nZXRCdWZmZXJSYW5nZSgpLmlzRW1wdHkoKSlcblxuICAjIyNcbiAgU2VjdGlvbjogQ29tcGFyaW5nIHRvIGFub3RoZXIgY3Vyc29yXG4gICMjI1xuXG4gICMgUHVibGljOiBDb21wYXJlIHRoaXMgY3Vyc29yJ3MgYnVmZmVyIHBvc2l0aW9uIHRvIGFub3RoZXIgY3Vyc29yJ3MgYnVmZmVyIHBvc2l0aW9uLlxuICAjXG4gICMgU2VlIHtQb2ludDo6Y29tcGFyZX0gZm9yIG1vcmUgZGV0YWlscy5cbiAgI1xuICAjICogYG90aGVyQ3Vyc29yYHtDdXJzb3J9IHRvIGNvbXBhcmUgYWdhaW5zdFxuICBjb21wYXJlOiAob3RoZXJDdXJzb3IpIC0+XG4gICAgQGdldEJ1ZmZlclBvc2l0aW9uKCkuY29tcGFyZShvdGhlckN1cnNvci5nZXRCdWZmZXJQb3NpdGlvbigpKVxuXG4gICMjI1xuICBTZWN0aW9uOiBVdGlsaXRpZXNcbiAgIyMjXG5cbiAgIyBQdWJsaWM6IFByZXZlbnRzIHRoaXMgY3Vyc29yIGZyb20gY2F1c2luZyBzY3JvbGxpbmcuXG4gIGNsZWFyQXV0b3Njcm9sbDogLT5cblxuICAjIFB1YmxpYzogRGVzZWxlY3RzIHRoZSBjdXJyZW50IHNlbGVjdGlvbi5cbiAgY2xlYXJTZWxlY3Rpb246IChvcHRpb25zKSAtPlxuICAgIEBzZWxlY3Rpb24/LmNsZWFyKG9wdGlvbnMpXG5cbiAgIyBQdWJsaWM6IEdldCB0aGUgUmVnRXhwIHVzZWQgYnkgdGhlIGN1cnNvciB0byBkZXRlcm1pbmUgd2hhdCBhIFwid29yZFwiIGlzLlxuICAjXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYGluY2x1ZGVOb25Xb3JkQ2hhcmFjdGVyc2AgQSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGluY2x1ZGVcbiAgIyAgICAgbm9uLXdvcmQgY2hhcmFjdGVycyBpbiB0aGUgcmVnZXguIChkZWZhdWx0OiB0cnVlKVxuICAjXG4gICMgUmV0dXJucyBhIHtSZWdFeHB9LlxuICB3b3JkUmVnRXhwOiAob3B0aW9ucykgLT5cbiAgICBub25Xb3JkQ2hhcmFjdGVycyA9IF8uZXNjYXBlUmVnRXhwKEBnZXROb25Xb3JkQ2hhcmFjdGVycygpKVxuICAgIHNvdXJjZSA9IFwiXltcXHQgXSokfFteXFxcXHMje25vbldvcmRDaGFyYWN0ZXJzfV0rXCJcbiAgICBpZiBvcHRpb25zPy5pbmNsdWRlTm9uV29yZENoYXJhY3RlcnMgPyB0cnVlXG4gICAgICBzb3VyY2UgKz0gXCJ8XCIgKyBcIlsje25vbldvcmRDaGFyYWN0ZXJzfV0rXCJcbiAgICBuZXcgUmVnRXhwKHNvdXJjZSwgXCJnXCIpXG5cbiAgIyBQdWJsaWM6IEdldCB0aGUgUmVnRXhwIHVzZWQgYnkgdGhlIGN1cnNvciB0byBkZXRlcm1pbmUgd2hhdCBhIFwic3Vid29yZFwiIGlzLlxuICAjXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYGJhY2t3YXJkc2AgQSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGxvb2sgZm9yd2FyZHMgb3IgYmFja3dhcmRzXG4gICMgICAgIGZvciB0aGUgbmV4dCBzdWJ3b3JkLiAoZGVmYXVsdDogZmFsc2UpXG4gICNcbiAgIyBSZXR1cm5zIGEge1JlZ0V4cH0uXG4gIHN1YndvcmRSZWdFeHA6IChvcHRpb25zPXt9KSAtPlxuICAgIG5vbldvcmRDaGFyYWN0ZXJzID0gQGdldE5vbldvcmRDaGFyYWN0ZXJzKClcbiAgICBsb3dlcmNhc2VMZXR0ZXJzID0gJ2EtelxcXFx1MDBERi1cXFxcdTAwRjZcXFxcdTAwRjgtXFxcXHUwMEZGJ1xuICAgIHVwcGVyY2FzZUxldHRlcnMgPSAnQS1aXFxcXHUwMEMwLVxcXFx1MDBENlxcXFx1MDBEOC1cXFxcdTAwREUnXG4gICAgc25ha2VDYW1lbFNlZ21lbnQgPSBcIlsje3VwcGVyY2FzZUxldHRlcnN9XT9bI3tsb3dlcmNhc2VMZXR0ZXJzfV0rXCJcbiAgICBzZWdtZW50cyA9IFtcbiAgICAgIFwiXltcXHQgXStcIixcbiAgICAgIFwiW1xcdCBdKyRcIixcbiAgICAgIFwiWyN7dXBwZXJjYXNlTGV0dGVyc31dKyg/IVsje2xvd2VyY2FzZUxldHRlcnN9XSlcIixcbiAgICAgIFwiXFxcXGQrXCJcbiAgICBdXG4gICAgaWYgb3B0aW9ucy5iYWNrd2FyZHNcbiAgICAgIHNlZ21lbnRzLnB1c2goXCIje3NuYWtlQ2FtZWxTZWdtZW50fV8qXCIpXG4gICAgICBzZWdtZW50cy5wdXNoKFwiWyN7Xy5lc2NhcGVSZWdFeHAobm9uV29yZENoYXJhY3RlcnMpfV0rXFxcXHMqXCIpXG4gICAgZWxzZVxuICAgICAgc2VnbWVudHMucHVzaChcIl8qI3tzbmFrZUNhbWVsU2VnbWVudH1cIilcbiAgICAgIHNlZ21lbnRzLnB1c2goXCJcXFxccypbI3tfLmVzY2FwZVJlZ0V4cChub25Xb3JkQ2hhcmFjdGVycyl9XStcIilcbiAgICBzZWdtZW50cy5wdXNoKFwiXytcIilcbiAgICBuZXcgUmVnRXhwKHNlZ21lbnRzLmpvaW4oXCJ8XCIpLCBcImdcIilcblxuICAjIyNcbiAgU2VjdGlvbjogUHJpdmF0ZVxuICAjIyNcblxuICBzZXRTaG93Q3Vyc29yT25TZWxlY3Rpb246ICh2YWx1ZSkgLT5cbiAgICBpZiB2YWx1ZSBpc250IEBzaG93Q3Vyc29yT25TZWxlY3Rpb25cbiAgICAgIEBzaG93Q3Vyc29yT25TZWxlY3Rpb24gPSB2YWx1ZVxuICAgICAgQHVwZGF0ZVZpc2liaWxpdHkoKVxuXG4gIGdldE5vbldvcmRDaGFyYWN0ZXJzOiAtPlxuICAgIEBlZGl0b3IuZ2V0Tm9uV29yZENoYXJhY3RlcnMoQGdldFNjb3BlRGVzY3JpcHRvcigpLmdldFNjb3Blc0FycmF5KCkpXG5cbiAgY2hhbmdlUG9zaXRpb246IChvcHRpb25zLCBmbikgLT5cbiAgICBAY2xlYXJTZWxlY3Rpb24oYXV0b3Njcm9sbDogZmFsc2UpXG4gICAgZm4oKVxuICAgIEBhdXRvc2Nyb2xsKCkgaWYgb3B0aW9ucy5hdXRvc2Nyb2xsID8gQGlzTGFzdEN1cnNvcigpXG5cbiAgZ2V0U2NyZWVuUmFuZ2U6IC0+XG4gICAge3JvdywgY29sdW1ufSA9IEBnZXRTY3JlZW5Qb3NpdGlvbigpXG4gICAgbmV3IFJhbmdlKG5ldyBQb2ludChyb3csIGNvbHVtbiksIG5ldyBQb2ludChyb3csIGNvbHVtbiArIDEpKVxuXG4gIGF1dG9zY3JvbGw6IChvcHRpb25zKSAtPlxuICAgIEBlZGl0b3Iuc2Nyb2xsVG9TY3JlZW5SYW5nZShAZ2V0U2NyZWVuUmFuZ2UoKSwgb3B0aW9ucylcblxuICBnZXRCZWdpbm5pbmdPZk5leHRQYXJhZ3JhcGhCdWZmZXJQb3NpdGlvbjogLT5cbiAgICBzdGFydCA9IEBnZXRCdWZmZXJQb3NpdGlvbigpXG4gICAgZW9mID0gQGVkaXRvci5nZXRFb2ZCdWZmZXJQb3NpdGlvbigpXG4gICAgc2NhblJhbmdlID0gW3N0YXJ0LCBlb2ZdXG5cbiAgICB7cm93LCBjb2x1bW59ID0gZW9mXG4gICAgcG9zaXRpb24gPSBuZXcgUG9pbnQocm93LCBjb2x1bW4gLSAxKVxuXG4gICAgQGVkaXRvci5zY2FuSW5CdWZmZXJSYW5nZSBFbXB0eUxpbmVSZWdFeHAsIHNjYW5SYW5nZSwgKHtyYW5nZSwgc3RvcH0pIC0+XG4gICAgICBwb3NpdGlvbiA9IHJhbmdlLnN0YXJ0LnRyYXZlcnNlKFBvaW50KDEsIDApKVxuICAgICAgc3RvcCgpIHVubGVzcyBwb3NpdGlvbi5pc0VxdWFsKHN0YXJ0KVxuICAgIHBvc2l0aW9uXG5cbiAgZ2V0QmVnaW5uaW5nT2ZQcmV2aW91c1BhcmFncmFwaEJ1ZmZlclBvc2l0aW9uOiAtPlxuICAgIHN0YXJ0ID0gQGdldEJ1ZmZlclBvc2l0aW9uKClcblxuICAgIHtyb3csIGNvbHVtbn0gPSBzdGFydFxuICAgIHNjYW5SYW5nZSA9IFtbcm93LTEsIGNvbHVtbl0sIFswLCAwXV1cbiAgICBwb3NpdGlvbiA9IG5ldyBQb2ludCgwLCAwKVxuICAgIEBlZGl0b3IuYmFja3dhcmRzU2NhbkluQnVmZmVyUmFuZ2UgRW1wdHlMaW5lUmVnRXhwLCBzY2FuUmFuZ2UsICh7cmFuZ2UsIHN0b3B9KSAtPlxuICAgICAgcG9zaXRpb24gPSByYW5nZS5zdGFydC50cmF2ZXJzZShQb2ludCgxLCAwKSlcbiAgICAgIHN0b3AoKSB1bmxlc3MgcG9zaXRpb24uaXNFcXVhbChzdGFydClcbiAgICBwb3NpdGlvblxuIl19
