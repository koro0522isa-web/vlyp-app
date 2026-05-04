# VLYP株式会社 社員名簿

全社員は `.claude/agents/` 配下のファイルで定義されています。
CEOはTaskツールで各社員を召喚して作業を指示します。

| コード | 役職 | 主担当 |
|--------|------|--------|
| `cto` | CTO | 技術戦略・アーキテクチャ・コードレビュー統括 |
| `frontend-engineer` | フロントエンドエンジニア | Next.js 14 / React / Tailwind |
| `backend-engineer` | バックエンドエンジニア | Supabase / RLS / Edge Function / API |
| `payment-engineer` | 決済エンジニア | Stripe (Webhook / Checkout / Subscription) |
| `video-engineer` | 動画エンジニア | Cloudflare Stream / 縦型変換 / FFmpeg |
| `devops-engineer` | DevOpsエンジニア | Vercel / ドメイン / 環境変数 / CI |
| `qa-engineer` | QAエンジニア | バグ再現・テスト計画・回帰テスト |
| `designer` | デザイナー | UI / UX / Z世代向けビジュアル |
| `marketer` | マーケター | SNS / esportsコミュニティ / 獲得戦略 |
| `customer-support` | カスタマーサポート | DM・ユーザー要望・苦情対応文面 |
| `data-analyst` | データアナリスト | Supabase logs / KPI / 黒字化指標 |
| `cfo` | CFO | 予算・ユニットエコノミクス・収益モデル |
| `secretary` | 秘書 | スケジュール・社員間調整・ドキュメント整理 |

## 使い方 (CEO向け)

```
Task(subagent_type="cto", prompt="...")
Task(subagent_type="frontend-engineer", prompt="...")
```

各社員の詳細な役割・ルール・出力形式は各.mdファイルを参照。
