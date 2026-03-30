import { X, DollarSign, Heart, MessageCircle, UserPlus, Info } from "lucide-react";
import { Notification } from "../data/mockData";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
}

export default function NotificationModal({ isOpen, onClose, notifications }: NotificationModalProps) {
  if (!isOpen) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "revenue":
        return <DollarSign size={20} className="text-green-600" />;
      case "like":
        return <Heart size={20} className="text-red-500" />;
      case "comment":
        return <MessageCircle size={20} className="text-blue-500" />;
      case "follow":
        return <UserPlus size={20} className="text-purple-500" />;
      default:
        return <Info size={20} className="text-white" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#1F2937] z-50 shadow-xl overflow-hidden flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#E5E4E2]">
          <div>
            <h2 className="text-lg font-bold">通知</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-white">{unreadCount}件の未読通知</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--pearl-light)] rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white">
              <Info size={48} className="mb-2" />
              <p>通知はありません</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E4E2]">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-[var(--pearl-light)] transition-colors ${
                    !notification.isRead ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Avatar or Icon */}
                    <div className="flex-shrink-0">
                      {notification.avatar ? (
                        <img
                          src={notification.avatar}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[var(--pearl-light)] flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-bold text-sm">{notification.title}</h3>
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 ml-2 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-white break-words">{notification.message}</p>
                      {notification.amount && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-bold">
                          <DollarSign size={14} />
                          ¥{notification.amount.toLocaleString()}
                        </div>
                      )}
                      <p className="text-xs text-white mt-2">{notification.timestamp}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}