# RawStock 引き継ぎ仕様書

作成日: 2026-04-12

---

## プロジェクト概要

| 項目 | 内容 |
|------|------|
| プロジェクト名 | RawStock |
| 概要 | アンダーグラウンド音楽マーケットプレイス |
| 本番ドメイン | https://rawstock.live |
| GitHub | https://github.com/live-stream-tech/RawStock |
| 本番ブランチ | `main` |

---

## 技術スタック

| レイヤー | 技術 |
|--------|------|
| フロントエンド | Expo Router (React Native Web / PWA) |
| バックエンド | Express + TypeScript（ローカル既定 **5001**；本番はホストの `PORT`。macOS の 5000 は AirPlay と競合しやすい） |
| DB | PostgreSQL + Drizzle ORM（接続先: DATABASE_URL） |
| 認証 | JWT (90日) + Google OAuth |
| ファイルストレージ | Cloudflare R2 |
| 動画配信 | Cloudflare Stream |
| 決済 | Stripe (USD → Ticket通貨 🎟、1 ticket = $0.01) |
| メール転送 | ImprovMX (mx1/mx2.improvmx.com) |
| セッションキャッシュ | Upstash Redis |
| 言語検知 | franc (ISO 639-1) |

---

## 現在のデプロイ状況（2026-04-12時点）

### DNS（name.com → Replit 管理）

| Type | Hostname | Record |
|------|----------|--------|
| A | @ | 216.198.79.1 ← **Vercel のIP設定済み** |
| MX | @ | mx1.improvmx.com, mx2.improvmx.com |
| TXT | @ | SPF (improvmx), Google site verification |
| TXT | _dmarc | v=DMARC1; p=reject; ... |

### Vercel 移行作業（途中）

- [x] `server/vercel-app.ts` 作成済み（Serverless Function エントリポイント）
- [x] `vercel.json` 更新済み（`/lp`, `/teamz` のルーティング含む）
- [x] GitHub (`live-stream-tech/RawStock`) にコードプッシュ済み
- [x] DNS を Vercel IP (`216.198.79.1`) に変更済み
- [ ] **Vercel でリポジトリをインポート（要実施）**
- [ ] **Vercel に環境変数を設定（要実施）**

---

## 環境変数一覧

**下表は「本番でコア機能を動かすための主な変数」**です。**変数名はコードと一致**しています。  
ただしリポジトリ全体では **これ以外にも `process.env` を参照する変数**があるため、「Vercel に必要なものはこの表だけで完結」とは言えません（任意・機能用は次節）。

### コア（本番でほぼ必須）

| 変数名 | 用途 | 備考 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 接続 | 外部から到達可能な URL（Neon 等） |
| `SESSION_SECRET` | JWT 署名 | 長いランダム文字列 |
| `GOOGLE_CLIENT_ID` | Google OAuth | GCP で取得 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | GCP で取得 |
| `FRONTEND_URL` | CORS + **OAuth 完了後のリダイレクト先オリジン** | 例: `https://rawstock.live`（末尾スラッシュなし） |
| `EXPO_PUBLIC_DOMAIN` | クライアントの API ベース URL（ビルド時に埋め込み） | `https://rawstock.live` または `rawstock.live`（**スキーム省略時は本番向けに https と解釈**される。旧コードは http になり混合コンテンツでログイン失敗し得た） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID | ダッシュボードで確認（公開ドキュメントに生値を書かないこと） |
| `CLOUDFLARE_STREAM_TOKEN` | Stream API | Account→Stream→Edit 相当のトークン。未設定時は **`CLOUDFLARE_API_TOKEN`** をフォールバック参照 |
| `R2_ACCESS_KEY_ID` | R2 | |
| `R2_SECRET_ACCESS_KEY` | R2 | |
| `R2_BUCKET_NAME` | R2 | 例: `rawstock-assets` |
| `R2_ENDPOINT` | R2 | |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis | SSE 等 |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis | |
| `STRIPE_SECRET_KEY` | Stripe | |
| `STRIPE_PUBLISHABLE_KEY` | Stripe | クライアント公開可 |
| `YOUTUBE_API_KEY` | YouTube Data API | Jukebox 検索等 |

### 任意・機能用（未設定だと該当機能だけ劣化／503）

| 変数名 | 用途 |
|--------|------|
| `ANTHROPIC_API_KEY` | 通報の AI モデレーション（`server/moderation.ts` 等） |
| `TEMPLATED_API_KEY` | AI Edit の外部レンダー（Templated.io） |
| `TEMPLATED_WEBHOOK_BASE_URL` | Templated の完了 webhook のコールバック先オリジン（未設定時は `FRONTEND_URL` 等） |
| `ADMIN_EMAIL` | 管理者メール（特定の管理系挙動） |
| `WEGLOT_API_KEY` | サイト翻訳（設定時のみ有効） |
| `EXPO_PUBLIC_DEEPAR_KEY` | DeepAR（配信背景ぼかし等） |
| `EXPO_PUBLIC_API_URL` | ネイティブで API オリジンを上書きする場合 |
| `PUBLIC_LOGO_URL` / `PUBLIC_HERO_*` / `PUBLIC_LP_*` / `PUBLIC_FEATURE_*` | LP・ブランド画像の上書き（`lib/brand.ts`） |

