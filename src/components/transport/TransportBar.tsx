import { CircleHelp, Mic, Plus, RotateCcw, Square, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../../audio/engine';
import { trackScheduler } from '../../audio/trackNodes';
import { useProjectStore } from '../../stores/projectStore';
import { loadMeta, saveMeta } from '../../storage/db';
import { mark } from '../../analytics/funnel';
import { useUiStore } from '../../stores/uiStore';
import { formatBarBeat } from '../../utils/music';
import { IconButton } from '../common/IconButton';

type TransportBarProps = {
  onRecord: () => void;
  onToast: (message: string) => void;
};

export function TransportBar({ onRecord, onToast }: TransportBarProps) {
  const project = useProjectStore((state) => state.currentProject);
  const setBpm = useProjectStore((state) => state.setBpm);
  const beginHistory = useProjectStore((state) => state.beginHistory);
  const setLoopLength = useProjectStore((state) => state.setLoopLength);
  const setLoopSheetOpen = useUiStore((state) => state.setLoopSheetOpen);
  const [engineState, setEngineState] = useState(audioEngine.getState());
  const positionRef = useRef<HTMLElement>(null);
  const bpmDragRef = useRef({ active: false, began: false });

  useEffect(() => audioEngine.subscribe(setEngineState), []);
  useEffect(() => {
    let frame = 0;
    const renderPosition = () => {
      if (positionRef.current) positionRef.current.textContent = formatBarBeat(audioEngine.getPositionInBars());
    };
    const tick = () => {
      renderPosition();
      frame = requestAnimationFrame(tick);
    };
    const refresh = () => {
      cancelAnimationFrame(frame);
      renderPosition();
      if (audioEngine.getState().playing && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const unsubscribe = audioEngine.subscribe(refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  async function togglePlay() {
    if (!engineState.initialized || engineState.needsResume) {
      await audioEngine.ensureReady();
      onToast('소리가 켜졌어요');
    }
    if (audioEngine.getState().playing) {
      audioEngine.pause();
    } else {
      await trackScheduler.syncProject(project);
      if (audioEngine.play()) mark('first_sound');
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)
        && !await loadMeta<boolean>('ios-silent-hint-shown')) {
        await saveMeta('ios-silent-hint-shown', true);
        onToast('소리가 안 들리면 폰 옆의 무음 스위치를 확인해주세요');
      }
    }
  }

  return (
    <footer className="safe-bottom border-t border-studio-border bg-studio-bg/95 px-3 pb-2">
      {engineState.needsResume && (
        <button
          type="button"
          onClick={() => void audioEngine.ensureReady()}
          className="w-full rounded-studio border border-studio-warning px-3 py-2 text-body font-semibold text-studio-warning"
        >
          소리를 다시 켜려면 눌러주세요
        </button>
      )}
      <div className="flex items-center justify-between gap-2 py-2">
        <IconButton
          label={engineState.metronome ? '메트로놈 끄기' : '메트로놈 켜기'}
          icon={engineState.metronome ? Volume2 : VolumeX}
          active={engineState.metronome}
          onClick={() => audioEngine.setMetronome(!engineState.metronome)}
        />
        <IconButton label="처음으로" icon={RotateCcw} onClick={() => audioEngine.seek(0)} />
        <button
          type="button"
          aria-label={engineState.playing ? '일시정지' : '재생'}
          onClick={togglePlay}
          className={`grid h-16 min-w-20 place-items-center rounded-panel text-ui font-bold text-white transition active:scale-95 ${
            engineState.playing ? 'bg-studio-accentDown shadow-led' : 'bg-studio-accent shadow-led'
          }`}
        >
          {engineState.playing ? '일시정지' : '재생'}
        </button>
        <IconButton label="정지" icon={Square} onClick={() => audioEngine.stop()} />
        <IconButton label="녹음" icon={Mic} danger onClick={onRecord} />
        <IconButton label="사운드 추가" icon={Plus} active onClick={() => setLoopSheetOpen(true)} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pb-1 text-micro text-studio-muted">
        <label className="flex items-center gap-2">
          빠르기
          <input
            aria-label="빠르기 조절"
            type="range"
            min={60}
            max={200}
            value={project.bpm}
            onPointerDown={() => { bpmDragRef.current = { active: true, began: false }; }}
            onPointerUp={() => { bpmDragRef.current = { active: false, began: false }; }}
            onPointerCancel={() => { bpmDragRef.current = { active: false, began: false }; }}
            onChange={(event) => {
              if (bpmDragRef.current.active && !bpmDragRef.current.began) {
                beginHistory();
                bpmDragRef.current.began = true;
              }
              setBpm(Number(event.target.value), !bpmDragRef.current.active);
            }}
            className="min-w-0 flex-1"
          />
        </label>
        <strong ref={positionRef} className="rounded-full border border-studio-border px-3 py-1 text-studio-text">
          {formatBarBeat(audioEngine.getPositionInBars())}
        </strong>
        <select
          aria-label="루프 길이"
          value={project.loopLengthBars}
          onChange={(event) => setLoopLength(Number(event.target.value) as 4 | 8 | 16)}
          className="h-9 rounded-studio border border-studio-border bg-studio-card px-2 text-studio-text"
        >
          <option value={4}>4마디</option>
          <option value={8}>8마디</option>
          <option value={16}>16마디</option>
        </select>
      </div>
      <button
        type="button"
        onClick={() => onToast('소리가 안 들리면 무음 스위치와 기기 볼륨을 확인해주세요')}
        className="flex min-h-9 items-center gap-1 text-micro text-studio-muted"
      >
        <CircleHelp size={14} aria-hidden="true" />
        소리가 안 들려요
      </button>
    </footer>
  );
}
