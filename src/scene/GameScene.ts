import Phaser from 'phaser';
import { CORE_X, CORE_Y } from '../config/GameConfig';
import { LEVEL_CONFIGS, STARTER_DECKS } from '../config/LevelConfig';
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
    this.buildingRenderer = new BuildingRenderer(this, 1);
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
    this.gs.hand = deck.cards.map(c => makeCard(c));
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

  private resetScene(): void {
    this.buildingRenderer.clearAll();
    this.enemyRenderer.clearAll();
    this.effectRenderer.clearAll();
    this.hoverRenderer.clearAll();
    this.gridRenderer.draw();

    // 放置核心建筑
    const core = this.gs.placeCoreBuilding();
    if (core) this.buildingRenderer.add(core);

    this.hud.showStartBtn();
    this.hud.hideCountdown();
    this.hud.setPhaseLabel('【准备阶段】', '#95A5A6');
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
    const gx = Math.floor(ptr.x / 50);
    const gy = Math.floor(ptr.y / 50);

    if (ptr.rightButtonDown()) {
      if (this.gs.selectedCard || this.gs.beltMode) {
        this.gs.selectedCard = null;
        this.gs.beltMode = false;
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

    if (this.gs.beltMode) {
      if (this.gs.getCell(gx, gy) == null && !(gx === CORE_X && gy === CORE_Y)) {
        const b = this.gs.placeBuilding(gx, gy, 'conveyor', this.gs.selectedDir, null);
        if (b) this.buildingRenderer.add(b);
      }
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
      this.gs.beltMode = false;
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
    this.effectRenderer.spawnDamage(CORE_X * 50 + 25, CORE_Y * 50 + 25);
    this.hud.updateCoreHp(this.gs);
    if (this.gs.coreHealth <= 0) this.triggerDefeat();
  }

  private onBuildingDestroyed(b: Building): void {
    this.buildingRenderer.remove(b);
    this.effectRenderer.spawnExplosion(b.x * 50 + 25, b.y * 50 + 25);
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

    const nextLevel = this.gs.level + 1;
    resetCardId();
    this.gs = new GameState(nextLevel);
    this.gs.hand = survivedHand;
    this.initSystems();
    this.resetScene();
  }

  private retryLevel(): void {
    const level = this.gs.level;
    const hand  = this.gs.hand;
    resetCardId();
    this.gs = new GameState(level);
    this.gs.hand = hand;
    this.initSystems();
    this.resetScene();
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
    this.hud.setPhaseLabel('【防御阶段】', '#E74C3C');
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

  toggleBeltMode(): void {
    this.gs.beltMode = !this.gs.beltMode;
    this.gs.selectedCard = null;
    this.gs.selectedDir = 0;
    const el = document.getElementById('hint-bar');
    if (el) el.style.display = this.gs.beltMode ? 'block' : 'none';
    this.cardMgr.render(this.gs);
  }

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