Vercel では **`VERCEL_URL` が自動注入**され、OAuth のフォールバックに使われます（手動設定不要）。

詳細はリポジトリの **`.env.example`** が一次情報に近いです。

---

## Vercel デプロイ手順（残作業）

1. Vercel → New Project → GitHub から `live-stream-tech/RawStock` をインポート
2. Framework Preset: **Other**（Python/Next.js ではない）
3. Build Command / Output Dir: `vercel.json` に設定済みのため自動読み込み
4. **Environment Variables** に **コア表**の変数を設定（必要に応じて任意節・`.env.example` も）
5. Deploy ボタンを押す
6. `rawstock.live` のドメインを Vercel プロジェクトに追加（Connect to environment → Production）
7. Vercel のドメイン画面が「Valid Configuration」になることを確認

---

## DB マイグレーション状況

最新適用済み: `0015_users_policy_acceptance.sql`

| ファイル | 内容 |
|--------|------|
| 0000 | 初期スキーマ |
| 0012 | users.payout_terms_agreed_at |
| 0013 | users.operations_dm_opened_at |
| 0014 | users.last_content_lang（franc言語検知） |
| 0015 | users.terms/privacy_accepted_version/at |

---

## 重要ファイル

| ファイル | 役割 |
|--------|------|
| `server/routes.ts` | 全APIエンドポイント（約8000行） |
| `server/schema.ts` | Drizzle DBスキーマ定義 |
| `server/vercel-app.ts` | Vercel Serverless Function 用Expressアプリ |
| `server/r2.ts` | R2ファイルアップロード |
| `server/redis.ts` | SSEイベントバス + Upstash Redis |
| `server/langFromText.ts` | franc 言語検知ユーティリティ |
| `api/[...path].ts` | Vercel Serverless エントリポイント |
| `api/_shared.ts` | Vercel 用 Express アプリ共有ファクトリ |
| `lib/brand.ts` | ブランドURL一元管理 |
| `lib/auth.tsx` | フロント認証コンテキスト |
| `lib/query-client.ts` | React Query + API設定 |
| `vercel.json` | Vercelビルド・ルーティング設定 |

---

## 既知の未解決事項

| 問題 | 状況 |
|------|------|
| Cloudflare Stream 403 エラー | `CLOUDFLARE_STREAM_TOKEN` に Account→Stream→Edit 権限があることは確認済み。本番動作未確認。 |
| DATABASE_URL の外部アクセス | Vercel からアクセス可能かどうか要確認。Replit内部DBの場合は Neon/Supabase 等への移行が必要。 |
| Google OAuth コールバックURL | GCP の Authorized redirect URIs は **実際のオリジン**と完全一致。本番は `https://rawstock.live/api/auth/google-callback`（ハイフンあり）。サーバーは `FRONTEND_URL`（無ければ `VERCEL_URL`）を OAuth の戻り先に使用 |

---

## Google OAuth 設定（Vercel移行後に更新が必要）

GCP Console → API & Services → OAuth 2.0 Client IDs → Authorized redirect URIs に追加（パスは **`google-callback`**）:
```
https://rawstock.live/api/auth/google-callback
```

プレビュー URL やローカルで試す場合は、そのオリジン用に **別エントリ**を追加する（例: `http://localhost:5001/api/auth/google-callback` と `.env` の `FRONTEND_URL` を一致させる）。

---

## ドメイン管理

- レジストラ: name.com（Replit 経由で購入・管理）
- DNS 管理: Replit ダッシュボード → Domains タブ
- Replit を解約する場合: Replit サポートに name.com への直接移管を依頼するか、Replit アカウントをドメイン管理のみに残す

---

## Stripe 設定

- 本番キー使用中（USD建て）
- Ticket通貨: 🎟 1 ticket = $0.01
- 収益分配: クリエイター90% / プラットフォーム10%
- 決済フローは主に **Stripe Checkout セッション作成 → 成功 URL から戻る → API で `session_id` を検証**する形（`server/routes.ts` 内の Checkout / confirm 系）。**専用の `POST /api/stripe/webhook`（Stripe Signing secret）ルートは現状のコードベースには無い** — Webhook 運用が必要なら別途実装・ドキュメント化が必要。

---

## デモアカウント

- lineId: `demo_account`, userId: 160
- 本番環境では無効化済み
