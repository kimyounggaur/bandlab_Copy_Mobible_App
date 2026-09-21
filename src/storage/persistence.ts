import { getAudioBlobCount, loadMeta, saveMeta } from './db';

let pendingPersist: Promise<{ granted: boolean; showInstallHint: boolean }> | null = null;

export function requestPersistenceAfterMeaningfulAction(): Promise<{ granted: boolean; showInstallHint: boolean }> {
  pendingPersist ??= tryPersistence().finally(() => { pendingPersist = null; });
  return pendingPersist;
}

async function tryPersistence(): Promise<{ granted: boolean; showInstallHint: boolean }> {
  const storage = navigator.storage;
  if (!storage?.persist) return { granted: false, showInstallHint: await shouldShowInstallHint() };
  const granted = await storage.persisted().catch(() => false)
    || await storage.persist().catch(() => false);
  await saveMeta('storage-persist-result', { granted, at: Date.now() });
  return { granted, showInstallHint: !granted && await shouldShowInstallHint() };
}

async function shouldShowInstallHint(): Promise<boolean> {
  if (await getAudioBlobCount() === 0) return false;
  if (await loadMeta<boolean>('storage-install-hint-shown')) return false;
  await saveMeta('storage-install-hint-shown', true);
  return true;
}

export async function getStorageUsage(): Promise<{ usage: number; quota: number; persistent: boolean } | null> {
  if (!navigator.storage?.estimate) return null;
  const [estimate, persistent] = await Promise.all([
    navigator.storage.estimate(),
    navigator.storage.persisted?.().catch(() => false) ?? Promise.resolve(false),
  ]);
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0, persistent };
}
