import React, { useState, useEffect } from 'react';
import { useGameStore } from './stores/useGameStore';
import { supabase } from './services/supabase';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { BackupModal } from './components/backup/BackupModal';
import { CoopMailboxModal } from './components/mailbox/CoopMailboxModal';
import { PetMascot } from './components/pet/PetMascot';
import { SalesToastContainer } from './components/common/SalesToast';
import { TutorialOverlay } from './components/tutorial/TutorialOverlay';
import { BakingStation } from './components/kitchen/BakingStation';
import { IngredientShop } from './components/market/IngredientShop';
import { ShowcaseCounter } from './components/showcase/ShowcaseCounter';
import { DeliveryBoard } from './components/delivery/DeliveryBoard';
import { PRESET_AVATARS, getRequiredExpForLevel } from './constants/gameData';
import * as Icons from 'lucide-react';
import { 
  Heart, 
  Coins, 
  Store, 
  ShoppingBasket, 
  Flame, 
  Bike, 
  Cloud, 
  LogOut, 
  User, 
  MessageCircle, 
  Edit3, 
  AlertCircle, 
  CloudUpload, 
  CheckCircle2, 
  History,
  Mail
} from 'lucide-react';

export default function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'kitchen' | 'market' | 'showcase' | 'delivery'>('kitchen');

  const { 
    playerName,
    bakeryName,
    avatarId,
    cash, 
    hearts, 
    exp,
    level,
    currentUser, 
    isSyncing,
    hasUnsavedChanges,
    customerBubble,
    incomingParcels,
    initMasterData,
    setCurrentUser,
    syncToCloud,
    loadFromCloud,
    resetToDefault,
    tickBakingAndDelivery,
    tickCustomerAI,
    checkAndTriggerAutoBackup
  } = useGameStore();

  useEffect(() => {
    if (window.location.search.includes('error=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    initMasterData();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadFromCloud();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        loadFromCloud();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // VÒNG LẶP ENGINE
  useEffect(() => {
    let lastTime = Date.now();

    // 1. Tick lò bánh & shipper & quầy khách hàng (1000ms delta-time)
    const timer = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      tickBakingAndDelivery(delta);
    }, 1000);

    // 2. Khách vãng lai mua lẻ kệ tủ kính (4500ms)

    // 3. Auto-sync Cloud mỗi 60 giây (nếu có user)
    const autoSaveTimer = setInterval(() => {
      if (useGameStore.getState().currentUser) {
        useGameStore.getState().syncToCloud();
      }
    }, 60000);

    // 4. Auto-backup 5 phút (Tự động tắt khi offline hoặc ẩn tab)
    const backupTimer = setInterval(() => {
      checkAndTriggerAutoBackup();
    }, 10000);

    return () => {
      clearInterval(timer);
      clearInterval(autoSaveTimer);
      clearInterval(backupTimer);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    resetToDefault();
  };

  const currentAvatar = PRESET_AVATARS.find((a) => a.id === avatarId) || PRESET_AVATARS[0];
  const AvatarIconComponent = (Icons as Record<string, any>)[currentAvatar.iconName] || Icons.Smile;

  const currentReqExp = getRequiredExpForLevel(level);
  const expProgress = Math.min(100, Math.floor((exp / currentReqExp) * 100));

  return (
    <div className="min-h-screen bg-[#FFFBF7] text-stone-700 flex flex-col font-sans select-none pb-24 md:pb-6 relative overflow-x-hidden">
      
      {/* Container Thông báo Toast trôi nổi góc màn hình */}
      <SalesToastContainer />

      {/* Bé Thú Cưng Mini Tương Tác */}
      <PetMascot />

      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-rose-100 px-3 sm:px-6 py-2.5 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          
          {/* Avatar & Tên tiệm bánh */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2.5 text-left p-1 rounded-2xl hover:bg-rose-50/60 transition group shrink-0"
          >
            <div className={`relative w-11 h-11 rounded-2xl ${currentAvatar.bgColor} flex items-center justify-center ${currentAvatar.textColor} shadow-sm shadow-rose-100 transition-transform group-hover:scale-105`}>
              <AvatarIconComponent className="w-6 h-6" />
              <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-sm text-stone-400 group-hover:text-rose-500">
                <Edit3 className="w-2.5 h-2.5" />
              </div>
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-stone-800 leading-tight group-hover:text-rose-600 transition flex items-center gap-1">
                <span>{bakeryName}</span>
              </h1>
              <p className="text-[10px] text-stone-400 font-medium">
                Chủ tiệm: <span className="text-rose-500 font-semibold">{playerName}</span>
              </p>
            </div>
          </button>

          {/* EXP ProgressBar */}
          <div className="flex-1 max-w-[130px] sm:max-w-[180px] px-2 py-1 bg-rose-50/50 border border-rose-100 rounded-2xl">
            <div className="flex justify-between items-center text-[10px] mb-1 font-semibold">
              <span className="text-rose-600 bg-white px-1.5 py-0.2 rounded-md shadow-2xs">Cấp {level}</span>
              <span className="text-stone-500 font-mono text-[9px] sm:text-[10px]">{exp}/{currentReqExp}</span>
            </div>
            <div className="w-full bg-stone-200/60 h-2 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 rounded-full transition-all duration-500"
                style={{ width: `${expProgress}%` }}
              />
            </div>
          </div>

          {/* Cụm Tiền, Hòm Thư, Backup & Nút Save To */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 sm:px-2.5 py-1.5 rounded-2xl text-xs font-bold text-amber-700 font-mono shadow-2xs">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>${cash.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 sm:px-2.5 py-1.5 rounded-2xl text-xs font-bold text-rose-600 font-mono shadow-2xs">
              <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
              <span>{hearts.toLocaleString()}</span>
            </div>

            {/* NÚT HÒM THƯ BƯU KIỆN CO-OP */}
            <button
              onClick={() => setIsMailboxOpen(true)}
              title="Hòm thư bưu kiện Co-op"
              className="relative p-2 bg-stone-100 hover:bg-purple-100 text-stone-600 hover:text-purple-700 rounded-2xl border border-stone-200 transition active:scale-95 flex items-center justify-center"
            >
              <Mail className="w-4 h-4" />
              {incomingParcels.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-bounce shadow">
                  {incomingParcels.length}
                </span>
              )}
            </button>

            {/* Nút Lịch Sử Backup */}
            <button
              onClick={() => setIsBackupOpen(true)}
              title="Lịch sử sao lưu 5 phút"
              className="p-2 bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-700 rounded-2xl border border-stone-200 transition active:scale-95 flex items-center justify-center"
            >
              <History className="w-4 h-4" />
            </button>

            {/* Nút Save Game To */}
            {currentUser ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => syncToCloud()}
                  disabled={isSyncing}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-2xl text-xs font-bold shadow-md transition active:scale-95 ${
                    hasUnsavedChanges
                      ? 'bg-gradient-to-r from-amber-400 to-rose-400 text-white shadow-rose-200 animate-pulse'
                      : 'bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600'
                  }`}
                >
                  <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span className="hidden sm:inline">
                    {isSyncing ? 'Đang Lưu...' : hasUnsavedChanges ? 'LƯU GAME' : 'ĐÃ LƯU CLOUD'}
                  </span>
                  <span className="sm:hidden">{isSyncing ? '...' : 'LƯU'}</span>
                </button>

                <button
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="p-2 text-stone-400 hover:text-rose-500 rounded-2xl hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white px-3 sm:px-4 py-2 rounded-2xl text-xs font-bold shadow-md shadow-rose-200 active:scale-95 transition"
              >
                <User className="w-4 h-4" />
                <span>LƯU NGAY</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. LỜI NHẮC TRÊN MÀN HÌNH */}
      <div className="max-w-5xl mx-auto w-full px-4 pt-3">
        {!currentUser ? (
          <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 text-white px-4 py-2.5 rounded-3xl shadow-sm flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-200 animate-bounce" />
              <p className="text-xs font-medium leading-tight truncate">
                <span className="font-bold">Nhắc nhở:</span> Đang chơi ở chế độ tạm. Hãy đăng nhập để lưu tiến trình và mở tính năng Gửi Bưu Kiện Co-op!
              </p>
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="bg-white text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-2xl text-xs font-bold shrink-0 shadow-sm transition active:scale-95"
            >
              Lưu Bây Giờ
            </button>
          </div>
        ) : hasUnsavedChanges ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-2xl shadow-2xs flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-amber-500" />
              <p className="text-xs">Tiến trình tiệm bánh có thay đổi mới chưa được đồng bộ lên Cloud.</p>
            </div>
            <button
              onClick={() => syncToCloud()}
              className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-xl text-xs font-bold transition shrink-0"
            >
              Đồng Bộ Ngay
            </button>
          </div>
        ) : (
          <div className="bg-emerald-50/70 border border-emerald-200/60 text-emerald-700 px-4 py-1.5 rounded-2xl text-[11px] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Tiến trình an toàn trên đám mây Supabase (Tự động sao lưu mỗi 5 phút khi Online).</span>
          </div>
        )}
      </div>

      {/* 3. KHU VỰC THAO TÁC CHÍNH */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 space-y-4">
        <TutorialOverlay />

        {customerBubble && (
          <div className="bg-white border border-rose-100 rounded-2xl p-2.5 flex items-center gap-2.5 shadow-sm animate-fade-in">
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-stone-600 leading-tight">
              <span className="font-bold text-stone-800">{customerBubble.name}: </span>
              {customerBubble.text}
            </p>
          </div>
        )}

        {/* Tab Navigation Desktop */}
        <div className="hidden md:flex items-center gap-2 p-1.5 bg-white border border-rose-100 rounded-3xl shadow-sm">
          <button
            onClick={() => setActiveTab('kitchen')}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'kitchen' ? 'bg-rose-400 text-white shadow-sm' : 'text-stone-500 hover:bg-rose-50'
            }`}
          >
            <Flame className="w-4 h-4" /> Bếp Bánh
          </button>
          <button
            onClick={() => setActiveTab('market')}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'market' ? 'bg-rose-400 text-white shadow-sm' : 'text-stone-500 hover:bg-rose-50'
            }`}
          >
            <ShoppingBasket className="w-4 h-4" /> Chợ Sỉ
          </button>
          <button
            onClick={() => setActiveTab('showcase')}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'showcase' ? 'bg-rose-400 text-white shadow-sm' : 'text-stone-500 hover:bg-rose-50'
            }`}
          >
            <Store className="w-4 h-4" /> Tủ Kính & Quầy Khách
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'delivery' ? 'bg-rose-400 text-white shadow-sm' : 'text-stone-500 hover:bg-rose-50'
            }`}
          >
            <Bike className="w-4 h-4" /> Đơn Ship
          </button>
        </div>

        {activeTab === 'kitchen' && <BakingStation />}
        {activeTab === 'market' && <IngredientShop />}
        {activeTab === 'showcase' && <ShowcaseCounter />}
        {activeTab === 'delivery' && <DeliveryBoard />}
      </main>

      {/* 4. BOTTOM NAVIGATION MOBILE */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-rose-100 px-4 py-2 md:hidden flex justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('kitchen')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition ${
            activeTab === 'kitchen' ? 'text-rose-500 font-bold' : 'text-stone-400'
          }`}
        >
          <Flame className="w-5 h-5" />
          <span className="text-[10px]">Bếp Bánh</span>
        </button>

        <button
          onClick={() => setActiveTab('market')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition ${
            activeTab === 'market' ? 'text-rose-500 font-bold' : 'text-stone-400'
          }`}
        >
          <ShoppingBasket className="w-5 h-5" />
          <span className="text-[10px]">Chợ Sỉ</span>
        </button>

        <button
          onClick={() => setActiveTab('showcase')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition ${
            activeTab === 'showcase' ? 'text-rose-500 font-bold' : 'text-stone-400'
          }`}
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px]">Tủ Kính</span>
        </button>

        <button
          onClick={() => setActiveTab('delivery')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition ${
            activeTab === 'delivery' ? 'text-rose-500 font-bold' : 'text-stone-400'
          }`}
        >
          <Bike className="w-5 h-5" />
          <span className="text-[10px]">Đơn Ship</span>
        </button>
      </nav>

      {/* MODALS HỆ THỐNG */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <BackupModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
      <CoopMailboxModal isOpen={isMailboxOpen} onClose={() => setIsMailboxOpen(false)} />
    </div>
  );
}