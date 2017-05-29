(function ($, _, Backbone) {
	var TagListView = Backbone.View.extend({
		template: _.template($("#template-demo-tags-tag").html()),
		initialize: function () {
			this.tagsContainer = this.$el.find(".demo-tags-container");
			this.tagsInput = this.$el.find(".demo-tags-input");
			this.render();

			this.collection.on("add remove", this.render, this);
		},
		render: function () {
			this.tagsContainer.empty().html(this.template({"list": this.collection.toJSON()}));
		},
		addTag: function () {
			var tags = this.tagsInput.val(), tagList = [];
			this.tagsInput.val("");

			_.each(tags.split(","), function (tag) {
				if (tag = $.trim(tag)) {
					tagList.push({"tag": tag});
				}
			})

			this.collection.add(tagList);
		},
		removeTag: function (e) {
			var tagText = $(e.target).next().html(),
			tagModel = this.collection.findWhere({"tag": tagText});
			this.collection.remove(tagModel);
		},
		checkForReturnkey: function (e) {
			if (e.keyCode === 13) {
				// The return key was pressed
				this.addTag();
			}
		},
		events: {
			"click .demo-tags-submit": "addTag",
			"click .demo-tags-delete": "removeTag",
			"keyup .demo-tags-input": "checkForReturnkey"
		}
	});

	var tagList = window.demoTagList = new Backbone.Collection([{"tag":"taglist"}]),
	tagListView = new TagListView({
		collection: tagList,
		el: $(".demo-container")
	});
})(window.jQuery, window._, window.Backbone);
