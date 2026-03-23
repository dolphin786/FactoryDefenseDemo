import Phaser from 'phaser';
import { CORE_X, CORE_Y, CELL } from '../config/GameConfig';
import { DIR_NAMES } from '../config/GameConfig';
import { UNDERGROUND_MAX_DIST } from '../config/BuildingConfig';
import { LEVEL_CONFIGS, STARTER_DECKS } from '../config/LevelConfig';
import { CARD_DEF_MAP } from '../config/CardConfig';
import { GameState } from '../model/GameState';
import { makeCard, resetCardId } from '../model/Card';
import type { CardData } from '../model/Card';
import { ConveyorSystem }   from '../system/ConveyorSystem';
import { ProductionSystem } from '../system/ProductionSystem';
import { EnemySystem }      from '../system/EnemySystem';
import { DefenseSystem }    from '../system/DefenseSystem';
import { WaveSystem }       from '../system/WaveSystem';
import { GridRenderer }     from './renderer/GridRenderer';
import { BuildingRenderer } from './renderer/BuildingRenderer';
import { EnemyRenderer }    from './renderer/EnemyRenderer';
import { BeltRenderer }     from './renderer/BeltRenderer';
import { EffectRenderer }   from './renderer/EffectRenderer';
import { HoverRenderer }    from './renderer/HoverRenderer';
import { HudManager }       from '../ui/HudManager';
import { CardManager }      from '../ui/CardManager';
import { DialogManager }    from '../ui/DialogManager';
import { DebugPanel }       from '../ui/DebugPanel';
import type { Building }    from '../model/Building';

export class GameScene extends Phaser.Scene {
  // ── 游戏状态 ──
  private gs!: GameState;

  // ── 系统 ──
  private conveyorSys!:   ConveyorSystem;
  private productionSys!: ProductionSystem;
  private enemySys!:      EnemySystem;
  private defenseSys!:    DefenseSystem;
  private waveSys!:       WaveSystem;

  // ── 渲染器 ──
  private gridRenderer!:     GridRenderer;
  private buildingRenderer!: BuildingRenderer;
  private enemyRenderer!:    EnemyRenderer;
  private beltRenderer!:     BeltRenderer;
  private effectRenderer!:   EffectRenderer;
  private hoverRenderer!:    HoverRenderer;

  // ── UI 管理 ──
  private hud!:     HudManager;
  private cardMgr!: CardManager;
  private dialog!:  DialogManager;

  constructor() { super({ key: 'GameScene' }); }

