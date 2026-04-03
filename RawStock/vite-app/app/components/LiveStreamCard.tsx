import { Eye } from "lucide-react";
import { useNavigate } from "react-router";
import { LiveStream } from "../data/mockData";

interface LiveStreamCardProps {
  stream: LiveStream;
  showRank?: number;
}

export default function LiveStreamCard({ stream, showRank }: LiveStreamCardProps) {
  const navigate = useNavigate();

  return (
    <div 
      className="flex-shrink-0 w-64 cursor-pointer"
      onClick={() => navigate(`/live/${stream.id}`)}
    >
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
        <img
          src={stream.thumbnail}
          alt={stream.title}
          className="w-full h-full object-cover"
        />
        
        {/* Live Badge */}
        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
        
        {/* Rank Badge */}
        {showRank && (
          <div className="absolute top-2 right-2 bg-black/80 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
            {showRank}
          </div>
        )}
        
        {/* Viewer Count */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
          <Eye size={12} />
          {stream.currentViewers.toLocaleString()}
        </div>
      </div>
      
      <div className="mt-2">
        <div className="flex items-center gap-2 mb-1">
          <img
            src={stream.creatorAvatar}
            alt={stream.creatorName}
            className="w-6 h-6 rounded-full"
          />
          <div className="flex-1">
            <span className="text-xs font-bold">{stream.creatorName}</span>
            <span className="text-xs text-white opacity-70"> · </span>
            <span className="text-xs text-white opacity-70">{stream.communityName}</span>
          </div>
        </div>
        <h3 className="font-bold text-sm line-clamp-2">{stream.title}</h3>
        <p className="text-xs text-white opacity-70 mt-1">{stream.startedAt}から配信中</p>
      </div>
    </div>
  );
}