(function() {
  var LanguageMode, NullGrammar, OnigRegExp, Range, ScopeDescriptor, _;

  Range = require('text-buffer').Range;

  _ = require('underscore-plus');

  OnigRegExp = require('oniguruma').OnigRegExp;

  ScopeDescriptor = require('./scope-descriptor');

  NullGrammar = require('./null-grammar');

  module.exports = LanguageMode = (function() {
    function LanguageMode(editor) {
      this.editor = editor;
      this.buffer = this.editor.buffer;
      this.regexesByPattern = {};
    }

    LanguageMode.prototype.destroy = function() {};

    LanguageMode.prototype.toggleLineCommentForBufferRow = function(row) {
      return this.toggleLineCommentsForBufferRows(row, row);
    };

    LanguageMode.prototype.toggleLineCommentsForBufferRows = function(start, end) {
      var allBlank, allBlankOrCommented, blank, buffer, columnEnd, columnStart, commentEndRegex, commentEndRegexString, commentEndString, commentStartRegex, commentStartRegexString, commentStartString, commentStrings, endMatch, i, indent, indentLength, indentRegex, indentString, j, k, line, match, ref, ref1, ref2, ref3, ref4, ref5, ref6, row, scope, shouldUncomment, startMatch, tabLength;
      scope = this.editor.scopeDescriptorForBufferPosition([start, 0]);
      commentStrings = this.editor.getCommentStrings(scope);
      if (!(commentStrings != null ? commentStrings.commentStartString : void 0)) {
        return;
      }
      commentStartString = commentStrings.commentStartString, commentEndString = commentStrings.commentEndString;
      buffer = this.editor.buffer;
      commentStartRegexString = _.escapeRegExp(commentStartString).replace(/(\s+)$/, '(?:$1)?');
      commentStartRegex = new OnigRegExp("^(\\s*)(" + commentStartRegexString + ")");
      if (commentEndString) {
        shouldUncomment = commentStartRegex.testSync(buffer.lineForRow(start));
        if (shouldUncomment) {
          commentEndRegexString = _.escapeRegExp(commentEndString).replace(/^(\s+)/, '(?:$1)?');
          commentEndRegex = new OnigRegExp("(" + commentEndRegexString + ")(\\s*)$");
          startMatch = commentStartRegex.searchSync(buffer.lineForRow(start));
          endMatch = commentEndRegex.searchSync(buffer.lineForRow(end));
          if (startMatch && endMatch) {
            buffer.transact(function() {
              var columnEnd, columnStart, endColumn, endLength;
              columnStart = startMatch[1].length;
              columnEnd = columnStart + startMatch[2].length;
              buffer.setTextInRange([[start, columnStart], [start, columnEnd]], "");
              endLength = buffer.lineLengthForRow(end) - endMatch[2].length;
              endColumn = endLength - endMatch[1].length;
              return buffer.setTextInRange([[end, endColumn], [end, endLength]], "");
            });
          }
        } else {
          buffer.transact(function() {
            var indentLength, ref, ref1;
            indentLength = (ref = (ref1 = buffer.lineForRow(start).match(/^\s*/)) != null ? ref1[0].length : void 0) != null ? ref : 0;
            buffer.insert([start, indentLength], commentStartString);
            return buffer.insert([end, buffer.lineLengthForRow(end)], commentEndString);
          });
        }
      } else {
        allBlank = true;
        allBlankOrCommented = true;
        for (row = i = ref = start, ref1 = end; i <= ref1; row = i += 1) {
          line = buffer.lineForRow(row);
          blank = line != null ? line.match(/^\s*$/) : void 0;
          if (!blank) {
            allBlank = false;
          }
          if (!(blank || commentStartRegex.testSync(line))) {
            allBlankOrCommented = false;
          }
        }
        shouldUncomment = allBlankOrCommented && !allBlank;
        if (shouldUncomment) {
          for (row = j = ref2 = start, ref3 = end; j <= ref3; row = j += 1) {
            if (match = commentStartRegex.searchSync(buffer.lineForRow(row))) {
              columnStart = match[1].length;
              columnEnd = columnStart + match[2].length;
              buffer.setTextInRange([[row, columnStart], [row, columnEnd]], "");
            }
          }
        } else {
          if (start === end) {
            indent = this.editor.indentationForBufferRow(start);
          } else {
            indent = this.minIndentLevelForRowRange(start, end);
          }
          indentString = this.editor.buildIndentString(indent);
          tabLength = this.editor.getTabLength();
          indentRegex = new RegExp("(\t|[ ]{" + tabLength + "}){" + (Math.floor(indent)) + "}");
          for (row = k = ref4 = start, ref5 = end; k <= ref5; row = k += 1) {
            line = buffer.lineForRow(row);
            if (indentLength = (ref6 = line.match(indentRegex)) != null ? ref6[0].length : void 0) {
              buffer.insert([row, indentLength], commentStartString);
            } else {
              buffer.setTextInRange([[row, 0], [row, indentString.length]], indentString + commentStartString);
            }
          }
        }
      }
    };

    LanguageMode.prototype.foldAll = function() {
      var currentRow, endRow, foldedRowRanges, i, ref, ref1, ref2, rowRange, startRow;
      this.unfoldAll();
      foldedRowRanges = {};
      for (currentRow = i = 0, ref = this.buffer.getLastRow(); i <= ref; currentRow = i += 1) {
        rowRange = (ref2 = (ref1 = this.rowRangeForFoldAtBufferRow(currentRow)) != null ? ref1 : [], startRow = ref2[0], endRow = ref2[1], ref2);
        if (startRow == null) {
          continue;
        }
        if (foldedRowRanges[rowRange]) {
          continue;
        }
        this.editor.foldBufferRowRange(startRow, endRow);
        foldedRowRanges[rowRange] = true;
      }
    };

    LanguageMode.prototype.unfoldAll = function() {
      return this.editor.displayLayer.destroyAllFolds();
    };

    LanguageMode.prototype.foldAllAtIndentLevel = function(indentLevel) {
      var currentRow, endRow, foldedRowRanges, i, ref, ref1, ref2, rowRange, startRow;
      this.unfoldAll();
      foldedRowRanges = {};
      for (currentRow = i = 0, ref = this.buffer.getLastRow(); i <= ref; currentRow = i += 1) {
        rowRange = (ref2 = (ref1 = this.rowRangeForFoldAtBufferRow(currentRow)) != null ? ref1 : [], startRow = ref2[0], endRow = ref2[1], ref2);
        if (startRow == null) {
          continue;
        }
        if (foldedRowRanges[rowRange]) {
          continue;
        }
        if (this.editor.indentationForBufferRow(startRow) === indentLevel) {
          this.editor.foldBufferRowRange(startRow, endRow);
          foldedRowRanges[rowRange] = true;
        }
      }
    };

    LanguageMode.prototype.foldBufferRow = function(bufferRow) {
      var currentRow, endRow, i, ref, ref1, ref2, startRow;
      for (currentRow = i = ref = bufferRow; i >= 0; currentRow = i += -1) {
        ref2 = (ref1 = this.rowRangeForFoldAtBufferRow(currentRow)) != null ? ref1 : [], startRow = ref2[0], endRow = ref2[1];
        if (!((startRow != null) && (startRow <= bufferRow && bufferRow <= endRow))) {
          continue;
        }
        if (!this.editor.isFoldedAtBufferRow(startRow)) {
          return this.editor.foldBufferRowRange(startRow, endRow);
        }
      }
    };

    LanguageMode.prototype.rowRangeForFoldAtBufferRow = function(bufferRow) {
      var rowRange;
      rowRange = this.rowRangeForCommentAtBufferRow(bufferRow);
      if (rowRange == null) {
        rowRange = this.rowRangeForCodeFoldAtBufferRow(bufferRow);
      }
      return rowRange;
    };

    LanguageMode.prototype.rowRangeForCommentAtBufferRow = function(bufferRow) {
      var currentRow, endRow, i, j, ref, ref1, ref2, ref3, ref4, ref5, startRow;
      if (!((ref = this.editor.tokenizedBuffer.tokenizedLines[bufferRow]) != null ? ref.isComment() : void 0)) {
        return;
      }
      startRow = bufferRow;
      endRow = bufferRow;
      if (bufferRow > 0) {
        for (currentRow = i = ref1 = bufferRow - 1; i >= 0; currentRow = i += -1) {
          if (!((ref2 = this.editor.tokenizedBuffer.tokenizedLines[currentRow]) != null ? ref2.isComment() : void 0)) {
            break;
          }
          startRow = currentRow;
        }
      }
      if (bufferRow < this.buffer.getLastRow()) {
        for (currentRow = j = ref3 = bufferRow + 1, ref4 = this.buffer.getLastRow(); j <= ref4; currentRow = j += 1) {
          if (!((ref5 = this.editor.tokenizedBuffer.tokenizedLines[currentRow]) != null ? ref5.isComment() : void 0)) {
            break;
          }
          endRow = currentRow;
        }
      }
      if (startRow !== endRow) {
        return [startRow, endRow];
      }
    };

    LanguageMode.prototype.rowRangeForCodeFoldAtBufferRow = function(bufferRow) {
      var foldEndRow, i, includeRowInFold, indentation, ref, ref1, ref2, row, scopeDescriptor, startIndentLevel;
      if (!this.isFoldableAtBufferRow(bufferRow)) {
        return null;
      }
      startIndentLevel = this.editor.indentationForBufferRow(bufferRow);
      scopeDescriptor = this.editor.scopeDescriptorForBufferPosition([bufferRow, 0]);
      for (row = i = ref = bufferRow + 1, ref1 = this.editor.getLastBufferRow(); i <= ref1; row = i += 1) {
        if (this.editor.isBufferRowBlank(row)) {
          continue;
        }
        indentation = this.editor.indentationForBufferRow(row);
        if (indentation <= startIndentLevel) {
          includeRowInFold = indentation === startIndentLevel && ((ref2 = this.foldEndRegexForScopeDescriptor(scopeDescriptor)) != null ? ref2.searchSync(this.editor.lineTextForBufferRow(row)) : void 0);
          if (includeRowInFold) {
            foldEndRow = row;
          }
          break;
        }
        foldEndRow = row;
      }
      return [bufferRow, foldEndRow];
    };

    LanguageMode.prototype.isFoldableAtBufferRow = function(bufferRow) {
      return this.editor.tokenizedBuffer.isFoldableAtRow(bufferRow);
    };

    LanguageMode.prototype.isLineCommentedAtBufferRow = function(bufferRow) {
      var ref;
      if (!((0 <= bufferRow && bufferRow <= this.editor.getLastBufferRow()))) {
        return false;
      }
      return (ref = this.editor.tokenizedBuffer.tokenizedLines[bufferRow]) != null ? ref.isComment() : void 0;
    };

    LanguageMode.prototype.rowRangeForParagraphAtBufferRow = function(bufferRow) {
      var commentStartRegex, commentStartRegexString, commentStrings, endRow, filterCommentStart, firstRow, isOriginalRowComment, lastRow, range, ref, ref1, scope, startRow;
      scope = this.editor.scopeDescriptorForBufferPosition([bufferRow, 0]);
      commentStrings = this.editor.getCommentStrings(scope);
      commentStartRegex = null;
      if (((commentStrings != null ? commentStrings.commentStartString : void 0) != null) && (commentStrings.commentEndString == null)) {
        commentStartRegexString = _.escapeRegExp(commentStrings.commentStartString).replace(/(\s+)$/, '(?:$1)?');
        commentStartRegex = new OnigRegExp("^(\\s*)(" + commentStartRegexString + ")");
      }
      filterCommentStart = function(line) {
        var matches;
        if (commentStartRegex != null) {
          matches = commentStartRegex.searchSync(line);
          if (matches != null ? matches.length : void 0) {
            line = line.substring(matches[0].end);
          }
        }
        return line;
      };
      if (!/\S/.test(filterCommentStart(this.editor.lineTextForBufferRow(bufferRow)))) {
        return;
      }
      if (this.isLineCommentedAtBufferRow(bufferRow)) {
        isOriginalRowComment = true;
        range = this.rowRangeForCommentAtBufferRow(bufferRow);
        ref = range || [bufferRow, bufferRow], firstRow = ref[0], lastRow = ref[1];
      } else {
        isOriginalRowComment = false;
        ref1 = [0, this.editor.getLastBufferRow() - 1], firstRow = ref1[0], lastRow = ref1[1];
      }
      startRow = bufferRow;
      while (startRow > firstRow) {
        if (this.isLineCommentedAtBufferRow(startRow - 1) !== isOriginalRowComment) {
          break;
        }
        if (!/\S/.test(filterCommentStart(this.editor.lineTextForBufferRow(startRow - 1)))) {
          break;
        }
        startRow--;
      }
      endRow = bufferRow;
      lastRow = this.editor.getLastBufferRow();
      while (endRow < lastRow) {
        if (this.isLineCommentedAtBufferRow(endRow + 1) !== isOriginalRowComment) {
          break;
        }
        if (!/\S/.test(filterCommentStart(this.editor.lineTextForBufferRow(endRow + 1)))) {
          break;
        }
        endRow++;
      }
      return new Range([startRow, 0], [endRow, this.editor.lineTextForBufferRow(endRow).length]);
    };

    LanguageMode.prototype.suggestedIndentForBufferRow = function(bufferRow, options) {
      var line, tokenizedLine;
      line = this.buffer.lineForRow(bufferRow);
      tokenizedLine = this.editor.tokenizedBuffer.tokenizedLineForRow(bufferRow);
      return this.suggestedIndentForTokenizedLineAtBufferRow(bufferRow, line, tokenizedLine, options);
    };

    LanguageMode.prototype.suggestedIndentForLineAtBufferRow = function(bufferRow, line, options) {
      var tokenizedLine;
      tokenizedLine = this.editor.tokenizedBuffer.buildTokenizedLineForRowWithText(bufferRow, line);
      return this.suggestedIndentForTokenizedLineAtBufferRow(bufferRow, line, tokenizedLine, options);
    };

    LanguageMode.prototype.suggestedIndentForTokenizedLineAtBufferRow = function(bufferRow, line, tokenizedLine, options) {
      var decreaseIndentRegex, decreaseNextIndentRegex, desiredIndentLevel, increaseIndentRegex, iterator, precedingLine, precedingRow, ref, scopeDescriptor;
      iterator = tokenizedLine.getTokenIterator();
      iterator.next();
      scopeDescriptor = new ScopeDescriptor({
        scopes: iterator.getScopes()
      });
      increaseIndentRegex = this.increaseIndentRegexForScopeDescriptor(scopeDescriptor);
      decreaseIndentRegex = this.decreaseIndentRegexForScopeDescriptor(scopeDescriptor);
      decreaseNextIndentRegex = this.decreaseNextIndentRegexForScopeDescriptor(scopeDescriptor);
      if ((ref = options != null ? options.skipBlankLines : void 0) != null ? ref : true) {
        precedingRow = this.buffer.previousNonBlankRow(bufferRow);
        if (precedingRow == null) {
          return 0;
        }
      } else {
        precedingRow = bufferRow - 1;
        if (precedingRow < 0) {
          return 0;
        }
      }
      desiredIndentLevel = this.editor.indentationForBufferRow(precedingRow);
      if (!increaseIndentRegex) {
        return desiredIndentLevel;
      }
      if (!this.editor.isBufferRowCommented(precedingRow)) {
        precedingLine = this.buffer.lineForRow(precedingRow);
        if (increaseIndentRegex != null ? increaseIndentRegex.testSync(precedingLine) : void 0) {
          desiredIndentLevel += 1;
        }
        if (decreaseNextIndentRegex != null ? decreaseNextIndentRegex.testSync(precedingLine) : void 0) {
          desiredIndentLevel -= 1;
        }
      }
      if (!this.buffer.isRowBlank(precedingRow)) {
        if (decreaseIndentRegex != null ? decreaseIndentRegex.testSync(line) : void 0) {
          desiredIndentLevel -= 1;
        }
      }
      return Math.max(desiredIndentLevel, 0);
    };

    LanguageMode.prototype.minIndentLevelForRowRange = function(startRow, endRow) {
      var indents, row;
      indents = (function() {
        var i, ref, ref1, results;
        results = [];
        for (row = i = ref = startRow, ref1 = endRow; i <= ref1; row = i += 1) {
          if (!this.editor.isBufferRowBlank(row)) {
            results.push(this.editor.indentationForBufferRow(row));
          }
        }
        return results;
      }).call(this);
      if (!indents.length) {
        indents = [0];
      }
      return Math.min.apply(Math, indents);
    };

    LanguageMode.prototype.autoIndentBufferRows = function(startRow, endRow) {
      var i, ref, ref1, row;
      for (row = i = ref = startRow, ref1 = endRow; i <= ref1; row = i += 1) {
        this.autoIndentBufferRow(row);
      }
    };

    LanguageMode.prototype.autoIndentBufferRow = function(bufferRow, options) {
      var indentLevel;
      indentLevel = this.suggestedIndentForBufferRow(bufferRow, options);
      return this.editor.setIndentationForBufferRow(bufferRow, indentLevel, options);
    };

    LanguageMode.prototype.autoDecreaseIndentForBufferRow = function(bufferRow) {
      var currentIndentLevel, decreaseIndentRegex, decreaseNextIndentRegex, desiredIndentLevel, increaseIndentRegex, line, precedingLine, precedingRow, scopeDescriptor;
      scopeDescriptor = this.editor.scopeDescriptorForBufferPosition([bufferRow, 0]);
      if (!(decreaseIndentRegex = this.decreaseIndentRegexForScopeDescriptor(scopeDescriptor))) {
        return;
      }
      line = this.buffer.lineForRow(bufferRow);
      if (!decreaseIndentRegex.testSync(line)) {
        return;
      }
      currentIndentLevel = this.editor.indentationForBufferRow(bufferRow);
      if (currentIndentLevel === 0) {
        return;
      }
      precedingRow = this.buffer.previousNonBlankRow(bufferRow);
      if (precedingRow == null) {
        return;
      }
      precedingLine = this.buffer.lineForRow(precedingRow);
      desiredIndentLevel = this.editor.indentationForBufferRow(precedingRow);
      if (increaseIndentRegex = this.increaseIndentRegexForScopeDescriptor(scopeDescriptor)) {
        if (!increaseIndentRegex.testSync(precedingLine)) {
          desiredIndentLevel -= 1;
        }
      }
      if (decreaseNextIndentRegex = this.decreaseNextIndentRegexForScopeDescriptor(scopeDescriptor)) {
        if (decreaseNextIndentRegex.testSync(precedingLine)) {
          desiredIndentLevel -= 1;
        }
      }
      if (desiredIndentLevel >= 0 && desiredIndentLevel < currentIndentLevel) {
        return this.editor.setIndentationForBufferRow(bufferRow, desiredIndentLevel);
      }
    };

    LanguageMode.prototype.cacheRegex = function(pattern) {
      var base;
      if (pattern) {
        return (base = this.regexesByPattern)[pattern] != null ? base[pattern] : base[pattern] = new OnigRegExp(pattern);
      }
    };

    LanguageMode.prototype.increaseIndentRegexForScopeDescriptor = function(scopeDescriptor) {
      return this.cacheRegex(this.editor.getIncreaseIndentPattern(scopeDescriptor));
    };

    LanguageMode.prototype.decreaseIndentRegexForScopeDescriptor = function(scopeDescriptor) {
      return this.cacheRegex(this.editor.getDecreaseIndentPattern(scopeDescriptor));
    };

    LanguageMode.prototype.decreaseNextIndentRegexForScopeDescriptor = function(scopeDescriptor) {
      return this.cacheRegex(this.editor.getDecreaseNextIndentPattern(scopeDescriptor));
    };

    LanguageMode.prototype.foldEndRegexForScopeDescriptor = function(scopeDescriptor) {
      return this.cacheRegex(this.editor.getFoldEndPattern(scopeDescriptor));
    };

    return LanguageMode;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2xhbmd1YWdlLW1vZGUuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQyxRQUFTLE9BQUEsQ0FBUSxhQUFSOztFQUNWLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBQ0gsYUFBYyxPQUFBLENBQVEsV0FBUjs7RUFDZixlQUFBLEdBQWtCLE9BQUEsQ0FBUSxvQkFBUjs7RUFDbEIsV0FBQSxHQUFjLE9BQUEsQ0FBUSxnQkFBUjs7RUFFZCxNQUFNLENBQUMsT0FBUCxHQUNNO0lBSVMsc0JBQUMsTUFBRDtNQUFDLElBQUMsQ0FBQSxTQUFEO01BQ1gsSUFBQyxDQUFBLFNBQVUsSUFBQyxDQUFBLE9BQVg7TUFDRixJQUFDLENBQUEsZ0JBQUQsR0FBb0I7SUFGVDs7MkJBSWIsT0FBQSxHQUFTLFNBQUEsR0FBQTs7MkJBRVQsNkJBQUEsR0FBK0IsU0FBQyxHQUFEO2FBQzdCLElBQUMsQ0FBQSwrQkFBRCxDQUFpQyxHQUFqQyxFQUFzQyxHQUF0QztJQUQ2Qjs7MkJBUy9CLCtCQUFBLEdBQWlDLFNBQUMsS0FBRCxFQUFRLEdBQVI7QUFDL0IsVUFBQTtNQUFBLEtBQUEsR0FBUSxJQUFDLENBQUEsTUFBTSxDQUFDLGdDQUFSLENBQXlDLENBQUMsS0FBRCxFQUFRLENBQVIsQ0FBekM7TUFDUixjQUFBLEdBQWlCLElBQUMsQ0FBQSxNQUFNLENBQUMsaUJBQVIsQ0FBMEIsS0FBMUI7TUFDakIsSUFBQSwyQkFBYyxjQUFjLENBQUUsNEJBQTlCO0FBQUEsZUFBQTs7TUFDQyxzREFBRCxFQUFxQjtNQUVyQixNQUFBLEdBQVMsSUFBQyxDQUFBLE1BQU0sQ0FBQztNQUNqQix1QkFBQSxHQUEwQixDQUFDLENBQUMsWUFBRixDQUFlLGtCQUFmLENBQWtDLENBQUMsT0FBbkMsQ0FBMkMsUUFBM0MsRUFBcUQsU0FBckQ7TUFD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QSxJQUFHLGtCQUFBLElBQXNCLENBQXRCLElBQTRCLGtCQUFBLEdBQXFCLGtCQUFwRDtlQUNFLElBQUMsQ0FBQSxNQUFNLENBQUMsMEJBQVIsQ0FBbUMsU0FBbkMsRUFBOEMsa0JBQTlDLEVBREY7O0lBdEI4Qjs7MkJBeUJoQyxVQUFBLEdBQVksU0FBQyxPQUFEO0FBQ1YsVUFBQTtNQUFBLElBQUcsT0FBSDtxRUFDb0IsQ0FBQSxPQUFBLFFBQUEsQ0FBQSxPQUFBLElBQWdCLElBQUEsVUFBQSxDQUFXLE9BQVgsRUFEcEM7O0lBRFU7OzJCQUlaLHFDQUFBLEdBQXVDLFNBQUMsZUFBRDthQUNyQyxJQUFDLENBQUEsVUFBRCxDQUFZLElBQUMsQ0FBQSxNQUFNLENBQUMsd0JBQVIsQ0FBaUMsZUFBakMsQ0FBWjtJQURxQzs7MkJBR3ZDLHFDQUFBLEdBQXVDLFNBQUMsZUFBRDthQUNyQyxJQUFDLENBQUEsVUFBRCxDQUFZLElBQUMsQ0FBQSxNQUFNLENBQUMsd0JBQVIsQ0FBaUMsZUFBakMsQ0FBWjtJQURxQzs7MkJBR3ZDLHlDQUFBLEdBQTJDLFNBQUMsZUFBRDthQUN6QyxJQUFDLENBQUEsVUFBRCxDQUFZLElBQUMsQ0FBQSxNQUFNLENBQUMsNEJBQVIsQ0FBcUMsZUFBckMsQ0FBWjtJQUR5Qzs7MkJBRzNDLDhCQUFBLEdBQWdDLFNBQUMsZUFBRDthQUM5QixJQUFDLENBQUEsVUFBRCxDQUFZLElBQUMsQ0FBQSxNQUFNLENBQUMsaUJBQVIsQ0FBMEIsZUFBMUIsQ0FBWjtJQUQ4Qjs7Ozs7QUE1VmxDIiwic291cmNlc0NvbnRlbnQiOlsie1JhbmdlfSA9IHJlcXVpcmUgJ3RleHQtYnVmZmVyJ1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbntPbmlnUmVnRXhwfSA9IHJlcXVpcmUgJ29uaWd1cnVtYSdcblNjb3BlRGVzY3JpcHRvciA9IHJlcXVpcmUgJy4vc2NvcGUtZGVzY3JpcHRvcidcbk51bGxHcmFtbWFyID0gcmVxdWlyZSAnLi9udWxsLWdyYW1tYXInXG5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIExhbmd1YWdlTW9kZVxuICAjIFNldHMgdXAgYSBgTGFuZ3VhZ2VNb2RlYCBmb3IgdGhlIGdpdmVuIHtUZXh0RWRpdG9yfS5cbiAgI1xuICAjIGVkaXRvciAtIFRoZSB7VGV4dEVkaXRvcn0gdG8gYXNzb2NpYXRlIHdpdGhcbiAgY29uc3RydWN0b3I6IChAZWRpdG9yKSAtPlxuICAgIHtAYnVmZmVyfSA9IEBlZGl0b3JcbiAgICBAcmVnZXhlc0J5UGF0dGVybiA9IHt9XG5cbiAgZGVzdHJveTogLT5cblxuICB0b2dnbGVMaW5lQ29tbWVudEZvckJ1ZmZlclJvdzogKHJvdykgLT5cbiAgICBAdG9nZ2xlTGluZUNvbW1lbnRzRm9yQnVmZmVyUm93cyhyb3csIHJvdylcblxuICAjIFdyYXBzIHRoZSBsaW5lcyBiZXR3ZWVuIHR3byByb3dzIGluIGNvbW1lbnRzLlxuICAjXG4gICMgSWYgdGhlIGxhbmd1YWdlIGRvZXNuJ3QgaGF2ZSBjb21tZW50LCBub3RoaW5nIGhhcHBlbnMuXG4gICNcbiAgIyBzdGFydFJvdyAtIFRoZSByb3cge051bWJlcn0gdG8gc3RhcnQgYXRcbiAgIyBlbmRSb3cgLSBUaGUgcm93IHtOdW1iZXJ9IHRvIGVuZCBhdFxuICB0b2dnbGVMaW5lQ29tbWVudHNGb3JCdWZmZXJSb3dzOiAoc3RhcnQsIGVuZCkgLT5cbiAgICBzY29wZSA9IEBlZGl0b3Iuc2NvcGVEZXNjcmlwdG9yRm9yQnVmZmVyUG9zaXRpb24oW3N0YXJ0LCAwXSlcbiAgICBjb21tZW50U3RyaW5ncyA9IEBlZGl0b3IuZ2V0Q29tbWVudFN0cmluZ3Moc2NvcGUpXG4gICAgcmV0dXJuIHVubGVzcyBjb21tZW50U3RyaW5ncz8uY29tbWVudFN0YXJ0U3RyaW5nXG4gICAge2NvbW1lbnRTdGFydFN0cmluZywgY29tbWVudEVuZFN0cmluZ30gPSBjb21tZW50U3RyaW5nc1xuXG4gICAgYnVmZmVyID0gQGVkaXRvci5idWZmZXJcbiAgICBjb21tZW50U3RhcnRSZWdleFN0cmluZyA9IF8uZXNjYXBlUmVnRXhwKGNvbW1lbnRTdGFydFN0cmluZykucmVwbGFjZSgvKFxccyspJC8sICcoPzokMSk/JylcbiAgICBjb21tZW50U3RhcnRSZWdleCA9IG5ldyBPbmlnUmVnRXhwKFwiXihcXFxccyopKCN7Y29tbWVudFN0YXJ0UmVnZXhTdHJpbmd9KVwiKVxuXG4gICAgaWYgY29tbWVudEVuZFN0cmluZ1xuICAgICAgc2hvdWxkVW5jb21tZW50ID0gY29tbWVudFN0YXJ0UmVnZXgudGVzdFN5bmMoYnVmZmVyLmxpbmVGb3JSb3coc3RhcnQpKVxuICAgICAgaWYgc2hvdWxkVW5jb21tZW50XG4gICAgICAgIGNvbW1lbnRFbmRSZWdleFN0cmluZyA9IF8uZXNjYXBlUmVnRXhwKGNvbW1lbnRFbmRTdHJpbmcpLnJlcGxhY2UoL14oXFxzKykvLCAnKD86JDEpPycpXG4gICAgICAgIGNvbW1lbnRFbmRSZWdleCA9IG5ldyBPbmlnUmVnRXhwKFwiKCN7Y29tbWVudEVuZFJlZ2V4U3RyaW5nfSkoXFxcXHMqKSRcIilcbiAgICAgICAgc3RhcnRNYXRjaCA9ICBjb21tZW50U3RhcnRSZWdleC5zZWFyY2hTeW5jKGJ1ZmZlci5saW5lRm9yUm93KHN0YXJ0KSlcbiAgICAgICAgZW5kTWF0Y2ggPSBjb21tZW50RW5kUmVnZXguc2VhcmNoU3luYyhidWZmZXIubGluZUZvclJvdyhlbmQpKVxuICAgICAgICBpZiBzdGFydE1hdGNoIGFuZCBlbmRNYXRjaFxuICAgICAgICAgIGJ1ZmZlci50cmFuc2FjdCAtPlxuICAgICAgICAgICAgY29sdW1uU3RhcnQgPSBzdGFydE1hdGNoWzFdLmxlbmd0aFxuICAgICAgICAgICAgY29sdW1uRW5kID0gY29sdW1uU3RhcnQgKyBzdGFydE1hdGNoWzJdLmxlbmd0aFxuICAgICAgICAgICAgYnVmZmVyLnNldFRleHRJblJhbmdlKFtbc3RhcnQsIGNvbHVtblN0YXJ0XSwgW3N0YXJ0LCBjb2x1bW5FbmRdXSwgXCJcIilcblxuICAgICAgICAgICAgZW5kTGVuZ3RoID0gYnVmZmVyLmxpbmVMZW5ndGhGb3JSb3coZW5kKSAtIGVuZE1hdGNoWzJdLmxlbmd0aFxuICAgICAgICAgICAgZW5kQ29sdW1uID0gZW5kTGVuZ3RoIC0gZW5kTWF0Y2hbMV0ubGVuZ3RoXG4gICAgICAgICAgICBidWZmZXIuc2V0VGV4dEluUmFuZ2UoW1tlbmQsIGVuZENvbHVtbl0sIFtlbmQsIGVuZExlbmd0aF1dLCBcIlwiKVxuICAgICAgZWxzZVxuICAgICAgICBidWZmZXIudHJhbnNhY3QgLT5cbiAgICAgICAgICBpbmRlbnRMZW5ndGggPSBidWZmZXIubGluZUZvclJvdyhzdGFydCkubWF0Y2goL15cXHMqLyk/WzBdLmxlbmd0aCA/IDBcbiAgICAgICAgICBidWZmZXIuaW5zZXJ0KFtzdGFydCwgaW5kZW50TGVuZ3RoXSwgY29tbWVudFN0YXJ0U3RyaW5nKVxuICAgICAgICAgIGJ1ZmZlci5pbnNlcnQoW2VuZCwgYnVmZmVyLmxpbmVMZW5ndGhGb3JSb3coZW5kKV0sIGNvbW1lbnRFbmRTdHJpbmcpXG4gICAgZWxzZVxuICAgICAgYWxsQmxhbmsgPSB0cnVlXG4gICAgICBhbGxCbGFua09yQ29tbWVudGVkID0gdHJ1ZVxuXG4gICAgICBmb3Igcm93IGluIFtzdGFydC4uZW5kXSBieSAxXG4gICAgICAgIGxpbmUgPSBidWZmZXIubGluZUZvclJvdyhyb3cpXG4gICAgICAgIGJsYW5rID0gbGluZT8ubWF0Y2goL15cXHMqJC8pXG5cbiAgICAgICAgYWxsQmxhbmsgPSBmYWxzZSB1bmxlc3MgYmxhbmtcbiAgICAgICAgYWxsQmxhbmtPckNvbW1lbnRlZCA9IGZhbHNlIHVubGVzcyBibGFuayBvciBjb21tZW50U3RhcnRSZWdleC50ZXN0U3luYyhsaW5lKVxuXG4gICAgICBzaG91bGRVbmNvbW1lbnQgPSBhbGxCbGFua09yQ29tbWVudGVkIGFuZCBub3QgYWxsQmxhbmtcblxuICAgICAgaWYgc2hvdWxkVW5jb21tZW50XG4gICAgICAgIGZvciByb3cgaW4gW3N0YXJ0Li5lbmRdIGJ5IDFcbiAgICAgICAgICBpZiBtYXRjaCA9IGNvbW1lbnRTdGFydFJlZ2V4LnNlYXJjaFN5bmMoYnVmZmVyLmxpbmVGb3JSb3cocm93KSlcbiAgICAgICAgICAgIGNvbHVtblN0YXJ0ID0gbWF0Y2hbMV0ubGVuZ3RoXG4gICAgICAgICAgICBjb2x1bW5FbmQgPSBjb2x1bW5TdGFydCArIG1hdGNoWzJdLmxlbmd0aFxuICAgICAgICAgICAgYnVmZmVyLnNldFRleHRJblJhbmdlKFtbcm93LCBjb2x1bW5TdGFydF0sIFtyb3csIGNvbHVtbkVuZF1dLCBcIlwiKVxuICAgICAgZWxzZVxuICAgICAgICBpZiBzdGFydCBpcyBlbmRcbiAgICAgICAgICBpbmRlbnQgPSBAZWRpdG9yLmluZGVudGF0aW9uRm9yQnVmZmVyUm93KHN0YXJ0KVxuICAgICAgICBlbHNlXG4gICAgICAgICAgaW5kZW50ID0gQG1pbkluZGVudExldmVsRm9yUm93UmFuZ2Uoc3RhcnQsIGVuZClcbiAgICAgICAgaW5kZW50U3RyaW5nID0gQGVkaXRvci5idWlsZEluZGVudFN0cmluZyhpbmRlbnQpXG4gICAgICAgIHRhYkxlbmd0aCA9IEBlZGl0b3IuZ2V0VGFiTGVuZ3RoKClcbiAgICAgICAgaW5kZW50UmVnZXggPSBuZXcgUmVnRXhwKFwiKFxcdHxbIF17I3t0YWJMZW5ndGh9fSl7I3tNYXRoLmZsb29yKGluZGVudCl9fVwiKVxuICAgICAgICBmb3Igcm93IGluIFtzdGFydC4uZW5kXSBieSAxXG4gICAgICAgICAgbGluZSA9IGJ1ZmZlci5saW5lRm9yUm93KHJvdylcbiAgICAgICAgICBpZiBpbmRlbnRMZW5ndGggPSBsaW5lLm1hdGNoKGluZGVudFJlZ2V4KT9bMF0ubGVuZ3RoXG4gICAgICAgICAgICBidWZmZXIuaW5zZXJ0KFtyb3csIGluZGVudExlbmd0aF0sIGNvbW1lbnRTdGFydFN0cmluZylcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBidWZmZXIuc2V0VGV4dEluUmFuZ2UoW1tyb3csIDBdLCBbcm93LCBpbmRlbnRTdHJpbmcubGVuZ3RoXV0sIGluZGVudFN0cmluZyArIGNvbW1lbnRTdGFydFN0cmluZylcbiAgICByZXR1cm5cblxuICAjIEZvbGRzIGFsbCB0aGUgZm9sZGFibGUgbGluZXMgaW4gdGhlIGJ1ZmZlci5cbiAgZm9sZEFsbDogLT5cbiAgICBAdW5mb2xkQWxsKClcbiAgICBmb2xkZWRSb3dSYW5nZXMgPSB7fVxuICAgIGZvciBjdXJyZW50Um93IGluIFswLi5AYnVmZmVyLmdldExhc3RSb3coKV0gYnkgMVxuICAgICAgcm93UmFuZ2UgPSBbc3RhcnRSb3csIGVuZFJvd10gPSBAcm93UmFuZ2VGb3JGb2xkQXRCdWZmZXJSb3coY3VycmVudFJvdykgPyBbXVxuICAgICAgY29udGludWUgdW5sZXNzIHN0YXJ0Um93P1xuICAgICAgY29udGludWUgaWYgZm9sZGVkUm93UmFuZ2VzW3Jvd1JhbmdlXVxuXG4gICAgICBAZWRpdG9yLmZvbGRCdWZmZXJSb3dSYW5nZShzdGFydFJvdywgZW5kUm93KVxuICAgICAgZm9sZGVkUm93UmFuZ2VzW3Jvd1JhbmdlXSA9IHRydWVcbiAgICByZXR1cm5cblxuICAjIFVuZm9sZHMgYWxsIHRoZSBmb2xkYWJsZSBsaW5lcyBpbiB0aGUgYnVmZmVyLlxuICB1bmZvbGRBbGw6IC0+XG4gICAgQGVkaXRvci5kaXNwbGF5TGF5ZXIuZGVzdHJveUFsbEZvbGRzKClcblxuICAjIEZvbGQgYWxsIGNvbW1lbnQgYW5kIGNvZGUgYmxvY2tzIGF0IGEgZ2l2ZW4gaW5kZW50TGV2ZWxcbiAgI1xuICAjIGluZGVudExldmVsIC0gQSB7TnVtYmVyfSBpbmRpY2F0aW5nIGluZGVudExldmVsOyAwIGJhc2VkLlxuICBmb2xkQWxsQXRJbmRlbnRMZXZlbDogKGluZGVudExldmVsKSAtPlxuICAgIEB1bmZvbGRBbGwoKVxuICAgIGZvbGRlZFJvd1JhbmdlcyA9IHt9XG4gICAgZm9yIGN1cnJlbnRSb3cgaW4gWzAuLkBidWZmZXIuZ2V0TGFzdFJvdygpXSBieSAxXG4gICAgICByb3dSYW5nZSA9IFtzdGFydFJvdywgZW5kUm93XSA9IEByb3dSYW5nZUZvckZvbGRBdEJ1ZmZlclJvdyhjdXJyZW50Um93KSA/IFtdXG4gICAgICBjb250aW51ZSB1bmxlc3Mgc3RhcnRSb3c/XG4gICAgICBjb250aW51ZSBpZiBmb2xkZWRSb3dSYW5nZXNbcm93UmFuZ2VdXG5cbiAgICAgICMgYXNzdW1wdGlvbjogc3RhcnRSb3cgd2lsbCBhbHdheXMgYmUgdGhlIG1pbiBpbmRlbnQgbGV2ZWwgZm9yIHRoZSBlbnRpcmUgcmFuZ2VcbiAgICAgIGlmIEBlZGl0b3IuaW5kZW50YXRpb25Gb3JCdWZmZXJSb3coc3RhcnRSb3cpIGlzIGluZGVudExldmVsXG4gICAgICAgIEBlZGl0b3IuZm9sZEJ1ZmZlclJvd1JhbmdlKHN0YXJ0Um93LCBlbmRSb3cpXG4gICAgICAgIGZvbGRlZFJvd1Jhbmdlc1tyb3dSYW5nZV0gPSB0cnVlXG4gICAgcmV0dXJuXG5cbiAgIyBHaXZlbiBhIGJ1ZmZlciByb3csIGNyZWF0ZXMgYSBmb2xkIGF0IGl0LlxuICAjXG4gICMgYnVmZmVyUm93IC0gQSB7TnVtYmVyfSBpbmRpY2F0aW5nIHRoZSBidWZmZXIgcm93XG4gICNcbiAgIyBSZXR1cm5zIHRoZSBuZXcge0ZvbGR9LlxuICBmb2xkQnVmZmVyUm93OiAoYnVmZmVyUm93KSAtPlxuICAgIGZvciBjdXJyZW50Um93IGluIFtidWZmZXJSb3cuLjBdIGJ5IC0xXG4gICAgICBbc3RhcnRSb3csIGVuZFJvd10gPSBAcm93UmFuZ2VGb3JGb2xkQXRCdWZmZXJSb3coY3VycmVudFJvdykgPyBbXVxuICAgICAgY29udGludWUgdW5sZXNzIHN0YXJ0Um93PyBhbmQgc3RhcnRSb3cgPD0gYnVmZmVyUm93IDw9IGVuZFJvd1xuICAgICAgdW5sZXNzIEBlZGl0b3IuaXNGb2xkZWRBdEJ1ZmZlclJvdyhzdGFydFJvdylcbiAgICAgICAgcmV0dXJuIEBlZGl0b3IuZm9sZEJ1ZmZlclJvd1JhbmdlKHN0YXJ0Um93LCBlbmRSb3cpXG5cbiAgIyBGaW5kIHRoZSByb3cgcmFuZ2UgZm9yIGEgZm9sZCBhdCBhIGdpdmVuIGJ1ZmZlclJvdy4gV2lsbCBoYW5kbGUgY29tbWVudHNcbiAgIyBhbmQgY29kZS5cbiAgI1xuICAjIGJ1ZmZlclJvdyAtIEEge051bWJlcn0gaW5kaWNhdGluZyB0aGUgYnVmZmVyIHJvd1xuICAjXG4gICMgUmV0dXJucyBhbiB7QXJyYXl9IG9mIHRoZSBbc3RhcnRSb3csIGVuZFJvd10uIFJldHVybnMgbnVsbCBpZiBubyByYW5nZS5cbiAgcm93UmFuZ2VGb3JGb2xkQXRCdWZmZXJSb3c6IChidWZmZXJSb3cpIC0+XG4gICAgcm93UmFuZ2UgPSBAcm93UmFuZ2VGb3JDb21tZW50QXRCdWZmZXJSb3coYnVmZmVyUm93KVxuICAgIHJvd1JhbmdlID89IEByb3dSYW5nZUZvckNvZGVGb2xkQXRCdWZmZXJSb3coYnVmZmVyUm93KVxuICAgIHJvd1JhbmdlXG5cbiAgcm93UmFuZ2VGb3JDb21tZW50QXRCdWZmZXJSb3c6IChidWZmZXJSb3cpIC0+XG4gICAgcmV0dXJuIHVubGVzcyBAZWRpdG9yLnRva2VuaXplZEJ1ZmZlci50b2tlbml6ZWRMaW5lc1tidWZmZXJSb3ddPy5pc0NvbW1lbnQoKVxuXG4gICAgc3RhcnRSb3cgPSBidWZmZXJSb3dcbiAgICBlbmRSb3cgPSBidWZmZXJSb3dcblxuICAgIGlmIGJ1ZmZlclJvdyA+IDBcbiAgICAgIGZvciBjdXJyZW50Um93IGluIFtidWZmZXJSb3ctMS4uMF0gYnkgLTFcbiAgICAgICAgYnJlYWsgdW5sZXNzIEBlZGl0b3IudG9rZW5pemVkQnVmZmVyLnRva2VuaXplZExpbmVzW2N1cnJlbnRSb3ddPy5pc0NvbW1lbnQoKVxuICAgICAgICBzdGFydFJvdyA9IGN1cnJlbnRSb3dcblxuICAgIGlmIGJ1ZmZlclJvdyA8IEBidWZmZXIuZ2V0TGFzdFJvdygpXG4gICAgICBmb3IgY3VycmVudFJvdyBpbiBbYnVmZmVyUm93KzEuLkBidWZmZXIuZ2V0TGFzdFJvdygpXSBieSAxXG4gICAgICAgIGJyZWFrIHVubGVzcyBAZWRpdG9yLnRva2VuaXplZEJ1ZmZlci50b2tlbml6ZWRMaW5lc1tjdXJyZW50Um93XT8uaXNDb21tZW50KClcbiAgICAgICAgZW5kUm93ID0gY3VycmVudFJvd1xuXG4gICAgcmV0dXJuIFtzdGFydFJvdywgZW5kUm93XSBpZiBzdGFydFJvdyBpc250IGVuZFJvd1xuXG4gIHJvd1JhbmdlRm9yQ29kZUZvbGRBdEJ1ZmZlclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICByZXR1cm4gbnVsbCB1bmxlc3MgQGlzRm9sZGFibGVBdEJ1ZmZlclJvdyhidWZmZXJSb3cpXG5cbiAgICBzdGFydEluZGVudExldmVsID0gQGVkaXRvci5pbmRlbnRhdGlvbkZvckJ1ZmZlclJvdyhidWZmZXJSb3cpXG4gICAgc2NvcGVEZXNjcmlwdG9yID0gQGVkaXRvci5zY29wZURlc2NyaXB0b3JGb3JCdWZmZXJQb3NpdGlvbihbYnVmZmVyUm93LCAwXSlcbiAgICBmb3Igcm93IGluIFsoYnVmZmVyUm93ICsgMSkuLkBlZGl0b3IuZ2V0TGFzdEJ1ZmZlclJvdygpXSBieSAxXG4gICAgICBjb250aW51ZSBpZiBAZWRpdG9yLmlzQnVmZmVyUm93Qmxhbmsocm93KVxuICAgICAgaW5kZW50YXRpb24gPSBAZWRpdG9yLmluZGVudGF0aW9uRm9yQnVmZmVyUm93KHJvdylcbiAgICAgIGlmIGluZGVudGF0aW9uIDw9IHN0YXJ0SW5kZW50TGV2ZWxcbiAgICAgICAgaW5jbHVkZVJvd0luRm9sZCA9IGluZGVudGF0aW9uIGlzIHN0YXJ0SW5kZW50TGV2ZWwgYW5kIEBmb2xkRW5kUmVnZXhGb3JTY29wZURlc2NyaXB0b3Ioc2NvcGVEZXNjcmlwdG9yKT8uc2VhcmNoU3luYyhAZWRpdG9yLmxpbmVUZXh0Rm9yQnVmZmVyUm93KHJvdykpXG4gICAgICAgIGZvbGRFbmRSb3cgPSByb3cgaWYgaW5jbHVkZVJvd0luRm9sZFxuICAgICAgICBicmVha1xuXG4gICAgICBmb2xkRW5kUm93ID0gcm93XG5cbiAgICBbYnVmZmVyUm93LCBmb2xkRW5kUm93XVxuXG4gIGlzRm9sZGFibGVBdEJ1ZmZlclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICBAZWRpdG9yLnRva2VuaXplZEJ1ZmZlci5pc0ZvbGRhYmxlQXRSb3coYnVmZmVyUm93KVxuXG4gICMgUmV0dXJucyBhIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIGxpbmUgYXQgdGhlIGdpdmVuIGJ1ZmZlclxuICAjIHJvdyBpcyBhIGNvbW1lbnQuXG4gIGlzTGluZUNvbW1lbnRlZEF0QnVmZmVyUm93OiAoYnVmZmVyUm93KSAtPlxuICAgIHJldHVybiBmYWxzZSB1bmxlc3MgMCA8PSBidWZmZXJSb3cgPD0gQGVkaXRvci5nZXRMYXN0QnVmZmVyUm93KClcbiAgICBAZWRpdG9yLnRva2VuaXplZEJ1ZmZlci50b2tlbml6ZWRMaW5lc1tidWZmZXJSb3ddPy5pc0NvbW1lbnQoKVxuXG4gICMgRmluZCBhIHJvdyByYW5nZSBmb3IgYSAncGFyYWdyYXBoJyBhcm91bmQgc3BlY2lmaWVkIGJ1ZmZlclJvdy4gQSBwYXJhZ3JhcGhcbiAgIyBpcyBhIGJsb2NrIG9mIHRleHQgYm91bmRlZCBieSBhbmQgZW1wdHkgbGluZSBvciBhIGJsb2NrIG9mIHRleHQgdGhhdCBpcyBub3RcbiAgIyB0aGUgc2FtZSB0eXBlIChjb21tZW50cyBuZXh0IHRvIHNvdXJjZSBjb2RlKS5cbiAgcm93UmFuZ2VGb3JQYXJhZ3JhcGhBdEJ1ZmZlclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICBzY29wZSA9IEBlZGl0b3Iuc2NvcGVEZXNjcmlwdG9yRm9yQnVmZmVyUG9zaXRpb24oW2J1ZmZlclJvdywgMF0pXG4gICAgY29tbWVudFN0cmluZ3MgPSBAZWRpdG9yLmdldENvbW1lbnRTdHJpbmdzKHNjb3BlKVxuICAgIGNvbW1lbnRTdGFydFJlZ2V4ID0gbnVsbFxuICAgIGlmIGNvbW1lbnRTdHJpbmdzPy5jb21tZW50U3RhcnRTdHJpbmc/IGFuZCBub3QgY29tbWVudFN0cmluZ3MuY29tbWVudEVuZFN0cmluZz9cbiAgICAgIGNvbW1lbnRTdGFydFJlZ2V4U3RyaW5nID0gXy5lc2NhcGVSZWdFeHAoY29tbWVudFN0cmluZ3MuY29tbWVudFN0YXJ0U3RyaW5nKS5yZXBsYWNlKC8oXFxzKykkLywgJyg/OiQxKT8nKVxuICAgICAgY29tbWVudFN0YXJ0UmVnZXggPSBuZXcgT25pZ1JlZ0V4cChcIl4oXFxcXHMqKSgje2NvbW1lbnRTdGFydFJlZ2V4U3RyaW5nfSlcIilcblxuICAgIGZpbHRlckNvbW1lbnRTdGFydCA9IChsaW5lKSAtPlxuICAgICAgaWYgY29tbWVudFN0YXJ0UmVnZXg/XG4gICAgICAgIG1hdGNoZXMgPSBjb21tZW50U3RhcnRSZWdleC5zZWFyY2hTeW5jKGxpbmUpXG4gICAgICAgIGxpbmUgPSBsaW5lLnN1YnN0cmluZyhtYXRjaGVzWzBdLmVuZCkgaWYgbWF0Y2hlcz8ubGVuZ3RoXG4gICAgICBsaW5lXG5cbiAgICByZXR1cm4gdW5sZXNzIC9cXFMvLnRlc3QoZmlsdGVyQ29tbWVudFN0YXJ0KEBlZGl0b3IubGluZVRleHRGb3JCdWZmZXJSb3coYnVmZmVyUm93KSkpXG5cbiAgICBpZiBAaXNMaW5lQ29tbWVudGVkQXRCdWZmZXJSb3coYnVmZmVyUm93KVxuICAgICAgaXNPcmlnaW5hbFJvd0NvbW1lbnQgPSB0cnVlXG4gICAgICByYW5nZSA9IEByb3dSYW5nZUZvckNvbW1lbnRBdEJ1ZmZlclJvdyhidWZmZXJSb3cpXG4gICAgICBbZmlyc3RSb3csIGxhc3RSb3ddID0gcmFuZ2Ugb3IgW2J1ZmZlclJvdywgYnVmZmVyUm93XVxuICAgIGVsc2VcbiAgICAgIGlzT3JpZ2luYWxSb3dDb21tZW50ID0gZmFsc2VcbiAgICAgIFtmaXJzdFJvdywgbGFzdFJvd10gPSBbMCwgQGVkaXRvci5nZXRMYXN0QnVmZmVyUm93KCktMV1cblxuICAgIHN0YXJ0Um93ID0gYnVmZmVyUm93XG4gICAgd2hpbGUgc3RhcnRSb3cgPiBmaXJzdFJvd1xuICAgICAgYnJlYWsgaWYgQGlzTGluZUNvbW1lbnRlZEF0QnVmZmVyUm93KHN0YXJ0Um93IC0gMSkgaXNudCBpc09yaWdpbmFsUm93Q29tbWVudFxuICAgICAgYnJlYWsgdW5sZXNzIC9cXFMvLnRlc3QoZmlsdGVyQ29tbWVudFN0YXJ0KEBlZGl0b3IubGluZVRleHRGb3JCdWZmZXJSb3coc3RhcnRSb3cgLSAxKSkpXG4gICAgICBzdGFydFJvdy0tXG5cbiAgICBlbmRSb3cgPSBidWZmZXJSb3dcbiAgICBsYXN0Um93ID0gQGVkaXRvci5nZXRMYXN0QnVmZmVyUm93KClcbiAgICB3aGlsZSBlbmRSb3cgPCBsYXN0Um93XG4gICAgICBicmVhayBpZiBAaXNMaW5lQ29tbWVudGVkQXRCdWZmZXJSb3coZW5kUm93ICsgMSkgaXNudCBpc09yaWdpbmFsUm93Q29tbWVudFxuICAgICAgYnJlYWsgdW5sZXNzIC9cXFMvLnRlc3QoZmlsdGVyQ29tbWVudFN0YXJ0KEBlZGl0b3IubGluZVRleHRGb3JCdWZmZXJSb3coZW5kUm93ICsgMSkpKVxuICAgICAgZW5kUm93KytcblxuICAgIG5ldyBSYW5nZShbc3RhcnRSb3csIDBdLCBbZW5kUm93LCBAZWRpdG9yLmxpbmVUZXh0Rm9yQnVmZmVyUm93KGVuZFJvdykubGVuZ3RoXSlcblxuICAjIEdpdmVuIGEgYnVmZmVyIHJvdywgdGhpcyByZXR1cm5zIGEgc3VnZ2VzdGVkIGluZGVudGF0aW9uIGxldmVsLlxuICAjXG4gICMgVGhlIGluZGVudGF0aW9uIGxldmVsIHByb3ZpZGVkIGlzIGJhc2VkIG9uIHRoZSBjdXJyZW50IHtMYW5ndWFnZU1vZGV9LlxuICAjXG4gICMgYnVmZmVyUm93IC0gQSB7TnVtYmVyfSBpbmRpY2F0aW5nIHRoZSBidWZmZXIgcm93XG4gICNcbiAgIyBSZXR1cm5zIGEge051bWJlcn0uXG4gIHN1Z2dlc3RlZEluZGVudEZvckJ1ZmZlclJvdzogKGJ1ZmZlclJvdywgb3B0aW9ucykgLT5cbiAgICBsaW5lID0gQGJ1ZmZlci5saW5lRm9yUm93KGJ1ZmZlclJvdylcbiAgICB0b2tlbml6ZWRMaW5lID0gQGVkaXRvci50b2tlbml6ZWRCdWZmZXIudG9rZW5pemVkTGluZUZvclJvdyhidWZmZXJSb3cpXG4gICAgQHN1Z2dlc3RlZEluZGVudEZvclRva2VuaXplZExpbmVBdEJ1ZmZlclJvdyhidWZmZXJSb3csIGxpbmUsIHRva2VuaXplZExpbmUsIG9wdGlvbnMpXG5cbiAgc3VnZ2VzdGVkSW5kZW50Rm9yTGluZUF0QnVmZmVyUm93OiAoYnVmZmVyUm93LCBsaW5lLCBvcHRpb25zKSAtPlxuICAgIHRva2VuaXplZExpbmUgPSBAZWRpdG9yLnRva2VuaXplZEJ1ZmZlci5idWlsZFRva2VuaXplZExpbmVGb3JSb3dXaXRoVGV4dChidWZmZXJSb3csIGxpbmUpXG4gICAgQHN1Z2dlc3RlZEluZGVudEZvclRva2VuaXplZExpbmVBdEJ1ZmZlclJvdyhidWZmZXJSb3csIGxpbmUsIHRva2VuaXplZExpbmUsIG9wdGlvbnMpXG5cbiAgc3VnZ2VzdGVkSW5kZW50Rm9yVG9rZW5pemVkTGluZUF0QnVmZmVyUm93OiAoYnVmZmVyUm93LCBsaW5lLCB0b2tlbml6ZWRMaW5lLCBvcHRpb25zKSAtPlxuICAgIGl0ZXJhdG9yID0gdG9rZW5pemVkTGluZS5nZXRUb2tlbkl0ZXJhdG9yKClcbiAgICBpdGVyYXRvci5uZXh0KClcbiAgICBzY29wZURlc2NyaXB0b3IgPSBuZXcgU2NvcGVEZXNjcmlwdG9yKHNjb3BlczogaXRlcmF0b3IuZ2V0U2NvcGVzKCkpXG5cbiAgICBpbmNyZWFzZUluZGVudFJlZ2V4ID0gQGluY3JlYXNlSW5kZW50UmVnZXhGb3JTY29wZURlc2NyaXB0b3Ioc2NvcGVEZXNjcmlwdG9yKVxuICAgIGRlY3JlYXNlSW5kZW50UmVnZXggPSBAZGVjcmVhc2VJbmRlbnRSZWdleEZvclNjb3BlRGVzY3JpcHRvcihzY29wZURlc2NyaXB0b3IpXG4gICAgZGVjcmVhc2VOZXh0SW5kZW50UmVnZXggPSBAZGVjcmVhc2VOZXh0SW5kZW50UmVnZXhGb3JTY29wZURlc2NyaXB0b3Ioc2NvcGVEZXNjcmlwdG9yKVxuXG4gICAgaWYgb3B0aW9ucz8uc2tpcEJsYW5rTGluZXMgPyB0cnVlXG4gICAgICBwcmVjZWRpbmdSb3cgPSBAYnVmZmVyLnByZXZpb3VzTm9uQmxhbmtSb3coYnVmZmVyUm93KVxuICAgICAgcmV0dXJuIDAgdW5sZXNzIHByZWNlZGluZ1Jvdz9cbiAgICBlbHNlXG4gICAgICBwcmVjZWRpbmdSb3cgPSBidWZmZXJSb3cgLSAxXG4gICAgICByZXR1cm4gMCBpZiBwcmVjZWRpbmdSb3cgPCAwXG5cbiAgICBkZXNpcmVkSW5kZW50TGV2ZWwgPSBAZWRpdG9yLmluZGVudGF0aW9uRm9yQnVmZmVyUm93KHByZWNlZGluZ1JvdylcbiAgICByZXR1cm4gZGVzaXJlZEluZGVudExldmVsIHVubGVzcyBpbmNyZWFzZUluZGVudFJlZ2V4XG5cbiAgICB1bmxlc3MgQGVkaXRvci5pc0J1ZmZlclJvd0NvbW1lbnRlZChwcmVjZWRpbmdSb3cpXG4gICAgICBwcmVjZWRpbmdMaW5lID0gQGJ1ZmZlci5saW5lRm9yUm93KHByZWNlZGluZ1JvdylcbiAgICAgIGRlc2lyZWRJbmRlbnRMZXZlbCArPSAxIGlmIGluY3JlYXNlSW5kZW50UmVnZXg/LnRlc3RTeW5jKHByZWNlZGluZ0xpbmUpXG4gICAgICBkZXNpcmVkSW5kZW50TGV2ZWwgLT0gMSBpZiBkZWNyZWFzZU5leHRJbmRlbnRSZWdleD8udGVzdFN5bmMocHJlY2VkaW5nTGluZSlcblxuICAgIHVubGVzcyBAYnVmZmVyLmlzUm93QmxhbmsocHJlY2VkaW5nUm93KVxuICAgICAgZGVzaXJlZEluZGVudExldmVsIC09IDEgaWYgZGVjcmVhc2VJbmRlbnRSZWdleD8udGVzdFN5bmMobGluZSlcblxuICAgIE1hdGgubWF4KGRlc2lyZWRJbmRlbnRMZXZlbCwgMClcblxuICAjIENhbGN1bGF0ZSBhIG1pbmltdW0gaW5kZW50IGxldmVsIGZvciBhIHJhbmdlIG9mIGxpbmVzIGV4Y2x1ZGluZyBlbXB0eSBsaW5lcy5cbiAgI1xuICAjIHN0YXJ0Um93IC0gVGhlIHJvdyB7TnVtYmVyfSB0byBzdGFydCBhdFxuICAjIGVuZFJvdyAtIFRoZSByb3cge051bWJlcn0gdG8gZW5kIGF0XG4gICNcbiAgIyBSZXR1cm5zIGEge051bWJlcn0gb2YgdGhlIGluZGVudCBsZXZlbCBvZiB0aGUgYmxvY2sgb2YgbGluZXMuXG4gIG1pbkluZGVudExldmVsRm9yUm93UmFuZ2U6IChzdGFydFJvdywgZW5kUm93KSAtPlxuICAgIGluZGVudHMgPSAoQGVkaXRvci5pbmRlbnRhdGlvbkZvckJ1ZmZlclJvdyhyb3cpIGZvciByb3cgaW4gW3N0YXJ0Um93Li5lbmRSb3ddIGJ5IDEgd2hlbiBub3QgQGVkaXRvci5pc0J1ZmZlclJvd0JsYW5rKHJvdykpXG4gICAgaW5kZW50cyA9IFswXSB1bmxlc3MgaW5kZW50cy5sZW5ndGhcbiAgICBNYXRoLm1pbihpbmRlbnRzLi4uKVxuXG4gICMgSW5kZW50cyBhbGwgdGhlIHJvd3MgYmV0d2VlbiB0d28gYnVmZmVyIHJvdyBudW1iZXJzLlxuICAjXG4gICMgc3RhcnRSb3cgLSBUaGUgcm93IHtOdW1iZXJ9IHRvIHN0YXJ0IGF0XG4gICMgZW5kUm93IC0gVGhlIHJvdyB7TnVtYmVyfSB0byBlbmQgYXRcbiAgYXV0b0luZGVudEJ1ZmZlclJvd3M6IChzdGFydFJvdywgZW5kUm93KSAtPlxuICAgIEBhdXRvSW5kZW50QnVmZmVyUm93KHJvdykgZm9yIHJvdyBpbiBbc3RhcnRSb3cuLmVuZFJvd10gYnkgMVxuICAgIHJldHVyblxuXG4gICMgR2l2ZW4gYSBidWZmZXIgcm93LCB0aGlzIGluZGVudHMgaXQuXG4gICNcbiAgIyBidWZmZXJSb3cgLSBUaGUgcm93IHtOdW1iZXJ9LlxuICAjIG9wdGlvbnMgLSBBbiBvcHRpb25zIHtPYmplY3R9IHRvIHBhc3MgdGhyb3VnaCB0byB7VGV4dEVkaXRvcjo6c2V0SW5kZW50YXRpb25Gb3JCdWZmZXJSb3d9LlxuICBhdXRvSW5kZW50QnVmZmVyUm93OiAoYnVmZmVyUm93LCBvcHRpb25zKSAtPlxuICAgIGluZGVudExldmVsID0gQHN1Z2dlc3RlZEluZGVudEZvckJ1ZmZlclJvdyhidWZmZXJSb3csIG9wdGlvbnMpXG4gICAgQGVkaXRvci5zZXRJbmRlbnRhdGlvbkZvckJ1ZmZlclJvdyhidWZmZXJSb3csIGluZGVudExldmVsLCBvcHRpb25zKVxuXG4gICMgR2l2ZW4gYSBidWZmZXIgcm93LCB0aGlzIGRlY3JlYXNlcyB0aGUgaW5kZW50YXRpb24uXG4gICNcbiAgIyBidWZmZXJSb3cgLSBUaGUgcm93IHtOdW1iZXJ9XG4gIGF1dG9EZWNyZWFzZUluZGVudEZvckJ1ZmZlclJvdzogKGJ1ZmZlclJvdykgLT5cbiAgICBzY29wZURlc2NyaXB0b3IgPSBAZWRpdG9yLnNjb3BlRGVzY3JpcHRvckZvckJ1ZmZlclBvc2l0aW9uKFtidWZmZXJSb3csIDBdKVxuICAgIHJldHVybiB1bmxlc3MgZGVjcmVhc2VJbmRlbnRSZWdleCA9IEBkZWNyZWFzZUluZGVudFJlZ2V4Rm9yU2NvcGVEZXNjcmlwdG9yKHNjb3BlRGVzY3JpcHRvcilcblxuICAgIGxpbmUgPSBAYnVmZmVyLmxpbmVGb3JSb3coYnVmZmVyUm93KVxuICAgIHJldHVybiB1bmxlc3MgZGVjcmVhc2VJbmRlbnRSZWdleC50ZXN0U3luYyhsaW5lKVxuXG4gICAgY3VycmVudEluZGVudExldmVsID0gQGVkaXRvci5pbmRlbnRhdGlvbkZvckJ1ZmZlclJvdyhidWZmZXJSb3cpXG4gICAgcmV0dXJuIGlmIGN1cnJlbnRJbmRlbnRMZXZlbCBpcyAwXG5cbiAgICBwcmVjZWRpbmdSb3cgPSBAYnVmZmVyLnByZXZpb3VzTm9uQmxhbmtSb3coYnVmZmVyUm93KVxuICAgIHJldHVybiB1bmxlc3MgcHJlY2VkaW5nUm93P1xuXG4gICAgcHJlY2VkaW5nTGluZSA9IEBidWZmZXIubGluZUZvclJvdyhwcmVjZWRpbmdSb3cpXG4gICAgZGVzaXJlZEluZGVudExldmVsID0gQGVkaXRvci5pbmRlbnRhdGlvbkZvckJ1ZmZlclJvdyhwcmVjZWRpbmdSb3cpXG5cbiAgICBpZiBpbmNyZWFzZUluZGVudFJlZ2V4ID0gQGluY3JlYXNlSW5kZW50UmVnZXhGb3JTY29wZURlc2NyaXB0b3Ioc2NvcGVEZXNjcmlwdG9yKVxuICAgICAgZGVzaXJlZEluZGVudExldmVsIC09IDEgdW5sZXNzIGluY3JlYXNlSW5kZW50UmVnZXgudGVzdFN5bmMocHJlY2VkaW5nTGluZSlcblxuICAgIGlmIGRlY3JlYXNlTmV4dEluZGVudFJlZ2V4ID0gQGRlY3JlYXNlTmV4dEluZGVudFJlZ2V4Rm9yU2NvcGVEZXNjcmlwdG9yKHNjb3BlRGVzY3JpcHRvcilcbiAgICAgIGRlc2lyZWRJbmRlbnRMZXZlbCAtPSAxIGlmIGRlY3JlYXNlTmV4dEluZGVudFJlZ2V4LnRlc3RTeW5jKHByZWNlZGluZ0xpbmUpXG5cbiAgICBpZiBkZXNpcmVkSW5kZW50TGV2ZWwgPj0gMCBhbmQgZGVzaXJlZEluZGVudExldmVsIDwgY3VycmVudEluZGVudExldmVsXG4gICAgICBAZWRpdG9yLnNldEluZGVudGF0aW9uRm9yQnVmZmVyUm93KGJ1ZmZlclJvdywgZGVzaXJlZEluZGVudExldmVsKVxuXG4gIGNhY2hlUmVnZXg6IChwYXR0ZXJuKSAtPlxuICAgIGlmIHBhdHRlcm5cbiAgICAgIEByZWdleGVzQnlQYXR0ZXJuW3BhdHRlcm5dID89IG5ldyBPbmlnUmVnRXhwKHBhdHRlcm4pXG5cbiAgaW5jcmVhc2VJbmRlbnRSZWdleEZvclNjb3BlRGVzY3JpcHRvcjogKHNjb3BlRGVzY3JpcHRvcikgLT5cbiAgICBAY2FjaGVSZWdleChAZWRpdG9yLmdldEluY3JlYXNlSW5kZW50UGF0dGVybihzY29wZURlc2NyaXB0b3IpKVxuXG4gIGRlY3JlYXNlSW5kZW50UmVnZXhGb3JTY29wZURlc2NyaXB0b3I6IChzY29wZURlc2NyaXB0b3IpIC0+XG4gICAgQGNhY2hlUmVnZXgoQGVkaXRvci5nZXREZWNyZWFzZUluZGVudFBhdHRlcm4oc2NvcGVEZXNjcmlwdG9yKSlcblxuICBkZWNyZWFzZU5leHRJbmRlbnRSZWdleEZvclNjb3BlRGVzY3JpcHRvcjogKHNjb3BlRGVzY3JpcHRvcikgLT5cbiAgICBAY2FjaGVSZWdleChAZWRpdG9yLmdldERlY3JlYXNlTmV4dEluZGVudFBhdHRlcm4oc2NvcGVEZXNjcmlwdG9yKSlcblxuICBmb2xkRW5kUmVnZXhGb3JTY29wZURlc2NyaXB0b3I6IChzY29wZURlc2NyaXB0b3IpIC0+XG4gICAgQGNhY2hlUmVnZXgoQGVkaXRvci5nZXRGb2xkRW5kUGF0dGVybihzY29wZURlc2NyaXB0b3IpKVxuIl19
