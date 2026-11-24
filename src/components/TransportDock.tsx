import React from 'react';
import {
  Camera,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Translations } from '../data/i18n';

interface TransportDockProps {
  t: Translations;
  hasTrack: boolean;
  isMicActive: boolean;
  isPlaying: boolean;
  canSkip: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoop: boolean;
  playbackRate: number;
  isFullscreen: boolean;
  accentColor: string;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeekStart: () => void;
  onSeekChange: (seconds: number) => void;
  onSeekEnd: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleLoop: () => void;
  onCycleSpeed: () => void;
  onSnapshot: () => void;
  onToggleFullscreen: () => void;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const TransportDock: React.FC<TransportDockProps> = ({
  t,
  hasTrack,
  isMicActive,
  isPlaying,
  canSkip,
  currentTime,
  duration,
  volume,
  isMuted,
  isLoop,
  playbackRate,
  isFullscreen,
  accentColor,
  onTogglePlay,
  onPrev,
  onNext,
  onSeekStart,
  onSeekChange,
  onSeekEnd,
  onVolumeChange,
  onToggleMute,
  onToggleLoop,
  onCycleSpeed,
  onSnapshot,
  onToggleFullscreen,
}) => {
  const progress = duration > 0 ? Math.min(1000, Math.round((currentTime / duration) * 1000)) : 0;
  const controlsDisabled = !hasTrack || isMicActive;

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col gap-4">
      {/* Timeline Scrubber (always LTR for natural audio direction) */}
      <div className="flex flex-col gap-1.5" dir="ltr">
        <input
          type="range"
          min={0}
          max={1000}
          value={progress}
          disabled={controlsDisabled || !duration}
          aria-label="Playback position"
          onPointerDown={onSeekStart}
          onChange={(e) => {
            if (!duration) return;
            const nextTime = (Number(e.target.value) / 1000) * duration;
            onSeekChange(nextTime);
          }}
          onPointerUp={onSeekEnd}
          onKeyUp={onSeekEnd}
          style={{
            color: accentColor,
            background: `linear-gradient(to right, ${accentColor} ${progress / 10}%, rgba(148,163,184,0.28) ${progress / 10}%)`,
          }}
          className="w-full h-1.5 rounded-full"
        />
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Primary Playback Cluster */}
        <div className="flex items-center gap-2" dir="ltr">
          <button
            type="button"
            onClick={onPrev}
            disabled={controlsDisabled || !canSkip}
            aria-label={t.prev}
            title={t.prev}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 transition-colors cursor-pointer disabled:cursor-default"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            disabled={controlsDisabled}
            aria-label={isPlaying ? t.pause : t.play}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 disabled:hover:scale-100 transition-transform cursor-pointer disabled:cursor-default shadow-sm"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={controlsDisabled || !canSkip}
            aria-label={t.next}
            title={t.next}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 transition-colors cursor-pointer disabled:cursor-default"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Volume + Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:flex items-center gap-2 px-2" dir="ltr">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? t.unmute : t.mute}
              title={isMuted ? t.unmute : t.mute}
              className="min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              aria-label={t.volumeLabel}
              style={{
                color: accentColor,
                background: `linear-gradient(to right, ${accentColor} ${(isMuted ? 0 : volume) * 100}%, rgba(148,163,184,0.28) ${(isMuted ? 0 : volume) * 100}%)`,
              }}
              className="w-20 h-1.5 rounded-full"
            />
          </div>

          <button
            type="button"
            onClick={onCycleSpeed}
            disabled={controlsDisabled}
            title={t.speedLabel}
            className="min-w-[44px] min-h-[44px] px-2.5 rounded-xl text-xs font-mono-tabular font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-default"
          >
            {playbackRate}x
          </button>

          <button
            type="button"
            onClick={onToggleLoop}
            disabled={controlsDisabled}
            aria-pressed={isLoop}
            aria-label={isLoop ? t.loopOn : t.loopOff}
            title={isLoop ? t.loopOn : t.loopOff}
            className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-default ${
              isLoop
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onSnapshot}
            aria-label={t.snapshot}
            title={t.snapshot}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen}
            title={isFullscreen ? t.exitFullscreen : t.fullscreen}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
