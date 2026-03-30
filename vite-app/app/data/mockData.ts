export interface User {
  id: string;
  name: string;
  avatar: string;
  followers: number;
  following: number;
  enneagramScores: number[]; // 9 values for enneagram
  isSupporter: boolean;
  supporterLevel: number;
  bio?: string; // 自己紹介文
  gender?: string; // 性別
  age?: number; // 年齢
  totalPosts?: number; // 投稿数
  totalLives?: number; // ライブ配信数
  isLoggedIn?: boolean;
  isKycVerified?: boolean;
}

export interface Community {
  id: string;
  name: string;
  avatar: string;
  coverImage: string;
  followers: number;
  description: string;
  category: string; // ジャンル分類
}

export interface Creator {
  id: string;
  name: string;
  avatar: string;
  communityId: string;
  followers: number;
  bio: string;
  totalPosts: number;
}

export interface ActivityCard {
  id: string;
  communityId: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  photos: string[];
  title: string;
  description: string;
  comments: Comment[];
  isPurchased: boolean;
  price: number;
  views: number;
  timestamp: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  type: "info" | "update" | "event";
}

export interface LiveStream {
  id: string;
  communityId: string;
  communityName: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  title: string;
  thumbnail: string;
  currentViewers: number;
  startedAt: string;
}

export interface VideoContent {
  id: string;
  communityId: string;
  communityName: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  title: string;
  thumbnail: string;
  views: number;
  price: number;
  uploadedAt: string;
  duration: string;
}

export interface CreatorRanking {
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  communityId: string;
  communityName: string;
  totalLiveViewers: number;
  liveCount: number;
  followers: number;
  revenueShare: number;
  totalTips: number;
  paidLiveRevenue: number; // 有料ライブの収益
  heatScore?: number;
}

export interface Notification {
  id: string;
  type: "follow" | "like" | "comment" | "revenue" | "system";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  avatar?: string;
  amount?: number;
}

export interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface VideoEditor {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  portfolio: string[]; // URLs to sample work
  rating: number; // 0-5
  completedJobs: number;
  averageTurnaround: string; // e.g., "2-3日"
  specialties: string[]; // e.g., ["JPOP", "アニメ", "ゲーム"]
  paymentType: "upfront" | "revenue_share"; // upfront = 前払い, revenue_share = レベニューシェア
  pricePerMinute: number; // For upfront payment type (0 for revenue_share)
  revenueShare: number; // Percentage they receive (10% for upfront, 15-20% for revenue_share)
  isAvailable: boolean;
}

export interface EditRequest {
  id: string;
  liveStreamId: string;
  liveStreamTitle: string;
  creatorId: string;
  creatorName: string;
  editorId: string;
  editorName: string;
  editorAvatar: string;
  status: "pending" | "in_progress" | "completed" | "delivered";
  requestedAt: string;
  completedAt?: string;
  estimatedDuration: string;
  price: number;
  revenueShareBreakdown: {
    creator: number; // 40%
    editor: number; // 10%
    supporter: number; // 20%
  };
}

export const currentUser: User = {
  id: "user1",
  name: "山田太郎",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
  followers: 1234,
  following: 567,
  enneagramScores: [8, 6, 7, 5, 9, 4, 6, 7, 8],
  isSupporter: true,
  supporterLevel: 3,
  bio: "音楽と旅行が大好き！",
  gender: "男性",
  age: 28,
  totalPosts: 15,
  totalLives: 5,
  isLoggedIn: true,
  isKycVerified: false, // デフォルトでは未認証
};

export const allUsers: User[] = [
  {
    id: "u1",
    name: "星空みゆ",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    followers: 45200,
    following: 234,
    enneagramScores: [7, 8, 9, 6, 5, 7, 8, 9, 6],
    isSupporter: false,
    supporterLevel: 0,
    bio: "地下アイドルやってます！ライブ来てね✨",
    gender: "女性",
    age: 21,
    totalPosts: 342,
    totalLives: 89,
  },
  {
    id: "u2",
    name: "まいまい17歳",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    followers: 28900,
    following: 456,
    enneagramScores: [8, 7, 6, 9, 8, 7, 5, 6, 7],
    isSupporter: false,
    supporterLevel: 0,
    bio: "JKです📱毎日配信してるよ〜",
    gender: "女性",
    age: 17,
    totalPosts: 567,
    totalLives: 234,
  },
  {
    id: "u3",
    name: "麗華 -REIKA-",
    avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop",
    followers: 67800,
    following: 123,
    enneagramScores: [9, 8, 7, 8, 9, 6, 7, 8, 5],
    isSupporter: true,
    supporterLevel: 5,
    bio: "六本木のキャバ嬢💋メイク・ファッション配信",
    gender: "女性",
    age: 25,
    totalPosts: 289,
    totalLives: 156,
  },
  {
    id: "u4",
    name: "お笑い太郎",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    followers: 52100,
    following: 678,
    enneagramScores: [7, 9, 8, 6, 7, 8, 9, 7, 6],
    isSupporter: false,
    supporterLevel: 0,
    bio: "芸人目指して修行中！笑ってください😂",
    gender: "男性",
    age: 26,
    totalPosts: 445,
    totalLives: 203,
  },
  {
    id: "u5",
    name: "俳優けんた",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    followers: 89300,
    following: 234,
    enneagramScores: [6, 7, 8, 9, 6, 7, 8, 5, 9],
    isSupporter: true,
    supporterLevel: 4,
    bio: "舞台俳優🎭演劇の魅力を伝えたい",
    gender: "男性",
    age: 29,
    totalPosts: 198,
    totalLives: 67,
  },
  {
    id: "u6",
    name: "DJ YUKI",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop",
    followers: 72400,
    following: 890,
    enneagramScores: [8, 9, 7, 8, 6, 9, 7, 8, 6],
    isSupporter: false,
    supporterLevel: 0,
    bio: "クラブDJ 🎧 毎週末ライブ配信",
    gender: "男性",
    age: 31,
    totalPosts: 523,
    totalLives: 312,
  },
  {
    id: "u7",
    name: "美咲ちゃん",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    followers: 34500,
    following: 345,
    enneagramScores: [7, 6, 8, 7, 9, 6, 5, 7, 8],
    isSupporter: true,
    supporterLevel: 2,
    bio: "モデル志望✨ファッション・美容配信",
    gender: "女性",
    age: 22,
    totalPosts: 678,
    totalLives: 145,
  },
  {
    id: "u8",
    name: "ゲーマー翔太",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
    followers: 95600,
    following: 567,
    enneagramScores: [6, 8, 7, 9, 6, 8, 7, 5, 9],
    isSupporter: false,
    supporterLevel: 0,
    bio: "プロゲーマー目指してます🎮FPS/格ゲー",
    gender: "男性",
    age: 24,
    totalPosts: 890,
    totalLives: 456,
  },
];

