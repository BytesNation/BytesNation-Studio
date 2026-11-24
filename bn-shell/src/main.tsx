/*
 * BytesNation Studio shell entry (bn/shell.js, loaded as a module after the
 * engine scripts). Progressive enhancement: if anything here fails, the engine
 * and the theme keep working on their own.
 *
 * Copyright (C) 2026 BytesNation. AGPL-3.0-only; see LICENSE.
 */
import { createRoot } from "react-dom/client";
import shellStyles from "./shell.css?inline";
import { App } from "./App";
import { isStudioOutput } from "./lib/engine";

const shellRootId = "bn-shell-root";

/**
 * The shell only mounts where it adds value and the browser can run it: not
 * in OBS or other studio outputs, not with &classicui.
 * @returns {boolean}
 */
const shouldMount = (): boolean => {
	if (document.documentElement.classList.contains("bn-classic")) {
		return false;
	}
	if (isStudioOutput()) {
		return false;
	}
	return typeof window.MutationObserver !== "undefined" && typeof window.CSS !== "undefined";
};

const injectStyles = (): void => {
	const styleElement = document.createElement("style");
	styleElement.id = "bn-shell-styles";
	styleElement.textContent = shellStyles;
	document.head.appendChild(styleElement);
};

const mountShell = (): void => {
	if (!shouldMount() || document.getElementById(shellRootId)) {
		return;
	}
	try {
		injectStyles();
		const rootElement = document.createElement("div");
		rootElement.id = shellRootId;
		document.body.appendChild(rootElement);
		createRoot(rootElement).render(<App />);
	} catch (mountError) {
		const errorType = mountError instanceof Error ? mountError.name : typeof mountError;
		const stackTrace = mountError instanceof Error ? mountError.stack : "";
		console.error(`[bn-shell] ${new Date().toISOString()} mount failed (${errorType}); engine unaffected`, stackTrace);
	}
};

// The engine finishes boot on window load; the header and launcher exist by then.
if (document.readyState === "complete") {
	mountShell();
} else {
	window.addEventListener("load", mountShell);
}
