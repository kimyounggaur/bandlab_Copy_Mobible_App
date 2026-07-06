import type { LoopCategory, LoopGenre, LoopManifestItem } from '../types/project';

const categories: Array<{ category: LoopCategory; label: string; count: number; bars: 1 | 2 | 4 }> = [
  { category: 'drums', label: '드럼', count: 16, bars: 1 },
  { category: 'bass', label: '베이스', count: 12, bars: 2 },
  { category: 'melody', label: '멜로디', count: 12, bars: 2 },
  { category: 'fx', label: '효과음', count: 8, bars: 1 },
];

const genres: LoopGenre[] = ['hiphop', 'pop', 'edm'];
const genreLabel: Record<LoopGenre, string> = {
  hiphop: '힙합',
  pop: '팝',
  edm: 'EDM',
};

const moods = ['따뜻한', '단단한', '몽글한', '반짝이는', '밤공기', '미니멀'];

export const loopManifest: LoopManifestItem[] = categories.flatMap(({ category, label, count, bars }) =>
  Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const genre = genres[index % genres.length];
    const mood = moods[index % moods.length];
    const id = `${category}_${String(number).padStart(2, '0')}`;
    return {
      id,
      name: `${genreLabel[genre]} ${mood} ${label}`,
      category,
      genre,
      bars,
      key: category === 'melody' || category === 'bass' ? ['Cm', 'Am', 'F'][index % 3] : undefined,
      filePath: `/loops/${id}.wav`,
      mood,
    };
  }),
);

export function getLoop(loopId: string) {
  return loopManifest.find((loop) => loop.id === loopId);
}

export function loopsByGenre(genre: LoopGenre) {
  return loopManifest.filter((loop) => loop.genre === genre);
}

export function starterLoopsForGenre(genre: LoopGenre) {
  const drums = loopManifest.find((loop) => loop.genre === genre && loop.category === 'drums');
  const bass = loopManifest.find((loop) => loop.genre === genre && loop.category === 'bass');
  return { drums, bass };
}
