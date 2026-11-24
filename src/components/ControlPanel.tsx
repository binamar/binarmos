import React from 'react';
import {
  Activity,
  AudioWaveform,
  BarChart3,
  CircleDot,
  Disc3,
  Layers,
  Mic,
  MicOff,
  Mountain,
  Music2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Translations } from '../data/i18n';
import { EQ_PRESETS, PALETTES } from '../data/palettes';
import {
  AudioTrack,
  EqPresetId,
  EqSettings,
  PaletteId,
  VisualizerMode,
  VisualizerSettings,
} from '../types/visualizer';
import { StudioTab } from './StudioHeader';

interface ControlPanelProps {
  t: Translations;
  activeTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  settings: VisualizerSettings;
  onUpdateSettings: (patch: Partial<VisualizerSettings>) => void;
  eq: EqSettings;
  onUpdateEq: (next: EqSettings) => void;
  tracks: AudioTrack[];
  activeTrackId: string | null;
  isMicActive: boolean;
  onToggleMic: () => void;
  onSelectTrack: (track: AudioTrack) => void;
  onRemoveTrack: (id: string) => void;
  onClearTracks: () => void;
  onPickFiles: () => void;
  onPlayDemo: () => void;
  bassMeterRef: React.RefObject<HTMLDivElement | null>;
  midMeterRef: React.RefObject<HTMLDivElement | null>;
  trebleMeterRef: React.RefObject<HTMLDivElement | null>;
}

