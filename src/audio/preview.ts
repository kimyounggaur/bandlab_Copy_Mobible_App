import * as Tone from 'tone';
import { getBuffer } from './bufferCache';
import { audioEngine } from './engine';
import { pickStretchMode } from './stretch';
import { trackScheduler } from './trackNodes';
import { getLoop } from '../data/loopManifest';
import { useProjectStore } from '../stores/projectStore';
import { barsToSeconds, barsToTonePosition } from '../utils/music';

class LoopPreview {
  private id: string | null = null;
  private generation = 0;
  private eventId: number | null = null;
  private bus: Tone.Gain | null = null;
  private sources = new Set<Tone.ToneBufferSource>();
  private grain: Tone.GrainPlayer | null = null;
  private listeners = new Set<(id: string | null) => void>();

  subscribe(listener: (id: string | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.id);
    return () => { this.listeners.delete(listener); };
  }

  async toggle(loopId: string): Promise<void> {
    if (this.id === loopId) {
      this.stop();
      return;
    }
    this.stop();
    const loop = getLoop(loopId);
    if (!loop) return;
    this.id = loopId;
    const generation = this.generation;
    this.emit();
    try {
      await audioEngine.ensureReady();
      const buffer = await getBuffer(loop.files.wav);
      if (generation !== this.generation) return;
      this.bus ??= new Tone.Gain().connect(trackScheduler.getMasterInput());
      const project = useProjectStore.getState().currentProject;
      const bpm = project.bpm;
      const duration = barsToSeconds(loop.bars, bpm);
      const mode = pickStretchMode(loop.category, bpm / loop.sourceBpm);
      const start = (time: number) => {
        if (generation !== this.generation) return;
        this.eventId = null;
        if (mode === 'grain') {
          const grain = new Tone.GrainPlayer({
            url: buffer, playbackRate: bpm / loop.sourceBpm,
            detune: 0, grainSize: 0.2, overlap: 0.1,
            onstop: () => {
              if (this.grain === grain) this.finish();
              grain.dispose();
            },
          }).connect(this.bus!);
          this.grain = grain;
          grain.start(time, 0, duration);
        } else if (mode === 'slice') {
          const sourceSliceSeconds = barsToSeconds(1 / 16, loop.sourceBpm);
          const targetSliceSeconds = barsToSeconds(1 / 16, bpm);
          for (let i = 0; i < loop.bars * 16; i += 1) {
            const source = new Tone.ToneBufferSource({ url: buffer, fadeIn: 0.001, fadeOut: 0.003 }).connect(this.bus!);
            source.onended = () => this.endSource(source);
            this.sources.add(source);
            source.start(time + i * targetSliceSeconds, i * sourceSliceSeconds, Math.min(sourceSliceSeconds, targetSliceSeconds));
          }
        } else {
          const source = new Tone.ToneBufferSource({
            url: buffer, fadeIn: 0.005, fadeOut: 0.02, playbackRate: bpm / loop.sourceBpm,
          }).connect(this.bus!);
          source.onended = () => this.endSource(source);
          this.sources.add(source);
          source.start(time, 0, duration);
        }
      };
      if (audioEngine.getState().playing) {
        const nextBar = Math.ceil(audioEngine.getPositionInBars() + 0.0001) % project.loopLengthBars;
        this.eventId = Tone.getTransport().scheduleOnce(start, barsToTonePosition(nextBar));
      } else {
        start(Tone.immediate());
      }
    } catch (error) {
      if (generation === this.generation) this.stop();
      throw error;
    }
  }

  stop(): void {
    this.generation += 1;
    if (this.eventId !== null) Tone.getTransport().clear(this.eventId);
    this.eventId = null;
    for (const source of this.sources) {
      source.onended = () => source.dispose();
      source.stop(Tone.immediate() + 0.005);
    }
    this.sources.clear();
    if (this.grain) {
      this.grain.stop(Tone.immediate() + 0.005);
      this.grain = null;
    }
    if (this.id !== null) {
      this.id = null;
      this.emit();
    }
  }

  private endSource(source: Tone.ToneBufferSource): void {
    this.sources.delete(source);
    source.dispose();
    if (this.sources.size === 0) this.finish();
  }

  private finish(): void {
    this.id = null;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.id);
  }
}

export const loopPreview = new LoopPreview();
