/**
 * Fetches public/open live video links and publishes them as free video posts.
 *
 * Run: npx tsx scripts/seed-free-live-videos.ts
 * Requires: DATABASE_URL
 */
import "dotenv/config";
import { Pool } from "pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const BODY_MARKER = "OFFICIAL_FREE_LIVE_VIDEO_V1";
const LIVE_KEYWORD =
  /\b(live|livestream|live stream|streaming|premiere|dj set|set live|festival stream|broadcast|full set|dj mix|mix|festival|concert|performance|on stage|main stage|showcase|recording session|tiny desk|acoustic|glastonbury|coachella|edc|lollapalooza|acl|boiler room|cercle|tomorrowland|ultra|umf|bonnaroo|primavera|roskilde|sziget|movement|awakenings|sxsw|vevo|warp|defected|resident|mixmag|audiotree|jam in the van|montreux|barbican|royal albert|southbank|bbc introducing|noisey|vice|88rising|colors|pitchfork|goldenvoice|live nation|outside lands|reggae|dub|dancehall|roots|sound system|soundclash)\b/i;
const HARD_LIVE_SIGNAL =
  /\b(live\s+at|full\s+set|dj\s+set|boiler\s+room|cercle|festival|concert|on\s+stage|livestream|live\s+stream|premiere|tiny\s+desk)\b/i;
const VIDEO_EXCLUDE =
  /\b(official\s+video|lyrics?|lyric\s+video|audio\s+only|album\s+stream|visualizer|teaser|trailer|recap|highlights?|reaction|interview|podcast|review)\b/i;
/** Max candidates scanned per feed (RSS is ~15 entries; we scan what we get). */
const MAX_CANDIDATES_PER_SOURCE = 20;
/** Hard cap per source per run so one label cannot dominate the catalog. */
const MAX_INSERT_PER_SOURCE = 2;
const MAX_INSERT_PER_GENRE = 4;
const MAX_AGE_DAYS = 365;
const ALLOW_YOUTUBE_FALLBACK = /^1|true|yes$/i.test(process.env.SEED_FREE_LIVE_ALLOW_YOUTUBE_FALLBACK ?? "");
const ARCHIVE_MAX_ROWS = 60;
const ARCHIVE_MAX_PER_QUERY = 12;
const MAX_UPLOAD_BYTES = 250 * 1024 * 1024; // 250MB safety cap

type SourceDef = { key: string; label: string; url: string };
type ArchiveSearch = { key: string; label: string; query: string; genre: string };

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

const ARCHIVE_SEARCHES: ArchiveSearch[] = [
  { key: "ia_reggae_live_1", label: "Internet Archive (Reggae Live)", genre: "reggae", query: "mediatype:(movies) AND (title:(reggae OR dub OR dancehall OR sound system)) AND (title:(live OR concert OR set OR festival))" },
  { key: "ia_reggae_live_2", label: "Internet Archive (Dub/Roots Live)", genre: "reggae", query: "mediatype:(movies) AND (title:(dub OR roots OR ska OR soundclash)) AND (title:(live OR stage OR session OR set))" },
  { key: "ia_edm_live_1", label: "Internet Archive (EDM Live)", genre: "edm", query: "mediatype:(movies) AND (title:(dj OR edm OR techno OR house OR trance)) AND (title:(live OR set OR festival OR concert))" },
  { key: "ia_edm_live_2", label: "Internet Archive (Rave Live)", genre: "edm", query: "mediatype:(movies) AND (title:(rave OR dnb OR drum and bass OR jungle OR electro)) AND (title:(live OR set OR event OR stage))" },
  { key: "ia_rock_live_1", label: "Internet Archive (Rock Live)", genre: "rock", query: "mediatype:(movies) AND (title:(rock OR punk OR metal OR indie)) AND (title:(live OR concert OR festival))" },
  { key: "ia_rock_live_2", label: "Internet Archive (Alt Rock Live)", genre: "rock", query: "mediatype:(movies) AND (title:(grunge OR alternative OR hardcore)) AND (title:(live OR set OR stage OR concert))" },
  { key: "ia_hiphop_live_1", label: "Internet Archive (Hip-Hop Live)", genre: "hiphop", query: "mediatype:(movies) AND (title:(hip hop OR rap OR cypher)) AND (title:(live OR concert OR set))" },
  { key: "ia_hiphop_live_2", label: "Internet Archive (Rap Live)", genre: "hiphop", query: "mediatype:(movies) AND (title:(mc OR freestyle OR beatbox)) AND (title:(live OR session OR set OR stage))" },
  { key: "ia_jazz_live", label: "Internet Archive (Jazz Live)", genre: "jazz", query: "mediatype:(movies) AND (title:(jazz OR bebop OR swing)) AND (title:(live OR concert OR session OR set))" },
  { key: "ia_classical_live", label: "Internet Archive (Classical Live)", genre: "classical", query: "mediatype:(movies) AND (title:(orchestra OR symphony OR philharmonic OR classical)) AND (title:(live OR concert))" },
];

