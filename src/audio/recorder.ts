import * as Tone from 'tone';
import { getBufferFromBlob } from './bufferCache';
import { createId } from '../utils/ids';
import { saveAudioBlob } from '../storage/db';

export type RecorderState = 'idle' | 'requesting' | 'calibrating' | 'counting' | 'recording' | 'ready' | 'denied' | 'error';
export type RecordingAnchor = {
  startBar: number;
  contextTime: number;
  recorderStartedAt: number;
  bpm: number;
};

export class MicRecorder {
  private stream: MediaStream | null = null;
  private streamEchoCancellation = false;
  private recorder: MediaRecorder | null = null;
  private anchor: RecordingAnchor | null = null;
  private chunks: BlobPart[] = [];
  private monitorSource: MediaStreamAudioSourceNode | null = null;
  private monitorLimiter: Tone.Limiter | null = null;
  private monitorAnalyser: AnalyserNode | null = null;
  private monitorTimer: number | null = null;

  async request(echoCancellation = false): Promise<MediaStream> {
    if (this.stream && this.streamEchoCancellation === echoCancellation) return this.stream;
    this.setMonitoring(false);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    this.streamEchoCancellation = echoCancellation;
    return this.stream;
  }

  getInputLatency(): number {
    const value = (this.stream?.getAudioTracks()[0]?.getSettings() as MediaTrackSettings & { latency?: number } | undefined)?.latency;
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  start(anchor: Omit<RecordingAnchor, 'recorderStartedAt'>): RecordingAnchor {
    if (!this.stream) throw new Error('Microphone has not been requested');
    const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : '';
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    });
    const recorderStartedAt = Tone.getContext().rawContext.currentTime;
    this.recorder.start();
    this.anchor = { ...anchor, recorderStartedAt };
    return this.anchor;
  }

  async stop(): Promise<{ audioId: string; blob: Blob; durationSec: number; anchor: RecordingAnchor }> {
    const recorder = this.recorder;
    const anchor = this.anchor;
    if (!recorder || !anchor) throw new Error('Recorder is not active');
    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
      recorder.stop();
    });
    const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' });
    const audioId = createId('audio');
    await saveAudioBlob(audioId, blob);
    const durationSec = (await getBufferFromBlob(audioId, blob)).duration;
    this.recorder = null;
    this.anchor = null;
    return { audioId, blob, durationSec, anchor };
  }

  async cancel(): Promise<void> {
    const recorder = this.recorder;
    if (recorder?.state === 'recording') {
      await new Promise<void>((resolve) => {
        recorder.addEventListener('stop', () => resolve(), { once: true });
        recorder.stop();
      });
    }
    this.recorder = null;
    this.anchor = null;
    this.chunks = [];
  }

  setMonitoring(enabled: boolean, onFeedback?: () => void): void {
    if (!enabled) {
      if (this.monitorTimer !== null) window.clearInterval(this.monitorTimer);
      this.monitorTimer = null;
      this.monitorSource?.disconnect();
      this.monitorAnalyser?.disconnect();
      this.monitorLimiter?.dispose();
      this.monitorSource = null;
      this.monitorAnalyser = null;
      this.monitorLimiter = null;
      return;
    }
    if (!this.stream || this.monitorSource) return;
    const context = Tone.getContext().rawContext as AudioContext;
    const source = context.createMediaStreamSource(this.stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    const limiter = new Tone.Limiter(-6).toDestination();
    Tone.connect(source, limiter);
    source.connect(analyser);
    this.monitorSource = source;
    this.monitorAnalyser = analyser;
    this.monitorLimiter = limiter;
    const samples = new Float32Array(analyser.fftSize);
    let hotSince: number | null = null;
    this.monitorTimer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let peak = 0;
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
      hotSince = peak >= 0.95 ? hotSince ?? performance.now() : null;
      if (hotSince !== null && performance.now() - hotSince >= 1000) {
        this.setMonitoring(false);
        onFeedback?.();
      }
    }, 100);
  }

  dispose(): void {
    this.setMonitoring(false);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
    this.anchor = null;
    this.chunks = [];
  }
}
