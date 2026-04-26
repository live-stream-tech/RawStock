export type StationRow = {
  id: number;
  name: string;
  category: string;
  members: number;
  thumbnail: string;
  online?: boolean;
};

export const STATIONS: StationRow[] = [
  { id: 1, name: "Hip-Hop Station", category: "hiphop", members: 6400, online: true, thumbnail: "https://picsum.photos/id/1027/800/800" },
  { id: 2, name: "Reggae / Dub Station", category: "reggae", members: 2800, online: true, thumbnail: "https://picsum.photos/id/1033/800/800" },
  { id: 3, name: "R&B / Neo Soul Station", category: "rnb", members: 3100, online: true, thumbnail: "https://picsum.photos/id/1062/800/800" },
  { id: 4, name: "Punk / Hardcore Station", category: "punk", members: 2500, online: true, thumbnail: "https://picsum.photos/id/1058/800/800" },
  { id: 5, name: "Metal / Loud Station", category: "metal", members: 2300, online: false, thumbnail: "https://picsum.photos/id/1068/800/800" },
  { id: 6, name: "Indie Rock Station", category: "indie", members: 3900, online: true, thumbnail: "https://picsum.photos/id/1043/800/800" },
  { id: 7, name: "Japan Indie Station", category: "indie", members: 4200, online: true, thumbnail: "https://picsum.photos/id/1047/800/800" },
  { id: 8, name: "Techno / House Station", category: "edm", members: 5200, online: true, thumbnail: "https://picsum.photos/id/1035/800/800" },
  { id: 9, name: "Drum & Bass Station", category: "edm", members: 3600, online: true, thumbnail: "https://picsum.photos/id/1036/800/800" },
  { id: 10, name: "Classical Station", category: "classical", members: 1800, online: false, thumbnail: "https://picsum.photos/id/1060/800/800" },
];

