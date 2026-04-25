/**
 * Fetches public RSS feeds skewed toward festivals & live shows, then inserts community threads
 * only when a real flyer image URL can be taken from the feed (media:thumbnail or <img> in HTML).
 * Matches the LIVE ANNOUNCEMENTS hub filter (body must parse to a flyer image).
 *
 * Run: npx tsx scripts/seed-official-live-feed.ts  (requires DATABASE_URL)
 *
 * Re-run safe: deletes rows whose body contains OFFICIAL_LIVE_AGGREGATOR_V3.
 */
import "dotenv/config";
import { Pool } from "pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { OFFICIAL_ANNOUNCEMENT_SOURCES_V3, type AnnouncementSource } from "./announcement-registry";
import { buildAnnouncementDedupKey, evaluateAnnouncementFields } from "./announcement-quality";
import { findArtistGenres, findVenueHints } from "./announcement-dictionaries";

const BODY_MARKER = "OFFICIAL_LIVE_AGGREGATOR_V3";

/** Headline / blurb must look like a venue, festival, tour, or ticketed live show — not streaming product news. */
const VENUE_OR_FESTIVAL =
  /\b(festival|fests?\b|open[\s-]*air|outdoor|line-?up|headliner|main\s+stage|campground|live\s*house|music\s+venue|arena|stadium|club\s+tour|concert|gig|tour\b|tour\s+dates|on\s+tour|support\s+act|opening\s+act|tickets?\s+(?:on\s+)?sale|presale|festival\s+pass|weekend\s+pass|day\s+pass|lineup|field\s+day|warehouse|reggae|dub|dancehall|sound\s*system|riddim|roots)\b/i;

const EXCLUDE_BLOB = /\b(podcast\s+series|netflix|video\s+game|movie\s+trailer|iphone|ceo|earnings|streaming\s+only)\b/i;
const LIVE_INTENT = /\b(lineup|line-?up|tickets?\s+(?:on\s+)?sale|presale|tour\s+dates|on\s+tour|announc(?:e|es|ed)|festival|concert|gig|live\s+at|venue|stage|show\s+at|returns?\s+to)\b/i;
const NON_EVENT_BLOB = /\b(review|interview|opinion|editorial|tracklist|album\s+review|song\s+review|best\s+songs|new\s+single|new\s+album|lyrics|music\s+video|video\s+premiere)\b/i;
const LOOSE_DATE_HINT = /\b(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;

const SOURCES = OFFICIAL_ANNOUNCEMENT_SOURCES_V3;
const DEFAULT_CITY_MAX_INSERT = 6;
const MAX_INSERT_PER_SOURCE = 3;
const CITY_MAX_INSERT: Record<string, number> = {
  Tokyo: 6,
  Osaka: 6,
  London: 6,
  Berlin: 6,
  "New York": 6,
  "Los Angeles": 6,
  Paris: 6,
  Amsterdam: 6,
  Riyadh: 6,
  Dubai: 6,
  Cairo: 6,
  Amman: 6,
  "Koh Phangan": 6,
  Bangkok: 6,
  Sydney: 6,
  Melbourne: 6,
  Camboriu: 6,
  "Sao Paulo": 6,
  Pratigi: 6,
  Ibiza: 6,
  Fraga: 6,
  Toronto: 6,
  Montreal: 6,
  Vancouver: 6,
  Bristol: 6,
  Miami: 6,
  Chicago: 6,
  Kingston: 6,
  "Montego Bay": 6,
};
const EVENT_TYPE_MAX_INSERT: Record<string, number> = {
  club: 12,
  livehouse: 12,
  outdoor: 12,
  beach: 12,
  forest: 12,
  desert: 12,
  festival: 12,
};

type ParsedItem = { title: string; link: string; blurb: string; imageUrl: string | null; pubDate: string | null };
type PickDiagnostics = {
  total: number;
  onTopic: number;
  hasImage: number;
  passedFieldCheck: number;
  dedupDropped: number;
  picked: number;
  reasons: Record<string, number>;
};

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function safeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "flyer";
}

