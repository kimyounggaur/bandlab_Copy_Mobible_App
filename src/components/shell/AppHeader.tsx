import { Download, Home, Redo2, Save, Undo2 } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useUiStore } from '../../stores/uiStore';
import { IconButton } from '../common/IconButton';

type AppHeaderProps = {
  onHome: () => void;
};

export function AppHeader({ onHome }: AppHeaderProps) {
  const project = useProjectStore((state) => state.currentProject);
  const renameProject = useProjectStore((state) => state.renameProject);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const past = useProjectStore((state) => state.past);
  const future = useProjectStore((state) => state.future);
  const saveStatus = useProjectStore((state) => state.saveStatus);
  const setExportOpen = useUiStore((state) => state.setExportOpen);

  return (
    <header className="safe-top flex items-center gap-2 border-b border-studio-border bg-studio-bg/95 px-3 pb-3 pt-3">
      <IconButton label="프로젝트 목록" icon={Home} onClick={onHome} />
      <div className="min-w-0 flex-1">
        <input
          aria-label="프로젝트 이름"
          value={project.name}
          onChange={(event) => renameProject(event.target.value)}
          className="w-full truncate border-0 bg-transparent text-ui font-semibold text-studio-text outline-none"
        />
        <div className="mt-1 flex items-center gap-2 text-micro text-studio-muted">
          <span className="rounded-full border border-studio-border px-2 py-0.5">BPM {project.bpm}</span>
          <span className="inline-flex items-center gap-1">
            <Save size={12} />
            {saveStatus === 'saving' ? '저장 중...' : saveStatus === 'error' ? '저장 확인 필요' : '저장됨'}
          </span>
        </div>
      </div>
      <IconButton label="실행 취소" icon={Undo2} onClick={undo} disabled={!past.length} />
      <IconButton label="다시 실행" icon={Redo2} onClick={redo} disabled={!future.length} />
      <IconButton label="내보내기" icon={Download} onClick={() => setExportOpen(true)} />
    </header>
  );
}
