export type LoopCategory = 'drums' | 'bass' | 'melody' | 'fx';
export type LoopGenre = 'hiphop' | 'pop' | 'edm';
export type TrackType = 'audio' | 'instrument';
export type ClipSource =
  | { kind: 'loop'; loopId: string }
  | { kind: 'recording'; audioId: string; offsetSec: number }
  | {
      kind: 'notes';
      instrument: 'drums' | 'keys_soft';
      notes: NoteEvent[];
    };

export type EffectSettings = {
  reverb: { on: boolean; mode: 'room' | 'hall'; amount: number };
  delay: { on: boolean; sync: '1/4' | '1/8' | '8n.'; amount: number };
  tone: { on: boolean; tilt: number; bassBoost: boolean };
  vocalPreset: null | 'clean' | 'radio' | 'space';
};

export type NoteEvent = {
  t: string;
  note: string;
  dur: string;
  velocity?: number;
};

export type Clip = {
  id: string;
  startBar: number;
  lengthBars: number;
  gain: number;
  name: string;
  source: ClipSource;
  peaks?: number[];
};

export type Track = {
  id: string;
  name: string;
  type: TrackType;
  color: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  armed?: boolean;
  effects: EffectSettings;
  clips: Clip[];
  meter?: number;
};

export type Project = {
  version: 1;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  bpm: number;
  key: string;
  timeSignature: [4, 4];
  loopLengthBars: 4 | 8 | 16;
  tracks: Track[];
};

export type LoopManifestItem = {
  id: string;
  name: string;
  category: LoopCategory;
  genre: LoopGenre;
  bars: 1 | 2 | 4;
  key?: string;
  filePath: string;
  mood: string;
};
