import React from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { GameItemIcon } from '../common/GameItemIcon';
import { Flame, Clock, Sparkles, Lock, CheckCircle2 } from 'lucide-react';

export const BakingStation: React.FC = () => {
  const { level, bakingSlots, ingredientInventory, recipes, ingredients, startBaking, claimBakedItem } = useGameStore();
  const maxSlots = level >= 5 ? 4 : level >= 3 ? 3 : 2;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Lò Nướng ({bakingSlots.length}/{maxSlots} Khay Hoạt Động)
            </h3>
          </div>
          <span className="text-[11px] text-stone-400 font-medium">Cấp {level}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: maxSlots }).map((_, index) => {
            const slot = bakingSlots[index];

            if (!slot) {
              return (
                <div
                  key={`empty_${index}`}
                  className="border-2 border-dashed border-rose-200/70 bg-white/40 rounded-3xl p-4 flex flex-col items-center justify-center min-h-[110px] text-stone-400 text-xs"
                >
                  <Flame className="w-5 h-5 text-rose-200 mb-1" />
                  <span>Khay nướng trống</span>
                </div>
              );
            }

            const recipe = recipes[slot.recipeId];
            if (!recipe) return null;
            const elapsed = Date.now() - slot.startedAt;
            const progress = Math.min(100, Math.floor((elapsed / slot.durationMs) * 100));

            return (
              <div
                key={slot.slotId}
                className="bg-white border border-rose-100 rounded-3xl p-4 shadow-sm space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <GameItemIcon asset={recipe.asset} rarity={recipe.rarity} size="md" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-stone-800 truncate">{recipe.name}</h4>
                    <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {slot.isReady ? 'Đã chín giòn!' : `Đang nướng: ${progress}%`}
                    </p>
                  </div>

                  {slot.isReady ? (
                    <button
                      onClick={() => claimBakedItem(slot.slotId)}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-2xl text-xs font-bold shadow-sm shadow-emerald-200 flex items-center gap-1 transition animate-bounce"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Lấy Ra</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-mono text-rose-400 font-semibold">
                      {Math.ceil((slot.durationMs - elapsed) / 1000)}s
                    </span>
                  )}
                </div>

                <div className="w-full bg-rose-50 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      slot.isReady ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Danh sách công thức đọc động từ Supabase */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 px-1">
          Sách Công Thức Tiệm Bánh
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.values(recipes).map((recipe) => {
            const isUnlocked = level >= recipe.requiredLevel;
            const canBake =
              isUnlocked &&
              bakingSlots.length < maxSlots &&
              Object.entries(recipe.requiredIngredients || {}).every(
                ([ingId, reqQty]) => (ingredientInventory[ingId] || 0) >= reqQty
              );

            return (
              <div
                key={recipe.id}
                className={`bg-white border rounded-3xl p-3.5 flex items-center justify-between gap-3 shadow-sm transition ${
                  isUnlocked ? 'border-rose-100 hover:border-rose-200' : 'border-stone-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <GameItemIcon asset={recipe.asset} rarity={recipe.rarity} size="md" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-stone-800 truncate">{recipe.name}</h4>
                    <p className="text-[11px] text-amber-600 font-medium">
                      +{recipe.expReward} EXP • {recipe.bakingTimeSeconds}s
                    </p>

                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(recipe.requiredIngredients || {}).map(([ingId, reqQty]) => {
                        const ing = ingredients[ingId];
                        const hasEnough = (ingredientInventory[ingId] || 0) >= reqQty;
                        return (
                          <span
                            key={ingId}
                            className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${
                              hasEnough
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-rose-50 text-rose-500 font-bold'
                            }`}
                          >
                            {ing?.name.split(' ')[0] || ingId}: {ingredientInventory[ingId] || 0}/{reqQty}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {isUnlocked ? (
                  <button
                    disabled={!canBake}
                    onClick={() => startBaking(recipe.id)}
                    className="px-3.5 py-2 bg-rose-400 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-400 active:scale-95 text-white rounded-2xl text-xs font-semibold shadow-sm shadow-rose-200 transition shrink-0 flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Nướng</span>
                  </button>
                ) : (
                  <div className="px-2.5 py-1.5 bg-stone-100 text-stone-400 rounded-2xl text-[10px] font-bold flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3" />
                    <span>Cấp {recipe.requiredLevel}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};