export type StationRow = {
  id: number;
  name: string;
  category: string;
  members: number;
  thumbnail: string;
  online?: boolean;
};

/** Ten official hub labels (Japan-first scenes, not music-only). Same member baseline so no single row dominates sorting. */
export const STATIONS: StationRow[] = [
  { id: 1, name: "祭礼・まつり（神輿・屋台）", category: "matsuri", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1027/800/800" },
  { id: 2, name: "神社仏閣・年中行事", category: "shrine", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1015/800/800" },
  { id: 3, name: "学校文化（演劇・部活・文化祭）", category: "school", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1025/800/800" },
  { id: 4, name: "落語・講談・寄席", category: "yose", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1031/800/800" },
  { id: 5, name: "ライブハウス・アイドル現場", category: "livehouse", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1040/800/800" },
  { id: 6, name: "茶道・武道・伝統芸能", category: "dougei", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1050/800/800" },
  { id: 7, name: "同人・コミケ・創作即売", category: "doujin", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1060/800/800" },
  { id: 8, name: "野球・スポーツ観戦・応援", category: "sports", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1033/800/800" },
  { id: 9, name: "マルシェ・地方創生・町おこし", category: "machi", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1043/800/800" },
  { id: 10, name: "美術・展示・ギャラリー", category: "gallery", members: 2400, online: true, thumbnail: "https://picsum.photos/id/1047/800/800" },
];
