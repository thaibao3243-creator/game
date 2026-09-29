import { supabase } from './supabase';
import { IngredientItem, RecipeItem, DeliveryOrder } from '../types/game';
import { 
  MASTER_INGREDIENTS, 
  MASTER_RECIPES, 
  INITIAL_DELIVERY_ORDERS 
} from '../constants/gameData';

export const fetchRemoteMasterData = async (): Promise<{
  ingredients: Record<string, IngredientItem>;
  recipes: Record<string, RecipeItem>;
  deliveryOrders: DeliveryOrder[];
}> => {
  try {
    // Gọi song song 3 bảng để đạt tốc độ tối đa
    const [ingRes, recRes, ordRes] = await Promise.all([
      supabase.from('master_ingredients').select('*').eq('is_active', true),
      supabase.from('master_recipes').select('*').eq('is_active', true),
      supabase.from('master_delivery_orders').select('*').eq('is_active', true),
    ]);

    // Chuyển đổi Ingredients
    const ingredients: Record<string, IngredientItem> = { ...MASTER_INGREDIENTS };
    if (ingRes.data && ingRes.data.length > 0) {
      ingRes.data.forEach((row: any) => {
        ingredients[row.id] = {
          id: row.id,
          name: row.name,
          description: row.description,
          buyPrice: row.buy_price,
          rarity: row.rarity,
          asset: row.asset,
        };
      });
    }

    // Chuyển đổi Recipes
    const recipes: Record<string, RecipeItem> = { ...MASTER_RECIPES };
    if (recRes.data && recRes.data.length > 0) {
      recRes.data.forEach((row: any) => {
        recipes[row.id] = {
          id: row.id,
          name: row.name,
          description: row.description,
          requiredLevel: row.required_level,
          bakingTimeSeconds: row.baking_time_seconds,
          baseFairPrice: row.base_fair_price,
          expReward: row.exp_reward,
          requiredIngredients: row.required_ingredients,
          rarity: row.rarity,
          asset: row.asset,
        };
      });
    }

    // Chuyển đổi Delivery Orders
    let deliveryOrders: DeliveryOrder[] = [...INITIAL_DELIVERY_ORDERS];
    if (ordRes.data && ordRes.data.length > 0) {
      deliveryOrders = ordRes.data.map((row: any) => ({
        id: row.id,
        customerName: row.customer_name,
        customerAvatar: row.customer_avatar,
        destination: row.destination,
        requiredItems: row.required_items,
        rewardCash: row.reward_cash,
        rewardExp: row.reward_exp,
        rewardHearts: row.reward_hearts,
        deliveryTimeSeconds: row.delivery_time_seconds,
        status: 'idle',
      }));
    }

    return { ingredients, recipes, deliveryOrders };
  } catch (error) {
    console.warn('Không thể nạp Master Data từ Supabase, chuyển sang Fallback Local:', error);
    return {
      ingredients: MASTER_INGREDIENTS,
      recipes: MASTER_RECIPES,
      deliveryOrders: INITIAL_DELIVERY_ORDERS,
    };
  }
};