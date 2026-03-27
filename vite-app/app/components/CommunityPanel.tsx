import { Link } from "react-router";
import { Community } from "../data/mockData";

interface CommunityPanelProps {
  community: Community;
}

export default function CommunityPanel({ community }: CommunityPanelProps) {
  return (
    <Link to={`/community/${community.id}`} className="block">
      <div className="aspect-square border border-[#CBD5E1] rounded-lg overflow-hidden hover:border-black transition-colors">
        <div className="relative w-full h-full">
          <img
            src={community.avatar}
            alt={community.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-3">
            <h3 className="text-white font-bold text-sm line-clamp-1">{community.name}</h3>
            <p className="text-white/80 text-xs">{community.followers.toLocaleString()}人</p>
          </div>
        </div>
      </div>
    </Link>
  );
}