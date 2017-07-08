(function() {
  var LineNumbersTileComponent, _;

  _ = require('underscore-plus');

  module.exports = LineNumbersTileComponent = (function() {
    LineNumbersTileComponent.createDummy = function(domElementPool) {
      return new LineNumbersTileComponent({
        id: -1,
        domElementPool: domElementPool
      });
    };

    function LineNumbersTileComponent(arg) {
      this.id = arg.id, this.domElementPool = arg.domElementPool;
      this.lineNumberNodesById = {};
      this.domNode = this.domElementPool.buildElement("div");
      this.domNode.style.position = "absolute";
      this.domNode.style.display = "block";
      this.domNode.style.top = 0;
    }

    LineNumbersTileComponent.prototype.destroy = function() {
      return this.domElementPool.freeElementAndDescendants(this.domNode);
    };

    LineNumbersTileComponent.prototype.getDomNode = function() {
      return this.domNode;
    };

    LineNumbersTileComponent.prototype.updateSync = function(state) {
      var id, node, ref;
      this.newState = state;
      if (!this.oldState) {
        this.oldState = {
          tiles: {},
          styles: {}
        };
        this.oldState.tiles[this.id] = {
          lineNumbers: {}
        };
      }
      this.newTileState = this.newState.tiles[this.id];
      this.oldTileState = this.oldState.tiles[this.id];
      if (this.newTileState.display !== this.oldTileState.display) {
        this.domNode.style.display = this.newTileState.display;
        this.oldTileState.display = this.newTileState.display;
      }
      if (this.newState.styles.backgroundColor !== this.oldState.styles.backgroundColor) {
        this.domNode.style.backgroundColor = this.newState.styles.backgroundColor;
        this.oldState.styles.backgroundColor = this.newState.styles.backgroundColor;
      }
      if (this.newTileState.height !== this.oldTileState.height) {
        this.domNode.style.height = this.newTileState.height + 'px';
        this.oldTileState.height = this.newTileState.height;
      }
      if (this.newTileState.top !== this.oldTileState.top) {
        this.domNode.style['-webkit-transform'] = "translate3d(0, " + this.newTileState.top + "px, 0px)";
        this.oldTileState.top = this.newTileState.top;
      }
      if (this.newTileState.zIndex !== this.oldTileState.zIndex) {
        this.domNode.style.zIndex = this.newTileState.zIndex;
        this.oldTileState.zIndex = this.newTileState.zIndex;
      }
      if (this.newState.maxLineNumberDigits !== this.oldState.maxLineNumberDigits) {
        ref = this.lineNumberNodesById;
        for (id in ref) {
          node = ref[id];
          this.domElementPool.freeElementAndDescendants(node);
        }
        this.oldState.tiles[this.id] = {
          lineNumbers: {}
        };
        this.oldTileState = this.oldState.tiles[this.id];
        this.lineNumberNodesById = {};
        this.oldState.maxLineNumberDigits = this.newState.maxLineNumberDigits;
      }
      return this.updateLineNumbers();
    };

    LineNumbersTileComponent.prototype.updateLineNumbers = function() {
      var i, id, j, len, lineNumberNode, lineNumberState, newLineNumberIds, newLineNumberNodes, nextNode, ref, ref1, results;
      newLineNumberIds = null;
      newLineNumberNodes = null;
      ref = this.oldTileState.lineNumbers;
      for (id in ref) {
        lineNumberState = ref[id];
        if (!this.newTileState.lineNumbers.hasOwnProperty(id)) {
          this.domElementPool.freeElementAndDescendants(this.lineNumberNodesById[id]);
          delete this.lineNumberNodesById[id];
          delete this.oldTileState.lineNumbers[id];
        }
      }
      ref1 = this.newTileState.lineNumbers;
      for (id in ref1) {
        lineNumberState = ref1[id];
        if (this.oldTileState.lineNumbers.hasOwnProperty(id)) {
          this.updateLineNumberNode(id, lineNumberState);
        } else {
          if (newLineNumberIds == null) {
            newLineNumberIds = [];
          }
          if (newLineNumberNodes == null) {
            newLineNumberNodes = [];
          }
          newLineNumberIds.push(id);
          newLineNumberNodes.push(this.buildLineNumberNode(lineNumberState));
          this.oldTileState.lineNumbers[id] = _.clone(lineNumberState);
        }
      }
      if (newLineNumberIds == null) {
        return;
      }
      results = [];
      for (i = j = 0, len = newLineNumberIds.length; j < len; i = ++j) {
        id = newLineNumberIds[i];
        lineNumberNode = newLineNumberNodes[i];
        this.lineNumberNodesById[id] = lineNumberNode;
        if (nextNode = this.findNodeNextTo(lineNumberNode)) {
          results.push(this.domNode.insertBefore(lineNumberNode, nextNode));
        } else {
          results.push(this.domNode.appendChild(lineNumberNode));
        }
      }
      return results;
    };

    LineNumbersTileComponent.prototype.findNodeNextTo = function(node) {
      var j, len, nextNode, ref;
      ref = this.domNode.children;
      for (j = 0, len = ref.length; j < len; j++) {
        nextNode = ref[j];
        if (this.screenRowForNode(node) < this.screenRowForNode(nextNode)) {
          return nextNode;
        }
      }
    };

    LineNumbersTileComponent.prototype.screenRowForNode = function(node) {
      return parseInt(node.dataset.screenRow);
    };

    LineNumbersTileComponent.prototype.buildLineNumberNode = function(lineNumberState) {
      var blockDecorationsHeight, bufferRow, className, lineNumberNode, screenRow, softWrapped;
      screenRow = lineNumberState.screenRow, bufferRow = lineNumberState.bufferRow, softWrapped = lineNumberState.softWrapped, blockDecorationsHeight = lineNumberState.blockDecorationsHeight;
      className = this.buildLineNumberClassName(lineNumberState);
      lineNumberNode = this.domElementPool.buildElement("div", className);
      lineNumberNode.dataset.screenRow = screenRow;
      lineNumberNode.dataset.bufferRow = bufferRow;
      lineNumberNode.style.marginTop = blockDecorationsHeight + "px";
      this.setLineNumberInnerNodes(bufferRow, softWrapped, lineNumberNode);
      return lineNumberNode;
    };

    LineNumbersTileComponent.prototype.setLineNumberInnerNodes = function(bufferRow, softWrapped, lineNumberNode) {
      var iconRight, lineNumber, maxLineNumberDigits, padding, textNode;
      this.domElementPool.freeDescendants(lineNumberNode);
      maxLineNumberDigits = this.newState.maxLineNumberDigits;
      if (softWrapped) {
        lineNumber = "•";
      } else {
        lineNumber = (bufferRow + 1).toString();
      }
      padding = _.multiplyString("\u00a0", maxLineNumberDigits - lineNumber.length);
      textNode = this.domElementPool.buildText(padding + lineNumber);
      iconRight = this.domElementPool.buildElement("div", "icon-right");
      lineNumberNode.appendChild(textNode);
      return lineNumberNode.appendChild(iconRight);
    };

    LineNumbersTileComponent.prototype.updateLineNumberNode = function(lineNumberId, newLineNumberState) {
      var node, oldLineNumberState;
      oldLineNumberState = this.oldTileState.lineNumbers[lineNumberId];
      node = this.lineNumberNodesById[lineNumberId];
      if (!(oldLineNumberState.foldable === newLineNumberState.foldable && _.isEqual(oldLineNumberState.decorationClasses, newLineNumberState.decorationClasses))) {
        node.className = this.buildLineNumberClassName(newLineNumberState);
        oldLineNumberState.foldable = newLineNumberState.foldable;
        oldLineNumberState.decorationClasses = _.clone(newLineNumberState.decorationClasses);
      }
      if (!(oldLineNumberState.screenRow === newLineNumberState.screenRow && oldLineNumberState.bufferRow === newLineNumberState.bufferRow)) {
        this.setLineNumberInnerNodes(newLineNumberState.bufferRow, newLineNumberState.softWrapped, node);
        node.dataset.screenRow = newLineNumberState.screenRow;
        node.dataset.bufferRow = newLineNumberState.bufferRow;
        oldLineNumberState.screenRow = newLineNumberState.screenRow;
        oldLineNumberState.bufferRow = newLineNumberState.bufferRow;
      }
      if (oldLineNumberState.blockDecorationsHeight !== newLineNumberState.blockDecorationsHeight) {
        node.style.marginTop = newLineNumberState.blockDecorationsHeight + "px";
        return oldLineNumberState.blockDecorationsHeight = newLineNumberState.blockDecorationsHeight;
      }
    };

    LineNumbersTileComponent.prototype.buildLineNumberClassName = function(arg) {
      var bufferRow, className, decorationClasses, foldable, softWrapped;
      bufferRow = arg.bufferRow, foldable = arg.foldable, decorationClasses = arg.decorationClasses, softWrapped = arg.softWrapped;
      className = "line-number";
      if (decorationClasses != null) {
        className += " " + decorationClasses.join(' ');
      }
      if (foldable && !softWrapped) {
        className += " foldable";
      }
      return className;
    };

    LineNumbersTileComponent.prototype.lineNumberNodeForScreenRow = function(screenRow) {
      var id, lineNumberState, ref;
      ref = this.oldTileState.lineNumbers;
      for (id in ref) {
        lineNumberState = ref[id];
        if (lineNumberState.screenRow === screenRow) {
          return this.lineNumberNodesById[id];
        }
      }
      return null;
    };

    return LineNumbersTileComponent;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2xpbmUtbnVtYmVycy10aWxlLWNvbXBvbmVudC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFBLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBRUosTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNKLHdCQUFDLENBQUEsV0FBRCxHQUFjLFNBQUMsY0FBRDthQUNSLElBQUEsd0JBQUEsQ0FBeUI7UUFBQyxFQUFBLEVBQUksQ0FBQyxDQUFOO1FBQVMsZ0JBQUEsY0FBVDtPQUF6QjtJQURROztJQUdELGtDQUFDLEdBQUQ7TUFBRSxJQUFDLENBQUEsU0FBQSxJQUFJLElBQUMsQ0FBQSxxQkFBQTtNQUNuQixJQUFDLENBQUEsbUJBQUQsR0FBdUI7TUFDdkIsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQUFDLENBQUEsY0FBYyxDQUFDLFlBQWhCLENBQTZCLEtBQTdCO01BQ1gsSUFBQyxDQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBZixHQUEwQjtNQUMxQixJQUFDLENBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFmLEdBQXlCO01BQ3pCLElBQUMsQ0FBQSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQWYsR0FBcUI7SUFMVjs7dUNBT2IsT0FBQSxHQUFTLFNBQUE7YUFDUCxJQUFDLENBQUEsY0FBYyxDQUFDLHlCQUFoQixDQUEwQyxJQUFDLENBQUEsT0FBM0M7SUFETzs7dUNBR1QsVUFBQSxHQUFZLFNBQUE7YUFDVixJQUFDLENBQUE7SUFEUzs7dUNBR1osVUFBQSxHQUFZLFNBQUMsS0FBRDtBQUNWLFVBQUE7TUFBQSxJQUFDLENBQUEsUUFBRCxHQUFZO01BQ1osSUFBQSxDQUFPLElBQUMsQ0FBQSxRQUFSO1FBQ0UsSUFBQyxDQUFBLFFBQUQsR0FBWTtVQUFDLEtBQUEsRUFBTyxFQUFSO1VBQVksTUFBQSxFQUFR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LFNBQTVDLEVBQXVELGtCQUFrQixDQUFDLFdBQTFFLEVBQXVGLElBQXZGO1FBQ0EsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFiLEdBQXlCLGtCQUFrQixDQUFDO1FBQzVDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBYixHQUF5QixrQkFBa0IsQ0FBQztRQUM1QyxrQkFBa0IsQ0FBQyxTQUFuQixHQUErQixrQkFBa0IsQ0FBQztRQUNsRCxrQkFBa0IsQ0FBQyxTQUFuQixHQUErQixrQkFBa0IsQ0FBQyxVQUxwRDs7TUFPQSxJQUFPLGtCQUFrQixDQUFDLHNCQUFuQixLQUE2QyxrQkFBa0IsQ0FBQyxzQkFBdkU7UUFDRSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVgsR0FBdUIsa0JBQWtCLENBQUMsc0JBQW5CLEdBQTRDO2VBQ25FLGtCQUFrQixDQUFDLHNCQUFuQixHQUE0QyxrQkFBa0IsQ0FBQyx1QkFGakU7O0lBaEJvQjs7dUNBb0J0Qix3QkFBQSxHQUEwQixTQUFDLEdBQUQ7QUFDeEIsVUFBQTtNQUQwQiwyQkFBVyx5QkFBVSwyQ0FBbUI7TUFDbEUsU0FBQSxHQUFZO01BQ1osSUFBa0QseUJBQWxEO1FBQUEsU0FBQSxJQUFhLEdBQUEsR0FBTSxpQkFBaUIsQ0FBQyxJQUFsQixDQUF1QixHQUF2QixFQUFuQjs7TUFDQSxJQUE0QixRQUFBLElBQWEsQ0FBSSxXQUE3QztRQUFBLFNBQUEsSUFBYSxZQUFiOzthQUNBO0lBSndCOzt1Q0FNMUIsMEJBQUEsR0FBNEIsU0FBQyxTQUFEO0FBQzFCLFVBQUE7QUFBQTtBQUFBLFdBQUEsU0FBQTs7UUFDRSxJQUFHLGVBQWUsQ0FBQyxTQUFoQixLQUE2QixTQUFoQztBQUNFLGlCQUFPLElBQUMsQ0FBQSxtQkFBb0IsQ0FBQSxFQUFBLEVBRDlCOztBQURGO2FBR0E7SUFKMEI7Ozs7O0FBeEo5QiIsInNvdXJjZXNDb250ZW50IjpbIl8gPSByZXF1aXJlICd1bmRlcnNjb3JlLXBsdXMnXG5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIExpbmVOdW1iZXJzVGlsZUNvbXBvbmVudFxuICBAY3JlYXRlRHVtbXk6IChkb21FbGVtZW50UG9vbCkgLT5cbiAgICBuZXcgTGluZU51bWJlcnNUaWxlQ29tcG9uZW50KHtpZDogLTEsIGRvbUVsZW1lbnRQb29sfSlcblxuICBjb25zdHJ1Y3RvcjogKHtAaWQsIEBkb21FbGVtZW50UG9vbH0pIC0+XG4gICAgQGxpbmVOdW1iZXJOb2Rlc0J5SWQgPSB7fVxuICAgIEBkb21Ob2RlID0gQGRvbUVsZW1lbnRQb29sLmJ1aWxkRWxlbWVudChcImRpdlwiKVxuICAgIEBkb21Ob2RlLnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiXG4gICAgQGRvbU5vZGUuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIlxuICAgIEBkb21Ob2RlLnN0eWxlLnRvcCA9IDAgIyBDb3ZlciB0aGUgc3BhY2Ugb2NjdXBpZWQgYnkgYSBkdW1teSBsaW5lTnVtYmVyXG5cbiAgZGVzdHJveTogLT5cbiAgICBAZG9tRWxlbWVudFBvb2wuZnJlZUVsZW1lbnRBbmREZXNjZW5kYW50cyhAZG9tTm9kZSlcblxuICBnZXREb21Ob2RlOiAtPlxuICAgIEBkb21Ob2RlXG5cbiAgdXBkYXRlU3luYzogKHN0YXRlKSAtPlxuICAgIEBuZXdTdGF0ZSA9IHN0YXRlXG4gICAgdW5sZXNzIEBvbGRTdGF0ZVxuICAgICAgQG9sZFN0YXRlID0ge3RpbGVzOiB7fSwgc3R5bGVzOiB7fX1cbiAgICAgIEBvbGRTdGF0ZS50aWxlc1tAaWRdID0ge2xpbmVOdW1iZXJzOiB7fX1cblxuICAgIEBuZXdUaWxlU3RhdGUgPSBAbmV3U3RhdGUudGlsZXNbQGlkXVxuICAgIEBvbGRUaWxlU3RhdGUgPSBAb2xkU3RhdGUudGlsZXNbQGlkXVxuXG4gICAgaWYgQG5ld1RpbGVTdGF0ZS5kaXNwbGF5IGlzbnQgQG9sZFRpbGVTdGF0ZS5kaXNwbGF5XG4gICAgICBAZG9tTm9kZS5zdHlsZS5kaXNwbGF5ID0gQG5ld1RpbGVTdGF0ZS5kaXNwbGF5XG4gICAgICBAb2xkVGlsZVN0YXRlLmRpc3BsYXkgPSBAbmV3VGlsZVN0YXRlLmRpc3BsYXlcblxuICAgIGlmIEBuZXdTdGF0ZS5zdHlsZXMuYmFja2dyb3VuZENvbG9yIGlzbnQgQG9sZFN0YXRlLnN0eWxlcy5iYWNrZ3JvdW5kQ29sb3JcbiAgICAgIEBkb21Ob2RlLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IEBuZXdTdGF0ZS5zdHlsZXMuYmFja2dyb3VuZENvbG9yXG4gICAgICBAb2xkU3RhdGUuc3R5bGVzLmJhY2tncm91bmRDb2xvciA9IEBuZXdTdGF0ZS5zdHlsZXMuYmFja2dyb3VuZENvbG9yXG5cbiAgICBpZiBAbmV3VGlsZVN0YXRlLmhlaWdodCBpc250IEBvbGRUaWxlU3RhdGUuaGVpZ2h0XG4gICAgICBAZG9tTm9kZS5zdHlsZS5oZWlnaHQgPSBAbmV3VGlsZVN0YXRlLmhlaWdodCArICdweCdcbiAgICAgIEBvbGRUaWxlU3RhdGUuaGVpZ2h0ID0gQG5ld1RpbGVTdGF0ZS5oZWlnaHRcblxuICAgIGlmIEBuZXdUaWxlU3RhdGUudG9wIGlzbnQgQG9sZFRpbGVTdGF0ZS50b3BcbiAgICAgIEBkb21Ob2RlLnN0eWxlWyctd2Via2l0LXRyYW5zZm9ybSddID0gXCJ0cmFuc2xhdGUzZCgwLCAje0BuZXdUaWxlU3RhdGUudG9wfXB4LCAwcHgpXCJcbiAgICAgIEBvbGRUaWxlU3RhdGUudG9wID0gQG5ld1RpbGVTdGF0ZS50b3BcblxuICAgIGlmIEBuZXdUaWxlU3RhdGUuekluZGV4IGlzbnQgQG9sZFRpbGVTdGF0ZS56SW5kZXhcbiAgICAgIEBkb21Ob2RlLnN0eWxlLnpJbmRleCA9IEBuZXdUaWxlU3RhdGUuekluZGV4XG4gICAgICBAb2xkVGlsZVN0YXRlLnpJbmRleCA9IEBuZXdUaWxlU3RhdGUuekluZGV4XG5cbiAgICBpZiBAbmV3U3RhdGUubWF4TGluZU51bWJlckRpZ2l0cyBpc250IEBvbGRTdGF0ZS5tYXhMaW5lTnVtYmVyRGlnaXRzXG4gICAgICBmb3IgaWQsIG5vZGUgb2YgQGxpbmVOdW1iZXJOb2Rlc0J5SWRcbiAgICAgICAgQGRvbUVsZW1lbnRQb29sLmZyZWVFbGVtZW50QW5kRGVzY2VuZGFudHMobm9kZSlcblxuICAgICAgQG9sZFN0YXRlLnRpbGVzW0BpZF0gPSB7bGluZU51bWJlcnM6IHt9fVxuICAgICAgQG9sZFRpbGVTdGF0ZSA9IEBvbGRTdGF0ZS50aWxlc1tAaWRdXG4gICAgICBAbGluZU51bWJlck5vZGVzQnlJZCA9IHt9XG4gICAgICBAb2xkU3RhdGUubWF4TGluZU51bWJlckRpZ2l0cyA9IEBuZXdTdGF0ZS5tYXhMaW5lTnVtYmVyRGlnaXRzXG5cbiAgICBAdXBkYXRlTGluZU51bWJlcnMoKVxuXG4gIHVwZGF0ZUxpbmVOdW1iZXJzOiAtPlxuICAgIG5ld0xpbmVOdW1iZXJJZHMgPSBudWxsXG4gICAgbmV3TGluZU51bWJlck5vZGVzID0gbnVsbFxuXG4gICAgZm9yIGlkLCBsaW5lTnVtYmVyU3RhdGUgb2YgQG9sZFRpbGVTdGF0ZS5saW5lTnVtYmVyc1xuICAgICAgdW5sZXNzIEBuZXdUaWxlU3RhdGUubGluZU51bWJlcnMuaGFzT3duUHJvcGVydHkoaWQpXG4gICAgICAgIEBkb21FbGVtZW50UG9vbC5mcmVlRWxlbWVudEFuZERlc2NlbmRhbnRzKEBsaW5lTnVtYmVyTm9kZXNCeUlkW2lkXSlcbiAgICAgICAgZGVsZXRlIEBsaW5lTnVtYmVyTm9kZXNCeUlkW2lkXVxuICAgICAgICBkZWxldGUgQG9sZFRpbGVTdGF0ZS5saW5lTnVtYmVyc1tpZF1cblxuICAgIGZvciBpZCwgbGluZU51bWJlclN0YXRlIG9mIEBuZXdUaWxlU3RhdGUubGluZU51bWJlcnNcbiAgICAgIGlmIEBvbGRUaWxlU3RhdGUubGluZU51bWJlcnMuaGFzT3duUHJvcGVydHkoaWQpXG4gICAgICAgIEB1cGRhdGVMaW5lTnVtYmVyTm9kZShpZCwgbGluZU51bWJlclN0YXRlKVxuICAgICAgZWxzZVxuICAgICAgICBuZXdMaW5lTnVtYmVySWRzID89IFtdXG4gICAgICAgIG5ld0xpbmVOdW1iZXJOb2RlcyA/PSBbXVxuICAgICAgICBuZXdMaW5lTnVtYmVySWRzLnB1c2goaWQpXG4gICAgICAgIG5ld0xpbmVOdW1iZXJOb2Rlcy5wdXNoKEBidWlsZExpbmVOdW1iZXJOb2RlKGxpbmVOdW1iZXJTdGF0ZSkpXG4gICAgICAgIEBvbGRUaWxlU3RhdGUubGluZU51bWJlcnNbaWRdID0gXy5jbG9uZShsaW5lTnVtYmVyU3RhdGUpXG5cbiAgICByZXR1cm4gdW5sZXNzIG5ld0xpbmVOdW1iZXJJZHM/XG5cbiAgICBmb3IgaWQsIGkgaW4gbmV3TGluZU51bWJlcklkc1xuICAgICAgbGluZU51bWJlck5vZGUgPSBuZXdMaW5lTnVtYmVyTm9kZXNbaV1cbiAgICAgIEBsaW5lTnVtYmVyTm9kZXNCeUlkW2lkXSA9IGxpbmVOdW1iZXJOb2RlXG4gICAgICBpZiBuZXh0Tm9kZSA9IEBmaW5kTm9kZU5leHRUbyhsaW5lTnVtYmVyTm9kZSlcbiAgICAgICAgQGRvbU5vZGUuaW5zZXJ0QmVmb3JlKGxpbmVOdW1iZXJOb2RlLCBuZXh0Tm9kZSlcbiAgICAgIGVsc2VcbiAgICAgICAgQGRvbU5vZGUuYXBwZW5kQ2hpbGQobGluZU51bWJlck5vZGUpXG5cbiAgZmluZE5vZGVOZXh0VG86IChub2RlKSAtPlxuICAgIGZvciBuZXh0Tm9kZSBpbiBAZG9tTm9kZS5jaGlsZHJlblxuICAgICAgcmV0dXJuIG5leHROb2RlIGlmIEBzY3JlZW5Sb3dGb3JOb2RlKG5vZGUpIDwgQHNjcmVlblJvd0Zvck5vZGUobmV4dE5vZGUpXG4gICAgcmV0dXJuXG5cbiAgc2NyZWVuUm93Rm9yTm9kZTogKG5vZGUpIC0+IHBhcnNlSW50KG5vZGUuZGF0YXNldC5zY3JlZW5Sb3cpXG5cbiAgYnVpbGRMaW5lTnVtYmVyTm9kZTogKGxpbmVOdW1iZXJTdGF0ZSkgLT5cbiAgICB7c2NyZWVuUm93LCBidWZmZXJSb3csIHNvZnRXcmFwcGVkLCBibG9ja0RlY29yYXRpb25zSGVpZ2h0fSA9IGxpbmVOdW1iZXJTdGF0ZVxuXG4gICAgY2xhc3NOYW1lID0gQGJ1aWxkTGluZU51bWJlckNsYXNzTmFtZShsaW5lTnVtYmVyU3RhdGUpXG4gICAgbGluZU51bWJlck5vZGUgPSBAZG9tRWxlbWVudFBvb2wuYnVpbGRFbGVtZW50KFwiZGl2XCIsIGNsYXNzTmFtZSlcbiAgICBsaW5lTnVtYmVyTm9kZS5kYXRhc2V0LnNjcmVlblJvdyA9IHNjcmVlblJvd1xuICAgIGxpbmVOdW1iZXJOb2RlLmRhdGFzZXQuYnVmZmVyUm93ID0gYnVmZmVyUm93XG4gICAgbGluZU51bWJlck5vZGUuc3R5bGUubWFyZ2luVG9wID0gYmxvY2tEZWNvcmF0aW9uc0hlaWdodCArIFwicHhcIlxuXG4gICAgQHNldExpbmVOdW1iZXJJbm5lck5vZGVzKGJ1ZmZlclJvdywgc29mdFdyYXBwZWQsIGxpbmVOdW1iZXJOb2RlKVxuICAgIGxpbmVOdW1iZXJOb2RlXG5cbiAgc2V0TGluZU51bWJlcklubmVyTm9kZXM6IChidWZmZXJSb3csIHNvZnRXcmFwcGVkLCBsaW5lTnVtYmVyTm9kZSkgLT5cbiAgICBAZG9tRWxlbWVudFBvb2wuZnJlZURlc2NlbmRhbnRzKGxpbmVOdW1iZXJOb2RlKVxuXG4gICAge21heExpbmVOdW1iZXJEaWdpdHN9ID0gQG5ld1N0YXRlXG5cbiAgICBpZiBzb2Z0V3JhcHBlZFxuICAgICAgbGluZU51bWJlciA9IFwi4oCiXCJcbiAgICBlbHNlXG4gICAgICBsaW5lTnVtYmVyID0gKGJ1ZmZlclJvdyArIDEpLnRvU3RyaW5nKClcbiAgICBwYWRkaW5nID0gXy5tdWx0aXBseVN0cmluZyhcIlxcdTAwYTBcIiwgbWF4TGluZU51bWJlckRpZ2l0cyAtIGxpbmVOdW1iZXIubGVuZ3RoKVxuXG4gICAgdGV4dE5vZGUgPSBAZG9tRWxlbWVudFBvb2wuYnVpbGRUZXh0KHBhZGRpbmcgKyBsaW5lTnVtYmVyKVxuICAgIGljb25SaWdodCA9IEBkb21FbGVtZW50UG9vbC5idWlsZEVsZW1lbnQoXCJkaXZcIiwgXCJpY29uLXJpZ2h0XCIpXG5cbiAgICBsaW5lTnVtYmVyTm9kZS5hcHBlbmRDaGlsZCh0ZXh0Tm9kZSlcbiAgICBsaW5lTnVtYmVyTm9kZS5hcHBlbmRDaGlsZChpY29uUmlnaHQpXG5cbiAgdXBkYXRlTGluZU51bWJlck5vZGU6IChsaW5lTnVtYmVySWQsIG5ld0xpbmVOdW1iZXJTdGF0ZSkgLT5cbiAgICBvbGRMaW5lTnVtYmVyU3RhdGUgPSBAb2xkVGlsZVN0YXRlLmxpbmVOdW1iZXJzW2xpbmVOdW1iZXJJZF1cbiAgICBub2RlID0gQGxpbmVOdW1iZXJOb2Rlc0J5SWRbbGluZU51bWJlcklkXVxuXG4gICAgdW5sZXNzIG9sZExpbmVOdW1iZXJTdGF0ZS5mb2xkYWJsZSBpcyBuZXdMaW5lTnVtYmVyU3RhdGUuZm9sZGFibGUgYW5kIF8uaXNFcXVhbChvbGRMaW5lTnVtYmVyU3RhdGUuZGVjb3JhdGlvbkNsYXNzZXMsIG5ld0xpbmVOdW1iZXJTdGF0ZS5kZWNvcmF0aW9uQ2xhc3NlcylcbiAgICAgIG5vZGUuY2xhc3NOYW1lID0gQGJ1aWxkTGluZU51bWJlckNsYXNzTmFtZShuZXdMaW5lTnVtYmVyU3RhdGUpXG4gICAgICBvbGRMaW5lTnVtYmVyU3RhdGUuZm9sZGFibGUgPSBuZXdMaW5lTnVtYmVyU3RhdGUuZm9sZGFibGVcbiAgICAgIG9sZExpbmVOdW1iZXJTdGF0ZS5kZWNvcmF0aW9uQ2xhc3NlcyA9IF8uY2xvbmUobmV3TGluZU51bWJlclN0YXRlLmRlY29yYXRpb25DbGFzc2VzKVxuXG4gICAgdW5sZXNzIG9sZExpbmVOdW1iZXJTdGF0ZS5zY3JlZW5Sb3cgaXMgbmV3TGluZU51bWJlclN0YXRlLnNjcmVlblJvdyBhbmQgb2xkTGluZU51bWJlclN0YXRlLmJ1ZmZlclJvdyBpcyBuZXdMaW5lTnVtYmVyU3RhdGUuYnVmZmVyUm93XG4gICAgICBAc2V0TGluZU51bWJlcklubmVyTm9kZXMobmV3TGluZU51bWJlclN0YXRlLmJ1ZmZlclJvdywgbmV3TGluZU51bWJlclN0YXRlLnNvZnRXcmFwcGVkLCBub2RlKVxuICAgICAgbm9kZS5kYXRhc2V0LnNjcmVlblJvdyA9IG5ld0xpbmVOdW1iZXJTdGF0ZS5zY3JlZW5Sb3dcbiAgICAgIG5vZGUuZGF0YXNldC5idWZmZXJSb3cgPSBuZXdMaW5lTnVtYmVyU3RhdGUuYnVmZmVyUm93XG4gICAgICBvbGRMaW5lTnVtYmVyU3RhdGUuc2NyZWVuUm93ID0gbmV3TGluZU51bWJlclN0YXRlLnNjcmVlblJvd1xuICAgICAgb2xkTGluZU51bWJlclN0YXRlLmJ1ZmZlclJvdyA9IG5ld0xpbmVOdW1iZXJTdGF0ZS5idWZmZXJSb3dcblxuICAgIHVubGVzcyBvbGRMaW5lTnVtYmVyU3RhdGUuYmxvY2tEZWNvcmF0aW9uc0hlaWdodCBpcyBuZXdMaW5lTnVtYmVyU3RhdGUuYmxvY2tEZWNvcmF0aW9uc0hlaWdodFxuICAgICAgbm9kZS5zdHlsZS5tYXJnaW5Ub3AgPSBuZXdMaW5lTnVtYmVyU3RhdGUuYmxvY2tEZWNvcmF0aW9uc0hlaWdodCArIFwicHhcIlxuICAgICAgb2xkTGluZU51bWJlclN0YXRlLmJsb2NrRGVjb3JhdGlvbnNIZWlnaHQgPSBuZXdMaW5lTnVtYmVyU3RhdGUuYmxvY2tEZWNvcmF0aW9uc0hlaWdodFxuXG4gIGJ1aWxkTGluZU51bWJlckNsYXNzTmFtZTogKHtidWZmZXJSb3csIGZvbGRhYmxlLCBkZWNvcmF0aW9uQ2xhc3Nlcywgc29mdFdyYXBwZWR9KSAtPlxuICAgIGNsYXNzTmFtZSA9IFwibGluZS1udW1iZXJcIlxuICAgIGNsYXNzTmFtZSArPSBcIiBcIiArIGRlY29yYXRpb25DbGFzc2VzLmpvaW4oJyAnKSBpZiBkZWNvcmF0aW9uQ2xhc3Nlcz9cbiAgICBjbGFzc05hbWUgKz0gXCIgZm9sZGFibGVcIiBpZiBmb2xkYWJsZSBhbmQgbm90IHNvZnRXcmFwcGVkXG4gICAgY2xhc3NOYW1lXG5cbiAgbGluZU51bWJlck5vZGVGb3JTY3JlZW5Sb3c6IChzY3JlZW5Sb3cpIC0+XG4gICAgZm9yIGlkLCBsaW5lTnVtYmVyU3RhdGUgb2YgQG9sZFRpbGVTdGF0ZS5saW5lTnVtYmVyc1xuICAgICAgaWYgbGluZU51bWJlclN0YXRlLnNjcmVlblJvdyBpcyBzY3JlZW5Sb3dcbiAgICAgICAgcmV0dXJuIEBsaW5lTnVtYmVyTm9kZXNCeUlkW2lkXVxuICAgIG51bGxcbiJdfQ==
