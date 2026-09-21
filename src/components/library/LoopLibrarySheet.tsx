import { Headphones, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { audioEngine } from '../../audio/engine';
import { getLoopBuffer, isLoopCached } from '../../audio/bufferCache';
import { loopPreview } from '../../audio/preview';
import { loopManifest } from '../../data/loopManifest';
import { useProjectStore } from '../../stores/projectStore';
import { useUiStore } from '../../stores/uiStore';
import type { LoopCategory, LoopGenre } from '../../types/project';
import { BottomSheet } from '../common/BottomSheet';
import { consumeSheetHistory } from '../common/sheetHistory';
import { IconButton } from '../common/IconButton';
import { mark } from '../../analytics/funnel';

const categoryLabels: Record<LoopCategory | 'all', string> = {
  all: '전체',
  drums: '드럼',
  bass: '베이스',
  melody: '멜로디',
  fx: '효과음',
};

const genreLabels: Record<LoopGenre | 'all', string> = {
  all: '전체',
  hiphop: '힙합',
  pop: '팝',
  edm: 'EDM',
};

type LoopLibrarySheetProps = {
  onToast: (message: string) => void;
};

export function LoopLibrarySheet({ onToast }: LoopLibrarySheetProps) {
  const open = useUiStore((state) => state.loopSheetOpen);
  const setOpen = useUiStore((state) => state.setLoopSheetOpen);
  const addLoop = useProjectStore((state) => state.addLoopToSelectedTrack);
  const selectedTrackId = useProjectStore((state) => state.selectedTrackId);
  const bpm = useProjectStore((state) => state.currentProject.bpm);
  const [category, setCategory] = useState<LoopCategory | 'all'>('all');
  const [genre, setGenre] = useState<LoopGenre | 'all'>('all');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  useEffect(() => loopPreview.subscribe(setPreviewingId), []);
  useEffect(() => { if (!open) loopPreview.stop(); }, [open]);
  useEffect(() => () => loopPreview.stop(), []);

  const loops = useMemo(
    () =>
      loopManifest.filter(
        (loop) => (category === 'all' || loop.category === category) && (genre === 'all' || loop.genre === genre),
      ),
    [category, genre],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const loop = loopManifest.find((item) => item.id === entry.target.getAttribute('data-loop-id'));
        if (!loop) continue;
        void isLoopCached(loop).then((cached) => {
          if (cancelled || !cached) return;
          setCachedIds((ids) => new Set(ids).add(loop.id));
        });
        if (navigator.onLine) {
          void getLoopBuffer(loop).then(() => {
            if (!cancelled) setCachedIds((ids) => new Set(ids).add(loop.id));
          }).catch(() => undefined);
        }
      }
    });
    document.querySelectorAll('[data-loop-id]').forEach((card) => observer.observe(card));
    return () => { cancelled = true; observer.disconnect(); };
  }, [open, loops]);

  async function preview(loopId: string) {
    try {
      const loop = loopManifest.find((item) => item.id === loopId);
      if (!navigator.onLine && loop && !(await isLoopCached(loop))) {
        onToast('인터넷에 연결되면 쓸 수 있어요');
        return;
      }
      await loopPreview.toggle(loopId);
    } catch {
      onToast(navigator.onLine ? '미리듣기를 불러오지 못했어요' : '인터넷에 연결되면 쓸 수 있어요');
    }
  }

  async function add(loopId: string) {
    const loop = loopManifest.find((item) => item.id === loopId);
    if (!loop) return;
    try {
      if (!navigator.onLine && !(await isLoopCached(loop))) {
        onToast('인터넷에 연결되면 쓸 수 있어요');
        return;
      }
      await audioEngine.ensureReady();
      await getLoopBuffer(loop);
      setCachedIds((ids) => new Set(ids).add(loopId));
    } catch {
      onToast(navigator.onLine ? '루프를 불러오지 못했어요' : '인터넷에 연결되면 쓸 수 있어요');
      return;
    }
    loopPreview.stop();
    addLoop(loopId, audioEngine.getPositionInBars());
    mark('first_loop_added', { loopId });
    onToast(selectedTrackId ? '루프를 얹었어요' : '새 트랙을 만들고 루프를 얹었어요');
    consumeSheetHistory();
    setOpen(false);
  }

  async function downloadGenre() {
    setDownloading(true);
    const targets = genre === 'all' ? loopManifest : loopManifest.filter((loop) => loop.genre === genre);
    try {
      for (const loop of targets) {
        // eslint-disable-next-line no-await-in-loop
        await getLoopBuffer(loop);
        setCachedIds((ids) => new Set(ids).add(loop.id));
      }
      onToast('루프를 받아뒀어요');
    } catch {
      onToast(navigator.onLine ? '일부 루프를 받지 못했어요' : '인터넷에 연결되면 받을 수 있어요');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <BottomSheet open={open} title="사운드 추가" onClose={() => setOpen(false)} height="tall">
      <div className="space-y-4">
        <FilterRow
          label="종류"
          values={Object.entries(categoryLabels) as Array<[LoopCategory | 'all', string]>}
          value={category}
          onChange={setCategory}
        />
        <FilterRow
          label="장르"
          values={Object.entries(genreLabels) as Array<[LoopGenre | 'all', string]>}
          value={genre}
          onChange={setGenre}
        />
        <button
          type="button"
          disabled={downloading}
          onClick={() => void downloadGenre()}
          className="min-h-11 w-full rounded-studio border border-studio-border bg-studio-surface px-3 text-body text-studio-text disabled:opacity-50"
        >
          {downloading ? '받는 중...' : `${genre === 'all' ? '전체 루프' : genreLabels[genre]} 받아두기 · ${(loops.filter((loop) => !cachedIds.has(loop.id)).reduce((sum, loop) => sum + loop.bytes, 0) / 1024 / 1024).toFixed(1)}MB`}
        </button>
        <div className="grid gap-3">
          {loops.map((loop) => (
            <article key={loop.id} data-loop-id={loop.id} className="rounded-panel border border-studio-border bg-studio-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-body font-semibold text-studio-text">{loop.name}</h3>
                  <p className="mt-1 text-micro text-studio-muted">
                    <span aria-label={cachedIds.has(loop.id) ? '받음' : '안 받음'} className={`mr-1 inline-block size-1.5 rounded-full ${cachedIds.has(loop.id) ? 'bg-studio-accent' : 'bg-studio-muted'}`} />
                    {categoryLabels[loop.category]} · {genreLabels[loop.genre]} · {loop.bars}마디
                    {loop.key ? ` · ${loop.key}` : ''}
                  </p>
                  {(bpm / loop.sourceBpm < 0.75 || bpm / loop.sourceBpm > 1.33) && (
                    <span className="mt-1 inline-block text-micro text-amber-300">템포 차이 큼</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <IconButton label="미리듣기" icon={Headphones} active={previewingId === loop.id} onClick={() => preview(loop.id)} />
                  <IconButton label="추가" icon={Plus} active onClick={() => add(loop.id)} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}

type FilterRowProps<T extends string> = {
  label: string;
  values: Array<[T, string]>;
  value: T;
  onChange: (value: T) => void;
};

function FilterRow<T extends string>({ label, values, value, onChange }: FilterRowProps<T>) {
  return (
    <div>
      <div className="mb-2 text-micro font-semibold text-studio-muted">{label}</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {values.map(([id, text]) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-body ${
              value === id ? 'border-studio-accent bg-studio-accent text-white' : 'border-studio-border bg-studio-surface text-studio-text'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