export const communities: Community[] = [
  {
    id: "1",
    name: "地下アイドル界隈",
    avatar: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200&h=400&fit=crop",
    followers: 185000,
    description: "ライブとチェキで繋がる地下アイドル応援コミュニティ",
    category: "アイドル",
  },
  {
    id: "2",
    name: "JK日常界隈",
    avatar: "https://images.unsplash.com/photo-1604004555489-723a93d6ce74?w=400&h=400&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=400&fit=crop",
    followers: 142000,
    description: "女子高生のリアルな日常を共有するコミュニティ",
    category: "ライフスタイル",
  },
  {
    id: "3",
    name: "キャバ嬢・ホスト界隈",
    avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&h=400&fit=crop",
    followers: 167000,
    description: "夜の世界で輝くプロフェッショナルのコミュニティ",
    category: "ナイトライフ",
  },
  {
    id: "4",
    name: "お笑い芸人界隈",
    avatar: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=400&h=400&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=1200&h=400&fit=crop",
    followers: 198000,
    description: "ネタ動画とライブで笑いをお届けするコミュニティ",
    category: "お笑い",
  },
  {
    id: "5",
    name: "劇団・演劇界隈",
    avatar: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&h=400&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&h=400&fit=crop",
    followers: 93000,
    description: "舞台芸術を追求する劇団と観客のコミュニティ",
    category: "演劇",
  },
  {
    id: "6",
    name: "JPOP界隈",
    avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop",
    followers: 125000,
    description: "日本のポップミュージックを愛する人たちのコミュニティ",
    category: "音楽",
  },
  {
    id: "8",
    name: "ストリートダンサー界隈",
    avatar: "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=400&h=400&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=1200&h=400&fit=crop",
    followers: 134000,
    description: "路上からバトルまで、ダンスで繋がるコミュニティ",
    category: "ダンス",
  },
  {
    id: "9",
    name: "ゲーム実況界隈",
    avatar: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=400&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&h=400&fit=crop",
    followers: 176000,
    description: "ゲーム実況者とファンが集まるコミュニティ",
    category: "ゲーム",
  },
  {
    id: "10",
    name: "VTuber界隈",
    avatar: "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400&h=400&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1614729939124-032da5c9151b?w=1200&h=400&fit=crop",
    followers: 212000,
    description: "バーチャル空間で活動するクリエイターのコミュニティ",
    category: "VTuber",
  },
  {
    id: "11",
    name: "占い師・スピリチュアル界隈",
    avatar: "https://images.unsplash.com/photo-1518555607781-00d24b6c2450?w=400&h=400&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1532910404247-7ee9488d7292?w=1200&h=400&fit=crop",
    followers: 89000,
    description: "タロット、占星術、スピリチュアルガイダンスのコミュニティ",
    category: "スピリチュアル",
  },
  {
    id: "12",
    name: "海外旅行界隈",
    avatar: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=400&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&h=400&fit=crop",
    followers: 165000,
    description: "世界中を旅する冒険者たちのコミュニティ",
    category: "旅行",
  },
  {
    id: "13",
    name: "国内旅行界隈",
    avatar: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=400&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&h=400&fit=crop",
    followers: 142000,
    description: "日本の魅力を再発見する旅のコミュニティ",
    category: "旅行",
  },
  {
    id: "14",
    name: "危険な海外ディープス���ット界隈",
    avatar: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=400&h=400&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1484821582734-6c6c9f99a672?w=1200&h=400&fit=crop",
    followers: 89000,
    description: "未踏の地や危険地帯を探検するコアな旅人のコミュニティ",
    category: "旅行",
  },
  {
    id: "15",
    name: "オンライン英会話界隈",
    avatar: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=400&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=400&fit=crop",
    followers: 108000,
    description: "英語学習者と講師が繋がるコミュニティ",
    category: "教育",
  },
];

