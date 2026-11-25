/*
 * BytesNation Studio: theme gate.
 * Copyright (c) 2026 BytesNation. Licensed under AGPL-3.0-only, as part of this fork; see LICENSE.
 *
 * Loaded after lib.js and before main.js, so the engine has already parsed the URL
 * (query, hash, invite codes and presets) into its global `urlParams`.
 *
 * Marks <html> with "bn-ui" when the page is interface, so bytesnation/theme.css applies.
 * Program output (view and scene links, clean output, OBS and Meld browser sources) gets
 * "bn-output" instead and keeps upstream's presentation exactly. On any doubt the page is
 * treated as output. Reads state only; changes nothing the engine owns.
 *
 * ES5 only: this is a boot script and must parse in Chromium 75.
 */
(function () {
	var root = document.documentElement;
	var params = null;

	function hasAny(names) {
		for (var i = 0; i < names.length; i++) {
			if (params.has(names[i])) {
				return true;
			}
		}
		return false;
	}

	try {
		if (typeof urlParams !== "undefined" && urlParams && typeof urlParams.has === "function") {
			params = urlParams;
		} else {
			params = new URLSearchParams(window.location.search);
		}

		var isStudioSoftware = !!window.obsstudio || navigator.userAgent.indexOf("Meld/") !== -1;
		var isClean = hasAny(["cleanoutput", "clean", "cleanish", "cleanviewer", "cv"]);
		var isScene = hasAny(["scene", "scn", "solo"]);
		var isSender = hasAny(["push", "id", "permaid", "director", "dir"]);
		var isViewer = hasAny(["streamid", "view", "v", "V", "pull"]) && !isSender;

		if (isStudioSoftware || isClean || isScene || isViewer) {
			root.classList.add("bn-output");
			return;
		}
		root.classList.add("bn-ui");
		if (params.has("podcast")) {
			root.classList.add("bn-podcast");
		}
	} catch (e) {
		root.classList.remove("bn-ui");
		root.classList.add("bn-output");
	}
})();
