import { defineConfig, devices } from "@playwright/test";

/**
 * Parity suite: BytesNation Studio against pristine upstream, in every engine.
 *
 *   BN_BASE        BytesNation build (repo root)     default http://127.0.0.1:8180/
 *   UPSTREAM_BASE  upstream at engine-lock.json      default http://127.0.0.1:8181/
 *
 * Tests tagged @live connect a handful of real peers through the engine's
 * default signaling; everything else blocks signaling and runs offline.
 */
const bnPort = 8180;
const upstreamPort = 8181;

const chromiumMedia = {
	args: [
		"--use-fake-ui-for-media-stream",
		"--use-fake-device-for-media-stream",
		// Peers play each other's test tones; keep them off the host's speakers.
		"--mute-audio",
		"--autoplay-policy=no-user-gesture-required",
		"--auto-select-desktop-capture-source=Entire screen",
		"--enable-usermedia-screen-capturing"
	]
};

const firefoxMedia = {
	firefoxUserPrefs: {
		"media.navigator.streams.fake": true,
		"media.navigator.permission.disabled": true,
		"media.autoplay.default": 0,
		"media.getdisplaymedia.enabled": true,
		// Silence playback on the host machine; page state is unaffected.
		"media.volume_scale": "0.0"
	}
};

const config = defineConfig({
	testDir: "./tests",
	timeout: 120_000,
	expect: { timeout: 20_000 },
	fullyParallel: true,
	workers: process.env.CI ? 2 : 4,
	reporter: [["list"], ["json", { outputFile: "test-results/parity-results.json" }], ["html", { open: "never", outputFolder: "playwright-report" }]],
	use: {
		trace: "retain-on-failure",
		screenshot: "only-on-failure"
	},
	webServer: [
		{
			command: `node tests/support/serve-static.mjs ${bnPort} ..`,
			url: `http://127.0.0.1:${bnPort}/index.html`,
			reuseExistingServer: true
		},
		{
			command: `node tests/support/serve-upstream.mjs ${upstreamPort}`,
			url: `http://127.0.0.1:${upstreamPort}/index.html`,
			reuseExistingServer: true,
			timeout: 180_000
		}
	],
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: chromiumMedia, permissions: ["camera", "microphone"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"], launchOptions: firefoxMedia } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
		{ name: "mobile-chrome", use: { ...devices["Pixel 7"], launchOptions: chromiumMedia, permissions: ["camera", "microphone"] } },
		{ name: "mobile-safari", use: { ...devices["iPhone 14"] } }
	]
});

// Playwright requires a default export for its config file.
export default config;
