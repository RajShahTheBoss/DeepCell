(function() {
  var AnyConstructor, Disposable, Grim, ViewRegistry, _,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Grim = require('grim');

  Disposable = require('event-kit').Disposable;

  _ = require('underscore-plus');

  AnyConstructor = Symbol('any-constructor');

  module.exports = ViewRegistry = (function() {
    ViewRegistry.prototype.animationFrameRequest = null;

    ViewRegistry.prototype.documentReadInProgress = false;

    ViewRegistry.prototype.performDocumentPollAfterUpdate = false;

    ViewRegistry.prototype.debouncedPerformDocumentPoll = null;

    ViewRegistry.prototype.minimumPollInterval = 200;

    function ViewRegistry(atomEnvironment) {
      this.atomEnvironment = atomEnvironment;
      this.requestDocumentPoll = bind(this.requestDocumentPoll, this);
      this.performDocumentUpdate = bind(this.performDocumentUpdate, this);
      this.polling = false;
      this.clear();
    }

    ViewRegistry.prototype.initialize = function() {
      return this.observer = new MutationObserver(this.requestDocumentPoll);
    };

    ViewRegistry.prototype.clear = function() {
      this.views = new WeakMap;
      this.providers = [];
      this.debouncedPerformDocumentPoll = _.throttle(this.performDocumentPoll, this.minimumPollInterval).bind(this);
      return this.clearDocumentRequests();
    };

    ViewRegistry.prototype.addViewProvider = function(modelConstructor, createView) {
      var provider;
      if (arguments.length === 1) {
        switch (typeof modelConstructor) {
          case 'function':
            provider = {
              createView: modelConstructor,
              modelConstructor: AnyConstructor
            };
            break;
          case 'object':
            Grim.deprecate("atom.views.addViewProvider now takes 2 arguments: a model constructor and a createView function. See docs for details.");
            provider = modelConstructor;
            break;
          default:
            throw new TypeError("Arguments to addViewProvider must be functions");
        }
      } else {
        provider = {
          modelConstructor: modelConstructor,
          createView: createView
        };
      }
      this.providers.push(provider);
      return new Disposable((function(_this) {
        return function() {
          return _this.providers = _this.providers.filter(function(p) {
            return p !== provider;
          });
        };
      })(this));
    };

    ViewRegistry.prototype.getViewProviderCount = function() {
      return this.providers.length;
    };

    ViewRegistry.prototype.getView = function(object) {
      var view;
      if (object == null) {
        return;
      }
      if (view = this.views.get(object)) {
        return view;
      } else {
        view = this.createView(object);
        this.views.set(object, view);
        return view;
      }
    };

    ViewRegistry.prototype.createView = function(object) {
      var element, i, len, provider, ref, ref1, view, viewConstructor;
      if (object instanceof HTMLElement) {
        return object;
      }
      if (typeof (object != null ? object.getElement : void 0) === 'function') {
        element = object.getElement();
        if (element instanceof HTMLElement) {
          return element;
        }
      }
      if ((object != null ? object.element : void 0) instanceof HTMLElement) {
        return object.element;
      }
      if (object != null ? object.jquery : void 0) {
        return object[0];
      }
      ref = this.providers;
      for (i = 0, len = ref.length; i < len; i++) {
        provider = ref[i];
        if (provider.modelConstructor === AnyConstructor) {
          if (element = provider.createView(object, this.atomEnvironment)) {
            return element;
          }
          continue;
        }
        if (object instanceof provider.modelConstructor) {
          if (element = typeof provider.createView === "function" ? provider.createView(object, this.atomEnvironment) : void 0) {
            return element;
          }
          if (viewConstructor = provider.viewConstructor) {
            element = new viewConstructor;
                        if ((ref1 = typeof element.initialize === "function" ? element.initialize(object) : void 0) != null) {
              ref1;
            } else {
              if (typeof element.setModel === "function") {
                element.setModel(object);
              }
            };
            return element;
          }
        }
      }
      if (viewConstructor = object != null ? typeof object.getViewClass === "function" ? object.getViewClass() : void 0 : void 0) {
        view = new viewConstructor(object);
        return view[0];
      }
      throw new Error("Can't create a view for " + object.constructor.name + " instance. Please register a view provider.");
    };

    ViewRegistry.prototype.updateDocument = function(fn) {
      this.documentWriters.push(fn);
      if (!this.documentReadInProgress) {
        this.requestDocumentUpdate();
      }
      return new Disposable((function(_this) {
        return function() {
          return _this.documentWriters = _this.documentWriters.filter(function(writer) {
            return writer !== fn;
          });
        };
      })(this));
    };

    ViewRegistry.prototype.readDocument = function(fn) {
      this.documentReaders.push(fn);
      this.requestDocumentUpdate();
      return new Disposable((function(_this) {
        return function() {
          return _this.documentReaders = _this.documentReaders.filter(function(reader) {
            return reader !== fn;
          });
        };
      })(this));
    };

    ViewRegistry.prototype.pollDocument = function(fn) {
      if (this.documentPollers.length === 0) {
        this.startPollingDocument();
      }
      this.documentPollers.push(fn);
      return new Disposable((function(_this) {
        return function() {
          _this.documentPollers = _this.documentPollers.filter(function(poller) {
            return poller !== fn;
          });
          if (_this.documentPollers.length === 0) {
            return _this.stopPollingDocument();
          }
        };
      })(this));
    };

    ViewRegistry.prototype.pollAfterNextUpdate = function() {
      return this.performDocumentPollAfterUpdate = true;
    };

    ViewRegistry.prototype.getNextUpdatePromise = function() {
      return this.nextUpdatePromise != null ? this.nextUpdatePromise : this.nextUpdatePromise = new Promise((function(_this) {
        return function(resolve) {
          return _this.resolveNextUpdatePromise = resolve;
        };
      })(this));
    };

    ViewRegistry.prototype.clearDocumentRequests = function() {
      this.documentReaders = [];
      this.documentWriters = [];
      this.documentPollers = [];
      this.nextUpdatePromise = null;
      this.resolveNextUpdatePromise = null;
      if (this.animationFrameRequest != null) {
        cancelAnimationFrame(this.animationFrameRequest);
        this.animationFrameRequest = null;
      }
      return this.stopPollingDocument();
    };

    ViewRegistry.prototype.requestDocumentUpdate = function() {
      return this.animationFrameRequest != null ? this.animationFrameRequest : this.animationFrameRequest = requestAnimationFrame(this.performDocumentUpdate);
    };

    ViewRegistry.prototype.performDocumentUpdate = function() {
      var reader, resolveNextUpdatePromise, writer;
      resolveNextUpdatePromise = this.resolveNextUpdatePromise;
      this.animationFrameRequest = null;
      this.nextUpdatePromise = null;
      this.resolveNextUpdatePromise = null;
      while (writer = this.documentWriters.shift()) {
        writer();
      }
      this.documentReadInProgress = true;
      while (reader = this.documentReaders.shift()) {
        reader();
      }
      if (this.performDocumentPollAfterUpdate) {
        this.performDocumentPoll();
      }
      this.performDocumentPollAfterUpdate = false;
      this.documentReadInProgress = false;
      while (writer = this.documentWriters.shift()) {
        writer();
      }
      return typeof resolveNextUpdatePromise === "function" ? resolveNextUpdatePromise() : void 0;
    };

    ViewRegistry.prototype.startPollingDocument = function() {
      window.addEventListener('resize', this.requestDocumentPoll);
      this.observer.observe(document, {
        subtree: true,
        childList: true,
        attributes: true
      });
      return this.polling = true;
    };

    ViewRegistry.prototype.stopPollingDocument = function() {
      if (this.polling) {
        window.removeEventListener('resize', this.requestDocumentPoll);
        this.observer.disconnect();
        return this.polling = false;
      }
    };

    ViewRegistry.prototype.requestDocumentPoll = function() {
      if (this.animationFrameRequest != null) {
        return this.performDocumentPollAfterUpdate = true;
      } else {
        return this.debouncedPerformDocumentPoll();
      }
    };

    ViewRegistry.prototype.performDocumentPoll = function() {
      var i, len, poller, ref;
      ref = this.documentPollers;
      for (i = 0, len = ref.length; i < len; i++) {
        poller = ref[i];
        poller();
      }
    };

    return ViewRegistry;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3ZpZXctcmVnaXN0cnkuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSxpREFBQTtJQUFBOztFQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDTixhQUFjLE9BQUEsQ0FBUSxXQUFSOztFQUNmLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBRUosY0FBQSxHQUFpQixNQUFBLENBQU8saUJBQVA7O0VBcUJqQixNQUFNLENBQUMsT0FBUCxHQUNNOzJCQUNKLHFCQUFBLEdBQXVCOzsyQkFDdkIsc0JBQUEsR0FBd0I7OzJCQUN4Qiw4QkFBQSxHQUFnQzs7MkJBQ2hDLDRCQUFBLEdBQThCOzsyQkFDOUIsbUJBQUEsR0FBcUI7O0lBRVIsc0JBQUMsZUFBRDtNQUFDLElBQUMsQ0FBQSxrQkFBRDs7O01BQ1osSUFBQyxDQUFBLE9BQUQsR0FBVztNQUNYLElBQUMsQ0FBQSxLQUFELENBQUE7SUFGVzs7MkJBSWIsVUFBQSxHQUFZLFNBQUE7YUFDVixJQUFDLENBQUEsUUFBRCxHQUFnQixJQUFBLGdCQUFBLENBQWlCLElBQUMsQ0FBQSxtQkFBbEI7SUFETjs7MkJBR1osS0FBQSxHQUFPLFNBQUE7TUFDTCxJQUFDLENBQUEsS0FBRCxHQUFTLElBQUk7TUFDYixJQUFDLENBQUEsU0FBRCxHQUFhO01BQ2IsSUFBQyxDQUFBLDRCQUFELEdBQWdDLENBQUMsQ0FBQyxRQUFGLENBQVcsSUFBQyxDQUFBLG1CQUFaLEVBQWlDLElBQUMsQ0FBQSxtQkFBbEMsQ0FBc0QsQ0FBQyxJQUF2RCxDQUE0RCxJQUE1RDthQUNoQyxJQUFDLENBQUEscUJBQUQsQ0FBQTtJQUpLOzsyQkFrQ1AsZUFBQSxHQUFpQixTQUFDLGdCQUFELEVBQW1CLFVBQW5CO0FBQ2YsVUFBQTtNQUFBLElBQUcsU0FBUyxDQUFDLE1BQVYsS0FBb0IsQ0FB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Qjs7Ozs7QUFqUHZCIiwic291cmNlc0NvbnRlbnQiOlsiR3JpbSA9IHJlcXVpcmUgJ2dyaW0nXG57RGlzcG9zYWJsZX0gPSByZXF1aXJlICdldmVudC1raXQnXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZS1wbHVzJ1xuXG5BbnlDb25zdHJ1Y3RvciA9IFN5bWJvbCgnYW55LWNvbnN0cnVjdG9yJylcblxuIyBFc3NlbnRpYWw6IGBWaWV3UmVnaXN0cnlgIGhhbmRsZXMgdGhlIGFzc29jaWF0aW9uIGJldHdlZW4gbW9kZWwgYW5kIHZpZXdcbiMgdHlwZXMgaW4gQXRvbS4gV2UgY2FsbCB0aGlzIGFzc29jaWF0aW9uIGEgVmlldyBQcm92aWRlci4gQXMgaW4sIGZvciBhIGdpdmVuXG4jIG1vZGVsLCB0aGlzIGNsYXNzIGNhbiBwcm92aWRlIGEgdmlldyB2aWEgezo6Z2V0Vmlld30sIGFzIGxvbmcgYXMgdGhlXG4jIG1vZGVsL3ZpZXcgYXNzb2NpYXRpb24gd2FzIHJlZ2lzdGVyZWQgdmlhIHs6OmFkZFZpZXdQcm92aWRlcn1cbiNcbiMgSWYgeW91J3JlIGFkZGluZyB5b3VyIG93biBraW5kIG9mIHBhbmUgaXRlbSwgYSBnb29kIHN0cmF0ZWd5IGZvciBhbGwgYnV0IHRoZVxuIyBzaW1wbGVzdCBpdGVtcyBpcyB0byBzZXBhcmF0ZSB0aGUgbW9kZWwgYW5kIHRoZSB2aWV3LiBUaGUgbW9kZWwgaGFuZGxlc1xuIyBhcHBsaWNhdGlvbiBsb2dpYyBhbmQgaXMgdGhlIHByaW1hcnkgcG9pbnQgb2YgQVBJIGludGVyYWN0aW9uLiBUaGUgdmlld1xuIyBqdXN0IGhhbmRsZXMgcHJlc2VudGF0aW9uLlxuI1xuIyBOb3RlOiBNb2RlbHMgY2FuIGJlIGFueSBvYmplY3QsIGJ1dCBtdXN0IGltcGxlbWVudCBhIGBnZXRUaXRsZSgpYCBmdW5jdGlvblxuIyBpZiB0aGV5IGFyZSB0byBiZSBkaXNwbGF5ZWQgaW4gYSB7UGFuZX1cbiNcbiMgVmlldyBwcm92aWRlcnMgaW5mb3JtIHRoZSB3b3Jrc3BhY2UgaG93IHlvdXIgbW9kZWwgb2JqZWN0cyBzaG91bGQgYmVcbiMgcHJlc2VudGVkIGluIHRoZSBET00uIEEgdmlldyBwcm92aWRlciBtdXN0IGFsd2F5cyByZXR1cm4gYSBET00gbm9kZSwgd2hpY2hcbiMgbWFrZXMgW0hUTUwgNSBjdXN0b20gZWxlbWVudHNdKGh0dHA6Ly93d3cuaHRtbDVyb2Nrcy5jb20vZW4vdHV0b3JpYWxzL3dlYmNvbXBvbmVudHMvY3VzdG9tZWxlbWVudHMvKVxuIyBhbiBpZGVhbCB0b29sIGZvciBpbXBsZW1lbnRpbmcgdmlld3MgaW4gQXRvbS5cbiNcbiMgWW91IGNhbiBhY2Nlc3MgdGhlIGBWaWV3UmVnaXN0cnlgIG9iamVjdCB2aWEgYGF0b20udmlld3NgLlxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgVmlld1JlZ2lzdHJ5XG4gIGFuaW1hdGlvbkZyYW1lUmVxdWVzdDogbnVsbFxuICBkb2N1bWVudFJlYWRJblByb2dyZXNzOiBmYWxzZVxuICBwZXJmb3JtRG9jdW1lbnRQb2xsQWZ0ZXJVcGRhdGU6IGZhbHNlXG4gIGRlYm91bmNlZFBlcmZvcm1Eb2N1bWVudFBvbGw6IG51bGxcbiAgbWluaW11bVBvbGxJbnRlcnZhbDogMjAwXG5cbiAgY29uc3RydWN0b3I6IChAYXRvbUVudmlyb25tZW50KSAtPlxuICAgIEBwb2xsaW5nID0gZmFsc2VcbiAgICBAY2xlYXIoKVxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgQG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoQHJlcXVlc3REb2N1bWVudFBvbGwpXG5cbiAgY2xlYXI6IC0+XG4gICAgQHZpZXdzID0gbmV3IFdlYWtNYXBcbiAgICBAcHJvdmlkZXJzID0gW11cbiAgICBAZGVib3VuY2VkUGVyZm9ybURvY3VtZW50UG9sbCA9IF8udGhyb3R0bGUoQHBlcmZvcm1Eb2N1bWVudFBvbGwsIEBtaW5pbXVtUG9sbEludGVydmFsKS5iaW5kKHRoaXMpXG4gICAgQGNsZWFyRG9jdW1lbnRSZXF1ZXN0cygpXG5cbiAgIyBFc3NlbnRpYWw6IEFkZCBhIHByb3ZpZGVyIHRoYXQgd2lsbCBiZSB1c2VkIHRvIGNvbnN0cnVjdCB2aWV3cyBpbiB0aGVcbiAgIyB3b3Jrc3BhY2UncyB2aWV3IGxheWVyIGJhc2VkIG9uIG1vZGVsIG9iamVjdHMgaW4gaXRzIG1vZGVsIGxheWVyLlxuICAjXG4gICMgIyMgRXhhbXBsZXNcbiAgI1xuICAjIFRleHQgZWRpdG9ycyBhcmUgZGl2aWRlZCBpbnRvIGEgbW9kZWwgYW5kIGEgdmlldyBsYXllciwgc28gd2hlbiB5b3UgaW50ZXJhY3RcbiAgIyB3aXRoIG1ldGhvZHMgbGlrZSBgYXRvbS53b3Jrc3BhY2UuZ2V0QWN0aXZlVGV4dEVkaXRvcigpYCB5b3UncmUgb25seSBnb2luZ1xuICAjIHRvIGdldCB0aGUgbW9kZWwgb2JqZWN0LiBXZSBkaXNwbGF5IHRleHQgZWRpdG9ycyBvbiBzY3JlZW4gYnkgdGVhY2hpbmcgdGhlXG4gICMgd29ya3NwYWNlIHdoYXQgdmlldyBjb25zdHJ1Y3RvciBpdCBzaG91bGQgdXNlIHRvIHJlcHJlc2VudCB0aGVtOlxuICAjXG4gICMgYGBgY29mZmVlXG4gICMgYXRvbS52aWV3cy5hZGRWaWV3UHJvdmlkZXIgVGV4dEVkaXRvciwgKHRleHRFZGl0b3IpIC0+XG4gICMgICB0ZXh0RWRpdG9yRWxlbWVudCA9IG5ldyBUZXh0RWRpdG9yRWxlbWVudFxuICAjICAgdGV4dEVkaXRvckVsZW1lbnQuaW5pdGlhbGl6ZSh0ZXh0RWRpdG9yKVxuICAjICAgdGV4dEVkaXRvckVsZW1lbnRcbiAgIyBgYGBcbiAgI1xuICAjICogYG1vZGVsQ29uc3RydWN0b3JgIChvcHRpb25hbCkgQ29uc3RydWN0b3Ige0Z1bmN0aW9ufSBmb3IgeW91ciBtb2RlbC4gSWZcbiAgIyAgIGEgY29uc3RydWN0b3IgaXMgZ2l2ZW4sIHRoZSBgY3JlYXRlVmlld2AgZnVuY3Rpb24gd2lsbCBvbmx5IGJlIHVzZWRcbiAgIyAgIGZvciBtb2RlbCBvYmplY3RzIGluaGVyaXRpbmcgZnJvbSB0aGF0IGNvbnN0cnVjdG9yLiBPdGhlcndpc2UsIGl0IHdpbGxcbiAgIyAgIHdpbGwgYmUgY2FsbGVkIGZvciBhbnkgb2JqZWN0LlxuICAjICogYGNyZWF0ZVZpZXdgIEZhY3Rvcnkge0Z1bmN0aW9ufSB0aGF0IGlzIHBhc3NlZCBhbiBpbnN0YW5jZSBvZiB5b3VyIG1vZGVsXG4gICMgICBhbmQgbXVzdCByZXR1cm4gYSBzdWJjbGFzcyBvZiBgSFRNTEVsZW1lbnRgIG9yIGB1bmRlZmluZWRgLiBJZiBpdCByZXR1cm5zXG4gICMgICBgdW5kZWZpbmVkYCwgdGhlbiB0aGUgcmVnaXN0cnkgd2lsbCBjb250aW51ZSB0byBzZWFyY2ggZm9yIG90aGVyIHZpZXdcbiAgIyAgIHByb3ZpZGVycy5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gcmVtb3ZlIHRoZVxuICAjIGFkZGVkIHByb3ZpZGVyLlxuICBhZGRWaWV3UHJvdmlkZXI6IChtb2RlbENvbnN0cnVjdG9yLCBjcmVhdGVWaWV3KSAtPlxuICAgIGlmIGFyZ3VtZW50cy5sZW5ndGggaXMgMVxuICAgICAgc3dpdGNoIHR5cGVvZiBtb2RlbENvbnN0cnVjdG9yXG4gICAgICAgIHdoZW4gJ2Z1bmN0aW9uJ1xuICAgICAgICAgIHByb3ZpZGVyID0ge2NyZWF0ZVZpZXc6IG1vZGVsQ29uc3RydWN0b3IsIG1vZGVsQ29uc3RydWN0b3I6IEFueUNvbnN0cnVjdG9yfVxuICAgICAgICB3aGVuICdvYmplY3QnXG4gICAgICAgICAgR3JpbS5kZXByZWNhdGUoXCJhdG9tLnZpZXdzLmFkZFZpZXdQcm92aWRlciBub3cgdGFrZXMgMiBhcmd1bWVudHM6IGEgbW9kZWwgY29uc3RydWN0b3IgYW5kIGEgY3JlYXRlVmlldyBmdW5jdGlvbi4gU2VlIGRvY3MgZm9yIGRldGFpbHMuXCIpXG4gICAgICAgICAgcHJvdmlkZXIgPSBtb2RlbENvbnN0cnVjdG9yXG4gICAgICAgIGVsc2VcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQXJndW1lbnRzIHRvIGFkZFZpZXdQcm92aWRlciBtdXN0IGJlIGZ1bmN0aW9uc1wiKVxuICAgIGVsc2VcbiAgICAgIHByb3ZpZGVyID0ge21vZGVsQ29uc3RydWN0b3IsIGNyZWF0ZVZpZXd9XG5cbiAgICBAcHJvdmlkZXJzLnB1c2gocHJvdmlkZXIpXG4gICAgbmV3IERpc3Bvc2FibGUgPT5cbiAgICAgIEBwcm92aWRlcnMgPSBAcHJvdmlkZXJzLmZpbHRlciAocCkgLT4gcCBpc250IHByb3ZpZGVyXG5cbiAgZ2V0Vmlld1Byb3ZpZGVyQ291bnQ6IC0+XG4gICAgQHByb3ZpZGVycy5sZW5ndGhcblxuICAjIEVzc2VudGlhbDogR2V0IHRoZSB2aWV3IGFzc29jaWF0ZWQgd2l0aCBhbiBvYmplY3QgaW4gdGhlIHdvcmtzcGFjZS5cbiAgI1xuICAjIElmIHlvdSdyZSBqdXN0ICp1c2luZyogdGhlIHdvcmtzcGFjZSwgeW91IHNob3VsZG4ndCBuZWVkIHRvIGFjY2VzcyB0aGUgdmlld1xuICAjIGxheWVyLCBidXQgdmlldyBsYXllciBhY2Nlc3MgbWF5IGJlIG5lY2Vzc2FyeSBpZiB5b3Ugd2FudCB0byBwZXJmb3JtIERPTVxuICAjIG1hbmlwdWxhdGlvbiB0aGF0IGlzbid0IHN1cHBvcnRlZCB2aWEgdGhlIG1vZGVsIEFQSS5cbiAgI1xuICAjICMjIFZpZXcgUmVzb2x1dGlvbiBBbGdvcml0aG1cbiAgI1xuICAjIFRoZSB2aWV3IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0IGlzIHJlc29sdmVkIHVzaW5nIHRoZSBmb2xsb3dpbmdcbiAgIyBzZXF1ZW5jZVxuICAjXG4gICMgIDEuIElzIHRoZSBvYmplY3QgYW4gaW5zdGFuY2Ugb2YgYEhUTUxFbGVtZW50YD8gSWYgdHJ1ZSwgcmV0dXJuIHRoZSBvYmplY3QuXG4gICMgIDIuIERvZXMgdGhlIG9iamVjdCBoYXZlIGEgbWV0aG9kIG5hbWVkIGBnZXRFbGVtZW50YCB0aGF0IHJldHVybnMgYW5cbiAgIyAgICAgaW5zdGFuY2Ugb2YgYEhUTUxFbGVtZW50YD8gSWYgdHJ1ZSwgcmV0dXJuIHRoYXQgdmFsdWUuXG4gICMgIDMuIERvZXMgdGhlIG9iamVjdCBoYXZlIGEgcHJvcGVydHkgbmFtZWQgYGVsZW1lbnRgIHdpdGggYSB2YWx1ZSB3aGljaCBpc1xuICAjICAgICBhbiBpbnN0YW5jZSBvZiBgSFRNTEVsZW1lbnRgPyBJZiB0cnVlLCByZXR1cm4gdGhlIHByb3BlcnR5IHZhbHVlLlxuICAjICA0LiBJcyB0aGUgb2JqZWN0IGEgalF1ZXJ5IG9iamVjdCwgaW5kaWNhdGVkIGJ5IHRoZSBwcmVzZW5jZSBvZiBhIGBqcXVlcnlgXG4gICMgICAgIHByb3BlcnR5PyBJZiB0cnVlLCByZXR1cm4gdGhlIHJvb3QgRE9NIGVsZW1lbnQgKGkuZS4gYG9iamVjdFswXWApLlxuICAjICA1LiBIYXMgYSB2aWV3IHByb3ZpZGVyIGJlZW4gcmVnaXN0ZXJlZCBmb3IgdGhlIG9iamVjdD8gSWYgdHJ1ZSwgdXNlIHRoZVxuICAjICAgICBwcm92aWRlciB0byBjcmVhdGUgYSB2aWV3IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LCBhbmQgcmV0dXJuIHRoZVxuICAjICAgICB2aWV3LlxuICAjXG4gICMgSWYgbm8gYXNzb2NpYXRlZCB2aWV3IGlzIHJldHVybmVkIGJ5IHRoZSBzZXF1ZW5jZSBhbiBlcnJvciBpcyB0aHJvd24uXG4gICNcbiAgIyBSZXR1cm5zIGEgRE9NIGVsZW1lbnQuXG4gIGdldFZpZXc6IChvYmplY3QpIC0+XG4gICAgcmV0dXJuIHVubGVzcyBvYmplY3Q/XG5cbiAgICBpZiB2aWV3ID0gQHZpZXdzLmdldChvYmplY3QpXG4gICAgICB2aWV3XG4gICAgZWxzZVxuICAgICAgdmlldyA9IEBjcmVhdGVWaWV3KG9iamVjdClcbiAgICAgIEB2aWV3cy5zZXQob2JqZWN0LCB2aWV3KVxuICAgICAgdmlld1xuXG4gIGNyZWF0ZVZpZXc6IChvYmplY3QpIC0+XG4gICAgaWYgb2JqZWN0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnRcbiAgICAgIHJldHVybiBvYmplY3RcblxuICAgIGlmIHR5cGVvZiBvYmplY3Q/LmdldEVsZW1lbnQgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgZWxlbWVudCA9IG9iamVjdC5nZXRFbGVtZW50KClcbiAgICAgIGlmIGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudFxuICAgICAgICByZXR1cm4gZWxlbWVudFxuXG4gICAgaWYgb2JqZWN0Py5lbGVtZW50IGluc3RhbmNlb2YgSFRNTEVsZW1lbnRcbiAgICAgIHJldHVybiBvYmplY3QuZWxlbWVudFxuXG4gICAgaWYgb2JqZWN0Py5qcXVlcnlcbiAgICAgIHJldHVybiBvYmplY3RbMF1cblxuICAgIGZvciBwcm92aWRlciBpbiBAcHJvdmlkZXJzXG4gICAgICBpZiBwcm92aWRlci5tb2RlbENvbnN0cnVjdG9yIGlzIEFueUNvbnN0cnVjdG9yXG4gICAgICAgIGlmIGVsZW1lbnQgPSBwcm92aWRlci5jcmVhdGVWaWV3KG9iamVjdCwgQGF0b21FbnZpcm9ubWVudClcbiAgICAgICAgICByZXR1cm4gZWxlbWVudFxuICAgICAgICBjb250aW51ZVxuXG4gICAgICBpZiBvYmplY3QgaW5zdGFuY2VvZiBwcm92aWRlci5tb2RlbENvbnN0cnVjdG9yXG4gICAgICAgIGlmIGVsZW1lbnQgPSBwcm92aWRlci5jcmVhdGVWaWV3PyhvYmplY3QsIEBhdG9tRW52aXJvbm1lbnQpXG4gICAgICAgICAgcmV0dXJuIGVsZW1lbnRcblxuICAgICAgICBpZiB2aWV3Q29uc3RydWN0b3IgPSBwcm92aWRlci52aWV3Q29uc3RydWN0b3JcbiAgICAgICAgICBlbGVtZW50ID0gbmV3IHZpZXdDb25zdHJ1Y3RvclxuICAgICAgICAgIGVsZW1lbnQuaW5pdGlhbGl6ZT8ob2JqZWN0KSA/IGVsZW1lbnQuc2V0TW9kZWw/KG9iamVjdClcbiAgICAgICAgICByZXR1cm4gZWxlbWVudFxuXG4gICAgaWYgdmlld0NvbnN0cnVjdG9yID0gb2JqZWN0Py5nZXRWaWV3Q2xhc3M/KClcbiAgICAgIHZpZXcgPSBuZXcgdmlld0NvbnN0cnVjdG9yKG9iamVjdClcbiAgICAgIHJldHVybiB2aWV3WzBdXG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBjcmVhdGUgYSB2aWV3IGZvciAje29iamVjdC5jb25zdHJ1Y3Rvci5uYW1lfSBpbnN0YW5jZS4gUGxlYXNlIHJlZ2lzdGVyIGEgdmlldyBwcm92aWRlci5cIilcblxuICB1cGRhdGVEb2N1bWVudDogKGZuKSAtPlxuICAgIEBkb2N1bWVudFdyaXRlcnMucHVzaChmbilcbiAgICBAcmVxdWVzdERvY3VtZW50VXBkYXRlKCkgdW5sZXNzIEBkb2N1bWVudFJlYWRJblByb2dyZXNzXG4gICAgbmV3IERpc3Bvc2FibGUgPT5cbiAgICAgIEBkb2N1bWVudFdyaXRlcnMgPSBAZG9jdW1lbnRXcml0ZXJzLmZpbHRlciAod3JpdGVyKSAtPiB3cml0ZXIgaXNudCBmblxuXG4gIHJlYWREb2N1bWVudDogKGZuKSAtPlxuICAgIEBkb2N1bWVudFJlYWRlcnMucHVzaChmbilcbiAgICBAcmVxdWVzdERvY3VtZW50VXBkYXRlKClcbiAgICBuZXcgRGlzcG9zYWJsZSA9PlxuICAgICAgQGRvY3VtZW50UmVhZGVycyA9IEBkb2N1bWVudFJlYWRlcnMuZmlsdGVyIChyZWFkZXIpIC0+IHJlYWRlciBpc250IGZuXG5cbiAgcG9sbERvY3VtZW50OiAoZm4pIC0+XG4gICAgQHN0YXJ0UG9sbGluZ0RvY3VtZW50KCkgaWYgQGRvY3VtZW50UG9sbGVycy5sZW5ndGggaXMgMFxuICAgIEBkb2N1bWVudFBvbGxlcnMucHVzaChmbilcbiAgICBuZXcgRGlzcG9zYWJsZSA9PlxuICAgICAgQGRvY3VtZW50UG9sbGVycyA9IEBkb2N1bWVudFBvbGxlcnMuZmlsdGVyIChwb2xsZXIpIC0+IHBvbGxlciBpc250IGZuXG4gICAgICBAc3RvcFBvbGxpbmdEb2N1bWVudCgpIGlmIEBkb2N1bWVudFBvbGxlcnMubGVuZ3RoIGlzIDBcblxuICBwb2xsQWZ0ZXJOZXh0VXBkYXRlOiAtPlxuICAgIEBwZXJmb3JtRG9jdW1lbnRQb2xsQWZ0ZXJVcGRhdGUgPSB0cnVlXG5cbiAgZ2V0TmV4dFVwZGF0ZVByb21pc2U6IC0+XG4gICAgQG5leHRVcGRhdGVQcm9taXNlID89IG5ldyBQcm9taXNlIChyZXNvbHZlKSA9PlxuICAgICAgQHJlc29sdmVOZXh0VXBkYXRlUHJvbWlzZSA9IHJlc29sdmVcblxuICBjbGVhckRvY3VtZW50UmVxdWVzdHM6IC0+XG4gICAgQGRvY3VtZW50UmVhZGVycyA9IFtdXG4gICAgQGRvY3VtZW50V3JpdGVycyA9IFtdXG4gICAgQGRvY3VtZW50UG9sbGVycyA9IFtdXG4gICAgQG5leHRVcGRhdGVQcm9taXNlID0gbnVsbFxuICAgIEByZXNvbHZlTmV4dFVwZGF0ZVByb21pc2UgPSBudWxsXG4gICAgaWYgQGFuaW1hdGlvbkZyYW1lUmVxdWVzdD9cbiAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKEBhbmltYXRpb25GcmFtZVJlcXVlc3QpXG4gICAgICBAYW5pbWF0aW9uRnJhbWVSZXF1ZXN0ID0gbnVsbFxuICAgIEBzdG9wUG9sbGluZ0RvY3VtZW50KClcblxuICByZXF1ZXN0RG9jdW1lbnRVcGRhdGU6IC0+XG4gICAgQGFuaW1hdGlvbkZyYW1lUmVxdWVzdCA/PSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoQHBlcmZvcm1Eb2N1bWVudFVwZGF0ZSlcblxuICBwZXJmb3JtRG9jdW1lbnRVcGRhdGU6ID0+XG4gICAgcmVzb2x2ZU5leHRVcGRhdGVQcm9taXNlID0gQHJlc29sdmVOZXh0VXBkYXRlUHJvbWlzZVxuICAgIEBhbmltYXRpb25GcmFtZVJlcXVlc3QgPSBudWxsXG4gICAgQG5leHRVcGRhdGVQcm9taXNlID0gbnVsbFxuICAgIEByZXNvbHZlTmV4dFVwZGF0ZVByb21pc2UgPSBudWxsXG5cbiAgICB3cml0ZXIoKSB3aGlsZSB3cml0ZXIgPSBAZG9jdW1lbnRXcml0ZXJzLnNoaWZ0KClcblxuICAgIEBkb2N1bWVudFJlYWRJblByb2dyZXNzID0gdHJ1ZVxuICAgIHJlYWRlcigpIHdoaWxlIHJlYWRlciA9IEBkb2N1bWVudFJlYWRlcnMuc2hpZnQoKVxuICAgIEBwZXJmb3JtRG9jdW1lbnRQb2xsKCkgaWYgQHBlcmZvcm1Eb2N1bWVudFBvbGxBZnRlclVwZGF0ZVxuICAgIEBwZXJmb3JtRG9jdW1lbnRQb2xsQWZ0ZXJVcGRhdGUgPSBmYWxzZVxuICAgIEBkb2N1bWVudFJlYWRJblByb2dyZXNzID0gZmFsc2VcblxuICAgICMgcHJvY2VzcyB1cGRhdGVzIHJlcXVlc3RlZCBhcyBhIHJlc3VsdCBvZiByZWFkc1xuICAgIHdyaXRlcigpIHdoaWxlIHdyaXRlciA9IEBkb2N1bWVudFdyaXRlcnMuc2hpZnQoKVxuXG4gICAgcmVzb2x2ZU5leHRVcGRhdGVQcm9taXNlPygpXG5cbiAgc3RhcnRQb2xsaW5nRG9jdW1lbnQ6IC0+XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIEByZXF1ZXN0RG9jdW1lbnRQb2xsKVxuICAgIEBvYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LCB7c3VidHJlZTogdHJ1ZSwgY2hpbGRMaXN0OiB0cnVlLCBhdHRyaWJ1dGVzOiB0cnVlfSlcbiAgICBAcG9sbGluZyA9IHRydWVcblxuICBzdG9wUG9sbGluZ0RvY3VtZW50OiAtPlxuICAgIGlmIEBwb2xsaW5nXG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgQHJlcXVlc3REb2N1bWVudFBvbGwpXG4gICAgICBAb2JzZXJ2ZXIuZGlzY29ubmVjdCgpXG4gICAgICBAcG9sbGluZyA9IGZhbHNlXG5cbiAgcmVxdWVzdERvY3VtZW50UG9sbDogPT5cbiAgICBpZiBAYW5pbWF0aW9uRnJhbWVSZXF1ZXN0P1xuICAgICAgQHBlcmZvcm1Eb2N1bWVudFBvbGxBZnRlclVwZGF0ZSA9IHRydWVcbiAgICBlbHNlXG4gICAgICBAZGVib3VuY2VkUGVyZm9ybURvY3VtZW50UG9sbCgpXG5cbiAgcGVyZm9ybURvY3VtZW50UG9sbDogLT5cbiAgICBwb2xsZXIoKSBmb3IgcG9sbGVyIGluIEBkb2N1bWVudFBvbGxlcnNcbiAgICByZXR1cm5cbiJdfQ==
