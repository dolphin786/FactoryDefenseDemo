/**
 * BalanceConfig — 全局平衡性数值
 *
 * 所有影响游戏难度/节奏的"调参旋钮"集中在此。
 * 系统代码不应在别处出现魔法数字，直接引用这里的常量即可。
 *
 * 调整方法：
 *   - 想整体提高敌人强度 → 调大 ENEMY_SCALE.*
 *   - 想整体加快工厂产速 → 调小 PRODUCTION_SCALE.cycleTimeMultiplier
 *   - 想让第N关更难      → 在 LevelConfig 的 difficultyMod 字段覆盖
 */

// ── 传送带 ──────────────────────────────────────────────────────
export const BELT_SPEED = 1.5;          // 传送带移动速度（格/秒）
export const INPUT_BUF_MAX = 4;         // 机器输入缓冲上限（每种资源）

// ── 生产 ────────────────────────────────────────────────────────
export const PRODUCTION_SCALE = {
  /** 所有配方 cycleTime 的全局倍率（<1 = 加速，>1 = 减速） */
  cycleTimeMultiplier: 1.0,
};

// ── 炮塔 ────────────────────────────────────────────────────────
export const TOWER_STATS = {
  range:        3,    // 射程（格）
  damagePerShot:10,   // 每发伤害
  fireRate:     1.0,  // 发射间隔（秒/发）
};

// ── 弹药箱 ──────────────────────────────────────────────────────
export const AMMO_BOX_CAPACITY = 50;    // 弹药箱最大存弹量

// ── 核心建筑 ────────────────────────────────────────────────────
export const CORE_MAX_HEALTH = 200;

// ── 敌人全局倍率 ────────────────────────────────────────────────
export const ENEMY_SCALE = {
  /** 所有敌人血量的全局倍率 */
  healthMultiplier:  1.0,
  /** 所有敌人移动速度的全局倍率 */
  speedMultiplier:   1.0,
  /** 所有敌人伤害的全局倍率 */
  damageMultiplier:  1.0,
};

// ── 卡牌 ────────────────────────────────────────────────────────
export const CARD_DURABILITY_DEFAULT = 2;  // 资源卡默认耐久度
