import { describe, expect, it } from 'vitest';
import { recordingPlacement } from './recordingTiming';

const anchor = { startBar: 3, contextTime: 12, recorderStartedAt: 9.32, bpm: 90 };

describe('recordingPlacement', () => {
  it('anchors at recording start and subtracts pre-roll and latency from length', () => {
    const result = recordingPlacement(anchor, 12.7, 0.05, 0);
    expect(result.startBar).toBe(3);
    expect(result.lengthBars).toBe(3.75);
    expect(result.offsetSec).toBeCloseTo(2.73);
  });
  it('uses a negative trim as a later clip start', () => {
    const result = recordingPlacement({ ...anchor, contextTime: 9.32 }, 2, 0.05, -200);
    expect(result.startBar).toBeGreaterThan(3);
    expect(result.offsetSec).toBe(0);
    expect(result.lengthBars).toBe(0.75);
  });
  it('enforces a quarter-bar minimum', () => {
    expect(recordingPlacement({ ...anchor, contextTime: 9.32 }, 0.1, 0, 0).lengthBars).toBe(0.25);
  });
});
