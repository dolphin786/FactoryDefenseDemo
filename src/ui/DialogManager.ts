import { BUILDING_CONFIGS } from '../config/BuildingConfig';
import { STARTER_DECKS, REWARD_POOL } from '../config/LevelConfig';
import { makeCard } from '../model/Card';
import type { CardData } from '../model/Card';
import type { GameState } from '../model/GameState';

export type OnDeckPicked   = (deckIndex: number) => void;
export type OnRewardPicked = (card: CardData) => void;
export type OnRetry        = () => void;
export type OnRestart      = () => void;
export type OnNextLevel    = (card: CardData) => void;

/** DialogManager — 管理所有游戏弹窗（开局选卡/胜利/失败） */
export class DialogManager {
  showStarterDeckDialog(onPicked: OnDeckPicked): void {
    const title = '⚗️ 选择起始卡组';
    let body = `<p style="margin-bottom:4px">三套卡组均含：铁矿x2 · 铜矿x2 · 熔炉x2 · 组装机 · 弹药箱 · 机枪塔x2</p>
      <p style="font-size:11px;color:#7F8C8D">各套额外附赠不同侧重的卡牌</p>`;

    const decksHtml = STARTER_DECKS.map((deck, idx) => {
      const typeCount: Record<string, number> = {};
      for (const c of deck.cards) {
        const key = c.type === 'resource'
          ? (c.resourceType === 'iron' ? '铁矿' : '铜矿')
          : (BUILDING_CONFIGS[c.buildingType!]?.name ?? c.buildingType ?? '');
        typeCount[key] = (typeCount[key] ?? 0) + 1;
      }
      const summary = Object.entries(typeCount).map(([k, v]) => `${k}×${v}`).join(' · ');
      return `<div class="starter-deck" style="border-color:${deck.color}" onclick="window._dlg_deckPick(${idx})">
        <div class="dk-icon">${deck.name.slice(0, 2)}</div>
        <div class="dk-name">${deck.name.slice(2).trim()}</div>
        <div class="dk-desc">${deck.desc}</div>
        <div class="dk-cards">${summary}</div>
      </div>`;
    }).join('');

    body += `<div class="starter-decks">${decksHtml}</div>`;
    this.open(title, '#F39C12', body, '');

    ((window as unknown) as Record<string, unknown>)['_dlg_deckPick'] = (idx: number) => {
      this.close();
      onPicked(idx);
    };
  }

  showVictoryDialog(gs: GameState, onNext: OnNextLevel, onRestart: OnRestart): void {
    if (gs.level >= 3) {
      this.open('🎉 全关通关！', '#F39C12',
        `<p>成功抵御所有波次！</p><p>核心剩余: <strong>${gs.coreHealth}/${gs.coreMaxHealth}</strong></p>
         <p style="color:#F39C12;font-size:18px;margin-top:12px">🏆 你是工厂守卫大师！</p>`,
        `<button class="dbtn grn" onclick="window._dlg_restart()">再玩一次</button>`);
      ((window as unknown) as Record<string, unknown>)['_dlg_restart'] = () => { this.close(); onRestart(); };
      return;
    }

    const choices = this.pickRewardChoices(3);
    const choiceHtml = choices.map((c, i) => {
      const ico = c.type === 'resource'
        ? (c.resourceType === 'iron' ? '⛏️' : '🪨')
        : BUILDING_CONFIGS[c.buildingType!].emoji;
      const nm = c.type === 'resource'
        ? (c.resourceType === 'iron' ? '铁矿' : '铜矿')
        : BUILDING_CONFIGS[c.buildingType!].name;
      return `<div class="choice-card" onclick="window._dlg_reward(${i})">
        <div class="cico">${ico}</div><div class="cnm">${nm}</div></div>`;
    }).join('');

    this.open('🎉 防御成功！', '#F39C12',
      `<p>成功抵御 <strong>${gs.waveTotal}</strong> 波！</p>
       <p>核心剩余: <strong style="color:#27AE60">${gs.coreHealth}/${gs.coreMaxHealth}</strong></p>
       <p style="margin-top:12px;color:#F39C12">选择一张新建筑卡：</p>
       <div class="card-choices">${choiceHtml}</div>`, '');

    ((window as unknown) as Record<string, unknown>)['_dlg_reward'] = (idx: number) => {
      this.close();
      onNext(makeCard(choices[idx]));
    };
  }

  showDefeatDialog(gs: GameState, onRetry: OnRetry, onRestart: OnRestart): void {
    this.open('💀 防御失败', '#E74C3C',
      `<p>核心已被摧毁！</p><p>成功抵御: <strong>${gs.waveCurrent}</strong>/${gs.waveTotal} 波</p>`,
      `<button class="dbtn red" onclick="window._dlg_retry()">重试本关</button>
       <button class="dbtn"     onclick="window._dlg_restart()">重新开始</button>`);
    ((window as unknown) as Record<string, unknown>)['_dlg_retry']   = () => { this.close(); onRetry(); };
    ((window as unknown) as Record<string, unknown>)['_dlg_restart'] = () => { this.close(); onRestart(); };
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

  private pickRewardChoices(n: number): Omit<CardData, 'id'>[] {
    const pool = [...REWARD_POOL];
    const result: Omit<CardData, 'id'>[] = [];
    while (result.length < n && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      result.push(pool.splice(idx, 1)[0]);
    }
    return result;
  }
}
