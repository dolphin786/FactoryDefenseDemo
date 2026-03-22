export type LogTag = 'belt' | 'prod' | 'ammo' | 'tower' | 'warn' | 'info';

class DebugLogger {
  enabled = false;
  filters: Record<LogTag, boolean> = {
    belt: true, prod: true, ammo: true, tower: true, warn: true, info: true,
  };
  private readonly maxLines = 200;
  private readonly throttleMap = new Map<string, number>();
  private readonly throttleSec = 0.5;

  log(tag: LogTag, msg: string, throttleKey?: string): void {
    if (!this.enabled) return;
    if (!this.filters[tag]) return;
    if (throttleKey) {
      const now = performance.now() / 1000;
      const last = this.throttleMap.get(throttleKey) ?? 0;
      if (now - last < this.throttleSec) return;
      this.throttleMap.set(throttleKey, now);
    }
    const el = document.getElementById('debug-log');
    if (!el) return;
    const line = document.createElement('span');
    line.className = `dl ${tag}`;
    const t = (performance.now() / 1000).toFixed(2);
    line.textContent = `[${t}][${tag.toUpperCase()}] ${msg}`;
    el.appendChild(line);
    while (el.children.length > this.maxLines) el.removeChild(el.firstChild!);
    el.scrollTop = el.scrollHeight;
  }

  clearLog(): void {
    const el = document.getElementById('debug-log');
    if (el) el.innerHTML = '';
    this.throttleMap.clear();
  }

  toggleFilter(tag: LogTag, enabled: boolean): void {
    this.filters[tag] = enabled;
    const el = document.getElementById('debug-log');
    if (!el) return;
    for (const line of el.querySelectorAll<HTMLElement>('.dl')) {
      const lineTag = [...line.classList].find(c => c !== 'dl') as LogTag | undefined;
      if (lineTag) line.style.display = this.filters[lineTag] ? '' : 'none';
    }
  }
}

// 单例
export const logger = new DebugLogger();
