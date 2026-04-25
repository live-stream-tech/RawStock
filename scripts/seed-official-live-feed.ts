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

const BODY_MARKER = "OFFICIAL_LIVE_AGGREGATOR_V3";

/** Headline / blurb must look like a venue, festival, tour, or ticketed live show — not streaming product news. */
const VENUE_OR_FESTIVAL =
  /\b(festival|fests?\b|open[\s-]*air|outdoor|line-?up|headliner|main\s+stage|campground|live\s*house|music\s+venue|arena|stadium|club\s+tour|concert|gig|tour\b|tour\s+dates|on\s+tour|support\s+act|opening\s+act|tickets?\s+(?:on\s+)?sale|presale|festival\s+pass|weekend\s+pass|day\s+pass|lineup|field\s+day|warehouse|reggae|dub|dancehall|sound\s*system|riddim|roots)\b/i;

const EXCLUDE_BLOB = /\b(podcast\s+series|netflix|video\s+game|movie\s+trailer|iphone|ceo|earnings|streaming\s+only)\b/i;

const SOURCES = [
  { key: "louder_fest", label: "Louder (Festivals)", url: "https://www.loudersound.com/feeds/tag/festival" },
  { key: "louder_reggae", label: "Louder (Reggae)", url: "https://www.loudersound.com/feeds/tag/reggae" },
  { key: "louder_dub", label: "Louder (Dub)", url: "https://www.loudersound.com/feeds/tag/dub" },
  { key: "stereogum", label: "Stereogum", url: "https://stereogum.com/feed/" },
  { key: "dancing_astronaut", label: "Dancing Astronaut", url: "https://dancingastronaut.com/feed/" },
  { key: "gigwise", label: "Gigwise", url: "https://www.gigwise.com/feed" },
  { key: "nme", label: "NME", url: "https://www.nme.com/feed/" },
  { key: "guardian_reggae", label: "The Guardian (Reggae)", url: "https://www.theguardian.com/music/reggae/rss" },
  { key: "largeup", label: "LargeUp", url: "https://largeup.com/feed/" },
  { key: "dancehall_mag", label: "DancehallMag", url: "https://www.dancehallmag.com/feed/" },
] as const;

type ParsedItem = { title: string; link: string; blurb: string; imageUrl: string | null };

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
  if (/\b(favicon|\/icons?\/|pixel\.|1x1|spacer|blank\.|transparent\.|gravatar\.com\/avatar)/i.test(low)) {
    return null;
  }
  const looksImage =
    /\.(jpe?g|png|webp|gif)(\?|$|\/)/i.test(low) ||
    /\/wp-content\/uploads\//i.test(low) ||
    /wp\.com\//i.test(low) ||
    /cloudinary\.com/i.test(low) ||
    /img\.youtube\.com/i.test(low) ||
    /blogger\.googleusercontent\.com/i.test(low) ||
    /cdn\.|images\.|i\.imgur\.com/i.test(low);
  if (!looksImage) return null;
  return u;
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
    const blurb = stripTags(`${descriptionRaw} ${contentRaw}`).slice(0, 400);
    const imageUrl = pickFlyerFromItem(block, `${descriptionRaw}\n${contentRaw}`);
    out.push({ title, link, blurb, imageUrl });
  }
  return out;
}

function isVenueOrFestivalItem(item: ParsedItem): boolean {
  const blob = `${item.title} ${item.blurb}`.toLowerCase();
  if (EXCLUDE_BLOB.test(blob)) return false;
  return VENUE_OR_FESTIVAL.test(blob);
}

/** Only items with a usable RSS image (flyer) and on-topic copy; max 10 per source. */
function pickUpToTenWithFlyer(items: ParsedItem[]): ParsedItem[] {
  const seen = new Set<string>();
  const pool = items.filter((i) => isVenueOrFestivalItem(i) && usableFlyerUrl(i.imageUrl));
  const out: ParsedItem[] = [];
  for (const i of pool) {
    const flyer = usableFlyerUrl(i.imageUrl)!;
    if (seen.has(i.link)) continue;
    seen.add(i.link);
    out.push({ ...i, imageUrl: flyer });
    if (out.length >= 10) break;
  }
  return out;
}

function buildBody(sourceLabel: string, item: ParsedItem): string {
  const flyer = usableFlyerUrl(item.imageUrl);
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

async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "RawStockOfficialLiveAggregator/3.0 (+https://rawstock.uk)" },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
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
  const { rows: comms } = await pool.query<{ id: number }>("SELECT id FROM communities ORDER BY id ASC");
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
  const communityIds = comms.map((c) => c.id);

  const del = await pool.query(
    `DELETE FROM community_threads WHERE body LIKE '%OFFICIAL_LIVE_AGGREGATOR_%'`,
  );
  console.log(`Removed ${del.rowCount ?? 0} previous aggregator threads (OFFICIAL_LIVE_AGGREGATOR_*).`);

  let inserted = 0;
  let ci = 0;

  for (const src of SOURCES) {
    let items: ParsedItem[] = [];
    try {
      const xml = await fetchXml(src.url);
      items = parseRss2Items(xml);
    } catch (e) {
      console.warn(`[${src.key}] fetch/parse failed:`, e instanceof Error ? e.message : e);
    }

    const picked = pickUpToTenWithFlyer(items);
    console.log(`[${src.key}] ${picked.length} threads with flyer + venue/fest copy (cap 10).`);

    for (const item of picked) {
      const prefix = `[${src.label}] `;
      const rawTitle = item.title.replace(/\s+/g, " ").trim();
      const title = (prefix + rawTitle).slice(0, 220);
      const body = buildBody(src.label, item);
      const communityId = communityIds[ci % communityIds.length];
      ci++;

      await pool.query(
        `INSERT INTO community_threads (community_id, author_user_id, title, body, pinned)
         VALUES ($1, $2, $3, $4, false)`,
        [communityId, authorId, title, body],
      );
      inserted++;
    }
  }

  console.log(`Done. Inserted ${inserted} threads (flyer image required, venue/festival-focused).`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
