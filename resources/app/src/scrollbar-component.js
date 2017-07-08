(function() {
  var ScrollbarComponent,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  module.exports = ScrollbarComponent = (function() {
    function ScrollbarComponent(arg) {
      this.orientation = arg.orientation, this.onScroll = arg.onScroll;
      this.onScrollCallback = bind(this.onScrollCallback, this);
      this.domNode = document.createElement('div');
      this.domNode.classList.add(this.orientation + "-scrollbar");
      this.domNode.style['-webkit-transform'] = 'translateZ(0)';
      if (this.orientation === 'horizontal') {
        this.domNode.style.left = 0;
      }
      this.contentNode = document.createElement('div');
      this.contentNode.classList.add("scrollbar-content");
      this.domNode.appendChild(this.contentNode);
      this.domNode.addEventListener('scroll', this.onScrollCallback);
    }

    ScrollbarComponent.prototype.destroy = function() {
      this.domNode.removeEventListener('scroll', this.onScrollCallback);
      return this.onScroll = null;
    };

    ScrollbarComponent.prototype.getDomNode = function() {
      return this.domNode;
    };

    ScrollbarComponent.prototype.updateSync = function(state) {
      if (this.oldState == null) {
        this.oldState = {};
      }
      switch (this.orientation) {
        case 'vertical':
          this.newState = state.verticalScrollbar;
          this.updateVertical();
          break;
        case 'horizontal':
          this.newState = state.horizontalScrollbar;
          this.updateHorizontal();
      }
      if (this.newState.visible !== this.oldState.visible) {
        if (this.newState.visible) {
          this.domNode.style.display = '';
        } else {
          this.domNode.style.display = 'none';
        }
        return this.oldState.visible = this.newState.visible;
      }
    };

    ScrollbarComponent.prototype.updateVertical = function() {
      if (this.newState.width !== this.oldState.width) {
        this.domNode.style.width = this.newState.width + 'px';
        this.oldState.width = this.newState.width;
      }
      if (this.newState.bottom !== this.oldState.bottom) {
        this.domNode.style.bottom = this.newState.bottom + 'px';
        this.oldState.bottom = this.newState.bottom;
      }
      if (this.newState.scrollHeight !== this.oldState.scrollHeight) {
        this.contentNode.style.height = this.newState.scrollHeight + 'px';
        this.oldState.scrollHeight = this.newState.scrollHeight;
      }
      if (this.newState.scrollTop !== this.oldState.scrollTop) {
        this.domNode.scrollTop = this.newState.scrollTop;
        return this.oldState.scrollTop = this.newState.scrollTop;
      }
    };

    ScrollbarComponent.prototype.updateHorizontal = function() {
      if (this.newState.height !== this.oldState.height) {
        this.domNode.style.height = this.newState.height + 'px';
        this.oldState.height = this.newState.height;
      }
      if (this.newState.right !== this.oldState.right) {
        this.domNode.style.right = this.newState.right + 'px';
        this.oldState.right = this.newState.right;
      }
      if (this.newState.scrollWidth !== this.oldState.scrollWidth) {
        this.contentNode.style.width = this.newState.scrollWidth + 'px';
        this.oldState.scrollWidth = this.newState.scrollWidth;
      }
      if (this.newState.scrollLeft !== this.oldState.scrollLeft) {
        this.domNode.scrollLeft = this.newState.scrollLeft;
        return this.oldState.scrollLeft = this.newState.scrollLeft;
      }
    };

    ScrollbarComponent.prototype.onScrollCallback = function() {
      switch (this.orientation) {
        case 'vertical':
          return this.onScroll(this.domNode.scrollTop);
        case 'horizontal':
          return this.onScroll(this.domNode.scrollLeft);
      }
    };

    return ScrollbarComponent;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3Njcm9sbGJhci1jb21wb25lbnQuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSxrQkFBQTtJQUFBOztFQUFBLE1BQU0sQ0FBQyxPQUFQLEdBQ007SUFDUyw0QkFBQyxHQUFEO01BQUUsSUFBQyxDQUFBLGtCQUFBLGFBQWEsSUFBQyxDQUFBLGVBQUE7O01BQzVCLElBQUMsQ0FBQSxPQUFELEdBQVcsUUFBUSxDQUFDLGFBQVQsQ0FBdUIsS0FBdkI7TUFDWCxJQUFDLENBQUEsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFuQixDQUEwQixJQUFDLENBQUEsV0FBRixHQUFjLFlBQXZDO01BQ0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxLQUFNLENBQUEsbUJBQUEsQ0FBZixHQUFzQztNQUN0QyxJQUEyQixJQUFDLENBQUEsV0FBRCxLQUFnQixZQUEzQztRQUFBLElBQUMsQ0FBQSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQWYsR0FBc0IsRUFBdEI7O01BRUEsSUFBQyxDQUFBLFdBQUQsR0FBZSxRQUFRLENBQUMsYUFBVCxDQUF1QixLQUF2QjtNQUNmLElBQUMsQ0FBQSxXQUFXLENBQUMsU0FBUyxDQUFDLEdBQXZCLENBQTJCLG1CQUEzQjtNQUNBLElBQUMsQ0FBQSxPQUFPLENBQUMsV0FBVCxDQUFxQixJQUFDLENBQUEsV0FBdEI7TUFFQSxJQUFDLENBQUEsT0FBTyxDQUFDLGdCQUFULENBQTBCLFFBQTFCLEVBQW9DLElBQUMsQ0FBQSxnQkFBckM7SUFWVzs7aUNBWWIsT0FBQSxHQUFTLFNBQUE7TUFDUCxJQUFDLENBQUEsT0FBTyxDQUFDLG1CQUFULENBQTZCLFFBQTdCLEVBQXVDLElBQUMsQ0FBQSxnQkFBeEM7YUFDQSxJQUFDLENBQUEsUUFBRCxHQUFZO0lBRkw7O2lDQUlULFVBQUEsR0FBWSxTQUFBO2FBQ1YsSUFBQyxDQUFBO0lBRFM7O2lDQUdaLFVBQUEsR0FBWSxTQUFDLEtBQUQ7O1FBQ1YsSUFBQyxDQUFBLFdBQVk7O0FBQ2IsY0FBTyxJQUFDLENBQUEsV0FBUjtBQUFBLGFBQ08sVUFEUDtVQUVJLElBQUMsQ0FBQSxRQUFELEdBQVksS0FBSyxDQUFDO1VBQ2xCLElBQUMsQ0FBQSxjQUFELENBQUE7QUFGRztBQURQLGFBSU8sWUFKUDtVQUtJLElBQUMsQ0FBQSxRQUFELEdBQVksS0FBSyxDQUFDO1VBQ2xCLElBQUMsQ0FBQSxnQkFBRCxDQUFBO0FBTko7TUFRQSxJQUFHLElBQUMsQ0FBQSxRQUFRLENBQUMsT0FBVixLQUF1QixJQUFDLENBQUEsUUFBUSxDQUFDLE9BQXBDO1FBQ0UsSUFBRyxJQUFDLENBQUEsUUFBUSxDQUFDLE9BQWI7VUFDRSxJQUFDLENBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFmLEdBQXlCLEdBRDNCO1NBQUEsTUFBQTtVQUdFLElBQUMsQ0FBQSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQWYsR0FBeUIsT0FIM0I7O2VBSUEsSUFBQyxDQUFBLFFBQVEsQ0FBQyxPQUFWLEdBQW9CLElBQUMsQ0FBQSxRQUFRLENBQUMsUUFMaEM7O0lBVlU7O2lDQWlCWixjQUFBLEdBQWdCLFNBQUE7TUFDZCxJQUFHLElBQUMsQ0FBQSxRQUFRLENBQUMsS0FBVixLQUFxQixJQUFDLENBQUEsUUFBUSxDQUFDLEtBQWxDO1FBQ0UsSUFBQyxDQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBZixHQUF1QixJQUFDLENBQUEsUUFBUSxDQUFDLEtBQVYsR0FBa0I7UUFDekMsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLEdBQWtCLElBQUMsQ0FBQSxRQUFRLENBQUMsTUFGOUI7O01BSUEsSUFBRyxJQUFDLENBQUEsUUFBUSxDQUFDLE1BQVYsS0FBc0IsSUFBQyxDQUFBLFFBQVEsQ0FBQyxNQUFuQztRQUNFLElBQUMsQ0FBQSxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQWYsR0FBd0IsSUFBQyxDQUFBLFFBQVEsQ0FBQyxNQUFWLEdBQW1CO1FBQzNDLElBQUMsQ0FBQSxRQUFRLENBQUMsTUFBVixHQUFtQixJQUFDLENBQUEsUUFBUSxDQUFDLE9BRi9COztNQUlBLElBQUcsSUFBQyxDQUFBLFFBQVEsQ0FBQyxZQUFWLEtBQTRCLElBQUMsQ0FBQSxRQUFRLENBQUMsWUFBekM7UUFDRSxJQUFDLENBQUEsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFuQixHQUE0QixJQUFDLENBQUEsUUFBUSxDQUFDLFlBQVYsR0FBeUI7UUFDckQsSUFBQyxDQUFBLFFBQVEsQ0FBQyxZQUFWLEdBQXlCLElBQUMsQ0FBQSxRQUFRLENBQUMsYUFGckM7O01BSUEsSUFBRyxJQUFDLENBQUEsUUFBUSxDQUFDLFNBQVYsS0FBeUIsSUFBQyxDQUFBLFFBQVEsQ0FBQyxTQUF0QztRQUNFLElBQUMsQ0FBQSxPQUFPLENBQUMsU0FBVCxHQUFxQixJQUFDLENBQUEsUUFBUSxDQUFDO2VBQy9CLElBQUMsQ0FBQSxRQUFRLENBQUMsU0FBVixHQUFzQixJQUFDLENBQUEsUUFBUSxDQUFDLFVBRmxDOztJQWJjOztpQ0FpQmhCLGdCQUFBLEdBQWtCLFNBQUE7TUFDaEIsSUFBRyxJQUFDLENBQUEsUUFBUSxDQUFDLE1BQVYsS0FBc0IsSUFBQyxDQUFBLFFBQVEsQ0FBQyxNQUFuQztRQUNFLElBQUMsQ0FBQSxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQWYsR0FBd0IsSUFBQyxDQUFBLFFBQVEsQ0FBQyxNQUFWLEdBQW1CO1FBQzNDLElBQUMsQ0FBQSxRQUFRLENBQUMsTUFBVixHQUFtQixJQUFDLENBQUEsUUFBUSxDQUFDLE9BRi9COztNQUlBLElBQUcsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLEtBQXFCLElBQUMsQ0FBQSxRQUFRLENBQUMsS0FBbEM7UUFDRSxJQUFDLENBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFmLEdBQXVCLElBQUMsQ0FBQSxRQUFRLENBQUMsS0FBVixHQUFrQjtRQUN6QyxJQUFDLENBQUEsUUFBUSxDQUFDLEtBQVYsR0FBa0IsSUFBQyxDQUFBLFFBQVEsQ0FBQyxNQUY5Qjs7TUFJQSxJQUFHLElBQUMsQ0FBQSxRQUFRLENBQUMsV0FBVixLQUEyQixJQUFDLENBQUEsUUFBUSxDQUFDLFdBQXhDO1FBQ0UsSUFBQyxDQUFBLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBbkIsR0FBMkIsSUFBQyxDQUFBLFFBQVEsQ0FBQyxXQUFWLEdBQXdCO1FBQ25ELElBQUMsQ0FBQSxRQUFRLENBQUMsV0FBVixHQUF3QixJQUFDLENBQUEsUUFBUSxDQUFDLFlBRnBDOztNQUlBLElBQUcsSUFBQyxDQUFBLFFBQVEsQ0FBQyxVQUFWLEtBQTBCLElBQUMsQ0FBQSxRQUFRLENBQUMsVUFBdkM7UUFDRSxJQUFDLENBQUEsT0FBTyxDQUFDLFVBQVQsR0FBc0IsSUFBQyxDQUFBLFFBQVEsQ0FBQztlQUNoQyxJQUFDLENBQUEsUUFBUSxDQUFDLFVBQVYsR0FBdUIsSUFBQyxDQUFBLFFBQVEsQ0FBQyxXQUZuQzs7SUFiZ0I7O2lDQWtCbEIsZ0JBQUEsR0FBa0IsU0FBQTtBQUNoQixjQUFPLElBQUMsQ0FBQSxXQUFSO0FBQUEsYUFDTyxVQURQO2lCQUVJLElBQUMsQ0FBQSxRQUFELENBQVUsSUFBQyxDQUFBLE9BQU8sQ0FBQyxTQUFuQjtBQUZKLGFBR08sWUFIUDtpQkFJSSxJQUFDLENBQUEsUUFBRCxDQUFVLElBQUMsQ0FBQSxPQUFPLENBQUMsVUFBbkI7QUFKSjtJQURnQjs7Ozs7QUF6RXBCIiwic291cmNlc0NvbnRlbnQiOlsibW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgU2Nyb2xsYmFyQ29tcG9uZW50XG4gIGNvbnN0cnVjdG9yOiAoe0BvcmllbnRhdGlvbiwgQG9uU2Nyb2xsfSkgLT5cbiAgICBAZG9tTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgQGRvbU5vZGUuY2xhc3NMaXN0LmFkZCBcIiN7QG9yaWVudGF0aW9ufS1zY3JvbGxiYXJcIlxuICAgIEBkb21Ob2RlLnN0eWxlWyctd2Via2l0LXRyYW5zZm9ybSddID0gJ3RyYW5zbGF0ZVooMCknICMgU2VlIGF0b20vYXRvbSMzNTU5XG4gICAgQGRvbU5vZGUuc3R5bGUubGVmdCA9IDAgaWYgQG9yaWVudGF0aW9uIGlzICdob3Jpem9udGFsJ1xuXG4gICAgQGNvbnRlbnROb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICBAY29udGVudE5vZGUuY2xhc3NMaXN0LmFkZCBcInNjcm9sbGJhci1jb250ZW50XCJcbiAgICBAZG9tTm9kZS5hcHBlbmRDaGlsZChAY29udGVudE5vZGUpXG5cbiAgICBAZG9tTm9kZS5hZGRFdmVudExpc3RlbmVyICdzY3JvbGwnLCBAb25TY3JvbGxDYWxsYmFja1xuXG4gIGRlc3Ryb3k6IC0+XG4gICAgQGRvbU5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lciAnc2Nyb2xsJywgQG9uU2Nyb2xsQ2FsbGJhY2tcbiAgICBAb25TY3JvbGwgPSBudWxsXG5cbiAgZ2V0RG9tTm9kZTogLT5cbiAgICBAZG9tTm9kZVxuXG4gIHVwZGF0ZVN5bmM6IChzdGF0ZSkgLT5cbiAgICBAb2xkU3RhdGUgPz0ge31cbiAgICBzd2l0Y2ggQG9yaWVudGF0aW9uXG4gICAgICB3aGVuICd2ZXJ0aWNhbCdcbiAgICAgICAgQG5ld1N0YXRlID0gc3RhdGUudmVydGljYWxTY3JvbGxiYXJcbiAgICAgICAgQHVwZGF0ZVZlcnRpY2FsKClcbiAgICAgIHdoZW4gJ2hvcml6b250YWwnXG4gICAgICAgIEBuZXdTdGF0ZSA9IHN0YXRlLmhvcml6b250YWxTY3JvbGxiYXJcbiAgICAgICAgQHVwZGF0ZUhvcml6b250YWwoKVxuXG4gICAgaWYgQG5ld1N0YXRlLnZpc2libGUgaXNudCBAb2xkU3RhdGUudmlzaWJsZVxuICAgICAgaWYgQG5ld1N0YXRlLnZpc2libGVcbiAgICAgICAgQGRvbU5vZGUuc3R5bGUuZGlzcGxheSA9ICcnXG4gICAgICBlbHNlXG4gICAgICAgIEBkb21Ob2RlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSdcbiAgICAgIEBvbGRTdGF0ZS52aXNpYmxlID0gQG5ld1N0YXRlLnZpc2libGVcblxuICB1cGRhdGVWZXJ0aWNhbDogLT5cbiAgICBpZiBAbmV3U3RhdGUud2lkdGggaXNudCBAb2xkU3RhdGUud2lkdGhcbiAgICAgIEBkb21Ob2RlLnN0eWxlLndpZHRoID0gQG5ld1N0YXRlLndpZHRoICsgJ3B4J1xuICAgICAgQG9sZFN0YXRlLndpZHRoID0gQG5ld1N0YXRlLndpZHRoXG5cbiAgICBpZiBAbmV3U3RhdGUuYm90dG9tIGlzbnQgQG9sZFN0YXRlLmJvdHRvbVxuICAgICAgQGRvbU5vZGUuc3R5bGUuYm90dG9tID0gQG5ld1N0YXRlLmJvdHRvbSArICdweCdcbiAgICAgIEBvbGRTdGF0ZS5ib3R0b20gPSBAbmV3U3RhdGUuYm90dG9tXG5cbiAgICBpZiBAbmV3U3RhdGUuc2Nyb2xsSGVpZ2h0IGlzbnQgQG9sZFN0YXRlLnNjcm9sbEhlaWdodFxuICAgICAgQGNvbnRlbnROb2RlLnN0eWxlLmhlaWdodCA9IEBuZXdTdGF0ZS5zY3JvbGxIZWlnaHQgKyAncHgnXG4gICAgICBAb2xkU3RhdGUuc2Nyb2xsSGVpZ2h0ID0gQG5ld1N0YXRlLnNjcm9sbEhlaWdodFxuXG4gICAgaWYgQG5ld1N0YXRlLnNjcm9sbFRvcCBpc250IEBvbGRTdGF0ZS5zY3JvbGxUb3BcbiAgICAgIEBkb21Ob2RlLnNjcm9sbFRvcCA9IEBuZXdTdGF0ZS5zY3JvbGxUb3BcbiAgICAgIEBvbGRTdGF0ZS5zY3JvbGxUb3AgPSBAbmV3U3RhdGUuc2Nyb2xsVG9wXG5cbiAgdXBkYXRlSG9yaXpvbnRhbDogLT5cbiAgICBpZiBAbmV3U3RhdGUuaGVpZ2h0IGlzbnQgQG9sZFN0YXRlLmhlaWdodFxuICAgICAgQGRvbU5vZGUuc3R5bGUuaGVpZ2h0ID0gQG5ld1N0YXRlLmhlaWdodCArICdweCdcbiAgICAgIEBvbGRTdGF0ZS5oZWlnaHQgPSBAbmV3U3RhdGUuaGVpZ2h0XG5cbiAgICBpZiBAbmV3U3RhdGUucmlnaHQgaXNudCBAb2xkU3RhdGUucmlnaHRcbiAgICAgIEBkb21Ob2RlLnN0eWxlLnJpZ2h0ID0gQG5ld1N0YXRlLnJpZ2h0ICsgJ3B4J1xuICAgICAgQG9sZFN0YXRlLnJpZ2h0ID0gQG5ld1N0YXRlLnJpZ2h0XG5cbiAgICBpZiBAbmV3U3RhdGUuc2Nyb2xsV2lkdGggaXNudCBAb2xkU3RhdGUuc2Nyb2xsV2lkdGhcbiAgICAgIEBjb250ZW50Tm9kZS5zdHlsZS53aWR0aCA9IEBuZXdTdGF0ZS5zY3JvbGxXaWR0aCArICdweCdcbiAgICAgIEBvbGRTdGF0ZS5zY3JvbGxXaWR0aCA9IEBuZXdTdGF0ZS5zY3JvbGxXaWR0aFxuXG4gICAgaWYgQG5ld1N0YXRlLnNjcm9sbExlZnQgaXNudCBAb2xkU3RhdGUuc2Nyb2xsTGVmdFxuICAgICAgQGRvbU5vZGUuc2Nyb2xsTGVmdCA9IEBuZXdTdGF0ZS5zY3JvbGxMZWZ0XG4gICAgICBAb2xkU3RhdGUuc2Nyb2xsTGVmdCA9IEBuZXdTdGF0ZS5zY3JvbGxMZWZ0XG5cblxuICBvblNjcm9sbENhbGxiYWNrOiA9PlxuICAgIHN3aXRjaCBAb3JpZW50YXRpb25cbiAgICAgIHdoZW4gJ3ZlcnRpY2FsJ1xuICAgICAgICBAb25TY3JvbGwoQGRvbU5vZGUuc2Nyb2xsVG9wKVxuICAgICAgd2hlbiAnaG9yaXpvbnRhbCdcbiAgICAgICAgQG9uU2Nyb2xsKEBkb21Ob2RlLnNjcm9sbExlZnQpXG4iXX0=