export const creators: Creator[] = [
  // 地下アイドル界隈のクリエイター
  {
    id: "c1",
    name: "星空みゆ",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    communityId: "1",
    followers: 48000,
    bio: "地下アイドルグループ「Starlight」センター。毎週ライブ配信中！",
    totalPosts: 124,
  },
  {
    id: "c2",
    name: "桜井りお",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    communityId: "1",
    followers: 35000,
    bio: "歌って踊れる地下アイドル🎤 チェキ会毎月開催✨",
    totalPosts: 98,
  },
  // JK日常界隈のクリエイター
  {
    id: "c3",
    name: "まいまい17歳",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    communityId: "2",
    followers: 52000,
    bio: "現役JK！制服コーデとプリクラ日記📸",
    totalPosts: 156,
  },
  {
    id: "c4",
    name: "なつみん",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    communityId: "2",
    followers: 41000,
    bio: "高2！放課後の日常をシェア💕",
    totalPosts: 132,
  },
  // キャバ嬢・ホスト界隈のクリエイター
  {
    id: "c5",
    name: "麗華 -REIKA-",
    avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop",
    communityId: "3",
    followers: 67000,
    bio: "六本木No.1キャバ嬢💋 メイク&ファッション配信",
    totalPosts: 89,
  },
  {
    id: "c6",
    name: "ホスト龍馬",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    communityId: "3",
    followers: 58000,
    bio: "歌舞伎町で頂点を目指すホスト🥂",
    totalPosts: 76,
  },
  // お笑い芸人界隈のクリエイター
  {
    id: "c7",
    name: "コンビ芸人「ダブルパンチ」",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    communityId: "4",
    followers: 92000,
    bio: "週5でネタ配信！劇場公演情報も🎭",
    totalPosts: 234,
  },
  {
    id: "c8",
    name: "一人コント・タケシ",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    communityId: "4",
    followers: 73000,
    bio: "即興コントで笑わせます😂",
    totalPosts: 187,
  },
  // 劇団・演劇界隈のクリエイター
  {
    id: "c9",
    name: "劇団「月光」座長",
    avatar: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop",
    communityId: "5",
    followers: 43000,
    bio: "現代演劇を追求する劇団の座長🎭",
    totalPosts: 67,
  },
  {
    id: "c10",
    name: "舞台女優・さくら",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop",
    communityId: "5",
    followers: 38000,
    bio: "舞台の魅力を伝える女優✨稽古風景も配信",
    totalPosts: 54,
  },
  // JPOP界隈のクリエイター
  {
    id: "c11",
    name: "シンガー HANA",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    communityId: "6",
    followers: 61000,
    bio: "J-POPシンガー🎤 弾き語りライブ配信中",
    totalPosts: 78,
  },
];

export const activityCards: ActivityCard[] = [
  {
    id: "act1",
    communityId: "1",
    creatorId: "c1",
    creatorName: "星空みゆ",
    creatorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    photos: [
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&h=600&fit=crop",
    ],
    title: "【限定】ワンマンライブ舞台裏",
    description: "昨日の渋谷WWWワンマンライブの舞台裏を特別公開！リハ風景、メイクルーム、本番直前の緊張感まで全部見せます💕 チェキ会の様子もあるよ✨",
    comments: [
      {
        id: "c1",
        userId: "u1",
        userName: "推しガチ勢",
        userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        text: "みゆちゃん泣いてるシーン感動した😭 本当にファン想いで最高！",
        timestamp: "2時間前",
      },
      {
        id: "c2",
        userId: "u2",
        userName: "地下アイドル応援隊",
        userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
        text: "チェキ会行けなかった民だけど動画で満足！ありがとう！",
        timestamp: "4時間前",
      },
    ],
    isPurchased: false,
    price: 500,
    views: 4821,
    timestamp: "2時間前",
  },
  {
    id: "act2",
    communityId: "2",
    creatorId: "c3",
    creatorName: "まいまい17歳",
    creatorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    photos: [
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1604004555489-723a93d6ce74?w=800&h=600&fit=crop",
    ],
    title: "今日の制服コーデとプリクラ巡り📸",
    description: "放課後に友達と原宿でプリクラ撮りまくってきた！制服アレンジも紹介してるよ💕 JKのリアルな日常をお届け✨",
    comments: [
      {
        id: "c3",
        userId: "u3",
        userName: "同い年組",
        userAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
        text: "プリクラの盛り方参考になった！明日真似する！",
        timestamp: "1時間前",
      },
    ],
    isPurchased: false,
    price: 300,
    views: 3156,
    timestamp: "3時間前",
  },
  {
    id: "act3",
    communityId: "3",
    creatorId: "c5",
    creatorName: "麗華 -REIKA-",
    creatorAvatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop",
    photos: [
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=600&fit=crop",
    ],
    title: "【メイク講座】お客様を虜にする秘密💋",
    description: "六本木No.1になるまでのメイク術を全部教えます。ベースメイクから目元の盛り方、リップの色選びまで完全解説💄",
    comments: [
      {
        id: "c4",
        userId: "u4",
        userName: "美容垢女子",
        userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
        text: "メイクの参考になる！これで私も売上上がりそう💕",
        timestamp: "30分前",
      },
    ],
    isPurchased: false,
    price: 800,
    views: 5234,
    timestamp: "4時間前",
  },
  {
    id: "act4",
    communityId: "4",
    creatorId: "c7",
    creatorName: "コンビ芸人「ダブルパンチ」",
    creatorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    photos: [
      "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&h=600&fit=crop",
    ],
    title: "【新ネタ初披露】ブラック企業コント😂",
    description: "今週末の劇場公演で披露する新ネタを先行配信！会社員なら絶対共感する社畜あるあるネタで爆笑必至🤣",
    comments: [
      {
        id: "c5",
        userId: "u5",
        userName: "サラリーマン太郎",
        userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
        text: "リアルすぎて笑いながら泣いた😭 会社でこれ見せたい",
        timestamp: "1時間前",
      },
    ],
    isPurchased: false,
    price: 400,
    views: 6421,
    timestamp: "6時間前",
  },
  {
    id: "act5",
    communityId: "5",
    creatorId: "c9",
    creatorName: "劇団「月光」座長",
    creatorAvatar: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop",
    photos: [
      "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&h=600&fit=crop",
    ],
    title: "【稽古密着】新作舞台「月光の夜に」制作過程",
    description: "来月初演予定の新作舞台の稽古風景を完全公開！役者の演技指導、照明デザイン、舞台装置の組み立てまで、演劇の裏側を全部見せます🎭",
    comments: [
      {
        id: "c6",
        userId: "u6",
        userName: "演劇ファン歴10年",
        userAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
        text: "稽古場の緊張感が伝わってきた！初日絶対観に行きます",
        timestamp: "2時間前",
      },
    ],
    isPurchased: false,
    price: 600,
    views: 2891,
    timestamp: "7時間前",
  },
];

