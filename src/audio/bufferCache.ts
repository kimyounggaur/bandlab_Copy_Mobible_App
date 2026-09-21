import * as Tone from 'tone';

const requests = new Map<string, Promise<Tone.ToneAudioBuffer>>();
const ready = new Map<string, Tone.ToneAudioBuffer>();
const blobRequests = new Map<string, Promise<Tone.ToneAudioBuffer>>();
const blobReady = new Map<string, Tone.ToneAudioBuffer>();

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
  for (const buffer of [...ready.values(), ...blobReady.values()]) {
    approxBytes += buffer.length * buffer.numberOfChannels * Float32Array.BYTES_PER_ELEMENT;
  }
  return { count: ready.size + blobReady.size, approxBytes };
}
