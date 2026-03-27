import { TrendingUp, Users, Radio, CircleDollarSign, Flame } from "lucide-react";
import { CreatorRanking } from "../data/mockData";

interface CreatorRankingCardProps {
  creator: CreatorRanking;
  rank: number;
}

export default function CreatorRankingCard({ creator, rank }: CreatorRankingCardProps) {
  const getRankColor = () => {
    if (rank === 1) return "bg-[#F59E0B]"; // Gold/Orange as in image
    if (rank === 2) return "bg-[#94A3B8]";
    if (rank === 3) return "bg-[#B45309]";
    return "bg-slate-600";
  };

  const totalRevenue = (creator.totalTips || 0) + (creator.paidLiveRevenue || 0);

  return (
    <div className="flex-shrink-0 w-72 bg-[#1E293B] border border-slate-700 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col gap-4">
      
      {/* 1. Header: Rank, Avatar, Name */}
      <div className="flex items-center gap-3">
        <div className={`${getRankColor()} text-white w-12 h-12 rounded-full flex items-center justify-center font-black text-xl shadow-lg shrink-0 italic`}>
          {rank}
        </div>
        <div className="relative">
          <img
            src={creator.creatorAvatar}
            alt={creator.creatorName}
            className="w-12 h-12 rounded-full border-2 border-slate-800 object-cover shrink-0"
          />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-sm text-white truncate leading-tight">{creator.creatorName}</h3>
          <p className="text-[10px] text-slate-400 font-medium truncate">{creator.communityName}</p>
        </div>
      </div>

      {/* 2. Heat Score (経済的熱量) Panel */}
      <div className="bg-gradient-to-r from-[#F97316] to-[#EF4444] rounded-2xl p-4 shadow-lg shadow-orange-500/20">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-white fill-white/20" />
            <span className="text-xs font-bold text-white tracking-tight">経済的熱量</span>
          </div>
          <span className="text-xl font-black text-white italic tracking-tighter">
            {creator.heatScore ? (creator.heatScore / 1000000000).toFixed(1) : "0.0"}B
          </span>
        </div>
        <p className="text-[9px] text-white/80 font-medium leading-none">
          視聴数 × (投げ銭＋有料ライブ) × 配信回数
        </p>
      </div>

      {/* 3. Stats List Rows */}
      <div className="flex flex-col gap-2">
        {/* Total Viewers Row */}
        <div className="bg-[#0F172A]/60 border border-slate-700/50 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-[#EF4444]" />
            <span className="text-[11px] font-bold text-slate-300">累計視聴数</span>
          </div>
          <span className="text-sm font-black text-white italic">{(creator.totalLiveViewers || 0).toLocaleString()}</span>
        </div>

        {/* Total Revenue Row */}
        <div className="bg-[#0F172A]/60 border border-slate-700/50 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircleDollarSign size={14} className="text-yellow-500" />
            <span className="text-[11px] font-bold text-slate-300">総収益</span>
          </div>
          <span className="text-sm font-black text-white italic">¥{totalRevenue.toLocaleString()}</span>
        </div>

        {/* Live Count Row */}
        <div className="bg-[#0F172A]/60 border border-slate-700/50 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-slate-300" />
            <span className="text-[11px] font-bold text-slate-300">配信回数</span>
          </div>
          <span className="text-sm font-black text-white italic">{creator.liveCount || 0}回</span>
        </div>

        {/* Followers Row */}
        <div className="bg-[#0F172A]/60 border border-slate-700/50 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-slate-300" />
            <span className="text-[11px] font-bold text-slate-300">フォロワー</span>
          </div>
          <span className="text-sm font-black text-white italic">{(creator.followers || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* 4. Revenue Share Footer Section */}
      <div className="bg-black rounded-2xl p-4 mt-1 border border-slate-800">
        <p className="text-[10px] font-black text-slate-500 text-center uppercase tracking-widest mb-1">レベニューシェア</p>
        <p className="text-2xl font-black text-white text-center italic tracking-tighter">
          {creator.revenueShare || 80}%
        </p>
      </div>
    </div>
  );
}
