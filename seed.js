const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  console.log('Seeding RawStock database...');

  const existing = await pool.query('SELECT count(*) FROM communities');
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('Database already has data. Skipping seed.');
    await pool.end();
    return;
  }

  // ── Users (28) ────────────────────────────────────────────────────────────
  // Format: [auth_subject, display_name, profile_image_url, role, bio]
  const users = [
    // Music creators
    ['email:artist1@rawstock.uk',  'DJ KAZE',          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', 'ARTIST', 'Tokyo-based DJ. Techno / House / Ambient. Playing underground since 2019.'],
    ['email:artist2@rawstock.uk',  'YUKI BLAST',       'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop', 'ARTIST', 'Punk vocalist. Raw energy, no filters.'],
    ['email:artist3@rawstock.uk',  'MC RYOTA',         'https://images.unsplash.com/photo-1463453091185-61582044d556?w=80&h=80&fit=crop', 'ARTIST', 'Freestyle MC from Osaka. Battle circuit veteran.'],
    ['email:artist4@rawstock.uk',  'HANA KOBAYASHI',   'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=80&h=80&fit=crop', 'ARTIST', 'Indie folk singer-songwriter. Kyoto sessions, world stages.'],
    // AI Video creators
    ['email:artist5@rawstock.uk',  'GEN-V AKIRA',      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop', 'ARTIST', 'AI video artist. Generative visuals, latent diffusion, real-time synthesis.'],
    ['email:editor1@rawstock.uk',  'CutMaster KEN',    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', 'EDITOR', 'Video editor specializing in live footage. 3 years of concert films.'],
    ['email:editor2@rawstock.uk',  'Frame Edit RIKU',  'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=80&h=80&fit=crop', 'EDITOR', 'Concert film editor. Specializes in multi-cam live cuts.'],
    ['email:artist6@rawstock.uk',  'VISUAL CODES',     'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop', 'ARTIST', 'Generative artist and motion designer. Code-driven visuals.'],
    ['email:artist7@rawstock.uk',  'NEON SARA',        'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&h=80&fit=crop', 'ARTIST', 'AI music video director. Synthwave aesthetics meets machine learning.'],
    // Idol / Influencer creators
    ['email:artist8@rawstock.uk',  'LUNA IDOL',        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop', 'ARTIST', 'Idol performer and streamer. Daily lives from Harajuku.'],
    ['email:artist9@rawstock.uk',  'ZOE STREAM',       'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=80&h=80&fit=crop', 'ARTIST', 'Full-time streamer and social creator. Gaming, music, and lifestyle.'],
    ['email:artist10@rawstock.uk', 'HIME YUKI',        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop', 'ARTIST', 'Idol unit center. Monthly fan lives and behind-the-scenes content.'],
    ['email:artist11@rawstock.uk', 'SUKI CREATOR',     'https://images.unsplash.com/photo-1521146764736-56c929d59c83?w=80&h=80&fit=crop', 'ARTIST', 'Social media creator. Fashion, beauty, and K-pop cover dances.'],
    // Entertainment creators
    ['email:artist12@rawstock.uk', 'TARO STAGE',       'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop', 'ARTIST', 'Stage performer and MC. Theater, improv, and variety shows.'],
    ['email:artist13@rawstock.uk', 'DAIKI DANCE',      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&h=80&fit=crop', 'ARTIST', 'Street dancer and choreographer. HipHop, Locking, Waacking.'],
    ['email:artist14@rawstock.uk', 'EMI TALENT',       'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&h=80&fit=crop', 'ARTIST', 'Variety performer. Comedy, magic, and hosting.'],
    ['email:artist15@rawstock.uk', 'PEDRO SHOW',       'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=80&h=80&fit=crop', 'ARTIST', 'Latin entertainer. Dance shows and live performance production.'],
    // Fans / Community builders
    ['email:fan1@rawstock.uk',     'Scene Builder MIKA','https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop', 'USER', 'Community organizer. Live shows, idol events, and AI creator meetups.'],
    ['email:fan2@rawstock.uk',     'Vinyl Digger SOTA', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', 'USER', 'Crate digger and rare groove archivist. 10k records deep.'],
    ['email:fan3@rawstock.uk',     'Night Crawler EMI', 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=80&h=80&fit=crop', 'USER', 'Club kid and live show addict. Hit 200+ gigs last year.'],
    ['email:fan4@rawstock.uk',     'Tape Head JUNO',    'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=80&h=80&fit=crop', 'USER', 'Cassette collector. Runs a lo-fi zine out of Shimokitazawa.'],
    ['email:fan5@rawstock.uk',     'AI Watcher REN',    'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=80&h=80&fit=crop', 'USER', 'Follows AI video creators. Prompt engineer and Midjourney nerd.'],
    ['email:fan6@rawstock.uk',     'Idol Fan YUNA',     'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&h=80&fit=crop', 'USER', 'Idol otaku. Attends handshake events and monthly fan lives.'],
    ['email:fan7@rawstock.uk',     'Stage Fan KOTA',    'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=80&h=80&fit=crop', 'USER', 'Theater nerd and dance battle regular. Supports indie performers.'],
    ['email:tutor1@rawstock.uk',   'Guitar Sensei TARO','https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=80&h=80&fit=crop', 'ARTIST', 'Guitar instructor. 15 years of experience. Jazz, Blues, Rock.'],
    ['email:editor3@rawstock.uk',  'Color Grade ANYA',  'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=80&h=80&fit=crop', 'EDITOR', 'Colorist and motion graphics designer. 5 years in music video.'],
    ['email:artist16@rawstock.uk', 'FELIX KRAUSE',      'https://images.unsplash.com/photo-1557862921-37829c790f19?w=80&h=80&fit=crop', 'ARTIST', 'Jazz drummer & bandleader. Frankfurt → Tokyo via NYC.'],
    ['email:artist17@rawstock.uk', 'AMARA DIOP',        'https://images.unsplash.com/photo-1542178243-bc20204b769f?w=80&h=80&fit=crop', 'ARTIST', 'Afrobeat bassist. Dakar roots, Shibuya stage.'],
  ];

  const userIds = [];
  for (const u of users) {
    const r = await pool.query(
      `INSERT INTO users (auth_subject, display_name, profile_image_url, role, bio)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`, u
    );
    userIds.push(r.rows[0].id);
    console.log('User:', u[1]);
  }

  // ── Communities (16 — 4 per station) ─────────────────────────────────────
  // category must match CATEGORY_TERMS in station/[stationId].tsx:
  //   music:            "music" | "band" | "rock" | "club" | "rave" | "dj" | "live" | "singer"
  //   ai_video:         "ai"    | "video"| "edit" | "generative" | "visual"
  //   idol_influencer:  "idol"  | "influencer" | "streamer" | "liver" | "creator" | "social"
  //   entertainment:    "entertainment" | "show" | "performance" | "performer" | "stage" | "talent"
  // Format: [name, members, thumbnail, online, category]
  const communities = [
    // ── MUSIC (4) ────────────────────────────────────────────────────────────
    ['Tokyo Underground',       842, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop', true,  'music'],
    ['Live Club Circuit',       534, 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&h=300&fit=crop', true,  'live'],
    ['DJ & Producer Hub',       678, 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop', true,  'dj'],
    ['Band Sessions Global',    305, 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=300&fit=crop', false, 'band'],
    // ── AI VIDEO (4) ────────────────────────────────────────────────────────
    ['AI Video Lab',            412, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop', true,  'ai_video'],
    ['Generative Visual Arts',  289, 'https://images.unsplash.com/photo-1571266752204-22c07a4f7c4e?w=400&h=300&fit=crop', true,  'generative'],
    ['Video Edit Guild',        198, 'https://images.unsplash.com/photo-1504509546545-e000b4a62425?w=400&h=300&fit=crop', false, 'edit'],
    ['Visual Creators Club',    341, 'https://images.unsplash.com/photo-1574169208507-84376144848b?w=400&h=300&fit=crop', true,  'visual'],
    // ── IDOL / INFLUENCER (4) ────────────────────────────────────────────────
    ['Idol Stage Japan',       1203, 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=300&fit=crop', true,  'idol'],
    ['Streamer Lounge',         881, 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=300&fit=crop', true,  'streamer'],
    ['Influencer Network',      723, 'https://images.unsplash.com/photo-1521146764736-56c929d59c83?w=400&h=300&fit=crop', true,  'influencer'],
    ['Social Creator Hub',      490, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=300&fit=crop', false, 'social'],
    // ── ENTERTAINMENT (4) ────────────────────────────────────────────────────
    ['Stage Performance Collective', 567, 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=400&h=300&fit=crop', true,  'stage'],
    ['Show & Variety Circuit',       321, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop', true,  'show'],
    ['Talent Rising',                245, 'https://images.unsplash.com/photo-1598387993441-a364f854cfbd?w=400&h=300&fit=crop', false, 'talent'],
    ['Entertainment Showcase',       412, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=300&fit=crop', true,  'entertainment'],
  ];

  const communityIds = [];
  for (let i = 0; i < communities.length; i++) {
    const c = communities[i];
    const adminIdx = i % userIds.length;
    const r = await pool.query(
      `INSERT INTO communities (name, members, thumbnail, online, category, admin_id, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [...c, userIds[adminIdx], userIds[adminIdx]]
    );
    communityIds.push(r.rows[0].id);
    console.log('Community:', c[0]);
  }

  for (const uid of userIds) {
    const cid = communityIds[Math.floor(Math.random() * communityIds.length)];
    await pool.query(
      `INSERT INTO community_members (community_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [cid, uid]
    );
  }

  // ── Videos (32) — 8 per station ───────────────────────────────────────────
  // Format: [title, creator, community, views, time_ago, duration, price, thumbnail, avatar, rank, is_ranked, post_type]
  const videos = [
    // ── MUSIC (8) ────────────────────────────────────────────────────────────
    ['DJ KAZE — Live at Shibuya Warehouse',       'DJ KAZE',          'Tokyo Underground',     12400, '2h ago',  '45:12',  500, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', 1, true,  'work'],
    ['Soundcheck Vibes — Backstage Clip',         'DJ KAZE',          'Tokyo Underground',      1400, '30m ago',  '2:15', null, 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', null, false, 'daily'],
    ['YUKI BLAST — Club ACID Full Set',           'YUKI BLAST',       'Live Club Circuit',       8200, '5h ago',  '32:08',  300, 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop', 2, true,  'work'],
    ['Late Night DJ Set — Contact Tokyo',         'DJ KAZE',          'DJ & Producer Hub',       9900, '1d ago', '1:02:00', 400, 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', null, false, 'work'],
    ['MC RYOTA — Freestyle Cypher Shibuya',       'MC RYOTA',         'Tokyo Underground',      22800, '3h ago',  '18:45', null, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=80&h=80&fit=crop', 3, true,  'daily'],
    ['HANA KOBAYASHI — Folk Set Kyoto',           'HANA KOBAYASHI',   'Band Sessions Global',    4700, '1d ago',  '29:30', null, 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=80&h=80&fit=crop', null, false, 'work'],
    ['Guitar Sensei TARO — Jazz Clinic',          'Guitar Sensei TARO','Band Sessions Global',   3100, '1d ago', '1:12:33', 800, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=80&h=80&fit=crop', null, false, 'work'],
    ['FELIX KRAUSE Quartet — Live Jukebox',       'FELIX KRAUSE',     'Band Sessions Global',    2200, '4d ago',  '55:00',  600, 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1557862921-37829c790f19?w=80&h=80&fit=crop', null, false, 'work'],
    // ── AI VIDEO (8) ─────────────────────────────────────────────────────────
    ['GEN-V AKIRA — Latent Diffusion Showcase',   'GEN-V AKIRA',      'AI Video Lab',            9800, '4h ago',  '22:30',  400, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop', 1, true,  'work'],
    ['VISUAL CODES — Generative Art Session',     'VISUAL CODES',     'Generative Visual Arts',  7300, '6h ago',  '18:15',  300, 'https://images.unsplash.com/photo-1571266752204-22c07a4f7c4e?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop', 2, true,  'work'],
    ['NEON SARA — AI Music Video Making',         'NEON SARA',        'AI Video Lab',            5100, '2d ago',  '15:40',  200, 'https://images.unsplash.com/photo-1571266752204-22c07a4f7c4e?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&h=80&fit=crop', 3, true,  'work'],
    ['CutMaster KEN — Multi-Cam Festival Cut',    'CutMaster KEN',    'Video Edit Guild',        6200, '2d ago',  '12:00', null, 'https://images.unsplash.com/photo-1504509546545-e000b4a62425?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', null, false, 'daily'],
    ['Frame Edit RIKU — Live Edit Breakdown',     'Frame Edit RIKU',  'Video Edit Guild',        3800, '3d ago',  '11:20', null, 'https://images.unsplash.com/photo-1504509546545-e000b4a62425?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=80&h=80&fit=crop', null, false, 'daily'],
    ['Color Grade ANYA — Color Reel 2026',        'Color Grade ANYA', 'Visual Creators Club',    3300, '4d ago',   '6:45', null, 'https://images.unsplash.com/photo-1574169208507-84376144848b?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=80&h=80&fit=crop', null, false, 'daily'],
    ['GEN-V AKIRA — Real-Time Synthesis Demo',    'GEN-V AKIRA',      'Generative Visual Arts',  4400, '5d ago',  '28:00',  500, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop', null, false, 'work'],
    ['VISUAL CODES — Code-Driven Motion Design',  'VISUAL CODES',     'Visual Creators Club',    2700, '6d ago',  '19:30',  350, 'https://images.unsplash.com/photo-1571266752204-22c07a4f7c4e?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop', null, false, 'work'],
    // ── IDOL / INFLUENCER (8) ─────────────────────────────────────────────────
    ['LUNA IDOL — Monthly Fan Live Vol.12',       'LUNA IDOL',        'Idol Stage Japan',       18700, '3h ago',  '55:00',  700, 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop', 1, true,  'work'],
    ['ZOE STREAM — Gaming & Chat Evening',        'ZOE STREAM',       'Streamer Lounge',        14300, '5h ago',  '2:10:00',null, 'https://images.unsplash.com/photo-1521146764736-56c929d59c83?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=80&h=80&fit=crop', 2, true,  'daily'],
    ['HIME YUKI — Behind The Scenes Vlog',        'HIME YUKI',        'Idol Stage Japan',        9300, '1d ago',  '18:20', null, 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop', 3, true,  'daily'],
    ['SUKI CREATOR — Fashion & Beauty Q&A',       'SUKI CREATOR',     'Influencer Network',      7600, '8h ago',  '42:00', null, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1521146764736-56c929d59c83?w=80&h=80&fit=crop', 4, true,  'daily'],
    ['LUNA IDOL — Idol Unit Rehearsal Footage',   'LUNA IDOL',        'Idol Stage Japan',        5500, '2d ago',  '38:10',  500, 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop', null, false, 'work'],
    ['ZOE STREAM — Collab Stream with Suki',      'ZOE STREAM',       'Social Creator Hub',      4100, '3d ago',  '1:30:00',null, 'https://images.unsplash.com/photo-1521146764736-56c929d59c83?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=80&h=80&fit=crop', null, false, 'daily'],
    ['HIME YUKI — Handshake Event Recap',         'HIME YUKI',        'Social Creator Hub',      3400, '4d ago',  '14:30',  300, 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop', null, false, 'work'],
    ['SUKI CREATOR — K-Pop Cover Dance Practice', 'SUKI CREATOR',     'Influencer Network',      2900, '5d ago',  '11:00', null, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1521146764736-56c929d59c83?w=80&h=80&fit=crop', null, false, 'daily'],
    // ── ENTERTAINMENT (8) ────────────────────────────────────────────────────
    ['TARO STAGE — Improv Show Highlight Reel',   'TARO STAGE',       'Stage Performance Collective', 11200, '2h ago', '28:45', 300, 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop', 1, true,  'work'],
    ['DAIKI DANCE — Street Battle Finals',        'DAIKI DANCE',      'Stage Performance Collective',  8800, '4h ago', '21:18',  200, 'https://images.unsplash.com/photo-1598387993441-a364f854cfbd?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&h=80&fit=crop', 2, true,  'work'],
    ['PEDRO SHOW — Latin Dance Night São Paulo',  'PEDRO SHOW',       'Show & Variety Circuit',    8800, '5h ago', '41:15',  300, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=80&h=80&fit=crop', 3, true,  'work'],
    ['EMI TALENT — Variety Show Clip Pack',       'EMI TALENT',       'Entertainment Showcase',    5100, '1d ago',  '9:30', null, 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&h=80&fit=crop', 4, true,  'daily'],
    ['TARO STAGE — Theater Workshop Session',     'TARO STAGE',       'Talent Rising',             3200, '2d ago', '44:00',  400, 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop', null, false, 'work'],
    ['DAIKI DANCE — Choreography Tutorial EP3',   'DAIKI DANCE',      'Entertainment Showcase',    4600, '3d ago', '17:50', null, 'https://images.unsplash.com/photo-1598387993441-a364f854cfbd?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&h=80&fit=crop', null, false, 'daily'],
    ['Underground Showcase Reel — April 2026',    'CutMaster KEN',    'Entertainment Showcase',    9100, '1d ago', '10:30', null, 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', null, false, 'daily'],
    ['AMARA DIOP — Afrobeat Live at O-East',      'AMARA DIOP',       'Show & Variety Circuit',   11200, '8h ago', '50:10',  500, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1542178243-bc20204b769f?w=80&h=80&fit=crop', null, true,  'work'],
  ];

  for (const v of videos) {
    await pool.query(
      `INSERT INTO videos (title, creator, community, views, time_ago, duration, price, thumbnail, avatar, rank, is_ranked, post_type, user_id, community_id, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'community')`,
      [...v, userIds[0], communityIds[0]]
    );
    console.log('Video:', v[0]);
  }

  // ── Creators (keep 5) ─────────────────────────────────────────────────────
  const creators = [
    ['DJ KAZE',          'Tokyo Underground',          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', 1, 98.5, 34200, 128000, 24, 1250, 90, 4.9, 0.95, 'Tokyo-based DJ',           'music'],
    ['GEN-V AKIRA',      'AI Video Lab',               'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop', 2, 94.1, 28300,  98000, 20, 1100, 85, 4.8, 0.91, 'AI video artist',          'ai_video'],
    ['LUNA IDOL',        'Idol Stage Japan',            'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop', 3, 91.7, 42000, 145000, 30, 2400, 80, 4.7, 0.88, 'Idol performer & streamer', 'idol_influencer'],
    ['TARO STAGE',       'Stage Performance Collective','https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop', 4, 87.3, 19600,  74000, 15,  820, 90, 4.6, 0.89, 'Stage performer & MC',     'entertainment'],
    ['CutMaster KEN',    'Video Edit Guild',            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', 5, 78.4,  8900,  45000,  8,  340, 90, 4.5, 0.90, 'Video editor',             'edit'],
  ];

  for (const c of creators) {
    await pool.query(
      `INSERT INTO creators (name, community, avatar, rank, heat_score, total_views, revenue, stream_count, followers, revenue_share, satisfaction_score, attendance_rate, bio, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, c
    );
    console.log('Creator:', c[0]);
  }

  // ── Booking sessions (4) ─────────────────────────────────────────────────
  const sessions = [
    ['DJ KAZE',      'music',           'Music',         'ライブ配信セット構成レビュー',       'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=200&fit=crop', '2026-04-01', '22:00', '30min', 5000, 10, 7, 4.9, 124, 'NEW'],
    ['GEN-V AKIRA',  'ai_video',        'AI Video',      'AI動画生成ワークフロー相談',          'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop', '2026-04-02', '20:00', '30min', 5000,  8, 5, 4.8,  67, 'NEW'],
    ['LUNA IDOL',    'idol_influencer', 'Idol/Stream',   'ファンライブ演出・集客アドバイス',    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&h=200&fit=crop', '2026-04-03', '21:00', '45min', 8000,  5, 3, 5.0,  42, 'POPULAR'],
    ['TARO STAGE',   'entertainment',   'Entertainment', 'ステージパフォーマンス改善セッション', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop', 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=300&h=200&fit=crop', '2026-04-05', '19:00', '20min', 4000, 12, 9, 4.6,  89, null],
  ];

  for (const s of sessions) {
    await pool.query(
      `INSERT INTO booking_sessions (creator, category, category_label, title, avatar, thumbnail, date, time, duration, price, spots_total, spots_left, rating, review_count, tag)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, s
    );
    console.log('Session:', s[0]);
  }

  // ── AI Edit Jobs (5 demo records) ─────────────────────────────────────────
  const makeEdl = (title, summary, items) => JSON.stringify({ title, totalDuration: '3:00', summary, edl: items });

  const edlLive = makeEdl(
    'DJ Set — High-Energy Cut',
    'A fast-cut highlight reel capturing the energy of the live DJ performance.',
    [
      { index: 1, startTime: '00:00', endTime: '00:20', type: 'highlight',  instruction: 'Opening crowd shot into DJ booth reveal',                    note: 'Beat drop sync' },
      { index: 2, startTime: '01:05', endTime: '01:40', type: 'cut',        instruction: 'DJ hands on decks close-up during build',                    note: 'Slow push in' },
      { index: 3, startTime: '02:10', endTime: '02:30', type: 'transition', instruction: 'Whip-pan from booth to crowd',                               note: 'Match on motion' },
      { index: 4, startTime: '02:50', endTime: '03:00', type: 'caption',    instruction: 'Artist name and venue as closing title card',                 note: 'White bold font, bottom center' },
    ]
  );

  const edlAI = makeEdl(
    'AI Visual Showcase — Cinematic Edit',
    'Curated generative visuals synced to ambient music, showcasing latent diffusion techniques.',
    [
      { index: 1, startTime: '00:00', endTime: '00:40', type: 'highlight',  instruction: 'Slow morph intro — seed image transitioning to latent space', note: 'Ambient audio only' },
      { index: 2, startTime: '01:20', endTime: '02:00', type: 'cut',        instruction: 'Split screen: prompt text alongside generated output',        note: 'Sync prompt reveal to frame change' },
      { index: 3, startTime: '02:15', endTime: '02:40', type: 'transition', instruction: 'Dissolve through color palette shift',                        note: 'Color grade cool blue to warm amber' },
      { index: 4, startTime: '02:45', endTime: '03:00', type: 'caption',    instruction: 'Model name and generator handle lower-third',                 note: 'Minimal sans-serif' },
    ]
  );

  const edlIdol = makeEdl(
    'Fan Live Cut — Idol Stage',
    'Highlights from the monthly fan live, focusing on performance moments and audience reactions.',
    [
      { index: 1, startTime: '00:00', endTime: '00:25', type: 'highlight',  instruction: 'Stage entrance wide shot with crowd reaction',               note: 'Capture lightstick colors' },
      { index: 2, startTime: '00:40', endTime: '01:15', type: 'cut',        instruction: 'Center performer close-up during chorus',                    note: 'Tight face shots preferred' },
      { index: 3, startTime: '01:30', endTime: '02:00', type: 'cut',        instruction: 'Audience reaction cutaways during MC segment',               note: '1-sec reaction shots' },
      { index: 4, startTime: '02:20', endTime: '02:50', type: 'highlight',  instruction: 'Finale song — wide to close multi-angle',                    note: 'End on fan chant moment' },
      { index: 5, startTime: '02:50', endTime: '03:00', type: 'caption',    instruction: 'Date, venue, and social handle end card',                    note: 'Animated slide-in from left' },
    ]
  );

  const aiEditJobs = [
    {
      userId:        userIds[0],
      videoUrl:      'https://pub-demo.r2.dev/rawstock/dj-set-raw.mp4',
      prompt:        'Highlight the most energetic 15 minutes. Focus on crowd reactions and peak drop moments.',
      status:        'completed',
      planMinutes:   15,
      videoUrls:     JSON.stringify(['https://pub-demo.r2.dev/rawstock/dj-set-raw.mp4']),
      logoUrl:       null,
      telop:         'DJ KAZE — Shibuya Warehouse 2026',
      targetAudience:'Fans',
      tone:          'Energetic',
      revisionCount: 0,
      ticketCost:    200,
      result:        edlLive,
      deliveredUrl:  null,
      deliveredAt:   null,
    },
    {
      userId:        userIds[4],
      videoUrl:      'https://pub-demo.r2.dev/rawstock/ai-visual-raw.mp4',
      prompt:        'Create a 30-minute cinematic showcase of generative visuals synced to ambient music.',
      status:        'completed',
      planMinutes:   30,
      videoUrls:     JSON.stringify([
        'https://pub-demo.r2.dev/rawstock/ai-visual-cam1.mp4',
        'https://pub-demo.r2.dev/rawstock/ai-visual-cam2.mp4',
      ]),
      logoUrl:       'https://pub-demo.r2.dev/rawstock/logo-genai.png',
      telop:         'GEN-V AKIRA — Latent Diffusion Live 2026',
      targetAudience:'Creators (20s-30s)',
      tone:          'Cinematic',
      revisionCount: 1,
      ticketCost:    400,
      result:        edlAI,
      deliveredUrl:  null,
      deliveredAt:   null,
    },
    {
      userId:        userIds[9],
      videoUrl:      'https://pub-demo.r2.dev/rawstock/idol-live-raw.mp4',
      prompt:        'Fan live highlight reel — 15 minutes max. Each performer gets equal screen time.',
      status:        'completed',
      planMinutes:   15,
      videoUrls:     JSON.stringify(['https://pub-demo.r2.dev/rawstock/idol-live-raw.mp4']),
      logoUrl:       null,
      telop:         null,
      targetAudience:'Fans (teens-20s)',
      tone:          'Energetic',
      revisionCount: 2,
      ticketCost:    200,
      result:        edlIdol,
      deliveredUrl:  null,
      deliveredAt:   null,
    },
    {
      userId:        userIds[1],
      videoUrl:      'https://pub-demo.r2.dev/rawstock/stage-raw.mp4',
      prompt:        'Theater performance highlight reel for social media. Max 15 minutes, punchy and fast.',
      status:        'approved',
      planMinutes:   15,
      videoUrls:     JSON.stringify(['https://pub-demo.r2.dev/rawstock/stage-raw.mp4']),
      logoUrl:       null,
      telop:         'TARO STAGE — Spring Tour 2026',
      targetAudience:'Fans',
      tone:          'Energetic',
      revisionCount: 0,
      ticketCost:    200,
      result:        edlLive,
      deliveredUrl:  null,
      deliveredAt:   null,
    },
    {
      userId:        userIds[5],
      videoUrl:      'https://pub-demo.r2.dev/rawstock/festival-raw.mp4',
      prompt:        '30-minute showcase reel. Multiple genres, diverse performers. Professional finish.',
      status:        'delivered',
      planMinutes:   30,
      videoUrls:     JSON.stringify([
        'https://pub-demo.r2.dev/rawstock/festival-cam1.mp4',
        'https://pub-demo.r2.dev/rawstock/festival-cam2.mp4',
        'https://pub-demo.r2.dev/rawstock/festival-cam3.mp4',
      ]),
      logoUrl:       'https://pub-demo.r2.dev/rawstock/logo-rawstock.png',
      telop:         'Underground Showcase — April 2026',
      targetAudience:'General',
      tone:          'Professional',
      revisionCount: 1,
      ticketCost:    400,
      result:        edlAI,
      deliveredUrl:  'https://pub-demo.r2.dev/rawstock/showcase-final-edit.mp4',
      deliveredAt:   new Date('2026-04-02T15:30:00Z'),
    },
  ];

  for (const job of aiEditJobs) {
    await pool.query(
      `INSERT INTO ai_edit_jobs
         (user_id, video_url, prompt, status, plan_minutes, video_urls, logo_url, telop,
          target_audience, tone, revision_count, ticket_cost, result, delivered_url, delivered_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        job.userId, job.videoUrl, job.prompt, job.status, job.planMinutes,
        job.videoUrls, job.logoUrl, job.telop, job.targetAudience, job.tone,
        job.revisionCount, job.ticketCost, job.result, job.deliveredUrl, job.deliveredAt,
      ]
    );
    console.log('AI Edit Job:', job.status, `(plan: ${job.planMinutes}min, revisions: ${job.revisionCount})`);
  }

  console.log('\nSeed complete! RawStock is ready.');
  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
