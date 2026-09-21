import rawManifest from '../../public/loops/manifest.json';
import type { LoopCategory, LoopGenre, LoopManifestItem } from '../types/project';

const categories: LoopCategory[] = ['drums', 'bass', 'melody', 'fx'];
const genres: LoopGenre[] = ['hiphop', 'pop', 'edm'];

function isLoop(value: unknown): value is LoopManifestItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LoopManifestItem>;
  return typeof item.id === 'string'
    && typeof item.name === 'string'
    && categories.includes(item.category as LoopCategory)
    && genres.includes(item.genre as LoopGenre)
    && [1, 2, 4].includes(item.bars as number)
    && typeof item.sourceBpm === 'number' && item.sourceBpm > 0
    && (item.key === null || typeof item.key === 'string')
    && typeof item.sampleRate === 'number' && item.sampleRate > 0
    && typeof item.channels === 'number' && item.channels > 0
    && typeof item.frames === 'number' && item.frames > 0
    && typeof item.files?.wav === 'string'
    && typeof item.hash === 'string' && /^[0-9a-f]{12}$/.test(item.hash)
    && typeof item.starter === 'boolean'
    && typeof item.mood === 'string'
    && item.license === 'CC0-generated';
}

function readManifest(value: unknown): LoopManifestItem[] {
  if (!value || typeof value !== 'object') throw new Error('Loop manifest is invalid');
  const manifest = value as { version?: unknown; loops?: unknown };
  if (manifest.version !== 1 || !Array.isArray(manifest.loops) || !manifest.loops.every(isLoop)) {
    throw new Error('Loop manifest has an unsupported schema');
  }
  const ids = new Set(manifest.loops.map((loop: LoopManifestItem) => loop.id));
  if (ids.size !== manifest.loops.length) throw new Error('Loop manifest contains duplicate IDs');
  return manifest.loops;
}

export const loopManifest = readManifest(rawManifest);
const loopsById = new Map(loopManifest.map((loop) => [loop.id, loop]));

export function getLoop(loopId: string) {
  return loopsById.get(loopId);
}

export function loopsByGenre(genre: LoopGenre) {
  return loopManifest.filter((loop) => loop.genre === genre);
}

export function starterLoopsForGenre(genre: LoopGenre) {
  const drums = loopManifest.find((loop) => loop.starter && loop.genre === genre && loop.category === 'drums');
  const bass = loopManifest.find((loop) => loop.starter && loop.genre === genre && loop.category === 'bass');
  return { drums, bass };
}
