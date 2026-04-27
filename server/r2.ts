import { GetObjectCommand, S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Request, Response } from "express";

const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET_NAME;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!endpoint || !bucket) {
  console.warn("[R2] R2_ENDPOINT / R2_BUCKET_NAME が設定されていません");
}

const r2Client =
  endpoint && accessKeyId && secretAccessKey
    ? new S3Client({
        region: "auto",
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        /**
         * ランタイムの既定は WHEN_SUPPORTED のため、環境や ~/.aws/config 次第で
         * PutObject の presign に CRC 系クエリが載り、ブラウザの単純 PUT と両立しない。
         * ここで明示すると Vercel 上の AWS_* 設定より優先され、presign が安定する。
         */
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
        // R2 / S3 互換では path-style が安定（署名 URL とブラウザ PUT の不一致を防ぐ）
        forcePathStyle: true,
      })
    : null;

export async function createSignedUploadUrl(key: string, contentType: string) {
  if (!r2Client || !endpoint || !bucket) {
    throw new Error(
      "R2 is not configured. Set R2_ENDPOINT, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
    );
  }

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, cmd, { expiresIn: 60 * 5 });

  /**
   * Browser-readable URL. When unset, callers should use same-origin `/api/r2-public/:key`
   * (see `pipeR2PublicObjectToResponse`) — never return the private R2 S3 API host as a "public" URL.
   */
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim();
  const publicUrl = publicBase ? `${publicBase.replace(/\/$/, "")}/${key}` : null;

  return { uploadUrl, publicUrl };
}

/**
 * Browser-readable URL for an uploaded object key (same logic as `POST /api/upload-url`).
 * Throws if a same-origin `/api/r2-public/...` URL cannot be built.
 */
export function resolveUploadPublicUrlForKey(req: Pick<Request, "get" | "protocol">, key: string): string {
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (publicBase) return `${publicBase.replace(/\/$/, "")}/${key}`;

  const host = String(req.get("x-forwarded-host") ?? req.get("host") ?? "").trim();
  const xfProto = String(req.get("x-forwarded-proto") ?? "").split(",")[0]?.trim();
  const proto =
    xfProto === "http" || xfProto === "https"
      ? xfProto
      : req.protocol === "https"
        ? "https"
        : "http";
  if (!host) {
    throw new Error("MISSING_HOST_FOR_PUBLIC_URL");
  }
  return `${proto}://${host}/api/r2-public/${encodeURIComponent(key)}`;
}

export async function putR2ObjectBuffer(key: string, contentType: string, body: Buffer): Promise<void> {
  if (!r2Client || !bucket) {
    throw new Error(
      "R2 is not configured. Set R2_ENDPOINT, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
    );
  }
  const ct = contentType.split(";")[0]?.trim() || "application/octet-stream";
  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: ct,
    }),
  );
}

/** Keys issued by `/api/upload-url` (no slashes) — safe to expose via anonymous GET proxy. */
export function isAppUploadR2Key(key: string): boolean {
  return /^rawstock_\d+_[a-zA-Z0-9_.-]+$/.test(key);
}

export async function pipeR2PublicObjectToResponse(res: Response, key: string): Promise<void> {
  if (!isAppUploadR2Key(key)) {
    res.status(400).end();
    return;
  }
  if (!r2Client || !bucket) {
    res.status(503).json({ error: "R2 is not configured" });
    return;
  }

  try {
    const out = await r2Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    const ct = out.ContentType?.split(";")[0]?.trim() || "application/octet-stream";
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const body = out.Body;
    if (!body) {
      res.status(404).end();
      return;
    }
    const stream = body as NodeJS.ReadableStream;
    stream.on("error", () => {
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  } catch (e: unknown) {
    const name = e && typeof e === "object" && "name" in e ? String((e as { name?: string }).name) : "";
    const status =
      e && typeof e === "object" && "$metadata" in e
        ? Number((e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode)
        : 0;
    if (name === "NoSuchKey" || status === 404) {
      res.status(404).end();
      return;
    }
    if (!res.headersSent) res.status(500).end();
  }
}

