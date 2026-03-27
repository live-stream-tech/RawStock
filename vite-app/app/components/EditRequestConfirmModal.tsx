import { X, Clock, DollarSign, TrendingUp, CheckCircle2 } from "lucide-react";
import { VideoEditor } from "../data/mockData";

interface EditRequestConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  editor: VideoEditor | null;
  videoData: {
    file: File;
    duration: number;
    title: string;
  } | null;
}

export default function EditRequestConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  editor,
  videoData,
}: EditRequestConfirmModalProps) {
  if (!isOpen || !editor || !videoData) return null;

  const editPrice = editor.pricePerMinute * videoData.duration;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1F2937] rounded-2xl w-full max-w-lg overflow-hidden"
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
          <h2 className="font-bold text-lg pr-8">編集依頼の確認</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Video Info */}
          <div className="bg-[var(--pearl-light)] rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-900 mb-1">動画タイトル</p>
            <p className="font-bold">{videoData.title}</p>
            <p className="text-sm text-gray-900 mt-2">
              推定時間: {videoData.duration}分
            </p>
          </div>

          {/* Editor Info */}
          <div className="border-2 border-[var(--pearl-medium)] rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-900 mb-2">編集者</p>
            <div className="flex items-center gap-3 mb-3">
              <img
                src={editor.avatar}
                alt={editor.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1">
                <h3 className="font-bold">{editor.name}</h3>
                <p className="text-sm text-gray-900">{editor.bio}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock size={14} className="text-gray-900" />
                <span>{editor.averageTurnaround}</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 size={14} className="text-green-600" />
                <span>{editor.completedJobs}件完了</span>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          {editor.paymentType === "upfront" ? (
            <div className="bg-[var(--pearl-light)] rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={20} />
                <h4 className="font-bold">編集料金（前払い）</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>編集料金（¥{editor.pricePerMinute}/分）</span>
                  <span className="font-bold">¥{editPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[var(--pearl-medium)]">
                  <span className="font-bold">お支払い金額</span>
                  <span className="text-xl font-bold">¥{editPrice.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                ※編集完了後に動画を公開すると販売収益が発生します
              </p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={20} className="text-green-600" />
                <h4 className="font-bold text-green-600">初期費用なし！</h4>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                レベニューシェア型なので編集料金の前払いは不要です。
              </p>
              <div className="bg-[#2A2D35] rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-2">編集者の収益シェア</p>
                <p className="text-2xl font-bold text-green-600">{editor.revenueShare}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  動画が売れた時に販売価格から{editor.revenueShare}%が編集者に支払われます
                </p>
              </div>
            </div>
          )}

          {/* Revenue Share */}
          <div className="bg-black text-white rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={20} />
              <h4 className="font-bold text-sm">編集済み動画の収益配分</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span>あなた（クリエイター）</span>
                <span className="text-xl font-bold">
                  {editor.paymentType === "upfront" ? "40" : 50 - editor.revenueShare}%
                </span>
              </div>
              <div className="flex justify-between items-center opacity-80">
                <span>動画編集者</span>
                <span className="font-bold">{editor.revenueShare}%</span>
              </div>
              <div className="flex justify-between items-center opacity-80">
                <span>公認サポーター</span>
                <span className="font-bold">20%</span>
              </div>
            </div>
            <p className="text-xs opacity-60 mt-3">
              {editor.paymentType === "upfront"
                ? "動画が¥1,000で売れた場合、あなたは¥400を受け取ります"
                : `動画が¥1,000で売れた場合、あなたは¥${(1000 * (50 - editor.revenueShare)) / 100}を受け取ります`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={onConfirm}
              className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors"
            >
              {editor.paymentType === "upfront"
                ? `編集を依頼する（¥${editPrice.toLocaleString()}）`
                : "編集を依頼する（初期費用なし）"}
            </button>
            <button
              onClick={onClose}
              className="w-full bg-[var(--pearl-light)] text-black py-2 rounded-lg text-sm hover:bg-[var(--pearl-medium)] transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}