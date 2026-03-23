import Phaser from 'phaser';
import { CANVAS_W, CANVAS_H } from './config/GameConfig';
import { GameScene } from './scene/GameScene';

let gameScene: GameScene | null = null;

// ── 工具函数 ──────────────────────────────────────────────────

function btn(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function updateSpeedBtns(spd: number): void {
  ['btn-1x', 'btn-2x', 'btn-4x'].forEach(id => btn(id)?.classList.remove('active'));
  const map: Record<number, string> = { 1: 'btn-1x', 2: 'btn-2x', 4: 'btn-4x' };
  if (map[spd]) btn(map[spd])?.classList.add('active');
  const pause = btn('btn-pause');
  if (pause) pause.textContent = spd === 0 ? '▶继续' : 'II';
}

// ── DOM 事件绑定 ──────────────────────────────────────────────
// 全部使用 addEventListener，不依赖 onclick= 字符串。
// Vite 将 main.ts 打包为 ES Module，模块内变量不暴露到全局 window，
// onclick="foo()" 这类写法在构建后找不到函数，导致所有按钮失效。

function bindButtons(): void {
  // 速度控制
  btn('btn-pause')?.addEventListener('click', () => {
    gameScene?.setTimeSpeed(0);
    updateSpeedBtns(0);
  });
  btn('btn-1x')?.addEventListener('click', () => { gameScene?.setTimeSpeed(1); updateSpeedBtns(1); });
  btn('btn-2x')?.addEventListener('click', () => { gameScene?.setTimeSpeed(2); updateSpeedBtns(2); });
  btn('btn-4x')?.addEventListener('click', () => { gameScene?.setTimeSpeed(4); updateSpeedBtns(4); });

  // 开始防御
  btn('start-btn')?.addEventListener('click', () => gameScene?.startDefense());

  // 传送带工具
  btn('belt-btn')?.addEventListener('click',        () => gameScene?.activateTool('conveyor'));
  btn('splitter-btn')?.addEventListener('click',    () => gameScene?.activateTool('splitter'));
  btn('underground-btn')?.addEventListener('click', () => gameScene?.activateTool('underground'));

  // Debug 面板开关
  btn('debug-btn')?.addEventListener('click', () => {
    const panel = btn('debug-panel');
    const dbgBtn = btn('debug-btn');
    if (!panel || !dbgBtn) return;
    const showing = panel.classList.toggle('show');
    dbgBtn.style.background = showing ? '#27AE60' : '';
    dbgBtn.style.color      = showing ? '#000'    : '';
  });

  // Debug 清空日志
  btn('debug-clear-btn')?.addEventListener('click', () => {
    const el = btn('debug-log');
    if (el) el.innerHTML = '';
  });

  // Debug 过滤按钮
  document.querySelectorAll<HTMLElement>('.df-btn').forEach(filterBtn => {
    filterBtn.addEventListener('click', () => {
      const tag = filterBtn.dataset['tag'];
      if (!tag) return;
      filterBtn.classList.toggle('on');
      const visible = filterBtn.classList.contains('on');
      document.querySelectorAll<HTMLElement>(`#debug-log .dl.${tag}`).forEach(line => {
        line.style.display = visible ? '' : 'none';
      });
    });
  });
}

// ── Phaser 初始化 ─────────────────────────────────────────────
// requestAnimationFrame 确保 flex 布局完成后再初始化，
// 避免 Electron 下 #game-area 高度为 0 导致画布不显示。

function initPhaser(): void {
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

  window.addEventListener('resize', () => game.scale.refresh());

  game.events.on('ready', () => {
    gameScene = game.scene.getScene('GameScene') as GameScene;
    game.scale.refresh();
  });
}

// ── 启动 ─────────────────────────────────────────────────────

function start(): void {
  bindButtons();
  requestAnimationFrame(initPhaser);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
