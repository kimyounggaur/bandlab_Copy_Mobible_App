import * as Tone from 'tone';
import { getLoop } from '../data/loopManifest';
import type { Project, Track } from '../types/project';
import { barsToSeconds, volumeToDb } from '../utils/music';

type TrackNode = {
  channel: Tone.Channel;
  delay: Tone.FeedbackDelay;
  reverb: Tone.Reverb;
  eq: Tone.EQ3;
  compressor: Tone.Compressor;
  meter: Tone.Meter;
  players: Tone.Player[];
};

class TrackScheduler {
  private events: number[] = [];
  private nodes = new Map<string, TrackNode>();
  private limiter = new Tone.Limiter(-1).toDestination();

  async syncProject(project: Project) {
    Tone.Transport.bpm.value = project.bpm;
    Tone.Transport.loop = true;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = `${project.loopLengthBars}m`;
    this.clearEvents();
    this.disposeMissingTracks(project);
    const soloIds = project.tracks.filter((track) => track.solo).map((track) => track.id);

    for (const track of project.tracks) {
      const node = await this.getOrCreateTrackNode(track);
      node.channel.volume.rampTo(volumeToDb(track.volume), 0.02);
      node.channel.pan.rampTo(track.pan, 0.02);
      node.channel.mute = track.mute || (soloIds.length > 0 && !soloIds.includes(track.id));
      this.applyEffects(track, node);
      await this.scheduleTrack(track, project, node);
    }
  }

  getMeters() {
    const meters: Record<string, number> = {};
    this.nodes.forEach((node, trackId) => {
      const value = node.meter.getValue();
      meters[trackId] = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 0;
    });
    return meters;
  }

  dispose() {
    this.clearEvents();
    this.nodes.forEach((node) => {
      node.players.forEach((player) => player.dispose());
      node.eq.dispose();
      node.compressor.dispose();
      node.delay.dispose();
      node.reverb.dispose();
      node.channel.dispose();
      node.meter.dispose();
    });
    this.nodes.clear();
    this.limiter.dispose();
  }

  private clearEvents() {
    this.events.forEach((eventId) => Tone.Transport.clear(eventId));
    this.events = [];
  }

  private disposeMissingTracks(project: Project) {
    const trackIds = new Set(project.tracks.map((track) => track.id));
    this.nodes.forEach((node, trackId) => {
      if (trackIds.has(trackId)) return;
      node.players.forEach((player) => player.dispose());
      node.eq.dispose();
      node.compressor.dispose();
      node.delay.dispose();
      node.reverb.dispose();
      node.channel.dispose();
      node.meter.dispose();
      this.nodes.delete(trackId);
    });
  }

  private async getOrCreateTrackNode(track: Track) {
    const existing = this.nodes.get(track.id);
    if (existing) return existing;

    const eq = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
    const compressor = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.01, release: 0.12 });
    const delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.25, wet: 0 });
    const reverb = new Tone.Reverb({ decay: 1.2, wet: 0 });
    const channel = new Tone.Channel({ volume: volumeToDb(track.volume), pan: track.pan });
    const meter = new Tone.Meter({ normalRange: true });
    eq.chain(compressor, delay, reverb, channel, this.limiter);
    channel.connect(meter);
    const node = { channel, delay, reverb, eq, compressor, meter, players: [] };
    this.nodes.set(track.id, node);
    return node;
  }

  private applyEffects(track: Track, node: TrackNode) {
    node.reverb.wet.rampTo(track.effects.reverb.on ? track.effects.reverb.amount / 200 : 0, 0.02);
    node.reverb.decay = track.effects.reverb.mode === 'hall' ? 2.8 : 1.1;
    node.delay.wet.rampTo(track.effects.delay.on ? track.effects.delay.amount / 250 : 0, 0.02);
    node.delay.delayTime.value = track.effects.delay.sync;
    const tilt = track.effects.tone.on ? track.effects.tone.tilt - 50 : 0;
    node.eq.high.rampTo(tilt / 8, 0.02);
    node.eq.low.rampTo(track.effects.tone.bassBoost ? 3 : -tilt / 12, 0.02);
    node.compressor.ratio.value = track.effects.vocalPreset ? 4 : 1;
  }

  private async scheduleTrack(track: Track, project: Project, node: TrackNode) {
    node.players.forEach((player) => player.dispose());
    node.players = [];

    for (const clip of track.clips) {
      if (clip.source.kind !== 'loop') continue;
      const loop = getLoop(clip.source.loopId);
      if (!loop) continue;
      const player = new Tone.Player({
        url: loop.filePath,
        fadeIn: 0.005,
        fadeOut: 0.02,
      }).connect(node.eq);
      player.playbackRate = project.bpm / 90;
      node.players.push(player);

      const repeats = Math.max(1, Math.ceil(clip.lengthBars / loop.bars));
      for (let index = 0; index < repeats; index += 1) {
        const startBar = clip.startBar + index * loop.bars;
        if (startBar >= clip.startBar + clip.lengthBars) continue;
        const remainingBars = clip.startBar + clip.lengthBars - startBar;
        const segmentBars = Math.min(loop.bars, remainingBars);
        const eventId = Tone.Transport.schedule((time) => {
          const duration = barsToSeconds(segmentBars, project.bpm);
          player.start(time, 0, duration + 0.01);
        }, barsToTonePosition(startBar));
        this.events.push(eventId);
      }
    }

    if (node.players.length) {
      await Tone.loaded();
    }
  }
}

function barsToTonePosition(positionBars: number) {
  const bar = Math.floor(positionBars);
  const beatFloat = (positionBars - bar) * 4;
  const beat = Math.floor(beatFloat);
  const sixteenth = Math.round((beatFloat - beat) * 4);
  return `${bar}:${beat}:${sixteenth}`;
}

export const trackScheduler = new TrackScheduler();
