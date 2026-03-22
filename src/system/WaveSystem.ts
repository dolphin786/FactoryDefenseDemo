import { LEVEL_CONFIGS } from '../config/LevelConfig';
import type { EnemyType } from '../config/EnemyConfig';
import type { GameState } from '../model/GameState';

export type OnWaveStart    = (waveNum: number) => void;
export type OnSpawnEnemy   = (type: EnemyType) => void;
export type OnAllWavesDone = () => void;
export type OnWaveCooldown = (remaining: number) => void;

/**
 * WaveSystem — 波次管理
 *
 * 职责：
 *   - 管理波次倒计时和敌人生成队列
 *   - 检测当前波次是否全部消灭
 *   - 触发胜利或下一波倒计时
 */
export class WaveSystem {
  private onWaveStart:    OnWaveStart;
  private onSpawnEnemy:   OnSpawnEnemy;
  private onAllWavesDone: OnAllWavesDone;
  private onWaveCooldown: OnWaveCooldown;

  constructor(
    onWaveStart:    OnWaveStart,
    onSpawnEnemy:   OnSpawnEnemy,
    onAllWavesDone: OnAllWavesDone,
    onWaveCooldown: OnWaveCooldown,
  ) {
    this.onWaveStart    = onWaveStart;
    this.onSpawnEnemy   = onSpawnEnemy;
    this.onAllWavesDone = onAllWavesDone;
    this.onWaveCooldown = onWaveCooldown;
  }

  update(gs: GameState, dt: number): void {
    // 处理生成队列
    if (gs.spawnQueue.length > 0) {
      gs.spawnTimer -= dt;
      if (gs.spawnTimer <= 0) {
        const item = gs.spawnQueue.shift()!;
        this.onSpawnEnemy(item.type as EnemyType);
        gs.spawnTimer = gs.spawnQueue.length > 0 ? gs.spawnQueue[0].delay : 0;
      }
    }

    // 检测波次结束
    if (gs.waveInProgress) {
      const alive = gs.enemies.filter(e => !e.isDead).length;
      if (alive === 0 && gs.spawnQueue.length === 0 && gs.spawnTimer <= 0) {
        gs.waveInProgress = false;
        if (gs.waveCurrent >= gs.waveTotal) {
          this.onAllWavesDone();
        } else {
          const lvCfg = LEVEL_CONFIGS[gs.level - 1];
          gs.waveCooldown = lvCfg.waveCooldown;
          gs.waveCounting = true;
        }
      }
    }

    // 波次间倒计时
    if (gs.waveCounting) {
      gs.waveCooldown -= dt;
      this.onWaveCooldown(Math.max(0, gs.waveCooldown));
      if (gs.waveCooldown <= 0) {
        gs.waveCounting = false;
        this.launchNextWave(gs);
      }
    }
  }

  /** 启动下一波（由外部调用，也用于首波倒计时结束后） */
  launchNextWave(gs: GameState): void {
    const lvCfg = LEVEL_CONFIGS[gs.level - 1];
    gs.waveCurrent++;
    gs.waveInProgress = true;

    const waveData = lvCfg.waves[gs.waveCurrent - 1];
    if (!waveData) return;

    gs.spawnQueue = [];
    for (const grp of waveData.groups) {
      for (let i = 0; i < grp.count; i++) {
        gs.spawnQueue.push({ type: grp.type, delay: grp.interval });
      }
    }
    gs.spawnTimer = 0.5;
    this.onWaveStart(gs.waveCurrent);
  }
}
