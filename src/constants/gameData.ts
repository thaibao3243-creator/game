import { IngredientItem, RecipeItem, DeliveryOrder, PRESET_AVATARS } from '../types/game';

export { PRESET_AVATARS };

export const MASTER_INGREDIENTS: Record<string, IngredientItem> = {
  flour: {
    id: 'flour',
    name: 'Bột Mì Thượng Hạng',
    description: 'Bột lúa mì mịn dùng làm đế bánh mềm xốp.',
    buyPrice: 8,
    rarity: 'common',
    asset: { type: 'image', src: '/assets/ingredients/flour.webp', alt: 'Bột mì' }
  },
  sugar: {
    id: 'sugar',
    name: 'Đường Tinh Luyện',
    description: 'Tạo độ ngọt thanh mát cho mọi món bánh.',
    buyPrice: 5,
    rarity: 'common',
    asset: { type: 'lucide', iconName: 'Sparkles' }
  },
  butter: {
    id: 'butter',
    name: 'Bơ Lạt Nhập Khẩu',
    description: 'Dậy mùi thơm ngậy đặc trưng của bánh nướng.',
    buyPrice: 15,
    rarity: 'uncommon',
    asset: { type: 'lucide', iconName: 'Box' }
  },
  egg: {
    id: 'egg',
    name: 'Trứng Gà Nông Trại',
    description: 'Trứng gà tươi sạch giàu dinh dưỡng.',
    buyPrice: 10,
    rarity: 'common',
    asset: { type: 'lucide', iconName: 'Egg' }
  },
  strawberry: {
    id: 'strawberry',
    name: 'Dâu Tây Đà Lạt',
    description: 'Dâu quả mọng đỏ au chua ngọt tự nhiên.',
    buyPrice: 25,
    rarity: 'rare',
    asset: { type: 'image', src: '/assets/ingredients/strawberry.webp', alt: 'Dâu tây' }
  },
  matcha: {
    id: 'matcha',
    name: 'Bột Matcha Uji',
    description: 'Bột trà xanh cao cấp với hương thơm dịu nhẹ.',
    buyPrice: 35,
    rarity: 'rare',
    asset: { type: 'lucide', iconName: 'Leaf' }
  },
  chocolate: {
    id: 'chocolate',
    name: 'Socola Bỉ 75%',
    description: 'Socola nguyên chất vị đắng ngọt đậm đà.',
    buyPrice: 45,
    rarity: 'epic',
    asset: { type: 'lucide', iconName: 'Coffee' }
  }
};

export const MASTER_RECIPES: Record<string, RecipeItem> = {
  butter_cookie: {
    id: 'butter_cookie',
    name: 'Bánh Quy Bơ Thơm',
    description: 'Từng miếng bánh giòn tan thơm lừng vị bơ béo ngậy.',
    requiredLevel: 1,
    bakingTimeSeconds: 5,
    baseFairPrice: 28,
    expReward: 15,
    requiredIngredients: { flour: 1, butter: 1 },
    rarity: 'common',
    asset: { type: 'image', src: '/assets/bakery/butter-cookie.webp', alt: 'Bánh quy' }
  },
  strawberry_cupcake: {
    id: 'strawberry_cupcake',
    name: 'Cupcake Dâu Ngọt',
    description: 'Bánh bông lan mini phủ kem tươi cùng trái dâu đỏ mọng.',
    requiredLevel: 1,
    bakingTimeSeconds: 8,
    baseFairPrice: 55,
    expReward: 25,
    requiredIngredients: { flour: 1, egg: 1, strawberry: 1 },
    rarity: 'uncommon',
    asset: { type: 'image', src: '/assets/bakery/cupcake.webp', alt: 'Cupcake' }
  },
  matcha_latte: {
    id: 'matcha_latte',
    name: 'Trà Sữa Matcha Bơ',
    description: 'Ly latte thơm lừng hương trà hòa quyện cùng sữa béo.',
    requiredLevel: 2,
    bakingTimeSeconds: 12,
    baseFairPrice: 75,
    expReward: 40,
    requiredIngredients: { sugar: 1, matcha: 1 },
    rarity: 'rare',
    asset: { type: 'image', src: '/assets/bakery/matcha-latte.webp', alt: 'Matcha Latte' }
  },
  choco_croissant: {
    id: 'choco_croissant',
    name: 'Bánh Sừng Bò Socola',
    description: 'Bánh sừng bò ngàn lớp nhân socola tan chảy.',
    requiredLevel: 3,
    bakingTimeSeconds: 20,
    baseFairPrice: 120,
    expReward: 65,
    requiredIngredients: { flour: 2, butter: 1, chocolate: 1 },
    rarity: 'rare',
    asset: { type: 'image', src: '/assets/bakery/croissant.webp', alt: 'Croissant' }
  },
  royal_cake: {
    id: 'royal_cake',
    name: 'Bánh Kem Hoàng Gia',
    description: 'Bánh tiệc sinh nhật sang trọng dát vàng lộng lẫy.',
    requiredLevel: 5,
    bakingTimeSeconds: 35,
    baseFairPrice: 280,
    expReward: 150,
    requiredIngredients: { flour: 2, egg: 2, strawberry: 2, chocolate: 1 },
    rarity: 'legendary',
    asset: { type: 'image', src: '/assets/bakery/royal-cake.webp', alt: 'Bánh hoàng gia' }
  }
};

export const INITIAL_DELIVERY_ORDERS: DeliveryOrder[] = [
  {
    id: 'order_1',
    customerName: 'Cô Y Tá Mây',
    customerAvatar: 'Heart',
    destination: 'Bệnh Viện Thỏ Trắng',
    requiredItems: { butter_cookie: 2 },
    rewardCash: 80,
    rewardExp: 35,
    rewardHearts: 3,
    deliveryTimeSeconds: 15,
    status: 'idle'
  },
  {
    id: 'order_2',
    customerName: 'Bác Gấu Làm Vườn',
    customerAvatar: 'Leaf',
    destination: 'Vườn Ươm Cầu Vồng',
    requiredItems: { strawberry_cupcake: 1, butter_cookie: 1 },
    rewardCash: 120,
    rewardExp: 50,
    rewardHearts: 5,
    deliveryTimeSeconds: 25,
    status: 'idle'
  }
];

export const getRequiredExpForLevel = (lvl: number): number => {
  return Math.floor(80 * Math.pow(1.35, lvl - 1));
};