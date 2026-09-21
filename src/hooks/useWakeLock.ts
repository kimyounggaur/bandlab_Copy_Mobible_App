import { useEffect } from 'react';
import { audioEngine } from '../audio/engine';

export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let request: Promise<void> | null = null;
    let generation = 0;

    function sync() {
      const state = audioEngine.getState();
      const wanted = (state.playing || state.recording) && !document.hidden;
      if (!wanted) {
        generation += 1;
        const old = lock;
        lock = null;
        void old?.release().catch(() => undefined);
        return;
      }
      if (lock || request) return;
      const current = generation;
      request = navigator.wakeLock.request('screen').then(async (acquired) => {
        if (current !== generation || document.hidden) {
          await acquired.release();
          return;
        }
        lock = acquired;
        acquired.addEventListener('release', () => {
          if (lock === acquired) lock = null;
        });
      }).catch(() => {
        // Unsupported or denied: playback remains usable.
      }).finally(() => {
        request = null;
        if (current !== generation) sync();
      });
    }

    const unsubscribe = audioEngine.subscribe(sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      generation += 1;
      unsubscribe();
      document.removeEventListener('visibilitychange', sync);
      void lock?.release().catch(() => undefined);
      lock = null;
    };
  }, []);
}
