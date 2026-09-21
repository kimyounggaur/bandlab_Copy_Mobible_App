import { useEffect, useRef, useState, type PointerEvent } from 'react';
import * as Tone from 'tone';
import { audioEngine } from '../../audio/engine';
import { createDrumKit, createKeys, drumPads, velocityFromPointer, type Instrument } from '../../audio/instruments';
import { trackScheduler } from '../../audio/trackNodes';
import { useProjectStore } from '../../stores/projectStore';
import type { NoteEvent } from '../../types/project';
import { createId } from '../../utils/ids';
import { barsToSeconds, barsToTonePosition } from '../../utils/music';
import { EmptyState } from '../common/EmptyState';
import { loadMeta, saveMeta } from '../../storage/db';

const notes = ['C4', 'D4', 'Eb4', 'G4', 'A4', 'C5', 'D5', 'Eb5'];
type RecordedHit = { instrument: 'drums' | 'keys_soft'; note: NoteEvent };
type PerformanceAnchor = { contextTime: number; startBar: number; bpm: number };

export function InstrumentsPanel() {
  const addTrack = useProjectStore((state) => state.addTrack);
  const addClip = useProjectStore((state) => state.addClip);
  const selectedTrackId = useProjectStore((state) => state.selectedTrackId);
  const loopLengthBars = useProjectStore((state) => state.currentProject.loopLengthBars);
  const setLoopLength = useProjectStore((state) => state.setLoopLength);
  const [scaleLocked, setScaleLocked] = useState(true);
  const [recording, setRecording] = useState(false);
  const [quantize, setQuantize] = useState<'off' | '8n' | '16n'>('16n');
  const [events, setEvents] = useState<RecordedHit[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [instrumentError, setInstrumentError] = useState<string | null>(null);
  const [overflow, setOverflow] = useState(false);
  const anchorRef = useRef<PerformanceAnchor | null>(null);
  const kitRef = useRef<Instrument | null>(null);
  const kitPromiseRef = useRef<Promise<Instrument> | null>(null);
  const keysRef = useRef<Instrument | null>(null);
  const routePromiseRef = useRef<Promise<void> | null>(null);
  const drumsRoutedRef = useRef(false);
  const keysRoutedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    const legacy = Boolean(localStorage.getItem('loop-pocket-pad-hint'));
    void loadMeta<boolean>('pad-hint-seen').then(async (seen) => {
      if (legacy) {
        await saveMeta('pad-hint-seen', true);
        localStorage.removeItem('loop-pocket-pad-hint');
      }
      if (alive) setShowHint(!(legacy || seen));
    }).catch(() => { if (alive) setShowHint(!legacy); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const promise = createDrumKit('lofi');
    kitPromiseRef.current = promise;
    void promise.then((kit) => {
      if (alive) kitRef.current = kit;
      else kit.dispose();
    }).catch(() => { if (alive) kitPromiseRef.current = null; });
    keysRef.current = createKeys('keys_soft');
    routePromiseRef.current = null;
    drumsRoutedRef.current = false;
    keysRoutedRef.current = false;
    return () => {
      alive = false;
      kitRef.current?.dispose();
      kitRef.current = null;
      keysRef.current?.dispose();
      keysRef.current = null;
      kitPromiseRef.current = null;
    };
  }, [selectedTrackId]);

  async function ensureRoute(): Promise<void> {
    routePromiseRef.current ??= trackScheduler.syncProject(useProjectStore.getState().currentProject);
    try {
      await routePromiseRef.current;
    } catch (error) {
      routePromiseRef.current = null;
      throw error;
    }
  }

  function padVelocity(event: PointerEvent<HTMLButtonElement>): number {
    const rect = event.currentTarget.getBoundingClientRect();
    return velocityFromPointer(event.pressure, (event.clientY - rect.top) / rect.height);
  }

  function rememberHint(): void {
    void saveMeta('pad-hint-seen', true).catch(() => undefined);
    setShowHint(false);
  }

  function recordHit(instrument: RecordedHit['instrument'], note: string, velocity: number, hitTime: number): void {
    const anchor = anchorRef.current;
    if (!recording || !anchor) return;
    const rawBar = Math.max(0, (hitTime - anchor.contextTime) / barsToSeconds(1, anchor.bpm));
    setEvents((items) => [...items, {
      instrument,
      note: { t: barsToTonePosition(rawBar), rawBar, note, dur: instrument === 'drums' ? '16n' : '8n', velocity },
    }]);
  }

  async function hitDrum(padId: string, event: PointerEvent<HTMLButtonElement>) {
    const velocity = padVelocity(event);
    const hitTime = Tone.immediate();
    recordHit('drums', padId, velocity, hitTime);
    rememberHint();
    try {
      await audioEngine.ensureReady();
      await ensureRoute();
      kitPromiseRef.current ??= createDrumKit('lofi');
      const kit = kitRef.current ?? await kitPromiseRef.current;
      if (!kit) return;
      kitRef.current = kit;
      if (!drumsRoutedRef.current) {
        kit.connectTo(trackScheduler.getTrackInput(selectedTrackId));
        drumsRoutedRef.current = true;
      }
      kit.trigger(padId, Tone.immediate(), velocity);
      setInstrumentError(null);
    } catch {
      kitPromiseRef.current = null;
      setInstrumentError('드럼 소리를 불러오지 못했어요');
    }
  }

  async function hitNote(note: string, event: PointerEvent<HTMLButtonElement>) {
    const velocity = padVelocity(event);
    recordHit('keys_soft', note, velocity, Tone.immediate());
    rememberHint();
    try {
      await audioEngine.ensureReady();
      await ensureRoute();
      const keys = keysRef.current;
      if (!keys) return;
      if (!keysRoutedRef.current) {
        keys.connectTo(trackScheduler.getTrackInput(selectedTrackId));
        keysRoutedRef.current = true;
      }
      keys.trigger(note, Tone.immediate(), velocity);
      setInstrumentError(null);
    } catch {
      setInstrumentError('건반 소리를 켜지 못했어요');
    }
  }

  async function startRecording() {
    try {
      await audioEngine.ensureReady();
      const project = useProjectStore.getState().currentProject;
      anchorRef.current = {
        contextTime: Tone.immediate(),
        startBar: audioEngine.getState().playing ? audioEngine.getPositionInBars() : 0,
        bpm: project.bpm,
      };
      setEvents([]);
      setOverflow(false);
      setRecording(true);
    } catch {
      setInstrumentError('연주 녹음을 시작하지 못했어요');
    }
  }

  function finishRecording() {
    const anchor = anchorRef.current;
    if (!anchor) return;
    setRecording(false);
    anchorRef.current = null;
    if (!events.length) return;
    let trackId = selectedTrackId;
    if (!trackId) trackId = addTrack('instrument', '연주')?.id ?? null;
    if (!trackId) return;
    const lengthBars = Math.max(0.25, Math.ceil(
      (Tone.immediate() - anchor.contextTime) / barsToSeconds(1, anchor.bpm) * 4,
    ) / 4);
    setOverflow(anchor.startBar + lengthBars > loopLengthBars);
    for (const instrument of ['drums', 'keys_soft'] as const) {
      const instrumentEvents = events.filter((item) => item.instrument === instrument).map((item) => item.note);
      if (!instrumentEvents.length) continue;
      addClip(trackId, {
        id: createId('clip'),
        startBar: anchor.startBar,
        lengthBars,
        gain: 1,
        name: instrument === 'drums' ? '드럼 연주' : '건반 연주',
        source: { kind: 'notes', instrument, notes: instrumentEvents, quantize },
      });
    }
    setEvents([]);
  }

  return (
    <div className="studio-scrollbar h-full overflow-y-auto p-4 pb-28">
      <section>
        <h2 className="mb-3 text-title font-semibold text-studio-text">드럼패드</h2>
        <div className="grid grid-cols-4 gap-2">
          {drumPads.map((pad) => (
            <button
              key={pad.id}
              type="button"
              aria-label={`${pad.label} 연주`}
              onPointerDown={(event) => { void hitDrum(pad.id, event); }}
              className="aspect-square min-h-16 touch-manipulation rounded-panel border border-studio-border bg-studio-card text-body font-semibold text-studio-text active:bg-studio-accent"
            >
              {pad.label}
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
              onPointerDown={(event) => { void hitNote(note, event); }}
              className="min-h-16 touch-manipulation rounded-panel border border-studio-border bg-studio-surface text-body font-semibold text-studio-text active:bg-studio-accent"
            >
              {note}
            </button>
          ))}
        </div>
        {showHint && <p className="mt-2 text-micro text-studio-muted">패드 아래쪽을 누르면 세게 쳐져요. 블루투스 이어폰은 소리가 늦을 수 있어요.</p>}
        {instrumentError && <p role="alert" className="mt-2 text-micro text-studio-record">{instrumentError}</p>}
        <div className="mt-4 flex items-center justify-between gap-3">
          <label htmlFor="note-quantize" className="text-body text-studio-muted">박자 자동 맞추기</label>
          <select id="note-quantize" value={quantize} onChange={(event) => setQuantize(event.target.value as typeof quantize)} className="min-h-11 rounded-studio border border-studio-border bg-studio-card px-3 text-body text-studio-text">
            <option value="off">끄기</option>
            <option value="8n">1/8</option>
            <option value="16n">1/16</option>
          </select>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { if (recording) setRecording(false); else void startRecording(); }}
            className={`min-h-12 rounded-studio text-body font-semibold ${recording ? 'bg-studio-record text-white shadow-record' : 'bg-studio-card text-studio-text'}`}
          >
            {recording ? '연주 녹음 중' : '연주 녹음'}
          </button>
          <button type="button" onClick={finishRecording} className="min-h-12 rounded-studio bg-studio-accent text-body font-semibold text-white">클립으로 넣기</button>
        </div>
        {overflow && (
          <div className="mt-3 flex items-center justify-between gap-2 text-micro text-studio-muted">
            <span>연주가 루프 길이보다 길어요.</span>
            {loopLengthBars < 16 && <button type="button" className="min-h-11 shrink-0 rounded-studio bg-studio-card px-3 text-body text-studio-text" onClick={() => { setLoopLength(loopLengthBars === 4 ? 8 : 16); setOverflow(false); }}>늘리기</button>}
          </div>
        )}
        {!events.length && (
          <div className="mt-4">
            <EmptyState title="건반을 눌러보세요" body="녹음 버튼을 켜면 연주가 클립으로 저장됩니다." actionLabel="연주 녹음" onAction={() => { void startRecording(); }} />
          </div>
        )}
      </section>
    </div>
  );
}
