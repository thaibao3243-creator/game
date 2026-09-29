import React, { useState } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { PetSpecies, PetAccessory } from '../../types/game';
import { 
  Sparkles, 
  Crown, 
  Eye, 
  EyeOff, 
  Palette, 
  X, 
  Smile, 
  Heart 
} from 'lucide-react';

export const PetMascot: React.FC = () => {
  const { petConfig, updatePetConfig } = useGameStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isBubbleOpen, setIsBubbleOpen] = useState(true);

  if (petConfig.isHidden) {
    return (
      <button
        onClick={() => updatePetConfig({ isHidden: false })}
        className="fixed bottom-20 right-3 md:bottom-6 md:right-6 z-40 p-2.5 bg-white/90 border border-rose-200 text-rose-500 rounded-full shadow-md backdrop-blur hover:scale-105 transition"
        title="Hiện bé cưng"
      >
        <Eye className="w-4 h-4" />
      </button>
    );
  }

  // Icon / Emoji đại diện theo giống loài
  const PET_EMOJIS: Record<PetSpecies, string> = {
    cat: '🐱',
    dog: '🐶',
    rabbit: '🐰',
    bear: '🐻',
  };

  // Phụ kiện
  const ACCESSORY_BADGES: Record<PetAccessory, { label: string; icon: string }> = {
    none: { label: 'Không', icon: '' },
    chef_hat: { label: 'Nón Bếp', icon: '👨‍🍳' },
    ribbon: { label: 'Nơ Đỏ', icon: '🎀' },
    crown: { label: 'Vương Miện', icon: '👑' },
    glasses: { label: 'Kính Tròn', icon: '👓' },
  };

  return (
    <>
      {/* KHUNG PET GÓC MÀN HÌNH */}
      <div className="fixed bottom-20 right-3 md:bottom-6 md:right-6 z-40 flex flex-col items-end select-none animate-fade-in">
        
        {/* Bong bóng thoại vui vẻ */}
        {isBubbleOpen && (
          <div className="relative mb-2 mr-1 max-w-[170px] bg-white border border-rose-200/80 rounded-2xl p-2.5 shadow-md shadow-rose-100 text-[11px] text-stone-700 leading-tight">
            <button
              onClick={() => setIsBubbleOpen(false)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-stone-200 text-stone-600 rounded-full flex items-center justify-center hover:bg-stone-300 text-[9px]"
            >
              ×
            </button>
            <p>{petConfig.moodText}</p>
          </div>
        )}

        {/* Khối Thú Cưng + Thanh nút nhỏ */}
        <div className="relative flex items-center gap-1.5">
          {/* Cụm nút công cụ nhỏ */}
          <div className="flex flex-col gap-1 opacity-0 hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsConfigOpen(true)}
              className="p-1.5 bg-white border border-rose-200 text-rose-500 rounded-full shadow-sm hover:bg-rose-50"
              title="Đổi thú cưng"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updatePetConfig({ isHidden: true })}
              className="p-1.5 bg-white border border-rose-200 text-stone-400 rounded-full shadow-sm hover:bg-rose-50"
              title="Ẩn thú cưng"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Nhân vật Pet */}
          <div 
            onClick={() => setIsBubbleOpen(!isBubbleOpen)}
            className="relative cursor-pointer w-13 h-13 rounded-3xl bg-gradient-to-b from-rose-100 to-amber-50 border-2 border-rose-200 flex items-center justify-center shadow-lg shadow-rose-200/50 hover:scale-105 active:scale-95 transition-transform animate-pulse"
          >
            {/* Phụ kiện trên đầu */}
            {petConfig.accessory !== 'none' && (
              <span className="absolute -top-2 -right-1 text-sm">
                {ACCESSORY_BADGES[petConfig.accessory].icon}
              </span>
            )}
            {/* Mặt pet */}
            <span className="text-2xl drop-shadow-sm">{PET_EMOJIS[petConfig.species]}</span>
          </div>
        </div>
      </div>

      {/* MODAL TÙY BIẾN THÚ CƯNG */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/25 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xs bg-white border border-rose-100 rounded-3xl shadow-xl shadow-rose-200/50 p-5 space-y-4">
            <button
              onClick={() => setIsConfigOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-600 rounded-full hover:bg-rose-50 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-0.5">
              <h3 className="text-sm font-bold text-stone-800">Bé Cưng Của Tiệm</h3>
              <p className="text-[11px] text-stone-400">Chọn người bạn đồng hành dễ thương</p>
            </div>

            {/* Chọn giống loài */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-600">Chọn Thú Cưng</label>
              <div className="grid grid-cols-4 gap-2">
                {(['cat', 'dog', 'rabbit', 'bear'] as PetSpecies[]).map((species) => (
                  <button
                    key={species}
                    onClick={() => updatePetConfig({ species })}
                    className={`py-2 rounded-2xl border text-xl flex items-center justify-center transition ${
                      petConfig.species === species
                        ? 'border-rose-400 bg-rose-50 shadow-sm'
                        : 'border-stone-200 hover:border-rose-200'
                    }`}
                  >
                    {PET_EMOJIS[species]}
                  </button>
                ))}
              </div>
            </div>

            {/* Chọn phụ kiện */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-600">Chọn Phụ Kiện</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['none', 'chef_hat', 'ribbon', 'crown', 'glasses'] as PetAccessory[]).map((acc) => (
                  <button
                    key={acc}
                    onClick={() => updatePetConfig({ accessory: acc })}
                    className={`py-1.5 px-2 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1 transition ${
                      petConfig.accessory === acc
                        ? 'border-rose-400 bg-rose-50 text-rose-600 font-bold'
                        : 'border-stone-200 text-stone-600 hover:border-rose-200'
                    }`}
                  >
                    <span>{ACCESSORY_BADGES[acc].icon}</span>
                    <span>{ACCESSORY_BADGES[acc].label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsConfigOpen(false)}
              className="w-full py-2.5 bg-rose-400 hover:bg-rose-500 text-white text-xs font-bold rounded-2xl shadow-sm transition"
            >
              Lưu Bạn Đồng Hành
            </button>
          </div>
        </div>
      )}
    </>
  );
};