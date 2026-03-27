import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  X,
  Users,
  Heart,
  MessageSquare,
  Gift,
  Radio,
  Share2,
  MoreVertical,
  StopCircle,
} from "lucide-react";
import LiveEndModal from "../components/LiveEndModal";
import EditorSelectionModal from "../components/EditorSelectionModal";
import EditRequestConfirmModal from "../components/EditRequestConfirmModal";
import { videoEditors, VideoEditor, currentUser } from "../data/mockData";
import { ShieldCheck, ShieldAlert, LogIn, AlertTriangle } from "lucide-react";

interface TipAnimation {
  id: string;
  amount: number;
  userName: string;
  x: number;
}

export default function LiveViewer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [viewerCount, setViewerCount] = useState(342);
  const [totalTips, setTotalTips] = useState(12500);
  const [tipAnimations, setTipAnimations] = useState<TipAnimation[]>([]);
  const [comments, setComments] = useState([
    { id: "1", user: "たかし", text: "きたー！", timestamp: Date.now() },
    { id: "2", user: "さくら", text: "待ってました🎉", timestamp: Date.now() + 1000 },
    { id: "3", user: "けんた", text: "最高！", timestamp: Date.now() + 2000 },
  ]);
  const [commentText, setCommentText] = useState("");
  const [showEndModal, setShowEndModal] = useState(false);
  const [showEditorSelection, setShowEditorSelection] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [selectedEditor, setSelectedEditor] = useState<VideoEditor | null>(null);
  const [liveStartTime] = useState(Date.now());
  const [showMenu, setShowMenu] = useState(false);

  const tipAmounts = [100, 300, 500, 1000, 3000, 5000];

  const getLiveStats = () => {
    const duration = Math.floor((Date.now() - liveStartTime) / 1000 / 60); // minutes
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const durationStr = hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
    
    return {
      duration: durationStr,
      durationMinutes: duration,
      viewers: viewerCount,
      totalTips: totalTips,
      yourEarnings: Math.floor(totalTips * 0.8),
    };
  };

  const handleEndLive = () => {
    setShowMenu(false);
    setShowEndModal(true);
  };

  const handleSaveAndEdit = () => {
    setShowEndModal(false);
    setShowEditorSelection(true);
  };

  const handleSaveOnly = () => {
    setShowEndModal(false);
    // Navigate to content page or show success message
    alert("動画がアーカイブに保存されました！");
    navigate("/");
  };

  const handleSelectEditor = (editor: VideoEditor) => {
    setSelectedEditor(editor);
    setShowEditorSelection(false);
    setShowEditConfirm(true);
  };

  const handleConfirmEdit = () => {
    setShowEditConfirm(false);
    // Process edit request
    alert(`${selectedEditor?.name}に編集を依頼しました！\n編集完了までお待ちください。`);
    navigate("/");
  };

  // Simulate viewer count changes
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((prev) => prev + Math.floor(Math.random() * 10 - 3));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSendTip = () => {
    if (!currentUser.isLoggedIn) {
      alert("投げ銭をするにはログインが必要です。");
      navigate("/auth");
      return;
    }
    if (!currentUser.isKycVerified) {
      alert("投げ銭などのお金が動く機能を利用するには、マイナンバーによる本人確認が必須です。マイページから認証を完了してください。");
      navigate("/auth");
      return;
    }
    if (selectedTip) {
      const newTotalTips = totalTips + selectedTip;
      setTotalTips(newTotalTips);

      // Add tip animation
      const newAnimation: TipAnimation = {
        id: Date.now().toString(),
        amount: selectedTip,
        userName: "あなた",
        x: Math.random() * 80 + 10,
      };
      setTipAnimations((prev) => [...prev, newAnimation]);

      // Remove animation after 3 seconds
      setTimeout(() => {
        setTipAnimations((prev) => prev.filter((a) => a.id !== newAnimation.id));
      }, 3000);

      setShowTipModal(false);
      setSelectedTip(null);

      // Add comment about tip
      const tipComment = {
        id: Date.now().toString(),
        user: "あなた",
        text: `¥${selectedTip.toLocaleString()}の投げ銭をしました💰`,
        timestamp: Date.now(),
      };
      setComments((prev) => [...prev, tipComment]);
    }
  };

  const handleSendComment = () => {
    if (!currentUser.isLoggedIn) {
      alert("コメントを投稿するにはログインが必要です。");
      navigate("/auth");
      return;
    }
    if (commentText.trim()) {
      const newComment = {
        id: Date.now().toString(),
        user: "あなた",
        text: commentText,
        timestamp: Date.now(),
      };
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* Live Video Area (Mock) */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900">
        {/* Mock video background */}
        <div className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold">
          LIVE配信中...
        </div>
      </div>

      {/* Tip Animations */}
      {tipAnimations.map((tip) => (
        <div
          key={tip.id}
          className="absolute bottom-32 animate-float-up z-30"
          style={{ left: `${tip.x}%` }}
        >
          <div className="bg-yellow-400 text-black px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
            <Gift size={20} />
            <span>¥{tip.amount.toLocaleString()}</span>
          </div>
          <p className="text-white text-xs text-center mt-1">{tip.userName}</p>
        </div>
      ))}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-black/50 rounded-full backdrop-blur"
          >
            <X size={24} className="text-white" />
          </button>

          <div className="flex items-center gap-3">
            {/* Viewer Count */}
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-2 rounded-full">
              <Users size={16} className="text-white" />
              <span className="text-white text-sm font-bold">{viewerCount}</span>
            </div>

            {/* Live Badge */}
            <div className="flex items-center gap-2 bg-red-500 px-3 py-2 rounded-full">
              <Radio size={16} className="text-white animate-pulse" />
              <span className="text-white text-sm font-bold">LIVE</span>
            </div>

            <button className="p-2 bg-black/50 rounded-full backdrop-blur">
              <MoreVertical size={24} className="text-white" />
            </button>
          </div>
        </div>

        {/* End Live Button (for broadcaster) */}
        <button
          onClick={handleEndLive}
          className="mt-4 flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-full transition-colors"
        >
          <StopCircle size={20} className="text-white" />
          <span className="text-white text-sm font-bold">配信を終了</span>
        </button>

        {/* Broadcaster Info */}
        <div className="mt-4 flex items-center gap-3 bg-black/50 backdrop-blur rounded-full px-4 py-3 w-fit">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop"
            alt="Broadcaster"
            className="w-10 h-10 rounded-full border-2 border-white"
          />
          <div>
            <h2 className="text-white font-bold">YOASOBI</h2>
            <p className="text-white/80 text-xs">JPOP界隈</p>
          </div>
        </div>
      </div>

      {/* Comments Stream */}
      <div className="absolute bottom-32 left-0 right-0 z-30 px-4 max-h-64 overflow-hidden">
        <div className="space-y-2">
          {comments.slice(-5).map((comment) => (
            <div
              key={comment.id}
              className="bg-black/50 backdrop-blur px-3 py-2 rounded-full w-fit max-w-[80%] animate-slide-in"
            >
              <p className="text-white text-sm">
                <span className="font-bold">{comment.user}</span>: {comment.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-black/80 to-transparent">
        {/* Total Tips Display */}
        <div className="mb-3 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded-full font-bold">
            <Gift size={20} />
            <span>総投げ銭: ¥{totalTips.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Comment Input */}
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendComment()}
            placeholder="コメントを入力..."
            className="flex-1 px-4 py-3 bg-white/20 backdrop-blur border border-white/30 rounded-full text-white placeholder-white/60 focus:outline-none focus:border-white"
          />

          {/* Action Buttons */}
          <button
            onClick={handleSendComment}
            className="p-3 bg-white/20 backdrop-blur rounded-full border border-white/30 hover:bg-white/30 transition-colors"
          >
            <MessageSquare size={24} className="text-white" />
          </button>

          <button className="p-3 bg-white/20 backdrop-blur rounded-full border border-white/30 hover:bg-white/30 transition-colors">
            <Heart size={24} className="text-white" />
          </button>

          <button
            onClick={() => setShowTipModal(true)}
            className="p-3 bg-yellow-400 rounded-full hover:bg-yellow-500 transition-colors"
          >
            <Gift size={24} className="text-black" />
          </button>

          <button className="p-3 bg-white/20 backdrop-blur rounded-full border border-white/30 hover:bg-white/30 transition-colors">
            <Share2 size={24} className="text-white" />
          </button>
        </div>
      </div>

      {/* Tip Modal */}
      {showTipModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center"
          onClick={() => setShowTipModal(false)}
        >
          <div
            className="bg-[#1F2937] rounded-t-2xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">投げ銭を送る</h3>
              <button
                onClick={() => setShowTipModal(false)}
                className="p-1 hover:bg-[var(--pearl-light)] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* KYC Warning */}
            {!currentUser.isKycVerified && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-amber-500 mb-1">本人確認が未完了です</p>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    お金が動く取引（投げ銭等）を行うには、マイナンバーによる本人確認が必須です。
                  </p>
                  <button onClick={() => navigate("/auth")} className="text-[10px] text-amber-500 font-black uppercase tracking-widest mt-2 hover:underline">
                    認証へ進む
                  </button>
                </div>
              </div>
            )}

            {/* Tip Amount Selection */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {tipAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setSelectedTip(amount)}
                  className={`py-4 rounded-lg border-2 transition-all font-bold ${
                    selectedTip === amount
                      ? "border-black bg-[var(--pearl-light)]"
                      : "border-[var(--pearl-medium)] hover:border-gray-400"
                  }`}
                >
                  ¥{amount.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Revenue Share Info */}
            {selectedTip && (
              <div className="mb-4 p-4 bg-[var(--pearl-light)] rounded-lg">
                <p className="text-sm font-bold mb-3">クリエイターへ</p>
                <div className="text-center">
                  <p className="text-3xl font-bold text-black">
                    ¥{Math.floor(selectedTip * 0.8).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    (80%)
                  </p>
                </div>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSendTip}
              disabled={!selectedTip}
              className={`w-full py-3 rounded-lg font-bold transition-colors ${
                selectedTip
                  ? "bg-black text-white hover:bg-gray-800"
                  : "bg-[var(--pearl-medium)] text-gray-400"
              }`}
            >
              {selectedTip ? `¥${selectedTip.toLocaleString()}を送る` : "金額を選択してください"}
            </button>
          </div>
        </div>
      )}

      {/* Live End Modal */}
      {showEndModal && (
        <LiveEndModal
          stats={getLiveStats()}
          onSaveAndEdit={handleSaveAndEdit}
          onSaveOnly={handleSaveOnly}
          onClose={() => setShowEndModal(false)}
        />
      )}

      {/* Editor Selection Modal */}
      {showEditorSelection && (
        <EditorSelectionModal
          editors={videoEditors}
          estimatedDuration={getLiveStats().durationMinutes}
          onSelectEditor={handleSelectEditor}
          onClose={() => setShowEditorSelection(false)}
        />
      )}

      {/* Edit Request Confirm Modal */}
      {showEditConfirm && selectedEditor && (
        <EditRequestConfirmModal
          editor={selectedEditor}
          estimatedDuration={getLiveStats().durationMinutes}
          liveStreamTitle="YOASOBIライブ配信"
          onConfirm={handleConfirmEdit}
          onClose={() => setShowEditConfirm(false)}
        />
      )}

      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-200px) scale(1.2);
            opacity: 0;
          }
        }

        @keyframes slide-in {
          0% {
            transform: translateX(-20px);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-float-up {
          animation: float-up 3s ease-out;
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}