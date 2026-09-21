import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';

const sampleRate = 44100;
const sourceBpm = 90;
const beatSeconds = 60 / sourceBpm;
const bassNotes = [0, 0, 3, 5, 7, 5, 3, 0];
const melodyNotes = [0, 2, 3, 7, 9, 12, 14, 15];
const categories = [
  { category: 'drums', count: 16, bars: 1 },
  { category: 'bass', count: 12, bars: 2 },
  { category: 'melody', count: 12, bars: 2 },
  { category: 'fx', count: 8, bars: 1 },
];
const outputDir = join(process.cwd(), 'public', 'loops');
mkdirSync(outputDir, { recursive: true });
const loops = [];
const ffmpeg = process.env.FFMPEG_PATH || ffmpegStatic || 'ffmpeg';
const ffmpegAvailable = spawnSync(ffmpeg, ['-version'], { stdio: 'ignore' }).status === 0;
if (!ffmpegAvailable) console.warn('ffmpeg was not found. Install ffmpeg or run npm install to generate FLAC; WAV files will still be generated.');

for (const group of categories) {
  for (let variant = 1; variant <= group.count; variant += 1) {
    const id = `${group.category}_${String(variant).padStart(2, '0')}`;
    const genre = grooveFor(variant);
    const samples = synthesizeLoop(group.category, variant, group.bars, genre);
    const wav = encodeWav(samples);
    const wavPath = join(outputDir, `${id}.wav`);
    const flacPath = join(outputDir, `${id}.flac`);
    writeFileSync(wavPath, wav);
    let flac = null;
    if (ffmpegAvailable) {
      const result = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', wavPath, '-compression_level', '8', flacPath]);
      if (result.status !== 0) throw new Error(`FLAC encoding failed for ${id}: ${result.stderr?.toString()}`);
      flac = readFileSync(flacPath);
    }
    const mood = group.category === 'fx' ? '반짝이는' : genre === 'hiphop' ? '단단한' : genre === 'pop' ? '경쾌한' : '빠른';
    const label = { drums: '드럼', bass: '베이스', melody: '멜로디', fx: '효과음' }[group.category];
    loops.push({
      id,
      name: group.category === 'bass' || group.category === 'melody' ? `A마이너 ${mood} ${label}` : `${mood} ${label}`,
      category: group.category,
      genre,
      bars: group.bars,
      sourceBpm,
      key: group.category === 'bass' || group.category === 'melody' ? 'Am' : null,
      sampleRate,
      channels: 1,
      frames: samples.length,
      files: { ...(flac ? { flac: `/loops/${id}.flac` } : {}), wav: `/loops/${id}.wav` },
      hash: createHash('sha1').update(flac ?? wav).digest('hex').slice(0, 12),
      bytes: flac?.length ?? wav.length,
      starter: (group.category === 'drums' || group.category === 'bass') && [1, 3, 4].includes(variant),
      mood,
      license: 'CC0-generated',
      rootHz: group.category === 'bass' ? 55 : group.category === 'melody' ? 220 : null,
      semitones: group.category === 'bass' ? bassNotes : group.category === 'melody' ? melodyNotes : null,
      kickBeats: group.category === 'drums' ? kickPattern(variant) : null,
      hatStep: group.category === 'drums' ? hatStep(variant) : null,
    });
  }
}
writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify({ version: 1, loops }, null, 2) + '\n');

// Genre labels follow the rhythm that is actually synthesized below.
function grooveFor(variant) {
  if (variant % 4 === 0) return 'edm';
  if (variant % 3 === 0) return 'pop';
  return 'hiphop';
}

function kickPattern(variant) {
  return variant % 3 === 0 ? [0, 2.5] : [0, 2];
}

function hatStep(variant) {
  return variant % 4 === 0 ? 0.25 : 0.5;
}

function synthesizeLoop(category, variant, bars, genre) {
  const total = Math.round(bars * 4 * beatSeconds * sampleRate);
  const data = new Float32Array(total);
  let bassPhase = 0;
  let melodyPhase = 0;
  let fxPhase = 0;
  for (let i = 0; i < total; i += 1) {
    const t = i / sampleRate;
    const beat = t / beatSeconds;
    let value = 0;
    if (category === 'drums') {
      for (const kickBeat of kickPattern(variant)) {
        const tau = t - kickBeat * beatSeconds;
        if (tau >= 0 && tau < beatSeconds * 0.24) value += kick(tau, 56 + variant) * 0.95;
      }
      for (const snareBeat of [1, 3]) {
        const tau = t - snareBeat * beatSeconds;
        if (tau >= 0 && tau < beatSeconds * 0.2) value += noise(i, variant) * Math.exp(-18 * tau / beatSeconds) * 0.42;
      }
      const step = hatStep(variant);
      const hatTau = t - Math.floor(beat / step) * step * beatSeconds;
      if (hatTau < beatSeconds * 0.05) value += noise(i, variant + 3) * Math.exp(-24 * hatTau / beatSeconds) * 0.18;
    } else if (category === 'bass') {
      const step = Math.floor(beat * 2) % bassNotes.length;
      const freq = 55 * 2 ** (bassNotes[(step + variant) % bassNotes.length] / 12);
      bassPhase = (bassPhase + freq / sampleRate) % 1;
      const rhythm = genre === 'edm' ? (beat % 0.5 < 0.3 ? 1 : 0.35) : genre === 'pop' ? 0.85 : 1;
      value = Math.tanh((bassPhase * 2 - 1) * 1.8) * rhythm * (0.55 + 0.15 * Math.sin(beat * Math.PI));
      value *= Math.exp(-3 * (beat % 0.5));
    } else if (category === 'melody') {
      const step = Math.floor(beat * 2) % melodyNotes.length;
      const freq = 220 * 2 ** (melodyNotes[(step + variant) % melodyNotes.length] / 12);
      melodyPhase = (melodyPhase + freq / sampleRate) % 1;
      value = (Math.sin(2 * Math.PI * melodyPhase) + 0.4 * Math.sin(4 * Math.PI * melodyPhase)) * 0.35;
      value *= Math.exp(-4 * (beat % 0.5));
    } else {
      const sweep = 180 + (variant % 4) * 90 + beat * 28;
      fxPhase = (fxPhase + sweep / sampleRate) % 1;
      const fade = Math.sin(Math.PI * i / total);
      value = Math.sin(2 * Math.PI * fxPhase) * fade * 0.28 + noise(i, variant) * 0.05 * fade;
    }
    data[i] = Math.max(-0.98, Math.min(0.98, value));
  }
  return data;
}

function kick(tau, base) {
  const phase = 2 * Math.PI * (base * tau + 58 * (beatSeconds / 15) * (1 - Math.exp(-15 * tau / beatSeconds)));
  return Math.sin(phase) * Math.exp(-12 * tau / beatSeconds);
}

function noise(i, seed) {
  const x = Math.sin((i + 1) * (seed + 12.9898)) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function encodeWav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, 44 + i * 2);
  }
  return buffer;
}
