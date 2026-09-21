import { describe, expect, it } from 'vitest';
import type * as Tone from 'tone';
import { computePeaks } from './peaks';

function fakeBuffer(channels: number[][]): Tone.ToneAudioBuffer {
  return {
    length: channels[0].length,
    numberOfChannels: channels.length,
    getChannelData: (index: number) => Float32Array.from(channels[index]),
  } as Tone.ToneAudioBuffer;
}

describe('waveform peaks', () => {
  it('takes the maximum absolute value in each bucket', () => {
    expect(computePeaks(fakeBuffer([[0.1, -0.8, 0.3, -0.2]]), 2)).toEqual([Math.fround(0.8), Math.fround(0.3)]);
  });
  it('uses the loudest stereo channel', () => {
    expect(computePeaks(fakeBuffer([[0.1, 0.2], [0.7, -0.4]]), 2)).toEqual([Math.fround(0.7), Math.fround(0.4)]);
  });
  it('leaves silent buckets at zero', () => {
    expect(computePeaks(fakeBuffer([[0, 0, 0, 0]]), 4)).toEqual([0, 0, 0, 0]);
  });
});
