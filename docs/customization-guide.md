# 定制开发指南

> 本指南说明如何扩展游戏内容，涵盖新建筑、新卡牌、新配方、新关卡、新敌人等。  
> 绝大多数改动**只需修改 `src/config/` 下的配置文件**，不需要碰业务逻辑代码。

---

## 目录

1. [快速上手：改一个数值](#1-快速上手改一个数值)
2. [修改地图](#2-修改地图)
3. [修改平衡数值](#3-修改平衡数值)
4. [添加新建筑（单格）](#4-添加新建筑单格)
5. [添加新建筑（多格）](#5-添加新建筑多格)
6. [添加新生产配方](#6-添加新生产配方)
7. [添加新卡牌](#7-添加新卡牌)
8. [修改起始卡组](#8-修改起始卡组)
9. [修改奖励池](#9-修改奖励池)
10. [添加新关卡](#10-添加新关卡)
11. [添加新敌人](#11-添加新敌人)
12. [添加像素图标](#12-添加像素图标)
13. [常见问题](#13-常见问题)

---

## 1. 快速上手：改一个数值

所有平衡数值集中在 **`src/config/BalanceConfig.ts`**：

```ts
// 想让炮塔更强？
export const TOWER_STATS = {
  range:         5,   // 原来是 3，改成 5
  damagePerShot: 20,  // 原来是 10，改成 20
  fireRate:      0.5, // 原来是 1.0（每秒1发），改成 0.5（每秒2发）
};

// 想让核心更抗打？
export const CORE_MAX_HEALTH = 500; // 原来是 200

// 想让核心接触反伤更高？
export const CORE_CONTACT_DAMAGE = 15; // 原来是 5

// 想让所有敌人变成两倍强？
export const ENEMY_SCALE = {
  healthMultiplier: 2.0,
  speedMultiplier:  1.5,
  damageMultiplier: 2.0,
};
```

保存文件，Vite 热更新会立刻生效，无需重启。

---

## 2. 修改地图

在 **`src/config/MapConfig.ts`** 修改：

```ts
// 修改网格大小
export const CELL   = 24;   // 每格像素大小
export const GRID_W = 32;   // 列数
export const GRID_H = 32;   // 行数

// 修改核心位置（必须是路径最后一个节点）
export const CORE_X = 29;
export const CORE_Y = 22;

// 修改敌人路径（折线，相邻节点必须同行或同列）
export const ENEMY_PATH = [
  { x: 0,  y: 5  },  // 入侵起点（左侧）
  { x: 15, y: 5  },  // 向右
  { x: 15, y: 20 },  // 向下
  { x: 29, y: 20 },  // 向右到核心区域
  { x: 29, y: 22 },  // 终点（必须 = CORE_X, CORE_Y）
];
```

**注意**：路径节点之间必须是直线（同行或同列），折线可有任意多段。

---

## 3. 修改平衡数值

文件：**`src/config/BalanceConfig.ts`**

| 常量 | 含义 | 默认值 |
|------|------|--------|
| `BELT_SPEED` | 传送带速度（格/秒） | 1.5 |
| `INPUT_BUF_MAX` | 机器输入缓冲上限（每种） | 4 |
| `PRODUCTION_SCALE.cycleTimeMultiplier` | 全局生产速度倍率 | 1.0 |
| `TOWER_STATS.range` | 炮塔射程（格） | 3 |
| `TOWER_STATS.damagePerShot` | 炮塔每发伤害 | 10 |
| `TOWER_STATS.fireRate` | 炮塔射速（秒/发） | 1.0 |
| `AMMO_BOX_CAPACITY` | 弹药箱容量（发） | 50 |
| `CORE_MAX_HEALTH` | 核心最大血量 | 200 |
| `CORE_CONTACT_DAMAGE` | 核心反伤（每次攻击） | 5 |
| `ENEMY_SCALE.*` | 敌人属性全局倍率 | 1.0 |
| `CARD_DURABILITY_DEFAULT` | 资源卡默认耐久 | 2 |

---

## 4. 添加新建筑（单格）

以"超级熔炉"为例，步骤如下：

### 步骤一：`BuildingConfig.ts` 注册类型和配置

```ts
// 1. 在 BuildingType 联合类型里加新类型名
export type BuildingType =
  | 'furnace'
  | 'super_furnace'  // ← 新增
  | ...

// 2. 在 BUILDING_CONFIGS 里加配置
super_furnace: {
  hp: 120,
  emoji: '🏭',
  color: 0xE74C3C,
  name: '超级熔炉',
  desc: '矿→板×2，0.5s/次',
  inputPorts: [{ cellDx:0, cellDy:0, relDir:2 }],  // 后方进料
  outputPort:  { cellDx:0, cellDy:0, relDir:0 },   // 前方出料
},
```

### 步骤二：`RecipeConfig.ts` 添加配方

```ts
{
  buildingType: 'super_furnace',
  variants: [
    { inputs:{iron_ore:1},   outputs:{iron_plate:2} },  // 1进2出
    { inputs:{copper_ore:1}, outputs:{copper_plate:2} },
  ],
  cycleTime: 0.5,
  accepts: ['iron_ore', 'copper_ore'],
},
```

### 步骤三：`CardConfig.ts` 添加卡牌

```ts
{
  cardId: 'super_furnace',
  type: 'production',
  buildingType: 'super_furnace',
  name: '超级熔炉',
  icon: '🏭',
  desc: '矿→板×2，0.5s/次',
  rarity: 'rare',
  unlock: { type: 'reach_level', level: 2 },
},
```

### 步骤四：`PixelIcons.ts` 添加像素图标（见第12节）

### 步骤五：`LevelConfig.ts` 加入奖励池（可选）

```ts
{ cardId: 'super_furnace', weight: 2 },
```

**完成！** 不需要修改任何 System 代码。

---

## 5. 添加新建筑（多格）

以"大型炼钢厂"（2×2）为例：

### `BuildingConfig.ts`

```ts
| 'steel_mill'   // 在 BuildingType 里加

steel_mill: {
  hp: 300, emoji: '🏗️', color: 0x2C3E50, name: '炼钢厂',
  desc: '铁矿×2 → 钢铁×1，5s',

  // 2×2 格子布局（旋转前坐标，相对锚点）
  cells: [
    { dx:0, dy:0, role:'anchor' },  // 左上（锚点）
    { dx:1, dy:0, role:'body'   },  // 右上
    { dx:0, dy:1, role:'body'   },  // 左下
    { dx:1, dy:1, role:'body'   },  // 右下
  ],

  inputPorts: [{ cellDx:0, cellDy:0, relDir:2 }],   // 锚点格后方进料
  outputPort:  { cellDx:1, cellDy:0, relDir:0 },    // 右上格前方出料
},
```

**格子坐标系（旋转前，dir=0 向右）：**
```
(dx=0,dy=0) ← 锚点    (dx=1,dy=0)
(dx=0,dy=1)            (dx=1,dy=1)
```

旋转规则（每次 90° 顺时针）：`(dx, dy) → (-dy, dx)`

| dir | 变换 |
|-----|------|
| 0（向右） | `(dx, dy)` 原样 |
| 1（向下） | `(-dy, dx)` |
| 2（向左） | `(-dx, -dy)` |
| 3（向上） | `(dy, -dx)` |

### 多方向进料

**多格建筑的任意格子（锚点或副格）都可以作为进料口。**

`ConveyorSystem.tryPush` 遇到 `multiblock_body` 时，会自动通过 `anchorId` 找到锚点，将物品推入锚点的 `inputBuf`。这意味着：

```
铁矿传送带 →→→ [左上格 = 锚点]  ←←← 铜矿传送带
                [左下格 = body] ←←← 另一种原料传送带
                [右上格 = body]
                [右下格 = body]
```

四个格子都能接收料，统一进入锚点的 `inputBuf`。玩家可以把不同原料的传送带接到不同方向/格子，无需特别配置，运行时自动路由。

`inputPorts` 字段目前仅作文档说明用途（描述"设计上"的进料口位置），不影响实际运行时的进料检测。

其余步骤（配方/卡牌/图标）同单格建筑。多格建筑的放置、预览、旋转、删除全部自动处理。

---

## 6. 添加新生产配方

文件：**`src/config/RecipeConfig.ts`**

```ts
{
  buildingType: 'circuit_assembler',
  variants: [
    { inputs:{ iron_plate:1, copper_plate:1 }, outputs:{ circuit:1 } },
  ],
  cycleTime: 3,
  accepts: ['iron_plate', 'copper_plate'],
},
```

**注意：** 新资源类型（`circuit`）需要同步更新：
1. `BuildingConfig.ts` 的 `ResourceType` 联合类型
2. `RESOURCE_COLORS` 加颜色
3. `GameState.ts` 的 `ResDisplay` 接口加字段
4. `index.html` 资源栏加 DOM 节点

---

## 7. 添加新卡牌

文件：**`src/config/CardConfig.ts`**

```ts
{
  cardId: 'rapid_belt',
  type: 'production',
  buildingType: 'rapid_conveyor',
  name: '快速传送带',
  icon: '⚡',
  desc: '速度是普通传送带的2倍',
  rarity: 'uncommon',
  unlock: { type: 'always' },
},
```

**解锁条件：**
```ts
{ type: 'always' }
{ type: 'reach_level', level: 2 }
{ type: 'win_with_core_hp', minHp: 150 }
```

---

## 8. 修改起始卡组

文件：**`src/config/LevelConfig.ts`**，`STARTER_DECKS` 数组：

```ts
{
  name: '🔥 速攻流',
  desc: '双炮快速压制',
  color: '#E74C3C',
  cardIds: [
    'iron_mine', 'iron_mine',
    'copper_mine', 'copper_mine',
    'furnace', 'furnace',
    'assembler',
    'ammo_box', 'ammo_box',
    'gun_tower', 'gun_tower', 'gun_tower',
    'wall',
  ],
},
```

---

## 9. 修改奖励池

文件：**`src/config/LevelConfig.ts`**，每关的 `rewardPool` 字段：

```ts
rewardPool: [
  { cardId: 'gun_tower',    weight: 8  },  // 权重高 = 更容易抽到
  { cardId: 'wall',         weight: 10 },
  { cardId: 'super_furnace',weight: 2  },  // 稀有，低权重
],
```

权重是相对值（加权随机，不放回抽取3个选项），删掉某条目即不会出现该卡。

---

## 10. 添加新关卡

文件：**`src/config/LevelConfig.ts`**，在 `LEVEL_CONFIGS` 末尾追加：

```ts
{
  totalWaves: 6,
  waveCooldown: 35,
  waves: [
    { groups: [{ type:'bug', count:10, interval:1.5 }] },
    { groups: [{ type:'bug', count:8,  interval:1.0 },
               { type:'tank_bug', count:3, interval:3.0 }] },
    // ...
  ],
  rewardPool: [
    { cardId:'gun_tower', weight:10 },
  ],
},
```

`LEVEL_CONFIGS.length` 决定总关卡数，`DialogManager` 自动判断最终关。

---

## 11. 添加新敌人

### `EnemyConfig.ts`

```ts
export type EnemyType = 'bug' | 'tank_bug' | 'fast_bug'; // 新增

fast_bug: {
  health:15, speed:2.5, damage:5, atkSpd:0.5,
  behavior: 'path_follow',
  emoji:'🦟', radius:12, color:0x9B59B6, name:'快速虫',
},
```

### 在 `LevelConfig.ts` 波次里使用

```ts
{ groups: [{ type:'fast_bug', count:15, interval:0.5 }] }
```

### `EnemyRenderer.ts` 添加视觉（可选）

```ts
if (e.type === 'fast_bug') {
  // 自定义绘制
} else {
  drawBugFace(v.faceGfx, cx, cy, r);
}
```

---

## 12. 添加像素图标

文件：**`src/scene/renderer/PixelIcons.ts`**

```ts
export function drawMyBuilding(g: G, cx: number, cy: number, s: number): void {
  const u = s / 32;  // u 是单位像素，整个图标在 [-16u, +16u] 范围内绘制

  // 主体
  g.fillStyle(0x2471A3, 1);
  g.fillRect(cx - 10*u, cy - 10*u, 20*u, 20*u);

  // 细节（十字形）
  g.fillStyle(0xFFFFFF, 0.5);
  g.fillRect(cx - 4*u, cy - 1*u, 8*u, 2*u);  // 横线
  g.fillRect(cx - 1*u, cy - 4*u, 2*u, 8*u);  // 竖线
}

// 注册
export const BUILDING_DRAW_FN: Record<string, DrawFn> = {
  // ...
  my_building: drawMyBuilding,
};

// 如果该建筑随 dir 旋转，加入：
const ROTATABLE = [..., 'my_building'];
```

**技巧：**
- 只用 `fillRect`，不用线段（线段有抗锯齿）
- 高光用 `0xFFFFFF, 0.15~0.3`，阴影用 `0x000000, 0.2~0.4`
- 图标在约 17px 下仍需可辨认，突出最重要的轮廓特征

---

## 13. 常见问题

**Q：改了配置，页面没变化？**  
Vite 热更新有时需要 Ctrl+R 手动刷新。如有 TypeScript 错误，检查终端输出。

**Q：新建筑放置后图标不显示？**  
检查 `PixelIcons.BUILDING_DRAW_FN` 是否已注册该类型。

**Q：新建筑放置后没有方向旋转提示？**  
在 `BuildingConfig.HAS_OUTPUT_DIR` 数组里加该类型。

**Q：多格建筑旋转后格子位置不对？**  
检查 `cells` 里的 `dx/dy`。锚点格必须 `dx=0, dy=0`。  
旋转一次：`(dx,dy) → (-dy,dx)`。手动推算四个方向验证。

**Q：传送带对准多格机器的副格，物品进不去？**  
已修复。`ConveyorSystem.tryPush` 遇到 `multiblock_body` 时会自动通过 `anchorId` 路由到锚点的 `inputBuf`，任意格子均可进料，无需额外配置。

**Q：分流器只有锚点格工作，副格不动？**  
副格（`multiblock_body`）的物品需要被 `tickSplitter` 同步到 `anchor.itemB`。  
确认副格的 `anchorId` 正确指向锚点建筑的 `id`。

**Q：想加新资源类型（比如"钢铁"）？**  
需要改多处：
1. `BuildingConfig.ResourceType` 联合类型
2. `RESOURCE_COLORS` 加颜色
3. `GameState.ResDisplay` 接口加字段
4. `ProductionSystem.rebuildResDisplay` 里统计
5. `index.html` 资源栏加 DOM 节点
6. `HudManager.updateResources` 里更新 DOM

**Q：想在防御阶段也能放置建筑？**  
`GameScene.onPtrDown` 里有 `this.gs.phase === 'prepare'` 判断，删掉即可。
