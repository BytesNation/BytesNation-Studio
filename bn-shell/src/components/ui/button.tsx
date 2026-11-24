import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * Button (shadcn/ui pattern, MIT). Variants follow the BN accent rule:
 * "primary" is the only accent fill and is reserved for the main call to action.
 */
const buttonVariants = cva(
	"tw-inline-flex tw-items-center tw-justify-center tw-gap-2 tw-whitespace-nowrap tw-rounded-sm tw-font-sans tw-text-[13px] tw-font-medium tw-transition-colors tw-cursor-pointer disabled:tw-pointer-events-none disabled:tw-opacity-50 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-text",
	{
		variants: {
			variant: {
				primary: "tw-bg-accent tw-text-accent-ink tw-border tw-border-solid tw-border-transparent hover:tw-brightness-95",
				secondary: "tw-bg-surface-2 tw-text-text tw-border tw-border-solid tw-border-border hover:tw-bg-surface-3 hover:tw-border-border-strong",
				ghost: "tw-bg-transparent tw-text-muted tw-border tw-border-solid tw-border-transparent hover:tw-bg-surface-3 hover:tw-text-text"
			},
			size: {
				sm: "tw-h-7 tw-px-2",
				md: "tw-h-8 tw-px-3",
				icon: "tw-h-8 tw-w-8 tw-p-0"
			}
		},
		defaultVariants: { variant: "secondary", size: "md" }
	}
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
	const Component = asChild ? Slot : "button";
	return <Component ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";
