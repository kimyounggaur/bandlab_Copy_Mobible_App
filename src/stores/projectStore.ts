import { create } from 'zustand';
import { loopManifest, starterLoopsForGenre } from '../data/loopManifest';
import { deleteProject as deleteProjectFromDb, loadProjects, saveProject } from '../storage/db';
import type { Clip, EffectSettings, LoopGenre, Project, Track, TrackType } from '../types/project';
import { createId } from '../utils/ids';
import { trackColors } from '../utils/music';

const defaultEffects = (): EffectSettings => ({
  reverb: { on: false, mode: 'room', amount: 0 },
  delay: { on: false, sync: '1/8', amount: 0 },
  tone: { on: false, tilt: 50, bassBoost: false },
  vocalPreset: null,
});

function createTrack(name: string, type: TrackType, index: number): Track {
  return {
    id: createId('track'),
    name,
    type,
    color: trackColors[index % trackColors.length],
    volume: 80,
    pan: 0,
    mute: false,
    solo: false,
    armed: false,
    effects: defaultEffects(),
    clips: [],
  };
}

export function createStarterProject(genre: LoopGenre = 'hiphop'): Project {
  const now = Date.now();
  const loops = starterLoopsForGenre(genre);
  const drums = createTrack('드럼', 'audio', 0);
  const bass = createTrack('베이스', 'audio', 1);
  if (loops.drums) {
    drums.clips.push({
      id: createId('clip'),
      startBar: 0,
      lengthBars: 4,
      gain: 1,
      name: loops.drums.name,
      source: { kind: 'loop', loopId: loops.drums.id },
    });
  }
  if (loops.bass) {
    bass.clips.push({
      id: createId('clip'),
      startBar: 0,
      lengthBars: 4,
      gain: 1,
      name: loops.bass.name,
      source: { kind: 'loop', loopId: loops.bass.id },
    });
  }

  const bpmByGenre: Record<LoopGenre, number> = { hiphop: 90, pop: 104, edm: 124 };
  return {
    version: 1,
    id: createId('project'),
    name: `${genre === 'hiphop' ? '힙합' : genre === 'pop' ? '팝' : 'EDM'} 스케치`,
    createdAt: now,
    updatedAt: now,
    bpm: bpmByGenre[genre],
    key: 'Cm',
    timeSignature: [4, 4],
    loopLengthBars: 8,
    tracks: [drums, bass],
  };
}

function touch(project: Project): Project {
  return { ...project, updatedAt: Date.now() };
}

type ProjectStore = {
  projects: Project[];
  currentProject: Project;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  past: Project[];
  future: Project[];
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  loadSavedProjects: () => Promise<void>;
  setCurrentProject: (projectId: string) => void;
  createProject: (genre?: LoopGenre) => Project;
  renameProject: (name: string) => void;
  deleteProject: (projectId: string) => Promise<void>;
  addTrack: (type: TrackType, name?: string) => Track | null;
  updateTrack: (trackId: string, patch: Partial<Track>, withHistory?: boolean) => void;
  addClip: (trackId: string, clip: Clip) => void;
  addLoopToSelectedTrack: (loopId: string, startBar: number) => void;
  updateClip: (trackId: string, clipId: string, patch: Partial<Clip>, withHistory?: boolean) => void;
  duplicateClip: (trackId: string, clipId: string) => void;
  removeClip: (trackId: string, clipId: string) => void;
  selectTrack: (trackId: string | null) => void;
  selectClip: (clipId: string | null) => void;
  setBpm: (bpm: number) => void;
  setLoopLength: (bars: 4 | 8 | 16) => void;
  beginHistory: () => void;
  undo: () => void;
  redo: () => void;
  saveNow: () => Promise<void>;
};

