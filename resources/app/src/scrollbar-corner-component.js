(function() {
  var ScrollbarCornerComponent;

  module.exports = ScrollbarCornerComponent = (function() {
    function ScrollbarCornerComponent() {
      this.domNode = document.createElement('div');
      this.domNode.classList.add('scrollbar-corner');
      this.contentNode = document.createElement('div');
      this.domNode.appendChild(this.contentNode);
    }

    ScrollbarCornerComponent.prototype.getDomNode = function() {
      return this.domNode;
    };

    ScrollbarCornerComponent.prototype.updateSync = function(state) {
      var newHorizontalState, newVerticalState;
      if (this.oldState == null) {
        this.oldState = {};
      }
      if (this.newState == null) {
        this.newState = {};
      }
      newHorizontalState = state.horizontalScrollbar;
      newVerticalState = state.verticalScrollbar;
      this.newState.visible = newHorizontalState.visible && newVerticalState.visible;
      this.newState.height = newHorizontalState.height;
      this.newState.width = newVerticalState.width;
      if (this.newState.visible !== this.oldState.visible) {
        if (this.newState.visible) {
          this.domNode.style.display = '';
        } else {
          this.domNode.style.display = 'none';
        }
        this.oldState.visible = this.newState.visible;
      }
      if (this.newState.height !== this.oldState.height) {
        this.domNode.style.height = this.newState.height + 'px';
        this.contentNode.style.height = this.newState.height + 1 + 'px';
        this.oldState.height = this.newState.height;
      }
      if (this.newState.width !== this.oldState.width) {
        this.domNode.style.width = this.newState.width + 'px';
        this.contentNode.style.width = this.newState.width + 1 + 'px';
        return this.oldState.width = this.newState.width;
      }
    };

    return ScrollbarCornerComponent;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3Njcm9sbGJhci1jb3JuZXItY29tcG9uZW50LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNTLGtDQUFBO01BQ1gsSUFBQyxDQUFBLE9BQUQsR0FBVyxRQUFRLENBQUMsYUFBVCxDQUF1QixLQUF2QjtNQUNYLElBQUMsQ0FBQSxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQW5CLENBQXVCLGtCQUF2QjtNQUVBLElBQUMsQ0FBQSxXQUFELEdBQWUsUUFBUSxDQUFDLGFBQVQsQ0FBdUIsS0FBdkI7TUFDZixJQUFDLENBQUEsT0FBTyxDQUFDLFdBQVQsQ0FBcUIsSUFBQyxDQUFBLFdBQXRCO0lBTFc7O3VDQU9iLFVBQUEsR0FBWSxTQUFBO2FBQ1YsSUFBQyxDQUFBO0lBRFM7O3VDQUdaLFVBQUEsR0FBWSxTQUFDLEtBQUQ7QUFDVixVQUFBOztRQUFBLElBQUMsQ0FBQSxXQUFZOzs7UUFDYixJQUFDLENBQUEsV0FBWTs7TUFFYixrQkFBQSxHQUFxQixLQUFLLENBQUM7TUFDM0IsZ0JBQUEsR0FBbUIsS0FBSyxDQUFDO01BQ3pCLElBQUMsQ0FBQSxRQUFRLENBQUMsT0FBVixHQUFvQixrQkFBa0IsQ0FBQyxPQUFuQixJQUErQixnQkFBZ0IsQ0FBQztNQUNwRSxJQUFDLENBQUEsUUFBUSxDQUFDLE1BQVYsR0FBbUIsa0JBQWtCLENBQUM7TUFDdEMsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLEdBQWtCLGdCQUFnQixDQUFDO01BRW5DLElBQUcsSUFBQyxDQUFBLFFBQVEsQ0FBQyxPQUFWLEtBQXVCLElBQUMsQ0FBQSxRQUFRLENBQUMsT0FBcEM7UUFDRSxJQUFHLElBQUMsQ0FBQSxRQUFRLENBQUMsT0FBYjtVQUNFLElBQUMsQ0FBQSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQWYsR0FBeUIsR0FEM0I7U0FBQSxNQUFBO1VBR0UsSUFBQyxDQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBZixHQUF5QixPQUgzQjs7UUFJQSxJQUFDLENBQUEsUUFBUSxDQUFDLE9BQVYsR0FBb0IsSUFBQyxDQUFBLFFBQVEsQ0FBQyxRQUxoQzs7TUFPQSxJQUFHLElBQUMsQ0FBQSxRQUFRLENBQUMsTUFBVixLQUFzQixJQUFDLENBQUEsUUFBUSxDQUFDLE1BQW5DO1FBQ0UsSUFBQyxDQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBZixHQUF3QixJQUFDLENBQUEsUUFBUSxDQUFDLE1BQVYsR0FBbUI7UUFDM0MsSUFBQyxDQUFBLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBbkIsR0FBNEIsSUFBQyxDQUFBLFFBQVEsQ0FBQyxNQUFWLEdBQW1CLENBQW5CLEdBQXVCO1FBQ25ELElBQUMsQ0FBQSxRQUFRLENBQUMsTUFBVixHQUFtQixJQUFDLENBQUEsUUFBUSxDQUFDLE9BSC9COztNQUtBLElBQUcsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLEtBQXFCLElBQUMsQ0FBQSxRQUFRLENBQUMsS0FBbEM7UUFDRSxJQUFDLENBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFmLEdBQXVCLElBQUMsQ0FBQSxRQUFRLENBQUMsS0FBVixHQUFrQjtRQUN6QyxJQUFDLENBQUEsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFuQixHQUEyQixJQUFDLENBQUEsUUFBUSxDQUFDLEtBQVYsR0FBa0IsQ0FBbEIsR0FBc0I7ZUFDakQsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLEdBQWtCLElBQUMsQ0FBQSxRQUFRLENBQUMsTUFIOUI7O0lBdEJVOzs7OztBQVpkIiwic291cmNlc0NvbnRlbnQiOlsibW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgU2Nyb2xsYmFyQ29ybmVyQ29tcG9uZW50XG4gIGNvbnN0cnVjdG9yOiAtPlxuICAgIEBkb21Ob2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICBAZG9tTm9kZS5jbGFzc0xpc3QuYWRkKCdzY3JvbGxiYXItY29ybmVyJylcblxuICAgIEBjb250ZW50Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgQGRvbU5vZGUuYXBwZW5kQ2hpbGQoQGNvbnRlbnROb2RlKVxuXG4gIGdldERvbU5vZGU6IC0+XG4gICAgQGRvbU5vZGVcblxuICB1cGRhdGVTeW5jOiAoc3RhdGUpIC0+XG4gICAgQG9sZFN0YXRlID89IHt9XG4gICAgQG5ld1N0YXRlID89IHt9XG5cbiAgICBuZXdIb3Jpem9udGFsU3RhdGUgPSBzdGF0ZS5ob3Jpem9udGFsU2Nyb2xsYmFyXG4gICAgbmV3VmVydGljYWxTdGF0ZSA9IHN0YXRlLnZlcnRpY2FsU2Nyb2xsYmFyXG4gICAgQG5ld1N0YXRlLnZpc2libGUgPSBuZXdIb3Jpem9udGFsU3RhdGUudmlzaWJsZSBhbmQgbmV3VmVydGljYWxTdGF0ZS52aXNpYmxlXG4gICAgQG5ld1N0YXRlLmhlaWdodCA9IG5ld0hvcml6b250YWxTdGF0ZS5oZWlnaHRcbiAgICBAbmV3U3RhdGUud2lkdGggPSBuZXdWZXJ0aWNhbFN0YXRlLndpZHRoXG5cbiAgICBpZiBAbmV3U3RhdGUudmlzaWJsZSBpc250IEBvbGRTdGF0ZS52aXNpYmxlXG4gICAgICBpZiBAbmV3U3RhdGUudmlzaWJsZVxuICAgICAgICBAZG9tTm9kZS5zdHlsZS5kaXNwbGF5ID0gJydcbiAgICAgIGVsc2VcbiAgICAgICAgQGRvbU5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICAgICAgQG9sZFN0YXRlLnZpc2libGUgPSBAbmV3U3RhdGUudmlzaWJsZVxuXG4gICAgaWYgQG5ld1N0YXRlLmhlaWdodCBpc250IEBvbGRTdGF0ZS5oZWlnaHRcbiAgICAgIEBkb21Ob2RlLnN0eWxlLmhlaWdodCA9IEBuZXdTdGF0ZS5oZWlnaHQgKyAncHgnXG4gICAgICBAY29udGVudE5vZGUuc3R5bGUuaGVpZ2h0ID0gQG5ld1N0YXRlLmhlaWdodCArIDEgKyAncHgnXG4gICAgICBAb2xkU3RhdGUuaGVpZ2h0ID0gQG5ld1N0YXRlLmhlaWdodFxuXG4gICAgaWYgQG5ld1N0YXRlLndpZHRoIGlzbnQgQG9sZFN0YXRlLndpZHRoXG4gICAgICBAZG9tTm9kZS5zdHlsZS53aWR0aCA9IEBuZXdTdGF0ZS53aWR0aCArICdweCdcbiAgICAgIEBjb250ZW50Tm9kZS5zdHlsZS53aWR0aCA9IEBuZXdTdGF0ZS53aWR0aCArIDEgKyAncHgnXG4gICAgICBAb2xkU3RhdGUud2lkdGggPSBAbmV3U3RhdGUud2lkdGhcbiJdfQ==
