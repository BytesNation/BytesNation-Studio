/*
 * BytesNation Studio boot (classic script, loaded in <head> before the engine).
 *
 * Kept deliberately small and ES5-only: it runs in every browser the engine
 * supports (Chrome 80 parse-safe) and must never block or break engine boot.
 *
 * 1. &classicui (or &bnclassic) disables the BytesNation layer entirely and
 *    leaves upstream's presentation untouched. Escape hatch for any custom CSS
 *    or workflow the redesign might disturb.
 * 2. A saved theme choice (localStorage "bn-color-mode") sets --color-mode
 *    before main.js reads it. Engine URL params (&darkmode, &lightmode,
 *    &whitemode) and OBS detection still take priority, as upstream.
 * 3. Mirrors the engine's body.darktheme onto html.bn-dark so theme tokens can
 *    switch at :root without shadowing the engine's inline overrides.
 * 4. Podcast Studio (&podcast) has a theme of its own, bn/podcast.css, loaded
 *    here on &podcast links only so no other page carries its weight.
 *
 * Copyright (C) 2026 BytesNation. AGPL-3.0-only; see LICENSE.
 */
(function () {
	"use strict";
	var root = document.documentElement;
	var search = window.location.search || "";
	var isClassic = /[?&](classicui|bnclassic)(=|&|$)/i.test(search);

	if (isClassic) {
		root.className += " bn-classic";
		var themeLink = document.getElementById("bn-theme");
		if (themeLink) {
			themeLink.disabled = true;
		}
		return;
	}

	root.className += " bn";

	// Same test as the inline script in index.html that loads Podcast Studio.
	if (/[?&]podcast(=|&|$)/.test(search)) {
		var podcastTheme = document.createElement("link");
		podcastTheme.id = "bn-podcast-theme";
		podcastTheme.rel = "stylesheet";
		podcastTheme.href = "./bn/podcast.css";
		document.head.appendChild(podcastTheme);
	}

	try {
		var savedMode = window.localStorage.getItem("bn-color-mode");
		if (savedMode === "light" || savedMode === "dark") {
			root.style.setProperty("--color-mode", savedMode);
		}
	} catch (storageError) {
		// Storage can be blocked (private mode, OBS sandbox); the default stays dark.
	}

	function syncDarkClass() {
		if (!document.body) {
			return;
		}
		// View mode resets body.className (main.js, &view), dropping "darktheme"
		// while session.darkmode stays true; follow the session when it says dark.
		var engineSession = window.session;
		var isSessionDark = Boolean(engineSession && engineSession.darkmode === true);
		var isDark = document.body.classList.contains("darktheme") || isSessionDark;
		if (isDark) {
			root.classList.add("bn-dark");
		} else {
			root.classList.remove("bn-dark");
		}
	}

	function watchBody() {
		syncDarkClass();
		if (typeof MutationObserver === "undefined") {
			return;
		}
		var observer = new MutationObserver(syncDarkClass);
		observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
	}

	if (document.body) {
		watchBody();
	} else {
		document.addEventListener("DOMContentLoaded", watchBody);
	}
})();
