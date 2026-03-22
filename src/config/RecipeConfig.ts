import type { BuildingType, ResourceType } from './BuildingConfig';

/** 单个生产变体（一套输入→输出） */
export interface RecipeVariant {
  inputs:  Partial<Record<ResourceType, number>>;
  outputs: Partial<Record<ResourceType, number>>;
}

/**
 * 建筑配方定义
 *
 * 所有产物统一走传送带。子弹等批量产品以单个 BeltItem（携带 qty）
 * 在传送带上流动，到达弹药箱格时由 ConveyorSystem 自动存入。
 */
export interface RecipeDef {
  buildingType: BuildingType;
  variants:     RecipeVariant[];
  cycleTime:    number;          // 生产周期（秒）
  accepts:      ResourceType[];  // 传送带可推入的原料类型
}

/** 所有配方列表 */
export const RECIPES: RecipeDef[] = [
  {
    buildingType: 'furnace',
    // 熔炉支持两种矿→板，每次交替选一种
    variants: [
      { inputs: { iron_ore: 1 },   outputs: { iron_plate: 1 } },
      { inputs: { copper_ore: 1 }, outputs: { copper_plate: 1 } },
    ],
    cycleTime: 2,
    accepts: ['iron_ore', 'copper_ore'],
  },
  {
    buildingType: 'assembler',
    variants: [
      { inputs: { iron_plate: 1, copper_plate: 1 }, outputs: { bullet: 5 } },
    ],
    cycleTime: 1,
    accepts: ['iron_plate', 'copper_plate'],
  },
];

/** 快速查找：buildingType → RecipeDef */
export const RECIPE_MAP = new Map<BuildingType, RecipeDef>(
  RECIPES.map(r => [r.buildingType, r]),
);
