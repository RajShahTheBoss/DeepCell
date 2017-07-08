(function() {
  var CursorsComponent;

  module.exports = CursorsComponent = (function() {
    CursorsComponent.prototype.oldState = null;

    function CursorsComponent() {
      this.cursorNodesById = {};
      this.domNode = document.createElement('div');
      this.domNode.classList.add('cursors');
    }

    CursorsComponent.prototype.getDomNode = function() {
      return this.domNode;
    };

    CursorsComponent.prototype.updateSync = function(state) {
      var cursorNode, cursorState, id, newState, ref;
      newState = state.content;
      if (this.oldState == null) {
        this.oldState = {
          cursors: {}
        };
      }
      if (newState.cursorsVisible !== this.oldState.cursorsVisible) {
        if (newState.cursorsVisible) {
          this.domNode.classList.remove('blink-off');
        } else {
          this.domNode.classList.add('blink-off');
        }
        this.oldState.cursorsVisible = newState.cursorsVisible;
      }
      for (id in this.oldState.cursors) {
        if (newState.cursors[id] == null) {
          this.cursorNodesById[id].remove();
          delete this.cursorNodesById[id];
          delete this.oldState.cursors[id];
        }
      }
      ref = newState.cursors;
      for (id in ref) {
        cursorState = ref[id];
        if (this.oldState.cursors[id] == null) {
          cursorNode = document.createElement('div');
          cursorNode.classList.add('cursor');
          this.cursorNodesById[id] = cursorNode;
          this.domNode.appendChild(cursorNode);
        }
        this.updateCursorNode(id, cursorState);
      }
    };

    CursorsComponent.prototype.updateCursorNode = function(id, newCursorState) {
      var base, cursorNode, oldCursorState;
      cursorNode = this.cursorNodesById[id];
      oldCursorState = ((base = this.oldState.cursors)[id] != null ? base[id] : base[id] = {});
      if (newCursorState.top !== oldCursorState.top || newCursorState.left !== oldCursorState.left) {
        cursorNode.style['-webkit-transform'] = "translate(" + newCursorState.left + "px, " + newCursorState.top + "px)";
        oldCursorState.top = newCursorState.top;
        oldCursorState.left = newCursorState.left;
      }
      if (newCursorState.height !== oldCursorState.height) {
        cursorNode.style.height = newCursorState.height + 'px';
        oldCursorState.height = newCursorState.height;
      }
      if (newCursorState.width !== oldCursorState.width) {
        cursorNode.style.width = newCursorState.width + 'px';
        return oldCursorState.width = newCursorState.width;
      }
    };

    return CursorsComponent;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2N1cnNvcnMtY29tcG9uZW50LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsTUFBTSxDQUFDLE9BQVAsR0FDTTsrQkFDSixRQUFBLEdBQVU7O0lBRUcsMEJBQUE7TUFDWCxJQUFDLENBQUEsZUFBRCxHQUFtQjtNQUNuQixJQUFDLENBQUEsT0FBRCxHQUFXLFFBQVEsQ0FBQyxhQUFULENBQXVCLEtBQXZCO01BQ1gsSUFBQyxDQUFBLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBbkIsQ0FBdUIsU0FBdkI7SUFIVzs7K0JBS2IsVUFBQSxHQUFZLFNBQUE7YUFDVixJQUFDLENBQUE7SUFEUzs7K0JBR1osVUFBQSxHQUFZLFNBQUMsS0FBRDtBQUNWLFVBQUE7TUFBQSxRQUFBLEdBQVcsS0FBSyxDQUFDOztRQUNqQixJQUFDLENBQUEsV0FBWTtVQUFDLE9BQUEsRUFBUyxFQUFWOzs7TUFHYixJQUFHLFFBQVEsQ0FBQyxjQUFULEtBQTZCLElBQUMsQ0FBQSxRQUFRLENBQUMsY0FBMUM7UUFDRSxJQUFHLFFBQVEsQ0FBQyxjQUFaO1VBQ0UsSUFBQyxDQUFBLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBbkIsQ0FBMEIsV0FBMUIsRUFERjtTQUFBLE1BQUE7VUFHRSxJQUFDLENBQUEsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFuQixDQUF1QixXQUF2QixFQUhGOztRQUlBLElBQUMsQ0FBQSxRQUFRLENBQUMsY0FBVixHQUEyQixRQUFRLENBQUMsZUFMdEM7O0FBUUEsV0FBQSwyQkFBQTtRQUNFLElBQU8sNEJBQVA7VUFDRSxJQUFDLENBQUEsZUFBZ0IsQ0FBQSxFQUFBLENBQUcsQ0FBQyxNQUFyQixDQUFBO1VBQ0EsT0FBTyxJQUFDLENBQUEsZUFBZ0IsQ0FBQSxFQUFBO1VBQ3hCLE9BQU8sSUFBQyxDQUFBLFFBQVEsQ0FBQyxPQUFRLENBQUEsRUFBQSxFQUgzQjs7QUFERjtBQU9BO0FBQUEsV0FBQSxTQUFBOztRQUNFLElBQU8saUNBQVA7VUFDRSxVQUFBLEdBQWEsUUFBUSxDQUFDLGFBQVQsQ0FBdUIsS0FBdkI7VUFDYixVQUFVLENBQUMsU0FBUyxDQUFDLEdBQXJCLENBQXlCLFFBQXpCO1VBQ0EsSUFBQyxDQUFBLGVBQWdCLENBQUEsRUFBQSxDQUFqQixHQUF1QjtVQUN2QixJQUFDLENBQUEsT0FBTyxDQUFDLFdBQVQsQ0FBcUIsVUFBckIsRUFKRjs7UUFLQSxJQUFDLENBQUEsZ0JBQUQsQ0FBa0IsRUFBbEIsRUFBc0IsV0FBdEI7QUFORjtJQXBCVTs7K0JBOEJaLGdCQUFBLEdBQWtCLFNBQUMsRUFBRCxFQUFLLGNBQUw7QUFDaEIsVUFBQTtNQUFBLFVBQUEsR0FBYSxJQUFDLENBQUEsZUFBZ0IsQ0FBQSxFQUFBO01BQzlCLGNBQUEsR0FBaUIsa0RBQW1CLENBQUEsRUFBQSxRQUFBLENBQUEsRUFBQSxJQUFPLEVBQTFCO01BRWpCLElBQUcsY0FBYyxDQUFDLEdBQWYsS0FBd0IsY0FBYyxDQUFDLEdBQXZDLElBQThDLGNBQWMsQ0FBQyxJQUFmLEtBQXlCLGNBQWMsQ0FBQyxJQUF6RjtRQUNFLFVBQVUsQ0FBQyxLQUFNLENBQUEsbUJBQUEsQ0FBakIsR0FBd0MsWUFBQSxHQUFhLGNBQWMsQ0FBQyxJQUE1QixHQUFpQyxNQUFqQyxHQUF1QyxjQUFjLENBQUMsR0FBdEQsR0FBMEQ7UUFDbEcsY0FBYyxDQUFDLEdBQWYsR0FBcUIsY0FBYyxDQUFDO1FBQ3BDLGNBQWMsQ0FBQyxJQUFmLEdBQXNCLGNBQWMsQ0FBQyxLQUh2Qzs7TUFLQSxJQUFHLGNBQWMsQ0FBQyxNQUFmLEtBQTJCLGNBQWMsQ0FBQyxNQUE3QztRQUNFLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBakIsR0FBMEIsY0FBYyxDQUFDLE1BQWYsR0FBd0I7UUFDbEQsY0FBYyxDQUFDLE1BQWYsR0FBd0IsY0FBYyxDQUFDLE9BRnpDOztNQUlBLElBQUcsY0FBYyxDQUFDLEtBQWYsS0FBMEIsY0FBYyxDQUFDLEtBQTVDO1FBQ0UsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFqQixHQUF5QixjQUFjLENBQUMsS0FBZixHQUF1QjtlQUNoRCxjQUFjLENBQUMsS0FBZixHQUF1QixjQUFjLENBQUMsTUFGeEM7O0lBYmdCOzs7OztBQTFDcEIiLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBDdXJzb3JzQ29tcG9uZW50XG4gIG9sZFN0YXRlOiBudWxsXG5cbiAgY29uc3RydWN0b3I6IC0+XG4gICAgQGN1cnNvck5vZGVzQnlJZCA9IHt9XG4gICAgQGRvbU5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgIEBkb21Ob2RlLmNsYXNzTGlzdC5hZGQoJ2N1cnNvcnMnKVxuXG4gIGdldERvbU5vZGU6IC0+XG4gICAgQGRvbU5vZGVcblxuICB1cGRhdGVTeW5jOiAoc3RhdGUpIC0+XG4gICAgbmV3U3RhdGUgPSBzdGF0ZS5jb250ZW50XG4gICAgQG9sZFN0YXRlID89IHtjdXJzb3JzOiB7fX1cblxuICAgICMgdXBkYXRlIGJsaW5rIGNsYXNzXG4gICAgaWYgbmV3U3RhdGUuY3Vyc29yc1Zpc2libGUgaXNudCBAb2xkU3RhdGUuY3Vyc29yc1Zpc2libGVcbiAgICAgIGlmIG5ld1N0YXRlLmN1cnNvcnNWaXNpYmxlXG4gICAgICAgIEBkb21Ob2RlLmNsYXNzTGlzdC5yZW1vdmUgJ2JsaW5rLW9mZidcbiAgICAgIGVsc2VcbiAgICAgICAgQGRvbU5vZGUuY2xhc3NMaXN0LmFkZCAnYmxpbmstb2ZmJ1xuICAgICAgQG9sZFN0YXRlLmN1cnNvcnNWaXNpYmxlID0gbmV3U3RhdGUuY3Vyc29yc1Zpc2libGVcblxuICAgICMgcmVtb3ZlIGN1cnNvcnNcbiAgICBmb3IgaWQgb2YgQG9sZFN0YXRlLmN1cnNvcnNcbiAgICAgIHVubGVzcyBuZXdTdGF0ZS5jdXJzb3JzW2lkXT9cbiAgICAgICAgQGN1cnNvck5vZGVzQnlJZFtpZF0ucmVtb3ZlKClcbiAgICAgICAgZGVsZXRlIEBjdXJzb3JOb2Rlc0J5SWRbaWRdXG4gICAgICAgIGRlbGV0ZSBAb2xkU3RhdGUuY3Vyc29yc1tpZF1cblxuICAgICMgYWRkIG9yIHVwZGF0ZSBjdXJzb3JzXG4gICAgZm9yIGlkLCBjdXJzb3JTdGF0ZSBvZiBuZXdTdGF0ZS5jdXJzb3JzXG4gICAgICB1bmxlc3MgQG9sZFN0YXRlLmN1cnNvcnNbaWRdP1xuICAgICAgICBjdXJzb3JOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgICAgY3Vyc29yTm9kZS5jbGFzc0xpc3QuYWRkKCdjdXJzb3InKVxuICAgICAgICBAY3Vyc29yTm9kZXNCeUlkW2lkXSA9IGN1cnNvck5vZGVcbiAgICAgICAgQGRvbU5vZGUuYXBwZW5kQ2hpbGQoY3Vyc29yTm9kZSlcbiAgICAgIEB1cGRhdGVDdXJzb3JOb2RlKGlkLCBjdXJzb3JTdGF0ZSlcblxuICAgIHJldHVyblxuXG4gIHVwZGF0ZUN1cnNvck5vZGU6IChpZCwgbmV3Q3Vyc29yU3RhdGUpIC0+XG4gICAgY3Vyc29yTm9kZSA9IEBjdXJzb3JOb2Rlc0J5SWRbaWRdXG4gICAgb2xkQ3Vyc29yU3RhdGUgPSAoQG9sZFN0YXRlLmN1cnNvcnNbaWRdID89IHt9KVxuXG4gICAgaWYgbmV3Q3Vyc29yU3RhdGUudG9wIGlzbnQgb2xkQ3Vyc29yU3RhdGUudG9wIG9yIG5ld0N1cnNvclN0YXRlLmxlZnQgaXNudCBvbGRDdXJzb3JTdGF0ZS5sZWZ0XG4gICAgICBjdXJzb3JOb2RlLnN0eWxlWyctd2Via2l0LXRyYW5zZm9ybSddID0gXCJ0cmFuc2xhdGUoI3tuZXdDdXJzb3JTdGF0ZS5sZWZ0fXB4LCAje25ld0N1cnNvclN0YXRlLnRvcH1weClcIlxuICAgICAgb2xkQ3Vyc29yU3RhdGUudG9wID0gbmV3Q3Vyc29yU3RhdGUudG9wXG4gICAgICBvbGRDdXJzb3JTdGF0ZS5sZWZ0ID0gbmV3Q3Vyc29yU3RhdGUubGVmdFxuXG4gICAgaWYgbmV3Q3Vyc29yU3RhdGUuaGVpZ2h0IGlzbnQgb2xkQ3Vyc29yU3RhdGUuaGVpZ2h0XG4gICAgICBjdXJzb3JOb2RlLnN0eWxlLmhlaWdodCA9IG5ld0N1cnNvclN0YXRlLmhlaWdodCArICdweCdcbiAgICAgIG9sZEN1cnNvclN0YXRlLmhlaWdodCA9IG5ld0N1cnNvclN0YXRlLmhlaWdodFxuXG4gICAgaWYgbmV3Q3Vyc29yU3RhdGUud2lkdGggaXNudCBvbGRDdXJzb3JTdGF0ZS53aWR0aFxuICAgICAgY3Vyc29yTm9kZS5zdHlsZS53aWR0aCA9IG5ld0N1cnNvclN0YXRlLndpZHRoICsgJ3B4J1xuICAgICAgb2xkQ3Vyc29yU3RhdGUud2lkdGggPSBuZXdDdXJzb3JTdGF0ZS53aWR0aFxuIl19
