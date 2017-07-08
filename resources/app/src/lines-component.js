(function() {
  var CursorsComponent, LinesComponent, LinesTileComponent, TiledComponent,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  CursorsComponent = require('./cursors-component');

  LinesTileComponent = require('./lines-tile-component');

  TiledComponent = require('./tiled-component');

  module.exports = LinesComponent = (function(superClass) {
    extend(LinesComponent, superClass);

    LinesComponent.prototype.placeholderTextDiv = null;

    function LinesComponent(arg) {
      this.views = arg.views, this.presenter = arg.presenter, this.domElementPool = arg.domElementPool, this.assert = arg.assert;
      this.DummyLineNode = document.createElement('div');
      this.DummyLineNode.className = 'line';
      this.DummyLineNode.style.position = 'absolute';
      this.DummyLineNode.style.visibility = 'hidden';
      this.DummyLineNode.appendChild(document.createElement('span'));
      this.DummyLineNode.appendChild(document.createElement('span'));
      this.DummyLineNode.appendChild(document.createElement('span'));
      this.DummyLineNode.appendChild(document.createElement('span'));
      this.DummyLineNode.children[0].textContent = 'x';
      this.DummyLineNode.children[1].textContent = '我';
      this.DummyLineNode.children[2].textContent = 'ﾊ';
      this.DummyLineNode.children[3].textContent = '세';
      this.domNode = document.createElement('div');
      this.domNode.classList.add('lines');
      this.tilesNode = document.createElement("div");
      this.tilesNode.style.isolation = "isolate";
      this.tilesNode.style.zIndex = 0;
      this.domNode.appendChild(this.tilesNode);
      this.cursorsComponent = new CursorsComponent;
      this.domNode.appendChild(this.cursorsComponent.getDomNode());
    }

    LinesComponent.prototype.getDomNode = function() {
      return this.domNode;
    };

    LinesComponent.prototype.shouldRecreateAllTilesOnUpdate = function() {
      return this.newState.continuousReflow;
    };

    LinesComponent.prototype.beforeUpdateSync = function(state) {
      if (this.newState.maxHeight !== this.oldState.maxHeight) {
        this.domNode.style.height = this.newState.maxHeight + 'px';
        this.oldState.maxHeight = this.newState.maxHeight;
      }
      if (this.newState.backgroundColor !== this.oldState.backgroundColor) {
        this.domNode.style.backgroundColor = this.newState.backgroundColor;
        return this.oldState.backgroundColor = this.newState.backgroundColor;
      }
    };

    LinesComponent.prototype.afterUpdateSync = function(state) {
      var component, i, j, len, len1, ref, ref1, ref2;
      if (this.newState.placeholderText !== this.oldState.placeholderText) {
        if ((ref = this.placeholderTextDiv) != null) {
          ref.remove();
        }
        if (this.newState.placeholderText != null) {
          this.placeholderTextDiv = document.createElement('div');
          this.placeholderTextDiv.classList.add('placeholder-text');
          this.placeholderTextDiv.textContent = this.newState.placeholderText;
          this.domNode.appendChild(this.placeholderTextDiv);
        }
        this.oldState.placeholderText = this.newState.placeholderText;
      }
      ref1 = this.getComponents();
      for (i = 0, len = ref1.length; i < len; i++) {
        component = ref1[i];
        component.removeDeletedBlockDecorations();
      }
      ref2 = this.getComponents();
      for (j = 0, len1 = ref2.length; j < len1; j++) {
        component = ref2[j];
        component.updateBlockDecorations();
      }
      return this.cursorsComponent.updateSync(state);
    };

    LinesComponent.prototype.buildComponentForTile = function(id) {
      return new LinesTileComponent({
        id: id,
        presenter: this.presenter,
        domElementPool: this.domElementPool,
        assert: this.assert,
        views: this.views
      });
    };

    LinesComponent.prototype.buildEmptyState = function() {
      return {
        tiles: {}
      };
    };

    LinesComponent.prototype.getNewState = function(state) {
      return state.content;
    };

    LinesComponent.prototype.getTilesNode = function() {
      return this.tilesNode;
    };

    LinesComponent.prototype.measureLineHeightAndDefaultCharWidth = function() {
      var defaultCharWidth, doubleWidthCharWidth, halfWidthCharWidth, koreanCharWidth, lineHeightInPixels;
      this.domNode.appendChild(this.DummyLineNode);
      lineHeightInPixels = this.DummyLineNode.getBoundingClientRect().height;
      defaultCharWidth = this.DummyLineNode.children[0].getBoundingClientRect().width;
      doubleWidthCharWidth = this.DummyLineNode.children[1].getBoundingClientRect().width;
      halfWidthCharWidth = this.DummyLineNode.children[2].getBoundingClientRect().width;
      koreanCharWidth = this.DummyLineNode.children[3].getBoundingClientRect().width;
      this.domNode.removeChild(this.DummyLineNode);
      this.presenter.setLineHeight(lineHeightInPixels);
      return this.presenter.setBaseCharacterWidth(defaultCharWidth, doubleWidthCharWidth, halfWidthCharWidth, koreanCharWidth);
    };

    LinesComponent.prototype.measureBlockDecorations = function() {
      var component, i, len, ref;
      ref = this.getComponents();
      for (i = 0, len = ref.length; i < len; i++) {
        component = ref[i];
        component.measureBlockDecorations();
      }
    };

    LinesComponent.prototype.lineIdForScreenRow = function(screenRow) {
      var ref, tile;
      tile = this.presenter.tileForRow(screenRow);
      return (ref = this.getComponentForTile(tile)) != null ? ref.lineIdForScreenRow(screenRow) : void 0;
    };

    LinesComponent.prototype.lineNodeForScreenRow = function(screenRow) {
      var ref, tile;
      tile = this.presenter.tileForRow(screenRow);
      return (ref = this.getComponentForTile(tile)) != null ? ref.lineNodeForScreenRow(screenRow) : void 0;
    };

    LinesComponent.prototype.textNodesForScreenRow = function(screenRow) {
      var ref, tile;
      tile = this.presenter.tileForRow(screenRow);
      return (ref = this.getComponentForTile(tile)) != null ? ref.textNodesForScreenRow(screenRow) : void 0;
    };

    return LinesComponent;

  })(TiledComponent);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2xpbmVzLWNvbXBvbmVudC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLG9FQUFBO0lBQUE7OztFQUFBLGdCQUFBLEdBQW1CLE9BQUEsQ0FBUSxxQkFBUjs7RUFDbkIsa0JBQUEsR0FBcUIsT0FBQSxDQUFRLHdCQUFSOztFQUNyQixjQUFBLEdBQWlCLE9BQUEsQ0FBUSxtQkFBUjs7RUFFakIsTUFBTSxDQUFDLE9BQVAsR0FDTTs7OzZCQUNKLGtCQUFBLEdBQW9COztJQUVQLHdCQUFDLEdBQUQ7TUFBRSxJQUFDLENBQUEsWUFBQSxPQUFPLElBQUMsQ0FBQSxnQkFBQSxXQUFXLElBQUMsQ0FBQSxxQkFBQSxnQkFBZ0IsSUFBQyxDQUFBLGFBQUE7TUFDbkQsSUFBQyxDQUFBLGFBQUQsR0FBaUIsUUFBUSxDQUFDLGFBQVQsQ0FBdUIsS0FBdkI7TUFDakIsSUFBQyxDQUFBLGFBQWEsQ0FBQyxTQUFmLEdBQTJCO01BQzNCLElBQUMsQ0FBQSxhQUFhLENBQUMsS0FBSyxDQUFDLFFBQXJCLEdBQWdDO01BQ2hDLElBQUMsQ0FBQSxhQUFhLENBQUMsS0FBSyxDQUFDLFVBQXJCLEdBQWtDO01BQ2xDLElBQUMsQ0FBQSxhQUFhLENBQUMsV0FBZixDQUEyQixRQUFRLENBQUMsYUFBVCxDQUF1QixNQUF2QixDQUEzQjtNQUNBLElBQUMsQ0FBQSxhQUFhLENBQUMsV0FBZixDQUEyQixRQUFRLENBQUMsYUFBVCxDQUF1QixNQUF2QixDQUEzQjtNQUNBLElBQUMsQ0FBQSxhQUFhLENBQUMsV0FBZixDQUEyQixRQUFRLENBQUMsYUFBVCxDQUF1QixNQUF2QixDQUEzQjtNQUNBLElBQUMsQ0FBQSxhQUFhLENBQUMsV0FBZixDQUEyQixRQUFRLENBQUMsYUFBVCxDQUF1QixNQUF2QixDQUEzQjtNQUNBLElBQUMsQ0FBQSxhQUFhLENB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QXpCO2FBQ0EsSUFBQyxDQUFBLFNBQVMsQ0FBQyxxQkFBWCxDQUFpQyxnQkFBakMsRUFBbUQsb0JBQW5ELEVBQXlFLGtCQUF6RSxFQUE2RixlQUE3RjtJQVpvQzs7NkJBY3RDLHVCQUFBLEdBQXlCLFNBQUE7QUFDdkIsVUFBQTtBQUFBO0FBQUEsV0FBQSxxQ0FBQTs7UUFDRSxTQUFTLENBQUMsdUJBQVYsQ0FBQTtBQURGO0lBRHVCOzs2QkFLekIsa0JBQUEsR0FBb0IsU0FBQyxTQUFEO0FBQ2xCLFVBQUE7TUFBQSxJQUFBLEdBQU8sSUFBQyxDQUFBLFNBQVMsQ0FBQyxVQUFYLENBQXNCLFNBQXRCO2lFQUNtQixDQUFFLGtCQUE1QixDQUErQyxTQUEvQztJQUZrQjs7NkJBSXBCLG9CQUFBLEdBQXNCLFNBQUMsU0FBRDtBQUNwQixVQUFBO01BQUEsSUFBQSxHQUFPLElBQUMsQ0FBQSxTQUFTLENBQUMsVUFBWCxDQUFzQixTQUF0QjtpRUFDbUIsQ0FBRSxvQkFBNUIsQ0FBaUQsU0FBakQ7SUFGb0I7OzZCQUl0QixxQkFBQSxHQUF1QixTQUFDLFNBQUQ7QUFDckIsVUFBQTtNQUFBLElBQUEsR0FBTyxJQUFDLENBQUEsU0FBUyxDQUFDLFVBQVgsQ0FBc0IsU0FBdEI7aUVBQ21CLENBQUUscUJBQTVCLENBQWtELFNBQWxEO0lBRnFCOzs7O0tBckdJO0FBTDdCIiwic291cmNlc0NvbnRlbnQiOlsiQ3Vyc29yc0NvbXBvbmVudCA9IHJlcXVpcmUgJy4vY3Vyc29ycy1jb21wb25lbnQnXG5MaW5lc1RpbGVDb21wb25lbnQgPSByZXF1aXJlICcuL2xpbmVzLXRpbGUtY29tcG9uZW50J1xuVGlsZWRDb21wb25lbnQgPSByZXF1aXJlICcuL3RpbGVkLWNvbXBvbmVudCdcblxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgTGluZXNDb21wb25lbnQgZXh0ZW5kcyBUaWxlZENvbXBvbmVudFxuICBwbGFjZWhvbGRlclRleHREaXY6IG51bGxcblxuICBjb25zdHJ1Y3RvcjogKHtAdmlld3MsIEBwcmVzZW50ZXIsIEBkb21FbGVtZW50UG9vbCwgQGFzc2VydH0pIC0+XG4gICAgQER1bW15TGluZU5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgIEBEdW1teUxpbmVOb2RlLmNsYXNzTmFtZSA9ICdsaW5lJ1xuICAgIEBEdW1teUxpbmVOb2RlLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJ1xuICAgIEBEdW1teUxpbmVOb2RlLnN0eWxlLnZpc2liaWxpdHkgPSAnaGlkZGVuJ1xuICAgIEBEdW1teUxpbmVOb2RlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKSlcbiAgICBARHVtbXlMaW5lTm9kZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJykpXG4gICAgQER1bW15TGluZU5vZGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpKVxuICAgIEBEdW1teUxpbmVOb2RlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKSlcbiAgICBARHVtbXlMaW5lTm9kZS5jaGlsZHJlblswXS50ZXh0Q29udGVudCA9ICd4J1xuICAgIEBEdW1teUxpbmVOb2RlLmNoaWxkcmVuWzFdLnRleHRDb250ZW50ID0gJ+aIkSdcbiAgICBARHVtbXlMaW5lTm9kZS5jaGlsZHJlblsyXS50ZXh0Q29udGVudCA9ICfvvoonXG4gICAgQER1bW15TGluZU5vZGUuY2hpbGRyZW5bM10udGV4dENvbnRlbnQgPSAn7IS4J1xuXG4gICAgQGRvbU5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgIEBkb21Ob2RlLmNsYXNzTGlzdC5hZGQoJ2xpbmVzJylcbiAgICBAdGlsZXNOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICMgQ3JlYXRlIGEgbmV3IHN0YWNraW5nIGNvbnRleHQsIHNvIHRoYXQgdGlsZXMgei1pbmRleCBkb2VzIG5vdCBpbnRlcmZlcmVcbiAgICAjIHdpdGggb3RoZXIgdmlzdWFsIGVsZW1lbnRzLlxuICAgIEB0aWxlc05vZGUuc3R5bGUuaXNvbGF0aW9uID0gXCJpc29sYXRlXCJcbiAgICBAdGlsZXNOb2RlLnN0eWxlLnpJbmRleCA9IDBcbiAgICBAZG9tTm9kZS5hcHBlbmRDaGlsZChAdGlsZXNOb2RlKVxuXG4gICAgQGN1cnNvcnNDb21wb25lbnQgPSBuZXcgQ3Vyc29yc0NvbXBvbmVudFxuICAgIEBkb21Ob2RlLmFwcGVuZENoaWxkKEBjdXJzb3JzQ29tcG9uZW50LmdldERvbU5vZGUoKSlcblxuICBnZXREb21Ob2RlOiAtPlxuICAgIEBkb21Ob2RlXG5cbiAgc2hvdWxkUmVjcmVhdGVBbGxUaWxlc09uVXBkYXRlOiAtPlxuICAgIEBuZXdTdGF0ZS5jb250aW51b3VzUmVmbG93XG5cbiAgYmVmb3JlVXBkYXRlU3luYzogKHN0YXRlKSAtPlxuICAgIGlmIEBuZXdTdGF0ZS5tYXhIZWlnaHQgaXNudCBAb2xkU3RhdGUubWF4SGVpZ2h0XG4gICAgICBAZG9tTm9kZS5zdHlsZS5oZWlnaHQgPSBAbmV3U3RhdGUubWF4SGVpZ2h0ICsgJ3B4J1xuICAgICAgQG9sZFN0YXRlLm1heEhlaWdodCA9IEBuZXdTdGF0ZS5tYXhIZWlnaHRcblxuICAgIGlmIEBuZXdTdGF0ZS5iYWNrZ3JvdW5kQ29sb3IgaXNudCBAb2xkU3RhdGUuYmFja2dyb3VuZENvbG9yXG4gICAgICBAZG9tTm9kZS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBAbmV3U3RhdGUuYmFja2dyb3VuZENvbG9yXG4gICAgICBAb2xkU3RhdGUuYmFja2dyb3VuZENvbG9yID0gQG5ld1N0YXRlLmJhY2tncm91bmRDb2xvclxuXG4gIGFmdGVyVXBkYXRlU3luYzogKHN0YXRlKSAtPlxuICAgIGlmIEBuZXdTdGF0ZS5wbGFjZWhvbGRlclRleHQgaXNudCBAb2xkU3RhdGUucGxhY2Vob2xkZXJUZXh0XG4gICAgICBAcGxhY2Vob2xkZXJUZXh0RGl2Py5yZW1vdmUoKVxuICAgICAgaWYgQG5ld1N0YXRlLnBsYWNlaG9sZGVyVGV4dD9cbiAgICAgICAgQHBsYWNlaG9sZGVyVGV4dERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgICAgIEBwbGFjZWhvbGRlclRleHREaXYuY2xhc3NMaXN0LmFkZCgncGxhY2Vob2xkZXItdGV4dCcpXG4gICAgICAgIEBwbGFjZWhvbGRlclRleHREaXYudGV4dENvbnRlbnQgPSBAbmV3U3RhdGUucGxhY2Vob2xkZXJUZXh0XG4gICAgICAgIEBkb21Ob2RlLmFwcGVuZENoaWxkKEBwbGFjZWhvbGRlclRleHREaXYpXG4gICAgICBAb2xkU3RhdGUucGxhY2Vob2xkZXJUZXh0ID0gQG5ld1N0YXRlLnBsYWNlaG9sZGVyVGV4dFxuXG4gICAgIyBSZW1vdmluZyBhbmQgdXBkYXRpbmcgYmxvY2sgZGVjb3JhdGlvbnMgbmVlZHMgdG8gYmUgZG9uZSBpbiB0d28gZGlmZmVyZW50XG4gICAgIyBzdGVwcywgc28gdGhhdCB0aGUgc2FtZSBkZWNvcmF0aW9uIG5vZGUgY2FuIGJlIG1vdmVkIGZyb20gb25lIHRpbGUgdG9cbiAgICAjIGFub3RoZXIgaW4gdGhlIHNhbWUgYW5pbWF0aW9uIGZyYW1lLlxuICAgIGZvciBjb21wb25lbnQgaW4gQGdldENvbXBvbmVudHMoKVxuICAgICAgY29tcG9uZW50LnJlbW92ZURlbGV0ZWRCbG9ja0RlY29yYXRpb25zKClcbiAgICBmb3IgY29tcG9uZW50IGluIEBnZXRDb21wb25lbnRzKClcbiAgICAgIGNvbXBvbmVudC51cGRhdGVCbG9ja0RlY29yYXRpb25zKClcblxuICAgIEBjdXJzb3JzQ29tcG9uZW50LnVwZGF0ZVN5bmMoc3RhdGUpXG5cbiAgYnVpbGRDb21wb25lbnRGb3JUaWxlOiAoaWQpIC0+IG5ldyBMaW5lc1RpbGVDb21wb25lbnQoe2lkLCBAcHJlc2VudGVyLCBAZG9tRWxlbWVudFBvb2wsIEBhc3NlcnQsIEB2aWV3c30pXG5cbiAgYnVpbGRFbXB0eVN0YXRlOiAtPlxuICAgIHt0aWxlczoge319XG5cbiAgZ2V0TmV3U3RhdGU6IChzdGF0ZSkgLT5cbiAgICBzdGF0ZS5jb250ZW50XG5cbiAgZ2V0VGlsZXNOb2RlOiAtPiBAdGlsZXNOb2RlXG5cbiAgbWVhc3VyZUxpbmVIZWlnaHRBbmREZWZhdWx0Q2hhcldpZHRoOiAtPlxuICAgIEBkb21Ob2RlLmFwcGVuZENoaWxkKEBEdW1teUxpbmVOb2RlKVxuXG4gICAgbGluZUhlaWdodEluUGl4ZWxzID0gQER1bW15TGluZU5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0XG4gICAgZGVmYXVsdENoYXJXaWR0aCA9IEBEdW1teUxpbmVOb2RlLmNoaWxkcmVuWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoXG4gICAgZG91YmxlV2lkdGhDaGFyV2lkdGggPSBARHVtbXlMaW5lTm9kZS5jaGlsZHJlblsxXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aFxuICAgIGhhbGZXaWR0aENoYXJXaWR0aCA9IEBEdW1teUxpbmVOb2RlLmNoaWxkcmVuWzJdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoXG4gICAga29yZWFuQ2hhcldpZHRoID0gQER1bW15TGluZU5vZGUuY2hpbGRyZW5bM10uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGhcblxuICAgIEBkb21Ob2RlLnJlbW92ZUNoaWxkKEBEdW1teUxpbmVOb2RlKVxuXG4gICAgQHByZXNlbnRlci5zZXRMaW5lSGVpZ2h0KGxpbmVIZWlnaHRJblBpeGVscylcbiAgICBAcHJlc2VudGVyLnNldEJhc2VDaGFyYWN0ZXJXaWR0aChkZWZhdWx0Q2hhcldpZHRoLCBkb3VibGVXaWR0aENoYXJXaWR0aCwgaGFsZldpZHRoQ2hhcldpZHRoLCBrb3JlYW5DaGFyV2lkdGgpXG5cbiAgbWVhc3VyZUJsb2NrRGVjb3JhdGlvbnM6IC0+XG4gICAgZm9yIGNvbXBvbmVudCBpbiBAZ2V0Q29tcG9uZW50cygpXG4gICAgICBjb21wb25lbnQubWVhc3VyZUJsb2NrRGVjb3JhdGlvbnMoKVxuICAgIHJldHVyblxuXG4gIGxpbmVJZEZvclNjcmVlblJvdzogKHNjcmVlblJvdykgLT5cbiAgICB0aWxlID0gQHByZXNlbnRlci50aWxlRm9yUm93KHNjcmVlblJvdylcbiAgICBAZ2V0Q29tcG9uZW50Rm9yVGlsZSh0aWxlKT8ubGluZUlkRm9yU2NyZWVuUm93KHNjcmVlblJvdylcblxuICBsaW5lTm9kZUZvclNjcmVlblJvdzogKHNjcmVlblJvdykgLT5cbiAgICB0aWxlID0gQHByZXNlbnRlci50aWxlRm9yUm93KHNjcmVlblJvdylcbiAgICBAZ2V0Q29tcG9uZW50Rm9yVGlsZSh0aWxlKT8ubGluZU5vZGVGb3JTY3JlZW5Sb3coc2NyZWVuUm93KVxuXG4gIHRleHROb2Rlc0ZvclNjcmVlblJvdzogKHNjcmVlblJvdykgLT5cbiAgICB0aWxlID0gQHByZXNlbnRlci50aWxlRm9yUm93KHNjcmVlblJvdylcbiAgICBAZ2V0Q29tcG9uZW50Rm9yVGlsZSh0aWxlKT8udGV4dE5vZGVzRm9yU2NyZWVuUm93KHNjcmVlblJvdylcbiJdfQ==
