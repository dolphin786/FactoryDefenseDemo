/**
 * PixelIcons — 纯 Phaser Graphics 绘制的像素图标库
 *
 * 所有图标在 size×size 像素空间内绘制（默认 size=32）。
 * 调用方传入中心坐标 (cx, cy) 和目标尺寸，图标自动缩放。
 * 不依赖任何字体、emoji 或外部图片。
 *
 * 风格约定：
 *   - 只用矩形（fillRect / strokeRect）和少量圆形
 *   - 2px 网格感：坐标尽量取偶数
 *   - 每个图标有一个明显的"剪影特征"，小尺寸也可辨认
 */

import Phaser from 'phaser';

type G = Phaser.GameObjects.Graphics;

// ── 颜色常量（与 BalanceConfig/BuildingConfig 色系对应） ────────
const C = {
  white:    0xEEEEEE,
  black:    0x000000,
  amber:    0xFFB000,
  green:    0x39FF14,
  red:      0xFF3030,
  dim:      0x444444,
  // 建筑专色
  iron:     0x8B6050,
  copper:   0xCD7F32,
  furnaceA: 0xC0392B,
  furnaceB: 0xFF6B00,
  assembler:0x2471A3,
  tower:    0x8B1A1A,
  wall:     0x666870,
  ammoBox:  0xD4AC0D,
  belt:     0x3A4050,
  core:     0xFFD700,
  // 敌人
  bug:      0x8E44AD,
  tankBug:  0x5B2C6F,
};



// ════════════════════════════════════════════════════════════════
//  建筑图标
// ════════════════════════════════════════════════════════════════

export function drawIronOreNode(g: G, cx: number, cy: number, s: number): void {
  const u = s / 32; // 单位
  // 山形轮廓（三角形用台阶矩形模拟）
  g.fillStyle(C.iron, 1);
  g.fillRect(cx - 8*u, cy + 2*u,  16*u, 8*u);  // 底座
  g.fillRect(cx - 6*u, cy - 2*u,  12*u, 6*u);  // 中层
  g.fillRect(cx - 4*u, cy - 6*u,  8*u,  6*u);   // 顶层
  // 矿脉纹理（亮点）
  g.fillStyle(C.white, 0.35);
  g.fillRect(cx - 2*u, cy,     4*u, 2*u);
  g.fillRect(cx + 2*u, cy + 4*u, 2*u, 2*u);
  // 镐头
  g.fillStyle(C.amber, 1);
  g.fillRect(cx + 4*u, cy - 8*u, 6*u, 2*u);  // 镐横
  g.fillRect(cx + 8*u, cy - 10*u, 2*u, 6*u); // 镐竖
}

export function drawCopperOreNode(g: G, cx: number, cy: number, s: number): void {
  const u = s / 32;
  g.fillStyle(C.copper, 1);
  g.fillRect(cx - 8*u, cy + 2*u,  16*u, 8*u);
  g.fillRect(cx - 6*u, cy - 2*u,  12*u, 6*u);
  g.fillRect(cx - 4*u, cy - 6*u,  8*u,  6*u);
  g.fillStyle(0xFFCC88, 0.4);
  g.fillRect(cx - 2*u, cy,     4*u, 2*u);
  g.fillRect(cx + 2*u, cy + 4*u, 2*u, 2*u);
  g.fillStyle(C.amber, 1);
  g.fillRect(cx + 4*u, cy - 8*u, 6*u, 2*u);
  g.fillRect(cx + 8*u, cy - 10*u, 2*u, 6*u);
}

export function drawFurnace(g: G, cx: number, cy: number, s: number): void {
  const u = s / 32;
  // 炉体
  g.fillStyle(C.furnaceA, 1);
  g.fillRect(cx - 10*u, cy - 8*u, 20*u, 18*u);
  // 炉口（顶部凹口）
  g.fillStyle(0x1a1a1a, 1);
  g.fillRect(cx - 4*u, cy - 8*u, 8*u, 4*u);
  // 火焰（橙色小块）
  g.fillStyle(C.furnaceB, 1);
  g.fillRect(cx - 4*u, cy - 2*u, 4*u, 6*u);
  g.fillRect(cx + 2*u, cy,       4*u, 4*u);
  g.fillStyle(0xFFFF44, 0.8);
  g.fillRect(cx - 2*u, cy - 2*u, 2*u, 4*u);
  // 底座
  g.fillStyle(0x444444, 1);
  g.fillRect(cx - 12*u, cy + 10*u, 24*u, 4*u);
}

