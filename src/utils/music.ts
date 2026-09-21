export const trackColors = [
  '#FF6B6B',
  '#FFA94D',
  '#FFD43B',
  '#69DB7C',
  '#38D9A9',
  '#4DABF7',
  '#9775FA',
  '#F783AC',
] as const;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function snapBar(value: number) {
  return Math.round(value * 4) / 4;
}

export function formatBarBeat(positionBars: number) {
  const bar = Math.floor(positionBars) + 1;
  const beat = Math.floor((positionBars % 1) * 4) + 1;
  return `${bar}:${beat}`;
}

export function volumeToDb(volume: number) {
  if (volume <= 0) return -60;
  const normalized = clamp(volume, 0, 100) / 100;
  return 20 * Math.log10(normalized);
}

export function barsToSeconds(bars: number, bpm: number) {
  return bars * 4 * (60 / bpm);
}

export function barsToTonePosition(positionBars: number) {
  const bar = Math.floor(positionBars);
  const beatFloat = (positionBars - bar) * 4;
  const beat = Math.floor(beatFloat);
  const sixteenth = Math.round((beatFloat - beat) * 4);
  return `${bar}:${beat}:${sixteenth}`;
}

export function toneToBars(position: string) {
  const [bar = 0, beat = 0, sixteenth = 0] = position.split(':').map(Number);
  return bar + beat / 4 + sixteenth / 16;
}
