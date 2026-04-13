# Claude Code 指示書 — 残タスク

## 背景

- Express API: `npm run server:dev` → `http://127.0.0.1:5001`（起動済み）
- Expo Web: `npm run web` → `http://localhost:8081`（起動済み）
- Vercel: linked to `raw-stock-pipeline`。env vars はすべて確認済み
- `.env` の値はすべて正しく設定済み

## あなたにやってほしいこと

### 1. Vercel 本番を再デプロイ（最優先）

env vars の値が変わっているかもしれないので、最新状態で Production をビルドし直す。

```bash
npx vercel --prod
```

ビルドが始まったらログを確認し、エラーがあれば報告してほしい。

### 2. `vercel env pull` で本番の env 値を確認

FRONTEND_URL と EXPO_PUBLIC_DOMAIN が `https://rawstock.live` になっているか確認してほしい。

```bash
npx vercel env pull .env.vercel.local --environment=production
cat .env.vercel.local | grep -E "FRONTEND_URL|EXPO_PUBLIC_DOMAIN|YOUTUBE_API_KEY"
rm .env.vercel.local  # 確認後は削除
```

もし値が違ければ次のコマンドで上書き（`--force` が必要な場合あり）:

```bash
echo "https://rawstock.live" | npx vercel env add FRONTEND_URL production --force
echo "https://rawstock.live" | npx vercel env add EXPO_PUBLIC_DOMAIN production --force
```

### 3. Google ログインの疎通確認

ローカルで:
1. ブラウザで `http://localhost:8081` を開く
2. Google ログインを試みる
3. コールバック `http://localhost:8081/api/auth/google-callback` が通るか確認
4. 失敗した場合: `http://127.0.0.1:5001/api/auth/status` の `callbackUrl` と GCP の登録が一致しているか報告

### 4. できなかったこと（手動）

**GCP コンソールでの手動登録**（ブラウザでの操作のためあなたには不可）:

GCP コンソール → API とサービス → 認証情報 → RawStock クライアント に次を登録:

**承認済みのリダイレクト URI:**
```
https://rawstock.live/api/auth/google-callback
http://localhost:8081/api/auth/google-callback
http://127.0.0.1:8081/api/auth/google-callback
http://localhost:8080/api/auth/google-callback
http://127.0.0.1:8080/api/auth/google-callback
```

**承認済みの JavaScript 生成元:**
```
https://rawstock.live
http://localhost:8081
http://127.0.0.1:8081
http://localhost:8080
http://127.0.0.1:8080
```

これはユーザーに手動でやってもらう。

### 5. 完了後の確認コマンド

```bash
# API 確認
curl -s http://127.0.0.1:5001/api/auth/status | jq .

# 本番確認
curl -s https://rawstock.live/api/auth/status | jq .
```

`google.configured: true` かつ `callbackUrl` が正しいオリジンになっていれば OK。
