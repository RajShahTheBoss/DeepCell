(function() {
  var FakeLinesYardstick, Point, isPairedCharacter;

  Point = require('text-buffer').Point;

  isPairedCharacter = require('../src/text-utils').isPairedCharacter;

  module.exports = FakeLinesYardstick = (function() {
    function FakeLinesYardstick(model, lineTopIndex) {
      this.model = model;
      this.lineTopIndex = lineTopIndex;
      this.displayLayer = this.model.displayLayer;
      this.characterWidthsByScope = {};
    }

    FakeLinesYardstick.prototype.getScopedCharacterWidth = function(scopeNames, char) {
      return this.getScopedCharacterWidths(scopeNames)[char];
    };

    FakeLinesYardstick.prototype.getScopedCharacterWidths = function(scopeNames) {
      var i, len, scope, scopeName;
      scope = this.characterWidthsByScope;
      for (i = 0, len = scopeNames.length; i < len; i++) {
        scopeName = scopeNames[i];
        if (scope[scopeName] == null) {
          scope[scopeName] = {};
        }
        scope = scope[scopeName];
      }
      if (scope.characterWidths == null) {
        scope.characterWidths = {};
      }
      return scope.characterWidths;
    };

    FakeLinesYardstick.prototype.setScopedCharacterWidth = function(scopeNames, character, width) {
      return this.getScopedCharacterWidths(scopeNames)[character] = width;
    };

    FakeLinesYardstick.prototype.pixelPositionForScreenPosition = function(screenPosition) {
      var char, charLength, characterWidths, column, i, left, len, lineText, ref, ref1, scopes, startIndex, tagCode, tagCodes, targetColumn, targetRow, text, top, valueIndex;
      screenPosition = Point.fromObject(screenPosition);
      targetRow = screenPosition.row;
      targetColumn = screenPosition.column;
      top = this.lineTopIndex.pixelPositionAfterBlocksForRow(targetRow);
      left = 0;
      column = 0;
      scopes = [];
      startIndex = 0;
      ref = this.model.screenLineForScreenRow(targetRow), tagCodes = ref.tagCodes, lineText = ref.lineText;
      for (i = 0, len = tagCodes.length; i < len; i++) {
        tagCode = tagCodes[i];
        if (this.displayLayer.isOpenTagCode(tagCode)) {
          scopes.push(this.displayLayer.tagForCode(tagCode));
        } else if (this.displayLayer.isCloseTagCode(tagCode)) {
          scopes.splice(scopes.lastIndexOf(this.displayLayer.tagForCode(tagCode)), 1);
        } else {
          text = lineText.substr(startIndex, tagCode);
          startIndex += tagCode;
          characterWidths = this.getScopedCharacterWidths(scopes);
          valueIndex = 0;
          while (valueIndex < text.length) {
            if (isPairedCharacter(text, valueIndex)) {
              char = text.slice(valueIndex, valueIndex + 2);
              charLength = 2;
              valueIndex += 2;
            } else {
              char = text[valueIndex];
              charLength = 1;
              valueIndex++;
            }
            if (column === targetColumn) {
              break;
            }
            if (char !== '\0') {
              left += (ref1 = characterWidths[char]) != null ? ref1 : this.model.getDefaultCharWidth();
            }
            column += charLength;
          }
        }
      }
      return {
        top: top,
        left: left
      };
    };

    return FakeLinesYardstick;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3BlYy9mYWtlLWxpbmVzLXlhcmRzdGljay5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFDLFFBQVMsT0FBQSxDQUFRLGFBQVI7O0VBQ1Qsb0JBQXFCLE9BQUEsQ0FBUSxtQkFBUjs7RUFFdEIsTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNTLDRCQUFDLEtBQUQsRUFBUyxZQUFUO01BQUMsSUFBQyxDQUFBLFFBQUQ7TUFBUSxJQUFDLENBQUEsZUFBRDtNQUNuQixJQUFDLENBQUEsZUFBZ0IsSUFBQyxDQUFBLE1BQWpCO01BQ0YsSUFBQyxDQUFBLHNCQUFELEdBQTBCO0lBRmY7O2lDQUliLHVCQUFBLEdBQXlCLFNBQUMsVUFBRCxFQUFhLElBQWI7YUFDdkIsSUFBQyxDQUFBLHdCQUFELENBQTBCLFVBQTFCLENBQXNDLENBQUEsSUFBQTtJQURmOztpQ0FHekIsd0JBQUEsR0FBMEIsU0FBQyxVQUFEO0FBQ3hCLFVBQUE7TUFBQSxLQUFBLEdBQVEsSUFBQyxDQUFBO0FBQ1QsV0FBQSw0Q0FBQTs7O1VBQ0UsS0FBTSxDQUFBLFNBQUEsSUFBYzs7UUFDcEIsS0FBQSxHQUFRLEtBQU0sQ0FBQSxTQUFBO0FBRmhCOztRQUdBLEtBQUssQ0FBQyxrQkFBbUI7O2FBQ3pCLEtBQUssQ0FBQztJQU5rQjs7aUNBUTFCLHVCQUFBLEdBQXlCLFNBQUMsVUFBRCxFQUFhLFNBQWIsRUFBd0IsS0FBeEI7YUFDdkIsSUFBQyxDQUFBLHdCQUFELENBQTBCLFVBQTFCLENBQXNDLENBQUEsU0FBQSxDQUF0QyxHQUFtRDtJQUQ1Qjs7aUNBR3pCLDhCQUFBLEdBQWdDLFNBQUMsY0FBRDtBQUM5QixVQUFBO01BQUEsY0FBQSxHQUFpQixLQUFLLENBQUMsVUFBTixDQUFpQixjQUFqQjtNQUVqQixTQUFBLEdBQVksY0FBYyxDQUFDO01BQzNCLFlBQUEsR0FBZSxjQUFjLENBQUM7TUFFOUIsR0FBQSxHQUFNLElBQUMsQ0FBQSxZQUFZLENBQUMsOEJBQWQsQ0FBNkMsU0FBN0M7TUFDTixJQUFBLEdBQU87TUFDUCxNQUFBLEdBQVM7TUFFVCxNQUFBLEdBQVM7TUFDVCxVQUFBLEdBQWE7TUFDYixNQUF1QixJQUFDLENBQUEsS0FBSyxDQUFDLHNCQUFQLENBQThCLFNBQTlCLENBQXZCLEVBQUMsdUJBQUQsRUFBVztBQUNYLFdBQUEsMENBQUE7O1FBQ0UsSUFBRyxJQUFDLENBQUEsWUFBWSxDQUFDLGFBQWQsQ0FBNEIsT0FBNUIsQ0FBSDtVQUNFLE1BQU0sQ0FBQyxJQUFQLENBQVksSUFBQyxDQUFBLFlBQVksQ0FBQyxVQUFkLENBQXlCLE9BQXpCLENBQVosRUFERjtTQUFBLE1BRUssSUFBRyxJQUFDLENBQUEsWUFBWSxDQUFDLGNBQWQsQ0FBNkIsT0FBN0IsQ0FBSDtVQUNILE1BQU0sQ0FBQyxNQUFQLENBQWMsTUFBTSxDQUFDLFdBQVAsQ0FBbUIsSUFBQyxDQUFBLFlBQVksQ0FBQyxVQUFkLENBQXlCLE9BQXpCLENBQW5CLENBQWQsRUFBcUUsQ0FBckUsRUFERztTQUFBLE1BQUE7VUFHSCxJQUFBLEdBQU8sUUFBUSxDQUFDLE1BQVQsQ0FBZ0IsVUFBaEIsRUFBNEIsT0FBNUI7VUFDUCxVQUFBLElBQWM7VUFDZCxlQUFBLEdBQWtCLElBQUMsQ0FBQSx3QkFBRCxDQUEwQixNQUExQjtVQUVsQixVQUFBLEdBQWE7QUFDYixpQkFBTSxVQUFBLEdBQWEsSUFBSSxDQUFDLE1BQXhCO1lBQ0UsSUFBRyxpQkFBQSxDQUFrQixJQUFsQixFQUF3QixVQUF4QixDQUFIO2NBQ0UsSUFBQSxHQUFPLElBQUs7Y0FDWixVQUFBLEdBQWE7Y0FDYixVQUFBLElBQWMsRUFIaEI7YUFBQSxNQUFBO2NBS0UsSUFBQSxHQUFPLElBQUssQ0FBQSxVQUFBO2NBQ1osVUFBQSxHQUFhO2NBQ2IsVUFBQSxHQVBGOztZQVNBLElBQVMsTUFBQSxLQUFVLFlBQW5CO0FBQUEsb0JBQUE7O1lBRUEsSUFBb0UsSUFBQSxLQUFRLElBQTVFO2NBQUEsSUFBQSxvREFBZ0MsSUFBQyxDQUFBLEtBQUssQ0FBQyxtQkFBUCxDQUFBLEVBQWhDOztZQUNBLE1BQUEsSUFBVTtVQWJaLENBUkc7O0FBSFA7YUEwQkE7UUFBQyxLQUFBLEdBQUQ7UUFBTSxNQUFBLElBQU47O0lBdkM4Qjs7Ozs7QUF2QmxDIiwic291cmNlc0NvbnRlbnQiOlsie1BvaW50fSA9IHJlcXVpcmUgJ3RleHQtYnVmZmVyJ1xue2lzUGFpcmVkQ2hhcmFjdGVyfSA9IHJlcXVpcmUgJy4uL3NyYy90ZXh0LXV0aWxzJ1xuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBGYWtlTGluZXNZYXJkc3RpY2tcbiAgY29uc3RydWN0b3I6IChAbW9kZWwsIEBsaW5lVG9wSW5kZXgpIC0+XG4gICAge0BkaXNwbGF5TGF5ZXJ9ID0gQG1vZGVsXG4gICAgQGNoYXJhY3RlcldpZHRoc0J5U2NvcGUgPSB7fVxuXG4gIGdldFNjb3BlZENoYXJhY3RlcldpZHRoOiAoc2NvcGVOYW1lcywgY2hhcikgLT5cbiAgICBAZ2V0U2NvcGVkQ2hhcmFjdGVyV2lkdGhzKHNjb3BlTmFtZXMpW2NoYXJdXG5cbiAgZ2V0U2NvcGVkQ2hhcmFjdGVyV2lkdGhzOiAoc2NvcGVOYW1lcykgLT5cbiAgICBzY29wZSA9IEBjaGFyYWN0ZXJXaWR0aHNCeVNjb3BlXG4gICAgZm9yIHNjb3BlTmFtZSBpbiBzY29wZU5hbWVzXG4gICAgICBzY29wZVtzY29wZU5hbWVdID89IHt9XG4gICAgICBzY29wZSA9IHNjb3BlW3Njb3BlTmFtZV1cbiAgICBzY29wZS5jaGFyYWN0ZXJXaWR0aHMgPz0ge31cbiAgICBzY29wZS5jaGFyYWN0ZXJXaWR0aHNcblxuICBzZXRTY29wZWRDaGFyYWN0ZXJXaWR0aDogKHNjb3BlTmFtZXMsIGNoYXJhY3Rlciwgd2lkdGgpIC0+XG4gICAgQGdldFNjb3BlZENoYXJhY3RlcldpZHRocyhzY29wZU5hbWVzKVtjaGFyYWN0ZXJdID0gd2lkdGhcblxuICBwaXhlbFBvc2l0aW9uRm9yU2NyZWVuUG9zaXRpb246IChzY3JlZW5Qb3NpdGlvbikgLT5cbiAgICBzY3JlZW5Qb3NpdGlvbiA9IFBvaW50LmZyb21PYmplY3Qoc2NyZWVuUG9zaXRpb24pXG5cbiAgICB0YXJnZXRSb3cgPSBzY3JlZW5Qb3NpdGlvbi5yb3dcbiAgICB0YXJnZXRDb2x1bW4gPSBzY3JlZW5Qb3NpdGlvbi5jb2x1bW5cblxuICAgIHRvcCA9IEBsaW5lVG9wSW5kZXgucGl4ZWxQb3NpdGlvbkFmdGVyQmxvY2tzRm9yUm93KHRhcmdldFJvdylcbiAgICBsZWZ0ID0gMFxuICAgIGNvbHVtbiA9IDBcblxuICAgIHNjb3BlcyA9IFtdXG4gICAgc3RhcnRJbmRleCA9IDBcbiAgICB7dGFnQ29kZXMsIGxpbmVUZXh0fSA9IEBtb2RlbC5zY3JlZW5MaW5lRm9yU2NyZWVuUm93KHRhcmdldFJvdylcbiAgICBmb3IgdGFnQ29kZSBpbiB0YWdDb2Rlc1xuICAgICAgaWYgQGRpc3BsYXlMYXllci5pc09wZW5UYWdDb2RlKHRhZ0NvZGUpXG4gICAgICAgIHNjb3Blcy5wdXNoKEBkaXNwbGF5TGF5ZXIudGFnRm9yQ29kZSh0YWdDb2RlKSlcbiAgICAgIGVsc2UgaWYgQGRpc3BsYXlMYXllci5pc0Nsb3NlVGFnQ29kZSh0YWdDb2RlKVxuICAgICAgICBzY29wZXMuc3BsaWNlKHNjb3Blcy5sYXN0SW5kZXhPZihAZGlzcGxheUxheWVyLnRhZ0ZvckNvZGUodGFnQ29kZSkpLCAxKVxuICAgICAgZWxzZVxuICAgICAgICB0ZXh0ID0gbGluZVRleHQuc3Vic3RyKHN0YXJ0SW5kZXgsIHRhZ0NvZGUpXG4gICAgICAgIHN0YXJ0SW5kZXggKz0gdGFnQ29kZVxuICAgICAgICBjaGFyYWN0ZXJXaWR0aHMgPSBAZ2V0U2NvcGVkQ2hhcmFjdGVyV2lkdGhzKHNjb3BlcylcblxuICAgICAgICB2YWx1ZUluZGV4ID0gMFxuICAgICAgICB3aGlsZSB2YWx1ZUluZGV4IDwgdGV4dC5sZW5ndGhcbiAgICAgICAgICBpZiBpc1BhaXJlZENoYXJhY3Rlcih0ZXh0LCB2YWx1ZUluZGV4KVxuICAgICAgICAgICAgY2hhciA9IHRleHRbdmFsdWVJbmRleC4uLnZhbHVlSW5kZXggKyAyXVxuICAgICAgICAgICAgY2hhckxlbmd0aCA9IDJcbiAgICAgICAgICAgIHZhbHVlSW5kZXggKz0gMlxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGNoYXIgPSB0ZXh0W3ZhbHVlSW5kZXhdXG4gICAgICAgICAgICBjaGFyTGVuZ3RoID0gMVxuICAgICAgICAgICAgdmFsdWVJbmRleCsrXG5cbiAgICAgICAgICBicmVhayBpZiBjb2x1bW4gaXMgdGFyZ2V0Q29sdW1uXG5cbiAgICAgICAgICBsZWZ0ICs9IGNoYXJhY3RlcldpZHRoc1tjaGFyXSA/IEBtb2RlbC5nZXREZWZhdWx0Q2hhcldpZHRoKCkgdW5sZXNzIGNoYXIgaXMgJ1xcMCdcbiAgICAgICAgICBjb2x1bW4gKz0gY2hhckxlbmd0aFxuXG4gICAge3RvcCwgbGVmdH1cbiJdfQ==
