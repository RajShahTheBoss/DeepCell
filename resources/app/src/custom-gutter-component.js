(function() {
  var CustomGutterComponent, setDimensionsAndBackground;

  module.exports = CustomGutterComponent = (function() {
    function CustomGutterComponent(arg) {
      this.gutter = arg.gutter, this.views = arg.views;
      this.decorationNodesById = {};
      this.decorationItemsById = {};
      this.visible = true;
      this.domNode = this.gutter.getElement();
      this.decorationsNode = this.domNode.firstChild;
      this.decorationsNode.innerHTML = '';
    }

    CustomGutterComponent.prototype.getDomNode = function() {
      return this.domNode;
    };

    CustomGutterComponent.prototype.hideNode = function() {
      if (this.visible) {
        this.domNode.style.display = 'none';
        return this.visible = false;
      }
    };

    CustomGutterComponent.prototype.showNode = function() {
      if (!this.visible) {
        this.domNode.style.removeProperty('display');
        return this.visible = true;
      }
    };

    CustomGutterComponent.prototype.updateSync = function(state) {
      var decorationId, decorationInfo, decorationNode, decorationState, existingDecoration, newNode, ref, results, updatedDecorationIds;
      if (this.oldDimensionsAndBackgroundState == null) {
        this.oldDimensionsAndBackgroundState = {};
      }
      setDimensionsAndBackground(this.oldDimensionsAndBackgroundState, state.styles, this.decorationsNode);
      if (this.oldDecorationPositionState == null) {
        this.oldDecorationPositionState = {};
      }
      decorationState = state.content;
      updatedDecorationIds = new Set;
      for (decorationId in decorationState) {
        decorationInfo = decorationState[decorationId];
        updatedDecorationIds.add(decorationId);
        existingDecoration = this.decorationNodesById[decorationId];
        if (existingDecoration) {
          this.updateDecorationNode(existingDecoration, decorationId, decorationInfo);
        } else {
          newNode = this.buildDecorationNode(decorationId, decorationInfo);
          this.decorationNodesById[decorationId] = newNode;
          this.decorationsNode.appendChild(newNode);
        }
      }
      ref = this.decorationNodesById;
      results = [];
      for (decorationId in ref) {
        decorationNode = ref[decorationId];
        if (!updatedDecorationIds.has(decorationId)) {
          decorationNode.remove();
          delete this.decorationNodesById[decorationId];
          delete this.decorationItemsById[decorationId];
          results.push(delete this.oldDecorationPositionState[decorationId]);
        } else {
          results.push(void 0);
        }
      }
      return results;
    };


    /*
    Section: Private Methods
     */

    CustomGutterComponent.prototype.buildDecorationNode = function(decorationId, decorationInfo) {
      var newNode;
      this.oldDecorationPositionState[decorationId] = {};
      newNode = document.createElement('div');
      newNode.style.position = 'absolute';
      this.updateDecorationNode(newNode, decorationId, decorationInfo);
      return newNode;
    };

    CustomGutterComponent.prototype.updateDecorationNode = function(node, decorationId, newDecorationInfo) {
      var oldPositionState;
      oldPositionState = this.oldDecorationPositionState[decorationId];
      if (oldPositionState.top !== newDecorationInfo.top + 'px') {
        node.style.top = newDecorationInfo.top + 'px';
        oldPositionState.top = newDecorationInfo.top + 'px';
      }
      if (oldPositionState.height !== newDecorationInfo.height + 'px') {
        node.style.height = newDecorationInfo.height + 'px';
        oldPositionState.height = newDecorationInfo.height + 'px';
      }
      if (newDecorationInfo["class"] && !node.classList.contains(newDecorationInfo["class"])) {
        node.className = 'decoration';
        node.classList.add(newDecorationInfo["class"]);
      } else if (!newDecorationInfo["class"]) {
        node.className = 'decoration';
      }
      return this.setDecorationItem(newDecorationInfo.item, newDecorationInfo.height, decorationId, node);
    };

    CustomGutterComponent.prototype.setDecorationItem = function(newItem, decorationHeight, decorationId, decorationNode) {
      var newItemNode;
      if (newItem !== this.decorationItemsById[decorationId]) {
        while (decorationNode.firstChild) {
          decorationNode.removeChild(decorationNode.firstChild);
        }
        delete this.decorationItemsById[decorationId];
        if (newItem) {
          newItemNode = null;
          if (newItem instanceof HTMLElement) {
            newItemNode = newItem;
          } else {
            newItemNode = newItem.element;
          }
          newItemNode.style.height = decorationHeight + 'px';
          decorationNode.appendChild(newItemNode);
          return this.decorationItemsById[decorationId] = newItem;
        }
      }
    };

    return CustomGutterComponent;

  })();

  setDimensionsAndBackground = function(oldState, newState, domNode) {
    if (newState.scrollHeight !== oldState.scrollHeight) {
      domNode.style.height = newState.scrollHeight + 'px';
      oldState.scrollHeight = newState.scrollHeight;
    }
    if (newState.scrollTop !== oldState.scrollTop) {
      domNode.style['-webkit-transform'] = "translate3d(0px, " + (-newState.scrollTop) + "px, 0px)";
      oldState.scrollTop = newState.scrollTop;
    }
    if (newState.backgroundColor !== oldState.backgroundColor) {
      domNode.style.backgroundColor = newState.backgroundColor;
      return oldState.backgroundColor = newState.backgroundColor;
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2N1c3RvbS1ndXR0ZXItY29tcG9uZW50LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQTtBQUFBLE1BQUE7O0VBQUEsTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNTLCtCQUFDLEdBQUQ7TUFBRSxJQUFDLENBQUEsYUFBQSxRQUFRLElBQUMsQ0FBQSxZQUFBO01BQ3ZCLElBQUMsQ0FBQSxtQkFBRCxHQUF1QjtNQUN2QixJQUFDLENBQUEsbUJBQUQsR0FBdUI7TUFDdkIsSUFBQyxDQUFBLE9BQUQsR0FBVztNQUVYLElBQUMsQ0FBQSxPQUFELEdBQVcsSUFBQyxDQUFBLE1BQU0sQ0FBQyxVQUFSLENBQUE7TUFDWCxJQUFDLENBQUEsZUFBRCxHQUFtQixJQUFDLENBQUEsT0FBTyxDQUFDO01BRTVCLElBQUMsQ0FBQSxlQUFlLENBQUMsU0FBakIsR0FBNkI7SUFSbEI7O29DQVViLFVBQUEsR0FBWSxTQUFBO2FBQ1YsSUFBQyxDQUFBO0lBRFM7O29DQUdaLFFBQUEsR0FBVSxTQUFBO01BQ1IsSUFBRyxJQUFDLENBQUEsT0FBSjtRQUNFLElBQUMsQ0FBQSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQWYsR0FBeUI7ZUFDekIsSUFBQyxDQUFBLE9BQUQsR0FBVyxNQUZiOztJQURROztvQ0FLVixRQUFBLEdBQVUsU0FBQTtNQUNSLElBQUcsQ0FBSSxJQUFDLENBQUEsT0FBUjtRQUNFLElBQUMsQ0FBQSxPQUFPLENBQUMsS0FBSyxDQUFDLGNBQWYsQ0FBOEIsU0FBOUI7ZUFDQSxJQUFDLENBQUEsT0FBRCxHQUFXLEtBRmI7O0lBRFE7O29DQU9WLFVBQUEsR0FBWSxTQUFDLEtBQUQ7QUFDVixVQUFBOztRQUFBLElBQUMsQ0FBQSxrQ0FBbUM7O01BQ3BDLDBCQUFBLENBQTJCLElBQUMsQ0FBQSwrQkFBNUIsRUFBNkQsS0FBSyxDQUFDLE1BQW5FLEVB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S0FBOEIsUUFBUSxDQUFDLGVBQTFDO01BQ0UsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFkLEdBQWdDLFFBQVEsQ0FBQzthQUN6QyxRQUFRLENBQUMsZUFBVCxHQUEyQixRQUFRLENBQUMsZ0JBRnRDOztFQVQyQjtBQXhHN0IiLCJzb3VyY2VzQ29udGVudCI6WyIjIFRoaXMgY2xhc3MgcmVwcmVzZW50cyBhIGd1dHRlciBvdGhlciB0aGFuIHRoZSAnbGluZS1udW1iZXJzJyBndXR0ZXIuXG4jIFRoZSBjb250ZW50cyBvZiB0aGlzIGd1dHRlciBtYXkgYmUgc3BlY2lmaWVkIGJ5IERlY29yYXRpb25zLlxuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBDdXN0b21HdXR0ZXJDb21wb25lbnRcbiAgY29uc3RydWN0b3I6ICh7QGd1dHRlciwgQHZpZXdzfSkgLT5cbiAgICBAZGVjb3JhdGlvbk5vZGVzQnlJZCA9IHt9XG4gICAgQGRlY29yYXRpb25JdGVtc0J5SWQgPSB7fVxuICAgIEB2aXNpYmxlID0gdHJ1ZVxuXG4gICAgQGRvbU5vZGUgPSBAZ3V0dGVyLmdldEVsZW1lbnQoKVxuICAgIEBkZWNvcmF0aW9uc05vZGUgPSBAZG9tTm9kZS5maXJzdENoaWxkXG4gICAgIyBDbGVhciB0aGUgY29udGVudHMgaW4gY2FzZSB0aGUgZG9tTm9kZSBpcyBiZWluZyByZXVzZWQuXG4gICAgQGRlY29yYXRpb25zTm9kZS5pbm5lckhUTUwgPSAnJ1xuXG4gIGdldERvbU5vZGU6IC0+XG4gICAgQGRvbU5vZGVcblxuICBoaWRlTm9kZTogLT5cbiAgICBpZiBAdmlzaWJsZVxuICAgICAgQGRvbU5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICAgICAgQHZpc2libGUgPSBmYWxzZVxuXG4gIHNob3dOb2RlOiAtPlxuICAgIGlmIG5vdCBAdmlzaWJsZVxuICAgICAgQGRvbU5vZGUuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ2Rpc3BsYXknKVxuICAgICAgQHZpc2libGUgPSB0cnVlXG5cbiAgIyBgc3RhdGVgIGlzIGEgc3Vic2V0IG9mIHRoZSBUZXh0RWRpdG9yUHJlc2VudGVyIHN0YXRlIHRoYXQgaXMgc3BlY2lmaWNcbiAgIyB0byB0aGlzIGxpbmUgbnVtYmVyIGd1dHRlci5cbiAgdXBkYXRlU3luYzogKHN0YXRlKSAtPlxuICAgIEBvbGREaW1lbnNpb25zQW5kQmFja2dyb3VuZFN0YXRlID89IHt9XG4gICAgc2V0RGltZW5zaW9uc0FuZEJhY2tncm91bmQoQG9sZERpbWVuc2lvbnNBbmRCYWNrZ3JvdW5kU3RhdGUsIHN0YXRlLnN0eWxlcywgQGRlY29yYXRpb25zTm9kZSlcblxuICAgIEBvbGREZWNvcmF0aW9uUG9zaXRpb25TdGF0ZSA/PSB7fVxuICAgIGRlY29yYXRpb25TdGF0ZSA9IHN0YXRlLmNvbnRlbnRcblxuICAgIHVwZGF0ZWREZWNvcmF0aW9uSWRzID0gbmV3IFNldFxuICAgIGZvciBkZWNvcmF0aW9uSWQsIGRlY29yYXRpb25JbmZvIG9mIGRlY29yYXRpb25TdGF0ZVxuICAgICAgdXBkYXRlZERlY29yYXRpb25JZHMuYWRkKGRlY29yYXRpb25JZClcbiAgICAgIGV4aXN0aW5nRGVjb3JhdGlvbiA9IEBkZWNvcmF0aW9uTm9kZXNCeUlkW2RlY29yYXRpb25JZF1cbiAgICAgIGlmIGV4aXN0aW5nRGVjb3JhdGlvblxuICAgICAgICBAdXBkYXRlRGVjb3JhdGlvbk5vZGUoZXhpc3RpbmdEZWNvcmF0aW9uLCBkZWNvcmF0aW9uSWQsIGRlY29yYXRpb25JbmZvKVxuICAgICAgZWxzZVxuICAgICAgICBuZXdOb2RlID0gQGJ1aWxkRGVjb3JhdGlvbk5vZGUoZGVjb3JhdGlvbklkLCBkZWNvcmF0aW9uSW5mbylcbiAgICAgICAgQGRlY29yYXRpb25Ob2Rlc0J5SWRbZGVjb3JhdGlvbklkXSA9IG5ld05vZGVcbiAgICAgICAgQGRlY29yYXRpb25zTm9kZS5hcHBlbmRDaGlsZChuZXdOb2RlKVxuXG4gICAgZm9yIGRlY29yYXRpb25JZCwgZGVjb3JhdGlvbk5vZGUgb2YgQGRlY29yYXRpb25Ob2Rlc0J5SWRcbiAgICAgIGlmIG5vdCB1cGRhdGVkRGVjb3JhdGlvbklkcy5oYXMoZGVjb3JhdGlvbklkKVxuICAgICAgICBkZWNvcmF0aW9uTm9kZS5yZW1vdmUoKVxuICAgICAgICBkZWxldGUgQGRlY29yYXRpb25Ob2Rlc0J5SWRbZGVjb3JhdGlvbklkXVxuICAgICAgICBkZWxldGUgQGRlY29yYXRpb25JdGVtc0J5SWRbZGVjb3JhdGlvbklkXVxuICAgICAgICBkZWxldGUgQG9sZERlY29yYXRpb25Qb3NpdGlvblN0YXRlW2RlY29yYXRpb25JZF1cblxuICAjIyNcbiAgU2VjdGlvbjogUHJpdmF0ZSBNZXRob2RzXG4gICMjI1xuXG4gICMgQnVpbGRzIGFuZCByZXR1cm5zIGFuIEhUTUxFbGVtZW50IHRvIHJlcHJlc2VudCB0aGUgc3BlY2lmaWVkIGRlY29yYXRpb24uXG4gIGJ1aWxkRGVjb3JhdGlvbk5vZGU6IChkZWNvcmF0aW9uSWQsIGRlY29yYXRpb25JbmZvKSAtPlxuICAgIEBvbGREZWNvcmF0aW9uUG9zaXRpb25TdGF0ZVtkZWNvcmF0aW9uSWRdID0ge31cbiAgICBuZXdOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICBuZXdOb2RlLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJ1xuICAgIEB1cGRhdGVEZWNvcmF0aW9uTm9kZShuZXdOb2RlLCBkZWNvcmF0aW9uSWQsIGRlY29yYXRpb25JbmZvKVxuICAgIG5ld05vZGVcblxuICAjIFVwZGF0ZXMgdGhlIGV4aXN0aW5nIEhUTUxOb2RlIHdpdGggdGhlIG5ldyBkZWNvcmF0aW9uIGluZm8uIEF0dGVtcHRzIHRvXG4gICMgbWluaW1pemUgY2hhbmdlcyB0byB0aGUgRE9NLlxuICB1cGRhdGVEZWNvcmF0aW9uTm9kZTogKG5vZGUsIGRlY29yYXRpb25JZCwgbmV3RGVjb3JhdGlvbkluZm8pIC0+XG4gICAgb2xkUG9zaXRpb25TdGF0ZSA9IEBvbGREZWNvcmF0aW9uUG9zaXRpb25TdGF0ZVtkZWNvcmF0aW9uSWRdXG5cbiAgICBpZiBvbGRQb3NpdGlvblN0YXRlLnRvcCBpc250IG5ld0RlY29yYXRpb25JbmZvLnRvcCArICdweCdcbiAgICAgIG5vZGUuc3R5bGUudG9wID0gbmV3RGVjb3JhdGlvbkluZm8udG9wICsgJ3B4J1xuICAgICAgb2xkUG9zaXRpb25TdGF0ZS50b3AgPSBuZXdEZWNvcmF0aW9uSW5mby50b3AgKyAncHgnXG5cbiAgICBpZiBvbGRQb3NpdGlvblN0YXRlLmhlaWdodCBpc250IG5ld0RlY29yYXRpb25JbmZvLmhlaWdodCArICdweCdcbiAgICAgIG5vZGUuc3R5bGUuaGVpZ2h0ID0gbmV3RGVjb3JhdGlvbkluZm8uaGVpZ2h0ICsgJ3B4J1xuICAgICAgb2xkUG9zaXRpb25TdGF0ZS5oZWlnaHQgPSBuZXdEZWNvcmF0aW9uSW5mby5oZWlnaHQgKyAncHgnXG5cbiAgICBpZiBuZXdEZWNvcmF0aW9uSW5mby5jbGFzcyBhbmQgbm90IG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKG5ld0RlY29yYXRpb25JbmZvLmNsYXNzKVxuICAgICAgbm9kZS5jbGFzc05hbWUgPSAnZGVjb3JhdGlvbidcbiAgICAgIG5vZGUuY2xhc3NMaXN0LmFkZChuZXdEZWNvcmF0aW9uSW5mby5jbGFzcylcbiAgICBlbHNlIGlmIG5vdCBuZXdEZWNvcmF0aW9uSW5mby5jbGFzc1xuICAgICAgbm9kZS5jbGFzc05hbWUgPSAnZGVjb3JhdGlvbidcblxuICAgIEBzZXREZWNvcmF0aW9uSXRlbShuZXdEZWNvcmF0aW9uSW5mby5pdGVtLCBuZXdEZWNvcmF0aW9uSW5mby5oZWlnaHQsIGRlY29yYXRpb25JZCwgbm9kZSlcblxuICAjIFNldHMgdGhlIGRlY29yYXRpb25JdGVtIG9uIHRoZSBkZWNvcmF0aW9uTm9kZS5cbiAgIyBJZiBgZGVjb3JhdGlvbkl0ZW1gIGlzIHVuZGVmaW5lZCwgdGhlIGRlY29yYXRpb25Ob2RlJ3MgY2hpbGQgaXRlbSB3aWxsIGJlIGNsZWFyZWQuXG4gIHNldERlY29yYXRpb25JdGVtOiAobmV3SXRlbSwgZGVjb3JhdGlvbkhlaWdodCwgZGVjb3JhdGlvbklkLCBkZWNvcmF0aW9uTm9kZSkgLT5cbiAgICBpZiBuZXdJdGVtIGlzbnQgQGRlY29yYXRpb25JdGVtc0J5SWRbZGVjb3JhdGlvbklkXVxuICAgICAgd2hpbGUgZGVjb3JhdGlvbk5vZGUuZmlyc3RDaGlsZFxuICAgICAgICBkZWNvcmF0aW9uTm9kZS5yZW1vdmVDaGlsZChkZWNvcmF0aW9uTm9kZS5maXJzdENoaWxkKVxuICAgICAgZGVsZXRlIEBkZWNvcmF0aW9uSXRlbXNCeUlkW2RlY29yYXRpb25JZF1cblxuICAgICAgaWYgbmV3SXRlbVxuICAgICAgICBuZXdJdGVtTm9kZSA9IG51bGxcbiAgICAgICAgaWYgbmV3SXRlbSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50XG4gICAgICAgICAgbmV3SXRlbU5vZGUgPSBuZXdJdGVtXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBuZXdJdGVtTm9kZSA9IG5ld0l0ZW0uZWxlbWVudFxuXG4gICAgICAgIG5ld0l0ZW1Ob2RlLnN0eWxlLmhlaWdodCA9IGRlY29yYXRpb25IZWlnaHQgKyAncHgnXG4gICAgICAgIGRlY29yYXRpb25Ob2RlLmFwcGVuZENoaWxkKG5ld0l0ZW1Ob2RlKVxuICAgICAgICBAZGVjb3JhdGlvbkl0ZW1zQnlJZFtkZWNvcmF0aW9uSWRdID0gbmV3SXRlbVxuXG5zZXREaW1lbnNpb25zQW5kQmFja2dyb3VuZCA9IChvbGRTdGF0ZSwgbmV3U3RhdGUsIGRvbU5vZGUpIC0+XG4gIGlmIG5ld1N0YXRlLnNjcm9sbEhlaWdodCBpc250IG9sZFN0YXRlLnNjcm9sbEhlaWdodFxuICAgIGRvbU5vZGUuc3R5bGUuaGVpZ2h0ID0gbmV3U3RhdGUuc2Nyb2xsSGVpZ2h0ICsgJ3B4J1xuICAgIG9sZFN0YXRlLnNjcm9sbEhlaWdodCA9IG5ld1N0YXRlLnNjcm9sbEhlaWdodFxuXG4gIGlmIG5ld1N0YXRlLnNjcm9sbFRvcCBpc250IG9sZFN0YXRlLnNjcm9sbFRvcFxuICAgIGRvbU5vZGUuc3R5bGVbJy13ZWJraXQtdHJhbnNmb3JtJ10gPSBcInRyYW5zbGF0ZTNkKDBweCwgI3stbmV3U3RhdGUuc2Nyb2xsVG9wfXB4LCAwcHgpXCJcbiAgICBvbGRTdGF0ZS5zY3JvbGxUb3AgPSBuZXdTdGF0ZS5zY3JvbGxUb3BcblxuICBpZiBuZXdTdGF0ZS5iYWNrZ3JvdW5kQ29sb3IgaXNudCBvbGRTdGF0ZS5iYWNrZ3JvdW5kQ29sb3JcbiAgICBkb21Ob2RlLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IG5ld1N0YXRlLmJhY2tncm91bmRDb2xvclxuICAgIG9sZFN0YXRlLmJhY2tncm91bmRDb2xvciA9IG5ld1N0YXRlLmJhY2tncm91bmRDb2xvclxuIl19
