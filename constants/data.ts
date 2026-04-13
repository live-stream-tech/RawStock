export type Video = {
  id: string;
  title: string;
  creator: string;
  community: string;
  views: number;
  timeAgo: string;
  duration: string;
  price: number | null;
  thumbnail: string;
  avatar: string;
  rank?: number;
};

export type LiveStream = {
  id: string;
  title: string;
  creator: string;
  community: string;
  viewers: number;
  thumbnail: string;
  avatar: string;
  timeAgo: string;
};

export type Community = {
  id: string;
  name: string;
  members: number;
  thumbnail: string;
  online: boolean;
  category: string;
};

export type BookingSession = {
  id: string;
  creator: string;
  category: string;
  categoryLabel: string;
  title: string;
  avatar: string;
  thumbnail: string;
  date: string;
  time: string;
  duration: string;
  price: number;
  spotsTotal: number;
  spotsLeft: number;
  rating: number;
  reviewCount: number;
  tag?: string;
};

export const BOOKING_SESSIONS: BookingSession[] = [
  {
    id: "b1",
    creator: "Emily Sensei",
    category: "english",
    categoryLabel: "English",
    title: "Business English — 1:1 lesson",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=225&fit=crop",
    date: "Sun 3/2",
    time: "19:00",
    duration: "60 min",
    price: 3000,
    spotsTotal: 1,
    spotsLeft: 1,
    rating: 4.9,
    reviewCount: 328,
    tag: "Top pick",
  },
  {
    id: "b2",
    creator: "Miku, Psychologist",
    category: "counselor",
    categoryLabel: "Counselor",
    title: "Talk session — stress & mental wellness",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=225&fit=crop",
    date: "Sat 3/1",
    time: "21:00",
    duration: "45 min",
    price: 5000,
    spotsTotal: 3,
    spotsLeft: 1,
    rating: 4.8,
    reviewCount: 215,
  },
  {
    id: "b3",
    creator: "Rin Hoshizora",
    category: "fortune",
    categoryLabel: "Fortune",
    title: "Tarot & astrology live reading",
    avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=225&fit=crop",
    date: "Fri 2/28",
    time: "22:00",
    duration: "30 min",
    price: 2000,
    spotsTotal: 10,
    spotsLeft: 3,
    rating: 4.7,
    reviewCount: 891,
    tag: "Almost full",
  },
  {
    id: "b4",
    creator: "Alice Oka",
    category: "idol",
    categoryLabel: "Idol",
    title: "Premium two-shot & mini live",
    avatar: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=100&h=100&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=225&fit=crop",
    date: "Mon 3/3",
    time: "20:00",
    duration: "20 min",
    price: 8000,
    spotsTotal: 5,
    spotsLeft: 2,
    rating: 5.0,
    reviewCount: 143,
    tag: "Limited",
  },
  {
    id: "b5",
    creator: "Haruka, Chef",
    category: "cooking",
    categoryLabel: "Cooking",
    title: "Cook-along — authentic Japanese dinner",
    avatar: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=100&h=100&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=225&fit=crop",
    date: "Sun 3/2",
    time: "11:00",
    duration: "90 min",
    price: 1500,
    spotsTotal: 20,
    spotsLeft: 8,
    rating: 4.6,
    reviewCount: 74,
  },
  {
    id: "b6",
    creator: "Kenji, Life Coach",
    category: "coaching",
    categoryLabel: "Coaching",
    title: "Goals & career coaching session",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=225&fit=crop",
    date: "Tue 3/4",
    time: "20:30",
    duration: "60 min",
    price: 4000,
    spotsTotal: 1,
    spotsLeft: 1,
    rating: 4.9,
    reviewCount: 56,
  },
  {
    id: "b7",
    creator: "Nana, Yoga Instructor",
    category: "yoga",
    categoryLabel: "Yoga",
    title: "Morning yoga & meditation (group)",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=225&fit=crop",
    date: "Sat 3/1",
    time: "07:30",
    duration: "45 min",
    price: 800,
    spotsTotal: 30,
    spotsLeft: 14,
    rating: 4.8,
    reviewCount: 203,
  },
];

export type Creator = {
  id: string;
  name: string;
  community: string;
  avatar: string;
  rank: number;
  heatScore: number;
  totalViews: number;
  revenue: number;
  streamCount: number;
  followers: number;
  revenueShare: number;
};

export const VIDEOS: Video[] = [
  {
    id: "1",
    title: "Behind the scenes: making a new track",
    creator: "J-Pop Circle",
    community: "J-Pop Circle",
    views: 3421,
    timeAgo: "2h ago",
    duration: "12:34",
    price: 500,
    thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop",
  },
  {
    id: "2",
    title: "Acoustic live (free)",
    creator: "J-Pop Circle",
    community: "J-Pop Circle",
    views: 4532,
    timeAgo: "5h ago",
    duration: "18:22",
    price: null,
    thumbnail: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=50&h=50&fit=crop",
  },
  {
    id: "3",
    title: "Chopin études explained",
    creator: "Piano Circle",
    community: "Piano Circle",
    views: 2891,
    timeAgo: "7h ago",
    duration: "24:15",
    price: 400,
    thumbnail: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop",
  },
  {
    id: "4",
    title: "Supercar test drive review (free)",
    creator: "Car Enthusiasts",
    community: "Car Enthusiasts",
    views: 5234,
    timeAgo: "4h ago",
    duration: "31:42",
    price: null,
    thumbnail: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop",
  },
];

