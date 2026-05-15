'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ja">
      <body style={{ background: '#09090b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', margin: 0, fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '12px' }}>予期しないエラーが発生しました</h2>
          <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '24px' }}>申し訳ありません。エラーは自動的に報告されます。</p>
          <button
            onClick={reset}
            style={{ background: '#a78bfa', color: '#000', border: 'none', borderRadius: '100px', padding: '12px 28px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
          >
            再試行する
          </button>
        </div>
      </body>
    </html>
  );
}
