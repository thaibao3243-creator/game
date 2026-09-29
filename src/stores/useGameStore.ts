import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../services/supabase';
import { fetchRemoteMasterData } from '../services/masterDataService';
import { 
  GameSaveData, 
  ActiveBakingSlot, 
  CustomerSaleLog, 
  IngredientItem, 
  RecipeItem, 
  DeliveryOrder,
  SaveBackupEntry,
  CounterCustomer,
  PetConfig,
  CoopParcel,
  SalesToastItem,
  FriendEntry,
  FriendRequestItem
} from '../types/game';
import { 
  MASTER_INGREDIENTS, 
  MASTER_RECIPES, 
  INITIAL_DELIVERY_ORDERS, 
  getRequiredExpForLevel 
} from '../constants/gameData';
import { User } from '@supabase/supabase-js';

const CURRENT_SAVE_VERSION = 7;
const LOCAL_BACKUP_KEY = 'cozy_game_backups_v1';

const generateBakeryId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BAKE-${code}`;
};

const getRandomWaveInterval = (): number => {
  const intervals = [3 * 60 * 1000, 5 * 60 * 1000, 10 * 60 * 1000, 15 * 60 * 1000];
  return intervals[Math.floor(Math.random() * intervals.length)];
};

const DEFAULT_PET_CONFIG: PetConfig = {
  species: 'cat',
  accessory: 'chef_hat',
  isHidden: false,
  moodText: 'Mùi bánh nướng thơm nức mũi meo meo~',
};

const DEFAULT_STATE: GameSaveData = {
  bakeryId: generateBakeryId(),
  playerName: 'Bé Mây',
  bakeryName: 'Cozy Bakery',
  avatarId: 'cat',
  cash: 250,
  hearts: 15,
  exp: 0,
  level: 1,
  isOpen: true,
  nextCustomerWaveTime: Date.now() + 3 * 60 * 1000,
  friends: [],
  ingredientInventory: {
    flour: 6,
    butter: 4,
    sugar: 4,
    egg: 3,
    strawberry: 3,
  },
  showcaseInventory: {
    butter_cookie: { quantity: 2, sellingPrice: 28 },
    strawberry_cupcake: { quantity: 1, sellingPrice: 55 }
  },
  bakingSlots: [],
  deliveryOrders: INITIAL_DELIVERY_ORDERS,
  isReservingDelivery: true,
  petConfig: DEFAULT_PET_CONFIG,
  tutorialStep: 1,
  lastSavedTimestamp: Date.now(),
  lastBackupTimestamp: Date.now(),
  saveVersion: CURRENT_SAVE_VERSION,
};

const migrateSaveData = (data: any): GameSaveData => {
  if (!data) return DEFAULT_STATE;
  return {
    bakeryId: data.bakeryId || generateBakeryId(),
    playerName: data.playerName || DEFAULT_STATE.playerName,
    bakeryName: data.bakeryName || DEFAULT_STATE.bakeryName,
    avatarId: data.avatarId || DEFAULT_STATE.avatarId,
    cash: typeof data.cash === 'number' ? data.cash : DEFAULT_STATE.cash,
    hearts: typeof data.hearts === 'number' ? data.hearts : DEFAULT_STATE.hearts,
    exp: typeof data.exp === 'number' ? data.exp : 0,
    level: typeof data.level === 'number' ? data.level : 1,
    isOpen: typeof data.isOpen === 'boolean' ? data.isOpen : true,
    nextCustomerWaveTime: typeof data.nextCustomerWaveTime === 'number' ? data.nextCustomerWaveTime : Date.now() + 3 * 60 * 1000,
    friends: Array.isArray(data.friends) ? data.friends : [],
    ingredientInventory: data.ingredientInventory || DEFAULT_STATE.ingredientInventory,
    showcaseInventory: data.showcaseInventory || DEFAULT_STATE.showcaseInventory,
    bakingSlots: Array.isArray(data.bakingSlots) ? data.bakingSlots : [],
    deliveryOrders: Array.isArray(data.deliveryOrders) && data.deliveryOrders.length > 0
      ? data.deliveryOrders
      : INITIAL_DELIVERY_ORDERS,
    isReservingDelivery: typeof data.isReservingDelivery === 'boolean' ? data.isReservingDelivery : true,
    petConfig: data.petConfig || DEFAULT_PET_CONFIG,
    tutorialStep: typeof data.tutorialStep === 'number' ? data.tutorialStep : 99,
    lastSavedTimestamp: data.lastSavedTimestamp || Date.now(),
    lastBackupTimestamp: data.lastBackupTimestamp || Date.now(),
    saveVersion: CURRENT_SAVE_VERSION,
  };
};

const getLocalBackups = (): SaveBackupEntry[] => {
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalBackups = (list: SaveBackupEntry[]) => {
  try {
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(list.slice(0, 5)));
  } catch (e) {
    console.error('Lỗi ghi Local Backup:', e);
  }
};

interface GameState extends GameSaveData {
  currentUser: User | null;
  isSyncing: boolean;
  isBackingUp: boolean;
  hasUnsavedChanges: boolean;
  isLoadingMasterData: boolean;
  salesLogs: CustomerSaleLog[];
  customerBubble: { name: string; text: string; reaction: 'happy' | 'normal' | 'unhappy' } | null;
  
  backupsList: SaveBackupEntry[];
  counterCustomers: CounterCustomer[];
  toasts: SalesToastItem[];
  incomingParcels: CoopParcel[];
  incomingRequests: FriendRequestItem[]; // Lời mời kết bạn đến
  ingredients: Record<string, IngredientItem>;
  recipes: Record<string, RecipeItem>;

  initMasterData: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  updateProfile: (profile: { playerName?: string; bakeryName?: string; avatarId?: string }) => void;
  setTutorialStep: (step: number) => void;

  toggleStoreOpen: (open?: boolean) => void;
  callCustomersEarly: () => void;
  tickCounterCustomers: (deltaMs: number) => void;
  serveCounterCustomer: (customerId: string) => boolean;
  dismissCounterCustomer: (customerId: string) => void;

  // HỆ THỐNG KẾT BẠN 2 CHIỀU
  sendFriendRequest: (targetBakeryId: string) => Promise<{ success: boolean; error?: string }>;
  fetchFriendRequests: () => Promise<void>;
  respondFriendRequest: (requestId: string, accept: boolean) => Promise<{ success: boolean; error?: string }>;
  removeFriend: (bakeryId: string) => void;
  publishBakeryDirectory: () => Promise<void>;

  toggleDeliveryReservation: (enabled?: boolean) => void;
  updatePetConfig: (config: Partial<PetConfig>) => void;
  addToast: (toast: Omit<SalesToastItem, 'id'>) => void;
  removeToast: (id: string) => void;

  buyIngredient: (ingredientId: string, quantity: number) => boolean;
  startBaking: (recipeId: string) => boolean;
  claimBakedItem: (slotId: number) => void;
  setShowcasePrice: (recipeId: string, price: number) => void;

  startDelivery: (orderId: string) => boolean;
  claimDeliveryReward: (orderId: string) => void;

  tickBakingAndDelivery: (deltaMs: number) => void;
  tickCustomerAI: () => void;
  checkAndTriggerAutoBackup: () => Promise<void>;

  createBackup: (customLabel?: string) => Promise<boolean>;
  loadBackupsList: () => Promise<void>;
  restoreFromBackup: (backupEntry: SaveBackupEntry) => Promise<void>;
  deleteBackup: (backupId: string) => Promise<void>;

  // GỬI BƯU KIỆN QUA BAKERY ID
  sendCoopParcel: (targetBakeryId: string, message: string, itemsToSend: Record<string, number>) => Promise<{ success: boolean; error?: string }>;
  fetchIncomingParcels: () => Promise<void>;
  claimCoopParcel: (parcelId: string) => Promise<{ success: boolean; error?: string }>;

  syncToCloud: () => Promise<{ success: boolean; error?: string }>;
  loadFromCloud: () => Promise<void>;
  resetToDefault: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      currentUser: null,
      isSyncing: false,
      isBackingUp: false,
      hasUnsavedChanges: false,
      isLoadingMasterData: false,
      salesLogs: [],
      customerBubble: null,
      backupsList: getLocalBackups(),
      counterCustomers: [],
      toasts: [],
      incomingParcels: [],
      incomingRequests: [],

      ingredients: MASTER_INGREDIENTS,
      recipes: MASTER_RECIPES,

      initMasterData: async () => {
        set({ isLoadingMasterData: true });
        const data = await fetchRemoteMasterData();
        set((state) => {
          const existingOrderIds = new Set(state.deliveryOrders.map(o => o.id));
          const updatedOrders = [...state.deliveryOrders];
          data.deliveryOrders.forEach(remoteOrder => {
            if (!existingOrderIds.has(remoteOrder.id)) {
              updatedOrders.push(remoteOrder);
            }
          });

          return {
            ingredients: data.ingredients,
            recipes: data.recipes,
            deliveryOrders: updatedOrders,
            isLoadingMasterData: false,
          };
        });
      },

      setCurrentUser: (user) => set({ currentUser: user }),

      updateProfile: ({ playerName, bakeryName, avatarId }) => {
        set((state) => ({
          playerName: playerName !== undefined ? playerName.trim() : state.playerName,
          bakeryName: bakeryName !== undefined ? bakeryName.trim() : state.bakeryName,
          avatarId: avatarId !== undefined ? avatarId : state.avatarId,
          hasUnsavedChanges: true,
        }));
        get().publishBakeryDirectory();
        if (get().currentUser) get().syncToCloud();
      },

      setTutorialStep: (step) => set({ tutorialStep: step }),

      toggleStoreOpen: (open) => {
        const nextStatus = open !== undefined ? open : !get().isOpen;
        set({ isOpen: nextStatus, hasUnsavedChanges: true });
        get().addToast({
          title: nextStatus ? 'Tiệm Mở Cửa! 🌸' : 'Tiệm Tạm Đóng 🌙',
          message: nextStatus ? 'Đang đón tiếp các đợt khách ghé thăm.' : 'Tạm dừng đón khách để chuẩn bị bánh.',
          amount: 0,
          type: 'sale'
        });
      },

      callCustomersEarly: () => {
        if (!get().isOpen) {
          get().addToast({
            title: 'Tiệm Đang Đóng!',
            message: 'Hãy mở cửa tiệm trước khi mời khách ghé thăm.',
            amount: 0,
            type: 'sale'
          });
          return;
        }
        set({ nextCustomerWaveTime: Date.now() });
        get().addToast({
          title: 'Đã Phát Tờ Rơi! 📢',
          message: 'Khách hàng trong thị trấn đang bước vào tiệm!',
          amount: 0,
          type: 'sale'
        });
      },

      publishBakeryDirectory: async () => {
        const user = get().currentUser;
        if (!user) return;
        try {
          await supabase.from('bakery_directory').upsert({
            bakery_id: get().bakeryId,
            user_id: user.id,
            bakery_name: get().bakeryName,
            player_name: get().playerName,
            avatar_id: get().avatarId,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        } catch (e) {
          console.warn('Lỗi cập nhật danh bạ tiệm bánh:', e);
        }
      },

      // 1. GỬI LỜI MỜI KẾT BẠN QUA BAKERY ID
      sendFriendRequest: async (targetBakeryId: string) => {
        const cleanId = targetBakeryId.trim().toUpperCase();
        if (cleanId === get().bakeryId) {
          return { success: false, error: 'Không thể tự kết bạn với chính mình!' };
        }
        if (get().friends.some(f => f.bakeryId === cleanId)) {
          return { success: false, error: 'Hai bạn đã là bạn bè từ trước rồi!' };
        }

        try {
          // Kiểm tra xem tiệm đó có tồn tại trên directory không
          const { data: dir, error: dirErr } = await supabase
            .from('bakery_directory')
            .select('bakery_id')
            .eq('bakery_id', cleanId)
            .single();

          if (dirErr || !dir) {
            return { success: false, error: 'Không tìm thấy tiệm bánh nào có mã ID này!' };
          }

          // Kiểm tra xem đã gửi lời mời đang chờ duyệt chưa
          const { data: existing } = await supabase
            .from('friend_requests')
            .select('id')
            .eq('sender_bakery_id', get().bakeryId)
            .eq('receiver_bakery_id', cleanId)
            .eq('status', 'pending');

          if (existing && existing.length > 0) {
            return { success: false, error: 'Bạn đã gửi lời mời trước đó, vui lòng chờ đối phương đồng ý!' };
          }

          // Tạo lời mời mới
          const { error } = await supabase.from('friend_requests').insert({
            sender_bakery_id: get().bakeryId,
            sender_bakery_name: get().bakeryName,
            sender_player_name: get().playerName,
            sender_avatar_id: get().avatarId,
            receiver_bakery_id: cleanId,
            status: 'pending'
          });

          if (error) throw error;
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message || 'Lỗi gửi lời mời kết bạn' };
        }
      },

      // 2. TẢI CÁC LỜI MỜI KẾT BẠN ĐƯỢC GỬI ĐẾN TIỆM MÌNH
      fetchFriendRequests: async () => {
        try {
          const { data, error } = await supabase
            .from('friend_requests')
            .select('*')
            .eq('receiver_bakery_id', get().bakeryId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

          if (!error && data) {
            const list: FriendRequestItem[] = data.map((row: any) => ({
              id: row.id,
              senderBakeryId: row.sender_bakery_id,
              senderBakeryName: row.sender_bakery_name,
              senderPlayerName: row.sender_player_name,
              senderAvatarId: row.sender_avatar_id,
              receiverBakeryId: row.receiver_bakery_id,
              status: row.status,
              createdAt: row.created_at,
            }));
            set({ incomingRequests: list });
          }
        } catch (e) {
          console.warn('Lỗi lấy danh sách lời mời kết bạn:', e);
        }
      },

      // 3. ĐỒNG Ý HOẶC TỪ CHỐI LỜI MỜI KẾT BẠN
      respondFriendRequest: async (requestId: string, accept: boolean) => {
        const req = get().incomingRequests.find(r => r.id === requestId);
        if (!req) return { success: false, error: 'Không tìm thấy lời mời' };

        try {
          const newStatus = accept ? 'accepted' : 'declined';
          const { error } = await supabase
            .from('friend_requests')
            .update({ status: newStatus })
            .eq('id', requestId);

          if (error) throw error;

          if (accept) {
            // Thêm đối phương vào danh bạ bạn bè của mình
            const newFriend: FriendEntry = {
              bakeryId: req.senderBakeryId,
              bakeryName: req.senderBakeryName,
              playerName: req.senderPlayerName,
              avatarId: req.senderAvatarId,
              addedAt: Date.now(),
            };

            set(state => ({
              friends: [newFriend, ...state.friends.filter(f => f.bakeryId !== newFriend.bakeryId)],
              incomingRequests: state.incomingRequests.filter(r => r.id !== requestId),
              hasUnsavedChanges: true,
            }));

            get().addToast({
              title: 'Kết Bạn Thành Công! 🎉',
              message: `Đã trở thành bạn bè với tiệm ${req.senderBakeryName}`,
              amount: 0,
              type: 'sale'
            });
          } else {
            set(state => ({
              incomingRequests: state.incomingRequests.filter(r => r.id !== requestId),
            }));
          }

          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message || 'Lỗi phản hồi lời mời' };
        }
      },

      removeFriend: (bakeryId: string) => {
        set(state => ({
          friends: state.friends.filter(f => f.bakeryId !== bakeryId),
          hasUnsavedChanges: true,
        }));
      },

      toggleDeliveryReservation: (enabled) => {
        set((state) => ({
          isReservingDelivery: enabled !== undefined ? enabled : !state.isReservingDelivery,
          hasUnsavedChanges: true,
        }));
      },

      updatePetConfig: (config) => {
        set((state) => ({
          petConfig: { ...state.petConfig, ...config },
          hasUnsavedChanges: true,
        }));
      },

      addToast: (toast) => {
        const id = Date.now().toString() + Math.random();
        set((state) => ({
          toasts: [...state.toasts.slice(-4), { ...toast, id }]
        }));
        setTimeout(() => {
          get().removeToast(id);
        }, 3500);
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter(t => t.id !== id)
        }));
      },

      buyIngredient: (ingredientId, quantity) => {
        const item = get().ingredients[ingredientId];
        if (!item) return false;
        const totalCost = item.buyPrice * quantity;
        if (get().cash < totalCost) return false;

        set((state) => ({
          cash: state.cash - totalCost,
          hasUnsavedChanges: true,
          ingredientInventory: {
            ...state.ingredientInventory,
            [ingredientId]: (state.ingredientInventory[ingredientId] || 0) + quantity
          }
        }));

        if (get().tutorialStep === 1) get().setTutorialStep(2);
        return true;
      },

      startBaking: (recipeId) => {
        const recipe = get().recipes[recipeId];
        if (!recipe) return false;

        const maxSlots = get().level >= 5 ? 4 : get().level >= 3 ? 3 : 2;
        if (get().bakingSlots.length >= maxSlots) return false;

        const inv = get().ingredientInventory;
        for (const [ingId, reqQty] of Object.entries(recipe.requiredIngredients)) {
          if ((inv[ingId] || 0) < reqQty) return false;
        }

        const nextInv = { ...inv };
        for (const [ingId, reqQty] of Object.entries(recipe.requiredIngredients)) {
          nextInv[ingId] -= reqQty;
        }

        const newSlot: ActiveBakingSlot = {
          slotId: Date.now() + Math.random(),
          recipeId,
          startedAt: Date.now(),
          durationMs: recipe.bakingTimeSeconds * 1000,
          isReady: false
        };

        set({
          hasUnsavedChanges: true,
          ingredientInventory: nextInv,
          bakingSlots: [...get().bakingSlots, newSlot]
        });

        if (get().tutorialStep === 2) get().setTutorialStep(3);
        return true;
      },

      claimBakedItem: (slotId) => {
        const slot = get().bakingSlots.find((s) => s.slotId === slotId);
        if (!slot || !slot.isReady) return;

        const recipe = get().recipes[slot.recipeId];
        const defaultPrice = recipe ? recipe.baseFairPrice : 50;

        const currentShowcase = get().showcaseInventory[slot.recipeId] || {
          quantity: 0,
          sellingPrice: defaultPrice
        };

        const nextExp = get().exp + (recipe?.expReward || 10);
        let nextLevel = get().level;
        let reqExp = getRequiredExpForLevel(nextLevel);

        while (nextExp >= reqExp) {
          nextLevel += 1;
          reqExp = getRequiredExpForLevel(nextLevel);
        }

        set({
          exp: nextExp,
          level: nextLevel,
          hasUnsavedChanges: true,
          bakingSlots: get().bakingSlots.filter((s) => s.slotId !== slotId),
          showcaseInventory: {
            ...get().showcaseInventory,
            [slot.recipeId]: {
              ...currentShowcase,
              quantity: currentShowcase.quantity + 1
            }
          }
        });

        if (get().tutorialStep === 3) get().setTutorialStep(4);
      },

      setShowcasePrice: (recipeId, price) => {
        const current = get().showcaseInventory[recipeId];
        if (!current) return;
        set({
          hasUnsavedChanges: true,
          showcaseInventory: {
            ...get().showcaseInventory,
            [recipeId]: { ...current, sellingPrice: Math.max(1, price) }
          }
        });

        if (get().tutorialStep === 4) get().setTutorialStep(5);
      },

      tickCounterCustomers: (deltaMs) => {
        const current = get().counterCustomers;
        const updated: CounterCustomer[] = [];

        for (const cust of current) {
          const nextRemaining = cust.patienceRemainingMs - deltaMs;
          if (nextRemaining <= 0) {
            get().addToast({
              title: 'Khách Rời Đi!',
              message: `${cust.name} chờ quá lâu nên đã bỏ về 😿`,
              amount: 0,
              type: 'sale'
            });
          } else {
            updated.push({ ...cust, patienceRemainingMs: nextRemaining });
          }
        }

        const now = Date.now();
        if (get().isOpen && now >= get().nextCustomerWaveTime) {
          const maxCapacity = get().level >= 3 ? 3 : 2;
          
          if (updated.length < maxCapacity) {
            const eligibleRecipes = Object.values(get().recipes).filter(r => r.requiredLevel <= get().level);
            if (eligibleRecipes.length > 0) {
              const pickedRecipe = eligibleRecipes[Math.floor(Math.random() * eligibleRecipes.length)];
              const customerNames = ['Bé Thỏ Bông', 'Bác Gấu Nâu', 'Cô Mèo Vàng', 'Tiểu Thư Mây', 'Cậu Cún Shiba'];
              const avatars = ['Smile', 'Heart', 'Cat', 'Sparkles', 'Coffee'];
              const randomIndex = Math.floor(Math.random() * customerNames.length);

              const newCust: CounterCustomer = {
                id: Date.now().toString() + Math.random(),
                name: customerNames[randomIndex],
                avatarIcon: avatars[randomIndex],
                requestedRecipeId: pickedRecipe.id,
                requestedQuantity: Math.random() > 0.6 ? 2 : 1,
                patienceTotalMs: 45000,
                patienceRemainingMs: 45000,
                tipBonusRatio: 0.25,
              };

              updated.push(newCust);

              get().addToast({
                title: 'Đợt Khách Mới Ghé Tiệm! 🔔',
                message: `${newCust.name} vừa bước vào quầy gọi món.`,
                amount: 0,
                type: 'sale'
              });
            }
          }

          set({ nextCustomerWaveTime: now + getRandomWaveInterval() });
        }

        set({ counterCustomers: updated });
      },

      serveCounterCustomer: (customerId) => {
        const cust = get().counterCustomers.find(c => c.id === customerId);
        if (!cust) return false;

        const showcase = get().showcaseInventory[cust.requestedRecipeId];
        const recipe = get().recipes[cust.requestedRecipeId];
        if (!showcase || !recipe) return false;

        const reservedCount = get().isReservingDelivery
          ? get().deliveryOrders.filter(o => o.status === 'idle').reduce((acc, o) => acc + (o.requiredItems[cust.requestedRecipeId] || 0), 0)
          : 0;
        
        const available = showcase.quantity - reservedCount;
        if (available < cust.requestedQuantity) return false;

        const isQuickServe = cust.patienceRemainingMs > (cust.patienceTotalMs * 0.5);
        const baseCash = showcase.sellingPrice * cust.requestedQuantity;
        const tipCash = isQuickServe ? Math.floor(baseCash * cust.tipBonusRatio) : 0;
        const totalCash = baseCash + tipCash;

        set((state) => ({
          cash: state.cash + totalCash,
          hearts: state.hearts + (isQuickServe ? 3 : 1),
          hasUnsavedChanges: true,
          counterCustomers: state.counterCustomers.filter(c => c.id !== customerId),
          showcaseInventory: {
            ...state.showcaseInventory,
            [cust.requestedRecipeId]: {
              ...showcase,
              quantity: showcase.quantity - cust.requestedQuantity
            }
          }
        }));

        get().addToast({
          title: 'Đã Phục Vụ Xong!',
          message: `${cust.name} nhận ${cust.requestedQuantity}x ${recipe.name}`,
          amount: totalCash,
          type: tipCash > 0 ? 'tip' : 'sale'
        });

        return true;
      },

      dismissCounterCustomer: (customerId) => {
        set((state) => ({
          counterCustomers: state.counterCustomers.filter(c => c.id !== customerId)
        }));
      },

      startDelivery: (orderId) => {
        const order = get().deliveryOrders.find((o) => o.id === orderId);
        if (!order || order.status !== 'idle') return false;

        const showcase = get().showcaseInventory;
        for (const [recipeId, qty] of Object.entries(order.requiredItems)) {
          if (!showcase[recipeId] || showcase[recipeId].quantity < qty) return false;
        }

        const nextShowcase = { ...showcase };
        for (const [recipeId, qty] of Object.entries(order.requiredItems)) {
          nextShowcase[recipeId] = {
            ...nextShowcase[recipeId],
            quantity: nextShowcase[recipeId].quantity - qty
          };
        }

        set({
          hasUnsavedChanges: true,
          showcaseInventory: nextShowcase,
          deliveryOrders: get().deliveryOrders.map((o) =>
            o.id === orderId ? { ...o, status: 'delivering', startedAt: Date.now() } : o
          )
        });
        return true;
      },

      claimDeliveryReward: (orderId) => {
        const order = get().deliveryOrders.find((o) => o.id === orderId);
        if (!order || order.status !== 'completed') return;

        const nextExp = get().exp + order.rewardExp;
        let nextLevel = get().level;
        let reqExp = getRequiredExpForLevel(nextLevel);
        while (nextExp >= reqExp) {
          nextLevel += 1;
          reqExp = getRequiredExpForLevel(nextLevel);
        }

        set({
          cash: get().cash + order.rewardCash,
          hearts: get().hearts + order.rewardHearts,
          exp: nextExp,
          level: nextLevel,
          hasUnsavedChanges: true,
          deliveryOrders: get().deliveryOrders.map((o) =>
            o.id === orderId ? { ...o, status: 'idle', startedAt: undefined } : o
          )
        });
      },

      tickBakingAndDelivery: (deltaMs) => {
        const now = Date.now();

        const updatedSlots = get().bakingSlots.map((slot) => {
          if (!slot.isReady && now - slot.startedAt >= slot.durationMs) {
            return { ...slot, isReady: true };
          }
          return slot;
        });

        const updatedOrders = get().deliveryOrders.map((order) => {
          if (
            order.status === 'delivering' &&
            order.startedAt &&
            now - order.startedAt >= order.deliveryTimeSeconds * 1000
          ) {
            return { ...order, status: 'completed' as const };
          }
          return order;
        });

        get().tickCounterCustomers(deltaMs);

        set({ bakingSlots: updatedSlots, deliveryOrders: updatedOrders });
      },

      tickCustomerAI: () => {
        if (!get().isOpen) return;

        const reservedByDelivery: Record<string, number> = {};
        if (get().isReservingDelivery) {
          get().deliveryOrders.forEach((order) => {
            if (order.status === 'idle') {
              Object.entries(order.requiredItems).forEach(([recId, reqQty]) => {
                reservedByDelivery[recId] = (reservedByDelivery[recId] || 0) + reqQty;
              });
            }
          });
        }

        const availableItems = Object.entries(get().showcaseInventory).filter(
          ([recipeId, state]) => {
            const reserved = reservedByDelivery[recipeId] || 0;
            return state.quantity > reserved;
          }
        );

        if (availableItems.length === 0) return;

        const [recipeId, state] = availableItems[Math.floor(Math.random() * availableItems.length)];
        const recipe = get().recipes[recipeId];
        if (!recipe) return;

        const priceRatio = state.sellingPrice / recipe.baseFairPrice;
        let buyProbability = 0;
        let reaction: 'happy' | 'normal' | 'unhappy' = 'normal';
        let note = '';

        if (priceRatio <= 0.85) {
          buyProbability = 0.95;
          reaction = 'happy';
          note = 'Khen tiệm bán rẻ ngọt ngào!';
        } else if (priceRatio <= 1.15) {
          buyProbability = 0.70;
          reaction = 'normal';
          note = 'Bánh ngon, giá cả phải chăng.';
        } else if (priceRatio <= 1.4) {
          buyProbability = 0.35;
          reaction = 'normal';
          note = 'Hơi đắt một chút nhưng vẫn mua.';
        } else {
          buyProbability = 0.08;
          reaction = 'unhappy';
          note = 'Chê đắt và lắc đầu!';
        }

        if (Math.random() <= buyProbability) {
          const buyQty = 1;
          const revenue = state.sellingPrice * buyQty;
          const heartsEarned = reaction === 'happy' ? 2 : 1;

          set((s) => ({
            cash: s.cash + revenue,
            hearts: s.hearts + heartsEarned,
            hasUnsavedChanges: true,
            showcaseInventory: {
              ...s.showcaseInventory,
              [recipeId]: { ...state, quantity: state.quantity - buyQty }
            },
            customerBubble: {
              name: 'Khách Thị Trấn',
              text: `Đã mua 1 ${recipe.name}! (${note})`,
              reaction
            },
            salesLogs: [
              {
                id: Date.now().toString(),
                timestamp: Date.now(),
                customerName: 'Khách Thị Trấn',
                recipeName: recipe.name,
                quantity: buyQty,
                totalCash: revenue,
                reaction,
                note
              },
              ...s.salesLogs.slice(0, 19)
            ]
          }));

          get().addToast({
            title: 'Khách Mua Tại Kệ',
            message: `1x ${recipe.name} (${note})`,
            amount: revenue,
            type: 'sale'
          });

          if (get().tutorialStep === 5) get().setTutorialStep(99);
        }
      },

      checkAndTriggerAutoBackup: async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

        const now = Date.now();
        const FIVE_MINUTES_MS = 5 * 60 * 1000;
        if (now - get().lastBackupTimestamp >= FIVE_MINUTES_MS) {
          await get().createBackup();
        }
      },

      createBackup: async (customLabel) => {
        set({ isBackingUp: true });
        const now = Date.now();
        const dateStr = new Date(now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const label = customLabel || `Tự động sao lưu (${dateStr})`;

        const snapshotData: GameSaveData = {
          bakeryId: get().bakeryId,
          playerName: get().playerName,
          bakeryName: get().bakeryName,
          avatarId: get().avatarId,
          cash: get().cash,
          hearts: get().hearts,
          exp: get().exp,
          level: get().level,
          isOpen: get().isOpen,
          nextCustomerWaveTime: get().nextCustomerWaveTime,
          friends: get().friends,
          ingredientInventory: get().ingredientInventory,
          showcaseInventory: get().showcaseInventory,
          bakingSlots: get().bakingSlots,
          deliveryOrders: get().deliveryOrders,
          isReservingDelivery: get().isReservingDelivery,
          petConfig: get().petConfig,
          tutorialStep: get().tutorialStep,
          lastSavedTimestamp: now,
          lastBackupTimestamp: now,
          saveVersion: CURRENT_SAVE_VERSION,
        };

        const newEntry: SaveBackupEntry = {
          id: Date.now().toString(),
          createdAt: now,
          label,
          data: snapshotData,
        };

        const currentBackups = get().backupsList;
        const updatedLocal = [newEntry, ...currentBackups.filter(b => b.id !== newEntry.id)].slice(0, 5);
        saveLocalBackups(updatedLocal);

        const user = get().currentUser;
        if (user) {
          try {
            await supabase.from('game_save_backups').insert({
              user_id: user.id,
              backup_label: label,
              save_data: snapshotData,
            });
          } catch (err) {
            console.warn('Lỗi lưu backup Supabase, giữ local an toàn:', err);
          }
        }

        set({
          backupsList: updatedLocal,
          lastBackupTimestamp: now,
          isBackingUp: false,
        });

        return true;
      },

      loadBackupsList: async () => {
        const user = get().currentUser;
        if (!user) {
          set({ backupsList: getLocalBackups() });
          return;
        }

        try {
          const { data, error } = await supabase
            .from('game_save_backups')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

          if (!error && data && data.length > 0) {
            const cloudBackups: SaveBackupEntry[] = data.map((row: any) => ({
              id: row.id,
              createdAt: new Date(row.created_at).getTime(),
              label: row.backup_label,
              data: row.save_data,
            }));
            set({ backupsList: cloudBackups });
            saveLocalBackups(cloudBackups);
          } else {
            set({ backupsList: getLocalBackups() });
          }
        } catch {
          set({ backupsList: getLocalBackups() });
        }
      },

      restoreFromBackup: async (backupEntry) => {
        const migrated = migrateSaveData(backupEntry.data);
        set({
          ...migrated,
          hasUnsavedChanges: true,
          lastSavedTimestamp: Date.now(),
        });
        if (get().currentUser) {
          await get().syncToCloud();
        }
      },

      deleteBackup: async (backupId) => {
        const updatedLocal = get().backupsList.filter(b => b.id !== backupId);
        set({ backupsList: updatedLocal });
        saveLocalBackups(updatedLocal);

        const user = get().currentUser;
        if (user) {
          try {
            await supabase.from('game_save_backups').delete().eq('id', backupId);
          } catch (e) {
            console.warn('Lỗi xóa backup trên Supabase:', e);
          }
        }
      },

      // GỬI BƯU KIỆN CHỈ ĐỊNH QUA BAKERY ID CỦA BẠN BÈ
      sendCoopParcel: async (targetBakeryId, message, itemsToSend) => {
        const user = get().currentUser;
        if (!user) return { success: false, error: 'Bạn cần đăng nhập để gửi quà' };
        if (targetBakeryId === get().bakeryId) {
          return { success: false, error: 'Không thể tự gửi quà cho chính mình!' };
        }

        const currentIng = { ...get().ingredientInventory };
        const currentShowcase = { ...get().showcaseInventory };

        for (const [itemId, qty] of Object.entries(itemsToSend)) {
          if (qty <= 0) continue;
          if (currentIng[itemId] !== undefined) {
            if (currentIng[itemId] < qty) return { success: false, error: `Không đủ nguyên liệu ${itemId}` };
            currentIng[itemId] -= qty;
          } else if (currentShowcase[itemId] !== undefined) {
            if (currentShowcase[itemId].quantity < qty) return { success: false, error: `Không đủ bánh ${itemId}` };
            currentShowcase[itemId].quantity -= qty;
          }
        }

        try {
          const { error } = await supabase.from('coop_parcels').insert({
            sender_id: user.id,
            sender_bakery_name: get().bakeryName,
            receiver_bakery_id: targetBakeryId,
            message: message.trim() || 'Gửi bạn chút quà ngọt ngào!',
            items: itemsToSend,
            status: 'pending'
          });

          if (error) throw error;

          set({
            ingredientInventory: currentIng,
            showcaseInventory: currentShowcase,
            hasUnsavedChanges: true,
          });

          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || 'Lỗi gửi bưu kiện' };
        }
      },

      // TẢI BƯU KIỆN THEO BAKERY ID CỦA TIỆM
      fetchIncomingParcels: async () => {
        try {
          const { data, error } = await supabase
            .from('coop_parcels')
            .select('*')
            .eq('receiver_bakery_id', get().bakeryId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

          if (!error && data) {
            const list: CoopParcel[] = data.map((row: any) => ({
              id: row.id,
              senderBakeryName: row.sender_bakery_name,
              receiverBakeryId: row.receiver_bakery_id,
              message: row.message,
              items: row.items,
              status: row.status,
              createdAt: row.created_at,
            }));
            set({ incomingParcels: list });
          }
        } catch (e) {
          console.warn('Lỗi lấy bưu kiện:', e);
        }
      },

      claimCoopParcel: async (parcelId) => {
        const user = get().currentUser;
        if (!user) return { success: false, error: 'Chưa đăng nhập' };

        try {
          const { data: parcel, error: selectErr } = await supabase
            .from('coop_parcels')
            .select('*')
            .eq('id', parcelId)
            .single();

          if (selectErr || !parcel) throw new Error('Bưu kiện không tồn tại');
          if (parcel.status === 'claimed') throw new Error('Bưu kiện này đã nhận rồi');

          const { error: updateErr } = await supabase
            .from('coop_parcels')
            .update({ status: 'claimed' })
            .eq('id', parcelId);

          if (updateErr) throw updateErr;

          const receivedItems = parcel.items as Record<string, number>;
          const currentIng = { ...get().ingredientInventory };
          const currentShowcase = { ...get().showcaseInventory };

          for (const [itemId, qty] of Object.entries(receivedItems)) {
            if (get().ingredients[itemId]) {
              currentIng[itemId] = (currentIng[itemId] || 0) + qty;
            } else if (get().recipes[itemId]) {
              const base = currentShowcase[itemId] || { quantity: 0, sellingPrice: get().recipes[itemId].baseFairPrice };
              currentShowcase[itemId] = { ...base, quantity: base.quantity + qty };
            }
          }

          set((state) => ({
            ingredientInventory: currentIng,
            showcaseInventory: currentShowcase,
            incomingParcels: state.incomingParcels.filter(p => p.id !== parcelId),
            hasUnsavedChanges: true,
          }));

          get().addToast({
            title: 'Mở Bưu Kiện Thành Công! 🎁',
            message: `Nhận quà từ tiệm ${parcel.sender_bakery_name}`,
            amount: 0,
            type: 'parcel'
          });

          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || 'Không thể nhận quà' };
        }
      },

      resetToDefault: () => set({ ...DEFAULT_STATE, currentUser: get().currentUser, hasUnsavedChanges: false }),

      syncToCloud: async () => {
        const user = get().currentUser;
        if (!user) return { success: false, error: 'Chưa đăng nhập' };

        set({ isSyncing: true });
        try {
          const payload: GameSaveData = {
            bakeryId: get().bakeryId,
            playerName: get().playerName,
            bakeryName: get().bakeryName,
            avatarId: get().avatarId,
            cash: get().cash,
            hearts: get().hearts,
            exp: get().exp,
            level: get().level,
            isOpen: get().isOpen,
            nextCustomerWaveTime: get().nextCustomerWaveTime,
            friends: get().friends,
            ingredientInventory: get().ingredientInventory,
            showcaseInventory: get().showcaseInventory,
            bakingSlots: get().bakingSlots,
            deliveryOrders: get().deliveryOrders,
            isReservingDelivery: get().isReservingDelivery,
            petConfig: get().petConfig,
            tutorialStep: get().tutorialStep,
            lastSavedTimestamp: Date.now(),
            lastBackupTimestamp: get().lastBackupTimestamp,
            saveVersion: CURRENT_SAVE_VERSION,
          };

          const { error } = await supabase
            .from('game_saves')
            .upsert(
              {
                user_id: user.id,
                save_data: payload,
                save_version: CURRENT_SAVE_VERSION,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );

          if (error) throw error;
          
          await get().publishBakeryDirectory();

          set({ 
            isSyncing: false, 
            hasUnsavedChanges: false, 
            lastSavedTimestamp: payload.lastSavedTimestamp 
          });
          return { success: true };
        } catch (err: any) {
          set({ isSyncing: false });
          return { success: false, error: err.message };
        }
      },

      loadFromCloud: async () => {
        const user = get().currentUser;
        if (!user) return;

        set({ isSyncing: true });
        try {
          const { data, error } = await supabase
            .from('game_saves')
            .select('save_data')
            .eq('user_id', user.id)
            .single();

          if (data && data.save_data) {
            const migrated = migrateSaveData(data.save_data);
            set({ ...migrated, hasUnsavedChanges: false });
          }
          await get().publishBakeryDirectory();
          await get().loadBackupsList();
          await get().fetchIncomingParcels();
          await get().fetchFriendRequests();
        } finally {
          set({ isSyncing: false });
        }
      }
    }),
    {
      name: 'cozy_game_save_v7',
      migrate: (persistedState: any) => migrateSaveData(persistedState),
      partialize: (state) => ({
        bakeryId: state.bakeryId,
        playerName: state.playerName,
        bakeryName: state.bakeryName,
        avatarId: state.avatarId,
        cash: state.cash,
        hearts: state.hearts,
        exp: state.exp,
        level: state.level,
        isOpen: state.isOpen,
        nextCustomerWaveTime: state.nextCustomerWaveTime,
        friends: state.friends,
        ingredientInventory: state.ingredientInventory,
        showcaseInventory: state.showcaseInventory,
        bakingSlots: state.bakingSlots,
        deliveryOrders: state.deliveryOrders,
        isReservingDelivery: state.isReservingDelivery,
        petConfig: state.petConfig,
        tutorialStep: state.tutorialStep,
        lastSavedTimestamp: state.lastSavedTimestamp,
        lastBackupTimestamp: state.lastBackupTimestamp,
        saveVersion: state.saveVersion,
      }),
    }
  )
);