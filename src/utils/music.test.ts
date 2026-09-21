import { describe, expect, it } from 'vitest';
import { barsToSeconds, barsToTonePosition, formatBarBeat, snapBar, toneToBars, volumeToDb } from './music';

describe('music helpers', () => {
  it('converts one bar at 120 BPM', () => expect(barsToSeconds(1, 120)).toBe(2));
  it('converts four bars at 90 BPM', () => expect(barsToSeconds(4, 90)).toBeCloseTo((8 / 3) * 4, 9));
  it('maps full volume to 0 dB', () => expect(volumeToDb(100)).toBe(0));
  it('floors silence at -60 dB', () => expect(volumeToDb(0)).toBe(-60));
  it('maps half volume to -6 dB', () => expect(volumeToDb(50)).toBeCloseTo(-6.0206, 3));
  it('snaps 0.3 to a quarter bar', () => expect(snapBar(0.3)).toBe(0.25));
  it('snaps 0.4 to a half bar', () => expect(snapBar(0.4)).toBe(0.5));
  it('formats bar zero', () => expect(formatBarBeat(0)).toBe('1:1'));
  it('formats a half bar', () => expect(formatBarBeat(2.5)).toBe('3:3'));
  it.each([0, 0.25, 1.5, 3.0625, 7.75])('round trips bar position %s', (bars) => {
    expect(toneToBars(barsToTonePosition(bars))).toBe(bars);
  });
});
