/**
 * Rebuild official communities with realistic announcement threads.
 * Run: npx tsx scripts/reset-official-communities.ts
 */
import "dotenv/config";
import { Pool, PoolClient } from "pg";
import { getCommunityDefaultAssets } from "../lib/community-default-assets";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon") ? { rejectUnauthorized: false } : false,
});

type OfficialCommunity = {
  name: string;
  category: string;
  members: number;
  online: boolean;
  thumbnail: string;
  homeCity: string;
  baseVenue: string;
};

const OFFICIAL_COMMUNITIES: OfficialCommunity[] = [
  {
    name: "Underground Hip-Hop",
    category: "hiphop",
    members: 2860,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1547355253-ff0740f6e8c1?w=800&h=800&fit=crop",
    homeCity: "Los Angeles",
    baseVenue: "Echo Yard",
  },
  {
    name: "Mainstream Hip-Hop / Dancehall",
    category: "hiphop",
    members: 3540,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=800&fit=crop",
    homeCity: "Miami",
    baseVenue: "Bayfront Arena",
  },
  {
    name: "Reggae / Dub",
    category: "reggae",
    members: 1720,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&h=800&fit=crop",
    homeCity: "Kingston",
    baseVenue: "Harbor Sound Yard",
  },
  {
    name: "R&B / Neo Soul",
    category: "rnb",
    members: 1980,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&h=800&fit=crop",
    homeCity: "Chicago",
    baseVenue: "Velvet Room",
  },
  {
    name: "Punk / Hardcore",
    category: "punk",
    members: 1660,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&h=800&fit=crop",
    homeCity: "Berlin",
    baseVenue: "Basement Riot Hall",
  },
  {
    name: "Metal / Loud",
    category: "metal",
    members: 1490,
    online: false,
    thumbnail:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&h=800&fit=crop",
    homeCity: "Helsinki",
    baseVenue: "Iron Dome Club",
  },
  {
    name: "Shoegaze / Indie Rock",
    category: "indie",
    members: 1840,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&h=800&fit=crop",
    homeCity: "London",
    baseVenue: "Fogline Theater",
  },
  {
    name: "Japanese Indie Bands",
    category: "indie",
    members: 2410,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&h=800&fit=crop",
    homeCity: "Tokyo",
    baseVenue: "Shibuya Orbit",
  },
  {
    name: "Japan Indie Livehouses",
    category: "indie",
    members: 1680,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=800&fit=crop",
    homeCity: "Osaka",
    baseVenue: "Namba Circuit Hall",
  },
  {
    name: "Techno / House",
    category: "edm",
    members: 3010,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1571266028243-d220c9d4bb31?w=800&h=800&fit=crop",
    homeCity: "Amsterdam",
    baseVenue: "North Dock Club",
  },
  {
    name: "Drum & Bass / UK Bass",
    category: "bass",
    members: 1570,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1507878866276-a947ef722fee?w=800&h=800&fit=crop",
    homeCity: "Bristol",
    baseVenue: "Voltage Warehouse",
  },
  {
    name: "Classical",
    category: "classical",
    members: 1320,
    online: false,
    thumbnail:
      "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&h=800&fit=crop",
    homeCity: "Vienna",
    baseVenue: "Danube Recital Hall",
  },
];

type AnnouncementSeed = {
  title: string;
  body: string;
  pinned: boolean;
};

/** Stable Lorem Picsum IDs (CDN) — avoids Unsplash hotlink / asset churn for seed announcements. */
const FLYERS = [
  "https://picsum.photos/id/1015/1200/1600",
  "https://picsum.photos/id/1016/1200/1600",
  "https://picsum.photos/id/1018/1200/1600",
  "https://picsum.photos/id/1025/1200/1600",
  "https://picsum.photos/id/1035/1200/1600",
  "https://picsum.photos/id/1036/1200/1600",
  "https://picsum.photos/id/1037/1200/1600",
  "https://picsum.photos/id/1038/1200/1600",
  "https://picsum.photos/id/1043/1200/1600",
  "https://picsum.photos/id/1047/1200/1600",
] as const;

