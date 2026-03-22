import type { GameState, ResDisplay } from '../model/GameState';
import type { Building } from '../model/Building';
import type { BeltItem } from '../model/Building';
import { RECIPE_MAP, type RecipeDef, type RecipeVariant } from '../config/RecipeConfig';
import { beltNextPos } from '../utils/GridUtils';
import { logger } from '../utils/DebugLogger';

/**
 * ProductionSystem — 机器加工（由配方表 RECIPES 驱动）
 *
 * 所有生产规则从 RecipeConfig.ts 读取，ProductionSystem 本身不含任何
 * 具体配方逻辑，新增配方只需修改配置文件。
 *
 * 矿节点产矿推入输出方向传送带，加工机器从 inputBuf 取料，
 * 产物按 outputMode 推入传送带或弹药箱。
 */
export class ProductionSystem {
  update(gs: GameState, dt: number): void {
    for (const b of gs.buildings) {
      if (b.type === 'iron_ore_node' || b.type === 'copper_ore_node') {
        this.updateOreNode(gs, b, dt);
      } else {
        const recipe = RECIPE_MAP.get(b.type);
        if (recipe) this.updateMachine(gs, b, recipe, dt);
      }
    }
    this.rebuildResDisplay(gs);
  }

  // ── 矿节点 ──────────────────────────────────────────────────────

  private updateOreNode(gs: GameState, b: Building, dt: number): void {
    const oreType = b.type === 'iron_ore_node' ? 'iron_ore' : 'copper_ore';
    b.prodTimer += dt;
    if (b.prodTimer < 1) return;

    const np = beltNextPos(b);
    const tb = gs.getCell(np.x, np.y);
    if (tb?.type === 'conveyor' && tb.item == null) {
      tb.item = { type: oreType as BeltItem['type'], progress: 0, qty: 1 };
      b.prodTimer -= 1;
      logger.log('prod', `矿节点(${b.x},${b.y}) 产出 ${oreType}→(${np.x},${np.y})`, `ore-${b.id}`);
    } else {
      b.prodTimer = 1.0;
      const reason = !tb ? '输出格为空' : tb.type !== 'conveyor' ? `非传送带(${tb.type})` : '传送带已满';
      logger.log('warn', `矿节点(${b.x},${b.y}) dir=${b.dir}→(${np.x},${np.y}) 背压: ${reason}`, `ore-block-${b.id}`);
    }
  }

  // ── 加工机器（配方驱动）────────────────────────────────────────

  private updateMachine(gs: GameState, b: Building, recipe: RecipeDef, dt: number): void {
    if (!b.inputBuf) b.inputBuf = {};
    b.prodTimer += dt;

    const bufStr = recipe.accepts.map(r => `${r}:${b.inputBuf[r] ?? 0}`).join(' ');
    logger.log('prod', `${b.type}(${b.x},${b.y}) t=${b.prodTimer.toFixed(2)} [${bufStr}]`, `machine-${b.id}`);

    if (b.prodTimer < recipe.cycleTime) return;

    const variant = this.selectVariant(recipe, b);
    if (!variant) {
      b.prodTimer = recipe.cycleTime - 0.01;
      logger.log('prod', `${b.type}(${b.x},${b.y}) 无原料等待`, `machine-wait-${b.id}`);
      return;
    }

    // 消耗输入
    for (const [res, qty] of Object.entries(variant.inputs) as [string, number][]) {
      ((b.inputBuf as Record<string,number>)[res]) = (((b.inputBuf as Record<string,number>)[res]) ?? 0) - qty;
    }
    b.prodTimer = 0;

    // 记录输出类型（供熔炉交替逻辑）
    const firstOut = Object.keys(variant.outputs)[0];
    b.lastOutput = firstOut.includes('iron') ? 'iron' : 'copper';

    // 输出产品
    const outputDone = this.outputProducts(gs, b, recipe, variant);
    if (!outputDone) {
      // 输出失败（belt模式堵塞）：还原输入，等待
      for (const [res, qty] of Object.entries(variant.inputs) as [string, number][]) {
        ((b.inputBuf as Record<string,number>)[res]) = (((b.inputBuf as Record<string,number>)[res]) ?? 0) + qty;
      }
      b.prodTimer = recipe.cycleTime - 0.01;
    }
  }

  /**
   * 选择可执行的 variant
   * 多 variant（熔炉）：交替优先选上次未用的那种
   */
  private selectVariant(recipe: RecipeDef, b: Building): RecipeVariant | null {
    const { variants } = recipe;
    if (variants.length === 1) return this.canExecute(variants[0], b) ? variants[0] : null;

    // 交替：优先"上次没做"的
    const preferred = variants.find(v => {
      const outKey = Object.keys(v.outputs)[0];
      const side = outKey.includes('iron') ? 'iron' : 'copper';
      return side !== b.lastOutput && this.canExecute(v, b);
    });
    if (preferred) return preferred;
    return variants.find(v => this.canExecute(v, b)) ?? null;
  }

  private canExecute(variant: RecipeVariant, b: Building): boolean {
    for (const [res, qty] of Object.entries(variant.inputs) as [string, number][]) {
      if ((((b.inputBuf as Record<string,number>)[res]) ?? 0) < qty) return false;
    }
    return true;
  }

  /**
   * 将产品推入输出方向传送带。
   * 堵塞时还原输入，返回 false 由调用方等待。
   * 子弹以单个 BeltItem（qty=5）流动，到达弹药箱格由 ConveyorSystem 存入。
   */
  private outputProducts(gs: GameState, b: Building, _recipe: RecipeDef, variant: RecipeVariant): boolean {
    for (const [resType, qty] of Object.entries(variant.outputs) as [string, number][]) {
      const np = beltNextPos(b);
      const tb = gs.getCell(np.x, np.y);
      if (tb?.type === 'conveyor' && tb.item == null) {
        tb.item = { type: resType as BeltItem['type'], progress: 0, qty };
        logger.log('prod', `✅ ${b.type}(${b.x},${b.y}) 产出 ${resType}×${qty}→传送带(${np.x},${np.y})`);
      } else {
        const reason = !tb ? '输出格为空' : tb.type !== 'conveyor' ? `非传送带(${tb.type})` : '传送带已满';
        logger.log('warn', `❌ ${b.type}(${b.x},${b.y}) 输出堵塞: ${reason}`);
        return false;
      }
    }
    return true;
  }

  // ── 资源显示统计 ────────────────────────────────────────────────

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
