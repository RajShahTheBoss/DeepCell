(function() {
  var StartDotRegex, Token, _;

  _ = require('underscore-plus');

  StartDotRegex = /^\.?/;

  module.exports = Token = (function() {
    Token.prototype.value = null;

    Token.prototype.scopes = null;

    function Token(properties) {
      this.value = properties.value, this.scopes = properties.scopes;
    }

    Token.prototype.isEqual = function(other) {
      return this.value === other.value && _.isEqual(this.scopes, other.scopes);
    };

    Token.prototype.isBracket = function() {
      return /^meta\.brace\b/.test(_.last(this.scopes));
    };

    Token.prototype.matchesScopeSelector = function(selector) {
      var targetClasses;
      targetClasses = selector.replace(StartDotRegex, '').split('.');
      return _.any(this.scopes, function(scope) {
        var scopeClasses;
        scopeClasses = scope.split('.');
        return _.isSubset(targetClasses, scopeClasses);
      });
    };

    return Token;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3Rva2VuLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxpQkFBUjs7RUFFSixhQUFBLEdBQWdCOztFQUdoQixNQUFNLENBQUMsT0FBUCxHQUNNO29CQUNKLEtBQUEsR0FBTzs7b0JBQ1AsTUFBQSxHQUFROztJQUVLLGVBQUMsVUFBRDtNQUNWLElBQUMsQ0FBQSxtQkFBQSxLQUFGLEVBQVMsSUFBQyxDQUFBLG9CQUFBO0lBREM7O29CQUdiLE9BQUEsR0FBUyxTQUFDLEtBQUQ7YUFFUCxJQUFDLENBQUEsS0FBRCxLQUFVLEtBQUssQ0FBQyxLQUFoQixJQUEwQixDQUFDLENBQUMsT0FBRixDQUFVLElBQUMsQ0FBQSxNQUFYLEVBQW1CLEtBQUssQ0FBQyxNQUF6QjtJQUZuQjs7b0JBSVQsU0FBQSxHQUFXLFNBQUE7YUFDVCxnQkFBZ0IsQ0FBQyxJQUFqQixDQUFzQixDQUFDLENBQUMsSUFBRixDQUFPLElBQUMsQ0FBQSxNQUFSLENBQXRCO0lBRFM7O29CQUdYLG9CQUFBLEdBQXNCLFNBQUMsUUFBRDtBQUNwQixVQUFBO01BQUEsYUFBQSxHQUFnQixRQUFRLENBQUMsT0FBVCxDQUFpQixhQUFqQixFQUFnQyxFQUFoQyxDQUFtQyxDQUFDLEtBQXBDLENBQTBDLEdBQTFDO2FBQ2hCLENBQUMsQ0FBQyxHQUFGLENBQU0sSUFBQyxDQUFBLE1BQVAsRUFBZSxTQUFDLEtBQUQ7QUFDYixZQUFBO1FBQUEsWUFBQSxHQUFlLEtBQUssQ0FBQyxLQUFOLENBQVksR0FBWjtlQUNmLENBQUMsQ0FBQyxRQUFGLENBQVcsYUFBWCxFQUEwQixZQUExQjtNQUZhLENBQWY7SUFGb0I7Ozs7O0FBcEJ4QiIsInNvdXJjZXNDb250ZW50IjpbIl8gPSByZXF1aXJlICd1bmRlcnNjb3JlLXBsdXMnXG5cblN0YXJ0RG90UmVnZXggPSAvXlxcLj8vXG5cbiMgUmVwcmVzZW50cyBhIHNpbmdsZSB1bml0IG9mIHRleHQgYXMgc2VsZWN0ZWQgYnkgYSBncmFtbWFyLlxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgVG9rZW5cbiAgdmFsdWU6IG51bGxcbiAgc2NvcGVzOiBudWxsXG5cbiAgY29uc3RydWN0b3I6IChwcm9wZXJ0aWVzKSAtPlxuICAgIHtAdmFsdWUsIEBzY29wZXN9ID0gcHJvcGVydGllc1xuXG4gIGlzRXF1YWw6IChvdGhlcikgLT5cbiAgICAjIFRPRE86IHNjb3BlcyBpcyBkZXByZWNhdGVkLiBUaGlzIGlzIGhlcmUgZm9yIHRoZSBzYWtlIG9mIGxhbmcgcGFja2FnZSB0ZXN0c1xuICAgIEB2YWx1ZSBpcyBvdGhlci52YWx1ZSBhbmQgXy5pc0VxdWFsKEBzY29wZXMsIG90aGVyLnNjb3BlcylcblxuICBpc0JyYWNrZXQ6IC0+XG4gICAgL15tZXRhXFwuYnJhY2VcXGIvLnRlc3QoXy5sYXN0KEBzY29wZXMpKVxuXG4gIG1hdGNoZXNTY29wZVNlbGVjdG9yOiAoc2VsZWN0b3IpIC0+XG4gICAgdGFyZ2V0Q2xhc3NlcyA9IHNlbGVjdG9yLnJlcGxhY2UoU3RhcnREb3RSZWdleCwgJycpLnNwbGl0KCcuJylcbiAgICBfLmFueSBAc2NvcGVzLCAoc2NvcGUpIC0+XG4gICAgICBzY29wZUNsYXNzZXMgPSBzY29wZS5zcGxpdCgnLicpXG4gICAgICBfLmlzU3Vic2V0KHRhcmdldENsYXNzZXMsIHNjb3BlQ2xhc3NlcylcbiJdfQ==
