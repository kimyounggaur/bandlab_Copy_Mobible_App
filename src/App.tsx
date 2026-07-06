import { useEffect, useMemo, useState } from 'react';
import { audioEngine } from './audio/engine';
import { trackScheduler } from './audio/trackNodes';
import { AudioDevPage } from './components/dev/AudioDevPage';
import { TokensPage } from './components/dev/TokensPage';
import { EffectsSheet } from './components/effects/EffectsSheet';
import { ExportSheet } from './components/export/ExportSheet';
import { HomePage } from './components/home/HomePage';
import { InstrumentsPanel } from './components/instruments/InstrumentsPanel';
import { LoopLibrarySheet } from './components/library/LoopLibrarySheet';
import { MixerPanel } from './components/mixer/MixerPanel';
import { OnboardingGate } from './components/onboarding/OnboardingGate';
import { RecordSheet } from './components/recording/RecordSheet';
import { AppHeader } from './components/shell/AppHeader';
import { Timeline } from './components/timeline/Timeline';
import { TransportBar } from './components/transport/TransportBar';
import { SegmentedTabs } from './components/common/SegmentedTabs';
import { Toast } from './components/common/Toast';
import { useProjectStore } from './stores/projectStore';
import { useUiStore } from './stores/uiStore';

type Screen = 'home' | 'studio';

export default function App() {
  const path = window.location.pathname;
  const [screen, setScreen] = useState<Screen>('studio');
  const [positionBars, setPositionBars] = useState(0);
  const [recordOpen, setRecordOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const project = useProjectStore((state) => state.currentProject);
  const loadSavedProjects = useProjectStore((state) => state.loadSavedProjects);
  const saveNow = useProjectStore((state) => state.saveNow);
  const mode = useUiStore((state) => state.mode);
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
    const timeout = window.setTimeout(() => {
      void saveNow();
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [project, saveNow]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setPositionBars(audioEngine.getPositionInBars());
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const state = audioEngine.getState();
    if (!state.initialized) return;
    void trackScheduler.syncProject(project);
  }, [project]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (route === 'tokens') return <TokensPage />;
  if (route === 'audio') return <AudioDevPage />;

  if (screen === 'home') {
    return <HomePage onOpenProject={() => setScreen('studio')} />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-studio-bg text-studio-text">
      <AppHeader onHome={() => setScreen('home')} />
      <main className="min-h-0 flex-1">
        {mode === 'studio' ? <Timeline positionBars={positionBars} /> : null}
        {mode === 'instruments' ? <InstrumentsPanel /> : null}
        {mode === 'mixer' ? <MixerPanel /> : null}
      </main>
      <SegmentedTabs mode={mode} onModeChange={setMode} />
      <TransportBar positionBars={positionBars} onRecord={() => setRecordOpen(true)} onToast={setToast} />
      <LoopLibrarySheet playheadBar={positionBars} onToast={setToast} />
      <RecordSheet open={recordOpen} playheadBar={positionBars} onClose={() => setRecordOpen(false)} onToast={setToast} />
      <EffectsSheet />
      <ExportSheet />
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
