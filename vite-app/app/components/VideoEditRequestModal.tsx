import { useState } from "react";
import { X, Upload, Film, Clock } from "lucide-react";

interface VideoEditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (videoFile: File, duration: number, title: string) => void;
  communityId?: string;
}

export default function VideoEditRequestModal({
  isOpen,
  onClose,
  onUpload,
  communityId,
}: VideoEditRequestModalProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState(10);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      // In a real app, we'd calculate actual duration from the video file
      // For now, we'll use a mock duration
    }
  };

  const handleProceed = () => {
    if (videoFile && videoTitle) {
      onUpload(videoFile, estimatedDuration, videoTitle);
    }
  };

  if (!isOpen) return null;

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
          <h2 className="font-bold text-lg pr-8">動画編集を依頼</h2>
          <p className="text-sm text-gray-900 mt-1">
            動画をアップロードして編集者に依頼します
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Video Title */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">動画タイトル</label>
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="例: YOASOBIライブダイジェスト"
              className="w-full px-4 py-2 border-2 border-[var(--pearl-medium)] rounded-lg focus:outline-none focus:border-black"
            />
          </div>

          {/* Video Upload */}
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">動画ファイル</label>
            {!videoFile ? (
              <label className="block border-2 border-dashed border-[var(--pearl-medium)] rounded-lg p-8 hover:border-black cursor-pointer transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="text-center">
                  <Upload size={48} className="mx-auto mb-3 text-gray-400" />
                  <p className="font-bold mb-1">動画をアップロード</p>
                  <p className="text-sm text-gray-900">
                    クリックまたはドラッグ＆ドロップ
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    MP4, MOV, AVI (最大2GB)
                  </p>
                </div>
              </label>
            ) : (
              <div className="border-2 border-[var(--pearl-medium)] rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[var(--pearl-light)] rounded flex items-center justify-center">
                    <Film size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{videoFile.name}</p>
                    <p className="text-xs text-gray-600">
                      {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setVideoFile(null)}
                  className="p-1 hover:bg-[var(--pearl-light)] rounded transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Duration Estimate */}
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2">
              推定動画時間（分）
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="120"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(parseInt(e.target.value))}
                className="flex-1"
              />
              <div className="flex items-center gap-2 bg-[var(--pearl-light)] px-4 py-2 rounded-lg font-bold min-w-[100px] justify-center">
                <Clock size={16} />
                <span>{estimatedDuration}分</span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-[var(--pearl-light)] rounded-lg p-4 mb-6">
            <h4 className="font-bold text-sm mb-2">編集依頼の流れ</h4>
            <ol className="text-sm text-gray-700 space-y-1">
              <li>1. 動画をアップロード</li>
              <li>2. 編集者を選択</li>
              <li>3. 編集料金を支払い</li>
              <li>4. 編集完了後、動画を公開</li>
              <li>5. 販売収益を受け取る</li>
            </ol>
          </div>

          {/* Revenue Share */}
          <div className="bg-black text-white rounded-lg p-4 mb-6">
            <p className="text-xs mb-2 opacity-80">編集済み動画の収益配分</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>あなた（クリエイター）</span>
                <span className="font-bold">40%</span>
              </div>
              <div className="flex justify-between opacity-80">
                <span>動画編集者</span>
                <span className="font-bold">10%</span>
              </div>
              <div className="flex justify-between opacity-80">
                <span>公認サポーター</span>
                <span className="font-bold">20%</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleProceed}
              disabled={!videoFile || !videoTitle}
              className={`w-full py-3 rounded-lg font-bold transition-colors ${
                videoFile && videoTitle
                  ? "bg-black text-white hover:bg-gray-800"
                  : "bg-[var(--pearl-medium)] text-gray-400"
              }`}
            >
              編集者を選ぶ
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