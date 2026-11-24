import { useEffect, useState } from "react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { readRecordingCount } from "@/lib/engine";
import { inlineStatusVariants } from "@/lib/motion";
import { formatTimecode } from "@/lib/timecode";

const pollMs = 500;

/** Tally-lamp blink: full, then dim, with hard edges. No fade, no glow. */
const blinkAnimation = { opacity: [1, 1, 0.25, 0.25] };
const blinkTransition = { duration: 1.4, times: [0, 0.5, 0.5, 1], repeat: Infinity, ease: "linear" as const };

/**
 * REC readout for the app bar: the recording dot and a running timecode while
 * this page records any stream (own camera, screen share, or a guest the
 * director records). The count shows when more than one stream is recording.
 * The dot is one of the three places the accent fill is allowed.
 */
export const RecordingIndicator = () => {
	const [recordingCount, setRecordingCount] = useState(0);
	const [startedAt, setStartedAt] = useState(0);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const shouldReduceMotion = useReducedMotion();

	useEffect(() => {
		const timer = window.setInterval(() => {
			const count = readRecordingCount();
			setRecordingCount(count);
			setStartedAt(previous => (count > 0 ? previous || Date.now() : 0));
		}, pollMs);
		return () => window.clearInterval(timer);
	}, []);

	useEffect(() => {
		setElapsedSeconds(startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0);
	}, [startedAt, recordingCount]);

	useEffect(() => {
		if (!startedAt) {
			return undefined;
		}
		const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
		return () => window.clearInterval(timer);
	}, [startedAt]);

	return (
		<AnimatePresence initial={false}>
			{recordingCount > 0 ? (
				<m.span
					key="rec"
					role="status"
					aria-label={`Recording ${recordingCount} ${recordingCount === 1 ? "stream" : "streams"}`}
					variants={inlineStatusVariants}
					initial="hidden"
					animate="visible"
					exit="exit"
					className="bn-rec tw-inline-flex tw-items-center tw-gap-2 tw-whitespace-nowrap tw-px-1 tw-font-mono tw-text-[12px] tw-font-medium tw-text-text"
				>
					<m.span aria-hidden="true" className="tw-inline-block tw-h-2 tw-w-2 tw-flex-none tw-rounded-full tw-bg-accent" animate={shouldReduceMotion ? undefined : blinkAnimation} transition={blinkTransition} />
					<span className="tw-tracking-[0.08em]">REC{recordingCount > 1 ? ` ${recordingCount}` : ""}</span>
					<span className="bn-rec-time" style={{ fontVariantNumeric: "tabular-nums" }}>
						{formatTimecode(elapsedSeconds)}
					</span>
				</m.span>
			) : null}
		</AnimatePresence>
	);
};
