import { loadMeta, saveMeta } from '../storage/db';
import type { Project } from '../types/project';

export type FunnelEvent =
  | 'app_open' | 'onboarding_shown' | 'genre_selected'
  | 'first_sound' | 'first_loop_added' | 'first_recording'
  | 'first_export' | 'eight_bar_complete';

export type FunnelEntry = {
  event: FunnelEvent;
  t: number;
  sessionId: string;
  meta?: Record<string, unknown>;
};

const STORAGE_KEY = 'funnel-v1';
const sessionId = crypto.randomUUID();
const eventNames: FunnelEvent[] = [
  'app_open', 'onboarding_shown', 'genre_selected', 'first_sound',
  'first_loop_added', 'first_recording', 'first_export', 'eight_bar_complete',
];
const legacyKeys: Array<[string, FunnelEvent]> = [
  ['loop-pocket-onboarding-start', 'genre_selected'],
  ['loop-pocket-first-sound', 'first_sound'],
  ['loop-pocket-first-loop', 'first_loop_added'],
];

let entries: FunnelEntry[] = [];
let loaded = false;
let loading: Promise<void> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function persist(): Promise<void> {
  if (!loaded) return Promise.resolve();
  writeQueue = writeQueue.catch(() => undefined).then(() => saveMeta(STORAGE_KEY, entries));
  return writeQueue;
}

export function initializeFunnel(): Promise<void> {
  loading ??= (async () => {
    const stored = await loadMeta<unknown>(STORAGE_KEY).catch(() => []);
    const old = Array.isArray(stored) ? stored.filter((item): item is FunnelEntry =>
      item && typeof item === 'object'
      && eventNames.includes(item.event)
      && typeof item.t === 'number'
      && Number.isFinite(item.t)
      && typeof item.sessionId === 'string') : [];
    const migrated: FunnelEntry[] = [];
    for (const [key, event] of legacyKeys) {
      const value = Number(localStorage.getItem(key));
      if (Number.isFinite(value) && value > 0 && !old.some((item) => item.event === event && item.t === value)) {
        migrated.push({ event, t: value, sessionId: 'legacy' });
      }
    }
    entries = [...old, ...migrated, ...entries].sort((a, b) => a.t - b.t);
    loaded = true;
    await persist();
    for (const [key] of legacyKeys) localStorage.removeItem(key);
  })();
  return loading;
}

export function mark(event: FunnelEvent, meta?: Record<string, unknown>): void {
  if (entries.some((item) => item.sessionId === sessionId && item.event === event)) return;
  entries.push({ event, t: Date.now(), sessionId, ...(meta ? { meta } : {}) });
  void persist().catch(() => undefined);
}

export function getFunnel(): FunnelEntry[] {
  return [...entries].sort((a, b) => a.t - b.t);
}

export function getKeyMetrics(): {
  timeToFirstSoundMs: number | null;
  timeToEightBarsMs: number | null;
  reachedFirstSound: boolean;
  reachedEightBars: boolean;
} {
  const current = entries.filter((item) => item.sessionId === sessionId);
  const opened = current.find((item) => item.event === 'app_open')?.t;
  const sound = current.find((item) => item.event === 'first_sound')?.t;
  const eightBars = current.find((item) => item.event === 'eight_bar_complete')?.t;
  return {
    timeToFirstSoundMs: opened && sound ? Math.max(0, sound - opened) : null,
    timeToEightBarsMs: opened && eightBars ? Math.max(0, eightBars - opened) : null,
    reachedFirstSound: sound !== undefined,
    reachedEightBars: eightBars !== undefined,
  };
}

export function resetFunnel(): void {
  entries = [];
  void persist().catch(() => undefined);
}

export function markEightBarComplete(project: Project): void {
  const occupiedTracks = project.tracks.filter((track) => track.clips.length > 0).length;
  const totalBars = project.tracks.reduce(
    (sum, track) => sum + track.clips.reduce((clipSum, clip) => clipSum + Math.max(0, clip.lengthBars), 0), 0,
  );
  if (occupiedTracks >= 2 && totalBars >= 8) mark('eight_bar_complete', { projectId: project.id });
}
