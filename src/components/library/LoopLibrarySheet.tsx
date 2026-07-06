import { Headphones, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as Tone from 'tone';
import { audioEngine } from '../../audio/engine';
import { getLoop, loopManifest } from '../../data/loopManifest';
import { useProjectStore } from '../../stores/projectStore';
import { useUiStore } from '../../stores/uiStore';
import type { LoopCategory, LoopGenre } from '../../types/project';
import { BottomSheet } from '../common/BottomSheet';
import { IconButton } from '../common/IconButton';

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
  playheadBar: number;
  onToast: (message: string) => void;
};

export function LoopLibrarySheet({ playheadBar, onToast }: LoopLibrarySheetProps) {
  const open = useUiStore((state) => state.loopSheetOpen);
  const setOpen = useUiStore((state) => state.setLoopSheetOpen);
  const addLoop = useProjectStore((state) => state.addLoopToSelectedTrack);
  const selectedTrackId = useProjectStore((state) => state.selectedTrackId);
  const [category, setCategory] = useState<LoopCategory | 'all'>('all');
  const [genre, setGenre] = useState<LoopGenre | 'all'>('all');
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const loops = useMemo(
    () =>
      loopManifest.filter(
        (loop) => (category === 'all' || loop.category === category) && (genre === 'all' || loop.genre === genre),
      ),
    [category, genre],
  );

  async function preview(loopId: string) {
    await audioEngine.ensureReady();
    setPreviewingId((current) => (current === loopId ? null : loopId));
    const loop = getLoop(loopId);
    if (!loop) return;
    const player = new Tone.Player({ url: loop.filePath, fadeIn: 0.01, fadeOut: 0.02 }).toDestination();
    await Tone.loaded();
    player.playbackRate = useProjectStore.getState().currentProject.bpm / 90;
    const nextBar = Math.ceil(audioEngine.getPositionInBars());
    const eventId = Tone.Transport.scheduleOnce((time) => {
      player.start(time);
      Tone.Transport.clear(eventId);
      window.setTimeout(() => player.dispose(), loop.bars * 4 * 700);
    }, barsToTonePosition(nextBar));
    onToast('다음 마디에 맞춰 미리듣기를 시작해요');
    audioEngine.play();
  }

  function add(loopId: string) {
    addLoop(loopId, playheadBar);
    localStorage.setItem('loop-pocket-first-loop', String(Date.now()));
    onToast(selectedTrackId ? '루프를 얹었어요' : '새 트랙을 만들고 루프를 얹었어요');
    setOpen(false);
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
        <div className="grid gap-3">
          {loops.map((loop) => (
            <article key={loop.id} className="rounded-panel border border-studio-border bg-studio-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-body font-semibold text-studio-text">{loop.name}</h3>
                  <p className="mt-1 text-micro text-studio-muted">
                    {categoryLabels[loop.category]} · {genreLabels[loop.genre]} · {loop.bars}마디
                    {loop.key ? ` · ${loop.key}` : ''}
                  </p>
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

function barsToTonePosition(positionBars: number) {
  const bar = Math.floor(positionBars);
  const beatFloat = (positionBars - bar) * 4;
  const beat = Math.floor(beatFloat);
  const sixteenth = Math.round((beatFloat - beat) * 4);
  return `${bar}:${beat}:${sixteenth}`;
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
