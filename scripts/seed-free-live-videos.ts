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
  /\b(live|livestream|live stream|streaming|premiere|dj set|set live|festival stream|broadcast|full set|dj mix|mix|festival|concert|performance|on stage|main stage|showcase|recording session|tiny desk|acoustic|glastonbury|coachella|edc|lollapalooza|acl|boiler room|cercle|tomorrowland|ultra|umf|bonnaroo|primavera|roskilde|sziget|movement|awakenings|sxsw|vevo|warp|defected|resident|mixmag|audiotree|jam in the van|montreux|barbican|royal albert|southbank|bbc introducing|noisey|vice|88rising|colors|pitchfork|goldenvoice|live nation|outside lands|reggae|dub|dancehall|roots|sound system|soundclash)\b/i;
/** Max candidates scanned per feed (RSS is ~15 entries; we scan what we get). */
const MAX_CANDIDATES_PER_SOURCE = 20;
/** Hard cap per source per run so one label cannot dominate the catalog. */
const MAX_INSERT_PER_SOURCE = 3;
const MAX_AGE_DAYS = 365;

type SourceDef = { key: string; label: string; url: string };

/**
 * Many independent YouTube Atom feeds (channel_id or legacy user=).
 * HTTP 200 verified in dev; failures are skipped at runtime.
 */
