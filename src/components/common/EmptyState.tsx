type EmptyStateProps = {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
};

export function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="grid min-h-48 place-items-center rounded-panel border border-dashed border-studio-border bg-studio-surface/70 p-6 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full border border-studio-border bg-studio-card">
          <div className="h-9 w-9 rounded-[8px] bg-gradient-to-br from-studio-accent to-track-6" />
        </div>
        <h3 className="text-title font-semibold text-studio-text">{title}</h3>
        <p className="mx-auto mt-2 max-w-xs text-body text-studio-muted">{body}</p>
        <button
          type="button"
          onClick={onAction}
          className="mt-5 min-h-12 rounded-studio bg-studio-accent px-5 text-body font-semibold text-white shadow-led active:bg-studio-accentDown"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
