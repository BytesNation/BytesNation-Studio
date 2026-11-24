import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { BrandMark } from "@/components/BrandMark";
import { productName, readSignalingState } from "@/lib/engine";
import { inlineStatusVariants } from "@/lib/motion";

const signalingPollMs = 2000;

/**
 * Brand lockup for the app bar, plus the signaling readout the engine used to
 * show by coloring the "V" of its logo (#qos). Offline is state, so it uses
 * the error color with a text label, never color alone.
 */
export const AppBarBrand = () => {
	const [signalingState, setSignalingState] = useState(readSignalingState());

	useEffect(() => {
		const timer = window.setInterval(() => setSignalingState(readSignalingState()), signalingPollMs);
		return () => window.clearInterval(timer);
	}, []);

	return (
		<div className="tw-flex tw-items-center tw-gap-3">
			<a href="./" className="tw-flex tw-items-center tw-gap-2 tw-text-text tw-no-underline" style={{ textDecoration: "none" }} aria-label={`${productName} home`}>
				<BrandMark />
				<span className="bn-wordmark tw-whitespace-nowrap tw-text-[14px] tw-font-semibold tw-tracking-tight tw-text-text">
					BytesNation <span className="tw-font-normal tw-text-muted">Studio</span>
				</span>
			</a>
			<AnimatePresence initial={false}>
				{signalingState === "offline" ? (
					<m.span
						key="signal"
						role="status"
						variants={inlineStatusVariants}
						initial="hidden"
						animate="visible"
						exit="exit"
						className="tw-inline-flex tw-items-center tw-gap-1.5 tw-whitespace-nowrap tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-[0.08em] tw-text-error"
					>
						<span aria-hidden="true" className="tw-inline-block tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-error" />
						Signaling offline
					</m.span>
				) : null}
			</AnimatePresence>
		</div>
	);
};
