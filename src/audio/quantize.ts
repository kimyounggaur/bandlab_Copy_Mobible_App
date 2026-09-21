import type { NoteEvent } from '../types/project';
import { toneToBars } from '../utils/music';

export type Quantize = 'off' | '8n' | '16n';

export function quantizeNoteBar(note: NoteEvent, mode: Quantize): number {
  const raw = typeof note.rawBar === 'number' ? note.rawBar : toneToBars(note.t);
  const step = mode === '8n' ? 1 / 8 : mode === '16n' ? 1 / 16 : 0;
  return step ? Math.round(raw / step) * step : raw;
}

export function noteTimeInTicks(note: NoteEvent, mode: Quantize, ppq = 192): string {
  return `${Math.max(0, Math.round(quantizeNoteBar(note, mode) * 4 * ppq))}i`;
}