const SHORT_VIDEOS = [
  "https://www.youtube.com/shorts/aqz-KE-bpKQ",
  "https://www.youtube.com/shorts/9bZkp7q19f0",
  "https://www.youtube.com/shorts/kJQP7kiw5Fk",
  "https://www.youtube.com/shorts/JGwWNGJdvx8",
  "https://www.youtube.com/shorts/fJ9rUzIMcZQ",
] as const;

function buildAnnouncementBody(opts: {
  city: string;
  venue: string;
  dateLabel: string;
  lineup: string;
  tickets: string;
  flyer: string;
  shortVideo?: string;
  note: string;
}) {
  return [
    `City: ${opts.city}`,
    `Venue: ${opts.venue}`,
    `Date: ${opts.dateLabel}`,
    `Lineup: ${opts.lineup}`,
    `Tickets: ${opts.tickets}`,
    `Info: ${opts.note}`,
    `FLYER_IMAGE: ${opts.flyer}`,
    opts.shortVideo ? `SHORT_VIDEO: ${opts.shortVideo}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildAnnouncements(community: OfficialCommunity): AnnouncementSeed[] {
  const slots = [
    "Fri Apr 24, 19:30",
    "Sat Apr 25, 20:00",
    "Sun Apr 26, 17:00",
    "Tue Apr 28, 21:00",
    "Thu Apr 30, 18:30",
    "Fri May 01, 22:00",
    "Sat May 02, 19:00",
    "Sun May 03, 16:30",
    "Wed May 06, 20:30",
    "Fri May 08, 19:45",
  ] as const;

  const lineups = [
    "Headliner set + local support",
    "International guest + resident DJs",
    "Three-band showcase night",
    "Openers selected from community submissions",
    "Late-night extended set",
    "Release party with live visual team",
    "Back-to-back special session",
    "All-ages early evening show",
    "Label night with surprise guests",
    "Closing set streamed globally",
  ] as const;

  const notes = [
    "Doors open 60 minutes before showtime.",
    "Limited presale allocation, walk-ins if capacity allows.",
    "Merch booth and meet-and-greet after the main act.",
    "Please bring photo ID for will-call pickup.",
    "Livestream replay available for 48 hours.",
    "Early bird tier ends 72 hours before doors.",
    "Accessibility seating available via venue contact.",
    "Outside food and drink are not permitted.",
    "Official afterparty details posted on event day.",
    "Final timetable is posted in this thread.",
  ] as const;

  return slots.map((dateLabel, i) => {
    const titlePrefix = i === 0 ? "Pinned" : `Live Update #${i + 1}`;
    return {
      pinned: i === 0,
      title: `${titlePrefix}: ${community.name} @ ${community.homeCity}`,
      body: buildAnnouncementBody({
        city: community.homeCity,
        venue: `${community.baseVenue} ${String.fromCharCode(65 + (i % 4))}`,
        dateLabel,
        lineup: lineups[i],
        tickets: `https://tickets.rawstock.live/${community.category}/${i + 1}`,
        note: notes[i],
        flyer: FLYERS[i],
        shortVideo: i % 2 === 0 ? SHORT_VIDEOS[i % SHORT_VIDEOS.length] : undefined,
      }),
    };
  });
}

