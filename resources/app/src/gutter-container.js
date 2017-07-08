(function() {
  var Emitter, Gutter, GutterContainer;

  Emitter = require('event-kit').Emitter;

  Gutter = require('./gutter');

  module.exports = GutterContainer = (function() {
    function GutterContainer(textEditor) {
      this.gutters = [];
      this.textEditor = textEditor;
      this.emitter = new Emitter;
    }

    GutterContainer.prototype.destroy = function() {
      var gutter, guttersToDestroy, j, len;
      guttersToDestroy = this.gutters.slice(0);
      for (j = 0, len = guttersToDestroy.length; j < len; j++) {
        gutter = guttersToDestroy[j];
        if (gutter.name !== 'line-number') {
          gutter.destroy();
        }
      }
      this.gutters = [];
      return this.emitter.dispose();
    };

    GutterContainer.prototype.addGutter = function(options) {
      var gutterName, i, inserted, j, newGutter, ref;
      options = options != null ? options : {};
      gutterName = options.name;
      if (gutterName === null) {
        throw new Error('A name is required to create a gutter.');
      }
      if (this.gutterWithName(gutterName)) {
        throw new Error('Tried to create a gutter with a name that is already in use.');
      }
      newGutter = new Gutter(this, options);
      inserted = false;
      for (i = j = 0, ref = this.gutters.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        if (this.gutters[i].priority >= newGutter.priority) {
          this.gutters.splice(i, 0, newGutter);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        this.gutters.push(newGutter);
      }
      this.emitter.emit('did-add-gutter', newGutter);
      return newGutter;
    };

    GutterContainer.prototype.getGutters = function() {
      return this.gutters.slice();
    };

    GutterContainer.prototype.gutterWithName = function(name) {
      var gutter, j, len, ref;
      ref = this.gutters;
      for (j = 0, len = ref.length; j < len; j++) {
        gutter = ref[j];
        if (gutter.name === name) {
          return gutter;
        }
      }
      return null;
    };

    GutterContainer.prototype.observeGutters = function(callback) {
      var gutter, j, len, ref;
      ref = this.getGutters();
      for (j = 0, len = ref.length; j < len; j++) {
        gutter = ref[j];
        callback(gutter);
      }
      return this.onDidAddGutter(callback);
    };

    GutterContainer.prototype.onDidAddGutter = function(callback) {
      return this.emitter.on('did-add-gutter', callback);
    };

    GutterContainer.prototype.onDidRemoveGutter = function(callback) {
      return this.emitter.on('did-remove-gutter', callback);
    };


    /*
    Section: Private Methods
     */

    GutterContainer.prototype.removeGutter = function(gutter) {
      var index;
      index = this.gutters.indexOf(gutter);
      if (index > -1) {
        this.gutters.splice(index, 1);
        return this.emitter.emit('did-remove-gutter', gutter.name);
      } else {
        throw new Error('The given gutter cannot be removed because it is not ' + 'within this GutterContainer.');
      }
    };

    GutterContainer.prototype.addGutterDecoration = function(gutter, marker, options) {
      if (gutter.name === 'line-number') {
        options.type = 'line-number';
      } else {
        options.type = 'gutter';
      }
      options.gutterName = gutter.name;
      return this.textEditor.decorateMarker(marker, options);
    };

    return GutterContainer;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2d1dHRlci1jb250YWluZXIuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQyxVQUFXLE9BQUEsQ0FBUSxXQUFSOztFQUNaLE1BQUEsR0FBUyxPQUFBLENBQVEsVUFBUjs7RUFFVCxNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1MseUJBQUMsVUFBRDtNQUNYLElBQUMsQ0FBQSxPQUFELEdBQVc7TUFDWCxJQUFDLENBQUEsVUFBRCxHQUFjO01BQ2QsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQUFJO0lBSEo7OzhCQUtiLE9BQUEsR0FBUyxTQUFBO0FBR1AsVUFBQTtNQUFBLGdCQUFBLEdBQW1CLElBQUMsQ0FBQSxPQUFPLENBQUMsS0FBVCxDQUFlLENBQWY7QUFDbkIsV0FBQSxrREFBQTs7UUFDRSxJQUFvQixNQUFNLENBQUMsSUFBUCxLQUFpQixhQUFyQztVQUFBLE1BQU0sQ0FBQyxPQUFQLENBQUEsRUFBQTs7QUFERjtNQUVBLElBQUMsQ0FBQSxPQUFELEdBQVc7YUFDWCxJQUFDLENBQUEsT0FBTyxDQUFDLE9BQVQsQ0FBQTtJQVBPOzs4QkFTVCxTQUFBLEdBQVcsU0FBQyxPQUFEO0FBQ1QsVUFBQTtNQUFBLE9BQUEscUJBQVUsVUFBVTtNQUNwQixVQUFBLEdBQWEsT0FBTyxDQUFDO01BQ3JCLElBQUcsVUFBQSxLQUFjLElBQWpCO0FBQ0UsY0FBVSxJQUFBLEtBQUEsQ0FBTSx3Q0FBTixFQURaOztNQUVBLElBQUcsSUFBQyxDQUFBLGNBQUQsQ0FBZ0IsVUFBaEIsQ0FBSDtBQUNFLGNBQVUsSUFBQSxLQUFBLENBQU0sOERBQU4sRUFEWjs7TUFFQSxTQUFBLEdBQWdCLElBQUEsTUFBQSxDQUFPLElBQVAsRUFBYSxPQUFiO01BRWhCLFFBQUEsR0FBVztBQUdYLFdBQVMsNEZBQVQ7UUFDRSxJQUFHLElBQUMsQ0FBQSxPQUFRLENBQUEsQ0FBQSxDQUFFLENBQUMsUUFBWixJQUF3QixTQUFTLENBQUMsUUFBckM7VUFDRSxJQUFDLENBQUEsT0FBTyxDQUFDLE1BQVQsQ0FBZ0IsQ0FBaEIsRUFBbUIsQ0FBbkIsRUFBc0IsU0FBdEI7VUFDQSxRQUFBLEdBQVc7QUFDWCxnQkFIRjs7QUFERjtNQUtBLElBQUcsQ0FBSSxRQUFQO1FBQ0UsSUFBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULENBQWMsU0FBZCxFQURGOztNQUVBLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLGdCQUFkLEVBQWdDLFNBQWhDO0FBQ0EsYUFBTztJQXBCRTs7OEJBc0JYLFVBQUEsR0FBWSxTQUFBO2FBQ1YsSUFBQyxDQUFBLE9BQU8sQ0FBQyxLQUFULENBQUE7SUFEVTs7OEJBR1osY0FBQSxHQUFnQixTQUFDLElBQUQ7QUFDZCxVQUFBO0FBQUE7QUFBQSxXQUFBLHFDQUFBOztRQUNFLElBQUcsTUFBTSxDQUFDLElBQVAsS0FBZSxJQUFsQjtBQUE0QixpQkFBTyxPQUFuQzs7QUFERjthQUVBO0lBSGM7OzhCQUtoQixjQUFBLEdBQWdCLFNBQUMsUUFBRDtBQUNkLFVBQUE7QUFBQTtBQUFBLFdBQUEscUNBQUE7O1FBQUEsUUFBQSxDQUFTLE1BQVQ7QUFBQTthQUNBLElBQUMsQ0FBQSxjQUFELENBQWdCLFFBQWhCO0lBRmM7OzhCQUloQixjQUFBLEdBQWdCLFNBQUMsUUFBRDthQUNkLElBQUMsQ0FBQSxPQUFPLENBQUMsRUFBVCxDQUFZLGdCQUFaLEVBQThCLFFBQTlCO0lBRGM7OzhCQUdoQixpQkFBQSxHQUFtQixTQUFDLFFBQUQ7YUFDakIsSUFBQyxDQUFBLE9BQU8sQ0FBQyxFQUFULENBQVksbUJBQVosRUFBaUMsUUFBakM7SUFEaUI7OztBQUduQjs7Ozs4QkFNQSxZQUFBLEdBQWMsU0FBQyxNQUFEO0FBQ1osVUFBQTtNQUFBLEtBQUEsR0FBUSxJQUFDLENBQUEsT0FBTyxDQUFDLE9BQVQsQ0FBaUIsTUFBakI7TUFDUixJQUFHLEtBQUEsR0FBUSxDQUFDLENBQVo7UUFDRSxJQUFDLENBQUEsT0FBTyxDQUFDLE1BQVQsQ0FBZ0IsS0FBaEIsRUFBdUIsQ0FBdkI7ZUFDQSxJQUFDLENBQUEsT0FBTyxDQUFDLElBQVQsQ0FBYyxtQkFBZCxFQUFtQyxNQUFNLENBQUMsSUFBMUMsRUFGRjtPQUFBLE1BQUE7QUFJRSxjQUFVLElBQUEsS0FBQSxDQUFNLHVEQUFBLEdBQ1osOEJBRE0sRUFKWjs7SUFGWTs7OEJBVWQsbUJBQUEsR0FBcUIsU0FBQyxNQUFELEVBQVMsTUFBVCxFQUFpQixPQUFqQjtNQUNuQixJQUFHLE1BQU0sQ0FBQyxJQUFQLEtBQWUsYUFBbEI7UUFDRSxPQUFPLENBQUMsSUFBUixHQUFlLGNBRGpCO09BQUEsTUFBQTtRQUdFLE9BQU8sQ0FBQyxJQUFSLEdBQWUsU0FIakI7O01BSUEsT0FBTyxDQUFDLFVBQVIsR0FBcUIsTUFBTSxDQUFDO2FBQzVCLElBQUMsQ0FBQSxVQUFVLENBQUMsY0FBWixDQUEyQixNQUEzQixFQUFtQyxPQUFuQztJQU5tQjs7Ozs7QUEzRXZCIiwic291cmNlc0NvbnRlbnQiOlsie0VtaXR0ZXJ9ID0gcmVxdWlyZSAnZXZlbnQta2l0J1xuR3V0dGVyID0gcmVxdWlyZSAnLi9ndXR0ZXInXG5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIEd1dHRlckNvbnRhaW5lclxuICBjb25zdHJ1Y3RvcjogKHRleHRFZGl0b3IpIC0+XG4gICAgQGd1dHRlcnMgPSBbXVxuICAgIEB0ZXh0RWRpdG9yID0gdGV4dEVkaXRvclxuICAgIEBlbWl0dGVyID0gbmV3IEVtaXR0ZXJcblxuICBkZXN0cm95OiAtPlxuICAgICMgQ3JlYXRlIGEgY29weSwgYmVjYXVzZSBgR3V0dGVyOjpkZXN0cm95YCByZW1vdmVzIHRoZSBndXR0ZXIgZnJvbVxuICAgICMgR3V0dGVyQ29udGFpbmVyJ3MgQGd1dHRlcnMuXG4gICAgZ3V0dGVyc1RvRGVzdHJveSA9IEBndXR0ZXJzLnNsaWNlKDApXG4gICAgZm9yIGd1dHRlciBpbiBndXR0ZXJzVG9EZXN0cm95XG4gICAgICBndXR0ZXIuZGVzdHJveSgpIGlmIGd1dHRlci5uYW1lIGlzbnQgJ2xpbmUtbnVtYmVyJ1xuICAgIEBndXR0ZXJzID0gW11cbiAgICBAZW1pdHRlci5kaXNwb3NlKClcblxuICBhZGRHdXR0ZXI6IChvcHRpb25zKSAtPlxuICAgIG9wdGlvbnMgPSBvcHRpb25zID8ge31cbiAgICBndXR0ZXJOYW1lID0gb3B0aW9ucy5uYW1lXG4gICAgaWYgZ3V0dGVyTmFtZSBpcyBudWxsXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0EgbmFtZSBpcyByZXF1aXJlZCB0byBjcmVhdGUgYSBndXR0ZXIuJylcbiAgICBpZiBAZ3V0dGVyV2l0aE5hbWUoZ3V0dGVyTmFtZSlcbiAgICAgIHRocm93IG5ldyBFcnJvcignVHJpZWQgdG8gY3JlYXRlIGEgZ3V0dGVyIHdpdGggYSBuYW1lIHRoYXQgaXMgYWxyZWFkeSBpbiB1c2UuJylcbiAgICBuZXdHdXR0ZXIgPSBuZXcgR3V0dGVyKHRoaXMsIG9wdGlvbnMpXG5cbiAgICBpbnNlcnRlZCA9IGZhbHNlXG4gICAgIyBJbnNlcnQgdGhlIGd1dHRlciBpbnRvIHRoZSBndXR0ZXJzIGFycmF5LCBzb3J0ZWQgaW4gYXNjZW5kaW5nIG9yZGVyIGJ5ICdwcmlvcml0eScuXG4gICAgIyBUaGlzIGNvdWxkIGJlIG9wdGltaXplZCwgYnV0IHRoZXJlIGFyZSB1bmxpa2VseSB0byBiZSBtYW55IGd1dHRlcnMuXG4gICAgZm9yIGkgaW4gWzAuLi5AZ3V0dGVycy5sZW5ndGhdXG4gICAgICBpZiBAZ3V0dGVyc1tpXS5wcmlvcml0eSA+PSBuZXdHdXR0ZXIucHJpb3JpdHlcbiAgICAgICAgQGd1dHRlcnMuc3BsaWNlKGksIDAsIG5ld0d1dHRlcilcbiAgICAgICAgaW5zZXJ0ZWQgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgaWYgbm90IGluc2VydGVkXG4gICAgICBAZ3V0dGVycy5wdXNoIG5ld0d1dHRlclxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1hZGQtZ3V0dGVyJywgbmV3R3V0dGVyXG4gICAgcmV0dXJuIG5ld0d1dHRlclxuXG4gIGdldEd1dHRlcnM6IC0+XG4gICAgQGd1dHRlcnMuc2xpY2UoKVxuXG4gIGd1dHRlcldpdGhOYW1lOiAobmFtZSkgLT5cbiAgICBmb3IgZ3V0dGVyIGluIEBndXR0ZXJzXG4gICAgICBpZiBndXR0ZXIubmFtZSBpcyBuYW1lIHRoZW4gcmV0dXJuIGd1dHRlclxuICAgIG51bGxcblxuICBvYnNlcnZlR3V0dGVyczogKGNhbGxiYWNrKSAtPlxuICAgIGNhbGxiYWNrKGd1dHRlcikgZm9yIGd1dHRlciBpbiBAZ2V0R3V0dGVycygpXG4gICAgQG9uRGlkQWRkR3V0dGVyIGNhbGxiYWNrXG5cbiAgb25EaWRBZGRHdXR0ZXI6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWFkZC1ndXR0ZXInLCBjYWxsYmFja1xuXG4gIG9uRGlkUmVtb3ZlR3V0dGVyOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1yZW1vdmUtZ3V0dGVyJywgY2FsbGJhY2tcblxuICAjIyNcbiAgU2VjdGlvbjogUHJpdmF0ZSBNZXRob2RzXG4gICMjI1xuXG4gICMgUHJvY2Vzc2VzIHRoZSBkZXN0cnVjdGlvbiBvZiB0aGUgZ3V0dGVyLiBUaHJvd3MgYW4gZXJyb3IgaWYgdGhpcyBndXR0ZXIgaXNcbiAgIyBub3Qgd2l0aGluIHRoaXMgZ3V0dGVyQ29udGFpbmVyLlxuICByZW1vdmVHdXR0ZXI6IChndXR0ZXIpIC0+XG4gICAgaW5kZXggPSBAZ3V0dGVycy5pbmRleE9mKGd1dHRlcilcbiAgICBpZiBpbmRleCA+IC0xXG4gICAgICBAZ3V0dGVycy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtcmVtb3ZlLWd1dHRlcicsIGd1dHRlci5uYW1lXG4gICAgZWxzZVxuICAgICAgdGhyb3cgbmV3IEVycm9yICdUaGUgZ2l2ZW4gZ3V0dGVyIGNhbm5vdCBiZSByZW1vdmVkIGJlY2F1c2UgaXQgaXMgbm90ICcgK1xuICAgICAgICAgICd3aXRoaW4gdGhpcyBHdXR0ZXJDb250YWluZXIuJ1xuXG4gICMgVGhlIHB1YmxpYyBpbnRlcmZhY2UgaXMgR3V0dGVyOjpkZWNvcmF0ZU1hcmtlciBvciBUZXh0RWRpdG9yOjpkZWNvcmF0ZU1hcmtlci5cbiAgYWRkR3V0dGVyRGVjb3JhdGlvbjogKGd1dHRlciwgbWFya2VyLCBvcHRpb25zKSAtPlxuICAgIGlmIGd1dHRlci5uYW1lIGlzICdsaW5lLW51bWJlcidcbiAgICAgIG9wdGlvbnMudHlwZSA9ICdsaW5lLW51bWJlcidcbiAgICBlbHNlXG4gICAgICBvcHRpb25zLnR5cGUgPSAnZ3V0dGVyJ1xuICAgIG9wdGlvbnMuZ3V0dGVyTmFtZSA9IGd1dHRlci5uYW1lXG4gICAgQHRleHRFZGl0b3IuZGVjb3JhdGVNYXJrZXIobWFya2VyLCBvcHRpb25zKVxuIl19
