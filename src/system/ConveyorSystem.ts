import { BELT_SPEED, INPUT_BUF_MAX } from '../config/GameConfig';
import { RECIPE_MAP } from '../config/RecipeConfig';
import type { ResourceType } from '../config/BuildingConfig';
import type { Building, BeltItem } from '../model/Building';
import type { GameState } from '../model/GameState';
import { beltNextPos } from '../utils/GridUtils';
import { logger } from '../utils/DebugLogger';

/**
 * ConveyorSystem — 传送带逐格流动
 *
 * 职责：
 *   1. 每帧推进传送带上物品的 progress
 *   2. progress >= 1 时尝试将物品推入下游（传送带或机器 inputBuf）
 *   3. 下游满则原地等待（背压）
 *
 * 更新顺序：倒序遍历，近似从末端往源头，避免同帧连续多格推进。
 */
export class ConveyorSystem {
  update(gs: GameState, dt: number): void {
    const belts = gs.buildings.filter(b => b.type === 'conveyor');

    if (belts.length === 0) {
      logger.log('belt', '场上无传送带', 'no-belt');
      return;
    }

    for (let i = belts.length - 1; i >= 0; i--) {
      const b = belts[i];
      if (b.item == null) continue;

      const prev = b.item.progress;
      b.item.progress += BELT_SPEED * dt;

      logger.log(
        'belt',
        `传送带(${b.x},${b.y})dir=${b.dir} ${b.item.type} ${prev.toFixed(2)}→${b.item.progress.toFixed(2)}`,
        `belt-${b.id}`,
      );

      if (b.item.progress >= 1.0) {
        const np = beltNextPos(b);
        const downstream = gs.getCell(np.x, np.y);
        const pushed = this.tryPushItem(gs, b.item, np.x, np.y);

        if (pushed) {
          logger.log(
            'belt',
            `  ✅ 推出 ${b.item.type} → (${np.x},${np.y}) [${downstream?.type ?? '空'}]`,
            `belt-push-${b.id}`,
          );
          b.item = null;
        } else {
          const reason = this.blockReason(gs, np.x, np.y, b.item.type);
          logger.log('warn', `  ❌ 堵塞(${b.x},${b.y})→(${np.x},${np.y}): ${reason}`, `belt-block-${b.id}`);
          b.item.progress = 1.0;
        }
      }
    }
  }

  /** 尝试将 item 推入 (tx,ty)：传送带空槽 / 机器 inputBuf / 弹药箱（子弹） */
  private tryPushItem(gs: GameState, item: BeltItem, tx: number, ty: number): boolean {
    const tb = gs.getCell(tx, ty);
    if (!tb) return false;

    // 推入传送带
    if (tb.type === 'conveyor') {
      if (tb.item == null) {
        tb.item = { type: item.type, progress: 0, qty: item.qty ?? 1 };
        return true;
      }
      return false;
    }

    // 推入机器 inputBuf（查配方表）
    if (RECIPE_MAP.has(tb.type)) {
      return this.pushToMachineInput(tb, item.type);
    }

    // 子弹推入弹药箱
    if (tb.type === 'ammo_box' && item.type === 'bullet') {
      const qty = item.qty ?? 1;
      const space = tb.ammoMax - tb.ammo;
      if (space <= 0) return false;
      tb.ammo += Math.min(space, qty);
      logger.log('ammo', `  子弹×${Math.min(space, qty)} 进入弹药箱(${tb.x},${tb.y}) [${tb.ammo}/${tb.ammoMax}]`);
      return true;
    }

    return false;
  }

  /** 向机器 inputBuf 推入一单位资源（从配方表检查 accepts） */
  private pushToMachineInput(machine: Building, resType: ResourceType): boolean {
    const recipe = RECIPE_MAP.get(machine.type);
    if (!recipe?.accepts.includes(resType)) {
      logger.log(
        'warn',
        `  机器(${machine.x},${machine.y})[${machine.type}] 不接受 ${resType}`,
        `push-reject-${machine.id}-${resType}`,
      );
      return false;
    }
    const cur = machine.inputBuf[resType] ?? 0;
    if (cur >= INPUT_BUF_MAX) {
      logger.log(
        'warn',
        `  机器(${machine.x},${machine.y}) buf满(${cur}/${INPUT_BUF_MAX}) ${resType}`,
        `push-full-${machine.id}-${resType}`,
      );
      return false;
    }
    machine.inputBuf[resType] = cur + 1;
    logger.log(
      'belt',
      `  ↳ 推入 ${resType} 到 ${machine.type}(${machine.x},${machine.y}) buf=${cur + 1}`,
      `push-ok-${machine.id}-${resType}`,
    );
    return true;
  }

  private blockReason(gs: GameState, tx: number, ty: number, resType: ResourceType): string {
    const tb = gs.getCell(tx, ty);
    if (!tb) return '目标格为空/越界';
    if (tb.type === 'conveyor')  return `下游传送带已满(${tb.item?.type ?? '?'})`;
    if (RECIPE_MAP.has(tb.type)) { const cur = tb.inputBuf[resType] ?? 0; return `机器buf满(${cur}/${INPUT_BUF_MAX}) ${resType}`; }
    if (tb.type === 'ammo_box')  return `弹药箱满(${tb.ammo}/${tb.ammoMax})`;
    return `目标格类型=${tb.type}不接受`;
  }
}
