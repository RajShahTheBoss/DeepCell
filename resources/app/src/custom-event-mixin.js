(function() {
  var CustomEventMixin;

  module.exports = CustomEventMixin = {
    componentWillMount: function() {
      return this.customEventListeners = {};
    },
    componentWillUnmount: function() {
      var i, j, len, len1, listener, listeners, name, ref;
      ref = this.customEventListeners;
      for (listeners = i = 0, len = ref.length; i < len; listeners = ++i) {
        name = ref[listeners];
        for (j = 0, len1 = listeners.length; j < len1; j++) {
          listener = listeners[j];
          this.getDOMNode().removeEventListener(name, listener);
        }
      }
    },
    addCustomEventListeners: function(customEventListeners) {
      var base, listener, name;
      for (name in customEventListeners) {
        listener = customEventListeners[name];
        if ((base = this.customEventListeners)[name] == null) {
          base[name] = [];
        }
        this.customEventListeners[name].push(listener);
        this.getDOMNode().addEventListener(name, listener);
      }
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2N1c3RvbS1ldmVudC1taXhpbi5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFBLE1BQU0sQ0FBQyxPQUFQLEdBQ0EsZ0JBQUEsR0FDRTtJQUFBLGtCQUFBLEVBQW9CLFNBQUE7YUFDbEIsSUFBQyxDQUFBLG9CQUFELEdBQXdCO0lBRE4sQ0FBcEI7SUFHQSxvQkFBQSxFQUFzQixTQUFBO0FBQ3BCLFVBQUE7QUFBQTtBQUFBLFdBQUEsNkRBQUE7O0FBQ0UsYUFBQSw2Q0FBQTs7VUFDRSxJQUFDLENBQUEsVUFBRCxDQUFBLENBQWEsQ0FBQyxtQkFBZCxDQUFrQyxJQUFsQyxFQUF3QyxRQUF4QztBQURGO0FBREY7SUFEb0IsQ0FIdEI7SUFTQSx1QkFBQSxFQUF5QixTQUFDLG9CQUFEO0FBQ3ZCLFVBQUE7QUFBQSxXQUFBLDRCQUFBOzs7Y0FDd0IsQ0FBQSxJQUFBLElBQVM7O1FBQy9CLElBQUMsQ0FBQSxvQkFBcUIsQ0FBQSxJQUFBLENBQUssQ0FBQyxJQUE1QixDQUFpQyxRQUFqQztRQUNBLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FBYSxDQUFDLGdCQUFkLENBQStCLElBQS9CLEVBQXFDLFFBQXJDO0FBSEY7SUFEdUIsQ0FUekI7O0FBRkYiLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9XG5DdXN0b21FdmVudE1peGluID1cbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxuICAgIEBjdXN0b21FdmVudExpc3RlbmVycyA9IHt9XG5cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IC0+XG4gICAgZm9yIG5hbWUsIGxpc3RlbmVycyBpbiBAY3VzdG9tRXZlbnRMaXN0ZW5lcnNcbiAgICAgIGZvciBsaXN0ZW5lciBpbiBsaXN0ZW5lcnNcbiAgICAgICAgQGdldERPTU5vZGUoKS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyKVxuICAgIHJldHVyblxuXG4gIGFkZEN1c3RvbUV2ZW50TGlzdGVuZXJzOiAoY3VzdG9tRXZlbnRMaXN0ZW5lcnMpIC0+XG4gICAgZm9yIG5hbWUsIGxpc3RlbmVyIG9mIGN1c3RvbUV2ZW50TGlzdGVuZXJzXG4gICAgICBAY3VzdG9tRXZlbnRMaXN0ZW5lcnNbbmFtZV0gPz0gW11cbiAgICAgIEBjdXN0b21FdmVudExpc3RlbmVyc1tuYW1lXS5wdXNoKGxpc3RlbmVyKVxuICAgICAgQGdldERPTU5vZGUoKS5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyKVxuICAgIHJldHVyblxuIl19
