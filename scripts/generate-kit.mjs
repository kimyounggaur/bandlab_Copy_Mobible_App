import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const sampleRate = 44100;
const outputDir = join(process.cwd(), 'public', 'kits', 'lofi');
mkdirSync(outputDir, { recursive: true });
const pads = [
  ['kick', '킥', 0.35], ['snare', '스네어', 0.3], ['clap', '클랩', 0.26],
  ['hat', '하이햇', 0.08], ['tom', '탐', 0.38], ['perc', '퍼크', 0.25],
  ['rim', '림', 0.09], ['openhat', '오픈햇', 0.32], ['sub808', '808', 1.05],
  ['snap', '스냅', 0.16], ['shaker', '쉐이커', 0.24], ['crash', '크래시', 1.6],
  ['lowtom', '로우탐', 0.45], ['hitom', '하이탐', 0.3],
  ['bell', '벨', 0.8], ['noise', '노이즈', 0.55],
];

const kit = { version: 1, id: 'lofi', sampleRate, channels: 2, pads: [] };
for (const [id, label, duration] of pads) {
  const frames = Math.round(duration * sampleRate);
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  for (const [channel, target] of [[0, left], [1, right]]) {
    let phase = 0;
    let low = 0;
    const seed = pads.findIndex((pad) => pad[0] === id) + channel * 37;
    for (let i = 0; i < frames; i += 1) {
      const t = i / sampleRate;
      const n = noise(i, seed);
      low += 0.08 * (n - low);
      const high = n - low;
      let value = 0;
      if (id === 'kick' || id === 'sub808') {
        const base = id === 'kick' ? 58 : 48;
        phase += 2 * Math.PI * (base + (id === 'kick' ? 90 : 24) * Math.exp(-t * 28)) / sampleRate;
        value = Math.sin(phase) * Math.exp(-t * (id === 'kick' ? 13 : 3.4));
        if (id === 'kick') value += high * Math.exp(-t * 90) * 0.23;
      } else if (id === 'snare') {
        phase += 2 * Math.PI * (200 + 45 * Math.exp(-t * 20)) / sampleRate;
        value = Math.sin(phase) * Math.exp(-t * 19) * 0.4 + high * Math.exp(-t * 24) * 0.68;
      } else if (id === 'clap') {
        const burst = [0, 0.003, 0.006, 0.009].reduce((sum, start) => sum + (t >= start ? Math.exp(-(t - start) * 125) : 0), 0);
        value = high * (burst * 0.4 + Math.exp(-t * 24) * 0.14);
      } else if (id === 'hat' || id === 'openhat') {
        value = high * Math.exp(-t * (id === 'hat' ? 80 : 12)) * 0.75;
      } else if (id === 'tom' || id === 'lowtom' || id === 'hitom') {
        const base = id === 'lowtom' ? 82 : id === 'hitom' ? 190 : 125;
        phase += 2 * Math.PI * (base + 65 * Math.exp(-t * 22)) / sampleRate;
        value = Math.sin(phase) * Math.exp(-t * 10) * 0.75;
      } else if (id === 'perc') {
        phase += 2 * Math.PI * (420 + 180 * Math.exp(-t * 32)) / sampleRate;
        value = (Math.sin(phase) + high * 0.25) * Math.exp(-t * 25) * 0.6;
      } else if (id === 'rim') {
        value = (high + Math.sin(2 * Math.PI * 1700 * t) * 0.5) * Math.exp(-t * 85) * 0.6;
      } else if (id === 'snap') {
        value = high * Math.exp(-t * 36) * 0.65 + Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 65) * 0.15;
      } else if (id === 'shaker') {
        value = high * [0, 0.055, 0.11].reduce((sum, start) => sum + (t >= start ? Math.exp(-(t - start) * 65) : 0), 0) * 0.38;
      } else if (id === 'crash') {
        value = (high * 0.6 + n * 0.25) * Math.exp(-t * 2.8);
      } else if (id === 'bell') {
        value = (Math.sin(2 * Math.PI * 880 * t) + 0.55 * Math.sin(2 * Math.PI * 1320 * t)) * Math.exp(-t * 5) * 0.45;
      } else {
        value = (high * (0.3 + 0.7 * Math.sin(2 * Math.PI * 6 * t) ** 2)) * Math.exp(-t * 5) * 0.5;
      }
      const tail = Math.min(1, (frames - i) / (sampleRate * 0.01));
      target[i] = Math.max(-0.98, Math.min(0.98, value * tail));
    }
  }
  const file = `/kits/lofi/${id}.wav`;
  writeFileSync(join(outputDir, `${id}.wav`), encodeStereoWav(left, right));
  kit.pads.push({ id, label, file, defaultVelocity: 0.8, choke: id === 'hat' || id === 'openhat' ? 'hat' : null });
}
writeFileSync(join(outputDir, 'kit.json'), JSON.stringify(kit, null, 2) + '\n');

function noise(index, seed) {
  const x = Math.sin((index + 1) * (seed + 12.9898)) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function encodeStereoWav(left, right) {
  const buffer = Buffer.alloc(44 + left.length * 4);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + left.length * 4, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 4, 28);
  buffer.writeUInt16LE(4, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(left.length * 4, 40);
  for (let i = 0; i < left.length; i += 1) {
    buffer.writeInt16LE(Math.round(left[i] * (left[i] < 0 ? 32768 : 32767)), 44 + i * 4);
    buffer.writeInt16LE(Math.round(right[i] * (right[i] < 0 ? 32768 : 32767)), 46 + i * 4);
  }
  return buffer;
}
