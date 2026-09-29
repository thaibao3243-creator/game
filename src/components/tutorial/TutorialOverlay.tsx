import React from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { Sparkles, ArrowRight } from 'lucide-react';

export const TutorialOverlay: React.FC = () => {
  const { tutorialStep } = useGameStore();

  if (tutorialStep >= 99) return null; // Đã xong tân thủ

  const TUTORIAL_GUIDES: Record<number, { title: string; desc: string }> = {
    1: {
      title: 'Bước 1: Nhập Nguyên Liệu',
      desc: 'Hãy vào tab "Chợ Sỉ" và mua thêm Bột Mì hoặc Bơ để chuẩn bị nguyên liệu nào!'
    },
    2: {
      title: 'Bước 2: Nướng Mẻ Bánh Đầu Tiên',
      desc: 'Vào tab "Bếp Bánh" và bấm nút "Nướng" để đưa bánh quy vào lò nướng.'
    },
    3: {
      title: 'Bước 3: Lấy Bánh Chín Ra Kệ',
      desc: 'Bánh trong lò đã chín vàng thơm ngát rồi! Bấm "Lấy Ra" để mang lên tủ kính.'
    },
    4: {
      title: 'Bước 4: Định Giá Bán Bánh',
      desc: 'Vào tab "Tủ Kính" và thử kéo thanh trượt để chỉnh mức giá bạn mong muốn.'
    },
    5: {
      title: 'Bước 5: Đón Chào Vị Khách Đầu Tiên',
      desc: 'Khách hàng thị trấn sẽ tự ghé tiệm và mua mẩu bánh đầu tiên của bạn!'
    }
  };

  const current = TUTORIAL_GUIDES[tutorialStep];
  if (!current) return null;

  return (
    <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 text-white p-3.5 rounded-3xl shadow-md shadow-rose-200/50 flex items-center justify-between gap-3 animate-fade-in">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold truncate">{current.title}</h4>
          <p className="text-[11px] text-white/90 truncate">{current.desc}</p>
        </div>
      </div>
      <span className="text-[10px] bg-white/25 px-2.5 py-1 rounded-full font-mono shrink-0">
        {tutorialStep}/5
      </span>
    </div>
  );
};