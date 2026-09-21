import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { audioEngine } from './audio/engine';
import { trackScheduler } from './audio/trackNodes';
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

type Screen = 'home' | 'studio';
const AudioDevPage = lazy(() => import('./components/dev/AudioDevPage').then((module) => ({ default: module.AudioDevPage })));
const TokensPage = lazy(() => import('./components/dev/TokensPage').then((module) => ({ default: module.TokensPage })));
const EffectsSheet = lazy(() => import('./components/effects/EffectsSheet').then((module) => ({ default: module.EffectsSheet })));
const ExportSheet = lazy(() => import('./components/export/ExportSheet').then((module) => ({ default: module.ExportSheet })));
const RecordSheet = lazy(() => import('./components/recording/RecordSheet').then((module) => ({ default: module.RecordSheet })));
const LoopLibrarySheet = lazy(() => import('./components/library/LoopLibrarySheet').then((module) => ({ default: module.LoopLibrarySheet })));

export default function App() {
  const path = window.location.pathname;
  const [screen, setScreen] = useState<Screen>('studio');
  const [recordOpen, setRecordOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const project = useProjectStore((state) => state.currentProject);
  const loadSavedProjects = useProjectStore((state) => state.loadSavedProjects);
  const saveNow = useProjectStore((state) => state.saveNow);
  const mode = useUiStore((state) => state.mode);
  const loopSheetOpen = useUiStore((state) => state.loopSheetOpen);
  const effectsTrackId = useUiStore((state) => state.effectsTrackId);
  const exportOpen = useUiStore((state) => state.exportOpen);
  const setMode = useUiStore((state) => state.setMode);

  const route = useMemo(() => {
    if (path === '/dev/tokens') return 'tokens';
    if (path === '/dev/audio') return 'audio';
    return 'app';
  }, [path]);

  useEffect(() => {
    void loadSavedProjects();
  }, [loadSavedProjects]);

  useEffect(() => {
    if (route !== 'app') return;
    const prefetch = () => { void import('./components/library/LoopLibrarySheet'); };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch);
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(prefetch, 500);
    return () => clearTimeout(id);
  }, [route]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void saveNow();
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [project, saveNow]);

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

  if (route === 'tokens') return <Suspense fallback={null}><TokensPage /></Suspense>;
  if (route === 'audio') return <Suspense fallback={null}><AudioDevPage /></Suspense>;

  if (screen === 'home') {
    return <HomePage onOpenProject={() => setScreen('studio')} />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-studio-bg text-studio-text">
      <AppHeader onHome={() => setScreen('home')} />
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
          setScreen('studio');
          setToast('재생 버튼을 눌러 들어보세요');
        }}
      />
      <Toast message={toast} />
    </div>
  );
}
