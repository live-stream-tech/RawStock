export type StationRow = {
  id: number;
  name: string;
  category: string;
  members: number;
  thumbnail: string;
  online?: boolean;
};

/** Ten official station themes. Same member baseline so no single row dominates sorting. */
export const STATIONS: StationRow[] = [
  { id: 1, name: "歌手アイドル", category: "idol_singer", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1027/800/800" },
  { id: 2, name: "クラブミュージック", category: "club_music", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1015/800/800" },
  { id: 3, name: "インディーズバンド", category: "indie_band", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1025/800/800" },
  { id: 4, name: "AIミュージック・ボカロ", category: "ai_music_vocaloid", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1031/800/800" },
  { id: 5, name: "Classic/World", category: "classic_world", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1040/800/800" },
  { id: 6, name: "インフルエンサー", category: "influencer", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1050/800/800" },
  { id: 7, name: "アニメ", category: "anime", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1060/800/800" },
  { id: 8, name: "AI動画", category: "ai_video", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1033/800/800" },
  { id: 9, name: "コメディアン", category: "comedian", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1043/800/800" },
  { id: 10, name: "演劇", category: "theater", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1047/800/800" },
];
