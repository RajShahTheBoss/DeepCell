(function() {
  var Grim, copyPathToClipboard, ipcRenderer, showCursorScope, stopEventPropagation, stopEventPropagationAndGroupUndo;

  ipcRenderer = require('electron').ipcRenderer;

  Grim = require('grim');

  module.exports = function(arg) {
    var clipboard, commandInstaller, commandRegistry, config, notificationManager, project;
    commandRegistry = arg.commandRegistry, commandInstaller = arg.commandInstaller, config = arg.config, notificationManager = arg.notificationManager, project = arg.project, clipboard = arg.clipboard;
    commandRegistry.add('atom-workspace', {
      'pane:show-next-recently-used-item': function() {
        return this.getModel().getActivePane().activateNextRecentlyUsedItem();
      },
      'pane:show-previous-recently-used-item': function() {
        return this.getModel().getActivePane().activatePreviousRecentlyUsedItem();
      },
      'pane:move-active-item-to-top-of-stack': function() {
        return this.getModel().getActivePane().moveActiveItemToTopOfStack();
      },
      'pane:show-next-item': function() {
        return this.getModel().getActivePane().activateNextItem();
      },
      'pane:show-previous-item': function() {
        return this.getModel().getActivePane().activatePreviousItem();
      },
      'pane:show-item-1': function() {
        return this.getModel().getActivePane().activateItemAtIndex(0);
      },
      'pane:show-item-2': function() {
        return this.getModel().getActivePane().activateItemAtIndex(1);
      },
      'pane:show-item-3': function() {
        return this.getModel().getActivePane().activateItemAtIndex(2);
      },
      'pane:show-item-4': function() {
        return this.getModel().getActivePane().activateItemAtIndex(3);
      },
      'pane:show-item-5': function() {
        return this.getModel().getActivePane().activateItemAtIndex(4);
      },
      'pane:show-item-6': function() {
        return this.getModel().getActivePane().activateItemAtIndex(5);
      },
      'pane:show-item-7': function() {
        return this.getModel().getActivePane().activateItemAtIndex(6);
      },
      'pane:show-item-8': function() {
        return this.getModel().getActivePane().activateItemAtIndex(7);
      },
      'pane:show-item-9': function() {
        return this.getModel().getActivePane().activateLastItem();
      },
      'pane:move-item-right': function() {
        return this.getModel().getActivePane().moveItemRight();
      },
      'pane:move-item-left': function() {
        return this.getModel().getActivePane().moveItemLeft();
      },
      'window:increase-font-size': function() {
        return this.getModel().increaseFontSize();
      },
      'window:decrease-font-size': function() {
        return this.getModel().decreaseFontSize();
      },
      'window:reset-font-size': function() {
        return this.getModel().resetFontSize();
      },
      'application:about': function() {
        return ipcRenderer.send('command', 'application:about');
      },
      'application:show-preferences': function() {
        return ipcRenderer.send('command', 'application:show-settings');
      },
      'application:show-settings': function() {
        return ipcRenderer.send('command', 'application:show-settings');
      },
      'application:quit': function() {
        return ipcRenderer.send('command', 'application:quit');
      },
      'application:hide': function() {
        return ipcRenderer.send('command', 'application:hide');
      },
      'application:hide-other-applications': function() {
        return ipcRenderer.send('command', 'application:hide-other-applications');
      },
      'application:install-update': function() {
        return ipcRenderer.send('command', 'application:install-update');
      },
      'application:unhide-all-applications': function() {
        return ipcRenderer.send('command', 'application:unhide-all-applications');
      },
      'application:new-window': function() {
        return ipcRenderer.send('command', 'application:new-window');
      },
      'application:new-file': function() {
        return ipcRenderer.send('command', 'application:new-file');
      },
      'application:open': function() {
        var defaultPath, ref, ref1, ref2;
        defaultPath = (ref = (ref1 = atom.workspace.getActiveTextEditor()) != null ? ref1.getPath() : void 0) != null ? ref : (ref2 = atom.project.getPaths()) != null ? ref2[0] : void 0;
        return ipcRenderer.send('open-command', 'application:open', defaultPath);
      },
      'application:open-file': function() {
        var defaultPath, ref, ref1, ref2;
        defaultPath = (ref = (ref1 = atom.workspace.getActiveTextEditor()) != null ? ref1.getPath() : void 0) != null ? ref : (ref2 = atom.project.getPaths()) != null ? ref2[0] : void 0;
        return ipcRenderer.send('open-command', 'application:open-file', defaultPath);
      },
      'application:open-folder': function() {
        var defaultPath, ref, ref1, ref2;
        defaultPath = (ref = (ref1 = atom.workspace.getActiveTextEditor()) != null ? ref1.getPath() : void 0) != null ? ref : (ref2 = atom.project.getPaths()) != null ? ref2[0] : void 0;
        return ipcRenderer.send('open-command', 'application:open-folder', defaultPath);
      },
      'application:open-dev': function() {
        return ipcRenderer.send('command', 'application:open-dev');
      },
      'application:open-safe': function() {
        return ipcRenderer.send('command', 'application:open-safe');
      },
      'application:add-project-folder': function() {
        return atom.addProjectFolder();
      },
      'application:minimize': function() {
        return ipcRenderer.send('command', 'application:minimize');
      },
      'application:zoom': function() {
        return ipcRenderer.send('command', 'application:zoom');
      },
      'application:bring-all-windows-to-front': function() {
        return ipcRenderer.send('command', 'application:bring-all-windows-to-front');
      },
      'application:open-your-config': function() {
        return ipcRenderer.send('command', 'application:open-your-config');
      },
      'application:open-your-init-script': function() {
        return ipcRenderer.send('command', 'application:open-your-init-script');
      },
      'application:open-your-keymap': function() {
        return ipcRenderer.send('command', 'application:open-your-keymap');
      },
      'application:open-your-snippets': function() {
        return ipcRenderer.send('command', 'application:open-your-snippets');
      },
      'application:open-your-stylesheet': function() {
        return ipcRenderer.send('command', 'application:open-your-stylesheet');
      },
      'application:open-license': function() {
        return this.getModel().openLicense();
      },
      'window:run-package-specs': function() {
        return this.runPackageSpecs();
      },
      'window:run-benchmarks': function() {
        return this.runBenchmarks();
      },
      'window:toggle-left-dock': function() {
        return this.getModel().getLeftDock().toggle();
      },
      'window:toggle-right-dock': function() {
        return this.getModel().getRightDock().toggle();
      },
      'window:toggle-bottom-dock': function() {
        return this.getModel().getBottomDock().toggle();
      },
      'window:focus-next-pane': function() {
        return this.getModel().activateNextPane();
      },
      'window:focus-previous-pane': function() {
        return this.getModel().activatePreviousPane();
      },
      'window:focus-pane-above': function() {
        return this.focusPaneViewAbove();
      },
      'window:focus-pane-below': function() {
        return this.focusPaneViewBelow();
      },
      'window:focus-pane-on-left': function() {
        return this.focusPaneViewOnLeft();
      },
      'window:focus-pane-on-right': function() {
        return this.focusPaneViewOnRight();
      },
      'window:move-active-item-to-pane-above': function() {
        return this.moveActiveItemToPaneAbove();
      },
      'window:move-active-item-to-pane-below': function() {
        return this.moveActiveItemToPaneBelow();
      },
      'window:move-active-item-to-pane-on-left': function() {
        return this.moveActiveItemToPaneOnLeft();
      },
      'window:move-active-item-to-pane-on-right': function() {
        return this.moveActiveItemToPaneOnRight();
      },
      'window:copy-active-item-to-pane-above': function() {
        return this.moveActiveItemToPaneAbove({
          keepOriginal: true
        });
      },
      'window:copy-active-item-to-pane-below': function() {
        return this.moveActiveItemToPaneBelow({
          keepOriginal: true
        });
      },
      'window:copy-active-item-to-pane-on-left': function() {
        return this.moveActiveItemToPaneOnLeft({
          keepOriginal: true
        });
      },
      'window:copy-active-item-to-pane-on-right': function() {
        return this.moveActiveItemToPaneOnRight({
          keepOriginal: true
        });
      },
      'window:save-all': function() {
        return this.getModel().saveAll();
      },
      'window:toggle-invisibles': function() {
        return config.set("editor.showInvisibles", !config.get("editor.showInvisibles"));
      },
      'window:log-deprecation-warnings': function() {
        return Grim.logDeprecations();
      },
      'window:toggle-auto-indent': function() {
        return config.set("editor.autoIndent", !config.get("editor.autoIndent"));
      },
      'pane:reopen-closed-item': function() {
        return this.getModel().reopenItem();
      },
      'core:close': function() {
        return this.getModel().closeActivePaneItemOrEmptyPaneOrWindow();
      },
      'core:save': function() {
        return this.getModel().saveActivePaneItem();
      },
      'core:save-as': function() {
        return this.getModel().saveActivePaneItemAs();
      }
    }, false);
    if (process.platform === 'darwin') {
      commandRegistry.add('atom-workspace', 'window:install-shell-commands', (function() {
        return commandInstaller.installShellCommandsInteractively();
      }), false);
    }
    commandRegistry.add('atom-pane', {
      'pane:save-items': function() {
        return this.getModel().saveItems();
      },
      'pane:split-left': function() {
        return this.getModel().splitLeft();
      },
      'pane:split-right': function() {
        return this.getModel().splitRight();
      },
      'pane:split-up': function() {
        return this.getModel().splitUp();
      },
      'pane:split-down': function() {
        return this.getModel().splitDown();
      },
      'pane:split-left-and-copy-active-item': function() {
        return this.getModel().splitLeft({
          copyActiveItem: true
        });
      },
      'pane:split-right-and-copy-active-item': function() {
        return this.getModel().splitRight({
          copyActiveItem: true
        });
      },
      'pane:split-up-and-copy-active-item': function() {
        return this.getModel().splitUp({
          copyActiveItem: true
        });
      },
      'pane:split-down-and-copy-active-item': function() {
        return this.getModel().splitDown({
          copyActiveItem: true
        });
      },
      'pane:split-left-and-move-active-item': function() {
        return this.getModel().splitLeft({
          moveActiveItem: true
        });
      },
      'pane:split-right-and-move-active-item': function() {
        return this.getModel().splitRight({
          moveActiveItem: true
        });
      },
      'pane:split-up-and-move-active-item': function() {
        return this.getModel().splitUp({
          moveActiveItem: true
        });
      },
      'pane:split-down-and-move-active-item': function() {
        return this.getModel().splitDown({
          moveActiveItem: true
        });
      },
      'pane:close': function() {
        return this.getModel().close();
      },
      'pane:close-other-items': function() {
        return this.getModel().destroyInactiveItems();
      },
      'pane:increase-size': function() {
        return this.getModel().increaseSize();
      },
      'pane:decrease-size': function() {
        return this.getModel().decreaseSize();
      }
    }, false);
    commandRegistry.add('atom-text-editor', stopEventPropagation({
      'core:undo': function() {
        return this.undo();
      },
      'core:redo': function() {
        return this.redo();
      },
      'core:move-left': function() {
        return this.moveLeft();
      },
      'core:move-right': function() {
        return this.moveRight();
      },
      'core:select-left': function() {
        return this.selectLeft();
      },
      'core:select-right': function() {
        return this.selectRight();
      },
      'core:select-up': function() {
        return this.selectUp();
      },
      'core:select-down': function() {
        return this.selectDown();
      },
      'core:select-all': function() {
        return this.selectAll();
      },
      'editor:select-word': function() {
        return this.selectWordsContainingCursors();
      },
      'editor:consolidate-selections': function(event) {
        if (!this.consolidateSelections()) {
          return event.abortKeyBinding();
        }
      },
      'editor:move-to-beginning-of-next-paragraph': function() {
        return this.moveToBeginningOfNextParagraph();
      },
      'editor:move-to-beginning-of-previous-paragraph': function() {
        return this.moveToBeginningOfPreviousParagraph();
      },
      'editor:move-to-beginning-of-screen-line': function() {
        return this.moveToBeginningOfScreenLine();
      },
      'editor:move-to-beginning-of-line': function() {
        return this.moveToBeginningOfLine();
      },
      'editor:move-to-end-of-screen-line': function() {
        return this.moveToEndOfScreenLine();
      },
      'editor:move-to-end-of-line': function() {
        return this.moveToEndOfLine();
      },
      'editor:move-to-first-character-of-line': function() {
        return this.moveToFirstCharacterOfLine();
      },
      'editor:move-to-beginning-of-word': function() {
        return this.moveToBeginningOfWord();
      },
      'editor:move-to-end-of-word': function() {
        return this.moveToEndOfWord();
      },
      'editor:move-to-beginning-of-next-word': function() {
        return this.moveToBeginningOfNextWord();
      },
      'editor:move-to-previous-word-boundary': function() {
        return this.moveToPreviousWordBoundary();
      },
      'editor:move-to-next-word-boundary': function() {
        return this.moveToNextWordBoundary();
      },
      'editor:move-to-previous-subword-boundary': function() {
        return this.moveToPreviousSubwordBoundary();
      },
      'editor:move-to-next-subword-boundary': function() {
        return this.moveToNextSubwordBoundary();
      },
      'editor:select-to-beginning-of-next-paragraph': function() {
        return this.selectToBeginningOfNextParagraph();
      },
      'editor:select-to-beginning-of-previous-paragraph': function() {
        return this.selectToBeginningOfPreviousParagraph();
      },
      'editor:select-to-end-of-line': function() {
        return this.selectToEndOfLine();
      },
      'editor:select-to-beginning-of-line': function() {
        return this.selectToBeginningOfLine();
      },
      'editor:select-to-end-of-word': function() {
        return this.selectToEndOfWord();
      },
      'editor:select-to-beginning-of-word': function() {
        return this.selectToBeginningOfWord();
      },
      'editor:select-to-beginning-of-next-word': function() {
        return this.selectToBeginningOfNextWord();
      },
      'editor:select-to-next-word-boundary': function() {
        return this.selectToNextWordBoundary();
      },
      'editor:select-to-previous-word-boundary': function() {
        return this.selectToPreviousWordBoundary();
      },
      'editor:select-to-next-subword-boundary': function() {
        return this.selectToNextSubwordBoundary();
      },
      'editor:select-to-previous-subword-boundary': function() {
        return this.selectToPreviousSubwordBoundary();
      },
      'editor:select-to-first-character-of-line': function() {
        return this.selectToFirstCharacterOfLine();
      },
      'editor:select-line': function() {
        return this.selectLinesContainingCursors();
      }
    }), false);
    commandRegistry.add('atom-text-editor', stopEventPropagationAndGroupUndo(config, {
      'core:backspace': function() {
        return this.backspace();
      },
      'core:delete': function() {
        return this["delete"]();
      },
      'core:cut': function() {
        return this.cutSelectedText();
      },
      'core:copy': function() {
        return this.copySelectedText();
      },
      'core:paste': function() {
        return this.pasteText();
      },
      'editor:delete-to-previous-word-boundary': function() {
        return this.deleteToPreviousWordBoundary();
      },
      'editor:delete-to-next-word-boundary': function() {
        return this.deleteToNextWordBoundary();
      },
      'editor:delete-to-beginning-of-word': function() {
        return this.deleteToBeginningOfWord();
      },
      'editor:delete-to-beginning-of-line': function() {
        return this.deleteToBeginningOfLine();
      },
      'editor:delete-to-end-of-line': function() {
        return this.deleteToEndOfLine();
      },
      'editor:delete-to-end-of-word': function() {
        return this.deleteToEndOfWord();
      },
      'editor:delete-to-beginning-of-subword': function() {
        return this.deleteToBeginningOfSubword();
      },
      'editor:delete-to-end-of-subword': function() {
        return this.deleteToEndOfSubword();
      },
      'editor:delete-line': function() {
        return this.deleteLine();
      },
      'editor:cut-to-end-of-line': function() {
        return this.cutToEndOfLine();
      },
      'editor:cut-to-end-of-buffer-line': function() {
        return this.cutToEndOfBufferLine();
      },
      'editor:transpose': function() {
        return this.transpose();
      },
      'editor:upper-case': function() {
        return this.upperCase();
      },
      'editor:lower-case': function() {
        return this.lowerCase();
      },
      'editor:copy-selection': function() {
        return this.copyOnlySelectedText();
      }
    }), false);
    commandRegistry.add('atom-text-editor:not([mini])', stopEventPropagation({
      'core:move-up': function() {
        return this.moveUp();
      },
      'core:move-down': function() {
        return this.moveDown();
      },
      'core:move-to-top': function() {
        return this.moveToTop();
      },
      'core:move-to-bottom': function() {
        return this.moveToBottom();
      },
      'core:page-up': function() {
        return this.pageUp();
      },
      'core:page-down': function() {
        return this.pageDown();
      },
      'core:select-to-top': function() {
        return this.selectToTop();
      },
      'core:select-to-bottom': function() {
        return this.selectToBottom();
      },
      'core:select-page-up': function() {
        return this.selectPageUp();
      },
      'core:select-page-down': function() {
        return this.selectPageDown();
      },
      'editor:add-selection-below': function() {
        return this.addSelectionBelow();
      },
      'editor:add-selection-above': function() {
        return this.addSelectionAbove();
      },
      'editor:split-selections-into-lines': function() {
        return this.splitSelectionsIntoLines();
      },
      'editor:toggle-soft-tabs': function() {
        return this.toggleSoftTabs();
      },
      'editor:toggle-soft-wrap': function() {
        return this.toggleSoftWrapped();
      },
      'editor:fold-all': function() {
        return this.foldAll();
      },
      'editor:unfold-all': function() {
        return this.unfoldAll();
      },
      'editor:fold-current-row': function() {
        return this.foldCurrentRow();
      },
      'editor:unfold-current-row': function() {
        return this.unfoldCurrentRow();
      },
      'editor:fold-selection': function() {
        return this.foldSelectedLines();
      },
      'editor:fold-at-indent-level-1': function() {
        return this.foldAllAtIndentLevel(0);
      },
      'editor:fold-at-indent-level-2': function() {
        return this.foldAllAtIndentLevel(1);
      },
      'editor:fold-at-indent-level-3': function() {
        return this.foldAllAtIndentLevel(2);
      },
      'editor:fold-at-indent-level-4': function() {
        return this.foldAllAtIndentLevel(3);
      },
      'editor:fold-at-indent-level-5': function() {
        return this.foldAllAtIndentLevel(4);
      },
      'editor:fold-at-indent-level-6': function() {
        return this.foldAllAtIndentLevel(5);
      },
      'editor:fold-at-indent-level-7': function() {
        return this.foldAllAtIndentLevel(6);
      },
      'editor:fold-at-indent-level-8': function() {
        return this.foldAllAtIndentLevel(7);
      },
      'editor:fold-at-indent-level-9': function() {
        return this.foldAllAtIndentLevel(8);
      },
      'editor:log-cursor-scope': function() {
        return showCursorScope(this.getCursorScope(), notificationManager);
      },
      'editor:copy-path': function() {
        return copyPathToClipboard(this, project, clipboard, false);
      },
      'editor:copy-project-path': function() {
        return copyPathToClipboard(this, project, clipboard, true);
      },
      'editor:toggle-indent-guide': function() {
        return config.set('editor.showIndentGuide', !config.get('editor.showIndentGuide'));
      },
      'editor:toggle-line-numbers': function() {
        return config.set('editor.showLineNumbers', !config.get('editor.showLineNumbers'));
      },
      'editor:scroll-to-cursor': function() {
        return this.scrollToCursorPosition();
      }
    }), false);
    return commandRegistry.add('atom-text-editor:not([mini])', stopEventPropagationAndGroupUndo(config, {
      'editor:indent': function() {
        return this.indent();
      },
      'editor:auto-indent': function() {
        return this.autoIndentSelectedRows();
      },
      'editor:indent-selected-rows': function() {
        return this.indentSelectedRows();
      },
      'editor:outdent-selected-rows': function() {
        return this.outdentSelectedRows();
      },
      'editor:newline': function() {
        return this.insertNewline();
      },
      'editor:newline-below': function() {
        return this.insertNewlineBelow();
      },
      'editor:newline-above': function() {
        return this.insertNewlineAbove();
      },
      'editor:toggle-line-comments': function() {
        return this.toggleLineCommentsInSelection();
      },
      'editor:checkout-head-revision': function() {
        return atom.workspace.checkoutHeadRevision(this);
      },
      'editor:move-line-up': function() {
        return this.moveLineUp();
      },
      'editor:move-line-down': function() {
        return this.moveLineDown();
      },
      'editor:move-selection-left': function() {
        return this.moveSelectionLeft();
      },
      'editor:move-selection-right': function() {
        return this.moveSelectionRight();
      },
      'editor:duplicate-lines': function() {
        return this.duplicateLines();
      },
      'editor:join-lines': function() {
        return this.joinLines();
      }
    }), false);
  };

  stopEventPropagation = function(commandListeners) {
    var commandListener, commandName, fn, newCommandListeners;
    newCommandListeners = {};
    fn = function(commandListener) {
      return newCommandListeners[commandName] = function(event) {
        event.stopPropagation();
        return commandListener.call(this.getModel(), event);
      };
    };
    for (commandName in commandListeners) {
      commandListener = commandListeners[commandName];
      fn(commandListener);
    }
    return newCommandListeners;
  };

  stopEventPropagationAndGroupUndo = function(config, commandListeners) {
    var commandListener, commandName, fn, newCommandListeners;
    newCommandListeners = {};
    fn = function(commandListener) {
      return newCommandListeners[commandName] = function(event) {
        var model;
        event.stopPropagation();
        model = this.getModel();
        return model.transact(model.getUndoGroupingInterval(), function() {
          return commandListener.call(model, event);
        });
      };
    };
    for (commandName in commandListeners) {
      commandListener = commandListeners[commandName];
      fn(commandListener);
    }
    return newCommandListeners;
  };

  showCursorScope = function(descriptor, notificationManager) {
    var content, list;
    list = descriptor.scopes.toString().split(',');
    list = list.map(function(item) {
      return "* " + item;
    });
    content = "Scopes at Cursor\n" + (list.join('\n'));
    return notificationManager.addInfo(content, {
      dismissable: true
    });
  };

  copyPathToClipboard = function(editor, project, clipboard, relative) {
    var filePath;
    if (filePath = editor.getPath()) {
      if (relative) {
        filePath = project.relativize(filePath);
      }
      return clipboard.write(filePath);
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3JlZ2lzdGVyLWRlZmF1bHQtY29tbWFuZHMuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQyxjQUFlLE9BQUEsQ0FBUSxVQUFSOztFQUNoQixJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7O0VBRVAsTUFBTSxDQUFDLE9BQVAsR0FBaUIsU0FBQyxHQUFEO0FBQ2YsUUFBQTtJQURpQix1Q0FBaUIseUNBQWtCLHFCQUFRLCtDQUFxQix1QkFBUztJQUMxRixlQUFlLENBQUMsR0FBaEIsQ0FDRSxnQkFERixFQUVFO01BQ0UsbUNBQUEsRUFBcUMsU0FBQTtlQUFHLElBQUMsQ0FBQSxRQUFELENBQUEsQ0FBVyxDQUFDLGFBQVosQ0FBQSxDQUEyQixDQUFDLDRCQUE1QixDQUFBO01BQUgsQ0FEdkM7TUFFRSx1Q0FBQSxFQUF5QyxTQUFBO2VBQUcsSUFBQyxDQUFBLFFBQUQsQ0FBQSxDQUFXLENBQUMsYUFBWixDQUFBLENBQTJCLENBQUMsZ0NBQTVCLENBQUE7TUFBSCxDQUYzQztNQUdFLHVDQUFBLEVBQXlDLFNBQUE7ZUFBRyxJQUFDLENBQUEsUUFBRCxDQUFBLENBQVcsQ0FBQyxhQUFaLENBQUEsQ0FBMkIsQ0FBQywwQkFBNUIsQ0FBQTtNQUFILENBSDNDO01BSUUscUJBQUEsRUFBdUIsU0FBQTtlQUFHLElBQUMsQ0FBQSxRQUFELENBQUEsQ0FBVyxDQUFDLGFBQVosQ0FBQSxDQUEyQixDQUFDLGdCQUE1QixDQUFBO01BQUgsQ0FKekI7TUFLRSx5QkFBQSxFQUEyQixTQUFBO2VBQUcsSUFBQyxDQUFBLFFBQUQsQ0FBQSxDQUFXLENBQUMsYUFBWixDQUFBLENBQTJCLENBQUMsb0JBQTVCLENBQUE7TUFBSCxDQUw3QjtNQU1FLGtCQUFBLEVBQW9CLFNBQUE7ZUFBRyxJQUFDLENBQUEsUUFBRCxDQUFBLENBQVcsQ0FBQyxhQUFaLENBQUEsQ0FBMkIsQ0FBQyxtQkFBNUIsQ0FBZ0QsQ0FBaEQ7TUFBSCxDQU50QjtNQU9FLGtCQUFBLEVBQW9CLFNBQUE7ZUFBRyxJQUFDLENBQUEsUUFBRCxDQUFBLENBQVcsQ0FBQyxhQUFaLENBQUEsQ0FBMkIsQ0FBQyxtQkFBNUIsQ0FBZ0QsQ0FBaEQ7TUFBSCxDQVB0QjtNQVFFLGtCQUFBLEVBQW9CLFNBQUE7ZUFBRyxJQUFDLENBQUEsUUFBRCxDQUFBLENBQVcsQ0FBQyxhQUFaLENBQUEsQ0FBMkIsQ0FBQyxtQkFBNUIsQ0FBZ0QsQ0FBaEQ7TUFBSCxDQVJ0QjtNQVNFLGtCQUFBLEVBQW9CLFNBQUE7ZUFBRyxJQUFDLENBQUEsUUFBRCxDQUFBLENBQVcsQ0FBQyxhQUFaLENBQUEsQ0FBMkIsQ0FBQyxtQkFBNUIsQ0FBZ0QsQ0FBaEQ7TUFBSCxDQVR0QjtNQVVFLGtCQUFBLEVBQW9CLFNBQUE7ZUFBRyxJQUFDLENBQUEsUUFBRCxDQUFBLENBQVcsQ0FBQyxhQUFaLENBQUEsQ0FBMkIsQ0FBQyxtQkFBNUIsQ0FBZ0QsQ0FBaEQ7TUFBSCxDQVZ0QjtNQVdFLGtCQUFBLEVBQW9CLFNBQUE7ZUFBRyxJQUFDLENBQUEsUUFBRCxDQUFBLENBQVcsQ0FBQyxhQUFaLENBQUEsQ0FBMkIsQ0FBQyxtQkFBNUIsQ0FBZ0QsQ0FBaEQ7TUFBSCxDQVh0QjtNQVlFLGtCQUFBLEVBQW9CLFNBQUE7ZUFBRyxJQUFDLENBQUEsUUFBRCxDQUFBLENBQVcsQ0FBQyxhQUFaLENBQUEsQ0FBMkIsQ0FBQyxtQkFBNUIsQ0FBZ0QsQ0FBaEQ7TUFBSCxDQVp0QjtNQWFFLGtCQUFBLEVBQW9CLFNBQUE7ZUFBRyxJQUFDLENBQUEsUUFBRCxDQUFBLENBQVcsQ0FBQyxhQUFaLENBQUEsQ0FBMkIsQ0FBQyxtQkFBNUIsQ0FBZ0QsQ0FBaEQ7TUFBSCxDQWJ0QjtNQWNFLGtCQUFBLEVBQW9CLFNBQUE7ZUFBRyxJQUFDLENBQUEsUUFBRCxDQUFBLENBQVcsQ0FBQyxhQUFaLENBQUEsQ0FBMkIsQ0FBQyxnQkFBNUIsQ0FB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LG9CQUFBLEdBQW9CLENBQUMsSUFBSSxDQUFDLElBQUwsQ0FBVSxJQUFWLENBQUQ7V0FFOUIsbUJBQW1CLENBQUMsT0FBcEIsQ0FBNEIsT0FBNUIsRUFBcUM7TUFBQSxXQUFBLEVBQWEsSUFBYjtLQUFyQztFQUxnQjs7RUFPbEIsbUJBQUEsR0FBc0IsU0FBQyxNQUFELEVBQVMsT0FBVCxFQUFrQixTQUFsQixFQUE2QixRQUE3QjtBQUNwQixRQUFBO0lBQUEsSUFBRyxRQUFBLEdBQVcsTUFBTSxDQUFDLE9BQVAsQ0FBQSxDQUFkO01BQ0UsSUFBMkMsUUFBM0M7UUFBQSxRQUFBLEdBQVcsT0FBTyxDQUFDLFVBQVIsQ0FBbUIsUUFBbkIsRUFBWDs7YUFDQSxTQUFTLENBQUMsS0FBVixDQUFnQixRQUFoQixFQUZGOztFQURvQjtBQWxTdEIiLCJzb3VyY2VzQ29udGVudCI6WyJ7aXBjUmVuZGVyZXJ9ID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5HcmltID0gcmVxdWlyZSAnZ3JpbSdcblxubW9kdWxlLmV4cG9ydHMgPSAoe2NvbW1hbmRSZWdpc3RyeSwgY29tbWFuZEluc3RhbGxlciwgY29uZmlnLCBub3RpZmljYXRpb25NYW5hZ2VyLCBwcm9qZWN0LCBjbGlwYm9hcmR9KSAtPlxuICBjb21tYW5kUmVnaXN0cnkuYWRkKFxuICAgICdhdG9tLXdvcmtzcGFjZScsXG4gICAge1xuICAgICAgJ3BhbmU6c2hvdy1uZXh0LXJlY2VudGx5LXVzZWQtaXRlbSc6IC0+IEBnZXRNb2RlbCgpLmdldEFjdGl2ZVBhbmUoKS5hY3RpdmF0ZU5leHRSZWNlbnRseVVzZWRJdGVtKClcbiAgICAgICdwYW5lOnNob3ctcHJldmlvdXMtcmVjZW50bHktdXNlZC1pdGVtJzogLT4gQGdldE1vZGVsKCkuZ2V0QWN0aXZlUGFuZSgpLmFjdGl2YXRlUHJldmlvdXNSZWNlbnRseVVzZWRJdGVtKClcbiAgICAgICdwYW5lOm1vdmUtYWN0aXZlLWl0ZW0tdG8tdG9wLW9mLXN0YWNrJzogLT4gQGdldE1vZGVsKCkuZ2V0QWN0aXZlUGFuZSgpLm1vdmVBY3RpdmVJdGVtVG9Ub3BPZlN0YWNrKClcbiAgICAgICdwYW5lOnNob3ctbmV4dC1pdGVtJzogLT4gQGdldE1vZGVsKCkuZ2V0QWN0aXZlUGFuZSgpLmFjdGl2YXRlTmV4dEl0ZW0oKVxuICAgICAgJ3BhbmU6c2hvdy1wcmV2aW91cy1pdGVtJzogLT4gQGdldE1vZGVsKCkuZ2V0QWN0aXZlUGFuZSgpLmFjdGl2YXRlUHJldmlvdXNJdGVtKClcbiAgICAgICdwYW5lOnNob3ctaXRlbS0xJzogLT4gQGdldE1vZGVsKCkuZ2V0QWN0aXZlUGFuZSgpLmFjdGl2YXRlSXRlbUF0SW5kZXgoMClcbiAgICAgICdwYW5lOnNob3ctaXRlbS0yJzogLT4gQGdldE1vZGVsKCkuZ2V0QWN0aXZlUGFuZSgpLmFjdGl2YXRlSXRlbUF0SW5kZXgoMSlcbiAgICAgICdwYW5lOnNob3ctaXRlbS0zJzogLT4gQGdldE1vZGVsKCkuZ2V0QWN0aXZlUGFuZSgpLmFjdGl2YXRlSXRlbUF0SW5kZXgoMilcbiAgICAgICdwYW5lOnNob3ctaXRlbS00JzogLT4gQGdldE1vZGVsKCkuZ2V0QWN0aXZlUGFuZSgpLmFjdGl2YXRlSXRlbUF0SW5kZXgoMylcbiAgICAgICdwYW5lOnNob3ctaXRlbS01JzogLT4gQGdldE1vZGVsKCkuZ2V0QWN0aXZlUGFuZSgpLmFjdGl2YXRlSXRlbUF0SW5kZXgoNClcbiAgICAgICdwYW5lOnNob3ctaXRlbS02JzogLT4gQGdldE1vZGVsKCkuZ2V0QWN0aXZlUGFuZSgpLmFjdGl2YXRlSXRlbUF0SW5kZXgoNSlcbiAgICAgICdwYW5lOnNob3ctaXRlbS03JzogLT4gQGdldE1vZGVsKCkuZ2V0QWN0aXZlUGFuZSgpLmFjdGl2YXRlSXRlbUF0SW5kZXgoNilcbiAgICAgICdwYW5lOnNob3ctaXRlbS04JzogLT4gQGdldE1vZGVsKCkuZ2V0QWN0aXZlUGFuZSgpLmFjdGl2YXRlSXRlbUF0SW5kZXgoNylcbiAgICAgICdwYW5lOnNob3ctaXRlbS05JzogLT4gQGdldE1vZGVsKCkuZ2V0QWN0aXZlUGFuZSgpLmFjdGl2YXRlTGFzdEl0ZW0oKVxuICAgICAgJ3BhbmU6bW92ZS1pdGVtLXJpZ2h0JzogLT4gQGdldE1vZGVsKCkuZ2V0QWN0aXZlUGFuZSgpLm1vdmVJdGVtUmlnaHQoKVxuICAgICAgJ3BhbmU6bW92ZS1pdGVtLWxlZnQnOiAtPiBAZ2V0TW9kZWwoKS5nZXRBY3RpdmVQYW5lKCkubW92ZUl0ZW1MZWZ0KClcbiAgICAgICd3aW5kb3c6aW5jcmVhc2UtZm9udC1zaXplJzogLT4gQGdldE1vZGVsKCkuaW5jcmVhc2VGb250U2l6ZSgpXG4gICAgICAnd2luZG93OmRlY3JlYXNlLWZvbnQtc2l6ZSc6IC0+IEBnZXRNb2RlbCgpLmRlY3JlYXNlRm9udFNpemUoKVxuICAgICAgJ3dpbmRvdzpyZXNldC1mb250LXNpemUnOiAtPiBAZ2V0TW9kZWwoKS5yZXNldEZvbnRTaXplKClcbiAgICAgICdhcHBsaWNhdGlvbjphYm91dCc6IC0+IGlwY1JlbmRlcmVyLnNlbmQoJ2NvbW1hbmQnLCAnYXBwbGljYXRpb246YWJvdXQnKVxuICAgICAgJ2FwcGxpY2F0aW9uOnNob3ctcHJlZmVyZW5jZXMnOiAtPiBpcGNSZW5kZXJlci5zZW5kKCdjb21tYW5kJywgJ2FwcGxpY2F0aW9uOnNob3ctc2V0dGluZ3MnKVxuICAgICAgJ2FwcGxpY2F0aW9uOnNob3ctc2V0dGluZ3MnOiAtPiBpcGNSZW5kZXJlci5zZW5kKCdjb21tYW5kJywgJ2FwcGxpY2F0aW9uOnNob3ctc2V0dGluZ3MnKVxuICAgICAgJ2FwcGxpY2F0aW9uOnF1aXQnOiAtPiBpcGNSZW5kZXJlci5zZW5kKCdjb21tYW5kJywgJ2FwcGxpY2F0aW9uOnF1aXQnKVxuICAgICAgJ2FwcGxpY2F0aW9uOmhpZGUnOiAtPiBpcGNSZW5kZXJlci5zZW5kKCdjb21tYW5kJywgJ2FwcGxpY2F0aW9uOmhpZGUnKVxuICAgICAgJ2FwcGxpY2F0aW9uOmhpZGUtb3RoZXItYXBwbGljYXRpb25zJzogLT4gaXBjUmVuZGVyZXIuc2VuZCgnY29tbWFuZCcsICdhcHBsaWNhdGlvbjpoaWRlLW90aGVyLWFwcGxpY2F0aW9ucycpXG4gICAgICAnYXBwbGljYXRpb246aW5zdGFsbC11cGRhdGUnOiAtPiBpcGNSZW5kZXJlci5zZW5kKCdjb21tYW5kJywgJ2FwcGxpY2F0aW9uOmluc3RhbGwtdXBkYXRlJylcbiAgICAgICdhcHBsaWNhdGlvbjp1bmhpZGUtYWxsLWFwcGxpY2F0aW9ucyc6IC0+IGlwY1JlbmRlcmVyLnNlbmQoJ2NvbW1hbmQnLCAnYXBwbGljYXRpb246dW5oaWRlLWFsbC1hcHBsaWNhdGlvbnMnKVxuICAgICAgJ2FwcGxpY2F0aW9uOm5ldy13aW5kb3cnOiAtPiBpcGNSZW5kZXJlci5zZW5kKCdjb21tYW5kJywgJ2FwcGxpY2F0aW9uOm5ldy13aW5kb3cnKVxuICAgICAgJ2FwcGxpY2F0aW9uOm5ldy1maWxlJzogLT4gaXBjUmVuZGVyZXIuc2VuZCgnY29tbWFuZCcsICdhcHBsaWNhdGlvbjpuZXctZmlsZScpXG4gICAgICAnYXBwbGljYXRpb246b3Blbic6IC0+XG4gICAgICAgIGRlZmF1bHRQYXRoID0gYXRvbS53b3Jrc3BhY2UuZ2V0QWN0aXZlVGV4dEVkaXRvcigpPy5nZXRQYXRoKCkgPyBhdG9tLnByb2plY3QuZ2V0UGF0aHMoKT9bMF1cbiAgICAgICAgaXBjUmVuZGVyZXIuc2VuZCgnb3Blbi1jb21tYW5kJywgJ2FwcGxpY2F0aW9uOm9wZW4nLCBkZWZhdWx0UGF0aClcbiAgICAgICdhcHBsaWNhdGlvbjpvcGVuLWZpbGUnOiAtPlxuICAgICAgICBkZWZhdWx0UGF0aCA9IGF0b20ud29ya3NwYWNlLmdldEFjdGl2ZVRleHRFZGl0b3IoKT8uZ2V0UGF0aCgpID8gYXRvbS5wcm9qZWN0LmdldFBhdGhzKCk/WzBdXG4gICAgICAgIGlwY1JlbmRlcmVyLnNlbmQoJ29wZW4tY29tbWFuZCcsICdhcHBsaWNhdGlvbjpvcGVuLWZpbGUnLCBkZWZhdWx0UGF0aClcbiAgICAgICdhcHBsaWNhdGlvbjpvcGVuLWZvbGRlcic6IC0+XG4gICAgICAgIGRlZmF1bHRQYXRoID0gYXRvbS53b3Jrc3BhY2UuZ2V0QWN0aXZlVGV4dEVkaXRvcigpPy5nZXRQYXRoKCkgPyBhdG9tLnByb2plY3QuZ2V0UGF0aHMoKT9bMF1cbiAgICAgICAgaXBjUmVuZGVyZXIuc2VuZCgnb3Blbi1jb21tYW5kJywgJ2FwcGxpY2F0aW9uOm9wZW4tZm9sZGVyJywgZGVmYXVsdFBhdGgpXG4gICAgICAnYXBwbGljYXRpb246b3Blbi1kZXYnOiAtPiBpcGNSZW5kZXJlci5zZW5kKCdjb21tYW5kJywgJ2FwcGxpY2F0aW9uOm9wZW4tZGV2JylcbiAgICAgICdhcHBsaWNhdGlvbjpvcGVuLXNhZmUnOiAtPiBpcGNSZW5kZXJlci5zZW5kKCdjb21tYW5kJywgJ2FwcGxpY2F0aW9uOm9wZW4tc2FmZScpXG4gICAgICAnYXBwbGljYXRpb246YWRkLXByb2plY3QtZm9sZGVyJzogLT4gYXRvbS5hZGRQcm9qZWN0Rm9sZGVyKClcbiAgICAgICdhcHBsaWNhdGlvbjptaW5pbWl6ZSc6IC0+IGlwY1JlbmRlcmVyLnNlbmQoJ2NvbW1hbmQnLCAnYXBwbGljYXRpb246bWluaW1pemUnKVxuICAgICAgJ2FwcGxpY2F0aW9uOnpvb20nOiAtPiBpcGNSZW5kZXJlci5zZW5kKCdjb21tYW5kJywgJ2FwcGxpY2F0aW9uOnpvb20nKVxuICAgICAgJ2FwcGxpY2F0aW9uOmJyaW5nLWFsbC13aW5kb3dzLXRvLWZyb250JzogLT4gaXBjUmVuZGVyZXIuc2VuZCgnY29tbWFuZCcsICdhcHBsaWNhdGlvbjpicmluZy1hbGwtd2luZG93cy10by1mcm9udCcpXG4gICAgICAnYXBwbGljYXRpb246b3Blbi15b3VyLWNvbmZpZyc6IC0+IGlwY1JlbmRlcmVyLnNlbmQoJ2NvbW1hbmQnLCAnYXBwbGljYXRpb246b3Blbi15b3VyLWNvbmZpZycpXG4gICAgICAnYXBwbGljYXRpb246b3Blbi15b3VyLWluaXQtc2NyaXB0JzogLT4gaXBjUmVuZGVyZXIuc2VuZCgnY29tbWFuZCcsICdhcHBsaWNhdGlvbjpvcGVuLXlvdXItaW5pdC1zY3JpcHQnKVxuICAgICAgJ2FwcGxpY2F0aW9uOm9wZW4teW91ci1rZXltYXAnOiAtPiBpcGNSZW5kZXJlci5zZW5kKCdjb21tYW5kJywgJ2FwcGxpY2F0aW9uOm9wZW4teW91ci1rZXltYXAnKVxuICAgICAgJ2FwcGxpY2F0aW9uOm9wZW4teW91ci1zbmlwcGV0cyc6IC0+IGlwY1JlbmRlcmVyLnNlbmQoJ2NvbW1hbmQnLCAnYXBwbGljYXRpb246b3Blbi15b3VyLXNuaXBwZXRzJylcbiAgICAgICdhcHBsaWNhdGlvbjpvcGVuLXlvdXItc3R5bGVzaGVldCc6IC0+IGlwY1JlbmRlcmVyLnNlbmQoJ2NvbW1hbmQnLCAnYXBwbGljYXRpb246b3Blbi15b3VyLXN0eWxlc2hlZXQnKVxuICAgICAgJ2FwcGxpY2F0aW9uOm9wZW4tbGljZW5zZSc6IC0+IEBnZXRNb2RlbCgpLm9wZW5MaWNlbnNlKClcbiAgICAgICd3aW5kb3c6cnVuLXBhY2thZ2Utc3BlY3MnOiAtPiBAcnVuUGFja2FnZVNwZWNzKClcbiAgICAgICd3aW5kb3c6cnVuLWJlbmNobWFya3MnOiAtPiBAcnVuQmVuY2htYXJrcygpXG4gICAgICAnd2luZG93OnRvZ2dsZS1sZWZ0LWRvY2snOiAtPiBAZ2V0TW9kZWwoKS5nZXRMZWZ0RG9jaygpLnRvZ2dsZSgpXG4gICAgICAnd2luZG93OnRvZ2dsZS1yaWdodC1kb2NrJzogLT4gQGdldE1vZGVsKCkuZ2V0UmlnaHREb2NrKCkudG9nZ2xlKClcbiAgICAgICd3aW5kb3c6dG9nZ2xlLWJvdHRvbS1kb2NrJzogLT4gQGdldE1vZGVsKCkuZ2V0Qm90dG9tRG9jaygpLnRvZ2dsZSgpXG4gICAgICAnd2luZG93OmZvY3VzLW5leHQtcGFuZSc6IC0+IEBnZXRNb2RlbCgpLmFjdGl2YXRlTmV4dFBhbmUoKVxuICAgICAgJ3dpbmRvdzpmb2N1cy1wcmV2aW91cy1wYW5lJzogLT4gQGdldE1vZGVsKCkuYWN0aXZhdGVQcmV2aW91c1BhbmUoKVxuICAgICAgJ3dpbmRvdzpmb2N1cy1wYW5lLWFib3ZlJzogLT4gQGZvY3VzUGFuZVZpZXdBYm92ZSgpXG4gICAgICAnd2luZG93OmZvY3VzLXBhbmUtYmVsb3cnOiAtPiBAZm9jdXNQYW5lVmlld0JlbG93KClcbiAgICAgICd3aW5kb3c6Zm9jdXMtcGFuZS1vbi1sZWZ0JzogLT4gQGZvY3VzUGFuZVZpZXdPbkxlZnQoKVxuICAgICAgJ3dpbmRvdzpmb2N1cy1wYW5lLW9uLXJpZ2h0JzogLT4gQGZvY3VzUGFuZVZpZXdPblJpZ2h0KClcbiAgICAgICd3aW5kb3c6bW92ZS1hY3RpdmUtaXRlbS10by1wYW5lLWFib3ZlJzogLT4gQG1vdmVBY3RpdmVJdGVtVG9QYW5lQWJvdmUoKVxuICAgICAgJ3dpbmRvdzptb3ZlLWFjdGl2ZS1pdGVtLXRvLXBhbmUtYmVsb3cnOiAtPiBAbW92ZUFjdGl2ZUl0ZW1Ub1BhbmVCZWxvdygpXG4gICAgICAnd2luZG93Om1vdmUtYWN0aXZlLWl0ZW0tdG8tcGFuZS1vbi1sZWZ0JzogLT4gQG1vdmVBY3RpdmVJdGVtVG9QYW5lT25MZWZ0KClcbiAgICAgICd3aW5kb3c6bW92ZS1hY3RpdmUtaXRlbS10by1wYW5lLW9uLXJpZ2h0JzogLT4gQG1vdmVBY3RpdmVJdGVtVG9QYW5lT25SaWdodCgpXG4gICAgICAnd2luZG93OmNvcHktYWN0aXZlLWl0ZW0tdG8tcGFuZS1hYm92ZSc6IC0+IEBtb3ZlQWN0aXZlSXRlbVRvUGFuZUFib3ZlKGtlZXBPcmlnaW5hbDogdHJ1ZSlcbiAgICAgICd3aW5kb3c6Y29weS1hY3RpdmUtaXRlbS10by1wYW5lLWJlbG93JzogLT4gQG1vdmVBY3RpdmVJdGVtVG9QYW5lQmVsb3coa2VlcE9yaWdpbmFsOiB0cnVlKVxuICAgICAgJ3dpbmRvdzpjb3B5LWFjdGl2ZS1pdGVtLXRvLXBhbmUtb24tbGVmdCc6IC0+IEBtb3ZlQWN0aXZlSXRlbVRvUGFuZU9uTGVmdChrZWVwT3JpZ2luYWw6IHRydWUpXG4gICAgICAnd2luZG93OmNvcHktYWN0aXZlLWl0ZW0tdG8tcGFuZS1vbi1yaWdodCc6IC0+IEBtb3ZlQWN0aXZlSXRlbVRvUGFuZU9uUmlnaHQoa2VlcE9yaWdpbmFsOiB0cnVlKVxuICAgICAgJ3dpbmRvdzpzYXZlLWFsbCc6IC0+IEBnZXRNb2RlbCgpLnNhdmVBbGwoKVxuICAgICAgJ3dpbmRvdzp0b2dnbGUtaW52aXNpYmxlcyc6IC0+IGNvbmZpZy5zZXQoXCJlZGl0b3Iuc2hvd0ludmlzaWJsZXNcIiwgbm90IGNvbmZpZy5nZXQoXCJlZGl0b3Iuc2hvd0ludmlzaWJsZXNcIikpXG4gICAgICAnd2luZG93OmxvZy1kZXByZWNhdGlvbi13YXJuaW5ncyc6IC0+IEdyaW0ubG9nRGVwcmVjYXRpb25zKClcbiAgICAgICd3aW5kb3c6dG9nZ2xlLWF1dG8taW5kZW50JzogLT4gY29uZmlnLnNldChcImVkaXRvci5hdXRvSW5kZW50XCIsIG5vdCBjb25maWcuZ2V0KFwiZWRpdG9yLmF1dG9JbmRlbnRcIikpXG4gICAgICAncGFuZTpyZW9wZW4tY2xvc2VkLWl0ZW0nOiAtPiBAZ2V0TW9kZWwoKS5yZW9wZW5JdGVtKClcbiAgICAgICdjb3JlOmNsb3NlJzogLT4gQGdldE1vZGVsKCkuY2xvc2VBY3RpdmVQYW5lSXRlbU9yRW1wdHlQYW5lT3JXaW5kb3coKVxuICAgICAgJ2NvcmU6c2F2ZSc6IC0+IEBnZXRNb2RlbCgpLnNhdmVBY3RpdmVQYW5lSXRlbSgpXG4gICAgICAnY29yZTpzYXZlLWFzJzogLT4gQGdldE1vZGVsKCkuc2F2ZUFjdGl2ZVBhbmVJdGVtQXMoKVxuICAgIH0sXG4gICAgZmFsc2VcbiAgKVxuXG5cbiAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnZGFyd2luJ1xuICAgIGNvbW1hbmRSZWdpc3RyeS5hZGQoXG4gICAgICAnYXRvbS13b3Jrc3BhY2UnLFxuICAgICAgJ3dpbmRvdzppbnN0YWxsLXNoZWxsLWNvbW1hbmRzJyxcbiAgICAgICgtPiBjb21tYW5kSW5zdGFsbGVyLmluc3RhbGxTaGVsbENvbW1hbmRzSW50ZXJhY3RpdmVseSgpKSxcbiAgICAgIGZhbHNlXG4gICAgKVxuXG4gIGNvbW1hbmRSZWdpc3RyeS5hZGQoXG4gICAgJ2F0b20tcGFuZScsXG4gICAge1xuICAgICAgJ3BhbmU6c2F2ZS1pdGVtcyc6IC0+IEBnZXRNb2RlbCgpLnNhdmVJdGVtcygpXG4gICAgICAncGFuZTpzcGxpdC1sZWZ0JzogLT4gQGdldE1vZGVsKCkuc3BsaXRMZWZ0KClcbiAgICAgICdwYW5lOnNwbGl0LXJpZ2h0JzogLT4gQGdldE1vZGVsKCkuc3BsaXRSaWdodCgpXG4gICAgICAncGFuZTpzcGxpdC11cCc6IC0+IEBnZXRNb2RlbCgpLnNwbGl0VXAoKVxuICAgICAgJ3BhbmU6c3BsaXQtZG93bic6IC0+IEBnZXRNb2RlbCgpLnNwbGl0RG93bigpXG4gICAgICAncGFuZTpzcGxpdC1sZWZ0LWFuZC1jb3B5LWFjdGl2ZS1pdGVtJzogLT4gQGdldE1vZGVsKCkuc3BsaXRMZWZ0KGNvcHlBY3RpdmVJdGVtOiB0cnVlKVxuICAgICAgJ3BhbmU6c3BsaXQtcmlnaHQtYW5kLWNvcHktYWN0aXZlLWl0ZW0nOiAtPiBAZ2V0TW9kZWwoKS5zcGxpdFJpZ2h0KGNvcHlBY3RpdmVJdGVtOiB0cnVlKVxuICAgICAgJ3BhbmU6c3BsaXQtdXAtYW5kLWNvcHktYWN0aXZlLWl0ZW0nOiAtPiBAZ2V0TW9kZWwoKS5zcGxpdFVwKGNvcHlBY3RpdmVJdGVtOiB0cnVlKVxuICAgICAgJ3BhbmU6c3BsaXQtZG93bi1hbmQtY29weS1hY3RpdmUtaXRlbSc6IC0+IEBnZXRNb2RlbCgpLnNwbGl0RG93bihjb3B5QWN0aXZlSXRlbTogdHJ1ZSlcbiAgICAgICdwYW5lOnNwbGl0LWxlZnQtYW5kLW1vdmUtYWN0aXZlLWl0ZW0nOiAtPiBAZ2V0TW9kZWwoKS5zcGxpdExlZnQobW92ZUFjdGl2ZUl0ZW06IHRydWUpXG4gICAgICAncGFuZTpzcGxpdC1yaWdodC1hbmQtbW92ZS1hY3RpdmUtaXRlbSc6IC0+IEBnZXRNb2RlbCgpLnNwbGl0UmlnaHQobW92ZUFjdGl2ZUl0ZW06IHRydWUpXG4gICAgICAncGFuZTpzcGxpdC11cC1hbmQtbW92ZS1hY3RpdmUtaXRlbSc6IC0+IEBnZXRNb2RlbCgpLnNwbGl0VXAobW92ZUFjdGl2ZUl0ZW06IHRydWUpXG4gICAgICAncGFuZTpzcGxpdC1kb3duLWFuZC1tb3ZlLWFjdGl2ZS1pdGVtJzogLT4gQGdldE1vZGVsKCkuc3BsaXREb3duKG1vdmVBY3RpdmVJdGVtOiB0cnVlKVxuICAgICAgJ3BhbmU6Y2xvc2UnOiAtPiBAZ2V0TW9kZWwoKS5jbG9zZSgpXG4gICAgICAncGFuZTpjbG9zZS1vdGhlci1pdGVtcyc6IC0+IEBnZXRNb2RlbCgpLmRlc3Ryb3lJbmFjdGl2ZUl0ZW1zKClcbiAgICAgICdwYW5lOmluY3JlYXNlLXNpemUnOiAtPiBAZ2V0TW9kZWwoKS5pbmNyZWFzZVNpemUoKVxuICAgICAgJ3BhbmU6ZGVjcmVhc2Utc2l6ZSc6IC0+IEBnZXRNb2RlbCgpLmRlY3JlYXNlU2l6ZSgpXG4gICAgfSxcbiAgICBmYWxzZVxuICApXG5cbiAgY29tbWFuZFJlZ2lzdHJ5LmFkZChcbiAgICAnYXRvbS10ZXh0LWVkaXRvcicsXG4gICAgc3RvcEV2ZW50UHJvcGFnYXRpb24oe1xuICAgICAgJ2NvcmU6dW5kbyc6IC0+IEB1bmRvKClcbiAgICAgICdjb3JlOnJlZG8nOiAtPiBAcmVkbygpXG4gICAgICAnY29yZTptb3ZlLWxlZnQnOiAtPiBAbW92ZUxlZnQoKVxuICAgICAgJ2NvcmU6bW92ZS1yaWdodCc6IC0+IEBtb3ZlUmlnaHQoKVxuICAgICAgJ2NvcmU6c2VsZWN0LWxlZnQnOiAtPiBAc2VsZWN0TGVmdCgpXG4gICAgICAnY29yZTpzZWxlY3QtcmlnaHQnOiAtPiBAc2VsZWN0UmlnaHQoKVxuICAgICAgJ2NvcmU6c2VsZWN0LXVwJzogLT4gQHNlbGVjdFVwKClcbiAgICAgICdjb3JlOnNlbGVjdC1kb3duJzogLT4gQHNlbGVjdERvd24oKVxuICAgICAgJ2NvcmU6c2VsZWN0LWFsbCc6IC0+IEBzZWxlY3RBbGwoKVxuICAgICAgJ2VkaXRvcjpzZWxlY3Qtd29yZCc6IC0+IEBzZWxlY3RXb3Jkc0NvbnRhaW5pbmdDdXJzb3JzKClcbiAgICAgICdlZGl0b3I6Y29uc29saWRhdGUtc2VsZWN0aW9ucyc6IChldmVudCkgLT4gZXZlbnQuYWJvcnRLZXlCaW5kaW5nKCkgdW5sZXNzIEBjb25zb2xpZGF0ZVNlbGVjdGlvbnMoKVxuICAgICAgJ2VkaXRvcjptb3ZlLXRvLWJlZ2lubmluZy1vZi1uZXh0LXBhcmFncmFwaCc6IC0+IEBtb3ZlVG9CZWdpbm5pbmdPZk5leHRQYXJhZ3JhcGgoKVxuICAgICAgJ2VkaXRvcjptb3ZlLXRvLWJlZ2lubmluZy1vZi1wcmV2aW91cy1wYXJhZ3JhcGgnOiAtPiBAbW92ZVRvQmVnaW5uaW5nT2ZQcmV2aW91c1BhcmFncmFwaCgpXG4gICAgICAnZWRpdG9yOm1vdmUtdG8tYmVnaW5uaW5nLW9mLXNjcmVlbi1saW5lJzogLT4gQG1vdmVUb0JlZ2lubmluZ09mU2NyZWVuTGluZSgpXG4gICAgICAnZWRpdG9yOm1vdmUtdG8tYmVnaW5uaW5nLW9mLWxpbmUnOiAtPiBAbW92ZVRvQmVnaW5uaW5nT2ZMaW5lKClcbiAgICAgICdlZGl0b3I6bW92ZS10by1lbmQtb2Ytc2NyZWVuLWxpbmUnOiAtPiBAbW92ZVRvRW5kT2ZTY3JlZW5MaW5lKClcbiAgICAgICdlZGl0b3I6bW92ZS10by1lbmQtb2YtbGluZSc6IC0+IEBtb3ZlVG9FbmRPZkxpbmUoKVxuICAgICAgJ2VkaXRvcjptb3ZlLXRvLWZpcnN0LWNoYXJhY3Rlci1vZi1saW5lJzogLT4gQG1vdmVUb0ZpcnN0Q2hhcmFjdGVyT2ZMaW5lKClcbiAgICAgICdlZGl0b3I6bW92ZS10by1iZWdpbm5pbmctb2Ytd29yZCc6IC0+IEBtb3ZlVG9CZWdpbm5pbmdPZldvcmQoKVxuICAgICAgJ2VkaXRvcjptb3ZlLXRvLWVuZC1vZi13b3JkJzogLT4gQG1vdmVUb0VuZE9mV29yZCgpXG4gICAgICAnZWRpdG9yOm1vdmUtdG8tYmVnaW5uaW5nLW9mLW5leHQtd29yZCc6IC0+IEBtb3ZlVG9CZWdpbm5pbmdPZk5leHRXb3JkKClcbiAgICAgICdlZGl0b3I6bW92ZS10by1wcmV2aW91cy13b3JkLWJvdW5kYXJ5JzogLT4gQG1vdmVUb1ByZXZpb3VzV29yZEJvdW5kYXJ5KClcbiAgICAgICdlZGl0b3I6bW92ZS10by1uZXh0LXdvcmQtYm91bmRhcnknOiAtPiBAbW92ZVRvTmV4dFdvcmRCb3VuZGFyeSgpXG4gICAgICAnZWRpdG9yOm1vdmUtdG8tcHJldmlvdXMtc3Vid29yZC1ib3VuZGFyeSc6IC0+IEBtb3ZlVG9QcmV2aW91c1N1YndvcmRCb3VuZGFyeSgpXG4gICAgICAnZWRpdG9yOm1vdmUtdG8tbmV4dC1zdWJ3b3JkLWJvdW5kYXJ5JzogLT4gQG1vdmVUb05leHRTdWJ3b3JkQm91bmRhcnkoKVxuICAgICAgJ2VkaXRvcjpzZWxlY3QtdG8tYmVnaW5uaW5nLW9mLW5leHQtcGFyYWdyYXBoJzogLT4gQHNlbGVjdFRvQmVnaW5uaW5nT2ZOZXh0UGFyYWdyYXBoKClcbiAgICAgICdlZGl0b3I6c2VsZWN0LXRvLWJlZ2lubmluZy1vZi1wcmV2aW91cy1wYXJhZ3JhcGgnOiAtPiBAc2VsZWN0VG9CZWdpbm5pbmdPZlByZXZpb3VzUGFyYWdyYXBoKClcbiAgICAgICdlZGl0b3I6c2VsZWN0LXRvLWVuZC1vZi1saW5lJzogLT4gQHNlbGVjdFRvRW5kT2ZMaW5lKClcbiAgICAgICdlZGl0b3I6c2VsZWN0LXRvLWJlZ2lubmluZy1vZi1saW5lJzogLT4gQHNlbGVjdFRvQmVnaW5uaW5nT2ZMaW5lKClcbiAgICAgICdlZGl0b3I6c2VsZWN0LXRvLWVuZC1vZi13b3JkJzogLT4gQHNlbGVjdFRvRW5kT2ZXb3JkKClcbiAgICAgICdlZGl0b3I6c2VsZWN0LXRvLWJlZ2lubmluZy1vZi13b3JkJzogLT4gQHNlbGVjdFRvQmVnaW5uaW5nT2ZXb3JkKClcbiAgICAgICdlZGl0b3I6c2VsZWN0LXRvLWJlZ2lubmluZy1vZi1uZXh0LXdvcmQnOiAtPiBAc2VsZWN0VG9CZWdpbm5pbmdPZk5leHRXb3JkKClcbiAgICAgICdlZGl0b3I6c2VsZWN0LXRvLW5leHQtd29yZC1ib3VuZGFyeSc6IC0+IEBzZWxlY3RUb05leHRXb3JkQm91bmRhcnkoKVxuICAgICAgJ2VkaXRvcjpzZWxlY3QtdG8tcHJldmlvdXMtd29yZC1ib3VuZGFyeSc6IC0+IEBzZWxlY3RUb1ByZXZpb3VzV29yZEJvdW5kYXJ5KClcbiAgICAgICdlZGl0b3I6c2VsZWN0LXRvLW5leHQtc3Vid29yZC1ib3VuZGFyeSc6IC0+IEBzZWxlY3RUb05leHRTdWJ3b3JkQm91bmRhcnkoKVxuICAgICAgJ2VkaXRvcjpzZWxlY3QtdG8tcHJldmlvdXMtc3Vid29yZC1ib3VuZGFyeSc6IC0+IEBzZWxlY3RUb1ByZXZpb3VzU3Vid29yZEJvdW5kYXJ5KClcbiAgICAgICdlZGl0b3I6c2VsZWN0LXRvLWZpcnN0LWNoYXJhY3Rlci1vZi1saW5lJzogLT4gQHNlbGVjdFRvRmlyc3RDaGFyYWN0ZXJPZkxpbmUoKVxuICAgICAgJ2VkaXRvcjpzZWxlY3QtbGluZSc6IC0+IEBzZWxlY3RMaW5lc0NvbnRhaW5pbmdDdXJzb3JzKClcbiAgICB9KSxcbiAgICBmYWxzZVxuICApXG5cbiAgY29tbWFuZFJlZ2lzdHJ5LmFkZChcbiAgICAnYXRvbS10ZXh0LWVkaXRvcicsXG4gICAgc3RvcEV2ZW50UHJvcGFnYXRpb25BbmRHcm91cFVuZG8oXG4gICAgICBjb25maWcsXG4gICAgICB7XG4gICAgICAgICdjb3JlOmJhY2tzcGFjZSc6IC0+IEBiYWNrc3BhY2UoKVxuICAgICAgICAnY29yZTpkZWxldGUnOiAtPiBAZGVsZXRlKClcbiAgICAgICAgJ2NvcmU6Y3V0JzogLT4gQGN1dFNlbGVjdGVkVGV4dCgpXG4gICAgICAgICdjb3JlOmNvcHknOiAtPiBAY29weVNlbGVjdGVkVGV4dCgpXG4gICAgICAgICdjb3JlOnBhc3RlJzogLT4gQHBhc3RlVGV4dCgpXG4gICAgICAgICdlZGl0b3I6ZGVsZXRlLXRvLXByZXZpb3VzLXdvcmQtYm91bmRhcnknOiAtPiBAZGVsZXRlVG9QcmV2aW91c1dvcmRCb3VuZGFyeSgpXG4gICAgICAgICdlZGl0b3I6ZGVsZXRlLXRvLW5leHQtd29yZC1ib3VuZGFyeSc6IC0+IEBkZWxldGVUb05leHRXb3JkQm91bmRhcnkoKVxuICAgICAgICAnZWRpdG9yOmRlbGV0ZS10by1iZWdpbm5pbmctb2Ytd29yZCc6IC0+IEBkZWxldGVUb0JlZ2lubmluZ09mV29yZCgpXG4gICAgICAgICdlZGl0b3I6ZGVsZXRlLXRvLWJlZ2lubmluZy1vZi1saW5lJzogLT4gQGRlbGV0ZVRvQmVnaW5uaW5nT2ZMaW5lKClcbiAgICAgICAgJ2VkaXRvcjpkZWxldGUtdG8tZW5kLW9mLWxpbmUnOiAtPiBAZGVsZXRlVG9FbmRPZkxpbmUoKVxuICAgICAgICAnZWRpdG9yOmRlbGV0ZS10by1lbmQtb2Ytd29yZCc6IC0+IEBkZWxldGVUb0VuZE9mV29yZCgpXG4gICAgICAgICdlZGl0b3I6ZGVsZXRlLXRvLWJlZ2lubmluZy1vZi1zdWJ3b3JkJzogLT4gQGRlbGV0ZVRvQmVnaW5uaW5nT2ZTdWJ3b3JkKClcbiAgICAgICAgJ2VkaXRvcjpkZWxldGUtdG8tZW5kLW9mLXN1YndvcmQnOiAtPiBAZGVsZXRlVG9FbmRPZlN1YndvcmQoKVxuICAgICAgICAnZWRpdG9yOmRlbGV0ZS1saW5lJzogLT4gQGRlbGV0ZUxpbmUoKVxuICAgICAgICAnZWRpdG9yOmN1dC10by1lbmQtb2YtbGluZSc6IC0+IEBjdXRUb0VuZE9mTGluZSgpXG4gICAgICAgICdlZGl0b3I6Y3V0LXRvLWVuZC1vZi1idWZmZXItbGluZSc6IC0+IEBjdXRUb0VuZE9mQnVmZmVyTGluZSgpXG4gICAgICAgICdlZGl0b3I6dHJhbnNwb3NlJzogLT4gQHRyYW5zcG9zZSgpXG4gICAgICAgICdlZGl0b3I6dXBwZXItY2FzZSc6IC0+IEB1cHBlckNhc2UoKVxuICAgICAgICAnZWRpdG9yOmxvd2VyLWNhc2UnOiAtPiBAbG93ZXJDYXNlKClcbiAgICAgICAgJ2VkaXRvcjpjb3B5LXNlbGVjdGlvbic6IC0+IEBjb3B5T25seVNlbGVjdGVkVGV4dCgpXG4gICAgICB9XG4gICAgKSxcbiAgICBmYWxzZVxuICApXG5cbiAgY29tbWFuZFJlZ2lzdHJ5LmFkZChcbiAgICAnYXRvbS10ZXh0LWVkaXRvcjpub3QoW21pbmldKScsXG4gICAgc3RvcEV2ZW50UHJvcGFnYXRpb24oe1xuICAgICAgJ2NvcmU6bW92ZS11cCc6IC0+IEBtb3ZlVXAoKVxuICAgICAgJ2NvcmU6bW92ZS1kb3duJzogLT4gQG1vdmVEb3duKClcbiAgICAgICdjb3JlOm1vdmUtdG8tdG9wJzogLT4gQG1vdmVUb1RvcCgpXG4gICAgICAnY29yZTptb3ZlLXRvLWJvdHRvbSc6IC0+IEBtb3ZlVG9Cb3R0b20oKVxuICAgICAgJ2NvcmU6cGFnZS11cCc6IC0+IEBwYWdlVXAoKVxuICAgICAgJ2NvcmU6cGFnZS1kb3duJzogLT4gQHBhZ2VEb3duKClcbiAgICAgICdjb3JlOnNlbGVjdC10by10b3AnOiAtPiBAc2VsZWN0VG9Ub3AoKVxuICAgICAgJ2NvcmU6c2VsZWN0LXRvLWJvdHRvbSc6IC0+IEBzZWxlY3RUb0JvdHRvbSgpXG4gICAgICAnY29yZTpzZWxlY3QtcGFnZS11cCc6IC0+IEBzZWxlY3RQYWdlVXAoKVxuICAgICAgJ2NvcmU6c2VsZWN0LXBhZ2UtZG93bic6IC0+IEBzZWxlY3RQYWdlRG93bigpXG4gICAgICAnZWRpdG9yOmFkZC1zZWxlY3Rpb24tYmVsb3cnOiAtPiBAYWRkU2VsZWN0aW9uQmVsb3coKVxuICAgICAgJ2VkaXRvcjphZGQtc2VsZWN0aW9uLWFib3ZlJzogLT4gQGFkZFNlbGVjdGlvbkFib3ZlKClcbiAgICAgICdlZGl0b3I6c3BsaXQtc2VsZWN0aW9ucy1pbnRvLWxpbmVzJzogLT4gQHNwbGl0U2VsZWN0aW9uc0ludG9MaW5lcygpXG4gICAgICAnZWRpdG9yOnRvZ2dsZS1zb2Z0LXRhYnMnOiAtPiBAdG9nZ2xlU29mdFRhYnMoKVxuICAgICAgJ2VkaXRvcjp0b2dnbGUtc29mdC13cmFwJzogLT4gQHRvZ2dsZVNvZnRXcmFwcGVkKClcbiAgICAgICdlZGl0b3I6Zm9sZC1hbGwnOiAtPiBAZm9sZEFsbCgpXG4gICAgICAnZWRpdG9yOnVuZm9sZC1hbGwnOiAtPiBAdW5mb2xkQWxsKClcbiAgICAgICdlZGl0b3I6Zm9sZC1jdXJyZW50LXJvdyc6IC0+IEBmb2xkQ3VycmVudFJvdygpXG4gICAgICAnZWRpdG9yOnVuZm9sZC1jdXJyZW50LXJvdyc6IC0+IEB1bmZvbGRDdXJyZW50Um93KClcbiAgICAgICdlZGl0b3I6Zm9sZC1zZWxlY3Rpb24nOiAtPiBAZm9sZFNlbGVjdGVkTGluZXMoKVxuICAgICAgJ2VkaXRvcjpmb2xkLWF0LWluZGVudC1sZXZlbC0xJzogLT4gQGZvbGRBbGxBdEluZGVudExldmVsKDApXG4gICAgICAnZWRpdG9yOmZvbGQtYXQtaW5kZW50LWxldmVsLTInOiAtPiBAZm9sZEFsbEF0SW5kZW50TGV2ZWwoMSlcbiAgICAgICdlZGl0b3I6Zm9sZC1hdC1pbmRlbnQtbGV2ZWwtMyc6IC0+IEBmb2xkQWxsQXRJbmRlbnRMZXZlbCgyKVxuICAgICAgJ2VkaXRvcjpmb2xkLWF0LWluZGVudC1sZXZlbC00JzogLT4gQGZvbGRBbGxBdEluZGVudExldmVsKDMpXG4gICAgICAnZWRpdG9yOmZvbGQtYXQtaW5kZW50LWxldmVsLTUnOiAtPiBAZm9sZEFsbEF0SW5kZW50TGV2ZWwoNClcbiAgICAgICdlZGl0b3I6Zm9sZC1hdC1pbmRlbnQtbGV2ZWwtNic6IC0+IEBmb2xkQWxsQXRJbmRlbnRMZXZlbCg1KVxuICAgICAgJ2VkaXRvcjpmb2xkLWF0LWluZGVudC1sZXZlbC03JzogLT4gQGZvbGRBbGxBdEluZGVudExldmVsKDYpXG4gICAgICAnZWRpdG9yOmZvbGQtYXQtaW5kZW50LWxldmVsLTgnOiAtPiBAZm9sZEFsbEF0SW5kZW50TGV2ZWwoNylcbiAgICAgICdlZGl0b3I6Zm9sZC1hdC1pbmRlbnQtbGV2ZWwtOSc6IC0+IEBmb2xkQWxsQXRJbmRlbnRMZXZlbCg4KVxuICAgICAgJ2VkaXRvcjpsb2ctY3Vyc29yLXNjb3BlJzogLT4gc2hvd0N1cnNvclNjb3BlKEBnZXRDdXJzb3JTY29wZSgpLCBub3RpZmljYXRpb25NYW5hZ2VyKVxuICAgICAgJ2VkaXRvcjpjb3B5LXBhdGgnOiAtPiBjb3B5UGF0aFRvQ2xpcGJvYXJkKHRoaXMsIHByb2plY3QsIGNsaXBib2FyZCwgZmFsc2UpXG4gICAgICAnZWRpdG9yOmNvcHktcHJvamVjdC1wYXRoJzogLT4gY29weVBhdGhUb0NsaXBib2FyZCh0aGlzLCBwcm9qZWN0LCBjbGlwYm9hcmQsIHRydWUpXG4gICAgICAnZWRpdG9yOnRvZ2dsZS1pbmRlbnQtZ3VpZGUnOiAtPiBjb25maWcuc2V0KCdlZGl0b3Iuc2hvd0luZGVudEd1aWRlJywgbm90IGNvbmZpZy5nZXQoJ2VkaXRvci5zaG93SW5kZW50R3VpZGUnKSlcbiAgICAgICdlZGl0b3I6dG9nZ2xlLWxpbmUtbnVtYmVycyc6IC0+IGNvbmZpZy5zZXQoJ2VkaXRvci5zaG93TGluZU51bWJlcnMnLCBub3QgY29uZmlnLmdldCgnZWRpdG9yLnNob3dMaW5lTnVtYmVycycpKVxuICAgICAgJ2VkaXRvcjpzY3JvbGwtdG8tY3Vyc29yJzogLT4gQHNjcm9sbFRvQ3Vyc29yUG9zaXRpb24oKVxuICAgIH0pLFxuICAgIGZhbHNlXG4gIClcblxuICBjb21tYW5kUmVnaXN0cnkuYWRkKFxuICAgICdhdG9tLXRleHQtZWRpdG9yOm5vdChbbWluaV0pJyxcbiAgICBzdG9wRXZlbnRQcm9wYWdhdGlvbkFuZEdyb3VwVW5kbyhcbiAgICAgIGNvbmZpZyxcbiAgICAgIHtcbiAgICAgICAgJ2VkaXRvcjppbmRlbnQnOiAtPiBAaW5kZW50KClcbiAgICAgICAgJ2VkaXRvcjphdXRvLWluZGVudCc6IC0+IEBhdXRvSW5kZW50U2VsZWN0ZWRSb3dzKClcbiAgICAgICAgJ2VkaXRvcjppbmRlbnQtc2VsZWN0ZWQtcm93cyc6IC0+IEBpbmRlbnRTZWxlY3RlZFJvd3MoKVxuICAgICAgICAnZWRpdG9yOm91dGRlbnQtc2VsZWN0ZWQtcm93cyc6IC0+IEBvdXRkZW50U2VsZWN0ZWRSb3dzKClcbiAgICAgICAgJ2VkaXRvcjpuZXdsaW5lJzogLT4gQGluc2VydE5ld2xpbmUoKVxuICAgICAgICAnZWRpdG9yOm5ld2xpbmUtYmVsb3cnOiAtPiBAaW5zZXJ0TmV3bGluZUJlbG93KClcbiAgICAgICAgJ2VkaXRvcjpuZXdsaW5lLWFib3ZlJzogLT4gQGluc2VydE5ld2xpbmVBYm92ZSgpXG4gICAgICAgICdlZGl0b3I6dG9nZ2xlLWxpbmUtY29tbWVudHMnOiAtPiBAdG9nZ2xlTGluZUNvbW1lbnRzSW5TZWxlY3Rpb24oKVxuICAgICAgICAnZWRpdG9yOmNoZWNrb3V0LWhlYWQtcmV2aXNpb24nOiAtPiBhdG9tLndvcmtzcGFjZS5jaGVja291dEhlYWRSZXZpc2lvbih0aGlzKVxuICAgICAgICAnZWRpdG9yOm1vdmUtbGluZS11cCc6IC0+IEBtb3ZlTGluZVVwKClcbiAgICAgICAgJ2VkaXRvcjptb3ZlLWxpbmUtZG93bic6IC0+IEBtb3ZlTGluZURvd24oKVxuICAgICAgICAnZWRpdG9yOm1vdmUtc2VsZWN0aW9uLWxlZnQnOiAtPiBAbW92ZVNlbGVjdGlvbkxlZnQoKVxuICAgICAgICAnZWRpdG9yOm1vdmUtc2VsZWN0aW9uLXJpZ2h0JzogLT4gQG1vdmVTZWxlY3Rpb25SaWdodCgpXG4gICAgICAgICdlZGl0b3I6ZHVwbGljYXRlLWxpbmVzJzogLT4gQGR1cGxpY2F0ZUxpbmVzKClcbiAgICAgICAgJ2VkaXRvcjpqb2luLWxpbmVzJzogLT4gQGpvaW5MaW5lcygpXG4gICAgICB9XG4gICAgKSxcbiAgICBmYWxzZVxuICApXG5cbnN0b3BFdmVudFByb3BhZ2F0aW9uID0gKGNvbW1hbmRMaXN0ZW5lcnMpIC0+XG4gIG5ld0NvbW1hbmRMaXN0ZW5lcnMgPSB7fVxuICBmb3IgY29tbWFuZE5hbWUsIGNvbW1hbmRMaXN0ZW5lciBvZiBjb21tYW5kTGlzdGVuZXJzXG4gICAgZG8gKGNvbW1hbmRMaXN0ZW5lcikgLT5cbiAgICAgIG5ld0NvbW1hbmRMaXN0ZW5lcnNbY29tbWFuZE5hbWVdID0gKGV2ZW50KSAtPlxuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKVxuICAgICAgICBjb21tYW5kTGlzdGVuZXIuY2FsbChAZ2V0TW9kZWwoKSwgZXZlbnQpXG4gIG5ld0NvbW1hbmRMaXN0ZW5lcnNcblxuc3RvcEV2ZW50UHJvcGFnYXRpb25BbmRHcm91cFVuZG8gPSAoY29uZmlnLCBjb21tYW5kTGlzdGVuZXJzKSAtPlxuICBuZXdDb21tYW5kTGlzdGVuZXJzID0ge31cbiAgZm9yIGNvbW1hbmROYW1lLCBjb21tYW5kTGlzdGVuZXIgb2YgY29tbWFuZExpc3RlbmVyc1xuICAgIGRvIChjb21tYW5kTGlzdGVuZXIpIC0+XG4gICAgICBuZXdDb21tYW5kTGlzdGVuZXJzW2NvbW1hbmROYW1lXSA9IChldmVudCkgLT5cbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKClcbiAgICAgICAgbW9kZWwgPSBAZ2V0TW9kZWwoKVxuICAgICAgICBtb2RlbC50cmFuc2FjdCBtb2RlbC5nZXRVbmRvR3JvdXBpbmdJbnRlcnZhbCgpLCAtPlxuICAgICAgICAgIGNvbW1hbmRMaXN0ZW5lci5jYWxsKG1vZGVsLCBldmVudClcbiAgbmV3Q29tbWFuZExpc3RlbmVyc1xuXG5zaG93Q3Vyc29yU2NvcGUgPSAoZGVzY3JpcHRvciwgbm90aWZpY2F0aW9uTWFuYWdlcikgLT5cbiAgbGlzdCA9IGRlc2NyaXB0b3Iuc2NvcGVzLnRvU3RyaW5nKCkuc3BsaXQoJywnKVxuICBsaXN0ID0gbGlzdC5tYXAgKGl0ZW0pIC0+IFwiKiAje2l0ZW19XCJcbiAgY29udGVudCA9IFwiU2NvcGVzIGF0IEN1cnNvclxcbiN7bGlzdC5qb2luKCdcXG4nKX1cIlxuXG4gIG5vdGlmaWNhdGlvbk1hbmFnZXIuYWRkSW5mbyhjb250ZW50LCBkaXNtaXNzYWJsZTogdHJ1ZSlcblxuY29weVBhdGhUb0NsaXBib2FyZCA9IChlZGl0b3IsIHByb2plY3QsIGNsaXBib2FyZCwgcmVsYXRpdmUpIC0+XG4gIGlmIGZpbGVQYXRoID0gZWRpdG9yLmdldFBhdGgoKVxuICAgIGZpbGVQYXRoID0gcHJvamVjdC5yZWxhdGl2aXplKGZpbGVQYXRoKSBpZiByZWxhdGl2ZVxuICAgIGNsaXBib2FyZC53cml0ZShmaWxlUGF0aClcbiJdfQ==
