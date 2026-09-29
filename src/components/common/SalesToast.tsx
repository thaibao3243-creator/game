import React from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { Coins, Heart, Gift, Sparkles, X } from 'lucide-react';

export const SalesToastContainer: React.FC = () => {
  const { toasts, removeToast } = useGameStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-3 sm:right-6 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-white/95 border border-rose-100 rounded-2xl p-3 shadow-lg shadow-rose-200/40 backdrop-blur flex items-center justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              t.type === 'tip' ? 'bg-amber-100 text-amber-600' :
              t.type === 'parcel' ? 'bg-purple-100 text-purple-600' :
              'bg-emerald-100 text-emerald-600'
            }`}>
              {t.type === 'tip' ? <Sparkles className="w-4 h-4" /> :
               t.type === 'parcel' ? <Gift className="w-4 h-4" /> :
               <Coins className="w-4 h-4" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-800 truncate">{t.title}</span>
                {t.amount > 0 && (
                  <span className="text-[11px] font-mono font-bold text-amber-600">
                    +${t.amount}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-stone-500 truncate">{t.message}</p>
            </div>
          </div>

          <button
            onClick={() => removeToast(t.id)}
            className="p-1 text-stone-300 hover:text-stone-500 rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};