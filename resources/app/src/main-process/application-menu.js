(function() {
  var ApplicationMenu, Menu, _, app, ref;

  ref = require('electron'), app = ref.app, Menu = ref.Menu;

  _ = require('underscore-plus');

  module.exports = ApplicationMenu = (function() {
    function ApplicationMenu(version, autoUpdateManager) {
      this.version = version;
      this.autoUpdateManager = autoUpdateManager;
      this.windowTemplates = new WeakMap();
      this.setActiveTemplate(this.getDefaultTemplate());
      this.autoUpdateManager.on('state-changed', (function(_this) {
        return function(state) {
          return _this.showUpdateMenuItem(state);
        };
      })(this));
    }

    ApplicationMenu.prototype.update = function(window, template, keystrokesByCommand) {
      this.translateTemplate(template, keystrokesByCommand);
      this.substituteVersion(template);
      this.windowTemplates.set(window, template);
      if (window === this.lastFocusedWindow) {
        return this.setActiveTemplate(template);
      }
    };

    ApplicationMenu.prototype.setActiveTemplate = function(template) {
      if (!_.isEqual(template, this.activeTemplate)) {
        this.activeTemplate = template;
        this.menu = Menu.buildFromTemplate(_.deepClone(template));
        Menu.setApplicationMenu(this.menu);
      }
      return this.showUpdateMenuItem(this.autoUpdateManager.getState());
    };

    ApplicationMenu.prototype.addWindow = function(window) {
      var focusHandler;
      if (this.lastFocusedWindow == null) {
        this.lastFocusedWindow = window;
      }
      focusHandler = (function(_this) {
        return function() {
          var template;
          _this.lastFocusedWindow = window;
          if (template = _this.windowTemplates.get(window)) {
            return _this.setActiveTemplate(template);
          }
        };
      })(this);
      window.on('focus', focusHandler);
      window.once('closed', (function(_this) {
        return function() {
          if (window === _this.lastFocusedWindow) {
            _this.lastFocusedWindow = null;
          }
          _this.windowTemplates["delete"](window);
          return window.removeListener('focus', focusHandler);
        };
      })(this));
      return this.enableWindowSpecificItems(true);
    };

    ApplicationMenu.prototype.flattenMenuItems = function(menu) {
      var index, item, items, ref1;
      items = [];
      ref1 = menu.items || {};
      for (index in ref1) {
        item = ref1[index];
        items.push(item);
        if (item.submenu) {
          items = items.concat(this.flattenMenuItems(item.submenu));
        }
      }
      return items;
    };

    ApplicationMenu.prototype.flattenMenuTemplate = function(template) {
      var i, item, items, len;
      items = [];
      for (i = 0, len = template.length; i < len; i++) {
        item = template[i];
        items.push(item);
        if (item.submenu) {
          items = items.concat(this.flattenMenuTemplate(item.submenu));
        }
      }
      return items;
    };

    ApplicationMenu.prototype.enableWindowSpecificItems = function(enable) {
      var i, item, len, ref1, ref2;
      ref1 = this.flattenMenuItems(this.menu);
      for (i = 0, len = ref1.length; i < len; i++) {
        item = ref1[i];
        if ((ref2 = item.metadata) != null ? ref2.windowSpecific : void 0) {
          item.enabled = enable;
        }
      }
    };

    ApplicationMenu.prototype.substituteVersion = function(template) {
      var item;
      if ((item = _.find(this.flattenMenuTemplate(template), function(arg) {
        var label;
        label = arg.label;
        return label === 'VERSION';
      }))) {
        return item.label = "Version " + this.version;
      }
    };

    ApplicationMenu.prototype.showUpdateMenuItem = function(state) {
      var checkForUpdateItem, checkingForUpdateItem, downloadingUpdateItem, installUpdateItem;
      checkForUpdateItem = _.find(this.flattenMenuItems(this.menu), function(arg) {
        var label;
        label = arg.label;
        return label === 'Check for Update';
      });
      checkingForUpdateItem = _.find(this.flattenMenuItems(this.menu), function(arg) {
        var label;
        label = arg.label;
        return label === 'Checking for Update';
      });
      downloadingUpdateItem = _.find(this.flattenMenuItems(this.menu), function(arg) {
        var label;
        label = arg.label;
        return label === 'Downloading Update';
      });
      installUpdateItem = _.find(this.flattenMenuItems(this.menu), function(arg) {
        var label;
        label = arg.label;
        return label === 'Restart and Install Update';
      });
      if (!((checkForUpdateItem != null) && (checkingForUpdateItem != null) && (downloadingUpdateItem != null) && (installUpdateItem != null))) {
        return;
      }
      checkForUpdateItem.visible = false;
      checkingForUpdateItem.visible = false;
      downloadingUpdateItem.visible = false;
      installUpdateItem.visible = false;
      switch (state) {
        case 'idle':
        case 'error':
        case 'no-update-available':
          return checkForUpdateItem.visible = true;
        case 'checking':
          return checkingForUpdateItem.visible = true;
        case 'downloading':
          return downloadingUpdateItem.visible = true;
        case 'update-available':
          return installUpdateItem.visible = true;
      }
    };

    ApplicationMenu.prototype.getDefaultTemplate = function() {
      return [
        {
          label: "Atom",
          submenu: [
            {
              label: "Check for Update",
              metadata: {
                autoUpdate: true
              }
            }, {
              label: 'Reload',
              accelerator: 'Command+R',
              click: (function(_this) {
                return function() {
                  var ref1;
                  return (ref1 = _this.focusedWindow()) != null ? ref1.reload() : void 0;
                };
              })(this)
            }, {
              label: 'Close Window',
              accelerator: 'Command+Shift+W',
              click: (function(_this) {
                return function() {
                  var ref1;
                  return (ref1 = _this.focusedWindow()) != null ? ref1.close() : void 0;
                };
              })(this)
            }, {
              label: 'Toggle Dev Tools',
              accelerator: 'Command+Alt+I',
              click: (function(_this) {
                return function() {
                  var ref1;
                  return (ref1 = _this.focusedWindow()) != null ? ref1.toggleDevTools() : void 0;
                };
              })(this)
            }, {
              label: 'Quit',
              accelerator: 'Command+Q',
              click: function() {
                return app.quit();
              }
            }
          ]
        }
      ];
    };

    ApplicationMenu.prototype.focusedWindow = function() {
      return _.find(global.atomApplication.windows, function(atomWindow) {
        return atomWindow.isFocused();
      });
    };

    ApplicationMenu.prototype.translateTemplate = function(template, keystrokesByCommand) {
      template.forEach((function(_this) {
        return function(item) {
          if (item.metadata == null) {
            item.metadata = {};
          }
          if (item.command) {
            item.accelerator = _this.acceleratorForCommand(item.command, keystrokesByCommand);
            item.click = function() {
              return global.atomApplication.sendCommand(item.command, item.commandDetail);
            };
            if (!/^application:/.test(item.command, item.commandDetail)) {
              item.metadata.windowSpecific = true;
            }
          }
          if (item.submenu) {
            return _this.translateTemplate(item.submenu, keystrokesByCommand);
          }
        };
      })(this));
      return template;
    };

    ApplicationMenu.prototype.acceleratorForCommand = function(command, keystrokesByCommand) {
      var firstKeystroke, key, keys, modifiers, ref1;
      firstKeystroke = (ref1 = keystrokesByCommand[command]) != null ? ref1[0] : void 0;
      if (!firstKeystroke) {
        return null;
      }
      modifiers = firstKeystroke.split(/-(?=.)/);
      key = modifiers.pop().toUpperCase().replace('+', 'Plus');
      modifiers = modifiers.map(function(modifier) {
        return modifier.replace(/shift/ig, "Shift").replace(/cmd/ig, "Command").replace(/ctrl/ig, "Ctrl").replace(/alt/ig, "Alt");
      });
      keys = modifiers.concat([key]);
      return keys.join("+");
    };

    return ApplicationMenu;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21haW4tcHJvY2Vzcy9hcHBsaWNhdGlvbi1tZW51LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsTUFBYyxPQUFBLENBQVEsVUFBUixDQUFkLEVBQUMsYUFBRCxFQUFNOztFQUNOLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBTUosTUFBTSxDQUFDLE9BQVAsR0FDTTtJQUNTLHlCQUFDLE9BQUQsRUFBVyxpQkFBWDtNQUFDLElBQUMsQ0FBQSxVQUFEO01BQVUsSUFBQyxDQUFBLG9CQUFEO01BQ3RCLElBQUMsQ0FBQSxlQUFELEdBQXVCLElBQUEsT0FBQSxDQUFBO01BQ3ZCLElBQUMsQ0FBQSxpQkFBRCxDQUFtQixJQUFDLENBQUEsa0JBQUQsQ0FBQSxDQUFuQjtNQUNBLElBQUMsQ0FBQSxpQkFBaUIsQ0FBQyxFQUFuQixDQUFzQixlQUF0QixFQUF1QyxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsS0FBRDtpQkFBVyxLQUFDLENBQUEsa0JBQUQsQ0FBb0IsS0FBcEI7UUFBWDtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdkM7SUFIVzs7OEJBV2IsTUFBQSxHQUFRLFNBQUMsTUFBRCxFQUFTLFFBQVQsRUFBbUIsbUJBQW5CO01BQ04sSUFBQyxDQUFBLGlCQUFELENBQW1CLFFBQW5CLEVBQTZCLG1CQUE3QjtNQUNBLElBQUMsQ0FBQSxpQkFBRCxDQUFtQixRQUFuQjtNQUNBLElBQUMsQ0FBQSxlQUFlLENBQUMsR0FBakIsQ0FBcUIsTUFBckIsRUFBNkIsUUFBN0I7TUFDQSxJQUFnQyxNQUFBLEtBQVUsSUFBQyxDQUFBLGlCQUEzQztlQUFBLElBQUMsQ0FBQSxpQkFBRCxDQUFtQixRQUFuQixFQUFBOztJQUpNOzs4QkFNUixpQkFBQSxHQUFtQixTQUFDLFFBQUQ7TUFDakIsSUFBQSxDQUFPLENBQUMsQ0FBQyxPQUFGLENBQVUsUUFBVixFQUFvQixJQUFDLENBQUEsY0FBckIsQ0FBUDtRQUNFLElBQUMsQ0FBQSxjQUFELEdBQWtCO1FBQ2xCLElBQUMsQ0FBQSxJQUFELEdBQVEsSUFBSSxDQUFDLGlCQUFMLENBQXVCLENBQUMsQ0FBQyxTQUFGLENBQVksUUFBWixDQUF2QjtRQUNSLElBQUksQ0FBQyxrQkFBTCxDQUF3QixJQUFDLENBQUEsSUFBekIsRUFIRjs7YUFLQSxJQUFDLENBQUEsa0JBQUQsQ0FBb0IsSUFBQyxDQUFBLGlCQUFpQixDQUFDLFFBQW5CLENBQUEsQ0FBcEI7SUFOaUI7OzhCQVNuQixTQUFBLEdBQVcsU0FBQyxNQUFEO0FBQ1QsVUFBQTs7UUFBQSxJQUFDLENBQUEsb0JBQXFCOztNQUV0QixZQUFBLEdBQWUsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO0FBQ2IsY0FBQTtVQUFBLEtBQUMsQ0FBQSxpQkFBRCxHQUFxQjtVQUNyQixJQUFHLFFBQUEsR0FBVyxLQUFDLENBQUEsZUFBZSxDQUFDLEdBQWpCLENBQXFCLE1BQXJCLENBQWQ7bUJBQ0UsS0FBQyxDQUFBLGlCQUFELENBQW1CLFFBQW5CLEVBREY7O1FBRmE7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO01BS2YsTUFBTSxDQUFDLEVBQVAsQ0FBVSxPQUFWLEVBQW1CLFlBQW5CO01BQ0EsTUFBTSxDQUFDLElBQVAsQ0FBWSxRQUFaLEVBQXNCLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtVQUNwQixJQUE2QixNQUFBLEtBQVUsS0FBQyxDQUFBLGlCQUF4QztZQUFBLEtBQUMsQ0FBQSxpQkFBRCxHQUFxQixLQUFyQjs7VUFDQSxLQUFDLENBQUEsZUFBZSxFQUFDLE1BQUQsRUFBaEIsQ0FBd0IsTUFBeEI7aUJBQ0EsTUFBTSxDQUFDLGNBQVAsQ0FBc0IsT0FBdEIsRUFBK0IsWUFBL0I7UUFIb0I7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXRCO2FBS0EsSUFBQyxDQUFBLHlCQUFELENBQTJCLElBQTNCO0lBZFM7OzhCQXFCWCxnQkFBQSxHQUFrQixTQUFDLElBQUQ7QUFDaEIsVUFBQTtNQUFBLEtBQUEsR0FBUTtBQUNSO0FBQUEsV0FBQSxhQUFBOztRQUNFLEtBQUssQ0FBQyxJQUFOLENBQVcsSUFBWDtRQUNBLElBQXlELElBQUksQ0FBQyxPQUE5RDtVQUFBLEtBQUEsR0FBUSxLQUFLLENBQUMsTUFBTixDQUFhLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixJQUFJLENBQUMsT0FBdkIsQ0FBYixFQUFSOztBQUZGO2FBR0E7SUFMZ0I7OzhCQVlsQixtQkFBQSxHQUFxQixTQUFDLFFBQUQ7QUFDbkIsVUFBQTtNQUFBLEtBQUEsR0FBUTtBQUNSLFdBQUEsMENBQUE7O1FBQ0UsS0FBSyxDQUFDLElBQU4sQ0FBVyxJQUFYO1FBQ0EsSUFBNEQsSUFBSSxDQUFDLE9BQWpFO1VBQUEsS0FBQSxHQUFRLEtBQUssQ0FBQyxNQUFOLENBQWEsSUFBQyxDQUFBLG1CQUFELENBQXFCLElBQUksQ0FBQyxPQUExQixDQUFiLEVBQVI7O0FBRkY7YUFHQTtJQUxtQjs7OEJBV3JCLHlCQUFBLEdBQTJCLFNBQUMsTUFBRDtBQUN6QixVQUFBO0FBQUE7QUFBQSxXQUFBLHNDQUFBOztRQUNFLHlDQUFzQyxDQUFFLHVCQUF4QztVQUFBLElBQUksQ0FBQyxPQUFMLEdBQWUsT0FBZjs7QUFERjtJQUR5Qjs7OEJBTTNCLGlCQUFBLEdBQW1CLFNBQUMsUUFBRDtBQUNqQixVQUFBO01BQUEsSUFBRyxDQUFDLElBQUEsR0FBTyxDQUFDLENBQUMsSUFBRixDQUFPLElBQUMsQ0FBQSxtQkFBRCxDQUFxQixRQUFyQixDQUFQLEVBQXVDLFNBQUMsR0FBRDtBQUFhLFlBQUE7UUFBWCxRQUFEO2VBQVksS0FBQSxLQUFTO01BQXRCLENBQXZDLENBQVIsQ0FBSDtlQUNFLElBQUksQ0FBQyxLQUFMLEdBQWEsVUFBQSxHQUFXLElBQUMsQ0FBQSxRQUQzQjs7SUFEaUI7OzhCQUtuQixrQkFBQSxHQUFvQixTQUFDLEtBQUQ7QUFDbEIsVUFBQTtNQUFBLGtCQUFBLEdBQXFCLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBQyxDQUFBLGdCQUFELENBQWtCLElBQUMsQ0FBQSxJQUFuQixDQUFQLEVBQWlDLFNBQUMsR0FBRDtBQUFhLFlBQUE7UUFBWCxRQUFEO2VBQVksS0FBQSxLQUFTO01BQXRCLENBQWpDO01BQ3JCLHFCQUFBLEdBQXdCLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBQyxDQUFBLGdCQUFELENBQWtCLElBQUMsQ0FBQSxJQUFuQixDQUFQLEVBQWlDLFNBQUMsR0FBRDtBQUFhLFlBQUE7UUFBWCxRQUFEO2VBQVksS0FBQSxLQUFTO01BQXRCLENBQWpDO01BQ3hCLHFCQUFBLEdBQXdCLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBQyxDQUFBLGdCQUFELENBQWtCLElBQUMsQ0FBQSxJQUFuQixDQUFQLEVBQWlDLFNBQUMsR0FBRDtBQUFhLFlBQUE7UUFBWCxRQUFEO2VBQVksS0FBQSxLQUFTO01BQXRCLENBQWpDO01BQ3hCLGlCQUFBLEdBQW9CLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBQyxDQUFBLGdCQUFELENBQWtCLElBQUMsQ0FBQSxJQUFuQixDQUFQLEVBQWlDLFNBQUMsR0FBRDtBQUFhLFlBQUE7UUFBWCxRQUFEO2VBQVksS0FBQSxLQUFTO01BQXRCLENBQWpDO01BRXBCLElBQUEsQ0FBQSxDQUFjLDRCQUFBLElBQXdCLCtCQUF4QixJQUFtRCwrQkFBbkQsSUFBOEUsMkJBQTVGLENBQUE7QUFBQSxlQUFBOztNQUVBLGtCQUFrQixDQUFDLE9BQW5CLEdBQTZCO01BQzdCLHFCQUFxQixDQUFDLE9BQXRCLEdBQWdDO01BQ2hDLHFCQUFxQixDQUFDLE9BQXRCLEdBQWdDO01BQ2hDLGlCQUFpQixDQUFDLE9BQWxCLEdBQTRCO0FBRTVCLGNBQU8sS0FBUDtBQUFBLGFBQ08sTUFEUDtBQUFBLGFBQ2UsT0FEZjtBQUFBLGFBQ3dCLHFCQUR4QjtpQkFFSSxrQkFBa0IsQ0FBQyxPQUFuQixHQUE2QjtBQUZqQyxhQUdPLFVBSFA7aUJBSUkscUJBQXFCLENBQUMsT0FBdEIsR0FBZ0M7QUFKcEMsYUFLTyxhQUxQO2lCQU1JLHFCQUFxQixDQUFDLE9BQXRCLEdBQWdDO0FBTnBDLGFBT08sa0JBUFA7aUJBUUksaUJBQWlCLENBQUMsT0FBbEIsR0FBNEI7QUFSaEM7SUFia0I7OzhCQTBCcEIsa0JBQUEsR0FBb0IsU0FBQTthQUNsQjtRQUNFO1VBQUEsS0FBQSxFQUFPLE1BQVA7VUFDQSxPQUFBLEVBQVM7WUFDTDtjQUFDLEtBQUEsRUFBTyxrQkFBUjtjQUE0QixRQUFBLEVBQVU7Z0JBQUMsVUFBQSxFQUFZLElBQWI7ZUFBdEM7YUFESyxFQUVMO2NBQUMsS0FBQSxFQUFPLFFBQVI7Y0FBa0IsV0FBQSxFQUFhLFdBQS9CO2NBQTRDLEtBQUEsRUFBTyxDQUFBLFNBQUEsS0FBQTt1QkFBQSxTQUFBO0FBQUcsc0JBQUE7c0VBQWdCLENBQUUsTUFBbEIsQ0FBQTtnQkFBSDtjQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBbkQ7YUFGSyxFQUdMO2NBQUMsS0FBQSxFQUFPLGNBQVI7Y0FBd0IsV0FBQSxFQUFhLGlCQUFyQztjQUF3RCxLQUFBLEVBQU8sQ0FBQSxTQUFBLEtBQUE7dUJBQUEsU0FBQTtBQUFHLHNCQUFBO3NFQUFnQixDQUFFLEtBQWxCLENBQUE7Z0JBQUg7Y0FBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQS9EO2FBSEssRUFJTDtjQUFDLEtBQUEsRUFBTyxrQkFBUjtjQUE0QixXQUFBLEVBQWEsZUFBekM7Y0FBMEQsS0FBQSxFQUFPLENBQUEsU0FBQSxLQUFBO3VCQUFBLFNBQUE7QUFBRyxzQkFBQTtzRUFBZ0IsQ0FBRSxjQUFsQixDQUFBO2dCQUFIO2NBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFqRTthQUpLLEVBS0w7Y0FBQyxLQUFBLEVBQU8sTUFBUjtjQUFnQixXQUFBLEVBQWEsV0FBN0I7Y0FBMEMsS0FBQSxFQUFPLFNBQUE7dUJBQUcsR0FBRyxDQUFDLElBQUosQ0FBQTtjQUFILENBQWpEO2FBTEs7V0FEVDtTQURGOztJQURrQjs7OEJBWXBCLGFBQUEsR0FBZSxTQUFBO2FBQ2IsQ0FBQyxDQUFDLElBQUYsQ0FBTyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQTlCLEVBQXVDLFNBQUMsVUFBRDtlQUFnQixVQUFVLENBQUMsU0FBWCxDQUFBO01BQWhCLENBQXZDO0lBRGE7OzhCQVdmLGlCQUFBLEdBQW1CLFNBQUMsUUFBRCxFQUFXLG1CQUFYO01BQ2pCLFFBQVEsQ0FBQyxPQUFULENBQWlCLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxJQUFEOztZQUNmLElBQUksQ0FBQyxXQUFZOztVQUNqQixJQUFHLElBQUksQ0FBQyxPQUFSO1lBQ0UsSUFBSSxDQUFDLFdBQUwsR0FBbUIsS0FBQyxDQUFBLHFCQUFELENBQXVCLElBQUksQ0FBQyxPQUE1QixFQUFxQyxtQkFBckM7WUFDbkIsSUFBSSxDQUFDLEtBQUwsR0FBYSxTQUFBO3FCQUFHLE1BQU0sQ0FBQyxlQUFlLENBQUMsV0FBdkIsQ0FBbUMsSUFBSSxDQUFDLE9BQXhDLEVBQWlELElBQUksQ0FBQyxhQUF0RDtZQUFIO1lBQ2IsSUFBQSxDQUEyQyxlQUFlLENBQUMsSUFBaEIsQ0FBcUIsSUFBSSxDQUFDLE9BQTFCLEVBQW1DLElBQUksQ0FBQyxhQUF4QyxDQUEzQztjQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBZCxHQUErQixLQUEvQjthQUhGOztVQUlBLElBQXlELElBQUksQ0FBQyxPQUE5RDttQkFBQSxLQUFDLENBQUEsaUJBQUQsQ0FBbUIsSUFBSSxDQUFDLE9BQXhCLEVBQWlDLG1CQUFqQyxFQUFBOztRQU5lO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFqQjthQU9BO0lBUmlCOzs4QkFrQm5CLHFCQUFBLEdBQXVCLFNBQUMsT0FBRCxFQUFVLG1CQUFWO0FBQ3JCLFVBQUE7TUFBQSxjQUFBLHVEQUErQyxDQUFBLENBQUE7TUFDL0MsSUFBQSxDQUFtQixjQUFuQjtBQUFBLGVBQU8sS0FBUDs7TUFFQSxTQUFBLEdBQVksY0FBYyxDQUFDLEtBQWYsQ0FBcUIsUUFBckI7TUFDWixHQUFBLEdBQU0sU0FBUyxDQUFDLEdBQVYsQ0FBQSxDQUFlLENBQUMsV0FBaEIsQ0FBQSxDQUE2QixDQUFDLE9BQTlCLENBQXNDLEdBQXRDLEVBQTJDLE1BQTNDO01BRU4sU0FBQSxHQUFZLFNBQVMsQ0FBQyxHQUFWLENBQWMsU0FBQyxRQUFEO2VBQ3hCLFFBQVEsQ0FBQyxPQUFULENBQWlCLFNBQWpCLEVBQTRCLE9BQTVCLENBQ1EsQ0FBQyxPQURULENBQ2lCLE9BRGpCLEVBQzBCLFNBRDFCLENBRVEsQ0FBQyxPQUZULENBRWlCLFFBRmpCLEVBRTJCLE1BRjNCLENBR1EsQ0FBQyxPQUhULENBR2lCLE9BSGpCLEVBRzBCLEtBSDFCO01BRHdCLENBQWQ7TUFNWixJQUFBLEdBQU8sU0FBUyxDQUFDLE1BQVYsQ0FBaUIsQ0FBQyxHQUFELENBQWpCO2FBQ1AsSUFBSSxDQUFDLElBQUwsQ0FBVSxHQUFWO0lBZHFCOzs7OztBQTdKekIiLCJzb3VyY2VzQ29udGVudCI6WyJ7YXBwLCBNZW51fSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcblxuIyBVc2VkIHRvIG1hbmFnZSB0aGUgZ2xvYmFsIGFwcGxpY2F0aW9uIG1lbnUuXG4jXG4jIEl0J3MgY3JlYXRlZCBieSB7QXRvbUFwcGxpY2F0aW9ufSB1cG9uIGluc3RhbnRpYXRpb24gYW5kIHVzZWQgdG8gYWRkLCByZW1vdmVcbiMgYW5kIG1haW50YWluIHRoZSBzdGF0ZSBvZiBhbGwgbWVudSBpdGVtcy5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIEFwcGxpY2F0aW9uTWVudVxuICBjb25zdHJ1Y3RvcjogKEB2ZXJzaW9uLCBAYXV0b1VwZGF0ZU1hbmFnZXIpIC0+XG4gICAgQHdpbmRvd1RlbXBsYXRlcyA9IG5ldyBXZWFrTWFwKClcbiAgICBAc2V0QWN0aXZlVGVtcGxhdGUoQGdldERlZmF1bHRUZW1wbGF0ZSgpKVxuICAgIEBhdXRvVXBkYXRlTWFuYWdlci5vbiAnc3RhdGUtY2hhbmdlZCcsIChzdGF0ZSkgPT4gQHNob3dVcGRhdGVNZW51SXRlbShzdGF0ZSlcblxuICAjIFB1YmxpYzogVXBkYXRlcyB0aGUgZW50aXJlIG1lbnUgd2l0aCB0aGUgZ2l2ZW4ga2V5YmluZGluZ3MuXG4gICNcbiAgIyB3aW5kb3cgLSBUaGUgQnJvd3NlcldpbmRvdyB0aGlzIG1lbnUgdGVtcGxhdGUgaXMgYXNzb2NpYXRlZCB3aXRoLlxuICAjIHRlbXBsYXRlIC0gVGhlIE9iamVjdCB3aGljaCBkZXNjcmliZXMgdGhlIG1lbnUgdG8gZGlzcGxheS5cbiAgIyBrZXlzdHJva2VzQnlDb21tYW5kIC0gQW4gT2JqZWN0IHdoZXJlIHRoZSBrZXlzIGFyZSBjb21tYW5kcyBhbmQgdGhlIHZhbHVlc1xuICAjICAgICAgICAgICAgICAgICAgICAgICBhcmUgQXJyYXlzIGNvbnRhaW5pbmcgdGhlIGtleXN0cm9rZS5cbiAgdXBkYXRlOiAod2luZG93LCB0ZW1wbGF0ZSwga2V5c3Ryb2tlc0J5Q29tbWFuZCkgLT5cbiAgICBAdHJhbnNsYXRlVGVtcGxhdGUodGVtcGxhdGUsIGtleXN0cm9rZXNCeUNvbW1hbmQpXG4gICAgQHN1YnN0aXR1dGVWZXJzaW9uKHRlbXBsYXRlKVxuICAgIEB3aW5kb3dUZW1wbGF0ZXMuc2V0KHdpbmRvdywgdGVtcGxhdGUpXG4gICAgQHNldEFjdGl2ZVRlbXBsYXRlKHRlbXBsYXRlKSBpZiB3aW5kb3cgaXMgQGxhc3RGb2N1c2VkV2luZG93XG5cbiAgc2V0QWN0aXZlVGVtcGxhdGU6ICh0ZW1wbGF0ZSkgLT5cbiAgICB1bmxlc3MgXy5pc0VxdWFsKHRlbXBsYXRlLCBAYWN0aXZlVGVtcGxhdGUpXG4gICAgICBAYWN0aXZlVGVtcGxhdGUgPSB0ZW1wbGF0ZVxuICAgICAgQG1lbnUgPSBNZW51LmJ1aWxkRnJvbVRlbXBsYXRlKF8uZGVlcENsb25lKHRlbXBsYXRlKSlcbiAgICAgIE1lbnUuc2V0QXBwbGljYXRpb25NZW51KEBtZW51KVxuXG4gICAgQHNob3dVcGRhdGVNZW51SXRlbShAYXV0b1VwZGF0ZU1hbmFnZXIuZ2V0U3RhdGUoKSlcblxuICAjIFJlZ2lzdGVyIGEgQnJvd3NlcldpbmRvdyB3aXRoIHRoaXMgYXBwbGljYXRpb24gbWVudS5cbiAgYWRkV2luZG93OiAod2luZG93KSAtPlxuICAgIEBsYXN0Rm9jdXNlZFdpbmRvdyA/PSB3aW5kb3dcblxuICAgIGZvY3VzSGFuZGxlciA9ID0+XG4gICAgICBAbGFzdEZvY3VzZWRXaW5kb3cgPSB3aW5kb3dcbiAgICAgIGlmIHRlbXBsYXRlID0gQHdpbmRvd1RlbXBsYXRlcy5nZXQod2luZG93KVxuICAgICAgICBAc2V0QWN0aXZlVGVtcGxhdGUodGVtcGxhdGUpXG5cbiAgICB3aW5kb3cub24gJ2ZvY3VzJywgZm9jdXNIYW5kbGVyXG4gICAgd2luZG93Lm9uY2UgJ2Nsb3NlZCcsID0+XG4gICAgICBAbGFzdEZvY3VzZWRXaW5kb3cgPSBudWxsIGlmIHdpbmRvdyBpcyBAbGFzdEZvY3VzZWRXaW5kb3dcbiAgICAgIEB3aW5kb3dUZW1wbGF0ZXMuZGVsZXRlKHdpbmRvdylcbiAgICAgIHdpbmRvdy5yZW1vdmVMaXN0ZW5lciAnZm9jdXMnLCBmb2N1c0hhbmRsZXJcblxuICAgIEBlbmFibGVXaW5kb3dTcGVjaWZpY0l0ZW1zKHRydWUpXG5cbiAgIyBGbGF0dGVucyB0aGUgZ2l2ZW4gbWVudSBhbmQgc3VibWVudSBpdGVtcyBpbnRvIGFuIHNpbmdsZSBBcnJheS5cbiAgI1xuICAjIG1lbnUgLSBBIGNvbXBsZXRlIG1lbnUgY29uZmlndXJhdGlvbiBvYmplY3QgZm9yIGF0b20tc2hlbGwncyBtZW51IEFQSS5cbiAgI1xuICAjIFJldHVybnMgYW4gQXJyYXkgb2YgbmF0aXZlIG1lbnUgaXRlbXMuXG4gIGZsYXR0ZW5NZW51SXRlbXM6IChtZW51KSAtPlxuICAgIGl0ZW1zID0gW11cbiAgICBmb3IgaW5kZXgsIGl0ZW0gb2YgbWVudS5pdGVtcyBvciB7fVxuICAgICAgaXRlbXMucHVzaChpdGVtKVxuICAgICAgaXRlbXMgPSBpdGVtcy5jb25jYXQoQGZsYXR0ZW5NZW51SXRlbXMoaXRlbS5zdWJtZW51KSkgaWYgaXRlbS5zdWJtZW51XG4gICAgaXRlbXNcblxuICAjIEZsYXR0ZW5zIHRoZSBnaXZlbiBtZW51IHRlbXBsYXRlIGludG8gYW4gc2luZ2xlIEFycmF5LlxuICAjXG4gICMgdGVtcGxhdGUgLSBBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgbWVudSBpdGVtLlxuICAjXG4gICMgUmV0dXJucyBhbiBBcnJheSBvZiBuYXRpdmUgbWVudSBpdGVtcy5cbiAgZmxhdHRlbk1lbnVUZW1wbGF0ZTogKHRlbXBsYXRlKSAtPlxuICAgIGl0ZW1zID0gW11cbiAgICBmb3IgaXRlbSBpbiB0ZW1wbGF0ZVxuICAgICAgaXRlbXMucHVzaChpdGVtKVxuICAgICAgaXRlbXMgPSBpdGVtcy5jb25jYXQoQGZsYXR0ZW5NZW51VGVtcGxhdGUoaXRlbS5zdWJtZW51KSkgaWYgaXRlbS5zdWJtZW51XG4gICAgaXRlbXNcblxuICAjIFB1YmxpYzogVXNlZCB0byBtYWtlIGFsbCB3aW5kb3cgcmVsYXRlZCBtZW51IGl0ZW1zIGFyZSBhY3RpdmUuXG4gICNcbiAgIyBlbmFibGUgLSBJZiB0cnVlIGVuYWJsZXMgYWxsIHdpbmRvdyBzcGVjaWZpYyBpdGVtcywgaWYgZmFsc2UgZGlzYWJsZXMgYWxsXG4gICMgICAgICAgICAgd2luZG93IHNwZWNpZmljIGl0ZW1zLlxuICBlbmFibGVXaW5kb3dTcGVjaWZpY0l0ZW1zOiAoZW5hYmxlKSAtPlxuICAgIGZvciBpdGVtIGluIEBmbGF0dGVuTWVudUl0ZW1zKEBtZW51KVxuICAgICAgaXRlbS5lbmFibGVkID0gZW5hYmxlIGlmIGl0ZW0ubWV0YWRhdGE/LndpbmRvd1NwZWNpZmljXG4gICAgcmV0dXJuXG5cbiAgIyBSZXBsYWNlcyBWRVJTSU9OIHdpdGggdGhlIGN1cnJlbnQgdmVyc2lvbi5cbiAgc3Vic3RpdHV0ZVZlcnNpb246ICh0ZW1wbGF0ZSkgLT5cbiAgICBpZiAoaXRlbSA9IF8uZmluZChAZmxhdHRlbk1lbnVUZW1wbGF0ZSh0ZW1wbGF0ZSksICh7bGFiZWx9KSAtPiBsYWJlbCBpcyAnVkVSU0lPTicpKVxuICAgICAgaXRlbS5sYWJlbCA9IFwiVmVyc2lvbiAje0B2ZXJzaW9ufVwiXG5cbiAgIyBTZXRzIHRoZSBwcm9wZXIgdmlzaWJsZSBzdGF0ZSB0aGUgdXBkYXRlIG1lbnUgaXRlbXNcbiAgc2hvd1VwZGF0ZU1lbnVJdGVtOiAoc3RhdGUpIC0+XG4gICAgY2hlY2tGb3JVcGRhdGVJdGVtID0gXy5maW5kKEBmbGF0dGVuTWVudUl0ZW1zKEBtZW51KSwgKHtsYWJlbH0pIC0+IGxhYmVsIGlzICdDaGVjayBmb3IgVXBkYXRlJylcbiAgICBjaGVja2luZ0ZvclVwZGF0ZUl0ZW0gPSBfLmZpbmQoQGZsYXR0ZW5NZW51SXRlbXMoQG1lbnUpLCAoe2xhYmVsfSkgLT4gbGFiZWwgaXMgJ0NoZWNraW5nIGZvciBVcGRhdGUnKVxuICAgIGRvd25sb2FkaW5nVXBkYXRlSXRlbSA9IF8uZmluZChAZmxhdHRlbk1lbnVJdGVtcyhAbWVudSksICh7bGFiZWx9KSAtPiBsYWJlbCBpcyAnRG93bmxvYWRpbmcgVXBkYXRlJylcbiAgICBpbnN0YWxsVXBkYXRlSXRlbSA9IF8uZmluZChAZmxhdHRlbk1lbnVJdGVtcyhAbWVudSksICh7bGFiZWx9KSAtPiBsYWJlbCBpcyAnUmVzdGFydCBhbmQgSW5zdGFsbCBVcGRhdGUnKVxuXG4gICAgcmV0dXJuIHVubGVzcyBjaGVja0ZvclVwZGF0ZUl0ZW0/IGFuZCBjaGVja2luZ0ZvclVwZGF0ZUl0ZW0/IGFuZCBkb3dubG9hZGluZ1VwZGF0ZUl0ZW0/IGFuZCBpbnN0YWxsVXBkYXRlSXRlbT9cblxuICAgIGNoZWNrRm9yVXBkYXRlSXRlbS52aXNpYmxlID0gZmFsc2VcbiAgICBjaGVja2luZ0ZvclVwZGF0ZUl0ZW0udmlzaWJsZSA9IGZhbHNlXG4gICAgZG93bmxvYWRpbmdVcGRhdGVJdGVtLnZpc2libGUgPSBmYWxzZVxuICAgIGluc3RhbGxVcGRhdGVJdGVtLnZpc2libGUgPSBmYWxzZVxuXG4gICAgc3dpdGNoIHN0YXRlXG4gICAgICB3aGVuICdpZGxlJywgJ2Vycm9yJywgJ25vLXVwZGF0ZS1hdmFpbGFibGUnXG4gICAgICAgIGNoZWNrRm9yVXBkYXRlSXRlbS52aXNpYmxlID0gdHJ1ZVxuICAgICAgd2hlbiAnY2hlY2tpbmcnXG4gICAgICAgIGNoZWNraW5nRm9yVXBkYXRlSXRlbS52aXNpYmxlID0gdHJ1ZVxuICAgICAgd2hlbiAnZG93bmxvYWRpbmcnXG4gICAgICAgIGRvd25sb2FkaW5nVXBkYXRlSXRlbS52aXNpYmxlID0gdHJ1ZVxuICAgICAgd2hlbiAndXBkYXRlLWF2YWlsYWJsZSdcbiAgICAgICAgaW5zdGFsbFVwZGF0ZUl0ZW0udmlzaWJsZSA9IHRydWVcblxuICAjIERlZmF1bHQgbGlzdCBvZiBtZW51IGl0ZW1zLlxuICAjXG4gICMgUmV0dXJucyBhbiBBcnJheSBvZiBtZW51IGl0ZW0gT2JqZWN0cy5cbiAgZ2V0RGVmYXVsdFRlbXBsYXRlOiAtPlxuICAgIFtcbiAgICAgIGxhYmVsOiBcIkF0b21cIlxuICAgICAgc3VibWVudTogW1xuICAgICAgICAgIHtsYWJlbDogXCJDaGVjayBmb3IgVXBkYXRlXCIsIG1ldGFkYXRhOiB7YXV0b1VwZGF0ZTogdHJ1ZX19XG4gICAgICAgICAge2xhYmVsOiAnUmVsb2FkJywgYWNjZWxlcmF0b3I6ICdDb21tYW5kK1InLCBjbGljazogPT4gQGZvY3VzZWRXaW5kb3coKT8ucmVsb2FkKCl9XG4gICAgICAgICAge2xhYmVsOiAnQ2xvc2UgV2luZG93JywgYWNjZWxlcmF0b3I6ICdDb21tYW5kK1NoaWZ0K1cnLCBjbGljazogPT4gQGZvY3VzZWRXaW5kb3coKT8uY2xvc2UoKX1cbiAgICAgICAgICB7bGFiZWw6ICdUb2dnbGUgRGV2IFRvb2xzJywgYWNjZWxlcmF0b3I6ICdDb21tYW5kK0FsdCtJJywgY2xpY2s6ID0+IEBmb2N1c2VkV2luZG93KCk/LnRvZ2dsZURldlRvb2xzKCl9XG4gICAgICAgICAge2xhYmVsOiAnUXVpdCcsIGFjY2VsZXJhdG9yOiAnQ29tbWFuZCtRJywgY2xpY2s6IC0+IGFwcC5xdWl0KCl9XG4gICAgICBdXG4gICAgXVxuXG4gIGZvY3VzZWRXaW5kb3c6IC0+XG4gICAgXy5maW5kIGdsb2JhbC5hdG9tQXBwbGljYXRpb24ud2luZG93cywgKGF0b21XaW5kb3cpIC0+IGF0b21XaW5kb3cuaXNGb2N1c2VkKClcblxuICAjIENvbWJpbmVzIGEgbWVudSB0ZW1wbGF0ZSB3aXRoIHRoZSBhcHByb3ByaWF0ZSBrZXlzdHJva2UuXG4gICNcbiAgIyB0ZW1wbGF0ZSAtIEFuIE9iamVjdCBjb25mb3JtaW5nIHRvIGF0b20tc2hlbGwncyBtZW51IGFwaSBidXQgbGFja2luZ1xuICAjICAgICAgICAgICAgYWNjZWxlcmF0b3IgYW5kIGNsaWNrIHByb3BlcnRpZXMuXG4gICMga2V5c3Ryb2tlc0J5Q29tbWFuZCAtIEFuIE9iamVjdCB3aGVyZSB0aGUga2V5cyBhcmUgY29tbWFuZHMgYW5kIHRoZSB2YWx1ZXNcbiAgIyAgICAgICAgICAgICAgICAgICAgICAgYXJlIEFycmF5cyBjb250YWluaW5nIHRoZSBrZXlzdHJva2UuXG4gICNcbiAgIyBSZXR1cm5zIGEgY29tcGxldGUgbWVudSBjb25maWd1cmF0aW9uIG9iamVjdCBmb3IgYXRvbS1zaGVsbCdzIG1lbnUgQVBJLlxuICB0cmFuc2xhdGVUZW1wbGF0ZTogKHRlbXBsYXRlLCBrZXlzdHJva2VzQnlDb21tYW5kKSAtPlxuICAgIHRlbXBsYXRlLmZvckVhY2ggKGl0ZW0pID0+XG4gICAgICBpdGVtLm1ldGFkYXRhID89IHt9XG4gICAgICBpZiBpdGVtLmNvbW1hbmRcbiAgICAgICAgaXRlbS5hY2NlbGVyYXRvciA9IEBhY2NlbGVyYXRvckZvckNvbW1hbmQoaXRlbS5jb21tYW5kLCBrZXlzdHJva2VzQnlDb21tYW5kKVxuICAgICAgICBpdGVtLmNsaWNrID0gLT4gZ2xvYmFsLmF0b21BcHBsaWNhdGlvbi5zZW5kQ29tbWFuZChpdGVtLmNvbW1hbmQsIGl0ZW0uY29tbWFuZERldGFpbClcbiAgICAgICAgaXRlbS5tZXRhZGF0YS53aW5kb3dTcGVjaWZpYyA9IHRydWUgdW5sZXNzIC9eYXBwbGljYXRpb246Ly50ZXN0KGl0ZW0uY29tbWFuZCwgaXRlbS5jb21tYW5kRGV0YWlsKVxuICAgICAgQHRyYW5zbGF0ZVRlbXBsYXRlKGl0ZW0uc3VibWVudSwga2V5c3Ryb2tlc0J5Q29tbWFuZCkgaWYgaXRlbS5zdWJtZW51XG4gICAgdGVtcGxhdGVcblxuICAjIERldGVybWluZSB0aGUgYWNjZWxlcmF0b3IgZm9yIGEgZ2l2ZW4gY29tbWFuZC5cbiAgI1xuICAjIGNvbW1hbmQgLSBUaGUgbmFtZSBvZiB0aGUgY29tbWFuZC5cbiAgIyBrZXlzdHJva2VzQnlDb21tYW5kIC0gQW4gT2JqZWN0IHdoZXJlIHRoZSBrZXlzIGFyZSBjb21tYW5kcyBhbmQgdGhlIHZhbHVlc1xuICAjICAgICAgICAgICAgICAgICAgICAgICBhcmUgQXJyYXlzIGNvbnRhaW5pbmcgdGhlIGtleXN0cm9rZS5cbiAgI1xuICAjIFJldHVybnMgYSBTdHJpbmcgY29udGFpbmluZyB0aGUga2V5c3Ryb2tlIGluIGEgZm9ybWF0IHRoYXQgY2FuIGJlIGludGVycHJldGVkXG4gICMgICBieSBhdG9tIHNoZWxsIHRvIHByb3ZpZGUgbmljZSBpY29ucyB3aGVyZSBhdmFpbGFibGUuXG4gIGFjY2VsZXJhdG9yRm9yQ29tbWFuZDogKGNvbW1hbmQsIGtleXN0cm9rZXNCeUNvbW1hbmQpIC0+XG4gICAgZmlyc3RLZXlzdHJva2UgPSBrZXlzdHJva2VzQnlDb21tYW5kW2NvbW1hbmRdP1swXVxuICAgIHJldHVybiBudWxsIHVubGVzcyBmaXJzdEtleXN0cm9rZVxuXG4gICAgbW9kaWZpZXJzID0gZmlyc3RLZXlzdHJva2Uuc3BsaXQoLy0oPz0uKS8pXG4gICAga2V5ID0gbW9kaWZpZXJzLnBvcCgpLnRvVXBwZXJDYXNlKCkucmVwbGFjZSgnKycsICdQbHVzJylcblxuICAgIG1vZGlmaWVycyA9IG1vZGlmaWVycy5tYXAgKG1vZGlmaWVyKSAtPlxuICAgICAgbW9kaWZpZXIucmVwbGFjZSgvc2hpZnQvaWcsIFwiU2hpZnRcIilcbiAgICAgICAgICAgICAgLnJlcGxhY2UoL2NtZC9pZywgXCJDb21tYW5kXCIpXG4gICAgICAgICAgICAgIC5yZXBsYWNlKC9jdHJsL2lnLCBcIkN0cmxcIilcbiAgICAgICAgICAgICAgLnJlcGxhY2UoL2FsdC9pZywgXCJBbHRcIilcblxuICAgIGtleXMgPSBtb2RpZmllcnMuY29uY2F0KFtrZXldKVxuICAgIGtleXMuam9pbihcIitcIilcbiJdfQ==
