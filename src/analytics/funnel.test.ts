import { beforeEach, describe, expect, it } from 'vitest';
import { createStarterProject } from '../stores/projectStore';
import { loadMeta } from '../storage/db';
import { getFunnel, getKeyMetrics, initializeFunnel, mark, markEightBarComplete, resetFunnel } from './funnel';

beforeEach(() => resetFunnel());

describe('local funnel', () => {
  it('measures first sound from app open and deduplicates within a session', () => {
    mark('app_open');
    mark('first_sound');
    mark('first_sound');
    expect(getFunnel().filter((entry) => entry.event === 'first_sound')).toHaveLength(1);
    expect(getKeyMetrics()).toMatchObject({ reachedFirstSound: true, reachedEightBars: false });
    expect(getKeyMetrics().timeToFirstSoundMs).toBeGreaterThanOrEqual(0);
  });

  it('only completes eight bars with two occupied tracks and at least eight total bars', () => {
    mark('app_open');
    const project = createStarterProject();
    project.tracks[1].clips = [];
    markEightBarComplete(project);
    expect(getKeyMetrics().reachedEightBars).toBe(false);
    project.tracks[1].clips.push({ ...project.tracks[0].clips[0], id: 'second' });
    markEightBarComplete(project);
    expect(getKeyMetrics().reachedEightBars).toBe(true);
  });

  it('migrates legacy timestamps into IndexedDB and removes old keys', async () => {
    localStorage.setItem('loop-pocket-first-sound', '1234567890000');
    mark('app_open');
    await initializeFunnel();
    expect(getFunnel()).toContainEqual(expect.objectContaining({
      event: 'first_sound',
      t: 1234567890000,
      sessionId: 'legacy',
    }));
    expect(localStorage.getItem('loop-pocket-first-sound')).toBeNull();
    expect(await loadMeta('funnel-v1')).toEqual(expect.arrayContaining([
      expect.objectContaining({ event: 'first_sound', sessionId: 'legacy' }),
    ]));
  });
});
