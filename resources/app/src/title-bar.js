(function() {
  var TitleBar,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  module.exports = TitleBar = (function() {
    function TitleBar(arg) {
      this.workspace = arg.workspace, this.themes = arg.themes, this.applicationDelegate = arg.applicationDelegate;
      this.dblclickHandler = bind(this.dblclickHandler, this);
      this.element = document.createElement('div');
      this.element.classList.add('title-bar');
      this.titleElement = document.createElement('div');
      this.titleElement.classList.add('title');
      this.element.appendChild(this.titleElement);
      this.element.addEventListener('dblclick', this.dblclickHandler);
      this.workspace.onDidChangeActivePaneItem((function(_this) {
        return function() {
          return _this.updateTitle();
        };
      })(this));
      this.themes.onDidChangeActiveThemes((function(_this) {
        return function() {
          return _this.updateWindowSheetOffset();
        };
      })(this));
      this.updateTitle();
      this.updateWindowSheetOffset();
    }

    TitleBar.prototype.dblclickHandler = function() {
      switch (this.applicationDelegate.getUserDefault('AppleActionOnDoubleClick', 'string')) {
        case 'Minimize':
          return this.applicationDelegate.minimizeWindow();
        case 'Maximize':
          if (this.applicationDelegate.isWindowMaximized()) {
            return this.applicationDelegate.unmaximizeWindow();
          } else {
            return this.applicationDelegate.maximizeWindow();
          }
      }
    };

    TitleBar.prototype.updateTitle = function() {
      return this.titleElement.textContent = document.title;
    };

    TitleBar.prototype.updateWindowSheetOffset = function() {
      return this.applicationDelegate.getCurrentWindow().setSheetOffset(this.element.offsetHeight);
    };

    return TitleBar;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3RpdGxlLWJhci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLFFBQUE7SUFBQTs7RUFBQSxNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1Msa0JBQUMsR0FBRDtNQUFFLElBQUMsQ0FBQSxnQkFBQSxXQUFXLElBQUMsQ0FBQSxhQUFBLFFBQVEsSUFBQyxDQUFBLDBCQUFBOztNQUNuQyxJQUFDLENBQUEsT0FBRCxHQUFXLFFBQVEsQ0FBQyxhQUFULENBQXVCLEtBQXZCO01BQ1gsSUFBQyxDQUFBLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBbkIsQ0FBdUIsV0FBdkI7TUFFQSxJQUFDLENBQUEsWUFBRCxHQUFnQixRQUFRLENBQUMsYUFBVCxDQUF1QixLQUF2QjtNQUNoQixJQUFDLENBQUEsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUF4QixDQUE0QixPQUE1QjtNQUNBLElBQUMsQ0FBQSxPQUFPLENBQUMsV0FBVCxDQUFxQixJQUFDLENBQUEsWUFBdEI7TUFFQSxJQUFDLENBQUEsT0FBTyxDQUFDLGdCQUFULENBQTBCLFVBQTFCLEVBQXNDLElBQUMsQ0FBQSxlQUF2QztNQUVBLElBQUMsQ0FBQSxTQUFTLENBQUMseUJBQVgsQ0FBcUMsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO2lCQUFHLEtBQUMsQ0FBQSxXQUFELENBQUE7UUFBSDtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBckM7TUFDQSxJQUFDLENBQUEsTUFBTSxDQUFDLHVCQUFSLENBQWdDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtpQkFBRyxLQUFDLENBQUEsdUJBQUQsQ0FBQTtRQUFIO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFoQztNQUVBLElBQUMsQ0FBQSxXQUFELENBQUE7TUFDQSxJQUFDLENBQUEsdUJBQUQsQ0FBQTtJQWRXOzt1QkFnQmIsZUFBQSxHQUFpQixTQUFBO0FBRWYsY0FBTyxJQUFDLENBQUEsbUJBQW1CLENBQUMsY0FBckIsQ0FBb0MsMEJBQXBDLEVBQWdFLFFBQWhFLENBQVA7QUFBQSxhQUNPLFVBRFA7aUJBRUksSUFBQyxDQUFBLG1CQUFtQixDQUFDLGNBQXJCLENBQUE7QUFGSixhQUdPLFVBSFA7VUFJSSxJQUFHLElBQUMsQ0FBQSxtQkFBbUIsQ0FBQyxpQkFBckIsQ0FBQSxDQUFIO21CQUNFLElBQUMsQ0FBQSxtQkFBbUIsQ0FBQyxnQkFBckIsQ0FBQSxFQURGO1dBQUEsTUFBQTttQkFHRSxJQUFDLENBQUEsbUJBQW1CLENBQUMsY0FBckIsQ0FBQSxFQUhGOztBQUpKO0lBRmU7O3VCQVdqQixXQUFBLEdBQWEsU0FBQTthQUNYLElBQUMsQ0FBQSxZQUFZLENBQUMsV0FBZCxHQUE0QixRQUFRLENBQUM7SUFEMUI7O3VCQUdiLHVCQUFBLEdBQXlCLFNBQUE7YUFDdkIsSUFBQyxDQUFBLG1CQUFtQixDQUFDLGdCQUFyQixDQUFBLENBQXVDLENBQUMsY0FBeEMsQ0FBdUQsSUFBQyxDQUFBLE9BQU8sQ0FBQyxZQUFoRTtJQUR1Qjs7Ozs7QUFoQzNCIiwic291cmNlc0NvbnRlbnQiOlsibW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgVGl0bGVCYXJcbiAgY29uc3RydWN0b3I6ICh7QHdvcmtzcGFjZSwgQHRoZW1lcywgQGFwcGxpY2F0aW9uRGVsZWdhdGV9KSAtPlxuICAgIEBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICBAZWxlbWVudC5jbGFzc0xpc3QuYWRkKCd0aXRsZS1iYXInKVxuXG4gICAgQHRpdGxlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgQHRpdGxlRWxlbWVudC5jbGFzc0xpc3QuYWRkKCd0aXRsZScpXG4gICAgQGVsZW1lbnQuYXBwZW5kQ2hpbGQoQHRpdGxlRWxlbWVudClcblxuICAgIEBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIgJ2RibGNsaWNrJywgQGRibGNsaWNrSGFuZGxlclxuXG4gICAgQHdvcmtzcGFjZS5vbkRpZENoYW5nZUFjdGl2ZVBhbmVJdGVtID0+IEB1cGRhdGVUaXRsZSgpXG4gICAgQHRoZW1lcy5vbkRpZENoYW5nZUFjdGl2ZVRoZW1lcyA9PiBAdXBkYXRlV2luZG93U2hlZXRPZmZzZXQoKVxuXG4gICAgQHVwZGF0ZVRpdGxlKClcbiAgICBAdXBkYXRlV2luZG93U2hlZXRPZmZzZXQoKVxuXG4gIGRibGNsaWNrSGFuZGxlcjogPT5cbiAgICAjIFVzZXIgcHJlZmVyZW5jZSBkZWNpZGluZyB3aGljaCBhY3Rpb24gdG8gdGFrZSBvbiBhIHRpdGxlIGJhciBkb3VibGUtY2xpY2tcbiAgICBzd2l0Y2ggQGFwcGxpY2F0aW9uRGVsZWdhdGUuZ2V0VXNlckRlZmF1bHQoJ0FwcGxlQWN0aW9uT25Eb3VibGVDbGljaycsICdzdHJpbmcnKVxuICAgICAgd2hlbiAnTWluaW1pemUnXG4gICAgICAgIEBhcHBsaWNhdGlvbkRlbGVnYXRlLm1pbmltaXplV2luZG93KClcbiAgICAgIHdoZW4gJ01heGltaXplJ1xuICAgICAgICBpZiBAYXBwbGljYXRpb25EZWxlZ2F0ZS5pc1dpbmRvd01heGltaXplZCgpXG4gICAgICAgICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUudW5tYXhpbWl6ZVdpbmRvdygpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAYXBwbGljYXRpb25EZWxlZ2F0ZS5tYXhpbWl6ZVdpbmRvdygpXG5cbiAgdXBkYXRlVGl0bGU6IC0+XG4gICAgQHRpdGxlRWxlbWVudC50ZXh0Q29udGVudCA9IGRvY3VtZW50LnRpdGxlXG5cbiAgdXBkYXRlV2luZG93U2hlZXRPZmZzZXQ6IC0+XG4gICAgQGFwcGxpY2F0aW9uRGVsZWdhdGUuZ2V0Q3VycmVudFdpbmRvdygpLnNldFNoZWV0T2Zmc2V0KEBlbGVtZW50Lm9mZnNldEhlaWdodClcbiJdfQ==
