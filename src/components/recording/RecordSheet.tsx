import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { measureCalibration } from '../../audio/calibration';
import { audioEngine } from '../../audio/engine';
import { getRecordingLatency } from '../../audio/latency';
import { MicRecorder, type RecorderState } from '../../audio/recorder';
import { recordingPlacement } from '../../audio/recordingTiming';
import { useProjectStore } from '../../stores/projectStore';
import { requestPersistenceAfterMeaningfulAction } from '../../storage/persistence';
import { createId } from '../../utils/ids';
import { BottomSheet } from '../common/BottomSheet';
import { mark } from '../../analytics/funnel';

type RecordSheetProps = {
  open: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
};

export function RecordSheet({ open, onClose, onToast }: RecordSheetProps) {
  const recorderRef = useRef<MicRecorder | null>(null);
  const latencyRef = useRef(0);
  const [state, setState] = useState<RecorderState>('idle');
  const [countIn, setCountIn] = useState(true);
  const [countInRemaining, setCountInRemaining] = useState<number | null>(null);
  const [monitoring, setMonitoring] = useState(false);
  const [monitorWarningOpen, setMonitorWarningOpen] = useState(false);
  const [echoCancellation, setEchoCancellation] = useState(false);
  const [userTrimMs, setUserTrimMs] = useState(0);
  const [overflow, setOverflow] = useState(false);
  const selectedTrackId = useProjectStore((store) => store.selectedTrackId);
  const addTrack = useProjectStore((store) => store.addTrack);
  const addClip = useProjectStore((store) => store.addClip);
  const setLoopLength = useProjectStore((store) => store.setLoopLength);

  useEffect(() => audioEngine.subscribe((engine) => setCountInRemaining(engine.countInRemaining)), []);
  useEffect(() => () => {
    audioEngine.cancelCountIn();
    recorderRef.current?.setMonitoring(false);
    recorderRef.current?.dispose();
  }, []);

  async function start() {
    try {
      setState('requesting');
      setOverflow(false);
      await audioEngine.ensureReady();
      const recorder = recorderRef.current ?? new MicRecorder();
      recorderRef.current = recorder;
      await recorder.request(echoCancellation);
      latencyRef.current = await getRecordingLatency(recorder);
      if (monitoring) recorder.setMonitoring(true, disableFeedback);
      const project = useProjectStore.getState().currentProject;
      const startBar = audioEngine.getPositionInBars();
      if (countIn && !audioEngine.getState().playing) {
        const contextTime = await audioEngine.startWithCountIn(1, startBar, () => setState('recording'));
        recorder.start({ startBar, contextTime, bpm: project.bpm });
        setState('counting');
      } else {
        const contextTime = Tone.getContext().rawContext.currentTime;
        recorder.start({ startBar, contextTime, bpm: project.bpm });
        setState('recording');
      }
      audioEngine.setRecording(true);
    } catch (error) {
      audioEngine.cancelCountIn();
      audioEngine.setRecording(false);
      const denied = error instanceof DOMException && error.name === 'NotAllowedError';
      setState(denied ? 'denied' : 'error');
      if (!denied) onToast('마이크를 시작하지 못했어요');
    }
  }

  async function stop() {
    try {
      if (state === 'counting') {
        audioEngine.cancelCountIn();
        await recorderRef.current?.cancel();
        audioEngine.setRecording(false);
        setState('idle');
        return;
      }
      const result = await recorderRef.current?.stop();
      audioEngine.setRecording(false);
      if (!result) return;
      let trackId = selectedTrackId;
      if (!trackId) trackId = addTrack('audio', '녹음')?.id ?? null;
      if (trackId) {
        const placement = recordingPlacement(result.anchor, result.durationSec, latencyRef.current, userTrimMs);
        addClip(trackId, {
          id: createId('clip'),
          startBar: placement.startBar,
          lengthBars: placement.lengthBars,
          gain: 1,
          name: '새 녹음',
          source: { kind: 'recording', audioId: result.audioId, offsetSec: placement.offsetSec },
        });
        mark('first_recording');
        const project = useProjectStore.getState().currentProject;
        if (placement.startBar + placement.lengthBars > project.loopLengthBars) {
          setOverflow(true);
          onToast('녹음이 루프 길이보다 길어요. 루프 길이를 늘려볼까요?');
        } else {
          onToast('녹음 클립을 만들었어요');
        }
      }
      setState('ready');
      const persistence = await requestPersistenceAfterMeaningfulAction().catch(() => null);
      if (persistence?.showInstallHint) {
        window.setTimeout(() => onToast('만든 음악이 사라지지 않게 하려면 홈 화면에 추가해두세요'), 2400);
      }
    } catch {
      audioEngine.setRecording(false);
      setState('error');
      onToast('녹음을 저장하지 못했어요');
    }
  }

  async function close() {
    if (state === 'counting' || state === 'recording') await stop();
    recorderRef.current?.dispose();
    onClose();
  }

  function disableFeedback() {
    setMonitoring(false);
    onToast('소리가 커져 모니터링을 껐어요');
  }

  async function enableMonitoring() {
    setMonitorWarningOpen(false);
    try {
      await audioEngine.ensureReady();
      const recorder = recorderRef.current ?? new MicRecorder();
      recorderRef.current = recorder;
      await recorder.request(echoCancellation);
      const latency = await getRecordingLatency(recorder);
      if (latency > 0.06) onToast('내 목소리가 늦게 들릴 수 있어요');
      recorder.setMonitoring(true, disableFeedback);
      setMonitoring(true);
    } catch {
      onToast('마이크를 켜지 못했어요');
    }
  }

  async function calibrate(method: 'clap' | 'speaker') {
    setState('calibrating');
    recorderRef.current?.dispose();
    recorderRef.current = null;
    setMonitoring(false);
    try {
      await audioEngine.ensureReady();
      const result = await measureCalibration(method, useProjectStore.getState().currentProject.bpm);
      onToast(result.stable ? '폰이랑 박자를 맞췄어요' : '다시 한 번 해볼까요?');
      setState('idle');
    } catch {
      setState('error');
      onToast('박자를 맞추지 못했어요. 다시 해보세요');
    }
  }

  const project = useProjectStore.getState().currentProject;
  const nextLoopLength = project.loopLengthBars === 4 ? 8 : 16;

  return (
    <BottomSheet open={open} title="마이크 녹음" onClose={() => { void close(); }} height="tall">
      <div className="space-y-4">
        <div className="border-b border-studio-border pb-3">
          <p className="text-title font-semibold text-studio-text">
            {state === 'counting' ? (countInRemaining === 4 ? '준비' : String(countInRemaining ?? 1)) : state === 'recording' ? '녹음 중이에요' : state === 'calibrating' ? '폰이랑 박자 맞추는 중이에요' : state === 'denied' ? '마이크 권한이 필요해요' : state === 'error' ? '마이크를 확인해 주세요' : '마이크 녹음'}
          </p>
          <p className="mt-2 text-body text-studio-muted">이어폰을 바꿨다면 박자를 다시 맞춰주세요.</p>
          <div className={`mt-4 h-2 ${state === 'recording' ? 'bg-studio-record shadow-record' : 'bg-studio-border'}`} />
        </div>
        <label className="flex min-h-12 items-center justify-between text-body">
          카운트인
          <input type="checkbox" checked={countIn} disabled={state === 'recording' || state === 'counting'} onChange={(event) => setCountIn(event.target.checked)} />
        </label>
        <label className="flex min-h-12 items-center justify-between text-body">
          이어폰 없이 녹음
          <input type="checkbox" checked={echoCancellation} disabled={state === 'recording' || state === 'counting'} onChange={(event) => {
            setEchoCancellation(event.target.checked);
            recorderRef.current?.setMonitoring(false);
            setMonitoring(false);
          }} />
        </label>
        <label className="flex min-h-12 items-center justify-between text-body">
          모니터링
          <input type="checkbox" checked={monitoring} onChange={(event) => {
            if (event.target.checked) setMonitorWarningOpen(true);
            else { recorderRef.current?.setMonitoring(false); setMonitoring(false); }
          }} />
        </label>
        <label className="block text-micro text-studio-muted">
          타이밍 미세조정 {userTrimMs}ms
          <input type="range" min={-200} max={200} value={userTrimMs} onChange={(event) => setUserTrimMs(Number(event.target.value))} className="mt-2 w-full" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={state === 'recording' || state === 'counting' || state === 'requesting' || state === 'calibrating'} onClick={() => void start()} className="min-h-12 rounded-studio bg-studio-record text-body font-semibold text-white disabled:opacity-40">녹음 시작</button>
          <button type="button" disabled={state !== 'recording' && state !== 'counting'} onClick={() => void stop()} className="min-h-12 rounded-studio bg-studio-card text-body font-semibold disabled:opacity-40">{state === 'counting' ? '취소' : '정지'}</button>
        </div>
        {overflow && project.loopLengthBars < 16 && (
          <button type="button" onClick={() => { setLoopLength(nextLoopLength); setOverflow(false); }} className="min-h-11 w-full rounded-studio border border-studio-border bg-studio-card text-body">루프 길이 늘리기</button>
        )}
        <div className="grid grid-cols-2 gap-2 border-t border-studio-border pt-3">
          <button type="button" disabled={state === 'recording' || state === 'counting' || state === 'requesting' || state === 'calibrating'} onClick={() => void calibrate('clap')} className="min-h-11 rounded-studio bg-studio-card text-body disabled:opacity-40">손뼉으로 박자 맞추기</button>
          <button type="button" disabled={state === 'recording' || state === 'counting' || state === 'requesting' || state === 'calibrating'} onClick={() => void calibrate('speaker')} className="min-h-11 rounded-studio bg-studio-card text-body disabled:opacity-40">스피커로 박자 맞추기</button>
        </div>
        <p className="text-micro text-studio-muted">손뼉: 이어폰을 끼고 8박에 맞춰 손뼉을 치세요. 스피커: 이어폰을 빼고 조용한 곳에서 측정하세요.</p>
      </div>
      {monitorWarningOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 px-6" role="dialog" aria-label="모니터링 경고">
          <div className="w-full max-w-sm rounded-panel bg-studio-surface p-4">
            <p className="text-body text-studio-text">이어폰 없이 모니터링을 켜면 소리가 울릴 수 있어요.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="min-h-11 rounded-studio bg-studio-card" onClick={() => setMonitorWarningOpen(false)}>취소</button>
              <button type="button" className="min-h-11 rounded-studio bg-studio-accent text-white" onClick={() => void enableMonitoring()}>켜기</button>
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
