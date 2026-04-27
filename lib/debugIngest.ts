/**
 * Optional local Cursor/agent ingest. Never calls localhost from deployed origins.
 */
function allowBrowserDebugIngest(): boolean {
  if (typeof __DEV__ !== "undefined" && !__DEV__) return false;
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

export function debugIngestLocal(body: Record<string, unknown>): void {
  if (!allowBrowserDebugIngest()) return;
  fetch("http://127.0.0.1:7508/ingest/394829cb-326c-4cb8-ad25-91374b2c7523", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "88cb7d" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

/** ErrorBoundary hook (separate debug ingest port) */
export function debugIngestErrorBoundary(body: Record<string, unknown>): void {
  if (!allowBrowserDebugIngest()) return;
  fetch("http://127.0.0.1:7349/ingest/7dff581f-bd1a-45e7-a59d-07959fb1fc8e", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "47cd06" },
    body: JSON.stringify(body),
  }).catch(() => {});
}