export const topRankingCommunities = communities.slice(0, 10).map((c, i) => ({
  ...c,
  rank: i + 1,
}));

// Following Feed - フォロー中のクリエイターの投稿
export interface FollowingPost {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  communityId: string;
  communityName: string;
  content: string;
  image?: string;
  timestamp: string;
  likes: number;
  comments: number;
}

export const followingPosts: FollowingPost[] = [
  {
    id: "fp1",
    creatorId: "c1",
    creatorName: "星空みゆ",
    creatorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    communityId: "1",
    communityName: "地下アイドル界隈",
    content: "明日のワンマンライブのリハ終わった！みんなに会えるの楽しみすぎる✨✨",
    image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=450&fit=crop",
    timestamp: "2時間前",
    likes: 1834,
    comments: 124,
  },
  {
    id: "fp2",
    creatorId: "c3",
    creatorName: "まいまい17歳",
    creatorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    communityId: "2",
    communityName: "JK日常界隈",
    content: "今日テストだったけど全然できんかった😭 放課後プリクラ行って気分転換💕",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=450&fit=crop",
    timestamp: "5時間前",
    likes: 2156,
    comments: 187,
  },
  {
    id: "fp3",
    creatorId: "c7",
    creatorName: "コンビ芸人「ダブルパンチ」",
    creatorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    communityId: "4",
    communityName: "お笑い芸人界隈",
    content: "新ネタ完成！今週末の劇場で初披露します。絶対笑わせる自信ある🤣",
    image: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&h=450&fit=crop",
    timestamp: "8時間前",
    likes: 1492,
    comments: 93,
  },
];

export const announcements: Announcement[] = [
  {
    id: "ann1",
    title: "新機能リリース！",
    content: "レベニューシェア機能が追加されました。クリエイターと公認サポーターで収益を分配できます。",
    timestamp: "1時間前",
    type: "update",
  },
  {
    id: "ann2",
    title: "メンテナンスのお知らせ",
    content: "2月28日 深夜2:00-4:00にシステムメンテナンスを実施します。",
    timestamp: "3時間前",
    type: "info",
  },
  {
    id: "ann3",
    title: "特別イベント開催中！",
    content: "3月限定：初回ライブ配信で視聴者数ボーナス2倍キャンペーン実施中",
    timestamp: "1日前",
    type: "event",
  },
];

export const liveStreams: LiveStream[] = [
  {
    id: "live1",
    communityId: "1",
    communityName: "地下アイドル界隈",
    creatorId: "c1",
    creatorName: "星空みゆ",
    creatorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    title: "【生配信】新曲初披露＆チェキ当たる抽選会✨",
    thumbnail: "https://images.unsplash.com/photo-1756802432458-e87aef66344f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    currentViewers: 3453,
    startedAt: "30分前",
  },
  {
    id: "live2",
    communityId: "2",
    communityName: "JK日常界隈",
    creatorId: "c3",
    creatorName: "まいまい17歳",
    creatorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    title: "放課後雑談配信📱 質問答えるよ〜",
    thumbnail: "https://images.unsplash.com/photo-1724249230168-fc5cc2ebe822?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    currentViewers: 2821,
    startedAt: "15分前",
  },
  {
    id: "live3",
    communityId: "3",
    communityName: "キャバ嬢・ホスト界隈",
    creatorId: "c5",
    creatorName: "麗華 -REIKA-",
    creatorAvatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop",
    title: "【メイク配信】今日の同伴前メイク見せちゃう💋",
    thumbnail: "https://images.unsplash.com/photo-1747716796889-b973cae4d028?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    currentViewers: 4176,
    startedAt: "45分前",
  },
  {
    id: "live4",
    communityId: "4",
    communityName: "お笑い芸人界隈",
    creatorId: "c7",
    creatorName: "コンビ芸人「ダブルパンチ」",
    creatorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    title: "【生コント】視聴者お題で即興ネタやります🤣",
    thumbnail: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=600&fit=crop",
    currentViewers: 5245,
    startedAt: "20分前",
  },
  {
    id: "live5",
    communityId: "5",
    communityName: "劇団・演劇界隈",
    creatorId: "c9",
    creatorName: "劇団「月光」座長",
    creatorAvatar: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop",
    title: "稽古場からライブ配信🎭 台本読み合わせ",
    thumbnail: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&h=600&fit=crop",
    currentViewers: 1867,
    startedAt: "10分前",
  },
  {
    id: "live6",
    communityId: "6",
    communityName: "JPOP界隈",
    creatorId: "c11",
    creatorName: "シンガー HANA",
    creatorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    title: "【弾き語り】リクエスト曲歌います🎤",
    thumbnail: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop",
    currentViewers: 3641,
    startedAt: "1時間前",
  },
  {
    id: "live7",
    communityId: "15",
    communityName: "オンライン英会話界隈",
    creatorId: "c23",
    creatorName: "ネイティブ講師Emily",
    creatorAvatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop",
    title: "無料体験レッスン！日常英会話を学ぼう",
    thumbnail: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop",
    currentViewers: 1892,
    startedAt: "25分前",
  },
];

