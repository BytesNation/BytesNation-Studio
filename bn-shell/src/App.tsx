import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LazyMotion, MotionConfig, domMin } from "motion/react";
import { AboutButton, AboutDialog } from "@/components/AboutDialog";
import { AppBarBrand } from "@/components/AppBarBrand";
import { CommandPalette } from "@/components/CommandPalette";
import { CommandTrigger } from "@/components/CommandTrigger";
import { CreditFooter, PodcastCredit } from "@/components/CreditFooter";
import { Notifications } from "@/components/Notifications";
import { RecordingIndicator } from "@/components/RecordingIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { ensurePodcastOverlaySlot, ensureSlot, isOperatorSurface, isPodcastStudio, productName } from "@/lib/engine";
import { watchLauncherReveal } from "@/lib/launcher-motion";
import { ShellStateProvider } from "@/lib/shell-state";

interface ShellSlots {
	brand: HTMLElement | null;
	tools: HTMLElement | null;
	footer: HTMLElement | null;
}

const findSlots = (): ShellSlots => ({
	brand: ensureSlot({ hostId: "header", slotId: "bn-brand", placement: "prepend" }),
	tools: ensureSlot({ hostId: "header", slotId: "bn-tools", placement: "append" }),
	footer: ensureSlot({ hostId: "mainmenu", slotId: "bn-footer", placement: "append" })
});

/**
 * The engine falls back to location.hostname for the page title on self-hosted
 * domains. Replace only that fallback, so &label and &headertitle still win.
 */
const applyProductTitle = (): void => {
	if (document.title === window.location.hostname || document.title === "" || document.title.indexOf("VDO.Ninja") === 0) {
		document.title = productName;
	}
};

/** Keeps slots attached: the engine can rebuild header children during boot. */
const useShellSlots = (): ShellSlots => {
	const [slots, setSlots] = useState<ShellSlots>(findSlots);
	useEffect(() => {
		applyProductTitle();
		const timer = window.setInterval(() => {
			applyProductTitle();
			const isDetached = !slots.brand || !document.body.contains(slots.brand) || !slots.tools || !document.body.contains(slots.tools);
			if (isDetached) {
				setSlots(findSlots());
			}
		}, 1500);
		return () => window.clearInterval(timer);
	}, [slots]);
	return slots;
};

/**
 * Mounts shell surfaces as portals into engine-owned hosts. Each slot inherits
 * its host's visibility, so when the engine hides the header or the launcher
 * (scenes, clean output, in-call views), the shell hides with it. The floating
 * layers (command palette, notifications) exist only on operator surfaces.
 * Podcast Studio hides those hosts, so it gets the credit in a bar of its own.
 */
export const App = () => {
	const slots = useShellSlots();
	const [isOperator] = useState(isOperatorSurface);
	const [podcastCreditSlot] = useState(() => (isPodcastStudio() ? ensurePodcastOverlaySlot("bn-podcast-credit") : null));

	useEffect(() => (isOperator ? watchLauncherReveal() : undefined), [isOperator]);

	return (
		<LazyMotion features={domMin} strict>
			<MotionConfig reducedMotion="user">
				<ShellStateProvider isOperator={isOperator}>
					<TooltipProvider delayDuration={300}>
						{slots.brand ? createPortal(<div className="bn-shell"><AppBarBrand /></div>, slots.brand) : null}
						{slots.tools
							? createPortal(
									<div className={cn("bn-shell tw-flex tw-items-center tw-gap-1", isOperator ? "bn-has-palette" : "")}>
										<RecordingIndicator />
										{isOperator ? <CommandTrigger /> : null}
										<ThemeToggle />
										<AboutButton />
									</div>,
									slots.tools
								)
							: null}
						{slots.footer ? createPortal(<div className="bn-shell"><CreditFooter /></div>, slots.footer) : null}
						{podcastCreditSlot ? createPortal(<div className="bn-shell"><PodcastCredit /></div>, podcastCreditSlot) : null}
						<AboutDialog />
						{isOperator ? <CommandPalette /> : null}
						{isOperator ? <Notifications /> : null}
					</TooltipProvider>
				</ShellStateProvider>
			</MotionConfig>
		</LazyMotion>
	);
};
