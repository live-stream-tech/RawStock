import { Link } from "react-router";
import { Community } from "../data/mockData";

interface RecommendedCardProps {
  community: Community;
}

export default function RecommendedCard({ community }: RecommendedCardProps) {
  return (
    <Link to={`/community/${community.id}`} className="block min-w-[200px]">
      <div className="bg-[#CBD5E1] rounded-lg p-3 hover:bg-[#94A3B8] transition-colors">
        <div className="flex gap-3 items-center">
          <img
            src={community.avatar}
            alt={community.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm line-clamp-1">{community.name}</p>
            <p className="text-xs text-white opacity-70 mt-1">{community.category}</p>
            <p className="text-xs text-white opacity-70">{community.followers.toLocaleString()}人</p>
          </div>
        </div>
      </div>
    </Link>
  );
}