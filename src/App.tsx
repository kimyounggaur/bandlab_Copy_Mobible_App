import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine } from './audio/engine';
import { trackScheduler } from './audio/trackNodes';
import { collectOrphanAudio } from './storage/db';
import { HomePage } from './components/home/HomePage';
import { InstrumentsPanel } from './components/instruments/InstrumentsPanel';
import { MixerPanel } from './components/mixer/MixerPanel';
import { OnboardingGate } from './components/onboarding/OnboardingGate';
import { AppHeader } from './components/shell/AppHeader';
import { Timeline } from './components/timeline/Timeline';
import { TransportBar } from './components/transport/TransportBar';
import { SegmentedTabs } from './components/common/SegmentedTabs';
import { Toast } from './components/common/Toast';
import { useProjectStore } from './stores/projectStore';
import { useUiStore } from './stores/uiStore';
import { useWakeLock } from './hooks/useWakeLock';
import { initializeFunnel, mark, markEightBarComplete } from './analytics/funnel';

type Route = 'home' | 'studio' | 'tokens' | 'audio' | 'funnel';
function routeFromHash(): Route {
  if (window.location.hash === '#/') return 'home';
  if (import.meta.env.DEV && window.location.hash === '#/dev/tokens') return 'tokens';
  if (import.meta.env.DEV && window.location.hash === '#/dev/audio') return 'audio';
  if (import.meta.env.DEV && window.location.hash === '#/dev/funnel') return 'funnel';
  return 'studio';
}

function navigate(route: 'home' | 'studio') {
  window.location.hash = route === 'home' ? '#/' : '#/studio';
}

const AudioDevPage = import.meta.env.DEV
  ? lazy(() => import('./components/dev/AudioDevPage').then((module) => ({ default: module.AudioDevPage }))) : null;
const FunnelPage = import.meta.env.DEV
  ? lazy(() => import('./components/dev/FunnelPage').then((module) => ({ default: module.FunnelPage }))) : null;
const TokensPage = import.meta.env.DEV
  ? lazy(() => import('./components/dev/TokensPage').then((module) => ({ default: module.TokensPage }))) : null;
const EffectsSheet = lazy(() => import('./components/effects/EffectsSheet').then((module) => ({ default: module.EffectsSheet })));
const ExportSheet = lazy(() => import('./components/export/ExportSheet').then((module) => ({ default: module.ExportSheet })));
const RecordSheet = lazy(() => import('./components/recording/RecordSheet').then((module) => ({ default: module.RecordSheet })));
const LoopLibrarySheet = lazy(() => import('./components/library/LoopLibrarySheet').then((module) => ({ default: module.LoopLibrarySheet })));

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [recordOpen, setRecordOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const saveDebounceRef = useRef<number | null>(null);
  const saveMaxRef = useRef<number | null>(null);
  const project = useProjectStore((state) => state.currentProject);
  const loadSavedProjects = useProjectStore((state) => state.loadSavedProjects);
  const saveNow = useProjectStore((state) => state.saveNow);
  const hydrated = useProjectStore((state) => state.hydrated);
  const mode = useUiStore((state) => state.mode);
  const loopSheetOpen = useUiStore((state) => state.loopSheetOpen);
  const effectsTrackId = useUiStore((state) => state.effectsTrackId);
  const exportOpen = useUiStore((state) => state.exportOpen);
  const setMode = useUiStore((state) => state.setMode);
  const hydrateOnboarding = useUiStore((state) => state.hydrateOnboarding);

  useWakeLock();

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(window.history.state, '', '#/studio');
    const syncRoute = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  useEffect(() => {
    void loadSavedProjects();
  }, [loadSavedProjects]);

  useEffect(() => {
    void hydrateOnboarding();
  }, [hydrateOnboarding]);

  useEffect(() => {
    mark('app_open');
    void initializeFunnel().catch(() => undefined);
    markEightBarComplete(useProjectStore.getState().currentProject);
  }, []);

  useEffect(() => {
    const scheduleGc = () => {
      const state = useProjectStore.getState();
      void collectOrphanAudio([state.currentProject, ...state.past, ...state.future]).catch(() => undefined);
    };
    if (typeof window.requestIdleCallback === 'function') {
      const timer = window.setTimeout(() => window.requestIdleCallback(scheduleGc), 3000);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(scheduleGc, 3000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (route !== 'studio' && route !== 'home') return;
    const prefetch = () => { void import('./components/library/LoopLibrarySheet'); };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch);
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(prefetch, 500);
    return () => clearTimeout(id);
  }, [route]);

  const flushSave = useCallback(() => {
    if (saveDebounceRef.current !== null) window.clearTimeout(saveDebounceRef.current);
    if (saveMaxRef.current !== null) window.clearTimeout(saveMaxRef.current);
    saveDebounceRef.current = null;
    saveMaxRef.current = null;
    void saveNow();
  }, [saveNow]);

  useEffect(() => {
    if (!hydrated) return;
    if (saveDebounceRef.current !== null) window.clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = window.setTimeout(flushSave, 2000);
    saveMaxRef.current ??= window.setTimeout(flushSave, 10_000);
  }, [project, hydrated, flushSave]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) flushSave(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushSave);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushSave);
      if (saveDebounceRef.current !== null) window.clearTimeout(saveDebounceRef.current);
      if (saveMaxRef.current !== null) window.clearTimeout(saveMaxRef.current);
    };
  }, [flushSave]);

  useEffect(() => {
    const sync = () => {
      if (audioEngine.getState().initialized) void trackScheduler.syncProject(useProjectStore.getState().currentProject);
    };
    const unsubscribeProject = useProjectStore.subscribe((state, previous) => {
      if (state.currentProject !== previous.currentProject) sync();
    });
    let wasInitialized = false;
    const unsubscribeEngine = audioEngine.subscribe((state) => {
      if (state.initialized && !wasInitialized) sync();
      wasInitialized = state.initialized;
    });
    return () => {
      unsubscribeProject();
      unsubscribeEngine();
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (route === 'tokens' && TokensPage) return <Suspense fallback={null}><TokensPage /></Suspense>;
  if (route === 'audio' && AudioDevPage) return <Suspense fallback={null}><AudioDevPage /></Suspense>;
  if (route === 'funnel' && FunnelPage) return <Suspense fallback={null}><FunnelPage /></Suspense>;

  if (route === 'home') {
    return <HomePage onOpenProject={() => navigate('studio')} />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-studio-bg text-studio-text">
      <AppHeader onHome={() => navigate('home')} />
      <main className="min-h-0 flex-1">
        {mode === 'studio' ? <Timeline /> : null}
        {mode === 'instruments' ? <InstrumentsPanel /> : null}
        {mode === 'mixer' ? <MixerPanel /> : null}
      </main>
      <SegmentedTabs mode={mode} onModeChange={setMode} />
      <TransportBar onRecord={() => setRecordOpen(true)} onToast={setToast} />
      <Suspense fallback={null}>
        {loopSheetOpen ? <LoopLibrarySheet onToast={setToast} /> : null}
        {recordOpen ? <RecordSheet open={recordOpen} onClose={() => setRecordOpen(false)} onToast={setToast} /> : null}
        {effectsTrackId ? <EffectsSheet /> : null}
        {exportOpen ? <ExportSheet /> : null}
      </Suspense>
      <OnboardingGate
        onDone={() => {
          navigate('studio');
          setToast('재생 버튼을 눌러 들어보세요');
        }}
      />
      <Toast message={toast} />
    </div>
  );
}
