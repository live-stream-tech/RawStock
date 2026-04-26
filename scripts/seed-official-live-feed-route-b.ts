/**
 * Route B: different publishers than `seed-official-live-feed.ts` (OFFICIAL_LIVE_AGGREGATOR_V3).
 * Same rules: venue/festival-ish copy + usable flyer image from RSS (media / img in HTML).
 *
 * Run: npx tsx scripts/seed-official-live-feed-route-b.ts  (requires DATABASE_URL)
 *
 * Deletes only threads containing OFFICIAL_LIVE_HUB_ROUTE_B_V1 (does not touch V3 rows).
 */
import "dotenv/config";
import { Pool } from "pg";
import { OFFICIAL_ANNOUNCEMENT_SOURCES_ROUTE_B, type AnnouncementSource } from "./announcement-registry";
import { buildAnnouncementDedupKey, evaluateAnnouncementFields } from "./announcement-quality";
import { findArtistGenres, findVenueHints } from "./announcement-dictionaries";

const BODY_MARKER = "OFFICIAL_LIVE_HUB_ROUTE_B_V1";

const VENUE_OR_FESTIVAL =
  /\b(festival|fests?\b|open[\s-]*air|outdoor|line-?up|headliner|main\s+stage|campground|live\s*house|music\s+venue|arena|stadium|club\s+tour|concert|gig|tour\b|tour\s+dates|on\s+tour|support\s+act|opening\s+act|tickets?\s+(?:on\s+)?sale|presale|festival\s+pass|weekend\s+pass|day\s+pass|lineup|field\s+day|warehouse|reggae|dub|dancehall|sound\s*system|riddim|roots)\b/i;

const EXCLUDE_BLOB = /\b(podcast\s+series|netflix|video\s+game|movie\s+trailer|iphone|ceo|earnings|streaming\s+only)\b/i;
const LIVE_INTENT = /\b(lineup|line-?up|tickets?\s+(?:on\s+)?sale|presale|tour\s+dates|on\s+tour|announc(?:e|es|ed)|festival|concert|gig|live\s+at|venue|stage|show\s+at|returns?\s+to)\b/i;
const NON_EVENT_BLOB = /\b(review|interview|opinion|editorial|tracklist|album\s+review|song\s+review|best\s+songs|new\s+single|new\s+album|lyrics|music\s+video|video\s+premiere)\b/i;

/** Route B uses a subset registry mainly from trusted aggregators / scene media. */
const SOURCES = OFFICIAL_ANNOUNCEMENT_SOURCES_ROUTE_B;

type ParsedItem = { title: string; link: string; blurb: string; imageUrl: string | null; pubDate: string | null };

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

function normalizeSingleHttpUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  const firstHttp = s.search(/https?:\/\//i);
  if (firstHttp < 0) return null;
  let candidate = s.slice(firstHttp);
  const nextHttp = candidate.slice(8).search(/https?:\/\//i);
  if (nextHttp >= 0) {
    candidate = candidate.slice(0, nextHttp + 8);
  }
  return candidate.replace(/[)\],。．、"'<>]+$/g, "").trim();
}

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

function usableFlyerUrl(raw: string | null | undefined): string | null {
  const normalized = normalizeSingleHttpUrl(raw);
  if (!normalized) return null;
  let u = normalized;
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

/** Same as V3: accept venue/feed hero images without strict URL keyword heuristics. */
function usableOfficialImageUrl(raw: string | null | undefined): string | null {
  const normalized = normalizeSingleHttpUrl(raw);
  if (!normalized) return null;
  let u = normalized;
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

function pickFeedImageUrl(raw: string | null | undefined): string | null {
  return usableFlyerUrl(raw) ?? usableOfficialImageUrl(raw);
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
  const fromThumb = pickFeedImageUrl(thumb ? toHttps(thumb) : null);
  if (fromThumb) return fromThumb;
  for (const src of extractImgSrcsFromHtml(descRaw)) {
    const ok = pickFeedImageUrl(toHttps(src));
    if (ok) return ok;
  }
  return null;
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
    const link =
      extractFirst(/<link>([\s\S]*?)<\/link>/i, block) ??
      extractFirst(/<link[^>]+href="([^"]+)"/i, block);
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

async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "RawStockOfficialLiveRouteB/1.0 (+https://rawstock.uk)" },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
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

function isVenueOrFestivalItem(item: ParsedItem): boolean {
  const blob = `${item.title} ${item.blurb}`.toLowerCase();
  if (EXCLUDE_BLOB.test(blob)) return false;
  if (NON_EVENT_BLOB.test(blob)) return false;
  return VENUE_OR_FESTIVAL.test(blob) && LIVE_INTENT.test(blob);
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

function normalizeCommunityGenre(category: string | null | undefined, name: string): string {
  return inferGenreKey(`${category ?? ""} ${name}`);
}

/** Up to 12 threads per source (raised for genre-heavy RSS feeds). */
function pickUpToTenWithFlyer(items: ParsedItem[], src: AnnouncementSource): ParsedItem[] {
  const seen = new Set<string>();
  const seenDedup = new Set<string>();
  const pool = items.filter((i) => isVenueOrFestivalItem(i) && pickFeedImageUrl(i.imageUrl));
  const out: ParsedItem[] = [];
  for (const i of pool) {
    const flyer = pickFeedImageUrl(i.imageUrl)!;
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
    if (!check.pass || !check.eventDate || !check.venue) continue;
    const dedupKey = buildAnnouncementDedupKey({
      eventDate: check.eventDate,
      venue: check.venue,
      title: i.title,
    });
    if (seenDedup.has(dedupKey)) continue;
    seenDedup.add(dedupKey);
    seen.add(i.link);
    out.push({ ...i, imageUrl: flyer });
    if (out.length >= 12) break;
  }
  return out;
}

function buildBody(sourceLabel: string, item: ParsedItem): string {
  const flyer = pickFeedImageUrl(item.imageUrl);
  if (!flyer) throw new Error("buildBody requires a flyer URL");
  return [
    `FLYER_IMAGE: ${flyer}`,
    BODY_MARKER,
    `Source: ${sourceLabel} (Route B RSS; image from feed)`,
    `Official link: ${item.link}`,
    "",
    stripTags(item.blurb || item.title).slice(0, 600),
    "",
    "Live house & festival radar — flyer image required for this hub.",
  ].join("\n");
}

/** Limit overlap with V3 hub volume per venue pass. */
const MAX_INSERT_PER_SOURCE = 3;

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
    `DELETE FROM community_threads WHERE body LIKE '%${BODY_MARKER}%'`,
  );
  console.log(`Removed ${del.rowCount ?? 0} previous Route B threads.`);

  let inserted = 0;
  let ci = 0;
  const perGenreIndex = new Map<string, number>();

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

    const picked = pickUpToTenWithFlyer(items, src);
    console.log(
      `[${src.key}] ${picked.length} threads (priority ${src.sourcePriority}; fields: date+venue+lineup+ticket).`,
    );

    let sourceInserted = 0;
    for (const item of picked) {
      if (sourceInserted >= MAX_INSERT_PER_SOURCE) break;
      const prefix = `[${src.label}] `;
      const rawTitle = item.title.replace(/\s+/g, " ").trim();
      const title = (prefix + rawTitle).slice(0, 220);
      const body = buildBody(src.label, item);
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
    }
  }

  console.log(`Done. Inserted ${inserted} Route B threads (flyer + venue/festival filter).`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