const SOURCES: SourceDef[] = [
  { key: "boiler_room", label: "Boiler Room", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCGBpxWJr9FNOcFYA5GkKrMg" },
  { key: "cercle", label: "Cercle", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCPKT_csvP72boVX0XrMtagQ" },
  { key: "tomorrowland", label: "Tomorrowland", url: "https://www.youtube.com/feeds/videos.xml?user=tomorrowland" },
  { key: "ultra", label: "Ultra Music Festival", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC2xskkQVFEpLcGFnNSLQY0A" },
  { key: "coachella", label: "Coachella", url: "https://www.youtube.com/feeds/videos.xml?user=coachella" },
  { key: "bbcradio1", label: "BBC Radio 1", url: "https://www.youtube.com/feeds/videos.xml?user=bbcradio1" },
  { key: "glastonbury", label: "Glastonbury", url: "https://www.youtube.com/feeds/videos.xml?user=GlastonburyFestivals" },
  { key: "glastonbury_official", label: "Glastonbury (Official)", url: "https://www.youtube.com/feeds/videos.xml?user=GlastonburyOfficial" },
  { key: "redbull_music", label: "Red Bull Music", url: "https://www.youtube.com/feeds/videos.xml?user=RedBullMusic" },
  { key: "lollapalooza", label: "Lollapalooza", url: "https://www.youtube.com/feeds/videos.xml?user=Lollapalooza" },
  { key: "npr_music", label: "NPR Music", url: "https://www.youtube.com/feeds/videos.xml?user=nprmusic" },
  { key: "sofar_sounds", label: "Sofar Sounds", url: "https://www.youtube.com/feeds/videos.xml?user=SofarSounds" },
  { key: "acl", label: "ACL Festival", url: "https://www.youtube.com/feeds/videos.xml?user=ACLfestival" },
  { key: "edc", label: "EDC", url: "https://www.youtube.com/feeds/videos.xml?user=EDCOfficial" },
  { key: "defected", label: "Defected Records", url: "https://www.youtube.com/feeds/videos.xml?user=DefectedRecords" },
  { key: "resident_advisor", label: "Resident Advisor", url: "https://www.youtube.com/feeds/videos.xml?user=residentadvisor" },
  { key: "dj_mag", label: "DJ Mag", url: "https://www.youtube.com/feeds/videos.xml?user=DJMag" },
  { key: "fact", label: "Fact", url: "https://www.youtube.com/feeds/videos.xml?user=FactMagazine" },
  { key: "needle_drop", label: "The Needle Drop", url: "https://www.youtube.com/feeds/videos.xml?user=TheNeedleDrop" },
  { key: "audiotree", label: "Audiotree", url: "https://www.youtube.com/feeds/videos.xml?user=AudiotreeTV" },
  { key: "jam_in_the_van", label: "Jam in the Van", url: "https://www.youtube.com/feeds/videos.xml?user=Jaminthevan" },
  { key: "montreux", label: "Montreux Jazz", url: "https://www.youtube.com/feeds/videos.xml?user=MontreuxJazz" },
  { key: "jazz_baltica", label: "JazzBaltica", url: "https://www.youtube.com/feeds/videos.xml?user=JazzBaltica" },
  { key: "roskilde", label: "Roskilde Festival", url: "https://www.youtube.com/feeds/videos.xml?user=RoskildeFestival" },
  { key: "bonnaroo", label: "Bonnaroo", url: "https://www.youtube.com/feeds/videos.xml?user=Bonnaroo" },
  { key: "outside_lands", label: "Outside Lands", url: "https://www.youtube.com/feeds/videos.xml?user=OutsideLands" },
  { key: "primavera", label: "Primavera Sound", url: "https://www.youtube.com/feeds/videos.xml?user=PrimaveraSound" },
  { key: "sziget", label: "Sziget", url: "https://www.youtube.com/feeds/videos.xml?user=SzigetOfficial" },
  { key: "the_fader", label: "The FADER", url: "https://www.youtube.com/feeds/videos.xml?user=TheFader" },
  { key: "vevo", label: "Vevo", url: "https://www.youtube.com/feeds/videos.xml?user=Vevo" },
  { key: "mtv", label: "MTV", url: "https://www.youtube.com/feeds/videos.xml?user=MTV" },
  { key: "sxsw", label: "SXSW", url: "https://www.youtube.com/feeds/videos.xml?user=SXSW" },
  { key: "noisey", label: "Noisey", url: "https://www.youtube.com/feeds/videos.xml?user=Noisey" },
  { key: "vice", label: "VICE", url: "https://www.youtube.com/feeds/videos.xml?user=Vice" },
  { key: "rising_88", label: "88rising", url: "https://www.youtube.com/feeds/videos.xml?user=88rising" },
  { key: "colors", label: "COLORS", url: "https://www.youtube.com/feeds/videos.xml?user=COLORS" },
  { key: "bbc_introducing", label: "BBC Introducing", url: "https://www.youtube.com/feeds/videos.xml?user=bbcintroducing" },
  { key: "bbc", label: "BBC", url: "https://www.youtube.com/feeds/videos.xml?user=bbc" },
  { key: "sky_arts", label: "Sky Arts", url: "https://www.youtube.com/feeds/videos.xml?user=SkyArts" },
  { key: "mezzo", label: "Mezzo", url: "https://www.youtube.com/feeds/videos.xml?user=MezzoTV" },
  { key: "warp", label: "Warp Records", url: "https://www.youtube.com/feeds/videos.xml?user=WarpRecords" },
  { key: "live_nation", label: "Live Nation", url: "https://www.youtube.com/feeds/videos.xml?user=LiveNation" },
  { key: "mixmag_tv", label: "Mixmag TV", url: "https://www.youtube.com/feeds/videos.xml?user=MixmagTV" },
  { key: "pitchfork_tv", label: "Pitchfork", url: "https://www.youtube.com/feeds/videos.xml?user=PitchforkTV" },
  { key: "goldenvoice_tv", label: "Goldenvoice", url: "https://www.youtube.com/feeds/videos.xml?user=GoldenvoiceTV" },
  { key: "royal_albert_hall", label: "Royal Albert Hall", url: "https://www.youtube.com/feeds/videos.xml?user=RoyalAlbertHall" },
  { key: "barbican", label: "Barbican", url: "https://www.youtube.com/feeds/videos.xml?user=BarbicanCentre" },
  { key: "southbank", label: "Southbank Centre", url: "https://www.youtube.com/feeds/videos.xml?user=SouthbankCentre" },
  { key: "adult_swim", label: "Adult Swim", url: "https://www.youtube.com/feeds/videos.xml?user=AdultSwim" },
  { key: "awakenings", label: "Awakenings", url: "https://www.youtube.com/feeds/videos.xml?user=Awakenings" },
  { key: "movement_detroit", label: "Movement Detroit", url: "https://www.youtube.com/feeds/videos.xml?user=MovementDetroit" },
  { key: "reggaeville", label: "Reggaeville", url: "https://www.youtube.com/feeds/videos.xml?user=Reggaeville" },
  { key: "united_reggae", label: "UNITED REGGAE", url: "https://www.youtube.com/feeds/videos.xml?user=UNITEDREGGAE" },
  { key: "jamaicans_music", label: "Jamaicans.com", url: "https://www.youtube.com/feeds/videos.xml?user=Jamaicansmusic" },
  { key: "jahtari", label: "Jahtari", url: "https://www.youtube.com/feeds/videos.xml?user=Jahtari" },
  { key: "vp_records", label: "VP Records", url: "https://www.youtube.com/feeds/videos.xml?user=VPRecords" },
  { key: "stone_love", label: "Stone Love", url: "https://www.youtube.com/feeds/videos.xml?user=StoneLoveMusic" },
  { key: "mungo_hi_fi", label: "Mungo's Hi Fi", url: "https://www.youtube.com/feeds/videos.xml?user=MungosHiFi" },
  { key: "dub_stash", label: "Dub Stash", url: "https://www.youtube.com/feeds/videos.xml?user=DubStash" },
];

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
    const videoId = first(/<yt:videoId>([^<]+)<\/yt:videoId>/i, block);
    const link =
      (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null) ??
      first(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/i, block) ??
      first(/<link[^>]+href="([^"]+)"[^>]*rel="alternate"/i, block) ??
      first(/<link[^>]*href="([^"]+)"/i, block) ??
      first(/<link[^>]*href='([^']+)'/i, block);
    if (!title || !link) continue;
    const published =
      first(/<published>([\s\S]*?)<\/published>/i, block) ??
      first(/<updated>([\s\S]*?)<\/updated>/i, block);
    const publishedMs = published ? Date.parse(published) : Date.now();
    const thumbFromMedia =
      first(/<media:thumbnail[^>]+url="([^"]+)"/i, block) ??
      first(/<media:thumbnail[^>]+url='([^']+)'/i, block);
    const imageUrl =
      (thumbFromMedia ? thumbFromMedia.replace(/^http:/, "https:") : null) ?? youtubeThumbFromLink(link);
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

