(function() {
  var DefaultPriority, Emitter, Gutter;

  Emitter = require('event-kit').Emitter;

  DefaultPriority = -100;

  module.exports = Gutter = (function() {
    function Gutter(gutterContainer, options) {
      var ref, ref1;
      this.gutterContainer = gutterContainer;
      this.name = options != null ? options.name : void 0;
      this.priority = (ref = options != null ? options.priority : void 0) != null ? ref : DefaultPriority;
      this.visible = (ref1 = options != null ? options.visible : void 0) != null ? ref1 : true;
      this.emitter = new Emitter;
    }


    /*
    Section: Gutter Destruction
     */

    Gutter.prototype.destroy = function() {
      if (this.name === 'line-number') {
        throw new Error('The line-number gutter cannot be destroyed.');
      } else {
        this.gutterContainer.removeGutter(this);
        this.emitter.emit('did-destroy');
        return this.emitter.dispose();
      }
    };

    Gutter.prototype.getElement = function() {
      var childNode;
      if (this.element == null) {
        this.element = document.createElement('div');
        this.element.classList.add('gutter');
        this.element.setAttribute('gutter-name', this.name);
        childNode = document.createElement('div');
        if (this.name === 'line-number') {
          childNode.classList.add('line-numbers');
        } else {
          childNode.classList.add('custom-decorations');
        }
        this.element.appendChild(childNode);
      }
      return this.element;
    };


    /*
    Section: Event Subscription
     */

    Gutter.prototype.onDidChangeVisible = function(callback) {
      return this.emitter.on('did-change-visible', callback);
    };

    Gutter.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };


    /*
    Section: Visibility
     */

    Gutter.prototype.hide = function() {
      if (this.visible) {
        this.visible = false;
        return this.emitter.emit('did-change-visible', this);
      }
    };

    Gutter.prototype.show = function() {
      if (!this.visible) {
        this.visible = true;
        return this.emitter.emit('did-change-visible', this);
      }
    };

    Gutter.prototype.isVisible = function() {
      return this.visible;
    };

    Gutter.prototype.decorateMarker = function(marker, options) {
      return this.gutterContainer.addGutterDecoration(this, marker, options);
    };

    return Gutter;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2d1dHRlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFDLFVBQVcsT0FBQSxDQUFRLFdBQVI7O0VBRVosZUFBQSxHQUFrQixDQUFDOztFQUtuQixNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1MsZ0JBQUMsZUFBRCxFQUFrQixPQUFsQjtBQUNYLFVBQUE7TUFBQSxJQUFDLENBQUEsZUFBRCxHQUFtQjtNQUNuQixJQUFDLENBQUEsSUFBRCxxQkFBUSxPQUFPLENBQUU7TUFDakIsSUFBQyxDQUFBLFFBQUQsdUVBQWdDO01BQ2hDLElBQUMsQ0FBQSxPQUFELHdFQUE4QjtNQUU5QixJQUFDLENBQUEsT0FBRCxHQUFXLElBQUk7SUFOSjs7O0FBUWI7Ozs7cUJBS0EsT0FBQSxHQUFTLFNBQUE7TUFDUCxJQUFHLElBQUMsQ0FBQSxJQUFELEtBQVMsYUFBWjtBQUNFLGNBQVUsSUFBQSxLQUFBLENBQU0sNkNBQU4sRUFEWjtPQUFBLE1BQUE7UUFHRSxJQUFDLENBQUEsZUFBZSxDQUFDLFlBQWpCLENBQThCLElBQTlCO1FBQ0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULENBQWMsYUFBZDtlQUNBLElBQUMsQ0FBQSxPQUFPLENBQUMsT0FBVCxDQUFBLEVBTEY7O0lBRE87O3FCQVFULFVBQUEsR0FBWSxTQUFBO0FBQ1YsVUFBQTtNQUFBLElBQU8sb0JBQVA7UUFDRSxJQUFDLENBQUEsT0FBRCxHQUFXLFFBQVEsQ0FBQyxhQUFULENBQXVCLEtBQXZCO1FBQ1gsSUFBQyxDQUFBLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBbkIsQ0FBdUIsUUFBdkI7UUFDQSxJQUFDLENBQUEsT0FBTyxDQUFDLFlBQVQsQ0FBc0IsYUFBdEIsRUFBcUMsSUFBQyxDQUFBLElBQXRDO1FBQ0EsU0FBQSxHQUFZLFFBQVEsQ0FBQyxhQUFULENBQXVCLEtBQXZCO1FBQ1osSUFBRyxJQUFDLENBQUEsSUFBRCxLQUFTLGFBQVo7VUFDRSxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQXBCLENBQXdCLGNBQXhCLEVBREY7U0FBQSxNQUFBO1VBR0UsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFwQixDQUF3QixvQkFBeEIsRUFIRjs7UUFJQSxJQUFDLENBQUEsT0FBTyxDQUFDLFdBQVQsQ0FBcUIsU0FBckIsRUFURjs7YUFVQSxJQUFDLENBQUE7SUFYUzs7O0FBYVo7Ozs7cUJBVUEsa0JBQUEsR0FBb0IsU0FBQyxRQUFEO2FBQ2xCLElBQUMsQ0FBQSxPQUFPLENBQUMsRUFBVCxDQUFZLG9CQUFaLEVBQWtDLFFBQWxDO0lBRGtCOztxQkFRcEIsWUFBQSxHQUFjLFNBQUMsUUFBRDthQUNaLElBQUMsQ0FBQSxPQUFPLENBQUMsRUFBVCxDQUFZLGFBQVosRUFBMkIsUUFBM0I7SUFEWTs7O0FBR2Q7Ozs7cUJBS0EsSUFBQSxHQUFNLFNBQUE7TUFDSixJQUFHLElBQUMsQ0FBQSxPQUFKO1FBQ0UsSUFBQyxDQUFBLE9BQUQsR0FBVztlQUNYLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLG9CQUFkLEVBQW9DLElBQXBDLEVBRkY7O0lBREk7O3FCQU1OLElBQUEsR0FBTSxTQUFBO01BQ0osSUFBRyxDQUFJLElBQUMsQ0FBQSxPQUFSO1FBQ0UsSUFBQyxDQUFBLE9BQUQsR0FBVztlQUNYLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLG9CQUFkLEVBQW9DLElBQXBDLEVBRkY7O0lBREk7O3FCQVFOLFNBQUEsR0FBVyxTQUFBO2FBQ1QsSUFBQyxDQUFBO0lBRFE7O3FCQWlCWCxjQUFBLEdBQWdCLFNBQUMsTUFBRCxFQUFTLE9BQVQ7YUFDZCxJQUFDLENBQUEsZUFBZSxDQUFDLG1CQUFqQixDQUFxQyxJQUFyQyxFQUEyQyxNQUEzQyxFQUFtRCxPQUFuRDtJQURjOzs7OztBQXBHbEIiLCJzb3VyY2VzQ29udGVudCI6WyJ7RW1pdHRlcn0gPSByZXF1aXJlICdldmVudC1raXQnXG5cbkRlZmF1bHRQcmlvcml0eSA9IC0xMDBcblxuIyBFeHRlbmRlZDogUmVwcmVzZW50cyBhIGd1dHRlciB3aXRoaW4gYSB7VGV4dEVkaXRvcn0uXG4jXG4jIFNlZSB7VGV4dEVkaXRvcjo6YWRkR3V0dGVyfSBmb3IgaW5mb3JtYXRpb24gb24gY3JlYXRpbmcgYSBndXR0ZXIuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBHdXR0ZXJcbiAgY29uc3RydWN0b3I6IChndXR0ZXJDb250YWluZXIsIG9wdGlvbnMpIC0+XG4gICAgQGd1dHRlckNvbnRhaW5lciA9IGd1dHRlckNvbnRhaW5lclxuICAgIEBuYW1lID0gb3B0aW9ucz8ubmFtZVxuICAgIEBwcmlvcml0eSA9IG9wdGlvbnM/LnByaW9yaXR5ID8gRGVmYXVsdFByaW9yaXR5XG4gICAgQHZpc2libGUgPSBvcHRpb25zPy52aXNpYmxlID8gdHJ1ZVxuXG4gICAgQGVtaXR0ZXIgPSBuZXcgRW1pdHRlclxuXG4gICMjI1xuICBTZWN0aW9uOiBHdXR0ZXIgRGVzdHJ1Y3Rpb25cbiAgIyMjXG5cbiAgIyBFc3NlbnRpYWw6IERlc3Ryb3lzIHRoZSBndXR0ZXIuXG4gIGRlc3Ryb3k6IC0+XG4gICAgaWYgQG5hbWUgaXMgJ2xpbmUtbnVtYmVyJ1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgbGluZS1udW1iZXIgZ3V0dGVyIGNhbm5vdCBiZSBkZXN0cm95ZWQuJylcbiAgICBlbHNlXG4gICAgICBAZ3V0dGVyQ29udGFpbmVyLnJlbW92ZUd1dHRlcih0aGlzKVxuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWRlc3Ryb3knXG4gICAgICBAZW1pdHRlci5kaXNwb3NlKClcblxuICBnZXRFbGVtZW50OiAtPlxuICAgIHVubGVzcyBAZWxlbWVudD9cbiAgICAgIEBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgIEBlbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2d1dHRlcicpXG4gICAgICBAZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2d1dHRlci1uYW1lJywgQG5hbWUpXG4gICAgICBjaGlsZE5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgaWYgQG5hbWUgaXMgJ2xpbmUtbnVtYmVyJ1xuICAgICAgICBjaGlsZE5vZGUuY2xhc3NMaXN0LmFkZCgnbGluZS1udW1iZXJzJylcbiAgICAgIGVsc2VcbiAgICAgICAgY2hpbGROb2RlLmNsYXNzTGlzdC5hZGQoJ2N1c3RvbS1kZWNvcmF0aW9ucycpXG4gICAgICBAZWxlbWVudC5hcHBlbmRDaGlsZChjaGlsZE5vZGUpXG4gICAgQGVsZW1lbnRcblxuICAjIyNcbiAgU2VjdGlvbjogRXZlbnQgU3Vic2NyaXB0aW9uXG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiB0aGUgZ3V0dGVyJ3MgdmlzaWJpbGl0eSBjaGFuZ2VzLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn1cbiAgIyAgKiBgZ3V0dGVyYCBUaGUgZ3V0dGVyIHdob3NlIHZpc2liaWxpdHkgY2hhbmdlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQ2hhbmdlVmlzaWJsZTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtY2hhbmdlLXZpc2libGUnLCBjYWxsYmFja1xuXG4gICMgRXNzZW50aWFsOiBDYWxscyB5b3VyIGBjYWxsYmFja2Agd2hlbiB0aGUgZ3V0dGVyIGlzIGRlc3Ryb3llZC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259XG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZERlc3Ryb3k6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWRlc3Ryb3knLCBjYWxsYmFja1xuXG4gICMjI1xuICBTZWN0aW9uOiBWaXNpYmlsaXR5XG4gICMjI1xuXG4gICMgRXNzZW50aWFsOiBIaWRlIHRoZSBndXR0ZXIuXG4gIGhpZGU6IC0+XG4gICAgaWYgQHZpc2libGVcbiAgICAgIEB2aXNpYmxlID0gZmFsc2VcbiAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2UtdmlzaWJsZScsIHRoaXNcblxuICAjIEVzc2VudGlhbDogU2hvdyB0aGUgZ3V0dGVyLlxuICBzaG93OiAtPlxuICAgIGlmIG5vdCBAdmlzaWJsZVxuICAgICAgQHZpc2libGUgPSB0cnVlXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLXZpc2libGUnLCB0aGlzXG5cbiAgIyBFc3NlbnRpYWw6IERldGVybWluZSB3aGV0aGVyIHRoZSBndXR0ZXIgaXMgdmlzaWJsZS5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0uXG4gIGlzVmlzaWJsZTogLT5cbiAgICBAdmlzaWJsZVxuXG4gICMgRXNzZW50aWFsOiBBZGQgYSBkZWNvcmF0aW9uIHRoYXQgdHJhY2tzIGEge0Rpc3BsYXlNYXJrZXJ9LiBXaGVuIHRoZSBtYXJrZXIgbW92ZXMsXG4gICMgaXMgaW52YWxpZGF0ZWQsIG9yIGlzIGRlc3Ryb3llZCwgdGhlIGRlY29yYXRpb24gd2lsbCBiZSB1cGRhdGVkIHRvIHJlZmxlY3RcbiAgIyB0aGUgbWFya2VyJ3Mgc3RhdGUuXG4gICNcbiAgIyAjIyBBcmd1bWVudHNcbiAgI1xuICAjICogYG1hcmtlcmAgQSB7RGlzcGxheU1hcmtlcn0geW91IHdhbnQgdGhpcyBkZWNvcmF0aW9uIHRvIGZvbGxvdy5cbiAgIyAqIGBkZWNvcmF0aW9uUGFyYW1zYCBBbiB7T2JqZWN0fSByZXByZXNlbnRpbmcgdGhlIGRlY29yYXRpb24uIEl0IGlzIHBhc3NlZFxuICAjICAgdG8ge1RleHRFZGl0b3I6OmRlY29yYXRlTWFya2VyfSBhcyBpdHMgYGRlY29yYXRpb25QYXJhbXNgIGFuZCBzbyBzdXBwb3J0c1xuICAjICAgYWxsIG9wdGlvbnMgZG9jdW1lbnRlZCB0aGVyZS5cbiAgIyAgICogYHR5cGVgIF9fQ2F2ZWF0X186IHNldCB0byBgJ2xpbmUtbnVtYmVyJ2AgaWYgdGhpcyBpcyB0aGUgbGluZS1udW1iZXJcbiAgIyAgICAgZ3V0dGVyLCBgJ2d1dHRlcidgIG90aGVyd2lzZS4gVGhpcyBjYW5ub3QgYmUgb3ZlcnJpZGRlbi5cbiAgI1xuICAjIFJldHVybnMgYSB7RGVjb3JhdGlvbn0gb2JqZWN0XG4gIGRlY29yYXRlTWFya2VyOiAobWFya2VyLCBvcHRpb25zKSAtPlxuICAgIEBndXR0ZXJDb250YWluZXIuYWRkR3V0dGVyRGVjb3JhdGlvbih0aGlzLCBtYXJrZXIsIG9wdGlvbnMpXG4iXX0=
