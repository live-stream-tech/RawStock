import { router } from "expo-router";

/**
 * In standalone PWA or deep links that open policy screens alone, `router.back()` may be a no-op.
 * If history exists, go back; otherwise replace with the tab home route.
 */
export function routerBackOrTabHome(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/" as any);
}
