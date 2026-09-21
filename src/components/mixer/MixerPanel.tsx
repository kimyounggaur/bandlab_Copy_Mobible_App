import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { audioEngine } from '../../audio/engine';
import { trackScheduler } from '../../audio/trackNodes';
import { useProjectStore } from '../../stores/projectStore';
import { useUiStore } from '../../stores/uiStore';

export function MixerPanel() {
  const project = useProjectStore((state) => state.currentProject);
  const updateTrack = useProjectStore((state) => state.updateTrack);
  const setMasterVolume = useProjectStore((state) => state.setMasterVolume);
  const setEffectsTrackId = useUiStore((state) => state.setEffectsTrackId);
  const meterRefs = useRef(new Map<string, HTMLDivElement>());
  const holds = useRef(new Map<string, { value: number; until: number; last: number; clippedSince: number | null }>());

  useEffect(() => {
    let frame = 0;
    const update = (now: number) => {
      const levels = trackScheduler.getMeters();
      levels.master = trackScheduler.getMasterLevel();
      for (const [id, element] of meterRefs.current) {
        const level = levels[id] ?? 0;
        const db = level > 0 ? 20 * Math.log10(level) : -60;
        const current = Math.max(0, Math.min(1, (db + 60) / 60));
        const hold = holds.current.get(id) ?? { value: 0, until: 0, last: now, clippedSince: null };
        if (current >= hold.value) {
          hold.value = current;
          hold.until = now + 800;
        } else if (now > hold.until) {
          hold.value = Math.max(current, hold.value - (now - hold.last) / 750);
        }
        hold.clippedSince = level >= 0.99 ? hold.clippedSince ?? now : null;
        hold.last = now;
        holds.current.set(id, hold);
        element.style.transform = `scaleY(${hold.value})`;
        element.classList.toggle('bg-studio-record', hold.clippedSince !== null && now - hold.clippedSince >= 200);
        element.classList.toggle('bg-studio-success', hold.clippedSince === null || now - hold.clippedSince < 200);
      }
      frame = requestAnimationFrame(update);
    };
    const unsubscribe = audioEngine.subscribe((state) => {
      cancelAnimationFrame(frame);
      if (state.playing || state.recording) {
        frame = requestAnimationFrame(update);
      } else {
        holds.current.clear();
        for (const element of meterRefs.current.values()) element.style.transform = 'scaleY(0)';
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, []);

  return (
    <div className="studio-scrollbar flex h-full gap-3 overflow-x-auto p-4 pb-28">
      {project.tracks.map((track) => {
        return (
          <section key={track.id} className="flex min-w-36 flex-col rounded-panel border border-studio-border bg-studio-surface p-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: track.color }} />
              <h3 className="min-w-0 flex-1 truncate text-body font-semibold text-studio-text">{track.name}</h3>
            </div>
            <div className="mt-3 flex flex-1 items-end justify-center gap-4">
              <label className="flex h-52 flex-col items-center justify-end gap-2 text-micro text-studio-muted">
                <input
                  aria-label={`${track.name} 소리 크기`}
                  type="range"
                  min={0}
                  max={100}
                  value={track.volume}
                  onPointerDown={() => useProjectStore.getState().beginHistory()}
                  onChange={(event) => updateTrack(track.id, { volume: Number(event.target.value) }, false)}
                  className="h-36 w-8 -rotate-90"
                />
                소리 크기
              </label>
              <div className="h-40 w-5 overflow-hidden rounded-full bg-studio-bg">
                <div
                  ref={(element) => {
                    if (element) meterRefs.current.set(track.id, element);
                    else meterRefs.current.delete(track.id);
                  }}
                  className="h-full w-full origin-bottom rounded-full bg-studio-success"
                  style={{ transform: 'scaleY(0)' }}
                />
              </div>
            </div>
            <label className="mt-4 text-micro text-studio-muted">
              좌우 위치
              <input
                aria-label={`${track.name} 좌우 위치`}
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={track.pan}
                onPointerDown={() => useProjectStore.getState().beginHistory()}
                onChange={(event) => updateTrack(track.id, { pan: Number(event.target.value) }, false)}
                className="mt-2 w-full"
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateTrack(track.id, { mute: !track.mute })}
                className={`min-h-11 rounded-studio border border-studio-border ${track.mute ? 'bg-studio-warning text-studio-bg' : 'bg-studio-card'}`}
              >
                잠시 끄기
              </button>
              <button
                type="button"
                onClick={() => updateTrack(track.id, { solo: !track.solo })}
                className={`min-h-11 rounded-studio border border-studio-border ${track.solo ? 'bg-studio-success text-studio-bg' : 'bg-studio-card'}`}
              >
                이것만
              </button>
            </div>
            <button
              type="button"
              onClick={() => setEffectsTrackId(track.id)}
              className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-studio bg-studio-card text-body font-semibold"
            >
              <SlidersHorizontal size={18} />
              사운드 꾸미기
            </button>
          </section>
        );
      })}
      <section className="flex min-w-32 flex-col rounded-panel border border-studio-accent/40 bg-studio-accent/10 p-3">
        <h3 className="text-body font-semibold text-studio-text">마스터</h3>
        <div className="mt-3 flex flex-1 items-end justify-center gap-4">
          <label className="flex h-52 flex-col items-center justify-end gap-2 text-micro text-studio-muted">
            <input
              aria-label="마스터 소리 크기"
              type="range"
              min={0}
              max={100}
              value={project.masterVolume}
              onPointerDown={() => useProjectStore.getState().beginHistory()}
              onChange={(event) => setMasterVolume(Number(event.target.value), false)}
              className="h-36 w-8 -rotate-90"
            />
            소리 크기
          </label>
          <div className="h-40 w-5 overflow-hidden rounded-full bg-studio-bg">
            <div
              ref={(element) => {
                if (element) meterRefs.current.set('master', element);
                else meterRefs.current.delete('master');
              }}
              className="h-full w-full origin-bottom rounded-full bg-studio-success"
              style={{ transform: 'scaleY(0)' }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
