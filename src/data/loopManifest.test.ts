import { describe, expect, it } from 'vitest';
import { getLoop, loopManifest } from './loopManifest';

describe('loop manifest', () => {
  it('contains 48 loops', () => expect(loopManifest).toHaveLength(48));
  it('has unique IDs', () => expect(new Set(loopManifest.map((loop) => loop.id)).size).toBe(loopManifest.length));
  it('uses loop WAV paths', () => {
    for (const loop of loopManifest) {
      expect(loop.files.wav).toMatch(/^\/loops\/.*\.wav$/);
    }
  });
  it('records source tempo, frame count and content hash', () => {
    for (const loop of loopManifest) {
      expect(loop.sourceBpm).toBeGreaterThan(0);
      expect(loop.frames).toBeGreaterThan(0);
      expect(loop.hash).toMatch(/^[0-9a-f]{12}$/);
      expect(loop.sampleRate).toBe(44100);
    }
  });
  it.each(['hiphop', 'pop', 'edm'] as const)('has one starter drum and bass for %s', (genre) => {
    expect(loopManifest.filter((loop) => loop.starter && loop.genre === genre && loop.category === 'drums')).toHaveLength(1);
    expect(loopManifest.filter((loop) => loop.starter && loop.genre === genre && loop.category === 'bass')).toHaveLength(1);
  });
  it('finds an existing loop', () => expect(getLoop('drums_01')).toBeDefined());
  it('does not invent a missing loop', () => expect(getLoop('nope')).toBeUndefined());
});
