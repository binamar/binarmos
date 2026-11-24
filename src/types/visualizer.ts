export type VisualizerMode =
  | 'bars'
  | 'wave'
  | 'ring'
  | 'particles'
  | 'horizon'
  | 'kaleido'
  | 'waterfall';

export type PaletteId =
  | 'amber-teal'
  | 'solaris'
  | 'nordic-mint'
  | 'crimson-vinyl'
  | 'monochrome';

export interface PaletteTheme {
  id: PaletteId;
  primary: string;
  secondary: string;
  tertiary: string;
  bgTintDark: string;
  bgTintLight: string;
}

export type EqPresetId = 'flat' | 'bass' | 'club' | 'vocal' | 'custom';

export interface EqSettings {
  preset: EqPresetId;
  bass: number; // -12 to +12 dB
  mid: number; // -12 to +12 dB
  treble: number; // -12 to +12 dB
}

export interface VisualizerSettings {
  mode: VisualizerMode;
  palette: PaletteId;
  sensitivity: number; // 0.6 to 2.2
  smoothing: number; // 0.35 to 0.92
  density: number; // 24 to 96
  mirror: boolean;
  glow: boolean;
  peakCaps: boolean;
}

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  sizeBytes?: number;
  duration?: number;
  isDemo?: boolean;
}

export type Language = 'en' | 'ar';
export type ThemeMode = 'dark' | 'light';

export interface AudioMetrics {
  bass: number;
  mid: number;
  treble: number;
  peak: number;
  beatHit: boolean;
}
