# 系统架构与代码运行原理

> 本文档与当前代码保持同步（branch: feature/data-driven）。  
> 如果你在阅读中发现和代码不一致，以代码为准。

---

## 目录

1. [目录结构](#1-目录结构)
2. [整体分层架构](#2-整体分层架构)
3. [入口：`main.ts`](#3-入口-maints)
4. [游戏启动流程](#4-游戏启动流程)
5. [每帧主循环](#5-每帧主循环)
6. [Config 层：静态数据](#6-config-层静态数据)
7. [Model 层：运行时状态](#7-model-层运行时状态)
8. [System 层：游戏逻辑](#8-system-层游戏逻辑)
9. [Scene / Renderer 层：视觉](#9-scene--renderer-层视觉)
10. [UI 层：DOM 操作](#10-ui-层dom-操作)
11. [Utils 层：工具函数](#11-utils-层工具函数)
12. [关键机制详解](#12-关键机制详解)
13. [数据流向总览](#13-数据流向总览)

---

## 1. 目录结构

```
src/
├── main.ts                  入口，启动 Phaser，暴露 window 接口
├── config/                  静态配置（纯数据，无逻辑）
│   ├── MapConfig.ts           地图尺寸、格子大小、敌人路径
│   ├── BalanceConfig.ts       平衡数值（速度、伤害、倍率）
│   ├── BuildingConfig.ts      建筑类型、外观、多格布局、端口
│   ├── EnemyConfig.ts         敌人属性、AI行为标签
│   ├── RecipeConfig.ts        生产配方（输入→输出）
│   ├── CardConfig.ts          卡牌元数据（稀有度、解锁条件）
│   ├── LevelConfig.ts         关卡波次、起始卡组、奖励池
│   └── GameConfig.ts          重导出文件（向后兼容）
├── model/                   运行时数据（只有数据和简单CRUD）
│   ├── Building.ts            单个建筑对象
│   ├── Enemy.ts               单个敌人对象
│   ├── Card.ts                卡牌数据
│   └── GameState.ts           游戏全局状态（网格、手牌、波次…）
├── system/                  游戏逻辑（读Config，改Model）
│   ├── ConveyorSystem.ts      传送带/分流器/地下带流动
│   ├── ProductionSystem.ts    矿节点产矿、机器加工
│   ├── EnemySystem.ts         敌人AI（移动、攻击）
│   ├── DefenseSystem.ts       炮塔攻击
│   └── WaveSystem.ts          波次管理
├── scene/                   Phaser 场景（协调所有层）
│   ├── GameScene.ts           主场景（Composition Root）
│   └── renderer/              各视觉层渲染器
│       ├── GridRenderer.ts      网格底图 + 敌人路径
│       ├── BuildingRenderer.ts  建筑底色 + 图标 + 血条
│       ├── EnemyRenderer.ts     敌人圆形 + 血条
│       ├── BeltRenderer.ts      传送带上流动的资源点
│       ├── EffectRenderer.ts    子弹飞行 + 爆炸特效
│       ├── HoverRenderer.ts     鼠标悬停预览（含多格建筑）
│       └── PixelIcons.ts        纯 Phaser Graphics 像素图标库
├── ui/                      DOM UI 管理
│   ├── HudManager.ts          顶部信息栏（核心HP、波次）
│   ├── CardManager.ts         手牌栏渲染和点击
│   ├── DialogManager.ts       弹窗（选卡组、胜利、失败）
│   └── DebugPanel.ts          Debug 日志面板
└── utils/                   工具函数
    ├── GridUtils.ts           格子路径计算、障碍检测
    ├── MultiBlockUtils.ts     多格建筑旋转/占用格计算
    └── DebugLogger.ts         带节流的日志工具
```

---

## 2. 整体分层架构

```
┌──────────────────────────────────────────────────────────────┐
│  index.html  (HTML结构 + CSS像素风样式)                       │
│    └── <script type="module" src="/src/main.ts">             │
└────────────────────────────┬─────────────────────────────────┘
                             │ Vite 热更新构建
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  main.ts  (入口)                                             │
│    ├── new Phaser.Game → 挂载 GameScene                      │
│    └── window.startDefense / activateTool / setSpeed …      │
└────────────────────────────┬─────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  GameScene  (Composition Root，协调所有层)                    │
│  ┌──────────┐  ┌────────────────────┐  ┌─────────────────┐  │
│  │GameState │  │  5 Systems（逻辑）  │  │ 6 Renderers（视觉）│ │
│  │（数据）  │  │  Conveyor          │  │ Grid            │  │
│  │  grid    │  │  Production        │  │ Building        │  │
│  │  enemies │  │  Enemy             │  │ Enemy           │  │
│  │  hand    │  │  Defense           │  │ Belt            │  │
│  │  wave…   │  │  Wave              │  │ Effect / Hover  │  │
│  └──────────┘  └────────────────────┘  └─────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  4 UI Managers (DOM)                                 │   │
│  │  Hud / Card / Dialog / Debug                         │   │
│  └───────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────┘
            ┌────────────────┴──────────────────┐
            ▼                                   ▼
┌──────────────────┐                 ┌──────────────────┐
│  src/config/     │                 │  src/model/      │
│  （只读静态数据）  │                 │  （运行时可变状态）│
└──────────────────┘                 └──────────────────┘
```

**分层原则：**
- **Config** 纯数据，任何人可读，无人修改
- **Model** 运行时状态，只有简单的 CRUD 方法
- **System** 游戏逻辑，只读 Config，只改 Model
- **Renderer** 只读 Model，只写 Phaser 对象
- **UI** 只读 Model，只写 DOM
- **GameScene** 唯一了解所有层的协调者，接受输入事件并分发

---

## 3. 入口 `main.ts`

```
浏览器加载 index.html
  → Vite 加载 /src/main.ts
  → 编译 TypeScript → 执行
```

做三件事：

**① 启动 Phaser**
```ts
const game = new Phaser.Game({
  width: CANVAS_W,   // 768px（32格 × 24px）
  height: CANVAS_H,
  scene: [GameScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
```
Phaser 创建 WebGL 渲染器，挂到 `#game-area`，自动调用 `GameScene.create()`。

**② 捕获场景引用**
```ts
game.events.on('ready', () => {
  gameScene = game.scene.getScene('GameScene') as GameScene;
});
```

**③ 暴露 window 接口**（供 HTML 按钮调用）
```ts
window.startDefense  = () => gameScene?.startDefense();
window.activateTool  = (tool) => gameScene?.activateTool(tool);
window.setSpeed      = (spd) => gameScene?.setTimeSpeed(spd);
window.toggleDebug   = () => ...;
```
HTML 里的 `onclick="startDefense()"` 最终调用的就是这里。

---

## 4. 游戏启动流程

```
GameScene.create()
  ├── 创建所有 Renderer（Grid/Building/Enemy/Belt/Effect/Hover）
  ├── 创建所有 UI Manager（Hud/Card/Dialog/Debug）
  ├── 绑定输入（pointerdown / pointermove / keydown-R）
  └── startNewGame(level=1)
        ├── new GameState(1)          创建空游戏状态
        ├── initSystems()             创建5个System实例（注入回调）
        ├── resetScene(false)         绘制网格、放置核心建筑
        └── dialog.showStarterDeckDialog()   弹出选卡弹窗
              └── 玩家选择后 onDeckPicked(idx)
                    ├── CardConfig 查询 cardId → CardData
                    └── gs.hand = 选中的卡牌列表
```

---

## 5. 每帧主循环

`GameScene.update(time, delta)` 每帧调用：

```
dt = (delta / 1000) * gs.timeSpeed   // 实际经过秒数（含加速）

if (phase === 'prepare'):
  // 只跑传送带动画，不生产
  conveyorSys.update(gs, dt)

if (phase === 'defense'):
  conveyorSys.update(gs, dt)    ← 传送带物品流动
  productionSys.update(gs, dt)  ← 矿节点/熔炉/组装机
  waveSys.update(gs, dt)        ← 波次倒计时/敌人生成
  enemySys.update(gs, dt)       ← 敌人AI
  defenseSys.update(gs, dt)     ← 炮塔攻击

// 始终执行（包括 result 阶段）
effectRenderer.update(dt)       ← 子弹/爆炸动画推进
beltRenderer.render(gs.buildings)
enemyRenderer.render(gs.enemies)
effectRenderer.render()
for b in gs.buildings: buildingRenderer.refresh(b)  ← 血条/弹药数刷新
hud.updateCoreHp(gs)
if (每100ms): hud.updateResources / updateTopBar
```

注意：`paused=true` 或 `gameOver=true` 时直接 return，不执行任何更新。

---

## 6. Config 层：静态数据

所有配置文件都是**纯 TypeScript 常量**，不含任何逻辑，可以随时修改数值。

### `MapConfig.ts`
```ts
CELL   = 24         // 每格像素
GRID_W = 32         // 网格宽
GRID_H = 32         // 网格高
CORE_X = 29, CORE_Y = 22   // 核心位置
ENEMY_PATH = [{x,y}, ...]   // 敌人路径节点列表
```

### `BalanceConfig.ts`
所有可调平衡数值的唯一来源：
```ts
BELT_SPEED = 1.5           // 传送带格/秒
TOWER_STATS = { range, damagePerShot, fireRate }
CORE_MAX_HEALTH = 200
CORE_CONTACT_DAMAGE = 5    // 敌人攻击核心时的反伤
ENEMY_SCALE = { healthMultiplier, speedMultiplier, damageMultiplier }
```

### `BuildingConfig.ts`
每种建筑类型的完整定义，包括**多格建筑布局**：
```ts
interface BuildingCfg {
  hp, emoji, color, name, desc  // 基础属性
  cells?: CellDef[]             // 多格建筑格子布局（旋转前坐标）
  inputPorts?: PortDef[]        // 输入端口（传送带从哪个方向喂料）
  outputPort?: PortDef          // 输出端口（产物推向哪个方向）
}

interface CellDef {
  dx: number   // 相对锚点列偏移（旋转前）
  dy: number   // 相对锚点行偏移（旋转前）
  role: 'anchor' | 'body'
}
```

**分流器配置示例：**
```ts
splitter: {
  cells: [
    { dx:0, dy:0, role:'anchor' },  // 上格（主格）
    { dx:0, dy:1, role:'body'   },  // 下格
  ],
  inputPorts:  [{ cellDx:0, cellDy:0, relDir:2 },   // 上格后方
                { cellDx:0, cellDy:1, relDir:2 }],  // 下格后方
  outputPort:  { cellDx:0, cellDy:0, relDir:0 },    // 上格前方
}
```

### `RecipeConfig.ts`
所有生产配方，配方驱动 `ProductionSystem`：
```ts
{ buildingType: 'furnace',
  variants: [
    { inputs:{iron_ore:1},   outputs:{iron_plate:1} },
    { inputs:{copper_ore:1}, outputs:{copper_plate:1} },
  ],
  cycleTime: 2,
  accepts: ['iron_ore','copper_ore'] }
```

### `CardConfig.ts`
卡牌元数据。奖励池和起始卡组用 `cardId` 引用：
```ts
{ cardId: 'gun_tower', type: 'defense', buildingType: 'gun_tower',
  rarity: 'uncommon',
  unlock: { type: 'always' } }
```

### `LevelConfig.ts`
- `LEVEL_CONFIGS[]` — 每关波次配置 + per-level 奖励池（带权重）
- `STARTER_DECKS[]` — 三套起始卡组（用 `cardId[]` 列表描述）

---

## 7. Model 层：运行时状态

### `Building`
```ts
class Building {
  id, x, y, type, dir       // 基础位置和类型
  health, maxHealth          // 当前/最大血量
  sourceCard                 // 放置它的手牌（移除时归还）

  // 传送带
  item: BeltItem | null      // 本格的传输槽（progress 0→1）
  itemB: BeltItem | null     // 分流器副槽（由 splitter 锚点管理）
  outToggle: number          // 分流器输出轮换（0/1）

  // 多格建筑
  anchorId: number | null    // 副格（multiblock_body）指向锚点id

  // 地下传送带
  pairId: number | null      // in↔out 配对

  // 机器
  prodTimer, lastOutput, inputBuf

  // 炮塔
  fireCooldown, noAmmo

  // 弹药箱
  ammo, ammoMax
}
```

### `GameState`
游戏全局状态的唯一真相来源：
```ts
class GameState {
  phase: 'prepare' | 'defense' | 'result'
  level, timeSpeed, paused, gameOver
  coreHealth, coreMaxHealth

  // 网格
  grid: (Building|null)[][]  // [y][x]
  buildings: Building[]

  // 波次
  waveCurrent, waveTotal, waveInProgress, waveCooldown …

  // 敌人
  enemies: Enemy[]

  // 手牌和 UI 状态
  hand: CardData[]
  selectedCard, beltTool, selectedDir
  undergroundPending  // 地下传送带放置中的入口

  // 方法
  placeBuilding(x, y, type, dir, card): Building | null
  placeMultiBuilding(...)  // 多格建筑一次放置所有格子
  removeBuilding(x, y)     // 自动处理多格（找到锚点再移除）
  removeByAnchor(anchor)   // 直接通过锚点移除所有相关格
  destroyBuilding(b)       // 战斗中被摧毁（不归还手牌）
  findAnchor(b)            // 从任意格找到锚点建筑
}
```

### `beltTool` 状态机
```
'none'        → 未选中任何工具
'conveyor'    → 传送带放置模式
'splitter'    → 分流器放置模式（一次放2格）
'underground' → 地下传送带模式（两步：先入口再出口）
```
`beltMode` 是一个 getter，等于 `beltTool !== 'none'`（向后兼容）。

---

## 8. System 层：游戏逻辑

每个 System 都是一个无状态的服务类，通过构造函数注入回调，依赖 `GameState` 读写数据。

### `ConveyorSystem`
负责所有传送带类建筑（conveyor / splitter / multiblock_body / underground_in/out）的物品流动。

**核心循环（每帧，倒序遍历）：**
```
for belt in belts (倒序):
  belt.item.progress += BELT_SPEED * dt
  if progress >= 1.0:
    根据类型分发：
      conveyor      → flushConveyor()      推入前方格
      splitter      → tickSplitter()       均摊到两个出口
      underground_in→ flushUndergroundIn() 瞬间跳到出口
      underground_out → flushConveyor()    同普通传送带
```

**分流器逻辑：**
```
tickSplitter(anchor):
  1. 把 body.item 同步到 anchor.itemB
  2. outA = anchor 前方格，outB = body 前方格
  3. anchor.item >= 1.0 → flushSplitterSlot('a', outA, outB)
  4. anchor.itemB >= 1.0 → flushSplitterSlot('b', outA, outB)

flushSplitterSlot(slot, outA, outB):
  按 outToggle 决定先推哪个出口
  成功 → outToggle 取反
  两个都堵 → progress = 1.0 等待
```

### `ProductionSystem`
配方驱动的机器加工：
```
for building in buildings:
  if 矿节点: 计时到1s → 推入前方传送带
  if 有配方: 计时到 cycleTime → selectVariant() → outputProducts()
    outputProducts(): 产物推入 outputPort 前方传送带
    堵塞时还原原料等待
```

### `EnemySystem`
```
for enemy:
  flashTimer 递减
  moving → moveEnemy()
    检查路径上障碍 → 到达目标点 → pathIndex++
    到达终点 → 攻击核心
  attacking → attackEnemy()
    目标是'core' → 攻击核心 + CORE_CONTACT_DAMAGE 反伤
    目标是建筑 → 攻击建筑，死亡则 destroyBuilding + 继续前进
```

### `DefenseSystem`
```
for gun_tower:
  找相邻弹药箱 → 无弹药则 noAmmo=true，返回
  fireCooldown 递减
  找射程内最接近核心的敌人
  消耗1发弹药 → 触发 onBulletFired 回调 → 立即结算伤害
```

### `WaveSystem`
```
处理 spawnQueue (每帧减 spawnTimer)
  → timer <= 0 → 调 onSpawnEnemy(type) 创建敌人

检测波次结束:
  alive === 0 && spawnQueue 空 && spawnTimer <= 0
    → 若全部波次完成 → onAllWavesDone()（胜利）
    → 否则 waveCooldown 倒计时 → 结束后 launchNextWave()
```

---

## 9. Scene / Renderer 层：视觉

### `GameScene`（总控制器）
- **唯一**接收鼠标/键盘输入的地方
- `onPtrDown()` 处理放置/删除建筑逻辑
- `activateTool(tool)` 切换工具模式并更新按钮高亮
- `placeUnderground()` 两步放置地下传送带
- 通过构造函数回调将事件从 System 传回 Scene（如 `onCoreAttacked`）

### `BuildingRenderer`
每个建筑**独立一个 `bgGfx` Graphics 对象**（底色+边框）：
```
add(b): bgGfx + iconGfx + hpBg/hpBar + ammoTxt + warnGfx
remove(b): 全部 destroy()（不写任何覆盖像素，路径层透出）
refresh(b): 只更新血条颜色和弹药箱数字
```

### `HoverRenderer`
```
_render(ptrX, ptrY, gs):
  if beltTool === 'splitter':
    用 getOccupiedCells 计算分流器的2格占用
    渲染两格预览轮廓（绿=可放/红=不可放）
  else if selectedCard:
    getOccupiedCells 渲染所有占用格
    锚点格画图标，body格画底色填充
  if 悬停在机枪塔: 画射程圈
```

### `PixelIcons`
所有建筑/敌人图标均为纯 `Phaser.Graphics` 绘制，无图片依赖。
```ts
drawBuildingIcon(scene, {type, x, y, dir}, cell, depth)
  → 以 (0,0) 为中心画图标
  → setPosition(格子中心)
  → 若 ROTATABLE 类型：setAngle(dir * 90)
```

---

## 10. UI 层：DOM 操作

全部通过 `document.getElementById` 操作 HTML 元素，不使用任何前端框架。

| Manager | 职责 |
|---------|------|
| `HudManager` | 核心HP、波次、倒计时、阶段标签 |
| `CardManager` | 手牌渲染（像素色块图标）+ 卡牌点击 |
| `DialogManager` | 起始卡组弹窗、胜利/失败弹窗（按权重从 rewardPool 抽奖励） |
| `DebugPanel` | 将 `logger` 日志挂到 DOM，支持按 tag 过滤 |

---

## 11. Utils 层：工具函数

### `MultiBlockUtils.ts`
多格建筑的核心计算：
```ts
// 旋转一次：(dx, dy) → (-dy, dx)
rotateCells(cells, dir): 将所有格子偏移按 dir 旋转

// 计算世界坐标
getOccupiedCells(anchorX, anchorY, cells, dir): { x, y, role }[]

// 端口方向：相对 → 绝对
resolvePortDir(relDir, buildingDir): 0..3
```

**旋转规则：**

| dir | (dx, dy) → | 含义 |
|-----|-----------|------|
| 0   | (dx, dy)  | 原始方向（向右） |
| 1   | (-dy, dx) | 顺时针90°（向下） |
| 2   | (-dx, -dy)| 180°（向左） |
| 3   | (dy, -dx) | 270°（向上） |

### `GridUtils.ts`
- `beltNextPos(b)` — 建筑 dir 方向的下一格坐标
- `getPathCells()` — 敌人路径覆盖的所有格坐标
- `findBlockingBuilding(gs, pathIndex, gx, gy)` — 寻找路径上的阻挡建筑

### `DebugLogger.ts`
带节流（0.5s）的日志系统，支持 6 种 tag：belt / prod / ammo / tower / warn / info。

---

## 12. 关键机制详解

### 多格建筑系统

放置流程：
```
placeMultiBuilding(anchorX, anchorY, type, dir, card)
  1. getOccupiedCells(anchorX, anchorY, cfg.cells, dir)
  2. 检查所有格子是否为空且在网格内
  3. 锚点格: placeBuilding(x, y, type, dir, card)
  4. 副格:   placeBuilding(x, y, 'multiblock_body', dir, null)
             body.anchorId = anchor.id
```

删除流程：
```
removeByAnchor(anchor)
  1. getOccupiedCells 找到所有格子
  2. 逐格 grid[y][x] = null，从 buildings 移除
```

副格 `multiblock_body` 通过 `anchorId` 总能找到主逻辑所在的锚点格。

### 传送带背压

```
矿节点产矿 → 推入前方传送带（空槽）
             ↓ 失败（满）
             保持 prodTimer = 1.0，下帧继续尝试（不丢弃）

熔炉加工完成 → 推入 outputPort 前方传送带
               ↓ 失败
               还原消耗的原料 → prodTimer = cycleTime - 0.01（立即重试）
```

### 坐标系

- `ptr.worldX / ptr.worldY` — Phaser 画布逻辑坐标（已处理 Scale.FIT 缩放）
- 格坐标 `(gx, gy)` = `Math.floor(worldX / CELL)`
- 像素中心 = `gx * CELL + CELL/2`
- 敌人使用浮点格坐标 `(e.gx, e.gy)`，渲染时转像素

---

## 13. 数据流向总览

```
用户点击格子
  → GameScene.onPtrDown(ptr)
  → gx = worldX / CELL
  → gs.placeMultiBuilding(gx, gy, type, dir, card)
  → buildingRenderer.add(b)（每个建筑格子各一次）

每帧 update:
  ConveyorSystem
    belt.item.progress += BELT_SPEED * dt
    progress >= 1 → tryPush(gs, item, nx, ny)
      → 目标格 item = {type, progress:0}

  ProductionSystem
    矿节点 prodTimer += dt → 推入传送带（beltNextPos）
    熔炉/组装机 → selectVariant → outputProducts → 传送带

  EnemySystem
    e.gx += e.speed * dt → 到路径点 → pathIndex++
    攻击建筑 → b.health-- → isDead → gs.destroyBuilding(b) → 回调

  DefenseSystem
    tower → findNearbyAmmoBox → ammoBox.ammo-- → takeDamage(10)
    → 回调 onBulletFired(fx,fy,tx,ty) → effectRenderer.spawnBullet

  渲染层读 gs.buildings / gs.enemies → Phaser Graphics 更新
  UI层读 gs.resDisplay / gs.core.health → DOM 更新
```
