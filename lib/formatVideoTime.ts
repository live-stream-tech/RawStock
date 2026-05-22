export function formatVideoTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** Human-readable max length for upload limits (e.g. 3600 → "1 hour"). */
export function formatPostVideoMaxDuration(sec: number, isJaUi: boolean): string {
  const s = Math.max(0, Math.floor(sec));
  if (s >= 3600 && s % 3600 === 0) {
    const h = s / 3600;
    return isJaUi ? `${h}時間` : h === 1 ? "1 hour" : `${h} hours`;
  }
  if (s >= 60 && s % 60 === 0) {
    const m = s / 60;
    return isJaUi ? `${m}分` : `${m} min`;
  }
  return isJaUi ? `${s}秒` : `${s}s`;
}
