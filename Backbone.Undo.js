/*!
 * Backbone.Undo.js v0.1
 * 
 * Copyright (c)2013 Oliver Sartun
 * Released under the MIT License
 *
 * Documentation and full license available at
 * https://github.com/Bloli/Backbone.Undo.js
 */
(function (win, doc, $, _, Backbone, undefined) {

	var core_slice = Array.prototype.slice;

	/**
	 * As call is faster than apply, this is a faster version of apply as it uses call.
	 * 
	 * @param  {Function} fn The function to execute 
	 * @param  {Object}   ctx The context the function should be called in
	 * @param  {Array}    args The array of arguments that should be applied to the function
	 * @return Forwards whatever the called function returns
	 */
	function apply (fn, ctx, args) {
		return args.length <= 4 ?
			fn.call(ctx, args[0], args[1], args[2], args[3]) :
			fn.apply(ctx, args);
	}

	/**
	 * Uses slice on an array or an array-like object.
	 * 
	 * @param  {Array|Object} arr
	 * @param  {Number} [index]
	 * @return {Array} The sliced array
	 */
	function slice (arr, index) {
		return core_slice.call(arr, index);
	}

	/**
	 * Checks if an object has one or more specific keys. The keys 
	 * don't have to be an owned property.
	 * You can call this function either this way:
	 * hasKeys(obj, ["a", "b", "c"])
	 * or this way:
	 * hasKeys(obj, "a", "b", "c")
	 * 
	 * @param  {Object}  obj The object to check on
	 * @param  {Array}  keys The keys to check for
	 * @return {Boolean} true, if the object has all those keys
	 */
	function hasKeys (obj, keys) {
		if (obj == null) return false;
		if (!_.isArray(keys)) {
			keys = slice(arguments, 1);
		}
		return _.all(keys, function (key) {
			return key in obj;
		});
	}

	/**
	 * Returns a number that is unique per call stack. The number gets 
	 * changed after the call stack has been completely processed.
	 * 
	 * @return {number} 
	 */
	var getCurrentCycleIndex = (function () {
		// If you add several models to a collection or set several
		// attributes on a model all in sequence and yet all for
		// example in one function, then several Undo-Actions are
		// generated.
		// If you want to undo your last Action, then only the last
		// model would be removed from the collection or the last
		// set attribute would be changed back to its previous value.
		// To prevent that we have to figure out a way to combine
		// all those actions which happend "at the same time". 
		// Timestamps aren't exact enough. A complex routine could 
		// run several milliseconds and in that time produce a lot 
		// of actions with different timestamps.
		// Instead we take advantage of the single-threadedness of
		// JavaScript:

		var cycleWasIndexed = false, cycleIndex = -1;
		function indexCycle() {
			cycleIndex++;
			cycleWasIndexed = true;
			_.defer(function () {
				// Here comes the magic. With a Timeout of 0 
				// milliseconds this function gets called whenever
				// the current call stack is completely processed
				cycleWasIndexed = false;
			})
		}
		return function () {
			if (!cycleWasIndexed) {
				indexCycle();
			}
			return cycleIndex|0; // Make this a true integer
		}
	})();

	/**
	 * To prevent binding a listener several times to one 
	 * object, we register the objects in an ObjectRegistry
	 *
	 * @constructor
	 */
	function ObjectRegistry () {
		// This uses two different ways of storing
		// objects: In case the object has a cid
		// (which Backbone objects typically have)
		// it uses this cid as an index. That way
		// the Array's length attribute doesn't 
		// change and the object isn't really part 
		// of the array as a list but of the array
		// as an object.
		// In case it doesn't have a cid it's 
		// pushed as an Array-item.
		this.registeredObjects = [];
		this.cidIndexes = []; // Here, the cid-indexes are stored
	}
	ObjectRegistry.prototype = {
		/**
		 * Returns whether the object is already registered in this ObjectRegistry or not.
		 * 
		 * @this {ObjectRegistry}
		 * @param  {Object} obj The object to check
		 * @return {Boolean} true if the object is already registered
		 */
		isRegistered: function (obj) {
			return obj && obj.cid ? this.registeredObjects[obj.cid] : _.contains(this.registeredObjects, obj);
		},
		/**
		 * Registeres an object in this ObjectRegistry.
		 * 
		 * @this {ObjectRegistry}
		 * @param  {Object} obj The object to register
		 * @return {undefined}
		 */
		register: function (obj) {
			if (obj && obj.cid) {
				this.registeredObjects[obj.cid] = obj;
				this.cidIndexes.push(obj.cid);
			} else {
				this.registeredObjects.push(obj);
			}
		},
		/**
		 * Unregisteres an object from this ObjectRegistry.
		 * 
		 * @this {ObjectRegistry}
		 * @param  {Object} obj The object to unregister
		 * @return {undefined}
		 */
		unregister: function (obj) {
			if (obj && obj.cid) {
				delete this.registeredObjects[obj.cid];
				this.cidIndexes.splice(_.indexOf(this.cidIndexes, obj.cid), 1);
			} else {
				var i = _.indexOf(this.registeredObjects, obj);
				this.registeredObjects.splice(i, 1);
			}
		},
		/**
		 * Returns an array of all the objects which are currently in this ObjectRegistry.
		 * 
		 * @return {Array} An array of all the objects which are currently in the ObjectRegistry
		 */
		get: function () {
			return (_.map(this.cidIndexes, function (cid) {return this.registeredObjects[cid];}, this)).concat(this.registeredObjects);
		}
	}

	/**
	 * Binds or unbinds the "all"-listener for one or more objects.
	 * 
	 * @param  {String}   which Either "on" or "off"
	 * @param  {Object[]} objects Array of the objects on which the "all"-listener should be bound / unbound
	 * @param  {Function} [fn] The function that should be bound / unbound. Optional in case of "off"
	 * @param  {Object}   [ctx] The context the function should be called in
	 * @return {undefined}
	 */
	function onoff(which, objects, fn, ctx) {
		// Binds or unbinds the "all" listener for one or more objects
		for (var i = 0, l = objects.length, obj; i < l; i++) {
			obj = objects[i];
			if (!obj) continue;
			if (which === "on") {
				if (ctx.objectRegistry.isRegistered(obj)) {
					continue;
				} else {
					ctx.objectRegistry.register(obj);
				}
			} else {
				if (!ctx.objectRegistry.isRegistered(obj)) {
					continue;
				} else {
					ctx.objectRegistry.unregister(obj);
				}
			}
			if (_.isFunction(obj[which])) {
				obj[which]("all", fn, ctx);
			}
		}
	}

	/**
	 * Calls the undo/redo-function for a specific action.
	 * 
	 * @param  {String} which Either "undo" or "redo"
	 * @param  {Object} action The Action's attributes
	 * @return {undefined}
	 */
	function actionUndoRedo (which, action) {
		var type = action.type, undoTypes = action.undoTypes, fn = !undoTypes[type] || undoTypes[type][which];
		if (_.isFunction(fn)) {
			fn(action.object, action.before, action.after, action);
		}
	}

	/**
	 * The main undo/redo function. Undoes / redoes all actions which 
	 * have the same cycleIndex attribute as the action the stack-pointer 
	 * is pointing to.
	 * 
	 * @param  {String} which Either "undo" or "redo"
	 * @param  {UndoManager} manager The UndoManager-instance on which an "undo"/"redo"-Event is triggered afterwards
	 * @param  {UndoStack} stack The UndoStack on which we perform
	 * @return {undefined}
	 */
	function managerUndoRedo (which, manager, stack) {
		if (stack.isCurrentlyUndoRedoing || 
			(which === "undo" && stack.pointer === -1) ||
			(which === "redo" && stack.pointer === stack.length - 1)) {
			return;
		}
		stack.isCurrentlyUndoRedoing = true;
		var action, actions, isUndo = which === "undo";
		if (isUndo) {
			action = stack.at(stack.pointer);
			stack.pointer--;
		} else {
			stack.pointer++;
			action = stack.at(stack.pointer);
		}
		actions = stack.where({"cycleIndex": action.get("cycleIndex")});
		stack.pointer += (isUndo ? -1 : 1) * (actions.length - 1);
		while (action = isUndo ? actions.pop() : actions.shift()) {
			action[which]();
		}
		stack.isCurrentlyUndoRedoing = false;

		manager.trigger(which, manager);
	}

	/**
	 * Adds an Undo-Action to the stack.
	 * 
	 * @param {UndoStack} stack
	 * @param {String} type The event type (i.e. "change")
	 * @param {Arguments} args The arguments passed to the undoTypes' "on"-handler
	 * @param {OwnedUndoTypes} undoTypes The undoTypes-object which has the "on"-handler
	 * @return {undefined}
	 */
	function addToStack(stack, type, args, undoTypes) {
		if (stack.track && !stack.isCurrentlyUndoRedoing && type in undoTypes) {
			var res = apply(undoTypes[type]["on"], undoTypes[type], args), diff;
			if (hasKeys(res, "object", "before", "after")) {
				res.type = type;
				res.cycleIndex = getCurrentCycleIndex();
				res.undoTypes = undoTypes;
				if (stack.pointer < stack.length - 1) {
					// New Actions must always be added to the end of the stack
					// If the pointer is not pointed to the last action in the
					// stack, presumably because actions were undone before, then
					// all following actions must be discarded
					var diff = stack.length - stack.pointer - 1;
					while (diff--) {
						stack.pop();
					}
				}
				stack.pointer = stack.length;
				stack.add(res);
				if (stack.length > stack.maximumStackLength) {
					stack.shift();
					stack.pointer--;
				}
			}
		}
	}

	function returnTrue() {return true;}

	/**
	 * Predefined UndoTypes object with default handlers for the most common events.
	 * @type {Object}
	 */
	var UndoTypes = {
		"add": {
			"undo": function (collection, ignore, model, data) {
				// Undo add = remove
				collection.remove(model, data.options);
			},
			"redo": function (collection, ignore, model, data) {
				// Redo add = add
				var options = data.options;
				if (options.index) {
					options.at = options.index;
				}
				collection.add(model, data.options);
			},
			"condition": returnTrue,
			"on": function (model, collection, options) {
				if (this.condition(model, collection, options)) {
					return {
						object: collection,
						before: undefined,
						after: model,
						options: _.clone(options)
					};
				}
			}
		},
		"remove": {
			"undo": function (collection, model, ignore, data) {
				var options = data.options;
				if (options.index) {
					options.at = options.index;
				}
				collection.add(model, options);
			},
			"redo": function (collection, model, ignore, data) {
				collection.remove(model, data.options);
			},
			"condition": returnTrue,
			"on": function (model, collection, options) {
				if (this.condition(model,collection, options)) {
					return {
						object: collection,
						before: model,
						after: undefined,
						options: _.clone(options)
					};
				}
			}
		},
		"change": {
			"undo": function (model, before, after) {
				if (_.isEmpty(before)) {
					_.each(_.keys(after), model.unset, model);
				} else {
					model.set(before);
				}
			},
			"redo": function (model, before, after) {
				if (_.isEmpty(after)) {
					_.each(_.keys(before), model.unset, model);
				} else {
					model.set(after);
				}
			},
			"condition": returnTrue,
			"on": function (model, options) {
				if (this.condition(model, options)) {
					var
					changedAttributes = model.changedAttributes(),
					previousAttributes = _.pick(model.previousAttributes(), _.keys(changedAttributes));
					return {
						object: model,
						before: previousAttributes,
						after: changedAttributes
					};
				}
			}
		},
		"reset": {
			"undo": function (collection, before, after) {
				collection.reset(before);
			},
			"redo": function (collection, before, after) {
				collection.reset(after);
			},
			"on": function (collection, options) {
				return {
					object: collection,
					before: options.previousModels,
					after: _.clone(collection.models)
				};
			}
		}
	};

	/**
	 * Every instance of the undo manager has an own undoTypes 
	 * object which is an instance of OwnedUndoTypes whose 
	 * prototype is the global UndoTypes object. By refering to the 
	 * global UndoTypes object as the prototype changes to the global 
	 * UndoTypes object take effect on every instance and yet every 
	 * local UndoTypes object can be changed individually.
	 *
	 * @constructor
	 */
	function OwnedUndoTypes () {}
	OwnedUndoTypes.prototype = UndoTypes;

	/**
	 * Adds, changes or removes an undo-type from an UndoTypes-object.
	 * You can call it this way:
	 * manipulateUndoType (1, "reset", {"on": function () {}}, undoTypes)
	 * or this way:
	 * manipulateUndoType (1, {"reset": {"on": function () {}}}, undoTypes)
	 * 
	 * @param  {Number} manipType Indicates the kind of action to execute: 0 for add, 1 for change, 2 for remove
	 * @param  {String|Object|Array} undoType The type of undoType that should be added/changed/removed. Can be an object / array to perform bulk actions
	 * @param  {Object} [fns] Object with the functions to add / change. Is optional in case you passed an object as undoType which contains these functions
	 * @param  {OwnedUndoTypes|UndoTypes} undoTypesInstance The undoTypes object to act on
	 * @return {undefined}
	 */
	function manipulateUndoType (manipType, undoType, fns, undoTypesInstance) {
		// manipType
		// 0: add
		// 1: change
		// 2: remove
		if (typeof undoType === "object") {
			// bulk action. Iterate over this data.
			return _.each(undoType, function (val, key) {
					if (manipType === 2) { // remove
						// undoType is an array
						manipulateUndoType (manipType, val, fns, undoTypesInstance);
					} else {
						// undoType is an object
						manipulateUndoType (manipType, key, val, fns);
					}
				})
		}

		switch (manipType) {
			case 0: // add
				if (hasKeys(fns, "undo", "redo", "on") && _.all(_.pick(fns, "undo", "redo", "on"), _.isFunction)) {
					undoTypesInstance[undoType] = fns;
				} 
			break;
			case 1: // change
				if (undoTypesInstance[undoType] && _.isObject(fns)) {
					// undoTypeInstance[undoType] may be a prototype's property
					// So, if we did this _.extend(undoTypeInstance[undoType], fns)
					// we would extend the object on the prototype which means
					// that this change would have a global effect
					// Instead we just want to manipulate this instance. That's why
					// we're doing this:
					undoTypesInstance[undoType] = _.extend({}, undoTypesInstance[undoType], fns);
				} 
			break;
			case 2: // remove
				delete undoTypesInstance[undoType]; 
			break;
		}
	}

	var Action = Backbone.Model.extend({
		defaults: {
			type: null, // "add", "change", etc.
			object: null, // The object on which the action occured
			before: null, // The previous values which were changed with this action
			after: null, // The values after this action
			cycleIndex: null // The cycle index is to combine all actions which happend "at once" to undo/redo them altogether
		},
		/**
		 * Undoes this action.
		 * @param  {OwnedUndoTypes|UndoTypes} undoTypes The undoTypes object which contains the "undo"-handler that should be used
		 * @return {undefined}
		 */
		undo: function (undoTypes) {
			actionUndoRedo("undo", this.attributes);
		},
		/**
		 * Redoes this action.
		 * @param  {OwnedUndoTypes|UndoTypes} undoTypes The undoTypes object which contains the "redo"-handler that should be used
		 * @return {undefined}
		 */
		redo: function (undoTypes) {
			actionUndoRedo("redo", this.attributes);
		}
	}),
	UndoStack = Backbone.Collection.extend({
		model: Action,
		pointer: -1, // The pointer indicates the index where we are within the stack. We start at -1
		track: false,
		isCurrentlyUndoRedoing: false,
		maximumStackLength: Infinity,
		setMaxLength: function (val) {
			this.maximumStackLength = val;
		}
	}),
	UndoManager = Backbone.Model.extend({
		defaults: {
			maximumStackLength: Infinity,
			track: false
		},
		initialize: function (attr) {
			this.stack = new UndoStack;
			this.objectRegistry = new ObjectRegistry();
			this.undoTypes = new OwnedUndoTypes();

			// sync the maximumStackLength attribute with our stack
			this.stack.setMaxLength(this.get("maximumStackLength"));
			this.on("change:maximumStackLength", function (model, value) {
				this.stack.setMaxLength(value);
			}, this);

			// Start tracking, if attr.track == true
			this[(attr && attr.track ? "start" : "stop") + "Tracking"]();
		},
		/**
		 * Starts tracking. Changes of registered objects won't be processed until you've called this function
		 * @return {undefined}
		 */
		startTracking: function () {
			this.set("track", true);
			this.stack.track = true;
		},
		/**
		 * Stops tracking. Afterwards changes of registered objects won't be processed.
		 * @return {undefined}
		 */
		stopTracking: function () {
			this.set("track", false);
			this.stack.track = false;
		},
		/**
		 * This is the "all"-handler which is bound to registered 
		 * objects. It creates an UndoAction from the event and adds 
		 * it to the stack.
		 * 
		 * @param  {String} type The event type
		 * @return {undefined}
		 */
		_addToStack: function (type) {
			addToStack(this.stack, type, slice(arguments, 1), this.undoTypes);
		},
		/**
		 * Registers one or more objects to track their changes.
		 * @param {...Object} obj The object whose changes should be tracked
		 * @return {undefined}
		 */
		register: function () {
			onoff("on", arguments, this._addToStack, this);
		},
		/**
		 * Unregisters one or more objects.
		 * @param {...Object} obj The object whose changes shouldn't be tracked any longer
		 * @return {undefined}
		 */
		unregister: function () {
			onoff("off", arguments, this._addToStack, this);
		},
		/**
		 * Undoes the last set of actions which were created during one "call cycle".
		 * @return {undefined}
		 */
		undo: function () {
			managerUndoRedo("undo", this, this.stack);
		},
		/**
		 * Redoes a previously undone set of actions.
		 * @return {undefined}
		 */
		redo: function () {
			managerUndoRedo("redo", this, this.stack);
		},
		/**
		 * Checks if there's a set of actions in the stack which can be undone / redone
		 * @param  {String} type Either "undo" or "redo"
		 * @return {Boolean} true if there is a set of actions which can be undone / redone
		 */
		isAvailable: function (type) {
			var s = this.stack, l = s.length;

			switch (type) {
				case "undo": return l > 0 && s.pointer > -1;
				case "redo": return l > 0 && s.pointer < l - 1;
				default: return false;
			}
		},
		/**
		 * Sets the stack-reference to the stack of another undoManager.
		 * @param  {UndoManager} undoManager The undoManager whose stack should be used
		 * @return {undefined}
		 */
		merge: function (undoManager) {
			// This sets the stack-reference to the stack of another 
			// undoManager so that the stack of this other undoManager 
			// is used by two different managers.
			// This enables to set up a main-undoManager and besides it
			// several others for special, exceptional cases (by using
			// instance-based custom UndoTypes). Models / collections 
			// which need this special treatment are only registered at 
			// these special undoManagers. These special ones are then 
			// merged with the main-undoManagers to write on its stack. 
			// That way it's easier to manage exceptional cases.

			// Please note: It's way faster to first merge an undoManager
			// with another one and then register all objects than the
			// other way round.
			if (undoManager instanceof UndoManager &&
				undoManager.stack instanceof UndoStack) {
				// unregister already registered objects
				var registeredObjects = this.objectRegistry.get(),
				hasObjects = !!registeredObjects.length;
				if (hasObjects) apply(this.unregister, this, registeredObjects);
				// replace the stack reference
				this.stack = undoManager.stack;
				// register the just unregistered objects, now on the new stack
				if (hasObjects) apply(this.register, this, registeredObjects);
			}
		},
		addUndoType: function (type, fns) {
			manipulateUndoType(0, type, fns, this.undoTypes);
		},
		changeUndoType: function (type, fns) {
			manipulateUndoType(1, type, fns, this.undoTypes);
		},
		removeUndoType: function (type) {
			manipulateUndoType(2, type, undefined, this.undoTypes);
		}
	});

	_.extend(UndoManager, {
		"addUndoType": function (type, fns) {
			manipulateUndoType(0, type, fns, UndoTypes);
		},
		"changeUndoType": function (type, fns) {
			manipulateUndoType(1, type, fns, UndoTypes)
		},
		"removeUndoType": function (type) {
			manipulateUndoType(2, type, undefined, UndoTypes);
		}
	})

	Backbone.UndoManager = UndoManager;

})(window, window.document, window.jQuery, window._, window.Backbone)