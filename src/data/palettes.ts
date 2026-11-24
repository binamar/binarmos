import { EqPresetId, PaletteId, PaletteTheme } from '../types/visualizer';

export const PALETTES: Record<PaletteId, PaletteTheme> = {
  'amber-teal': {
    id: 'amber-teal',
    primary: '#ffb547',
    secondary: '#1b9aa6',
    tertiary: '#e0861a',
    bgTintDark: '#0b1222',
    bgTintLight: '#eef2f7',
  },
  solaris: {
    id: 'solaris',
    primary: '#f97316',
    secondary: '#eab308',
    tertiary: '#ef4444',
    bgTintDark: '#160d0a',
    bgTintLight: '#fbf5ef',
  },
  'nordic-mint': {
    id: 'nordic-mint',
    primary: '#10b981',
    secondary: '#38bdf8',
    tertiary: '#6366f1',
    bgTintDark: '#09151a',
    bgTintLight: '#eff7f6',
  },
  'crimson-vinyl': {
    id: 'crimson-vinyl',
    primary: '#f43f5e',
    secondary: '#fb923c',
    tertiary: '#fda4af',
    bgTintDark: '#170b12',
    bgTintLight: '#faf1f3',
  },
  monochrome: {
    id: 'monochrome',
    primary: '#e2e8f0',
    secondary: '#64748b',
    tertiary: '#94a3b8',
    bgTintDark: '#0c0e14',
    bgTintLight: '#f1f5f9',
  },
};

export const EQ_PRESETS: Record<Exclude<EqPresetId, 'custom'>, { bass: number; mid: number; treble: number }> = {
  flat: { bass: 0, mid: 0, treble: 0 },
  bass: { bass: 7, mid: -1, treble: 2 },
  club: { bass: 5, mid: 2, treble: 5 },
  vocal: { bass: -2, mid: 5, treble: 3 },
};
