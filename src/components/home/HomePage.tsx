import type { LoopGenre } from '../../types/project';
import { useProjectStore } from '../../stores/projectStore';

type HomePageProps = {
  onOpenProject: () => void;
};

const quickStarts: Array<{ genre: LoopGenre; title: string; body: string }> = [
  { genre: 'hiphop', title: '힙합 비트', body: '묵직한 드럼과 베이스로 바로 시작' },
  { genre: 'pop', title: '팝 스케치', body: '밝은 멜로디와 쉬운 템포' },
  { genre: 'edm', title: 'EDM 루프', body: '빠른 리듬과 반짝이는 질감' },
];

export function HomePage({ onOpenProject }: HomePageProps) {
  const projects = useProjectStore((state) => state.projects);
  const createProject = useProjectStore((state) => state.createProject);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);

  function quickStart(genre: LoopGenre) {
    createProject(genre);
    onOpenProject();
  }

  return (
    <main className="safe-top safe-bottom studio-scrollbar h-dvh overflow-y-auto bg-studio-bg px-4 py-6">
      <section className="mx-auto max-w-xl">
        <p className="text-body font-semibold text-studio-accent">LoopPocket</p>
        <h1 className="mt-2 text-display font-bold text-studio-text">열자마자 소리가 나는 모바일 작업실</h1>
        <p className="mt-2 text-body text-studio-muted">오프라인에서도 저장되고, 로그인 없이 바로 시작합니다.</p>
        <button
          type="button"
          onClick={() => quickStart('hiphop')}
          className="mt-6 min-h-14 w-full rounded-panel bg-studio-accent text-ui font-bold text-white shadow-led active:bg-studio-accentDown"
        >
          새 프로젝트 만들기
        </button>
      </section>

      <section className="mx-auto mt-6 max-w-xl">
        <h2 className="text-title font-semibold text-studio-text">빠른 시작</h2>
        <div className="mt-3 grid gap-3">
          {quickStarts.map((item) => (
            <button
              key={item.genre}
              type="button"
              onClick={() => quickStart(item.genre)}
              className="min-h-20 rounded-panel border border-studio-border bg-studio-card p-4 text-left active:bg-studio-surface"
            >
              <strong className="text-ui text-studio-text">{item.title}</strong>
              <span className="mt-1 block text-body text-studio-muted">{item.body}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-xl pb-8">
        <h2 className="text-title font-semibold text-studio-text">최근 프로젝트</h2>
        <div className="mt-3 grid gap-3">
          {projects.map((project) => (
            <article key={project.id} className="rounded-panel border border-studio-border bg-studio-surface p-4">
              <button
                type="button"
                onClick={() => {
                  setCurrentProject(project.id);
                  onOpenProject();
                }}
                className="block min-h-16 w-full text-left"
              >
                <strong className="text-ui text-studio-text">{project.name}</strong>
                <span className="mt-1 block text-body text-studio-muted">
                  {project.tracks.length}트랙 · BPM {project.bpm} · {new Date(project.updatedAt).toLocaleDateString('ko-KR')}
                </span>
                <span className="mt-3 flex gap-1">
                  {project.tracks.slice(0, 8).map((track) => (
                    <span key={track.id} className="h-2 flex-1 rounded-full" style={{ backgroundColor: track.color }} />
                  ))}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('프로젝트를 삭제할까요?')) void deleteProject(project.id);
                }}
                className="mt-3 min-h-11 rounded-studio border border-studio-border px-4 text-body text-studio-muted"
              >
                삭제
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
