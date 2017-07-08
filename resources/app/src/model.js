(function() {
  var Model, nextInstanceId;

  nextInstanceId = 1;

  module.exports = Model = (function() {
    Model.resetNextInstanceId = function() {
      return nextInstanceId = 1;
    };

    Model.prototype.alive = true;

    function Model(params) {
      this.assignId(params != null ? params.id : void 0);
    }

    Model.prototype.assignId = function(id) {
      if (this.id == null) {
        this.id = id != null ? id : nextInstanceId++;
      }
      if (id >= nextInstanceId) {
        return nextInstanceId = id + 1;
      }
    };

    Model.prototype.destroy = function() {
      if (!this.isAlive()) {
        return;
      }
      this.alive = false;
      return typeof this.destroyed === "function" ? this.destroyed() : void 0;
    };

    Model.prototype.isAlive = function() {
      return this.alive;
    };

    Model.prototype.isDestroyed = function() {
      return !this.isAlive();
    };

    return Model;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21vZGVsLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsY0FBQSxHQUFpQjs7RUFFakIsTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNKLEtBQUMsQ0FBQSxtQkFBRCxHQUFzQixTQUFBO2FBQUcsY0FBQSxHQUFpQjtJQUFwQjs7b0JBRXRCLEtBQUEsR0FBTzs7SUFFTSxlQUFDLE1BQUQ7TUFDWCxJQUFDLENBQUEsUUFBRCxrQkFBVSxNQUFNLENBQUUsV0FBbEI7SUFEVzs7b0JBR2IsUUFBQSxHQUFVLFNBQUMsRUFBRDs7UUFDUixJQUFDLENBQUEsa0JBQU0sS0FBSyxjQUFBOztNQUNaLElBQTJCLEVBQUEsSUFBTSxjQUFqQztlQUFBLGNBQUEsR0FBaUIsRUFBQSxHQUFLLEVBQXRCOztJQUZROztvQkFJVixPQUFBLEdBQVMsU0FBQTtNQUNQLElBQUEsQ0FBYyxJQUFDLENBQUEsT0FBRCxDQUFBLENBQWQ7QUFBQSxlQUFBOztNQUNBLElBQUMsQ0FBQSxLQUFELEdBQVM7b0RBQ1QsSUFBQyxDQUFBO0lBSE07O29CQUtULE9BQUEsR0FBUyxTQUFBO2FBQUcsSUFBQyxDQUFBO0lBQUo7O29CQUVULFdBQUEsR0FBYSxTQUFBO2FBQUcsQ0FBSSxJQUFDLENBQUEsT0FBRCxDQUFBO0lBQVA7Ozs7O0FBdEJmIiwic291cmNlc0NvbnRlbnQiOlsibmV4dEluc3RhbmNlSWQgPSAxXG5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIE1vZGVsXG4gIEByZXNldE5leHRJbnN0YW5jZUlkOiAtPiBuZXh0SW5zdGFuY2VJZCA9IDFcblxuICBhbGl2ZTogdHJ1ZVxuXG4gIGNvbnN0cnVjdG9yOiAocGFyYW1zKSAtPlxuICAgIEBhc3NpZ25JZChwYXJhbXM/LmlkKVxuXG4gIGFzc2lnbklkOiAoaWQpIC0+XG4gICAgQGlkID89IGlkID8gbmV4dEluc3RhbmNlSWQrK1xuICAgIG5leHRJbnN0YW5jZUlkID0gaWQgKyAxIGlmIGlkID49IG5leHRJbnN0YW5jZUlkXG5cbiAgZGVzdHJveTogLT5cbiAgICByZXR1cm4gdW5sZXNzIEBpc0FsaXZlKClcbiAgICBAYWxpdmUgPSBmYWxzZVxuICAgIEBkZXN0cm95ZWQ/KClcblxuICBpc0FsaXZlOiAtPiBAYWxpdmVcblxuICBpc0Rlc3Ryb3llZDogLT4gbm90IEBpc0FsaXZlKClcbiJdfQ==
