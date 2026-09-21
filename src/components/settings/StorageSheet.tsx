import { useEffect, useState } from 'react';
import { collectOrphanAudio, loadMeta } from '../../storage/db';
import { getStorageUsage } from '../../storage/persistence';
import { useProjectStore } from '../../stores/projectStore';
import { BottomSheet } from '../common/BottomSheet';

type Usage = Awaited<ReturnType<typeof getStorageUsage>>;

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function StorageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [usage, setUsage] = useState<Usage>(null);
  const [lastGc, setLastGc] = useState<{ removed: number; freedBytes: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void getStorageUsage().then(setUsage).catch(() => setUsage(null));
    void loadMeta<{ removed: number; freedBytes: number }>('audio-gc-last').then((value) => setLastGc(value ?? null));
  }, [open]);

  async function clean() {
    setBusy(true);
    try {
      const state = useProjectStore.getState();
      const result = await collectOrphanAudio([state.currentProject, ...state.past, ...state.future]);
      setLastGc(result);
      setUsage(await getStorageUsage());
    } finally {
      setBusy(false);
    }
  }

  const nearlyFull = usage && usage.quota > 0 && usage.usage / usage.quota >= 0.8;

  return (
    <BottomSheet open={open} title="저장 공간" onClose={onClose} height="half">
      <div className="space-y-4 text-body text-studio-text">
        <div className="flex justify-between border-b border-studio-border pb-3">
          <span>사용 중</span>
          <strong>{usage ? `${formatBytes(usage.usage)} / ${formatBytes(usage.quota)}` : '확인할 수 없어요'}</strong>
        </div>
        <div className="flex justify-between border-b border-studio-border pb-3">
          <span>기기 저장 보호</span>
          <strong>{usage ? (usage.persistent ? '켜짐' : '브라우저 기본값') : '확인할 수 없어요'}</strong>
        </div>
        {nearlyFull && <p role="alert" className="text-studio-warning">저장 공간이 거의 찼어요. 사용하지 않는 녹음을 정리해 주세요.</p>}
        <button type="button" disabled={busy} onClick={() => void clean()} className="min-h-12 w-full rounded-studio bg-studio-card font-semibold disabled:opacity-50">
          {busy ? '정리 중...' : '사용하지 않는 녹음 정리'}
        </button>
        {lastGc && <p className="text-micro text-studio-muted">최근 정리: {lastGc.removed}개, {formatBytes(lastGc.freedBytes)}</p>}
      </div>
    </BottomSheet>
  );
}
