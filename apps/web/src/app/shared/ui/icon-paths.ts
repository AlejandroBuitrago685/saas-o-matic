/**
 * The geometry of the icons of the interface (D-191): Lucide 1.65.0
 * (https://github.com/lucide-icons/lucide/tree/1.65.0/icons), ISC licence; `arrow-left`, `arrow-right`,
 * `chevron-down`, `chevron-right`, `plus`, `search` and `x` derive from Feather, MIT licence. Both notices ship
 * with the app in `public/lucide-license.txt`. Only the icons the interface uses are here.
 *
 * Each icon is a list of `d` attributes for a 24 × 24 box. The `<circle>`, `<rect>` and `<line>` of the originals are
 * written as the equivalent paths, so one template draws them all.
 */
export const ICON_PATHS = {
  'arrow-left': ['m12 19-7-7 7-7', 'M19 12H5'],
  'arrow-right': ['M5 12h14', 'm12 5 7 7-7 7'],
  building: [
    'M12 10h.01M12 14h.01M12 6h.01M16 10h.01M16 14h.01M16 6h.01M8 10h.01M8 14h.01M8 6h.01',
    'M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3',
    // <rect x="4" y="2" width="16" height="20" rx="2" />
    'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z',
  ],
  'chevron-down': ['m6 9 6 6 6-6'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'circle-alert': ['M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0', 'M12 8v4', 'M12 16h.01'],
  'circle-check': ['M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0', 'm16 9-5.5 5.5L8 12'],
  coins: [
    'M13.744 17.736a6 6 0 1 1-7.48-7.48',
    'M15 6h1v4',
    'm6.134 14.768.866-.5 2 3.464',
    'M10 8a6 6 0 1 0 12 0a6 6 0 1 0-12 0',
  ],
  'file-text': [
    'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z',
    'M14 2v5a1 1 0 0 0 1 1h5',
    'M10 9H8M16 13H8M16 17H8',
  ],
  layers: [
    'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z',
    'M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12',
    'M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17',
  ],
  plus: ['M5 12h14', 'M12 5v14'],
  search: ['m21 21-4.34-4.34', 'M3 11a8 8 0 1 0 16 0a8 8 0 1 0-16 0'],
  'triangle-alert': [
    'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
    'M12 9v4',
    'M12 17h.01',
  ],
  users: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M16 3.128a4 4 0 0 1 0 7.744',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
  ],
  x: ['M18 6 6 18', 'm6 6 12 12'],
} as const satisfies Readonly<Record<string, readonly string[]>>;

/** The icons the interface draws. Adding one means copying its paths from the same Lucide release. */
export type IconName = keyof typeof ICON_PATHS;
