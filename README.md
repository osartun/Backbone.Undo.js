Backbone.Undo.js
================

An extremely simple Undo-Manager for Backbone.js

## Is this the right Undo-Manager for me?

Backbone.Undo.js is very simple to handle. It's made to *just work*. However this simplicity can also have downsides as it might not be suitable for a very complex application.

### Advantages of Backbone.Undo.js

*   Easy to include *and exclude*

    In comparison to other Backbone-based undo-managers like *Backbone.memento*, you don't have to modify your models or collections to use Backbone.Undo.js. That not only makes it easy to include Backbone.Undo.js, but also to remove it.
    
*   Uses Backbone-Events

    To detect an action, Backbone.Undo.js listens to the events Backbone triggeres automatically. You don't have to do anything. You don't have to `store()` or `restore()` certain states. Nothing.

*   Memory-friendly

    Backbone.Undo.js only stores the changes, instead of snapshots (clones of models/collections).

*   Detects connected actions
   
    In a sophisticated webapp one click of the user might trigger several Backbone-Events which are stored as several Undo-Actions within the Undo-Stack. If the user then calls `undo()` it shouldn't just undo the latest action, it should undo all the actions which were triggered by the user's click. Backbone.Undo.js has a way to figure out which actions belong together and then undoes/redoes all of them.

*   Made for the user

    If you're using a shortcut-library you can bind shortcuts which call `undo()` or `redo()` to undo/redo an action.
    
## Getting started

Like with all the other JavaScript-Libraries you only need to include Backbone.Undo.js into your webpage or webapp to make it available.
As Backbone.Undo.js depends on Backbone you need Backbone, which again depends on underscore.js (or lowdash.js) and jQuery (or zepto). Make sure to include all these files before Backbone.Undo.js as it relies on these libraries:
  
    <script src="jquery.js"></script>
    <script src="underscore.js"></script>
    <script src="backbone.js"></script>
    <!-- Backbone.Undo.js is included *after* those other libs -->
    <script src="Backbone.Undo.js"></script>


### Backbone Version

Backbone.Undo.js was developed for Backbone 1.0.0 or higher.

### Underscore Version

Backbone.Undo.js was developed for Underscore 1.4.4 or higher.

## Integrating the UndoManager into your webpage / webapp

# Setting up your UndoManager

In order to set up you UndoManager you have to do the following steps:

    // 1. Instantiate your UndoManager
    var myUndoManager = new Backbone.UndoManager({
      maximumStackLength: 100 // maximumStackLength determines how many actions
      // are stored to be undone. Default is Infinity aka no limit at all. This
      // attribute is optional. You don't need to pass anything to the constructor.
      });
      
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
    
`startTracking()` is not part of the register function, to initialize

### Problems that might occur

Backbone.Undo.js is not made to be called within your code. It has an internal mechanism which figures out which Undo-Actions were generated in the same call cycle. 
This mechanism is great for usability (see Advantages). However this mechanism makes it impossible to call `undo()` or `redo()` within a codeblock. Imagine this:
    
    var UndoManager = new Backbone.Undo;
    var model = new Backbone.Model({"foo":1});
    UndoManager.register(model);
    UndoManager.startTracking();
    model.set("foo", 2);
    model.set("foo", 3);
    UndoManager.undo();
    model.get("foo"); // Is 1 instead of 2
