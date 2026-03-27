import { X, Video, Clock, Users, DollarSign, Film } from "lucide-react";

interface LiveEndModalProps {
  onClose: () => void;
  onSaveAndEdit: () => void;
  onSaveOnly: () => void;
  stats: {
    duration: string;
    viewers: number;
    totalTips: number;
    yourEarnings: number;
  };
  onCancel?: () => void;
}

export default function LiveEndModal({
  onClose,
  onSaveAndEdit,
  onSaveOnly,
  stats,
  onCancel,
}: LiveEndModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#475569] text-white rounded-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[var(--pearl-light)] px-6 py-4 border-b border-[var(--pearl-medium)]">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 hover:bg-white/50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="font-bold text-lg pr-8">ライブ配信が終了しました</h2>
          <p className="text-sm text-white mt-1">
            お疲れ様でした！
          </p>
        </div>

        {/* Stats */}
        <div className="px-6 py-6">
          <div className="bg-[var(--pearl-light)] rounded-lg p-5 mb-6">
            <h3 className="font-bold text-sm mb-4 text-center">配信統計</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock size={20} className="text-white" />
                </div>
                <p className="text-2xl font-bold">{stats.duration}</p>
                <p className="text-xs text-white mt-1">配信時間</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users size={20} className="text-white" />
                </div>
                <p className="text-2xl font-bold">{stats.viewers}</p>
                <p className="text-xs text-white mt-1">総視聴者数</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign size={20} className="text-white" />
                </div>
                <p className="text-2xl font-bold">¥{stats.totalTips.toLocaleString()}</p>
                <p className="text-xs text-white mt-1">総投げ銭</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign size={20} className="text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">¥{stats.yourEarnings.toLocaleString()}</p>
                <p className="text-xs text-white mt-1">あなたの取り分</p>
              </div>
            </div>
          </div>

          {/* Revenue Share Info */}
          <div className="bg-black text-white rounded-lg p-4 mb-6">
            <p className="text-xs mb-2 opacity-80">収益配分（ライブ配信）</p>
            <div className="flex justify-between items-center">
              <span className="text-sm">あなた（クリエイター）</span>
              <span className="text-2xl font-bold">80%</span>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            <div className="border-2 border-[var(--pearl-medium)] rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Film size={24} />
                <h4 className="font-bold">動画を保存して編集者に依頼</h4>
              </div>
              <p className="text-sm text-white mb-3">
                プロの編集者に依頼してクオリティの高い動画コンテンツに仕上げます
              </p>
              <div className="bg-[var(--pearl-light)] rounded p-3 mb-3">
                <p className="text-xs font-bold mb-2">編集付き動画の収益配分</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>クリエイター（あなた）</span>
                    <span className="font-bold">40%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>動画編集者</span>
                    <span className="font-bold">10%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>公認サポーター</span>
                    <span className="font-bold">20%</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onSaveAndEdit}
                className="w-full bg-black text-white py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors"
              >
                編集者を選ぶ
              </button>
            </div>

            <div className="border-2 border-[var(--pearl-medium)] rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Video size={24} />
                <h4 className="font-bold">動画をそのまま保存</h4>
              </div>
              <p className="text-sm text-white mb-3">
                編集なしでアーカイブとして保存します
              </p>
              <button
                onClick={onSaveOnly}
                className="w-full bg-[var(--pearl-light)] text-white py-2 rounded-lg font-bold hover:bg-[var(--pearl-medium)] transition-colors"
              >
                保存する
              </button>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full text-sm text-white hover:text-gray-300 transition-colors"
          >
            後で決める
          </button>
        </div>
      </div>
    </div>
  );
}