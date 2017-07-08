(function() {
  var TokenIterator;

  module.exports = TokenIterator = (function() {
    function TokenIterator(tokenizedBuffer) {
      this.tokenizedBuffer = tokenizedBuffer;
    }

    TokenIterator.prototype.reset = function(line) {
      this.line = line;
      this.index = null;
      this.startColumn = 0;
      this.endColumn = 0;
      this.scopes = this.line.openScopes.map((function(_this) {
        return function(id) {
          return _this.tokenizedBuffer.grammar.scopeForId(id);
        };
      })(this));
      this.scopeStarts = this.scopes.slice();
      this.scopeEnds = [];
      return this;
    };

    TokenIterator.prototype.next = function() {
      var scope, tag, tags;
      tags = this.line.tags;
      if (this.index != null) {
        this.startColumn = this.endColumn;
        this.scopeEnds.length = 0;
        this.scopeStarts.length = 0;
        this.index++;
      } else {
        this.index = 0;
      }
      while (this.index < tags.length) {
        tag = tags[this.index];
        if (tag < 0) {
          scope = this.tokenizedBuffer.grammar.scopeForId(tag);
          if (tag % 2 === 0) {
            if (this.scopeStarts[this.scopeStarts.length - 1] === scope) {
              this.scopeStarts.pop();
            } else {
              this.scopeEnds.push(scope);
            }
            this.scopes.pop();
          } else {
            this.scopeStarts.push(scope);
            this.scopes.push(scope);
          }
          this.index++;
        } else {
          this.endColumn += tag;
          this.text = this.line.text.substring(this.startColumn, this.endColumn);
          return true;
        }
      }
      return false;
    };

    TokenIterator.prototype.getScopes = function() {
      return this.scopes;
    };

    TokenIterator.prototype.getScopeStarts = function() {
      return this.scopeStarts;
    };

    TokenIterator.prototype.getScopeEnds = function() {
      return this.scopeEnds;
    };

    TokenIterator.prototype.getText = function() {
      return this.text;
    };

    TokenIterator.prototype.getBufferStart = function() {
      return this.startColumn;
    };

    TokenIterator.prototype.getBufferEnd = function() {
      return this.endColumn;
    };

    return TokenIterator;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3Rva2VuLWl0ZXJhdG9yLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNTLHVCQUFDLGVBQUQ7TUFBQyxJQUFDLENBQUEsa0JBQUQ7SUFBRDs7NEJBRWIsS0FBQSxHQUFPLFNBQUMsSUFBRDtNQUFDLElBQUMsQ0FBQSxPQUFEO01BQ04sSUFBQyxDQUFBLEtBQUQsR0FBUztNQUNULElBQUMsQ0FBQSxXQUFELEdBQWU7TUFDZixJQUFDLENBQUEsU0FBRCxHQUFhO01BQ2IsSUFBQyxDQUFBLE1BQUQsR0FBVSxJQUFDLENBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFqQixDQUFxQixDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsRUFBRDtpQkFBUSxLQUFDLENBQUEsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUF6QixDQUFvQyxFQUFwQztRQUFSO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFyQjtNQUNWLElBQUMsQ0FBQSxXQUFELEdBQWUsSUFBQyxDQUFBLE1BQU0sQ0FBQyxLQUFSLENBQUE7TUFDZixJQUFDLENBQUEsU0FBRCxHQUFhO2FBQ2I7SUFQSzs7NEJBU1AsSUFBQSxHQUFNLFNBQUE7QUFDSixVQUFBO01BQUMsT0FBUSxJQUFDLENBQUE7TUFFVixJQUFHLGtCQUFIO1FBQ0UsSUFBQyxDQUFBLFdBQUQsR0FBZSxJQUFDLENBQUE7UUFDaEIsSUFBQyxDQUFBLFNBQVMsQ0FBQyxNQUFYLEdBQW9CO1FBQ3BCLElBQUMsQ0FBQSxXQUFXLENBQUMsTUFBYixHQUFzQjtRQUN0QixJQUFDLENBQUEsS0FBRCxHQUpGO09BQUEsTUFBQTtRQU1FLElBQUMsQ0FBQSxLQUFELEdBQVMsRUFOWDs7QUFRQSxhQUFNLElBQUMsQ0FBQSxLQUFELEdBQVMsSUFBSSxDQUFDLE1BQXBCO1FBQ0UsR0FBQSxHQUFNLElBQUssQ0FBQSxJQUFDLENBQUEsS0FBRDtRQUNYLElBQUcsR0FBQSxHQUFNLENBQVQ7VUFDRSxLQUFBLEdBQVEsSUFBQyxDQUFBLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBekIsQ0FBb0MsR0FBcEM7VUFDUixJQUFHLEdBQUEsR0FBTSxDQUFOLEtBQVcsQ0FBZDtZQUNFLElBQUcsSUFBQyxDQUFBLFdBQVksQ0FBQSxJQUFDLENBQUEsV0FBVyxDQUFDLE1BQWIsR0FBc0IsQ0FBdEIsQ0FBYixLQUF5QyxLQUE1QztjQUNFLElBQUMsQ0FBQSxXQUFXLENBQUMsR0FBYixDQUFBLEVBREY7YUFBQSxNQUFBO2NBR0UsSUFBQyxDQUFBLFNBQVMsQ0FBQyxJQUFYLENBQWdCLEtBQWhCLEVBSEY7O1lBSUEsSUFBQyxDQUFBLE1BQU0sQ0FBQyxHQUFSLENBQUEsRUFMRjtXQUFBLE1BQUE7WUFPRSxJQUFDLENBQUEsV0FBVyxDQUFDLElBQWIsQ0FBa0IsS0FBbEI7WUFDQSxJQUFDLENBQUEsTUFBTSxDQUFDLElBQVIsQ0FBYSxLQUFiLEVBUkY7O1VBU0EsSUFBQyxDQUFBLEtBQUQsR0FYRjtTQUFBLE1BQUE7VUFhRSxJQUFDLENBQUEsU0FBRCxJQUFjO1VBQ2QsSUFBQyxDQUFBLElBQUQsR0FBUSxJQUFDLENBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFYLENBQXFCLElBQUMsQ0FBQSxXQUF0QixFQUFtQyxJQUFDLENBQUEsU0FBcEM7QUFDUixpQkFBTyxLQWZUOztNQUZGO2FBbUJBO0lBOUJJOzs0QkFnQ04sU0FBQSxHQUFXLFNBQUE7YUFBRyxJQUFDLENBQUE7SUFBSjs7NEJBRVgsY0FBQSxHQUFnQixTQUFBO2FBQUcsSUFBQyxDQUFBO0lBQUo7OzRCQUVoQixZQUFBLEdBQWMsU0FBQTthQUFHLElBQUMsQ0FBQTtJQUFKOzs0QkFFZCxPQUFBLEdBQVMsU0FBQTthQUFHLElBQUMsQ0FBQTtJQUFKOzs0QkFFVCxjQUFBLEdBQWdCLFNBQUE7YUFBRyxJQUFDLENBQUE7SUFBSjs7NEJBRWhCLFlBQUEsR0FBYyxTQUFBO2FBQUcsSUFBQyxDQUFBO0lBQUo7Ozs7O0FBdkRoQiIsInNvdXJjZXNDb250ZW50IjpbIm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIFRva2VuSXRlcmF0b3JcbiAgY29uc3RydWN0b3I6IChAdG9rZW5pemVkQnVmZmVyKSAtPlxuXG4gIHJlc2V0OiAoQGxpbmUpIC0+XG4gICAgQGluZGV4ID0gbnVsbFxuICAgIEBzdGFydENvbHVtbiA9IDBcbiAgICBAZW5kQ29sdW1uID0gMFxuICAgIEBzY29wZXMgPSBAbGluZS5vcGVuU2NvcGVzLm1hcCAoaWQpID0+IEB0b2tlbml6ZWRCdWZmZXIuZ3JhbW1hci5zY29wZUZvcklkKGlkKVxuICAgIEBzY29wZVN0YXJ0cyA9IEBzY29wZXMuc2xpY2UoKVxuICAgIEBzY29wZUVuZHMgPSBbXVxuICAgIHRoaXNcblxuICBuZXh0OiAtPlxuICAgIHt0YWdzfSA9IEBsaW5lXG5cbiAgICBpZiBAaW5kZXg/XG4gICAgICBAc3RhcnRDb2x1bW4gPSBAZW5kQ29sdW1uXG4gICAgICBAc2NvcGVFbmRzLmxlbmd0aCA9IDBcbiAgICAgIEBzY29wZVN0YXJ0cy5sZW5ndGggPSAwXG4gICAgICBAaW5kZXgrK1xuICAgIGVsc2VcbiAgICAgIEBpbmRleCA9IDBcblxuICAgIHdoaWxlIEBpbmRleCA8IHRhZ3MubGVuZ3RoXG4gICAgICB0YWcgPSB0YWdzW0BpbmRleF1cbiAgICAgIGlmIHRhZyA8IDBcbiAgICAgICAgc2NvcGUgPSBAdG9rZW5pemVkQnVmZmVyLmdyYW1tYXIuc2NvcGVGb3JJZCh0YWcpXG4gICAgICAgIGlmIHRhZyAlIDIgaXMgMFxuICAgICAgICAgIGlmIEBzY29wZVN0YXJ0c1tAc2NvcGVTdGFydHMubGVuZ3RoIC0gMV0gaXMgc2NvcGVcbiAgICAgICAgICAgIEBzY29wZVN0YXJ0cy5wb3AoKVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBzY29wZUVuZHMucHVzaChzY29wZSlcbiAgICAgICAgICBAc2NvcGVzLnBvcCgpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAc2NvcGVTdGFydHMucHVzaChzY29wZSlcbiAgICAgICAgICBAc2NvcGVzLnB1c2goc2NvcGUpXG4gICAgICAgIEBpbmRleCsrXG4gICAgICBlbHNlXG4gICAgICAgIEBlbmRDb2x1bW4gKz0gdGFnXG4gICAgICAgIEB0ZXh0ID0gQGxpbmUudGV4dC5zdWJzdHJpbmcoQHN0YXJ0Q29sdW1uLCBAZW5kQ29sdW1uKVxuICAgICAgICByZXR1cm4gdHJ1ZVxuXG4gICAgZmFsc2VcblxuICBnZXRTY29wZXM6IC0+IEBzY29wZXNcblxuICBnZXRTY29wZVN0YXJ0czogLT4gQHNjb3BlU3RhcnRzXG5cbiAgZ2V0U2NvcGVFbmRzOiAtPiBAc2NvcGVFbmRzXG5cbiAgZ2V0VGV4dDogLT4gQHRleHRcblxuICBnZXRCdWZmZXJTdGFydDogLT4gQHN0YXJ0Q29sdW1uXG5cbiAgZ2V0QnVmZmVyRW5kOiAtPiBAZW5kQ29sdW1uXG4iXX0=
