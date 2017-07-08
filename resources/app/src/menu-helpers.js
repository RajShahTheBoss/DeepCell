(function() {
  var ItemSpecificities, _, cloneMenuItem, findMatchingItemIndex, merge, normalizeLabel, unmerge;

  _ = require('underscore-plus');

  ItemSpecificities = new WeakMap;

  merge = function(menu, item, itemSpecificity) {
    var i, len, matchingItem, matchingItemIndex, ref, ref1, submenuItem;
    if (itemSpecificity == null) {
      itemSpecificity = 2e308;
    }
    item = cloneMenuItem(item);
    if (itemSpecificity) {
      ItemSpecificities.set(item, itemSpecificity);
    }
    matchingItemIndex = findMatchingItemIndex(menu, item);
    if (matchingItemIndex !== -1) {
      matchingItem = menu[matchingItemIndex];
    }
    if (matchingItem != null) {
      if (item.submenu != null) {
        ref = item.submenu;
        for (i = 0, len = ref.length; i < len; i++) {
          submenuItem = ref[i];
          merge(matchingItem.submenu, submenuItem, itemSpecificity);
        }
      } else if (itemSpecificity) {
        if (!(itemSpecificity < ItemSpecificities.get(matchingItem))) {
          menu[matchingItemIndex] = item;
        }
      }
    } else if (!(item.type === 'separator' && ((ref1 = _.last(menu)) != null ? ref1.type : void 0) === 'separator')) {
      menu.push(item);
    }
  };

  unmerge = function(menu, item) {
    var i, len, matchingItem, matchingItemIndex, ref, ref1, submenuItem;
    matchingItemIndex = findMatchingItemIndex(menu, item);
    if (matchingItemIndex !== -1) {
      matchingItem = menu[matchingItemIndex];
    }
    if (matchingItem != null) {
      if (item.submenu != null) {
        ref = item.submenu;
        for (i = 0, len = ref.length; i < len; i++) {
          submenuItem = ref[i];
          unmerge(matchingItem.submenu, submenuItem);
        }
      }
      if (!(((ref1 = matchingItem.submenu) != null ? ref1.length : void 0) > 0)) {
        return menu.splice(matchingItemIndex, 1);
      }
    }
  };

  findMatchingItemIndex = function(menu, arg) {
    var i, index, item, label, len, submenu, type;
    type = arg.type, label = arg.label, submenu = arg.submenu;
    if (type === 'separator') {
      return -1;
    }
    for (index = i = 0, len = menu.length; i < len; index = ++i) {
      item = menu[index];
      if (normalizeLabel(item.label) === normalizeLabel(label) && (item.submenu != null) === (submenu != null)) {
        return index;
      }
    }
    return -1;
  };

  normalizeLabel = function(label) {
    if (label == null) {
      return void 0;
    }
    if (process.platform === 'darwin') {
      return label;
    } else {
      return label.replace(/\&/g, '');
    }
  };

  cloneMenuItem = function(item) {
    item = _.pick(item, 'type', 'label', 'enabled', 'visible', 'command', 'submenu', 'commandDetail', 'role');
    if (item.submenu != null) {
      item.submenu = item.submenu.map(function(submenuItem) {
        return cloneMenuItem(submenuItem);
      });
    }
    return item;
  };

  module.exports = {
    merge: merge,
    unmerge: unmerge,
    normalizeLabel: normalizeLabel,
    cloneMenuItem: cloneMenuItem
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21lbnUtaGVscGVycy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFBLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBRUosaUJBQUEsR0FBb0IsSUFBSTs7RUFFeEIsS0FBQSxHQUFRLFNBQUMsSUFBRCxFQUFPLElBQVAsRUFBYSxlQUFiO0FBQ04sUUFBQTs7TUFEbUIsa0JBQWdCOztJQUNuQyxJQUFBLEdBQU8sYUFBQSxDQUFjLElBQWQ7SUFDUCxJQUFnRCxlQUFoRDtNQUFBLGlCQUFpQixDQUFDLEdBQWxCLENBQXNCLElBQXRCLEVBQTRCLGVBQTVCLEVBQUE7O0lBQ0EsaUJBQUEsR0FBb0IscUJBQUEsQ0FBc0IsSUFBdEIsRUFBNEIsSUFBNUI7SUFDcEIsSUFBOEMsaUJBQUEsS0FBcUIsQ0FBRSxDQUFyRTtNQUFBLFlBQUEsR0FBZSxJQUFLLENBQUEsaUJBQUEsRUFBcEI7O0lBRUEsSUFBRyxvQkFBSDtNQUNFLElBQUcsb0JBQUg7QUFDRTtBQUFBLGFBQUEscUNBQUE7O1VBQUEsS0FBQSxDQUFNLFlBQVksQ0FBQyxPQUFuQixFQUE0QixXQUE1QixFQUF5QyxlQUF6QztBQUFBLFNBREY7T0FBQSxNQUVLLElBQUcsZUFBSDtRQUNILElBQUEsQ0FBQSxDQUFPLGVBQUEsR0FBa0IsaUJBQWlCLENBQUMsR0FBbEIsQ0FBc0IsWUFBdEIsQ0FBekIsQ0FBQTtVQUNFLElBQUssQ0FBQSxpQkFBQSxDQUFMLEdBQTBCLEtBRDVCO1NBREc7T0FIUDtLQUFBLE1BTUssSUFBQSxDQUFBLENBQU8sSUFBSSxDQUFDLElBQUwsS0FBYSxXQUFiLHlDQUF5QyxDQUFFLGNBQWQsS0FBc0IsV0FBMUQsQ0FBQTtNQUNILElBQUksQ0FBQyxJQUFMLENBQVUsSUFBVixFQURHOztFQVpDOztFQWlCUixPQUFBLEdBQVUsU0FBQyxJQUFELEVBQU8sSUFBUDtBQUNSLFFBQUE7SUFBQSxpQkFBQSxHQUFvQixxQkFBQSxDQUFzQixJQUF0QixFQUE0QixJQUE1QjtJQUNwQixJQUE4QyxpQkFBQSxLQUFxQixDQUFFLENBQXJFO01BQUEsWUFBQSxHQUFlLElBQUssQ0FBQSxpQkFBQSxFQUFwQjs7SUFFQSxJQUFHLG9CQUFIO01BQ0UsSUFBRyxvQkFBSDtBQUNFO0FBQUEsYUFBQSxxQ0FBQTs7VUFBQSxPQUFBLENBQVEsWUFBWSxDQUFDLE9BQXJCLEVBQThCLFdBQTlCO0FBQUEsU0FERjs7TUFHQSxJQUFBLENBQUEsOENBQTJCLENBQUUsZ0JBQXRCLEdBQStCLENBQXRDLENBQUE7ZUFDRSxJQUFJLENBQUMsTUFBTCxDQUFZLGlCQUFaLEVBQStCLENBQS9CLEVBREY7T0FKRjs7RUFKUTs7RUFXVixxQkFBQSxHQUF3QixTQUFDLElBQUQsRUFBTyxHQUFQO0FBQ3RCLFFBQUE7SUFEOEIsaUJBQU0sbUJBQU87SUFDM0MsSUFBYSxJQUFBLEtBQVEsV0FBckI7QUFBQSxhQUFPLENBQUMsRUFBUjs7QUFDQSxTQUFBLHNEQUFBOztNQUNFLElBQUcsY0FBQSxDQUFlLElBQUksQ0FBQyxLQUFwQixDQUFBLEtBQThCLGNBQUEsQ0FBZSxLQUFmLENBQTlCLElBQXdELHNCQUFBLEtBQWlCLGlCQUE1RTtBQUNFLGVBQU8sTUFEVDs7QUFERjtXQUdBLENBQUM7RUFMcUI7O0VBT3hCLGNBQUEsR0FBaUIsU0FBQyxLQUFEO0lBQ2YsSUFBd0IsYUFBeEI7QUFBQSxhQUFPLE9BQVA7O0lBRUEsSUFBRyxPQUFPLENBQUMsUUFBUixLQUFvQixRQUF2QjthQUNFLE1BREY7S0FBQSxNQUFBO2FBR0UsS0FBSyxDQUFDLE9BQU4sQ0FBYyxLQUFkLEVBQXFCLEVBQXJCLEVBSEY7O0VBSGU7O0VBUWpCLGFBQUEsR0FBZ0IsU0FBQyxJQUFEO0lBQ2QsSUFBQSxHQUFPLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBUCxFQUFhLE1BQWIsRUFBcUIsT0FBckIsRUFBOEIsU0FBOUIsRUFBeUMsU0FBekMsRUFBb0QsU0FBcEQsRUFBK0QsU0FBL0QsRUFBMEUsZUFBMUUsRUFBMkYsTUFBM0Y7SUFDUCxJQUFHLG9CQUFIO01BQ0UsSUFBSSxDQUFDLE9BQUwsR0FBZSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQWIsQ0FBaUIsU0FBQyxXQUFEO2VBQWlCLGFBQUEsQ0FBYyxXQUFkO01BQWpCLENBQWpCLEVBRGpCOztXQUVBO0VBSmM7O0VBTWhCLE1BQU0sQ0FBQyxPQUFQLEdBQWlCO0lBQUMsT0FBQSxLQUFEO0lBQVEsU0FBQSxPQUFSO0lBQWlCLGdCQUFBLGNBQWpCO0lBQWlDLGVBQUEsYUFBakM7O0FBckRqQiIsInNvdXJjZXNDb250ZW50IjpbIl8gPSByZXF1aXJlICd1bmRlcnNjb3JlLXBsdXMnXG5cbkl0ZW1TcGVjaWZpY2l0aWVzID0gbmV3IFdlYWtNYXBcblxubWVyZ2UgPSAobWVudSwgaXRlbSwgaXRlbVNwZWNpZmljaXR5PUluZmluaXR5KSAtPlxuICBpdGVtID0gY2xvbmVNZW51SXRlbShpdGVtKVxuICBJdGVtU3BlY2lmaWNpdGllcy5zZXQoaXRlbSwgaXRlbVNwZWNpZmljaXR5KSBpZiBpdGVtU3BlY2lmaWNpdHlcbiAgbWF0Y2hpbmdJdGVtSW5kZXggPSBmaW5kTWF0Y2hpbmdJdGVtSW5kZXgobWVudSwgaXRlbSlcbiAgbWF0Y2hpbmdJdGVtID0gbWVudVttYXRjaGluZ0l0ZW1JbmRleF0gdW5sZXNzIG1hdGNoaW5nSXRlbUluZGV4IGlzIC0gMVxuXG4gIGlmIG1hdGNoaW5nSXRlbT9cbiAgICBpZiBpdGVtLnN1Ym1lbnU/XG4gICAgICBtZXJnZShtYXRjaGluZ0l0ZW0uc3VibWVudSwgc3VibWVudUl0ZW0sIGl0ZW1TcGVjaWZpY2l0eSkgZm9yIHN1Ym1lbnVJdGVtIGluIGl0ZW0uc3VibWVudVxuICAgIGVsc2UgaWYgaXRlbVNwZWNpZmljaXR5XG4gICAgICB1bmxlc3MgaXRlbVNwZWNpZmljaXR5IDwgSXRlbVNwZWNpZmljaXRpZXMuZ2V0KG1hdGNoaW5nSXRlbSlcbiAgICAgICAgbWVudVttYXRjaGluZ0l0ZW1JbmRleF0gPSBpdGVtXG4gIGVsc2UgdW5sZXNzIGl0ZW0udHlwZSBpcyAnc2VwYXJhdG9yJyBhbmQgXy5sYXN0KG1lbnUpPy50eXBlIGlzICdzZXBhcmF0b3InXG4gICAgbWVudS5wdXNoKGl0ZW0pXG5cbiAgcmV0dXJuXG5cbnVubWVyZ2UgPSAobWVudSwgaXRlbSkgLT5cbiAgbWF0Y2hpbmdJdGVtSW5kZXggPSBmaW5kTWF0Y2hpbmdJdGVtSW5kZXgobWVudSwgaXRlbSlcbiAgbWF0Y2hpbmdJdGVtID0gbWVudVttYXRjaGluZ0l0ZW1JbmRleF0gdW5sZXNzIG1hdGNoaW5nSXRlbUluZGV4IGlzIC0gMVxuXG4gIGlmIG1hdGNoaW5nSXRlbT9cbiAgICBpZiBpdGVtLnN1Ym1lbnU/XG4gICAgICB1bm1lcmdlKG1hdGNoaW5nSXRlbS5zdWJtZW51LCBzdWJtZW51SXRlbSkgZm9yIHN1Ym1lbnVJdGVtIGluIGl0ZW0uc3VibWVudVxuXG4gICAgdW5sZXNzIG1hdGNoaW5nSXRlbS5zdWJtZW51Py5sZW5ndGggPiAwXG4gICAgICBtZW51LnNwbGljZShtYXRjaGluZ0l0ZW1JbmRleCwgMSlcblxuZmluZE1hdGNoaW5nSXRlbUluZGV4ID0gKG1lbnUsIHt0eXBlLCBsYWJlbCwgc3VibWVudX0pIC0+XG4gIHJldHVybiAtMSBpZiB0eXBlIGlzICdzZXBhcmF0b3InXG4gIGZvciBpdGVtLCBpbmRleCBpbiBtZW51XG4gICAgaWYgbm9ybWFsaXplTGFiZWwoaXRlbS5sYWJlbCkgaXMgbm9ybWFsaXplTGFiZWwobGFiZWwpIGFuZCBpdGVtLnN1Ym1lbnU/IGlzIHN1Ym1lbnU/XG4gICAgICByZXR1cm4gaW5kZXhcbiAgLTFcblxubm9ybWFsaXplTGFiZWwgPSAobGFiZWwpIC0+XG4gIHJldHVybiB1bmRlZmluZWQgdW5sZXNzIGxhYmVsP1xuXG4gIGlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ2RhcndpbidcbiAgICBsYWJlbFxuICBlbHNlXG4gICAgbGFiZWwucmVwbGFjZSgvXFwmL2csICcnKVxuXG5jbG9uZU1lbnVJdGVtID0gKGl0ZW0pIC0+XG4gIGl0ZW0gPSBfLnBpY2soaXRlbSwgJ3R5cGUnLCAnbGFiZWwnLCAnZW5hYmxlZCcsICd2aXNpYmxlJywgJ2NvbW1hbmQnLCAnc3VibWVudScsICdjb21tYW5kRGV0YWlsJywgJ3JvbGUnKVxuICBpZiBpdGVtLnN1Ym1lbnU/XG4gICAgaXRlbS5zdWJtZW51ID0gaXRlbS5zdWJtZW51Lm1hcCAoc3VibWVudUl0ZW0pIC0+IGNsb25lTWVudUl0ZW0oc3VibWVudUl0ZW0pXG4gIGl0ZW1cblxubW9kdWxlLmV4cG9ydHMgPSB7bWVyZ2UsIHVubWVyZ2UsIG5vcm1hbGl6ZUxhYmVsLCBjbG9uZU1lbnVJdGVtfVxuIl19
