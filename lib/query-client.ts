import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_DEV_API_PORT = "5001";
const DEV_API_FALLBACK = `http://127.0.0.1:${DEFAULT_DEV_API_PORT}/`;

function isLikelyLocalHostname(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.startsWith("localhost") ||
    h.startsWith("127.0.0.1") ||
    /^192\.168\.\d+\.\d+/.test(h) ||
    /^10\.\d+\.\d+\.\d+/.test(h)
  );
}

/** Metro web dev server runs API on another port — do not treat window.origin as the API */
function isMetroBundlerOrigin(url: URL): boolean {
  const h = url.hostname.toLowerCase();
  if (h !== "localhost" && h !== "127.0.0.1") return false;
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  const n = Number(port);
  if (n === 8081 || n === 8082) return true;
  if (n >= 19000 && n <= 19100) return true;
  return false;
}

/** For EXPO_PUBLIC_API_URL: normalize an explicit API base to `origin/` */
function normalizeExplicitApiBase(input: string): string {
  const t = input.trim().replace(/\/+$/, "");
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) {
    return new URL(t).origin + "/";
  }
  const hostPart = t.replace(/^\/\//, "");
  const proto = isLikelyLocalHostname(hostPart) ? "http" : "https";
  return new URL(`${proto}://${hostPart}`).origin + "/";
}

/** Resolve EXPO_PUBLIC_DOMAIN to API origin; swap Metro URLs to the dev API base */
function resolveFromExpoPublicDomain(): { url: string; source: string } | null {
  const raw = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (!raw) return null;

  let normalized: string;
  if (/^https?:\/\//i.test(raw)) {
    normalized = raw;
  } else {
    const h = raw.replace(/^\/\//, "");
    normalized = isLikelyLocalHostname(h) ? `http://${h}` : `https://${h}`;
  }

  const resolved = new URL(normalized).origin + "/";
  if (isMetroBundlerOrigin(new URL(resolved))) {
    console.warn(
      `[getApiUrl] EXPO_PUBLIC_DOMAIN is a Metro/Expo URL (${raw}); using API base ${DEV_API_FALLBACK}. Set EXPO_PUBLIC_API_URL if your API runs on another port.`,
    );
    return { url: DEV_API_FALLBACK, source: "env-metro-override" };
  }
  return { url: resolved, source: "env" };
}

function resolveFromWindow(): { url: string; source: string } | null {
  if (typeof window === "undefined" || !window.location?.origin) return null;
  const originUrl = new URL(window.location.origin);
  if (isMetroBundlerOrigin(originUrl)) {
    console.warn(
      `[getApiUrl] Web is on the Metro/Expo dev server (${window.location.origin}); using API ${DEV_API_FALLBACK}. Set EXPO_PUBLIC_API_URL if the API is elsewhere.`,
    );
    return { url: DEV_API_FALLBACK, source: "metro-fallback" };
  }
  return { url: window.location.origin + "/", source: "window" };
}

/**
 * Express API base URL (trailing slash).
 *
 * Prefer `window.location` on deployed web (non-Metro).
 * If baked EXPO_PUBLIC_DOMAIN drifts from production, previews/custom URLs may hit the wrong host (502s).
 * When the API is on another domain, always set EXPO_PUBLIC_API_URL.
 */
export function getApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) {
    return normalizeExplicitApiBase(explicit);
  }

  const fromWindow = resolveFromWindow();
  if (fromWindow?.source === "window") {
    return fromWindow.url;
  }

  const fromDomain = resolveFromExpoPublicDomain();
  if (fromDomain) return fromDomain.url;

  if (fromWindow) return fromWindow.url;

  if (process.env.NODE_ENV !== "production") {
    console.warn(`[getApiUrl] EXPO_PUBLIC_DOMAIN is unset; using dev fallback ${DEV_API_FALLBACK}.`);
    return DEV_API_FALLBACK;
  }

  throw new Error(
    "EXPO_PUBLIC_DOMAIN is not set and API base URL could not be inferred.",
  );
}

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

function parseJsonApiMessage(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const o = JSON.parse(trimmed) as { error?: unknown; message?: unknown };
    const errLine = typeof o.error === "string" ? o.error.trim() : "";
    const msgLine = typeof o.message === "string" ? o.message.trim() : "";
    const line = errLine || msgLine;
    return line || null;
  } catch {
    return null;
  }
}

