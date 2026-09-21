import { barsToSeconds } from '../utils/music';
import type { RecordingAnchor } from './recorder';

export function recordingPlacement(
  anchor: RecordingAnchor,
  durationSec: number,
  latencySec: number,
  userTrimMs: number,
): { startBar: number; lengthBars: number; offsetSec: number } {
  const barSeconds = barsToSeconds(1, anchor.bpm);
  // The encoded buffer begins at R; the musical start is S plus the measured I/O delay.
  const rawOffset = (anchor.contextTime - anchor.recorderStartedAt) + latencySec + userTrimMs / 1000;
  const startBar = anchor.startBar + Math.max(0, -rawOffset) / barSeconds;
  const offsetSec = Math.max(0, rawOffset);
  const audibleSeconds = Math.max(0, durationSec - offsetSec);
  const lengthBars = Math.max(0.25, Math.round(audibleSeconds / barSeconds * 4) / 4);
  return { startBar, lengthBars, offsetSec };
}
