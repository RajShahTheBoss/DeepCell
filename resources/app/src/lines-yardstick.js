(function() {
  var LinesYardstick, Point, isPairedCharacter;

  Point = require('text-buffer').Point;

  isPairedCharacter = require('./text-utils').isPairedCharacter;

  module.exports = LinesYardstick = (function() {
    function LinesYardstick(model, lineNodesProvider, lineTopIndex) {
      this.model = model;
      this.lineNodesProvider = lineNodesProvider;
      this.lineTopIndex = lineTopIndex;
      this.rangeForMeasurement = document.createRange();
      this.invalidateCache();
    }

    LinesYardstick.prototype.invalidateCache = function() {
      return this.leftPixelPositionCache = {};
    };

    LinesYardstick.prototype.measuredRowForPixelPosition = function(pixelPosition) {
      var row, targetTop;
      targetTop = pixelPosition.top;
      row = Math.floor(targetTop / this.model.getLineHeightInPixels());
      if (0 <= row) {
        return row;
      }
    };

    LinesYardstick.prototype.screenPositionForPixelPosition = function(pixelPosition) {
      var charIndex, characterIndex, high, i, j, lastScreenRow, lineNode, lineOffset, low, mid, nextCharIndex, rangeRect, ref, row, targetLeft, targetTop, textNode, textNodeIndex, textNodeStartColumn, textNodes;
      targetTop = pixelPosition.top;
      row = Math.max(0, this.lineTopIndex.rowForPixelPosition(targetTop));
      lineNode = this.lineNodesProvider.lineNodeForScreenRow(row);
      if (!lineNode) {
        lastScreenRow = this.model.getLastScreenRow();
        if (row > lastScreenRow) {
          return Point(lastScreenRow, this.model.lineLengthForScreenRow(lastScreenRow));
        } else {
          return Point(row, 0);
        }
      }
      targetLeft = pixelPosition.left;
      if (targetTop < 0 || targetLeft < 0) {
        targetLeft = 0;
      }
      textNodes = this.lineNodesProvider.textNodesForScreenRow(row);
      lineOffset = lineNode.getBoundingClientRect().left;
      targetLeft += lineOffset;
      textNodeIndex = 0;
      low = 0;
      high = textNodes.length - 1;
      while (low <= high) {
        mid = low + (high - low >> 1);
        textNode = textNodes[mid];
        rangeRect = this.clientRectForRange(textNode, 0, textNode.length);
        if (targetLeft < rangeRect.left) {
          high = mid - 1;
          textNodeIndex = Math.max(0, mid - 1);
        } else if (targetLeft > rangeRect.right) {
          low = mid + 1;
          textNodeIndex = Math.min(textNodes.length - 1, mid + 1);
        } else {
          textNodeIndex = mid;
          break;
        }
      }
      textNode = textNodes[textNodeIndex];
      characterIndex = 0;
      low = 0;
      high = textNode.textContent.length - 1;
      while (low <= high) {
        charIndex = low + (high - low >> 1);
        if (isPairedCharacter(textNode.textContent, charIndex)) {
          nextCharIndex = charIndex + 2;
        } else {
          nextCharIndex = charIndex + 1;
        }
        rangeRect = this.clientRectForRange(textNode, charIndex, nextCharIndex);
        if (targetLeft < rangeRect.left) {
          high = charIndex - 1;
          characterIndex = Math.max(0, charIndex - 1);
        } else if (targetLeft > rangeRect.right) {
          low = nextCharIndex;
          characterIndex = Math.min(textNode.textContent.length, nextCharIndex);
        } else {
          if (targetLeft <= ((rangeRect.left + rangeRect.right) / 2)) {
            characterIndex = charIndex;
          } else {
            characterIndex = nextCharIndex;
          }
          break;
        }
      }
      textNodeStartColumn = 0;
      for (i = j = 0, ref = textNodeIndex; j < ref; i = j += 1) {
        textNodeStartColumn += textNodes[i].length;
      }
      return Point(row, textNodeStartColumn + characterIndex);
    };

    LinesYardstick.prototype.pixelPositionForScreenPosition = function(screenPosition) {
      var left, targetColumn, targetRow, top;
      targetRow = screenPosition.row;
      targetColumn = screenPosition.column;
      top = this.lineTopIndex.pixelPositionAfterBlocksForRow(targetRow);
      left = this.leftPixelPositionForScreenPosition(targetRow, targetColumn);
      return {
        top: top,
        left: left
      };
    };

    LinesYardstick.prototype.leftPixelPositionForScreenPosition = function(row, column) {
      var base, indexInTextNode, j, leftPixelPosition, len, lineId, lineNode, lineOffset, ref, textNode, textNodeEndColumn, textNodeStartColumn, textNodes;
      lineNode = this.lineNodesProvider.lineNodeForScreenRow(row);
      lineId = this.lineNodesProvider.lineIdForScreenRow(row);
      if (lineNode != null) {
        if (((ref = this.leftPixelPositionCache[lineId]) != null ? ref[column] : void 0) != null) {
          return this.leftPixelPositionCache[lineId][column];
        } else {
          textNodes = this.lineNodesProvider.textNodesForScreenRow(row);
          textNodeStartColumn = 0;
          for (j = 0, len = textNodes.length; j < len; j++) {
            textNode = textNodes[j];
            textNodeEndColumn = textNodeStartColumn + textNode.textContent.length;
            if (textNodeEndColumn > column) {
              indexInTextNode = column - textNodeStartColumn;
              break;
            } else {
              textNodeStartColumn = textNodeEndColumn;
            }
          }
          if (textNode != null) {
            if (indexInTextNode == null) {
              indexInTextNode = textNode.textContent.length;
            }
            lineOffset = lineNode.getBoundingClientRect().left;
            if (indexInTextNode === 0) {
              leftPixelPosition = this.clientRectForRange(textNode, 0, 1).left;
            } else {
              leftPixelPosition = this.clientRectForRange(textNode, 0, indexInTextNode).right;
            }
            leftPixelPosition -= lineOffset;
            if ((base = this.leftPixelPositionCache)[lineId] == null) {
              base[lineId] = {};
            }
            this.leftPixelPositionCache[lineId][column] = leftPixelPosition;
            return leftPixelPosition;
          } else {
            return 0;
          }
        }
      } else {
        return 0;
      }
    };

    LinesYardstick.prototype.clientRectForRange = function(textNode, startIndex, endIndex) {
      var clientRects;
      this.rangeForMeasurement.setStart(textNode, startIndex);
      this.rangeForMeasurement.setEnd(textNode, endIndex);
      clientRects = this.rangeForMeasurement.getClientRects();
      if (clientRects.length === 1) {
        return clientRects[0];
      } else {
        return this.rangeForMeasurement.getBoundingClientRect();
      }
    };

    return LinesYardstick;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2xpbmVzLXlhcmRzdGljay5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFDLFFBQVMsT0FBQSxDQUFRLGFBQVI7O0VBQ1Qsb0JBQXFCLE9BQUEsQ0FBUSxjQUFSOztFQUV0QixNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1Msd0JBQUMsS0FBRCxFQUFTLGlCQUFULEVBQTZCLFlBQTdCO01BQUMsSUFBQyxDQUFBLFFBQUQ7TUFBUSxJQUFDLENBQUEsb0JBQUQ7TUFBb0IsSUFBQyxDQUFBLGVBQUQ7TUFDeEMsSUFBQyxDQUFBLG1CQUFELEdBQXVCLFFBQVEsQ0FBQyxXQUFULENBQUE7TUFDdkIsSUFBQyxDQUFBLGVBQUQsQ0FBQTtJQUZXOzs2QkFJYixlQUFBLEdBQWlCLFNBQUE7YUFDZixJQUFDLENBQUEsc0JBQUQsR0FBMEI7SUFEWDs7NkJBR2pCLDJCQUFBLEdBQTZCLFNBQUMsYUFBRDtBQUMzQixVQUFBO01BQUEsU0FBQSxHQUFZLGFBQWEsQ0FBQztNQUMxQixHQUFBLEdBQU0sSUFBSSxDQUFDLEtBQUwsQ0FBVyxTQUFBLEdBQVksSUFBQyxDQUFBLEtBQUssQ0FBQyxxQkFBUCxDQUFBLENBQXZCO01BQ04sSUFBTyxDQUFBLElBQUssR0FBWjtlQUFBLElBQUE7O0lBSDJCOzs2QkFLN0IsOEJBQUEsR0FBZ0MsU0FBQyxhQUFEO0FBQzlCLFVBQUE7TUFBQSxTQUFBLEdBQVksYUFBYSxDQUFDO01BQzFCLEdBQUEsR0FBTSxJQUFJLENBQUMsR0FBTCxDQUFTLENBQVQsRUFBWSxJQUFDLENBQUEsWUFBWSxDQUFDLG1CQUFkLENBQWtDLFNBQWxDLENBQVo7TUFDTixRQUFBLEdBQVcsSUFBQyxDQUFBLGlCQUFpQixDQUFDLG9CQUFuQixDQUF3QyxHQUF4QztNQUNYLElBQUEsQ0FBTyxRQUFQO1FBQ0UsYUFBQSxH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ZmVyJ1xue2lzUGFpcmVkQ2hhcmFjdGVyfSA9IHJlcXVpcmUgJy4vdGV4dC11dGlscydcblxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgTGluZXNZYXJkc3RpY2tcbiAgY29uc3RydWN0b3I6IChAbW9kZWwsIEBsaW5lTm9kZXNQcm92aWRlciwgQGxpbmVUb3BJbmRleCkgLT5cbiAgICBAcmFuZ2VGb3JNZWFzdXJlbWVudCA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcbiAgICBAaW52YWxpZGF0ZUNhY2hlKClcblxuICBpbnZhbGlkYXRlQ2FjaGU6IC0+XG4gICAgQGxlZnRQaXhlbFBvc2l0aW9uQ2FjaGUgPSB7fVxuXG4gIG1lYXN1cmVkUm93Rm9yUGl4ZWxQb3NpdGlvbjogKHBpeGVsUG9zaXRpb24pIC0+XG4gICAgdGFyZ2V0VG9wID0gcGl4ZWxQb3NpdGlvbi50b3BcbiAgICByb3cgPSBNYXRoLmZsb29yKHRhcmdldFRvcCAvIEBtb2RlbC5nZXRMaW5lSGVpZ2h0SW5QaXhlbHMoKSlcbiAgICByb3cgaWYgMCA8PSByb3dcblxuICBzY3JlZW5Qb3NpdGlvbkZvclBpeGVsUG9zaXRpb246IChwaXhlbFBvc2l0aW9uKSAtPlxuICAgIHRhcmdldFRvcCA9IHBpeGVsUG9zaXRpb24udG9wXG4gICAgcm93ID0gTWF0aC5tYXgoMCwgQGxpbmVUb3BJbmRleC5yb3dGb3JQaXhlbFBvc2l0aW9uKHRhcmdldFRvcCkpXG4gICAgbGluZU5vZGUgPSBAbGluZU5vZGVzUHJvdmlkZXIubGluZU5vZGVGb3JTY3JlZW5Sb3cocm93KVxuICAgIHVubGVzcyBsaW5lTm9kZVxuICAgICAgbGFzdFNjcmVlblJvdyA9IEBtb2RlbC5nZXRMYXN0U2NyZWVuUm93KClcbiAgICAgIGlmIHJvdyA+IGxhc3RTY3JlZW5Sb3dcbiAgICAgICAgcmV0dXJuIFBvaW50KGxhc3RTY3JlZW5Sb3csIEBtb2RlbC5saW5lTGVuZ3RoRm9yU2NyZWVuUm93KGxhc3RTY3JlZW5Sb3cpKVxuICAgICAgZWxzZVxuICAgICAgICByZXR1cm4gUG9pbnQocm93LCAwKVxuXG4gICAgdGFyZ2V0TGVmdCA9IHBpeGVsUG9zaXRpb24ubGVmdFxuICAgIHRhcmdldExlZnQgPSAwIGlmIHRhcmdldFRvcCA8IDAgb3IgdGFyZ2V0TGVmdCA8IDBcblxuICAgIHRleHROb2RlcyA9IEBsaW5lTm9kZXNQcm92aWRlci50ZXh0Tm9kZXNGb3JTY3JlZW5Sb3cocm93KVxuICAgIGxpbmVPZmZzZXQgPSBsaW5lTm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0XG4gICAgdGFyZ2V0TGVmdCArPSBsaW5lT2Zmc2V0XG5cbiAgICB0ZXh0Tm9kZUluZGV4ID0gMFxuICAgIGxvdyA9IDBcbiAgICBoaWdoID0gdGV4dE5vZGVzLmxlbmd0aCAtIDFcbiAgICB3aGlsZSBsb3cgPD0gaGlnaFxuICAgICAgbWlkID0gbG93ICsgKGhpZ2ggLSBsb3cgPj4gMSlcbiAgICAgIHRleHROb2RlID0gdGV4dE5vZGVzW21pZF1cbiAgICAgIHJhbmdlUmVjdCA9IEBjbGllbnRSZWN0Rm9yUmFuZ2UodGV4dE5vZGUsIDAsIHRleHROb2RlLmxlbmd0aClcbiAgICAgIGlmIHRhcmdldExlZnQgPCByYW5nZVJlY3QubGVmdFxuICAgICAgICBoaWdoID0gbWlkIC0gMVxuICAgICAgICB0ZXh0Tm9kZUluZGV4ID0gTWF0aC5tYXgoMCwgbWlkIC0gMSlcbiAgICAgIGVsc2UgaWYgdGFyZ2V0TGVmdCA+IHJhbmdlUmVjdC5yaWdodFxuICAgICAgICBsb3cgPSBtaWQgKyAxXG4gICAgICAgIHRleHROb2RlSW5kZXggPSBNYXRoLm1pbih0ZXh0Tm9kZXMubGVuZ3RoIC0gMSwgbWlkICsgMSlcbiAgICAgIGVsc2VcbiAgICAgICAgdGV4dE5vZGVJbmRleCA9IG1pZFxuICAgICAgICBicmVha1xuXG4gICAgdGV4dE5vZGUgPSB0ZXh0Tm9kZXNbdGV4dE5vZGVJbmRleF1cbiAgICBjaGFyYWN0ZXJJbmRleCA9IDBcbiAgICBsb3cgPSAwXG4gICAgaGlnaCA9IHRleHROb2RlLnRleHRDb250ZW50Lmxlbmd0aCAtIDFcbiAgICB3aGlsZSBsb3cgPD0gaGlnaFxuICAgICAgY2hhckluZGV4ID0gbG93ICsgKGhpZ2ggLSBsb3cgPj4gMSlcbiAgICAgIGlmIGlzUGFpcmVkQ2hhcmFjdGVyKHRleHROb2RlLnRleHRDb250ZW50LCBjaGFySW5kZXgpXG4gICAgICAgIG5leHRDaGFySW5kZXggPSBjaGFySW5kZXggKyAyXG4gICAgICBlbHNlXG4gICAgICAgIG5leHRDaGFySW5kZXggPSBjaGFySW5kZXggKyAxXG5cbiAgICAgIHJhbmdlUmVjdCA9IEBjbGllbnRSZWN0Rm9yUmFuZ2UodGV4dE5vZGUsIGNoYXJJbmRleCwgbmV4dENoYXJJbmRleClcbiAgICAgIGlmIHRhcmdldExlZnQgPCByYW5nZVJlY3QubGVmdFxuICAgICAgICBoaWdoID0gY2hhckluZGV4IC0gMVxuICAgICAgICBjaGFyYWN0ZXJJbmRleCA9IE1hdGgubWF4KDAsIGNoYXJJbmRleCAtIDEpXG4gICAgICBlbHNlIGlmIHRhcmdldExlZnQgPiByYW5nZVJlY3QucmlnaHRcbiAgICAgICAgbG93ID0gbmV4dENoYXJJbmRleFxuICAgICAgICBjaGFyYWN0ZXJJbmRleCA9IE1hdGgubWluKHRleHROb2RlLnRleHRDb250ZW50Lmxlbmd0aCwgbmV4dENoYXJJbmRleClcbiAgICAgIGVsc2VcbiAgICAgICAgaWYgdGFyZ2V0TGVmdCA8PSAoKHJhbmdlUmVjdC5sZWZ0ICsgcmFuZ2VSZWN0LnJpZ2h0KSAvIDIpXG4gICAgICAgICAgY2hhcmFjdGVySW5kZXggPSBjaGFySW5kZXhcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNoYXJhY3RlckluZGV4ID0gbmV4dENoYXJJbmRleFxuICAgICAgICBicmVha1xuXG4gICAgdGV4dE5vZGVTdGFydENvbHVtbiA9IDBcbiAgICB0ZXh0Tm9kZVN0YXJ0Q29sdW1uICs9IHRleHROb2Rlc1tpXS5sZW5ndGggZm9yIGkgaW4gWzAuLi50ZXh0Tm9kZUluZGV4XSBieSAxXG4gICAgUG9pbnQocm93LCB0ZXh0Tm9kZVN0YXJ0Q29sdW1uICsgY2hhcmFjdGVySW5kZXgpXG5cbiAgcGl4ZWxQb3NpdGlvbkZvclNjcmVlblBvc2l0aW9uOiAoc2NyZWVuUG9zaXRpb24pIC0+XG4gICAgdGFyZ2V0Um93ID0gc2NyZWVuUG9zaXRpb24ucm93XG4gICAgdGFyZ2V0Q29sdW1uID0gc2NyZWVuUG9zaXRpb24uY29sdW1uXG5cbiAgICB0b3AgPSBAbGluZVRvcEluZGV4LnBpeGVsUG9zaXRpb25BZnRlckJsb2Nrc0ZvclJvdyh0YXJnZXRSb3cpXG4gICAgbGVmdCA9IEBsZWZ0UGl4ZWxQb3NpdGlvbkZvclNjcmVlblBvc2l0aW9uKHRhcmdldFJvdywgdGFyZ2V0Q29sdW1uKVxuXG4gICAge3RvcCwgbGVmdH1cblxuICBsZWZ0UGl4ZWxQb3NpdGlvbkZvclNjcmVlblBvc2l0aW9uOiAocm93LCBjb2x1bW4pIC0+XG4gICAgbGluZU5vZGUgPSBAbGluZU5vZGVzUHJvdmlkZXIubGluZU5vZGVGb3JTY3JlZW5Sb3cocm93KVxuICAgIGxpbmVJZCA9IEBsaW5lTm9kZXNQcm92aWRlci5saW5lSWRGb3JTY3JlZW5Sb3cocm93KVxuXG4gICAgaWYgbGluZU5vZGU/XG4gICAgICBpZiBAbGVmdFBpeGVsUG9zaXRpb25DYWNoZVtsaW5lSWRdP1tjb2x1bW5dP1xuICAgICAgICBAbGVmdFBpeGVsUG9zaXRpb25DYWNoZVtsaW5lSWRdW2NvbHVtbl1cbiAgICAgIGVsc2VcbiAgICAgICAgdGV4dE5vZGVzID0gQGxpbmVOb2Rlc1Byb3ZpZGVyLnRleHROb2Rlc0ZvclNjcmVlblJvdyhyb3cpXG4gICAgICAgIHRleHROb2RlU3RhcnRDb2x1bW4gPSAwXG4gICAgICAgIGZvciB0ZXh0Tm9kZSBpbiB0ZXh0Tm9kZXNcbiAgICAgICAgICB0ZXh0Tm9kZUVuZENvbHVtbiA9IHRleHROb2RlU3RhcnRDb2x1bW4gKyB0ZXh0Tm9kZS50ZXh0Q29udGVudC5sZW5ndGhcbiAgICAgICAgICBpZiB0ZXh0Tm9kZUVuZENvbHVtbiA+IGNvbHVtblxuICAgICAgICAgICAgaW5kZXhJblRleHROb2RlID0gY29sdW1uIC0gdGV4dE5vZGVTdGFydENvbHVtblxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICB0ZXh0Tm9kZVN0YXJ0Q29sdW1uID0gdGV4dE5vZGVFbmRDb2x1bW5cblxuICAgICAgICBpZiB0ZXh0Tm9kZT9cbiAgICAgICAgICBpbmRleEluVGV4dE5vZGUgPz0gdGV4dE5vZGUudGV4dENvbnRlbnQubGVuZ3RoXG4gICAgICAgICAgbGluZU9mZnNldCA9IGxpbmVOb2RlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmxlZnRcbiAgICAgICAgICBpZiBpbmRleEluVGV4dE5vZGUgaXMgMFxuICAgICAgICAgICAgbGVmdFBpeGVsUG9zaXRpb24gPSBAY2xpZW50UmVjdEZvclJhbmdlKHRleHROb2RlLCAwLCAxKS5sZWZ0XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgbGVmdFBpeGVsUG9zaXRpb24gPSBAY2xpZW50UmVjdEZvclJhbmdlKHRleHROb2RlLCAwLCBpbmRleEluVGV4dE5vZGUpLnJpZ2h0XG4gICAgICAgICAgbGVmdFBpeGVsUG9zaXRpb24gLT0gbGluZU9mZnNldFxuXG4gICAgICAgICAgQGxlZnRQaXhlbFBvc2l0aW9uQ2FjaGVbbGluZUlkXSA/PSB7fVxuICAgICAgICAgIEBsZWZ0UGl4ZWxQb3NpdGlvbkNhY2hlW2xpbmVJZF1bY29sdW1uXSA9IGxlZnRQaXhlbFBvc2l0aW9uXG4gICAgICAgICAgbGVmdFBpeGVsUG9zaXRpb25cbiAgICAgICAgZWxzZVxuICAgICAgICAgIDBcbiAgICBlbHNlXG4gICAgICAwXG5cbiAgY2xpZW50UmVjdEZvclJhbmdlOiAodGV4dE5vZGUsIHN0YXJ0SW5kZXgsIGVuZEluZGV4KSAtPlxuICAgIEByYW5nZUZvck1lYXN1cmVtZW50LnNldFN0YXJ0KHRleHROb2RlLCBzdGFydEluZGV4KVxuICAgIEByYW5nZUZvck1lYXN1cmVtZW50LnNldEVuZCh0ZXh0Tm9kZSwgZW5kSW5kZXgpXG4gICAgY2xpZW50UmVjdHMgPSBAcmFuZ2VGb3JNZWFzdXJlbWVudC5nZXRDbGllbnRSZWN0cygpXG4gICAgaWYgY2xpZW50UmVjdHMubGVuZ3RoIGlzIDFcbiAgICAgIGNsaWVudFJlY3RzWzBdXG4gICAgZWxzZVxuICAgICAgQHJhbmdlRm9yTWVhc3VyZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcbiJdfQ==
