import { BELT_SPEED, INPUT_BUF_MAX } from '../config/GameConfig';
import { RECIPE_MAP } from '../config/RecipeConfig';
import type { ResourceType } from '../config/BuildingConfig';
import { DIR_DX, DIR_DY } from '../config/GameConfig';
import type { Building, BeltItem } from '../model/Building';
import type { GameState } from '../model/GameState';
import { beltNextPos } from '../utils/GridUtils';
import { logger } from '../utils/DebugLogger';

/**
 * ConveyorSystem — 传送带逐格流动
 *
 * 建筑类型：
 *   conveyor        — 普通传送带，逐格推进
 *   splitter_a/b    — Factorio 式分流器（2×1）
 *   underground_in  — 地下传送带入口，物品瞬间跳到配对出口
 *   underground_out — 地下传送带出口，行为同普通传送带
 *
 * 分流器（Factorio 式）详细行为：
 *   - splitter_a 为主格（持有逻辑），splitter_b 为副格（占格）
 *   - 两个输入：a.item + b.item（b 的物品每帧同步到 a.itemB 统一处理）
 *   - 两个输出：a 前方格 + b 前方格
 *   - 按 outToggle 交替决定先推哪个出口；某出口堵则全去另一个
 */
export class ConveyorSystem {
  update(gs: GameState, dt: number): void {
    const belts = gs.buildings.filter(b =>
      b.type === 'conveyor'       ||
      b.type === 'splitter_a'     ||
      b.type === 'splitter_b'     ||
      b.type === 'underground_in' ||
      b.type === 'underground_out',
    );

    // 倒序：近似从末端往源头，避免同帧连续多格推进
    for (let i = belts.length - 1; i >= 0; i--) {
      const b = belts[i];

      // splitter_b 不自主驱动，由 splitter_a 统一处理
      if (b.type === 'splitter_b') continue;

      // 推进物品进度
      if (b.item != null) b.item.progress += BELT_SPEED * dt;
      // splitter_a 的副槽也推进
      if (b.type === 'splitter_a' && b.itemB != null) b.itemB.progress += BELT_SPEED * dt;

      switch (b.type) {
        case 'conveyor':
          if (b.item != null && b.item.progress >= 1.0) this.flushConveyor(gs, b);
          break;
        case 'splitter_a':
          this.tickSplitter(gs, b);
          break;
        case 'underground_in':
          if (b.item != null && b.item.progress >= 1.0) this.flushUndergroundIn(gs, b);
          break;
        case 'underground_out':
          if (b.item != null && b.item.progress >= 1.0) this.flushConveyor(gs, b);
          break;
      }
    }
  }

  // ── 普通传送带 ────────────────────────────────────────────────

  private flushConveyor(gs: GameState, b: Building): void {
    if (b.item == null) return;
    const np = beltNextPos(b);
    if (this.tryPush(gs, b.item, np.x, np.y)) {
      logger.log('belt', `✅ (${b.x},${b.y})→(${np.x},${np.y}) ${b.item.type}`, `bp-${b.id}`);
      b.item = null;
    } else {
      b.item.progress = 1.0;
    }
  }

  // ── 分流器（Factorio 式） ──────────────────────────────────────

  private tickSplitter(gs: GameState, a: Building): void {
    // 找配对的 b 格
    const bCell = a.pairId != null
      ? gs.buildings.find(bb => bb.id === a.pairId && bb.type === 'splitter_b')
      : undefined;

    // 把 splitter_b 的 item 同步到 a.itemB（a 统一管理两个输入槽）
    if (bCell && bCell.item != null && a.itemB == null) {
      a.itemB = bCell.item;
      bCell.item = null;
    }

    // 两个输出口坐标
    const outA = beltNextPos(a); // a 格沿 dir 前方
    const outB = bCell
      ? { x: bCell.x + DIR_DX[a.dir], y: bCell.y + DIR_DY[a.dir] }
      : null;

    // 尝试推出 a 槽（a.item）
    if (a.item != null && a.item.progress >= 1.0) {
      this.flushSplitterSlot(gs, a, 'a', outA, outB);
    }
    // 尝试推出 b 槽（a.itemB）
    if (a.itemB != null && a.itemB.progress >= 1.0) {
      this.flushSplitterSlot(gs, a, 'b', outA, outB);
    }
  }

  /**
   * 将分流器的一个槽（a 或 b）中的物品推向输出口。
   * 按 outToggle 决定先推哪个出口；某出口堵则换另一个；都堵则原地等待。
   */
  private flushSplitterSlot(
    gs: GameState,
    a: Building,
    slot: 'a' | 'b',
    outA: { x: number; y: number },
    outB: { x: number; y: number } | null,
  ): void {
    const item = slot === 'a' ? a.item : a.itemB;
    if (item == null) return;

    // 按 outToggle 排列出口优先顺序
    const ordered = a.outToggle === 0
      ? [outA, outB]
      : [outB, outA];

    for (const np of ordered) {
      if (np == null) continue;
      if (this.tryPush(gs, item, np.x, np.y)) {
        a.outToggle = 1 - a.outToggle; // 切换，下次先推另一个出口
        if (slot === 'a') a.item  = null;
        else              a.itemB = null;
        logger.log('belt', `分流器→(${np.x},${np.y}) ${item.type}`);
        return;
      }
    }
    // 两个出口都堵
    item.progress = 1.0;
  }

  // ── 地下传送带 ────────────────────────────────────────────────

  private flushUndergroundIn(gs: GameState, b: Building): void {
    if (b.item == null) return;
    if (b.pairId == null) { b.item = null; return; }
    const outlet = gs.buildings.find(bb => bb.id === b.pairId && bb.type === 'underground_out');
    if (!outlet) { b.item = null; return; }
    if (outlet.item != null) { b.item.progress = 1.0; return; } // 出口被占，等待
    outlet.item = { type: b.item.type, progress: 0, qty: b.item.qty };
    b.item = null;
    logger.log('belt', `地下(${b.x},${b.y})→(${outlet.x},${outlet.y})`);
  }

  // ── tryPush：尝试推物品进目标格 ──────────────────────────────

  private tryPush(gs: GameState, item: BeltItem, tx: number, ty: number): boolean {
    const tb = gs.getCell(tx, ty);
    if (!tb) return false;

    // 传送带类（接受到空槽）
    if (
      tb.type === 'conveyor'       ||
      tb.type === 'underground_in' ||
      tb.type === 'underground_out'||
      tb.type === 'splitter_a'     ||
      tb.type === 'splitter_b'
    ) {
      if (tb.item == null) {
        tb.item = { type: item.type, progress: 0, qty: item.qty ?? 1 };
        return true;
      }
      return false;
    }

    // 机器 inputBuf
    if (RECIPE_MAP.has(tb.type)) return this.pushToMachineInput(tb, item.type);

    // 弹药箱
    if (tb.type === 'ammo_box' && item.type === 'bullet') {
      const space = tb.ammoMax - tb.ammo;
      if (space <= 0) return false;
      tb.ammo += Math.min(space, item.qty ?? 1);
      return true;
    }

    return false;
  }

  private pushToMachineInput(machine: Building, resType: ResourceType): boolean {
    const recipe = RECIPE_MAP.get(machine.type);
    if (!recipe?.accepts.includes(resType)) return false;
    const cur = machine.inputBuf[resType] ?? 0;
    if (cur >= INPUT_BUF_MAX) return false;
    machine.inputBuf[resType] = cur + 1;
    logger.log('belt', `  ↳ ${resType}→${machine.type}(${machine.x},${machine.y}) buf=${cur+1}`, `push-${machine.id}`);
    return true;
  }
}
