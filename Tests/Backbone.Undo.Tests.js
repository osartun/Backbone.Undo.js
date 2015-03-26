test("Register and unregister", function () {
	var UndoManager = new Backbone.UndoManager;

	var model = new Backbone.Model,
	collection = new Backbone.Collection;

	UndoManager.register(model, collection);

	function getRegisteredObjects () {
		return UndoManager.objectRegistry.get();
	}

	strictEqual(getRegisteredObjects().length, 2, "Registering objects with the register method was successful");

	UndoManager.unregister(model);

	deepEqual(getRegisteredObjects(), [collection], "Unregistering an object with the unregister method was successful");

	UndoManager.register(model);
	UndoManager.unregisterAll();

	strictEqual(getRegisteredObjects().length, 0, "The unregisterAll function worked properly");

	var u1 = new Backbone.UndoManager({
		register: model
	}),
	u2 = new Backbone.UndoManager({
		register: collection
	}),
	u3 = new Backbone.UndoManager({
		register: [model, collection]
	});

	deepEqual(u1.objectRegistry.get(), [model], "Registering a single model over the 'register' attribute on instantiation was successful");
	deepEqual(u2.objectRegistry.get(), [collection], "Registering a single collection over the 'register' attribute on instantiation was successful");
	deepEqual(u3.objectRegistry.get(), [model, collection], "Registering multiple objects over the 'register' attribute on instantiation was successful");
})

test("Start and stop tracking", function () {
	var model = new Backbone.Model({
		"foo": "bar"
	})

	var collection = new Backbone.Collection([{"a": "b"}, {"c": "d"}]);

	var UndoManager = new Backbone.UndoManager({
		register: [model, collection]
	});

	var before = UndoManager.stack.length;

	model.set("hello", "world");
	collection.add({"e": "f"});

	strictEqual(UndoManager.stack.length, before, "Actions weren't added to the stack, because tracking hasn't started yet");

	ok(!UndoManager.isTracking(), "Tracking has not started yet");

	UndoManager.startTracking();

	ok(UndoManager.isTracking(), "Tracking has now started");

	model.set("hello", "you");
	collection.remove(collection.last());

	var after = UndoManager.stack.length;

	strictEqual(after, 2, "Two actions have been added to the stack, because tracking has started");

	UndoManager.stopTracking();

	model.set("hello", "kitty");
	collection.add({"e": "f"});
	model.set("hello", "you");
	collection.remove(collection.last());

	UndoManager.startTracking();

	strictEqual(UndoManager.stack.length, after, "No actions were added, because tracking was paused");

	UndoManager.unregisterAll();

	UndoManager = new Backbone.UndoManager({track: true});

	UndoManager.register(model, collection);

	model.set("hello", "hello");
	collection.add({"g": "h"});

	strictEqual(UndoManager.stack.length, 2, "{track:true} on instantiation started tracking at once");
});

test("Undo and redo Model-Changes", function () {
	var model = new Backbone.Model({
		"t": 1
	});

	var UndoManager = new Backbone.UndoManager({
		track: true,
		register: model
	});

	model.set("t", 2);

	UndoManager.undo();

	deepEqual(model.toJSON(), {"t": 1}, "Undoing changing a model attribute was successful");

	UndoManager.redo();

	deepEqual(model.toJSON(), {"t": 2}, "Redoing changing a model attribute was successful");

	model.set("x", 1);

	UndoManager.undo();

	deepEqual(model.toJSON(), {"t": 2}, "Undoing setting a model attribute was successful");

	UndoManager.redo();

	deepEqual(model.toJSON(), {"t": 2, "x": 1}, "Redoing setting a model attribute was successful");

	model.set({
		"y": 1,
		"x": 2
	})

	UndoManager.undo();

	deepEqual(model.toJSON(), {"t": 2, "x": 1}, "Undoing multiple changes at once was successful");

	UndoManager.redo();

	deepEqual(model.toJSON(), {"t": 2, "x": 2, "y": 1}, "Redoing multiple changes at once was successful");

	UndoManager.undo();
	UndoManager.undo();
	UndoManager.undo();

	deepEqual(model.toJSON(), {"t": 1}, "Calling undo consecutively several times was successful");

	UndoManager.undo();

	deepEqual(model.toJSON(), {"t": 1}, "Additional undo calls that would be out of the stack's bounds were successfully ignored");

	UndoManager.redo();
	UndoManager.redo();
	UndoManager.redo();

	deepEqual(model.toJSON(), {"t": 2, "x": 2, "y": 1}, "Calling redo consecutively several times was successful");

	UndoManager.redo();

	deepEqual(model.toJSON(), {"t": 2, "x": 2, "y": 1}, "Additional redo calls that would be out of the stack's bounds were successfully ignored");	
})

