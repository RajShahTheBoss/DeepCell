(function() {
  var Emitter, Notification, _;

  Emitter = require('event-kit').Emitter;

  _ = require('underscore-plus');

  module.exports = Notification = (function() {
    function Notification(type, message, options) {
      this.type = type;
      this.message = message;
      this.options = options != null ? options : {};
      this.emitter = new Emitter;
      this.timestamp = new Date();
      this.dismissed = true;
      if (this.isDismissable()) {
        this.dismissed = false;
      }
      this.displayed = false;
      this.validate();
    }

    Notification.prototype.validate = function() {
      if (typeof this.message !== 'string') {
        throw new Error("Notification must be created with string message: " + this.message);
      }
      if (!(_.isObject(this.options) && !_.isArray(this.options))) {
        throw new Error("Notification must be created with an options object: " + this.options);
      }
    };


    /*
    Section: Event Subscription
     */

    Notification.prototype.onDidDismiss = function(callback) {
      return this.emitter.on('did-dismiss', callback);
    };

    Notification.prototype.onDidDisplay = function(callback) {
      return this.emitter.on('did-display', callback);
    };

    Notification.prototype.getOptions = function() {
      return this.options;
    };


    /*
    Section: Methods
     */

    Notification.prototype.getType = function() {
      return this.type;
    };

    Notification.prototype.getMessage = function() {
      return this.message;
    };

    Notification.prototype.getTimestamp = function() {
      return this.timestamp;
    };

    Notification.prototype.getDetail = function() {
      return this.options.detail;
    };

    Notification.prototype.isEqual = function(other) {
      return this.getMessage() === other.getMessage() && this.getType() === other.getType() && this.getDetail() === other.getDetail();
    };

    Notification.prototype.dismiss = function() {
      if (!(this.isDismissable() && !this.isDismissed())) {
        return;
      }
      this.dismissed = true;
      return this.emitter.emit('did-dismiss', this);
    };

    Notification.prototype.isDismissed = function() {
      return this.dismissed;
    };

    Notification.prototype.isDismissable = function() {
      return !!this.options.dismissable;
    };

    Notification.prototype.wasDisplayed = function() {
      return this.displayed;
    };

    Notification.prototype.setDisplayed = function(displayed) {
      this.displayed = displayed;
      return this.emitter.emit('did-display', this);
    };

    Notification.prototype.getIcon = function() {
      if (this.options.icon != null) {
        return this.options.icon;
      }
      switch (this.type) {
        case 'fatal':
          return 'bug';
        case 'error':
          return 'flame';
        case 'warning':
          return 'alert';
        case 'info':
          return 'info';
        case 'success':
          return 'check';
      }
    };

    return Notification;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL25vdGlmaWNhdGlvbi5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFDLFVBQVcsT0FBQSxDQUFRLFdBQVI7O0VBQ1osQ0FBQSxHQUFJLE9BQUEsQ0FBUSxpQkFBUjs7RUFHSixNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1Msc0JBQUMsSUFBRCxFQUFRLE9BQVIsRUFBa0IsT0FBbEI7TUFBQyxJQUFDLENBQUEsT0FBRDtNQUFPLElBQUMsQ0FBQSxVQUFEO01BQVUsSUFBQyxDQUFBLDRCQUFELFVBQVM7TUFDdEMsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQUFJO01BQ2YsSUFBQyxDQUFBLFNBQUQsR0FBaUIsSUFBQSxJQUFBLENBQUE7TUFDakIsSUFBQyxDQUFBLFNBQUQsR0FBYTtNQUNiLElBQXNCLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FBdEI7UUFBQSxJQUFDLENBQUEsU0FBRCxHQUFhLE1BQWI7O01BQ0EsSUFBQyxDQUFBLFNBQUQsR0FBYTtNQUNiLElBQUMsQ0FBQSxRQUFELENBQUE7SUFOVzs7MkJBUWIsUUFBQSxHQUFVLFNBQUE7TUFDUixJQUFHLE9BQU8sSUFBQyxDQUFBLE9BQVIsS0FBcUIsUUFBeEI7QUFDRSxjQUFVLElBQUEsS0FBQSxDQUFNLG9EQUFBLEdBQXFELElBQUMsQ0FBQSxPQUE1RCxFQURaOztNQUdBLElBQUEsQ0FBQSxDQUFPLENBQUMsQ0FBQyxRQUFGLENBQVcsSUFBQyxDQUFBLE9BQVosQ0FBQSxJQUF5QixDQUFJLENBQUMsQ0FBQyxPQUFGLENBQVUsSUFBQyxDQUFBLE9BQVgsQ0FBcEMsQ0FBQTtBQUNFLGNBQVUsSUFBQSxLQUFBLENBQU0sdURBQUEsR0FBd0QsSUFBQyxDQUFBLE9BQS9ELEVBRFo7O0lBSlE7OztBQU9WOzs7OzJCQVNBLFlBQUEsR0FBYyxTQUFDLFFBQUQ7YUFDWixJQUFDLENBQUEsT0FBTyxDQUFDLEVBQVQsQ0FBWSxhQUFaLEVBQTJCLFFBQTNCO0lBRFk7OzJCQVFkLFlBQUEsR0FBYyxTQUFDLFFBQUQ7YUFDWixJQUFDLENBQUEsT0FBTyxDQUFDLEVBQVQsQ0FBWSxhQUFaLEVBQTJCLFFBQTNCO0lBRFk7OzJCQUdkLFVBQUEsR0FBWSxTQUFBO2FBQUcsSUFBQyxDQUFBO0lBQUo7OztBQUVaOzs7OzJCQUtBLE9BQUEsR0FBUyxTQUFBO2FBQUcsSUFBQyxDQUFBO0lBQUo7OzJCQUdULFVBQUEsR0FBWSxTQUFBO2FBQUcsSUFBQyxDQUFBO0lBQUo7OzJCQUVaLFlBQUEsR0FBYyxTQUFBO2FBQUcsSUFBQyxDQUFBO0lBQUo7OzJCQUVkLFNBQUEsR0FBVyxTQUFBO2FBQUcsSUFBQyxDQUFBLE9BQU8sQ0FBQztJQUFaOzsyQkFFWCxPQUFBLEdBQVMsU0FBQyxLQUFEO2FBQ1AsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQUFBLEtBQWlCLEtBQUssQ0FBQyxVQUFOLENBQUEsQ0FBakIsSUFDTSxJQUFDLENBQUEsT0FBRCxDQUFBLENBQUEsS0FBYyxLQUFLLENBQUMsT0FBTixDQUFBLENBRHBCLElBRU0sSUFBQyxDQUFBLFNBQUQsQ0FBQSxDQUFBLEtBQWdCLEtBQUssQ0FBQyxTQUFOLENBQUE7SUFIZjs7MkJBT1QsT0FBQSxHQUFTLFNBQUE7TUFDUCxJQUFBLENBQUEsQ0FBYyxJQUFDLENBQUEsYUFBRCxDQUFBLENBQUEsSUFBcUIsQ0FBSSxJQUFDLENBQUEsV0FBRCxDQUFBLENBQXZDLENBQUE7QUFBQSxlQUFBOztNQUNBLElBQUMsQ0FBQSxTQUFELEdBQWE7YUFDYixJQUFDLENBQUEsT0FBTyxDQUFDLElBQVQsQ0FBYyxhQUFkLEVBQTZCLElBQTdCO0lBSE87OzJCQUtULFdBQUEsR0FBYSxTQUFBO2FBQUcsSUFBQyxDQUFBO0lBQUo7OzJCQUViLGFBQUEsR0FBZSxTQUFBO2FBQUcsQ0FBQyxDQUFDLElBQUMsQ0FBQSxPQUFPLENBQUM7SUFBZDs7MkJBRWYsWUFBQSxHQUFjLFNBQUE7YUFBRyxJQUFDLENBQUE7SUFBSjs7MkJBRWQsWUFBQSxHQUFjLFNBQUMsU0FBRDtNQUFDLElBQUMsQ0FBQSxZQUFEO2FBQ2IsSUFBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULENBQWMsYUFBZCxFQUE2QixJQUE3QjtJQURZOzsyQkFHZCxPQUFBLEdBQVMsU0FBQTtNQUNQLElBQXdCLHlCQUF4QjtBQUFBLGVBQU8sSUFBQyxDQUFBLE9BQU8sQ0FBQyxLQUFoQjs7QUFDQSxjQUFPLElBQUMsQ0FBQSxJQUFSO0FBQUEsYUFDTyxPQURQO2lCQUNvQjtBQURwQixhQUVPLE9BRlA7aUJBRW9CO0FBRnBCLGFBR08sU0FIUDtpQkFHc0I7QUFIdEIsYUFJTyxNQUpQO2lCQUltQjtBQUpuQixhQUtPLFNBTFA7aUJBS3NCO0FBTHRCO0lBRk87Ozs7O0FBOUVYIiwic291cmNlc0NvbnRlbnQiOlsie0VtaXR0ZXJ9ID0gcmVxdWlyZSAnZXZlbnQta2l0J1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcblxuIyBQdWJsaWM6IEEgbm90aWZpY2F0aW9uIHRvIHRoZSB1c2VyIGNvbnRhaW5pbmcgYSBtZXNzYWdlIGFuZCB0eXBlLlxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgTm90aWZpY2F0aW9uXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBtZXNzYWdlLCBAb3B0aW9ucz17fSkgLT5cbiAgICBAZW1pdHRlciA9IG5ldyBFbWl0dGVyXG4gICAgQHRpbWVzdGFtcCA9IG5ldyBEYXRlKClcbiAgICBAZGlzbWlzc2VkID0gdHJ1ZVxuICAgIEBkaXNtaXNzZWQgPSBmYWxzZSBpZiBAaXNEaXNtaXNzYWJsZSgpXG4gICAgQGRpc3BsYXllZCA9IGZhbHNlXG4gICAgQHZhbGlkYXRlKClcblxuICB2YWxpZGF0ZTogLT5cbiAgICBpZiB0eXBlb2YgQG1lc3NhZ2UgaXNudCAnc3RyaW5nJ1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm90aWZpY2F0aW9uIG11c3QgYmUgY3JlYXRlZCB3aXRoIHN0cmluZyBtZXNzYWdlOiAje0BtZXNzYWdlfVwiKVxuXG4gICAgdW5sZXNzIF8uaXNPYmplY3QoQG9wdGlvbnMpIGFuZCBub3QgXy5pc0FycmF5KEBvcHRpb25zKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm90aWZpY2F0aW9uIG11c3QgYmUgY3JlYXRlZCB3aXRoIGFuIG9wdGlvbnMgb2JqZWN0OiAje0BvcHRpb25zfVwiKVxuXG4gICMjI1xuICBTZWN0aW9uOiBFdmVudCBTdWJzY3JpcHRpb25cbiAgIyMjXG5cbiAgIyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiB0aGUgbm90aWZpY2F0aW9uIGlzIGRpc21pc3NlZC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBub3RpZmljYXRpb24gaXMgZGlzbWlzc2VkLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWREaXNtaXNzOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1kaXNtaXNzJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIHRoZSBub3RpZmljYXRpb24gaXMgZGlzcGxheWVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdoZW4gdGhlIG5vdGlmaWNhdGlvbiBpcyBkaXNwbGF5ZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZERpc3BsYXk6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWRpc3BsYXknLCBjYWxsYmFja1xuXG4gIGdldE9wdGlvbnM6IC0+IEBvcHRpb25zXG5cbiAgIyMjXG4gIFNlY3Rpb246IE1ldGhvZHNcbiAgIyMjXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdGhlIHtTdHJpbmd9IHR5cGUuXG4gIGdldFR5cGU6IC0+IEB0eXBlXG5cbiAgIyBQdWJsaWM6IFJldHVybnMgdGhlIHtTdHJpbmd9IG1lc3NhZ2UuXG4gIGdldE1lc3NhZ2U6IC0+IEBtZXNzYWdlXG5cbiAgZ2V0VGltZXN0YW1wOiAtPiBAdGltZXN0YW1wXG5cbiAgZ2V0RGV0YWlsOiAtPiBAb3B0aW9ucy5kZXRhaWxcblxuICBpc0VxdWFsOiAob3RoZXIpIC0+XG4gICAgQGdldE1lc3NhZ2UoKSBpcyBvdGhlci5nZXRNZXNzYWdlKCkgXFxcbiAgICAgIGFuZCBAZ2V0VHlwZSgpIGlzIG90aGVyLmdldFR5cGUoKSBcXFxuICAgICAgYW5kIEBnZXREZXRhaWwoKSBpcyBvdGhlci5nZXREZXRhaWwoKVxuXG4gICMgRXh0ZW5kZWQ6IERpc21pc3NlcyB0aGUgbm90aWZpY2F0aW9uLCByZW1vdmluZyBpdCBmcm9tIHRoZSBVSS4gQ2FsbGluZyB0aGlzIHByb2dyYW1tYXRpY2FsbHlcbiAgIyB3aWxsIGNhbGwgYWxsIGNhbGxiYWNrcyBhZGRlZCB2aWEgYG9uRGlkRGlzbWlzc2AuXG4gIGRpc21pc3M6IC0+XG4gICAgcmV0dXJuIHVubGVzcyBAaXNEaXNtaXNzYWJsZSgpIGFuZCBub3QgQGlzRGlzbWlzc2VkKClcbiAgICBAZGlzbWlzc2VkID0gdHJ1ZVxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1kaXNtaXNzJywgdGhpc1xuXG4gIGlzRGlzbWlzc2VkOiAtPiBAZGlzbWlzc2VkXG5cbiAgaXNEaXNtaXNzYWJsZTogLT4gISFAb3B0aW9ucy5kaXNtaXNzYWJsZVxuXG4gIHdhc0Rpc3BsYXllZDogLT4gQGRpc3BsYXllZFxuXG4gIHNldERpc3BsYXllZDogKEBkaXNwbGF5ZWQpIC0+XG4gICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWRpc3BsYXknLCB0aGlzXG5cbiAgZ2V0SWNvbjogLT5cbiAgICByZXR1cm4gQG9wdGlvbnMuaWNvbiBpZiBAb3B0aW9ucy5pY29uP1xuICAgIHN3aXRjaCBAdHlwZVxuICAgICAgd2hlbiAnZmF0YWwnIHRoZW4gJ2J1ZydcbiAgICAgIHdoZW4gJ2Vycm9yJyB0aGVuICdmbGFtZSdcbiAgICAgIHdoZW4gJ3dhcm5pbmcnIHRoZW4gJ2FsZXJ0J1xuICAgICAgd2hlbiAnaW5mbycgdGhlbiAnaW5mbydcbiAgICAgIHdoZW4gJ3N1Y2Nlc3MnIHRoZW4gJ2NoZWNrJ1xuIl19
