/**
 * Launcher reveal: when the visitor opens "More options", the tools the engine
 * un-hides rise in with a short stagger (Motion's WAAPI animate and stagger).
 *
 * This is the one place the shell animates engine elements, under strict
 * limits: opacity and the `translate` property only (the engine's tile
 * lightbox animates width, height, top and left, so they cannot collide);
 * Web Animations fire no `animationend`, which lib.js listens for; and when
 * the animation ends each tile's inline styles are put back exactly as the
 * engine had them.
 */
import { stagger } from "motion";
import { animate } from "motion/mini";
import { isRendered } from "@/lib/engine";
import { bnDuration, bnEase, prefersReducedMotion } from "@/lib/motion";

const tileSelector = '#mainmenu div.column.card[id^="container-"]';
const staggerSeconds = 0.016;

const listTiles = (): HTMLElement[] => Array.prototype.slice.call(document.querySelectorAll(tileSelector));

const animatedProperties = ["opacity", "translate"];

const revealTiles = (tiles: HTMLElement[]): void => {
	if (tiles.length === 0) {
		return;
	}
	// Remember each tile's own inline values, so the engine's styles come back untouched.
	const inlineBefore = tiles.map(tile => animatedProperties.map(property => tile.style.getPropertyValue(property)));
	const controls = animate(tiles, { opacity: [0, 1], translate: ["0 6px", "0 0"] }, { duration: bnDuration.slow, ease: bnEase, delay: stagger(staggerSeconds) });
	controls.then(() => {
		tiles.forEach((tile, tileIndex) => {
			animatedProperties.forEach((property, propertyIndex) => {
				const previousValue = inlineBefore[tileIndex][propertyIndex];
				if (previousValue) {
					tile.style.setProperty(property, previousValue);
				} else {
					tile.style.removeProperty(property);
				}
			});
		});
	});
};

/**
 * Watches for the engine removing its "More options" button, then staggers in
 * the tiles that just appeared. Returns a function that stops watching.
 * @returns {() => void}
 */
export const watchLauncherReveal = (): (() => void) => {
	const menu = document.getElementById("mainmenu");
	if (!menu || !document.getElementById("dropButton") || prefersReducedMotion() || typeof menu.animate !== "function") {
		return () => undefined;
	}
	const visibleAtStart = new Set(listTiles().filter(tile => isRendered(tile)).map(tile => tile.id));
	const observer = new MutationObserver(mutations => {
		const wasMoreButtonRemoved = mutations.some(mutation => Array.prototype.some.call(mutation.removedNodes, (node: Node) => node instanceof HTMLElement && node.id === "dropButton"));
		if (!wasMoreButtonRemoved) {
			return;
		}
		observer.disconnect();
		revealTiles(listTiles().filter(tile => isRendered(tile) && !visibleAtStart.has(tile.id)));
	});
	observer.observe(menu, { childList: true });
	return () => observer.disconnect();
};
