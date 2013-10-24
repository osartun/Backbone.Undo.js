Backbone.Undo.js
================

An extremely simple undo manager for Backbone.js

#### Advantages of Backbone.Undo.js

* 	**The Drop-In Manager**

	In comparison to undo managers that implement the memento pattern you don't have to modify your models and collections to use Backbone.Undo.js. Just drop in Backbone.Undo.js and register the objects whose actions you want to undo. That way it's not only easy to include Backbone.Undo.js, but also to exclude it in case you don't want to use it any longer at some point.

*	**Ready To Go: Based on Backbone-Events**

	You don't have to manually call methods to `store()` or `restore()` certain states. To detect an undoable action, Backbone.Undo.js listens to the events Backbone triggeres automatically. You don't have to do anything.

* 	**Magic Condensation**

	In a more complex web application the click of a button might trigger several changes which dispatch several events which in Backbone.Undo.js are turned into several undoable actions. If the user wants to undo what he caused with his click he wants to undo all of those actions. Backbone.Undo.js has an internal feature called *Magic Condensation* that detects actions that were created in one flow and undoes or redoes all of them.

#### Who should use Backbone.Undo.js

Backbone.Undo.js is a simple undo manager that should be used by rather simple web applications. It has mechanisms that makes it extensible and suitable for more complex applications. However, it might not be adequate for very large-scale applications with tens of thousands of lines of code.

## Getting started

Backbone.Undo.js depends on Backbone.js which depends on underscore.js (or lowdash.js). Make sure to include those two files before Backbone.Undo.js:

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

Methods you can call on an instance of Backbone.Undo:

#### Constructor 	`new Backbone.Undo([object])`

