import "dotenv/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Pool } from "pg";
import { STATIONS } from "../constants/stations";
import { OFFICIAL_ANNOUNCEMENT_SOURCES_V3, type AnnouncementSource } from "./announcement-registry";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon") ? { rejectUnauthorized: false } : false,
});

const BODY_MARKER = "STATION_LIVE_OFFICIAL_FLYER_V1";
const MAX_STATION_ANNOUNCEMENTS = STATIONS.length;
const SOURCE_LIMIT = 24;
const DETAIL_LIMIT_PER_SOURCE = 10;

type HarvestedFlyer = {
  title: string;
  sourceLabel: string;
  city: string;
  venue: string;
  link: string;
  imageUrl: string;
  blurb: string;
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

function decodeHtml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, " "));
}

function absoluteUrl(raw: string, baseUrl: string): string | null {
  let s = decodeHtml(raw).trim();
  if (!s || /^(data:|javascript:|mailto:|tel:)/i.test(s)) return null;
  const firstHttp = s.search(/https?:\/\//i);
  if (firstHttp >= 0) {
    s = s.slice(firstHttp).split(/\s+/)[0];
  } else {
    s = s.split(/\s+/)[0];
  }
  if (!s || /https?:\/\/.*https?:\/\//i.test(s) || /%20https?:/i.test(s) || s.length > 1900) return null;
  try {
    return new URL(s, baseUrl).toString().replace(/^http:\/\//i, "https://");
  } catch {
    return null;
  }
}

function firstMatch(re: RegExp, text: string): string | null {
  const m = text.match(re);
  return m?.[1]?.trim() ? decodeHtml(m[1]) : null;
}

function safeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "station-flyer";
}

function inferImageMime(url: string): string {
  const low = url.toLowerCase();
  if (low.includes(".png")) return "image/png";
  if (low.includes(".webp")) return "image/webp";
  if (low.includes(".gif")) return "image/gif";
  return "image/jpeg";
}

function pickSrcsetCandidate(srcset: string, baseUrl: string): string | null {
  const candidates = srcset
    .split(",")
    .map((part) => {
      const [rawUrl, rawWidth] = part.trim().split(/\s+/, 2);
      const width = Number(rawWidth?.replace(/[^\d]/g, "") || 0);
      const url = rawUrl ? absoluteUrl(rawUrl, baseUrl) : null;
      return url ? { url, width } : null;
    })
    .filter(Boolean) as Array<{ url: string; width: number }>;
  candidates.sort((a, b) => b.width - a.width);
  return candidates[0]?.url ?? null;
}

function imageScore(url: string, context: string): number {
  const low = `${url} ${context}`.toLowerCase();
  if (
    /\b(logo|icon|favicon|avatar|profile|portrait|headshot|press-shot|sponsor|banner-ad|ads?|pixel|spacer|blank|transparent)\b/.test(
      low,
    )
  ) {
    return -100;
  }
  if (!/\.(jpe?g|png|webp)(\?|$|\/)/i.test(url) && !/\b(image|img|cdn|uploads?|wp-content|cloudinary|pbs\.twimg)\b/i.test(url)) {
    return -10;
  }

  let score = 0;
  if (/\b(flyer|poster|lineup|bill|event|events|festival|tour|ticket|tickets|show|live|schedule)\b/i.test(low)) score += 8;
  if (/\b(og:image|twitter:image|schema:image)\b/i.test(context)) score += 4;
  if (/\b(wp-content\/uploads|uploads?|event|events|schedule)\b/i.test(url)) score += 3;
  if (/\b\d{3,4}x\d{3,4}\b/.test(low)) score += 2;
  return score;
}

function collectImageCandidates(html: string, baseUrl: string): Array<{ url: string; score: number }> {
  const candidates: Array<{ url: string; score: number }> = [];
  const push = (raw: string | null | undefined, context: string) => {
    if (!raw) return;
    const url = absoluteUrl(raw, baseUrl);
    if (!url) return;
    candidates.push({ url, score: imageScore(url, context) });
  };

  for (const re of [
    /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]*>/gi,
    /<meta[^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]*>/gi,
  ]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) push(m[1], "og:image twitter:image");
  }

  const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonMatch: RegExpExecArray | null;
  while ((jsonMatch = jsonLdRe.exec(html))) {
    try {
      const parsed = JSON.parse(decodeHtml(jsonMatch[1]));
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        const image = (node as any)?.image;
        if (typeof image === "string") push(image, "schema:image event flyer");
        if (Array.isArray(image)) image.forEach((x) => typeof x === "string" && push(x, "schema:image event flyer"));
        if (typeof image?.url === "string") push(image.url, "schema:image event flyer");
      }
    } catch {
      // Ignore malformed JSON-LD.
    }
  }

  const imgRe = /<img\b([^>]+)>/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgRe.exec(html))) {
    const attrs = imgMatch[1] ?? "";
    const context = stripTags(attrs);
    const srcset = firstMatch(/\bsrcset=["']([^"']+)["']/i, attrs);
    const src = firstMatch(/\b(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i, attrs);
    push(srcset ? pickSrcsetCandidate(srcset, baseUrl) : src, context);
  }

  const bestByUrl = new Map<string, number>();
  for (const c of candidates) {
    bestByUrl.set(c.url, Math.max(bestByUrl.get(c.url) ?? -100, c.score));
  }
  return [...bestByUrl.entries()]
    .map(([url, score]) => ({ url, score }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
}

function collectLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /<a\b[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = absoluteUrl(m[1], baseUrl);
    if (!href || seen.has(href)) continue;
    const u = new URL(href);
    if (u.hostname !== base.hostname) continue;
    const label = stripTags(m[2] ?? "");
    const blob = `${href} ${label}`.toLowerCase();
    if (!/\b(event|events|schedule|program|show|live|concert|ticket|party|gig|club|festival|lineup)\b/.test(blob)) continue;
    const path = u.pathname.toLowerCase();
    if (/\/(?:events?|schedule|program)\/?$/.test(path)) continue;
    if (/\/event\/20\d{2}\/\d{1,2}\/?$/.test(path)) continue;
    const looksSpecific =
      /\/20\d{2}\/\d{1,2}\/\d{1,2}\//.test(path) ||
      /\/(?:event|events|program|show|schedule)\/[^/?#]{4,}/.test(path) ||
      (label.length >= 12 && /\b(live|ticket|club|festival|tour|party|show|concert|lineup)\b/i.test(label));
    if (!looksSpecific) continue;
    seen.add(href);
    out.push(href);
    if (out.length >= DETAIL_LIMIT_PER_SOURCE) break;
  }
  return out;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "RawStockStationFlyerSeeder/1.0 (+https://rawstock.live)" },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function parseRssItems(xml: string, baseUrl: string): HarvestedFlyer[] {
  const items: HarvestedFlyer[] = [];
  const itemRe = /<item\b[\s\S]*?<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const block = m[0];
    const title = stripTags(firstMatch(/<title[^>]*>([\s\S]*?)<\/title>/i, block) ?? "Live announcement");
    const link = absoluteUrl(firstMatch(/<link[^>]*>([\s\S]*?)<\/link>/i, block) ?? baseUrl, baseUrl) ?? baseUrl;
    const desc = firstMatch(/<description[^>]*>([\s\S]*?)<\/description>/i, block) ?? "";
    const media =
      firstMatch(/<media:content[^>]+url=["']([^"']+)["']/i, block) ??
      firstMatch(/<media:thumbnail[^>]+url=["']([^"']+)["']/i, block) ??
      firstMatch(/<enclosure[^>]+url=["']([^"']+)["']/i, block);
    const candidates = collectImageCandidates(desc, link);
    if (media) candidates.unshift({ url: absoluteUrl(media, link) ?? media, score: imageScore(media, "rss media event flyer") });
    const imageUrl = candidates.find((c) => c.score >= 4)?.url;
    if (imageUrl) {
      items.push({ title, link, imageUrl, blurb: stripTags(desc), sourceLabel: "", city: "", venue: "" });
    }
  }
  return items;
}

function pageTitle(html: string): string {
  return (
    stripTags(firstMatch(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i, html) ?? "") ||
    stripTags(firstMatch(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html) ?? "") ||
    stripTags(firstMatch(/<title[^>]*>([\s\S]*?)<\/title>/i, html) ?? "Live announcement")
  );
}

async function harvestFromSource(src: AnnouncementSource): Promise<HarvestedFlyer[]> {
  const out: HarvestedFlyer[] = [];
  if (src.rssUrl) {
    const xml = await fetchText(src.rssUrl);
    out.push(...parseRssItems(xml, src.officialCalendarUrl));
  }

  const listingHtml = await fetchText(src.officialCalendarUrl);
  const detailLinks = collectLinks(listingHtml, src.officialCalendarUrl);

  for (const link of detailLinks) {
    try {
      const html = await fetchText(link);
      const candidates = collectImageCandidates(html, link);
      const imageUrl = candidates.find((c) => c.score >= 4)?.url;
      if (!imageUrl) continue;
      out.push({
        title: pageTitle(html),
        link,
        imageUrl,
        blurb: stripTags(firstMatch(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i, html) ?? ""),
        sourceLabel: "",
        city: "",
        venue: "",
      });
    } catch {
      // Some venues block detail pages. Keep harvesting the next source.
    }
  }

  const seen = new Set<string>();
  return out
    .map((item) => ({
      ...item,
      sourceLabel: src.label,
      city: src.city,
      venue: src.venueName ?? src.label,
    }))
    .filter((item) => {
      if (seen.has(item.imageUrl)) return false;
      seen.add(item.imageUrl);
      return true;
    });
}

async function mirrorFlyerToR2(sourceUrl: string, title: string): Promise<string> {
  if (!r2Client || !r2Bucket || !r2PublicBase) return sourceUrl;
  const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Failed flyer download: HTTP ${res.status}`);
  const arr = await res.arrayBuffer();
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || inferImageMime(sourceUrl);
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const key = `seed/station-flyers/${Date.now()}-${safeSlug(title)}.${ext}`;
  await r2Client.send(
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: Buffer.from(arr),
      ContentType: contentType,
    }),
  );
  return `${r2PublicBase.replace(/\/$/, "")}/${key}`;
}

function buildBody(item: HarvestedFlyer, finalImageUrl: string) {
  return [
    `FLYER_IMAGE: ${finalImageUrl}`,
    `FLYER_IMAGE_ORIGINAL: ${item.imageUrl}`,
    BODY_MARKER,
    `Source: ${item.sourceLabel} (official event page image)`,
    `City: ${item.city}`,
    `Venue: ${item.venue}`,
    `Official link: ${item.link}`,
    "",
    item.blurb ? item.blurb.slice(0, 600) : item.title,
  ].join("\n");
}

async function main() {
  const client = await pool.connect();
  try {
    const harvested: HarvestedFlyer[] = [];
    for (const src of OFFICIAL_ANNOUNCEMENT_SOURCES_V3.slice(0, SOURCE_LIMIT)) {
      try {
        const items = await harvestFromSource(src);
        console.log(`[${src.key}] harvested ${items.length} flyer candidates.`);
        harvested.push(...items);
      } catch (e) {
        console.warn(`[${src.key}] skipped:`, e instanceof Error ? e.message : e);
      }
      if (harvested.length >= MAX_STATION_ANNOUNCEMENTS * 2) break;
    }

    const unique = harvested.filter((item, index, arr) => arr.findIndex((x) => x.imageUrl === item.imageUrl) === index);
    if (unique.length < MAX_STATION_ANNOUNCEMENTS) {
      throw new Error(`Only found ${unique.length} official flyer candidates; refusing to seed generic photos.`);
    }

    await client.query("begin");
    await client.query("delete from announcements where type = 'station_live'");
    for (let i = 0; i < MAX_STATION_ANNOUNCEMENTS; i++) {
      const item = unique[i];
      const station = STATIONS[i % STATIONS.length];
      let finalImageUrl = item.imageUrl;
      try {
        finalImageUrl = await mirrorFlyerToR2(item.imageUrl, item.title);
      } catch (e) {
        console.warn(`Mirror failed for ${item.imageUrl}; using source URL:`, e instanceof Error ? e.message : e);
      }
      await client.query(
        `insert into announcements (title, body, type, is_pinned, start_at, end_at)
         values ($1, $2, 'station_live', $3, now(), null)`,
        [`${station.name}: ${item.title}`.slice(0, 220), buildBody(item, finalImageUrl), i === 0],
      );
    }
    await client.query("commit");
    console.log(`Seeded ${MAX_STATION_ANNOUNCEMENTS} Station live announcements with official flyer images.`);
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