const MODE_ICONS: Record<VisualizerMode, React.ReactNode> = {
  bars: <BarChart3 className="w-4 h-4 shrink-0" />,
  wave: <AudioWaveform className="w-4 h-4 shrink-0" />,
  ring: <CircleDot className="w-4 h-4 shrink-0" />,
  particles: <Sparkles className="w-4 h-4 shrink-0" />,
  horizon: <Mountain className="w-4 h-4 shrink-0" />,
  kaleido: <Disc3 className="w-4 h-4 shrink-0" />,
  waterfall: <Layers className="w-4 h-4 shrink-0" />,
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return 'WAV';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  t,
  activeTab,
  onSelectTab,
  settings,
  onUpdateSettings,
  eq,
  onUpdateEq,
  tracks,
  activeTrackId,
  isMicActive,
  onToggleMic,
  onSelectTrack,
  onRemoveTrack,
  onClearTracks,
  onPickFiles,
  onPlayDemo,
  bassMeterRef,
  midMeterRef,
  trebleMeterRef,
}) => {
  const accent = PALETTES[settings.palette].primary;
  const modes = Object.keys(MODE_ICONS) as VisualizerMode[];
  const palettes = Object.keys(PALETTES) as PaletteId[];
  const presetKeys = Object.keys(EQ_PRESETS) as Exclude<EqPresetId, 'custom'>[];

  const applyPreset = (preset: Exclude<EqPresetId, 'custom'>) => {
    const vals = EQ_PRESETS[preset];
    onUpdateEq({ preset, ...vals });
  };

  const updateBand = (band: 'bass' | 'mid' | 'treble', val: number) => {
    onUpdateEq({
      ...eq,
      preset: 'custom',
      [band]: val,
    });
  };

  return (
    <aside className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
      {/* Segmented Control Tabs */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950/70">
          {(
            [
              { id: 'visuals', label: t.tabVisuals },
              { id: 'sound', label: t.tabSound },
              { id: 'queue', label: t.tabQueue },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Body */}
      <div className="p-5 flex flex-col gap-6 overflow-y-auto max-h-[680px]">
        {activeTab === 'visuals' && (
          <>
            {/* 7 Visualization Modes */}
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.modeLabel}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {modes.map((m) => {
                  const active = settings.mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onUpdateSettings({ mode: m })}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-start flex items-center gap-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span className={active ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'}>
                        {MODE_ICONS[m]}
                      </span>
                      <span className="truncate">{t.modes[m]}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="h-px bg-slate-200/80 dark:bg-slate-800/80" />

            {/* Color Palettes */}
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.paletteLabel}
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {palettes.map((pid) => {
                  const pal = PALETTES[pid];
                  const active = settings.palette === pid;
                  return (
                    <button
                      key={pid}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onUpdateSettings({ palette: pid })}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="whitespace-nowrap truncate">{t.palettes[pid]}</span>
                      <span className="flex items-center gap-1 shrink-0" aria-hidden="true">
                        <span className="w-4 h-4 rounded-md" style={{ backgroundColor: pal.secondary }} />
                        <span className="w-4 h-4 rounded-md" style={{ backgroundColor: pal.tertiary }} />
                        <span className="w-4 h-4 rounded-md" style={{ backgroundColor: pal.primary }} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="h-px bg-slate-200/80 dark:bg-slate-800/80" />

            {/* Fine Tuning */}
            <section className="flex flex-col gap-4">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.tuningLabel}
              </h2>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300">{t.sensitivity}</span>
                  <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                    {settings.sensitivity.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={2.2}
                  step={0.1}
                  value={settings.sensitivity}
                  onChange={(e) => onUpdateSettings({ sensitivity: Number(e.target.value) })}
                  style={{
                    color: accent,
                    background: `linear-gradient(to right, ${accent} ${((settings.sensitivity - 0.6) / 1.6) * 100}%, rgba(148,163,184,0.28) ${((settings.sensitivity - 0.6) / 1.6) * 100}%)`,
                  }}
                  className="w-full h-1.5 rounded-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300">{t.smoothing}</span>
                  <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                    {Math.round(settings.smoothing * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.35}
                  max={0.92}
                  step={0.01}
                  value={settings.smoothing}
                  onChange={(e) => onUpdateSettings({ smoothing: Number(e.target.value) })}
                  style={{
                    color: accent,
                    background: `linear-gradient(to right, ${accent} ${((settings.smoothing - 0.35) / 0.57) * 100}%, rgba(148,163,184,0.28) ${((settings.smoothing - 0.35) / 0.57) * 100}%)`,
                  }}
                  className="w-full h-1.5 rounded-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300">{t.density}</span>
                  <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                    {settings.density}
                  </span>
                </div>
                <input
                  type="range"
                  min={24}
                  max={96}
                  step={4}
                  value={settings.density}
                  onChange={(e) => onUpdateSettings({ density: Number(e.target.value) })}
                  style={{
                    color: accent,
                    background: `linear-gradient(to right, ${accent} ${((settings.density - 24) / 72) * 100}%, rgba(148,163,184,0.28) ${((settings.density - 24) / 72) * 100}%)`,
                  }}
                  className="w-full h-1.5 rounded-full"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1">
                {(
                  [
                    { key: 'mirror', label: t.mirror },
                    { key: 'glow', label: t.glow },
                    { key: 'peakCaps', label: t.peakCaps },
                  ] as const
                ).map((item) => {
                  const checked = settings[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      onClick={() => onUpdateSettings({ [item.key]: !checked })}
                      className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      <span>{item.label}</span>
                      <span
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                          checked ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                            checked ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {activeTab === 'sound' && (
          <>
            {/* Live Frequency Spectrum Meters */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>{t.eqLabel}</span>
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-3 py-1">
                {[
                  { label: t.bassEnergy, ref: bassMeterRef, color: PALETTES[settings.palette].primary },
                  { label: t.midEnergy, ref: midMeterRef, color: PALETTES[settings.palette].tertiary },
                  { label: t.trebleEnergy, ref: trebleMeterRef, color: PALETTES[settings.palette].secondary },
                ].map((band) => (
                  <div key={band.label} className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {band.label}
                    </span>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        ref={band.ref}
                        className="h-full rounded-full transition-[width] duration-75"
                        style={{ width: '0%', backgroundColor: band.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="h-px bg-slate-200/80 dark:bg-slate-800/80" />

            {/* EQ Presets */}
            <section className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                {presetKeys.map((pk) => {
                  const active = eq.preset === pk;
                  return (
                    <button
                      key={pk}
                      type="button"
                      onClick={() => applyPreset(pk)}
                      className={`min-h-[42px] px-3 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {t.eqPresets[pk]}
                    </button>
                  );
                })}
              </div>

              {/* 3-Band EQ Sliders */}
              <div className="flex flex-col gap-4 pt-2">
                {(
                  [
                    { key: 'bass', label: `${t.bass} · 100 Hz`, val: eq.bass },
                    { key: 'mid', label: `${t.mid} · 1 kHz`, val: eq.mid },
                    { key: 'treble', label: `${t.treble} · 8 kHz`, val: eq.treble },
                  ] as const
                ).map((band) => (
                  <div key={band.key} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300">{band.label}</span>
                      <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                        {band.val > 0 ? `+${band.val}` : band.val} dB
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={1}
                      value={band.val}
                      onChange={(e) => updateBand(band.key, Number(e.target.value))}
                      style={{
                        color: accent,
                        background: `linear-gradient(to right, ${accent} ${((band.val + 12) / 24) * 100}%, rgba(148,163,184,0.28) ${((band.val + 12) / 24) * 100}%)`,
                      }}
                      className="w-full h-1.5 rounded-full"
                    />
                  </div>
                ))}
              </div>
            </section>

            <div className="h-px bg-slate-200/80 dark:bg-slate-800/80" />

            {/* Live Microphone Mode */}
            <section className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onToggleMic}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  isMicActive
                    ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                }`}
              >
                {isMicActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isMicActive ? t.stopMic : t.liveMic}</span>
              </button>
            </section>
          </>
        )}

        {activeTab === 'queue' && (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{t.queueTitle}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{t.trackCount(tracks.length)}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {tracks.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearTracks}
                    className="min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    {t.clearQueue}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onPickFiles}
                  className="min-h-[36px] px-3 rounded-lg bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addTracks}</span>
                </button>
              </div>
            </div>

            {tracks.length === 0 ? (
              <div className="py-10 px-4 text-center flex flex-col items-center gap-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                  {t.queueEmpty}
                </p>
                <button
                  type="button"
                  onClick={onPlayDemo}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {t.playDemo}
                </button>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/80">
                {tracks.map((track, idx) => {
                  const isCurrent = track.id === activeTrackId;
                  return (
                    <div
                      key={track.id}
                      className={`min-h-[56px] py-2.5 px-2 flex items-center justify-between gap-3 rounded-xl transition-colors ${
                        isCurrent ? 'bg-amber-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectTrack(track)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-start cursor-pointer"
                      >
                        <span
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-mono-tabular font-semibold ${
                            isCurrent
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {isCurrent ? <Music2 className="w-4 h-4" /> : idx + 1}
                        </span>
                        <span className="min-w-0 flex flex-col">
                          <span
                            className={`text-sm font-medium truncate ${
                              isCurrent ? 'text-slate-950 dark:text-white' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {track.name}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                            {track.isDemo ? 'Synth · 118 BPM' : `Audio · ${formatFileSize(track.sizeBytes)}`}
                          </span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveTrack(track.id)}
                        aria-label="Remove track"
                        className="min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
