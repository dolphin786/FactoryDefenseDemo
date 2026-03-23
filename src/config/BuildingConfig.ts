/**
 * BuildingConfig — 建筑静态数据
 *
 * 支持多格建筑（Multi-cell Building）：
 *   cells       — 格子布局，dx/dy 为旋转前相对锚点的偏移
 *   inputPorts  — 接受传送带输入的端口
 *   outputPort  — 产物推出的端口
 *
 * 端口方向（relDir）使用相对建筑前方的偏转：
 *   0 = 前（dir 方向）  1 = 右  2 = 后  3 = 左
 */

import { AMMO_BOX_CAPACITY, TOWER_STATS } from './BalanceConfig';

// ── 建筑类型枚举 ────────────────────────────────────────────────
export type BuildingType =
  | 'iron_ore_node'
  | 'copper_ore_node'
  | 'furnace'
  | 'assembler'
  | 'gun_tower'
  | 'wall'
  | 'ammo_box'
  | 'conveyor'
  | 'splitter'          // 分流器（2×1 多格建筑，dir=右时上下排列）
  | 'multiblock_body'   // 通用副格占位（所有多格建筑的非锚点格）
  | 'underground_in'
  | 'underground_out'
  | 'core';

// ── 资源类型 ────────────────────────────────────────────────────
export type ResourceType = 'iron_ore' | 'copper_ore' | 'iron_plate' | 'copper_plate' | 'bullet';

export const RESOURCE_COLORS: Record<ResourceType, number> = {
  iron_ore:     0x8B4513,
  copper_ore:   0xCD7F32,
  iron_plate:   0x8899AA,
  copper_plate: 0xB87333,
  bullet:       0xFFD700,
};

// ── 多格建筑：格子定义 ──────────────────────────────────────────
export interface CellDef {
  dx:   number;               // 相对锚点的列偏移（旋转前）
  dy:   number;               // 相对锚点的行偏移（旋转前）
  role: 'anchor' | 'body';   // anchor=主格（持有逻辑）；body=副格（只占格）
}

// ── 端口定义 ─────────────────────────────────────────────────────
export interface PortDef {
  /** 所在格的偏移（与 CellDef 对应，旋转前，锚点为 0,0） */
  cellDx: number;
  cellDy: number;
  /**
   * 端口朝向（相对建筑前方）：
   *   0=前(dir方向)  1=右  2=后  3=左
   */
  relDir: number;
}

// ── 建筑配置 ────────────────────────────────────────────────────
export interface BuildingCfg {
  hp:    number;
  emoji: string;
  color: number;
  name:  string;
  desc:  string;

  /**
   * 多格建筑的格子布局（旋转前坐标，相对锚点）。
   * 未配置 = 单格建筑（等价于 [{dx:0,dy:0,role:'anchor'}]）。
   * 锚点格必须存在且 dx=dy=0。
   */
  cells?: CellDef[];

  /**
   * 输入端口列表——传送带末端对准这些端口后物品进入 inputBuf。
   * 未配置则从任意朝向的传送带接受（向后兼容）。
   */
  inputPorts?: PortDef[];

  /**
   * 输出端口——产物推入此端口前方的传送带。
   * 未配置则使用建筑 dir 方向（单格传统行为）。
   * 多格建筑可在运行时根据 cells 推导多个输出口（分流器）。
   */
  outputPort?: PortDef;
}

