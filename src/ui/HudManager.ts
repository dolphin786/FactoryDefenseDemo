import type { GameState } from '../model/GameState';
import { LEVEL_CONFIGS } from '../config/LevelConfig';

/** HudManager — 管理顶部信息栏、资源栏的 DOM 更新 */
export class HudManager {
  updateTopBar(gs: GameState): void {
    this.setText('wave-info', `${gs.waveCurrent}/${gs.waveTotal || LEVEL_CONFIGS[gs.level - 1].totalWaves}`);
    this.setText('level-info', String(gs.level));
    this.updateCoreHp(gs);
  }

  updateCoreHp(gs: GameState): void {
    const el = document.getElementById('core-hp');
    if (!el) return;
    el.textContent = `${gs.coreHealth}/${gs.coreMaxHealth}`;
    const ratio = gs.coreHealth / gs.coreMaxHealth;
    el.className = 'hp-val' + (ratio < 0.3 ? ' low' : '');
  }

  updateResources(gs: GameState): void {
    const d = gs.resDisplay;
    this.setText('res-iron_ore',    String(Math.floor(d.iron_ore)));
    this.setText('res-copper_ore',  String(Math.floor(d.copper_ore)));
    this.setText('res-iron_plate',  String(Math.floor(d.iron_plate)));
    this.setText('res-copper_plate',String(Math.floor(d.copper_plate)));
    this.setText('res-bullet',      String(Math.floor(d.bullet)));
  }

  showCountdown(secs: number): void {
    const wrap = document.getElementById('cd-wrap');
    const el   = document.getElementById('wave-cd');
    if (wrap) wrap.style.display = 'flex';
    if (el)   el.textContent = String(Math.ceil(secs));
  }

  hideCountdown(): void {
    const wrap = document.getElementById('cd-wrap');
    if (wrap) wrap.style.display = 'none';
  }

  setPhaseLabel(text: string, color: string): void {
    const el = document.getElementById('phase-info');
    if (!el) return;
    el.textContent = text;
    el.style.color = color;
  }

  showStartBtn(): void  { this.setDisplay('start-btn', ''); }
  hideStartBtn(): void  { this.setDisplay('start-btn', 'none'); }

  private setText(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  private setDisplay(id: string, display: string): void {
    const el = document.getElementById(id);
    if (el) el.style.display = display;
  }
}
