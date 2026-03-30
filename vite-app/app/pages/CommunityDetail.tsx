import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, MessageSquare, Clock, Users as UsersIcon, Film } from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";
import ActivityCard from "../components/ActivityCard";
import VideoEditRequestModal from "../components/VideoEditRequestModal";
import EditorSelectionModal from "../components/EditorSelectionModal";
import EditRequestConfirmModal from "../components/EditRequestConfirmModal";
import { communities, activityCards, creators, videoEditors, VideoEditor } from "../data/mockData";

export default function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"new" | "creators" | "board">("new");
  const [isFollowing, setIsFollowing] = useState(false);
  const [showVideoEditRequest, setShowVideoEditRequest] = useState(false);
  const [showEditorSelection, setShowEditorSelection] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [selectedEditor, setSelectedEditor] = useState<VideoEditor | null>(null);
  const [videoData, setVideoData] = useState<{
    file: File;
    duration: number;
    title: string;
  } | null>(null);

  const community = communities.find((c) => c.id === id);
  const activities = activityCards.filter((a) => a.communityId === id);
  const communityCreators = creators.filter((c) => c.communityId === id);

  const handleVideoUpload = (file: File, duration: number, title: string) => {
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

  if (!community) {
    return (
      <div className="min-h-screen bg-[#334155] flex items-center justify-center text-white">
        <p className="text-gray-300">コミュニティが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#334155] pb-20 text-white">
      {/* Cover Image */}
      <div className="relative h-48 bg-slate-800">
        <img
          src={community.coverImage}
          alt={community.name}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#334155] to-transparent" />
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-4 left-4 p-2 bg-black/40 backdrop-blur-md border border-white/20 rounded-full hover:bg-black/60 transition-colors text-white"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* Community Info */}
      <div className="px-4 pb-6 border-b border-slate-700 relative">
        <div className="flex items-end gap-4 -mt-12 mb-5 relative z-10">
          <div className="relative">
            <img
              src={community.avatar}
              alt={community.name}
              className="w-24 h-24 rounded-2xl border-4 border-[#334155] shadow-2xl object-cover bg-slate-700"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0891B2] border-4 border-[#334155] rounded-full" />
          </div>
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-bold text-2xl tracking-tight">{community.name}</h1>
              <div className="bg-[#0891B2]/20 text-[#0891B2] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#0891B2]/30 uppercase tracking-wider">
                Official
              </div>
            </div>
            <p className="text-xs text-[#0891B2] font-bold uppercase tracking-widest">{community.category}</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">{community.description}</p>
          
          <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1">
              <span className="text-white font-bold">{community.followers.toLocaleString()}</span>
              <span>フォロワー</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600" />
            <div className="flex items-center gap-1">
              <span className="text-white font-bold">{communityCreators.length}</span>
              <span>クリエイター</span>
            </div>
          </div>

          <button
            onClick={() => setIsFollowing(!isFollowing)}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
              isFollowing
                ? "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750"
                : "bg-[#0891B2] text-white hover:bg-[#0891B2]/90 shadow-[#0891B2]/20"
            }`}
          >
            {isFollowing ? "フォロー解除" : "コミュニティをフォロー"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 bg-[#334155]/80 backdrop-blur-xl border-b border-slate-700 z-20 flex px-2">
        <button
          onClick={() => setActiveTab("new")}
          className={`flex-1 py-4 font-bold text-xs uppercase tracking-widest transition-colors relative ${
            activeTab === "new" ? "text-[#0891B2]" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          新着順
          {activeTab === "new" && (
            <motion.div 
              layoutId="activeTab"
              className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#0891B2] rounded-full" 
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("creators")}
          className={`flex-1 py-4 font-bold text-xs uppercase tracking-widest transition-colors relative ${
            activeTab === "creators" ? "text-[#0891B2]" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          クリエイター
          {activeTab === "creators" && (
            <motion.div 
              layoutId="activeTab"
              className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#0891B2] rounded-full" 
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("board")}
          className={`flex-1 py-4 font-bold text-xs uppercase tracking-widest transition-colors relative ${
            activeTab === "board" ? "text-[#0891B2]" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          掲示板
          {activeTab === "board" && (
            <motion.div 
              layoutId="activeTab"
              className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#0891B2] rounded-full" 
            />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {/* Banner Ad CTA */}
        <div className="bg-gradient-to-br from-purple-900/20 to-slate-900/40 border border-purple-700/30 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <div className="text-white font-bold text-sm">バナー広告を掲載する</div>
            <div className="text-slate-400 text-xs mt-0.5">メンバー数 × 7円/日 ・ 最低¥10,000</div>
          </div>
          <button
            onClick={() => navigate(`/community/${id}/ad`)}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-500 transition-all"
          >
            詳細・申込
          </button>
        </div>

        {/* Video Edit Request CTA */}
        <div className="bg-gradient-to-br from-[#0891B2]/20 to-indigo-900/40 border border-[#0891B2]/30 rounded-2xl p-6 mb-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#0891B2]/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#0891B2] flex items-center justify-center shadow-lg shadow-[#0891B2]/20">
              <Film size={20} className="text-white" />
            </div>
            <h3 className="font-bold text-lg">動画投稿を依頼する</h3>
          </div>
          <p className="text-sm text-slate-300 mb-5 leading-relaxed">
            プロの編集者に依頼して、あなたの活動をハイクオリティな動画としてコミュニティに届けましょう。
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowVideoEditRequest(true)}
              className="flex-1 bg-[#0891B2] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#0891B2]/90 transition-all shadow-lg shadow-[#0891B2]/10"
            >
              依頼を作成
            </button>
            <button
              onClick={() => navigate("/editors")}
              className="px-5 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold hover:bg-slate-750 transition-all"
            >
              編集者リスト
            </button>
          </div>
        </div>

        {activeTab === "new" ? (
          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))
            ) : (
              <div className="text-center py-20 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700">
                <p className="text-slate-500 font-bold">まだ投稿がありません</p>
              </div>
            )}
          </div>
        ) : activeTab === "creators" ? (
          <div className="grid grid-cols-2 gap-3">
            {communityCreators.map((creator) => (
              <div
                key={creator.id}
                className="flex flex-col items-center p-4 rounded-2xl bg-slate-800 border border-slate-700 hover:border-[#0891B2] transition-all group"
              >
                <div className="relative mb-3">
                  <img
                    src={creator.avatar}
                    alt={creator.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700 group-hover:border-[#0891B2] transition-colors"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0891B2] border-2 border-slate-800 rounded-full" />
                </div>
                <h3 className="font-bold text-sm text-center mb-1 line-clamp-1 group-hover:text-[#0891B2] transition-colors">
                  {creator.name}
                </h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">
                  {creator.followers.toLocaleString()} FOLLOWERS
                </p>
                <button className="w-full py-2 bg-[#0891B2] text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#0891B2]/90 transition-all">
                  Follow
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
              <MessageSquare size={32} />
            </div>
            <p className="text-slate-400 font-bold mb-1">掲示板は準備中です</p>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Coming Soon</p>
          </div>
        )}
      </div>

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