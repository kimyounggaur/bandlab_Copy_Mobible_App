import * as Tone from 'tone';
import kitManifest from '../../public/kits/lofi/kit.json';
import { getBuffer } from './bufferCache';

export interface Instrument {
  trigger(noteOrPad: string, time: number, velocity: number): void;
  connectTo(node: Tone.ToneAudioNode): void;
  dispose(): void;
}

export type DrumPad = { id: string; label: string; file: string; defaultVelocity: number; choke: string | null };
export const drumPads = kitManifest.pads as DrumPad[];
let kitBuffers: Promise<Map<string, Tone.ToneAudioBuffer>> | null = null;

export function preloadDrumKit(): Promise<Map<string, Tone.ToneAudioBuffer>> {
  kitBuffers ??= Promise.all(drumPads.map(async (pad) => [pad.id, await getBuffer(pad.file)] as const))
    .then((items) => new Map(items))
    .catch((error: unknown) => {
      kitBuffers = null;
      throw error;
    });
  return kitBuffers;
}

export async function createDrumKit(kitId: string, context: Tone.BaseContext = Tone.getContext()): Promise<Instrument> {
  if (kitId !== kitManifest.id) throw new Error(`Unknown kit: ${kitId}`);
  return new DrumKitInstrument(await preloadDrumKit(), context);
}

class DrumKitInstrument implements Instrument {
  private output: Tone.Gain;
  private active = new Set<Tone.ToneBufferSource>();
  private byChoke = new Map<string, Set<Tone.ToneBufferSource>>();
  private buffers: Map<string, Tone.ToneAudioBuffer>;
  private context: Tone.BaseContext;

  constructor(buffers: Map<string, Tone.ToneAudioBuffer>, context: Tone.BaseContext) {
    this.buffers = buffers;
    this.context = context;
    this.output = new Tone.Gain({ context });
  }

  connectTo(node: Tone.ToneAudioNode): void {
    this.output.disconnect();
    this.output.connect(node);
  }

  trigger(noteOrPad: string, time: number, velocity: number): void {
    const pad = drumPads.find((item) => item.id === noteOrPad);
    const buffer = pad && this.buffers.get(pad.id);
    if (!pad || !buffer) return;
    if (pad.choke) {
      const group = this.byChoke.get(pad.choke);
      for (const source of group ?? []) source.stop(time + 0.003);
      group?.clear();
    }
    const source = new Tone.ToneBufferSource({ context: this.context, url: buffer, fadeIn: 0.001, fadeOut: 0.01 }).connect(this.output);
    this.active.add(source);
    if (pad.choke) {
      const group = this.byChoke.get(pad.choke) ?? new Set<Tone.ToneBufferSource>();
      group.add(source);
      this.byChoke.set(pad.choke, group);
    }
    source.onended = () => {
      this.active.delete(source);
      if (pad.choke) this.byChoke.get(pad.choke)?.delete(source);
      source.dispose();
    };
    source.start(time, 0, buffer.duration, Math.max(0.4, Math.min(1, velocity)));
  }

  dispose(): void {
    for (const source of this.active) {
      source.onended = () => source.dispose();
      source.stop(Tone.immediate());
    }
    this.active.clear();
    this.byChoke.clear();
    this.output.dispose();
  }
}

class KeysInstrument implements Instrument {
  private output: Tone.Gain;
  private voices: Array<{ synth: Tone.Synth; busyUntil: number }>;

  constructor(context: Tone.BaseContext) {
    this.output = new Tone.Gain({ context });
    this.voices = Array.from({ length: 8 }, () => ({
      synth: new Tone.Synth({ context, volume: -10 }).connect(this.output),
      busyUntil: 0,
    }));
  }

  connectTo(node: Tone.ToneAudioNode): void {
    this.output.disconnect();
    this.output.connect(node);
  }

  trigger(noteOrPad: string, time: number, velocity: number): void {
    const voice = this.voices.find((item) => item.busyUntil <= time)
      ?? this.voices.reduce((oldest, item) => item.busyUntil < oldest.busyUntil ? item : oldest);
    if (voice.busyUntil > time) voice.synth.triggerRelease(time);
    voice.synth.triggerAttackRelease(noteOrPad, '8n', time, Math.max(0.4, Math.min(1, velocity)));
    voice.busyUntil = time + Tone.Time('8n').toSeconds();
  }

  dispose(): void {
    for (const voice of this.voices) voice.synth.dispose();
    this.output.dispose();
  }
}

export function createKeys(preset: 'keys_soft', context: Tone.BaseContext = Tone.getContext()): Instrument {
  if (preset !== 'keys_soft') throw new Error(`Unknown keys preset: ${preset}`);
  return new KeysInstrument(context);
}

export function velocityFromPointer(pressure: number, relativeY: number): number {
  if (pressure > 0 && Math.abs(pressure - 0.5) > 0.01) return Math.max(0.4, Math.min(1, pressure));
  return Math.max(0.4, Math.min(1, 0.4 + Math.max(0, Math.min(1, relativeY)) * 0.6));
}
