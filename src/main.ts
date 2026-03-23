import Phaser from 'phaser';
import { CANVAS_W, CANVAS_H } from './config/GameConfig';
import { GameScene } from './scene/GameScene';

// 全局场景引用，供 HTML 按钮调用
let gameScene: GameScene | null = null;

/**
 * Phaser 延迟到 DOM 完全渲染后再初始化。
 *
 * 原因：Electron 环境下 Phaser 如果在 DOMContentLoaded 前初始化，
 * 此时 #game-area 的 flex 布局还未完成，getBoundingClientRect() 返回 0，
 * Scale.FIT 计算出错，导致画布被压缩到 0 高度，游戏画面消失。
 *
 * 用 requestAnimationFrame 等一帧，确保浏览器完成首次布局后再启动 Phaser。
 */
function initPhaser(): void {
  const gameArea = document.getElementById('game-area');
  if (!gameArea) return;

  // 等浏览器完成布局，读取 #game-area 的实际可用高度
  const rect = gameArea.getBoundingClientRect();
  const availW = rect.width  || window.innerWidth;
  const availH = rect.height || (window.innerHeight - 152); // 152 = top+resource+card bar

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
      // 明确告知 Scale Manager 可用区域大小，避免依赖 DOM 动态查询
      parent: 'game-area',
    },
  });

  // 窗口尺寸变化时强制刷新 Scale（Electron 窗口拖拽缩放时需要）
  window.addEventListener('resize', () => {
    game.scale.refresh();
  });

  // Phaser 启动后捕获场景引用
  game.events.on('ready', () => {
    gameScene = game.scene.getScene('GameScene') as GameScene;
    // 启动后再刷新一次，确保画布尺寸正确
    game.scale.refresh();
  });

  // 消除 TypeScript 对 availW/availH 未使用的警告
  void availW; void availH;
}

// DOM 完全渲染后（包括 CSS 布局）再初始化 Phaser
// DOMContentLoaded 之后用 requestAnimationFrame 再等一帧确保 flex 布局完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(initPhaser));
} else {
  requestAnimationFrame(initPhaser);
}

// 将需要 HTML 按钮调用的函数挂到 window
const w = window as unknown as Record<string, unknown>;
w['startDefense']  = () => gameScene?.startDefense();
w['toggleBeltMode']= () => gameScene?.toggleBeltMode();
w['activateTool']  = (tool: string) => gameScene?.activateTool(tool as 'conveyor' | 'splitter' | 'underground');
w['setSpeed']      = (spd: number) => {
  gameScene?.setTimeSpeed(spd);
  updateSpeedBtns(spd);
};
w['toggleDebug']   = () => {
  const panel = document.getElementById('debug-panel');
  const btn   = document.getElementById('debug-btn');
  if (!panel || !btn) return;
  const showing = panel.classList.toggle('show');
  btn.style.background = showing ? '#27AE60' : '';
  btn.style.color      = showing ? '#000'    : '';
};
w['clearDebugLog'] = () => {
  const el = document.getElementById('debug-log');
  if (el) el.innerHTML = '';
};
w['toggleFilter']  = (btn: HTMLElement) => {
  const tag = btn.dataset['tag'];
  if (!tag) return;
  btn.classList.toggle('on');
  const el = document.getElementById('debug-log');
  if (!el) return;
  const visible = btn.classList.contains('on');
  for (const line of el.querySelectorAll<HTMLElement>(`.dl.${tag}`)) {
    line.style.display = visible ? '' : 'none';
  }
};

function updateSpeedBtns(spd: number): void {
  ['btn-1x', 'btn-2x', 'btn-4x'].forEach(id =>
    document.getElementById(id)?.classList.remove('active'));
  const map: Record<number, string> = { 1: 'btn-1x', 2: 'btn-2x', 4: 'btn-4x' };
  if (map[spd]) document.getElementById(map[spd])?.classList.add('active');
  const pause = document.getElementById('btn-pause');
  if (pause) pause.textContent = spd === 0 ? '▶继续' : '⏸暂停';
}
