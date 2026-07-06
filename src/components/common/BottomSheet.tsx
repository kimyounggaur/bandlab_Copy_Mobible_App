import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

type BottomSheetProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  height?: 'half' | 'tall' | 'full';
};

const heights = {
  half: 'max-h-[52dvh]',
  tall: 'max-h-[72dvh]',
  full: 'max-h-[92dvh]',
};

export function BottomSheet({ open, title, children, onClose, height = 'tall' }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/55" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="닫기" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <section
        className={`safe-bottom relative w-full overflow-hidden rounded-t-sheet border border-studio-border bg-studio-surface shadow-2xl ${heights[height]}`}
      >
        <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-studio-border" />
        <header className="flex items-center justify-between gap-3 border-b border-studio-border px-4 py-3">
          <h2 className="text-title font-semibold text-studio-text">{title}</h2>
          <IconButton label="닫기" icon={X} onClick={onClose} />
        </header>
        <div className="studio-scrollbar max-h-[calc(72dvh-76px)] overflow-y-auto px-4 py-4">{children}</div>
      </section>
    </div>
  );
}