const DELETE_STATEMENTS: Array<{ table: string; sql: string }> = [
  { table: "reports", sql: "DELETE FROM reports WHERE content_type IN ('video', 'comment')" },
  { table: "video_comments", sql: "DELETE FROM video_comments" },
  { table: "community_thread_posts", sql: "DELETE FROM community_thread_posts" },
  { table: "community_poll_votes", sql: "DELETE FROM community_poll_votes" },
  { table: "community_poll_options", sql: "DELETE FROM community_poll_options" },
  { table: "community_polls", sql: "DELETE FROM community_polls" },
  { table: "community_threads", sql: "DELETE FROM community_threads" },
  { table: "jukebox_queue", sql: "DELETE FROM jukebox_queue" },
  { table: "jukebox_state", sql: "DELETE FROM jukebox_state" },
  { table: "jukebox_chat", sql: "DELETE FROM jukebox_chat" },
  { table: "videos", sql: "DELETE FROM videos" },
  { table: "community_moderators", sql: "DELETE FROM community_moderators" },
  { table: "community_members", sql: "DELETE FROM community_members" },
  { table: "community_votes", sql: "DELETE FROM community_votes" },
  { table: "community_ads", sql: "DELETE FROM community_ads" },
  { table: "video_editors", sql: "DELETE FROM video_editors" },
  { table: "communities", sql: "DELETE FROM communities" },
  { table: "genre_ads", sql: "DELETE FROM genre_ads" },
  { table: "genre_owners", sql: "DELETE FROM genre_owners" },
  { table: "liver_reviews", sql: "DELETE FROM liver_reviews" },
  { table: "liver_availability", sql: "DELETE FROM liver_availability" },
  { table: "mentor_bookings", sql: "DELETE FROM mentor_bookings" },
  { table: "booking_sessions", sql: "DELETE FROM booking_sessions" },
  { table: "live_streams", sql: "DELETE FROM live_streams" },
  { table: "creators", sql: "DELETE FROM creators" },
];

async function deleteIfTableExists(
  client: PoolClient,
  table: string,
  sql: string
) {
  const existsRes = await client.query("SELECT to_regclass($1) AS table_name", [table]);
  const exists = Boolean(existsRes.rows[0]?.table_name);
  if (!exists) {
    console.log(`  - ${table}: skipped (table does not exist)`);
    return;
  }
  const res = await client.query(sql);
  console.log(`  ✓ ${table}: deleted ${res.rowCount ?? 0} rows`);
}

async function pickAdminUserIds(): Promise<number[]> {
  const client = await pool.connect();
  try {
    const adminRes = await client.query(
      `SELECT id FROM users
       WHERE role IN ('ADMIN', 'MODERATOR')
       ORDER BY id ASC`
    );
    if (adminRes.rows.length > 0) {
      return adminRes.rows.map((r: { id: number }) => r.id);
    }
    const fallbackRes = await client.query(
      `SELECT id FROM users
       ORDER BY id ASC
       LIMIT 1`
    );
    if (fallbackRes.rows.length === 0) {
      throw new Error("No users found. Create at least one admin or moderator first.");
    }
    return [fallbackRes.rows[0].id as number];
  } finally {
    client.release();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const adminUserIds = await pickAdminUserIds();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("🧹 Deleting existing community-related data...");
    for (const item of DELETE_STATEMENTS) {
      await deleteIfTableExists(client, item.table, item.sql);
    }

    console.log(`\n🏘️ Inserting ${OFFICIAL_COMMUNITIES.length} official communities...`);
    for (let i = 0; i < OFFICIAL_COMMUNITIES.length; i++) {
      const community = OFFICIAL_COMMUNITIES[i];
      const adminUserId = adminUserIds[i % adminUserIds.length];
      const { iconUrl } = getCommunityDefaultAssets(community.category);
      const commRes = await client.query(
        `INSERT INTO communities
          (name, members, thumbnail, icon_url, online, category, admin_id, owner_id, is_official)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         RETURNING id`,
        [
          community.name,
          community.members,
          community.thumbnail,
          iconUrl,
          community.online,
          community.category,
          adminUserId,
          adminUserId,
        ]
      );
      const communityId = commRes.rows[0].id as number;

      await client.query(
        `INSERT INTO community_members (community_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [communityId, adminUserId]
      );

      const announcements = buildAnnouncements(community);
      for (const announcement of announcements) {
        await client.query(
          `INSERT INTO community_threads (community_id, author_user_id, title, body, pinned)
           VALUES ($1, $2, $3, $4, $5)`,
          [communityId, adminUserId, announcement.title, announcement.body, announcement.pinned]
        );
      }

      console.log(`  ✓ ${community.name}: ${announcements.length} announcement threads`);
    }

    await client.query("COMMIT");
    console.log(`\n✅ Done: rebuilt ${OFFICIAL_COMMUNITIES.length} official communities`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
