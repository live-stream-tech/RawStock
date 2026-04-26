import "dotenv/config";
import { Pool } from "pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { parseThreadBody } from "../lib/parse-thread-body";

type ThreadRow = {
  id: number;
  body: string;
};

const r2Endpoint = process.env.R2_ENDPOINT?.trim();
const r2Bucket = process.env.R2_BUCKET_NAME?.trim();
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
const r2Secret = process.env.R2_SECRET_ACCESS_KEY?.trim();
const r2PublicBase = process.env.R2_PUBLIC_BASE_URL?.trim();

const r2Client =
  r2Endpoint && r2Bucket && r2AccessKeyId && r2Secret
    ? new S3Client({
        region: "auto",
        endpoint: r2Endpoint,
        forcePathStyle: true,
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2Secret,
        },
      })
    : null;

function safeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "flyer";
}

function inferImageMime(url: string): string {
  const low = url.toLowerCase();
  if (low.includes(".png")) return "image/png";
  if (low.includes(".webp")) return "image/webp";
  if (low.includes(".gif")) return "image/gif";
  return "image/jpeg";
}

function isAlreadyMirrored(url: string): boolean {
  const normalized = url.trim();
  if (!normalized) return false;
  if (r2PublicBase && normalized.startsWith(r2PublicBase.replace(/\/$/, ""))) return true;
  if (r2Endpoint && r2Bucket) {
    const endpointStyle = `${r2Endpoint.replace(/\/$/, "")}/${r2Bucket}/`;
    return normalized.startsWith(endpointStyle);
  }
  return false;
}

function replaceFlyerDirective(body: string, newUrl: string): string {
  const lines = body.split("\n");
  let replaced = false;
  const out = lines.map((line) => {
    const trimmed = line.trim();
    if (/^FLYER_IMAGE\s*[:：]/i.test(trimmed)) {
      replaced = true;
      return `FLYER_IMAGE: ${newUrl}`;
    }
    if (/^フライヤー画像(?:URL)?\s*[:：]/i.test(trimmed)) {
      replaced = true;
      return `FLYER_IMAGE: ${newUrl}`;
    }
    return line;
  });
  if (!replaced) {
    return `FLYER_IMAGE: ${newUrl}\n${body}`;
  }
  return out.join("\n");
}

function extractOfficialLink(body: string): string | null {
  const m = body.match(/^\s*Official link:\s*(https?:\/\/\S+)/im);
  return m?.[1]?.trim() ?? null;
}

