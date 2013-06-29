
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

test("Start and stop tracking", function () {
	var UndoManager = new Backbone.UndoManager;

	var model = new Backbone.Model({
		"foo": "bar"
	})

	var collection = new Backbone.Collection([{"a": "b"}, {"c": "d"}]);

	UndoManager.register(model, collection);

	var before = UndoManager.stack.length;

	model.set("hello", "world");
	collection.add({"e": "f"});

	strictEqual(UndoManager.stack.length, before, "Actions weren't added to the stack, because tracking hasn't strated yet");

	UndoManager.startTracking();

	model.set("hello", "you");
	collection.remove(collection.last());

	var after = UndoManager.stack.length;

	strictEqual(after, 2, "Two actions have been added to the stack, because tracking has started");

	UndoManager.stopTracking();

	model.set("hello", "jude");
	collection.add({"e": "f"});
	model.set("hello", "you");
	collection.remove(collection.last());

	UndoManager.startTracking();

	strictEqual(UndoManager.stack.length, after, "No actions were added, because tracking was paused");
})

asyncTest("Undo Redo Model-Changes", 7, function () {
	var UndoManager = new Backbone.UndoManager,
	model = new Backbone.Model({
		"t": 1
	}), i;

	UndoManager.register(model);
	UndoManager.startTracking();

	model.set("t", 2);

	deepEqual(model.toJSON(), {"t": 2}, "The model wasn't changed by the UndoManager yet");

	UndoManager.undo();

	deepEqual(model.toJSON(), {"t": 1}, "Undoing the last action changed the model expectedly");

	UndoManager.redo();

	deepEqual(model.toJSON(), {"t": 2}, "Redoing the last action changed the model expectedly")

	defer(function () {
		start();
		// Undo / Redo several changes
		for (i = 3; i < 10; i++) {
			model.set("t", i);
		}

		UndoManager.undo();

		equal(model.get("t"), 2, "Undoing all actions of one cycle succeeded");

		UndoManager.redo();

		equal(model.get("t"), 9, "Redoing all actions of one cycle succeeded");
		stop();
	})

	defer(function () {
		start();
		// Undo newly set model-attributes
		var before = model.toJSON();

		model.set("new attribute", "Hi, what's up?");

		var after = model.toJSON();

		UndoManager.undo();

		deepEqual(model.toJSON(), before, "Unsetting a new attribute by undoing its initial set succeeded");

		UndoManager.redo();

		deepEqual(model.toJSON(), after, "Setting a new attribute by redoing its unsetting succeeded");
	})

	flushDeferQueue();
});

asyncTest("Undo Redo Collection-Manipulation", 9, function () {
	var UndoManager = new Backbone.UndoManager({"log":true}),
	collection = new Backbone.Collection([{"t": 1}, {"t": 2}, {"t": 3}]);

	function isSortOrderCorrect(c) {
		for (var i = 1, l = c.length; i < l; i++) {
			if (c.at(i).get("t") < c.at(i - 1).get("t")) {
				return false;
			}
		}
		return true;
	} 

	UndoManager.register(collection);
	UndoManager.startTracking();

	collection.add({"t": 4});

	equal(collection.length, 4, "The collection wasn't changed by the UndoManager");

	UndoManager.undo();

	equal(collection.length, 3, "Undoing adding a single model succeeded");

	UndoManager.redo();

	equal(collection.length, 4, "Redoing adding a single model succeeded");

	defer(function () {
		start();
		collection.add([{"t": 5}, {"t": 6}]);

		UndoManager.undo();

		equal(collection.length, 4, "Undoing adding several models succeeded");

		UndoManager.redo();

		equal(collection.length, 6, "Redoing adding several models succeeded");
		stop();
	})

	defer(function () {
		start();
		collection.add({"t": 7});

		UndoManager.undo();

		collection.add({"t": 8});

		var length = collection.length;

		UndoManager.redo();

		equal(collection.length, length, "Redoing an action after the collection was changed had no effect");
		stop();
	})

	defer(function () {
		start();
		var current = collection.toJSON();

		collection.remove(collection.at(3));

		UndoManager.undo();

		deepEqual(collection.toJSON(), current, "The removed model was put back at the index where it was");
		stop();
	})

	defer(function () {
		start();
		var before = collection.toJSON();

		collection.reset([{"x": 1}, {"x": 2}]);

		var after = collection.toJSON();

		UndoManager.undo();

		deepEqual(collection.toJSON(), before, "Undoing a reset succeeded");

		UndoManager.redo();

		deepEqual(collection.toJSON(), after, "Redoing a reset succeeded");
	})

	flushDeferQueue();
})

test("Registering, unregistering objects and getting registered objects", 3, function () {
	var undoManager = new Backbone.UndoManager(),
	objectRegistry = undoManager.objectRegistry,
	model = new Backbone.Model(),
	collection = new Backbone.Collection();

	undoManager.register(model, collection);

	equal(objectRegistry.get().length, 2, "The items were added and were able to get")

	undoManager.unregister(model);

	equal(objectRegistry.get().length, 1, "The model was successfully unregistered")

	undoManager.unregister(collection);

	equal(objectRegistry.get().length, 0, "The collection was successfully unregistered");
})

test("Merging Undo-Managers", 3, function () {
	var main = new Backbone.UndoManager(),
	special = new Backbone.UndoManager(),
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

	special.startTracking();
	main.startTracking();
	
	special.changeUndoType("change", {
		"on": function () {
			return obj;
		}
	});

	special.register(model1);
	main.register(model2);

	special.merge(main);

	model1.set("t", 2); // Here we're triggering a change event

	// Now, the stack-length of main must have been changed
	equal(main.stack.length, 1, "The specialized undomanager has written onto the main undomanager's stack")
	deepEqual(main.stack.at(0).toJSON(), obj, "The action data was manipulated by the changed undotype")

	model2.set("t", 2); // Here we're checking if the main undoManager can still write on its stack

	deepEqual(main.stack.at(1).toJSON().after, {"t": 2}, "The main undomanager can still write on its own stack")
})