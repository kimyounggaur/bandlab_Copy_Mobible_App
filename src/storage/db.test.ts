import { describe, expect, it } from 'vitest';
import { createStarterProject } from '../stores/projectStore';
import { migrateProject } from './db';

describe('project migration', () => {
  it('adds the master level to a v1 project', () => {
    const project = createStarterProject('hiphop');
    const legacy = { ...project, version: 1 } as unknown as typeof project;
    delete (legacy as { masterVolume?: number }).masterVolume;
    expect(migrateProject(legacy)).toMatchObject({ version: 2, masterVolume: 80 });
  });
  it('preserves a v2 project level', () => {
    const project = { ...createStarterProject('pop'), masterVolume: 42 };
    expect(migrateProject(project)).toEqual(project);
  });
});