export const newVideos: VideoContent[] = [
  {
    id: "vid1",
    communityId: "1",
    communityName: "JPOP界隈",
    creatorId: "c1",
    creatorName: "YOASOBI",
    creatorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    title: "新曲制作の裏側",
    thumbnail: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&h=600&fit=crop",
    views: 3421,
    price: 500,
    uploadedAt: "2時間前",
    duration: "12:34",
  },
  {
    id: "vid2",
    communityId: "1",
    communityName: "JPOP界隈",
    creatorId: "c2",
    creatorName: "あいみょん",
    creatorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    title: "アコースティックライブ【無料公開】",
    thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&h=600&fit=crop",
    views: 4532,
    price: 0,
    uploadedAt: "5時間前",
    duration: "18:22",
  },
  {
    id: "vid3",
    communityId: "3",
    communityName: "ピアノ界隈",
    creatorId: "c6",
    creatorName: "ピアノの魔術師",
    creatorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    title: "ショパン エチュード解説",
    thumbnail: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&h=600&fit=crop",
    views: 2891,
    price: 400,
    uploadedAt: "7時間前",
    duration: "24:15",
  },
  {
    id: "vid4",
    communityId: "2",
    communityName: "車好き界隈",
    creatorId: "c4",
    creatorName: "カーマニアTaka",
    creatorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    title: "スーパーカー試乗レビュー【無料】",
    thumbnail: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=600&fit=crop",
    views: 5234,
    price: 0,
    uploadedAt: "4時間前",
    duration: "31:42",
  },
];

export const videoRanking: VideoContent[] = [
  {
    id: "vrank1",
    communityId: "1",
    communityName: "JPOP界隈",
    creatorId: "c1",
    creatorName: "YOASOBI",
    creatorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    title: "MVメイキング映像",
    thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
    views: 45234,
    price: 800,
    uploadedAt: "1週間前",
    duration: "24:15",
  },
  {
    id: "vrank2",
    communityId: "2",
    communityName: "車好き界隈",
    creatorId: "c4",
    creatorName: "カーマニアTaka",
    creatorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    title: "世界の名車ツアー完全版",
    thumbnail: "https://images.unsplash.com/photo-1494905998402-395d579af36f?w=800&h=600&fit=crop",
    views: 38921,
    price: 1200,
    uploadedAt: "5日前",
    duration: "48:30",
  },
  {
    id: "vrank3",
    communityId: "3",
    communityName: "ピアノ界隈",
    creatorId: "c6",
    creatorName: "ピアノの魔術師",
    creatorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    title: "リスト超絶技巧練習曲集",
    thumbnail: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&h=600&fit=crop",
    views: 32156,
    price: 600,
    uploadedAt: "3日前",
    duration: "18:22",
  },
];

export const creatorLiveRanking: CreatorRanking[] = [
  {
    creatorId: "c1",
    creatorName: "星空みゆ",
    creatorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    communityId: "1",
    communityName: "地下アイドル界隈",
    totalLiveViewers: 185320,
    liveCount: 34,
    followers: 48000,
    revenueShare: 80,
    totalTips: 28000,
    paidLiveRevenue: 145000,
    heatScore: 185320 * (28000 + 145000) * 34,
  },
  {
    creatorId: "c7",
    creatorName: "コンビ芸人「ダブルパンチ」",
    creatorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    communityId: "4",
    communityName: "お笑い芸人界隈",
    totalLiveViewers: 172450,
    liveCount: 45,
    followers: 92000,
    revenueShare: 80,
    totalTips: 21000,
    paidLiveRevenue: 98000,
    heatScore: 172450 * (21000 + 98000) * 45,
  },
  {
    creatorId: "c5",
    creatorName: "麗華 -REIKA-",
    creatorAvatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop",
    communityId: "3",
    communityName: "キャバ嬢・ホスト界隈",
    totalLiveViewers: 164800,
    liveCount: 52,
    followers: 67000,
    revenueShare: 80,
    totalTips: 42000,
    paidLiveRevenue: 123000,
    heatScore: 164800 * (42000 + 123000) * 52,
  },
  {
    creatorId: "c3",
    creatorName: "まいまい17歳",
    creatorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    communityId: "2",
    communityName: "JK日常界隈",
    totalLiveViewers: 148900,
    liveCount: 68,
    followers: 52000,
    revenueShare: 80,
    totalTips: 18500,
    paidLiveRevenue: 67000,
    heatScore: 148900 * (18500 + 67000) * 68,
  },
  {
    creatorId: "c9",
    creatorName: "劇団「月光」座長",
    creatorAvatar: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop",
    communityId: "5",
    communityName: "劇団・演劇界隈",
    totalLiveViewers: 138600,
    liveCount: 28,
    followers: 43000,
    revenueShare: 80,
    totalTips: 15000,
    paidLiveRevenue: 89000,
    heatScore: 138600 * (15000 + 89000) * 28,
  },
  {
    creatorId: "c11",
    creatorName: "シンガー HANA",
    creatorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    communityId: "6",
    communityName: "JPOP界隈",
    totalLiveViewers: 125670,
    liveCount: 31,
    followers: 61000,
    revenueShare: 80,
    totalTips: 22000,
    paidLiveRevenue: 76000,
    heatScore: 125670 * (22000 + 76000) * 31,
  },
];

