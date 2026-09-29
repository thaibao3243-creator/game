import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { GameItemIcon } from '../common/GameItemIcon';
import * as Icons from 'lucide-react';
import { 
  Users, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  X, 
  AlertCircle,
  DoorOpen,
  DoorClosed,
  Megaphone
} from 'lucide-react';

export const FrontCounter: React.FC = () => {
  const { 
    isOpen,
    nextCustomerWaveTime,
    counterCustomers, 
    showcaseInventory, 
    recipes, 
    deliveryOrders, 
    isReservingDelivery,
    toggleStoreOpen,
    callCustomersEarly,
    serveCounterCustomer, 
    dismissCounterCustomer 
  } = useGameStore();

  const [remainingWaveSec, setRemainingWaveSec] = useState<number>(0);

  useEffect(() => {
    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((nextCustomerWaveTime - Date.now()) / 1000));
      setRemainingWaveSec(diff);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextCustomerWaveTime]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getReservedCount = (recipeId: string) => {
    if (!isReservingDelivery) return 0;
    return deliveryOrders
      .filter((o) => o.status === 'idle')
      .reduce((acc, o) => acc + (o.requiredItems[recipeId] || 0), 0);
  };

  return (
    <div className="bg-white border border-rose-100 rounded-3xl p-4 shadow-sm space-y-3.5">
      {/* 1. THANH TRẠNG THÁI TIỆM & ĐIỀU KHIỂN ĐÓNG / MỞ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-rose-50">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${
            isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-200 text-stone-500'
          }`}>
            {isOpen ? <DoorOpen className="w-5 h-5" /> : <DoorClosed className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                Quầy Đón Khách ({counterCustomers.length}/3)
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                isOpen ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-stone-100 text-stone-500 border border-stone-200'
              }`}>
                {isOpen ? 'Đang Mở Cửa' : 'Đang Tạm Đóng'}
              </span>
            </div>
            <p className="text-[10px] text-stone-400">
              {isOpen 
                ? `Đợt khách tiếp theo: ${formatTime(remainingWaveSec)}` 
                : 'Tiệm đang tạm đóng để chuẩn bị nướng bánh.'}
            </p>
          </div>
        </div>

        {/* Nút thao tác Đóng/Mở & Mời khách */}
        <div className="flex items-center gap-2 shrink-0">
          {isOpen && (
            <button
              onClick={() => callCustomersEarly()}
              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-[11px] font-bold rounded-xl transition flex items-center gap-1 active:scale-95 shadow-2xs"
              title="Phát tờ rơi gọi khách vào tiệm ngay không cần đợi"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Mời Khách Ngay</span>
            </button>
          )}

          <button
            onClick={() => toggleStoreOpen()}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
              isOpen 
                ? 'bg-rose-100 hover:bg-rose-200 text-rose-600' 
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'
            }`}
          >
            {isOpen ? <DoorClosed className="w-3.5 h-3.5" /> : <DoorOpen className="w-3.5 h-3.5" />}
            <span>{isOpen ? 'Đóng Cửa Tiệm' : 'Mở Cửa Đón Khách'}</span>
          </button>
        </div>
      </div>

      {/* 2. DANH SÁCH KHÁCH ĐỨNG CHỜ */}
      {!isOpen && counterCustomers.length === 0 ? (
        <div className="py-6 text-center border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50/50 text-stone-400 text-xs space-y-1">
          <DoorClosed className="w-6 h-6 mx-auto text-stone-300" />
          <p>Tiệm đang đóng cửa. Bấm "Mở Cửa Đón Khách" để bắt đầu phục vụ!</p>
        </div>
      ) : counterCustomers.length === 0 ? (
        <div className="py-6 text-center border-2 border-dashed border-rose-100/80 rounded-2xl bg-rose-50/20 text-stone-400 text-xs space-y-1">
          <Clock className="w-5 h-5 mx-auto text-rose-300 animate-pulse" />
          <p>Quầy đang thoáng đãng. Đợt khách tiếp theo sẽ ghé thăm sau {formatTime(remainingWaveSec)}!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {counterCustomers.map((cust) => {
            const recipe = recipes[cust.requestedRecipeId];
            if (!recipe) return null;

            const showcase = showcaseInventory[cust.requestedRecipeId];
            const currentQty = showcase ? showcase.quantity : 0;
            const reserved = getReservedCount(cust.requestedRecipeId);
            const availableQty = Math.max(0, currentQty - reserved);
            const hasEnough = availableQty >= cust.requestedQuantity;

            const patienceRatio = Math.max(0, cust.patienceRemainingMs / cust.patienceTotalMs);
            const patiencePercent = Math.floor(patienceRatio * 100);
            const remainingSec = Math.ceil(cust.patienceRemainingMs / 1000);

            const barColor =
              patienceRatio > 0.5 ? 'bg-emerald-400' :
              patienceRatio > 0.25 ? 'bg-amber-400' : 'bg-rose-500 animate-pulse';

            const CustomerIcon = (Icons as Record<string, any>)[cust.avatarIcon] || Icons.Smile;
            const estimatedCash = (showcase?.sellingPrice || recipe.baseFairPrice) * cust.requestedQuantity;

            return (
              <div
                key={cust.id}
                className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-3 space-y-2.5 relative flex flex-col justify-between shadow-2xs hover:border-rose-200 transition"
              >
                <button
                  onClick={() => dismissCounterCustomer(cust.id)}
                  title="Mời khách rời đi"
                  className="absolute top-2 right-2 p-1 text-stone-300 hover:text-rose-500 rounded-full hover:bg-white transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                      <CustomerIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 pr-4">
                      <h4 className="text-xs font-bold text-stone-800 truncate">{cust.name}</h4>
                      <span className="text-[10px] text-stone-400">Đang chờ phục vụ</span>
                    </div>
                  </div>

                  <div className="bg-white border border-stone-100 rounded-xl p-2 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <GameItemIcon asset={recipe.asset} rarity={recipe.rarity} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-700 truncate">{recipe.name}</p>
                        <p className="text-[10px] text-amber-600 font-mono font-bold">
                          ${estimatedCash} {patienceRatio > 0.5 && <span className="text-rose-500">+Tip</span>}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold font-mono text-stone-800">
                        x{cust.requestedQuantity}
                      </span>
                      <p className={`text-[9px] font-medium ${hasEnough ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {hasEnough ? 'Có sẵn' : `Thiếu (${availableQty}/${cust.requestedQuantity})`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> Chờ: {remainingSec}s
                      </span>
                      <span>{patiencePercent}%</span>
                    </div>
                    <div className="w-full bg-stone-200/70 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${patiencePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  disabled={!hasEnough}
                  onClick={() => serveCounterCustomer(cust.id)}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                    hasEnough
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 animate-bounce'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  {hasEnough ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Phục Vụ Ngay</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Chưa Đủ Bánh</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};