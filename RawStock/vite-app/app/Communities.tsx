import { Search, ChevronRight, Users, MessageCircle } from "lucide-react";
import { Link } from "react-router";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";

const GENRES = [
  {
    id: "g1",
    name: "女子高生・JK",
    image: "https://images.unsplash.com/photo-1754889940746-fe9b359ef441?w=400&h=400&fit=crop",
    count: "128 Communities",
    members: "45.2k",
    description: "放課後の日常や制服姿、ライブ配信を中心に活動中。"
  },
  {
    id: "g2",
    name: "アイドル",
    image: "https://images.unsplash.com/photo-1729915342948-bf4dd5280ce7?w=400&h=400&fit=crop",
    count: "342 Communities",
    members: "182k",
    description: "メジャーから地方、コンセプトカフェ系まで幅広く網羅。"
  },
  {
    id: "g3",
    name: "芸人・お笑い",
    image: "https://images.unsplash.com/photo-1705580132909-95539e1ef843?w=400&h=400&fit=crop",
    count: "89 Communities",
    members: "31.5k",
    description: "劇場の裏側やネタ見せ、ライブ後のトークが盛りだくさん。"
  },
  {
    id: "g4",
    name: "地下アイドル",
    image: "https://images.unsplash.com/photo-1642524757798-2a128dfab358?w=400&h=400&fit=crop",
    count: "215 Communities",
    members: "98.1k",
    description: "熱狂的なライブシーンと密なコミュニケーションが魅力。"
  }
];

export function Communities() {
  return (
    <div className="flex flex-col min-h-full bg-white">
      {/* Search Header */}
      <div className="bg-white p-3 border-b border-[#F2F2F2]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#767676]" size={16} />
          <input
            type="text"
            placeholder="ジャンル・コミュニティを検索"
            className="w-full h-9 pl-9 pr-4 bg-[#F2F2F2] border-none rounded-md text-sm text-[#000000] outline-none placeholder:text-[#767676]"
          />
        </div>
      </div>

      <div className="px-3 pt-4 pb-2">
        <h1 className="text-sm font-black text-[#334155] border-l-4 border-[#334155] pl-2 leading-none">
          コミュニティジャンル
        </h1>
      </div>

      {/* Genre Grid - Minimized spacing */}
      <div className="grid grid-cols-1 gap-px bg-[#F2F2F2] border-t border-b border-[#F2F2F2]">
        {GENRES.map((genre) => (
          <Link 
            key={genre.id} 
            to={`/community/${genre.id}`} 
            className="flex items-start space-x-3 p-3 bg-white hover:bg-[#F8FAFC] active:bg-[#F2F2F2] transition-colors"
          >
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-[#F2F2F2]">
              <ImageWithFallback 
                src={genre.image} 
                className="w-full h-full object-cover" 
                alt={genre.name} 
              />
            </div>
            <div className="flex-1 min-w-0 py-0.5">
              <div className="flex items-center justify-between mb-0.5">
                <h3 className="text-sm font-bold text-[#000000] truncate">{genre.name}</h3>
                <ChevronRight size={14} className="text-[#767676]" />
              </div>
              <p className="text-[11px] text-[#767676] line-clamp-2 mb-2 leading-tight">
                {genre.description}
              </p>
              <div className="flex items-center space-x-3">
                <div className="flex items-center text-[10px] text-[#334155] font-bold">
                  <MessageCircle size={10} className="mr-1" />
                  {genre.count}
                </div>
                <div className="flex items-center text-[10px] text-[#767676]">
                  <Users size={10} className="mr-1" />
                  {genre.members} 参加中
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Suggested for You Section */}
      <div className="px-3 pt-6 pb-2">
        <h2 className="text-xs font-black text-[#767676] uppercase tracking-wider">
          おすすめの話題
        </h2>
      </div>
      <div className="px-3 space-y-2 mb-6">
        {["今日のJK配信ハイライト", "新人アイドル発掘掲示板", "お笑いライブ勝敗予想"].map((topic, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-md border border-[#F2F2F2]">
            <span className="text-xs font-bold text-[#334155]">#{topic}</span>
            <span className="text-[10px] text-[#767676]">2,341 post</span>
          </div>
        ))}
      </div>
    </div>
  );
}
