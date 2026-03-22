# 系统架构与代码运行原理

本文档从入口开始，逐层解释游戏代码的执行流程和架构设计。

---

## 目录

1. [整体架构图](#1-整体架构图)
2. [入口：main.ts](#2-入口maints)
3. [游戏启动流程](#3-游戏启动流程)
4. [每帧主循环](#4-每帧主循环)
5. [五大系统详解](#5-五大系统详解)
6. [数据模型层](#6-数据模型层)
7. [配置层](#7-配置层)
8. [渲染层](#8-渲染层)
9. [UI 层](#9-ui-层)
10. [工具层](#10-工具层)
11. [数据流向总览](#11-数据流向总览)
12. [关键设计决策](#12-关键设计决策)

---

## 1. 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│  index.html  (UI 布局 + 样式)                               │
│    ├── 顶部信息栏、资源栏、卡牌栏                            │
│    └── <script type="module" src="/src/main.ts">            │
└─────────────────────────────────────────────────────────────┘
                          │ Vite 构建
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  src/main.ts  (入口)                                        │
│    └── new Phaser.Game → 挂载 GameScene                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  GameScene  (总控制器 / Composition Root)                   │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ GameState│  │   5 Systems  │  │   6 Renderers      │    │
│  │  (数据)  │  │  (逻辑)      │  │   (视觉)           │    │
│  └──────────┘  └──────────────┘  └────────────────────┘    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  4 UI Managers  (DOM 操作)                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
┌─────────────────┐               ┌─────────────────┐
│  src/config/    │               │  src/model/     │
│  （静态数据）    │               │  （运行时数据）   │
└─────────────────┘               └─────────────────┘
```

**分层原则：**

- **Config 层** — 纯数据，无逻辑，可随时修改
- **Model 层** — 运行时状态，只包含数据和简单的 CRUD 方法
- **System 层** — 游戏逻辑，读取 Config + 修改 Model
- **Renderer 层** — 将 Model 的状态转化为 Phaser 视觉
- **UI 层** — 将 Model 的状态转化为 DOM 元素
- **GameScene** — 唯一知道所有层的组合根，协调一切

---

## 2. 入口：`main.ts`

```
浏览器加载 index.html
  → <script type="module" src="/src/main.ts">
  → Vite 编译 TypeScript → 执行 main.ts
```

`main.ts` 做三件事：

### 2.1 启动 Phaser

```ts
const game = new Phaser.Game({
  width: CANVAS_W,   // 500px（10格 × 50px）
  height: CANVAS_H,  // 500px
  parent: 'game-area',
  scene: [GameScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
```

Phaser 创建一个 WebGL（或 Canvas）渲染器，挂载到 `#game-area` 元素内，然后自动调用 `GameScene.create()`。

### 2.2 捕获场景引用

```ts
game.events.on('ready', () => {
  gameScene = game.scene.getScene('GameScene') as GameScene;
});
```

Phaser 的 `ready` 事件在所有场景初始化完成后触发。之后 `gameScene` 就是可调用的场景实例。

### 2.3 将函数挂到 `window`

```ts
w['startDefense']   = () => gameScene?.startDefense();
w['toggleBeltMode'] = () => gameScene?.toggleBeltMode();
w['setSpeed']       = (spd) => { gameScene?.setTimeSpeed(spd); updateSpeedBtns(spd); };
```

HTML 中的按钮使用 `onclick="startDefense()"` 这样的行内事件，需要在 `window` 上能找到这些函数。这是连接 DOM UI 和 TypeScript 游戏逻辑的桥梁。

---

## 3. 游戏启动流程

```
GameScene.create()
  │
  ├─ 初始化 UI 管理器（HudManager, CardManager, DialogManager, DebugPanel）
  │
  ├─ 初始化渲染器（GridRenderer, BuildingRenderer, BeltRenderer,
  │                EffectRenderer, EnemyRenderer, HoverRenderer）
  │
  ├─ 注册输入事件（pointerdown, pointermove, keydown-R）
  │
  └─ startNewGame(1)
       │
       ├─ resetCardId()         // 卡牌 ID 从 1 重新计数
       ├─ new GameState(1)      // 创建第 1 关的游戏状态
       ├─ initSystems()         // 创建 5 个 System 实例，注入回调
       ├─ resetScene(false)     // 清空渲染器，绘制网格，放置核心建筑
       └─ dialog.showStarterDeckDialog()  // 弹出起始卡组选择弹窗
```

### 关键：`initSystems()` 的依赖注入

```ts
private initSystems(): void {
  this.conveyorSys   = new ConveyorSystem();
  this.productionSys = new ProductionSystem();

  this.enemySys = new EnemySystem(
    damage => this.onCoreAttacked(damage),      // 核心受攻击时的回调
    b      => this.onBuildingDestroyed(b),      // 建筑被摧毁时的回调
  );

  this.defenseSys = new DefenseSystem(
    (fx, fy, tx, ty) => this.effectRenderer.spawnBullet(fx, fy, tx, ty),  // 子弹动画
  );

  this.waveSys = new WaveSystem(
    waveNum => this.showWaveAnnounce(`第 ${waveNum} 波来袭！`),
    type    => this.enemySys.spawnEnemy(this.gs, type),
    ()      => this.triggerVictory(),
    secs    => this.hud.showCountdown(secs),
  );
}
```

每个 System 通过构造函数接收回调，**不直接引用 `GameScene`**。这样 System 只依赖 `GameState`，与渲染和 UI 完全解耦，方便单独测试。

---

## 4. 每帧主循环

Phaser 每帧调用 `GameScene.update(time, delta)`，`delta` 是距上帧的毫秒数。

```ts
update(_time: number, delta: number): void {
  if (!this.gs || this.gs.paused || this.gs.gameOver) return;

  // dt = 本帧实际经过的游戏秒数（已乘时间倍率）
  const dt = (delta / 1000) * this.gs.timeSpeed;

  // 准备阶段：只跑传送带动画（不生产）
  if (this.gs.phase === 'prepare') {
    this.conveyorSys.update(this.gs, dt);
  }

  // 防御阶段：完整流水线
  if (this.gs.phase === 'defense') {
    this.conveyorSys.update(this.gs, dt);   // ① 传送带物品流动
    this.productionSys.update(this.gs, dt); // ② 机器生产
    this.waveSys.update(this.gs, dt);       // ③ 波次管理
    this.enemySys.update(this.gs, dt);      // ④ 敌人移动/攻击
    this.defenseSys.update(this.gs, dt);    // ⑤ 炮塔射击
  }

  // 特效动画（始终更新）
  this.effectRenderer.update(dt);

  // 渲染（每帧全量重绘动态元素）
  this.beltRenderer.render(this.gs.buildings);
  this.enemyRenderer.render(this.gs.enemies);
  this.effectRenderer.render();
  for (const b of this.gs.buildings) this.buildingRenderer.refresh(b);

  // UI 节流更新（每隔约 200ms）
  if (Math.floor(_time / 100) % 2 === 0) {
    this.hud.updateResources(this.gs);
    this.hud.updateTopBar(this.gs);
  }
  this.hud.updateCoreHp(this.gs);
}
```

**更新顺序的设计意图：**

1. 传送带先于生产更新 — 这帧推进物品，下帧机器才能看到新物品
2. 生产先于波次 — 让工厂有机会在敌人到来前积累弹药
3. 波次先于敌人 — 先触发新敌人生成，再让所有敌人移动
4. 敌人先于防御 — 敌人移动到新位置后，炮塔才能精确瞄准

---

## 5. 五大系统详解

### 5.1 ConveyorSystem — 传送带流动

**职责：** 每帧推进传送带上物品的 `progress`（0→1），到达 1 时推入下游。

```
传送带格子数据结构：
  Building {
    type: 'conveyor',
    dir: 0|1|2|3,        // 0=右 1=下 2=左 3=上
    item: {              // null = 空，有物品时 = BeltItem
      type: 'iron_ore',
      progress: 0.0~1.0, // 物品在本格的传输进度
      qty: 1,            // 批量数量（子弹为5）
    }
  }

每帧执行（倒序遍历，末端优先）：
  b.item.progress += BELT_SPEED × dt

  当 progress >= 1.0 时，尝试 tryPushItem(item, 下游格):
    → 下游是传送带且为空：item 移入下游，本格清空
    → 下游是机器（有配方）：调用 pushToMachineInput，加入 inputBuf
    → 下游是弹药箱且 item.type === 'bullet'：直接存入 ammo
    → 其他情况（满/不接受）：progress 锁定在 1.0，等待（背压）
```

**背压机制：** 下游满时上游自动停止，不丢弃物品。这是传送带系统的核心特性，让整条生产线自然限速。

### 5.2 ProductionSystem — 机器生产

**职责：** 矿节点产矿，加工机器按配方消耗 `inputBuf` 并输出产物到传送带。

```
矿节点（iron_ore_node / copper_ore_node）：
  每秒尝试向 b.dir 方向的传送带格放入一个矿石
  如果传送带满：等待（背压，计时器不消耗）

加工机器（furnace / assembler）：
  1. b.prodTimer += dt
  2. 当 prodTimer >= recipe.cycleTime 时执行生产：
     a. selectVariant(recipe, b)：
        - 单配方：检查 inputBuf 是否有足够原料
        - 多配方（熔炉）：优先选上次未执行的 variant（交替策略）
     b. 扣减 inputBuf 中的原料
     c. 尝试将产物推入 b.dir 方向的传送带
        - 成功：prodTimer = 0，等待下个周期
        - 失败（传送带满）：还原原料，prodTimer = cycleTime-0.01，下帧重试
```

所有配方从 `RecipeConfig.RECIPE_MAP` 读取，`ProductionSystem` 本身不含任何配方数据。

### 5.3 EnemySystem — 敌人 AI

**职责：** 敌人生成、沿路径移动、遇到建筑停下攻击、到达核心攻击核心。

```
敌人数据：
  Enemy {
    gx, gy: 格坐标（浮点，表示当前精确位置）
    pathIndex: 下一个目标路径节点索引
    state: 'moving' | 'attacking' | 'dead'
    target: Building | 'core' | null
  }

moveEnemy() 每帧：
  1. 调用 findBlockingBuilding() 扫描当前路径段上的阻挡建筑
     → 有：切换 state = 'attacking'，target = 阻挡建筑
  2. 没有阻挡：向 ENEMY_PATH[pathIndex] 移动（线性插值）
  3. 到达路径节点：pathIndex++
     → pathIndex >= 路径长度：切换为攻击核心

attackEnemy() 每帧：
  1. atkCooldown -= dt
  2. 当 atkCooldown <= 0 时攻击目标：
     → target = 'core'：对 gs.coreHealth 扣血，触发 onCoreAttacked 回调
     → target = Building：building.takeDamage(damage)
        - 建筑血量 <= 0：destroyBuilding()，触发 onBuildingDestroyed 回调，
          切回 moving 状态继续前进
  3. 检查 target 建筑是否还存在（可能被炮塔先打死），若不存在则继续移动
```

**关键：** `findBlockingBuilding()`（在 `GridUtils.ts`）逐格扫描当前路径段，不只检查节点，确保路径中间放的建筑也能被检测到。

### 5.4 DefenseSystem — 炮塔射击

**职责：** 每帧检查机枪塔状态，寻找射程内目标并射击。

```
updateTower() 每帧：
  1. fireCooldown -= dt
  2. 检查相邻4格是否有弹药箱且 ammo > 0
     → 没有：noAmmo = true，返回（不射击）
  3. fireCooldown > 0：返回（冷却中）
  4. pickTarget()：找射程内存活敌人
     → 优先 pathIndex 最大的（最接近核心）
     → pathIndex 相同时取距核心最近的
  5. 消耗弹药：ammoBox.ammo--，fireCooldown = TOWER_STATS.fireRate
  6. 触发 onBulletFired 回调（通知渲染层产生子弹动画）
  7. target.takeDamage(TOWER_STATS.damagePerShot)
```

伤害**立即结算**，子弹动画只是视觉效果，不影响游戏逻辑。

### 5.5 WaveSystem — 波次管理

**职责：** 管理敌人生成队列、检测波次结束、触发倒计时和胜利条件。

```
状态机：
  gs.waveCounting = true  →  倒计时阶段
  gs.waveInProgress = true →  波次进行中

倒计时阶段（waveCounting）：
  waveCooldown -= dt
  → cooldown <= 0：launchNextWave()

launchNextWave()：
  waveCurrent++
  waveInProgress = true
  构建 spawnQueue（从 LEVEL_CONFIGS[level-1].waves[waveCurrent-1] 读取）
  spawnTimer = 0.5  // 第一个敌人 0.5 秒后出现

波次进行中：
  spawnTimer -= dt
  → <= 0：从 spawnQueue 取出一条，调用 onSpawnEnemy(type) 回调
           spawnTimer = 下一条的 delay

波次结束检测（每帧）：
  如果 spawnQueue 为空 且 场上存活敌人为 0 且 spawnTimer <= 0：
    waveInProgress = false
    → waveCurrent >= waveTotal：调用 onAllWavesDone()（触发胜利）
    → 否则：waveCooldown = levelCfg.waveCooldown，waveCounting = true
```

---

## 6. 数据模型层

### 6.1 GameState — 游戏状态的唯一真实来源

```ts
class GameState {
  phase: 'prepare' | 'defense' | 'result'
  level: number
  timeSpeed: number
  paused: boolean
  gameOver: boolean

  coreHealth: number
  grid: (Building | null)[][]   // 10×10 网格，直接索引
  buildings: Building[]          // 网格中所有建筑的扁平列表（方便遍历）
  enemies: Enemy[]

  hand: CardData[]               // 玩家手牌
  selectedCard: CardData | null
  beltMode: boolean
  selectedDir: number            // 0=右 1=下 2=左 3=上

  spawnQueue: SpawnQueueItem[]   // 波次生成队列
  resDisplay: ResDisplay         // 资源展示缓存（UI 用）
}
```

`grid` 和 `buildings` 是同一份数据的两种索引：
- `grid[y][x]` — O(1) 查找某格是否有建筑，用于碰撞/流动判断
- `buildings[]` — 用于遍历所有建筑，如生产更新、渲染刷新

**`advanceToLevel(nextLevel)`：** 过关时调用，只重置波次/敌人/核心血量，保留 `grid` 和 `buildings`，实现跨关卡建筑继承。

### 6.2 Building — 建筑的运行时数据

```ts
class Building {
  id: number       // 唯一 ID（渲染器用此 key 管理视觉对象）
  x, y: number     // 格坐标
  type: BuildingType
  dir: number      // 输出方向（0-3）
  health: number
  maxHealth: number
  sourceCard: CardData | null  // 来源卡牌，移除时归还

  // 生产相关
  prodTimer: number           // 累积计时器
  lastOutput: string | null   // 上次输出类型（熔炉交替用）
  inputBuf: InputBuf          // 输入缓冲 { iron_ore: 2, ... }

  // 传送带
  item: BeltItem | null       // 槽位（null = 空）

  // 炮塔
  fireCooldown: number
  noAmmo: boolean

  // 弹药箱
  ammo: number
  ammoMax: number             // 来自 BalanceConfig.AMMO_BOX_CAPACITY
}
```

### 6.3 Enemy — 敌人的运行时数据

```ts
class Enemy {
  id: number
  type: EnemyType
  health: number
  maxHealth: number
  gx, gy: number          // 格坐标（浮点，精确位置）
  pathIndex: number       // 下一个路径节点索引
  state: EnemyState
  target: 'core' | Building | null
  atkCooldown: number
  flashTimer: number      // 受击闪红剩余时间

  takeDamage(amount): void  // 扣血 + 设置 flashTimer
  get isDead(): boolean
}
```

---

## 7. 配置层

所有配置文件在构建时被编译进 JavaScript，运行时为**只读常量**。

```
BalanceConfig.ts  ← 平衡数值（最常修改）
MapConfig.ts      ← 地图结构（路径、网格）
BuildingConfig.ts ← 建筑外观和基础属性
EnemyConfig.ts    ← 敌人属性 + resolveEnemyCfg()（乘倍率）
RecipeConfig.ts   ← 生产配方
CardConfig.ts     ← 卡牌元数据（稀有度、解锁条件）
LevelConfig.ts    ← 关卡波次 + 奖励池 + 起始卡组
GameConfig.ts     ← 重导出文件（兼容旧 import）
```

**数据流：** 配置 → System（生产逻辑）→ Model（GameState 改变）→ Renderer（视觉更新）

配置层不依赖任何其他层，是依赖关系的根节点。

---

## 8. 渲染层

渲染器只做一件事：**把 Model 的状态转化为 Phaser 视觉对象**。它们不做任何游戏逻辑判断。

### 渲染深度（Z 轴）

```
Depth 0：GridRenderer    — 网格底图、路径（静态，每关绘制一次）
Depth 1：BuildingRenderer — 建筑底色方块（静态层，gfxBuilding）
Depth 3：BuildingRenderer — 建筑图标、血条（独立 Graphics 对象）
Depth 4：BeltRenderer    — 传送带物品圆点（每帧 clear+redraw）
Depth 5：EffectRenderer  — 爆炸/受伤特效（每帧更新）
Depth 6：EnemyRenderer   — 敌人圆形底色（每帧 clear+redraw）
Depth 7：EffectRenderer  — 子弹飞行轨迹（每帧更新）
Depth 8：HoverRenderer   — 悬停高亮（每帧 clear+redraw）
Depth 9：EnemyRenderer   — 敌人血条（独立 Graphics，每帧更新）
Depth 10：EnemyRenderer  — 敌人像素脸（独立 Graphics，每帧重绘）
Depth 19-20：HoverRenderer — 临时预览图标（鼠标移动时）
```

### 静态 vs 动态渲染

- **静态层（建筑底色、网格）：** 建筑放置/移除时局部更新，不每帧重绘
- **动态层（敌人、传送带物品、特效）：** 每帧 `g.clear()` 后全量重绘
- **独立对象（建筑图标、血条）：** 每个建筑有自己的 `Graphics` 实例，放置时创建，移除时销毁，`refresh()` 只更新变化部分（血量、弹药数）

### 像素图标系统（PixelIcons.ts）

所有建筑和敌人图标通过 `Phaser.GameObjects.Graphics` 的矩形 API 绘制，不使用任何图片或 emoji。

```ts
// 统一入口
drawBuildingIcon(scene, { type, x, y, dir }, cellSize, depth)
  → 根据 type 查找 BUILDING_DRAW_FN[type]
  → 调用对应的 drawXxx(g, cx, cy, iconSize) 函数
  → 返回已绘制内容的 Graphics 对象
```

---

## 9. UI 层

UI 层通过操作 DOM 更新 HTML 中的信息栏，与 Phaser Canvas 并行存在。

```
HudManager   — 顶部信息栏（核心血量、波次、关卡、倒计时、阶段标记）
              + 资源栏（5种资源数量）
CardManager  — 卡牌栏（手牌渲染、选中状态、传送带按钮）
DialogManager — 所有弹窗（开局选卡、胜利/失败、奖励选择）
DebugPanel   — Debug 日志面板（传送带/生产系统实时日志）
```

**与 GameScene 的通信：** UI 层通过 `GameScene` 直接调用，`GameScene` 在每帧末尾或事件触发时调用对应 Manager 的更新方法。

**与 HTML 按钮的通信：** HTML 中 `onclick="startDefense()"` → `window.startDefense()` → `main.ts` 挂载的函数 → `gameScene.startDefense()`。

---

## 10. 工具层

### GridUtils.ts

```ts
beltNextPos(b)           // 根据 b.dir 返回传送带下游格坐标
getSegmentCells(i, j)    // 枚举路径节点 i 到 j 之间的所有格子
getPathCells()           // 枚举整条路径的所有格子
findBlockingBuilding(gs, pathIndex, gx, gy)
                         // 查找当前路径段上、敌人前方的第一个建筑
```

### DebugLogger.ts

单例 `logger`，提供节流的分类日志：

```ts
logger.log('belt', '传送带(2,3) progress 0.4→0.7', 'belt-42');
// 参数：日志分类、消息内容、节流 key（相同 key 的消息每 0.5s 最多记一条）
```

日志分类：`belt` | `prod` | `ammo` | `tower` | `warn` | `info`

只有 `DBG.enabled = true`（点击 Debug 按钮）时才实际写入，生产模式无性能损耗。

---

## 11. 数据流向总览

```
玩家点击格子放置建筑
  → GameScene.onPtrDown()
  → gs.placeBuilding(x, y, type, dir, card)     [Model 修改]
  → buildingRenderer.add(building)               [Renderer 更新]
  → gs.hand 移除该卡牌
  → cardMgr.render(gs)                           [UI 更新]

玩家点击"开始防御"
  → GameScene.startDefense()
  → gs.phase = 'defense'
  → gs.waveCounting = true, waveCooldown = 3
  → hud.setPhaseLabel('defense')

每帧（防御阶段）：
  ConveyorSystem:
    belt.item.progress += BELT_SPEED × dt
    → 推入下游（传送带/机器 inputBuf/弹药箱）

  ProductionSystem:
    矿节点.prodTimer += dt
    → 产矿放入传送带格
    机器.prodTimer += dt
    → 从 inputBuf 取料，产物放入传送带格
    → rebuildResDisplay()               [更新 resDisplay 展示缓存]

  WaveSystem:
    waveCooldown -= dt
    → 触发 launchNextWave()
    spawnTimer -= dt
    → 触发 onSpawnEnemy(type)
    → EnemySystem.spawnEnemy(gs, type)  [创建 Enemy 加入 gs.enemies]
    检测波次结束 → 触发 onAllWavesDone() → GameScene.triggerVictory()

  EnemySystem:
    enemy.gx/gy 更新（移动）
    enemy.target 切换（遇建筑/到核心）
    building.takeDamage() / gs.coreHealth 减少
    → 触发 onBuildingDestroyed / onCoreAttacked 回调
    → GameScene 调 buildingRenderer.remove() / cameras.shake()

  DefenseSystem:
    tower.fireCooldown -= dt
    ammoBox.ammo--
    target.takeDamage()
    → 触发 onBulletFired(fx, fy, tx, ty)
    → effectRenderer.spawnBullet()      [添加子弹动画对象]

渲染阶段：
  beltRenderer.render(buildings)        [传送带圆点位置]
  enemyRenderer.render(enemies)         [敌人底色+脸+血条]
  effectRenderer.update(dt); .render()  [子弹进度+爆炸]
  buildingRenderer.refresh(b)           [血条/弹药数更新]
  hud.updateResources/updateTopBar()    [DOM 数字更新]
```

---

## 12. 关键设计决策

### 12.1 为什么用回调注入而不是直接引用 GameScene？

```ts
// ❌ 坏的做法：系统直接引用场景
class EnemySystem {
  constructor(private scene: GameScene) {}
  // 后续 EnemySystem 就依赖了 GameScene 的所有内容
}

// ✅ 好的做法：通过回调解耦
class EnemySystem {
  constructor(
    private onCoreAttacked: (damage: number) => void,
    private onBuildingDestroyed: (b: Building) => void,
  ) {}
}
```

System 只依赖 `GameState`（数据）和回调（接口），不依赖具体实现，可以独立测试。

### 12.2 为什么 grid 和 buildings 两个索引并存？

- `grid[y][x]`：O(1) 格子查找，用于路径检测、传送带流动判断
- `buildings[]`：O(n) 遍历，用于生产更新、渲染刷新、过滤特定类型

两者始终同步（`placeBuilding`/`removeBuilding`/`destroyBuilding` 同时更新两个）。

### 12.3 为什么 advanceToLevel 而不是 new GameState？

过关后新建 `GameState` 会清空网格，建筑全没了。`advanceToLevel()` 只重置战斗状态，保留网格和建筑，实现"带着工厂打下一关"的核心体验。

### 12.4 传送带为什么倒序遍历？

```ts
for (let i = belts.length - 1; i >= 0; i--) {
  // ...
}
```

正序遍历时，靠前的传送带物品推入后面的格子，后面的格子在同一帧又被遍历到，物品就会一帧内跑多格。倒序确保下游先处理，上游的推入只在下一帧才生效。

### 12.5 时间倍率（timeSpeed）如何实现？

```ts
const dt = (delta / 1000) * this.gs.timeSpeed;
```

所有 System 接收的 `dt` 已乘以倍率。`timeSpeed = 2` 时 `dt` 是真实帧间隔的 2 倍，等效于所有计时器加速 2 倍。渲染动画也使用同样的 `dt`，因此子弹、传送带圆点等都会随之加速。
