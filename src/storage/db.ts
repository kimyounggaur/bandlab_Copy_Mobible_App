import { openDB, type DBSchema } from 'idb';
import { CURRENT_PROJECT_VERSION, migrateProject, projectVersion } from './migrations';
import type { Project } from '../types/project';

interface LoopPocketDb extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-updated': number };
  };
  audio: {
    key: string;
    value: Blob;
  };
  meta: {
    key: string;
    value: unknown;
  };
  'projects-quarantine': {
    key: string;
    value: { raw: unknown; quarantinedAt: number; reason: string };
  };
}

const dbPromise = openDB<LoopPocketDb>('loop-pocket-db', 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
      projectStore.createIndex('by-updated', 'updatedAt');
      db.createObjectStore('audio');
      db.createObjectStore('meta');
    }
    if (oldVersion < 2) db.createObjectStore('projects-quarantine');
  },
});

export async function saveProject(project: Project) {
  const db = await dbPromise;
  await db.put('projects', project);
}

export async function loadProjects() {
  const db = await dbPromise;
  const keys = await db.getAllKeys('projects');
  const records = await db.getAll('projects') as unknown[];
  const projects: Project[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const raw = records[index];
    const version = projectVersion(raw);
    if (version !== null && version > CURRENT_PROJECT_VERSION) continue;
    const migrated = migrateProject(raw);
    if (migrated) {
      projects.push(migrated);
      if (version !== CURRENT_PROJECT_VERSION) {
        // eslint-disable-next-line no-await-in-loop
        await db.put('projects', migrated);
      }
    } else {
      const key = keys[index];
      try {
        const tx = db.transaction(['projects', 'projects-quarantine'], 'readwrite');
        // eslint-disable-next-line no-await-in-loop
        await tx.objectStore('projects-quarantine').put({ raw, quarantinedAt: Date.now(), reason: 'invalid-project' }, String(key));
        // eslint-disable-next-line no-await-in-loop
        await tx.objectStore('projects').delete(key);
        // eslint-disable-next-line no-await-in-loop
        await tx.done;
      } catch {
        // Keep the original record if quarantine storage is unavailable.
      }
    }
  }
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(projectId: string) {
  const db = await dbPromise;
  await db.delete('projects', projectId);
}

export async function saveAudioBlob(id: string, blob: Blob) {
  const db = await dbPromise;
  await db.put('audio', blob, id);
}

export async function loadAudioBlob(id: string) {
  const db = await dbPromise;
  return db.get('audio', id);
}

export async function collectOrphanAudio(undoProjects: Project[] = []): Promise<{ removed: number; freedBytes: number }> {
  const db = await dbPromise;
  const stored = await db.getAll('projects') as unknown[];
  const projects = stored.map(migrateProject);
  if (projects.some((project) => project === null) || await db.count('projects-quarantine') > 0) {
    const result = { removed: 0, freedBytes: 0 };
    await saveMeta('audio-gc-last', { ...result, skipped: 'unknown-project-version', at: Date.now() });
    return result;
  }
  const referenced = new Set<string>();
  for (const project of [...projects, ...undoProjects]) {
    if (!project) continue;
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        if (clip.source.kind === 'recording') referenced.add(clip.source.audioId);
      }
    }
  }
  const keys = await db.getAllKeys('audio');
  let removed = 0;
  let freedBytes = 0;
  for (const key of keys) {
    if (referenced.has(key)) continue;
    // eslint-disable-next-line no-await-in-loop
    const blob = await db.get('audio', key);
    freedBytes += blob?.size ?? 0;
    // eslint-disable-next-line no-await-in-loop
    await db.delete('audio', key);
    removed += 1;
  }
  const result = { removed, freedBytes };
  await saveMeta('audio-gc-last', { ...result, at: Date.now() });
  return result;
}

export async function getAudioBlobCount(): Promise<number> {
  const db = await dbPromise;
  return db.count('audio');
}

export async function saveMeta(key: string, value: unknown) {
  const db = await dbPromise;
  await db.put('meta', value, key);
}

export async function loadMeta<T>(key: string): Promise<T | undefined> {
  const db = await dbPromise;
  return db.get('meta', key) as Promise<T | undefined>;
}
