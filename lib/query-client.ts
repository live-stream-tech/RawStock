import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { captureClientError, summarizeForErrorExtra } from "./debugIngest";
import { beginActionTelemetry } from "./actionTelemetry";
import { recordClientDebugBreadcrumb } from "./clientErrorContext";
import { compressVideoBlobForWebSameOrigin } from "./compressVideoBlobWeb";
import { notifyUnauthenticated } from "./session-redirect";

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

/** True when API base URL points at a machine-local host (baked .env must not win on production web). */
function apiBaseHostIsLocal(apiOriginWithSlash: string): boolean {
  try {
    return isLikelyLocalHostname(new URL(apiOriginWithSlash).hostname);
  } catch {
    return false;
  }
}

function webHostnameIsDeployed(): boolean {
  if (typeof window === "undefined" || !window.location?.hostname) return false;
  return !isLikelyLocalHostname(window.location.hostname);
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
  const onPublicWeb = webHostnameIsDeployed();

  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) {
    const normalized = normalizeExplicitApiBase(explicit);
    // Production sites often bake EXPO_PUBLIC_API_URL from .env (localhost). That breaks the browser (CORS / unreachable).
    if (!onPublicWeb || !apiBaseHostIsLocal(normalized)) {
      return normalized;
    }
    // Intentionally ignore local explicit URL when the page is served from a real host (e.g. rawstock.live).
  }

  const fromWindow = resolveFromWindow();
  if (fromWindow?.source === "window") {
    return fromWindow.url;
  }

  const fromDomain = resolveFromExpoPublicDomain();
  if (fromDomain) {
    if (!onPublicWeb || !apiBaseHostIsLocal(fromDomain.url)) {
      return fromDomain.url;
    }
  }

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

type ErrorCaptureContext = {
  route?: string;
  method?: string;
  requestUrl?: string;
  requestData?: unknown;
  kind?: "api_error" | "auth_error";
  title?: string;
};

function describeCurrentRoute(): string | null {
  if (typeof window === "undefined") return null;
  return `${window.location.pathname}${window.location.search}`;
}

function extractApiErrorCode(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as { code?: unknown };
    return typeof parsed.code === "string" ? parsed.code : null;
  } catch {
    return null;
  }
}

async function captureNetworkFailure(err: unknown, context: ErrorCaptureContext): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  recordClientDebugBreadcrumb({
    type: "api_request_network_error",
    message: `${context.method ?? "GET"} ${context.route ?? context.requestUrl ?? ""}`.trim(),
    route: describeCurrentRoute(),
    method: context.method ?? null,
    url: context.requestUrl ?? null,
    data: summarizeForErrorExtra(err) as Record<string, unknown>,
  });
  await captureClientError({
    kind: context.kind ?? "api_error",
    title: context.title ?? "Network request failed",
    message,
    method: context.method ?? null,
    requestUrl: context.requestUrl ?? null,
    extra:
      context.requestData === undefined
        ? undefined
        : { route: context.route ?? null, requestData: summarizeForErrorExtra(context.requestData) },
  });
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

/** Expected API outcomes — do not ingest as production errors. */
function isBenignApiError(status: number, message: string, route?: string | null): boolean {
  const m = message.toLowerCase();
  if (status === 403 && m.includes("track has not finished")) return true;
  if (status === 404 && m.includes("creator profile not found")) return true;
  if (status === 404 && route?.includes("/api/livers/me")) return true;
  return false;
}

