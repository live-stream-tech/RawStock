import { Bell, Search, Music, Palette, Trophy, Gamepad2, Heart, TrendingUp, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import Logo from "../rawstock-lp/Logo";
import NotificationModal from "../components/NotificationModal";
import {
  notifications,
  communities,
  myCommunitiesIds,
  videoRanking,
} from "../data/mockData";

const categories = [
  { id: "all", name: "すべて", icon: TrendingUp },
  { id: "music", name: "音楽", icon: Music },
  { id: "art", name: "アート", icon: Palette },
  { id: "sports", name: "スポーツ", icon: Trophy },
  { id: "gaming", name: "ゲーム", icon: Gamepad2 },
  { id: "lifestyle", name: "ライフスタイル", icon: Heart },
];

export default function CommunityList() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const myCommunities = communities.filter(c => myCommunitiesIds.includes(c.id));

  return (
    <div className="min-h-screen bg-[#334155] pb-4 text-white">
      {/* Header */}
      <div className="sticky top-0 bg-[#475569] border-b border-[#0891B2] px-4 py-4 z-10">
        <div className="flex items-center justify-between">
          <Logo />
          <button 
            onClick={() => setShowNotifications(true)}
            className="p-2 hover:bg-[var(--pearl-light)] rounded-full transition-colors relative"
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                {unreadCount}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pt-4">
        {/* Search Box & Create Button */}
        <div className="px-4 mb-6">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0891B2]" size={18} />
              <input
                type="text"
                placeholder="コミュニティ、動画を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-[#0891B2] transition-all text-sm"
              />
            </div>
            <button
              onClick={() => alert("新規コミュニティ作成機能は近日公開予定！")}
              className="flex items-center gap-2 px-4 py-3 bg-[#0891B2] text-white rounded-xl font-bold hover:bg-[#0891B2]/90 transition-colors shadow-lg shadow-[#0891B2]/10 whitespace-nowrap text-sm"
            >
              <Plus size={18} />
              作成
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all border ${
                    selectedCategory === category.id
                      ? "bg-[#0891B2] text-white border-[#0891B2]"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500"
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-sm font-medium">{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* My Communities */}
        {myCommunities.length > 0 && (
          <div className="px-4 mb-8">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-[#0891B2] rounded-full" />
              マイコミュニティ
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {myCommunities.map((community) => (
                <Link
                  key={community.id}
                  to={`/community/${community.id}`}
                  className="flex flex-col gap-2 p-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-[#0891B2] transition-all group shadow-sm"
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg">
                    <img
                      src={community.avatar}
                      alt={community.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-green-500 border border-slate-800 rounded-full shadow-sm" />
                  </div>
                  <div className="px-0.5 pb-0.5">
                    <p className="text-[10px] font-bold line-clamp-1 text-slate-200">{community.name}</p>
                    <p className="text-[8px] text-[#0891B2] font-black uppercase tracking-tighter mt-0.5">
                      {community.followers.toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Video View Ranking */}
        <div className="px-4 mt-2 pb-10">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-[#F43F5E] rounded-full" />
            動画視聴ランキング
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {videoRanking.map((video, index) => (
              <div
                key={video.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-[#0891B2] transition-all group cursor-pointer shadow-lg"
              >
                {/* Rank Badge */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-lg shadow-lg ${
                  index === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-600 scale-110" :
                  index === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500" :
                  index === 2 ? "bg-gradient-to-br from-orange-400 to-orange-700" :
                  "bg-slate-700"
                }`}>
                  {index + 1}
                </div>

                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-32 rounded-lg overflow-hidden">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {video.duration}
                  </div>
                  {video.price > 0 && (
                    <div className="absolute top-1 left-1 bg-[#0891B2] text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                      ¥{video.price}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm line-clamp-2 mb-1 group-hover:text-[#0891B2] transition-colors">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={video.creatorAvatar}
                      alt={video.creatorName}
                      className="w-5 h-5 rounded-full"
                    />
                    <span className="text-[11px] text-slate-300 font-medium">{video.creatorName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="font-bold text-[#0891B2]">{video.views.toLocaleString()} 視聴</span>
                    <span>{video.uploadedAt}</span>
                    <span className="text-slate-500">{video.communityName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
      />

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