export function drawAssembler(g: G, cx: number, cy: number, s: number): void {
  const u = s / 32;
  // 主机身
  g.fillStyle(C.assembler, 1);
  g.fillRect(cx - 10*u, cy - 10*u, 20*u, 20*u);
  // 外框
  g.lineStyle(2*u, 0x4A90D9, 1);
  g.strokeRect(cx - 10*u, cy - 10*u, 20*u, 20*u);
  // 齿轮（用同心正方形模拟）
  g.fillStyle(0x1a3a5c, 1);
  g.fillRect(cx - 6*u, cy - 6*u, 12*u, 12*u);
  g.fillStyle(0x5BA3D9, 1);
  g.fillRect(cx - 4*u, cy - 4*u, 8*u, 8*u);
  g.fillStyle(0x1a3a5c, 1);
  g.fillRect(cx - 2*u, cy - 2*u, 4*u, 4*u);
  // 四角齿
  const td = 7*u;
  [[0,-td],[td,0],[0,td],[-td,0]].forEach(([dx,dy]) => {
    g.fillStyle(0x5BA3D9, 1);
    g.fillRect(cx + dx - u, cy + dy - u, 2*u, 2*u);
  });
}

export function drawGunTower(g: G, cx: number, cy: number, s: number): void {
  const u = s / 32;
  // 底座
  g.fillStyle(0x5a1010, 1);
  g.fillRect(cx - 10*u, cy + 4*u, 20*u, 8*u);
  // 炮塔体
  g.fillStyle(C.tower, 1);
  g.fillRect(cx - 8*u, cy - 6*u, 16*u, 12*u);
  // 炮管（向右）
  g.fillStyle(0x333333, 1);
  g.fillRect(cx + 4*u, cy - 2*u, 12*u, 4*u);
  // 炮口加亮
  g.fillStyle(C.amber, 1);
  g.fillRect(cx + 14*u, cy - 2*u, 2*u, 4*u);
  // 瞄准孔
  g.fillStyle(0xCC2222, 1);
  g.fillCircle(cx - 2*u, cy, 2*u);
}

export function drawWall(g: G, cx: number, cy: number, s: number): void {
  const u = s / 32;
  // 砖块图案（3行交错）
  const brickH = 6*u, brickW = 10*u, rows = 3;
  for (let row = 0; row < rows; row++) {
    const y0 = cy - (rows/2 - row) * brickH - brickH/2 + 2*u;
    const offset = (row % 2) * (brickW / 2);
    for (let bx = -16*u + offset; bx < 16*u; bx += brickW + 2*u) {
      g.fillStyle(C.wall, 1);
      g.fillRect(cx + bx, y0, brickW, brickH);
      // 砖缝
      g.fillStyle(0x444444, 1);
      g.fillRect(cx + bx + brickW, y0, 2*u, brickH);
      g.fillRect(cx + bx, y0 + brickH, brickW + 2*u, 2*u);
    }
  }
}

export function drawAmmoBox(g: G, cx: number, cy: number, s: number): void {
  const u = s / 32;
  // 箱体
  g.fillStyle(C.ammoBox, 1);
  g.fillRect(cx - 10*u, cy - 8*u, 20*u, 16*u);
  // 箱盖
  g.fillStyle(0xEEC900, 1);
  g.fillRect(cx - 10*u, cy - 8*u, 20*u, 4*u);
  // 锁扣
  g.fillStyle(0x888800, 1);
  g.fillRect(cx - 2*u, cy - 6*u, 4*u, 4*u);
  // 弹药符号（三个小竖条）
  g.fillStyle(0x333300, 1);
  for (let i = -2; i <= 2; i += 2) {
    g.fillRect(cx + i*u - u, cy + 2*u, 2*u, 6*u);
  }
}

export function drawConveyor(g: G, cx: number, cy: number, s: number, dir: number): void {
  const u = s / 32;
  // 底板
  g.fillStyle(C.belt, 1);
  g.fillRect(cx - 12*u, cy - 6*u, 24*u, 12*u);
  // 传送带纹路（斜纹）
  g.fillStyle(0x2a3040, 1);
  for (let i = -8; i <= 8; i += 4) {
    g.fillRect(cx + i*u, cy - 6*u, 2*u, 12*u);
  }
  // 方向箭头（实心三角，由矩形拼成）
  g.fillStyle(C.amber, 1);
  const DX = [1, 0, -1, 0];
  const DY = [0, 1, 0, -1];
  const dx = DX[dir], dy = DY[dir];
  // 箭头：中心方块 + 两个小耳朵
  g.fillRect(cx + dx*2*u - 2*u, cy + dy*2*u - 2*u, 4*u, 4*u);
  g.fillRect(cx + dx*4*u - 2*u, cy + dy*4*u - 2*u, 4*u, 4*u);
  // 箭羽
  g.fillRect(cx - dy*3*u - u, cy + dx*3*u - u, 2*u, 2*u);
  g.fillRect(cx + dy*3*u - u, cy - dx*3*u - u, 2*u, 2*u);
}

