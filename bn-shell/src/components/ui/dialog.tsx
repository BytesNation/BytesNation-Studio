import { createContext, forwardRef, useContext, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { cn } from "@/lib/cn";
import { layerVariants, scrimVariants } from "@/lib/motion";

/**
 * Dialog (shadcn/ui pattern over Radix Dialog, MIT) with Motion presence:
 * the scrim fades and the panel rises 8px into place, then both leave faster
 * than they arrived. Controlled only, so AnimatePresence can hold the panel
 * mounted until its exit finishes.
 */
const DialogOpenContext = createContext(false);

interface DialogProps {
	open: boolean;
	onOpenChange: (isOpen: boolean) => void;
	children: ReactNode;
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => (
	<DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
		<DialogOpenContext.Provider value={open}>{children}</DialogOpenContext.Provider>
	</DialogPrimitive.Root>
);

interface DialogContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
	/** "top" anchors the panel near the top of the window (command palette). */
	placement?: "center" | "top";
	showClose?: boolean;
	/** Runs after the exit animation, once the panel and its focus trap are gone. */
	onExitComplete?: () => void;
}

export const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(({ className, children, placement = "center", showClose = true, onExitComplete, ...props }, ref) => {
	const isOpen = useContext(DialogOpenContext);
	return (
		<AnimatePresence onExitComplete={onExitComplete}>
			{isOpen ? (
				<DialogPrimitive.Portal forceMount>
					<div className="bn-shell">
						<DialogPrimitive.Overlay asChild forceMount>
							<m.div className="tw-fixed tw-inset-0 tw-z-[10000] tw-bg-scrim" variants={scrimVariants} initial="hidden" animate="visible" exit="exit" />
						</DialogPrimitive.Overlay>
						{/* The flex frame centers the panel, so Motion owns the panel's transform. */}
						<div className={cn("tw-pointer-events-none tw-fixed tw-inset-0 tw-z-[10001] tw-flex tw-justify-center tw-px-4", placement === "top" ? "tw-items-start tw-pt-[12vh] max-sm:tw-px-2 max-sm:tw-pt-2" : "tw-items-center")}>
							<DialogPrimitive.Content ref={ref} asChild forceMount {...props}>
								<m.div
									className={cn("tw-pointer-events-auto tw-relative tw-w-full tw-max-w-[520px] tw-rounded-lg tw-border tw-border-solid tw-border-border tw-bg-surface tw-p-6 tw-text-text tw-shadow-panel", className)}
									variants={layerVariants}
									initial="hidden"
									animate="visible"
									exit="exit"
								>
									{children}
									{showClose ? (
										<DialogPrimitive.Close className="tw-absolute tw-right-3 tw-top-3 tw-inline-flex tw-h-8 tw-w-8 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded-sm tw-border-0 tw-bg-transparent tw-text-muted hover:tw-bg-surface-3 hover:tw-text-text" aria-label="Close">
											<X size={16} aria-hidden="true" />
										</DialogPrimitive.Close>
									) : null}
								</m.div>
							</DialogPrimitive.Content>
						</div>
					</div>
				</DialogPrimitive.Portal>
			) : null}
		</AnimatePresence>
	);
});
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
