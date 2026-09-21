import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { exportProjectWav } from '../../audio/exporter';
import { useProjectStore } from '../../stores/projectStore';
import { useUiStore } from '../../stores/uiStore';
import { BottomSheet } from '../common/BottomSheet';

export function ExportSheet() {
  const open = useUiStore((state) => state.exportOpen);
  const setOpen = useUiStore((state) => state.setExportOpen);
  const project = useProjectStore((state) => state.currentProject);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportWav() {
    setBusy(true);
    setError(null);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      const blob = await exportProjectWav(project);
      const fileName = `${project.name}_${new Date().toISOString().slice(2, 10).replaceAll('-', '')}.wav`;
      const file = new File([blob], fileName, { type: 'audio/wav' });
      let shared = false;
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: project.name });
          shared = true;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
        }
      }
      if (!shared) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
      setOpen(false);
    } catch {
      setError('음원 파일을 만들지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet open={open} title="내보내기" onClose={() => { if (!busy) setOpen(false); }} height="half">
      <div className="rounded-panel border border-studio-border bg-studio-card p-4">
        <h3 className="text-title font-semibold text-studio-text">WAV 파일로 만들기</h3>
        <p className="mt-2 text-body text-studio-muted">프로젝트를 하나의 음원 파일로 만들어 저장하거나 공유합니다.</p>
        {busy ? (
          <div className="mt-4 flex items-center gap-2 text-body text-studio-muted">
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
            내보내는 중 · 취소 불가
          </div>
        ) : null}
        {error ? <p role="alert" className="mt-3 text-body text-studio-record">{error}</p> : null}
        <button
          type="button"
          onClick={exportWav}
          disabled={busy}
          className="mt-5 min-h-12 w-full rounded-studio bg-studio-accent text-body font-semibold text-white disabled:opacity-50"
        >
          {busy ? '내보내는 중...' : 'WAV 내보내기'}
        </button>
      </div>
    </BottomSheet>
  );
}
