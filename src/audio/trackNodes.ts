import * as Tone from 'tone';
import { getBuffer, peekBuffer } from './bufferCache';
import { getLoop } from '../data/loopManifest';
import type { Clip, Project, Track } from '../types/project';
import { barsToSeconds, volumeToDb } from '../utils/music';

type TrackNode = {
  channel: Tone.Channel;
  delay: Tone.FeedbackDelay;
  reverb: Tone.Reverb;
  eq: Tone.EQ3;
  compressor: Tone.Compressor;
  meter: Tone.Meter;
};

type ClipSchedule = {
  hash: string;
  trackId: string;
  events: number[];
  active: Set<Tone.ToneBufferSource>;
};

class TrackScheduler {
  private nodes = new Map<string, TrackNode>();
  private clips = new Map<string, ClipSchedule>();
  private limiter: Tone.Limiter | null = null;
  private generation = 0;
  private structureKey = '';
  private bpm = 90;

  async syncProject(project: Project): Promise<void> {
    this.applyTransport(project);
    this.ensureNodes(project);
    this.applyTrackParams(project);

    const structureKey = JSON.stringify(project.tracks.map((track) => [track.id, track.clips.map((clip) => this.clipHash(clip))]));
    if (structureKey === this.structureKey) return;
    const generation = ++this.generation;
    const urls = project.tracks.flatMap((track) => track.clips.flatMap((clip) => {
      if (clip.source.kind !== 'loop') return [];
      const loop = getLoop(clip.source.loopId);
      return loop ? [loop.filePath] : [];
    }));
    await Promise.all([...new Set(urls)].map((url) => getBuffer(url)));
    if (generation !== this.generation) return;

    this.removeMissingTracks(project);
    for (const track of project.tracks) this.reconcileClips(track);
    this.structureKey = structureKey;
  }

  applyTrackParams(project: Project): void {
    const hasSolo = project.tracks.some((track) => track.solo);
    for (const track of project.tracks) {
      const node = this.nodes.get(track.id);
      if (!node) continue;
      node.channel.volume.rampTo(volumeToDb(track.volume), 0.02);
      node.channel.pan.rampTo(track.pan, 0.02);
      node.channel.mute = track.mute || (hasSolo && !track.solo);
      this.applyEffects(track, node);
    }
  }

  applyTransport(project: Project): void {
    if (this.bpm !== project.bpm) {
      this.bpm = project.bpm;
      Tone.Transport.bpm.rampTo(project.bpm, 0.02);
      for (const schedule of this.clips.values()) {
        for (const source of schedule.active) source.playbackRate.rampTo(project.bpm / 90, 0.02);
      }
    }
    Tone.Transport.loop = true;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = `${project.loopLengthBars}m`;
  }

  reconcileClips(track: Track): void {
    const liveIds = new Set(track.clips.map((clip) => clip.id));
    for (const [clipId, schedule] of this.clips) {
      if (schedule.trackId === track.id && !liveIds.has(clipId)) this.clearClip(clipId);
    }
    for (const clip of track.clips) {
      const hash = this.clipHash(clip);
      if (this.clips.get(clip.id)?.hash === hash) continue;
      this.clearClip(clip.id);
      if (clip.source.kind !== 'loop') continue;
      const loop = getLoop(clip.source.loopId);
      const node = this.nodes.get(track.id);
      if (!loop || !node) continue;
      const schedule: ClipSchedule = { hash, trackId: track.id, events: [], active: new Set() };
      const repeats = Math.max(1, Math.ceil(clip.lengthBars / loop.bars));
      for (let index = 0; index < repeats; index += 1) {
        const startBar = clip.startBar + index * loop.bars;
        const segmentBars = Math.min(loop.bars, clip.startBar + clip.lengthBars - startBar);
        if (segmentBars <= 0) continue;
        const eventId = Tone.Transport.schedule((time) => {
          const audioBuffer = peekBuffer(loop.filePath);
          if (!audioBuffer) return;
          const source = new Tone.ToneBufferSource({
            url: audioBuffer,
            fadeIn: 0.005,
            fadeOut: 0.02,
            playbackRate: this.bpm / 90,
          }).connect(node.eq);
          source.onended = () => {
            schedule.active.delete(source);
            source.dispose();
          };
          schedule.active.add(source);
          source.start(time, 0, barsToSeconds(segmentBars, this.bpm), clip.gain);
        }, barsToTonePosition(startBar));
        schedule.events.push(eventId);
      }
      this.clips.set(clip.id, schedule);
    }
  }

