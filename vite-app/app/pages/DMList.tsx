import { useNavigate } from "react-router";
import { MessageCircle, Search } from "lucide-react";
import { conversations } from "../data/mockData";

export default function DMList() {
  const navigate = useNavigate();
  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  return (
    <div className="min-h-screen bg-[#334155] pb-20 text-white">
      {/* Header */}
      <div className="sticky top-0 bg-[#475569] border-b border-[#0891B2] px-4 py-4 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-bold text-xl">メッセージ</h1>
          {totalUnread > 0 && (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
              {totalUnread}件の未読
            </div>
          )}
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="メッセージを検索"
            className="w-full pl-10 pr-4 py-2 border border-[#E5E4E2] rounded-lg focus:outline-none focus:border-black"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="divide-y divide-[#E5E4E2]">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => navigate(`/dm/${conversation.id}`)}
            className="w-full p-4 hover:bg-[var(--pearl-light)] transition-colors flex items-center gap-3"
          >
            {/* Avatar with online status */}
            <div className="relative flex-shrink-0">
              <img
                src={conversation.userAvatar}
                alt={conversation.userName}
                className="w-14 h-14 rounded-full"
              />
              {conversation.isOnline && (
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
              )}
              {conversation.unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {conversation.unreadCount}
                </div>
              )}
            </div>

            {/* Message Info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-sm">{conversation.userName}</h3>
                <span className="text-xs text-gray-500">{conversation.lastMessageTime}</span>
              </div>
              <p
                className={`text-sm truncate ${
                  conversation.unreadCount > 0 ? "font-bold text-black" : "text-gray-600"
                }`}
              >
                {conversation.lastMessage}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Empty State */}
      {conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <MessageCircle size={64} className="text-gray-300 mb-4" />
          <h2 className="font-bold text-lg mb-2">メッセージはありません</h2>
          <p className="text-sm text-gray-600 text-center">
            クリエイターやファンとメッセージを交換しましょう
          </p>
        </div>
      )}
    </div>
  );
}