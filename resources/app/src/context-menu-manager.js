(function() {
  var CSON, ContextMenuItemSet, ContextMenuManager, Disposable, MenuHelpers, calculateSpecificity, fs, path, platformContextMenu, ref, ref1, ref2, remote, validateSelector;

  path = require('path');

  CSON = require('season');

  fs = require('fs-plus');

  ref = require('clear-cut'), calculateSpecificity = ref.calculateSpecificity, validateSelector = ref.validateSelector;

  Disposable = require('event-kit').Disposable;

  remote = require('electron').remote;

  MenuHelpers = require('./menu-helpers');

  platformContextMenu = (ref1 = require('../package.json')) != null ? (ref2 = ref1._atomMenu) != null ? ref2['context-menu'] : void 0 : void 0;

  module.exports = ContextMenuManager = (function() {
    function ContextMenuManager(arg) {
      this.keymapManager = arg.keymapManager;
      this.definitions = {
        '.overlayer': []
      };
      this.clear();
      this.keymapManager.onDidLoadBundledKeymaps((function(_this) {
        return function() {
          return _this.loadPlatformItems();
        };
      })(this));
    }

    ContextMenuManager.prototype.initialize = function(arg) {
      this.resourcePath = arg.resourcePath, this.devMode = arg.devMode;
    };

    ContextMenuManager.prototype.loadPlatformItems = function() {
      var map, menusDirPath, platformMenuPath, ref3;
      if (platformContextMenu != null) {
        return this.add(platformContextMenu, (ref3 = this.devMode) != null ? ref3 : false);
      } else {
        menusDirPath = path.join(this.resourcePath, 'menus');
        platformMenuPath = fs.resolve(menusDirPath, process.platform, ['cson', 'json']);
        map = CSON.readFileSync(platformMenuPath);
        return this.add(map['context-menu']);
      }
    };

    ContextMenuManager.prototype.add = function(itemsBySelector, throwOnInvalidSelector) {
      var addedItemSets, itemSet, items, selector;
      if (throwOnInvalidSelector == null) {
        throwOnInvalidSelector = true;
      }
      addedItemSets = [];
      for (selector in itemsBySelector) {
        items = itemsBySelector[selector];
        if (throwOnInvalidSelector) {
          validateSelector(selector);
        }
        itemSet = new ContextMenuItemSet(selector, items);
        addedItemSets.push(itemSet);
        this.itemSets.push(itemSet);
      }
      return new Disposable((function(_this) {
        return function() {
          var i, len;
          for (i = 0, len = addedItemSets.length; i < len; i++) {
            itemSet = addedItemSets[i];
            _this.itemSets.splice(_this.itemSets.indexOf(itemSet), 1);
          }
        };
      })(this));
    };

    ContextMenuManager.prototype.templateForElement = function(target) {
      return this.templateForEvent({
        target: target
      });
    };

    ContextMenuManager.prototype.templateForEvent = function(event) {
      var currentTarget, currentTargetItems, i, item, itemForEvent, itemSet, j, k, len, len1, len2, matchingItemSets, ref3, template;
      template = [];
      currentTarget = event.target;
      while (currentTarget != null) {
        currentTargetItems = [];
        matchingItemSets = this.itemSets.filter(function(itemSet) {
          return currentTarget.webkitMatchesSelector(itemSet.selector);
        });
        for (i = 0, len = matchingItemSets.length; i < len; i++) {
          itemSet = matchingItemSets[i];
          ref3 = itemSet.items;
          for (j = 0, len1 = ref3.length; j < len1; j++) {
            item = ref3[j];
            itemForEvent = this.cloneItemForEvent(item, event);
            if (itemForEvent) {
              MenuHelpers.merge(currentTargetItems, itemForEvent, itemSet.specificity);
            }
          }
        }
        for (k = 0, len2 = currentTargetItems.length; k < len2; k++) {
          item = currentTargetItems[k];
          MenuHelpers.merge(template, item, false);
        }
        currentTarget = currentTarget.parentElement;
      }
      this.pruneRedundantSeparators(template);
      return template;
    };

    ContextMenuManager.prototype.pruneRedundantSeparators = function(menu) {
      var index, keepNextItemIfSeparator, results;
      keepNextItemIfSeparator = false;
      index = 0;
      results = [];
      while (index < menu.length) {
        if (menu[index].type === 'separator') {
          if (!keepNextItemIfSeparator || index === menu.length - 1) {
            results.push(menu.splice(index, 1));
          } else {
            results.push(index++);
          }
        } else {
          keepNextItemIfSeparator = true;
          results.push(index++);
        }
      }
      return results;
    };

    ContextMenuManager.prototype.cloneItemForEvent = function(item, event) {
      if (item.devMode && !this.devMode) {
        return null;
      }
      item = Object.create(item);
      if (typeof item.shouldDisplay === 'function') {
        if (!item.shouldDisplay(event)) {
          return null;
        }
      }
      if (typeof item.created === "function") {
        item.created(event);
      }
      if (Array.isArray(item.submenu)) {
        item.submenu = item.submenu.map((function(_this) {
          return function(submenuItem) {
            return _this.cloneItemForEvent(submenuItem, event);
          };
        })(this)).filter(function(submenuItem) {
          return submenuItem !== null;
        });
      }
      return item;
    };

    ContextMenuManager.prototype.convertLegacyItemsBySelector = function(legacyItemsBySelector, devMode) {
      var commandsByLabel, itemsBySelector, selector;
      itemsBySelector = {};
      for (selector in legacyItemsBySelector) {
        commandsByLabel = legacyItemsBySelector[selector];
        itemsBySelector[selector] = this.convertLegacyItems(commandsByLabel, devMode);
      }
      return itemsBySelector;
    };

    ContextMenuManager.prototype.convertLegacyItems = function(legacyItems, devMode) {
      var commandOrSubmenu, items, label;
      items = [];
      for (label in legacyItems) {
        commandOrSubmenu = legacyItems[label];
        if (typeof commandOrSubmenu === 'object') {
          items.push({
            label: label,
            submenu: this.convertLegacyItems(commandOrSubmenu, devMode),
            devMode: devMode
          });
        } else if (commandOrSubmenu === '-') {
          items.push({
            type: 'separator'
          });
        } else {
          items.push({
            label: label,
            command: commandOrSubmenu,
            devMode: devMode
          });
        }
      }
      return items;
    };

    ContextMenuManager.prototype.showForEvent = function(event) {
      var menuTemplate;
      this.activeElement = event.target;
      menuTemplate = this.templateForEvent(event);
      if (!((menuTemplate != null ? menuTemplate.length : void 0) > 0)) {
        return;
      }
      remote.getCurrentWindow().emit('context-menu', menuTemplate);
    };

    ContextMenuManager.prototype.clear = function() {
      var inspectElement;
      this.activeElement = null;
      this.itemSets = [];
      inspectElement = {
        'atom-workspace': [
          {
            label: 'Inspect Element',
            command: 'application:inspect',
            devMode: true,
            created: function(event) {
              var pageX, pageY;
              pageX = event.pageX, pageY = event.pageY;
              return this.commandDetail = {
                x: pageX,
                y: pageY
              };
            }
          }
        ]
      };
      return this.add(inspectElement, false);
    };

    return ContextMenuManager;

  })();

  ContextMenuItemSet = (function() {
    function ContextMenuItemSet(selector1, items1) {
      this.selector = selector1;
      this.items = items1;
      this.specificity = calculateSpecificity(this.selector);
    }

    return ContextMenuItemSet;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2NvbnRleHQtbWVudS1tYW5hZ2VyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLElBQUEsR0FBTyxPQUFBLENBQVEsUUFBUjs7RUFDUCxFQUFBLEdBQUssT0FBQSxDQUFRLFNBQVI7O0VBQ0wsTUFBMkMsT0FBQSxDQUFRLFdBQVIsQ0FBM0MsRUFBQywrQ0FBRCxFQUF1Qjs7RUFDdEIsYUFBYyxPQUFBLENBQVEsV0FBUjs7RUFDZCxTQUFVLE9BQUEsQ0FBUSxVQUFSOztFQUNYLFdBQUEsR0FBYyxPQUFBLENBQVEsZ0JBQVI7O0VBRWQsbUJBQUEsdUZBQTZELENBQUEsY0FBQTs7RUFnQzdELE1BQU0sQ0FBQyxPQUFQLEdBQ007SUFDUyw0QkFBQyxHQUFEO01BQUUsSUFBQyxDQUFBLGdCQUFGLElBQUU7TUFDZCxJQUFDLENBQUEsV0FBRCxHQUFlO1FBQUMsWUFBQSxFQUFjLEVBQWY7O01BQ2YsSUFBQyxDQUFBLEtBQUQsQ0FBQTtNQUVBLElBQUMsQ0FBQSxhQUFhLENBQUMsdUJBQWYsQ0FBdUMsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO2lCQUFHLEtBQUMsQ0FBQSxpQkFBRCxDQUFBO1FBQUg7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXZDO0lBSlc7O2lDQU1iLFVBQUEsR0FBWSxTQUFDLEdBQUQ7TUFBRSxJQUFDLENBQUEsbUJBQUEsY0FBYyxJQUFDLENBQUEsY0FBQTtJQUFsQjs7aUNBRVosaUJBQUEsR0FBbUIsU0FBQTtBQUNqQixVQUFBO01BQUEsSUFBRywyQkFBSDtlQUNFLElBQUMsQ0FBQSxHQUFELENBQUssbUJBQUwseUNBQXFDLEtBQXJDLEVBREY7T0FBQSxNQUFBO1FBR0UsWUFBQSxHQUFlLElBQUksQ0FBQyxJQUFMLENB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LDRCQUFDLFNBQUQsRUFBWSxNQUFaO01BQUMsSUFBQyxDQUFBLFdBQUQ7TUFBVyxJQUFDLENBQUEsUUFBRDtNQUN2QixJQUFDLENBQUEsV0FBRCxHQUFlLG9CQUFBLENBQXFCLElBQUMsQ0FBQSxRQUF0QjtJQURKOzs7OztBQS9OZiIsInNvdXJjZXNDb250ZW50IjpbInBhdGggPSByZXF1aXJlICdwYXRoJ1xuQ1NPTiA9IHJlcXVpcmUgJ3NlYXNvbidcbmZzID0gcmVxdWlyZSAnZnMtcGx1cydcbntjYWxjdWxhdGVTcGVjaWZpY2l0eSwgdmFsaWRhdGVTZWxlY3Rvcn0gPSByZXF1aXJlICdjbGVhci1jdXQnXG57RGlzcG9zYWJsZX0gPSByZXF1aXJlICdldmVudC1raXQnXG57cmVtb3RlfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuTWVudUhlbHBlcnMgPSByZXF1aXJlICcuL21lbnUtaGVscGVycydcblxucGxhdGZvcm1Db250ZXh0TWVudSA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpPy5fYXRvbU1lbnU/Wydjb250ZXh0LW1lbnUnXVxuXG4jIEV4dGVuZGVkOiBQcm92aWRlcyBhIHJlZ2lzdHJ5IGZvciBjb21tYW5kcyB0aGF0IHlvdSdkIGxpa2UgdG8gYXBwZWFyIGluIHRoZVxuIyBjb250ZXh0IG1lbnUuXG4jXG4jIEFuIGluc3RhbmNlIG9mIHRoaXMgY2xhc3MgaXMgYWx3YXlzIGF2YWlsYWJsZSBhcyB0aGUgYGF0b20uY29udGV4dE1lbnVgXG4jIGdsb2JhbC5cbiNcbiMgIyMgQ29udGV4dCBNZW51IENTT04gRm9ybWF0XG4jXG4jIGBgYGNvZmZlZVxuIyAnYXRvbS13b3Jrc3BhY2UnOiBbe2xhYmVsOiAnSGVscCcsIGNvbW1hbmQ6ICdhcHBsaWNhdGlvbjpvcGVuLWRvY3VtZW50YXRpb24nfV1cbiMgJ2F0b20tdGV4dC1lZGl0b3InOiBbe1xuIyAgIGxhYmVsOiAnSGlzdG9yeScsXG4jICAgc3VibWVudTogW1xuIyAgICAge2xhYmVsOiAnVW5kbycsIGNvbW1hbmQ6J2NvcmU6dW5kbyd9XG4jICAgICB7bGFiZWw6ICdSZWRvJywgY29tbWFuZDonY29yZTpyZWRvJ31cbiMgICBdXG4jIH1dXG4jIGBgYFxuI1xuIyBJbiB5b3VyIHBhY2thZ2UncyBtZW51IGAuY3NvbmAgZmlsZSB5b3UgbmVlZCB0byBzcGVjaWZ5IGl0IHVuZGVyIGFcbiMgYGNvbnRleHQtbWVudWAga2V5OlxuI1xuIyBgYGBjb2ZmZWVcbiMgJ2NvbnRleHQtbWVudSc6XG4jICAgJ2F0b20td29ya3NwYWNlJzogW3tsYWJlbDogJ0hlbHAnLCBjb21tYW5kOiAnYXBwbGljYXRpb246b3Blbi1kb2N1bWVudGF0aW9uJ31dXG4jICAgLi4uXG4jIGBgYFxuI1xuIyBUaGUgZm9ybWF0IGZvciB1c2UgaW4gezo6YWRkfSBpcyB0aGUgc2FtZSBtaW51cyB0aGUgYGNvbnRleHQtbWVudWAga2V5LiBTZWVcbiMgezo6YWRkfSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIENvbnRleHRNZW51TWFuYWdlclxuICBjb25zdHJ1Y3RvcjogKHtAa2V5bWFwTWFuYWdlcn0pIC0+XG4gICAgQGRlZmluaXRpb25zID0geycub3ZlcmxheWVyJzogW119ICMgVE9ETzogUmVtb3ZlIG9uY2UgY29sb3IgcGlja2VyIHBhY2thZ2Ugc3RvcHMgdG91Y2hpbmcgcHJpdmF0ZSBkYXRhXG4gICAgQGNsZWFyKClcblxuICAgIEBrZXltYXBNYW5hZ2VyLm9uRGlkTG9hZEJ1bmRsZWRLZXltYXBzID0+IEBsb2FkUGxhdGZvcm1JdGVtcygpXG5cbiAgaW5pdGlhbGl6ZTogKHtAcmVzb3VyY2VQYXRoLCBAZGV2TW9kZX0pIC0+XG5cbiAgbG9hZFBsYXRmb3JtSXRlbXM6IC0+XG4gICAgaWYgcGxhdGZvcm1Db250ZXh0TWVudT9cbiAgICAgIEBhZGQocGxhdGZvcm1Db250ZXh0TWVudSwgQGRldk1vZGUgPyBmYWxzZSlcbiAgICBlbHNlXG4gICAgICBtZW51c0RpclBhdGggPSBwYXRoLmpvaW4oQHJlc291cmNlUGF0aCwgJ21lbnVzJylcbiAgICAgIHBsYXRmb3JtTWVudVBhdGggPSBmcy5yZXNvbHZlKG1lbnVzRGlyUGF0aCwgcHJvY2Vzcy5wbGF0Zm9ybSwgWydjc29uJywgJ2pzb24nXSlcbiAgICAgIG1hcCA9IENTT04ucmVhZEZpbGVTeW5jKHBsYXRmb3JtTWVudVBhdGgpXG4gICAgICBAYWRkKG1hcFsnY29udGV4dC1tZW51J10pXG5cbiAgIyBQdWJsaWM6IEFkZCBjb250ZXh0IG1lbnUgaXRlbXMgc2NvcGVkIGJ5IENTUyBzZWxlY3RvcnMuXG4gICNcbiAgIyAjIyBFeGFtcGxlc1xuICAjXG4gICMgVG8gYWRkIGEgY29udGV4dCBtZW51LCBwYXNzIGEgc2VsZWN0b3IgbWF0Y2hpbmcgdGhlIGVsZW1lbnRzIHRvIHdoaWNoIHlvdVxuICAjIHdhbnQgdGhlIG1lbnUgdG8gYXBwbHkgYXMgdGhlIHRvcCBsZXZlbCBrZXksIGZvbGxvd2VkIGJ5IGEgbWVudSBkZXNjcmlwdG9yLlxuICAjIFRoZSBpbnZvY2F0aW9uIGJlbG93IGFkZHMgYSBnbG9iYWwgJ0hlbHAnIGNvbnRleHQgbWVudSBpdGVtIGFuZCBhICdIaXN0b3J5J1xuICAjIHN1Ym1lbnUgb24gdGhlIGVkaXRvciBzdXBwb3J0aW5nIHVuZG8vcmVkby4gVGhpcyBpcyBqdXN0IGZvciBleGFtcGxlXG4gICMgcHVycG9zZXMgYW5kIG5vdCB0aGUgd2F5IHRoZSBtZW51IGlzIGFjdHVhbGx5IGNvbmZpZ3VyZWQgaW4gQXRvbSBieSBkZWZhdWx0LlxuICAjXG4gICMgYGBgY29mZmVlXG4gICMgYXRvbS5jb250ZXh0TWVudS5hZGQge1xuICAjICAgJ2F0b20td29ya3NwYWNlJzogW3tsYWJlbDogJ0hlbHAnLCBjb21tYW5kOiAnYXBwbGljYXRpb246b3Blbi1kb2N1bWVudGF0aW9uJ31dXG4gICMgICAnYXRvbS10ZXh0LWVkaXRvcic6IFt7XG4gICMgICAgIGxhYmVsOiAnSGlzdG9yeScsXG4gICMgICAgIHN1Ym1lbnU6IFtcbiAgIyAgICAgICB7bGFiZWw6ICdVbmRvJywgY29tbWFuZDonY29yZTp1bmRvJ31cbiAgIyAgICAgICB7bGFiZWw6ICdSZWRvJywgY29tbWFuZDonY29yZTpyZWRvJ31cbiAgIyAgICAgXVxuICAjICAgfV1cbiAgIyB9XG4gICMgYGBgXG4gICNcbiAgIyAjIyBBcmd1bWVudHNcbiAgI1xuICAjICogYGl0ZW1zQnlTZWxlY3RvcmAgQW4ge09iamVjdH0gd2hvc2Uga2V5cyBhcmUgQ1NTIHNlbGVjdG9ycyBhbmQgd2hvc2VcbiAgIyAgIHZhbHVlcyBhcmUge0FycmF5fXMgb2YgaXRlbSB7T2JqZWN0fXMgY29udGFpbmluZyB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGBsYWJlbGAgKG9wdGlvbmFsKSBBIHtTdHJpbmd9IGNvbnRhaW5pbmcgdGhlIG1lbnUgaXRlbSdzIGxhYmVsLlxuICAjICAgKiBgY29tbWFuZGAgKG9wdGlvbmFsKSBBIHtTdHJpbmd9IGNvbnRhaW5pbmcgdGhlIGNvbW1hbmQgdG8gaW52b2tlIG9uIHRoZVxuICAjICAgICB0YXJnZXQgb2YgdGhlIHJpZ2h0IGNsaWNrIHRoYXQgaW52b2tlZCB0aGUgY29udGV4dCBtZW51LlxuICAjICAgKiBgZW5hYmxlZGAgKG9wdGlvbmFsKSBBIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIG1lbnUgaXRlbVxuICAjICAgICBzaG91bGQgYmUgY2xpY2thYmxlLiBEaXNhYmxlZCBtZW51IGl0ZW1zIHR5cGljYWxseSBhcHBlYXIgZ3JheWVkIG91dC5cbiAgIyAgICAgRGVmYXVsdHMgdG8gYHRydWVgLlxuICAjICAgKiBgc3VibWVudWAgKG9wdGlvbmFsKSBBbiB7QXJyYXl9IG9mIGFkZGl0aW9uYWwgaXRlbXMuXG4gICMgICAqIGB0eXBlYCAob3B0aW9uYWwpIElmIHlvdSB3YW50IHRvIGNyZWF0ZSBhIHNlcGFyYXRvciwgcHJvdmlkZSBhbiBpdGVtXG4gICMgICAgICB3aXRoIGB0eXBlOiAnc2VwYXJhdG9yJ2AgYW5kIG5vIG90aGVyIGtleXMuXG4gICMgICAqIGB2aXNpYmxlYCAob3B0aW9uYWwpIEEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0aGUgbWVudSBpdGVtXG4gICMgICAgIHNob3VsZCBhcHBlYXIgaW4gdGhlIG1lbnUuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgIyAgICogYGNyZWF0ZWRgIChvcHRpb25hbCkgQSB7RnVuY3Rpb259IHRoYXQgaXMgY2FsbGVkIG9uIHRoZSBpdGVtIGVhY2ggdGltZSBhXG4gICMgICAgIGNvbnRleHQgbWVudSBpcyBjcmVhdGVkIHZpYSBhIHJpZ2h0IGNsaWNrLiBZb3UgY2FuIGFzc2lnbiBwcm9wZXJ0aWVzIHRvXG4gICMgICAgYHRoaXNgIHRvIGR5bmFtaWNhbGx5IGNvbXB1dGUgdGhlIGNvbW1hbmQsIGxhYmVsLCBldGMuIFRoaXMgbWV0aG9kIGlzXG4gICMgICAgYWN0dWFsbHkgY2FsbGVkIG9uIGEgY2xvbmUgb2YgdGhlIG9yaWdpbmFsIGl0ZW0gdGVtcGxhdGUgdG8gcHJldmVudCBzdGF0ZVxuICAjICAgIGZyb20gbGVha2luZyBhY3Jvc3MgY29udGV4dCBtZW51IGRlcGxveW1lbnRzLiBDYWxsZWQgd2l0aCB0aGUgZm9sbG93aW5nXG4gICMgICAgYXJndW1lbnQ6XG4gICMgICAgICogYGV2ZW50YCBUaGUgY2xpY2sgZXZlbnQgdGhhdCBkZXBsb3llZCB0aGUgY29udGV4dCBtZW51LlxuICAjICAgKiBgc2hvdWxkRGlzcGxheWAgKG9wdGlvbmFsKSBBIHtGdW5jdGlvbn0gdGhhdCBpcyBjYWxsZWQgdG8gZGV0ZXJtaW5lXG4gICMgICAgIHdoZXRoZXIgdG8gZGlzcGxheSB0aGlzIGl0ZW0gb24gYSBnaXZlbiBjb250ZXh0IG1lbnUgZGVwbG95bWVudC4gQ2FsbGVkXG4gICMgICAgIHdpdGggdGhlIGZvbGxvd2luZyBhcmd1bWVudDpcbiAgIyAgICAgKiBgZXZlbnRgIFRoZSBjbGljayBldmVudCB0aGF0IGRlcGxveWVkIHRoZSBjb250ZXh0IG1lbnUuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHJlbW92ZSB0aGVcbiAgIyBhZGRlZCBtZW51IGl0ZW1zLlxuICBhZGQ6IChpdGVtc0J5U2VsZWN0b3IsIHRocm93T25JbnZhbGlkU2VsZWN0b3IgPSB0cnVlKSAtPlxuICAgIGFkZGVkSXRlbVNldHMgPSBbXVxuXG4gICAgZm9yIHNlbGVjdG9yLCBpdGVtcyBvZiBpdGVtc0J5U2VsZWN0b3JcbiAgICAgIHZhbGlkYXRlU2VsZWN0b3Ioc2VsZWN0b3IpIGlmIHRocm93T25JbnZhbGlkU2VsZWN0b3JcbiAgICAgIGl0ZW1TZXQgPSBuZXcgQ29udGV4dE1lbnVJdGVtU2V0KHNlbGVjdG9yLCBpdGVtcylcbiAgICAgIGFkZGVkSXRlbVNldHMucHVzaChpdGVtU2V0KVxuICAgICAgQGl0ZW1TZXRzLnB1c2goaXRlbVNldClcblxuICAgIG5ldyBEaXNwb3NhYmxlID0+XG4gICAgICBmb3IgaXRlbVNldCBpbiBhZGRlZEl0ZW1TZXRzXG4gICAgICAgIEBpdGVtU2V0cy5zcGxpY2UoQGl0ZW1TZXRzLmluZGV4T2YoaXRlbVNldCksIDEpXG4gICAgICByZXR1cm5cblxuICB0ZW1wbGF0ZUZvckVsZW1lbnQ6ICh0YXJnZXQpIC0+XG4gICAgQHRlbXBsYXRlRm9yRXZlbnQoe3RhcmdldH0pXG5cbiAgdGVtcGxhdGVGb3JFdmVudDogKGV2ZW50KSAtPlxuICAgIHRlbXBsYXRlID0gW11cbiAgICBjdXJyZW50VGFyZ2V0ID0gZXZlbnQudGFyZ2V0XG5cbiAgICB3aGlsZSBjdXJyZW50VGFyZ2V0P1xuICAgICAgY3VycmVudFRhcmdldEl0ZW1zID0gW11cbiAgICAgIG1hdGNoaW5nSXRlbVNldHMgPVxuICAgICAgICBAaXRlbVNldHMuZmlsdGVyIChpdGVtU2V0KSAtPiBjdXJyZW50VGFyZ2V0LndlYmtpdE1hdGNoZXNTZWxlY3RvcihpdGVtU2V0LnNlbGVjdG9yKVxuXG4gICAgICBmb3IgaXRlbVNldCBpbiBtYXRjaGluZ0l0ZW1TZXRzXG4gICAgICAgIGZvciBpdGVtIGluIGl0ZW1TZXQuaXRlbXNcbiAgICAgICAgICBpdGVtRm9yRXZlbnQgPSBAY2xvbmVJdGVtRm9yRXZlbnQoaXRlbSwgZXZlbnQpXG4gICAgICAgICAgaWYgaXRlbUZvckV2ZW50XG4gICAgICAgICAgICBNZW51SGVscGVycy5tZXJnZShjdXJyZW50VGFyZ2V0SXRlbXMsIGl0ZW1Gb3JFdmVudCwgaXRlbVNldC5zcGVjaWZpY2l0eSlcblxuICAgICAgZm9yIGl0ZW0gaW4gY3VycmVudFRhcmdldEl0ZW1zXG4gICAgICAgIE1lbnVIZWxwZXJzLm1lcmdlKHRlbXBsYXRlLCBpdGVtLCBmYWxzZSlcblxuICAgICAgY3VycmVudFRhcmdldCA9IGN1cnJlbnRUYXJnZXQucGFyZW50RWxlbWVudFxuXG4gICAgQHBydW5lUmVkdW5kYW50U2VwYXJhdG9ycyh0ZW1wbGF0ZSlcblxuICAgIHRlbXBsYXRlXG5cbiAgcHJ1bmVSZWR1bmRhbnRTZXBhcmF0b3JzOiAobWVudSkgLT5cbiAgICBrZWVwTmV4dEl0ZW1JZlNlcGFyYXRvciA9IGZhbHNlXG4gICAgaW5kZXggPSAwXG4gICAgd2hpbGUgaW5kZXggPCBtZW51Lmxlbmd0aFxuICAgICAgaWYgbWVudVtpbmRleF0udHlwZSBpcyAnc2VwYXJhdG9yJ1xuICAgICAgICBpZiBub3Qga2VlcE5leHRJdGVtSWZTZXBhcmF0b3Igb3IgaW5kZXggaXMgbWVudS5sZW5ndGggLSAxXG4gICAgICAgICAgbWVudS5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBpbmRleCsrXG4gICAgICBlbHNlXG4gICAgICAgIGtlZXBOZXh0SXRlbUlmU2VwYXJhdG9yID0gdHJ1ZVxuICAgICAgICBpbmRleCsrXG5cbiAgIyBSZXR1cm5zIGFuIG9iamVjdCBjb21wYXRpYmxlIHdpdGggYDo6YWRkKClgIG9yIGBudWxsYC5cbiAgY2xvbmVJdGVtRm9yRXZlbnQ6IChpdGVtLCBldmVudCkgLT5cbiAgICByZXR1cm4gbnVsbCBpZiBpdGVtLmRldk1vZGUgYW5kIG5vdCBAZGV2TW9kZVxuICAgIGl0ZW0gPSBPYmplY3QuY3JlYXRlKGl0ZW0pXG4gICAgaWYgdHlwZW9mIGl0ZW0uc2hvdWxkRGlzcGxheSBpcyAnZnVuY3Rpb24nXG4gICAgICByZXR1cm4gbnVsbCB1bmxlc3MgaXRlbS5zaG91bGREaXNwbGF5KGV2ZW50KVxuICAgIGl0ZW0uY3JlYXRlZD8oZXZlbnQpXG4gICAgaWYgQXJyYXkuaXNBcnJheShpdGVtLnN1Ym1lbnUpXG4gICAgICBpdGVtLnN1Ym1lbnUgPSBpdGVtLnN1Ym1lbnVcbiAgICAgICAgLm1hcCgoc3VibWVudUl0ZW0pID0+IEBjbG9uZUl0ZW1Gb3JFdmVudChzdWJtZW51SXRlbSwgZXZlbnQpKVxuICAgICAgICAuZmlsdGVyKChzdWJtZW51SXRlbSkgLT4gc3VibWVudUl0ZW0gaXNudCBudWxsKVxuICAgIHJldHVybiBpdGVtXG5cbiAgY29udmVydExlZ2FjeUl0ZW1zQnlTZWxlY3RvcjogKGxlZ2FjeUl0ZW1zQnlTZWxlY3RvciwgZGV2TW9kZSkgLT5cbiAgICBpdGVtc0J5U2VsZWN0b3IgPSB7fVxuXG4gICAgZm9yIHNlbGVjdG9yLCBjb21tYW5kc0J5TGFiZWwgb2YgbGVnYWN5SXRlbXNCeVNlbGVjdG9yXG4gICAgICBpdGVtc0J5U2VsZWN0b3Jbc2VsZWN0b3JdID0gQGNvbnZlcnRMZWdhY3lJdGVtcyhjb21tYW5kc0J5TGFiZWwsIGRldk1vZGUpXG5cbiAgICBpdGVtc0J5U2VsZWN0b3JcblxuICBjb252ZXJ0TGVnYWN5SXRlbXM6IChsZWdhY3lJdGVtcywgZGV2TW9kZSkgLT5cbiAgICBpdGVtcyA9IFtdXG5cbiAgICBmb3IgbGFiZWwsIGNvbW1hbmRPclN1Ym1lbnUgb2YgbGVnYWN5SXRlbXNcbiAgICAgIGlmIHR5cGVvZiBjb21tYW5kT3JTdWJtZW51IGlzICdvYmplY3QnXG4gICAgICAgIGl0ZW1zLnB1c2goe2xhYmVsLCBzdWJtZW51OiBAY29udmVydExlZ2FjeUl0ZW1zKGNvbW1hbmRPclN1Ym1lbnUsIGRldk1vZGUpLCBkZXZNb2RlfSlcbiAgICAgIGVsc2UgaWYgY29tbWFuZE9yU3VibWVudSBpcyAnLSdcbiAgICAgICAgaXRlbXMucHVzaCh7dHlwZTogJ3NlcGFyYXRvcid9KVxuICAgICAgZWxzZVxuICAgICAgICBpdGVtcy5wdXNoKHtsYWJlbCwgY29tbWFuZDogY29tbWFuZE9yU3VibWVudSwgZGV2TW9kZX0pXG5cbiAgICBpdGVtc1xuXG4gIHNob3dGb3JFdmVudDogKGV2ZW50KSAtPlxuICAgIEBhY3RpdmVFbGVtZW50ID0gZXZlbnQudGFyZ2V0XG4gICAgbWVudVRlbXBsYXRlID0gQHRlbXBsYXRlRm9yRXZlbnQoZXZlbnQpXG5cbiAgICByZXR1cm4gdW5sZXNzIG1lbnVUZW1wbGF0ZT8ubGVuZ3RoID4gMFxuICAgIHJlbW90ZS5nZXRDdXJyZW50V2luZG93KCkuZW1pdCgnY29udGV4dC1tZW51JywgbWVudVRlbXBsYXRlKVxuICAgIHJldHVyblxuXG4gIGNsZWFyOiAtPlxuICAgIEBhY3RpdmVFbGVtZW50ID0gbnVsbFxuICAgIEBpdGVtU2V0cyA9IFtdXG4gICAgaW5zcGVjdEVsZW1lbnQgPSB7XG4gICAgICAnYXRvbS13b3Jrc3BhY2UnOiBbe1xuICAgICAgICBsYWJlbDogJ0luc3BlY3QgRWxlbWVudCdcbiAgICAgICAgY29tbWFuZDogJ2FwcGxpY2F0aW9uOmluc3BlY3QnXG4gICAgICAgIGRldk1vZGU6IHRydWVcbiAgICAgICAgY3JlYXRlZDogKGV2ZW50KSAtPlxuICAgICAgICAgIHtwYWdlWCwgcGFnZVl9ID0gZXZlbnRcbiAgICAgICAgICBAY29tbWFuZERldGFpbCA9IHt4OiBwYWdlWCwgeTogcGFnZVl9XG4gICAgICB9XVxuICAgIH1cbiAgICBAYWRkKGluc3BlY3RFbGVtZW50LCBmYWxzZSlcblxuY2xhc3MgQ29udGV4dE1lbnVJdGVtU2V0XG4gIGNvbnN0cnVjdG9yOiAoQHNlbGVjdG9yLCBAaXRlbXMpIC0+XG4gICAgQHNwZWNpZmljaXR5ID0gY2FsY3VsYXRlU3BlY2lmaWNpdHkoQHNlbGVjdG9yKVxuIl19
