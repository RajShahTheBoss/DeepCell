(function() {
  var PaneResizeHandleElement,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  PaneResizeHandleElement = (function(superClass) {
    extend(PaneResizeHandleElement, superClass);

    function PaneResizeHandleElement() {
      return PaneResizeHandleElement.__super__.constructor.apply(this, arguments);
    }

    PaneResizeHandleElement.prototype.createdCallback = function() {
      this.resizePane = this.resizePane.bind(this);
      this.resizeStopped = this.resizeStopped.bind(this);
      return this.subscribeToDOMEvents();
    };

    PaneResizeHandleElement.prototype.subscribeToDOMEvents = function() {
      this.addEventListener('dblclick', this.resizeToFitContent.bind(this));
      return this.addEventListener('mousedown', this.resizeStarted.bind(this));
    };

    PaneResizeHandleElement.prototype.attachedCallback = function() {
      this.isHorizontal = this.parentElement.classList.contains("horizontal");
      return this.classList.add(this.isHorizontal ? 'horizontal' : 'vertical');
    };

    PaneResizeHandleElement.prototype.detachedCallback = function() {
      return this.resizeStopped();
    };

    PaneResizeHandleElement.prototype.resizeToFitContent = function() {
      var ref, ref1;
      if ((ref = this.previousSibling) != null) {
        ref.model.setFlexScale(1);
      }
      return (ref1 = this.nextSibling) != null ? ref1.model.setFlexScale(1) : void 0;
    };

    PaneResizeHandleElement.prototype.resizeStarted = function(e) {
      e.stopPropagation();
      document.addEventListener('mousemove', this.resizePane);
      return document.addEventListener('mouseup', this.resizeStopped);
    };

    PaneResizeHandleElement.prototype.resizeStopped = function() {
      document.removeEventListener('mousemove', this.resizePane);
      return document.removeEventListener('mouseup', this.resizeStopped);
    };

    PaneResizeHandleElement.prototype.calcRatio = function(ratio1, ratio2, total) {
      var allRatio;
      allRatio = ratio1 + ratio2;
      return [total * ratio1 / allRatio, total * ratio2 / allRatio];
    };

    PaneResizeHandleElement.prototype.setFlexGrow = function(prevSize, nextSize) {
      var flexGrows, totalScale;
      this.prevModel = this.previousSibling.model;
      this.nextModel = this.nextSibling.model;
      totalScale = this.prevModel.getFlexScale() + this.nextModel.getFlexScale();
      flexGrows = this.calcRatio(prevSize, nextSize, totalScale);
      this.prevModel.setFlexScale(flexGrows[0]);
      return this.nextModel.setFlexScale(flexGrows[1]);
    };

    PaneResizeHandleElement.prototype.fixInRange = function(val, minValue, maxValue) {
      return Math.min(Math.max(val, minValue), maxValue);
    };

    PaneResizeHandleElement.prototype.resizePane = function(arg) {
      var bottomHeight, clientX, clientY, leftWidth, rightWidth, topHeight, totalHeight, totalWidth, which;
      clientX = arg.clientX, clientY = arg.clientY, which = arg.which;
      if (which !== 1) {
        return this.resizeStopped();
      }
      if (!((this.previousSibling != null) && (this.nextSibling != null))) {
        return this.resizeStopped();
      }
      if (this.isHorizontal) {
        totalWidth = this.previousSibling.clientWidth + this.nextSibling.clientWidth;
        leftWidth = clientX - this.previousSibling.getBoundingClientRect().left;
        leftWidth = this.fixInRange(leftWidth, 0, totalWidth);
        rightWidth = totalWidth - leftWidth;
        return this.setFlexGrow(leftWidth, rightWidth);
      } else {
        totalHeight = this.previousSibling.clientHeight + this.nextSibling.clientHeight;
        topHeight = clientY - this.previousSibling.getBoundingClientRect().top;
        topHeight = this.fixInRange(topHeight, 0, totalHeight);
        bottomHeight = totalHeight - topHeight;
        return this.setFlexGrow(topHeight, bottomHeight);
      }
    };

    return PaneResizeHandleElement;

  })(HTMLElement);

  module.exports = PaneResizeHandleElement = document.registerElement('atom-pane-resize-handle', {
    prototype: PaneResizeHandleElement.prototype
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3BhbmUtcmVzaXplLWhhbmRsZS1lbGVtZW50LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsdUJBQUE7SUFBQTs7O0VBQU07Ozs7Ozs7c0NBQ0osZUFBQSxHQUFpQixTQUFBO01BQ2YsSUFBQyxDQUFBLFVBQUQsR0FBYyxJQUFDLENBQUEsVUFBVSxDQUFDLElBQVosQ0FBaUIsSUFBakI7TUFDZCxJQUFDLENBQUEsYUFBRCxHQUFpQixJQUFDLENBQUEsYUFBYSxDQUFDLElBQWYsQ0FBb0IsSUFBcEI7YUFDakIsSUFBQyxDQUFBLG9CQUFELENBQUE7SUFIZTs7c0NBS2pCLG9CQUFBLEdBQXNCLFNBQUE7TUFDcEIsSUFBQyxDQUFBLGdCQUFELENBQWtCLFVBQWxCLEVBQThCLElBQUMsQ0FBQSxrQkFBa0IsQ0FBQyxJQUFwQixDQUF5QixJQUF6QixDQUE5QjthQUNBLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixXQUFsQixFQUErQixJQUFDLENBQUEsYUFBYSxDQUFDLElBQWYsQ0FBb0IsSUFBcEIsQ0FBL0I7SUFGb0I7O3NDQUl0QixnQkFBQSxHQUFrQixTQUFBO01BQ2hCLElBQUMsQ0FBQSxZQUFELEdBQWdCLElBQUMsQ0FBQSxhQUFhLENBQUMsU0FBUyxDQUFDLFFBQXpCLENBQWtDLFlBQWxDO2FBQ2hCLElBQUMsQ0FBQSxTQUFTLENBQUMsR0FBWCxDQUFrQixJQUFDLENBQUEsWUFBSixHQUFzQixZQUF0QixHQUF3QyxVQUF2RDtJQUZnQjs7c0NBSWxCLGdCQUFBLEdBQWtCLFNBQUE7YUFDaEIsSUFBQyxDQUFBLGFBQUQsQ0FBQTtJQURnQjs7c0NBR2xCLGtCQUFBLEdBQW9CLFNBQUE7QUFFbEIsVUFBQTs7V0FBZ0IsQ0FBRSxLQUFLLENBQUMsWUFBeEIsQ0FBcUMsQ0FBckM7O3FEQUNZLENBQUUsS0FBSyxDQUFD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LFlBQXhCLEVBZEY7O0lBSlU7Ozs7S0E5Q3dCOztFQWtFdEMsTUFBTSxDQUFDLE9BQVAsR0FBaUIsdUJBQUEsR0FDakIsUUFBUSxDQUFDLGVBQVQsQ0FBeUIseUJBQXpCLEVBQW9EO0lBQUEsU0FBQSxFQUFXLHVCQUF1QixDQUFDLFNBQW5DO0dBQXBEO0FBbkVBIiwic291cmNlc0NvbnRlbnQiOlsiY2xhc3MgUGFuZVJlc2l6ZUhhbmRsZUVsZW1lbnQgZXh0ZW5kcyBIVE1MRWxlbWVudFxuICBjcmVhdGVkQ2FsbGJhY2s6IC0+XG4gICAgQHJlc2l6ZVBhbmUgPSBAcmVzaXplUGFuZS5iaW5kKHRoaXMpXG4gICAgQHJlc2l6ZVN0b3BwZWQgPSBAcmVzaXplU3RvcHBlZC5iaW5kKHRoaXMpXG4gICAgQHN1YnNjcmliZVRvRE9NRXZlbnRzKClcblxuICBzdWJzY3JpYmVUb0RPTUV2ZW50czogLT5cbiAgICBAYWRkRXZlbnRMaXN0ZW5lciAnZGJsY2xpY2snLCBAcmVzaXplVG9GaXRDb250ZW50LmJpbmQodGhpcylcbiAgICBAYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vkb3duJywgQHJlc2l6ZVN0YXJ0ZWQuYmluZCh0aGlzKVxuXG4gIGF0dGFjaGVkQ2FsbGJhY2s6IC0+XG4gICAgQGlzSG9yaXpvbnRhbCA9IEBwYXJlbnRFbGVtZW50LmNsYXNzTGlzdC5jb250YWlucyhcImhvcml6b250YWxcIilcbiAgICBAY2xhc3NMaXN0LmFkZCBpZiBAaXNIb3Jpem9udGFsIHRoZW4gJ2hvcml6b250YWwnIGVsc2UgJ3ZlcnRpY2FsJ1xuXG4gIGRldGFjaGVkQ2FsbGJhY2s6IC0+XG4gICAgQHJlc2l6ZVN0b3BwZWQoKVxuXG4gIHJlc2l6ZVRvRml0Q29udGVudDogLT5cbiAgICAjIGNsZWFyIGZsZXgtZ3JvdyBjc3Mgc3R5bGUgb2YgYm90aCBwYW5lXG4gICAgQHByZXZpb3VzU2libGluZz8ubW9kZWwuc2V0RmxleFNjYWxlKDEpXG4gICAgQG5leHRTaWJsaW5nPy5tb2RlbC5zZXRGbGV4U2NhbGUoMSlcblxuICByZXNpemVTdGFydGVkOiAoZSkgLT5cbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vtb3ZlJywgQHJlc2l6ZVBhbmVcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyICdtb3VzZXVwJywgQHJlc2l6ZVN0b3BwZWRcblxuICByZXNpemVTdG9wcGVkOiAtPlxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIgJ21vdXNlbW92ZScsIEByZXNpemVQYW5lXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lciAnbW91c2V1cCcsIEByZXNpemVTdG9wcGVkXG5cbiAgY2FsY1JhdGlvOiAocmF0aW8xLCByYXRpbzIsIHRvdGFsKSAtPlxuICAgIGFsbFJhdGlvID0gcmF0aW8xICsgcmF0aW8yXG4gICAgW3RvdGFsICogcmF0aW8xIC8gYWxsUmF0aW8sIHRvdGFsICogcmF0aW8yIC8gYWxsUmF0aW9dXG5cbiAgc2V0RmxleEdyb3c6IChwcmV2U2l6ZSwgbmV4dFNpemUpIC0+XG4gICAgQHByZXZNb2RlbCA9IEBwcmV2aW91c1NpYmxpbmcubW9kZWxcbiAgICBAbmV4dE1vZGVsID0gQG5leHRTaWJsaW5nLm1vZGVsXG4gICAgdG90YWxTY2FsZSA9IEBwcmV2TW9kZWwuZ2V0RmxleFNjYWxlKCkgKyBAbmV4dE1vZGVsLmdldEZsZXhTY2FsZSgpXG4gICAgZmxleEdyb3dzID0gQGNhbGNSYXRpbyhwcmV2U2l6ZSwgbmV4dFNpemUsIHRvdGFsU2NhbGUpXG4gICAgQHByZXZNb2RlbC5zZXRGbGV4U2NhbGUgZmxleEdyb3dzWzBdXG4gICAgQG5leHRNb2RlbC5zZXRGbGV4U2NhbGUgZmxleEdyb3dzWzFdXG5cbiAgZml4SW5SYW5nZTogKHZhbCwgbWluVmFsdWUsIG1heFZhbHVlKSAtPlxuICAgIE1hdGgubWluKE1hdGgubWF4KHZhbCwgbWluVmFsdWUpLCBtYXhWYWx1ZSlcblxuICByZXNpemVQYW5lOiAoe2NsaWVudFgsIGNsaWVudFksIHdoaWNofSkgLT5cbiAgICByZXR1cm4gQHJlc2l6ZVN0b3BwZWQoKSB1bmxlc3Mgd2hpY2ggaXMgMVxuICAgIHJldHVybiBAcmVzaXplU3RvcHBlZCgpIHVubGVzcyBAcHJldmlvdXNTaWJsaW5nPyBhbmQgQG5leHRTaWJsaW5nP1xuXG4gICAgaWYgQGlzSG9yaXpvbnRhbFxuICAgICAgdG90YWxXaWR0aCA9IEBwcmV2aW91c1NpYmxpbmcuY2xpZW50V2lkdGggKyBAbmV4dFNpYmxpbmcuY2xpZW50V2lkdGhcbiAgICAgICNnZXQgdGhlIGxlZnQgYW5kIHJpZ2h0IHdpZHRoIGFmdGVyIG1vdmUgdGhlIHJlc2l6ZSB2aWV3XG4gICAgICBsZWZ0V2lkdGggPSBjbGllbnRYIC0gQHByZXZpb3VzU2libGluZy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0XG4gICAgICBsZWZ0V2lkdGggPSBAZml4SW5SYW5nZShsZWZ0V2lkdGgsIDAsIHRvdGFsV2lkdGgpXG4gICAgICByaWdodFdpZHRoID0gdG90YWxXaWR0aCAtIGxlZnRXaWR0aFxuICAgICAgIyBzZXQgdGhlIGZsZXggZ3JvdyBieSB0aGUgcmF0aW8gb2YgbGVmdCB3aWR0aCBhbmQgcmlnaHQgd2lkdGhcbiAgICAgICMgdG8gY2hhbmdlIHBhbmUgd2lkdGhcbiAgICAgIEBzZXRGbGV4R3JvdyhsZWZ0V2lkdGgsIHJpZ2h0V2lkdGgpXG4gICAgZWxzZVxuICAgICAgdG90YWxIZWlnaHQgPSBAcHJldmlvdXNTaWJsaW5nLmNsaWVudEhlaWdodCArIEBuZXh0U2libGluZy5jbGllbnRIZWlnaHRcbiAgICAgIHRvcEhlaWdodCA9IGNsaWVudFkgLSBAcHJldmlvdXNTaWJsaW5nLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcFxuICAgICAgdG9wSGVpZ2h0ID0gQGZpeEluUmFuZ2UodG9wSGVpZ2h0LCAwLCB0b3RhbEhlaWdodClcbiAgICAgIGJvdHRvbUhlaWdodCA9IHRvdGFsSGVpZ2h0IC0gdG9wSGVpZ2h0XG4gICAgICBAc2V0RmxleEdyb3codG9wSGVpZ2h0LCBib3R0b21IZWlnaHQpXG5cbm1vZHVsZS5leHBvcnRzID0gUGFuZVJlc2l6ZUhhbmRsZUVsZW1lbnQgPVxuZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50ICdhdG9tLXBhbmUtcmVzaXplLWhhbmRsZScsIHByb3RvdHlwZTogUGFuZVJlc2l6ZUhhbmRsZUVsZW1lbnQucHJvdG90eXBlXG4iXX0=
