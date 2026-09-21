import { describe, expect, it } from 'vitest';
import { centsOf, pickStretchMode } from './stretch';

describe('tempo stretch mode', () => {
  it('measures cents from a playback ratio', () => {
    expect(centsOf(1)).toBe(0);
    expect(centsOf(2)).toBeCloseTo(1200, 8);
    expect(centsOf(0.5)).toBeCloseTo(-1200, 8);
  });
  it('keeps pitched loops in resample mode through ten cents', () => {
    expect(pickStretchMode('bass', 2 ** (10 / 1200))).toBe('resample');
    expect(pickStretchMode('melody', 2 ** (-10 / 1200))).toBe('resample');
  });
  it('uses grain beyond ten cents for pitched loops', () => {
    expect(pickStretchMode('bass', 2 ** (11 / 1200))).toBe('grain');
    expect(pickStretchMode('melody', 2 ** (-11 / 1200))).toBe('grain');
  });
  it('uses slicing for drums beyond a semitone', () => {
    expect(pickStretchMode('drums', 2 ** (100 / 1200))).toBe('resample');
    expect(pickStretchMode('drums', 2 ** (101 / 1200))).toBe('slice');
  });
  it('always grains effect loops', () => {
    expect(pickStretchMode('fx', 1)).toBe('grain');
    expect(pickStretchMode('fx', 2)).toBe('grain');
  });
});
