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

	function apply (fn, ctx, args) {
		// As call is faster than apply, this is a faster version of apply as it uses call
		return args.length <= 3 ?
			fn.call(ctx, args[0], args[1], args[2]) :
			fn.apply(ctx, args);
	}

	function hasKeys (obj, keys) {
		// Checks if an object has one or more specific keys. The keys don't have to be an owned property
		if (obj == null) return false;
		if (!_.isArray(keys)) {
			keys = slice(arguments, 1);
		}
		for (var i = 0, l = keys.length; i < l; i++) {
			if (!(keys[i] in obj)) return false;
		}
		return true;
	}

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
				// the current thread is finished
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

	// To prevent binding a listener several times to one object, we register the objects
	function ObjectRegistry () {
		this.registeredObjects = [];
	}
	ObjectRegistry.prototype = {
		isRegistered: function (obj) {
			return obj && obj.cid ? this.registeredObjects[obj.cid] : _.contains(this.registeredObjects, obj);
		},
		register: function (obj) {
			if (obj && obj.cid) {
				this.registeredObjects[obj.cid] = obj;
			} else {
				this.registeredObjects.push(obj);
			}
		},
		unregister: function (obj) {
			if (obj && obj.cid) {
				delete this.registeredObjects[obj.cid];
			} else {
				var i = _.indexOf(this.registeredObjects, obj);
				if (i > -1) {
					this.registeredObjects.splice(i, 1);
				}
			}
		}
	}

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

	function actionUndoRedo (which, attr, undoTypes) {
		// Calls the undo/redo-function for a specific action
		var type = attr.type, fn = !undoTypes[type] || undoTypes[type][which];
		if (_.isFunction(fn)) {
			fn(attr.object, attr.before, attr.after, attr);
		}
	}

	function managerUndoRedo (which, stack) {
		// Undoes or redoes the action the pointer is pointing at
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
			action[which](stack.undoTypes);
		}
		stack.isCurrentlyUndoRedoing = false;
	}

	function addToStack(stack, type, args, undoTypes, maximumStackLength) {
		// Adds an Undo-Action to the stack.
		if (stack.track && !stack.isCurrentlyUndoRedoing && type in undoTypes) {
			var res = apply(undoTypes[type]["on"], null, args), diff;
			if (hasKeys(res, "object", "before", "after")) {
				res.type = type;
				res.cycleIndex = getCurrentCycleIndex();
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
				if (stack.length > maximumStackLength) {
					stack.shift();
					stack.pointer--;
				}
			}
		}
	}


	var
	core_slice = Array.prototype.slice,
	slice = function (arr, index) {
		return core_slice.call(arr, index);
	},
	UndoTypes = {
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
			"on": function (model, collection, options) {
				return {
					object: collection,
					before: undefined,
					after: model,
					options: _.clone(options)
				};
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
			"on": function (model, collection, options) {
				return {
					object: collection,
					before: model,
					after: undefined,
					options: _.clone(options)
				};
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
			"on": function (model, options) {
				var
				changedAttributes = model.changedAttributes(),
				previousAttributes = _.pick(model.previousAttributes(), _.keys(changedAttributes));
				return {
					object: model,
					before: previousAttributes,
					after: changedAttributes
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
	},
	Action = Backbone.Model.extend({
		defaults: {
			type: null, // "add", "change", etc.
			object: null, // The object on which the action occured
			before: null, // The previous values which were changed with this action
			after: null, // The values after this action
			cycleIndex: null // The cycle index is to combine all actions which happend "at once" to undo/redo them altogether
		},
		undo: function (undoTypes) {
			actionUndoRedo("undo", this.attributes, undoTypes);
		},
		redo: function (undoTypes) {
			actionUndoRedo("redo", this.attributes, undoTypes);
		}
	}),
	UndoStack = Backbone.Collection.extend({
		model: Action,
		pointer: -1, // The pointer indicates the index where we are within the stack. We start at -1
		track: false,
		isCurrentlyUndoRedoing: false,
		maximumStackLength: Infinity,
		initialize: function () {
			this.objectRegistry = new ObjectRegistry();
			this.undoTypes = new OwnedUndoTypes();
		},
		setMaxLength: function (val) {
			this.maximumStackLength = val;
		},
		addToStack: function (type) {
			addToStack(this, type, slice(arguments, 1), this.undoTypes, this.maximumStackLength);
		}
	}),
	UndoManager = Backbone.Model.extend({
		defaults: {
			maximumStackLength: Infinity
		},
		initialize: function (attr) {
			this.stack = new UndoStack;

			// sync the maximumStackLength attribute with our stack
			this.stack.setMaxLength(this.get("maximumStackLength"));
			this.on("change:maximumStackLength", function (model, value) {
				this.stack.setMaxLength(value);
			}, this);
		},
		startTracking: function () {
			this.stack.track = true;
		},
		stopTracking: function () {
			this.stack.track = false;
		},
		register: function () {
			onoff("on", arguments, this.stack.addToStack, this.stack);
		},
		unregister: function () {
			onoff("off", arguments, this.stack.addToStack, this.stack);
		},
		undo: function () {
			managerUndoRedo("undo", this.stack);
		},
		redo: function () {
			managerUndoRedo("redo", this.stack);
		},
		addUndoType: function (type, fns) {
			manipulateUndoType(0, type, fns, this.stack.undoTypes);
		},
		changeUndoType: function (type, fns) {
			manipulateUndoType(1, type, fns, this.stack.undoTypes);
		},
		removeUndoType: function (type) {
			manipulateUndoType(2, type, undefined, this.stack.undoTypes);
		}
	});

	// Every instance of the undo manager has an own UndoTypes 
	// object. This object is an instance of OwnedUndoTypes whose 
	// prototype is the global UndoTypes object. By doing this,
	// changes to the global UndoTypes object take effect on every
	// instance and yet every local UndoTypes object can be changed
	// individually.
	function OwnedUndoTypes () {}
	OwnedUndoTypes.prototype = UndoTypes;

	function manipulateUndoType (manipType, undoType, fns, obj) {
		// manipType
		// 0: add
		// 1: change
		// 2: remove
		if (typeof undoType === "object") {
			// bulk action. Iterate over this data.
			return _.each(type, function (val, key) {
					if (manipType === 2) { // remove
						// type is an array
						manipulateUndoType (manipType, val, fns, obj);
					} else {
						// type is an object
						manipulateUndoType (manipType, key, val, obj);
					}
				})
		}

		switch (manipType) {
			case 0: // add
			if (hasKeys(fns, "undo", "redo", "on") && _.all(_.pick(fns, "undo", "redo", "on"), _.isFunction)) {
				obj[undoType] = fns;
			} 
			break;
			case 1: // change
			if (obj[undoType] && _.isObject(fns)) {
				_.extend(obj[undoType], fns);
			} 
			break;
			case 2: // remove
			delete obj[undoType]; 
			break;
		}
	}

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