import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/cn";

/** Tooltip (shadcn/ui pattern over Radix Tooltip, MIT). */
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<ElementRef<typeof TooltipPrimitive.Content>, ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(({ className, sideOffset = 6, ...props }, ref) => (
	<TooltipPrimitive.Portal>
		<div className="bn-shell">
			<TooltipPrimitive.Content
				ref={ref}
				sideOffset={sideOffset}
				className={cn("tw-z-[10002] tw-rounded-sm tw-border tw-border-solid tw-border-border tw-bg-surface-2 tw-px-2 tw-py-1 tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-[0.08em] tw-text-text tw-shadow-panel", className)}
				{...props}
			/>
		</div>
	</TooltipPrimitive.Portal>
));
TooltipContent.displayName = "TooltipContent";
