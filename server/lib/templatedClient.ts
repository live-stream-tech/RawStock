/**
 * Templated.io Create Render API クライアント。
 * @see https://templated.io/docs/renders/create/
 */

import type {
  TemplatedModification,
  TemplatedRenderRequest,
  TemplatedRenderResponse,
} from "../types/templated";

const TEMPLATED_RENDER_URL = "https://api.templated.io/v1/render";

/** API の `layers` オブジェクトへ変換（video_url / text / image_url） */
export function templatedModificationsToLayers(
  modifications: Record<string, TemplatedModification>,
): Record<string, Record<string, unknown>> {
  const layers: Record<string, Record<string, unknown>> = {};
  for (const [layerName, mod] of Object.entries(modifications)) {
    const layer: Record<string, unknown> = {};
    if (mod.video) {
      layer.video_url = mod.video.src;
    }
    if (mod.text) {
      layer.text = mod.text.value;
      if (mod.text.style === "bold" || mod.text.style === "kinetic") {
        layer.font_weight = "bold";
      }
    }
    if (mod.logo) {
      layer.image_url = mod.logo.src;
    }
    layers[layerName] = layer;
  }
  return layers;
}

export interface CreateTemplatedRenderOptions {
  /** Bearer トークン（TEMPLATED_API_KEY） */
  apiKey: string;
  /** ジョブ紐づけ用（webhook で ai_edit_jobs.id を特定） */
  externalId?: string;
  /**
   * MP4 の長さ（ミリ秒）。Templated 上限 90000。
   * 未指定時は API デフォルトに任せる。
   */
  durationMs?: number;
}

/**
 * {@link TemplatedRenderRequest} を公式 API ボディに変換する。
 */
export function toTemplatedApiBody(
  request: TemplatedRenderRequest,
  options: CreateTemplatedRenderOptions,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    template: request.template,
    layers: templatedModificationsToLayers(request.modifications),
    format: request.format,
    async: true,
  };
  if (request.webhook_url?.trim()) {
    body.webhook_url = request.webhook_url.trim();
  }
  if (options.externalId?.trim()) {
    body.external_id = options.externalId.trim();
  }
  if (request.format === "mp4" && options.durationMs != null) {
    const ms = Math.round(options.durationMs);
    body.duration = Math.min(90_000, Math.max(1_000, ms));
  }
  return body;
}

/**
 * POST /v1/render。async + webhook 前提で送る（async は常に true）。
 */
export async function createTemplatedRender(
  request: TemplatedRenderRequest,
  options: CreateTemplatedRenderOptions,
): Promise<TemplatedRenderResponse> {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    return { id: "", status: "failed", error: "TEMPLATED_API_KEY is not set" };
  }

  const body = toTemplatedApiBody(request, options);

  let res: Response;
  try {
    res = await fetch(TEMPLATED_RENDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { id: "", status: "failed", error: msg };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errMsg =
      data && typeof data === "object" && data !== null && "message" in data
        ? String((data as { message: unknown }).message)
        : res.statusText;
    return { id: "", status: "failed", error: errMsg || `HTTP ${res.status}` };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const obj = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const id = typeof obj.id === "string" ? obj.id : "";
  const url = typeof obj.url === "string" ? obj.url : undefined;
  const statusRaw = typeof obj.status === "string" ? obj.status.toLowerCase() : "";

  let status: TemplatedRenderResponse["status"] = "pending";
  if (url) status = "succeeded";
  else if (statusRaw === "failed" || statusRaw === "error") status = "failed";
  else if (statusRaw === "processing" || statusRaw === "pending") status = statusRaw as "pending" | "processing";

  return {
    id,
    status,
    url,
    webhook_url: request.webhook_url,
    error: typeof obj.error === "string" ? obj.error : undefined,
  };
}
