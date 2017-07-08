(function() {
  var ScopeDescriptor;

  module.exports = ScopeDescriptor = (function() {
    ScopeDescriptor.fromObject = function(scopes) {
      if (scopes instanceof ScopeDescriptor) {
        return scopes;
      } else {
        return new ScopeDescriptor({
          scopes: scopes
        });
      }
    };


    /*
    Section: Construction and Destruction
     */

    function ScopeDescriptor(arg) {
      this.scopes = arg.scopes;
    }

    ScopeDescriptor.prototype.getScopesArray = function() {
      return this.scopes;
    };

    ScopeDescriptor.prototype.getScopeChain = function() {
      return this.scopes.map(function(scope) {
        if (scope[0] !== '.') {
          scope = "." + scope;
        }
        return scope;
      }).join(' ');
    };

    ScopeDescriptor.prototype.toString = function() {
      return this.getScopeChain();
    };

    ScopeDescriptor.prototype.isEqual = function(other) {
      var i, j, len, ref, scope;
      if (this.scopes.length !== other.scopes.length) {
        return false;
      }
      ref = this.scopes;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        scope = ref[i];
        if (scope !== other.scopes[i]) {
          return false;
        }
      }
      return true;
    };

    return ScopeDescriptor;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3Njb3BlLWRlc2NyaXB0b3IuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQW1CQTtBQUFBLE1BQUE7O0VBQUEsTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNKLGVBQUMsQ0FBQSxVQUFELEdBQWEsU0FBQyxNQUFEO01BQ1gsSUFBRyxNQUFBLFlBQWtCLGVBQXJCO2VBQ0UsT0FERjtPQUFBLE1BQUE7ZUFHTSxJQUFBLGVBQUEsQ0FBZ0I7VUFBQyxRQUFBLE1BQUQ7U0FBaEIsRUFITjs7SUFEVzs7O0FBTWI7Ozs7SUFRYSx5QkFBQyxHQUFEO01BQUUsSUFBQyxDQUFBLFNBQUYsSUFBRTtJQUFIOzs4QkFHYixjQUFBLEdBQWdCLFNBQUE7YUFBRyxJQUFDLENBQUE7SUFBSjs7OEJBRWhCLGFBQUEsR0FBZSxTQUFBO2FBQ2IsSUFBQyxDQUFBLE1BQ0MsQ0FBQyxHQURILENBQ08sU0FBQyxLQUFEO1FBQ0gsSUFBMkIsS0FBTSxDQUFBLENBQUEsQ0FBTixLQUFZLEdBQXZDO1VBQUEsS0FBQSxHQUFRLEdBQUEsR0FBSSxNQUFaOztlQUNBO01BRkcsQ0FEUCxDQUlFLENBQUMsSUFKSCxDQUlRLEdBSlI7SUFEYTs7OEJBT2YsUUFBQSxHQUFVLFNBQUE7YUFDUixJQUFDLENBQUEsYUFBRCxDQUFBO0lBRFE7OzhCQUdWLE9BQUEsR0FBUyxTQUFDLEtBQUQ7QUFDUCxVQUFBO01BQUEsSUFBRyxJQUFDLENBQUEsTUFBTSxDQUFDLE1BQVIsS0FBb0IsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFwQztBQUNFLGVBQU8sTUFEVDs7QUFFQTtBQUFBLFdBQUEsNkNBQUE7O1FBQ0UsSUFBRyxLQUFBLEtBQVcsS0FBSyxDQUFDLE1BQU8sQ0FBQSxDQUFBLENBQTNCO0FBQ0UsaUJBQU8sTUFEVDs7QUFERjthQUdBO0lBTk87Ozs7O0FBL0JYIiwic291cmNlc0NvbnRlbnQiOlsiIyBFeHRlbmRlZDogV3JhcHMgYW4ge0FycmF5fSBvZiBgU3RyaW5nYHMuIFRoZSBBcnJheSBkZXNjcmliZXMgYSBwYXRoIGZyb20gdGhlXG4jIHJvb3Qgb2YgdGhlIHN5bnRheCB0cmVlIHRvIGEgdG9rZW4gaW5jbHVkaW5nIF9hbGxfIHNjb3BlIG5hbWVzIGZvciB0aGUgZW50aXJlXG4jIHBhdGguXG4jXG4jIE1ldGhvZHMgdGhhdCB0YWtlIGEgYFNjb3BlRGVzY3JpcHRvcmAgd2lsbCBhbHNvIGFjY2VwdCBhbiB7QXJyYXl9IG9mIHtTdHJpbmdzfVxuIyBzY29wZSBuYW1lcyBlLmcuIGBbJy5zb3VyY2UuanMnXWAuXG4jXG4jIFlvdSBjYW4gdXNlIGBTY29wZURlc2NyaXB0b3JgcyB0byBnZXQgbGFuZ3VhZ2Utc3BlY2lmaWMgY29uZmlnIHNldHRpbmdzIHZpYVxuIyB7Q29uZmlnOjpnZXR9LlxuI1xuIyBZb3Ugc2hvdWxkIG5vdCBuZWVkIHRvIGNyZWF0ZSBhIGBTY29wZURlc2NyaXB0b3JgIGRpcmVjdGx5LlxuI1xuIyAqIHtFZGl0b3I6OmdldFJvb3RTY29wZURlc2NyaXB0b3J9IHRvIGdldCB0aGUgbGFuZ3VhZ2UncyBkZXNjcmlwdG9yLlxuIyAqIHtFZGl0b3I6OnNjb3BlRGVzY3JpcHRvckZvckJ1ZmZlclBvc2l0aW9ufSB0byBnZXQgdGhlIGRlc2NyaXB0b3IgYXQgYVxuIyAgIHNwZWNpZmljIHBvc2l0aW9uIGluIHRoZSBidWZmZXIuXG4jICoge0N1cnNvcjo6Z2V0U2NvcGVEZXNjcmlwdG9yfSB0byBnZXQgYSBjdXJzb3IncyBkZXNjcmlwdG9yIGJhc2VkIG9uIHBvc2l0aW9uLlxuI1xuIyBTZWUgdGhlIFtzY29wZXMgYW5kIHNjb3BlIGRlc2NyaXB0b3IgZ3VpZGVdKGh0dHA6Ly9mbGlnaHQtbWFudWFsLmF0b20uaW8vYmVoaW5kLWF0b20vc2VjdGlvbnMvc2NvcGVkLXNldHRpbmdzLXNjb3Blcy1hbmQtc2NvcGUtZGVzY3JpcHRvcnMvKVxuIyBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIFNjb3BlRGVzY3JpcHRvclxuICBAZnJvbU9iamVjdDogKHNjb3BlcykgLT5cbiAgICBpZiBzY29wZXMgaW5zdGFuY2VvZiBTY29wZURlc2NyaXB0b3JcbiAgICAgIHNjb3Blc1xuICAgIGVsc2VcbiAgICAgIG5ldyBTY29wZURlc2NyaXB0b3Ioe3Njb3Blc30pXG5cbiAgIyMjXG4gIFNlY3Rpb246IENvbnN0cnVjdGlvbiBhbmQgRGVzdHJ1Y3Rpb25cbiAgIyMjXG5cbiAgIyBQdWJsaWM6IENyZWF0ZSBhIHtTY29wZURlc2NyaXB0b3J9IG9iamVjdC5cbiAgI1xuICAjICogYG9iamVjdGAge09iamVjdH1cbiAgIyAgICogYHNjb3Blc2Age0FycmF5fSBvZiB7U3RyaW5nfXNcbiAgY29uc3RydWN0b3I6ICh7QHNjb3Blc30pIC0+XG5cbiAgIyBQdWJsaWM6IFJldHVybnMgYW4ge0FycmF5fSBvZiB7U3RyaW5nfXNcbiAgZ2V0U2NvcGVzQXJyYXk6IC0+IEBzY29wZXNcblxuICBnZXRTY29wZUNoYWluOiAtPlxuICAgIEBzY29wZXNcbiAgICAgIC5tYXAgKHNjb3BlKSAtPlxuICAgICAgICBzY29wZSA9IFwiLiN7c2NvcGV9XCIgdW5sZXNzIHNjb3BlWzBdIGlzICcuJ1xuICAgICAgICBzY29wZVxuICAgICAgLmpvaW4oJyAnKVxuXG4gIHRvU3RyaW5nOiAtPlxuICAgIEBnZXRTY29wZUNoYWluKClcblxuICBpc0VxdWFsOiAob3RoZXIpIC0+XG4gICAgaWYgQHNjb3Blcy5sZW5ndGggaXNudCBvdGhlci5zY29wZXMubGVuZ3RoXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICBmb3Igc2NvcGUsIGkgaW4gQHNjb3Blc1xuICAgICAgaWYgc2NvcGUgaXNudCBvdGhlci5zY29wZXNbaV1cbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgdHJ1ZVxuIl19