export function drawCore(g: G, cx: number, cy: number, s: number): void {
  const u = s / 32;
  // 外框（双边框）
  g.fillStyle(C.core, 1);
  g.fillRect(cx - 14*u, cy - 14*u, 28*u, 28*u);
  g.fillStyle(0x1a1a00, 1);
  g.fillRect(cx - 12*u, cy - 12*u, 24*u, 24*u);
  // 内核（菱形用矩形模拟）
  g.fillStyle(C.core, 1);
  g.fillRect(cx - 6*u, cy - 2*u,  12*u, 4*u);  // 横
  g.fillRect(cx - 2*u, cy - 6*u,  4*u,  12*u); // 竖
  g.fillRect(cx - 4*u, cy - 4*u,  8*u,  8*u);  // 中心方块
  // 发光点
  g.fillStyle(0xFFFFAA, 0.8);
  g.fillRect(cx - 2*u, cy - 2*u, 4*u, 4*u);
  // 四角装饰
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy]) => {
    g.fillStyle(C.core, 0.6);
    g.fillRect(cx + sx*10*u - u, cy + sy*10*u - u, 2*u, 2*u);
  });
}

// ════════════════════════════════════════════════════════════════
//  敌人图标（画在圆形底色之上）
// ════════════════════════════════════════════════════════════════

export function drawBugFace(g: G, cx: number, cy: number, r: number): void {
  const u = r / 16;
  // 眼睛（两个红色方块）
  g.fillStyle(C.red, 1);
  g.fillRect(cx - 5*u, cy - 3*u, 3*u, 3*u);
  g.fillRect(cx + 2*u, cy - 3*u, 3*u, 3*u);
  // 口部（锯齿线）
  g.fillStyle(C.white, 0.8);
  for (let i = -3; i <= 3; i += 2) {
    g.fillRect(cx + i*u, cy + 3*u, 2*u, 2*u);
  }
  // 触角
  g.fillStyle(C.white, 0.6);
  g.fillRect(cx - 7*u, cy - 7*u, 2*u, 4*u);
  g.fillRect(cx + 5*u, cy - 7*u, 2*u, 4*u);
}

export function drawTankBugFace(g: G, cx: number, cy: number, r: number): void {
  const u = r / 16;
  // 粗眉（装甲感）
  g.fillStyle(0x333333, 1);
  g.fillRect(cx - 8*u, cy - 6*u, 16*u, 2*u);
  // 眼睛（方块，更大）
  g.fillStyle(C.red, 1);
  g.fillRect(cx - 6*u, cy - 4*u, 4*u, 4*u);
  g.fillRect(cx + 2*u, cy - 4*u, 4*u, 4*u);
  // 装甲纹路
  g.fillStyle(0xFFFFFF, 0.15);
  g.fillRect(cx - 8*u, cy + 2*u, 16*u, 2*u);
  // 口（横线）
  g.fillStyle(C.white, 0.7);
  g.fillRect(cx - 4*u, cy + 4*u, 8*u, 2*u);
}

// ════════════════════════════════════════════════════════════════
//  方向箭头（用于传送带末端、悬停预览）
// ════════════════════════════════════════════════════════════════

export function drawDirArrow(g: G, cx: number, cy: number, dir: number, size: number, color: number): void {
  const u = size / 16;
  const DX = [1, 0, -1, 0];
  const DY = [0, 1, 0, -1];
  const dx = DX[dir], dy = DY[dir];
  // 箭杆
  g.fillStyle(color, 1);
  g.fillRect(cx + dx*2*u - u, cy + dy*2*u - u, 2*u, 2*u);
  g.fillRect(cx + dx*4*u - u, cy + dy*4*u - u, 2*u, 2*u);
  g.fillRect(cx + dx*6*u - u, cy + dy*6*u - u, 2*u, 2*u);
  // 箭头
  g.fillRect(cx + dx*6*u - 2*u, cy + dy*6*u - 2*u, 4*u, 4*u);
  // 侧翼
  g.fillRect(cx + dx*4*u - dy*2*u - u, cy + dy*4*u + dx*2*u - u, 2*u, 2*u);
  g.fillRect(cx + dx*4*u + dy*2*u - u, cy + dy*4*u - dx*2*u - u, 2*u, 2*u);
}

// ════════════════════════════════════════════════════════════════
//  统一绘制入口
// ════════════════════════════════════════════════════════════════

type DrawFn = (g: G, cx: number, cy: number, s: number) => void;

export const BUILDING_DRAW_FN: Record<string, DrawFn> = {
  iron_ore_node:   drawIronOreNode,
  copper_ore_node: drawCopperOreNode,
  furnace:         drawFurnace,
  assembler:       drawAssembler,
  gun_tower:       drawGunTower,
  wall:            drawWall,
  ammo_box:        drawAmmoBox,
  core:            drawCore,
  // conveyor 单独处理（需要 dir 参数）
};

/** 绘制建筑图标到独立 Graphics 对象（每个建筑单独一个，便于销毁重绘） */
export function drawBuildingIcon(
  scene: Phaser.Scene,
  b: { type: string; x: number; y: number; dir: number },
  cell: number,
  depth: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth);
  const cx = b.x * cell + cell / 2;
  const cy = b.y * cell + cell / 2;
  const iconSize = cell * 0.72; // 图标占格子 72%

  if (b.type === 'conveyor') {
    drawConveyor(g, cx, cy, iconSize, b.dir);
  } else {
    const fn = BUILDING_DRAW_FN[b.type];
    if (fn) fn(g, cx, cy, iconSize);
  }
  return g;
}
