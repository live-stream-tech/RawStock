import { X, Upload } from "lucide-react";
import { useState } from "react";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: {
    name: string;
    avatar: string;
    bio?: string;
    gender?: string;
    age?: number;
  };
  onSave: (profile: {
    name: string;
    avatar: string;
    bio?: string;
    gender?: string;
    age?: number;
  }) => void;
}

export default function ProfileEditModal({ isOpen, onClose, currentProfile, onSave }: ProfileEditModalProps) {
  const [name, setName] = useState(currentProfile.name);
  const [bio, setBio] = useState(currentProfile.bio || "");
  const [gender, setGender] = useState(currentProfile.gender || "");
  const [age, setAge] = useState(currentProfile.age?.toString() || "");
  const [avatarPreview, setAvatarPreview] = useState(currentProfile.avatar);

  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave({
      name,
      avatar: avatarPreview,
      bio,
      gender,
      age: age ? parseInt(age) : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#475569] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#475569] border-b border-[#0891B2] px-4 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg text-white">プロフィール編集</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--pearl-light)] rounded-full transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3">
            <img
              src={avatarPreview}
              alt="Avatar preview"
              className="w-24 h-24 rounded-full object-cover border-2 border-[#0891B2]"
            />
            <label className="cursor-pointer bg-[#334155] text-white px-4 py-2 rounded-lg hover:bg-[#475569] transition-colors flex items-center gap-2">
              <Upload size={16} />
              <span className="text-sm font-medium">画像を変更</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-[#0891B2] rounded-lg focus:outline-none focus:border-[#0ea5e9] bg-[#334155] text-white"
              placeholder="名前を入力"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">自己紹介</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-[#0891B2] rounded-lg focus:outline-none focus:border-[#0ea5e9] resize-none bg-[#334155] text-white"
              placeholder="自己紹介を入力"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">性別</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-3 border border-[#0891B2] rounded-lg focus:outline-none focus:border-[#0ea5e9] bg-[#334155] text-white"
            >
              <option value="">選択してください</option>
              <option value="男性">男性</option>
              <option value="女性">女性</option>
              <option value="その他">その他</option>
              <option value="未回答">未回答</option>
            </select>
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">年齢</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-4 py-3 border border-[#0891B2] rounded-lg focus:outline-none focus:border-[#0ea5e9] bg-[#334155] text-white"
              placeholder="年齢を入力"
              min="1"
              max="120"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#475569] border-t border-[#0891B2] px-4 py-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-white text-white rounded-lg font-bold hover:bg-white/10 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-[#0891B2] text-white rounded-lg font-bold hover:bg-[#0ea5e9] transition-colors"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}
