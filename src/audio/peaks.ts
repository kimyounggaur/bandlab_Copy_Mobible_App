import type * as Tone from 'tone';
import { getBuffer, getBufferFromBlob } from './bufferCache';
import { getLoop } from '../data/loopManifest';
import { loadAudioBlob } from '../storage/db';
import type { Clip } from '../types/project';

const peakCache = new Map<string, { sourceKey: string; result: Promise<number[] | null> }>();

export function computePeaks(buffer: Tone.ToneAudioBuffer, bucketCount = 96): number[] {
  const peaks = new Array<number>(bucketCount).fill(0);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel));
  for (let index = 0; index < buffer.length; index += 1) {
    const bucket = Math.min(bucketCount - 1, Math.floor(index * bucketCount / buffer.length));
    for (const channel of channels) peaks[bucket] = Math.max(peaks[bucket], Math.abs(channel[index]));
  }
  return peaks;
}

export function getPeaksForClip(clip: Clip): Promise<number[] | null> {
  const sourceKey = JSON.stringify(clip.source);
  const existing = peakCache.get(clip.id);
  if (existing?.sourceKey === sourceKey) return existing.result;
  const result = loadClipPeaks(clip).catch(() => null);
  peakCache.set(clip.id, { sourceKey, result });
  return result;
}

async function loadClipPeaks(clip: Clip): Promise<number[] | null> {
  if (clip.source.kind === 'notes') return null;
  let buffer: Tone.ToneAudioBuffer;
  if (clip.source.kind === 'loop') {
    const loop = getLoop(clip.source.loopId);
    if (!loop) return null;
    buffer = await getBuffer(loop.filePath);
  } else {
    const blob = await loadAudioBlob(clip.source.audioId);
    if (!blob) return null;
    buffer = await getBufferFromBlob(clip.source.audioId, blob);
  }
  if (buffer.duration < 30) return computePeaks(buffer);
  const peaks = new Array<number>(96).fill(0);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel));
  let start = 0;
  async function nextChunk(): Promise<number[]> {
    if (start >= buffer.length) return peaks;
    const end = Math.min(buffer.length, start + 4096);
    for (let index = start; index < end; index += 1) {
      const bucket = Math.min(95, Math.floor(index * 96 / buffer.length));
      for (const channel of channels) peaks[bucket] = Math.max(peaks[bucket], Math.abs(channel[index]));
    }
    start = end;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    return nextChunk();
  }
  return nextChunk();
}
