import { useEffect, useState } from 'react';
import { audioEngine } from '../../audio/engine';
import { formatBarBeat } from '../../utils/music';

export function AudioDevPage() {
  const [position, setPosition] = useState(0);
  const [state, setState] = useState(audioEngine.getState());

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
            onChange={(event) => audioEngine.setBpm(Number(event.target.value))}
            className="mt-2 w-full"
          />
        </label>
        <button
          className="min-h-12 rounded-studio bg-studio-card"
          onClick={() => audioEngine.setMetronome(!state.metronome)}
        >
          메트로놈 {state.metronome ? '끄기' : '켜기'}
        </button>
        <p className="rounded-panel border border-studio-border bg-studio-card p-4 text-title">현재 위치 {formatBarBeat(position)}</p>
      </div>
    </main>
  );
}
