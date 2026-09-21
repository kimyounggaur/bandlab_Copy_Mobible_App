import { beforeEach, describe, expect, it } from 'vitest';
import { openDB } from 'idb';
import { createStarterProject } from '../stores/projectStore';
import type { Project } from '../types/project';
import { collectOrphanAudio, loadAudioBlob, loadProjects, saveAudioBlob, saveProject } from './db';
import { migrateProject } from './migrations';

beforeEach(async () => {
  const db = await openDB('loop-pocket-db', 2);
  const tx = db.transaction(['projects', 'projects-quarantine', 'audio', 'meta'], 'readwrite');
  await Promise.all([...tx.objectStoreNames].map((name) => tx.objectStore(name).clear()));
  await tx.done;
  db.close();
});

describe('project migration', () => {
  it('chains v1 through v3 without losing tracks', () => {
    const project = createStarterProject('hiphop');
    const legacy = { ...project, version: 1 } as unknown as Project;
    delete (legacy as { masterVolume?: number }).masterVolume;
    expect(migrateProject(legacy)).toMatchObject({
      version: 3,
      masterVolume: 80,
      tracks: project.tracks,
    });
  });

  it('preserves a v2 project level and defaults note quantize to off', () => {
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
    };
    const migrated = migrateProject(legacy);
    expect(migrated?.version).toBe(3);
    expect(migrated?.masterVolume).toBe(42);
    expect(migrated?.tracks[0].clips[0].source).toMatchObject({ kind: 'notes', quantize: 'off' });
  });

  it('rejects damaged and future versions', () => {
    expect(migrateProject({ version: 3, id: 'broken' })).toBeNull();
    expect(migrateProject({ ...createStarterProject(), version: 4 })).toBeNull();
  });

  it('resaves migrated projects, quarantines damaged data, and leaves future versions untouched', async () => {
    const db = await openDB('loop-pocket-db', 2);
    const old = { ...createStarterProject('edm'), version: 1 };
    delete (old as { masterVolume?: number }).masterVolume;
    await db.put('projects', old);
    await db.put('projects', { id: 'broken', version: 3, updatedAt: 1 });
    await db.put('projects', { ...createStarterProject('pop'), id: 'future', version: 99 });
    const loaded = await loadProjects();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].version).toBe(3);
    expect((await db.get('projects', old.id))?.version).toBe(3);
    expect(await db.get('projects', 'broken')).toBeUndefined();
    expect(await db.get('projects-quarantine', 'broken')).toMatchObject({ reason: 'invalid-project' });
    expect((await db.get('projects', 'future'))?.version).toBe(99);
    db.close();
  });
});

describe('recording blob collection', () => {
  it('retains stored and undo-referenced audio, removing only unreferenced blobs', async () => {
    const project = createStarterProject();
    project.tracks[0].clips.push({
      id: 'clip-kept',
      name: 'Kept',
      startBar: 0,
      lengthBars: 1,
      gain: 1,
      source: { kind: 'recording', audioId: 'kept', offsetSec: 0 },
    });
    const undo = createStarterProject();
    undo.tracks[0].clips.push({
      id: 'clip-undo',
      name: 'Undo',
      startBar: 0,
      lengthBars: 1,
      gain: 1,
      source: { kind: 'recording', audioId: 'undo', offsetSec: 0 },
    });
    await saveProject(project);
    await Promise.all(['kept', 'undo', 'orphan'].map((id) => saveAudioBlob(id, new Blob(['test']))));
    expect(await collectOrphanAudio([undo])).toMatchObject({ removed: 1 });
    expect(await loadAudioBlob('kept')).toBeDefined();
    expect(await loadAudioBlob('undo')).toBeDefined();
    expect(await loadAudioBlob('orphan')).toBeUndefined();
  });

  it('does not collect audio while an unknown future project exists', async () => {
    const db = await openDB('loop-pocket-db', 2);
    await db.put('projects', { ...createStarterProject(), version: 99 });
    await saveAudioBlob('unknown', new Blob(['test']));
    expect(await collectOrphanAudio()).toEqual({ removed: 0, freedBytes: 0 });
    expect(await loadAudioBlob('unknown')).toBeDefined();
    db.close();
  });
});
