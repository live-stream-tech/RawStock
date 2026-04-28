export type StationRow = {
  id: number;
  name: string;
  category: string;
  members: number;
  thumbnail: string;
  online?: boolean;
};

/** Short labels used for category matching. */
export const STATION_CATEGORY_LABEL: Record<string, string> = {
  music: "music",
  ai_video: "ai video",
  idol_influencer: "idol influencer",
  entertainment: "entertainment",
};

/** Chips used in station intro surfaces. */
export const STATION_SCENE_CHIPS: string[] = [
  "MUSIC",
  "AI VIDEO",
  "IDOL / INFLUENCER",
  "ENTERTAINMENT",
];

/** Official 4 stations. */
export const STATIONS: StationRow[] = [
  {
    id: 1,
    name: "MUSIC",
    category: "music",
    members: 2400,
    online: true,
    thumbnail: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&h=800&q=80",
  },
  {
    id: 2,
    name: "AI VIDEO",
    category: "ai_video",
    members: 2400,
    online: true,
    thumbnail: "https://images.unsplash.com/photo-1676299081847-824916de030a?auto=format&fit=crop&w=800&h=800&q=80",
  },
  {
    id: 3,
    name: "IDOL / INFLUENCER",
    category: "idol_influencer",
    members: 2400,
    online: true,
    thumbnail: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&h=800&q=80",
  },
  {
    id: 4,
    name: "ENTERTAINMENT",
    category: "entertainment",
    members: 2400,
    online: true,
    thumbnail: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&h=800&q=80",
  },
];
