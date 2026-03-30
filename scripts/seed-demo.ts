/**
 * RawStock デモ用シードスクリプト
 * 実行: npx tsx scripts/seed-demo.ts
 *
 * - seed_user_1〜seed_user_30 の lineId を持つユーザーのみ削除・再作成
 * - 既存の本番ユーザー（Google OAuth 等）には影響しない
 * - 削除はすべて seed ユーザーが管理者/作成者のデータのみに限定
 */
import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon") ? { rejectUnauthorized: false } : false,
});

// ─── Asset helpers ────────────────────────────────────────────────────────────

const AVATARS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
  "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=100&h=100&fit=crop",
];

const THUMBS = [
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=225&fit=crop",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=225&fit=crop",
  "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=225&fit=crop",
  "https://images.unsplash.com/photo-1571070946622-57f4c0caa0f0?w=400&h=225&fit=crop",
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=225&fit=crop",
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=225&fit=crop",
  "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=225&fit=crop",
  "https://images.unsplash.com/photo-1524503033411-c9566986fc8f?w=400&h=225&fit=crop",
  "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=225&fit=crop",
  "https://images.unsplash.com/photo-1574169411999-2a640ae31a33?w=400&h=225&fit=crop",
  "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&h=225&fit=crop",
  "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=225&fit=crop",
];

const COMM_THUMBS = [
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1571070946622-57f4c0caa0f0?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1574169411999-2a640ae31a33?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1524503033411-c9566986fc8f?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop",
];

function av(i: number) { return AVATARS[Math.abs(i) % AVATARS.length]; }
function th(i: number) { return THUMBS[Math.abs(i) % THUMBS.length]; }
function ct(i: number) { return COMM_THUMBS[Math.abs(i) % COMM_THUMBS.length]; }

// ─── Seed data definitions ────────────────────────────────────────────────────

const SEED_USERS = [
  // LIVERs (index 0–9)
  { lineId: "seed_user_1",  displayName: "DJ KAZE",              role: "LIVER",  bio: "Electronic music producer and DJ based in Tokyo. Shibuya underground scene veteran." },
  { lineId: "seed_user_2",  displayName: "YUKI BLAST",           role: "LIVER",  bio: "Punk rock vocalist and guitarist. DIY or die." },
  { lineId: "seed_user_3",  displayName: "Guitar Sensei TARO",   role: "LIVER",  bio: "Jazz guitarist and music educator. 15 years on stage." },
  { lineId: "seed_user_4",  displayName: "MC RYOTA",             role: "LIVER",  bio: "Hip-hop MC and beatmaker from Shibuya. Freestyle champion 2024." },
  { lineId: "seed_user_5",  displayName: "NEON ALICE",           role: "LIVER",  bio: "EDM producer and live performer. Making the underground move." },
  { lineId: "seed_user_6",  displayName: "HANA BEATS",           role: "LIVER",  bio: "Pop singer-songwriter. Crafting earworms since 2018." },
  { lineId: "seed_user_7",  displayName: "BASS MASTER KEN",      role: "LIVER",  bio: "Electronic bass music producer. 140bpm is life." },
  { lineId: "seed_user_8",  displayName: "SARA MELODY",          role: "LIVER",  bio: "R&B vocalist and session musician. Soulful vibes always." },
  { lineId: "seed_user_9",  displayName: "AI COMPOSER YU",       role: "LIVER",  bio: "AI-assisted music composer. Bridging human emotion and machine creativity." },
  { lineId: "seed_user_10", displayName: "ROCK PRINCESS MIKA",  role: "LIVER",  bio: "Indie rock vocalist. Loud, raw, real." },
  // EDITORs (index 10–17)
  { lineId: "seed_user_11", displayName: "CutMaster KEN",        role: "EDITOR", bio: "Professional video editor specializing in music videos and live concerts." },
  { lineId: "seed_user_12", displayName: "Scene Builder MIKA",   role: "EDITOR", bio: "Community builder and video editor. 3-day delivery guaranteed." },
  { lineId: "seed_user_13", displayName: "Visual Pro TAKA",      role: "EDITOR", bio: "Motion graphics and music video director. Color is emotion." },
  { lineId: "seed_user_14", displayName: "Edit Queen YUNA",      role: "EDITOR", bio: "Live performance video specialist. Your show, immortalized." },
  { lineId: "seed_user_15", displayName: "Mix Master DAISUKE",   role: "EDITOR", bio: "Audio-visual content creator. Perfect sync between sound and picture." },
  { lineId: "seed_user_16", displayName: "Frame Artist SAKI",    role: "EDITOR", bio: "Cinematic music video editor with a documentary eye." },
  { lineId: "seed_user_17", displayName: "Splice King HARUTO",   role: "EDITOR", bio: "Fast turnaround video editor. Rush jobs welcome." },
  { lineId: "seed_user_18", displayName: "Color Grade AIKO",     role: "EDITOR", bio: "Color grading specialist for live performances and MV shoots." },
  // USERs (index 18–29)
  { lineId: "seed_user_19", displayName: "Beat Listener RIKU",   role: "USER",   bio: "Music fan and underground show regular." },
  { lineId: "seed_user_20", displayName: "Concert Goer SHIORI",  role: "USER",   bio: "Chasing live music every weekend." },
  { lineId: "seed_user_21", displayName: "Vinyl Collector SOTA", role: "USER",   bio: "Analog is forever. Digital is convenient." },
  { lineId: "seed_user_22", displayName: "Crate Digger AKEMI",   role: "USER",   bio: "Hunting for the perfect sample." },
  { lineId: "seed_user_23", displayName: "Show Regular DAIKI",   role: "USER",   bio: "Front row every night." },
  { lineId: "seed_user_24", displayName: "Music Blog HINATA",    role: "USER",   bio: "Writing about underground scenes since 2020." },
  { lineId: "seed_user_25", displayName: "Beat Freak NANAMI",    role: "USER",   bio: "168 BPM is where I live." },
  { lineId: "seed_user_26", displayName: "Synth Geek KAZUKI",    role: "USER",   bio: "Modular synth enthusiast and patch cable hoarder." },
  { lineId: "seed_user_27", displayName: "Night Crawler EMI",    role: "USER",   bio: "Club nights, afterparties, sunrise sets." },
  { lineId: "seed_user_28", displayName: "Sound Chaser YOTA",    role: "USER",   bio: "Following the music wherever it goes." },
  { lineId: "seed_user_29", displayName: "Raw Fan MISAKI",       role: "USER",   bio: "Underground music marketplace believer." },
  { lineId: "seed_user_30", displayName: "Groove Seeker TATSU",  role: "USER",   bio: "The groove is the destination." },
];

