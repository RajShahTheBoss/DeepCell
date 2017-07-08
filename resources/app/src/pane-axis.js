(function() {
  var CompositeDisposable, Emitter, Model, PaneAxis, PaneAxisElement, flatten, ref,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  ref = require('event-kit'), Emitter = ref.Emitter, CompositeDisposable = ref.CompositeDisposable;

  flatten = require('underscore-plus').flatten;

  Model = require('./model');

  PaneAxisElement = require('./pane-axis-element');

  module.exports = PaneAxis = (function(superClass) {
    extend(PaneAxis, superClass);

    PaneAxis.prototype.parent = null;

    PaneAxis.prototype.container = null;

    PaneAxis.prototype.orientation = null;

    PaneAxis.deserialize = function(state, arg) {
      var deserializers, views;
      deserializers = arg.deserializers, views = arg.views;
      state.children = state.children.map(function(childState) {
        return deserializers.deserialize(childState);
      });
      return new this(state, views);
    };

    function PaneAxis(arg, viewRegistry) {
      var child, children, flexScale, i, len;
      this.orientation = arg.orientation, children = arg.children, flexScale = arg.flexScale;
      this.viewRegistry = viewRegistry;
      this.emitter = new Emitter;
      this.subscriptionsByChild = new WeakMap;
      this.subscriptions = new CompositeDisposable;
      this.children = [];
      if (children != null) {
        for (i = 0, len = children.length; i < len; i++) {
          child = children[i];
          this.addChild(child);
        }
      }
      this.flexScale = flexScale != null ? flexScale : 1;
    }

    PaneAxis.prototype.serialize = function() {
      return {
        deserializer: 'PaneAxis',
        children: this.children.map(function(child) {
          return child.serialize();
        }),
        orientation: this.orientation,
        flexScale: this.flexScale
      };
    };

    PaneAxis.prototype.getElement = function() {
      return this.element != null ? this.element : this.element = new PaneAxisElement().initialize(this, this.viewRegistry);
    };

    PaneAxis.prototype.getFlexScale = function() {
      return this.flexScale;
    };

    PaneAxis.prototype.setFlexScale = function(flexScale1) {
      this.flexScale = flexScale1;
      this.emitter.emit('did-change-flex-scale', this.flexScale);
      return this.flexScale;
    };

    PaneAxis.prototype.getParent = function() {
      return this.parent;
    };

    PaneAxis.prototype.setParent = function(parent) {
      this.parent = parent;
      return this.parent;
    };

    PaneAxis.prototype.getContainer = function() {
      return this.container;
    };

    PaneAxis.prototype.setContainer = function(container) {
      var child, i, len, ref1, results;
      if (container && container !== this.container) {
        this.container = container;
        ref1 = this.children;
        results = [];
        for (i = 0, len = ref1.length; i < len; i++) {
          child = ref1[i];
          results.push(child.setContainer(container));
        }
        return results;
      }
    };

    PaneAxis.prototype.getOrientation = function() {
      return this.orientation;
    };

    PaneAxis.prototype.getChildren = function() {
      return this.children.slice();
    };

    PaneAxis.prototype.getPanes = function() {
      return flatten(this.children.map(function(child) {
        return child.getPanes();
      }));
    };

    PaneAxis.prototype.getItems = function() {
      return flatten(this.children.map(function(child) {
        return child.getItems();
      }));
    };

    PaneAxis.prototype.onDidAddChild = function(fn) {
      return this.emitter.on('did-add-child', fn);
    };

    PaneAxis.prototype.onDidRemoveChild = function(fn) {
      return this.emitter.on('did-remove-child', fn);
    };

    PaneAxis.prototype.onDidReplaceChild = function(fn) {
      return this.emitter.on('did-replace-child', fn);
    };

    PaneAxis.prototype.onDidDestroy = function(fn) {
      return this.emitter.on('did-destroy', fn);
    };

    PaneAxis.prototype.onDidChangeFlexScale = function(fn) {
      return this.emitter.on('did-change-flex-scale', fn);
    };

    PaneAxis.prototype.observeFlexScale = function(fn) {
      fn(this.flexScale);
      return this.onDidChangeFlexScale(fn);
    };

    PaneAxis.prototype.addChild = function(child, index) {
      if (index == null) {
        index = this.children.length;
      }
      this.children.splice(index, 0, child);
      child.setParent(this);
      child.setContainer(this.container);
      this.subscribeToChild(child);
      return this.emitter.emit('did-add-child', {
        child: child,
        index: index
      });
    };

    PaneAxis.prototype.adjustFlexScale = function() {
      var child, i, j, len, len1, needTotal, ref1, ref2, results, total;
      total = 0;
      ref1 = this.children;
      for (i = 0, len = ref1.length; i < len; i++) {
        child = ref1[i];
        total += child.getFlexScale();
      }
      needTotal = this.children.length;
      ref2 = this.children;
      results = [];
      for (j = 0, len1 = ref2.length; j < len1; j++) {
        child = ref2[j];
        results.push(child.setFlexScale(needTotal * child.getFlexScale() / total));
      }
      return results;
    };

    PaneAxis.prototype.removeChild = function(child, replacing) {
      var index;
      if (replacing == null) {
        replacing = false;
      }
      index = this.children.indexOf(child);
      if (index === -1) {
        throw new Error("Removing non-existent child");
      }
      this.unsubscribeFromChild(child);
      this.children.splice(index, 1);
      this.adjustFlexScale();
      this.emitter.emit('did-remove-child', {
        child: child,
        index: index
      });
      if (!replacing && this.children.length < 2) {
        return this.reparentLastChild();
      }
    };

    PaneAxis.prototype.replaceChild = function(oldChild, newChild) {
      var index;
      this.unsubscribeFromChild(oldChild);
      this.subscribeToChild(newChild);
      newChild.setParent(this);
      newChild.setContainer(this.container);
      index = this.children.indexOf(oldChild);
      this.children.splice(index, 1, newChild);
      return this.emitter.emit('did-replace-child', {
        oldChild: oldChild,
        newChild: newChild,
        index: index
      });
    };

    PaneAxis.prototype.insertChildBefore = function(currentChild, newChild) {
      var index;
      index = this.children.indexOf(currentChild);
      return this.addChild(newChild, index);
    };

    PaneAxis.prototype.insertChildAfter = function(currentChild, newChild) {
      var index;
      index = this.children.indexOf(currentChild);
      return this.addChild(newChild, index + 1);
    };

    PaneAxis.prototype.reparentLastChild = function() {
      var lastChild;
      lastChild = this.children[0];
      lastChild.setFlexScale(this.flexScale);
      this.parent.replaceChild(this, lastChild);
      return this.destroy();
    };

    PaneAxis.prototype.subscribeToChild = function(child) {
      var subscription;
      subscription = child.onDidDestroy((function(_this) {
        return function() {
          return _this.removeChild(child);
        };
      })(this));
      this.subscriptionsByChild.set(child, subscription);
      return this.subscriptions.add(subscription);
    };

    PaneAxis.prototype.unsubscribeFromChild = function(child) {
      var subscription;
      subscription = this.subscriptionsByChild.get(child);
      this.subscriptions.remove(subscription);
      return subscription.dispose();
    };

    PaneAxis.prototype.destroyed = function() {
      this.subscriptions.dispose();
      this.emitter.emit('did-destroy');
      return this.emitter.dispose();
    };

    return PaneAxis;

  })(Model);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3BhbmUtYXhpcy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLDRFQUFBO0lBQUE7OztFQUFBLE1BQWlDLE9BQUEsQ0FBUSxXQUFSLENBQWpDLEVBQUMscUJBQUQsRUFBVTs7RUFDVCxVQUFXLE9BQUEsQ0FBUSxpQkFBUjs7RUFDWixLQUFBLEdBQVEsT0FBQSxDQUFRLFNBQVI7O0VBQ1IsZUFBQSxHQUFrQixPQUFBLENBQVEscUJBQVI7O0VBRWxCLE1BQU0sQ0FBQyxPQUFQLEdBQ007Ozt1QkFDSixNQUFBLEdBQVE7O3VCQUNSLFNBQUEsR0FBVzs7dUJBQ1gsV0FBQSxHQUFhOztJQUViLFFBQUMsQ0FBQSxXQUFELEdBQWMsU0FBQyxLQUFELEVBQVEsR0FBUjtBQUNaLFVBQUE7TUFEcUIsbUNBQWU7TUFDcEMsS0FBSyxDQUFDLFFBQU4sR0FBaUIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFmLENBQW1CLFNBQUMsVUFBRDtlQUNsQyxhQUFhLENBQUMsV0FBZCxDQUEwQixVQUExQjtNQURrQyxDQUFuQjthQUViLElBQUEsSUFBQSxDQUFLLEtBQUwsRUFBWSxLQUFaO0lBSFE7O0lBS0Qsa0JBQUMsR0FBRCxFQUFzQyxZQUF0QztBQUNYLFVBQUE7TUFEYSxJQUFDLENBQUEsa0JBQUEsYUFBYSx5QkFBVTtNQUFZLElBQUMsQ0FBQSxlQUFEO01BQ2pELElBQUMsQ0FBQSxPQUFELEdBQVcsSUFBSTtNQUNmLElBQUMsQ0FBQSxvQkFBRCxHQUF3QixJQUFJO01BQzVCLElBQUMsQ0FBQSxhQUFELEdBQWlCLElBQUk7TUFDckIsSUFBQyxDQUFBLFFBQUQsR0FBWTtNQUNaLElBQUcsZ0JBQUg7QUFDRSxhQUFBLDBDQUFBOztVQUFBLElBQUMsQ0FBQSxRQUFELENBQVUsS0FBVjtBQUFBLFNBREY7O01BRUEsSUFBQyxDQUFBLFNB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QSxDQUFBO01BQ3RCLFNBQVMsQ0FBQyxZQUFWLENBQXVCLElBQUMsQ0FBQSxTQUF4QjtNQUNBLElBQUMsQ0FBQSxNQUFNLENBQUMsWUFBUixDQUFxQixJQUFyQixFQUEyQixTQUEzQjthQUNBLElBQUMsQ0FBQSxPQUFELENBQUE7SUFKaUI7O3VCQU1uQixnQkFBQSxHQUFrQixTQUFDLEtBQUQ7QUFDaEIsVUFBQTtNQUFBLFlBQUEsR0FBZSxLQUFLLENBQUMsWUFBTixDQUFtQixDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUE7aUJBQUcsS0FBQyxDQUFBLFdBQUQsQ0FBYSxLQUFiO1FBQUg7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQW5CO01BQ2YsSUFBQyxDQUFBLG9CQUFvQixDQUFDLEdBQXRCLENBQTBCLEtBQTFCLEVBQWlDLFlBQWpDO2FBQ0EsSUFBQyxDQUFBLGFBQWEsQ0FBQyxHQUFmLENBQW1CLFlBQW5CO0lBSGdCOzt1QkFLbEIsb0JBQUEsR0FBc0IsU0FBQyxLQUFEO0FBQ3BCLFVBQUE7TUFBQSxZQUFBLEdBQWUsSUFBQyxDQUFBLG9CQUFvQixDQUFDLEdBQXRCLENBQTBCLEtBQTFCO01BQ2YsSUFBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLFlBQXRCO2FBQ0EsWUFBWSxDQUFDLE9BQWIsQ0FBQTtJQUhvQjs7dUJBS3RCLFNBQUEsR0FBVyxTQUFBO01BQ1QsSUFBQyxDQUFBLGFBQWEsQ0FBQyxPQUFmLENBQUE7TUFDQSxJQUFDLENBQUEsT0FBTyxDQUFDLElBQVQsQ0FBYyxhQUFkO2FBQ0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxPQUFULENBQUE7SUFIUzs7OztLQXpJVTtBQU52QiIsInNvdXJjZXNDb250ZW50IjpbIntFbWl0dGVyLCBDb21wb3NpdGVEaXNwb3NhYmxlfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcbntmbGF0dGVufSA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbk1vZGVsID0gcmVxdWlyZSAnLi9tb2RlbCdcblBhbmVBeGlzRWxlbWVudCA9IHJlcXVpcmUgJy4vcGFuZS1heGlzLWVsZW1lbnQnXG5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIFBhbmVBeGlzIGV4dGVuZHMgTW9kZWxcbiAgcGFyZW50OiBudWxsXG4gIGNvbnRhaW5lcjogbnVsbFxuICBvcmllbnRhdGlvbjogbnVsbFxuXG4gIEBkZXNlcmlhbGl6ZTogKHN0YXRlLCB7ZGVzZXJpYWxpemVycywgdmlld3N9KSAtPlxuICAgIHN0YXRlLmNoaWxkcmVuID0gc3RhdGUuY2hpbGRyZW4ubWFwIChjaGlsZFN0YXRlKSAtPlxuICAgICAgZGVzZXJpYWxpemVycy5kZXNlcmlhbGl6ZShjaGlsZFN0YXRlKVxuICAgIG5ldyB0aGlzKHN0YXRlLCB2aWV3cylcblxuICBjb25zdHJ1Y3RvcjogKHtAb3JpZW50YXRpb24sIGNoaWxkcmVuLCBmbGV4U2NhbGV9LCBAdmlld1JlZ2lzdHJ5KSAtPlxuICAgIEBlbWl0dGVyID0gbmV3IEVtaXR0ZXJcbiAgICBAc3Vic2NyaXB0aW9uc0J5Q2hpbGQgPSBuZXcgV2Vha01hcFxuICAgIEBzdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgICBAY2hpbGRyZW4gPSBbXVxuICAgIGlmIGNoaWxkcmVuP1xuICAgICAgQGFkZENoaWxkKGNoaWxkKSBmb3IgY2hpbGQgaW4gY2hpbGRyZW5cbiAgICBAZmxleFNjYWxlID0gZmxleFNjYWxlID8gMVxuXG4gIHNlcmlhbGl6ZTogLT5cbiAgICBkZXNlcmlhbGl6ZXI6ICdQYW5lQXhpcydcbiAgICBjaGlsZHJlbjogQGNoaWxkcmVuLm1hcCAoY2hpbGQpIC0+IGNoaWxkLnNlcmlhbGl6ZSgpXG4gICAgb3JpZW50YXRpb246IEBvcmllbnRhdGlvblxuICAgIGZsZXhTY2FsZTogQGZsZXhTY2FsZVxuXG4gIGdldEVsZW1lbnQ6IC0+XG4gICAgQGVsZW1lbnQgPz0gbmV3IFBhbmVBeGlzRWxlbWVudCgpLmluaXRpYWxpemUodGhpcywgQHZpZXdSZWdpc3RyeSlcblxuICBnZXRGbGV4U2NhbGU6IC0+IEBmbGV4U2NhbGVcblxuICBzZXRGbGV4U2NhbGU6IChAZmxleFNjYWxlKSAtPlxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2UtZmxleC1zY2FsZScsIEBmbGV4U2NhbGVcbiAgICBAZmxleFNjYWxlXG5cbiAgZ2V0UGFyZW50OiAtPiBAcGFyZW50XG5cbiAgc2V0UGFyZW50OiAoQHBhcmVudCkgLT4gQHBhcmVudFxuXG4gIGdldENvbnRhaW5lcjogLT4gQGNvbnRhaW5lclxuXG4gIHNldENvbnRhaW5lcjogKGNvbnRhaW5lcikgLT5cbiAgICBpZiBjb250YWluZXIgYW5kIGNvbnRhaW5lciBpc250IEBjb250YWluZXJcbiAgICAgIEBjb250YWluZXIgPSBjb250YWluZXJcbiAgICAgIGNoaWxkLnNldENvbnRhaW5lcihjb250YWluZXIpIGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cblxuICBnZXRPcmllbnRhdGlvbjogLT4gQG9yaWVudGF0aW9uXG5cbiAgZ2V0Q2hpbGRyZW46IC0+IEBjaGlsZHJlbi5zbGljZSgpXG5cbiAgZ2V0UGFuZXM6IC0+XG4gICAgZmxhdHRlbihAY2hpbGRyZW4ubWFwIChjaGlsZCkgLT4gY2hpbGQuZ2V0UGFuZXMoKSlcblxuICBnZXRJdGVtczogLT5cbiAgICBmbGF0dGVuKEBjaGlsZHJlbi5tYXAgKGNoaWxkKSAtPiBjaGlsZC5nZXRJdGVtcygpKVxuXG4gIG9uRGlkQWRkQ2hpbGQ6IChmbikgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWFkZC1jaGlsZCcsIGZuXG5cbiAgb25EaWRSZW1vdmVDaGlsZDogKGZuKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtcmVtb3ZlLWNoaWxkJywgZm5cblxuICBvbkRpZFJlcGxhY2VDaGlsZDogKGZuKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtcmVwbGFjZS1jaGlsZCcsIGZuXG5cbiAgb25EaWREZXN0cm95OiAoZm4pIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1kZXN0cm95JywgZm5cblxuICBvbkRpZENoYW5nZUZsZXhTY2FsZTogKGZuKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLWZsZXgtc2NhbGUnLCBmblxuXG4gIG9ic2VydmVGbGV4U2NhbGU6IChmbikgLT5cbiAgICBmbihAZmxleFNjYWxlKVxuICAgIEBvbkRpZENoYW5nZUZsZXhTY2FsZShmbilcblxuICBhZGRDaGlsZDogKGNoaWxkLCBpbmRleD1AY2hpbGRyZW4ubGVuZ3RoKSAtPlxuICAgIEBjaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDAsIGNoaWxkKVxuICAgIGNoaWxkLnNldFBhcmVudCh0aGlzKVxuICAgIGNoaWxkLnNldENvbnRhaW5lcihAY29udGFpbmVyKVxuICAgIEBzdWJzY3JpYmVUb0NoaWxkKGNoaWxkKVxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1hZGQtY2hpbGQnLCB7Y2hpbGQsIGluZGV4fVxuXG4gIGFkanVzdEZsZXhTY2FsZTogLT5cbiAgICAjIGdldCBjdXJyZW50IHRvdGFsIGZsZXggc2NhbGUgb2YgY2hpbGRyZW5cbiAgICB0b3RhbCA9IDBcbiAgICB0b3RhbCArPSBjaGlsZC5nZXRGbGV4U2NhbGUoKSBmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cbiAgICBuZWVkVG90YWwgPSBAY2hpbGRyZW4ubGVuZ3RoXG4gICAgIyBzZXQgZXZlcnkgY2hpbGQncyBmbGV4IHNjYWxlIGJ5IHRoZSByYXRpb1xuICAgIGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cbiAgICAgIGNoaWxkLnNldEZsZXhTY2FsZShuZWVkVG90YWwgKiBjaGlsZC5nZXRGbGV4U2NhbGUoKSAvIHRvdGFsKVxuXG4gIHJlbW92ZUNoaWxkOiAoY2hpbGQsIHJlcGxhY2luZz1mYWxzZSkgLT5cbiAgICBpbmRleCA9IEBjaGlsZHJlbi5pbmRleE9mKGNoaWxkKVxuICAgIHRocm93IG5ldyBFcnJvcihcIlJlbW92aW5nIG5vbi1leGlzdGVudCBjaGlsZFwiKSBpZiBpbmRleCBpcyAtMVxuXG4gICAgQHVuc3Vic2NyaWJlRnJvbUNoaWxkKGNoaWxkKVxuXG4gICAgQGNoaWxkcmVuLnNwbGljZShpbmRleCwgMSlcbiAgICBAYWRqdXN0RmxleFNjYWxlKClcbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtcmVtb3ZlLWNoaWxkJywge2NoaWxkLCBpbmRleH1cbiAgICBAcmVwYXJlbnRMYXN0Q2hpbGQoKSBpZiBub3QgcmVwbGFjaW5nIGFuZCBAY2hpbGRyZW4ubGVuZ3RoIDwgMlxuXG4gIHJlcGxhY2VDaGlsZDogKG9sZENoaWxkLCBuZXdDaGlsZCkgLT5cbiAgICBAdW5zdWJzY3JpYmVGcm9tQ2hpbGQob2xkQ2hpbGQpXG4gICAgQHN1YnNjcmliZVRvQ2hpbGQobmV3Q2hpbGQpXG5cbiAgICBuZXdDaGlsZC5zZXRQYXJlbnQodGhpcylcbiAgICBuZXdDaGlsZC5zZXRDb250YWluZXIoQGNvbnRhaW5lcilcblxuICAgIGluZGV4ID0gQGNoaWxkcmVuLmluZGV4T2Yob2xkQ2hpbGQpXG4gICAgQGNoaWxkcmVuLnNwbGljZShpbmRleCwgMSwgbmV3Q2hpbGQpXG4gICAgQGVtaXR0ZXIuZW1pdCAnZGlkLXJlcGxhY2UtY2hpbGQnLCB7b2xkQ2hpbGQsIG5ld0NoaWxkLCBpbmRleH1cblxuICBpbnNlcnRDaGlsZEJlZm9yZTogKGN1cnJlbnRDaGlsZCwgbmV3Q2hpbGQpIC0+XG4gICAgaW5kZXggPSBAY2hpbGRyZW4uaW5kZXhPZihjdXJyZW50Q2hpbGQpXG4gICAgQGFkZENoaWxkKG5ld0NoaWxkLCBpbmRleClcblxuICBpbnNlcnRDaGlsZEFmdGVyOiAoY3VycmVudENoaWxkLCBuZXdDaGlsZCkgLT5cbiAgICBpbmRleCA9IEBjaGlsZHJlbi5pbmRleE9mKGN1cnJlbnRDaGlsZClcbiAgICBAYWRkQ2hpbGQobmV3Q2hpbGQsIGluZGV4ICsgMSlcblxuICByZXBhcmVudExhc3RDaGlsZDogLT5cbiAgICBsYXN0Q2hpbGQgPSBAY2hpbGRyZW5bMF1cbiAgICBsYXN0Q2hpbGQuc2V0RmxleFNjYWxlKEBmbGV4U2NhbGUpXG4gICAgQHBhcmVudC5yZXBsYWNlQ2hpbGQodGhpcywgbGFzdENoaWxkKVxuICAgIEBkZXN0cm95KClcblxuICBzdWJzY3JpYmVUb0NoaWxkOiAoY2hpbGQpIC0+XG4gICAgc3Vic2NyaXB0aW9uID0gY2hpbGQub25EaWREZXN0cm95ID0+IEByZW1vdmVDaGlsZChjaGlsZClcbiAgICBAc3Vic2NyaXB0aW9uc0J5Q2hpbGQuc2V0KGNoaWxkLCBzdWJzY3JpcHRpb24pXG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkKHN1YnNjcmlwdGlvbilcblxuICB1bnN1YnNjcmliZUZyb21DaGlsZDogKGNoaWxkKSAtPlxuICAgIHN1YnNjcmlwdGlvbiA9IEBzdWJzY3JpcHRpb25zQnlDaGlsZC5nZXQoY2hpbGQpXG4gICAgQHN1YnNjcmlwdGlvbnMucmVtb3ZlKHN1YnNjcmlwdGlvbilcbiAgICBzdWJzY3JpcHRpb24uZGlzcG9zZSgpXG5cbiAgZGVzdHJveWVkOiAtPlxuICAgIEBzdWJzY3JpcHRpb25zLmRpc3Bvc2UoKVxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1kZXN0cm95J1xuICAgIEBlbWl0dGVyLmRpc3Bvc2UoKVxuIl19
