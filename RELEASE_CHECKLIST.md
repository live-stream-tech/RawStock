# 水曜リリース チェックリスト

配信機能以外のリリース前確認用です。

## 実施済み（コード変更）

- [x] 利用規約：制定日を 2026年3月18日 に設定
- [x] プライバシーポリシー：タイトルを SANCTUM HAVEN に統一
- [x] LP フッター：利用規約・プライバシー・特商法へのリンク追加
- [x] ログイン画面：利用規約・プライバシー・特商法へのリンク追加
- [x] 重複ファイル（* 2.tsx 等）の削除
- [x] ヘルスチェック：`/api/healthcheck` 専用エントリ追加（404 解消）
- [x] ブランディング：application-name を SANCTUM HAVEN に統一
- [x] 配信機能：ライブ配信開始ボタンで「準備中」表示（BROADCAST_ENABLED = false）

## デプロイ前の確認（手動）

### 環境変数（Vercel）

必須:
- `DATABASE_URL`
- `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LINE_CALLBACK_URL`
- `FRONTEND_URL`, `EXPO_PUBLIC_DOMAIN`
- `SESSION_SECRET`

オプション（機能ごと）:
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`（ツーショット決済）
- `YOUTUBE_API_KEY`（ジュークボックス）
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`（Google ログイン）

### ビルド・デプロイ

```bash
npm run build:prod
npm run deploy
```

### 本番動作確認

1. **認証**: LINE / Google ログイン → コールバック → トップへ
2. **ヘルスチェック**: `https://<your-domain>/api/healthcheck` が 200 OK を返すこと
3. **法的ページ**: /terms, /privacy, /tokusho が表示されること
4. **コミュニティ・動画・ジュークボックス・DM**: 主要画面の表示・遷移
5. **配信タブ**: 「ライブ配信を開始」で「準備中」アラートが表示されること

## 配信機能の有効化（将来）

`app/(tabs)/live.tsx` の `BROADCAST_ENABLED` を `true` に変更し、Cloudflare Stream の環境変数（`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_TOKEN`）を設定する。
