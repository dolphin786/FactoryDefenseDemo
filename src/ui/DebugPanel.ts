import { logger } from '../utils/DebugLogger';
import type { LogTag } from '../utils/DebugLogger';

/** DebugPanel — 绑定 Debug 面板的 DOM 事件 */
export class DebugPanel {
  init(): void {
    // 将操作函数挂到 window，供 HTML onclick 调用
    const w = window as unknown as Record<string, unknown>;
    w['toggleDebug']   = () => this.toggleDebug();
    w['clearDebugLog'] = () => logger.clearLog();
    w['toggleFilter']  = (btn: HTMLElement) => this.toggleFilter(btn);
  }

  private toggleDebug(): void {
    logger.enabled = !logger.enabled;
    document.getElementById('debug-panel')?.classList.toggle('show', logger.enabled);
    const btn = document.getElementById('debug-btn');
    if (btn) {
      btn.style.background = logger.enabled ? '#27AE60' : '';
      btn.style.color      = logger.enabled ? '#000'    : '';
    }
    if (logger.enabled) logger.log('info', '调试日志已开启');
  }

  private toggleFilter(btn: HTMLElement): void {
    const tag = btn.dataset['tag'] as LogTag | undefined;
    if (!tag) return;
    logger.filters[tag] = !logger.filters[tag];
    btn.classList.toggle('on', logger.filters[tag]);
    logger.toggleFilter(tag, logger.filters[tag]);
  }
}
