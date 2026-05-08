/**
 * 後方互換用：一部環境で Stripe のエンドポイントが `/api/webhook/stripe` に向いている場合のエイリアス。
 * 本体ロジックは `/api/webhook` に一元化（二重処理による二重付与を防ぐ）。
 */
export { POST } from '../route';
