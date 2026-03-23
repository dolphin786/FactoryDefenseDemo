# 工厂守卫战

工厂建造 × Roguelike 卡牌 × 塔防的概念验证 Demo。

建造生产线，用工厂产出的弹药抵御虫群入侵。

---

## 游戏玩法

- **准备阶段**：从手牌中选择建筑卡放置到 32×32 网格上，规划矿石→熔炉→组装机→弹药箱→炮塔的生产线
- **防御阶段**：点击「开始防御」，敌人沿预设路径入侵，炮塔自动消耗弹药攻击，抵御所有波次即可通关
- **关卡奖励**：通关后从奖励池三选一，带着手牌和场上建筑进入下一关

**资源流动**：矿节点 → 传送带 → 熔炉 → 传送带 → 组装机 → 传送带 → 弹药箱 → 炮塔

---

## 开发环境

```bash
node >= 18
npm >= 9
```

---

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:3000`

```bash
# 类型检查
npm run typecheck

# 生产构建
npm run build
```

---

## 项目结构

```
src/
├── config/      静态数据（地图、平衡数值、建筑、敌人、配方、卡牌、关卡）
├── model/       运行时状态（Building、Enemy、GameState…）
├── system/      游戏逻辑（传送带、生产、敌人AI、防御、波次）
├── scene/       Phaser 场景 + 各视觉渲染器
├── ui/          DOM UI 管理
└── utils/       工具函数（多格建筑、路径计算、日志）

docs/
├── architecture.md        系统架构与代码运行原理
└── customization-guide.md 如何添加新建筑、配方、关卡等

game.html   单文件原型版本（master 分支，独立可运行，无需构建）
```

详细说明见 [`docs/architecture.md`](docs/architecture.md)。

---

## 分支说明

| 分支 | 说明 |
|------|------|
| `master` | 单文件 HTML 原型（`game.html`，无需构建，可直接浏览器打开） |
| `feature/typescript-refactor` | TypeScript + Vite 重构的初始版本 |
| `feature/data-driven` | **主开发分支**，在重构基础上持续迭代 |

---

## 操作说明

| 操作 | 效果 |
|------|------|
| 点击手牌卡 | 选中，再点击网格格子放置 |
| `R` 键 | 旋转建筑方向（4向） |
| 右键格子 | 准备阶段移除建筑（归还手牌） |
| 右键空白/工具按钮 | 取消当前选择 |
| BELT 按钮 | 传送带铺设模式（无限免费） |
| SPLIT 按钮 | 分流器放置（2×1，Factorio 式均摊分流） |
| UGND 按钮 | 地下传送带（两步：先点入口，再点同行/列出口） |
| 1x / 2x / 4x | 加速游戏 |
| 🔬 Debug | 打开传送带/生产系统日志面板 |

---

## 技术栈

- [Phaser 3](https://phaser.io/) — 游戏渲染引擎
- [TypeScript](https://www.typescriptlang.org/) — 类型安全
- [Vite](https://vite.dev/) — 开发服务器与构建工具
- 纯 `Phaser.Graphics` 像素图标，无外部图片资源
