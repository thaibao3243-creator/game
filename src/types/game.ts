export type RarityType = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type AssetSource = 
  | { type: 'image'; src: string; alt?: string }
  | { type: 'lucide'; iconName: string };

// Bổ sung MasterItem để tương thích ngược cho các file constants cũ
export interface MasterItem {
  id: string;
  name: string;
  description: string;
  rarity: RarityType;
  basePrice: number;
  asset: AssetSource;
}

export interface IngredientItem {
  id: string;
  name: string;
  description: string;
  buyPrice: number;
  rarity: RarityType;
  asset: AssetSource;
}

export interface RecipeItem {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  bakingTimeSeconds: number;
  baseFairPrice: number;
  expReward: number;
  requiredIngredients: Record<string, number>;
  rarity: RarityType;
  asset: AssetSource;
}

export interface ActiveBakingSlot {
  slotId: number;
  recipeId: string;
  startedAt: number;
  durationMs: number;
  isReady: boolean;
}

export interface ShowcaseItemState {
  quantity: number;
  sellingPrice: number;
}

export interface DeliveryOrder {
  id: string;
  customerName: string;
  customerAvatar: string;
  destination: string;
  requiredItems: Record<string, number>;
  rewardCash: number;
  rewardExp: number;
  rewardHearts: number;
  deliveryTimeSeconds: number;
  status: 'idle' | 'delivering' | 'completed';
  startedAt?: number;
}

export interface CustomerSaleLog {
  id: string;
  timestamp: number;
  customerName: string;
  recipeName: string;
  quantity: number;
  totalCash: number;
  reaction: 'happy' | 'normal' | 'unhappy';
  note: string;
}

export interface PresetAvatar {
  id: string;
  name: string;
  iconName: string;
  bgColor: string;
  textColor: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 'cat', name: 'Mèo Múp', iconName: 'Smile', bgColor: 'bg-amber-100', textColor: 'text-amber-600' },
  { id: 'rabbit', name: 'Thỏ Bông', iconName: 'Heart', bgColor: 'bg-rose-100', textColor: 'text-rose-500' },
  { id: 'chef', name: 'Bếp Trưởng', iconName: 'UtensilsCrossed', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600' },
  { id: 'sparkle', name: 'Tiên Bánh', iconName: 'Sparkles', bgColor: 'bg-purple-100', textColor: 'text-purple-500' },
  { id: 'cake', name: 'Bánh Ngọt', iconName: 'Cake', bgColor: 'bg-pink-100', textColor: 'text-pink-500' },
  { id: 'crown', name: 'Tiểu Thư', iconName: 'Crown', bgColor: 'bg-yellow-100', textColor: 'text-yellow-600' },
];

export interface SaveBackupEntry {
  id: string;
  createdAt: number;
  label: string;
  data: GameSaveData;
}

export interface CounterCustomer {
  id: string;
  name: string;
  avatarIcon: string;
  requestedRecipeId: string;
  requestedQuantity: number;
  patienceTotalMs: number;
  patienceRemainingMs: number;
  tipBonusRatio: number;
}

export type PetSpecies = 'cat' | 'dog' | 'rabbit' | 'bear';
export type PetAccessory = 'none' | 'chef_hat' | 'ribbon' | 'crown' | 'glasses';

export interface PetConfig {
  species: PetSpecies;
  accessory: PetAccessory;
  isHidden: boolean;
  moodText: string;
}

export interface CoopParcel {
  id: string;
  senderBakeryName: string;
  receiverBakeryId: string;
  message: string;
  items: Record<string, number>;
  status: 'pending' | 'claimed';
  createdAt: string;
}

export interface SalesToastItem {
  id: string;
  title: string;
  message: string;
  amount: number;
  type: 'sale' | 'tip' | 'parcel';
}

export interface FriendEntry {
  bakeryId: string;
  bakeryName: string;
  playerName: string;
  avatarId: string;
  addedAt: number;
}

export interface FriendRequestItem {
  id: string;
  senderBakeryId: string;
  senderBakeryName: string;
  senderPlayerName: string;
  senderAvatarId: string;
  receiverBakeryId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface GameSaveData {
  bakeryId: string;
  playerName: string;
  bakeryName: string;
  avatarId: string;
  cash: number;
  hearts: number;
  exp: number;
  level: number;
  isOpen: boolean;
  nextCustomerWaveTime: number;
  friends: FriendEntry[];
  ingredientInventory: Record<string, number>;
  showcaseInventory: Record<string, ShowcaseItemState>;
  bakingSlots: ActiveBakingSlot[];
  deliveryOrders: DeliveryOrder[];
  isReservingDelivery: boolean;
  petConfig: PetConfig;
  tutorialStep: number;
  lastSavedTimestamp: number;
  lastBackupTimestamp: number;
  saveVersion: number;
}