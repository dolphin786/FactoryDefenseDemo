import { BUILDING_CONFIGS } from '../config/BuildingConfig';
import type { CardData } from '../model/Card';
import type { GameState } from '../model/GameState';

/** CardManager — 管理手牌栏的 DOM 渲染和点击事件 */
export class CardManager {
  private onCardSelected: (card: CardData) => void;

  constructor(onCardSelected: (card: CardData) => void) {
    this.onCardSelected = onCardSelected;
  }

  render(gs: GameState): void {
    const container = document.getElementById('hand-cards');
    if (!container) return;
    container.innerHTML = '';

    for (const card of gs.hand) {
      const div = document.createElement('div');
      const cls = { resource: 'res', production: 'pro', defense: 'def', storage: 'sto' }[card.type] ?? '';
      const sel = gs.selectedCard?.id === card.id ? ' selected' : '';
      div.className = `card ${cls}${sel}`;

      let ico = '', nm = '', desc = '';
      if (card.type === 'resource') {
        ico  = card.resourceType === 'iron' ? '⛏️' : '🪨';
        nm   = card.resourceType === 'iron' ? '铁矿' : '铜矿';
        desc = '1矿/秒';
        div.innerHTML = `<span class="cdur">●${card.durability}</span>`;
      } else {
        const cfg = BUILDING_CONFIGS[card.buildingType!];
        ico = cfg.emoji; nm = cfg.name; desc = cfg.desc;
      }
      div.innerHTML += `<div class="cicon">${ico}</div><div class="cname">${nm}</div><div class="cdesc">${desc}</div>`;
      div.addEventListener('click', () => this.onCardSelected(card));
      container.appendChild(div);
    }

    // 传送带按钮高亮
    const bb = document.getElementById('belt-btn');
    if (bb) bb.className = gs.beltMode ? 'active' : '';
  }
}