function stripTags(html: string): string {
  return decodeXml(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractFirst(regex: RegExp, text: string): string | null {
  const m = text.match(regex);
  return m?.[1]?.trim() ? decodeXml(m[1].trim()) : null;
}

function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, "https://");
}

/** First <img src> URLs from HTML (description / content). */
function extractImgSrcsFromHtml(html: string): string[] {
  const out: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const u = decodeXml(m[1].trim());
    if (u) out.push(u);
  }
  return out;
}

/**
 * Real image URL suitable as FLYER_IMAGE (reject favicons, trackers, tiny assets).
 */
function usableFlyerUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) return null;
  u = toHttps(u);
  const low = u.toLowerCase();
  if (/\b(favicon|\/icons?\/|pixel\.|1x1|spacer|blank\.|transparent\.|gravatar\.com\/avatar|avatar|headshot|portrait|artist-photo|press-shot|logo)\b/i.test(low)) {
    return null;
  }
  const looksImage =
    /\.(jpe?g|png|webp|gif)(\?|$|\/)/i.test(low) ||
    /\/wp-content\/uploads\//i.test(low) ||
    /wp\.com\//i.test(low) ||
    /cloudinary\.com/i.test(low) ||
    /blogger\.googleusercontent\.com/i.test(low) ||
    /cdn\.|images\.|i\.imgur\.com/i.test(low);
  if (!looksImage) return null;
  if (!/\b(flyer|poster|lineup|event|festival|tour|tickets?|bill)\b/i.test(low)) return null;
  return u;
}

function usableOfficialImageUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) return null;
  u = toHttps(u);
  const low = u.toLowerCase();
  if (/\b(favicon|\/icons?\/|pixel\.|1x1|spacer|blank\.|transparent\.|gravatar\.com\/avatar|avatar|logo)\b/i.test(low)) {
    return null;
  }
  const looksImage =
    /\.(jpe?g|png|webp|gif)(\?|$|\/)/i.test(low) ||
    /\/wp-content\/uploads\//i.test(low) ||
    /wp\.com\//i.test(low) ||
    /cloudinary\.com/i.test(low) ||
    /blogger\.googleusercontent\.com/i.test(low) ||
    /cdn\.|images\.|i\.imgur\.com/i.test(low);
  return looksImage ? u : null;
}

function pickFlyerFromItem(block: string, descRaw: string): string | null {
  const thumb =
    extractFirst(/<media:thumbnail[^>]+url="([^"]+)"/i, block) ??
    extractFirst(/<media:thumbnail[^>]+url='([^']+)'/i, block) ??
    extractFirst(/<media:content[^>]+url="([^"]+)"/i, block) ??
    extractFirst(/<media:content[^>]+url='([^']+)'/i, block) ??
    extractFirst(/<enclosure[^>]+url="([^"]+)"/i, block) ??
    extractFirst(/<enclosure[^>]+url='([^']+)'/i, block) ??
    extractFirst(/url="([^"]+)"[^>]*medium="image"/i, block);
  const fromThumb = usableFlyerUrl(thumb ? toHttps(thumb) : null);
  if (fromThumb) return fromThumb;
  for (const src of extractImgSrcsFromHtml(descRaw)) {
    const ok = usableFlyerUrl(toHttps(src));
    if (ok) return ok;
  }
  return null;
}

function extractJsonLdItems(html: string, baseUrl: string): ParsedItem[] {
  const out: ParsedItem[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = (m[1] ?? "").trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const nodes = Array.isArray(parsed) ? parsed : [parsed];
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const rec = node as Record<string, unknown>;
      const type = String(rec["@type"] ?? "").toLowerCase();
      if (type !== "event") continue;
      const name = typeof rec.name === "string" ? rec.name.trim() : "";
      if (!name) continue;
      const eventUrl = typeof rec.url === "string" ? rec.url : null;
      const link = eventUrl ? absolutizeLink(baseUrl, eventUrl) : baseUrl;
      if (!link) continue;
      const desc = typeof rec.description === "string" ? rec.description : "";
      const startDate = typeof rec.startDate === "string" ? rec.startDate : null;
      const location =
        rec.location && typeof rec.location === "object"
          ? (rec.location as Record<string, unknown>)
          : null;
      const venueName = typeof location?.name === "string" ? location.name : "";
      const offers = rec.offers;
      const offersBlob =
        typeof offers === "string"
          ? offers
          : offers && typeof offers === "object"
            ? JSON.stringify(offers)
            : "";
      const imageRaw =
        typeof rec.image === "string"
          ? rec.image
          : Array.isArray(rec.image)
            ? String(rec.image[0] ?? "")
            : null;
      const imageUrl = usableOfficialImageUrl(imageRaw ? absolutizeLink(baseUrl, imageRaw) : null);
      const blurb = stripTags(`${desc} ${venueName} ${offersBlob}`).slice(0, 400);
      out.push({ title: name, link, blurb, imageUrl, pubDate: startDate });
    }
  }
  return out;
}

