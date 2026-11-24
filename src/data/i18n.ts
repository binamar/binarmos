import { EqPresetId, Language, PaletteId, VisualizerMode } from '../types/visualizer';

export interface Translations {
  brand: string;
  openMp3: string;
  addTracks: string;
  playDemo: string;
  liveMic: string;
  stopMic: string;
  micActiveTitle: string;
  emptyHeadline: string;
  emptySub: string;
  dropHint: string;
  noFileSelected: string;
  tabVisuals: string;
  tabSound: string;
  tabQueue: string;
  modeLabel: string;
  paletteLabel: string;
  tuningLabel: string;
  sensitivity: string;
  smoothing: string;
  density: string;
  mirror: string;
  glow: string;
  peakCaps: string;
  eqLabel: string;
  bass: string;
  mid: string;
  treble: string;
  speedLabel: string;
  volumeLabel: string;
  queueTitle: string;
  queueEmpty: string;
  clearQueue: string;
  snapshot: string;
  fullscreen: string;
  exitFullscreen: string;
  loopOn: string;
  loopOff: string;
  play: string;
  pause: string;
  prev: string;
  next: string;
  mute: string;
  unmute: string;
  bassEnergy: string;
  midEnergy: string;
  trebleEnergy: string;
  invalidFile: string;
  tapPlayHint: string;
  decodeError: string;
  micError: string;
  demoTrackName: string;
  trackCount: (n: number) => string;
  modes: Record<VisualizerMode, string>;
  palettes: Record<PaletteId, string>;
  eqPresets: Record<EqPresetId, string>;
}

