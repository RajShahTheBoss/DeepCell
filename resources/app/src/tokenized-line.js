(function() {
  var CommentScopeRegex, Token, TokenizedLine, idCounter,
    slice = [].slice;

  Token = require('./token');

  CommentScopeRegex = /(\b|\.)comment/;

  idCounter = 1;

  module.exports = TokenizedLine = (function() {
    function TokenizedLine(properties) {
      this.id = idCounter++;
      if (properties == null) {
        return;
      }
      this.openScopes = properties.openScopes, this.text = properties.text, this.tags = properties.tags, this.ruleStack = properties.ruleStack, this.tokenIterator = properties.tokenIterator;
    }

    TokenizedLine.prototype.getTokenIterator = function() {
      var ref;
      return (ref = this.tokenIterator).reset.apply(ref, [this].concat(slice.call(arguments)));
    };

    Object.defineProperty(TokenizedLine.prototype, 'tokens', {
      get: function() {
        var iterator, tokens;
        iterator = this.getTokenIterator();
        tokens = [];
        while (iterator.next()) {
          tokens.push(new Token({
            value: iterator.getText(),
            scopes: iterator.getScopes().slice()
          }));
        }
        return tokens;
      }
    });

    TokenizedLine.prototype.tokenAtBufferColumn = function(bufferColumn) {
      return this.tokens[this.tokenIndexAtBufferColumn(bufferColumn)];
    };

    TokenizedLine.prototype.tokenIndexAtBufferColumn = function(bufferColumn) {
      var column, i, index, len, ref, token;
      column = 0;
      ref = this.tokens;
      for (index = i = 0, len = ref.length; i < len; index = ++i) {
        token = ref[index];
        column += token.value.length;
        if (column > bufferColumn) {
          return index;
        }
      }
      return index - 1;
    };

    TokenizedLine.prototype.tokenStartColumnForBufferColumn = function(bufferColumn) {
      var delta, i, len, nextDelta, ref, token;
      delta = 0;
      ref = this.tokens;
      for (i = 0, len = ref.length; i < len; i++) {
        token = ref[i];
        nextDelta = delta + token.bufferDelta;
        if (nextDelta > bufferColumn) {
          break;
        }
        delta = nextDelta;
      }
      return delta;
    };

    TokenizedLine.prototype.isComment = function() {
      var i, iterator, len, scope, scopes;
      if (this.isCommentLine != null) {
        return this.isCommentLine;
      }
      this.isCommentLine = false;
      iterator = this.getTokenIterator();
      while (iterator.next()) {
        scopes = iterator.getScopes();
        if (scopes.length === 1) {
          continue;
        }
        for (i = 0, len = scopes.length; i < len; i++) {
          scope = scopes[i];
          if (CommentScopeRegex.test(scope)) {
            this.isCommentLine = true;
            break;
          }
        }
        break;
      }
      return this.isCommentLine;
    };

    TokenizedLine.prototype.tokenAtIndex = function(index) {
      return this.tokens[index];
    };

    TokenizedLine.prototype.getTokenCount = function() {
      var count, i, len, ref, tag;
      count = 0;
      ref = this.tags;
      for (i = 0, len = ref.length; i < len; i++) {
        tag = ref[i];
        if (tag >= 0) {
          count++;
        }
      }
      return count;
    };

    return TokenizedLine;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3Rva2VuaXplZC1saW5lLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsa0RBQUE7SUFBQTs7RUFBQSxLQUFBLEdBQVEsT0FBQSxDQUFRLFNBQVI7O0VBQ1IsaUJBQUEsR0FBb0I7O0VBRXBCLFNBQUEsR0FBWTs7RUFFWixNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1MsdUJBQUMsVUFBRDtNQUNYLElBQUMsQ0FBQSxFQUFELEdBQU0sU0FBQTtNQUVOLElBQWMsa0JBQWQ7QUFBQSxlQUFBOztNQUVDLElBQUMsQ0FBQSx3QkFBQSxVQUFGLEVBQWMsSUFBQyxDQUFBLGtCQUFBLElBQWYsRUFBcUIsSUFBQyxDQUFBLGtCQUFBLElBQXRCLEVBQTRCLElBQUMsQ0FBQSx1QkFBQSxTQUE3QixFQUF3QyxJQUFDLENBQUEsMkJBQUE7SUFMOUI7OzRCQU9iLGdCQUFBLEdBQWtCLFNBQUE7QUFBRyxVQUFBO2FBQUEsT0FBQSxJQUFDLENBQUEsYUFBRCxDQUFjLENBQUMsS0FBZixZQUFxQixDQUFBLElBQU0sU0FBQSxXQUFBLFNBQUEsQ0FBQSxDQUEzQjtJQUFIOztJQUVsQixNQUFNLENBQUMsY0FBUCxDQUFzQixhQUFDLENBQUEsU0FBdkIsRUFBa0MsUUFBbEMsRUFBNEM7TUFBQSxHQUFBLEVBQUssU0FBQTtBQUMvQyxZQUFBO1FBQUEsUUFBQSxHQUFXLElBQUMsQ0FBQSxnQkFBRCxDQUFBO1FBQ1gsTUFBQSxHQUFTO0FBRVQsZUFBTSxRQUFRLENBQUMsSUFBVCxDQUFBLENBQU47VUFDRSxNQUFNLENBQUMsSUFBUCxDQUFnQixJQUFBLEtBQUEsQ0FBTTtZQUNwQixLQUFBLEVBQU8sUUFBUSxDQUFDLE9BQVQsQ0FBQSxDQURhO1lBRXBCLE1BQUEsRUFBUSxRQUFRLENBQUMsU0FBVCxDQUFBLENBQW9CLENBQUMsS0FBckIsQ0FBQSxDQUZZO1dBQU4sQ0FBaEI7UUFERjtlQU1BO01BVitDLENBQUw7S0FBNUM7OzRCQVlBLG1CQUFBLEdBQXFCLFNBQUMsWUFBRDthQUNuQixJQUFDLENBQUEsTUFBTyxDQUFBLElBQUMsQ0FBQSx3QkFBRCxDQUEwQixZQUExQixDQUFBO0lBRFc7OzRCQUdyQix3QkFBQSxHQUEwQixTQUFDLFlBQUQ7QUFDeEIsVUFBQTtNQUFBLE1BQUEsR0FBUztBQUNUO0FBQUEsV0FBQSxxREFBQTs7UUFDRSxNQUFBLElBQVUsS0FBSyxDQUFDLEtBQUssQ0FBQztRQUN0QixJQUFnQixNQUFBLEdBQVMsWUFBekI7QUFBQSxpQkFBTyxNQUFQOztBQUZGO2FBR0EsS0FBQSxHQUFRO0lBTGdCOzs0QkFPMUIsK0JBQUEsR0FBaUMsU0FBQyxZQUFEO0FBQy9CLFVBQUE7TUFBQSxLQUFBLEdBQVE7QUFDUjtBQUFBLFdBQUEscUNBQUE7O1FBQ0UsU0FBQSxHQUFZLEtBQUEsR0FBUSxLQUFLLENBQUM7UUFDMUIsSUFBUyxTQUFBLEdBQVksWUFBckI7QUFBQSxnQkFBQTs7UUFDQSxLQUFBLEdBQVE7QUFIVjthQUlBO0lBTitCOzs0QkFRakMsU0FBQSxHQUFXLFNBQUE7QUFDVCxVQUFBO01BQUEsSUFBeUIsMEJBQXpCO0FBQUEsZUFBTyxJQUFDLENBQUEsY0FBUjs7TUFFQSxJQUFDLENBQUEsYUFBRCxHQUFpQjtNQUNqQixRQUFBLEdBQVcsSUFBQyxDQUFBLGdCQUFELENBQUE7QUFDWCxhQUFNLFFBQVEsQ0FBQyxJQUFULENBQUEsQ0FBTjtRQUNFLE1BQUEsR0FBUyxRQUFRLENBQUMsU0FBVCxDQUFBO1FBQ1QsSUFBWSxNQUFNLENBQUMsTUFBUCxLQUFpQixDQUE3QjtBQUFBLG1CQUFBOztBQUNBLGFBQUEsd0NBQUE7O1VBQ0UsSUFBRyxpQkFBaUIsQ0FBQyxJQUFsQixDQUF1QixLQUF2QixDQUFIO1lBQ0UsSUFBQyxDQUFBLGFBQUQsR0FBaUI7QUFDakIsa0JBRkY7O0FBREY7QUFJQTtNQVBGO2FBUUEsSUFBQyxDQUFBO0lBYlE7OzRCQWVYLFlBQUEsR0FBYyxTQUFDLEtBQUQ7YUFDWixJQUFDLENBQUEsTUFBTyxDQUFBLEtBQUE7SUFESTs7NEJBR2QsYUFBQSxHQUFlLFNBQUE7QUFDYixVQUFBO01BQUEsS0FBQSxHQUFRO0FBQ1I7QUFBQSxXQUFBLHFDQUFBOztZQUE4QixHQUFBLElBQU87VUFBckMsS0FBQTs7QUFBQTthQUNBO0lBSGE7Ozs7O0FBaEVqQiIsInNvdXJjZXNDb250ZW50IjpbIlRva2VuID0gcmVxdWlyZSAnLi90b2tlbidcbkNvbW1lbnRTY29wZVJlZ2V4ID0gLyhcXGJ8XFwuKWNvbW1lbnQvXG5cbmlkQ291bnRlciA9IDFcblxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgVG9rZW5pemVkTGluZVxuICBjb25zdHJ1Y3RvcjogKHByb3BlcnRpZXMpIC0+XG4gICAgQGlkID0gaWRDb3VudGVyKytcblxuICAgIHJldHVybiB1bmxlc3MgcHJvcGVydGllcz9cblxuICAgIHtAb3BlblNjb3BlcywgQHRleHQsIEB0YWdzLCBAcnVsZVN0YWNrLCBAdG9rZW5JdGVyYXRvcn0gPSBwcm9wZXJ0aWVzXG5cbiAgZ2V0VG9rZW5JdGVyYXRvcjogLT4gQHRva2VuSXRlcmF0b3IucmVzZXQodGhpcywgYXJndW1lbnRzLi4uKVxuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBAcHJvdG90eXBlLCAndG9rZW5zJywgZ2V0OiAtPlxuICAgIGl0ZXJhdG9yID0gQGdldFRva2VuSXRlcmF0b3IoKVxuICAgIHRva2VucyA9IFtdXG5cbiAgICB3aGlsZSBpdGVyYXRvci5uZXh0KClcbiAgICAgIHRva2Vucy5wdXNoKG5ldyBUb2tlbih7XG4gICAgICAgIHZhbHVlOiBpdGVyYXRvci5nZXRUZXh0KClcbiAgICAgICAgc2NvcGVzOiBpdGVyYXRvci5nZXRTY29wZXMoKS5zbGljZSgpXG4gICAgICB9KSlcblxuICAgIHRva2Vuc1xuXG4gIHRva2VuQXRCdWZmZXJDb2x1bW46IChidWZmZXJDb2x1bW4pIC0+XG4gICAgQHRva2Vuc1tAdG9rZW5JbmRleEF0QnVmZmVyQ29sdW1uKGJ1ZmZlckNvbHVtbildXG5cbiAgdG9rZW5JbmRleEF0QnVmZmVyQ29sdW1uOiAoYnVmZmVyQ29sdW1uKSAtPlxuICAgIGNvbHVtbiA9IDBcbiAgICBmb3IgdG9rZW4sIGluZGV4IGluIEB0b2tlbnNcbiAgICAgIGNvbHVtbiArPSB0b2tlbi52YWx1ZS5sZW5ndGhcbiAgICAgIHJldHVybiBpbmRleCBpZiBjb2x1bW4gPiBidWZmZXJDb2x1bW5cbiAgICBpbmRleCAtIDFcblxuICB0b2tlblN0YXJ0Q29sdW1uRm9yQnVmZmVyQ29sdW1uOiAoYnVmZmVyQ29sdW1uKSAtPlxuICAgIGRlbHRhID0gMFxuICAgIGZvciB0b2tlbiBpbiBAdG9rZW5zXG4gICAgICBuZXh0RGVsdGEgPSBkZWx0YSArIHRva2VuLmJ1ZmZlckRlbHRhXG4gICAgICBicmVhayBpZiBuZXh0RGVsdGEgPiBidWZmZXJDb2x1bW5cbiAgICAgIGRlbHRhID0gbmV4dERlbHRhXG4gICAgZGVsdGFcblxuICBpc0NvbW1lbnQ6IC0+XG4gICAgcmV0dXJuIEBpc0NvbW1lbnRMaW5lIGlmIEBpc0NvbW1lbnRMaW5lP1xuXG4gICAgQGlzQ29tbWVudExpbmUgPSBmYWxzZVxuICAgIGl0ZXJhdG9yID0gQGdldFRva2VuSXRlcmF0b3IoKVxuICAgIHdoaWxlIGl0ZXJhdG9yLm5leHQoKVxuICAgICAgc2NvcGVzID0gaXRlcmF0b3IuZ2V0U2NvcGVzKClcbiAgICAgIGNvbnRpbnVlIGlmIHNjb3Blcy5sZW5ndGggaXMgMVxuICAgICAgZm9yIHNjb3BlIGluIHNjb3Blc1xuICAgICAgICBpZiBDb21tZW50U2NvcGVSZWdleC50ZXN0KHNjb3BlKVxuICAgICAgICAgIEBpc0NvbW1lbnRMaW5lID0gdHJ1ZVxuICAgICAgICAgIGJyZWFrXG4gICAgICBicmVha1xuICAgIEBpc0NvbW1lbnRMaW5lXG5cbiAgdG9rZW5BdEluZGV4OiAoaW5kZXgpIC0+XG4gICAgQHRva2Vuc1tpbmRleF1cblxuICBnZXRUb2tlbkNvdW50OiAtPlxuICAgIGNvdW50ID0gMFxuICAgIGNvdW50KysgZm9yIHRhZyBpbiBAdGFncyB3aGVuIHRhZyA+PSAwXG4gICAgY291bnRcbiJdfQ==
