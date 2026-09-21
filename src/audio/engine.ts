import * as Tone from 'tone';
import type { Project } from '../types/project';
import { barsToSeconds, barsToTonePosition, clamp, formatBarBeat, toneToBars } from '../utils/music';

type EngineState = {
  initialized: boolean;
  playing: boolean;
  needsResume: boolean;
  bpm: number;
  loopLengthBars: 4 | 8 | 16;
  metronome: boolean;
};

class AudioEngine {
  private transport = Tone.getTransport();
  // Project in the store is authoritative; these values mirror it for transport controls.
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
  private countInEventId: number | null = null;
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
    this.transport.PPQ = 192;
    this.transport.loop = true;
    this.transport.loopStart = 0;
    this.transport.loopEnd = `${this.state.loopLengthBars}m`;
    this.transport.bpm.value = this.state.bpm;
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
    this.transport.start('+0.02');
    this.state.playing = true;
    this.emit();
    return true;
  }

  pause() {
    this.transport.pause();
    this.state.playing = false;
    this.emit();
  }

  stop() {
    this.cancelCountIn();
    this.transport.stop();
    this.transport.position = 0;
    this.state.playing = false;
    this.emit();
  }

  seek(positionBars: number) {
    this.transport.position = barsToTonePosition(positionBars);
    this.emit();
  }

  setBpm(bpm: number) {
    const next = clamp(bpm, 60, 200);
    this.state.bpm = next;
    this.transport.bpm.rampTo(next, 0.02);
    this.emit();
  }

  setLoopLength(loopLengthBars: 4 | 8 | 16) {
    this.state.loopLengthBars = loopLengthBars;
    this.transport.loopEnd = `${loopLengthBars}m`;
    this.emit();
  }

  applyProjectTransport(project: Project) {
    if (this.state.bpm !== project.bpm) this.setBpm(project.bpm);
    if (this.state.loopLengthBars !== project.loopLengthBars) this.setLoopLength(project.loopLengthBars);
  }

  setMetronome(on: boolean) {
    this.state.metronome = on;
    if (this.metronomeEventId !== null) {
      this.transport.clear(this.metronomeEventId);
      this.metronomeEventId = null;
    }
    if (on) {
      this.metronomeEventId = this.transport.scheduleRepeat((time) => {
        if (time < Tone.getContext().rawContext.currentTime - 0.05) return;
        const beatInBar = Math.floor(this.transport.getTicksAtTime(time) / this.transport.PPQ) % 4;
        const note = beatInBar === 0 ? 'C6' : 'C5';
        this.clickSynth?.triggerAttackRelease(note, '32n', time);
      }, '4n');
    }
    this.emit();
  }

  async startWithCountIn(bars = 1, onComplete?: () => void) {
    await this.ensureReady();
    this.cancelCountIn();
    const totalBeats = bars * 4;
    let beat = 0;
    this.countInEventId = this.transport.scheduleRepeat((time) => {
      this.clickSynth?.triggerAttackRelease(beat % 4 === 0 ? 'C6' : 'C5', '32n', time);
      beat += 1;
      if (beat >= totalBeats) {
        this.cancelCountIn();
        onComplete?.();
      }
    }, '4n', this.transport.position);
    this.transport.start();
    this.state.playing = true;
    this.emit();
  }

  cancelCountIn() {
    if (this.countInEventId !== null) {
      this.transport.clear(this.countInEventId);
      this.countInEventId = null;
    }
  }

  getPositionInBars() {
    return toneToBars(String(this.transport.position));
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

  barDurationSeconds() {
    return barsToSeconds(1, this.state.bpm);
  }
}

export const audioEngine = new AudioEngine();