function pickItems(items: AtomItem[], maxPick: number): AtomItem[] {
  const picked: AtomItem[] = [];
  const seen = new Set<string>();
  const sorted = [...items].sort((a, b) => b.publishedMs - a.publishedMs);
  for (const i of sorted) {
    if (picked.length >= maxPick) break;
    if (!i.imageUrl) continue;
    if (!LIVE_KEYWORD.test(i.title)) continue;
    if (!isRecent(i)) continue;
    if (seen.has(i.link)) continue;
    seen.add(i.link);
    picked.push(i);
  }
  return picked;
}

type QueuedInsert = { item: AtomItem; label: string; key: string };

/** Round-robin merge so the insert order alternates across sources (reduces perceived bias). */
function interleaveBySource(buckets: QueuedInsert[][]): QueuedInsert[] {
  const out: QueuedInsert[] = [];
  let round = 0;
  let progress = true;
  while (progress) {
    progress = false;
    for (const b of buckets) {
      if (round < b.length) {
        out.push(b[round]!);
        progress = true;
      }
    }
    round++;
  }
  return out;
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

  const { rows: existingYoutube } = await pool.query<{ youtube_id: string }>(
    "SELECT youtube_id FROM videos WHERE youtube_id IS NOT NULL",
  );
  const globalYoutubeIds = new Set(existingYoutube.map((r) => r.youtube_id).filter(Boolean));

  const buckets: QueuedInsert[][] = [];

  for (const src of SOURCES) {
    try {
      const xml = await fetchXml(src.url);
      const items = parseAtom(xml);
      const picked = pickItems(items, MAX_CANDIDATES_PER_SOURCE).slice(0, MAX_INSERT_PER_SOURCE);
      const bucket: QueuedInsert[] = [];
      for (const item of picked) {
        const youtubeId = youtubeIdFromLink(item.link);
        if (!youtubeId || globalYoutubeIds.has(youtubeId)) continue;
        globalYoutubeIds.add(youtubeId);
        bucket.push({ item, label: src.label, key: src.key });
      }
      console.log(`[${src.key}] queued ${bucket.length} (cap ${MAX_INSERT_PER_SOURCE})`);
      if (bucket.length > 0) buckets.push(bucket);
    } catch (e) {
      console.warn(`[${src.key}] failed:`, e instanceof Error ? e.message : e);
    }
  }

  const queue = interleaveBySource(buckets);
  let inserted = 0;
  let ci = 0;
  for (const q of queue) {
    const communityId = communityIds[ci % communityIds.length];
    const communityName = communityNameById.get(communityId) ?? "Community";
    ci++;
    const title = `[${q.label}] ${q.item.title}`.slice(0, 220);
    const body = buildBody(q.label, q.item);
    const youtubeId = youtubeIdFromLink(q.item.link);
    if (!youtubeId) continue;
    await pool.query(
      `INSERT INTO videos
            (title, creator, community, views, time_ago, duration, price, thumbnail, avatar, description, user_id, visibility, community_id, video_url, youtube_id, post_type, hidden)
           VALUES
            ($1, $2, $3, 0, 'Just now', 'LIVE', NULL, $4, $5, $6, $7, 'community', $8, NULL, $9, 'daily', false)`,
      [title, creatorName, communityName, q.item.imageUrl, creatorAvatar, body, authorId, communityId, youtubeId],
    );
    inserted++;
  }

  console.log(`Done. Published ${inserted} free/open live video posts.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

