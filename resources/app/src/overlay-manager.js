(function() {
  var OverlayManager;

  module.exports = OverlayManager = (function() {
    function OverlayManager(presenter, container, views) {
      this.presenter = presenter;
      this.container = container;
      this.views = views;
      this.overlaysById = {};
    }

    OverlayManager.prototype.render = function(state) {
      var decorationId, id, overlay, overlayNode, ref, ref1, results;
      ref = state.content.overlays;
      for (decorationId in ref) {
        overlay = ref[decorationId];
        if (this.shouldUpdateOverlay(decorationId, overlay)) {
          this.renderOverlay(state, decorationId, overlay);
        }
      }
      ref1 = this.overlaysById;
      results = [];
      for (id in ref1) {
        overlayNode = ref1[id].overlayNode;
        if (!state.content.overlays.hasOwnProperty(id)) {
          delete this.overlaysById[id];
          results.push(overlayNode.remove());
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    OverlayManager.prototype.shouldUpdateOverlay = function(decorationId, overlay) {
      var cachedOverlay, ref, ref1, ref2, ref3;
      cachedOverlay = this.overlaysById[decorationId];
      if (cachedOverlay == null) {
        return true;
      }
      return ((ref = cachedOverlay.pixelPosition) != null ? ref.top : void 0) !== ((ref1 = overlay.pixelPosition) != null ? ref1.top : void 0) || ((ref2 = cachedOverlay.pixelPosition) != null ? ref2.left : void 0) !== ((ref3 = overlay.pixelPosition) != null ? ref3.left : void 0);
    };

    OverlayManager.prototype.measureOverlays = function() {
      var decorationId, itemView, ref, results;
      ref = this.overlaysById;
      results = [];
      for (decorationId in ref) {
        itemView = ref[decorationId].itemView;
        results.push(this.measureOverlay(decorationId, itemView));
      }
      return results;
    };

    OverlayManager.prototype.measureOverlay = function(decorationId, itemView) {
      var contentMargin, ref;
      contentMargin = (ref = parseInt(getComputedStyle(itemView)['margin-left'])) != null ? ref : 0;
      return this.presenter.setOverlayDimensions(decorationId, itemView.offsetWidth, itemView.offsetHeight, contentMargin);
    };

    OverlayManager.prototype.renderOverlay = function(state, decorationId, arg) {
      var cachedOverlay, item, itemView, klass, overlayNode, pixelPosition;
      item = arg.item, pixelPosition = arg.pixelPosition, klass = arg["class"];
      itemView = this.views.getView(item);
      cachedOverlay = this.overlaysById[decorationId];
      if (!(overlayNode = cachedOverlay != null ? cachedOverlay.overlayNode : void 0)) {
        overlayNode = document.createElement('atom-overlay');
        if (klass != null) {
          overlayNode.classList.add(klass);
        }
        this.container.appendChild(overlayNode);
        this.overlaysById[decorationId] = cachedOverlay = {
          overlayNode: overlayNode,
          itemView: itemView
        };
      }
      if (overlayNode.childNodes.length === 0) {
        overlayNode.appendChild(itemView);
      }
      cachedOverlay.pixelPosition = pixelPosition;
      overlayNode.style.top = pixelPosition.top + 'px';
      return overlayNode.style.left = pixelPosition.left + 'px';
    };

    return OverlayManager;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL292ZXJsYXktbWFuYWdlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFBLE1BQU0sQ0FBQyxPQUFQLEdBQ007SUFDUyx3QkFBQyxTQUFELEVBQWEsU0FBYixFQUF5QixLQUF6QjtNQUFDLElBQUMsQ0FBQSxZQUFEO01BQVksSUFBQyxDQUFBLFlBQUQ7TUFBWSxJQUFDLENBQUEsUUFBRDtNQUNwQyxJQUFDLENBQUEsWUFBRCxHQUFnQjtJQURMOzs2QkFHYixNQUFBLEdBQVEsU0FBQyxLQUFEO0FBQ04sVUFBQTtBQUFBO0FBQUEsV0FBQSxtQkFBQTs7UUFDRSxJQUFHLElBQUMsQ0FBQSxtQkFBRCxDQUFxQixZQUFyQixFQUFtQyxPQUFuQyxDQUFIO1VBQ0UsSUFBQyxDQUFBLGFBQUQsQ0FBZSxLQUFmLEVBQXNCLFlBQXRCLEVBQW9DLE9BQXBDLEVBREY7O0FBREY7QUFJQTtBQUFBO1dBQUEsVUFBQTtRQUFTO1FBQ1AsSUFBQSxDQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQXZCLENBQXNDLEVBQXRDLENBQVA7VUFDRSxPQUFPLElBQUMsQ0FBQSxZQUFhLENBQUEsRUFBQTt1QkFDckIsV0FBVyxDQUFDLE1BQVosQ0FBQSxHQUZGO1NBQUEsTUFBQTsrQkFBQTs7QUFERjs7SUFMTTs7NkJBVVIsbUJBQUEsR0FBcUIsU0FBQyxZQUFELEVBQWUsT0FBZjtBQUNuQixVQUFBO01BQUEsYUFBQSxHQUFnQixJQUFDLENBQUEsWUFBYSxDQUFBLFlBQUE7TUFDOUIsSUFBbUIscUJBQW5CO0FBQUEsZUFBTyxLQUFQOzsrREFDMkIsQ0FBRSxhQUE3QixtREFBMkQsQ0FBRSxhQUE3RCx3REFDNkIsQ0FBRSxjQUE3QixtREFBNEQsQ0FBRTtJQUo3Qzs7NkJBTXJCLGVBQUEsR0FBaUIsU0FBQTtBQUNmLFVBQUE7QUFBQTtBQUFBO1dBQUEsbUJBQUE7UUFBbUI7cUJBQ2pCLElBQUMsQ0FBQSxjQUFELENBQWdCLFlBQWhCLEVBQThCLFFBQTlCO0FBREY7O0lBRGU7OzZCQUlqQixjQUFBLEdBQWdCLFNBQUMsWUFBRCxFQUFlLFFBQWY7QUFDZCxVQUFBO01BQUEsYUFBQSwrRUFBc0U7YUFDdEUsSUFBQyxDQUFBLFNBQVMsQ0FBQyxvQkFBWCxDQUFnQyxZQUFoQyxFQUE4QyxRQUFRLENBQUMsV0FBdkQsRUFBb0UsUUFBUSxDQUFDLFlBQTdFLEVBQTJGLGFBQTNGO0lBRmM7OzZCQUloQixhQUFBLEdBQWUsU0FBQyxLQUFELEVBQVEsWUFBUixFQUFzQixHQUF0QjtBQUNiLFVBQUE7TUFEb0MsaUJBQU0sbUNBQXNCLGFBQVA7TUFDekQsUUFBQSxHQUFXLElBQUMsQ0FBQSxLQUFLLENBQUMsT0FBUCxDQUFlLElBQWY7TUFDWCxhQUFBLEdBQWdCLElBQUMsQ0FBQSxZQUFhLENBQUEsWUFBQTtNQUM5QixJQUFBLENBQU8sQ0FBQSxXQUFBLDJCQUFjLGFBQWEsQ0FBRSxvQkFBN0IsQ0FBUDtRQUNFLFdBQUEsR0FBYyxRQUFRLENBQUMsYUFBVCxDQUF1QixjQUF2QjtRQUNkLElBQW9DLGFBQXBDO1VBQUEsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUF0QixDQUEwQixLQUExQixFQUFBOztRQUNBLElBQUMsQ0FBQSxTQUFTLENBQUMsV0FBWCxDQUF1QixXQUF2QjtRQUNBLElBQUMsQ0FBQSxZQUFhLENBQUEsWUFBQSxDQUFkLEdBQThCLGFBQUEsR0FBZ0I7VUFBQyxhQUFBLFdBQUQ7VUFBYyxVQUFBLFFBQWQ7VUFKaEQ7O01BUUEsSUFBcUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUF2QixLQUFpQyxDQUF0RTtRQUFBLFdBQVcsQ0FBQyxXQUFaLENBQXdCLFFBQXhCLEVBQUE7O01BRUEsYUFBYSxDQUFDLGFBQWQsR0FBOEI7TUFDOUIsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFsQixHQUF3QixhQUFhLENBQUMsR0FBZCxHQUFvQjthQUM1QyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQWxCLEdBQXlCLGFBQWEsQ0FBQyxJQUFkLEdBQXFCO0lBZmpDOzs7OztBQTdCakIiLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBPdmVybGF5TWFuYWdlclxuICBjb25zdHJ1Y3RvcjogKEBwcmVzZW50ZXIsIEBjb250YWluZXIsIEB2aWV3cykgLT5cbiAgICBAb3ZlcmxheXNCeUlkID0ge31cblxuICByZW5kZXI6IChzdGF0ZSkgLT5cbiAgICBmb3IgZGVjb3JhdGlvbklkLCBvdmVybGF5IG9mIHN0YXRlLmNvbnRlbnQub3ZlcmxheXNcbiAgICAgIGlmIEBzaG91bGRVcGRhdGVPdmVybGF5KGRlY29yYXRpb25JZCwgb3ZlcmxheSlcbiAgICAgICAgQHJlbmRlck92ZXJsYXkoc3RhdGUsIGRlY29yYXRpb25JZCwgb3ZlcmxheSlcblxuICAgIGZvciBpZCwge292ZXJsYXlOb2RlfSBvZiBAb3ZlcmxheXNCeUlkXG4gICAgICB1bmxlc3Mgc3RhdGUuY29udGVudC5vdmVybGF5cy5oYXNPd25Qcm9wZXJ0eShpZClcbiAgICAgICAgZGVsZXRlIEBvdmVybGF5c0J5SWRbaWRdXG4gICAgICAgIG92ZXJsYXlOb2RlLnJlbW92ZSgpXG5cbiAgc2hvdWxkVXBkYXRlT3ZlcmxheTogKGRlY29yYXRpb25JZCwgb3ZlcmxheSkgLT5cbiAgICBjYWNoZWRPdmVybGF5ID0gQG92ZXJsYXlzQnlJZFtkZWNvcmF0aW9uSWRdXG4gICAgcmV0dXJuIHRydWUgdW5sZXNzIGNhY2hlZE92ZXJsYXk/XG4gICAgY2FjaGVkT3ZlcmxheS5waXhlbFBvc2l0aW9uPy50b3AgaXNudCBvdmVybGF5LnBpeGVsUG9zaXRpb24/LnRvcCBvclxuICAgICAgY2FjaGVkT3ZlcmxheS5waXhlbFBvc2l0aW9uPy5sZWZ0IGlzbnQgb3ZlcmxheS5waXhlbFBvc2l0aW9uPy5sZWZ0XG5cbiAgbWVhc3VyZU92ZXJsYXlzOiAtPlxuICAgIGZvciBkZWNvcmF0aW9uSWQsIHtpdGVtVmlld30gb2YgQG92ZXJsYXlzQnlJZFxuICAgICAgQG1lYXN1cmVPdmVybGF5KGRlY29yYXRpb25JZCwgaXRlbVZpZXcpXG5cbiAgbWVhc3VyZU92ZXJsYXk6IChkZWNvcmF0aW9uSWQsIGl0ZW1WaWV3KSAtPlxuICAgIGNvbnRlbnRNYXJnaW4gPSBwYXJzZUludChnZXRDb21wdXRlZFN0eWxlKGl0ZW1WaWV3KVsnbWFyZ2luLWxlZnQnXSkgPyAwXG4gICAgQHByZXNlbnRlci5zZXRPdmVybGF5RGltZW5zaW9ucyhkZWNvcmF0aW9uSWQsIGl0ZW1WaWV3Lm9mZnNldFdpZHRoLCBpdGVtVmlldy5vZmZzZXRIZWlnaHQsIGNvbnRlbnRNYXJnaW4pXG5cbiAgcmVuZGVyT3ZlcmxheTogKHN0YXRlLCBkZWNvcmF0aW9uSWQsIHtpdGVtLCBwaXhlbFBvc2l0aW9uLCBjbGFzczoga2xhc3N9KSAtPlxuICAgIGl0ZW1WaWV3ID0gQHZpZXdzLmdldFZpZXcoaXRlbSlcbiAgICBjYWNoZWRPdmVybGF5ID0gQG92ZXJsYXlzQnlJZFtkZWNvcmF0aW9uSWRdXG4gICAgdW5sZXNzIG92ZXJsYXlOb2RlID0gY2FjaGVkT3ZlcmxheT8ub3ZlcmxheU5vZGVcbiAgICAgIG92ZXJsYXlOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXRvbS1vdmVybGF5JylcbiAgICAgIG92ZXJsYXlOb2RlLmNsYXNzTGlzdC5hZGQoa2xhc3MpIGlmIGtsYXNzP1xuICAgICAgQGNvbnRhaW5lci5hcHBlbmRDaGlsZChvdmVybGF5Tm9kZSlcbiAgICAgIEBvdmVybGF5c0J5SWRbZGVjb3JhdGlvbklkXSA9IGNhY2hlZE92ZXJsYXkgPSB7b3ZlcmxheU5vZGUsIGl0ZW1WaWV3fVxuXG4gICAgIyBUaGUgc2FtZSBub2RlIG1heSBiZSB1c2VkIGluIG1vcmUgdGhhbiBvbmUgb3ZlcmxheS4gVGhpcyBzdGVhbHMgdGhlIG5vZGVcbiAgICAjIGJhY2sgaWYgaXQgaGFzIGJlZW4gZGlzcGxheWVkIGluIGFub3RoZXIgb3ZlcmxheS5cbiAgICBvdmVybGF5Tm9kZS5hcHBlbmRDaGlsZChpdGVtVmlldykgaWYgb3ZlcmxheU5vZGUuY2hpbGROb2Rlcy5sZW5ndGggaXMgMFxuXG4gICAgY2FjaGVkT3ZlcmxheS5waXhlbFBvc2l0aW9uID0gcGl4ZWxQb3NpdGlvblxuICAgIG92ZXJsYXlOb2RlLnN0eWxlLnRvcCA9IHBpeGVsUG9zaXRpb24udG9wICsgJ3B4J1xuICAgIG92ZXJsYXlOb2RlLnN0eWxlLmxlZnQgPSBwaXhlbFBvc2l0aW9uLmxlZnQgKyAncHgnXG4iXX0=
