import type { LoopCategory } from '../types/project';

export type StretchMode = 'resample' | 'grain' | 'slice';

export function centsOf(ratio: number): number {
  return 1200 * Math.log2(ratio);
}

export function pickStretchMode(category: LoopCategory, ratio: number): StretchMode {
  const cents = Math.abs(centsOf(ratio));
  if (category === 'bass' || category === 'melody') return cents <= 10 + 1e-9 ? 'resample' : 'grain';
  if (category === 'drums') return cents <= 100 + 1e-9 ? 'resample' : 'slice';
  return 'grain';
}
