import { productName, sourceRepoUrl, upstreamRepoUrl } from "@/lib/engine";

/** The credit sentence the license requires, with a link to upstream. */
const CreditSentence = () => (
	<p className="tw-m-0">
		{productName} is built on{" "}
		<a href={upstreamRepoUrl} target="_blank" rel="noopener noreferrer">
			VDO.Ninja
		</a>{" "}
		by Steve Seguin (AGPL-3.0).
	</p>
);

const SourceLink = () => (
	<a href={sourceRepoUrl} target="_blank" rel="noopener noreferrer" className="tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-[0.08em]">
		Source code
	</a>
);

/**
 * Required visible credit (AGPL-3.0 attribution plus source offer), rendered
 * at the foot of the launcher.
 */
export const CreditFooter = () => (
	<footer className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border-0 tw-border-t tw-border-solid tw-border-border tw-pt-4 tw-text-[12px] tw-text-muted">
		<CreditSentence />
		<SourceLink />
	</footer>
);

/**
 * The same credit for Podcast Studio (&podcast), which hides the app bar and
 * the launcher footer. A slim bar on its own surface, so it reads in either
 * theme over Podcast Studio's dark page.
 */
export const PodcastCredit = () => (
	<footer className="bn-podcast-credit tw-text-[12px] tw-text-muted">
		<CreditSentence />
		<SourceLink />
	</footer>
);
