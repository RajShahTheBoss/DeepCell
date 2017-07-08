(function() {
  var LayerDecoration, idCounter, nextId;

  idCounter = 0;

  nextId = function() {
    return idCounter++;
  };

  module.exports = LayerDecoration = (function() {
    function LayerDecoration(markerLayer, decorationManager, properties1) {
      this.markerLayer = markerLayer;
      this.decorationManager = decorationManager;
      this.properties = properties1;
      this.id = nextId();
      this.destroyed = false;
      this.markerLayerDestroyedDisposable = this.markerLayer.onDidDestroy((function(_this) {
        return function() {
          return _this.destroy();
        };
      })(this));
      this.overridePropertiesByMarkerId = {};
    }

    LayerDecoration.prototype.destroy = function() {
      if (this.destroyed) {
        return;
      }
      this.markerLayerDestroyedDisposable.dispose();
      this.markerLayerDestroyedDisposable = null;
      this.destroyed = true;
      return this.decorationManager.didDestroyLayerDecoration(this);
    };

    LayerDecoration.prototype.isDestroyed = function() {
      return this.destroyed;
    };

    LayerDecoration.prototype.getId = function() {
      return this.id;
    };

    LayerDecoration.prototype.getMarkerLayer = function() {
      return this.markerLayer;
    };

    LayerDecoration.prototype.getProperties = function() {
      return this.properties;
    };

    LayerDecoration.prototype.setProperties = function(newProperties) {
      if (this.destroyed) {
        return;
      }
      this.properties = newProperties;
      return this.decorationManager.scheduleUpdateDecorationsEvent();
    };

    LayerDecoration.prototype.setPropertiesForMarker = function(marker, properties) {
      if (this.destroyed) {
        return;
      }
      if (properties != null) {
        this.overridePropertiesByMarkerId[marker.id] = properties;
      } else {
        delete this.overridePropertiesByMarkerId[marker.id];
      }
      return this.decorationManager.scheduleUpdateDecorationsEvent();
    };

    return LayerDecoration;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2xheWVyLWRlY29yYXRpb24uY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQSxTQUFBLEdBQVk7O0VBQ1osTUFBQSxHQUFTLFNBQUE7V0FBRyxTQUFBO0VBQUg7O0VBSVQsTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNTLHlCQUFDLFdBQUQsRUFBZSxpQkFBZixFQUFtQyxXQUFuQztNQUFDLElBQUMsQ0FBQSxjQUFEO01BQWMsSUFBQyxDQUFBLG9CQUFEO01BQW9CLElBQUMsQ0FBQSxhQUFEO01BQzlDLElBQUMsQ0FBQSxFQUFELEdBQU0sTUFBQSxDQUFBO01BQ04sSUFBQyxDQUFBLFNBQUQsR0FBYTtNQUNiLElBQUMsQ0FBQSw4QkFBRCxHQUFrQyxJQUFDLENBQUEsV0FBVyxDQUFDLFlBQWIsQ0FBMEIsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO2lCQUFHLEtBQUMsQ0FBQSxPQUFELENBQUE7UUFBSDtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMUI7TUFDbEMsSUFBQyxDQUFBLDRCQUFELEdBQWdDO0lBSnJCOzs4QkFPYixPQUFBLEdBQVMsU0FBQTtNQUNQLElBQVUsSUFBQyxDQUFBLFNBQVg7QUFBQSxlQUFBOztNQUNBLElBQUMsQ0FBQSw4QkFBOEIsQ0FBQyxPQUFoQyxDQUFBO01BQ0EsSUFBQyxDQUFBLDhCQUFELEdBQWtDO01BQ2xDLElBQUMsQ0FBQSxTQUFELEdBQWE7YUFDYixJQUFDLENBQUEsaUJBQWlCLENBQUMseUJBQW5CLENBQTZDLElBQTdDO0lBTE87OzhCQVVULFdBQUEsR0FBYSxTQUFBO2FBQUcsSUFBQyxDQUFBO0lBQUo7OzhCQUViLEtBQUEsR0FBTyxTQUFBO2FBQUcsSUFBQyxDQUFBO0lBQUo7OzhCQUVQLGNBQUEsR0FBZ0IsU0FBQTthQUFHLElBQUMsQ0FBQTtJQUFKOzs4QkFLaEIsYUFBQSxHQUFlLFNBQUE7YUFDYixJQUFDLENBQUE7SUFEWTs7OEJBUWYsYUFBQSxHQUFlLFNBQUMsYUFBRDtNQUNiLElBQVUsSUFBQyxDQUFBLFNBQVg7QUFBQSxlQUFBOztNQUNBLElBQUMsQ0FBQSxVQUFELEdBQWM7YUFDZCxJQUFDLENBQUEsaUJBQWlCLENBQUMsOEJBQW5CLENBQUE7SUFIYTs7OEJBV2Ysc0JBQUEsR0FBd0IsU0FBQyxNQUFELEVBQVMsVUFBVDtNQUN0QixJQUFVLElBQUMsQ0FBQSxTQUFYO0FBQUEsZUFBQTs7TUFDQSxJQUFHLGtCQUFIO1FBQ0UsSUFBQyxDQUFBLDRCQUE2QixDQUFBLE1BQU0sQ0FBQyxFQUFQLENBQTlCLEdBQTJDLFdBRDdDO09BQUEsTUFBQTtRQUdFLE9BQU8sSUFBQyxDQUFBLDRCQUE2QixDQUFBLE1BQU0sQ0FBQyxFQUFQLEVBSHZDOzthQUlBLElBQUMsQ0FBQSxpQkFBaUIsQ0FBQyw4QkFBbkIsQ0FBQTtJQU5zQjs7Ozs7QUFwRDFCIiwic291cmNlc0NvbnRlbnQiOlsiaWRDb3VudGVyID0gMFxubmV4dElkID0gLT4gaWRDb3VudGVyKytcblxuIyBFc3NlbnRpYWw6IFJlcHJlc2VudHMgYSBkZWNvcmF0aW9uIHRoYXQgYXBwbGllcyB0byBldmVyeSBtYXJrZXIgb24gYSBnaXZlblxuIyBsYXllci4gQ3JlYXRlZCB2aWEge1RleHRFZGl0b3I6OmRlY29yYXRlTWFya2VyTGF5ZXJ9LlxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgTGF5ZXJEZWNvcmF0aW9uXG4gIGNvbnN0cnVjdG9yOiAoQG1hcmtlckxheWVyLCBAZGVjb3JhdGlvbk1hbmFnZXIsIEBwcm9wZXJ0aWVzKSAtPlxuICAgIEBpZCA9IG5leHRJZCgpXG4gICAgQGRlc3Ryb3llZCA9IGZhbHNlXG4gICAgQG1hcmtlckxheWVyRGVzdHJveWVkRGlzcG9zYWJsZSA9IEBtYXJrZXJMYXllci5vbkRpZERlc3Ryb3kgPT4gQGRlc3Ryb3koKVxuICAgIEBvdmVycmlkZVByb3BlcnRpZXNCeU1hcmtlcklkID0ge31cblxuICAjIEVzc2VudGlhbDogRGVzdHJveXMgdGhlIGRlY29yYXRpb24uXG4gIGRlc3Ryb3k6IC0+XG4gICAgcmV0dXJuIGlmIEBkZXN0cm95ZWRcbiAgICBAbWFya2VyTGF5ZXJEZXN0cm95ZWREaXNwb3NhYmxlLmRpc3Bvc2UoKVxuICAgIEBtYXJrZXJMYXllckRlc3Ryb3llZERpc3Bvc2FibGUgPSBudWxsXG4gICAgQGRlc3Ryb3llZCA9IHRydWVcbiAgICBAZGVjb3JhdGlvbk1hbmFnZXIuZGlkRGVzdHJveUxheWVyRGVjb3JhdGlvbih0aGlzKVxuXG4gICMgRXNzZW50aWFsOiBEZXRlcm1pbmUgd2hldGhlciB0aGlzIGRlY29yYXRpb24gaXMgZGVzdHJveWVkLlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufS5cbiAgaXNEZXN0cm95ZWQ6IC0+IEBkZXN0cm95ZWRcblxuICBnZXRJZDogLT4gQGlkXG5cbiAgZ2V0TWFya2VyTGF5ZXI6IC0+IEBtYXJrZXJMYXllclxuXG4gICMgRXNzZW50aWFsOiBHZXQgdGhpcyBkZWNvcmF0aW9uJ3MgcHJvcGVydGllcy5cbiAgI1xuICAjIFJldHVybnMgYW4ge09iamVjdH0uXG4gIGdldFByb3BlcnRpZXM6IC0+XG4gICAgQHByb3BlcnRpZXNcblxuICAjIEVzc2VudGlhbDogU2V0IHRoaXMgZGVjb3JhdGlvbidzIHByb3BlcnRpZXMuXG4gICNcbiAgIyAqIGBuZXdQcm9wZXJ0aWVzYCBTZWUge1RleHRFZGl0b3I6OmRlY29yYXRlTWFya2VyfSBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvblxuICAjICAgdGhlIHByb3BlcnRpZXMuIFRoZSBgdHlwZWAgb2YgYGd1dHRlcmAgYW5kIGBvdmVybGF5YCBhcmUgbm90IHN1cHBvcnRlZCBvblxuICAjICAgbGF5ZXIgZGVjb3JhdGlvbnMuXG4gIHNldFByb3BlcnRpZXM6IChuZXdQcm9wZXJ0aWVzKSAtPlxuICAgIHJldHVybiBpZiBAZGVzdHJveWVkXG4gICAgQHByb3BlcnRpZXMgPSBuZXdQcm9wZXJ0aWVzXG4gICAgQGRlY29yYXRpb25NYW5hZ2VyLnNjaGVkdWxlVXBkYXRlRGVjb3JhdGlvbnNFdmVudCgpXG5cbiAgIyBFc3NlbnRpYWw6IE92ZXJyaWRlIHRoZSBkZWNvcmF0aW9uIHByb3BlcnRpZXMgZm9yIGEgc3BlY2lmaWMgbWFya2VyLlxuICAjXG4gICMgKiBgbWFya2VyYCBUaGUge0Rpc3BsYXlNYXJrZXJ9IG9yIHtNYXJrZXJ9IGZvciB3aGljaCB0byBvdmVycmlkZVxuICAjICAgcHJvcGVydGllcy5cbiAgIyAqIGBwcm9wZXJ0aWVzYCBBbiB7T2JqZWN0fSBjb250YWluaW5nIHByb3BlcnRpZXMgdG8gYXBwbHkgdG8gdGhpcyBtYXJrZXIuXG4gICMgICBQYXNzIGBudWxsYCB0byBjbGVhciB0aGUgb3ZlcnJpZGUuXG4gIHNldFByb3BlcnRpZXNGb3JNYXJrZXI6IChtYXJrZXIsIHByb3BlcnRpZXMpIC0+XG4gICAgcmV0dXJuIGlmIEBkZXN0cm95ZWRcbiAgICBpZiBwcm9wZXJ0aWVzP1xuICAgICAgQG92ZXJyaWRlUHJvcGVydGllc0J5TWFya2VySWRbbWFya2VyLmlkXSA9IHByb3BlcnRpZXNcbiAgICBlbHNlXG4gICAgICBkZWxldGUgQG92ZXJyaWRlUHJvcGVydGllc0J5TWFya2VySWRbbWFya2VyLmlkXVxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5zY2hlZHVsZVVwZGF0ZURlY29yYXRpb25zRXZlbnQoKVxuIl19