  create(): void {
    // UI 管理器
    this.hud     = new HudManager();
    this.dialog  = new DialogManager();
    this.cardMgr = new CardManager(card => this.selectCard(card));
    new DebugPanel().init();

    // 渲染器初始化
    this.gridRenderer     = new GridRenderer(this, 0);
    this.buildingRenderer = new BuildingRenderer(this);
    this.beltRenderer     = new BeltRenderer(this, 4);
    this.effectRenderer   = new EffectRenderer(this, 7, 5);
    this.enemyRenderer    = new EnemyRenderer(this, 6);
    this.hoverRenderer    = new HoverRenderer(this, 8);

    // 输入
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.onPtrDown, this);
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      this.hoverRenderer.onPointerMove(ptr, this.gs);
    });
    this.input.keyboard?.on('keydown-R', () => {
      if (!this.gs) return;
      if (this.gs.selectedCard || this.gs.beltMode) {
        this.gs.selectedDir = (this.gs.selectedDir + 1) % 4;
        this.hoverRenderer.refresh(this.gs);
      }
    });

    // 启动游戏
    this.startNewGame(1);
  }

  // ── 新游戏 / 关卡初始化 ──

  private startNewGame(level: number): void {
    resetCardId();
    this.gs = new GameState(level);
    this.initSystems();
    this.resetScene();
    this.dialog.showStarterDeckDialog(idx => this.onDeckPicked(idx));
  }

  private onDeckPicked(idx: number): void {
    const deck = STARTER_DECKS[idx];
    // cardIds → CardData[]（通过 CardConfig 查表，保留耐久度等字段）
    this.gs.hand = deck.cardIds.map(id => {
      const def = CARD_DEF_MAP.get(id);
      if (!def) throw new Error(`未知 cardId: ${id}`);
      return makeCard({
        type:         def.type,
        resourceType: def.resourceType,
        durability:   def.durability,
        buildingType: def.buildingType,
      });
    });
    this.cardMgr.render(this.gs);
    this.hud.updateTopBar(this.gs);
  }

  private initSystems(): void {
    this.conveyorSys   = new ConveyorSystem();
    this.productionSys = new ProductionSystem();

    this.enemySys = new EnemySystem(
      damage => this.onCoreAttacked(damage),
      b      => this.onBuildingDestroyed(b),
    );

    this.defenseSys = new DefenseSystem(
      (fx, fy, tx, ty) => this.effectRenderer.spawnBullet(fx, fy, tx, ty),
    );

    this.waveSys = new WaveSystem(
      waveNum => this.showWaveAnnounce(`第 ${waveNum} 波来袭！`),
      type    => this.enemySys.spawnEnemy(this.gs, type),
      ()      => this.triggerVictory(),
      secs    => this.hud.showCountdown(secs),
    );
  }

  /**
   * 重置场景渲染。
   * @param keepBuildings true = 保留场上建筑（过关继承），false = 全部清空（重试/新游戏）
   */
  private resetScene(keepBuildings = false): void {
    this.enemyRenderer.clearAll();
    this.effectRenderer.clearAll();
    this.hoverRenderer.clearAll();

    if (keepBuildings) {
      // 保留建筑：只重绘静态底图，重新渲染已有建筑视觉
      this.buildingRenderer.clearAll();
      this.gridRenderer.draw();
      for (const b of this.gs.buildings) {
        this.buildingRenderer.add(b);
      }
    } else {
      // 全部清空：清渲染器，重绘底图，放置核心
      this.buildingRenderer.clearAll();
      this.gridRenderer.draw();
      const core = this.gs.placeCoreBuilding();
      if (core) this.buildingRenderer.add(core);
    }

    this.hud.showStartBtn();
    this.hud.hideCountdown();
    this.hud.setPhaseLabel('prepare');
    this.hud.updateTopBar(this.gs);
    this.hud.updateResources(this.gs);
    this.cardMgr.render(this.gs);
  }

  // ── 游戏主循环 ──

  update(_time: number, delta: number): void {
    if (!this.gs || this.gs.paused || this.gs.gameOver) return;
    const dt = (delta / 1000) * this.gs.timeSpeed;

    // 准备阶段：只跑传送带动画
    if (this.gs.phase === 'prepare') {
      this.conveyorSys.update(this.gs, dt);
    }

    // 防御阶段：完整流水线
    if (this.gs.phase === 'defense') {
      this.conveyorSys.update(this.gs, dt);
      this.productionSys.update(this.gs, dt);
      this.waveSys.update(this.gs, dt);
      this.enemySys.update(this.gs, dt);
      this.defenseSys.update(this.gs, dt);
    }

    // 特效动画（始终更新）
    this.effectRenderer.update(dt);

    // 渲染
    this.beltRenderer.render(this.gs.buildings);
    this.enemyRenderer.render(this.gs.enemies);
    this.effectRenderer.render();
    for (const b of this.gs.buildings) this.buildingRenderer.refresh(b);

    // UI 节流更新
    this.hud.updateCoreHp(this.gs);
    if (Math.floor(_time / 100) % 2 === 0) {
      this.hud.updateResources(this.gs);
      this.hud.updateTopBar(this.gs);
    }
  }

  // ── 输入处理 ──

  private onPtrDown(ptr: Phaser.Input.Pointer): void {
    // 用 worldX/worldY：Phaser 已将屏幕坐标反算回画布逻辑坐标（处理 Scale.FIT 缩放）
    const gx = Math.floor(ptr.worldX / CELL);
    const gy = Math.floor(ptr.worldY / CELL);

    if (ptr.rightButtonDown()) {
      if (this.gs.selectedCard || this.gs.beltMode) {
        this.gs.selectedCard = null;
        this.gs.beltTool = 'none';
        this.gs.undergroundPending = null;
        const hintEl = document.getElementById('hint-bar');
        if (hintEl) hintEl.style.display = 'none';
        this.cardMgr.render(this.gs);
      } else if (this.gs.inGrid(gx, gy) && this.gs.phase === 'prepare') {
        const b = this.gs.removeBuilding(gx, gy);
        if (b) {
          this.buildingRenderer.remove(b);
          this.gridRenderer.draw(); // 重绘路径
          if (b.sourceCard) {
            this.gs.hand.push(b.sourceCard);
            this.cardMgr.render(this.gs);
          }
        }
      }
      return;
    }

    if (!this.gs.inGrid(gx, gy)) return;

    // ── 工具放置 ────────────────────────────────────────────────
    if (this.gs.beltTool === 'conveyor') {
      if (this.gs.getCell(gx, gy) == null && !(gx === CORE_X && gy === CORE_Y)) {
        const b = this.gs.placeBuilding(gx, gy, 'conveyor', this.gs.selectedDir, null);
        if (b) this.buildingRenderer.add(b);
      }
      return;
    }

    if (this.gs.beltTool === 'splitter') {
      this.placeSplitter(gx, gy);
      return;
    }

    if (this.gs.beltTool === 'underground') {
      this.placeUnderground(gx, gy);
      return;
    }

    if (this.gs.selectedCard) {
      const card = this.gs.selectedCard;
      if (this.gs.getCell(gx, gy) != null) return;
      if (gx === CORE_X && gy === CORE_Y) return;

      const btype = card.type === 'resource'
        ? (card.resourceType === 'iron' ? 'iron_ore_node' : 'copper_ore_node')
        : card.buildingType!;

      const b = this.gs.placeBuilding(gx, gy, btype, this.gs.selectedDir, card);
      if (b) {
        this.buildingRenderer.add(b);
        this.gs.hand = this.gs.hand.filter(c => c.id !== card.id);
        this.gs.selectedCard = null;
        const hintEl = document.getElementById('hint-bar');
        if (hintEl) hintEl.style.display = 'none';
        this.cardMgr.render(this.gs);
      }
    }
  }

  // ── 卡牌选择 ──

  private selectCard(card: CardData): void {
    if (this.gs.selectedCard?.id === card.id) {
      this.gs.selectedCard = null;
      const el = document.getElementById('hint-bar');
      if (el) el.style.display = 'none';
    } else {
      this.gs.selectedCard = card;
      this.gs.beltTool = 'none';
      this.gs.selectedDir = 0;
      const el = document.getElementById('hint-bar');
      if (el) { el.textContent = 'R键旋转方向 | 右键取消'; el.style.display = 'block'; }
    }
    this.cardMgr.render(this.gs);
  }

  // ── 事件回调 ──

  private onCoreAttacked(damage: number): void {
    this.gs.coreHealth = Math.max(0, this.gs.coreHealth - damage);
    this.cameras.main.flash(200, 180, 0, 0);
    this.cameras.main.shake(150, 0.008);
    this.effectRenderer.spawnDamage(CORE_X * CELL + CELL / 2, CORE_Y * CELL + CELL / 2);
    this.hud.updateCoreHp(this.gs);
    if (this.gs.coreHealth <= 0) this.triggerDefeat();
  }

  private onBuildingDestroyed(b: Building): void {
    this.buildingRenderer.remove(b);
    this.effectRenderer.spawnExplosion(b.x * CELL + CELL / 2, b.y * CELL + CELL / 2);
    this.gridRenderer.draw();
  }

  private triggerVictory(): void {
    if (this.gs.gameOver) return;
    this.gs.gameOver = true;
    this.gs.phase = 'result';
    setTimeout(() => {
      this.dialog.showVictoryDialog(
        this.gs,
        card => this.goNextLevel(card),
        ()   => this.startNewGame(1),
      );
    }, 600);
  }

  private triggerDefeat(): void {
    if (this.gs.gameOver) return;
    this.gs.gameOver = true;
    this.gs.phase = 'result';
    setTimeout(() => {
      this.dialog.showDefeatDialog(
        this.gs,
        ()   => this.retryLevel(),
        ()   => this.startNewGame(1),
      );
    }, 600);
  }

  private goNextLevel(rewardCard: CardData): void {
    // 资源卡耐久-1，移除耗尽的
    for (const c of this.gs.hand) {
      if (c.type === 'resource' && c.durability != null) c.durability--;
    }
    const survivedHand = this.gs.hand.filter(c => !(c.type === 'resource' && (c.durability ?? 1) <= 0));
    survivedHand.push(rewardCard);

    // 推进关卡：保留场上建筑，只重置波次/敌人/核心血量
    this.gs.advanceToLevel(this.gs.level + 1);
    this.gs.hand = survivedHand;
    this.initSystems();
    this.resetScene(true); // keepBuildings = true
  }

  private retryLevel(): void {
    // 重试本关：回到关卡起点，重新选择卡组（手牌重置）
    const level = this.gs.level;
    resetCardId();
    this.gs = new GameState(level);
    this.initSystems();
    this.resetScene();
    this.dialog.showStarterDeckDialog(idx => this.onDeckPicked(idx));
  }

  // ── 防御阶段开始 ──
  startDefense(): void {
    if (this.gs.phase !== 'prepare') return;
    this.gs.phase = 'defense';
    const lvCfg = LEVEL_CONFIGS[this.gs.level - 1];
    this.gs.waveTotal = lvCfg.totalWaves;
    this.gs.waveCounting = true;
    this.gs.waveCooldown = 3; // 3秒后第一波

    this.hud.hideStartBtn();
    this.hud.showCountdown(3);
    this.hud.setPhaseLabel('defense');
    this.showWaveAnnounce('防御阶段开始！');
  }

  // ── 时间控制 ──
  setTimeSpeed(spd: number): void {
    if (spd === 0) {
      this.gs.paused = !this.gs.paused;
    } else {
      this.gs.paused = false;
      this.gs.timeSpeed = spd;
    }
  }

  /**
   * 分流器一步放置：一次点击同时放置 splitter_a 和 splitter_b。
   *
   * 分流器是 2×1 建筑，长边垂直于传送方向（dir）：
   *   dir=0(右)/dir=2(左)：两格上下排列（同列，gy 和 gy+1）
   *   dir=1(下)/dir=3(上)：两格左右排列（同行，gx 和 gx+1）
   *
   * 点击的格子是 splitter_a（主格），相邻格是 splitter_b（副格）。
   * 两格均需为空。
   */
  private placeSplitter(gx: number, gy: number): void {
    const dir = this.gs.selectedDir;
    // 副格偏移：垂直于 dir 方向的下一格
    // dir=右/左 → 副格在下方(+y)；dir=下/上 → 副格在右侧(+x)
    const [bx, by] = (dir === 0 || dir === 2)
      ? [gx, gy + 1]   // 水平传送 → 两格竖向排列
      : [gx + 1, gy];  // 竖向传送 → 两格横向排列

    if (!this.gs.inGrid(bx, by)) return;
    if (this.gs.getCell(gx, gy) != null) return;
    if (this.gs.getCell(bx, by) != null) return;
    if ((gx === CORE_X && gy === CORE_Y) || (bx === CORE_X && by === CORE_Y)) return;

    const a = this.gs.placeBuilding(gx, gy, 'splitter_a', dir, null);
    const b = this.gs.placeBuilding(bx, by, 'splitter_b', dir, null);
    if (a && b) {
      a.pairId = b.id;
      b.pairId = a.id;
      this.buildingRenderer.add(a);
      this.buildingRenderer.add(b);
    } else {
      // 回滚（理论上不会走到这里）
      if (a) { this.gs.removeBuilding(gx, gy); }
      if (b) { this.gs.removeBuilding(bx, by); }
    }
  }

  /**
   * 地下传送带两步放置逻辑：
   *   第一步：放置入口（underground_in），记录到 undergroundPending
   *   第二步：放置出口（underground_out），和入口配对
   *   约束：入口和出口必须在同一行或同一列，方向相同，距离 1~UNDERGROUND_MAX_DIST 格
   */
  private placeUnderground(gx: number, gy: number): void {
    const dir = this.gs.selectedDir;

    if (!this.gs.undergroundPending) {
      // 第一步：放入口
      if (this.gs.getCell(gx, gy) != null) return;
      const inlet = this.gs.placeBuilding(gx, gy, 'underground_in', dir, null);
      if (inlet) {
        this.gs.undergroundPending = inlet;
        this.buildingRenderer.add(inlet);
        const el = document.getElementById('hint-bar');
        if (el) el.textContent = '已放置入口，点击同行/列放置出口 | 右键取消';
      }
    } else {
      // 第二步：放出口
      const inlet = this.gs.undergroundPending;
      // 验证：同行或同列
      const sameRow = gy === inlet.y;
      const sameCol = gx === inlet.x;
      if (!sameRow && !sameCol) return;
      // 验证：方向一致
      if (dir !== inlet.dir) return;
      // 验证：方向和偏移一致（出口在入口的前进方向一侧）
      const dx = gx - inlet.x, dy = gy - inlet.y;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < 1 || dist > UNDERGROUND_MAX_DIST) return;
      // 方向匹配：dir=0右则dx>0，dir=1下则dy>0，dir=2左则dx<0，dir=3上则dy<0
      const dirCheck = [dx > 0, dy > 0, dx < 0, dy < 0][dir];
      if (!dirCheck) return;

      if (this.gs.getCell(gx, gy) != null) return;
      const outlet = this.gs.placeBuilding(gx, gy, 'underground_out', dir, null);
      if (outlet) {
        inlet.pairId  = outlet.id;
        outlet.pairId = inlet.id;
        this.buildingRenderer.add(outlet);
        this.gs.undergroundPending = null;
        const el = document.getElementById('hint-bar');
        if (el) el.textContent = `UNDERGROUND [${DIR_NAMES[dir]}]  R:ROTATE  RMB:CANCEL`;
      }
    }
  }

  /** 激活某个工具，再次点击同一工具则取消 */
  activateTool(tool: 'conveyor' | 'splitter' | 'underground'): void {
    const next = this.gs.beltTool === tool ? 'none' : tool;
    this.gs.beltTool = next;
    this.gs.selectedCard = null;
    this.gs.selectedDir = 0;
    this.gs.undergroundPending = null;
    const el = document.getElementById('hint-bar');
    if (el) el.style.display = next !== 'none' ? 'block' : 'none';
    // 更新工具按钮高亮
    this.updateToolBtns();
    this.cardMgr.render(this.gs);
  }

  private updateToolBtns(): void {
    const t = this.gs.beltTool;
    document.getElementById('belt-btn')?.classList.toggle('active', t === 'conveyor');
    document.getElementById('splitter-btn')?.classList.toggle('active', t === 'splitter');
    document.getElementById('underground-btn')?.classList.toggle('active', t === 'underground');
  }

  /** 向后兼容旧接口 */
  toggleBeltMode(): void { this.activateTool('conveyor'); }

  // ── 波次提示 ──
  private showWaveAnnounce(text: string): void {
    const el = document.getElementById('wave-announce');
    if (!el) return;
    el.textContent = text;
    el.style.display = 'block';
    clearTimeout((el as HTMLElement & { _t?: ReturnType<typeof setTimeout> })._t);
    (el as HTMLElement & { _t?: ReturnType<typeof setTimeout> })._t =
      setTimeout(() => { el.style.display = 'none'; }, 2500);
  }
}
