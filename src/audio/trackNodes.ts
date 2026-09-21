import * as Tone from 'tone';
import { audioEngine } from './engine';
import { getBuffer, getBufferFromBlob, peekBlobBuffer, peekBuffer } from './bufferCache';
import { applyTrackSettings, buildRenderGraph, type TrackNode } from './renderGraph';
import { pickStretchMode, type StretchMode } from './stretch';
import { getLoop } from '../data/loopManifest';
import { loadAudioBlob } from '../storage/db';
import type { Clip, Project, Track } from '../types/project';
import { barsToSeconds, barsToTonePosition, volumeToDb } from '../utils/music';

type ClipSchedule = {
  hash: string;
  trackId: string;
  events: number[];
  active: Set<Tone.ToneBufferSource>;
  kind: Clip['source']['kind'];
  sourceBpm?: number;
  stretchMode?: StretchMode;
  grain?: Tone.GrainPlayer;
  grainGain?: Tone.Gain;
  part?: Tone.Part;
};

class TrackScheduler {
  private nodes = new Map<string, TrackNode>();
  private clips = new Map<string, ClipSchedule>();
  private limiter: Tone.Limiter | null = null;
  private masterInput: Tone.Volume | null = null;
  private masterMeter: Tone.Meter | null = null;
  private generation = 0;
  private structureKey = '';
  private bpm = 90;
  private nodeBuild: Promise<void> | null = null;
  private clipStatus = new Map<string, 'missing' | 'loading' | 'ready'>();

  async syncProject(project: Project): Promise<void> {
    this.applyTransport(project);
    await this.ensureNodes(project);
    this.applyTrackParams(project);

    const structureKey = JSON.stringify(project.tracks.map((track) => [track.id, track.clips.map((clip) => this.clipHash(clip))]));
    if (structureKey === this.structureKey) return;
    const generation = ++this.generation;
    await Promise.all(project.tracks.flatMap((track) => track.clips.map(async (clip) => {
      if (clip.source.kind === 'loop') {
        const loop = getLoop(clip.source.loopId);
        if (loop) await getBuffer(loop.files.wav);
      } else if (clip.source.kind === 'recording') {
        this.clipStatus.set(clip.id, 'loading');
        try {
          const blob = await loadAudioBlob(clip.source.audioId);
          if (!blob) {
            this.clipStatus.set(clip.id, 'missing');
            return;
          }
          await getBufferFromBlob(clip.source.audioId, blob);
          this.clipStatus.set(clip.id, 'ready');
        } catch {
          this.clipStatus.set(clip.id, 'missing');
        }
      } else {
        this.clipStatus.set(clip.id, 'ready');
      }
    })));
    if (generation !== this.generation) return;

    this.removeMissingTracks(project);
    for (const track of project.tracks) this.reconcileClips(track);
    this.structureKey = structureKey;
  }

  applyTrackParams(project: Project): void {
    this.masterInput?.volume.rampTo(volumeToDb(project.masterVolume), 0.02);
    const hasSolo = project.tracks.some((track) => track.solo);
    for (const track of project.tracks) {
      const node = this.nodes.get(track.id);
      if (!node) continue;
      applyTrackSettings(track, node, hasSolo);
    }
  }

  applyTransport(project: Project): void {
    if (this.bpm !== project.bpm) {
      this.bpm = project.bpm;
      for (const schedule of this.clips.values()) {
        if (schedule.kind === 'loop') {
          const ratio = project.bpm / (schedule.sourceBpm ?? project.bpm);
          if (schedule.stretchMode === 'resample') {
            for (const source of schedule.active) source.playbackRate.rampTo(ratio, 0.02);
          } else if (schedule.stretchMode === 'grain' && schedule.grain) {
            schedule.grain.playbackRate = ratio;
          }
        }
      }
    }
    audioEngine.applyProjectTransport(project);
  }

