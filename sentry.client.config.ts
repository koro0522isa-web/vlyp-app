import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,       // 本番トラフィックの10%だけトレース
  replaysSessionSampleRate: 0, // セッションリプレイは無効（フリープランの帯域節約）
  replaysOnErrorSampleRate: 1.0,
  integrations: [],
});