export async function throwIfResNotOk(res: Response, context?: ErrorCaptureContext) {
  if (!res.ok) {
    if (res.status === 401) {
      notifyUnauthenticated();
    }
    const text = (await res.text()) || res.statusText;
    const route = context?.route ?? null;
    const code = extractApiErrorCode(text);
    const userMessage =
      parseJsonApiMessage(text) ?? (text.replace(/\s+/g, " ").trim() || `Request failed (HTTP ${res.status})`);
    const benign = isBenignApiError(res.status, userMessage, route);
    recordClientDebugBreadcrumb({
      type: "api_request_error",
      message: `${context?.method ?? "GET"} ${route ?? context?.requestUrl ?? ""}`.trim(),
      route: describeCurrentRoute(),
      status: res.status,
      method: context?.method ?? null,
      url: context?.requestUrl ?? null,
      data: {
        route,
        code,
      },
    });
    if (!benign) {
      await captureClientError({
        kind: context?.kind ?? "api_error",
        title: context?.title ?? "API request failed",
        message: userMessage,
        status: res.status,
        code,
        method: context?.method ?? null,
        requestUrl: context?.requestUrl ?? null,
        extra:
          context?.requestData === undefined
            ? { route }
            : { route, requestData: summarizeForErrorExtra(context.requestData) },
      });
    }
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
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: blob,
      credentials: "include",
    });
  } catch (err) {
    await captureNetworkFailure(err, {
      route: "/api/upload-file",
      method: "POST",
      requestUrl: url.toString(),
      requestData: {
        fileName,
        contentType,
        size: blob.size,
      },
      title: "Upload failed",
    });
    throw err;
  }
  await throwIfResNotOk(res, {
    route: "/api/upload-file",
    method: "POST",
    requestUrl: url.toString(),
    requestData: {
      fileName,
      contentType,
      size: blob.size,
    },
    title: "Upload failed",
  });
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
  let ct = contentType.split(";")[0].trim();
  let safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const action = beginActionTelemetry({
    action: "upload_user_media",
    title: "Media upload",
    method: "POST",
    requestUrl: "/api/upload-url",
    timeoutMs: 45_000,
    extra: {
      fileName: safeName,
      contentType: ct,
      originalSize: blob.size,
    },
  });
  try {
    let uploadBlob = blob;
    const isImage = isImageContentType(ct);
    const isVideo = /^video\//i.test(ct);

    if (blob.size > R2_SAME_ORIGIN_UPLOAD_MAX_BYTES && isImage) {
      uploadBlob = await compressImageBlobForUpload(blob, ct);
    }

    if (blob.size > R2_SAME_ORIGIN_UPLOAD_MAX_BYTES && isVideo && typeof document !== "undefined") {
      uploadBlob = await compressVideoBlobForWebSameOrigin(blob, ct, R2_SAME_ORIGIN_UPLOAD_MAX_BYTES);
      const t = uploadBlob.type.split(";")[0].trim();
      if (t && /^video\//i.test(t)) {
        ct = t;
        const ext = t.includes("webm")
          ? "webm"
          : t.includes("mp4")
            ? "mp4"
            : t.includes("quicktime")
              ? "mov"
              : "";
        if (ext) {
          const base = safeName.includes(".") ? safeName.slice(0, safeName.lastIndexOf(".")) : safeName;
          safeName = `${base}.${ext}`;
        }
      }
    }

    if (uploadBlob.size <= R2_SAME_ORIGIN_UPLOAD_MAX_BYTES) {
      const publicUrl = await uploadBlobViaR2SameOriginProxy(uploadBlob, safeName, ct);
      action.success({
        uploadMode: "same_origin_proxy",
        finalSize: uploadBlob.size,
      });
      return publicUrl;
    }

    if (isImage) {
      action.cancel({
        reason: "image_still_too_large_after_compression",
        finalSize: uploadBlob.size,
      });
      throw new Error(
        "Image is still too large after compression. Please choose a smaller image or crop tighter and try again.",
      );
    }

    if (isVideo && typeof document !== "undefined") {
      const tooLargeErr = new Error(
        "Video is still too large after compression. Try a shorter clip, lower resolution, or upload from the mobile app.",
      );
      action.fail(tooLargeErr, {
        stage: "video_still_too_large_after_compression",
        finalSize: uploadBlob.size,
        contentType: ct,
      });
      throw tooLargeErr;
    }

    const resp = await apiRequest("POST", "/api/upload-url", {
      fileName: safeName,
      contentType: ct,
    });
    const data = (await resp.json()) as { uploadUrl: string; url?: string; fileUrl?: string };
    if (!data.uploadUrl) {
      await action.unexpected("Upload start response did not include an upload URL.", {
        fileName: safeName,
        contentType: ct,
      });
      throw new Error("Could not start upload (invalid response from server).");
    }
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
      await captureClientError({
        kind: "api_error",
        title: "Storage upload failed",
        message: msg,
        method: "PUT",
        requestUrl: data.uploadUrl,
        extra: {
          route: "/api/upload-url",
          fileName: safeName,
          contentType: ct,
          size: uploadBlob.size,
        },
      });
      action.fail(err, {
        stage: "storage_put_request",
        uploadMode: "presigned_put",
        finalSize: uploadBlob.size,
      });
      throw new Error(
        `Could not upload to storage: ${msg}. On the web, configure R2 CORS for your app origin or use a file under ${Math.floor(R2_SAME_ORIGIN_UPLOAD_MAX_BYTES / 1024 / 1024)}MB.`,
      );
    }

    if (!putRes.ok) {
      const hint = (await putRes.text().catch(() => "")).trim().replace(/\s+/g, " ");
      await captureClientError({
        kind: "api_error",
        title: "Storage upload failed",
        message: hint || `Storage upload failed (HTTP ${putRes.status})`,
        status: putRes.status,
        method: "PUT",
        requestUrl: data.uploadUrl,
        extra: {
          route: "/api/upload-url",
          fileName: safeName,
          contentType: ct,
          size: uploadBlob.size,
        },
      });
      action.fail(new Error(hint || `HTTP ${putRes.status}`), {
        stage: "storage_put_response",
        status: putRes.status,
        uploadMode: "presigned_put",
        finalSize: uploadBlob.size,
      });
      throw new Error(
        hint
          ? `Storage upload failed (HTTP ${putRes.status}): ${hint.slice(0, 220)}${hint.length > 220 ? "…" : ""}`
          : `Storage upload failed (HTTP ${putRes.status}). On the web, configure R2 CORS for your domain.`,
      );
    }

    const publicUrl = data.url ?? data.fileUrl;
    if (!publicUrl) {
      await action.unexpected("Upload URL response did not include a public URL.", {
        fileName: safeName,
        contentType: ct,
      });
      throw new Error("Upload URL response did not include a public URL");
    }
    action.success({
      uploadMode: "presigned_put",
      finalSize: uploadBlob.size,
    });
    return publicUrl;
  } catch (err) {
    if (!action.isSettled()) {
      action.fail(err, {
        fileName: safeName,
        contentType: ct,
      });
    }
    throw err;
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);
  recordClientDebugBreadcrumb({
    type: "api_request_start",
    message: `${method.toUpperCase()} ${route}`,
    route: describeCurrentRoute(),
    method: method.toUpperCase(),
    url: url.toString(),
    data: data === undefined ? undefined : (summarizeForErrorExtra(data) as Record<string, unknown>),
  });

  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  const token = await readAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
  } catch (err) {
    await captureNetworkFailure(err, {
      route,
      method,
      requestUrl: url.toString(),
      requestData: data,
    });
    throw err;
  }

  await throwIfResNotOk(res, {
    route,
    method,
    requestUrl: url.toString(),
    requestData: data,
  });
  recordClientDebugBreadcrumb({
    type: "api_request_ok",
    message: `${method.toUpperCase()} ${route}`,
    route: describeCurrentRoute(),
    status: res.status,
    method: method.toUpperCase(),
    url: url.toString(),
  });
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
type NotFoundBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  on404?: NotFoundBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, on404: notFoundBehavior = "throw" }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const route = queryKey.join("/") as string;
    const url = new URL(route, baseUrl);
    recordClientDebugBreadcrumb({
      type: "query_request_start",
      message: `GET ${route}`,
      route: describeCurrentRoute(),
      method: "GET",
      url: url.toString(),
    });

    const headers: Record<string, string> = {};
    const token = await readAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        credentials: "include",
        headers,
      });
    } catch (err) {
      await captureNetworkFailure(err, {
        route,
        method: "GET",
        requestUrl: url.toString(),
      });
      throw err;
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (notFoundBehavior === "returnNull" && res.status === 404) {
      return null;
    }

    await throwIfResNotOk(res, {
      route,
      method: "GET",
      requestUrl: url.toString(),
    });
    recordClientDebugBreadcrumb({
      type: "query_request_ok",
      message: `GET ${route}`,
      route: describeCurrentRoute(),
      status: res.status,
      method: "GET",
      url: url.toString(),
    });
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
