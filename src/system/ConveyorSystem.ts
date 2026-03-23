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
 * 支持：
 *   conveyor      — 普通传送带，逐格推进
 *   splitter      — 分流器：1入2出，交替推给左侧和右侧出口
 *   underground_in  — 地下传送带入口：物品瞬间跳到配对出口
 *   underground_out — 地下传送带出口：物品继续沿 dir 方向前进
 */
export class ConveyorSystem {
  update(gs: GameState, dt: number): void {
    // 倒序更新，近似从末端往源头，避免同帧连续多格推进
    const belts = gs.buildings.filter(b =>
      b.type === 'conveyor' || b.type === 'splitter' ||
      b.type === 'underground_in' || b.type === 'underground_out',
    );

    for (let i = belts.length - 1; i >= 0; i--) {
      const b = belts[i];
      if (b.item == null) continue;

      b.item.progress += BELT_SPEED * dt;

      if (b.item.progress < 1.0) continue;

      // 到达格子末端，尝试推出
      switch (b.type) {
        case 'conveyor':
          this.flushConveyor(gs, b); break;
        case 'splitter':
          this.flushSplitter(gs, b); break;
        case 'underground_in':
          this.flushUndergroundIn(gs, b); break;
        case 'underground_out':
          this.flushConveyor(gs, b); break; // 出口行为和普通传送带一样
      }
    }
  }

  // ── 普通传送带推出 ────────────────────────────────────────────

  private flushConveyor(gs: GameState, b: Building): void {
    if (b.item == null) return;
    const np = beltNextPos(b);
    const pushed = this.tryPushItem(gs, b.item, np.x, np.y);
    if (pushed) {
      logger.log('belt', `  ✅ 推出 ${b.item.type} → (${np.x},${np.y})`, `belt-push-${b.id}`);
      b.item = null;
    } else {
      logger.log('warn', `  ❌ 堵塞(${b.x},${b.y})→(${np.x},${np.y}): ${this.blockReason(gs, np.x, np.y, b.item.type)}`, `belt-block-${b.id}`);
      b.item.progress = 1.0;
    }
  }

  // ── 分流器推出（交替左/右） ───────────────────────────────────

  private flushSplitter(gs: GameState, b: Building): void {
    if (b.item == null) return;
    const leftDir  = (b.dir + 3) % 4;
    const rightDir = (b.dir + 1) % 4;
    const dirs = b.splitterToggle === 0 ? [leftDir, rightDir] : [rightDir, leftDir];

    for (const d of dirs) {
      const tx = b.x + DIR_DX[d];
      const ty = b.y + DIR_DY[d];
      if (this.tryPushItem(gs, b.item, tx, ty)) {
        b.splitterToggle = 1 - b.splitterToggle;
        b.item = null;
        logger.log('belt', `  分流器(${b.x},${b.y}) → dir${d}(${tx},${ty})`);
        return;
      }
    }
    b.item.progress = 1.0;
    logger.log('warn', `  分流器(${b.x},${b.y}) 两侧均堵`);
  }

  // ── 地下传送带入口推出（瞬间跳到出口） ──────────────────────

  private flushUndergroundIn(gs: GameState, b: Building): void {
    if (b.item == null) return;
    if (b.undergroundPairId == null) {
      b.item = null;
      logger.log('warn', `地下入口(${b.x},${b.y}) 无配对出口`);
      return;
    }
    const outlet = gs.buildings.find(bb => bb.id === b.undergroundPairId);
    if (!outlet || outlet.type !== 'underground_out') {
      b.item = null;
      logger.log('warn', `地下入口(${b.x},${b.y}) 配对出口不存在`);
      return;
    }
    if (outlet.item != null) {
      b.item.progress = 1.0;
      logger.log('warn', `地下入口(${b.x},${b.y}) 出口被占，等待`, `ug-block-${b.id}`);
      return;
    }
    outlet.item = { type: b.item.type, progress: 0, qty: b.item.qty };
    b.item = null;
    logger.log('belt', `地下传送 (${b.x},${b.y}) → (${outlet.x},${outlet.y}) ${outlet.item!.type}`);
  }

  // ── tryPushItem ───────────────────────────────────────────────

  private tryPushItem(gs: GameState, item: BeltItem, tx: number, ty: number): boolean {
    const tb = gs.getCell(tx, ty);
    if (!tb) return false;

    if (tb.type === 'conveyor' || tb.type === 'underground_out') {
      if (tb.item == null) {
        tb.item = { type: item.type, progress: 0, qty: item.qty ?? 1 };
        return true;
      }
      return false;
    }

    // 分流器：只要槽位空就接受
    if (tb.type === 'splitter') {
      if (tb.item == null) {
        tb.item = { type: item.type, progress: 0, qty: item.qty ?? 1 };
        return true;
      }
      return false;
    }

    if (RECIPE_MAP.has(tb.type)) return this.pushToMachineInput(tb, item.type);

    if (tb.type === 'ammo_box' && item.type === 'bullet') {
      const qty = item.qty ?? 1;
      const space = tb.ammoMax - tb.ammo;
      if (space <= 0) return false;
      tb.ammo += Math.min(space, qty);
      logger.log('ammo', `  子弹×${Math.min(space, qty)} → 弹药箱(${tb.x},${tb.y})`);
      return true;
    }

    // 地下传送带入口：从前方推入
    if (tb.type === 'underground_in') {
      if (tb.item == null) {
        tb.item = { type: item.type, progress: 0, qty: item.qty ?? 1 };
        return true;
      }
      return false;
    }

    return false;
  }

  private pushToMachineInput(machine: Building, resType: ResourceType): boolean {
    const recipe = RECIPE_MAP.get(machine.type);
    if (!recipe?.accepts.includes(resType)) return false;
    const cur = machine.inputBuf[resType] ?? 0;
    if (cur >= INPUT_BUF_MAX) return false;
    machine.inputBuf[resType] = cur + 1;
    logger.log('belt', `  ↳ 推入 ${resType} → ${machine.type}(${machine.x},${machine.y}) buf=${cur + 1}`, `push-${machine.id}-${resType}`);
    return true;
  }

  private blockReason(gs: GameState, tx: number, ty: number, resType: ResourceType): string {
    const tb = gs.getCell(tx, ty);
    if (!tb) return '目标格为空/越界';
    if (tb.type === 'conveyor' || tb.type === 'underground_out') return `传送带已满(${tb.item?.type ?? '?'})`;
    if (RECIPE_MAP.has(tb.type)) { const cur = tb.inputBuf[resType] ?? 0; return `机器buf满(${cur}/${INPUT_BUF_MAX}) ${resType}`; }
    if (tb.type === 'ammo_box') return `弹药箱满(${tb.ammo}/${tb.ammoMax})`;
    return `目标格类型=${tb.type}不接受`;
  }
}
