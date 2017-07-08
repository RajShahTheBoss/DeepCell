(function() {
  var CompositeDisposable, Emitter, Grim, Pane, PaneAxis, PaneElement, TextEditor, compact, extend, find, last, nextInstanceId, ref, ref1,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Grim = require('grim');

  ref = require('underscore-plus'), find = ref.find, compact = ref.compact, extend = ref.extend, last = ref.last;

  ref1 = require('event-kit'), CompositeDisposable = ref1.CompositeDisposable, Emitter = ref1.Emitter;

  PaneAxis = require('./pane-axis');

  TextEditor = require('./text-editor');

  PaneElement = require('./pane-element');

  nextInstanceId = 1;

  module.exports = Pane = (function() {
    Pane.prototype.inspect = function() {
      return "Pane " + this.id;
    };

    Pane.deserialize = function(state, arg) {
      var activeItemIndex, activeItemURI, activeItemUri, applicationDelegate, config, deserializers, items, notifications, views;
      deserializers = arg.deserializers, applicationDelegate = arg.applicationDelegate, config = arg.config, notifications = arg.notifications, views = arg.views;
      items = state.items, activeItemIndex = state.activeItemIndex, activeItemURI = state.activeItemURI, activeItemUri = state.activeItemUri;
      if (activeItemURI == null) {
        activeItemURI = activeItemUri;
      }
      items = items.map(function(itemState) {
        return deserializers.deserialize(itemState);
      });
      state.activeItem = items[activeItemIndex];
      state.items = compact(items);
      if (activeItemURI != null) {
        if (state.activeItem == null) {
          state.activeItem = find(state.items, function(item) {
            var itemURI;
            if (typeof item.getURI === 'function') {
              itemURI = item.getURI();
            }
            return itemURI === activeItemURI;
          });
        }
      }
      return new Pane(extend(state, {
        deserializerManager: deserializers,
        notificationManager: notifications,
        viewRegistry: views,
        config: config,
        applicationDelegate: applicationDelegate
      }));
    };

    function Pane(params) {
      this.saveItemAs = bind(this.saveItemAs, this);
      this.saveItem = bind(this.saveItem, this);
      this.onItemDidTerminatePendingState = bind(this.onItemDidTerminatePendingState, this);
      this.clearPendingItem = bind(this.clearPendingItem, this);
      this.getPendingItem = bind(this.getPendingItem, this);
      this.setPendingItem = bind(this.setPendingItem, this);
      var ref2, ref3, ref4;
      this.id = params.id, this.activeItem = params.activeItem, this.focused = params.focused, this.applicationDelegate = params.applicationDelegate, this.notificationManager = params.notificationManager, this.config = params.config, this.deserializerManager = params.deserializerManager, this.viewRegistry = params.viewRegistry;
      if (this.id != null) {
        nextInstanceId = Math.max(nextInstanceId, this.id + 1);
      } else {
        this.id = nextInstanceId++;
      }
      this.emitter = new Emitter;
      this.alive = true;
      this.subscriptionsPerItem = new WeakMap;
      this.items = [];
      this.itemStack = [];
      this.container = null;
      if (this.activeItem == null) {
        this.activeItem = void 0;
      }
      if (this.focused == null) {
        this.focused = false;
      }
      this.addItems(compact((ref2 = params != null ? params.items : void 0) != null ? ref2 : []));
      if (this.getActiveItem() == null) {
        this.setActiveItem(this.items[0]);
      }
      this.addItemsToStack((ref3 = params != null ? params.itemStackIndices : void 0) != null ? ref3 : []);
      this.setFlexScale((ref4 = params != null ? params.flexScale : void 0) != null ? ref4 : 1);
    }

    Pane.prototype.getElement = function() {
      return this.element != null ? this.element : this.element = new PaneElement().initialize(this, {
        views: this.viewRegistry,
        applicationDelegate: this.applicationDelegate
      });
    };

    Pane.prototype.serialize = function() {
      var activeItemIndex, item, itemStackIndices, itemsToBeSerialized;
      itemsToBeSerialized = compact(this.items.map(function(item) {
        if (typeof item.serialize === 'function') {
          return item;
        }
      }));
      itemStackIndices = (function() {
        var j, len, ref2, results;
        ref2 = this.itemStack;
        results = [];
        for (j = 0, len = ref2.length; j < len; j++) {
          item = ref2[j];
          if (typeof item.serialize === 'function') {
            results.push(itemsToBeSerialized.indexOf(item));
          }
        }
        return results;
      }).call(this);
      activeItemIndex = itemsToBeSerialized.indexOf(this.activeItem);
      return {
        deserializer: 'Pane',
        id: this.id,
        items: itemsToBeSerialized.map(function(item) {
          return item.serialize();
        }),
        itemStackIndices: itemStackIndices,
        activeItemIndex: activeItemIndex,
        focused: this.focused,
        flexScale: this.flexScale
      };
    };

    Pane.prototype.getParent = function() {
      return this.parent;
    };

    Pane.prototype.setParent = function(parent) {
      this.parent = parent;
      return this.parent;
    };

    Pane.prototype.getContainer = function() {
      return this.container;
    };

    Pane.prototype.setContainer = function(container) {
      if (container && container !== this.container) {
        this.container = container;
        return container.didAddPane({
          pane: this
        });
      }
    };

    Pane.prototype.setFlexScale = function(flexScale) {
      this.flexScale = flexScale;
      this.emitter.emit('did-change-flex-scale', this.flexScale);
      return this.flexScale;
    };

    Pane.prototype.getFlexScale = function() {
      return this.flexScale;
    };

    Pane.prototype.increaseSize = function() {
      return this.setFlexScale(this.getFlexScale() * 1.1);
    };

    Pane.prototype.decreaseSize = function() {
      return this.setFlexScale(this.getFlexScale() / 1.1);
    };


    /*
    Section: Event Subscription
     */

    Pane.prototype.onDidChangeFlexScale = function(callback) {
      return this.emitter.on('did-change-flex-scale', callback);
    };

    Pane.prototype.observeFlexScale = function(callback) {
      callback(this.flexScale);
      return this.onDidChangeFlexScale(callback);
    };

    Pane.prototype.onDidActivate = function(callback) {
      return this.emitter.on('did-activate', callback);
    };

    Pane.prototype.onWillDestroy = function(callback) {
      return this.emitter.on('will-destroy', callback);
    };

    Pane.prototype.onDidDestroy = function(callback) {
      return this.emitter.on('did-destroy', callback);
    };

    Pane.prototype.onDidChangeActive = function(callback) {
      return this.container.onDidChangeActivePane((function(_this) {
        return function(activePane) {
          return callback(_this === activePane);
        };
      })(this));
    };

    Pane.prototype.observeActive = function(callback) {
      callback(this.isActive());
      return this.onDidChangeActive(callback);
    };

    Pane.prototype.onDidAddItem = function(callback) {
      return this.emitter.on('did-add-item', callback);
    };

    Pane.prototype.onDidRemoveItem = function(callback) {
      return this.emitter.on('did-remove-item', callback);
    };

    Pane.prototype.onWillRemoveItem = function(callback) {
      return this.emitter.on('will-remove-item', callback);
    };

    Pane.prototype.onDidMoveItem = function(callback) {
      return this.emitter.on('did-move-item', callback);
    };

    Pane.prototype.observeItems = function(callback) {
      var item, j, len, ref2;
      ref2 = this.getItems();
      for (j = 0, len = ref2.length; j < len; j++) {
        item = ref2[j];
        callback(item);
      }
      return this.onDidAddItem(function(arg) {
        var item;
        item = arg.item;
        return callback(item);
      });
    };

    Pane.prototype.onDidChangeActiveItem = function(callback) {
      return this.emitter.on('did-change-active-item', callback);
    };

    Pane.prototype.onChooseNextMRUItem = function(callback) {
      return this.emitter.on('choose-next-mru-item', callback);
    };

    Pane.prototype.onChooseLastMRUItem = function(callback) {
      return this.emitter.on('choose-last-mru-item', callback);
    };

    Pane.prototype.onDoneChoosingMRUItem = function(callback) {
      return this.emitter.on('done-choosing-mru-item', callback);
    };

    Pane.prototype.observeActiveItem = function(callback) {
      callback(this.getActiveItem());
      return this.onDidChangeActiveItem(callback);
    };

    Pane.prototype.onWillDestroyItem = function(callback) {
      return this.emitter.on('will-destroy-item', callback);
    };

    Pane.prototype.focus = function() {
      this.focused = true;
      return this.activate();
    };

    Pane.prototype.blur = function() {
      this.focused = false;
      return true;
    };

    Pane.prototype.isFocused = function() {
      return this.focused;
    };

    Pane.prototype.getPanes = function() {
      return [this];
    };

    Pane.prototype.unsubscribeFromItem = function(item) {
      var ref2;
      if ((ref2 = this.subscriptionsPerItem.get(item)) != null) {
        ref2.dispose();
      }
      return this.subscriptionsPerItem["delete"](item);
    };


    /*
    Section: Items
     */

    Pane.prototype.getItems = function() {
      return this.items.slice();
    };

    Pane.prototype.getActiveItem = function() {
      return this.activeItem;
    };

    Pane.prototype.setActiveItem = function(activeItem, options) {
      var modifyStack, ref2;
      if (options != null) {
        modifyStack = options.modifyStack;
      }
      if (activeItem !== this.activeItem) {
        if (modifyStack !== false) {
          this.addItemToStack(activeItem);
        }
        this.activeItem = activeItem;
        this.emitter.emit('did-change-active-item', this.activeItem);
        if ((ref2 = this.container) != null) {
          ref2.didChangeActiveItemOnPane(this, this.activeItem);
        }
      }
      return this.activeItem;
    };

    Pane.prototype.addItemsToStack = function(itemStackIndices) {
      var i, itemIndex, j, len;
      if (this.items.length > 0) {
        if (itemStackIndices.length === 0 || itemStackIndices.length !== this.items.length || itemStackIndices.indexOf(-1) >= 0) {
          itemStackIndices = (function() {
            var j, ref2, results;
            results = [];
            for (i = j = 0, ref2 = this.items.length - 1; 0 <= ref2 ? j <= ref2 : j >= ref2; i = 0 <= ref2 ? ++j : --j) {
              results.push(i);
            }
            return results;
          }).call(this);
        }
        for (j = 0, len = itemStackIndices.length; j < len; j++) {
          itemIndex = itemStackIndices[j];
          this.addItemToStack(this.items[itemIndex]);
        }
      }
    };

    Pane.prototype.addItemToStack = function(newItem) {
      var index;
      if (newItem == null) {
        return;
      }
      index = this.itemStack.indexOf(newItem);
      if (index !== -1) {
        this.itemStack.splice(index, 1);
      }
      return this.itemStack.push(newItem);
    };

    Pane.prototype.getActiveEditor = function() {
      if (this.activeItem instanceof TextEditor) {
        return this.activeItem;
      }
    };

    Pane.prototype.itemAtIndex = function(index) {
      return this.items[index];
    };

    Pane.prototype.activateNextRecentlyUsedItem = function() {
      var nextRecentlyUsedItem;
      if (this.items.length > 1) {
        if (this.itemStackIndex == null) {
          this.itemStackIndex = this.itemStack.length - 1;
        }
        if (this.itemStackIndex === 0) {
          this.itemStackIndex = this.itemStack.length;
        }
        this.itemStackIndex = this.itemStackIndex - 1;
        nextRecentlyUsedItem = this.itemStack[this.itemStackIndex];
        this.emitter.emit('choose-next-mru-item', nextRecentlyUsedItem);
        return this.setActiveItem(nextRecentlyUsedItem, {
          modifyStack: false
        });
      }
    };

    Pane.prototype.activatePreviousRecentlyUsedItem = function() {
      var previousRecentlyUsedItem;
      if (this.items.length > 1) {
        if (this.itemStackIndex + 1 === this.itemStack.length || (this.itemStackIndex == null)) {
          this.itemStackIndex = -1;
        }
        this.itemStackIndex = this.itemStackIndex + 1;
        previousRecentlyUsedItem = this.itemStack[this.itemStackIndex];
        this.emitter.emit('choose-last-mru-item', previousRecentlyUsedItem);
        return this.setActiveItem(previousRecentlyUsedItem, {
          modifyStack: false
        });
      }
    };

    Pane.prototype.moveActiveItemToTopOfStack = function() {
      delete this.itemStackIndex;
      this.addItemToStack(this.activeItem);
      return this.emitter.emit('done-choosing-mru-item');
    };

    Pane.prototype.activateNextItem = function() {
      var index;
      index = this.getActiveItemIndex();
      if (index < this.items.length - 1) {
        return this.activateItemAtIndex(index + 1);
      } else {
        return this.activateItemAtIndex(0);
      }
    };

    Pane.prototype.activatePreviousItem = function() {
      var index;
      index = this.getActiveItemIndex();
      if (index > 0) {
        return this.activateItemAtIndex(index - 1);
      } else {
        return this.activateItemAtIndex(this.items.length - 1);
      }
    };

    Pane.prototype.activateLastItem = function() {
      return this.activateItemAtIndex(this.items.length - 1);
    };

    Pane.prototype.moveItemRight = function() {
      var index, rightItemIndex;
      index = this.getActiveItemIndex();
      rightItemIndex = index + 1;
      if (!(rightItemIndex > this.items.length - 1)) {
        return this.moveItem(this.getActiveItem(), rightItemIndex);
      }
    };

    Pane.prototype.moveItemLeft = function() {
      var index, leftItemIndex;
      index = this.getActiveItemIndex();
      leftItemIndex = index - 1;
      if (!(leftItemIndex < 0)) {
        return this.moveItem(this.getActiveItem(), leftItemIndex);
      }
    };

    Pane.prototype.getActiveItemIndex = function() {
      return this.items.indexOf(this.activeItem);
    };

    Pane.prototype.activateItemAtIndex = function(index) {
      var item;
      item = this.itemAtIndex(index) || this.getActiveItem();
      return this.setActiveItem(item);
    };

    Pane.prototype.activateItem = function(item, options) {
      var index;
      if (options == null) {
        options = {};
      }
      if (item != null) {
        if (this.getPendingItem() === this.activeItem) {
          index = this.getActiveItemIndex();
        } else {
          index = this.getActiveItemIndex() + 1;
        }
        this.addItem(item, extend({}, options, {
          index: index
        }));
        return this.setActiveItem(item);
      }
    };

    Pane.prototype.addItem = function(item, options) {
      var index, itemSubscriptions, lastPendingItem, moved, pending, ref2, ref3, ref4, ref5, replacingPendingItem;
      if (options == null) {
        options = {};
      }
      if (typeof options === "number") {
        Grim.deprecate("Pane::addItem(item, " + options + ") is deprecated in favor of Pane::addItem(item, {index: " + options + "})");
        options = {
          index: options
        };
      }
      index = (ref2 = options.index) != null ? ref2 : this.getActiveItemIndex() + 1;
      moved = (ref3 = options.moved) != null ? ref3 : false;
      pending = (ref4 = options.pending) != null ? ref4 : false;
      if (!((item != null) && typeof item === 'object')) {
        throw new Error("Pane items must be objects. Attempted to add item " + item + ".");
      }
      if (typeof item.isDestroyed === "function" ? item.isDestroyed() : void 0) {
        throw new Error("Adding a pane item with URI '" + (typeof item.getURI === "function" ? item.getURI() : void 0) + "' that has already been destroyed");
      }
      if (indexOf.call(this.items, item) >= 0) {
        return;
      }
      if (typeof item.onDidDestroy === 'function') {
        itemSubscriptions = new CompositeDisposable;
        itemSubscriptions.add(item.onDidDestroy((function(_this) {
          return function() {
            return _this.removeItem(item, false);
          };
        })(this)));
        if (typeof item.onDidTerminatePendingState === "function") {
          itemSubscriptions.add(item.onDidTerminatePendingState((function(_this) {
            return function() {
              if (_this.getPendingItem() === item) {
                return _this.clearPendingItem();
              }
            };
          })(this)));
        }
        this.subscriptionsPerItem.set(item, itemSubscriptions);
      }
      this.items.splice(index, 0, item);
      lastPendingItem = this.getPendingItem();
      replacingPendingItem = (lastPendingItem != null) && !moved;
      if (replacingPendingItem) {
        this.pendingItem = null;
      }
      if (pending) {
        this.setPendingItem(item);
      }
      this.emitter.emit('did-add-item', {
        item: item,
        index: index,
        moved: moved
      });
      if (!moved) {
        if ((ref5 = this.container) != null) {
          ref5.didAddPaneItem(item, this, index);
        }
      }
      if (replacingPendingItem) {
        this.destroyItem(lastPendingItem);
      }
      if (this.getActiveItem() == null) {
        this.setActiveItem(item);
      }
      return item;
    };

    Pane.prototype.setPendingItem = function(item) {
      var mostRecentPendingItem;
      if (this.pendingItem !== item) {
        mostRecentPendingItem = this.pendingItem;
        this.pendingItem = item;
        if (mostRecentPendingItem != null) {
          return this.emitter.emit('item-did-terminate-pending-state', mostRecentPendingItem);
        }
      }
    };

    Pane.prototype.getPendingItem = function() {
      return this.pendingItem || null;
    };

    Pane.prototype.clearPendingItem = function() {
      return this.setPendingItem(null);
    };

    Pane.prototype.onItemDidTerminatePendingState = function(callback) {
      return this.emitter.on('item-did-terminate-pending-state', callback);
    };

    Pane.prototype.addItems = function(items, index) {
      var i, item, j, len;
      if (index == null) {
        index = this.getActiveItemIndex() + 1;
      }
      items = items.filter((function(_this) {
        return function(item) {
          return !(indexOf.call(_this.items, item) >= 0);
        };
      })(this));
      for (i = j = 0, len = items.length; j < len; i = ++j) {
        item = items[i];
        this.addItem(item, {
          index: index + i
        });
      }
      return items;
    };

    Pane.prototype.removeItem = function(item, moved) {
      var index, ref2;
      index = this.items.indexOf(item);
      if (index === -1) {
        return;
      }
      if (this.getPendingItem() === item) {
        this.pendingItem = null;
      }
      this.removeItemFromStack(item);
      this.emitter.emit('will-remove-item', {
        item: item,
        index: index,
        destroyed: !moved,
        moved: moved
      });
      this.unsubscribeFromItem(item);
      if (item === this.activeItem) {
        if (this.items.length === 1) {
          this.setActiveItem(void 0);
        } else if (index === 0) {
          this.activateNextItem();
        } else {
          this.activatePreviousItem();
        }
      }
      this.items.splice(index, 1);
      this.emitter.emit('did-remove-item', {
        item: item,
        index: index,
        destroyed: !moved,
        moved: moved
      });
      if (!moved) {
        if ((ref2 = this.container) != null) {
          ref2.didDestroyPaneItem({
            item: item,
            index: index,
            pane: this
          });
        }
      }
      if (this.items.length === 0 && this.config.get('core.destroyEmptyPanes')) {
        return this.destroy();
      }
    };

    Pane.prototype.removeItemFromStack = function(item) {
      var index;
      index = this.itemStack.indexOf(item);
      if (index !== -1) {
        return this.itemStack.splice(index, 1);
      }
    };

    Pane.prototype.moveItem = function(item, newIndex) {
      var oldIndex;
      oldIndex = this.items.indexOf(item);
      this.items.splice(oldIndex, 1);
      this.items.splice(newIndex, 0, item);
      return this.emitter.emit('did-move-item', {
        item: item,
        oldIndex: oldIndex,
        newIndex: newIndex
      });
    };

    Pane.prototype.moveItemToPane = function(item, pane, index) {
      this.removeItem(item, true);
      return pane.addItem(item, {
        index: index,
        moved: true
      });
    };

    Pane.prototype.destroyActiveItem = function() {
      this.destroyItem(this.activeItem);
      return false;
    };

    Pane.prototype.destroyItem = function(item, force) {
      var index, ref2, ref3;
      index = this.items.indexOf(item);
      if (index !== -1) {
        if (!force && ((ref2 = this.getContainer()) != null ? ref2.getLocation() : void 0) !== 'center' && (typeof item.isPermanentDockItem === "function" ? item.isPermanentDockItem() : void 0)) {
          return false;
        }
        this.emitter.emit('will-destroy-item', {
          item: item,
          index: index
        });
        if ((ref3 = this.container) != null) {
          ref3.willDestroyPaneItem({
            item: item,
            index: index,
            pane: this
          });
        }
        if (force || this.promptToSaveItem(item)) {
          this.removeItem(item, false);
          if (typeof item.destroy === "function") {
            item.destroy();
          }
          return true;
        } else {
          return false;
        }
      }
    };

    Pane.prototype.destroyItems = function() {
      var item, j, len, ref2;
      ref2 = this.getItems();
      for (j = 0, len = ref2.length; j < len; j++) {
        item = ref2[j];
        this.destroyItem(item);
      }
    };

    Pane.prototype.destroyInactiveItems = function() {
      var item, j, len, ref2;
      ref2 = this.getItems();
      for (j = 0, len = ref2.length; j < len; j++) {
        item = ref2[j];
        if (item !== this.activeItem) {
          this.destroyItem(item);
        }
      }
    };

    Pane.prototype.promptToSaveItem = function(item, options) {
      var ref2, saveDialog, saveError, uri;
      if (options == null) {
        options = {};
      }
      if (!(typeof item.shouldPromptToSave === "function" ? item.shouldPromptToSave(options) : void 0)) {
        return true;
      }
      if (typeof item.getURI === 'function') {
        uri = item.getURI();
      } else if (typeof item.getUri === 'function') {
        uri = item.getUri();
      } else {
        return true;
      }
      saveDialog = (function(_this) {
        return function(saveButtonText, saveFn, message) {
          var chosen;
          chosen = _this.applicationDelegate.confirm({
            message: message,
            detailedMessage: "Your changes will be lost if you close this item without saving.",
            buttons: [saveButtonText, "Cancel", "Don't Save"]
          });
          switch (chosen) {
            case 0:
              return saveFn(item, saveError);
            case 1:
              return false;
            case 2:
              return true;
          }
        };
      })(this);
      saveError = (function(_this) {
        return function(error) {
          var ref2;
          if (error) {
            return saveDialog("Save as", _this.saveItemAs, "'" + ((ref2 = typeof item.getTitle === "function" ? item.getTitle() : void 0) != null ? ref2 : uri) + "' could not be saved.\nError: " + (_this.getMessageForErrorCode(error.code)));
          } else {
            return true;
          }
        };
      })(this);
      return saveDialog("Save", this.saveItem, "'" + ((ref2 = typeof item.getTitle === "function" ? item.getTitle() : void 0) != null ? ref2 : uri) + "' has changes, do you want to save them?");
    };

    Pane.prototype.saveActiveItem = function(nextAction) {
      return this.saveItem(this.getActiveItem(), nextAction);
    };

    Pane.prototype.saveActiveItemAs = function(nextAction) {
      return this.saveItemAs(this.getActiveItem(), nextAction);
    };

    Pane.prototype.saveItem = function(item, nextAction) {
      var error, itemURI;
      if (typeof (item != null ? item.getURI : void 0) === 'function') {
        itemURI = item.getURI();
      } else if (typeof (item != null ? item.getUri : void 0) === 'function') {
        itemURI = item.getUri();
      }
      if (itemURI != null) {
        try {
          if (typeof item.save === "function") {
            item.save();
          }
          return typeof nextAction === "function" ? nextAction() : void 0;
        } catch (error1) {
          error = error1;
          if (nextAction) {
            return nextAction(error);
          } else {
            return this.handleSaveError(error, item);
          }
        }
      } else {
        return this.saveItemAs(item, nextAction);
      }
    };

    Pane.prototype.saveItemAs = function(item, nextAction) {
      var error, newItemPath, ref2, saveOptions;
      if ((item != null ? item.saveAs : void 0) == null) {
        return;
      }
      saveOptions = (ref2 = typeof item.getSaveDialogOptions === "function" ? item.getSaveDialogOptions() : void 0) != null ? ref2 : {};
      if (saveOptions.defaultPath == null) {
        saveOptions.defaultPath = item.getPath();
      }
      newItemPath = this.applicationDelegate.showSaveDialog(saveOptions);
      if (newItemPath) {
        try {
          item.saveAs(newItemPath);
          return typeof nextAction === "function" ? nextAction() : void 0;
        } catch (error1) {
          error = error1;
          if (nextAction) {
            return nextAction(error);
          } else {
            return this.handleSaveError(error, item);
          }
        }
      }
    };

    Pane.prototype.saveItems = function() {
      var item, j, len, ref2;
      ref2 = this.getItems();
      for (j = 0, len = ref2.length; j < len; j++) {
        item = ref2[j];
        if (typeof item.isModified === "function" ? item.isModified() : void 0) {
          this.saveItem(item);
        }
      }
    };

    Pane.prototype.itemForURI = function(uri) {
      return find(this.items, function(item) {
        var itemUri;
        if (typeof item.getURI === 'function') {
          itemUri = item.getURI();
        } else if (typeof item.getUri === 'function') {
          itemUri = item.getUri();
        }
        return itemUri === uri;
      });
    };

    Pane.prototype.activateItemForURI = function(uri) {
      var item;
      if (item = this.itemForURI(uri)) {
        this.activateItem(item);
        return true;
      } else {
        return false;
      }
    };

    Pane.prototype.copyActiveItem = function() {
      var ref2;
      return (ref2 = this.activeItem) != null ? typeof ref2.copy === "function" ? ref2.copy() : void 0 : void 0;
    };


    /*
    Section: Lifecycle
     */

    Pane.prototype.isActive = function() {
      var ref2;
      return ((ref2 = this.container) != null ? ref2.getActivePane() : void 0) === this;
    };

    Pane.prototype.activate = function() {
      var ref2;
      if (this.isDestroyed()) {
        throw new Error("Pane has been destroyed");
      }
      if ((ref2 = this.container) != null) {
        ref2.didActivatePane(this);
      }
      return this.emitter.emit('did-activate');
    };

    Pane.prototype.destroy = function() {
      var item, j, len, ref2, ref3, ref4, ref5;
      if (((ref2 = this.container) != null ? ref2.isAlive() : void 0) && this.container.getPanes().length === 1) {
        return this.destroyItems();
      } else {
        this.emitter.emit('will-destroy');
        this.alive = false;
        if ((ref3 = this.container) != null) {
          ref3.willDestroyPane({
            pane: this
          });
        }
        if (this.isActive()) {
          this.container.activateNextPane();
        }
        this.emitter.emit('did-destroy');
        this.emitter.dispose();
        ref4 = this.items.slice();
        for (j = 0, len = ref4.length; j < len; j++) {
          item = ref4[j];
          if (typeof item.destroy === "function") {
            item.destroy();
          }
        }
        return (ref5 = this.container) != null ? ref5.didDestroyPane({
          pane: this
        }) : void 0;
      }
    };

    Pane.prototype.isAlive = function() {
      return this.alive;
    };

    Pane.prototype.isDestroyed = function() {
      return !this.isAlive();
    };


    /*
    Section: Splitting
     */

    Pane.prototype.splitLeft = function(params) {
      return this.split('horizontal', 'before', params);
    };

    Pane.prototype.splitRight = function(params) {
      return this.split('horizontal', 'after', params);
    };

    Pane.prototype.splitUp = function(params) {
      return this.split('vertical', 'before', params);
    };

    Pane.prototype.splitDown = function(params) {
      return this.split('vertical', 'after', params);
    };

    Pane.prototype.split = function(orientation, side, params) {
      var newPane;
      if (params != null ? params.copyActiveItem : void 0) {
        if (params.items == null) {
          params.items = [];
        }
        params.items.push(this.copyActiveItem());
      }
      if (this.parent.orientation !== orientation) {
        this.parent.replaceChild(this, new PaneAxis({
          container: this.container,
          orientation: orientation,
          children: [this],
          flexScale: this.flexScale
        }, this.viewRegistry));
        this.setFlexScale(1);
      }
      newPane = new Pane(extend({
        applicationDelegate: this.applicationDelegate,
        notificationManager: this.notificationManager,
        deserializerManager: this.deserializerManager,
        config: this.config,
        viewRegistry: this.viewRegistry
      }, params));
      switch (side) {
        case 'before':
          this.parent.insertChildBefore(this, newPane);
          break;
        case 'after':
          this.parent.insertChildAfter(this, newPane);
      }
      if (params != null ? params.moveActiveItem : void 0) {
        this.moveItemToPane(this.activeItem, newPane);
      }
      newPane.activate();
      return newPane;
    };

    Pane.prototype.findLeftmostSibling = function() {
      var leftmostSibling;
      if (this.parent.orientation === 'horizontal') {
        leftmostSibling = this.parent.children[0];
        if (leftmostSibling instanceof PaneAxis) {
          return this;
        } else {
          return leftmostSibling;
        }
      } else {
        return this;
      }
    };

    Pane.prototype.findRightmostSibling = function() {
      var rightmostSibling;
      if (this.parent.orientation === 'horizontal') {
        rightmostSibling = last(this.parent.children);
        if (rightmostSibling instanceof PaneAxis) {
          return this;
        } else {
          return rightmostSibling;
        }
      } else {
        return this;
      }
    };

    Pane.prototype.findOrCreateRightmostSibling = function() {
      var rightmostSibling;
      rightmostSibling = this.findRightmostSibling();
      if (rightmostSibling === this) {
        return this.splitRight();
      } else {
        return rightmostSibling;
      }
    };

    Pane.prototype.findTopmostSibling = function() {
      var topmostSibling;
      if (this.parent.orientation === 'vertical') {
        topmostSibling = this.parent.children[0];
        if (topmostSibling instanceof PaneAxis) {
          return this;
        } else {
          return topmostSibling;
        }
      } else {
        return this;
      }
    };

    Pane.prototype.findBottommostSibling = function() {
      var bottommostSibling;
      if (this.parent.orientation === 'vertical') {
        bottommostSibling = last(this.parent.children);
        if (bottommostSibling instanceof PaneAxis) {
          return this;
        } else {
          return bottommostSibling;
        }
      } else {
        return this;
      }
    };

    Pane.prototype.findOrCreateBottommostSibling = function() {
      var bottommostSibling;
      bottommostSibling = this.findBottommostSibling();
      if (bottommostSibling === this) {
        return this.splitDown();
      } else {
        return bottommostSibling;
      }
    };

    Pane.prototype.close = function() {
      if (this.confirmClose()) {
        return this.destroy();
      }
    };

    Pane.prototype.confirmClose = function() {
      var item, j, len, ref2;
      ref2 = this.getItems();
      for (j = 0, len = ref2.length; j < len; j++) {
        item = ref2[j];
        if (!this.promptToSaveItem(item)) {
          return false;
        }
      }
      return true;
    };

    Pane.prototype.handleSaveError = function(error, item) {
      var addWarningWithPath, customMessage, errorMatch, fileName, itemPath, ref2, ref3, ref4;
      itemPath = (ref2 = error.path) != null ? ref2 : item != null ? typeof item.getPath === "function" ? item.getPath() : void 0 : void 0;
      addWarningWithPath = (function(_this) {
        return function(message, options) {
          if (itemPath) {
            message = message + " '" + itemPath + "'";
          }
          return _this.notificationManager.addWarning(message, options);
        };
      })(this);
      customMessage = this.getMessageForErrorCode(error.code);
      if (customMessage != null) {
        return addWarningWithPath("Unable to save file: " + customMessage);
      } else if (error.code === 'EISDIR' || ((ref3 = error.message) != null ? typeof ref3.endsWith === "function" ? ref3.endsWith('is a directory') : void 0 : void 0)) {
        return this.notificationManager.addWarning("Unable to save file: " + error.message);
      } else if ((ref4 = error.code) === 'EPERM' || ref4 === 'EBUSY' || ref4 === 'UNKNOWN' || ref4 === 'EEXIST' || ref4 === 'ELOOP' || ref4 === 'EAGAIN') {
        return addWarningWithPath('Unable to save file', {
          detail: error.message
        });
      } else if (errorMatch = /ENOTDIR, not a directory '([^']+)'/.exec(error.message)) {
        fileName = errorMatch[1];
        return this.notificationManager.addWarning("Unable to save file: A directory in the path '" + fileName + "' could not be written to");
      } else {
        throw error;
      }
    };

    Pane.prototype.getMessageForErrorCode = function(errorCode) {
      switch (errorCode) {
        case 'EACCES':
          return 'Permission denied';
        case 'ECONNRESET':
          return 'Connection reset';
        case 'EINTR':
          return 'Interrupted system call';
        case 'EIO':
          return 'I/O error writing file';
        case 'ENOSPC':
          return 'No space left on device';
        case 'ENOTSUP':
          return 'Operation not supported on socket';
        case 'ENXIO':
          return 'No such device or address';
        case 'EROFS':
          return 'Read-only file system';
        case 'ESPIPE':
          return 'Invalid seek';
        case 'ETIMEDOUT':
          return 'Connection timed out';
      }
    };

    return Pane;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsZTovLy9DOi9wcm9qZWN0cy9hdG9tL291dC9hcHAvc3JjL3BhbmUuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSxtSUFBQTtJQUFBOzs7RUFBQSxJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7O0VBQ1AsTUFBZ0MsT0FBQSxDQUFRLGlCQUFSLENBQWhDLEVBQUMsZUFBRCxFQUFPLHFCQUFQLEVBQWdCLG1CQUFoQixFQUF3Qjs7RUFDeEIsT0FBaUMsT0FBQSxDQUFRLFdBQVIsQ0FBakMsRUFBQyw4Q0FBRCxFQUFzQjs7RUFDdEIsUUFBQSxHQUFXLE9BQUEsQ0FBUSxhQUFSOztFQUNYLFVBQUEsR0FBYSxPQUFBLENBQVEsZUFBUjs7RUFDYixXQUFBLEdBQWMsT0FBQSxDQUFRLGdCQUFSOztFQUVkLGNBQUEsR0FBaUI7O0VBV2pCLE1BQU0sQ0FBQyxPQUFQLEdBQ007bUJBQ0osT0FBQSxHQUFTLFNBQUE7YUFBRyxPQUFBLEdBQVEsSUFBQyxDQUFBO0lBQVo7O0lBRVQsSUFBQyxDQUFBLFdBQUQsR0FBYyxTQUFDLEtBQUQsRUFBUSxHQUFSO0FBQ1osVUFBQTtNQURxQixtQ0FBZSwrQ0FBcUIscUJBQVEsbUNBQWU7TUFDL0UsbUJBQUQsRUFBUSx1Q0FBUixFQUF5QixtQ0FBekIsRUFBd0M7O1FBQ3hDLGdCQUFpQjs7TUFDakIsS0FBQSxHQUFRLEtBQUssQ0FBQyxHQUFOLENBQVUsU0FBQyxTQUFEO2VBQWUsYUFBYSxDQUFDLFdBQWQsQ0FBMEIsU0FBMUI7TUFBZixDQUFWO01BQ1IsS0FBSyxDQUFDLFVBQU4sR0FBbUIsS0FBTSxDQUFBLGVBQUE7TUFDekIsS0FBSyxDQUFDLEtBQU4sR0FBYyxPQUFBLENBQVEsS0FBUjtNQUNkLElBQUcscUJBQUg7O1VBQ0UsS0FBSyxDQUFDLGFBQWMsSUFBQSxDQUFLLEtBQUssQ0FBQyxLQUFYLEVBQWtCLFNBQUMsSUFBRDtBQUNwQyxnQkFB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T0FBZDtTQUExQyxFQURHO09BQUEsTUFFQSxJQUFHLFVBQUEsR0FBYSxvQ0FBb0MsQ0FBQyxJQUFyQyxDQUEwQyxLQUFLLENBQUMsT0FBaEQsQ0FBaEI7UUFDSCxRQUFBLEdBQVcsVUFBVyxDQUFBLENBQUE7ZUFDdEIsSUFBQyxDQUFBLG1CQUFtQixDQUFDLFVBQXJCLENBQWdDLGdEQUFBLEdBQWlELFFBQWpELEdBQTBELDJCQUExRixFQUZHO09BQUEsTUFBQTtBQUlILGNBQU0sTUFKSDs7SUFiVTs7bUJBbUJqQixzQkFBQSxHQUF3QixTQUFDLFNBQUQ7QUFDdEIsY0FBTyxTQUFQO0FBQUEsYUFDTyxRQURQO2lCQUNxQjtBQURyQixhQUVPLFlBRlA7aUJBRXlCO0FBRnpCLGFBR08sT0FIUDtpQkFHb0I7QUFIcEIsYUFJTyxLQUpQO2lCQUlrQjtBQUpsQixhQUtPLFFBTFA7aUJBS3FCO0FBTHJCLGFBTU8sU0FOUDtpQkFNc0I7QUFOdEIsYUFPTyxPQVBQO2lCQU9vQjtBQVBwQixhQVFPLE9BUlA7aUJBUW9CO0FBUnBCLGFBU08sUUFUUDtpQkFTcUI7QUFUckIsYUFVTyxXQVZQO2lCQVV3QjtBQVZ4QjtJQURzQjs7Ozs7QUExNkIxQiIsInNvdXJjZXNDb250ZW50IjpbIkdyaW0gPSByZXF1aXJlICdncmltJ1xue2ZpbmQsIGNvbXBhY3QsIGV4dGVuZCwgbGFzdH0gPSByZXF1aXJlICd1bmRlcnNjb3JlLXBsdXMnXG57Q29tcG9zaXRlRGlzcG9zYWJsZSwgRW1pdHRlcn0gPSByZXF1aXJlICdldmVudC1raXQnXG5QYW5lQXhpcyA9IHJlcXVpcmUgJy4vcGFuZS1heGlzJ1xuVGV4dEVkaXRvciA9IHJlcXVpcmUgJy4vdGV4dC1lZGl0b3InXG5QYW5lRWxlbWVudCA9IHJlcXVpcmUgJy4vcGFuZS1lbGVtZW50J1xuXG5uZXh0SW5zdGFuY2VJZCA9IDFcblxuIyBFeHRlbmRlZDogQSBjb250YWluZXIgZm9yIHByZXNlbnRpbmcgY29udGVudCBpbiB0aGUgY2VudGVyIG9mIHRoZSB3b3Jrc3BhY2UuXG4jIFBhbmVzIGNhbiBjb250YWluIG11bHRpcGxlIGl0ZW1zLCBvbmUgb2Ygd2hpY2ggaXMgKmFjdGl2ZSogYXQgYSBnaXZlbiB0aW1lLlxuIyBUaGUgdmlldyBjb3JyZXNwb25kaW5nIHRvIHRoZSBhY3RpdmUgaXRlbSBpcyBkaXNwbGF5ZWQgaW4gdGhlIGludGVyZmFjZS4gSW5cbiMgdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbiwgdGFicyBhcmUgYWxzbyBkaXNwbGF5ZWQgZm9yIGVhY2ggaXRlbS5cbiNcbiMgRWFjaCBwYW5lIG1heSBhbHNvIGNvbnRhaW4gb25lICpwZW5kaW5nKiBpdGVtLiBXaGVuIGEgcGVuZGluZyBpdGVtIGlzIGFkZGVkXG4jIHRvIGEgcGFuZSwgaXQgd2lsbCByZXBsYWNlIHRoZSBjdXJyZW50bHkgcGVuZGluZyBpdGVtLCBpZiBhbnksIGluc3RlYWQgb2ZcbiMgc2ltcGx5IGJlaW5nIGFkZGVkLiBJbiB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uLCB0aGUgdGV4dCBpbiB0aGUgdGFiIGZvclxuIyBwZW5kaW5nIGl0ZW1zIGlzIHNob3duIGluIGl0YWxpY3MuXG5tb2R1bGUuZXhwb3J0cyA9XG5jbGFzcyBQYW5lXG4gIGluc3BlY3Q6IC0+IFwiUGFuZSAje0BpZH1cIlxuXG4gIEBkZXNlcmlhbGl6ZTogKHN0YXRlLCB7ZGVzZXJpYWxpemVycywgYXBwbGljYXRpb25EZWxlZ2F0ZSwgY29uZmlnLCBub3RpZmljYXRpb25zLCB2aWV3c30pIC0+XG4gICAge2l0ZW1zLCBhY3RpdmVJdGVtSW5kZXgsIGFjdGl2ZUl0ZW1VUkksIGFjdGl2ZUl0ZW1Vcml9ID0gc3RhdGVcbiAgICBhY3RpdmVJdGVtVVJJID89IGFjdGl2ZUl0ZW1VcmlcbiAgICBpdGVtcyA9IGl0ZW1zLm1hcCAoaXRlbVN0YXRlKSAtPiBkZXNlcmlhbGl6ZXJzLmRlc2VyaWFsaXplKGl0ZW1TdGF0ZSlcbiAgICBzdGF0ZS5hY3RpdmVJdGVtID0gaXRlbXNbYWN0aXZlSXRlbUluZGV4XVxuICAgIHN0YXRlLml0ZW1zID0gY29tcGFjdChpdGVtcylcbiAgICBpZiBhY3RpdmVJdGVtVVJJP1xuICAgICAgc3RhdGUuYWN0aXZlSXRlbSA/PSBmaW5kIHN0YXRlLml0ZW1zLCAoaXRlbSkgLT5cbiAgICAgICAgaWYgdHlwZW9mIGl0ZW0uZ2V0VVJJIGlzICdmdW5jdGlvbidcbiAgICAgICAgICBpdGVtVVJJID0gaXRlbS5nZXRVUkkoKVxuICAgICAgICBpdGVtVVJJIGlzIGFjdGl2ZUl0ZW1VUklcbiAgICBuZXcgUGFuZShleHRlbmQoc3RhdGUsIHtcbiAgICAgIGRlc2VyaWFsaXplck1hbmFnZXI6IGRlc2VyaWFsaXplcnMsXG4gICAgICBub3RpZmljYXRpb25NYW5hZ2VyOiBub3RpZmljYXRpb25zLFxuICAgICAgdmlld1JlZ2lzdHJ5OiB2aWV3cyxcbiAgICAgIGNvbmZpZywgYXBwbGljYXRpb25EZWxlZ2F0ZVxuICAgIH0pKVxuXG4gIGNvbnN0cnVjdG9yOiAocGFyYW1zKSAtPlxuICAgIHtcbiAgICAgIEBpZCwgQGFjdGl2ZUl0ZW0sIEBmb2N1c2VkLCBAYXBwbGljYXRpb25EZWxlZ2F0ZSwgQG5vdGlmaWNhdGlvbk1hbmFnZXIsIEBjb25maWcsXG4gICAgICBAZGVzZXJpYWxpemVyTWFuYWdlciwgQHZpZXdSZWdpc3RyeVxuICAgIH0gPSBwYXJhbXNcblxuICAgIGlmIEBpZD9cbiAgICAgIG5leHRJbnN0YW5jZUlkID0gTWF0aC5tYXgobmV4dEluc3RhbmNlSWQsIEBpZCArIDEpXG4gICAgZWxzZVxuICAgICAgQGlkID0gbmV4dEluc3RhbmNlSWQrK1xuICAgIEBlbWl0dGVyID0gbmV3IEVtaXR0ZXJcbiAgICBAYWxpdmUgPSB0cnVlXG4gICAgQHN1YnNjcmlwdGlvbnNQZXJJdGVtID0gbmV3IFdlYWtNYXBcbiAgICBAaXRlbXMgPSBbXVxuICAgIEBpdGVtU3RhY2sgPSBbXVxuICAgIEBjb250YWluZXIgPSBudWxsXG4gICAgQGFjdGl2ZUl0ZW0gPz0gdW5kZWZpbmVkXG4gICAgQGZvY3VzZWQgPz0gZmFsc2VcblxuICAgIEBhZGRJdGVtcyhjb21wYWN0KHBhcmFtcz8uaXRlbXMgPyBbXSkpXG4gICAgQHNldEFjdGl2ZUl0ZW0oQGl0ZW1zWzBdKSB1bmxlc3MgQGdldEFjdGl2ZUl0ZW0oKT9cbiAgICBAYWRkSXRlbXNUb1N0YWNrKHBhcmFtcz8uaXRlbVN0YWNrSW5kaWNlcyA/IFtdKVxuICAgIEBzZXRGbGV4U2NhbGUocGFyYW1zPy5mbGV4U2NhbGUgPyAxKVxuXG4gIGdldEVsZW1lbnQ6IC0+XG4gICAgQGVsZW1lbnQgPz0gbmV3IFBhbmVFbGVtZW50KCkuaW5pdGlhbGl6ZSh0aGlzLCB7dmlld3M6IEB2aWV3UmVnaXN0cnksIEBhcHBsaWNhdGlvbkRlbGVnYXRlfSlcblxuICBzZXJpYWxpemU6IC0+XG4gICAgaXRlbXNUb0JlU2VyaWFsaXplZCA9IGNvbXBhY3QoQGl0ZW1zLm1hcCgoaXRlbSkgLT4gaXRlbSBpZiB0eXBlb2YgaXRlbS5zZXJpYWxpemUgaXMgJ2Z1bmN0aW9uJykpXG4gICAgaXRlbVN0YWNrSW5kaWNlcyA9IChpdGVtc1RvQmVTZXJpYWxpemVkLmluZGV4T2YoaXRlbSkgZm9yIGl0ZW0gaW4gQGl0ZW1TdGFjayB3aGVuIHR5cGVvZiBpdGVtLnNlcmlhbGl6ZSBpcyAnZnVuY3Rpb24nKVxuICAgIGFjdGl2ZUl0ZW1JbmRleCA9IGl0ZW1zVG9CZVNlcmlhbGl6ZWQuaW5kZXhPZihAYWN0aXZlSXRlbSlcblxuICAgIHtcbiAgICAgIGRlc2VyaWFsaXplcjogJ1BhbmUnLFxuICAgICAgaWQ6IEBpZCxcbiAgICAgIGl0ZW1zOiBpdGVtc1RvQmVTZXJpYWxpemVkLm1hcCgoaXRlbSkgLT4gaXRlbS5zZXJpYWxpemUoKSlcbiAgICAgIGl0ZW1TdGFja0luZGljZXM6IGl0ZW1TdGFja0luZGljZXNcbiAgICAgIGFjdGl2ZUl0ZW1JbmRleDogYWN0aXZlSXRlbUluZGV4XG4gICAgICBmb2N1c2VkOiBAZm9jdXNlZFxuICAgICAgZmxleFNjYWxlOiBAZmxleFNjYWxlXG4gICAgfVxuXG4gIGdldFBhcmVudDogLT4gQHBhcmVudFxuXG4gIHNldFBhcmVudDogKEBwYXJlbnQpIC0+IEBwYXJlbnRcblxuICBnZXRDb250YWluZXI6IC0+IEBjb250YWluZXJcblxuICBzZXRDb250YWluZXI6IChjb250YWluZXIpIC0+XG4gICAgaWYgY29udGFpbmVyIGFuZCBjb250YWluZXIgaXNudCBAY29udGFpbmVyXG4gICAgICBAY29udGFpbmVyID0gY29udGFpbmVyXG4gICAgICBjb250YWluZXIuZGlkQWRkUGFuZSh7cGFuZTogdGhpc30pXG5cbiAgc2V0RmxleFNjYWxlOiAoQGZsZXhTY2FsZSkgLT5cbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlLWZsZXgtc2NhbGUnLCBAZmxleFNjYWxlXG4gICAgQGZsZXhTY2FsZVxuXG4gIGdldEZsZXhTY2FsZTogLT4gQGZsZXhTY2FsZVxuXG4gIGluY3JlYXNlU2l6ZTogLT4gQHNldEZsZXhTY2FsZShAZ2V0RmxleFNjYWxlKCkgKiAxLjEpXG5cbiAgZGVjcmVhc2VTaXplOiAtPiBAc2V0RmxleFNjYWxlKEBnZXRGbGV4U2NhbGUoKSAvIDEuMSlcblxuICAjIyNcbiAgU2VjdGlvbjogRXZlbnQgU3Vic2NyaXB0aW9uXG4gICMjI1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gdGhlIHBhbmUgcmVzaXplc1xuICAjXG4gICMgVGhlIGNhbGxiYWNrIHdpbGwgYmUgaW52b2tlZCB3aGVuIHBhbmUncyBmbGV4U2NhbGUgcHJvcGVydHkgY2hhbmdlcy5cbiAgIyBVc2Ugezo6Z2V0RmxleFNjYWxlfSB0byBnZXQgdGhlIGN1cnJlbnQgdmFsdWUuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2hlbiB0aGUgcGFuZSBpcyByZXNpemVkXG4gICMgICAqIGBmbGV4U2NhbGVgIHtOdW1iZXJ9IHJlcHJlc2VudGluZyB0aGUgcGFuZXMgYGZsZXgtZ3Jvd2A7IGFiaWxpdHkgZm9yIGFcbiAgIyAgICAgZmxleCBpdGVtIHRvIGdyb3cgaWYgbmVjZXNzYXJ5LlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCAnLmRpc3Bvc2UoKScgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VGbGV4U2NhbGU6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWNoYW5nZS1mbGV4LXNjYWxlJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aXRoIHRoZSBjdXJyZW50IGFuZCBmdXR1cmUgdmFsdWVzIG9mXG4gICMgezo6Z2V0RmxleFNjYWxlfS5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aXRoIHRoZSBjdXJyZW50IGFuZCBmdXR1cmUgdmFsdWVzIG9mXG4gICMgICB0aGUgezo6Z2V0RmxleFNjYWxlfSBwcm9wZXJ0eS5cbiAgIyAgICogYGZsZXhTY2FsZWAge051bWJlcn0gcmVwcmVzZW50aW5nIHRoZSBwYW5lcyBgZmxleC1ncm93YDsgYWJpbGl0eSBmb3IgYVxuICAjICAgICBmbGV4IGl0ZW0gdG8gZ3JvdyBpZiBuZWNlc3NhcnkuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvYnNlcnZlRmxleFNjYWxlOiAoY2FsbGJhY2spIC0+XG4gICAgY2FsbGJhY2soQGZsZXhTY2FsZSlcbiAgICBAb25EaWRDaGFuZ2VGbGV4U2NhbGUoY2FsbGJhY2spXG5cbiAgIyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiB0aGUgcGFuZSBpcyBhY3RpdmF0ZWQuXG4gICNcbiAgIyBUaGUgZ2l2ZW4gY2FsbGJhY2sgd2lsbCBiZSBpbnZva2VkIHdoZW5ldmVyIHs6OmFjdGl2YXRlfSBpcyBjYWxsZWQgb24gdGhlXG4gICMgcGFuZSwgZXZlbiBpZiBpdCBpcyBhbHJlYWR5IGFjdGl2ZSBhdCB0aGUgdGltZS5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBwYW5lIGlzIGFjdGl2YXRlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkQWN0aXZhdGU6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWFjdGl2YXRlJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayBiZWZvcmUgdGhlIHBhbmUgaXMgZGVzdHJveWVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgcGFuZSBpcyBkZXN0cm95ZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbldpbGxEZXN0cm95OiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ3dpbGwtZGVzdHJveScsIGNhbGxiYWNrXG5cbiAgIyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiB0aGUgcGFuZSBpcyBkZXN0cm95ZWQuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2hlbiB0aGUgcGFuZSBpcyBkZXN0cm95ZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZERlc3Ryb3k6IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWRlc3Ryb3knLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gdGhlIHZhbHVlIG9mIHRoZSB7Ojppc0FjdGl2ZX1cbiAgIyBwcm9wZXJ0eSBjaGFuZ2VzLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdoZW4gdGhlIHZhbHVlIG9mIHRoZSB7Ojppc0FjdGl2ZX1cbiAgIyAgIHByb3BlcnR5IGNoYW5nZXMuXG4gICMgICAqIGBhY3RpdmVgIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIHBhbmUgaXMgYWN0aXZlLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VBY3RpdmU6IChjYWxsYmFjaykgLT5cbiAgICBAY29udGFpbmVyLm9uRGlkQ2hhbmdlQWN0aXZlUGFuZSAoYWN0aXZlUGFuZSkgPT5cbiAgICAgIGNhbGxiYWNrKHRoaXMgaXMgYWN0aXZlUGFuZSlcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aXRoIHRoZSBjdXJyZW50IGFuZCBmdXR1cmUgdmFsdWVzIG9mIHRoZVxuICAjIHs6OmlzQWN0aXZlfSBwcm9wZXJ0eS5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aXRoIHRoZSBjdXJyZW50IGFuZCBmdXR1cmUgdmFsdWVzIG9mXG4gICMgICB0aGUgezo6aXNBY3RpdmV9IHByb3BlcnR5LlxuICAjICAgKiBgYWN0aXZlYCB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBwYW5lIGlzIGFjdGl2ZS5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9ic2VydmVBY3RpdmU6IChjYWxsYmFjaykgLT5cbiAgICBjYWxsYmFjayhAaXNBY3RpdmUoKSlcbiAgICBAb25EaWRDaGFuZ2VBY3RpdmUoY2FsbGJhY2spXG5cbiAgIyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiBhbiBpdGVtIGlzIGFkZGVkIHRvIHRoZSBwYW5lLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdpdGggd2hlbiBpdGVtcyBhcmUgYWRkZWQuXG4gICMgICAqIGBldmVudGAge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAgICogYGl0ZW1gIFRoZSBhZGRlZCBwYW5lIGl0ZW0uXG4gICMgICAgICogYGluZGV4YCB7TnVtYmVyfSBpbmRpY2F0aW5nIHdoZXJlIHRoZSBpdGVtIGlzIGxvY2F0ZWQuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Rpc3Bvc2FibGV9IG9uIHdoaWNoIGAuZGlzcG9zZSgpYCBjYW4gYmUgY2FsbGVkIHRvIHVuc3Vic2NyaWJlLlxuICBvbkRpZEFkZEl0ZW06IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnZGlkLWFkZC1pdGVtJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIGFuIGl0ZW0gaXMgcmVtb3ZlZCBmcm9tIHRoZSBwYW5lLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdpdGggd2hlbiBpdGVtcyBhcmUgcmVtb3ZlZC5cbiAgIyAgICogYGV2ZW50YCB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICAgKiBgaXRlbWAgVGhlIHJlbW92ZWQgcGFuZSBpdGVtLlxuICAjICAgICAqIGBpbmRleGAge051bWJlcn0gaW5kaWNhdGluZyB3aGVyZSB0aGUgaXRlbSB3YXMgbG9jYXRlZC5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRGlkUmVtb3ZlSXRlbTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtcmVtb3ZlLWl0ZW0nLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIGJlZm9yZSBhbiBpdGVtIGlzIHJlbW92ZWQgZnJvbSB0aGUgcGFuZS5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aXRoIHdoZW4gaXRlbXMgYXJlIHJlbW92ZWQuXG4gICMgICAqIGBldmVudGAge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAgICogYGl0ZW1gIFRoZSBwYW5lIGl0ZW0gdG8gYmUgcmVtb3ZlZC5cbiAgIyAgICAgKiBgaW5kZXhgIHtOdW1iZXJ9IGluZGljYXRpbmcgd2hlcmUgdGhlIGl0ZW0gaXMgbG9jYXRlZC5cbiAgb25XaWxsUmVtb3ZlSXRlbTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICd3aWxsLXJlbW92ZS1pdGVtJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aGVuIGFuIGl0ZW0gaXMgbW92ZWQgd2l0aGluIHRoZSBwYW5lLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdpdGggd2hlbiBpdGVtcyBhcmUgbW92ZWQuXG4gICMgICAqIGBldmVudGAge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAgICogYGl0ZW1gIFRoZSByZW1vdmVkIHBhbmUgaXRlbS5cbiAgIyAgICAgKiBgb2xkSW5kZXhgIHtOdW1iZXJ9IGluZGljYXRpbmcgd2hlcmUgdGhlIGl0ZW0gd2FzIGxvY2F0ZWQuXG4gICMgICAgICogYG5ld0luZGV4YCB7TnVtYmVyfSBpbmRpY2F0aW5nIHdoZXJlIHRoZSBpdGVtIGlzIG5vdyBsb2NhdGVkLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRNb3ZlSXRlbTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkaWQtbW92ZS1pdGVtJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aXRoIGFsbCBjdXJyZW50IGFuZCBmdXR1cmUgaXRlbXMuXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2l0aCBjdXJyZW50IGFuZCBmdXR1cmUgaXRlbXMuXG4gICMgICAqIGBpdGVtYCBBbiBpdGVtIHRoYXQgaXMgcHJlc2VudCBpbiB7OjpnZXRJdGVtc30gYXQgdGhlIHRpbWUgb2ZcbiAgIyAgICAgc3Vic2NyaXB0aW9uIG9yIHRoYXQgaXMgYWRkZWQgYXQgc29tZSBsYXRlciB0aW1lLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb2JzZXJ2ZUl0ZW1zOiAoY2FsbGJhY2spIC0+XG4gICAgY2FsbGJhY2soaXRlbSkgZm9yIGl0ZW0gaW4gQGdldEl0ZW1zKClcbiAgICBAb25EaWRBZGRJdGVtICh7aXRlbX0pIC0+IGNhbGxiYWNrKGl0ZW0pXG5cbiAgIyBQdWJsaWM6IEludm9rZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgd2hlbiB0aGUgdmFsdWUgb2Ygezo6Z2V0QWN0aXZlSXRlbX1cbiAgIyBjaGFuZ2VzLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdpdGggd2hlbiB0aGUgYWN0aXZlIGl0ZW0gY2hhbmdlcy5cbiAgIyAgICogYGFjdGl2ZUl0ZW1gIFRoZSBjdXJyZW50IGFjdGl2ZSBpdGVtLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0byB1bnN1YnNjcmliZS5cbiAgb25EaWRDaGFuZ2VBY3RpdmVJdGVtOiAoY2FsbGJhY2spIC0+XG4gICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UtYWN0aXZlLWl0ZW0nLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gezo6YWN0aXZhdGVOZXh0UmVjZW50bHlVc2VkSXRlbX1cbiAgIyBoYXMgYmVlbiBjYWxsZWQsIGVpdGhlciBpbml0aWF0aW5nIG9yIGNvbnRpbnVpbmcgYSBmb3J3YXJkIE1SVSB0cmF2ZXJzYWwgb2ZcbiAgIyBwYW5lIGl0ZW1zLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIHdpdGggd2hlbiB0aGUgYWN0aXZlIGl0ZW0gY2hhbmdlcy5cbiAgIyAgICogYG5leHRSZWNlbnRseVVzZWRJdGVtYCBUaGUgbmV4dCBNUlUgaXRlbSwgbm93IGJlaW5nIHNldCBhY3RpdmVcbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uQ2hvb3NlTmV4dE1SVUl0ZW06IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnY2hvb3NlLW5leHQtbXJ1LWl0ZW0nLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gezo6YWN0aXZhdGVQcmV2aW91c1JlY2VudGx5VXNlZEl0ZW19XG4gICMgaGFzIGJlZW4gY2FsbGVkLCBlaXRoZXIgaW5pdGlhdGluZyBvciBjb250aW51aW5nIGEgcmV2ZXJzZSBNUlUgdHJhdmVyc2FsIG9mXG4gICMgcGFuZSBpdGVtcy5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aXRoIHdoZW4gdGhlIGFjdGl2ZSBpdGVtIGNoYW5nZXMuXG4gICMgICAqIGBwcmV2aW91c1JlY2VudGx5VXNlZEl0ZW1gIFRoZSBwcmV2aW91cyBNUlUgaXRlbSwgbm93IGJlaW5nIHNldCBhY3RpdmVcbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uQ2hvb3NlTGFzdE1SVUl0ZW06IChjYWxsYmFjaykgLT5cbiAgICBAZW1pdHRlci5vbiAnY2hvb3NlLWxhc3QtbXJ1LWl0ZW0nLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIHdoZW4gezo6bW92ZUFjdGl2ZUl0ZW1Ub1RvcE9mU3RhY2t9XG4gICMgaGFzIGJlZW4gY2FsbGVkLCB0ZXJtaW5hdGluZyBhbiBNUlUgdHJhdmVyc2FsIG9mIHBhbmUgaXRlbXMgYW5kIG1vdmluZyB0aGVcbiAgIyBjdXJyZW50IGFjdGl2ZSBpdGVtIHRvIHRoZSB0b3Agb2YgdGhlIHN0YWNrLiBUeXBpY2FsbHkgYm91bmQgdG8gYSBtb2RpZmllclxuICAjIChlLmcuIENUUkwpIGtleSB1cCBldmVudC5cbiAgI1xuICAjICogYGNhbGxiYWNrYCB7RnVuY3Rpb259IHRvIGJlIGNhbGxlZCB3aXRoIHdoZW4gdGhlIE1SVSB0cmF2ZXJzYWwgaXMgZG9uZS5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9uRG9uZUNob29zaW5nTVJVSXRlbTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICdkb25lLWNob29zaW5nLW1ydS1pdGVtJywgY2FsbGJhY2tcblxuICAjIFB1YmxpYzogSW52b2tlIHRoZSBnaXZlbiBjYWxsYmFjayB3aXRoIHRoZSBjdXJyZW50IGFuZCBmdXR1cmUgdmFsdWVzIG9mXG4gICMgezo6Z2V0QWN0aXZlSXRlbX0uXG4gICNcbiAgIyAqIGBjYWxsYmFja2Age0Z1bmN0aW9ufSB0byBiZSBjYWxsZWQgd2l0aCB0aGUgY3VycmVudCBhbmQgZnV0dXJlIGFjdGl2ZVxuICAjICAgaXRlbXMuXG4gICMgICAqIGBhY3RpdmVJdGVtYCBUaGUgY3VycmVudCBhY3RpdmUgaXRlbS5cbiAgI1xuICAjIFJldHVybnMgYSB7RGlzcG9zYWJsZX0gb24gd2hpY2ggYC5kaXNwb3NlKClgIGNhbiBiZSBjYWxsZWQgdG8gdW5zdWJzY3JpYmUuXG4gIG9ic2VydmVBY3RpdmVJdGVtOiAoY2FsbGJhY2spIC0+XG4gICAgY2FsbGJhY2soQGdldEFjdGl2ZUl0ZW0oKSlcbiAgICBAb25EaWRDaGFuZ2VBY3RpdmVJdGVtKGNhbGxiYWNrKVxuXG4gICMgUHVibGljOiBJbnZva2UgdGhlIGdpdmVuIGNhbGxiYWNrIGJlZm9yZSBpdGVtcyBhcmUgZGVzdHJveWVkLlxuICAjXG4gICMgKiBgY2FsbGJhY2tgIHtGdW5jdGlvbn0gdG8gYmUgY2FsbGVkIGJlZm9yZSBpdGVtcyBhcmUgZGVzdHJveWVkLlxuICAjICAgKiBgZXZlbnRgIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgICAqIGBpdGVtYCBUaGUgaXRlbSB0aGF0IHdpbGwgYmUgZGVzdHJveWVkLlxuICAjICAgICAqIGBpbmRleGAgVGhlIGxvY2F0aW9uIG9mIHRoZSBpdGVtLlxuICAjXG4gICMgUmV0dXJucyBhIHtEaXNwb3NhYmxlfSBvbiB3aGljaCBgLmRpc3Bvc2UoKWAgY2FuIGJlIGNhbGxlZCB0b1xuICAjIHVuc3Vic2NyaWJlLlxuICBvbldpbGxEZXN0cm95SXRlbTogKGNhbGxiYWNrKSAtPlxuICAgIEBlbWl0dGVyLm9uICd3aWxsLWRlc3Ryb3ktaXRlbScsIGNhbGxiYWNrXG5cbiAgIyBDYWxsZWQgYnkgdGhlIHZpZXcgbGF5ZXIgdG8gaW5kaWNhdGUgdGhhdCB0aGUgcGFuZSBoYXMgZ2FpbmVkIGZvY3VzLlxuICBmb2N1czogLT5cbiAgICBAZm9jdXNlZCA9IHRydWVcbiAgICBAYWN0aXZhdGUoKVxuXG4gICMgQ2FsbGVkIGJ5IHRoZSB2aWV3IGxheWVyIHRvIGluZGljYXRlIHRoYXQgdGhlIHBhbmUgaGFzIGxvc3QgZm9jdXMuXG4gIGJsdXI6IC0+XG4gICAgQGZvY3VzZWQgPSBmYWxzZVxuICAgIHRydWUgIyBpZiB0aGlzIGlzIGNhbGxlZCBmcm9tIGFuIGV2ZW50IGhhbmRsZXIsIGRvbid0IGNhbmNlbCBpdFxuXG4gIGlzRm9jdXNlZDogLT4gQGZvY3VzZWRcblxuICBnZXRQYW5lczogLT4gW3RoaXNdXG5cbiAgdW5zdWJzY3JpYmVGcm9tSXRlbTogKGl0ZW0pIC0+XG4gICAgQHN1YnNjcmlwdGlvbnNQZXJJdGVtLmdldChpdGVtKT8uZGlzcG9zZSgpXG4gICAgQHN1YnNjcmlwdGlvbnNQZXJJdGVtLmRlbGV0ZShpdGVtKVxuXG4gICMjI1xuICBTZWN0aW9uOiBJdGVtc1xuICAjIyNcblxuICAjIFB1YmxpYzogR2V0IHRoZSBpdGVtcyBpbiB0aGlzIHBhbmUuXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2YgaXRlbXMuXG4gIGdldEl0ZW1zOiAtPlxuICAgIEBpdGVtcy5zbGljZSgpXG5cbiAgIyBQdWJsaWM6IEdldCB0aGUgYWN0aXZlIHBhbmUgaXRlbSBpbiB0aGlzIHBhbmUuXG4gICNcbiAgIyBSZXR1cm5zIGEgcGFuZSBpdGVtLlxuICBnZXRBY3RpdmVJdGVtOiAtPiBAYWN0aXZlSXRlbVxuXG4gIHNldEFjdGl2ZUl0ZW06IChhY3RpdmVJdGVtLCBvcHRpb25zKSAtPlxuICAgIHttb2RpZnlTdGFja30gPSBvcHRpb25zIGlmIG9wdGlvbnM/XG4gICAgdW5sZXNzIGFjdGl2ZUl0ZW0gaXMgQGFjdGl2ZUl0ZW1cbiAgICAgIEBhZGRJdGVtVG9TdGFjayhhY3RpdmVJdGVtKSB1bmxlc3MgbW9kaWZ5U3RhY2sgaXMgZmFsc2VcbiAgICAgIEBhY3RpdmVJdGVtID0gYWN0aXZlSXRlbVxuICAgICAgQGVtaXR0ZXIuZW1pdCAnZGlkLWNoYW5nZS1hY3RpdmUtaXRlbScsIEBhY3RpdmVJdGVtXG4gICAgICBAY29udGFpbmVyPy5kaWRDaGFuZ2VBY3RpdmVJdGVtT25QYW5lKHRoaXMsIEBhY3RpdmVJdGVtKVxuICAgIEBhY3RpdmVJdGVtXG5cbiAgIyBCdWlsZCB0aGUgaXRlbVN0YWNrIGFmdGVyIGRlc2VyaWFsaXppbmdcbiAgYWRkSXRlbXNUb1N0YWNrOiAoaXRlbVN0YWNrSW5kaWNlcykgLT5cbiAgICBpZiBAaXRlbXMubGVuZ3RoID4gMFxuICAgICAgaWYgaXRlbVN0YWNrSW5kaWNlcy5sZW5ndGggaXMgMCBvciBpdGVtU3RhY2tJbmRpY2VzLmxlbmd0aCBpc250IEBpdGVtcy5sZW5ndGggb3IgaXRlbVN0YWNrSW5kaWNlcy5pbmRleE9mKC0xKSA+PSAwXG4gICAgICAgIGl0ZW1TdGFja0luZGljZXMgPSAoaSBmb3IgaSBpbiBbMC4uQGl0ZW1zLmxlbmd0aC0xXSlcbiAgICAgIGZvciBpdGVtSW5kZXggaW4gaXRlbVN0YWNrSW5kaWNlc1xuICAgICAgICBAYWRkSXRlbVRvU3RhY2soQGl0ZW1zW2l0ZW1JbmRleF0pXG4gICAgICByZXR1cm5cblxuICAjIEFkZCBpdGVtIChvciBtb3ZlIGl0ZW0pIHRvIHRoZSBlbmQgb2YgdGhlIGl0ZW1TdGFja1xuICBhZGRJdGVtVG9TdGFjazogKG5ld0l0ZW0pIC0+XG4gICAgcmV0dXJuIHVubGVzcyBuZXdJdGVtP1xuICAgIGluZGV4ID0gQGl0ZW1TdGFjay5pbmRleE9mKG5ld0l0ZW0pXG4gICAgQGl0ZW1TdGFjay5zcGxpY2UoaW5kZXgsIDEpIHVubGVzcyBpbmRleCBpcyAtMVxuICAgIEBpdGVtU3RhY2sucHVzaChuZXdJdGVtKVxuXG4gICMgUmV0dXJuIGFuIHtUZXh0RWRpdG9yfSBpZiB0aGUgcGFuZSBpdGVtIGlzIGFuIHtUZXh0RWRpdG9yfSwgb3IgbnVsbCBvdGhlcndpc2UuXG4gIGdldEFjdGl2ZUVkaXRvcjogLT5cbiAgICBAYWN0aXZlSXRlbSBpZiBAYWN0aXZlSXRlbSBpbnN0YW5jZW9mIFRleHRFZGl0b3JcblxuICAjIFB1YmxpYzogUmV0dXJuIHRoZSBpdGVtIGF0IHRoZSBnaXZlbiBpbmRleC5cbiAgI1xuICAjICogYGluZGV4YCB7TnVtYmVyfVxuICAjXG4gICMgUmV0dXJucyBhbiBpdGVtIG9yIGBudWxsYCBpZiBubyBpdGVtIGV4aXN0cyBhdCB0aGUgZ2l2ZW4gaW5kZXguXG4gIGl0ZW1BdEluZGV4OiAoaW5kZXgpIC0+XG4gICAgQGl0ZW1zW2luZGV4XVxuXG4gICMgTWFrZXMgdGhlIG5leHQgaXRlbSBpbiB0aGUgaXRlbVN0YWNrIGFjdGl2ZS5cbiAgYWN0aXZhdGVOZXh0UmVjZW50bHlVc2VkSXRlbTogLT5cbiAgICBpZiBAaXRlbXMubGVuZ3RoID4gMVxuICAgICAgQGl0ZW1TdGFja0luZGV4ID0gQGl0ZW1TdGFjay5sZW5ndGggLSAxIHVubGVzcyBAaXRlbVN0YWNrSW5kZXg/XG4gICAgICBAaXRlbVN0YWNrSW5kZXggPSBAaXRlbVN0YWNrLmxlbmd0aCBpZiBAaXRlbVN0YWNrSW5kZXggaXMgMFxuICAgICAgQGl0ZW1TdGFja0luZGV4ID0gQGl0ZW1TdGFja0luZGV4IC0gMVxuICAgICAgbmV4dFJlY2VudGx5VXNlZEl0ZW0gPSBAaXRlbVN0YWNrW0BpdGVtU3RhY2tJbmRleF1cbiAgICAgIEBlbWl0dGVyLmVtaXQgJ2Nob29zZS1uZXh0LW1ydS1pdGVtJywgbmV4dFJlY2VudGx5VXNlZEl0ZW1cbiAgICAgIEBzZXRBY3RpdmVJdGVtKG5leHRSZWNlbnRseVVzZWRJdGVtLCBtb2RpZnlTdGFjazogZmFsc2UpXG5cbiAgIyBNYWtlcyB0aGUgcHJldmlvdXMgaXRlbSBpbiB0aGUgaXRlbVN0YWNrIGFjdGl2ZS5cbiAgYWN0aXZhdGVQcmV2aW91c1JlY2VudGx5VXNlZEl0ZW06IC0+XG4gICAgaWYgQGl0ZW1zLmxlbmd0aCA+IDFcbiAgICAgIGlmIEBpdGVtU3RhY2tJbmRleCArIDEgaXMgQGl0ZW1TdGFjay5sZW5ndGggb3Igbm90IEBpdGVtU3RhY2tJbmRleD9cbiAgICAgICAgQGl0ZW1TdGFja0luZGV4ID0gLTFcbiAgICAgIEBpdGVtU3RhY2tJbmRleCA9IEBpdGVtU3RhY2tJbmRleCArIDFcbiAgICAgIHByZXZpb3VzUmVjZW50bHlVc2VkSXRlbSA9IEBpdGVtU3RhY2tbQGl0ZW1TdGFja0luZGV4XVxuICAgICAgQGVtaXR0ZXIuZW1pdCAnY2hvb3NlLWxhc3QtbXJ1LWl0ZW0nLCBwcmV2aW91c1JlY2VudGx5VXNlZEl0ZW1cbiAgICAgIEBzZXRBY3RpdmVJdGVtKHByZXZpb3VzUmVjZW50bHlVc2VkSXRlbSwgbW9kaWZ5U3RhY2s6IGZhbHNlKVxuXG4gICMgTW92ZXMgdGhlIGFjdGl2ZSBpdGVtIHRvIHRoZSBlbmQgb2YgdGhlIGl0ZW1TdGFjayBvbmNlIHRoZSBjdHJsIGtleSBpcyBsaWZ0ZWRcbiAgbW92ZUFjdGl2ZUl0ZW1Ub1RvcE9mU3RhY2s6IC0+XG4gICAgZGVsZXRlIEBpdGVtU3RhY2tJbmRleFxuICAgIEBhZGRJdGVtVG9TdGFjayhAYWN0aXZlSXRlbSlcbiAgICBAZW1pdHRlci5lbWl0ICdkb25lLWNob29zaW5nLW1ydS1pdGVtJ1xuXG5cbiAgIyBQdWJsaWM6IE1ha2VzIHRoZSBuZXh0IGl0ZW0gYWN0aXZlLlxuICBhY3RpdmF0ZU5leHRJdGVtOiAtPlxuICAgIGluZGV4ID0gQGdldEFjdGl2ZUl0ZW1JbmRleCgpXG4gICAgaWYgaW5kZXggPCBAaXRlbXMubGVuZ3RoIC0gMVxuICAgICAgQGFjdGl2YXRlSXRlbUF0SW5kZXgoaW5kZXggKyAxKVxuICAgIGVsc2VcbiAgICAgIEBhY3RpdmF0ZUl0ZW1BdEluZGV4KDApXG5cbiAgIyBQdWJsaWM6IE1ha2VzIHRoZSBwcmV2aW91cyBpdGVtIGFjdGl2ZS5cbiAgYWN0aXZhdGVQcmV2aW91c0l0ZW06IC0+XG4gICAgaW5kZXggPSBAZ2V0QWN0aXZlSXRlbUluZGV4KClcbiAgICBpZiBpbmRleCA+IDBcbiAgICAgIEBhY3RpdmF0ZUl0ZW1BdEluZGV4KGluZGV4IC0gMSlcbiAgICBlbHNlXG4gICAgICBAYWN0aXZhdGVJdGVtQXRJbmRleChAaXRlbXMubGVuZ3RoIC0gMSlcblxuICBhY3RpdmF0ZUxhc3RJdGVtOiAtPlxuICAgIEBhY3RpdmF0ZUl0ZW1BdEluZGV4KEBpdGVtcy5sZW5ndGggLSAxKVxuXG4gICMgUHVibGljOiBNb3ZlIHRoZSBhY3RpdmUgdGFiIHRvIHRoZSByaWdodC5cbiAgbW92ZUl0ZW1SaWdodDogLT5cbiAgICBpbmRleCA9IEBnZXRBY3RpdmVJdGVtSW5kZXgoKVxuICAgIHJpZ2h0SXRlbUluZGV4ID0gaW5kZXggKyAxXG4gICAgQG1vdmVJdGVtKEBnZXRBY3RpdmVJdGVtKCksIHJpZ2h0SXRlbUluZGV4KSB1bmxlc3MgcmlnaHRJdGVtSW5kZXggPiBAaXRlbXMubGVuZ3RoIC0gMVxuXG4gICMgUHVibGljOiBNb3ZlIHRoZSBhY3RpdmUgdGFiIHRvIHRoZSBsZWZ0XG4gIG1vdmVJdGVtTGVmdDogLT5cbiAgICBpbmRleCA9IEBnZXRBY3RpdmVJdGVtSW5kZXgoKVxuICAgIGxlZnRJdGVtSW5kZXggPSBpbmRleCAtIDFcbiAgICBAbW92ZUl0ZW0oQGdldEFjdGl2ZUl0ZW0oKSwgbGVmdEl0ZW1JbmRleCkgdW5sZXNzIGxlZnRJdGVtSW5kZXggPCAwXG5cbiAgIyBQdWJsaWM6IEdldCB0aGUgaW5kZXggb2YgdGhlIGFjdGl2ZSBpdGVtLlxuICAjXG4gICMgUmV0dXJucyBhIHtOdW1iZXJ9LlxuICBnZXRBY3RpdmVJdGVtSW5kZXg6IC0+XG4gICAgQGl0ZW1zLmluZGV4T2YoQGFjdGl2ZUl0ZW0pXG5cbiAgIyBQdWJsaWM6IEFjdGl2YXRlIHRoZSBpdGVtIGF0IHRoZSBnaXZlbiBpbmRleC5cbiAgI1xuICAjICogYGluZGV4YCB7TnVtYmVyfVxuICBhY3RpdmF0ZUl0ZW1BdEluZGV4OiAoaW5kZXgpIC0+XG4gICAgaXRlbSA9IEBpdGVtQXRJbmRleChpbmRleCkgb3IgQGdldEFjdGl2ZUl0ZW0oKVxuICAgIEBzZXRBY3RpdmVJdGVtKGl0ZW0pXG5cbiAgIyBQdWJsaWM6IE1ha2UgdGhlIGdpdmVuIGl0ZW0gKmFjdGl2ZSosIGNhdXNpbmcgaXQgdG8gYmUgZGlzcGxheWVkIGJ5XG4gICMgdGhlIHBhbmUncyB2aWV3LlxuICAjXG4gICMgKiBgb3B0aW9uc2AgKG9wdGlvbmFsKSB7T2JqZWN0fVxuICAjICAgKiBgcGVuZGluZ2AgKG9wdGlvbmFsKSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB0aGF0IHRoZSBpdGVtIHNob3VsZCBiZSBhZGRlZFxuICAjICAgICBpbiBhIHBlbmRpbmcgc3RhdGUgaWYgaXQgZG9lcyBub3QgeWV0IGV4aXN0IGluIHRoZSBwYW5lLiBFeGlzdGluZyBwZW5kaW5nXG4gICMgICAgIGl0ZW1zIGluIGEgcGFuZSBhcmUgcmVwbGFjZWQgd2l0aCBuZXcgcGVuZGluZyBpdGVtcyB3aGVuIHRoZXkgYXJlIG9wZW5lZC5cbiAgYWN0aXZhdGVJdGVtOiAoaXRlbSwgb3B0aW9ucz17fSkgLT5cbiAgICBpZiBpdGVtP1xuICAgICAgaWYgQGdldFBlbmRpbmdJdGVtKCkgaXMgQGFjdGl2ZUl0ZW1cbiAgICAgICAgaW5kZXggPSBAZ2V0QWN0aXZlSXRlbUluZGV4KClcbiAgICAgIGVsc2VcbiAgICAgICAgaW5kZXggPSBAZ2V0QWN0aXZlSXRlbUluZGV4KCkgKyAxXG4gICAgICBAYWRkSXRlbShpdGVtLCBleHRlbmQoe30sIG9wdGlvbnMsIHtpbmRleDogaW5kZXh9KSlcbiAgICAgIEBzZXRBY3RpdmVJdGVtKGl0ZW0pXG5cbiAgIyBQdWJsaWM6IEFkZCB0aGUgZ2l2ZW4gaXRlbSB0byB0aGUgcGFuZS5cbiAgI1xuICAjICogYGl0ZW1gIFRoZSBpdGVtIHRvIGFkZC4gSXQgY2FuIGJlIGEgbW9kZWwgd2l0aCBhbiBhc3NvY2lhdGVkIHZpZXcgb3IgYVxuICAjICAgdmlldy5cbiAgIyAqIGBvcHRpb25zYCAob3B0aW9uYWwpIHtPYmplY3R9XG4gICMgICAqIGBpbmRleGAgKG9wdGlvbmFsKSB7TnVtYmVyfSBpbmRpY2F0aW5nIHRoZSBpbmRleCBhdCB3aGljaCB0byBhZGQgdGhlIGl0ZW0uXG4gICMgICAgIElmIG9taXR0ZWQsIHRoZSBpdGVtIGlzIGFkZGVkIGFmdGVyIHRoZSBjdXJyZW50IGFjdGl2ZSBpdGVtLlxuICAjICAgKiBgcGVuZGluZ2AgKG9wdGlvbmFsKSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB0aGF0IHRoZSBpdGVtIHNob3VsZCBiZVxuICAjICAgICBhZGRlZCBpbiBhIHBlbmRpbmcgc3RhdGUuIEV4aXN0aW5nIHBlbmRpbmcgaXRlbXMgaW4gYSBwYW5lIGFyZSByZXBsYWNlZCB3aXRoXG4gICMgICAgIG5ldyBwZW5kaW5nIGl0ZW1zIHdoZW4gdGhleSBhcmUgb3BlbmVkLlxuICAjXG4gICMgUmV0dXJucyB0aGUgYWRkZWQgaXRlbS5cbiAgYWRkSXRlbTogKGl0ZW0sIG9wdGlvbnM9e30pIC0+XG4gICAgIyBCYWNrd2FyZCBjb21wYXQgd2l0aCBvbGQgQVBJOlxuICAgICMgICBhZGRJdGVtKGl0ZW0sIGluZGV4PUBnZXRBY3RpdmVJdGVtSW5kZXgoKSArIDEpXG4gICAgaWYgdHlwZW9mIG9wdGlvbnMgaXMgXCJudW1iZXJcIlxuICAgICAgR3JpbS5kZXByZWNhdGUoXCJQYW5lOjphZGRJdGVtKGl0ZW0sICN7b3B0aW9uc30pIGlzIGRlcHJlY2F0ZWQgaW4gZmF2b3Igb2YgUGFuZTo6YWRkSXRlbShpdGVtLCB7aW5kZXg6ICN7b3B0aW9uc319KVwiKVxuICAgICAgb3B0aW9ucyA9IGluZGV4OiBvcHRpb25zXG5cbiAgICBpbmRleCA9IG9wdGlvbnMuaW5kZXggPyBAZ2V0QWN0aXZlSXRlbUluZGV4KCkgKyAxXG4gICAgbW92ZWQgPSBvcHRpb25zLm1vdmVkID8gZmFsc2VcbiAgICBwZW5kaW5nID0gb3B0aW9ucy5wZW5kaW5nID8gZmFsc2VcblxuICAgIHRocm93IG5ldyBFcnJvcihcIlBhbmUgaXRlbXMgbXVzdCBiZSBvYmplY3RzLiBBdHRlbXB0ZWQgdG8gYWRkIGl0ZW0gI3tpdGVtfS5cIikgdW5sZXNzIGl0ZW0/IGFuZCB0eXBlb2YgaXRlbSBpcyAnb2JqZWN0J1xuICAgIHRocm93IG5ldyBFcnJvcihcIkFkZGluZyBhIHBhbmUgaXRlbSB3aXRoIFVSSSAnI3tpdGVtLmdldFVSST8oKX0nIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBkZXN0cm95ZWRcIikgaWYgaXRlbS5pc0Rlc3Ryb3llZD8oKVxuXG4gICAgcmV0dXJuIGlmIGl0ZW0gaW4gQGl0ZW1zXG5cbiAgICBpZiB0eXBlb2YgaXRlbS5vbkRpZERlc3Ryb3kgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgaXRlbVN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZVxuICAgICAgaXRlbVN1YnNjcmlwdGlvbnMuYWRkIGl0ZW0ub25EaWREZXN0cm95ID0+IEByZW1vdmVJdGVtKGl0ZW0sIGZhbHNlKVxuICAgICAgaWYgdHlwZW9mIGl0ZW0ub25EaWRUZXJtaW5hdGVQZW5kaW5nU3RhdGUgaXMgXCJmdW5jdGlvblwiXG4gICAgICAgIGl0ZW1TdWJzY3JpcHRpb25zLmFkZCBpdGVtLm9uRGlkVGVybWluYXRlUGVuZGluZ1N0YXRlID0+XG4gICAgICAgICAgQGNsZWFyUGVuZGluZ0l0ZW0oKSBpZiBAZ2V0UGVuZGluZ0l0ZW0oKSBpcyBpdGVtXG4gICAgICBAc3Vic2NyaXB0aW9uc1Blckl0ZW0uc2V0IGl0ZW0sIGl0ZW1TdWJzY3JpcHRpb25zXG5cbiAgICBAaXRlbXMuc3BsaWNlKGluZGV4LCAwLCBpdGVtKVxuICAgIGxhc3RQZW5kaW5nSXRlbSA9IEBnZXRQZW5kaW5nSXRlbSgpXG4gICAgcmVwbGFjaW5nUGVuZGluZ0l0ZW0gPSBsYXN0UGVuZGluZ0l0ZW0/IGFuZCBub3QgbW92ZWRcbiAgICBAcGVuZGluZ0l0ZW0gPSBudWxsIGlmIHJlcGxhY2luZ1BlbmRpbmdJdGVtXG4gICAgQHNldFBlbmRpbmdJdGVtKGl0ZW0pIGlmIHBlbmRpbmdcblxuICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1hZGQtaXRlbScsIHtpdGVtLCBpbmRleCwgbW92ZWR9XG4gICAgQGNvbnRhaW5lcj8uZGlkQWRkUGFuZUl0ZW0oaXRlbSwgdGhpcywgaW5kZXgpIHVubGVzcyBtb3ZlZFxuXG4gICAgQGRlc3Ryb3lJdGVtKGxhc3RQZW5kaW5nSXRlbSkgaWYgcmVwbGFjaW5nUGVuZGluZ0l0ZW1cbiAgICBAc2V0QWN0aXZlSXRlbShpdGVtKSB1bmxlc3MgQGdldEFjdGl2ZUl0ZW0oKT9cbiAgICBpdGVtXG5cbiAgc2V0UGVuZGluZ0l0ZW06IChpdGVtKSA9PlxuICAgIGlmIEBwZW5kaW5nSXRlbSBpc250IGl0ZW1cbiAgICAgIG1vc3RSZWNlbnRQZW5kaW5nSXRlbSA9IEBwZW5kaW5nSXRlbVxuICAgICAgQHBlbmRpbmdJdGVtID0gaXRlbVxuICAgICAgaWYgbW9zdFJlY2VudFBlbmRpbmdJdGVtP1xuICAgICAgICBAZW1pdHRlci5lbWl0ICdpdGVtLWRpZC10ZXJtaW5hdGUtcGVuZGluZy1zdGF0ZScsIG1vc3RSZWNlbnRQZW5kaW5nSXRlbVxuXG4gIGdldFBlbmRpbmdJdGVtOiA9PlxuICAgIEBwZW5kaW5nSXRlbSBvciBudWxsXG5cbiAgY2xlYXJQZW5kaW5nSXRlbTogPT5cbiAgICBAc2V0UGVuZGluZ0l0ZW0obnVsbClcblxuICBvbkl0ZW1EaWRUZXJtaW5hdGVQZW5kaW5nU3RhdGU6IChjYWxsYmFjaykgPT5cbiAgICBAZW1pdHRlci5vbiAnaXRlbS1kaWQtdGVybWluYXRlLXBlbmRpbmctc3RhdGUnLCBjYWxsYmFja1xuXG4gICMgUHVibGljOiBBZGQgdGhlIGdpdmVuIGl0ZW1zIHRvIHRoZSBwYW5lLlxuICAjXG4gICMgKiBgaXRlbXNgIEFuIHtBcnJheX0gb2YgaXRlbXMgdG8gYWRkLiBJdGVtcyBjYW4gYmUgdmlld3Mgb3IgbW9kZWxzIHdpdGhcbiAgIyAgIGFzc29jaWF0ZWQgdmlld3MuIEFueSBvYmplY3RzIHRoYXQgYXJlIGFscmVhZHkgcHJlc2VudCBpbiB0aGUgcGFuZSdzXG4gICMgICBjdXJyZW50IGl0ZW1zIHdpbGwgbm90IGJlIGFkZGVkIGFnYWluLlxuICAjICogYGluZGV4YCAob3B0aW9uYWwpIHtOdW1iZXJ9IGluZGV4IGF0IHdoaWNoIHRvIGFkZCB0aGUgaXRlbXMuIElmIG9taXR0ZWQsXG4gICMgICB0aGUgaXRlbSBpcyAjICAgYWRkZWQgYWZ0ZXIgdGhlIGN1cnJlbnQgYWN0aXZlIGl0ZW0uXG4gICNcbiAgIyBSZXR1cm5zIGFuIHtBcnJheX0gb2YgYWRkZWQgaXRlbXMuXG4gIGFkZEl0ZW1zOiAoaXRlbXMsIGluZGV4PUBnZXRBY3RpdmVJdGVtSW5kZXgoKSArIDEpIC0+XG4gICAgaXRlbXMgPSBpdGVtcy5maWx0ZXIgKGl0ZW0pID0+IG5vdCAoaXRlbSBpbiBAaXRlbXMpXG4gICAgQGFkZEl0ZW0oaXRlbSwge2luZGV4OiBpbmRleCArIGl9KSBmb3IgaXRlbSwgaSBpbiBpdGVtc1xuICAgIGl0ZW1zXG5cbiAgcmVtb3ZlSXRlbTogKGl0ZW0sIG1vdmVkKSAtPlxuICAgIGluZGV4ID0gQGl0ZW1zLmluZGV4T2YoaXRlbSlcbiAgICByZXR1cm4gaWYgaW5kZXggaXMgLTFcbiAgICBAcGVuZGluZ0l0ZW0gPSBudWxsIGlmIEBnZXRQZW5kaW5nSXRlbSgpIGlzIGl0ZW1cbiAgICBAcmVtb3ZlSXRlbUZyb21TdGFjayhpdGVtKVxuICAgIEBlbWl0dGVyLmVtaXQgJ3dpbGwtcmVtb3ZlLWl0ZW0nLCB7aXRlbSwgaW5kZXgsIGRlc3Ryb3llZDogbm90IG1vdmVkLCBtb3ZlZH1cbiAgICBAdW5zdWJzY3JpYmVGcm9tSXRlbShpdGVtKVxuXG4gICAgaWYgaXRlbSBpcyBAYWN0aXZlSXRlbVxuICAgICAgaWYgQGl0ZW1zLmxlbmd0aCBpcyAxXG4gICAgICAgIEBzZXRBY3RpdmVJdGVtKHVuZGVmaW5lZClcbiAgICAgIGVsc2UgaWYgaW5kZXggaXMgMFxuICAgICAgICBAYWN0aXZhdGVOZXh0SXRlbSgpXG4gICAgICBlbHNlXG4gICAgICAgIEBhY3RpdmF0ZVByZXZpb3VzSXRlbSgpXG4gICAgQGl0ZW1zLnNwbGljZShpbmRleCwgMSlcbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtcmVtb3ZlLWl0ZW0nLCB7aXRlbSwgaW5kZXgsIGRlc3Ryb3llZDogbm90IG1vdmVkLCBtb3ZlZH1cbiAgICBAY29udGFpbmVyPy5kaWREZXN0cm95UGFuZUl0ZW0oe2l0ZW0sIGluZGV4LCBwYW5lOiB0aGlzfSkgdW5sZXNzIG1vdmVkXG4gICAgQGRlc3Ryb3koKSBpZiBAaXRlbXMubGVuZ3RoIGlzIDAgYW5kIEBjb25maWcuZ2V0KCdjb3JlLmRlc3Ryb3lFbXB0eVBhbmVzJylcblxuICAjIFJlbW92ZSB0aGUgZ2l2ZW4gaXRlbSBmcm9tIHRoZSBpdGVtU3RhY2suXG4gICNcbiAgIyAqIGBpdGVtYCBUaGUgaXRlbSB0byByZW1vdmUuXG4gICMgKiBgaW5kZXhgIHtOdW1iZXJ9IGluZGljYXRpbmcgdGhlIGluZGV4IHRvIHdoaWNoIHRvIHJlbW92ZSB0aGUgaXRlbSBmcm9tIHRoZSBpdGVtU3RhY2suXG4gIHJlbW92ZUl0ZW1Gcm9tU3RhY2s6IChpdGVtKSAtPlxuICAgIGluZGV4ID0gQGl0ZW1TdGFjay5pbmRleE9mKGl0ZW0pXG4gICAgQGl0ZW1TdGFjay5zcGxpY2UoaW5kZXgsIDEpIHVubGVzcyBpbmRleCBpcyAtMVxuXG4gICMgUHVibGljOiBNb3ZlIHRoZSBnaXZlbiBpdGVtIHRvIHRoZSBnaXZlbiBpbmRleC5cbiAgI1xuICAjICogYGl0ZW1gIFRoZSBpdGVtIHRvIG1vdmUuXG4gICMgKiBgaW5kZXhgIHtOdW1iZXJ9IGluZGljYXRpbmcgdGhlIGluZGV4IHRvIHdoaWNoIHRvIG1vdmUgdGhlIGl0ZW0uXG4gIG1vdmVJdGVtOiAoaXRlbSwgbmV3SW5kZXgpIC0+XG4gICAgb2xkSW5kZXggPSBAaXRlbXMuaW5kZXhPZihpdGVtKVxuICAgIEBpdGVtcy5zcGxpY2Uob2xkSW5kZXgsIDEpXG4gICAgQGl0ZW1zLnNwbGljZShuZXdJbmRleCwgMCwgaXRlbSlcbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtbW92ZS1pdGVtJywge2l0ZW0sIG9sZEluZGV4LCBuZXdJbmRleH1cblxuICAjIFB1YmxpYzogTW92ZSB0aGUgZ2l2ZW4gaXRlbSB0byB0aGUgZ2l2ZW4gaW5kZXggb24gYW5vdGhlciBwYW5lLlxuICAjXG4gICMgKiBgaXRlbWAgVGhlIGl0ZW0gdG8gbW92ZS5cbiAgIyAqIGBwYW5lYCB7UGFuZX0gdG8gd2hpY2ggdG8gbW92ZSB0aGUgaXRlbS5cbiAgIyAqIGBpbmRleGAge051bWJlcn0gaW5kaWNhdGluZyB0aGUgaW5kZXggdG8gd2hpY2ggdG8gbW92ZSB0aGUgaXRlbSBpbiB0aGVcbiAgIyAgIGdpdmVuIHBhbmUuXG4gIG1vdmVJdGVtVG9QYW5lOiAoaXRlbSwgcGFuZSwgaW5kZXgpIC0+XG4gICAgQHJlbW92ZUl0ZW0oaXRlbSwgdHJ1ZSlcbiAgICBwYW5lLmFkZEl0ZW0oaXRlbSwge2luZGV4OiBpbmRleCwgbW92ZWQ6IHRydWV9KVxuXG4gICMgUHVibGljOiBEZXN0cm95IHRoZSBhY3RpdmUgaXRlbSBhbmQgYWN0aXZhdGUgdGhlIG5leHQgaXRlbS5cbiAgZGVzdHJveUFjdGl2ZUl0ZW06IC0+XG4gICAgQGRlc3Ryb3lJdGVtKEBhY3RpdmVJdGVtKVxuICAgIGZhbHNlXG5cbiAgIyBQdWJsaWM6IERlc3Ryb3kgdGhlIGdpdmVuIGl0ZW0uXG4gICNcbiAgIyBJZiB0aGUgaXRlbSBpcyBhY3RpdmUsIHRoZSBuZXh0IGl0ZW0gd2lsbCBiZSBhY3RpdmF0ZWQuIElmIHRoZSBpdGVtIGlzIHRoZVxuICAjIGxhc3QgaXRlbSwgdGhlIHBhbmUgd2lsbCBiZSBkZXN0cm95ZWQgaWYgdGhlIGBjb3JlLmRlc3Ryb3lFbXB0eVBhbmVzYCBjb25maWdcbiAgIyBzZXR0aW5nIGlzIGB0cnVlYC5cbiAgI1xuICAjICogYGl0ZW1gIEl0ZW0gdG8gZGVzdHJveVxuICAjICogYGZvcmNlYCAob3B0aW9uYWwpIHtCb29sZWFufSBEZXN0cm95IHRoZSBpdGVtIHdpdGhvdXQgcHJvbXB0aW5nIHRvIHNhdmVcbiAgIyAgICBpdCwgZXZlbiBpZiB0aGUgaXRlbSdzIGBpc1Blcm1hbmVudERvY2tJdGVtYCBtZXRob2QgcmV0dXJucyB0cnVlLlxuICAjXG4gICMgUmV0dXJucyBhIHtCb29sZWFufSBpbmRpY2F0aW5nIHdoZXRoZXIgb3Igbm90IHRoZSBpdGVtIHdhcyBkZXN0cm95ZWQuXG4gIGRlc3Ryb3lJdGVtOiAoaXRlbSwgZm9yY2UpIC0+XG4gICAgaW5kZXggPSBAaXRlbXMuaW5kZXhPZihpdGVtKVxuICAgIGlmIGluZGV4IGlzbnQgLTFcbiAgICAgIHJldHVybiBmYWxzZSBpZiBub3QgZm9yY2UgYW5kIEBnZXRDb250YWluZXIoKT8uZ2V0TG9jYXRpb24oKSBpc250ICdjZW50ZXInIGFuZCBpdGVtLmlzUGVybWFuZW50RG9ja0l0ZW0/KClcbiAgICAgIEBlbWl0dGVyLmVtaXQgJ3dpbGwtZGVzdHJveS1pdGVtJywge2l0ZW0sIGluZGV4fVxuICAgICAgQGNvbnRhaW5lcj8ud2lsbERlc3Ryb3lQYW5lSXRlbSh7aXRlbSwgaW5kZXgsIHBhbmU6IHRoaXN9KVxuICAgICAgaWYgZm9yY2Ugb3IgQHByb21wdFRvU2F2ZUl0ZW0oaXRlbSlcbiAgICAgICAgQHJlbW92ZUl0ZW0oaXRlbSwgZmFsc2UpXG4gICAgICAgIGl0ZW0uZGVzdHJveT8oKVxuICAgICAgICB0cnVlXG4gICAgICBlbHNlXG4gICAgICAgIGZhbHNlXG5cbiAgIyBQdWJsaWM6IERlc3Ryb3kgYWxsIGl0ZW1zLlxuICBkZXN0cm95SXRlbXM6IC0+XG4gICAgQGRlc3Ryb3lJdGVtKGl0ZW0pIGZvciBpdGVtIGluIEBnZXRJdGVtcygpXG4gICAgcmV0dXJuXG5cbiAgIyBQdWJsaWM6IERlc3Ryb3kgYWxsIGl0ZW1zIGV4Y2VwdCBmb3IgdGhlIGFjdGl2ZSBpdGVtLlxuICBkZXN0cm95SW5hY3RpdmVJdGVtczogLT5cbiAgICBAZGVzdHJveUl0ZW0oaXRlbSkgZm9yIGl0ZW0gaW4gQGdldEl0ZW1zKCkgd2hlbiBpdGVtIGlzbnQgQGFjdGl2ZUl0ZW1cbiAgICByZXR1cm5cblxuICBwcm9tcHRUb1NhdmVJdGVtOiAoaXRlbSwgb3B0aW9ucz17fSkgLT5cbiAgICByZXR1cm4gdHJ1ZSB1bmxlc3MgaXRlbS5zaG91bGRQcm9tcHRUb1NhdmU/KG9wdGlvbnMpXG5cbiAgICBpZiB0eXBlb2YgaXRlbS5nZXRVUkkgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgdXJpID0gaXRlbS5nZXRVUkkoKVxuICAgIGVsc2UgaWYgdHlwZW9mIGl0ZW0uZ2V0VXJpIGlzICdmdW5jdGlvbidcbiAgICAgIHVyaSA9IGl0ZW0uZ2V0VXJpKClcbiAgICBlbHNlXG4gICAgICByZXR1cm4gdHJ1ZVxuXG4gICAgc2F2ZURpYWxvZyA9IChzYXZlQnV0dG9uVGV4dCwgc2F2ZUZuLCBtZXNzYWdlKSA9PlxuICAgICAgY2hvc2VuID0gQGFwcGxpY2F0aW9uRGVsZWdhdGUuY29uZmlybVxuICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgIGRldGFpbGVkTWVzc2FnZTogXCJZb3VyIGNoYW5nZXMgd2lsbCBiZSBsb3N0IGlmIHlvdSBjbG9zZSB0aGlzIGl0ZW0gd2l0aG91dCBzYXZpbmcuXCJcbiAgICAgICAgYnV0dG9uczogW3NhdmVCdXR0b25UZXh0LCBcIkNhbmNlbFwiLCBcIkRvbid0IFNhdmVcIl1cbiAgICAgIHN3aXRjaCBjaG9zZW5cbiAgICAgICAgd2hlbiAwIHRoZW4gc2F2ZUZuKGl0ZW0sIHNhdmVFcnJvcilcbiAgICAgICAgd2hlbiAxIHRoZW4gZmFsc2VcbiAgICAgICAgd2hlbiAyIHRoZW4gdHJ1ZVxuXG4gICAgc2F2ZUVycm9yID0gKGVycm9yKSA9PlxuICAgICAgaWYgZXJyb3JcbiAgICAgICAgc2F2ZURpYWxvZyhcIlNhdmUgYXNcIiwgQHNhdmVJdGVtQXMsIFwiJyN7aXRlbS5nZXRUaXRsZT8oKSA/IHVyaX0nIGNvdWxkIG5vdCBiZSBzYXZlZC5cXG5FcnJvcjogI3tAZ2V0TWVzc2FnZUZvckVycm9yQ29kZShlcnJvci5jb2RlKX1cIilcbiAgICAgIGVsc2VcbiAgICAgICAgdHJ1ZVxuXG4gICAgc2F2ZURpYWxvZyhcIlNhdmVcIiwgQHNhdmVJdGVtLCBcIicje2l0ZW0uZ2V0VGl0bGU/KCkgPyB1cml9JyBoYXMgY2hhbmdlcywgZG8geW91IHdhbnQgdG8gc2F2ZSB0aGVtP1wiKVxuXG4gICMgUHVibGljOiBTYXZlIHRoZSBhY3RpdmUgaXRlbS5cbiAgc2F2ZUFjdGl2ZUl0ZW06IChuZXh0QWN0aW9uKSAtPlxuICAgIEBzYXZlSXRlbShAZ2V0QWN0aXZlSXRlbSgpLCBuZXh0QWN0aW9uKVxuXG4gICMgUHVibGljOiBQcm9tcHQgdGhlIHVzZXIgZm9yIGEgbG9jYXRpb24gYW5kIHNhdmUgdGhlIGFjdGl2ZSBpdGVtIHdpdGggdGhlXG4gICMgcGF0aCB0aGV5IHNlbGVjdC5cbiAgI1xuICAjICogYG5leHRBY3Rpb25gIChvcHRpb25hbCkge0Z1bmN0aW9ufSB3aGljaCB3aWxsIGJlIGNhbGxlZCBhZnRlciB0aGUgaXRlbSBpc1xuICAjICAgc3VjY2Vzc2Z1bGx5IHNhdmVkLlxuICBzYXZlQWN0aXZlSXRlbUFzOiAobmV4dEFjdGlvbikgLT5cbiAgICBAc2F2ZUl0ZW1BcyhAZ2V0QWN0aXZlSXRlbSgpLCBuZXh0QWN0aW9uKVxuXG4gICMgUHVibGljOiBTYXZlIHRoZSBnaXZlbiBpdGVtLlxuICAjXG4gICMgKiBgaXRlbWAgVGhlIGl0ZW0gdG8gc2F2ZS5cbiAgIyAqIGBuZXh0QWN0aW9uYCAob3B0aW9uYWwpIHtGdW5jdGlvbn0gd2hpY2ggd2lsbCBiZSBjYWxsZWQgd2l0aCBubyBhcmd1bWVudFxuICAjICAgYWZ0ZXIgdGhlIGl0ZW0gaXMgc3VjY2Vzc2Z1bGx5IHNhdmVkLCBvciB3aXRoIHRoZSBlcnJvciBpZiBpdCBmYWlsZWQuXG4gICMgICBUaGUgcmV0dXJuIHZhbHVlIHdpbGwgYmUgdGhhdCBvZiBgbmV4dEFjdGlvbmAgb3IgYHVuZGVmaW5lZGAgaWYgaXQgd2FzIG5vdFxuICAjICAgcHJvdmlkZWRcbiAgc2F2ZUl0ZW06IChpdGVtLCBuZXh0QWN0aW9uKSA9PlxuICAgIGlmIHR5cGVvZiBpdGVtPy5nZXRVUkkgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgaXRlbVVSSSA9IGl0ZW0uZ2V0VVJJKClcbiAgICBlbHNlIGlmIHR5cGVvZiBpdGVtPy5nZXRVcmkgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgaXRlbVVSSSA9IGl0ZW0uZ2V0VXJpKClcblxuICAgIGlmIGl0ZW1VUkk/XG4gICAgICB0cnlcbiAgICAgICAgaXRlbS5zYXZlPygpXG4gICAgICAgIG5leHRBY3Rpb24/KClcbiAgICAgIGNhdGNoIGVycm9yXG4gICAgICAgIGlmIG5leHRBY3Rpb25cbiAgICAgICAgICBuZXh0QWN0aW9uKGVycm9yKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgQGhhbmRsZVNhdmVFcnJvcihlcnJvciwgaXRlbSlcbiAgICBlbHNlXG4gICAgICBAc2F2ZUl0ZW1BcyhpdGVtLCBuZXh0QWN0aW9uKVxuXG4gICMgUHVibGljOiBQcm9tcHQgdGhlIHVzZXIgZm9yIGEgbG9jYXRpb24gYW5kIHNhdmUgdGhlIGFjdGl2ZSBpdGVtIHdpdGggdGhlXG4gICMgcGF0aCB0aGV5IHNlbGVjdC5cbiAgI1xuICAjICogYGl0ZW1gIFRoZSBpdGVtIHRvIHNhdmUuXG4gICMgKiBgbmV4dEFjdGlvbmAgKG9wdGlvbmFsKSB7RnVuY3Rpb259IHdoaWNoIHdpbGwgYmUgY2FsbGVkIHdpdGggbm8gYXJndW1lbnRcbiAgIyAgIGFmdGVyIHRoZSBpdGVtIGlzIHN1Y2Nlc3NmdWxseSBzYXZlZCwgb3Igd2l0aCB0aGUgZXJyb3IgaWYgaXQgZmFpbGVkLlxuICAjICAgVGhlIHJldHVybiB2YWx1ZSB3aWxsIGJlIHRoYXQgb2YgYG5leHRBY3Rpb25gIG9yIGB1bmRlZmluZWRgIGlmIGl0IHdhcyBub3RcbiAgIyAgIHByb3ZpZGVkXG4gIHNhdmVJdGVtQXM6IChpdGVtLCBuZXh0QWN0aW9uKSA9PlxuICAgIHJldHVybiB1bmxlc3MgaXRlbT8uc2F2ZUFzP1xuXG4gICAgc2F2ZU9wdGlvbnMgPSBpdGVtLmdldFNhdmVEaWFsb2dPcHRpb25zPygpID8ge31cbiAgICBzYXZlT3B0aW9ucy5kZWZhdWx0UGF0aCA/PSBpdGVtLmdldFBhdGgoKVxuICAgIG5ld0l0ZW1QYXRoID0gQGFwcGxpY2F0aW9uRGVsZWdhdGUuc2hvd1NhdmVEaWFsb2coc2F2ZU9wdGlvbnMpXG4gICAgaWYgbmV3SXRlbVBhdGhcbiAgICAgIHRyeVxuICAgICAgICBpdGVtLnNhdmVBcyhuZXdJdGVtUGF0aClcbiAgICAgICAgbmV4dEFjdGlvbj8oKVxuICAgICAgY2F0Y2ggZXJyb3JcbiAgICAgICAgaWYgbmV4dEFjdGlvblxuICAgICAgICAgIG5leHRBY3Rpb24oZXJyb3IpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAaGFuZGxlU2F2ZUVycm9yKGVycm9yLCBpdGVtKVxuXG4gICMgUHVibGljOiBTYXZlIGFsbCBpdGVtcy5cbiAgc2F2ZUl0ZW1zOiAtPlxuICAgIGZvciBpdGVtIGluIEBnZXRJdGVtcygpXG4gICAgICBAc2F2ZUl0ZW0oaXRlbSkgaWYgaXRlbS5pc01vZGlmaWVkPygpXG4gICAgcmV0dXJuXG5cbiAgIyBQdWJsaWM6IFJldHVybiB0aGUgZmlyc3QgaXRlbSB0aGF0IG1hdGNoZXMgdGhlIGdpdmVuIFVSSSBvciB1bmRlZmluZWQgaWZcbiAgIyBub25lIGV4aXN0cy5cbiAgI1xuICAjICogYHVyaWAge1N0cmluZ30gY29udGFpbmluZyBhIFVSSS5cbiAgaXRlbUZvclVSSTogKHVyaSkgLT5cbiAgICBmaW5kIEBpdGVtcywgKGl0ZW0pIC0+XG4gICAgICBpZiB0eXBlb2YgaXRlbS5nZXRVUkkgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICBpdGVtVXJpID0gaXRlbS5nZXRVUkkoKVxuICAgICAgZWxzZSBpZiB0eXBlb2YgaXRlbS5nZXRVcmkgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICBpdGVtVXJpID0gaXRlbS5nZXRVcmkoKVxuXG4gICAgICBpdGVtVXJpIGlzIHVyaVxuXG4gICMgUHVibGljOiBBY3RpdmF0ZSB0aGUgZmlyc3QgaXRlbSB0aGF0IG1hdGNoZXMgdGhlIGdpdmVuIFVSSS5cbiAgI1xuICAjICogYHVyaWAge1N0cmluZ30gY29udGFpbmluZyBhIFVSSS5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0gaW5kaWNhdGluZyB3aGV0aGVyIGFuIGl0ZW0gbWF0Y2hpbmcgdGhlIFVSSSB3YXMgZm91bmQuXG4gIGFjdGl2YXRlSXRlbUZvclVSSTogKHVyaSkgLT5cbiAgICBpZiBpdGVtID0gQGl0ZW1Gb3JVUkkodXJpKVxuICAgICAgQGFjdGl2YXRlSXRlbShpdGVtKVxuICAgICAgdHJ1ZVxuICAgIGVsc2VcbiAgICAgIGZhbHNlXG5cbiAgY29weUFjdGl2ZUl0ZW06IC0+XG4gICAgQGFjdGl2ZUl0ZW0/LmNvcHk/KClcblxuICAjIyNcbiAgU2VjdGlvbjogTGlmZWN5Y2xlXG4gICMjI1xuXG4gICMgUHVibGljOiBEZXRlcm1pbmUgd2hldGhlciB0aGUgcGFuZSBpcyBhY3RpdmUuXG4gICNcbiAgIyBSZXR1cm5zIGEge0Jvb2xlYW59LlxuICBpc0FjdGl2ZTogLT5cbiAgICBAY29udGFpbmVyPy5nZXRBY3RpdmVQYW5lKCkgaXMgdGhpc1xuXG4gICMgUHVibGljOiBNYWtlcyB0aGlzIHBhbmUgdGhlICphY3RpdmUqIHBhbmUsIGNhdXNpbmcgaXQgdG8gZ2FpbiBmb2N1cy5cbiAgYWN0aXZhdGU6IC0+XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiUGFuZSBoYXMgYmVlbiBkZXN0cm95ZWRcIikgaWYgQGlzRGVzdHJveWVkKClcbiAgICBAY29udGFpbmVyPy5kaWRBY3RpdmF0ZVBhbmUodGhpcylcbiAgICBAZW1pdHRlci5lbWl0ICdkaWQtYWN0aXZhdGUnXG5cbiAgIyBQdWJsaWM6IENsb3NlIHRoZSBwYW5lIGFuZCBkZXN0cm95IGFsbCBpdHMgaXRlbXMuXG4gICNcbiAgIyBJZiB0aGlzIGlzIHRoZSBsYXN0IHBhbmUsIGFsbCB0aGUgaXRlbXMgd2lsbCBiZSBkZXN0cm95ZWQgYnV0IHRoZSBwYW5lXG4gICMgaXRzZWxmIHdpbGwgbm90IGJlIGRlc3Ryb3llZC5cbiAgZGVzdHJveTogLT5cbiAgICBpZiBAY29udGFpbmVyPy5pc0FsaXZlKCkgYW5kIEBjb250YWluZXIuZ2V0UGFuZXMoKS5sZW5ndGggaXMgMVxuICAgICAgQGRlc3Ryb3lJdGVtcygpXG4gICAgZWxzZVxuICAgICAgQGVtaXR0ZXIuZW1pdCAnd2lsbC1kZXN0cm95J1xuICAgICAgQGFsaXZlID0gZmFsc2VcbiAgICAgIEBjb250YWluZXI/LndpbGxEZXN0cm95UGFuZShwYW5lOiB0aGlzKVxuICAgICAgQGNvbnRhaW5lci5hY3RpdmF0ZU5leHRQYW5lKCkgaWYgQGlzQWN0aXZlKClcbiAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1kZXN0cm95J1xuICAgICAgQGVtaXR0ZXIuZGlzcG9zZSgpXG4gICAgICBpdGVtLmRlc3Ryb3k/KCkgZm9yIGl0ZW0gaW4gQGl0ZW1zLnNsaWNlKClcbiAgICAgIEBjb250YWluZXI/LmRpZERlc3Ryb3lQYW5lKHBhbmU6IHRoaXMpXG5cblxuICBpc0FsaXZlOiAtPiBAYWxpdmVcblxuICAjIFB1YmxpYzogRGV0ZXJtaW5lIHdoZXRoZXIgdGhpcyBwYW5lIGhhcyBiZWVuIGRlc3Ryb3llZC5cbiAgI1xuICAjIFJldHVybnMgYSB7Qm9vbGVhbn0uXG4gIGlzRGVzdHJveWVkOiAtPiBub3QgQGlzQWxpdmUoKVxuXG4gICMjI1xuICBTZWN0aW9uOiBTcGxpdHRpbmdcbiAgIyMjXG5cbiAgIyBQdWJsaWM6IENyZWF0ZSBhIG5ldyBwYW5lIHRvIHRoZSBsZWZ0IG9mIHRoaXMgcGFuZS5cbiAgI1xuICAjICogYHBhcmFtc2AgKG9wdGlvbmFsKSB7T2JqZWN0fSB3aXRoIHRoZSBmb2xsb3dpbmcga2V5czpcbiAgIyAgICogYGl0ZW1zYCAob3B0aW9uYWwpIHtBcnJheX0gb2YgaXRlbXMgdG8gYWRkIHRvIHRoZSBuZXcgcGFuZS5cbiAgIyAgICogYGNvcHlBY3RpdmVJdGVtYCAob3B0aW9uYWwpIHtCb29sZWFufSB0cnVlIHdpbGwgY29weSB0aGUgYWN0aXZlIGl0ZW0gaW50byB0aGUgbmV3IHNwbGl0IHBhbmVcbiAgI1xuICAjIFJldHVybnMgdGhlIG5ldyB7UGFuZX0uXG4gIHNwbGl0TGVmdDogKHBhcmFtcykgLT5cbiAgICBAc3BsaXQoJ2hvcml6b250YWwnLCAnYmVmb3JlJywgcGFyYW1zKVxuXG4gICMgUHVibGljOiBDcmVhdGUgYSBuZXcgcGFuZSB0byB0aGUgcmlnaHQgb2YgdGhpcyBwYW5lLlxuICAjXG4gICMgKiBgcGFyYW1zYCAob3B0aW9uYWwpIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgaXRlbXNgIChvcHRpb25hbCkge0FycmF5fSBvZiBpdGVtcyB0byBhZGQgdG8gdGhlIG5ldyBwYW5lLlxuICAjICAgKiBgY29weUFjdGl2ZUl0ZW1gIChvcHRpb25hbCkge0Jvb2xlYW59IHRydWUgd2lsbCBjb3B5IHRoZSBhY3RpdmUgaXRlbSBpbnRvIHRoZSBuZXcgc3BsaXQgcGFuZVxuICAjXG4gICMgUmV0dXJucyB0aGUgbmV3IHtQYW5lfS5cbiAgc3BsaXRSaWdodDogKHBhcmFtcykgLT5cbiAgICBAc3BsaXQoJ2hvcml6b250YWwnLCAnYWZ0ZXInLCBwYXJhbXMpXG5cbiAgIyBQdWJsaWM6IENyZWF0ZXMgYSBuZXcgcGFuZSBhYm92ZSB0aGUgcmVjZWl2ZXIuXG4gICNcbiAgIyAqIGBwYXJhbXNgIChvcHRpb25hbCkge09iamVjdH0gd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6XG4gICMgICAqIGBpdGVtc2AgKG9wdGlvbmFsKSB7QXJyYXl9IG9mIGl0ZW1zIHRvIGFkZCB0byB0aGUgbmV3IHBhbmUuXG4gICMgICAqIGBjb3B5QWN0aXZlSXRlbWAgKG9wdGlvbmFsKSB7Qm9vbGVhbn0gdHJ1ZSB3aWxsIGNvcHkgdGhlIGFjdGl2ZSBpdGVtIGludG8gdGhlIG5ldyBzcGxpdCBwYW5lXG4gICNcbiAgIyBSZXR1cm5zIHRoZSBuZXcge1BhbmV9LlxuICBzcGxpdFVwOiAocGFyYW1zKSAtPlxuICAgIEBzcGxpdCgndmVydGljYWwnLCAnYmVmb3JlJywgcGFyYW1zKVxuXG4gICMgUHVibGljOiBDcmVhdGVzIGEgbmV3IHBhbmUgYmVsb3cgdGhlIHJlY2VpdmVyLlxuICAjXG4gICMgKiBgcGFyYW1zYCAob3B0aW9uYWwpIHtPYmplY3R9IHdpdGggdGhlIGZvbGxvd2luZyBrZXlzOlxuICAjICAgKiBgaXRlbXNgIChvcHRpb25hbCkge0FycmF5fSBvZiBpdGVtcyB0byBhZGQgdG8gdGhlIG5ldyBwYW5lLlxuICAjICAgKiBgY29weUFjdGl2ZUl0ZW1gIChvcHRpb25hbCkge0Jvb2xlYW59IHRydWUgd2lsbCBjb3B5IHRoZSBhY3RpdmUgaXRlbSBpbnRvIHRoZSBuZXcgc3BsaXQgcGFuZVxuICAjXG4gICMgUmV0dXJucyB0aGUgbmV3IHtQYW5lfS5cbiAgc3BsaXREb3duOiAocGFyYW1zKSAtPlxuICAgIEBzcGxpdCgndmVydGljYWwnLCAnYWZ0ZXInLCBwYXJhbXMpXG5cbiAgc3BsaXQ6IChvcmllbnRhdGlvbiwgc2lkZSwgcGFyYW1zKSAtPlxuICAgIGlmIHBhcmFtcz8uY29weUFjdGl2ZUl0ZW1cbiAgICAgIHBhcmFtcy5pdGVtcyA/PSBbXVxuICAgICAgcGFyYW1zLml0ZW1zLnB1c2goQGNvcHlBY3RpdmVJdGVtKCkpXG5cbiAgICBpZiBAcGFyZW50Lm9yaWVudGF0aW9uIGlzbnQgb3JpZW50YXRpb25cbiAgICAgIEBwYXJlbnQucmVwbGFjZUNoaWxkKHRoaXMsIG5ldyBQYW5lQXhpcyh7QGNvbnRhaW5lciwgb3JpZW50YXRpb24sIGNoaWxkcmVuOiBbdGhpc10sIEBmbGV4U2NhbGV9LCBAdmlld1JlZ2lzdHJ5KSlcbiAgICAgIEBzZXRGbGV4U2NhbGUoMSlcblxuICAgIG5ld1BhbmUgPSBuZXcgUGFuZShleHRlbmQoe0BhcHBsaWNhdGlvbkRlbGVnYXRlLCBAbm90aWZpY2F0aW9uTWFuYWdlciwgQGRlc2VyaWFsaXplck1hbmFnZXIsIEBjb25maWcsIEB2aWV3UmVnaXN0cnl9LCBwYXJhbXMpKVxuICAgIHN3aXRjaCBzaWRlXG4gICAgICB3aGVuICdiZWZvcmUnIHRoZW4gQHBhcmVudC5pbnNlcnRDaGlsZEJlZm9yZSh0aGlzLCBuZXdQYW5lKVxuICAgICAgd2hlbiAnYWZ0ZXInIHRoZW4gQHBhcmVudC5pbnNlcnRDaGlsZEFmdGVyKHRoaXMsIG5ld1BhbmUpXG5cbiAgICBAbW92ZUl0ZW1Ub1BhbmUoQGFjdGl2ZUl0ZW0sIG5ld1BhbmUpIGlmIHBhcmFtcz8ubW92ZUFjdGl2ZUl0ZW1cblxuICAgIG5ld1BhbmUuYWN0aXZhdGUoKVxuICAgIG5ld1BhbmVcblxuICAjIElmIHRoZSBwYXJlbnQgaXMgYSBob3Jpem9udGFsIGF4aXMsIHJldHVybnMgaXRzIGZpcnN0IGNoaWxkIGlmIGl0IGlzIGEgcGFuZTtcbiAgIyBvdGhlcndpc2UgcmV0dXJucyB0aGlzIHBhbmUuXG4gIGZpbmRMZWZ0bW9zdFNpYmxpbmc6IC0+XG4gICAgaWYgQHBhcmVudC5vcmllbnRhdGlvbiBpcyAnaG9yaXpvbnRhbCdcbiAgICAgIFtsZWZ0bW9zdFNpYmxpbmddID0gQHBhcmVudC5jaGlsZHJlblxuICAgICAgaWYgbGVmdG1vc3RTaWJsaW5nIGluc3RhbmNlb2YgUGFuZUF4aXNcbiAgICAgICAgdGhpc1xuICAgICAgZWxzZVxuICAgICAgICBsZWZ0bW9zdFNpYmxpbmdcbiAgICBlbHNlXG4gICAgICB0aGlzXG5cbiAgZmluZFJpZ2h0bW9zdFNpYmxpbmc6IC0+XG4gICAgaWYgQHBhcmVudC5vcmllbnRhdGlvbiBpcyAnaG9yaXpvbnRhbCdcbiAgICAgIHJpZ2h0bW9zdFNpYmxpbmcgPSBsYXN0KEBwYXJlbnQuY2hpbGRyZW4pXG4gICAgICBpZiByaWdodG1vc3RTaWJsaW5nIGluc3RhbmNlb2YgUGFuZUF4aXNcbiAgICAgICAgdGhpc1xuICAgICAgZWxzZVxuICAgICAgICByaWdodG1vc3RTaWJsaW5nXG4gICAgZWxzZVxuICAgICAgdGhpc1xuXG4gICMgSWYgdGhlIHBhcmVudCBpcyBhIGhvcml6b250YWwgYXhpcywgcmV0dXJucyBpdHMgbGFzdCBjaGlsZCBpZiBpdCBpcyBhIHBhbmU7XG4gICMgb3RoZXJ3aXNlIHJldHVybnMgYSBuZXcgcGFuZSBjcmVhdGVkIGJ5IHNwbGl0dGluZyB0aGlzIHBhbmUgcmlnaHR3YXJkLlxuICBmaW5kT3JDcmVhdGVSaWdodG1vc3RTaWJsaW5nOiAtPlxuICAgIHJpZ2h0bW9zdFNpYmxpbmcgPSBAZmluZFJpZ2h0bW9zdFNpYmxpbmcoKVxuICAgIGlmIHJpZ2h0bW9zdFNpYmxpbmcgaXMgdGhpcyB0aGVuIEBzcGxpdFJpZ2h0KCkgZWxzZSByaWdodG1vc3RTaWJsaW5nXG5cbiAgIyBJZiB0aGUgcGFyZW50IGlzIGEgdmVydGljYWwgYXhpcywgcmV0dXJucyBpdHMgZmlyc3QgY2hpbGQgaWYgaXQgaXMgYSBwYW5lO1xuICAjIG90aGVyd2lzZSByZXR1cm5zIHRoaXMgcGFuZS5cbiAgZmluZFRvcG1vc3RTaWJsaW5nOiAtPlxuICAgIGlmIEBwYXJlbnQub3JpZW50YXRpb24gaXMgJ3ZlcnRpY2FsJ1xuICAgICAgW3RvcG1vc3RTaWJsaW5nXSA9IEBwYXJlbnQuY2hpbGRyZW5cbiAgICAgIGlmIHRvcG1vc3RTaWJsaW5nIGluc3RhbmNlb2YgUGFuZUF4aXNcbiAgICAgICAgdGhpc1xuICAgICAgZWxzZVxuICAgICAgICB0b3Btb3N0U2libGluZ1xuICAgIGVsc2VcbiAgICAgIHRoaXNcblxuICBmaW5kQm90dG9tbW9zdFNpYmxpbmc6IC0+XG4gICAgaWYgQHBhcmVudC5vcmllbnRhdGlvbiBpcyAndmVydGljYWwnXG4gICAgICBib3R0b21tb3N0U2libGluZyA9IGxhc3QoQHBhcmVudC5jaGlsZHJlbilcbiAgICAgIGlmIGJvdHRvbW1vc3RTaWJsaW5nIGluc3RhbmNlb2YgUGFuZUF4aXNcbiAgICAgICAgdGhpc1xuICAgICAgZWxzZVxuICAgICAgICBib3R0b21tb3N0U2libGluZ1xuICAgIGVsc2VcbiAgICAgIHRoaXNcblxuICAjIElmIHRoZSBwYXJlbnQgaXMgYSB2ZXJ0aWNhbCBheGlzLCByZXR1cm5zIGl0cyBsYXN0IGNoaWxkIGlmIGl0IGlzIGEgcGFuZTtcbiAgIyBvdGhlcndpc2UgcmV0dXJucyBhIG5ldyBwYW5lIGNyZWF0ZWQgYnkgc3BsaXR0aW5nIHRoaXMgcGFuZSBib3R0b213YXJkLlxuICBmaW5kT3JDcmVhdGVCb3R0b21tb3N0U2libGluZzogLT5cbiAgICBib3R0b21tb3N0U2libGluZyA9IEBmaW5kQm90dG9tbW9zdFNpYmxpbmcoKVxuICAgIGlmIGJvdHRvbW1vc3RTaWJsaW5nIGlzIHRoaXMgdGhlbiBAc3BsaXREb3duKCkgZWxzZSBib3R0b21tb3N0U2libGluZ1xuXG4gIGNsb3NlOiAtPlxuICAgIEBkZXN0cm95KCkgaWYgQGNvbmZpcm1DbG9zZSgpXG5cbiAgY29uZmlybUNsb3NlOiAtPlxuICAgIGZvciBpdGVtIGluIEBnZXRJdGVtcygpXG4gICAgICByZXR1cm4gZmFsc2UgdW5sZXNzIEBwcm9tcHRUb1NhdmVJdGVtKGl0ZW0pXG4gICAgdHJ1ZVxuXG4gIGhhbmRsZVNhdmVFcnJvcjogKGVycm9yLCBpdGVtKSAtPlxuICAgIGl0ZW1QYXRoID0gZXJyb3IucGF0aCA/IGl0ZW0/LmdldFBhdGg/KClcbiAgICBhZGRXYXJuaW5nV2l0aFBhdGggPSAobWVzc2FnZSwgb3B0aW9ucykgPT5cbiAgICAgIG1lc3NhZ2UgPSBcIiN7bWVzc2FnZX0gJyN7aXRlbVBhdGh9J1wiIGlmIGl0ZW1QYXRoXG4gICAgICBAbm90aWZpY2F0aW9uTWFuYWdlci5hZGRXYXJuaW5nKG1lc3NhZ2UsIG9wdGlvbnMpXG5cbiAgICBjdXN0b21NZXNzYWdlID0gQGdldE1lc3NhZ2VGb3JFcnJvckNvZGUoZXJyb3IuY29kZSlcbiAgICBpZiBjdXN0b21NZXNzYWdlP1xuICAgICAgYWRkV2FybmluZ1dpdGhQYXRoKFwiVW5hYmxlIHRvIHNhdmUgZmlsZTogI3tjdXN0b21NZXNzYWdlfVwiKVxuICAgIGVsc2UgaWYgZXJyb3IuY29kZSBpcyAnRUlTRElSJyBvciBlcnJvci5tZXNzYWdlPy5lbmRzV2l0aD8oJ2lzIGEgZGlyZWN0b3J5JylcbiAgICAgIEBub3RpZmljYXRpb25NYW5hZ2VyLmFkZFdhcm5pbmcoXCJVbmFibGUgdG8gc2F2ZSBmaWxlOiAje2Vycm9yLm1lc3NhZ2V9XCIpXG4gICAgZWxzZSBpZiBlcnJvci5jb2RlIGluIFsnRVBFUk0nLCAnRUJVU1knLCAnVU5LTk9XTicsICdFRVhJU1QnLCAnRUxPT1AnLCAnRUFHQUlOJ11cbiAgICAgIGFkZFdhcm5pbmdXaXRoUGF0aCgnVW5hYmxlIHRvIHNhdmUgZmlsZScsIGRldGFpbDogZXJyb3IubWVzc2FnZSlcbiAgICBlbHNlIGlmIGVycm9yTWF0Y2ggPSAvRU5PVERJUiwgbm90IGEgZGlyZWN0b3J5ICcoW14nXSspJy8uZXhlYyhlcnJvci5tZXNzYWdlKVxuICAgICAgZmlsZU5hbWUgPSBlcnJvck1hdGNoWzFdXG4gICAgICBAbm90aWZpY2F0aW9uTWFuYWdlci5hZGRXYXJuaW5nKFwiVW5hYmxlIHRvIHNhdmUgZmlsZTogQSBkaXJlY3RvcnkgaW4gdGhlIHBhdGggJyN7ZmlsZU5hbWV9JyBjb3VsZCBub3QgYmUgd3JpdHRlbiB0b1wiKVxuICAgIGVsc2VcbiAgICAgIHRocm93IGVycm9yXG5cbiAgZ2V0TWVzc2FnZUZvckVycm9yQ29kZTogKGVycm9yQ29kZSkgLT5cbiAgICBzd2l0Y2ggZXJyb3JDb2RlXG4gICAgICB3aGVuICdFQUNDRVMnIHRoZW4gJ1Blcm1pc3Npb24gZGVuaWVkJ1xuICAgICAgd2hlbiAnRUNPTk5SRVNFVCcgdGhlbiAnQ29ubmVjdGlvbiByZXNldCdcbiAgICAgIHdoZW4gJ0VJTlRSJyB0aGVuICdJbnRlcnJ1cHRlZCBzeXN0ZW0gY2FsbCdcbiAgICAgIHdoZW4gJ0VJTycgdGhlbiAnSS9PIGVycm9yIHdyaXRpbmcgZmlsZSdcbiAgICAgIHdoZW4gJ0VOT1NQQycgdGhlbiAnTm8gc3BhY2UgbGVmdCBvbiBkZXZpY2UnXG4gICAgICB3aGVuICdFTk9UU1VQJyB0aGVuICdPcGVyYXRpb24gbm90IHN1cHBvcnRlZCBvbiBzb2NrZXQnXG4gICAgICB3aGVuICdFTlhJTycgdGhlbiAnTm8gc3VjaCBkZXZpY2Ugb3IgYWRkcmVzcydcbiAgICAgIHdoZW4gJ0VST0ZTJyB0aGVuICdSZWFkLW9ubHkgZmlsZSBzeXN0ZW0nXG4gICAgICB3aGVuICdFU1BJUEUnIHRoZW4gJ0ludmFsaWQgc2VlaydcbiAgICAgIHdoZW4gJ0VUSU1FRE9VVCcgdGhlbiAnQ29ubmVjdGlvbiB0aW1lZCBvdXQnXG4iXX0=
