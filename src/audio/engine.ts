import * as Tone from 'tone';
import { barsToSeconds, clamp, formatBarBeat } from '../utils/music';

type EngineState = {
  initialized: boolean;
  playing: boolean;
  needsResume: boolean;
  bpm: number;
  loopLengthBars: 4 | 8 | 16;
  metronome: boolean;
};

class AudioEngine {
  private state: EngineState = {
    initialized: false,
    playing: false,
    needsResume: false,
    bpm: 90,
    loopLengthBars: 8,
    metronome: false,
  };

  private clickSynth: Tone.Synth | null = null;
  private metronomeEventId: number | null = null;
  private listeners = new Set<(state: EngineState) => void>();

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && Tone.getContext().state === 'suspended') {
          this.state.needsResume = true;
          this.emit();
        }
      });
    }
  }

  async init() {
    await Tone.start();
    if (Tone.getContext().state === 'suspended') {
      await Tone.getContext().resume();
    }
    this.clickSynth ??= new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.03 },
      volume: -10,
    }).toDestination();
    Tone.Transport.PPQ = 192;
    Tone.Transport.loop = true;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = `${this.state.loopLengthBars}m`;
    Tone.Transport.bpm.value = this.state.bpm;
    this.state.initialized = true;
    this.state.needsResume = false;
    this.emit();
  }

  async ensureReady() {
    if (!this.state.initialized || this.state.needsResume) {
      await this.init();
    }
  }

  play() {
    if (!this.state.initialized) {
      this.emit();
      return false;
    }
    Tone.Transport.start('+0.02');
    this.state.playing = true;
    this.emit();
    return true;
  }

  pause() {
    Tone.Transport.pause();
    this.state.playing = false;
    this.emit();
  }

  stop() {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    this.state.playing = false;
    this.emit();
  }

  seek(positionBars: number) {
    Tone.Transport.position = this.barsToTonePosition(positionBars);
    this.emit();
  }

  setBpm(bpm: number) {
    const next = clamp(bpm, 60, 200);
    this.state.bpm = next;
    Tone.Transport.bpm.rampTo(next, 0.02);
    this.emit();
  }

  setLoopLength(loopLengthBars: 4 | 8 | 16) {
    this.state.loopLengthBars = loopLengthBars;
    Tone.Transport.loopEnd = `${loopLengthBars}m`;
    this.emit();
  }

  setMetronome(on: boolean) {
    this.state.metronome = on;
    if (this.metronomeEventId !== null) {
      Tone.Transport.clear(this.metronomeEventId);
      this.metronomeEventId = null;
    }
    if (on) {
      this.metronomeEventId = Tone.Transport.scheduleRepeat((time) => {
        const [, beat] = this.getPositionParts();
        const note = beat === 0 ? 'C6' : 'C5';
        this.clickSynth?.triggerAttackRelease(note, '32n', time);
      }, '4n');
    }
    this.emit();
  }

  async startWithCountIn(bars = 1, onComplete?: () => void) {
    await this.ensureReady();
    const totalBeats = bars * 4;
    let beat = 0;
    const eventId = Tone.Transport.scheduleRepeat((time) => {
      this.clickSynth?.triggerAttackRelease(beat % 4 === 0 ? 'C6' : 'C5', '32n', time);
      beat += 1;
      if (beat >= totalBeats) {
        Tone.Transport.clear(eventId);
        onComplete?.();
      }
    }, '4n', Tone.Transport.position);
    Tone.Transport.start();
  }

  getPositionInBars() {
    const [bars, beats, sixteenths] = this.getPositionParts();
    return bars + beats / 4 + sixteenths / 16;
  }

  getPositionLabel() {
    return formatBarBeat(this.getPositionInBars());
  }

  subscribe(listener: (state: EngineState) => void) {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState() {
    return { ...this.state };
  }

  private emit() {
    const snapshot = { ...this.state };
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private getPositionParts(): [number, number, number] {
    const [bars = 0, beats = 0, sixteenths = 0] = String(Tone.Transport.position)
      .split(':')
      .map((part) => Number.parseFloat(part));
    return [bars, beats, sixteenths];
  }

  private barsToTonePosition(positionBars: number) {
    const bar = Math.floor(positionBars);
    const beatFloat = (positionBars - bar) * 4;
    const beat = Math.floor(beatFloat);
    const sixteenth = Math.round((beatFloat - beat) * 4);
    return `${bar}:${beat}:${sixteenth}`;
  }

  barDurationSeconds() {
    return barsToSeconds(1, this.state.bpm);
  }
}

export const audioEngine = new AudioEngine();
