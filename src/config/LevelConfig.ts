import type { EnemyType } from './EnemyConfig';

export interface SpawnGroup {
  type: EnemyType;
  count: number;
  interval: number; // 秒
}

export interface WaveCfg {
  groups: SpawnGroup[];
}

export interface LevelCfg {
  totalWaves: number;
  waveCooldown: number; // 波次间隔（秒）
  waves: WaveCfg[];
}

export const LEVEL_CONFIGS: LevelCfg[] = [
  // ── 第1关 ──
  {
    totalWaves: 3,
    waveCooldown: 20,
    waves: [
      { groups: [{ type: 'bug', count: 5, interval: 2.0 }] },
      { groups: [{ type: 'bug', count: 5, interval: 1.5 }] },
      { groups: [{ type: 'bug', count: 7, interval: 1.0 }] },
    ],
  },
  // ── 第2关 ──
  {
    totalWaves: 4,
    waveCooldown: 25,
    waves: [
      { groups: [{ type: 'bug', count: 8, interval: 2.0 }] },
      { groups: [{ type: 'bug', count: 5, interval: 1.5 }, { type: 'tank_bug', count: 2, interval: 3.0 }] },
      { groups: [{ type: 'bug', count: 10, interval: 1.0 }] },
      { groups: [{ type: 'tank_bug', count: 3, interval: 2.5 }] },
    ],
  },
  // ── 第3关 ──
  {
    totalWaves: 5,
    waveCooldown: 30,
    waves: [
      { groups: [{ type: 'bug', count: 6, interval: 2.0 }] },
      { groups: [{ type: 'bug', count: 8, interval: 1.5 }, { type: 'tank_bug', count: 1, interval: 4.0 }] },
      { groups: [{ type: 'bug', count: 10, interval: 1.0 }, { type: 'tank_bug', count: 2, interval: 3.0 }] },
      { groups: [{ type: 'bug', count: 12, interval: 0.8 }, { type: 'tank_bug', count: 2, interval: 2.0 }] },
      { groups: [{ type: 'bug', count: 8, interval: 0.8 }, { type: 'tank_bug', count: 4, interval: 2.0 }] },
    ],
  },
];

/** 起始卡组定义 */
import type { CardData } from '../model/Card';

export interface StarterDeck {
  name: string;
  desc: string;
  color: string;
  cards: Omit<CardData, 'id'>[];
}

export const STARTER_DECKS: StarterDeck[] = [
  {
    name: '🏰 防御重点',
    desc: '多墙多炮，坚不可摧',
    color: '#E74C3C',
    cards: [
      { type: 'resource', resourceType: 'iron',   durability: 2 },
      { type: 'resource', resourceType: 'iron',   durability: 2 },
      { type: 'resource', resourceType: 'copper', durability: 2 },
      { type: 'resource', resourceType: 'copper', durability: 2 },
      { type: 'production', buildingType: 'furnace' },
      { type: 'production', buildingType: 'furnace' },
      { type: 'production', buildingType: 'assembler' },
      { type: 'storage',    buildingType: 'ammo_box' },
      { type: 'defense',    buildingType: 'gun_tower' },
      { type: 'defense',    buildingType: 'gun_tower' },
      { type: 'defense',    buildingType: 'wall' },
      { type: 'defense',    buildingType: 'wall' },
      { type: 'defense',    buildingType: 'wall' },
      { type: 'defense',    buildingType: 'wall' },
    ],
  },
  {
    name: '⚙️ 工厂重点',
    desc: '双炉高产，弹药无忧',
    color: '#3498DB',
    cards: [
      { type: 'resource', resourceType: 'iron',   durability: 2 },
      { type: 'resource', resourceType: 'iron',   durability: 2 },
      { type: 'resource', resourceType: 'copper', durability: 2 },
      { type: 'resource', resourceType: 'copper', durability: 2 },
      { type: 'production', buildingType: 'furnace' },
      { type: 'production', buildingType: 'furnace' },
      { type: 'production', buildingType: 'assembler' },
      { type: 'production', buildingType: 'assembler' },
      { type: 'storage',    buildingType: 'ammo_box' },
      { type: 'storage',    buildingType: 'ammo_box' },
      { type: 'defense',    buildingType: 'gun_tower' },
      { type: 'defense',    buildingType: 'gun_tower' },
      { type: 'defense',    buildingType: 'wall' },
      { type: 'defense',    buildingType: 'wall' },
    ],
  },
  {
    name: '⚖️ 均衡配置',
    desc: '攻守兼备，灵活应对',
    color: '#27AE60',
    cards: [
      { type: 'resource', resourceType: 'iron',   durability: 2 },
      { type: 'resource', resourceType: 'iron',   durability: 2 },
      { type: 'resource', resourceType: 'copper', durability: 2 },
      { type: 'resource', resourceType: 'copper', durability: 2 },
      { type: 'production', buildingType: 'furnace' },
      { type: 'production', buildingType: 'furnace' },
      { type: 'production', buildingType: 'assembler' },
      { type: 'storage',    buildingType: 'ammo_box' },
      { type: 'defense',    buildingType: 'gun_tower' },
      { type: 'defense',    buildingType: 'gun_tower' },
      { type: 'defense',    buildingType: 'gun_tower' },
      { type: 'defense',    buildingType: 'wall' },
      { type: 'defense',    buildingType: 'wall' },
    ],
  },
];

/** 关卡奖励卡池 */
export const REWARD_POOL: Omit<CardData, 'id'>[] = [
  { type: 'defense',    buildingType: 'gun_tower' },
  { type: 'defense',    buildingType: 'wall' },
  { type: 'defense',    buildingType: 'wall' },
  { type: 'storage',    buildingType: 'ammo_box' },
  { type: 'production', buildingType: 'furnace' },
  { type: 'production', buildingType: 'assembler' },
  { type: 'resource',   resourceType: 'iron',   durability: 2 },
  { type: 'resource',   resourceType: 'copper', durability: 2 },
  { type: 'defense',    buildingType: 'gun_tower' },
  { type: 'storage',    buildingType: 'ammo_box' },
];
