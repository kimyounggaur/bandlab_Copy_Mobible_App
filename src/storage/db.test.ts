import { describe, expect, it } from 'vitest';
import { createStarterProject } from '../stores/projectStore';
import { migrateProject } from './db';

describe('project migration', () => {
  it('adds the master level to a v1 project', () => {
    const project = createStarterProject('hiphop');
    const legacy = { ...project, version: 1 } as unknown as typeof project;
    delete (legacy as { masterVolume?: number }).masterVolume;
    expect(migrateProject(legacy)).toMatchObject({ version: 3, masterVolume: 80 });
  });
  it('preserves a v2 project level and gives old note clips an off setting', () => {
    const project = createStarterProject('pop');
    const oldClip = {
      ...project.tracks[0].clips[0],
      source: { kind: 'notes', instrument: 'keys_soft', notes: [{ t: '0:0:0', note: 'C4', dur: '8n' }] },
    };
    const legacy = {
      ...project,
      version: 2,
      masterVolume: 42,
      tracks: [{ ...project.tracks[0], clips: [oldClip] }, ...project.tracks.slice(1)],
    } as unknown as typeof project;
    const migrated = migrateProject(legacy);
    expect(migrated.version).toBe(3);
    expect(migrated.masterVolume).toBe(42);
    expect(migrated.tracks[0].clips[0].source).toMatchObject({ kind: 'notes', quantize: 'off' });
  });
});
