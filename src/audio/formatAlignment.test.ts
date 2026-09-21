import { describe, expect, it } from 'vitest';
import { findSampleOffset } from './formatAlignment';

describe('findSampleOffset', () => {
  it('finds an exact alignment', () => {
    const reference = Float32Array.from({ length: 4096 }, (_, i) => Math.sin(i * 0.37) + Math.sin(i * 0.019));
    expect(findSampleOffset(reference, reference, 32)).toBe(0);
    const shifted = new Float32Array(reference.length + 7);
    shifted.set(reference, 7);
    expect(findSampleOffset(reference, shifted, 32)).toBe(7);
  });
});
