/** Registered from root layout — redirects guests to sign-in on HTTP 401. */
let redirectHandler: (() => void) | null = null;

export function registerUnauthenticatedRedirect(handler: () => void): void {
  redirectHandler = handler;
}

export function notifyUnauthenticated(): void {
  redirectHandler?.();
}
