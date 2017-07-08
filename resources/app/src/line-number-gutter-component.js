(function() {
  var LineNumberGutterComponent, LineNumbersTileComponent, TiledComponent,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  TiledComponent = require('./tiled-component');

  LineNumbersTileComponent = require('./line-numbers-tile-component');

  module.exports = LineNumberGutterComponent = (function(superClass) {
    extend(LineNumberGutterComponent, superClass);

    LineNumberGutterComponent.prototype.dummyLineNumberNode = null;

    function LineNumberGutterComponent(arg) {
      this.onMouseDown = arg.onMouseDown, this.editor = arg.editor, this.gutter = arg.gutter, this.domElementPool = arg.domElementPool, this.views = arg.views;
      this.onClick = bind(this.onClick, this);
      this.onMouseDown = bind(this.onMouseDown, this);
      this.visible = true;
      this.dummyLineNumberComponent = LineNumbersTileComponent.createDummy(this.domElementPool);
      this.domNode = this.gutter.getElement();
      this.lineNumbersNode = this.domNode.firstChild;
      this.lineNumbersNode.innerHTML = '';
      this.domNode.addEventListener('click', this.onClick);
      this.domNode.addEventListener('mousedown', this.onMouseDown);
    }

    LineNumberGutterComponent.prototype.destroy = function() {
      this.domNode.removeEventListener('click', this.onClick);
      return this.domNode.removeEventListener('mousedown', this.onMouseDown);
    };

    LineNumberGutterComponent.prototype.getDomNode = function() {
      return this.domNode;
    };

    LineNumberGutterComponent.prototype.hideNode = function() {
      if (this.visible) {
        this.domNode.style.display = 'none';
        return this.visible = false;
      }
    };

    LineNumberGutterComponent.prototype.showNode = function() {
      if (!this.visible) {
        this.domNode.style.removeProperty('display');
        return this.visible = true;
      }
    };

    LineNumberGutterComponent.prototype.buildEmptyState = function() {
      return {
        tiles: {},
        styles: {}
      };
    };

    LineNumberGutterComponent.prototype.getNewState = function(state) {
      return state;
    };

    LineNumberGutterComponent.prototype.getTilesNode = function() {
      return this.lineNumbersNode;
    };

    LineNumberGutterComponent.prototype.beforeUpdateSync = function(state) {
      if (this.dummyLineNumberNode == null) {
        this.appendDummyLineNumber();
      }
      if (this.newState.styles.maxHeight !== this.oldState.styles.maxHeight) {
        this.lineNumbersNode.style.height = this.newState.styles.maxHeight + 'px';
        this.oldState.maxHeight = this.newState.maxHeight;
      }
      if (this.newState.styles.backgroundColor !== this.oldState.styles.backgroundColor) {
        this.lineNumbersNode.style.backgroundColor = this.newState.styles.backgroundColor;
        this.oldState.styles.backgroundColor = this.newState.styles.backgroundColor;
      }
      if (this.newState.maxLineNumberDigits !== this.oldState.maxLineNumberDigits) {
        this.updateDummyLineNumber();
        this.oldState.styles = {};
        return this.oldState.maxLineNumberDigits = this.newState.maxLineNumberDigits;
      }
    };

    LineNumberGutterComponent.prototype.buildComponentForTile = function(id) {
      return new LineNumbersTileComponent({
        id: id,
        domElementPool: this.domElementPool
      });
    };

    LineNumberGutterComponent.prototype.shouldRecreateAllTilesOnUpdate = function() {
      return this.newState.continuousReflow;
    };


    /*
    Section: Private Methods
     */

    LineNumberGutterComponent.prototype.appendDummyLineNumber = function() {
      this.dummyLineNumberComponent.newState = this.newState;
      this.dummyLineNumberNode = this.dummyLineNumberComponent.buildLineNumberNode({
        bufferRow: -1
      });
      return this.lineNumbersNode.appendChild(this.dummyLineNumberNode);
    };

    LineNumberGutterComponent.prototype.updateDummyLineNumber = function() {
      this.dummyLineNumberComponent.newState = this.newState;
      return this.dummyLineNumberComponent.setLineNumberInnerNodes(0, false, this.dummyLineNumberNode);
    };

    LineNumberGutterComponent.prototype.onMouseDown = function(event) {
      var lineNumber, target;
      target = event.target;
      lineNumber = target.parentNode;
      if (!(target.classList.contains('icon-right') && lineNumber.classList.contains('foldable'))) {
        return this.onMouseDown(event);
      }
    };

    LineNumberGutterComponent.prototype.onClick = function(event) {
      var bufferRow, lineNumber, target;
      target = event.target;
      lineNumber = target.parentNode;
      if (target.classList.contains('icon-right')) {
        bufferRow = parseInt(lineNumber.getAttribute('data-buffer-row'));
        if (lineNumber.classList.contains('folded')) {
          return this.editor.unfoldBufferRow(bufferRow);
        } else if (lineNumber.classList.contains('foldable')) {
          return this.editor.foldBufferRow(bufferRow);
        }
      }
    };

    return LineNumberGutterComponent;

  })(TiledComponent);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2xpbmUtbnVtYmVyLWd1dHRlci1jb21wb25lbnQuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSxtRUFBQTtJQUFBOzs7O0VBQUEsY0FBQSxHQUFpQixPQUFBLENBQVEsbUJBQVI7O0VBQ2pCLHdCQUFBLEdBQTJCLE9BQUEsQ0FBUSwrQkFBUjs7RUFFM0IsTUFBTSxDQUFDLE9BQVAsR0FDTTs7O3dDQUNKLG1CQUFBLEdBQXFCOztJQUVSLG1DQUFDLEdBQUQ7TUFBRSxJQUFDLENBQUEsa0JBQUEsYUFBYSxJQUFDLENBQUEsYUFBQSxRQUFRLElBQUMsQ0FBQSxhQUFBLFFBQVEsSUFBQyxDQUFBLHFCQUFBLGdCQUFnQixJQUFDLENBQUEsWUFBQTs7O01BQy9ELElBQUMsQ0FBQSxPQUFELEdBQVc7TUFFWCxJQUFDLENBQUEsd0JBQUQsR0FBNEIsd0JBQXdCLENBQUMsV0FBekIsQ0FBcUMsSUFBQyxDQUFBLGNBQXRDO01BRTVCLElBQUMsQ0FBQSxPQUFELEdBQVcsSUFBQyxDQUFBLE1BQU0sQ0FBQyxVQUFSLENBQUE7TUFDWCxJQUFDLENBQUEsZUFBRCxHQUFtQixJQUFDLENBQUEsT0FBTyxDQUFDO01BQzVCLElBQUMsQ0FBQSxlQUFlLENBQUMsU0FBakIsR0FBNkI7TUFFN0IsSUFBQyxDQUFBLE9BQU8sQ0FBQyxnQkFBVCxDQUEwQixPQUExQixFQUFtQyxJQUFDLENBQUEsT0FBcEM7TUFDQSxJQUFDLENBQUEsT0FBTyxDQUFDLGdCQUFULENBQTBCLFdBQTFCLEVBQXVDLElBQUMsQ0FBQSxXQUF4QztJQVZXOzt3Q0FZYixPQUFBLEdBQVMsU0FBQTtNQUNQLElBQUMsQ0FBQSxPQUFPLENBQUMsbUJBQVQsQ0FBNkIsT0FBN0IsRUFBc0MsSUFBQyxDQUFBLE9BQXZDO2FBQ0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxtQkFB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QUFsRCxFQUFxRCxLQUFyRCxFQUE0RCxJQUFDLENBQUEsbUJBQTdEO0lBRnFCOzt3Q0FJdkIsV0FBQSxHQUFhLFNBQUMsS0FBRDtBQUNYLFVBQUE7TUFBQyxTQUFVO01BQ1gsVUFBQSxHQUFhLE1BQU0sQ0FBQztNQUVwQixJQUFBLENBQUEsQ0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQWpCLENBQTBCLFlBQTFCLENBQUEsSUFBNEMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxRQUFyQixDQUE4QixVQUE5QixDQUFuRCxDQUFBO2VBQ0UsSUFBQyxDQUFBLFdBQUQsQ0FBYSxLQUFiLEVBREY7O0lBSlc7O3dDQU9iLE9BQUEsR0FBUyxTQUFDLEtBQUQ7QUFDUCxVQUFBO01BQUMsU0FBVTtNQUNYLFVBQUEsR0FBYSxNQUFNLENBQUM7TUFFcEIsSUFBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQWpCLENBQTBCLFlBQTFCLENBQUg7UUFDRSxTQUFBLEdBQVksUUFBQSxDQUFTLFVBQVUsQ0FBQyxZQUFYLENBQXdCLGlCQUF4QixDQUFUO1FBQ1osSUFBRyxVQUFVLENBQUMsU0FBUyxDQUFDLFFBQXJCLENBQThCLFFBQTlCLENBQUg7aUJBQ0UsSUFBQyxDQUFBLE1BQU0sQ0FBQyxlQUFSLENBQXdCLFNBQXhCLEVBREY7U0FBQSxNQUVLLElBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxRQUFyQixDQUE4QixVQUE5QixDQUFIO2lCQUNILElBQUMsQ0FBQSxNQUFNLENBQUMsYUFBUixDQUFzQixTQUF0QixFQURHO1NBSlA7O0lBSk87Ozs7S0FyRjZCO0FBSnhDIiwic291cmNlc0NvbnRlbnQiOlsiVGlsZWRDb21wb25lbnQgPSByZXF1aXJlICcuL3RpbGVkLWNvbXBvbmVudCdcbkxpbmVOdW1iZXJzVGlsZUNvbXBvbmVudCA9IHJlcXVpcmUgJy4vbGluZS1udW1iZXJzLXRpbGUtY29tcG9uZW50J1xuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBMaW5lTnVtYmVyR3V0dGVyQ29tcG9uZW50IGV4dGVuZHMgVGlsZWRDb21wb25lbnRcbiAgZHVtbXlMaW5lTnVtYmVyTm9kZTogbnVsbFxuXG4gIGNvbnN0cnVjdG9yOiAoe0Bvbk1vdXNlRG93biwgQGVkaXRvciwgQGd1dHRlciwgQGRvbUVsZW1lbnRQb29sLCBAdmlld3N9KSAtPlxuICAgIEB2aXNpYmxlID0gdHJ1ZVxuXG4gICAgQGR1bW15TGluZU51bWJlckNvbXBvbmVudCA9IExpbmVOdW1iZXJzVGlsZUNvbXBvbmVudC5jcmVhdGVEdW1teShAZG9tRWxlbWVudFBvb2wpXG5cbiAgICBAZG9tTm9kZSA9IEBndXR0ZXIuZ2V0RWxlbWVudCgpXG4gICAgQGxpbmVOdW1iZXJzTm9kZSA9IEBkb21Ob2RlLmZpcnN0Q2hpbGRcbiAgICBAbGluZU51bWJlcnNOb2RlLmlubmVySFRNTCA9ICcnXG5cbiAgICBAZG9tTm9kZS5hZGRFdmVudExpc3RlbmVyICdjbGljaycsIEBvbkNsaWNrXG4gICAgQGRvbU5vZGUuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vkb3duJywgQG9uTW91c2VEb3duXG5cbiAgZGVzdHJveTogLT5cbiAgICBAZG9tTm9kZS5yZW1vdmVFdmVudExpc3RlbmVyICdjbGljaycsIEBvbkNsaWNrXG4gICAgQGRvbU5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lciAnbW91c2Vkb3duJywgQG9uTW91c2VEb3duXG5cbiAgZ2V0RG9tTm9kZTogLT5cbiAgICBAZG9tTm9kZVxuXG4gIGhpZGVOb2RlOiAtPlxuICAgIGlmIEB2aXNpYmxlXG4gICAgICBAZG9tTm9kZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG4gICAgICBAdmlzaWJsZSA9IGZhbHNlXG5cbiAgc2hvd05vZGU6IC0+XG4gICAgaWYgbm90IEB2aXNpYmxlXG4gICAgICBAZG9tTm9kZS5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgnZGlzcGxheScpXG4gICAgICBAdmlzaWJsZSA9IHRydWVcblxuICBidWlsZEVtcHR5U3RhdGU6IC0+XG4gICAge1xuICAgICAgdGlsZXM6IHt9XG4gICAgICBzdHlsZXM6IHt9XG4gICAgfVxuXG4gIGdldE5ld1N0YXRlOiAoc3RhdGUpIC0+IHN0YXRlXG5cbiAgZ2V0VGlsZXNOb2RlOiAtPiBAbGluZU51bWJlcnNOb2RlXG5cbiAgYmVmb3JlVXBkYXRlU3luYzogKHN0YXRlKSAtPlxuICAgIEBhcHBlbmREdW1teUxpbmVOdW1iZXIoKSB1bmxlc3MgQGR1bW15TGluZU51bWJlck5vZGU/XG5cbiAgICBpZiBAbmV3U3RhdGUuc3R5bGVzLm1heEhlaWdodCBpc250IEBvbGRTdGF0ZS5zdHlsZXMubWF4SGVpZ2h0XG4gICAgICBAbGluZU51bWJlcnNOb2RlLnN0eWxlLmhlaWdodCA9IEBuZXdTdGF0ZS5zdHlsZXMubWF4SGVpZ2h0ICsgJ3B4J1xuICAgICAgQG9sZFN0YXRlLm1heEhlaWdodCA9IEBuZXdTdGF0ZS5tYXhIZWlnaHRcblxuICAgIGlmIEBuZXdTdGF0ZS5zdHlsZXMuYmFja2dyb3VuZENvbG9yIGlzbnQgQG9sZFN0YXRlLnN0eWxlcy5iYWNrZ3JvdW5kQ29sb3JcbiAgICAgIEBsaW5lTnVtYmVyc05vZGUuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gQG5ld1N0YXRlLnN0eWxlcy5iYWNrZ3JvdW5kQ29sb3JcbiAgICAgIEBvbGRTdGF0ZS5zdHlsZXMuYmFja2dyb3VuZENvbG9yID0gQG5ld1N0YXRlLnN0eWxlcy5iYWNrZ3JvdW5kQ29sb3JcblxuICAgIGlmIEBuZXdTdGF0ZS5tYXhMaW5lTnVtYmVyRGlnaXRzIGlzbnQgQG9sZFN0YXRlLm1heExpbmVOdW1iZXJEaWdpdHNcbiAgICAgIEB1cGRhdGVEdW1teUxpbmVOdW1iZXIoKVxuICAgICAgQG9sZFN0YXRlLnN0eWxlcyA9IHt9XG4gICAgICBAb2xkU3RhdGUubWF4TGluZU51bWJlckRpZ2l0cyA9IEBuZXdTdGF0ZS5tYXhMaW5lTnVtYmVyRGlnaXRzXG5cbiAgYnVpbGRDb21wb25lbnRGb3JUaWxlOiAoaWQpIC0+IG5ldyBMaW5lTnVtYmVyc1RpbGVDb21wb25lbnQoe2lkLCBAZG9tRWxlbWVudFBvb2x9KVxuXG4gIHNob3VsZFJlY3JlYXRlQWxsVGlsZXNPblVwZGF0ZTogLT5cbiAgICBAbmV3U3RhdGUuY29udGludW91c1JlZmxvd1xuXG4gICMjI1xuICBTZWN0aW9uOiBQcml2YXRlIE1ldGhvZHNcbiAgIyMjXG5cbiAgIyBUaGlzIGR1bW15IGxpbmUgbnVtYmVyIGVsZW1lbnQgaG9sZHMgdGhlIGd1dHRlciB0byB0aGUgYXBwcm9wcmlhdGUgd2lkdGgsXG4gICMgc2luY2UgdGhlIHJlYWwgbGluZSBudW1iZXJzIGFyZSBhYnNvbHV0ZWx5IHBvc2l0aW9uZWQgZm9yIHBlcmZvcm1hbmNlIHJlYXNvbnMuXG4gIGFwcGVuZER1bW15TGluZU51bWJlcjogLT5cbiAgICBAZHVtbXlMaW5lTnVtYmVyQ29tcG9uZW50Lm5ld1N0YXRlID0gQG5ld1N0YXRlXG4gICAgQGR1bW15TGluZU51bWJlck5vZGUgPSBAZHVtbXlMaW5lTnVtYmVyQ29tcG9uZW50LmJ1aWxkTGluZU51bWJlck5vZGUoe2J1ZmZlclJvdzogLTF9KVxuICAgIEBsaW5lTnVtYmVyc05vZGUuYXBwZW5kQ2hpbGQoQGR1bW15TGluZU51bWJlck5vZGUpXG5cbiAgdXBkYXRlRHVtbXlMaW5lTnVtYmVyOiAtPlxuICAgIEBkdW1teUxpbmVOdW1iZXJDb21wb25lbnQubmV3U3RhdGUgPSBAbmV3U3RhdGVcbiAgICBAZHVtbXlMaW5lTnVtYmVyQ29tcG9uZW50LnNldExpbmVOdW1iZXJJbm5lck5vZGVzKDAsIGZhbHNlLCBAZHVtbXlMaW5lTnVtYmVyTm9kZSlcblxuICBvbk1vdXNlRG93bjogKGV2ZW50KSA9PlxuICAgIHt0YXJnZXR9ID0gZXZlbnRcbiAgICBsaW5lTnVtYmVyID0gdGFyZ2V0LnBhcmVudE5vZGVcblxuICAgIHVubGVzcyB0YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdpY29uLXJpZ2h0JykgYW5kIGxpbmVOdW1iZXIuY2xhc3NMaXN0LmNvbnRhaW5zKCdmb2xkYWJsZScpXG4gICAgICBAb25Nb3VzZURvd24oZXZlbnQpXG5cbiAgb25DbGljazogKGV2ZW50KSA9PlxuICAgIHt0YXJnZXR9ID0gZXZlbnRcbiAgICBsaW5lTnVtYmVyID0gdGFyZ2V0LnBhcmVudE5vZGVcblxuICAgIGlmIHRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ2ljb24tcmlnaHQnKVxuICAgICAgYnVmZmVyUm93ID0gcGFyc2VJbnQobGluZU51bWJlci5nZXRBdHRyaWJ1dGUoJ2RhdGEtYnVmZmVyLXJvdycpKVxuICAgICAgaWYgbGluZU51bWJlci5jbGFzc0xpc3QuY29udGFpbnMoJ2ZvbGRlZCcpXG4gICAgICAgIEBlZGl0b3IudW5mb2xkQnVmZmVyUm93KGJ1ZmZlclJvdylcbiAgICAgIGVsc2UgaWYgbGluZU51bWJlci5jbGFzc0xpc3QuY29udGFpbnMoJ2ZvbGRhYmxlJylcbiAgICAgICAgQGVkaXRvci5mb2xkQnVmZmVyUm93KGJ1ZmZlclJvdylcbiJdfQ==
