import { useState } from 'react';
import * as Tone from 'tone';
import { audioEngine } from '../../audio/engine';
import { useProjectStore } from '../../stores/projectStore';
import { createId } from '../../utils/ids';
import { EmptyState } from '../common/EmptyState';

const drumLabels = ['킥', '스네어', '클랩', '하이햇', '탐', '퍼크', '림', '오픈햇', '808', '스냅', '쉐이커', '크래시', '로우탐', '하이탐', '벨', '노이즈'];
const notes = ['C4', 'D4', 'Eb4', 'G4', 'A4', 'C5', 'D5', 'Eb5'];

export function InstrumentsPanel() {
  const addTrack = useProjectStore((state) => state.addTrack);
  const addClip = useProjectStore((state) => state.addClip);
  const selectedTrackId = useProjectStore((state) => state.selectedTrackId);
  const [scaleLocked, setScaleLocked] = useState(true);
  const [recording, setRecording] = useState(false);
  const [events, setEvents] = useState<Array<{ t: string; note: string; dur: string }>>([]);

  async function hitDrum(index: number) {
    await audioEngine.ensureReady();
    const synth = new Tone.MembraneSynth({ volume: -8 }).toDestination();
    synth.triggerAttackRelease(index % 4 === 0 ? 'C2' : 'G2', '16n');
    window.setTimeout(() => synth.dispose(), 500);
  }

  async function hitNote(note: string) {
    await audioEngine.ensureReady();
    const synth = new Tone.PolySynth(Tone.Synth, { volume: -10 }).toDestination();
    synth.triggerAttackRelease(note, '8n');
    if (recording) {
      setEvents((items) => [...items, { t: Tone.Transport.position.toString(), note, dur: '8n' }]);
    }
    window.setTimeout(() => synth.dispose(), 700);
  }

  function finishRecording() {
    let trackId = selectedTrackId;
    if (!trackId) {
      const track = addTrack('instrument', '스케일 키보드');
      trackId = track?.id ?? null;
    }
    if (trackId && events.length) {
      addClip(trackId, {
        id: createId('clip'),
        startBar: 0,
        lengthBars: 4,
        gain: 1,
        name: '건반 연주',
        source: { kind: 'notes', instrument: 'keys_soft', notes: events },
      });
    }
    setRecording(false);
    setEvents([]);
  }

  return (
    <div className="studio-scrollbar h-full overflow-y-auto p-4 pb-28">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-title font-semibold text-studio-text">드럼패드</h2>
          <span className="text-micro text-studio-muted">4x4 · 바로 소리</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {drumLabels.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-label={`${label} 연주`}
              onPointerDown={() => hitDrum(index)}
              className="aspect-square min-h-16 rounded-panel border border-studio-border bg-studio-card text-body font-semibold text-studio-text active:bg-studio-accent"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-title font-semibold text-studio-text">스케일 키보드</h2>
          <label className="flex min-h-11 items-center gap-2 text-body text-studio-muted">
            <input type="checkbox" checked={scaleLocked} onChange={(event) => setScaleLocked(event.target.checked)} />
            틀린 음 막기
          </label>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(scaleLocked ? notes : ['C4', 'C#4', 'D4', 'Eb4', 'E4', 'F4', 'F#4', 'G4']).map((note) => (
            <button
              key={note}
              type="button"
              aria-label={`${note} 연주`}
              onPointerDown={() => hitNote(note)}
              className="min-h-16 rounded-panel border border-studio-border bg-studio-surface text-body font-semibold text-studio-text active:bg-studio-accent"
            >
              {note}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRecording((value) => !value)}
            className={`min-h-12 rounded-studio text-body font-semibold ${recording ? 'bg-studio-record text-white shadow-record' : 'bg-studio-card text-studio-text'}`}
          >
            {recording ? '연주 녹음 중' : '연주 녹음'}
          </button>
          <button
            type="button"
            onClick={finishRecording}
            className="min-h-12 rounded-studio bg-studio-accent text-body font-semibold text-white"
          >
            클립으로 넣기
          </button>
        </div>
        {!events.length ? (
          <div className="mt-4">
            <EmptyState title="건반을 눌러보세요" body="녹음 버튼을 켜면 연주가 클립으로 저장됩니다." actionLabel="연주 녹음" onAction={() => setRecording(true)} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
