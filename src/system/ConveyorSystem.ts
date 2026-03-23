import { BELT_SPEED, INPUT_BUF_MAX } from '../config/GameConfig';
import { RECIPE_MAP } from '../config/RecipeConfig';
import type { ResourceType } from '../config/BuildingConfig';
import { DIR_DX, DIR_DY } from '../config/GameConfig';
import type { Building, BeltItem } from '../model/Building';
import type { GameState } from '../model/GameState';
import { beltNextPos } from '../utils/GridUtils';
import { resolvePortDir } from '../utils/MultiBlockUtils';
import { logger } from '../utils/DebugLogger';

/**
 * ConveyorSystem — 传送带逐格流动
 *
 * 支持：
 *   conveyor        — 普通传送带
 *   splitter        — Factorio 式 2×1 分流器（多格建筑，锚点为上格）
 *   multiblock_body — 分流器副格（item 槽被锚点统一调度）
 *   underground_in  — 地下传送带入口
 *   underground_out — 地下传送带出口
 */
export class ConveyorSystem {
  update(gs: GameState, dt: number): void {
    const belts = gs.buildings.filter(b =>
      b.type === 'conveyor'        ||
      b.type === 'splitter'        ||
      b.type === 'multiblock_body' ||
      b.type === 'underground_in'  ||
      b.type === 'underground_out',
    );

    // 倒序：近似从末端往源头
    for (let i = belts.length - 1; i >= 0; i--) {
      const b = belts[i];

      // multiblock_body 不自主驱动，由锚点（splitter）统一处理
      if (b.type === 'multiblock_body') continue;

      // 推进物品进度
      if (b.item != null) b.item.progress += BELT_SPEED * dt;
      // 分流器：副槽（对应 body 格的输入）也推进
      if (b.type === 'splitter' && b.itemB != null) b.itemB.progress += BELT_SPEED * dt;

      switch (b.type) {
        case 'conveyor':
          if (b.item != null && b.item.progress >= 1.0) this.flushConveyor(gs, b);
          break;
        case 'splitter':
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

  // ── 分流器（Factorio 式 2×1） ─────────────────────────────────
  //
  // 锚点（splitter）在上格：
  //   b.item  = 上格输入槽
  //   b.itemB = 下格输入槽（body 格的 item 同步过来）
  //
  // 输入端口（来自 BuildingConfig.splitter.inputPorts）：
  //   上格后方 + 下格后方
  // 输出端口：上格前方 + 下格前方，按 outToggle 交替

  private tickSplitter(gs: GameState, anchor: Building): void {
    // 找到 body 格（通过 anchorId 反查）
    const body = gs.buildings.find(b => b.anchorId === anchor.id && b.type === 'multiblock_body');

    // 把 body 格的 item 同步到 anchor.itemB
    if (body && body.item != null && anchor.itemB == null) {
      anchor.itemB = body.item;
      body.item = null;
    }

    // 两个输出口坐标（沿 dir 方向，各自的格子前方）
    const outA = { x: anchor.x + DIR_DX[anchor.dir], y: anchor.y + DIR_DY[anchor.dir] };
    const outB = body
      ? { x: body.x + DIR_DX[anchor.dir], y: body.y + DIR_DY[anchor.dir] }
      : null;

    // 推出 anchor 槽
    if (anchor.item != null && anchor.item.progress >= 1.0) {
      this.flushSplitterSlot(anchor, 'a', outA, outB, gs);
    }
    // 推出 body 槽
    if (anchor.itemB != null && anchor.itemB.progress >= 1.0) {
      this.flushSplitterSlot(anchor, 'b', outA, outB, gs);
    }
  }

  private flushSplitterSlot(
    anchor: Building,
    slot: 'a' | 'b',
    outA: { x: number; y: number },
    outB: { x: number; y: number } | null,
    gs: GameState,
  ): void {
    const item = slot === 'a' ? anchor.item : anchor.itemB;
    if (item == null) return;

    const ordered = anchor.outToggle === 0 ? [outA, outB] : [outB, outA];

    for (const np of ordered) {
      if (np == null) continue;
      if (this.tryPush(gs, item, np.x, np.y)) {
        anchor.outToggle = 1 - anchor.outToggle;
        if (slot === 'a') anchor.item  = null;
        else              anchor.itemB = null;
        logger.log('belt', `分流器→(${np.x},${np.y}) ${item.type}`);
        return;
      }
    }
    item.progress = 1.0; // 都堵，等待
  }

  // ── 地下传送带 ────────────────────────────────────────────────

  private flushUndergroundIn(gs: GameState, b: Building): void {
    if (b.item == null) return;
    if (b.pairId == null) { b.item = null; return; }
    const outlet = gs.buildings.find(bb => bb.id === b.pairId && bb.type === 'underground_out');
    if (!outlet) { b.item = null; return; }
    if (outlet.item != null) { b.item.progress = 1.0; return; }
    outlet.item = { type: b.item.type, progress: 0, qty: b.item.qty };
    b.item = null;
    logger.log('belt', `地下(${b.x},${b.y})→(${outlet.x},${outlet.y})`);
  }

  // ── tryPush ───────────────────────────────────────────────────

  private tryPush(gs: GameState, item: BeltItem, tx: number, ty: number): boolean {
    const tb = gs.getCell(tx, ty);
    if (!tb) return false;

    // 普通传送带类（接受到空槽）
    if (
      tb.type === 'conveyor'        ||
      tb.type === 'underground_in'  ||
      tb.type === 'underground_out'
    ) {
      if (tb.item == null) {
        tb.item = { type: item.type, progress: 0, qty: item.qty ?? 1 };
        return true;
      }
      return false;
    }

    // 分流器锚点格：进 item 槽
    if (tb.type === 'splitter') {
      if (!this.isSplitterInputPort(gs, tb, tx, ty)) return false;
      if (tb.item == null) {
        tb.item = { type: item.type, progress: 0, qty: item.qty ?? 1 };
        return true;
      }
      return false;
    }

    // 分流器 body 格：进 item 槽（由 anchor 同步到 itemB）
    if (tb.type === 'multiblock_body') {
      if (!this.isBodyInputPort(gs, tb, tx, ty)) return false;
      if (tb.item == null) {
        tb.item = { type: item.type, progress: 0, qty: item.qty ?? 1 };
        return true;
      }
      return false;
    }

    // 机器 inputBuf（根据 inputPorts 配置判断是否接受）
    if (RECIPE_MAP.has(tb.type)) {
      return this.pushToMachineInput(gs, tb, item.type, tx, ty);
    }

    // 弹药箱
    if (tb.type === 'ammo_box' && item.type === 'bullet') {
      const space = tb.ammoMax - tb.ammo;
      if (space <= 0) return false;
      tb.ammo += Math.min(space, item.qty ?? 1);
      return true;
    }

    return false;
  }

  /**
   * 判断物品进入分流器锚点格的方向是否对准输入端口。
   * 输入方向 = 物品来自的方向（即推出方传送带的 dir）。
   * 这里用"目标格从哪个方向被进入"来判断。
   * 简化：传送带物品到达分流器任意方向都接受（输入端口由放置方向保证）。
   */
  private isSplitterInputPort(_gs: GameState, _anchor: Building, _tx: number, _ty: number): boolean {
    return true; // 简化：不做端口方向校验，由玩家保证放置合理
  }

  private isBodyInputPort(_gs: GameState, _body: Building, _tx: number, _ty: number): boolean {
    return true;
  }

  private pushToMachineInput(_gs: GameState, machine: Building, resType: ResourceType, tx: number, ty: number): boolean {
    const recipe = RECIPE_MAP.get(machine.type);
    if (!recipe?.accepts.includes(resType)) return false;

    const cur = machine.inputBuf[resType] ?? 0;
    if (cur >= INPUT_BUF_MAX) return false;
    machine.inputBuf[resType] = cur + 1;
    logger.log('belt', `  ↳ ${resType}→${machine.type}(${tx},${ty}) buf=${cur+1}`, `push-${machine.id}`);
    return true;
  }
}

// 让 resolvePortDir 被引用（避免 lint 报错）
const _unused = resolvePortDir;
void _unused;
