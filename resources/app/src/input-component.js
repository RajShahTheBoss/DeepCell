(function() {
  var InputComponent;

  module.exports = InputComponent = (function() {
    function InputComponent(domNode) {
      this.domNode = domNode;
    }

    InputComponent.prototype.updateSync = function(state) {
      var newState;
      if (this.oldState == null) {
        this.oldState = {};
      }
      newState = state.hiddenInput;
      if (newState.top !== this.oldState.top) {
        this.domNode.style.top = newState.top + 'px';
        this.oldState.top = newState.top;
      }
      if (newState.left !== this.oldState.left) {
        this.domNode.style.left = newState.left + 'px';
        this.oldState.left = newState.left;
      }
      if (newState.width !== this.oldState.width) {
        this.domNode.style.width = newState.width + 'px';
        this.oldState.width = newState.width;
      }
      if (newState.height !== this.oldState.height) {
        this.domNode.style.height = newState.height + 'px';
        return this.oldState.height = newState.height;
      }
    };

    return InputComponent;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2lucHV0LWNvbXBvbmVudC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFBLE1BQU0sQ0FBQyxPQUFQLEdBQ007SUFDUyx3QkFBQyxPQUFEO01BQUMsSUFBQyxDQUFBLFVBQUQ7SUFBRDs7NkJBRWIsVUFBQSxHQUFZLFNBQUMsS0FBRDtBQUNWLFVBQUE7O1FBQUEsSUFBQyxDQUFBLFdBQVk7O01BQ2IsUUFBQSxHQUFXLEtBQUssQ0FBQztNQUVqQixJQUFHLFFBQVEsQ0FBQyxHQUFULEtBQWtCLElBQUMsQ0FBQSxRQUFRLENBQUMsR0FBL0I7UUFDRSxJQUFDLENBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFmLEdBQXFCLFFBQVEsQ0FBQyxHQUFULEdBQWU7UUFDcEMsSUFBQyxDQUFBLFFBQVEsQ0FBQyxHQUFWLEdBQWdCLFFBQVEsQ0FBQyxJQUYzQjs7TUFJQSxJQUFHLFFBQVEsQ0FBQyxJQUFULEtBQW1CLElBQUMsQ0FBQSxRQUFRLENBQUMsSUFBaEM7UUFDRSxJQUFDLENBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFmLEdBQXNCLFFBQVEsQ0FBQyxJQUFULEdBQWdCO1FBQ3RDLElBQUMsQ0FBQSxRQUFRLENBQUMsSUFBVixHQUFpQixRQUFRLENBQUMsS0FGNUI7O01BSUEsSUFBRyxRQUFRLENBQUMsS0FBVCxLQUFvQixJQUFDLENBQUEsUUFBUSxDQUFDLEtBQWpDO1FBQ0UsSUFBQyxDQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBZixHQUF1QixRQUFRLENBQUMsS0FBVCxHQUFpQjtRQUN4QyxJQUFDLENBQUEsUUFBUSxDQUFDLEtBQVYsR0FBa0IsUUFBUSxDQUFDLE1BRjdCOztNQUlBLElBQUcsUUFBUSxDQUFDLE1BQVQsS0FBcUIsSUFBQyxDQUFBLFFBQVEsQ0FBQyxNQUFsQztRQUNFLElBQUMsQ0FBQSxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQWYsR0FBd0IsUUFBUSxDQUFDLE1BQVQsR0FBa0I7ZUFDMUMsSUFBQyxDQUFBLFFBQVEsQ0FBQyxNQUFWLEdBQW1CLFFBQVEsQ0FBQyxPQUY5Qjs7SUFoQlU7Ozs7O0FBSmQiLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBJbnB1dENvbXBvbmVudFxuICBjb25zdHJ1Y3RvcjogKEBkb21Ob2RlKSAtPlxuXG4gIHVwZGF0ZVN5bmM6IChzdGF0ZSkgLT5cbiAgICBAb2xkU3RhdGUgPz0ge31cbiAgICBuZXdTdGF0ZSA9IHN0YXRlLmhpZGRlbklucHV0XG5cbiAgICBpZiBuZXdTdGF0ZS50b3AgaXNudCBAb2xkU3RhdGUudG9wXG4gICAgICBAZG9tTm9kZS5zdHlsZS50b3AgPSBuZXdTdGF0ZS50b3AgKyAncHgnXG4gICAgICBAb2xkU3RhdGUudG9wID0gbmV3U3RhdGUudG9wXG5cbiAgICBpZiBuZXdTdGF0ZS5sZWZ0IGlzbnQgQG9sZFN0YXRlLmxlZnRcbiAgICAgIEBkb21Ob2RlLnN0eWxlLmxlZnQgPSBuZXdTdGF0ZS5sZWZ0ICsgJ3B4J1xuICAgICAgQG9sZFN0YXRlLmxlZnQgPSBuZXdTdGF0ZS5sZWZ0XG5cbiAgICBpZiBuZXdTdGF0ZS53aWR0aCBpc250IEBvbGRTdGF0ZS53aWR0aFxuICAgICAgQGRvbU5vZGUuc3R5bGUud2lkdGggPSBuZXdTdGF0ZS53aWR0aCArICdweCdcbiAgICAgIEBvbGRTdGF0ZS53aWR0aCA9IG5ld1N0YXRlLndpZHRoXG5cbiAgICBpZiBuZXdTdGF0ZS5oZWlnaHQgaXNudCBAb2xkU3RhdGUuaGVpZ2h0XG4gICAgICBAZG9tTm9kZS5zdHlsZS5oZWlnaHQgPSBuZXdTdGF0ZS5oZWlnaHQgKyAncHgnXG4gICAgICBAb2xkU3RhdGUuaGVpZ2h0ID0gbmV3U3RhdGUuaGVpZ2h0XG4iXX0=