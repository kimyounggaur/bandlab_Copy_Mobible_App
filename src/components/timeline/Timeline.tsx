import { Copy, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from '../../audio/engine';
import { getPeaksForClip } from '../../audio/peaks';
import { useProjectStore } from '../../stores/projectStore';
import type { Clip, Track } from '../../types/project';
import { clamp, snapBar } from '../../utils/music';
import { EmptyState } from '../common/EmptyState';
import { IconButton } from '../common/IconButton';

const trackHeaderWidth = 96;
const laneHeight = 72;

export function Timeline() {
  const project = useProjectStore((state) => state.currentProject);
  const selectedTrackId = useProjectStore((state) => state.selectedTrackId);
  const selectTrack = useProjectStore((state) => state.selectTrack);
  const updateTrack = useProjectStore((state) => state.updateTrack);
  const addTrack = useProjectStore((state) => state.addTrack);
  const [barWidth, setBarWidth] = useState(72);
  const playheadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const renderPosition = () => {
      if (playheadRef.current) playheadRef.current.style.transform = `translateX(${audioEngine.getPositionInBars() * barWidth}px)`;
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
  }, [barWidth]);

  const totalWidth = project.loopLengthBars * barWidth;
  const ruler = useMemo(() => Array.from({ length: project.loopLengthBars }, (_, index) => index), [project.loopLengthBars]);

  if (!project.tracks.length) {
    return (
      <div className="p-4">
        <EmptyState
          title="아직 트랙이 없어요"
          body="루프나 녹음을 올릴 트랙을 먼저 만들어볼까요?"
          actionLabel="트랙 추가"
          onAction={() => addTrack('audio')}
        />
      </div>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-studio-bg">
      <div className="flex items-center justify-between gap-3 border-b border-studio-border px-3 py-2">
        <div className="text-body font-semibold text-studio-text">8마디 타임라인</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="타임라인 축소"
            onClick={() => setBarWidth((value) => Math.max(40, value - 16))}
            className="h-11 min-w-11 rounded-studio border border-studio-border bg-studio-card text-title"
          >
            -
          </button>
          <button
            type="button"
            aria-label="타임라인 확대"
            onClick={() => setBarWidth((value) => Math.min(160, value + 16))}
            className="h-11 min-w-11 rounded-studio border border-studio-border bg-studio-card text-title"
          >
            +
          </button>
        </div>
      </div>
      <div className="studio-scrollbar min-h-0 flex-1 overflow-auto">
        <div className="relative min-w-full" style={{ width: trackHeaderWidth + totalWidth }}>
          <div className="sticky top-0 z-20 flex h-10 border-b border-studio-border bg-studio-surface">
            <div className="sticky left-0 z-30 grid w-24 shrink-0 place-items-center border-r border-studio-border text-micro text-studio-muted">
              트랙
            </div>
            <div className="relative h-10" style={{ width: totalWidth }}>
              {ruler.map((bar) => (
                <button
                  key={bar}
                  type="button"
                  aria-label={`${bar + 1}마디로 이동`}
                  onClick={() => audioEngine.seek(bar)}
                  className="absolute top-0 h-10 border-l border-studio-border/80 pl-2 text-left text-micro text-studio-muted"
                  style={{ left: bar * barWidth, width: barWidth }}
                >
                  {bar + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              ref={playheadRef}
              className="pointer-events-none absolute bottom-0 top-0 z-10 w-0.5 bg-studio-accent shadow-led"
              style={{ left: trackHeaderWidth }}
            />
            {project.tracks.map((track) => (
              <TrackLane
                key={track.id}
                track={track}
                selected={selectedTrackId === track.id}
                barWidth={barWidth}
                totalWidth={totalWidth}
                ruler={ruler}
                onSelect={() => selectTrack(track.id)}
                onToggleMute={() => updateTrack(track.id, { mute: !track.mute })}
                onToggleSolo={() => updateTrack(track.id, { solo: !track.solo })}
                onRename={(name) => updateTrack(track.id, { name })}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

type TrackLaneProps = {
  track: Track;
  selected: boolean;
  barWidth: number;
  totalWidth: number;
  ruler: number[];
  onSelect: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onRename: (name: string) => void;
};

function TrackLane({ track, selected, barWidth, totalWidth, ruler, onSelect, onToggleMute, onToggleSolo, onRename }: TrackLaneProps) {
  return (
    <div className={`flex border-b border-studio-border ${selected ? 'bg-studio-accent/5' : 'bg-studio-bg'}`} style={{ height: laneHeight }}>
      <div
        className="sticky left-0 z-10 w-24 shrink-0 border-r border-studio-border bg-studio-surface px-2 py-2"
        onPointerDown={onSelect}
      >
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: track.color }} />
          <input
            aria-label={`${track.name} 이름`}
            value={track.name}
            onChange={(event) => onRename(event.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent text-micro font-semibold text-studio-text outline-none"
          />
        </div>
        <div className="mt-2 flex gap-1">
          <button
            type="button"
            aria-label={`${track.name} 잠시 끄기`}
            onClick={onToggleMute}
            className={`h-8 min-w-8 rounded border border-studio-border text-micro ${track.mute ? 'bg-studio-warning text-studio-bg' : 'bg-studio-card'}`}
          >
            M
          </button>
          <button
            type="button"
            aria-label={`${track.name} 이것만 듣기`}
            onClick={onToggleSolo}
            className={`h-8 min-w-8 rounded border border-studio-border text-micro ${track.solo ? 'bg-studio-success text-studio-bg' : 'bg-studio-card'}`}
          >
            S
          </button>
        </div>
      </div>
      <div className="relative" style={{ width: totalWidth }}>
        {ruler.map((bar) => (
          <div
            key={bar}
            className="absolute bottom-0 top-0 border-l border-studio-border/40"
            style={{ left: bar * barWidth }}
          />
        ))}
        {track.clips.map((clip) => (
          <ClipBlock key={clip.id} clip={clip} track={track} barWidth={barWidth} />
        ))}
      </div>
    </div>
  );
}

type ClipBlockProps = {
  clip: Clip;
  track: Track;
  barWidth: number;
};

function ClipBlock({ clip, track, barWidth }: ClipBlockProps) {
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const selectedClipId = useProjectStore((state) => state.selectedClipId);
  const selectClip = useProjectStore((state) => state.selectClip);
  const selectTrack = useProjectStore((state) => state.selectTrack);
  const updateClip = useProjectStore((state) => state.updateClip);
  const duplicateClip = useProjectStore((state) => state.duplicateClip);
  const removeClip = useProjectStore((state) => state.removeClip);
  const beginHistory = useProjectStore((state) => state.beginHistory);
  const [menuOpen, setMenuOpen] = useState(false);
  const [timingMs, setTimingMs] = useState(0);
  const timingBaseRef = useRef(0);
  const dragRef = useRef<{
    startX: number;
    startBar: number;
    lengthBars: number;
    nextStartBar: number;
    nextLengthBars: number;
    mode: 'move' | 'resize-left' | 'resize-right';
  } | null>(null);

  const selected = selectedClipId === clip.id;
  useEffect(() => {
    let cancelled = false;
    void getPeaksForClip(clip).then((result) => {
      if (!cancelled) setPeaks(result);
    });
    return () => { cancelled = true; };
  }, [clip]);

  const visibleBuckets = clip.lengthBars * barWidth < 200 ? 24 : 96;
  const peakPath = peaks ? makePeakPath(peaks, visibleBuckets) : null;

  function openMenu() {
    timingBaseRef.current = clip.source.kind === 'recording' ? clip.source.offsetSec : 0;
    setTimingMs(0);
    setMenuOpen(true);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    const edge = event.clientX - rect.left;
    const mode = edge < 16 ? 'resize-left' : rect.width - edge < 16 ? 'resize-right' : 'move';
    dragRef.current = {
      startX: event.clientX, startBar: clip.startBar, lengthBars: clip.lengthBars,
      nextStartBar: clip.startBar, nextLengthBars: clip.lengthBars, mode,
    };
    selectTrack(track.id);
    selectClip(clip.id);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const deltaBars = snapBar((event.clientX - dragRef.current.startX) / barWidth);
    const { mode, startBar, lengthBars } = dragRef.current;
    if (mode === 'move') {
      dragRef.current.nextStartBar = Math.max(0, snapBar(startBar + deltaBars));
    } else if (mode === 'resize-right') {
      dragRef.current.nextLengthBars = clamp(snapBar(lengthBars + deltaBars), 0.25, 16);
    } else {
      const nextStart = Math.max(0, snapBar(startBar + deltaBars));
      const nextLength = clamp(snapBar(lengthBars - (nextStart - startBar)), 0.25, 16);
      dragRef.current.nextStartBar = nextStart;
      dragRef.current.nextLengthBars = nextLength;
    }
    event.currentTarget.style.left = `${dragRef.current.nextStartBar * barWidth}px`;
    event.currentTarget.style.width = `${Math.max(28, dragRef.current.nextLengthBars * barWidth - 6)}px`;
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && (drag.nextStartBar !== drag.startBar || drag.nextLengthBars !== drag.lengthBars)) {
      updateClip(track.id, clip.id, { startBar: drag.nextStartBar, lengthBars: drag.nextLengthBars });
    }
  }

  function onPointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    event.currentTarget.style.left = `${clip.startBar * barWidth}px`;
    event.currentTarget.style.width = `${Math.max(28, clip.lengthBars * barWidth - 6)}px`;
    dragRef.current = null;
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${clip.name} 클립`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onDoubleClick={openMenu}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectTrack(track.id);
            selectClip(clip.id);
          }
          if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault();
            openMenu();
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          openMenu();
        }}
        className={`absolute top-3 flex h-12 touch-none select-none items-center overflow-hidden rounded-studio border px-3 text-left text-micro font-semibold shadow-sm ${
          selected ? 'border-white ring-2 ring-studio-accent' : 'border-white/10'
        }`}
        style={{
          left: clip.startBar * barWidth,
          width: Math.max(28, clip.lengthBars * barWidth - 6),
          background: `linear-gradient(135deg, ${track.color}, ${track.color}99)`,
        }}
      >
        <div className="min-w-0 flex-1 truncate text-studio-bg">{clip.name}</div>
        <div className="ml-2 h-8 w-1/2 shrink-0 overflow-hidden opacity-70">
          {peakPath ? (
            <svg viewBox="0 0 96 100" preserveAspectRatio="none" className="h-full w-full text-studio-bg" aria-hidden="true">
              <path d={peakPath} fill="none" stroke="currentColor" strokeWidth={visibleBuckets === 24 ? 2 : 1} />
            </svg>
          ) : (
            <div className="mt-3 h-2 w-full bg-studio-bg/20" aria-hidden="true" />
          )}
        </div>
      </div>
      {menuOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 px-6" role="dialog" aria-label="클립 메뉴">
          <div className="w-full max-w-sm rounded-panel border border-studio-border bg-studio-surface p-4">
            <h3 className="text-title font-semibold text-studio-text">{clip.name}</h3>
            {clip.source.kind === 'recording' && (
              <label className="mt-4 block text-micro text-studio-muted">
                타이밍 맞추기 {timingMs}ms
                <input
                  aria-label="녹음 타이밍 맞추기"
                  type="range"
                  min={-200}
                  max={200}
                  value={timingMs}
                  onPointerDown={beginHistory}
                  onChange={(event) => {
                    if (clip.source.kind !== 'recording') return;
                    const value = Number(event.target.value);
                    setTimingMs(value);
                    updateClip(track.id, clip.id, {
                      source: { kind: 'recording', audioId: clip.source.audioId, offsetSec: timingBaseRef.current + value / 1000 },
                    }, false);
                  }}
                  className="mt-2 w-full"
                />
              </label>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <IconButton
                label="클립 복제"
                icon={Copy}
                onClick={() => {
                  duplicateClip(track.id, clip.id);
                  setMenuOpen(false);
                }}
                className="w-full"
              />
              <IconButton
                label="클립 삭제"
                icon={Trash2}
                danger
                onClick={() => {
                  if (window.confirm('이 클립을 삭제할까요?')) {
                    removeClip(track.id, clip.id);
                    setMenuOpen(false);
                  }
                }}
                className="w-full"
              />
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="mt-3 min-h-12 w-full rounded-studio border border-studio-border bg-studio-card text-body font-semibold"
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function makePeakPath(peaks: number[], count: number): string {
  const commands: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const start = Math.floor(index * peaks.length / count);
    const end = Math.max(start + 1, Math.floor((index + 1) * peaks.length / count));
    const level = Math.max(...peaks.slice(start, end));
    const extent = Math.max(1, level * 47);
    const x = ((index + 0.5) / count * 96).toFixed(2);
    commands.push(`M ${x} ${(50 - extent).toFixed(2)} V ${(50 + extent).toFixed(2)}`);
  }
  return commands.join(' ');
}
