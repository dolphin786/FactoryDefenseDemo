import type { GameState, ResDisplay } from '../model/GameState';
import type { Building } from '../model/Building';
import { beltNextPos } from '../utils/GridUtils';
import { logger } from '../utils/DebugLogger';

/**
 * ProductionSystem — 机器加工 + 矿节点产矿
 *
 * 职责：
 *   - 铁/铜矿节点：按周期尝试向输出方向传送带推入矿石
 *   - 熔炉：从 inputBuf 取矿，加工后推入输出方向传送带
 *   - 组装机：从 inputBuf 取板材，产子弹写入相邻弹药箱
 *   - 每帧重建 ResDisplay（供 UI 显示）
 */
export class ProductionSystem {
  update(gs: GameState, dt: number): void {
    for (const b of gs.buildings) {
      switch (b.type) {
        case 'iron_ore_node':   this.updateOreNode(gs, b, dt, 'iron_ore');   break;
        case 'copper_ore_node': this.updateOreNode(gs, b, dt, 'copper_ore'); break;
        case 'furnace':         this.updateFurnace(gs, b, dt);               break;
        case 'assembler':       this.updateAssembler(gs, b, dt);             break;
      }
    }
    this.rebuildResDisplay(gs);
  }

  // ── 矿节点 ──

  private updateOreNode(
    gs: GameState,
    b: Building,
    dt: number,
    resType: 'iron_ore' | 'copper_ore',
  ): void {
    b.prodTimer += dt;
    if (b.prodTimer < 1) return;

    const np = beltNextPos(b);
    const tb = gs.getCell(np.x, np.y);
    if (tb?.type === 'conveyor' && tb.item == null) {
      tb.item = { type: resType, progress: 0 };
      b.prodTimer -= 1;
      logger.log('prod', `矿节点(${b.x},${b.y}) 产出 ${resType} → (${np.x},${np.y})`, `ore-${b.id}`);
    } else {
      b.prodTimer = 1.0; // 背压等待
      const reason = !tb ? '无格子' : tb.type !== 'conveyor' ? `非传送带(${tb.type})` : `传送带已满`;
      logger.log('warn', `矿节点(${b.x},${b.y}) dir=${b.dir}→(${np.x},${np.y}) 背压: ${reason}`, `ore-block-${b.id}`);
    }
  }

  // ── 熔炉 ──

  private updateFurnace(gs: GameState, b: Building, dt: number): void {
    b.prodTimer += dt;
    logger.log(
      'prod',
      `熔炉(${b.x},${b.y}) t=${b.prodTimer.toFixed(2)} Fe=${b.inputBuf.iron_ore ?? 0} Cu=${b.inputBuf.copper_ore ?? 0}`,
      `furnace-tick-${b.id}`,
    );
    if (b.prodTimer < 2) return;

    const hasIron   = (b.inputBuf.iron_ore   ?? 0) > 0;
    const hasCopper = (b.inputBuf.copper_ore ?? 0) > 0;
    let outputType: 'iron_plate' | 'copper_plate' | null = null;

    if      (b.lastOutput === 'iron'   && hasCopper) outputType = 'copper_plate';
    else if (b.lastOutput === 'copper' && hasIron)   outputType = 'iron_plate';
    else if (hasIron)                                 outputType = 'iron_plate';
    else if (hasCopper)                               outputType = 'copper_plate';

    if (!outputType) {
      b.prodTimer = 1.99;
      logger.log('prod', `熔炉(${b.x},${b.y}) 无原料等待`, `furnace-wait-${b.id}`);
      return;
    }

    // 扣料
    if (outputType === 'iron_plate')   { b.inputBuf.iron_ore   = (b.inputBuf.iron_ore   ?? 0) - 1; b.lastOutput = 'iron'; }
    else                               { b.inputBuf.copper_ore = (b.inputBuf.copper_ore ?? 0) - 1; b.lastOutput = 'copper'; }

    // 推入输出方向传送带
    const np = beltNextPos(b);
    const tb = gs.getCell(np.x, np.y);
    if (tb?.type === 'conveyor' && tb.item == null) {
      tb.item = { type: outputType, progress: 0 };
      b.prodTimer = 0;
      logger.log('prod', `✅ 熔炉(${b.x},${b.y}) 产 ${outputType} → (${np.x},${np.y})`);
    } else {
      // 还料，等待下帧
      if (outputType === 'iron_plate')   b.inputBuf.iron_ore   = (b.inputBuf.iron_ore   ?? 0) + 1;
      else                               b.inputBuf.copper_ore = (b.inputBuf.copper_ore ?? 0) + 1;
      b.prodTimer = 1.99;
      const reason = !tb ? '无格子' : tb.type !== 'conveyor' ? `非传送带(${tb.type})` : '传送带满';
      logger.log('warn', `❌ 熔炉(${b.x},${b.y}) 输出堵塞→(${np.x},${np.y}): ${reason}`);
    }
  }

  // ── 组装机 ──

  private updateAssembler(gs: GameState, b: Building, dt: number): void {
    b.prodTimer += dt;
    logger.log(
      'prod',
      `组装机(${b.x},${b.y}) t=${b.prodTimer.toFixed(2)} Fe板=${b.inputBuf.iron_plate ?? 0} Cu板=${b.inputBuf.copper_plate ?? 0}`,
      `asm-tick-${b.id}`,
    );
    if (b.prodTimer < 1) return;

    const hasIron   = (b.inputBuf.iron_plate   ?? 0) > 0;
    const hasCopper = (b.inputBuf.copper_plate ?? 0) > 0;
    if (hasIron && hasCopper) {
      b.inputBuf.iron_plate   = (b.inputBuf.iron_plate   ?? 0) - 1;
      b.inputBuf.copper_plate = (b.inputBuf.copper_plate ?? 0) - 1;
      b.prodTimer = 0;
      const stored = this.storeAmmoNearby(gs, b.x, b.y, 5);
      logger.log('ammo', `✅ 组装机(${b.x},${b.y}) 产5发子弹，存入${stored}发`);
    } else {
      b.prodTimer = 0.99;
      logger.log('prod', `组装机(${b.x},${b.y}) 缺料: Fe板=${hasIron} Cu板=${hasCopper}`, `asm-wait-${b.id}`);
    }
  }

  /** 向相邻弹药箱存入子弹，返回实际存入量 */
  private storeAmmoNearby(gs: GameState, x: number, y: number, amount: number): number {
    const dirs = [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];
    let stored = 0;
    for (const d of dirs) {
      const nb = gs.getCell(d.x, d.y);
      if (nb?.type === 'ammo_box') {
        const space = nb.ammoMax - nb.ammo;
        const add = Math.min(space, amount - stored);
        nb.ammo += add;
        stored += add;
        if (stored >= amount) break;
      }
    }
    return stored;
  }

  // ── 资源显示统计 ──

  private rebuildResDisplay(gs: GameState): void {
    const d: ResDisplay = { iron_ore: 0, copper_ore: 0, iron_plate: 0, copper_plate: 0, bullet: 0 };
    for (const b of gs.buildings) {
      if (b.type === 'conveyor' && b.item) {
        const t = b.item.type;
        if (t in d) (d as unknown as Record<string, number>)[t]++;
      }
      for (const [k, v] of Object.entries(b.inputBuf)) {
        if (k in d) (d as unknown as Record<string, number>)[k] += v ?? 0;
      }
      if (b.type === 'ammo_box') d.bullet += b.ammo;
    }
    gs.resDisplay = d;
  }
}
