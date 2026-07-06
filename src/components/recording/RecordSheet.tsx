import { useRef, useState } from 'react';
import { MicRecorder, type RecorderState } from '../../audio/recorder';
import { audioEngine } from '../../audio/engine';
import { useProjectStore } from '../../stores/projectStore';
import { createId } from '../../utils/ids';
import { BottomSheet } from '../common/BottomSheet';

type RecordSheetProps = {
  open: boolean;
  playheadBar: number;
  onClose: () => void;
  onToast: (message: string) => void;
};

export function RecordSheet({ open, playheadBar, onClose, onToast }: RecordSheetProps) {
  const recorderRef = useRef<MicRecorder | null>(null);
  const [state, setState] = useState<RecorderState>('idle');
  const [monitoring, setMonitoring] = useState(false);
  const [offsetMs, setOffsetMs] = useState(0);
  const selectedTrackId = useProjectStore((store) => store.selectedTrackId);
  const addTrack = useProjectStore((store) => store.addTrack);
  const addClip = useProjectStore((store) => store.addClip);

  async function start() {
    try {
      setState('requesting');
      await audioEngine.ensureReady();
      recorderRef.current ??= new MicRecorder();
      await recorderRef.current.request();
      setState('recording');
      await recorderRef.current.start();
    } catch {
      setState('denied');
    }
  }

  async function stop() {
    try {
      const result = await recorderRef.current?.stop();
      if (!result) return;
      let trackId = selectedTrackId;
      if (!trackId) {
        const track = addTrack('audio', '녹음');
        trackId = track?.id ?? null;
      }
      if (trackId) {
        addClip(trackId, {
          id: createId('clip'),
          startBar: Math.max(0, playheadBar + offsetMs / 1000 / audioEngine.barDurationSeconds()),
          lengthBars: 1,
          gain: 1,
          name: '새 녹음',
          source: { kind: 'recording', audioId: result.audioId, offsetSec: 0 },
        });
      }
      setState('ready');
      onToast('녹음 클립을 만들었어요');
    } catch {
      setState('error');
    }
  }

  return (
    <BottomSheet open={open} title="마이크 녹음" onClose={onClose} height="half">
      <div className="space-y-4">
        <div className="rounded-panel border border-studio-border bg-studio-card p-4">
          <p className="text-title font-semibold text-studio-text">
            {state === 'recording'
              ? '녹음 중이에요'
              : state === 'denied'
                ? '마이크 권한이 필요해요'
                : '마이크로 목소리나 악기를 녹음해요'}
          </p>
          <p className="mt-2 text-body text-studio-muted">
            이어폰 없이 모니터링을 켜면 소리가 울릴 수 있어요. 처음 요청은 녹음 버튼을 누를 때만 진행합니다.
          </p>
          <div className={`mt-4 h-3 rounded-full ${state === 'recording' ? 'bg-studio-record shadow-record' : 'bg-studio-border'}`} />
        </div>

        <label className="flex min-h-12 items-center justify-between rounded-studio border border-studio-border bg-studio-card px-3 text-body">
          모니터링
          <input type="checkbox" checked={monitoring} onChange={(event) => setMonitoring(event.target.checked)} />
        </label>
        <label className="block text-micro text-studio-muted">
          녹음 타이밍 보정 {offsetMs}ms
          <input
            type="range"
            min={-200}
            max={200}
            value={offsetMs}
            onChange={(event) => setOffsetMs(Number(event.target.value))}
            className="mt-2 w-full"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={start}
            disabled={state === 'recording'}
            className="min-h-12 rounded-studio bg-studio-record text-body font-semibold text-white disabled:opacity-40"
          >
            녹음 시작
          </button>
          <button
            type="button"
            onClick={stop}
            disabled={state !== 'recording'}
            className="min-h-12 rounded-studio bg-studio-card text-body font-semibold disabled:opacity-40"
          >
            정지
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
