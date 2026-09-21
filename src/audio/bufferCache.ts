import * as Tone from 'tone';

const requests = new Map<string, Promise<Tone.ToneAudioBuffer>>();
const ready = new Map<string, Tone.ToneAudioBuffer>();

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
  for (const buffer of ready.values()) {
    approxBytes += buffer.length * buffer.numberOfChannels * Float32Array.BYTES_PER_ELEMENT;
  }
  return { count: ready.size, approxBytes };
}