export const notifications: Notification[] = [
  {
    id: "notif1",
    type: "revenue",
    title: "レベニューシェア報酬",
    message: "JPOP界隈から¥2,500の収益が発生しました（公認サポーター20%）",
    timestamp: "30分前",
    isRead: false,
    avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop",
    amount: 2500,
  },
  {
    id: "notif2",
    type: "comment",
    title: "新しいコメント",
    message: "佐藤花子さんがあなたの感想にコメントしました",
    timestamp: "1時間前",
    isRead: false,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
  },
  {
    id: "notif3",
    type: "follow",
    title: "新しいフォロワー",
    message: "田中一郎さんがあなたをフォローしました",
    timestamp: "2時間前",
    isRead: false,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
  },
  {
    id: "notif4",
    type: "system",
    title: "ライブ配信開始",
    message: "米津玄師が「制作中の新曲をチラ見せ！」でライブ配信を始めました",
    timestamp: "3時間前",
    isRead: true,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
  },
  {
    id: "notif5",
    type: "like",
    title: "いいね！",
    message: "鈴木美咲さんがあなたの感想にいいねしました",
    timestamp: "5時間前",
    isRead: true,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
  },
  {
    id: "notif6",
    type: "revenue",
    title: "レベニューシェア報酬",
    message: "アニメ・声優界隈から¥1,800の収益が発生しました（公認サポーター20%）",
    timestamp: "8時間前",
    isRead: true,
    avatar: "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=400&h=400&fit=crop",
    amount: 1800,
  },
  {
    id: "notif7",
    type: "system",
    title: "新機能のお知らせ",
    message: "レベニューシェア機能が追加されました！",
    timestamp: "1日前",
    isRead: true,
  },
];

export const myCommunitiesIds = ["1", "3", "6"]; // User's followed communities

export const communityRanking = [
  {
    ...communities[6], // ゲーム実況界隈
    rank: 1,
    totalViews: 345000,
    totalRevenue: 12500000,
  },
  {
    ...communities[4], // アニメ・声優界隈
    rank: 2,
    totalViews: 332000,
    totalRevenue: 11800000,
  },
  {
    ...communities[0], // JPOP界隈
    rank: 3,
    totalViews: 298000,
    totalRevenue: 10500000,
  },
  {
    ...communities[5], // 料理・グルメ界隈
    rank: 4,
    totalViews: 285000,
    totalRevenue: 9200000,
  },
  {
    ...communities[1], // 車好き界隈
    rank: 5,
    totalViews: 265000,
    totalRevenue: 8400000,
  },
  {
    ...communities[7], // 筋トレ・フィットネス界隈
    rank: 6,
    totalViews: 242000,
    totalRevenue: 7800000,
  },
];

// DM関連のモックデータ
export const conversations: Conversation[] = [
  {
    id: "conv1",
    userId: "c1",
    userName: "YOASOBI",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    lastMessage: "ありがとうございます！次のライブも楽しみにしてくださいね！",
    lastMessageTime: "15分前",
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: "conv2",
    userId: "c17",
    userName: "世界一周トラベラーYuki",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    lastMessage: "パリの写真送りますね📸",
    lastMessageTime: "1時間前",
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: "conv3",
    userId: "c6",
    userName: "ピアノの魔術師",
    userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    lastMessage: "練習頑張ってください！質問があればいつでもどうぞ",
    lastMessageTime: "3時間前",
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: "conv4",
    userId: "c23",
    userName: "ネイティブ講師Emily",
    userAvatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop",
    lastMessage: "Great progress! Keep up the good work! 💪",
    lastMessageTime: "5時間前",
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: "conv5",
    userId: "c4",
    userName: "カーマニアTaka",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    lastMessage: "次の試乗動画も見てくださいね！",
    lastMessageTime: "8時間前",
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: "conv6",
    userId: "c11",
    userName: "AI映像ラボ",
    userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
    lastMessage: "AIツールの使い方、わかりやすく説明しますね",
    lastMessageTime: "1日前",
    unreadCount: 0,
    isOnline: false,
  },
];

export const messages: { [conversationId: string]: Message[] } = {
  conv1: [
    {
      id: "msg1",
      conversationId: "conv1",
      senderId: "user1",
      senderName: "山田太郎",
      senderAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
      text: "こんにちは！新曲すごく良かったです！",
      timestamp: "10:30",
      isRead: true,
    },
    {
      id: "msg2",
      conversationId: "conv1",
      senderId: "c1",
      senderName: "YOASOBI",
      senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      text: "ありがとうございます！とても嬉しいです😊",
      timestamp: "10:35",
      isRead: true,
    },
    {
      id: "msg3",
      conversationId: "conv1",
      senderId: "user1",
      senderName: "山田太郎",
      senderAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
      text: "次のライブは行けそうですか？",
      timestamp: "10:37",
      isRead: true,
    },
    {
      id: "msg4",
      conversationId: "conv1",
      senderId: "c1",
      senderName: "YOASOBI",
      senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      text: "ありがとうございます！次のライブも楽しみにしてくださいね！",
      timestamp: "10:40",
      isRead: false,
    },
  ],
  conv2: [
    {
      id: "msg5",
      conversationId: "conv2",
      senderId: "user1",
      senderName: "山田太郎",
      senderAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
      text: "パリの動画見ました！すごく綺麗でした✨",
      timestamp: "昨日 20:15",
      isRead: true,
    },
    {
      id: "msg6",
      conversationId: "conv2",
      senderId: "c17",
      senderName: "世界一周トラベラーYuki",
      senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      text: "ありがとうございます！エッフェル塔からの眺めは最高でした🗼",
      timestamp: "昨日 20:22",
      isRead: true,
    },
    {
      id: "msg7",
      conversationId: "conv2",
      senderId: "c17",
      senderName: "世界一周トラベラーYuki",
      senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      text: "パリの写真送りますね📸",
      timestamp: "昨日 20:23",
      isRead: false,
    },
  ],
  conv3: [
    {
      id: "msg8",
      conversationId: "conv3",
      senderId: "user1",
      senderName: "山田太郎",
      senderAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
      text: "ショパンのエチュード解説、とても参考になりました！",
      timestamp: "昨日 18:00",
      isRead: true,
    },
    {
      id: "msg9",
      conversationId: "conv3",
      senderId: "c6",
      senderName: "ピアノの魔術師",
      senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
      text: "ありがとうございます！難しい曲ですが、コツコツ練習すれば必ず弾けるようになりますよ🎹",
      timestamp: "昨日 18:15",
      isRead: true,
    },
    {
      id: "msg10",
      conversationId: "conv3",
      senderId: "c6",
      senderName: "ピアノの魔術師",
      senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
      text: "練習頑張ってください！質問があればいつでもどうぞ",
      timestamp: "昨日 18:16",
      isRead: true,
    },
  ],
};

