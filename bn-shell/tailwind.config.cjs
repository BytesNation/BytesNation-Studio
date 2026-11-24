/**
 * Tailwind for the React shell only. prefix "tw-" because the engine already
 * owns class names like .hidden, .red, .float and .column; preflight is off so
 * Tailwind never resets engine-styled elements.
 */
module.exports = {
	content: ["./src/**/*.{ts,tsx}"],
	prefix: "tw-",
	corePlugins: { preflight: false },
	theme: {
		extend: {
			colors: {
				bg: "var(--bn-bg)",
				surface: "var(--bn-surface)",
				"surface-2": "var(--bn-surface-2)",
				"surface-3": "var(--bn-surface-3)",
				border: "var(--bn-border)",
				"border-strong": "var(--bn-border-strong)",
				text: "var(--bn-text)",
				muted: "var(--bn-text-muted)",
				faint: "var(--bn-text-faint)",
				accent: "var(--bn-accent)",
				"accent-ink": "var(--bn-accent-ink)",
				ok: "var(--bn-ok)",
				warn: "var(--bn-warn)",
				error: "var(--bn-error)",
				scrim: "var(--bn-scrim)"
			},
			fontFamily: {
				sans: ["var(--bn-font-sans)"],
				mono: ["var(--bn-font-mono)"]
			},
			borderRadius: {
				sm: "var(--bn-radius-sm)",
				DEFAULT: "var(--bn-radius)",
				lg: "var(--bn-radius-lg)"
			},
			boxShadow: {
				panel: "var(--bn-shadow)"
			}
		}
	}
};
