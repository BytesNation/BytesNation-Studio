import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { applyColorMode, readColorMode, type ColorMode } from "@/lib/engine";

/** Dark/light switch. Follows engine state, so &lightmode and OBS defaults show correctly. */
export const ThemeToggle = () => {
	const [colorMode, setColorMode] = useState<ColorMode>(readColorMode());

	useEffect(() => {
		const observer = new MutationObserver(() => setColorMode(readColorMode()));
		observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
		return () => observer.disconnect();
	}, []);

	const nextMode: ColorMode = colorMode === "dark" ? "light" : "dark";
	const label = `Switch to ${nextMode} theme`;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="ghost" size="icon" aria-label={label} onClick={() => applyColorMode(nextMode)}>
					{colorMode === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
};
