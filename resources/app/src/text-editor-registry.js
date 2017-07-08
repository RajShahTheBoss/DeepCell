Object.defineProperty(exports, '__esModule', {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, 'next'); var callThrow = step.bind(null, 'throw'); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

/** @babel */

var _eventKit = require('event-kit');

var _textBuffer = require('text-buffer');

var _textEditor = require('./text-editor');

var _textEditor2 = _interopRequireDefault(_textEditor);

var _scopeDescriptor = require('./scope-descriptor');

var _scopeDescriptor2 = _interopRequireDefault(_scopeDescriptor);

var EDITOR_PARAMS_BY_SETTING_KEY = [['core.fileEncoding', 'encoding'], ['editor.atomicSoftTabs', 'atomicSoftTabs'], ['editor.showInvisibles', 'showInvisibles'], ['editor.tabLength', 'tabLength'], ['editor.invisibles', 'invisibles'], ['editor.showCursorOnSelection', 'showCursorOnSelection'], ['editor.showIndentGuide', 'showIndentGuide'], ['editor.showLineNumbers', 'showLineNumbers'], ['editor.softWrap', 'softWrapped'], ['editor.softWrapHangingIndent', 'softWrapHangingIndentLength'], ['editor.softWrapAtPreferredLineLength', 'softWrapAtPreferredLineLength'], ['editor.preferredLineLength', 'preferredLineLength'], ['editor.autoIndent', 'autoIndent'], ['editor.autoIndentOnPaste', 'autoIndentOnPaste'], ['editor.scrollPastEnd', 'scrollPastEnd'], ['editor.undoGroupingInterval', 'undoGroupingInterval'], ['editor.nonWordCharacters', 'nonWordCharacters'], ['editor.scrollSensitivity', 'scrollSensitivity']];

var GRAMMAR_SELECTION_RANGE = (0, _textBuffer.Range)(_textBuffer.Point.ZERO, (0, _textBuffer.Point)(10, 0)).freeze();

// Experimental: This global registry tracks registered `TextEditors`.
//
// If you want to add functionality to a wider set of text editors than just
// those appearing within workspace panes, use `atom.textEditors.observe` to
// invoke a callback for all current and future registered text editors.
//
// If you want packages to be able to add functionality to your non-pane text
// editors (such as a search field in a custom user interface element), register
// them for observation via `atom.textEditors.add`. **Important:** When you're
// done using your editor, be sure to call `dispose` on the returned disposable
// to avoid leaking editors.

var TextEditorRegistry = (function () {
  function TextEditorRegistry(_ref) {
    var config = _ref.config;
    var grammarRegistry = _ref.grammarRegistry;
    var assert = _ref.assert;
    var packageManager = _ref.packageManager;

    _classCallCheck(this, TextEditorRegistry);

    this.assert = assert;
    this.config = config;
    this.grammarRegistry = grammarRegistry;
    this.scopedSettingsDelegate = new ScopedSettingsDelegate(config);
    this.grammarAddedOrUpdated = this.grammarAddedOrUpdated.bind(this);
    this.clear();

    this.initialPackageActivationPromise = new Promise(function (resolve) {
      // TODO: Remove this usage of a private property of PackageManager.
      // Should PackageManager just expose a promise-based API like this?
      if (packageManager.deferredActivationHooks) {
        packageManager.onDidActivateInitialPackages(resolve);
      } else {
        resolve();
      }
    });
  }

  _createClass(TextEditorRegistry, [{
    key: 'deserialize',
    value: function deserialize(state) {
      this.editorGrammarOverrides = state.editorGrammarOverrides;
    }
  }, {
    key: 'serialize',
    value: function serialize() {
      return {
        editorGrammarOverrides: Object.assign({}, this.editorGrammarOverrides)
      };
    }
  }, {
    key: 'clear',
    value: function clear() {
      if (this.subscriptions) {
        this.subscriptions.dispose();
      }

      this.subscriptions = new _eventKit.CompositeDisposable();
      this.editors = new Set();
      this.emitter = new _eventKit.Emitter();
      this.scopesWithConfigSubscriptions = new Set();
      this.editorsWithMaintainedConfig = new Set();
      this.editorsWithMaintainedGrammar = new Set();
      this.editorGrammarOverrides = {};
      this.editorGrammarScores = new WeakMap();
      this.subscriptions.add(this.grammarRegistry.onDidAddGrammar(this.grammarAddedOrUpdated), this.grammarRegistry.onDidUpdateGrammar(this.grammarAddedOrUpdated));
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.subscriptions.dispose();
      this.editorsWithMaintainedConfig = null;
    }

    // Register a `TextEditor`.
    //
    // * `editor` The editor to register.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to remove the
    // added editor. To avoid any memory leaks this should be called when the
    // editor is destroyed.
  }, {
    key: 'add',
    value: function add(editor) {
      var _this = this;

      this.editors.add(editor);
      editor.registered = true;
      this.emitter.emit('did-add-editor', editor);

      return new _eventKit.Disposable(function () {
        return _this.remove(editor);
      });
    }
  }, {
    key: 'build',
    value: function build(params) {
      params = Object.assign({ assert: this.assert }, params);

      var scope = null;
      if (params.buffer) {
        var filePath = params.buffer.getPath();
        var headContent = params.buffer.getTextInRange(GRAMMAR_SELECTION_RANGE);
        params.grammar = this.grammarRegistry.selectGrammar(filePath, headContent);
        scope = new _scopeDescriptor2['default']({ scopes: [params.grammar.scopeName] });
      }

      Object.assign(params, this.textEditorParamsForScope(scope));

      return new _textEditor2['default'](params);
    }

    // Remove a `TextEditor`.
    //
    // * `editor` The editor to remove.
    //
    // Returns a {Boolean} indicating whether the editor was successfully removed.
  }, {
    key: 'remove',
    value: function remove(editor) {
      var removed = this.editors['delete'](editor);
      editor.registered = false;
      return removed;
    }

    // Invoke the given callback with all the current and future registered
    // `TextEditors`.
    //
    // * `callback` {Function} to be called with current and future text editors.
    //
    // Returns a {Disposable} on which `.dispose()` can be called to unsubscribe.
  }, {
    key: 'observe',
    value: function observe(callback) {
      this.editors.forEach(callback);
      return this.emitter.on('did-add-editor', callback);
    }

    // Keep a {TextEditor}'s configuration in sync with Atom's settings.
    //
    // * `editor` The editor whose configuration will be maintained.
    //
    // Returns a {Disposable} that can be used to stop updating the editor's
    // configuration.
  }, {
    key: 'maintainConfig',
    value: function maintainConfig(editor) {
      var _this2 = this;

      if (this.editorsWithMaintainedConfig.has(editor)) {
        return new _eventKit.Disposable(noop);
      }
      this.editorsWithMaintainedConfig.add(editor);

      editor.setScopedSettingsDelegate(this.scopedSettingsDelegate);

      this.subscribeToSettingsForEditorScope(editor);
      var grammarChangeSubscription = editor.onDidChangeGrammar(function () {
        _this2.subscribeToSettingsForEditorScope(editor);
      });
      this.subscriptions.add(grammarChangeSubscription);

      var updateTabTypes = function updateTabTypes() {
        var configOptions = { scope: editor.getRootScopeDescriptor() };
        editor.setSoftTabs(shouldEditorUseSoftTabs(editor, _this2.config.get('editor.tabType', configOptions), _this2.config.get('editor.softTabs', configOptions)));
      };

      updateTabTypes();
      var tokenizeSubscription = editor.onDidTokenize(updateTabTypes);
      this.subscriptions.add(tokenizeSubscription);

      return new _eventKit.Disposable(function () {
        _this2.editorsWithMaintainedConfig['delete'](editor);
        editor.setScopedSettingsDelegate(null);
        tokenizeSubscription.dispose();
        grammarChangeSubscription.dispose();
        _this2.subscriptions.remove(grammarChangeSubscription);
        _this2.subscriptions.remove(tokenizeSubscription);
      });
    }

    // Set a {TextEditor}'s grammar based on its path and content, and continue
    // to update its grammar as grammars are added or updated, or the editor's
    // file path changes.
    //
    // * `editor` The editor whose grammar will be maintained.
    //
    // Returns a {Disposable} that can be used to stop updating the editor's
    // grammar.
  }, {
    key: 'maintainGrammar',
    value: function maintainGrammar(editor) {
      var _this3 = this;

      if (this.editorsWithMaintainedGrammar.has(editor)) {
        return new _eventKit.Disposable(noop);
      }

      this.editorsWithMaintainedGrammar.add(editor);

      var buffer = editor.getBuffer();
      for (var existingEditor of this.editorsWithMaintainedGrammar) {
        if (existingEditor.getBuffer() === buffer) {
          var existingOverride = this.editorGrammarOverrides[existingEditor.id];
          if (existingOverride) {
            this.editorGrammarOverrides[editor.id] = existingOverride;
          }
          break;
        }
      }

      this.selectGrammarForEditor(editor);

      var pathChangeSubscription = editor.onDidChangePath(function () {
        _this3.editorGrammarScores['delete'](editor);
        _this3.selectGrammarForEditor(editor);
      });

      this.subscriptions.add(pathChangeSubscription);

      return new _eventKit.Disposable(function () {
        delete _this3.editorGrammarOverrides[editor.id];
        _this3.editorsWithMaintainedGrammar['delete'](editor);
        _this3.subscriptions.remove(pathChangeSubscription);
        pathChangeSubscription.dispose();
      });
    }

    // Force a {TextEditor} to use a different grammar than the one that would
    // otherwise be selected for it.
    //
    // * `editor` The editor whose gramamr will be set.
    // * `scopeName` The {String} root scope name for the desired {Grammar}.
  }, {
    key: 'setGrammarOverride',
    value: function setGrammarOverride(editor, scopeName) {
      this.editorGrammarOverrides[editor.id] = scopeName;
      this.editorGrammarScores['delete'](editor);
      editor.setGrammar(this.grammarRegistry.grammarForScopeName(scopeName));
    }

    // Retrieve the grammar scope name that has been set as a grammar override
    // for the given {TextEditor}.
    //
    // * `editor` The editor.
    //
    // Returns a {String} scope name, or `null` if no override has been set
    // for the given editor.
  }, {
    key: 'getGrammarOverride',
    value: function getGrammarOverride(editor) {
      return this.editorGrammarOverrides[editor.id];
    }

    // Remove any grammar override that has been set for the given {TextEditor}.
    //
    // * `editor` The editor.
  }, {
    key: 'clearGrammarOverride',
    value: function clearGrammarOverride(editor) {
      delete this.editorGrammarOverrides[editor.id];
      this.selectGrammarForEditor(editor);
    }

    // Private

  }, {
    key: 'grammarAddedOrUpdated',
    value: function grammarAddedOrUpdated(grammar) {
      var _this4 = this;

      this.editorsWithMaintainedGrammar.forEach(function (editor) {
        if (grammar.injectionSelector) {
          if (editor.tokenizedBuffer.hasTokenForSelector(grammar.injectionSelector)) {
            editor.tokenizedBuffer.retokenizeLines();
          }
          return;
        }

        var grammarOverride = _this4.editorGrammarOverrides[editor.id];
        if (grammarOverride) {
          if (grammar.scopeName === grammarOverride) {
            editor.setGrammar(grammar);
          }
        } else {
          var score = _this4.grammarRegistry.getGrammarScore(grammar, editor.getPath(), editor.getTextInBufferRange(GRAMMAR_SELECTION_RANGE));

          var currentScore = _this4.editorGrammarScores.get(editor);
          if (currentScore == null || score > currentScore) {
            editor.setGrammar(grammar, score);
            _this4.editorGrammarScores.set(editor, score);
          }
        }
      });
    }
  }, {
    key: 'selectGrammarForEditor',
    value: function selectGrammarForEditor(editor) {
      var grammarOverride = this.editorGrammarOverrides[editor.id];

      if (grammarOverride) {
        var _grammar = this.grammarRegistry.grammarForScopeName(grammarOverride);
        editor.setGrammar(_grammar);
        return;
      }

      var _grammarRegistry$selectGrammarWithScore = this.grammarRegistry.selectGrammarWithScore(editor.getPath(), editor.getTextInBufferRange(GRAMMAR_SELECTION_RANGE));

      var grammar = _grammarRegistry$selectGrammarWithScore.grammar;
      var score = _grammarRegistry$selectGrammarWithScore.score;

      if (!grammar) {
        throw new Error('No grammar found for path: ' + editor.getPath());
      }

      var currentScore = this.editorGrammarScores.get(editor);
      if (currentScore == null || score > currentScore) {
        editor.setGrammar(grammar);
        this.editorGrammarScores.set(editor, score);
      }
    }
  }, {
    key: 'subscribeToSettingsForEditorScope',
    value: _asyncToGenerator(function* (editor) {
      var _this5 = this;

      yield this.initialPackageActivationPromise;

      var scopeDescriptor = editor.getRootScopeDescriptor();
      var scopeChain = scopeDescriptor.getScopeChain();

      editor.update(this.textEditorParamsForScope(scopeDescriptor));

      if (!this.scopesWithConfigSubscriptions.has(scopeChain)) {
        (function () {
          _this5.scopesWithConfigSubscriptions.add(scopeChain);
          var configOptions = { scope: scopeDescriptor };

          var _loop = function (_ref2) {
            _ref22 = _slicedToArray(_ref2, 2);
            var settingKey = _ref22[0];
            var paramName = _ref22[1];

            _this5.subscriptions.add(_this5.config.onDidChange(settingKey, configOptions, function (_ref3) {
              var newValue = _ref3.newValue;

              _this5.editorsWithMaintainedConfig.forEach(function (editor) {
                if (editor.getRootScopeDescriptor().isEqual(scopeDescriptor)) {
                  editor.update(_defineProperty({}, paramName, newValue));
                }
              });
            }));
          };

          for (var _ref2 of EDITOR_PARAMS_BY_SETTING_KEY) {
            var _ref22;

            _loop(_ref2);
          }

          var updateTabTypes = function updateTabTypes() {
            var tabType = _this5.config.get('editor.tabType', configOptions);
            var softTabs = _this5.config.get('editor.softTabs', configOptions);
            _this5.editorsWithMaintainedConfig.forEach(function (editor) {
              if (editor.getRootScopeDescriptor().isEqual(scopeDescriptor)) {
                editor.setSoftTabs(shouldEditorUseSoftTabs(editor, tabType, softTabs));
              }
            });
          };

          _this5.subscriptions.add(_this5.config.onDidChange('editor.tabType', configOptions, updateTabTypes), _this5.config.onDidChange('editor.softTabs', configOptions, updateTabTypes));
        })();
      }
    })
  }, {
    key: 'textEditorParamsForScope',
    value: function textEditorParamsForScope(scopeDescriptor) {
      var result = {};
      var configOptions = { scope: scopeDescriptor };
      for (var _ref43 of EDITOR_PARAMS_BY_SETTING_KEY) {
        var _ref42 = _slicedToArray(_ref43, 2);

        var settingKey = _ref42[0];
        var paramName = _ref42[1];

        result[paramName] = this.config.get(settingKey, configOptions);
      }
      return result;
    }
  }]);

  return TextEditorRegistry;
})();

exports['default'] = TextEditorRegistry;

function shouldEditorUseSoftTabs(editor, tabType, softTabs) {
  switch (tabType) {
    case 'hard':
      return false;
    case 'soft':
      return true;
    case 'auto':
      switch (editor.usesSoftTabs()) {
        case true:
          return true;
        case false:
          return false;
        default:
          return softTabs;
      }
  }
}

function noop() {}

var ScopedSettingsDelegate = (function () {
  function ScopedSettingsDelegate(config) {
    _classCallCheck(this, ScopedSettingsDelegate);

    this.config = config;
  }

  _createClass(ScopedSettingsDelegate, [{
    key: 'getNonWordCharacters',
    value: function getNonWordCharacters(scope) {
      return this.config.get('editor.nonWordCharacters', { scope: scope });
    }
  }, {
    key: 'getIncreaseIndentPattern',
    value: function getIncreaseIndentPattern(scope) {
      return this.config.get('editor.increaseIndentPattern', { scope: scope });
    }
  }, {
    key: 'getDecreaseIndentPattern',
    value: function getDecreaseIndentPattern(scope) {
      return this.config.get('editor.decreaseIndentPattern', { scope: scope });
    }
  }, {
    key: 'getDecreaseNextIndentPattern',
    value: function getDecreaseNextIndentPattern(scope) {
      return this.config.get('editor.decreaseNextIndentPattern', { scope: scope });
    }
  }, {
    key: 'getFoldEndPattern',
    value: function getFoldEndPattern(scope) {
      return this.config.get('editor.foldEndPattern', { scope: scope });
    }
  }, {
    key: 'getCommentStrings',
    value: function getCommentStrings(scope) {
      var commentStartEntries = this.config.getAll('editor.commentStart', { scope: scope });
      var commentEndEntries = this.config.getAll('editor.commentEnd', { scope: scope });
      var commentStartEntry = commentStartEntries[0];
      var commentEndEntry = commentEndEntries.find(function (entry) {
        return entry.scopeSelector === commentStartEntry.scopeSelector;
      });
      return {
        commentStartString: commentStartEntry && commentStartEntry.value,
        commentEndString: commentEndEntry && commentEndEntry.value
      };
    }
  }]);

  return ScopedSettingsDelegate;
})();

module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy90ZXh0LWVkaXRvci1yZWdpc3RyeS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7d0JBRXVELFdBQVc7OzBCQUN2QyxhQUFhOzswQkFDakIsZUFBZTs7OzsrQkFDVixvQkFBb0I7Ozs7QUFFaEQsSUFBTSw0QkFBNEIsR0FBRyxDQUNuQyxDQUFDLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxFQUNqQyxDQUFDLHVCQUF1QixFQUFFLGdCQUFnQixDQUFDLEVBQzNDLENBQUMsdUJBQXVCLEVBQUUsZ0JBQWdCLENBQUMsRUFDM0MsQ0FBQyxrQkFBa0IsRUFBRSxXQUFXLENBQUMsRUFDakMsQ0FBQyxtQkFBbUIsRUFBRSxZQUFZLENBQUMsRUFDbkMsQ0FBQyw4QkFBOEIsRUFBRSx1QkFBdUIsQ0FBQyxFQUN6RCxDQUFDLHdCQUF3QixFQUFFLGlCQUFpQixDQUFDLEVBQzdDLENBQUMsd0JBQXdCLEVBQUUsaUJBQWlCLENBQUMsRUFDN0MsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsRUFDbEMsQ0FBQyw4QkFBOEIsRUFBRSw2QkFBNkIsQ0FBQyxFQUMvRCxDQUFDLHNDQUFzQyxFQUFFLCtCQUErQixDQUFDLEVBQ3pFLENBQUMsNEJBQTRCLEVBQUUscUJBQXFCLENBQUMsRUFDckQsQ0FBQyxtQkFBbUIsRUFBRSxZQUFZLENBQUMsRUFDbkMsQ0FBQywwQkFBMEIsRUFBRSxtQkFBbUIsQ0FBQyxFQUNqRCxDQUFDLHNCQUFzQixFQUFFLGVBQWUsQ0FBQyxFQUN6QyxDQUFDLDZCQUE2QixFQUFFLHNCQUFzQixDQUFDLEVBQ3ZELENBQUMsMEJBQTBCLEVBQUUsbUJBQW1CLENBQUMsRUFDakQsQ0FBQywwQkFBMEIsRUFBRSxtQkFBbUIsQ0FBQyxDQUNsRCxDQUFBOztBQUVELElBQU0sdUJBQXVCLEdBQUcsdUJBQU0sa0JBQU0sSUFBSSxFQUFFLHVCQUFNLEVBQUUsRUFBRSxD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aUIsQ0FBQyxJQUFJLENBQUMsVUFBQyxLQUFLLEVBQUs7QUFDeEQsZUFBTyxLQUFLLENBQUMsYUFBYSxLQUFLLGlCQUFpQixDQUFDLGFBQWEsQ0FBQTtPQUMvRCxDQUFDLENBQUE7QUFDRixhQUFPO0FBQ0wsMEJBQWtCLEVBQUUsaUJBQWlCLElBQUksaUJBQWlCLENBQUMsS0FBSztBQUNoRSx3QkFBZ0IsRUFBRSxlQUFlLElBQUksZUFBZSxDQUFDLEtBQUs7T0FDM0QsQ0FBQTtLQUNGOzs7U0FwQ0csc0JBQXNCIiwiZmlsZSI6ImZpbGU6Ly8vQzovcHJvamVjdHMvYXRvbS9vdXQvYXBwL3NyYy90ZXh0LWVkaXRvci1yZWdpc3RyeS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKiBAYmFiZWwgKi9cblxuaW1wb3J0IHtFbWl0dGVyLCBEaXNwb3NhYmxlLCBDb21wb3NpdGVEaXNwb3NhYmxlfSBmcm9tICdldmVudC1raXQnXG5pbXBvcnQge1BvaW50LCBSYW5nZX0gZnJvbSAndGV4dC1idWZmZXInXG5pbXBvcnQgVGV4dEVkaXRvciBmcm9tICcuL3RleHQtZWRpdG9yJ1xuaW1wb3J0IFNjb3BlRGVzY3JpcHRvciBmcm9tICcuL3Njb3BlLWRlc2NyaXB0b3InXG5cbmNvbnN0IEVESVRPUl9QQVJBTVNfQllfU0VUVElOR19LRVkgPSBbXG4gIFsnY29yZS5maWxlRW5jb2RpbmcnLCAnZW5jb2RpbmcnXSxcbiAgWydlZGl0b3IuYXRvbWljU29mdFRhYnMnLCAnYXRvbWljU29mdFRhYnMnXSxcbiAgWydlZGl0b3Iuc2hvd0ludmlzaWJsZXMnLCAnc2hvd0ludmlzaWJsZXMnXSxcbiAgWydlZGl0b3IudGFiTGVuZ3RoJywgJ3RhYkxlbmd0aCddLFxuICBbJ2VkaXRvci5pbnZpc2libGVzJywgJ2ludmlzaWJsZXMnXSxcbiAgWydlZGl0b3Iuc2hvd0N1cnNvck9uU2VsZWN0aW9uJywgJ3Nob3dDdXJzb3JPblNlbGVjdGlvbiddLFxuICBbJ2VkaXRvci5zaG93SW5kZW50R3VpZGUnLCAnc2hvd0luZGVudEd1aWRlJ10sXG4gIFsnZWRpdG9yLnNob3dMaW5lTnVtYmVycycsICdzaG93TGluZU51bWJlcnMnXSxcbiAgWydlZGl0b3Iuc29mdFdyYXAnLCAnc29mdFdyYXBwZWQnXSxcbiAgWydlZGl0b3Iuc29mdFdyYXBIYW5naW5nSW5kZW50JywgJ3NvZnRXcmFwSGFuZ2luZ0luZGVudExlbmd0aCddLFxuICBbJ2VkaXRvci5zb2Z0V3JhcEF0UHJlZmVycmVkTGluZUxlbmd0aCcsICdzb2Z0V3JhcEF0UHJlZmVycmVkTGluZUxlbmd0aCddLFxuICBbJ2VkaXRvci5wcmVmZXJyZWRMaW5lTGVuZ3RoJywgJ3ByZWZlcnJlZExpbmVMZW5ndGgnXSxcbiAgWydlZGl0b3IuYXV0b0luZGVudCcsICdhdXRvSW5kZW50J10sXG4gIFsnZWRpdG9yLmF1dG9JbmRlbnRPblBhc3RlJywgJ2F1dG9JbmRlbnRPblBhc3RlJ10sXG4gIFsnZWRpdG9yLnNjcm9sbFBhc3RFbmQnLCAnc2Nyb2xsUGFzdEVuZCddLFxuICBbJ2VkaXRvci51bmRvR3JvdXBpbmdJbnRlcnZhbCcsICd1bmRvR3JvdXBpbmdJbnRlcnZhbCddLFxuICBbJ2VkaXRvci5ub25Xb3JkQ2hhcmFjdGVycycsICdub25Xb3JkQ2hhcmFjdGVycyddLFxuICBbJ2VkaXRvci5zY3JvbGxTZW5zaXRpdml0eScsICdzY3JvbGxTZW5zaXRpdml0eSddXG5dXG5cbmNvbnN0IEdSQU1NQVJfU0VMRUNUSU9OX1JBTkdFID0gUmFuZ2UoUG9pbnQuWkVSTywgUG9pbnQoMTAsIDApKS5mcmVlemUoKVxuXG4vLyBFeHBlcmltZW50YWw6IFRoaXMgZ2xvYmFsIHJlZ2lzdHJ5IHRyYWNrcyByZWdpc3RlcmVkIGBUZXh0RWRpdG9yc2AuXG4vL1xuLy8gSWYgeW91IHdhbnQgdG8gYWRkIGZ1bmN0aW9uYWxpdHkgdG8gYSB3aWRlciBzZXQgb2YgdGV4dCBlZGl0b3JzIHRoYW4ganVzdFxuLy8gdGhvc2UgYXBwZWFyaW5nIHdpdGhpbiB3b3Jrc3BhY2UgcGFuZXMsIHVzZSBgYXRvbS50ZXh0RWRpdG9ycy5vYnNlcnZlYCB0b1xuLy8gaW52b2tlIGEgY2FsbGJhY2sgZm9yIGFsbCBjdXJyZW50IGFuZCBmdXR1cmUgcmVnaXN0ZXJlZCB0ZXh0IGVkaXRvcnMuXG4vL1xuLy8gSWYgeW91IHdhbnQgcGFja2FnZXMgdG8gYmUgYWJsZSB0byBhZGQgZnVuY3Rpb25hbGl0eSB0byB5b3VyIG5vbi1wYW5lIHRleHRcbi8vIGVkaXRvcnMgKHN1Y2ggYXMgYSBzZWFyY2ggZmllbGQgaW4gYSBjdXN0b20gdXNlciBpbnRlcmZhY2UgZWxlbWVudCksIHJlZ2lzdGVyXG4vLyB0aGVtIGZvciBvYnNlcnZhdGlvbiB2aWEgYGF0b20udGV4dEVkaXRvcnMuYWRkYC4gKipJbXBvcnRhbnQ6KiogV2hlbiB5b3UncmVcbi8vIGRvbmUgdXNpbmcgeW91ciBlZGl0b3IsIGJlIHN1cmUgdG8gY2FsbCBgZGlzcG9zZWAgb24gdGhlIHJldHVybmVkIGRpc3Bvc2FibGVcbi8vIHRvIGF2b2lkIGxlYWtpbmcgZWRpdG9ycy5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRleHRFZGl0b3JSZWdpc3RyeSB7XG4gIGNvbnN0cnVjdG9yICh7Y29uZmlnLCBncmFtbWFyUmVnaXN0cnksIGFzc2VydCwgcGFja2FnZU1hbmFnZXJ9KSB7XG4gICAgdGhpcy5hc3NlcnQgPSBhc3NlcnRcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZ1xuICAgIHRoaXMuZ3JhbW1hclJlZ2lzdHJ5ID0gZ3JhbW1hclJlZ2lzdHJ5XG4gICAgdGhpcy5zY29wZWRTZXR0aW5nc0RlbGVnYXRlID0gbmV3IFNjb3BlZFNldHRpbmdzRGVsZWdhdGUoY29uZmlnKVxuICAgIHRoaXMuZ3JhbW1hckFkZGVkT3JVcGRhdGVkID0gdGhpcy5ncmFtbWFyQWRkZWRPclVwZGF0ZWQuYmluZCh0aGlzKVxuICAgIHRoaXMuY2xlYXIoKVxuXG4gICAgdGhpcy5pbml0aWFsUGFja2FnZUFjdGl2YXRpb25Qcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgIC8vIFRPRE86IFJlbW92ZSB0aGlzIHVzYWdlIG9mIGEgcHJpdmF0ZSBwcm9wZXJ0eSBvZiBQYWNrYWdlTWFuYWdlci5cbiAgICAgIC8vIFNob3VsZCBQYWNrYWdlTWFuYWdlciBqdXN0IGV4cG9zZSBhIHByb21pc2UtYmFzZWQgQVBJIGxpa2UgdGhpcz9cbiAgICAgIGlmIChwYWNrYWdlTWFuYWdlci5kZWZlcnJlZEFjdGl2YXRpb25Ib29rcykge1xuICAgICAgICBwYWNrYWdlTWFuYWdlci5vbkRpZEFjdGl2YXRlSW5pdGlhbFBhY2thZ2VzKHJlc29sdmUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKClcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZGVzZXJpYWxpemUgKHN0YXRlKSB7XG4gICAgdGhpcy5lZGl0b3JHcmFtbWFyT3ZlcnJpZGVzID0gc3RhdGUuZWRpdG9yR3JhbW1hck92ZXJyaWRlc1xuICB9XG5cbiAgc2VyaWFsaXplICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZWRpdG9yR3JhbW1hck92ZXJyaWRlczogT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5lZGl0b3JHcmFtbWFyT3ZlcnJpZGVzKVxuICAgIH1cbiAgfVxuXG4gIGNsZWFyICgpIHtcbiAgICBpZiAodGhpcy5zdWJzY3JpcHRpb25zKSB7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMuZGlzcG9zZSgpXG4gICAgfVxuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKVxuICAgIHRoaXMuZWRpdG9ycyA9IG5ldyBTZXQoKVxuICAgIHRoaXMuZW1pdHRlciA9IG5ldyBFbWl0dGVyKClcbiAgICB0aGlzLnNjb3Blc1dpdGhDb25maWdTdWJzY3JpcHRpb25zID0gbmV3IFNldCgpXG4gICAgdGhpcy5lZGl0b3JzV2l0aE1haW50YWluZWRDb25maWcgPSBuZXcgU2V0KClcbiAgICB0aGlzLmVkaXRvcnNXaXRoTWFpbnRhaW5lZEdyYW1tYXIgPSBuZXcgU2V0KClcbiAgICB0aGlzLmVkaXRvckdyYW1tYXJPdmVycmlkZXMgPSB7fVxuICAgIHRoaXMuZWRpdG9yR3JhbW1hclNjb3JlcyA9IG5ldyBXZWFrTWFwKClcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgdGhpcy5ncmFtbWFyUmVnaXN0cnkub25EaWRBZGRHcmFtbWFyKHRoaXMuZ3JhbW1hckFkZGVkT3JVcGRhdGVkKSxcbiAgICAgIHRoaXMuZ3JhbW1hclJlZ2lzdHJ5Lm9uRGlkVXBkYXRlR3JhbW1hcih0aGlzLmdyYW1tYXJBZGRlZE9yVXBkYXRlZClcbiAgICApXG4gIH1cblxuICBkZXN0cm95ICgpIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuZGlzcG9zZSgpXG4gICAgdGhpcy5lZGl0b3JzV2l0aE1haW50YWluZWRDb25maWcgPSBudWxsXG4gIH1cblxuICAvLyBSZWdpc3RlciBhIGBUZXh0RWRpdG9yYC5cbiAgLy9cbiAgLy8gKiBgZWRpdG9yYCBUaGUgZWRpdG9yIHRvIHJlZ2lzdGVyLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHJlbW92ZSB0aGVcbiAgLy8gYWRkZWQgZWRpdG9yLiBUbyBhdm9pZCBhbnkgbWVtb3J5IGxlYWtzIHRoaXMgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZVxuICAvLyBlZGl0b3IgaXMgZGVzdHJveWVkLlxuICBhZGQgKGVkaXRvcikge1xuICAgIHRoaXMuZWRpdG9ycy5hZGQoZWRpdG9yKVxuICAgIGVkaXRvci5yZWdpc3RlcmVkID0gdHJ1ZVxuICAgIHRoaXMuZW1pdHRlci5lbWl0KCdkaWQtYWRkLWVkaXRvcicsIGVkaXRvcilcblxuICAgIHJldHVybiBuZXcgRGlzcG9zYWJsZSgoKSA9PiB0aGlzLnJlbW92ZShlZGl0b3IpKVxuICB9XG5cbiAgYnVpbGQgKHBhcmFtcykge1xuICAgIHBhcmFtcyA9IE9iamVjdC5hc3NpZ24oe2Fzc2VydDogdGhpcy5hc3NlcnR9LCBwYXJhbXMpXG5cbiAgICBsZXQgc2NvcGUgPSBudWxsXG4gICAgaWYgKHBhcmFtcy5idWZmZXIpIHtcbiAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGFyYW1zLmJ1ZmZlci5nZXRQYXRoKClcbiAgICAgIGNvbnN0IGhlYWRDb250ZW50ID0gcGFyYW1zLmJ1ZmZlci5nZXRUZXh0SW5SYW5nZShHUkFNTUFSX1NFTEVDVElPTl9SQU5HRSlcbiAgICAgIHBhcmFtcy5ncmFtbWFyID0gdGhpcy5ncmFtbWFyUmVnaXN0cnkuc2VsZWN0R3JhbW1hcihmaWxlUGF0aCwgaGVhZENvbnRlbnQpXG4gICAgICBzY29wZSA9IG5ldyBTY29wZURlc2NyaXB0b3Ioe3Njb3BlczogW3BhcmFtcy5ncmFtbWFyLnNjb3BlTmFtZV19KVxuICAgIH1cblxuICAgIE9iamVjdC5hc3NpZ24ocGFyYW1zLCB0aGlzLnRleHRFZGl0b3JQYXJhbXNGb3JTY29wZShzY29wZSkpXG5cbiAgICByZXR1cm4gbmV3IFRleHRFZGl0b3IocGFyYW1zKVxuICB9XG5cbiAgLy8gUmVtb3ZlIGEgYFRleHRFZGl0b3JgLlxuICAvL1xuICAvLyAqIGBlZGl0b3JgIFRoZSBlZGl0b3IgdG8gcmVtb3ZlLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge0Jvb2xlYW59IGluZGljYXRpbmcgd2hldGhlciB0aGUgZWRpdG9yIHdhcyBzdWNjZXNzZnVsbHkgcmVtb3ZlZC5cbiAgcmVtb3ZlIChlZGl0b3IpIHtcbiAgICB2YXIgcmVtb3ZlZCA9IHRoaXMuZWRpdG9ycy5kZWxldGUoZWRpdG9yKVxuICAgIGVkaXRvci5yZWdpc3RlcmVkID0gZmFsc2VcbiAgICByZXR1cm4gcmVtb3ZlZFxuICB9XG5cbiAgLy8gSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aXRoIGFsbCB0aGUgY3VycmVudCBhbmQgZnV0dXJlIHJlZ2lzdGVyZWRcbiAgLy8gYFRleHRFZGl0b3JzYC5cbiAgLy9cbiAgLy8gKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdpdGggY3VycmVudCBhbmQgZnV0dXJlIHRleHQgZWRpdG9ycy5cbiAgLy9cbiAgLy8gUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb2JzZXJ2ZSAoY2FsbGJhY2spIHtcbiAgICB0aGlzLmVkaXRvcnMuZm9yRWFjaChjYWxsYmFjaylcbiAgICByZXR1cm4gdGhpcy5lbWl0dGVyLm9uKCdkaWQtYWRkLWVkaXRvcicsIGNhbGxiYWNrKVxuICB9XG5cbiAgLy8gS2VlcCBhIHtUZXh0RWRpdG9yfSdzIGNvbmZpZ3VyYXRpb24gaW4gc3luYyB3aXRoIEF0b20ncyBzZXR0aW5ncy5cbiAgLy9cbiAgLy8gKiBgZWRpdG9yYCBUaGUgZWRpdG9yIHdob3NlIGNvbmZpZ3VyYXRpb24gd2lsbCBiZSBtYWludGFpbmVkLlxuICAvL1xuICAvLyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IHRoYXQgY2FuIGJlIHVzZWQgdG8gc3RvcCB1cGRhdGluZyB0aGUgZWRpdG9yJ3NcbiAgLy8gY29uZmlndXJhdGlvbi5cbiAgbWFpbnRhaW5Db25maWcgKGVkaXRvcikge1xuICAgIGlmICh0aGlzLmVkaXRvcnNXaXRoTWFpbnRhaW5lZENvbmZpZy5oYXMoZWRpdG9yKSkge1xuICAgICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKG5vb3ApXG4gICAgfVxuICAgIHRoaXMuZWRpdG9yc1dpdGhNYWludGFpbmVkQ29uZmlnLmFkZChlZGl0b3IpXG5cbiAgICBlZGl0b3Iuc2V0U2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZSh0aGlzLnNjb3BlZFNldHRpbmdzRGVsZWdhdGUpXG5cbiAgICB0aGlzLnN1YnNjcmliZVRvU2V0dGluZ3NGb3JFZGl0b3JTY29wZShlZGl0b3IpXG4gICAgY29uc3QgZ3JhbW1hckNoYW5nZVN1YnNjcmlwdGlvbiA9IGVkaXRvci5vbkRpZENoYW5nZUdyYW1tYXIoKCkgPT4ge1xuICAgICAgdGhpcy5zdWJzY3JpYmVUb1NldHRpbmdzRm9yRWRpdG9yU2NvcGUoZWRpdG9yKVxuICAgIH0pXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChncmFtbWFyQ2hhbmdlU3Vic2NyaXB0aW9uKVxuXG4gICAgY29uc3QgdXBkYXRlVGFiVHlwZXMgPSAoKSA9PiB7XG4gICAgICBjb25zdCBjb25maWdPcHRpb25zID0ge3Njb3BlOiBlZGl0b3IuZ2V0Um9vdFNjb3BlRGVzY3JpcHRvcigpfVxuICAgICAgZWRpdG9yLnNldFNvZnRUYWJzKHNob3VsZEVkaXRvclVzZVNvZnRUYWJzKFxuICAgICAgICBlZGl0b3IsXG4gICAgICAgIHRoaXMuY29uZmlnLmdldCgnZWRpdG9yLnRhYlR5cGUnLCBjb25maWdPcHRpb25zKSxcbiAgICAgICAgdGhpcy5jb25maWcuZ2V0KCdlZGl0b3Iuc29mdFRhYnMnLCBjb25maWdPcHRpb25zKVxuICAgICAgKSlcbiAgICB9XG5cbiAgICB1cGRhdGVUYWJUeXBlcygpXG4gICAgY29uc3QgdG9rZW5pemVTdWJzY3JpcHRpb24gPSBlZGl0b3Iub25EaWRUb2tlbml6ZSh1cGRhdGVUYWJUeXBlcylcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKHRva2VuaXplU3Vic2NyaXB0aW9uKVxuXG4gICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgIHRoaXMuZWRpdG9yc1dpdGhNYWludGFpbmVkQ29uZmlnLmRlbGV0ZShlZGl0b3IpXG4gICAgICBlZGl0b3Iuc2V0U2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZShudWxsKVxuICAgICAgdG9rZW5pemVTdWJzY3JpcHRpb24uZGlzcG9zZSgpXG4gICAgICBncmFtbWFyQ2hhbmdlU3Vic2NyaXB0aW9uLmRpc3Bvc2UoKVxuICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLnJlbW92ZShncmFtbWFyQ2hhbmdlU3Vic2NyaXB0aW9uKVxuICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLnJlbW92ZSh0b2tlbml6ZVN1YnNjcmlwdGlvbilcbiAgICB9KVxuICB9XG5cbiAgLy8gU2V0IGEge1RleHRFZGl0b3J9J3MgZ3JhbW1hciBiYXNlZCBvbiBpdHMgcGF0aCBhbmQgY29udGVudCwgYW5kIGNvbnRpbnVlXG4gIC8vIHRvIHVwZGF0ZSBpdHMgZ3JhbW1hciBhcyBncmFtbWFycyBhcmUgYWRkZWQgb3IgdXBkYXRlZCwgb3IgdGhlIGVkaXRvcidzXG4gIC8vIGZpbGUgcGF0aCBjaGFuZ2VzLlxuICAvL1xuICAvLyAqIGBlZGl0b3JgIFRoZSBlZGl0b3Igd2hvc2UgZ3JhbW1hciB3aWxsIGJlIG1haW50YWluZWQuXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gdGhhdCBjYW4gYmUgdXNlZCB0byBzdG9wIHVwZGF0aW5nIHRoZSBlZGl0b3Inc1xuICAvLyBncmFtbWFyLlxuICBtYWludGFpbkdyYW1tYXIgKGVkaXRvcikge1xuICAgIGlmICh0aGlzLmVkaXRvcnNXaXRoTWFpbnRhaW5lZEdyYW1tYXIuaGFzKGVkaXRvcikpIHtcbiAgICAgIHJldHVybiBuZXcgRGlzcG9zYWJsZShub29wKVxuICAgIH1cblxuICAgIHRoaXMuZWRpdG9yc1dpdGhNYWludGFpbmVkR3JhbW1hci5hZGQoZWRpdG9yKVxuXG4gICAgY29uc3QgYnVmZmVyID0gZWRpdG9yLmdldEJ1ZmZlcigpXG4gICAgZm9yIChsZXQgZXhpc3RpbmdFZGl0b3Igb2YgdGhpcy5lZGl0b3JzV2l0aE1haW50YWluZWRHcmFtbWFyKSB7XG4gICAgICBpZiAoZXhpc3RpbmdFZGl0b3IuZ2V0QnVmZmVyKCkgPT09IGJ1ZmZlcikge1xuICAgICAgICBjb25zdCBleGlzdGluZ092ZXJyaWRlID0gdGhpcy5lZGl0b3JHcmFtbWFyT3ZlcnJpZGVzW2V4aXN0aW5nRWRpdG9yLmlkXVxuICAgICAgICBpZiAoZXhpc3RpbmdPdmVycmlkZSkge1xuICAgICAgICAgIHRoaXMuZWRpdG9yR3JhbW1hck92ZXJyaWRlc1tlZGl0b3IuaWRdID0gZXhpc3RpbmdPdmVycmlkZVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zZWxlY3RHcmFtbWFyRm9yRWRpdG9yKGVkaXRvcilcblxuICAgIGNvbnN0IHBhdGhDaGFuZ2VTdWJzY3JpcHRpb24gPSBlZGl0b3Iub25EaWRDaGFuZ2VQYXRoKCgpID0+IHtcbiAgICAgIHRoaXMuZWRpdG9yR3JhbW1hclNjb3Jlcy5kZWxldGUoZWRpdG9yKVxuICAgICAgdGhpcy5zZWxlY3RHcmFtbWFyRm9yRWRpdG9yKGVkaXRvcilcbiAgICB9KVxuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChwYXRoQ2hhbmdlU3Vic2NyaXB0aW9uKVxuXG4gICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgIGRlbGV0ZSB0aGlzLmVkaXRvckdyYW1tYXJPdmVycmlkZXNbZWRpdG9yLmlkXVxuICAgICAgdGhpcy5lZGl0b3JzV2l0aE1haW50YWluZWRHcmFtbWFyLmRlbGV0ZShlZGl0b3IpXG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMucmVtb3ZlKHBhdGhDaGFuZ2VTdWJzY3JpcHRpb24pXG4gICAgICBwYXRoQ2hhbmdlU3Vic2NyaXB0aW9uLmRpc3Bvc2UoKVxuICAgIH0pXG4gIH1cblxuICAvLyBGb3JjZSBhIHtUZXh0RWRpdG9yfSB0byB1c2UgYSBkaWZmZXJlbnQgZ3JhbW1hciB0aGFuIHRoZSBvbmUgdGhhdCB3b3VsZFxuICAvLyBvdGhlcndpc2UgYmUgc2VsZWN0ZWQgZm9yIGl0LlxuICAvL1xuICAvLyAqIGBlZGl0b3JgIFRoZSBlZGl0b3Igd2hvc2UgZ3JhbWFtciB3aWxsIGJlIHNldC5cbiAgLy8gKiBgc2NvcGVOYW1lYCBUaGUge1N0cmluZ30gcm9vdCBzY29wZSBuYW1lIGZvciB0aGUgZGVzaXJlZCB7R3JhbW1hcn0uXG4gIHNldEdyYW1tYXJPdmVycmlkZSAoZWRpdG9yLCBzY29wZU5hbWUpIHtcbiAgICB0aGlzLmVkaXRvckdyYW1tYXJPdmVycmlkZXNbZWRpdG9yLmlkXSA9IHNjb3BlTmFtZVxuICAgIHRoaXMuZWRpdG9yR3JhbW1hclNjb3Jlcy5kZWxldGUoZWRpdG9yKVxuICAgIGVkaXRvci5zZXRHcmFtbWFyKHRoaXMuZ3JhbW1hclJlZ2lzdHJ5LmdyYW1tYXJGb3JTY29wZU5hbWUoc2NvcGVOYW1lKSlcbiAgfVxuXG4gIC8vIFJldHJpZXZlIHRoZSBncmFtbWFyIHNjb3BlIG5hbWUgdGhhdCBoYXMgYmVlbiBzZXQgYXMgYSBncmFtbWFyIG92ZXJyaWRlXG4gIC8vIGZvciB0aGUgZ2l2ZW4ge1RleHRFZGl0b3J9LlxuICAvL1xuICAvLyAqIGBlZGl0b3JgIFRoZSBlZGl0b3IuXG4gIC8vXG4gIC8vIFJldHVybnMgYSB7U3RyaW5nfSBzY29wZSBuYW1lLCBvciBgbnVsbGAgaWYgbm8gb3ZlcnJpZGUgaGFzIGJlZW4gc2V0XG4gIC8vIGZvciB0aGUgZ2l2ZW4gZWRpdG9yLlxuICBnZXRHcmFtbWFyT3ZlcnJpZGUgKGVkaXRvcikge1xuICAgIHJldHVybiB0aGlzLmVkaXRvckdyYW1tYXJPdmVycmlkZXNbZWRpdG9yLmlkXVxuICB9XG5cbiAgLy8gUmVtb3ZlIGFueSBncmFtbWFyIG92ZXJyaWRlIHRoYXQgaGFzIGJlZW4gc2V0IGZvciB0aGUgZ2l2ZW4ge1RleHRFZGl0b3J9LlxuICAvL1xuICAvLyAqIGBlZGl0b3JgIFRoZSBlZGl0b3IuXG4gIGNsZWFyR3JhbW1hck92ZXJyaWRlIChlZGl0b3IpIHtcbiAgICBkZWxldGUgdGhpcy5lZGl0b3JHcmFtbWFyT3ZlcnJpZGVzW2VkaXRvci5pZF1cbiAgICB0aGlzLnNlbGVjdEdyYW1tYXJGb3JFZGl0b3IoZWRpdG9yKVxuICB9XG5cbiAgLy8gUHJpdmF0ZVxuXG4gIGdyYW1tYXJBZGRlZE9yVXBkYXRlZCAoZ3JhbW1hcikge1xuICAgIHRoaXMuZWRpdG9yc1dpdGhNYWludGFpbmVkR3JhbW1hci5mb3JFYWNoKChlZGl0b3IpID0+IHtcbiAgICAgIGlmIChncmFtbWFyLmluamVjdGlvblNlbGVjdG9yKSB7XG4gICAgICAgIGlmIChlZGl0b3IudG9rZW5pemVkQnVmZmVyLmhhc1Rva2VuRm9yU2VsZWN0b3IoZ3JhbW1hci5pbmplY3Rpb25TZWxlY3RvcikpIHtcbiAgICAgICAgICBlZGl0b3IudG9rZW5pemVkQnVmZmVyLnJldG9rZW5pemVMaW5lcygpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGdyYW1tYXJPdmVycmlkZSA9IHRoaXMuZWRpdG9yR3JhbW1hck92ZXJyaWRlc1tlZGl0b3IuaWRdXG4gICAgICBpZiAoZ3JhbW1hck92ZXJyaWRlKSB7XG4gICAgICAgIGlmIChncmFtbWFyLnNjb3BlTmFtZSA9PT0gZ3JhbW1hck92ZXJyaWRlKSB7XG4gICAgICAgICAgZWRpdG9yLnNldEdyYW1tYXIoZ3JhbW1hcilcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgc2NvcmUgPSB0aGlzLmdyYW1tYXJSZWdpc3RyeS5nZXRHcmFtbWFyU2NvcmUoXG4gICAgICAgICAgZ3JhbW1hcixcbiAgICAgICAgICBlZGl0b3IuZ2V0UGF0aCgpLFxuICAgICAgICAgIGVkaXRvci5nZXRUZXh0SW5CdWZmZXJSYW5nZShHUkFNTUFSX1NFTEVDVElPTl9SQU5HRSlcbiAgICAgICAgKVxuXG4gICAgICAgIGxldCBjdXJyZW50U2NvcmUgPSB0aGlzLmVkaXRvckdyYW1tYXJTY29yZXMuZ2V0KGVkaXRvcilcbiAgICAgICAgaWYgKGN1cnJlbnRTY29yZSA9PSBudWxsIHx8IHNjb3JlID4gY3VycmVudFNjb3JlKSB7XG4gICAgICAgICAgZWRpdG9yLnNldEdyYW1tYXIoZ3JhbW1hciwgc2NvcmUpXG4gICAgICAgICAgdGhpcy5lZGl0b3JHcmFtbWFyU2NvcmVzLnNldChlZGl0b3IsIHNjb3JlKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIHNlbGVjdEdyYW1tYXJGb3JFZGl0b3IgKGVkaXRvcikge1xuICAgIGNvbnN0IGdyYW1tYXJPdmVycmlkZSA9IHRoaXMuZWRpdG9yR3JhbW1hck92ZXJyaWRlc1tlZGl0b3IuaWRdXG5cbiAgICBpZiAoZ3JhbW1hck92ZXJyaWRlKSB7XG4gICAgICBjb25zdCBncmFtbWFyID0gdGhpcy5ncmFtbWFyUmVnaXN0cnkuZ3JhbW1hckZvclNjb3BlTmFtZShncmFtbWFyT3ZlcnJpZGUpXG4gICAgICBlZGl0b3Iuc2V0R3JhbW1hcihncmFtbWFyKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uc3Qge2dyYW1tYXIsIHNjb3JlfSA9IHRoaXMuZ3JhbW1hclJlZ2lzdHJ5LnNlbGVjdEdyYW1tYXJXaXRoU2NvcmUoXG4gICAgICBlZGl0b3IuZ2V0UGF0aCgpLFxuICAgICAgZWRpdG9yLmdldFRleHRJbkJ1ZmZlclJhbmdlKEdSQU1NQVJfU0VMRUNUSU9OX1JBTkdFKVxuICAgIClcblxuICAgIGlmICghZ3JhbW1hcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBncmFtbWFyIGZvdW5kIGZvciBwYXRoOiAke2VkaXRvci5nZXRQYXRoKCl9YClcbiAgICB9XG5cbiAgICBjb25zdCBjdXJyZW50U2NvcmUgPSB0aGlzLmVkaXRvckdyYW1tYXJTY29yZXMuZ2V0KGVkaXRvcilcbiAgICBpZiAoY3VycmVudFNjb3JlID09IG51bGwgfHwgc2NvcmUgPiBjdXJyZW50U2NvcmUpIHtcbiAgICAgIGVkaXRvci5zZXRHcmFtbWFyKGdyYW1tYXIpXG4gICAgICB0aGlzLmVkaXRvckdyYW1tYXJTY29yZXMuc2V0KGVkaXRvciwgc2NvcmUpXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc3Vic2NyaWJlVG9TZXR0aW5nc0ZvckVkaXRvclNjb3BlIChlZGl0b3IpIHtcbiAgICBhd2FpdCB0aGlzLmluaXRpYWxQYWNrYWdlQWN0aXZhdGlvblByb21pc2VcblxuICAgIGNvbnN0IHNjb3BlRGVzY3JpcHRvciA9IGVkaXRvci5nZXRSb290U2NvcGVEZXNjcmlwdG9yKClcbiAgICBjb25zdCBzY29wZUNoYWluID0gc2NvcGVEZXNjcmlwdG9yLmdldFNjb3BlQ2hhaW4oKVxuXG4gICAgZWRpdG9yLnVwZGF0ZSh0aGlzLnRleHRFZGl0b3JQYXJhbXNGb3JTY29wZShzY29wZURlc2NyaXB0b3IpKVxuXG4gICAgaWYgKCF0aGlzLnNjb3Blc1dpdGhDb25maWdTdWJzY3JpcHRpb25zLmhhcyhzY29wZUNoYWluKSkge1xuICAgICAgdGhpcy5zY29wZXNXaXRoQ29uZmlnU3Vic2NyaXB0aW9ucy5hZGQoc2NvcGVDaGFpbilcbiAgICAgIGNvbnN0IGNvbmZpZ09wdGlvbnMgPSB7c2NvcGU6IHNjb3BlRGVzY3JpcHRvcn1cblxuICAgICAgZm9yIChjb25zdCBbc2V0dGluZ0tleSwgcGFyYW1OYW1lXSBvZiBFRElUT1JfUEFSQU1TX0JZX1NFVFRJTkdfS0VZKSB7XG4gICAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoXG4gICAgICAgICAgdGhpcy5jb25maWcub25EaWRDaGFuZ2Uoc2V0dGluZ0tleSwgY29uZmlnT3B0aW9ucywgKHtuZXdWYWx1ZX0pID0+IHtcbiAgICAgICAgICAgIHRoaXMuZWRpdG9yc1dpdGhNYWludGFpbmVkQ29uZmlnLmZvckVhY2goKGVkaXRvcikgPT4ge1xuICAgICAgICAgICAgICBpZiAoZWRpdG9yLmdldFJvb3RTY29wZURlc2NyaXB0b3IoKS5pc0VxdWFsKHNjb3BlRGVzY3JpcHRvcikpIHtcbiAgICAgICAgICAgICAgICBlZGl0b3IudXBkYXRlKHtbcGFyYW1OYW1lXTogbmV3VmFsdWV9KVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIH0pXG4gICAgICAgIClcbiAgICAgIH1cblxuICAgICAgY29uc3QgdXBkYXRlVGFiVHlwZXMgPSAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHRhYlR5cGUgPSB0aGlzLmNvbmZpZy5nZXQoJ2VkaXRvci50YWJUeXBlJywgY29uZmlnT3B0aW9ucylcbiAgICAgICAgY29uc3Qgc29mdFRhYnMgPSB0aGlzLmNvbmZpZy5nZXQoJ2VkaXRvci5zb2Z0VGFicycsIGNvbmZpZ09wdGlvbnMpXG4gICAgICAgIHRoaXMuZWRpdG9yc1dpdGhNYWludGFpbmVkQ29uZmlnLmZvckVhY2goKGVkaXRvcikgPT4ge1xuICAgICAgICAgIGlmIChlZGl0b3IuZ2V0Um9vdFNjb3BlRGVzY3JpcHRvcigpLmlzRXF1YWwoc2NvcGVEZXNjcmlwdG9yKSkge1xuICAgICAgICAgICAgZWRpdG9yLnNldFNvZnRUYWJzKHNob3VsZEVkaXRvclVzZVNvZnRUYWJzKGVkaXRvciwgdGFiVHlwZSwgc29mdFRhYnMpKVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChcbiAgICAgICAgdGhpcy5jb25maWcub25EaWRDaGFuZ2UoJ2VkaXRvci50YWJUeXBlJywgY29uZmlnT3B0aW9ucywgdXBkYXRlVGFiVHlwZXMpLFxuICAgICAgICB0aGlzLmNvbmZpZy5vbkRpZENoYW5nZSgnZWRpdG9yLnNvZnRUYWJzJywgY29uZmlnT3B0aW9ucywgdXBkYXRlVGFiVHlwZXMpXG4gICAgICApXG4gICAgfVxuICB9XG5cbiAgdGV4dEVkaXRvclBhcmFtc0ZvclNjb3BlIChzY29wZURlc2NyaXB0b3IpIHtcbiAgICBjb25zdCByZXN1bHQgPSB7fVxuICAgIGNvbnN0IGNvbmZpZ09wdGlvbnMgPSB7c2NvcGU6IHNjb3BlRGVzY3JpcHRvcn1cbiAgICBmb3IgKGNvbnN0IFtzZXR0aW5nS2V5LCBwYXJhbU5hbWVdIG9mIEVESVRPUl9QQVJBTVNfQllfU0VUVElOR19LRVkpIHtcbiAgICAgIHJlc3VsdFtwYXJhbU5hbWVdID0gdGhpcy5jb25maWcuZ2V0KHNldHRpbmdLZXksIGNvbmZpZ09wdGlvbnMpXG4gICAgfVxuICAgIHJldHVybiByZXN1bHRcbiAgfVxufVxuXG5mdW5jdGlvbiBzaG91bGRFZGl0b3JVc2VTb2Z0VGFicyAoZWRpdG9yLCB0YWJUeXBlLCBzb2Z0VGFicykge1xuICBzd2l0Y2ggKHRhYlR5cGUpIHtcbiAgICBjYXNlICdoYXJkJzpcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIGNhc2UgJ3NvZnQnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBjYXNlICdhdXRvJzpcbiAgICAgIHN3aXRjaCAoZWRpdG9yLnVzZXNTb2Z0VGFicygpKSB7XG4gICAgICAgIGNhc2UgdHJ1ZTpcbiAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICBjYXNlIGZhbHNlOlxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBzb2Z0VGFic1xuICAgICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG5vb3AgKCkge31cblxuY2xhc3MgU2NvcGVkU2V0dGluZ3NEZWxlZ2F0ZSB7XG4gIGNvbnN0cnVjdG9yIChjb25maWcpIHtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZ1xuICB9XG5cbiAgZ2V0Tm9uV29yZENoYXJhY3RlcnMgKHNjb3BlKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnLmdldCgnZWRpdG9yLm5vbldvcmRDaGFyYWN0ZXJzJywge3Njb3BlOiBzY29wZX0pXG4gIH1cblxuICBnZXRJbmNyZWFzZUluZGVudFBhdHRlcm4gKHNjb3BlKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnLmdldCgnZWRpdG9yLmluY3JlYXNlSW5kZW50UGF0dGVybicsIHtzY29wZTogc2NvcGV9KVxuICB9XG5cbiAgZ2V0RGVjcmVhc2VJbmRlbnRQYXR0ZXJuIChzY29wZSkge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZy5nZXQoJ2VkaXRvci5kZWNyZWFzZUluZGVudFBhdHRlcm4nLCB7c2NvcGU6IHNjb3BlfSlcbiAgfVxuXG4gIGdldERlY3JlYXNlTmV4dEluZGVudFBhdHRlcm4gKHNjb3BlKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnLmdldCgnZWRpdG9yLmRlY3JlYXNlTmV4dEluZGVudFBhdHRlcm4nLCB7c2NvcGU6IHNjb3BlfSlcbiAgfVxuXG4gIGdldEZvbGRFbmRQYXR0ZXJuIChzY29wZSkge1xuICAgIHJldHVybiB0aGlzLmNvbmZpZy5nZXQoJ2VkaXRvci5mb2xkRW5kUGF0dGVybicsIHtzY29wZTogc2NvcGV9KVxuICB9XG5cbiAgZ2V0Q29tbWVudFN0cmluZ3MgKHNjb3BlKSB7XG4gICAgY29uc3QgY29tbWVudFN0YXJ0RW50cmllcyA9IHRoaXMuY29uZmlnLmdldEFsbCgnZWRpdG9yLmNvbW1lbnRTdGFydCcsIHtzY29wZX0pXG4gICAgY29uc3QgY29tbWVudEVuZEVudHJpZXMgPSB0aGlzLmNvbmZpZy5nZXRBbGwoJ2VkaXRvci5jb21tZW50RW5kJywge3Njb3BlfSlcbiAgICBjb25zdCBjb21tZW50U3RhcnRFbnRyeSA9IGNvbW1lbnRTdGFydEVudHJpZXNbMF1cbiAgICBjb25zdCBjb21tZW50RW5kRW50cnkgPSBjb21tZW50RW5kRW50cmllcy5maW5kKChlbnRyeSkgPT4ge1xuICAgICAgcmV0dXJuIGVudHJ5LnNjb3BlU2VsZWN0b3IgPT09IGNvbW1lbnRTdGFydEVudHJ5LnNjb3BlU2VsZWN0b3JcbiAgICB9KVxuICAgIHJldHVybiB7XG4gICAgICBjb21tZW50U3RhcnRTdHJpbmc6IGNvbW1lbnRTdGFydEVudHJ5ICYmIGNvbW1lbnRTdGFydEVudHJ5LnZhbHVlLFxuICAgICAgY29tbWVudEVuZFN0cmluZzogY29tbWVudEVuZEVudHJ5ICYmIGNvbW1lbnRFbmRFbnRyeS52YWx1ZVxuICAgIH1cbiAgfVxufVxuIl19