import type { Clip, Project, Track } from '../types/project';

export const CURRENT_PROJECT_VERSION = 3;
type Migration = { from: number; to: number; migrate: (project: Project) => Project };

export const migrations: Migration[] = [
  {
    from: 1,
    to: 2,
    migrate: (project) => ({ ...project, version: 2, masterVolume: 80 } as unknown as Project),
  },
  {
    from: 2,
    to: 3,
    migrate: (project) => ({
      ...project,
      version: 3,
      tracks: project.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => clip.source.kind === 'notes'
          ? { ...clip, source: { ...clip.source, quantize: clip.source.quantize ?? 'off' } }
          : clip),
      })),
    }),
  },
];

export function projectVersion(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null;
  const version = (raw as { version?: unknown }).version;
  return typeof version === 'number' && Number.isInteger(version) ? version : null;
}

export function migrateProject(raw: unknown): Project | null {
  const version = projectVersion(raw);
  if (version === null || version < 1 || version > CURRENT_PROJECT_VERSION) return null;
  let project = raw as Project;
  let current = version;
  while (current < CURRENT_PROJECT_VERSION) {
    const migration = migrations.find((item) => item.from === current);
    if (!migration) return null;
    try {
      project = migration.migrate(project);
    } catch {
      return null;
    }
    current = migration.to;
  }
  return isProject(project) ? project : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isClip(clip: unknown): clip is Clip {
  if (!isRecord(clip) || !isRecord(clip.source)) return false;
  if (typeof clip.id !== 'string' || typeof clip.name !== 'string'
    || !isFiniteNumber(clip.startBar) || !isFiniteNumber(clip.lengthBars)
    || !isFiniteNumber(clip.gain)) return false;
  const source = clip.source;
  if (source.kind === 'loop') return typeof source.loopId === 'string';
  if (source.kind === 'recording') return typeof source.audioId === 'string' && isFiniteNumber(source.offsetSec);
  if (source.kind !== 'notes' || !Array.isArray(source.notes)
    || !['off', '8n', '16n'].includes(String(source.quantize))) return false;
  return source.notes.every((note: unknown) => isRecord(note)
    && typeof note.t === 'string' && typeof note.note === 'string'
    && typeof note.dur === 'string'
    && (note.rawBar === undefined || isFiniteNumber(note.rawBar)));
}

function isTrack(track: unknown): track is Track {
  if (!isRecord(track) || !isRecord(track.effects)) return false;
  const effects = track.effects;
  return typeof track.id === 'string' && typeof track.name === 'string'
    && ['audio', 'instrument'].includes(String(track.type))
    && typeof track.color === 'string'
    && isFiniteNumber(track.volume) && isFiniteNumber(track.pan)
    && typeof track.mute === 'boolean' && typeof track.solo === 'boolean'
    && Array.isArray(track.clips) && track.clips.every(isClip)
    && isRecord(effects.reverb) && typeof effects.reverb.on === 'boolean'
    && isFiniteNumber(effects.reverb.amount) && ['room', 'hall'].includes(String(effects.reverb.mode))
    && isRecord(effects.delay) && typeof effects.delay.on === 'boolean'
    && isFiniteNumber(effects.delay.amount) && typeof effects.delay.sync === 'string'
    && isRecord(effects.tone) && typeof effects.tone.on === 'boolean'
    && isFiniteNumber(effects.tone.tilt) && typeof effects.tone.bassBoost === 'boolean';
}

function isProject(raw: unknown): raw is Project {
  if (!isRecord(raw)) return false;
  return raw.version === CURRENT_PROJECT_VERSION
    && typeof raw.id === 'string' && typeof raw.name === 'string'
    && isFiniteNumber(raw.createdAt) && isFiniteNumber(raw.updatedAt)
    && isFiniteNumber(raw.bpm) && isFiniteNumber(raw.masterVolume)
    && typeof raw.key === 'string'
    && Array.isArray(raw.timeSignature) && raw.timeSignature[0] === 4 && raw.timeSignature[1] === 4
    && [4, 8, 16].includes(raw.loopLengthBars as number)
    && Array.isArray(raw.tracks) && raw.tracks.every(isTrack);
}
