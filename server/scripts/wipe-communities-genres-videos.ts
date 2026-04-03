/**
 * コミュニティ・ジャンル・投稿を全て削除（ダミー含む）
 * 実行: npx tsx server/scripts/wipe-communities-genres-videos.ts
 */
import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon") ? { rejectUnauthorized: false } : false,
});

const statements = [
  "DELETE FROM reports WHERE content_type IN ('video', 'comment')",
  "DELETE FROM video_comments",
  "DELETE FROM jukebox_queue",
  "DELETE FROM jukebox_state",
  "DELETE FROM jukebox_chat",
  "DELETE FROM videos",
  "DELETE FROM community_moderators",
  "DELETE FROM community_members",
  "DELETE FROM community_votes",
  "DELETE FROM community_ads",
  "DELETE FROM video_editors",
  "DELETE FROM communities",
  "DELETE FROM genre_ads",
  "DELETE FROM genre_owners",
  "DELETE FROM liver_reviews",
  "DELETE FROM liver_availability",
  "DELETE FROM mentor_bookings",
  "DELETE FROM booking_sessions",
  "DELETE FROM live_streams",
  "DELETE FROM creators",
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL が設定されていません");
    process.exit(1);
  }
  const client = await pool.connect();
  try {
    for (const sql of statements) {
      const res = await client.query(sql);
      const table = sql.match(/DELETE FROM (\w+)/)?.[1] ?? "?";
      console.log(`✓ ${table}: ${res.rowCount ?? 0} 行削除`);
    }
    console.log("\n完了: コミュニティ・ジャンル・投稿を全て削除しました");
  } catch (e) {
    console.error("エラー:", e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
