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
| 自動翻訳 | MyMemory API（無料・キー不要）。`server/lib/translate/` 配下＋`/api/translate` で手動トリガー。glossary・短語スキップ・DBキャッシュ付き |

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

## ローカル API（`npm run server:dev`）とポート

- **`EADDRINUSE`（5000）**: シェルや別ツールが `PORT=5000` を付けていると Express が 5000 を掴みにいく。`.env` に **`PORT=5001`** を置き、`server:dev` は **`DOTENV_CONFIG_OVERRIDE=true`** で起動するため通常は `.env` が優先される。
- **`EADDRINUSE`（5001）**: すでに別プロセスが API をListenしている。`lsof -i :5001` で PID を確認し、終了するか別ポートに変更する。
- **Google ログイン後、`http://localhost:8081/api/auth/google-callback?...` が真っ黒**: `FRONTEND_URL` が 8081 のとき、Google は **Metro（8081）** に戻すが、**`/api` は Express（5001）** にしかない。対処: **`FRONTEND_URL` と `EXPO_PUBLIC_DOMAIN` を `http://localhost:5001` にし、ブラウザでは `http://localhost:5001` を開く**（`npm run web` は別ターミナルで起動したまま）。GCP に **`http://localhost:5001/api/auth/google-callback`**（と必要なら `127.0.0.1:5001`）を登録する。

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
| `EXPO_PUBLIC_DOMAIN` | **公開アプリのオリジン**（ビルド時埋め込み） | `getApiUrl()` が `EXPO_PUBLIC_API_URL` 未設定時に API ベースとして解釈する。`getPublicWebOrigin()` が Stripe の戻り先オリジンに使う。ローカル Web で **Google OAuth まで試すなら `http://localhost:5001`（Express 入口）** を推奨。8081 直＋`FRONTEND_URL=8081` はコールバックが Metro に当たり画面が真っ黒になりやすい。 |
| `EXPO_PUBLIC_API_URL` | **API サーバー専用オリジン**（任意・ローカル Web 推奨） | 設定時は `getApiUrl()` がこちらを最優先。Metro（:8081）を `EXPO_PUBLIC_DOMAIN` にしているときに Express（:5001）へ向ける用途。 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID | ダッシュボードで確認（公開ドキュメントに生値を書かないこと） |
| `CLOUDFLARE_STREAM_TOKEN` | Stream API | Account→Stream→Edit 相当のトークン。未設定時は **`CLOUDFLARE_API_TOKEN`** をフォールバック参照 |
| `R2_ACCESS_KEY_ID` | R2 | |
| `R2_SECRET_ACCESS_KEY` | R2 | |
| `R2_BUCKET_NAME` | R2 | 例: `rawstock-assets` |
| `R2_ENDPOINT` | R2 | S3 API: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_PUBLIC_BASE_URL` | R2 アップロード後の **公開 GET 用**（任意） | 未設定だと返却 URL が API ホスト向きになりブラウザで 403 になりやすい。R2.dev やカスタムドメインのベース（末尾スラッシュなし） |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis | SSE 等 |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis | |
| `STRIPE_SECRET_KEY` | Stripe | |
| `STRIPE_PUBLISHABLE_KEY` | Stripe | クライアント公開可 |
| `YOUTUBE_API_KEY` | YouTube Data API | Jukebox 検索等 |

### 任意・機能用（未設定だと該当機能だけ劣化／503）

| 変数名 | 用途 |
|--------|------|
| `ANTHROPIC_API_KEY` | **AI Edit** の Claude EDL 生成（`server/aiEditAssistant.ts`）、通報モデレーション（`server/moderation.ts` 等） |
| `TEMPLATED_API_KEY` | AI Edit の外部レンダー（Templated.io） |
| `TEMPLATED_WEBHOOK_BASE_URL` | Templated の完了 webhook のコールバック先オリジン（未設定時は `FRONTEND_URL` 等） |
| `ADMIN_EMAIL` | 管理者メール（特定の管理系挙動） |
| `WEGLOT_API_KEY` | サイト翻訳（設定時のみ有効） |
| `MYMEMORY_EMAIL` | 自動翻訳 MyMemory の日次枠拡張（`de` パラメータ・任意） |
| `EXPO_PUBLIC_DEEPAR_KEY` | DeepAR（配信背景ぼかし等） |
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

最新適用済み: `0023_translations_and_glossary.sql`

| ファイル | 内容 |
|--------|------|
| 0000 | 初期スキーマ |
| 0012 | users.payout_terms_agreed_at |
| 0013 | users.operations_dm_opened_at |
| 0014 | users.last_content_lang（franc言語検知） |
| 0015 | users.terms/privacy_accepted_version/at |
| 0022 | users.preferred_language（UI/翻訳宛先言語） |
| 0023 | translations / translation_glossary（自動翻訳キャッシュ＆固有名詞ガード） |

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
| `server/lib/translate/index.ts` | 自動翻訳ファサード（短語スキップ→glossary→キャッシュ→MyMemory） |
| `server/lib/translate/mymemory.ts` | MyMemory 無料翻訳 API クライアント（`MYMEMORY_EMAIL` で枠拡張） |
| `server/lib/translate/shortText.ts` | 短語スキップ判定（`LiveStock` 単体→家畜の事故防止） |
| `server/lib/translate/glossary.ts` | ブランド固有名詞の glossary トークン置換 |
| `components/TranslateButton.tsx` | RN 用 Translate ボタン（DM/コメント/投稿/Jukebox 行に挿入） |
| `components/PolicyTranslateBanner.tsx` | 法務ページ用「Translate page」バナー＋Disclaimer |
| `vite-app/app/components/TranslateButton.tsx` | Web 用 Translate ボタン |
| `api/[...path].ts` | Vercel Serverless エントリポイント |
| `api/_shared.ts` | Vercel 用 Express アプリ共有ファクトリ |
| `lib/brand.ts` | ブランドURL一元管理 |
| `lib/auth.tsx` | フロント認証コンテキスト |
| `lib/query-client.ts` | React Query + API設定 |
| `vercel.json` | Vercelビルド・ルーティング設定 |
| `app/ai-edit/index.tsx` | AI Edit オーダー画面（R2 アップロード→`POST /api/ai-edit/jobs`） |
| `app/ai-edit/[id].tsx` | ジョブ詳細（5 秒ポーリング・承認・Templated レンダー・改稿） |
| `lib/ai-edit/buildOrderVideoSpec.ts` | フォーム入力（トーン・尺）→`RawStockVideoSpec`（クライアント正規化 DSL） |
| `server/aiEditAssistant.ts` | Claude Haiku で EDL（EditPlan JSON）生成。`ANTHROPIC_API_KEY` 未設定時はモック |
| `server/lib/aiEditArtifacts.ts` | EDL と元 spec を突き合わせ `clips` / `analysis` / `renderSpec` を組み立て |
| `server/lib/aiEditJobQueue.ts` | インプロセス FIFO キュー（永続化なし。サーバレス複数インスタンスでは共有されない） |
| `server/lib/dslToTemplated.ts` | `RawStockVideoSpec`→Templated.io 向けレンダーリクエスト |
| `server/lib/templatedClient.ts` | Templated Create Render 等の HTTP クライアント |

---

## AI Edit Assistant（動画編集オーダー）

クリエイターが素材動画と指示を送り、**Claude が EDL（編集指示リスト）**を出し、サーバが **`RawStockVideoSpec` に落とし込み**、任意で **Templated.io で MP4 レンダー**する機能。DB テーブルは `ai_edit_jobs`（`server/schema.ts`）。

### クライアント（Expo Router）

| 画面 | パス相当 | 主な処理 |
|------|-----------|-----------|
| オーダー | `app/ai-edit/index.tsx` | 認証後、`POST /api/upload-url`→PUT で R2 に素材アップロード。`buildOrderVideoSpec()` で初期 `spec` を生成し、`POST /api/ai-edit/jobs`（`planMinutes`, `videoUrls`, `logoUrl`, `telop`, `targetAudience`, `tone`, `prompt`, `spec`）→成功で `router.replace(/ai-edit/:id)` |
| 詳細 | `app/ai-edit/[id].tsx` | `useQuery` で `GET /api/ai-edit/jobs/:id`。`completed`/`failed`/`approved`/`delivered` になるまで **5 秒間隔で invalidate（ポーリング）**。承認時は `POST .../approve` の直後に `POST .../render`。単独レンダーは `POST .../render`。改稿は `POST .../revise`（1 回目無料、2 回目以降 100 チケット・サーバ定数と一致）。納品済み URL は `deliveredUrl` でダウンロード |

### サーバー API（`server/routes.ts` 付近）

| メソッド | パス | 内容 |
|----------|------|------|
| `POST` | `/api/ai-edit/jobs` | チケット事前減算、`ai_edit_jobs` 挿入、`processing` へ。`scheduleAIEditPlanGeneration` を `enqueueAIEditJob` に載せる |
| `GET` | `/api/ai-edit/jobs/:id` | オーナーのみ。`result` / `videoSpec` / `status` 等 |
| `POST` | `/api/ai-edit/jobs/:id/approve` | `completed`→`approved` |
| `POST` | `/api/ai-edit/jobs/:id/render` | `dslToTemplated` + `createTemplatedRender`。webhook は `TEMPLATED_WEBHOOK_BASE_URL` または `FRONTEND_URL` 由来の **`/api/webhooks/templated`** |
| `POST` | `/api/webhooks/templated` | Templated 完了通知。`deliveredUrl`・`delivered` 更新・通知 |
| `POST` | `/api/ai-edit/jobs/:id/revise` | 改稿チケット処理のうえ `processing` に戻し、再度 Claude パイプライン |
| `POST` | `/api/ai-edit/jobs/:id/deliver` | 手動納品 URL（エディター用途。通常フローは Templated 経由） |

### サーバー処理チェーン（要約）

1. `generateEditPlan`（`server/aiEditAssistant.ts`）… ユーザープロンプト＋尺・トーン等から **EDL 付き JSON**  
2. `buildAIEditStoredResult`（`server/lib/aiEditArtifacts.ts`）… **EDL を元の `videoSpec` と重ね**、レンダー用 `renderSpec` と分析 JSON を `result` に保存  
3. `POST .../render` … **`TEMPLATED_API_KEY` 必須**。同期で URL が返れば即 `delivered`、非同期なら webhook 待ち  

### 環境変数

- **必須級**: `DATABASE_URL`, チケット周りは既存の Stripe/Ticket 系と同じ DB  
- **AI 生成**: `ANTHROPIC_API_KEY`（未設定だとモック EDL。`AI_EDIT_ALLOW_MOCK=1` の説明はコード参照）  
- **MP4 レンダー**: `TEMPLATED_API_KEY`、webhook 到達先の **`TEMPLATED_WEBHOOK_BASE_URL` または `FRONTEND_URL`**（Templated がインターネットから叩ける公開 URL であること）

### 注意（運用・設計）

- **`aiEditJobQueue` は同一 Node プロセス内のメモリキュー**である。Vercel Serverless でインスタンスが分裂すると「ジョブを投げたインスタンス以外でワーカーが動かない」時間帯があり得る。恒久対策が必要なら **キュー基盤（SQS / QStash 等）への移行**が検討ポイント。  
- Stripe Webhook のパスは **`/api/webhook/stripe`**（`webhook` 単数）。Templated は **`/api/webhooks/templated`**（`webhooks` 複数形）で別物。

---

## 既知の未解決事項

| 問題 | 状況 |
|------|------|
| Cloudflare Stream 403 エラー | `CLOUDFLARE_STREAM_TOKEN` に Account→Stream→Edit 権限があることは確認済み。本番動作未確認。 |
| DATABASE_URL の外部アクセス | Vercel からアクセス可能かどうか要確認。Replit内部DBの場合は Neon/Supabase 等への移行が必要。 |
| Google OAuth コールバックURL | 詳細は下節「Google OAuth」。`redirect_uri_mismatch` は GCP の URI と `FRONTEND_URL` 由来の `callbackUrl` の不一致が典型 |

---

## Google OAuth（`redirect_uri_mismatch` 予防・突き合わせ）

サーバーは [`server/routes.ts`](server/routes.ts) で **`GOOGLE_CALLBACK_URL = {FRONTEND_URL のオリジン}/api/auth/google-callback`**（パスは **`google-callback`** = ハイフン）を Google に送る。[公式の注意](https://developers.google.com/identity/protocols/oauth2/web-server?hl=ja#authorization-errors-redirect-uri-mismatch)どおり、GCP に登録した文字列と **完全一致**（`http`/`https`、`localhost`/`127.0.0.1`、末尾スラッシュ）が必要。

### GCP（Google Cloud Console → Google Auth Platform または API とサービス → 認証情報 → 該当 **OAuth 2.0 クライアント ID**）

**突き合わせ**: 実際に Google に送っている `redirect_uri` は **`GET /api/auth/status`** の `google.callbackUrl`。次の一覧は「よく使う組み合わせをすべて登録しておく」ためのコピペ用。パスは必ず **`/api/auth/google-callback`**（ハイフン付き）。

#### 承認済みのリダイレクト URI（コピペ用・まとめて登録してよい）

本番:

```
https://rawstock.live/api/auth/google-callback
```

ローカル（Expo Web の既定 8081。`localhost` と `127.0.0.1` は Google では別 URI）:

```
http://localhost:8081/api/auth/google-callback
http://127.0.0.1:8081/api/auth/google-callback
```

ローカル（ポートが 8080 のとき。8080 占有時や `.replit` の Expo が 8080 の場合など）:

```
http://localhost:8080/api/auth/google-callback
http://127.0.0.1:8080/api/auth/google-callback
```

ローカル（**`FRONTEND_URL` を API の 5001 に合わせる運用**のときだけ必要）:

```
http://localhost:5001/api/auth/google-callback
http://127.0.0.1:5001/api/auth/google-callback
```

Vercel プレビュー（**ワイルドカード不可**。プレビューで Google ログインまで試すデプロイがあるなら、そのデプロイのオリジンごとに 1 行追加）:

```
https://<プレビューホスト>.vercel.app/api/auth/google-callback
```

（`<プレビューホスト>` は Deployments に表示されるホスト名に置き換える。）

#### 承認済みの JavaScript 生成元（コピペ用・Web クライアントで空ならすべて追加推奨）

```
https://rawstock.live
http://localhost:8081
http://127.0.0.1:8081
http://localhost:8080
http://127.0.0.1:8080
```

（Vercel プレビューで試すなら `https://<プレビューホスト>.vercel.app` をパスなしで同様に追加。）

