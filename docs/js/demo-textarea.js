(function ($, _, Backbone) {
	var TextModel = Backbone.Model.extend({
		"text": ""
	}),
	TextView = Backbone.View.extend({
		r_whitespaceAtTheEnd: /[!?,\s\.]+$/gi,
		lastStore: 0,
		minDurationBetweenStores: 1500,
		initialize: function () {
			this.render();

			this.model.on("change", this.render, this);
		},
		render: function () {
			this.$el.val(this.model.get("text"));
		},
		checkForStore: function () {
			if ($.now() - this.lastStore > this.minDurationBetweenStores && this.r_whitespaceAtTheEnd.test(this.$el.val())) {
				this.store();
			}
		},
		store: function () {
			this.model.set("text", this.$el.val());
			this.lastStore = $.now();
		},
		events: {
			"keyup": "checkForStore",
			"blur": "store"
		}
	});

	var textmodel = window.demoTextarea = new TextModel;
	new TextView({
		model: textmodel,
		el: $("#demo-textarea")
	})
})(window.jQuery, window._, window.Backbone);
