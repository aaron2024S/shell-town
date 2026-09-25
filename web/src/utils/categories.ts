export interface ProductCategory {
  key: string;
  label: string;
  color: string;
}

// 8 个分类，选择器里排两行（每行 4 个）
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { key: 'snack', label: '零食', color: '#ff9bb0' },
  { key: 'toy', label: '玩具', color: '#84c5ff' },
  { key: 'activity', label: '活动', color: '#ffb454' },
  { key: 'game', label: '游戏', color: '#7ed4b9' },
  { key: 'study', label: '学习', color: '#b39ddb' },
  { key: 'privilege', label: '特权', color: '#ffd166' },
  { key: 'food', label: '美食', color: '#ffab91' },
  { key: 'gift', label: '其他', color: '#e8b4c8' },
];

export function getCategory(key?: string | null): ProductCategory {
  return (
    ALL_CATEGORIES.find((c) => c.key === key) ??
    PRODUCT_CATEGORIES[PRODUCT_CATEGORIES.length - 1]
  );
}

// 宠物道具专用图标（商品类型 = 宠物道具时使用，与服务端 PRODUCT_ICONS 对应）
export const PET_ITEM_CATEGORIES: ProductCategory[] = [
  { key: 'petfood', label: '口粮', color: '#ffb454' },
  { key: 'pettoy', label: '玩具', color: '#84c5ff' },
  { key: 'petcare', label: '护理', color: '#7ed4b9' },
  { key: 'petexp', label: '经验', color: '#ffd166' },
];

export const ALL_CATEGORIES: ProductCategory[] = [
  ...PRODUCT_CATEGORIES,
  ...PET_ITEM_CATEGORIES,
];

/** 宠物道具图标 key 集合（用于判断商品图标归属） */
export const PET_ICON_KEYS = PET_ITEM_CATEGORIES.map((c) => c.key);
