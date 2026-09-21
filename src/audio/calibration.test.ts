import { describe, expect, it } from 'vitest';
import { analyzeCalibration } from './calibration';

describe('analyzeCalibration', () => {
  it('uses the last six attacks and returns their median delay', () => {
    const rate = 1000;
    const expected = Array.from({ length: 8 }, (_, i) => 0.4 + i * 0.6);
    const samples = new Float32Array(6000);
    for (let i = 0; i < expected.length; i += 1) {
      const offset = i < 2 ? 0.2 : 0.08;
      samples[Math.round((expected[i] + offset) * rate)] = 0.9;
    }
    const result = analyzeCalibration(samples, rate, expected);
    expect(result.L).toBeCloseTo(0.08, 2);
    expect(result.deviation).toBeLessThan(0.01);
  });
});
