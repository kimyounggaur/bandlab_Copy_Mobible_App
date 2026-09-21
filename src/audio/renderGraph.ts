import * as Tone from 'tone';
import { getLoop } from '../data/loopManifest';
import type { Clip, Project, Track } from '../types/project';
import { barsToSeconds, barsToTonePosition, volumeToDb } from '../utils/music';

export type TrackNode = {
  channel: Tone.Channel;
  delay: Tone.FeedbackDelay;
  reverb: Tone.Reverb;
  eq: Tone.EQ3;
  compressor: Tone.Compressor;
  meter: Tone.Meter;
  keys?: Tone.PolySynth;
  drumTone?: Tone.MembraneSynth;
  drumNoise?: Tone.NoiseSynth;
};

type GraphOptions = {
  limiter?: Tone.Limiter;
  schedule?: boolean;
};

export async function buildRenderGraph(
  project: Project,
  ctx: Tone.BaseContext,
  buffers: Map<string, Tone.ToneAudioBuffer>,
  options: GraphOptions = {},
): Promise<{ limiter: Tone.Limiter; nodes: Map<string, TrackNode> }> {
  const limiter = options.limiter ?? new Tone.Limiter(-1).toDestination();
  const nodes = new Map<string, TrackNode>();
  for (const track of project.tracks) {
    const eq = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
    const compressor = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.01, release: 0.12 });
    const delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.25, wet: 0 });
    const reverb = new Tone.Reverb({ decay: track.effects.reverb.mode === 'hall' ? 2.8 : 1.1, wet: 0 });
    const channel = new Tone.Channel({ volume: volumeToDb(track.volume), pan: track.pan });
    const meter = new Tone.Meter({ normalRange: true });
    eq.chain(compressor, delay, reverb, channel, limiter);
    channel.connect(meter);
    const node = { channel, delay, reverb, eq, compressor, meter };
    applyTrackSettings(track, node, project.tracks.some((item) => item.solo));
    nodes.set(track.id, node);
  }
  await Promise.all([...nodes.values()].map((node) => node.reverb.ready));
  if (options.schedule !== false) {
    ctx.transport.bpm.value = project.bpm;
    ctx.transport.PPQ = 192;
    for (const track of project.tracks) {
      const node = nodes.get(track.id);
      if (!node) continue;
      for (const clip of track.clips) scheduleOfflineClip(clip, node, project, ctx, buffers);
    }
    ctx.transport.start(0);
  }
  return { limiter, nodes };
}

export function applyTrackSettings(track: Track, node: TrackNode, hasSolo: boolean): void {
  node.channel.volume.rampTo(volumeToDb(track.volume), 0.02);
  node.channel.pan.rampTo(track.pan, 0.02);
  node.channel.mute = track.mute || (hasSolo && !track.solo);
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

function scheduleOfflineClip(
  clip: Clip,
  node: TrackNode,
  project: Project,
  ctx: Tone.BaseContext,
  buffers: Map<string, Tone.ToneAudioBuffer>,
): void {
  const transport = ctx.transport;
  if (clip.source.kind === 'notes') {
    const isDrums = clip.source.instrument === 'drums';
    if (isDrums) {
      node.drumTone ??= new Tone.MembraneSynth({ volume: -8 }).connect(node.eq);
      node.drumNoise ??= new Tone.NoiseSynth({ volume: -12 }).connect(node.eq);
    } else {
      node.keys ??= new Tone.PolySynth({ voice: Tone.Synth, maxPolyphony: 8, options: { volume: -10 } }).connect(node.eq);
    }
    const events = clip.source.notes.map((note) => ({ time: note.t, note: note.note, dur: note.dur, velocity: note.velocity ?? 0.8 }));
    new Tone.Part((time, note) => {
      if (isDrums) {
        if (note.note.toLowerCase().includes('snare')) node.drumNoise?.triggerAttackRelease(note.dur, time, note.velocity);
        else node.drumTone?.triggerAttackRelease(note.note, note.dur, time, note.velocity);
      } else {
        node.keys?.triggerAttackRelease(note.note, note.dur, time, note.velocity);
      }
    }, events).start(barsToTonePosition(clip.startBar)).stop(barsToTonePosition(clip.startBar + clip.lengthBars));
    return;
  }
  if (clip.source.kind === 'recording') {
    const buffer = buffers.get(`audio:${clip.source.audioId}`);
    if (!buffer) return;
    const delaySec = Math.max(0, -clip.source.offsetSec);
    const offset = Math.max(0, clip.source.offsetSec);
    const duration = Math.max(0, Math.min(barsToSeconds(clip.lengthBars, project.bpm) - delaySec, buffer.duration - offset));
    if (duration <= 0) return;
    const startBar = clip.startBar + delaySec / barsToSeconds(1, project.bpm);
    transport.schedule((time) => {
      new Tone.ToneBufferSource({ context: ctx, url: buffer, fadeIn: 0.005, fadeOut: 0.02 })
        .connect(node.eq).start(time, offset, duration, clip.gain);
    }, barsToTonePosition(startBar));
    return;
  }
  const loop = getLoop(clip.source.loopId);
  const buffer = loop && buffers.get(loop.filePath);
  if (!loop || !buffer) return;
  const repeats = Math.max(1, Math.ceil(clip.lengthBars / loop.bars));
  for (let index = 0; index < repeats; index += 1) {
    const startBar = clip.startBar + index * loop.bars;
    const segmentBars = Math.min(loop.bars, clip.startBar + clip.lengthBars - startBar, project.loopLengthBars - startBar);
    if (segmentBars <= 0) continue;
    transport.schedule((time) => {
      new Tone.ToneBufferSource({ context: ctx, url: buffer, fadeIn: 0.005, fadeOut: 0.02, playbackRate: project.bpm / 90 })
        .connect(node.eq).start(time, 0, barsToSeconds(segmentBars, project.bpm), clip.gain);
    }, barsToTonePosition(startBar));
  }
}
