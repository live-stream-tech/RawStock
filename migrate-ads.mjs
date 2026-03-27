import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    // communityAds に新カラムを追加
    await client.query(`ALTER TABLE community_ads ADD COLUMN IF NOT EXISTS member_count_at_booking INTEGER`);
    await client.query(`ALTER TABLE community_ads ADD COLUMN IF NOT EXISTS agreed_to_terms BOOLEAN NOT NULL DEFAULT FALSE`);
    await client.query(`ALTER TABLE community_ads ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT`);
    await client.query(`ALTER TABLE community_ads ADD COLUMN IF NOT EXISTS image_url TEXT`);
    await client.query(`ALTER TABLE community_ads ADD COLUMN IF NOT EXISTS link_url TEXT`);
    console.log("✓ community_ads updated");

    // genreAds に新カラムを追加
    await client.query(`ALTER TABLE genre_ads ADD COLUMN IF NOT EXISTS member_count_at_booking INTEGER`);
    await client.query(`ALTER TABLE genre_ads ADD COLUMN IF NOT EXISTS agreed_to_terms BOOLEAN NOT NULL DEFAULT FALSE`);
    await client.query(`ALTER TABLE genre_ads ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT`);
    await client.query(`ALTER TABLE genre_ads ADD COLUMN IF NOT EXISTS image_url TEXT`);
    await client.query(`ALTER TABLE genre_ads ADD COLUMN IF NOT EXISTS link_url TEXT`);
    console.log("✓ genre_ads updated");

    // 収益分配設定テーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_ad_revenue_settings (
        id SERIAL PRIMARY KEY,
        community_id INTEGER NOT NULL UNIQUE,
        owner_share INTEGER NOT NULL DEFAULT 100,
        moderator_shares TEXT NOT NULL DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✓ community_ad_revenue_settings created");

    // genre_owners に community_id / assigned_community_id カラムを追加
    await client.query(`ALTER TABLE genre_owners ADD COLUMN IF NOT EXISTS community_id INTEGER`);
    await client.query(`ALTER TABLE genre_owners ADD COLUMN IF NOT EXISTS assigned_community_id INTEGER`);
    console.log("✓ genre_owners updated");

    // communities に revenue_distribution カラムを追加
    await client.query(`ALTER TABLE communities ADD COLUMN IF NOT EXISTS revenue_distribution TEXT`);
    console.log("✓ communities updated");

    console.log("Migration complete!");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
