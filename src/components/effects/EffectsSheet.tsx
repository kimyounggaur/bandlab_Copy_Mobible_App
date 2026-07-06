import type { ReactNode } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useUiStore } from '../../stores/uiStore';
import { BottomSheet } from '../common/BottomSheet';

export function EffectsSheet() {
  const effectsTrackId = useUiStore((state) => state.effectsTrackId);
  const setEffectsTrackId = useUiStore((state) => state.setEffectsTrackId);
  const project = useProjectStore((state) => state.currentProject);
  const updateTrack = useProjectStore((state) => state.updateTrack);
  const track = project.tracks.find((item) => item.id === effectsTrackId);

  if (!track) {
    return null;
  }

  return (
    <BottomSheet open={Boolean(effectsTrackId)} title={`${track.name} 사운드 꾸미기`} onClose={() => setEffectsTrackId(null)}>
      <div className="space-y-4">
        <EffectCard
          title="공간감"
          description="방이나 홀에서 울리는 느낌"
          enabled={track.effects.reverb.on}
          amount={track.effects.reverb.amount}
          onToggle={() => updateTrack(track.id, { effects: { ...track.effects, reverb: { ...track.effects.reverb, on: !track.effects.reverb.on } } })}
          onAmount={(amount) => updateTrack(track.id, { effects: { ...track.effects, reverb: { ...track.effects.reverb, amount } } }, false)}
        >
          <div className="grid grid-cols-2 gap-2">
            {(['room', 'hall'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => updateTrack(track.id, { effects: { ...track.effects, reverb: { ...track.effects.reverb, mode } } })}
                className={`min-h-11 rounded-studio border border-studio-border ${track.effects.reverb.mode === mode ? 'bg-studio-accent text-white' : 'bg-studio-surface'}`}
              >
                {mode === 'room' ? '방' : '홀'}
              </button>
            ))}
          </div>
        </EffectCard>

        <EffectCard
          title="에코"
          description="박자에 맞춰 메아리치는 효과"
          enabled={track.effects.delay.on}
          amount={track.effects.delay.amount}
          onToggle={() => updateTrack(track.id, { effects: { ...track.effects, delay: { ...track.effects.delay, on: !track.effects.delay.on } } })}
          onAmount={(amount) => updateTrack(track.id, { effects: { ...track.effects, delay: { ...track.effects.delay, amount } } }, false)}
        >
          <div className="grid grid-cols-3 gap-2">
            {(['1/4', '1/8', '8n.'] as const).map((sync) => (
              <button
                key={sync}
                type="button"
                onClick={() => updateTrack(track.id, { effects: { ...track.effects, delay: { ...track.effects.delay, sync } } })}
                className={`min-h-11 rounded-studio border border-studio-border ${track.effects.delay.sync === sync ? 'bg-studio-accent text-white' : 'bg-studio-surface'}`}
              >
                {sync === '8n.' ? '점8분' : sync}
              </button>
            ))}
          </div>
        </EffectCard>

        <EffectCard
          title="톤"
          description="어둡게 또는 밝게"
          enabled={track.effects.tone.on}
          amount={track.effects.tone.tilt}
          onToggle={() => updateTrack(track.id, { effects: { ...track.effects, tone: { ...track.effects.tone, on: !track.effects.tone.on } } })}
          onAmount={(tilt) => updateTrack(track.id, { effects: { ...track.effects, tone: { ...track.effects.tone, tilt } } }, false)}
        >
          <label className="flex min-h-11 items-center gap-3 text-body text-studio-muted">
            <input
              type="checkbox"
              checked={track.effects.tone.bassBoost}
              onChange={(event) => updateTrack(track.id, { effects: { ...track.effects, tone: { ...track.effects.tone, bassBoost: event.target.checked } } })}
            />
            저음 두껍게
          </label>
        </EffectCard>

        <div className="rounded-panel border border-studio-border bg-studio-card p-3">
          <h3 className="text-body font-semibold text-studio-text">보컬 원탭 프리셋</h3>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(['clean', 'radio', 'space'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() =>
                  updateTrack(track.id, {
                    effects: { ...track.effects, vocalPreset: track.effects.vocalPreset === preset ? null : preset },
                  })
                }
                className={`min-h-12 rounded-studio border border-studio-border ${
                  track.effects.vocalPreset === preset ? 'bg-studio-success text-studio-bg' : 'bg-studio-surface'
                }`}
              >
                {preset === 'clean' ? '깨끗하게' : preset === 'radio' ? '라디오' : '스페이스'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}

type EffectCardProps = {
  title: string;
  description: string;
  enabled: boolean;
  amount: number;
  onToggle: () => void;
  onAmount: (amount: number) => void;
  children: ReactNode;
};

function EffectCard({ title, description, enabled, amount, onToggle, onAmount, children }: EffectCardProps) {
  return (
    <section className="rounded-panel border border-studio-border bg-studio-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-body font-semibold text-studio-text">{title}</h3>
          <p className="mt-1 text-micro text-studio-muted">{description}</p>
        </div>
        <button
          type="button"
          aria-pressed={enabled}
          onClick={onToggle}
          className={`min-h-11 rounded-studio px-4 text-body font-semibold ${enabled ? 'bg-studio-accent text-white' : 'bg-studio-surface text-studio-muted'}`}
        >
          {enabled ? '켜짐' : '꺼짐'}
        </button>
      </div>
      <label className="mt-4 block text-micro text-studio-muted">
        느낌
        <input
          aria-label={`${title} 느낌`}
          type="range"
          min={0}
          max={100}
          value={amount}
          onChange={(event) => onAmount(Number(event.target.value))}
          className="mt-2 w-full"
        />
      </label>
      <div className="mt-3">{children}</div>
    </section>
  );
}