type AtomItem = {
  title: string;
  link: string;
  imageUrl: string | null;
  publishedMs: number;
  directVideoUrl?: string | null;
  sourceTag?: string;
};

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
  return "default";
}

function normalizeCommunityGenre(category: string | null | undefined, name: string): string {
  return inferGenreKey(`${category ?? ""} ${name}`);
}

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
  return (
    first(/[?&]v=([A-Za-z0-9_-]{6,})/, link) ??
    first(/youtu\.be\/([A-Za-z0-9_-]{6,})/, link) ??
    first(/youtube\.com\/live\/([A-Za-z0-9_-]{6,})/, link) ??
    first(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/, link) ??
    first(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/, link)
  );
}

function safeSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "video";
}

function inferMimeFromUrl(url: string): string {
  const low = url.toLowerCase();
  if (low.endsWith(".mp4")) return "video/mp4";
  if (low.endsWith(".webm")) return "video/webm";
  if (low.endsWith(".mov")) return "video/quicktime";
  return "application/octet-stream";
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
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

async function uploadExternalVideoToR2(sourceUrl: string, title: string): Promise<string> {
  if (!r2Client || !r2Endpoint || !r2Bucket) {
    throw new Error("R2 is not configured for non-YouTube mirroring");
  }
  const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(45_000) });
  if (!res.ok) throw new Error(`Failed to download source video: HTTP ${res.status}`);
  const contentLen = Number(res.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLen) && contentLen > MAX_UPLOAD_BYTES) {
    throw new Error(`Source video too large: ${contentLen} bytes`);
  }
  const arr = await res.arrayBuffer();
  if (arr.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(`Source video exceeded size cap after download: ${arr.byteLength} bytes`);
  }
  const ext = sourceUrl.match(/\.(mp4|webm|mov|m4v)(?:\?|$)/i)?.[1]?.toLowerCase() ?? "mp4";
  const key = `seed/free-live/${Date.now()}-${safeSlug(title)}.${ext}`;
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || inferMimeFromUrl(sourceUrl);
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

async function fetchArchiveCandidates(def: ArchiveSearch): Promise<AtomItem[]> {
  const url =
    `https://archive.org/advancedsearch.php?q=${encodeURIComponent(def.query)}` +
    `&fl[]=identifier&fl[]=title&fl[]=description&fl[]=publicdate&sort[]=publicdate+desc&rows=${ARCHIVE_MAX_ROWS}&page=1&output=json`;
  const searchRes = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!searchRes.ok) throw new Error(`Archive search failed: HTTP ${searchRes.status}`);
  const search = (await searchRes.json()) as {
    response?: { docs?: Array<{ identifier?: string; title?: string; description?: string; publicdate?: string }> };
  };
  const docs = search.response?.docs ?? [];
  const out: AtomItem[] = [];
  for (const doc of docs) {
    if (out.length >= ARCHIVE_MAX_PER_QUERY) break;
    const identifier = (doc.identifier ?? "").trim();
    const title = (doc.title ?? "").replace(/\s+/g, " ").trim();
    if (!identifier || !title) continue;
    const blob = `${title} ${doc.description ?? ""}`;
    if (!LIVE_KEYWORD.test(blob) || !HARD_LIVE_SIGNAL.test(blob) || VIDEO_EXCLUDE.test(blob)) continue;
    const inferred = inferGenreKey(blob);
    if (inferred === "default" || inferred !== def.genre) continue;
    const metaUrl = `https://archive.org/metadata/${encodeURIComponent(identifier)}`;
    const metaRes = await fetch(metaUrl, { signal: AbortSignal.timeout(20_000) });
    if (!metaRes.ok) continue;
    const meta = (await metaRes.json()) as { files?: Array<{ name?: string; format?: string; size?: string }> };
    const files = meta.files ?? [];
    const best = files.find((f) => {
      const name = (f.name ?? "").trim();
      if (!name || !isDirectVideoUrl(name)) return false;
      const size = Number(f.size ?? "0");
      if (Number.isFinite(size) && size > 0 && size > MAX_UPLOAD_BYTES) return false;
      const fmt = (f.format ?? "").toLowerCase();
      return /mpeg4|h\.264|mp4|webm|quicktime/.test(fmt) || isDirectVideoUrl(name);
    });
    if (!best?.name) continue;
    const directVideoUrl = `https://archive.org/download/${identifier}/${best.name
      .split("/")
      .map((p) => encodeURIComponent(p))
      .join("/")}`;
    out.push({
      title,
      link: `https://archive.org/details/${identifier}`,
      imageUrl: `https://archive.org/download/${identifier}/__ia_thumb.jpg`,
      publishedMs: doc.publicdate ? Date.parse(doc.publicdate) : Date.now(),
      directVideoUrl,
      sourceTag: def.label,
    });
  }
  return out;
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
    if (!HARD_LIVE_SIGNAL.test(i.title)) continue;
    if (VIDEO_EXCLUDE.test(i.title)) continue;
    if (inferGenreKey(i.title) === "default") continue;
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

