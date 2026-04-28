export type StationRow = {
  id: number;
  name: string;
  category: string;
  members: number;
  thumbnail: string;
  online?: boolean;
};

/** カード下の短いジャンルラベル（日本語） */
export const STATION_CATEGORY_LABEL: Record<string, string> = {
  band_club_rave: "バンド系",
  streamer: "配信",
  ai_video_creator: "AI映像",
  visual_performer: "ビジュアル",
  mentor_expert: "知識",
  v_liver_avatar: "V配信",
  voice_artist: "ボイス",
  lifestyle_influencer: "ライフ",
  singer_idol: "歌手系",
  dance_performer: "ダンス",
};

/** 説明エリアのチップ行 */
export const STATION_SCENE_CHIPS: string[] = [
  "バンド",
  "ライバー",
  "AI動画",
  "ビジュアル",
  "メンター",
  "Vライバー",
  "ボイス",
  "ライフ",
  "歌手・アイドル",
  "ダンス",
];

/** 公式10ステーション（会員数は並び用のダミー同値） */
export const STATIONS: StationRow[] = [
  {
    id: 1,
    name: "バンド・クラブレイヴ系",
    category: "band_club_rave",
    members: 2400,
    online: true,
    thumbnail: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&h=800&q=80",
  },
  {
    id: 2,
    name: "ライバー / ストリーマー",
    category: "streamer",
    members: 2400,
    online: true,
    thumbnail: "https://images.unsplash.com/photo-1587614382346-4ec70e388b28?auto=format&fit=crop&w=800&h=800&q=80",
  },
  {
    id: 3,
    name: "AI動画クリエイター",
    category: "ai_video_creator",
    members: 2400,
    online: true,
    thumbnail: "https://images.unsplash.com/photo-1676299081847-824916de030a?auto=format&fit=crop&w=800&h=800&q=80",
  },
  {
    id: 4,
    name: "ビジュアル・パフォーマー",
    category: "visual_performer",
    members: 2400,
    online: true,
    thumbnail: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&h=800&q=80",
  },
  {
    id: 5,
    name: "メンター / 専門家",
    category: "mentor_expert",
    members: 2400,
    online: true,
    thumbnail: "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?auto=format&fit=crop&w=800&h=800&q=80",
  },
  {
    id: 6,
    name: "Vライバー / アバター",
    category: "v_liver_avatar",
    members: 2400,
    online: true,
    thumbnail: "https://images.unsplash.com/photo-1616469829941-c7200edec809?auto=format&fit=crop&w=800&h=800&q=80",
  },
  {
    id: 7,
    name: "ボイス・アーティスト",
    category: "voice_artist",
    members: 2400,
    online: true,
    thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&h=800&q=80",
  },
  {
    id: 8,
    name: "ライフスタイル・インフルエンサー",
    category: "lifestyle_influencer",
    members: 2400,
    online: true,
    thumbnail: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&h=800&q=80",
  },
  {
    id: 9,
    name: "歌手・アイドル系",
    category: "singer_idol",
    members: 2400,
    online: true,
    thumbnail: "https://images.unsplash.com/photo-1516280030429-27679b3dc9cf?auto=format&fit=crop&w=800&h=800&q=80",
  },
  {
    id: 10,
    name: "ダンス・パフォーマー",
    category: "dance_performer",
    members: 2400,
    online: true,
    thumbnail: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&h=800&q=80",
  },
];
