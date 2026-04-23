/**
 * コミュニティ作成時のデフォルトバナー／アイコン（プライマリジャンルに沿った Unsplash）。
 * クライアント・サーバ双方から import する。
 */

export type CommunityGenreKey =
  | "pop"
  | "rock"
  | "hiphop"
  | "edm"
  | "aimusic"
  | "jpop"
  | "rnb"
  | "jazz"
  | "indie"
  | "metal"
  | "classical"
  | "reggae"
  | "punk"
  | "default";

function u(photoSlug: string, w: number, h: number): string {
  return `https://images.unsplash.com/photo-${photoSlug}?w=${w}&h=${h}&fit=crop&q=80`;
}

/** 一覧・ヘッダー用（横長） — いずれも images.unsplash.com で 200 を確認済みの slug */
const BANNER: Record<CommunityGenreKey, string> = {
  pop: u("1492684223066-81342ee5ff30", 1200, 675),
  rock: u("1470229722913-7c0e2dbbafd3", 1200, 675),
  hiphop: u("1547355253-ff0740f6e8c1", 1200, 675),
  edm: u("1507878866276-a947ef722fee", 1200, 675),
  aimusic: u("1677442136019-21780ecad995", 1200, 675),
  jpop: u("1514525253161-7a46d19cd819", 1200, 675),
  rnb: u("1516280440614-37939bbacd81", 1200, 675),
  jazz: u("1516280440614-37939bbacd81", 1200, 675),
  indie: u("1498038432885-c6f3f1b912ee", 1200, 675),
  metal: u("1506157786151-b8491531f063", 1200, 675),
  classical: u("1465847899084-d164df4dedc6", 1200, 675),
  reggae: u("1511379938547-c1f69419868d", 1200, 675),
  punk: u("1501386761578-eac5c94b800a", 1200, 675),
  default: u("1516450360452-9312f5e86fc7", 1200, 675),
};

/** アイコン（正方形） — バナーと別カットで判別しやすく */
const ICON: Record<CommunityGenreKey, string> = {
  pop: u("1516280440614-37939bbacd81", 512, 512),
  rock: u("1506157786151-b8491531f063", 512, 512),
  hiphop: u("1547355253-ff0740f6e8c1", 512, 512),
  edm: u("1558618666-fcd25c85cd64", 512, 512),
  aimusic: u("1677442136019-21780ecad995", 512, 512),
  jpop: u("1492684223066-81342ee5ff30", 512, 512),
  rnb: u("1511379938547-c1f69419868d", 512, 512),
  jazz: u("1507838153414-b4b713384a76", 512, 512),
  indie: u("1517457373958-b7bdd4587205", 512, 512),
  metal: u("1501386761578-eac5c94b800a", 512, 512),
  classical: u("1507838153414-b4b713384a76", 512, 512),
  reggae: u("1511379938547-c1f69419868d", 512, 512),
  punk: u("1470229722913-7c0e2dbbafd3", 512, 512),
  default: u("1514525253161-7a46d19cd819", 512, 512),
};

/** 作成画面の候補ラベルや自由入力からジャンルキーを推定 */
export function inferCommunityGenreKey(primaryCategory: string): CommunityGenreKey {
  const s = primaryCategory.toLowerCase().replace(/[＆]/g, "&").replace(/\s+/g, " ").trim();
  if (!s) return "default";

  if (/ai\s*music|ai\s*音楽|aimusic|生成/.test(s)) return "aimusic";
  if (/j[\s-]?pop|jpop|ジェイポップ|アイドル/.test(s)) return "jpop";
  if (/hip[\s-]?hop|hiphop|ラップ|rap|トラップ|trap/.test(s)) return "hiphop";
  if (/r\s*&\s*b|rnb|neo|ソウル|soul/.test(s)) return "rnb";
  if (/edm|エレクトロ|electro|house|テクノ|techno|dubstep|ガラージ|garage|トランス|trance/.test(s)) return "edm";
  if (/ドラム|d\s*&\s*b|drum\s*&\s*bass|uk\s*bass|ジャングル|jungle|^bass$/.test(s)) return "edm";
  if (/メタル|metal|ヘヴィ|heavy|ブラック|デス|スラッシュ/.test(s)) return "metal";
  if (/パンク|punk|ハードコア|hardcore/.test(s)) return "punk";
  if (/レゲエ|reggae|ダブ|dub|スカ|ska/.test(s)) return "reggae";
  if (/クラシック|classical|オーケストラ|管弦|ピアノ独奏/.test(s)) return "classical";
  if (/ジャズ|jazz/.test(s)) return "jazz";
  if (/インディ|indie|シューゲ|shoegaze|オルタナ|alternative/.test(s)) return "indie";
  if (/ロック|rock/.test(s)) return "rock";
  if (/ポップ|pop/.test(s)) return "pop";

  if (s.includes("hiphop") || s.includes("hip-hop")) return "hiphop";
  if (s.includes("metal")) return "metal";
  if (s.includes("indie")) return "indie";
  if (s.includes("jazz")) return "jazz";
  if (s.includes("edm")) return "edm";
  if (s.includes("rock")) return "rock";
  if (s.includes("pop")) return "pop";

  return "default";
}

export function getCommunityDefaultAssets(primaryCategory: string): {
  bannerUrl: string;
  iconUrl: string;
  genreKey: CommunityGenreKey;
} {
  const genreKey = inferCommunityGenreKey(primaryCategory);
  return {
    bannerUrl: BANNER[genreKey],
    iconUrl: ICON[genreKey],
    genreKey,
  };
}
