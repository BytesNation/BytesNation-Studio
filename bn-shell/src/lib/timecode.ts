const padTwo = (value: number): string => (value < 10 ? `0${value}` : String(value));

/**
 * Formats elapsed seconds as a broadcast timecode, HH:MM:SS.
 * @param {number} totalSeconds
 * @returns {string}
 */
export const formatTimecode = (totalSeconds: number): string => {
	const safeSeconds = Math.max(0, Math.floor(totalSeconds));
	const hours = Math.floor(safeSeconds / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	return `${padTwo(hours)}:${padTwo(minutes)}:${padTwo(safeSeconds % 60)}`;
};
