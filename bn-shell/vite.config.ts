import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const shellDir = dirname(fileURLToPath(import.meta.url));

/**
 * Builds the BytesNation shell into ../bn/ with stable entry names so
 * index.html can reference them without a manifest:
 *   bn/theme.css  engine restyle (plain CSS, loaded in <head>)
 *   bn/shell.js   React shell (module, loaded at end of <body>)
 *   bn/shell.css  shell component styles (Tailwind), injected by shell.js
 *   bn/boot.js    copied verbatim from public/ (classic script, runs before the engine)
 */
// Vite requires a default export for its config file.
const config = defineConfig({
	plugins: [react()],
	resolve: {
		alias: { "@": resolve(shellDir, "src") }
	},
	base: "./",
	publicDir: "public",
	build: {
		outDir: resolve(shellDir, "../bn"),
		emptyOutDir: true,
		// Chromium 75 is the engine's parse floor; esbuild lowers ?. and ?? for it. The shell is isolated from engine boot either way.
		target: "chrome75",
		cssTarget: "chrome75",
		sourcemap: false,
		rollupOptions: {
			input: {
				shell: resolve(shellDir, "src/main.tsx"),
				theme: resolve(shellDir, "src/theme/index.css")
			},
			output: {
				entryFileNames: "[name].js",
				chunkFileNames: "chunks/[name]-[hash].js",
				assetFileNames: assetInfo => {
					const assetName = assetInfo.names && assetInfo.names[0] ? assetInfo.names[0] : "";
					if (assetName.endsWith(".css")) {
						return "[name].css";
					}
					return "assets/[name]-[hash][extname]";
				}
			}
		}
	}
});

export default config;
