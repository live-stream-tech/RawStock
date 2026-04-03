import { Award, Calendar, Video, ChevronDown, ChevronUp, ImageIcon, Wallet, Edit, Search, Bell, ShieldCheck, UserPlus, LogIn, ShieldAlert, TrendingUp, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import EnneagramGraph from "../components/EnneagramGraph";
import CommunityPanel from "../components/CommunityPanel";
import ProfileEditModal from "../components/ProfileEditModal";
import UserSearchModal from "../components/UserSearchModal";
import NotificationModal from "../components/NotificationModal";
import KycVerificationModal from "../components/KycVerificationModal";
import Logo from "../rawstock-lp/Logo";
import { currentUser as initialUser, communities, activityCards, allUsers, followingPosts, notifications } from "../data/mockData";
import { AppButton } from "../components/ui/AppButton";

import { BroadcastFab } from "../components/BroadcastFab";

export default function MyPage() {
  const navigate = useNavigate();
  const [showAllCommunities, setShowAllCommunities] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(initialUser);
  const myCommunities = communities.slice(0, 9); // ユーザーが参加している全コミュニティ
  const displayedCommunities = showAllCommunities ? myCommunities : myCommunities.slice(0, 6);
  const myPosts = activityCards.slice(0, 3); // ユーザーの投稿（モック）

  const handleSaveProfile = (profile: any) => {
    setCurrentUser({ ...currentUser, ...profile });
  };

  const handleKycVerified = () => {
    setCurrentUser({ ...currentUser, isKycVerified: true });
  };

  if (!currentUser.isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#334155] p-6 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 border border-slate-700">
          <LogIn size={40} className="text-slate-500" />
        </div>
        <h1 className="text-2xl font-black italic tracking-tighter mb-4 uppercase">MEMBER ONLY</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          マイページを利用するにはログインが必要です。<br />
          アカウントを作成して、LiveStockを楽しもう。
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <AppButton fullWidth size="xl" onClick={() => navigate("/auth")}>Sign Up</AppButton>
          <AppButton fullWidth size="xl" variant="secondary" onClick={() => navigate("/auth")}>Login</AppButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#334155] pb-20 text-white">
      {/* Header */}
      <div className="sticky top-0 bg-[#475569]/90 backdrop-blur-xl border-b border-slate-700 px-4 py-4 z-30 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-3">
          {currentUser.isKycVerified ? (
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full text-green-500">
              <ShieldCheck size={14} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Verified</span>
            </div>
          ) : (
            <button
              onClick={() => setShowKycModal(true)}
              className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full text-amber-500 hover:bg-amber-500/20 transition-all"
            >
              <ShieldAlert size={14} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Identity Check</span>
            </button>
          )}
          <button
            onClick={() => setShowNotifications(true)}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors relative"
          >
            <Bell size={24} className="text-white" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#0891B2] rounded-full border-2 border-[#475569]" />
          </button>
        </div>
      </div>

      {/* Internal Search Bar */}
      <div className="px-4 pt-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#0891B2]" size={18} />
          <input
            type="text"
            placeholder="ユーザーを検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowUserSearch(true)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:border-[#0891B2] transition-all text-sm font-bold placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Profile Section */}
      <div className="border-b border-slate-700 pb-6 pt-4 px-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-20 h-20 rounded-2xl border border-slate-700 object-cover shadow-xl"
            />
            {currentUser.isKycVerified && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full border-4 border-[#334155] p-0.5">
                <ShieldCheck size={12} className="text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-black text-xl mb-2 tracking-tighter italic uppercase">{currentUser.name}</h1>
            <div className="flex gap-4 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Following</span>
                <span className="font-black">{currentUser.following.toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Followers</span>
                <span className="font-black">{currentUser.followers.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowProfileEdit(true)}
            className="p-3 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors"
          >
            <Edit size={20} className="text-white" />
          </button>
        </div>

        {/* Bio */}
        {currentUser.bio && (
          <p className="text-xs text-slate-400 mb-4 leading-relaxed font-bold">{currentUser.bio}</p>
        )}

        {/* Gender & Age */}
        {(currentUser.gender || currentUser.age) && (
          <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest mb-4">
            {currentUser.gender && (
              <span className="bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 text-slate-400">{currentUser.gender}</span>
            )}
            {currentUser.age && (
              <span className="bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 text-slate-400">{currentUser.age} YEARS OLD</span>
            )}
          </div>
        )}

        {/* Supporter Badge & Revenue Visual */}
        {currentUser.isSupporter && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-[#0891B2]/30 rounded-2xl p-4 flex items-center gap-4 mb-4 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <Award size={48} />
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#0891B2]/10 flex items-center justify-center text-[#0891B2] border border-[#0891B2]/20">
              <TrendingUp size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-black text-white italic tracking-tighter uppercase">Authorized Supporter Lv.{currentUser.supporterLevel}</p>
                <span className="text-[8px] bg-[#0891B2] text-white px-1.5 py-0.5 rounded font-black italic">ACTIVE</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mb-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "65%" }}
                  className="bg-[#0891B2] h-full"
                />
              </div>
              <p className="text-[9px] text-[#0891B2] font-black uppercase tracking-[0.2em]">Revenue Share: 50% + {currentUser.supporterLevel * 5}% Bonus</p>
            </div>
          </div>
        )}

        {/* Revenue Button */}
        <AppButton 
          fullWidth 
          variant="success" 
          size="lg" 
          onClick={() => navigate("/revenue")}
          icon={<Wallet size={18} />}
        >
          Revenue Management
        </AppButton>

        {/* DM Button */}
        <AppButton
          fullWidth
          variant="secondary"
          size="lg"
          onClick={() => navigate("/dm")}
          icon={<MessageCircle size={18} />}
        >
          DM
        </AppButton>
      </div>

      {/* My Posts */}
      <div className="border-b border-slate-700 pb-6">
        <div className="flex items-center justify-between px-4 pt-6 pb-3">
          <h2 className="font-black text-sm uppercase tracking-[0.2em] text-slate-400">Posts</h2>
          <span className="text-[10px] font-black bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">{currentUser.totalPosts || 0} TOTAL</span>
        </div>
        <div className="px-4 grid grid-cols-3 gap-2">
          {myPosts.map((post) => (
            <motion.div 
              key={post.id} 
              whileHover={{ scale: 0.98 }}
              className="aspect-square rounded-xl overflow-hidden bg-slate-800 border border-slate-700 relative group cursor-pointer"
            >
              <img 
                src={post.photos[0]} 
                alt={post.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <p className="text-[8px] font-black text-white truncate">{post.title}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Following Feed */}
      <div className="border-b border-slate-700 pb-6">
        <h2 className="font-black text-sm px-4 pt-6 pb-3 flex items-center gap-2 uppercase tracking-[0.2em] text-slate-400">
          Following Feed
          <span className="text-[8px] bg-[#0891B2] text-white px-2 py-0.5 rounded-full font-black italic tracking-widest">HOT</span>
        </h2>
        <div className="px-4 space-y-3">
          {followingPosts.map((post) => (
            <div
              key={post.id}
              className="bg-slate-800/30 border border-slate-700/50 rounded-2xl hover:border-[#0891B2]/30 transition-all cursor-pointer p-4 group"
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <img
                    src={post.image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80"}
                    alt={post.creatorName}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-black text-xs text-white truncate italic tracking-tighter uppercase">{post.creatorName}</p>
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{post.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-bold">{post.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* My Communities */}
      <div className="border-b border-slate-700 pb-6">
        <h2 className="font-black text-sm px-4 pt-6 pb-3 uppercase tracking-[0.2em] text-slate-400">Joined Communities</h2>
        <div className="px-4">
          <div className="grid grid-cols-3 gap-3">
            {displayedCommunities.map((community) => (
              <CommunityPanel key={community.id} community={community} />
            ))}
          </div>
          
          {myCommunities.length > 6 && (
            <button
              onClick={() => setShowAllCommunities(!showAllCommunities)}
              className="w-full mt-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-[#0891B2] transition-colors flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"
            >
              {showAllCommunities ? (
                <>
                  <span>Collapse</span>
                  <ChevronUp size={14} />
                </>
              ) : (
                <>
                  <span>Show All ({myCommunities.length})</span>
                  <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Enneagram Graph */}
      <div className="pb-6">
        <div className="px-4 pt-6 pb-2 flex items-center justify-between">
          <h2 className="font-black text-sm uppercase tracking-[0.2em] text-slate-400">Enneagram Analysis</h2>
          <span className="text-[10px] font-black text-[#0891B2] italic underline cursor-pointer">Retake Test</span>
        </div>
        <div className="bg-slate-800/30 border-y border-slate-700">
          <EnneagramGraph scores={currentUser.enneagramScores} />
        </div>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        onSave={handleSaveProfile}
        currentProfile={{
          name: currentUser.name,
          avatar: currentUser.avatar,
          bio: currentUser.bio,
          gender: currentUser.gender,
          age: currentUser.age,
        }}
      />

      {/* User Search Modal */}
      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        users={allUsers}
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
      />

      {/* KYC Modal */}
      <KycVerificationModal 
        isOpen={showKycModal}
        onClose={() => setShowKycModal(false)}
        onVerified={handleKycVerified}
      />

      {/* Floating Action Button for Go Live */}
      <BroadcastFab />
    </div>
  );
}
