import type { BuildingType, ResourceType } from './BuildingConfig';

/** 单个生产变体（一套输入→输出） */
export interface RecipeVariant {
  inputs:  Partial<Record<ResourceType, number>>;
  outputs: Partial<Record<ResourceType, number>>;
}

/** 输出模式 */
export type OutputMode =
  | 'belt'  // 产物推入输出方向传送带，堵塞则等待
  | 'ammo'  // 产物直接写入相邻弹药箱（仅子弹）
  | 'both'; // 先尝试传送带，不通再写弹药箱

/** 建筑配方定义 */
export interface RecipeDef {
  buildingType: BuildingType;
  variants:     RecipeVariant[];
  outputMode:   OutputMode;
  cycleTime:    number;            // 生产周期（秒）
  accepts:      ResourceType[];    // 传送带可推入的原料类型
}

/** 所有配方列表 */
export const RECIPES: RecipeDef[] = [
  {
    buildingType: 'furnace',
    variants: [
      { inputs: { iron_ore: 1 },   outputs: { iron_plate: 1 } },
      { inputs: { copper_ore: 1 }, outputs: { copper_plate: 1 } },
    ],
    outputMode: 'belt',
    cycleTime:  2,
    accepts: ['iron_ore', 'copper_ore'],
  },
  {
    buildingType: 'assembler',
    variants: [
      { inputs: { iron_plate: 1, copper_plate: 1 }, outputs: { bullet: 5 } },
    ],
    outputMode: 'both',  // 先传送带，再弹药箱
    cycleTime:  1,
    accepts: ['iron_plate', 'copper_plate'],
  },
];

/** 快速查找：buildingType → RecipeDef */
export const RECIPE_MAP = new Map<BuildingType, RecipeDef>(
  RECIPES.map(r => [r.buildingType, r]),
);
