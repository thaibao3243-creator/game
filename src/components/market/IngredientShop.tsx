import React from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { GameItemIcon } from '../common/GameItemIcon';
import { ShoppingBasket, Coins } from 'lucide-react';

export const IngredientShop: React.FC = () => {
  const { cash, ingredientInventory, ingredients, buyIngredient } = useGameStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <ShoppingBasket className="w-4 h-4 text-emerald-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Chợ Sỉ Nông Sản & Gia Vị
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.values(ingredients).map((item) => {
          const currentQty = ingredientInventory[item.id] || 0;
          const canAfford1 = cash >= item.buyPrice;
          const canAfford5 = cash >= item.buyPrice * 5;

          return (
            <div
              key={item.id}
              className="bg-white border border-stone-200/80 rounded-3xl p-3.5 flex items-center justify-between shadow-sm hover:border-emerald-200 transition"
            >
              <div className="flex items-center gap-3">
                <GameItemIcon asset={item.asset} rarity={item.rarity} size="md" />
                <div>
                  <h4 className="text-xs font-bold text-stone-800">{item.name}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-amber-600 font-mono font-semibold">
                    <Coins className="w-3 h-3 text-amber-500" />
                    <span>${item.buyPrice}</span>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    Trong kho: <span className="font-mono font-semibold text-stone-600">{currentQty}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={!canAfford1}
                  onClick={() => buyIngredient(item.id, 1)}
                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-emerald-100 active:scale-95 disabled:opacity-40 text-stone-700 text-xs font-semibold rounded-xl transition"
                >
                  +1
                </button>
                <button
                  disabled={!canAfford5}
                  onClick={() => buyIngredient(item.id, 5)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 active:scale-95 disabled:opacity-40 text-emerald-700 text-xs font-bold rounded-xl transition"
                >
                  +5
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};