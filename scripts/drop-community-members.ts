/**
 * community_members テーブルを削除する（型不一致で push が通らない場合の一時対応）
 * 実行: npx tsx scripts/drop-community-members.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config(); // .env も読む
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("neon") ? { rejectUnauthorized: false } : false,
  });
  try {
    await pool.query('DROP TABLE IF EXISTS "community_members" CASCADE');
    console.log("Dropped table community_members");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
