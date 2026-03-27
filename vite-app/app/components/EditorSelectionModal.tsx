import { useState } from "react";
import { X, Star, Clock, CheckCircle2, Search, TrendingUp } from "lucide-react";
import { VideoEditor } from "../data/mockData";

interface EditorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (editor: VideoEditor) => void;
  editors: VideoEditor[];
  estimatedDuration?: number; // minutes
}

export default function EditorSelectionModal({
  isOpen,
  onClose,
  onSelect,
  editors,
  estimatedDuration = 10,
}: EditorSelectionModalProps) {
  const [selectedEditor, setSelectedEditor] = useState<VideoEditor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);

  const filteredEditors = editors.filter(
    (editor) =>
      editor.isAvailable &&
      (editor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        editor.specialties.some((s) =>
          s.toLowerCase().includes(searchQuery.toLowerCase())
        ))
  );

  const estimatedPrice = selectedEditor
    ? selectedEditor.pricePerMinute * estimatedDuration
    : 0;

  const handleConfirm = () => {
    if (selectedEditor) {
      onSelect(selectedEditor);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1F2937] rounded-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[var(--pearl-light)] px-6 py-4 border-b border-[var(--pearl-medium)]">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 hover:bg-white/50 rounded-full transition-colors z-10"
          >
            <X size={20} />
          </button>
          <h2 className="font-bold text-lg pr-8">動画編集者を選ぶ</h2>
          <p className="text-sm text-white mt-1">
            推定動画時間: {estimatedDuration}分
          </p>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-[var(--pearl-light)]">
          <div className="relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="編集者名や得意分野で検索..."
              className="w-full pl-10 pr-4 py-2 border-2 border-[var(--pearl-medium)] rounded-lg focus:outline-none focus:border-black"
            />
          </div>
        </div>

        {/* Editors List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {filteredEditors.map((editor) => (
              <div
                key={editor.id}
                onClick={() => setSelectedEditor(editor)}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedEditor?.id === editor.id
                    ? "border-black bg-[var(--pearl-light)]"
                    : "border-[var(--pearl-medium)] hover:border-gray-400"
                }`}
              >
                <div className="flex gap-4">
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
                          {editor.rating >= 4.8 && (
                            <span className="text-xs bg-yellow-400 text-white px-2 py-0.5 rounded-full">
                              人気
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <Star size={14} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-bold">{editor.rating}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 size={14} className="text-green-600" />
                            <span className="text-sm">{editor.completedJobs}件</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={14} className="text-white" />
                            <span className="text-sm">{editor.averageTurnaround}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {editor.paymentType === "upfront" ? (
                          <>
                            <p className="text-sm text-white">編集料金</p>
                            <p className="font-bold">
                              ¥{(editor.pricePerMinute * estimatedDuration).toLocaleString()}
                            </p>
                            <p className="text-xs text-white">
                              (¥{editor.pricePerMinute}/分)
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-green-600 font-bold mb-1">初期費用なし</p>
                            <p className="text-sm text-white">収益シェア</p>
                            <p className="font-bold text-green-600">{editor.revenueShare}%</p>
                            <p className="text-xs text-white">販売価格から</p>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-white mb-2">{editor.bio}</p>

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
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPortfolio(img);
                          }}
                          className="w-24 h-16 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredEditors.length === 0 && (
            <div className="text-center py-12 text-white">
              <p>該当する編集者が見つかりませんでした</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedEditor && (
          <div className="border-t border-[var(--pearl-medium)] px-6 py-4 bg-[var(--pearl-light)]">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={20} />
                <h4 className="font-bold">収益シミュレーション</h4>
              </div>
              <div className="bg-[#2A2D35] rounded-lg p-4">
                <p className="text-sm text-gray-900 mb-3">
                  動画価格を¥1,000に設定した場合（例）
                </p>
                <div className="space-y-2 text-sm mb-3">
                  {selectedEditor.paymentType === "upfront" ? (
                    <>
                      <div className="flex justify-between">
                        <span>あなた（クリエイター）</span>
                        <span className="font-bold">¥400 (40%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{selectedEditor.name}</span>
                        <span className="font-bold">¥{selectedEditor.revenueShare * 10} ({selectedEditor.revenueShare}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>公認サポーター</span>
                        <span className="font-bold">¥200 (20%)</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-[var(--pearl-medium)]">
                        <span>編集料金（初期費用）</span>
                        <span className="font-bold text-red-600">
                          -¥{estimatedPrice.toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>あなた（クリエイター）</span>
                        <span className="font-bold">
                          ¥{(1000 * (50 - selectedEditor.revenueShare)) / 100} ({50 - selectedEditor.revenueShare}%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{selectedEditor.name}</span>
                        <span className="font-bold text-green-600">
                          ¥{selectedEditor.revenueShare * 10} ({selectedEditor.revenueShare}%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>公認サポーター</span>
                        <span className="font-bold">¥200 (20%)</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-[var(--pearl-medium)]">
                        <span className="text-green-600 font-bold">初期費用</span>
                        <span className="font-bold text-green-600">¥0</span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {selectedEditor.paymentType === "upfront" 
                    ? "※編集料金は初回に支払い、その後は販売ごとに40%を受け取ります"
                    : "※初期費用なし！動画が売れた時だけ収益をシェアします"}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 bg-white border-2 border-[var(--pearl-medium)] text-black py-3 rounded-lg font-bold hover:bg-[var(--pearl-light)] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors"
              >
                {selectedEditor.name}に依頼する
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Portfolio Fullscreen View */}
      {selectedPortfolio && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPortfolio(null)}
        >
          <button
            onClick={() => setSelectedPortfolio(null)}
            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
          <img
            src={selectedPortfolio}
            alt="Portfolio"
            className="max-w-full max-h-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}