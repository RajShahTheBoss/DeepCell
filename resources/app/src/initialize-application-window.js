(function() {
  var ApplicationDelegate, AtomEnvironment, Clipboard, CompileCache, FileSystemBlobStore, ModuleCache, NativeCompileCache, TextEditor, TextEditorComponent, clipboard;

  AtomEnvironment = require('./atom-environment');

  ApplicationDelegate = require('./application-delegate');

  Clipboard = require('./clipboard');

  TextEditor = require('./text-editor');

  TextEditorComponent = require('./text-editor-component');

  FileSystemBlobStore = require('./file-system-blob-store');

  NativeCompileCache = require('./native-compile-cache');

  CompileCache = require('./compile-cache');

  ModuleCache = require('./module-cache');

  if (global.isGeneratingSnapshot) {
    require('about');
    require('archive-view');
    require('autocomplete-atom-api');
    require('autocomplete-css');
    require('autocomplete-html');
    require('autocomplete-plus');
    require('autocomplete-snippets');
    require('autoflow');
    require('autosave');
    require('background-tips');
    require('bookmarks');
    require('bracket-matcher');
    require('command-palette');
    require('deprecation-cop');
    require('dev-live-reload');
    require('encoding-selector');
    require('exception-reporting');
    require('dalek');
    require('find-and-replace');
    require('fuzzy-finder');
    require('github');
    require('git-diff');
    require('go-to-line');
    require('grammar-selector');
    require('image-view');
    require('incompatible-packages');
    require('keybinding-resolver');
    require('line-ending-selector');
    require('link');
    require('markdown-preview');
    require('metrics');
    require('notifications');
    require('open-on-github');
    require('package-generator');
    require('settings-view');
    require('snippets');
    require('spell-check');
    require('status-bar');
    require('styleguide');
    require('symbols-view');
    require('tabs');
    require('timecop');
    require('tree-view');
    require('update-package-dependencies');
    require('welcome');
    require('whitespace');
    require('wrap-guide');
  }

  clipboard = new Clipboard;

  TextEditor.setClipboard(clipboard);

  global.atom = new AtomEnvironment({
    clipboard: clipboard,
    applicationDelegate: new ApplicationDelegate,
    enablePersistence: true
  });

  global.atom.preloadPackages();

  module.exports = function(arg) {
    var base, blobStore, devMode, env, exportsPath, getWindowLoadSettings, ipcRenderer, path, ref, resourcePath, updateProcessEnv;
    blobStore = arg.blobStore;
    updateProcessEnv = require('./update-process-env').updateProcessEnv;
    path = require('path');
    require('./window');
    getWindowLoadSettings = require('./get-window-load-settings');
    ipcRenderer = require('electron').ipcRenderer;
    ref = getWindowLoadSettings(), resourcePath = ref.resourcePath, devMode = ref.devMode, env = ref.env;
    require('./electron-shims');
    exportsPath = path.join(resourcePath, 'exports');
    require('module').globalPaths.push(exportsPath);
    process.env.NODE_PATH = exportsPath;
    if (!devMode) {
      if ((base = process.env).NODE_ENV == null) {
        base.NODE_ENV = 'production';
      }
    }
    global.atom.initialize({
      window: window,
      document: document,
      blobStore: blobStore,
      configDirPath: process.env.ATOM_HOME,
      env: process.env
    });
    return global.atom.startEditorWindow().then(function() {
      var windowFocused;
      windowFocused = function() {
        window.removeEventListener('focus', windowFocused);
        return setTimeout((function() {
          return document.querySelector('atom-workspace').focus();
        }), 0);
      };
      window.addEventListener('focus', windowFocused);
      return ipcRenderer.on('environment', function(event, env) {
        return updateProcessEnv(env);
      });
    });
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL2luaXRpYWxpemUtYXBwbGljYXRpb24td2luZG93LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsZUFBQSxHQUFrQixPQUFBLENBQVEsb0JBQVI7O0VBQ2xCLG1CQUFBLEdBQXNCLE9BQUEsQ0FBUSx3QkFBUjs7RUFDdEIsU0FBQSxHQUFZLE9BQUEsQ0FBUSxhQUFSOztFQUNaLFVBQUEsR0FBYSxPQUFBLENBQVEsZUFBUjs7RUFDYixtQkFBQSxHQUFzQixPQUFBLENBQVEseUJBQVI7O0VBQ3RCLG1CQUFBLEdBQXNCLE9BQUEsQ0FBUSwwQkFBUjs7RUFDdEIsa0JBQUEsR0FBcUIsT0FBQSxDQUFRLHdCQUFSOztFQUNyQixZQUFBLEdBQWUsT0FBQSxDQUFRLGlCQUFSOztFQUNmLFdBQUEsR0FBYyxPQUFBLENBQVEsZ0JBQVI7O0VBRWQsSUFBRyxNQUFNLENBQUMsb0JBQVY7SUFDRSxPQUFBLENBQVEsT0FBUjtJQUNBLE9BQUEsQ0FBUSxjQUFSO0lBQ0EsT0FBQSxDQUFRLHVCQUFSO0lBQ0EsT0FBQSxDQUFRLGtCQUFSO0lBQ0EsT0FBQSxDQUFRLG1CQUFSO0lBQ0EsT0FBQSxDQUFRLG1CQUFSO0lBQ0EsT0FBQSxDQUFRLHVCQUFSO0lBQ0EsT0FBQSxDQUFRLFVBQVI7SUFDQSxPQUFBLENBQVEsVUFBUjtJQUNBLE9BQUEsQ0FBUSxpQkFBUjtJQUNBLE9BQUEsQ0FBUSxXQUFSO0lBQ0EsT0FBQSxDQUFRLGlCQUFSO0lBQ0EsT0FBQSxDQUFRLGlCQUFSO0lBQ0EsT0FBQSxDQUFRLGlCQUFSO0lBQ0EsT0FBQSxDQUFRLGlCQUFSO0lBQ0EsT0FBQSxDQUFRLG1CQUFSO0lBQ0EsT0FBQSxDQUFRLHFCQUFSO0lBQ0EsT0FBQSxDQUFRLE9BQVI7SUFDQSxPQUFBLENBQVEsa0JBQVI7SUFDQSxPQUFBLENBQVEs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QXJDO0VBdkJlO0FBdkVqQiIsInNvdXJjZXNDb250ZW50IjpbIkF0b21FbnZpcm9ubWVudCA9IHJlcXVpcmUgJy4vYXRvbS1lbnZpcm9ubWVudCdcbkFwcGxpY2F0aW9uRGVsZWdhdGUgPSByZXF1aXJlICcuL2FwcGxpY2F0aW9uLWRlbGVnYXRlJ1xuQ2xpcGJvYXJkID0gcmVxdWlyZSAnLi9jbGlwYm9hcmQnXG5UZXh0RWRpdG9yID0gcmVxdWlyZSAnLi90ZXh0LWVkaXRvcidcblRleHRFZGl0b3JDb21wb25lbnQgPSByZXF1aXJlICcuL3RleHQtZWRpdG9yLWNvbXBvbmVudCdcbkZpbGVTeXN0ZW1CbG9iU3RvcmUgPSByZXF1aXJlICcuL2ZpbGUtc3lzdGVtLWJsb2Itc3RvcmUnXG5OYXRpdmVDb21waWxlQ2FjaGUgPSByZXF1aXJlICcuL25hdGl2ZS1jb21waWxlLWNhY2hlJ1xuQ29tcGlsZUNhY2hlID0gcmVxdWlyZSAnLi9jb21waWxlLWNhY2hlJ1xuTW9kdWxlQ2FjaGUgPSByZXF1aXJlICcuL21vZHVsZS1jYWNoZSdcblxuaWYgZ2xvYmFsLmlzR2VuZXJhdGluZ1NuYXBzaG90XG4gIHJlcXVpcmUoJ2Fib3V0JylcbiAgcmVxdWlyZSgnYXJjaGl2ZS12aWV3JylcbiAgcmVxdWlyZSgnYXV0b2NvbXBsZXRlLWF0b20tYXBpJylcbiAgcmVxdWlyZSgnYXV0b2NvbXBsZXRlLWNzcycpXG4gIHJlcXVpcmUoJ2F1dG9jb21wbGV0ZS1odG1sJylcbiAgcmVxdWlyZSgnYXV0b2NvbXBsZXRlLXBsdXMnKVxuICByZXF1aXJlKCdhdXRvY29tcGxldGUtc25pcHBldHMnKVxuICByZXF1aXJlKCdhdXRvZmxvdycpXG4gIHJlcXVpcmUoJ2F1dG9zYXZlJylcbiAgcmVxdWlyZSgnYmFja2dyb3VuZC10aXBzJylcbiAgcmVxdWlyZSgnYm9va21hcmtzJylcbiAgcmVxdWlyZSgnYnJhY2tldC1tYXRjaGVyJylcbiAgcmVxdWlyZSgnY29tbWFuZC1wYWxldHRlJylcbiAgcmVxdWlyZSgnZGVwcmVjYXRpb24tY29wJylcbiAgcmVxdWlyZSgnZGV2LWxpdmUtcmVsb2FkJylcbiAgcmVxdWlyZSgnZW5jb2Rpbmctc2VsZWN0b3InKVxuICByZXF1aXJlKCdleGNlcHRpb24tcmVwb3J0aW5nJylcbiAgcmVxdWlyZSgnZGFsZWsnKVxuICByZXF1aXJlKCdmaW5kLWFuZC1yZXBsYWNlJylcbiAgcmVxdWlyZSgnZnV6enktZmluZGVyJylcbiAgcmVxdWlyZSgnZ2l0aHViJylcbiAgcmVxdWlyZSgnZ2l0LWRpZmYnKVxuICByZXF1aXJlKCdnby10by1saW5lJylcbiAgcmVxdWlyZSgnZ3JhbW1hci1zZWxlY3RvcicpXG4gIHJlcXVpcmUoJ2ltYWdlLXZpZXcnKVxuICByZXF1aXJlKCdpbmNvbXBhdGlibGUtcGFja2FnZXMnKVxuICByZXF1aXJlKCdrZXliaW5kaW5nLXJlc29sdmVyJylcbiAgcmVxdWlyZSgnbGluZS1lbmRpbmctc2VsZWN0b3InKVxuICByZXF1aXJlKCdsaW5rJylcbiAgcmVxdWlyZSgnbWFya2Rvd24tcHJldmlldycpXG4gIHJlcXVpcmUoJ21ldHJpY3MnKVxuICByZXF1aXJlKCdub3RpZmljYXRpb25zJylcbiAgcmVxdWlyZSgnb3Blbi1vbi1naXRodWInKVxuICByZXF1aXJlKCdwYWNrYWdlLWdlbmVyYXRvcicpXG4gIHJlcXVpcmUoJ3NldHRpbmdzLXZpZXcnKVxuICByZXF1aXJlKCdzbmlwcGV0cycpXG4gIHJlcXVpcmUoJ3NwZWxsLWNoZWNrJylcbiAgcmVxdWlyZSgnc3RhdHVzLWJhcicpXG4gIHJlcXVpcmUoJ3N0eWxlZ3VpZGUnKVxuICByZXF1aXJlKCdzeW1ib2xzLXZpZXcnKVxuICByZXF1aXJlKCd0YWJzJylcbiAgcmVxdWlyZSgndGltZWNvcCcpXG4gIHJlcXVpcmUoJ3RyZWUtdmlldycpXG4gIHJlcXVpcmUoJ3VwZGF0ZS1wYWNrYWdlLWRlcGVuZGVuY2llcycpXG4gIHJlcXVpcmUoJ3dlbGNvbWUnKVxuICByZXF1aXJlKCd3aGl0ZXNwYWNlJylcbiAgcmVxdWlyZSgnd3JhcC1ndWlkZScpXG5cbmNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRcblRleHRFZGl0b3Iuc2V0Q2xpcGJvYXJkKGNsaXBib2FyZClcblxuZ2xvYmFsLmF0b20gPSBuZXcgQXRvbUVudmlyb25tZW50KHtcbiAgY2xpcGJvYXJkLFxuICBhcHBsaWNhdGlvbkRlbGVnYXRlOiBuZXcgQXBwbGljYXRpb25EZWxlZ2F0ZSxcbiAgZW5hYmxlUGVyc2lzdGVuY2U6IHRydWVcbn0pXG5cbmdsb2JhbC5hdG9tLnByZWxvYWRQYWNrYWdlcygpXG5cbiMgTGlrZSBzYW5kcyB0aHJvdWdoIHRoZSBob3VyZ2xhc3MsIHNvIGFyZSB0aGUgZGF5cyBvZiBvdXIgbGl2ZXMuXG5tb2R1bGUuZXhwb3J0cyA9ICh7YmxvYlN0b3JlfSkgLT5cbiAge3VwZGF0ZVByb2Nlc3NFbnZ9ID0gcmVxdWlyZSgnLi91cGRhdGUtcHJvY2Vzcy1lbnYnKVxuICBwYXRoID0gcmVxdWlyZSAncGF0aCdcbiAgcmVxdWlyZSAnLi93aW5kb3cnXG4gIGdldFdpbmRvd0xvYWRTZXR0aW5ncyA9IHJlcXVpcmUgJy4vZ2V0LXdpbmRvdy1sb2FkLXNldHRpbmdzJ1xuICB7aXBjUmVuZGVyZXJ9ID0gcmVxdWlyZSAnZWxlY3Ryb24nXG4gIHtyZXNvdXJjZVBhdGgsIGRldk1vZGUsIGVudn0gPSBnZXRXaW5kb3dMb2FkU2V0dGluZ3MoKVxuICByZXF1aXJlICcuL2VsZWN0cm9uLXNoaW1zJ1xuXG4gICMgQWRkIGFwcGxpY2F0aW9uLXNwZWNpZmljIGV4cG9ydHMgdG8gbW9kdWxlIHNlYXJjaCBwYXRoLlxuICBleHBvcnRzUGF0aCA9IHBhdGguam9pbihyZXNvdXJjZVBhdGgsICdleHBvcnRzJylcbiAgcmVxdWlyZSgnbW9kdWxlJykuZ2xvYmFsUGF0aHMucHVzaChleHBvcnRzUGF0aClcbiAgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIID0gZXhwb3J0c1BhdGhcblxuICAjIE1ha2UgUmVhY3QgZmFzdGVyXG4gIHByb2Nlc3MuZW52Lk5PREVfRU5WID89ICdwcm9kdWN0aW9uJyB1bmxlc3MgZGV2TW9kZVxuXG4gIGdsb2JhbC5hdG9tLmluaXRpYWxpemUoe1xuICAgIHdpbmRvdywgZG9jdW1lbnQsIGJsb2JTdG9yZSxcbiAgICBjb25maWdEaXJQYXRoOiBwcm9jZXNzLmVudi5BVE9NX0hPTUUsXG4gICAgZW52OiBwcm9jZXNzLmVudlxuICB9KVxuXG4gIGdsb2JhbC5hdG9tLnN0YXJ0RWRpdG9yV2luZG93KCkudGhlbiAtPlxuICAgICMgV29ya2Fyb3VuZCBmb3IgZm9jdXMgZ2V0dGluZyBjbGVhcmVkIHVwb24gd2luZG93IGNyZWF0aW9uXG4gICAgd2luZG93Rm9jdXNlZCA9IC0+XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignZm9jdXMnLCB3aW5kb3dGb2N1c2VkKVxuICAgICAgc2V0VGltZW91dCAoLT4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYXRvbS13b3Jrc3BhY2UnKS5mb2N1cygpKSwgMFxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIHdpbmRvd0ZvY3VzZWQpXG4gICAgaXBjUmVuZGVyZXIub24oJ2Vudmlyb25tZW50JywgKGV2ZW50LCBlbnYpIC0+XG4gICAgICB1cGRhdGVQcm9jZXNzRW52KGVudilcbiAgICApXG4iXX0=
