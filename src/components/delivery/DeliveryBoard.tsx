import React from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { Bike, Clock, Coins, Heart, CheckCircle2 } from 'lucide-react';

export const DeliveryBoard: React.FC = () => {
  const { deliveryOrders, showcaseInventory, recipes, startDelivery, claimDeliveryReward } = useGameStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Bike className="w-4 h-4 text-sky-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Đơn Đặt Hàng Giao Tận Nơi
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {deliveryOrders.map((order) => {
          const hasAllItems = Object.entries(order.requiredItems).every(
            ([recId, reqQty]) => (showcaseInventory[recId]?.quantity || 0) >= reqQty
          );

          const elapsedSec = order.startedAt ? Math.floor((Date.now() - order.startedAt) / 1000) : 0;
          const remainingSec = Math.max(0, order.deliveryTimeSeconds - elapsedSec);

          return (
            <div
              key={order.id}
              className="bg-white border border-sky-100 rounded-3xl p-4 shadow-sm space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-800">{order.customerName}</h4>
                  <p className="text-[10px] text-stone-400">{order.destination}</p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="flex items-center text-amber-600 font-bold">
                    <Coins className="w-3.5 h-3.5 mr-0.5" /> +${order.rewardCash}
                  </span>
                  <span className="flex items-center text-rose-500 font-bold">
                    <Heart className="w-3.5 h-3.5 mr-0.5 fill-rose-400" /> +{order.rewardHearts}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-stone-50 rounded-2xl space-y-1">
                {Object.entries(order.requiredItems).map(([recId, reqQty]) => {
                  const rec = recipes[recId];
                  const currentQty = showcaseInventory[recId]?.quantity || 0;
                  const isEnough = currentQty >= reqQty;

                  return (
                    <div key={recId} className="flex justify-between items-center text-xs">
                      <span className="text-stone-600">{rec?.name || recId}</span>
                      <span
                        className={`font-mono text-[11px] font-bold ${
                          isEnough ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {currentQty}/{reqQty}
                      </span>
                    </div>
                  );
                })}
              </div>

              {order.status === 'idle' && (
                <button
                  disabled={!hasAllItems}
                  onClick={() => startDelivery(order.id)}
                  className="w-full py-2.5 bg-sky-400 hover:bg-sky-500 active:scale-95 disabled:opacity-40 text-white rounded-2xl text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Cử Shipper Đi Giao</span>
                </button>
              )}

              {order.status === 'delivering' && (
                <div className="w-full py-2 bg-sky-50 text-sky-600 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang giao bánh: {remainingSec}s</span>
                </div>
              )}

              {order.status === 'completed' && (
                <button
                  onClick={() => claimDeliveryReward(order.id)}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-200 transition flex items-center justify-center gap-1.5 animate-bounce"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Nhận Thưởng Đơn Giao</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};