import { describe, expect, it } from 'vitest';
import { drumPads, velocityFromPointer } from './instruments';

describe('drum kit', () => {
  it('has sixteen distinct named samples and a shared hat choke group', () => {
    expect(drumPads).toHaveLength(16);
    expect(new Set(drumPads.map((pad) => pad.file)).size).toBe(16);
    expect(drumPads.find((pad) => pad.id === 'hat')?.choke).toBe('hat');
    expect(drumPads.find((pad) => pad.id === 'openhat')?.choke).toBe('hat');
  });
  it('uses pad position for ordinary phone pressure and real stylus pressure', () => {
    expect(velocityFromPointer(0.5, 0)).toBe(0.4);
    expect(velocityFromPointer(0.5, 1)).toBe(1);
    expect(velocityFromPointer(0.8, 0)).toBe(0.8);
  });
});
