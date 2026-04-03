import { useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { ActivityCard as ActivityCardType } from "../data/mockData";
import ReviewPreviewModal from "./ReviewPreviewModal";

interface ActivityCardProps {
  activity: ActivityCardType;
}

export default function ActivityCard({ activity }: ActivityCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % activity.photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + activity.photos.length) % activity.photos.length);
  };

  const handlePurchaseClick = () => {
    if (!activity.isPurchased) {
      setShowReviewModal(true);
    }
  };

  const handleProceedToPurchase = () => {
    setShowReviewModal(false);
    // Here would be actual purchase logic
    alert(`購入処理を開始します: ${activity.title} - ¥${activity.price}`);
  };

  // Generate random positions for floating comment chips
  const floatingChips = activity.comments.slice(0, 3).map((comment, index) => {
    // Create staggered, overlapping positions
    const positions = [
      { left: '5%', bottom: '10px', rotate: '-3deg' },
      { left: '35%', bottom: '25px', rotate: '2deg' },
      { left: '65%', bottom: '15px', rotate: '-1deg' },
    ];
    return {
      ...comment,
      style: positions[index] || positions[0],
    };
  });

  return (
    <>
      <div className="border border-[#0891B2] rounded-lg overflow-hidden bg-[#475569] mb-4 text-white">
        {/* Creator Info */}
        <div className="flex items-center gap-3 p-3 border-b border-[#CBD5E1]">
          <img
            src={activity.creatorAvatar}
            alt={activity.creatorName}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <h4 className="font-bold text-sm">{activity.creatorName}</h4>
            <p className="text-xs text-white opacity-70">{activity.timestamp}</p>
          </div>
        </div>

        {/* Photo Slider */}
        <div className="relative aspect-[4/3] bg-black">
          <img
            src={activity.photos[currentPhotoIndex]}
            alt={activity.title}
            className="w-full h-full object-cover"
          />
          
          {activity.photos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
              
              {/* Photo indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {activity.photos.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      i === currentPhotoIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Article Content */}
        <div className="p-4">
          <h3 className="font-bold text-lg mb-2">{activity.title}</h3>
          <p className="text-sm text-white line-clamp-3 mb-4">{activity.description}</p>
        </div>

        {/* Comments Section (visible before purchase) */}
        {!activity.isPurchased && (
          <div className="bg-[var(--pearl-light)] px-4 py-3 space-y-3">
            <p className="text-xs font-bold text-white mb-2">購入者の感想</p>
            {activity.comments.slice(0, 2).map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <img
                  src={comment.userAvatar}
                  alt={comment.userName}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold">{comment.userName}</span>
                    <span className="text-xs text-white opacity-70">{comment.timestamp}</span>
                  </div>
                  <p className="text-sm text-white">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Purchase Button with Floating Comment Chips */}
        {!activity.isPurchased && (
          <div className="p-4 relative">
            {/* Floating comment chips - creates buzzing excitement */}
            <div className="absolute left-0 right-0 bottom-full pointer-events-none">
              {floatingChips.map((chip, index) => (
                <div
                  key={chip.id}
                  className="absolute px-3 py-1.5 rounded-full text-xs shadow-md"
                  style={{
                    backgroundColor: 'var(--pearl-medium)',
                    left: chip.style.left,
                    bottom: chip.style.bottom,
                    transform: `rotate(${chip.style.rotate})`,
                    maxWidth: '150px',
                    zIndex: 10 + index,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <img
                      src={chip.userAvatar}
                      alt={chip.userName}
                      className="w-4 h-4 rounded-full"
                    />
                    <span className="truncate text-white font-medium">
                      {chip.text.length > 20 ? chip.text.substring(0, 20) + '...' : chip.text}
                    </span>
                  </div>
                  {/* Speech bubble triangle */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
                    style={{
                      bottom: '-6px',
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: '6px solid var(--pearl-medium)',
                    }}
                  />
                </div>
              ))}
            </div>
            
            <button
              onClick={() => handlePurchase(activity)}
              className="w-full bg-black text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg"
            >
              <Play size={20} fill="white" />
              動画を見る！ ¥{activity.price}
            </button>
            <p className="text-xs text-center text-white mt-2">
              {activity.views.toLocaleString()}人が視聴
            </p>
          </div>
        )}
      </div>

      {/* Review Preview Modal */}
      <ReviewPreviewModal
        activity={activity}
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onProceed={handleProceedToPurchase}
      />
    </>
  );
}