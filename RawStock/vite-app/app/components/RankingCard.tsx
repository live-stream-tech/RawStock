import { Link } from "react-router";
import { Community } from "../data/mockData";

interface RankingCardProps {
  community: Community;
  rank: number;
}

export default function RankingCard({ community, rank }: RankingCardProps) {
  return (
    <Link to={`/community/${community.id}`} className="block min-w-[140px]">
      <div className="relative">
        <div className="aspect-square rounded-lg overflow-hidden border border-[#E5E4E2] hover:border-black transition-colors">
          <img
            src={community.avatar}
            alt={community.name}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Rank Badge */}
        <div className="absolute -top-2 -left-2 bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
          {rank}
        </div>
        
        <div className="mt-2">
          <p className="font-bold text-sm line-clamp-1">{community.name}</p>
          <p className="text-xs text-white opacity-80">{community.followers.toLocaleString()}人</p>
        </div>
      </div>
    </Link>
  );
}