  getMeters(): Record<string, number> {
    const meters: Record<string, number> = {};
    for (const [trackId, node] of this.nodes) {
      const value = node.meter.getValue();
      meters[trackId] = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 0;
    }
    return meters;
  }

  getMasterInput(): Tone.Limiter {
    this.limiter ??= new Tone.Limiter(-1).toDestination();
    return this.limiter;
  }

  dispose(): void {
    this.generation += 1;
    for (const clipId of this.clips.keys()) this.clearClip(clipId);
    for (const node of this.nodes.values()) this.disposeNode(node);
    this.nodes.clear();
    this.limiter?.dispose();
    this.limiter = null;
    this.structureKey = '';
  }

  private ensureNodes(project: Project): void {
    for (const track of project.tracks) {
      if (this.nodes.has(track.id)) continue;
      const eq = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
      const compressor = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.01, release: 0.12 });
      const delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.25, wet: 0 });
      const reverb = new Tone.Reverb({ decay: 1.2, wet: 0 });
      const channel = new Tone.Channel({ volume: volumeToDb(track.volume), pan: track.pan });
      const meter = new Tone.Meter({ normalRange: true });
      eq.chain(compressor, delay, reverb, channel, this.getMasterInput());
      channel.connect(meter);
      this.nodes.set(track.id, { channel, delay, reverb, eq, compressor, meter });
    }
  }

  private removeMissingTracks(project: Project): void {
    const ids = new Set(project.tracks.map((track) => track.id));
    for (const [trackId, node] of this.nodes) {
      if (ids.has(trackId)) continue;
      for (const [clipId, schedule] of this.clips) {
        if (schedule.trackId === trackId) this.clearClip(clipId);
      }
      this.disposeNode(node);
      this.nodes.delete(trackId);
    }
  }

  private clearClip(clipId: string): void {
    const schedule = this.clips.get(clipId);
    if (!schedule) return;
    for (const eventId of schedule.events) Tone.Transport.clear(eventId);
    for (const source of schedule.active) source.stop(Tone.immediate() + 0.005);
    this.clips.delete(clipId);
  }

  private disposeNode(node: TrackNode): void {
    node.eq.dispose();
    node.compressor.dispose();
    node.delay.dispose();
    node.reverb.dispose();
    node.channel.dispose();
    node.meter.dispose();
  }

  private applyEffects(track: Track, node: TrackNode): void {
    node.reverb.wet.rampTo(track.effects.reverb.on ? track.effects.reverb.amount / 200 : 0, 0.02);
    if (node.reverb.decay !== (track.effects.reverb.mode === 'hall' ? 2.8 : 1.1)) {
      node.reverb.decay = track.effects.reverb.mode === 'hall' ? 2.8 : 1.1;
    }
    node.delay.wet.rampTo(track.effects.delay.on ? track.effects.delay.amount / 250 : 0, 0.02);
    node.delay.delayTime.value = track.effects.delay.sync;
    const tilt = track.effects.tone.on ? track.effects.tone.tilt - 50 : 0;
    node.eq.high.rampTo(tilt / 8, 0.02);
    node.eq.low.rampTo(track.effects.tone.bassBoost ? 3 : -tilt / 12, 0.02);
    node.compressor.ratio.value = track.effects.vocalPreset ? 4 : 1;
  }

  private clipHash(clip: Clip): string {
    return JSON.stringify([clip.id, clip.startBar, clip.lengthBars, clip.source, clip.gain]);
  }
}

function barsToTonePosition(positionBars: number): string {
  const bar = Math.floor(positionBars);
  const beatFloat = (positionBars - bar) * 4;
  const beat = Math.floor(beatFloat);
  const sixteenth = Math.round((beatFloat - beat) * 4);
  return `${bar}:${beat}:${sixteenth}`;
}

export const trackScheduler = new TrackScheduler();