export const LIVE_STREAMS: LiveStream[] = [
  {
    id: "1",
    title: "Live: new song debut + raffle",
    creator: "Miyu Hoshizora",
    community: "Underground Idols",
    viewers: 3453,
    thumbnail: "https://images.unsplash.com/photo-1524503033411-c9566986fc8f?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop",
    timeAgo: "Live · started 30m ago",
  },
  {
    id: "2",
    title: "After-school chat — AMA",
    creator: "Maimai, 17",
    community: "Daily Vlog Circle",
    viewers: 2821,
    thumbnail: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&h=50&fit=crop",
    timeAgo: "Live · started 15m ago",
  },
  {
    id: "3",
    title: "Get-ready live — makeup before work",
    creator: "REIKA",
    community: "Nightlife Hosts",
    viewers: 4176,
    thumbnail: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=50&h=50&fit=crop",
    timeAgo: "Live · started 45m ago",
  },
  {
    id: "4",
    title: "Improv comedy from audience prompts",
    creator: "Comedy duo \"Double Punch\"",
    community: "Comedy Circle",
    viewers: 5245,
    thumbnail: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&h=50&fit=crop",
    timeAgo: "Live · started 20m ago",
  },
  {
    id: "5",
    title: "Rehearsal room live",
    creator: "Hoshizora Troupe",
    community: "Theater Circle",
    viewers: 1823,
    thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=50&h=50&fit=crop",
    timeAgo: "Live · started 10m ago",
  },
];

export const RANKED_VIDEOS: Video[] = [
  {
    id: "r1",
    rank: 1,
    title: "MV behind the scenes",
    creator: "J-Pop Circle",
    community: "J-Pop Circle",
    views: 45234,
    timeAgo: "1w ago",
    duration: "24:15",
    price: 800,
    thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop",
  },
  {
    id: "r2",
    rank: 2,
    title: "World supercar tour (full)",
    creator: "Car Enthusiasts",
    community: "Car Enthusiasts",
    views: 38921,
    timeAgo: "5d ago",
    duration: "48:30",
    price: 1200,
    thumbnail: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop",
  },
  {
    id: "r3",
    rank: 3,
    title: "Liszt technical studies walkthrough",
    creator: "Piano Circle",
    community: "Piano Circle",
    views: 32156,
    timeAgo: "3d ago",
    duration: "18:22",
    price: 600,
    thumbnail: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=225&fit=crop",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop",
  },
];

export const COMMUNITIES: Community[] = [
  {
    id: "1",
    name: "Underground Idols",
    members: 185000,
    thumbnail: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop",
    online: true,
    category: "Music",
  },
  {
    id: "2",
    name: "Nightlife Hosts",
    members: 167000,
    thumbnail: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop",
    online: true,
    category: "Lifestyle",
  },
  {
    id: "3",
    name: "J-Pop Circle",
    members: 125000,
    thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    online: false,
    category: "Music",
  },
  {
    id: "4",
    name: "Daily Vlog Circle",
    members: 142000,
    thumbnail: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=400&h=400&fit=crop",
    online: false,
    category: "Lifestyle",
  },
  {
    id: "5",
    name: "Comedy Circle",
    members: 98000,
    thumbnail: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=400&h=400&fit=crop",
    online: true,
    category: "Arts",
  },
  {
    id: "6",
    name: "Piano Circle",
    members: 89000,
    thumbnail: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=400&fit=crop",
    online: false,
    category: "Music",
  },
];

export const CREATORS: Creator[] = [
  {
    id: "1",
    rank: 1,
    name: "Miyu Hoshizora",
    community: "Underground Idols",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    heatScore: 1090.1,
    totalViews: 185320,
    revenue: 173000,
    streamCount: 34,
    followers: 48000,
    revenueShare: 80,
  },
  {
    id: "2",
    rank: 2,
    name: "Comedy duo \"Double Punch\"",
    community: "Comedy Circle",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    heatScore: 923.5,
    totalViews: 172450,
    revenue: 119000,
    streamCount: 45,
    followers: 92000,
    revenueShare: 80,
  },
  {
    id: "3",
    rank: 3,
    name: "REIKA",
    community: "Nightlife Hosts",
    avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop",
    heatScore: 1414.0,
    totalViews: 164800,
    revenue: 165000,
    streamCount: 52,
    followers: 67000,
    revenueShare: 80,
  },
  {
    id: "4",
    rank: 4,
    name: "Maimai, 17",
    community: "Daily Vlog Circle",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop",
    heatScore: 865.7,
    totalViews: 148900,
    revenue: 85500,
    streamCount: 68,
    followers: 52000,
    revenueShare: 80,
  },
];

export const FOLLOWING_FEED = [
  {
    id: "1",
    creator: "Miyu Hoshizora",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop",
    content: "Wrapped rehearsal for tomorrow's one-man live—can't wait to see everyone!",
    timeAgo: "2h ago",
  },
  {
    id: "2",
    creator: "Maimai, 17",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&h=50&fit=crop",
    content: "Tests today were rough—photo booth after school to reset the mood.",
    timeAgo: "6h ago",
  },
  {
    id: "3",
    creator: "Comedy duo \"Double Punch\"",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&h=50&fit=crop",
    content: "New sketch is done—premiere this weekend at the theater. We're gonna crush it.",
    timeAgo: "8h ago",
  },
];
