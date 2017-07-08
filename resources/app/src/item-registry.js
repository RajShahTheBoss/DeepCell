(function() {
  var ItemRegistry;

  module.exports = ItemRegistry = (function() {
    function ItemRegistry() {
      this.items = new WeakSet;
    }

    ItemRegistry.prototype.addItem = function(item) {
      if (this.hasItem(item)) {
        throw new Error("The workspace can only contain one instance of item " + item);
      }
      return this.items.add(item);
    };

    ItemRegistry.prototype.removeItem = function(item) {
      return this.items["delete"](item);
    };

    ItemRegistry.prototype.hasItem = function(item) {
      return this.items.has(item);
    };

    return ItemRegistry;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2l0ZW0tcmVnaXN0cnkuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQSxNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1Msc0JBQUE7TUFDWCxJQUFDLENBQUEsS0FBRCxHQUFTLElBQUk7SUFERjs7MkJBR2IsT0FBQSxHQUFTLFNBQUMsSUFBRDtNQUNQLElBQUcsSUFBQyxDQUFBLE9BQUQsQ0FBUyxJQUFULENBQUg7QUFDRSxjQUFVLElBQUEsS0FBQSxDQUFNLHNEQUFBLEdBQXVELElBQTdELEVBRFo7O2FBRUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFQLENBQVcsSUFBWDtJQUhPOzsyQkFLVCxVQUFBLEdBQVksU0FBQyxJQUFEO2FBQ1YsSUFBQyxDQUFBLEtBQUssRUFBQyxNQUFELEVBQU4sQ0FBYyxJQUFkO0lBRFU7OzJCQUdaLE9BQUEsR0FBUyxTQUFDLElBQUQ7YUFDUCxJQUFDLENBQUEsS0FBSyxDQUFDLEdBQVAsQ0FBVyxJQUFYO0lBRE87Ozs7O0FBYlgiLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBJdGVtUmVnaXN0cnlcbiAgY29uc3RydWN0b3I6IC0+XG4gICAgQGl0ZW1zID0gbmV3IFdlYWtTZXRcblxuICBhZGRJdGVtOiAoaXRlbSkgLT5cbiAgICBpZiBAaGFzSXRlbShpdGVtKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIHdvcmtzcGFjZSBjYW4gb25seSBjb250YWluIG9uZSBpbnN0YW5jZSBvZiBpdGVtICN7aXRlbX1cIilcbiAgICBAaXRlbXMuYWRkKGl0ZW0pXG5cbiAgcmVtb3ZlSXRlbTogKGl0ZW0pIC0+XG4gICAgQGl0ZW1zLmRlbGV0ZShpdGVtKVxuXG4gIGhhc0l0ZW06IChpdGVtKSAtPlxuICAgIEBpdGVtcy5oYXMoaXRlbSlcbiJdfQ==
