# 游戏自定义指南

本文档说明如何通过编辑配置文件来修改游戏内容，无需改动任何逻辑代码。

所有配置文件位于 `src/config/` 目录下。

---

## 目录

1. [平衡性数值](#1-平衡性数值--balanceconfigts)
2. [地图与路径](#2-地图与路径--mapconfigts)
3. [建筑与资源](#3-建筑与资源--buildingconfigts)
4. [生产配方](#4-生产配方--recipeconfigts)
5. [敌人](#5-敌人--enemyconfigts)
6. [卡牌](#6-卡牌--cardconfigts)
7. [关卡、波次、奖励池、起始卡组](#7-关卡波次奖励池起始卡组--levelconfigts)
8. [像素图标](#8-像素图标--pixeliconsts)
9. [新增炮塔攻击机制](#9-新增炮塔攻击机制)
10. [快速参考：改什么去哪里](#10-快速参考改什么去哪里)

---

## 1. 平衡性数值 — `BalanceConfig.ts`

这是最常用的调参文件。所有影响游戏节奏和难度的"旋钮"集中在此。

```ts
// 传送带速度（格/秒）。调大 = 物品流动更快
export const BELT_SPEED = 1.5;

// 机器输入缓冲上限（每种资源最多缓存多少个）
export const INPUT_BUF_MAX = 4;

// 生产速度全局倍率（< 1 加速，> 1 减速）
export const PRODUCTION_SCALE = {
  cycleTimeMultiplier: 1.0,
};

// 炮塔战斗参数
export const TOWER_STATS = {
  range:         3,    // 射程（格数）
  damagePerShot: 10,   // 每发伤害
  fireRate:      1.0,  // 发射间隔（秒/发）
};

// 弹药箱容量
export const AMMO_BOX_CAPACITY = 50;

// 核心建筑初始血量
export const CORE_MAX_HEALTH = 200;

// 敌人全局倍率（同时作用于所有敌人类型）
export const ENEMY_SCALE = {
  healthMultiplier:  1.0,
  speedMultiplier:   1.0,
  damageMultiplier:  1.0,
};

// 资源卡默认耐久度（每过一关 -1，归零消失）
export const CARD_DURABILITY_DEFAULT = 2;
```

**常见调整场景：**

| 想要的效果 | 修改项 |
|-----------|--------|
| 整体提高难度 | `ENEMY_SCALE.*` 调大 |
| 工厂产速感觉太慢 | `PRODUCTION_SCALE.cycleTimeMultiplier` 调小（如 0.7） |
| 炮塔打不过来 | `TOWER_STATS.damagePerShot` 调大，或 `fireRate` 调小 |
| 传送带物品看不清 | `BELT_SPEED` 调小（如 1.0） |

---

## 2. 地图与路径 — `MapConfig.ts`

控制网格大小、核心位置和敌人行进路线。

```ts
// 格子像素大小（改这个会缩放整个地图）
export const CELL = 50;

// 网格行列数
export const GRID_W = 10;
export const GRID_H = 10;

// 核心建筑位置（必须与路径最后一个节点一致）
export const CORE_X = 9;
export const CORE_Y = 7;

// 敌人路径节点（顺序即行进方向，相邻两点必须在同行或同列）
export const ENEMY_PATH = [
  { x: 0, y: 5 },  // 入侵起点
  { x: 3, y: 5 },
  { x: 3, y: 2 },
  { x: 7, y: 2 },
  { x: 7, y: 7 },
  { x: 9, y: 7 },  // 终点，必须等于 CORE_X, CORE_Y
];
```

**添加新路径节点：**

```ts
export const ENEMY_PATH = [
  { x: 0, y: 3 },
  { x: 5, y: 3 },  // 新节点：先横走到中间
  { x: 5, y: 8 },  // 再向下
  { x: 9, y: 8 },  // 再横走到终点
  { x: 9, y: 7 },  // 核心
];
```

> **约束：** 相邻两节点必须在同一行（`y` 相同）或同一列（`x` 相同），不支持斜线。路径最后一个节点必须等于 `CORE_X, CORE_Y`。

---

## 3. 建筑与资源 — `BuildingConfig.ts`

### 3.1 修改现有建筑属性

```ts
export const BUILDING_CONFIGS: Record<BuildingType, BuildingCfg> = {
  gun_tower: {
    hp:    50,        // 基础血量（被敌人攻击时扣减）
    emoji: '🔫',     // 已弃用，像素图标在 PixelIcons.ts 定义
    color: 0x922B21, // Phaser 十六进制颜色，作为格子底色
    name:  '机枪塔',  // 显示名称（卡牌和 UI 使用）
    desc:  '...',    // 卡牌说明文字
  },
  // ...
};
```

### 3.2 添加新建筑类型

**Step 1** — 在 `BuildingType` 联合类型中加入新名称：

```ts
export type BuildingType =
  | 'iron_ore_node'
  | /* ... 现有类型 */
  | 'sniper_tower';   // ← 新增
```

**Step 2** — 在 `BUILDING_CONFIGS` 中添加对应配置：

```ts
sniper_tower: {
  hp: 40, emoji: '', color: 0x1A237E,
  name: '狙击塔', desc: '射程6，高伤，慢速',
},
```

**Step 3** — 如果新建筑有输出方向（像矿节点/熔炉），加入 `HAS_OUTPUT_DIR`：

```ts
export const HAS_OUTPUT_DIR: BuildingType[] = [
  'iron_ore_node', 'copper_ore_node', 'furnace', 'assembler', 'conveyor',
  'sniper_tower',  // 如果它有输出方向
];
```

**Step 4** — 在 `PixelIcons.ts` 添加图标（见第 8 节）。

**Step 5** — 如果是防御建筑，在 `DefenseSystem.ts` 中添加处理逻辑（见第 9 节）。

### 3.3 添加新资源类型

在 `BuildingConfig.ts` 的 `ResourceType` 中添加：

```ts
export type ResourceType =
  | 'iron_ore' | 'copper_ore'
  | 'iron_plate' | 'copper_plate'
  | 'bullet'
  | 'circuit';  // ← 新资源
```

在 `RESOURCE_COLORS` 中添加颜色（用于传送带圆点颜色）：

```ts
export const RESOURCE_COLORS: Record<ResourceType, number> = {
  // ...现有
  circuit: 0x00FF88,  // 新资源颜色
};
```

同时在 `GameState.ts` 的 `ResDisplay` 接口和 `HudManager.ts` 的 `updateResources()` 中添加该字段，以便在资源栏显示。

---

## 4. 生产配方 — `RecipeConfig.ts`

配方驱动整个工厂逻辑，添加新配方无需改动系统代码。

### 4.1 配方结构

```ts
{
  buildingType: 'assembler',    // 使用该配方的建筑类型
  variants: [                   // 候选配方列表（建筑每次选一个执行）
    {
      inputs:  { iron_plate: 1, copper_plate: 1 },  // 每次消耗的原料
      outputs: { bullet: 5 },                        // 每次产出的产品
    },
  ],
  cycleTime: 1,                  // 生产周期（秒）
  accepts:   ['iron_plate', 'copper_plate'],  // 传送带可以向本机器推入的资源类型
}
```

### 4.2 多 variant — 熔炉的交替加工

熔炉有两个 variant，系统会优先选上次没用过的那个，实现铁板/铜板交替产出：

```ts
{
  buildingType: 'furnace',
  variants: [
    { inputs: { iron_ore: 1 },   outputs: { iron_plate: 1 } },
    { inputs: { copper_ore: 1 }, outputs: { copper_plate: 1 } },
  ],
  cycleTime: 2,
  accepts: ['iron_ore', 'copper_ore'],
}
```

### 4.3 添加新配方

例如，添加一个"电路板厂"（铁板 + 铜板 → 电路板）：

```ts
// 1. 在 BuildingType 中添加 'circuit_factory'
// 2. 在 ResourceType 中添加 'circuit'
// 3. 在 RECIPES 中添加：
{
  buildingType: 'circuit_factory',
  variants: [
    { inputs: { iron_plate: 2, copper_plate: 1 }, outputs: { circuit: 1 } },
  ],
  cycleTime: 3,
  accepts: ['iron_plate', 'copper_plate'],
},
```

系统的 `ProductionSystem` 和 `ConveyorSystem` 会自动识别新配方，无需修改逻辑代码。

> **注意：** `cycleTime` 受 `BalanceConfig.PRODUCTION_SCALE.cycleTimeMultiplier` 全局倍率影响。实际周期 = `cycleTime × cycleTimeMultiplier`。

---

## 5. 敌人 — `EnemyConfig.ts`

### 5.1 修改现有敌人属性

```ts
export const ENEMY_CONFIGS: Record<EnemyType, EnemyCfg> = {
  bug: {
    health:   30,           // 基础血量（实际 = health × ENEMY_SCALE.healthMultiplier）
    speed:    1.0,          // 移动速度（格/秒）
    damage:   10,           // 攻击伤害（攻击建筑/核心时）
    atkSpd:   1.0,          // 攻击间隔（秒/次）
    behavior: 'path_follow', // AI 行为标签
    emoji:    '🐛',         // 已弃用，像素脸在 PixelIcons.ts 定义
    radius:   16,           // 渲染圆半径（px），影响视觉大小
    color:    0x8E44AD,     // 敌人底色
    name:     '小虫子',
  },
};
```

### 5.2 添加新敌人类型

**Step 1** — 在 `EnemyType` 中添加：

```ts
export type EnemyType = 'bug' | 'tank_bug' | 'flying_bug';
```

**Step 2** — 在 `ENEMY_CONFIGS` 中添加配置：

```ts
flying_bug: {
  health: 50, speed: 1.5, damage: 15, atkSpd: 1.5,
  behavior: 'flying',   // AI 行为标签（目前 flying 未实现，见下文）
  emoji: '', radius: 18, color: 0x0088CC, name: '飞虫',
},
```

**Step 3** — 在 `EnemySystem.ts` 中，如果 `behavior` 不是 `path_follow`，需要在 `moveEnemy()` 里加分支处理（见第 9 节的扩展说明）。

**Step 4** — 在 `PixelIcons.ts` 中添加像素脸函数，并在 `EnemyRenderer.ts` 中按 `e.type` 分发调用。

### 5.3 全局倍率

`BalanceConfig.ENEMY_SCALE` 对所有敌人同时生效。如果需要只对某一关的敌人加强，可以在 `LevelConfig` 的 `waves` 中配合增加数量和缩短生成间隔实现。

---

## 6. 卡牌 — `CardConfig.ts`

### 6.1 卡牌结构

```ts
{
  cardId:       'gun_tower',     // 全局唯一 ID，LevelConfig 的奖励池用此引用
  type:         'defense',       // 卡牌类型：resource | production | defense | storage
  buildingType: 'gun_tower',     // 对应建筑（建筑卡）
  resourceType: 'iron',          // 对应资源（资源卡，与 buildingType 二选一）
  durability:   2,               // 仅资源卡：关卡耐久（每过一关 -1，归零消失）
  name:  '机枪塔',
  icon:  '🔫',                  // 已弃用（像素图标在 CardManager.ts 的色块映射中定义）
  desc:  '...',
  rarity: 'uncommon',           // 'common' | 'uncommon' | 'rare'
  unlock: { type: 'always' },   // 解锁条件（见下文）
}
```

### 6.2 稀有度

稀有度影响奖励池的抽取权重和 UI 边框颜色：

```ts
export const RARITY_META: Record<Rarity, { label: string; color: string; weight: number }> = {
  common:   { label: '普通', color: '#95A5A6', weight: 10 },
  uncommon: { label: '精良', color: '#3498DB', weight: 5  },
  rare:     { label: '稀有', color: '#F39C12', weight: 2  },
};
```

### 6.3 解锁条件

```ts
// 始终可用
unlock: { type: 'always' }

// 到达第 N 关后解锁（进入奖励池）
unlock: { type: 'reach_level', level: 2 }

// 核心剩余血量 ≥ N 时通关后解锁
unlock: { type: 'win_with_core_hp', minHp: 150 }
```

> **注意：** 解锁条件目前只是声明式数据，实际过滤逻辑需要在 `DialogManager.ts` 的 `pickWeightedRewards()` 中读取 `def.unlock` 并过滤。当前 MVP 版本尚未实现此过滤，所有卡牌均可出现在奖励池中（取决于 `LevelConfig.rewardPool` 是否包含该 `cardId`）。

### 6.4 添加新卡牌

```ts
// CardConfig.ts 的 CARD_DEFS 中添加：
{
  cardId: 'laser_tower',
  type: 'defense',
  buildingType: 'laser_tower',  // 需先在 BuildingConfig 注册
  name: '激光塔',
  icon: '',
  desc: '持续激光，无需弹药',
  rarity: 'rare',
  unlock: { type: 'reach_level', level: 2 },
},
```

然后在 `CardManager.ts` 的 `CARD_ICON_CFG` 和 `CARD_NAME_SHORT` 中补充图标配置。

---

## 7. 关卡、波次、奖励池、起始卡组 — `LevelConfig.ts`

### 7.1 关卡结构

```ts
{
  totalWaves:   3,    // 本关总波次数
  waveCooldown: 20,   // 波次间准备时间（秒）
  waves: [ /* 见下文 */ ],
  rewardPool: [ /* 见下文 */ ],
}
```

### 7.2 波次配置

```ts
waves: [
  // 第 1 波：5 只小虫，每 2 秒出一只
  { groups: [{ type: 'bug', count: 5, interval: 2.0 }] },

  // 第 2 波：混合波（小虫和坦克虫同时生成）
  {
    groups: [
      { type: 'bug',      count: 8, interval: 1.5 },
      { type: 'tank_bug', count: 2, interval: 3.0 },
    ],
  },
],
```

> **混合波说明：** 多个 `group` 的敌人会顺序拼入生成队列（先所有小虫，再所有坦克虫）。若要真正交替出现，需修改 `WaveSystem.ts` 中的队列构建逻辑。

### 7.3 奖励池配置

通关后弹窗从当前关的 `rewardPool` 中按权重随机抽 3 张供玩家选择：

```ts
rewardPool: [
  { cardId: 'gun_tower',   weight: 8  },  // 权重越高越容易抽到
  { cardId: 'wall',        weight: 10 },
  { cardId: 'ammo_box',    weight: 6  },
  { cardId: 'laser_tower', weight: 2  },  // 稀有卡给低权重
],
```

- `weight` 是相对值，不需要加总为 100
- 删掉某条目 = 本关不会出现该卡牌
- 不同关可以有完全不同的奖励池

### 7.4 起始卡组

```ts
export const STARTER_DECKS: StarterDeck[] = [
  {
    name: '🏰 防御重点',
    desc: '多墙多炮，坚不可摧',
    color: '#E74C3C',           // 卡组边框颜色（CSS 颜色）
    cardIds: [                  // 用 cardId 列表描述组成，可重复
      'iron_mine', 'iron_mine',
      'copper_mine', 'copper_mine',
      'furnace', 'furnace',
      'assembler', 'ammo_box',
      'gun_tower', 'gun_tower',
      'wall', 'wall', 'wall', 'wall',
    ],
  },
  // ...
];
```

> **添加新卡组：** 在数组末尾加一个对象即可。开局选卡弹窗会自动增加一列。

---

## 8. 像素图标 — `PixelIcons.ts`

所有视觉图标均用 Phaser `Graphics` API 绘制，不依赖任何图片或 emoji。

### 8.1 建筑图标

每种建筑对应一个 `drawXxx(g, cx, cy, s)` 函数：

- `g`：Phaser `Graphics` 对象
- `cx, cy`：图标中心像素坐标
- `s`：图标尺寸（通常为 `CELL × 0.72`，即约 36px）

**添加新建筑图标：**

```ts
// 1. 在 PixelIcons.ts 中添加绘制函数
export function drawLaserTower(g: G, cx: number, cy: number, s: number): void {
  const u = s / 32;
  // 底座
  g.fillStyle(0x1A237E, 1);
  g.fillRect(cx - 10*u, cy + 4*u, 20*u, 8*u);
  // 发射管（细长矩形）
  g.fillStyle(0x00E5FF, 1);
  g.fillRect(cx - 2*u, cy - 12*u, 4*u, 16*u);
  // 发光点
  g.fillStyle(0xFFFFFF, 0.9);
  g.fillRect(cx - u, cy - 14*u, 2*u, 2*u);
}

// 2. 注册到 BUILDING_DRAW_FN 映射表
export const BUILDING_DRAW_FN: Record<string, DrawFn> = {
  // ...现有
  laser_tower: drawLaserTower,  // ← 新增
};
```

### 8.2 敌人脸部图标

敌人底色圆由 `EnemyRenderer` 绘制，脸部细节由以下函数提供：

```ts
// 添加新敌人脸部绘制函数
export function drawFlyingBugFace(g: G, cx: number, cy: number, r: number): void {
  const u = r / 16;
  // 翅膀（扁平矩形，两侧）
  g.fillStyle(0x88CCFF, 0.6);
  g.fillRect(cx - 12*u, cy - 2*u, 8*u, 4*u);
  g.fillRect(cx + 4*u,  cy - 2*u, 8*u, 4*u);
  // 眼睛
  g.fillStyle(0x00FFFF, 1);
  g.fillRect(cx - 4*u, cy - 2*u, 3*u, 3*u);
  g.fillRect(cx + 1*u, cy - 2*u, 3*u, 3*u);
}
```

然后在 `EnemyRenderer.ts` 的 `render()` 中按 `e.type` 分发：

```ts
if (e.type === 'tank_bug')    drawTankBugFace(v.faceGfx, cx, cy, r);
else if (e.type === 'flying_bug') drawFlyingBugFace(v.faceGfx, cx, cy, r);
else                          drawBugFace(v.faceGfx, cx, cy, r);
```

---

## 9. 新增炮塔攻击机制

### 9.1 当前机枪塔的工作逻辑（`DefenseSystem.ts`）

```
每帧更新 updateTower()：
  1. fireCooldown -= dt
  2. 检查相邻4格是否有弹药箱且有弹药
     → 没有：标记 noAmmo，跳过
  3. fireCooldown > 0：跳过（还在冷却）
  4. 在 range 格内找存活的敌人
     → 没有：跳过
  5. 选目标：pathIndex 最大（最接近终点）的敌人
  6. ammoBox.ammo--，fireCooldown = fireRate
  7. 触发子弹动画回调，对目标调用 takeDamage()
```

### 9.2 添加新炮塔类型（以"激光塔"为例）

激光塔：持续伤害，不需要弹药，有充能时间。

**Step 1** — 在 `BalanceConfig.ts` 添加参数：

```ts
export const LASER_TOWER_STATS = {
  range:      6,
  dps:        5,        // 每秒伤害
  chargeTime: 3.0,      // 充能时间（秒）
};
```

**Step 2** — 在 `DefenseSystem.ts` 的 `update()` 中添加分发：

```ts
update(gs: GameState, dt: number): void {
  for (const b of gs.buildings) {
    if (b.type === 'gun_tower')   this.updateGunTower(gs, b, dt);
    if (b.type === 'laser_tower') this.updateLaserTower(gs, b, dt);
  }
}
```

**Step 3** — 实现 `updateLaserTower()`：

```ts
import { LASER_TOWER_STATS } from '../config/BalanceConfig';

private updateLaserTower(gs: GameState, tower: Building, dt: number): void {
  // 充能计时（利用 tower.prodTimer 复用字段，或在 Building 模型加新字段）
  tower.prodTimer += dt;
  if (tower.prodTimer < LASER_TOWER_STATS.chargeTime) return;

  const target = this.pickTarget(gs, tower, LASER_TOWER_STATS.range);
  if (!target) { tower.prodTimer = 0; return; }

  // 持续伤害：每帧按 dps × dt 扣血
  target.takeDamage(LASER_TOWER_STATS.dps * dt);
  // 触发激光动画（可复用 onBulletFired 回调，或新增 onLaserFired）
  this.onBulletFired(tower.x, tower.y, target.gx, target.gy);
}

// 将 pickTarget 改为接受 range 参数
private pickTarget(gs: GameState, tower: Building, range = this.range): Enemy | null {
  // ...
}
```

> **关键点：** `DefenseSystem` 通过构造函数注入的回调与 `GameScene` 通信，不直接依赖渲染层。新增动画效果只需在 `GameScene` 中添加新回调并传入 `DefenseSystem`。

### 9.3 实现范围攻击（AOE）

```ts
private updateAoeTower(gs: GameState, tower: Building, dt: number): void {
  tower.fireCooldown -= dt;
  if (tower.fireCooldown > 0) return;
  tower.fireCooldown = 3.0; // 3秒一次

  // 找所有射程内敌人（不限一个）
  const range = 2;
  const targets = gs.enemies.filter(e => {
    if (e.isDead) return false;
    return Math.hypot(e.gx - tower.x, e.gy - tower.y) <= range;
  });
  for (const t of targets) {
    t.takeDamage(30);
    this.onBulletFired(tower.x, tower.y, t.gx, t.gy);
  }
}
```

---

## 10. 快速参考：改什么去哪里

| 想改的内容 | 文件 | 关键字段 |
|-----------|------|---------|
| 炮塔射程/伤害/射速 | `BalanceConfig.ts` | `TOWER_STATS` |
| 弹药箱容量 | `BalanceConfig.ts` | `AMMO_BOX_CAPACITY` |
| 传送带速度 | `BalanceConfig.ts` | `BELT_SPEED` |
| 生产速度 | `BalanceConfig.ts` | `PRODUCTION_SCALE` |
| 敌人血量/速度/伤害（全局） | `BalanceConfig.ts` | `ENEMY_SCALE` |
| 地图大小 | `MapConfig.ts` | `GRID_W`, `GRID_H`, `CELL` |
| 敌人入侵路线 | `MapConfig.ts` | `ENEMY_PATH` |
| 核心位置 | `MapConfig.ts` | `CORE_X`, `CORE_Y` |
| 建筑血量/颜色/名称 | `BuildingConfig.ts` | `BUILDING_CONFIGS` |
| 资源类型和颜色 | `BuildingConfig.ts` | `ResourceType`, `RESOURCE_COLORS` |
| 生产配方/原料/产品/时间 | `RecipeConfig.ts` | `RECIPES` |
| 敌人单体属性/AI标签 | `EnemyConfig.ts` | `ENEMY_CONFIGS` |
| 卡牌名称/稀有度/解锁条件 | `CardConfig.ts` | `CARD_DEFS` |
| 关卡波次/敌人数量/间隔 | `LevelConfig.ts` | `LEVEL_CONFIGS[n].waves` |
| 通关奖励池 | `LevelConfig.ts` | `LEVEL_CONFIGS[n].rewardPool` |
| 起始卡组 | `LevelConfig.ts` | `STARTER_DECKS` |
| 建筑像素图标 | `PixelIcons.ts` | `drawXxx()` + `BUILDING_DRAW_FN` |
| 卡牌 UI 色块 | `CardManager.ts` | `CARD_ICON_CFG`, `CARD_NAME_SHORT` |
| 新炮塔攻击逻辑 | `DefenseSystem.ts` | `update()` + 新方法 |
| 新敌人 AI 行为 | `EnemySystem.ts` | `moveEnemy()` |
