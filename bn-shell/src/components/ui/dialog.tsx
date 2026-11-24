import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Dialog (shadcn/ui pattern over Radix Dialog, MIT). */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef<ElementRef<typeof DialogPrimitive.Overlay>, ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay ref={ref} className={cn("tw-fixed tw-inset-0 tw-z-[10000] tw-bg-scrim", className)} {...props} />
));
DialogOverlay.displayName = "DialogOverlay";

export const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(({ className, children, ...props }, ref) => (
	<DialogPrimitive.Portal>
		<div className="bn-shell">
			<DialogOverlay />
			<DialogPrimitive.Content
				ref={ref}
				className={cn(
					"tw-fixed tw-left-1/2 tw-top-1/2 tw-z-[10001] tw-w-[calc(100vw-32px)] tw-max-w-[520px] -tw-translate-x-1/2 -tw-translate-y-1/2 tw-rounded-lg tw-border tw-border-solid tw-border-border tw-bg-surface tw-p-6 tw-text-text tw-shadow-panel",
					className
				)}
				{...props}
			>
				{children}
				<DialogPrimitive.Close className="tw-absolute tw-right-3 tw-top-3 tw-inline-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-sm tw-border-0 tw-bg-transparent tw-text-muted tw-cursor-pointer hover:tw-bg-surface-3 hover:tw-text-text" aria-label="Close">
					<X size={16} aria-hidden="true" />
				</DialogPrimitive.Close>
			</DialogPrimitive.Content>
		</div>
	</DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export const DialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => <div className={cn("tw-flex tw-flex-col tw-gap-1 tw-pr-8", className)} {...props} />;

export const DialogTitle = forwardRef<ElementRef<typeof DialogPrimitive.Title>, ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title ref={ref} className={cn("tw-m-0 tw-text-[20px] tw-font-semibold tw-tracking-tight tw-text-text", className)} {...props} />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<ElementRef<typeof DialogPrimitive.Description>, ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description ref={ref} className={cn("tw-m-0 tw-text-[13px] tw-text-muted", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";
