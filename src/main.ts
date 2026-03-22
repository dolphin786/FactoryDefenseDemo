import Phaser from 'phaser';
import { CANVAS_W, CANVAS_H } from './config/GameConfig';
import { GameScene } from './scene/GameScene';

// 全局场景引用，供 HTML 按钮调用
let gameScene: GameScene | null = null;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: CANVAS_W,
  height: CANVAS_H,
  parent: 'game-area',
  backgroundColor: '#263238',
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CANVAS_W,
    height: CANVAS_H,
  },
});

// Phaser 启动后捕获场景引用
game.events.on('ready', () => {
  gameScene = game.scene.getScene('GameScene') as GameScene;
});

// 将需要 HTML 按钮调用的函数挂到 window
const w = window as unknown as Record<string, unknown>;
w['startDefense']  = () => gameScene?.startDefense();
w['toggleBeltMode']= () => gameScene?.toggleBeltMode();
w['setSpeed']      = (spd: number) => {
  gameScene?.setTimeSpeed(spd);
  updateSpeedBtns(spd);
};

function updateSpeedBtns(spd: number): void {
  ['btn-1x', 'btn-2x', 'btn-4x'].forEach(id =>
    document.getElementById(id)?.classList.remove('active'));
  const map: Record<number, string> = { 1: 'btn-1x', 2: 'btn-2x', 4: 'btn-4x' };
  if (map[spd]) document.getElementById(map[spd])?.classList.add('active');
  const pause = document.getElementById('btn-pause');
  if (pause) pause.textContent = spd === 0 ? '▶继续' : '⏸暂停';
}
