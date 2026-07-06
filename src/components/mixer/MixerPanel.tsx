import { SlidersHorizontal } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useUiStore } from '../../stores/uiStore';

export function MixerPanel() {
  const project = useProjectStore((state) => state.currentProject);
  const updateTrack = useProjectStore((state) => state.updateTrack);
  const setEffectsTrackId = useUiStore((state) => state.setEffectsTrackId);
  const soloIds = project.tracks.filter((track) => track.solo).map((track) => track.id);

  return (
    <div className="studio-scrollbar flex h-full gap-3 overflow-x-auto p-4 pb-28">
      {project.tracks.map((track) => {
        const audible = !track.mute && (!soloIds.length || soloIds.includes(track.id));
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
                  className={`mt-auto w-full rounded-full ${audible ? 'bg-studio-success' : 'bg-studio-border'}`}
                  style={{ height: `${audible ? Math.max(8, track.volume) : 4}%` }}
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
        <p className="mt-2 text-micro text-studio-muted">찢어지는 소리를 막는 보호 장치가 켜져 있어요.</p>
        <div className="mt-auto h-32 rounded-full bg-studio-accent/40" />
      </section>
    </div>
  );
}
