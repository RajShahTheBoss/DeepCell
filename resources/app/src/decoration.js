(function() {
  var Decoration, Emitter, _, idCounter, nextId, translateDecorationParamsOldToNew,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _ = require('underscore-plus');

  Emitter = require('event-kit').Emitter;

  idCounter = 0;

  nextId = function() {
    return idCounter++;
  };

  translateDecorationParamsOldToNew = function(decorationParams) {
    if (decorationParams.type === 'line-number') {
      decorationParams.gutterName = 'line-number';
    }
    return decorationParams;
  };

  module.exports = Decoration = (function() {
    Decoration.isType = function(decorationProperties, type) {
      var ref;
      if (_.isArray(decorationProperties.type)) {
        if (indexOf.call(decorationProperties.type, type) >= 0) {
          return true;
        }
        if (type === 'gutter') {
          if (indexOf.call(decorationProperties.type, 'line-number') >= 0) {
            return true;
          }
        }
        return false;
      } else {
        if (type === 'gutter') {
          if ((ref = decorationProperties.type) === 'gutter' || ref === 'line-number') {
            return true;
          }
        } else {
          return type === decorationProperties.type;
        }
      }
    };


    /*
    Section: Construction and Destruction
     */

    function Decoration(marker, decorationManager, properties) {
      this.marker = marker;
      this.decorationManager = decorationManager;
      this.emitter = new Emitter;
      this.id = nextId();
      this.setProperties(properties);
      this.destroyed = false;
      this.markerDestroyDisposable = this.marker.onDidDestroy((function(_this) {
        return function() {
          return _this.destroy();
        };
      })(this));
    }

    Decoration.prototype.destroy = function() {
      if (this.destroyed) {
        return;
      }
      this.markerDestroyDisposable.dispose();
      this.markerDestroyDisposable = null;
      this.destroyed = true;
      this.decorationManager.didDestroyMarkerDecoration(this);
      this.emitter.emit('did-destroy');
      return this.emitter.dispose();
    };

    Decoration.prototype.isDestroyed = function() {
      return this.destroyed;
    };


    /*
    Section: Event Subscription
     */

    Decoration.prototype.onDidChangeProperties = function(callback) {
      return this.emitter.on('did-change-properties', callback);
    };

    Decoration.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };


    /*
    Section: Decoration Details
     */

    Decoration.prototype.getId = function() {
      return this.id;
    };

    Decoration.prototype.getMarker = function() {
      return this.marker;
    };

    Decoration.prototype.isType = function(type) {
      return Decoration.isType(this.properties, type);
    };


    /*
    Section: Properties
     */

    Decoration.prototype.getProperties = function() {
      return this.properties;
    };

    Decoration.prototype.setProperties = function(newProperties) {
      var oldProperties;
      if (this.destroyed) {
        return;
      }
      oldProperties = this.properties;
      this.properties = translateDecorationParamsOldToNew(newProperties);
      if (newProperties.type != null) {
        this.decorationManager.decorationDidChangeType(this);
      }
      this.decorationManager.scheduleUpdateDecorationsEvent();
      return this.emitter.emit('did-change-properties', {
        oldProperties: oldProperties,
        newProperties: newProperties
      });
    };


    /*
    Section: Utility
     */

    Decoration.prototype.inspect = function() {
      return "<Decoration " + this.id + ">";
    };


    /*
    Section: Private methods
     */

    Decoration.prototype.matchesPattern = function(decorationPattern) {
      var key, value;
      if (decorationPattern == null) {
        return false;
      }
      for (key in decorationPattern) {
        value = decorationPattern[key];
        if (this.properties[key] !== value) {
          return false;
        }
      }
      return true;
    };

    Decoration.prototype.flash = function(klass, duration) {
      var base;
      if (duration == null) {
        duration = 500;
      }
      if ((base = this.properties).flashCount == null) {
        base.flashCount = 0;
      }
      this.properties.flashCount++;
      this.properties.flashClass = klass;
      this.properties.flashDuration = duration;
      this.decorationManager.scheduleUpdateDecorationsEvent();
      return this.emitter.emit('did-flash');
    };

    return Decoration;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2RlY29yYXRpb24uY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSw0RUFBQTtJQUFBOztFQUFBLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBQ0gsVUFBVyxPQUFBLENBQVEsV0FBUjs7RUFFWixTQUFBLEdBQVk7O0VBQ1osTUFBQSxHQUFTLFNBQUE7V0FBRyxTQUFBO0VBQUg7O0VBSVQsaUNBQUEsR0FBb0MsU0FBQyxnQkFBRDtJQUNsQyxJQUFHLGdCQUFnQixDQUFDLElBQWpCLEtBQXlCLGFBQTVCO01BQ0UsZ0JBQWdCLENBQUMsVUFBakIsR0FBOEIsY0FEaEM7O1dBRUE7RUFIa0M7O0VBMkJwQyxNQUFNLENBQUMsT0FBUCxHQUNNO0lBV0osVUFBQyxDQUFBLE1BQUQsR0FBUyxTQUFDLG9CQUFELEVBQXVCLElBQXZCO0FBRVAsVUFBQTtNQUFBLElBQUcsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxvQkFBb0IsQ0FBQyxJQUEvQixDQUFIO1FBQ0UsSUFBZSxhQUFRLG9CQUFvQixDQUFDLElBQTdCLEVBQUEsSUFBQSxNQUFmO0FBQUEsaUJBQU8sS0FBUDs7UUFDQSxJQUFHLElBQUEsS0FBUSxRQUFYO1VBQ0UsSUFBZSxhQUFpQixvQkFBb0IsQ0FBQyxJQUF0QyxFQUFBLGFBQUEsTUFBZjtBQUFBLG1CQUFPLEtBQVA7V0FERjs7QUFFQSxlQUFPLE1BSlQ7T0FBQSxNQUFBO1FBTUUsSUFBRyxJQUFBLEtBQVEsUUFBWDtVQUNFLFdBQWUsb0JBQW9CLENBQUMsS0FBckIsS0FBOEIsUUFBOUIsSUFBQSxHQUFBLEtBQXdDLGFBQXZEO0FBQUEsbUJBQU8sS0FBUDtXQURGO1NBQUEsTUFBQTtpQkFHRSxJQUFBLEtBQVEsb0JBQW9CLENBQUMsS0FIL0I7U0FORjs7SUFGTzs7O0FBYVQ7Ozs7SUFJYSxvQkFBQyxNQUFELEVB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QUF5QjtNQUN6QixJQUFDLENBQUEsVUFBVSxDQUFDLGFBQVosR0FBNEI7TUFDNUIsSUFBQyxDQUFBLGlCQUFpQixDQUFDLDhCQUFuQixDQUFBO2FBQ0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULENBQWMsV0FBZDtJQU5LOzs7OztBQTVLVCIsInNvdXJjZXNDb250ZW50IjpbIl8gPSByZXF1aXJlICd1bmRlcnNjb3JlLXBsdXMnXG57RW1pdHRlcn0gPSByZXF1aXJlICdldmVudC1raXQnXG5cbmlkQ291bnRlciA9IDBcbm5leHRJZCA9IC0+IGlkQ291bnRlcisrXG5cbiMgQXBwbGllcyBjaGFuZ2VzIHRvIGEgZGVjb3JhdGlvbnNQYXJhbSB7T2JqZWN0fSB0byBtYWtlIGl0IHBvc3NpYmxlIHRvXG4jIGRpZmZlcmVudGlhdGUgZGVjb3JhdGlvbnMgb24gY3VzdG9tIGd1dHRlcnMgdmVyc3VzIHRoZSBsaW5lLW51bWJlciBndXR0ZXIuXG50cmFuc2xhdGVEZWNvcmF0aW9uUGFyYW1zT2xkVG9OZXcgPSAoZGVjb3JhdGlvblBhcmFtcykgLT5cbiAgaWYgZGVjb3JhdGlvblBhcmFtcy50eXBlIGlzICdsaW5lLW51bWJlcidcbiAgICBkZWNvcmF0aW9uUGFyYW1zLmd1dHRlck5hbWUgPSAnbGluZS1udW1iZXInXG4gIGRlY29yYXRpb25QYXJhbXNcblxuIyBFc3NlbnRpYWw6IFJlcHJlc2VudHMgYSBkZWNvcmF0aW9uIHRoYXQgZm9sbG93cyBhIHtEaXNwbGF5TWFya2VyfS4gQSBkZWNvcmF0aW9uIGlzXG4jIGJhc2ljYWxseSBhIHZpc3VhbCByZXByZXNlbnRhdGlvbiBvZiBhIG1hcmtlci4gSXQgYWxsb3dzIHlvdSB0byBhZGQgQ1NTXG4jIGNsYXNzZXMgdG8gbGluZSBudW1iZXJzIGluIHRoZSBndXR0ZXIsIGxpbmVzLCBhbmQgYWRkIHNlbGVjdGlvbi1saW5lIHJlZ2lvbnNcbiMgYXJvdW5kIG1hcmtlZCByYW5nZXMgb2YgdGV4dC5cbiNcbiMge0RlY29yYXRpb259IG9iamVjdHMgYXJlIG5vdCBtZWFudCB0byBiZSBjcmVhdGVkIGRpcmVjdGx5LCBidXQgY3JlYXRlZCB3aXRoXG4jIHtUZXh0RWRpdG9yOjpkZWNvcmF0ZU1hcmtlcn0uIGVnLlxuI1xuIyBgYGBjb2ZmZWVcbiMgcmFuZ2UgPSBlZGl0b3IuZ2V0U2VsZWN0ZWRCdWZmZXJSYW5nZSgpICMgYW55IHJhbmdlIHlvdSBsaWtlXG4jIG1hcmtlciA9IGVkaXRvci5tYXJrQnVmZmVyUmFuZ2UocmFuZ2UpXG4jIGRlY29yYXRpb24gPSBlZGl0b3IuZGVjb3JhdGVNYXJrZXIobWFya2VyLCB7dHlwZTogJ2xpbmUnLCBjbGFzczogJ215LWxpbmUtY2xhc3MnfSlcbiMgYGBgXG4jXG4jIEJlc3QgcHJhY3RpY2UgZm9yIGRlc3Ryb3lpbmcgdGhlIGRlY29yYXRpb24gaXMgYnkgZGVzdHJveWluZyB0aGUge0Rpc3BsYXlNYXJrZXJ9LlxuI1xuIyBgYGBjb2ZmZWVcbiMgbWFya2VyLmRlc3Ryb3koKVxuIyBgYGBcbiNcbiMgWW91IHNob3VsZCBvbmx5IHVzZSB7RGVjb3JhdGlvbjo6ZGVzdHJveX0gd2hlbiB5b3Ugc3RpbGwgbmVlZCBvciBkbyBub3Qgb3duXG4jIHRoZSBtYXJrZXIuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBEZWNvcmF0aW9uXG4gICMgUHJpdmF0ZTogQ2hlY2sgaWYgdGhlIGBkZWNvcmF0aW9uUHJvcGVydGllcy50eXBlYCBtYXRjaGVzIGB0eXBlYFxuICAjXG4gICMgKiBgZGVjb3JhdGlvblByb3BlcnRpZXNgIHtPYmplY3R9IGVnLiBge3R5cGU6ICdsaW5lLW51bWJlcicsIGNsYXNzOiAnbXktbmV3LWNsYXNzJ31gXG4gICMgKiBgdHlwZWAge1N0cmluZ30gdHlwZSBsaWtlIGAnbGluZS1udW1iZXInYCwgYCdsaW5lJ2AsIGV0Yy4gYHR5cGVgIGNhbiBhbHNvXG4gICMgICBiZSBhbiB7QXJyYXl9IG9mIHtTdHJpbmd9cywgd2hlcmUgaXQgd2lsbCByZXR1cm4gdHJ1ZSBpZiB0aGUgZGVjb3JhdGlvbidzXG4gICMgICB0eXBlIG1hdGNoZXMgYW55IGluIHRoZSBhcnJheS5cbiAgI1xuICAjIFJldHVybnMge0Jvb2xlYW59XG4gICMgTm90ZTogJ2xpbmUtbnVtYmVyJyBpcyBhIHNwZWNpYWwgc3VidHlwZSBvZiB0aGUgJ2d1dHRlcicgdHlwZS4gSS5lLiwgYVxuICAjICdsaW5lLW51bWJlcicgaXMgYSAnZ3V0dGVyJywgYnV0IGEgJ2d1dHRlcicgaXMgbm90IGEgJ2xpbmUtbnVtYmVyJy5cbiAgQGlzVHlwZTogKGRlY29yYXRpb25Qcm9wZXJ0aWVzLCB0eXBlKSAtPlxuICAgICMgJ2xpbmUtbnVtYmVyJyBpcyBhIHNwZWNpYWwgY2FzZSBvZiAnZ3V0dGVyJy5cbiAgICBpZiBfLmlzQXJyYXkoZGVjb3JhdGlvblByb3BlcnRpZXMudHlwZSlcbiAgICAgIHJldHVybiB0cnVlIGlmIHR5cGUgaW4gZGVjb3JhdGlvblByb3BlcnRpZXMudHlwZVxuICAgICAgaWYgdHlwZSBpcyAnZ3V0dGVyJ1xuICAgICAgICByZXR1cm4gdHJ1ZSBpZiAnbGluZS1udW1iZXInIGluIGRlY29yYXRpb25Qcm9wZXJ0aWVzLnR5cGVcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIGVsc2VcbiAgICAgIGlmIHR5cGUgaXMgJ2d1dHRlcidcbiAgICAgICAgcmV0dXJuIHRydWUgaWYgZGVjb3JhdGlvblByb3BlcnRpZXMudHlwZSBpbiBbJ2d1dHRlcicsICdsaW5lLW51bWJlciddXG4gICAgICBlbHNlXG4gICAgICAgIHR5cGUgaXMgZGVjb3JhdGlvblByb3BlcnRpZXMudHlwZVxuXG4gICMjI1xuICBTZWN0aW9uOiBDb25zdHJ1Y3Rpb24gYW5kIERlc3RydWN0aW9uXG4gICMjI1xuXG4gIGNvbnN0cnVjdG9yOiAoQG1hcmtlciwgQGRlY29yYXRpb25NYW5hZ2VyLCBwcm9wZXJ0aWVzKSAtPlxuICAgIEBlbWl0dGVyID0gbmV3IEVtaXR0ZXJcbiAgICBAaWQgPSBuZXh0SWQoKVxuICAgIEBzZXRQcm9wZXJ0aWVzIHByb3BlcnRpZXNcbiAgICBAZGVzdHJveWVkID0gZmFsc2VcbiAgICBAbWFya2VyRGVzdHJveURpc3Bvc2FibGUgPSBAbWFya2VyLm9uRGlkRGVzdHJveSA9PiBAZGVzdHJveSgpXG5cbiAgIyBFc3NlbnRpYWw6IERlc3Ryb3kgdGhpcyBtYXJrZXIgZGVjb3JhdGlvbi5cbiAgI1xuICAjIFlvdSBjYW4gYWxzbyBkZXN0cm95IHRoZSBtYXJrZXIgaWYgeW91IG93biBpdCwgd2hpY2ggd2lsbCBkZXN0cm95IHRoaXNcbiAgIyBkZWNvcmF0aW9uLlxuICBkZXN0cm95OiAtPlxuICAgIHJldHVybiBpZiBAZGVzdHJveWVkXG4gICAgQG1hcmtlckRlc3Ryb3lEaXNwb3NhYmxlLmRpc3Bvc2UoKVxuICAgIEBtYXJrZXJEZXN0cm95RGlzcG9zYWJsZSA9IG51bGxcbiAgICBAZGVzdHJveWVkID0gdHJ1ZVxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5kaWREZXN0cm95TWFya2VyRGVjb3JhdGlvbih0aGlzKVxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1kZXN0cm95J1xuICAgIEBlbWl0dGVyLmRpc3Bvc2UoKVxuXG4gIGlzRGVzdHJveWVkOiAtPiBAZGVzdHJveWVkXG5cbiAgIyMjXG4gIFNlY3Rpb246IEV2ZW50IFN1YnNjcmlwdGlvblxuICAjIyNcblxuICAjIEVzc2VudGlhbDogV2hlbiB0aGUge0RlY29yYXRpb259IGlzIHVwZGF0ZWQgdmlhIHtEZWNvcmF0aW9uOjp1cGRhdGV9LlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgICogYGV2ZW50YCB7T2JqZWN0fVxuICAjICAgICAqIGBvbGRQcm9wZXJ0aWVzYCB7T2JqZWN0fSB0aGUgb2xkIHBhcmFtZXRlcnMgdGhlIGRlY29yYXRpb24gdXNlZCB0byBoYXZlXG4gICMgICAgICogYG5ld1Byb3BlcnRpZXNgIHtPYmplY3R9IHRoZSBuZXcgcGFyYW1ldGVycyB0aGUgZGVjb3JhdGlvbiBub3cgaGFzXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZENoYW5nZVByb3BlcnRpZXM6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWNoYW5nZS1wcm9wZXJ0aWVzJywgY2FsbGJhY2tcblxuICAjIEVzc2VudGlhbDogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIHRoZSB7RGVjb3JhdGlvbn0gaXMgZGVzdHJveWVkXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufVxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWREZXN0cm95OiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1kZXN0cm95JywgY2FsbGJhY2tcblxuICAjIyNcbiAgU2VjdGlvbjogRGVjb3JhdGlvbiBEZXRhaWxzXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBBbiBpZCB1bmlxdWUgYWNyb3NzIGFsbCB7RGVjb3JhdGlvbn0gb2JqZWN0c1xuICBnZXRJZDogLT4gQGlkXG5cbiAgIyBFc3NlbnRpYWw6IFJldHVybnMgdGhlIG1hcmtlciBhc3NvY2lhdGVkIHdpdGggdGhpcyB7RGVjb3JhdGlvbn1cbiAgZ2V0TWFya2VyOiAtPiBAbWFya2VyXG5cbiAgIyBQdWJsaWM6IENoZWNrIGlmIHRoaXMgZGVjb3JhdGlvbiBpcyBvZiB0eXBlIGB0eXBlYFxuICAjXG4gICMgKiBgdHlwZWAge1N0cmluZ30gdHlwZSBsaWtlIGAnbGluZS1udW1iZXInYCwgYCdsaW5lJ2AsIGV0Yy4gYHR5cGVgIGNhbiBhbHNvXG4gICMgICBiZSBhbiB7QXJyYXl9IG9mIHtTdHJpbmd9cywgd2hlcmUgaXQgd2lsbCByZXR1cm4gdHJ1ZSBpZiB0aGUgZGVjb3JhdGlvbidzXG4gICMgICB0eXBlIG1hdGNoZXMgYW55IGluIHRoZSBhcnJheS5cbiAgI1xuICAjIFJldHVybnMge0Jvb2xlYW59XG4gIGlzVHlwZTogKHR5cGUpIC0+XG4gICAgRGVjb3JhdGlvbi5pc1R5cGUoQHByb3BlcnRpZXMsIHR5cGUpXG5cbiAgIyMjXG4gIFNlY3Rpb246IFByb3BlcnRpZXNcbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IFJldHVybnMgdGhlIHtEZWNvcmF0aW9ufSdzIHByb3BlcnRpZXMuXG4gIGdldFByb3BlcnRpZXM6IC0+XG4gICAgQHByb3BlcnRpZXNcblxuICAjIEVzc2VudGlhbDogVXBkYXRlIHRoZSBtYXJrZXIgd2l0aCBuZXcgUHJvcGVydGllcy4gQWxsb3dzIHlvdSB0byBjaGFuZ2UgdGhlIGRlY29yYXRpb24ncyBjbGFzcy5cbiAgI1xuICAjICMjIEV4YW1wbGVzXG4gICNcbiAgIyBgYGBjb2ZmZWVcbiAgIyBkZWNvcmF0aW9uLnVwZGF0ZSh7dHlwZTogJ2xpbmUtbnVtYmVyJywgY2xhc3M6ICdteS1uZXctY2xhc3MnfSlcbiAgIyBgYGBcbiAgI1xuICAjICogYG5ld1Byb3BlcnRpZXNgIHtPYmplY3R9IGVnLiBge3R5cGU6ICdsaW5lLW51bWJlcicsIGNsYXNzOiAnbXktbmV3LWNsYXNzJ31gXG4gIHNldFByb3BlcnRpZXM6IChuZXdQcm9wZXJ0aWVzKSAtPlxuICAgIHJldHVybiBpZiBAZGVzdHJveWVkXG4gICAgb2xkUHJvcGVydGllcyA9IEBwcm9wZXJ0aWVzXG4gICAgQHByb3BlcnRpZXMgPSB0cmFuc2xhdGVEZWNvcmF0aW9uUGFyYW1zT2xkVG9OZXcobmV3UHJvcGVydGllcylcbiAgICBpZiBuZXdQcm9wZXJ0aWVzLnR5cGU/XG4gICAgICBAZGVjb3JhdGlvbk1hbmFnZXIuZGVjb3JhdGlvbkRpZENoYW5nZVR5cGUodGhpcylcbiAgICBAZGVjb3JhdGlvbk1hbmFnZXIuc2NoZWR1bGVVcGRhdGVEZWNvcmF0aW9uc0V2ZW50KClcbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLXByb3BlcnRpZXMnLCB7b2xkUHJvcGVydGllcywgbmV3UHJvcGVydGllc31cblxuICAjIyNcbiAgU2VjdGlvbjogVXRpbGl0eVxuICAjIyNcblxuICBpbnNwZWN0OiAtPlxuICAgIFwiPERlY29yYXRpb24gI3tAaWR9PlwiXG5cbiAgIyMjXG4gIFNlY3Rpb246IFByaXZhdGUgbWV0aG9kc1xuICAjIyNcblxuICBtYXRjaGVzUGF0dGVybjogKGRlY29yYXRpb25QYXR0ZXJuKSAtPlxuICAgIHJldHVybiBmYWxzZSB1bmxlc3MgZGVjb3JhdGlvblBhdHRlcm4/XG4gICAgZm9yIGtleSwgdmFsdWUgb2YgZGVjb3JhdGlvblBhdHRlcm5cbiAgICAgIHJldHVybiBmYWxzZSBpZiBAcHJvcGVydGllc1trZXldIGlzbnQgdmFsdWVcbiAgICB0cnVlXG5cbiAgZmxhc2g6IChrbGFzcywgZHVyYXRpb249NTAwKSAtPlxuICAgIEBwcm9wZXJ0aWVzLmZsYXNoQ291bnQgPz0gMFxuICAgIEBwcm9wZXJ0aWVzLmZsYXNoQ291bnQrK1xuICAgIEBwcm9wZXJ0aWVzLmZsYXNoQ2xhc3MgPSBrbGFzc1xuICAgIEBwcm9wZXJ0aWVzLmZsYXNoRHVyYXRpb24gPSBkdXJhdGlvblxuICAgIEBkZWNvcmF0aW9uTWFuYWdlci5zY2hlZHVsZVVwZGF0ZURlY29yYXRpb25zRXZlbnQoKVxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1mbGFzaCdcbiJdfQ==
