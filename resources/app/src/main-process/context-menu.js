(function() {
  var ContextMenu, Menu;

  Menu = require('electron').Menu;

  module.exports = ContextMenu = (function() {
    function ContextMenu(template, atomWindow) {
      var menu;
      this.atomWindow = atomWindow;
      template = this.createClickHandlers(template);
      menu = Menu.buildFromTemplate(template);
      menu.popup(this.atomWindow.browserWindow);
    }

    ContextMenu.prototype.createClickHandlers = function(template) {
      var i, item, len, results;
      results = [];
      for (i = 0, len = template.length; i < len; i++) {
        item = template[i];
        if (item.command) {
          if (item.commandDetail == null) {
            item.commandDetail = {};
          }
          item.commandDetail.contextCommand = true;
          item.commandDetail.atomWindow = this.atomWindow;
          (function(_this) {
            return (function(item) {
              return item.click = function() {
                return global.atomApplication.sendCommandToWindow(item.command, _this.atomWindow, item.commandDetail);
              };
            });
          })(this)(item);
        } else if (item.submenu) {
          this.createClickHandlers(item.submenu);
        }
        results.push(item);
      }
      return results;
    };

    return ContextMenu;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21haW4tcHJvY2Vzcy9jb250ZXh0LW1lbnUuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQyxPQUFRLE9BQUEsQ0FBUSxVQUFSOztFQUVULE1BQU0sQ0FBQyxPQUFQLEdBQ007SUFDUyxxQkFBQyxRQUFELEVBQVcsVUFBWDtBQUNYLFVBQUE7TUFEc0IsSUFBQyxDQUFBLGFBQUQ7TUFDdEIsUUFBQSxHQUFXLElBQUMsQ0FBQSxtQkFBRCxDQUFxQixRQUFyQjtNQUNYLElBQUEsR0FBTyxJQUFJLENBQUMsaUJBQUwsQ0FBdUIsUUFBdkI7TUFDUCxJQUFJLENBQUMsS0FBTCxDQUFXLElBQUMsQ0FBQSxVQUFVLENBQUMsYUFBdkI7SUFIVzs7MEJBUWIsbUJBQUEsR0FBcUIsU0FBQyxRQUFEO0FBQ25CLFVBQUE7QUFBQTtXQUFBLDBDQUFBOztRQUNFLElBQUcsSUFBSSxDQUFDLE9BQVI7O1lBQ0UsSUFBSSxDQUFDLGdCQUFpQjs7VUFDdEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFuQixHQUFvQztVQUNwQyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQW5CLEdBQWdDLElBQUMsQ0FBQTtVQUM5QixDQUFBLFNBQUEsS0FBQTttQkFBQSxDQUFBLFNBQUMsSUFBRDtxQkFDRCxJQUFJLENBQUMsS0FBTCxHQUFhLFNBQUE7dUJBQ1gsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBdkIsQ0FBMkMsSUFBSSxDQUFDLE9BQWhELEVBQXlELEtBQUMsQ0FBQSxVQUExRCxFQUFzRSxJQUFJLENBQUMsYUFBM0U7Y0FEVztZQURaLENBQUE7VUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQUgsQ0FBSSxJQUFKLEVBSkY7U0FBQSxNQU9LLElBQUcsSUFBSSxDQUFDLE9BQVI7VUFDSCxJQUFDLENBQUEsbUJBQUQsQ0FBcUIsSUFBSSxDQUFDLE9BQTFCLEVBREc7O3FCQUVMO0FBVkY7O0lBRG1COzs7OztBQVp2QiIsInNvdXJjZXNDb250ZW50IjpbIntNZW51fSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBDb250ZXh0TWVudVxuICBjb25zdHJ1Y3RvcjogKHRlbXBsYXRlLCBAYXRvbVdpbmRvdykgLT5cbiAgICB0ZW1wbGF0ZSA9IEBjcmVhdGVDbGlja0hhbmRsZXJzKHRlbXBsYXRlKVxuICAgIG1lbnUgPSBNZW51LmJ1aWxkRnJvbVRlbXBsYXRlKHRlbXBsYXRlKVxuICAgIG1lbnUucG9wdXAoQGF0b21XaW5kb3cuYnJvd3NlcldpbmRvdylcblxuICAjIEl0J3MgbmVjZXNzYXJ5IHRvIGJ1aWxkIHRoZSBldmVudCBoYW5kbGVycyBpbiB0aGlzIHByb2Nlc3MsIG90aGVyd2lzZVxuICAjIGNsb3N1cmVzIGFyZSBkcmFnZ2VkIGFjcm9zcyBwcm9jZXNzZXMgYW5kIGZhaWxlZCB0byBiZSBnYXJiYWdlIGNvbGxlY3RlZFxuICAjIGFwcHJvcHJpYXRlbHkuXG4gIGNyZWF0ZUNsaWNrSGFuZGxlcnM6ICh0ZW1wbGF0ZSkgLT5cbiAgICBmb3IgaXRlbSBpbiB0ZW1wbGF0ZVxuICAgICAgaWYgaXRlbS5jb21tYW5kXG4gICAgICAgIGl0ZW0uY29tbWFuZERldGFpbCA/PSB7fVxuICAgICAgICBpdGVtLmNvbW1hbmREZXRhaWwuY29udGV4dENvbW1hbmQgPSB0cnVlXG4gICAgICAgIGl0ZW0uY29tbWFuZERldGFpbC5hdG9tV2luZG93ID0gQGF0b21XaW5kb3dcbiAgICAgICAgZG8gKGl0ZW0pID0+XG4gICAgICAgICAgaXRlbS5jbGljayA9ID0+XG4gICAgICAgICAgICBnbG9iYWwuYXRvbUFwcGxpY2F0aW9uLnNlbmRDb21tYW5kVG9XaW5kb3coaXRlbS5jb21tYW5kLCBAYXRvbVdpbmRvdywgaXRlbS5jb21tYW5kRGV0YWlsKVxuICAgICAgZWxzZSBpZiBpdGVtLnN1Ym1lbnVcbiAgICAgICAgQGNyZWF0ZUNsaWNrSGFuZGxlcnMoaXRlbS5zdWJtZW51KVxuICAgICAgaXRlbVxuIl19
