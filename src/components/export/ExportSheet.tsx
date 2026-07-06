import { useState } from 'react';
import { exportProjectPreviewWav } from '../../audio/exporter';
import { useProjectStore } from '../../stores/projectStore';
import { useUiStore } from '../../stores/uiStore';
import { BottomSheet } from '../common/BottomSheet';

export function ExportSheet() {
  const open = useUiStore((state) => state.exportOpen);
  const setOpen = useUiStore((state) => state.setExportOpen);
  const project = useProjectStore((state) => state.currentProject);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  async function exportWav() {
    setBusy(true);
    setProgress(35);
    const blob = await exportProjectPreviewWav(project);
    setProgress(80);
    const fileName = `${project.name}_${new Date().toISOString().slice(2, 10).replaceAll('-', '')}.wav`;
    const file = new File([blob], fileName, { type: 'audio/wav' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: project.name });
    } else {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    }
    setProgress(100);
    window.setTimeout(() => {
      setBusy(false);
      setProgress(0);
      setOpen(false);
    }, 400);
  }

  return (
    <BottomSheet open={open} title="내보내기" onClose={() => setOpen(false)} height="half">
      <div className="rounded-panel border border-studio-border bg-studio-card p-4">
        <h3 className="text-title font-semibold text-studio-text">WAV 파일로 만들기</h3>
        <p className="mt-2 text-body text-studio-muted">프로젝트를 하나의 음원 파일로 만들어 저장하거나 공유합니다.</p>
        {busy ? (
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-studio-bg">
            <div className="h-full rounded-full bg-studio-accent" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
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
