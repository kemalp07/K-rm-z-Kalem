// The brief's palette, plus the in-between tones the lamp needs.
export const C = {
  deskDark: '#2a1a0f',
  deskMid: '#352113',
  deskLight: '#412917',
  paper: '#efe2c4',
  paperShade: '#d9c8a2',
  paperCheap: '#ddd3bd',
  paperBrown: '#9c7a4f',
  ink: '#2b2118',
  inkBlue: '#232a3d',
  inkFaded: '#4a3a2c',
  censor: '#a3241b',
  censorDark: '#6e1611',
  brass: '#a8843f',
  brassDark: '#6f5424',
  brassLight: '#d8b26a',
  lamp: '#ffd27a',
  flameCore: '#fff3c9',
  night: '#141c2a',
  nightDeep: '#0b1019',
  hiddenGlow: '#ff9a3c',
  black: '#000000',
} as const;

/** Stamp inks: each decision has its own pad. */
export const STAMP_INK = {
  delivered: '#2f4a32',
  held: '#8a6a22',
  stopped: C.censor,
  reported: '#3b3566',
} as const;