The constructor can be called with an object of attributes as an optional argument. Each attribute is optional and has a default value.

    var undoManager = new Backbone.Undo; // possible, because the argument is optional
    var undoManager = new Backbone.Undo({
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

#### unregister		`undoManager.unregister(obj, [obj, ...])`

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

Pass `true` to activate *Magic Condensation*. That way you undo the complete last set of actions that happened at once.

#### redo		`undoManager.redo([magic])`
    
The method to redo the latest undone action is `redo()`.

        myModel.set("foo", 2);
        
        undoManager.undo();
        myModel.get("foo"); // => 1
        
        undoManager.redo();
        myModel.get("foo"); // => 2

Like with `undo()` you can pass `true` to activate *Magic Condensation* and to redo the complete last set of actions that were undone.

#### isAvailable        `undoManager.isAvailable(type)`

This method checks if there's an UndoAction in the stack that can be undone / redone. Pass `"undo"` or `"redo"` as the argument.

        undoManager.isAvailable("undo") // => true; You can undo actions

If you use undo- and redo-buttons in your gui this method is helpful for determining whether to display them in an enabled or disabled state.

#### merge              `undoManager.merge(otherManager1, [otherManager2, …])`

This is a feature for the advanced use of Backbone.Undo.js. Using the [UndoTypes-API][supporting-other-events] for specific instances of Backbone.UndoManager you can create undo managers with special behavior for special cases. But as having several undo managers side by side doesn't make any sense you need a way to combine them. That's what merge is for.

The method `merge` sets the stack-reference of other undo managers to its stack.

        var mainUndoManager = new Backbone.UndoManager,
        specialUndoManager = new Backbone.UndoManager;
        
        mainUndoManager.merge(specialUndoManager);
        
        mainUndoManager.stack === specialUndoManager.stack // => true

You can pass one or more undo managers or an array with one or more undo managers when calling this function.

#### addUndoType        `undoManager.addUndoType(type, fns)`

This adds an UndoType that only works for this specific undo manager and won't affect other instances of Backbone.UndoManager. See the UndoTypes-API for a more thorough documentation on this function.

#### changeUndoType     `undoManager.changeUndoType(type, fns)`

This changes an UndoType only on this specific undo manager and won't affect other instances of Backbone.UndoManager. See the UndoTypes-API for a more thorough documentation on this function.

#### removeUndoType     `undoManager.removeUndoType(type)`

This removes an UndoType only from from this specific undo manager. See the UndoTypes-API for a more thorough documentation on this function.

## Supported Events

Backbone.Undo.js uses Backbone's events to generate UndoActions. It has built-in support for the following events

*   `add` When a model is added to a collection
*   `remove` When a model is removed from a collection
*   `reset` When a collection is reset and all models are replaced by new models (or no models) at once
*   `change` When an attribute of a model was changed

### Supporting other events

If you want to generate undo-actions when custom or other Backbone-events are triggered, you can do so by extending
Backbone.Undo. Use the static method `Backbone.Undo.addUndoType()`:

#### addUndoType

	Backbone.Undo.addUndoType(type, callbacks);
	// or
	Backbone.Undo.addUndoType(types);

An undo-type generates the data of an undo-action for a specific event and has an undo and redo method which know 
how to undo and redo the action. With the `addUndoType()` method you can add or overwrite one or more of these undo-types.
To understand how this works you have to know the structure of an undo-type:

*   `type` is the name of the event the undo-type is made for. For example `"add"`, `"change"` or `"reset"`.
*   `on` is the function that generates the data necessary to undo or redo the action. It returns an object with the keys 
    `"object"`, `"before"` and `"after"`
*   `undo` is the function which executes the actual undoing. It gets `object`, `before` and `after` the values `on` had
    returned as arguments as well as a copy of the whole object `on` returned in case it needs more data.
*   `redo` is the function which executes the actual redoing. As `undo` it gets `object`, `before`, `after` and a copy of
    the object `on` returned as arguments.
    
An example. If we want to add the undo-type `"reset"` (which is already built-in) we can do the following:

    Backbone.Undo.addUndoType("reset", {
        "on": function (collection, options) {
            // The "on" method gets the arguments the type (here: "reset") 
            // would get if it was bound to the object
            return {
                object: collection,
                before: options.previousModels,
                after: _.clone(collection.models) // We use a copy of the current state instead of storing a reference
            }
        },
        "undo": function (collection, before, after) {
            // Reset the collection with the previous models 
            collection.reset(before);
        },
        "redo": function (collection, before, after) {
            collection.reset(after);
         }
    });
    
You can also define several undo-types by passing an object to `addUndoType`

	Backbone.Undo.addUndoType({
		"reset": {...},
		"add": {...},
		"customevent": {...}
	});

## Problems that may occur

Backbone.Undo.js is not made to be called within your code. It has an internal mechanism which figures out 
which Undo-Actions were generated in the same call cycle. 
This mechanism is great for usability (see above, *Advantages of Backbone.Undo.js*). However this mechanism 
makes it impossible to call `undo()` or `redo()` within a codeblock. Imagine this:
    
    model.get("foo"); // "bar"
    
    // Several changes:
    model.set("foo", "baz");
    model.set("foo", "qux");
    model.set("foo", 42);
    model.set("foo", {})
    
    // One call to `undo`:
    myUndoManager.undo();
    model.get("foo"); // Is "bar" instead of 42
    
Calling `undo()` resets `"foo"` to `"bar"` instead of `42`, because it had figured out that the four `set`s happened in 
one call cycle.
If you want to call `undo()` within your code and each time only want to undo the latest change you have to call the 
changes to the model asynchronously.

    model.get("foo");
    
    // Several changes:
    _.defer(function () {
        model.set("foo", "baz");
        
        _.defer(function () {
            model.set("foo", "qux");
            
            _.defer(function () {
                model.set("foo", 42);
                
                _.defer(function () {
                    model.set("foo", {});
                    
                    myUndoManager.undo();
                    model.get("foo") // 42
                    
                    myUndoManager.undo();
                    model.get("foo") // "qux"
                    
                    myUndoManager.undo();
                    model.get("foo") // "baz"
                    
                    myUndoManager.undo();
                    model.get("foo") // "bar"
                })
            })
        })
    })
    
Obviously noone would ever do that. In fact you also shouldn't do that: Your webapp shouldn't have any reference to the 
undo-manager within your code. Try to develop it independently from the undo-manager and then add an 
undo-manager-controller which for example binds the undo/redo-calls to Shortcuts like ctrl+Z.

## License (MIT License)

Copyright (c) 2013 Oliver Sartun

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
