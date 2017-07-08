(function() {
  var Spawner, WinPowerShell, WinShell, addCommandsToPath, appFolder, binFolder, createShortcuts, exeName, fs, path, removeCommandsFromPath, removeShortcuts, rootAtomFolder, setxPath, spawnSetx, spawnUpdate, system32Path, updateContextMenus, updateDotExe, updateShortcuts;

  fs = require('fs-plus');

  path = require('path');

  Spawner = require('./spawner');

  WinShell = require('./win-shell');

  WinPowerShell = require('./win-powershell');

  appFolder = path.resolve(process.execPath, '..');

  rootAtomFolder = path.resolve(appFolder, '..');

  binFolder = path.join(rootAtomFolder, 'bin');

  updateDotExe = path.join(rootAtomFolder, 'Update.exe');

  exeName = path.basename(process.execPath);

  if (process.env.SystemRoot) {
    system32Path = path.join(process.env.SystemRoot, 'System32');
    setxPath = path.join(system32Path, 'setx.exe');
  } else {
    setxPath = 'setx.exe';
  }

  spawnSetx = function(args, callback) {
    return Spawner.spawn(setxPath, args, callback);
  };

  spawnUpdate = function(args, callback) {
    return Spawner.spawn(updateDotExe, args, callback);
  };

  addCommandsToPath = function(callback) {
    var addBinToPath, installCommands;
    installCommands = function(callback) {
      var apmCommand, apmCommandPath, apmShCommand, apmShCommandPath, atomCommand, atomCommandPath, atomShCommand, atomShCommandPath, relativeApmPath, relativeApmShPath, relativeAtomPath, relativeAtomShPath;
      atomCommandPath = path.join(binFolder, 'atom.cmd');
      relativeAtomPath = path.relative(binFolder, path.join(appFolder, 'resources', 'cli', 'atom.cmd'));
      atomCommand = "@echo off\r\n\"%~dp0\\" + relativeAtomPath + "\" %*";
      atomShCommandPath = path.join(binFolder, 'atom');
      relativeAtomShPath = path.relative(binFolder, path.join(appFolder, 'resources', 'cli', 'atom.sh'));
      atomShCommand = "#!/bin/sh\r\n\"$(dirname \"$0\")/" + (relativeAtomShPath.replace(/\\/g, '/')) + "\" \"$@\"\r\necho";
      apmCommandPath = path.join(binFolder, 'apm.cmd');
      relativeApmPath = path.relative(binFolder, path.join(process.resourcesPath, 'app', 'apm', 'bin', 'apm.cmd'));
      apmCommand = "@echo off\r\n\"%~dp0\\" + relativeApmPath + "\" %*";
      apmShCommandPath = path.join(binFolder, 'apm');
      relativeApmShPath = path.relative(binFolder, path.join(appFolder, 'resources', 'cli', 'apm.sh'));
      apmShCommand = "#!/bin/sh\r\n\"$(dirname \"$0\")/" + (relativeApmShPath.replace(/\\/g, '/')) + "\" \"$@\"";
      return fs.writeFile(atomCommandPath, atomCommand, function() {
        return fs.writeFile(atomShCommandPath, atomShCommand, function() {
          return fs.writeFile(apmCommandPath, apmCommand, function() {
            return fs.writeFile(apmShCommandPath, apmShCommand, function() {
              return callback();
            });
          });
        });
      });
    };
    addBinToPath = function(pathSegments, callback) {
      var newPathEnv;
      pathSegments.push(binFolder);
      newPathEnv = pathSegments.join(';');
      return spawnSetx(['Path', newPathEnv], callback);
    };
    return installCommands(function(error) {
      if (error != null) {
        return callback(error);
      }
      return WinPowerShell.getPath(function(error, pathEnv) {
        var pathSegments;
        if (error != null) {
          return callback(error);
        }
        pathSegments = pathEnv.split(/;+/).filter(function(pathSegment) {
          return pathSegment;
        });
        if (pathSegments.indexOf(binFolder) === -1) {
          return addBinToPath(pathSegments, callback);
        } else {
          return callback();
        }
      });
    });
  };

  removeCommandsFromPath = function(callback) {
    return WinPowerShell.getPath(function(error, pathEnv) {
      var newPathEnv, pathSegments;
      if (error != null) {
        return callback(error);
      }
      pathSegments = pathEnv.split(/;+/).filter(function(pathSegment) {
        return pathSegment && pathSegment !== binFolder;
      });
      newPathEnv = pathSegments.join(';');
      if (pathEnv !== newPathEnv) {
        return spawnSetx(['Path', newPathEnv], callback);
      } else {
        return callback();
      }
    });
  };

  createShortcuts = function(callback) {
    return spawnUpdate(['--createShortcut', exeName], callback);
  };

  updateShortcuts = function(callback) {
    var desktopShortcutPath, homeDirectory;
    if (homeDirectory = fs.getHomeDirectory()) {
      desktopShortcutPath = path.join(homeDirectory, 'Desktop', 'Atom.lnk');
      return fs.exists(desktopShortcutPath, function(desktopShortcutExists) {
        return createShortcuts(function() {
          if (desktopShortcutExists) {
            return callback();
          } else {
            return fs.unlink(desktopShortcutPath, callback);
          }
        });
      });
    } else {
      return createShortcuts(callback);
    }
  };

  removeShortcuts = function(callback) {
    return spawnUpdate(['--removeShortcut', exeName], callback);
  };

  exports.spawn = spawnUpdate;

  exports.existsSync = function() {
    return fs.existsSync(updateDotExe);
  };

  exports.restartAtom = function(app) {
    var args, projectPath, ref, ref1;
    if (projectPath = (ref = global.atomApplication) != null ? (ref1 = ref.lastFocusedWindow) != null ? ref1.projectPath : void 0 : void 0) {
      args = [projectPath];
    }
    app.once('will-quit', function() {
      return Spawner.spawn(path.join(binFolder, 'atom.cmd'), args);
    });
    return app.quit();
  };

  updateContextMenus = function(callback) {
    return WinShell.fileContextMenu.update(function() {
      return WinShell.folderContextMenu.update(function() {
        return WinShell.folderBackgroundContextMenu.update(function() {
          return callback();
        });
      });
    });
  };

  exports.handleStartupEvent = function(app, squirrelCommand) {
    switch (squirrelCommand) {
      case '--squirrel-install':
        createShortcuts(function() {
          return addCommandsToPath(function() {
            return WinShell.fileHandler.register(function() {
              return updateContextMenus(function() {
                return app.quit();
              });
            });
          });
        });
        return true;
      case '--squirrel-updated':
        updateShortcuts(function() {
          return addCommandsToPath(function() {
            return WinShell.fileHandler.update(function() {
              return updateContextMenus(function() {
                return app.quit();
              });
            });
          });
        });
        return true;
      case '--squirrel-uninstall':
        removeShortcuts(function() {
          return removeCommandsFromPath(function() {
            return WinShell.fileHandler.deregister(function() {
              return WinShell.fileContextMenu.deregister(function() {
                return WinShell.folderContextMenu.deregister(function() {
                  return WinShell.folderBackgroundContextMenu.deregister(function() {
                    return app.quit();
                  });
                });
              });
            });
          });
        });
        return true;
      case '--squirrel-obsolete':
        app.quit();
        return true;
      default:
        return false;
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL21haW4tcHJvY2Vzcy9zcXVpcnJlbC11cGRhdGUuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQSxFQUFBLEdBQUssT0FBQSxDQUFRLFNBQVI7O0VBQ0wsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLE9BQUEsR0FBVSxPQUFBLENBQVEsV0FBUjs7RUFDVixRQUFBLEdBQVcsT0FBQSxDQUFRLGFBQVI7O0VBQ1gsYUFBQSxHQUFnQixPQUFBLENBQVEsa0JBQVI7O0VBRWhCLFNBQUEsR0FBWSxJQUFJLENBQUMsT0FBTCxDQUFhLE9BQU8sQ0FBQyxRQUFyQixFQUErQixJQUEvQjs7RUFDWixjQUFBLEdBQWlCLElBQUksQ0FBQyxPQUFMLENBQWEsU0FBYixFQUF3QixJQUF4Qjs7RUFDakIsU0FBQSxHQUFZLElBQUksQ0FBQyxJQUFMLENBQVUsY0FBVixFQUEwQixLQUExQjs7RUFDWixZQUFBLEdBQWUsSUFBSSxDQUFDLElBQUwsQ0FBVSxjQUFWLEVBQTBCLFlBQTFCOztFQUNmLE9BQUEsR0FBVSxJQUFJLENBQUMsUUFBTCxDQUFjLE9BQU8sQ0FBQyxRQUF0Qjs7RUFFVixJQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBZjtJQUNFLFlBQUEsR0FBZSxJQUFJLENBQUMsSUFBTCxDQUFVLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBdEIsRUFBa0MsVUFBbEM7SUFDZixRQUFBLEdBQVcsSUFBSSxDQUFDLElBQUwsQ0FBVSxZQUFWLEVBQXdCLFVBQXhCLEVBRmI7R0FBQSxNQUFBO0lBSUUsUUFBQSxHQUFXLFdBSmI7OztFQU9BLFNBQUEsR0FBWSxTQUFDLElBQUQsRUFBTyxRQUFQO1dBQ1YsT0FBTyxDQUFDLEtBQVIsQ0FBYyxRQUFkLEVBQXdCLElBQXhCLEVBQThCLFFBQTlCO0VBRFU7O0VBS1osV0FB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MUJKO2VBNEJJO0FBNUJKO0VBRDJCO0FBdEk3QiIsInNvdXJjZXNDb250ZW50IjpbImZzID0gcmVxdWlyZSAnZnMtcGx1cydcbnBhdGggPSByZXF1aXJlICdwYXRoJ1xuU3Bhd25lciA9IHJlcXVpcmUgJy4vc3Bhd25lcidcbldpblNoZWxsID0gcmVxdWlyZSAnLi93aW4tc2hlbGwnXG5XaW5Qb3dlclNoZWxsID0gcmVxdWlyZSAnLi93aW4tcG93ZXJzaGVsbCdcblxuYXBwRm9sZGVyID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuZXhlY1BhdGgsICcuLicpXG5yb290QXRvbUZvbGRlciA9IHBhdGgucmVzb2x2ZShhcHBGb2xkZXIsICcuLicpXG5iaW5Gb2xkZXIgPSBwYXRoLmpvaW4ocm9vdEF0b21Gb2xkZXIsICdiaW4nKVxudXBkYXRlRG90RXhlID0gcGF0aC5qb2luKHJvb3RBdG9tRm9sZGVyLCAnVXBkYXRlLmV4ZScpXG5leGVOYW1lID0gcGF0aC5iYXNlbmFtZShwcm9jZXNzLmV4ZWNQYXRoKVxuXG5pZiBwcm9jZXNzLmVudi5TeXN0ZW1Sb290XG4gIHN5c3RlbTMyUGF0aCA9IHBhdGguam9pbihwcm9jZXNzLmVudi5TeXN0ZW1Sb290LCAnU3lzdGVtMzInKVxuICBzZXR4UGF0aCA9IHBhdGguam9pbihzeXN0ZW0zMlBhdGgsICdzZXR4LmV4ZScpXG5lbHNlXG4gIHNldHhQYXRoID0gJ3NldHguZXhlJ1xuXG4jIFNwYXduIHNldHguZXhlIGFuZCBjYWxsYmFjayB3aGVuIGl0IGNvbXBsZXRlc1xuc3Bhd25TZXR4ID0gKGFyZ3MsIGNhbGxiYWNrKSAtPlxuICBTcGF3bmVyLnNwYXduKHNldHhQYXRoLCBhcmdzLCBjYWxsYmFjaylcblxuIyBTcGF3biB0aGUgVXBkYXRlLmV4ZSB3aXRoIHRoZSBnaXZlbiBhcmd1bWVudHMgYW5kIGludm9rZSB0aGUgY2FsbGJhY2sgd2hlblxuIyB0aGUgY29tbWFuZCBjb21wbGV0ZXMuXG5zcGF3blVwZGF0ZSA9IChhcmdzLCBjYWxsYmFjaykgLT5cbiAgU3Bhd25lci5zcGF3bih1cGRhdGVEb3RFeGUsIGFyZ3MsIGNhbGxiYWNrKVxuXG4jIEFkZCBhdG9tIGFuZCBhcG0gdG8gdGhlIFBBVEhcbiNcbiMgVGhpcyBpcyBkb25lIGJ5IGFkZGluZyAuY21kIHNoaW1zIHRvIHRoZSByb290IGJpbiBmb2xkZXIgaW4gdGhlIEF0b21cbiMgaW5zdGFsbCBkaXJlY3RvcnkgdGhhdCBwb2ludCB0byB0aGUgbmV3bHkgaW5zdGFsbGVkIHZlcnNpb25zIGluc2lkZVxuIyB0aGUgdmVyc2lvbmVkIGFwcCBkaXJlY3Rvcmllcy5cbmFkZENvbW1hbmRzVG9QYXRoID0gKGNhbGxiYWNrKSAtPlxuICBpbnN0YWxsQ29tbWFuZHMgPSAoY2FsbGJhY2spIC0+XG4gICAgYXRvbUNvbW1hbmRQYXRoID0gcGF0aC5qb2luKGJpbkZvbGRlciwgJ2F0b20uY21kJylcbiAgICByZWxhdGl2ZUF0b21QYXRoID0gcGF0aC5yZWxhdGl2ZShiaW5Gb2xkZXIsIHBhdGguam9pbihhcHBGb2xkZXIsICdyZXNvdXJjZXMnLCAnY2xpJywgJ2F0b20uY21kJykpXG4gICAgYXRvbUNvbW1hbmQgPSBcIkBlY2hvIG9mZlxcclxcblxcXCIlfmRwMFxcXFwje3JlbGF0aXZlQXRvbVBhdGh9XFxcIiAlKlwiXG5cbiAgICBhdG9tU2hDb21tYW5kUGF0aCA9IHBhdGguam9pbihiaW5Gb2xkZXIsICdhdG9tJylcbiAgICByZWxhdGl2ZUF0b21TaFBhdGggPSBwYXRoLnJlbGF0aXZlKGJpbkZvbGRlciwgcGF0aC5qb2luKGFwcEZvbGRlciwgJ3Jlc291cmNlcycsICdjbGknLCAnYXRvbS5zaCcpKVxuICAgIGF0b21TaENvbW1hbmQgPSBcIiMhL2Jpbi9zaFxcclxcblxcXCIkKGRpcm5hbWUgXFxcIiQwXFxcIikvI3tyZWxhdGl2ZUF0b21TaFBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpfVxcXCIgXFxcIiRAXFxcIlxcclxcbmVjaG9cIlxuXG4gICAgYXBtQ29tbWFuZFBhdGggPSBwYXRoLmpvaW4oYmluRm9sZGVyLCAnYXBtLmNtZCcpXG4gICAgcmVsYXRpdmVBcG1QYXRoID0gcGF0aC5yZWxhdGl2ZShiaW5Gb2xkZXIsIHBhdGguam9pbihwcm9jZXNzLnJlc291cmNlc1BhdGgsICdhcHAnLCAnYXBtJywgJ2JpbicsICdhcG0uY21kJykpXG4gICAgYXBtQ29tbWFuZCA9IFwiQGVjaG8gb2ZmXFxyXFxuXFxcIiV+ZHAwXFxcXCN7cmVsYXRpdmVBcG1QYXRofVxcXCIgJSpcIlxuXG4gICAgYXBtU2hDb21tYW5kUGF0aCA9IHBhdGguam9pbihiaW5Gb2xkZXIsICdhcG0nKVxuICAgIHJlbGF0aXZlQXBtU2hQYXRoID0gcGF0aC5yZWxhdGl2ZShiaW5Gb2xkZXIsIHBhdGguam9pbihhcHBGb2xkZXIsICdyZXNvdXJjZXMnLCAnY2xpJywgJ2FwbS5zaCcpKVxuICAgIGFwbVNoQ29tbWFuZCA9IFwiIyEvYmluL3NoXFxyXFxuXFxcIiQoZGlybmFtZSBcXFwiJDBcXFwiKS8je3JlbGF0aXZlQXBtU2hQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKX1cXFwiIFxcXCIkQFxcXCJcIlxuXG4gICAgZnMud3JpdGVGaWxlIGF0b21Db21tYW5kUGF0aCwgYXRvbUNvbW1hbmQsIC0+XG4gICAgICBmcy53cml0ZUZpbGUgYXRvbVNoQ29tbWFuZFBhdGgsIGF0b21TaENvbW1hbmQsIC0+XG4gICAgICAgIGZzLndyaXRlRmlsZSBhcG1Db21tYW5kUGF0aCwgYXBtQ29tbWFuZCwgLT5cbiAgICAgICAgICBmcy53cml0ZUZpbGUgYXBtU2hDb21tYW5kUGF0aCwgYXBtU2hDb21tYW5kLCAtPlxuICAgICAgICAgICAgY2FsbGJhY2soKVxuXG4gIGFkZEJpblRvUGF0aCA9IChwYXRoU2VnbWVudHMsIGNhbGxiYWNrKSAtPlxuICAgIHBhdGhTZWdtZW50cy5wdXNoKGJpbkZvbGRlcilcbiAgICBuZXdQYXRoRW52ID0gcGF0aFNlZ21lbnRzLmpvaW4oJzsnKVxuICAgIHNwYXduU2V0eChbJ1BhdGgnLCBuZXdQYXRoRW52XSwgY2FsbGJhY2spXG5cbiAgaW5zdGFsbENvbW1hbmRzIChlcnJvcikgLT5cbiAgICByZXR1cm4gY2FsbGJhY2soZXJyb3IpIGlmIGVycm9yP1xuXG4gICAgV2luUG93ZXJTaGVsbC5nZXRQYXRoIChlcnJvciwgcGF0aEVudikgLT5cbiAgICAgIHJldHVybiBjYWxsYmFjayhlcnJvcikgaWYgZXJyb3I/XG5cbiAgICAgIHBhdGhTZWdtZW50cyA9IHBhdGhFbnYuc3BsaXQoLzsrLykuZmlsdGVyIChwYXRoU2VnbWVudCkgLT4gcGF0aFNlZ21lbnRcbiAgICAgIGlmIHBhdGhTZWdtZW50cy5pbmRleE9mKGJpbkZvbGRlcikgaXMgLTFcbiAgICAgICAgYWRkQmluVG9QYXRoKHBhdGhTZWdtZW50cywgY2FsbGJhY2spXG4gICAgICBlbHNlXG4gICAgICAgIGNhbGxiYWNrKClcblxuIyBSZW1vdmUgYXRvbSBhbmQgYXBtIGZyb20gdGhlIFBBVEhcbnJlbW92ZUNvbW1hbmRzRnJvbVBhdGggPSAoY2FsbGJhY2spIC0+XG4gIFdpblBvd2VyU2hlbGwuZ2V0UGF0aCAoZXJyb3IsIHBhdGhFbnYpIC0+XG4gICAgcmV0dXJuIGNhbGxiYWNrKGVycm9yKSBpZiBlcnJvcj9cblxuICAgIHBhdGhTZWdtZW50cyA9IHBhdGhFbnYuc3BsaXQoLzsrLykuZmlsdGVyIChwYXRoU2VnbWVudCkgLT5cbiAgICAgIHBhdGhTZWdtZW50IGFuZCBwYXRoU2VnbWVudCBpc250IGJpbkZvbGRlclxuICAgIG5ld1BhdGhFbnYgPSBwYXRoU2VnbWVudHMuam9pbignOycpXG5cbiAgICBpZiBwYXRoRW52IGlzbnQgbmV3UGF0aEVudlxuICAgICAgc3Bhd25TZXR4KFsnUGF0aCcsIG5ld1BhdGhFbnZdLCBjYWxsYmFjaylcbiAgICBlbHNlXG4gICAgICBjYWxsYmFjaygpXG5cbiMgQ3JlYXRlIGEgZGVza3RvcCBhbmQgc3RhcnQgbWVudSBzaG9ydGN1dCBieSB1c2luZyB0aGUgY29tbWFuZCBsaW5lIEFQSVxuIyBwcm92aWRlZCBieSBTcXVpcnJlbCdzIFVwZGF0ZS5leGVcbmNyZWF0ZVNob3J0Y3V0cyA9IChjYWxsYmFjaykgLT5cbiAgc3Bhd25VcGRhdGUoWyctLWNyZWF0ZVNob3J0Y3V0JywgZXhlTmFtZV0sIGNhbGxiYWNrKVxuXG4jIFVwZGF0ZSB0aGUgZGVza3RvcCBhbmQgc3RhcnQgbWVudSBzaG9ydGN1dHMgYnkgdXNpbmcgdGhlIGNvbW1hbmQgbGluZSBBUElcbiMgcHJvdmlkZWQgYnkgU3F1aXJyZWwncyBVcGRhdGUuZXhlXG51cGRhdGVTaG9ydGN1dHMgPSAoY2FsbGJhY2spIC0+XG4gIGlmIGhvbWVEaXJlY3RvcnkgPSBmcy5nZXRIb21lRGlyZWN0b3J5KClcbiAgICBkZXNrdG9wU2hvcnRjdXRQYXRoID0gcGF0aC5qb2luKGhvbWVEaXJlY3RvcnksICdEZXNrdG9wJywgJ0F0b20ubG5rJylcbiAgICAjIENoZWNrIGlmIHRoZSBkZXNrdG9wIHNob3J0Y3V0IGhhcyBiZWVuIHByZXZpb3VzbHkgZGVsZXRlZCBhbmRcbiAgICAjIGFuZCBrZWVwIGl0IGRlbGV0ZWQgaWYgaXQgd2FzXG4gICAgZnMuZXhpc3RzIGRlc2t0b3BTaG9ydGN1dFBhdGgsIChkZXNrdG9wU2hvcnRjdXRFeGlzdHMpIC0+XG4gICAgICBjcmVhdGVTaG9ydGN1dHMgLT5cbiAgICAgICAgaWYgZGVza3RvcFNob3J0Y3V0RXhpc3RzXG4gICAgICAgICAgY2FsbGJhY2soKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgIyBSZW1vdmUgdGhlIHVud2FudGVkIGRlc2t0b3Agc2hvcnRjdXQgdGhhdCB3YXMgcmVjcmVhdGVkXG4gICAgICAgICAgZnMudW5saW5rKGRlc2t0b3BTaG9ydGN1dFBhdGgsIGNhbGxiYWNrKVxuICBlbHNlXG4gICAgY3JlYXRlU2hvcnRjdXRzKGNhbGxiYWNrKVxuXG4jIFJlbW92ZSB0aGUgZGVza3RvcCBhbmQgc3RhcnQgbWVudSBzaG9ydGN1dHMgYnkgdXNpbmcgdGhlIGNvbW1hbmQgbGluZSBBUElcbiMgcHJvdmlkZWQgYnkgU3F1aXJyZWwncyBVcGRhdGUuZXhlXG5yZW1vdmVTaG9ydGN1dHMgPSAoY2FsbGJhY2spIC0+XG4gIHNwYXduVXBkYXRlKFsnLS1yZW1vdmVTaG9ydGN1dCcsIGV4ZU5hbWVdLCBjYWxsYmFjaylcblxuZXhwb3J0cy5zcGF3biA9IHNwYXduVXBkYXRlXG5cbiMgSXMgdGhlIFVwZGF0ZS5leGUgaW5zdGFsbGVkIHdpdGggQXRvbT9cbmV4cG9ydHMuZXhpc3RzU3luYyA9IC0+XG4gIGZzLmV4aXN0c1N5bmModXBkYXRlRG90RXhlKVxuXG4jIFJlc3RhcnQgQXRvbSB1c2luZyB0aGUgdmVyc2lvbiBwb2ludGVkIHRvIGJ5IHRoZSBhdG9tLmNtZCBzaGltXG5leHBvcnRzLnJlc3RhcnRBdG9tID0gKGFwcCkgLT5cbiAgaWYgcHJvamVjdFBhdGggPSBnbG9iYWwuYXRvbUFwcGxpY2F0aW9uPy5sYXN0Rm9jdXNlZFdpbmRvdz8ucHJvamVjdFBhdGhcbiAgICBhcmdzID0gW3Byb2plY3RQYXRoXVxuICBhcHAub25jZSAnd2lsbC1xdWl0JywgLT4gU3Bhd25lci5zcGF3bihwYXRoLmpvaW4oYmluRm9sZGVyLCAnYXRvbS5jbWQnKSwgYXJncylcbiAgYXBwLnF1aXQoKVxuXG51cGRhdGVDb250ZXh0TWVudXMgPSAoY2FsbGJhY2spIC0+XG4gIFdpblNoZWxsLmZpbGVDb250ZXh0TWVudS51cGRhdGUgLT5cbiAgICBXaW5TaGVsbC5mb2xkZXJDb250ZXh0TWVudS51cGRhdGUgLT5cbiAgICAgIFdpblNoZWxsLmZvbGRlckJhY2tncm91bmRDb250ZXh0TWVudS51cGRhdGUgLT5cbiAgICAgICAgY2FsbGJhY2soKVxuXG4jIEhhbmRsZSBzcXVpcnJlbCBldmVudHMgZGVub3RlZCBieSAtLXNxdWlycmVsLSogY29tbWFuZCBsaW5lIGFyZ3VtZW50cy5cbmV4cG9ydHMuaGFuZGxlU3RhcnR1cEV2ZW50ID0gKGFwcCwgc3F1aXJyZWxDb21tYW5kKSAtPlxuICBzd2l0Y2ggc3F1aXJyZWxDb21tYW5kXG4gICAgd2hlbiAnLS1zcXVpcnJlbC1pbnN0YWxsJ1xuICAgICAgY3JlYXRlU2hvcnRjdXRzIC0+XG4gICAgICAgIGFkZENvbW1hbmRzVG9QYXRoIC0+XG4gICAgICAgICAgV2luU2hlbGwuZmlsZUhhbmRsZXIucmVnaXN0ZXIgLT5cbiAgICAgICAgICAgIHVwZGF0ZUNvbnRleHRNZW51cyAtPlxuICAgICAgICAgICAgICBhcHAucXVpdCgpXG4gICAgICB0cnVlXG4gICAgd2hlbiAnLS1zcXVpcnJlbC11cGRhdGVkJ1xuICAgICAgdXBkYXRlU2hvcnRjdXRzIC0+XG4gICAgICAgIGFkZENvbW1hbmRzVG9QYXRoIC0+XG4gICAgICAgICAgV2luU2hlbGwuZmlsZUhhbmRsZXIudXBkYXRlIC0+XG4gICAgICAgICAgICB1cGRhdGVDb250ZXh0TWVudXMgLT5cbiAgICAgICAgICAgICAgYXBwLnF1aXQoKVxuICAgICAgdHJ1ZVxuICAgIHdoZW4gJy0tc3F1aXJyZWwtdW5pbnN0YWxsJ1xuICAgICAgcmVtb3ZlU2hvcnRjdXRzIC0+XG4gICAgICAgIHJlbW92ZUNvbW1hbmRzRnJvbVBhdGggLT5cbiAgICAgICAgICBXaW5TaGVsbC5maWxlSGFuZGxlci5kZXJlZ2lzdGVyIC0+XG4gICAgICAgICAgICBXaW5TaGVsbC5maWxlQ29udGV4dE1lbnUuZGVyZWdpc3RlciAtPlxuICAgICAgICAgICAgICBXaW5TaGVsbC5mb2xkZXJDb250ZXh0TWVudS5kZXJlZ2lzdGVyIC0+XG4gICAgICAgICAgICAgICAgV2luU2hlbGwuZm9sZGVyQmFja2dyb3VuZENvbnRleHRNZW51LmRlcmVnaXN0ZXIgLT5cbiAgICAgICAgICAgICAgICAgIGFwcC5xdWl0KClcbiAgICAgIHRydWVcbiAgICB3aGVuICctLXNxdWlycmVsLW9ic29sZXRlJ1xuICAgICAgYXBwLnF1aXQoKVxuICAgICAgdHJ1ZVxuICAgIGVsc2VcbiAgICAgIGZhbHNlXG4iXX0=
