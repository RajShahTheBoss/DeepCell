(function() {
  var Emitter, ScrollbarStyleObserver, emitter, observer;

  Emitter = require('event-kit').Emitter;

  ScrollbarStyleObserver = require('../build/Release/scrollbar-style-observer.node').ScrollbarStyleObserver;

  emitter = new Emitter();

  observer = new ScrollbarStyleObserver(function() {
    return emitter.emit('did-change-preferred-scrollbar-style', exports.getPreferredScrollbarStyle());
  });

  exports.getPreferredScrollbarStyle = function() {
    return observer.getPreferredScrollbarStyle();
  };

  exports.onDidChangePreferredScrollbarStyle = function(callback) {
    return emitter.on('did-change-preferred-scrollbar-style', callback);
  };

  exports.observePreferredScrollbarStyle = function(callback) {
    callback(exports.getPreferredScrollbarStyle());
    return exports.onDidChangePreferredScrollbarStyle(callback);
  };

}).call(this);
