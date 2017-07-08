(function() {
  var CustomGutterComponent, GutterContainerComponent, LineNumberGutterComponent, _;

  _ = require('underscore-plus');

  CustomGutterComponent = require('./custom-gutter-component');

  LineNumberGutterComponent = require('./line-number-gutter-component');

  module.exports = GutterContainerComponent = (function() {
    function GutterContainerComponent(arg) {
      this.onLineNumberGutterMouseDown = arg.onLineNumberGutterMouseDown, this.editor = arg.editor, this.domElementPool = arg.domElementPool, this.views = arg.views;
      this.gutterComponents = [];
      this.gutterComponentsByGutterName = {};
      this.lineNumberGutterComponent = null;
      this.domNode = document.createElement('div');
      this.domNode.classList.add('gutter-container');
      this.domNode.style.display = 'flex';
    }

    GutterContainerComponent.prototype.destroy = function() {
      var component, i, len, ref;
      ref = this.gutterComponents;
      for (i = 0, len = ref.length; i < len; i++) {
        component = ref[i].component;
        if (typeof component.destroy === "function") {
          component.destroy();
        }
      }
    };

    GutterContainerComponent.prototype.getDomNode = function() {
      return this.domNode;
    };

    GutterContainerComponent.prototype.getLineNumberGutterComponent = function() {
      return this.lineNumberGutterComponent;
    };

    GutterContainerComponent.prototype.updateSync = function(state) {
      var content, gutter, gutterComponent, gutterSubstate, i, len, newGutterComponents, newGutterComponentsByGutterName, newState, ref, styles, visible;
      newState = state.gutters;
      newGutterComponents = [];
      newGutterComponentsByGutterName = {};
      for (i = 0, len = newState.length; i < len; i++) {
        ref = newState[i], gutter = ref.gutter, visible = ref.visible, styles = ref.styles, content = ref.content;
        gutterComponent = this.gutterComponentsByGutterName[gutter.name];
        if (!gutterComponent) {
          if (gutter.name === 'line-number') {
            gutterComponent = new LineNumberGutterComponent({
              onMouseDown: this.onLineNumberGutterMouseDown,
              editor: this.editor,
              gutter: gutter,
              domElementPool: this.domElementPool,
              views: this.views
            });
            this.lineNumberGutterComponent = gutterComponent;
          } else {
            gutterComponent = new CustomGutterComponent({
              gutter: gutter,
              views: this.views
            });
          }
        }
        if (visible) {
          gutterComponent.showNode();
        } else {
          gutterComponent.hideNode();
        }
        if (gutter.name === 'line-number') {
          gutterSubstate = _.clone(content);
          gutterSubstate.styles = styles;
        } else {
          gutterSubstate = {
            content: content,
            styles: styles
          };
        }
        gutterComponent.updateSync(gutterSubstate);
        newGutterComponents.push({
          name: gutter.name,
          component: gutterComponent
        });
        newGutterComponentsByGutterName[gutter.name] = gutterComponent;
      }
      this.reorderGutters(newGutterComponents, newGutterComponentsByGutterName);
      this.gutterComponents = newGutterComponents;
      return this.gutterComponentsByGutterName = newGutterComponentsByGutterName;
    };


    /*
    Section: Private Methods
     */

    GutterContainerComponent.prototype.reorderGutters = function(newGutterComponents, newGutterComponentsByGutterName) {
      var existingGutterComponent, existingGutterComponentDescription, gutterComponent, gutterComponentDescription, gutterName, i, indexInOldGutters, j, len, len1, matchingGutterFound, oldGuttersLength, ref, results;
      indexInOldGutters = 0;
      oldGuttersLength = this.gutterComponents.length;
      for (i = 0, len = newGutterComponents.length; i < len; i++) {
        gutterComponentDescription = newGutterComponents[i];
        gutterComponent = gutterComponentDescription.component;
        gutterName = gutterComponentDescription.name;
        if (this.gutterComponentsByGutterName[gutterName]) {
          matchingGutterFound = false;
          while (indexInOldGutters < oldGuttersLength) {
            existingGutterComponentDescription = this.gutterComponents[indexInOldGutters];
            existingGutterComponent = existingGutterComponentDescription.component;
            indexInOldGutters++;
            if (existingGutterComponent === gutterComponent) {
              matchingGutterFound = true;
              break;
            }
          }
          if (!matchingGutterFound) {
            gutterComponent.getDomNode().remove();
            this.domNode.appendChild(gutterComponent.getDomNode());
          }
        } else {
          if (indexInOldGutters === oldGuttersLength) {
            this.domNode.appendChild(gutterComponent.getDomNode());
          } else {
            this.domNode.insertBefore(gutterComponent.getDomNode(), this.domNode.children[indexInOldGutters]);
            indexInOldGutters += 1;
          }
        }
      }
      ref = this.gutterComponents;
      results = [];
      for (j = 0, len1 = ref.length; j < len1; j++) {
        gutterComponentDescription = ref[j];
        if (!newGutterComponentsByGutterName[gutterComponentDescription.name]) {
          gutterComponent = gutterComponentDescription.component;
          results.push(gutterComponent.getDomNode().remove());
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    return GutterContainerComponent;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2d1dHRlci1jb250YWluZXItY29tcG9uZW50LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxpQkFBUjs7RUFDSixxQkFBQSxHQUF3QixPQUFBLENBQVEsMkJBQVI7O0VBQ3hCLHlCQUFBLEdBQTRCLE9BQUEsQ0FBUSxnQ0FBUjs7RUFLNUIsTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNTLGtDQUFDLEdBQUQ7TUFBRSxJQUFDLENBQUEsa0NBQUEsNkJBQTZCLElBQUMsQ0FBQSxhQUFBLFFBQVEsSUFBQyxDQUFBLHFCQUFBLGdCQUFnQixJQUFDLENBQUEsWUFBQTtNQUV0RSxJQUFDLENBQUEsZ0JBQUQsR0FBb0I7TUFDcEIsSUFBQyxDQUFBLDRCQUFELEdBQWdDO01BQ2hDLElBQUMsQ0FBQSx5QkFBRCxHQUE2QjtNQUU3QixJQUFDLENBQUEsT0FBRCxHQUFXLFFBQVEsQ0FBQyxhQUFULENBQXVCLEtBQXZCO01BQ1gsSUFBQyxDQUFBLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBbkIsQ0FBdUIsa0JBQXZCO01BQ0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBZixHQUF5QjtJQVJkOzt1Q0FVYixPQUFBLEdBQVMsU0FBQTtBQUNQLFVBQUE7QUFBQTtBQUFBLFdBQUEscUNBQUE7UUFBSzs7VUFDSCxTQUFTLENBQUM7O0FBRFo7SUFETzs7dUNBS1QsVUFBQSxHQUFZLFNBQUE7YUFDVixJQUFDLENBQUE7SUFEUzs7dUNBR1osNEJBQUEsR0FBOEIsU0FBQTthQUM1QixJQUFDLENBQUE7SUFEMkI7O3VDQUc5QixVQUFBLEdBQVksU0FBQyxLQUFEO0FBR1YsVUFBQTtNQUFBLFFBQUEsR0FBVyxLQUFLLENBQUM7TUFFakIsbUJBQUEsR0FBc0I7TUFDdEIsK0JBQUEs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QSxpQkFBQSxDQUF0RTtZQUNBLGlCQUFBLElBQXFCLEVBSnZCO1dBbEJGOztBQUpGO0FBNkJBO0FBQUE7V0FBQSx1Q0FBQTs7UUFDRSxJQUFHLENBQUksK0JBQWdDLENBQUEsMEJBQTBCLENBQUMsSUFBM0IsQ0FBdkM7VUFDRSxlQUFBLEdBQWtCLDBCQUEwQixDQUFDO3VCQUM3QyxlQUFlLENBQUMsVUFBaEIsQ0FBQSxDQUE0QixDQUFDLE1BQTdCLENBQUEsR0FGRjtTQUFBLE1BQUE7K0JBQUE7O0FBREY7O0lBbENjOzs7OztBQTFFbEIiLCJzb3VyY2VzQ29udGVudCI6WyJfID0gcmVxdWlyZSAndW5kZXJzY29yZS1wbHVzJ1xuQ3VzdG9tR3V0dGVyQ29tcG9uZW50ID0gcmVxdWlyZSAnLi9jdXN0b20tZ3V0dGVyLWNvbXBvbmVudCdcbkxpbmVOdW1iZXJHdXR0ZXJDb21wb25lbnQgPSByZXF1aXJlICcuL2xpbmUtbnVtYmVyLWd1dHRlci1jb21wb25lbnQnXG5cbiMgVGhlIEd1dHRlckNvbnRhaW5lckNvbXBvbmVudCBtYW5hZ2VzIHRoZSBHdXR0ZXJDb21wb25lbnRzIG9mIGEgcGFydGljdWxhclxuIyBUZXh0RWRpdG9yQ29tcG9uZW50LlxuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBHdXR0ZXJDb250YWluZXJDb21wb25lbnRcbiAgY29uc3RydWN0b3I6ICh7QG9uTGluZU51bWJlckd1dHRlck1vdXNlRG93biwgQGVkaXRvciwgQGRvbUVsZW1lbnRQb29sLCBAdmlld3N9KSAtPlxuICAgICMgQW4gYXJyYXkgb2Ygb2JqZWN0cyBvZiB0aGUgZm9ybToge25hbWU6IHtTdHJpbmd9LCBjb21wb25lbnQ6IHtPYmplY3R9fVxuICAgIEBndXR0ZXJDb21wb25lbnRzID0gW11cbiAgICBAZ3V0dGVyQ29tcG9uZW50c0J5R3V0dGVyTmFtZSA9IHt9XG4gICAgQGxpbmVOdW1iZXJHdXR0ZXJDb21wb25lbnQgPSBudWxsXG5cbiAgICBAZG9tTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgQGRvbU5vZGUuY2xhc3NMaXN0LmFkZCgnZ3V0dGVyLWNvbnRhaW5lcicpXG4gICAgQGRvbU5vZGUuc3R5bGUuZGlzcGxheSA9ICdmbGV4J1xuXG4gIGRlc3Ryb3k6IC0+XG4gICAgZm9yIHtjb21wb25lbnR9IGluIEBndXR0ZXJDb21wb25lbnRzXG4gICAgICBjb21wb25lbnQuZGVzdHJveT8oKVxuICAgIHJldHVyblxuXG4gIGdldERvbU5vZGU6IC0+XG4gICAgQGRvbU5vZGVcblxuICBnZXRMaW5lTnVtYmVyR3V0dGVyQ29tcG9uZW50OiAtPlxuICAgIEBsaW5lTnVtYmVyR3V0dGVyQ29tcG9uZW50XG5cbiAgdXBkYXRlU3luYzogKHN0YXRlKSAtPlxuICAgICMgVGhlIEd1dHRlckNvbnRhaW5lckNvbXBvbmVudCBleHBlY3RzIHRoZSBndXR0ZXJzIHRvIGJlIHNvcnRlZCBpbiB0aGUgb3JkZXJcbiAgICAjIHRoZXkgc2hvdWxkIGFwcGVhci5cbiAgICBuZXdTdGF0ZSA9IHN0YXRlLmd1dHRlcnNcblxuICAgIG5ld0d1dHRlckNvbXBvbmVudHMgPSBbXVxuICAgIG5ld0d1dHRlckNvbXBvbmVudHNCeUd1dHRlck5hbWUgPSB7fVxuICAgIGZvciB7Z3V0dGVyLCB2aXNpYmxlLCBzdHlsZXMsIGNvbnRlbnR9IGluIG5ld1N0YXRlXG4gICAgICBndXR0ZXJDb21wb25lbnQgPSBAZ3V0dGVyQ29tcG9uZW50c0J5R3V0dGVyTmFtZVtndXR0ZXIubmFtZV1cbiAgICAgIGlmIG5vdCBndXR0ZXJDb21wb25lbnRcbiAgICAgICAgaWYgZ3V0dGVyLm5hbWUgaXMgJ2xpbmUtbnVtYmVyJ1xuICAgICAgICAgIGd1dHRlckNvbXBvbmVudCA9IG5ldyBMaW5lTnVtYmVyR3V0dGVyQ29tcG9uZW50KHtvbk1vdXNlRG93bjogQG9uTGluZU51bWJlckd1dHRlck1vdXNlRG93biwgQGVkaXRvciwgZ3V0dGVyLCBAZG9tRWxlbWVudFBvb2wsIEB2aWV3c30pXG4gICAgICAgICAgQGxpbmVOdW1iZXJHdXR0ZXJDb21wb25lbnQgPSBndXR0ZXJDb21wb25lbnRcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGd1dHRlckNvbXBvbmVudCA9IG5ldyBDdXN0b21HdXR0ZXJDb21wb25lbnQoe2d1dHRlciwgQHZpZXdzfSlcblxuICAgICAgaWYgdmlzaWJsZSB0aGVuIGd1dHRlckNvbXBvbmVudC5zaG93Tm9kZSgpIGVsc2UgZ3V0dGVyQ29tcG9uZW50LmhpZGVOb2RlKClcbiAgICAgICMgUGFzcyB0aGUgZ3V0dGVyIG9ubHkgdGhlIHN0YXRlIHRoYXQgaXQgbmVlZHMuXG4gICAgICBpZiBndXR0ZXIubmFtZSBpcyAnbGluZS1udW1iZXInXG4gICAgICAgICMgRm9yIGVhc2Ugb2YgdXNlIGluIHRoZSBsaW5lIG51bWJlciBndXR0ZXIgY29tcG9uZW50LCBzZXQgdGhlIHNoYXJlZFxuICAgICAgICAjICdzdHlsZXMnIGFzIGEgZmllbGQgdW5kZXIgdGhlICdjb250ZW50Jy5cbiAgICAgICAgZ3V0dGVyU3Vic3RhdGUgPSBfLmNsb25lKGNvbnRlbnQpXG4gICAgICAgIGd1dHRlclN1YnN0YXRlLnN0eWxlcyA9IHN0eWxlc1xuICAgICAgZWxzZVxuICAgICAgICAjIEN1c3RvbSBndXR0ZXIgJ2NvbnRlbnQnIGlzIGtleWVkIG9uIGd1dHRlciBuYW1lLCBzbyB3ZSBjYW5ub3Qgc2V0XG4gICAgICAgICMgJ3N0eWxlcycgYXMgYSBzdWJmaWVsZCBkaXJlY3RseSB1bmRlciBpdC5cbiAgICAgICAgZ3V0dGVyU3Vic3RhdGUgPSB7Y29udGVudCwgc3R5bGVzfVxuICAgICAgZ3V0dGVyQ29tcG9uZW50LnVwZGF0ZVN5bmMoZ3V0dGVyU3Vic3RhdGUpXG5cbiAgICAgIG5ld0d1dHRlckNvbXBvbmVudHMucHVzaCh7XG4gICAgICAgIG5hbWU6IGd1dHRlci5uYW1lLFxuICAgICAgICBjb21wb25lbnQ6IGd1dHRlckNvbXBvbmVudCxcbiAgICAgIH0pXG4gICAgICBuZXdHdXR0ZXJDb21wb25lbnRzQnlHdXR0ZXJOYW1lW2d1dHRlci5uYW1lXSA9IGd1dHRlckNvbXBvbmVudFxuXG4gICAgQHJlb3JkZXJHdXR0ZXJzKG5ld0d1dHRlckNvbXBvbmVudHMsIG5ld0d1dHRlckNvbXBvbmVudHNCeUd1dHRlck5hbWUpXG5cbiAgICBAZ3V0dGVyQ29tcG9uZW50cyA9IG5ld0d1dHRlckNvbXBvbmVudHNcbiAgICBAZ3V0dGVyQ29tcG9uZW50c0J5R3V0dGVyTmFtZSA9IG5ld0d1dHRlckNvbXBvbmVudHNCeUd1dHRlck5hbWVcblxuICAjIyNcbiAgU2VjdGlvbjogUHJpdmF0ZSBNZXRob2RzXG4gICMjI1xuXG4gIHJlb3JkZXJHdXR0ZXJzOiAobmV3R3V0dGVyQ29tcG9uZW50cywgbmV3R3V0dGVyQ29tcG9uZW50c0J5R3V0dGVyTmFtZSkgLT5cbiAgICAjIEZpcnN0LCBpbnNlcnQgbmV3IGd1dHRlcnMgaW50byB0aGUgRE9NLlxuICAgIGluZGV4SW5PbGRHdXR0ZXJzID0gMFxuICAgIG9sZEd1dHRlcnNMZW5ndGggPSBAZ3V0dGVyQ29tcG9uZW50cy5sZW5ndGhcblxuICAgIGZvciBndXR0ZXJDb21wb25lbnREZXNjcmlwdGlvbiBpbiBuZXdHdXR0ZXJDb21wb25lbnRzXG4gICAgICBndXR0ZXJDb21wb25lbnQgPSBndXR0ZXJDb21wb25lbnREZXNjcmlwdGlvbi5jb21wb25lbnRcbiAgICAgIGd1dHRlck5hbWUgPSBndXR0ZXJDb21wb25lbnREZXNjcmlwdGlvbi5uYW1lXG5cbiAgICAgIGlmIEBndXR0ZXJDb21wb25lbnRzQnlHdXR0ZXJOYW1lW2d1dHRlck5hbWVdXG4gICAgICAgICMgSWYgdGhlIGd1dHRlciBleGlzdGVkIHByZXZpb3VzbHksIHdlIGZpcnN0IHRyeSB0byBtb3ZlIHRoZSBjdXJzb3IgdG9cbiAgICAgICAgIyB0aGUgcG9pbnQgYXQgd2hpY2ggaXQgb2NjdXJzIGluIHRoZSBwcmV2aW91cyBndXR0ZXJzLlxuICAgICAgICBtYXRjaGluZ0d1dHRlckZvdW5kID0gZmFsc2VcbiAgICAgICAgd2hpbGUgaW5kZXhJbk9sZEd1dHRlcnMgPCBvbGRHdXR0ZXJzTGVuZ3RoXG4gICAgICAgICAgZXhpc3RpbmdHdXR0ZXJDb21wb25lbnREZXNjcmlwdGlvbiA9IEBndXR0ZXJDb21wb25lbnRzW2luZGV4SW5PbGRHdXR0ZXJzXVxuICAgICAgICAgIGV4aXN0aW5nR3V0dGVyQ29tcG9uZW50ID0gZXhpc3RpbmdHdXR0ZXJDb21wb25lbnREZXNjcmlwdGlvbi5jb21wb25lbnRcbiAgICAgICAgICBpbmRleEluT2xkR3V0dGVycysrXG4gICAgICAgICAgaWYgZXhpc3RpbmdHdXR0ZXJDb21wb25lbnQgaXMgZ3V0dGVyQ29tcG9uZW50XG4gICAgICAgICAgICBtYXRjaGluZ0d1dHRlckZvdW5kID0gdHJ1ZVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgaWYgbm90IG1hdGNoaW5nR3V0dGVyRm91bmRcbiAgICAgICAgICAjIElmIHdlJ3ZlIHJlYWNoZWQgdGhpcyBwb2ludCwgdGhlIGd1dHRlciBwcmV2aW91c2x5IGV4aXN0ZWQsIGJ1dCBpdHNcbiAgICAgICAgICAjIHBvc2l0aW9uIGhhcyBtb3ZlZC4gUmVtb3ZlIGl0IGZyb20gdGhlIERPTSBhbmQgcmUtaW5zZXJ0IGl0LlxuICAgICAgICAgIGd1dHRlckNvbXBvbmVudC5nZXREb21Ob2RlKCkucmVtb3ZlKClcbiAgICAgICAgICBAZG9tTm9kZS5hcHBlbmRDaGlsZChndXR0ZXJDb21wb25lbnQuZ2V0RG9tTm9kZSgpKVxuXG4gICAgICBlbHNlXG4gICAgICAgIGlmIGluZGV4SW5PbGRHdXR0ZXJzIGlzIG9sZEd1dHRlcnNMZW5ndGhcbiAgICAgICAgICBAZG9tTm9kZS5hcHBlbmRDaGlsZChndXR0ZXJDb21wb25lbnQuZ2V0RG9tTm9kZSgpKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgQGRvbU5vZGUuaW5zZXJ0QmVmb3JlKGd1dHRlckNvbXBvbmVudC5nZXREb21Ob2RlKCksIEBkb21Ob2RlLmNoaWxkcmVuW2luZGV4SW5PbGRHdXR0ZXJzXSlcbiAgICAgICAgICBpbmRleEluT2xkR3V0dGVycyArPSAxXG5cbiAgICAjIFJlbW92ZSBhbnkgZ3V0dGVycyB0aGF0IHdlcmUgbm90IHByZXNlbnQgaW4gdGhlIG5ldyBndXR0ZXJzIHN0YXRlLlxuICAgIGZvciBndXR0ZXJDb21wb25lbnREZXNjcmlwdGlvbiBpbiBAZ3V0dGVyQ29tcG9uZW50c1xuICAgICAgaWYgbm90IG5ld0d1dHRlckNvbXBvbmVudHNCeUd1dHRlck5hbWVbZ3V0dGVyQ29tcG9uZW50RGVzY3JpcHRpb24ubmFtZV1cbiAgICAgICAgZ3V0dGVyQ29tcG9uZW50ID0gZ3V0dGVyQ29tcG9uZW50RGVzY3JpcHRpb24uY29tcG9uZW50XG4gICAgICAgIGd1dHRlckNvbXBvbmVudC5nZXREb21Ob2RlKCkucmVtb3ZlKClcbiJdfQ==
