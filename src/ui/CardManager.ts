import { BUILDING_CONFIGS } from '../config/BuildingConfig';
import type { CardData } from '../model/Card';
import type { GameState } from '../model/GameState';

/**
 * 像素色块图标配置
 * 用 CSS background 色块代替 emoji，与复古像素风一致。
 */
const CARD_ICON_CFG: Record<string, { bg: string; label: string }> = {
  iron_ore_node:   { bg: '#8B4513', label: 'ORE' },
  copper_ore_node: { bg: '#CD7F32', label: 'ORE' },
  furnace:         { bg: '#C0392B', label: 'FRN' },
  assembler:       { bg: '#2471A3', label: 'ASM' },
  gun_tower:       { bg: '#922B21', label: 'GUN' },
  wall:            { bg: '#707B7C', label: 'WLL' },
  ammo_box:        { bg: '#D4AC0D', label: 'AMO' },
  conveyor:        { bg: '#4A5568', label: 'BLT' },
  iron_resource:   { bg: '#8B4513', label: 'ORE' },
  copper_resource: { bg: '#CD7F32', label: 'ORE' },
};

/** CardManager — 管理手牌栏的 DOM 渲染和点击事件 */
export class CardManager {
  private onCardSelected: (card: CardData) => void;

  constructor(onCardSelected: (card: CardData) => void) {
    this.onCardSelected = onCardSelected;
  }

  render(gs: GameState): void {
    const container = document.getElementById('hand-cards');
    if (!container) return;

    // Preserve horizontal scroll position so deck lane does not jump after using a card.
    const deckScroll = document.getElementById('deck-scroll');
    const prevScrollLeft = deckScroll instanceof HTMLElement ? deckScroll.scrollLeft : 0;

    container.innerHTML = '';

    for (const card of gs.hand) {
      const div = document.createElement('div');
      const cls = { resource: 'res', production: 'pro', defense: 'def', storage: 'sto' }[card.type] ?? '';
      const sel = gs.selectedCard?.id === card.id ? ' selected' : '';
      div.className = `card ${cls}${sel}`;

      // 确定图标 key 和名称
      let iconKey = '';
      let nm = '';
      let shortDesc = '';

      if (card.type === 'resource') {
        iconKey = card.resourceType === 'iron' ? 'iron_resource' : 'copper_resource';
        nm      = card.resourceType === 'iron' ? 'IRON' : 'CUPR';
        shortDesc = '1/s';
        // 耐久标记
        div.innerHTML = `<span class="cdur">x${card.durability}</span>`;
      } else {
        const btype = card.buildingType!;
        iconKey   = btype;
        const cfg = BUILDING_CONFIGS[btype];
        // 取名称前4个字母作为像素风缩写（英文）
        nm        = CARD_NAME_SHORT[btype] ?? cfg.name.slice(0, 4).toUpperCase();
        shortDesc = cfg.desc;
        div.innerHTML = '';
      }

      const icfg = CARD_ICON_CFG[iconKey];
      const iconHtml = icfg
        ? `<div class="card-icon-wrap">
             <div style="width:24px;height:24px;background:${icfg.bg};border:2px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;">
               <span style="font-family:var(--font-ui);font-size:7px;font-weight:700;color:rgba(255,255,255,0.92);letter-spacing:0.1px;line-height:1;">${icfg.label}</span>
             </div>
           </div>`
        : '<div class="card-icon-wrap"></div>';

      div.innerHTML += `${iconHtml}
        <div class="cname">${nm}</div>
        <div class="cdesc">${shortDesc}</div>`;

      div.title = `${nm} | ${shortDesc}`;

      div.addEventListener('click', () => this.onCardSelected(card));
      container.appendChild(div);
    }

    // 传送带按钮高亮
    const bb = document.getElementById('belt-btn');
    if (bb) bb.className = gs.beltMode ? 'active' : '';

    if (deckScroll instanceof HTMLElement) {
      requestAnimationFrame(() => {
        const maxScroll = Math.max(0, deckScroll.scrollWidth - deckScroll.clientWidth);
        deckScroll.scrollLeft = Math.min(prevScrollLeft, maxScroll);
      });
    }
  }
}

/** 建筑类型的像素风短名（全大写，≤6字符） */
const CARD_NAME_SHORT: Record<string, string> = {
  iron_ore_node:   'IRON',
  copper_ore_node: 'CUPR',
  furnace:         'FURNC',
  assembler:       'ASMBL',
  gun_tower:       'GUN',
  wall:            'WALL',
  ammo_box:        'AMMO',
  conveyor:        'BELT',
};
