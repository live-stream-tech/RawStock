import { X, Video, Users, Clock, Globe, Lock, UserCheck } from "lucide-react";
import { useState } from "react";

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (settings: LiveStreamSettings) => void;
}

export interface LiveStreamSettings {
  visibility: "public" | "invite" | "oneOnOne";
  isPaid: boolean;
  price?: number;
}

export default function LiveStreamModal({
  isOpen,
  onClose,
  onStart,
}: LiveStreamModalProps) {
  const [visibility, setVisibility] = useState<"public" | "invite" | "oneOnOne">("public");
  const [isPaid, setIsPaid] = useState(false);
  const [priceInput, setPriceInput] = useState("500");

  if (!isOpen) return null;

  const currentPrice = parseInt(priceInput) || 0;

  const handleStart = () => {
    onStart({
      visibility,
      isPaid,
      price: isPaid ? currentPrice : undefined,
    });
  };

  const handlePriceChange = (value: string) => {
    // 数字のみ許可
    const cleanValue = value.replace(/[^0-9]/g, "");
    setPriceInput(cleanValue);
  };

  const pricePresets = [500, 1000, 3000, 5000];


  const getVisibilityText = () => {
    switch (visibility) {
      case "public":
        return { title: "一般公開", desc: "誰でも視聴可能" };
      case "invite":
        return { title: "招待者限定", desc: "招待した人のみ視聴可能" };
      case "oneOnOne":
        return { title: "ツーショット", desc: "1対1のプライベート配信" };
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[#475569] text-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#475569] border-b border-slate-600 px-4 py-4 z-10 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">ライブ配信を開始</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              配信設定を選択してください
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-600 rounded-full transition-colors text-slate-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-6">
          {/* Visibility Selection */}
          <div className="mb-6">
            <h3 className="font-bold text-sm mb-3">公開範囲</h3>
            <div className="space-y-2">
              <button
                onClick={() => setVisibility("public")}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                  visibility === "public"
                    ? "border-[#0891B2] bg-[#334155]"
                    : "border-slate-500 hover:border-slate-400"
                }`}
              >
                <div className={`p-2 rounded-lg ${visibility === "public" ? "bg-[#0891B2]/20 text-[#0891B2]" : "bg-slate-700"}`}>
                  <Globe size={24} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold">一般公開</p>
                  <p className="text-xs text-slate-300">誰でも視聴可能</p>
                </div>
              </button>

              <button
                onClick={() => setVisibility("invite")}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                  visibility === "invite"
                    ? "border-[#0891B2] bg-[#334155]"
                    : "border-slate-500 hover:border-slate-400"
                }`}
              >
                <div className={`p-2 rounded-lg ${visibility === "invite" ? "bg-[#0891B2]/20 text-[#0891B2]" : "bg-slate-700"}`}>
                  <Lock size={24} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold">招待者限定</p>
                  <p className="text-xs text-slate-300">招待した人のみ視聴可能</p>
                </div>
              </button>

              <button
                onClick={() => setVisibility("oneOnOne")}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                  visibility === "oneOnOne"
                    ? "border-[#0891B2] bg-[#334155]"
                    : "border-slate-500 hover:border-slate-400"
                }`}
              >
                <div className={`p-2 rounded-lg ${visibility === "oneOnOne" ? "bg-[#0891B2]/20 text-[#0891B2]" : "bg-slate-700"}`}>
                  <UserCheck size={24} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold">ツーショット</p>
                  <p className="text-xs text-slate-300">1対1のプライベート配信</p>
                </div>
              </button>
            </div>
          </div>

          {/* Paid/Free Toggle */}
          <div className="mb-6">
            <h3 className="font-bold text-sm mb-3">配信料金</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPaid(false)}
                className={`flex-1 py-3 rounded-lg border-2 transition-all font-bold ${
                  !isPaid
                    ? "border-[#0891B2] bg-[#334155]"
                    : "border-slate-500 hover:border-slate-400"
                }`}
              >
                無料
              </button>
              <button
                onClick={() => setIsPaid(true)}
                className={`flex-1 py-3 rounded-lg border-2 transition-all font-bold ${
                  isPaid
                    ? "border-[#0891B2] bg-[#334155]"
                    : "border-slate-500 hover:border-slate-400"
                }`}
              >
                有料
              </button>
            </div>
          </div>

          {/* Price Input */}
          {isPaid && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <h3 className="font-bold text-sm mb-3">視聴料金</h3>
              
              <div className="grid grid-cols-4 gap-2 mb-3">
                {pricePresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setPriceInput(preset.toString())}
                    className={`py-2 rounded-md text-xs font-bold transition-all ${
                      currentPrice === preset
                        ? "bg-[#0891B2] text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    ¥{preset.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400 group-focus-within:text-[#0891B2]">
                  ¥
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceInput}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder="価格を入力"
                  className="w-full pl-10 pr-4 py-4 bg-slate-800 border-2 border-slate-700 rounded-xl focus:outline-none focus:border-[#0891B2] text-2xl font-bold transition-all"
                />
              </div>
              
              <div className="flex justify-between items-center mt-3 px-1">
                <p className="text-xs text-slate-400">
                  あなたの取り分 (80%)
                </p>
                <p className="text-sm font-bold text-[#0891B2]">
                  ¥{Math.floor(currentPrice * 0.8).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-[#0891B2]/10 border border-[#0891B2]/30 rounded-full p-8 relative">
                <Video size={48} className="text-[#0891B2]" />
                <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-[#475569] animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-2">
                <Users size={18} className="text-slate-400 mb-1" />
                <p className="text-[10px] text-slate-400 uppercase tracking-tighter">推定視聴者</p>
                <p className="text-sm font-bold">
                  {visibility === "oneOnOne" ? "1人" : "500-800人"}
                </p>
              </div>
              <div className="flex flex-col items-center p-2">
                <Clock size={18} className="text-slate-400 mb-1" />
                <p className="text-[10px] text-slate-400 uppercase tracking-tighter">配信時間</p>
                <p className="text-sm font-bold">無制限</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleStart}
              className="w-full bg-[#0891B2] text-white py-4 rounded-xl font-bold hover:bg-[#0891B2]/90 transition-all shadow-lg shadow-[#0891B2]/20 flex items-center justify-center gap-3 active:scale-95"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
              ライブ配信を開始
            </button>
            <button
              onClick={onClose}
              className="w-full bg-slate-700 text-slate-300 py-3 rounded-xl text-sm font-bold hover:bg-slate-600 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}