#### クライアント ID の一致

**`.env`（および Vercel）の `GOOGLE_CLIENT_ID`** が、上記を編集している **同一の OAuth クライアント**の Client ID であること。照合: **`GET /api/auth/status`** の `google.clientId` と GCP 画面の値。

「ブランディング」の承認済みドメイン（例: `rawstock.live`）は同意画面用であり、**ローカル用リダイレクト URI の代替にはならない**（リダイレクト URI はクライアント設定で登録する）。

#### Vercel Preview（方針 B1: 本番オリジンに揃える）

プレビューデプロイで静的ビルドが **`EXPO_PUBLIC_DOMAIN` 未設定**だと `getApiUrl()` が本番で失敗し得る。方針 B1 では **Preview でも** `FRONTEND_URL` と `EXPO_PUBLIC_DOMAIN` を **`https://rawstock.live`** に揃え、API・OAuth のベースを本番と同じにする（プレビュー URL 上で Google ログインまで試す場合は別途 GCP にそのホストのリダイレクト URI が必要＝方針 B2）。

CLI 例（**Git ブランチごと**に Preview 用変数が要ることがある）:

```bash
npx vercel env add FRONTEND_URL preview <ブランチ名> --value "https://rawstock.live" -y
npx vercel env add EXPO_PUBLIC_DOMAIN preview <ブランチ名> --value "https://rawstock.live" -y
```

新しい feature ブランチで初めて Preview を切るときは、上記が未設定なら **ダッシュボードの Environment Variables** で同じ値を Preview（該当ブランチ）に追加する。

**手動 E2E（プラン完了条件）:** シークレットウィンドウで `https://rawstock.live` から Google ログインし、コールバックまでエラーなく完了すること。ローカル検証時は `curl -s http://127.0.0.1:5001/api/auth/status` の `google.callbackUrl` が GCP の承認済みリダイレクト URI と一致していること。

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
