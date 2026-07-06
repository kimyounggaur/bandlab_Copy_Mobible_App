import { openDB, type DBSchema } from 'idb';
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
}

const dbPromise = openDB<LoopPocketDb>('loop-pocket-db', 1, {
  upgrade(db) {
    const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
    projectStore.createIndex('by-updated', 'updatedAt');
    db.createObjectStore('audio');
    db.createObjectStore('meta');
  },
});

export async function saveProject(project: Project) {
  const db = await dbPromise;
  await db.put('projects', project);
}

export async function loadProjects() {
  const db = await dbPromise;
  return (await db.getAllFromIndex('projects', 'by-updated')).sort((a, b) => b.updatedAt - a.updatedAt);
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
