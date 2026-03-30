import { X, Star } from "lucide-react";
import { ActivityCard as ActivityCardType } from "../data/mockData";

interface ReviewPreviewModalProps {
  activity: ActivityCardType;
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
}

export default function ReviewPreviewModal({
  activity,
  isOpen,
  onClose,
  onProceed,
}: ReviewPreviewModalProps) {
  if (!isOpen) return null;

  // Calculate average sentiment (mock)
  const averageRating = 4.8;
  const ratingCount = activity.comments.length + Math.floor(Math.random() * 20);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[#475569] text-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-[#0891B2]">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 hover:bg-[var(--pearl-light)] rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="font-bold text-lg pr-8">この動画の評価</h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  fill={i < Math.floor(averageRating) ? "#000" : "none"}
                  stroke="#000"
                />
              ))}
            </div>
            <span className="font-bold">{averageRating}</span>
            <span className="text-sm text-white opacity-70">({ratingCount}件)</span>
          </div>
        </div>

        {/* Reviews */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {activity.comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-[var(--pearl-light)] rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={comment.userAvatar}
                    alt={comment.userName}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold">{comment.userName}</p>
                    <p className="text-xs text-white opacity-70">{comment.timestamp}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        fill={i < 4 + Math.floor(Math.random() * 2) ? "#000" : "none"}
                        stroke="#000"
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-white">{comment.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--pearl-light)] p-4 space-y-2">
          <p className="text-xs text-center text-white mb-2">
            {activity.views.toLocaleString()}人が視聴中
          </p>
          <button
            onClick={onProceed}
            className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors"
          >
            動画を見る！ ¥{activity.price}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-[var(--pearl-light)] text-white py-2 rounded-lg text-sm hover:bg-[var(--pearl-medium)] transition-colors"
          >
            後で見る
          </button>
        </div>
      </div>
    </div>
  );
}