/**
 * Human-readable errors for alerts/UI. `ApiError` prefers JSON `error` / `message`; otherwise trims body text.
 */
export function formatUserFacingApiError(err: unknown): string {
  if (err instanceof ApiError) {
    const fromJson = parseJsonApiMessage(err.body);
    if (fromJson) {
      return `${fromJson} (HTTP ${err.status})`;
    }
    const flat = err.body.replace(/\s+/g, " ").trim();
    if (flat.length > 0) {
      const max = 280;
      const cut = flat.length > max ? `${flat.slice(0, max)}…` : flat;
      return `${cut} (HTTP ${err.status})`;
    }
    return `Request failed (HTTP ${err.status})`;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Something went wrong. Please try again.";
}

export async function readAuthToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem("auth_token");
    if (token) return token;
  } catch {
    // ignore AsyncStorage read errors
  }

  if (typeof window !== "undefined") {
    try {
      const token = window.localStorage?.getItem("auth_token");
      if (token) return token;
    } catch {
      // ignore localStorage read errors
    }
  }

  return null;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new ApiError(res.status, text);
  }
}

function assertR2PresignBrowserCompatible(presign: string): void {
  if (
    /x-amz-sdk-checksum-algorithm=/i.test(presign) ||
    /x-amz-checksum-/i.test(presign) ||
    /[?&]x-amz-checksum-crc32=/i.test(presign) ||
    /_cksum-crc32/i.test(presign)
  ) {
    throw new Error(
      "The upload URL from the server includes SDK checksum parameters, which browsers cannot send on a simple PUT. " +
        "Redeploy the API with the latest server (R2 client uses requestChecksumCalculation WHEN_REQUIRED), " +
        "or unset AWS_REQUEST_CHECKSUM_CALCULATION on the server if it is set to WHEN_SUPPORTED.",
    );
  }
}

/** Stay under Vercel's ~4.5MB serverless request body cap; same-origin upload avoids R2 CORS in the browser. */
export const R2_SAME_ORIGIN_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_RESIZE_MIN_EDGE = 320;
const IMAGE_RESIZE_START_MAX_EDGE = 2048;
const IMAGE_RESIZE_MAX_STEPS = 12;

function isImageContentType(contentType: string): boolean {
  return /^image\/(jpeg|png|webp|gif)$/i.test(contentType);
}

async function readImageBitmapFromBlob(blob: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(blob);
  }
  if (typeof document === "undefined") {
    throw new Error("Image compression is not supported on this platform.");
  }
  return await new Promise<ImageBitmap>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create image context.");
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((b) => {
          URL.revokeObjectURL(url);
          if (!b) return reject(new Error("Could not read image."));
          createImageBitmap(b).then(resolve).catch(reject);
        }, "image/png");
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image for compression."));
    };
    img.src = url;
  });
}

/** Resize / re-encode toward JPEG for reliable `POST /api/upload-file` (HEIC, odd MIME, etc.). */
export async function compressImageBlobForUpload(blob: Blob, contentType: string): Promise<Blob> {
  if (typeof document === "undefined" || typeof OffscreenCanvas === "undefined") {
    return blob;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await readImageBitmapFromBlob(blob);
  } catch {
    return blob;
  }
  try {
    const originalMaxEdge = Math.max(bitmap.width, bitmap.height);
    const startMaxEdge = Math.min(originalMaxEdge, IMAGE_RESIZE_START_MAX_EDGE);
    // Always convert to JPEG for predictable size reduction and to stay under proxy limit.
    const targetType = "image/jpeg";
    let quality = 0.86;
    let maxEdge = startMaxEdge;
    let best: Blob | null = null;

    for (let i = 0; i < IMAGE_RESIZE_MAX_STEPS; i += 1) {
      const scale = Math.min(1, maxEdge / originalMaxEdge);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.drawImage(bitmap, 0, 0, width, height);
      const candidate = await canvas
        .convertToBlob({
          type: targetType,
          quality,
        })
        .catch(() => null);
      if (!candidate) break;
      best = candidate;
      if (candidate.size <= R2_SAME_ORIGIN_UPLOAD_MAX_BYTES) {
        return candidate;
      }

      if (targetType === "image/jpeg" && typeof quality === "number" && quality > 0.35) {
        quality -= 0.08;
      } else {
        maxEdge = Math.max(IMAGE_RESIZE_MIN_EDGE, Math.round(maxEdge * 0.8));
      }
      if (maxEdge <= IMAGE_RESIZE_MIN_EDGE && quality <= 0.35) break;
    }
    return best ?? blob;
  } finally {
    if (typeof bitmap.close === "function") {
      bitmap.close();
    }
  }
}