const initialProject = createStarterProject('hiphop');

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [initialProject],
  currentProject: initialProject,
  selectedTrackId: initialProject.tracks[0]?.id ?? null,
  selectedClipId: null,
  past: [],
  future: [],
  saveStatus: 'idle',

  async loadSavedProjects() {
    const saved = await loadProjects();
    if (!saved.length) return;
    set({
      projects: saved,
      currentProject: saved[0],
      selectedTrackId: saved[0].tracks[0]?.id ?? null,
      selectedClipId: null,
    });
  },

  setCurrentProject(projectId) {
    const project = get().projects.find((item) => item.id === projectId);
    if (!project) return;
    set({ currentProject: project, selectedTrackId: project.tracks[0]?.id ?? null, selectedClipId: null, past: [], future: [] });
  },

  createProject(genre = 'hiphop') {
    const project = createStarterProject(genre);
    set((state) => ({
      projects: [project, ...state.projects],
      currentProject: project,
      selectedTrackId: project.tracks[0]?.id ?? null,
      selectedClipId: null,
      past: [],
      future: [],
    }));
    void saveProject(project);
    return project;
  },

  renameProject(name) {
    mutateProject(set, get, (project) => ({ ...project, name }));
  },

  async deleteProject(projectId) {
    await deleteProjectFromDb(projectId);
    set((state) => {
      const projects = state.projects.filter((project) => project.id !== projectId);
      const currentProject = projects[0] ?? createStarterProject('hiphop');
      return { projects: projects.length ? projects : [currentProject], currentProject };
    });
  },

  addTrack(type, name) {
    const project = get().currentProject;
    if (project.tracks.length >= 8) return null;
    const track = createTrack(name ?? `트랙 ${project.tracks.length + 1}`, type, project.tracks.length);
    mutateProject(set, get, (item) => ({ ...item, tracks: [...item.tracks, track] }));
    set({ selectedTrackId: track.id });
    return track;
  },

  updateTrack(trackId, patch, withHistory = true) {
    mutateProject(
      set,
      get,
      (project) => ({
        ...project,
        tracks: project.tracks.map((track) => (track.id === trackId ? { ...track, ...patch } : track)),
      }),
      withHistory,
    );
  },

  addClip(trackId, clip) {
    mutateProject(set, get, (project) => ({
      ...project,
      tracks: project.tracks.map((track) => (track.id === trackId ? { ...track, clips: [...track.clips, clip] } : track)),
    }));
    set({ selectedTrackId: trackId, selectedClipId: clip.id });
  },

  addLoopToSelectedTrack(loopId, startBar) {
    const loop = loopManifest.find((item) => item.id === loopId);
    if (!loop) return;
    let trackId = get().selectedTrackId;
    if (!trackId) {
      const track = get().addTrack('audio', loop.category === 'drums' ? '드럼' : loop.name);
      trackId = track?.id ?? null;
    }
    if (!trackId) return;
    get().addClip(trackId, {
      id: createId('clip'),
      startBar,
      lengthBars: loop.bars,
      gain: 1,
      name: loop.name,
      source: { kind: 'loop', loopId },
    });
  },

  updateClip(trackId, clipId, patch, withHistory = true) {
    mutateProject(
      set,
      get,
      (project) => ({
        ...project,
        tracks: project.tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                clips: track.clips.map((clip) => (clip.id === clipId ? { ...clip, ...patch } : clip)),
              }
            : track,
        ),
      }),
      withHistory,
    );
  },

  duplicateClip(trackId, clipId) {
    const track = get().currentProject.tracks.find((item) => item.id === trackId);
    const clip = track?.clips.find((item) => item.id === clipId);
    if (!track || !clip) return;
    get().addClip(trackId, { ...clip, id: createId('clip'), startBar: clip.startBar + clip.lengthBars });
  },

  removeClip(trackId, clipId) {
    mutateProject(set, get, (project) => ({
      ...project,
      tracks: project.tracks.map((track) =>
        track.id === trackId ? { ...track, clips: track.clips.filter((clip) => clip.id !== clipId) } : track,
      ),
    }));
    set({ selectedClipId: null });
  },

  selectTrack(trackId) {
    set({ selectedTrackId: trackId });
  },

  selectClip(clipId) {
    set({ selectedClipId: clipId });
  },

  setBpm(bpm) {
    mutateProject(set, get, (project) => ({ ...project, bpm: Math.min(200, Math.max(60, bpm)) }));
  },

  setLoopLength(bars) {
    mutateProject(set, get, (project) => ({ ...project, loopLengthBars: bars }));
  },

  beginHistory() {
    set((state) => ({ past: [...state.past.slice(-19), state.currentProject], future: [] }));
  },

  undo() {
    set((state) => {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        currentProject: previous,
        projects: mergeProject(state.projects, previous),
        past: state.past.slice(0, -1),
        future: [state.currentProject, ...state.future].slice(0, 20),
      };
    });
  },

  redo() {
    set((state) => {
      const next = state.future[0];
      if (!next) return state;
      return {
        currentProject: next,
        projects: mergeProject(state.projects, next),
        past: [...state.past.slice(-19), state.currentProject],
        future: state.future.slice(1),
      };
    });
  },

  async saveNow() {
    const project = get().currentProject;
    set({ saveStatus: 'saving' });
    try {
      await saveProject(project);
      set((state) => ({ projects: mergeProject(state.projects, project), saveStatus: 'saved' }));
    } catch {
      set({ saveStatus: 'error' });
    }
  },
}));

function mergeProject(projects: Project[], project: Project) {
  const next = [project, ...projects.filter((item) => item.id !== project.id)];
  return next.sort((a, b) => b.updatedAt - a.updatedAt);
}

function mutateProject(
  set: (partial: Partial<ProjectStore> | ((state: ProjectStore) => Partial<ProjectStore>)) => void,
  get: () => ProjectStore,
  updater: (project: Project) => Project,
  withHistory = true,
) {
  const state = get();
  const previous = state.currentProject;
  const next = touch(updater(previous));
  set({
    currentProject: next,
    projects: mergeProject(state.projects, next),
    past: withHistory ? [...state.past.slice(-19), previous] : state.past,
    future: withHistory ? [] : state.future,
  });
}
