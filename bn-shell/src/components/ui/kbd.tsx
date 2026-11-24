import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A key cap for shortcut hints, set in the mono face. */
export const Kbd = ({ children, className }: { children: ReactNode; className?: string }) => (
	<kbd
		className={cn(
			"tw-inline-flex tw-h-[18px] tw-min-w-[18px] tw-items-center tw-justify-center tw-rounded-[3px] tw-border tw-border-solid tw-border-border-strong tw-bg-surface tw-px-1 tw-font-mono tw-text-[11px] tw-font-medium tw-leading-none tw-text-muted",
			className
		)}
	>
		{children}
	</kbd>
);
