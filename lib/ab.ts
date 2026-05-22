/**
 * 軽量 A/B テスト基盤 (localStorage 駆動)
 *
 * 使い方:
 *   const variant = getVariant('lp_hero_cta', ['A', 'B']);
 *   if (variant === 'B') { ... }
 *
 * イベント送信: track('lp_hero_cta_click', { variant })
 * PostHog が有効なら送信、未設定なら localStorage に counter 蓄積。
 */

const STORAGE_PREFIX = 'vlyp_ab_';

export function getVariant<T extends string>(experiment: string, options: readonly T[]): T {
  if (typeof window === 'undefined') return options[0];
  const key = `${STORAGE_PREFIX}${experiment}`;
  const existing = window.localStorage.getItem(key);
  if (existing && (options as readonly string[]).includes(existing)) {
    return existing as T;
  }
  const picked = options[Math.floor(Math.random() * options.length)];
  window.localStorage.setItem(key, picked);
  return picked;
}

export function track(event: string, props: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  // PostHog (env あれば)
  const ph = (window as any).posthog;
  try {
    ph?.capture?.(event, props);
  } catch {}
  // localStorage カウンタ (env無しでも基本的な可視化用)
  try {
    const key = `${STORAGE_PREFIX}events_${event}`;
    const raw = window.localStorage.getItem(key);
    const counter: Record<string, number> = raw ? JSON.parse(raw) : {};
    const variantKey = (props.variant as string) || '_';
    counter[variantKey] = (counter[variantKey] || 0) + 1;
    window.localStorage.setItem(key, JSON.stringify(counter));
  } catch {}
}
