/**
 * DM の未読件数が変わったときに Sidebar / BottomNav が同期するためのカスタムイベント。
 * Supabase Realtime だけでは他レイアウトコンポーネントに届かないため使用する。
 */
export const DM_UNREAD_EVENT = 'vlyp:dm-unread-changed';

/** Stripe Checkout 成功などプロフィールの再取得が必要なときに Sidebar が購読する */
export const PROFILE_REFRESH_EVENT = 'vlyp:profile-refresh';

/** 通知の未読件数（Sidebar のベルバッジ用） */
export const NOTIF_UNREAD_EVENT = 'vlyp:notif-unread-changed';

export function broadcastDmUnread(total: number) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DM_UNREAD_EVENT, { detail: { total } }));
}

export function broadcastNotifUnread(total: number) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NOTIF_UNREAD_EVENT, { detail: { total } }));
}
