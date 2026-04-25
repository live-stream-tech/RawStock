/**
 * Whether the app runs as an installed PWA (home-screen launch).
 * Web-only guard — there is no `window` on SSR/native.
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

/** Likely Safari on iPhone/iPad (tab or standalone PWA) */
export function isLikelyIosWeb(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}

/**
 * Environments where live `getUserMedia` should not auto-start and must be tied to a user gesture.
 * iOS/PWA frequently blocks camera access without a gesture.
 */
export function webBroadcastNeedsUserGestureForCamera(): boolean {
  return isPwaStandalone() || isLikelyIosWeb();
}