const SEED_DISPLAY_NAMES = SEED_USERS.map((u) => u.displayName);

// Communities: 12 total, admin assigned to seed user index
const COMMUNITY_DEFS = [
  { name: "Pop Playground",          category: "pop",    members: 3420, online: true,  adminIdx: 5 },
  { name: "Midnight Pop Collective", category: "pop",    members: 1870, online: false, adminIdx: 7 },
  { name: "Rock Circuit Tokyo",      category: "rock",   members: 2150, online: true,  adminIdx: 1 },
  { name: "Garage Rock Warriors",    category: "rock",   members: 980,  online: false, adminIdx: 9 },
  { name: "HIP-HOP Cypher",         category: "hiphop", members: 4820, online: true,  adminIdx: 3 },
  { name: "Trap Zone Tokyo",         category: "hiphop", members: 2340, online: false, adminIdx: 6 },
  { name: "EDM Collective",          category: "edm",    members: 3670, online: true,  adminIdx: 4 },
  { name: "Club Underground",        category: "edm",    members: 1540, online: true,  adminIdx: 6 },
  { name: "AI Music Lab",            category: "ai",     members: 2890, online: true,  adminIdx: 8 },
  { name: "Neural Beats",            category: "ai",     members: 1230, online: false, adminIdx: 0 },
  { name: "R&B Soul District",       category: "pop",    members: 2100, online: true,  adminIdx: 7 },
  { name: "Jazz Fusion Corner",      category: "rock",   members: 760,  online: false, adminIdx: 2 },
];

const TIME_AGO = ["30分前", "1時間前", "2時間前", "5時間前", "1日前", "2日前", "3日前", "5日前", "1週間前"];
const DURATIONS = ["8:24", "12:15", "15:30", "18:42", "22:18", "24:55", "31:07", "36:22", "42:13"];

// Videos per user — each of the 30 users posts 1–3 videos
// userIdx 0–9 (LIVERs): 3 each = 30
// userIdx 10–17 (EDITORs): 2 each = 16
// userIdx 18–29 (USERs): 1 each = 12
// Total ≈ 58 videos
interface VideoSpec {
  title: string; userIdx: number; commIdx: number; price: number | null; ranked?: boolean;
}

