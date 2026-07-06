import { Mic, Plus, RotateCcw, Square, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { audioEngine } from '../../audio/engine';
import { trackScheduler } from '../../audio/trackNodes';
import { useProjectStore } from '../../stores/projectStore';
import { useUiStore } from '../../stores/uiStore';
import { formatBarBeat } from '../../utils/music';
import { IconButton } from '../common/IconButton';

type TransportBarProps = {
  positionBars: number;
  onRecord: () => void;
  onToast: (message: string) => void;
};

export function TransportBar({ positionBars, onRecord, onToast }: TransportBarProps) {
  const project = useProjectStore((state) => state.currentProject);
  const setBpm = useProjectStore((state) => state.setBpm);
  const setLoopLength = useProjectStore((state) => state.setLoopLength);
  const setLoopSheetOpen = useUiStore((state) => state.setLoopSheetOpen);
  const [engineState, setEngineState] = useState(audioEngine.getState());

  useEffect(() => audioEngine.subscribe(setEngineState), []);

  useEffect(() => {
    audioEngine.setBpm(project.bpm);
    audioEngine.setLoopLength(project.loopLengthBars);
  }, [project.bpm, project.loopLengthBars]);

  async function togglePlay() {
    if (!engineState.initialized || engineState.needsResume) {
      await audioEngine.ensureReady();
      onToast('소리가 켜졌어요');
    }
    if (audioEngine.getState().playing) {
      audioEngine.pause();
    } else {
      await trackScheduler.syncProject(project);
      audioEngine.play();
      localStorage.setItem('loop-pocket-first-sound', String(Date.now()));
    }
  }

  return (
    <footer className="safe-bottom border-t border-studio-border bg-studio-bg/95 px-3 pb-2">
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
            onChange={(event) => setBpm(Number(event.target.value))}
            className="min-w-0 flex-1"
          />
        </label>
        <strong className="rounded-full border border-studio-border px-3 py-1 text-studio-text">
          {formatBarBeat(positionBars)}
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
    </footer>
  );
}
