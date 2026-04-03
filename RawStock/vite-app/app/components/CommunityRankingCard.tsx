import { TrendingUp, Users, Eye } from "lucide-react";
import { Link } from "react-router";

interface CommunityRankingCardProps {
  community: {
    id: string;
    name: string;
    avatar: string;
    followers: number;
    totalViews: number;
    totalRevenue: number;
    rank: number;
  };
}

export default function CommunityRankingCard({ community }: CommunityRankingCardProps) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white";
    if (rank === 2) return "bg-gradient-to-br from-gray-300 to-gray-500 text-white";
    if (rank === 3) return "bg-gradient-to-br from-orange-400 to-orange-600 text-white";
    return "bg-[var(--pearl-light)] text-white";
  };

  return (
    <Link
      to={`/community/${community.id}`}
      className="flex-shrink-0 w-72 bg-[#1F2937] rounded-lg border border-[#E5E4E2] overflow-hidden hover:border-black transition-all hover:shadow-lg"
    >
      <div className="relative">
        <img
          src={community.avatar}
          alt={community.name}
          className="w-full h-40 object-cover"
        />
        {/* Rank Badge */}
        <div className={`absolute top-3 left-3 w-12 h-12 rounded-full ${getRankColor(community.rank)} flex items-center justify-center font-bold text-xl shadow-lg`}>
          {community.rank}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg mb-3 line-clamp-1">{community.name}</h3>
        
        <div className="space-y-2 text-sm">
          {/* Followers */}
          <div className="flex items-center gap-2 text-white">
            <Users size={16} />
            <span className="text-sm">{community.followers.toLocaleString()}人</span>
          </div>

          {/* Total Views */}
          <div className="flex items-center gap-2 text-white">
            <Eye size={16} />
            <span className="text-sm">{community.totalViews.toLocaleString()}回</span>
          </div>

          {/* Total Revenue */}
          <div className="flex items-center gap-2 text-white">
            <TrendingUp size={16} />
            <span className="font-medium">¥{(community.totalRevenue / 10000).toFixed(0)}万</span>
          </div>
        </div>
      </div>
    </Link>
  );
}