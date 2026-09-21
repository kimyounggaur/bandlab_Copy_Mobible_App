import * as Tone from 'tone';
import { getPipelineLatency } from './latency';
import type { Project } from '../types/project';
import { barsToSeconds, barsToTonePosition, clamp, formatBarBeat, toneToBars } from '../utils/music';

type EngineState = {
  initialized: boolean;
  playing: boolean;
  recording: boolean;
  needsResume: boolean;
  bpm: number;
  loopLengthBars: 4 | 8 | 16;
  metronome: boolean;
  countInRemaining: number | null;
};

class AudioEngine {
  private transport = Tone.getTransport();
  // Project in the store is authoritative; these values mirror it for transport controls.
  private state: EngineState = {
    initialized: false,
    playing: false,
    recording: false,
    needsResume: false,
    bpm: 90,
    loopLengthBars: 8,
    metronome: false,
    countInRemaining: null,
  };

  private clickSynth: Tone.Synth | null = null;
  private metronomeEventId: number | null = null;
  private countInSources: OscillatorNode[] = [];
  private countInTimers: number[] = [];
  private countInStartTime: number | null = null;
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
    window.setTimeout(() => { void getPipelineLatency().catch(() => undefined); }, 500);
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
    this.cancelCountIn();
    this.transport.start('+0.02');
    this.state.playing = true;
    this.emit();
    return true;
  }

  pause() {
    this.cancelCountIn();
    this.transport.pause();
    this.state.playing = false;
    this.emit();
  }

  setRecording(recording: boolean) {
    this.state.recording = recording;
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

  async startWithCountIn(bars = 1, startBar = this.getPositionInBars(), onComplete?: () => void): Promise<number> {
    await this.ensureReady();
    this.cancelCountIn();
    this.transport.stop();
    this.transport.position = barsToTonePosition(startBar);
    const raw = Tone.getContext().rawContext;
    const beatSeconds = 60 / this.state.bpm;
    const totalBeats = bars * 4;
    const t0 = raw.currentTime + 0.08;
    const startTime = t0 + totalBeats * beatSeconds;
    for (let beat = 0; beat < totalBeats; beat += 1) {
      const time = t0 + beat * beatSeconds;
      const oscillator = raw.createOscillator();
      const gain = raw.createGain();
      oscillator.frequency.value = beat % 4 === 0 ? 1320 : 880;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.14, time + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
      oscillator.connect(gain).connect(raw.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.05);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      this.countInSources.push(oscillator);
      this.countInTimers.push(window.setTimeout(() => {
        this.state.countInRemaining = totalBeats - beat;
        this.emit();
      }, Math.max(0, (time - raw.currentTime) * 1000)));
    }
    this.countInStartTime = startTime;
    this.state.countInRemaining = totalBeats;
    this.transport.start(startTime, barsToTonePosition(startBar));
    this.countInTimers.push(window.setTimeout(() => {
      this.countInStartTime = null;
      this.countInSources = [];
      this.countInTimers = [];
      this.state.countInRemaining = null;
      this.state.playing = true;
      this.emit();
      onComplete?.();
    }, Math.max(0, (startTime - raw.currentTime) * 1000)));
    this.emit();
    return startTime;
  }

  cancelCountIn() {
    if (this.countInStartTime !== null) this.transport.stop();
    for (const timer of this.countInTimers) window.clearTimeout(timer);
    for (const source of this.countInSources) {
      try { source.stop(Tone.immediate()); } catch { /* already ended */ }
    }
    this.countInTimers = [];
    this.countInSources = [];
    this.countInStartTime = null;
    if (this.state.countInRemaining !== null) {
      this.state.countInRemaining = null;
      this.emit();
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
