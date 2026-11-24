import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "ok" | "warn" | "error" | "neutral";

export interface StudioToastProps {
	/** Short source label, set in mono caps: SIGNAL, GUEST, CHAT, DIRECTOR, RECORDING. */
	kicker: string;
	message: string;
	tone?: ToastTone;
	action?: { label: string; onAction: () => void };
	onDismiss: () => void;
}

const toneDotClass: Record<ToastTone, string> = {
	ok: "tw-bg-ok",
	warn: "tw-bg-warn",
	error: "tw-bg-error",
	neutral: "tw-bg-muted"
};

/**
 * One notification card. Status color appears only as the small state dot
 * beside a text label; the card itself is a neutral raised surface.
 */
export const StudioToast = ({ kicker, message, tone = "neutral", action, onDismiss }: StudioToastProps) => (
	<div className="bn-shell bn-toast tw-flex tw-w-full tw-items-start tw-gap-3 tw-rounded-lg tw-border tw-border-solid tw-border-border tw-bg-surface-2 tw-p-3 tw-text-text tw-shadow-panel">
		<div className="tw-flex tw-min-w-0 tw-flex-1 tw-flex-col tw-gap-1">
			<span className="tw-flex tw-items-center tw-gap-2 tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-[0.08em] tw-text-muted">
				<span aria-hidden="true" className={cn("tw-inline-block tw-h-1.5 tw-w-1.5 tw-flex-none tw-rounded-full", toneDotClass[tone])} />
				{kicker}
			</span>
			<span className="tw-break-words tw-text-[13px] tw-leading-snug tw-text-text">{message}</span>
		</div>
		{action ? (
			<button
				type="button"
				className="tw-h-7 tw-flex-none tw-cursor-pointer tw-rounded-sm tw-border tw-border-solid tw-border-border tw-bg-surface tw-px-2 tw-font-sans tw-text-[12px] tw-font-medium tw-text-text hover:tw-border-border-strong hover:tw-bg-surface-3"
				onClick={() => {
					action.onAction();
					onDismiss();
				}}
			>
				{action.label}
			</button>
		) : null}
		<button
			type="button"
			aria-label="Dismiss notification"
			className="tw-inline-flex tw-h-7 tw-w-7 tw-flex-none tw-cursor-pointer tw-items-center tw-justify-center tw-rounded-sm tw-border-0 tw-bg-transparent tw-text-muted hover:tw-bg-surface-3 hover:tw-text-text"
			onClick={onDismiss}
		>
			<X size={14} aria-hidden="true" />
		</button>
	</div>
);
