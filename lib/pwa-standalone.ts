/**
 * PWA スタンドアロン（ホーム画面から起動）かどうか。
 * Web のみ参照すること（SSR / ネイティブでは window なし）。
 */
export function isPwaStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** iPhone / iPad の Safari（タブまたは PWA） */
export function isLikelyIosWeb(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}

/**
 * ライブ送信の getUserMedia を自動起動せず、タップで取るべき環境。
 * iOS / PWA はユーザージェスチャーと紐づけないとカメラが取れないことが多い。
 */
export function webBroadcastNeedsUserGestureForCamera(): boolean {
  return isPwaStandalone() || isLikelyIosWeb();
}
