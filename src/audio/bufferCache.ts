import * as Tone from 'tone';
import { loadMeta, saveMeta } from '../storage/db';
import type { LoopManifestItem } from '../types/project';

const requests = new Map<string, Promise<Tone.ToneAudioBuffer>>();
const ready = new Map<string, Tone.ToneAudioBuffer>();
const loopRequests = new Map<string, Promise<Tone.ToneAudioBuffer>>();
const loopReady = new Map<string, Tone.ToneAudioBuffer>();
const blobRequests = new Map<string, Promise<Tone.ToneAudioBuffer>>();
const blobReady = new Map<string, Tone.ToneAudioBuffer>();
let formatSupportPromise: Promise<Record<string, boolean>> | null = null;
class AudioFormatError extends Error {}

export function getBuffer(url: string): Promise<Tone.ToneAudioBuffer> {
  const existing = requests.get(url);
  if (existing) return existing;
  const buffer = new Tone.ToneAudioBuffer();
  const request = buffer.load(url).then(
    (loaded) => {
      ready.set(url, loaded);
      return loaded;
    },
    (error: unknown) => {
      requests.delete(url);
      buffer.dispose();
      throw error;
    },
  );
  requests.set(url, request);
  return request;
}

export function peekBuffer(url: string): Tone.ToneAudioBuffer | null {
  return ready.get(url) ?? null;
}

export function getLoopBuffer(loop: LoopManifestItem): Promise<Tone.ToneAudioBuffer> {
  const existing = loopRequests.get(loop.id);
  if (existing) return existing;
  const request = loadLoopBuffer(loop).then((buffer) => {
    loopReady.set(loop.id, buffer);
    return buffer;
  }).catch((error: unknown) => {
    loopRequests.delete(loop.id);
    throw error;
  });
  loopRequests.set(loop.id, request);
  return request;
}

export function peekLoopBuffer(loop: LoopManifestItem): Tone.ToneAudioBuffer | null {
  return loopReady.get(loop.id) ?? null;
}

export async function isLoopCached(loop: LoopManifestItem): Promise<boolean> {
  if (loopReady.has(loop.id)) return true;
  if (!('caches' in globalThis)) return false;
  for (const url of Object.values(loop.files)) {
    // eslint-disable-next-line no-await-in-loop
    if (await caches.match(url, { ignoreSearch: true })) return true;
  }
  return false;
}

async function loadLoopBuffer(loop: LoopManifestItem): Promise<Tone.ToneAudioBuffer> {
  const support = await getFormatSupport();
  let lastError: unknown;
  for (const [format, url] of Object.entries(loop.files)) {
    if (support[format] === false) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      const decoded = await decodeLoopFormat(url);
      const expectedFrames = Math.round(loop.frames * decoded.sampleRate / loop.sampleRate);
      const difference = decoded.length - expectedFrames;
      if (difference < 0 || difference > decoded.sampleRate * 0.05) {
        throw new AudioFormatError(`${format} decoded with an invalid frame count: ${difference}`);
      }
      const aligned = difference > 0 ? trimAudioBuffer(decoded, expectedFrames) : decoded;
      const buffer = new Tone.ToneAudioBuffer(aligned);
      if (support[format] !== true) {
        support[format] = true;
        void saveMeta('audio-format-support', support).catch(() => undefined);
      }
      return buffer;
    } catch (error) {
      lastError = error;
      // A network failure says nothing about the browser's decoder.
      if (error instanceof AudioFormatError) {
        support[format] = false;
        void saveMeta('audio-format-support', support).catch(() => undefined);
      }
    }
  }
  throw lastError ?? new Error(`No supported audio format for ${loop.id}`);
}

export async function decodeLoopFormat(url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Audio request failed: ${response.status}`);
  try {
    return await Tone.getContext().decodeAudioData(await response.arrayBuffer());
  } catch {
    throw new AudioFormatError(`Cannot decode ${url}`);
  }
}

function trimAudioBuffer(buffer: AudioBuffer, length: number): AudioBuffer {
  const trimmed = Tone.getContext().rawContext.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    trimmed.copyToChannel(buffer.getChannelData(channel).subarray(0, length), channel);
  }
  return trimmed;
}

async function getFormatSupport(): Promise<Record<string, boolean>> {
  formatSupportPromise ??= loadMeta<Record<string, boolean>>('audio-format-support')
    .then((value) => value ?? {})
    .catch(() => ({}));
  return formatSupportPromise;
}

export function getBufferFromBlob(audioId: string, blob: Blob): Promise<Tone.ToneAudioBuffer> {
  const existing = blobRequests.get(audioId);
  if (existing) return existing;
  const request = blob.arrayBuffer()
    .then((data) => Tone.getContext().decodeAudioData(data))
    .then((decoded) => {
      const buffer = new Tone.ToneAudioBuffer(decoded);
      blobReady.set(audioId, buffer);
      return buffer;
    })
    .catch((error: unknown) => {
      blobRequests.delete(audioId);
      throw error;
    });
  blobRequests.set(audioId, request);
  return request;
}

export function peekBlobBuffer(audioId: string): Tone.ToneAudioBuffer | null {
  return blobReady.get(audioId) ?? null;
}

export async function preloadBuffers(urls: string[]): Promise<void> {
  await Promise.all([...new Set(urls)].map((url) => getBuffer(url)));
}

export function disposeBuffer(url: string): void {
  ready.get(url)?.dispose();
  ready.delete(url);
  requests.delete(url);
}

export function getCacheStats(): { count: number; approxBytes: number } {
  let approxBytes = 0;
  for (const buffer of [...ready.values(), ...loopReady.values(), ...blobReady.values()]) {
    approxBytes += buffer.length * buffer.numberOfChannels * Float32Array.BYTES_PER_ELEMENT;
  }
  return { count: ready.size + loopReady.size + blobReady.size, approxBytes };
}
