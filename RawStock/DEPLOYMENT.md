# Vercel デプロイ手順

## デプロイの実行方法（ここから読んでください）

**Cursor のターミナルからはデプロイできません。**  
Vercel CLI が `~/Library/Application Support/` に認証情報を書く必要があり、環境の制限で失敗します。

**必ず Mac の「ターミナル」アプリ（または iTerm など）で、次を実行してください。**

```bash
cd /Users/user/Desktop/LiveStream
npm run deploy
```

- **初回だけ**: ブラウザが開き、Vercel にログイン（またはアカウント作成）を求められます。完了するとターミナルに戻ります。
- **2回目以降**: ログイン済みならそのままビルドが始まります。
- ビルドは **2〜5分** かかることがあります。`Building...` のあと、完了すると本番URLが表示されます。

**うまくいかないとき**
- `vercel: command not found` → 上記の `npm run deploy` を使っていれば `npx vercel` が動くので問題ありません。
- 認証エラー → もう一度 `npx vercel login` を実行してから `npm run deploy`。
- **「vercel link を行い、現在のディレクトリと正しいVercelプロジェクトが連携されているか再確認してください」** → 下の「vercel link でプロジェクトを連携する」を実行してください。
- ビルドがずっと進まない → [vercel.com](https://vercel.com) にログインし、プロジェクトの **Deployments** でログを確認してください。

### vercel link でプロジェクトを連携する

このフォルダ（LiveStream）を、Vercel 上の「どのプロジェクト」にデプロイするか紐づける作業です。**Mac のターミナル**で、このリポジトリのルートに移動してから実行してください。

```bash
cd /Users/user/Desktop/LiveStream
npx vercel link
```

実行すると次のように聞かれます。

1. **Set up “~/Desktop/LiveStream”?**  
   → **Y** (Yes)

2. **Which scope should your project exist in?**  
   → 自分のアカウント（または使っているチーム）を選ぶ

3. **Link to existing project?**  
   - すでに Vercel に同名（または使いたい）プロジェクトがある → **Y** を選び、一覧からそのプロジェクトを選ぶ  
   - まだプロジェクトがない / 新規で作りたい → **N** を選ぶ（後でプロジェクト名を聞かれる）

4. **What’s your project’s name?**（新規の場合）  
   → 好きな名前（例: `livestream` や `live-stream`）を入力

これが終わると、カレントディレクトリに `.vercel` フォルダができ、中に `project.json` が保存されます。**この状態で**、もう一度デプロイします。

```bash
npm run deploy
```

---

## NOT_FOUND（404）が出る場合

**原因**: 要求した**リソース（URL やパス）が存在しない**ときに返ります。URL のタイポ、リソースの移動・削除、またはパスがルーティングと一致していない可能性があります。

### 確認手順

1. **URL の確認**  
   使っている URL が正しいか、タイポや余分なパスがないか確認する。

2. **デプロイメントの存在**  
   [DEPLOYMENT_NOT_FOUND](#deployment_not_found404が出る場合) と同様に、そのデプロイが存在し、環境変数がそのデプロイの URL を指しているか確認する。

3. **パスが「あるはず」のとき（例: `/api/auth/line`）**  
   - **Functions タブ**で `api/index` と `api/[...path]` が表示されているか。  
   - **Root Directory** が `.` または未設定か。  
   - `vercel.json` の `rewrites` で `/api/*` が先にマッチし、SPA フォールバックに飲み込まれていないか。
   - **重要**: SPA 用の正規表現は `(?!api/)` ではなく `(?!api(/|$))` にすること。`/api`（末尾スラッシュなし）だけだと `api/` にマッチせず、`/api` が SPA に送られて NOT_FOUND になる。

4. **デプロイログ**  
   該当デプロイの [Deployment Logs](https://vercel.com/docs/deployments/logs) で、ビルド失敗やランタイムエラーがないか確認する。

5. **権限**  
   チーム/組織のプロジェクトなら、そのデプロイやリソースへのアクセス権があるか確認する。

---

## DEPLOYMENT_NOT_FOUND（404）が出る場合

**原因**: 指定したデプロイメント URL や ID が存在しない・削除された・タイポのどれかです。

1. **デプロイメント URL の確認**  
   Vercel ダッシュボード → プロジェクト → **Deployments** で、実際の URL をコピー（例: `https://your-project-xxx.vercel.app` や Production Domain）。  
   `.env` / Vercel の Environment Variables の `EXPO_PUBLIC_DOMAIN`・`FRONTEND_URL`・`LINE_CALLBACK_URL` がこの URL と**完全に一致**しているか確認する（`https://` の有無、サブドメイン、末尾スラッシュの有無に注意）。

2. **デプロイメントの存在確認**  
   **Deployments** 一覧で、参照しているコミット/ブランチのデプロイが存在するか確認。古いデプロイは自動削除されることがあるため、**本番は Production ブランチの「最新デプロイ」の URL を参照**する。

3. **権限**  
   チーム/組織のプロジェクトなら、そのデプロイメントへのアクセス権があるか確認。

4. **コード側で参照している URL**  
   - ログイン: `getApiUrl()` → `EXPO_PUBLIC_DOMAIN` で `/api/auth/line` に遷移。  
   - LINE コールバック: `LINE_CALLBACK_URL` が「今あるデプロイの URL + `/api/auth/callback/line`」になっているか。  
   いずれかが古い・別プロジェクトの URL だと、Vercel が `DEPLOYMENT_NOT_FOUND` を返します。

---

## /api が 404 になる場合

### 1. Root Directory（プロジェクトのルート）

**Vercel のダッシュボード → プロジェクト → Settings → General → Root Directory**

- **「.」のまま、または未設定（空）にしてください。**
- ここを `frontend` や `packages/web` などにしていると、リポジトリ直下の `api/` がデプロイに含まれず、**Functions タブに api/index や api/[...path] が表示されません。**

### 2. Functions タブで api が表示されるか

デプロイ後、**Vercel のプロジェクト → Deployments → 最新のデプロイ → Functions タブ** を開く。

- **api/index** と **api/[...path]** の 2 つが表示されていれば、`/api/auth/line` などはこのサーバレス関数で処理されます。
- どちらも表示されていない場合は、**Root Directory がリポジトリルート（.）になっているか** を再度確認してください。

### 3. vercel.json の framework

`vercel.json` で **`"framework": null`** を指定しています。  
Expo プリセットだけに任せると `outputDirectory: "dist"` のとき api が認識されないことがあるため、明示的に null にして api フォルダもデプロイ対象にしています。

## まとめ

- **Root Directory = .（または未設定）**
- **Functions タブに api/index と api/[...path] が出ていること**

この 2 点を満たせば、`/api/auth/line` は 404 にならず、LINE ログインが動作する想定です。
