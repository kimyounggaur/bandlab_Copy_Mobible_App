import { describe, expect, it } from 'vitest';
import { encodeWav } from './exporter';

describe('WAV encoding', () => {
  it.each([16, 24] as const)('writes a stereo %i-bit PCM header', async (depth) => {
    const blob = encodeWav(new Float32Array([0, 1]), new Float32Array([0, -1]), 44100, depth);
    const bytes = new DataView(await blob.arrayBuffer());
    expect(blob.size).toBe(44 + 2 * 2 * (depth / 8));
    expect(bytes.getUint32(4, true)).toBe(blob.size - 8);
    expect(bytes.getUint16(22, true)).toBe(2);
    expect(bytes.getUint32(24, true)).toBe(44100);
    expect(bytes.getUint16(32, true)).toBe(2 * depth / 8);
    expect(bytes.getUint16(34, true)).toBe(depth);
    expect(bytes.getUint32(40, true)).toBe(blob.size - 44);
  });

  it('rejects mismatched stereo channel lengths', () => {
    expect(() => encodeWav(new Float32Array(1), new Float32Array(2), 44100, 16)).toThrow();
  });
});