export const videoEditors: VideoEditor[] = [
  {
    id: "editor1",
    name: "プロ編集者 ケンタ",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    bio: "JPOP・アニメ系の編集が得意です。5年の実績で500本以上の動画を編集しました。",
    portfolio: [
      "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=450&fit=crop",
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=450&fit=crop",
      "https://images.unsplash.com/photo-1574270156527-4775f8a2d41d?w=800&h=450&fit=crop",
    ],
    rating: 4.9,
    completedJobs: 523,
    averageTurnaround: "2-3日",
    specialties: ["JPOP", "アニメ", "ライブ配信"],
    paymentType: "upfront",
    pricePerMinute: 500,
    revenueShare: 10,
    isAvailable: true,
  },
  {
    id: "editor2",
    name: "映像クリエイター サキ",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    bio: "スピード対応が強み！24時間以内の納品も可能です。エンタメ系コンテンツに特化。",
    portfolio: [
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=450&fit=crop",
      "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&h=450&fit=crop",
    ],
    rating: 4.8,
    completedJobs: 387,
    averageTurnaround: "1-2日",
    specialties: ["エンタメ", "ゲーム", "配信切り抜き"],
    paymentType: "revenue_share",
    pricePerMinute: 0,
    revenueShare: 15,
    isAvailable: true,
  },
  {
    id: "editor3",
    name: "動画職人 タクヤ",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    bio: "丁寧な編集とエフェクトが評判です。クオリティ重視の方におすすめ。",
    portfolio: [
      "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=800&h=450&fit=crop",
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=450&fit=crop",
      "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=450&fit=crop",
    ],
    rating: 5.0,
    completedJobs: 245,
    averageTurnaround: "3-5日",
    specialties: ["音楽", "ライブ", "MV風編集"],
    paymentType: "upfront",
    pricePerMinute: 800,
    revenueShare: 10,
    isAvailable: true,
  },
  {
    id: "editor4",
    name: "切り抜き名人 ユウキ",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    bio: "ライブ配信の切り抜きが専門。面白いシーンを的確に抽出します。",
    portfolio: [
      "https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=800&h=450&fit=crop",
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=450&fit=crop",
    ],
    rating: 4.7,
    completedJobs: 612,
    averageTurnaround: "1日以内",
    specialties: ["切り抜き", "ハイライト", "ショート動画"],
    paymentType: "revenue_share",
    pricePerMinute: 0,
    revenueShare: 18,
    isAvailable: true,
  },
  {
    id: "editor5",
    name: "エディター リナ",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    bio: "字幕・テロップが得意です。見やすく分かりやすい編集を心がけています。",
    portfolio: [
      "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&h=450&fit=crop",
    ],
    rating: 4.6,
    completedJobs: 298,
    averageTurnaround: "2-4日",
    specialties: ["字幕", "テロップ", "解説動画"],
    paymentType: "upfront",
    pricePerMinute: 550,
    revenueShare: 10,
    isAvailable: false,
  },
  {
    id: "editor6",
    name: "新人編集者 ハルト",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
    bio: "初期費用なしのレベニューシェア型！実績を積みたいので低シェアで対応します。",
    portfolio: [
      "https://images.unsplash.com/photo-1574270156527-4775f8a2d41d?w=800&h=450&fit=crop",
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=450&fit=crop",
    ],
    rating: 4.5,
    completedJobs: 87,
    averageTurnaround: "2-3日",
    specialties: ["初心者向け", "低予算", "丁寧対応"],
    paymentType: "revenue_share",
    pricePerMinute: 0,
    revenueShare: 12,
    isAvailable: true,
  },
  {
    id: "editor7",
    name: "ベテラン編集者 シンジ",
    avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=400&fit=crop",
    bio: "10年以上の実績。レベニューシェア型で長期パートナーを募集中。一緒に成長しましょう！",
    portfolio: [
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=450&fit=crop",
      "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=450&fit=crop",
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=450&fit=crop",
    ],
    rating: 4.9,
    completedJobs: 756,
    averageTurnaround: "2-4日",
    specialties: ["長期パートナー", "プロ品質", "戦略提案"],
    paymentType: "revenue_share",
    pricePerMinute: 0,
    revenueShare: 20,
    isAvailable: true,
  },
];

// Revenue Management Types
export interface RevenueTransaction {
  id: string;
  type: "live_stream" | "video_sale" | "tip" | "edited_video";
  contentId: string;
  contentTitle: string;
  creatorId: string;
  creatorName: string;
  totalAmount: number;
  status: "pending" | "distributed" | "refunded";
  paymentMethod: "stripe" | "paypal";
  purchaseDate: string;
  distributionDate?: string;
  breakdown: {
    creator: number;
    editor?: number;
    supporter?: number;
    platform: number;
  };
}

export interface RevenueStats {
  totalRevenue: number;
  pendingDistribution: number;
  distributed: number;
  withdrawable: number;
  bySource: {
    liveStreams: number;
    videoSales: number;
    tips: number;
    editedVideos: number;
  };
  byPeriod: {
    date: string;
    amount: number;
  }[];
}

