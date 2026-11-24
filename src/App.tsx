import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, Globe, Mic, MicOff, Moon, Play, Sun, UploadCloud } from 'lucide-react';
import { createDemoGrooveUrl } from './audio/demoSynth';
import { ControlPanel } from './components/ControlPanel';
import { StudioHeader, StudioTab } from './components/StudioHeader';
import { TransportDock } from './components/TransportDock';
import { VisualizerCanvas, VisualizerCanvasHandle } from './components/VisualizerCanvas';
import { DICTIONARY } from './data/i18n';
import { PALETTES } from './data/palettes';
import {
  AudioTrack,
  EqSettings,
  Language,
  ThemeMode,
  VisualizerMode,
  VisualizerSettings,
} from './types/visualizer';

const MODE_ORDER: VisualizerMode[] = [
  'bars',
  'wave',
  'ring',
  'particles',
  'horizon',
  'kaleido',
  'waterfall',
];

const SPEED_STEPS = [0.75, 1, 1.25, 1.5];

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [activeTab, setActiveTab] = useState<StudioTab>('visuals');

  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoop, setIsLoop] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);

  const [settings, setSettings] = useState<VisualizerSettings>({
    mode: 'bars',
    palette: 'amber-teal',
    sensitivity: 1.2,
    smoothing: 0.78,
    density: 56,
    mirror: false,
    glow: true,
    peakCaps: true,
  });

  const [eq, setEq] = useState<EqSettings>({
    preset: 'flat',
    bass: 0,
    mid: 0,
    treble: 0,
  });

  const t = DICTIONARY[lang];
  const activeTrack = useMemo(
    () => tracks.find((tr) => tr.id === activeTrackId) || null,
    [tracks, activeTrackId]
  );

  // Refs for DOM, AudioContext, and live meters
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasHandleRef = useRef<VisualizerCanvasHandle | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);

  const [analyserState, setAnalyserState] = useState<AnalyserNode | null>(null);
  const isSeekingRef = useRef(false);

  const bassMeterRef = useRef<HTMLDivElement | null>(null);
  const midMeterRef = useRef<HTMLDivElement | null>(null);
  const trebleMeterRef = useRef<HTMLDivElement | null>(null);

  // Sync HTML dir, lang, and dark class
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Initialize Web Audio pipeline lazily on first user audio action
  const ensureAudioGraph = useCallback(() => {
    const au = audioRef.current;
    if (!au) return null;

    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = settings.smoothing;

      const low = ctx.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.value = 100;
      low.gain.value = eq.bass;

      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1.0;
      mid.gain.value = eq.mid;

      const high = ctx.createBiquadFilter();
      high.type = 'highshelf';
      high.frequency.value = 8000;
      high.gain.value = eq.treble;

      const src = ctx.createMediaElementSource(au);
      src.connect(low);
      low.connect(mid);
      mid.connect(high);
      high.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      mediaSourceRef.current = src;
      bassFilterRef.current = low;
      midFilterRef.current = mid;
      trebleFilterRef.current = high;
      setAnalyserState(analyser);
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }

    return audioCtxRef.current;
  }, [eq.bass, eq.mid, eq.treble, settings.smoothing]);

  // Sync EQ gains to BiquadFilterNodes
  useEffect(() => {
    if (bassFilterRef.current) bassFilterRef.current.gain.value = eq.bass;
    if (midFilterRef.current) midFilterRef.current.gain.value = eq.mid;
    if (trebleFilterRef.current) trebleFilterRef.current.gain.value = eq.treble;
  }, [eq]);

  // Sync volume, mute, loop, playbackRate to <audio>
  useEffect(() => {
    const au = audioRef.current;
    if (!au) return;
    au.volume = isMuted ? 0 : volume;
    au.loop = isLoop;
    au.playbackRate = playbackRate;
  }, [volume, isMuted, isLoop, playbackRate]);

  const stopMic = useCallback(() => {
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((tr) => tr.stop());
      micStreamRef.current = null;
    }
    setIsMicActive(false);
  }, []);

  const toggleMic = useCallback(async () => {
    if (isMicActive) {
      stopMic();
      return;
    }

    setStatusMessage('');
    try {
      const ctx = ensureAudioGraph();
      if (!ctx || !analyserRef.current) return;

      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const micSrc = ctx.createMediaStreamSource(stream);
      // Connect mic to analyser only (not destination) to prevent feedback loop
      micSrc.connect(analyserRef.current);

      micStreamRef.current = stream;
      micSourceRef.current = micSrc;
      setIsMicActive(true);
    } catch {
      setStatusMessage(t.micError);
      stopMic();
    }
  }, [ensureAudioGraph, isMicActive, stopMic, t.micError]);

  const playTrack = useCallback(
    (track: AudioTrack) => {
      if (isMicActive) stopMic();
      const au = audioRef.current;
      if (!au) return;

      setStatusMessage('');
      setActiveTrackId(track.id);
      au.src = track.url;
      au.playbackRate = playbackRate;
      au.loop = isLoop;

      ensureAudioGraph();
      au.play().catch(() => {
        setStatusMessage(t.tapPlayHint);
      });
    },
    [ensureAudioGraph, isLoop, isMicActive, playbackRate, stopMic, t.tapPlayHint]
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const validFiles: AudioTrack[] = [];
      let rejected = false;

      Array.from(fileList).forEach((file) => {
        const isAudio =
          file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name);
        if (!isAudio) {
          rejected = true;
          return;
        }
        validFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: URL.createObjectURL(file),
          sizeBytes: file.size,
        });
      });

      if (rejected && validFiles.length === 0) {
        setStatusMessage(t.invalidFile);
        return;
      }

      if (validFiles.length > 0) {
        setStatusMessage('');
        setTracks((prev) => [...prev, ...validFiles]);
        if (!activeTrackId || isMicActive) {
          playTrack(validFiles[0]);
        }
      }
    },
    [activeTrackId, isMicActive, playTrack, t.invalidFile]
  );

  const handlePlayDemo = useCallback(async () => {
    if (isGeneratingDemo) return;
    setStatusMessage('');

    const existingDemo = tracks.find((tr) => tr.isDemo);
    if (existingDemo) {
      playTrack(existingDemo);
      return;
    }

    setIsGeneratingDemo(true);
    try {
      const demoUrl = await createDemoGrooveUrl();
      const demoTrack: AudioTrack = {
        id: `demo-${Date.now()}`,
        name: t.demoTrackName,
        url: demoUrl,
        isDemo: true,
      };
      setTracks((prev) => [...prev, demoTrack]);
      setIsLoop(true);
      playTrack(demoTrack);
    } finally {
      setIsGeneratingDemo(false);
    }
  }, [isGeneratingDemo, playTrack, t.demoTrackName, tracks]);

  const togglePlay = useCallback(() => {
    const au = audioRef.current;
    if (!au || !activeTrack) return;
    ensureAudioGraph();
    if (au.paused) {
      au.play().catch(() => setStatusMessage(t.tapPlayHint));
    } else {
      au.pause();
    }
  }, [activeTrack, ensureAudioGraph, t.tapPlayHint]);

  const skipTrack = useCallback(
    (direction: -1 | 1) => {
      if (tracks.length < 2 || !activeTrackId) return;
      const idx = tracks.findIndex((tr) => tr.id === activeTrackId);
      if (idx === -1) return;
      const nextIdx = (idx + direction + tracks.length) % tracks.length;
      playTrack(tracks[nextIdx]);
    },
    [activeTrackId, playTrack, tracks]
  );

  const removeTrack = useCallback(
    (id: string) => {
      setTracks((prev) => {
        const target = prev.find((tr) => tr.id === id);
        if (target) URL.revokeObjectURL(target.url);
        const remaining = prev.filter((tr) => tr.id !== id);
        if (id === activeTrackId) {
          const au = audioRef.current;
          if (remaining.length > 0) {
            setTimeout(() => playTrack(remaining[0]), 0);
          } else if (au) {
            au.pause();
            au.removeAttribute('src');
            au.load();
            setActiveTrackId(null);
            setCurrentTime(0);
            setDuration(0);
            setIsPlaying(false);
          }
        }
        return remaining;
      });
    },
    [activeTrackId, playTrack]
  );

  const clearTracks = useCallback(() => {
    tracks.forEach((tr) => URL.revokeObjectURL(tr.url));
    setTracks([]);
    setActiveTrackId(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
  }, [tracks]);

  // Attach <audio> DOM events
  useEffect(() => {
    const au = audioRef.current;
    if (!au) return;

    const onPlay = () => {
      ensureAudioGraph();
      setIsPlaying(true);
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      if (!isLoop && tracks.length > 1) {
        skipTrack(1);
      }
    };
    const onLoadedMetadata = () => setDuration(au.duration || 0);
    const onTimeUpdate = () => {
      if (!isSeekingRef.current) {
        setCurrentTime(au.currentTime || 0);
      }
    };
    const onError = () => {
      if (au.src) setStatusMessage(t.decodeError);
    };

    au.addEventListener('play', onPlay);
    au.addEventListener('pause', onPause);
    au.addEventListener('ended', onEnded);
    au.addEventListener('loadedmetadata', onLoadedMetadata);
    au.addEventListener('timeupdate', onTimeUpdate);
    au.addEventListener('error', onError);

    return () => {
      au.removeEventListener('play', onPlay);
      au.removeEventListener('pause', onPause);
      au.removeEventListener('ended', onEnded);
      au.removeEventListener('loadedmetadata', onLoadedMetadata);
      au.removeEventListener('timeupdate', onTimeUpdate);
      au.removeEventListener('error', onError);
    };
  }, [ensureAudioGraph, isLoop, skipTrack, t.decodeError, tracks.length]);

  // Fullscreen sync
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleSnapshot = useCallback(() => {
    const dataUrl = canvasHandleRef.current?.captureSnapshot();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `visualizer-${settings.mode}-${Date.now()}.png`;
    link.click();
  }, [settings.mode]);

  const handleMetricsUpdate = useCallback((bass: number, mid: number, treble: number) => {
    if (bassMeterRef.current) {
      bassMeterRef.current.style.width = `${Math.round(bass * 100)}%`;
    }
    if (midMeterRef.current) {
      midMeterRef.current.style.width = `${Math.round(mid * 100)}%`;
    }
    if (trebleMeterRef.current) {
      trebleMeterRef.current.style.width = `${Math.round(treble * 100)}%`;
    }
  }, []);

  // Keyboard shortcuts for desktop ergonomics
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight' && audioRef.current && duration) {
        audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
      } else if (e.code === 'ArrowLeft' && audioRef.current && duration) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
      } else if (e.key.toLowerCase() === 'm') {
        setIsMuted((prev) => !prev);
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key >= '1' && e.key <= '7') {
        const mode = MODE_ORDER[Number(e.key) - 1];
        if (mode) setSettings((prev) => ({ ...prev, mode }));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [duration, toggleFullscreen, togglePlay]);

  // Cleanup object URLs and mic on unmount
  useEffect(() => {
    return () => {
      stopMic();
      tracks.forEach((tr) => URL.revokeObjectURL(tr.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const palette = PALETTES[settings.palette];
  const hasStageAudio = Boolean(activeTrack) || isMicActive;
  const isVisualizerActive = (isPlaying && Boolean(activeTrack)) || isMicActive;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0b1120] dark:text-slate-100 transition-colors">
      <StudioHeader
        t={t}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onPickFiles={() => fileInputRef.current?.click()}
      />

      <main id="stage-top" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7 flex flex-col gap-5">
        {/* Workspace Toolbar: Active Track Info + Theme/Language/Mic Switches */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex flex-col gap-0.5">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 dark:text-white truncate">
              {isMicActive ? t.micActiveTitle : activeTrack ? activeTrack.name : t.noFileSelected}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{t.modes[settings.mode]}</span>
              <span aria-hidden="true">·</span>
              <span>{t.palettes[settings.palette]}</span>
              {tracks.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{t.trackCount(tracks.length)}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleMic}
              aria-pressed={isMicActive}
              className={`min-h-[40px] px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isMicActive
                  ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isMicActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isMicActive ? t.stopMic : t.liveMic}</span>
            </button>

            <button
              type="button"
              onClick={() => setLang((prev) => (prev === 'en' ? 'ar' : 'en'))}
              className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'عربي' : 'EN'}</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              aria-label="Toggle color theme"
              className="min-w-[40px] min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Main Studio Grid: Stage + Transport (Left/Center) & Controls Panel (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Quick Mode Switcher Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {MODE_ORDER.map((m, idx) => {
                const active = settings.mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSettings((prev) => ({ ...prev, mode: m }))}
                    className={`min-h-[38px] px-3.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 font-semibold'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="opacity-50 font-mono-tabular mr-1.5 rtl:mr-0 rtl:ml-1.5">{idx + 1}</span>
                    {t.modes[m]}
                  </button>
                );
              })}
            </div>

            {/* Primary Visualizer Stage */}
            <div
              ref={stageRef}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              style={{
                backgroundColor: theme === 'dark' ? palette.bgTintDark : palette.bgTintLight,
              }}
              className={`relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl border overflow-hidden transition-colors ${
                isDragOver
                  ? 'border-amber-500 ring-2 ring-amber-500/40'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <VisualizerCanvas
                ref={canvasHandleRef}
                analyser={analyserState}
                isActive={isVisualizerActive}
                settings={settings}
                theme={theme}
                onMetricsUpdate={handleMetricsUpdate}
              />

              {/* Drag-and-Drop Overlay */}
              {isDragOver && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white p-6 text-center pointer-events-none">
                  <UploadCloud className="w-10 h-10 text-amber-400" />
                  <p className="text-base font-semibold">{t.dropHint}</p>
                </div>
              )}

              {/* Empty State Overlay */}
              {!hasStageAudio && !isDragOver && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <div className="max-w-md flex flex-col items-center gap-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white text-balance">
                      {t.emptyHeadline}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {t.emptySub}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 text-sm font-semibold inline-flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span>{t.openMp3}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePlayDemo}
                        disabled={isGeneratingDemo}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 text-sm font-semibold inline-flex items-center gap-2 hover:bg-white dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>{t.playDemo}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status / Validation Feedback */}
            {statusMessage && (
              <div
                role="status"
                className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-sm font-medium"
              >
                {statusMessage}
              </div>
            )}

            {/* Playback Transport Bar */}
            <TransportDock
              t={t}
              hasTrack={Boolean(activeTrack)}
              isMicActive={isMicActive}
              isPlaying={isPlaying}
              canSkip={tracks.length > 1}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              isMuted={isMuted}
              isLoop={isLoop}
              playbackRate={playbackRate}
              isFullscreen={isFullscreen}
              accentColor={palette.primary}
              onTogglePlay={togglePlay}
              onPrev={() => skipTrack(-1)}
              onNext={() => skipTrack(1)}
              onSeekStart={() => {
                isSeekingRef.current = true;
              }}
              onSeekChange={(sec) => {
                setCurrentTime(sec);
                if (audioRef.current) audioRef.current.currentTime = sec;
              }}
              onSeekEnd={() => {
                isSeekingRef.current = false;
              }}
              onVolumeChange={(v) => {
                setVolume(v);
                if (v > 0 && isMuted) setIsMuted(false);
              }}
              onToggleMute={() => setIsMuted((prev) => !prev)}
              onToggleLoop={() => setIsLoop((prev) => !prev)}
              onCycleSpeed={() => {
                const idx = SPEED_STEPS.indexOf(playbackRate);
                setPlaybackRate(SPEED_STEPS[(idx + 1) % SPEED_STEPS.length]);
              }}
              onSnapshot={handleSnapshot}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>

          {/* Studio Control Panel */}
          <div className="lg:col-span-4">
            <ControlPanel
              t={t}
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              settings={settings}
              onUpdateSettings={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
              eq={eq}
              onUpdateEq={setEq}
              tracks={tracks}
              activeTrackId={activeTrackId}
              isMicActive={isMicActive}
              onToggleMic={toggleMic}
              onSelectTrack={playTrack}
              onRemoveTrack={removeTrack}
              onClearTracks={clearTracks}
              onPickFiles={() => fileInputRef.current?.click()}
              onPlayDemo={handlePlayDemo}
              bassMeterRef={bassMeterRef}
              midMeterRef={midMeterRef}
              trebleMeterRef={trebleMeterRef}
            />
          </div>
        </div>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,.mp3,audio/*"
        multiple
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <audio ref={audioRef} preload="metadata" />
    </div>
  );
}
