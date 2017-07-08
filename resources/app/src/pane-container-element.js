(function() {
  var CompositeDisposable, PaneContainerElement, _,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  CompositeDisposable = require('event-kit').CompositeDisposable;

  _ = require('underscore-plus');

  module.exports = PaneContainerElement = (function(superClass) {
    extend(PaneContainerElement, superClass);

    function PaneContainerElement() {
      return PaneContainerElement.__super__.constructor.apply(this, arguments);
    }

    PaneContainerElement.prototype.createdCallback = function() {
      this.subscriptions = new CompositeDisposable;
      return this.classList.add('panes');
    };

    PaneContainerElement.prototype.initialize = function(model, arg) {
      this.model = model;
      this.views = arg.views;
      if (this.views == null) {
        throw new Error("Must pass a views parameter when initializing PaneContainerElements");
      }
      this.subscriptions.add(this.model.observeRoot(this.rootChanged.bind(this)));
      return this;
    };

    PaneContainerElement.prototype.rootChanged = function(root) {
      var focusedElement, ref, view;
      if (this.hasFocus()) {
        focusedElement = document.activeElement;
      }
      if ((ref = this.firstChild) != null) {
        ref.remove();
      }
      if (root != null) {
        view = this.views.getView(root);
        this.appendChild(view);
        return focusedElement != null ? focusedElement.focus() : void 0;
      }
    };

    PaneContainerElement.prototype.hasFocus = function() {
      return this === document.activeElement || this.contains(document.activeElement);
    };

    PaneContainerElement.prototype.focusPaneViewAbove = function() {
      var ref;
      return (ref = this.nearestPaneInDirection('above')) != null ? ref.focus() : void 0;
    };

    PaneContainerElement.prototype.focusPaneViewBelow = function() {
      var ref;
      return (ref = this.nearestPaneInDirection('below')) != null ? ref.focus() : void 0;
    };

    PaneContainerElement.prototype.focusPaneViewOnLeft = function() {
      var ref;
      return (ref = this.nearestPaneInDirection('left')) != null ? ref.focus() : void 0;
    };

    PaneContainerElement.prototype.focusPaneViewOnRight = function() {
      var ref;
      return (ref = this.nearestPaneInDirection('right')) != null ? ref.focus() : void 0;
    };

    PaneContainerElement.prototype.moveActiveItemToPaneAbove = function(params) {
      return this.moveActiveItemToNearestPaneInDirection('above', params);
    };

    PaneContainerElement.prototype.moveActiveItemToPaneBelow = function(params) {
      return this.moveActiveItemToNearestPaneInDirection('below', params);
    };

    PaneContainerElement.prototype.moveActiveItemToPaneOnLeft = function(params) {
      return this.moveActiveItemToNearestPaneInDirection('left', params);
    };

    PaneContainerElement.prototype.moveActiveItemToPaneOnRight = function(params) {
      return this.moveActiveItemToNearestPaneInDirection('right', params);
    };

    PaneContainerElement.prototype.moveActiveItemToNearestPaneInDirection = function(direction, params) {
      var destPane, ref;
      destPane = (ref = this.nearestPaneInDirection(direction)) != null ? ref.getModel() : void 0;
      if (destPane == null) {
        return;
      }
      if (params != null ? params.keepOriginal : void 0) {
        this.model.copyActiveItemToPane(destPane);
      } else {
        this.model.moveActiveItemToPane(destPane);
      }
      return destPane.focus();
    };

    PaneContainerElement.prototype.nearestPaneInDirection = function(direction) {
      var box, distance, paneView, paneViews;
      distance = function(pointA, pointB) {
        var x, y;
        x = pointB.x - pointA.x;
        y = pointB.y - pointA.y;
        return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
      };
      paneView = this.model.getActivePane().getElement();
      box = this.boundingBoxForPaneView(paneView);
      paneViews = _.toArray(this.querySelectorAll('atom-pane')).filter((function(_this) {
        return function(otherPaneView) {
          var otherBox;
          otherBox = _this.boundingBoxForPaneView(otherPaneView);
          switch (direction) {
            case 'left':
              return otherBox.right.x <= box.left.x;
            case 'right':
              return otherBox.left.x >= box.right.x;
            case 'above':
              return otherBox.bottom.y <= box.top.y;
            case 'below':
              return otherBox.top.y >= box.bottom.y;
          }
        };
      })(this)).sort((function(_this) {
        return function(paneViewA, paneViewB) {
          var boxA, boxB;
          boxA = _this.boundingBoxForPaneView(paneViewA);
          boxB = _this.boundingBoxForPaneView(paneViewB);
          switch (direction) {
            case 'left':
              return distance(box.left, boxA.right) - distance(box.left, boxB.right);
            case 'right':
              return distance(box.right, boxA.left) - distance(box.right, boxB.left);
            case 'above':
              return distance(box.top, boxA.bottom) - distance(box.top, boxB.bottom);
            case 'below':
              return distance(box.bottom, boxA.top) - distance(box.bottom, boxB.top);
          }
        };
      })(this));
      return paneViews[0];
    };

    PaneContainerElement.prototype.boundingBoxForPaneView = function(paneView) {
      var boundingBox;
      boundingBox = paneView.getBoundingClientRect();
      return {
        left: {
          x: boundingBox.left,
          y: boundingBox.top
        },
        right: {
          x: boundingBox.right,
          y: boundingBox.top
        },
        top: {
          x: boundingBox.left,
          y: boundingBox.top
        },
        bottom: {
          x: boundingBox.left,
          y: boundingBox.bottom
        }
      };
    };

    return PaneContainerElement;

  })(HTMLElement);

  module.exports = PaneContainerElement = document.registerElement('atom-pane-container', {
    prototype: PaneContainerElement.prototype
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3BhbmUtY29udGFpbmVyLWVsZW1lbnQuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSw0Q0FBQTtJQUFBOzs7RUFBQyxzQkFBdUIsT0FBQSxDQUFRLFdBQVI7O0VBQ3hCLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBRUosTUFBTSxDQUFDLE9BQVAsR0FDTTs7Ozs7OzttQ0FDSixlQUFBLEdBQWlCLFNBQUE7TUFDZixJQUFDLENBQUEsYUFBRCxHQUFpQixJQUFJO2FBQ3JCLElBQUMsQ0FBQSxTQUFTLENBQUMsR0FBWCxDQUFlLE9BQWY7SUFGZTs7bUNBSWpCLFVBQUEsR0FBWSxTQUFDLEtBQUQsRUFBUyxHQUFUO01BQUMsSUFBQyxDQUFBLFFBQUQ7TUFBUyxJQUFDLENBQUEsUUFBRixJQUFFO01BQ3JCLElBQThGLGtCQUE5RjtBQUFBLGNBQVUsSUFBQSxLQUFBLENBQU0scUVBQU4sRUFBVjs7TUFFQSxJQUFDLENBQUEsYUFBYSxDQUFDLEdBQWYsQ0FBbUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxXQUFQLENBQW1CLElBQUMsQ0FBQSxXQUFXLENBQUMsSUFBYixDQUFrQixJQUFsQixDQUFuQixDQUFuQjthQUNBO0lBSlU7O21DQU1aLFdBQUEsR0FBYSxTQUFDLElBQUQ7QUFDWCxVQUFBO01BQUEsSUFBMkMsSUFBQyxDQUFBLFFBQUQsQ0FBQSxDQUEzQztRQUFBLGNBQUEsR0FBaUIsUUFBUSxDQUFDLGNBQTFCOzs7V0FDVyxDQUFFLE1BQWIsQ0FBQTs7TUFDQSxJQUFHLFlBQUg7UUFDRSxJQUFBLEdBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFQLENBQWUsSUFBZjtRQUNQLElBQUMsQ0FBQSxXQUFELENBQWEsSUFBYjt3Q0FDQSxjQUFjLENBQUUsS0FBaEIsQ0FBQSxXQUhGOztJQUhXOzttQ0FRYixRQUFB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QVEsQ0FBQyxxQkFBVCxDQUFBO2FBRWQ7UUFBQSxJQUFBLEVBQU07VUFBQyxDQUFBLEVBQUcsV0FBVyxDQUFDLElBQWhCO1VBQXNCLENBQUEsRUFBRyxXQUFXLENBQUMsR0FBckM7U0FBTjtRQUNBLEtBQUEsRUFBTztVQUFDLENBQUEsRUFBRyxXQUFXLENBQUMsS0FBaEI7VUFBdUIsQ0FBQSxFQUFHLFdBQVcsQ0FBQyxHQUF0QztTQURQO1FBRUEsR0FBQSxFQUFLO1VBQUMsQ0FBQSxFQUFHLFdBQVcsQ0FBQyxJQUFoQjtVQUFzQixDQUFBLEVBQUcsV0FBVyxDQUFDLEdBQXJDO1NBRkw7UUFHQSxNQUFBLEVBQVE7VUFBQyxDQUFBLEVBQUcsV0FBVyxDQUFDLElBQWhCO1VBQXNCLENBQUEsRUFBRyxXQUFXLENBQUMsTUFBckM7U0FIUjs7SUFIc0I7Ozs7S0FuRlM7O0VBMkZuQyxNQUFNLENBQUMsT0FBUCxHQUFpQixvQkFBQSxHQUF1QixRQUFRLENBQUMsZUFBVCxDQUF5QixxQkFBekIsRUFBZ0Q7SUFBQSxTQUFBLEVBQVcsb0JBQW9CLENBQUMsU0FBaEM7R0FBaEQ7QUEvRnhDIiwic291cmNlc0NvbnRlbnQiOlsie0NvbXBvc2l0ZURpc3Bvc2FibGV9ID0gcmVxdWlyZSAnZXZlbnQta2l0J1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcblxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgUGFuZUNvbnRhaW5lckVsZW1lbnQgZXh0ZW5kcyBIVE1MRWxlbWVudFxuICBjcmVhdGVkQ2FsbGJhY2s6IC0+XG4gICAgQHN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZVxuICAgIEBjbGFzc0xpc3QuYWRkICdwYW5lcydcblxuICBpbml0aWFsaXplOiAoQG1vZGVsLCB7QHZpZXdzfSkgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IHBhc3MgYSB2aWV3cyBwYXJhbWV0ZXIgd2hlbiBpbml0aWFsaXppbmcgUGFuZUNvbnRhaW5lckVsZW1lbnRzXCIpIHVubGVzcyBAdmlld3M/XG5cbiAgICBAc3Vic2NyaXB0aW9ucy5hZGQgQG1vZGVsLm9ic2VydmVSb290KEByb290Q2hhbmdlZC5iaW5kKHRoaXMpKVxuICAgIHRoaXNcblxuICByb290Q2hhbmdlZDogKHJvb3QpIC0+XG4gICAgZm9jdXNlZEVsZW1lbnQgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50IGlmIEBoYXNGb2N1cygpXG4gICAgQGZpcnN0Q2hpbGQ/LnJlbW92ZSgpXG4gICAgaWYgcm9vdD9cbiAgICAgIHZpZXcgPSBAdmlld3MuZ2V0Vmlldyhyb290KVxuICAgICAgQGFwcGVuZENoaWxkKHZpZXcpXG4gICAgICBmb2N1c2VkRWxlbWVudD8uZm9jdXMoKVxuXG4gIGhhc0ZvY3VzOiAtPlxuICAgIHRoaXMgaXMgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCBvciBAY29udGFpbnMoZG9jdW1lbnQuYWN0aXZlRWxlbWVudClcblxuICBmb2N1c1BhbmVWaWV3QWJvdmU6IC0+XG4gICAgQG5lYXJlc3RQYW5lSW5EaXJlY3Rpb24oJ2Fib3ZlJyk/LmZvY3VzKClcblxuICBmb2N1c1BhbmVWaWV3QmVsb3c6IC0+XG4gICAgQG5lYXJlc3RQYW5lSW5EaXJlY3Rpb24oJ2JlbG93Jyk/LmZvY3VzKClcblxuICBmb2N1c1BhbmVWaWV3T25MZWZ0OiAtPlxuICAgIEBuZWFyZXN0UGFuZUluRGlyZWN0aW9uKCdsZWZ0Jyk/LmZvY3VzKClcblxuICBmb2N1c1BhbmVWaWV3T25SaWdodDogLT5cbiAgICBAbmVhcmVzdFBhbmVJbkRpcmVjdGlvbigncmlnaHQnKT8uZm9jdXMoKVxuXG4gIG1vdmVBY3RpdmVJdGVtVG9QYW5lQWJvdmU6IChwYXJhbXMpIC0+XG4gICAgQG1vdmVBY3RpdmVJdGVtVG9OZWFyZXN0UGFuZUluRGlyZWN0aW9uKCdhYm92ZScsIHBhcmFtcylcblxuICBtb3ZlQWN0aXZlSXRlbVRvUGFuZUJlbG93OiAocGFyYW1zKSAtPlxuICAgIEBtb3ZlQWN0aXZlSXRlbVRvTmVhcmVzdFBhbmVJbkRpcmVjdGlvbignYmVsb3cnLCBwYXJhbXMpXG5cbiAgbW92ZUFjdGl2ZUl0ZW1Ub1BhbmVPbkxlZnQ6IChwYXJhbXMpIC0+XG4gICAgQG1vdmVBY3RpdmVJdGVtVG9OZWFyZXN0UGFuZUluRGlyZWN0aW9uKCdsZWZ0JywgcGFyYW1zKVxuXG4gIG1vdmVBY3RpdmVJdGVtVG9QYW5lT25SaWdodDogKHBhcmFtcykgLT5cbiAgICBAbW92ZUFjdGl2ZUl0ZW1Ub05lYXJlc3RQYW5lSW5EaXJlY3Rpb24oJ3JpZ2h0JywgcGFyYW1zKVxuXG4gIG1vdmVBY3RpdmVJdGVtVG9OZWFyZXN0UGFuZUluRGlyZWN0aW9uOiAoZGlyZWN0aW9uLCBwYXJhbXMpIC0+XG4gICAgZGVzdFBhbmUgPSBAbmVhcmVzdFBhbmVJbkRpcmVjdGlvbihkaXJlY3Rpb24pPy5nZXRNb2RlbCgpXG4gICAgcmV0dXJuIHVubGVzcyBkZXN0UGFuZT9cbiAgICBpZiBwYXJhbXM/LmtlZXBPcmlnaW5hbFxuICAgICAgQG1vZGVsLmNvcHlBY3RpdmVJdGVtVG9QYW5lKGRlc3RQYW5lKVxuICAgIGVsc2VcbiAgICAgIEBtb2RlbC5tb3ZlQWN0aXZlSXRlbVRvUGFuZShkZXN0UGFuZSlcbiAgICBkZXN0UGFuZS5mb2N1cygpXG5cbiAgbmVhcmVzdFBhbmVJbkRpcmVjdGlvbjogKGRpcmVjdGlvbikgLT5cbiAgICBkaXN0YW5jZSA9IChwb2ludEEsIHBvaW50QikgLT5cbiAgICAgIHggPSBwb2ludEIueCAtIHBvaW50QS54XG4gICAgICB5ID0gcG9pbnRCLnkgLSBwb2ludEEueVxuICAgICAgTWF0aC5zcXJ0KE1hdGgucG93KHgsIDIpICsgTWF0aC5wb3coeSwgMikpXG5cbiAgICBwYW5lVmlldyA9IEBtb2RlbC5nZXRBY3RpdmVQYW5lKCkuZ2V0RWxlbWVudCgpXG4gICAgYm94ID0gQGJvdW5kaW5nQm94Rm9yUGFuZVZpZXcocGFuZVZpZXcpXG5cbiAgICBwYW5lVmlld3MgPSBfLnRvQXJyYXkoQHF1ZXJ5U2VsZWN0b3JBbGwoJ2F0b20tcGFuZScpKVxuICAgICAgLmZpbHRlciAob3RoZXJQYW5lVmlldykgPT5cbiAgICAgICAgb3RoZXJCb3ggPSBAYm91bmRpbmdCb3hGb3JQYW5lVmlldyhvdGhlclBhbmVWaWV3KVxuICAgICAgICBzd2l0Y2ggZGlyZWN0aW9uXG4gICAgICAgICAgd2hlbiAnbGVmdCcgdGhlbiBvdGhlckJveC5yaWdodC54IDw9IGJveC5sZWZ0LnhcbiAgICAgICAgICB3aGVuICdyaWdodCcgdGhlbiBvdGhlckJveC5sZWZ0LnggPj0gYm94LnJpZ2h0LnhcbiAgICAgICAgICB3aGVuICdhYm92ZScgdGhlbiBvdGhlckJveC5ib3R0b20ueSA8PSBib3gudG9wLnlcbiAgICAgICAgICB3aGVuICdiZWxvdycgdGhlbiBvdGhlckJveC50b3AueSA+PSBib3guYm90dG9tLnlcbiAgICAgIC5zb3J0IChwYW5lVmlld0EsIHBhbmVWaWV3QikgPT5cbiAgICAgICAgYm94QSA9IEBib3VuZGluZ0JveEZvclBhbmVWaWV3KHBhbmVWaWV3QSlcbiAgICAgICAgYm94QiA9IEBib3VuZGluZ0JveEZvclBhbmVWaWV3KHBhbmVWaWV3QilcbiAgICAgICAgc3dpdGNoIGRpcmVjdGlvblxuICAgICAgICAgIHdoZW4gJ2xlZnQnIHRoZW4gZGlzdGFuY2UoYm94LmxlZnQsIGJveEEucmlnaHQpIC0gZGlzdGFuY2UoYm94LmxlZnQsIGJveEIucmlnaHQpXG4gICAgICAgICAgd2hlbiAncmlnaHQnIHRoZW4gZGlzdGFuY2UoYm94LnJpZ2h0LCBib3hBLmxlZnQpIC0gZGlzdGFuY2UoYm94LnJpZ2h0LCBib3hCLmxlZnQpXG4gICAgICAgICAgd2hlbiAnYWJvdmUnIHRoZW4gZGlzdGFuY2UoYm94LnRvcCwgYm94QS5ib3R0b20pIC0gZGlzdGFuY2UoYm94LnRvcCwgYm94Qi5ib3R0b20pXG4gICAgICAgICAgd2hlbiAnYmVsb3cnIHRoZW4gZGlzdGFuY2UoYm94LmJvdHRvbSwgYm94QS50b3ApIC0gZGlzdGFuY2UoYm94LmJvdHRvbSwgYm94Qi50b3ApXG5cbiAgICBwYW5lVmlld3NbMF1cblxuICBib3VuZGluZ0JveEZvclBhbmVWaWV3OiAocGFuZVZpZXcpIC0+XG4gICAgYm91bmRpbmdCb3ggPSBwYW5lVmlldy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxuXG4gICAgbGVmdDoge3g6IGJvdW5kaW5nQm94LmxlZnQsIHk6IGJvdW5kaW5nQm94LnRvcH1cbiAgICByaWdodDoge3g6IGJvdW5kaW5nQm94LnJpZ2h0LCB5OiBib3VuZGluZ0JveC50b3B9XG4gICAgdG9wOiB7eDogYm91bmRpbmdCb3gubGVmdCwgeTogYm91bmRpbmdCb3gudG9wfVxuICAgIGJvdHRvbToge3g6IGJvdW5kaW5nQm94LmxlZnQsIHk6IGJvdW5kaW5nQm94LmJvdHRvbX1cblxubW9kdWxlLmV4cG9ydHMgPSBQYW5lQ29udGFpbmVyRWxlbWVudCA9IGRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudCAnYXRvbS1wYW5lLWNvbnRhaW5lcicsIHByb3RvdHlwZTogUGFuZUNvbnRhaW5lckVsZW1lbnQucHJvdG90eXBlXG4iXX0=