test("Undo and redo Collection-changes", function () {
	var collection = new Backbone.Collection([{"t": 1}, {"t": 2}, {"t": 3}]),
	UndoManager = new Backbone.UndoManager({
		track: true,
		register: collection
	});

	collection.add({"t": 4});

	UndoManager.undo();

	deepEqual(collection.toJSON(), [{"t": 1}, {"t": 2}, {"t": 3}], "Adding a model to the collection was successfully undone");

	UndoManager.redo();

	deepEqual(collection.toJSON(), [{"t": 1}, {"t": 2}, {"t": 3}, {"t": 4}], "Adding a model to the collection was successfully redone");

	collection.remove(collection.first());

	UndoManager.undo();

	deepEqual(collection.toJSON(), [{"t": 1}, {"t": 2}, {"t": 3}, {"t": 4}], "Removing a model from the collection was successfully undone");

	UndoManager.redo();

	deepEqual(collection.toJSON(), [{"t": 2}, {"t": 3}, {"t": 4}], "Removing a model from the collection was successfully redone");

	collection.reset([{"a": 1}, {"a": 2}, {"a": 3}]);

	UndoManager.undo();

	deepEqual(collection.toJSON(), [{"t": 2}, {"t": 3}, {"t": 4}], "Resetting the collection was successfully undone");

	UndoManager.redo();

	deepEqual(collection.toJSON(), [{"a": 1}, {"a": 2}, {"a": 3}], "Resetting the collection was successfully redone");

	collection.first().destroy();

	UndoManager.undo();

	deepEqual(collection.toJSON(), [{"a": 1}, {"a": 2}, {"a": 3}], "Destroying a model in the collection was successfully undone");

	UndoManager.redo();

	deepEqual(collection.toJSON(), [{"a": 2}, {"a": 3}], "Destroying a model in the collection was successfully redone");
})

test("ObjectRegistry", function () {
	var model = new Backbone.Model,
	collection = new Backbone.Collection,
	nonBackboneObject = {"something":"else"},
	UndoManager = new Backbone.UndoManager,
	objectRegistry = UndoManager.objectRegistry;

	function compare (arr1, arr2) {
		return _.all(arr1, function (v) {
			return _.contains(arr2, v);
		});
	}

	objectRegistry.register(model);

	ok(objectRegistry.isRegistered(model), "The isRegistered method returns true");

	objectRegistry.register(collection);

	ok(compare(objectRegistry.get(), [model, collection]), "The get method rightfully returns a list of the registered objects");

	objectRegistry.register(model);
	objectRegistry.register(collection);

	equal(objectRegistry.get().length, 2, "Redundant registrations are correctly ignored");

	objectRegistry.register(nonBackboneObject);

	ok(compare(objectRegistry.get(), [model, collection, nonBackboneObject]), "Non-Backbone objects are also correctly registered");

	objectRegistry.unregister(model);
	objectRegistry.unregister(collection);
	objectRegistry.unregister(nonBackboneObject);

	equal(objectRegistry.get().length, 0, "Unregistering objects works properly");
})

