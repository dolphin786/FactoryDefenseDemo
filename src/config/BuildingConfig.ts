export type BuildingType =
  | 'iron_ore_node'
  | 'copper_ore_node'
  | 'furnace'
  | 'assembler'
  | 'gun_tower'
  | 'wall'
  | 'ammo_box'
  | 'conveyor'
  | 'core';

export interface BuildingCfg {
  hp: number;
  emoji: string;
  color: number;  // Phaser hex color
  name: string;
  desc: string;
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingCfg> = {
  iron_ore_node:   { hp: 999, emoji: '⛏️', color: 0x6D4C41, name: '铁矿',   desc: '1铁矿/秒' },
  copper_ore_node: { hp: 999, emoji: '🪨', color: 0xAD6922, name: '铜矿',   desc: '1铜矿/秒' },
  furnace:         { hp: 80,  emoji: '🔥', color: 0xC0392B, name: '熔炉',   desc: '矿→板 2s' },
  assembler:       { hp: 80,  emoji: '⚙️', color: 0x2471A3, name: '组装机', desc: '板→子弹×5 1s' },
  gun_tower:       { hp: 50,  emoji: '🔫', color: 0x922B21, name: '机枪塔', desc: '射程3，1发/s' },
  wall:            { hp: 100, emoji: '🧱', color: 0x707B7C, name: '围墙',   desc: 'HP:100' },
  ammo_box:        { hp: 60,  emoji: '📦', color: 0xD4AC0D, name: '弹药箱', desc: '存弹50发' },
  conveyor:        { hp: 999, emoji: '→',  color: 0x4A5568, name: '传送带', desc: '运输资源' },
  core:            { hp: 200, emoji: '💎', color: 0xE67E22, name: '核心',   desc: '守护目标' },
};

/** 有输出方向的建筑类型（矿节点/熔炉/组装机/传送带） */
export const HAS_OUTPUT_DIR: BuildingType[] = [
  'iron_ore_node', 'copper_ore_node', 'furnace', 'assembler', 'conveyor',
];

/** 资源类型 */
export type ResourceType = 'iron_ore' | 'copper_ore' | 'iron_plate' | 'copper_plate' | 'bullet';

/** 资源显示颜色 */
export const RESOURCE_COLORS: Record<ResourceType, number> = {
  iron_ore:     0x8B4513,
  copper_ore:   0xCD7F32,
  iron_plate:   0x8899AA,
  copper_plate: 0xB87333,
  bullet:       0xFFD700,
};

/** 各机器接受的输入资源类型 */
export const MACHINE_ACCEPTS: Partial<Record<BuildingType, ResourceType[]>> = {
  furnace:   ['iron_ore', 'copper_ore'],
  assembler: ['iron_plate', 'copper_plate'],
};
