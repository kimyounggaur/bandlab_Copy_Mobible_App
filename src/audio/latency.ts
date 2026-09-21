import * as Tone from 'tone';
import { loadMeta, saveMeta } from '../storage/db';

const metaKey = 'latency-pipeline';
let measurement: Promise<number> | null = null;

export async function getPipelineLatency(): Promise<number> {
  const saved = await loadMeta<number>(metaKey);
  if (typeof saved === 'number' && Number.isFinite(saved)) return saved;
  return measurePipelineLatency();
}

export function measurePipelineLatency(force = false): Promise<number> {
  if (measurement && !force) return measurement;
  measurement = measureSeries(5, [])
    .then(async (samples) => {
      const sorted = samples.sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      await saveMeta(metaKey, median);
      return median;
    })
    .finally(() => { measurement = null; });
  return measurement;
}

async function measureSeries(remaining: number, samples: number[]): Promise<number[]> {
  if (remaining === 0) return samples;
  const value = await measureOnce();
  return measureSeries(remaining - 1, [...samples, value]);
}

async function measureOnce(): Promise<number> {
  const context = Tone.getContext();
  const destination = context.createMediaStreamDestination();
  const mimeType = ['audio/webm;codecs=opus', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(destination.stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size) chunks.push(event.data);
  });
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.addEventListener('stop', () => resolve(), { once: true });
    recorder.addEventListener('error', () => reject(new Error('Loopback recording failed')), { once: true });
  });
  recorder.start();
  const recordStart = context.rawContext.currentTime;
  const clickTime = recordStart + 0.1;
  const rate = context.rawContext.sampleRate;
  const pulse = context.rawContext.createBuffer(1, Math.ceil(rate * 0.001), rate);
  pulse.getChannelData(0).fill(0.9);
  const source = context.rawContext.createBufferSource();
  source.buffer = pulse;
  source.connect(destination);
  source.start(clickTime);
  await new Promise<void>((resolve) => window.setTimeout(resolve, 240));
  recorder.stop();
  await stopped;
  source.disconnect();
  destination.disconnect();
  const decoded = await context.decodeAudioData(await new Blob(chunks, { type: recorder.mimeType }).arrayBuffer());
  const data = decoded.getChannelData(0);
  let peakIndex = 0;
  let peak = 0;
  for (let index = 0; index < data.length; index += 1) {
    const amplitude = Math.abs(data[index]);
    if (amplitude > peak) {
      peak = amplitude;
      peakIndex = index;
    }
  }
  if (peak < 0.03) throw new Error('Loopback pulse was not captured');
  // Digital loopback is an approximation; it does not include the microphone hardware path.
  return peakIndex / decoded.sampleRate - (clickTime - recordStart);
}
