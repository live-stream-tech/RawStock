import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send, MoreVertical, Image, Smile } from "lucide-react";
import { conversations, messages, currentUser } from "../data/mockData";

export default function DMDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messageText, setMessageText] = useState("");

  const conversation = conversations.find((c) => c.id === id);
  const conversationMessages = messages[id || ""] || [];

  if (!conversation) {
    return (
      <div className="min-h-screen bg-[#334155] flex items-center justify-center text-white">
        <p className="text-gray-300">会話が見つかりません</p>
      </div>
    );
  }

  const handleSend = () => {
    if (messageText.trim()) {
      // ここでメッセージ送信処理を実装
      console.log("Sending message:", messageText);
      setMessageText("");
    }
  };

  return (
    <div className="min-h-screen bg-[#334155] flex flex-col text-white">
      {/* Header */}
      <div className="sticky top-0 bg-[#475569] border-b border-[#0891B2] px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dm")}
              className="p-2 hover:bg-[var(--pearl-light)] rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="relative">
                <img
                  src={conversation.userAvatar}
                  alt={conversation.userName}
                  className="w-10 h-10 rounded-full"
                />
                {conversation.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>
              <div>
                <h1 className="font-bold text-sm">{conversation.userName}</h1>
                {conversation.isOnline && (
                  <p className="text-xs text-green-600">オンライン</p>
                )}
              </div>
            </div>
          </div>
          <button className="p-2 hover:bg-[var(--pearl-light)] rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {conversationMessages.map((message, index) => {
          const isOwn = message.senderId === currentUser.id;
          const showAvatar =
            index === 0 ||
            conversationMessages[index - 1].senderId !== message.senderId;

          return (
            <div
              key={message.id}
              className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              {showAvatar && !isOwn ? (
                <img
                  src={message.senderAvatar}
                  alt={message.senderName}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-8 flex-shrink-0" />
              )}

              {/* Message Bubble */}
              <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                {showAvatar && !isOwn && (
                  <p className="text-xs text-gray-600 mb-1">{message.senderName}</p>
                )}
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                    isOwn
                      ? "bg-black text-white rounded-tr-sm"
                      : "bg-[var(--pearl-light)] text-black rounded-tl-sm"
                  }`}
                >
                  <p className="text-sm break-words">{message.text}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">{message.timestamp}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-[#475569] border-t border-[#0891B2] px-4 py-3 pb-safe">
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-[var(--pearl-light)] rounded-full transition-colors">
            <Image size={20} className="text-gray-600" />
          </button>
          <button className="p-2 hover:bg-[var(--pearl-light)] rounded-full transition-colors">
            <Smile size={20} className="text-gray-600" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="メッセージを入力..."
              className="w-full px-4 py-2 border border-[#E5E4E2] rounded-full focus:outline-none focus:border-black"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!messageText.trim()}
            className={`p-3 rounded-full transition-colors ${
              messageText.trim()
                ? "bg-black text-white hover:bg-gray-800"
                : "bg-[var(--pearl-light)] text-gray-400"
            }`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}