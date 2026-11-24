import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { PALETTES } from '../data/palettes';
import { ThemeMode, VisualizerSettings } from '../types/visualizer';

export interface VisualizerCanvasHandle {
  captureSnapshot: () => string | null;
}

interface VisualizerCanvasProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  settings: VisualizerSettings;
  theme: ThemeMode;
  onMetricsUpdate?: (bass: number, mid: number, treble: number, beatHit: boolean) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hueShift: number;
}

interface Shockwave {
  radius: number;
  alpha: number;
  lineWidth: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const VisualizerCanvas = forwardRef<VisualizerCanvasHandle, VisualizerCanvasProps>(
  function VisualizerCanvas({ analyser, isActive, settings, theme, onMetricsUpdate }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const settingsRef = useRef(settings);
    const themeRef = useRef(theme);
    const isActiveRef = useRef(isActive);
    const analyserRef = useRef(analyser);
    const onMetricsRef = useRef(onMetricsUpdate);

    settingsRef.current = settings;
    themeRef.current = theme;
    isActiveRef.current = isActive;
    analyserRef.current = analyser;
    onMetricsRef.current = onMetricsUpdate;

    // Persistent animation buffers across frames
    const peaksRef = useRef<Float32Array>(new Float32Array(128));
    const particlesRef = useRef<Particle[]>([]);
    const shockwavesRef = useRef<Shockwave[]>([]);
    const horizonHistoryRef = useRef<number[][]>([]);
    const waterfallCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const rotationRef = useRef(0);
    const bassAvgRef = useRef(0);
    const lastBeatTimeRef = useRef(0);
    const lastMetricsEmitRef = useRef(0);

    useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        const cv = canvasRef.current;
        if (!cv) return null;
        return cv.toDataURL('image/png');
      },
    }));

    useEffect(() => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Initialize particle pool
      if (particlesRef.current.length === 0) {
        const pool: Particle[] = [];
        for (let i = 0; i < 120; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.3 + Math.random() * 1.4;
          pool.push({
            x: 0.5 + (Math.random() - 0.5) * 0.6,
            y: 0.5 + (Math.random() - 0.5) * 0.6,
            vx: Math.cos(angle) * speed * 0.0025,
            vy: Math.sin(angle) * speed * 0.0025,
            size: 1.5 + Math.random() * 2.8,
            alpha: 0.35 + Math.random() * 0.6,
            hueShift: Math.random(),
          });
        }
        particlesRef.current = pool;
      }

      let freqData = new Uint8Array(512);
      let waveData = new Uint8Array(1024);

      const resize = () => {
        const rect = cv.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(rect.width * dpr));
        cv.height = Math.max(1, Math.round(rect.height * dpr));
      };

      const observer = new ResizeObserver(resize);
      observer.observe(cv);
      resize();

      let rafId = 0;

      const render = (now: number) => {
        const w = cv.width;
        const h = cv.height;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cfg = settingsRef.current;
        const palette = PALETTES[cfg.palette];
        const isDark = themeRef.current === 'dark';
        const activeAnalyser = analyserRef.current;

        if (activeAnalyser) {
          activeAnalyser.smoothingTimeConstant = cfg.smoothing;
          if (freqData.length !== activeAnalyser.frequencyBinCount) {
            freqData = new Uint8Array(activeAnalyser.frequencyBinCount);
          }
          if (waveData.length !== activeAnalyser.fftSize) {
            waveData = new Uint8Array(activeAnalyser.fftSize);
          }
          activeAnalyser.getByteFrequencyData(freqData);
          activeAnalyser.getByteTimeDomainData(waveData);
        } else {
          freqData.fill(0);
          waveData.fill(128);
        }

        // Compute band energy (0..1)
        const binCount = freqData.length;
        const bassEnd = Math.max(2, Math.floor(binCount * 0.07));
        const midEnd = Math.max(bassEnd + 2, Math.floor(binCount * 0.35));
        const highEnd = Math.max(midEnd + 2, Math.floor(binCount * 0.75));

        let bassSum = 0;
        for (let i = 0; i < bassEnd; i++) bassSum += freqData[i];
        let midSum = 0;
        for (let i = bassEnd; i < midEnd; i++) midSum += freqData[i];
        let highSum = 0;
        for (let i = midEnd; i < highEnd; i++) highSum += freqData[i];

        const bass = Math.min(1, (bassSum / (bassEnd * 255)) * cfg.sensitivity);
        const mid = Math.min(1, (midSum / ((midEnd - bassEnd) * 255)) * cfg.sensitivity);
        const treble = Math.min(1, (highSum / ((highEnd - midEnd) * 255)) * cfg.sensitivity);

        // Beat transient detection
        bassAvgRef.current = bassAvgRef.current * 0.92 + bass * 0.08;
        let beatHit = false;
        if (
          isActiveRef.current &&
          bass > 0.34 &&
          bass > bassAvgRef.current * 1.24 &&
          now - lastBeatTimeRef.current > 190
        ) {
          beatHit = true;
          lastBeatTimeRef.current = now;
          if (cfg.mode === 'particles' && !prefersReducedMotion) {
            shockwavesRef.current.push({
              radius: Math.min(w, h) * 0.06,
              alpha: 0.85,
              lineWidth: 2.5 * dpr,
            });
          }
        }

        if (onMetricsRef.current && now - lastMetricsEmitRef.current > 50) {
          lastMetricsEmitRef.current = now;
          onMetricsRef.current(bass, mid, treble, beatHit);
        }

        // Clear / background gradient
        ctx.save();
        ctx.clearRect(0, 0, w, h);

        // Subtle studio radial atmosphere
        const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.48, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
        if (isDark) {
          bgGrad.addColorStop(0, hexToRgba(palette.secondary, 0.08 + bass * 0.08));
          bgGrad.addColorStop(1, 'rgba(9, 14, 28, 0)');
        } else {
          bgGrad.addColorStop(0, hexToRgba(palette.primary, 0.09 + bass * 0.07));
          bgGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        if (cfg.glow) {
          ctx.shadowBlur = 14 * dpr;
          ctx.shadowColor = hexToRgba(palette.primary, isDark ? 0.5 : 0.3);
        } else {
          ctx.shadowBlur = 0;
        }

        const usableBins = Math.floor(binCount * 0.7);
        const sampleFreq = (normIdx: number) => {
          const idx = Math.min(usableBins - 1, Math.floor(Math.pow(normIdx, 1.45) * usableBins));
          return Math.min(1, (freqData[idx] / 255) * cfg.sensitivity);
        };

        // ------------------------------------------------------------------
        // MODE 1: SPECTRUM BARS
        // ------------------------------------------------------------------
        if (cfg.mode === 'bars') {
          const count = Math.max(20, Math.min(96, cfg.density));
          const gap = Math.max(2 * dpr, (w / count) * 0.22);
          const barW = Math.max(2 * dpr, (w - gap * (count + 1)) / count);
          const peaks = peaksRef.current;

          const grad = ctx.createLinearGradient(0, h, 0, h * 0.08);
          grad.addColorStop(0, palette.secondary);
          grad.addColorStop(0.55, palette.tertiary);
          grad.addColorStop(1, palette.primary);

          for (let i = 0; i < count; i++) {
            const norm = cfg.mirror
              ? Math.abs((i - (count - 1) / 2) / ((count - 1) / 2))
              : i / (count - 1);
            const val = sampleFreq(cfg.mirror ? 1 - norm * 0.92 : norm);

            if (val > peaks[i]) {
              peaks[i] = val;
            } else {
              peaks[i] = Math.max(0, peaks[i] - 0.008);
            }

            const x = gap + i * (barW + gap);
            if (cfg.mirror) {
              const halfH = Math.max(3 * dpr, val * h * 0.42);
              const cy = h / 2;
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.roundRect(x, cy - halfH, barW, halfH * 2, Math.min(barW / 2, 6 * dpr));
              ctx.fill();

              if (cfg.peakCaps && peaks[i] > 0.02) {
                const py = peaks[i] * h * 0.42;
                ctx.fillStyle = palette.primary;
                ctx.fillRect(x, cy - py - 4 * dpr, barW, 2.5 * dpr);
                ctx.fillRect(x, cy + py + 1.5 * dpr, barW, 2.5 * dpr);
              }
            } else {
              const bh = Math.max(4 * dpr, val * h * 0.84);
              const y = h - bh - 12 * dpr;
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.roundRect(x, y, barW, bh, Math.min(barW / 2, 6 * dpr));
              ctx.fill();

              if (cfg.peakCaps && peaks[i] > 0.02) {
                const py = h - peaks[i] * h * 0.84 - 16 * dpr;
                ctx.fillStyle = palette.primary;
                ctx.beginPath();
                ctx.roundRect(x, py, barW, 3 * dpr, 1.5 * dpr);
                ctx.fill();
              }
            }
          }
        }

        // ------------------------------------------------------------------
        // MODE 2: WAVE RIBBON
        // ------------------------------------------------------------------
        else if (cfg.mode === 'wave') {
          const len = waveData.length;
          const step = Math.max(1, Math.floor(len / Math.max(96, cfg.density * 2.5)));
          const lineGrad = ctx.createLinearGradient(0, 0, w, 0);
          lineGrad.addColorStop(0, palette.secondary);
          lineGrad.addColorStop(0.5, palette.primary);
          lineGrad.addColorStop(1, palette.tertiary);

          const drawRibbon = (ampScale: number, phaseOffset: number, alpha: number, fillArea: boolean) => {
            ctx.beginPath();
            let firstX = 0;
            let firstY = h / 2;
            const points: { x: number; y: number }[] = [];

            for (let i = 0; i < len; i += step) {
              const idx = (i + phaseOffset) % len;
              const raw = (waveData[idx] - 128) / 128;
              const x = (i / (len - 1)) * w;
              const y = h / 2 + raw * (h * 0.36) * cfg.sensitivity * ampScale;
              points.push({ x, y });
            }

            if (points.length < 2) return;
            firstX = points[0].x;
            firstY = points[0].y;
            ctx.moveTo(firstX, firstY);

            for (let i = 1; i < points.length - 1; i++) {
              const xc = (points[i].x + points[i + 1].x) / 2;
              const yc = (points[i].y + points[i + 1].y) / 2;
              ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            const last = points[points.length - 1];
            ctx.lineTo(last.x, last.y);

            ctx.strokeStyle = lineGrad;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 3 * dpr;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();

            if (fillArea) {
              ctx.lineTo(w, h / 2);
              ctx.lineTo(0, h / 2);
              ctx.closePath();
              const fillGrad = ctx.createLinearGradient(0, h * 0.15, 0, h * 0.85);
              fillGrad.addColorStop(0, hexToRgba(palette.primary, 0.22));
              fillGrad.addColorStop(0.5, hexToRgba(palette.secondary, 0.04));
              fillGrad.addColorStop(1, hexToRgba(palette.tertiary, 0.22));
              ctx.fillStyle = fillGrad;
              ctx.fill();
            }
            ctx.globalAlpha = 1;
          };

          drawRibbon(0.55, 24, 0.35, false);
          drawRibbon(1, 0, 1, true);

          if (cfg.mirror) {
            drawRibbon(-0.8, 12, 0.45, false);
          }
        }

        // ------------------------------------------------------------------
        // MODE 3: RADIAL HALO
        // ------------------------------------------------------------------
        else if (cfg.mode === 'ring') {
          const cx = w / 2;
          const cy = h / 2;
          const minDim = Math.min(w, h);
          const baseRadius = minDim * (0.21 + bass * 0.045);
          const maxExtend = minDim * 0.24;
          const spokes = Math.max(48, Math.min(144, cfg.density * 2));
          if (!prefersReducedMotion && isActiveRef.current) {
            rotationRef.current += 0.003 + mid * 0.008;
          }

          // Inner pulse halo
          ctx.beginPath();
          ctx.arc(cx, cy, baseRadius * 0.86, 0, Math.PI * 2);
          ctx.strokeStyle = hexToRgba(palette.secondary, 0.35 + bass * 0.4);
          ctx.lineWidth = 2 * dpr;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx, cy, baseRadius * (0.48 + bass * 0.25), 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(palette.primary, 0.12 + bass * 0.24);
          ctx.fill();

          const ringGrad = ctx.createLinearGradient(cx - minDim * 0.4, cy - minDim * 0.4, cx + minDim * 0.4, cy + minDim * 0.4);
          ringGrad.addColorStop(0, palette.secondary);
          ringGrad.addColorStop(0.5, palette.primary);
          ringGrad.addColorStop(1, palette.tertiary);

          ctx.strokeStyle = ringGrad;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(2 * dpr, (minDim * 0.007));

          for (let i = 0; i < spokes; i++) {
            const norm = cfg.mirror
              ? Math.abs(((i % (spokes / 2)) / (spokes / 2)) * 2 - 1)
              : i / spokes;
            const val = sampleFreq(norm * 0.92);
            const angle = (i / spokes) * Math.PI * 2 - Math.PI / 2 + rotationRef.current;
            const len = 4 * dpr + val * maxExtend;

            const innerR = cfg.mirror ? baseRadius - len * 0.3 : baseRadius;
            const outerR = baseRadius + len;

            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
            ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
            ctx.stroke();
          }
        }

        // ------------------------------------------------------------------
        // MODE 4: BEAT PARTICLES & SHOCKWAVES
        // ------------------------------------------------------------------
        else if (cfg.mode === 'particles') {
          const cx = w / 2;
          const cy = h / 2;
          const particles = particlesRef.current;
          const activeCount = Math.min(particles.length, Math.max(40, Math.round(cfg.density * 1.4)));
          const speedBoost = isActiveRef.current ? 1 + bass * 4.5 + treble * 2.5 : 0.25;

          // Shockwaves
          const waves = shockwavesRef.current;
          for (let i = waves.length - 1; i >= 0; i--) {
            const sw = waves[i];
            sw.radius += (3.5 + bass * 6) * dpr;
            sw.alpha -= 0.018;
            if (sw.alpha <= 0) {
              waves.splice(i, 1);
              continue;
            }
            ctx.beginPath();
            ctx.arc(cx, cy, sw.radius, 0, Math.PI * 2);
            ctx.strokeStyle = hexToRgba(palette.primary, sw.alpha);
            ctx.lineWidth = sw.lineWidth;
            ctx.stroke();
          }

          // Center Bass Core
          const coreR = Math.min(w, h) * (0.05 + bass * 0.08);
          const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.4);
          coreGrad.addColorStop(0, hexToRgba(palette.primary, 0.7));
          coreGrad.addColorStop(0.5, hexToRgba(palette.secondary, 0.25));
          coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = coreGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, coreR * 2.4, 0, Math.PI * 2);
          ctx.fill();

          // Update & draw particles
          for (let i = 0; i < activeCount; i++) {
            const p = particles[i];
            if (!prefersReducedMotion) {
              p.x += p.vx * speedBoost;
              p.y += p.vy * speedBoost;
              if (p.x < 0 || p.x > 1) p.vx *= -1;
              if (p.y < 0 || p.y > 1) p.vy *= -1;
              p.x = Math.max(0, Math.min(1, p.x));
              p.y = Math.max(0, Math.min(1, p.y));
            }

            const px = p.x * w;
            const py = p.y * h;
            const rad = p.size * dpr * (0.8 + treble * 1.4);
            const col = p.hueShift > 0.5 ? palette.primary : palette.secondary;

            ctx.fillStyle = hexToRgba(col, Math.min(1, p.alpha * (0.55 + mid * 0.7)));
            ctx.beginPath();
            ctx.arc(px, py, rad, 0, Math.PI * 2);
            ctx.fill();

            // Constellation links when energy rises
            for (let j = i + 1; j < activeCount; j++) {
              const p2 = particles[j];
              const dx = (p.x - p2.x) * w;
              const dy = (p.y - p2.y) * h;
              const dist = Math.hypot(dx, dy);
              const threshold = Math.min(w, h) * (0.11 + mid * 0.08);
              if (dist < threshold) {
                ctx.strokeStyle = hexToRgba(palette.tertiary, (1 - dist / threshold) * (0.2 + bass * 0.35));
                ctx.lineWidth = 1 * dpr;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(p2.x * w, p2.y * h);
                ctx.stroke();
              }
            }
          }
        }

        // ------------------------------------------------------------------
        // MODE 5: 3D HORIZON TERRAIN
        // ------------------------------------------------------------------
        else if (cfg.mode === 'horizon') {
          const cols = Math.max(32, Math.min(72, cfg.density));
          const slice: number[] = [];
          for (let i = 0; i < cols; i++) {
            const norm = cfg.mirror
              ? 1 - Math.abs((i / (cols - 1)) * 2 - 1) * 0.9
              : i / (cols - 1);
            slice.push(sampleFreq(norm));
          }

          const history = horizonHistoryRef.current;
          if (isActiveRef.current || history.length === 0) {
            history.unshift(slice);
            if (history.length > 26) history.pop();
          }

          const horizonY = h * 0.24;
          const totalDepth = h * 0.7;

          for (let row = history.length - 1; row >= 0; row--) {
            const depthNorm = row / Math.max(1, history.length - 1); // 0 = front, 1 = back
            const scale = 1 - depthNorm * 0.58;
            const yBase = horizonY + (1 - depthNorm) * totalDepth;
            const rowWidth = w * (0.38 + scale * 0.6);
            const startX = (w - rowWidth) / 2;
            const rowData = history[row];

            ctx.beginPath();
            for (let c = 0; c < rowData.length; c++) {
              const x = startX + (c / (rowData.length - 1)) * rowWidth;
              const amp = rowData[c] * h * 0.22 * scale;
              const y = yBase - amp;
              if (c === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }

            const alpha = (1 - depthNorm * 0.78) * (row === 0 ? 1 : 0.75);
            const color = row < 5 ? palette.primary : row < 14 ? palette.tertiary : palette.secondary;
            ctx.strokeStyle = hexToRgba(color, alpha);
            ctx.lineWidth = (row === 0 ? 2.6 : 1.5) * dpr;
            ctx.stroke();

            // Subtle occlusion fill below ridge
            ctx.lineTo(startX + rowWidth, yBase + 4 * dpr);
            ctx.lineTo(startX, yBase + 4 * dpr);
            ctx.closePath();
            ctx.fillStyle = isDark ? 'rgba(11, 17, 32, 0.55)' : 'rgba(241, 245, 249, 0.65)';
            ctx.fill();
          }
        }

        // ------------------------------------------------------------------
        // MODE 6: HARMONIC KALEIDOSCOPE
        // ------------------------------------------------------------------
        else if (cfg.mode === 'kaleido') {
          const cx = w / 2;
          const cy = h / 2;
          const maxR = Math.min(w, h) * 0.42;
          const petals = Math.max(6, Math.min(16, Math.round(cfg.density / 6)));
          const layers = 5;

          if (!prefersReducedMotion && isActiveRef.current) {
            rotationRef.current += 0.005 + mid * 0.015;
          }

          for (let layer = 0; layer < layers; layer++) {
            const layerNorm = (layer + 1) / layers;
            const freqVal = sampleFreq(layerNorm * 0.75);
            const radius = maxR * (0.22 + layerNorm * 0.65) * (0.78 + freqVal * 0.45);
            const rot = rotationRef.current * (layer % 2 === 0 ? 1 : -1.2) + layer * 0.4;
            const sides = petals + (layer % 2 === 0 ? 0 : 2);

            ctx.beginPath();
            for (let s = 0; s <= sides * 2; s++) {
              const angle = (s / (sides * 2)) * Math.PI * 2 + rot;
              const isPeak = s % 2 === 0;
              const r = isPeak ? radius : radius * (0.58 + treble * 0.28);
              const x = cx + Math.cos(angle) * r;
              const y = cy + Math.sin(angle) * r;
              if (s === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();

            const strokeCol = layer === 0 ? palette.primary : layer % 2 === 0 ? palette.secondary : palette.tertiary;
            ctx.strokeStyle = hexToRgba(strokeCol, 0.9 - layer * 0.12);
            ctx.lineWidth = (2.8 - layer * 0.3) * dpr;
            ctx.stroke();

            ctx.fillStyle = hexToRgba(strokeCol, 0.05 + freqVal * 0.08);
            ctx.fill();
          }
        }

        // ------------------------------------------------------------------
        // MODE 7: SPECTROGRAM WATERFALL
        // ------------------------------------------------------------------
        else if (cfg.mode === 'waterfall') {
          if (!waterfallCanvasRef.current) {
            waterfallCanvasRef.current = document.createElement('canvas');
          }
          const off = waterfallCanvasRef.current;
          const targetW = Math.max(120, Math.floor(w / 2));
          const targetH = Math.max(120, Math.floor(h / 2));
          if (off.width !== targetW || off.height !== targetH) {
            off.width = targetW;
            off.height = targetH;
          }
          const octx = off.getContext('2d');
          if (octx) {
            if (isActiveRef.current) {
              // Shift image left by 2px
              octx.drawImage(off, -2, 0);
              octx.clearRect(targetW - 2, 0, 2, targetH);

              const rows = Math.min(96, targetH);
              const cellH = targetH / rows;
              for (let r = 0; r < rows; r++) {
                const norm = 1 - r / (rows - 1);
                const val = sampleFreq(norm);
                if (val > 0.03) {
                  const col = val > 0.65 ? palette.primary : val > 0.32 ? palette.tertiary : palette.secondary;
                  octx.fillStyle = hexToRgba(col, Math.min(1, val * 1.15));
                  octx.fillRect(targetW - 2, r * cellH, 2, Math.ceil(cellH));
                }
              }
            }
            ctx.shadowBlur = 0;
            ctx.drawImage(off, 0, 0, w, h);

            // Live edge frequency profile on right side
            const barWidth = 5 * dpr;
            const rows = 48;
            const rowH = h / rows;
            for (let r = 0; r < rows; r++) {
              const norm = 1 - r / (rows - 1);
              const val = sampleFreq(norm);
              ctx.fillStyle = hexToRgba(palette.primary, 0.3 + val * 0.7);
              ctx.fillRect(w - barWidth - val * 28 * dpr, r * rowH, val * 28 * dpr + barWidth, Math.max(1, rowH - 1));
            }
          }
        }

        ctx.restore();
        rafId = requestAnimationFrame(render);
      };

      rafId = requestAnimationFrame(render);

      return () => {
        cancelAnimationFrame(rafId);
        observer.disconnect();
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        aria-label="Audio visualization canvas"
      />
    );
  }
);