async function uploadBlobViaR2SameOriginProxy(
  blob: Blob,
  fileName: string,
  contentType: string,
): Promise<string> {
  const baseUrl = getApiUrl();
  const url = new URL("/api/upload-file", baseUrl);
  const token = await readAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "X-Upload-File-Name": encodeURIComponent(fileName),
    "X-Upload-Content-Type": contentType.split(";")[0].trim(),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // #region agent log
  fetch("http://127.0.0.1:7652/ingest/22e351bd-1e97-4a00-ab87-c9defd35899c",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"1296ac"},body:JSON.stringify({sessionId:"1296ac",runId:"run1",hypothesisId:"H1",location:"lib/query-client.ts:uploadBlobViaR2SameOriginProxy:beforeFetch",message:"avatar upload proxy request start",data:{url:url.toString(),blobSize:blob.size,contentType:contentType.split(";")[0].trim(),fileNameExt:fileName.split(".").pop() ?? ""},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: blob,
    credentials: "include",
  });
  // #region agent log
  fetch("http://127.0.0.1:7652/ingest/22e351bd-1e97-4a00-ab87-c9defd35899c",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"1296ac"},body:JSON.stringify({sessionId:"1296ac",runId:"run1",hypothesisId:"H1",location:"lib/query-client.ts:uploadBlobViaR2SameOriginProxy:afterFetch",message:"avatar upload proxy response",data:{status:res.status,ok:res.ok},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  await throwIfResNotOk(res);
  const data = (await res.json()) as { url?: string; fileUrl?: string };
  const publicUrl = data.url ?? data.fileUrl;
  if (!publicUrl) throw new Error("Upload response did not include a public URL");
  return publicUrl;
}

/**
 * Upload user media to R2. Small files use `POST /api/upload-file` (no cross-origin PUT).
 * Larger files use a presigned URL (requires R2 CORS for browser PUT).
 */
export async function uploadUserMediaBlobToR2(
  blob: Blob,
  fileName: string,
  contentType: string,
): Promise<string> {
  const ct = contentType.split(";")[0].trim();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  let uploadBlob = blob;
  const isImage = isImageContentType(ct);

  if (blob.size > R2_SAME_ORIGIN_UPLOAD_MAX_BYTES && isImage) {
    uploadBlob = await compressImageBlobForUpload(blob, ct);
  }

  if (uploadBlob.size <= R2_SAME_ORIGIN_UPLOAD_MAX_BYTES) {
    return uploadBlobViaR2SameOriginProxy(uploadBlob, safeName, ct);
  }

  if (isImage) {
    throw new Error(
      "Image is still too large after compression. Please choose a smaller image or crop tighter and try again.",
    );
  }

  const resp = await apiRequest("POST", "/api/upload-url", {
    fileName: safeName,
    contentType: ct,
  });
  const data = (await resp.json()) as { uploadUrl: string; url?: string; fileUrl?: string };
  if (!data.uploadUrl) throw new Error("Could not start upload (invalid response from server).");
  assertR2PresignBrowserCompatible(data.uploadUrl);

  let putRes: Response;
  try {
    putRes = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": ct },
      body: uploadBlob,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not upload to storage: ${msg}. On the web, configure R2 CORS for your app origin or use a file under ${Math.floor(R2_SAME_ORIGIN_UPLOAD_MAX_BYTES / 1024 / 1024)}MB.`,
    );
  }

  if (!putRes.ok) {
    const hint = (await putRes.text().catch(() => "")).trim().replace(/\s+/g, " ");
    throw new Error(
      hint
        ? `Storage upload failed (HTTP ${putRes.status}): ${hint.slice(0, 220)}${hint.length > 220 ? "…" : ""}`
        : `Storage upload failed (HTTP ${putRes.status}). On the web, configure R2 CORS for your domain.`,
    );
  }

  const publicUrl = data.url ?? data.fileUrl;
  if (!publicUrl) throw new Error("Upload URL response did not include a public URL");
  return publicUrl;
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  const token = await readAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const headers: Record<string, string> = {};
    const token = await readAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url.toString(), {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
