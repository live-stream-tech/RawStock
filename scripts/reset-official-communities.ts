/**
 * 公式コミュニティ再構築スクリプト
 * 実行: npx tsx scripts/reset-official-communities.ts
 *
 * 方針:
 * - 既存のコミュニティ関連ダミーデータを全削除
 * - 公式コミュニティ10件を再投入（idempotentに近い運用のため毎回全再構築）
 * - 画像はフリー素材URL（Unsplash）
 */
import "dotenv/config";
import { Pool } from "pg";

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
  announcementTitle: string;
  announcementBody: string;
};

const OFFICIAL_COMMUNITIES: OfficialCommunity[] = [
  {
    name: "Underground Hip-Hop",
    category: "hiphop",
    members: 2860,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1547355253-ff0740f6e8c1?w=800&h=800&fit=crop",
    announcementTitle: "今週のアンダーグラウンドライブ情報",
    announcementBody:
      "ローカル箱・フリースタイルイベント・ビートライブの告知をこのスレに集約してください。開催日、場所、出演者、チケットリンクを明記すると見つけやすくなります。",
  },
  {
    name: "Mainstream Hip-Hop / Dancehall",
    category: "hiphop",
    members: 3540,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=800&fit=crop",
    announcementTitle: "今週のメインストリーム Hip-Hop / Dancehall",
    announcementBody:
      "大型イベント、人気クルー、話題公演の情報を優先して投稿してください。先行販売・一般販売の区別がある場合は本文で分かるように記載してください。",
  },
  {
    name: "Reggae / Dub",
    category: "reggae",
    members: 1720,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&h=800&fit=crop",
    announcementTitle: "Reggae / Dub ライブ告知",
    announcementBody:
      "セレクターイベント、サウンドシステム、Dubセッションの開催情報を共有しましょう。深夜帯イベントは開始・終了時刻も明記してください。",
  },
  {
    name: "R&B / Neo Soul",
    category: "rnb",
    members: 1980,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&h=800&fit=crop",
    announcementTitle: "R&B / Neo Soul の公演情報",
    announcementBody:
      "ライブハウス、ラウンジ、セッションイベントの告知をまとめるスレです。出演者のSNS・音源リンクがあると初見ユーザーにも伝わりやすいです。",
  },
  {
    name: "Punk / Hardcore",
    category: "punk",
    members: 1660,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&h=800&fit=crop",
    announcementTitle: "Punk / Hardcore 現場速報",
    announcementBody:
      "DIY企画、対バン、地方遠征を含むライブ情報を投稿してください。フライヤー画像とタイムテーブルを添えると参加判断がしやすくなります。",
  },
  {
    name: "Metal / Loud",
    category: "metal",
    members: 1490,
    online: false,
    thumbnail:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&h=800&fit=crop",
    announcementTitle: "Metal / Loud 公演カレンダー",
    announcementBody:
      "重低音系、ラウド系、メタル系の公演情報を集約します。年齢制限や入場条件がある場合は必ず本文に記載してください。",
  },
  {
    name: "Shoegaze / Indie Rock",
    category: "indie",
    members: 1840,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&h=800&fit=crop",
    announcementTitle: "Shoegaze / Indie Rock 告知スレ",
    announcementBody:
      "国内外のインディー公演、リリースパーティー、レコ発情報を共有してください。映像アーカイブ販売の告知も歓迎です。",
  },
  {
    name: "Techno / House",
    category: "edm",
    members: 3010,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1571266028243-d220c9d4bb31?w=800&h=800&fit=crop",
    announcementTitle: "Techno / House ライブ&パーティー情報",
    announcementBody:
      "クラブイベント、ライブセット、デイイベントの告知を投稿してください。会場規模と出演時間を記載すると比較しやすくなります。",
  },
  {
    name: "Drum & Bass / UK Bass",
    category: "bass",
    members: 1570,
    online: true,
    thumbnail:
      "https://images.unsplash.com/photo-1507878866276-a947ef722fee?w=800&h=800&fit=crop",
    announcementTitle: "Drum & Bass / UK Bass 告知",
    announcementBody:
      "DnB、Jungle、UK Bass周辺のイベント情報を集めるスレです。BPM帯やサブジャンルを書いておくと検索しやすくなります。",
  },
  {
    name: "Classical",
    category: "classical",
    members: 1320,
    online: false,
    thumbnail:
      "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&h=800&fit=crop",
    announcementTitle: "Classical 公演・演奏会情報",
    announcementBody:
      "オーケストラ、室内楽、ソロリサイタルなどの公演情報を投稿してください。会場音響や撮影可否の情報もあれば追記をお願いします。",
  },
];

const DELETE_STATEMENTS = [
  "DELETE FROM reports WHERE content_type IN ('video', 'comment')",
  "DELETE FROM video_comments",
  "DELETE FROM community_thread_posts",
  "DELETE FROM community_poll_votes",
  "DELETE FROM community_poll_options",
  "DELETE FROM community_polls",
  "DELETE FROM community_threads",
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
      throw new Error("users テーブルにユーザーが存在しません。先に管理ユーザーを作成してください。");
    }
    return [fallbackRes.rows[0].id as number];
  } finally {
    client.release();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL が設定されていません");
    process.exit(1);
  }

  const adminUserIds = await pickAdminUserIds();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("🧹 既存コミュニティ関連データを削除中...");
    for (const sql of DELETE_STATEMENTS) {
      const res = await client.query(sql);
      const table = sql.match(/DELETE FROM (\w+)/)?.[1] ?? "?";
      console.log(`  ✓ ${table}: ${res.rowCount ?? 0} 行削除`);
    }

    console.log("\n🏘️ 公式コミュニティ10件を投入中...");
    for (let i = 0; i < OFFICIAL_COMMUNITIES.length; i++) {
      const community = OFFICIAL_COMMUNITIES[i];
      const adminUserId = adminUserIds[i % adminUserIds.length];
      const commRes = await client.query(
        `INSERT INTO communities
          (name, members, thumbnail, online, category, admin_id, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          community.name,
          community.members,
          community.thumbnail,
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

      await client.query(
        `INSERT INTO community_threads (community_id, author_user_id, title, body, pinned)
         VALUES ($1, $2, $3, $4, true)`,
        [
          communityId,
          adminUserId,
          community.announcementTitle,
          community.announcementBody,
        ]
      );

      console.log(`  ✓ ${community.name}`);
    }

    await client.query("COMMIT");
    console.log("\n✅ 完了: 公式コミュニティ10件へ再構築しました");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("エラー:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