function recoverBrokenThumUrl(flyerUrl: string, body: string): string {
  const normalized = flyerUrl.trim();
  const thumPrefix = "https://image.thum.io/get/width/1400/";
  if (!normalized.startsWith(thumPrefix)) return normalized;
  const rest = normalized.slice(thumPrefix.length);
  if (/^https?:\/\//i.test(rest)) return normalized;
  const officialLink = extractOfficialLink(body);
  if (!officialLink) return normalized;
  return `${thumPrefix}${officialLink}`;
}

function extractMetaContent(html: string, key: "property" | "name", value: string): string | null {
  const re = new RegExp(
    `<meta[^>]+${key}=["']${value}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+${key}=["']${value}["'][^>]*>`,
    "i"
  );
  const m = html.match(re);
  return m?.[1]?.trim() ?? m?.[2]?.trim() ?? null;
}

function absolutizeLink(baseUrl: string, maybeLink: string): string | null {
  try {
    return new URL(maybeLink, baseUrl).toString();
  } catch {
    return null;
  }
}

async function findOgImageFromOfficialLink(officialLink: string): Promise<string | null> {
  const res = await fetch(officialLink, {
    headers: { "User-Agent": "RawStockFlyerMirror/1.0 (+https://rawstock.live)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return null;
  const html = await res.text();
  const og =
    extractMetaContent(html, "property", "og:image") ??
    extractMetaContent(html, "name", "og:image") ??
    extractMetaContent(html, "name", "twitter:image");
  if (!og) return null;
  return absolutizeLink(officialLink, og);
}

function extractFlyerDirectiveRaw(body: string): string | null {
  const lines = body.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!/^FLYER_IMAGE\s*[:：]/i.test(trimmed) && !/^フライヤー画像(?:URL)?\s*[:：]/i.test(trimmed)) {
      continue;
    }
    const raw = trimmed.replace(/^[^:：]+[:：]\s*/, "").trim();
    if (/^https?:\/\//i.test(raw)) return raw;
  }
  return null;
}

async function mirrorToR2(sourceUrl: string, keySeed: string): Promise<string> {
  if (!r2Client || !r2Bucket || !r2Endpoint) throw new Error("R2 config is missing");
  const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);

  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || inferImageMime(sourceUrl);
  if (!contentType.startsWith("image/")) throw new Error(`not an image content-type: ${contentType}`);

  const arr = await res.arrayBuffer();
  const ext =
    sourceUrl.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i)?.[1]?.toLowerCase() ??
    (contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : contentType === "image/gif" ? "gif" : "jpg");
  const key = `seed/live-flyers/${Date.now()}-${safeSlug(keySeed)}.${ext}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: Buffer.from(arr),
      ContentType: contentType,
    })
  );

  return r2PublicBase
    ? `${r2PublicBase.replace(/\/$/, "")}/${key}`
    : `${r2Endpoint.replace(/\/$/, "")}/${r2Bucket}/${key}`;
}

async function mirrorWithFallback(sourceUrl: string, body: string, keySeed: string): Promise<string> {
  try {
    return await mirrorToR2(sourceUrl, keySeed);
  } catch (primaryErr) {
    const officialLink = extractOfficialLink(body);
    if (!officialLink) throw primaryErr;
    const ogImage = await findOgImageFromOfficialLink(officialLink);
    if (!ogImage) throw primaryErr;
    return await mirrorToR2(ogImage, `${keySeed}-og`);
  }
}

async function main() {
  const cs = process.env.DATABASE_URL;
  if (!cs) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  if (!r2Client || !r2Bucket || !r2Endpoint) {
    console.error("R2 config missing. Set R2_ENDPOINT, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: cs,
    ssl: cs.includes("neon") ? { rejectUnauthorized: false } : false,
  });

  const { rows } = await pool.query<ThreadRow>(
    "SELECT id, body FROM community_threads WHERE body ILIKE '%http%' ORDER BY id ASC"
  );

  let scanned = 0;
  let alreadyMirrored = 0;
  let updated = 0;
  let skippedNoFlyer = 0;
  let failed = 0;
  let uploadedUnique = 0;
  const mirrorCache = new Map<string, string>();

  for (const row of rows) {
    scanned++;
    const rawDirectiveFlyer = extractFlyerDirectiveRaw(row.body);
    const parsed = parseThreadBody(row.body);
    const flyer = (rawDirectiveFlyer ?? parsed.flyerImageUrl ?? "").trim();
    if (!flyer) {
      skippedNoFlyer++;
      continue;
    }
    if (!/^https?:\/\//i.test(flyer)) {
      skippedNoFlyer++;
      continue;
    }
    const recoveredFlyer = recoverBrokenThumUrl(flyer, row.body);
    if (isAlreadyMirrored(recoveredFlyer)) {
      alreadyMirrored++;
      continue;
    }

    try {
      let mirrored = mirrorCache.get(recoveredFlyer);
      if (!mirrored) {
        mirrored = await mirrorWithFallback(recoveredFlyer, row.body, `thread-${row.id}`);
        mirrorCache.set(recoveredFlyer, mirrored);
        uploadedUnique++;
      }
      const newBody = replaceFlyerDirective(row.body, mirrored);
      if (newBody !== row.body) {
        await pool.query("UPDATE community_threads SET body = $1 WHERE id = $2", [newBody, row.id]);
        updated++;
      }
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[thread:${row.id}] mirror failed for ${recoveredFlyer}: ${msg}`);
    }
  }

  console.log("Flyer mirror complete.");
  console.log(`- scanned: ${scanned}`);
  console.log(`- updated threads: ${updated}`);
  console.log(`- already mirrored: ${alreadyMirrored}`);
  console.log(`- skipped (no valid flyer): ${skippedNoFlyer}`);
  console.log(`- upload failures: ${failed}`);
  console.log(`- unique uploads: ${uploadedUnique}`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
