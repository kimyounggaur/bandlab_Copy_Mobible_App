import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { consumeSheetHistory } from './sheetHistory';

type BottomSheetProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  canClose?: boolean;
  height?: 'half' | 'tall' | 'full';
};

const heights = {
  half: 'max-h-[52dvh]',
  tall: 'max-h-[72dvh]',
  full: 'max-h-[92dvh]',
};

export function BottomSheet({ open, title, children, onClose, canClose = true, height = 'tall' }: BottomSheetProps) {
  const onCloseRef = useRef(onClose);
  const canCloseRef = useRef(canClose);
  const entryRef = useRef<string | null>(null);
  const closingRef = useRef(false);
  onCloseRef.current = onClose;
  canCloseRef.current = canClose;

  useEffect(() => {
    if (!open) return;
    const id = entryRef.current ?? crypto.randomUUID();
    if (window.history.state?.loopPocketSheet !== id) {
      window.history.pushState({ ...window.history.state, loopPocketSheet: id }, '', window.location.href);
    }
    entryRef.current = id;
    const onPop = () => {
      if (window.history.state?.loopPocketSheet === id || closingRef.current) return;
      if (!canCloseRef.current) {
        window.history.pushState({ ...window.history.state, loopPocketSheet: id }, '', window.location.href);
        return;
      }
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [open]);

  function close() {
    if (!canCloseRef.current) return;
    closingRef.current = true;
    if (entryRef.current && window.history.state?.loopPocketSheet === entryRef.current) consumeSheetHistory();
    entryRef.current = null;
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/55" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="닫기" className="absolute inset-0 h-full w-full cursor-default" onClick={close} />
      <section
        className={`safe-bottom relative w-full overflow-hidden rounded-t-sheet border border-studio-border bg-studio-surface shadow-2xl ${heights[height]}`}
      >
        <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-studio-border" />
        <header className="flex items-center justify-between gap-3 border-b border-studio-border px-4 py-3">
          <h2 className="text-title font-semibold text-studio-text">{title}</h2>
          <IconButton label="닫기" icon={X} onClick={close} />
        </header>
        <div className="studio-scrollbar max-h-[calc(72dvh-76px)] overflow-y-auto px-4 py-4">{children}</div>
      </section>
    </div>
  );
}
