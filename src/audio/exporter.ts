import { getLoop } from '../data/loopManifest';
import type { Project } from '../types/project';
import { barsToSeconds, volumeToDb } from '../utils/music';

const sampleRate = 44100;

export async function exportProjectPreviewWav(project: Project) {
  const duration = barsToSeconds(project.loopLengthBars, project.bpm) + 0.4;
  const samples = Math.ceil(duration * sampleRate);
  const left = new Float32Array(samples);
  const right = new Float32Array(samples);

  project.tracks.forEach((track, trackIndex) => {
    if (track.mute) return;
    const amp = Math.pow(10, volumeToDb(track.volume) / 20) * 0.18;
    const panL = track.pan <= 0 ? 1 : 1 - track.pan;
    const panR = track.pan >= 0 ? 1 : 1 + track.pan;
    track.clips.forEach((clip) => {
      if (clip.source.kind !== 'loop') return;
      const loop = getLoop(clip.source.loopId);
      const category = loop?.category ?? 'melody';
      const startSample = Math.floor((barsToSeconds(clip.startBar, project.bpm) + 0.2) * sampleRate);
      const clipSamples = Math.floor(barsToSeconds(clip.lengthBars, project.bpm) * sampleRate);
      const baseFrequency = category === 'bass' ? 55 : category === 'melody' ? 220 + trackIndex * 28 : 110;
      for (let index = 0; index < clipSamples && startSample + index < samples; index += 1) {
        const t = index / sampleRate;
        const beat = (t / (60 / project.bpm)) % 4;
        let value = 0;
        if (category === 'drums') {
          const kick = Math.exp(-((beat % 1) * 18)) * Math.sin(2 * Math.PI * 62 * t);
          const snare = beat > 1.9 && beat < 2.25 ? (Math.random() * 2 - 1) * 0.35 : 0;
          const hat = beat % 0.5 < 0.04 ? (Math.random() * 2 - 1) * 0.18 : 0;
          value = kick + snare + hat;
        } else if (category === 'fx') {
          value = Math.sin(2 * Math.PI * (baseFrequency + t * 80) * t) * Math.max(0, 1 - index / clipSamples);
        } else {
          const step = Math.floor(beat * 2) % 4;
          value = Math.sin(2 * Math.PI * baseFrequency * [1, 1.2, 1.5, 1.33][step] * t) * 0.7;
        }
        left[startSample + index] += value * amp * panL * clip.gain;
        right[startSample + index] += value * amp * panR * clip.gain;
      }
    });
  });

  return encodeWav(left, right);
}

function encodeWav(left: Float32Array, right: Float32Array) {
  const samples = left.length;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample * 2;
  const buffer = new ArrayBuffer(44 + samples * blockAlign);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples * blockAlign, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples * blockAlign, true);
  let offset = 44;
  for (let index = 0; index < samples; index += 1) {
    view.setInt16(offset, clamp16(left[index]), true);
    offset += 2;
    view.setInt16(offset, clamp16(right[index]), true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function clamp16(value: number) {
  const clipped = Math.max(-1, Math.min(1, value));
  return clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff;
}

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
