import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Star,
  TrendingUp,
  Clock,
  CheckCircle2,
  Award,
  Zap,
  ThumbsUp,
} from "lucide-react";
import { videoEditors } from "../data/mockData";

export default function EditorRanking() {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<"rating" | "jobs" | "speed">("rating");

  const sortedEditors = [...videoEditors].sort((a, b) => {
    if (sortBy === "rating") {
      return b.rating - a.rating;
    } else if (sortBy === "jobs") {
      return b.completedJobs - a.completedJobs;
    } else {
      // speed - lower turnaround time is better
      const getHours = (str: string) => {
        if (str.includes("日以内")) return parseInt(str) * 24;
        if (str.includes("日")) return parseInt(str.split("-")[1]) * 24;
        return parseInt(str);
      };
      return getHours(a.averageTurnaround) - getHours(b.averageTurnaround);
    }
  });

  const getRankBadge = (index: number) => {
    if (index === 0)
      return (
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
          1st
        </div>
      );
    if (index === 1)
      return (
        <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
          2nd
        </div>
      );
    if (index === 2)
      return (
        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
          3rd
        </div>
      );
    return (
      <div className="w-10 h-10 bg-[var(--pearl-medium)] rounded-full flex items-center justify-center font-bold">
        {index + 1}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-[var(--pearl-light)] z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-[var(--pearl-light)] rounded-full transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="font-bold text-xl">編集者ランキング</h1>
              <p className="text-sm text-gray-600">
                プロの動画編集者をランキングから探す
              </p>
            </div>
          </div>

          {/* Sort Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSortBy("rating")}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                sortBy === "rating"
                  ? "bg-black text-white"
                  : "bg-[var(--pearl-light)] hover:bg-[var(--pearl-medium)]"
              }`}
            >
              <Star size={16} className="inline mr-1" />
              評価順
            </button>
            <button
              onClick={() => setSortBy("jobs")}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                sortBy === "jobs"
                  ? "bg-black text-white"
                  : "bg-[var(--pearl-light)] hover:bg-[var(--pearl-medium)]"
              }`}
            >
              <Award size={16} className="inline mr-1" />
              実績順
            </button>
            <button
              onClick={() => setSortBy("speed")}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                sortBy === "speed"
                  ? "bg-black text-white"
                  : "bg-[var(--pearl-light)] hover:bg-[var(--pearl-medium)]"
              }`}
            >
              <Zap size={16} className="inline mr-1" />
              スピード順
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="px-4 py-6 bg-[var(--pearl-light)]">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{videoEditors.length}</p>
            <p className="text-xs text-gray-600 mt-1">登録編集者</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {videoEditors
                .reduce((sum, e) => sum + e.completedJobs, 0)
                .toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 mt-1">総編集数</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {(
                videoEditors.reduce((sum, e) => sum + e.rating, 0) /
                videoEditors.length
              ).toFixed(1)}
            </p>
            <p className="text-xs text-gray-600 mt-1">平均評価</p>
          </div>
        </div>
      </div>

      {/* Ranking List */}
      <div className="px-4 py-4">
        <div className="space-y-3">
          {sortedEditors.map((editor, index) => (
            <div
              key={editor.id}
              className="border-2 border-[var(--pearl-medium)] rounded-lg p-4 hover:border-black transition-all cursor-pointer"
              onClick={() => {
                // Navigate to editor detail or open selection modal
              }}
            >
              <div className="flex gap-4">
                {/* Rank Badge */}
                <div className="flex-shrink-0">{getRankBadge(index)}</div>

                {/* Avatar */}
                <img
                  src={editor.avatar}
                  alt={editor.name}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold flex items-center gap-2">
                        {editor.name}
                        {index === 0 && (
                          <Award
                            size={16}
                            className="fill-yellow-400 text-yellow-400"
                          />
                        )}
                        {editor.rating >= 4.8 && (
                          <span className="text-xs bg-yellow-400 text-black px-2 py-0.5 rounded-full">
                            人気
                          </span>
                        )}
                        {editor.paymentType === "revenue_share" && (
                          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                            初期費用なし
                          </span>
                        )}
                        {!editor.isAvailable && (
                          <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                            満員
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          <Star
                            size={14}
                            className="fill-yellow-400 text-yellow-400"
                          />
                          <span className="text-sm font-bold">
                            {editor.rating}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 size={14} className="text-green-600" />
                          <span className="text-sm">{editor.completedJobs}件</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} className="text-gray-600" />
                          <span className="text-sm">
                            {editor.averageTurnaround}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {editor.paymentType === "upfront" ? (
                        <>
                          <p className="text-sm text-gray-600">料金</p>
                          <p className="font-bold">¥{editor.pricePerMinute}/分</p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-green-600 font-bold mb-1">
                            初期費用なし
                          </p>
                          <p className="text-sm text-gray-600">収益シェア</p>
                          <p className="font-bold text-green-600">
                            {editor.revenueShare}%
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-2">{editor.bio}</p>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editor.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="text-xs bg-[var(--pearl-medium)] px-2 py-1 rounded"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>

                  {/* Portfolio Preview */}
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {editor.portfolio.slice(0, 3).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Portfolio ${idx + 1}`}
                        className="w-24 h-16 rounded object-cover flex-shrink-0"
                      />
                    ))}
                  </div>

                  {/* Ranking Highlight */}
                  {sortBy === "rating" && index < 3 && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <ThumbsUp size={14} className="text-green-600" />
                      <span className="text-green-600 font-bold">
                        高評価率 {Math.floor(editor.rating * 20)}%
                      </span>
                    </div>
                  )}
                  {sortBy === "jobs" && index < 3 && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <TrendingUp size={14} className="text-blue-600" />
                      <span className="text-blue-600 font-bold">
                        実績No.{index + 1}編集者
                      </span>
                    </div>
                  )}
                  {sortBy === "speed" && index < 3 && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <Zap size={14} className="text-orange-600" />
                      <span className="text-orange-600 font-bold">
                        最速{editor.averageTurnaround}対応
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
