Backbone.Undo.js
================

An extremely simple Undo-Manager for Backbone.js

#### Advantages of Backbone.Undo.js

*   **Easy to include and exclude**

    In comparison to other Backbone-based undo-managers like *memento*, you don't have to modify your models 
    or collections to use Backbone.Undo.js. You can have your whole application already set up with all the 
    models and collections you need and then add the undo-manager. That makes it easy to not only include 
    Backbone.Undo.js, but also to remove it again if you don't longer want to use it at some point.
    
*   **Uses Backbone-Events**

    To detect an action, Backbone.Undo.js listens to the events Backbone triggeres automatically. You don't have 
    to do anything. You don't have to `store()` or `restore()` certain states. Nothing.

*   **Only what's necessary**

    Backbone.Undo.js only stores the changes, instead of taking snapshots of the models' / collections' current state.

*   **Optimized for Usability**
   
    In a sophisticated webapp one click of the user might trigger several Backbone-Events which are stored as 
    several Undo-Actions within the Undo-Stack. If the user then calls `undo()` it shouldn't just undo the latest 
    action, it should undo all the actions which were triggered by the user's click. Backbone.Undo.js does just that
    because it has a built-in mechanism that figures out which actions belong together and then undoes/redoes all 
    of them.
 
## Getting started

Like with all the other JavaScript-Libraries you only need to include Backbone.Undo.js into your webpage or webapp 
to make it available.
As Backbone.Undo.js depends on Backbone you need Backbone, which again depends on underscore.js (or lowdash.js) and 
jQuery (or zepto). Make sure to include all these files before Backbone.Undo.js as it relies on these libraries:
  
    <script src="jquery.js"></script>
    <script src="underscore.js"></script>
    <script src="backbone.js"></script>
    <!-- Backbone.Undo.js is included *after* those other libs -->
    <script src="Backbone.Undo.js"></script>


### Backbone Version

Backbone.Undo.js was developed for Backbone 1.0.0 or higher.

### Underscore Version

Backbone.Undo.js was developed for Underscore 1.4.4 or higher.

## Setting up your UndoManager

In order to set up you UndoManager you have to do the following steps:

    // 1. Instantiate your UndoManager
    var myUndoManager = new Backbone.UndoManager();
      
    // 2. Register the models and collections you want to observe
    var model = new Backbone.Model,
    collection = new Backbone.Collection;
    myUndoManager.register(model, collection); // You can pass several objects as arguments
    
    // You can set up your objects here. Changes won't be tracked yet.
    model.set("foo", "bar");
    collection.add([{"something": "blue"}]);
    // These changes can't be undone.
    
    // 3. Start tracking the changes
    myUndoManager.startTracking(); // Everything that happens from now on, can be undone

## Backbone.Undo.js methods

Methods you can call on an instance of Backbone.Undo:

#### Constructor 	`new Backbone.Undo([object]);`

The constructor can be called with an optional argument. The argument is an object of attributes. So far only the 
attribute `maximumStackLength` is supported.

    var undoManager = new Backbone.Undo; // possible, because arguments are optional
    var undoManager = new Backbone.Undo({
        maximumStackLength: 30
    });

The attribute `maximumStackLength` defines how many undo-actions should be in the undo-stack at the utmost, which means
how many actions are undoable. The default value is `Infinity` so there's  no limit at all.

#### register		`undoManager.register(obj, [obj, ...]);`

Your undo-instance must know the object on which actions should be undone/redone. Therefore you have to register these
objects:

    var model = new Backbone.Model;
    var collection = new Backbone.Collection;
    undoManager.register(model, collection);

The register-method doesn't check whether the object is an instance of Backbone.Model or Backbone.Collection. That makes
it possible to bind other objects which don't derive from Backbone constructors and yet have `on()` and `off()` methods
and trigger an `"all"` event.

#### unregister		`undoManager.unregister(obj, [obj, ...]);`

Previously registered objects can be unregistered using the `unregister()` method. Changes to those objects can't be
undone after they have been unregsitered.

    var myModel = new Backbone.Model;
    undoManager.register(myModel);
    undoManager.startTracking();
    myModel.set("foo", "bar"); // Can be undone
    undoManager.unregister(myModel);
    myModel.set("foo", "baz"); // Can't be undone

#### startTracking 	`undoManager.startTracking();`

Your undo-manager won't store any changes that happen to registered objects until you called `startTracking()`.

    var myModel = new Backbone.Model;
    undoManager.register(myModel);
    myModel.set("foo", "bar"); // Can't be undone because tracking changes didn't start yet
    undoManager.startTracking();
    myModel.set("foo", "baz"); // Can be undone

#### stopTracking	`undoManager.stopTracking();`
    
If you want to stop tracking changes for whatever reason, you can do that by calling `stopTracking()`

    myModel.set("foo", 1);
    undoManager.startTracking();
    myModel.set("foo", 2);
    undoManager.stopTracking();
    myModel.set("foo", 3);
    undoManager.undo(); // "foo" is 1 instead of 2, because the last change wasn't tracked
    // btw: You shouldn't call `undo` within your code. See 'Problems that may occur'

#### undo		`undoManager.undo();`
    
The method to undo the last set of actions is `undo()`. It undoes all actions that happened within one call cycle. That's
why you shouldn't and can't call `undo()` within your code to undo actions. See 'Problems that may occur' for more 
information.

#### redo		`undoManager.redo();`
    
The method to redo an undone set of actions is `redo()`. Like `undo()` it redoes all actions that happened within 
one call cycle. See 'Problems that may occur' for more information.

## Supported Events

Backbone.Undo.js uses Backbone-Events to generate the undo-actions. It has built-in support for the following events

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
