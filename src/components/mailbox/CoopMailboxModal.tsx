import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { PRESET_AVATARS } from '../../constants/gameData';
import * as Icons from 'lucide-react';
import { 
  Mail, 
  Send, 
  Inbox, 
  Gift, 
  X, 
  Heart, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Users,
  Copy,
  UserPlus,
  Trash2,
  UserCheck,
  UserX,
  Clock
} from 'lucide-react';

interface CoopMailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CoopMailboxModal: React.FC<CoopMailboxModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    bakeryId,
    friends,
    incomingParcels, 
    incomingRequests,
    ingredientInventory, 
    showcaseInventory, 
    ingredients, 
    recipes, 
    sendFriendRequest,
    fetchFriendRequests,
    respondFriendRequest,
    removeFriend,
    sendCoopParcel, 
    claimCoopParcel, 
    fetchIncomingParcels 
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'inbox' | 'send' | 'friends'>('inbox');
  const [selectedFriendBakeryId, setSelectedFriendBakeryId] = useState<string>('');
  const [targetBakeryIdInput, setTargetBakeryIdInput] = useState('');
  const [message, setMessage] = useState('Gửi bạn chút quà ngọt ngào!');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Tự động chọn người bạn đầu tiên khi mở tab Gửi quà
  useEffect(() => {
    if (friends.length > 0 && !selectedFriendBakeryId) {
      setSelectedFriendBakeryId(friends[0].bakeryId);
    }
  }, [friends, selectedFriendBakeryId]);

  useEffect(() => {
    if (isOpen) {
      fetchIncomingParcels();
      fetchFriendRequests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(bakeryId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Gửi lời mời kết bạn
  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBakeryIdInput.trim()) return;

    setLoading(true);
    setFeedback(null);
    const result = await sendFriendRequest(targetBakeryIdInput);
    setLoading(false);

    if (result.success) {
      setFeedback({ text: 'Đã gửi lời mời kết bạn! Hãy chờ đối phương đồng ý nhé.' });
      setTargetBakeryIdInput('');
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ text: result.error || 'Lỗi gửi lời mời', isError: true });
    }
  };

  // Phản hồi lời mời kết bạn
  const handleRespond = async (requestId: string, accept: boolean) => {
    setLoading(true);
    const result = await respondFriendRequest(requestId, accept);
    setLoading(false);

    if (!result.success) {
      setFeedback({ text: result.error || 'Lỗi phản hồi lời mời', isError: true });
    }
  };

  const handleItemQtyChange = (itemId: string, qty: number, max: number) => {
    const validQty = Math.max(0, Math.min(qty, max));
    setSelectedItems((prev) => {
      const updated = { ...prev };
      if (validQty === 0) delete updated[itemId];
      else updated[itemId] = validQty;
      return updated;
    });
  };

  // Gửi quà cho bạn bè đã chọn trong dropdown
  const handleSendParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriendBakeryId) {
      setFeedback({ text: 'Vui lòng chọn một người bạn để gửi quà!', isError: true });
      return;
    }
    if (Object.keys(selectedItems).length === 0) {
      setFeedback({ text: 'Hãy chọn ít nhất 1 món đồ trong kho để gửi!', isError: true });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const result = await sendCoopParcel(selectedFriendBakeryId, message, selectedItems);
    setLoading(false);

    if (result.success) {
      setFeedback({ text: 'Đã gửi bưu kiện thành công tới tiệm bạn bè!' });
      setSelectedItems({});
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback({ text: result.error || 'Lỗi gửi quà', isError: true });
    }
  };

  const handleClaim = async (parcelId: string) => {
    setLoading(true);
    const result = await claimCoopParcel(parcelId);
    setLoading(false);

    if (result.success) {
      setFeedback({ text: 'Đã nhận quà vào kho thành công!' });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ text: result.error || 'Lỗi nhận quà', isError: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/25 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white border border-rose-100 rounded-3xl shadow-xl shadow-rose-200/50 p-6 space-y-4 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-rose-50 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề & Bakery ID cá nhân */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-800">Hòm Thư & Bạn Bè Co-op</h3>
              <p className="text-xs text-stone-400">Kết bạn 2 chiều • Tặng quà ngọt ngào</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200/80 px-2.5 py-1 rounded-2xl">
            <span className="text-[10px] text-purple-600 font-semibold">ID Tiệm:</span>
            <span className="font-mono text-xs font-bold text-purple-800">{bakeryId}</span>
            <button
              onClick={handleCopyId}
              className="p-1 text-purple-500 hover:text-purple-700 transition"
              title="Sao chép ID tiệm"
            >
              {copiedId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 3 Tab điều hướng */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-2xl">
          <button
            onClick={() => {
              setActiveTab('inbox');
              fetchIncomingParcels();
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'inbox' ? 'bg-white text-stone-800 shadow-2xs' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Thư Đến ({incomingParcels.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'send' ? 'bg-white text-stone-800 shadow-2xs' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi Quà</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('friends');
              fetchFriendRequests();
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 relative ${
              activeTab === 'friends' ? 'bg-white text-stone-800 shadow-2xs' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Bạn Bè ({friends.length})</span>
            {incomingRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-2 animate-ping" />
            )}
          </button>
        </div>

        {feedback && (
          <div className={`p-3 text-xs rounded-2xl flex items-center gap-2 animate-fade-in ${
            feedback.isError ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {feedback.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* NỘI DUNG TỪNG TAB */}
        <div className="flex-1 overflow-y-auto pr-1">
          
          {/* TAB 1: THƯ ĐẾN */}
          {activeTab === 'inbox' && (
            <div className="space-y-3">
              {!currentUser ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  Vui lòng đăng nhập để nhận bưu kiện từ bạn bè.
                </div>
              ) : incomingParcels.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs space-y-1">
                  <Gift className="w-6 h-6 mx-auto text-rose-300" />
                  <p>Hòm thư đang trống. Khi bạn bè gửi quà, bưu kiện sẽ hiện ở đây!</p>
                </div>
              ) : (
                incomingParcels.map((parcel) => (
                  <div
                    key={parcel.id}
                    className="bg-purple-50/50 border border-purple-100 rounded-2xl p-3.5 space-y-2.5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-stone-800">
                          Từ tiệm: <span className="text-purple-600">{parcel.senderBakeryName}</span>
                        </span>
                        <p className="text-[11px] text-stone-500 italic mt-0.5">"{parcel.message}"</p>
                      </div>
                      <span className="text-[9px] text-stone-400 font-mono">
                        {new Date(parcel.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-purple-100/60">
                      {Object.entries(parcel.items).map(([itemId, qty]) => {
                        const name = ingredients[itemId]?.name || recipes[itemId]?.name || itemId;
                        return (
                          <span
                            key={itemId}
                            className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-semibold"
                          >
                            {name}: x{qty}
                          </span>
                        );
                      })}
                    </div>

                    <button
                      disabled={loading}
                      onClick={() => handleClaim(parcel.id)}
                      className="w-full py-2 bg-purple-500 hover:bg-purple-600 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                      <span>Mở Quà Nhận Đồ</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: GỬI QUÀ - CHỌN TRỰC TIẾP TỪ DANH SÁCH BẠN BÈ */}
          {activeTab === 'send' && (
            <form onSubmit={handleSendParcel} className="space-y-3.5">
              {!currentUser ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl">
                  Bạn cần đăng nhập tài khoản để gửi bưu kiện.
                </div>
              ) : friends.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs space-y-2 border border-dashed border-stone-200 rounded-2xl p-4">
                  <Users className="w-6 h-6 mx-auto text-purple-300" />
                  <p>Bạn chưa có người bạn nào trong danh bạ!</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('friends')}
                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-200 transition"
                  >
                    Sang Tab Bạn Bè Để Kết Bạn Ngay
                  </button>
                </div>
              ) : (
                <>
                  {/* BỘ CHỌN BẠN BÈ */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700 ml-1">Chọn Bạn Bè Nhận Quà</label>
                    <select
                      value={selectedFriendBakeryId}
                      onChange={(e) => setSelectedFriendBakeryId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-medium text-stone-800 focus:outline-none focus:border-purple-400 focus:bg-white transition cursor-pointer"
                    >
                      {friends.map((friend) => (
                        <option key={friend.bakeryId} value={friend.bakeryId}>
                          {friend.bakeryName} (Chủ tiệm: {friend.playerName}) - {friend.bakeryId}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* LỜI NHẮN */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700 ml-1">Lời Nhắn Gửi Kèm</label>
                    <input
                      type="text"
                      maxLength={50}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Gửi bạn chút quà ngọt ngào!"
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-xs focus:outline-none focus:border-purple-400 focus:bg-white transition"
                    />
                  </div>

                  {/* CHỌN ĐỒ TRONG KHO */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-700 ml-1">Chọn Đồ Trong Kho Để Đóng Gói</label>
                    <div className="max-h-36 overflow-y-auto border border-stone-200 rounded-2xl p-2.5 space-y-2 bg-stone-50/50">
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Nguyên Liệu Thô</div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(ingredientInventory).map(([ingId, qty]) => {
                          if (qty <= 0) return null;
                          const ing = ingredients[ingId];
                          return (
                            <div key={ingId} className="bg-white border border-stone-200 p-2 rounded-xl flex items-center justify-between gap-1 text-xs shadow-2xs">
                              <span className="truncate text-stone-700">{ing?.name || ingId} ({qty})</span>
                              <input
                                type="number"
                                min={0}
                                max={qty}
                                value={selectedItems[ingId] || 0}
                                onChange={(e) => handleItemQtyChange(ingId, Number(e.target.value), qty)}
                                className="w-12 px-1 py-0.5 border border-stone-200 rounded text-center font-mono text-xs"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pt-1">Bánh Thành Phẩm</div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(showcaseInventory).map(([recId, state]) => {
                          if (state.quantity <= 0) return null;
                          const rec = recipes[recId];
                          return (
                            <div key={recId} className="bg-white border border-stone-200 p-2 rounded-xl flex items-center justify-between gap-1 text-xs shadow-2xs">
                              <span className="truncate text-stone-700">{rec?.name || recId} ({state.quantity})</span>
                              <input
                                type="number"
                                min={0}
                                max={state.quantity}
                                value={selectedItems[recId] || 0}
                                onChange={(e) => handleItemQtyChange(recId, Number(e.target.value), state.quantity)}
                                className="w-12 px-1 py-0.5 border border-stone-200 rounded text-center font-mono text-xs"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 active:scale-95 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-200 transition flex items-center justify-center gap-1.5"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Gửi Bưu Kiện Cho Bạn Bè</span>
                  </button>
                </>
              )}
            </form>
          )}

          {/* TAB 3: BẠN BÈ & LỜI MỜI KẾT BẠN 2 CHIỀU */}
          {activeTab === 'friends' && (
            <div className="space-y-4">
              {/* Form gửi lời mời kết bạn */}
              <form onSubmit={handleSendFriendRequest} className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 ml-1">Gửi Lời Mời Kết Bạn</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nhập Bakery ID (vd: BAKE-7F2A)..."
                    value={targetBakeryIdInput}
                    onChange={(e) => setTargetBakeryIdInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs uppercase font-mono tracking-wider focus:outline-none focus:border-purple-400 focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-3.5 py-2 bg-purple-500 hover:bg-purple-600 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Gửi Lời Mời</span>
                  </button>
                </div>
              </form>

              {/* KHU VỰC LỜI MỜI KẾT BẠN ĐANG CHỜ (PENDING REQUESTS) */}
              {incomingRequests.length > 0 && (
                <div className="space-y-2 p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl animate-fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Lời Mời Kết Bạn Đang Chờ ({incomingRequests.length})</span>
                  </div>

                  <div className="space-y-2">
                    {incomingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-white border border-purple-100 p-2.5 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-stone-800 truncate">{req.senderBakeryName}</h5>
                          <p className="text-[10px] text-stone-400">
                            Chủ tiệm: <span className="text-purple-600 font-semibold">{req.senderPlayerName}</span> • ID: <span className="font-mono">{req.senderBakeryId}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            disabled={loading}
                            onClick={() => handleRespond(req.id, true)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[11px] font-bold rounded-xl transition flex items-center gap-1 shadow-2xs"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Đồng Ý</span>
                          </button>
                          <button
                            disabled={loading}
                            onClick={() => handleRespond(req.id, false)}
                            className="px-2 py-1 bg-stone-100 hover:bg-rose-50 text-stone-500 hover:text-rose-600 text-[11px] font-semibold rounded-xl transition"
                          >
                            <UserX className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DANH SÁCH BẠN BÈ CHÍNH THỨC */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider px-1">
                  Danh Bạ Bạn Bè ({friends.length})
                </h4>

                {friends.length === 0 ? (
                  <div className="py-6 text-center text-stone-400 text-xs border border-dashed border-stone-200 rounded-2xl">
                    Chưa có bạn bè nào. Hãy trao đổi Bakery ID để gửi lời mời nhé!
                  </div>
                ) : (
                  friends.map((friend) => (
                    <div
                      key={friend.bakeryId}
                      className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-stone-800 truncate">{friend.bakeryName}</h5>
                          <p className="text-[10px] text-stone-400">
                            Chủ tiệm: <span className="text-purple-600 font-medium">{friend.playerName}</span> • ID: <span className="font-mono">{friend.bakeryId}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedFriendBakeryId(friend.bakeryId);
                            setActiveTab('send');
                          }}
                          className="px-2.5 py-1 bg-white border border-stone-200 hover:bg-purple-50 hover:border-purple-200 text-purple-600 text-xs font-semibold rounded-xl transition"
                        >
                          Tặng Quà
                        </button>

                        <button
                          onClick={() => removeFriend(friend.bakeryId)}
                          className="p-1 text-stone-300 hover:text-rose-500 rounded-lg transition"
                          title="Hủy kết bạn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};