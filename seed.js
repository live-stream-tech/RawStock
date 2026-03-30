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

  // ── Users (30) ────────────────────────────────────────────────────────────
  // Format: [line_id, display_name, profile_image_url, role, bio]
  const users = [
    // Original 5
    ['email:artist1@rawstock.uk',  'DJ KAZE',             'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', 'ARTIST', 'Tokyo-based DJ. Techno / House / Ambient. Playing underground since 2019.'],
    ['email:artist2@rawstock.uk',  'YUKI BLAST',          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop', 'ARTIST', 'Punk vocalist. Raw energy, no filters.'],
    ['email:editor1@rawstock.uk',  'CutMaster KEN',       'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', 'EDITOR', 'Video editor specializing in live music footage. 3 years of concert films.'],
    ['email:fan1@rawstock.uk',     'Scene Builder MIKA',  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop', 'USER',   'Underground music fan. Community organizer for Tokyo indie scene.'],
    ['email:tutor1@rawstock.uk',   'Guitar Sensei TARO',  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop', 'ARTIST', 'Guitar instructor. 15 years of experience. Jazz, Blues, Rock.'],
    // New 25 — global underground scenes
    ['email:artist3@rawstock.uk',  'MC RYOTA',            'https://images.unsplash.com/photo-1463453091185-61582044d556?w=80&h=80&fit=crop', 'ARTIST', 'Freestyle MC from Osaka. Battle circuit veteran.'],
    ['email:artist4@rawstock.uk',  'NEON SARA',           'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&h=80&fit=crop', 'ARTIST', 'Synthwave producer & vocalist. Berlin transplant, Tokyo heart.'],
    ['email:artist5@rawstock.uk',  'BROKEN VALVE',        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop', 'ARTIST', 'Noise rock duo from Seoul. Loud, fast, uncompromising.'],
    ['email:artist6@rawstock.uk',  'AMARA DIOP',          'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&h=80&fit=crop', 'ARTIST', 'Afrobeat bassist. Dakar roots, Shibuya stage.'],
    ['email:artist7@rawstock.uk',  'FELIX KRAUSE',        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop', 'ARTIST', 'Jazz drummer & bandleader. Frankfurt → Tokyo via NYC.'],
    ['email:artist8@rawstock.uk',  'LUNA VOSS',           'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop', 'ARTIST', 'Dark ambient composer. Records in abandoned factories.'],
    ['email:artist9@rawstock.uk',  'PEDRO LIMA',          'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=80&h=80&fit=crop', 'ARTIST', 'Brazilian funk & baile pop. São Paulo energy in every beat.'],
    ['email:artist10@rawstock.uk', 'HANA KOBAYASHI',      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=80&h=80&fit=crop', 'ARTIST', 'Indie folk singer-songwriter. Kyoto sessions, world stages.'],
    ['email:artist11@rawstock.uk', 'RAZOR MIKE',          'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=80&h=80&fit=crop', 'ARTIST', 'UK grime veteran. Sharp bars, concrete flow.'],
    ['email:artist12@rawstock.uk', 'SUKI PARK',           'https://images.unsplash.com/photo-1521146764736-56c929d59c83?w=80&h=80&fit=crop', 'ARTIST', 'K-indie garage rock guitarist. Seoul underground staple.'],
    ['email:artist13@rawstock.uk', 'IVAN PETROV',         'https://images.unsplash.com/photo-1557862921-37829c790f19?w=80&h=80&fit=crop', 'ARTIST', 'Moscow post-punk bassist. Cold sound, warm heart.'],
    ['email:artist14@rawstock.uk', 'CHIDI OKEKE',         'https://images.unsplash.com/photo-1542178243-bc20204b769f?w=80&h=80&fit=crop', 'ARTIST', 'Afro-jazz trumpet player. Lagos jazz circuit legend.'],
    ['email:artist15@rawstock.uk', 'MARTA SILVA',         'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop', 'ARTIST', 'Fado-electronic fusion vocalist. Lisbon meets Tokyo.'],
    ['email:artist16@rawstock.uk', 'OUMAR TRAORE',        'https://images.unsplash.com/photo-1496302662116-35cc4f36df92?w=80&h=80&fit=crop', 'ARTIST', 'Kora player and loop artist. Bamako to Berlin.'],
    ['email:artist17@rawstock.uk', 'ZOE NAKAMURA',        'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=80&h=80&fit=crop', 'ARTIST', 'Half-Japanese indie pop producer. Bilingual lyrics, global hooks.'],
    ['email:artist18@rawstock.uk', 'STREET PROPHET',      'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=80&h=80&fit=crop', 'ARTIST', 'Chicago hip-hop storyteller. Block to stage.'],
    ['email:artist19@rawstock.uk', 'KLARA ENGEL',         'https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=80&h=80&fit=crop', 'ARTIST', 'Swedish death metal vocalist. Scandinavian fury.'],
    ['email:artist20@rawstock.uk', 'TAKA DRUMS',          'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=80&h=80&fit=crop', 'ARTIST', 'Jazz-fusion drummer from Nagoya. Poly-rhythmic wizard.'],
    ['email:editor2@rawstock.uk',  'Frame Edit RIKU',     'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=80&h=80&fit=crop', 'EDITOR', 'Concert film editor. Specializes in multi-cam live cuts.'],
    ['email:editor3@rawstock.uk',  'Color Grade ANYA',    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=80&h=80&fit=crop', 'EDITOR', 'Colorist and motion graphics designer. 5 years in music video.'],
    ['email:fan2@rawstock.uk',     'Vinyl Digger SOTA',   'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', 'USER',   'Crate digger & rare groove archivist. 10k records deep.'],
    ['email:fan3@rawstock.uk',     'Night Crawler EMI',   'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=80&h=80&fit=crop', 'USER',   'Club kid and live show addict. Hit 200+ gigs last year.'],
    ['email:fan4@rawstock.uk',     'Tape Head JUNO',      'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=80&h=80&fit=crop', 'USER',   'Cassette collector. Runs a lo-fi zine out of Shimokitazawa.'],
    ['email:fan5@rawstock.uk',     'Riff Lord DAIKI',     'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&h=80&fit=crop', 'USER',   'Guitar nerd, gear reviewer, community moderator.'],
    ['email:fan6@rawstock.uk',     'Bass Theory YUMI',    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&h=80&fit=crop', 'USER',   'Bass player turned scene photographer. Documents the underground.'],
  ];

  const userIds = [];
  for (const u of users) {
    const r = await pool.query(
      `INSERT INTO users (line_id, display_name, profile_image_url, role, bio)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`, u
    );
    userIds.push(r.rows[0].id);
    console.log('User:', u[1]);
  }

  // ── Communities (15) ──────────────────────────────────────────────────────
  // Format: [name, members, thumbnail, online, category]
  const communities = [
    ['Tokyo Underground',       842,  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop', true,  'electronic'],
    ['Punk Raw Tokyo',          356,  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=300&fit=crop', true,  'punk'],
    ['Jazz Night Sessions',     214,  'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=300&fit=crop', false, 'jazz'],
    ['HIP-HOP Cypher',         1203,  'https://images.unsplash.com/photo-1571609803939-54f463c1752e?w=400&h=300&fit=crop', true,  'hiphop'],
    ['Indie Rock Basement',     489,  'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&h=300&fit=crop', false, 'rock'],
    ['R&B Vibes',               678,  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop', true,  'rnb'],
    ['Metal Underground',       321,  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop', false, 'metal'],
    ['World Music Exchange',    167,  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=300&fit=crop', false, 'world'],
    ['Synthwave Collective',    534,  'https://images.unsplash.com/photo-1571266752204-22c07a4f7c4e?w=400&h=300&fit=crop', true,  'electronic'],
    ['Seoul Garage Circuit',    290,  'https://images.unsplash.com/photo-1598387993441-a364f854cfbd?w=400&h=300&fit=crop', true,  'rock'],
    ['Afrobeat Global',         412,  'https://images.unsplash.com/photo-1574169208507-84376144848b?w=400&h=300&fit=crop', true,  'world'],
    ['Noise & Drone Lab',       98,   'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop', false, 'experimental'],
    ['Latin Roots Session',     723,  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop', true,  'latin'],
    ['Folk & Acoustic Circle',  305,  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=300&fit=crop', false, 'folk'],
    ['Drum & Bass Warehouse',   881,  'https://images.unsplash.com/photo-1504509546545-e000b4a62425?w=400&h=300&fit=crop', true,  'electronic'],
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

  // ── Videos (30) ───────────────────────────────────────────────────────────
  // Format: [title, creator, community, views, time_ago, duration, price, thumbnail, avatar, rank, is_ranked, post_type]
  const videos = [
    // Electronic / Techno
    ['DJ KAZE — Live at Shibuya Warehouse',         'DJ KAZE',         'Tokyo Underground',       12400, '2h ago',   '45:12',   500,  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop',  1,    true,  'work'],
    ['Soundcheck Vibes',                            'DJ KAZE',         'Tokyo Underground',        1400, '30m ago',   '2:15',   null, 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop',  null, false, 'daily'],
    ['NEON SARA — Synthwave Set at Contact Tokyo',  'NEON SARA',       'Synthwave Collective',    18700, '4h ago',   '38:50',   700,  'https://images.unsplash.com/photo-1571266752204-22c07a4f7c4e?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&h=80&fit=crop',  2,    true,  'work'],
    ['Drum & Bass Night — Warehouse 404',           'DJ KAZE',         'Drum & Bass Warehouse',   9900,  '1d ago',   '1:02:00', 400,  'https://images.unsplash.com/photo-1504509546545-e000b4a62425?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop',  null, false, 'work'],
    // Punk / Rock
    ['YUKI BLAST — Punk Set at Club ACID',          'YUKI BLAST',      'Punk Raw Tokyo',           8200, '5h ago',   '32:08',   300,  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop',  2,    true,  'work'],
    ['BROKEN VALVE — Seoul Basement Show',          'BROKEN VALVE',    'Seoul Garage Circuit',    5500,  '2d ago',   '28:45',   250,  'https://images.unsplash.com/photo-1598387993441-a364f854cfbd?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop',  3,    true,  'work'],
    ['SUKI PARK — Garage Session #12',              'SUKI PARK',       'Seoul Garage Circuit',    3100,  '6h ago',   '14:30',  null,  'https://images.unsplash.com/photo-1598387993441-a364f854cfbd?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1521146764736-56c929d59c83?w=80&h=80&fit=crop',  null, false, 'daily'],
    ['IVAN PETROV — Post-Punk at Squat 9',          'IVAN PETROV',     'Indie Rock Basement',     2700,  '3d ago',   '21:18',   200,  'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1557862921-37829c790f19?w=80&h=80&fit=crop',  null, false, 'work'],
    ['KLARA ENGEL — Melodic Death Set',             'KLARA ENGEL',     'Metal Underground',       4400,  '1d ago',   '42:00',   350,  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=80&h=80&fit=crop',  null, true,  'work'],
    // Jazz
    ['Late Night Jazz Jam — Shinjuku Blue Note',    'Guitar Sensei TARO', 'Jazz Night Sessions',  3100,  '1d ago',  '1:12:33',  800,  'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop',  3,    true,  'work'],
    ['Guitar Technique: Pentatonic Mastery',        'Guitar Sensei TARO', 'Jazz Night Sessions',  4500,  '2d ago',   '22:10',  1500,  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop',  null, false, 'work'],
    ['FELIX KRAUSE Quartet — Tokyo Jukebox',        'FELIX KRAUSE',    'Jazz Night Sessions',     2200,  '4d ago',   '55:00',   600,  'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop',  null, false, 'work'],
    ['CHIDI OKEKE — Afro-Jazz in Nakameguro',       'CHIDI OKEKE',     'Afrobeat Global',         3800,  '2d ago',   '48:20',   400,  'https://images.unsplash.com/photo-1574169208507-84376144848b?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1542178243-bc20204b769f?w=80&h=80&fit=crop',  null, false, 'work'],
    ['TAKA DRUMS — Fusion Clinic Osaka',            'TAKA DRUMS',      'Jazz Night Sessions',     1900,  '5d ago',   '31:00',   300,  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=80&h=80&fit=crop',  null, false, 'daily'],
    // Hip-Hop
    ['Freestyle Cypher — Shibuya Station',          'MC RYOTA',        'HIP-HOP Cypher',         22800,  '3h ago',   '18:45',  null,  'https://images.unsplash.com/photo-1571609803939-54f463c1752e?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=80&h=80&fit=crop',  4,    true,  'daily'],
    ['STREET PROPHET — Chicago Basement Cypher',    'STREET PROPHET',  'HIP-HOP Cypher',         14300,  '6h ago',   '24:00',   200,  'https://images.unsplash.com/photo-1571609803939-54f463c1752e?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=80&h=80&fit=crop',  5,    true,  'work'],
    ['RAZOR MIKE — Grime Set UK Tour 2026',         'RAZOR MIKE',      'HIP-HOP Cypher',          7600,  '1d ago',   '19:50',   300,  'https://images.unsplash.com/photo-1571609803939-54f463c1752e?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=80&h=80&fit=crop',  null, false, 'work'],
    ['Basement Show Highlights — March 2026',       'CutMaster KEN',   'Indie Rock Basement',     6700,  '12h ago',   '8:22',   200,  'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop',  null, true,  'work'],
    // R&B / Soul
    ['R&B Soul Session — Roppongi Hills',           'DJ KAZE',         'R&B Vibes',               9300,  '6h ago',   '55:42',   600,  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop',  6,    true,  'work'],
    ['ZOE NAKAMURA — Bedroom Pop Session',          'ZOE NAKAMURA',    'R&B Vibes',               5100,  '3d ago',   '17:30',   null,  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=80&h=80&fit=crop',  null, false, 'daily'],
    // World / Folk / Latin
    ['AMARA DIOP — Afrobeat Live at O-East',        'AMARA DIOP',      'Afrobeat Global',        11200,  '8h ago',   '50:10',   500,  'https://images.unsplash.com/photo-1574169208507-84376144848b?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&h=80&fit=crop',  null, true,  'work'],
    ['OUMAR TRAORE — Kora Loop Session',            'OUMAR TRAORE',    'World Music Exchange',    2900,  '2d ago',   '33:00',   400,  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1496302662116-35cc4f36df92?w=80&h=80&fit=crop',  null, false, 'work'],
    ['PEDRO LIMA — Baile Funk Night São Paulo',     'PEDRO LIMA',      'Latin Roots Session',     8800,  '5h ago',   '41:15',   300,  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=80&h=80&fit=crop',  null, true,  'work'],
    ['MARTA SILVA — Fado-Electronic at Womb',       'MARTA SILVA',     'World Music Exchange',    3400,  '4d ago',   '26:45',   350,  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop',  null, false, 'work'],
    ['HANA KOBAYASHI — Folk Acoustic at Kyoto',     'HANA KOBAYASHI',  'Folk & Acoustic Circle',  4700,  '1d ago',   '29:30',   null,  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=80&h=80&fit=crop',  null, false, 'work'],
    // Experimental / Noise
    ['LUNA VOSS — Drone Ritual at 20000Hz',         'LUNA VOSS',       'Noise & Drone Lab',       1200,  '3d ago',   '58:00',   500,  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop',  null, false, 'work'],
    // Misc editor cuts
    ['Frame Edit RIKU — Multi-Cam Festival Cut',    'Frame Edit RIKU', 'Tokyo Underground',       6200,  '2d ago',   '12:00',   null,  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=80&h=80&fit=crop',  null, false, 'daily'],
    ['Color Grade ANYA — Color Reel 2026',          'Color Grade ANYA','Indie Rock Basement',     3300,  '4d ago',    '6:45',   null,  'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=80&h=80&fit=crop',  null, false, 'daily'],
    ['TAKA DRUMS + FELIX KRAUSE — Live Duo',        'TAKA DRUMS',      'Jazz Night Sessions',     5500,  '6d ago',   '37:20',   400,  'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=80&h=80&fit=crop',  null, false, 'work'],
    ['Underground Showcase Reel — April 2026',      'CutMaster KEN',   'Tokyo Underground',       9100,  '1d ago',   '10:30',   null,  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop',  null, false, 'daily'],
  ];

  for (const v of videos) {
    await pool.query(
      `INSERT INTO videos (title, creator, community, views, time_ago, duration, price, thumbnail, avatar, rank, is_ranked, post_type, user_id, community_id, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'community')`,
      [...v, userIds[0], communityIds[0]]
    );
    console.log('Video:', v[0]);
  }

  // ── Creators (keep original 5) ────────────────────────────────────────────
  const creators = [
    ['DJ KAZE',           'Tokyo Underground',    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', 1, 98.5, 34200, 128000, 24, 1250, 90, 4.9, 0.95, 'Tokyo-based DJ',       'electronic'],
    ['YUKI BLAST',        'Punk Raw Tokyo',        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop', 2, 92.3, 21800,  85000, 18,  890, 85, 4.7, 0.88, 'Punk vocalist',        'punk'],
    ['Guitar Sensei TARO','Jazz Night Sessions',   'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop', 3, 87.1, 15600,  62000, 12,  560, 90, 4.8, 0.92, 'Jazz guitar instructor','jazz'],
    ['MC RYOTA',          'HIP-HOP Cypher',        'https://images.unsplash.com/photo-1463453091185-61582044d556?w=80&h=80&fit=crop', 4, 85.0, 42000,  95000, 30, 2100, 80, 4.6, 0.82, 'Freestyle MC',         'hiphop'],
    ['CutMaster KEN',     'Indie Rock Basement',   'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', 5, 78.4,  8900,  45000,  8,  340, 90, 4.5, 0.90, 'Video editor',         'rock'],
  ];

  for (const c of creators) {
    await pool.query(
      `INSERT INTO creators (name, community, avatar, rank, heat_score, total_views, revenue, stream_count, followers, revenue_share, satisfaction_score, attendance_rate, bio, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, c
    );
    console.log('Creator:', c[0]);
  }

  // ── Booking sessions (keep original 4) ───────────────────────────────────
  const sessions = [
    ['DJ KAZE',            'electronic', 'Electronic',  'DJ KAZE Private Mix Session',     'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=200&fit=crop', '2026-04-01', '22:00', '30min', 5000, 10, 7, 4.9, 124, 'NEW'],
    ['YUKI BLAST',         'punk',       'Punk',        'Vocal Coaching - Raw Energy',     'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=200&fit=crop', '2026-04-02', '19:00', '15min', 3000,  8, 5, 4.7,  67, null],
    ['Guitar Sensei TARO', 'jazz',       'Jazz Guitar', 'Jazz Improv Lesson',              'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop', 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=300&h=200&fit=crop', '2026-04-03', '20:00', '45min', 8000,  5, 3, 5.0,  42, 'POPULAR'],
    ['MC RYOTA',           'hiphop',     'HIP-HOP',    'Freestyle Battle Coaching',       'https://images.unsplash.com/photo-1463453091185-61582044d556?w=80&h=80&fit=crop', 'https://images.unsplash.com/photo-1571609803939-54f463c1752e?w=300&h=200&fit=crop', '2026-04-05', '21:00', '20min', 4000, 12, 9, 4.8,  89, null],
  ];

  for (const s of sessions) {
    await pool.query(
      `INSERT INTO booking_sessions (creator, category, category_label, title, avatar, thumbnail, date, time, duration, price, spots_total, spots_left, rating, review_count, tag)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, s
    );
    console.log('Session:', s[0]);
  }

  // ── AI Edit Jobs (5 demo records) ─────────────────────────────────────────

  // Reusable EDL helper
  const makeEdl = (title, summary, items) => JSON.stringify({ title, totalDuration: '3:00', summary, edl: items });

  const edlPunk = makeEdl(
    'Punk Set — High-Energy Cut',
    'A fast-cut highlight reel capturing the raw energy of the live punk performance.',
    [
      { index: 1, startTime: '00:00', endTime: '00:20', type: 'highlight',  instruction: 'Opening blast — first power chord into crowd shot',      note: 'Hit the downbeat hard' },
      { index: 2, startTime: '01:05', endTime: '01:40', type: 'cut',        instruction: 'Vocalist close-up during bridge scream',                  note: 'Handheld shaky cam preferred' },
      { index: 3, startTime: '02:10', endTime: '02:30', type: 'transition', instruction: 'Whip-pan from stage to mosh pit',                         note: 'Match on motion' },
      { index: 4, startTime: '02:50', endTime: '03:00', type: 'caption',    instruction: 'Insert band name and venue as closing title card',        note: 'White bold font, bottom center' },
    ]
  );

  const edlJazz = makeEdl(
    'Late Night Jazz — Cinematic Edit',
    'A slow-burn cinematic cut emphasizing texture, light, and musical conversation between players.',
    [
      { index: 1, startTime: '00:00', endTime: '00:40', type: 'highlight',  instruction: 'Slow push-in on pianist hands during intro',              note: 'Ambient audio only — no narration' },
      { index: 2, startTime: '01:20', endTime: '02:00', type: 'cut',        instruction: 'Drummer and bassist interplay close-up sequence',          note: 'Alternate between the two every 4 bars' },
      { index: 3, startTime: '02:15', endTime: '02:40', type: 'transition', instruction: 'Dissolve to wide club shot during guitar solo peak',       note: 'Color grade warm amber' },
      { index: 4, startTime: '02:45', endTime: '03:00', type: 'caption',    instruction: 'Song title and performer name lower-third',                note: 'Minimal sans-serif, white on dark' },
    ]
  );

  const edlHiphop = makeEdl(
    'Cypher Cut — Street Energy',
    'Rapid-fire editing synced to lyrical cadence, showcasing each MC\'s best 16 bars.',
    [
      { index: 1, startTime: '00:00', endTime: '00:25', type: 'highlight',  instruction: 'Crowd-hype opener — widest shot pulling back to reveal venue', note: 'Beat drop sync' },
      { index: 2, startTime: '00:40', endTime: '01:15', type: 'cut',        instruction: 'MC RYOTA first verse — tight face and hand gestures',        note: 'Cut on syllable stress points' },
      { index: 3, startTime: '01:30', endTime: '02:00', type: 'cut',        instruction: 'STREET PROPHET verse — alternate crowd reaction inserts',    note: '1-sec reaction cutaways' },
      { index: 4, startTime: '02:20', endTime: '02:50', type: 'highlight',  instruction: 'Final freestyle battle climax — multi-angle split',         note: 'Side-by-side if possible' },
      { index: 5, startTime: '02:50', endTime: '03:00', type: 'caption',    instruction: 'Hashtag and handle overlay as end card',                    note: 'Animated slide-in from left' },
    ]
  );

  const aiEditJobs = [
    // 1 — completed, revision 0
    {
      userId:        userIds[0],   // DJ KAZE
      videoUrl:      'https://pub-demo.r2.dev/rawstock/punk-set-raw.mp4',
      prompt:        'Highlight the most energetic 15 minutes. Focus on crowd reactions and peak performance moments.',
      status:        'completed',
      planMinutes:   15,
      videoUrls:     JSON.stringify(['https://pub-demo.r2.dev/rawstock/punk-set-raw.mp4']),
      logoUrl:       null,
      telop:         'YUKI BLAST — Club ACID 2026',
      targetAudience:'Fans',
      tone:          'Energetic',
      revisionCount: 0,
      ticketCost:    200,
      result:        edlPunk,
      deliveredUrl:  null,
      deliveredAt:   null,
    },
    // 2 — completed, revision 1
    {
      userId:        userIds[4],   // Guitar Sensei TARO
      videoUrl:      'https://pub-demo.r2.dev/rawstock/jazz-session-raw.mp4',
      prompt:        'Create a cinematic 30-minute edit that highlights the musical interplay and club atmosphere.',
      status:        'completed',
      planMinutes:   30,
      videoUrls:     JSON.stringify([
        'https://pub-demo.r2.dev/rawstock/jazz-session-cam1.mp4',
        'https://pub-demo.r2.dev/rawstock/jazz-session-cam2.mp4',
      ]),
      logoUrl:       'https://pub-demo.r2.dev/rawstock/logo-jazz.png',
      telop:         'Felix Krause Quartet — Blue Note Tokyo',
      targetAudience:'Adults (30s+)',
      tone:          'Cinematic',
      revisionCount: 1,
      ticketCost:    400,
      result:        edlJazz,
      deliveredUrl:  null,
      deliveredAt:   null,
    },
    // 3 — completed, revision 2
    {
      userId:        userIds[5],   // MC RYOTA
      videoUrl:      'https://pub-demo.r2.dev/rawstock/cypher-raw.mp4',
      prompt:        'Fast-cut cypher edit synced to the beat, 15 minutes max. Each MC gets equal screen time.',
      status:        'completed',
      planMinutes:   15,
      videoUrls:     JSON.stringify(['https://pub-demo.r2.dev/rawstock/cypher-raw.mp4']),
      logoUrl:       null,
      telop:         null,
      targetAudience:'Youth (teens–20s)',
      tone:          'Energetic',
      revisionCount: 2,
      ticketCost:    200,
      result:        edlHiphop,
      deliveredUrl:  null,
      deliveredAt:   null,
    },
    // 4 — approved
    {
      userId:        userIds[1],   // YUKI BLAST
      videoUrl:      'https://pub-demo.r2.dev/rawstock/punk-set-2-raw.mp4',
      prompt:        'Highlight reel for social media. Max 15 minutes, punchy and fast.',
      status:        'approved',
      planMinutes:   15,
      videoUrls:     JSON.stringify(['https://pub-demo.r2.dev/rawstock/punk-set-2-raw.mp4']),
      logoUrl:       null,
      telop:         'YUKI BLAST — Spring Tour 2026',
      targetAudience:'Fans',
      tone:          'Energetic',
      revisionCount: 0,
      ticketCost:    200,
      result:        edlPunk,
      deliveredUrl:  null,
      deliveredAt:   null,
    },
    // 5 — delivered (with deliveredUrl)
    {
      userId:        userIds[2],   // CutMaster KEN
      videoUrl:      'https://pub-demo.r2.dev/rawstock/festival-raw.mp4',
      prompt:        '30-minute festival recap. Multiple artists, diverse genres. Professional finish.',
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
      result:        edlJazz,
      deliveredUrl:  'https://pub-demo.r2.dev/rawstock/festival-final-edit.mp4',
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
