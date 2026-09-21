import { decodeLoopFormat } from './bufferCache';
import { getLoop } from '../data/loopManifest';

export type AlignmentRow = {
  loopId: string;
  format: string;
  offsetSamples: number | null;
  lengthDifference: number | null;
  error?: string;
};

export function findSampleOffset(reference: Float32Array, candidate: Float32Array, maxOffset = 1024): number {
  let bestOffset = 0;
  let bestScore = -Infinity;
  const count = Math.min(2048, reference.length, candidate.length);
  for (let offset = -maxOffset; offset <= maxOffset; offset += 1) {
    let dot = 0;
    let referenceEnergy = 0;
    let candidateEnergy = 0;
    for (let i = 0; i < count; i += 1) {
      const j = i + offset;
      if (j < 0 || j >= candidate.length) continue;
      const a = reference[i];
      const b = candidate[j];
      dot += a * b;
      referenceEnergy += a * a;
      candidateEnergy += b * b;
    }
    const score = dot / Math.sqrt(referenceEnergy * candidateEnergy || 1);
    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }
  return bestOffset;
}

export async function measureFormatAlignment(): Promise<AlignmentRow[]> {
  const rows: AlignmentRow[] = [];
  for (const loopId of ['drums_01', 'bass_01', 'melody_01']) {
    const loop = getLoop(loopId);
    if (!loop) continue;
    let reference: AudioBuffer;
    try {
      // eslint-disable-next-line no-await-in-loop
      reference = await decodeLoopFormat(loop.files.wav);
    } catch {
      rows.push({ loopId, format: 'wav', offsetSamples: null, lengthDifference: null, error: '원본을 열지 못했어요' });
      continue;
    }
    for (const [format, url] of Object.entries(loop.files)) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const decoded = format === 'wav' ? reference : await decodeLoopFormat(url);
        rows.push({
          loopId, format,
          offsetSamples: findSampleOffset(reference.getChannelData(0), decoded.getChannelData(0)),
          lengthDifference: decoded.length - reference.length,
        });
      } catch {
        rows.push({ loopId, format, offsetSamples: null, lengthDifference: null, error: '디코딩 실패' });
      }
    }
  }
  return rows;
}
