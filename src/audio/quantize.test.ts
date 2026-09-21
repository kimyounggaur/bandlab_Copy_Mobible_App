import { describe, expect, it } from 'vitest';
import { noteTimeInTicks, quantizeNoteBar } from './quantize';

describe('non-destructive note quantize', () => {
  const note = { t: '0:0:0', rawBar: 0.094, note: 'A4', dur: '8n' };
  it('retains the raw position when switched off', () => {
    expect(quantizeNoteBar(note, '16n')).toBe(0.125);
    expect(quantizeNoteBar(note, 'off')).toBe(0.094);
  });
  it('uses transport ticks for tempo-relative playback', () => {
    expect(noteTimeInTicks(note, '16n')).toBe('96i');
    expect(noteTimeInTicks(note, '8n')).toBe('96i');
  });
});