function extractMetaContent(html: string, key: "property" | "name", value: string): string | null {
  const re = new RegExp(
    `<meta[^>]+${key}=["']${value}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+${key}=["']${value}["'][^>]*>`,
    "i",
  );
  const m = html.match(re);
  const raw = m?.[1] ?? m?.[2] ?? null;
  return raw ? decodeXml(raw.trim()) : null;
}

function pickImageFromDetailPage(html: string, pageUrl: string): string | null {
  const og =
    extractMetaContent(html, "property", "og:image") ??
    extractMetaContent(html, "name", "og:image") ??
    extractMetaContent(html, "name", "twitter:image");
  const ogAbs = og ? absolutizeLink(pageUrl, og) : null;
  const fromOg = usableOfficialImageUrl(ogAbs);
  if (fromOg) return fromOg;
  const fromJsonLd = extractJsonLdItems(html, pageUrl);
  for (const it of fromJsonLd) {
    const ok = usableOfficialImageUrl(it.imageUrl);
    if (ok) return ok;
  }
  return null;
}

function extractDateHintFromDetail(html: string): string | null {
  const timeDatetime = extractFirst(/<time[^>]+datetime=["']([^"']+)["']/i, html);
  if (timeDatetime) return stripTags(timeDatetime).slice(0, 32);
  const text = stripTags(html).slice(0, 12000);
  const monthDate = text.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?\b/i)?.[0] ?? null;
  if (monthDate) return monthDate;
  const numeric = text.match(/\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b|\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/)?.[0] ?? null;
  return numeric;
}

function extractTicketHintFromDetail(html: string): string | null {
  const ticketLink = extractFirst(
    /<a[^>]+href=["']([^"']*(?:ticket|tickets|buy|rsvp|admission|entry)[^"']*)["'][^>]*>/i,
    html,
  );
  if (ticketLink) return `Tickets: ${ticketLink}`;
  const text = stripTags(html).slice(0, 16000);
  if (/\b(ticket|tickets|buy now|rsvp|admission|entry)\b/i.test(text)) return "Tickets available";
  return null;
}

