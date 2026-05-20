/** Registered from root layout — redirects guests to sign-in on HTTP 401. */
let redirectHandler: (() => void) | null = null;

let lastRedirectAt = 0;
const REDIRECT_COOLDOWN_MS = 4000;

let authLoading = true;
let hasSession = false;

/** Sync from AuthProvider so we do not redirect during session restore or when already signed in. */
export function setLoginRedirectAuthState(loading: boolean, sessionPresent: boolean): void {
  authLoading = loading;
  hasSession = sessionPresent;
}

export function registerUnauthenticatedRedirect(handler: () => void): void {
  redirectHandler = handler;
}

function isOnAuthRoute(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path.startsWith("/auth/");
}

/**
 * Single entry for "go to login" — debounced, skips auth routes and in-flight session restore.
 */
export function requestLoginRedirect(): void {
  if (authLoading) return;
  if (isOnAuthRoute()) return;
  const now = Date.now();
  if (now - lastRedirectAt < REDIRECT_COOLDOWN_MS) return;
  lastRedirectAt = now;
  redirectHandler?.();
}

/** API 401: redirect only when there is no stored session (expired / signed out). */
export function notifyUnauthenticated(): void {
  if (authLoading) return;
  if (hasSession) return;
  requestLoginRedirect();
}
