/*
 * BytesNation Studio: theme parameter for pages outside the main app (Live Studio).
 * Copyright (c) 2026 BytesNation. Licensed under AGPL-3.0-only, as part of this fork; see LICENSE.
 *
 * Dark is the default. &lightmode (or &lighttheme, &whitemode, &whitetheme), the main app's own
 * parameters, switch the page to light. ES5 only: it runs in the page head.
 */
(function () {
	try {
		var query = window.location.search + "&" + window.location.hash.replace(/^#/, "");
		if (/[?&](lightmode|lighttheme|whitemode|whitetheme)(=|&|$)/i.test(query)) {
			document.documentElement.className += " bn-light";
		}
	} catch (e) {
		// On any doubt the page stays dark, the default.
	}
})();
