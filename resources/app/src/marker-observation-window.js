(function() {
  var MarkerObservationWindow;

  module.exports = MarkerObservationWindow = (function() {
    function MarkerObservationWindow(decorationManager, bufferWindow) {
      this.decorationManager = decorationManager;
      this.bufferWindow = bufferWindow;
    }

    MarkerObservationWindow.prototype.setScreenRange = function(range) {
      return this.bufferWindow.setRange(this.decorationManager.bufferRangeForScreenRange(range));
    };

    MarkerObservationWindow.prototype.setBufferRange = function(range) {
      return this.bufferWindow.setRange(range);
    };

    MarkerObservationWindow.prototype.destroy = function() {
      return this.bufferWindow.destroy();
    };

    return MarkerObservationWindow;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21hcmtlci1vYnNlcnZhdGlvbi13aW5kb3cuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQSxNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1MsaUNBQUMsaUJBQUQsRUFBcUIsWUFBckI7TUFBQyxJQUFDLENBQUEsb0JBQUQ7TUFBb0IsSUFBQyxDQUFBLGVBQUQ7SUFBckI7O3NDQUViLGNBQUEsR0FBZ0IsU0FBQyxLQUFEO2FBQ2QsSUFBQyxDQUFBLFlBQVksQ0FBQyxRQUFkLENBQXVCLElBQUMsQ0FBQSxpQkFBaUIsQ0FBQyx5QkFBbkIsQ0FBNkMsS0FBN0MsQ0FBdkI7SUFEYzs7c0NBR2hCLGNBQUEsR0FBZ0IsU0FBQyxLQUFEO2FBQ2QsSUFBQyxDQUFBLFlBQVksQ0FBQyxRQUFkLENBQXVCLEtBQXZCO0lBRGM7O3NDQUdoQixPQUFBLEdBQVMsU0FBQTthQUNQLElBQUMsQ0FBQSxZQUFZLENBQUMsT0FBZCxDQUFBO0lBRE87Ozs7O0FBVlgiLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBNYXJrZXJPYnNlcnZhdGlvbldpbmRvd1xuICBjb25zdHJ1Y3RvcjogKEBkZWNvcmF0aW9uTWFuYWdlciwgQGJ1ZmZlcldpbmRvdykgLT5cblxuICBzZXRTY3JlZW5SYW5nZTogKHJhbmdlKSAtPlxuICAgIEBidWZmZXJXaW5kb3cuc2V0UmFuZ2UoQGRlY29yYXRpb25NYW5hZ2VyLmJ1ZmZlclJhbmdlRm9yU2NyZWVuUmFuZ2UocmFuZ2UpKVxuXG4gIHNldEJ1ZmZlclJhbmdlOiAocmFuZ2UpIC0+XG4gICAgQGJ1ZmZlcldpbmRvdy5zZXRSYW5nZShyYW5nZSlcblxuICBkZXN0cm95OiAtPlxuICAgIEBidWZmZXJXaW5kb3cuZGVzdHJveSgpXG4iXX0=