  reconcileClips(track: Track): void {
    const liveIds = new Set(track.clips.map((clip) => clip.id));
    for (const [clipId, schedule] of this.clips) {
      if (schedule.trackId === track.id && !liveIds.has(clipId)) {
        this.clearClip(clipId);
        this.clipStatus.delete(clipId);
      }
    }
    for (const clip of track.clips) {
      const hash = this.clipHash(clip);
      if (this.clips.get(clip.id)?.hash === hash) continue;
      this.clearClip(clip.id);
      const node = this.nodes.get(track.id);
      if (!node) continue;
      const schedule: ClipSchedule = { hash, trackId: track.id, events: [], active: new Set(), kind: clip.source.kind };
      if (clip.source.kind === 'notes') {
        this.scheduleNotes(clip, node, schedule);
        this.clips.set(clip.id, schedule);
        continue;
      }
      if (clip.source.kind === 'recording') {
        if (this.clipStatus.get(clip.id) === 'ready') {
          this.scheduleRecording(clip, node, schedule);
          this.clips.set(clip.id, schedule);
        }
        continue;
      }
      const loop = getLoop(clip.source.loopId);
      if (!loop) continue;
      const audioBuffer = peekBuffer(loop.files.wav);
      if (!audioBuffer) continue;
      const mode = pickStretchMode(loop.category, this.bpm / loop.sourceBpm);
      schedule.sourceBpm = loop.sourceBpm;
      schedule.stretchMode = mode;
      if (mode === 'grain') {
        schedule.grainGain = new Tone.Gain(clip.gain).connect(node.eq);
        schedule.grain = new Tone.GrainPlayer({
          url: audioBuffer, playbackRate: this.bpm / loop.sourceBpm, detune: 0,
          grainSize: 0.2, overlap: 0.1,
        }).connect(schedule.grainGain);
      }
      const repeats = Math.max(1, Math.ceil(clip.lengthBars / loop.bars));
      for (let index = 0; index < repeats; index += 1) {
        const startBar = clip.startBar + index * loop.bars;
        const segmentBars = Math.min(loop.bars, clip.startBar + clip.lengthBars - startBar);
        if (segmentBars <= 0) continue;
        if (mode === 'slice') {
          const slices = Math.ceil(segmentBars * 16);
          const sourceSliceSeconds = barsToSeconds(1 / 16, loop.sourceBpm);
          for (let slice = 0; slice < slices; slice += 1) {
            const sliceBar = startBar + slice / 16;
            const remaining = clip.startBar + clip.lengthBars - sliceBar;
            if (remaining <= 0) continue;
            const offset = ((index * loop.bars * 16 + slice) % (loop.bars * 16)) * sourceSliceSeconds;
            const eventId = Tone.getTransport().schedule((time) => {
              const duration = Math.min(sourceSliceSeconds, barsToSeconds(1 / 16, this.bpm), barsToSeconds(remaining, this.bpm));
              const source = new Tone.ToneBufferSource({ url: audioBuffer, fadeIn: 0.001, fadeOut: 0.003 }).connect(node.eq);
              source.onended = () => {
                schedule.active.delete(source);
                source.dispose();
              };
              schedule.active.add(source);
              source.start(time, offset, duration, clip.gain);
            }, barsToTonePosition(sliceBar));
            schedule.events.push(eventId);
          }
        } else {
          const eventId = Tone.getTransport().schedule((time) => {
            const duration = barsToSeconds(segmentBars, this.bpm);
            if (schedule.grain) {
              schedule.grain.start(time, 0, duration);
              return;
            }
            const source = new Tone.ToneBufferSource({
              url: audioBuffer, fadeIn: 0.005, fadeOut: 0.02,
              playbackRate: this.bpm / loop.sourceBpm,
            }).connect(node.eq);
            source.onended = () => {
              schedule.active.delete(source);
              source.dispose();
            };
            schedule.active.add(source);
            source.start(time, 0, duration, clip.gain);
          }, barsToTonePosition(startBar));
          schedule.events.push(eventId);
        }
      }
      this.clips.set(clip.id, schedule);
    }
  }

  getClipStatus(clipId: string): 'missing' | 'loading' | 'ready' | undefined {
    return this.clipStatus.get(clipId);
  }

  private scheduleRecording(clip: Clip, node: TrackNode, schedule: ClipSchedule): void {
    if (clip.source.kind !== 'recording') return;
    const { audioId, offsetSec } = clip.source;
    const buffer = peekBlobBuffer(audioId);
    if (!buffer) return;
    const delaySec = Math.max(0, -offsetSec);
    const offset = Math.max(0, offsetSec);
    const duration = Math.max(0, Math.min(barsToSeconds(clip.lengthBars, this.bpm) - delaySec, buffer.duration - offset));
    if (duration <= 0) return;
    const startBar = clip.startBar + delaySec / barsToSeconds(1, this.bpm);
    const eventId = Tone.getTransport().schedule((time) => {
      const source = new Tone.ToneBufferSource({ url: buffer, fadeIn: 0.005, fadeOut: 0.02 }).connect(node.eq);
      source.onended = () => {
        schedule.active.delete(source);
        source.dispose();
      };
      schedule.active.add(source);
      source.start(time, offset, duration, clip.gain);
    }, barsToTonePosition(startBar));
    schedule.events.push(eventId);
  }

