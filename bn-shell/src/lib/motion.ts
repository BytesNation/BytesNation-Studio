/**
 * Motion tokens for the shell (Motion, motion.dev). They mirror the CSS tokens
 * in tokens.css: one ease, three durations, tweens only. Nothing springs,
 * bounces or overshoots; movement is short and stops hard, like equipment.
 */
import type { Transition, Variants } from "motion/react";

/** Same curve as --bn-ease. */
export const bnEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const bnDuration = {
	fast: 0.12,
	base: 0.16,
	slow: 0.24
};

export const tweenFast: Transition = { type: "tween", duration: bnDuration.fast, ease: bnEase };
export const tweenBase: Transition = { type: "tween", duration: bnDuration.base, ease: bnEase };

/** A floating layer (dialog, palette): rises 8px into place, leaves faster than it arrives. */
export const layerVariants: Variants = {
	hidden: { opacity: 0, y: 8, scale: 0.985 },
	visible: { opacity: 1, y: 0, scale: 1, transition: tweenBase },
	exit: { opacity: 0, y: 4, scale: 0.99, transition: tweenFast }
};

/** The scrim behind a floating layer: opacity only. */
export const scrimVariants: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: tweenBase },
	exit: { opacity: 0, transition: tweenFast }
};

/** An inline status that appears beside other content (signaling, recording). */
export const inlineStatusVariants: Variants = {
	hidden: { opacity: 0, x: -6 },
	visible: { opacity: 1, x: 0, transition: tweenBase },
	exit: { opacity: 0, x: -6, transition: tweenFast }
};

/** An icon swapping for another in the same slot (theme switch). */
export const iconSwapVariants: Variants = {
	hidden: { opacity: 0, rotate: -40, scale: 0.8 },
	visible: { opacity: 1, rotate: 0, scale: 1, transition: tweenFast },
	exit: { opacity: 0, rotate: 40, scale: 0.8, transition: tweenFast }
};

/**
 * True when the visitor asked the OS for reduced motion. Used for motion that
 * runs outside React (the launcher tile stagger).
 * @returns {boolean}
 */
export const prefersReducedMotion = (): boolean => {
	return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
