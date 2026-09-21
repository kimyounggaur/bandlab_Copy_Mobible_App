import { describe, expect, it } from 'vitest';
import { getLoop, loopManifest } from './loopManifest';

describe('loop manifest', () => {
  it('contains 48 loops', () => expect(loopManifest).toHaveLength(48));
  it('has unique IDs', () => expect(new Set(loopManifest.map((loop) => loop.id)).size).toBe(loopManifest.length));
  it('uses loop WAV paths', () => {
    for (const loop of loopManifest) {
      expect(loop.filePath).toMatch(/^\/loops\/.*\.wav$/);
    }
  });
  it('finds an existing loop', () => expect(getLoop('drums_01')).toBeDefined());
  it('does not invent a missing loop', () => expect(getLoop('nope')).toBeUndefined());
});
