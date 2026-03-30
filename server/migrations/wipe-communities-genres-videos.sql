-- コミュニティ・ジャンル・投稿を全て削除（ダミー含む）
-- Neon SQL Editor で実行してください
-- 外部キー参照順に削除

-- 1. 動画・投稿関連の子テーブル
DELETE FROM reports WHERE content_type IN ('video', 'comment');
DELETE FROM video_comments;
DELETE FROM jukebox_queue;
DELETE FROM jukebox_state;
DELETE FROM jukebox_chat;

-- 2. 投稿（動画）
DELETE FROM videos;

-- 3. コミュニティ関連の子テーブル
DELETE FROM community_moderators;
DELETE FROM community_members;
DELETE FROM community_votes;
DELETE FROM community_ads;
DELETE FROM video_editors;

-- 4. コミュニティ
DELETE FROM communities;

-- 5. ジャンル関連
DELETE FROM genre_ads;
DELETE FROM genre_owners;

-- 6. デモデータ（creators = livers の子テーブルを先に削除）
DELETE FROM liver_reviews;
DELETE FROM liver_availability;
DELETE FROM twoshot_bookings;
DELETE FROM booking_sessions;
DELETE FROM live_streams;
DELETE FROM creators;