function extractLineupHintFromDetail(html: string): string | null {
  const hLike = extractFirst(
    /<(?:h1|h2|h3|strong|b)[^>]*>([^<]*(?:lineup|line-?up|feat\.?|featuring|with|b2b|dj)[^<]*)<\/(?:h1|h2|h3|strong|b)>/i,
    html,
  );
  if (hLike) return `Lineup: ${stripTags(hLike).slice(0, 160)}`;
  const text = stripTags(html).slice(0, 16000);
  const lineupText =
    text.match(/\b(?:lineup|line-?up)\b[:\s-]*([a-z0-9&,'\-\s]{4,120})/i)?.[0] ??
    text.match(/\b(?:feat\.?|featuring|with|b2b)\b[:\s-]*([a-z0-9&,'\-\s]{4,120})/i)?.[0] ??
    null;
  return lineupText ? `Lineup: ${lineupText.slice(0, 160)}` : null;
}

function enrichBlurbWithDetailSignals(blurb: string, dateHint: string | null, lineupHint: string | null, ticketHint: string | null): string {
  const chunks = [blurb.trim()];
  if (dateHint) chunks.push(`Event date ${dateHint}`);
  if (lineupHint) chunks.push(lineupHint);
  if (ticketHint) chunks.push(ticketHint);
  return chunks.filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 400);
}

function parseRss2Items(xml: string): ParsedItem[] {
  const out: ParsedItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const titleRaw = extractFirst(/<title>([\s\S]*?)<\/title>/i, block);
    if (!titleRaw) continue;
    const title = stripTags(titleRaw);
    const link = extractFirst(/<link>([\s\S]*?)<\/link>/i, block);
    if (!link) continue;
    const descriptionRaw = extractFirst(/<description>([\s\S]*?)<\/description>/i, block) ?? "";
    const contentRaw = extractFirst(/<content:encoded>([\s\S]*?)<\/content:encoded>/i, block) ?? "";
    const pubDate = extractFirst(/<pubDate>([\s\S]*?)<\/pubDate>/i, block);
    const blurb = stripTags(`${descriptionRaw} ${contentRaw}`).slice(0, 400);
    const imageUrl = pickFlyerFromItem(block, `${descriptionRaw}\n${contentRaw}`);
    out.push({ title, link, blurb, imageUrl, pubDate });
  }
  return out;
}

function absolutizeLink(baseUrl: string, maybeLink: string): string | null {
  const t = maybeLink.trim();
  if (!t) return null;
  try {
    return new URL(t, baseUrl).toString();
  } catch {
    return null;
  }
}

function parseHtmlItems(html: string, baseUrl: string): ParsedItem[] {
  const fromJsonLd = extractJsonLdItems(html, baseUrl);
  if (fromJsonLd.length) return fromJsonLd;
  const out: ParsedItem[] = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const link = absolutizeLink(baseUrl, decodeXml(m[1] ?? ""));
    if (!link) continue;
    const title = stripTags(m[2] ?? "").replace(/\s+/g, " ").trim();
    if (!title || title.length < 6) continue;
    const ctx = html.slice(Math.max(0, m.index - 260), Math.min(html.length, m.index + 420));
    const blurb = stripTags(ctx).slice(0, 320);
    const imageUrl = pickFlyerFromItem(ctx, ctx);
    out.push({ title, link, blurb, imageUrl, pubDate: null });
    if (out.length >= 160) break;
  }
  return out;
}

function isVenueOrFestivalItem(item: ParsedItem): boolean {
  const blob = `${item.title} ${item.blurb}`.toLowerCase();
  if (EXCLUDE_BLOB.test(blob)) return false;
  if (NON_EVENT_BLOB.test(blob)) return false;
  return VENUE_OR_FESTIVAL.test(blob) && LIVE_INTENT.test(blob);
}

function isLikelyOfficialEvent(item: ParsedItem, src: AnnouncementSource): boolean {
  if (src.sourcePriority !== 1) return isVenueOrFestivalItem(item);
  const blob = `${item.title} ${item.blurb}`.toLowerCase();
  if (EXCLUDE_BLOB.test(blob)) return false;
  if (NON_EVENT_BLOB.test(blob)) return false;
  if (isVenueOrFestivalItem(item)) return true;
  return (
    LIVE_INTENT.test(blob) ||
    LOOSE_DATE_HINT.test(blob) ||
    /\b(event|party|tickets?)\b/i.test(item.title) ||
    /\b(event|ticket|lineup|show)\b/i.test(item.link)
  );
}

function inferGenreKey(text: string): string {
  const s = text.toLowerCase();
  if (/\b(reggae|dub|dancehall|riddim|roots|sound\s*system|soundclash|ska)\b/.test(s)) return "reggae";
  if (/\b(edm|techno|house|trance|dubstep|dnb|drum\s*&\s*bass|jungle)\b/.test(s)) return "edm";
  if (/\b(hip[\s-]?hop|rap|trap)\b/.test(s)) return "hiphop";
  if (/\b(jazz|bebop|swing)\b/.test(s)) return "jazz";
  if (/\b(metal|deathcore|black\s+metal|thrash)\b/.test(s)) return "metal";
  if (/\b(punk|hardcore)\b/.test(s)) return "punk";
  if (/\b(classical|orchestra|symphony)\b/.test(s)) return "classical";
  if (/\b(indie|shoegaze|alternative)\b/.test(s)) return "indie";
  if (/\b(pop|j-?pop)\b/.test(s)) return "pop";
  if (/\b(rock|grunge)\b/.test(s)) return "rock";
  const artistGenres = findArtistGenres(s);
  if (artistGenres.includes("reggae")) return "reggae";
  if (artistGenres.includes("edm")) return "edm";
  if (artistGenres.includes("hiphop")) return "hiphop";
  if (artistGenres.includes("jazz")) return "jazz";
  if (artistGenres.includes("rock")) return "rock";
  return "default";
}

function inferEventType(text: string): keyof typeof EVENT_TYPE_MAX_INSERT {
  const s = text.toLowerCase();
  if (/\b(beach|island|coast)\b/.test(s)) return "beach";
  if (/\b(forest|jungle)\b/.test(s)) return "forest";
  if (/\b(desert)\b/.test(s)) return "desert";
  if (/\b(outdoor|open\s*air)\b/.test(s)) return "outdoor";
  if (/\b(festival|gathering)\b/.test(s)) return "festival";
  if (/\b(live\s*house|hall|theater|theatre|music\s*exchange)\b/.test(s)) return "livehouse";
  return "club";
}

function normalizeCommunityGenre(category: string | null | undefined, name: string): string {
  return inferGenreKey(`${category ?? ""} ${name}`);
}

/** Only items with flyer + on-topic + required fields; max 10 per source. */
function pickUpToTenWithFlyer(items: ParsedItem[], src: AnnouncementSource): { picked: ParsedItem[]; diag: PickDiagnostics } {
  const seen = new Set<string>();
  const seenDedup = new Set<string>();
  const pickImage = src.sourcePriority === 1 ? usableOfficialImageUrl : usableFlyerUrl;
  const diag: PickDiagnostics = {
    total: items.length,
    onTopic: 0,
    hasImage: 0,
    passedFieldCheck: 0,
    dedupDropped: 0,
    picked: 0,
    reasons: {},
  };
  const pool = items.filter((i) => {
    const okTopic = isLikelyOfficialEvent(i, src);
    if (okTopic) diag.onTopic++;
    const okImage = Boolean(pickImage(i.imageUrl));
    if (okTopic && okImage) diag.hasImage++;
    return okTopic && okImage;
  });
  const out: ParsedItem[] = [];
  for (const i of pool) {
    const flyer = pickImage(i.imageUrl)!;
    if (seen.has(i.link)) continue;
    const check = evaluateAnnouncementFields({
      title: i.title,
      blurb: i.blurb,
      link: i.link,
      pubDate: i.pubDate,
      venueHint:
        src.venueName ??
        findVenueHints(`${i.title} ${i.blurb}`)[0] ??
        (src.sourcePriority <= 2 ? src.label : null),
    });
    if (!check.pass || !check.eventDate || !check.venue) {
      for (const r of check.reasons) {
        diag.reasons[r] = (diag.reasons[r] ?? 0) + 1;
      }
      continue;
    }
    diag.passedFieldCheck++;
    const dedupKey = buildAnnouncementDedupKey({
      eventDate: check.eventDate,
      venue: check.venue,
      title: i.title,
    });
    if (seenDedup.has(dedupKey)) {
      diag.dedupDropped++;
      continue;
    }
    seenDedup.add(dedupKey);
    seen.add(i.link);
    out.push({ ...i, imageUrl: flyer });
    if (out.length >= 10) break;
  }
  diag.picked = out.length;
  return { picked: out, diag };
}

function buildBody(sourceLabel: string, item: ParsedItem): string {
  const flyer = usableOfficialImageUrl(item.imageUrl) ?? usableFlyerUrl(item.imageUrl);
  if (!flyer) throw new Error("buildBody requires a flyer URL");
  return [
    `FLYER_IMAGE: ${flyer}`,
    BODY_MARKER,
    `Source: ${sourceLabel} (public RSS; image from feed)`,
    `Official link: ${item.link}`,
    "",
    stripTags(item.blurb || item.title).slice(0, 600),
    "",
    "Live house & festival radar — flyer image required for this hub.",
  ].join("\n");
}

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

function inferImageMime(url: string): string {
  const low = url.toLowerCase();
  if (low.includes(".png")) return "image/png";
  if (low.includes(".webp")) return "image/webp";
  if (low.includes(".gif")) return "image/gif";
  return "image/jpeg";
}

async function mirrorFlyerToR2(sourceUrl: string, title: string): Promise<string> {
  if (!r2Client || !r2Bucket || !r2Endpoint) {
    throw new Error("R2 not configured for flyer mirroring");
  }
  if (sourceUrl.length > 1900) {
    throw new Error("Flyer URL too long to mirror safely");
  }
  const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Failed flyer download: HTTP ${res.status}`);
  const arr = await res.arrayBuffer();
  const ext =
    sourceUrl.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i)?.[1]?.toLowerCase() ??
    (inferImageMime(sourceUrl) === "image/png" ? "png" : "jpg");
  const key = `seed/live-flyers/${Date.now()}-${safeSlug(title)}.${ext}`;
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || inferImageMime(sourceUrl);
  await r2Client.send(
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: Buffer.from(arr),
      ContentType: contentType,
    }),
  );
  return r2PublicBase
    ? `${r2PublicBase.replace(/\/$/, "")}/${key}`
    : `${r2Endpoint.replace(/\/$/, "")}/${r2Bucket}/${key}`;
}

async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "RawStockOfficialLiveAggregator/3.0 (+https://rawstock.uk)" },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

async function enrichItemsWithDetailImages(items: ParsedItem[]): Promise<ParsedItem[]> {
  const out: ParsedItem[] = [];
  let checked = 0;
  for (const item of items) {
    if (checked >= 25) {
      out.push(item);
      continue;
    }
    checked++;
    try {
      const html = await fetchXml(item.link);
      const detailImage = pickImageFromDetailPage(html, item.link);
      const dateHint = extractDateHintFromDetail(html);
      const lineupHint = extractLineupHintFromDetail(html);
      const ticketHint = extractTicketHintFromDetail(html);
      out.push({
        ...item,
        imageUrl: detailImage ?? item.imageUrl,
        pubDate: item.pubDate ?? dateHint ?? null,
        blurb: enrichBlurbWithDetailSignals(item.blurb, dateHint, lineupHint, ticketHint),
      });
    } catch {
      out.push(item);
    }
  }
  return out;
}

async function main() {
  const cs = process.env.DATABASE_URL;
  if (!cs) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: cs,
    ssl: cs.includes("neon") ? { rejectUnauthorized: false } : false,
  });

  const { rows: users } = await pool.query<{ id: number }>("SELECT id FROM users ORDER BY id ASC LIMIT 1");
  const { rows: comms } = await pool.query<{ id: number; name: string; category: string | null; is_official: boolean | null; members: number | null }>(
    "SELECT id, name, category, is_official, members FROM communities ORDER BY COALESCE(is_official,false) DESC, COALESCE(members,0) DESC, id ASC",
  );
  if (!users.length) {
    console.error("No users in database — run seed or create a user first.");
    await pool.end();
    process.exit(1);
  }
  if (!comms.length) {
    console.error("No communities — run seed first.");
    await pool.end();
    process.exit(1);
  }

  const authorId = users[0].id;
  const seedable = comms.filter((c) => c.is_official || /music|live|festival|reggae|dub|edm|rock|hip\s*hop|jazz|pop/i.test(`${c.name} ${c.category ?? ""}`));
  const communityByGenre = new Map<string, number[]>();
  for (const c of (seedable.length ? seedable : comms)) {
    const g = normalizeCommunityGenre(c.category, c.name);
    const arr = communityByGenre.get(g) ?? [];
    arr.push(c.id);
    communityByGenre.set(g, arr);
  }
  const fallbackIds = (seedable.length ? seedable : comms).map((c) => c.id);

  const del = await pool.query(
    `DELETE FROM community_threads WHERE body LIKE '%OFFICIAL_LIVE_AGGREGATOR_%'`,
  );
  console.log(`Removed ${del.rowCount ?? 0} previous aggregator threads (OFFICIAL_LIVE_AGGREGATOR_*).`);

  let inserted = 0;
  let mirroredFlyers = 0;
  let ci = 0;
  const perGenreIndex = new Map<string, number>();
  const perCityInserted = new Map<string, number>();
  const perTypeInserted = new Map<keyof typeof EVENT_TYPE_MAX_INSERT, number>();
  const mirrorCache = new Map<string, string>();

  for (const src of SOURCES) {
    let items: ParsedItem[] = [];
    try {
      if (src.rssUrl) {
        const xml = await fetchXml(src.rssUrl);
        items = parseRss2Items(xml);
      } else {
        const html = await fetchXml(src.officialCalendarUrl);
        items = parseHtmlItems(html, src.officialCalendarUrl);
        items = await enrichItemsWithDetailImages(items);
      }
    } catch (e) {
      console.warn(`[${src.key}] fetch/parse failed:`, e instanceof Error ? e.message : e);
    }

    const { picked, diag } = pickUpToTenWithFlyer(items, src);
    console.log(
      `[${src.key}] ${picked.length} threads (priority ${src.sourcePriority}; fields: date+venue+lineup+ticket).`,
    );
    console.log(
      `[${src.key}] diag total=${diag.total} onTopic=${diag.onTopic} withImage=${diag.hasImage} fieldPass=${diag.passedFieldCheck} dedupDrop=${diag.dedupDropped} reasons=${JSON.stringify(diag.reasons)}`,
    );

    let sourceInserted = 0;
    for (const item of picked) {
      if (sourceInserted >= MAX_INSERT_PER_SOURCE) break;
      const cityCap = CITY_MAX_INSERT[src.city] ?? DEFAULT_CITY_MAX_INSERT;
      const cityUsed = perCityInserted.get(src.city) ?? 0;
      if (cityUsed >= cityCap) continue;
      const eventType = inferEventType(`${src.label} ${item.title} ${item.blurb}`);
      const typeUsed = perTypeInserted.get(eventType) ?? 0;
      const typeCap = EVENT_TYPE_MAX_INSERT[eventType];
      if (typeUsed >= typeCap) continue;
      const prefix = `[${src.label}] `;
      const rawTitle = item.title.replace(/\s+/g, " ").trim();
      const title = (prefix + rawTitle).slice(0, 220);
      let finalImageUrl = item.imageUrl;
      const originalFlyer = usableOfficialImageUrl(item.imageUrl) ?? usableFlyerUrl(item.imageUrl);
      if (originalFlyer) {
        const cached = mirrorCache.get(originalFlyer);
        if (cached) {
          finalImageUrl = cached;
        } else {
          try {
            const mirrored = await mirrorFlyerToR2(originalFlyer, title);
            finalImageUrl = mirrored;
            mirrorCache.set(originalFlyer, mirrored);
            mirroredFlyers++;
          } catch (e) {
            console.warn(`[${src.key}] flyer mirror failed; fallback to source URL:`, e instanceof Error ? e.message : e);
          }
        }
      }
      const body = buildBody(src.label, { ...item, imageUrl: finalImageUrl });
      const genre = inferGenreKey(`${item.title} ${item.blurb}`);
      const bucket = communityByGenre.get(genre) ?? communityByGenre.get("default") ?? fallbackIds;
      const idx = perGenreIndex.get(genre) ?? 0;
      const communityId = bucket[idx % bucket.length] ?? fallbackIds[ci % fallbackIds.length];
      perGenreIndex.set(genre, idx + 1);
      ci++;

      await pool.query(
        `INSERT INTO community_threads (community_id, author_user_id, title, body, pinned)
         VALUES ($1, $2, $3, $4, false)`,
        [communityId, authorId, title, body],
      );
      inserted++;
      sourceInserted++;
      perCityInserted.set(src.city, (perCityInserted.get(src.city) ?? 0) + 1);
      perTypeInserted.set(eventType, (perTypeInserted.get(eventType) ?? 0) + 1);
    }
  }

  console.log(`Done. Inserted ${inserted} threads (flyer image required, venue/festival-focused).`);
  console.log(`Mirrored ${mirroredFlyers} flyers to R2.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
