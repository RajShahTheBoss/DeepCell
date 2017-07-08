(function() {
  var CSON, Disposable, MenuHelpers, MenuManager, _, fs, ipcRenderer, path, platformMenu, ref, ref1;

  path = require('path');

  _ = require('underscore-plus');

  ipcRenderer = require('electron').ipcRenderer;

  CSON = require('season');

  fs = require('fs-plus');

  Disposable = require('event-kit').Disposable;

  MenuHelpers = require('./menu-helpers');

  platformMenu = (ref = require('../package.json')) != null ? (ref1 = ref._atomMenu) != null ? ref1.menu : void 0 : void 0;

  module.exports = MenuManager = (function() {
    function MenuManager(arg) {
      this.resourcePath = arg.resourcePath, this.keymapManager = arg.keymapManager, this.packageManager = arg.packageManager;
      this.initialized = false;
      this.pendingUpdateOperation = null;
      this.template = [];
      this.keymapManager.onDidLoadBundledKeymaps((function(_this) {
        return function() {
          return _this.loadPlatformItems();
        };
      })(this));
      this.packageManager.onDidActivateInitialPackages((function(_this) {
        return function() {
          return _this.sortPackagesMenu();
        };
      })(this));
    }

    MenuManager.prototype.initialize = function(arg) {
      this.resourcePath = arg.resourcePath;
      this.keymapManager.onDidReloadKeymap((function(_this) {
        return function() {
          return _this.update();
        };
      })(this));
      this.update();
      return this.initialized = true;
    };

    MenuManager.prototype.add = function(items) {
      var i, item, len;
      items = _.deepClone(items);
      for (i = 0, len = items.length; i < len; i++) {
        item = items[i];
        this.merge(this.template, item);
      }
      this.update();
      return new Disposable((function(_this) {
        return function() {
          return _this.remove(items);
        };
      })(this));
    };

    MenuManager.prototype.remove = function(items) {
      var i, item, len;
      for (i = 0, len = items.length; i < len; i++) {
        item = items[i];
        this.unmerge(this.template, item);
      }
      return this.update();
    };

    MenuManager.prototype.clear = function() {
      this.template = [];
      return this.update();
    };

    MenuManager.prototype.includeSelector = function(selector) {
      var element, error, ref2, ref3, testBody, testDocument, testWorkspace, workspaceClasses;
      try {
        if (document.body.webkitMatchesSelector(selector)) {
          return true;
        }
      } catch (error1) {
        error = error1;
        return false;
      }
      if (this.testEditor == null) {
        testDocument = document.implementation.createDocument(document.namespaceURI, 'html');
        testBody = testDocument.createElement('body');
        (ref2 = testBody.classList).add.apply(ref2, this.classesForElement(document.body));
        testWorkspace = testDocument.createElement('atom-workspace');
        workspaceClasses = this.classesForElement(document.body.querySelector('atom-workspace'));
        if (workspaceClasses.length === 0) {
          workspaceClasses = ['workspace'];
        }
        (ref3 = testWorkspace.classList).add.apply(ref3, workspaceClasses);
        testBody.appendChild(testWorkspace);
        this.testEditor = testDocument.createElement('atom-text-editor');
        this.testEditor.classList.add('editor');
        testWorkspace.appendChild(this.testEditor);
      }
      element = this.testEditor;
      while (element) {
        if (element.webkitMatchesSelector(selector)) {
          return true;
        }
        element = element.parentElement;
      }
      return false;
    };

    MenuManager.prototype.update = function() {
      if (!this.initialized) {
        return;
      }
      if (this.pendingUpdateOperation != null) {
        clearImmediate(this.pendingUpdateOperation);
      }
      return this.pendingUpdateOperation = setImmediate((function(_this) {
        return function() {
          var binding, i, j, keystrokesByCommand, len, len1, name, ref2, ref3, unsetKeystrokes;
          unsetKeystrokes = new Set;
          ref2 = _this.keymapManager.getKeyBindings();
          for (i = 0, len = ref2.length; i < len; i++) {
            binding = ref2[i];
            if (binding.command === 'unset!') {
              unsetKeystrokes.add(binding.keystrokes);
            }
          }
          keystrokesByCommand = {};
          ref3 = _this.keymapManager.getKeyBindings();
          for (j = 0, len1 = ref3.length; j < len1; j++) {
            binding = ref3[j];
            if (!_this.includeSelector(binding.selector)) {
              continue;
            }
            if (unsetKeystrokes.has(binding.keystrokes)) {
              continue;
            }
            if (binding.keystrokes.includes(' ')) {
              continue;
            }
            if (process.platform === 'darwin' && /^alt-(shift-)?.$/.test(binding.keystrokes)) {
              continue;
            }
            if (process.platform === 'win32' && /^ctrl-alt-(shift-)?.$/.test(binding.keystrokes)) {
              continue;
            }
            if (keystrokesByCommand[name = binding.command] == null) {
              keystrokesByCommand[name] = [];
            }
            keystrokesByCommand[binding.command].unshift(binding.keystrokes);
          }
          return _this.sendToBrowserProcess(_this.template, keystrokesByCommand);
        };
      })(this));
    };

    MenuManager.prototype.loadPlatformItems = function() {
      var menu, menusDirPath, platformMenuPath;
      if (platformMenu != null) {
        return this.add(platformMenu);
      } else {
        menusDirPath = path.join(this.resourcePath, 'menus');
        platformMenuPath = fs.resolve(menusDirPath, process.platform, ['cson', 'json']);
        menu = CSON.readFileSync(platformMenuPath).menu;
        return this.add(menu);
      }
    };

    MenuManager.prototype.merge = function(menu, item) {
      return MenuHelpers.merge(menu, item);
    };

    MenuManager.prototype.unmerge = function(menu, item) {
      return MenuHelpers.unmerge(menu, item);
    };

    MenuManager.prototype.sendToBrowserProcess = function(template, keystrokesByCommand) {
      return ipcRenderer.send('update-application-menu', template, keystrokesByCommand);
    };

    MenuManager.prototype.classesForElement = function(element) {
      var classList;
      if (classList = element != null ? element.classList : void 0) {
        return Array.prototype.slice.apply(classList);
      } else {
        return [];
      }
    };

    MenuManager.prototype.sortPackagesMenu = function() {
      var packagesMenu;
      packagesMenu = _.find(this.template, function(arg) {
        var label;
        label = arg.label;
        return MenuHelpers.normalizeLabel(label) === 'Packages';
      });
      if ((packagesMenu != null ? packagesMenu.submenu : void 0) == null) {
        return;
      }
      packagesMenu.submenu.sort(function(item1, item2) {
        if (item1.label && item2.label) {
          return MenuHelpers.normalizeLabel(item1.label).localeCompare(MenuHelpers.normalizeLabel(item2.label));
        } else {
          return 0;
        }
      });
      return this.update();
    };

    return MenuManager;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21lbnUtbWFuYWdlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFFUCxDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNILGNBQWUsT0FBQSxDQUFRLFVBQVI7O0VBQ2hCLElBQUEsR0FBTyxPQUFBLENBQVEsUUFBUjs7RUFDUCxFQUFBLEdBQUssT0FBQSxDQUFRLFNBQVI7O0VBQ0osYUFBYyxPQUFBLENBQVEsV0FBUjs7RUFFZixXQUFBLEdBQWMsT0FBQSxDQUFRLGdCQUFSOztFQUVkLFlBQUEscUZBQW9ELENBQUU7O0VBaUR0RCxNQUFNLENBQUMsT0FBUCxHQUNNO0lBQ1MscUJBQUMsR0FBRDtNQUFFLElBQUMsQ0FBQSxtQkFBQSxjQUFjLElBQUMsQ0FBQSxvQkFBQSxlQUFlLElBQUMsQ0FBQSxxQkFBQTtNQUM3QyxJQUFDLENBQUEsV0FBRCxHQUFlO01BQ2YsSUFBQyxDQUFBLHNCQUFELEdBQTBCO01BQzFCLElBQUMsQ0FBQSxRQUFELEdBQVk7TUFDWixJQUFDLENBQUEsYUFBYSxDQUFDLHVCQUFmLENBQXVDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtpQkFBRyxLQUFDLENBQUEsaUJBQUQsQ0FBQTtRQUFIO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF2QztNQUNBLElBQUMsQ0FBQSxjQUFjLENBQUMsNEJBQWhCLENBQTZDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtpQkFBRyxLQUFDLENBQUEsZ0JBQUQsQ0FBQTtRQUFIO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE3QztJQUxXOzswQkFPYixVQUFBLEdBQVksU0FBQyxHQUFEO01BQUUsSUFBQyxDQUFBLGVBQUYsSUFBRTtNQUNiLElBQUMsQ0FBQSxhQUFhLENBQUMs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QixDQUEwQixTQUFDLEtBQUQsRUFBUSxLQUFSO1FBQ3hCLElBQUcsS0FBSyxDQUFDLEtBQU4sSUFBZ0IsS0FBSyxDQUFDLEtBQXpCO2lCQUNFLFdBQVcsQ0FBQyxjQUFaLENBQTJCLEtBQUssQ0FBQyxLQUFqQyxDQUF1QyxDQUFDLGFBQXhDLENBQXNELFdBQVcsQ0FBQyxjQUFaLENBQTJCLEtBQUssQ0FBQyxLQUFqQyxDQUF0RCxFQURGO1NBQUEsTUFBQTtpQkFHRSxFQUhGOztNQUR3QixDQUExQjthQUtBLElBQUMsQ0FBQSxNQUFELENBQUE7SUFUZ0I7Ozs7O0FBdE1wQiIsInNvdXJjZXNDb250ZW50IjpbInBhdGggPSByZXF1aXJlICdwYXRoJ1xuXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZS1wbHVzJ1xue2lwY1JlbmRlcmVyfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuQ1NPTiA9IHJlcXVpcmUgJ3NlYXNvbidcbmZzID0gcmVxdWlyZSAnZnMtcGx1cydcbntEaXNwb3NhYmxlfSA9IHJlcXVpcmUgJ2V2ZW50LWtpdCdcblxuTWVudUhlbHBlcnMgPSByZXF1aXJlICcuL21lbnUtaGVscGVycydcblxucGxhdGZvcm1NZW51ID0gcmVxdWlyZSgnLi4vcGFja2FnZS5qc29uJyk/Ll9hdG9tTWVudT8ubWVudVxuXG4jIEV4dGVuZGVkOiBQcm92aWRlcyBhIHJlZ2lzdHJ5IGZvciBtZW51IGl0ZW1zIHRoYXQgeW91J2QgbGlrZSB0byBhcHBlYXIgaW4gdGhlXG4jIGFwcGxpY2F0aW9uIG1lbnUuXG4jXG4jIEFuIGluc3RhbmNlIG9mIHRoaXMgY2xhc3MgaXMgYWx3YXlzIGF2YWlsYWJsZSBhcyB0aGUgYGF0b20ubWVudWAgZ2xvYmFsLlxuI1xuIyAjIyBNZW51IENTT04gRm9ybWF0XG4jXG4jIEhlcmUgaXMgYW4gZXhhbXBsZSBmcm9tIHRoZSBbdHJlZS12aWV3XShodHRwczovL2dpdGh1Yi5jb20vYXRvbS90cmVlLXZpZXcvYmxvYi9tYXN0ZXIvbWVudXMvdHJlZS12aWV3LmNzb24pOlxuI1xuIyBgYGBjb2ZmZWVcbiMgW1xuIyAgIHtcbiMgICAgICdsYWJlbCc6ICdWaWV3J1xuIyAgICAgJ3N1Ym1lbnUnOiBbXG4jICAgICAgIHsgJ2xhYmVsJzogJ1RvZ2dsZSBUcmVlIFZpZXcnLCAnY29tbWFuZCc6ICd0cmVlLXZpZXc6dG9nZ2xlJyB9XG4jICAgICBdXG4jICAgfVxuIyAgIHtcbiMgICAgICdsYWJlbCc6ICdQYWNrYWdlcydcbiMgICAgICdzdWJtZW51JzogW1xuIyAgICAgICAnbGFiZWwnOiAnVHJlZSBWaWV3J1xuIyAgICAgICAnc3VibWVudSc6IFtcbiMgICAgICAgICB7ICdsYWJlbCc6ICdGb2N1cycsICdjb21tYW5kJzogJ3RyZWUtdmlldzp0b2dnbGUtZm9jdXMnIH1cbiMgICAgICAgICB7ICdsYWJlbCc6ICdUb2dnbGUnLCAnY29tbWFuZCc6ICd0cmVlLXZpZXc6dG9nZ2xlJyB9XG4jICAgICAgICAgeyAnbGFiZWwnOiAnUmV2ZWFsIEFjdGl2ZSBGaWxlJywgJ2NvbW1hbmQnOiAndHJlZS12aWV3OnJldmVhbC1hY3RpdmUtZmlsZScgfVxuIyAgICAgICAgIHsgJ2xhYmVsJzogJ1RvZ2dsZSBUcmVlIFNpZGUnLCAnY29tbWFuZCc6ICd0cmVlLXZpZXc6dG9nZ2xlLXNpZGUnIH1cbiMgICAgICAgXVxuIyAgICAgXVxuIyAgIH1cbiMgXVxuIyBgYGBcbiNcbiMgVXNlIGluIHlvdXIgcGFja2FnZSdzIG1lbnUgYC5jc29uYCBmaWxlIHJlcXVpcmVzIHRoYXQgeW91IHBsYWNlIHlvdXIgbWVudVxuIyBzdHJ1Y3R1cmUgdW5kZXIgYSBgbWVudWAga2V5LlxuI1xuIyBgYGBjb2ZmZWVcbiMgJ21lbnUnOiBbXG4jICAge1xuIyAgICAgJ2xhYmVsJzogJ1ZpZXcnXG4jICAgICAnc3VibWVudSc6IFtcbiMgICAgICAgeyAnbGFiZWwnOiAnVG9nZ2xlIFRyZWUgVmlldycsICdjb21tYW5kJzogJ3RyZWUtdmlldzp0b2dnbGUnIH1cbiMgICAgIF1cbiMgICB9XG4jIF1cbiMgYGBgXG4jXG4jIFNlZSB7OjphZGR9IGZvciBtb3JlIGluZm8gYWJvdXQgYWRkaW5nIG1lbnUncyBkaXJlY3RseS5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIE1lbnVNYW5hZ2VyXG4gIGNvbnN0cnVjdG9yOiAoe0ByZXNvdXJjZVBhdGgsIEBrZXltYXBNYW5hZ2VyLCBAcGFja2FnZU1hbmFnZXJ9KSAtPlxuICAgIEBpbml0aWFsaXplZCA9IGZhbHNlXG4gICAgQHBlbmRpbmdVcGRhdGVPcGVyYXRpb24gPSBudWxsXG4gICAgQHRlbXBsYXRlID0gW11cbiAgICBAa2V5bWFwTWFuYWdlci5vbkRpZExvYWRCdW5kbGVkS2V5bWFwcyA9PiBAbG9hZFBsYXRmb3JtSXRlbXMoKVxuICAgIEBwYWNrYWdlTWFuYWdlci5vbkRpZEFjdGl2YXRlSW5pdGlhbFBhY2thZ2VzID0+IEBzb3J0UGFja2FnZXNNZW51KClcblxuICBpbml0aWFsaXplOiAoe0ByZXNvdXJjZVBhdGh9KSAtPlxuICAgIEBrZXltYXBNYW5hZ2VyLm9uRGlkUmVsb2FkS2V5bWFwID0+IEB1cGRhdGUoKVxuICAgIEB1cGRhdGUoKVxuICAgIEBpbml0aWFsaXplZCA9IHRydWVcblxuICAjIFB1YmxpYzogQWRkcyB0aGUgZ2l2ZW4gaXRlbXMgdG8gdGhlIGFwcGxpY2F0aW9uIG1lbnUuXG4gICNcbiAgIyAjIyBFeGFtcGxlc1xuICAjIGBgYGNvZmZlZVxuICAjICAgYXRvbS5tZW51LmFkZCBbXG4gICMgICAgIHtcbiAgIyAgICAgICBsYWJlbDogJ0hlbGxvJ1xuICAjICAgICAgIHN1Ym1lbnUgOiBbe2xhYmVsOiAnV29ybGQhJywgY29tbWFuZDogJ2hlbGxvOndvcmxkJ31dXG4gICMgICAgIH1cbiAgIyAgIF1cbiAgIyBgYGBcbiAgI1xuICAjICogYGl0ZW1zYCBBbiB7QXJyYXl9IG9mIG1lbnUgaXRlbSB7T2JqZWN0fXMgY29udGFpbmluZyB0aGUga2V5czpcbiAgIyAgICogYGxhYmVsYCBUaGUge1N0cmluZ30gbWVudSBsYWJlbC5cbiAgIyAgICogYHN1Ym1lbnVgIEFuIG9wdGlvbmFsIHtBcnJheX0gb2Ygc3ViIG1lbnUgaXRlbXMuXG4gICMgICAqIGBjb21tYW5kYCBBbiBvcHRpb25hbCB7U3RyaW5nfSBjb21tYW5kIHRvIHRyaWdnZXIgd2hlbiB0aGUgaXRlbSBpc1xuICAjICAgICBjbGlja2VkLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byByZW1vdmUgdGhlXG4gICMgYWRkZWQgbWVudSBpdGVtcy5cbiAgYWRkOiAoaXRlbXMpIC0+XG4gICAgaXRlbXMgPSBfLmRlZXBDbG9uZShpdGVtcylcbiAgICBAbWVyZ2UoQHRlbXBsYXRlLCBpdGVtKSBmb3IgaXRlbSBpbiBpdGVtc1xuICAgIEB1cGRhdGUoKVxuICAgIG5ldyBEaXNwb3NhYmxlID0+IEByZW1vdmUoaXRlbXMpXG5cbiAgcmVtb3ZlOiAoaXRlbXMpIC0+XG4gICAgQHVubWVyZ2UoQHRlbXBsYXRlLCBpdGVtKSBmb3IgaXRlbSBpbiBpdGVtc1xuICAgIEB1cGRhdGUoKVxuXG4gIGNsZWFyOiAtPlxuICAgIEB0ZW1wbGF0ZSA9IFtdXG4gICAgQHVwZGF0ZSgpXG5cbiAgIyBTaG91bGQgdGhlIGJpbmRpbmcgZm9yIHRoZSBnaXZlbiBzZWxlY3RvciBiZSBpbmNsdWRlZCBpbiB0aGUgbWVudVxuICAjIGNvbW1hbmRzLlxuICAjXG4gICMgKiBgc2VsZWN0b3JgIEEge1N0cmluZ30gc2VsZWN0b3IgdG8gY2hlY2suXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LCB0cnVlIHRvIGluY2x1ZGUgdGhlIHNlbGVjdG9yLCBmYWxzZSBvdGhlcndpc2UuXG4gIGluY2x1ZGVTZWxlY3RvcjogKHNlbGVjdG9yKSAtPlxuICAgIHRyeVxuICAgICAgcmV0dXJuIHRydWUgaWYgZG9jdW1lbnQuYm9keS53ZWJraXRNYXRjaGVzU2VsZWN0b3Ioc2VsZWN0b3IpXG4gICAgY2F0Y2ggZXJyb3JcbiAgICAgICMgU2VsZWN0b3IgaXNuJ3QgdmFsaWRcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgIyBTaW11bGF0ZSBhbiBhdG9tLXRleHQtZWRpdG9yIGVsZW1lbnQgYXR0YWNoZWQgdG8gYSBhdG9tLXdvcmtzcGFjZSBlbGVtZW50IGF0dGFjaGVkXG4gICAgIyB0byBhIGJvZHkgZWxlbWVudCB0aGF0IGhhcyB0aGUgc2FtZSBjbGFzc2VzIGFzIHRoZSBjdXJyZW50IGJvZHkgZWxlbWVudC5cbiAgICB1bmxlc3MgQHRlc3RFZGl0b3I/XG4gICAgICAjIFVzZSBuZXcgZG9jdW1lbnQgc28gdGhhdCBjdXN0b20gZWxlbWVudHMgZG9uJ3QgYWN0dWFsbHkgZ2V0IGNyZWF0ZWRcbiAgICAgIHRlc3REb2N1bWVudCA9IGRvY3VtZW50LmltcGxlbWVudGF0aW9uLmNyZWF0ZURvY3VtZW50KGRvY3VtZW50Lm5hbWVzcGFjZVVSSSwgJ2h0bWwnKVxuXG4gICAgICB0ZXN0Qm9keSA9IHRlc3REb2N1bWVudC5jcmVhdGVFbGVtZW50KCdib2R5JylcbiAgICAgIHRlc3RCb2R5LmNsYXNzTGlzdC5hZGQoQGNsYXNzZXNGb3JFbGVtZW50KGRvY3VtZW50LmJvZHkpLi4uKVxuXG4gICAgICB0ZXN0V29ya3NwYWNlID0gdGVzdERvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2F0b20td29ya3NwYWNlJylcbiAgICAgIHdvcmtzcGFjZUNsYXNzZXMgPSBAY2xhc3Nlc0ZvckVsZW1lbnQoZG9jdW1lbnQuYm9keS5xdWVyeVNlbGVjdG9yKCdhdG9tLXdvcmtzcGFjZScpKVxuICAgICAgd29ya3NwYWNlQ2xhc3NlcyA9IFsnd29ya3NwYWNlJ10gaWYgd29ya3NwYWNlQ2xhc3Nlcy5sZW5ndGggaXMgMFxuICAgICAgdGVzdFdvcmtzcGFjZS5jbGFzc0xpc3QuYWRkKHdvcmtzcGFjZUNsYXNzZXMuLi4pXG5cbiAgICAgIHRlc3RCb2R5LmFwcGVuZENoaWxkKHRlc3RXb3Jrc3BhY2UpXG5cbiAgICAgIEB0ZXN0RWRpdG9yID0gdGVzdERvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2F0b20tdGV4dC1lZGl0b3InKVxuICAgICAgQHRlc3RFZGl0b3IuY2xhc3NMaXN0LmFkZCgnZWRpdG9yJylcbiAgICAgIHRlc3RXb3Jrc3BhY2UuYXBwZW5kQ2hpbGQoQHRlc3RFZGl0b3IpXG5cbiAgICBlbGVtZW50ID0gQHRlc3RFZGl0b3JcbiAgICB3aGlsZSBlbGVtZW50XG4gICAgICByZXR1cm4gdHJ1ZSBpZiBlbGVtZW50LndlYmtpdE1hdGNoZXNTZWxlY3RvcihzZWxlY3RvcilcbiAgICAgIGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudEVsZW1lbnRcblxuICAgIGZhbHNlXG5cbiAgIyBQdWJsaWM6IFJlZnJlc2hlcyB0aGUgY3VycmVudGx5IHZpc2libGUgbWVudS5cbiAgdXBkYXRlOiAtPlxuICAgIHJldHVybiB1bmxlc3MgQGluaXRpYWxpemVkXG5cbiAgICBjbGVhckltbWVkaWF0ZShAcGVuZGluZ1VwZGF0ZU9wZXJhdGlvbikgaWYgQHBlbmRpbmdVcGRhdGVPcGVyYXRpb24/XG5cbiAgICBAcGVuZGluZ1VwZGF0ZU9wZXJhdGlvbiA9IHNldEltbWVkaWF0ZSA9PlxuICAgICAgdW5zZXRLZXlzdHJva2VzID0gbmV3IFNldFxuICAgICAgZm9yIGJpbmRpbmcgaW4gQGtleW1hcE1hbmFnZXIuZ2V0S2V5QmluZGluZ3MoKVxuICAgICAgICBpZiBiaW5kaW5nLmNvbW1hbmQgaXMgJ3Vuc2V0ISdcbiAgICAgICAgICB1bnNldEtleXN0cm9rZXMuYWRkKGJpbmRpbmcua2V5c3Ryb2tlcylcblxuICAgICAga2V5c3Ryb2tlc0J5Q29tbWFuZCA9IHt9XG4gICAgICBmb3IgYmluZGluZyBpbiBAa2V5bWFwTWFuYWdlci5nZXRLZXlCaW5kaW5ncygpXG4gICAgICAgIGNvbnRpbnVlIHVubGVzcyBAaW5jbHVkZVNlbGVjdG9yKGJpbmRpbmcuc2VsZWN0b3IpXG4gICAgICAgIGNvbnRpbnVlIGlmIHVuc2V0S2V5c3Ryb2tlcy5oYXMoYmluZGluZy5rZXlzdHJva2VzKVxuICAgICAgICBjb250aW51ZSBpZiBiaW5kaW5nLmtleXN0cm9rZXMuaW5jbHVkZXMoJyAnKVxuICAgICAgICBjb250aW51ZSBpZiBwcm9jZXNzLnBsYXRmb3JtIGlzICdkYXJ3aW4nIGFuZCAvXmFsdC0oc2hpZnQtKT8uJC8udGVzdChiaW5kaW5nLmtleXN0cm9rZXMpXG4gICAgICAgIGNvbnRpbnVlIGlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ3dpbjMyJyBhbmQgL15jdHJsLWFsdC0oc2hpZnQtKT8uJC8udGVzdChiaW5kaW5nLmtleXN0cm9rZXMpXG4gICAgICAgIGtleXN0cm9rZXNCeUNvbW1hbmRbYmluZGluZy5jb21tYW5kXSA/PSBbXVxuICAgICAgICBrZXlzdHJva2VzQnlDb21tYW5kW2JpbmRpbmcuY29tbWFuZF0udW5zaGlmdCBiaW5kaW5nLmtleXN0cm9rZXNcblxuICAgICAgQHNlbmRUb0Jyb3dzZXJQcm9jZXNzKEB0ZW1wbGF0ZSwga2V5c3Ryb2tlc0J5Q29tbWFuZClcblxuICBsb2FkUGxhdGZvcm1JdGVtczogLT5cbiAgICBpZiBwbGF0Zm9ybU1lbnU/XG4gICAgICBAYWRkKHBsYXRmb3JtTWVudSlcbiAgICBlbHNlXG4gICAgICBtZW51c0RpclBhdGggPSBwYXRoLmpvaW4oQHJlc291cmNlUGF0aCwgJ21lbnVzJylcbiAgICAgIHBsYXRmb3JtTWVudVBhdGggPSBmcy5yZXNvbHZlKG1lbnVzRGlyUGF0aCwgcHJvY2Vzcy5wbGF0Zm9ybSwgWydjc29uJywgJ2pzb24nXSlcbiAgICAgIHttZW51fSA9IENTT04ucmVhZEZpbGVTeW5jKHBsYXRmb3JtTWVudVBhdGgpXG4gICAgICBAYWRkKG1lbnUpXG5cbiAgIyBNZXJnZXMgYW4gaXRlbSBpbiBhIHN1Ym1lbnUgYXdhcmUgd2F5IHN1Y2ggdGhhdCBuZXcgaXRlbXMgYXJlIGFsd2F5c1xuICAjIGFwcGVuZGVkIHRvIHRoZSBib3R0b20gb2YgZXhpc3RpbmcgbWVudXMgd2hlcmUgcG9zc2libGUuXG4gIG1lcmdlOiAobWVudSwgaXRlbSkgLT5cbiAgICBNZW51SGVscGVycy5tZXJnZShtZW51LCBpdGVtKVxuXG4gIHVubWVyZ2U6IChtZW51LCBpdGVtKSAtPlxuICAgIE1lbnVIZWxwZXJzLnVubWVyZ2UobWVudSwgaXRlbSlcblxuICBzZW5kVG9Ccm93c2VyUHJvY2VzczogKHRlbXBsYXRlLCBrZXlzdHJva2VzQnlDb21tYW5kKSAtPlxuICAgIGlwY1JlbmRlcmVyLnNlbmQgJ3VwZGF0ZS1hcHBsaWNhdGlvbi1tZW51JywgdGVtcGxhdGUsIGtleXN0cm9rZXNCeUNvbW1hbmRcblxuICAjIEdldCBhbiB7QXJyYXl9IG9mIHtTdHJpbmd9IGNsYXNzZXMgZm9yIHRoZSBnaXZlbiBlbGVtZW50LlxuICBjbGFzc2VzRm9yRWxlbWVudDogKGVsZW1lbnQpIC0+XG4gICAgaWYgY2xhc3NMaXN0ID0gZWxlbWVudD8uY2xhc3NMaXN0XG4gICAgICBBcnJheTo6c2xpY2UuYXBwbHkoY2xhc3NMaXN0KVxuICAgIGVsc2VcbiAgICAgIFtdXG5cbiAgc29ydFBhY2thZ2VzTWVudTogLT5cbiAgICBwYWNrYWdlc01lbnUgPSBfLmZpbmQgQHRlbXBsYXRlLCAoe2xhYmVsfSkgLT4gTWVudUhlbHBlcnMubm9ybWFsaXplTGFiZWwobGFiZWwpIGlzICdQYWNrYWdlcydcbiAgICByZXR1cm4gdW5sZXNzIHBhY2thZ2VzTWVudT8uc3VibWVudT9cblxuICAgIHBhY2thZ2VzTWVudS5zdWJtZW51LnNvcnQgKGl0ZW0xLCBpdGVtMikgLT5cbiAgICAgIGlmIGl0ZW0xLmxhYmVsIGFuZCBpdGVtMi5sYWJlbFxuICAgICAgICBNZW51SGVscGVycy5ub3JtYWxpemVMYWJlbChpdGVtMS5sYWJlbCkubG9jYWxlQ29tcGFyZShNZW51SGVscGVycy5ub3JtYWxpemVMYWJlbChpdGVtMi5sYWJlbCkpXG4gICAgICBlbHNlXG4gICAgICAgIDBcbiAgICBAdXBkYXRlKClcbiJdfQ==