// ── 建筑配置表 ──────────────────────────────────────────────────
export const BUILDING_CONFIGS: Record<BuildingType, BuildingCfg> = {

  iron_ore_node: {
    hp: 999, emoji: '⛏️', color: 0x6D4C41, name: '铁矿', desc: '1铁矿/秒',
    outputPort: { cellDx: 0, cellDy: 0, relDir: 0 },
  },
  copper_ore_node: {
    hp: 999, emoji: '🪨', color: 0xAD6922, name: '铜矿', desc: '1铜矿/秒',
    outputPort: { cellDx: 0, cellDy: 0, relDir: 0 },
  },
  furnace: {
    hp: 80, emoji: '🔥', color: 0xC0392B, name: '熔炉', desc: '矿→板 2s',
    inputPorts: [{ cellDx: 0, cellDy: 0, relDir: 2 }], // 后方进料
    outputPort: { cellDx: 0, cellDy: 0, relDir: 0 },   // 前方出料
  },
  assembler: {
    hp: 80, emoji: '⚙️', color: 0x2471A3, name: '组装机', desc: '板→子弹×5 1s',
    inputPorts: [{ cellDx: 0, cellDy: 0, relDir: 2 }],
    outputPort: { cellDx: 0, cellDy: 0, relDir: 0 },
  },
  gun_tower: {
    hp: 50, emoji: '🔫', color: 0x922B21, name: '机枪塔',
    desc: `射程${TOWER_STATS.range}格，${TOWER_STATS.damagePerShot}伤/发`,
  },
  wall:     { hp: 100, emoji: '🧱', color: 0x707B7C, name: '围墙',   desc: 'HP:100' },
  ammo_box: { hp: 60,  emoji: '📦', color: 0xD4AC0D, name: '弹药箱', desc: `存弹${AMMO_BOX_CAPACITY}发` },
  conveyor: { hp: 999, emoji: '→',  color: 0x4A5568, name: '传送带', desc: '运输资源' },

  /**
   * 分流器（Factorio 式 2×1）
   *
   * dir=0（向右）时的布局：
   *   (0,0) 上格 anchor ← 从后(左)方进 → 从前(右)方出
   *   (0,1) 下格 body   ← 同上
   *
   * 两个输入端口（上下各一）→ 内部共享缓冲 → 两个输出端口交替输出
   * 输出逻辑在 ConveyorSystem.tickSplitter 中专门处理
   */
  splitter: {
    hp: 999, emoji: '⑂', color: 0x2E6B4A, name: '分流器', desc: '2入→2出，均摊',
    cells: [
      { dx: 0, dy: 0, role: 'anchor' },
      { dx: 0, dy: 1, role: 'body'   },
    ],
    inputPorts: [
      { cellDx: 0, cellDy: 0, relDir: 2 }, // 上格后方
      { cellDx: 0, cellDy: 1, relDir: 2 }, // 下格后方
    ],
    // 分流器有两个输出端口，在运行时动态计算，此处仅标记上格前方
    outputPort: { cellDx: 0, cellDy: 0, relDir: 0 },
  },

  // 通用副格——所有多格建筑的非锚点格
  multiblock_body: {
    hp: 999, emoji: '', color: 0x2E6B4A, name: '（副格）', desc: '',
  },

  underground_in:  { hp: 999, emoji: '▼', color: 0x3A2E6A, name: '地下入口', desc: '物品入地下' },
  underground_out: { hp: 999, emoji: '▲', color: 0x3A2E6A, name: '地下出口', desc: '物品出地下' },
  core:            { hp: 200, emoji: '💎', color: 0xE67E22, name: '核心',     desc: '守护目标' },
};

// ── 工具函数 ─────────────────────────────────────────────────────

/** 判断建筑类型是否为多格建筑（cells.length > 1） */
export function isMultiBlock(type: BuildingType): boolean {
  const cfg = BUILDING_CONFIGS[type];
  return (cfg.cells?.length ?? 1) > 1;
}

// ── 有输出方向的建筑（R 键旋转） ─────────────────────────────────
export const HAS_OUTPUT_DIR: BuildingType[] = [
  'iron_ore_node', 'copper_ore_node', 'furnace', 'assembler',
  'conveyor', 'splitter', 'underground_in', 'underground_out',
];

export const MACHINE_ACCEPTS: Partial<Record<BuildingType, ResourceType[]>> = {
  furnace:   ['iron_ore', 'copper_ore'],
  assembler: ['iron_plate', 'copper_plate'],
};

export const UNDERGROUND_MAX_DIST = 8;
