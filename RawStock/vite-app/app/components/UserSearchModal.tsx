import { X, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { User } from "../data/mockData";

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
}

export default function UserSearchModal({ isOpen, onClose, users }: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFollow = (userId: string) => {
    alert(`${users.find(u => u.id === userId)?.name}をフォローしました！`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#475569] rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-[#0891B2] px-4 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-lg text-white">ユーザー検索</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--pearl-light)] rounded-full transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Search Box */}
        <div className="p-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ユーザー名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[#0891B2] rounded-lg focus:outline-none focus:border-[#0ea5e9] bg-[#334155] text-white"
              autoFocus
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-white opacity-70">
              <Search size={48} className="mx-auto mb-3 opacity-50" />
              <p>ユーザーが見つかりませんでした</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[#0891B2] hover:bg-[#334155] transition-colors"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{user.name}</p>
                    <div className="flex gap-3 text-xs text-white opacity-70">
                      <span>{user.followers.toLocaleString()} フォロワー</span>
                      {user.isSupporter && (
                        <span className="text-yellow-400">✓ 公認サポーター</span>
                      )}
                    </div>
                    {user.bio && (
                      <p className="text-xs text-white opacity-70 line-clamp-1 mt-1">{user.bio}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleFollow(user.id)}
                    className="px-4 py-2 bg-[#0891B2] text-white rounded-lg font-bold hover:bg-[#0ea5e9] transition-colors flex items-center gap-1 flex-shrink-0"
                  >
                    <UserPlus size={16} />
                    <span className="text-sm">フォロー</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
