import { Bell, Radio, Film, Users, ExternalLink, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import HorizontalScroll from "../components/HorizontalScroll";
import LiveStreamCard from "../components/LiveStreamCard";
import VideoCard from "../components/VideoCard";
import CreatorRankingCard from "../components/CreatorRankingCard";
import Logo from "../rawstock-lp/Logo";
import NotificationModal from "../components/NotificationModal";
import VideoEditRequestModal from "../components/VideoEditRequestModal";
import EditorSelectionModal from "../components/EditorSelectionModal";
import EditRequestConfirmModal from "../components/EditRequestConfirmModal";
import {
  liveStreams,
  newVideos,
  creatorLiveRanking,
  videoRanking,
  notifications,
  videoEditors,
  VideoEditor,
  currentUser as initialUser,
} from "../data/mockData";

interface BannerAd {
  id: number;
  title: string;
  imageUrl: string | null;
  linkUrl: string | null;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
}

export default function CommunityTop() {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showVideoEditRequest, setShowVideoEditRequest] = useState(false);
  const [showEditorSelection, setShowEditorSelection] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [videoRankPeriod, setVideoRankPeriod] = useState<"weekly" | "monthly" | "all">("all");
  const [creatorRankPeriod, setCreatorRankPeriod] = useState<"weekly" | "monthly" | "all">("monthly");
  const [selectedEditor, setSelectedEditor] = useState<VideoEditor | null>(null);
  const [videoData, setVideoData] = useState<{
    file: File;
    duration: number;
    title: string;
  } | null>(null);
  const [banners, setBanners] = useState<BannerAd[]>([]);
  const [todayLoginCount, setTodayLoginCount] = useState<number | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Fetch platform banners
  useEffect(() => {
    fetch("/api/platform-banners")
      .then(r => r.json())
      .then((data: BannerAd[]) => {
        if (Array.isArray(data) && data.length > 0) setBanners(data);
      })
      .catch(() => {});
  }, []);

  // Fetch today's login count
  useEffect(() => {
    fetch("/api/daily-login/count")
      .then(r => r.json())
      .then((data: { count: number }) => {
        if (typeof data.count === "number") setTodayLoginCount(data.count);
      })
      .catch(() => {});
  }, []);

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex(i => (i + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const currentBanner = banners[currentBannerIndex];

  const getVideoRanking = () => {
    switch (videoRankPeriod) {
      case "weekly": return videoRanking.slice(0, 5); // Mock different data
      case "monthly": return videoRanking.slice(2, 7); // Mock different data
      default: return videoRanking;
    }
  };

  const getCreatorRanking = () => {
    switch (creatorRankPeriod) {
      case "weekly": return creatorLiveRanking.slice(1, 6); // Mock different data
      case "all": return creatorLiveRanking.slice(0, 8); // Mock different data
      default: return creatorLiveRanking;
    }
  };

  const handleVideoUpload = (file: File, duration: number, title: string) => {
    if (!initialUser.isLoggedIn) {
      alert("投稿するにはログインが必要です。");
      navigate("/auth");
      return;
    }
    setVideoData({ file, duration, title });
    setShowVideoEditRequest(false);
    setShowEditorSelection(true);
  };

  const handleSelectEditor = (editor: VideoEditor) => {
    setSelectedEditor(editor);
    setShowEditorSelection(false);
    setShowEditConfirm(true);
  };

  const handleConfirmEdit = () => {
    setShowEditConfirm(false);
    alert(`${selectedEditor?.name}に編集を依頼しました！\n編集完了までお待ちください。`);
    // Reset state
    setVideoData(null);
    setSelectedEditor(null);
  };

  return (
    <div className="min-h-screen bg-[#334155] pb-4 text-white">
      {/* Header */}
      <div className="sticky top-0 bg-[#475569]/80 backdrop-blur-xl border-b border-[#0891B2]/30 px-4 py-3 z-30">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-2">
            {/* Today's login count */}
            {todayLoginCount !== null && (
              <div className="flex items-center gap-1 bg-slate-700/50 px-2.5 py-1 rounded-full border border-slate-600/50">
                <TrendingUp size={11} className="text-[#0891B2]" />
                <span className="text-[10px] font-bold text-slate-300">
                  {todayLoginCount.toLocaleString()}<span className="text-slate-500 ml-0.5">today</span>
                </span>
              </div>
            )}
            <button
              onClick={() => navigate("/home")}
              className="p-2 hover:bg-slate-700/50 rounded-full transition-colors text-slate-300"
            >
              <Users size={20} />
            </button>
            <button
              onClick={() => navigate("/live-list")}
              className="flex items-center gap-2 bg-[#0891B2]/20 hover:bg-[#0891B2]/30 text-[#0891B2] px-3 py-1.5 rounded-full border border-[#0891B2]/30 transition-all group"
            >
              <Radio size={16} className="group-hover:animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest">Live</span>
            </button>
            <button
              onClick={() => setShowNotifications(true)}
              className="p-2 hover:bg-slate-700/50 rounded-full transition-colors relative text-slate-300"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-black">
                  {unreadCount}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-3">
        {/* Platform Banner Ad */}
        {currentBanner ? (
          <div className="px-4 mb-5">
            <div
              className={`rounded-xl overflow-hidden border border-[#0891B2]/20 shadow-lg relative ${currentBanner.linkUrl ? "cursor-pointer hover:opacity-95 transition-all" : ""}`}
              onClick={() => {
                if (currentBanner.linkUrl) window.open(currentBanner.linkUrl, "_blank", "noopener,noreferrer");
              }}
            >
              {currentBanner.imageUrl ? (
                <div className="relative">
                  <img src={currentBanner.imageUrl} alt={currentBanner.title} className="w-full h-28 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-end justify-between">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#0891B2]">AD</p>
                      <h3 className="font-bold text-sm text-white leading-tight">{currentBanner.title}</h3>
                      {currentBanner.description && (
                        <p className="text-[10px] text-white/70 leading-tight line-clamp-1">{currentBanner.description}</p>
                      )}
                    </div>
                    {currentBanner.linkUrl && <ExternalLink size={14} className="text-white/70 flex-shrink-0 mb-1" />}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-[#0891B2] to-[#1E293B] px-4 py-3 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#0891B2]/80">AD</p>
                    <h3 className="font-bold text-sm tracking-tight">{currentBanner.title}</h3>
                    {currentBanner.description && (
                      <p className="text-[10px] opacity-80 leading-tight line-clamp-1">{currentBanner.description}</p>
                    )}
                  </div>
                  {currentBanner.linkUrl && (
                    <button className="bg-[#0891B2] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg ml-4 flex-shrink-0 flex items-center gap-1">
                      詳細 <ExternalLink size={10} />
                    </button>
                  )}
                </div>
              )}
              {banners.length > 1 && (
                <div className="absolute bottom-1 right-2 flex gap-1">
                  {banners.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentBannerIndex ? "bg-white" : "bg-white/30"}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* New Videos */}
        <HorizontalScroll title="🎬 新着動画">
          {newVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </HorizontalScroll>

        {/* Currently Live */}
        {liveStreams.length > 0 && (
          <div className="mb-6">
            <div className="px-4 flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-red-500 rounded-full" />
                <h2 className="font-bold text-sm tracking-tight">現在ライブ中</h2>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </div>
              <button 
                onClick={() => navigate("/live-list")}
                className="text-[10px] font-black text-[#0891B2] uppercase tracking-[0.2em] hover:opacity-70 transition-opacity"
              >
                View all
              </button>
            </div>
            <HorizontalScroll>
              {liveStreams.map((stream) => (
                <LiveStreamCard key={stream.id} stream={stream} />
              ))}
            </HorizontalScroll>
          </div>
        )}

        {/* Video Ranking with Period Tabs */}
        <div className="mb-6">
          <div className="px-4 flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-4 bg-[#0891B2] rounded-full" />
              有料動画ランキング
            </h2>
            <div className="flex bg-slate-800/50 p-0.5 rounded-lg border border-slate-700/50">
              {(["weekly", "monthly", "all"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setVideoRankPeriod(period)}
                  className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all ${
                    videoRankPeriod === period
                      ? "bg-[#0891B2] text-white shadow-lg"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <HorizontalScroll>
            {getVideoRanking().map((video, index) => (
              <VideoCard
                key={`${videoRankPeriod}-${video.id}`}
                video={video}
                showRank={index + 1}
              />
            ))}
          </HorizontalScroll>
        </div>

        {/* Video Edit Request CTA */}
        <div className="px-4 mb-8">
          <div className="bg-gradient-to-br from-[#0891B2] to-slate-800 border border-[#0891B2]/30 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-slate-900 opacity-20" />
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                      <Film size={16} className="text-white" />
                    </div>
                    <h3 className="font-black text-sm text-white uppercase tracking-wider">Video Request</h3>
                  </div>
                  <p className="text-xs text-slate-100/80 leading-snug">プロの編集者に依頼して、ライブを作品に。</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowVideoEditRequest(true)}
                  className="flex-1 bg-white text-[#0891B2] py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg"
                >
                  Request
                </button>
                <button
                  onClick={() => navigate("/editors")}
                  className="px-5 py-2.5 bg-black/20 border border-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all backdrop-blur-sm"
                >
                  Editors
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
      />

      {/* Video Edit Request Modal */}
      <VideoEditRequestModal
        isOpen={showVideoEditRequest}
        onClose={() => setShowVideoEditRequest(false)}
        onUpload={handleVideoUpload}
      />

      {/* Editor Selection Modal */}
      <EditorSelectionModal
        isOpen={showEditorSelection}
        onClose={() => setShowEditorSelection(false)}
        editors={videoEditors}
        onSelect={handleSelectEditor}
      />

      {/* Edit Request Confirm Modal */}
      <EditRequestConfirmModal
        isOpen={showEditConfirm}
        onClose={() => setShowEditConfirm(false)}
        onConfirm={handleConfirmEdit}
        editor={selectedEditor}
        videoData={videoData}
      />
    </div>
  );
}
