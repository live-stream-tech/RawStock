/** Safe playback position in seconds (avoids NaN when startedAt is missing / invalid). */
export function jukeboxElapsedSeconds(state: {
  isPlaying: boolean;
  startedAt?: string | null;
  elapsedSecs?: number;
}): number {
  if (!state.isPlaying && typeof state.elapsedSecs === "number" && Number.isFinite(state.elapsedSecs)) {
    return Math.max(0, state.elapsedSecs);
  }
  const started = state.startedAt ? new Date(state.startedAt).getTime() : NaN;
  if (Number.isFinite(started)) {
    const sec = (Date.now() - started) / 1000;
    return Number.isFinite(sec) ? Math.max(0, sec) : 0;
  }
  return typeof state.elapsedSecs === "number" && Number.isFinite(state.elapsedSecs)
    ? Math.max(0, state.elapsedSecs)
    : 0;
}