const VIDEO_SPECS: VideoSpec[] = [
  // DJ KAZE (0) — commIdx 6 EDM Collective
  { title: "DJ Set: Warehouse Rave Vol.1",          userIdx: 0,  commIdx: 6,  price: null },
  { title: "Late Night Techno Mix [Full Set]",       userIdx: 0,  commIdx: 6,  price: 800,  ranked: true },
  { title: "Acid House 101: Making a 303 Line",      userIdx: 0,  commIdx: 9,  price: null },
  // YUKI BLAST (1) — commIdx 2 Rock Circuit
  { title: "Punk Rehearsal Session Raw Cut",          userIdx: 1,  commIdx: 2,  price: null },
  { title: "Live at Club ACID: Full Show",            userIdx: 1,  commIdx: 2,  price: 1200 },
  { title: "Rock Riff of the Week #14",               userIdx: 1,  commIdx: 3,  price: null },
  // Guitar Sensei TARO (2) — commIdx 11 Jazz
  { title: "Jazz Improvisation: Standards Night",     userIdx: 2,  commIdx: 11, price: null },
  { title: "Pentatonic Mastery — Guitar Lesson",      userIdx: 2,  commIdx: 11, price: 500 },
  { title: "Morning Jazz: Solo Guitar",               userIdx: 2,  commIdx: 11, price: null },
  // MC RYOTA (3) — commIdx 4 HIP-HOP Cypher
  { title: "Freestyle Cypher: Shibuya Station",       userIdx: 3,  commIdx: 4,  price: null },
  { title: "Beat Breakdown: How I Made This Banger",  userIdx: 3,  commIdx: 4,  price: 600,  ranked: true },
  { title: "Hip-Hop Sample Flip Tutorial",            userIdx: 3,  commIdx: 5,  price: 500 },
  // NEON ALICE (4) — commIdx 6 EDM
  { title: "Festival Main Stage Set [4K]",            userIdx: 4,  commIdx: 6,  price: 1500, ranked: true },
  { title: "EDM Production: From Idea to Drop",       userIdx: 4,  commIdx: 6,  price: 800 },
  { title: "Club Opener DJ Mix",                      userIdx: 4,  commIdx: 7,  price: null },
  // HANA BEATS (5) — commIdx 0 Pop Playground
  { title: "Pop Hook Writing Workshop",               userIdx: 5,  commIdx: 0,  price: 400 },
  { title: "Acoustic Session: New Singles",           userIdx: 5,  commIdx: 0,  price: null },
  { title: "Pop Melody Structure 101",                userIdx: 5,  commIdx: 1,  price: 300 },
  // BASS MASTER KEN (6) — commIdx 7 Club Underground
  { title: "Bass Drop Science Vol.2",                 userIdx: 6,  commIdx: 7,  price: null },
  { title: "140bpm Only: A Live Journey",             userIdx: 6,  commIdx: 7,  price: 1000, ranked: true },
  { title: "Sub-Frequencies Explained",               userIdx: 6,  commIdx: 6,  price: 400 },
  // SARA MELODY (7) — commIdx 10 R&B Soul District
  { title: "R&B Soul Session: Roppongi Hills",        userIdx: 7,  commIdx: 10, price: null },
  { title: "Vocal Technique: Layering & Harmonics",   userIdx: 7,  commIdx: 10, price: 600 },
  { title: "R&B Chord Progressions Deep Dive",        userIdx: 7,  commIdx: 10, price: 500 },
  // AI COMPOSER YU (8) — commIdx 8 AI Music Lab
  { title: "AI Generative Music: My Process",         userIdx: 8,  commIdx: 8,  price: null },
  { title: "Neural Melody Composition Live",          userIdx: 8,  commIdx: 9,  price: 500 },
  { title: "AI Collab: Human + Machine Improv",       userIdx: 8,  commIdx: 8,  price: null },
  // ROCK PRINCESS MIKA (9) — commIdx 3 Garage Rock
  { title: "Indie Rock: Writing Anthems",             userIdx: 9,  commIdx: 3,  price: null },
  { title: "Live at Shibuya Club Quattro",            userIdx: 9,  commIdx: 3,  price: 1800, ranked: true },
  { title: "Garage Rock: Amp Settings Guide",         userIdx: 9,  commIdx: 2,  price: 300 },
  // EDITORs (10–17): 2 each
  { title: "MV Behind the Scenes: Studio Vlog",       userIdx: 10, commIdx: 6,  price: null },
  { title: "Editing Reel: Live Concert Cuts",         userIdx: 10, commIdx: 2,  price: null },
  { title: "Hip-Hop Video Edit: Before/After",        userIdx: 11, commIdx: 4,  price: null },
  { title: "Community Highlight Reel Vol.4",          userIdx: 11, commIdx: 5,  price: null },
  { title: "Motion Graphics for Music Videos",        userIdx: 12, commIdx: 6,  price: null },
  { title: "Color Grade Showcase: Concert Film",      userIdx: 12, commIdx: 7,  price: null },
  { title: "Live Show Edit: Raw to Cinematic",        userIdx: 13, commIdx: 2,  price: null },
  { title: "Punk Concert Edit: Rapid Cut Style",      userIdx: 13, commIdx: 3,  price: null },
  { title: "R&B Session: Smooth Color Grade",        userIdx: 14, commIdx: 10, price: null },
  { title: "Pop MV Edit: Color & Vibe",               userIdx: 14, commIdx: 0,  price: null },
  { title: "Synth Pop Edit: Layered Visuals",         userIdx: 15, commIdx: 4,  price: null },
  { title: "Hip-Hop Visual: Low Budget Big Impact",   userIdx: 15, commIdx: 5,  price: null },
  { title: "Jazz Film: Black & White Concert",        userIdx: 16, commIdx: 11, price: null },
  { title: "Rock Footage: Grain & Grit Treatment",    userIdx: 16, commIdx: 2,  price: null },
  { title: "AI Music Visual: Abstract Edit",          userIdx: 17, commIdx: 8,  price: null },
  { title: "Electronic Music Video: Neon Aesthetic",  userIdx: 17, commIdx: 9,  price: null },
  // USERs (18–29): 1 each
  { title: "My First Show Experience — Recap",         userIdx: 18, commIdx: 6,  price: null },
  { title: "Concert Diary: 3 Shows This Weekend",      userIdx: 19, commIdx: 2,  price: null },
  { title: "Vinyl Haul: My Best Finds This Month",     userIdx: 20, commIdx: 4,  price: null },
  { title: "Sample Digging in Disk Union",             userIdx: 21, commIdx: 4,  price: null },
  { title: "Front Row Experience: Best Memories",      userIdx: 22, commIdx: 0,  price: null },
  { title: "Underground Scene Report: March 2026",     userIdx: 23, commIdx: 7,  price: null },
  { title: "168 BPM Set Review: Was It Too Fast?",     userIdx: 24, commIdx: 7,  price: null },
  { title: "Modular Synth Patch Demo: Ambient",        userIdx: 25, commIdx: 9,  price: null },
  { title: "Afterparty Recap: Sunrise Session",        userIdx: 26, commIdx: 6,  price: null },
  { title: "Sound Hunting in Tokyo — Field Recording", userIdx: 27, commIdx: 8,  price: null },
  { title: "Why I Love the Underground Marketplace",   userIdx: 28, commIdx: 0,  price: null },
  { title: "Groove Hunt: Tokyo Club Circuit",          userIdx: 29, commIdx: 5,  price: null },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL が設定されていません");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    // ── Step 1: Find existing seed user IDs ──────────────────────────────────
    console.log("🔍 Scanning existing seed data...");
    const existingUsersRes = await client.query(
      "SELECT id, display_name FROM users WHERE line_id LIKE 'seed_user_%'"
    );
    const existingUserIds: number[] = existingUsersRes.rows.map((r: any) => r.id);
    // Derive display names from actual DB rows — not a hardcoded constant.
    // This ensures deletions are strictly scoped to seed_user_ prefixed records.
    const existingDisplayNames: string[] = existingUsersRes.rows.map((r: any) => r.display_name);

    let existingCommIds: number[] = [];
    if (existingUserIds.length > 0) {
      const existingCommRes = await client.query(
        "SELECT id FROM communities WHERE admin_id = ANY($1) OR owner_id = ANY($1)",
        [existingUserIds]
      );
      existingCommIds = existingCommRes.rows.map((r: any) => r.id);
    }

    // ── Step 2: Scoped cleanup (seed-owned data only) ────────────────────────
    console.log("🧹 Cleaning seed-owned data...");

    if (existingCommIds.length > 0) {
      // Jukebox data tied to seed communities
      await client.query("DELETE FROM jukebox_queue WHERE community_id = ANY($1)", [existingCommIds]);
      await client.query("DELETE FROM jukebox_state WHERE community_id = ANY($1)", [existingCommIds]);
      await client.query("DELETE FROM jukebox_chat  WHERE community_id = ANY($1)", [existingCommIds]);
      await client.query("DELETE FROM community_threads WHERE community_id = ANY($1)", [existingCommIds]);
      await client.query("DELETE FROM video_editors WHERE community_id = ANY($1)", [existingCommIds]);
      console.log("  ✓ jukebox / threads / editors (seed communities) cleaned");
    }

    if (existingUserIds.length > 0) {
      await client.query("DELETE FROM community_thread_posts WHERE author_user_id = ANY($1)", [existingUserIds]);
      await client.query("DELETE FROM community_members WHERE user_id = ANY($1)", [existingUserIds]);
      await client.query("DELETE FROM community_moderators WHERE user_id = ANY($1)", [existingUserIds]);
      await client.query("DELETE FROM videos WHERE user_id = ANY($1)", [existingUserIds]);
      await client.query("DELETE FROM wallets WHERE user_id = ANY($1)", [existingUserIds]);
      console.log("  ✓ members / videos / wallets (seed users) cleaned");
    }

    // live_streams, creators, booking_sessions are keyed by creator name (text).
    // Use only names derived from actual seed_user_ DB rows — never the hardcoded constant.
    if (existingDisplayNames.length > 0) {
      await client.query("DELETE FROM live_streams WHERE creator = ANY($1)", [existingDisplayNames]);
      await client.query("DELETE FROM creators WHERE name = ANY($1)", [existingDisplayNames]);
      await client.query("DELETE FROM booking_sessions WHERE creator = ANY($1)", [existingDisplayNames]);
      console.log("  ✓ live_streams / creators / booking_sessions (seed names) cleaned");
    }

    // Delete seed communities (after dependent data is cleaned)
    if (existingCommIds.length > 0) {
      await client.query("DELETE FROM communities WHERE id = ANY($1)", [existingCommIds]);
      console.log(`  ✓ ${existingCommIds.length} seed communities deleted`);
    }

    // Delete ticket_balances keyed by lineId text
    await client.query("DELETE FROM ticket_balances WHERE user_id LIKE 'seed_user_%'");

    // Delete seed users last
    if (existingUserIds.length > 0) {
      await client.query("DELETE FROM users WHERE id = ANY($1)", [existingUserIds]);
      console.log(`  ✓ ${existingUserIds.length} seed users deleted`);
    }

    // ── Step 3: Insert 30 users ──────────────────────────────────────────────
    console.log("\n👥 Inserting 30 seed users...");
    const userIds: number[] = [];
    for (let i = 0; i < SEED_USERS.length; i++) {
      const u = SEED_USERS[i];
      const res = await client.query(
        `INSERT INTO users (line_id, display_name, profile_image_url, role, bio)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [u.lineId, u.displayName, av(i), u.role, u.bio]
      );
      userIds.push(res.rows[0].id);
    }
    console.log(`  ✓ ${userIds.length} users inserted`);

    // ── Step 4: Wallets + ticket balances ────────────────────────────────────
    console.log("\n💰 Inserting wallets and ticket balances...");
    const TICKET_AMTS = [100, 200, 350, 500, 800, 1200, 1500, 2000, 3000, 5000];
    for (let i = 0; i < userIds.length; i++) {
      await client.query(
        `INSERT INTO wallets (user_id, balance_available, balance_pending, currency)
         VALUES ($1, $2, $3, 'JPY')`,
        [userIds[i], Math.floor(Math.random() * 50000) + 5000, Math.floor(Math.random() * 10000)]
      );
      // Cap ticket balance at 5000
      const base = TICKET_AMTS[i % TICKET_AMTS.length];
      const bonus = Math.floor(Math.random() * 200);
      const balance = Math.min(base + bonus, 5000);
      await client.query(
        `INSERT INTO ticket_balances (user_id, balance)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance`,
        [SEED_USERS[i].lineId, balance]
      );
    }
    console.log("  ✓ wallets and ticket balances done");

    // ── Step 5: Communities ──────────────────────────────────────────────────
    console.log("\n🏘️  Inserting 12 communities...");
    const communityIds: number[] = [];
    for (let i = 0; i < COMMUNITY_DEFS.length; i++) {
      const c = COMMUNITY_DEFS[i];
      const adminUserId = userIds[c.adminIdx];
      const res = await client.query(
        `INSERT INTO communities (name, members, thumbnail, online, category, admin_id, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [c.name, c.members, ct(i), c.online, c.category, adminUserId, adminUserId]
      );
      communityIds.push(res.rows[0].id);
    }
    console.log(`  ✓ ${communityIds.length} communities inserted`);

    // ── Step 6: Community members ────────────────────────────────────────────
    console.log("\n👫 Inserting community memberships...");
    let memberCount = 0;
    for (let ui = 0; ui < userIds.length; ui++) {
      // Each user joins 2–4 communities. Admin always joins their own.
      const joinCount = 2 + (ui % 3);
      const joined = new Set<number>();
      const adminCommIdx = COMMUNITY_DEFS.findIndex((c) => c.adminIdx === ui);
      if (adminCommIdx >= 0) joined.add(adminCommIdx);
      while (joined.size < joinCount) {
        joined.add(Math.floor(Math.random() * communityIds.length));
      }
      for (const commIdx of joined) {
        await client.query(
          `INSERT INTO community_members (community_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [communityIds[commIdx], userIds[ui]]
        );
        memberCount++;
      }
    }
    console.log(`  ✓ ${memberCount} memberships inserted`);

    // ── Step 7: Videos (all 30 users, 1–3 each) ──────────────────────────────
    console.log("\n🎬 Inserting videos...");
    const videoIds: number[] = [];
    // communityIdx → array of video indices (for jukebox later)
    const videosByComm: Map<number, number[]> = new Map();
    let rankCounter = 1;

    for (let vi = 0; vi < VIDEO_SPECS.length; vi++) {
      const v = VIDEO_SPECS[vi];
      const res = await client.query(
        `INSERT INTO videos
           (title, creator, community, views, time_ago, duration, price, thumbnail, avatar,
            is_ranked, rank, description, visibility, post_type, community_id, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING id`,
        [
          v.title,
          SEED_USERS[v.userIdx].displayName,
          COMMUNITY_DEFS[v.commIdx].name,
          Math.floor(Math.random() * 8000) + 300,
          TIME_AGO[vi % TIME_AGO.length],
          DURATIONS[vi % DURATIONS.length],
          v.price,
          th(vi),
          av(v.userIdx),
          v.ranked ?? false,
          v.ranked ? rankCounter++ : null,
          `Music content from ${SEED_USERS[v.userIdx].displayName}`,
          "community",
          v.price !== null ? "work" : "daily",
          communityIds[v.commIdx],
          userIds[v.userIdx],
        ]
      );
      const newVid = res.rows[0].id as number;
      videoIds.push(newVid);
      if (!videosByComm.has(v.commIdx)) videosByComm.set(v.commIdx, []);
      videosByComm.get(v.commIdx)!.push(newVid);
    }
    console.log(`  ✓ ${videoIds.length} videos inserted`);

    // ── Step 8: Live streams ─────────────────────────────────────────────────
    console.log("\n📡 Inserting 6 live streams...");
    const liveData = [
      { title: "Warehouse Rave: Tokyo Techno Night",          userIdx: 0, commIdx: 6, viewers: 1823 },
      { title: "Punk Full Set — Raw & Uncut",                 userIdx: 1, commIdx: 2, viewers: 542  },
      { title: "Hip-Hop Freestyle Session LIVE",              userIdx: 3, commIdx: 4, viewers: 3241 },
      { title: "EDM Festival Warm-Up Set",                    userIdx: 4, commIdx: 6, viewers: 2087 },
      { title: "AI Music Generation Live Demo",               userIdx: 8, commIdx: 8, viewers: 917  },
      { title: "R&B Soul Night: Special Guest Edition",       userIdx: 7, commIdx: 10, viewers: 1432 },
    ];
    for (const l of liveData) {
      await client.query(
        `INSERT INTO live_streams (title, creator, community, viewers, thumbnail, avatar, time_ago, is_live)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          l.title, SEED_USERS[l.userIdx].displayName, COMMUNITY_DEFS[l.commIdx].name,
          l.viewers, th(l.commIdx), av(l.userIdx),
          `${Math.floor(Math.random() * 55) + 5}分前から配信中`, true,
        ]
      );
    }
    console.log("  ✓ 6 live streams inserted");

    // ── Step 9: Creators (liver ranking data) ────────────────────────────────
    console.log("\n🎙️  Inserting 10 creator records...");
    const creatorData = [
      { ui: 0, ci: 6,  rank: 1,  heat: 1823.4, views: 185320, rev: 173000, streams: 34, followers: 48000, score: 4.9, attend: 0.97 },
      { ui: 3, ci: 4,  rank: 2,  heat: 1542.1, views: 162450, rev: 119000, streams: 45, followers: 92000, score: 4.8, attend: 0.94 },
      { ui: 4, ci: 6,  rank: 3,  heat: 1414.0, views: 148200, rev: 165000, streams: 52, followers: 67000, score: 4.7, attend: 0.91 },
      { ui: 7, ci: 10, rank: 4,  heat: 1203.5, views: 134800, rev: 98000,  streams: 38, followers: 43000, score: 4.9, attend: 0.96 },
      { ui: 5, ci: 0,  rank: 5,  heat: 1087.2, views: 121300, rev: 82000,  streams: 29, followers: 35000, score: 4.6, attend: 0.88 },
      { ui: 8, ci: 8,  rank: 6,  heat: 965.8,  views: 109700, rev: 74000,  streams: 22, followers: 28000, score: 4.8, attend: 0.95 },
      { ui: 1, ci: 2,  rank: 7,  heat: 834.4,  views: 98200,  rev: 61000,  streams: 31, followers: 24000, score: 4.5, attend: 0.87 },
      { ui: 6, ci: 7,  rank: 8,  heat: 712.1,  views: 87500,  rev: 53000,  streams: 27, followers: 19000, score: 4.7, attend: 0.92 },
      { ui: 9, ci: 3,  rank: 9,  heat: 623.7,  views: 74300,  rev: 45000,  streams: 18, followers: 14000, score: 4.6, attend: 0.89 },
      { ui: 2, ci: 11, rank: 10, heat: 541.3,  views: 62100,  rev: 37000,  streams: 15, followers: 11000, score: 4.8, attend: 0.93 },
    ];
    for (const c of creatorData) {
      await client.query(
        `INSERT INTO creators
           (name, community, avatar, rank, heat_score, total_views, revenue,
            stream_count, followers, revenue_share, satisfaction_score, attendance_rate, bio, category)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          SEED_USERS[c.ui].displayName, COMMUNITY_DEFS[c.ci].name,
          av(c.ui), c.rank, c.heat, c.views, c.rev, c.streams, c.followers,
          80, c.score, c.attend, SEED_USERS[c.ui].bio, "musician",
        ]
      );
    }
    console.log("  ✓ 10 creators inserted");

    // ── Step 10: Booking sessions (all music-focused, no category filter) ────
    console.log("\n📅 Inserting 8 booking sessions...");
    const sessionData = [
      { ui: 0, cat: "electronic", label: "Electronic",  title: "DJ Technique 1-on-1: From Beginner to Club-Ready",   date: "4/5 (土)",  time: "20:00", dur: "60分",  price: 5000, total: 1, left: 1, rating: 4.9, reviews: 87,  tag: "人気No.1" },
      { ui: 3, cat: "hiphop",     label: "Hip-Hop",     title: "Freestyle Rap & Flow Development Session",           date: "4/6 (日)",  time: "18:00", dur: "45分",  price: 4000, total: 2, left: 1, rating: 4.8, reviews: 142, tag: undefined },
      { ui: 4, cat: "edm",        label: "EDM",         title: "EDM Production: Build Your First Drop",              date: "4/7 (月)",  time: "21:00", dur: "60分",  price: 6000, total: 1, left: 1, rating: 4.7, reviews: 63,  tag: "残りわずか" },
      { ui: 7, cat: "rb",         label: "R&B",         title: "Vocal Coaching: Soul & R&B Technique",              date: "4/8 (火)",  time: "19:30", dur: "45分",  price: 5500, total: 1, left: 1, rating: 5.0, reviews: 29,  tag: "限定" },
      { ui: 5, cat: "pop",        label: "Pop",         title: "Songwriting Workshop: Hook & Melody Craft",          date: "4/9 (水)",  time: "20:30", dur: "60分",  price: 3000, total: 3, left: 2, rating: 4.8, reviews: 55,  tag: undefined },
      { ui: 8, cat: "ai",         label: "AI Music",    title: "AI-Assisted Composition: Tools & Workflow",         date: "4/10 (木)", time: "22:00", dur: "60分",  price: 4500, total: 2, left: 2, rating: 4.9, reviews: 41,  tag: undefined },
      { ui: 1, cat: "rock",       label: "Rock",        title: "Punk Rock Guitar: Power Chords & Stage Energy",      date: "4/12 (土)", time: "17:00", dur: "45分",  price: 3500, total: 2, left: 1, rating: 4.6, reviews: 33,  tag: undefined },
      { ui: 2, cat: "jazz",       label: "Jazz",        title: "Jazz Improvisation: Modes & Soloing Over Changes",   date: "4/13 (日)", time: "15:00", dur: "90分",  price: 8000, total: 1, left: 1, rating: 4.9, reviews: 78,  tag: "プレミアム" },
    ];
    for (const s of sessionData) {
      await client.query(
        `INSERT INTO booking_sessions
           (creator, category, category_label, title, avatar, thumbnail, date, time, duration,
            price, spots_total, spots_left, rating, review_count, tag)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          SEED_USERS[s.ui].displayName, s.cat, s.label, s.title,
          av(s.ui), th(s.ui), s.date, s.time, s.dur,
          s.price, s.total, s.left, s.rating, s.reviews, s.tag ?? null,
        ]
      );
    }
    console.log("  ✓ 8 booking sessions inserted");

    // ── Step 11: Video editors ───────────────────────────────────────────────
    console.log("\n✂️  Inserting 8 video editors...");
    const editorData = [
      { ui: 10, ci: 6,  genres: "Electronic, EDM",      days: 2, type: "per_minute",    ppm: 1200, rsh: null, rating: 4.8, reviews: 42 },
      { ui: 11, ci: 4,  genres: "Hip-Hop, Rap",          days: 3, type: "per_minute",    ppm: 900,  rsh: null, rating: 4.7, reviews: 67 },
      { ui: 12, ci: 6,  genres: "EDM, Pop, AI Music",    days: 4, type: "revenue_share", ppm: null, rsh: 15,   rating: 4.9, reviews: 29 },
      { ui: 13, ci: 2,  genres: "Rock, Punk",            days: 2, type: "per_minute",    ppm: 800,  rsh: null, rating: 4.6, reviews: 83 },
      { ui: 14, ci: 10, genres: "R&B, Soul, Pop",        days: 3, type: "revenue_share", ppm: null, rsh: 12,   rating: 4.8, reviews: 51 },
      { ui: 15, ci: 4,  genres: "Hip-Hop, Electronic",   days: 5, type: "per_minute",    ppm: 1000, rsh: null, rating: 4.5, reviews: 37 },
      { ui: 16, ci: 2,  genres: "Rock, Jazz",            days: 1, type: "per_minute",    ppm: 700,  rsh: null, rating: 4.7, reviews: 94 },
      { ui: 17, ci: 8,  genres: "AI Music, Electronic",  days: 3, type: "revenue_share", ppm: null, rsh: 10,   rating: 4.9, reviews: 22 },
    ];
    for (const e of editorData) {
      await client.query(
        `INSERT INTO video_editors
           (name, avatar, bio, community_id, genres, delivery_days, price_type,
            price_per_minute, revenue_share_percent, rating, review_count, is_available)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          SEED_USERS[e.ui].displayName, av(e.ui), SEED_USERS[e.ui].bio,
          communityIds[e.ci], e.genres, e.days, e.type,
          e.ppm, e.rsh, e.rating, e.reviews, true,
        ]
      );
    }
    console.log("  ✓ 8 video editors inserted");

    // ── Step 12: Jukebox state + queue (2–5 items guaranteed per community) ──
    console.log("\n🎵 Inserting jukebox data...");
    // Build a pool of all video IDs for fallback when a community has few videos
    const allVideoIdPool = [...videoIds];

    for (let ci = 0; ci < communityIds.length; ci++) {
      const commId = communityIds[ci];
      const commVids = videosByComm.get(ci) ?? [];

      // Use any videos for the queue — fallback to global pool
      const queuePool = commVids.length >= 5
        ? commVids
        : [...commVids, ...allVideoIdPool.filter((id) => !commVids.includes(id))];

      // jukebox_state — now-playing
      const nowPlayingId = queuePool[0];
      const nowPlayingSpec = VIDEO_SPECS[videoIds.indexOf(nowPlayingId)] ?? VIDEO_SPECS[0];
      await client.query(
        `INSERT INTO jukebox_state
           (community_id, current_video_id, current_video_title, current_video_thumbnail,
            current_video_duration_secs, is_playing, watchers_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (community_id) DO UPDATE
           SET current_video_id = EXCLUDED.current_video_id,
               current_video_title = EXCLUDED.current_video_title,
               current_video_thumbnail = EXCLUDED.current_video_thumbnail,
               is_playing = EXCLUDED.is_playing,
               watchers_count = EXCLUDED.watchers_count`,
        [commId, nowPlayingId, nowPlayingSpec.title, th(ci), 360 + ci * 20, true, Math.floor(Math.random() * 40) + 5]
      );

      // Queue: 2–5 items per community (spec requires at least 2)
      const queueCount = 2 + (ci % 4); // 2, 3, 4, or 5
      for (let qi = 0; qi < queueCount; qi++) {
        const qvId = queuePool[(qi + 1) % queuePool.length];
        const qvSpec = VIDEO_SPECS[videoIds.indexOf(qvId)] ?? VIDEO_SPECS[qi % VIDEO_SPECS.length];
        const adderUi = Math.floor(Math.random() * 10);
        await client.query(
          `INSERT INTO jukebox_queue
             (community_id, video_id, video_title, video_thumbnail, video_duration_secs,
              added_by, added_by_avatar, position, is_played)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [commId, qvId, qvSpec.title, th(qi + 1), 240 + qi * 40,
           SEED_USERS[adderUi].displayName, av(adderUi), qi + 1, false]
        );
      }
    }
    console.log(`  ✓ jukebox inserted for all ${communityIds.length} communities`);

    // ── Step 13: Community threads + posts (all 12 communities, 1–3 each) ───
    console.log("\n💬 Inserting community threads and posts...");
    const THREAD_TMPL = [
      { title: "今週のイベント情報シェアしよう！",  body: "このコミュニティ周辺のライブやイベントをシェアするスレです。気軽に書いてください！" },
      { title: "オススメアーティスト・曲を教えて",  body: "最近ハマってる音楽や新しく発見したアーティストをみんなでシェアしましょう。" },
      { title: "機材・制作環境について語る",          body: "DTM、楽器、スタジオ機材など、制作に関する話をするスレです。" },
      { title: "動画投稿してみた！感想おねがい",      body: "初めて動画を投稿しました。率直なフィードバックをもらえると嬉しいです。" },
    ];
    const REPLY_TMPL = [
      "めちゃくちゃいいですね！チェックしました。",
      "先週のライブ最高でした。また行きます！",
      "この情報ありがとうございます。早速試してみます。",
      "同じ機材使ってます！設定を共有しましょう。",
      "フォローしました。今後の投稿も楽しみです！",
      "コミュニティのみんなと一緒に盛り上げたいです！",
    ];

    let threadCount = 0;
    let postCount = 0;
    // All 12 communities get 1–3 threads
    for (let ci = 0; ci < communityIds.length; ci++) {
      const commId = communityIds[ci];
      const numThreads = 1 + (ci % 3); // 1, 2, or 3
      for (let ti = 0; ti < numThreads; ti++) {
        const tpl = THREAD_TMPL[(ci + ti) % THREAD_TMPL.length];
        const authorUi = COMMUNITY_DEFS[ci].adminIdx;
        const threadRes = await client.query(
          `INSERT INTO community_threads (community_id, author_user_id, title, body, pinned)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [commId, userIds[authorUi], tpl.title, tpl.body, ti === 0]
        );
        threadCount++;
        const threadId = threadRes.rows[0].id;

        // 2–4 replies
        const numReplies = 2 + (ti % 3);
        for (let ri = 0; ri < numReplies; ri++) {
          const replyUi = (authorUi + ri + 1) % userIds.length;
          await client.query(
            `INSERT INTO community_thread_posts (thread_id, author_user_id, body)
             VALUES ($1,$2,$3)`,
            [threadId, userIds[replyUi], REPLY_TMPL[(ci + ti + ri) % REPLY_TMPL.length]]
          );
          postCount++;
        }
      }
    }
    console.log(`  ✓ ${threadCount} threads, ${postCount} posts inserted`);

    console.log("\n✅ シード完了！");
    console.log(`   ユーザー:               ${userIds.length}`);
    console.log(`   コミュニティ:           ${communityIds.length}`);
    console.log(`   動画:                   ${videoIds.length}`);
    console.log(`   ライブ配信:             6`);
    console.log(`   クリエーター:           10`);
    console.log(`   ブッキングセッション:   8`);
    console.log(`   動画編集者:             8`);
    console.log(`   スレッド / 返信:        ${threadCount} / ${postCount}`);

  } catch (e) {
    console.error("エラー:", e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
