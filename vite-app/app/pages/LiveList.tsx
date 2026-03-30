import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Radio, Calendar, Users, Star, Video } from "lucide-react";
import { liveStreams, creatorLiveRanking } from "../data/mockData";
import CreatorRankingCard from "../components/CreatorRankingCard";
import HorizontalScroll from "../components/HorizontalScroll";
import { motion, AnimatePresence } from "motion/react";
import { BroadcastFab } from "../components/BroadcastFab";
import { AppButton } from "../components/ui/AppButton";

const professionals = [
  {
    id: "p1",
    name: "Dr. Sato",
    role: "英語講師",
    rating: 4.9,
    reviews: 124,
    price: 3000,
    duration: 30,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
    tags: ["ビジネス英語", "TOEIC"],
    isAvailable: true,
  },
  {
    id: "p2",
    name: "Luna",
    role: "タロット占い師",
    rating: 4.8,
    reviews: 89,
    price: 2500,
    duration: 20,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
    tags: ["恋愛相談", "運勢"],
    isAvailable: false,
  },
  {
    id: "p3",
    name: "Ken",
    role: "フィットネストレーナー",
    rating: 5.0,
    reviews: 56,
    price: 4000,
    duration: 45,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    tags: ["自重トレ", "食事指導"],
    isAvailable: true,
  }
];

export default function LiveList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"live" | "reserve">("live");

  return (
    <div className="min-h-screen bg-[#334155] pb-20 text-white">
      {/* Header */}
      <div className="sticky top-0 bg-[#475569]/95 backdrop-blur-xl border-b border-slate-700 z-30">
        <div className="flex items-center px-4 py-4 gap-4 justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-black text-lg tracking-tighter italic uppercase">LIVE & RESERVE</h1>
          </div>
        </div>
        
        <div className="flex px-4">
          <button
            onClick={() => setActiveTab("live")}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest relative transition-colors ${
              activeTab === "live" ? "text-[#0891B2]" : "text-slate-400"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Radio size={14} className={activeTab === "live" ? "animate-pulse" : ""} />
              Live Now
            </div>
            {activeTab === "live" && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0891B2]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("reserve")}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest relative transition-colors ${
              activeTab === "reserve" ? "text-[#0891B2]" : "text-slate-400"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calendar size={14} />
              Booking
            </div>
            {activeTab === "reserve" && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0891B2]" />
            )}
          </button>
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === "live" ? (
            <motion.div
              key="live-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 gap-4"
            >
              {(liveStreams || []).map((stream) => (
                <div
                  key={stream.id}
                  onClick={() => navigate(`/live/${stream.id}`)}
                  className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden cursor-pointer hover:border-[#0891B2]/50 transition-all group shadow-xl"
                >
                  <div className="relative aspect-video">
                    <img src={stream.thumbnail} alt={stream.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute top-3 left-3 bg-red-600 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-lg">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest">LIVE</span>
                    </div>
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded flex items-center gap-1.5 text-[10px] font-bold">
                      <Users size={12} className="text-[#0891B2]" />
                      {(stream.currentViewers ?? 0).toLocaleString()}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="font-bold text-sm mb-1 line-clamp-1 italic tracking-tight uppercase">{stream.title}</h3>
                      <div className="flex items-center gap-2">
                        <img src={stream.creatorAvatar} className="w-5 h-5 rounded-full border border-white/20" alt="" />
                        <span className="text-[10px] text-slate-300 font-bold uppercase">{stream.creatorName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="reserve-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-[#0891B2]/10 border border-[#0891B2]/20 rounded-2xl p-4 mb-2">
                <p className="text-[10px] text-[#0891B2] font-black mb-1 tracking-widest uppercase italic">Professional Matching</p>
                <p className="text-xs text-slate-400 leading-relaxed font-bold">
                  講師や専門家と1対1で会話ができる個別セッション機能です。ビデオ通話での相談やレッスンが可能です。
                </p>
              </div>

              {(professionals || []).map((pro) => (
                <div
                  key={pro.id}
                  className="bg-slate-800 border border-slate-700 rounded-2xl p-4 hover:border-[#0891B2]/50 transition-all shadow-lg group"
                >
                  <div className="flex gap-4">
                    <div className="relative flex-shrink-0">
                      <img src={pro.avatar} alt={pro.name} className="w-20 h-20 rounded-2xl object-cover border border-slate-700 shadow-xl" />
                      {pro.isAvailable && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-slate-800 rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h3 className="font-black text-sm group-hover:text-[#0891B2] transition-colors uppercase tracking-tight italic">{pro.name}</h3>
                          <p className="text-[10px] text-[#0891B2] font-black uppercase tracking-tight">{pro.role}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                          <Star size={10} className="text-yellow-500 fill-yellow-500" />
                          <span className="text-[10px] font-black">{pro.rating}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(pro.tags || []).map(tag => (
                          <span key={tag} className="text-[9px] font-black uppercase bg-slate-700 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-600/30">#{tag}</span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-700/50">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">Fee / Session</span>
                          <span className="text-xs font-black text-white italic tracking-tighter">¥{(pro.price ?? 0).toLocaleString()} <span className="text-[8px] font-bold text-slate-500">/ {pro.duration}MIN</span></span>
                        </div>
                        <AppButton size="sm" icon={<Video size={12} />}>
                          Reserve
                        </AppButton>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Creator Live Ranking */}
      <div className="mb-6">
        <div className="px-4 flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm tracking-tight flex items-center gap-2 text-[#F43F5E]">
            <div className="w-1.5 h-4 bg-[#F43F5E] rounded-full" />
            配信者ランキング
          </h2>
        </div>
        <HorizontalScroll>
          {creatorLiveRanking.slice(0, 8).map((creator, index) => (
            <CreatorRankingCard
              key={creator.creatorId}
              creator={creator}
              rank={index + 1}
            />
          ))}
        </HorizontalScroll>
      </div>

      {/* Floating Action Button for Go Live */}
      <BroadcastFab />
    </div>
  );
}
