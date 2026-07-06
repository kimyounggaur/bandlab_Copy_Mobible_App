import { create } from 'zustand';

export type StudioMode = 'studio' | 'instruments' | 'mixer';

type UiStore = {
  mode: StudioMode;
  loopSheetOpen: boolean;
  effectsTrackId: string | null;
  onboardingOpen: boolean;
  exportOpen: boolean;
  setMode: (mode: StudioMode) => void;
  setLoopSheetOpen: (open: boolean) => void;
  setEffectsTrackId: (trackId: string | null) => void;
  setOnboardingOpen: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  mode: 'studio',
  loopSheetOpen: false,
  effectsTrackId: null,
  onboardingOpen: !localStorage.getItem('loop-pocket-onboarded'),
  exportOpen: false,
  setMode: (mode) => set({ mode }),
  setLoopSheetOpen: (loopSheetOpen) => set({ loopSheetOpen }),
  setEffectsTrackId: (effectsTrackId) => set({ effectsTrackId }),
  setOnboardingOpen: (onboardingOpen) => {
    if (!onboardingOpen) localStorage.setItem('loop-pocket-onboarded', '1');
    set({ onboardingOpen });
  },
  setExportOpen: (exportOpen) => set({ exportOpen }),
}));
