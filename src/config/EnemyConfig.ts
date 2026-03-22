export type EnemyType = 'bug' | 'tank_bug';

export interface EnemyCfg {
  health: number;
  speed: number;   // 格/秒
  damage: number;
  atkSpd: number;  // 攻击间隔（秒）
  emoji: string;
  radius: number;  // 像素半径
  color: number;
  name: string;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyCfg> = {
  bug: {
    health: 30, speed: 1.0, damage: 10, atkSpd: 1.0,
    emoji: '🐛', radius: 16, color: 0x8E44AD, name: '小虫子',
  },
  tank_bug: {
    health: 100, speed: 0.5, damage: 20, atkSpd: 2.0,
    emoji: '🪲', radius: 22, color: 0x5B2C6F, name: '坦克虫',
  },
};
