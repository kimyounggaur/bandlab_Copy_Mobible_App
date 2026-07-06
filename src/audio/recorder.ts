import { createId } from '../utils/ids';
import { saveAudioBlob } from '../storage/db';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'ready' | 'denied' | 'error';

export class MicRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];

  async request() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    return this.stream;
  }

  async start() {
    if (!this.stream) await this.request();
    const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : '';
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream!, mimeType ? { mimeType } : undefined);
    this.recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    });
    this.recorder.start();
  }

  async stop() {
    const recorder = this.recorder;
    if (!recorder) throw new Error('Recorder is not active');
    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
      recorder.stop();
    });
    const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' });
    const audioId = createId('audio');
    await saveAudioBlob(audioId, blob);
    return { audioId, blob };
  }

  dispose() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  }
}
