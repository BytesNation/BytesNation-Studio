/**
 * The BytesNation mark, as served in the bytesnation.com header (Nov 2026).
 * Strokes take the current text color; the node dot is the brand accent.
 */
export const BrandMark = ({ size = 22 }: { size?: number }) => (
	<svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false" style={{ display: "block", flex: "none" }}>
		<path d="M16 14 L16 50 M16 14 L47 32 M16 50 L47 32" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" fill="none" />
		<path d="M16 32 L31 32" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" opacity="0.55" />
		<circle cx="16" cy="14" r="6" fill="currentColor" />
		<circle cx="16" cy="50" r="6" fill="currentColor" />
		<circle cx="16" cy="32" r="3.4" fill="currentColor" />
		<circle cx="47" cy="32" r="8" fill="var(--bn-accent)" />
	</svg>
);
