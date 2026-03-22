/**
 * LevelConfig — 关卡、起始卡组、奖励池配置
 *
 * 结构层次：
 *   LEVEL_CONFIGS[n]          第 n+1 关的完整配置
 *     .waves[w]               第 w+1 波
 *       .groups[g]            一组同种敌人，按 interval 间隔生成
 *     .rewardPool             本关通关后的奖励池（cardId 列表 + 权重）
 *
 *   STARTER_DECKS             起始卡组（玩家开局选择）
 *
 * 奖励池使用 cardId 引用 CardConfig.CARD_DEFS，不再重复写卡牌结构。
 * 权重决定随机抽到的概率（相对值，不要求加总为100）。
 */

import type { EnemyType } from './EnemyConfig';

// ── 波次结构 ────────────────────────────────────────────────────
export interface SpawnGroup {
  type:     EnemyType;
  count:    number;
  interval: number;   // 同组内生成间隔（秒）
}

export interface WaveCfg {
  groups: SpawnGroup[];
}

// ── 奖励池条目 ──────────────────────────────────────────────────
export interface RewardEntry {
  cardId: string;   // 引用 CardConfig.CARD_DEF_MAP
  weight: number;   // 随机权重（相对值）
}

// ── 关卡配置 ────────────────────────────────────────────────────
export interface LevelCfg {
  totalWaves:   number;
  waveCooldown: number;       // 波次间准备时间（秒）
  waves:        WaveCfg[];
  rewardPool:   RewardEntry[]; // 通关后可选奖励卡池
}

export const LEVEL_CONFIGS: LevelCfg[] = [
  // ── 第1关 ──
  {
    totalWaves: 3, waveCooldown: 20,
    waves: [
      { groups: [{ type: 'bug', count: 5, interval: 2.0 }] },
      { groups: [{ type: 'bug', count: 5, interval: 1.5 }] },
      { groups: [{ type: 'bug', count: 7, interval: 1.0 }] },
    ],
    rewardPool: [
      { cardId: 'gun_tower',  weight: 8 },
      { cardId: 'wall',       weight: 10 },
      { cardId: 'ammo_box',   weight: 6 },
      { cardId: 'furnace',    weight: 8 },
      { cardId: 'assembler',  weight: 5 },
      { cardId: 'iron_mine',  weight: 6 },
      { cardId: 'copper_mine',weight: 6 },
    ],
  },
  // ── 第2关 ──
  {
    totalWaves: 4, waveCooldown: 25,
    waves: [
      { groups: [{ type: 'bug', count: 8, interval: 2.0 }] },
      { groups: [{ type: 'bug', count: 5, interval: 1.5 }, { type: 'tank_bug', count: 2, interval: 3.0 }] },
      { groups: [{ type: 'bug', count: 10, interval: 1.0 }] },
      { groups: [{ type: 'tank_bug', count: 3, interval: 2.5 }] },
    ],
    rewardPool: [
      { cardId: 'gun_tower',  weight: 10 },
      { cardId: 'wall',       weight: 8  },
      { cardId: 'ammo_box',   weight: 8  },
      { cardId: 'assembler',  weight: 6  },
      { cardId: 'iron_mine',  weight: 4  },
      { cardId: 'copper_mine',weight: 4  },
    ],
  },
  // ── 第3关 ──
  {
    totalWaves: 5, waveCooldown: 30,
    waves: [
      { groups: [{ type: 'bug', count: 6, interval: 2.0 }] },
      { groups: [{ type: 'bug', count: 8, interval: 1.5 }, { type: 'tank_bug', count: 1, interval: 4.0 }] },
      { groups: [{ type: 'bug', count: 10, interval: 1.0 }, { type: 'tank_bug', count: 2, interval: 3.0 }] },
      { groups: [{ type: 'bug', count: 12, interval: 0.8 }, { type: 'tank_bug', count: 2, interval: 2.0 }] },
      { groups: [{ type: 'bug', count: 8,  interval: 0.8 }, { type: 'tank_bug', count: 4, interval: 2.0 }] },
    ],
    rewardPool: [
      { cardId: 'gun_tower',  weight: 12 },
      { cardId: 'ammo_box',   weight: 10 },
      { cardId: 'assembler',  weight: 8  },
      { cardId: 'wall',       weight: 6  },
    ],
  },
];

// ── 起始卡组 ────────────────────────────────────────────────────
// 每套卡组用 cardId 列表描述组成（可有重复，代表多张同种卡）。
// cardId 引用 CardConfig.CARD_DEFS，不再内联卡牌结构。
export interface StarterDeck {
  name:    string;
  desc:    string;
  color:   string;   // CSS 颜色，用于边框高亮
  cardIds: string[]; // cardId 列表（顺序无关）
}

export const STARTER_DECKS: StarterDeck[] = [
  {
    name: '🏰 防御重点', desc: '多墙多炮，坚不可摧', color: '#E74C3C',
    cardIds: [
      'iron_mine', 'iron_mine', 'copper_mine', 'copper_mine',
      'furnace', 'furnace', 'assembler', 'ammo_box',
      'gun_tower', 'gun_tower',
      'wall', 'wall', 'wall', 'wall',
    ],
  },
  {
    name: '⚙️ 工厂重点', desc: '双炉高产，弹药无忧', color: '#3498DB',
    cardIds: [
      'iron_mine', 'iron_mine', 'copper_mine', 'copper_mine',
      'furnace', 'furnace', 'assembler', 'assembler',
      'ammo_box', 'ammo_box',
      'gun_tower', 'gun_tower',
      'wall', 'wall',
    ],
  },
  {
    name: '⚖️ 均衡配置', desc: '攻守兼备，灵活应对', color: '#27AE60',
    cardIds: [
      'iron_mine', 'iron_mine', 'copper_mine', 'copper_mine',
      'furnace', 'furnace', 'assembler', 'ammo_box',
      'gun_tower', 'gun_tower', 'gun_tower',
      'wall', 'wall',
    ],
  },
];
