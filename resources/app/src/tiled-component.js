(function() {
  var TiledComponent;

  module.exports = TiledComponent = (function() {
    function TiledComponent() {}

    TiledComponent.prototype.updateSync = function(state) {
      this.newState = this.getNewState(state);
      if (this.oldState == null) {
        this.oldState = this.buildEmptyState();
      }
      if (typeof this.beforeUpdateSync === "function") {
        this.beforeUpdateSync(state);
      }
      if (typeof this.shouldRecreateAllTilesOnUpdate === "function" ? this.shouldRecreateAllTilesOnUpdate() : void 0) {
        this.removeTileNodes();
      }
      this.updateTileNodes();
      return typeof this.afterUpdateSync === "function" ? this.afterUpdateSync(state) : void 0;
    };

    TiledComponent.prototype.removeTileNodes = function() {
      var tileRow;
      for (tileRow in this.oldState.tiles) {
        this.removeTileNode(tileRow);
      }
    };

    TiledComponent.prototype.removeTileNode = function(tileRow) {
      this.componentsByTileId[tileRow].destroy();
      delete this.componentsByTileId[tileRow];
      return delete this.oldState.tiles[tileRow];
    };

    TiledComponent.prototype.updateTileNodes = function() {
      var component, ref, tileRow, tileState;
      if (this.componentsByTileId == null) {
        this.componentsByTileId = {};
      }
      for (tileRow in this.oldState.tiles) {
        if (!this.newState.tiles.hasOwnProperty(tileRow)) {
          this.removeTileNode(tileRow);
        }
      }
      ref = this.newState.tiles;
      for (tileRow in ref) {
        tileState = ref[tileRow];
        if (this.oldState.tiles.hasOwnProperty(tileRow)) {
          component = this.componentsByTileId[tileRow];
        } else {
          component = this.componentsByTileId[tileRow] = this.buildComponentForTile(tileRow);
          this.getTilesNode().appendChild(component.getDomNode());
          this.oldState.tiles[tileRow] = Object.assign({}, tileState);
        }
        component.updateSync(this.newState);
      }
    };

    TiledComponent.prototype.getComponentForTile = function(tileRow) {
      return this.componentsByTileId[tileRow];
    };

    TiledComponent.prototype.getComponents = function() {
      var _, component, ref, results;
      ref = this.componentsByTileId;
      results = [];
      for (_ in ref) {
        component = ref[_];
        results.push(component);
      }
      return results;
    };

    TiledComponent.prototype.getTiles = function() {
      return this.getComponents().map(function(component) {
        return component.getDomNode();
      });
    };

    return TiledComponent;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3RpbGVkLWNvbXBvbmVudC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFBLE1BQU0sQ0FBQyxPQUFQLEdBQ007Ozs2QkFDSixVQUFBLEdBQVksU0FBQyxLQUFEO01BQ1YsSUFBQyxDQUFBLFFBQUQsR0FBWSxJQUFDLENBQUEsV0FBRCxDQUFhLEtBQWI7O1FBQ1osSUFBQyxDQUFBLFdBQVksSUFBQyxDQUFBLGVBQUQsQ0FBQTs7O1FBRWIsSUFBQyxDQUFBLGlCQUFrQjs7TUFFbkIsZ0VBQXNCLElBQUMsQ0FBQSx5Q0FBdkI7UUFBQSxJQUFDLENBQUEsZUFBRCxDQUFBLEVBQUE7O01BQ0EsSUFBQyxDQUFBLGVBQUQsQ0FBQTswREFFQSxJQUFDLENBQUEsZ0JBQWlCO0lBVFI7OzZCQVdaLGVBQUEsR0FBaUIsU0FBQTtBQUNmLFVBQUE7QUFBQSxXQUFBLDhCQUFBO1FBQUEsSUFBQyxDQUFBLGNBQUQsQ0FBZ0IsT0FBaEI7QUFBQTtJQURlOzs2QkFJakIsY0FBQSxHQUFnQixTQUFDLE9BQUQ7TUFDZCxJQUFDLENBQUEsa0JBQW1CLENBQUEsT0FBQSxDQUFRLENBQUMsT0FBN0IsQ0FBQTtNQUNBLE9BQU8sSUFBQyxDQUFBLGtCQUFtQixDQUFBLE9BQUE7YUFDM0IsT0FBTyxJQUFDLENBQUEsUUFBUSxDQUFDLEtBQU0sQ0FBQSxPQUFBO0lBSFQ7OzZCQUtoQixlQUFBLEdBQWlCLFNBQUE7QUFDZixVQUFBOztRQUFBLElBQUMsQ0FBQSxxQkFBc0I7O0FBRXZCLFdBQUEsOEJBQUE7UUFDRSxJQUFBLENBQU8sSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFLLENBQUMsY0FBaEIsQ0FBK0IsT0FBL0IsQ0FBUDtVQUNFLElBQUMsQ0FBQSxjQUFELENBQWdCLE9BQWhCLEVBREY7O0FBREY7QUFJQTtBQUFBLFdBQUEsY0FBQTs7UUFDRSxJQUFHLElBQUMsQ0FBQSxRQUFRLENBQUMsS0FBSyxDQUFDLGNBQWhCLENBQStCLE9BQS9CLENBQUg7VUFDRSxTQUFBLEdBQVksSUFBQyxDQUFBLGtCQUFtQixDQUFBLE9BQUEsRUFEbEM7U0FBQSxNQUFBO1VBR0UsU0FBQSxHQUFZLElBQUMsQ0FBQSxrQkFBbUIsQ0FBQSxPQUFBLENBQXBCLEdBQStCLElBQUMsQ0FBQSxxQkFBRCxDQUF1QixPQUF2QjtVQUUzQyxJQUFDLENBQUEsWUFBRCxDQUFBLENBQWUsQ0FBQyxXQUFoQixDQUE0QixTQUFTLENBQUMsVUFBVixDQUFBLENBQTVCO1VBQ0EsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFNLENBQUEsT0FBQSxDQUFoQixHQUEyQixNQUFNLENBQUMsTUFBUCxDQUFjLEVBQWQsRUFBa0IsU0FBbEIsRUFON0I7O1FBUUEsU0FBUyxDQUFDLFVBQVYsQ0FBcUIsSUFBQyxDQUFBLFFBQXRCO0FBVEY7SUFQZTs7NkJBb0JqQixtQkFBQSxHQUFxQixTQUFDLE9BQUQ7YUFDbkIsSUFBQyxDQUFBLGtCQUFtQixDQUFBLE9BQUE7SUFERDs7NkJBR3JCLGFBQUEsR0FBZSxTQUFBO0FBQ2IsVUFBQTtBQUFBO0FBQUE7V0FBQSxRQUFBOztxQkFDRTtBQURGOztJQURhOzs2QkFJZixRQUFBLEdBQVUsU0FBQTthQUNSLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FBZ0IsQ0FBQyxHQUFqQixDQUFxQixTQUFDLFNBQUQ7ZUFBZSxTQUFTLENBQUMsVUFBVixDQUFBO01BQWYsQ0FBckI7SUFEUTs7Ozs7QUFqRFoiLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBUaWxlZENvbXBvbmVudFxuICB1cGRhdGVTeW5jOiAoc3RhdGUpIC0+XG4gICAgQG5ld1N0YXRlID0gQGdldE5ld1N0YXRlKHN0YXRlKVxuICAgIEBvbGRTdGF0ZSA/PSBAYnVpbGRFbXB0eVN0YXRlKClcblxuICAgIEBiZWZvcmVVcGRhdGVTeW5jPyhzdGF0ZSlcblxuICAgIEByZW1vdmVUaWxlTm9kZXMoKSBpZiBAc2hvdWxkUmVjcmVhdGVBbGxUaWxlc09uVXBkYXRlPygpXG4gICAgQHVwZGF0ZVRpbGVOb2RlcygpXG5cbiAgICBAYWZ0ZXJVcGRhdGVTeW5jPyhzdGF0ZSlcblxuICByZW1vdmVUaWxlTm9kZXM6IC0+XG4gICAgQHJlbW92ZVRpbGVOb2RlKHRpbGVSb3cpIGZvciB0aWxlUm93IG9mIEBvbGRTdGF0ZS50aWxlc1xuICAgIHJldHVyblxuXG4gIHJlbW92ZVRpbGVOb2RlOiAodGlsZVJvdykgLT5cbiAgICBAY29tcG9uZW50c0J5VGlsZUlkW3RpbGVSb3ddLmRlc3Ryb3koKVxuICAgIGRlbGV0ZSBAY29tcG9uZW50c0J5VGlsZUlkW3RpbGVSb3ddXG4gICAgZGVsZXRlIEBvbGRTdGF0ZS50aWxlc1t0aWxlUm93XVxuXG4gIHVwZGF0ZVRpbGVOb2RlczogLT5cbiAgICBAY29tcG9uZW50c0J5VGlsZUlkID89IHt9XG5cbiAgICBmb3IgdGlsZVJvdyBvZiBAb2xkU3RhdGUudGlsZXNcbiAgICAgIHVubGVzcyBAbmV3U3RhdGUudGlsZXMuaGFzT3duUHJvcGVydHkodGlsZVJvdylcbiAgICAgICAgQHJlbW92ZVRpbGVOb2RlKHRpbGVSb3cpXG5cbiAgICBmb3IgdGlsZVJvdywgdGlsZVN0YXRlIG9mIEBuZXdTdGF0ZS50aWxlc1xuICAgICAgaWYgQG9sZFN0YXRlLnRpbGVzLmhhc093blByb3BlcnR5KHRpbGVSb3cpXG4gICAgICAgIGNvbXBvbmVudCA9IEBjb21wb25lbnRzQnlUaWxlSWRbdGlsZVJvd11cbiAgICAgIGVsc2VcbiAgICAgICAgY29tcG9uZW50ID0gQGNvbXBvbmVudHNCeVRpbGVJZFt0aWxlUm93XSA9IEBidWlsZENvbXBvbmVudEZvclRpbGUodGlsZVJvdylcblxuICAgICAgICBAZ2V0VGlsZXNOb2RlKCkuYXBwZW5kQ2hpbGQoY29tcG9uZW50LmdldERvbU5vZGUoKSlcbiAgICAgICAgQG9sZFN0YXRlLnRpbGVzW3RpbGVSb3ddID0gT2JqZWN0LmFzc2lnbih7fSwgdGlsZVN0YXRlKVxuXG4gICAgICBjb21wb25lbnQudXBkYXRlU3luYyhAbmV3U3RhdGUpXG5cbiAgICByZXR1cm5cblxuICBnZXRDb21wb25lbnRGb3JUaWxlOiAodGlsZVJvdykgLT5cbiAgICBAY29tcG9uZW50c0J5VGlsZUlkW3RpbGVSb3ddXG5cbiAgZ2V0Q29tcG9uZW50czogLT5cbiAgICBmb3IgXywgY29tcG9uZW50IG9mIEBjb21wb25lbnRzQnlUaWxlSWRcbiAgICAgIGNvbXBvbmVudFxuXG4gIGdldFRpbGVzOiAtPlxuICAgIEBnZXRDb21wb25lbnRzKCkubWFwKChjb21wb25lbnQpIC0+IGNvbXBvbmVudC5nZXREb21Ob2RlKCkpXG4iXX0=
