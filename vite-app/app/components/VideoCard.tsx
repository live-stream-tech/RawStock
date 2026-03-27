import { Eye, Clock } from "lucide-react";
import { VideoContent } from "../data/mockData";

interface VideoCardProps {
  video: VideoContent;
  showRank?: number;
}

export default function VideoCard({ video, showRank }: VideoCardProps) {
  return (
    <div className="flex-shrink-0 w-64 cursor-pointer">
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        
        {/* Rank Badge */}
        {showRank && (
          <div className="absolute top-2 right-2 bg-black/80 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-yellow-400">
            {showRank}
          </div>
        )}
        
        {/* Duration */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs">
          {video.duration}
        </div>
      </div>
      
      <div className="mt-2">
        <div className="flex items-center gap-2 mb-1">
          <img
            src={video.creatorAvatar}
            alt={video.creatorName}
            className="w-6 h-6 rounded-full"
          />
          <span className="text-xs text-white opacity-70">{video.communityName}</span>
        </div>
        <h3 className="font-bold text-sm line-clamp-2 mb-1">{video.title}</h3>
        <div className="flex items-center justify-between text-xs text-white opacity-70">
          <div className="flex items-center gap-1">
            <Eye size={12} />
            {video.views.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            {video.uploadedAt}
          </div>
        </div>
        {video.price === 0 ? (
          <div className="mt-1 inline-block bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
            無料
          </div>
        ) : (
          <p className="text-sm font-bold mt-1">¥{video.price}</p>
        )}
      </div>
    </div>
  );
}