test("Merging UndoManagers", 2, function () {
	var main = new Backbone.UndoManager({track:true}),
	special = new Backbone.UndoManager({track:true}),
	model1 = new Backbone.Model({
		"t": 1
	}),
	model2 = new Backbone.Model,
	obj = {
		object: model1,
		before: {"a": 1},
		after: {"b": 1}
	};

	main.id = main.stack.id = "main";
	special.id = special.stack.id = "special";
	
	special.changeUndoType("change", {
		"on": function () {
			return obj;
		}
	});

	special.register(model1);
	main.register(model2);

	main.merge(special);

	model1.set("t", 2); // Here we're triggering a change event

	// Now, the stack-length of main must have been changed
	deepEqual(main.stack.at(0).toJSON(), obj, "The action data was manipulated by the changed undotype")

	model2.set("t", 2); // Here we're checking if the main undoManager can still write on its stack

	deepEqual(main.stack.at(1).toJSON().after, {"t": 2}, "The main undomanager can still write on its own stack")
})

test("Clearing all actions", function () {
	var model = new Backbone.Model({
		"t": 1
	});

	var UndoManager = new Backbone.UndoManager({
		track: true,
		register: model
	});

	model.set("t", 2);
	model.set("t", 3);
	model.set("t", 4);

	UndoManager.clear();

	UndoManager.undo();

	deepEqual(model.toJSON(), {"t": 4}, "Clearing actions before undoing was successful");

	model.set("t", 2);
	model.set("t", 3);
	model.set("t", 4);

	UndoManager.undo();
	UndoManager.undo();

	UndoManager.clear();

	UndoManager.redo();

	deepEqual(model.toJSON(), {"t": 2}, "Clearing actions before redoing was successful");
})

test("Undoing all actions", function () {
	var model = new Backbone.Model({
		"t": 1
	});

	var UndoManager = new Backbone.UndoManager({
		track: true,
		register: model
	});

	model.set("t", 2);
	model.set("t", 3);
	model.set("t", 4);

	UndoManager.undoAll();

	deepEqual(model.toJSON(), {"t": 1}, "Calling undoAll was successful");

	UndoManager.redoAll();

	deepEqual(model.toJSON(), {"t": 4}, "Calling redoAll was successful");

	UndoManager.undo();
	UndoManager.undoAll();
	UndoManager.undo(true);

	deepEqual(model.toJSON(), {"t": 1}, "Mixing undoAll with undo doesn't cause any problems");
	
	UndoManager.undoAll(); // back to the stack's beginning

	UndoManager.redo();
	UndoManager.redoAll();
	UndoManager.redo(true);

	deepEqual(model.toJSON(), {"t": 4}, "Mixing redoAll with redo doesn't cause any problems");

	UndoManager.undoAll();
	UndoManager.undoAll();
	UndoManager.redoAll();
	UndoManager.redoAll();

	deepEqual(model.toJSON(), {"t": 4}, "Calling undoAll and redoAll multiple times doesn't cause any problems");

})

/**
 * Async tests for magic fusion
 */

var deferQueue = [];
function defer(fn) {
	var args = [].slice.call(arguments);
	deferQueue.push(fn, args);
}
function flushDeferQueue() {
	_.defer(function () {
		var fn = deferQueue.shift(),
			args = deferQueue.shift();
		if (fn) {
			fn.apply(null, args);
			flushDeferQueue();
		}
	})
}

asyncTest("Magic Fusion", 4, function () {
	var model = new Backbone.Model({
		"t": 1
	}), collection = new Backbone.Collection([{"a": 3}]),
	UndoManager = new Backbone.UndoManager({
		track: true,
		register: [model, collection]
	}), i;

	defer(function () {
		start();
		// Undo / Redo several changes
		for (i = 3; i < 10; i++) {
			model.set("t", i);
		}

		UndoManager.undo(true);

		equal(model.get("t"), 1, "Undoing all changes that happened on a model at once succeeded");

		UndoManager.redo(true);

		equal(model.get("t"), 9, "Redoing all changes that happened on a model at once succeeded");
	})

	defer(function () {
		stop();
		collection.add([{"a": 4}, {"a": 5}]);

		UndoManager.undo(true);

		equal(collection.length, 1, "Undoing adding several models to a collection succeeded");

		UndoManager.redo(true);

		equal(collection.length, 3, "Redoing adding several models to a collection succeeded");
		start();
	})

	flushDeferQueue();
})
