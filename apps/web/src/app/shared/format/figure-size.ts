/** The classes of a figure, by how long it is: up to 10 characters, up to 14, and longer. */
export interface FigureSizes {
  readonly short: string;
  readonly medium: string;
  readonly long: string;
}

/**
 * The projection total (D-191): «169,40 €» at 48 px where the panel has room; the longest total of the app,
 * «≈ 1.243.127,08 MXN» (10 000 users), at 24 px in the narrow column of 1280 px and at 360 px.
 */
export const PROJECTION_FIGURE_SIZES: FigureSizes = {
  short: 'text-title-xl @min-[19rem]:text-display-xl',
  medium: 'text-title-lg @min-[19rem]:text-display',
  long: 'text-title-sm @min-[17rem]:text-title-lg @min-[22rem]:text-title-xl @min-[26rem]:text-display',
};

/** The figure of a dashboard metric (D-191): 32 px at most, never wider than its card. */
export const METRIC_FIGURE_SIZES: FigureSizes = {
  short: 'text-title-lg @min-[13rem]:text-title-xl',
  medium: 'text-title-lg @min-[17rem]:text-title-xl',
  long: 'text-title-sm @min-[16rem]:text-title-lg @min-[22rem]:text-title-xl',
};

/**
 * The size classes for a figure of that length (D-191). The digits are tabular, so the length says how wide the figure
 * is, and the container queries of each table say how much room its card has: together, a figure never wraps nor
 * overflows. The thresholds were measured in the browser with Montserrat 800 (about 0,58 em per character).
 */
export function figureSizeClass(text: string, sizes: FigureSizes): string {
  if (text.length <= 10) return sizes.short;
  if (text.length <= 14) return sizes.medium;
  return sizes.long;
}
