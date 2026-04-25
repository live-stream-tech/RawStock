/**
 * Fetches public/open live video links and publishes them as free video posts.
 *
 * Run: npx tsx scripts/seed-free-live-videos.ts
 * Requires: DATABASE_URL
 */
import "dotenv/config";
import { Pool } from "pg";

const BODY_MARKER = "OFFICIAL_FREE_LIVE_VIDEO_V1";
const LIVE_KEYWORD =
  /\b(live|livestream|live stream|streaming|premiere|dj set|set live|festival stream|broadcast|full set|dj mix|mix)\b/i;
const MAX_PER_SOURCE = 10;
const MAX_AGE_DAYS = 365;

const SOURCES = [
  {
    key: "boiler_room",
    label: "Boiler Room",
    url: "https://www.youtube.com/feeds/videos.xml?user=boilerroomtv",
  },
  {
    key: "cercle",
    label: "Cercle",
    url: "https://www.youtube.com/feeds/videos.xml?user=Cercle",
  },
  {
    key: "tomorrowland",
    label: "Tomorrowland",
    url: "https://www.youtube.com/feeds/videos.xml?user=TomorrowlandChannel",
  },
  {
    key: "ultra",
    label: "Ultra Music Festival",
    url: "https://www.youtube.com/feeds/videos.xml?user=UMFTV",
  },
  {
    key: "coachella",
    label: "Coachella",
    url: "https://www.youtube.com/feeds/videos.xml?user=coachella",
  },
] as const;

type AtomItem = {
  title: string;
  link: string;
  imageUrl: string | null;
  publishedMs: number;
};

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function first(re: RegExp, text: string): string | null {
  const m = text.match(re);
  return m?.[1] ? decodeXml(m[1].trim()) : null;
}

function youtubeThumbFromLink(link: string): string | null {
  const id = first(/[?&]v=([A-Za-z0-9_-]{6,})/, link) ?? first(/youtu\.be\/([A-Za-z0-9_-]{6,})/, link);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

function youtubeIdFromLink(link: string): string | null {
  return first(/[?&]v=([A-Za-z0-9_-]{6,})/, link) ?? first(/youtu\.be\/([A-Za-z0-9_-]{6,})/, link);
}

function parseAtom(xml: string): AtomItem[] {
  const out: AtomItem[] = [];
  const re = /<entry>([\s\S]*?)<\/entry>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const title = first(/<title>([\s\S]*?)<\/title>/i, block);
    const link =
      first(/<link[^>]*href="([^"]+)"/i, block) ??
      first(/<link[^>]*href='([^']+)'/i, block);
    if (!title || !link) continue;
    const published =
      first(/<published>([\s\S]*?)<\/published>/i, block) ??
      first(/<updated>([\s\S]*?)<\/updated>/i, block);
    const publishedMs = published ? Date.parse(published) : Date.now();
    const imageUrl = youtubeThumbFromLink(link);
    out.push({
      title: title.replace(/\s+/g, " ").trim(),
      link,
      imageUrl,
      publishedMs: Number.isFinite(publishedMs) ? publishedMs : Date.now(),
    });
  }
  return out;
}

function isRecent(item: AtomItem): boolean {
  const ageMs = Date.now() - item.publishedMs;
  return ageMs >= 0 && ageMs <= MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function pickItems(items: AtomItem[]): AtomItem[] {
  const picked: AtomItem[] = [];
  const seen = new Set<string>();
  const sorted = [...items].sort((a, b) => b.publishedMs - a.publishedMs);
  for (const i of sorted) {
    if (picked.length >= MAX_PER_SOURCE) break;
    if (!i.imageUrl) continue;
    if (!LIVE_KEYWORD.test(i.title)) continue;
    if (!isRecent(i)) continue;
    if (seen.has(i.link)) continue;
    seen.add(i.link);
    picked.push(i);
  }
  return picked;
}

function buildBody(sourceLabel: string, item: AtomItem): string {
  return [
    `Source: ${sourceLabel} (public feed)`,
    `Watch: ${item.link}`,
    BODY_MARKER,
    "Free/open live video pick.",
  ].join("\n");
}

async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "RawStockFreeLiveVideoSeeder/1.0 (+https://rawstock.uk)" },
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
  if (!users.length) {
    console.error("No users in database.");
    await pool.end();
    process.exit(1);
  }
  const authorId = users[0].id;

  const { rows: officialRows } = await pool.query<{ id: number; name: string }>(
    "SELECT id, name FROM communities WHERE is_official = true ORDER BY members DESC, id ASC LIMIT 10",
  );
  const { rows: fallbackRows } = await pool.query<{ id: number; name: string }>(
    "SELECT id, name FROM communities ORDER BY members DESC, id ASC LIMIT 10",
  );
  const communities = officialRows.length > 0 ? officialRows : fallbackRows;
  if (communities.length === 0) {
    console.error("No communities found.");
    await pool.end();
    process.exit(1);
  }
  const communityIds = communities.map((r) => r.id);
  const communityNameById = new Map(communities.map((c) => [c.id, c.name]));

  const { rows: authorRows } = await pool.query<{ display_name: string | null; profile_image_url: string | null }>(
    "SELECT display_name, profile_image_url FROM users WHERE id = $1 LIMIT 1",
    [authorId],
  );
  const creatorName = authorRows[0]?.display_name?.trim() || "RawStock";
  const creatorAvatar = authorRows[0]?.profile_image_url?.trim() || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=256&h=256&fit=crop&q=80";

  const delThreads = await pool.query(`DELETE FROM community_threads WHERE body LIKE '%${BODY_MARKER}%'`);
  const delVideos = await pool.query(`DELETE FROM videos WHERE description LIKE '%${BODY_MARKER}%'`);
  console.log(`Removed ${delThreads.rowCount ?? 0} old thread rows and ${delVideos.rowCount ?? 0} old video rows.`);

  let inserted = 0;
  let ci = 0;
  for (const src of SOURCES) {
    try {
      const xml = await fetchXml(src.url);
      const items = parseAtom(xml);
      const picked = pickItems(items);
      console.log(`[${src.key}] picked ${picked.length}`);
      for (const item of picked) {
        const communityId = communityIds[ci % communityIds.length];
        const communityName = communityNameById.get(communityId) ?? "Community";
        ci++;
        const title = `[${src.label}] ${item.title}`.slice(0, 220);
        const body = buildBody(src.label, item);
        const youtubeId = youtubeIdFromLink(item.link);
        await pool.query(
          `INSERT INTO videos
            (title, creator, community, views, time_ago, duration, price, thumbnail, avatar, description, user_id, visibility, community_id, video_url, youtube_id, post_type, hidden)
           VALUES
            ($1, $2, $3, 0, 'Just now', 'LIVE', NULL, $4, $5, $6, $7, 'community', $8, NULL, $9, 'daily', false)`,
          [title, creatorName, communityName, item.imageUrl, creatorAvatar, body, authorId, communityId, youtubeId],
        );
        inserted++;
      }
    } catch (e) {
      console.warn(`[${src.key}] failed:`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`Done. Published ${inserted} free/open live video posts.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

