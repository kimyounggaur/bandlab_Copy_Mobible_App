import { trackColors } from '../../utils/music';

const colors = [
  ['배경', '#0E0F13'],
  ['서피스', '#171922'],
  ['카드', '#222633'],
  ['보더', '#2E3342'],
  ['텍스트', '#F4F5F9'],
  ['보조 텍스트', '#9AA1B2'],
  ['재생', '#7C5CFF'],
  ['녹음', '#FF4D5E'],
  ['성공', '#34D399'],
  ['경고', '#FBBF24'],
];

export function TokensPage() {
  return (
    <main className="safe-top safe-bottom studio-scrollbar h-dvh overflow-y-auto bg-studio-bg p-4">
      <h1 className="text-display font-bold text-studio-text">디자인 토큰</h1>
      <section className="mt-5">
        <h2 className="text-title font-semibold">색</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {colors.map(([label, color]) => (
            <div key={color} className="rounded-panel border border-studio-border bg-studio-card p-3">
              <div className="h-14 rounded-studio border border-white/10" style={{ backgroundColor: color }} />
              <p className="mt-2 text-body font-semibold text-studio-text">{label}</p>
              <p className="text-micro text-studio-muted">{color}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-5">
        <h2 className="text-title font-semibold">트랙 팔레트</h2>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {trackColors.map((color) => (
            <div key={color} className="h-16 rounded-studio" style={{ backgroundColor: color }} title={color} />
          ))}
        </div>
      </section>
      <section className="mt-5 rounded-panel border border-studio-border bg-studio-card p-4">
        <h2 className="text-title font-semibold">타이포</h2>
        <p className="mt-2 text-display">24 Display</p>
        <p className="text-title">20 Title</p>
        <p className="text-ui">16 UI</p>
        <p className="text-body">14 Body</p>
        <p className="text-micro">12 Micro</p>
      </section>
    </main>
  );
}