export const DICTIONARY: Record<Language, Translations> = {
  en: {
    brand: 'MP3 Visualizer',
    openMp3: 'Open Audio',
    addTracks: 'Add Tracks',
    playDemo: 'Play Demo Groove',
    liveMic: 'Live Mic',
    stopMic: 'Stop Mic',
    micActiveTitle: 'Live Microphone Input',
    emptyHeadline: 'Drop an MP3 here or pick tracks to start',
    emptySub: 'Supports MP3, WAV, OGG, M4A, and multi-track playlists — processed 100% locally on your device.',
    dropHint: 'Release files to add to playlist',
    noFileSelected: 'No audio loaded',
    tabVisuals: 'Visuals',
    tabSound: 'Sound & EQ',
    tabQueue: 'Playlist',
    modeLabel: 'Visualization Mode',
    paletteLabel: 'Color Palette',
    tuningLabel: 'Motion & Geometry',
    sensitivity: 'Sensitivity',
    smoothing: 'Smoothing',
    density: 'Detail Density',
    mirror: 'Mirror Symmetry',
    glow: 'Luminous Trails',
    peakCaps: 'Peak Caps',
    eqLabel: '3-Band Equalizer',
    bass: 'Bass',
    mid: 'Mid',
    treble: 'Treble',
    speedLabel: 'Playback Speed',
    volumeLabel: 'Volume',
    queueTitle: 'Up Next',
    queueEmpty: 'Add multiple MP3 files or launch the built-in synth groove to build your queue.',
    clearQueue: 'Clear',
    snapshot: 'Save Snapshot',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    loopOn: 'Loop Enabled',
    loopOff: 'Loop Disabled',
    play: 'Play',
    pause: 'Pause',
    prev: 'Previous Track',
    next: 'Next Track',
    mute: 'Mute',
    unmute: 'Unmute',
    bassEnergy: 'Bass',
    midEnergy: 'Mids',
    trebleEnergy: 'Highs',
    invalidFile: 'Unsupported file format. Please choose MP3, WAV, OGG, M4A, or FLAC audio.',
    tapPlayHint: 'Press Play to start playback.',
    decodeError: 'Could not play this audio file. Try another track.',
    micError: 'Microphone access was denied or unavailable on this device.',
    demoTrackName: 'Horizon Pulse (Built-in Synth)',
    trackCount: (n: number) => `${n} ${n === 1 ? 'track' : 'tracks'}`,
    modes: {
      bars: 'Spectrum Bars',
      wave: 'Wave Ribbon',
      ring: 'Radial Halo',
      particles: 'Beat Particles',
      horizon: '3D Horizon',
      kaleido: 'Kaleidoscope',
      waterfall: 'Spectrogram',
    },
    palettes: {
      'amber-teal': 'Amber & Teal',
      solaris: 'Solaris Heat',
      'nordic-mint': 'Nordic Mint',
      'crimson-vinyl': 'Crimson Vinyl',
      monochrome: 'Studio Mono',
    },
    eqPresets: {
      flat: 'Flat',
      bass: 'Bass Boost',
      club: 'Club',
      vocal: 'Vocal Clear',
      custom: 'Custom',
    },
  },
  ar: {
    brand: 'مرئي MP3',
    openMp3: 'اختيار صوت',
    addTracks: 'إضافة مقاطع',
    playDemo: 'تشغيل إيقاع تجريبي',
    liveMic: 'الميكروفون المباشر',
    stopMic: 'إيقاف الميكروفون',
    micActiveTitle: 'بث مباشر من الميكروفون',
    emptyHeadline: 'اسحب ملف MP3 إلى هنا أو اختر من جهازك',
    emptySub: 'يدعم MP3 و WAV و OGG و M4A وقوائم التشغيل المتعددة — يعمل بالكامل محلياً على جهازك.',
    dropHint: 'أفلت الملفات لإضافتها إلى القائمة',
    noFileSelected: 'لم يتم اختيار ملف',
    tabVisuals: 'المؤثرات',
    tabSound: 'الصوت والمعادل',
    tabQueue: 'القائمة',
    modeLabel: 'نمط العرض المرئي',
    paletteLabel: 'لوحة الألوان',
    tuningLabel: 'ضبط الحركة والتفاصيل',
    sensitivity: 'الحساسية',
    smoothing: 'النعومة',
    density: 'كثافة التفاصيل',
    mirror: 'تناظر مرآوي',
    glow: 'وهج مضيء',
    peakCaps: 'مؤشرات القمة',
    eqLabel: 'معادل الصوت ثلاثي النطاقات',
    bass: 'الجهير',
    mid: 'الوسط',
    treble: 'الحدة',
    speedLabel: 'سرعة التشغيل',
    volumeLabel: 'مستوى الصوت',
    queueTitle: 'قائمة التشغيل',
    queueEmpty: 'أضف عدة ملفات MP3 أو جرّب الإيقاع التجريبي المدمج لبدء العرض.',
    clearQueue: 'مسح',
    snapshot: 'حفظ لقطة',
    fullscreen: 'ملء الشاشة',
    exitFullscreen: 'إنهاء ملء الشاشة',
    loopOn: 'التكرار مفعّل',
    loopOff: 'التكرار معطّل',
    play: 'تشغيل',
    pause: 'إيقاف مؤقت',
    prev: 'المقطع السابق',
    next: 'المقطع التالي',
    mute: 'كتم الصوت',
    unmute: 'إلغاء الكتم',
    bassEnergy: 'جهير',
    midEnergy: 'وسط',
    trebleEnergy: 'عالي',
    invalidFile: 'صيغة غير مدعومة. اختر ملف MP3 أو WAV أو OGG أو M4A.',
    tapPlayHint: 'اضغط زر التشغيل للبدء.',
    decodeError: 'تعذر تشغيل هذا الملف. جرّب ملفاً آخر.',
    micError: 'تعذر الوصول إلى الميكروفون أو تم رفض الإذن.',
    demoTrackName: 'نبض الأفق (مقطوعة مدمجة)',
    trackCount: (n: number) => `${n} ${n === 1 ? 'مقطع' : 'مقاطع'}`,
    modes: {
      bars: 'أعمدة الطيف',
      wave: 'موجة متدفقة',
      ring: 'هالة دائرية',
      particles: 'جزيئات الإيقاع',
      horizon: 'أفق ثلاثي الأبعاد',
      kaleido: 'مشكال هندسي',
      waterfall: 'مخطط طيفي',
    },
    palettes: {
      'amber-teal': 'كهرماني وأزرق',
      solaris: 'توهج شمسي',
      'nordic-mint': 'نعناع شمالي',
      'crimson-vinyl': 'فينيل قرمزي',
      monochrome: 'أحادي استوديو',
    },
    eqPresets: {
      flat: 'متوازن',
      bass: 'تعزيز الجهير',
      club: 'نادي',
      vocal: 'وضوح الصوت',
      custom: 'مخصص',
    },
  },
};