export interface PayoutRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  method: "bank_transfer" | "paypal";
  status: "pending" | "processing" | "completed" | "failed";
  requestedAt: string;
  completedAt?: string;
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}

// Mock Revenue Data
export const revenueTransactions: RevenueTransaction[] = [
  {
    id: "rev1",
    type: "live_stream",
    contentId: "live1",
    contentTitle: "YOASOBIアコースティックライブ",
    creatorId: "c1",
    creatorName: "YOASOBI",
    totalAmount: 15000,
    status: "distributed",
    paymentMethod: "stripe",
    purchaseDate: "2026-02-25 20:00",
    distributionDate: "2026-02-26 10:00",
    breakdown: {
      creator: 12000,
      platform: 3000,
    },
  },
  {
    id: "rev2",
    type: "video_sale",
    contentId: "act1",
    contentTitle: "新曲「夜に駆ける」MV撮影の裏側",
    creatorId: "c1",
    creatorName: "YOASOBI",
    totalAmount: 5000,
    status: "distributed",
    paymentMethod: "stripe",
    purchaseDate: "2026-02-24 14:30",
    distributionDate: "2026-02-25 09:00",
    breakdown: {
      creator: 2500,
      supporter: 1000,
      platform: 1500,
    },
  },
  {
    id: "rev3",
    type: "edited_video",
    contentId: "act5",
    contentTitle: "ライブハイライト（編集版）",
    creatorId: "c1",
    creatorName: "YOASOBI",
    totalAmount: 3000,
    status: "distributed",
    paymentMethod: "paypal",
    purchaseDate: "2026-02-23 18:00",
    distributionDate: "2026-02-24 12:00",
    breakdown: {
      creator: 1200,
      editor: 300,
      supporter: 600,
      platform: 900,
    },
  },
  {
    id: "rev4",
    type: "tip",
    contentId: "live2",
    contentTitle: "投げ銭（ライブ配信中）",
    creatorId: "c1",
    creatorName: "YOASOBI",
    totalAmount: 10000,
    status: "distributed",
    paymentMethod: "stripe",
    purchaseDate: "2026-02-25 20:30",
    distributionDate: "2026-02-26 10:00",
    breakdown: {
      creator: 8000,
      platform: 2000,
    },
  },
  {
    id: "rev5",
    type: "live_stream",
    contentId: "live3",
    contentTitle: "米津玄師 弾き語り配信",
    creatorId: "c2",
    creatorName: "米津玄師",
    totalAmount: 8000,
    status: "pending",
    paymentMethod: "stripe",
    purchaseDate: "2026-02-27 19:00",
    breakdown: {
      creator: 6400,
      platform: 1600,
    },
  },
  {
    id: "rev6",
    type: "video_sale",
    contentId: "act10",
    contentTitle: "スタジオレコーディング風景",
    creatorId: "c2",
    creatorName: "米津玄師",
    totalAmount: 4000,
    status: "pending",
    paymentMethod: "paypal",
    purchaseDate: "2026-02-27 16:00",
    breakdown: {
      creator: 2000,
      supporter: 800,
      platform: 1200,
    },
  },
  {
    id: "rev7",
    type: "edited_video",
    contentId: "act15",
    contentTitle: "ライブダイジェスト（編集版）",
    creatorId: "c3",
    creatorName: "Ado",
    totalAmount: 6000,
    status: "distributed",
    paymentMethod: "stripe",
    purchaseDate: "2026-02-26 12:00",
    distributionDate: "2026-02-27 09:00",
    breakdown: {
      creator: 2400,
      editor: 600,
      supporter: 1200,
      platform: 1800,
    },
  },
  {
    id: "rev8",
    type: "tip",
    contentId: "live4",
    contentTitle: "投げ銭（ライブ配信中）",
    creatorId: "c3",
    creatorName: "Ado",
    totalAmount: 25000,
    status: "distributed",
    paymentMethod: "stripe",
    purchaseDate: "2026-02-26 21:00",
    distributionDate: "2026-02-27 10:00",
    breakdown: {
      creator: 20000,
      platform: 5000,
    },
  },
];

export const userRevenueStats: RevenueStats = {
  totalRevenue: 76000,
  pendingDistribution: 12000,
  distributed: 64000,
  withdrawable: 47200,
  bySource: {
    liveStreams: 23000,
    videoSales: 9000,
    tips: 35000,
    editedVideos: 9000,
  },
  byPeriod: [
    { date: "2/21", amount: 5000 },
    { date: "2/22", amount: 8000 },
    { date: "2/23", amount: 12000 },
    { date: "2/24", amount: 15000 },
    { date: "2/25", amount: 18000 },
    { date: "2/26", amount: 28000 },
    { date: "2/27", amount: 12000 },
  ],
};

export const payoutRequests: PayoutRequest[] = [
  {
    id: "payout1",
    userId: "c1",
    userName: "YOASOBI",
    amount: 30000,
    method: "bank_transfer",
    status: "completed",
    requestedAt: "2026-02-20 10:00",
    completedAt: "2026-02-22 15:00",
    bankInfo: {
      bankName: "三菱UFJ銀行",
      accountNumber: "1234567",
      accountHolder: "ヤマダ タロウ",
    },
  },
  {
    id: "payout2",
    userId: "c1",
    userName: "YOASOBI",
    amount: 20000,
    method: "bank_transfer",
    status: "processing",
    requestedAt: "2026-02-27 09:00",
    bankInfo: {
      bankName: "三菱UFJ銀行",
      accountNumber: "1234567",
      accountHolder: "ヤマダ タロウ",
    },
  },
  {
    id: "payout3",
    userId: "c2",
    userName: "米津玄師",
    amount: 15000,
    method: "paypal",
    status: "pending",
    requestedAt: "2026-02-27 11:00",
  },
];