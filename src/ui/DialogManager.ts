import { BUILDING_CONFIGS } from '../config/BuildingConfig';
import { STARTER_DECKS, LEVEL_CONFIGS } from '../config/LevelConfig';
import { CARD_DEF_MAP } from '../config/CardConfig';
import type { RewardEntry } from '../config/LevelConfig';
import { makeCard } from '../model/Card';
import type { CardData } from '../model/Card';
import type { GameState } from '../model/GameState';

export type OnDeckPicked = (deckIndex: number) => void;
export type OnRetry      = () => void;
export type OnRestart    = () => void;
export type OnNextLevel  = (card: CardData) => void;

/**
 * DialogManager — 管理所有游戏弹窗（开局选卡/胜利/失败）
 *
 * 所有弹窗按钮均通过 addEventListener 绑定，不使用 onclick= 字符串，
 * 确保在 Vite ES Module 构建 + Electron 环境下正常工作。
 */
export class DialogManager {

  showStarterDeckDialog(onPicked: OnDeckPicked): void {
    let body = `<p style="margin-bottom:4px">三套卡组均含：铁矿x2 · 铜矿x2 · 熔炉x2 · 组装机 · 弹药箱 · 机枪塔x2</p>
      <p style="font-size:11px;color:#7F8C8D">各套额外附赠不同侧重的卡牌</p>`;

    const decksHtml = STARTER_DECKS.map((deck, idx) => {
      const typeCount: Record<string, number> = {};
      for (const cardId of deck.cardIds) {
        const def = CARD_DEF_MAP.get(cardId);
        const key = def?.name ?? cardId;
        typeCount[key] = (typeCount[key] ?? 0) + 1;
      }
      const summary = Object.entries(typeCount).map(([k, v]) => `${k}×${v}`).join(' · ');
      // data-idx 供事件绑定时读取，不用 onclick=
      return `<div class="starter-deck" data-idx="${idx}" style="border-color:${deck.color}">
        <div class="dk-icon">${deck.name.slice(0, 2)}</div>
        <div class="dk-name">${deck.name.slice(2).trim()}</div>
        <div class="dk-desc">${deck.desc}</div>
        <div class="dk-cards">${summary}</div>
      </div>`;
    }).join('');

    body += `<div class="starter-decks">${decksHtml}</div>`;
    this.open('⚗️ 选择起始卡组', '#F39C12', body, '');

    // 渲染完成后绑定点击事件
    document.querySelectorAll<HTMLElement>('.starter-deck').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset['idx'] ?? '0', 10);
        this.close();
        onPicked(idx);
      });
    });
  }

  showVictoryDialog(gs: GameState, onNext: OnNextLevel, onRestart: OnRestart): void {
    if (gs.level >= LEVEL_CONFIGS.length) {
      this.open('🎉 全关通关！', '#F39C12',
        `<p>成功抵御所有波次！</p><p>核心剩余: <strong>${gs.coreHealth}/${gs.coreMaxHealth}</strong></p>
         <p style="color:#F39C12;font-size:18px;margin-top:12px">🏆 你是工厂守卫大师！</p>`,
        `<button class="dbtn grn" id="dlg-restart-btn">再玩一次</button>`);
      document.getElementById('dlg-restart-btn')?.addEventListener('click', () => {
        this.close(); onRestart();
      });
      return;
    }

    const levelCfg = LEVEL_CONFIGS[gs.level - 1];
    const choices = this.pickWeightedRewards(levelCfg.rewardPool, 3);
    const choiceHtml = choices.map((c, i) => {
      const ico = c.type === 'resource'
        ? (c.resourceType === 'iron' ? '⛏️' : '🪨')
        : BUILDING_CONFIGS[c.buildingType!].emoji;
      const nm = c.type === 'resource'
        ? (c.resourceType === 'iron' ? '铁矿' : '铜矿')
        : BUILDING_CONFIGS[c.buildingType!].name;
      return `<div class="choice-card" data-idx="${i}">
        <div class="cico">${ico}</div><div class="cnm">${nm}</div></div>`;
    }).join('');

    this.open('🎉 防御成功！', '#F39C12',
      `<p>成功抵御 <strong>${gs.waveTotal}</strong> 波！</p>
       <p>核心剩余: <strong style="color:#27AE60">${gs.coreHealth}/${gs.coreMaxHealth}</strong></p>
       <p style="margin-top:12px;color:#F39C12">选择一张新建筑卡：</p>
       <div class="card-choices">${choiceHtml}</div>`, '');

    document.querySelectorAll<HTMLElement>('.choice-card').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset['idx'] ?? '0', 10);
        this.close();
        onNext(makeCard(choices[idx]));
      });
    });
  }

  showDefeatDialog(gs: GameState, onRetry: OnRetry, onRestart: OnRestart): void {
    this.open('💀 防御失败', '#E74C3C',
      `<p>核心已被摧毁！</p><p>成功抵御: <strong>${gs.waveCurrent}</strong>/${gs.waveTotal} 波</p>`,
      `<button class="dbtn red" id="dlg-retry-btn">重试本关</button>
       <button class="dbtn"     id="dlg-restart-btn">重新开始</button>`);
    document.getElementById('dlg-retry-btn')?.addEventListener('click', () => {
      this.close(); onRetry();
    });
    document.getElementById('dlg-restart-btn')?.addEventListener('click', () => {
      this.close(); onRestart();
    });
  }

  close(): void {
    document.getElementById('overlay')?.classList.remove('show');
  }

  private open(title: string, titleColor: string, body: string, btns: string): void {
    const el = document.getElementById('overlay');
    const t  = document.getElementById('dlg-title');
    const b  = document.getElementById('dlg-body');
    const bn = document.getElementById('dlg-btns');
    if (!el || !t || !b || !bn) return;
    t.textContent = title; t.style.color = titleColor;
    b.innerHTML = body; bn.innerHTML = btns;
    el.classList.add('show');
  }

  private pickWeightedRewards(pool: RewardEntry[], n: number): Omit<CardData, 'id'>[] {
    const available = [...pool];
    const result: Omit<CardData, 'id'>[] = [];
    while (result.length < n && available.length > 0) {
      const totalWeight = available.reduce((s, e) => s + e.weight, 0);
      let roll = Math.random() * totalWeight;
      const idx = available.findIndex(e => { roll -= e.weight; return roll <= 0; });
      const picked = available.splice(idx < 0 ? 0 : idx, 1)[0];
      const def = CARD_DEF_MAP.get(picked.cardId);
      if (!def) continue;
      result.push({
        type: def.type, resourceType: def.resourceType,
        durability: def.durability, buildingType: def.buildingType,
      });
    }
    return result;
  }
}
