(function() {
  var HighlightsComponent, RegionStyleProperties, SpaceRegex;

  RegionStyleProperties = ['top', 'left', 'right', 'width', 'height'];

  SpaceRegex = /\s+/;

  module.exports = HighlightsComponent = (function() {
    HighlightsComponent.prototype.oldState = null;

    function HighlightsComponent(domElementPool) {
      this.domElementPool = domElementPool;
      this.highlightNodesById = {};
      this.regionNodesByHighlightId = {};
      this.domNode = this.domElementPool.buildElement("div", "highlights");
    }

    HighlightsComponent.prototype.getDomNode = function() {
      return this.domNode;
    };

    HighlightsComponent.prototype.updateSync = function(state) {
      var highlightNode, highlightState, id, newState;
      newState = state.highlights;
      if (this.oldState == null) {
        this.oldState = {};
      }
      for (id in this.oldState) {
        if (newState[id] == null) {
          this.domElementPool.freeElementAndDescendants(this.highlightNodesById[id]);
          delete this.highlightNodesById[id];
          delete this.regionNodesByHighlightId[id];
          delete this.oldState[id];
        }
      }
      for (id in newState) {
        highlightState = newState[id];
        if (this.oldState[id] == null) {
          highlightNode = this.domElementPool.buildElement("div", "highlight");
          this.highlightNodesById[id] = highlightNode;
          this.regionNodesByHighlightId[id] = {};
          this.domNode.appendChild(highlightNode);
        }
        this.updateHighlightNode(id, highlightState);
      }
    };

    HighlightsComponent.prototype.updateHighlightNode = function(id, newHighlightState) {
      var base, highlightNode, oldHighlightState, ref, ref1;
      highlightNode = this.highlightNodesById[id];
      oldHighlightState = ((base = this.oldState)[id] != null ? base[id] : base[id] = {
        regions: [],
        flashCount: 0
      });
      if (newHighlightState["class"] !== oldHighlightState["class"]) {
        if (oldHighlightState["class"] != null) {
          if (SpaceRegex.test(oldHighlightState["class"])) {
            (ref = highlightNode.classList).remove.apply(ref, oldHighlightState["class"].split(SpaceRegex));
          } else {
            highlightNode.classList.remove(oldHighlightState["class"]);
          }
        }
        if (SpaceRegex.test(newHighlightState["class"])) {
          (ref1 = highlightNode.classList).add.apply(ref1, newHighlightState["class"].split(SpaceRegex));
        } else {
          highlightNode.classList.add(newHighlightState["class"]);
        }
        oldHighlightState["class"] = newHighlightState["class"];
      }
      this.updateHighlightRegions(id, newHighlightState);
      return this.flashHighlightNodeIfRequested(id, newHighlightState);
    };

    HighlightsComponent.prototype.updateHighlightRegions = function(id, newHighlightState) {
      var highlightNode, i, j, k, len, len1, newRegionState, oldHighlightState, oldRegionState, property, ref, regionNode;
      oldHighlightState = this.oldState[id];
      highlightNode = this.highlightNodesById[id];
      while (oldHighlightState.regions.length > newHighlightState.regions.length) {
        oldHighlightState.regions.pop();
        this.domElementPool.freeElementAndDescendants(this.regionNodesByHighlightId[id][oldHighlightState.regions.length]);
        delete this.regionNodesByHighlightId[id][oldHighlightState.regions.length];
      }
      ref = newHighlightState.regions;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        newRegionState = ref[i];
        if (oldHighlightState.regions[i] == null) {
          oldHighlightState.regions[i] = {};
          regionNode = this.domElementPool.buildElement("div", "region");
          regionNode.style.boxSizing = "border-box";
          if (newHighlightState.deprecatedRegionClass != null) {
            regionNode.classList.add(newHighlightState.deprecatedRegionClass);
          }
          this.regionNodesByHighlightId[id][i] = regionNode;
          highlightNode.appendChild(regionNode);
        }
        oldRegionState = oldHighlightState.regions[i];
        regionNode = this.regionNodesByHighlightId[id][i];
        for (k = 0, len1 = RegionStyleProperties.length; k < len1; k++) {
          property = RegionStyleProperties[k];
          if (newRegionState[property] !== oldRegionState[property]) {
            oldRegionState[property] = newRegionState[property];
            if (newRegionState[property] != null) {
              regionNode.style[property] = newRegionState[property] + 'px';
            } else {
              regionNode.style[property] = '';
            }
          }
        }
      }
    };

    HighlightsComponent.prototype.flashHighlightNodeIfRequested = function(id, newHighlightState) {
      var addFlashClass, highlightNode, oldHighlightState, removeFlashClass;
      oldHighlightState = this.oldState[id];
      if (newHighlightState.needsFlash && oldHighlightState.flashCount !== newHighlightState.flashCount) {
        highlightNode = this.highlightNodesById[id];
        addFlashClass = (function(_this) {
          return function() {
            highlightNode.classList.add(newHighlightState.flashClass);
            oldHighlightState.flashClass = newHighlightState.flashClass;
            return _this.flashTimeoutId = setTimeout(removeFlashClass, newHighlightState.flashDuration);
          };
        })(this);
        removeFlashClass = (function(_this) {
          return function() {
            highlightNode.classList.remove(oldHighlightState.flashClass);
            oldHighlightState.flashClass = null;
            return clearTimeout(_this.flashTimeoutId);
          };
        })(this);
        if (oldHighlightState.flashClass != null) {
          removeFlashClass();
          requestAnimationFrame(addFlashClass);
        } else {
          addFlashClass();
        }
        return oldHighlightState.flashCount = newHighlightState.flashCount;
      }
    };

    return HighlightsComponent;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2hpZ2hsaWdodHMtY29tcG9uZW50LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEscUJBQUEsR0FBd0IsQ0FBQyxLQUFELEVBQVEsTUFBUixFQUFnQixPQUFoQixFQUF5QixPQUF6QixFQUFrQyxRQUFsQzs7RUFDeEIsVUFBQSxHQUFhOztFQUViLE1BQU0sQ0FBQyxPQUFQLEdBQ007a0NBQ0osUUFBQSxHQUFVOztJQUVHLDZCQUFDLGNBQUQ7TUFBQyxJQUFDLENBQUEsaUJBQUQ7TUFDWixJQUFDLENBQUEsa0JBQUQsR0FBc0I7TUFDdEIsSUFBQyxDQUFBLHdCQUFELEdBQTRCO01BRTVCLElBQUMsQ0FBQSxPQUFELEdBQVcsSUFBQyxDQUFBLGNBQWMsQ0FBQyxZQUFoQixDQUE2QixLQUE3QixFQUFvQyxZQUFwQztJQUpBOztrQ0FNYixVQUFBLEdBQVksU0FBQTthQUNWLElBQUMsQ0FBQTtJQURTOztrQ0FHWixVQUFBLEdBQVksU0FBQyxLQUFEO0FBQ1YsVUFBQTtNQUFBLFFBQUEsR0FBVyxLQUFLLENBQUM7O1FBQ2pCLElBQUMsQ0FBQSxXQUFZOztBQUdiLFdBQUEsbUJBQUE7UUFDRSxJQUFPLG9CQUFQO1VBQ0UsSUFBQyxDQUFBLGNBQWMsQ0FBQyx5QkFBaEIsQ0FBMEMsSUFBQyxDQUFBLGtCQUFtQixDQUFBLEVBQUEsQ0FBOUQ7VUFDQSxPQUFPLElBQUMsQ0FBQSxrQkFBbUIsQ0FBQSxFQUFBO1VBQzNCLE9BQU8sSUFBQyxDQUFBLHdCQUF5QixDQUFBLEVBQUE7VUFDakMsT0FBTyxJQUFDLENBQUEsUUFBUyxDQUFBLEVBQUEsRUFKbkI7O0FBREY7QUFRQSxXQUFBLGNBQUE7O1FBQ0UsSUFBTyx5QkFBUDtVQUNFLGFBQUEsR0FBZ0IsSUFBQyxDQUFBLGNBQWMsQ0FBQyxZQUFoQixDQUE2QixLQUE3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QixVQUFBLENBQVcsZ0JBQVgsRUFBNkIsaUJBQWlCLENBQUMsYUFBL0M7VUFISjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUE7UUFLaEIsZ0JBQUEsR0FBbUIsQ0FBQSxTQUFBLEtBQUE7aUJBQUEsU0FBQTtZQUNqQixhQUFhLENBQUMsU0FBUyxDQUFDLE1BQXhCLENBQStCLGlCQUFpQixDQUFDLFVBQWpEO1lBQ0EsaUJBQWlCLENBQUMsVUFBbEIsR0FBK0I7bUJBQy9CLFlBQUEsQ0FBYSxLQUFDLENBQUEsY0FBZDtVQUhpQjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUE7UUFLbkIsSUFBRyxvQ0FBSDtVQUNFLGdCQUFBLENBQUE7VUFDQSxxQkFBQSxDQUFzQixhQUF0QixFQUZGO1NBQUEsTUFBQTtVQUlFLGFBQUEsQ0FBQSxFQUpGOztlQU1BLGlCQUFpQixDQUFDLFVBQWxCLEdBQStCLGlCQUFpQixDQUFDLFdBbkJuRDs7SUFGNkI7Ozs7O0FBakdqQyIsInNvdXJjZXNDb250ZW50IjpbIlJlZ2lvblN0eWxlUHJvcGVydGllcyA9IFsndG9wJywgJ2xlZnQnLCAncmlnaHQnLCAnd2lkdGgnLCAnaGVpZ2h0J11cblNwYWNlUmVnZXggPSAvXFxzKy9cblxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgSGlnaGxpZ2h0c0NvbXBvbmVudFxuICBvbGRTdGF0ZTogbnVsbFxuXG4gIGNvbnN0cnVjdG9yOiAoQGRvbUVsZW1lbnRQb29sKSAtPlxuICAgIEBoaWdobGlnaHROb2Rlc0J5SWQgPSB7fVxuICAgIEByZWdpb25Ob2Rlc0J5SGlnaGxpZ2h0SWQgPSB7fVxuXG4gICAgQGRvbU5vZGUgPSBAZG9tRWxlbWVudFBvb2wuYnVpbGRFbGVtZW50KFwiZGl2XCIsIFwiaGlnaGxpZ2h0c1wiKVxuXG4gIGdldERvbU5vZGU6IC0+XG4gICAgQGRvbU5vZGVcblxuICB1cGRhdGVTeW5jOiAoc3RhdGUpIC0+XG4gICAgbmV3U3RhdGUgPSBzdGF0ZS5oaWdobGlnaHRzXG4gICAgQG9sZFN0YXRlID89IHt9XG5cbiAgICAjIHJlbW92ZSBoaWdobGlnaHRzXG4gICAgZm9yIGlkIG9mIEBvbGRTdGF0ZVxuICAgICAgdW5sZXNzIG5ld1N0YXRlW2lkXT9cbiAgICAgICAgQGRvbUVsZW1lbnRQb29sLmZyZWVFbGVtZW50QW5kRGVzY2VuZGFudHMoQGhpZ2hsaWdodE5vZGVzQnlJZFtpZF0pXG4gICAgICAgIGRlbGV0ZSBAaGlnaGxpZ2h0Tm9kZXNCeUlkW2lkXVxuICAgICAgICBkZWxldGUgQHJlZ2lvbk5vZGVzQnlIaWdobGlnaHRJZFtpZF1cbiAgICAgICAgZGVsZXRlIEBvbGRTdGF0ZVtpZF1cblxuICAgICMgYWRkIG9yIHVwZGF0ZSBoaWdobGlnaHRzXG4gICAgZm9yIGlkLCBoaWdobGlnaHRTdGF0ZSBvZiBuZXdTdGF0ZVxuICAgICAgdW5sZXNzIEBvbGRTdGF0ZVtpZF0/XG4gICAgICAgIGhpZ2hsaWdodE5vZGUgPSBAZG9tRWxlbWVudFBvb2wuYnVpbGRFbGVtZW50KFwiZGl2XCIsIFwiaGlnaGxpZ2h0XCIpXG4gICAgICAgIEBoaWdobGlnaHROb2Rlc0J5SWRbaWRdID0gaGlnaGxpZ2h0Tm9kZVxuICAgICAgICBAcmVnaW9uTm9kZXNCeUhpZ2hsaWdodElkW2lkXSA9IHt9XG4gICAgICAgIEBkb21Ob2RlLmFwcGVuZENoaWxkKGhpZ2hsaWdodE5vZGUpXG4gICAgICBAdXBkYXRlSGlnaGxpZ2h0Tm9kZShpZCwgaGlnaGxpZ2h0U3RhdGUpXG5cbiAgICByZXR1cm5cblxuICB1cGRhdGVIaWdobGlnaHROb2RlOiAoaWQsIG5ld0hpZ2hsaWdodFN0YXRlKSAtPlxuICAgIGhpZ2hsaWdodE5vZGUgPSBAaGlnaGxpZ2h0Tm9kZXNCeUlkW2lkXVxuICAgIG9sZEhpZ2hsaWdodFN0YXRlID0gKEBvbGRTdGF0ZVtpZF0gPz0ge3JlZ2lvbnM6IFtdLCBmbGFzaENvdW50OiAwfSlcblxuICAgICMgdXBkYXRlIGNsYXNzXG4gICAgaWYgbmV3SGlnaGxpZ2h0U3RhdGUuY2xhc3MgaXNudCBvbGRIaWdobGlnaHRTdGF0ZS5jbGFzc1xuICAgICAgaWYgb2xkSGlnaGxpZ2h0U3RhdGUuY2xhc3M/XG4gICAgICAgIGlmIFNwYWNlUmVnZXgudGVzdChvbGRIaWdobGlnaHRTdGF0ZS5jbGFzcylcbiAgICAgICAgICBoaWdobGlnaHROb2RlLmNsYXNzTGlzdC5yZW1vdmUob2xkSGlnaGxpZ2h0U3RhdGUuY2xhc3Muc3BsaXQoU3BhY2VSZWdleCkuLi4pXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBoaWdobGlnaHROb2RlLmNsYXNzTGlzdC5yZW1vdmUob2xkSGlnaGxpZ2h0U3RhdGUuY2xhc3MpXG5cbiAgICAgIGlmIFNwYWNlUmVnZXgudGVzdChuZXdIaWdobGlnaHRTdGF0ZS5jbGFzcylcbiAgICAgICAgaGlnaGxpZ2h0Tm9kZS5jbGFzc0xpc3QuYWRkKG5ld0hpZ2hsaWdodFN0YXRlLmNsYXNzLnNwbGl0KFNwYWNlUmVnZXgpLi4uKVxuICAgICAgZWxzZVxuICAgICAgICBoaWdobGlnaHROb2RlLmNsYXNzTGlzdC5hZGQobmV3SGlnaGxpZ2h0U3RhdGUuY2xhc3MpXG5cbiAgICAgIG9sZEhpZ2hsaWdodFN0YXRlLmNsYXNzID0gbmV3SGlnaGxpZ2h0U3RhdGUuY2xhc3NcblxuICAgIEB1cGRhdGVIaWdobGlnaHRSZWdpb25zKGlkLCBuZXdIaWdobGlnaHRTdGF0ZSlcbiAgICBAZmxhc2hIaWdobGlnaHROb2RlSWZSZXF1ZXN0ZWQoaWQsIG5ld0hpZ2hsaWdodFN0YXRlKVxuXG4gIHVwZGF0ZUhpZ2hsaWdodFJlZ2lvbnM6IChpZCwgbmV3SGlnaGxpZ2h0U3RhdGUpIC0+XG4gICAgb2xkSGlnaGxpZ2h0U3RhdGUgPSBAb2xkU3RhdGVbaWRdXG4gICAgaGlnaGxpZ2h0Tm9kZSA9IEBoaWdobGlnaHROb2Rlc0J5SWRbaWRdXG5cbiAgICAjIHJlbW92ZSByZWdpb25zXG4gICAgd2hpbGUgb2xkSGlnaGxpZ2h0U3RhdGUucmVnaW9ucy5sZW5ndGggPiBuZXdIaWdobGlnaHRTdGF0ZS5yZWdpb25zLmxlbmd0aFxuICAgICAgb2xkSGlnaGxpZ2h0U3RhdGUucmVnaW9ucy5wb3AoKVxuICAgICAgQGRvbUVsZW1lbnRQb29sLmZyZWVFbGVtZW50QW5kRGVzY2VuZGFudHMoQHJlZ2lvbk5vZGVzQnlIaWdobGlnaHRJZFtpZF1bb2xkSGlnaGxpZ2h0U3RhdGUucmVnaW9ucy5sZW5ndGhdKVxuICAgICAgZGVsZXRlIEByZWdpb25Ob2Rlc0J5SGlnaGxpZ2h0SWRbaWRdW29sZEhpZ2hsaWdodFN0YXRlLnJlZ2lvbnMubGVuZ3RoXVxuXG4gICAgIyBhZGQgb3IgdXBkYXRlIHJlZ2lvbnNcbiAgICBmb3IgbmV3UmVnaW9uU3RhdGUsIGkgaW4gbmV3SGlnaGxpZ2h0U3RhdGUucmVnaW9uc1xuICAgICAgdW5sZXNzIG9sZEhpZ2hsaWdodFN0YXRlLnJlZ2lvbnNbaV0/XG4gICAgICAgIG9sZEhpZ2hsaWdodFN0YXRlLnJlZ2lvbnNbaV0gPSB7fVxuICAgICAgICByZWdpb25Ob2RlID0gQGRvbUVsZW1lbnRQb29sLmJ1aWxkRWxlbWVudChcImRpdlwiLCBcInJlZ2lvblwiKVxuICAgICAgICAjIFRoaXMgcHJldmVudHMgaGlnaGxpZ2h0cyBhdCB0aGUgdGlsZXMgYm91bmRhcmllcyB0byBiZSBoaWRkZW4gYnkgdGhlXG4gICAgICAgICMgc3Vic2VxdWVudCB0aWxlLiBXaGVuIHRoaXMgaGFwcGVucywgc3VicGl4ZWwgYW50aS1hbGlhc2luZyBnZXRzXG4gICAgICAgICMgZGlzYWJsZWQuXG4gICAgICAgIHJlZ2lvbk5vZGUuc3R5bGUuYm94U2l6aW5nID0gXCJib3JkZXItYm94XCJcbiAgICAgICAgcmVnaW9uTm9kZS5jbGFzc0xpc3QuYWRkKG5ld0hpZ2hsaWdodFN0YXRlLmRlcHJlY2F0ZWRSZWdpb25DbGFzcykgaWYgbmV3SGlnaGxpZ2h0U3RhdGUuZGVwcmVjYXRlZFJlZ2lvbkNsYXNzP1xuICAgICAgICBAcmVnaW9uTm9kZXNCeUhpZ2hsaWdodElkW2lkXVtpXSA9IHJlZ2lvbk5vZGVcbiAgICAgICAgaGlnaGxpZ2h0Tm9kZS5hcHBlbmRDaGlsZChyZWdpb25Ob2RlKVxuXG4gICAgICBvbGRSZWdpb25TdGF0ZSA9IG9sZEhpZ2hsaWdodFN0YXRlLnJlZ2lvbnNbaV1cbiAgICAgIHJlZ2lvbk5vZGUgPSBAcmVnaW9uTm9kZXNCeUhpZ2hsaWdodElkW2lkXVtpXVxuXG4gICAgICBmb3IgcHJvcGVydHkgaW4gUmVnaW9uU3R5bGVQcm9wZXJ0aWVzXG4gICAgICAgIGlmIG5ld1JlZ2lvblN0YXRlW3Byb3BlcnR5XSBpc250IG9sZFJlZ2lvblN0YXRlW3Byb3BlcnR5XVxuICAgICAgICAgIG9sZFJlZ2lvblN0YXRlW3Byb3BlcnR5XSA9IG5ld1JlZ2lvblN0YXRlW3Byb3BlcnR5XVxuICAgICAgICAgIGlmIG5ld1JlZ2lvblN0YXRlW3Byb3BlcnR5XT9cbiAgICAgICAgICAgIHJlZ2lvbk5vZGUuc3R5bGVbcHJvcGVydHldID0gbmV3UmVnaW9uU3RhdGVbcHJvcGVydHldICsgJ3B4J1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJlZ2lvbk5vZGUuc3R5bGVbcHJvcGVydHldID0gJydcblxuICAgIHJldHVyblxuXG4gIGZsYXNoSGlnaGxpZ2h0Tm9kZUlmUmVxdWVzdGVkOiAoaWQsIG5ld0hpZ2hsaWdodFN0YXRlKSAtPlxuICAgIG9sZEhpZ2hsaWdodFN0YXRlID0gQG9sZFN0YXRlW2lkXVxuICAgIGlmIG5ld0hpZ2hsaWdodFN0YXRlLm5lZWRzRmxhc2ggYW5kIG9sZEhpZ2hsaWdodFN0YXRlLmZsYXNoQ291bnQgaXNudCBuZXdIaWdobGlnaHRTdGF0ZS5mbGFzaENvdW50XG4gICAgICBoaWdobGlnaHROb2RlID0gQGhpZ2hsaWdodE5vZGVzQnlJZFtpZF1cblxuICAgICAgYWRkRmxhc2hDbGFzcyA9ID0+XG4gICAgICAgIGhpZ2hsaWdodE5vZGUuY2xhc3NMaXN0LmFkZChuZXdIaWdobGlnaHRTdGF0ZS5mbGFzaENsYXNzKVxuICAgICAgICBvbGRIaWdobGlnaHRTdGF0ZS5mbGFzaENsYXNzID0gbmV3SGlnaGxpZ2h0U3RhdGUuZmxhc2hDbGFzc1xuICAgICAgICBAZmxhc2hUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KHJlbW92ZUZsYXNoQ2xhc3MsIG5ld0hpZ2hsaWdodFN0YXRlLmZsYXNoRHVyYXRpb24pXG5cbiAgICAgIHJlbW92ZUZsYXNoQ2xhc3MgPSA9PlxuICAgICAgICBoaWdobGlnaHROb2RlLmNsYXNzTGlzdC5yZW1vdmUob2xkSGlnaGxpZ2h0U3RhdGUuZmxhc2hDbGFzcylcbiAgICAgICAgb2xkSGlnaGxpZ2h0U3RhdGUuZmxhc2hDbGFzcyA9IG51bGxcbiAgICAgICAgY2xlYXJUaW1lb3V0KEBmbGFzaFRpbWVvdXRJZClcblxuICAgICAgaWYgb2xkSGlnaGxpZ2h0U3RhdGUuZmxhc2hDbGFzcz9cbiAgICAgICAgcmVtb3ZlRmxhc2hDbGFzcygpXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZShhZGRGbGFzaENsYXNzKVxuICAgICAgZWxzZVxuICAgICAgICBhZGRGbGFzaENsYXNzKClcblxuICAgICAgb2xkSGlnaGxpZ2h0U3RhdGUuZmxhc2hDb3VudCA9IG5ld0hpZ2hsaWdodFN0YXRlLmZsYXNoQ291bnRcbiJdfQ==
