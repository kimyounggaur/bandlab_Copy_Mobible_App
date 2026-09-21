import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { getFunnel, getKeyMetrics, initializeFunnel, mark, resetFunnel, type FunnelEntry } from '../../analytics/funnel';

const labels: Record<FunnelEntry['event'], string> = {
  app_open: '앱 열기',
  onboarding_shown: '온보딩 표시',
  genre_selected: '장르 선택',
  first_sound: '첫 소리',
  first_loop_added: '첫 루프 추가',
  first_recording: '첫 녹음',
  first_export: '첫 내보내기',
  eight_bar_complete: '8마디 완성',
};

function formatElapsed(ms: number | null) {
  if (ms === null) return '측정 전';
  const seconds = Math.floor(ms / 1000);
  return seconds < 60 ? `${seconds}초` : `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
}

function Target({ title, elapsed, targetMs }: { title: string; elapsed: number | null; targetMs: number }) {
  const ratio = elapsed === null ? 0 : Math.min(1, elapsed / (targetMs * 1.5));
  const passed = elapsed !== null && elapsed <= targetMs;
  return (
    <section className="border-b border-studio-border py-5">
      <p className="text-body text-studio-muted">{title}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <strong className="text-display text-studio-text">{formatElapsed(elapsed)}</strong>
        <span className={passed ? 'text-studio-success' : 'text-studio-warning'}>기준 {formatElapsed(targetMs)}</span>
      </div>
      <div className="relative mt-3 h-3 bg-studio-card">
        <span className={`absolute inset-y-0 left-0 ${passed ? 'bg-studio-success' : 'bg-studio-warning'}`} style={{ width: `${ratio * 100}%` }} />
        <span className="absolute inset-y-[-4px] border-l-2 border-white" style={{ left: '66.67%' }} />
      </div>
    </section>
  );
}

export function FunnelPage() {
  const [entries, setEntries] = useState<FunnelEntry[]>(getFunnel);
  useEffect(() => {
    void initializeFunnel().then(() => setEntries(getFunnel()));
  }, []);
  const metrics = getKeyMetrics();
  const sessions = [...new Set(entries.map((entry) => entry.sessionId))].reverse();

  function reset() {
    resetFunnel();
    mark('app_open');
    setEntries(getFunnel());
  }

  return (
    <main className="studio-scrollbar min-h-dvh bg-studio-bg px-5 py-7 text-studio-text">
      <div className="mx-auto max-w-xl">
        <header className="flex items-center justify-between">
          <h1 className="text-title font-bold">사용 흐름</h1>
          <button type="button" title="측정 초기화" aria-label="측정 초기화" onClick={reset} className="grid size-11 place-items-center rounded-studio bg-studio-card">
            <RotateCcw size={18} />
          </button>
        </header>
        <Target title="첫 소리까지" elapsed={metrics.timeToFirstSoundMs} targetMs={30_000} />
        <Target title="8마디까지" elapsed={metrics.timeToEightBarsMs} targetMs={180_000} />
        {sessions.map((id, index) => {
          const sessionEntries = entries.filter((entry) => entry.sessionId === id);
          const start = sessionEntries.find((entry) => entry.event === 'app_open')?.t ?? sessionEntries[0]?.t ?? 0;
          return (
            <section key={id} className="border-b border-studio-border py-5">
              <h2 className="text-ui font-semibold">{index === 0 ? '현재 세션' : id === 'legacy' ? '이전 기록' : '과거 세션'}</h2>
              <ol className="mt-3 space-y-3">
                {sessionEntries.map((entry) => (
                  <li key={`${entry.event}-${entry.t}`} className="flex justify-between gap-4 text-body">
                    <span>{labels[entry.event]}</span>
                    <time className="text-studio-muted">+{formatElapsed(entry.t - start)}</time>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </main>
  );
}
