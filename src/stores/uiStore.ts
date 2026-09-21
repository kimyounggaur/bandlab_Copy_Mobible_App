import { create } from 'zustand';
import { loadMeta, saveMeta } from '../storage/db';

export type StudioMode = 'studio' | 'instruments' | 'mixer';

type UiStore = {
  mode: StudioMode;
  loopSheetOpen: boolean;
  effectsTrackId: string | null;
  onboardingOpen: boolean;
  onboardingReady: boolean;
  exportOpen: boolean;
  setMode: (mode: StudioMode) => void;
  setLoopSheetOpen: (open: boolean) => void;
  setEffectsTrackId: (trackId: string | null) => void;
  setOnboardingOpen: (open: boolean) => void;
  hydrateOnboarding: () => Promise<void>;
  setExportOpen: (open: boolean) => void;
};

let onboardingHydration: Promise<void> | null = null;

export const useUiStore = create<UiStore>((set, get) => ({
  mode: 'studio',
  loopSheetOpen: false,
  effectsTrackId: null,
  onboardingOpen: false,
  onboardingReady: false,
  exportOpen: false,
  setMode: (mode) => set({ mode }),
  setLoopSheetOpen: (loopSheetOpen) => set({ loopSheetOpen }),
  setEffectsTrackId: (effectsTrackId) => set({ effectsTrackId }),
  setOnboardingOpen: (onboardingOpen) => {
    if (!onboardingOpen) void saveMeta('onboarded', true).catch(() => undefined);
    set({ onboardingOpen });
  },
  async hydrateOnboarding() {
    if (get().onboardingReady) return;
    onboardingHydration ??= (async () => {
      const legacy = Boolean(localStorage.getItem('loop-pocket-onboarded'));
      const saved = await loadMeta<boolean>('onboarded').catch(() => false);
      if (legacy) {
        await saveMeta('onboarded', true).catch(() => undefined);
        localStorage.removeItem('loop-pocket-onboarded');
      }
      if (!get().onboardingReady) set({ onboardingOpen: !(legacy || saved), onboardingReady: true });
    })();
    await onboardingHydration;
  },
  setExportOpen: (exportOpen) => set({ exportOpen }),
}));
