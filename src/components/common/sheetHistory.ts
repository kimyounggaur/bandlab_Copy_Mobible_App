export function consumeSheetHistory() {
  const state = window.history.state;
  if (!state?.loopPocketSheet || state.loopPocketSheetClosing) return;
  window.history.replaceState({ ...state, loopPocketSheetClosing: true }, '', window.location.href);
  window.history.back();
}
