import React from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { GameItemIcon } from '../common/GameItemIcon';
import { FrontCounter } from '../counter/FrontCounter';
import { 
  Store, 
  Tag, 
  Smile, 
  Meh, 
  Frown, 
  ShieldCheck, 
  ShieldAlert 
} from 'lucide-react';

export const ShowcaseCounter: React.FC = () => {
  const { 
    showcaseInventory, 
    recipes, 
    deliveryOrders, 
    isReservingDelivery,
    toggleDeliveryReservation,
    setShowcasePrice 
  } = useGameStore();

  const reservedByDelivery: Record<string, number> = {};
  if (isReservingDelivery) {
    deliveryOrders.forEach((order) => {
      if (order.status === 'idle') {
        Object.entries(order.requiredItems).forEach(([recId, reqQty]) => {
          reservedByDelivery[recId] = (reservedByDelivery[recId] || 0) + reqQty;
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* 1. KHU VỰC KHÁCH ĐỨNG CHỜ TẠI QUẦY */}
      <FrontCounter />

      {/* 2. KHU VỰC KỆ TRƯNG BÀY & ĐỊNH GIÁ */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Tủ Kính Trưng Bày & Định Giá Bán
            </h3>
          </div>

          {/* CÔNG TẮC BẬT/TẮT GIỮ BÁNH CHO SHIP */}
          <div className="flex items-center gap-2 bg-white border border-rose-100 px-3 py-1.5 rounded-2xl shadow-2xs">
            {isReservingDelivery ? (
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            )}
            <span className="text-[11px] font-medium text-stone-600">
              Giữ bánh cho đơn Ship:
            </span>
            <button
              onClick={() => toggleDeliveryReservation()}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                isReservingDelivery ? 'bg-emerald-500' : 'bg-stone-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${
                  isReservingDelivery ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Danh sách bánh trên kệ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(showcaseInventory).map(([recipeId, state]) => {
            const recipe = recipes[recipeId];
            if (!recipe) return null;

            const ratio = state.sellingPrice / recipe.baseFairPrice;
            const reservedCount = reservedByDelivery[recipeId] || 0;
            const availableForWalkIn = Math.max(0, state.quantity - reservedCount);

            return (
              <div
                key={recipeId}
                className="bg-white border border-rose-100 rounded-3xl p-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GameItemIcon asset={recipe.asset} rarity={recipe.rarity} size="md" />
                    <div>
                      <h4 className="text-xs font-bold text-stone-800">{recipe.name}</h4>
                      <p className="text-[11px] text-stone-400">
                        Tổng trong tủ: <span className="font-mono font-bold text-stone-700">{state.quantity}</span>
                        {isReservingDelivery && reservedCount > 0 && (
                          <span className="text-rose-500 font-medium ml-1">
                            (Giữ {reservedCount} cho ship)
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-medium">
                        Có thể bán khách lẻ: <span className="font-mono font-bold">{availableForWalkIn}</span> chiếc
                      </p>
                    </div>
                  </div>

                  {ratio <= 0.85 ? (
                    <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded-full border border-emerald-200">
                      <Smile className="w-3 h-3" /> Đắt Khách
                    </span>
                  ) : ratio <= 1.2 ? (
                    <span className="flex items-center gap-1 text-[10px] bg-sky-50 text-sky-600 font-bold px-2 py-1 rounded-full border border-sky-200">
                      <Meh className="w-3 h-3" /> Chuẩn Giá
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 font-bold px-2 py-1 rounded-full border border-amber-200">
                      <Frown className="w-3 h-3" /> Khó Bán
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-stone-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-500 font-medium flex items-center gap-1">
                      <Tag className="w-3 h-3 text-stone-400" /> Giá Bán Lẻ:
                    </span>
                    <span className="font-mono font-bold text-amber-600 text-sm">
                      ${state.sellingPrice}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={Math.floor(recipe.baseFairPrice * 0.5)}
                    max={Math.floor(recipe.baseFairPrice * 2.2)}
                    value={state.sellingPrice}
                    onChange={(e) => setShowcasePrice(recipeId, Number(e.target.value))}
                    className="w-full accent-rose-400 cursor-pointer h-1.5 bg-stone-100 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                    <span>Giá sàn: ${recipe.baseFairPrice}</span>
                    <span>Tối đa: ${Math.floor(recipe.baseFairPrice * 2.2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};