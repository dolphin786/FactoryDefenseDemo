import { GRID_W, GRID_H, CORE_X, CORE_Y } from '../config/GameConfig';
import { BUILDING_CONFIGS } from '../config/BuildingConfig';
import { LEVEL_CONFIGS } from '../config/LevelConfig';
import { Building } from './Building';
import { Enemy } from './Enemy';
import type { CardData } from './Card';

export type GamePhase = 'prepare' | 'defense' | 'result';

export interface SpawnQueueItem {
  type: string;
  delay: number;
}

/** 资源展示计数（UI 用） */
export interface ResDisplay {
  iron_ore: number;
  copper_ore: number;
  iron_plate: number;
  copper_plate: number;
  bullet: number;
}

export class GameState {
  phase: GamePhase = 'prepare';
  level: number;
  timeSpeed = 1;
  paused = false;
  gameOver = false;

  // 核心建筑状态
  coreHealth: number;
  readonly coreMaxHealth = 200;

  // 波次
  waveCurrent = 0;
  waveTotal: number;
  waveInProgress = false;
  waveCooldown = 0;
  waveCounting = false;

  // 网格 grid[y][x]
  grid: (Building | null)[][];
  buildings: Building[] = [];
  private _buildingIdCtr = 1;

  // 敌人
  enemies: Enemy[] = [];
  private _enemyIdCtr = 1;

  // 手牌
  hand: CardData[] = [];

  // UI
  selectedCard: CardData | null = null;
  /** 当前激活的工具：none=无, conveyor=传送带, splitter=分流器, underground=地下传送带 */
  beltTool: 'none' | 'conveyor' | 'splitter' | 'underground' = 'none';
  /** 向后兼容：beltMode 等价于 beltTool !== 'none' */
  get beltMode(): boolean { return this.beltTool !== 'none'; }
  selectedDir = 0;
  /** 地下传送带放置中：已放置的入口建筑（等待玩家点出口） */
  undergroundPending: Building | null = null;

  // 波次生成队列
  spawnQueue: SpawnQueueItem[] = [];
  spawnTimer = 0;

  // 资源展示缓存
  resDisplay: ResDisplay = {
    iron_ore: 0, copper_ore: 0,
    iron_plate: 0, copper_plate: 0,
    bullet: 0,
  };

  constructor(level: number) {
    this.level = level;
    const lvCfg = LEVEL_CONFIGS[level - 1] ?? LEVEL_CONFIGS[0];
    this.waveTotal = lvCfg.totalWaves;
    this.coreHealth = this.coreMaxHealth;
    this.grid = Array.from({ length: GRID_H }, () => new Array<Building | null>(GRID_W).fill(null));
  }

  // ── 建筑 CRUD ──

  nextBuildingId(): number { return this._buildingIdCtr++; }

  placeBuilding(x: number, y: number, type: Building['type'], dir: number, sourceCard: CardData | null): Building | null {
    if (!this.inGrid(x, y)) return null;
    if (this.grid[y][x] !== null) return null;
    const cfg = BUILDING_CONFIGS[type];
    const b = new Building(this.nextBuildingId(), x, y, type, dir, cfg.hp, sourceCard);
    this.grid[y][x] = b;
    this.buildings.push(b);
    return b;
  }

  removeBuilding(x: number, y: number): Building | null {
    const b = this.getCell(x, y);
    if (!b || b.type === 'core') return null;
    this.grid[y][x] = null;
    this.buildings = this.buildings.filter(bb => bb.id !== b.id);
    return b;
  }

  destroyBuilding(b: Building): void {
    this.grid[b.y][b.x] = null;
    this.buildings = this.buildings.filter(bb => bb.id !== b.id);
  }

  // ── 敌人 CRUD ──

  nextEnemyId(): number { return this._enemyIdCtr++; }

  addEnemy(e: Enemy): void { this.enemies.push(e); }

  removeDeadEnemies(): Enemy[] {
    const dead = this.enemies.filter(e => e.isDead);
    this.enemies = this.enemies.filter(e => !e.isDead);
    return dead;
  }

  // ── 网格查询 ──

  inGrid(x: number, y: number): boolean {
    return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
  }

  getCell(x: number, y: number): Building | null {
    return this.inGrid(x, y) ? this.grid[y][x] : null;
  }

  // ── 关卡推进（保留建筑） ──

  /**
   * 进入下一关：只重置波次/敌人/核心血量/游戏阶段，
   * 保留 grid、buildings（场上建筑完整继承），
   * 也保留传送带上的 item 和机器 inputBuf（生产线继续运转）。
   */
  advanceToLevel(nextLevel: number): void {
    this.level = nextLevel;
    const lvCfg = LEVEL_CONFIGS[nextLevel - 1] ?? LEVEL_CONFIGS[0];
    this.waveTotal    = lvCfg.totalWaves;
    this.phase        = 'prepare';
    this.timeSpeed    = 1;
    this.paused       = false;
    this.gameOver     = false;
    this.coreHealth   = this.coreMaxHealth; // 核心血量恢复满
    this.waveCurrent  = 0;
    this.waveInProgress = false;
    this.waveCooldown = 0;
    this.waveCounting = false;
    this.enemies      = [];
    this.spawnQueue   = [];
    this.spawnTimer   = 0;
    this.selectedCard      = null;
    this.beltTool          = 'none';
    this.undergroundPending = null;
    this.selectedDir       = 0;
    // buildings / grid 不动
  }

  // ── 快捷访问 ──

  get corePosX(): number { return CORE_X; }
  get corePosY(): number { return CORE_Y; }

  placeCoreBuilding(): Building | null {
    return this.placeBuilding(CORE_X, CORE_Y, 'core', 0, null);
  }
}
