import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AboutDialog } from "@/components/AboutDialog";
import { AppBarBrand } from "@/components/AppBarBrand";
import { CreditFooter } from "@/components/CreditFooter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ensureSlot, productName } from "@/lib/engine";

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

/**
 * Mounts shell surfaces as portals into engine-owned hosts. Each slot inherits
 * its host's visibility, so when the engine hides the header or the launcher
 * (scenes, clean output, in-call views), the shell hides with it.
 */
export const App = () => {
	const [slots, setSlots] = useState<ShellSlots>(findSlots);

	useEffect(() => {
		applyProductTitle();
		// The engine can rebuild header children during boot; re-attach if a slot is lost.
		const timer = window.setInterval(() => {
			applyProductTitle();
			const isDetached = !slots.brand || !document.body.contains(slots.brand) || !slots.tools || !document.body.contains(slots.tools);
			if (isDetached) {
				setSlots(findSlots());
			}
		}, 1500);
		return () => window.clearInterval(timer);
	}, [slots]);

	return (
		<TooltipProvider delayDuration={300}>
			{slots.brand ? createPortal(<div className="bn-shell"><AppBarBrand /></div>, slots.brand) : null}
			{slots.tools
				? createPortal(
						<div className="bn-shell tw-flex tw-items-center tw-gap-1">
							<ThemeToggle />
							<AboutDialog />
						</div>,
						slots.tools
					)
				: null}
			{slots.footer ? createPortal(<div className="bn-shell"><CreditFooter /></div>, slots.footer) : null}
		</TooltipProvider>
	);
};
