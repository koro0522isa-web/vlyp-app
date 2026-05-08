"use client";

import { useReportWebVitals } from 'next/web-vitals';

/**
 * Web Vitalsを計測し、コンソールまたは解析サービス(PostHog等)に送信します
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // 開発環境ではコンソールに出力
    if (process.env.NODE_ENV === 'development') {
      console.log('Web Vital:', metric);
    }
    
    // 将来的にはここでPostHogやGoogle Analyticsに送信可能
    // Example: posthog.capture('web_vitals', metric);
  });

  return null;
}
