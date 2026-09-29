import { MasterItem } from '../types/game';

export const MASTER_ITEMS: Record<string, MasterItem> = {
  raw_wood: {
    id: 'raw_wood',
    name: 'Gỗ Thô',
    description: 'Nguyên liệu cơ bản thu hoạch từ rừng.',
    rarity: 'common',
    basePrice: 5,
    asset: { type: 'image', src: '/assets/items/raw-wood.svg' }
  },
  iron_plate: {
    id: 'iron_plate',
    name: 'Tấm Thép',
    description: 'Vật liệu chế tạo trung cấp.',
    rarity: 'uncommon',
    basePrice: 25,
    asset: { type: 'image', src: '/assets/items/iron-plate.svg' }
  },
  ai_core: {
    id: 'ai_core',
    name: 'Lõi Vi Xử Lý AI',
    description: 'Linh kiện công nghệ cao giá trị cực lớn.',
    rarity: 'legendary',
    basePrice: 5000,
    asset: { type: 'lucide', iconName: 'Cpu' } // Dùng icon CPU của Lucide
  }
};