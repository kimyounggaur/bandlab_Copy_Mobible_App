import { beforeEach, describe, expect, it } from 'vitest';
import { createStarterProject, useProjectStore } from './projectStore';

beforeEach(() => {
  const project = createStarterProject('hiphop');
  useProjectStore.setState({
    projects: [project],
    currentProject: project,
    selectedTrackId: project.tracks[0].id,
    selectedClipId: null,
    past: [],
    future: [],
    saveStatus: 'idle',
  });
});

describe('project store', () => {
  it('starts hiphop at 90 BPM', () => expect(createStarterProject('hiphop').bpm).toBe(90));
  it('starts with two tracks', () => expect(createStarterProject('hiphop').tracks).toHaveLength(2));
  it('starts with a saved master level', () => expect(createStarterProject('hiphop').masterVolume).toBe(80));
  it('allows six additional tracks and caps the total at eight', () => {
    const results = Array.from({ length: 7 }, () => useProjectStore.getState().addTrack('audio'));
    expect(results.slice(0, 6).every(Boolean)).toBe(true);
    expect(results[6]).toBeNull();
    expect(useProjectStore.getState().currentProject.tracks).toHaveLength(8);
  });
  it('undoes and redoes an added clip', () => {
    const track = useProjectStore.getState().currentProject.tracks[0];
    const clip = { id: 'test-clip', startBar: 4, lengthBars: 1, gain: 1, name: 'Test', source: { kind: 'loop' as const, loopId: 'drums_01' } };
    useProjectStore.getState().addClip(track.id, clip);
    expect(useProjectStore.getState().currentProject.tracks[0].clips).toContainEqual(clip);
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().currentProject.tracks[0].clips).not.toContainEqual(clip);
    useProjectStore.getState().redo();
    expect(useProjectStore.getState().currentProject.tracks[0].clips).toContainEqual(clip);
  });
  it('keeps undo safe beyond the history limit', () => {
    for (let index = 0; index < 21; index += 1) useProjectStore.getState().setBpm(91 + index);
    for (let index = 0; index < 21; index += 1) useProjectStore.getState().undo();
    expect(useProjectStore.getState().past).toHaveLength(0);
  });
  it('does not record history when requested', () => {
    const track = useProjectStore.getState().currentProject.tracks[0];
    useProjectStore.getState().updateTrack(track.id, { volume: 50 }, false);
    expect(useProjectStore.getState().past).toHaveLength(0);
  });
  it('clears clip selection on removal', () => {
    const track = useProjectStore.getState().currentProject.tracks[0];
    const clip = track.clips[0];
    useProjectStore.getState().selectClip(clip.id);
    useProjectStore.getState().removeClip(track.id, clip.id);
    expect(useProjectStore.getState().selectedClipId).toBeNull();
  });
});
