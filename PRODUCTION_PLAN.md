# 本番環境デプロイ計画

## 全体フロー

```
1. インフラ・外部サービス準備
2. 環境変数設定
3. ビルド・デプロイ
4. 動作確認
5. （任意）追加機能の有効化
```

---

## Phase 1: インフラ・外部サービス準備

### 1.1 データベース（Neon）

- [ ] **Neon プロジェクト作成**（未作成の場合）
  - [neon.tech](https://neon.tech) でサインアップ
  - プロジェクト作成 → Connection string を取得
- [ ] **スキーマ反映**
  ```bash
  DATABASE_URL="..." npm run db:push
  ```

### 1.2 LINE Login（必須：ログイン用）

- [ ] [LINE Developers](https://developers.line.biz/) でチャネル作成
- [ ] **Callback URL を登録**
  - 本番: `https://<あなたのドメイン>/api/auth/line-callback`
  - 例: `https://6542d57d-f8ce-404c-adb7-16f6dc84b252-00-1ncerp2gwoflp.spock.replit.dev/api/auth/line-callback`
- [ ] Channel ID / Channel Secret を控える

### 1.3 Vercel プロジェクト

- [ ] [vercel.com](https://vercel.com) でプロジェクト作成 or 既存プロジェクトにリンク
  ```bash
  npx vercel link
  ```
- [ ] **Root Directory = `.`（または未設定）** を確認（Settings → General）

---

## Phase 2: 環境変数設定（Vercel）

Vercel ダッシュボード → プロジェクト → **Settings → Environment Variables** で設定。

### 必須（これがないと動かない）

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `DATABASE_URL` | Neon の接続文字列 | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |
| `LINE_CHANNEL_ID` | LINE Login チャネル ID | |
| `LINE_CHANNEL_SECRET` | LINE Login チャネルシークレット | |
| `LINE_CALLBACK_URL` | LINE コールバック URL（本番ドメイン） | `https://6542d57d-f8ce-404c-adb7-16f6dc84b252-00-1ncerp2gwoflp.spock.replit.dev/api/auth/line-callback` |
| `FRONTEND_URL` | フロントのドメイン（末尾スラッシュなし） | `https://6542d57d-f8ce-404c-adb7-16f6dc84b252-00-1ncerp2gwoflp.spock.replit.dev` |
| `EXPO_PUBLIC_DOMAIN` | ビルド時に埋め込む API ドメイン | `https://6542d57d-f8ce-404c-adb7-16f6dc84b252-00-1ncerp2gwoflp.spock.replit.dev` |
| `SESSION_SECRET` | JWT 署名用（32文字以上推奨） | `openssl rand -base64 32` で生成 |

**重要**: `LINE_CALLBACK_URL`・`FRONTEND_URL`・`EXPO_PUBLIC_DOMAIN` は **本番デプロイの実際の URL** と完全一致させる必要があります。

### オプション（機能ごと）

| 変数名 | 用途 | 備考 |
|--------|------|------|
| `STRIPE_SECRET_KEY` | 決済（有料動画・ツーショット） | Stripe ダッシュボードで取得 |
| `STRIPE_PUBLISHABLE_KEY` | 同上 | |
| `GOOGLE_CLIENT_ID` | Google ログイン | |
| `GOOGLE_CLIENT_SECRET` | Google ログイン | |
| `GOOGLE_CALLBACK_URL` | Google コールバック | `https://<ドメイン>/api/auth/google-callback` |
| `YOUTUBE_API_KEY` | ジュークボックス（YouTube検索） | Google Cloud Console で取得 |
| `CLOUDFLARE_ACCOUNT_ID` | ライブ配信 | 配信機能を有効にする場合 |
| `CLOUDFLARE_STREAM_TOKEN` | ライブ配信 | 同上 |
| `ANTHROPIC_API_KEY` | 通報の AI 判定 | 未設定時はグレーゾーンとして管理者確認 |
| `R2_ENDPOINT` | 画像・動画アップロード | Cloudflare R2 |
| `R2_BUCKET_NAME` | 同上 | |
| `R2_ACCESS_KEY_ID` | 同上 | |
| `R2_SECRET_ACCESS_KEY` | 同上 | |

---

## Phase 3: ビルド・デプロイ

**Mac のターミナル**（Cursor のターミナルでは不可）で実行:

```bash
cd /Users/user/Desktop/LiveStream
npm run deploy
```

- 初回: `npx vercel login` を求められる場合あり
- ビルドは 2〜5 分かかることがある
- 完了後、本番 URL が表示される

### デプロイ後の確認

1. **Functions タブ**で `api/index` と `api/[...path]` が表示されているか
2. **Root Directory** が `.` になっているか（`/api` が 404 になる場合に確認）

---

## Phase 4: 動作確認

### 4.1 基本チェック

- [ ] ヘルスチェック: `https://<ドメイン>/api/healthcheck` → 200 OK
- [ ] トップページ: `https://<ドメイン>/` が表示される
- [ ] LINE ログイン: ログイン → コールバック → トップへ遷移
- [ ] 法的ページ: `/terms`, `/privacy`, `/tokusho` が表示される

### 4.2 機能別チェック

- [ ] コミュニティ一覧・詳細
- [ ] 動画一覧・詳細
- [ ] ジュークボックス（`YOUTUBE_API_KEY` 設定時）
- [ ] DM 画面
- [ ] プロフィール編集

### 4.3 環境変数の整合性

デプロイ後に URL が変わった場合（例: プレビュー → 本番）：

1. Vercel の **Production Domain** を確認
2. `LINE_CALLBACK_URL`・`FRONTEND_URL`・`EXPO_PUBLIC_DOMAIN` をその URL に更新
3. **LINE Developers** の Callback URL も同じ URL に更新
4. 再デプロイ（環境変数変更後は自動で再ビルドされる場合あり）

---

## Phase 5: 追加機能の有効化（任意）

### 5.1 ライブ配信

1. `app/(tabs)/live.tsx` の `BROADCAST_ENABLED` を `true` に変更
2. `CLOUDFLARE_ACCOUNT_ID`・`CLOUDFLARE_STREAM_TOKEN` を設定

### 5.2 カスタムドメイン

1. Vercel ダッシュボード → Domains で追加
2. 環境変数の URL を更新

---

## トラブルシューティング

| 現象 | 確認項目 |
|------|----------|
| `/api` が 404 | Root Directory = `.`、Functions に api が表示されているか |
| LINE ログイン失敗 | `LINE_CALLBACK_URL` が LINE Developers の登録と一致しているか |
| フロントが API に接続できない | `EXPO_PUBLIC_DOMAIN` がビルド時に正しく設定されているか |
| デプロイが失敗する | Vercel の Deployments ログでエラー内容を確認 |

---

## チェックリスト（本番投入前）

- [ ] 必須環境変数 7 つすべて設定済み
- [ ] LINE の Callback URL が本番と一致
- [ ] `SESSION_SECRET` を本番用の乱数に変更（dev-secret ではない）
- [ ] ヘルスチェック・ログイン・主要画面の動作確認済み
- [ ] 利用規約・プライバシーポリシー・特商法の内容確認済み
