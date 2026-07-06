import type { LoopGenre } from '../../types/project';
import { useProjectStore } from '../../stores/projectStore';
import { useUiStore } from '../../stores/uiStore';

type OnboardingGateProps = {
  onDone: () => void;
};

const cards: Array<{ genre: LoopGenre; title: string; body: string }> = [
  { genre: 'hiphop', title: '힙합', body: '묵직한 드럼과 베이스로 시작' },
  { genre: 'pop', title: '팝', body: '밝고 선명한 아이디어 스케치' },
  { genre: 'edm', title: 'EDM', body: '반짝이는 신스와 빠른 리듬' },
];

export function OnboardingGate({ onDone }: OnboardingGateProps) {
  const open = useUiStore((state) => state.onboardingOpen);
  const setOpen = useUiStore((state) => state.setOnboardingOpen);
  const createProject = useProjectStore((state) => state.createProject);

  if (!open) return null;

  function choose(genre: LoopGenre) {
    createProject(genre);
    localStorage.setItem('loop-pocket-onboarding-start', String(Date.now()));
    setOpen(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[70] bg-studio-bg px-5 py-8 safe-top safe-bottom">
      <div className="mx-auto flex h-full max-w-md flex-col justify-center">
        <p className="text-body font-semibold text-studio-accent">LoopPocket</p>
        <h1 className="mt-2 text-display font-bold text-studio-text">어떤 음악을 만들어볼까요?</h1>
        <p className="mt-2 text-body text-studio-muted">고르면 바로 두 개의 루프가 놓인 프로젝트가 열립니다.</p>
        <div className="mt-6 grid gap-3">
          {cards.map((card) => (
            <button
              key={card.genre}
              type="button"
              onClick={() => choose(card.genre)}
              className="min-h-24 rounded-panel border border-studio-border bg-studio-card p-4 text-left active:bg-studio-accent"
            >
              <strong className="text-title text-studio-text">{card.title}</strong>
              <span className="mt-1 block text-body text-studio-muted">{card.body}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onDone();
          }}
          className="mt-4 min-h-12 rounded-studio border border-studio-border text-body text-studio-muted"
        >
          건너뛰기
        </button>
      </div>
    </div>
  );
}
