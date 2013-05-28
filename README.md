Backbone.Undo.js
================

An extremely simple Undo-Manager for Backbone.js

### Advantages of Backbone.Undo.js

*   Easy to include and exclude

    In comparison to other Backbone-based undo-managers like *memento*, you don't have to modify your models 
    or collections to use Backbone.Undo.js. You can have your whole application already set up with all the 
    models and collections and then add the undo-manager. That makes it easy to not only include 
    Backbone.Undo.js, but also to remove it again if you don't longer want to use it at some point.
    
*   Uses Backbone-Events

    To detect an action, Backbone.Undo.js listens to the events Backbone triggeres automatically. You don't have 
    to do anything. You don't have to `store()` or `restore()` certain states. Nothing.

*   Memory-friendly

    Backbone.Undo.js only stores changes, instead of snapshots (clones of models/collections).

*   Optimized for Usability
   
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
    
    // You can setting up your objects here. Changes won't be tracked yet.
    model.set("foo", "bar");
    collection.add([{"something": "blue"}]);
    // These changes can't be undone.
    
    // 3. Start tracking the changes
    myUndoManager.startTracking(); // Everything that happens from now on, can be undone
    
## Undo or Redo Actions

To undo the last set of actions, just call `undo()`

    myUndoManager.undo();
    
To redo undone actions, call `redo()`

    myUndoManager.redo();

### Problems that may occur

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

## Backbone.Undo.js methods

Methods you can call on an instance of Backbone.Undo:

### Constructor

The constructor can be called with an optional argument. The argument is an object of attributes. So far only the 
attribute `maximumStackLength` is supported.

    var undoManager = new Backbone.Undo; // possible, because arguments are optional
    undoManager = new Backbone.Undo({
        maximumStackLength: 30
    });

The attribute `maximumStackLength` defines how many undo-actions should be in the undo-stack at the utmost, which means
how many actions are undoable. The default value is `Infinity` so there's  no limit at all.

### startTracking

Your undo-manager won't store any changes that happen to registered objects until you called startTracking:

    undoManager.startTracking()
