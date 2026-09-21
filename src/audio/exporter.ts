import * as Tone from 'tone';
import { getLoopBuffer, getBufferFromBlob } from './bufferCache';
import { buildRenderGraph } from './renderGraph';
import { getLoop } from '../data/loopManifest';
import { loadAudioBlob } from '../storage/db';
import type { Project } from '../types/project';
import { barsToSeconds } from '../utils/music';

export type ExportOptions = {
  sampleRate?: 44100 | 48000;
  bitDepth?: 16 | 24;
  tailSeconds?: number;
  onProgress?: (ratio: number) => void;
};

export async function exportProjectWav(project: Project, options: ExportOptions = {}): Promise<Blob> {
  const sampleRate = options.sampleRate ?? 44100;
  const bitDepth = options.bitDepth ?? 16;
  const duration = barsToSeconds(project.loopLengthBars, project.bpm) + (options.tailSeconds ?? 2);
  const buffers = new Map<string, Tone.ToneAudioBuffer>();
  const clips = project.tracks.flatMap((track) => track.clips);
  await Promise.all(clips.map(async (clip) => {
    if (clip.source.kind === 'loop') {
      const loop = getLoop(clip.source.loopId);
      if (loop && !buffers.has(loop.files.wav)) buffers.set(loop.files.wav, await getLoopBuffer(loop));
    } else if (clip.source.kind === 'recording') {
      const key = `audio:${clip.source.audioId}`;
      if (buffers.has(key)) return;
      const blob = await loadAudioBlob(clip.source.audioId);
      if (!blob) throw new Error(`Recording is missing: ${clip.name}`);
      buffers.set(key, await getBufferFromBlob(clip.source.audioId, blob));
    }
  }));
  options.onProgress?.(0.3);
  const rendered = await Tone.Offline(async (context) => {
    await buildRenderGraph(project, context, buffers);
  }, duration, 2, sampleRate);
  options.onProgress?.(0.9);
  const blob = encodeWav(rendered.getChannelData(0), rendered.getChannelData(1), sampleRate, bitDepth);
  options.onProgress?.(1);
  return blob;
}

export function encodeWav(left: Float32Array, right: Float32Array, sampleRate: number, bitDepth: 16 | 24): Blob {
  if (left.length !== right.length) throw new Error('Stereo channels must have equal length');
  const bytesPerSample = bitDepth / 8;
  const blockAlign = bytesPerSample * 2;
  const dataLength = left.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  let offset = 44;
  for (let index = 0; index < left.length; index += 1) {
    offset = writeSample(view, offset, left[index], bitDepth);
    offset = writeSample(view, offset, right[index], bitDepth);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function writeSample(view: DataView, offset: number, value: number, bitDepth: 16 | 24): number {
  const clipped = Math.max(-1, Math.min(1, value));
  if (bitDepth === 16) {
    view.setInt16(offset, Math.round(clipped * (clipped < 0 ? 32768 : 32767)), true);
    return offset + 2;
  }
  const encoded = Math.round(clipped * (clipped < 0 ? 8388608 : 8388607));
  view.setUint8(offset, encoded & 0xff);
  view.setUint8(offset + 1, (encoded >> 8) & 0xff);
  view.setUint8(offset + 2, (encoded >> 16) & 0xff);
  return offset + 3;
}

function writeString(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}
