import * as Tone from 'tone';
import { saveLatencyCalibration, type LatencyCalibration } from './latency';

export function analyzeCalibration(
  samples: Float32Array,
  sampleRate: number,
  expectedSeconds: number[],
): { L: number; deviation: number } {
  const offsets: number[] = [];
  const windowFrames = Math.max(1, Math.round(sampleRate * 0.005));
  for (const expected of expectedSeconds.slice(2)) {
    const from = Math.max(0, Math.floor((expected - 0.1) * sampleRate));
    const to = Math.min(samples.length - windowFrames, Math.floor((expected + 0.35) * sampleRate));
    let bestIndex = -1;
    let bestEnergy = 0;
    for (let index = from; index < to; index += windowFrames) {
      let energy = 0;
      for (let sample = index; sample < index + windowFrames; sample += 1) energy += samples[sample] ** 2;
      if (energy > bestEnergy) {
        bestEnergy = energy;
        bestIndex = index;
      }
    }
    if (bestIndex >= 0 && bestEnergy > windowFrames * 0.0001) offsets.push(bestIndex / sampleRate - expected);
  }
  if (offsets.length < 5) throw new Error('Not enough claps or clicks were captured');
  const sorted = offsets.sort((a, b) => a - b);
  const L = (sorted[2] + sorted[3]) / 2;
  const deviation = Math.max(...offsets.map((offset) => Math.abs(offset - L)));
  return { L, deviation };
}

export async function measureCalibration(
  method: 'clap' | 'speaker',
  bpm: number,
): Promise<LatencyCalibration & { stable: boolean }> {
  const context = Tone.getContext().rawContext as AudioContext;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  source.connect(analyser);
  const mimeType = ['audio/mp4', 'audio/webm;codecs=opus'].find((type) => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size) chunks.push(event.data);
  });
  const stopped = new Promise<void>((resolve) => recorder.addEventListener('stop', () => resolve(), { once: true }));
  try {
    const R = context.currentTime;
    recorder.start();
    const beatSeconds = 60 / bpm;
    const t0 = context.currentTime + 1.5;
    const clickTimes = Array.from({ length: 8 }, (_, index) => t0 + index * beatSeconds);
    for (const time of clickTimes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 1000;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.3, time + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.035);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, (1.5 + 8 * beatSeconds + 0.3) * 1000));
    recorder.stop();
    await stopped;
    const decoded = await Tone.getContext().decodeAudioData(await new Blob(chunks, { type: recorder.mimeType }).arrayBuffer());
    const result = analyzeCalibration(decoded.getChannelData(0), decoded.sampleRate, clickTimes.map((time) => time - R));
    const calibration = { ...result, method, measuredAt: Date.now() };
    const stable = result.deviation <= 0.04;
    if (stable) await saveLatencyCalibration(calibration);
    return { ...calibration, stable };
  } finally {
    if (recorder.state === 'recording') recorder.stop();
    source.disconnect();
    analyser.disconnect();
    stream.getTracks().forEach((track) => track.stop());
  }
}
