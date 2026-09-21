import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'public', 'loops');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
let failed = 0;
console.log('Loop       Kick   <200Hz energy');
for (const loop of manifest.loops.filter((item) => item.category === 'drums')) {
  const wav = readFileSync(join(root, `${loop.id}.wav`));
  const rate = wav.readUInt32LE(24);
  const count = Math.round(rate * 0.03);
  for (const beat of loop.kickBeats) {
    const start = Math.round(beat * 60 / loop.sourceBpm * rate);
    const window = new Float64Array(count);
    for (let index = 0; index < count; index += 1) {
      const sample = wav.readInt16LE(44 + (start + index) * 2) / 32768;
      window[index] = sample * (0.5 - 0.5 * Math.cos(2 * Math.PI * index / (count - 1)));
    }
    const ratio = lowFrequencyRatio(window, rate);
    console.log(`${loop.id.padEnd(10)} ${String(beat).padStart(4)}   ${(ratio * 100).toFixed(1)}%`);
    if (ratio < 0.4) failed += 1;
  }
}
if (failed) {
  console.error(`${failed} kick attacks lack low-frequency energy`);
  process.exitCode = 1;
}

function lowFrequencyRatio(samples, rate) {
  const size = 2048;
  const real = new Float64Array(size);
  const imag = new Float64Array(size);
  real.set(samples);
  for (let index = 1, bit = 0; index < size; index += 1) {
    let mask = size >> 1;
    for (; bit & mask; mask >>= 1) bit ^= mask;
    bit ^= mask;
    if (index < bit) {
      [real[index], real[bit]] = [real[bit], real[index]];
    }
  }
  for (let length = 2; length <= size; length *= 2) {
    const angle = -2 * Math.PI / length;
    for (let base = 0; base < size; base += length) {
      for (let index = 0; index < length / 2; index += 1) {
        const cos = Math.cos(angle * index);
        const sin = Math.sin(angle * index);
        const other = base + index + length / 2;
        const tr = real[other] * cos - imag[other] * sin;
        const ti = real[other] * sin + imag[other] * cos;
        real[other] = real[base + index] - tr;
        imag[other] = imag[base + index] - ti;
        real[base + index] += tr;
        imag[base + index] += ti;
      }
    }
  }
  let low = 0;
  let total = 0;
  for (let index = 0; index <= size / 2; index += 1) {
    const power = real[index] ** 2 + imag[index] ** 2;
    total += power;
    if (index * rate / size <= 200) low += power;
  }
  return total ? low / total : 0;
}