/** Keep genre balance so one genre does not dominate a run. */
function capQueueByGenre(queue: QueuedInsert[], maxPerGenre: number): QueuedInsert[] {
  const out: QueuedInsert[] = [];
  const counts = new Map<string, number>();
  for (const q of queue) {
    const g = inferGenreKey(q.item.title);
    const n = counts.get(g) ?? 0;
    if (n >= maxPerGenre) continue;
    counts.set(g, n + 1);
    out.push(q);
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

  const { rows: officialRows } = await pool.query<{ id: number; name: string; category: string | null; is_official: boolean | null; members: number | null }>(
    "SELECT id, name, category, is_official, members FROM communities WHERE is_official = true ORDER BY members DESC, id ASC LIMIT 20",
  );
  const { rows: fallbackRows } = await pool.query<{ id: number; name: string; category: string | null; is_official: boolean | null; members: number | null }>(
    "SELECT id, name, category, is_official, members FROM communities ORDER BY members DESC, id ASC LIMIT 20",
  );
  const communities = officialRows.length > 0 ? officialRows : fallbackRows;
  if (communities.length === 0) {
    console.error("No communities found.");
    await pool.end();
    process.exit(1);
  }
  const seedable = communities.filter((c) => /music|live|festival|reggae|dub|edm|rock|hip\s*hop|jazz|pop/i.test(`${c.name} ${c.category ?? ""}`));
  const baseCommunities = seedable.length ? seedable : communities;
  const communityNameById = new Map(baseCommunities.map((c) => [c.id, c.name]));
  const communityByGenre = new Map<string, number[]>();
  for (const c of baseCommunities) {
    const g = normalizeCommunityGenre(c.category, c.name);
    const arr = communityByGenre.get(g) ?? [];
    arr.push(c.id);
    communityByGenre.set(g, arr);
  }
  const fallbackIds = baseCommunities.map((c) => c.id);

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

  for (const def of ARCHIVE_SEARCHES) {
    try {
      const items = await fetchArchiveCandidates(def);
      const picked = pickItems(items, MAX_CANDIDATES_PER_SOURCE).slice(0, MAX_INSERT_PER_SOURCE);
      const bucket: QueuedInsert[] = picked.map((item) => ({ item, label: def.label, key: def.key }));
      console.log(`[${def.key}] queued ${bucket.length} non-YouTube archive videos`);
      if (bucket.length > 0) buckets.push(bucket);
    } catch (e) {
      console.warn(`[${def.key}] failed:`, e instanceof Error ? e.message : e);
    }
  }

  if (ALLOW_YOUTUBE_FALLBACK) {
    console.log("YouTube fallback enabled.");
  }
  for (const src of SOURCES) {
    if (!ALLOW_YOUTUBE_FALLBACK) break;
    try {
      const xml = await fetchXml(src.url);
      const items = parseAtom(xml);
      const picked = pickItems(items, MAX_CANDIDATES_PER_SOURCE).slice(0, MAX_INSERT_PER_SOURCE);
      const bucket: QueuedInsert[] = [];
      for (const item of picked) {
        if (inferGenreKey(item.title) === "default") continue;
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

  const queue = capQueueByGenre(interleaveBySource(buckets), MAX_INSERT_PER_GENRE);
  let inserted = 0;
  let ci = 0;
  const perGenreIndex = new Map<string, number>();
  for (const q of queue) {
    const genre = inferGenreKey(q.item.title);
    const bucket = communityByGenre.get(genre) ?? communityByGenre.get("default") ?? fallbackIds;
    const idx = perGenreIndex.get(genre) ?? 0;
    const communityId = bucket[idx % bucket.length] ?? fallbackIds[ci % fallbackIds.length];
    perGenreIndex.set(genre, idx + 1);
    const communityName = communityNameById.get(communityId) ?? "Community";
    ci++;
    const title = `[${q.label}] ${q.item.title}`.slice(0, 220);
    const body = buildBody(q.label, q.item);
    const youtubeId = youtubeIdFromLink(q.item.link);
    let uploadedVideoUrl: string | null = null;
    let playableVideoUrl: string | null = null;
    if (q.item.directVideoUrl) {
      try {
        uploadedVideoUrl = await uploadExternalVideoToR2(q.item.directVideoUrl, q.item.title);
        playableVideoUrl = uploadedVideoUrl;
      } catch (e) {
        // Fallback: keep the source direct URL so the post is still viewable.
        playableVideoUrl = q.item.directVideoUrl;
        console.warn(
          `[${q.key}] mirror upload failed; fallback to source URL:`,
          e instanceof Error ? e.message : e,
        );
      }
    }
    if (!playableVideoUrl && !youtubeId) continue;
    await pool.query(
      `INSERT INTO videos
            (title, creator, community, views, time_ago, duration, price, thumbnail, avatar, description, user_id, visibility, community_id, video_url, youtube_id, post_type, hidden)
           VALUES
            ($1, $2, $3, 0, 'Just now', 'LIVE', 0, $4, $5, $6, $7, 'community', $8, $9, $10, 'daily', false)`,
      [title, creatorName, communityName, q.item.imageUrl, creatorAvatar, body, authorId, communityId, playableVideoUrl, playableVideoUrl ? null : youtubeId],
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

