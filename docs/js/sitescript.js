(function (win, $) {
	prettyPrint();

	var nav = $(document.getElementsByTagName("nav")[0]),
	navlist = $(".overview"), fullWidth = navlist.width(),
	currentWidth, threshold = 155 + $(".sleeve").width(),
	$win = $(win);
	$win.resize(function () {
		if ( (currentWidth = nav[0].clientWidth) <= fullWidth ) {
			navlist.width(currentWidth);
			if ( $win.width() <= threshold ) {
				nav.addClass("disappear")
			} else {
				nav.removeClass("disappear");
			}
		}
	}).resize();
})(window, window.jQuery);
