import type { IncomingMessage } from "node:http";
import { createApiApp } from "../server/vercel-app";

let appPromise: ReturnType<typeof createApiApp> | null = null;

export function getApp(): ReturnType<typeof createApiApp> {
  if (!appPromise) {
    appPromise = createApiApp();
  }
  return appPromise;
}

/** Vercel では req.url がフルURLで届くことがあるため、path+query に正規化する */
export function normalizeReqUrl(req: IncomingMessage): void {
  const url = req.url ?? "";
  if (url.startsWith("http")) {
    try {
      const u = new URL(url);
      req.url = u.pathname + u.search;
    } catch {
      // ignore
    }
  } else if (url && !url.startsWith("/")) {
    req.url = "/api/" + url;
  }
}
