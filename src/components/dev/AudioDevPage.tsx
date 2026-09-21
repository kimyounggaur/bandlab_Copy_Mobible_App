import { useEffect, useState } from 'react';
import { audioEngine } from '../../audio/engine';
import { measureFormatAlignment, type AlignmentRow } from '../../audio/formatAlignment';
import { measurePipelineLatency } from '../../audio/latency';
import { useProjectStore } from '../../stores/projectStore';
import { formatBarBeat } from '../../utils/music';

export function AudioDevPage() {
  const [position, setPosition] = useState(0);
  const [state, setState] = useState(audioEngine.getState());
  const [alignment, setAlignment] = useState<AlignmentRow[]>([]);
  const [checkingFormats, setCheckingFormats] = useState(false);

  useEffect(() => audioEngine.subscribe(setState), []);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setPosition(audioEngine.getPositionInBars());
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="safe-top safe-bottom h-dvh bg-studio-bg p-4 text-studio-text">
      <h1 className="text-display font-bold">오디오 점검</h1>
      <p className="mt-2 text-body text-studio-muted">소리는 이 화면의 버튼을 누른 뒤에만 켜집니다.</p>
      <div className="mt-5 grid gap-3">
        <button className="min-h-12 rounded-studio bg-studio-accent font-semibold text-white" onClick={() => audioEngine.ensureReady()}>
          소리 켜기
        </button>
        <div className="grid grid-cols-3 gap-2">
          <button className="min-h-12 rounded-studio bg-studio-card" onClick={() => audioEngine.play()}>
            재생
          </button>
          <button className="min-h-12 rounded-studio bg-studio-card" onClick={() => audioEngine.pause()}>
            일시정지
          </button>
          <button className="min-h-12 rounded-studio bg-studio-card" onClick={() => audioEngine.stop()}>
            정지
          </button>
        </div>
        <label className="rounded-panel border border-studio-border bg-studio-card p-3">
          BPM {state.bpm}
          <input
            type="range"
            min={60}
            max={200}
            value={state.bpm}
            onChange={(event) => useProjectStore.getState().setBpm(Number(event.target.value))}
            className="mt-2 w-full"
          />
        </label>
        <button
          className="min-h-12 rounded-studio bg-studio-card"
          onClick={() => audioEngine.setMetronome(!state.metronome)}
        >
          메트로놈 {state.metronome ? '끄기' : '켜기'}
        </button>
        <button
          className="min-h-12 rounded-studio bg-studio-card"
          onClick={() => {
            const until = performance.now() + 400;
            while (performance.now() < until) { /* intentional diagnostic stall */ }
          }}
        >
          메인 스레드 400ms 정지
        </button>
        <button
          className="min-h-12 rounded-studio bg-studio-card"
          onClick={async () => {
            await audioEngine.ensureReady();
            await measurePipelineLatency(true);
          }}
        >
          녹음 지연 다시 측정
        </button>
        <button
          disabled={checkingFormats}
          className="min-h-12 rounded-studio bg-studio-card disabled:opacity-50"
          onClick={async () => {
            setCheckingFormats(true);
            try {
              await audioEngine.ensureReady();
              setAlignment(await measureFormatAlignment());
            } finally {
              setCheckingFormats(false);
            }
          }}
        >
          {checkingFormats ? '검사 중...' : '포맷 정렬 검사'}
        </button>
        {alignment.length > 0 && (
          <table className="w-full text-left text-micro">
            <thead><tr><th>루프</th><th>포맷</th><th>시작 오프셋</th><th>길이 차이</th></tr></thead>
            <tbody>
              {alignment.map((row) => (
                <tr key={`${row.loopId}-${row.format}`}>
                  <td>{row.loopId}</td><td>{row.format}</td>
                  <td>{row.error ?? `${row.offsetSamples}샘플`}</td>
                  <td>{row.error ? '-' : `${row.lengthDifference}샘플`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="rounded-panel border border-studio-border bg-studio-card p-4 text-title">현재 위치 {formatBarBeat(position)}</p>
      </div>
    </main>
  );
}
