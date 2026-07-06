import type { StudioMode } from '../../stores/uiStore';

type SegmentedTabsProps = {
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
};

const labels: Array<{ id: StudioMode; label: string }> = [
  { id: 'studio', label: '스튜디오' },
  { id: 'instruments', label: '악기' },
  { id: 'mixer', label: '믹서' },
];

export function SegmentedTabs({ mode, onModeChange }: SegmentedTabsProps) {
  return (
    <div className="grid grid-cols-3 gap-1 border-t border-studio-border bg-studio-bg/95 px-3 py-2">
      {labels.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={mode === item.id}
          onClick={() => onModeChange(item.id)}
          className={`min-h-12 rounded-studio text-body font-semibold transition ${
            mode === item.id
              ? 'bg-studio-card text-studio-text shadow-led'
              : 'bg-transparent text-studio-muted active:bg-studio-card/60'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
