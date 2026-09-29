import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { PRESET_AVATARS, PresetAvatar } from '../../types/game';
import * as Icons from 'lucide-react';
import { X, Check, Store, User, Sparkles } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { playerName, bakeryName, avatarId, updateProfile, currentUser } = useGameStore();

  const [formPlayerName, setFormPlayerName] = useState(playerName);
  const [formBakeryName, setFormBakeryName] = useState(bakeryName);
  const [selectedAvatarId, setSelectedAvatarId] = useState(avatarId);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormPlayerName(playerName);
      setFormBakeryName(bakeryName);
      setSelectedAvatarId(avatarId);
      setSavedSuccess(false);
    }
  }, [isOpen, playerName, bakeryName, avatarId]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPlayerName.trim() || !formBakeryName.trim()) return;

    updateProfile({
      playerName: formPlayerName,
      bakeryName: formBakeryName,
      avatarId: selectedAvatarId,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/25 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white border border-rose-100 rounded-3xl shadow-xl shadow-rose-200/50 p-6 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-rose-50 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-stone-800">Thông Tin Tiệm Bánh</h3>
          <p className="text-xs text-stone-400">Tùy biến thương hiệu ngọt ngào của riêng bạn</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-600 ml-1">Chọn Ảnh Đại Diện</label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_AVATARS.map((avt: PresetAvatar) => {
                const IconComponent = (Icons as Record<string, any>)[avt.iconName] || Icons.Smile;
                const isSelected = selectedAvatarId === avt.id;

                return (
                  <button
                    key={avt.id}
                    type="button"
                    onClick={() => setSelectedAvatarId(avt.id)}
                    className={`relative p-2 rounded-2xl flex items-center justify-center transition-all ${
                      avt.bgColor
                    } ${
                      isSelected
                        ? 'ring-2 ring-rose-400 ring-offset-2 scale-105 shadow-sm'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 ${avt.textColor}`} />
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 shadow">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-600 ml-1">Tên Tiệm Bánh</label>
            <div className="relative flex items-center">
              <Store className="absolute left-3.5 w-4 h-4 text-stone-400" />
              <input
                type="text"
                required
                maxLength={24}
                value={formBakeryName}
                onChange={(e) => setFormBakeryName(e.target.value)}
                placeholder="VD: Tiệm Bánh Mơ Màng"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-800 focus:outline-none focus:border-rose-400 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-600 ml-1">Tên Chủ Tiệm</label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-4 h-4 text-stone-400" />
              <input
                type="text"
                required
                maxLength={20}
                value={formPlayerName}
                onChange={(e) => setFormPlayerName(e.target.value)}
                placeholder="VD: Bé Mây"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-800 focus:outline-none focus:border-rose-400 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200/70 rounded-2xl p-2.5 flex items-center justify-between text-[11px] text-stone-500">
            <span>Tài khoản đám mây:</span>
            <span className="font-medium text-stone-700">
              {currentUser?.email ? currentUser.email : 'Chưa đăng nhập (Lưu tạm)'}
            </span>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-rose-400 hover:bg-rose-500 active:scale-95 text-white font-medium text-xs rounded-2xl shadow-md shadow-rose-200 transition flex items-center justify-center gap-2"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Đã Cập Nhật!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Lưu Thay Đổi</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};