  private scheduleNotes(clip: Clip, node: TrackNode, schedule: ClipSchedule): void {
    if (clip.source.kind !== 'notes') return;
    const isDrums = clip.source.instrument === 'drums';
    if (isDrums) {
      node.drumTone ??= new Tone.MembraneSynth({ volume: -8 }).connect(node.eq);
      node.drumNoise ??= new Tone.NoiseSynth({ volume: -12 }).connect(node.eq);
    } else {
      node.keys ??= new Tone.PolySynth({ voice: Tone.Synth, maxPolyphony: 8, options: { volume: -10 } }).connect(node.eq);
    }
    const notes = clip.source.notes.map((note) => ({
      time: note.t,
      note: note.note,
      dur: note.dur,
      velocity: note.velocity ?? 0.8,
    }));
    const part = new Tone.Part((time, note) => {
      if (isDrums) {
        if (note.note.toLowerCase().includes('snare')) node.drumNoise?.triggerAttackRelease(note.dur, time, note.velocity);
        else node.drumTone?.triggerAttackRelease(note.note, note.dur, time, note.velocity);
      } else {
        node.keys?.triggerAttackRelease(note.note, note.dur, time, note.velocity);
      }
    }, notes).start(barsToTonePosition(clip.startBar));
    part.stop(barsToTonePosition(clip.startBar + clip.lengthBars));
    schedule.part = part;
  }

  getMeters(): Record<string, number> {
    const meters: Record<string, number> = {};
    for (const [trackId, node] of this.nodes) {
      const value = node.meter.getValue();
      const level = Array.isArray(value) ? Math.max(...value) : value;
      meters[trackId] = node.channel.mute ? 0 : typeof level === 'number' ? Math.max(0, Math.min(1, level)) : 0;
    }
    return meters;
  }

  getMasterInput(): Tone.Volume {
    this.limiter ??= new Tone.Limiter(-1).toDestination();
    if (!this.masterInput) {
      this.masterInput = new Tone.Volume(volumeToDb(80)).connect(this.limiter);
      this.masterMeter = new Tone.Meter({ normalRange: true });
      this.masterInput.connect(this.masterMeter);
    }
    return this.masterInput;
  }

  getMasterLevel(): number {
    const value = this.masterMeter?.getValue();
    const level = Array.isArray(value) ? Math.max(...value) : value;
    return typeof level === 'number' ? Math.max(0, Math.min(1, level)) : 0;
  }

  dispose(): void {
    this.generation += 1;
    for (const clipId of this.clips.keys()) this.clearClip(clipId);
    for (const node of this.nodes.values()) this.disposeNode(node);
    this.nodes.clear();
    this.masterInput?.dispose();
    this.masterInput = null;
    this.masterMeter?.dispose();
    this.masterMeter = null;
    this.limiter?.dispose();
    this.limiter = null;
    this.structureKey = '';
  }

  private async ensureNodes(project: Project): Promise<void> {
    if (this.nodeBuild) await this.nodeBuild;
    const missing = project.tracks.filter((track) => !this.nodes.has(track.id));
    if (!missing.length) return;
    const masterInput = this.getMasterInput();
    const build = buildRenderGraph(
      { ...project, tracks: missing }, Tone.getContext(), new Map(),
      { limiter: this.limiter!, masterInput, schedule: false },
    ).then((graph) => {
      for (const [trackId, node] of graph.nodes) this.nodes.set(trackId, node);
    });
    this.nodeBuild = build;
    try {
      await build;
    } finally {
      if (this.nodeBuild === build) this.nodeBuild = null;
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
    for (const eventId of schedule.events) Tone.getTransport().clear(eventId);
    for (const source of schedule.active) source.stop(Tone.immediate() + 0.005);
    if (schedule.grain) {
      schedule.grainGain?.gain.rampTo(0, 0.005);
      schedule.grain.stop(Tone.immediate() + 0.005);
      const { grain, grainGain } = schedule;
      window.setTimeout(() => {
        grain.dispose();
        grainGain?.dispose();
      }, 20);
    }
    schedule.part?.dispose();
    this.clips.delete(clipId);
  }

  private disposeNode(node: TrackNode): void {
    node.eq.dispose();
    node.compressor.dispose();
    node.delay.dispose();
    node.reverb.dispose();
    node.channel.dispose();
    node.meter.dispose();
    node.keys?.dispose();
    node.drumTone?.dispose();
    node.drumNoise?.dispose();
  }

  private clipHash(clip: Clip): string {
    const loop = clip.source.kind === 'loop' ? getLoop(clip.source.loopId) : null;
    const mode = loop ? pickStretchMode(loop.category, this.bpm / loop.sourceBpm) : null;
    return JSON.stringify([clip.id, clip.startBar, clip.lengthBars, clip.source, clip.gain, mode]);
  }
}

export const trackScheduler = new TrackScheduler();
