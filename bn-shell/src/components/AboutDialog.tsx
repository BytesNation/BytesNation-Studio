import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getEngineVersion, licenseUrl, productName, sourceRepoUrl, upstreamRepoUrl } from "@/lib/engine";

const ExternalLink = ({ href, children }: { href: string; children: string }) => (
	<a href={href} target="_blank" rel="noopener noreferrer" className="tw-text-text tw-underline tw-decoration-border-strong tw-underline-offset-[3px] hover:tw-decoration-text">
		{children}
	</a>
);

/**
 * About view: product identity, the AGPL-3.0 credit to the upstream engine,
 * and the source link AGPL section 13 requires for network users.
 */
export const AboutDialog = () => {
	const engineVersion = getEngineVersion();
	return (
		<Dialog>
			<Tooltip>
				<TooltipTrigger asChild>
					<DialogTrigger asChild>
						<Button variant="ghost" size="icon" aria-label={`About ${productName}`}>
							<Info size={16} aria-hidden="true" />
						</Button>
					</DialogTrigger>
				</TooltipTrigger>
				<TooltipContent>About</TooltipContent>
			</Tooltip>
			<DialogContent>
				<DialogHeader>
					<span className="tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-[0.08em] tw-text-muted">About</span>
					<DialogTitle>{productName}</DialogTitle>
					<DialogDescription>Browser-based live video production: rooms, guests, scenes and OBS sources.</DialogDescription>
				</DialogHeader>
				<div className="tw-mt-5 tw-flex tw-flex-col tw-gap-4 tw-text-[14px] tw-leading-relaxed tw-text-text">
					<p className="tw-m-0">
						{productName} is built on <ExternalLink href={upstreamRepoUrl}>VDO.Ninja</ExternalLink> by Steve Seguin (AGPL-3.0).
					</p>
					<dl className="tw-m-0 tw-grid tw-grid-cols-[120px_1fr] tw-gap-x-4 tw-gap-y-2 tw-border-0 tw-border-t tw-border-solid tw-border-border tw-pt-4 tw-text-[13px]">
						<dt className="tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-[0.08em] tw-text-muted">Source</dt>
						<dd className="tw-m-0">
							<ExternalLink href={sourceRepoUrl}>BytesNation/BytesNation-Studio</ExternalLink>
						</dd>
						<dt className="tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-[0.08em] tw-text-muted">Upstream</dt>
						<dd className="tw-m-0">
							<ExternalLink href={upstreamRepoUrl}>steveseguin/vdo.ninja</ExternalLink>
						</dd>
						<dt className="tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-[0.08em] tw-text-muted">License</dt>
						<dd className="tw-m-0">
							<ExternalLink href={licenseUrl}>GNU AGPL-3.0</ExternalLink>
						</dd>
						<dt className="tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-[0.08em] tw-text-muted">Engine</dt>
						<dd className="tw-m-0 tw-font-mono tw-text-[13px]">{engineVersion ? `VDO.Ninja ${engineVersion}` : "VDO.Ninja"}</dd>
					</dl>
				</div>
			</DialogContent>
		</Dialog>
	);
};
