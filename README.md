Backbone.Undo.js
================

A simple Backbone undo manager for simple apps

**Go to [the repo's GitHub page](http://osartun.github.io/Backbone.Undo.js/) for demos and a video tutorial!**

***

#### Advantages of Backbone.Undo.js

* 	**The Drop-In Manager**

	In comparison to undo managers that implement the memento pattern you don't have to modify your models and collections to use Backbone.Undo.js. Just drop in Backbone.Undo.js and register the objects whose actions you want to undo. That way it's not only easy to include Backbone.Undo.js, but also to exclude it in case you don't want to use it any longer at some point.

*	**Ready To Go: Based on Backbone-Events**

	You don't have to manually call methods to `store()` or `restore()` certain states. To detect an undoable action, Backbone.Undo.js listens to the events Backbone triggeres automatically. You don't have to do anything.

* 	**Magic Fusion**

	In a more complex web application the click of a button might trigger several changes which dispatch several events which in Backbone.Undo.js are turned into several undoable actions. If the user wants to undo what he caused with his click he wants to undo all of those actions. Backbone.Undo.js has an internal feature called *Magic Fusion* that detects actions that were created in one flow and undoes or redoes all of them.

#### Who should use Backbone.Undo.js

Backbone.Undo.js is a simple undo manager that should be used for rather simple web applications. It has mechanisms that make it extensible and suitable for more complex applications. However, it might not be adequate for very large-scale applications with vast amounts of lines of code.

## Getting started

Backbone.Undo.js depends on Backbone.js which depends on Underscore.js (or Lo-Dash.js). Make sure to include these two files before you include Backbone.Undo.js:

    <script src="underscore.js"></script>
    <script src="backbone.js"></script>
    <!-- Backbone.Undo.js is included *after* Backbone and Underscore -->
    <script src="Backbone.Undo.js"></script>


#### Backbone Version

Backbone.Undo.js was developed for Backbone 1.0.0 or higher.

#### Underscore Version

Backbone.Undo.js was developed for Underscore 1.4.4 or higher.

## Setting up your UndoManager

In order to set up your UndoManager you have to do the following steps:

1. __Instantiate__ your UndoManager

        var myUndoManager = new Backbone.UndoManager();

2. __Register__ the models and collections you want to observe

        var model = new Backbone.Model,
        collection = new Backbone.Collection;
        myUndoManager.register(model, collection); // You can pass several objects as arguments
        // You can prepare your objects here. Changes won't be tracked yet.
        model.set("foo", "bar");
        collection.add([{"something": "blue"}]);
        // These changes can't be undone.

3. __Start tracking__ the changes

        myUndoManager.startTracking(); // Every change that happens to the model and the collection can now be undone

__Shorthand__: If you already have the objects you want to observe at hand when you instantiate the undo manager or if you don't need to prepare them you can pass them on instantiation:

    // Shorthand
    var myUndoManager = new Backbone.UndoManager({
    	track: true, // changes will be tracked right away
    	register: [model, collection] // pass an object or an array of objects
    })


## Backbone.Undo.js methods

Methods you can call on an instance of `Backbone.UndoManager`:

#### Constructor 	`new Backbone.UndoManager([object])`

The constructor can be called with an object of attributes as an optional argument. Each attribute is optional and has a default value.

    var undoManager = new Backbone.UndoManager; // possible, because the argument is optional
    var undoManager = new Backbone.UndoManager({
        maximumStackLength: 30, // default: Infinity; Maximum number of undoable actions
        track: true, // default: false; If true, changes will be tracked right away
        register: myObj // default: undefined; Pass the object or an array of objects that you want to observe
    });

#### register		`undoManager.register(obj, [obj, ...])`

Your undo manager must know the objects whose actions should be undoable/redoable. Therefore you have to register these
objects:

    var model = new Backbone.Model;
    var collection = new Backbone.Collection;
    undoManager.register(model, collection);

The register-method doesn't check whether the object is an instance of Backbone.Model or Backbone.Collection. That makes
it possible to bind other objects as well. However, make sure they have an `on()` and an `off()` method and trigger an `"all"` event in the fashion of Backbone's `"all"` event.

#### unregister		`undoManager.unregister(obj, [obj, …])`

Previously registered objects can be unregistered using the `unregister()` method. Changes to those objects can't be
undone after they have been unregistered.

    var myModel = new Backbone.Model;
    undoManager.register(myModel);
    undoManager.startTracking();
    myModel.set("foo", "bar"); // Can be undone
    undoManager.unregister(myModel);
    myModel.set("foo", "baz"); // Can't be undone

#### unregisterAll      `undoManager.unregisterAll()`

Unregister all objects that have been registered at this undoManager so far.

#### startTracking 	`undoManager.startTracking()`

Changes must be tracked in order to create UndoActions. You can either set `{track: true}` on instantiation or call `startTracking()` later.

    var myModel = new Backbone.Model;
    undoManager.register(myModel);
    myModel.set("foo", "bar"); // Can't be undone because tracking didn't start yet
    undoManager.startTracking();
    myModel.set("foo", "baz"); // Can be undone

#### stopTracking	`undoManager.stopTracking();`
    
If you want to stop tracking changes for whatever reason, you can do that by calling `stopTracking()`.

    myModel.set("foo", 1);
    undoManager.startTracking();
    myModel.set("foo", 2);
    undoManager.stopTracking();
    myModel.set("foo", 3);
    undoManager.undo(); // "foo" is 1 instead of 2, because the last change wasn't tracked

#### undo		`undoManager.undo([magic]);`
    
The method to undo the last action is `undo()`.

        myModel.get("foo"); // => 1
        
        myModel.set("foo", 2);
        undoManager.undo();
        
        myModel.get("foo"); // => 1

Pass `true` to activate *Magic Fusion*. That way you undo the complete last set of actions that happened at once.

#### undoAll		`undoManager.undoAll();`

Undoes all actions ever tracked by the undo manager.

#### redo		`undoManager.redo([magic])`
    
The method to redo the latest undone action is `redo()`.

        myModel.set("foo", 2);
        
        undoManager.undo();
        myModel.get("foo"); // => 1
        
        undoManager.redo();
        myModel.get("foo"); // => 2

Like with `undo()` you can pass `true` to activate *Magic Fusion* and to redo the complete last set of actions that were undone.

#### redoAll		`undoManager.redoAll();`

Redoes all actions ever tracked by the undo manager.

#### isAvailable        `undoManager.isAvailable(type)`

This method checks if there's an UndoAction in the stack that can be undone / redone. Pass `"undo"` or `"redo"` as the argument.

        undoManager.isAvailable("undo") // => true; You can undo actions

If you use undo- and redo-buttons in your gui this method is helpful for determining whether to display them in an enabled or disabled state.

#### merge              `undoManager.merge(otherManager1, [otherManager2, …])`

This is a feature for the advanced use of Backbone.Undo.js. Using the UndoTypes-API (see below) for specific instances of `Backbone.UndoManager` you can create undo managers with special behavior for special cases. But as having several undo managers side by side doesn't make any sense you need a way to combine them. That's what `merge` is for.

The method `merge` sets the stack-reference of other undo managers to its stack.

        var mainUndoManager = new Backbone.UndoManager,
        specialUndoManager = new Backbone.UndoManager;
        
        // Implementing special behavior
        specialUndoManager.addUndoType(…)
        
        // Making both write on one stack
        mainUndoManager.merge(specialUndoManager);
        
        mainUndoManager.stack === specialUndoManager.stack // => true

You can pass one or more undo managers or an array with one or more undo managers when calling this function.

#### addUndoType        `undoManager.addUndoType(type, fns)`

This adds an UndoType that only works for this specific undo manager and won't affect other instances of Backbone.UndoManager. See the UndoTypes-API for a more thorough documentation on this function.

#### changeUndoType     `undoManager.changeUndoType(type, fns)`

This changes an UndoType only on this specific undo manager and won't affect other instances of Backbone.UndoManager. See the UndoTypes-API for a more thorough documentation on this function.

#### removeUndoType     `undoManager.removeUndoType(type)`

This removes an UndoType only from this specific undo manager. See the UndoTypes-API for a more thorough documentation on this function.

#### clear              `undoManager.clear()`

This removes all actions from the stack of actions.

***

Methods you can call on the object `Backbone.UndoManager`:

#### defaults 		`Backbone.UndoManager.defaults(obj)`

Extend or overwrite the default values of an undo manager.

	Backbone.UndoManager.defaults({
		track: true
	});
	
	var undoManager = new Backbone.UndoManager; // tracking has now already started
	
#### addUndoType        `Backbone.UndoManager.addUndoType(type, fns)`

This adds an UndoType that works for all undo managers whether they've already been instantiated or not. See the UndoTypes-API for a more thorough documentation on this function.

#### changeUndoType     `Backbone.UndoManager.changeUndoType(type, fns)`

This changes an UndoType for all undo managers whether they've already been instantiated or not. See the UndoTypes-API for a more thorough documentation on this function.

#### removeUndoType     `Backbone.UndoManager.removeUndoType(type)`

This removes an UndoType from all undo managers whether they've already been instantiated or not. See the UndoTypes-API for a more thorough documentation on this function.


## Supported Events

Backbone.Undo.js uses Backbone's events to generate UndoActions. It has built-in support for the following events

*   `add` When a model is added to a collection
*   `remove` When a model is removed from a collection
*   `reset` When a collection is reset and all models are replaced by new models (or no models) at once
*   `change` When a model's attribute is changed or set

### Supporting other events and modifying built-in behavior

Backbone.Undo.js has an API to extend and modify the generation of UndoActions. In order to use the API it's important to understand the concept of creating UndoActions:

#### UndoTypes

Backbone.Undo.js retrieves the data of the undoable states from the events Backbone triggers and their arguments. However, different events have different arguments and thus need different approaches in retrieving the necessary data. Additionally, different types of actions require different behavior to undo and redo them.
That's what the *UndoTypes* are for. An *UndoType* is an object of functions for a specific type of event. The functions retrieve the data necessary to create an UndoAction and are able to undo an action of this type and redo it.

An *UndoType* needs to have the following functions:

*   **on**	`([…])`
    This function is called when the event this UndoType is made for was triggered on an observed object. It gets all the arguments that were triggered with the event. The `"on"`-function must return an object with the properties `object`, `before`, `after` and optionally `options`.

		return {
		    "object": … // The object the event was triggered on
		    "before": … // The object's state before the concerning action occured
		    "after": … // The object's current state, after the concerning action occured
		    "options": … // Optionally: Some 'options'-object
		}

*   **undo**	`(obj, before, after, options)`
    The `undo` function is called when the action this UndoType is made for should be undone. The data returned by the `"on"` function is passed to `"undo"` as arguments:
	*  `obj` is the model, collection or other kind of object that should be acted on
	*  `before` is the the data before the action occured and defines the state that should be created within this function
	*  `after` is the data after the action had occured and represents obj's current state
	*  `options` are the options the `on` function returned
*   **redo**	`(obj, before, after, options)`
    The `redo` function is called when the action this UndoType is made for should be redone. As with `"undo"` the data returned by the `"on"` function is passed to `"redo"` as arguments
	*  `obj` is the model, collection or other kind of object that should be acted on
	*  `before` is the the data before the action occured and represents the current state as the action was previously undone
	*  `after` is the data after the action had occured and is the state wich should be recreated
	*  `options` are the options the `"on"` function returned

It can have an optional property:

*   **condition**	`([…])`
    `"condition"` can be a function or a boolean value that defines whether an UndoAction should be created or not. If it's false or if it returns false `"on"` won't be called and no UndoAction is created. If it's not set, condition is always `true`.

##### UndoType example

This is an example of an UndoType for the `"reset"` event.

	{
	    "reset": {
	    	"condition": true, // This isn't necessary as condition is true by default
	    	"on": function (collection, options) {
	    		// The 'on'-method gets the same arguments a listener for the
	    		// Backbone 'reset'-event would get: collection.on("reset", listener)
	    		
	    		// The 'on'-method has to return an object with the properties
	    		// 'object', 'before', 'after' and optionally 'options'
	    		return {
	    		    object: collection,
	    		    before: options.previousModels,
	    		    after: _.clone(collection.models)
	    		}
	    	},
	    	"undo": function (collection, before, after) {
	    		// To restore the previous state we just reset the collection
	    		// with the previous models
	    		collection.reset(before);
	    	}
	    	"redo": function (collection, before, after) {
	    		// To restore the subsequent state we reset the collection to
	    		// the 'after'-array of models
	    		collection.reset(after);
	    	}
	    }
	}

#### UndoTypes API

To create your own UndoTypes for custom events or for extending the support of Backbone-events or if you just want to modify the built-in behavior, you can either do that on a global level to affect all current and future instances of Backbone.UndoManager or do that per instance to change only a specific undo manager.

Either way you have three methods to extend or change the UndoTypes. Below the functions for global changes are presented:

#### addUndoType

	Backbone.UndoManager.addUndoType(type, callbacks);
	// or
	Backbone.UndoManager.addUndoType(types);

With the `addUndoType()` method you can add or overwrite one or more UndoTypes. You can call it with the two arguments `type` and `callbacks` or with an object in which all keys are `type`s and their values `callbacks` to perform a bulk action.

* `type` The name of the event this UndoType is made for. In terms of Backbone events: `"add"`, `"remove"`, `"reset"`, `"change"`, etc.
* `callbacks` An object with the funcitions `"on"`, `"undo"`, `"redo"` and optionally `"condition"`
    
*Example*: If we want to overwrite the UndoType `"reset"` with the functions defined in the example above we can do the following:

    Backbone.UndoManager.addUndoType("reset", {
        "on": function (collection, options) {
            …
        },
        "undo": function (collection, before, after) {
            …
        },
        "redo": function (collection, before, after) {
            …
         }
    });
    
You can also define several UndoTypes at once by passing an object to `addUndoType`

	Backbone.UndoManager.addUndoType({
		"reset": {
		   "on": …
		   "undo": …
		   "redo": …
		},
		"add": {
		   "on": …
		   "undo": …
		   "redo": …
		},
		"customevent": {
		   "on": …
		   "undo": …
		   "redo": …
		}
	});

#### changeUndoType

	Backbone.UndoManager.changeUndoType(type, callbacks);
	// or
	Backbone.UndoManager.changeUndoType(types);

If you want to change just one or more functions of an already added or built-in UndoType `changeUndoType` is the way to go. It works just like `addUndoType` with the difference that there must already be an UndoType for the specified `type` and you don't have to pass all `callbacks` functions.

	Backbone.UndoManager.changeUndoType("reset", {
	    "condition": …
	})

Pass an object to perform a bulk action:

	Backbone.UndoManager.changeUndoType({
	    "reset": {
	        "condition": …
	    },
	    "add": {
	        "on": …
	        "undo": …
	    },
	    "customevent": {
	        "redo": …
	    }
	})

#### removeUndoType

	Backbone.UndoManager.removeUndoType(type);
	// or
	Backbone.UndoManager.removeUndoType(types);

Call `removeUndoType` to remove an existing UndoType. Pass the type of the UndoType you want to remove as the argument or pass an array of types if you want to remove several at once.

	Backbone.UndoManager.removeUndoType("reset");
	
Pass an array to perform a bulk action:

	Backbone.UndoManager.removeUndoType(["reset", "add", "customevent"]);
	
If you just want to suspend an UndoType for a limited amount of time, making use of the `"condition"` property might be more adequate:

	Backbone.UndoManager.changeUndoType("reset", {"condition": false});

#### Using the UndoTypes API per instance

As stated above you can also add, change and remove UndoTypes for a specific instance of Backbone.Undo without affecting other instances. The methods and arguments are exactly the same.

	var undoManager = new Backbone.UndoManager;
	
	undoManager.addUndoType("reset", {
	    "on": …
	    "undo": …
	    "redo": …
	})
	
	undoManager.changeUndoType("reset", {
	    "undo": …
	})
	
	undoManager.removeUndoType("reset");
	
Please note that removing an UndoType on a per instance level just causes a fallback to the global UndoTypes and won't take away the support for this type. You have to overwrite the type with an UndoType of empty functions to accomplish that.

Using the UndoTypes-API for a specific instance is especially useful if you have several undo managers.

	var undoA = new Backbone.UndoManager,
	undoB = new Backbone.UndoManager,
	undoC = new Backbone.UndoManager;
	
	undoA.addUndoType(…); // behavior A
	undoB.addUndoType(…); // behavior B
	undoC.addUndoType(…); // behavior C
	
However, several undo managers cause the problem that you don't know on which undo manager you should call `undo()` and `redo()`.
That's what the `merge()` function is for: It merges several undo managers by making them write on a single stack.

	var mainUndo = new Backbone.UndoManager;
	
	mainUndo.merge(undoA, undoB, undoC)
	
Now, you just need to call `undo()` and `redo()` on the main undo manager.

## License (MIT License)

Copyright (c) 2013 Oliver Sartun

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
