import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const sampleRate = 22050;
const bpm = 90;
const beatSeconds = 60 / bpm;
const categories = [
  { category: 'drums', count: 16, bars: 1 },
  { category: 'bass', count: 12, bars: 2 },
  { category: 'melody', count: 12, bars: 2 },
  { category: 'fx', count: 8, bars: 1 },
];

const outputDir = join(process.cwd(), 'public', 'loops');
mkdirSync(outputDir, { recursive: true });

for (const group of categories) {
  for (let index = 1; index <= group.count; index += 1) {
    const id = `${group.category}_${String(index).padStart(2, '0')}`;
    const samples = synthesizeLoop(group.category, index, group.bars);
    writeFileSync(join(outputDir, `${id}.wav`), encodeWav(samples));
  }
}

function synthesizeLoop(category, variant, bars) {
  const duration = bars * 4 * beatSeconds;
  const total = Math.floor(duration * sampleRate);
  const data = new Float32Array(total);
  for (let i = 0; i < total; i += 1) {
    const t = i / sampleRate;
    const beat = t / beatSeconds;
    const beatPhase = beat % 1;
    let value = 0;

    if (category === 'drums') {
      const kickPattern = variant % 3 === 0 ? [0, 2.5] : [0, 2];
      const snarePattern = [1, 3];
      const hatStep = variant % 4 === 0 ? 0.25 : 0.5;
      value += kickPattern.some((b) => closeToBeat(beat, b, 4)) ? sineSweep(t, beatPhase, 56 + variant) * 0.95 : 0;
      value += snarePattern.some((b) => closeToBeat(beat, b, 4)) ? noise(i, variant) * envelope(beatPhase, 18) * 0.42 : 0;
      value += beat % hatStep < 0.05 ? noise(i, variant + 3) * envelope((beat % hatStep) / hatStep, 24) * 0.18 : 0;
    } else if (category === 'bass') {
      const sequence = [0, 0, 3, 5, 7, 5, 3, 0];
      const step = Math.floor(beat * 2) % sequence.length;
      const freq = 55 * Math.pow(2, sequence[(step + variant) % sequence.length] / 12);
      value = softSaw(freq, t) * (0.55 + 0.15 * Math.sin(beat * Math.PI)) * envelope(beat % 0.5, 3);
    } else if (category === 'melody') {
      const scale = [0, 2, 3, 7, 9, 12, 14, 15];
      const step = Math.floor(beat * 2) % scale.length;
      const freq = 220 * Math.pow(2, scale[(step + variant) % scale.length] / 12);
      value = (Math.sin(2 * Math.PI * freq * t) + 0.4 * Math.sin(2 * Math.PI * freq * 2 * t)) * 0.35;
      value *= envelope(beat % 0.5, 4);
    } else {
      const sweep = 180 + (variant % 4) * 90 + beat * 28;
      const fade = Math.sin(Math.PI * Math.min(1, i / total));
      value = Math.sin(2 * Math.PI * sweep * t) * fade * 0.28 + noise(i, variant) * 0.05 * fade;
    }

    data[i] = Math.max(-0.98, Math.min(0.98, value));
  }
  return data;
}

function closeToBeat(beat, target, modulo) {
  const local = beat % modulo;
  return Math.abs(local - target) < 0.08;
}

function envelope(phase, speed) {
  return Math.exp(-phase * speed);
}

function sineSweep(t, phase, base) {
  return Math.sin(2 * Math.PI * (base + 58 * Math.exp(-phase * 15)) * t) * envelope(phase, 12);
}

function softSaw(freq, t) {
  const phase = (freq * t) % 1;
  return Math.tanh((phase * 2 - 1) * 1.8);
}

function noise(i, seed) {
  const x = Math.sin((i + 1) * (seed + 12.9898)) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function encodeWav(samples) {
  const bytesPerSample = 2;
  const buffer = Buffer.alloc(44 + samples.length * bytesPerSample);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * bytesPerSample, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * bytesPerSample, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, 44 + i * bytesPerSample);
  }
  return buffer;
}
