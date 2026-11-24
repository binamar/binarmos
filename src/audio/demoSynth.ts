// Generates an in-memory 16-second stereo WAV groove using OfflineAudioContext
// so users can test every visualization mode & EQ band immediately without external files.

function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export async function createDemoGrooveUrl(): Promise<string> {
  const sampleRate = 44100;
  const bpm = 118;
  const beatDur = 60 / bpm;
  const bars = 8;
  const totalDur = bars * 4 * beatDur;
  const offline = new OfflineAudioContext(2, Math.floor(sampleRate * totalDur), sampleRate);

  const master = offline.createGain();
  master.gain.value = 0.72;
  master.connect(offline.destination);

  // Noise buffer for hats & snare
  const noiseLen = Math.floor(sampleRate * 0.25);
  const noiseBuf = offline.createBuffer(1, noiseLen, sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  const bassNotes = [55, 55, 65.41, 73.42, 55, 55, 82.41, 65.41]; // A1, C2, D2, E2
  const arpNotes = [220, 261.63, 329.63, 392.0, 440, 392.0, 329.63, 293.66];

  const totalBeats = bars * 4;
  for (let beat = 0; beat < totalBeats; beat++) {
    const t = beat * beatDur;

    // Kick on every quarter note
    const kickOsc = offline.createOscillator();
    const kickGain = offline.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(140, t);
    kickOsc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    kickGain.gain.setValueAtTime(0.95, t);
    kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    kickOsc.connect(kickGain);
    kickGain.connect(master);
    kickOsc.start(t);
    kickOsc.stop(t + 0.36);

    // Snare on beats 1 and 3 (off-beats)
    if (beat % 2 === 1) {
      const snareSrc = offline.createBufferSource();
      snareSrc.buffer = noiseBuf;
      const filter = offline.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      const snareGain = offline.createGain();
      snareGain.gain.setValueAtTime(0.38, t);
      snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      snareSrc.connect(filter);
      filter.connect(snareGain);
      snareGain.connect(master);
      snareSrc.start(t);
      snareSrc.stop(t + 0.2);
    }

    // 16th-note hi-hats + rolling synth arp
    for (let sub = 0; sub < 4; sub++) {
      const st = t + sub * (beatDur / 4);
      const hatSrc = offline.createBufferSource();
      hatSrc.buffer = noiseBuf;
      const hp = offline.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7200;
      const hatGain = offline.createGain();
      hatGain.gain.setValueAtTime(sub === 2 ? 0.16 : 0.08, st);
      hatGain.gain.exponentialRampToValueAtTime(0.001, st + 0.055);
      hatSrc.connect(hp);
      hp.connect(hatGain);
      hatGain.connect(master);
      hatSrc.start(st);
      hatSrc.stop(st + 0.06);

      // Arpeggio synth pulse
      const arpOsc = offline.createOscillator();
      const arpFilter = offline.createBiquadFilter();
      const arpGain = offline.createGain();
      const note = arpNotes[(beat * 4 + sub) % arpNotes.length];
      arpOsc.type = 'triangle';
      arpOsc.frequency.setValueAtTime(note, st);
      arpFilter.type = 'lowpass';
      arpFilter.frequency.setValueAtTime(900 + Math.sin(beat * 0.6) * 600, st);
      arpGain.gain.setValueAtTime(0.001, st);
      arpGain.gain.linearRampToValueAtTime(0.14, st + 0.015);
      arpGain.gain.exponentialRampToValueAtTime(0.001, st + beatDur * 0.23);
      arpOsc.connect(arpFilter);
      arpFilter.connect(arpGain);
      arpGain.connect(master);
      arpOsc.start(st);
      arpOsc.stop(st + beatDur * 0.24);
    }

    // Sub-bass pulse on every eighth note
    for (let eighth = 0; eighth < 2; eighth++) {
      const bt = t + eighth * (beatDur / 2);
      const bassOsc = offline.createOscillator();
      const bassFilter = offline.createBiquadFilter();
      const bassGain = offline.createGain();
      const f = bassNotes[Math.floor(beat / 4) % bassNotes.length];
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(f, bt);
      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(340, bt);
      bassGain.gain.setValueAtTime(0.28, bt);
      bassGain.gain.exponentialRampToValueAtTime(0.01, bt + beatDur * 0.44);
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(master);
      bassOsc.start(bt);
      bassOsc.stop(bt + beatDur * 0.46);
    }
  }

  const rendered = await offline.startRendering();
  const wavBlob = encodeWav(rendered);
  return URL.createObjectURL(wavBlob);
}
