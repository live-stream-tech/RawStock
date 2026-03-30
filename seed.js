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

  const users = [
    ['email:artist1@rawstock.uk', 'DJ KAZE', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', 'ARTIST', 'Tokyo-based DJ. Techno / House / Ambient. Playing underground since 2019.'],
    ['email:artist2@rawstock.uk', 'YUKI BLAST', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop', 'ARTIST', 'Punk vocalist. Raw energy, no filters.'],
    ['email:editor1@rawstock.uk', 'CutMaster KEN', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', 'EDITOR', 'Video editor specializing in live music footage. 3 years of concert films.'],
    ['email:fan1@rawstock.uk', 'Scene Builder MIKA', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop', 'USER', 'Underground music fan. Community organizer for Tokyo indie scene.'],
    ['email:tutor1@rawstock.uk', 'Guitar Sensei TARO', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop', 'ARTIST', 'Guitar instructor. 15 years of experience. Jazz, Blues, Rock.'],
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

  const communities = [
    ['Tokyo Underground', 842, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop', true, 'electronic'],
    ['Punk Raw Tokyo', 356, 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=300&fit=crop', true, 'punk'],
    ['Jazz Night Sessions', 214, 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=300&fit=crop', false, 'jazz'],
    ['HIP-HOP Cypher', 1203, 'https://images.unsplash.com/photo-1571609803939-54f463c1752e?w=400&h=300&fit=crop', true, 'hiphop'],
    ['Indie Rock Basement', 489, 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&h=300&fit=crop', false, 'rock'],
    ['R&B Vibes', 678, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop', true, 'rnb'],
    ['Metal Underground', 321, 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop', false, 'metal'],
    ['World Music Exchange', 167, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=300&fit=crop', false, 'world'],
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

  const videos = [
    ['DJ KAZE - Live at Shibuya Warehouse', 'DJ KAZE', 'Tokyo Underground', 12400, '2h ago', '45:12', 500, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', 1, true, 'work'],
    ['YUKI BLAST - Punk Set at Club ACID', 'YUKI BLAST', 'Punk Raw Tokyo', 8200, '5h ago', '32:08', 300, 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop', 2, true, 'work'],
    ['Late Night Jazz Jam - Shinjuku Blue Note', 'Guitar Sensei TARO', 'Jazz Night Sessions', 3100, '1d ago', '1:12:33', 800, 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop', 3, true, 'work'],
    ['Freestyle Cypher - Shibuya Station', 'MC RYOTA', 'HIP-HOP Cypher', 22800, '3h ago', '18:45', null, 'https://images.unsplash.com/photo-1571609803939-54f463c1752e?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', 4, true, 'daily'],
    ['Basement Show Highlights - March 2026', 'CutMaster KEN', 'Indie Rock Basement', 6700, '12h ago', '8:22', 200, 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', 5, true, 'work'],
    ['Soundcheck Vibes', 'DJ KAZE', 'Tokyo Underground', 1400, '30m ago', '2:15', null, 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', null, false, 'daily'],
    ['Guitar Technique: Pentatonic Mastery', 'Guitar Sensei TARO', 'Jazz Night Sessions', 4500, '2d ago', '22:10', 1500, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop', null, false, 'work'],
    ['R&B Soul Session - Roppongi Hills', 'DJ KAZE', 'R&B Vibes', 9300, '6h ago', '55:42', 600, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', 6, true, 'work'],
  ];

  for (const v of videos) {
    await pool.query(
      `INSERT INTO videos (title, creator, community, views, time_ago, duration, price, thumbnail, avatar, rank, is_ranked, post_type, user_id, community_id, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'community')`,
      [...v, userIds[0], communityIds[0]]
    );
    console.log('Video:', v[0]);
  }

  const creators = [
    ['DJ KAZE', 'Tokyo Underground', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', 1, 98.5, 34200, 128000, 24, 1250, 90, 4.9, 0.95, 'Tokyo-based DJ', 'electronic'],
    ['YUKI BLAST', 'Punk Raw Tokyo', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop', 2, 92.3, 21800, 85000, 18, 890, 85, 4.7, 0.88, 'Punk vocalist', 'punk'],
    ['Guitar Sensei TARO', 'Jazz Night Sessions', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop', 3, 87.1, 15600, 62000, 12, 560, 90, 4.8, 0.92, 'Jazz guitar instructor', 'jazz'],
    ['MC RYOTA', 'HIP-HOP Cypher', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', 4, 85.0, 42000, 95000, 30, 2100, 80, 4.6, 0.82, 'Freestyle MC', 'hiphop'],
    ['CutMaster KEN', 'Indie Rock Basement', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', 5, 78.4, 8900, 45000, 8, 340, 90, 4.5, 0.90, 'Video editor', 'rock'],
  ];

  for (const c of creators) {
    await pool.query(
      `INSERT INTO creators (name, community, avatar, rank, heat_score, total_views, revenue, stream_count, followers, revenue_share, satisfaction_score, attendance_rate, bio, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, c
    );
    console.log('Creator:', c[0]);
  }

  const sessions = [
    ['DJ KAZE', 'electronic', 'Electronic', 'DJ KAZE Private Mix Session', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=200&fit=crop', '2026-04-01', '22:00', '30min', 5000, 10, 7, 4.9, 124, 'NEW'],
    ['YUKI BLAST', 'punk', 'Punk', 'Vocal Coaching - Raw Energy', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=200&fit=crop', '2026-04-02', '19:00', '15min', 3000, 8, 5, 4.7, 67, null],
    ['Guitar Sensei TARO', 'jazz', 'Jazz Guitar', 'Jazz Improv Lesson', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop', 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=300&h=200&fit=crop', '2026-04-03', '20:00', '45min', 8000, 5, 3, 5.0, 42, 'POPULAR'],
    ['MC RYOTA', 'hiphop', 'HIP-HOP', 'Freestyle Battle Coaching', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', 'https://images.unsplash.com/photo-1571609803939-54f463c1752e?w=300&h=200&fit=crop', '2026-04-05', '21:00', '20min', 4000, 12, 9, 4.8, 89, null],
  ];

  for (const s of sessions) {
    await pool.query(
      `INSERT INTO booking_sessions (creator, category, category_label, title, avatar, thumbnail, date, time, duration, price, spots_total, spots_left, rating, review_count, tag)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, s
    );
    console.log('Session:', s[0]);
  }

  console.log('\nSeed complete! RawStock is ready.');
  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
